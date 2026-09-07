"""Extract official TI4 game-board setups from the Living Rules Reference diagram page."""
import json, math, sys
from collections import defaultdict
import numpy as np
from PIL import Image
import pymupdf

PDF = "D:/cc/ti4/docs/rules/pok_living_rules_reference_2.0.pdf"
DPI = 300

def render(page_index=5):
    doc = pymupdf.open(PDF)
    pm = doc[page_index].get_pixmap(dpi=DPI)
    img = Image.frombytes("RGB", (pm.width, pm.height), pm.samples)
    return np.asarray(img).astype(int)

def clusters(mask, min_size=200):
    ys, xs = np.nonzero(mask)
    pts = list(zip(xs.tolist(), ys.tolist()))
    pts.sort()
    out = []
    used = np.zeros(mask.shape, dtype=bool)
    from collections import deque
    H, W = mask.shape
    for x, y in pts:
        if used[y, x] or not mask[y, x]:
            continue
        q = deque([(x, y)]); used[y, x] = True; comp = []
        while q:
            cx, cy = q.popleft(); comp.append((cx, cy))
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = cx+dx, cy+dy
                if 0 <= nx < W and 0 <= ny < H and mask[ny, nx] and not used[ny, nx]:
                    used[ny, nx] = True; q.append((nx, ny))
        if len(comp) >= min_size:
            cxs = [p[0] for p in comp]; cys = [p[1] for p in comp]
            out.append(dict(cx=sum(cxs)/len(cxs), cy=sum(cys)/len(cys),
                            w=max(cxs)-min(cxs)+1, h=max(cys)-min(cys)+1, n=len(comp)))
    return out

# --- cube coordinate helpers (TI4 hexes: flat top/bottom edge, vertex left/right)
DIRS = {"N": (0,1,-1), "NE": (1,0,-1), "SE": (1,-1,0), "S": (0,-1,1), "SW": (-1,0,1), "NW": (-1,1,0)}
RING_ORDER = ["SE", "S", "SW", "NW", "N", "NE"]

def ring_positions(r):
    """Ordered cube coords for ring r, starting at the north corner, going clockwise."""
    if r == 0:
        return [(0,0,0)]
    cur = tuple(c*r for c in DIRS["N"])
    out = []
    for d in RING_ORDER:
        dv = DIRS[d]
        for _ in range(r):
            out.append(cur)
            cur = tuple(cur[i] + dv[i] for i in range(3))
    return out

def px(cube, R):
    x, y, z = cube
    return (1.5*R*x, -math.sqrt(3)*R*(y - z)/2)

def sample(arr, x, y, k=3):
    h, w, _ = arr.shape
    x0, x1 = max(0, int(x)-k), min(w, int(x)+k+1)
    y0, y1 = max(0, int(y)-k), min(h, int(y)+k+1)
    if x0 >= x1 or y0 >= y1:
        return (0,0,0)
    patch = arr[y0:y1, x0:x1].reshape(-1, 3)
    return tuple(np.median(patch, axis=0).astype(int).tolist())

if __name__ == "__main__":
    arr = render()
    print("page", arr.shape)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    orange = (r > 195) & (g > 85) & (g < 185) & (b < 95)
    cs = clusters(orange, min_size=400)
    cs.sort(key=lambda c: (round(c["cy"]/200), c["cx"]))
    for c in cs:
        print("mecatol at (%.0f,%.0f) w=%d h=%d n=%d -> R=%.1f" % (c["cx"], c["cy"], c["w"], c["h"], c["n"], c["w"]/2))

def probe(arr, cx, cy, R, maxring=4):
    for ring in range(0, maxring+1):
        for i, cube in enumerate(ring_positions(ring)):
            dx, dy = px(cube, R)
            col = sample(arr, cx+dx, cy+dy)
            print("  r%d-%02d %-14s %s" % (ring, i+1, str(cube), col))

"""Odczyt układów planszy z diagramu 'GAME BOARD SETUP' w instrukcji Thunder's Edge (s. 7)."""
import sys, json, math
sys.path.insert(0, "D:/cc/ti4/scripts")
from extract_layouts import ring_positions, px
import numpy as np, pymupdf
from collections import deque

PDF = "D:/cc/ti4/research/pdf/te_rulebook.pdf"
DPI = 300

def render(page):
    doc = pymupdf.open(PDF)
    pm = doc[page].get_pixmap(dpi=DPI)
    return np.frombuffer(pm.samples, dtype=np.uint8).reshape(pm.height, pm.width, pm.n)[:, :, :3].astype(int)

def clusters(mask, min_size=400):
    used = np.zeros(mask.shape, bool); H, W = mask.shape; out = []
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if used[y, x]: continue
        q = deque([(x, y)]); used[y, x] = True; comp = []
        while q:
            cx, cy = q.popleft(); comp.append((cx, cy))
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = cx+dx, cy+dy
                if 0 <= nx < W and 0 <= ny < H and mask[ny, nx] and not used[ny, nx]:
                    used[ny, nx] = True; q.append((nx, ny))
        if len(comp) >= min_size:
            cxs = [p[0] for p in comp]; cys = [p[1] for p in comp]
            out.append(dict(cx=sum(cxs)/len(cxs), cy=sum(cys)/len(cys), w=max(cxs)-min(cxs)+1, n=len(comp)))
    return out

def cell(arr, x, y, palette, kinds):
    h, w, _ = arr.shape
    x0, x1, y0, y1 = int(x)-6, int(x)+7, int(y)-6, int(y)+7
    if x0 < 0 or y0 < 0 or x1 > w or y1 > h: return None, None, None
    patch = arr[y0:y1, x0:x1].reshape(-1, 3)
    spread = int((patch.max(axis=0) - patch.min(axis=0)).max())
    med = tuple(np.median(patch, axis=0).astype(int).tolist())
    best, bd = None, 1e9
    for k, v in palette.items():
        d = sum((a-b)**2 for a, b in zip(med, v))
        if d < bd: bd, best = d, k
    return (kinds[best] if spread <= 8 and math.sqrt(bd) <= 26 else None), med, spread

if __name__ == "__main__":
    arr = render(6)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    orange = (r > 195) & (g > 85) & (g < 185) & (b < 95)
    cs = sorted(clusters(orange, 400), key=lambda c: c["cx"])
    print("pomarańczowe skupiska (Mecatol / legenda):")
    for c in cs: print("  (%.0f,%.0f) w=%d n=%d" % (c["cx"], c["cy"], c["w"], c["n"]))

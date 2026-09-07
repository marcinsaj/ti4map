import sys, json, math
sys.path.insert(0, "D:/cc/ti4/scripts")
from extract_layouts import render, ring_positions, px
import numpy as np

PALETTE = {
    "mecatol":   (244, 118, 32),
    "ring1":     (0, 185, 242),
    "ring2":     (36, 64, 143),
    "ring3":     (11, 27, 85),
    "ring3b":    (0, 7, 65),
    "ring2b":    (24, 44, 121),
    "ring4":     (181, 131, 186),
    "home":      (57, 181, 74),
    "home":      (57, 181, 74),
    "home_tg":   (0, 166, 80),
    "hyperlane": (255, 212, 1),
    "hyper_red": (237, 28, 36),
}
KIND = {"mecatol":"mecatol","ring1":"tile","ring2":"tile","ring3":"tile","ring3b":"tile","ring2b":"tile","ring4":"tile",
        "home":"home","home_tg":"home","hyperlane":"hyperlane","hyper_red":"hyperlane"}
DIAGRAMS = [
    ("3p", 476, 696), ("4p", 1000, 696), ("5p", 1523, 696), ("5p_hyperlane", 2073, 696),
    ("6p", 553, 1492), ("6p_large", 1215, 1423), ("7p", 1935, 1423),
    ("7p_alt", 553, 2227), ("8p", 1215, 2227), ("8p_alt", 1935, 2227),
]
R = 36.7

def cell(arr, x, y):
    """Return (kind, ok). A real tile is a flat block of an exact palette colour."""
    h, w, _ = arr.shape
    x0, x1, y0, y1 = int(x)-6, int(x)+7, int(y)-6, int(y)+7
    if x0 < 0 or y0 < 0 or x1 > w or y1 > h:
        return None
    patch = arr[y0:y1, x0:x1].reshape(-1, 3)
    spread = (patch.max(axis=0) - patch.min(axis=0)).max()
    med = tuple(np.median(patch, axis=0).astype(int).tolist())
    best, bd = None, 1e9
    for k, v in PALETTE.items():
        d = sum((a-b)**2 for a, b in zip(med, v))
        if d < bd: bd, best = d, k
    bd = math.sqrt(bd)
    if spread > 6 or bd > 22:
        return None
    return KIND[best]

def main():
    arr = render()
    out = {}
    for label, cx, cy in DIAGRAMS:
        cells = {}
        for ring in range(0, 5):
            for i, cube in enumerate(ring_positions(ring)):
                dx, dy = px(cube, R)
                k = cell(arr, cx+dx, cy+dy)
                if k:
                    cells["000" if ring == 0 else "%d%02d" % (ring, i+1)] = k
        out[label] = cells
    for label, cells in out.items():
        homes = sorted(p for p, k in cells.items() if k == "home")
        hyper = sorted(p for p, k in cells.items() if k == "hyperlane")
        tiles = sorted(p for p, k in cells.items() if k == "tile")
        print("\n== %-14s total=%d  homes=%d  hyperlanes=%d  drawn tiles=%d" % (label, len(cells), len(homes), len(hyper), len(tiles)))
        print("   homes:", " ".join(homes))
        if hyper: print("   hyper:", " ".join(hyper))
        print("   tiles:", " ".join(tiles))
    json.dump(out, open("D:/cc/ti4/scripts/official_layouts_raw.json", "w"), indent=1)

main()

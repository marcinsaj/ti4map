/**
 * Geometria heksów TI4.
 *
 * Kafle TI4 mają płaską krawędź u góry i u dołu (wierzchołki po lewej i prawej),
 * więc sąsiedzi leżą w kierunkach: N, NE, SE, S, SW, NW (indeksy 0..5).
 *
 * Pozycje zapisujemy w konwencji społecznościowej TI4:
 *   "000"      – środek planszy (Mecatol Rex),
 *   "RNN"      – pierścień R (1..4), pozycja NN liczona od kafla na północy
 *                zgodnie z ruchem wskazówek zegara (ring R ma 6*R pozycji).
 */

export const DIR_NAMES = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

/** Wektory sześcienne (cube) dla sześciu kierunków, w kolejności indeksów 0..5. */
export const DIRS = [
  [0, 1, -1],   // N
  [1, 0, -1],   // NE
  [1, -1, 0],   // SE
  [0, -1, 1],   // S
  [-1, 0, 1],   // SW
  [-1, 1, 0],   // NW
];

/** Kolejność obchodzenia pierścienia startując z rogu północnego, zgodnie z zegarem. */
const RING_WALK = [2, 3, 4, 5, 0, 1]; // SE, S, SW, NW, N, NE

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const cubeKey = (c) => `${c[0]},${c[1]},${c[2]}`;

/** Uporządkowana lista współrzędnych cube dla całego pierścienia r. */
export function ringCubes(r) {
  if (r === 0) return [[0, 0, 0]];
  let cur = mul(DIRS[0], r);
  const out = [];
  for (const d of RING_WALK) {
    for (let i = 0; i < r; i++) {
      out.push(cur);
      cur = add(cur, DIRS[d]);
    }
  }
  return out;
}

const POS_TO_CUBE = new Map();
const CUBE_TO_POS = new Map();
for (let r = 0; r <= 5; r++) {
  const cubes = ringCubes(r);
  cubes.forEach((c, i) => {
    const pos = r === 0 ? '000' : `${r}${String(i + 1).padStart(2, '0')}`;
    POS_TO_CUBE.set(pos, c);
    CUBE_TO_POS.set(cubeKey(c), pos);
  });
}

export const posToCube = (pos) => POS_TO_CUBE.get(pos) || null;
export const cubeToPos = (c) => CUBE_TO_POS.get(cubeKey(c)) || null;
export const ringOf = (pos) => (pos === '000' ? 0 : Number(pos[0]));

/** Sześciu fizycznych sąsiadów pozycji (null jeśli poza obsługiwanym zakresem). */
export function neighbors(pos) {
  const c = posToCube(pos);
  if (!c) return [null, null, null, null, null, null];
  return DIRS.map((d) => cubeToPos(add(c, d)));
}

export function distance(a, b) {
  const x = posToCube(a), y = posToCube(b);
  if (!x || !y) return Infinity;
  return Math.max(Math.abs(x[0] - y[0]), Math.abs(x[1] - y[1]), Math.abs(x[2] - y[2]));
}

/** Pozycja piksela środka kafla; R = promień opisany (połowa szerokości kafla). */
export function pixel(pos, R) {
  const c = posToCube(pos);
  if (!c) return null;
  return { x: 1.5 * R * c[0], y: (-Math.sqrt(3) * R * (c[1] - c[2])) / 2 };
}

/** Ścieżka SVG heksa o płaskiej górnej i dolnej krawędzi. */
export function hexPath(cx, cy, R) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push(`${(cx + R * Math.cos(a)).toFixed(2)},${(cy + R * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/**
 * Rozkłada identyfikator hiperpasa "85a3" / "85a180" / "83A" na bazę i obrót.
 * Zwraca { base:'85a', rot:3, dataId:'85a180' } – dataId pasuje do hyperlanes.properties.
 */
export function parseHyperlaneId(id) {
  const s = String(id).toLowerCase();
  let m = s.match(/^(\d{2}[ab])(\d{2,3})$/);
  if (m) {
    const deg = Number(m[2]);
    return { base: m[1], rot: Math.round(deg / 60) % 6, dataId: deg === 0 ? m[1] : `${m[1]}${deg}` };
  }
  m = s.match(/^(\d{2}[ab])(\d)$/);
  if (m) {
    const rot = Number(m[2]) % 6;
    return { base: m[1], rot, dataId: rot === 0 ? m[1] : `${m[1]}${rot * 60}` };
  }
  m = s.match(/^(\d{2}[ab])$/);
  if (m) return { base: m[1], rot: 0, dataId: m[1] };
  return { base: s, rot: 0, dataId: s };
}

/**
 * Buduje graf sąsiedztwa dla wygenerowanej mapy.
 *
 * @param {Object} placement  pozycja -> id kafla
 * @param {Map}    sysById    id kafla -> obiekt systemu
 * @param {Object} opts       { throughWormholes:boolean }
 * @returns {Map} pozycja -> Set(pozycji sąsiednich systemów)
 */
export function buildAdjacency(placement, sysById, opts = {}) {
  const isHyper = (pos) => {
    const s = sysById.get(placement[pos]);
    return s && s.category === 'hyperlane';
  };

  /** Przejście przez (ewentualny łańcuch) hiperpasów. */
  function walk(fromPos, dir, seen, out) {
    const target = neighbors(fromPos)[dir];
    if (!target || !(target in placement)) return;
    if (!isHyper(target)) { out.add(target); return; }
    const key = `${target}:${dir}`;
    if (seen.has(key)) return;
    seen.add(key);
    const sys = sysById.get(placement[target]);
    const matrix = sys?.hyperlane;
    if (!matrix) return;
    const entry = (dir + 3) % 6; // krawędź, przez którą wchodzimy do hiperpasa
    const row = matrix[entry] || [];
    for (let d = 0; d < 6; d++) {
      if (row[d]) walk(target, d, seen, out);
    }
  }

  const adj = new Map();
  for (const pos of Object.keys(placement)) {
    if (isHyper(pos)) continue;
    const out = new Set();
    for (let d = 0; d < 6; d++) walk(pos, d, new Set(), out);
    out.delete(pos);
    adj.set(pos, out);
  }

  if (opts.throughWormholes) {
    const byWormhole = new Map();
    for (const pos of adj.keys()) {
      for (const w of sysById.get(placement[pos])?.wormholes || []) {
        if (!byWormhole.has(w)) byWormhole.set(w, []);
        byWormhole.get(w).push(pos);
      }
    }
    for (const group of byWormhole.values()) {
      for (const a of group) for (const b of group) if (a !== b) adj.get(a).add(b);
    }
  }
  return adj;
}

/** Odległości BFS od pozycji startowej po grafie sąsiedztwa. */
export function bfsDistances(adj, start) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of adj.get(cur) || []) {
      if (!dist.has(n)) { dist.set(n, dist.get(cur) + 1); queue.push(n); }
    }
  }
  return dist;
}

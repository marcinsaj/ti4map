/**
 * Silnik generowania mapy TI4.
 *
 * Zasady, które silnik zna (Living Rules Reference 2.0, "Complete Setup", krok 6):
 *  - kafle dzielimy wg koloru rewersu: niebieskie (z planetami) i czerwone (anomalie / pustka),
 *  - każdy gracz dostaje ustaloną liczbę niebieskich i czerwonych kafli (zależnie od układu),
 *  - kafle z anomaliami nie mogą leżeć obok siebie, "chyba że nie ma innej możliwości",
 *  - kafle z tunelami czasoprzestrzennymi tego samego typu nie mogą leżeć obok siebie,
 *    "chyba że nie ma innej możliwości",
 *  - domy graczy i hiperpasy nie biorą udziału w losowaniu.
 */
import { neighbors, distance, buildAdjacency, bfsDistances, parseHyperlaneId } from './hex.js';

/* --------------------------------------------------------------- */
/*  PRNG (deterministyczny, żeby dało się odtworzyć mapę z ziarna)  */
/* --------------------------------------------------------------- */

export function hashSeed(str) {
  let h = 1779033703 ^ String(str).length;
  for (let i = 0; i < String(str).length; i++) {
    h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createRng(seed) {
  let a = hashSeed(seed);
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffled = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* --------------------------------------------------------------- */
/*  Cechy kafli używane przez opcje "zdolności ras"                 */
/* --------------------------------------------------------------- */

export const FEATURES = {
  supernova: { label: 'supernowa', test: (s) => s.anomalies.includes('supernova') },
  nebula: { label: 'mgławica', test: (s) => s.anomalies.includes('nebula') },
  asteroid_field: { label: 'pole asteroid', test: (s) => s.anomalies.includes('asteroid_field') },
  gravity_rift: { label: 'rozdarcie grawitacyjne', test: (s) => s.anomalies.includes('gravity_rift') },
  entropic_scar: { label: 'entropiczna blizna', test: (s) => s.anomalies.includes('entropic_scar') },
  anomaly: { label: 'dowolna anomalia', test: (s) => s.anomalies.length > 0 },
  wormhole: { label: 'tunel czasoprzestrzenny', test: (s) => s.wormholes.length > 0 },
  wh_alpha: { label: 'tunel alfa', test: (s) => s.wormholes.includes('ALPHA') },
  wh_beta: { label: 'tunel beta', test: (s) => s.wormholes.includes('BETA') },
  wh_gamma: { label: 'tunel gamma', test: (s) => s.wormholes.includes('GAMMA') },
  wh_epsilon: { label: 'tunel epsilon', test: (s) => s.wormholes.includes('EPSILON') },
  legendary: { label: 'planeta legendarna', test: (s) => s.legendary.length > 0 },
  tech_specialty: { label: 'specjalizacja technologiczna', test: (s) => s.techSpecialties.length > 0 },
};

/* --------------------------------------------------------------- */
/*  Statyczna analiza układu: sąsiedztwo graczy, dystanse           */
/* --------------------------------------------------------------- */

/**
 * Dla danego układu liczy, do którego gracza "należy" każde gniazdo.
 * Gniazdo równo oddalone od kilku domów dzielone jest po równo (jak w draftach Milty).
 */
export function analyseLayout(layout, sysById, opts = {}) {
  const skeleton = { '000': '18' };
  for (const [pos, tid] of Object.entries(layout.hyperlanes || {})) {
    skeleton[pos] = parseHyperlaneId(tid).dataId;
  }
  for (const pos of layout.homes) skeleton[pos] = '__home__';
  for (const pos of layout.slots) skeleton[pos] = '__slot__';

  const fakeSys = new Map(sysById);
  fakeSys.set('__home__', { category: 'home', wormholes: [], anomalies: [] });
  fakeSys.set('__slot__', { category: 'blue', wormholes: [], anomalies: [] });
  fakeSys.set('18', { category: 'mecatol', wormholes: [], anomalies: [] });

  const adj = buildAdjacency(skeleton, fakeSys, { throughWormholes: false });
  const distFromHome = layout.homes.map((h) => bfsDistances(adj, h));
  const mecatolDist = layout.homes.map((_, i) => distFromHome[i].get('000') ?? Infinity);

  const weights = new Map(); // pozycja -> tablica wag per gracz
  for (const pos of layout.slots) {
    const d = distFromHome.map((m) => m.get(pos) ?? Infinity);
    const best = Math.min(...d);
    const owners = d.map((x) => (x === best && best !== Infinity ? 1 : 0));
    const n = owners.reduce((a, b) => a + b, 0) || 1;
    weights.set(pos, owners.map((o) => o / n));
    }
  return { adj, distFromHome, mecatolDist, weights };
}

/* --------------------------------------------------------------- */
/*  Pula kafli                                                      */
/* --------------------------------------------------------------- */

export function buildPool(systems, { expansions, disabledTiles = new Set(), extraTiles = new Set() }) {
  const blue = [], red = [];
  for (const s of systems) {
    const enabledByExpansion = expansions.includes(s.expansion);
    const forced = extraTiles.has(s.id);
    if (!forced) {
      if (!s.inPool || !enabledByExpansion || disabledTiles.has(s.id)) continue;
    } else if (!enabledByExpansion) continue;
    (s.category === 'red' ? red : blue).push(s);
  }
  return { blue, red };
}

/* --------------------------------------------------------------- */
/*  Ocena rozstawienia                                              */
/* --------------------------------------------------------------- */

const BIG = 10000;

/** Wagi domyślne – patrz opis w interfejsie (zakładka „Gra” → „Wagi balansu”). */
export const DEFAULT_WEIGHTS = {
  optTotal: 8, optRes: 3, optInf: 3, planets: 2, tech: 3, anomalies: 1, wormholes: 1, legendary: 2,
};
/** Suma wag domyślnych – do skalowania temperatury wyżarzania. */
const DEFAULT_WEIGHT_SUM = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);

function violations(placement, layout, sysById, rules) {
  let anomalyPairs = 0, wormholePairs = 0, mecatolAnomaly = 0;
  const homeAnomalies = 0;   // uzupełniane w evaluate(), gdzie znane jest sąsiedztwo domów
  const seen = new Set();
  for (const pos of layout.slots) {
    const s = sysById.get(placement[pos]);
    if (!s) continue;
    for (const n of neighbors(pos)) {
      if (!n || !(n in placement)) continue;
      const key = pos < n ? `${pos}|${n}` : `${n}|${pos}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = sysById.get(placement[n]);
      if (!t) continue;
      if (s.anomalies.length && t.anomalies.length) anomalyPairs++;
      for (const w of s.wormholes) if (t.wormholes.includes(w)) wormholePairs++;
    }
    if (rules.noAnomalyNextToMecatol && s.anomalies.length && distance(pos, '000') === 1) mecatolAnomaly++;
  }
  return { anomalyPairs, wormholePairs, mecatolAnomaly, homeAnomalies };
}

function homeNeighbourhood(layout, placement, sysById) {
  return layout.homes.map((h) => {
    const blue = [], red = [], anomalies = [];
    let anomaliesNoPlanet = 0;
    for (const n of neighbors(h)) {
      if (!n || !(n in placement)) continue;
      const s = sysById.get(placement[n]);
      if (!s || !layout.slots.includes(n)) continue;
      if (s.category === 'blue') blue.push(s); else if (s.category === 'red') red.push(s);
      if (s.anomalies.length) {
        anomalies.push(s);
        if (!s.planets.length) anomaliesNoPlanet++;   // Cormund czy Everra mają planetę – bywają mile widziane
      }
    }
    return { blue: blue.length, red: red.length, anomalies: anomalies.length, anomaliesNoPlanet };
  });
}

/**
 * Ile anomalii przy domach przekracza ustawiony limit. Gdy włączona jest zgoda na
 * anomalie z planetą, takie kafle w ogóle nie wliczają się do limitu.
 */
function homeAnomalyExcess(hood, rules) {
  if (!(rules.maxAnomaliesNextToHome >= 0)) return 0;
  const count = (h) => (rules.allowPlanetAnomalyNextToHome ? h.anomaliesNoPlanet : h.anomalies);
  return hood.reduce((a, h) => a + Math.max(0, count(h) - rules.maxAnomaliesNextToHome), 0);
}

export function sliceStats(placement, layout, analysis, sysById) {
  const n = layout.homes.length;
  const stats = Array.from({ length: n }, () => ({
    optRes: 0, optInf: 0, optTotal: 0, res: 0, inf: 0,
    planets: 0, tech: 0, anomalies: 0, wormholes: 0, legendary: 0, traits: {},
  }));
  for (const pos of layout.slots) {
    const s = sysById.get(placement[pos]);
    if (!s) continue;
    const w = analysis.weights.get(pos) || [];
    for (let i = 0; i < n; i++) {
      const k = w[i] || 0;
      if (!k) continue;
      const st = stats[i];
      st.optRes += k * s.optRes; st.optInf += k * s.optInf; st.optTotal += k * s.optTotal;
      st.res += k * s.res; st.inf += k * s.inf;
      st.planets += k * s.planets.length;
      st.tech += k * s.techSpecialties.length;
      st.anomalies += k * s.anomalies.length;
      st.wormholes += k * s.wormholes.length;
      st.legendary += k * s.legendary.length;
    }
  }
  return stats;
}

const spread = (xs) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);

function affinityMisses(placement, layout, analysis, sysById, affinity) {
  if (!affinity?.enabled) return { misses: 0, detail: [] };
  const detail = [];
  let misses = 0;
  for (const req of affinity.requirements) {
    const feat = FEATURES[req.feature];
    if (!feat) continue;
    let ok = false;
    if (req.need === 'home') {
      // wymaganie spełnia własny kafel domowy rasy – nic nie trzeba losować
      ok = true;
    } else if (req.need === 'nearby' && req.homeIndex >= 0) {
      const dist = analysis.distFromHome[req.homeIndex];
      ok = layout.slots.some((pos) => {
        const s = sysById.get(placement[pos]);
        return s && feat.test(s) && (dist.get(pos) ?? Infinity) <= (affinity.maxDistance ?? 2);
      });
    } else {
      ok = layout.slots.some((pos) => {
        const s = sysById.get(placement[pos]);
        return s && feat.test(s);
      });
    }
    if (!ok) misses++;
    detail.push({ ...req, satisfied: ok });
  }
  return { misses, detail };
}

export function evaluate(placement, ctx) {
  const { layout, sysById, analysis, rules, balance, affinity } = ctx;
  const v = violations(placement, layout, sysById, rules);
  const hood = homeNeighbourhood(layout, placement, sysById);
  const aff = affinityMisses(placement, layout, analysis, sysById, affinity);

  let cost = 0;
  if (rules.anomaliesAdjacent === 'avoid') cost += BIG * v.anomalyPairs;
  if (rules.sameWormholeAdjacent === 'avoid') cost += BIG * v.wormholePairs;
  if (rules.noAnomalyNextToMecatol) cost += BIG * v.mecatolAnomaly;
  if (rules.minBlueNextToHome > 0) {
    for (const h of hood) cost += BIG * Math.max(0, rules.minBlueNextToHome - h.blue);
  }
  // Kara równa zasadzie „anomalie nie sąsiadują”, żeby jedna reguła nie ustępowała drugiej.
  v.homeAnomalies = homeAnomalyExcess(hood, rules);
  cost += BIG * v.homeAnomalies;
  cost += BIG * 2 * aff.misses;

  let balanceCost = 0;
  const stats = sliceStats(placement, layout, analysis, sysById);
  if (balance?.enabled) {
    const w = balance.weights;
    balanceCost += (w.optTotal || 0) * spread(stats.map((s) => s.optTotal));
    balanceCost += (w.optRes || 0) * spread(stats.map((s) => s.optRes));
    balanceCost += (w.optInf || 0) * spread(stats.map((s) => s.optInf));
    balanceCost += (w.planets || 0) * spread(stats.map((s) => s.planets));
    balanceCost += (w.tech || 0) * spread(stats.map((s) => s.tech));
    balanceCost += (w.anomalies || 0) * spread(stats.map((s) => s.anomalies));
    balanceCost += (w.wormholes || 0) * spread(stats.map((s) => s.wormholes));
    balanceCost += (w.legendary || 0) * spread(stats.map((s) => s.legendary));
    cost += balanceCost;
  }
  return { cost, balanceCost, violations: v, hood, stats, affinity: aff };
}

/* --------------------------------------------------------------- */
/*  Losowanie i optymalizacja                                       */
/* --------------------------------------------------------------- */

function pickTiles(pool, layout, players, ctx, rng) {
  const need = layout.totals
    ? { blue: layout.totals.blue, red: layout.totals.red }
    : {
      blue: layout.players * layout.deal.blue + (layout.extra?.blue || 0),
      red: layout.players * layout.deal.red + (layout.extra?.red || 0),
    };
  const chosen = { blue: [], red: [] };
  const problems = [];

  // 1. kafle wymuszone przez zdolności ras
  const forced = new Set();
  if (ctx.affinity?.enabled) {
    for (const req of ctx.affinity.requirements) {
      const feat = FEATURES[req.feature];
      if (!feat || req.need === 'home') continue;
      const already = [...forced].some((id) => feat.test(ctx.sysById.get(id)));
      if (already) continue;
      const cands = shuffled([...pool.blue, ...pool.red].filter((s) => feat.test(s) && !forced.has(s.id)), rng);
      if (cands.length) forced.add(cands[0].id);
      else problems.push(`Brak w puli kafla z cechą "${feat.label}" (${req.factionName}).`);
    }
  }

  for (const colour of ['blue', 'red']) {
    const forcedHere = pool[colour].filter((s) => forced.has(s.id));
    const rest = shuffled(pool[colour].filter((s) => !forced.has(s.id)), rng);
    const take = [...forcedHere, ...rest].slice(0, need[colour]);
    if (take.length < need[colour]) {
      problems.push(
        `Za mało kafli ${colour === 'blue' ? 'niebieskich' : 'czerwonych'}: potrzeba ${need[colour]}, dostępnych ${pool[colour].length}.`,
      );
    }
    chosen[colour] = take;
  }
  return { chosen, need, problems };
}

/**
 * Główna funkcja generatora.
 */
export function generate(options) {
  const {
    layout, systems, players, seed,
    expansions, disabledTiles, extraTiles,
    mode = 'balanced', rules = {}, balance = {}, affinity = {},
  } = options;

  const rng = createRng(seed);
  const sysById = new Map(systems.map((s) => [s.id, s]));
  const analysis = analyseLayout(layout, sysById);

  const effRules = {
    anomaliesAdjacent: 'avoid',
    sameWormholeAdjacent: 'avoid',
    noAnomalyNextToMecatol: false,
    minBlueNextToHome: 1,
    maxAnomaliesNextToHome: -1,
    allowPlanetAnomalyNextToHome: false,
    ...rules,
  };
  const effBalance = {
    enabled: mode === 'balanced',
    iterations: 15000,
    weights: DEFAULT_WEIGHTS,
    ...balance,
  };

  // wymagania wynikające ze zdolności ras
  const requirements = [];
  if (affinity.enabled) {
    players.forEach((p, i) => {
      if (!p.faction || affinity.perFaction?.[p.faction.id] === false) return;
      for (const a of p.faction.mapAffinity || []) {
        requirements.push({
          factionId: p.faction.id, factionName: p.faction.name,
          feature: a.feature, need: a.need, why: a.why,
          homeIndex: layout.homes.indexOf(p.homePos),
        });
      }
    });
  }
  const effAffinity = { enabled: !!affinity.enabled, maxDistance: affinity.maxDistance ?? 2, requirements };

  const ctx = { layout, sysById, analysis, rules: effRules, balance: effBalance, affinity: effAffinity };

  const pool = buildPool(systems, { expansions, disabledTiles, extraTiles });
  const { chosen, need, problems } = pickTiles(pool, layout, players, ctx, rng);

  // rozstawienie startowe
  const drawn = shuffled([...chosen.blue, ...chosen.red], rng);
  const placement = { '000': layout.mecatolTile || '18' };
  for (const [pos, tid] of Object.entries(layout.hyperlanes || {})) placement[pos] = parseHyperlaneId(tid).dataId;
  players.forEach((p) => { if (p.homeTile) placement[p.homePos] = p.homeTile; });
  layout.slots.forEach((pos, i) => { placement[pos] = drawn[i]?.id; });

  let best = { ...placement };
  let bestEval = evaluate(best, ctx);
  let iterations = 0;

  if (mode !== 'chaos' && layout.slots.length > 1) {
    const slots = layout.slots;
    let cur = { ...placement };
    let curCost = bestEval.cost;
    const maxIter = mode === 'balanced' ? effBalance.iterations : 8000;
    // Temperatura skalowana do sumy wag: dzięki temu podniesienie wszystkich suwaków
    // nie zmienia zachowania algorytmu – liczy się wyłącznie stosunek wag do siebie.
    const wSum = effBalance.enabled
      ? Math.max(1, Object.values(effBalance.weights).reduce((a, b) => a + (Number(b) || 0), 0))
      : DEFAULT_WEIGHT_SUM;
    const scale = wSum / DEFAULT_WEIGHT_SUM;
    const T0 = 60 * scale, T1 = 0.4 * scale;
    for (let it = 0; it < maxIter; it++) {
      iterations++;
      const T = T0 * Math.pow(T1 / T0, it / maxIter);
      const i = Math.floor(rng() * slots.length);
      let j = Math.floor(rng() * slots.length);
      if (i === j) j = (j + 1) % slots.length;
      const a = slots[i], b = slots[j];
      if (cur[a] === cur[b]) continue;
      [cur[a], cur[b]] = [cur[b], cur[a]];
      const ev = evaluate(cur, ctx);
      const d = ev.cost - curCost;
      if (d <= 0 || rng() < Math.exp(-d / Math.max(T, 1e-6))) {
        curCost = ev.cost;
        if (ev.cost < bestEval.cost) { best = { ...cur }; bestEval = ev; }
      } else {
        [cur[a], cur[b]] = [cur[b], cur[a]];
      }
      if (bestEval.cost === 0 && mode !== 'balanced') break;
    }
  }

  const report = {
    seed, mode, iterations,
    weights: effBalance.enabled ? { ...effBalance.weights } : null,
    counts: { need, drawnBlue: chosen.blue.length, drawnRed: chosen.red.length, poolBlue: pool.blue.length, poolRed: pool.red.length },
    problems,
    ...bestEval,
  };
  return { placement: best, report, analysis, drawn: { blue: chosen.blue, red: chosen.red } };
}

/* --------------------------------------------------------------- */
/*  Eksport                                                         */
/* --------------------------------------------------------------- */

/**
 * Ocenia gotowe (np. wczytane z pliku) rozstawienie bez losowania niczego.
 * Zwraca to samo, co `generate`, tyle że dla podanej mapy.
 */
export function describe(placement, { layout, systems, players, rules = {}, balance = {}, affinity = {} }) {
  const sysById = new Map(systems.map((s) => [s.id, s]));
  const analysis = analyseLayout(layout, sysById);
  const effRules = {
    anomaliesAdjacent: 'avoid', sameWormholeAdjacent: 'avoid', noAnomalyNextToMecatol: false,
    minBlueNextToHome: 0, maxAnomaliesNextToHome: -1, allowPlanetAnomalyNextToHome: false, ...rules,
  };
  const requirements = [];
  if (affinity.enabled) {
    players.forEach((p) => {
      if (!p.faction || affinity.perFaction?.[p.faction.id] === false) return;
      for (const a of p.faction.mapAffinity || []) {
        requirements.push({
          factionId: p.faction.id, factionName: p.faction.name, feature: a.feature, need: a.need,
          why: a.why, homeIndex: layout.homes.indexOf(p.homePos),
        });
      }
    });
  }
  const ctx = {
    layout, sysById, analysis, rules: effRules,
    balance: { enabled: false, weights: balance.weights || {} },
    affinity: { enabled: !!affinity.enabled, maxDistance: affinity.maxDistance ?? 2, requirements },
  };
  const ev = evaluate(placement, ctx);
  const counts = { need: {}, drawnBlue: 0, drawnRed: 0, poolBlue: 0, poolRed: 0 };
  for (const pos of layout.slots) {
    const s = sysById.get(placement[pos]);
    if (s?.category === 'blue') counts.drawnBlue++;
    if (s?.category === 'red') counts.drawnRed++;
  }
  return { placement, analysis, report: { seed: '(wczytana)', mode: 'imported', iterations: 0, weights: null, counts, problems: [], ...ev } };
}

/** Standardowy "map string" TI4: kafle od pozycji 101 w kolejności pierścieni. */
export function toMapString(placement, layout, { includeHomes = true } = {}) {
  const maxRing = Math.max(...Object.keys(placement).filter((p) => p !== '000').map((p) => Number(p[0])), 1);
  const out = [];
  for (let r = 1; r <= maxRing; r++) {
    for (let i = 1; i <= 6 * r; i++) {
      const pos = `${r}${String(i).padStart(2, '0')}`;
      const tid = placement[pos];
      const isHome = layout.homes.includes(pos);
      if (!tid || (isHome && !includeHomes)) { out.push(isHome ? '0' : '-1'); continue; }
      out.push(tid);
    }
  }
  while (out.length && out[out.length - 1] === '-1') out.pop();
  return out.join(' ');
}

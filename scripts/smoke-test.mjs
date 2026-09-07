import fs from 'node:fs';
import { generate, toMapString, analyseLayout, DEFAULT_WEIGHTS } from '../web/js/generator.js';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../web/data/${n}.json`, import.meta.url), 'utf8'));
const systems = load('systems'), factions = load('factions'), layouts = load('layouts');
const sysById = new Map(systems.map((s) => [s.id, s]));
const facById = new Map(factions.map((f) => [f.id, f]));

const HOME_OVERRIDE = { ghost: '17', crimson: '94' };
const homeTile = (f) => (f ? HOME_OVERRIDE[f.id] || f.homeSystems[0].id : null);

for (const L of layouts) {
  const picks = ['sol', 'muaat', 'ghost', 'saar', 'empyrean', 'cabal'].slice(0, L.players).map((id) => facById.get(id));
  const players = L.homes.map((pos, i) => ({ index: i, homePos: pos, faction: picks[i] || null, homeTile: homeTile(picks[i]) }));
  for (const mode of ['balanced', 'random', 'chaos']) {
    const t0 = Date.now();
    const r = generate({
      layout: L, systems, players, seed: 'test-' + L.id + mode,
      expansions: ['base', 'pok', 'codex', 'te'],
      disabledTiles: new Set(), extraTiles: new Set(),
      mode,
      balance: { enabled: mode === 'balanced', iterations: 12000, weights: DEFAULT_WEIGHTS },
      affinity: { enabled: true, maxDistance: 2, perFaction: {} },
    });
    const v = r.report.violations;
    const filled = L.slots.filter((p) => r.placement[p]).length;
    const spread = (xs) => (Math.max(...xs) - Math.min(...xs)).toFixed(2);
    console.log(
      `${L.id.padEnd(14)} ${mode.padEnd(9)} ${Date.now() - t0}ms  gniazd ${filled}/${L.slots.length}` +
      `  anom.par=${v.anomalyPairs} wh.par=${v.wormholePairs}` +
      `  rozrzut optΣ=${spread(r.report.stats.map((s) => s.optTotal))}` +
      `  affinity=${r.report.affinity.detail.filter((d) => d.satisfied).length}/${r.report.affinity.detail.length}` +
      (r.report.problems.length ? `  ⚠ ${r.report.problems.join('; ')}` : ''),
    );
    const dup = Object.values(r.placement).filter((x, i, a) => a.indexOf(x) !== i && !String(x).match(/^\d\d[ab]/));
    if (dup.length) console.log('   !! zduplikowane kafle:', dup);
  }
}
// determinizm
const L = layouts.find((l) => l.id === '6p');
const players = L.homes.map((pos, i) => ({ index: i, homePos: pos, faction: null, homeTile: null }));
const opt = { layout: L, systems, players, seed: 'abc', expansions: ['base', 'pok'], disabledTiles: new Set(), extraTiles: new Set(), mode: 'balanced', balance: { enabled: true, iterations: 4000, weights: { optTotal: 6 } }, affinity: {} };
const a = toMapString(generate(opt).placement, L), b = toMapString(generate(opt).placement, L);
console.log('determinizm:', a === b ? 'OK' : 'BŁĄD');
console.log('map string 6p:', a);

// --- zgodność układów z hiperpasami z instrukcją Krańca Burzy (s. 7) ---
const TE_SETUPS = {
  '4p_compact': {
    homes: ['304', '307', '313', '316'],
    hyper: ['101', '104', '202', '206', '208', '212', '301', '302', '309', '310', '311', '318'],
    deal: { blue: 3, red: 2 },
  },
  '5p_hyperlane': {
    homes: ['301', '304', '307', '313', '316'],
    hyper: ['104', '206', '208', '309', '310', '311'],
    deal: { blue: 3, red: 2 },
  },
};
let teOk = true;
for (const [id, want] of Object.entries(TE_SETUPS)) {
  const L = layouts.find((l) => l.id === id);
  const got = { homes: L.homes.slice().sort(), hyper: Object.keys(L.hyperlanes).sort() };
  const same = JSON.stringify(got.homes) === JSON.stringify(want.homes.slice().sort())
    && JSON.stringify(got.hyper) === JSON.stringify(want.hyper.slice().sort())
    && L.deal.blue === want.deal.blue && L.deal.red === want.deal.red;
  if (!same) { teOk = false; console.log(`  !! ${id} nie zgadza się z instrukcją KB`, got); }
}
console.log('układy z hiperpasami zgodne z instrukcją Krańca Burzy:', teOk ? 'OK' : 'BŁĄD');

// --- wymagane dodatki: układ z hiperpasami musi je wypisać, inaczej dałoby się go wybrać
//     bez dodatku, z którego pochodzą kafle ---
const meta = load('meta');
const reqProblems = [];
for (const L of layouts) {
  const req = L.requires || [];
  for (const id of req) if (!meta.expansions[id]) reqProblems.push(`${L.id}: nieznany dodatek ${id}`);
  const hl = Object.keys(L.hyperlanes || {}).length;
  if (hl && !req.length) reqProblems.push(`${L.id}: ${hl} hiperpasów, a nie wymaga dodatku`);
  if (!hl && req.length) reqProblems.push(`${L.id}: bez hiperpasów, a wymaga ${req.join(', ')}`);
}
// przy samej podstawce musi zostać jakiś układ, inaczej generator nie miałby co pokazać
const baseOnly = layouts.filter((L) => !(L.requires || []).length).map((L) => L.players);
if (!baseOnly.length) reqProblems.push('podstawka bez ani jednego układu');
console.log('wymagane dodatki układów:', reqProblems.length ? `BŁĄD ${reqProblems.join(' | ')}` : 'OK',
  `| na samej podstawce: ${[...new Set(baseOnly)].sort().join(', ')} graczy`);

// --- katalog kart ---
const cards = load('cards');
const factionIds = new Set(factions.map((f) => f.id));
const orphan = [];
for (const key of ['technologies', 'leaders', 'promissoryNotes', 'units', 'abilities', 'breakthroughs']) {
  for (const c of cards[key]) {
    if (c.faction && !factionIds.has(c.faction) && c.faction !== 'keleres') orphan.push(`${key}/${c.id}:${c.faction}`);
    if (!c.name || c.text === '(brak danych)') orphan.push(`${key}/${c.id}: brak treści`);
  }
}
console.log(`katalog kart: ${Object.entries(cards).map(([k, v]) => `${k}=${v.length}`).join(' ')}`
  + ` | problemy: ${orphan.length ? orphan.slice(0, 5).join(', ') : 'brak'}`);
const missing = factions.filter((f) => !f.leaders.length || !f.abilities.length || !f.units.length);
console.log('rasy z niekompletnym zestawem kart:', missing.length ? missing.map((f) => f.id).join(', ') : 'brak');

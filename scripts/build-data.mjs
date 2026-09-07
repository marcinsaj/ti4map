/**
 * build-data.mjs
 *
 * Buduje zestaw danych generatora (web/data/*.json) na podstawie surowych danych
 * z repozytorium AsyncTI4 (vendor/async) oraz układów planszy wyciągniętych
 * z oficjalnego "Living Rules Reference 2.0" (scripts/official_layouts_raw.json).
 *
 * Uruchomienie:  node scripts/build-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RES = path.join(ROOT, 'vendor', 'async', 'src', 'main', 'resources');
const OUT = path.join(ROOT, 'web', 'data');

/* ------------------------------------------------------------------ */
/*  Konfiguracja: które źródła (dodatki) wchodzą do generatora          */
/* ------------------------------------------------------------------ */

export const EXPANSIONS = {
  base: { id: 'base', name: 'Podstawka', short: 'Podst.', sources: ['base'] },
  pok: { id: 'pok', name: 'Proroctwo Królów', short: 'PK', sources: ['pok'] },
  codex: { id: 'codex', name: 'Codex – Rada Keleres', short: 'Codex', sources: ['codex3'] },
  te: { id: 'te', name: 'Kraniec Burzy', short: 'KB', sources: ['thunders_edge'] },
};

/** Słowniki polskich nazw dla wartości słownikowych z danych źródłowych. */
export const PL = {
  planetTypes: {
    CULTURAL: 'kulturalna', INDUSTRIAL: 'przemysłowa', HAZARDOUS: 'niegościnna',
    SPACESTATION: 'stacja kosmiczna', FACTION: 'ojczysta', NONE: 'bez cechy',
  },
  tech: {
    BIOTIC: 'biotyczna (zielona)', WARFARE: 'wojenna (czerwona)',
    PROPULSION: 'napędowa (niebieska)', CYBERNETIC: 'cybernetyczna (żółta)',
  },
  wormholes: { ALPHA: 'alfa (α)', BETA: 'beta (β)', GAMMA: 'gamma (γ)', DELTA: 'delta (δ)', EPSILON: 'epsilon (ε)' },
  anomalies: {
    supernova: 'supernowa', nebula: 'mgławica', asteroid_field: 'pole asteroid',
    gravity_rift: 'rozdarcie grawitacyjne', entropic_scar: 'entropiczna blizna', fracture: 'Fracture',
  },
  backs: { blue: 'niebieski', red: 'czerwony', green: 'zielony (dom)', black: 'czarny (specjalny)', fracture: 'Fracture', hyperlane: 'hiperpas' },
  categories: { blue: 'system niebieski', red: 'system czerwony', home: 'system domowy', mecatol: 'Mecatol Rex', hyperlane: 'hiperpas', special: 'kafel specjalny' },
  leaderTypes: { agent: 'agent', commander: 'dowódca', hero: 'bohater', envoy: 'wysłannik', mech: 'mech' },
  complexity: { Low: 'niska', Moderate: 'średnia', Medium: 'średnia', High: 'wysoka', VeryHigh: 'bardzo wysoka' },
  cardTypes: {
    agent: 'agent', commander: 'dowódca', hero: 'bohater',
    unitupgrade: 'ulepszenie jednostki', biotic: 'biotyczna', warfare: 'wojenna',
    propulsion: 'napędowa', cybernetic: 'cybernetyczna', none: '—',
  },
  /** Kolory technologii wg polskiej instrukcji. */
  techColors: {
    BIOTIC: { name: 'biotyczna', colour: 'zielona', letter: 'G', css: '#3fb950' },
    WARFARE: { name: 'wojenna', colour: 'czerwona', letter: 'R', css: '#e8443a' },
    PROPULSION: { name: 'napędowa', colour: 'niebieska', letter: 'B', css: '#3d8bff' },
    CYBERNETIC: { name: 'cybernetyczna', colour: 'żółta', letter: 'Y', css: '#f0c419' },
    UNITUPGRADE: { name: 'ulepszenie jednostki', colour: 'szara', letter: 'U', css: '#9aa4b2' },
  },
  /** Nazwy jednostek wg polskiej instrukcji Galakty. */
  units: {
    carrier: 'transportowiec', cruiser: 'krążownik', destroyer: 'niszczyciel',
    dreadnought: 'pancernik', fighter: 'myśliwiec', infantry: 'piechota',
    flagship: 'okręt flagowy', warsun: 'słońce wojny', spacedock: 'stocznia kosmiczna',
    pds: 'PDS', mech: 'mech', monument: 'monument',
  },
  /** Zdolności jednostek wg polskiej instrukcji. */
  unitAbilities: {
    sustainDamage: 'WYTRZYMAŁOŚĆ', planetaryShield: 'TARCZA PLANETARNA',
    spaceCannon: 'DZIAŁO KOSMICZNE', deepSpaceCannon: 'DZIAŁO KOSMICZNE (głębokie)',
    bombardment: 'BOMBARDOWANIE', antiFighterBarrage: 'OSTRZAŁ PRZECIWMYŚLIWSKI',
    production: 'PRODUKCJA',
  },
  stats: {
    cost: 'KOSZT', combat: 'WALKA', move: 'RUCH', capacity: 'ŁADOWNOŚĆ', production: 'PRODUKCJA',
  },
  /**
   * Polskie nazwy ras – wyłącznie te potwierdzone w oficjalnych materiałach Galakty
   * (research/pdf/pl_*.pdf). Brakujące można tu dopisać po sprawdzeniu w instrukcji.
   */
  factions: {
    sol: 'Federacja Sol', xxcha: 'Królestwo Xxcha', letnev: 'Baronia Letnev',
    jolnar: 'Uniwersytety Jol-Nar', hacan: 'Emiraty Hakanów', sardakk: 'Sardakk N’orr',
    yin: 'Bractwo Yin', saar: 'Klan Saar', l1z1x: 'Współjaźń L1Z1X', nekro: 'Nekrowirus',
    ghost: 'Widma z Creussa', muaat: 'Żagwie Muaat', naaz: 'Sojusz Naaz-Rokha',
    arborec: 'Arborec', winnu: 'Winnu',
    bastion: 'Ostatni Bastion', crimson: 'Karmazynowa Rebelia',
    firmament: 'Firmament', obsidian: 'Obsydian', deepwrought: 'Akademia Przepastnych Archiwów',
  },
};
const SOURCE_TO_EXPANSION = {};
for (const e of Object.values(EXPANSIONS)) for (const s of e.sources) SOURCE_TO_EXPANSION[s] = e.id;
// karty kodeksowe (wersje Ω, technologie Keleres) traktujemy jak zawartość Codexu
for (const s of ['codex1', 'codex2', 'codex4', 'codex45', 'keleresplus']) SOURCE_TO_EXPANSION[s] = 'codex';

/** Kafle, które NIE biorą udziału w losowaniu mapy (poza domami i hiperpasami). */
const NON_POOL = {
  '17': { group: 'setup', why: 'Wrota Creuss – trafiają na mapę razem z Ghosts of Creuss (zamiast ich domu).' },
  '18': { group: 'center', why: 'Mecatol Rex – zawsze na środku planszy.' },
  '51': { group: 'setup', why: 'Creuss – dom Ghosts of Creuss leży poza planszą.' },
  c41: { group: 'variant', why: 'Ordinian (Codex I) – kafel scenariuszowy, poza standardową pulą.' },
  '81': { group: 'ingame', why: 'Nova Seed – tworzona w trakcie gry przez bohatera Embers of Muaat.' },
  '82a': { group: 'setup', why: 'Wormhole Nexus (zamknięty) – kładziony obok planszy podczas przygotowania.' },
  '82b': { group: 'setup', why: 'Wormhole Nexus (otwarty) – rewers Nexusa, Mallice.' },
  '112': { group: 'variant', why: 'Mecatol Rex (Kraniec Burzy) – alternatywny kafel środkowy.' },
  '118': { group: 'setup', why: 'Ahk Creuxx – prawdziwy dom Crimson Rebellion, trzymany w polu gry.' },
  silver_flame: { group: 'ingame', why: 'Remnants of The Silver Flame – kafel wchodzący do gry efektem.' },
};
for (const id of ['fracture1', 'fracture2', 'fracture3', 'fracture4', 'fracture5', 'fracture6', 'fracture7']) {
  NON_POOL[id] = { group: 'fracture', why: 'The Fracture – osobny obszar dokładany w trakcie gry (Kraniec Burzy).' };
}

/* ------------------------------------------------------------------ */
/*  Pomocnicze                                                         */
/* ------------------------------------------------------------------ */

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
const listJson = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
const asArray = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);
const uniq = (a) => [...new Set(a)];

function anomaliesOf(sys) {
  const map = {
    isAsteroidField: 'asteroid_field',
    isSupernova: 'supernova',
    isNebula: 'nebula',
    isGravityRift: 'gravity_rift',
    isFracture: 'fracture',
    isScar: 'entropic_scar',
  };
  return Object.entries(map).filter(([k]) => sys[k] === true).map(([, v]) => v);
}

/** Wartość "optymalna" wg konwencji draftu Milty: zasoby vs. wpływy, remis dzielony po połowie. */
function optimalOf(planets) {
  let r = 0, i = 0;
  for (const p of planets) {
    const res = p.resources || 0, inf = p.influence || 0;
    if (res > inf) r += res;
    else if (inf > res) i += inf;
    else { r += res / 2; i += inf / 2; }
  }
  return { optRes: r, optInf: i, optTotal: r + i };
}

/* ------------------------------------------------------------------ */
/*  1. Planety                                                         */
/* ------------------------------------------------------------------ */

function buildPlanets() {
  const out = new Map();
  for (const file of listJson(path.join(RES, 'planets'))) {
    const p = readJson(file);
    if (!SOURCE_TO_EXPANSION[p.source]) continue;
    const types = p.planetTypes ? p.planetTypes.slice() : p.planetType ? [p.planetType] : [];
    out.set(p.id, {
      id: p.id,
      name: p.name,
      shortName: p.shortName || p.name,
      tileId: p.tileId ?? null,
      resources: p.resources ?? 0,
      influence: p.influence ?? 0,
      types: types.filter(Boolean),
      tech: (p.techSpecialties || []).slice(),
      legendary: p.legendaryAbilityName
        ? { name: p.legendaryAbilityName, text: p.legendaryAbilityText || '' }
        : null,
      factionHomeworld: p.factionHomeworld || null,
      source: p.source,
      expansion: SOURCE_TO_EXPANSION[p.source],
      flavour: p.flavourText || null,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  2. Systemy (kafle)                                                 */
/* ------------------------------------------------------------------ */

const HYPERLANE_RE = /^(8[3-9]|9[01])([ab])(\d{2,3})?$/i;

function buildSystems(planets) {
  const out = [];
  const hyperlaneMatrix = readHyperlaneMatrix();

  for (const file of listJson(path.join(RES, 'systems'))) {
    const s = readJson(file);
    const exp = SOURCE_TO_EXPANSION[s.source];
    if (!exp) continue;

    const sysPlanets = (s.planets || []).map((pid) => planets.get(pid)).filter(Boolean);
    const anomalies = anomaliesOf(s);
    const wormholes = (s.wormholes || []).slice();
    const back = s.tileBack || (s.isHyperlane ? 'hyperlane' : 'black');

    let category;
    if (s.isHyperlane) category = 'hyperlane';
    else if (s.id === '18' || s.id === '112') category = 'mecatol';
    else if (back === 'green') category = 'home';
    else if (back === 'blue') category = 'blue';
    else if (back === 'red') category = 'red';
    else category = 'special';

    const nonPool = NON_POOL[s.id];
    const inPool = category === 'blue' || category === 'red' ? !nonPool : false;

    const res = sysPlanets.reduce((a, p) => a + p.resources, 0);
    const inf = sysPlanets.reduce((a, p) => a + p.influence, 0);
    const { optRes, optInf, optTotal } = optimalOf(sysPlanets);

    const tags = [];
    if (anomalies.length) tags.push('anomaly');
    for (const a of anomalies) tags.push(a);
    if (wormholes.length) tags.push('wormhole');
    for (const w of wormholes) tags.push('wh_' + w.toLowerCase());
    if (sysPlanets.some((p) => p.legendary)) tags.push('legendary');
    if (sysPlanets.some((p) => p.tech.length)) tags.push('tech_specialty');
    if (sysPlanets.some((p) => p.types.includes('SPACESTATION'))) tags.push('space_station');
    if (!sysPlanets.length && !anomalies.length && category === 'red') tags.push('empty');
    if (sysPlanets.length >= 2) tags.push('multi_planet');

    const hl = s.isHyperlane ? String(s.id).toLowerCase() : null;

    out.push({
      id: s.id,
      name: s.name,
      source: s.source,
      expansion: exp,
      back,
      category,
      inPool,
      excluded: nonPool ? { group: nonPool.group, why: nonPool.why } : null,
      anomalies,
      wormholes,
      planets: sysPlanets.map((p) => p.id),
      res,
      inf,
      optRes,
      optInf,
      optTotal,
      techSpecialties: sysPlanets.flatMap((p) => p.tech),
      legendary: sysPlanets.filter((p) => p.legendary).map((p) => ({ planet: p.name, ...p.legendary })),
      image: s.imagePath || null,
      hyperlane: hl ? hyperlaneMatrix[hl] || null : null,
      tags: uniq(tags),
    });
  }
  out.sort((a, b) => sortKey(a.id).localeCompare(sortKey(b.id), 'en', { numeric: true }));
  return out;
}

const sortKey = (id) => String(id).padStart(6, '0');

function readHyperlaneMatrix() {
  const file = path.join(RES, 'data', 'hyperlanes.properties');
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^=#]+)=(.+)$/);
    if (!m) continue;
    out[m[1].trim().toLowerCase()] = m[2].split(';').map((row) => row.split(',').map(Number));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  3. Frakcje (rasy)                                                  */
/* ------------------------------------------------------------------ */

function indexCards(dir, files) {
  const idx = new Map();
  for (const f of files) {
    const p = path.join(RES, 'data', dir, f);
    if (!fs.existsSync(p)) continue;
    for (const item of asArray(readJson(p))) {
      if (!item || typeof item !== 'object') continue;
      const key = item.alias || item.id;
      if (key) idx.set(String(key).toLowerCase(), item);
    }
  }
  return idx;
}

const TEXT_KEYS = [
  'text', 'text1', 'text2', 'text3', 'permanentEffect', 'window', 'windowEffect',
  'unlockCondition', 'abilityText', 'abilityName', 'flavourText', 'notes', 'homebrewReplacesID',
];

function cardOut(card, id) {
  if (!card) return { id, name: id, text: '(brak danych)' };
  const parts = [];
  if (card.window && card.windowEffect) parts.push(`${card.window}: ${card.windowEffect}`);
  else if (card.windowEffect) parts.push(card.windowEffect);
  else if (card.window) parts.push(card.window);
  for (const k of ['permanentEffect', 'text', 'text1', 'text2', 'text3', 'abilityText', 'unlockCondition']) {
    if (card[k] && !parts.includes(card[k])) parts.push(card[k]);
  }
  return {
    id,
    name: card.name || card.alias || id,
    type: card.type || card.leaderType || null,
    requirements: card.requirements || null,
    faction: card.faction || null,
    text: parts.filter(Boolean).join(' ') || (card.flavourText || ''),
    flavour: card.flavourText || null,
  };
}

const REQ_LETTER_TO_COLOR = { B: 'PROPULSION', G: 'BIOTIC', R: 'WARFARE', Y: 'CYBERNETIC' };

/** Karta technologii z rozbitym wymaganiem na kolory. */
function techOut(card, id, factionNames) {
  if (!card) return { ...cardOut(card, id), kind: 'technology' };
  const req = String(card.requirements || '');
  const cost = { PROPULSION: 0, BIOTIC: 0, WARFARE: 0, CYBERNETIC: 0 };
  for (const ch of req) if (REQ_LETTER_TO_COLOR[ch]) cost[REQ_LETTER_TO_COLOR[ch]]++;
  const types = card.types || [];
  return {
    kind: 'technology',
    id: card.alias || id,
    name: card.name,
    types,
    colour: types[0] || 'UNITUPGRADE',
    unitUpgrade: types.includes('UNITUPGRADE'),
    requirements: req || null,
    cost,
    tier: req.length,
    text: card.text || '',
    notes: card.notes || null,
    faction: card.faction || null,
    factionName: card.faction ? factionNames?.get(card.faction) || card.faction : null,
    baseUpgrade: card.baseUpgrade || null,
    source: card.source,
    expansion: SOURCE_TO_EXPANSION[card.source] || 'other',
    image: card.imageURL || null,
  };
}

function leaderOut(card, id, factionNames) {
  if (!card) return { ...cardOut(card, id), kind: 'leader' };
  return {
    kind: 'leader',
    id: card.id || id,
    name: card.name,
    title: card.title || null,
    type: card.type || null,
    faction: card.faction || null,
    factionName: card.faction ? factionNames?.get(card.faction) || card.faction : null,
    window: card.abilityWindow || null,
    text: [card.abilityWindow, card.abilityText].filter(Boolean).join(' ') || card.abilityText || '',
    abilityName: card.abilityName || null,
    unlock: card.unlockCondition || null,
    notes: card.notes || null,
    source: card.source,
    expansion: SOURCE_TO_EXPANSION[card.source] || 'other',
    image: card.imageURL || null,
  };
}

function pnOut(card, id, factionNames) {
  if (!card) return { ...cardOut(card, id), kind: 'promissory' };
  return {
    kind: 'promissory',
    id: card.alias || id,
    name: card.name,
    text: card.text || '',
    notes: card.notes || null,
    faction: card.faction || null,
    factionName: card.faction ? factionNames?.get(card.faction) || card.faction : null,
    colour: card.color || null,
    scope: card.faction ? 'faction' : 'generic',
    playArea: !!card.playArea,
    playImmediately: !!card.playImmediately,
    attachment: !!card.attachment,
    source: card.source,
    expansion: SOURCE_TO_EXPANSION[card.source] || 'other',
  };
}

function unitOut(card, id, factionNames) {
  if (!card) return { ...cardOut(card, id), kind: 'unit' };
  const abilities = [];
  if (card.sustainDamage) abilities.push({ key: 'sustainDamage' });
  if (card.planetaryShield) abilities.push({ key: 'planetaryShield' });
  if (card.spaceCannonHitsOn) abilities.push({ key: 'spaceCannon', value: card.spaceCannonHitsOn, dice: card.spaceCannonDieCount || 1 });
  if (card.deepSpaceCannon) abilities.push({ key: 'deepSpaceCannon' });
  if (card.bombardHitsOn) abilities.push({ key: 'bombardment', value: card.bombardHitsOn, dice: card.bombardDieCount || 1 });
  if (card.afbHitsOn) abilities.push({ key: 'antiFighterBarrage', value: card.afbHitsOn, dice: card.afbDieCount || 1 });
  if (card.productionValue) abilities.push({ key: 'production', value: card.productionValue });
  return {
    kind: 'unit',
    id: card.id || id,
    name: card.name,
    baseType: card.baseType || null,
    faction: card.faction || null,
    factionName: card.faction ? factionNames?.get(card.faction) || card.faction : null,
    stats: {
      cost: card.cost ?? null, combat: card.combatHitsOn ?? null, dice: card.combatDieCount ?? null,
      move: card.moveValue ?? null, capacity: card.capacityValue ?? null,
    },
    abilities,
    text: card.ability || '',
    notes: card.notes || null,
    isShip: !!card.isShip, isStructure: !!card.isStructure, isGroundForce: !!card.isGroundForce,
    upgradesFrom: card.upgradesFromUnitId || null,
    requiredTech: card.requiredTechId || null,
    source: card.source,
    expansion: SOURCE_TO_EXPANSION[card.source] || 'other',
    image: card.imageURL || null,
  };
}

/** Rozbija zapis floty startowej ("cv, cr,2 ff, 4 inf n") na czytelną listę. */
const FLEET_CODES = {
  cv: 'carrier', carrier: 'carrier', cr: 'cruiser', ca: 'cruiser', cruiser: 'cruiser',
  dd: 'destroyer', destroyer: 'destroyer', dn: 'dreadnought', dread: 'dreadnought',
  ff: 'fighter', fighter: 'fighter', inf: 'infantry', gf: 'infantry', infantry: 'infantry',
  pds: 'pds', pd: 'pds', sd: 'spacedock', spacedock: 'spacedock',
  ws: 'warsun', mf: 'mech', mech: 'mech', fs: 'flagship', flagship: 'flagship',
};

function parseFleet(str, homePlanets = []) {
  if (!str) return [];
  const byLetter = new Map(homePlanets.map((p) => [p[0].toLowerCase(), p]));
  const out = [];
  for (const raw of String(str).split(',')) {
    const m = raw.trim().toLowerCase().match(/^(\d+)?\s*([a-z]+)\s*([a-z])?$/);
    if (!m) continue;
    const unit = FLEET_CODES[m[2]];
    if (!unit) continue;
    out.push({ count: Number(m[1] || 1), unit, planet: m[3] ? byLetter.get(m[3]) || null : null });
  }
  return out;
}

/** Powiązania frakcji z konkretnymi typami kafli (do opcji "uwzględnij zdolności ras"). */
const FACTION_MAP_AFFINITY = {
  muaat: [{ feature: 'supernova', need: 'nearby', why: 'Gashlai Physiology / Magmus Reactor – statki Muaat mogą wlatywać w supernowe i tam produkować.' }],
  empyrean: [{ feature: 'nebula', need: 'nearby', why: 'Voidborn – mgławice nie zatrzymują ruchu Empyrean; Aetherstream wzmacnia ruch przy anomaliach.' }],
  saar: [{ feature: 'asteroid_field', need: 'nearby', why: 'Chaos Mapping – Clan of Saar może wchodzić w pola asteroid i tam stawiać kosmiczne doki.' }],
  cabal: [{ feature: 'gravity_rift', need: 'nearby', why: 'Riftmeld / Dimensional Tear – Vuil\'raith żywią się rozdarciami grawitacyjnymi.' }],
  ghost: [{ feature: 'wormhole', need: 'nearby', why: 'Quantum Entanglement / Slipstream – cała frakcja opiera się na tunelach czasoprzestrzennych.' }],
  winnu: [{ feature: 'wormhole', need: 'anywhere', why: 'Lazax Gate Folding – tunel alfa/beta zwiększa użyteczność technologii.' }],
  crimson: [{ feature: 'wh_epsilon', need: 'home', why: 'Sundered – Crimson Rebellion korzysta wyłącznie z tuneli epsilon (kafle 94 i 118).' }],
  sardakk: [{ feature: 'anomaly', need: 'nearby', why: 'G\'hom Sek\'kus (bohater) – premia zależna od anomalii.' }],
  nekro: [{ feature: 'legendary', need: 'anywhere', why: 'Legendarne planety zwiększają wartość agresywnej ekspansji Nekro.' }],
};

/** Uwagi dotyczące przygotowania planszy dla konkretnych frakcji. */
const FACTION_SETUP_NOTES = {
  ghost: ['Dom (kafel 51 Creuss) kładziesz POZA planszą. W miejscu domu na mapie ląduje kafel 17 – Wrota Creuss (tunel delta).'],
  crimson: ['W miejscu domu kładziesz kafel 94 "The Sorrow" (z nieaktywnym wyłomem). Właściwy dom – kafel 118 Ahk Creuxx – trafia do pola gry.'],
  obsidian: ['Frakcji nie można wybrać podczas przygotowania gry – wchodzi do gry przez zdolność The Firmament (kafel 96b to rewers 96a).'],
  firmament: ['Dom to kafel 96a; jego rewers (96b) należy do The Obsidian.'],
  muaat: ['Bohater tworzy kafel 81 (Nova Seed) – nie bierze on udziału w losowaniu mapy.'],
  keleresa: ['Rada Keleres używa domu 93new (Argent) i nie może wystąpić razem z Argent Flight.'],
  keleresm: ['Rada Keleres używa domu 94new (Mentak) i nie może wystąpić razem z Mentak Coalition.'],
  keleresx: ['Rada Keleres używa domu 92new (Xxcha) i nie może wystąpić razem z Xxcha Kingdom.'],
};

/** Frakcje, które nie mogą wystąpić razem. */
const FACTION_CONFLICTS = {
  keleresa: ['argent'], argent: ['keleresa'],
  keleresm: ['mentak'], mentak: ['keleresm'],
  keleresx: ['xxcha'], xxcha: ['keleresx'],
  keleresa2: [], // placeholder
};

/** Etykieta rasy: polska nazwa, a w nawiasie oryginalna – o ile faktycznie się różnią. */
const normalise = (x) => String(x).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/^the /, '').replace(/[^a-z0-9]/g, '');

function displayNameOf(name, namePl) {
  if (!namePl) return name;
  return normalise(namePl) === normalise(name) ? namePl : `${namePl} (${name})`;
}

function buildFactions(systems) {
  const factionFiles = ['base.json', 'pok.json', 'keleres.json', 'te_factions.json'];
  const abilities = indexCards('abilities', ['base.json', 'pok.json', 'keleresplus.json', 'te_abilities.json', 'other.json']);
  const techs = indexCards('technologies', ['pok.json', 'keleresplus.json', 'te_techs.json', 'other.json']);
  const leaders = indexCards('leaders', ['pok.json', 'keleresplus.json', 'te_leaders.json', 'generic.json']);
  const notes = indexCards('promissory_notes', ['promissory_notes.json', 'thunders_edge.json', 'color.json']);
  const units = indexCards('units', ['baseUnits.json', 'pok.json', 'keleres.json', 'te_units.json']);
  const breakthroughs = indexCards('breakthroughs', ['te_breakthroughs.json']);

  const sysById = new Map(systems.map((s) => [String(s.id).toLowerCase(), s]));
  // nazwa rasy po aliasie – potrzebna, żeby karty rasowe wiedziały, do kogo należą
  const factionNames = new Map();
  for (const file of factionFiles) {
    for (const f of asArray(readJson(path.join(RES, 'data', 'factions', file)))) factionNames.set(f.alias, f.factionName);
  }
  const btByFaction = new Map();
  for (const bt of asArray(readJson(path.join(RES, 'data', 'breakthroughs', 'te_breakthroughs.json')))) {
    if (bt?.faction) btByFaction.set(bt.faction, bt);
  }
  const out = [];

  for (const file of factionFiles) {
    for (const f of asArray(readJson(path.join(RES, 'data', 'factions', file)))) {
      const exp = SOURCE_TO_EXPANSION[f.source];
      if (!exp) continue;
      const homeIds = [f.homeSystem].filter(Boolean).map(String);
      if (f.alias === 'crimson') homeIds.push('118');
      out.push({
        id: f.alias,
        name: f.factionName,
        source: f.source,
        expansion: exp,
        namePl: PL.factions[f.alias] || null,
        displayName: displayNameOf(f.factionName, PL.factions[f.alias]),
        complexity: PL.complexity[f.complexity] || f.complexity || null,
        commodities: f.commodities ?? null,
        startingFleet: f.startingFleet || null,
        startingFleetParsed: parseFleet(f.startingFleet, f.homePlanets || []),
        startingTech: (f.startingTech || []).map((t) => techOut(techs.get(t), t, factionNames)),
        startingTechChoice: f.startingTechOptions
          ? { pick: f.startingTechAmount ?? 1, options: f.startingTechOptions.map((t) => techOut(techs.get(t), t, factionNames)) }
          : null,
        factionTech: (f.factionTech || []).map((t) => techOut(techs.get(t), t, factionNames)),
        abilities: (f.abilities || []).map((a) => cardOut(abilities.get(a), a)),
        leaders: (f.leaders || []).map((l) => leaderOut(leaders.get(l), l, factionNames)),
        promissoryNotes: (f.promissoryNotes || []).map((n) => pnOut(notes.get(n), n, factionNames)),
        breakthrough: btByFaction.has(f.alias)
          ? { ...cardOut(btByFaction.get(f.alias), btByFaction.get(f.alias).alias), synergy: btByFaction.get(f.alias).synergy || [] }
          : null,
        units: (f.units || []).map((u) => unitOut(units.get(u), u, factionNames)),
        homeSystems: homeIds.map((id) => {
          const s = sysById.get(id.toLowerCase());
          return s ? { id: s.id, name: s.name, planets: s.planets, res: s.res, inf: s.inf, wormholes: s.wormholes } : { id, name: id };
        }),
        homePlanets: (f.homePlanets || []).slice(),
        setupNotes: FACTION_SETUP_NOTES[f.alias] || [],
        mapAffinity: FACTION_MAP_AFFINITY[f.alias] || [],
        conflictsWith: FACTION_CONFLICTS[f.alias] || [],
        selectableAtSetup: f.alias !== 'obsidian',
        sheetFront: f.factionSheetFrontImageURL || null,
        sheetBack: f.factionSheetBackImageURL || null,
        wiki: f.wikiURL || null,
      });
    }
  }
  out.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl'));
  return out;
}

/* ------------------------------------------------------------------ */
/*  3b. Katalog kart: technologie, weksle, liderzy, jednostki          */
/* ------------------------------------------------------------------ */

function loadCards(dir, files) {
  const out = [];
  for (const f of files) {
    const p = path.join(RES, 'data', dir, f);
    if (!fs.existsSync(p)) continue;
    for (const item of asArray(readJson(p))) if (item && typeof item === 'object') out.push(item);
  }
  return out;
}

function buildCards(factionNames) {
  // karty "keleres" należą do wszystkich trzech wariantów Rady Keleres
  const KELERES = ['keleresa', 'keleresm', 'keleresx'];
  const keleresLabel = 'The Council Keleres';
  const validFaction = (c) => !c.faction || factionNames.has(c.faction) || c.faction === 'keleres';
  const known = (c) => !!SOURCE_TO_EXPANSION[c.source] && validFaction(c);
  const fixName = (card) => {
    if (card.faction === 'keleres') card.factionName = keleresLabel;
    return card;
  };

  const technologies = loadCards('technologies', ['pok.json', 'te_techs.json', 'keleresplus.json'])
    .filter(known)
    .map((c) => fixName(techOut(c, c.alias, factionNames)));

  const leaders = loadCards('leaders', ['pok.json', 'te_leaders.json', 'keleresplus.json'])
    .filter(known)
    .map((c) => fixName(leaderOut(c, c.id, factionNames)));

  const promissoryNotes = loadCards('promissory_notes', ['promissory_notes.json', 'color.json', 'thunders_edge.json'])
    .filter(known)
    .map((c) => fixName(pnOut(c, c.alias, factionNames)));

  const units = loadCards('units', ['baseUnits.json', 'pok.json', 'keleres.json', 'te_units.json'])
    .filter(known)
    .filter((c) => !/^(lady|celagrom|nowarsun)$/.test(c.id || ''))
    .map((c) => fixName(unitOut(c, c.id, factionNames)));

  const breakthroughs = loadCards('breakthroughs', ['te_breakthroughs.json'])
    .filter(known)
    .map((c) => ({
      kind: 'breakthrough',
      id: c.alias, name: c.name, text: c.text || '',
      synergy: c.synergy || [], faction: c.faction || null,
      factionName: c.faction ? factionNames.get(c.faction) || c.faction : null,
      source: c.source, expansion: SOURCE_TO_EXPANSION[c.source],
    }));

  const abilities = loadCards('abilities', ['base.json', 'pok.json', 'te_abilities.json', 'keleresplus.json', 'other.json'])
    .filter((c) => c.faction && (factionNames.has(c.faction) || c.faction === 'keleres'))
    .map((c) => ({
      kind: 'ability', id: c.alias, name: c.name,
      faction: c.faction, factionName: factionNames.get(c.faction) || keleresLabel,
      text: cardOut(c, c.alias).text,
      source: c.source, expansion: SOURCE_TO_EXPANSION[c.source] || 'other',
    }));

  const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'pl');
  technologies.sort((a, b) => a.tier - b.tier || byName(a, b));
  [leaders, promissoryNotes, units, breakthroughs, abilities].forEach((x) => x.sort(byName));

  return { technologies, leaders, promissoryNotes, units, breakthroughs, abilities };
}

/* ------------------------------------------------------------------ */
/*  4. Układy planszy                                                  */
/* ------------------------------------------------------------------ */

/**
 * Pozycje w konwencji TI4: "000" = środek, "RNN" = pierścień R, pozycja NN
 * liczona od kafla na północy zgodnie z ruchem wskazówek zegara.
 */
const LAYOUTS = [
  {
    id: '1p_island',
    name: '1 gracz – "Island" (solo/nauka)',
    players: 1, official: false,
    credit: 'Układ społecznościowy (AsyncTI4 / BigAlCupAChino)',
    homes: ['310'],
    deal: { blue: 3, red: 2 },
    hyperlanes: {
      '101': '85a3', '102': '85a4', '103': '85a5', '105': '85a1', '106': '85a2',
      '201': '85a3', '202': '84a0', '203': '85a4', '204': '84a1', '205': '85a5', '206': '87a5',
      '209': '85a1', '210': '84a4', '211': '85a2', '212': '84a5',
      '301': '85a3', '302': '84a0', '303': '84a0', '304': '85a4', '305': '84a1', '306': '84a1',
      '307': '85a5', '308': '84a2', '312': '84a3', '313': '85a1', '314': '84a4', '315': '84a4',
      '316': '85a2', '317': '84a5', '318': '84a5',
    },
    slots: ['104', '207', '208', '309', '311'],
  },
  {
    id: '2p',
    name: '2 graczy – hiperpasy',
    players: 2, official: false,
    credit: 'Układ społecznościowy (AsyncTI4)',
    homes: ['301', '310'],
    deal: { blue: 3, red: 2 },
    hyperlanes: {
      '102': '85a4', '103': '85a5', '105': '85a1', '106': '85a2',
      '203': '85a4', '204': '84a1', '205': '85a5', '206': '87a5', '209': '85a1', '210': '84a4',
      '211': '85a2', '212': '87a2',
      '303': '84a0', '304': '85a4', '305': '84a1', '306': '84a1', '307': '85a5', '308': '84a2',
      '312': '84a3', '313': '85a1', '314': '84a4', '315': '84a4', '316': '85a2', '317': '84a5',
    },
    slots: ['101', '104', '201', '202', '207', '208', '302', '309', '311', '318'],
  },
  {
    id: '3p_compact',
    name: '3 graczy – z hiperpasami (wariant społecznościowy)',
    players: 3, official: false,
    credit: 'Wariant społecznościowy (AsyncTI4 / draft Milty). Instrukcja Krańca Burzy podaje układy z hiperpasami tylko dla 4 i 5 graczy',
    note: 'Hiperpasy skracają dystanse między graczami: losujesz tylko 5 kafli na gracza zamiast 8. Uwaga: ten układ wymaga aż 3 kompletów kafli hiperpasów (83A–88A), więc „na stole” złożysz go tylko z trzech pudełek – w wersji ekranowej działa bez ograniczeń.',
    homes: ['301', '307', '313'],
    deal: { blue: 3, red: 2 },
    hyperlanes: {
      '102': '86a4', '104': '86a0', '106': '86a2',
      '202': '88a4', '204': '87a4', '206': '88a0', '208': '87a0', '210': '88a2', '212': '87a2',
      '303': '83a4', '304': '85a4', '305': '84a4', '309': '83a0', '310': '85a0', '311': '84a0',
      '315': '83a2', '316': '85a2', '317': '84a2',
    },
    slots: ['101', '103', '105', '201', '203', '205', '207', '209', '211', '302', '306', '308', '312', '314', '318'],
  },
  {
    id: '4p_compact',
    name: '4 graczy – z hiperpasami (Kraniec Burzy)',
    players: 4, official: true,
    credit: 'Instrukcja Krańca Burzy, s. 7 („Setup Variations” → „Four-Player Setup”)',
    note: 'Hiperpasy „sklejają” galaktykę: losujesz 5 kafli na gracza zamiast 8, a odległości do sąsiadów są wyrównane. Ten układ wymaga też Proroctwa Królów: potrzeba 12 kafli hiperpasów, czyli 119A–124A z Krańca Burzy plus 83A–88A z Proroctwa Królów.',
    homes: ['304', '307', '313', '316'],
    deal: { blue: 3, red: 2 },
    hyperlanes: {
      '101': '86a3', '104': '86a0', '202': '87a3', '206': '88a0', '208': '87a0', '212': '88a3',
      '301': '85a3', '302': '84a3', '309': '83a0', '310': '85a0', '311': '84a0', '318': '83a3',
    },
    slots: [
      '102', '103', '105', '106',
      '201', '203', '204', '205', '207', '209', '210', '211',
      '303', '305', '306', '308', '312', '314', '315', '317',
    ],
  },
  {
    id: '3p',
    name: '3 graczy – układ oficjalny',
    players: 3, official: true,
    credit: 'Living Rules Reference 2.0, s. 6',
    homes: ['304', '310', '316'],
    deal: { blue: 6, red: 2 },
    slots: [
      '101', '102', '103', '104', '105', '106',
      '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212',
      '303', '305', '309', '311', '315', '317',
    ],
  },
  {
    id: '4p',
    name: '4 graczy – układ oficjalny',
    players: 4, official: true,
    credit: 'Living Rules Reference 2.0, s. 6',
    homes: ['305', '309', '314', '318'],
    deal: { blue: 5, red: 3 },
    slots: [
      '101', '102', '103', '104', '105', '106',
      '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212',
      '301', '302', '303', '304', '306', '307', '308', '310', '311', '312', '313', '315', '316', '317',
    ],
  },
  {
    id: '5p',
    name: '5 graczy – układ oficjalny (bez hiperpasów)',
    players: 5, official: true,
    credit: 'Living Rules Reference 2.0, s. 6',
    homes: ['304', '307', '310', '314', '318'],
    deal: { blue: 4, red: 2 },
    extra: { blue: 0, red: 1, note: 'Mówca dokłada 1 czerwony kafel obok Mecatol Rex.' },
    tradeGoods: { '304': 2, '307': 4, '310': 2 },
    slots: [
      '101', '102', '103', '104', '105', '106',
      '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212',
      '301', '302', '303', '305', '306', '308', '309', '311', '312', '313', '315', '316', '317',
    ],
  },
  {
    id: '5p_hyperlane',
    name: '5 graczy – z hiperpasami (układ oficjalny)',
    players: 5, official: true,
    credit: 'Living Rules Reference 2.0, s. 6; ten sam układ powtarza instrukcja Krańca Burzy, s. 7',
    note: 'Wystarczy jeden komplet hiperpasów: 83A–88A (Proroctwo Królów) albo 119A–124A (Kraniec Burzy). Uwaga: w wariancie z hiperpasami nie rozdaje się dóbr handlowych za gorszą pozycję startową.',
    homes: ['301', '304', '307', '313', '316'],
    deal: { blue: 3, red: 2 },
    hyperlanes: { '104': '86a0', '206': '88a0', '208': '87a0', '309': '83a0', '310': '85a0', '311': '84a0' },
    slots: [
      '101', '102', '103', '105', '106',
      '201', '202', '203', '204', '205', '207', '209', '210', '211', '212',
      '302', '303', '305', '306', '308', '312', '314', '315', '317', '318',
    ],
  },
  {
    id: '6p',
    name: '6 graczy – układ oficjalny',
    players: 6, official: true,
    credit: 'Living Rules Reference 2.0, s. 6',
    homes: ['301', '304', '307', '310', '313', '316'],
    deal: { blue: 3, red: 2 },
    slots: [
      '101', '102', '103', '104', '105', '106',
      '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212',
      '302', '303', '305', '306', '308', '309', '311', '312', '314', '315', '317', '318',
    ],
  },
  {
    id: '6p_large',
    name: '6 graczy – wielka galaktyka (4 pierścienie)',
    players: 6, official: true,
    credit: 'Living Rules Reference 2.0, s. 6',
    homes: ['401', '405', '409', '413', '417', '421'],
    deal: { blue: 6, red: 3 },
    slots: [
      '101', '102', '103', '104', '105', '106',
      '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212',
      '301', '302', '303', '304', '305', '306', '307', '308', '309', '310', '311', '312', '313', '314', '315', '316', '317', '318',
      '402', '403', '404', '406', '407', '408', '410', '411', '412', '414', '415', '416', '418', '419', '420', '422', '423', '424',
    ],
  },
];

/** Układy oficjalne mają być pierwsze w obrębie danej liczby graczy. */
function sortLayouts() {
  LAYOUTS.sort((a, b) => a.players - b.players || Number(b.official) - Number(a.official) || a.id.localeCompare(b.id));
}

function validateLayouts() {
  for (const L of LAYOUTS) {
    const need = L.players * (L.deal.blue + L.deal.red) + (L.extra?.blue || 0) + (L.extra?.red || 0);
    if (need !== L.slots.length) {
      throw new Error(`Układ ${L.id}: rozdanych kafli ${need} != gniazd ${L.slots.length}`);
    }
    const all = new Set([...L.homes, ...L.slots, ...Object.keys(L.hyperlanes || {}), '000']);
    if (all.size !== L.homes.length + L.slots.length + Object.keys(L.hyperlanes || {}).length + 1) {
      throw new Error(`Układ ${L.id}: zduplikowane pozycje`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

function main() {
  if (!fs.existsSync(RES)) {
    console.error(`Brak danych źródłowych: ${RES}\nUruchom najpierw:  npm run vendor`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const planets = buildPlanets();
  const systems = buildSystems(planets);
  const factions = buildFactions(systems);
  const factionNames = new Map(factions.map((f) => [f.id, f.displayName]));
  const cards = buildCards(factionNames);
  sortLayouts();
  validateLayouts();

  const pool = systems.filter((s) => s.inPool);
  const stats = {
    generatedAt: new Date().toISOString(),
    systems: systems.length,
    planets: planets.size,
    factions: factions.length,
    poolByExpansion: {},
  };
  for (const e of Object.keys(EXPANSIONS)) {
    stats.poolByExpansion[e] = {
      blue: pool.filter((s) => s.expansion === e && s.category === 'blue').length,
      red: pool.filter((s) => s.expansion === e && s.category === 'red').length,
      home: systems.filter((s) => s.expansion === e && s.category === 'home').length,
    };
  }

  write('systems.json', systems);
  write('planets.json', [...planets.values()]);
  write('factions.json', factions);
  write('cards.json', cards);
  write('layouts.json', LAYOUTS);
  write('meta.json', { expansions: EXPANSIONS, pl: PL, stats });

  console.log(`systemy: ${systems.length}  planety: ${planets.size}  frakcje: ${factions.length}  układy: ${LAYOUTS.length}`);
  console.log(`karty: ${cards.technologies.length} technologii, ${cards.leaders.length} liderów, `
    + `${cards.promissoryNotes.length} weksli, ${cards.units.length} jednostek, `
    + `${cards.breakthroughs.length} przełomów, ${cards.abilities.length} zdolności ras`);
  for (const [k, v] of Object.entries(stats.poolByExpansion)) {
    console.log(`  ${k.padEnd(6)} pula: ${v.blue} niebieskich, ${v.red} czerwonych, ${v.home} domów`);
  }
}

function write(name, data) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1));
}

main();

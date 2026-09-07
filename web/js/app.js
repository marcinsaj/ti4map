/**
 * Generator map TI4 – warstwa interfejsu.
 */
import { generate, describe, toMapString, FEATURES, buildPool, DEFAULT_WEIGHTS } from './generator.js';
import {
  renderMap, PLAYER_PALETTE, NEUTRAL_COLOR, MAP_LEGEND, housePath, drawPlanetIcon, ANOMALY_COLOR,
  RES_COLOR, INF_COLOR, SLASH_COLOR, drawAsteroidIcon,
} from './render.js';
import { $, $$, h, append, clear } from './dom.js';
import { initLibrary, showFactionInLibrary } from './library.js';

/* --------------------------------------------------------------- */
/*  Teksty i słowniki                                              */
/* --------------------------------------------------------------- */

const MODES = [
  {
    id: 'balanced', label: 'Zbalansowana',
    hint: 'Generator losuje kafle, a potem wielokrotnie zamienia je miejscami, żeby wyrównać wartość obszarów przypadających poszczególnym graczom. Trzyma się przy tym wszystkich twardych zasad rozkładania.',
  },
  {
    id: 'random', label: 'Losowa (zgodna z zasadami)',
    hint: 'Czysty los – nikt nie jest faworyzowany, ale generator poprawia rozstawienie tak, żeby nie łamało zasad (anomalie i tunele tego samego typu nie sąsiadują).',
  },
  {
    id: 'chaos', label: 'Chaos',
    hint: 'Kompletnie losowy rozkład bez żadnych korekt. Anomalie mogą leżeć obok siebie, obszary graczy mogą być bardzo nierówne.',
  },
];

const WEIGHT_FIELDS = [
  ['optTotal', 'Wartość obszaru (razem)',
    'Suma „wartości optymalnej” planet w obszarze gracza: z każdej planety liczymy zasoby albo wpływy – to, czego ma więcej (przy remisie po połowie). Najprostsza miara siły startu. Podnieś, jeśli chcesz po prostu, żeby każdy startował równie mocno. To kryterium jest domyślnie najważniejsze.'],
  ['optRes', 'Zasoby',
    'Sama „zasobowa” część wartości obszaru. Zasoby służą do produkcji jednostek i badania technologii. Podnieś, jeśli nie chcesz, by ktoś dostał obszar złożony głównie z planet wpływowych.'],
  ['optInf', 'Wpływy',
    'Sama „wpływowa” część wartości obszaru. Wpływy dają głosy w fazie agendy i żetony rozkazów. Podnieś, jeśli zależy Ci na równym dostępie do głosów.'],
  ['planets', 'Liczba planet',
    'Ile planet leży w obszarze gracza – niezależnie od ich wartości. Więcej planet to łatwiejsze cele typu „kontroluj N planet” i szybsza ekspansja.'],
  ['tech', 'Specjalizacje technologiczne',
    'Planety z symbolem specjalizacji (biotyczna, wojenna, napędowa, cybernetyczna) pozwalają pominąć wymaganie przy badaniu technologii. Podnieś, żeby nikt nie został bez takich „skrótów”.'],
  ['anomalies', 'Anomalie',
    'Supernowe, mgławice, pola asteroid i rozdarcia grawitacyjne. Utrudniają ruch i zabierają miejsce, które mogłaby zająć planeta. Podnieś, żeby nikt nie dostał obszaru zapchanego anomaliami.'],
  ['wormholes', 'Tunele czasoprzestrzenne',
    'Tunele skracają drogę przez galaktykę, ale też otwierają gracza na atak z drugiego końca mapy. Podnieś, żeby rozłożyć je równo między graczy.'],
  ['legendary', 'Planety legendarne',
    'Planety z dodatkową zdolnością (Primor, Hope’s End, Emelpar…). Są bardzo mocne – podnieś, żeby nie trafiły wszystkie do jednego gracza.'],
];

/** Gotowe zestawy wag. Liczy się wyłącznie stosunek wag do siebie, nie ich wysokość. */
const WEIGHT_PRESETS = [
  {
    id: 'zalecane', label: 'Zalecane',
    weights: { ...DEFAULT_WEIGHTS },
    hint: 'Ustawienie domyślne. Najmocniej pilnuje łącznej wartości obszaru, słabiej jej rozbicia na zasoby i wpływy, '
      + 'najsłabiej rzeczy, których i tak zwykle nie da się wyrównać co do sztuki (anomalie, tunele). '
      + 'W pomiarach: rozpiętość wartości razem ok. 0,5 punktu, zasoby i wpływy ok. 1,2.',
  },
  {
    id: 'porowno', label: 'Wszystko po 5',
    weights: Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 5])),
    hint: 'Każde kryterium tak samo ważne. Efekt nie jest zły, ale inny, niż się wydaje: łączna wartość obszarów wychodzi '
      + 'odrobinę gorzej (rozpiętość ok. 0,6 zamiast 0,5), a lepiej wyrównują się zasoby, wpływy i liczba planet (ok. 0,9–1,0 zamiast 1,2). '
      + 'Bierze się to stąd, że „wartość razem” jest sumą zasobów i wpływów – przy równych wagach to samo liczy się trzy razy, '
      + 'więc generator ciągnie w stronę wyrównywania składowych zamiast sumy. Dlatego domyślnie wagi nie są równe.',
  },
  {
    id: 'wartosc', label: 'Tylko wartość obszaru',
    weights: Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, k === 'optTotal' ? 10 : 0])),
    hint: 'Generator patrzy wyłącznie na łączną wartość obszarów. Wychodzi ona równo (rozpiętość ok. 0,5), ale zasoby i wpływy '
      + 'rozjeżdżają się średnio o 6 punktów: jeden gracz może dostać obszar niemal czysto zasobowy, a drugi czysto wpływowy.',
  },
  {
    id: 'drobiazgowe', label: 'Wyrównuj wszystko',
    weights: { optTotal: 10, optRes: 7, optInf: 7, planets: 6, tech: 6, anomalies: 4, wormholes: 4, legendary: 5 },
    hint: 'Mocno pilnuje także drobiazgów: liczby planet, specjalizacji technologicznych, anomalii i tuneli. '
      + 'W pomiarach wychodzi najrówniej ze wszystkich presetów (wartość razem ok. 0,4, anomalie ok. 0,4), ale generator ma tu '
      + 'najwięcej sprzecznych kryteriów do pogodzenia – warto podnieść dokładność optymalizacji.',
  },
  {
    id: 'zadnych', label: 'Wyłącz wszystkie',
    weights: Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map((k) => [k, 0])),
    hint: 'Wszystkie wagi na zero – generator pilnuje już tylko twardych zasad (anomalie i tunele nie sąsiadują), '
      + 'a poza tym nie próbuje niczego wyrównywać. Efekt taki jak w trybie „Losowa”.',
  },
];

/**
 * Liczby w opisach presetów to średnie rozpiętości z ośmiu map dla 6 graczy
 * (układ oficjalny, podstawka + Proroctwo Królów, 15 000 iteracji).
 */

/** Ile prób zamiany kafli wykonuje optymalizator. */
const ITERATION_LEVELS = [
  [5000, 'Szybko', '5 000 prób. Liczenie do pół sekundy. Rozpiętość wartości obszarów zwykle spada do ok. 1 punktu – w zupełności wystarczy do zwykłej partii.'],
  [15000, 'Standard', '15 000 prób. Około sekundy przy 6 graczach. Ustawienie domyślne: przy zalecanych wagach rozpiętość schodzi do 0–0,5 punktu, czyli praktycznie do zera.'],
  [40000, 'Dokładnie', '40 000 prób, 2–3 sekundy. Ma sens, gdy podniesiesz wiele wag naraz (preset „Wyrównuj wszystko”) – wtedy generator ma więcej sprzecznych kryteriów do pogodzenia.'],
  [100000, 'Maksymalnie', '100 000 prób, 5–8 sekund przy 6 graczach. Powyżej „Standardu” zysk jest zwykle kosmetyczny – używaj, gdy w tabeli kary widać rozpiętości, których nie chcesz zaakceptować.'],
];

/** Kolumny tabeli podsumowania pod mapą: klucz, nagłówek, wyjaśnienie. */
const STAT_COLUMNS = [
  ['seat', 'Gracz', 'Numer gracza i pozycja jego systemu domowego na planszy.'],
  ['faction', 'Rasa', 'Rasa wybrana dla tego gracza.'],
  ['optRes', 'Zasoby', 'Zasoby „optymalne” w obszarze gracza: z każdej planety liczymy zasoby, jeśli ma ich więcej niż wpływów (przy remisie połowę).'],
  ['optInf', 'Wpływy', 'Wpływy „optymalne” – liczone analogicznie do zasobów.'],
  ['optTotal', 'Wartość razem', 'Zasoby + wpływy optymalne. Najprostszy wskaźnik siły startu. Im mniejsza różnica między graczami, tym mapa równiejsza.'],
  ['planets', 'Planety', 'Liczba planet w obszarze gracza.'],
  ['tech', 'Spec. tech.', 'Liczba symboli specjalizacji technologicznej – skrótów przy badaniu technologii.'],
  ['anomalies', 'Anomalie', 'Liczba anomalii (supernowe, mgławice, asteroidy, rozdarcia) w obszarze gracza.'],
  ['wormholes', 'Tunele', 'Liczba tuneli czasoprzestrzennych w obszarze gracza.'],
  ['legendary', 'Legendarne', 'Liczba planet legendarnych w obszarze gracza.'],
  ['mecatol', 'Do Mecatolu', 'Ile skoków dzieli system domowy gracza od Mecatol Rex (z uwzględnieniem hiperpasów).'],
];

/** Kafel, który realnie ląduje na mapie w miejscu domu danej rasy. */
const HOME_TILE_OVERRIDE = {
  ghost: '17',     // Wrota Creuss; kafel 51 leży poza planszą
  crimson: '94',   // The Sorrow; kafel 118 trafia do pola gry
};

const RULES_DIGEST = [
  ['Podział kafli', 'Kafle systemów dzielimy według koloru rewersu: niebieskie (systemy z planetami) i czerwone (anomalie i pustka). Zielone rewersy to systemy domowe – nie biorą udziału w losowaniu.'],
  ['Rozdanie', 'Każdy gracz dostaje ustaloną liczbę kafli niebieskich i czerwonych, zależnie od liczby graczy i wybranego układu planszy (np. 6 graczy: 3 niebieskie + 2 czerwone).'],
  ['Kolejność', 'Pierścienie wokół Mecatol Rex zapełnia się od środka – kolejny pierścień dopiero po zapełnieniu poprzedniego.'],
  ['Anomalie', 'Kafle z anomaliami nie mogą leżeć obok siebie, chyba że nie ma innej możliwości. Puste systemy nie są anomaliami i mogą sąsiadować bez ograniczeń.'],
  ['Tunele', 'Kafle z tunelami tego samego typu nie mogą leżeć obok siebie, chyba że nie ma innej możliwości.'],
  ['Systemy domowe', 'Domy dołącza się do galaktyki na końcu, na pozycjach wyznaczonych przez układ planszy.'],
  ['Wormhole Nexus', 'Nexus (kafel 82) leży poza planszą – nie bierze udziału w losowaniu.'],
];

/* --------------------------------------------------------------- */

const S = {
  data: null,
  sysById: new Map(),
  planetById: new Map(),
  factionById: new Map(),
  customLayout: null,
  playerCount: 4,
  expansions: ['base', 'pok'],
  layoutId: '4p',
  mode: 'balanced',
  seed: '',
  players: [],
  rules: {
    anomaliesAdjacent: 'avoid',
    sameWormholeAdjacent: 'avoid',
    noAnomalyNextToMecatol: false,
    minBlueNextToHome: 1,
    maxAnomaliesNextToHome: -1,
    allowPlanetAnomalyNextToHome: false,
  },
  weights: { ...DEFAULT_WEIGHTS },
  iterations: 15000,
  disabledTiles: new Set(),
  extraTiles: new Set(),
  affinity: { enabled: false, maxDistance: 2, perFaction: {} },
  options: {
    showSlices: false, showNames: false, showParams: true,
    showAnomalies: true, showWormholes: true, showTraits: false, showTechs: true,
    showImages: true, showPositions: false, showTileIds: false,
  },
  seatDirection: 'cw',
  result: null,
  selected: null,
  seatPicking: null,
};

/** Tłumaczenie wartości słownikowych z danych źródłowych. */
const t = (dict, key) => S.data?.meta?.pl?.[dict]?.[key] || key;
const tList = (dict, arr) => (arr || []).map((x) => t(dict, x)).join(', ');

async function boot() {
  const [systems, planets, factions, layouts, meta, cards] = await Promise.all(
    ['systems', 'planets', 'factions', 'layouts', 'meta', 'cards'].map((n) => fetch(`data/${n}.json`).then((r) => r.json())),
  );
  S.data = { systems, planets, factions, layouts, meta, cards };
  S.sysById = new Map(systems.map((s) => [s.id, s]));
  S.planetById = new Map(planets.map((p) => [p.id, p]));
  S.factionById = new Map(factions.map((f) => [f.id, f]));

  buildTabs();
  buildGameTab();
  buildRulesTab();
  initLibrary({
    data: S.data,
    t, tList,
    featureLabel: (key) => FEATURES[key]?.label || key,
  });
  wireViewSwitch();
  setAppView('map');          // generator startuje zawsze na mapie
  setPlayerCount(S.playerCount);   // …i na najczęściej granym układzie: 4 graczy
  buildViewOptions();
  buildLegend();
  wireToolbar();
  generateNow();
}

/* ------------------------------ zakładki ------------------------ */

function buildTabs() {
  $$('#tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
}
function showTab(name) {
  $$('#tabs button').forEach((x) => x.classList.toggle('active', x.dataset.tab === name));
  $$('#sidebar .tab').forEach((s) => s.classList.toggle('hidden', s.dataset.tab !== name));
}

/* ------------------------------ zakładka: gra ------------------- */

/* Dopuszczalna liczba graczy. Dolna granica to trzech: ani podstawka, ani Proroctwo
   Królów, ani Kraniec Burzy nie podają planszy dla jednego czy dwóch graczy. */
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;
const PLAYER_COUNTS = [3, 4, 5, 6];

function buildGameTab() {
  const pc = $('#player-count');
  pc.textContent = '';
  // Trzech graczy to minimum: żadna instrukcja nie podaje planszy dla jednego ani dwóch.
  for (let i = MIN_PLAYERS; i <= MAX_PLAYERS; i++) {
    pc.append(h('button', { class: 'chip', 'data-n': i, onclick: () => setPlayerCount(i) }, String(i)));
  }

  const ex = $('#expansions');
  ex.textContent = '';
  for (const e of Object.values(S.data.meta.expansions)) {
    const st = S.data.meta.stats.poolByExpansion[e.id];
    const cb = h('input', { type: 'checkbox', checked: S.expansions.includes(e.id) });
    cb.addEventListener('change', () => {
      S.expansions = Object.values(S.data.meta.expansions)
        .filter((x) => $(`#expansions [data-exp="${x.id}"] input`).checked).map((x) => x.id);
      // setPlayerCount w środku przebuduje listę graczy i zakładkę kafli
      syncLayoutChoices(); refreshPoolInfo();
    });
    ex.append(h('label', { class: 'row', 'data-exp': e.id }, cb,
      h('span', {}, e.name),
      h('em', { class: 'muted' }, `${st.blue} nieb. · ${st.red} czerw. · ${st.home} domów`)));
  }

  const md = $('#mode');
  md.textContent = '';
  for (const m of MODES) {
    md.append(h('button', { class: 'chip', 'data-mode': m.id, onclick: () => { S.mode = m.id; syncModeUI(); } }, m.label));
  }

  const pr = $('#weight-presets');
  pr.textContent = '';
  for (const p of WEIGHT_PRESETS) {
    pr.append(h('button', {
      class: 'chip', 'data-preset': p.id, title: p.hint,
      onclick: () => { S.weights = { ...p.weights }; syncWeightsUI(); $('#preset-info').textContent = p.hint; },
    }, p.label));
  }
  pr.after(h('p', { id: 'preset-info', class: 'hint' }, WEIGHT_PRESETS[0].hint));

  const wr = $('#weights');
  wr.textContent = '';
  for (const [key, label, desc] of WEIGHT_FIELDS) {
    const input = h('input', { type: 'range', min: 0, max: 10, step: 1, 'data-weight': key, value: S.weights[key] });
    const out = h('output', { 'data-weight': key }, String(S.weights[key]));
    input.addEventListener('input', () => {
      S.weights[key] = Number(input.value);
      out.textContent = input.value;
      syncPresetChips();
    });
    wr.append(h('div', { class: 'weight' },
      h('label', { class: 'row' }, h('span', {}, label), input, out),
      h('p', { class: 'wdesc' }, desc)));
  }

  const it = $('#iterations');
  it.textContent = '';
  for (const [value, label] of ITERATION_LEVELS) {
    it.append(h('button', {
      class: 'chip', 'data-iter': value,
      onclick: () => { S.iterations = value; syncIterationsUI(); },
    }, label));
  }
  syncIterationsUI();
  syncPresetChips();

  $('#layout').addEventListener('change', (e) => { S.layoutId = e.target.value; buildPlayers(); syncLayoutInfo(); });
  syncModeUI();
}

/** Ustawia suwaki wag zgodnie ze stanem (po wybraniu presetu). */
function syncWeightsUI() {
  for (const [key] of WEIGHT_FIELDS) {
    const input = $(`#weights input[data-weight="${key}"]`);
    const out = $(`#weights output[data-weight="${key}"]`);
    if (input) input.value = S.weights[key];
    if (out) out.textContent = String(S.weights[key]);
  }
  syncPresetChips();
}

/** Podświetla preset, jeśli aktualne wagi dokładnie mu odpowiadają. */
function syncPresetChips() {
  const same = (a, b) => Object.keys(DEFAULT_WEIGHTS).every((k) => Number(a[k] || 0) === Number(b[k] || 0));
  $$('#weight-presets .chip').forEach((b) => {
    const p = WEIGHT_PRESETS.find((x) => x.id === b.dataset.preset);
    b.classList.toggle('active', !!p && same(p.weights, S.weights));
  });
}

function syncIterationsUI() {
  $$('#iterations .chip').forEach((b) => b.classList.toggle('active', Number(b.dataset.iter) === S.iterations));
  $('#iterations-info').textContent = ITERATION_LEVELS.find(([v]) => v === S.iterations)?.[2] || '';
}

function syncModeUI() {
  $$('#mode .chip').forEach((b) => b.classList.toggle('active', b.dataset.mode === S.mode));
  $('#mode-info').textContent = MODES.find((m) => m.id === S.mode)?.hint || '';
  const off = S.mode !== 'balanced';
  for (const sel of ['#weights', '#weight-presets', '#iterations']) $(sel)?.classList.toggle('disabled', off);
}

function allLayouts() {
  return S.customLayout ? [...S.data.layouts, S.customLayout] : S.data.layouts;
}
/**
 * Czy włączone dodatki wystarczą, żeby ten układ złożyć. Układ wczytany z pliku
 * (`S.customLayout`) nie ma pola `requires` – kafle przyszły razem z zapisem.
 */
function layoutAvailable(L) {
  return (L.requires || []).every((id) => S.expansions.includes(id));
}

/** Nazwy dodatków, których brakuje do tego układu – do podpowiedzi dla użytkownika. */
function layoutMissing(L) {
  return (L.requires || []).filter((id) => !S.expansions.includes(id))
    .map((id) => S.data.meta.expansions[id].name);
}

/** Układy dla danej liczby graczy, tylko te możliwe przy obecnych dodatkach. */
function layoutsForCount(n) {
  const all = allLayouts().filter((l) => l.players === n && layoutAvailable(l));
  return all.length ? all : allLayouts().filter((l) => l.players === n);
}

/**
 * Nazwy dodatków, bez których dla tej liczby graczy nie ma ani jednego układu.
 * Pusta lista = liczbę graczy da się wybrać.
 */
function countMissing(n) {
  const all = allLayouts().filter((l) => l.players === n);
  if (!all.length || all.some(layoutAvailable)) return [];
  return [...new Set(all.flatMap(layoutMissing))];
}

/** Blokuje liczby graczy, dla których żaden układ nie jest dostępny, i mówi dlaczego. */
function syncPlayerCountChips() {
  $$('#player-count .chip').forEach((b) => {
    const n = Number(b.dataset.n);
    const missing = countMissing(n);
    b.disabled = missing.length > 0;
    b.title = missing.length
      ? `Dla ${n} ${odmiana(n, 'gracza', 'graczy', 'graczy')} nie ma układu`
        + ` bez ${missing.length > 1 ? 'dodatków' : 'dodatku'}: ${missing.join(', ')}.`
      : `Ustaw ${n} ${odmiana(n, 'gracza', 'graczy', 'graczy')} na planszy.`;
    b.classList.toggle('active', n === S.playerCount);
  });
}

/**
 * Po zmianie zestawu dodatków: przebudowuje listę układów i – jeśli trzeba – przenosi
 * na liczbę graczy, dla której w ogóle jakiś układ został.
 */
function syncLayoutChoices() {
  let n = S.playerCount;
  if (countMissing(n).length) {
    const opts = PLAYER_COUNTS.filter((x) => !countMissing(x).length);
    n = opts.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best), opts[0]);
  }
  setPlayerCount(n);
}

function setPlayerCount(n) {
  S.playerCount = n;
  syncPlayerCountChips();
  const opts = layoutsForCount(n);
  const sel = $('#layout');
  sel.textContent = '';
  for (const l of opts) sel.append(h('option', { value: l.id }, l.name));
  if (!opts.some((l) => l.id === S.layoutId)) S.layoutId = opts[0].id;
  sel.value = S.layoutId;
  syncLayoutInfo();
  buildPlayers();
  buildTilesTab();
}

function currentLayout() {
  return allLayouts().find((l) => l.id === S.layoutId) || S.data.layouts[0];
}

function layoutNeed(L) {
  return L.totals
    ? { blue: L.totals.blue, red: L.totals.red }
    : { blue: L.players * L.deal.blue + (L.extra?.blue || 0), red: L.players * L.deal.red + (L.extra?.red || 0) };
}

function syncLayoutInfo() {
  const L = currentLayout();
  const need = layoutNeed(L);
  const parts = [
    `${L.official ? 'Układ oficjalny' : 'Układ nieoficjalny'} – ${L.credit}.`,
    L.totals
      ? `Do wylosowania: ${need.blue} kafli niebieskich i ${need.red} czerwonych na ${L.slots.length} miejsc.`
      : `Rozdanie: ${L.deal.blue} niebieskich + ${L.deal.red} czerwonych na gracza, razem ${need.blue + need.red} kafli.`,
  ];
  if (L.requires?.length) {
    parts.push(`Wymaga ${L.requires.length > 1 ? 'dodatków' : 'dodatku'}: `
      + `${L.requires.map((id) => S.data.meta.expansions[id].name).join(' i ')}.`);
  }
  if (L.extra?.note) parts.push(L.extra.note);
  const hlCount = Object.keys(L.hyperlanes || {}).length;
  if (hlCount) parts.push(`Hiperpasy ustawione z góry: ${hlCount} kafli – skracają dystanse i zmniejszają liczbę losowanych kafli.`);
  if (L.tradeGoods) {
    parts.push(`Rekompensata w dobrach handlowych: ${Object.entries(L.tradeGoods).map(([p, v]) => `pozycja ${p} +${v}`).join(', ')}.`);
  }
  if (L.note) parts.push(L.note);
  $('#layout-info').textContent = parts.join(' ');
  refreshPoolInfo();
}

function refreshPoolInfo() {
  const L = currentLayout();
  const pool = buildPool(S.data.systems, { expansions: S.expansions, disabledTiles: S.disabledTiles, extraTiles: S.extraTiles });
  const need = layoutNeed(L);
  const warn = pool.blue.length < need.blue || pool.red.length < need.red;
  const node = $('#pool-info') || h('p', { id: 'pool-info', class: 'hint' });
  node.className = 'hint' + (warn ? ' warn' : '');
  node.textContent = `Dostępna pula: ${pool.blue.length} kafli niebieskich i ${pool.red.length} czerwonych. Ten układ potrzebuje ${need.blue} i ${need.red}.`;
  $('#layout-info').after(node);
}

/* ------------------------------ zakładka: gracze ---------------- */

function homeTileFor(faction) {
  if (!faction) return null;
  return HOME_TILE_OVERRIDE[faction.id] || faction.homeSystems?.[0]?.id || null;
}

const factionLabel = (f) => f.displayName || f.name;

function selectableFactions() {
  return S.data.factions.filter((f) => S.expansions.includes(f.expansion) && f.selectableAtSetup);
}

/* ---------- kolejność graczy dookoła planszy ---------- */

const SEAT_DIRECTIONS = [
  ['cw', 'zgodnie z zegarem',
    'Gracz 2 siada w gnieździe na prawo od gracza 1, gracz 3 dalej w prawo i tak dookoła. '
    + 'Tak samo numerowane są pozycje na planszy.'],
  ['ccw', 'przeciwnie do zegara',
    'Gracz 2 siada w gnieździe na lewo od gracza 1, gracz 3 dalej w lewo i tak dookoła. '
    + 'Wybierz, jeśli tak siedzicie przy stole.'],
];

/**
 * Strzałka po okręgu pokazująca kierunek numerowania gniazd.
 *
 * W SVG oś Y rośnie w dół, więc rosnący kąt to na ekranie ruch ZGODNY z zegarem
 * (`sweep-flag = 1`). Rysujemy łuk kończący się na górze okręgu i dopiero TAM stawiamy
 * grot – grot musi leżeć na końcu drogi, bo oko wodzi po łuku w jego stronę. Poprzednia
 * wersja miała grot na początku łuku i przez to czytała się odwrotnie.
 *
 * Grot na górze okręgu wskazujący w PRAWO to jednoznaczny znak ruchu zgodnego z zegarem;
 * wariant przeciwny powstaje przez odbicie w poziomie, więc grot pokazuje w lewo.
 *
 * Kolejność podpowiadają trzy kropki rosnące wzdłuż łuku – od najmniejszej (gracz 1)
 * do największej tuż przed grotem.
 */
function dirIcon(ccw) {
  const svg = svgEl('svg', { viewBox: '0 0 26 26', width: 22, height: 22, 'aria-hidden': 'true' });
  const g = svgEl('g', ccw ? { transform: 'translate(26,0) scale(-1,1)' } : {});
  const C = 13;
  const R = 8;
  const at = (deg, r = R) => [
    C + r * Math.cos((deg * Math.PI) / 180),
    C + r * Math.sin((deg * Math.PI) / 180),
  ];
  const f = (n) => n.toFixed(2);

  // Łuk: od prawej strony (–10°) zgodnie z zegarem aż na samą górę (–90°), czyli 280°.
  const [sx, sy] = at(-10);
  const [ex, ey] = at(-90);
  g.append(svgEl('path', {
    d: `M${f(sx)} ${f(sy)}A${R} ${R} 0 1 1 ${f(ex)} ${f(ey)}`,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round',
  }));

  // Grot na końcu drogi – czubek w prawo, bo taki jest kierunek ruchu na szczycie okręgu.
  g.append(svgEl('path', {
    d: `M${f(ex - 1.4)} ${f(ey - 3.1)}L${f(ex + 3.6)} ${f(ey)}L${f(ex - 1.4)} ${f(ey + 3.1)}Z`,
    fill: 'currentColor',
  }));

  // Kolejność: trzy kropki wewnątrz okręgu, rosnące w stronę grotu – „najpierw ten,
  // potem ten, potem ten”. Na samym łuku ginęłyby pod grubością kreski, więc idą niżej.
  [[35, 0.85], [125, 1.2], [215, 1.55]].forEach(([deg, r]) => {
    const [x, y] = at(deg, 4.4);
    g.append(svgEl('circle', { cx: f(x), cy: f(y), r: f(r), fill: 'currentColor' }));
  });

  svg.append(g);
  return svg;
}

/**
 * Sadza wszystkich graczy dookoła planszy tak, żeby gracz `anchorIdx` trafił do gniazda `pos`.
 * Gniazda w układzie są wypisane w kolejności obchodzenia pierścienia, więc „dookoła”
 * to po prostu kolejne pozycje z tej listy, w wybranym kierunku.
 */
function seatPlayersAround(anchorIdx, pos) {
  const homes = currentLayout().homes;
  const m = homes.length;
  const k = homes.indexOf(pos);
  if (k < 0 || !m) return false;
  const step = S.seatDirection === 'cw' ? 1 : -1;
  S.players.forEach((p, i) => {
    p.homePos = homes[(((k + (i - anchorIdx) * step) % m) + m) % m];
  });
  return true;
}

/** Zamiana numerów dwóch graczy: rasa i barwa wędrują razem z graczem, gniazda zostają. */
function swapPlayerNumbers(i, j) {
  if (i === j || !S.players[i] || !S.players[j]) return;
  const a = S.players[i];
  const b = S.players[j];
  [a.factionId, b.factionId] = [b.factionId, a.factionId];
  [a.colorId, b.colorId] = [b.colorId, a.colorId];
}

/** Lista gniazd, kierunek i zdanie mówiące, kto gdzie ostatecznie usiadł. */
function syncOrderUI() {
  const homes = currentLayout().homes;
  const sel = $('#first-seat');
  if (sel) {
    sel.textContent = '';
    for (const pos of homes) sel.append(h('option', { value: pos }, `pozycja ${pos}`));
    sel.value = S.players[0]?.homePos || homes[0];
  }
  const dir = $('#seat-direction');
  if (dir && !dir.children.length) {
    for (const [id, label, hint] of SEAT_DIRECTIONS) {
      const btn = h('button', {
        class: 'chip dirchip', 'data-dir': id, 'aria-label': label, title: `${label} – ${hint}`,
        onclick: () => {
          S.seatDirection = id;
          seatPlayersAround(0, S.players[0].homePos);
          buildPlayers();
          generateNow();
        },
      });
      // Sama ikona nie wystarczała – bez podpisu nie było wiadomo, co przycisk robi.
      btn.append(dirIcon(id === 'ccw'), h('span', {}, label));
      dir.append(btn);
    }
  }
  $$('#seat-direction .chip').forEach((b) => b.classList.toggle('active', b.dataset.dir === S.seatDirection));

  const pick = $('#btn-first-seat');
  if (pick) {
    const on = S.seatPicking === 0;
    pick.classList.toggle('picking', on);
    pick.textContent = on ? 'kliknij gniazdo na mapie…' : 'Wskaż na mapie gniazdo gracza 1';
  }

  const info = $('#order-info');
  if (info) {
    info.textContent = `Gracz 1 siedzi w gnieździe ${S.players[0]?.homePos || '—'}. Dalej `
      + `${SEAT_DIRECTIONS.find(([d]) => d === S.seatDirection)[1]}: `
      + S.players.map((p, i) => `${i + 1} → ${p.homePos}`).join(', ') + '.';
  }
}

/* ---------- barwy systemów domowych ---------- */

/** Barwa z palety po identyfikatorze zapisu (np. „czerwony”). */
const paletteById = (id) => PLAYER_PALETTE.find((c) => c.id === id) || null;

/** Ilu graczy nie ma jeszcze przypisanej barwy. */
const playersWithoutColor = () => S.players.filter((p) => !p.colorId).length;

/**
 * „Wyczyść” z dołu zakładki „Gracze”: kasuje wszystko, co da się w niej ustawić.
 * Ustawienia z pozostałych zakładek (dodatki, typ mapy, wagi, kafle) zostają nietknięte.
 */
function clearPlayersTab() {
  S.players.forEach((p) => { p.factionId = null; p.colorId = null; });
  S.seatDirection = 'cw';
  S.seatPicking = null;
  S.affinity = { enabled: false, maxDistance: 2, perFaction: {} };
  setPlayerCount(4);                       // przebudowuje listę graczy i typ mapy
  seatPlayersAround(0, currentLayout().homes[0]);
  buildPlayers();
  generateNow();
}

/** Buduje rządek próbek barw dla jednego gracza. Barwa zajęta przez kogoś innego jest zablokowana. */
function colorPicker(p, i) {
  const row = h('div', { class: 'colorpick' });
  for (const c of PLAYER_PALETTE) {
    const takenBy = S.players.findIndex((q, j) => j !== i && q.colorId === c.id);
    const mine = p.colorId === c.id;
    row.append(h('button', {
      class: 'cswatch' + (mine ? ' active' : ''),
      style: `background:${c.hex}`,
      disabled: takenBy >= 0,
      title: takenBy >= 0
        ? `${c.name} – zajęty przez gracza ${takenBy + 1}`
        : mine ? `${c.name} (wybrany) – kliknij, żeby zdjąć` : `ustaw barwę: ${c.name}`,
      onclick: () => { p.colorId = mine ? null : c.id; onColorsChanged(); },
    }));
  }
  if (p.colorId) {
    row.append(h('button', {
      class: 'cswatch clear', title: 'Zdejmij barwę – dom wróci do szarego',
      onclick: () => { p.colorId = null; onColorsChanged(); },
    }, 'bez barwy'));
  }
  return row;
}

/** Po każdej zmianie barw: odśwież listę graczy, mapę i ostrzeżenie – bez losowania mapy od nowa. */
function onColorsChanged() {
  buildPlayers();
  if (S.result) {
    S.result.players = currentPlayers();
    showReport();
  }
  scheduleRender();
}

/** Odmiana rzeczownika przez liczbę: 1 system / 2–4 systemy / 5+ systemów. */
function odmiana(n, poj, malo, duzo) {
  const d = n % 10;
  const s = n % 100;
  if (n === 1) return poj;
  if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return malo;
  return duzo;
}

/** Komunikat „ile domów jest jeszcze szarych” – w zakładce Gracze i w pasku nad mapą. */
function syncColorStatus() {
  const missing = playersWithoutColor();
  const n = S.players.length;
  const status = $('#colors-status');
  if (status) {
    status.className = missing ? 'hint warn' : 'hint';
    status.textContent = missing
      ? `Bez barwy: ${missing} z ${n}. Te domy są na mapie szare`
        + ' – wybierz im kolory, zanim wygenerujesz mapę.'
      : n === 1
        ? 'System domowy ma przypisaną barwę.'
        : `Wszystkie ${n} ${odmiana(n, '', 'systemy domowe mają', 'systemów domowych ma')} przypisaną barwę.`;
  }
}

function buildPlayers() {
  const L = currentLayout();
  while (S.players.length < L.homes.length) {
    S.players.push({ colorId: null, factionId: null, homePos: null });
  }
  S.players.length = L.homes.length;
  // zachowaj pozycje, które nadal istnieją w tym układzie; resztę uzupełnij wolnymi gniazdami
  const used = new Set();
  S.players.forEach((p) => {
    if (L.homes.includes(p.homePos) && !used.has(p.homePos)) used.add(p.homePos);
    else p.homePos = null;
  });
  const free = L.homes.filter((x) => !used.has(x));
  S.players.forEach((p) => {
    if (!p.homePos) p.homePos = free.shift();
  });
  // ta sama barwa u dwóch graczy nie ma sensu – młodszy numer zachowuje wybór
  const seen = new Set();
  S.players.forEach((p) => {
    if (!p.colorId) return;
    if (seen.has(p.colorId)) p.colorId = null; else seen.add(p.colorId);
  });

  const root = $('#players');
  root.textContent = '';
  const pool = selectableFactions();
  S.players.forEach((p, i) => {
    const sel = h('select', {
      // Rasa decyduje o tym, jaki kafel leży w domu gracza, więc mapę trzeba złożyć od nowa.
      // Ziarno się nie zmienia, więc reszta planszy zostaje dokładnie taka sama.
      onchange: (e) => { p.factionId = e.target.value || null; buildPlayers(); generateNow(); },
    }, h('option', { value: '' }, '— wybierz rasę —'));
    for (const f of pool) {
      const taken = S.players.some((q, j) => j !== i && q.factionId === f.id);
      const conflict = S.players.some((q, j) => j !== i && q.factionId && f.conflictsWith.includes(q.factionId));
      sel.append(h('option', { value: f.id, disabled: taken || conflict },
        `${factionLabel(f)}${taken ? ' (zajęta)' : conflict ? ' (konflikt z inną rasą)' : ''} · ${S.data.meta.expansions[f.expansion].short}`));
    }
    sel.value = p.factionId || '';

    // Gniazda nie wybiera się już po jednym – wynikają z pozycji gracza 1 i kierunku.
    const seatInfo = h('div', { class: 'pnote' }, `dom: pozycja ${p.homePos || '—'}`);

    const numSel = h('select', {
      class: 'numsel',
      title: 'Zmiana numeru zamienia tego gracza miejscami z graczem o wybranym numerze',
      onchange: (e) => {
        swapPlayerNumbers(i, Number(e.target.value) - 1);
        buildPlayers();
        generateNow();
      },
    }, ...S.players.map((_, j) => h('option', { value: j + 1 }, `nr ${j + 1}`)));
    numSel.value = String(i + 1);

    const f = S.factionById.get(p.factionId);
    const c = paletteById(p.colorId);
    append(root, h('div', { class: 'player' + (c ? '' : ' nocolor') },
      h('div', { class: 'phead' },
        h('span', { class: 'swatch' + (c ? '' : ' none'), style: c ? `background:${c.hex}` : null }),
        h('strong', {}, `Gracz ${i + 1}`),
        h('span', { class: 'cname' }, c ? c.name : 'bez barwy – dom szary'),
        numSel),
      colorPicker(p, i),
      sel, seatInfo,
      f ? h('div', { class: 'pnote' }, `Na mapie leży kafel ${homeTileFor(f)} – ${S.sysById.get(homeTileFor(f))?.name || '?'}`) : null,
      f ? h('button', { class: 'linkish', onclick: () => openFaction(f.id) }, 'pokaż wszystko o tej rasie →') : null,
      ...(f?.setupNotes || []).map((n) => h('div', { class: 'pnote warn' }, n)),
    ));
  });
  syncColorStatus();
  syncOrderUI();
  buildAffinityList();
  if (S.options.showSlices) buildLegend();   // barwy i udziały zależą od ras i barw graczy
}

function buildAffinityList() {
  $('#affinity-enabled').checked = S.affinity.enabled;
  $('#affinity-distance').value = S.affinity.maxDistance;
  const root = $('#affinity-list');
  root.textContent = '';
  const active = S.players.map((p) => S.factionById.get(p.factionId)).filter((f) => f && f.mapAffinity.length);
  if (!active.length) { root.append(h('p', { class: 'hint' }, 'Żadna z wybranych ras nie ma zdolności zależnych od typu kafla.')); return; }
  for (const f of active) {
    const cb = h('input', { type: 'checkbox', checked: S.affinity.perFaction[f.id] !== false });
    cb.addEventListener('change', () => { S.affinity.perFaction[f.id] = cb.checked; });
    root.append(h('div', { class: 'aff' },
      h('label', { class: 'row' }, cb, h('strong', {}, factionLabel(f))),
      ...f.mapAffinity.map((a) => h('div', { class: 'pnote' },
        `potrzebuje: ${FEATURES[a.feature]?.label || a.feature} (${a.need === 'nearby' ? 'blisko domu' : a.need === 'home' ? 'ma we własnym domu' : 'gdziekolwiek na mapie'}) — ${a.why}`)),
    ));
  }
}

/* ------------------------------ zakładka: zasady ---------------- */

function buildRulesTab() {
  const root = $('#rules');
  root.textContent = '';
  const toggle = (key, label, hint) => {
    const cb = h('input', { type: 'checkbox', checked: S.rules[key] === 'avoid' || S.rules[key] === true });
    cb.addEventListener('change', () => {
      S.rules[key] = typeof S.rules[key] === 'string' ? (cb.checked ? 'avoid' : 'allow') : cb.checked;
    });
    root.append(h('div', { class: 'weight' },
      h('label', { class: 'row' }, cb, h('span', {}, label)),
      h('p', { class: 'wdesc' }, hint)));
  };
  toggle('anomaliesAdjacent', 'Anomalie nie mogą sąsiadować',
    'Zasada oficjalna: kafle z anomaliami nie mogą stykać się bokami. Puste systemy nie są anomaliami i mogą leżeć obok siebie.');
  toggle('sameWormholeAdjacent', 'Tunele tego samego typu nie mogą sąsiadować',
    'Zasada oficjalna: dwa tunele alfa (albo dwa beta itd.) nie mogą stykać się bokami – taka para byłaby bezużyteczna.');
  toggle('noAnomalyNextToMecatol', 'Brak anomalii w pierścieniu przy Mecatol Rex',
    'Wariant turniejowy, spoza zasad: pilnuje, żeby droga do Mecatol Rex nie była zablokowana anomalią.');

  const num = (key, label, min, max, hint) => {
    const inp = h('input', { type: 'number', min, max, value: S.rules[key] });
    inp.addEventListener('change', () => { S.rules[key] = Number(inp.value); });
    root.append(h('div', { class: 'weight' },
      h('label', { class: 'row' }, h('span', {}, label), inp),
      h('p', { class: 'wdesc' }, hint)));
  };
  num('minBlueNextToHome', 'Minimum kafli niebieskich przy domu', 0, 3,
    'Ile systemów z planetami musi bezpośrednio sąsiadować z domem gracza. Zabezpiecza przed startem otoczonym samą pustką.');
  num('maxAnomaliesNextToHome', 'Maksimum anomalii przy domu', -1, 4,
    'Ile anomalii wolno postawić bezpośrednio przy domu gracza. Wartość −1 oznacza brak limitu. '
    + 'Jeśli limitu nie da się pogodzić z zasadą „anomalie nie mogą sąsiadować”, generator wybiera '
    + 'mniejsze zło i wypisuje to w podsumowaniu pod mapą.');
  toggle('allowPlanetAnomalyNextToHome', 'Anomalia z planetą może stać przy domu',
    'Część anomalii ma planety – Cormund, Everra, Industrex, Lemox, The Watchtower. Taki kafel jest '
    + 'dla gracza raczej zyskiem niż przeszkodą, więc po zaznaczeniu tej opcji nie wlicza się '
    + 'do limitu powyżej. Anomalie bez planet (supernowe, gołe pola asteroid, mgławice) limit '
    + 'obowiązuje dalej.');

  const dg = $('#rules-digest');
  dg.textContent = '';
  for (const [title, desc] of RULES_DIGEST) dg.append(h('div', { class: 'digest-item' }, h('strong', {}, title), h('p', {}, desc)));
}

/* ------------------------------ zakładka: kafle ----------------- */

const TAG_LABEL = {
  anomaly: '', supernova: '☀ supernowa', nebula: '☁ mgławica', asteroid_field: '⁘ asteroidy',
  gravity_rift: '◉ rozdarcie', entropic_scar: '⌁ blizna', fracture: '✷ Fracture',
  wormhole: '', wh_alpha: 'tunel α', wh_beta: 'tunel β', wh_gamma: 'tunel γ', wh_delta: 'tunel δ', wh_epsilon: 'tunel ε',
  legendary: '★ legendarna', tech_specialty: '⚙ spec. tech.', space_station: '⌂ stacja', empty: 'pustka', multi_planet: '',
};
const tileTagLabels = (s) => s.tags.map((x) => TAG_LABEL[x] ?? x).filter(Boolean);

function buildTilesTab() {
  const root = $('#tile-groups');
  root.textContent = '';
  const q = ($('#tile-search').value || '').toLowerCase();

  const inPool = S.data.systems.filter((s) => s.inPool && S.expansions.includes(s.expansion));
  const specials = S.data.systems.filter((s) => s.excluded && S.expansions.includes(s.expansion));

  const groups = [];
  for (const expId of S.expansions) {
    const exp = S.data.meta.expansions[expId];
    for (const cat of ['blue', 'red']) {
      const items = inPool.filter((s) => s.expansion === expId && s.category === cat);
      if (items.length) groups.push({ title: `${exp.name} – kafle ${cat === 'blue' ? 'niebieskie' : 'czerwone'}`, items, kind: 'pool' });
    }
  }
  if (specials.length) groups.push({ title: 'Kafle specjalne – normalnie poza losowaniem', items: specials, kind: 'special' });

  for (const g of groups) {
    const items = g.items.filter((s) => tileMatches(s, q));
    if (!items.length) continue;
    const body = h('div', { class: 'tile-list' });
    for (const s of items) {
      const isSpecial = g.kind === 'special';
      const checked = isSpecial ? S.extraTiles.has(s.id) : !S.disabledTiles.has(s.id);
      const cb = h('input', { type: 'checkbox', checked });
      cb.addEventListener('change', () => {
        if (isSpecial) { cb.checked ? S.extraTiles.add(s.id) : S.extraTiles.delete(s.id); }
        else { cb.checked ? S.disabledTiles.delete(s.id) : S.disabledTiles.add(s.id); }
        refreshPoolInfo();
      });
      const peek = h('button', {
        class: 'tpeek', title: `Pokaż kafel ${s.id} (${s.name}) w panelu po prawej`,
        onclick: (e) => { e.preventDefault(); showTilePreview(s.id); },
      }, 'Podgląd');
      // czerwona kropka = kafel z anomalią, tak jak czerwone narożniki na mapie
      const anom = s.anomalies.length
        ? h('span', { class: 'adot', title: `anomalia: ${tList('anomalies', s.anomalies)}` })
        : h('span', { class: 'adot none' });
      body.append(h('label', { class: 'trow', title: isSpecial ? s.excluded.why : tileTooltip(s) },
        cb,
        anom,
        h('code', {}, s.id),
        h('span', { class: 'tname' }, s.name),
        h('span', { class: 'tval' }, s.planets.length ? `${s.res}/${s.inf}` : ''),
        h('span', { class: 'ttags' }, tileTagLabels(s).join(' ')),
        peek,
      ));
    }
    root.append(h('details', { open: true }, h('summary', {}, g.title, h('em', { class: 'muted' }, ` (${items.length})`)), body));
  }
}

function tileTooltip(s) {
  const bits = [t('categories', s.category)];
  if (s.planets.length) bits.push(`planety: ${s.planets.map((p) => S.planetById.get(p)?.name).join(', ')}`);
  if (s.anomalies.length) bits.push(`anomalie: ${tList('anomalies', s.anomalies)}`);
  if (s.wormholes.length) bits.push(`tunele: ${tList('wormholes', s.wormholes)}`);
  bits.push(`zasoby/wpływy: ${s.res}/${s.inf}`);
  return bits.join(' · ');
}

function tileMatches(s, q) {
  if (!q) return true;
  const names = s.planets.map((p) => S.planetById.get(p)?.name || '').join(' ');
  const tags = s.tags.map((x) => `${x} ${t('anomalies', x)} ${TAG_LABEL[x] || ''}`).join(' ');
  return (`${s.id} ${s.name} ${names} ${tags}`).toLowerCase().includes(q);
}

/* ------------------------------ widok: mapa / biblioteka -------- */

function wireViewSwitch() {
  $$('#viewswitch button').forEach((b) => b.addEventListener('click', () => setAppView(b.dataset.appview)));
}

function setAppView(view) {
  document.body.classList.toggle('view-library', view === 'library');
  $$('#viewswitch button').forEach((b) => b.classList.toggle('active', b.dataset.appview === view));
  if (view === 'map') scheduleRender();
}

/* ------------------------------ zwijanie paneli bocznych -------- */

const PANELS = {
  left: { cls: 'left-collapsed', btn: '#toggle-left', open: '◀ Opcje', closed: 'Opcje ▶', name: 'panel opcji', key: 1 },
  right: { cls: 'right-collapsed', btn: '#toggle-right', open: 'Szczegóły ▶', closed: '◀ Szczegóły', name: 'panel szczegółów', key: 2 },
};

function togglePanel(side, force) {
  const p = PANELS[side];
  const collapsed = force ?? !document.body.classList.contains(p.cls);
  document.body.classList.toggle(p.cls, collapsed);
  const btn = $(p.btn);
  btn.textContent = collapsed ? p.closed : p.open;
  btn.title = `${collapsed ? 'Rozwiń' : 'Zwiń'} ${p.name} (Alt+${p.key})`;
  scheduleRender();
}

/** Otwiera kartę rasy w bibliotece (z listy graczy). */
function openFaction(id) {
  if (!id) return;
  setAppView('library');
  showFactionInLibrary(id);
}

/* ------------------------------ generowanie --------------------- */

function currentPlayers() {
  return S.players.map((p, i) => {
    const f = S.factionById.get(p.factionId);
    const c = paletteById(p.colorId);
    return {
      index: i, homePos: p.homePos, faction: f || null, homeTile: homeTileFor(f),
      colorId: p.colorId || null, colorName: c?.name || null, color: c?.hex || NEUTRAL_COLOR,
    };
  });
}

/**
 * `freshSeed` = nowa mapa od zera (przycisk „Generuj mapę”). Bez tego generator
 * przelicza planszę na tym samym ziarnie – dzięki temu zmiana rasy, barwy czy
 * rozsadzenia nie przetasowuje całej galaktyki. Ziarna nie widać w interfejsie;
 * trafia do zapisu .txt i do skrótu podsumowania pod mapą.
 */
function generateNow(freshSeed = false) {
  const L = currentLayout();
  const seed = freshSeed || !S.seed ? String(Math.floor(Math.random() * 1e9)) : S.seed;
  S.seed = seed;

  const players = currentPlayers();
  const res = generate({
    layout: L, systems: S.data.systems, players, seed,
    expansions: S.expansions, disabledTiles: S.disabledTiles, extraTiles: S.extraTiles,
    mode: S.mode, rules: S.rules,
    balance: { enabled: S.mode === 'balanced', weights: S.weights, iterations: S.iterations },
    affinity: { enabled: S.affinity.enabled, maxDistance: S.affinity.maxDistance, perFaction: S.affinity.perFaction },
  });
  S.result = res;
  S.result.players = players;
  draw();
  showReport();
  if (!S.selected) showMapOverview();
}

let renderPending = false;
function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => { renderPending = false; draw(); });
}

function draw() {
  if (!S.result) return;
  renderMap($('#map'), {
    placement: S.result.placement, layout: currentLayout(), sysById: S.sysById,
    planetById: S.planetById,
    players: S.result.players, analysis: S.result.analysis, selected: S.selected,
    // barwy sąsiedztwa są indeksowane gniazdami układu – tak samo jak wagi w analizie
    options: { ...S.options, sliceColors: neighbourhoodInfo().colors },
  });
  $$('#map .tile').forEach((g) => g.addEventListener('click', () => onTileClick(g.dataset.pos)));
}

function onTileClick(pos) {
  const L = currentLayout();
  // wskazanie gniazda sadza wybranego gracza w tym miejscu, a resztę numeruje dookoła
  if (S.seatPicking !== null && L.homes.includes(pos)) {
    seatPlayersAround(S.seatPicking, pos);
    S.seatPicking = null;
    buildPlayers();
    generateNow();
    return;
  }
  S.selected = S.selected === pos ? null : pos;
  if (S.selected) showInspector(pos); else showMapOverview();
  draw();
}

/**
 * Zawartość lewej połowy prawego panelu. Nagłówek „Przegląd mapy” i zdanie pod nim stoją
 * TU ZAWSZE – kliknięcie kafla ich nie zabiera, tylko dokłada nad ogólnym przeglądem kartę
 * wybranego systemu: najpierw grafika kafla, pod nią opis. Reszta kolumny – liczby całej
 * mapy, anomalie, tunele, planety legendarne – jest oddzielona kreską i zostaje na miejscu
 * niezależnie od tego, co jest wybrane.
 *
 * `detail` to `{ s, subtitle }` albo null, gdy nic nie jest wybrane.
 */
function showMapOverview(detail = null) {
  const body = clear($('#inspector-body'));
  if (!S.result) return;
  const L = currentLayout();
  const drawn = L.slots.map((pos) => ({ pos, s: S.sysById.get(S.result.placement[pos]) })).filter((x) => x.s);

  const blue = drawn.filter((x) => x.s.category === 'blue').length;
  const red = drawn.filter((x) => x.s.category === 'red').length;
  const planets = drawn.reduce((a, x) => a + x.s.planets.length, 0);
  const res = drawn.reduce((a, x) => a + x.s.res, 0);
  const inf = drawn.reduce((a, x) => a + x.s.inf, 0);
  const techs = drawn.reduce((a, x) => a + x.s.techSpecialties.length, 0);

  append(body,
    h('h3', {}, 'Przegląd mapy'),
    h('p', { class: 'hint' }, detail
      ? 'Kliknij inny kafel na mapie, żeby zobaczyć jego szczegóły. Pod kreską zostaje przegląd całej mapy.'
      : 'Kliknij dowolny kafel na mapie, żeby zobaczyć tutaj szczegóły systemu i jego planet.'),
  );

  if (detail) {
    const card = h('div', { class: 'picked' });
    renderSystemDetails(card, detail.s, detail.subtitle);
    card.append(h('button', {
      class: 'linkish', onclick: () => { S.selected = null; showMapOverview(); draw(); },
    }, '✕ zamknij podgląd systemu'));
    body.append(card);
  }

  append(body,
    h('div', { class: 'ovsep' }),
    h('div', { class: 'overview' },
      ov('kafle niebieskie', blue), ov('kafle czerwone', red), ov('planety', planets),
      ov('zasoby razem', res, RES_COLOR), ov('wpływy razem', inf, INF_COLOR),
      ov('specjalizacje tech.', techs)),
  );

  const list = (title, items, empty) => {
    body.append(h('h2', {}, title));
    if (!items.length) { body.append(h('p', { class: 'hint' }, empty)); return; }
    const box = h('div', { class: 'tile-list' });
    for (const [label, entries] of items) {
      box.append(h('div', { class: 'orow' },
        h('span', { class: 'olabel' }, label),
        h('span', { class: 'oval' }, entries.join(', '))));
    }
    body.append(box);
  };

  const group = (test, name) => {
    const map = new Map();
    for (const { pos, s } of drawn) {
      for (const key of test(s)) {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(`${s.name} (poz. ${pos})`);
      }
    }
    return [...map.entries()].map(([k, v]) => [name(k), v]);
  };

  list('Anomalie na mapie', group((s) => s.anomalies, (k) => t('anomalies', k)), 'Na tej mapie nie ma ani jednej anomalii.');
  list('Tunele czasoprzestrzenne', group((s) => s.wormholes, (k) => t('wormholes', k)), 'Na tej mapie nie ma tuneli.');

  const legend = drawn.filter((x) => x.s.legendary.length);
  body.append(h('h2', {}, 'Planety legendarne'));
  if (!legend.length) body.append(h('p', { class: 'hint' }, 'Żadna planeta legendarna nie została wylosowana.'));
  for (const { pos, s } of legend) {
    body.append(h('div', { class: 'orow' },
      h('span', { class: 'olabel' }, `★ ${s.name}`), h('span', { class: 'oval' }, `pozycja ${pos}`)));
  }
}

// zasoby i wpływy dostają te same barwy, co na mapie – stąd opcjonalny `color`
const ov = (label, value, color = null) => h('div', { class: 'ovcell' },
  h('strong', { style: color ? `color:${color}` : null }, String(Math.round(value * 10) / 10)),
  h('span', {}, label));

function showInspector(pos) {
  const s = S.sysById.get(S.result?.placement[pos]);
  if (!s) { showMapOverview(); return; }
  showMapOverview({ s, subtitle: `pozycja ${pos}` });
}

/**
 * Podgląd kafla z listy w zakładce „Kafle” – ten sam widok, co po kliknięciu kafla
 * na mapie, tylko wywołany dla kafla, którego na mapie może w ogóle nie być.
 */
function showTilePreview(tileId) {
  const s = S.sysById.get(tileId);
  if (!s) return;
  S.selected = null;
  togglePanel('right', false);                  // rozwiń panel, jeśli był zwinięty
  showMapOverview({ s, subtitle: 'podgląd z listy kafli' });
  draw();
}

/**
 * Karta wybranego systemu: najpierw grafika kafla, pod nią cały opis – numer i nazwa kafla,
 * pozycja, dodatek, z którego pochodzi, rewers, a dalej anomalie, tunele i planety.
 * Nad grafiką nie ma już nic: wiersz z barwą tła kafla powtarzał to, co i tak mówi legenda,
 * a odsuwał grafikę od nagłówka panelu.
 */
function renderSystemDetails(body, s, subtitle) {
  body.append(s.image
    ? h('img', { class: 'tilepic', src: `tiles/${s.image}`, alt: `Kafel ${s.id} – ${s.name}` })
    : h('p', { class: 'hint warn' }, 'Dla tego kafla nie mamy grafiki – pobierz je poleceniem npm run fetch:tiles.'));
  append(body,
    h('h3', {}, `${s.id} · ${s.name}`),
    h('p', { class: 'hint' }, `${subtitle} · ${S.data.meta.expansions[s.expansion].name} · ${t('categories', s.category)} · rewers ${t('backs', s.back)}`),
  );
  if (s.anomalies.length) body.append(h('p', {}, h('strong', {}, 'Anomalie: '), tList('anomalies', s.anomalies)));
  if (s.wormholes.length) body.append(h('p', {}, h('strong', {}, 'Tunele czasoprzestrzenne: '), tList('wormholes', s.wormholes)));
  if (!s.planets.length) body.append(h('p', { class: 'hint' }, 'Brak planet w tym systemie.'));
  for (const pid of s.planets) {
    const p = S.planetById.get(pid);
    if (!p) continue;
    append(body, h('div', { class: 'planet' },
      h('strong', {}, p.name),
      h('span', { class: 'tval' }, ' ',
        h('span', { style: `color:${RES_COLOR}` }, `${p.resources} zas.`),
        h('span', { style: `color:${SLASH_COLOR}` }, ' / '),
        h('span', { style: `color:${INF_COLOR}` }, `${p.influence} wpł.`)),
      h('div', { class: 'pnote' }, `typ: ${tList('planetTypes', p.types) || '—'}${p.tech.length ? ` · specjalizacja: ${tList('tech', p.tech)}` : ''}`),
      p.legendary ? h('p', { class: 'pnote' }, `★ ${p.legendary.name}: ${p.legendary.text}`) : null,
    ));
  }
  if (s.excluded) body.append(h('p', { class: 'pnote warn' }, s.excluded.why));
}

/**
 * Tabela pokazująca, z czego składa się „kara” użyta przy układaniu mapy:
 * dla każdego kryterium rozpiętość między graczami, waga i iloczyn obu.
 */
function balanceTable(r, spreadOf) {
  const w = r.weights;                       // wagi użyte przy generowaniu tej mapy
  const rows = WEIGHT_FIELDS.map(([key, label]) => {
    const sp = spreadOf(key);
    const weight = w ? Number(w[key] || 0) : null;
    return { label, sp, weight, contrib: weight === null ? null : weight * sp };
  });
  const total = w ? rows.reduce((a, x) => a + x.contrib, 0) : null;

  const caption = w
    ? 'Z czego wyszła „kara”, którą generator minimalizował: rozpiętość × waga dla każdego kryterium. '
      + 'Rozpiętość to różnica między graczem, który ma najwięcej, a tym, który ma najmniej – zero oznacza idealnie równo.'
    : 'Rozpiętości między graczami dla tej mapy (różnica: najwięcej minus najmniej). '
      + 'Ta mapa nie powstała w trybie „Zbalansowana”, więc wagi nie były używane.';

  return h('table', { class: 'stats balance' },
    h('caption', {}, caption),
    h('thead', {}, h('tr', {},
      h('th', { title: 'Kryterium z listy „Wagi balansu” w panelu po lewej.' }, 'Kryterium'),
      h('th', { title: 'Najwięcej minus najmniej wśród graczy. Im bliżej zera, tym równiej.' }, 'Rozpiętość'),
      h('th', { title: 'Waga ustawiona suwakiem w chwili generowania tej mapy.' }, 'Waga'),
      h('th', { title: 'Rozpiętość × waga – tyle to kryterium dołożyło do kary.' }, 'Wkład do kary'))),
    h('tbody', {}, ...rows.map((x) => h('tr', { class: x.weight === 0 ? 'muted-row' : null },
      h('td', {}, x.label),
      h('td', {}, x.sp.toFixed(1)),
      h('td', {}, x.weight === null ? '—' : String(x.weight)),
      h('td', {}, x.contrib === null ? '—' : x.contrib.toFixed(1))))),
    h('tfoot', {}, h('tr', {},
      h('td', {}, 'Kara łącznie'),
      h('td', {}, ''), h('td', {}, ''),
      h('td', {}, total === null ? '—' : total.toFixed(1)))));
}

function showReport() {
  const r = S.result.report;
  const root = $('#report');
  root.textContent = '';

  if (r.problems.length) {
    root.append(h('div', { class: 'alert' }, ...r.problems.map((p) => h('div', {}, '⚠ ' + p))));
  }
  const v = r.violations;
  const modeLabel = MODES.find((m) => m.id === r.mode)?.label || 'wczytana z pliku';
  const badges = [
    ['tryb: ' + modeLabel, 'Sposób, w jaki powstała ta mapa.'],
    ['iteracje: ' + r.iterations, 'Ile razy generator próbował poprawić rozstawienie kafli.'],
    ['sąsiadujące anomalie: ' + v.anomalyPairs, 'Ile par kafli z anomaliami styka się bokami. Zgodnie z zasadami powinno być 0.'],
    ['sąsiadujące tunele tego samego typu: ' + v.wormholePairs, 'Zgodnie z zasadami powinno być 0.'],
  ];
  if (S.rules.maxAnomaliesNextToHome >= 0) {
    badges.push(['anomalie przy domu ponad limit: ' + (v.homeAnomalies || 0),
      `Limit ustawiony w zakładce „Zasady” to ${S.rules.maxAnomaliesNextToHome}`
      + `${S.rules.allowPlanetAnomalyNextToHome ? ' (anomalie z planetą nie liczą się do limitu)' : ''}.`
      + ' Wartość powyżej zera znaczy, że generator nie zdołał pogodzić tego limitu z pozostałymi zasadami.']);
  }
  if (v.homeAnomalies > 0) {
    root.append(h('div', { class: 'alert' },
      `⚠ Przy domach stoi o ${v.homeAnomalies} anomalii za dużo w stosunku do limitu z zakładki „Zasady”. `
      + 'Zwykle znaczy to, że limitu nie da się pogodzić z zasadą „anomalie nie mogą sąsiadować” '
      + 'przy tej puli kafli. Pomaga: podniesienie limitu o jeden, włączenie opcji „anomalia z planetą '
      + 'może stać przy domu” albo przelosowanie mapy.'));
  }
  root.append(h('div', { class: 'badges' }, ...badges.map(([b, ttl]) => h('span', { class: 'badge2', title: ttl }, b))));

  if (r.affinity.detail.length) {
    root.append(h('div', { class: 'badges' }, ...r.affinity.detail.map((d) =>
      h('span', { class: 'badge2 ' + (d.satisfied ? 'ok' : 'bad'), title: d.why },
        `${d.factionName}: ${FEATURES[d.feature]?.label || d.feature} ${d.satisfied ? '✓ jest na mapie' : '✗ brak'}`))));
  }

  // Statystyki liczone są w kolejności gniazd układu, a gracz może siedzieć w dowolnym z nich –
  // dlatego każdy wiersz bierze dane z gniazda swojego gracza, a nie z pozycji na liście.
  const homes = currentLayout().homes;
  const rows = S.result.players.map((p, i) => {
    const hi = homes.indexOf(p.homePos);
    const st = r.stats[hi >= 0 ? hi : i];
    return {
      seat: `#${i + 1} · poz. ${p.homePos}`,
      faction: p.faction ? factionLabel(p.faction) : '—',
      optRes: st.optRes.toFixed(1), optInf: st.optInf.toFixed(1), optTotal: st.optTotal.toFixed(1),
      planets: st.planets.toFixed(1), tech: st.tech.toFixed(1), anomalies: st.anomalies.toFixed(1),
      wormholes: st.wormholes.toFixed(1), legendary: st.legendary.toFixed(1),
      mecatol: String(S.result.analysis.mecatolDist[hi >= 0 ? hi : i]),
    };
  });
  root.append(h('table', { class: 'stats' },
    h('caption', {}, 'Podsumowanie obszarów graczy – co przypada każdemu graczowi wokół jego domu (najedź na nagłówek, żeby zobaczyć wyjaśnienie)'),
    h('thead', {}, h('tr', {}, ...STAT_COLUMNS.map(([, label, desc]) => h('th', { title: desc }, label)))),
    h('tbody', {}, ...rows.map((row, i) => h('tr', {},
      ...STAT_COLUMNS.map(([key], j) => h('td', {
        style: j === 0 ? `border-left:4px solid ${S.result.players[i].color}` : null,
      }, row[key])))))));

  const spreadOf = (key) => {
    const xs = r.stats.map((st) => st[key]);
    return Math.max(...xs) - Math.min(...xs);
  };
  const spread = (key) => spreadOf(key).toFixed(1);

  root.append(balanceTable(r, spreadOf));

  root.append(h('div', { class: 'legend' },
    h('p', {}, h('strong', {}, 'Jak czytać tabelę. '),
      '„Obszar gracza” to kafle, do których ma najbliżej. Kafel jednakowo oddalony od kilku graczy liczy się każdemu po części – stąd wartości połówkowe. ',
      'Kolumna „Wartość razem” to najprostszy wskaźnik siły startu: im mniejsza różnica między graczami, tym mapa równiejsza.'),
    h('p', {}, h('strong', {}, 'Wartość „optymalna”. '),
      'Z każdej planety liczy się tylko ta wartość, która jest większa – zasoby albo wpływy (przy remisie po połowie). Tak ocenia się siłę obszaru w draftach, bo w praktyce planetę wykorzystuje się albo do produkcji, albo do głosowania.'),
    h('p', {}, h('strong', {}, 'Różnica najlepszy – najgorszy: '),
      `wartość razem ${spread('optTotal')}, zasoby ${spread('optRes')}, wpływy ${spread('optInf')}, planety ${spread('planets')}, specjalizacje technologiczne ${spread('tech')}.`),
    h('p', { class: 'hint' }, `Ziarno: ${r.seed} · użyto ${r.counts.drawnBlue} kafli niebieskich i ${r.counts.drawnRed} czerwonych.`),
  ));

  // Skrót tylko w nagłówku szuflady z podsumowaniem – pasek nad mapą zostaje na przyciski.
  $('#report-brief').textContent = `rozpiętość wartości ${spread('optTotal')}`
    + ` · anomalie obok siebie ${v.anomalyPairs} · tunele obok siebie ${v.wormholePairs}`
    + ` · ziarno ${r.seed}`;
}

/* ------------------------------ legenda symboli ----------------- */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Co pokazywać na mapie – każda pozycja ma własny przełącznik i zdanie wyjaśnienia. */
const VIEW_OPTIONS = [
  ['showSlices', 'sąsiedztwo',
    'Koloruje każdy kafel barwą gracza, do którego systemu domowego jest mu najbliżej. '
    + 'Kafel jednakowo oddalony od kilku domów dostaje udziały procentowe.'],
  ['showNames', 'nazwa',
    'Wypisuje na kaflu nazwę systemu, a na systemie domowym – nazwę rasy gracza.'],
  ['showParams', 'zasoby',
    'Zasoby/wpływy systemu (żółte liczby u dołu) oraz gwiazdka planety legendarnej.'],
  ['showAnomalies', 'anomalie',
    'Symbole anomalii: supernowa, mgławica, pole asteroid, rozdarcie grawitacyjne i te z dodatków.'],
  ['showWormholes', 'tunele',
    'Greckie litery oznaczające typ tunelu (α, β, γ, δ, ε).'],
  ['showTraits', 'cechy',
    'Ikony cech planet: zielona zębatka – przemysłowa, czerwony odwrócony trójkąt – niegościnna, '
    + 'niebieska przechylona elipsa z kropką – kulturalna. Cechy liczą się przy kartach celów.'],
  ['showTechs', 'specjalizacje',
    'Sześciokąt w barwie technologii (zielona biotyczna, czerwona wojenna, niebieska napędowa, '
    + 'żółta cybernetyczna). Planeta ze specjalizacją pozwala pominąć jedno wymaganie przy badaniu.'],
  ['showPositions', 'pozycje',
    'Numer gniazda w lewym rogu heksa: pierwsza cyfra to pierścień wokół Mecatolu, kolejne dwie – '
    + 'miejsce w pierścieniu, liczone od góry zgodnie z ruchem wskazówek zegara. Tymi numerami '
    + 'posługują się pozostałe panele i zapis mapy.'],
  ['showTileIds', 'kafle',
    'Numer samego kafla w prawym rogu heksa – ten wydrukowany na kartonie i używany w map stringu. '
    + 'Przydaje się, gdy układasz planszę z pudełka albo porównujesz mapę z zapisem.'],
  ['showImages', 'grafiki',
    'Oryginalne grafiki kafli z gry. Po wyłączeniu widać same barwy kategorii kafla.'],
];

/** Barwa sąsiedztwa, dopóki nie wszystkie rasy są wybrane – jedna dla wszystkich. */
const SLICE_PENDING_COLOR = '#7c8798';

/**
 * Barwy sąsiedztwa, w kolejności gniazd układu (tak indeksuje je analiza).
 * Rozróżniamy graczy dopiero wtedy, gdy każdy ma wybraną rasę – wcześniej
 * cały podział mapy jest w jednym, neutralnym kolorze.
 */
function neighbourhoodInfo() {
  const homes = currentLayout().homes;
  const byHome = homes.map((pos) => S.players.find((p) => p.homePos === pos) || null);
  const ready = S.players.length > 0 && S.players.every((p) => p.factionId);
  if (!ready) return { ready, byHome, colors: homes.map(() => SLICE_PENDING_COLOR) };

  // gracz bez wybranej barwy i tak musi się odróżniać – bierze pierwszą wolną z palety
  const used = new Set(S.players.map((p) => p.colorId).filter(Boolean));
  const spare = PLAYER_PALETTE.filter((c) => !used.has(c.id));
  let k = 0;
  const colors = byHome.map((p) => paletteById(p?.colorId)?.hex
    || spare[k++]?.hex
    || PLAYER_PALETTE[(k + spare.length) % PLAYER_PALETTE.length].hex);
  return { ready, byHome, colors };
}

/** Ile procent pól planszy przypada każdemu gniazdu – z tych samych wag, co tabela obszarów. */
function neighbourhoodShares() {
  const w = S.result?.analysis?.weights;
  const homes = currentLayout().homes;
  if (!w) return homes.map(() => ({ tiles: 0, pct: 0 }));
  const sum = homes.map(() => 0);
  let all = 0;
  for (const arr of w.values()) {
    arr.forEach((v, i) => { sum[i] += v; });
    all += arr.reduce((a, b) => a + b, 0);
  }
  return sum.map((v) => ({ tiles: v, pct: all ? (v / all) * 100 : 0 }));
}

const svgEl = (name, attrs) => {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/** Miniaturka ikony domu do legendy – ten sam kształt, co dom na mapie. */
function legendHouse(color, filled = true) {
  const svg = svgEl('svg', { viewBox: '-12 -12 24 24', width: 36, height: 36 });
  svg.append(
    svgEl('path', {
      d: housePath(10),
      fill: filled ? color : 'none',
      stroke: filled ? '#080b11' : color,
      'stroke-width': 2, 'stroke-linejoin': 'round',
    }),
    Object.assign(svgEl('text', {
      x: 0, y: 6, 'text-anchor': 'middle', 'font-size': 7, 'font-weight': 700,
      fill: filled ? '#0b0d12' : color,
    }), { textContent: '1' }),
  );
  return svg;
}

/** Miniaturka ikony cechy planety albo specjalizacji – rysowana tym samym kodem, co na mapie. */
function legendPlanetIcon(spec) {
  const svg = svgEl('svg', { viewBox: '-9 -9 18 18', width: 30, height: 30 });
  drawPlanetIcon(svg, spec, 7);
  return svg;
}

/** Miniaturka pola asteroid – ten sam kształt, co znak nad kaflem. */
function legendAsteroids() {
  const svg = svgEl('svg', { viewBox: '-9 -9 18 18', width: 30, height: 30 });
  drawAsteroidIcon(svg, 7.5, ANOMALY_COLOR);
  return svg;
}

/** Miniaturka narożników czerwonego kafla. */
function legendRedCorner() {
  const svg = svgEl('svg', { viewBox: '-12 -11 24 22', width: 26, height: 24 });
  svg.append(svgEl('path', {
    d: 'M-10 0L-10 -3M-10 0L-10 3M-5 -8.5L-2.5 -8.5M5 -8.5L2.5 -8.5M10 0L10 -3M10 0L10 3'
      + 'M-5 8.5L-2.5 8.5M5 8.5L2.5 8.5',
    fill: 'none', stroke: ANOMALY_COLOR, 'stroke-width': 2.5, 'stroke-linecap': 'round',
  }));
  return svg;
}

/** Próbka obok opisu – kształt zależy od rodzaju symbolu. */
function legendSymbol(item) {
  const box = h('span', { class: 'lgsym' });
  switch (item.kind) {
    case 'home': box.append(legendHouse(PLAYER_PALETTE[3].hex)); break;
    case 'homeOutline': box.append(legendHouse(PLAYER_PALETTE[3].hex, false)); break;
    case 'homeGrey': box.append(legendHouse(NEUTRAL_COLOR)); break;
    case 'redcorner': box.append(legendRedCorner()); break;
    case 'planeticon': box.append(legendPlanetIcon(item.spec)); break;
    case 'asteroids': box.append(legendAsteroids()); break;
    // te same trzy barwy co na mapie: zasób żółty, ukośnik neutralny, wpływ niebieski
    case 'value': box.append(h('span', { class: 'txt val' },
      h('span', { style: `color:${RES_COLOR}` }, '3'),
      h('span', { style: `color:${SLASH_COLOR}` }, '/'),
      h('span', { style: `color:${INF_COLOR}` }, '2'))); break;
    // numery w rogach heksa – ta sama forma i te same barwy, co na mapie
    case 'chip': box.append(h('span', {
      class: 'txt chip', style: `background:${item.bg};color:${item.ink}`,
    }, item.sym)); break;
    case 'swatch': box.append(h('span', { class: 'box', style: `background:${item.sym}` })); break;
    case 'ring': box.append(h('span', { class: 'ring' })); break;
    case 'slice': box.append(h('span', { class: 'slice' })); break;
    // Symbol z kilku znaków (np. „α β γ δ ε”) nie zmieści się w kolumnie próbek w pełnym
    // stopniu pisma – dostaje mniejszą czcionkę i łamie się na dwie linijki.
    default: box.append(h('span', {
      class: `txt${item.sym.length > 2 ? ' multi' : ''}`,
      style: item.color ? `color:${item.color}` : null,
    }, item.sym));
  }
  return box;
}

/** Przełączniki „co pokazywać na mapie” – poziomo, we własnym pasku pod nagłówkiem. */
function buildViewOptions() {
  const root = clear($('#view-options'));
  for (const [key, label, desc] of VIEW_OPTIONS) {
    const cb = h('input', { type: 'checkbox', id: `show-${key}`, checked: S.options[key] });
    cb.addEventListener('change', () => {
      S.options[key] = cb.checked;
      if (key === 'showSlices') buildLegend();
      draw();
    });
    root.append(h('label', { title: desc }, cb, h('span', {}, label)));
  }
}

/** Wiersz legendy: próbka + nazwa (+ wyjaśnienie, jeśli symbol nie mówi sam za siebie). */
const legendRow = (sym, name, desc, cls = '') => h('div', { class: `lgrow${cls ? ` ${cls}` : ''}` },
  sym, h('div', {},
    h('div', { class: 'lgname' }, name),
    desc ? h('p', { class: 'lgdesc' }, desc) : null));

/**
 * Sekcja „Sąsiedztwo” – pojawia się tylko przy włączonej opcji. Wypisuje, jaka barwa
 * należy do którego gracza i jaki procent pól planszy mu przypada.
 */
function legendNeighbourhood(body) {
  const { ready, byHome, colors } = neighbourhoodInfo();
  body.append(h('h4', {}, 'Sąsiedztwo'));
  body.append(h('p', { class: 'lgintro' },
    'Kafel dostaje barwę gracza, do którego domu ma najbliżej (licząc w skokach, z hiperpasami). '
    + 'Kafel jednakowo oddalony od kilku domów dzieli się między nich – na takim kaflu widać '
    + 'udziały procentowe w barwach zainteresowanych graczy. Kafel bez liczb należy w całości '
    + 'do gracza w swojej barwie.'));

  if (!ready) {
    body.append(legendRow(
      h('span', { class: 'lgsym' }, h('span', { class: 'slice', style: `background:${SLICE_PENDING_COLOR}88` })),
      'jeden kolor dla wszystkich',
      'Rozróżnienie graczy barwami włącza się dopiero wtedy, gdy każdy gracz ma wybraną rasę. '
      + 'Na razie cały podział mapy jest w jednym kolorze.'));
    return;
  }

  const shares = neighbourhoodShares();
  byHome.forEach((p, i) => {
    const faction = p ? S.factionById.get(p.factionId) : null;
    const kto = p ? `Gracz ${p ? S.players.indexOf(p) + 1 : '?'}` : `gniazdo ${currentLayout().homes[i]}`;
    body.append(legendRow(
      h('span', { class: 'lgsym' }, h('span', { class: 'slice', style: `background:${colors[i]}88` })),
      `${kto}${faction ? ` – ${faction.name}` : ''}`,
      `${shares[i].pct.toFixed(1)}% pól planszy (${shares[i].tiles.toFixed(1)} kafla).`));
  });
}

/**
 * Każda grupa legendy ma ten sam układ: nagłówek, akapit „co to w ogóle jest”,
 * a dopiero pod nim symbole z krótkim wyjaśnieniem każdego z nich.
 */
function buildLegend() {
  const body = clear($('#legend-body'));
  if (S.options.showSlices) legendNeighbourhood(body);
  for (const grp of MAP_LEGEND) {
    body.append(h('h4', {}, grp.group));
    if (grp.intro) body.append(h('p', { class: 'lgintro' }, grp.intro));
    for (const item of grp.items) {
      // barwy kafli dostają jaśniejszą podkładkę – patrz .lgrow.tilebg w styles.css
      body.append(legendRow(legendSymbol(item), item.label, item.desc,
        item.kind === 'swatch' ? 'tilebg' : ''));
    }
  }
}

/* ------------------------------ szuflada z podsumowaniem -------- */

/**
 * Podsumowanie wysuwa się nad mapą zamiast zabierać jej wysokość.
 * Dzięki temu mapa zawsze jest tak duża, jak pozwala okno.
 */
function toggleReport(force) {
  const d = $('#report-drawer');
  const open = force ?? d.classList.contains('closed');
  d.classList.toggle('closed', !open);
  d.setAttribute('aria-hidden', String(!open));
  const b = $('#toggle-report');
  b.textContent = open ? 'Podsumowanie ▼' : 'Podsumowanie ▲';
  b.title = `${open ? 'Ukryj' : 'Pokaż'} podsumowanie mapy (Alt+3)`;
  b.classList.toggle('active', open);
}

/* ------------------------------ zapis / wczytanie --------------- */

function serializeMap() {
  const L = currentLayout();
  const placement = S.result.placement;
  const lines = [
    '# Generator map Twilight Imperium 4 – zapis mapy',
    '# Ten plik można wkleić z powrotem do generatora (zakładka „Zapis”).',
    '',
    'wersja = 1',
    `uklad = ${L.id}`,
    `uklad_nazwa = ${L.name}`,
    `dodatki = ${S.expansions.join(', ')}`,
    `tryb = ${S.result.report.mode}`,
    `ziarno = ${S.seed}`,
    '',
    '# Gracze:  numer = pozycja domu ; identyfikator rasy ; nazwa rasy ; kafel leżący na mapie ; barwa',
  ];
  S.result.players.forEach((p, i) => {
    lines.push(`gracz${i + 1} = ${p.homePos} ; ${p.faction?.id || '-'} ; ${p.faction?.name || 'bez rasy'}`
      + ` ; ${p.homeTile || '-'} ; ${p.colorId || '-'}`);
  });
  lines.push('', '# Kafle:  pozycja = numer kafla');
  const positions = [...new Set(['000', ...L.homes, ...L.slots, ...Object.keys(L.hyperlanes || {})])]
    .sort((a, b) => Number(a) - Number(b));
  for (const pos of positions) {
    const tid = placement[pos];
    const s = S.sysById.get(tid);
    lines.push(`${pos} = ${tid || '0'}${s ? `   # ${s.name}` : ''}`);
  }
  lines.push('', `mapstring = ${toMapString(placement, L)}`, '');
  return lines.join('\r\n');
}

/** Zamienia "map string" na mapę pozycja→kafel (pozycje od 101 w kolejności pierścieni). */
function mapStringToPlacement(str) {
  const tokens = str.trim().split(/\s+/).filter(Boolean);
  const placement = {};
  let i = 0;
  for (let ring = 1; ring <= 5 && i < tokens.length; ring++) {
    for (let k = 1; k <= 6 * ring && i < tokens.length; k++, i++) {
      const tok = tokens[i];
      if (tok === '-1') continue;
      placement[`${ring}${String(k).padStart(2, '0')}`] = tok === '0' ? null : tok;
    }
  }
  return placement;
}

function parseSave(text) {
  const raw = text.replace(/\r/g, '');
  const body = raw.split('\n').map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
  const kv = new Map();
  const placement = {};
  const players = [];
  let sawKeys = false;

  for (const line of body) {
    const m = line.match(/^(\w+)\s*=\s*(.*)$/);
    if (!m) continue;
    sawKeys = true;
    const [, key, value] = m;
    if (/^\d{3}$/.test(key)) { placement[key] = value === '0' || value === '-1' ? null : value; continue; }
    if (/^gracz\d+$/.test(key)) {
      const parts = value.split(';').map((x) => x.trim());
      players.push({
        homePos: parts[0],
        factionId: parts[1] && parts[1] !== '-' ? parts[1] : null,
        homeTile: parts[3] && parts[3] !== '-' ? parts[3] : null,
        colorId: parts[4] && parts[4] !== '-' ? parts[4] : null,   // starsze zapisy nie mają barw
      });
      continue;
    }
    kv.set(key, value);
  }
  if (kv.has('mapstring') && !Object.keys(placement).length) {
    Object.assign(placement, mapStringToPlacement(kv.get('mapstring')));
  }
  if (!sawKeys) Object.assign(placement, mapStringToPlacement(raw)); // sam map string
  return { kv, placement, players };
}

/** Buduje układ „własny” na podstawie wczytanej mapy (gdy nie znamy jej identyfikatora). */
function layoutFromPlacement(placement, players) {
  const homes = players.length
    ? players.map((p) => p.homePos).filter(Boolean)
    : Object.entries(placement).filter(([, tid]) => S.sysById.get(tid)?.category === 'home').map(([pos]) => pos);
  const hyperlanes = {};
  const slots = [];
  let blue = 0, red = 0;
  for (const [pos, tid] of Object.entries(placement)) {
    if (pos === '000' || homes.includes(pos)) continue;
    const s = S.sysById.get(tid);
    if (s?.category === 'hyperlane') { hyperlanes[pos] = tid; continue; }
    slots.push(pos);
    if (s?.category === 'red') red++; else if (s?.category === 'blue') blue++;
  }
  if (blue + red !== slots.length) {          // szablon z pustymi polami – podział 3:2
    red = Math.round(slots.length * 0.4);
    blue = slots.length - red;
  }
  slots.sort((a, b) => Number(a) - Number(b));
  return {
    id: 'wlasny',
    name: `Układ własny (${homes.length} graczy, ${slots.length} miejsc do wylosowania)`,
    players: homes.length || 1, official: false,
    credit: 'wczytany z pliku tekstowego',
    note: 'Układ odtworzony z wczytanego zapisu – można go dalej przelosowywać przyciskiem „Generuj mapę”.',
    homes, hyperlanes, slots, deal: { blue: 0, red: 0 }, totals: { blue, red },
  };
}

function loadFromText(text) {
  const status = $('#save-status');
  try {
    const { kv, placement, players } = parseSave(text);
    if (!Object.keys(placement).length) throw new Error('w tekście nie ma żadnych kafli');

    if (kv.has('dodatki')) {
      const list = kv.get('dodatki').split(/[,\s]+/).filter((x) => S.data.meta.expansions[x]);
      if (list.length) S.expansions = list;
    }

    const known = kv.has('uklad') && S.data.layouts.find((l) => l.id === kv.get('uklad'));
    const layout = known || layoutFromPlacement(placement, players);
    if (!known) S.customLayout = layout;
    S.layoutId = layout.id;

    // Zapis może wskazywać układ z dodatku, którego w linijce „dodatki” zabrakło
    // (plik pisany ręcznie). Bez tego dodatku układ zniknąłby z listy, a pole wyboru
    // rozjechałoby się ze stanem aplikacji – więc włączamy go razem z mapą.
    for (const id of layout.requires || []) if (!S.expansions.includes(id)) S.expansions.push(id);
    Object.values(S.data.meta.expansions).forEach((e) => {
      const cb = $(`#expansions [data-exp="${e.id}"] input`);
      if (cb) cb.checked = S.expansions.includes(e.id);
    });

    S.players = layout.homes.map((pos, i) => ({
      colorId: paletteById(players[i]?.colorId)?.id || null,
      factionId: players[i]?.factionId && S.factionById.has(players[i].factionId) ? players[i].factionId : null,
      homePos: players[i]?.homePos || pos,
    }));
    if (kv.has('ziarno')) S.seed = kv.get('ziarno');
    if (kv.has('tryb') && MODES.some((m) => m.id === kv.get('tryb'))) S.mode = kv.get('tryb');

    setPlayerCount(layout.players);
    $('#layout').value = layout.id;
    syncModeUI();

    const full = {};
    for (const [pos, tid] of Object.entries(placement)) if (tid) full[pos] = tid;
    if (!full['000']) full['000'] = '18';
    const ctxPlayers = currentPlayers();
    ctxPlayers.forEach((p) => { if (p.homeTile) full[p.homePos] = p.homeTile; });
    const missing = layout.slots.filter((pos) => !full[pos]);

    const res = describe(full, {
      layout, systems: S.data.systems, players: ctxPlayers, rules: S.rules,
      affinity: { enabled: S.affinity.enabled, maxDistance: S.affinity.maxDistance, perFaction: S.affinity.perFaction },
    });
    S.result = res;
    S.result.players = ctxPlayers;
    draw();
    showReport();
    status.className = 'hint';
    status.textContent = missing.length
      ? `Wczytano szablon: ${layout.name}. Pustych miejsc: ${missing.length}. Kliknij „Generuj mapę”, żeby obsadzić wszystkie miejsca tego układu (hiperpasy i domy zostają na swoich pozycjach).`
      : `Wczytano mapę: ${layout.name}.`;
  } catch (e) {
    status.className = 'hint warn';
    status.textContent = `Nie udało się wczytać: ${e.message}`;
  }
}

function downloadSave() {
  const blob = new Blob([serializeMap()], { type: 'text/plain;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `mapa-ti4-${S.seed}.txt` });
  document.body.append(a); a.click(); a.remove();
}

/* ------------------------------ pasek narzędzi ------------------ */

function flash(btn, msg, back) {
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = back; }, 1500);
}

function wireToolbar() {
  $('#btn-generate').addEventListener('click', () => generateNow(true));
  $('#tile-search').addEventListener('input', buildTilesTab);
  $('#tile-search').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.target.value = ''; buildTilesTab(); }
  });
  $('#tile-search-clear').addEventListener('click', () => {
    $('#tile-search').value = ''; buildTilesTab(); $('#tile-search').focus();
  });
  $('#toggle-left').addEventListener('click', () => togglePanel('left'));
  $('#toggle-right').addEventListener('click', () => togglePanel('right'));
  $('#toggle-report').addEventListener('click', () => toggleReport());
  $('#report-close').addEventListener('click', () => toggleReport(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#report-drawer').classList.contains('closed')) {
      toggleReport(false); e.preventDefault(); return;
    }
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === '1') { togglePanel('left'); e.preventDefault(); }
    if (e.key === '2') { togglePanel('right'); e.preventDefault(); }
    if (e.key === '3') { toggleReport(); e.preventDefault(); }
  });

  $('#btn-clear-players').addEventListener('click', clearPlayersTab);
  $('#tiles-all').addEventListener('click', () => { S.disabledTiles.clear(); buildTilesTab(); refreshPoolInfo(); });
  $('#tiles-none').addEventListener('click', () => {
    for (const s of S.data.systems) if (s.inPool) S.disabledTiles.add(s.id);
    buildTilesTab(); refreshPoolInfo();
  });

  // kolejność graczy dookoła planszy
  $('#btn-first-seat').addEventListener('click', () => {
    S.seatPicking = 0; buildPlayers(); scheduleRender();
  });
  $('#first-seat').addEventListener('change', (e) => {
    seatPlayersAround(0, e.target.value); buildPlayers(); generateNow();
  });
  $('#affinity-enabled').addEventListener('change', (e) => { S.affinity.enabled = e.target.checked; });
  $('#affinity-distance').addEventListener('change', (e) => { S.affinity.maxDistance = Number(e.target.value); });

  $('#btn-mapstring').addEventListener('click', async () => {
    await navigator.clipboard.writeText(toMapString(S.result.placement, currentLayout())).catch(() => {});
    flash($('#btn-mapstring'), 'skopiowano ✓', 'map string');
  });
  $('#btn-export').addEventListener('click', downloadSave);
  $('#btn-save-file').addEventListener('click', downloadSave);
  $('#btn-save-show').addEventListener('click', () => { $('#save-text').value = serializeMap(); });
  $('#btn-copy-text').addEventListener('click', async () => {
    await navigator.clipboard.writeText(serializeMap()).catch(() => {});
    flash($('#btn-copy-text'), 'skopiowano ✓', 'Kopiuj do schowka');
  });
  $('#btn-load-text').addEventListener('click', () => loadFromText($('#save-text').value));
  $('#btn-load-file').addEventListener('click', () => $('#file-input').click());
  $('#file-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    $('#save-text').value = text;
    loadFromText(text);
    e.target.value = '';
  });
}

boot();

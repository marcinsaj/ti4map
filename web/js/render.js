/**
 * Rysowanie mapy w SVG.
 *
 * Wszystkie symbole, których używa mapa, są opisane w MAP_LEGEND – legenda obok mapy
 * bierze dane stąd, żeby opis nigdy nie rozjechał się z tym, co naprawdę widać na planszy.
 */
import { pixel, hexPath, ringOf, neighbors } from './hex.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 60;                      // promień kafla w jednostkach SVG
const H = Math.sqrt(3) * R;
const TILE_STROKE = 2;             // jedna grubość obrysu dla wszystkich kafli

/**
 * Barwy do wyboru dla systemów domowych – odpowiadają kolorom plastików w TI4.
 * `id` trafia do zapisu mapy (bez polskich znaków), `name` widzi użytkownik.
 */
export const PLAYER_PALETTE = [
  { id: 'zolty', name: 'żółty', hex: '#f0c419' },
  { id: 'zielony', name: 'zielony', hex: '#31b34a' },
  { id: 'czerwony', name: 'czerwony', hex: '#e8443a' },
  { id: 'niebieski', name: 'niebieski', hex: '#3d8bff' },
  { id: 'pomaranczowy', name: 'pomarańczowy', hex: '#ff8a3d' },
  { id: 'fioletowy', name: 'fioletowy', hex: '#a45cff' },
  { id: 'rozowy', name: 'różowy', hex: '#ff5fa2' },
  { id: 'czarny', name: 'czarny', hex: '#454d61' },
];

export const PLAYER_COLORS = PLAYER_PALETTE.map((c) => c.hex);

/** Kolor domu, któremu gracz nie przypisał jeszcze barwy – jasnoszary. */
export const NEUTRAL_COLOR = '#c9d2e0';

/**
 * Barwa wszystkiego, co oznacza anomalię: symboli na kaflu, narożników i próbek w legendzie.
 * Jaskrawsza od czerwieni cechy „niegościnna” i specjalizacji „wojenna” (#e8443a),
 * żeby dwa różne znaczenia czerwieni dało się rozróżnić na jednym kaflu.
 */
export const ANOMALY_COLOR = '#ff2626';

const ANOMALY_ICON = {
  supernova: '☀',
  nebula: '☁',
  gravity_rift: '◉',
  entropic_scar: '⌁',
  fracture: '✷',
};

/* Pole asteroid nie ma w Unicode znaku o sensownej wadze – kropki (⁘) były tak cienkie,
   że na grafice kafla po prostu ginęły. Rysujemy więc trzy pełne bryły. Tej samej funkcji
   używa mapa i legenda, więc próbka nie rozjedzie się z tym, co widać na planszy. */
export function drawAsteroidIcon(parent, r, color) {
  const g = el('g', { class: 'picon asteroids' }, parent);
  const rocks = [[-0.52, -0.26, 0.48], [0.46, -0.44, 0.34], [0.16, 0.46, 0.40]];
  for (const [dx, dy, rr] of rocks) {
    el('circle', {
      cx: (dx * r).toFixed(2), cy: (dy * r).toFixed(2), r: (rr * r).toFixed(2),
      fill: color, stroke: '#0a0d13', 'stroke-width': 1.1,
    }, g);
  }
  return g;
}

/** Tunele oznaczamy literą grecką – tak samo jak na kaflach w pudełku. */
const WORMHOLE_ICON = {
  ALPHA: 'α', BETA: 'β', GAMMA: 'γ', DELTA: 'δ', EPSILON: 'ε',
};

/* Róż nie występuje nigdzie indziej na mapie: ani wśród anomalii (czerwień), ani wśród cech
   i specjalizacji (zieleń, czerwień, błękit, żółć), ani na tłach kafli. Dzięki temu litera
   tunelu wyskakuje z kafla nawet na jasnej grafice.
   Odcień celowo z małą składową niebieską – przy większej litera czytała się jak fioletowa. */
export const WORMHOLE_COLOR = '#ff3d9b';

/* Zwykły znak nad kaflem ma grubą czarną otoczkę (3 px), żeby dało się go odczytać na
   dowolnej grafice. Na różu otoczka zjadała jasność liter i całość szarzała w fiolet,
   więc tunele dostają otoczkę cieńszą – i większy stopień pisma, bo greckie litery są
   drobniejsze od pozostałych znaków nad kaflem. */
const WORMHOLE_STROKE = 1.2;
const WORMHOLE_FONT = 17;

const LEGENDARY_ICON = '★';

/* Zasoby i wpływy mają na kartach planet własne barwy: zasób jest żółty, wpływ niebieski.
   Na mapie trzymamy się tego samego, żeby nie trzeba było pamiętać, która liczba jest która.
   Ukośnik zostaje neutralny – jest tylko przecinkiem między liczbami. */
export const RES_COLOR = '#ffd76a';
export const INF_COLOR = '#6fb4ff';
export const SLASH_COLOR = '#aab6c8';

/**
 * Barwy tła kafli. Cztery najczęstsze anomalie mają własne odcienie, żeby dało się je
 * rozpoznać po wyłączeniu grafik; z tej samej tablicy korzysta legenda, więc opis
 * nie może rozjechać się z tym, co naprawdę jest rysowane.
 */
export const TILE_FILL = {
  blue: '#11253d',
  red: '#2b1417',
  mecatol: '#5a3a12',
  // Heks domu wygląda jak puste gniazdo, dopóki gracz nie ma wybranej barwy – wybór rasy
  // sam w sobie nie zmienia tła. Dopiero barwa gracza pokrywa cały heks.
  home: '#141821',
  hyperlane: '#2a2a1a',
  empty: '#141821',
  other: '#181c24',
  supernova: '#5c1f10',
  nebula: '#3a1f4d',
  asteroid_field: '#3a3326',
  gravity_rift: '#1b1b33',
};

/**
 * Opis każdej barwy tła: nazwa typu heksa i zdanie wyjaśnienia. Z tej samej tablicy
 * korzysta legenda i panel szczegółów kafla, więc nazwa typu nie może się rozjechać.
 */
export const TILE_BACKGROUNDS = [
  { key: 'blue', label: 'system z planetami', desc: 'Kafel o niebieskim rewersie.' },
  { key: 'red', label: 'pusty system lub goły tunel', desc: 'Kafel o czerwonym rewersie bez anomalii.' },
  { key: 'supernova', label: 'supernowa' },
  { key: 'nebula', label: 'mgławica' },
  { key: 'asteroid_field', label: 'pole asteroid' },
  { key: 'gravity_rift', label: 'rozdarcie grawitacyjne' },
  { key: 'mecatol', label: 'Mecatol Rex', desc: 'Środek planszy – kafel 18.' },
  {
    key: 'home', label: 'system domowy',
    desc: 'Dopóki gracz nie ma wybranej barwy, heks jego domu wygląda tak samo jak puste '
      + 'gniazdo – wybór rasy nie zmienia tła. Po wybraniu barwy cały heks przyjmuje ten kolor.',
  },
  {
    key: 'hyperlane', label: 'hiperpas',
    desc: 'Nie jest systemem – łączy sąsiednie pola trasą ruchu. Po wyłączeniu grafik na kaflu '
      + 'rysowane są same trasy, więc widać, który bok łączy się z którym.',
  },
  { key: 'empty', label: 'puste gniazdo', desc: 'Miejsce układu, na którym nie leży jeszcze żaden kafel.' },
  { key: 'other', label: 'pozostałe', desc: 'Kafle specjalne spoza zwykłej puli.' },
];

/** Który wpis z TILE_FILL opisuje ten system. */
function tileFillKey(sys) {
  if (!sys) return 'empty';
  if (sys.category === 'mecatol') return 'mecatol';
  if (sys.category === 'home') return 'home';
  if (sys.category === 'hyperlane') return 'hyperlane';
  for (const key of ['supernova', 'nebula', 'asteroid_field', 'gravity_rift']) {
    if (sys.anomalies.includes(key)) return key;
  }
  if (sys.category === 'red') return 'red';
  if (sys.category === 'blue') return 'blue';
  return 'other';
}

/** Typ heksa: barwa tła, nazwa i wyjaśnienie – to, co pokazuje panel po kliknięciu kafla. */
export function tileFillInfo(sys) {
  const key = tileFillKey(sys);
  const entry = TILE_BACKGROUNDS.find((b) => b.key === key) || {};
  return { key, color: TILE_FILL[key], label: entry.label || key, desc: entry.desc || '' };
}

/** Cechy planet – trzy, każda ma własny kształt i barwę jak na kartach planet. */
export const TRAIT_COLOR = {
  INDUSTRIAL: '#31b34a',   // zielona zębatka
  HAZARDOUS: '#e8443a',    // czerwony odwrócony trójkąt
  CULTURAL: '#3d8bff',     // niebieska przechylona elipsa z kropką
};

/** Specjalizacje technologiczne – jeden kształt (sześciokąt), cztery barwy technologii. */
export const TECH_COLOR = {
  BIOTIC: '#31b34a', WARFARE: '#e8443a', PROPULSION: '#3d8bff', CYBERNETIC: '#f0c419',
};

/**
 * Zębatka: `teeth` zębów o płaskich wierzchołkach i stromych bokach.
 * Mało zębów i głęboka dolina (rIn dużo mniejsze od rOut) – przy ośmiu płytkich
 * ząbkach kształt czytało się jak słońce, a nie jak koło zębate.
 */
function gearPath(rOut, rIn, teeth = 6) {
  const step = (Math.PI * 2) / teeth;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(
      [rOut, a],                    // początek płaskiego wierzchołka zęba
      [rOut, a + step * 0.38],      // koniec wierzchołka
      [rIn, a + step * 0.50],       // stromy bok w dół
      [rIn, a + step * 0.88],       // dno między zębami
    );                              // z dna wracamy stromo do następnego zęba
  }
  return pts.map(([r, a], i) => `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`).join('') + 'Z';
}

/**
 * Wektory od środka heksa do środków sześciu krawędzi, w kolejności kierunków z hex.js.
 * Liczone raz z rzeczywistej geometrii sąsiadów, żeby nie powielać wzorów.
 */
const EDGE_MID = (() => {
  const c = pixel('000', R);
  return neighbors('000').map((n) => {
    const p = pixel(n, R);
    return [(p.x - c.x) / 2, (p.y - c.y) / 2];
  });
})();

/** Barwa tras hiperpasów rysowanych, gdy grafiki kafli są wyłączone. */
/* Numery w bocznych rogach heksa: pozycja po lewej na neutralnej podkładce, numer kafla
   po prawej na lekko czerwonej. Z tych samych stałych korzysta legenda. */
export const POS_PLATE = '#141821';
export const POS_INK = '#9fb0c9';
export const TILE_PLATE = '#3a161b';
export const TILE_INK = '#f0bcbc';

export const HYPERLANE_COLOR = '#d3c48f';

/**
 * Hiperpasy: macierz 6×6 mówi, który bok kafla łączy się z którym.
 * Rysujemy każde połączenie jako łuk przez środek heksa, żeby było widać,
 * co z czym jest połączone także wtedy, gdy grafika kafla jest wyłączona.
 */
function drawHyperlanes(g, sys) {
  const m = sys?.hyperlane;
  if (!m) return;
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      if (!m[i]?.[j]) continue;
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const [ax, ay] = EDGE_MID[i];
      const [bx, by] = EDGE_MID[j];
      el('path', {
        d: `M${ax.toFixed(2)} ${ay.toFixed(2)}Q0 0 ${bx.toFixed(2)} ${by.toFixed(2)}`,
        fill: 'none', stroke: HYPERLANE_COLOR, 'stroke-width': 5,
        'stroke-linecap': 'round', class: 'hyperlane',
      }, g);
    }
  }
}

/** Sześciokąt ostrym wierzchołkiem do góry – znak specjalizacji technologicznej. */
const techHexPath = (r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (60 * i - 90);
  return `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
}).join('') + 'Z';

/**
 * Rysuje jedną ikonę cechy planety albo specjalizacji technologicznej.
 * Używa jej i mapa, i legenda – dzięki temu nie da się ich rozjechać.
 * `spec` to { kind: 'trait' | 'tech', key } , `r` to promień ikony.
 */
export function drawPlanetIcon(parent, spec, r) {
  const g = el('g', { class: `picon ${spec.kind}` }, parent);
  const dark = '#0a0d13';
  if (spec.kind === 'tech') {
    el('path', { d: techHexPath(r), fill: TECH_COLOR[spec.key] || '#8a97ad', stroke: dark, 'stroke-width': 1.4 }, g);
    return g;
  }
  const color = TRAIT_COLOR[spec.key] || '#8a97ad';
  if (spec.key === 'INDUSTRIAL') {
    el('path', { d: gearPath(r, r * 0.6), fill: color, stroke: dark, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, g);
    el('circle', { cx: 0, cy: 0, r: r * 0.34, fill: dark }, g);
  } else if (spec.key === 'HAZARDOUS') {
    el('path', {
      d: `M${-r} ${-r * 0.72}L${r} ${-r * 0.72}L0 ${r * 0.92}Z`,
      fill: color, stroke: dark, 'stroke-width': 1.2, 'stroke-linejoin': 'round',
    }, g);
  } else {
    el('ellipse', {
      cx: 0, cy: 0, rx: r * 1.05, ry: r * 0.52, transform: 'rotate(45)',
      fill: color, stroke: dark, 'stroke-width': 1.2,
    }, g);
    el('circle', { cx: 0, cy: 0, r: r * 0.26, fill: dark }, g);
  }
  return g;
}

/**
 * Legenda mapy: symbol, nazwa i zdanie mówiące, co ten symbol oznacza w grze.
 * `kind` decyduje, jak narysować próbkę w panelu legendy.
 */
export const MAP_LEGEND = [
  {
    group: 'System domowy',
    intro: 'Gniazda startowe graczy. W środku stoi ikona domu z numerem gracza. Po wybraniu '
      + 'barwy cały heks przyjmuje ten kolor (w widoku bez grafik), a przy włączonych grafikach '
      + 'barwę niesie obrys kafla. Bez wybranej barwy dom jest szary, a tło heksa takie samo '
      + 'jak puste gniazdo.',
    items: [
      { kind: 'homeOutline', label: 'dom bez rasy', desc: 'Sam obrys – gracz nie ma jeszcze wybranej rasy.' },
      { kind: 'home', label: 'dom z wybraną rasą', desc: 'Pełne wypełnienie barwą gracza; pod domem nazwa rasy.' },
      { kind: 'homeGrey', label: 'dom bez barwy', desc: 'Szary – graczowi nie przypisano jeszcze koloru.' },
    ],
  },
  {
    group: 'Parametry systemu',
    intro: 'Liczby i znaki mówiące, co system daje graczowi, który go kontroluje. '
      + 'Włącza je pole „zasoby” w pasku nad mapą.',
    items: [
      {
        kind: 'value', sym: '3/2', label: 'zasoby / wpływy',
        desc: 'Suma z wszystkich planet systemu. Żółta liczba to zasoby – idą na produkcję i badania. '
          + 'Niebieska to wpływy – idą na głosy i rozkazy. Te same barwy mają obie wartości na kartach planet.',
      },
      { kind: 'badge', sym: '★', label: 'planeta legendarna', desc: 'W systemie leży planeta z dodatkową zdolnością.' },
    ],
  },
  {
    group: 'Cechy planet',
    intro: 'Cecha to rodzaj planety. Liczy się przy kartach celów i zdolnościach, które wymagają '
      + 'kontroli planet danego rodzaju. Każda planeta w systemie dostaje własną ikonę. Na kaflu '
      + 'cechy stoją w górnym rzędzie, na własnym prostokącie tła – pod nim, na osobnym '
      + 'prostokącie, idą specjalizacje technologiczne.',
    items: [
      { kind: 'planeticon', spec: { kind: 'trait', key: 'INDUSTRIAL' }, label: 'przemysłowa' },
      { kind: 'planeticon', spec: { kind: 'trait', key: 'HAZARDOUS' }, label: 'niegościnna' },
      { kind: 'planeticon', spec: { kind: 'trait', key: 'CULTURAL' }, label: 'kulturalna' },
    ],
  },
  {
    group: 'Specjalizacje technologiczne',
    intro: 'Planeta ze specjalizacją pozwala pominąć jedno wymaganie tego koloru przy badaniu '
      + 'technologii. Znakiem jest sześciokąt w barwie technologii. Na kaflu specjalizacje mają '
      + 'własny prostokąt tła, pod prostokątem z cechami planet – łatwiej je wtedy policzyć.',
    items: [
      { kind: 'planeticon', spec: { kind: 'tech', key: 'BIOTIC' }, label: 'biotyczna' },
      { kind: 'planeticon', spec: { kind: 'tech', key: 'WARFARE' }, label: 'wojenna' },
      { kind: 'planeticon', spec: { kind: 'tech', key: 'PROPULSION' }, label: 'napędowa' },
      { kind: 'planeticon', spec: { kind: 'tech', key: 'CYBERNETIC' }, label: 'cybernetyczna' },
    ],
  },
  {
    group: 'Tunele czasoprzestrzenne',
    intro: 'Systemy z tunelem tego samego typu sąsiadują ze sobą, choćby leżały na przeciwnych '
      + 'krańcach planszy – statek przechodzi między nimi jednym ruchem. Zasady rozkładania nie '
      + 'pozwalają położyć obok siebie dwóch tuneli tego samego typu.',
    items: [
      {
        kind: 'badge', color: WORMHOLE_COLOR, sym: 'α β γ δ ε', label: 'typ tunelu',
        desc: 'Łączą się tylko tunele oznaczone tą samą literą. Róż jest zarezerwowany dla '
          + 'tuneli – żaden inny znak na mapie nie ma tej barwy.',
      },
    ],
  },
  {
    group: 'Anomalie',
    intro: 'Anomalie utrudniają albo całkiem blokują ruch. Kafel z anomalią ma czerwone kreski '
      + 'w sześciu narożnikach – tak jak oryginalny kafel z pudełka. Widać je zawsze, niezależnie '
      + 'od opcji widoku; systemy domowe ich nie dostają, bo tam obrys niesie barwę gracza.',
    items: [
      { kind: 'redcorner', label: 'czerwone narożniki', desc: 'Znak kafla z anomalią.' },
      { kind: 'badge', color: ANOMALY_COLOR, sym: ANOMALY_ICON.supernova, label: 'supernowa', desc: 'Statki nie mogą tu wpłynąć.' },
      {
        kind: 'badge', color: ANOMALY_COLOR, sym: ANOMALY_ICON.nebula, label: 'mgławica',
        desc: 'Wpłynięcie kończy ruch, obrońca ma +1 w bitwie, wyjście tylko z szybkością 1.',
      },
      { kind: 'asteroids', color: ANOMALY_COLOR, label: 'pole asteroid', desc: 'Wejście wymaga technologii Antimass Deflector.' },
      {
        kind: 'badge', color: ANOMALY_COLOR, sym: ANOMALY_ICON.gravity_rift, label: 'rozdarcie grawitacyjne',
        desc: 'Wychodzący statek dostaje +1 do ruchu, ale rzuca kością – przy niskim wyniku ginie.',
      },
      { kind: 'badge', color: ANOMALY_COLOR, sym: ANOMALY_ICON.entropic_scar, label: 'entropiczna blizna', desc: 'Anomalia z dodatku Kraniec Burzy.' },
      { kind: 'badge', color: ANOMALY_COLOR, sym: ANOMALY_ICON.fracture, label: 'Fracture', desc: 'Anomalia z dodatku Kraniec Burzy.' },
      { kind: 'badge', color: ANOMALY_COLOR, sym: '✦', label: 'inna anomalia', desc: 'Anomalia bez osobnego symbolu.' },
    ],
  },
  {
    group: 'Tło kafla',
    intro: 'Barwa leżąca pod grafiką kafla – widać ją po wyłączeniu pola „grafiki”. Cztery '
      + 'najczęstsze anomalie mają własne odcienie, żeby dało się je rozpoznać bez grafiki; '
      + 'pozostałe zostają przy zwykłym czerwonym.',
    // System domowy pomijamy – ma własną grupę z ikoną domu, a jego tło i tak jest takie samo
    // jak puste gniazdo, dopóki gracz nie wybierze barwy. Osobna próbka tylko myliła.
    items: TILE_BACKGROUNDS.filter((b) => b.key !== 'home').map((b) => ({
      kind: 'swatch', sym: TILE_FILL[b.key], label: b.label, desc: b.desc,
    })),
  },
  {
    group: 'Obrys i zaznaczenie',
    intro: 'Znaki, które nie opisują samego systemu, tylko to, co robisz z mapą.',
    items: [
      { kind: 'ring', label: 'biała obwódka', desc: 'Kafel zaznaczony kliknięciem – szczegóły widać w panelu po prawej.' },
      {
        kind: 'chip', bg: POS_PLATE, ink: POS_INK, sym: '301', label: 'numer pozycji – lewy róg',
        desc: 'Numer gniazda na planszy: pierwsza cyfra to pierścień wokół Mecatolu, kolejne dwie – '
          + 'miejsce w pierścieniu, liczone od góry zgodnie z ruchem wskazówek zegara. Włącza go pole '
          + '„pozycje” w pasku nad mapą.',
      },
      {
        kind: 'chip', bg: TILE_PLATE, ink: TILE_INK, sym: '19', label: 'numer kafla – prawy róg',
        desc: 'Numer wydrukowany na samym kaflu – ten, którym posługuje się map string i zapis mapy. '
          + 'Włącza go pole „kafle” w pasku nad mapą.',
      },
    ],
  },
];

const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

/**
 * Sylwetka domu. `s` to połowa szerokości dachu.
 *
 * Dwie rzeczy decydują o tym, czy kształt czyta się jak dom, a nie jak namiot:
 * korpus musi być wyższy od dachu (tu 1,05·s wobec 0,85·s) oraz okap ma być
 * lekko skośny – poziomy okap zostawiał po bokach dwa cienkie, sterczące kolce.
 */
export const housePath = (s) => {
  const eave = -s * 0.05;      // linia okapu – tu dach siada na ścianach
  const wall = s * 0.62;       // połowa szerokości korpusu
  const base = s * 0.95;       // podstawa
  const p = (x, y) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  return `M${p(0, -s * 0.75)}`          // kalenica
    + `L${p(s, eave)}`                  // prawy okap
    + `L${p(wall, eave)}`               // próg: dach wystaje poza ścianę
    + `L${p(wall, base)}`               // prawa ściana
    + `L${p(-wall, base)}`              // podstawa
    + `L${p(-wall, eave)}`              // lewa ściana
    + `L${p(-s, eave)}`                 // lewy okap
    + 'Z';
};

export function renderMap(svg, state) {
  const { placement, layout, sysById, planetById, players, options, analysis, selected } = state;
  svg.textContent = '';

  const positions = [...new Set([
    '000', ...layout.homes, ...layout.slots, ...Object.keys(layout.hyperlanes || {}), ...Object.keys(placement),
  ])];
  const pts = positions.map((p) => ({ pos: p, ...pixel(p, R) }));
  const minX = Math.min(...pts.map((p) => p.x)) - R * 1.2;
  const maxX = Math.max(...pts.map((p) => p.x)) + R * 1.2;
  const minY = Math.min(...pts.map((p) => p.y)) - H * 0.6;
  const maxY = Math.max(...pts.map((p) => p.y)) + H * 0.6;
  svg.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);

  const defs = el('defs', {}, svg);
  const clip = el('clipPath', { id: 'hexclip', clipPathUnits: 'objectBoundingBox' }, defs);
  el('path', { d: 'M1,0.5L0.75,0.933L0.25,0.933L0,0.5L0.25,0.067L0.75,0.067Z' }, clip);

  const gTiles = el('g', {}, svg);
  const names = [];               // nazwy rysujemy dopiero po kaflach – patrz niżej

  // Gniazdo domowe wiążemy z graczem przez jego pozycję, a nie przez kolejność w układzie –
  // numery graczy da się przestawiać niezależnie od tego, jak układ wylicza gniazda.
  const homeSet = new Set(layout.homes);
  const seatByPos = new Map();
  for (const p of players) if (p.homePos) seatByPos.set(p.homePos, p);

  for (const { pos, x, y } of pts) {
    const tileId = placement[pos];
    const sys = sysById.get(tileId);
    const g = el('g', { class: 'tile', 'data-pos': pos, transform: `translate(${x} ${y})` }, gTiles);

    const isHome = homeSet.has(pos);
    const seat = isHome ? seatByPos.get(pos) || null : null;

    // podkład
    // Gniazdo domowe bierze barwę swojego gracza jako tło. Gdy na wierzchu leży grafika
    // kafla, tło i tak jej nie widać – wtedy barwę niesie obrys dookoła heksa.
    const imageOnTop = !!(sys?.image && options.showImages);
    const homeTint = isHome && seat?.colorId && !imageOnTop;
    const fill = homeTint ? seat.color : (sys ? tileFill(sys) : TILE_FILL.empty);
    el('path', { d: hexPath(0, 0, R), fill, class: 'tile-bg' }, g);

    if (sys?.image && options.showImages) {
      el('image', {
        href: `tiles/${sys.image}`, x: -R, y: -H / 2, width: 2 * R, height: H,
        preserveAspectRatio: 'none', 'clip-path': 'url(#hexclip)',
      }, g);
    } else if (sys?.category === 'hyperlane') {
      drawHyperlanes(g, sys);         // bez grafiki trasy trzeba narysować samemu
    }

    // sąsiedztwo – barwa gracza, do którego domu kaflowi jest najbliżej
    if (options.showSlices && analysis?.weights?.has(pos)) {
      drawNeighbourhood(g, analysis.weights.get(pos), options);
    }

    // Jedna grubość obrysu dla każdego kafla; dom wyróżnia sam kolor.
    // Obrys wsunięty o pół grubości do środka: gdyby biegł dokładnie po promieniu R,
    // jego zewnętrzna połowa leżałaby w polu sąsiada i zamalowywałby ją kafel
    // rysowany później – obrys rwał się wtedy na przypadkowe odcinki.
    el('path', {
      d: hexPath(0, 0, R - TILE_STROKE / 2), fill: 'none', class: 'tile-border',
      stroke: isHome ? (seat?.color || NEUTRAL_COLOR) : '#0b0d12',
      'stroke-width': TILE_STROKE,
    }, g);

    // Czerwone narożniki mają na sobie tylko kafle z anomalią – tak jak na oryginalnych
    // kaflach z pudełka. Rysujemy je zawsze, niezależnie od włączonych opcji widoku.
    // Systemy domowe są z tego wyłączone, nawet gdy same są anomalią (np. The Dark, Nova Seed):
    // tam obrys kafla niesie barwę gracza i czerwone kreski tylko by ją zaburzały.
    if (sys?.anomalies.length && !isHome && sys.category !== 'home') drawRedCorners(g);

    if (selected === pos) {
      el('path', { d: hexPath(0, 0, R * 0.93), fill: 'none', stroke: '#fff', 'stroke-width': TILE_STROKE }, g);
    }

    // Numer na pustym gnieździe rysujemy na środku tylko wtedy, gdy nie ma go już w rogu –
    // dwa te same numery na jednym kaflu tylko by myliły.
    if (!sys && !isHome && !options.showPositions) {
      el('text', { class: 'lbl empty', x: 0, y: 5, 'text-anchor': 'middle' }, g).textContent = pos;
    }

    // Dwa osobne przełączniki: numer gniazda po lewej, numer kafla po prawej.
    if (options.showPositions) drawCornerNumber(g, pos, -POS_X, POS_PLATE, POS_INK);
    // numer kafla ma tylko gniazdo, na którym coś leży
    if (options.showTileIds && sys) drawCornerNumber(g, String(sys.id), POS_X, TILE_PLATE, TILE_INK);

    const addName = (label) => names.push({ x, y, label });

    // Na kaflach domowych nie piszemy nazw – tam idzie ikona domu.
    if (sys && !isHome) drawTileText(g, sys, options, planetById, addName);

    if (isHome) drawHome(g, seat, pos, sys, options, planetById, homeTint, addName);
  }

  // Nazwy idą na wierzch, już po wszystkich kaflach: długa nazwa może wyjść poza swój heks
  // i nie zostanie zamalowana przez kafel rysowany później. Warstwa nie łapie kliknięć,
  // więc napis wystający na sąsiada nie przeszkadza w wybraniu tamtego kafla.
  const gLabels = el('g', { class: 'labels' }, svg);
  for (const { x, y, label } of names) {
    drawSystemName(el('g', { transform: `translate(${x} ${y})` }, gLabels), label, NAME_Y);
  }
  return svg;
}

/** Wierzchołki heksa o promieniu R – kolejność zgodna z hexPath(). */
const hexCorners = (r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 180) * (60 * i);
  return [r * Math.cos(a), r * Math.sin(a)];
});

export const RED_CORNER_COLOR = ANOMALY_COLOR;
const RED_CORNER_LEN = 0.17;   // jaka część krawędzi przy każdym narożniku

/** Krótkie czerwone kreski w każdym z sześciu narożników – znak czerwonego rewersu. */
function drawRedCorners(g) {
  const c = hexCorners(R * 0.97);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const seg = [];
  for (let i = 0; i < 6; i++) {
    const a = c[i];
    const b = c[(i + 1) % 6];
    const p = lerp(a, b, RED_CORNER_LEN);
    const q = lerp(b, a, RED_CORNER_LEN);
    seg.push(`M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${p[0].toFixed(2)} ${p[1].toFixed(2)}`);
    seg.push(`M${q[0].toFixed(2)} ${q[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`);
  }
  el('path', {
    d: seg.join(''), fill: 'none', class: 'red-corner',
    stroke: RED_CORNER_COLOR, 'stroke-width': 3.5, 'stroke-linecap': 'round',
  }, g);
}

/**
 * Sąsiedztwo: kafel dostaje barwę gracza, który ma do niego najbliżej.
 * Kafel jednakowo oddalony od kilku domów dzieli się między nich – wtedy
 * wypisujemy udziały procentowe, każdy w barwie swojego gracza.
 * Kolory przychodzą z zewnątrz (options.sliceColors), bo są ustalane dopiero
 * wtedy, gdy wszystkie rasy są wybrane.
 */
function drawNeighbourhood(g, w, options) {
  const total = w.reduce((a, b) => a + b, 0);
  if (!total) return;
  const colors = options.sliceColors || [];
  const best = w.indexOf(Math.max(...w));
  el('path', {
    d: hexPath(0, 0, R * 0.99),
    fill: colors[best] || PLAYER_COLORS[best % PLAYER_COLORS.length],
    opacity: 0.3,
  }, g);

  const shares = w.map((v, i) => ({ i, pct: Math.round((v / total) * 100) })).filter((s) => s.pct > 0);
  if (shares.length < 2) return;           // kafel w całości jednego gracza – bez liczb
  // pas między znakami u góry kafla a ramką ikon cech/specjalizacji
  const t = el('text', { class: 'share', x: 0, y: -H / 2 + 28, 'text-anchor': 'middle' }, g);
  shares.forEach((s, k) => {
    if (k) el('tspan', { fill: '#c9d2e0' }, t).textContent = ' · ';
    el('tspan', { fill: colors[s.i] || PLAYER_COLORS[s.i % PLAYER_COLORS.length] }, t)
      .textContent = `${s.pct}%`;
  });
}

/**
 * Nazwa systemu wpisana w kafel. Kafel ma 2·R szerokości, więc długie nazwy
 * (np. „Loki/Ashtroth/Abaddon”) ścinamy, a resztę dociskamy atrybutem textLength,
 * żeby napis nie wychodził na sąsiedni kafel.
 */
const NAME_Y = H / 2 - 21;         // pas nazwy – nisko, tuż nad zasobami

/* Dwa numery w bocznych rogach heksa. W LEWYM stoi numer pozycji na planszy (gniazdo),
   w PRAWYM – numer samego kafla, ten wydrukowany na kartonie. Żeby nie dało się ich pomylić,
   numer kafla ma lekko czerwoną podkładkę, a numer pozycji neutralną ciemną.
   Boczne rogi to jedyne miejsca, gdzie nic innego nie stoi: znaki idą górą na środku,
   tabliczki z ikonami środkiem, a nazwa i zasoby dołem. */
const POS_X = 42.5;                // tuż przy wierzchołku, poza zasięgiem tabliczek z ikonami
const POS_FONT = 9;                // o dwa punkty mniej niż nazwa systemu – numer ma nie krzyczeć

/** Numer w bocznym rogu heksa: cyfry na własnej podkładce, czytelne także na grafice kafla. */
function drawCornerNumber(g, text, x, plate, ink) {
  const w = text.length * POS_FONT * 0.62 + 5;
  const h = POS_FONT + 3.5;
  el('rect', {
    x: (x - w / 2).toFixed(2), y: (-h / 2).toFixed(2), width: w.toFixed(2), height: h.toFixed(2),
    rx: 2.5, fill: plate, opacity: 0.9, stroke: '#ffffff33', 'stroke-width': 1,
    class: 'pos-plate',
  }, g);
  el('text', {
    class: 'pos-num', x, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central',
    style: `fill:${ink}`,
  }, g).textContent = text;
}

/**
 * Nazwa systemu. Długiej nazwy NIE ściskamy – ściśnięte litery były nieczytelne, a to
 * właśnie najdłuższe nazwy trzeba umieć przeczytać. Napis zawsze jest wyśrodkowany na
 * kaflu i może wyjść poza jego obrys; żeby sąsiedni kafel go nie zamalował, wszystkie
 * nazwy rysowane są na osobnej warstwie, nad wszystkimi kaflami.
 */
function drawSystemName(g, name, y) {
  const short = name.length > 24 ? `${name.slice(0, 23)}…` : name;
  // rozmiar ustawia klasa .lbl.name w styles.css – atrybut font-size przegrywa z regułą CSS
  const t = el('text', { class: 'lbl name', x: 0, y, 'text-anchor': 'middle' }, g);
  t.textContent = short;
  return t;
}

/* Cechy planet i specjalizacje technologiczne stoją w dwóch rzędach: cechy u góry,
   specjalizacje pod nimi. Każdy rodzaj ma WŁASNY prostokąt tła – dzięki temu od razu widać,
   gdzie kończą się cechy, a zaczynają specjalizacje. Rogi prostokątów są ledwo ścięte, żeby
   ramka czytała się jak tabliczka, a nie jak pigułka. */
/* Oba rzędy używają JEDNEGO promienia ikony i jednego rozstawu. Dzięki temu prostokąty tła
   zawsze mają identyczną wysokość, a przy tej samej liczbie ikon w obu rzędach (np. jedna
   cecha i jedna specjalizacja) wychodzą dokładnie takie same – i szerokością, i wysokością.
   Wcześniej specjalizacje były o kreskę mniejsze i tabliczki się nie zgadzały. */
const ICON_R = 7.5;
const ICON_STEP = 18.5;
const ICON_PAD_X = 3;              // margines prostokąta po bokach
const ICON_PAD_Y = 1;              // margines prostokąta u góry i u dołu
const ICON_ROW_GAP = 3;            // przerwa między prostokątem cech a prostokątem specjalizacji
const ICON_PLATE_RX = 1.5;         // minimalne zaokrąglenie rogów
const ICON_BLOCK_Y = -2.5;         // środek całego bloku względem środka kafla

/** Klucze ikon jednego rodzaju dla wszystkich planet systemu. */
function planetIconSpecs(sys, planetById, kind) {
  const out = [];
  const table = kind === 'tech' ? TECH_COLOR : TRAIT_COLOR;
  for (const pid of sys.planets) {
    const p = planetById?.get(pid);
    if (!p) continue;
    for (const key of (kind === 'tech' ? p.tech : p.types) || []) {
      if (table[key]) out.push({ kind, key });
    }
  }
  return out;
}

/**
 * Cechy planet i specjalizacje technologiczne – każdy rodzaj we własnym rzędzie
 * i na własnym prostokącie tła. Wysokość prostokąta jest zawsze ta sama, a szerokość
 * odpowiada liczbie ikon w rzędzie – przy równej liczbie ikon (np. jedna cecha i jedna
 * specjalizacja) obie tabliczki wychodzą identyczne. Przy jednym włączonym rodzaju
 * zostaje na kaflu jedna tabliczka.
 */
function drawPlanetIcons(g, sys, options, planetById) {
  const rows = [];
  if (options.showTraits) {
    const specs = planetIconSpecs(sys, planetById, 'trait');
    if (specs.length) rows.push(specs);
  }
  if (options.showTechs) {
    const specs = planetIconSpecs(sys, planetById, 'tech');
    if (specs.length) rows.push(specs);
  }
  if (!rows.length) return;

  // wysokość jest wspólna dla wszystkich rzędów – zależy tylko od promienia ikony
  const h = 2 * ICON_R + 2 * ICON_PAD_Y;
  const total = rows.length * h + ICON_ROW_GAP * (rows.length - 1);
  let top = ICON_BLOCK_Y - total / 2;

  for (const specs of rows) {
    const w = (specs.length - 1) * ICON_STEP + 2 * ICON_R + 2 * ICON_PAD_X;
    el('rect', {
      x: (-w / 2).toFixed(2), y: top.toFixed(2), width: w.toFixed(2), height: h.toFixed(2),
      rx: ICON_PLATE_RX, fill: '#0a0d13', opacity: 0.78, stroke: '#ffffff4d', 'stroke-width': 1.2,
      class: `icon-plate ${specs[0].kind}`,
    }, g);

    const y = top + h / 2;
    const x0 = -((specs.length - 1) * ICON_STEP) / 2;
    specs.forEach((spec, i) => {
      const holder = el('g', { transform: `translate(${(x0 + i * ICON_STEP).toFixed(2)} ${y.toFixed(2)})` }, g);
      drawPlanetIcon(holder, spec, ICON_R);
    });
    top += h + ICON_ROW_GAP;
  }
}

/**
 * Symbole nad kaflem – każda grupa ma własny przełącznik widoku.
 * Anomalie idą na czerwono, tak jak narożniki kafla, tunele na róż; gwiazdka zostaje jasna.
 */
function tileBadges(sys, options) {
  const badges = [];
  if (options.showAnomalies) {
    badges.push(...sys.anomalies.map((a) => (a === 'asteroid_field'
      ? { shape: 'asteroids', color: ANOMALY_COLOR }
      : { sym: ANOMALY_ICON[a] || '✦', color: ANOMALY_COLOR })));
  }
  if (options.showWormholes) {
    badges.push(...sys.wormholes.map((w) => ({
      sym: WORMHOLE_ICON[w] || w[0], color: WORMHOLE_COLOR,
      strokeWidth: WORMHOLE_STROKE, fontSize: WORMHOLE_FONT,
    })));
  }
  if (options.showParams && sys.legendary.length) badges.push({ sym: LEGENDARY_ICON, color: null });
  return badges;
}

/* Znaki nad kaflem stoją w równym rozstawie, każdy osobno – tylko wtedy da się podłożyć
   pod wybrany znak krążek tła. Środek znaku (a nie linia pisma) leży na BADGE_Y, więc
   krążek i litera są wyśrodkowane na sobie. */
const BADGE_Y = -H / 2 + 10;
const BADGE_STEP = 19;

/** Rysuje rządek znaków u góry kafla, każdy we własnej barwie. */
function drawBadges(g, badges) {
  if (!badges.length) return;
  const x0 = -((badges.length - 1) * BADGE_STEP) / 2;
  badges.forEach((b, i) => {
    const x = +(x0 + i * BADGE_STEP).toFixed(2);
    if (b.shape === 'asteroids') {
      drawAsteroidIcon(el('g', { transform: `translate(${x} ${BADGE_Y})` }, g), 8, b.color);
      return;
    }
    el('text', {
      class: 'badge', x, y: BADGE_Y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      // styl, nie atrybut: regułę .badge z arkusza przebija dopiero styl inline
      style: [b.color && `fill:${b.color}`, b.fontSize && `font-size:${b.fontSize}px`]
        .filter(Boolean).join(';') || null,
      'stroke-width': b.strokeWidth ?? null,
    }, g).textContent = b.sym;
  });
}

/** Nazwa systemu i jego parametry – niezależne opcje widoku. */
function drawTileText(g, sys, options, planetById, addName) {
  drawBadges(g, tileBadges(sys, options));
  if (options.showParams) {
    // najniżej, jak pozwala zwężający się heks – żeby zostało miejsce na nazwę nad spodem
    if (sys.res + sys.inf > 0) {
      const t = el('text', { class: 'val', x: 0, y: H / 2 - 6, 'text-anchor': 'middle' }, g);
      el('tspan', { fill: RES_COLOR }, t).textContent = String(sys.res);
      el('tspan', { fill: SLASH_COLOR }, t).textContent = '/';
      el('tspan', { fill: INF_COLOR }, t).textContent = String(sys.inf);
    }
  }
  drawPlanetIcons(g, sys, options, planetById);
  if (options.showNames && sys.name) addName(sys.name);
}

/**
 * System domowy: zamiast nazwy rasy rysujemy ikonę domu w barwie gracza.
 * Numer w środku to numer gracza – ten sam, który widać w zakładce „Gracze”.
 */
function drawHome(g, seat, pos, sys, options, planetById, homeTint, addName) {
  const hasFaction = !!seat?.faction;
  const s = R * 0.256;   // 20% mniej niż wcześniejsze 0,32
  const ink = '#0b0d12';
  const seatColor = seat?.colorId ? seat.color : NEUTRAL_COLOR;
  // Gdy heks ma już barwę gracza (widok bez grafik), domek rysujemy ciemny – inaczej zlałby się z tłem.
  const houseColor = homeTint ? ink : seatColor;
  // Numer musi kontrastować z tym, na czym leży: na wypełnionym domku jest jego przeciwieństwem,
  // na samym obrysie – w kolorze obrysu. Bez tego na ciemnym domku ginął.
  const numColor = hasFaction ? (homeTint ? seatColor : ink) : houseColor;

  // przyciemniony krążek tylko tam, gdzie pod spodem leży grafika kafla
  if (sys?.image && options.showImages) {
    el('circle', { cx: 0, cy: 0, r: R * 0.4, fill: '#080b11', opacity: 0.55 }, g);
  }

  // Dopóki gracz nie ma rasy, dom jest samym obrysem – wypełnia się dopiero z wyborem rasy.
  el('path', {
    d: housePath(s),
    fill: hasFaction ? houseColor : 'none',
    stroke: hasFaction ? (homeTint ? houseColor : '#080b11') : houseColor,
    'stroke-width': TILE_STROKE,
    'stroke-linejoin': 'round', class: 'home-icon',
  }, g);

  if (seat) {
    el('text', {
      class: 'home-num', x: 0, y: s * 0.69, 'text-anchor': 'middle',
      fill: numColor, 'font-size': s * 0.62,
    }, g).textContent = String(seat.index + 1);
  }

  drawBadges(g, tileBadges(sys || { anomalies: [], wormholes: [], legendary: [] }, options));

  if (sys) drawPlanetIcons(g, sys, options, planetById);

  // Na kaflu domowym nazwą jest nazwa rasy – pisana tak samo jak nazwy systemów.
  if (options.showNames) {
    const label = seat?.faction?.name || sys?.name;
    if (label) addName(label);
  }

  const who = seat?.faction ? seat.faction.name : 'brak wybranej rasy';
  const barwa = seat?.colorName ? `barwa: ${seat.colorName}` : 'barwa nieprzypisana (szary)';
  const nr = seat ? `Gracz ${seat.index + 1}` : 'wolne gniazdo';
  el('title', {}, g).textContent = `${nr} – ${who} · pozycja ${pos} · ${barwa}`;
}

const tileFill = (sys) => TILE_FILL[tileFillKey(sys)];

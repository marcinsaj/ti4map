/**
 * Biblioteka: przeglądarka ras i wszystkich kart (technologie, weksle, liderzy,
 * jednostki, przełomy). Renderuje się w szerokiej części okna, obok panelu opcji.
 */
import { $, $$, h, append, clear } from './dom.js';

let CTX = null;   // { data, t, tList, featureLabel }
let STATE = {
  view: 'factions',
  factionId: null,
  q: '',
  filters: { colour: 'all', expansion: 'all', scope: 'all', leaderType: 'all', faction: 'all' },
};

const VIEWS = [
  ['factions', 'Rasy'],
  ['technologies', 'Technologie'],
  ['promissory', 'Weksle'],
  ['leaders', 'Liderzy'],
  ['units', 'Jednostki'],
  ['breakthroughs', 'Przełomy'],
];

/* ---------------------------------------------------------------- */

/**
 * Pole wyszukiwania budowane jest RAZ i nigdy nie jest przebudowywane.
 * Wcześniej cały pasek filtrów powstawał na nowo przy każdym wciśniętym klawiszu,
 * przez co przeglądarka gubiła kursor po pierwszej literze.
 */
let searchInput = null;

export function initLibrary(ctx) {
  CTX = ctx;
  STATE.factionId = ctx.data.factions[0]?.id || null;
  const root = $('#library');
  clear(root);

  searchInput = h('input', {
    type: 'search', id: 'lib-search', placeholder: 'szukaj po nazwie i treści…', value: STATE.q,
    autocomplete: 'off',
  });
  searchInput.addEventListener('input', () => { STATE.q = searchInput.value; renderBody(); });
  const clearBtn = h('button', {
    class: 'search-clear', type: 'button', title: 'Wyczyść wyszukiwanie (Esc)',
    onclick: () => { STATE.q = ''; searchInput.value = ''; searchInput.focus(); renderBody(); },
  }, '✕');
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { STATE.q = ''; searchInput.value = ''; renderBody(); }
  });

  root.append(
    h('nav', { class: 'lib-tabs', id: 'lib-tabs' },
      ...VIEWS.map(([id, label]) => h('button', {
        class: 'chip' + (STATE.view === id ? ' active' : ''), 'data-view': id,
        onclick: () => { STATE.view = id; renderLibrary(); },
      }, label))),
    h('div', { class: 'lib-filters' },
      h('div', { class: 'lib-search' }, searchInput, clearBtn),
      h('div', { class: 'lib-selects', id: 'lib-selects' }),
      h('span', { class: 'lib-hint', id: 'lib-count' })),
    h('div', { class: 'lib-body', id: 'lib-body' }),
  );
  renderLibrary();
}

export function showFactionInLibrary(factionId) {
  STATE.view = 'factions';
  STATE.factionId = factionId;
  renderLibrary();
}

/** Pełne odświeżenie: zakładki + listy filtrów + treść (po zmianie widoku). */
export function renderLibrary() {
  if (!CTX) return;
  $$('#lib-tabs .chip').forEach((b) => b.classList.toggle('active', b.dataset.view === STATE.view));
  renderFilters();
  renderBody();
}

/** Odświeżenie samej treści – wywoływane przy pisaniu w wyszukiwarce. */
function renderBody() {
  const body = clear($('#lib-body'));
  ({
    factions: renderFactions,
    technologies: renderTechnologies,
    promissory: renderPromissory,
    leaders: renderLeaders,
    units: renderUnits,
    breakthroughs: renderBreakthroughs,
  })[STATE.view](body);
}

/** Podpis z liczbą znalezionych pozycji obok filtrów. */
function setCount(text) {
  const node = $('#lib-count');
  if (node) node.textContent = text;
}

/* ---------------------------------------------------------------- */
/*  Pasek filtrów                                                    */
/* ---------------------------------------------------------------- */

function selectFilter(key, label, options) {
  if (!options.some(([v]) => v === STATE.filters[key])) STATE.filters[key] = options[0][0];
  const sel = h('select', { onchange: (e) => { STATE.filters[key] = e.target.value; renderBody(); } },
    ...options.map(([v, l]) => h('option', { value: v }, l)));
  sel.value = STATE.filters[key];
  return h('label', { class: 'lib-filter' }, h('span', {}, label), sel);
}

function expansionOptions() {
  return [['all', 'wszystkie dodatki'], ...Object.values(CTX.data.meta.expansions).map((e) => [e.id, e.name])];
}
function factionOptions() {
  return [['all', 'wszystkie rasy'], ['generic', 'tylko ogólne (bez rasy)'],
    ...CTX.data.factions.map((f) => [f.id, factionLabel(f)])];
}

function renderFilters() {
  const bar = clear($('#lib-selects'));
  if (STATE.view === 'factions') return;
  if (STATE.view === 'technologies') {
    bar.append(selectFilter('colour', 'kolor', [
      ['all', 'wszystkie kolory'],
      ...Object.entries(CTX.data.meta.pl.techColors).map(([k, v]) => [k, `${v.name} (${v.colour})`]),
    ]));
    bar.append(selectFilter('scope', 'rodzaj', [
      ['all', 'ogólne i rasowe'], ['generic', 'tylko ogólne'], ['faction', 'tylko rasowe'],
    ]));
  }
  if (STATE.view === 'promissory') {
    bar.append(selectFilter('scope', 'rodzaj', [
      ['all', 'ogólne i rasowe'], ['generic', 'tylko ogólne (kolorowe)'], ['faction', 'tylko rasowe'],
    ]));
  }
  if (STATE.view === 'leaders') {
    bar.append(selectFilter('leaderType', 'typ', [
      ['all', 'wszyscy'], ['agent', 'agenci'], ['commander', 'dowódcy'], ['hero', 'bohaterowie'],
    ]));
  }
  if (STATE.view === 'units') {
    bar.append(selectFilter('scope', 'rodzaj', [
      ['all', 'ogólne i rasowe'], ['generic', 'tylko ogólne'], ['faction', 'tylko rasowe'],
    ]));
  }
  if (STATE.view !== 'factions') bar.append(selectFilter('faction', 'rasa', factionOptions()));
  bar.append(selectFilter('expansion', 'dodatek', expansionOptions()));
}

/* ---------------------------------------------------------------- */
/*  Wspólne pomocnicze                                               */
/* ---------------------------------------------------------------- */

const factionLabel = (f) => f.displayName || f.name;
const factionById = (id) => CTX.data.factions.find((f) => f.id === id);

function matches(card, extraText = '') {
  const q = STATE.q.trim().toLowerCase();
  const f = STATE.filters;
  if (f.expansion !== 'all' && card.expansion !== f.expansion) return false;
  if (f.faction === 'generic' && card.faction) return false;
  if (f.faction !== 'all' && f.faction !== 'generic' && card.faction !== f.faction) return false;
  if (f.scope === 'generic' && card.faction) return false;
  if (f.scope === 'faction' && !card.faction) return false;
  if (!q) return true;
  return `${card.name} ${card.text || ''} ${card.factionName || ''} ${extraText}`.toLowerCase().includes(q);
}

function expansionTag(card) {
  const e = CTX.data.meta.expansions[card.expansion];
  return h('span', { class: 'tag exp' }, e ? e.short : card.expansion);
}

/** Wymaganie technologii jako kolorowe kropki. */
function techPips(tech) {
  const colors = CTX.data.meta.pl.techColors;
  const pips = [];
  for (const [colour, n] of Object.entries(tech.cost || {})) {
    for (let i = 0; i < n; i++) {
      pips.push(h('span', { class: 'pip', style: `background:${colors[colour]?.css || '#888'}`, title: colors[colour]?.name }));
    }
  }
  return pips.length ? h('span', { class: 'pips', title: `wymaga: ${tech.requirements}` }, ...pips)
    : h('span', { class: 'pips none', title: 'bez wymagań' }, '—');
}

/* ---------------------------------------------------------------- */
/*  Widok: technologie                                               */
/* ---------------------------------------------------------------- */

function renderTechnologies(body) {
  const colors = CTX.data.meta.pl.techColors;
  const all = CTX.data.cards.technologies.filter((c) => matches(c, c.requirements || ''));
  setCount(`${all.length} technologii`);
  const order = ['BIOTIC', 'WARFARE', 'PROPULSION', 'CYBERNETIC', 'UNITUPGRADE'];
  const groups = order.filter((c) => STATE.filters.colour === 'all' || STATE.filters.colour === c);

  const generic = all.filter((c) => !c.faction).length;
  append(body, h('p', { class: 'lib-lead' },
    'Technologie ogólne leżą na wspólnym stole i każdy gracz może zbadać każdą z nich – wszyscy mają dokładnie ten sam wybór ',
    `(${generic} kart w tym zestawieniu: 25 z podstawki, 8 z Proroctwa Królów, do tego wersje Ω z kodeksów, które zastępują karty z podstawki). `,
    'Kropki przy nazwie to wymagania: żeby zbadać technologię, trzeba już mieć tyle technologii danego koloru. ',
    'Karty z nazwą rasy to technologie rasowe – może je badać wyłącznie jedna rasa.'));

  let shown = 0;
  for (const colour of groups) {
    const items = all.filter((c) => c.colour === colour);
    if (!items.length) continue;
    shown += items.length;
    const info = colors[colour];
    const rows = h('div', { class: 'card-grid' });
    for (const tech of items) {
      rows.append(h('article', { class: 'lcard' },
        h('header', {},
          h('span', { class: 'dot', style: `background:${info.css}` }),
          h('strong', {}, tech.name),
          techPips(tech),
          tech.factionName ? h('span', { class: 'tag faction' }, tech.factionName) : null,
          expansionTag(tech)),
        h('p', {}, tech.text),
        tech.notes ? h('p', { class: 'note' }, tech.notes) : null,
      ));
    }
    body.append(h('section', { class: 'lib-section' },
      h('h3', {}, `${info.name} (${info.colour})`, h('em', { class: 'muted' }, ` – ${items.length}`)), rows));
  }
  if (!shown) body.append(h('p', { class: 'lib-hint' }, 'Nic nie pasuje do filtrów.'));
}

/* ---------------------------------------------------------------- */
/*  Widok: weksle                                                    */
/* ---------------------------------------------------------------- */

function renderPromissory(body) {
  const all = CTX.data.cards.promissoryNotes.filter((c) => matches(c));
  const generic = all.filter((c) => c.scope === 'generic');
  const faction = all.filter((c) => c.scope === 'faction')
    .sort((a, b) => (a.factionName || '').localeCompare(b.factionName || '', 'pl') || a.name.localeCompare(b.name, 'pl'));
  setCount(`${generic.length} ogólnych · ${faction.length} rasowych`);

  append(body, h('p', { class: 'lib-lead' },
    'Weksel to obietnica, którą oddaje się innemu graczowi w ramach umowy. Gdy ten go użyje, karta wraca do właściciela. ',
    'Weksle dzielą się na dwie zupełnie różne grupy – poniżej są rozdzielone.'));

  if (generic.length) {
    body.append(h('section', { class: 'lib-section pn-block pn-generic' },
      h('h3', {}, 'Weksle główne (kolorowe)', h('em', { class: 'muted' }, ` – ${generic.length}`)),
      h('p', { class: 'lib-hint' },
        'Ten sam komplet ma każdy gracz, niezależnie od rasy – po jednym egzemplarzu w swoim kolorze. '
        + 'W tekście kart „[kolor gracza]” oznacza właściciela weksla.'),
      h('div', { class: 'card-grid' }, ...generic.map(pnCard))));
  }
  if (faction.length) {
    body.append(h('section', { class: 'lib-section pn-block pn-faction' },
      h('h3', {}, 'Weksle rasowe', h('em', { class: 'muted' }, ` – ${faction.length}`)),
      h('p', { class: 'lib-hint' },
        'Unikalne dla jednej rasy – ma je wyłącznie gracz grający tą rasą, oprócz kompletu weksli głównych. '
        + 'Uporządkowane według nazwy rasy.'),
      h('div', { class: 'card-grid' }, ...faction.map(pnCard))));
  }
  if (!all.length) body.append(h('p', { class: 'lib-hint' }, 'Nic nie pasuje do filtrów.'));
}

/** W danych źródłowych właściciel weksla ogólnego zapisany jest jako "<color>". */
const pnText = (t) => (t || '').replace(/<color>/g, '[kolor gracza]');

function pnCard(c) {
  const flags = [];
  if (c.playArea) flags.push('kładziony w polu gry');
  if (c.playImmediately) flags.push('działa natychmiast');
  if (c.attachment) flags.push('dołączany do planety');
  return h('article', { class: 'lcard' + (c.scope === 'generic' ? ' generic' : '') },
    h('header', {},
      h('strong', {}, pnText(c.name)),
      c.factionName ? h('span', { class: 'tag faction' }, c.factionName) : h('span', { class: 'tag main' }, 'weksel główny'),
      expansionTag(c)),
    h('p', {}, pnText(c.text)),
    flags.length ? h('p', { class: 'note' }, flags.join(' · ')) : null,
    c.notes ? h('p', { class: 'note' }, pnText(c.notes)) : null);
}

/* ---------------------------------------------------------------- */
/*  Widok: liderzy                                                   */
/* ---------------------------------------------------------------- */

const LEADER_GROUPS = [
  ['agent', 'Agenci', 'Agent jest dostępny od początku gry. Wyczerpujesz go, żeby użyć zdolności; odświeża się w fazie statusu.'],
  ['commander', 'Dowódcy', 'Dowódca ma zdolność stałą, ale trzeba go najpierw odblokować, spełniając warunek podany na karcie.'],
  ['hero', 'Bohaterowie', 'Bohatera odblokowujesz, mając 3 punkty zwycięstwa. Jego zdolność jest bardzo silna, ale jednorazowa – po użyciu kartę usuwa się z gry.'],
];

function renderLeaders(body) {
  const all = CTX.data.cards.leaders.filter((c) => matches(c, c.title || ''));
  setCount(`${all.length} liderów`);
  append(body, h('p', { class: 'lib-lead' }, 'Każda rasa ma trzech liderów: agenta, dowódcę i bohatera.'));
  let shown = 0;
  for (const [type, title, desc] of LEADER_GROUPS) {
    if (STATE.filters.leaderType !== 'all' && STATE.filters.leaderType !== type) continue;
    const items = all.filter((c) => c.type === type);
    if (!items.length) continue;
    shown += items.length;
    body.append(h('section', { class: 'lib-section' },
      h('h3', {}, title, h('em', { class: 'muted' }, ` – ${items.length}`)),
      h('p', { class: 'lib-hint' }, desc),
      h('div', { class: 'card-grid' }, ...items.map(leaderCard))));
  }
  if (!shown) body.append(h('p', { class: 'lib-hint' }, 'Nic nie pasuje do filtrów.'));
}

function leaderCard(c) {
  return h('article', { class: 'lcard' },
    h('header', {},
      h('strong', {}, c.name),
      c.title ? h('em', { class: 'muted' }, ` „${c.title}”`) : null,
      c.factionName ? h('span', { class: 'tag faction' }, c.factionName) : null,
      expansionTag(c)),
    h('p', {}, c.text),
    c.unlock && c.unlock !== 'Always Unlocked'
      ? h('p', { class: 'note' }, `Odblokowanie: ${c.unlock}`)
      : h('p', { class: 'note' }, 'Dostępny od początku gry.'),
    c.notes ? h('p', { class: 'note' }, c.notes) : null);
}

/* ---------------------------------------------------------------- */
/*  Widok: jednostki                                                 */
/* ---------------------------------------------------------------- */

function renderUnits(body) {
  const all = CTX.data.cards.units.filter((c) => matches(c, c.baseType || ''));
  setCount(`${all.length} jednostek`);
  append(body, h('p', { class: 'lib-lead' },
    'Jednostki ogólne ma każdy gracz. Rasy mają własny okręt flagowy, mecha i czasem ulepszone wersje zwykłych jednostek.'));
  const generic = all.filter((c) => !c.faction);
  const faction = all.filter((c) => c.faction);
  if (generic.length) body.append(cardSection('Jednostki ogólne', generic, unitCard));
  if (faction.length) body.append(cardSection('Jednostki rasowe', faction, unitCard));
  if (!all.length) body.append(h('p', { class: 'lib-hint' }, 'Nic nie pasuje do filtrów.'));
}

export function unitCard(c) {
  const pl = CTX.data.meta.pl;
  const fmt = (key, val) => (key === 'cost' && val % 1 !== 0 ? `${val * 2} za 2 jednostki` : String(val));
  const stat = (key, val, suffix = '') => (val === null || val === undefined
    ? null
    : h('span', { class: 'stat' }, h('em', {}, pl.stats[key] || key), ` ${fmt(key, val)}${suffix}`));
  const abilities = c.abilities.map((a) => {
    const name = pl.unitAbilities[a.key] || a.key;
    if (a.value && a.dice > 1) return `${name} ${a.value} (×${a.dice})`;
    if (a.value) return `${name} ${a.value}`;
    return name;
  });
  return h('article', { class: 'lcard' },
    h('header', {},
      h('strong', {}, c.name),
      h('em', { class: 'muted' }, ` ${pl.units[c.baseType] || c.baseType || ''}`),
      c.factionName ? h('span', { class: 'tag faction' }, c.factionName) : null,
      expansionTag(c)),
    h('div', { class: 'stats-row' },
      stat('cost', c.stats.cost),
      stat('combat', c.stats.combat, c.stats.dice > 1 ? ` (×${c.stats.dice})` : ''),
      stat('move', c.stats.move),
      stat('capacity', c.stats.capacity)),
    abilities.length ? h('p', { class: 'abil' }, abilities.join(' · ')) : null,
    c.text ? h('p', {}, c.text) : null,
    c.requiredTech ? h('p', { class: 'note' }, 'Wymaga technologii ulepszenia.') : null);
}

/* ---------------------------------------------------------------- */
/*  Widok: przełomy                                                  */
/* ---------------------------------------------------------------- */

function renderBreakthroughs(body) {
  const all = CTX.data.cards.breakthroughs.filter((c) => matches(c));
  setCount(`${all.length} przełomów`);
  append(body, h('p', { class: 'lib-lead' },
    'Przełomy to nowość z Krańca Burzy: karta przypisana do rasy, którą zdobywa się głównie przez wyprawę do Thunder’s Edge. ',
    'Daje unikalną zdolność oraz „synergię” – połączenie dwóch kolorów technologii (technologia jednego z tych kolorów liczy się także jako drugi).'));
  body.append(h('section', { class: 'lib-section' },
    h('h3', {}, 'Przełomy', h('em', { class: 'muted' }, ` – ${all.length}`)),
    h('div', { class: 'card-grid' }, ...all.map((c) => h('article', { class: 'lcard' },
    h('header', {},
      h('strong', {}, c.name),
      c.factionName ? h('span', { class: 'tag faction' }, c.factionName) : null,
      expansionTag(c)),
    c.synergy?.length
      ? h('p', { class: 'abil' }, 'Synergia: ' + c.synergy.map((s) => CTX.data.meta.pl.techColors[s]?.name || s).join(' + '))
      : null,
    h('p', {}, c.text))))));
  if (!all.length) body.append(h('p', { class: 'lib-hint' }, 'Nic nie pasuje do filtrów.'));
}

function cardSection(title, items, renderer) {
  return h('section', { class: 'lib-section' },
    h('h3', {}, title, h('em', { class: 'muted' }, ` – ${items.length}`)),
    h('div', { class: 'card-grid' }, ...items.map(renderer)));
}

/* ---------------------------------------------------------------- */
/*  Widok: rasy                                                      */
/* ---------------------------------------------------------------- */

function renderFactions(body) {
  const q = STATE.q.trim().toLowerCase();
  const list = CTX.data.factions.filter((f) => !q
    || `${f.name} ${f.namePl || ''} ${f.abilities.map((a) => a.name + a.text).join(' ')}`.toLowerCase().includes(q));
  setCount(q ? `${list.length} z ${CTX.data.factions.length} ras` : `${CTX.data.factions.length} ras`);
  if (list.length && !list.some((f) => f.id === STATE.factionId)) STATE.factionId = list[0].id;

  const nav = h('div', { class: 'faction-list' });
  for (const f of list) {
    nav.append(h('button', {
      class: 'faction-item' + (f.id === STATE.factionId ? ' active' : ''),
      onclick: () => { STATE.factionId = f.id; renderLibrary(); },
    },
    h('span', { class: 'fname' }, factionLabel(f)),
    h('span', { class: 'tag exp' }, CTX.data.meta.expansions[f.expansion].short)));
  }
  const detail = h('div', { class: 'faction-detail' });
  body.append(h('div', { class: 'faction-layout' }, nav, detail));
  const f = factionById(STATE.factionId);
  if (f) renderFactionDetail(detail, f);
}

function renderFactionDetail(root, f) {
  const pl = CTX.data.meta.pl;
  const fleet = (f.startingFleetParsed || []).map((x) => {
    const name = pl.units[x.unit] || x.unit;
    return `${x.count} × ${name}${x.planet ? ` (na planecie ${x.planet})` : ''}`;
  });

  append(root,
    h('h2', {}, factionLabel(f)),
    h('p', { class: 'lib-hint' },
      `${CTX.data.meta.expansions[f.expansion].name} · trudność: ${f.complexity || '—'} · towary: ${f.commodities ?? '—'}`),
    ...f.setupNotes.map((n) => h('p', { class: 'warnbox' }, n)),
    ...f.mapAffinity.map((a) => h('p', { class: 'notebox' },
      `Wpływ na mapę: ${CTX.featureLabel(a.feature)} — ${a.why}`)),
  );

  // system domowy
  const homes = h('div', { class: 'card-grid' });
  for (const home of f.homeSystems) {
    const sys = CTX.data.systems.find((s) => s.id === home.id);
    homes.append(h('article', { class: 'lcard' },
      h('header', {}, h('strong', {}, `Kafel ${home.id}`), h('em', { class: 'muted' }, ` ${home.name}`)),
      h('p', {}, `Razem: ${home.res ?? 0} zasobów / ${home.inf ?? 0} wpływów`),
      ...(sys?.planets || []).map((pid) => {
        const p = CTX.data.planets.find((x) => x.id === pid);
        if (!p) return null;
        return h('p', { class: 'note' },
          `${p.name}: ${p.resources}/${p.influence}`
          + `${p.types.length ? ' · ' + CTX.tList('planetTypes', p.types) : ''}`
          + `${p.tech.length ? ' · specjalizacja: ' + CTX.tList('tech', p.tech) : ''}`);
      }),
      sys?.wormholes?.length ? h('p', { class: 'abil' }, 'Tunele: ' + CTX.tList('wormholes', sys.wormholes)) : null,
      sys?.anomalies?.length ? h('p', { class: 'abil' }, 'Anomalie: ' + CTX.tList('anomalies', sys.anomalies)) : null,
    ));
  }
  root.append(h('section', { class: 'lib-section' }, h('h3', {}, 'Układ macierzysty'), homes));

  root.append(h('section', { class: 'lib-section' },
    h('h3', {}, 'Start gry'),
    h('div', { class: 'card-grid' },
      h('article', { class: 'lcard' },
        h('header', {}, h('strong', {}, 'Flota i jednostki startowe')),
        fleet.length ? h('ul', {}, ...fleet.map((x) => h('li', {}, x))) : h('p', {}, f.startingFleet || '—'),
        h('p', { class: 'note' }, `Towary: ${f.commodities ?? '—'}`)),
      h('article', { class: 'lcard' },
        h('header', {}, h('strong', {}, 'Technologie startowe')),
        f.startingTechChoice
          ? append(h('div', {}),
            h('p', {}, `Wybierz ${f.startingTechChoice.pick} z poniższych:`),
            h('ul', {}, ...f.startingTechChoice.options.map((x) => h('li', {}, x.name))))
          : (f.startingTech.length
            ? h('ul', {}, ...f.startingTech.map((x) => h('li', {}, x.name)))
            : h('p', {}, 'brak'))),
    )));

  section('Zdolności rasowe', f.abilities, (c) => h('article', { class: 'lcard' },
    h('header', {}, h('strong', {}, c.name)), h('p', {}, c.text)));

  section('Technologie rasowe', f.factionTech, (c) => h('article', { class: 'lcard' },
    h('header', {},
      h('span', { class: 'dot', style: `background:${pl.techColors[c.colour]?.css || '#888'}` }),
      h('strong', {}, c.name), techPips(c)),
    h('p', {}, c.text),
    c.notes ? h('p', { class: 'note' }, c.notes) : null));

  for (const [type, title] of [['agent', 'Agent'], ['commander', 'Dowódca'], ['hero', 'Bohater']]) {
    const items = f.leaders.filter((l) => l.type === type);
    if (items.length) section(title, items, leaderCard);
  }
  const otherLeaders = f.leaders.filter((l) => !['agent', 'commander', 'hero'].includes(l.type));
  if (otherLeaders.length) section('Pozostali liderzy', otherLeaders, leaderCard);

  section('Weksle rasowe', f.promissoryNotes, pnCard);
  section('Jednostki rasowe', f.units.filter((u) => u.faction), unitCard);
  section('Jednostki ogólne tej rasy', f.units.filter((u) => !u.faction), unitCard);
  if (f.breakthrough) {
    section('Przełom (Kraniec Burzy)', [f.breakthrough], (c) => h('article', { class: 'lcard' },
      h('header', {}, h('strong', {}, c.name)),
      c.synergy?.length ? h('p', { class: 'abil' }, 'Synergia: ' + c.synergy.map((s) => pl.techColors[s]?.name || s).join(' + ')) : null,
      h('p', {}, c.text)));
  }

  root.append(h('p', { class: 'lib-hint' },
    'Nazwy kart i planet zostawiono w brzmieniu oryginalnym – muszą się zgadzać z napisami na komponentach. '
    + 'Polskie nazwy ras pochodzą z instrukcji Galakty; brakujące można dopisać w scripts/build-data.mjs.'));
  if (f.wiki) root.append(h('p', {}, h('a', { href: f.wiki, target: '_blank', rel: 'noreferrer' }, 'karta rasy w sieci')));

  function section(title, items, renderer) {
    if (!items?.length) return;
    root.append(h('section', { class: 'lib-section' },
      h('h3', {}, title, h('em', { class: 'muted' }, ` – ${items.length}`)),
      h('div', { class: 'card-grid' }, ...items.map(renderer))));
  }
}

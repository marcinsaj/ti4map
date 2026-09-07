# Skąd pochodzą dane

## Zasady (PDF-y w `docs/rules/`)

| Plik | Co to jest | Źródło |
|---|---|---|
| `base_learn_to_play_2020.pdf` | *Learn to Play* – podstawka (wyd. 2020) | images-cdn.fantasyflightgames.com |
| `pok_rulebook.pdf` | Rulebook *Prophecy of Kings* | images-cdn.fantasyflightgames.com |
| `pok_living_rules_reference_2.0.pdf` | **Living Rules Reference 2.0** – kompletne zasady podstawki + PoK | images-cdn.fantasyflightgames.com |

Do każdego PDF-a leży obok wersja tekstowa (`*.txt`, `*.raw.txt`) wyciągnięta `pdftotext`,
oraz renderowane strony z diagramami układów planszy w `docs/rules/pages/`.

## Katalog `research/` (materiały dostarczone do projektu)

| Plik | Do czego użyty |
|---|---|
| `research/pdf/te_rulebook.pdf` | **instrukcja Krańca Burzy** – układy planszy z hiperpasami (s. 7), nowe kafle 119A–124A, mapy w dodatku (s. 14–16) |
| `research/pdf/pl_te_rulebook.pdf` | polska instrukcja Krańca Burzy – terminologia i nazwy ras |
| `research/pdf/pl_base_instrukcja.pdf` | polska instrukcja podstawki – nazwy jednostek, zdolności i ras |
| `research/pdf/pl_k1_*.pdf`, `pl_k2_*.pdf` | polskie Kodeksy I i II |
| `research/pdf/codex1–4, codex45, omega_tech` | kodeksy angielskie (wersje Ω kart) |
| `research/*.wiki` | wikitekst z Fandomu (Kraniec Burzy, Kodeksy, Keleres, wydarzenia galaktyczne) |
| `research/ZRODLA.md` | opis pochodzenia wszystkich powyższych |

Z polskich instrukcji pochodzi cała terminologia interfejsu: nazwy jednostek
(transportowiec, krążownik, niszczyciel, pancernik, myśliwiec, piechota, okręt flagowy,
słońce wojny, stocznia kosmiczna), zdolności jednostek (WYTRZYMAŁOŚĆ, TARCZA PLANETARNA,
DZIAŁO KOSMICZNE, BOMBARDOWANIE, OSTRZAŁ PRZECIWMYŚLIWSKI, PRODUKCJA), statystyki
(KOSZT, WALKA, RUCH, ŁADOWNOŚĆ) oraz **polskie nazwy ras** – wyłącznie te, które udało się
w tych PDF-ach znaleźć dosłownie. Słownik jest w `scripts/build-data.mjs` (`PL.factions`);
brakujące pozycje można dopisać po sprawdzeniu w instrukcji.

## Dane o komponentach (`vendor/async/`)

Pochodzą z repozytorium **AsyncTI4 / TI4_map_generator_bot** – bota, którego używa
społeczność do gier asynchronicznych. Jest to najbardziej kompletny i najczęściej aktualizowany
publiczny zbiór danych TI4 (zawiera już Kraniec Burzy).

```
vendor/async/src/main/resources/systems/*.json   – kafle systemów
vendor/async/src/main/resources/planets/*.json   – planety
vendor/async/src/main/resources/data/factions/   – rasy
vendor/async/src/main/resources/data/abilities/  – zdolności ras
vendor/async/src/main/resources/data/technologies/
vendor/async/src/main/resources/data/leaders/
vendor/async/src/main/resources/data/promissory_notes/   (weksle)
vendor/async/src/main/resources/data/units/
vendor/async/src/main/resources/data/breakthroughs/      (przełomy, TE)
vendor/async/src/main/resources/data/hyperlanes.properties
```

Pobranie / aktualizacja:

```bash
npm run vendor        # rzadki (sparse) klon – ~11 MB
npm run build:data    # przetworzenie do web/data/*.json
npm run fetch:tiles   # grafiki kafli do web/tiles/ (~37 MB, 231 plików)
```

## Układy planszy

Pozycje domów, gniazd i hiperpasów dla układów oficjalnych **nie** zostały przepisane ręcznie –
skrypt `scripts/extract_layouts2.py` renderuje stronę 6 *Living Rules Reference 2.0* w 300 dpi
i klasyfikuje kolor w środku każdego pola siatki heksów (kafle mają idealnie płaskie kolory,
tło ma szum – to wystarcza do bezbłędnego rozpoznania). Wynik: `scripts/official_layouts_raw.json`.

Kontrola poprawności: dla każdego układu liczba wykrytych gniazd zgadza się co do jednego
z liczbą kafli wynikającą z zasad rozdania (np. 4 graczy: 4 × (5+3) = 32 gniazda).

Identyfikatory i obroty kafli hiperpasów pochodzą z szablonów AsyncTI4
(`data/map_templates/standardMiltyLayouts.json`) – zgadzają się co do pozycji z odczytem z PDF-a.

## Znane założenia

* Kolejność krawędzi heksa przyjęta jako `0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW` – tak jest
  interpretowana macierz z `hyperlanes.properties`. Gdyby okazała się przesunięta, zmiana jest
  w jednym miejscu: `web/js/hex.js` → `DIRS`.
* Wartość „optymalna” planety liczona jest konwencją draftu Milty (zasoby vs. wpływy,
  remis dzielony po połowie).

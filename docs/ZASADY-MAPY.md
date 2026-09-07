# Zasady budowy planszy w TI4 – ściąga dla generatora

Źródło: **Living Rules Reference 2.0** (Prophecy of Kings), sekcja *Complete Setup*, krok 6
oraz diagram *Game Board Setups* ze strony 6. Pliki PDF leżą w `docs/rules/`.

## 1. Rodzaje kafli

| Rewers | Znaczenie | Udział w losowaniu |
|---|---|---|
| **niebieski** | systemy z planetami | tak |
| **czerwony** | anomalie i puste systemy | tak |
| **zielony** | systemy domowe frakcji | nie – kładzione na wyznaczonych pozycjach |
| **czarny/specjalny** | Mecatol Rex, Nexus, Nova Seed, Fracture… | nie |
| hiperpasy (83–91) | tylko w układach, które ich wymagają | nie |

## 2. Rozdanie kafli (ile na gracza)

| Układ | niebieskie | czerwone | dodatkowo od Mówcy |
|---|---|---|---|
| 3 graczy | 6 | 2 | – |
| 4 graczy | 5 | 3 | – |
| 5 graczy (bez hiperpasów) | 4 | 2 | 1 czerwony |
| 5 graczy (hiperpasy) | 3 | 2 | – |
| 6 graczy | 3 | 2 | – |
| 6 graczy (wielka galaktyka) | 6 | 3 | – |
| 7 graczy | 4 | 2 | 2 czerwone + 3 niebieskie |
| 7 graczy (alternatywny) | 3 | 2 | – |
| 8 graczy | 4 | 2 | 2 czerwone + 2 niebieskie |
| 8 graczy (alternatywny) | 3 | 2 | – |

Generator implementuje układy dla 1–6 graczy (7–8 są w zasadach, ale nie były przedmiotem zlecenia).

## 3. Kolejność i ograniczenia rozkładania

> „Each ring around Mecatol Rex must be fully built before any tile can be placed in the next ring.
> Anomaly system tiles cannot be placed next to one another **unless there is no other option**.
> Additionally, system tiles that contain the same type of wormhole cannot be placed next to one
> another **unless there is no other option**.”

Czyli twarde reguły generatora:

1. **anomalie nie sąsiadują** (supernowa, mgławica, pole asteroid, rozdarcie grawitacyjne,
   a w Krańcu Burzy także entropiczna blizna),
2. **tunele tego samego typu nie sąsiadują** (α, β, γ, δ, ε),
3. puste systemy **mogą** leżeć obok siebie – nie są anomaliami,
4. domy dołącza się na końcu, na pozycjach wynikających z układu.

## 4. Rekompensata w grze 5-osobowej (bez hiperpasów)

Trzej gracze mają gorsze pozycje startowe i dostają dobra handlowe:
pozycja `304` → **+2**, `307` → **+4**, `310` → **+2**.

## 5. Numeracja pozycji

Generator używa społecznościowej konwencji TI4:

```
000            = środek (Mecatol Rex)
R01 … R(6·R)   = pierścień R, licząc od kafla na północy, zgodnie z ruchem wskazówek zegara
```

Rogi pierścienia 3 to `301` (N), `304` (NE), `307` (SE), `310` (S), `313` (SW), `316` (NW).

## 6. Pozycje domów w układach oficjalnych

Odczytane bezpośrednio z diagramu na s. 6 (`scripts/extract_layouts2.py` analizuje piksele PDF-a):

| Układ | domy | hiperpasy |
|---|---|---|
| 3 graczy | 304, 310, 316 | – |
| 4 graczy | 305, 309, 314, 318 | – |
| 5 graczy | 304, 307, 310, 314, 318 | – |
| 5 graczy (hiperpasy) | 301, 304, 307, 313, 316 | 104, 206, 208, 309, 310, 311 |
| 6 graczy | 301, 304, 307, 310, 313, 316 | – |
| 6 graczy (wielka galaktyka) | 401, 405, 409, 413, 417, 421 | – |

## 7. Kafle wyłączone z losowania (i dlaczego)

| Kafel | Powód |
|---|---|
| 17 Creuss Gate | wchodzi na mapę razem z Ghosts of Creuss (w miejsce ich domu) |
| 18 Mecatol Rex | zawsze na środku |
| 51 Creuss | dom Ghosts of Creuss leży **poza** planszą |
| 81 Nova Seed | tworzy go bohater Muaat w trakcie gry |
| 82a/82b Mallice / Wormhole Nexus | kładzione obok planszy podczas przygotowania |
| 83–91 hiperpasy | tylko w układach, które je przewidują |
| c41 Ordinian | kafel scenariuszowy (Codex) |
| 112 Mecatol Rex (TE) | alternatywny kafel środkowy z Krańca Burzy |
| 118 Ahk Creuxx | prawdziwy dom Crimson Rebellion – trzymany w polu gry |
| fracture1–7 | The Fracture – osobny obszar dokładany w trakcie gry |
| silver_flame | wchodzi do gry efektem karty |

W generatorze każdy z tych kafli można **ręcznie dorzucić do puli** (zakładka *Kafle* →
„Kafle specjalne”).

## 8. Planety legendarne a losowanie

Wbrew częstemu przekonaniu **większość planet legendarnych normalnie bierze udział w losowaniu**,
bo leżą na zwykłych niebieskich/czerwonych kaflach:

* **Primor** (kafel 65) i **Hope's End** (66) – PoK, kafle niebieskie → w puli,
* **Faunus** (97), **Garbozia** (98), **Emelpar** (99), **Tempesta** (100) – TE, niebieskie → w puli,
* **Industrex** (115) – TE, kafel czerwony → w puli,
* **Mallice** (82b) – **poza** pulą (Wormhole Nexus),
* **Mirage**, **Illusion**, **Phantasm**, **Custodia Vigilia**, **Avernus**, **Thunder's Edge** –
  wchodzą do gry przez eksplorację / relikty / efekty, nie mają własnego kafla w puli.

## 9. Rasy zależne od typu kafla

Opcja „uwzględniaj zdolności ras” pilnuje, żeby na mapie (blisko domu danego gracza) znalazł się
kafel, bez którego zdolność rasy jest martwa:

| Rasa | Czego potrzebuje | Dlaczego |
|---|---|---|
| The Embers of Muaat | supernowa | *Gashlai Physiology*, *Magmus Reactor* |
| The Empyrean | mgławica | *Voidborn*, *Aetherstream* |
| Clan of Saar | pole asteroid | *Chaos Mapping* |
| The Vuil'raith Cabal | rozdarcie grawitacyjne | *Riftmeld*, *Dimensional Tear* |
| The Ghosts of Creuss | tunel czasoprzestrzenny | *Quantum Entanglement*, *Slipstream* |
| The Winnu | tunel (gdziekolwiek) | *Lazax Gate Folding* |
| Sardakk N'orr | dowolna anomalia | bohater *G'hom Sek'kus* |
| The Crimson Rebellion | tunel ε | *Sundered* – tylko epsilon (kafle 94/118) |

Listę można edytować w `scripts/build-data.mjs` (`FACTION_MAP_AFFINITY`).

## 10. Układy z hiperpasami

Hiperpasy to kafle, które nie są systemami – łączą ze sobą odległe pola, przez co galaktyka
robi się ciaśniejsza, dystanse między graczami się wyrównują, a do wylosowania zostaje mniej
kafli. Kładzie się je **przed** rozkładaniem kafli systemów.

**Kraniec Burzy dokłada 6 własnych kafli hiperpasów: 119A, 120A, 121A, 122A, 123A i 124A**
(instrukcja KB, s. 7). Układają się zawsze w ten sam „pierścień” sześciu kafli wokół jednego pola.

| Układ | źródło | domy | hiperpasy | rozdanie |
|---|---|---|---|---|
| 4 graczy | instrukcja KB, s. 7 | 304, 307, 313, 316 | 101, 104, 202, 206, 208, 212, 301, 302, 309, 310, 311, 318 | 3 nieb. + 2 czerw. (20 kafli) |
| 5 graczy | LRR 2.0 s. 6 = instrukcja KB s. 7 | 301, 304, 307, 313, 316 | 104, 206, 208, 309, 310, 311 | 3 nieb. + 2 czerw. (25 kafli) |

Uwagi:

* układ **4-osobowy wymaga też Proroctwa Królów** – potrzeba 12 kafli hiperpasów,
  czyli 119A–124A z Krańca Burzy **plus** 83A–88A z Proroctwa Królów,
* układ **5-osobowy** potrzebuje jednego kompletu (obojętnie z którego dodatku);
  w wariancie z hiperpasami **nie** rozdaje się dóbr handlowych za gorszą pozycję startową,
* instrukcja KB podaje też przykładowy układ 6-osobowy dla wydarzenia „Minor Factions”
  (domy mniejszych ras na pozycjach 202, 204, 206, 208, 210, 212) – generator go nie obsługuje,
  bo wymaga komponentów mniejszych ras.

Pozycje odczytano z diagramu „Game Board Setup” (`research/pdf/te_rulebook.pdf`, s. 7) tą samą
metodą co układy z Living Rules Reference – skrypt `scripts/extract_te_layouts.py`.
Zgodność jest sprawdzana automatycznie przez `scripts/smoke-test.mjs`.

Dodatkowo generator zna **wariant społecznościowy dla 3 graczy** (AsyncTI4 / draft Milty),
zbudowany z dwóch takich samych pierścieni hiperpasów. Instrukcja Krańca Burzy nie podaje
układu 3-osobowego, a wersja „na stole” wymagałaby trzech kompletów kafli hiperpasów –
dlatego jest oznaczony jako nieoficjalny.

## 11. Format zapisu mapy

Zapis to zwykły plik tekstowy w postaci `klucz = wartość`:

```
uklad = 6p
dodatki = base, pok
ziarno = 761196999
gracz1 = 301 ; mahact ; The Mahact Gene-Sorcerers ; 52
000 = 18      # Mecatol Rex
101 = 47      # Empty System
...
mapstring = 47 76 62 68 28 80 ...
```

Wczytać można też sam `mapstring` (bez nagłówka). Wartość `0` oznacza pole puste
(do wylosowania), `-1` – pole spoza planszy.

## 12. Jak liczona jest „równość” mapy

To nie jest zasada z instrukcji – to metoda, którą posługuje się generator w trybie
„Zbalansowana”. Opisana jest tu, żeby dało się sprawdzić, skąd biorą się liczby w tabeli
pod mapą.

1. **Obszar gracza.** Każde gniazdo planszy przypisywane jest graczowi, który ma do niego
   najbliżej (odległość liczona przez sąsiedztwo kafli, z uwzględnieniem hiperpasów; tunele
   są przy tym pomijane). Gniazdo w równej odległości od dwóch graczy liczy się każdemu
   po połowie – stąd wartości połówkowe w tabeli. To ta sama konwencja co w draftach Milty.
2. **Wartość optymalna planety.** Z każdej planety liczy się tylko to, czego ma więcej –
   zasoby albo wpływy; przy remisie po połowie do każdej puli.
3. **Rozstęp.** Dla każdego kryterium (wartość razem, zasoby, wpływy, liczba planet,
   specjalizacje technologiczne, anomalie, tunele, planety legendarne) liczona jest różnica
   między graczem, który ma najwięcej, a tym, który ma najmniej.
4. **Kara.** `kara = Σ (waga kryterium × rozstęp kryterium)`. Do kary doliczane są też
   złamane twarde zasady – każde z wagą 10 000, więc żadne ustawienie suwaków nie sprawi,
   że generator zaakceptuje sąsiadujące anomalie, jeśli da się ich uniknąć.
5. **Optymalizacja.** Symulowane wyżarzanie: losowa para gniazd zamienia się kaflami, zamiana
   zostaje przyjęta, jeśli kara spadła, a z malejącym prawdopodobieństwem także wtedy, gdy
   wzrosła (to pozwala wyjść z lokalnego minimum). Zapamiętywany jest najlepszy napotkany
   układ. Temperatura startowa i końcowa skalowane są sumą wag, więc liczy się wyłącznie
   stosunek wag do siebie, a nie ich wysokość.

Wagi domyślne (`DEFAULT_WEIGHTS` w `web/js/generator.js`): wartość razem 8, zasoby 3,
wpływy 3, planety 2, specjalizacje 3, anomalie 1, tunele 1, legendarne 2.
Nie są równe celowo: „wartość razem” to suma zasobów i wpływów, więc równe wagi liczyłyby
to samo trzy razy, a anomalii i tuneli przy nieparzystej liczbie kafli i tak nie da się
wyrównać co do sztuki.

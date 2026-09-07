# Generator map – Twilight Imperium 4

Generator planszy do TI4 obsługujący **podstawkę**, **Proroctwo Królów (Prophecy of Kings)**,
**Codex (Rada Keleres)** i **Kraniec Burzy (Thunder's Edge)**.

## Uruchomienie

```bash
npm run vendor       # (raz) pobranie danych źródłowych – ~11 MB
npm run build:data   # zbudowanie web/data/*.json
npm run fetch:tiles  # (opcjonalnie) grafiki kafli – ~37 MB
npm start            # http://localhost:5173
```

Nie ma żadnych zależności npm – wystarczy Node ≥ 18 i `git`.

## Co potrafi

**Gracze i rasy** (zakładka *Gracze* – pierwsza, otwiera się po uruchomieniu)
* zaczyna się od wyboru **liczby graczy**; 1–6, każdemu przypisujesz rasę i barwę z dowolnego
  włączonego dodatku. Generator startuje na widoku mapy i na układzie oficjalnym dla
  **4 graczy** – to najczęściej grany wariant,
* na dole zakładki jest **Wyczyść** – kasuje wszystko, co w niej ustawiono (liczbę graczy,
  rasy, barwy, rozsadzenie, kierunek numerowania, zdolności ras), zostawiając w spokoju
  dodatki, typ mapy, wagi i kafle,
* generator pilnuje konfliktów (Rada Keleres vs. Mentak/Xxcha/Argent) i ras niedostępnych
  na starcie (The Obsidian),
* dla każdej rasy pokazuje, jaki kafel *faktycznie* ląduje na mapie w miejscu domu
  (Ghosts of Creuss → 17 Creuss Gate, Crimson Rebellion → 94 The Sorrow),
* miejsca przy stole ustawia się jednym wskazaniem: gdzie siedzi gracz 1 – resztę generator
  numeruje dookoła planszy (patrz „Wynik”).

**Typ mapy**
* układy oficjalne dla 3, 4, 5 (dwa warianty), 6 graczy i „wielkiej galaktyki” dla 6,
  odczytane wprost z diagramu w *Living Rules Reference 2.0* (s. 6),
* **układy z hiperpasami**: oficjalny 4-osobowy z instrukcji *Krańca Burzy* (kafle 119A–124A
  + 83A–88A) i oficjalny 5-osobowy, a także wariant społecznościowy dla 3 graczy –
  hiperpasy „sklejają” galaktykę, wyrównują odległości i zostawiają tylko 5 kafli na gracza,
* układy społecznościowe dla 1 i 2 graczy,
* dowolny własny układ wczytany z pliku tekstowego,
* automatycznie pilnowana zgodność: liczba gniazd = liczba rozdanych kafli.

**Dodatki**
* każdy dodatek włączasz/wyłączasz osobno – pula kafli i lista ras zmieniają się natychmiast,
* licznik pokazuje, ile kafli niebieskich/czerwonych jest dostępnych i ile potrzeba.

**Sposób generowania**
* **Zbalansowana** – symulowane wyżarzanie wyrównujące obszary graczy (zasoby optymalne,
  wpływy, planety, specjalizacje technologiczne, anomalie, tunele, planety legendarne),
* **Losowa (zgodna z zasadami)** – czysty los, ale poprawiony tak, by nie łamał zasad,
* **Chaos** – bez żadnych korekt.

**Wagi balansu – jak to działa** (opisane też w interfejsie, sekcja „Jak generator liczy
«równość» mapy?”)

1. Każde gniazdo planszy trafia do gracza, który ma do niego najbliżej; gniazdo w równej
   odległości od dwóch graczy liczy się każdemu po połowie. Tak powstaje **obszar gracza**.
2. Dla każdego kryterium liczona jest **rozpiętość** = wartość u najbogatszego gracza minus
   wartość u najuboższego. Mapa idealnie równa ma same zera.
3. `kara = Σ (waga kryterium × rozpiętość kryterium)`.
4. Optymalizator zamienia losowe pary kafli miejscami i zostawia układ z najmniejszą karą.

Wagi są liczbami całkowitymi 0–10; liczy się wyłącznie ich stosunek do siebie (temperatura
wyżarzania jest skalowana sumą wag, więc komplet 2–2–2 działa identycznie jak 6–6–6).
Pod mapą wyświetla się rozbicie kary na kryteria: rozpiętość × waga = wkład do kary.

Gotowe zestawy wag: **Zalecane** (domyślny), **Wszystko po 5**, **Tylko wartość obszaru**,
**Wyrównuj wszystko**, **Wyłącz wszystkie** – każdy z opisem, co realnie daje (liczby
w opisach to średnie rozpiętości zmierzone na ośmiu mapach dla 6 graczy).

**Dokładność optymalizacji** – cztery poziomy zamiast surowej liczby iteracji:
5 000 (Szybko), 15 000 (Standard, domyślnie), 40 000 (Dokładnie), 100 000 (Maksymalnie).
Przy 6 graczach to odpowiednio ok. 0,3 s / 1 s / 2–3 s / 5–8 s.

**Zasady rozkładania** (zakładka *Zasady*)
* anomalie nie sąsiadują (zasada oficjalna),
* tunele tego samego typu nie sąsiadują (zasada oficjalna),
* opcjonalnie: brak anomalii w pierścieniu przy Mecatol Rex, minimum niebieskich kafli
  przy domu, limit anomalii przy domu,
* **anomalia z planetą może stać przy domu** – Cormund, Everra, Industrex, Lemox
  i The Watchtower mają planety, więc bywają dla gracza zyskiem, a nie przeszkodą; po
  zaznaczeniu tej opcji nie wliczają się do limitu anomalii przy domu,
* limity przy domu to kary w funkcji kosztu, nie twarde blokady – przy ciasnych ustawieniach
  (np. limit 0 przy 6 graczach) mogą kolidować z zasadą „anomalie nie mogą sąsiadować”.
  Generator wybiera wtedy mniejsze zło i **wypisuje to w podsumowaniu pod mapą**: znacznik
  „anomalie przy domu ponad limit” plus ostrzeżenie z podpowiedzią, co zmienić.

**Kafle** (zakładka *Kafle*)
* pełna lista wszystkich kafli biorących udział w losowaniu, z podziałem na dodatki i kolory,
  z wyszukiwarką po nazwie kafla / planety / cechy (`supernova`, `legendarna`, `α`…),
* każdy kafel można wyłączyć z losowania pojedynczo,
* przycisk **Podgląd** przy każdym kaflu pokazuje jego grafikę i planety w panelu po prawej –
  także dla kafli, których nie ma na aktualnej mapie. Grafika ma szary obrys, żeby nie zlewała
  się z ciemnym tłem panelu,
* **czerwona kropka** przy kaflu oznacza anomalię – ten sam sygnał, co czerwone narożniki
  na mapie; dymek podaje, jaka to anomalia,
* osobna sekcja **kafli specjalnych** (Nova Seed, Wormhole Nexus, Ordinian, Fracture,
  Mecatol Rex z TE…) – normalnie nie biorą udziału w losowaniu, ale można je świadomie dorzucić.

**Zdolności ras a mapa**
* przełącznik „uwzględniaj zdolności ras przy losowaniu”: generator dba, żeby np. przy domu
  Muaat była supernowa, przy Empyrean mgławica, przy Vuil'raith rozdarcie grawitacyjne,
  przy Ghosts of Creuss tunel; każdą rasę można wyłączyć osobno, a promień („maks. dystans
  od domu”) jest regulowany.

**Wynik**
* mapa w SVG z grafikami oryginalnych kafli i szczegółami kafla po kliknięciu,
* **nazwy systemów** pisane są krojem wąskim (`Arial Narrow` i jego odpowiedniki na innych
  systemach) stopniem 11 px z półgrubością. Nazwy **nie są ściskane** – ściśnięte litery były
  nieczytelne akurat tam, gdzie najbardziej trzeba je odczytać. Napis zawsze jest wyśrodkowany
  na kaflu i długa nazwa może wyjść poza jego obrys; żeby nie zamalował jej kafel rysowany
  później, wszystkie nazwy rysowane są na **osobnej warstwie nad kaflami**. Warstwa nie łapie
  kliknięć, więc napis wystający na sąsiada nie przeszkadza w wybraniu tamtego kafla,
* **zasoby i wpływy** mają barwy z kart planet: zasób **żółty**, wpływ **niebieski**, ukośnik
  między nimi neutralny – nie trzeba pamiętać, która liczba jest która. Tych samych barw używa
  panel po prawej: i przy każdej planecie („1 zas. / 3 wpł.”), i w sumach całej mapy,
* **numery w bocznych rogach heksa** – dwa niezależne przełączniki. Opcja *pozycje* stawia
  w lewym rogu numer gniazda na planszy: pierwsza cyfra to pierścień wokół Mecatolu, kolejne
  dwie miejsce w pierścieniu, liczone od góry zgodnie z ruchem wskazówek zegara. Opcja *kafle*
  stawia w prawym rogu numer samego kafla – ten wydrukowany na kartonie i używany w map stringu.
  Każdy numer ma własną podkładkę, więc nie da się ich pomylić. Boczne rogi to jedyne miejsca,
  gdzie nic innego nie stoi: znaki idą górą, tabliczki z ikonami środkiem, a nazwa i zasoby
  dołem. Legenda pokazuje obie próbki w tych samych barwach,
* **pasek „Na mapie”** tuż pod paskiem z Opcjami/Podsumowaniem/Szczegółami – wszystkie
  przełączniki widoku obok siebie, poziomo, w jednym rzędzie: **sąsiedztwo**, **nazwa**
  (systemu, a na domu rasy), **zasoby** (zasoby/wpływy i gwiazdka planety legendarnej),
  **anomalie**, **tunele**, **cechy**, **specjalizacje**, **pozycje**, **kafle** i **grafiki**.
  Etykiety są krótkie, żeby pasek mieścił się w jednym rzędzie – pełne zdanie, co dana opcja
  robi, jest w dymku,
* **cechy planet** rysowane są tak jak na kartach planet: zielona zębatka – przemysłowa,
  czerwony odwrócony trójkąt – niegościnna, niebieska elipsa przechylona w lewo z kropką
  w środku – kulturalna,
* **specjalizacje technologiczne** to sześciokąt w barwie technologii: zielony biotyczna,
  czerwony wojenna, niebieski napędowa, żółty cybernetyczna,
* cechy i specjalizacje stoją w dwóch rzędach – cechy u góry, specjalizacje pod nimi –
  i **każdy rodzaj ma własny prostokąt tła** o ledwo ściętych rogach. Oba rzędy używają jednego
  promienia ikony i jednego rozstawu, więc **prostokąty zawsze mają identyczną wysokość**, a przy
  równej liczbie ikon w obu rzędach (np. jedna cecha i jedna specjalizacja) wychodzą dokładnie
  takie same – i szerokością, i wysokością. Szerokość odpowiada liczbie ikon w rzędzie, więc od
  razu widać, gdzie kończą się cechy, a zaczynają specjalizacje; przy jednym włączonym rodzaju
  zostaje na kaflu jedna tabliczka. Przyciemnione tło odcina ikony od grafiki kafla. Ikony
  rysuje ten sam kod, który rysuje próbki w legendzie, więc nie da się ich rozjechać,
* po kliknięciu kafla panel po prawej **nie traci nagłówka „Przegląd mapy” ani zdania pod nim** –
  karta wybranego systemu dokłada się nad ogólnym przeglądem. Najpierw idzie grafika kafla,
  pod nią numer i nazwa kafla, pozycja, dodatek, z którego pochodzi, i rewers, a dalej anomalie,
  tunele i planety. Pod kartą jest kreska, a za nią ogólny przegląd mapy, który zostaje na
  miejscu niezależnie od tego, co jest wybrane. Przyciskiem „✕ zamknij podgląd systemu”
  wraca się do samego przeglądu,
* **hiperpasy bez grafik** rysowane są jako trasy łączące konkretne boki kafla, więc widać,
  co z czym jest połączone,
* **panel „Legenda” w prawej kolumnie**, obok „Przeglądu mapy”, objaśnia każdy symbol,
  jaki może pojawić się na planszy.
  Każda grupa ma ten sam układ: nagłówek, akapit „co to w ogóle jest”, a pod nim symbole
  z krótkim wyjaśnieniem każdego. Grupa **Tło kafla** wypisuje barwy podkładu – także osobne
  odcienie supernowej, mgławicy, pola asteroid i rozdarcia grawitacyjnego, dzięki którym da
  się je rozpoznać po wyłączeniu grafik. Systemu domowego w tej grupie nie ma: opisuje go
  grupa **System domowy** z ikoną domu, a jego tło i tak jest takie samo jak puste gniazdo,
  dopóki gracz nie wybierze barwy. Barwy legenda bierze z tej samej tablicy, z której koloruje
  mapa. Przy symbolach, które mówią same za siebie (ikony cech i specjalizacji, odcienie tła),
  jest sama nazwa – bez opisywania tego, co widać.
  Legenda jest widoczna zawsze,
* **sąsiedztwo** koloruje kafle barwą gracza, do którego domu jest im najbliżej. Kafel
  jednakowo oddalony od kilku domów pokazuje udziały procentowe w barwach zainteresowanych
  graczy, a legenda wypisuje, ile procent planszy przypada każdemu. Barwy rozróżniają graczy
  dopiero wtedy, gdy każdy ma wybraną rasę – wcześniej cały podział jest w jednym kolorze,
* systemy domowe oznaczone **ikoną domu** z numerem gracza. Bez wybranej rasy dom jest samym
  obrysem, po wybraniu rasy wypełnia się, a pod domem pojawia się nazwa rasy (na tych samych
  zasadach, co nazwy systemów na innych kaflach),
* **barwa gracza pokrywa cały heks jego domu**, a domek robi się wtedy ciemny, żeby się nie
  zlał z tłem. Przy włączonych grafikach kafla tła nie widać, więc barwę niesie obrys dookoła
  heksa. Wszystkie kafle, domowe też, mają obrys tej samej grubości,
* **symbole anomalii są czerwone** – tą samą barwą, co narożniki kafla; gwiazdka planety
  legendarnej zostaje jasna,
* **litery tuneli są różowe** (`#ff3d9b`). Róż nie występuje nigdzie indziej na mapie – ani
  wśród anomalii (czerwień), ani wśród cech i specjalizacji (zieleń, czerwień, błękit, żółć),
  ani na tłach kafli – więc α, β, γ, δ, ε wyskakują z kafla nawet na jasnej grafice. Odcień
  ma celowo małą składową niebieską, bo przy większej litera czytała się jak fioletowa, oraz
  cieńszą czarną otoczkę niż pozostałe znaki (1,2 px zamiast 3 px) – gruba otoczka zjadała
  jasność różu i całość szarzała. Litery tuneli są też o dwa punkty większe od pozostałych
  znaków (17 px wobec 15 px), bo greckie litery są od nich drobniejsze. Legenda używa tej
  samej barwy,
* **pole asteroid** rysowane jest jako trzy pełne bryły, a nie znakiem z Unicode – żaden
  dostępny znak nie miał sensownej wagi i cienkie kropki po prostu ginęły na grafice kafla.
  Legenda rysuje tę samą ikonę tym samym kodem,
* **kafle z anomalią** mają czerwone kreski w sześciu narożnikach – tak jak oryginalne kafle
  z pudełka, gdzie anomalia ma czerwoną obwódkę. Widać je zawsze, niezależnie od włączonych
  opcji widoku. Puste systemy i gołe tunele mają czerwony rewers, ale narożników nie dostają,
  bo na kaflach też ich nie mają,
* **barwy systemów domowych wybiera się ręcznie** (zakładka *Gracze*): na starcie wszystkie
  domy są szare, dopóki nie przypiszesz im barw z palety – żółty, zielony, czerwony,
  niebieski, pomarańczowy, fioletowy, różowy, czarny. Barwę można zmienić w każdej chwili –
  mapa nie jest wtedy losowana od nowa. Wybrane barwy trafiają też do zapisu mapy,
* **numery graczy idą dookoła planszy** – wskazujesz tylko gniazdo gracza 1 (z listy albo
  klikając kafel na mapie), a generator numeruje resztę po kolei w wybranym kierunku
  (kierunek wybierają dwa przyciski: strzałka po okręgu **plus podpis** „zgodnie z zegarem” /
  „przeciwnie do zegara”, bo sama ikona nie mówiła, co przycisk robi. Grot strzałki stoi na
  **końcu** drogi, na szczycie okręgu: skierowany w prawo znaczy zgodnie z zegarem, w lewo –
  przeciwnie. Wcześniej grot był na początku łuku i ikona czytała się odwrotnie, niż działała.
  Trzy kropki rosnące wzdłuż okręgu pokazują, że chodzi o kolejność, a nie o samo obracanie).
  Pole „nr” przy graczu
  zamienia go miejscami z innym graczem razem z rasą i barwą,
* tabela podsumowania obszarów z wyjaśnieniem każdej kolumny (najedź na nagłówek)
  i legendą pod tabelą,
* tabela rozbicia „kary” balansu: rozpiętość × waga = wkład każdego kryterium,
* licznik złamanych zasad,
* prawy panel bez zaznaczonego kafla pokazuje **przegląd mapy**: ile kafli, planet, zasobów
  i wpływów wylosowano oraz gdzie leżą anomalie, tunele i planety legendarne. Panel jest
  szeroki i podzielony **dokładnie na pół** – przegląd/szczegóły po lewej, legenda po prawej –
  a każda połowa przewija się osobno, więc legenda nie wydłuża panelu w dół. Legenda nie ma
  własnego tła, ramki ani zaokrągleń: jest częścią tego samego panelu, a nie osobnym oknem
  w oknie – od przeglądu mapy oddziela ją jedna pionowa kreska. Przy wąskim oknie kolumny
  układają się jedna pod drugą, a kreska staje się pozioma,
* wiersze legendy opisujące **barwy tła kafli** mają własną, jaśniejszą podkładkę – na samym
  tle panelu ciemne odcienie kafli (granat pustego gniazda, czerń hiperpasa) zlewały się
  z tłem i nie było widać, o którą barwę chodzi. Próbki barw są prostokątami 36×24 px
  z jasną obwódką, a numer pozycji (`301`) leży na takiej samej ciemnej podkładce, jaką ma
  na mapie – bez niej szara czcionka ginęła w tle.

**Układ okna**
* trzy kolumny: panel opcji, mapa, panel szczegółów – pierwszeństwo ma mapa: panele boczne
  dostają tyle szerokości, żeby dało się je czytać, a cała reszta okna idzie na mapę,
* **podsumowanie nie zabiera mapie wysokości** – wysuwa się nad nią jako szuflada
  (przycisk „Podsumowanie” w pasku nad mapą, skrót **Alt+3**, zamknięcie **Esc**).
  Skrót najważniejszych liczb (rozpiętość wartości, złamane zasady, ziarno) jest w nagłówku
  samej szuflady – pasek nad mapą zostaje na przyciski,
* oba panele boczne można zwinąć przyciskami w pasku nad mapą albo skrótami **Alt+1** / **Alt+2**,
* w widoku „Rasy i karty” panele boczne znikają, a biblioteka zajmuje całe okno,
* wyszukiwarki (kafle, biblioteka) mają przycisk czyszczenia i reagują na **Esc**.

**Zapis i wczytywanie** (zakładka *Zapis*)
* zapis mapy to **zwykły plik tekstowy** – da się go otworzyć w notatniku, wysłać na czacie
  i wkleić z powrotem do generatora,
* wczytać można też sam **map string** (format społeczności TI4 / Tabletop Simulator),
* wklejenie gotowego szablonu planszy (z hiperpasami i pustymi polami `0`) tworzy
  „układ własny”, który generator potrafi obsadzić kaflami,
* każda mapa ma **ziarno**: numer, z którego powstała. W interfejsie nie ma na nie pola –
  widać je w skrócie podsumowania nad mapą i w zapisie `.txt`, a wpisanie go z powrotem
  odbywa się przez wczytanie zapisu. Każde kliknięcie **Generuj mapę** losuje nowe ziarno,
  czyli zawsze daje nową planszę. Zmiany, które nie są losowaniem – wybór rasy, barwy,
  rozsadzenia, numeru gracza – przeliczają mapę na tym samym ziarnie, więc galaktyka nie
  przetasowuje się pod ręką.

**Biblioteka „Rasy i karty”** – osobny widok na całą szerokość okna, przełączany w pasku górnym:
* **Rasy** – wybierasz rasę z listy i widzisz wszystko, co jej dotyczy: układ macierzysty
  z rozbiciem na planety, flotę startową rozpisaną po jednostkach i planetach, technologie
  startowe, zdolności rasowe, technologie rasowe, agenta, dowódcę, bohatera, weksle rasowe,
  jednostki rasowe i ogólne oraz przełom z Krańca Burzy,
* **Technologie** – wszystkie technologie, które ma do dyspozycji każdy gracz (ten sam komplet
  dla wszystkich), pogrupowane po kolorach, z wymaganiami pokazanymi jako kolorowe kropki;
  technologie rasowe są oznaczone nazwą rasy. Filtry: kolor, ogólne/rasowe, rasa, dodatek, szukajka,
* **Weksle** – wyraźnie rozdzielone: 5 **weksli głównych** (kolorowych – ten sam komplet ma
  każdy gracz) i 35 **weksli rasowych** uporządkowanych według nazwy rasy,
* **Liderzy** – agenci, dowódcy i bohaterowie, z warunkiem odblokowania,
* **Jednostki** – ogólne i rasowe, ze statystykami (koszt, walka, ruch, ładowność)
  i zdolnościami po polsku,
* **Przełomy** – karty przełomów z Krańca Burzy wraz z synergią kolorów.

## Struktura

```
docs/rules/          oficjalne PDF-y + tekst + wyrenderowane diagramy
docs/ZASADY-MAPY.md  ściąga z zasad budowy planszy
docs/DANE.md         skąd pochodzą dane i jakie przyjęto założenia
docs/PUBLIKACJA-ONLINE.md  jak wystawić generator w internecie (GitHub Pages, Hostinger…)
docs/GITHUB-KROK-PO-KROKU.md  od `git init` do publicznej strony na GitHub Pages
scripts/             budowanie danych, pobieranie grafik, ekstrakcja układów z PDF, testy
vendor/async/        rzadki klon danych źródłowych (AsyncTI4)
web/                 aplikacja (bez frameworka: ES modules + SVG)
  data/              wygenerowany zbiór danych
  js/hex.js          geometria heksów, hiperpasy, sąsiedztwo
  js/generator.js    silnik losowania i optymalizacji
  js/render.js       rysowanie mapy
  js/app.js          interfejs
server.mjs           serwer statyczny
```

## Testy

```bash
node scripts/smoke-test.mjs
```

Sprawdza wszystkie układy × wszystkie tryby: zapełnienie gniazd, brak duplikatów kafli,
liczbę złamanych zasad, rozrzut wartości plastrów, spełnienie wymagań ras i determinizm ziarna.

## Język

Zasady pracy nad projektem – w tym bezwzględny wymóg polskiego – spisane są w
[`CLAUDE.md`](CLAUDE.md).

Cały interfejs, opisy i dokumentacja są po polsku, łącznie z terminologią gry
(nazwy jednostek, ich zdolności, statystyki, kolory technologii, typy planet i anomalii) –
wzięta jest wprost z polskich instrukcji Galakty leżących w `research/pdf/`.

**Polskie nazwy ras** pokazywane są tam, gdzie udało się je znaleźć w oficjalnych polskich
materiałach (np. *Widma z Creussa*, *Współjaźń L1Z1X*, *Akademia Przepastnych Archiwów*) –
z nazwą oryginalną w nawiasie. Brakujących nie wymyślano; można je dopisać w słowniku
`PL.factions` w `scripts/build-data.mjs`.

**Nazwy kart, kafli i planet** zostają w brzmieniu oryginalnym – muszą się zgadzać
z napisami na komponentach i z numeracją kafli.

**Treści kart** (opisy zdolności, warunki odblokowania liderów) pochodzą ze zbioru danych
AsyncTI4 i są po angielsku – nie istnieje publiczny, maszynowo czytelny zbiór polskich treści
kart. Cała otoczka wokół nich jest po polsku; treści nie są tłumaczone „na oko”, bo błędnie
przetłumaczona zdolność jest gorsza niż oryginał.

## Do zrobienia

* układy 7- i 8-osobowe (pozycje są już odczytane z PDF-a, brakuje wpisów w `LAYOUTS`),
* gotowe mapy z dodatku do instrukcji *Krańca Burzy* („Thunder Dreaming”, „Legendary”,
  „Red vs Blue”) jako presety do wyboru,
* przykładowy układ 6-osobowy dla wydarzenia „Minor Factions”,
* obsługa The Fracture z Krańca Burzy jako osobnego obszaru,
* draft Milty jako alternatywa dla losowania całej mapy.

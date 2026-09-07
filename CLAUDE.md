# Zasady pracy nad tym projektem

## 1. Wszystko po polsku — bez wyjątków

To jest **twarda zasada numer jeden**. Dotyczy absolutnie każdego tekstu, który powstaje
w tym projekcie:

* interfejs użytkownika (`web/`) — etykiety, przyciski, nagłówki, podpowiedzi, komunikaty
  błędów, tytuły `title=`, teksty zastępcze `placeholder`, nazwy plików pobieranych przez
  użytkownika,
* dokumentacja (`README.md`, `docs/**`),
* komentarze w kodzie i opisy w skryptach (`scripts/**`, `web/js/**`),
* nazwy w zapisie mapy (`uklad`, `gracz1`, `ziarno`…), a nie ich angielskie odpowiedniki,
* komunikaty skryptów uruchamianych z konsoli (`npm run build:data`, smoke-test),
* odpowiedzi i wyjaśnienia kierowane do użytkownika.

Identyfikatory techniczne (klucze JSON, `id` kafli, nazwy funkcji i zmiennych, klasy CSS)
zostają angielskie — one nie są tekstem dla użytkownika.

**Jedyny wyjątek merytoryczny:** nazwy własne komponentów gry — nazwy kafli, planet,
technologii, weksli, liderów i jednostek — zostają w brzmieniu oryginalnym, bo muszą się
zgadzać z napisami na kartach i kaflach, które gracze mają na stole. Tam, gdzie polska
nazwa istnieje w instrukcjach Galakty, podajemy ją przed oryginałem, np.
„Widma z Creussa (The Ghosts of Creuss)”. Słownik: `PL.factions` w `scripts/build-data.mjs`.

**Znane ograniczenie:** treści kart (opisy zdolności, warunki odblokowania liderów) pochodzą
ze zbioru danych AsyncTI4 i są po angielsku — nie istnieje publiczny, maszynowo czytelny
zbiór polskich treści kart. Cała otoczka wokół nich (nagłówki, opisy, objaśnienia mechanik)
jest po polsku. Nie tłumaczymy treści kart „na oko” — błędne tłumaczenie zdolności jest
gorsze niż oryginał.

## 2. Wyjaśniaj, nie tylko pokazuj

Każda opcja, waga i kolumna tabeli musi mieć przy sobie zdanie po polsku mówiące, **co to
jest i co się stanie, gdy to zmienię**. Jeśli coś jest wyliczane wzorem — wzór ma być opisany
słowami w interfejsie, a nie tylko w kodzie.

## 3. Liczby dla użytkownika

Suwaki i pola liczbowe operują na liczbach całkowitych. Wartości ułamkowe pokazujemy tylko
tam, gdzie wynikają z samej gry (np. kafel dzielony między dwóch graczy) — i wtedy trzeba
napisać, skąd się biorą.

## 4. Stos technologiczny

Bez zależności npm. Vanilla ES modules + SVG, serwer statyczny na `node:http`.
Skrypty pomocnicze do PDF-ów mogą używać Pythona (PyMuPDF/PIL/numpy) — to narzędzia
deweloperskie, nie część aplikacji.

## 5. Sprawdzanie

Po zmianach w danych lub generatorze: `npm run build:data` i `node scripts/smoke-test.mjs`.
Smoke-test sprawdza wszystkie układy × tryby, determinizm ziarna, zgodność układów
z hiperpasami z instrukcją Krańca Burzy i kompletność katalogu kart.

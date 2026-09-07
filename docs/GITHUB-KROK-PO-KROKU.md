# GitHub od zera: repozytorium i publiczna strona

Instrukcja od stanu, w jakim projekt jest teraz (**katalog na dysku, bez żadnego repozytorium**)
do działającej, publicznej strony pod adresem `https://marcinsaj.github.io/ti4-map-generator/`.

Szersze porównanie miejsc hostingu jest w [PUBLIKACJA-ONLINE.md](PUBLIKACJA-ONLINE.md).
Ten dokument jest wąski: wyłącznie GitHub, wyłącznie krok po kroku.

---

## 0. Odpowiedzi na pytania wprost

**Czy muszę dodać repozytorium?**
Tak. GitHub Pages nie jest osobną usługą, do której się „wgrywa pliki” — to funkcja
repozytorium. Bez repozytorium nie ma czego opublikować. Projekt **nie jest jeszcze**
repozytorium git (sprawdzone: `git rev-parse` zwraca „not a git repository”), więc zaczynamy
od `git init`.

**Czy muszę konfigurować Claude Code?**
Nie. Wszystko, czego potrzeba, już działa na tym komputerze:

| Narzędzie | Stan |
|---|---|
| `git` | 2.52.0 ✔ |
| `git config user.name` / `user.email` | `Marcin Saj` / `marcin@nixietester.com` ✔ |
| `gh` (GitHub CLI) | 2.88.1 ✔ |
| Logowanie do GitHuba | zalogowany jako **marcinsaj**, protokół SSH ✔ |
| Uprawnienia tokenu | `repo`, `workflow`, `gist`, `read:org` ✔ |

Zakres `workflow` jest istotny — bez niego `git push` odrzuciłby wysłanie pliku
`.github/workflows/pages.yml`. Jest, więc problemu nie będzie.

Claude Code umie wykonać każdy z poniższych kroków (poza tymi wymagającymi kliknięcia
w przeglądarce), ale **nie zrobi tego sam z siebie** — utworzenie publicznego repozytorium
jest działaniem nieodwracalnym i widocznym na zewnątrz, więc czeka na wyraźne polecenie.
Wystarczy napisać np. „utwórz repozytorium i opublikuj”.

**Czy strona musi być publiczna?**
Do darmowego GitHub Pages — tak, repozytorium musi być publiczne. Pages z repozytorium
prywatnego wymaga płatnego planu (Pro / Team). Jeśli kod ma zostać prywatny, a strona i tak
publiczna — użyj Cloudflare Pages (rozdział 5 w PUBLIKACJA-ONLINE.md).

---

## 1. Zanim cokolwiek zatwierdzisz: co NIE może trafić do repozytorium

To najważniejszy krok całej instrukcji, bo błąd popełniony tutaj jest bolesny do naprawienia
— raz zatwierdzony plik zostaje w historii repozytorium nawet po skasowaniu.

W katalogu projektu leży **406 MB**, ale do repozytorium powinno trafić **1,5 MB**.
Reszta to materiały robocze i pobrane zasoby:

| Katalog | Rozmiar | Dlaczego nie |
|---|---|---|
| `research/pdf/` | 358 MB | **dwa pliki mają 75 MB i 62 MB** — GitHub odrzuca pliki >100 MB i ostrzega przy >50 MB |
| `research/pages/` | 11 MB | wyrenderowane strony PDF, materiał roboczy |
| `docs/rules/` | 36 MB | oficjalne PDF-y zasad — materiały FFG, nie nasze |
| `vendor/` | ~10 MB | sklonowane repozytorium AsyncTI4, odtwarzalne komendą `npm run vendor` |
| `web/tiles/` | 37 MB | grafiki kafli — patrz rozdział 5, to osobna decyzja |

Wszystkie są już wpisane w `.gitignore` (`research/` dopisałem właśnie w ramach
przygotowania). **Sprawdź to przed pierwszym zatwierdzeniem:**

```bash
cat .gitignore
```

Powinno zawierać `node_modules/`, `vendor/`, `web/tiles/`, `docs/rules/*.pdf`,
`docs/rules/*.txt`, `docs/rules/pages/`, `__pycache__/` oraz `research/`.

---

## 2. Utworzenie repozytorium lokalnego

```bash
cd D:/cc/ti4
git init -b main
git add -A
git status --short          # OBEJRZYJ TĘ LISTĘ
```

Zanim zatwierdzisz — przejrzyj wynik `git status --short`. Nie powinno tam być **niczego**
z `research/`, `vendor/`, `docs/rules/` ani `web/tiles/`. Szybkie sprawdzenie, ile to waży:

```bash
git count-objects -vH       # pozycja "size-pack" po zatwierdzeniu
```

Jeśli lista wygląda dobrze:

```bash
git commit -m "Generator map do Twilight Imperium 4"
```

---

## 3. Utworzenie repozytorium na GitHubie

### Wariant A — jedną komendą (polecany, bo `gh` jest już zalogowany)

```bash
gh repo create ti4-map-generator --public --source=. --remote=origin --push \
  --description "Generator zbalansowanych map do Twilight Imperium 4"
```

Ta jedna komenda: zakłada publiczne repozytorium na koncie `marcinsaj`, ustawia je jako
`origin` i wysyła gałąź `main`. Po jej wykonaniu repozytorium jest pod
`https://github.com/marcinsaj/ti4-map-generator`.

### Wariant B — przez stronę

1. Wejdź na <https://github.com/new>.
2. *Repository name*: `ti4-map-generator`, widoczność: **Public**.
3. **Nie zaznaczaj** „Add a README file”, „Add .gitignore” ani „Choose a license” — mamy już
   własne pliki, a te opcje tworzą zatwierdzenie, które koliduje z lokalnym.
4. *Create repository*, a potem lokalnie:

   ```bash
   git remote add origin git@github.com:marcinsaj/ti4-map-generator.git
   git push -u origin main
   ```

   (Protokół SSH, bo tak skonfigurowany jest twój `gh`. Jeśli SSH nie działa, użyj
   `https://github.com/marcinsaj/ti4-map-generator.git` — `gh` dostarczy dane logowania.)

---

## 4. Włączenie GitHub Pages

Publikujemy przez GitHub Actions, a nie z gałęzi — dzięki temu dane i grafiki powstają
automatycznie przy każdym wdrożeniu i nie muszą leżeć w repozytorium.

### 4.1. Dodaj plik workflow

Utwórz **`.github/workflows/pages.yml`** o treści podanej w rozdziale 4.3 dokumentu
[PUBLIKACJA-ONLINE.md](PUBLIKACJA-ONLINE.md), a potem:

```bash
git add .github/workflows/pages.yml
git commit -m "Automatyczna publikacja na GitHub Pages"
git push
```

### 4.2. Przestaw źródło publikacji

W przeglądarce: **repozytorium → Settings → Pages → Build and deployment → Source** →
wybierz **`GitHub Actions`**.

Tego kroku nie da się zrobić z wiersza poleceń w sposób, który warto polecać — to jedno
kliknięcie w ustawieniach i trzeba je zrobić ręcznie, raz.

### 4.3. Zobacz, jak buduje

Zakładka **Actions** w repozytorium pokazuje przebieg. Pierwsze wdrożenie trwa zwykle
2–5 minut, głównie przez pobieranie 231 grafik kafli. Po zakończeniu adres strony pojawia
się w **Settings → Pages** na górze, w ramce „Your site is live at…”.

Adres będzie brzmiał:

```
https://marcinsaj.github.io/ti4-map-generator/
```

Od tej chwili **każdy `git push` do gałęzi `main` przebudowuje i publikuje stronę**.
Nic więcej nie musisz robić.

---

## 5. Decyzja do podjęcia: grafiki kafli

W workflow jest krok „Pobierz grafiki kafli”. To jedyne miejsce, gdzie trzeba się zastanowić.

**Zostawiasz krok** → strona wygląda dokładnie jak lokalnie, z oryginalnymi grafikami kafli.
Grafiki są pobierane przy każdym wdrożeniu ze zbioru projektu AsyncTI4 i publikowane pod twoim
adresem. To materiały Fantasy Flight Games — przy stronie widocznej dla całego internetu warto
mieć tego świadomość.

**Usuwasz krok** → strona jest o 37 z 38 MB lżejsza, buduje się w kilkanaście sekund, a mapa
rysuje się w trybie „bez grafik”: barwy heksów, ikony cech i specjalizacji, nazwy, zasoby,
anomalie, tunele, hiperpasy. Wszystko, co generator liczy, jest widoczne — brakuje wyłącznie
zdjęć kafli, a w panelu szczegółów pojawia się zdanie, że grafik nie pobrano.

Decyzja jest twoja; funkcjonalnie generator działa tak samo w obu wariantach.

---

## 6. Praca z Claude Code przy tym repozytorium

Nic nie trzeba konfigurować, ale warto wiedzieć:

* **Zatwierdzanie i wysyłanie na żądanie.** Claude Code sam z siebie nie robi `commit` ani
  `push` — czeka na wyraźne polecenie („zatwierdź”, „wypchnij”, „opublikuj”). To celowe:
  wysłanie na publiczne repozytorium jest widoczne na zewnątrz i trudne do cofnięcia.
* **Praca poza gałęzią główną.** Przy większych zmianach Claude Code założy gałąź zamiast
  zatwierdzać prosto na `main`.
* **Polecenia interaktywne wykonujesz sam.** Jeśli kiedyś trzeba będzie się przelogować
  (`gh auth login`) albo podać hasło, wpisz komendę w oknie Claude Code z przedrostkiem `!`,
  np. `! gh auth login` — wykona się w tej sesji, a jej wynik trafi do rozmowy.
* **Podgląd stanu przed wysłaniem.** Warto poprosić o `git status` i `git diff` przed
  zatwierdzeniem — zwłaszcza przy pierwszym, gdzie łatwo o przypadkowe dodanie dużych plików.
* **Sprawdzenie przed publikacją.** Po każdej zmianie w danych albo generatorze:
  `npm run build:data` i `node scripts/smoke-test.mjs`. Workflow puszcza smoke-test
  automatycznie, więc zepsute dane zatrzymają wdrożenie zamiast trafić na stronę.

---

## 7. Gdyby coś nie zadziałało

| Objaw | Przyczyna i co zrobić |
|---|---|
| `push` odrzucony: „file exceeds GitHub's file size limit” | Do zatwierdzenia trafił plik z `research/pdf/`. Sprawdź `.gitignore`, a plik usuń z historii — najprościej zacząć repozytorium od nowa (`rm -rf .git`), bo jest jeszcze świeże |
| `push` odrzucony: „refusing to allow… workflow” | Token bez zakresu `workflow`. Tutaj ten zakres jest, ale gdyby zniknął: `gh auth refresh -s workflow` |
| Actions: „Pages site failed” | W **Settings → Pages** źródło nie jest ustawione na `GitHub Actions` (rozdział 4.2) |
| Strona się otwiera, ale jest pusta | Nie zbudowano danych. Sprawdź w logu Actions, czy krok „Zbuduj dane” się wykonał i czy `web/data/` ma sześć plików JSON |
| Kafle bez grafik | Krok „Pobierz grafiki kafli” został usunięty albo się nie powiódł — patrz rozdział 5 |
| Strona pokazuje starą wersję | Pamięć podręczna przeglądarki. Ctrl+F5 albo tryb prywatny |

---

## 8. Cała droga w skrócie

```bash
cd D:/cc/ti4
cat .gitignore                      # research/, vendor/, web/tiles/, docs/rules/
git init -b main
git add -A
git status --short                  # obejrzyj, zanim zatwierdzisz
git commit -m "Generator map do Twilight Imperium 4"
gh repo create ti4-map-generator --public --source=. --remote=origin --push
# … dodaj .github/workflows/pages.yml, zatwierdź, wypchnij …
# … Settings → Pages → Source: GitHub Actions …
```

Efekt: `https://marcinsaj.github.io/ti4-map-generator/`

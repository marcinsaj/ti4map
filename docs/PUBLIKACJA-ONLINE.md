# Jak umieścić generator w internecie

Dokument odpowiada na pytania: co trzeba przygotować, czy da się to postawić za darmo na
GitHubie, gdzie jeszcze można za darmo i czy nadaje się do tego zwykły hosting pod WordPressa
(np. Hostinger).

---

## 1. Najważniejsze: to jest strona statyczna

Generator w całości liczy się **w przeglądarce**. Nie ma serwera aplikacji, bazy danych,
logowania ani niczego, co musiałoby działać po stronie hostingu. Plik `server.mjs` w katalogu
projektu to wyłącznie wygoda przy pracy lokalnej — na docelowym serwerze **nie jest potrzebny**.

Praktyczny wniosek: wystarczy dowolne miejsce, które potrafi **oddać pliki przez HTTP(S)**.
Taki hosting nazywa się „statycznym” i bardzo często jest darmowy.

**Jeden warunek techniczny:** pliki muszą być podane przez HTTP(S), a nie otwarte z dysku
(`file://`). Interfejs korzysta z modułów ES (`<script type="module">`) i pobiera dane
poleceniem `fetch()` — przeglądarka blokuje jedno i drugie dla plików lokalnych. Dwukrotne
kliknięcie w `index.html` **nie zadziała** i to nie jest usterka, tylko zasada bezpieczeństwa
przeglądarek.

---

## 2. Co dokładnie wysyłasz na serwer

Wyłącznie zawartość katalogu **`web/`**:

```
web/
├── index.html
├── styles.css
├── js/          (~184 kB) – kod interfejsu i generatora
├── data/        (~1,1 MB) – wygenerowane dane: kafle, planety, rasy, karty, układy
└── tiles/       (~37 MB)  – 231 grafik kafli (opcjonalne, patrz niżej)
```

Razem około **38 MB**.

**Nie wysyłasz**: `scripts/`, `server.mjs`, `vendor/`, `docs/`, `research/`, `package.json`,
`CLAUDE.md`. To narzędzia deweloperskie — na serwerze nie robią nic, a tylko zajmują miejsce.

Wszystkie ścieżki w kodzie są **względne** (`js/app.js`, `data/systems.json`, `tiles/…`), więc
projekt zadziała zarówno w katalogu głównym domeny, jak i w podkatalogu
(`https://twojadomena.pl/ti4/`). Nie trzeba niczego przestawiać.

---

## 3. Co zrobić przed wysłaniem

### 3.1. Zbuduj dane — obowiązkowo

```bash
npm run build:data
```

Tworzy sześć plików w `web/data/`: `systems.json`, `planets.json`, `factions.json`,
`layouts.json`, `meta.json`, `cards.json`. **Bez nich strona się nie uruchomi** — przy starcie
pobiera wszystkie sześć naraz i bez nich zatrzyma się na komunikacie o błędzie.

### 3.2. Pobierz grafiki kafli — opcjonalnie

```bash
npm run fetch:tiles
```

Pobiera 231 obrazków do `web/tiles/` (37 MB). Bez nich generator **działa normalnie**: mapa
rysuje się w trybie „bez grafik” (barwy heksów, ikony, nazwy), a w panelu szczegółów zamiast
obrazka pojawia się zdanie o tym, że grafiki nie pobrano.

Dwie rzeczy warte świadomej decyzji:

* W tym projekcie grafiki **leżą w repozytorium** — patrz `.gitignore` i rozdział 2.3
  dokumentu [GITHUB-KROK-PO-KROKU.md](GITHUB-KROK-PO-KROKU.md). Alternatywa dla innych
  wdrożeń: trzymać katalog poza repozytorium i pobierać grafiki przy każdym wdrożeniu
  (krok `npm run fetch:tiles` w workflow, rozdział 4.3).
* Grafiki to materiały Fantasy Flight Games, pobierane ze zbioru projektu AsyncTI4. Przy
  publicznej publikacji warto mieć to na uwadze. Jeśli strona ma być dostępna dla wszystkich,
  a nie tylko dla twojej grupy grającej, wersja bez grafik jest bezpieczniejsza — i lżejsza
  o 37 z 38 MB.

### 3.3. Sprawdź lokalnie

```bash
npm run dev
```

Otwórz `http://localhost:5173/` i wygeneruj jedną mapę. Jeśli działa lokalnie, zadziała
i na serwerze — nie ma tu żadnej różnicy w środowisku.

---

## 4. GitHub Pages — tak, za darmo

**Odpowiedź brzmi: tak.** GitHub Pages jest darmowy i idealnie pasuje do tego projektu.

### 4.1. Warunki i limity

| Rzecz | Jak jest |
|---|---|
| Koszt | 0 zł dla **repozytoriów publicznych** |
| Repozytoria prywatne | Pages wymaga płatnego planu (Pro / Team / Enterprise) |
| Rozmiar opublikowanej strony | do 1 GB — nasze 38 MB to 4% limitu |
| Transfer | ok. 100 GB miesięcznie (limit „miękki”) |
| Liczba wdrożeń | ok. 10 na godzinę |
| Adres | `https://TWOJ-LOGIN.github.io/NAZWA-REPO/` |
| Własna domena | tak, za darmo, z certyfikatem HTTPS |

Limity są aktualne na dzień pisania — GitHub potrafi je zmienić, więc przy wątpliwościach
warto zerknąć do jego dokumentacji.

Jeśli repozytorium ma być prywatne, a nie chcesz płacić: użyj **Cloudflare Pages**
(rozdział 5) — tam prywatne repozytorium na darmowym planie jest w porządku.

> Jeśli projekt nie jest jeszcze repozytorium git — a nie jest — całą drogę od `git init`
> do działającej strony rozpisuje osobno [GITHUB-KROK-PO-KROKU.md](GITHUB-KROK-PO-KROKU.md).

### 4.2. Sposób najprostszy: gałąź `gh-pages` z gotowymi plikami

Bez żadnej automatyki, wszystko robisz raz z ręki.

1. Zbuduj dane i (jeśli chcesz) pobierz grafiki — rozdział 3.
2. Utwórz osobną gałąź zawierającą **tylko** zawartość `web/`:

   ```bash
   git checkout --orphan gh-pages     # gałąź bez historii
   git rm -rf .                       # czyścimy indeks
   cp -r web/* .                      # zawartość web/ ląduje w korzeniu gałęzi
   touch .nojekyll                    # patrz uwaga niżej
   git add -A
   git commit -m "Publikacja generatora"
   git push -u origin gh-pages
   git checkout main                  # wracamy do pracy
   ```

   Jeśli chcesz wysłać także grafiki, a `web/tiles/` jest w `.gitignore`, wymuś ich dodanie:
   `git add -f tiles`.

3. Na GitHubie wejdź w **Settings → Pages** i ustaw:
   *Source*: `Deploy from a branch`, *Branch*: `gh-pages`, katalog `/ (root)`.
4. Po chwili strona jest pod `https://TWOJ-LOGIN.github.io/NAZWA-REPO/`.

**Po co `.nojekyll`?** GitHub Pages domyślnie przepuszcza pliki przez generator Jekyll, który
pomija wszystko, co zaczyna się od podkreślnika. W tym projekcie nic się tak nie nazywa, ale
pusty plik `.nojekyll` wyłącza ten etap raz na zawsze — publikacja jest wtedy szybsza
i przewidywalna.

### 4.3. Sposób wygodniejszy: GitHub Actions buduje wszystko za ciebie

Zaleta: w repozytorium nie leżą ani wygenerowane dane, ani 37 MB grafik. Wszystko powstaje
przy każdym wdrożeniu, a ty wysyłasz tylko kod źródłowy.

Utwórz plik **`.github/workflows/pages.yml`**:

```yaml
name: Publikacja na GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:        # pozwala uruchomić ręcznie z zakładki Actions

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Zbuduj dane
        run: npm run build:data

      # Ten krok potrzebny jest tylko wtedy, gdy grafik NIE ma w repozytorium.
      # W tym projekcie są, więc plik .github/workflows/pages.yml go nie zawiera.
      - name: Pobierz grafiki kafli
        run: npm run fetch:tiles

      - name: Sprawdź poprawność
        run: node scripts/smoke-test.mjs

      - name: Wyłącz Jekyll
        run: touch web/.nojekyll

      - uses: actions/upload-pages-artifact@v3
        with:
          path: web            # publikujemy wyłącznie katalog web/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Następnie w **Settings → Pages** ustaw *Source* na **`GitHub Actions`** (zamiast „Deploy from
a branch”). Od tej chwili każdy `push` do gałęzi `main` odbudowuje i publikuje stronę.

Krok „Sprawdź poprawność” celowo puszcza smoke-test: jeśli dane się rozjadą, wdrożenie się
zatrzyma, zamiast wystawić w świat zepsutą stronę.

---

## 5. Inne darmowe miejsca

Wszystkie poniższe hostują strony statyczne za darmo i wszystkie nadają się do tego projektu.

| Usługa | Za darmo daje | Na co uważać |
|---|---|---|
| **Cloudflare Pages** | brak limitu transferu, do 20 000 plików na wdrożenie, plik do 25 MB, 500 buildów/mies., działa też z repozytoriów **prywatnych** | nasze 231 grafik + kilkadziesiąt plików mieści się bez problemu |
| **Netlify** | 100 GB transferu/mies., 300 minut budowania | przy dużym ruchu limit transferu potrafi się skończyć |
| **Vercel** | plan Hobby, hojne limity | plan darmowy jest **do zastosowań niekomercyjnych** |
| **GitLab Pages** | darmowe także dla repozytoriów prywatnych | konfiguruje się plikiem `.gitlab-ci.yml` |
| **Surge.sh** | publikacja jedną komendą `surge web/` | brak automatycznego wdrażania z repozytorium |

**Moja rekomendacja:** jeżeli repozytorium może być publiczne — **GitHub Pages** z workflow
z rozdziału 4.3. Jeżeli ma być prywatne — **Cloudflare Pages**, bo to jedyna z listy, która
daje to za darmo.

Wdrożenie na Cloudflare Pages w skrócie: konto → *Workers & Pages* → *Create* → *Pages* →
*Connect to Git* → wybierz repozytorium → *Build command*: `npm run build:data && npm run
fetch:tiles`, *Build output directory*: `web`.

---

## 6. Hostinger i inne hostingi pod WordPressa

### Krótka odpowiedź

**Tak, zadziała — i nie zapłacisz za to ani grosza więcej, niż już płacisz za hosting.**
Ale uwaga na słowo „za darmo”: Hostinger **nie ma planu darmowego**. Jeśli masz u nich
wykupiony hosting pod WordPressa, to dorzucenie tej strony nic nie kosztuje. Jeśli nie masz —
GitHub Pages albo Cloudflare Pages są darmowe naprawdę.

### Dlaczego zadziała

Hosting „pod WordPressa” to zwykły hosting współdzielony: Apache (albo LiteSpeed), PHP
i katalog `public_html`. Nasza strona nie potrzebuje ani PHP, ani bazy danych — serwer ma
tylko oddawać pliki, a to potrafi każdy hosting. WordPress może przy tym dalej działać
w katalogu głównym; generator wystarczy wrzucić obok, do własnego podkatalogu.

### Instrukcja krok po kroku

1. **Przygotuj pliki lokalnie** — `npm run build:data`, ewentualnie `npm run fetch:tiles`.
2. **Spakuj zawartość `web/`** do jednego pliku ZIP. Ważne: pakujesz *zawartość* katalogu
   (czyli `index.html`, `styles.css`, `js/`, `data/`, `tiles/`), a nie sam katalog `web`.
   Wysyłanie 231 pojedynczych plików przez menedżer plików trwałoby wieczność.
3. **Wejdź w hPanel → Pliki → Menedżer plików** i przejdź do `public_html`.
4. **Utwórz podkatalog**, np. `ti4`, i wejdź do niego.
5. **Wgraj ZIP** i rozpakuj go na miejscu (menedżer plików Hostingera ma opcję „Wypakuj”).
   Alternatywa dla dużych paczek: klient FTP (FileZilla) — dane dostępowe są w hPanelu
   w sekcji *Konta FTP*.
6. **Dodaj plik `.htaccess`** w katalogu `ti4` — treść i uzasadnienie niżej.
7. **Wejdź na `https://twojadomena.pl/ti4/`.**

### Konieczny plik `.htaccess`

To jedyny realny haczyk. WordPress wstawia do `public_html/.htaccess` reguły, które
przekierowują **każdy** adres nieistniejący jako plik do `index.php`. Reguły te obowiązują
także w podkatalogach, więc bez tego kroku część odwołań może wylądować na WordPressie
zamiast na naszych plikach. Rozwiązanie: własny `.htaccess` w katalogu `ti4`, który wyłącza
przepisywanie adresów dla tego katalogu.

Utwórz `public_html/ti4/.htaccess` o treści:

```apache
# Generator map TI4 to strona statyczna – żadnych przekierowań do WordPressa.
RewriteEngine Off

# Typy MIME na wypadek, gdyby serwer podawał je błędnie.
AddType text/javascript .js
AddType application/json .json
AddType text/css .css
AddType image/png .png

# Dane i kod zmieniają się rzadko – niech przeglądarka je trzyma.
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/png "access plus 30 days"
  ExpiresByType application/json "access plus 1 hours"
  ExpiresByType text/javascript "access plus 1 hours"
</IfModule>
```

Krótkie życie pamięci podręcznej dla `.js` i `.json` jest celowe: po aktualizacji strony
nie chcesz, żeby ktoś przez tydzień oglądał starą wersję.

### Pozostałe drobiazgi

* **HTTPS** — w hPanelu włącz darmowy certyfikat SSL (Let's Encrypt), jeśli nie jest włączony.
  Bez HTTPS część przeglądarek robi się nieprzyjemna, a poza tym nie ma powodu tego nie mieć.
* **Limit liczby plików (inody)** — plany współdzielone mają go zwykle w setkach tysięcy.
  Nasze ~240 plików to nic.
* **Limit rozmiaru uploadu** — dotyczy pojedynczego pliku wysyłanego przez menedżer plików.
  Paczka z grafikami ma ~37 MB, więc zwykle przechodzi; jeśli nie, wyślij ją FTP-em albo
  podziel na dwie.
* **Node.js na serwerze nie jest potrzebny.** Hostinger na planach współdzielonych i tak go
  nie daje — i dobrze, bo nie ma tu z czego korzystać.

---

## 7. Czego na pewno **nie** potrzebujesz

* Node.js na serwerze docelowym.
* Bazy danych (MySQL, PostgreSQL — żadnej).
* PHP.
* `npm install` — projekt świadomie nie ma żadnych zależności npm.
* Certyfikatów, licencji, kluczy API.

---

## 8. Aktualizacja opublikowanej strony

* **GitHub Actions / Cloudflare Pages:** zrób `git push` — reszta dzieje się sama.
* **Gałąź `gh-pages` ręcznie:** powtórz kroki z rozdziału 4.2.
* **Hostinger:** przebuduj dane lokalnie, spakuj `web/`, wgraj i rozpakuj z nadpisaniem.
  Jeżeli zmieniałeś tylko kod interfejsu, wystarczy podmienić `index.html`, `styles.css`
  i katalog `js/` — dane i grafiki zostają.

---

## 9. Sprawdzenie po wgraniu

Po opublikowaniu przejdź tę listę — wyłapuje wszystkie typowe potknięcia:

1. Strona się otwiera i widać nagłówek „Generator map”.
2. Mapa rysuje się sama po wejściu (domyślnie 4 graczy, widok mapy).
3. Przycisk **Generuj mapę** daje za każdym razem inny układ.
4. Kafle mają grafiki — jeśli nie, `web/tiles/` nie zostało wgrane albo jest puste
   (to nie jest błąd, jeśli świadomie publikujesz wersję bez grafik).
5. Kliknięcie kafla pokazuje szczegóły w panelu po prawej.
6. Zakładka **Rasy i karty** wyświetla listę ras.
7. W konsoli przeglądarki (F12 → Console) nie ma czerwonych błędów.

Gdyby coś nie działało, w 9 przypadkach na 10 winne jest jedno z dwóch: **nie wgrano
`web/data/`** (strona zatrzymuje się zaraz po starcie) albo **pliki otwierane są z dysku
zamiast przez serwer** (rozdział 1).

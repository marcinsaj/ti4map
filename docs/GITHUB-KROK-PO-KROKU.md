# GitHub: repozytorium i publiczna strona — stan i dalsze kroki

Dokument opisuje konkretne repozytorium **`marcinsaj/ti4map`** i drogę do strony pod adresem:

```
https://marcinsaj.github.io/ti4map/
```

Szersze porównanie miejsc hostingu jest w [PUBLIKACJA-ONLINE.md](PUBLIKACJA-ONLINE.md).
Ten dokument jest wąski: wyłącznie ten projekt, to repozytorium.

---

## 1. Odpowiedzi na pytania wprost

**Czy adres będzie kończył się na `/ti4map`?**
Tak, i to bez żadnych ustawień. GitHub Pages dla zwykłego repozytorium (tzw. *project site*)
zawsze buduje adres jako `https://LOGIN.github.io/NAZWA-REPO/`. Nazwa repozytorium brzmi
`ti4map`, więc adres wychodzi `https://marcinsaj.github.io/ti4map/` — dokładnie o to chodziło.

To działa, bo **wszystkie ścieżki w projekcie są względne** (`js/app.js`, `data/systems.json`,
`tiles/…`, `styles.css`). Sprawdzone: w `web/index.html` ani w `web/js/*.js` nie ma ani jednej
ścieżki zaczynającej się od `/`. Gdyby była, strona w podkatalogu by się wysypała, bo `/js/…`
prowadziłoby do `marcinsaj.github.io/js/…` zamiast `marcinsaj.github.io/ti4map/js/…`.

Adres bez `/ti4map` (czyli `https://marcinsaj.github.io/`) wymagałby repozytorium o nazwie
dokładnie `marcinsaj.github.io`. Nie o to prosiłeś, ale warto wiedzieć, że to jedyna różnica.

**Czy musiałem dodać repozytorium?**
Tak — GitHub Pages to funkcja repozytorium, nie osobna usługa do wgrywania plików.
Repozytorium `ti4map` już istnieje i projekt jest z nim połączony (rozdział 2).

**Czy trzeba konfigurować Claude Code?**
Nie. `git` 2.52, `gh` 2.88 zalogowany jako `marcinsaj`, tożsamość w git ustawiona — wszystko
było gotowe. Jedyne, co wymagało obejścia, to zepsuty SSH (rozdział 2.1).

---

## 2. Co już jest zrobione

Repozytorium powstało na GitHubie z licencją **GPL-3.0** i zaślepką `README.md`, czyli miało
już jeden commit. Dlatego projektu nie dało się po prostu „wypchnąć” — trzeba było oprzeć
lokalną historię na tamtym commicie:

```bash
git init -b main
git remote add origin https://github.com/marcinsaj/ti4map.git
git fetch origin
git reset origin/main        # historia startuje od commita z GitHuba
git checkout -- LICENSE      # GPL-3.0 zachowana
git add -A
git commit -m "Generator map do Twilight Imperium 4"
```

Efekt: `Initial commit` → `Generator map…` → `Grafiki kafli…`. Wysłanie będzie czystym
fast-forward, bez scalania i bez konfliktów. Zaślepka README została zastąpiona właściwym
plikiem projektu, licencja GPL-3.0 została nietknięta.

### 2.1. Dlaczego HTTPS, a nie SSH

Pierwsza próba przez SSH nie powiodła się:

```
Can't open user config file G:/PDE/ssh/config: No such file or directory
```

W globalnej konfiguracji git jest `core.sshCommand = ssh -F G:/PDE/ssh/config`, a tej ścieżki
nie ma (dysk `G:` niedostępny). W `~/.ssh` nie ma też żadnych kluczy — tylko `known_hosts`.

Obejście nie ruszyło globalnych ustawień: zdalne repozytorium jest podpięte przez HTTPS,
a poświadczenia bierze z `gh` — konfiguracja zapisana **tylko w tym repozytorium**:

```bash
git remote set-url origin https://github.com/marcinsaj/ti4map.git
git config credential.https://github.com.helper "!gh auth git-credential"
```

Gdy kiedyś naprawisz SSH, wystarczy:
`git remote set-url origin git@github.com:marcinsaj/ti4map.git`.

### 2.2. Co trafiło do repozytorium, a co nie

W katalogu projektu leży 406 MB. Do repozytorium poszło **263 pliki, 37,4 MB**
(29,8 MB po spakowaniu). Wykluczone przez `.gitignore`:

| Katalog | Rozmiar | Dlaczego nie |
|---|---|---|
| `research/` | 369 MB | **pliki po 75 MB i 62 MB** — GitHub odrzuca >100 MB, ostrzega >50 MB |
| `docs/rules/` | 36 MB | oficjalne PDF-y zasad — materiały FFG |
| `vendor/` | ~10 MB | klon repozytorium AsyncTI4, odtwarzalny przez `npm run vendor` |

`research/` dopisałem do `.gitignore` przy okazji — wcześniej go tam nie było i pierwszy
`push` skończyłby się odrzuceniem „file exceeds GitHub's file size limit”.

### 2.3. Grafiki kafli — w repozytorium

Zgodnie z decyzją **231 grafik kafli (37 MB) leży w repozytorium**, w `web/tiles/`.
Wcześniej katalog był w `.gitignore`; teraz jest tam w jego miejsce komentarz wyjaśniający,
dlaczego wyjątkowo wchodzi.

Sprawdzone: wszystkie 231 grafik wymaganych przez `web/data/systems.json` są na miejscu,
żadnej nie brakuje, nie ma też plików nadmiarowych. Największy waży 258 kB.

Zalety takiego rozwiązania: wdrożenie trwa kilkanaście sekund zamiast kilku minut i nie zależy
od tego, czy zewnętrzny serwer z grafikami akurat odpowiada. Koszt: 37 MB w repozytorium,
czyli 4% limitu GitHub Pages (1 GB).

### 2.4. Workflow publikacji

Plik `.github/workflows/pages.yml` jest gotowy. Nie ma w nim kroku pobierania grafik — są
w repozytorium. Buduje natomiast dane od nowa i puszcza smoke-test, żeby rozjechane dane
zatrzymały wdrożenie, zamiast trafić na stronę.

---

## 3. Strona działa

**<https://marcinsaj.github.io/ti4map/>** — opublikowana i sprawdzona.

Pages włączyliśmy przez API (`gh api -X POST repos/marcinsaj/ti4map/pages -f
build_type=workflow`), więc klikanie w Settings nie było potrzebne. Ustawienie widać
w **Settings → Pages** jako *Source: GitHub Actions*.

Od tej chwili **każdy `git push` do `main` przebudowuje i publikuje stronę** — wdrożenie
trwa ok. 35 sekund.

### 3.1. Pierwsze wdrożenie padło — i dlaczego

Workflow miał krok `npm run build:data`. Na maszynie GitHuba wywalił się od razu:

```
Brak danych źródłowych: /home/runner/work/ti4map/ti4map/vendor/async/src/main/resources
Uruchom najpierw:  npm run vendor
```

Budowanie danych wymaga katalogu `vendor/async` — klonu repozytorium AsyncTI4, którego
w repozytorium nie ma i mieć nie powinien (10 MB odtwarzalnych jedną komendą).

Można było dorzucić `npm run vendor` przed budowaniem, ale byłoby to **gorsze**: opublikowane
dane mogłyby po cichu różnić się od tych przetestowanych lokalnie, bo wystarczyłaby zmiana
po stronie AsyncTI4 między jednym a drugim wdrożeniem.

Rozwiązanie: workflow **publikuje dane zatwierdzone w repozytorium** i nie buduje ich od nowa.
Smoke-test sprawdza dokładnie te pliki, które trafiają na stronę — więc zepsute dane dalej
zatrzymają wdrożenie. Dane buduje się lokalnie (`npm run build:data`) i zatwierdza, dokładnie
tak, jak nakazuje CLAUDE.md.

### 3.2. Sprawdzenie na żywo

| Co | Wynik |
|---|---|
| `index.html`, `js/app.js`, `data/systems.json`, `tiles/*.png` | HTTP 200 |
| Kafle na mapie | 37 |
| Grafiki kafli | 33 (reszta to gniazda domowe i puste) |
| Rasy na liście | 116 |
| Błędy w konsoli | brak |

---

## 4. Praca z Claude Code przy tym repozytorium

* **Zatwierdzanie i wysyłanie na żądanie.** Claude Code nie robi `commit` ani `push` z własnej
  inicjatywy — czeka na wyraźne polecenie. Wysłanie na publiczne repozytorium jest widoczne
  na zewnątrz i trudne do cofnięcia.
* **Polecenia interaktywne wykonujesz sam.** Gdyby trzeba było się przelogować
  (`gh auth login`) albo podać hasło, wpisz komendę z przedrostkiem `!`, np. `! gh auth login` —
  wykona się w tej sesji, a wynik trafi do rozmowy.
* **Podgląd przed wysłaniem.** Warto poprosić o `git status` i `git diff`, zwłaszcza gdy
  zmieniało się dane albo dochodziły nowe pliki.
* **Sprawdzenie przed publikacją.** Po zmianach w danych albo generatorze:
  `npm run build:data` i `node scripts/smoke-test.mjs`. Workflow puszcza smoke-test i tak,
  więc zepsute dane zatrzymają wdrożenie.

---

## 5. Gdyby coś nie zadziałało

| Objaw | Przyczyna i co zrobić |
|---|---|
| `push`: „Could not read from remote repository” | Wróciło SSH. Sprawdź `git remote -v` — ma być adres `https://…` |
| `push`: „file exceeds GitHub's file size limit” | Do commita trafił plik z `research/`. Sprawdź `.gitignore` i `git status --short` przed zatwierdzaniem |
| `push`: „refusing to allow… workflow” | Token bez zakresu `workflow`. Tutaj ten zakres jest; gdyby zniknął: `gh auth refresh -s workflow` |
| Actions: „Pages site failed” | W **Settings → Pages** źródło nie jest ustawione na `GitHub Actions` (rozdział 3, krok 2) |
| Strona pusta, w konsoli błędy przy `data/*.json` | Nie zbudowano danych. Sprawdź w logu Actions krok „Zbuduj dane” |
| Kafle bez grafik, w konsoli błędy 404 przy `tiles/…` | `web/tiles/` nie trafiło do repozytorium — sprawdź `git ls-files web/tiles \| wc -l`, ma być 231 |
| Strona pokazuje starą wersję | Pamięć podręczna przeglądarki. Ctrl+F5 albo tryb prywatny |

---

## 6. Sprawdzenie po opublikowaniu

Wejdź na `https://marcinsaj.github.io/ti4map/` i przejdź listę:

1. Strona się otwiera, widać nagłówek „Generator map”.
2. Mapa rysuje się sama (domyślnie 4 graczy).
3. **Generuj mapę** za każdym razem daje inny układ.
4. Kafle mają grafiki.
5. Kliknięcie kafla pokazuje szczegóły w panelu po prawej.
6. Zakładka **Rasy i karty** wyświetla listę ras.
7. Konsola przeglądarki (F12) bez czerwonych błędów.

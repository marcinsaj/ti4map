# Generator map – Twilight Imperium 4

Generator zbalansowanych plansz do *Twilight Imperium: Czwarta Edycja* — podstawka,
*Prophecy of Kings* i *Kraniec Burzy*. Działa w całości w przeglądarce, bez serwera
i bez zależności npm.

**Strona: <https://marcinsaj.github.io/ti4map/>**

## Co jest w tym repozytorium

Wyłącznie to, co potrzebne, żeby strona działała:

```
web/            aplikacja: HTML, CSS, moduły ES, dane i grafiki kafli
scripts/        smoke-test uruchamiany przed każdą publikacją
.github/        workflow publikujący na GitHub Pages
```

Narzędzia deweloperskie (generator danych, serwer lokalny, dokumentacja robocza) są poza
repozytorium — do działania strony nie są potrzebne.

## Uruchomienie lokalne

Pliki muszą być podane przez HTTP — otwarcie `web/index.html` z dysku nie zadziała, bo
przeglądarka blokuje moduły ES i `fetch()` dla adresów `file://`. Wystarczy dowolny serwer
statyczny, na przykład:

```bash
npx serve web
```

## Dane

Opisy kafli, planet, ras i kart pochodzą ze zbioru danych projektu
[AsyncTI4](https://github.com/AsyncTI4/TI4_map_generator_bot). Grafiki kafli są materiałami
Fantasy Flight Games.

## Licencja

GPL-3.0 — patrz [LICENSE](LICENSE).

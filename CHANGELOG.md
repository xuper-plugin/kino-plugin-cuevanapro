# Changelog

## 0.5.13

- The catalog door also lists a series' episodes, for the author's other plugins (std 1.10.1)

## 0.5.12

- Home: a row of the site's Familia genre filed under Infantil (Películas and Series rows are typed; the site has no anime section)

## 0.5.11

- Categorías: every genre tile now shows a picture (a well-known TMDB backdrop per genre, no extra requests)

## 0.5.10

- Netu/Waaw no longer appears among the servers (std 1.9.3)

## 0.5.9

- Servers ordered by how well each hoster plays (kino-resolver's ranking), in your language first (std 1.9.2)

## 0.5.8

- A rich Home that opens at once: a ready slider (TMDB backdrops and synopses) and at least 4 rows, from a snapshot in this repository refreshed every 6 hours (the site only as a fallback) (std 1.8.1)

## 0.5.7

- Back arrow instead of the X: leaving goes back to where you came from (std 1.7.1)

## 0.5.6

- Catalog door: Da-Video finds titles here (std 1.7.0)

## 0.5.5

- Kino's own settings form shows again in Ajustes (settingsIn both); Retry keeps the queued work (std 1.6.2)

## 0.5.4

- Back closes the search box (the screen declares onBack while searching) instead of the whole screen (std 1.6.1)

## 0.5.3

- Tabs load again: the previous version used a timer Kino does not have, so every tab failed; a tab Kino cut short now offers Retry (std 1.6.0)

## 0.5.2

- Back closes the search box instead of the screen; a tab that takes too long offers Retry instead of skeletons; fewer TMDB lookups per tick (std 1.6.0)

## 0.5.1

- The standard screen catches up: a hero from TMDB backdrops when the site has none, TMDB lookups three at a time, one card shape per rail, a row's English title (std 1.5.1)

## 0.5.0

- The standard xuper-plugin screen (src/std 1.4.0): one bar with the logo and the name, Buscar (the words go to Kino's own search) and Ajustes (Kino's own form of the settings, and the donation); a hero of slides; cards and slides open Kino's own title page. The plugin's own search page is gone. apiVersion 30 (Kino 0.9.91).

## 0.1.7

- Home (and every call) leaves at its own budget: Kino waits for every request a call left running before it delivers the answer, so a Home that skipped a slow row was still held until that request ended or retried (measured on users' devices: Home ran 21-34 s with rows logged as skipped, and Kino threw the answer away at 20 s). The plugin now asks Kino to drop what a call leaves running (`globalThis.__kinoDropPendingFetches = true`, read by Kino 0.9.55 and later; an older Kino ignores it), with a test (`test/dropFetches.test.mjs`).

## 0.1.4

- VOE is now read with plain requests first, the way CloudStream's own extractor does (the page behind `voe.sx`'s redirect carries the video in a JSON script), and the hidden browser is only tried when that host cannot be reached. A page that asks for a human check is skipped, never solved. Needs the red permission to connect to any public server (`fetchHosts`), because VOE's redirect domain rotates.
  / VOE se lee primero con peticiones normales, como el extractor de CloudStream, y el navegador oculto solo se prueba si no se puede llegar a ese servidor. Una página que pide verificar que eres humano se salta, nunca se resuelve. Pide el permiso en rojo de conectarse a cualquier servidor público (`fetchHosts`), porque el dominio de VOE cambia.

## 0.1.3

- `resolve` now asks whether a stream's address answers before handing it over and, when its host is down (a CDN node timing out), moves on to the next server instead of ending in "could not connect". (Found on Yosuga no Sora episode 1 in SoloLatino.)
  / `resolve` ahora comprueba que la dirección del video responde y, si su servidor está caído, pasa al siguiente en vez de terminar en «no se pudo conectar».

## 0.1.2

- A search that finds nothing now tries the work's original title and the other titles Kino knows (`originalTitle`, `altTitles`) and the typed text cut at its first colon or dash, and an empty answer is no longer kept in the cache for ten minutes. (Found searching "Yosuga no Sora" in SoloLatino.)
  / Una búsqueda sin resultados ahora prueba el título original, los otros títulos que Kino conoce y el texto cortado en el primer dos puntos o guion; una respuesta vacía ya no se guarda diez minutos en la caché.

## 0.1.1

- Genre pages carry their genre on every title, the TMDB id of each title goes to its page (`ids.tmdb`, so Kino matches its art and cast exactly) and `telemetry` is added.
  / Cada título de un género lleva su género, el id de TMDB va a la ficha y se agrega `telemetry`.

## 0.1.0

- First version, built on Kino's plugin API from the start and following the CloudStream provider "Cuevana": **Home rows** (updated, premieres, trending),
  a **section of its own** (five tabs and a hero), **categories** (12 genres), **search** (also inside a list), **details**, **seasons and episodes**
  with stills and air dates, a **settings form** (preferred language, clear cache) and **downloads**.
  / Primera versión: filas de Inicio, sección propia, categorías, búsqueda, ficha, temporadas y episodios, ajustes y descargas.
- Servers per language (Latino, Castellano, original); StreamWish and VidHide with plain requests, VOE through the hidden browser.
  / Servidores por idioma; StreamWish y VidHide con peticiones normales, VOE con el navegador oculto.

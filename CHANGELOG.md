# Changelog

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

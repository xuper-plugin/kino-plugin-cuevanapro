// Parsers for wv3.cuevana3.eu (a Next.js site): listing cards, and the `__NEXT_DATA__` JSON of a movie, series or episode page.
// Follows the CloudStream provider "CuevanaProvider" (redblacker8/storm-ext): the same pages, the same data, the same mirror table.

export const SITE = "https://wv3.cuevana3.eu";

/** The site's genres (slug, name). */
export const GENRES = [
  ["accion", "Acción"], ["animacion", "Animación"], ["aventura", "Aventura"], ["ciencia-ficcion", "Ciencia Ficción"], ["crimen", "Crimen"],
  ["drama", "Drama"], ["familia", "Familia"], ["fantasia", "Fantasía"], ["misterio", "Misterio"], ["romance", "Romance"], ["suspense", "Suspense"], ["terror", "Terror"],
];

/** Mirror domains the site's players use, and the host Kino knows them by (the provider's `fixHostsLinks`). */
const MIRRORS = [
  // streamwish.to itself now answers a JS loader with no playlist in it; vibuxer.com serves the same files as a plain page
  ["streamwish.to", "vibuxer.com"], ["hglink.to", "vibuxer.com"], ["swdyu.com", "vibuxer.com"], ["cybervynx.com", "vibuxer.com"], ["dumbalag.com", "vibuxer.com"],
  ["mivalyo.com", "vidhidepro.com"], ["dinisglows.com", "vidhidepro.com"], ["dhtpre.com", "vidhidepro.com"],
];
export function fixHost(url) {
  let u;
  try { u = new URL(url); } catch (_) { return url; }
  for (const [from, to] of MIRRORS) if (u.hostname === from) { u.hostname = to; return u.href; }
  return url;
}

const decode = (s) => String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (s) => decode(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** `/_next/image?url=<encoded>&w=..` is the site's image proxy; the address inside is the real one (TMDB's). */
export function posterOf(src) {
  const s = decode(src || "");
  if (s.startsWith("/_next/image?url=")) {
    try { return decodeURIComponent(s.slice("/_next/image?url=".length).split("&")[0]); } catch (_) { return ""; }
  }
  return s.startsWith("/") ? SITE + s : s;
}

/** The cards of a listing or search page: `{ slug, kind: "movie"|"series", title, year, poster, rating }`. */
export function parseCards(html) {
  const out = [];
  const seen = new Set();
  for (const c of String(html || "").split('<li class="TPostMv"').slice(1)) {
    const href = /href="\/ver-(pelicula|serie)\/([^"\/?#]+)"/.exec(c);
    const title = /<span class="Title block">([\s\S]*?)<\/span>/.exec(c);
    if (!href || !title || seen.has(href[1] + href[2])) continue;
    seen.add(href[1] + href[2]);
    const pic = /<img[^>]*\bsrc="([^"]+)"/.exec(c);
    const year = /<span class="Year">\s*(\d{4})/.exec(c) || /class="Date[^"]*">\s*(\d{4})/.exec(c);
    const vote = /<span class="Vote[^"]*">\s*([\d.]+)/.exec(c);
    out.push({ slug: href[2], kind: href[1] === "pelicula" ? "movie" : "series", title: text(title[1]), year: year ? Number(year[1]) : undefined, poster: pic ? sized(posterOf(pic[1]), "w500") : "", rating: vote ? Number(vote[1]) : undefined });
  }
  return out;
}

/** The page props of a page's `__NEXT_DATA__`, or null. */
export function nextData(html) {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(String(html || ""));
  if (!m) return null;
  try { return JSON.parse(m[1]).props.pageProps || null; } catch (_) { return null; }
}

/** TMDB sends "original" (several MB); a card needs `w500`, a wide picture `w1280`. */
export const sized = (u, w) => String(u || "").replace("/t/p/original/", `/t/p/${w}/`);

const yearOf = (d) => { const m = /^(\d{4})/.exec(d || ""); return m ? Number(m[1]) : undefined; };

/** A movie's or series' own data: title, overview, genres, year, runtime, rating, pictures and (series) its seasons. */
export function parseTitle(html) {
  const p = nextData(html);
  const t = p && (p.thisMovie || p.thisSerie);
  if (!t || !t.titles) return null;
  const seasons = (t.seasons || []).map((s) => ({
    season: Number(s.number), episodes: (s.episodes || []).map((e) => ({ number: Number(e.number), title: String(e.title || ""), thumb: sized(e.image, "w300"), date: String(e.releaseDate || "").slice(0, 10) })),
  })).filter((s) => s.episodes.length);
  return {
    kind: p.thisMovie ? "movie" : "series", slug: t.slug && t.slug.name ? String(t.slug.name) : "", title: String(t.titles.name || ""), original: String((t.titles.original && t.titles.original.name) || ""),
    overview: String(t.overview || "").trim(), genres: (t.genres || []).map((g) => String(g.name)), year: yearOf(t.releaseDate), runtimeMinutes: t.runtime ? Number(t.runtime) : undefined,
    rating: t.rate && t.rate.average ? Number(t.rate.average) : undefined, poster: sized(t.images && t.images.poster, "w500"), backdrop: sized(t.images && t.images.backdrop, "w1280"), seasons,
  };
}

/** The servers of a movie page or an episode page: `{ lang: "latino"|"spanish"|"english"|"japanese", host, url }` (url: the site's `player.php` page). */
export function parseServers(html) {
  const p = nextData(html);
  const t = p && (p.thisMovie || p.episode);
  const v = t && t.videos;
  if (!v) return [];
  const out = [];
  for (const [lang, list] of Object.entries(v)) {
    for (const e of Array.isArray(list) ? list : []) if (e && typeof e.result === "string") out.push({ lang, host: String(e.cyberlocker || ""), url: e.result });
  }
  return out;
}

/** The video address a `player.php` page names: `var url = '...'`. */
export function parsePlayer(html) {
  const m = /var url = '([^']+)'/.exec(String(html || ""));
  return m ? fixHost(m[1]) : null;
}

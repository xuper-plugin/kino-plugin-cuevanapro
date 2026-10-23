var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/cuevana.js
var SITE = "https://wv3.cuevana3.eu";
var GENRES = [
  ["accion", "Acci\xF3n"],
  ["animacion", "Animaci\xF3n"],
  ["aventura", "Aventura"],
  ["ciencia-ficcion", "Ciencia Ficci\xF3n"],
  ["crimen", "Crimen"],
  ["drama", "Drama"],
  ["familia", "Familia"],
  ["fantasia", "Fantas\xEDa"],
  ["misterio", "Misterio"],
  ["romance", "Romance"],
  ["suspense", "Suspense"],
  ["terror", "Terror"]
];
var MIRRORS = [
  // streamwish.to itself now answers a JS loader with no playlist in it; vibuxer.com serves the same files as a plain page
  ["streamwish.to", "vibuxer.com"],
  ["hglink.to", "vibuxer.com"],
  ["swdyu.com", "vibuxer.com"],
  ["cybervynx.com", "vibuxer.com"],
  ["dumbalag.com", "vibuxer.com"],
  ["mivalyo.com", "vidhidepro.com"],
  ["dinisglows.com", "vidhidepro.com"],
  ["dhtpre.com", "vidhidepro.com"]
];
function fixHost(url) {
  let u;
  try {
    u = new URL(url);
  } catch (_) {
    return url;
  }
  for (const [from, to] of MIRRORS) if (u.hostname === from) {
    u.hostname = to;
    return u.href;
  }
  return url;
}
var decode = (s) => String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
var text = (s) => decode(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
function posterOf(src) {
  const s = decode(src || "");
  if (s.startsWith("/_next/image?url=")) {
    try {
      return decodeURIComponent(s.slice("/_next/image?url=".length).split("&")[0]);
    } catch (_) {
      return "";
    }
  }
  return s.startsWith("/") ? SITE + s : s;
}
function parseCards(html) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const c of String(html || "").split('<li class="TPostMv"').slice(1)) {
    const href = /href="\/ver-(pelicula|serie)\/([^"\/?#]+)"/.exec(c);
    const title = /<span class="Title block">([\s\S]*?)<\/span>/.exec(c);
    if (!href || !title || seen.has(href[1] + href[2])) continue;
    seen.add(href[1] + href[2]);
    const pic = /<img[^>]*\bsrc="([^"]+)"/.exec(c);
    const year = /<span class="Year">\s*(\d{4})/.exec(c) || /class="Date[^"]*">\s*(\d{4})/.exec(c);
    const vote = /<span class="Vote[^"]*">\s*([\d.]+)/.exec(c);
    out.push({ slug: href[2], kind: href[1] === "pelicula" ? "movie" : "series", title: text(title[1]), year: year ? Number(year[1]) : void 0, poster: pic ? sized(posterOf(pic[1]), "w500") : "", rating: vote ? Number(vote[1]) : void 0 });
  }
  return out;
}
function nextData(html) {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(String(html || ""));
  if (!m) return null;
  try {
    return JSON.parse(m[1]).props.pageProps || null;
  } catch (_) {
    return null;
  }
}
var sized = (u, w) => String(u || "").replace("/t/p/original/", `/t/p/${w}/`);
var yearOf = (d) => {
  const m = /^(\d{4})/.exec(d || "");
  return m ? Number(m[1]) : void 0;
};
function parseTitle(html) {
  const p = nextData(html);
  const t2 = p && (p.thisMovie || p.thisSerie);
  if (!t2 || !t2.titles) return null;
  const seasons = (t2.seasons || []).map((s) => ({
    season: Number(s.number),
    episodes: (s.episodes || []).map((e) => ({ number: Number(e.number), title: String(e.title || ""), thumb: sized(e.image, "w300"), date: String(e.releaseDate || "").slice(0, 10) }))
  })).filter((s) => s.episodes.length);
  return {
    tmdb: Number(t2.TMDbId) > 0 ? Number(t2.TMDbId) : void 0,
    kind: p.thisMovie ? "movie" : "series",
    slug: t2.slug && t2.slug.name ? String(t2.slug.name) : "",
    title: String(t2.titles.name || ""),
    original: String(t2.titles.original && t2.titles.original.name || ""),
    overview: String(t2.overview || "").trim(),
    genres: (t2.genres || []).map((g) => String(g.name)),
    year: yearOf(t2.releaseDate),
    runtimeMinutes: t2.runtime ? Number(t2.runtime) : void 0,
    rating: t2.rate && t2.rate.average ? Number(t2.rate.average) : void 0,
    poster: sized(t2.images && t2.images.poster, "w500"),
    backdrop: sized(t2.images && t2.images.backdrop, "w1280"),
    seasons
  };
}
function parseServers(html) {
  const p = nextData(html);
  const t2 = p && (p.thisMovie || p.episode);
  const v = t2 && t2.videos;
  if (!v) return [];
  const out = [];
  for (const [lang, list] of Object.entries(v)) {
    for (const e of Array.isArray(list) ? list : []) if (e && typeof e.result === "string") out.push({ lang, host: String(e.cyberlocker || ""), url: e.result });
  }
  return out;
}
function parsePlayer(html) {
  const m = /var url = '([^']+)'/.exec(String(html || ""));
  return m ? fixHost(m[1]) : null;
}

// src/extractors/streamwish.js
var streamwish_exports = {};
__export(streamwish_exports, {
  HOSTS: () => HOSTS,
  extract: () => extract
});

// src/util/http.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var REQUEST_MS = 8e3;
var MIN_MS = 1500;
function makeReq(kino2, { deadline }) {
  const req = async (url, opts = {}) => {
    const left = deadline - Date.now();
    if (left < MIN_MS) throw kino2.error("timeout", "no time left for " + new URL(url).hostname);
    return kino2.fetch(url, { headers: { "User-Agent": UA, ...opts.headers || {} }, method: opts.method, body: opts.body, timeoutMs: Math.min(REQUEST_MS, left) });
  };
  req.left = () => Math.max(0, deadline - Date.now());
  return req;
}

// src/util/unpack.js
var ALPHA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
var toNum = (s, radix) => [...s].reduce((n, ch) => n * radix + ALPHA.indexOf(ch), 0);
function unpack(source) {
  const m = /}\s*\(\s*'((?:\\'|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'\.split\('\|'\)/.exec(source || "");
  if (!m) return null;
  const payload = m[1].replace(/\\'/g, "'");
  const radix = Number(m[2]);
  const keys = m[4].split("|");
  if (radix < 2 || radix > 62) return null;
  return payload.replace(/\b[0-9a-zA-Z]+\b/g, (w) => {
    const i = toNum(w, radix);
    return Number.isInteger(i) && i >= 0 && keys[i] ? keys[i] : w;
  });
}

// src/extractors/shared.js
var HLS_MIME = "application/vnd.apple.mpegurl";
function fileM3u8(text2, base) {
  const m = /\bfile\s*:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(text2 || "");
  return m ? absolute(m[1], base) : null;
}
function hlsKey(text2, keys, base) {
  for (const k of keys) {
    const m = new RegExp(`["']${k}["']\\s*:\\s*["']([^"']+)["']`).exec(text2 || "");
    if (m) return absolute(m[1].replace(/\\\//g, "/"), base);
  }
  return null;
}
function absolute(href, base) {
  try {
    return new URL(href, base).href;
  } catch (_) {
    return null;
  }
}
function findIn(html, pick) {
  return pick(html) || pick(unpack(html) || "") || null;
}
function miss(kino2, server, reason) {
  if (kino2 && typeof kino2.log === "function") kino2.log("[cuevanapro]", server, reason);
  return null;
}
async function pageText(req, url, headers, kino2, server) {
  const r = await req(url, { headers });
  return r.ok ? r.text() : miss(kino2, server || "embed", "status " + r.status);
}
var LANG_CODES = [
  [/^(español|espanol|spanish|castellano|latino|spa|esp?)\b/i, "es"],
  [/^(english|inglés|ingles|eng?)\b/i, "en"],
  [/^(portugu[eê]s|portuguese|pt)\b/i, "pt"],
  // never a bare "por": "Por defecto" is not Portuguese
  [/^(fran[cç]ais|french|franc[eé]s|fre|fra|fr)\b/i, "fr"],
  [/^(italiano|italian|ita|it)\b/i, "it"],
  [/^(deutsch|german|alem[aá]n|ger|deu|de)\b/i, "de"]
];
function langCode(label) {
  const s = String(label || "").trim();
  for (const [re, code] of LANG_CODES) if (re.test(s)) return code;
  return null;
}
function captionTracks(text2, base) {
  const m = /["']?\btracks["']?\s*:\s*\[([\s\S]*?)\]/.exec(text2 || "");
  if (!m) return [];
  const out = [];
  for (const [obj] of m[1].matchAll(/\{[^{}]*\}/g)) {
    const field = (k) => (new RegExp(`["']?${k}["']?\\s*:\\s*["']([^"']*)["']`).exec(obj) || [])[1] || "";
    const kind = field("kind").toLowerCase();
    if (kind && kind !== "captions" && kind !== "subtitles") continue;
    const file = field("file");
    const format = (/\.(vtt|srt)(?:[?#]|$)/i.exec(file) || [])[1];
    const label = field("label");
    const lang = langCode(label);
    const url = format && lang ? absolute(file, base) : null;
    if (!url || out.some((t2) => t2.url === url)) continue;
    out.push({ lang, url, label, format: format.toLowerCase() });
  }
  return out;
}
function durationMsOf(text2) {
  const re = /(?<![-\w])duration["']?\s*:\s*["']?(\d+(?:\.\d+)?)(?![\d.])(?!\s*m?s\b)/g;
  for (const m of String(text2 || "").matchAll(re)) {
    const ms = Math.round(Number(m[1]) * 1e3);
    if (ms >= 6e4) return ms;
  }
  return null;
}
function pageExtras(html, base) {
  const unpacked = unpack(html) || "";
  const subs = captionTracks(html, base);
  const subtitles = subs.length ? subs : captionTracks(unpacked, base);
  const durationMs = durationMsOf(html) || durationMsOf(unpacked);
  return { ...subtitles.length ? { subtitles } : {}, ...durationMs ? { durationMs } : {} };
}

// src/extractors/streamwish.js
var HOSTS = ["embedwish.com", "hlswish.com", "streamwish.com", "streamwish.to", "strwish.com", "wishembed.com", "filelions.com", "hglink.to", "vibuxer.com"];
async function extract(embedUrl, req, kino2) {
  const u = new URL(embedUrl);
  if (u.hostname === "hglink.to") u.hostname = "vibuxer.com";
  const referer = u.origin + "/";
  const html = await pageText(req, u.href, { Referer: referer }, kino2, "streamwish");
  if (html == null) return null;
  const url = findIn(html, (t2) => hlsKey(t2, ["hls4", "hls2", "hls3"], u.origin) || fileM3u8(t2, u.origin));
  if (!url) return miss(kino2, "streamwish", "no playlist in page");
  return { url, mime: HLS_MIME, headers: { "User-Agent": UA, Referer: referer }, ...pageExtras(html, u.origin) };
}

// src/extractors/vidhide.js
var vidhide_exports = {};
__export(vidhide_exports, {
  HOSTS: () => HOSTS2,
  extract: () => extract2
});
var HOSTS2 = ["vidhide.com", "vidhidepro.com", "vidhideplus.com", "vidhidefast.com", "dintezuvio.com", "minochinos.com", "filelions.to", "morencius.com"];
async function extract2(embedUrl, req, kino2) {
  const u = new URL(embedUrl);
  const html = await pageText(req, embedUrl, { Referer: u.origin + "/" }, kino2, "vidhide");
  if (html == null) return null;
  const url = findIn(html, (t2) => hlsKey(t2, ["hls4", "hls2"], u.origin) || fileM3u8(t2, u.origin));
  if (!url) return miss(kino2, "vidhide", "no playlist in page");
  return { url, mime: HLS_MIME, headers: { Referer: u.origin + "/", Origin: u.origin }, ...pageExtras(html, u.origin) };
}

// src/extractors/index.js
var TABLE = { streamwish: streamwish_exports, vidhide: vidhide_exports };
function extractorFor(embedUrl) {
  let host;
  try {
    host = new URL(embedUrl).hostname.replace(/^www\./, "");
  } catch (_) {
    return null;
  }
  for (const [name, mod] of Object.entries(TABLE)) {
    if (mod.HOSTS.some((h) => host === h || host.endsWith("." + h))) return { name, extract: mod.extract };
  }
  return null;
}
var HOSTS3 = Object.values(TABLE).flatMap((m) => m.HOSTS);

// src/util/terms.js
function searchTerms(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const out = [];
  const add = (s) => {
    const v = String(s || "").trim();
    if (v.length >= 2 && !out.some((x) => norm(x) === norm(v))) out.push(v);
  };
  add(q);
  if (arg && typeof arg === "object") {
    add(arg.originalTitle);
    for (const a of Array.isArray(arg.altTitles) ? arg.altTitles : []) add(a);
  }
  add(q.split(/\s*[:\-–—]\s*/)[0]);
  return out.slice(0, 4);
}
async function searchWithTerms(arg, one) {
  for (const q of searchTerms(arg)) {
    const found = await one(arg && typeof arg === "object" ? { ...arg, q } : q);
    if (found.length) return found;
  }
  return [];
}

// src/plugin.js
var CACHE_MS = 10 * 60 * 1e3;
var RESOLVE_MS = 6e4;
var CAPTURE_MS = 2e4;
var MAX_CAPTURES = 1;
var MAX_COPIES = 10;
var PAGE = 24;
var HLS = "application/vnd.apple.mpegurl";
var STRINGS = {
  es: {
    news: "Novedades",
    movies: "Pel\xEDculas",
    series: "Series",
    genres: "G\xE9neros",
    premieres: "Estrenos",
    updatedMovies: "Pel\xEDculas actualizadas",
    updatedSeries: "Series actualizadas",
    premiereMovies: "Pel\xEDculas estrenos",
    premiereSeries: "Series estrenos",
    trendingMovies: "Pel\xEDculas en tendencia",
    trendingSeries: "Series en tendencia",
    more: "M\xE1s",
    latino: "Latino",
    spanish: "Castellano",
    english: "Ingl\xE9s",
    japanese: "Japon\xE9s",
    episode: "Episodio",
    heroText: "Pel\xEDculas y series en espa\xF1ol latino, con estrenos al d\xEDa.",
    unavailable: "El servicio no est\xE1 disponible en este momento.",
    noEpisodes: "No se encontraron episodios de esta serie.",
    noStreams: "Ning\xFAn servidor de este t\xEDtulo abri\xF3. Prueba m\xE1s tarde.",
    statusLine: "Listas guardadas: {n}",
    cacheCleared: "Cach\xE9 vaciada."
  },
  en: {
    news: "What's new",
    movies: "Movies",
    series: "Series",
    genres: "Genres",
    premieres: "Premieres",
    updatedMovies: "Updated movies",
    updatedSeries: "Updated series",
    premiereMovies: "Movie premieres",
    premiereSeries: "Series premieres",
    trendingMovies: "Trending movies",
    trendingSeries: "Trending series",
    more: "More",
    latino: "Latino",
    spanish: "Castilian",
    english: "English",
    japanese: "Japanese",
    episode: "Episode",
    heroText: "Movies and series in Latin American Spanish, with new releases.",
    unavailable: "The service is not available right now.",
    noEpisodes: "No episodes found for this series.",
    noStreams: "No server of this title opened. Try again later.",
    statusLine: "Lists kept: {n}",
    cacheCleared: "Cache cleared."
  }
};
var t = (key) => {
  const lang = String(kino.lang || "").toLowerCase().startsWith("es") ? "es" : "en";
  return STRINGS[lang][key] || STRINGS.es[key] || key;
};
async function getPage(url, headers) {
  const r = await kino.fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9", ...headers || {} }, timeoutMs: 15e3 });
  if (!r.ok) throw kino.error("unavailable", `Cuevana ${r.status} ${url}`, { userMessage: t("unavailable") });
  return r.text();
}
async function cached(key, fn) {
  try {
    const raw = kino.storage.get("c:" + key);
    const e = raw ? JSON.parse(raw) : null;
    if (e && Date.now() - e.at < CACHE_MS) return e.v;
  } catch (_) {
  }
  const v = await fn();
  if (Array.isArray(v) && !v.length) return v;
  try {
    kino.storage.set("c:" + key, JSON.stringify({ at: Date.now(), v }), { ttlMs: CACHE_MS });
  } catch (_) {
  }
  return v;
}
var fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
var hash36 = (s) => {
  let h = 5381;
  for (const ch of String(s)) h = (h * 33 ^ ch.codePointAt(0)) >>> 0;
  return h.toString(36);
};
function toItem(card, genreName) {
  const item = {
    id: "cp-" + (fold(card.slug).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "t") + "-" + hash36(card.kind + card.slug),
    ref: (card.kind === "movie" ? "m:" : "s:") + card.slug,
    title: card.title,
    kind: card.kind
  };
  if (card.poster) item.poster = card.poster;
  if (card.year) item.year = String(card.year);
  if (card.rating) item.rating = card.rating;
  if (genreName) item.genres = [genreName];
  return item;
}
var LISTS = {
  peliculas: { path: "/peliculas", titleKey: "updatedMovies", genre: "peliculas" },
  estrenos: { path: "/peliculas/estrenos", titleKey: "premiereMovies", genre: "peliculas" },
  tendencias: { path: "/peliculas/tendencias/semana", titleKey: "trendingMovies", genre: "peliculas" },
  series: { path: "/series", titleKey: "updatedSeries", genre: "series" },
  sestrenos: { path: "/series/estrenos", titleKey: "premiereSeries", genre: "series" },
  stendencias: { path: "/series/tendencias/semana", titleKey: "trendingSeries", genre: "series" }
};
function refOf(ref) {
  const m = /^(list|genre):([a-z0-9-]+)$/.exec(String(ref || ""));
  if (!m) return null;
  if (m[1] === "list") {
    const l = LISTS[m[2]];
    return l ? { ...l, title: t(l.titleKey) } : null;
  }
  const g = GENRES.find((x) => x[0] === m[2]);
  return g ? { path: "/genero/" + g[0], title: g[1], genre: void 0, genreName: g[1] } : null;
}
async function listPage(def, page) {
  const url = SITE + def.path + (page > 1 ? "/page/" + page : "");
  const cards = await cached(`l:${def.path}:${page}`, async () => parseCards(await getPage(url)));
  return { cards, more: cards.length >= PAGE };
}
var safeRow = async (id, fn) => {
  try {
    return await fn();
  } catch (e) {
    kino.log("row " + id + ": " + (e && e.message));
    return null;
  }
};
async function rowOf(id, ref, genre) {
  const def = refOf(ref);
  const { cards } = await listPage(def, 1);
  const items = cards.slice(0, 20).map((c) => toItem(c, def.genreName));
  return items.length ? { id, title: def.title, items, ref, genre: genre || def.genre || "peliculas" } : null;
}
async function home() {
  return (await Promise.all([
    safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")),
    safeRow("series", () => rowOf("series", "list:series")),
    safeRow("estrenos", () => rowOf("estrenos", "list:estrenos")),
    safeRow("sestrenos", () => rowOf("sestrenos", "list:sestrenos")),
    safeRow("tendencias", () => rowOf("tendencias", "list:tendencias"))
  ])).filter(Boolean);
}
async function browse(ref, cursor) {
  const def = refOf(ref);
  if (!def) return { items: [] };
  const page = cursor ? Math.max(1, parseInt(cursor, 10) || 1) : 1;
  const { cards, more } = await listPage(def, page);
  return { items: cards.map((c) => toItem(c, def.genreName)), next: more ? String(page + 1) : void 0 };
}
async function searchOne(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const within = typeof arg === "object" && arg && arg.within ? refOf(arg.within) : null;
  if (q.length < 2) return [];
  const cards = await cached("s:" + q.toLowerCase(), async () => parseCards(await getPage(`${SITE}/search?q=${encodeURIComponent(q)}`)));
  const only = within ? within.genre === "peliculas" ? "movie" : within.genre === "series" ? "series" : null : null;
  return cards.filter((c) => !only || c.kind === only).slice(0, 40).map((c) => toItem(c));
}
var search = (arg) => searchWithTerms(arg, searchOne);
async function section({ tab } = {}) {
  const tabs = [{ id: "novedades", label: t("news") }, { id: "peliculas", label: t("movies") }, { id: "series", label: t("series") }, { id: "estrenos", label: t("premieres") }, { id: "generos", label: t("genres") }];
  const chosen = tabs.some((x) => x.id === tab) ? tab : "novedades";
  const rowsOf = (...names) => Promise.all(names.map((n) => safeRow(n, () => rowOf(n, "list:" + n))));
  let rows = [];
  if (chosen === "novedades") rows = await rowsOf("peliculas", "series", "tendencias");
  else if (chosen === "peliculas") rows = await rowsOf("peliculas", "tendencias", "estrenos");
  else if (chosen === "series") rows = await rowsOf("series", "stendencias", "sestrenos");
  else if (chosen === "estrenos") rows = await rowsOf("estrenos", "sestrenos");
  else rows = await Promise.all(GENRES.slice(0, 6).map(([slug]) => safeRow("g-" + slug, () => rowOf("g-" + slug, "genre:" + slug, slug))));
  rows = rows.filter(Boolean);
  const answer = { tabs, tab: chosen, rows };
  const first = rows.flatMap((r) => r.items).find((i) => i.poster);
  if (first) answer.hero = { title: first.title, text: t("heroText"), image: first.poster };
  return answer;
}
async function categories() {
  return GENRES.map(([slug, name]) => ({ id: "g-" + slug, title: name, ref: "genre:" + slug }));
}
var slugOf = (ref, prefix) => {
  const m = new RegExp(`^${prefix}:([a-z0-9-]+)$`).exec(String(ref || ""));
  return m ? m[1] : null;
};
var titlePage = (kind, slug) => cached("p:" + kind + slug, async () => parseTitle(await getPage(`${SITE}/ver-${kind === "movie" ? "pelicula" : "serie"}/${slug}`)));
async function details(ref) {
  const slug = slugOf(ref, "m");
  if (!slug) return null;
  const p = await titlePage("movie", slug);
  if (!p) return null;
  const out = { overview: p.overview || void 0, genres: p.genres.length ? p.genres : void 0, poster: p.poster || void 0, backdrop: p.backdrop || void 0, year: p.year ? String(p.year) : void 0, rating: p.rating, runtimeMinutes: p.runtimeMinutes, ids: p.tmdb ? { tmdb: p.tmdb } : void 0 };
  for (const k of Object.keys(out)) if (out[k] === void 0) delete out[k];
  return out;
}
async function episodes(ref) {
  const slug = slugOf(ref, "s");
  if (!slug) throw kino.error("not_found", "unknown ref: " + ref);
  const p = await titlePage("series", slug);
  const list = p ? p.seasons.flatMap((s) => s.episodes.map((e) => ({ ...e, season: s.season }))) : [];
  if (!list.length) throw kino.error("not_found", "no episodes for " + slug, { userMessage: t("noEpisodes") });
  const series = { title: p.title || void 0, poster: p.poster || void 0, backdrop: p.backdrop || void 0, overview: p.overview || void 0, genres: p.genres.length ? p.genres : void 0, year: p.year ? String(p.year) : void 0, rating: p.rating, ids: p.tmdb ? { tmdb: p.tmdb } : void 0 };
  for (const k of Object.keys(series)) if (series[k] === void 0) delete series[k];
  return {
    series,
    episodes: list.map((e) => {
      const ep = { season: e.season, number: e.number, ref: `e:${slug}:${e.season}:${e.number}`, title: `${t("episode")} ${e.number}` };
      if (e.thumb) ep.still = e.thumb;
      if (e.date) ep.airDate = e.date;
      return ep;
    })
  };
}
var LANGS = ["latino", "spanish", "english", "japanese"];
var SERVER_NAME = { streamwish: "StreamWish", vidhide: "VidHide", voesx: "VOE", doodstream: "DoodStream" };
function pageOf(ref) {
  let m = /^m:([a-z0-9-]+)$/.exec(ref);
  if (m) return `${SITE}/ver-pelicula/${m[1]}`;
  m = /^e:([a-z0-9-]+):(\d+):(\d+)$/.exec(ref);
  return m ? `${SITE}/episodio/${m[1]}-temporada-${m[2]}-episodio-${m[3]}` : null;
}
function plan(servers) {
  let pref = "latino";
  try {
    pref = String(kino.config.get("audio") || "latino");
  } catch (_) {
    pref = "latino";
  }
  const lang = (s) => {
    const i = LANGS.indexOf(s.lang);
    return s.lang === pref ? -1 : i < 0 ? LANGS.length : i;
  };
  const cost = (s) => /streamwish/i.test(s.host) ? 0 : /vidhide/i.test(s.host) ? 1 : 2;
  return servers.filter((s) => !/dood/i.test(s.host)).map((s, i) => ({ ...s, i })).sort((a, b) => lang(a) - lang(b) || cost(a) - cost(b) || a.i - b.i).slice(0, MAX_COPIES);
}
async function open(server, req, budget) {
  const player = await req(server.url, { headers: { Referer: SITE + "/" } });
  if (!player.ok) return null;
  const embed = parsePlayer(await player.text());
  if (!embed) return null;
  const ex = extractorFor(embed);
  if (ex) return ex.extract(embed, req, kino);
  if (!kino.browser || typeof kino.browser.capture !== "function" || budget.captures <= 0) return null;
  budget.captures -= 1;
  const page = await kino.browser.capture(embed, { timeoutMs: CAPTURE_MS, match: "\\.m3u8|\\.mp4", headers: { Referer: SITE + "/" } });
  const media = page && page.media || [];
  const best = media.find((x) => /m3u8/i.test(x.url)) || media[0];
  if (!best) return null;
  return { url: best.url, mime: best.mime || (/\.mp4/i.test(best.url) ? "video/mp4" : HLS), headers: best.headers || { Referer: embed } };
}
var labelOf = (s) => `${t(s.lang)} \xB7 ${SERVER_NAME[s.host.toLowerCase()] || s.host}`;
async function resolve(ref) {
  const m = /^c:(.+)@(\d+)$/.exec(String(ref || ""));
  const base = m ? m[1] : String(ref || "");
  const only = m ? Number(m[2]) : null;
  const pageUrl = pageOf(base);
  if (!pageUrl) throw kino.error("not_found", "unknown ref: " + ref);
  const servers = plan(parseServers(await getPage(pageUrl, { Referer: SITE + "/" })));
  if (!servers.length) throw kino.error("not_found", "no servers on " + pageUrl, { userMessage: t("noStreams") });
  const req = makeReq(kino, { deadline: Date.now() + RESOLVE_MS });
  const budget = { captures: MAX_CAPTURES };
  const failures = [];
  for (const i of only != null ? [only] : servers.map((_, k) => k)) {
    const s = servers[i];
    if (!s) continue;
    try {
      const out = await open(s, req, budget);
      if (!out) {
        failures.push(`${s.host}: no stream`);
        continue;
      }
      const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...out.headers || {} }, label: labelOf(s) };
      if (out.subtitles) stream.subtitles = out.subtitles;
      if (out.durationMs) stream.durationMs = out.durationMs;
      if (only == null) {
        const others = servers.map((_, j) => j).filter((j) => j !== i);
        if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(servers[j]) }));
      }
      return stream;
    } catch (e) {
      failures.push(`${s.host}: ${e && e.code || ""} ${e && e.message || e}`.trim());
    }
  }
  kino.log(`resolve ${base} failed: ${failures.join("; ")}`);
  throw kino.error("not_found", "no server opened for " + pageUrl, { userMessage: t("noStreams") });
}
async function settingsStatus() {
  let n = 0;
  try {
    n = kino.storage.keys().filter((k) => k.startsWith("c:")).length;
  } catch (_) {
  }
  return { info: t("statusLine").replace("{n}", String(n)) };
}
async function action(key) {
  if (key === "clearCache") {
    try {
      for (const k of kino.storage.keys()) if (k.startsWith("c:")) kino.storage.remove(k);
    } catch (_) {
    }
    return { message: t("cacheCleared") };
  }
  return { message: "" };
}
export {
  action,
  browse,
  categories,
  details,
  episodes,
  home,
  resolve,
  search,
  section,
  settingsStatus
};

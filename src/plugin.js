// @ts-check
// Kino plugin: Cuevana Pro -- movies and series in Spanish (Latino, Castilian) or in their original language, from wv3.cuevana3.eu.
// Follows the CloudStream provider "CuevanaProvider": the listing pages, the `__NEXT_DATA__` JSON of a title and the `player.php` pages that name
// each server's video address. StreamWish and VidHide open with plain requests (./extractors); VOE goes through the hidden browser.

import { SITE, GENRES, parseCards, parseTitle, parseServers, parsePlayer } from "./cuevana.js";
import { extractorFor } from "./extractors/index.js";
import { makeReq, UA } from "./util/http.js";

const CACHE_MS = 10 * 60 * 1000;
const RESOLVE_MS = 60000;
const CAPTURE_MS = 20000;
const MAX_CAPTURES = 1;
const MAX_COPIES = 10;
const PAGE = 24;
const HLS = "application/vnd.apple.mpegurl";

// ---- i18n ----

const STRINGS = {
  es: {
    news: "Novedades", movies: "Películas", series: "Series", genres: "Géneros", premieres: "Estrenos", updatedMovies: "Películas actualizadas", updatedSeries: "Series actualizadas",
    premiereMovies: "Películas estrenos", premiereSeries: "Series estrenos", trendingMovies: "Películas en tendencia", trendingSeries: "Series en tendencia", more: "Más",
    latino: "Latino", spanish: "Castellano", english: "Inglés", japanese: "Japonés", episode: "Episodio",
    heroText: "Películas y series en español latino, con estrenos al día.",
    unavailable: "El servicio no está disponible en este momento.", noEpisodes: "No se encontraron episodios de esta serie.", noStreams: "Ningún servidor de este título abrió. Prueba más tarde.",
    statusLine: "Listas guardadas: {n}", cacheCleared: "Caché vaciada.",
  },
  en: {
    news: "What's new", movies: "Movies", series: "Series", genres: "Genres", premieres: "Premieres", updatedMovies: "Updated movies", updatedSeries: "Updated series",
    premiereMovies: "Movie premieres", premiereSeries: "Series premieres", trendingMovies: "Trending movies", trendingSeries: "Trending series", more: "More",
    latino: "Latino", spanish: "Castilian", english: "English", japanese: "Japanese", episode: "Episode",
    heroText: "Movies and series in Latin American Spanish, with new releases.",
    unavailable: "The service is not available right now.", noEpisodes: "No episodes found for this series.", noStreams: "No server of this title opened. Try again later.",
    statusLine: "Lists kept: {n}", cacheCleared: "Cache cleared.",
  },
};
const t = (key) => {
  const lang = String(kino.lang || "").toLowerCase().startsWith("es") ? "es" : "en";
  return STRINGS[lang][key] || STRINGS.es[key] || key;
};

// ---- helpers ----

async function getPage(url, headers) {
  const r = await kino.fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9", ...(headers || {}) }, timeoutMs: 15000 });
  if (!r.ok) throw kino.error("unavailable", `Cuevana ${r.status} ${url}`, { userMessage: t("unavailable") });
  return r.text();
}

async function cached(key, fn) {
  try {
    const raw = kino.storage.get("c:" + key);
    const e = raw ? JSON.parse(raw) : null;
    if (e && Date.now() - e.at < CACHE_MS) return e.v;
  } catch (_) { /* no cache */ }
  const v = await fn();
  try { kino.storage.set("c:" + key, JSON.stringify({ at: Date.now(), v }), { ttlMs: CACHE_MS }); } catch (_) { /* a full storage only costs a refetch */ }
  return v;
}

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hash36 = (s) => { let h = 5381; for (const ch of String(s)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0; return h.toString(36); };

function toItem(card) {
  const item = {
    id: "cp-" + (fold(card.slug).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "t") + "-" + hash36(card.kind + card.slug),
    ref: (card.kind === "movie" ? "m:" : "s:") + card.slug, title: card.title, kind: card.kind,
  };
  if (card.poster) item.poster = card.poster;
  if (card.year) item.year = String(card.year);
  if (card.rating) item.rating = card.rating;
  return item;
}

// ---- the lists ----

const LISTS = {
  peliculas: { path: "/peliculas", titleKey: "updatedMovies", genre: "peliculas" },
  estrenos: { path: "/peliculas/estrenos", titleKey: "premiereMovies", genre: "peliculas" },
  tendencias: { path: "/peliculas/tendencias/semana", titleKey: "trendingMovies", genre: "peliculas" },
  series: { path: "/series", titleKey: "updatedSeries", genre: "series" },
  sestrenos: { path: "/series/estrenos", titleKey: "premiereSeries", genre: "series" },
  stendencias: { path: "/series/tendencias/semana", titleKey: "trendingSeries", genre: "series" },
};

/** `{ path, title, genre }` for a browse ref ("list:<name>" or "genre:<slug>"); null for anything else. */
function refOf(ref) {
  const m = /^(list|genre):([a-z0-9-]+)$/.exec(String(ref || ""));
  if (!m) return null;
  if (m[1] === "list") { const l = LISTS[m[2]]; return l ? { ...l, title: t(l.titleKey) } : null; }
  const g = GENRES.find((x) => x[0] === m[2]);
  return g ? { path: "/genero/" + g[0], title: g[1], genre: undefined } : null;
}

async function listPage(def, page) {
  const url = SITE + def.path + (page > 1 ? "/page/" + page : "");
  const cards = await cached(`l:${def.path}:${page}`, async () => parseCards(await getPage(url)));
  return { cards, more: cards.length >= PAGE };
}

const safeRow = async (id, fn) => { try { return await fn(); } catch (e) { kino.log("row " + id + ": " + (e && e.message)); return null; } };

async function rowOf(id, ref, genre) {
  const def = refOf(ref);
  const { cards } = await listPage(def, 1);
  const items = cards.slice(0, 20).map(toItem);
  return items.length ? { id, title: def.title, items, ref, genre: genre || def.genre || "peliculas" } : null;
}

// ---- exports ----

export async function home() {
  return (await Promise.all([
    safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")),
    safeRow("series", () => rowOf("series", "list:series")),
    safeRow("estrenos", () => rowOf("estrenos", "list:estrenos")),
    safeRow("sestrenos", () => rowOf("sestrenos", "list:sestrenos")),
    safeRow("tendencias", () => rowOf("tendencias", "list:tendencias")),
  ])).filter(Boolean);
}

export async function browse(ref, cursor) {
  const def = refOf(ref);
  if (!def) return { items: [] };
  const page = cursor ? Math.max(1, parseInt(cursor, 10) || 1) : 1;
  const { cards, more } = await listPage(def, page);
  return { items: cards.map(toItem), next: more ? String(page + 1) : undefined };
}

export async function search(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const within = typeof arg === "object" && arg && arg.within ? refOf(arg.within) : null;
  if (q.length < 2) return [];
  const cards = await cached("s:" + q.toLowerCase(), async () => parseCards(await getPage(`${SITE}/search?q=${encodeURIComponent(q)}`)));
  const only = within ? (within.genre === "peliculas" ? "movie" : within.genre === "series" ? "series" : null) : null;
  return cards.filter((c) => !only || c.kind === only).slice(0, 40).map(toItem);
}

// ---- the plugin's own section, categories and details ----

export async function section({ tab } = {}) {
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

export async function categories() {
  return GENRES.map(([slug, name]) => ({ id: "g-" + slug, title: name, ref: "genre:" + slug }));
}

const slugOf = (ref, prefix) => { const m = new RegExp(`^${prefix}:([a-z0-9-]+)$`).exec(String(ref || "")); return m ? m[1] : null; };
const titlePage = (kind, slug) => cached("p:" + kind + slug, async () => parseTitle(await getPage(`${SITE}/ver-${kind === "movie" ? "pelicula" : "serie"}/${slug}`)));

/** A movie's own page: synopsis, genres, year, runtime, rating and the wide picture. */
export async function details(ref) {
  const slug = slugOf(ref, "m");
  if (!slug) return null;
  const p = await titlePage("movie", slug);
  if (!p) return null;
  const out = { overview: p.overview || undefined, genres: p.genres.length ? p.genres : undefined, poster: p.poster || undefined, backdrop: p.backdrop || undefined, year: p.year ? String(p.year) : undefined, rating: p.rating, runtimeMinutes: p.runtimeMinutes };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

export async function episodes(ref) {
  const slug = slugOf(ref, "s");
  if (!slug) throw kino.error("not_found", "unknown ref: " + ref);
  const p = await titlePage("series", slug);
  const list = p ? p.seasons.flatMap((s) => s.episodes.map((e) => ({ ...e, season: s.season }))) : [];
  if (!list.length) throw kino.error("not_found", "no episodes for " + slug, { userMessage: t("noEpisodes") });
  const series = { title: p.title || undefined, poster: p.poster || undefined, backdrop: p.backdrop || undefined, overview: p.overview || undefined, genres: p.genres.length ? p.genres : undefined, year: p.year ? String(p.year) : undefined, rating: p.rating };
  for (const k of Object.keys(series)) if (series[k] === undefined) delete series[k];
  return {
    series,
    episodes: list.map((e) => {
      const ep = { season: e.season, number: e.number, ref: `e:${slug}:${e.season}:${e.number}`, title: `${t("episode")} ${e.number}` };
      if (e.thumb) ep.still = e.thumb;
      if (e.date) ep.airDate = e.date;
      return ep;
    }),
  };
}

// ---- resolve ----

const LANGS = ["latino", "spanish", "english", "japanese"];
const SERVER_NAME = { streamwish: "StreamWish", vidhide: "VidHide", voesx: "VOE", doodstream: "DoodStream" };

/** The page of a movie ("m:<slug>") or an episode ("e:<slug>:<season>:<episode>"). */
function pageOf(ref) {
  let m = /^m:([a-z0-9-]+)$/.exec(ref);
  if (m) return `${SITE}/ver-pelicula/${m[1]}`;
  m = /^e:([a-z0-9-]+):(\d+):(\d+)$/.exec(ref);
  return m ? `${SITE}/episodio/${m[1]}-temporada-${m[2]}-episodio-${m[3]}` : null;
}

/** The servers of a page in the order to try them: the preferred language first, then the ones opened with plain requests; DoodStream is left out (it refuses). */
function plan(servers) {
  let pref = "latino";
  try { pref = String(kino.config.get("audio") || "latino"); } catch (_) { pref = "latino"; }
  const lang = (s) => { const i = LANGS.indexOf(s.lang); return s.lang === pref ? -1 : i < 0 ? LANGS.length : i; };
  const cost = (s) => (/streamwish/i.test(s.host) ? 0 : /vidhide/i.test(s.host) ? 1 : 2);
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
  const media = (page && page.media) || [];
  const best = media.find((x) => /m3u8/i.test(x.url)) || media[0];
  if (!best) return null;
  return { url: best.url, mime: best.mime || (/\.mp4/i.test(best.url) ? "video/mp4" : HLS), headers: best.headers || { Referer: embed } };
}

const labelOf = (s) => `${t(s.lang)} · ${SERVER_NAME[s.host.toLowerCase()] || s.host}`;

/** `ref` is a movie ("m:<slug>"), an episode ("e:<slug>:<season>:<ep>") or one of their other servers ("c:<ref>@<i>"). */
export async function resolve(ref) {
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
      if (!out) { failures.push(`${s.host}: no stream`); continue; }
      const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...(out.headers || {}) }, label: labelOf(s) };
      if (out.subtitles) stream.subtitles = out.subtitles;
      if (out.durationMs) stream.durationMs = out.durationMs;
      if (only == null) {
        const others = servers.map((_, j) => j).filter((j) => j !== i);
        if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(servers[j]) }));
      }
      return stream;
    } catch (e) {
      failures.push(`${s.host}: ${(e && e.code) || ""} ${(e && e.message) || e}`.trim());
    }
  }
  kino.log(`resolve ${base} failed: ${failures.join("; ")}`);
  throw kino.error("not_found", "no server opened for " + pageUrl, { userMessage: t("noStreams") });
}

// ---- Ajustes ▸ Cuevana Pro ----

export async function settingsStatus() {
  let n = 0;
  try { n = kino.storage.keys().filter((k) => k.startsWith("c:")).length; } catch (_) { /* no storage */ }
  return { info: t("statusLine").replace("{n}", String(n)) };
}

export async function action(key) {
  if (key === "clearCache") {
    try { for (const k of kino.storage.keys()) if (k.startsWith("c:")) kino.storage.remove(k); } catch (_) { /* nothing to clear */ }
    return { message: t("cacheCleared") };
  }
  return { message: "" };
}

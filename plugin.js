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
var NAMED_ENTITIES = { ndash: "\u2013", mdash: "\u2014", hellip: "\u2026", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201C", rdquo: "\u201D", nbsp: " ", iexcl: "\xA1", iquest: "\xBF", laquo: "\xAB", raquo: "\xBB", aacute: "\xE1", eacute: "\xE9", iacute: "\xED", oacute: "\xF3", uacute: "\xFA", ntilde: "\xF1", Aacute: "\xC1", Eacute: "\xC9", Iacute: "\xCD", Oacute: "\xD3", Uacute: "\xDA", Ntilde: "\xD1", uuml: "\xFC" };
var decodeMore = (s) => s.replace(/&#([0-9]{1,7});/g, (m, n) => {
  const c = Number(n);
  return c > 0 && c <= 1114111 ? String.fromCodePoint(c) : m;
}).replace(/&#x([0-9a-f]{1,6});/gi, (m, h) => {
  const c = parseInt(h, 16);
  return c > 0 && c <= 1114111 ? String.fromCodePoint(c) : m;
}).replace(/&([a-z]+);/gi, (m, k) => NAMED_ENTITIES[k] ?? m);
var decode = (s) => decodeMore(String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
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

// src/std/model.js
var MAX_SLIDES = 5;
var MAX_RAILS = 8;
var MAX_RAIL_ITEMS = 20;
var MAX_SLIDE_TEXT = 160;
var HTTPS = /^https:\/\//;
function cardOf(item) {
  const out = { id: item.id, ref: item.ref, title: item.title, kind: item.kind };
  if (item.poster && HTTPS.test(item.poster)) out.poster = item.poster;
  if (item.backdrop && HTTPS.test(item.backdrop)) out.backdrop = item.backdrop;
  if (item.badges) out.badges = item.badges;
  if (item.rating !== void 0) out.rating = item.rating;
  if (item.year !== void 0) out.year = item.year;
  if (item.ids && item.ids.tmdb) out.ids = { tmdb: item.ids.tmdb };
  if (item.lang) out.lang = item.lang;
  if (item.adult === true) out.adult = true;
  return out;
}
var slidesOf = (rows) => pickSlides(rows, (item) => item.backdrop);
var posterSlidesOf = (rows) => pickSlides(rows, (item) => item.poster);
function slideText(overview, item = {}) {
  const text2 = typeof overview === "string" ? overview.trim() : "";
  if (text2 === "") return [item.year, item.rating ? "\u2605 " + item.rating : null].filter(Boolean).join(" \xB7 ");
  return text2.length <= MAX_SLIDE_TEXT ? text2 : `${text2.slice(0, MAX_SLIDE_TEXT - 1).trimEnd()}\u2026`;
}
function pickSlides(rows, pictureOf) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    for (const item of row.items || []) {
      if (out.length >= MAX_SLIDES) return out;
      const image = pictureOf(item);
      if (item.adult === true || seen.has(item.id) || !image || !HTTPS.test(image)) continue;
      seen.add(item.id);
      out.push({ id: item.id, ref: item.ref, kind: item.kind, title: item.title, image, text: slideText(item.overview, item) });
    }
  }
  return out;
}
var uniform = (items) => items.every((i) => i.backdrop) ? items : items.map(({ backdrop, ...rest }) => rest);
function railsOf(rows) {
  return rows.filter((r) => !r.hidden && r.items && r.items.length > 0).slice(0, MAX_RAILS).map((r) => ({
    id: r.id,
    title: r.title,
    ...r.titleEn ? { titleEn: r.titleEn } : {},
    ...r.ref ? { ref: r.ref } : {},
    items: uniform(r.items.slice(0, MAX_RAIL_ITEMS).map(cardOf))
  }));
}
function tabOf(page) {
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const rails = railsOf(rows);
  if (rails.length === 0) return null;
  return { slides: slidesOf(rows), posterSlides: posterSlidesOf(rows), rails };
}
function playedKey(ref) {
  const m = /^(?:m|s|e):(\d{1,10})(?::|$)/.exec(String(ref || ""));
  return m ? `t:${m[1]}` : String(ref || "");
}
function recentOf(keys, tabs) {
  if (keys.length === 0) return [];
  const byKey = /* @__PURE__ */ new Map();
  for (const data of tabs) {
    for (const rail2 of data.rails) {
      for (const card of rail2.items) {
        const ks = [card.ref];
        if (card.ids && card.ids.tmdb) ks.push(`t:${card.ids.tmdb}`);
        for (const k of ks) if (!byKey.has(k)) byKey.set(k, card);
      }
    }
  }
  const out = [];
  const used = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const card = byKey.get(key);
    if (card && !used.has(card.id)) {
      used.add(card.id);
      out.push(card);
    }
  }
  return out;
}

// src/std/strings.js
var WORDS = {
  watch: ["Ver", "Watch"],
  info: ["M\xE1s informaci\xF3n", "More info"],
  recent: ["Continuar viendo", "Continue watching"],
  search: ["Buscar", "Search"],
  searchHint: ["Buscar en {name}", "Search {name}"],
  failed: ["No se pudo cargar esta secci\xF3n. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "This section could not be loaded. Check your connection and try again."],
  retry: ["Reintentar", "Retry"],
  empty: ["A\xFAn no hay nada aqu\xED.", "Nothing here yet."],
  back: ["Atr\xE1s", "Back"],
  close: ["Cerrar", "Close"],
  settings: ["Ajustes", "Settings"],
  resultsTitle: ["Resultados: {q}", "Results: {q}"],
  resultsIn: ["En {name}", "In {name}"],
  resultsSearching: ["Buscando en {name}\u2026", "Searching {name}\u2026"],
  resultsFailed: ["{name} no respondi\xF3 esta vez.", "{name} did not answer this time."],
  noResults: ["No encontramos nada con esas palabras en tus plugins.", "Nothing in your plugins matched those words."],
  supportTv: ["Si te gusta mi trabajo, escan\xE9alo y ap\xF3yame", "If you like my work, scan it and support me"],
  support: ["Si te gusta mi trabajo, ap\xF3yame", "If you like my work, support me"],
  gateTitle: ["Necesitas el motor de reproducci\xF3n", "You need the playback engine"],
  gateText: [
    "{name} reproduce a trav\xE9s de Kino Resolver (gratis). Inst\xE1lalo una vez y sirve para este y para otros plugins de sitios.",
    "{name} plays through Kino Resolver (free). Install it once and it works here and in other site plugins."
  ],
  gateInstall: ["Instalar Kino Resolver", "Install Kino Resolver"]
};
var fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] != null ? String(vars[k]) : m);
function twin(key, field = "text", vars) {
  const [es, en] = WORDS[key];
  const pick = (i) => vars && Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, Array.isArray(v) ? v[i] : v]));
  return { [field]: fill(es, pick(0)), [field + "En"]: fill(en, pick(1)) };
}
var STRING_KEYS = Object.keys(WORDS);

// src/std/view.js
var SUPPORT_URL = "https://ko-fi.com/xuperplugins";
var RESOLVER_REPO = "xuper-plugin/kino-plugin-kino-resolver";
var POLL_MS = 1500;
function brand(cfg) {
  return {
    type: "Row",
    key: "brand",
    gap: 12,
    crossAxisAlignment: "center",
    children: [
      ...cfg.logo ? [{ type: "Image", key: "logo", url: cfg.logo, aspect: cfg.logoAspect || "1:1", fit: "contain", h: 32, alt: cfg.name, altEn: cfg.nameEn || cfg.name }] : [],
      { type: "Text", key: "name", style: "h4", text: cfg.name, textEn: cfg.nameEn || cfg.name }
    ]
  };
}
var tabBar = (tabs, active) => ({
  type: "TabBar",
  key: "tabs",
  divider: false,
  value: active,
  onChanged: "tab",
  tabs: tabs.map((t2) => ({ value: t2.id, label: t2.label, labelEn: t2.labelEn || t2.label }))
});
var iconButton = (key, icon, word, onPressed) => ({ type: "IconButton", key, icon, ...twin(word, "labelText"), ...twin(word, "tooltip"), onPressed });
var searchOpenOps = (tabsInBar) => [
  { hide: "close" },
  { hide: "brand" },
  { hide: "searchButton" },
  { hide: "settingsButton" },
  ...tabsInBar ? [{ hide: "tabs" }] : [],
  { show: "closeSearch" },
  { show: "q" },
  { focus: "q" }
];
var searchClosedOps = (tabsInBar) => [
  { hide: "closeSearch" },
  { hide: "q" },
  { clear: "q" },
  { show: "close" },
  { show: "brand" },
  { show: "searchButton" },
  { show: "settingsButton" },
  ...tabsInBar ? [{ show: "tabs" }] : []
];
var leaveButton = (cfg) => cfg.backArrow ? iconButton("close", "arrow_back", "back", { go: { close: true } }) : iconButton("close", "close", "close", { go: { close: true } });
function supportNode(device) {
  if (device === "tv") return { type: "QrImage", key: "donate", value: SUPPORT_URL, size: "large", ...twin("supportTv", "labelText") };
  return { type: "ElevatedButton", key: "donate", icon: "heart", ...twin("support", "labelText"), onPressed: { go: { url: { href: SUPPORT_URL } } } };
}
var bar = ({ leading, title, actions = [] }) => ({ type: "AppBar", mergeWithKinoBar: true, dense: true, divider: false, leading, title, actions });
var railSkeleton = (n) => ({
  type: "Column",
  key: "skel" + n,
  gap: 8,
  children: [
    { type: "Skeleton", shape: "line", width: 120 },
    { type: "Row", gap: 12, sizes: ["compact"], children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}c${i}`, flex: 1 })) },
    { type: "Row", gap: 12, sizes: ["medium", "expanded"], children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}w${i}`, flex: 1 })) }
  ]
});
var heroSkeleton = () => ({ type: "Skeleton", key: "heroSkeleton", shape: "block", height: { compact: 200, expanded: 320 } });
var titleOf = (s) => ({ ref: s.ref, kind: s.kind, id: s.id, title: s.title });
var withHeaders = (headers) => headers ? { headers } : {};
var slideNode = (s, headers) => ({
  type: "heroCard",
  key: "slide-" + s.id,
  h: { compact: 200, expanded: 240 },
  ...s.logo ? { logo: s.logo } : {},
  title: s.title,
  text: s.text,
  image: s.image,
  ...withHeaders(headers),
  buttons: [
    { type: "ElevatedButton", key: "watch-" + s.id, ...twin("watch", "labelText"), icon: "play", onPressed: { go: { play: titleOf(s) } } },
    { type: "TextButton", key: "info-" + s.id, ...twin("info", "labelText"), onPressed: { go: { title: titleOf(s) } } }
  ]
});
var hero = (slides, headers) => slides.length === 1 ? slideNode(slides[0], headers) : {
  type: "PageView",
  key: "hero" + slides.length,
  autoPlayMs: 6e3,
  children: slides.map((s) => slideNode(s, headers))
};
var rail = (r, key, words, headers) => ({
  type: "titleRail",
  key,
  ...words || { title: r.title, titleEn: r.titleEn || r.title },
  ...r.ref ? { ref: r.ref } : {},
  items: r.items,
  ...withHeaders(headers)
});
function browseView(cfg, { tab, data, recent, pending, failed, searching = false, device = "phone", own = null, ownActions = [] }) {
  const tv = device === "tv";
  const tabs = own ? [cfg.tabs[0]] : cfg.tabs;
  const active = tabs.some((t2) => t2.id === tab) ? tab : tabs[0].id;
  const withTabs = tabs.length > 1;
  const body = [];
  const ownBlocks = own && !Array.isArray(own) && Array.isArray(own.blocks) ? own.blocks : null;
  if (ownBlocks) {
  } else if (own) {
    body.push(...own);
  } else if (data) {
    const h = cfg.imageHeaders;
    if (data.slides.length > 0) body.push(hero(data.slides, h));
    if (recent.length > 0) body.push(rail({ items: recent }, "recent", twin("recent", "title"), h));
    for (const r of data.rails) body.push(rail(r, "rail-" + String(r.id).replace(/[^A-Za-z0-9_-]/g, "_"), null, h));
    if (data.rails.length === 0) body.push({ type: "Text", key: "empty", ...twin("empty"), color: "muted" });
  } else if (failed) {
    body.push({ type: "MaterialBanner", key: "loadFailed", role: "error", ...twin("failed"), action: { ...twin("retry", "label"), onTap: "retry" } });
  } else {
    body.push(heroSkeleton(), railSkeleton(1), railSkeleton(2), railSkeleton(3));
  }
  const isBanner = (n) => !!n && (n.type === "heroCard" || n.key === "heroSkeleton" || n.type === "PageView" && String(n.key).startsWith("hero"));
  const banner = body.length > 0 && isBanner(body[0]) ? body.shift() : null;
  const tabsInBar = tv && withTabs;
  const appBar = bar({
    leading: leaveButton(cfg),
    title: { type: "Row", key: "titleRow", gap: tabsInBar ? 24 : 8, crossAxisAlignment: "center", children: [
      { ...iconButton("closeSearch", "arrow_back", "back", { ui: searchClosedOps(tabsInBar), event: "searchClosed" }), hidden: true },
      brand(cfg),
      ...tabsInBar ? [tabBar(tabs, active)] : [],
      {
        type: "TextField",
        key: "q",
        hidden: true,
        flex: 1,
        kind: "search",
        maxLength: 200,
        ...twin("searchHint", "hintText", { name: [cfg.name, cfg.nameEn || cfg.name] }),
        onSubmitted: "search",
        trailingIcon: "search",
        ...twin("search", "trailingLabel"),
        onTrailingTap: "search"
      }
    ] },
    actions: [
      // barSearch: false (std 1.7.0): the plugin draws its own search field in its page instead of the bar's icon.
      ...cfg.barSearch ? [iconButton("searchButton", "search", "search", { ui: searchOpenOps(tabsInBar), event: "searchOpened" })] : [],
      // std 1.9.0: the page's own bar buttons (page.actions), before the settings gear.
      ...Array.isArray(ownActions) ? ownActions : [],
      iconButton("settingsButton", "settings", "settings", "openSettings")
    ]
  });
  return {
    type: "Scaffold",
    ...searching ? { onBack: { ui: searchClosedOps(tabsInBar), event: "searchClosed" } } : {},
    appBar,
    body: { type: "Column", key: "page", children: [
      ...withTabs && !tv ? [{ type: "Column", key: "tabsRow", padding: { compact: 0, expanded: 24 }, children: [tabBar(tabs, active)] }] : [],
      { type: "SingleChildScrollView", key: "browse-" + active, flex: 1, children: ownBlocks ? ownBlocks.filter((b) => b && Array.isArray(b.nodes) && b.nodes.length).flatMap((b, i) => b.edge ? b.nodes : [{ type: "Column", key: "block-" + i, padding: { compact: 12, expanded: 24 }, gap: 16, crossAxisAlignment: "stretch", children: b.nodes }]) : [...banner ? [banner] : [], { type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] }
    ] },
    ...pending ? { every: { ms: POLL_MS, event: "tick" } } : {}
  };
}
function resultsView(cfg, { q, order, names, pending, found, device = "phone" }) {
  const body = [];
  let shown = 0;
  order.forEach((repo, i) => {
    const name = [names[repo] || repo, names[repo] || repo];
    if (pending.includes(repo)) {
      body.push({ type: "Column", key: "wait-" + i, gap: 8, children: [{ type: "Text", key: "waitText-" + i, color: "muted", ...twin("resultsSearching", "text", { name }) }, railSkeleton(i)] });
      return;
    }
    const r = found.get(repo);
    if (!r || !r.ok) {
      body.push({ type: "Text", key: "failed-" + i, color: "muted", ...twin("resultsFailed", "text", { name }) });
      return;
    }
    if (!r.items.length) return;
    shown++;
    body.push(rail({ items: r.items }, "found-" + i, twin("resultsIn", "title", { name }), cfg.imageHeaders));
  });
  if (!pending.length && shown === 0 && order.some((r) => {
    const x = found.get(r);
    return x && x.ok;
  })) body.unshift({ type: "Text", key: "noResults", ...twin("noResults") });
  return {
    type: "Scaffold",
    appBar: bar({ leading: iconButton("back", "arrow_back", "back", "back"), title: { type: "Text", key: "resultsTitle", style: "h4", ...twin("resultsTitle", "text", { q }) } }),
    body: { type: "SingleChildScrollView", key: "results-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] },
    ...pending.length ? { every: { ms: 1500, event: "tick" } } : {}
  };
}
function settingsView(cfg, device = "phone") {
  return {
    type: "Scaffold",
    appBar: bar({ leading: iconButton("back", "arrow_back", "back", "back"), title: brand(cfg) }),
    body: { type: "SingleChildScrollView", key: "settings-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: [
      ...cfg.hasSettings ? [{ type: "settings", key: "form" }, { type: "Divider", key: "supportDivider" }] : [],
      supportNode(device)
    ] }] }
  };
}
function gateView(cfg, device = "phone") {
  const name = [cfg.name, cfg.nameEn || cfg.name];
  return {
    type: "Scaffold",
    appBar: bar({ leading: leaveButton(cfg), title: brand(cfg) }),
    body: { type: "Column", key: "gate", mainAxisAlignment: "center", crossAxisAlignment: "center", padding: 24, gap: 16, children: [
      { type: "Text", key: "gateTitle", style: "h3", ...twin("gateTitle") },
      { type: "Text", key: "gateText", style: "p", ...twin("gateText", "text", { name }) },
      { type: "ElevatedButton", key: "installResolver", ...twin("gateInstall", "labelText"), onPressed: { go: { installPlugin: { repo: RESOLVER_REPO } } } },
      supportNode(device)
    ] }
  };
}

// src/std/metaCache.js
var KEY = "meta3";
var MAX = 160;
var CONCURRENCY = 3;
var OVERVIEW_MAX = 160;
var HTTPS2 = /^https:\/\//;
function makeMetaCache({ kino: kino2, titleOf: titleOf2 = (c) => c.title, typeOf = (c) => c.kind === "series" ? "series" : "movie", tmdbPictures = false, clock = { now: () => Date.now() } }) {
  const usable = () => {
    try {
      return typeof kino2.meta === "function" && kino2.meta.byTitle === true;
    } catch (_) {
      return false;
    }
  };
  let book = null;
  function read() {
    if (book) return book;
    try {
      const o = JSON.parse(kino2.storage.get(KEY) || "null");
      book = o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (_) {
      book = {};
    }
    return book;
  }
  function write() {
    try {
      const ids = Object.keys(book);
      if (ids.length > MAX) for (const id of ids.slice(0, ids.length - MAX)) delete book[id];
      kino2.storage.set(KEY, JSON.stringify(book));
    } catch (_) {
    }
  }
  function known(id) {
    const e = read()[id];
    if (!e) return {};
    return {
      ...e.t > 0 ? { tmdb: e.t } : {},
      ...e.l && HTTPS2.test(e.l) ? { logo: e.l } : {},
      ...e.p && HTTPS2.test(e.p) ? { poster: e.p } : {},
      ...e.b && HTTPS2.test(e.b) ? { backdrop: e.b } : {},
      ...typeof e.o === "string" && e.o ? { overview: e.o } : {}
    };
  }
  const asked = (id) => Object.hasOwn(read(), id);
  function dress(cards) {
    return cards.map((c) => {
      const k = known(c.id);
      const poster = tmdbPictures && k.poster ? k.poster : null;
      if (!k.tmdb && !poster) return c;
      return { ...c, ...k.tmdb && !(c.ids && c.ids.tmdb) ? { ids: { ...c.ids || {}, tmdb: k.tmdb } } : {}, ...poster ? { poster } : {} };
    });
  }
  async function fill2(cards, budgetMs) {
    if (!usable()) return 0;
    const b = read();
    const end = clock.now() + budgetMs;
    let count = 0;
    let stop = false;
    const seen = /* @__PURE__ */ new Set();
    const todo = cards.filter((c) => {
      if (!c || typeof c.id !== "string" || seen.has(c.id) || Object.hasOwn(b, c.id) || c.ids && c.ids.tmdb && c.noLogo) return false;
      seen.add(c.id);
      return true;
    });
    let next = 0;
    const str = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
    const worker = async () => {
      while (!stop && next < todo.length && clock.now() < end) {
        const c = todo[next++];
        const year = c.year !== void 0 ? { year: c.year } : {};
        try {
          const a = await kino2.meta({ type: typeOf(c), title: titleOf2(c), ...year });
          b[c.id] = {
            t: a && a.ids && Number.isInteger(a.ids.tmdb) ? a.ids.tmdb : 0,
            l: str(a && a.logo, 2048),
            p: str(a && a.poster, 2048),
            b: str(a && a.backdrop, 2048),
            o: str(a && a.overview, OVERVIEW_MAX)
          };
          count++;
        } catch (e) {
          if (e && e.code === "rate_limited") stop = true;
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (count > 0) write();
    return count;
  }
  return { known, asked, dress, fill: fill2, usable, tmdbPictures };
}

// src/std/index.js
var TAB_KEY = "browseTab";
var SNAP_PREFIX = "browse1:";
var SNAP_TTL_MS = 7 * 24 * 3600 * 1e3;
var SNAP_MAX = 20 * 1024;
var SNAPS_TOTAL = 96 * 1024;
var RECENT_KEY = "recent1";
var RECENT_MAX = 12;
var Q_MAX = 200;
var META_TICK_MS = 3e3;
var META_TICK_CARDS = 24;
var INFLIGHT_KEY = "std:inflight";
var INFLIGHT_STALE_MS = 18e3;
var MAX_META_TICKS = 10;
var DEFAULT_TABS = [{ id: "inicio", label: "Inicio", labelEn: "Home" }];
var SNAPSHOT_VERSION = 1;
var SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1e3;
var SNAPSHOT_TIMEOUT_MS = 8e3;
var snapshotUrl = (repo, tab) => "https://raw.githubusercontent.com/" + repo + "/main/home/" + encodeURIComponent(tab) + ".json";
function snapshotRows(text2, tab, now = Date.now()) {
  let o;
  try {
    o = JSON.parse(String(text2));
  } catch (_) {
    return null;
  }
  if (!o || o.v !== SNAPSHOT_VERSION || o.tab !== tab || !Array.isArray(o.rows) || o.rows.length === 0) return null;
  const at = Number(o.at);
  if (!Number.isFinite(at) || now - at > SNAPSHOT_MAX_AGE_MS || at - now > 60 * 60 * 1e3) return null;
  return o.rows;
}
var lastSource = null;
function makeStandardScreen({ kino: kino2, name, nameEn, logo = null, logoAspect = "1:1", needsResolver, hasSettings, tabs, loadTab, homeKey = null, titleOf: titleOf2, typeOf, tmdbPictures = false, imageHeaders = null, searchHere = null, page = null, barSearch = true, backArrow = true, snapshot = null }) {
  const cfg = { name, nameEn, logo, logoAspect, imageHeaders, hasSettings: !!hasSettings, barSearch: barSearch !== false, backArrow: backArrow !== false, tabs: Array.isArray(tabs) && tabs.length > 0 ? tabs : DEFAULT_TABS };
  const TAB_IDS = cfg.tabs.map((t2) => t2.id);
  lastSource = { tabs: cfg.tabs, loadTab, titleOf: titleOf2, typeOf };
  async function fromSnapshot(tab) {
    if (typeof snapshot !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(snapshot)) return null;
    try {
      const r = await kino2.fetch(snapshotUrl(snapshot, tab), { timeoutMs: SNAPSHOT_TIMEOUT_MS });
      if (!r || !r.ok) return null;
      const rows = snapshotRows(await r.text(), tab);
      return rows ? { rows } : null;
    } catch (_) {
      return null;
    }
  }
  const meta = makeMetaCache({ kino: kino2, titleOf: titleOf2, typeOf, tmdbPictures });
  function slidesFromMeta(rails) {
    const out = [];
    for (const r of rails) {
      for (const c of r.items) {
        if (out.length >= MAX_SLIDES) return out;
        const k = meta.known(c.id);
        if (!k.backdrop || c.adult === true || out.some((x) => x.id === c.id)) continue;
        out.push({ id: c.id, ref: c.ref, kind: c.kind, title: c.title, image: k.backdrop, text: slideText(k.overview, c), ...k.logo ? { logo: k.logo } : {} });
      }
    }
    return out;
  }
  const enrich = (data) => {
    if (!data) return data;
    const own = data.slides.map((s) => {
      const k = meta.known(s.id);
      const image = tmdbPictures && k.backdrop ? k.backdrop : null;
      return k.logo || image ? { ...s, ...k.logo ? { logo: k.logo } : {}, ...image ? { image } : {} } : s;
    });
    const learned = own.length > 0 ? [] : slidesFromMeta(data.rails);
    return {
      // The site's own backdrops, else TMDB's, else the posters: every plugin has a hero.
      slides: own.length > 0 ? own : learned.length > 0 ? learned : data.posterSlides || [],
      rails: data.rails.map((r) => ({ ...r, items: meta.dress(r.items) }))
    };
  };
  const metaTicks = /* @__PURE__ */ new Map();
  const found = /* @__PURE__ */ new Map();
  const SOURCES_PER_TICK = 3;
  const asFound = (a, index) => ({
    ok: !!(a && a.ok),
    items: a && a.ok && Array.isArray(a.items) ? a.items.filter((x) => x && x.id && x.ref && x.title).slice(0, 40).map((x) => ({ ...x, id: ("p" + index + "~" + x.id).slice(0, 128), origin: a.repo })) : []
  });
  const memo = /* @__PURE__ */ new Map();
  const log = (...a) => {
    try {
      kino2.log("[std]", ...a);
    } catch (_) {
    }
  };
  const get = (k) => {
    try {
      return kino2.storage.get(k);
    } catch (_) {
      return null;
    }
  };
  const set = (k, v, opts) => {
    try {
      kino2.storage.set(k, v, opts);
    } catch (_) {
    }
  };
  function readSnap(tab) {
    try {
      const o = JSON.parse(get(SNAP_PREFIX + tab) || "null");
      return o && Date.now() - o.at < SNAP_TTL_MS && o.data && Array.isArray(o.data.rails) ? o.data : null;
    } catch (_) {
      return null;
    }
  }
  const snapMax = Math.min(SNAP_MAX, Math.floor(SNAPS_TOTAL / TAB_IDS.length));
  function writeSnap(tab, data) {
    for (let per = 10; per >= 3; per -= 2) {
      const slim = { slides: data.slides, posterSlides: data.posterSlides || [], rails: data.rails.map((r) => ({ ...r, items: r.items.slice(0, per) })) };
      const text2 = JSON.stringify({ at: Date.now(), data: slim });
      if (text2.length <= snapMax) {
        set(SNAP_PREFIX + tab, text2, { ttlMs: SNAP_TTL_MS });
        return;
      }
    }
  }
  function homeSeed(tab) {
    if (!homeKey || tab !== TAB_IDS[0]) return null;
    try {
      const o = JSON.parse(get(homeKey) || "null");
      return o && Array.isArray(o.rows) && o.rows.length ? tabOf({ rows: o.rows }) : null;
    } catch (_) {
      return null;
    }
  }
  const stored = () => {
    const t2 = get(TAB_KEY);
    return TAB_IDS.includes(t2) ? t2 : null;
  };
  function dataOf(tab) {
    if (memo.has(tab)) return memo.get(tab).data;
    const snap = readSnap(tab) || homeSeed(tab);
    if (snap) {
      memo.set(tab, { data: snap, whole: false });
      return snap;
    }
    return null;
  }
  const readKeys = () => {
    try {
      const a = JSON.parse(get(RECENT_KEY) || "[]");
      return Array.isArray(a) ? a.filter((k) => typeof k === "string") : [];
    } catch (_) {
      return [];
    }
  };
  function notePlayed(ref) {
    try {
      const key = playedKey(ref);
      if (key === "" || key.startsWith("x|")) return;
      const keys = readKeys();
      if (keys[0] === key) return;
      set(RECENT_KEY, JSON.stringify([key, ...keys.filter((k) => k !== key)].slice(0, RECENT_MAX)));
    } catch (_) {
    }
  }
  const tabFromArgs = (route) => {
    const a = route && route.args && typeof route.args === "object" ? route.args : {};
    return TAB_IDS.includes(a.tab) ? a.tab : null;
  };
  function needed(tab) {
    return memo.get(tab) && memo.get(tab).whole ? [] : [tab];
  }
  function screen2(ctx) {
    const c = ctx || {};
    const device = c.device || "phone";
    if (needsResolver && !(c.installed && c.installed[RESOLVER_REPO])) return gateView(cfg, device);
    if (c.route && c.route.name === "settings") return settingsView(cfg, device);
    if (searchHere && c.route && c.route.name === "results") {
      const st0 = c.state && typeof c.state === "object" ? c.state : {};
      return resultsView(cfg, {
        q: String(st0.rq || ""),
        order: Array.isArray(st0.rorder) ? st0.rorder : [],
        names: st0.rnames || {},
        pending: Array.isArray(st0.rpending) ? st0.rpending : [],
        found,
        device
      });
    }
    const st = c.state && typeof c.state === "object" ? c.state : {};
    const tab = TAB_IDS.includes(st.tab) ? st.tab : tabFromArgs(c.route) ?? stored() ?? TAB_IDS[0];
    const data = enrich(dataOf(tab));
    const loaded = TAB_IDS.map((t2) => memo.get(t2)).filter(Boolean).map((m) => m.data);
    const pending = Array.isArray(st.pending) && st.pending.length > 0;
    const searching = st.searching === true;
    if (page) {
      const tree = browseView(cfg, {
        tab: TAB_IDS[0],
        data: null,
        recent: [],
        pending: false,
        failed: false,
        searching,
        device,
        own: page.view({ ...c, state: st }) || [],
        ownActions: page.actions ? page.actions({ ...c, state: st }) || [] : []
      });
      const every = page.every ? page.every({ ...c, state: st }) : null;
      return every ? { ...tree, every } : tree;
    }
    return browseView(cfg, { tab, data, recent: meta.dress(recentOf(readKeys(), loaded)), pending, failed: !!(st.failed && st.failed[tab]), searching, device });
  }
  function cutShort() {
    try {
      const o = JSON.parse(get(INFLIGHT_KEY) || "null");
      if (!o || typeof o.tab !== "string") return null;
      if (Date.now() - Number(o.at) < INFLIGHT_STALE_MS) return null;
      kino2.storage.remove(INFLIGHT_KEY);
      return o.tab;
    } catch (_) {
      return null;
    }
  }
  async function load(tab) {
    set(INFLIGHT_KEY, JSON.stringify({ tab, at: Date.now() }));
    let page2;
    try {
      page2 = await fromSnapshot(tab) || await loadTab(tab);
    } finally {
      try {
        kino2.storage.remove(INFLIGHT_KEY);
      } catch (_) {
      }
    }
    const data = tabOf(page2);
    if (data) {
      memo.set(tab, { data, whole: true });
      writeSnap(tab, data);
    }
    return data !== null;
  }
  const events = {
    async open(ev) {
      if (page) {
        let patch = {};
        try {
          patch = (page.open ? await page.open(ev) : {}) || {};
        } catch (e) {
          log("page open", e && e.code || "error");
        }
        return { state: { ...patch, tab: TAB_IDS[0], pending: [], failed: null } };
      }
      return events.openTabs(ev);
    },
    openTabs({ route, state, device }) {
      const tab = tabFromArgs(route) ?? (TAB_IDS.includes(state.tab) ? state.tab : stored() ?? TAB_IDS[0]);
      for (const t2 of TAB_IDS) dataOf(t2);
      return { state: { tab, pending: needed(tab), failed: null } };
    },
    tab({ value, arg, state }) {
      const tab = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null;
      if (!tab) return null;
      set(TAB_KEY, tab);
      dataOf(tab);
      const failed = { ...state.failed || {} };
      delete failed[tab];
      const pending = [tab, ...Array.isArray(state.pending) ? state.pending.filter((t2) => t2 !== tab) : []];
      return { state: { tab, pending: memo.get(tab) && memo.get(tab).whole ? pending.slice(1) : pending, failed } };
    },
    retry({ state }) {
      const tab = TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0];
      const queued = Array.isArray(state.pending) ? state.pending.filter((t2) => t2 !== tab) : [];
      return { state: { failed: null, pending: [tab, ...queued] } };
    },
    async tick({ state, route }) {
      if (searchHere && route && route.name === "results") {
        const rp = Array.isArray(state.rpending) ? state.rpending : [];
        if (rp.length === 0) return null;
        const batch = rp.slice(0, SOURCES_PER_TICK);
        const order = Array.isArray(state.rorder) ? state.rorder : [];
        let answers = [];
        try {
          answers = await searchHere.searchIn(String(state.rq || ""), batch);
        } catch (e) {
          log("results", (e && e.code || "error") + " " + String(e && e.message || "").slice(0, 200));
        }
        for (const repo of batch) {
          const a = (Array.isArray(answers) ? answers : []).find((x) => x && x.repo === repo);
          found.set(repo, asFound(a, order.indexOf(repo)));
        }
        return { state: { rpending: rp.slice(SOURCES_PER_TICK) } };
      }
      const pending = Array.isArray(state.pending) ? state.pending : [];
      if (pending.length === 0) return null;
      const [next, ...rest] = pending;
      const failed = { ...state.failed || {} };
      if (next.startsWith("meta:")) {
        const tab = next.slice(5);
        const m = memo.get(tab);
        if (!m) return { state: { pending: rest } };
        const ask = (x) => ({ id: x.id, title: x.title, kind: x.kind, ...x.year !== void 0 ? { year: x.year } : {} });
        const noOwnSlides = m.data.slides.length === 0;
        const cards = [...m.data.slides.map(ask), ...m.data.rails.flatMap((r) => r.items.slice(0, noOwnSlides ? MAX_SLIDES * 3 : 6).map(ask))].filter((c) => !meta.asked(c.id)).slice(0, META_TICK_CARDS);
        const count = await meta.fill(cards, META_TICK_MS);
        const ticks = (metaTicks.get(tab) || 0) + 1;
        metaTicks.set(tab, ticks);
        const again = noOwnSlides && count > 0 && ticks < MAX_META_TICKS && slidesFromMeta(m.data.rails).length < MAX_SLIDES && cards.some((c) => !meta.asked(c.id));
        return { state: { pending: again ? [next, ...rest] : rest } };
      }
      if (cutShort() === next) {
        log("tab", next, "cut short by Kino last time");
        failed[next] = true;
        return { state: { pending: rest, failed } };
      }
      try {
        const ok = await load(next);
        if (!ok) failed[next] = true;
        else delete failed[next];
        if (ok && meta.usable()) rest.unshift("meta:" + next);
      } catch (e) {
        log("tab", e && e.code || "error");
        failed[next] = true;
      }
      return { state: { pending: rest, failed } };
    },
    // The words go to Kino's own search, with this plugin as the source; the bar is put back as it was, locally.
    // The search button's own event (after its local ops): while searching, the tree declares onBack, so Back closes the box.
    searchOpened() {
      return { state: { searching: true } };
    },
    // The box was closed (its arrow, or Back through onBack, already ran the local ops): the flag and the ops go, so the next
    // tree declares no onBack and draws the bar's defaults.
    searchClosed() {
      return { state: { searching: false, ui: null } };
    },
    async search({ value, state, device }) {
      const typed = value && typeof value === "object" ? value.q : value;
      const raw = typed != null && String(typed).trim() !== "" ? typed : state.inputs && state.inputs.q;
      const q = String(raw == null ? "" : raw).trim().slice(0, Q_MAX);
      if (!q) return null;
      const closed = searchClosedOps(device === "tv" && TAB_IDS.length > 1);
      if (searchHere) {
        let sources = [];
        try {
          sources = await searchHere.sources() || [];
        } catch (e) {
          log("sources", e && e.code || "error");
        }
        const order = sources.map((x) => x.repo).filter((r) => typeof r === "string");
        found.clear();
        return { route: { push: "results" }, ui: closed, state: {
          searching: false,
          ui: null,
          rq: q,
          rorder: order,
          rnames: Object.fromEntries(sources.map((x) => [x.repo, String(x.name || x.repo)])),
          rpending: order
        } };
      }
      return { go: { search: { q } }, ui: closed, state: { searching: false, ui: null } };
    },
    openSettings() {
      return { route: { push: "settings" }, state: { fromBrowse: true } };
    },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true }, state: { fromBrowse: false } };
    }
  };
  async function screenEvent2(ev) {
    const e = ev || {};
    const name2 = e.name != null ? e.name : e.event;
    const own = page && page.events && typeof name2 === "string" && Object.hasOwn(page.events, name2) && !Object.hasOwn(events, name2) ? page.events[name2] : null;
    if (own) return await own({ ...e, state: e.state || {} }) ?? null;
    const handler = typeof name2 === "string" && name2 !== "openTabs" && Object.hasOwn(events, name2) ? events[name2] : null;
    return handler ? await handler({ ...e, state: e.state || {} }) ?? null : null;
  }
  return { screen: screen2, screenEvent: screenEvent2, notePlayed };
}

// src/std/rank.js
async function scoresFromResolver(kino2, urls) {
  if (!Array.isArray(urls) || urls.length === 0) return null;
  try {
    const r = await kino2.plugins.call("resolver", "rank", { urls: urls.slice(0, 64).map(String) });
    const s = r && Array.isArray(r.scores) ? r.scores : null;
    return s && s.length === Math.min(urls.length, 64) ? s : null;
  } catch (_) {
    return null;
  }
}
async function rankServers(kino2, list, urlOf, groupOf = () => 0) {
  const scores = await scoresFromResolver(kino2, list.map(urlOf));
  return list.map((x, i) => ({ x, i, g: groupOf(x), s: scores && i < scores.length ? scores[i] : 0 })).sort((a, b) => a.g - b.g || b.s - a.s || a.i - b.i).map((o) => o.x);
}

// src/logo.js
var LOGO = "data:image/png;base64,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";
var LOGO_ASPECT = "1:1";

// src/resolve-door.js
var HLS_MIME = "application/vnd.apple.mpegurl";
var RESOLVER_ALIAS = "resolver";
var CAPTURE_MS = 2e4;
function headersOf(s) {
  const out = {};
  if (s.referer) out.Referer = s.referer;
  const h = s.headers;
  if (Array.isArray(h)) for (const x of h) {
    if (x && x.name) out[x.name] = String(x.value);
  }
  else if (h && typeof h === "object") for (const [k, v] of Object.entries(h)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}
function pickBest(streams) {
  return streams.find((s) => s && s.url && (s.kind === "hls" || /\.m3u8(\?|$)/i.test(s.url))) || streams.find((s) => s && s.url) || null;
}
async function captureStreams(kino2, embedUrl, referer) {
  const b = kino2 && kino2.browser;
  if (!b || typeof b.capture !== "function") return [];
  const opts = { timeoutMs: CAPTURE_MS, match: "\\.m3u8|\\.mp4" };
  if (referer) opts.headers = { Referer: referer };
  let cap;
  try {
    cap = await b.capture(embedUrl, opts);
  } catch (_) {
    return [];
  }
  const out = [];
  for (const m of cap && cap.media || []) {
    if (!m || !m.url) continue;
    out.push({ url: m.url, kind: /\.m3u8(\?|$)/i.test(m.url) ? "hls" : "mp4", server: "browser", headers: m.headers || {} });
  }
  return out;
}
async function resolveViaHelper(embedUrl, kino2, referer, allowCapture = true) {
  let res = null;
  try {
    res = await kino2.plugins.call(RESOLVER_ALIAS, "resolve", { url: embedUrl, referer });
  } catch (err) {
    try {
      kino2.log("[cuevanapro]", "resolver", err && err.code || "call_failed");
    } catch (_) {
    }
  }
  let streams = res && Array.isArray(res.streams) ? res.streams.slice() : [];
  const subtitles = res && Array.isArray(res.subtitles) ? res.subtitles.filter((x) => x && x.lang && x.url) : [];
  let captured = false;
  const dead = !streams.length && res && res.error === "dead";
  if (!streams.length && !dead && (typeof allowCapture === "function" ? allowCapture() : allowCapture)) {
    streams = await captureStreams(kino2, embedUrl, referer);
    captured = streams.length > 0;
  }
  const s = pickBest(streams);
  if (!s) return null;
  const headers = headersOf(s);
  const isHls = s.kind === "hls" || /\.m3u8(\?|$)/i.test(s.url);
  return {
    url: s.url,
    mime: isHls ? HLS_MIME : /\.mp4(\?|$)/i.test(s.url) ? "video/mp4" : void 0,
    ...Object.keys(headers).length ? { headers } : {},
    ...captured ? { captured: true } : {},
    ...subtitles.length ? { subtitles } : {}
  };
}
async function resolverInstalled(kino2) {
  try {
    await kino2.plugins.call(RESOLVER_ALIAS, "normalizeHost", { url: "https://probe.invalid/" });
    return true;
  } catch (err) {
    return (err && err.code) !== "provider_missing";
  }
}

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

// src/util/probe.js
var PEEK_BYTES = 2048;
async function peek(kino2, out, ms = 6e3) {
  try {
    const r = await kino2.fetch(out.url, { headers: { Range: `bytes=0-${PEEK_BYTES - 1}`, ...out.headers || {} }, timeoutMs: ms, maxBytes: PEEK_BYTES });
    return r.ok || r.status === 401 || r.status === 403 || r.status === 416 ? "ok" : "dead";
  } catch (e) {
    if (e && (e.code === "host_not_allowed" || e.code === "too_large")) return "ok";
    return e && e.code === "timeout" ? "slow" : "dead";
  }
}

// src/std/catalog.js
var CATALOG_MAX = 40;
var OVERVIEW_MAX2 = 300;
var HTTPS3 = /^https:\/\//;
function catalogItems(found) {
  const out = [];
  const list = Array.isArray(found) ? found : found && Array.isArray(found.items) ? found.items : [];
  for (const it of list) {
    if (out.length >= CATALOG_MAX) break;
    if (!it || typeof it.id !== "string" || !it.id || typeof it.ref !== "string" || !it.ref || typeof it.title !== "string" || !it.title) continue;
    const item = { id: it.id, ref: it.ref, title: it.title, kind: typeof it.kind === "string" && it.kind ? it.kind : "movie" };
    if (typeof it.poster === "string" && HTTPS3.test(it.poster)) item.poster = it.poster;
    if (typeof it.backdrop === "string" && HTTPS3.test(it.backdrop)) item.backdrop = it.backdrop;
    if (it.year !== void 0 && it.year !== null && String(it.year)) item.year = String(it.year);
    if (typeof it.overview === "string" && it.overview.trim()) item.overview = it.overview.trim().slice(0, OVERVIEW_MAX2);
    const tmdb = it.ids && Number.isInteger(it.ids.tmdb) ? it.ids.tmdb : Number.isInteger(it.tmdb) ? it.tmdb : 0;
    if (tmdb > 0) item.tmdb = tmdb;
    out.push(item);
  }
  return out;
}
function catalogQuery(arg) {
  const q = String(arg && arg.q || "").trim().slice(0, 200);
  const type = arg && (arg.type === "movie" || arg.type === "series") ? arg.type : "any";
  return { q, type, season: 0, episode: 0, tmdbId: 0, year: 0, originalTitle: "", altTitles: [], cursor: null };
}
function catalogDoor(search2) {
  return async (arg) => {
    const query = catalogQuery(arg);
    if (!query.q) return [];
    return catalogItems(await search2(query));
  };
}

// src/plugin.js
globalThis.__kinoDropPendingFetches = true;
var CACHE_MS = 10 * 60 * 1e3;
var RESOLVE_MS = 6e4;
var MAX_CAPTURES = 2;
var CAPTURE_PAGE_MS = 23e3;
function takeCapture(budget) {
  if (!budget || budget.captures <= 0 || budget.deadline - Date.now() < CAPTURE_PAGE_MS) return false;
  budget.captures -= 1;
  return true;
}
var MAX_COPIES = 10;
var PAGE = 24;
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
    cacheCleared: "Cach\xE9 vaciada.",
    needResolver: "Para reproducir, abre Cuevana Pro desde el men\xFA e instala el motor de reproducci\xF3n que te pedir\xE1."
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
    cacheCleared: "Cache cleared.",
    needResolver: "To play, open Cuevana Pro from the menu and install the playback engine it asks for."
  }
};
var t = (key) => {
  const lang = String(kino.lang || "").toLowerCase().startsWith("es") ? "es" : "en";
  return STRINGS[lang][key] || STRINGS.es[key] || key;
};
async function getPage(url, headers, ms) {
  const r = await kino.fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9", ...headers || {} }, timeoutMs: ms || 15e3 });
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
async function listPage(def, page, ms) {
  const url = SITE + def.path + (page > 1 ? "/page/" + page : "");
  const cards = await cached(`l:${def.path}:${page}`, async () => parseCards(await getPage(url, void 0, ms)));
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
async function rowOf(id, ref, genre, ms) {
  const def = refOf(ref);
  const { cards } = await listPage(def, 1, ms);
  const items = cards.slice(0, 20).map((c) => toItem(c, def.genreName));
  return items.length ? { id, title: def.title, items, ref, genre: genre || def.genre || "peliculas" } : null;
}
var HOME_ROWS = ["peliculas", "series", "estrenos", "sestrenos", "tendencias"];
var HOME_REQUEST_MS = 8e3;
var HOME_BUDGET_MS = 14e3;
var HOME_KEY = "home1";
var HOME_STALE_MS = 12 * 60 * 60 * 1e3;
var HOME_MAX_CHARS = 6e4;
async function settleWithin(tasks, budgetMs) {
  let done = false;
  const all = Promise.all(tasks).then(() => {
    done = true;
  });
  const end = Date.now() + budgetMs;
  const clock = (async () => {
    while (!done && Date.now() < end) await kino.sleep(Math.min(1e3, Math.max(1, end - Date.now())));
  })();
  await Promise.race([all, clock]);
}
function loadHome() {
  try {
    const store = JSON.parse(kino.storage.get(HOME_KEY) || "null");
    return store && store.rows && typeof store.rows === "object" ? store.rows : {};
  } catch (_) {
    return {};
  }
}
function saveHome(fresh) {
  const now = Date.now();
  const rows = {};
  const old = loadHome();
  for (const id of Object.keys(old)) if (old[id] && now - old[id].at < HOME_STALE_MS) rows[id] = old[id];
  for (const row of fresh) rows[row.id] = { at: now, row };
  try {
    let text2 = JSON.stringify({ rows });
    if (text2.length > HOME_MAX_CHARS) {
      for (const id of Object.keys(rows)) rows[id] = { at: rows[id].at, row: { ...rows[id].row, items: rows[id].row.items.slice(0, 10) } };
      text2 = JSON.stringify({ rows });
    }
    if (text2.length <= HOME_MAX_CHARS) kino.storage.set(HOME_KEY, text2, { ttlMs: HOME_STALE_MS });
  } catch (_) {
  }
}
async function home() {
  const got = new Array(HOME_ROWS.length).fill(null);
  await settleWithin(HOME_ROWS.map((id, i) => safeRow(id, () => rowOf(id, "list:" + id, void 0, HOME_REQUEST_MS)).then((row) => {
    got[i] = row;
  })), HOME_BUDGET_MS);
  const fresh = got.filter(Boolean);
  if (fresh.length) saveHome(fresh);
  const old = loadHome();
  const now = Date.now();
  const rows = [];
  HOME_ROWS.forEach((id, i) => {
    const kept = old[id];
    if (got[i]) rows.push(got[i]);
    else if (kept && kept.row && Array.isArray(kept.row.items) && now - kept.at < HOME_STALE_MS) rows.push(kept.row);
  });
  if (rows.length > fresh.length) kino.log("home: " + (rows.length - fresh.length) + " row(s) from the saved copy");
  return rows;
}
async function browse(ref, cursor) {
  const def = refOf(ref);
  if (!def) return { items: [] };
  const page = cursor ? Math.max(1, parseInt(cursor, 10) || 1) : 1;
  const { cards, more } = await listPage(def, page);
  return { items: cards.map((c) => toItem(c, def.genreName)), next: more ? String(page + 1) : void 0 };
}
async function searchOne(arg, ms) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const within = typeof arg === "object" && arg && arg.within ? refOf(arg.within) : null;
  if (q.length < 2) return [];
  const cards = await cached("s:" + q.toLowerCase(), async () => parseCards(await getPage(`${SITE}/search?q=${encodeURIComponent(q)}`, void 0, ms)));
  const only = within ? within.genre === "peliculas" ? "movie" : within.genre === "series" ? "series" : null : null;
  return cards.filter((c) => !only || c.kind === only).slice(0, 40).map((c) => toItem(c));
}
var SEARCH_REQUEST_MS = 6500;
var SEARCH_BUDGET_MS = 12500;
var SEARCH_MIN_LEFT_MS = 3e3;
async function search(arg) {
  const started = Date.now();
  return searchWithTerms(arg, (a) => {
    const left = SEARCH_BUDGET_MS - (Date.now() - started);
    return left < SEARCH_MIN_LEFT_MS ? [] : searchOne(a, Math.min(SEARCH_REQUEST_MS, left));
  });
}
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
async function plan(servers) {
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
  const ranked = await rankServers(kino, servers, (s) => s.host, lang);
  return ranked.map((s, i) => ({ ...s, i, _lt: lang(s) })).slice(0, MAX_COPIES);
}
var STATS_KEY = "srvStats";
var STATS_CAP = 24;
function readStats() {
  try {
    const o = JSON.parse(kino.storage.get(STATS_KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch (_) {
    return {};
  }
}
function scoreOf(id, stats) {
  const s = stats[id] || { ok: 0, fail: 0 };
  return (s.ok + 1) / (s.ok + s.fail + 2);
}
function noteServer(id, ok) {
  try {
    const stats = readStats();
    const s = stats[id] || { ok: 0, fail: 0 };
    s[ok ? "ok" : "fail"] += 1;
    if (s.ok + s.fail > STATS_CAP) {
      s.ok = Math.round(s.ok / 2);
      s.fail = Math.round(s.fail / 2);
    }
    stats[id] = s;
    kino.storage.set(STATS_KEY, JSON.stringify(stats));
  } catch (_) {
  }
}
async function open(server, req, budget) {
  const player = await req(server.url, { headers: { Referer: SITE + "/" } });
  if (!player.ok) return null;
  const embed = parsePlayer(await player.text());
  if (!embed) return null;
  const out = await resolveViaHelper(embed, kino, SITE + "/", () => takeCapture(budget));
  return out;
}
var labelOf = (s) => `${t(s.lang)} \xB7 ${SERVER_NAME[s.host.toLowerCase()] || s.host}`;
async function resolve(ref) {
  const m = /^c:(.+)@(\d+)$/.exec(String(ref || ""));
  const base = m ? m[1] : String(ref || "");
  const only = m ? Number(m[2]) : null;
  const pageUrl = pageOf(base);
  if (!pageUrl) throw kino.error("not_found", "unknown ref: " + ref);
  if (!await resolverInstalled(kino)) throw kino.error("unavailable", "resolver missing", { userMessage: t("needResolver") });
  const servers = await plan(parseServers(await getPage(pageUrl, { Referer: SITE + "/" })));
  if (!servers.length) throw kino.error("not_found", "no servers on " + pageUrl, { userMessage: t("noStreams") });
  const req = makeReq(kino, { deadline: Date.now() + RESOLVE_MS });
  const budget = { captures: MAX_CAPTURES, deadline: Date.now() + RESOLVE_MS };
  const stats = readStats();
  const order = only != null ? [only] : servers.map((_, k) => k).sort((a, b) => servers[a]._lt - servers[b]._lt || scoreOf(servers[b].host, stats) - scoreOf(servers[a].host, stats) || a - b);
  const deliver = (i, out) => {
    const s = servers[i];
    const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...out.headers || {} }, label: labelOf(s) };
    if (out.subtitles) stream.subtitles = out.subtitles;
    if (out.durationMs) stream.durationMs = out.durationMs;
    if (only == null) {
      const others = servers.map((_, j) => j).filter((j) => j !== i);
      if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(servers[j]) }));
      try {
        standard().notePlayed(base);
      } catch (_) {
      }
    }
    return stream;
  };
  let slow = null;
  const failures = [];
  for (const i of order) {
    const s = servers[i];
    if (!s) continue;
    try {
      const out = await open(s, req, budget);
      if (!out) {
        failures.push(`${s.host}: no stream`);
        noteServer(s.host, false);
        continue;
      }
      if (!out.captured) {
        const answer = await peek(kino, { url: out.url, headers: { "User-Agent": UA, ...out.headers || {} } });
        if (answer === "slow") {
          if (!slow) slow = { i, out };
          failures.push(`${s.host}: slow`);
          continue;
        }
        if (answer !== "ok") {
          failures.push(`${s.host}: address does not answer`);
          noteServer(s.host, false);
          continue;
        }
      }
      noteServer(s.host, true);
      return deliver(i, out);
    } catch (e) {
      failures.push(`${s.host}: ${e && e.code || ""} ${e && e.message || e}`.trim());
      noteServer(s.host, false);
    }
  }
  if (slow) {
    kino.log(`resolve ${base}: only a slow server answered (${failures.join("; ")})`);
    return deliver(slow.i, slow.out);
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
var std = null;
var standard = () => std ?? (std = makeStandardScreen({
  snapshot: "xuper-plugin/kino-plugin-cuevanapro",
  kino,
  name: "Cuevana Pro",
  logo: LOGO,
  logoAspect: LOGO_ASPECT,
  needsResolver: true,
  hasSettings: true,
  tabs: [
    { id: "novedades", label: "Novedades", labelEn: "What's new" },
    { id: "peliculas", label: "Pel\xEDculas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" },
    { id: "estrenos", label: "Estrenos", labelEn: "Premieres" },
    { id: "generos", label: "G\xE9neros", labelEn: "Genres" }
  ],
  loadTab: async (tabId) => ({ rows: (await section({ tab: tabId })).rows })
}));
async function screen(ctx) {
  await null;
  return standard().screen(ctx && typeof ctx === "object" ? ctx : {});
}
async function screenEvent(ev) {
  await null;
  return standard().screenEvent(ev && typeof ev === "object" ? ev : {});
}
var proto_catalog_search = catalogDoor(search);
export {
  action,
  browse,
  categories,
  details,
  episodes,
  home,
  proto_catalog_search,
  resolve,
  screen,
  screenEvent,
  search,
  section,
  settingsStatus
};

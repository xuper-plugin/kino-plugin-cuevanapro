// resolve(): every hoster goes to the shared kino-resolver door, and a host the door can't open inline falls back to
// Cuevana Pro's own WebView capture -- but a capture costs up to 20 s whether or not it finds the video, so the budget is
// spent on the ATTEMPT. Regression: a movie whose 4 servers all needed the browser chained 4 failed captures (~80 s),
// past Kino's 75 s resolve limit, and the person was left on an endless spinner.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

const SITE = "https://wv3.cuevana3.eu";
let pages = {};
let captures = [];
let captureImpl = () => ({ media: [] });
let door = () => ({ streams: [], error: "needs_browser" });
const store = new Map();
globalThis.kino = {
  lang: "es",
  config: { get: () => null },
  log: () => {},
  sleep: async () => {},
  error: (code, message, opts = {}) => Object.assign(new Error(message), { code, ...opts }),
  storage: { get: (k) => store.get(k) ?? null, set: (k, v) => store.set(k, String(v)), keys: () => [...store.keys()], remove: (k) => store.delete(k) },
  fetch: async (url) => {
    const body = pages[url];
    const status = body == null ? 404 : 200;
    return { ok: status === 200, status, url, headers: {}, text: () => body ?? "", json: () => JSON.parse(body ?? "{}") };
  },
  plugins: { call: async (alias, method, args) => {
    if (method === "normalizeHost") return { host: "x" };
    if (method === "resolve") return door(args.url);
    throw kino.error("not_declared", method);
  } },
  browser: { capture: async (url, opts) => { captures.push({ url, opts }); return captureImpl(url); } },
};
const plugin = await import("../plugin.js");

const next = (props) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: props } })}</script>`;
const PLAYER = (h) => `https://player.cuevana3.eu/player.php?h=${h}`;
// The real page of "Una Navidad para escribir y amar": four servers, all English.
const MOVIE = `${SITE}/ver-pelicula/una-navidad`;
function installMovie() {
  pages[MOVIE] = next({ thisMovie: { videos: { english: [
    { cyberlocker: "voesx", result: PLAYER("voe") },
    { cyberlocker: "doodstream", result: PLAYER("dood") },
    { cyberlocker: "streamwish", result: PLAYER("sw") },
    { cyberlocker: "vidhide", result: PLAYER("vh") },
  ] } } });
  pages[PLAYER("voe")] = "var url = 'https://voe.sx/e/aaa'";
  pages[PLAYER("dood")] = "var url = 'https://doodstream.com/e/bbb'";
  pages[PLAYER("sw")] = "var url = 'https://vibuxer.com/e/ccc'";
  pages[PLAYER("vh")] = "var url = 'https://vidhidepro.com/v/ddd'";
}

beforeEach(() => { pages = {}; captures = []; store.clear(); captureImpl = () => ({ media: [] }); door = () => ({ streams: [], error: "needs_browser" }); });

test("every server needs the browser and every capture fails: at most 2 capture attempts, then a readable error (no endless spinner)", async () => {
  installMovie();
  await assert.rejects(plugin.resolve("m:una-navidad"), (e) => e.code === "not_found" && typeof e.userMessage === "string" && e.userMessage.length > 0);
  assert.equal(captures.length, 2, "a failed capture spends the budget; the other servers don't open more 20 s pages");
});

test("a capture that finds the video plays it, after a failed one", async () => {
  installMovie();
  let n = 0;
  captureImpl = () => (++n === 2 ? { media: [{ url: "https://cdn.test/hls/master.m3u8", headers: { Referer: "https://voe.sx/" } }] } : { media: [] });
  const s = await plugin.resolve("m:una-navidad");
  assert.equal(s.url, "https://cdn.test/hls/master.m3u8");
  assert.equal(captures.length, 2);
  assert.ok(Array.isArray(s.alternatives) && s.alternatives.length === 3, "the other three servers stay as lazy copies");
});

test("a server the door opens inline plays without opening any hidden page", async () => {
  installMovie();
  door = (url) => (/vibuxer/.test(url) ? { streams: [{ url: "https://cdn.test/sw/master.m3u8", kind: "hls" }] } : { streams: [], error: "needs_browser" });
  pages["https://cdn.test/sw/master.m3u8"] = "#EXTM3U\n";
  const s = await plugin.resolve("m:una-navidad");
  assert.equal(s.url, "https://cdn.test/sw/master.m3u8");
  assert.equal(captures.length, 0);
});

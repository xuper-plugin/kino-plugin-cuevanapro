import test from "node:test";
import assert from "node:assert/strict";
import { decodeVoe, extract } from "../src/extractors/voe.js";

const rot13 = (s) => s.replace(/[a-z]/gi, (c) => { const b = c <= "Z" ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b); });
const encode = (obj) => {
  const b1 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const shifted = [...[...b1].reverse().join("")].map((c) => String.fromCharCode(c.charCodeAt(0) + 3)).join("");
  return rot13(btoa(shifted));
};
const page = (obj) => `<html><script type="application/json">["${encode(obj)}"]</script></html>`;
const reply = (body, ok = true) => ({ ok, status: ok ? 200 : 404, text: () => body });
const kino = { log() {} };

test("decodeVoe reads the page payload", () => {
  assert.deepEqual(decodeVoe(encode({ source: "https://c.test/a.m3u8", t: "ñ" })), { source: "https://c.test/a.m3u8", t: "ñ" });
});

test("extract follows the redirect and returns the stream", async () => {
  const pages = { "https://voe.sx/e/a": "<script>window.location.href = 'https://rot.test/e/a';</script>", "https://rot.test/e/a": page({ source: "https://c.test/x/master.m3u8" }) };
  const out = await extract("https://voe.sx/e/a", async (u) => reply(pages[u]), kino);
  assert.equal(out.url, "https://c.test/x/master.m3u8");
  assert.equal(out.mime, "application/vnd.apple.mpegurl");
  assert.equal(out.headers.Referer, "https://voe.sx/e/a");
});

test("a human check is not opened (null), and an unreachable host leaves the hidden browser a try (undefined)", async () => {
  const pages = { "https://voe.sx/e/b": "<script>window.location.href = 'https://rot.test/e/b';</script>", "https://rot.test/e/b": "<title>Confirm you&#039;re human to start the video.</title><altcha-widget>" };
  assert.equal(await extract("https://voe.sx/e/b", async (u) => reply(pages[u]), kino), null);
  const denied = async (u) => { if (u.startsWith("https://voe.sx")) return reply(pages[u]); throw Object.assign(new Error("no"), { code: "host_not_allowed" }); };
  assert.equal(await extract("https://voe.sx/e/b", denied, kino), undefined);
});

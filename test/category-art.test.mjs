// Every Categorías tile carries a picture (Kino draws a tile's image from `art`), static, so `categories()` asks the network for nothing.
import test from "node:test";
import assert from "node:assert/strict";

test("every Categorías tile has an https TMDB art URL, with its id, title and ref untouched", async () => {
  const plugin = await import("../src/plugin.js?art=" + Date.now());
  const cats = await plugin.categories();
  assert.ok(cats.length >= 12);
  for (const c of cats) {
    assert.match(c.art, /^https:\/\/image\.tmdb\.org\/t\/p\/w780\/[A-Za-z0-9]+\.jpg$/, c.id);
    assert.ok(c.id && c.title && c.ref, c.id);
  }
});

test("the built bundle answers the same tiles", async () => {
  const src = await (await import("../src/plugin.js?art2=" + Date.now())).categories();
  const bundle = await (await import("../plugin.js?art=" + Date.now())).categories();
  assert.deepEqual(bundle, src);
});

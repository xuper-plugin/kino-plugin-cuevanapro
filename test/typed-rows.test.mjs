// The Home's rows carry the type tag Kino shelves titles by (Películas, Series, Infantil), not only a generic one.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createKino } from "../sdk/kino-shim.mjs";

test("the Home rows are tagged peliculas, series and infantil", async () => {
  const manifest = JSON.parse(readFileSync(new URL("../kino-plugin.json", import.meta.url), "utf8"));
  globalThis.kino = createKino(manifest, { lang: "es-CO", device: "phone" }).kino;
  const plugin = await import("../src/plugin.js?typed=" + Date.now());
  const tags = plugin.homeRowTags();
  assert.equal(tags.peliculas, "peliculas");
  assert.equal(tags.series, "series");
  assert.equal(tags.infantil, "infantil");
  assert.deepEqual(Object.keys(tags), plugin.HOME_ROWS);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { peek, playable } from "../src/util/probe.js";

const kinoWith = (fetch) => ({ fetch });
const fail = (code) => async () => { throw Object.assign(new Error(code), { code }); };

test("peek: an answer is ok, an error status is dead, a timeout is only slow (kept as the last resort)", async () => {
  assert.equal(await peek(kinoWith(async () => ({ ok: true, status: 206 })), { url: "https://cdn/a.m3u8" }), "ok");
  assert.equal(await peek(kinoWith(async () => ({ ok: false, status: 403 })), { url: "https://cdn/a.m3u8" }), "ok", "a token-bound refusal is trusted");
  assert.equal(await peek(kinoWith(async () => ({ ok: false, status: 404 })), { url: "https://cdn/a.m3u8" }), "dead");
  assert.equal(await peek(kinoWith(fail("timeout")), { url: "https://cdn/a.m3u8" }), "slow");
  assert.equal(await peek(kinoWith(fail("network")), { url: "https://cdn/a.m3u8" }), "dead");
  assert.equal(await peek(kinoWith(fail("host_not_allowed")), { url: "https://cdn/a.m3u8" }), "ok");
  assert.equal(await playable(kinoWith(fail("timeout")), { url: "https://cdn/a.m3u8" }), false, "playable() alone still says no to a slow one");
});

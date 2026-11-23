/**
 * Whether a stream's address answers: a playlist on a host that is down (a CDN node that times out) would reach the player as "could not connect"
 * and stop there, so `resolve` asks first and moves on to the next server. Only a dead host or a 404/5xx says no; a refusal (401/403: a token tied to
 * the player) and a host this plugin may not reach (`host_not_allowed`) are trusted.
 *
 * It only PEEKS (the first 2 KB, `maxBytes` + a Range): a whole-file host (StreamTape, MixDrop, Mp4Upload...) answers with the movie itself, and
 * reading it whole ran into the timeout or Kino's body cap, so a server that plays was thrown away after 6 s of waiting.
 */
const PEEK_BYTES = 2048;
/**
 * What a peek says about a stream: "ok" (it answers, or refuses with a token-bound 401/403), "dead" (an error status, a broken
 * host) or "slow" (no answer within [ms]). A slow CDN is not a dead one (a Redmi took 4.3 s for one TLS handshake, then played),
 * so resolve() keeps a slow stream as the last resort instead of throwing it away.
 */
export async function peek(kino, out, ms = 6000) {
  try {
    const r = await kino.fetch(out.url, { headers: { Range: `bytes=0-${PEEK_BYTES - 1}`, ...(out.headers || {}) }, timeoutMs: ms, maxBytes: PEEK_BYTES });
    return r.ok || r.status === 401 || r.status === 403 || r.status === 416 ? "ok" : "dead";
  } catch (e) {
    if (e && (e.code === "host_not_allowed" || e.code === "too_large")) return "ok";
    return e && e.code === "timeout" ? "slow" : "dead";
  }
}

export async function playable(kino, out, ms = 6000) {
  return (await peek(kino, out, ms)) === "ok";
}

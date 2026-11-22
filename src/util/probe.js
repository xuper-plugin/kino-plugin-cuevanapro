/**
 * Whether a stream's address answers: a playlist on a host that is down (a CDN node that times out) would reach the player as "could not connect"
 * and stop there, so `resolve` asks first and moves on to the next server. Only a dead host or a 404/5xx says no; a refusal (401/403: a token tied to
 * the player) and a host this plugin may not reach (`host_not_allowed`) are trusted.
 *
 * It only PEEKS (the first 2 KB, `maxBytes` + a Range): a whole-file host (StreamTape, MixDrop, Mp4Upload...) answers with the movie itself, and
 * reading it whole ran into the timeout or Kino's body cap, so a server that plays was thrown away after 6 s of waiting.
 */
const PEEK_BYTES = 2048;
export async function playable(kino, out, ms = 6000) {
  try {
    const r = await kino.fetch(out.url, { headers: { Range: `bytes=0-${PEEK_BYTES - 1}`, ...(out.headers || {}) }, timeoutMs: ms, maxBytes: PEEK_BYTES });
    return r.ok || r.status === 401 || r.status === 403 || r.status === 416;
  } catch (e) {
    return !!(e && (e.code === "host_not_allowed" || e.code === "too_large"));
  }
}

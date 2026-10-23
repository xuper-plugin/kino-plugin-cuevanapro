/**
 * Whether a stream's address answers: a playlist on a host that is down (a CDN node that times out) would reach the player as "could not connect"
 * and stop there, so `resolve` asks first and moves on to the next server. Only a dead host or a 404/5xx says no; a refusal (401/403: a token tied to
 * the player) and a host this plugin may not reach (`host_not_allowed`) are trusted.
 */
export async function playable(kino, out, ms = 6000) {
  try {
    const r = await kino.fetch(out.url, { headers: { ...(out.headers || {}) }, timeoutMs: ms });
    return r.ok || r.status === 401 || r.status === 403;
  } catch (e) {
    return !!(e && e.code === "host_not_allowed");
  }
}

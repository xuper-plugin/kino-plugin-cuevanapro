import { HLS_MIME } from "./shared.js";

export const HOSTS = ["voe.sx"];

const JUNK = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
const rot13 = (s) => s.replace(/[a-z]/gi, (c) => { const b = c <= "Z" ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b); });

/** The player page's payload: ROT13, junk tokens out, base64, shift -3, reverse, base64, JSON (the way the CloudStream and ResolveURL extractors read it). */
export function decodeVoe(enc) {
  let s = rot13(enc);
  for (const j of JUNK) s = s.split(j).join("");
  s = atob(s);
  s = [...s].map((c) => String.fromCharCode(c.charCodeAt(0) - 3)).join("");
  s = [...s].reverse().join("");
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}

const redirectOf = (html) => (/window\.location\.href\s*=\s*'([^']+)'/.exec(html) || [])[1] || null;
/** The page that asks the person to prove they are human before the video: nothing here opens it (Kino never solves such a check). */
const humanCheck = (html) => /altcha|Confirm you(?:'|&#0?39;|’)re human/i.test(html);

/**
 * VOE with plain requests, like the CloudStream extractor: `voe.sx/e/<id>` redirects to a rotating domain whose page carries the video in a JSON
 * script. Answers a stream; `null` when the page asks for a human check or holds no video (a hidden page would meet the same wall);
 * `undefined` when the redirect's host cannot be reached from here (no approved `fetchHosts`), so the caller may try the hidden browser.
 */
export async function extract(embedUrl, req, kino) {
  const log = (...a) => { if (kino) kino.log("[voe]", ...a); };
  const first = await req(embedUrl, { headers: { Referer: embedUrl } });
  if (!first.ok) { log("embed", first.status); return null; }
  let html = first.text();
  const next = redirectOf(html);
  if (next) {
    try {
      const r = await req(next, { headers: { Referer: embedUrl } });
      if (!r.ok) { log("player", r.status); return null; }
      html = r.text();
    } catch (e) {
      if (e && e.code === "host_not_allowed") { log("rotating host not reachable here"); return undefined; }
      throw e;
    }
  }
  if (humanCheck(html)) { log("human check"); return null; }
  const j = /<script type="application\/json">\s*\["([^"]+)"\]/.exec(html);
  if (j) {
    try {
      const d = decodeVoe(j[1]);
      const url = d.source || d.direct_access_url;
      if (url) return { url, mime: /\.mp4(?:[?#]|$)/.test(url) ? "video/mp4" : HLS_MIME, headers: { Referer: embedUrl } };
    } catch (_) { /* the plain markers below */ }
  }
  const h = /'hls'\s*:\s*'([^']+)'/.exec(html) || /(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/.exec(html);
  if (!h) { log("no stream in page"); return null; }
  return { url: h[1], mime: /\.mp4(?:[?#]|$)/.test(h[1]) ? "video/mp4" : HLS_MIME, headers: { Referer: embedUrl } };
}

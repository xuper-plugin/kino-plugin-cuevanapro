import test from "node:test";
import assert from "node:assert/strict";
import { parseCards, parseTitle, parseServers, parsePlayer, posterOf, fixHost, sized } from "../src/cuevana.js";

const CARD = (kind, slug, title, year) => `<li class="TPostMv"><div class="TPost C hentry"><a href="/ver-${kind}/${slug}"><div class="Image"><span class="Year">${year}</span><img alt="x" src="/_next/image?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Foriginal%2Fa.jpg&amp;w=384&amp;q=75" width="178"/></div><span class="Title block">${title}</span></a><div class="TPMvCn"><p class="Info"><span class="Vote AAIco-star">6.49</span></p></div></div></li>`;

const next = (props) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: props } })}</script>`;

test("parseCards reads kind, slug, year, rating and the real, smaller TMDB picture", () => {
  const c = parseCards(CARD("pelicula", "bad-apples", "La manzana &amp; co", 2026) + CARD("serie", "x", "X", 2020) + CARD("pelicula", "bad-apples", "dup", 2026));
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { slug: "bad-apples", kind: "movie", title: "La manzana & co", year: 2026, poster: "https://image.tmdb.org/t/p/w500/a.jpg", rating: 6.49 });
  assert.equal(c[1].kind, "series");
});

test("posterOf unwraps the image proxy and sized picks a TMDB width", () => {
  assert.equal(posterOf("/_next/image?url=https%3A%2F%2Fx.test%2Fa.jpg&amp;w=1"), "https://x.test/a.jpg");
  assert.equal(sized("https://image.tmdb.org/t/p/original/z.jpg", "w1280"), "https://image.tmdb.org/t/p/w1280/z.jpg");
});

test("parseTitle reads a movie and a series from __NEXT_DATA__", () => {
  const movie = parseTitle(next({ thisMovie: { titles: { name: "Manzana", original: { name: "Apples" } }, slug: { name: "bad-apples" }, overview: " Sinopsis ", runtime: 100, genres: [{ name: "Comedia" }], rate: { average: 6.5 }, releaseDate: "2026-09-10T00:00:00.000Z", images: { poster: "https://image.tmdb.org/t/p/original/p.jpg", backdrop: "https://image.tmdb.org/t/p/original/b.jpg" } } }));
  assert.equal(movie.kind, "movie");
  assert.equal(movie.title, "Manzana");
  assert.equal(movie.overview, "Sinopsis");
  assert.equal(movie.year, 2026);
  assert.equal(movie.runtimeMinutes, 100);
  assert.equal(movie.backdrop, "https://image.tmdb.org/t/p/w1280/b.jpg");
  const serie = parseTitle(next({ thisSerie: { titles: { name: "S" }, slug: { name: "s" }, seasons: [{ number: 1, episodes: [{ number: 1, title: "t", image: "https://image.tmdb.org/t/p/original/e.jpg", releaseDate: "2022-04-14T00:00:00.000Z" }] }, { number: 2, episodes: [] }] } }));
  assert.equal(serie.kind, "series");
  assert.deepEqual(serie.seasons.map((s) => [s.season, s.episodes.length]), [[1, 1]]);
  assert.equal(serie.seasons[0].episodes[0].date, "2022-04-14");
  assert.equal(parseTitle("<html></html>"), null);
});

test("parseServers lists each language's servers for a movie and for an episode", () => {
  const v = { latino: [{ cyberlocker: "streamwish", result: "https://player.cuevana3.eu/player.php?h=a" }], spanish: [], english: [{ cyberlocker: "voesx", result: "https://player.cuevana3.eu/player.php?h=b" }] };
  assert.deepEqual(parseServers(next({ thisMovie: { videos: v } })), [{ lang: "latino", host: "streamwish", url: "https://player.cuevana3.eu/player.php?h=a" }, { lang: "english", host: "voesx", url: "https://player.cuevana3.eu/player.php?h=b" }]);
  assert.equal(parseServers(next({ episode: { videos: v } })).length, 2);
  assert.deepEqual(parseServers("<html></html>"), []);
});

test("parsePlayer reads the video address and maps a mirror", () => {
  assert.equal(parsePlayer("<script>var url = 'https://voe.sx/e/abc';</script>"), "https://voe.sx/e/abc");
  assert.equal(parsePlayer("var url = 'https://streamwish.to/e/abc'"), "https://vibuxer.com/e/abc");
  assert.equal(fixHost("https://hglink.to/e/q"), "https://vibuxer.com/e/q");
  assert.equal(parsePlayer("nothing"), null);
});

// Test différentiel : mêmes entrées dans le module Shopify d'origine (dossier SHOP, récupéré à part) et dans notre réécriture ; compare les sorties.
// Usage : node --experimental-default-type=module tools/shopify/difftest.mjs /tmp/shop
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const SHOP = process.argv[2] || '/tmp/shop', ROOT = new URL('../../refonte/shop/', import.meta.url).pathname;
const ORIG = { easing: 'easing-BhDfN7yX', random: 'random-CYrl7Amx', frame: 'frame-uyhWmNSJ', pack: 'pack-D8z7b37W', style: 'style-i6E2ipwK', highlight: 'highlight-BjwrNyM6', colorPalette: 'colorPalette-VQpnhwit', clamp: 'clamp-co6UzHBn', wire: 'wire-BRlyKbjJ' };
const load = async (n) => [await import(pathToFileURL(path.join(SHOP, ORIG[n] + '.js')).href), await import(pathToFileURL(path.join(ROOT, n + '.js')).href)];
let fails = 0, checks = 0;
const same = (a, b) => JSON.stringify(a, (k, v) => (v instanceof Float32Array || v instanceof Float64Array || v instanceof Int32Array ? [...v] : v instanceof Map ? [...v] : v instanceof Set ? [...v] : typeof v === 'number' && !isFinite(v) ? String(v) : v)) === JSON.stringify(b, (k, v) => (v instanceof Float32Array || v instanceof Float64Array || v instanceof Int32Array ? [...v] : v instanceof Map ? [...v] : v instanceof Set ? [...v] : typeof v === 'number' && !isFinite(v) ? String(v) : v));
const check = (label, a, b) => { checks++; if (!same(a, b)) { fails++; console.log('ÉCART', label, JSON.stringify(a)?.slice(0, 120), '|', JSON.stringify(b)?.slice(0, 120)); } };
const vals = [-5, -1, -.3, 0, .1, .25, .5, .75, .999, 1, 1.5, 3, 100, NaN];
{ const [o, m] = await load('easing'); for (const k of ['a', 'c', 's']) for (const v of vals) check('easing.' + k + '(' + v + ')', o[k](v), m[k](v)); for (const v of vals) for (const w of [0, 1, 7]) { check('easing.l', o.l(v, w, .3), m.l(v, w, .3)); check('easing.r', o.r(v, w, w + 3), m.r(v, w, w + 3)); } }
{ const [o, m] = await load('clamp'); for (const v of vals) check('clamp', o.c(v, 0, 1), m.c(v, 0, 1)); check('clamp inv', o.c(.5, 1, 0), m.c(.5, 1, 0)); }
{ const [o, m] = await load('random'); for (const seed of [0, 1, 15, 12345, -7, 2 ** 31 + 5, 99999999]) { const a = o.s(seed), b = m.s(seed); for (let i = 0; i < 500; i++) check('random ' + seed + ':' + i, a(), b()); } }
{ const [o, m] = await load('frame'); for (const k of ['E', 'N', 'b', 'c', 'd', 'e', 'f', 'g']) check('frame.' + k, o[k], m[k]); check('frame.a', o.a, m.a);
  for (const st of [{}, { fade: .5 }, { fade: .5, markFade: .8 }, { fade: .5, markFade: .2 }, { fade: 1, markFade: .3 }, { fade: 0, markFade: 1 }, { markFade: 2 }]) check('frame.m ' + JSON.stringify(st), o.m(st), m.m(st));
  const mk = () => ({ nodeCount: 4, nodes: Float32Array.from({ length: 64 }, (_, i) => (i % 16 === 3 ? i % 4 : i * .37)) }); const A = mk(), B = mk(); o.h(A, 5); m.h(B, 5); check('frame.h', A.nodes, B.nodes); }
{ const [o, m] = await load('wire'); check('wire', o.W, m.W); const [o2, m2] = await load('colorPalette'); check('palette', o2.c, m2.c); check('palette D/S/T', [o2.D, o2.S, o2.T], [m2.D, m2.S, m2.T]); }
{ const [o, m] = await load('pack'); check('pack.M', o.M, m.M); check('pack.F', o.F, m.F); check('pack P/V/a', [o.P, o.V, o.a], [m.P, m.V, m.a]);
  for (const t of ['', 'a', 'section:1:dot:0', 'update:98000000000:dot:1', 'é']) check('pack.b ' + t, o.b(t), m.b(t));
  for (const seed of [1, 255, 99999, 4294967295, 77]) for (const t of [0, .3, 7.25, 123.4]) for (const sp of [1, 1.5]) check('pack.f', o.f(seed, t, sp), m.f(seed, t, sp));
  for (const arr of [[3, 1, 2], [5, 2, 9, 1, 7, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], [4, 4, 1]]) check('pack.r ' + arr, o.r(arr), m.r(arr));
  const names = ['a', 'b', 'c', 'd', 'e'], fa = new o.H(names), fb = new m.H(names); for (const t of [0, .5, 3.3, 9, 20.1]) check('flow ' + t, fa.step(t), fb.step(t));
  const graph = { nodes: [{ id: 's1', role: 'section' }, { id: 's2', role: 'section' }, { id: 'u1', role: 'update', primarySectionId: 's1', shape: 'image' }, { id: 'u2', role: 'update', primarySectionId: 's2', prominence: 'featured' }, { id: 'u3', role: 'update', primarySectionId: 's1', shape: 'circle' }, { id: 'ring', role: 'x', shape: 'ring' }], edges: [], hubIds: ['ring'] };
  const ia = o.p(graph, o.M), ib = m.p(graph, m.M); check('pack.p', { ...ia }, { ...ib }); }
{ const [o, m] = await load('style'); check('style.S', o.S, m.S); check('style.G', o.G, m.G); check('style.a', o.a, m.a); check('style.D', String(o.D), String(m.D));
  for (const c of ['color(display-p3 0.1 0.2 0.3)', 'color(display-p3 1 1 1 / 0.4)']) check('style.p ' + c, o.p(c), m.p(c));
  for (const v of [0, .02, .04, .5, 1]) { check('style.t', o.t(v), m.t(v)); check('style.s', o.s(v, 1 - v, .3), m.s(v, 1 - v, .3)); }
  check('style.c', o.c(o.S), m.c(m.S)); }
{ const [o, m] = await load('highlight'); for (const k of ['H', 'R', 'S']) check('highlight.' + k, o[k], m[k]);
  const mk = () => Float32Array.from({ length: 64 }, (_, i) => i * .13 + 1); for (const kind of [0, 1, 2, 3]) { const A = mk(), B = mk(); A[3] = B[3] = kind; o.r(A, 0, .5); m.r(B, 0, .5); check('highlight.r kind' + kind, A, B); check('highlight.a ' + kind, o.a(kind), m.a(kind));
    const C = mk(), D = mk(); C[19] = D[19] = kind; o.h(C, 16, .4, [1, .5, .2], 7); m.h(D, 16, .4, [1, .5, .2], 7); check('highlight.h kind' + kind, C, D); const E = mk(), F = mk(); o.b(E, 32, [.1, .2, .3], .6); m.b(F, 32, [.1, .2, .3], .6); check('highlight.b', E, F); } }
console.log(`${checks} comparaisons, ${fails} écart(s)`); process.exit(fails ? 1 : 0);

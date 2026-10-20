/* ============================================================================
   MachineLetters — letters built out of machines, pen-and-wash, in the manner of
   David Macaulay's "The Way Things Work" cover.

   One global:  MachineLetters
     .mount(el, {text, ...})      interactive page (hover / click letters to set them working)
     .render(text, opts)          -> { svg, letters }  static SVG string (no UI)
     .define(ch, w, pal, draw)    add or replace a glyph (see SKILL.md)
     .parts                       the part library (gear, pipe, girder, conveyor, chain, ...)
     .MATS / .INK                 palette
   Glyph space: x 0..w, y 0..150, baseline y = 140, cap line y = 12.  y points DOWN.
   ========================================================================== */
(function (root) {
'use strict';

/* ---------------------------------------------------------------- palette */
const INK = '#2b2117';
const MATS = {                      // light / mid / dark : the three washes of one pigment
  yellow: { l: '#f7de5c', m: '#e2b533', d: '#8c6b1e' },
  ochre:  { l: '#e6bd6a', m: '#c58e34', d: '#6f4a1b' },
  green:  { l: '#86c064', m: '#559649', d: '#2c5a34' },
  lime:   { l: '#c9e26c', m: '#92b53a', d: '#47601d' },
  olive:  { l: '#bcc062', m: '#8d9344', d: '#4f5427' },
  teal:   { l: '#82d3c6', m: '#3f9f98', d: '#1d5459' },
  orange: { l: '#f2ae48', m: '#d4832b', d: '#7b461a' },
  rust:   { l: '#d6744e', m: '#ac4d33', d: '#5a281c' },
  red:    { l: '#e86650', m: '#bf4032', d: '#68201a' },
  pink:   { l: '#f3a5bb', m: '#d46a8e', d: '#6c2745' },
  purple: { l: '#b78fd3', m: '#865ca9', d: '#412a5d' },
  blue:   { l: '#8abbdc', m: '#5489bb', d: '#264873' },
  navy:   { l: '#7089c6', m: '#3e5698', d: '#1b2851' },
  steel:  { l: '#e1e6ea', m: '#a1afba', d: '#53687b' },
  chrome: { l: '#f6f9fb', m: '#bac8d3', d: '#5c7288' },
  brass:  { l: '#f3d67e', m: '#c99c3d', d: '#6d4e1b' },
  copper: { l: '#eaa27b', m: '#c06c46', d: '#67321f' },
  brown:  { l: '#c09665', m: '#946e41', d: '#4f371f' },
  wood:   { l: '#dcab6f', m: '#b27c43', d: '#5c3b1e', tex: 'wood' },
  brick:  { l: '#dc8663', m: '#b6573b', d: '#5d291b', tex: 'brick' },
  tan:    { l: '#ece0bd', m: '#cfbc8d', d: '#7b6a44' },
  cream:  { l: '#f9f1d9', m: '#e5d9b5', d: '#a4966d' },
  dark:   { l: '#70695f', m: '#4a443e', d: '#2a2622' },
};
const M = n => Object.assign({ name: n }, MATS[n] || MATS.steel);
const PAPERS = { cream: '#f4ecd7', white: '#fbf8ef', kraft: '#e6d5b0', blue: '#dfe8ea', grey: '#e7e4dc' };
const PALETTES = {
  cover: null,
  warm:  ['yellow', 'orange', 'rust', 'red', 'ochre'],
  cool:  ['blue', 'teal', 'navy', 'green', 'steel'],
  earth: ['brown', 'olive', 'ochre', 'rust', 'wood'],
  candy: ['pink', 'teal', 'yellow', 'purple', 'lime'],
};

/* -------------------------------------------------------------- 2D maths */
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = a => Math.hypot(a[0], a[1]);
const unit = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const perp = a => [-a[1], a[0]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rad = d => d * Math.PI / 180;
const f = n => +n.toFixed(1);
const LD = unit([-1, -1.1]);        // direction TOWARD the light (upper left)
const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; s += p[i][0] * q[1] - q[0] * p[i][1]; } return s / 2; };
const bbox = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; };
const shift = (pts, v) => pts.map(p => [p[0] + v[0], p[1] + v[1]]);

/* paths: seg / arc / cat build point lists; mkPath makes them measurable */
const seg = (a, b, n = 2) => { const o = []; for (let i = 0; i < n; i++) o.push(lerp(a, b, i / (n - 1))); return o; };
const arc = (cx, cy, rx, ry, a0, a1, n) => { n = n || Math.max(6, Math.ceil(Math.abs(a1 - a0) / 6)); const o = []; for (let i = 0; i <= n; i++) { const a = rad(a0 + (a1 - a0) * i / n); o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; };
const circ = (cx, cy, r, n = 28) => arc(cx, cy, r, r, 0, 360 - 360 / n, n - 1);
const cat = (...ps) => { const o = []; ps.forEach(p => p.forEach(q => { const l = o[o.length - 1]; if (l && Math.hypot(l[0] - q[0], l[1] - q[1]) < .01) return; o.push(q); })); return o; };
function mkPath(pts, closed) {
  const P = closed ? pts.concat([pts[0]]) : pts.slice(), cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[cum.length - 1];
  function at(s) {
    s = closed ? ((s % L) + L) % L : Math.max(0, Math.min(L, s));
    let lo = 0, hi = P.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const sl = cum[hi] - cum[lo] || 1, u = (s - cum[lo]) / sl;
    const t = unit([P[hi][0] - P[lo][0], P[hi][1] - P[lo][1]]);
    return { p: [P[lo][0] + (P[hi][0] - P[lo][0]) * u, P[lo][1] + (P[hi][1] - P[lo][1]) * u], t, n: perp(t), s };
  }
  const samples = step => { const k = Math.max(2, Math.round(L / step) + 1), o = []; for (let i = 0; i < k; i++) o.push(at(L * i / (k - 1))); return o; };
  const slice = (s0, s1, step = 3) => { const k = Math.max(2, Math.round(Math.abs(s1 - s0) / step) + 1), o = []; for (let i = 0; i < k; i++) o.push(at(s0 + (s1 - s0) * i / (k - 1)).p); return o; };
  return { L, at, samples, slice, pts: P };
}
const ribbon = (path, o1, o2, step = 3) => { const S = path.samples(step); return S.map(q => add(q.p, mul(q.n, o1))).concat(S.map(q => add(q.p, mul(q.n, o2))).reverse()); };

/* ---------------------------------------------------------- svg primitives */
const pd = (pts, close = true) => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + (close ? 'Z' : '');
const ink = (d, w = 1, extra = '') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const fillp = (d, c, extra = '') => `<path d="${d}" fill="${c}" ${extra}/>`;
const face = (d, c) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".7" stroke-linejoin="round"/>`;
const line2 = (p, q, w = 1) => ink(`M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`, w);
const tone = n => { const d = dot(n, LD); return d > .38 ? 'l' : d > -.38 ? 'm' : 'd'; };

/* ------------------------------------------------------------- solid body
   An extruded polygon: back outline, visible sides (shaded by the way they face the
   light, the dark ones hatched), creases, then the front face with one ink outline.
   o.holes = [poly...] cuts holes and shows the inner wall as a hatched crescent. */
function solid(c, poly, m, o = {}) {
  const D = mul(c.D, o.dk == null ? 1 : o.dk), n = poly.length, sg = area(poly) > 0 ? 1 : -1;
  const vis = [], nr = [];
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
    if (L < 1e-6) { vis.push(false); nr.push([0, 0]); continue; }
    const v = sg > 0 ? [dy / L, -dx / L] : [-dy / L, dx / L];
    nr.push(v); vis.push(dot(v, D) > 1e-3);
  }
  const W = o.w || 1.4;
  let s = '';
  if (len(D) > 0.01) {
    s += ink(pd(shift(poly, D)), W);
    for (let i = 0; i < n; i++) {
      if (!vis[i]) continue;
      const p = poly[i], q = poly[(i + 1) % n], t = tone(nr[i]);
      const quad = pd([p, q, add(q, D), add(p, D)]);
      s += face(quad, m[t]);
      if (t === 'd') s += fillp(quad, 'url(#hatch)') + fillp(quad, 'url(#hatchL)', 'opacity=".7"');
      else if (t === 'm') s += fillp(quad, 'url(#hatchL)', 'opacity=".55"');
    }
    for (let i = 0; i < n; i++) {
      const pr = (i - 1 + n) % n, a = vis[pr], b = vis[i], p = poly[i];
      if (a !== b) s += line2(p, add(p, D), 1.1);
      else if (a && b && Math.acos(Math.max(-1, Math.min(1, dot(nr[pr], nr[i])))) > .5) s += line2(p, add(p, D), .8);
    }
  }
  const holes = o.holes || [];
  const fd = pd(poly) + holes.map(h => pd(h)).join('');
  s += `<path d="${fd}" fill="${o.flat ? m.l : `url(#g-${m.name})`}" fill-rule="evenodd"/>`;
  const tx = o.tex || m.tex;
  if (tx && o.notex !== true) s += fillp(fd, 'url(#tex-' + tx + ')', 'fill-rule="evenodd" opacity=".75"');
  s += ink(pd(poly), W);
  const ar = Math.abs(area(poly));
  if (ar > 110 && o.rim !== false) {
    const k = Math.min(3.2, 1.2 + Math.sqrt(ar) * .045), pv = pd(poly), bb = bbox(poly), id = c.id(), id2 = c.id();
    const mk = (i, sh) => '<mask id="' + i + '" maskUnits="userSpaceOnUse" x="' + f(bb[0] - 4) + '" y="' + f(bb[1] - 4) + '" width="' + f(bb[2] - bb[0] + 8) + '" height="' + f(bb[3] - bb[1] + 8) + '"><path d="' + pv + '" fill="#fff"/><path d="' + pd(shift(poly, sh)) + '" fill="#000"/></mask>';
    s += mk(id, [-k, -k * .9]) + fillp(pv, m.d, 'opacity=".5" mask="url(#' + id + ')"') + fillp(pv, 'url(#hatch)', 'opacity=".85" mask="url(#' + id + ')"');
    s += mk(id2, [k * .8, k * .8]) + fillp(pv, '#fff', 'opacity=".42" mask="url(#' + id2 + ')"');
  }
  if (holes.length) {
    for (const h of holes) s += ink(pd(h), W * .75);
    if (len(D) > 0.01) {
      const hp = holes.map(h => pd(h)).join(''), hs = holes.map(h => pd(shift(h, D))).join('');
      const bb = bbox([].concat(...holes)), id = c.id();
      s += `<mask id="${id}" maskUnits="userSpaceOnUse" x="${f(bb[0] - 2)}" y="${f(bb[1] - 2 - Math.abs(D[1]))}" width="${f(bb[2] - bb[0] + 4 + Math.abs(D[0]))}" height="${f(bb[3] - bb[1] + 4 + Math.abs(D[1]) * 2)}">`
        + `<path d="${hp}" fill="#fff"/><path d="${hs}" fill="#000"/></mask>`
        + `<path d="${hp}" fill="${m.d}" mask="url(#${id})"/><path d="${hp}" fill="url(#hatch)" mask="url(#${id})"/>`;
    }
  }
  return s;
}

/* ------------------------------------------------------------------ parts */
const bar = (p, q, wd, col, hl) => {
  const d = `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`;
  return `<path d="${d}" stroke="${INK}" stroke-width="${f(wd + 1.5)}" stroke-linecap="round" fill="none"/>`
    + `<path d="${d}" stroke="${col}" stroke-width="${f(wd)}" stroke-linecap="round" fill="none"/>`
    + (hl ? `<path d="${d}" stroke="${hl}" stroke-width="${f(wd * .32)}" stroke-linecap="round" fill="none" transform="translate(${f(-wd * .18)} ${f(-wd * .18)})"/>` : '');
};

function beam(c, a, b, w, m, o = {}) {
  const d = unit(sub(b, a)), n = perp(d), h = w / 2;
  const poly = [add(a, mul(n, h)), add(b, mul(n, h)), sub(b, mul(n, h)), sub(a, mul(n, h))];
  let s = solid(c, poly, m, o);
  if (w >= 9 && o.rivets !== false) {
    const L = len(sub(b, a)), k = Math.max(1, Math.floor(L / 11));
    for (let i = 0; i <= k; i++) { const p = lerp(a, b, k ? (i + .5) / (k + 1) : .5); s += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(Math.min(1.5, w * .1))}" fill="${m.d}" stroke="${INK}" stroke-width=".6"/>`; }
  }
  return s;
}

function girder(c, a, b, w, m, o = {}) {
  const d = unit(sub(b, a)), n = perp(d), L = len(sub(b, a)), h = w / 2;
  const cells = Math.max(2, Math.round(L / (w * 1.05))), sl = L / cells, rail = o.rail || 2.8, web = o.web || 1.7;
  const node = (i, side) => add(add(a, mul(d, sl * i)), mul(n, side * h));
  const layer = (off, col, hl) => {
    let s = '';
    for (let i = 0; i < cells; i++) { const sd = i % 2 ? 1 : -1; s += bar(add(node(i, sd), off), add(node(i + 1, -sd), off), web, col, null); }
    for (let i = 1; i < cells; i++) s += bar(add(node(i, -1), off), add(node(i, 1), off), web * .8, col, null);
    s += bar(add(node(0, -1), off), add(node(cells, -1), off), rail, col, hl) + bar(add(node(0, 1), off), add(node(cells, 1), off), rail, col, hl);
    return s;
  };
  let s = layer(c.D, m.d, null);
  for (let i = 0; i <= cells; i += 1) for (const sd of [-1, 1]) { const p = node(i, sd); s += bar(p, add(p, c.D), 1.5, m.d, null); }
  s += layer([0, 0], m.m, m.l);
  if (o.plates !== false) for (const e of [0, 1]) {
    const p = e ? b : a, t = mul(d, e ? 1.6 : -1.6);
    s += solid(c, [add(sub(p, mul(n, h + 2.2)), t), add(add(p, mul(n, h + 2.2)), t), add(add(p, mul(n, h + 2.2)), mul(t, -1)), add(sub(p, mul(n, h + 2.2)), mul(t, -1))], m, { w: 1.1, dk: .7 });
  }
  return s;
}

function collar(c, p, t, r, m) {
  const n = perp(t), a = r + 2.4, b = mul(t, 2.1);
  return solid(c, [add(sub(p, mul(n, a)), b), add(add(p, mul(n, a)), b), sub(add(p, mul(n, a)), b), sub(sub(p, mul(n, a)), b)], m, { w: 1.1, dk: .55 });
}

/* a round pipe along a polyline: tone strokes shifted toward the light + hatch ticks on the shade side */
function pipe(c, pts, r, m, o = {}) {
  const d = pd(pts, false), path = mkPath(pts);
  let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(2 * r + 2.6)}" stroke-linejoin="round" stroke-linecap="${o.cap || 'butt'}"/>`;
  s += `<path d="${d}" fill="none" stroke="${m.d}" stroke-width="${f(2 * r)}" stroke-linejoin="round" stroke-linecap="${o.cap || 'butt'}"/>`;
  s += `<path d="${d}" fill="none" stroke="${m.m}" stroke-width="${f(r * 1.45)}" stroke-linejoin="round" transform="translate(${f(-r * .2)} ${f(-r * .2)})"/>`;
  s += `<path d="${d}" fill="none" stroke="${m.l}" stroke-width="${f(r * .55)}" stroke-linejoin="round" stroke-linecap="${o.cap === 'round' ? 'round' : 'butt'}" transform="translate(${f(-r * .42)} ${f(-r * .42)})"/>`;
  if (r >= 4.5 && o.ticks !== false) {
    let tk = '';
    for (const q of path.samples(3.4)) {
      const ns = dot(q.n, LD) < 0 ? q.n : mul(q.n, -1), e = add(q.p, mul(ns, r * .95));
      tk += 'M' + f(e[0]) + ' ' + f(e[1]) + 'L' + f(e[0] - ns[0] * r * .55 + q.t[0] * r * .4) + ' ' + f(e[1] - ns[1] * r * .55 + q.t[1] * r * .4);
    }
    s += ink(tk, .5, 'opacity=".75"');
  }
  const col = o.collars;
  if (col) for (const k of col) { const q = path.at(k <= 1 ? k * path.L : k); s += collar(c, q.p, q.t, r, o.collarMat || m); }
  return s;
}

/* gear: tooth polygon, optional spokes / hole, spins with c.t (speed inversely proportional to teeth, so meshing pairs agree) */
function gearPoly(cx, cy, R, teeth, rotDeg, depth) {
  const Ri = R * (1 - depth), da = 2 * Math.PI / teeth, a0 = rad(rotDeg), o = [];
  for (let i = 0; i < teeth; i++) {
    const a = a0 + i * da;
    for (const [k, r] of [[-.21, Ri], [-.12, R], [.12, R], [.21, Ri], [.5, Ri * .995]]) o.push([cx + r * Math.cos(a + k * da), cy + r * Math.sin(a + k * da)]);
  }
  return o;
}
const spin = (c, teeth, dir = 1, phase = 0) => dir * c.t * 520 / teeth + phase;
function boss(c, cx, cy, r, m, rotDeg = 0, slot = true) {
  let s = solid(c, circ(cx, cy, r, 22), m, { dk: .7, w: 1.1, flat: true });
  if (slot) { const a = rad(rotDeg); s += line2([cx - Math.cos(a) * r * .7, cy - Math.sin(a) * r * .7], [cx + Math.cos(a) * r * .7, cy + Math.sin(a) * r * .7], 1.4); }
  return s;
}
function gear(c, cx, cy, R, teeth, dir, m, o = {}) {
  const rot = spin(c, teeth, dir, o.phase || 0);
  const outer = gearPoly(cx, cy, R, teeth, rot, o.depth || .2), holes = [];
  const Rb = R * (1 - (o.depth || .2));
  if (o.spokes) {
    const Rin = Rb * (o.rim || .66), Rh = Rb * (o.hubR || .26), ns = o.spokes, ws = o.spokeW || Rb * .16;
    for (let k = 0; k < ns; k++) {
      const a = rad(rot + k * 360 / ns), half = 360 / ns / 2;
      const g1 = Math.asin(Math.min(1, ws / 2 / Rin)) * 180 / Math.PI, g2 = Math.asin(Math.min(1, ws / 2 / Rh)) * 180 / Math.PI;
      const o1 = arc(cx, cy, Rin, Rin, rot + k * 360 / ns + g1, rot + (k + 1) * 360 / ns - g1, 8);
      const i1 = arc(cx, cy, Rh, Rh, rot + (k + 1) * 360 / ns - g2, rot + k * 360 / ns + g2, 6);
      holes.push(o1.concat(i1));
    }
  } else if (o.hole) holes.push(circ(cx, cy, Rb * o.hole, 22).reverse());
  let s = solid(c, outer, m, { holes, w: o.w || 1.4, dk: o.dk });
  if (o.hub !== false) s += boss(c, cx, cy, o.hubSize || Math.max(3, R * .24), o.hubMat || M('steel'), rot, true);
  return s;
}

function wheel(c, cx, cy, r, m, o = {}) {
  const rot = (o.spin || 0) * c.t * 70 + (o.phase || 0), ns = o.spokes || 4;
  let s = solid(c, circ(cx, cy, r, 28), m, { dk: o.dk == null ? .6 : o.dk, w: 1.3 });
  s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * .74)}" fill="${m.m}" stroke="${INK}" stroke-width=".9"/>`;
  for (let k = 0; k < ns; k++) { const a = rad(rot + k * 360 / ns); s += bar([cx, cy], [cx + Math.cos(a) * r * .72, cy + Math.sin(a) * r * .72], 2.2, m.d, null); }
  return s + boss(c, cx, cy, Math.max(2.5, r * .22), o.hubMat || M('steel'), rot, true);
}

function hex(c, cx, cy, r, rotDeg, m, o = {}) {
  const p = []; for (let i = 0; i < 6; i++) { const a = rad(rotDeg + i * 60); p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return solid(c, p, m, { w: 1.1, dk: o.dk == null ? .6 : o.dk, flat: o.flat }) + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * .5)}" fill="none" stroke="${INK}" stroke-width=".6"/>`;
}

/* straight conveyor: belt with moving cleats and a roller at each end */
function conveyor(c, a, b, w, m, o = {}) {
  const d = unit(sub(b, a)), n = perp(d), h = w / 2, L = len(sub(b, a));
  const poly = [add(a, mul(n, h)), add(b, mul(n, h)), sub(b, mul(n, h)), sub(a, mul(n, h))];
  let s = solid(c, poly, m, { w: 1.4 }), id = c.id(), cl = '', sp = o.pitch || 7, off = (((o.dir == null ? 1 : o.dir) * c.t * 16) % sp + sp) % sp;
  for (let t = off; t < L; t += sp) { const p = add(a, mul(d, t)); cl += 'M' + f(p[0] + n[0] * h * .85) + ' ' + f(p[1] + n[1] * h * .85) + 'L' + f(p[0] - n[0] * h * .85) + ' ' + f(p[1] - n[1] * h * .85); }
  s += `<clipPath id="${id}"><path d="${pd(poly)}"/></clipPath><g clip-path="url(#${id})">${ink(cl, 1.1, 'opacity=".8"')}${fillp(pd(poly), 'url(#hatch)', 'opacity=".5"')}</g>`;
  for (const p of [a, b]) s += solid(c, circ(p[0], p[1], h * .78, 18), o.roller || M('steel'), { dk: .8, w: 1.2 }) + `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(h * .22)}" fill="${INK}"/>`;
  return s;
}

/* chain along a path (links alternate ring / edge-on), marching with c.t */
function chain(c, path, m, o = {}) {
  const sp = o.pitch || 12, ph = (((o.dir == null ? 1 : o.dir) * c.t * 14) % (2 * sp) + 2 * sp) % (2 * sp);
  let s = '';
  for (let k = -2; k * sp < path.L + sp; k++) {
    const q = path.at(k * sp + ph); if (k * sp + ph < 0 || k * sp + ph > path.L) continue;
    const ang = Math.atan2(q.t[1], q.t[0]) * 180 / Math.PI, even = (((k % 2) + 2) % 2) === 0, p = q.p;
    if (even) {
      s += `<ellipse cx="0" cy="0" rx="${f(sp * .74)}" ry="${f(sp * .38)}" transform="translate(${f(p[0])} ${f(p[1])}) rotate(${f(ang)})" fill="none" stroke="${INK}" stroke-width="${f(sp * .27)}"/>`
        + `<ellipse cx="0" cy="0" rx="${f(sp * .74)}" ry="${f(sp * .38)}" transform="translate(${f(p[0])} ${f(p[1])}) rotate(${f(ang)})" fill="none" stroke="${m.m}" stroke-width="${f(sp * .15)}"/>`;
    } else {
      const a1 = add(p, mul(q.t, -sp * .6)), a2 = add(p, mul(q.t, sp * .6));
      s += bar(a1, a2, sp * .3, m.d, m.l);
    }
  }
  return s;
}

/* threaded rod with a nut at the far end; threads slide with c.t so it seems to turn */
function screw(c, a, b, r, m, o = {}) {
  const d = unit(sub(b, a)), n = perp(d), L = len(sub(b, a)), poly = [add(a, mul(n, r)), add(b, mul(n, r)), sub(b, mul(n, r)), sub(a, mul(n, r))];
  const id = c.id(), sp = 3.8, off = (((o.dir == null ? 1 : o.dir) * c.t * 6) % sp + sp) % sp;
  let th = '';
  for (let t = off - sp; t < L; t += sp) { const p = add(a, mul(d, t)); th += 'M' + f(p[0] - n[0] * r) + ' ' + f(p[1] - n[1] * r) + 'L' + f(p[0] + n[0] * r + d[0] * sp * .8) + ' ' + f(p[1] + n[1] * r + d[1] * sp * .8); }
  let s = solid(c, poly, m, { w: 1.3, dk: .5 });
  s += `<clipPath id="${id}"><path d="${pd(poly)}"/></clipPath><g clip-path="url(#${id})">${ink(th, .95)}</g>`;
  if (o.head !== false) s += hex(c, b[0], b[1], r * 1.85, Math.atan2(d[1], d[0]) * 180 / Math.PI + 15, o.headMat || M('steel'));
  if (o.tail) s += hex(c, a[0], a[1], r * 1.55, 0, o.headMat || M('steel'));
  return s;
}

function spring(c, a, b, r, coils, m) {
  const d = unit(sub(b, a)), n = perp(d), L = len(sub(b, a)), pts = [], N = coils * 14;
  for (let i = 0; i <= N; i++) { const u = i / N, th = u * coils * 2 * Math.PI; pts.push(add(add(a, mul(d, L * u + Math.cos(th) * r * .28)), mul(n, Math.sin(th) * r))); }
  const dd = pd(pts, false);
  return `<path d="${dd}" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linejoin="round" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${m.m}" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${m.l}" stroke-width="1" stroke-linejoin="round" transform="translate(-.7 -.7)"/>`;
}

/* hydraulic ram: coloured barrel + chrome rod */
function ram(c, a, b, r, m, o = {}) {
  const k = o.split == null ? .56 : o.split, mid = lerp(a, b, k), st = M('steel');
  return pipe(c, [lerp(a, b, .02), mid], r, m, { collars: [0, 1], collarMat: st }) + pipe(c, [mid, lerp(a, b, .96)], r * .5, st, { ticks: false })
    + hex(c, a[0], a[1], r * .9, 0, st) + hex(c, b[0], b[1], r * .8, 0, st);
}

function gauge(c, cx, cy, r, t) {
  let s = solid(c, circ(cx, cy, r, 24), M('steel'), { dk: .7, w: 1.2, flat: true }) + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * .78)}" fill="${MATS.cream.l}" stroke="${INK}" stroke-width=".8"/>`;
  for (let i = 0; i <= 6; i++) { const a = rad(150 + i * 40); s += line2([cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55], [cx + Math.cos(a) * r * .72, cy + Math.sin(a) * r * .72], .7); }
  const na = rad(200 + 110 * (.5 + .5 * Math.sin(t * 2.4)));
  return s + bar([cx, cy], [cx + Math.cos(na) * r * .62, cy + Math.sin(na) * r * .62], 1.2, MATS.red.m, null) + `<circle cx="${f(cx)}" cy="${f(cy)}" r="1.3" fill="${INK}"/>`;
}

/* toothed ribbon (rack) along a path; smooth edge at oSmooth, teeth grow from oBase outward */
function toothRibbon(path, oSmooth, oBase, h, pitch) {
  const S = path.samples(pitch / 9), sg = Math.sign(oBase - oSmooth) || 1;
  const prof = u => { u = ((u % 1) + 1) % 1; return u < .14 ? 0 : u < .28 ? (u - .14) / .14 : u < .66 ? 1 : u < .8 ? 1 - (u - .66) / .14 : 0; };
  const A = S.map(q => add(q.p, mul(q.n, oSmooth))), B = S.map(q => add(q.p, mul(q.n, oBase + sg * h * prof(q.s / pitch)))).reverse();
  return A.concat(B);
}

/* belt looping round two pulleys, cleats marching */
function beltLoop(c, p1, p2, r, m, o = {}) {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1], ang = Math.atan2(dy, dx) * 180 / Math.PI;
  const loop = cat(arc(p2[0], p2[1], r, r, ang - 90, ang + 90), arc(p1[0], p1[1], r, r, ang + 90, ang + 270)), path = mkPath(loop, true);
  const w = o.w || 6, dir = o.dir == null ? 1 : o.dir, sp = 7, off = ((dir * c.t * 16) % sp + sp) % sp;
  let s = `<path d="${pd(loop)}" fill="none" stroke="${INK}" stroke-width="${f(w + 2.4)}" stroke-linejoin="round"/><path d="${pd(loop)}" fill="none" stroke="${m.m}" stroke-width="${w}" stroke-linejoin="round"/><path d="${pd(loop)}" fill="none" stroke="${m.l}" stroke-width="${f(w * .32)}" stroke-linejoin="round" transform="translate(-.8 -.8)"/>`;
  let cl = ''; for (let t = off; t < path.L; t += sp) { const q = path.at(t); cl += 'M' + f(q.p[0] + q.n[0] * w * .48) + ' ' + f(q.p[1] + q.n[1] * w * .48) + 'L' + f(q.p[0] - q.n[0] * w * .48) + ' ' + f(q.p[1] - q.n[1] * w * .48); }
  s += ink(cl, .8, 'opacity=".75"');
  return s;
}

/* ------------------------------------------------------------ glyph table */
const GL = {};
const define = (ch, w, pal, draw, o) => { const a = GL[ch] || (GL[ch] = []); if (o && o.replace) a.length = 0; a.push({ w, pal, draw, ch }); };
const parts = { solid, beam, girder, pipe, collar, gear, gearPoly, wheel, hex, boss, conveyor, chain, screw, spring, ram, gauge, beltLoop, toothRibbon, bar,
  seg, arc, circ, cat, mkPath, ribbon, add, sub, mul, lerp, unit, perp, len, rad, M, MATS, INK, spin, pd, ink, fillp };

/* A — two lattice legs, a conveyor for crossbar, a pulley at the apex */
define('A', 98, ['green', 'orange', 'steel'], c => { const [g, o, s] = c.M;
  return girder(c, [10, 140], [45, 18], 15, g) + girder(c, [88, 140], [53, 18], 15, g) + conveyor(c, [23, 104], [75, 104], 12, o, { dir: 1 }) + wheel(c, 49, 22, 11, s, { spin: 1, spokes: 3 }); });

/* B — steel spine, two pressure pipes, a gauge that swings */
define('B', 92, ['rust', 'steel', 'cream'], c => { const [r, s] = c.M;
  const up = cat(seg([27, 20], [42, 20]), arc(42, 46, 26, 26, -90, 90), seg([42, 72], [27, 72]));
  const lo = cat(seg([27, 80], [44, 80]), arc(44, 110, 30, 30, -90, 90), seg([44, 140], [27, 140]));
  return girder(c, [20, 12], [20, 140], 15, s) + pipe(c, lo, 7, r, { collars: [0, 1] }) + pipe(c, up, 7, r, { collars: [0, 1] }) + gauge(c, 68, 46, 9, c.t); });

/* C — a roller chain wrapped over two sprockets */
define('C', 108, ['yellow', 'steel', 'brown'], c => { const [y, s] = c.M;
  const pts = arc(56, 77, 40, 56, -50, -310, 60), p0 = pts[0], p1 = pts[pts.length - 1];
  return chain(c, mkPath(pts), y, { pitch: 16 }) + gear(c, p0[0], p0[1], 17, 9, 1, s, { depth: .22 }) + gear(c, p1[0], p1[1], 17, 9, -1, s, { depth: .22 }); });

/* D — girder spine, a curved rack and the pinion that drives it */
define('D', 100, ['blue', 'steel', 'orange'], c => { const [b, s, o] = c.M;
  const path = mkPath(arc(30, 77, 54, 60, -90, 90, 40));
  return girder(c, [20, 12], [20, 140], 15, s) + solid(c, toothRibbon(path, -7, 6, 4.5, 8.5), b, { w: 1.4 }) + gear(c, 64, 77, 12, 10, 1, o, { depth: .22 }); });

/* E — spine and three threaded arms */
define('E', 90, ['orange', 'steel', 'rust'], c => { const [o, s] = c.M;
  return girder(c, [20, 12], [20, 140], 15, s) + screw(c, [26, 18], [80, 18], 6.5, o, { dir: 1 }) + screw(c, [26, 78], [68, 78], 6.5, o, { dir: -1 }) + screw(c, [26, 133], [80, 133], 6.5, o, { dir: 1 }); });

/* F */
define('F', 84, ['orange', 'steel', 'rust'], c => { const [o, s] = c.M;
  return girder(c, [20, 12], [20, 140], 15, s) + screw(c, [26, 18], [78, 18], 6.5, o, { dir: 1 }) + screw(c, [26, 78], [64, 78], 6.5, o, { dir: -1 }); });

/* G — toothed arc with a measuring jaw (after the caliper on the cover) */
define('G', 108, ['olive', 'steel', 'brown'], c => { const [o, s, b] = c.M;
  const path = mkPath(arc(54, 77, 42, 59, -42, -338, 70));
  const e = path.at(path.L).p;
  return solid(c, toothRibbon(path, 6, -6, 4.5, 8.5), o, { w: 1.4 }) + beam(c, [e[0], 90], [58, 90], 12, s) + screw(c, [60, 90], [86, 90], 3.6, b, { dir: 1, head: false }) + hex(c, 58, 90, 8, 0, b); });

/* H — two lattice columns and a pipe with a hand wheel */
define('H', 98, ['orange', 'steel', 'red'], c => { const [o, s, r] = c.M;
  return girder(c, [20, 12], [20, 140], 16, o) + girder(c, [78, 12], [78, 140], 16, o) + pipe(c, [[27, 84], [71, 84]], 8, s, { collars: [0, 1] }) + pipe(c, [[49, 84], [49, 58]], 3.5, s, { ticks: false }) + wheel(c, 49, 50, 13, r, { spin: 1, spokes: 4 }); });

/* I — a piston with its two end plates */
define('I', 56, ['blue', 'steel', 'yellow'], c => { const [b, s, y] = c.M;
  return beam(c, [28, 140], [28, 132], 48, s, { rivets: false }) + pipe(c, [[28, 20], [28, 134]], 10, b, { collars: [.2, .5, .8] }) + beam(c, [28, 20], [28, 12], 48, s, { rivets: false }) + hex(c, 13, 16, 3.8, 0, y) + hex(c, 43, 16, 3.8, 0, y) + hex(c, 13, 136, 3.8, 0, y) + hex(c, 43, 136, 3.8, 0, y); });

/* J — pulley block on a rod, ending in a hook */
define('J', 72, ['red', 'steel', 'yellow'], c => { const [r, s] = c.M;
  const hook = cat(seg([52, 30], [52, 96], 10), arc(34, 96, 18, 22, 0, 168, 20));
  return beam(c, [52, 22], [52, 21], 28, s) + wheel(c, 52, 21, 9, r, { spin: 1, spokes: 3 }) + pipe(c, hook, 7, r, { cap: 'round', collars: [0] }) + hex(c, 52, 20, 3.6, 0, M('steel')); });

/* K — spine with two hydraulic arms on a pivot */
define('K', 98, ['green', 'steel', 'red'], c => { const [g, s, r] = c.M, k = 3 * Math.sin(c.t * 2.2);
  return girder(c, [20, 12], [20, 140], 15, s) + ram(c, [26, 80], [86, 14 + k], 7, g) + ram(c, [26, 74], [88, 136 - k], 7, g, { split: .5 }) + gear(c, 26, 77, 10, 8, 1, r, { depth: .22 }); });

/* L — girder and a conveyor floor */
define('L', 84, ['rust', 'steel', 'yellow'], c => { const [r, s, y] = c.M;
  return girder(c, [20, 12], [20, 140], 16, r) + conveyor(c, [26, 129], [78, 129], 14, y, { dir: 1, roller: s }); });

/* M — twin towers with a cable-stayed vee and a gear at the foot */
define('M', 126, ['yellow', 'steel', 'rust'], c => { const [y, s, r] = c.M;
  return girder(c, [20, 12], [20, 140], 16, y) + girder(c, [106, 12], [106, 140], 16, y)
    + ram(c, [24, 20], [62, 110], 6, r, { split: .5 }) + ram(c, [102, 20], [64, 110], 6, r, { split: .5 }) + gear(c, 63, 112, 14, 11, 1, s, { depth: .22, spokes: 3 }); });

/* N — lattice tower, ladder and a diagonal pipe */
define('N', 104, ['blue', 'steel', 'red'], c => { const [b, s, r] = c.M;
  let o = girder(c, [20, 14], [20, 140], 15, b);
  const rl = [78, 94];
  for (const x of rl) o += bar([x, 12], [x, 140], 3.2, s.m, s.l);
  for (let y = 22; y < 138; y += 11) o += bar([rl[0], y], [rl[1], y], 2.2, s.d, null);
  return o + pipe(c, [[26, 22], [88, 130]], 8.5, r, { collars: [0, .5, 1], cap: 'butt' }); });

/* O — a big gear with spokes */
define('O', 120, ['orange', 'steel', 'rust'], c => { const [o, s, r] = c.M;
  return gear(c, 60, 77, 60, 18, 1, o, { spokes: 4, rim: .68, hubR: .28, depth: .13, hubSize: 11, hubMat: s }); });

/* P — spine and a belt-driven bowl */
define('P', 102, ['green', 'steel', 'yellow'], c => { const [g, s, y] = c.M;
  return girder(c, [20, 12], [20, 140], 15, s) + beltLoop(c, [37, 40], [65, 40], 26, g, { w: 8 }) + wheel(c, 65, 40, 13, y, { spin: 1, spokes: 3 }) + wheel(c, 37, 40, 13, y, { spin: 1, spokes: 3 }); });

/* Q — the big gear plus a screw tail */
define('Q', 124, ['orange', 'steel', 'rust'], c => { const [o, s, r] = c.M;
  return gear(c, 60, 77, 60, 18, 1, o, { spokes: 4, rim: .68, hubR: .28, depth: .13, hubSize: 11, hubMat: s }) + screw(c, [78, 104], [114, 142], 6.5, r, { dir: 1 }); });

/* R — spine, belt bowl, and a girder leg on a pivot */
define('R', 100, ['rust', 'steel', 'yellow'], c => { const [r, s, y] = c.M;
  return girder(c, [20, 12], [20, 140], 15, s) + girder(c, [46, 78], [88, 138], 14, r) + beltLoop(c, [37, 38], [61, 38], 24, r, { w: 8 }) + wheel(c, 61, 38, 11.5, y, { spin: 1, spokes: 3 }) + wheel(c, 37, 38, 11.5, y, { spin: 1, spokes: 3 }) + hex(c, 46, 80, 6, 0, s); });

/* S — a flanged pipe, with steam when it works */
define('S', 90, ['blue', 'steel', 'red'], c => { const [b, s, r] = c.M;
  const pts = cat(arc(46, 45, 28, 31, -32, -270, 40), arc(46, 107, 30, 31, -90, 150, 40));
  const path = mkPath(pts);
  let st = ''; if (c.on) for (let i = 0; i < 3; i++) { const u = (c.t * .55 + i / 3) % 1, e = pts[0]; st += `<circle cx="${f(e[0] + 8 + 6 * u + i * 2)}" cy="${f(e[1] - 6 - 26 * u)}" r="${f(4 + 7 * u)}" fill="#fff" stroke="${INK}" stroke-width=".8" opacity="${f(.85 * (1 - u))}"/>`; }
  return pipe(c, pts, 8.5, b, { collars: [0, .5, 1], collarMat: s }) + wheel(c, 46, 76, 8, r, { spin: 1, spokes: 4 }) + st; });

/* T — a tower crane: the jib is the crossbar */
define('T', 100, ['rust', 'orange', 'steel'], c => { const [r, o, s] = c.M, tx = 24 + 22 * (.5 + .5 * Math.sin(c.t * .9)), hy = 64 + 10 * Math.sin(c.t * 1.7);
  let g = beam(c, [50, 140], [50, 139], 44, s, { w: 1.4 }) + girder(c, [50, 132], [50, 30], 17, r, { plates: false });
  g += bar([50, 8], [8, 28], 1.5, INK, null) + bar([50, 8], [92, 28], 1.5, INK, null) + girder(c, [50, 30], [50, 6], 8, o, { plates: false });
  g += girder(c, [4, 27], [96, 27], 11, o);
  g += beam(c, [76, 40], [92, 40], 12, s) + beam(c, [76, 52], [92, 52], 12, s);
  g += beam(c, [28, 51], [42, 51], 16, o);
  g += beam(c, [tx, 27], [tx, 28], 9, s) + bar([tx, 33], [tx, hy], 1.1, INK, null);
  g += pipe(c, cat(seg([tx, hy], [tx, hy + 9], 2), arc(tx - 5, hy + 9, 5, 5, 0, 200, 10)), 2.4, s, { cap: 'round', ticks: false });
  return g; });

/* U — a horseshoe magnet with a few nails clinging to its poles */
define('U', 92, ['red', 'steel', 'blue'], c => { const [r, s, b] = c.M;
  const pts = cat(seg([24, 14], [24, 98], 8), arc(48, 98, 24, 27, 180, 0, 24), seg([72, 98], [72, 14], 8)), path = mkPath(pts);
  const half = path.L / 2, jig = c.on ? Math.sin(c.t * 14) * 1.2 : 0;
  let g = pipe(c, path.slice(0, half), 12, r, { cap: 'butt' }) + pipe(c, path.slice(half, path.L), 12, b, { cap: 'butt' });
  g += pipe(c, [[24, 14], [24, 29]], 12, s, { ticks: false }) + pipe(c, [[72, 29], [72, 14]], 12, s, { ticks: false });
  g += beam(c, [24, 14], [24, 13], 28, s, { rivets: false, dk: .7 }) + beam(c, [72, 14], [72, 13], 28, s, { rivets: false, dk: .7 });
  g += bar([21 + jig, 11], [17 + jig, -1], 2.4, s.m, s.l) + bar([73, 11 - jig], [77, -1], 2.4, s.m, s.l);
  return g; });

/* V — two lattice legs pinned together, with a spring between */
define('V', 106, ['green', 'steel', 'orange'], c => { const [g, s, o] = c.M, w = 1.4 * Math.sin(c.t * 3);
  return girder(c, [10, 14], [48, 138], 14, g) + girder(c, [96, 14], [58, 138], 14, g) + spring(c, [27 + w, 66], [78 - w, 66], 7, 7, s) + hex(c, 53, 134, 8, 0, o); });

/* W — four arms hinged into a zig-zag */
define('W', 134, ['yellow', 'steel', 'rust'], c => { const [y, s, r] = c.M;
  const P = [[10, 14], [37, 138], [67, 48], [97, 138], [124, 14]];
  let g = ''; for (let i = 0; i < 4; i++) g += i % 2 ? beam(c, P[i], P[i + 1], 14, y, { rivets: true }) : girder(c, P[i], P[i + 1], 13, y, { plates: false });
  return g + hex(c, P[1][0], P[1][1] - 4, 7, 0, s) + hex(c, P[3][0], P[3][1] - 4, 7, 0, s) + gear(c, P[2][0], P[2][1] + 2, 11, 9, 1, r, { depth: .22 }); });

/* X — scissor arms around a gear */
define('X', 102, ['rust', 'steel', 'orange'], c => { const [r, s, o] = c.M;
  return girder(c, [10, 14], [92, 138], 15, r) + beam(c, [92, 14], [10, 138], 14, o) + gear(c, 51, 77, 13, 10, 1, s, { depth: .22, spokes: 3 }); });

/* Y — a zip: closed teeth on the stem, open tapes on the arms, the slider travels */
define('Y', 102, ['orange', 'steel', 'blue'], c => { const [o, s, b] = c.M;
  const jy = 78 + (c.on ? 12 * Math.sin(c.t * 1.3) : 0), J = [51, jy];
  let g = '';
  for (const [A, inner] of [[[10, 14], 1], [[92, 14], -1]]) {
    const d = unit(sub(A, J)), n = mul(perp(d), inner), out = mul(n, -1), L = len(sub(A, J));
    g += solid(c, [J, A, add(A, mul(out, 12)), add(J, mul(out, 12))], o, { w: 1.3, dk: .7 });
    for (let t = 9; t < L - 3; t += 7) { const q = add(J, mul(d, t)); g += solid(c, [add(q, mul(d, -2.2)), add(q, mul(d, 2.2)), add(add(q, mul(d, 2.2)), mul(n, 6)), add(add(q, mul(d, -2.2)), mul(n, 6))], s, { w: .8, dk: .4, flat: true }); }
  }
  g += solid(c, [[39, jy], [47, jy], [47, 140], [39, 140]], o, { w: 1.3, dk: .7 }) + solid(c, [[55, jy], [63, jy], [63, 140], [55, 140]], o, { w: 1.3, dk: .7 });
  for (let y = jy + 7, i = 0; y < 138; y += 4.8, i++) g += solid(c, i % 2 ? [[43, y], [51.5, y], [51.5, y + 3.4], [43, y + 3.4]] : [[50.5, y], [59, y], [59, y + 3.4], [50.5, y + 3.4]], s, { w: .7, dk: .3, flat: true });
  g += solid(c, [[43, jy - 11], [59, jy - 11], [55, jy + 8], [47, jy + 8]], b, { w: 1.4, dk: .9 });
  g += `<rect x="48.5" y="${f(jy + 8)}" width="5" height="11" rx="2" fill="${b.m}" stroke="${INK}" stroke-width="1.1"/><circle cx="51" cy="${f(jy + 25)}" r="5.5" fill="none" stroke="${INK}" stroke-width="3.4"/><circle cx="51" cy="${f(jy + 25)}" r="5.5" fill="none" stroke="${s.m}" stroke-width="1.9"/>`;
  return g; });

/* Z — two plates linked by a slanting conveyor */
define('Z', 96, ['blue', 'steel', 'orange'], c => { const [b, s, o] = c.M;
  return beam(c, [8, 20], [86, 20], 14, b) + conveyor(c, [82, 26], [14, 126], 13, o, { dir: -1, roller: s }) + beam(c, [8, 132], [86, 132], 14, b); });

/* ! and . and - and space */
define('!', 44, ['red', 'steel', 'yellow'], c => { const [r, s, y] = c.M;
  return pipe(c, [[22, 20], [22, 100]], 9.5, r, { collars: [.12, .88] }) + gear(c, 22, 126, 11, 9, 1, y, { depth: .22 }); });
define('.', 36, ['red', 'steel', 'yellow'], c => gear(c, 18, 128, 11, 9, 1, c.M[2], { depth: .22 }));
define('-', 56, ['steel', 'steel', 'yellow'], c => beam(c, [6, 84], [50, 84], 13, c.M[0]) );
define(' ', 40, ['steel', 'steel', 'steel'], () => '');

/* accents become small parts above (or a hook below for the cedilla) */
function accent(c, kind, w) {
  const m = c.M[1], x = w / 2;
  if (kind === '́') return beam(c, [x - 8, 0], [x + 9, -13], 7, m);
  if (kind === '̀') return beam(c, [x + 8, 0], [x - 9, -13], 7, m);
  if (kind === '̂') return beam(c, [x - 13, 0], [x, -14], 6, m) + beam(c, [x, -14], [x + 13, 0], 6, m);
  if (kind === '̈') return hex(c, x - 10, -6, 5, 0, m) + hex(c, x + 10, -6, 5, 0, m);
  if (kind === '̧') return pipe(c, cat(seg([x, 140], [x + 1, 148], 2), arc(x - 3, 148, 4, 4, 0, 200, 8)), 2.6, m, { cap: 'round', ticks: false });
  return '';
}

/*@@EXTRA@@*/
/*@@PART8@@*/
/* ======================= v3 batch 4: T … Z ======================= */
function spannerHead(c, p, ang, R, m, open = true) {
  const pts = [], a0 = ang + 28, a1 = ang + 332;
  for (let i = 0; i <= 18; i++) { const a = rad(a0 + (a1 - a0) * i / 18); pts.push([p[0] + R * Math.cos(a), p[1] + R * Math.sin(a)]); }
  const inner = R * .5, ia = rad(ang), nn = [Math.cos(ia + Math.PI / 2), Math.sin(ia + Math.PI / 2)], dd = [Math.cos(ia), Math.sin(ia)];
  pts.push(add(add(p, mul(nn, -inner * .7)), mul(dd, R * .55)), add(p, mul(dd, -R * .1)), add(add(p, mul(nn, inner * .7)), mul(dd, R * .55)));
  return solid(c, pts, m, { w: 1.5, dk: .9 });
}
function lamp2(c, x, y, rot, g = 1) { return rays([[x + 4, y + 6], [x - 18, y + 54], [x + 26, y + 54]], .38 * g) + bulb(c, x, y, 7, { rot, glow: g }); }
function ringLoop(c, p, r, m) { return pipe(c, ringPts(p[0], p[1], r, r).concat([[p[0] + r, p[1]]]), 2.6, m, { ticks: false }); }

/* ======================= T ======================= */
/* T — a trebuchet: the arm is the crossbar */
define('T', 104, ['wood', 'steel', 'red'], c => { const [w, s, r] = c.M, a = c.on ? 16 * Math.sin(c.t * 1.5) : -9, P = [52, 36];
  let g = girder(c, [22, 140], [52, 38], 11, w, { plates: false }) + girder(c, [82, 140], [52, 38], 11, w, { plates: false }) + beam(c, [14, 140], [90, 140], 6, M('dark'), { rivets: false });
  g += beam(c, [34, 100], [70, 100], 5, w, { rivets: false });
  const cw = rad(a), rot = (p) => [P[0] + (p[0] - P[0]) * Math.cos(cw) - (p[1] - P[1]) * Math.sin(cw), P[1] + (p[0] - P[0]) * Math.sin(cw) + (p[1] - P[1]) * Math.cos(cw)];
  const L = rot([8, 36]), R = rot([98, 36]);
  g += `<g transform="rotate(${f(a)} ${P[0]} ${P[1]})">` + taper(c, [8, 36], [98, 36], 9, 5, w, { w: 1.5 }) + `</g>`;
  g += line2(L, [L[0], L[1] + 18], 1.3) + solid(c, [[L[0] - 9, L[1] + 18], [L[0] + 9, L[1] + 18], [L[0] + 9, L[1] + 36], [L[0] - 9, L[1] + 36]], M('dark'), { w: 1.4, dk: .8 });
  const sx = R[0] + 3 * Math.sin(c.t * 2), sy = R[1] + 22;
  g += line2(R, [sx, sy], 1.2) + ball(c, sx, sy + 4, 5.5, M('steel'));
  return g + hex(c, P[0], P[1], 7, 0, M('brass'), { dk: .7 }) + arrow(c, 52, 70, 22, 300, 400, M('orange')); });

/* T — a T-junction of pipes with gauges, valves and steam */
define('T', 104, ['copper', 'brass', 'steel'], c => { const [cu, br, s] = c.M;
  let g = pipe(c, [[8, 26], [96, 26]], 9, cu, { collars: [.04, .28, .72, .96], collarMat: br }) + pipe(c, [[52, 34], [52, 138]], 9, cu, { collars: [.12, .5, .9], collarMat: br });
  g += wheel(c, 52, 76, 9, M('red'), { spin: 1, spokes: 4 }) + gauge(c, 22, 26, 8, c.t) + gauge(c, 82, 26, 8, c.t + 1);
  g += pipe(c, [[52, 6], [52, 20]], 3.4, s, { collars: [0], ticks: false }) + beam(c, [52, 6], [52, 4], 12, br, { rivets: false });
  if (c.on) for (const x of [6, 98]) for (let k = 0; k < 3; k++) { const u = (c.t * .8 + k / 3) % 1; g += `<circle cx="${f(x + (x < 50 ? -8 : 8) * u)}" cy="${f(26 - 22 * u)}" r="${f(2 + 6 * u)}" fill="#fff" stroke="${INK}" stroke-width=".8" opacity="${f(.9 * (1 - u))}"/>`; }
  return g + beam(c, [36, 140], [68, 140], 6, s, { rivets: true }); });

/* ======================= U ======================= */
/* U — a U-bolt clamping a pipe to a plate */
define('U', 92, ['steel', 'blue', 'brass'], c => { const [s, b, br] = c.M, tw = c.on ? c.t * 40 : 0;
  let g = beam(c, [6, 22], [86, 22], 10, M('dark'), { rivets: true });
  g += solid(c, circ(46, 98, 19, 28), b, { w: 1.6, holes: [circ(46, 98, 10, 20).reverse()] });
  const ub = cat(seg([24, 20], [24, 96], 6), arc(46, 96, 22, 26, 180, 0, 20), seg([68, 96], [68, 20], 6));
  g += pipe(c, ub, 5, s, { ticks: true });
  for (const x of [24, 68]) { g += screw(c, [x, 24], [x, 60], 3.4, s, { head: false, dir: 1 }); g += hex(c, x, 14, 8, 0, br, { dk: .8 }) + `<circle cx="${x}" cy="14" r="3" fill="${MATS.dark.m}" stroke="${INK}" stroke-width=".8"/>` + solid(c, [[x - 9, 28], [x + 9, 28], [x + 9, 32], [x - 9, 32]], M('chrome'), { w: 1, dk: .3, rim: false }); }
  return g; });

/* U — bunting hung from two posts */
define('U', 96, ['wood', 'steel', 'red'], c => { const [w, s, r] = c.M, sway = Math.sin(c.t * 2) * (c.on ? 2 : .8);
  let g = solid(c, [[6, 140], [16, 140], [14, 14], [8, 14]], w, { w: 1.4, dk: .7 }) + solid(c, [[80, 140], [90, 140], [88, 14], [82, 14]], w, { w: 1.4, dk: .7 });
  const cat2 = []; for (let i = 0; i <= 28; i++) { const u = i / 28; cat2.push([12 + 72 * u, 18 + 96 * 4 * u * (1 - u) * (.9 + .02 * sway)]); }
  g += polyBar(cat2, 2.4, M('brown').m, M('brown').l);
  const cols = ['red', 'yellow', 'blue', 'green', 'orange', 'pink', 'teal'];
  for (let i = 1; i < 14; i++) { const q = cat2[Math.round(i * 2)], q2 = cat2[Math.min(28, Math.round(i * 2) + 2)], dd = unit(sub(q2, q)), nn = perp(dd), tip = add(add(q, mul(dd, 5)), mul(nn, 17 + sway * .3));
    g += solid(c, [q, q2, tip], M(cols[i % cols.length]), { w: 1.1, dk: .35, rim: false }); }
  g += bulb(c, 48, 118, 6, { rot: 0, glow: c.on ? 1 : .55 }).replace('rotate(0)', 'rotate(180)');
  return g + ball(c, 11, 11, 4, M('brass')) + ball(c, 85, 11, 4, M('brass')); });

/* ======================= V ======================= */
/* V — a laboratory funnel dripping into a flask */
define('V', 108, ['blue', 'steel', 'teal'], c => { const [b, s, t] = c.M, lv = 26 + 10 * Math.sin(c.t * 1.5);
  let g = '';
  const cone = [[8, 14], [100, 14], [60, 96], [48, 96]], id = c.id();
  g += `<clipPath id="${id}"><path d="${pd(cone)}"/></clipPath><path d="${pd(cone)}" fill="${GLASS}" fill-opacity=".4"/><g clip-path="url(#${id})"><path d="M0 ${f(lv)}Q30 ${f(lv - 4)} 54 ${f(lv)}T108 ${f(lv)}V110H0Z" fill="${t.m}"/><path d="M0 ${f(lv)}Q30 ${f(lv - 4)} 54 ${f(lv)}T108 ${f(lv)}" fill="none" stroke="${t.l}" stroke-width="2"/></g>` + ink(pd(cone), 1.7);
  g += `<path d="M20 20L52 80" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>`;
  g += pipe(c, [[54, 94], [54, 118]], 3.4, M('chrome'), { ticks: false }) + solid(c, [[4, 12], [104, 12], [104, 17], [4, 17]], s, { w: 1.4, dk: .7 });
  for (let k = 0; k < 3; k++) { const u = (c.t * .9 + k / 3) % 1; g += `<ellipse cx="54" cy="${f(120 + 12 * u)}" rx="2" ry="3" fill="${t.m}" stroke="${INK}" stroke-width=".7"/>`; }
  g += `<path d="M34 128H74" stroke="${INK}" stroke-width="0"/>` + solid(c, [[36, 140], [72, 140], [66, 126], [42, 126]], M('chrome'), { w: 1.4, dk: .7 });
  return g + `<path d="M42 130Q54 135 66 130" fill="${t.m}" opacity=".8"/>`; });

/* V — rabbit-ear aerial on a little television */
define('V', 108, ['dark', 'steel', 'orange'], c => { const [d, s, o] = c.M, nz = k => Math.sin(Math.floor(c.t * 18) * 7.1 + k * 31) > .1;
  let g = '';
  const ear = (tip, ph) => { const base = [54, 110], dd = unit(sub(tip, base)); let r = ''; const segs = [[0, .38, 4.2], [.38, .7, 3.2], [.7, 1, 2.2]]; for (const [a, b2, rr] of segs) r += pipe(c, [add(base, mul(sub(tip, base), a)), add(base, mul(sub(tip, base), b2))], rr, M('chrome'), { ticks: false }); return r + ball(c, tip[0], tip[1], 3, M('red')); };
  g += ear([12, 14]) + ear([96, 14]);
  if (c.on) for (const [x, y, sg] of [[8, 12, -1], [100, 12, 1]]) for (let k = 0; k < 3; k++) { const u = (c.t * .8 + k / 3) % 1; g += `<path d="M${f(x + sg * 8 * u)} ${f(y - 10 * u)}q${f(sg * 6)} 8 0 16" fill="none" stroke="${INK}" stroke-width="1.2" opacity="${f(1 - u)}"/>`; }
  g += solid(c, [[18, 140], [90, 140], [90, 108], [18, 108]], o, { w: 1.6 });
  g += solid(c, [[24, 114], [70, 114], [70, 134], [24, 134]], M('dark'), { w: 1.3, dk: .3, rim: false }) + `<rect x="25" y="115" width="44" height="18" fill="#cfe6e0" stroke="${INK}" stroke-width=".8"/>`;
  for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) if (nz(i * 5 + j)) g += `<rect x="${26 + i * 4.8}" y="${116 + j * 4.2}" width="3.4" height="3" fill="${INK}" opacity=".75"/>`;
  g += gear(c, 80, 118, 4.4, 8, 1, M('brass'), { depth: .2, hubSize: 1.6 }) + gear(c, 80, 130, 3.6, 8, -1, M('brass'), { depth: .2, hubSize: 1.4 });
  return g + solid(c, [[26, 140], [34, 140], [32, 146], [28, 146]], d, { w: 1, dk: .3, rim: false }) + solid(c, [[74, 140], [82, 140], [80, 146], [76, 146]], d, { w: 1, dk: .3, rim: false }); });

/* ======================= W ======================= */
/* W — a saw blade bent into a W, teeth outward */
define('W', 136, ['steel', 'orange', 'rust'], c => { const [s, o, r] = c.M, P = [[12, 16], [40, 134], [68, 44], [96, 134], [124, 16]];
  let g = '';
  for (let i = 0; i < 4; i++) g += sawBlade(c, P[i], P[i + 1], 11);
  for (const i of [1, 3]) g += hex(c, P[i][0], P[i][1] - 4, 6, 0, M('brass'), { dk: .6 });
  return g + gear(c, P[2][0], P[2][1] + 2, 11, 10, 1, o, { depth: .2, spokes: 3 }) + hex(c, P[0][0], P[0][1] + 4, 5, 0, M('brass'), { dk: .5 }) + hex(c, P[4][0], P[4][1] + 4, 5, 0, M('brass'), { dk: .5 }); });

/* W — four springs zig-zagging between plates */
define('W', 136, ['red', 'steel', 'blue'], c => { const [r, s, b] = c.M, k = c.on ? Math.sin(c.t * 3) * 5 : 0, P = [[14, 20], [42, 128], [68, 44 + k], [96, 128], [122, 20]];
  let g = '';
  for (let i = 0; i < 4; i++) g += spring(c, P[i], P[i + 1], 8, 9, i % 2 ? s : s);
  for (const i of [1, 3]) g += beam(c, [P[i][0] - 14, 134], [P[i][0] + 14, 134], 8, M('dark'), { rivets: false });
  g += beam(c, [P[2][0] - 12, P[2][1] - 6], [P[2][0] + 12, P[2][1] - 6], 7, M('dark'), { rivets: false });
  return g + ball(c, P[0][0], P[0][1], 7, r) + ball(c, P[4][0], P[4][1], 7, b) + ball(c, P[2][0], P[2][1], 6, M('brass')); });

/* ======================= X ======================= */
/* X — two spanners crossed over a nut */
define('X', 104, ['steel', 'chrome', 'orange'], c => { const [s, ch, o] = c.M, sw = c.on ? Math.sin(c.t * 2) * 3 : 0;
  const spanner = (a, b, m) => { const d = unit(sub(b, a)); const angDeg = Math.atan2(d[1], d[0]) * 180 / Math.PI; return taper(c, a, b, 9, 9, m, { w: 1.5 }) + spannerHead(c, b, angDeg - 180 + 0, 13, m) + solid(c, circ(a[0], a[1], 8, 20), m, { w: 1.4, holes: [circ(a[0], a[1], 3.6, 10).reverse()] }); };
  return spanner([12 + sw, 130], [90 - sw, 24], s) + spanner([92 - sw, 130], [14 + sw, 24], ch) + hex(c, 52, 77, 10, 0, o, { dk: .9 }) + gear(c, 52, 77, 4, 6, 0, M('steel'), { depth: .2, hub: false }); });

/* X — a scissor lift raising its platform */
define('X', 104, ['yellow', 'steel', 'dark'], c => { const [y, s, d] = c.M, jig = c.on ? 2.2 * Math.sin(c.t * 2.4) : 0;
  let g = beam(c, [8, 138], [96, 138], 9, y) + wheel(c, 20, 146, 6, d, { spin: 1, spokes: 3 }) + wheel(c, 84, 146, 6, d, { spin: 1, spokes: 3 });
  g += girder(c, [14, 134], [90, 20 + jig], 11, y, { plates: false }) + girder(c, [90, 134], [14, 20 + jig], 11, s, { plates: false });
  g += beam(c, [6, 16 + jig], [98, 16 + jig], 9, y);
  g += `<path d="M10 ${12 + jig}V${-4 + jig}H94V${12 + jig}M10 ${4 + jig}H94" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M10 ${12 + jig}V${-4 + jig}H94V${12 + jig}M10 ${4 + jig}H94" fill="none" stroke="${MATS.red.m}" stroke-width="1.2"/>`;
  return g + hex(c, 52, 77 + jig * .5, 6, 0, M('brass'), { dk: .6 }) + crate(c, 40, -14 + jig, 16, 16, M('wood')); });

/* ======================= Y ======================= */
/* Y — a street lamp with two heads */
define('Y', 108, ['steel', 'brass', 'yellow'], c => { const [s, br, y] = c.M, g1 = c.on ? 1 : .6;
  let g = lamp2(c, 12, 24, -20, g1) + lamp2(c, 96, 24, 20, g1);
  g += pipe(c, [[54, 140], [54, 82]], 7, s, { collars: [.2, .6, .95], collarMat: br }) + pipe(c, cat(seg([54, 84], [54, 72], 2), arc(32, 72, 22, 28, 0, -60, 10), seg([24, 50], [14, 36], 2)).filter((p, i, a) => true), 4, s, { cap: 'round', collars: [] }) + pipe(c, cat(seg([54, 84], [54, 72], 2), arc(76, 72, 22, 28, 180, 240, 10), seg([84, 50], [94, 36], 2)), 4, s, { cap: 'round' });
  return g + solid(c, [[40, 140], [68, 140], [64, 130], [44, 130]], M('dark'), { w: 1.4, dk: .7 }) + hex(c, 54, 80, 6, 0, br, { dk: .5 }); });

/* Y — two feeder conveyors merging into one */
define('Y', 108, ['green', 'steel', 'brown'], c => { const [g1, s, w] = c.M, J = [54, 78], Aa = [14, 14], Bb = [94, 14];
  let g = conveyor(c, Aa, J, 14, g1, { dir: -1, roller: s, pitch: 9 }) + conveyor(c, Bb, J, 14, g1, { dir: -1, roller: s, pitch: 9 }) + conveyor(c, J, [54, 134], 16, g1, { dir: -1, roller: s, pitch: 9 });
  for (let k = 0; k < 3; k++) { for (const [S0, sgn] of [[Aa, 1], [Bb, -1]]) { const u = (((c.t * .08 + k / 3 + (sgn > 0 ? 0 : .15)) % 1) + 1) % 1, p = lerp(S0, J, u); g += crate(c, p[0] - 5 + sgn * 0, p[1] - 14, 10, 10, k % 2 ? M('cream') : w); } const u2 = (((c.t * .08 + k / 3) % 1) + 1) % 1, p2 = lerp(J, [54, 134], u2); g += crate(c, p2[0] - 6, p2[1] - 6, 12, 12, k % 2 ? w : M('cream')); }
  return g + wheel(c, 54, 78, 9, s, { spin: 1, spokes: 4 }); });

/* ======================= Z ======================= */
/* Z — a zip-line: two decks, a cable, a trolley and a basket */
define('Z', 100, ['wood', 'steel', 'red'], c => { const [w, s, r] = c.M, u = .5 + .5 * Math.sin(c.t * .9), A = [86, 26], B = [12, 126], p = lerp(A, B, .15 + .7 * u);
  let g = beam(c, [8, 20], [92, 20], 10, w) + solid(c, [[80, 24], [88, 24], [88, 56], [80, 56]], w, { w: 1.3, dk: .6, rim: false }) + beam(c, [4, 134], [78, 134], 10, w) + solid(c, [[10, 134], [20, 134], [20, 140], [10, 140]], w, { w: 1.2, dk: .4, rim: false });
  g += polyBar([A, B], 2.2, s.m, s.l);
  g += wheel(c, p[0], p[1] - 3, 5, s, { spin: 1, spokes: 3 }) + line2([p[0], p[1] + 2], [p[0], p[1] + 14], 1.4) + solid(c, [[p[0] - 8, p[1] + 14], [p[0] + 8, p[1] + 14], [p[0] + 6, p[1] + 28], [p[0] - 6, p[1] + 28]], r, { w: 1.3, dk: .6 });
  return g + hex(c, 86, 26, 4.5, 0, M('brass'), { dk: .4 }) + hex(c, 12, 126, 4.5, 0, M('brass'), { dk: .4 }); });

/* Z — a roller-coaster in a Z, with its supports */
define('Z', 100, ['blue', 'steel', 'red'], c => { const [b, s, r] = c.M, P = [[6, 24], [88, 24], [14, 128], [94, 128]], path = mkPath(P);
  let g = '';
  for (const x of [14, 46, 78]) g += girder(c, [x, 60], [x, 26], 6, b, { plates: false });
  for (const x of [30, 62, 88]) g += girder(c, [x, 140], [x, 130], 6, b, { plates: false });
  for (const q of path.samples(6)) g += line2(add(q.p, mul(q.n, -6)), add(q.p, mul(q.n, 6)), 2.4).replace(INK, M('wood').d);
  const off = a => path.samples(10).map(q => add(q.p, mul(q.n, a)));
  g += polyBar(off(-5), 2.4, s.m, s.l) + polyBar(off(5), 2.4, s.m, s.l);
  for (let k = 0; k < 2; k++) { const q = path.at(((c.t * 36 + k * 18) % path.L + path.L) % path.L), a = q.t, nn = [-a[1], a[0]], cp = q.p;
    g += solid(c, [add(add(cp, mul(a, -8)), mul(nn, -2)), add(add(cp, mul(a, 8)), mul(nn, -2)), add(add(cp, mul(a, 8)), mul(nn, -9)), add(add(cp, mul(a, -8)), mul(nn, -9))], k ? M('yellow') : r, { w: 1.2, dk: .5, rim: false }) + ball(c, cp[0] + nn[0] * -12, cp[1] + nn[1] * -12, 3, M('cream')); }
  return g; });


/*@@END8@@*/
/*@@PART7@@*/
/* ======================= v3 batch 3: N … S ======================= */
/* hourglass-profile tower (cooling tower / vase) */
function coolingTower(c, x, y0, y1, wTop, wMid, wBase, m) {
  const L = [], R = [], N = 14;
  for (let i = 0; i <= N; i++) { const u = i / N, y = y0 + (y1 - y0) * u, w = wMid + (wTop - wMid) * Math.pow(1 - u * 1.6 > 0 ? 1 - u * 1.6 : 0, 2) * (u < .62 ? 1 : 0) + (wBase - wMid) * Math.pow(Math.max(0, (u - .45) / .55), 2); L.push([x - w / 2, y]); R.push([x + w / 2, y]); }
  const poly = L.concat(R.reverse()); let s = solid(c, poly, m, { w: 1.6 });
  for (let i = 3; i < N; i += 2) { const u = i / N, y = y0 + (y1 - y0) * u; s += line2([L[i][0] + 1, y], [poly[poly.length - 1 - i][0] - 1, y], .5); }
  return s;
}
function loco(c, x, y, ang, k = 1) {
  const bounce = Math.sin(c.t * 14) * (c.on ? .6 : 0);
  let g = `<g transform="translate(${f(x)} ${f(y + bounce)}) rotate(${f(ang)}) scale(${k})">`;
  g += solid(c, [[-16, -2], [8, -2], [8, -13], [-16, -13]], M('blue'), { w: 1.3, dk: .4, rim: false }) + solid(c, [[8, -2], [18, -2], [18, -22], [8, -22]], M('red'), { w: 1.3, dk: .4, rim: false }) + solid(c, [[-14, -13], [-8, -13], [-9, -22], [-13, -22]], M('dark'), { w: 1.2, dk: .3, rim: false });
  g += `<circle cx="-2" cy="-14" r="3" fill="${MATS.brass.m}" stroke="${INK}" stroke-width="1"/>` + `<rect x="9.5" y="-19" width="6" height="5" fill="${GLASS}" stroke="${INK}" stroke-width=".8"/>`;
  for (const wx of [-10, -2, 12]) g += `<circle cx="${wx}" cy="1" r="3.8" fill="${MATS.dark.m}" stroke="${INK}" stroke-width="1.2"/><circle cx="${wx}" cy="1" r="1.2" fill="${MATS.steel.m}"/>`;
  g += `<path d="M-16 -1H-20L-17 -6Z" fill="${MATS.dark.m}" stroke="${INK}" stroke-width="1"/>`;
  return g + '</g>';
}

/* ======================= N ======================= */
/* N — two cooling towers and a steam pipe */
define('N', 108, ['tan', 'steel', 'red'], c => { const [t, s, r] = c.M;
  let g = coolingTower(c, 22, 20, 140, 22, 15, 30, t) + coolingTower(c, 88, 20, 140, 22, 15, 30, t);
  g += smoke(c, 24, 14, 34, 4) + smoke(c, 90, 14, 34, 4);
  return g + pipe(c, [[28, 36], [82, 126]], 7, r, { collars: [0, .35, .7, 1], collarMat: s }) + gauge(c, 56, 78, 6, c.t); });

/* N — two brick piers and a viaduct with a train climbing */
define('N', 112, ['brick', 'steel', 'dark'], c => { const [b, s, d] = c.M, u = (c.t * .08) % 1, A = [26, 30], B = [90, 128], dd = unit(sub(B, A)), nn = perp(dd), ang = Math.atan2(dd[1], dd[0]) * 180 / Math.PI;
  let g = solid(c, [[10, 140], [34, 140], [34, 14], [10, 14]], b, { w: 1.5 }) + solid(c, [[78, 140], [102, 140], [102, 14], [78, 14]], b, { w: 1.5 });
  for (const x of [22, 90]) g += solid(c, cat(seg([x - 14, 14], [x + 14, 14], 2)).concat([[x + 14, 8], [x - 14, 8]]), M('steel'), { w: 1.3, dk: .5, rim: false });
  for (const t of mkPath([A, B]).samples(9)) g += line2(add(t.p, mul(nn, -8)), add(t.p, mul(nn, 8)), 2.6).replace(INK, M('wood').d);
  g += polyBar([add(A, mul(nn, -5)), add(B, mul(nn, -5))], 2.4, s.m, s.l) + polyBar([add(A, mul(nn, 5)), add(B, mul(nn, 5))], 2.4, s.m, s.l);
  const p = add(A, mul(dd, len(sub(B, A)) * (.15 + .7 * u)));
  return g + loco(c, p[0] + nn[0] * -9, p[1] + nn[1] * -9, ang, .9) + (c.on ? smoke(c, p[0] + 6, p[1] - 22, 22, 3) : ''); });

/* ======================= O ======================= */
/* O — a record player: platter, vinyl, label and tonearm */
define('O', 122, ['dark', 'steel', 'red'], c => { const [d, s, r] = c.M, rot = c.on ? c.t * 120 : 20, cx = 58, cy = 80, R = 54;
  let g = solid(c, circ(cx, cy, R + 6, 36), M('wood'), { w: 1.6, dk: .8 }) + solid(c, circ(cx, cy, R, 36), d, { w: 1.5, dk: .5, rim: false });
  for (const rr of [47, 43, 39, 35, 31, 27, 23, 19]) g += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${MATS.dark.l}" stroke-width=".7" opacity=".75"/>`;
  g += `<path d="${pd([[cx, cy]].concat(arc(cx, cy, 50, 50, rot, rot + 34, 8)))}" fill="#fff" opacity=".2"/><path d="${pd([[cx, cy]].concat(arc(cx, cy, 50, 50, rot + 180, rot + 214, 8)))}" fill="#fff" opacity=".14"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="14" fill="${r.m}" stroke="${INK}" stroke-width="1.3"/><circle cx="${cx}" cy="${cy}" r="14" fill="url(#hatchL)" opacity=".3"/><circle cx="${cx}" cy="${cy}" r="3" fill="${MATS.cream.l}" stroke="${INK}" stroke-width=".8"/>`;
  const sw = c.on ? 3 * Math.sin(c.t * .6) : 0, P = [112, 128];
  g += pipe(c, [P, [84 + sw, 100 + sw * .5], [78 + sw, 96 + sw * .5]], 2.4, M('chrome'), { cap: 'round', ticks: false }) + solid(c, [[72 + sw, 92], [82 + sw, 92], [82 + sw, 101], [72 + sw, 101]], s, { w: 1.1, dk: .4, rim: false }) + gear(c, P[0], P[1], 8, 8, 0, M('brass'), { depth: .2, hubSize: 3 });
  return g + arrow(c, cx, cy, 62, 150, 240, M('orange')); });

/* O — a lifebuoy with its rope */
define('O', 122, ['red', 'cream', 'brown'], c => { const [r, cr, w] = c.M, cx = 61, cy = 78, Ro = 56, Ri = 30, sw = Math.sin(c.t * 1.4) * (c.on ? 2 : .8);
  let g = '';
  for (let i = 0; i < 8; i++) { const a0 = i * 45 - 22.5, a1 = a0 + 45, poly = arc(cx, cy, Ro, Ro, a0, a1, 8).concat(arc(cx, cy, Ri, Ri, a1, a0, 8)); g += solid(c, poly, i % 2 ? cr : r, { w: 1.3, dk: 1, rim: i % 2 === 0, notex: true }); }
  g += ink(pd(circ(cx, cy, Ro, 40)), 1.8) + ink(pd(circ(cx, cy, Ri, 40)), 1.5);
  const rope = [];
  for (let i = 0; i <= 40; i++) { const a = rad(-20 + i * 9.5); rope.push([cx + Math.cos(a) * (Ro - 7), cy + Math.sin(a) * (Ro - 7) + Math.sin(i * .5 + c.t * 2) * .6]); }
  g += polyBar(rope, 2, w.l, M('cream').l);
  for (const a0 of [20, 110, 200, 290]) { const a = rad(a0), p = [cx + Math.cos(a) * Ro, cy + Math.sin(a) * Ro]; g += hex(c, p[0], p[1], 4, 0, M('steel'), { dk: .4 }) + `<path d="M${f(p[0])} ${f(p[1])}q${f(Math.cos(a) * 10)} ${f(Math.sin(a) * 10 + 8 + sw)} ${f(Math.cos(a) * 4)} ${f(Math.sin(a) * 4 + 16)}" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M${f(p[0])} ${f(p[1])}q${f(Math.cos(a) * 10)} ${f(Math.sin(a) * 10 + 8 + sw)} ${f(Math.cos(a) * 4)} ${f(Math.sin(a) * 4 + 16)}" fill="none" stroke="${w.m}" stroke-width="1.2"/>`; }
  return g; });

/* O — a ship's porthole with a fish behind the glass */
define('O', 122, ['brass', 'blue', 'steel'], c => { const [br, b, s] = c.M, cx = 61, cy = 78, fx = 61 + 16 * Math.sin(c.t * .9), bub = k => ((c.t * .5 + k * .33) % 1);
  let g = `<circle cx="${cx}" cy="${cy}" r="42" fill="${b.m}"/><circle cx="${cx}" cy="${cy}" r="42" fill="url(#hatchL)" opacity=".25"/>`;
  g += `<path d="M20 ${f(cy + 14)}Q40 ${f(cy + 8)} 61 ${f(cy + 14)}T102 ${f(cy + 14)}V130H20Z" fill="${b.d}" opacity=".5"/>`;
  g += fish(c, fx, cy - 4, 9, M('orange'), Math.cos(c.t * .9) > 0 ? 1 : -1) + fish(c, 82 - 14 * Math.sin(c.t * .7), cy + 18, 5, M('yellow'), -1);
  for (let k = 0; k < 3; k++) g += `<circle cx="${f(44 + k * 12)}" cy="${f(cy + 30 - bub(k) * 56)}" r="${f(1.6 + k * .5)}" fill="#fff" fill-opacity=".6" stroke="${INK}" stroke-width=".6"/>`;
  g += `<path d="M30 ${cy - 22}A34 34 0 0 1 52 ${cy - 40}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  g += solid(c, ribbon(mkPath(circ(cx, cy, 50, 44).concat([[cx + 50, cy]])), -9, 9, 3), br, { w: 1.6 });
  for (let i = 0; i < 12; i++) { const a = rad(i * 30 + 10), p = [cx + Math.cos(a) * 50, cy + Math.sin(a) * 50]; g += hex(c, p[0], p[1], 3.4, i * 15, s, { dk: .5 }); }
  return g + solid(c, [[cx + 40, cy - 6], [cx + 66, cy - 6], [cx + 66, cy + 6], [cx + 40, cy + 6]], br, { w: 1.3, dk: .7 }) + wheel(c, cx + 62, cy, 5, M('red'), { spin: 1, spokes: 3 }); });

/* ======================= P ======================= */
/* P — an old brass key: the bow makes the bowl */
define('P', 100, ['brass', 'steel', 'red'], c => { const [br, s, r] = c.M, sw = c.on ? 4 * Math.sin(c.t * 2) : 0;
  let g = '';
  const bow = arc(66, 42, 26, 26, 0, 360, 40);
  g += solid(c, circ(66, 42, 31, 40), br, { w: 1.6, holes: [circ(66, 42, 19, 24).reverse()] });
  for (let i = 0; i < 8; i++) { const a = rad(i * 45 + 22), p = [66 + Math.cos(a) * 25, 42 + Math.sin(a) * 25]; g += hex(c, p[0], p[1], 1.8, 0, M('steel'), { dk: .2 }); }
  g += solid(c, [[14, 12], [34, 12], [34, 140], [14, 140]], br, { w: 1.5 });
  for (const y of [20, 28]) g += solid(c, [[10, y], [38, y], [38, y + 4], [10, y + 4]], br, { w: 1.1, dk: .5, rim: false });
  for (const [y, w2] of [[104, 26], [114, 18], [124, 30], [134, 20]]) g += solid(c, [[34, y], [34 + w2, y], [34 + w2, y + 7], [34, y + 7]], br, { w: 1.2, dk: .6 });
  return g + `<circle cx="24" cy="${f(60 + sw)}" r="3.2" fill="${MATS.dark.m}" stroke="${INK}" stroke-width="1"/>` + line2([24, 70], [24, 96], .8); });

/* P — a frying pan with its egg */
define('P', 104, ['dark', 'steel', 'yellow'], c => { const [d, s, y] = c.M, sz = c.on ? Math.sin(c.t * 6) * .8 : 0;
  let g = solid(c, [[17, 140], [31, 140], [30, 56], [18, 56]], M('wood'), { w: 1.5 }) + beam(c, [24, 52], [24, 50], 22, s, { rivets: true });
  g += `<g transform="translate(${f(sz)} 0)">` + solid(c, circ(66, 40, 36, 40), d, { w: 1.7, dk: 1 }) + `<circle cx="66" cy="40" r="29" fill="${MATS.dark.m}" stroke="${INK}" stroke-width="1.2"/><circle cx="66" cy="40" r="29" fill="url(#hatchL)" opacity=".3"/>`;
  g += `<path d="M48 36Q50 24 62 22Q72 14 82 24Q94 28 88 42Q92 54 78 56Q66 62 56 54Q44 50 48 36Z" fill="#fffdf2" stroke="${INK}" stroke-width="1.3"/>` + `<circle cx="68" cy="40" r="9" fill="${y.m}" stroke="${INK}" stroke-width="1.2"/><circle cx="65" cy="37" r="3" fill="${y.l}"/>`;
  g += `<path d="M44 20Q40 28 42 36" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".5"/></g>`;
  if (c.on) for (let k = 0; k < 4; k++) { const u = (c.t * .6 + k / 4) % 1; g += `<circle cx="${f(54 + k * 9)}" cy="${f(6 - 18 * u)}" r="${f(2 + 4 * u)}" fill="#fff" stroke="${INK}" stroke-width=".7" opacity="${f(.9 * (1 - u))}"/>`; }
  return g + hex(c, 24, 130, 3, 0, s, { dk: .3 }); });

/* ======================= Q ======================= */
/* Q — a stopwatch with its lanyard as the tail */
define('Q', 124, ['steel', 'cream', 'red'], c => { const [s, cr, r] = c.M, cx = 58, cy = 82, R = 50, ang = c.on ? (c.t * 60) % 360 : 40;
  let g = solid(c, [[cx - 8, 22], [cx + 8, 22], [cx + 8, 10], [cx - 8, 10]], s, { w: 1.4, dk: .6 }) + solid(c, [[cx - 12, 10], [cx + 12, 10], [cx + 12, 2], [cx - 12, 2]], r, { w: 1.4, dk: .7 });
  g += solid(c, [[cx + 28, 40], [cx + 38, 34], [cx + 43, 40], [cx + 33, 48]], s, { w: 1.2, dk: .6, rim: false });
  g += solid(c, circ(cx, cy, R, 40), s, { w: 1.7, dk: 1.1 }) + `<circle cx="${cx}" cy="${cy}" r="42" fill="${cr.l}" stroke="${INK}" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="42" fill="url(#hatchL)" opacity=".15"/>`;
  for (let i = 0; i < 60; i++) { const a = rad(i * 6 - 90), long = i % 5 === 0; g += line2([cx + Math.cos(a) * (long ? 34 : 38), cy + Math.sin(a) * (long ? 34 : 38)], [cx + Math.cos(a) * 41, cy + Math.sin(a) * 41], long ? 1.3 : .6); }
  g += `<path d="${pd([[cx, cy]].concat(arc(cx, cy, 36, 36, -90, -90 + ang, 14)))}" fill="${r.m}" opacity=".35"/>`;
  const a2 = rad(ang - 90); g += bar([cx, cy], [cx + Math.cos(a2) * 36, cy + Math.sin(a2) * 36], 1.8, MATS.red.d, null) + `<circle cx="${cx}" cy="${cy}" r="3.4" fill="${MATS.dark.m}" stroke="${INK}" stroke-width="1"/>`;
  const cord = cat(seg([cx + 36, cy + 34], [cx + 46, cy + 46], 3), arc(cx + 50, cy + 52, 8, 8, 200, 80, 8), seg([cx + 54, cy + 60], [cx + 66, cy + 54], 3));
  return g + pipe(c, [[cx + 34, cy + 36], [102, 118], [112, 140]], 2.4, r, { cap: 'round', ticks: false }) + ball(c, 112, 140, 4, M('brass')); });

/* ======================= R ======================= */
/* R — a ratchet spanner: head for the bowl, extension for the leg */
define('R', 104, ['steel', 'blue', 'brass'], c => { const [s, b, br] = c.M, tw = c.on ? c.t * 60 : 10;
  let g = taper(c, [20, 140], [20, 22], 14, 12, s, { w: 1.5 });
  for (let y = 36; y < 136; y += 5) g += line2([14, y], [26, y], .6);
  g += solid(c, circ(58, 40, 30, 36), s, { w: 1.6, holes: [circ(58, 40, 14, 20).reverse()] }) + beam(c, [26, 40], [30, 40], 12, s, { rivets: false });
  g += gear(c, 58, 40, 20, 18, 1, br, { hole: .5, depth: .1, hub: false, w: 1.1, dk: .5 });
  g += taper(c, [44, 76], [90, 132], 11, 9, b, { w: 1.5 }) + hex(c, 92, 134, 10, 0, s, { dk: .8 }) + hex(c, 92, 134, 5, 0, M('dark'), { dk: .2 });
  return g + arrow(c, 58, 40, 36, 300, 30, M('red')); });

/* R — a radar dish on its mast */
define('R', 106, ['teal', 'steel', 'red'], c => { const [t, s, r] = c.M, a = c.on ? 22 * Math.sin(c.t * 1.2) : -16;
  let g = girder(c, [20, 12], [20, 140], 15, s) + girder(c, [46, 80], [90, 138], 13, s);
  g += `<g transform="rotate(${f(a)} 66 42)">` + `<ellipse cx="70" cy="42" rx="14" ry="32" fill="${t.d}" stroke="${INK}" stroke-width="1.6"/>` + `<ellipse cx="66" cy="42" rx="14" ry="32" fill="${t.m}" stroke="${INK}" stroke-width="1.6"/><ellipse cx="64" cy="42" rx="9" ry="25" fill="${t.l}" stroke="${INK}" stroke-width="1"/>`;
  g += `<path d="M64 17V67M54 42H74" stroke="${INK}" stroke-width=".7" opacity=".6"/>` + bar([66, 42], [100, 42], 2, s.m, s.l) + `<circle cx="100" cy="42" r="3" fill="${r.m}" stroke="${INK}" stroke-width="1"/></g>`;
  return g + pipe(c, [[26, 42], [56, 42]], 3, s, { ticks: false }) + hex(c, 26, 42, 5, 0, M('brass'), { dk: .5 }) + gear(c, 46, 80, 7, 8, 1, M('brass'), { depth: .2, hubSize: 2.6 }); });

/* ======================= S ======================= */
/* S — a coil spring bent into an S */
define('S', 92, ['steel', 'blue', 'red'], c => { const [s, b, r] = c.M, k = c.on ? 1 + .06 * Math.sin(c.t * 5) : 1;
  const pts = cat(arc(46, 45, 28, 31, -35, -270, 40), arc(46, 107, 30, 31, -90, 148, 40)), path = mkPath(pts), N = 130, coil = [];
  for (let i = 0; i <= N; i++) { const u = i / N, q = path.at(path.L * u), th = u * 22 * 2 * Math.PI; coil.push(add(add(q.p, mul(q.n, Math.sin(th) * 8 * k)), mul(q.t, Math.cos(th) * 3))); }
  const dd = pd(coil, false);
  let g = `<path d="${dd}" fill="none" stroke="${INK}" stroke-width="6.6" stroke-linejoin="round" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${s.d}" stroke-width="4.4" stroke-linejoin="round" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${s.m}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${s.l}" stroke-width="1.2" stroke-linejoin="round" transform="translate(-.8 -.8)"/>`;
  const e0 = pts[0], e1 = pts[pts.length - 1];
  return g + ball(c, e0[0] + 2, e0[1] - 3, 6, r) + ball(c, e1[0] - 2, e1[1] + 3, 6, b); });

/* S — a cable with a plug at one end, a socket at the other, and sparks */
define('S', 92, ['dark', 'red', 'steel'], c => { const [d, r, s] = c.M, sp = c.on && Math.sin(c.t * 22) > 0;
  const pts = cat(arc(46, 45, 28, 31, -35, -270, 40), arc(46, 107, 30, 31, -90, 148, 40)), e0 = pts[0], e1 = pts[pts.length - 1];
  let g = pipe(c, pts, 5, d, { cap: 'round', ticks: false }) + '<path d="' + pd(pts, false) + '" fill="none" stroke="' + MATS.red.m + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
  g += solid(c, [[e0[0] + 2, e0[1] - 12], [e0[0] + 18, e0[1] - 2], [e0[0] + 10, e0[1] + 8], [e0[0] - 4, e0[1] - 2]], r, { w: 1.4, dk: .8 }) + line2([e0[0] + 14, e0[1] - 12], [e0[0] + 22, e0[1] - 8], 1.6) + line2([e0[0] + 18, e0[1] - 8], [e0[0] + 26, e0[1] - 4], 1.6);
  g += solid(c, [[e1[0] - 10, e1[1] + 2], [e1[0] + 10, e1[1] + 2], [e1[0] + 10, e1[1] + 16], [e1[0] - 10, e1[1] + 16]], s, { w: 1.4, dk: .8 }) + `<circle cx="${f(e1[0] - 4)}" cy="${f(e1[1] + 9)}" r="2" fill="${INK}"/><circle cx="${f(e1[0] + 4)}" cy="${f(e1[1] + 9)}" r="2" fill="${INK}"/>`;
  if (sp) g += `<path d="M${f(e0[0] + 26)} ${f(e0[1] - 4)}l4 -5l-1 4l5 -2l-3 5l4 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M${f(e0[0] + 26)} ${f(e0[1] - 4)}l4 -5l-1 4l5 -2l-3 5l4 0" fill="none" stroke="#fff4a0" stroke-width="1.4" stroke-linejoin="round"/>`;
  return g; });


/*@@END7@@*/
/*@@PART6@@*/
/* ======================= v3 batch 2: G … M ======================= */
function fish(c, x, y, sz, m, flip = 1) {
  const t = Math.sin(c.t * 5) * 2;
  const body = `M${f(x - flip * sz)} ${f(y)}Q${f(x)} ${f(y - sz * .8)} ${f(x + flip * sz)} ${f(y)}Q${f(x)} ${f(y + sz * .8)} ${f(x - flip * sz)} ${f(y)}Z`;
  return fillp(body, m.m, `stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"`) + fillp(`M${f(x + flip * sz)} ${f(y)}L${f(x + flip * (sz + 6))} ${f(y - 5 + t)}L${f(x + flip * (sz + 6))} ${f(y + 5 + t)}Z`, m.d, `stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`)
    + fillp(`M${f(x - flip * sz * .6)} ${f(y - sz * .12)}Q${f(x)} ${f(y - sz * .7)} ${f(x + flip * sz * .5)} ${f(y - sz * .1)}Z`, m.l, 'opacity=".8"') + `<circle cx="${f(x - flip * sz * .55)}" cy="${f(y - 1)}" r="1.5" fill="${INK}"/>`;
}
function tower2(c, x, y0, y1, w0, w1, m) { return solid(c, [[x - w0 / 2, y1], [x + w0 / 2, y1], [x + w1 / 2, y0], [x - w1 / 2, y0]], m, { w: 1.5 }); }
function mountain(c, pts, m, snow) {
  let s = solid(c, pts, m, { w: 1.6, dk: .6 });
  if (snow) { const [a, b, d] = snow; s += fillp(pd([a, b, d]), '#f6f6f2', `stroke="${INK}" stroke-width="1" stroke-linejoin="round"`) + fillp(pd([a, b, d]), 'url(#hatchL)', 'opacity=".3"'); }
  return s;
}
function cabin(c, x, y, w, h, m) {
  let s = line2([x, y - 14], [x, y], 1.4) + solid(c, [[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 2, y + h], [x - w / 2 + 2, y + h]], m, { w: 1.3, dk: .6, rim: false });
  for (const k of [-1, 1]) s += `<rect x="${f(x + k * w * .22 - 3)}" y="${f(y + 4)}" width="6" height="${f(h * .4)}" fill="${GLASS}" stroke="${INK}" stroke-width=".8"/>`;
  return s;
}

/* ======================= G ======================= */
/* G — a pressure gauge: bezel, dial and needle */
define('G', 112, ['brass', 'cream', 'red'], c => { const [br, cr, r] = c.M, cx = 54, cy = 77, ang = c.on ? 25 * Math.sin(c.t * 2.4) : 12;
  let g = `<circle cx="${cx}" cy="${cy}" r="47" fill="${cr.l}" stroke="${INK}" stroke-width="1.3"/><circle cx="${cx}" cy="${cy}" r="47" fill="url(#hatchL)" opacity=".18"/>`;
  for (let i = 0; i <= 24; i++) { const a = rad(-40 + i * 11.3 * 1), long = i % 4 === 0, r0 = long ? 34 : 38; g += line2([cx + Math.cos(a - Math.PI) * r0, cy + Math.sin(a - Math.PI) * r0], [cx + Math.cos(a - Math.PI) * 43, cy + Math.sin(a - Math.PI) * 43], long ? 1.5 : .8); }
  g += fillp(pd(arc(cx, cy, 36, 36, 120, 190, 8).concat(arc(cx, cy, 43, 43, 190, 120, 8))), r.m, 'opacity=".7"');
  const bez = mkPath(arc(cx, cy, 47, 47, -34, -330, 60));
  g += solid(c, ribbon(bez, -6, 6, 3), br, { w: 1.6 });
  g += `<g transform="rotate(${f(ang)} ${cx} ${cy})">` + solid(c, [[cx - 12, cy - 2.5], [cx + 44, cy - 1], [cx + 44, cy + 1], [cx - 12, cy + 2.5]], M('dark'), { w: 1.2, dk: .5, rim: false }) + `</g>`;
  return g + gear(c, cx, cy, 8, 8, 0, br, { depth: .2, hubSize: 3.5 }) + arrow(c, cx, cy, 52, 190, 255, M('orange')); });

/* G — a toothed ring turned by a hand crank */
define('G', 112, ['green', 'steel', 'brown'], c => { const [g1, s, w] = c.M, th = rad(c.on ? c.t * 140 : 40), hp = [102 + 10 * Math.cos(th) * .0, 90];
  const path = mkPath(arc(54, 77, 42, 59, -42, -338, 70)), cr = [92 + 8 * Math.cos(th), 86 + 8 * Math.sin(th)];
  let g = solid(c, toothRibbon(path, 6, -6, 4.5, 8.5), g1, { w: 1.4 });
  g += gear(c, 88, 90, 9, 8, -1, s, { depth: .22, hubSize: 3 });
  g += bar([88, 90], cr, 3.4, s.m, s.l) + solid(c, [[cr[0] - 3, cr[1] - 8], [cr[0] + 3, cr[1] - 8], [cr[0] + 3, cr[1] + 3], [cr[0] - 3, cr[1] + 3]], w, { w: 1.1, dk: .4, rim: false });
  return g + beam(c, [60, 90], [80, 90], 8, s, { rivets: false }) + hex(c, 60, 90, 6, 0, s, { dk: .4 }); });

/* ======================= H ======================= */
/* H — a hydraulic press squashing a crate */
define('H', 104, ['blue', 'steel', 'orange'], c => { const [b, s, o] = c.M, k = c.on ? .5 + .5 * Math.sin(c.t * 2.4) : .3, plY = 46 + 22 * k;
  let g = girder(c, [20, 12], [20, 140], 16, b) + girder(c, [84, 12], [84, 140], 16, b);
  g += crate(c, 40, 118 - 28 * (1 - .42 * k) , 24, 28 * (1 - .42 * k), M('wood'));
  g += beam(c, [28, plY], [76, plY], 9, s) + pipe(c, [[52, 10], [52, plY - 4]], 8, o, { collars: [.15, .5] }) + pipe(c, [[52, 4], [52, 14]], 11, s, { ticks: false }) + gauge(c, 66, 20, 7, c.t);
  return g + beam(c, [28, 138], [76, 138], 8, s, { rivets: true }); });

/* H — two pylons and a cable car */
define('H', 108, ['red', 'steel', 'yellow'], c => { const [r, s, y] = c.M, u = .5 + .5 * Math.sin(c.t * .9), x = 36 + 40 * u;
  let g = girder(c, [20, 12], [20, 140], 14, r) + girder(c, [88, 12], [88, 140], 14, r);
  g += polyBar([[26, 66], [x, 70], [82, 66]], 3, s.m, s.l) + wheel(c, 24, 22, 7, s, { spin: 1, spokes: 3 }) + wheel(c, 84, 22, 7, s, { spin: -1, spokes: 3 });
  g += line2([x - 10, 69], [x - 6, 78], 1.2) + line2([x + 10, 69], [x + 6, 78], 1.2) + cabin(c, x, 78, 28, 22, y) + wheel(c, x, 70, 3.4, s, { spin: 1, spokes: 3 });
  return g + beam(c, [26, 136], [82, 136], 7, M('dark'), { rivets: false }); });

/* ======================= I ======================= */
/* I — a lighthouse sweeping its beam */
define('I', 64, ['red', 'cream', 'yellow'], c => { const [r, cr, y] = c.M, a = Math.sin(c.t * 1.2) * 12 + (c.on ? 0 : 12);
  let g = rays([[32, 22], [-34, 4 + a], [-34, 30 + a]], .55) + rays([[32, 22], [98, 8 - a], [98, 34 - a]], .55);
  g += solid(c, [[10, 140], [54, 140], [48, 128], [16, 128]], M('dark'), { w: 1.4, dk: .8 });
  g += tower2(c, 32, 40, 130, 28, 18, cr);
  for (const yy of [56, 84, 112]) { const wl = 18 + (yy - 40) / 90 * 10; g += solid(c, [[32 - wl / 2, yy], [32 + wl / 2, yy], [32 + wl / 2 - .6, yy + 14], [32 - wl / 2 + .6, yy + 14]], r, { w: 1, dk: .4, rim: false, notex: true }); }
  g += solid(c, [[14, 40], [50, 40], [48, 34], [16, 34]], M('dark'), { w: 1.4, dk: .6 }) + `<rect x="21" y="22" width="22" height="12" fill="#fbeea6" stroke="${INK}" stroke-width="1.4"/>` + solid(c, [[20, 22], [44, 22], [32, 6]], r, { w: 1.4, dk: .7 }) + ball(c, 32, 4, 3, M('brass'));
  return g + `<rect x="28" y="96" width="8" height="12" fill="${MATS.dark.m}" stroke="${INK}" stroke-width="1"/>`; });

/* I — a thermometer with mercury rising */
define('I', 56, ['red', 'chrome', 'cream'], c => { const [r, ch, cr] = c.M, lv = 100 - 56 * (.5 + .5 * Math.sin(c.t * 1.4));
  let g = `<rect x="19" y="14" width="18" height="102" rx="9" fill="${GLASS}" fill-opacity=".45" stroke="${INK}" stroke-width="1.6"/>` + `<circle cx="28" cy="124" r="16" fill="${GLASS}" fill-opacity=".45" stroke="${INK}" stroke-width="1.6"/>`;
  g += `<rect x="24" y="${f(lv)}" width="8" height="${f(118 - lv)}" fill="${r.m}" stroke="${INK}" stroke-width=".8"/><circle cx="28" cy="124" r="11" fill="${r.m}" stroke="${INK}" stroke-width=".8"/><circle cx="25" cy="121" r="3.4" fill="${r.l}"/>`;
  for (let y = 22; y < 108; y += 6) g += line2([37, y], [y % 12 === 4 ? 48 : 43, y], y % 12 === 4 ? 1.2 : .8);
  g += `<path d="M22 22V110" stroke="#fff" stroke-width="2" opacity=".7" stroke-linecap="round"/>` + solid(c, [[16, 10], [40, 10], [38, 18], [18, 18]], ch, { w: 1.3, dk: .5 });
  return g + solid(c, [[16, 108], [40, 108], [42, 114], [14, 114]], ch, { w: 1.2, dk: .5, rim: false }); });

/* ======================= J ======================= */
/* J — a fishing rod, a float, a hook and a curious fish */
define('J', 80, ['red', 'steel', 'blue'], c => { const [r, s, b] = c.M, bob = Math.sin(c.t * 2.2) * (c.on ? 2.4 : 1);
  let g = `<path d="M-4 110Q10 106 22 110T46 110T70 110T84 110" fill="none" stroke="${b.m}" stroke-width="2" opacity=".8" stroke-linecap="round"/><path d="M4 118Q16 115 28 118T52 118" fill="none" stroke="${b.m}" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>`;
  g += bar([2, 30], [52, 4], 3.2, MATS.wood.m, MATS.wood.l) + wheel(c, 14, 28, 4, s, { spin: 1, spokes: 3 });
  g += `<path d="M52 4L52 ${f(66 + bob)}M52 ${f(78 + bob)}L52 96" fill="none" stroke="${INK}" stroke-width="1.5"/>` + `<ellipse cx="52" cy="${f(72 + bob)}" rx="5.5" ry="7.5" fill="${r.m}" stroke="${INK}" stroke-width="1.4"/><path d="M46.7 ${f(72 + bob)}h10.6" stroke="#fff" stroke-width="3"/><ellipse cx="50.4" cy="${f(69 + bob)}" rx="1.4" ry="2.4" fill="#fff" opacity=".8"/>`;
  g += pipe(c, cat(seg([52, 96], [52, 112], 4), arc(40, 112, 12, 14, 0, 160, 14)), 2.1, s, { cap: 'round', ticks: false }) + cone(c, [29, 118], [-.3, -1], 8, 4, s, { dk: .2 });
  return g + fish(c, 22, 122 + bob, 8, M('orange'), 1); });

/* ======================= K ======================= */
/* K — pliers: one handle for the spine, two jaws that bite */
define('K', 100, ['red', 'steel', 'brass'], c => { const [r, s, br] = c.M, k = c.on ? Math.sin(c.t * 3) * 4 : 0, P = [24, 78];
  let g = taper(c, [20, 140], [24, 70], 15, 11, r, { w: 1.5 }) + taper(c, [24, 70], [20, 14], 11, 15, r, { w: 1.5 });
  for (let y = 84; y < 138; y += 6) g += line2([14, y], [27, y + 1], .8);
  for (let y = 18; y < 64; y += 6) g += line2([14, y], [27, y - 1], .8);
  g += taper(c, P, [86, 18 + k], 12, 7, s, { w: 1.5 }) + taper(c, P, [88, 134 - k], 12, 7, s, { w: 1.5 });
  for (const [e, sg] of [[[86, 18 + k], -1], [[88, 134 - k], 1]]) for (let t = 0; t < 4; t++) g += line2([e[0] - 10 + t * 3, e[1] + sg * 3.2], [e[0] - 8 + t * 3, e[1] + sg * 1], .8);
  return g + hex(c, P[0], P[1], 8, 0, br, { dk: .8 }) + gear(c, P[0], P[1], 4, 6, 0, s, { depth: .2, hub: false }); });

/* K — two springs and two weights */
define('K', 100, ['olive', 'steel', 'red'], c => { const [o, s, r] = c.M, k = Math.sin(c.t * 4) * (c.on ? 3 : 0);
  let g = girder(c, [20, 12], [20, 140], 15, o);
  g += spring(c, [28, 74], [78, 24 - k], 8, 8, s) + ball(c, 86, 18 - k, 9, r) + spring(c, [28, 80], [78, 130 + k], 8, 8, s) + ball(c, 86, 136 + k, 9, M('blue'));
  return g + hex(c, 26, 77, 7, 0, M('brass'), { dk: .8 }); });

/* ======================= L ======================= */
/* L — a desk lamp on its jointed arm */
define('L', 96, ['green', 'steel', 'yellow'], c => { const [g1, s, y] = c.M, w = c.on ? 1 : .6;
  let g = solid(c, [[14, 140], [68, 140], [64, 128], [18, 128]], g1, { w: 1.5, dk: .8 });
  g += pipe(c, [[30, 130], [26, 72]], 3.6, s, { collars: [0, 1] }) + spring(c, [26, 100], [26, 80], 5, 4, M('steel')) + pipe(c, [[26, 72], [32, 26]], 3.6, s, { collars: [1] });
  g += hex(c, 26, 72, 6, 0, M('brass'), { dk: .6 }) + hex(c, 32, 26, 5, 0, M('brass'), { dk: .6 });
  g += rays([[48, 22], [90, 10], [92, 60]], .5 * w);
  g += solid(c, [[32, 26], [58, 6], [64, 22], [38, 36]], y, { w: 1.5, dk: .8 }) + bulb(c, 52, 30, 7, { rot: 120, glow: c.on ? 1 : .6 });
  return g; });

/* L — a front loader: boom and scoop full of rubble */
define('L', 100, ['orange', 'steel', 'dark'], c => { const [o, s, d] = c.M, tilt = c.on ? 6 * Math.sin(c.t * 2) : 0;
  let g = girder(c, [22, 12], [22, 132], 15, o) + wheel(c, 40, 128, 14, d, { spin: 1, spokes: 5 }) + wheel(c, 78, 128, 14, d, { spin: 1, spokes: 5 });
  g += ram(c, [30, 100], [60, 66], 5, s, { split: .5 });
  g += `<g transform="rotate(${f(tilt)} 30 112)">` + solid(c, [[26, 112], [90, 112], [96, 98], [72, 98], [30, 104]], M('steel'), { w: 1.5 }) + [38, 52, 66, 80].map(x => cone(c, [x, 112], [0, 1], 8, 7, M('steel'), { dk: .3 })).join('') + '</g>';
  for (let k = 0; k < 5; k++) g += ball(c, 46 + k * 9, 94 - (k % 2) * 4, 5, M('brown'));
  return g; });

/* ======================= M ======================= */
/* M — two snowy peaks with a cable car between */
define('M', 128, ['brown', 'cream', 'red'], c => { const [b, cr, r] = c.M, u = .5 + .5 * Math.sin(c.t * .8), px = 36 + 56 * u;
  let g = mountain(c, [[6, 140], [36, 14], [64, 98], [92, 14], [122, 140], [100, 140], [92, 60], [70, 136], [58, 136], [36, 60], [28, 140]], b, null);
  g += fillp(pd([[36, 14], [24, 50], [34, 44], [40, 54], [48, 40]]), '#f7f7f2', `stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`) + fillp(pd([[92, 14], [80, 48], [90, 42], [96, 54], [104, 40]]), '#f7f7f2', `stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`);
  const y0 = 28, y1 = 28, sag = 28;
  g += polyBar([[38, y0], [px, 30 + sag * Math.sin(Math.PI * (px - 38) / 54)], [90, y1]], 2.2, M('steel').m, M('steel').l);
  const py = 30 + sag * Math.sin(Math.PI * (px - 38) / 54);
  return g + cabin(c, px, py + 14, 22, 16, r) + wheel(c, px, py + 2, 3.2, M('steel'), { spin: 1, spokes: 3 }); });

/* M — a Roman aqueduct */
define('M', 128, ['brick', 'blue', 'steel'], c => { const [b, w, s] = c.M;
  let g = '';
  const pil = x => solid(c, [[x - 11, 140], [x + 11, 140], [x + 11, 40], [x - 11, 40]], b, { w: 1.5 });
  g += pil(20) + pil(64) + pil(108);
  for (const x0 of [20, 64]) { const ar = cat(arc(x0 + 22, 92, 22, 28, 180, 360, 14)), outer = ar.concat(arc(x0 + 22, 92, 32, 40, 360, 180, 14)); g += solid(c, outer, b, { w: 1.4, dk: .6 }); }
  g += solid(c, [[6, 40], [122, 40], [122, 28], [6, 28]], b, { w: 1.5 }) + `<path d="M8 36H120" stroke="${w.m}" stroke-width="5"/>`;
  for (let k = 0; k < 9; k++) { const u = (c.t * .4 + k / 9) % 1; g += `<ellipse cx="${f(10 + 108 * u)}" cy="33" rx="3.4" ry="2" fill="${w.l}" stroke="${INK}" stroke-width=".7"/>`; }
  return g + `<path d="M12 36H116" stroke="${w.l}" stroke-width="1.6" opacity=".8" transform="translate(0 -1.6)"/>`; });


/*@@END6@@*/
/*@@PART5@@*/
/* ======================= v3 parts: loops, tools, cloth ======================= */
/* closed belt path hugging several rollers (centres in clockwise order on screen) */
function roundedLoop(cs, rs) {
  const n = cs.length, seg2 = [];
  for (let i = 0; i < n; i++) {
    const c1 = cs[i], c2 = cs[(i + 1) % n], r1 = rs[i], r2 = rs[(i + 1) % n], dv = sub(c2, c1), L = len(dv), d = unit(dv), sn = (r1 - r2) / L;
    const nrm = add(mul(d, sn), mul(perp(d), -Math.sqrt(Math.max(0, 1 - sn * sn))));
    seg2.push([add(c1, mul(nrm, r1)), add(c2, mul(nrm, r2))]);
  }
  let pts = [];
  for (let i = 0; i < n; i++) {
    const prev = seg2[(i - 1 + n) % n], cur = seg2[i], c0 = cs[i], r0 = rs[i];
    let a0 = Math.atan2(prev[1][1] - c0[1], prev[1][0] - c0[0]), a1 = Math.atan2(cur[0][1] - c0[1], cur[0][0] - c0[0]);
    while (a1 < a0) a1 += Math.PI * 2;
    pts = pts.concat(arc(c0[0], c0[1], r0, r0, a0 * 180 / Math.PI, a1 * 180 / Math.PI, 8));
  }
  return pts;
}
/* belt over rollers: tube-like belt + cleats + roller discs */
function beltOver(c, cs, rs, m, o = {}) {
  const loop = roundedLoop(cs, rs), path = mkPath(loop, true), w = o.w || 7, dir = o.dir == null ? 1 : o.dir, sp = o.pitch || 8, off = ((dir * c.t * 16) % sp + sp) % sp, d = pd(loop);
  let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(w + 2.6)}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${m.d}" stroke-width="${w}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${m.m}" stroke-width="${f(w * .7)}" stroke-linejoin="round" transform="translate(-.6 -.6)"/><path d="${d}" fill="none" stroke="${m.l}" stroke-width="${f(w * .28)}" stroke-linejoin="round" transform="translate(-1.2 -1.2)"/>`;
  let cl = ''; for (let t = off; t < path.L; t += sp) { const q = path.at(t); cl += 'M' + f(q.p[0] + q.n[0] * w * .5) + ' ' + f(q.p[1] + q.n[1] * w * .5) + 'L' + f(q.p[0] - q.n[0] * w * .5) + ' ' + f(q.p[1] - q.n[1] * w * .5); }
  s += ink(cl, .8, 'opacity=".75"');
  cs.forEach((p, i) => { s += wheel(c, p[0], p[1], Math.max(4, rs[i] - w * .55), o.roller || M('steel'), { spin: dir, spokes: 3 }); });
  return s;
}
/* a tapering limb between two points, w0 wide at a, w1 at b */
function taper(c, a, b, w0, w1, m, o = {}) { const d = unit(sub(b, a)), n = perp(d); return solid(c, [add(a, mul(n, w0 / 2)), add(b, mul(n, w1 / 2)), sub(b, mul(n, w1 / 2)), sub(a, mul(n, w0 / 2))], m, o); }
function cone(c, p, dir, len, wid, m, o = {}) { const d = unit(dir), n = perp(d); return solid(c, [add(p, mul(n, wid / 2)), add(p, mul(d, len)), sub(p, mul(n, wid / 2))], m, Object.assign({ w: 1.1, dk: .5 }, o)); }
function candle(c, x, y, h, m, o = {}) {
  const fl = c.on ? 1 : .8;
  return solid(c, [[x - 4, y], [x + 4, y], [x + 4, y - h], [x - 4, y - h]], m, { w: 1.2, dk: .6 }) + `<path d="M${x - 3} ${y - h + 4}q1.5 3 3 1q1.5 3 3 -1" fill="none" stroke="${m.m}" stroke-width=".9"/>` + line2([x, y - h], [x, y - h - 2.5], 1)
    + flame(c, x, y - h - 2, 6, 11 * fl, x);
}
function drum(c, cx, cy, R, m, o = {}) {
  let s = solid(c, circ(cx, cy, R, 30), m, { w: 1.6, dk: 1.1 });
  s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * .86)}" fill="${MATS.cream.l}" stroke="${INK}" stroke-width="1.3"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * .86)}" fill="url(#hatchL)" opacity=".28"/>`;
  for (let i = 0; i < 10; i++) { const a = rad(i * 36 + 8), p = [cx + Math.cos(a) * R * .93, cy + Math.sin(a) * R * .93]; s += hex(c, p[0], p[1], 2.4, 0, M('steel'), { dk: .3 }); }
  return s;
}
function screwdriver(c, a, b, hm, o = {}) {
  const d = unit(sub(b, a)), n = perp(d), L = len(sub(b, a)), hl = L * .36;
  let s = pipe(c, [add(a, mul(d, hl - 2)), b], 2.2, M('steel'), { ticks: false });
  s += cone(c, add(b, mul(d, -4)), d, 6, 5, M('steel'), { dk: .3 });
  s += taper(c, a, add(a, mul(d, hl)), 11, 9, hm, { w: 1.3, dk: .7 });
  for (let t = 4; t < hl - 2; t += 4.5) s += line2(add(add(a, mul(d, t)), mul(n, 4.2)), sub(add(a, mul(d, t)), mul(n, 4.2)), .8);
  return s;
}
function chisel(c, a, b, hm, o = {}) {
  const d = unit(sub(b, a)), n = perp(d), L = len(sub(b, a)), hl = L * .4;
  let s = solid(c, [add(add(a, mul(d, hl - 2)), mul(n, 4)), add(b, mul(n, 6)), sub(b, mul(n, 6)), sub(add(a, mul(d, hl - 2)), mul(n, 4))], M('steel'), { w: 1.3, dk: .6 });
  s += line2(add(b, mul(n, 6)), add(add(b, mul(d, -7)), mul(n, 6)), .8) + solid(c, [add(b, mul(n, 6)), add(add(b, mul(d, 4)), mul(n, 2)), sub(add(b, mul(d, 4)), mul(n, 2)), sub(b, mul(n, 6))], M('steel'), { w: 1, dk: .3 });
  s += taper(c, a, add(a, mul(d, hl)), 13, 9, hm, { w: 1.3, dk: .7 }) + beam(c, add(a, mul(d, hl - 3)), add(a, mul(d, hl + 1)), 12, M('brass'), { rivets: false });
  return s;
}
function sawBlade(c, a, b, w, o = {}) {
  const d = unit(sub(b, a)), n = perp(d), L = len(sub(b, a)), top = [], bot = [], N = Math.round(L / 4.4);
  for (let i = 0; i <= N; i++) { const p = add(a, mul(d, L * i / N)); top.push(add(p, mul(n, -w / 2 + (i % 2 ? 0 : 0)))); }
  const teeth = [add(a, mul(n, w / 2)), add(b, mul(n, w / 2))];
  for (let i = 0; i < N; i++) { const p0 = add(a, mul(d, L * i / N)), p1 = add(a, mul(d, L * (i + 1) / N)); teeth.push(add(add(p1, mul(n, w / 2 + 3.4)), mul(d, -1)), add(p0, mul(n, w / 2))); }
  const poly = [add(a, mul(n, -w / 2)), add(b, mul(n, -w / 2)), add(b, mul(n, w / 2))];
  for (let i = N - 1; i >= 0; i--) { const p0 = add(a, mul(d, L * i / N)), p1 = add(a, mul(d, L * (i + 1) / N)); poly.push(add(p1, mul(n, w / 2 + 3.6)), add(p0, mul(n, w / 2))); }
  return solid(c, poly, M('steel'), { w: 1.3, dk: .35, rim: false });
}
function signBoard(c, x, y, w, h, m, dirRight = true) {
  const tip = 10, p = dirRight ? [[x, y], [x + w - tip, y], [x + w, y + h / 2], [x + w - tip, y + h], [x, y + h]] : [[x + tip, y], [x + w, y], [x + w, y + h], [x + tip, y + h], [x, y + h / 2]];
  let s = solid(c, p, m, { w: 1.4, dk: .8 });
  for (const t of [.3, .5, .7]) s += line2([x + 6, y + h * t], [x + w - (dirRight ? tip + 6 : 6), y + h * t], .8);
  return s + hex(c, x + 4, y + 4, 1.8, 0, M('steel'), { dk: .2 }) + hex(c, x + 4, y + h - 4, 1.8, 0, M('steel'), { dk: .2 });
}
function cloth(c, poly, m, o = {}) {
  let s = solid(c, poly, m, { w: 1.4, dk: o.dk == null ? .25 : o.dk, rim: false, flat: false });
  const bb = bbox(poly), id = c.id();
  s += `<clipPath id="${id}"><path d="${pd(poly)}"/></clipPath><g clip-path="url(#${id})">`;
  for (let y = bb[1] + 9; y < bb[3]; y += o.batten || 11) s += `<path d="M${f(bb[0])} ${f(y)}Q${f((bb[0] + bb[2]) / 2)} ${f(y + 3)} ${f(bb[2])} ${f(y)}" fill="none" stroke="${INK}" stroke-width=".7" opacity=".55"/>`;
  s += fillp(pd(poly), 'url(#hatchL)', 'opacity=".25"') + '</g>';
  return s;
}
const hullBoat = (c, x, y, w, m) => solid(c, [[x, y], [x + w, y], [x + w - 8, y + 12], [x + 6, y + 12]], m, { w: 1.5, dk: .8 }) + line2([x + 4, y + 4], [x + w - 4, y + 4], .8);

/* ======================= A ======================= */
/* A — drawing compass, hinged at the top */
define('A', 100, ['steel', 'red', 'wood'], c => { const [s, r, w] = c.M, sw = c.on ? 6 * Math.sin(c.t * 1.8) : 0, H = [50, 28], tl = [14 + sw, 134], tr = [86 - sw, 134];
  const leg = (tip, m) => taper(c, H, tip, 12, 5, m, { w: 1.5 });
  let g = leg(tl, s) + leg(tr, s);
  const dl = unit(sub(tl, H)), dr = unit(sub(tr, H));
  g += cone(c, add(tl, mul(dl, -2)), dl, 16, 5, M('chrome'), { w: 1.2 }) + cone(c, add(tr, mul(dr, -2)), dr, 14, 6.5, w, { w: 1.2 }) + cone(c, add(tr, mul(dr, 10)), dr, 8, 3, M('dark'), { w: 1 });
  g += pipe(c, arc(50, 36, 30, 66, 33, 147, 14).map(p => [p[0], p[1] + 10]), 3, M('brass'), { cap: 'round' });
  g += `<circle cx="50" cy="28" r="10" fill="${MATS.steel.m}" stroke="${INK}" stroke-width="1.5"/>` + gear(c, 50, 28, 9, 8, 0, M('brass'), { depth: .2, hubSize: 3.5 });
  g += solid(c, [[46, 18], [54, 18], [54, 4], [46, 4]], r, { w: 1.3, dk: .7 }) + ball(c, 50, 0, 6.5, r);
  for (let y = 6; y < 16; y += 3) g += line2([46, y], [54, y], .7);
  return g + arrow(c, 50, 30, 21, 215, 330, M('orange')); });

/* A — two conveyors meeting at a roller: parcels climb one leg and ride down the other */
define('A', 102, ['green', 'steel', 'brown'], c => { const [g1, s, w] = c.M, top = [51, 26], fl = [14, 132], fr = [88, 132];
  let g = '';
  const up = unit(sub(top, fl)), dn = unit(sub(fr, top)), Ll = len(sub(top, fl)), Lr = len(sub(fr, top));
  g += conveyor(c, fl, top, 14, g1, { dir: -1, roller: s, pitch: 9 }) + conveyor(c, top, fr, 14, g1, { dir: 1, roller: s, pitch: 9 });
  for (let k = 0; k < 3; k++) { const u = (((c.t * .09 + k / 3) % 1) + 1) % 1, p = add(fl, mul(up, Ll * u)), nn = perp(up); g += crate(c, p[0] + nn[0] * 11 - 6, p[1] + nn[1] * 11 - 6, 12, 12, k % 2 ? M('cream') : w); }
  for (let k = 0; k < 3; k++) { const u = (((c.t * .09 + k / 3 + .17) % 1) + 1) % 1, p = add(top, mul(dn, Lr * u)), nn = perp(dn); g += crate(c, p[0] - nn[0] * 11 - 6, p[1] - nn[1] * 11 - 6, 12, 12, k % 2 ? w : M('cream')); }
  g += conveyor(c, [30, 102], [74, 102], 9, M('steel'), { dir: -1, roller: g1 }) + wheel(c, 51, 26, 12, s, { spin: 1, spokes: 4 }) + box1(c, 51, 5);
  return g + arrow(c, 51, 26, 24, 200, 340, M('red')); });
const box1 = (c, x, y) => solid(c, [[x - 9, y - 6], [x + 9, y - 6], [x + 9, y + 3], [x - 9, y + 3]], M('dark'), { w: 1.3, dk: .6 }) + `<circle cx="${x - 4}" cy="${y - 1.5}" r="1.6" fill="#7cf08a" stroke="${INK}" stroke-width=".6"/>`;

/* ======================= B ======================= */
/* B — two drums on a spine, sticks on top */
define('B', 98, ['red', 'steel', 'brass'], c => { const [r, s, b] = c.M, hit = c.on ? Math.sin(c.t * 14) * 2.5 : 0;
  return girder(c, [20, 12], [20, 140], 15, s) + drum(c, 62, 45, 29, r) + drum(c, 63, 107, 33, r)
    + bar([20, 18], [52, 4 + hit], 2.6, MATS.wood.m, MATS.wood.l) + ball(c, 53, 3 + hit, 3.2, M('cream')) + bar([30, 24], [66, 2 - hit], 2.6, MATS.wood.m, MATS.wood.l) + ball(c, 67, 1 - hit, 3.2, M('cream')) + hex(c, 20, 76, 5, 0, b); });

/* B — two water-wheels fed by a trough */
define('B', 100, ['wood', 'blue', 'steel'], c => { const [w, b, s] = c.M, wheelW = (cx, cy, R, ph) => {
    let g = '';
    for (let k = 0; k < 10; k++) { const a = rad(c.t * 28 * ph + k * 36); g += bar([cx, cy], [cx + Math.cos(a) * R, cy + Math.sin(a) * R], 2.2, w.d, null); }
    g += pipe(c, ringPts(cx, cy, R * .62, R * .62).concat([[cx + R * .62, cy]]), 2.4, w, { ticks: false });
    for (let k = 0; k < 10; k++) { const a = rad(c.t * 28 * ph + k * 36), p = [cx + Math.cos(a) * R, cy + Math.sin(a) * R], t = [-Math.sin(a), Math.cos(a)]; g += solid(c, [add(p, mul(t, -5)), add(p, mul(t, 5)), add(add(p, mul(t, 5)), mul([Math.cos(a), Math.sin(a)], -6)), add(add(p, mul(t, -5)), mul([Math.cos(a), Math.sin(a)], -6))], w, { w: 1, dk: .4, rim: false }); }
    return g + wheel(c, cx, cy, 6, s, { spin: ph, spokes: 3 }); };
  let g = girder(c, [20, 12], [20, 140], 15, w) + wheelW(62, 45, 29, 1) + wheelW(64, 108, 32, -1);
  for (let k = 0; k < 6; k++) { const u = (c.t * .8 + k / 6) % 1; g += `<ellipse cx="${f(36 + 18 * u)}" cy="${f(4 + 30 * u * u)}" rx="1.8" ry="3" fill="${b.l}" stroke="${INK}" stroke-width=".7"/>`; }
  return g + beam(c, [26, 8], [60, 8], 7, b, { rivets: false }); });

/* ======================= C ======================= */
/* C — a spanner: the open jaw is the letter */
define('C', 108, ['steel', 'orange', 'blue'], c => { const [s, o, b] = c.M, tw = c.on ? c.t * 80 : 20;
  const frame = mkPath(arc(54, 77, 40, 56, -52, -308, 44));
  let g = solid(c, ribbon(frame, -10, 10, 3), s, { w: 1.6 });
  const e0 = frame.at(0).p, e1 = frame.at(frame.L).p;
  g += solid(c, [add(e0, [-8, -12]), add(e0, [26, -12]), add(e0, [26, 8]), add(e0, [-8, 12])], s, { w: 1.5, dk: 1 });
  g += solid(c, [add(e1, [-8, -12]), add(e1, [26, -12]), add(e1, [26, 10]), add(e1, [-8, 12])], s, { w: 1.5, dk: 1 });
  g += solid(c, [add(e1, [6, -12]), add(e1, [26, -12]), add(e1, [26, -40]), add(e1, [6, -40])], b, { w: 1.4, dk: .8 });
  for (let k = 0; k < 6; k++) { const yy = e1[1] - 38 + k * 4.4 + (tw % 4.4); if (yy > e1[1] - 40 && yy < e1[1] - 12) g += line2([e1[0] + 6, yy], [e1[0] + 26, yy], .9); }
  g += gear(c, e0[0] + 8, e0[1] - 1, 8, 8, 1, o, { depth: .2, hubSize: 3 });
  return g + arrow(c, 54, 77, 24, 200, 305, M('orange')); });

/* C — half a ferris wheel, cabins swinging */
define('C', 110, ['red', 'steel', 'yellow'], c => { const [r, s, y] = c.M, cx = 56, cy = 77, R = 50, sw = Math.sin(c.t * 2) * 7;
  let g = '';
  const rim = arc(cx, cy, R, R, -48, -312, 50);
  for (let k = 0; k < 9; k++) { const a = rad(-48 - k * 33), p = [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; g += bar([cx, cy], p, 1.6, s.m, s.l); }
  g += pipe(c, rim, 3.8, r, { ticks: false, cap: 'round' });
  for (let k = 0; k < 9; k++) { const a = rad(-48 - k * 33), p = [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; if (k > 8) continue; g += line2(p, [p[0] + Math.sin(rad(sw)) * 5, p[1] + 8], 1.1) + solid(c, [[p[0] + Math.sin(rad(sw)) * 5 - 6, p[1] + 8], [p[0] + Math.sin(rad(sw)) * 5 + 6, p[1] + 8], [p[0] + Math.sin(rad(sw)) * 5 + 6, p[1] + 17], [p[0] + Math.sin(rad(sw)) * 5 - 6, p[1] + 17]], k % 2 ? y : M('teal'), { w: 1.1, dk: .5, rim: false }); }
  return g + gear(c, cx, cy, 12, 10, 1, s, { depth: .2, hubSize: 4 }) + beam(c, [cx - 14, 140], [cx, 96], 5, s, { rivets: false }) + arrow(c, cx, cy, 30, 130, 230, M('green')); });

/* ======================= D ======================= */
/* D — a sail on its mast, over a hull */
define('D', 104, ['red', 'steel', 'wood'], c => { const [r, s, w] = c.M, bil = Math.sin(c.t * 1.6) * 3 * (c.on ? 1.4 : .6);
  const sail = cat(seg([24, 16], [24, 124], 2), arc(24, 70, 66 + bil, 56, 90, -90, 30));
  return cloth(c, sail, r, { batten: 12 }) + girder(c, [22, 4], [22, 130], 9, w, { plates: false }) + hullBoat(c, 6, 130, 92, w)
    + flag(c, 24, -12, 22, 9, M('yellow'), 2) + line2([24, 124], [90, 134], 1.1) + line2([24, 14], [96, 132], 1); });

/* D — a water tank with a window, a tap and a level that moves */
define('D', 104, ['steel', 'blue', 'brass'], c => { const [s, b, br] = c.M, lv = 100 - 12 * (.5 + .5 * Math.sin(c.t * 1.4));
  const outer = cat(seg([20, 14], [44, 14], 2), arc(44, 77, 52, 63, -90, 90, 36), seg([44, 140], [20, 140], 2));
  const inner = cat(seg([36, 30], [44, 30], 2), arc(44, 77, 34, 47, -90, 90, 30), seg([44, 124], [36, 124], 2)).reverse();
  let top = ''; for (let i = 0; i <= 20; i++) top += (i ? 'L' : 'M') + f(34 + i * 3.4) + ' ' + f(lv + Math.sin(i * .8 + c.t * 3) * 1.6);
  const wid = c.id();
  let g = `<clipPath id="${wid}"><path d="${pd(inner)}"/></clipPath><g clip-path="url(#${wid})"><path d="${top}L102 126L34 126Z" fill="${b.m}"/><path d="${top}L102 126L34 126Z" fill="url(#hatch)" opacity=".3"/><path d="${top}" fill="none" stroke="${b.l}" stroke-width="2"/>`;
  for (let k = 0; k < 4; k++) { const u = (c.t * .4 + k * .25) % 1; g += `<circle cx="${f(50 + k * 9)}" cy="${f(122 - u * (122 - lv))}" r="1.8" fill="#fff" fill-opacity=".7" stroke="${INK}" stroke-width=".6"/>`; }
  g += '</g>' + solid(c, outer, s, { holes: [inner], w: 1.6 });
  const mid = mkPath(arc(44, 77, 43, 55, -90, 90, 40)); for (const q of mid.samples(8)) g += hex(c, q.p[0], q.p[1], 1.7, 0, M('steel'), { dk: .2 });
  for (let y = 22; y < 134; y += 10) g += hex(c, 28, y, 1.7, 0, M('steel'), { dk: .2 });
  return g + pipe(c, [[96, 106], [104, 106], [104, 118]], 3.2, br, { collars: [.3] }) + wheel(c, 104, 104, 5, M('red'), { spin: 1, spokes: 4 }) + gauge(c, 98, 40, 7, c.t); });

/* ======================= E ======================= */
/* E — a candelabra, three candles lit */
define('E', 98, ['brass', 'cream', 'steel'], c => { const [br, cr, s] = c.M;
  let g = girder(c, [20, 14], [20, 140], 14, br);
  for (const [yy, len] of [[26, 46], [80, 34], [134, 46]]) g += pipe(c, [[26, yy], [26 + len, yy]], 3.4, br, { collars: [0, 1] }) + solid(c, [[26 + len - 7, yy - 3], [26 + len + 7, yy - 3], [26 + len + 5, yy + 3], [26 + len - 5, yy + 3]], br, { w: 1.2, dk: .5 }) + candle(c, 26 + len, yy - 3, 20, cr);
  return g; });

/* E — a tool board: screwdriver, chisel, saw */
define('E', 104, ['wood', 'steel', 'red'], c => { const [w, s, r] = c.M;
  let g = beam(c, [20, 12], [20, 140], 18, w, { rivets: false });
  g += screwdriver(c, [28, 26], [92, 26], r) + chisel(c, [28, 80], [80, 80], M('wood')) + sawBlade(c, [48, 132], [98, 132], 9);
  g += solid(c, [[26, 126], [50, 126], [52, 138], [26, 138]], w, { w: 1.3, dk: .6 }) + hex(c, 31, 132, 2.2, 0, s, { dk: .2 }) + hex(c, 44, 132, 2.2, 0, s, { dk: .2 });
  return g + hex(c, 20, 20, 3, 0, s, { dk: .3 }) + hex(c, 20, 134, 3, 0, s, { dk: .3 }); });

/* ======================= F ======================= */
/* F — a signpost with two arrow boards */
define('F', 98, ['wood', 'red', 'steel'], c => { const [w, r, s] = c.M, sw = c.on ? 2 * Math.sin(c.t * 2) : 0;
  return beam(c, [20, 10], [20, 140], 11, w, { rivets: false }) + ball(c, 20, 6, 5, M('brass'))
    + `<g transform="rotate(${f(sw)} 20 26)">` + signBoard(c, 24, 16, 64, 22, r, true) + '</g>' + `<g transform="rotate(${f(-sw)} 20 78)">` + signBoard(c, 24, 68, 48, 20, M('cream'), true) + '</g>'
    + beam(c, [8, 140], [34, 140], 7, s, { rivets: false }); });

/* F — a hoist: jib, pulley, two hanging loads */
define('F', 98, ['orange', 'steel', 'brown'], c => { const [o, s, w] = c.M, sw = Math.sin(c.t * 1.8) * (c.on ? 2.2 : .8), lift = c.on ? 5 * Math.sin(c.t * 2.2) : 0;
  let g = girder(c, [20, 14], [20, 140], 15, o);
  g += girder(c, [26, 20], [84, 20], 9, o, { plates: false }) + girder(c, [26, 80], [60, 80], 8, o, { plates: false });
  g += wheel(c, 78, 28, 7, s, { spin: 1, spokes: 3 }) + line2([78, 35], [78 + sw, 56 + lift], 1.2) + crate(c, 68 + sw, 56 + lift, 20, 18, w);
  g += wheel(c, 54, 88, 5, s, { spin: -1, spokes: 3 }) + line2([54, 93], [54 - sw, 108 - lift], 1.1) + solid(c, [[46 - sw, 108 - lift], [62 - sw, 108 - lift], [60 - sw, 122 - lift], [48 - sw, 122 - lift]], s, { w: 1.2, dk: .5 });
  return g; });


/*@@END5@@*/
/*@@PART4@@*/
/* ======================= digits ======================= */
define('0', 112, ['orange', 'steel', 'rust'], c => gear(c, 56, 77, 56, 16, 1, c.M[0], { hole: .66, depth: .12, hub: false }) + arrow(c, 56, 77, 30, 200, 330, M('red')));
define('1', 62, ['blue', 'steel', 'yellow'], c => { const [b, s, y] = c.M;
  return beam(c, [34, 140], [34, 133], 46, s, { rivets: false }) + pipe(c, [[34, 24], [34, 134]], 9.5, b, { collars: [.2, .5, .8] }) + beam(c, [10, 36], [32, 16], 9, y, { rivets: false }); });
define('2', 98, ['red', 'steel', 'orange'], c => { const [r, s, o] = c.M, a = arc(48, 46, 32, 32, -175, 32, 26), e = a[a.length - 1];
  return beam(c, [8, 134], [92, 134], 13, o) + pipe(c, cat(a, seg(e, [16, 128], 8)), 8.2, r, { collars: [0, .52] }); });
define('3', 98, ['green', 'steel', 'yellow'], c => { const [g, s, y] = c.M;
  return pipe(c, cat(arc(44, 45, 30, 30, -155, 90, 24), arc(44, 106, 34, 32, -90, 155, 24)), 8.2, g, { collars: [0, .5, 1] }) + wheel(c, 44, 75, 8, y, { spin: 1, spokes: 4 }); });
define('4', 102, ['rust', 'steel', 'blue'], c => { const [r, s, b] = c.M;
  return girder(c, [72, 12], [72, 140], 15, r) + girder(c, [66, 18], [10, 102], 13, r) + beam(c, [6, 104], [96, 104], 12, s) + gear(c, 72, 104, 8, 8, 1, b, { depth: .22 }); });
define('5', 94, ['olive', 'steel', 'orange'], c => { const [g, s, o] = c.M;
  return beam(c, [18, 20], [84, 20], 12, o) + pipe(c, cat(seg([22, 24], [20, 66], 3), seg([20, 66], [44, 64], 3), arc(44, 100, 36, 36, -90, 152, 26)), 8.2, g, { collars: [0, 1] }); });
define('6', 100, ['blue', 'steel', 'orange'], c => { const [b, s, o] = c.M;
  return pipe(c, arc(60, 76, 46, 62, -70, -208, 34), 8, b, { collars: [0] }) + gear(c, 54, 102, 38, 14, 1, o, { hole: .6, depth: .14, hub: false }); });
define('7', 92, ['red', 'steel', 'yellow'], c => { const [r, s, y] = c.M;
  return girder(c, [78, 24], [30, 140], 15, r) + beam(c, [8, 18], [86, 18], 13, y); });
define('8', 100, ['yellow', 'steel', 'rust'], c => { const [y, s, r] = c.M;
  return gear(c, 50, 108, 37, 13, -1, r, { hole: .5, depth: .14, hubSize: 8, hub: true }) + gear(c, 50, 45, 31, 11, 1, y, { hole: .5, depth: .14, hubSize: 7, hub: true }); });
define('9', 100, ['blue', 'steel', 'orange'], c => { const [b, s, o] = c.M;
  return pipe(c, arc(40, 78, 46, 62, 108, -28, 34), 8, b, { collars: [0] }) + gear(c, 46, 52, 38, 14, 1, o, { hole: .6, depth: .14, hub: false }); });


/*@@END4@@*/
/*@@PART3@@*/
/* ======================= R ======================= */
/* R — a robot arm for the bowl */
define('R', 104, ['blue', 'steel', 'yellow'], c => { const [b, s, y] = c.M, sw = 3 * Math.sin(c.t * 2);
  const arm = [[27, 24], [66, 22 + sw], [86, 40], [68, 62 - sw], [27, 66]];
  return girder(c, [20, 12], [20, 140], 15, s) + ram(c, [46, 76], [88, 138], 6.5, b, { split: .5 }) + pipe(c, arm, 5.6, b, { collars: [.02, .98] })
    + gear(c, arm[1][0], arm[1][1], 10, 9, 1, y, { depth: .22 }) + gear(c, 86, 40, 9, 8, -1, y, { depth: .22 }) + gear(c, arm[3][0], arm[3][1], 10, 9, 1, y, { depth: .22 }) + hex(c, 27, 24, 5.5, 0, s) + hex(c, 27, 66, 5.5, 0, s); });

/* R — a radar screen with its sweep */
define('R', 104, ['green', 'steel', 'red'], c => { const [g, s, r] = c.M, cx = 66, cy = 42, a0 = c.t * 90, sec = [[cx, cy]].concat(arc(cx, cy, 24, 24, a0 - 55, a0, 10));
  let o = girder(c, [20, 12], [20, 140], 15, s) + girder(c, [46, 78], [88, 138], 14, g);
  o += solid(c, circ(cx, cy, 31, 30), s, { w: 1.5, dk: .7 }) + `<circle cx="${cx}" cy="${cy}" r="26" fill="#1d3a2c" stroke="${INK}" stroke-width="1.4"/>`;
  for (const rr of [8, 16, 24]) o += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="#6fd48a" stroke-width=".7" opacity=".7"/>`;
  o += `<path d="M${cx - 25} ${cy}L${cx + 25} ${cy}M${cx} ${cy - 25}L${cx} ${cy + 25}" stroke="#6fd48a" stroke-width=".6" opacity=".6"/>` + fillp(pd(sec), '#7cf08a', 'opacity=".5"') + line2([cx, cy], [cx + 24 * Math.cos(rad(a0)), cy + 24 * Math.sin(rad(a0))], 1.4).replace(INK, '#b6ffc4');
  for (const [bx, by] of [[cx + 10, cy - 12], [cx - 14, cy + 6], [cx + 4, cy + 15]]) o += `<circle cx="${bx}" cy="${by}" r="1.8" fill="#d6ffe0"/>`;
  return o + hex(c, cx, cy + 33, 4, 0, r); });

/* ======================= S ======================= */
function miniRocket(c, x, y, rot, k) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${k})">`
    + flameDown(c, 0, 20, 8, 12 + (c.on ? 8 : 0), 0)
    + fillp('M-9 8L-16 24L-9 18Z M9 8L16 24L9 18Z', MATS.red.m, `stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"`)
    + fillp('M-9 -12L-9 18L9 18L9 -12Q9 -26 0 -34Q-9 -26 -9 -12Z', MATS.cream.l, `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"`)
    + fillp('M-9 -12Q-9 -26 0 -34Q9 -26 9 -12Z', MATS.red.m, `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"`)
    + `<circle cx="0" cy="-2" r="4.4" fill="${MATS.blue.l}" stroke="${INK}" stroke-width="1.5"/></g>`;
}
/* S — a rocket drawing its smoke trail */
define('S', 92, ['cream', 'red', 'blue'], c => { const [cr, r, b] = c.M;
  const pts = cat(arc(46, 45, 28, 31, -40, -270, 40), arc(46, 107, 30, 31, -90, 140, 40)), path = mkPath(pts);
  let g = '';
  const n = 14, ph = (c.t * 14) % (path.L / n);
  for (let i = n; i >= 1; i--) { const s0 = Math.min(path.L, i * path.L / n - ph + 6), q = path.at(s0); if (s0 <= 6 && i === 1) continue; const u = s0 / path.L;
    g += `<circle cx="${f(q.p[0] + Math.sin(i * 2.3) * 2)}" cy="${f(q.p[1] + Math.cos(i * 1.7) * 2)}" r="${f(4.5 + 8 * u)}" fill="${i % 3 ? cr.l : MATS.steel.l}" stroke="${INK}" stroke-width="1.2"/>`; }
  return g + miniRocket(c, pts[0][0] + 4, pts[0][1] - 10, 40, 1.1); });

/* S — a roller-coaster track with a car running */
define('S', 92, ['rust', 'steel', 'yellow'], c => { const [r, s, y] = c.M;
  const pts = cat(arc(46, 45, 28, 31, -30, -270, 40), arc(46, 107, 30, 31, -90, 150, 40)), path = mkPath(pts);
  let g = '';
  for (const q of path.samples(7)) { g += line2(add(q.p, mul(q.n, -7.5)), add(q.p, mul(q.n, 7.5)), 2.6).replace(INK, r.d); }
  g += polyBar(pts.map((p, i) => add(p, mul(path.at(path.L * i / (pts.length - 1)).n, 6))), 2.6, s.m, s.l) + polyBar(pts.map((p, i) => add(p, mul(path.at(path.L * i / (pts.length - 1)).n, -6))), 2.6, s.m, s.l);
  for (let k = 0; k < 2; k++) { const q = path.at((((c.t * 36 + k * 22) % path.L) + path.L) % path.L), a = q.t, nn = [-a[1], a[0]], cp = q.p;
    const quad = [add(add(cp, mul(a, -10)), mul(nn, -4)), add(add(cp, mul(a, 10)), mul(nn, -4)), add(add(cp, mul(a, 10)), mul(nn, -12)), add(add(cp, mul(a, -10)), mul(nn, -12))];
    g += solid(c, quad, k ? y : M('red'), { w: 1.2, dk: .5 }) + `<circle cx="${f(cp[0] - nn[0] * 16 - a[0] * 2)}" cy="${f(cp[1] - nn[1] * 16 - a[1] * 2)}" r="3.4" fill="${MATS.cream.l}" stroke="${INK}" stroke-width="1"/>`; }
  return g; });

/* ======================= T ======================= */
/* T — a hammer, swinging */
define('T', 100, ['steel', 'brown', 'red'], c => { const [s, w, r] = c.M, a = c.on ? 8 * Math.sin(c.t * 3) : -3;
  const head = [[4, 18], [20, 12], [80, 12], [96, 16], [96, 38], [80, 40], [20, 40], [4, 32], [12, 25]];
  return `<g transform="rotate(${f(a)} 50 140)">` + beam(c, [50, 40], [50, 140], 15, w, { rivets: false }) + [60, 70, 80, 90, 100].map(y => line2([42.5, y], [57.5, y + 4], 1)).join('')
    + solid(c, head, s, { w: 1.6 }) + solid(c, [[80, 12], [96, 16], [96, 38], [80, 40]], r, { w: 1.2, dk: .6 }) + solid(c, [[44, 118], [56, 118], [56, 140], [44, 140]], M('dark'), { w: 1.2, dk: .6 }) + '</g>'; });

/* T — a pump-jack nodding on its post */
define('T', 104, ['orange', 'steel', 'rust'], c => { const [o, s, r] = c.M, a = (c.on ? 9 : 4) * Math.sin(c.t * 1.8);
  let g = beam(c, [52, 140], [52, 139], 52, s, { rivets: true, w: 1.4 }) + girder(c, [52, 134], [52, 36], 16, r, { plates: false });
  g += `<g transform="rotate(${f(a)} 52 28)">` + beam(c, [8, 28], [100, 28], 11, o) + solid(c, [[4, 12], [24, 12], [28, 28], [22, 48], [10, 50], [14, 28]], s, { w: 1.5, dk: .8 }) + beam(c, [84, 34], [100, 34], 12, M('dark'), { rivets: false }) + '</g>';
  g += hex(c, 52, 28, 7, 0, M('steel'));
  g += gear(c, 86, 118, 14, 11, 1, o, { depth: .22, spokes: 3 });
  return g; });

/* ======================= U ======================= */
/* U — a tuning fork humming */
define('U', 92, ['steel', 'blue', 'yellow'], c => { const [s, b, y] = c.M, v = c.on ? 1.6 * Math.sin(c.t * 38) : 0;
  const L = cat(seg([24 + v, 14], [24 + v, 94], 6), arc(48, 94, 24, 26, 180, 90, 10)), R = cat(arc(48, 94, 24, 26, 90, 0, 10), seg([72 - v, 94], [72 - v, 14], 6));
  let g = '';
  if (c.on) for (let k = 0; k < 3; k++) { const u = (c.t * 1.3 + k / 3) % 1; g += `<path d="M${f(8 - 14 * u)} ${f(30 - 12 * u)}Q${f(2 - 20 * u)} 50 ${f(8 - 14 * u)} ${f(70 + 12 * u)}" fill="none" stroke="${INK}" stroke-width="1.3" opacity="${f(1 - u)}"/><path d="M${f(88 + 14 * u)} ${f(30 - 12 * u)}Q${f(94 + 20 * u)} 50 ${f(88 + 14 * u)} ${f(70 + 12 * u)}" fill="none" stroke="${INK}" stroke-width="1.3" opacity="${f(1 - u)}"/>`; }
  g += pipe(c, L.concat(R), 6.5, s, { collars: [] }) + pipe(c, [[48, 118], [48, 134]], 5, y, { cap: 'butt' }) + solid(c, [[40, 130], [56, 130], [54, 142], [42, 142]], b, { w: 1.4, dk: .7 });
  return g; });

/* U — a U-tube holding coloured liquid that sloshes */
define('U', 92, ['blue', 'steel', 'red'], c => { const [b, s, r] = c.M, k = .5 + .5 * Math.sin(c.t * 2.2), pts = cat(seg([24, 14], [24, 96], 8), arc(48, 96, 24, 26, 180, 0, 20), seg([72, 96], [72, 14], 8)), path = mkPath(pts);
  const sl = 26 + 40 * k, sr = path.L - (26 + 40 * (1 - k)) ;
  const liq = path.slice(sl, sr, 3), d = pd(pts, false), dl = pd(liq, false);
  let g = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="25.2" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${GLASS}" stroke-width="22.6" stroke-linejoin="round"/>`;
  g += `<path d="${dl}" fill="none" stroke="${r.m}" stroke-width="18" stroke-linejoin="round"/><path d="${dl}" fill="none" stroke="${r.l}" stroke-width="7" stroke-linejoin="round" transform="translate(-3 -3)"/>`;
  g += `<path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7" transform="translate(-6 -2)" stroke-dasharray="60 400"/>`;
  for (const [pp, nn] of [[path.at(sl), 1], [path.at(sr), -1]]) g += `<ellipse cx="${f(pp.p[0])}" cy="${f(pp.p[1])}" rx="9" ry="2.6" fill="${r.l}" stroke="${INK}" stroke-width="1"/>`;
  for (let y = 24; y < 92; y += 8) g += line2([6, y], [y % 16 === 8 ? 12 : 15, y], .9);
  return g + beam(c, [24, 12], [24, 11], 30, s, { rivets: false, dk: .5 }) + beam(c, [72, 12], [72, 11], 30, s, { rivets: false, dk: .5 }); });

/* ======================= V ======================= */
/* V — a V-twin engine turning its crank */
define('V', 112, ['green', 'steel', 'orange'], c => { const [g1, s, o] = c.M, th = c.t * 5, cp = [56 + 9 * Math.cos(th), 126 + 9 * Math.sin(th)];
  let g = '';
  for (const [A, B, hx] of [[[14, 16], [46, 104], 1], [[100, 16], [66, 104], -1]]) {
    const d = unit(sub(B, A));
    g += bar(B, cp, 4.4, s.m, s.l) + pipe(c, [A, B], 10.5, g1, { collars: [.12, .3, .48, .66, .84], collarMat: s }) + beam(c, add(A, mul(d, -2)), add(A, mul(d, -6)), 26, o, { rivets: false }); }
  return g + gear(c, 56, 126, 15, 12, 1, o, { depth: .2, spokes: 3 }) + `<circle cx="${f(cp[0])}" cy="${f(cp[1])}" r="3.6" fill="${s.m}" stroke="${INK}" stroke-width="1.2"/>`; });

/* V — a hopper pouring grain */
define('V', 112, ['rust', 'steel', 'yellow'], c => { const [r, s, y] = c.M;
  let g = '';
  const xl = yy => 8 + (yy - 16) / 96 * 38, xr = yy => 104 - (yy - 16) / 96 * 38;
  for (let k = 0; k < 9; k++) { const u = ((c.t * .5 + k * .113) % 1), yy = 18 + u * 118, xx = yy < 112 ? lerp([xl(yy) + 8, 0], [xr(yy) - 8, 0], ((k * 37) % 10) / 10)[0] : 56 + (((k * 7) % 5) - 2); if (yy > 20 && yy < 138) g += `<circle cx="${f(xx)}" cy="${f(yy)}" r="3.3" fill="${y.m}" stroke="${INK}" stroke-width=".9"/>`; }
  g += beam(c, [8, 16], [46, 112], 10, r) + beam(c, [104, 16], [66, 112], 10, r);
  g += pipe(c, [[56, 108], [56, 130]], 8, s, { collars: [0, .95] }) + beam(c, [14, 14], [98, 14], 5, s, { rivets: false });
  return g; });

/* ======================= W ======================= */
/* W — a ray of light bouncing off glass slabs */
define('W', 136, ['yellow', 'blue', 'steel'], c => { const [y, b, s] = c.M, pulse = .55 + .12 * Math.sin(c.t * 4);
  const P = [[14, 8], [42, 128], [70, 40], [98, 128], [124, 20]], path = mkPath(P);
  let g = `<path d="${pd(ribbon(path, -8, 8, 2))}" fill="${y.l}" opacity="${f(pulse + .15)}"/>` + ink(pd(ribbon(path, -8, 8, 2)), 1.3);
  g += fillp(pd(ribbon(path, -8, 8, 2)), 'url(#hatchL)', 'opacity=".35"');
  for (const [px, py, flip] of [[42, 132, 1], [70, 36, -1], [98, 132, 1]]) g += solid(c, [[px - 20, py - 4], [px + 20, py - 4], [px + 20, py + 6], [px - 20, py + 6]], b, { w: 1.3, dk: .8, flat: true });
  const q = path.at(((c.t * 60) % path.L + path.L) % path.L);
  g += `<circle cx="${f(q.p[0])}" cy="${f(q.p[1])}" r="3" fill="#fff" opacity=".9"/>`;
  g += bulb(c, 14, -10, 11, { rot: 180, glow: c.on ? 1 : .8 }) + `<circle cx="124" cy="14" r="11" fill="${GLASS}" fill-opacity=".5" stroke="${INK}" stroke-width="1.6"/><path d="M116 10A9 9 0 0 1 122 5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
  return g; });

/* W — four connecting rods between pistons and cranks */
define('W', 136, ['orange', 'steel', 'rust'], c => { const [o, s, r] = c.M, a = k => 10 * Math.sin(c.t * 3 + k);
  const P = [[14, 22 + a(0)], [42, 126], [70, 40 + a(2)], [98, 126], [124, 22 + a(4)]];
  let g = '';
  for (let i = 0; i < 4; i++) g += pipe(c, [P[i], P[i + 1]], 5.6, i % 2 ? o : r, { collars: [.5], collarMat: s });
  for (const i of [0, 2, 4]) g += beam(c, [P[i][0], P[i][1] - 4], [P[i][0], P[i][1] - 12], 24, s, { rivets: false }) + pipe(c, [[P[i][0], P[i][1] - 12], [P[i][0], -2]], 3.4, s, { ticks: false });
  return g + gear(c, 42, 126, 14, 11, 1, o, { depth: .2, spokes: 3 }) + gear(c, 98, 126, 14, 11, -1, o, { depth: .2, spokes: 3 }); });

/* ======================= X ======================= */
/* X — a pair of scissors, opening and closing */
define('X', 104, ['steel', 'red', 'blue'], c => { const [s, r, b] = c.M, k = c.on ? Math.sin(c.t * 2.2) : .25, tx = 38 + 12 * k, P = [52, 78];
  const blade = (tip, hand, col) => { const d = unit(sub(tip, P)), n = perp(d); return solid(c, [add(P, mul(n, 6)), add(tip, mul(n, .6)), add(P, mul(n, -6))], col, { w: 1.4, dk: .7 }) + pipe(c, [P, hand], 3.6, col, { ticks: false })
      + pipe(c, ringPts(hand[0] + (hand[0] - P[0]) * .25, hand[1] + (hand[1] - P[1]) * .25, 11, 11).concat([[hand[0] + (hand[0] - P[0]) * .25 + 11, hand[1] + (hand[1] - P[1]) * .25]]), 3.6, col === s ? r : b, { ticks: false }); };
  return blade([52 - tx, 12], [52 + tx * .5, 118], s) + blade([52 + tx, 12], [52 - tx * .5, 118], M('steel')) + hex(c, 52, 78, 6, 0, M('dark')); });

/* X — a level-crossing sign with flashing lamps */
define('X', 104, ['cream', 'red', 'steel'], c => { const [cr, r, s] = c.M, flash = c.on ? Math.sin(c.t * 7) > 0 : false;
  const plank = (a, b) => { const d = unit(sub(b, a)), n = perp(d); return beam(c, a, b, 17, cr, { rivets: false }) + bar(add(a, mul(n, 6)), add(b, mul(n, 6)), 1.6, r.m, null) + bar(add(a, mul(n, -6)), add(b, mul(n, -6)), 1.6, r.m, null); };
  return plank([10, 18], [94, 136]) + plank([94, 18], [10, 136]) + hex(c, 52, 77, 6, 0, s) + ball(c, 12, 14, 7, flash ? M('red') : M('dark')) + ball(c, 92, 14, 7, flash ? M('dark') : M('red'))
    + (flash ? `<circle cx="12" cy="14" r="13" fill="#f66" opacity=".25"/>` : `<circle cx="92" cy="14" r="${c.on ? 13 : 0}" fill="#f66" opacity=".25"/>`); });

/* ======================= Y ======================= */
/* Y — a catapult: slingshot drawing back a stone */
define('Y', 104, ['brown', 'red', 'steel'], c => { const [w, r, s] = c.M, k = c.on ? .5 + .5 * Math.sin(c.t * 2.4) : .3, P = [52, 36 + 40 * k], J = [52, 80];
  let g = beam(c, [52, 140], [52, 80], 15, w, { rivets: false }) + pipe(c, [J, [14, 16]], 5.8, w, { cap: 'round' }) + pipe(c, [J, [90, 16]], 5.8, w, { cap: 'round' });
  g += `<path d="M14 16L${f(P[0] - 6)} ${f(P[1])}M90 16L${f(P[0] + 6)} ${f(P[1])}" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/><path d="M14 16L${f(P[0] - 6)} ${f(P[1])}M90 16L${f(P[0] + 6)} ${f(P[1])}" fill="none" stroke="${r.m}" stroke-width="2.6" stroke-linecap="round"/>`;
  g += solid(c, [[P[0] - 8, P[1] - 3], [P[0] + 8, P[1] - 3], [P[0] + 6, P[1] + 5], [P[0] - 6, P[1] + 5]], M('brown'), { w: 1.2, dk: .4 }) + ball(c, P[0], P[1] - 8, 6, s);
  return g + collar(c, [52, 100], [0, 1], 7.5, s) + collar(c, [52, 128], [0, 1], 7.5, s); });

/* Y — a Y-shaped pipe with a valve and water flowing */
define('Y', 104, ['blue', 'steel', 'red'], c => { const [b, s, r] = c.M, J = [52, 78];
  const stem = [[52, 140], J], aL = [J, [12, 16]], aR = [J, [92, 16]];
  let g = pipe(c, stem, 8.5, b, { collars: [0, .5] }) + pipe(c, aL, 8.5, b, { collars: [1] }) + pipe(c, aR, 8.5, b, { collars: [1] }) + gear(c, 52, 78, 9.5, 9, 0, s, { depth: .2 });
  const P1 = mkPath([[52, 140], J, [12, 16]]), P2 = mkPath([[52, 140], J, [92, 16]]);
  for (let k = 0; k < 7; k++) for (const P of [P1, P2]) { const q = P.at(((c.t * 40 + k * P.L / 7) % P.L)); g += `<circle cx="${f(q.p[0])}" cy="${f(q.p[1])}" r="2.6" fill="#e6f4fb" stroke="${INK}" stroke-width=".7"/>`; }
  return g + pipe(c, [[40, 112], [22, 112]], 3.4, s, { ticks: false }) + wheel(c, 14, 112, 10, r, { spin: 1, spokes: 4 }); });

/* ======================= Z ======================= */
/* Z — a live cable, with insulators and sparks */
define('Z', 100, ['orange', 'steel', 'cream'], c => { const [o, s, cr] = c.M, ins = (x, y) => { let g = ''; for (let i = 0; i < 3; i++) g += `<ellipse cx="${x}" cy="${y - 8 + i * 8}" rx="${12 - i * 1.4}" ry="3.6" fill="${cr.l}" stroke="${INK}" stroke-width="1.2"/>`; return g; };
  let g = pipe(c, [[10, 20], [86, 20]], 5.6, o, { collars: [0, 1] }) + pipe(c, [[84, 24], [14, 128]], 5.6, o, { collars: [0, 1] }) + pipe(c, [[10, 132], [86, 132]], 5.6, o, { collars: [0, 1] });
  g += ins(86, 20) + ins(10, 132);
  const n = c.on ? 3 : 1, rnd2 = k => Math.sin(Math.floor(c.t * 18) * 12.9898 + k * 78.233) * 43758.5453 % 1;
  for (let k = 0; k < n; k++) { const u0 = .15 + .7 * Math.abs(rnd2(k)), A = lerp([84, 24], [14, 128], u0); let d = `M${f(A[0])} ${f(A[1])}`; for (let i = 1; i <= 4; i++) d += `l${f(7 * (rnd2(k + i) > 0 ? 1 : -1) + 2)} ${f(5 + 3 * Math.abs(rnd2(i * 3)))}`; g += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff4a0" stroke-width="1.6" stroke-linejoin="round"/>`; }
  return g; });

/* Z — an accordion for the slanting stroke */
define('Z', 100, ['red', 'brown', 'steel'], c => { const [r, w, s] = c.M, sq = 1 + (c.on ? .12 * Math.sin(c.t * 3) : 0);
  const A = [84, 28], B = [16, 124], d = unit(sub(B, A)), n = perp(d), L = len(sub(B, A)), N = 12;
  let g = beam(c, [8, 20], [88, 20], 14, w) + beam(c, [8, 132], [90, 132], 14, w);
  let pts = []; for (let i = 0; i <= N; i++) pts.push(add(add(A, mul(d, L * i / N)), mul(n, (i % 2 ? 13 : -13) * sq)));
  for (let i = 0; i < N; i++) { const q = [pts[i], pts[i + 1], add(pts[i + 1], mul(d, 0)), pts[i]]; g += face(pd([pts[i], pts[i + 1], add(pts[i + 1], mul(n, (i % 2 ? -4 : 4))), add(pts[i], mul(n, (i % 2 ? -4 : 4)))]), i % 2 ? r.m : r.l); }
  g += polyBar(pts, 2.8, r.m, r.l);
  return g + hex(c, 84, 28, 5, 0, s) + hex(c, 16, 124, 5, 0, s); });


/*@@END3@@*/
/*@@PART2@@*/
/* ======================= more parts ======================= */
const rrect = (x0, y0, x1, y1, r) => cat(arc(x1 - r, y0 + r, r, r, -90, 0, 5), arc(x1 - r, y1 - r, r, r, 0, 90, 5), arc(x0 + r, y1 - r, r, r, 90, 180, 5), arc(x0 + r, y0 + r, r, r, 180, 270, 5));
function ball(c, x, y, r, m) {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${m.d}"/><circle cx="${f(x - r * .14)}" cy="${f(y - r * .14)}" r="${f(r * .86)}" fill="${m.m}"/><circle cx="${f(x - r * .3)}" cy="${f(y - r * .3)}" r="${f(r * .5)}" fill="${m.l}"/>`
    + `<ellipse cx="${f(x - r * .38)}" cy="${f(y - r * .42)}" rx="${f(r * .2)}" ry="${f(r * .13)}" fill="#fff" opacity=".8" transform="rotate(-35 ${f(x - r * .38)} ${f(y - r * .42)})"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
}
function dish(c, cx, cy, r, rot, m) {
  return `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)})"><ellipse rx="${f(r * .5)}" ry="${f(r)}" fill="${m.d}" stroke="${INK}" stroke-width="1.4" transform="translate(${f(r * .16)} ${f(-r * .1)})"/>`
    + `<ellipse rx="${f(r * .5)}" ry="${f(r)}" fill="${m.m}" stroke="${INK}" stroke-width="1.4"/><ellipse rx="${f(r * .34)}" ry="${f(r * .78)}" fill="${m.l}" stroke="${INK}" stroke-width=".8"/>`
    + `<path d="M0 ${f(-r * .78)}L0 ${f(r * .78)}M${f(-r * .3)} 0L${f(r * .3)} 0" stroke="${INK}" stroke-width=".7" opacity=".6"/>`
    + bar([0, 0], [r * 1.05, 0], 1.6, MATS.steel.m, null) + `<circle cx="${f(r * 1.05)}" cy="0" r="2.4" fill="${MATS.red.m}" stroke="${INK}" stroke-width=".9"/></g>`;
}
const polyBar = (pts, wd, col, hl) => { const d = pd(pts, false);
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(wd + 1.5)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${f(wd)}" stroke-linecap="round" stroke-linejoin="round"/>`
    + (hl ? `<path d="${d}" fill="none" stroke="${hl}" stroke-width="${f(wd * .3)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f(-wd * .15)} ${f(-wd * .15)})"/>` : ''); };
const flameDown = (c, x, y, w, h, ph) => `<g transform="translate(0 ${f(2 * y)}) scale(1 -1)">${flame(c, x, y, w, h, ph)}</g>`;

/* ======================= I ======================= */
/* I — a USB stick, as on the cover */
define('I', 60, ['blue', 'steel', 'cream'], c => { const [b, s, cr] = c.M, led = c.on && Math.sin(c.t * 8) > 0;
  const body = rrect(14, 54, 46, 140, 6), plug = [[19, 14], [41, 14], [41, 56], [19, 56]];
  return solid(c, plug, s, { w: 1.5, holes: [[[24, 22], [28, 22], [28, 30], [24, 30]], [[32, 22], [36, 22], [36, 30], [32, 30]]] }) + solid(c, body, b, { w: 1.6, holes: [ellipseHole(30, 128, 5, 5)] })
    + `<rect x="21" y="72" width="18" height="38" rx="2" fill="${cr.l}" stroke="${INK}" stroke-width="1"/>` + line2([24, 80], [36, 80], .7) + line2([24, 86], [36, 86], .7) + line2([24, 92], [33, 92], .7)
    + `<circle cx="30" cy="63" r="2.6" fill="${led ? '#7cf08a' : MATS.green.d}" stroke="${INK}" stroke-width=".9"/>`; });
const ellipseHole = (cx, cy, rx, ry) => ellRev(cx, cy, rx, ry);
function ellRev(cx, cy, rx, ry) { return arc(cx, cy, rx, ry, 0, 360 - 360 / 18, 17).reverse(); }

/* I — a rocket, lit and waiting */
define('I', 60, ['red', 'cream', 'blue'], c => { const [r, cr, b] = c.M, big = c.on ? 1 : .55;
  let g = flameDown(c, 30, 116, 14, 30 * big + 8, 0) + flameDown(c, 24, 114, 8, 18 * big + 4, 2) + flameDown(c, 36, 114, 8, 18 * big + 4, 4);
  g += solid(c, [[12, 92], [0, 126], [12, 114]], r, { w: 1.3, dk: .6 }) + solid(c, [[48, 92], [60, 126], [48, 114]], r, { w: 1.3, dk: .6 });
  g += solid(c, [[20, 112], [40, 112], [37, 122], [23, 122]], MATS.steel && M('steel'), { w: 1.2, dk: .6 });
  g += solid(c, [[12, 112], [48, 112], [48, 38], [12, 38]], cr, { w: 1.5 });
  g += solid(c, [[12, 38], [14, 26], [20, 14], [30, 4], [40, 14], [46, 26], [48, 38]], r, { w: 1.5 });
  g += `<rect x="12" y="88" width="36" height="7" fill="${r.m}" stroke="${INK}" stroke-width="1"/>`;
  return g + `<circle cx="30" cy="62" r="9.5" fill="${b.m}" stroke="${INK}" stroke-width="2.2"/><circle cx="30" cy="62" r="6.4" fill="${b.l}" stroke="${INK}" stroke-width=".8"/><path d="M26 58a5 5 0 0 1 4 -2.4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`; });

/* ======================= J ======================= */
/* J — an umbrella, with a hooked handle */
define('J', 74, ['red', 'steel', 'brown'], c => { const [r, s, w] = c.M, cr = M('cream');
  let g = '';
  const cx = 37, cy = 36;
  for (let i = 0; i < 6; i++) { const a0 = 180 + i * 30, a1 = a0 + 30, rim = arc(cx, cy, 33, 30, a0, a1, 6);
    g += face(pd([[cx, cy]].concat(rim)), i % 2 ? cr.l : r.m);
    if (i % 2) g += fillp(pd([[cx, cy]].concat(rim)), 'url(#hatch)', 'opacity=".25"');
    }
  g += ink(pd(arc(cx, cy, 33, 30, 180, 360, 24), false), 1.5) + ink(`M4 36L70 36`, 1.2);
  for (let i = 1; i < 6; i++) { const a = rad(180 + i * 30); g += line2([cx, cy], [cx + 33 * Math.cos(a), cy + 30 * Math.sin(a)], .8); }
  g += pipe(c, [[37, 8], [37, -6]], 1.6, s, { ticks: false }) + pipe(c, cat(seg([37, 36], [37, 104], 6), arc(23, 104, 14, 14, 0, 180, 12)), 3.4, s, { cap: 'round', ticks: false });
  g += pipe(c, arc(23, 104, 14, 14, 20, 180, 10), 5, w, { cap: 'round' });
  if (c.on) for (let k = 0; k < 9; k++) { const u = (c.t * 1.2 + k / 9) % 1, x = 2 + (k * 61) % 70, y = -20 + 150 * u; if (y > 26 && x > 4 && x < 70 || y < 30) g += line2([x, y], [x - 1.5, y + 6], 1.3); }
  return g; });

/* J — a chain hanging from a sprocket, ending in a weight */
define('J', 74, ['yellow', 'steel', 'red'], c => { const [y, s, r] = c.M;
  const pts = cat(seg([50, 24], [50, 96], 10), arc(32, 96, 18, 24, 0, 175, 20)), e = pts[pts.length - 1];
  return chain(c, mkPath(pts), y, { pitch: 13 }) + gear(c, 50, 20, 15, 10, 1, s, { depth: .22, spokes: 3 }) + ball(c, e[0] - 1, e[1] - 4, 8, r) + solid(c, [[e[0] - 4, e[1] - 12], [e[0], e[1] - 22], [e[0] + 4, e[1] - 12]], s, { w: 1, dk: .4 }); });

/* ======================= K ======================= */
/* K — a radar dish and a searchlight on two arms */
define('K', 112, ['green', 'steel', 'yellow'], c => { const [g, s, y] = c.M, sw = -38 + 12 * Math.sin(c.t * 1.4);
  let o = girder(c, [20, 12], [20, 140], 15, g);
  o += rays([[96, 126], [120, 108], [122, 146]], .55);
  o += pipe(c, [[26, 76], [58, 130]], 4.8, s, { collars: [0, 1] }) + bulb(c, 82, 130, 11, { rot: 90 });
  o += pipe(c, [[26, 76], [78, 30]], 4.8, s, { collars: [0, 1] }) + dish(c, 86, 24, 19, sw, y);
  return o + gear(c, 26, 76, 9, 8, 1, y, { depth: .22 }); });

/* K — a particle collision */
define('K', 108, ['blue', 'steel', 'red'], c => { const [b, s, r] = c.M, u = (c.t * .45) % 1, p = (a, k) => lerp([34, 78], a, k);
  let o = girder(c, [20, 12], [20, 140], 15, b);
  o += pipe(c, [[26, 78], [84, 20]], 4.6, s, { collars: [.2, .5, .8, 1] }) + pipe(c, [[26, 78], [86, 136]], 4.6, s, { collars: [.2, .5, .8, 1] });
  o += ball(c, 92, 14, 9, r) + ball(c, 94, 140, 9, M('green')) + ball(c, p([84, 20], .25 + .6 * u)[0], p([84, 20], .25 + .6 * u)[1], 4, M('yellow')) + ball(c, p([86, 136], .25 + .6 * u)[0], p([86, 136], .25 + .6 * u)[1], 4, M('yellow'));
  o += ball(c, 30, 72, 9, r) + ball(c, 41, 77, 9, b) + ball(c, 35, 87, 8, M('green'));
  return o + arrow(c, 38, 80, 24, 205, 300, M('orange')); });

/* ======================= L ======================= */
/* L — a try-square, ruler and slider */
define('L', 92, ['yellow', 'steel', 'red'], c => { const [y, s, r] = c.M, k = .5 + .5 * Math.sin(c.t * 1.5), sx = 44 + 30 * k;
  let g = beam(c, [22, 14], [22, 140], 18, y, { rivets: false });
  for (let yy = 20, i = 0; yy < 118; yy += 5, i++) g += line2([31, yy], [31 - (i % 5 === 0 ? 10 : i % 2 ? 4 : 6), yy], .8);
  g += beam(c, [13, 131], [88, 131], 18, y, { rivets: false });
  for (let xx = 36, i = 0; xx < 86; xx += 5, i++) g += line2([xx, 122], [xx, 122 + (i % 5 === 0 ? 10 : i % 2 ? 4 : 6)], .8);
  g += solid(c, [[sx - 6, 112], [sx + 6, 112], [sx + 6, 142], [sx - 6, 142]], r, { w: 1.2, dk: .7 }) + line2([sx, 112], [sx, 142], .8);
  return g + hex(c, 22, 19, 4, 0, s) + hex(c, 22, 135, 4, 0, s); });

/* L — a ram with crates riding the floor */
define('L', 92, ['blue', 'steel', 'brown'], c => { const [b, s, w] = c.M;
  let g = conveyor(c, [14, 132], [86, 132], 14, M('dark'), { dir: 1, roller: s, pitch: 9 });
  for (let k = 0; k < 2; k++) { const x = 34 + ((c.t * 16 + k * 36) % 60); g += crate(c, x - 8, 108, 16, 16, k ? M('cream') : w); }
  return g + ram(c, [22, 124], [22, 14], 9.5, b, { split: .66 }) + beam(c, [22, 14], [22, 12], 22, s, { rivets: false }); });

/* ======================= M ======================= */
/* M — a suspension bridge */
define('M', 128, ['orange', 'steel', 'red'], c => { const [o, s, r] = c.M, cab = (x0) => { const p = []; for (let i = 0; i <= 14; i++) { const u = i / 14; p.push([x0 + (64 - x0) * u, 16 + 92 * Math.pow(u, 1.7)]); } return p; };
  const cl = cab(21), cr = cab(107);
  let g = beam(c, [8, 128], [120, 128], 10, s, { rivets: true });
  for (const cc of [cl, cr]) for (let i = 2; i < 14; i += 2) g += line2(cc[i], [cc[i][0], 124], 1.1);
  g += girder(c, [21, 12], [21, 134], 15, o) + girder(c, [107, 12], [107, 134], 15, o) + polyBar(cl, 2.8, r.m, r.l) + polyBar(cr, 2.8, r.m, r.l);
  return g + gear(c, 64, 112, 11, 9, 1, s, { depth: .22 }); });

/* M — twin towers and two great springs */
define('M', 128, ['green', 'steel', 'yellow'], c => { const [g, s, y] = c.M;
  return girder(c, [20, 12], [20, 140], 16, g) + girder(c, [108, 12], [108, 140], 16, g) + spring(c, [27, 26], [60, 104], 9, 9, s) + spring(c, [101, 26], [68, 104], 9, 9, s) + gear(c, 64, 112, 14, 11, 1, y, { depth: .22, spokes: 3 }); });

/* ======================= N ======================= */
/* N — an escalator between two towers */
define('N', 108, ['blue', 'steel', 'red'], c => { const [b, s, r] = c.M;
  const A = [26, 28], B = [84, 124], d = unit(sub(B, A)), n = perp(d);
  return girder(c, [20, 14], [20, 140], 15, b) + girder(c, [90, 14], [90, 140], 15, b) + bar(add(A, mul(n, -15)), add(B, mul(n, -15)), 2.6, s.m, s.l) + conveyor(c, A, B, 18, r, { dir: 1, pitch: 9, roller: s }) + bar(add(A, mul(n, 15)), add(B, mul(n, 15)), 2.6, s.m, s.l); });

/* N — three planks and a handful of nails */
define('N', 108, ['brown', 'steel', 'yellow'], c => { const [w, s, y] = c.M, plank = (a, b) => { const d = unit(sub(b, a)), n = perp(d); let g = beam(c, a, b, 18, w, { rivets: false });
    for (const o of [-4, 1.5, 5.5]) g += line2(add(lerp(a, b, .03), mul(n, o)), add(lerp(a, b, .97), mul(n, o + (o > 0 ? .5 : -.5))), .6);
    for (const t of [.05, .95]) { const p = lerp(a, b, t); g += hex(c, p[0], p[1], 3, 0, s, { dk: .3 }); } return g; };
  return plank([22, 14], [22, 140]) + plank([88, 14], [88, 140]) + plank([22, 24], [88, 130]) + `<path d="M40 70l10 -10l4 4" fill="none" stroke="${MATS.red.m}" stroke-width="0"/>`; });

/* ======================= O ======================= */
/* O — an atom in a pipe ring */
define('O', 122, ['steel', 'blue', 'red'], c => { const [s, b, r] = c.M, e = k => { const a = rad(30 * (k ? -1 : 1)), th = c.t * 2.4 + k * 3, x = 40 * Math.cos(th), y = 15 * Math.sin(th); return [61 + x * Math.cos(a) - y * Math.sin(a), 77 + x * Math.sin(a) + y * Math.cos(a)]; };
  let g = pipe(c, ringPts(61, 77, 55, 55).concat([[116, 77]]), 7, s, { collars: [.12, .37, .62, .87] });
  for (const k of [0, 1]) g += `<ellipse cx="61" cy="77" rx="40" ry="15" transform="rotate(${k ? -30 : 30} 61 77)" fill="none" stroke="${INK}" stroke-width="2.6"/><ellipse cx="61" cy="77" rx="40" ry="15" transform="rotate(${k ? -30 : 30} 61 77)" fill="none" stroke="${b.m}" stroke-width="1.3"/>`;
  g += ball(c, 55, 72, 9, r) + ball(c, 67, 75, 9, b) + ball(c, 60, 85, 8, M('green'));
  for (const k of [0, 1]) { const p = e(k); g += ball(c, p[0], p[1], 4.6, M('yellow')); }
  return g + arrow(c, 61, 77, 30, 210, 320, M('orange')); });

/* O — a hot-air balloon */
define('O', 122, ['red', 'cream', 'brown'], c => { const [r, cr, w] = c.M, bob = c.on ? 3 * Math.sin(c.t * 1.6) : 0, cx = 61, cy = 62, rx = 52, ry = 54, N = 8;
  let g = `<g transform="translate(0 ${f(bob)})">`;
  for (let i = 0; i < N; i++) { const p0 = -90 + i * 180 / N, p1 = p0 + 180 / N, L = [], R = [];
    for (let j = 0; j <= 14; j++) { const v = -1 + 2 * j / 14, xr = rx * Math.sqrt(Math.max(0, 1 - v * v)); L.push([cx + xr * Math.sin(rad(p0)), cy + ry * v]); R.push([cx + xr * Math.sin(rad(p1)), cy + ry * v]); }
    const poly = L.concat(R.reverse()), col = [r.m, cr.l, M('orange').m][i % 3 === 2 ? 2 : i % 2];
    g += face(pd(poly), col) + (i >= N / 2 ? fillp(pd(poly), 'url(#hatch)', 'opacity=".35"') : '') + ink(pd(poly), .8); }
  g += ink(pd(ringPts(cx, cy, rx, ry)), 1.7);
  g += line2([cx - 17, cy + ry - 4], [cx - 12, 126], 1.1) + line2([cx + 17, cy + ry - 4], [cx + 12, 126], 1.1);
  g += flame(c, cx, 124, 8, 10 + (c.on ? 8 : 0), 1) + solid(c, [[cx - 15, 126], [cx + 15, 126], [cx + 12, 142], [cx - 12, 142]], w, { w: 1.3, dk: .6 });
  for (let yy = 131; yy < 141; yy += 4) g += line2([cx - 14, yy], [cx + 14, yy], .6);
  return g + '</g>'; });

/* O — an alarm clock */
define('O', 122, ['orange', 'cream', 'red'], c => { const [o, cr, r] = c.M, sh = c.on ? 1.1 * Math.sin(c.t * 40) : 0, cx = 61 + sh, cy = 82, R = 52, ang = a => rad(a - 90);
  let g = `<g transform="translate(${f(sh)} 0)">` + solid(c, [[28, 128], [38, 124], [44, 134], [34, 140]], M('steel'), { w: 1.2, dk: .5 }) + solid(c, [[94, 128], [84, 124], [78, 134], [88, 140]], M('steel'), { w: 1.2, dk: .5 });
  for (const sx of [-1, 1]) { const bx = 61 + sx * 38, by = 26 + (c.on ? 1.5 * Math.sin(c.t * 30 + sx) : 0); g += `<path d="M${f(bx - 15)} ${f(by + 8)}A15 15 0 0 1 ${f(bx + 15)} ${f(by + 8)}Z" fill="${r.m}" stroke="${INK}" stroke-width="1.4" transform="rotate(${sx * 28} ${f(bx)} ${f(by + 8)})"/>` + `<circle cx="${f(bx)}" cy="${f(by + 8)}" r="3" fill="${MATS.steel.m}" stroke="${INK}" stroke-width="1"/>`; }
  g += beam(c, [61, 22], [61, 18], 26, M('steel'), { rivets: false });
  g += solid(c, circ(61, cy, R, 36), o, { w: 1.7 }) + `<circle cx="61" cy="${cy}" r="40" fill="${cr.l}" stroke="${INK}" stroke-width="1.5"/>`;
  for (let i = 0; i < 12; i++) { const a = rad(i * 30); g += line2([61 + Math.cos(a) * 33, cy + Math.sin(a) * 33], [61 + Math.cos(a) * 38, cy + Math.sin(a) * 38], i % 3 ? 1 : 2); }
  const mA = ang((c.t * 140) % 360), hA = ang((c.t * 11 + 70) % 360);
  g += bar([61, cy], [61 + Math.cos(hA) * 20, cy + Math.sin(hA) * 20], 3.4, INK, null) + bar([61, cy], [61 + Math.cos(mA) * 31, cy + Math.sin(mA) * 31], 2.2, INK, null) + `<circle cx="61" cy="${cy}" r="3.2" fill="${r.m}" stroke="${INK}" stroke-width="1"/>`;
  return g + '</g>'; });

/* ======================= P ======================= */
/* P — a lamp for the bowl */
define('P', 108, ['yellow', 'steel', 'orange'], c => { const [y, s, o] = c.M;
  return bulb(c, 72, 40, 25, { rot: 90, glow: c.on ? 1 : .6 }) + girder(c, [20, 12], [20, 140], 15, s) + pipe(c, [[26, 40], [40, 40]], 6, o, { collars: [1] }); });

/* P — a ship's wheel */
define('P', 108, ['brown', 'steel', 'orange'], c => { const [w, s, o] = c.M, rot = c.t * 40, cx = 68, cy = 42, R = 22;
  let g = girder(c, [20, 12], [20, 140], 15, s);
  for (let k = 0; k < 8; k++) { const a = rad(rot + k * 45), p = [cx + Math.cos(a) * (R + 10), cy + Math.sin(a) * (R + 10)]; g += bar([cx, cy], p, 3.4, w.m, w.l) + ball(c, p[0], p[1], 3.8, o); }
  g += pipe(c, ringPts(cx, cy, R, R).concat([[cx + R, cy]]), 3.8, o, { ticks: false });
  return g + gear(c, cx, cy, 9, 8, 0, M('steel'), { depth: .22 }); });

/* ======================= Q ======================= */
/* Q — a magnifying glass over a small gear */
define('Q', 126, ['brown', 'steel', 'orange'], c => { const [w, s, o] = c.M;
  let g = pipe(c, [[96, 108], [118, 138]], 7.5, w, { cap: 'round' }) + pipe(c, [[90, 100], [98, 112]], 5, s, { ticks: false });
  g += `<circle cx="60" cy="77" r="52" fill="${GLASS}" fill-opacity=".35"/>` + gear(c, 60, 77, 30, 11, 1, o, { depth: .2, spokes: 3 });
  g += `<circle cx="60" cy="77" r="52" fill="${GLASS}" fill-opacity=".28"/><path d="M26 56A38 38 0 0 1 52 36" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
  return g + pipe(c, ringPts(60, 77, 54, 54).concat([[114, 77]]), 6.5, s, { collars: [.62] }); });

/* Q — a cable reel with its plug */
define('Q', 126, ['orange', 'dark', 'red'], c => { const [o, d, r] = c.M, st = M('steel');
  let g = solid(c, circ(60, 77, 58, 40), o, { w: 1.7 }) + `<circle cx="60" cy="77" r="50" fill="${MATS.brown.m}" stroke="${INK}" stroke-width="1"/>`;
  for (const rr of [47, 41, 35, 29, 23]) g += `<circle cx="60" cy="77" r="${rr}" fill="none" stroke="${INK}" stroke-width="3.6"/><circle cx="60" cy="77" r="${rr}" fill="none" stroke="${d.m}" stroke-width="2.2" stroke-dasharray="${rr < 30 ? '' : '9 .4'}"/>`;
  g += `<circle cx="60" cy="77" r="16" fill="${o.l}" stroke="${INK}" stroke-width="1.4"/>` + gear(c, 60, 77, 12, 8, 1, st, { depth: .22 });
  g += pipe(c, cat(seg([92, 108], [102, 116], 3), arc(104, 128, 14, 14, -90, 70, 8)), 3.8, d, { cap: 'round', ticks: false });
  const e = [114, 140]; g += solid(c, [[e[0] - 4, e[1] - 6], [e[0] + 10, e[1] - 6], [e[0] + 10, e[1] + 8], [e[0] - 4, e[1] + 8]], r, { w: 1.2, dk: .6 }) + bar([e[0] + 11, e[1] - 2], [e[0] + 18, e[1] - 2], 2.4, st.m, st.l) + bar([e[0] + 11, e[1] + 4], [e[0] + 18, e[1] + 4], 2.4, st.m, st.l);
  return g; });


/*@@END2@@*/
/*@@PART1@@*/
/* ======================= inventive parts ======================= */
const GLASS = '#d5ecf2';
/* light bulb pointing DOWN in its own frame (rot turns it); glows when running */
function bulb(c, cx, cy, r, o = {}) {
  const q = r, g = o.glow != null ? o.glow : (c.on ? 1 : .45);
  const body = `M${f(-.42 * q)} ${f(.9 * q)}A${f(q)} ${f(q)} 0 1 1 ${f(.42 * q)} ${f(.9 * q)}L${f(.34 * q)} ${f(1.4 * q)}L${f(-.34 * q)} ${f(1.4 * q)}Z`;
  let s = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${o.rot || 0})">`;
  s += `<circle r="${f(q * 1.6)}" fill="#f7df60" opacity="${f(g * .3)}"/>`;
  s += `<path d="${body}" fill="#fbeea6" opacity="${f(.5 + .5 * g)}"/><path d="${body}" fill="${GLASS}" opacity=".4"/>` + ink(body, 1.3);
  s += ink(`M${f(-.2 * q)} ${f(1.38 * q)}L${f(-.2 * q)} ${f(.3 * q)}L${f(-.1 * q)} ${f(.08 * q)}L0 ${f(.3 * q)}L${f(.1 * q)} ${f(.08 * q)}L${f(.2 * q)} ${f(.3 * q)}L${f(.2 * q)} ${f(1.38 * q)}`, .8);
  s += `<path d="M${f(-.64 * q)} ${f(-.05 * q)}A${f(.66 * q)} ${f(.66 * q)} 0 0 1 ${f(-.2 * q)} ${f(-.62 * q)}" fill="none" stroke="#fff" stroke-width="${f(q * .14)}" stroke-linecap="round" opacity=".9"/>`;
  s += `<rect x="${f(-.36 * q)}" y="${f(1.4 * q)}" width="${f(.72 * q)}" height="${f(.8 * q)}" fill="${MATS.steel.m}" stroke="${INK}" stroke-width="1.1"/>`;
  for (const k of [1.62, 1.86]) s += line2([-.36 * q, k * q], [.36 * q, k * q], .8);
  s += `<path d="M${f(-.36 * q)} ${f(2.2 * q)}L${f(.36 * q)} ${f(2.2 * q)}L${f(.17 * q)} ${f(2.44 * q)}L${f(-.17 * q)} ${f(2.44 * q)}Z" fill="${MATS.dark.m}" stroke="${INK}" stroke-width=".9"/>`;
  return s + '</g>';
}
const rays = (pts, op = .62, col = '#f7df60') => fillp(pd(pts), col, `opacity="${op}" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"`);

function flask(c, cx, cy, r, liq, lv, o = {}) {
  const id = c.id(), y0 = cy + r * (1 - 2 * lv);
  let top = ''; for (let i = 0; i <= 24; i++) top += (i ? 'L' : 'M') + f(cx - r + 2 * r * i / 24) + ' ' + f(y0 + Math.sin(i * .9 + c.t * 3) * 1.6);
  const lq = top + `L${f(cx + r)} ${f(cy + r + 3)}L${f(cx - r)} ${f(cy + r + 3)}Z`;
  let s = `<clipPath id="${id}"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - .6)}"/></clipPath><g clip-path="url(#${id})">${fillp(lq, liq.m)}${fillp(lq, 'url(#hatch)', 'opacity=".28"')}<path d="${top}" fill="none" stroke="${liq.l}" stroke-width="1.6"/>`;
  for (let k = 0; k < 5; k++) { const u = ((c.t * .35 + k * .21) % 1), bx = cx + (((k * 37) % 11) - 5) / 5 * r * .5, by = cy + r * .85 - u * r * 1.7 * lv; s += `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(1.2 + 1.2 * ((k * 7) % 3) / 2)}" fill="#fff" fill-opacity=".7" stroke="${INK}" stroke-width=".6"/>`; }
  s += `</g><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${GLASS}" fill-opacity=".22" stroke="${INK}" stroke-width="1.5"/>`;
  s += `<path d="M${f(cx - r * .72)} ${f(cy - r * .15)}A${f(r * .74)} ${f(r * .74)} 0 0 1 ${f(cx - r * .2)} ${f(cy - r * .72)}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/>`;
  return s;
}

function flag(c, x, y, w, h, m, amp = 3.4) {
  const N = 9, top = [], bot = []; let s = '';
  for (let i = 0; i <= N; i++) { const u = i / N, dy = Math.sin(u * 5 - c.t * 4) * amp * u; top.push([x + u * w, y + dy]); bot.push([x + u * w, y + h + dy]); }
  for (let i = 0; i < N; i++) { const q = [top[i], top[i + 1], bot[i + 1], bot[i]]; s += face(pd(q), i % 2 ? m.m : m.l); if (i % 2) s += fillp(pd(q), 'url(#hatch)', 'opacity=".4"'); }
  return s + ink(pd(top.concat(bot.slice().reverse())), 1.3);
}

function crate(c, x, y, w, h, m = M('brown')) {
  let s = solid(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], m, { w: 1.3, dk: .8 });
  return s + line2([x + 1.5, y + 1.5], [x + w - 1.5, y + h - 1.5], 1) + line2([x + w - 1.5, y + 1.5], [x + 1.5, y + h - 1.5], 1) + `<rect x="${f(x + 2)}" y="${f(y + 2)}" width="${f(w - 4)}" height="${f(h - 4)}" fill="none" stroke="${INK}" stroke-width=".7"/>`;
}

function smoke(c, x, y, h = 36, n = 5) {
  let s = '';
  for (let k = 0; k < n; k++) { const u = (c.t * .45 + k / n) % 1; s += `<circle cx="${f(x + 9 * u + (k % 2 ? 3 : -3) * u)}" cy="${f(y - h * u)}" r="${f(3 + 8 * u)}" fill="${MATS.cream.l}" stroke="${INK}" stroke-width=".8" opacity="${f(.95 * (1 - u * .9))}"/>`; }
  return s;
}

function flame(c, x, y, w, h, ph = 0) {
  const wob = Math.sin(c.t * 9 + ph) * w * .12, tip = [x + wob * 2, y - h * (1 + .12 * Math.sin(c.t * 7 + ph))];
  const d = `M${f(x - w / 2)} ${f(y)}Q${f(x - w * .6)} ${f(y - h * .5)} ${f(tip[0])} ${f(tip[1])}Q${f(x + w * .6)} ${f(y - h * .5)} ${f(x + w / 2)} ${f(y)}Z`;
  return fillp(d, MATS.orange.l, `stroke="${INK}" stroke-width=".9" stroke-linejoin="round"`) + fillp(`M${f(x - w * .22)} ${f(y)}Q${f(x - w * .2)} ${f(y - h * .4)} ${f(x + wob)} ${f(y - h * .62)}Q${f(x + w * .2)} ${f(y - h * .4)} ${f(x + w * .22)} ${f(y)}Z`, MATS.yellow.l);
}

/* a curved arrow: the Macaulay "this way it turns" mark */
function arrow(c, cx, cy, r, a0, a1, col = MATS.red) {
  const pts = arc(cx, cy, r, r, a0, a1, 14), e = pts[pts.length - 1], p = pts[pts.length - 3], d = unit(sub(e, p)), n = perp(d);
  const head = [add(e, mul(d, 7)), add(e, mul(n, 4.6)), sub(e, mul(n, 4.6))];
  const dd = pd(pts, false);
  return `<path d="${dd}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${col.m}" stroke-width="2.4" stroke-linecap="round"/>` + fillp(pd(head), col.m, `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`);
}
const ringPts = (cx, cy, rx, ry) => arc(cx, cy, rx, ry, 0, 360, 56);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

/* ======================= A  ======================= */
/* A — a step-ladder carrying a pot of paint */
define('A', 100, ['rust', 'steel', 'yellow'], c => { const [r, s, y] = c.M, xr = (yy, x0, x1) => x0 + (140 - yy) / 124 * (x1 - 42 + 0) * 0;
  const L1 = yy => 8 + (140 - yy) / 124 * 34, L2 = yy => 26 + (140 - yy) / 124 * 30;
  let g = beam(c, [90, 140], [61, 18], 7, s, { rivets: false });
  g += bar([8, 140], [42, 16], 5.2, r.m, r.l) + bar([26, 140], [56, 16], 5.2, r.m, r.l);
  for (let yy = 34; yy < 138; yy += 17) g += bar([L1(yy), yy], [L2(yy), yy], 3.2, s.m, s.l);
  g += bar([L2(100), 100], [84, 100], 2.6, s.d, null);
  g += beam(c, [34, 14], [70, 14], 7, y, { rivets: false });
  g += solid(c, [[44, -4], [60, -4], [58, 11], [46, 11]], s, { w: 1.2, dk: .6 }) + `<ellipse cx="52" cy="-4" rx="8" ry="2.4" fill="${MATS.red.m}" stroke="${INK}" stroke-width="1"/><path d="M45 -3Q52 -15 59 -3" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
  return g; });

/* A — two rams, a chain for crossbar, a lamp at the top throwing light */
define('A', 100, ['green', 'steel', 'yellow'], c => { const [g, s, y] = c.M;
  let o = rays([[49, 4], [14, -22], [30, -26]], .5) + rays([[49, 4], [38, -28], [62, -28]], .5) + rays([[49, 4], [68, -26], [86, -22]], .5);
  o += ram(c, [12, 140], [44, 34], 7.5, g, { split: .5 }) + ram(c, [88, 140], [54, 34], 7.5, g, { split: .5 });
  const ch = mkPath(seg([24, 106], [76, 106], 6));
  o += chain(c, ch, s, { pitch: 11 }) + gear(c, 24, 106, 9, 8, 1, y, { depth: .22 }) + gear(c, 76, 106, 9, 8, -1, y, { depth: .22 });
  return o + bulb(c, 49, 22, 12, { rot: 180 }) + arrow(c, 49, 60, 18, 200, 330); });

/* ======================= B ======================= */
/* B — two laboratory flasks bubbling on a spine */
define('B', 96, ['blue', 'steel', 'green'], c => { const [b, s, g] = c.M;
  return girder(c, [20, 12], [20, 140], 15, s) + pipe(c, [[26, 50], [38, 50]], 5, s, { collars: [0] }) + pipe(c, [[26, 112], [36, 112]], 5, s, { collars: [0] })
    + flask(c, 60, 46, 28, g, .6) + flask(c, 62, 108, 32, b, .62) + pipe(c, [[60, 8], [60, 20]], 3, s, { ticks: false }) + beam(c, [60, 8], [60, 6], 12, s, { rivets: false }); });

/* B — two bicycle wheels for the bowls */
define('B', 98, ['red', 'steel', 'orange'], c => { const [r, s, o] = c.M, wheelB = (cx, cy, R, ph) => {
    let g = pipe(c, ringPts(cx, cy, R, R).concat([[cx + R, cy]]), 5, M('dark'), { ticks: false });
    for (let k = 0; k < 10; k++) { const a = rad(c.t * 90 * ph + k * 36); g += bar([cx, cy], [cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3)], 1.1, s.d, s.l); }
    return g + gear(c, cx, cy, 7, 7, ph, o, { depth: .22 }) + `<circle cx="${f(cx + R - 3)}" cy="${f(cy)}" r="1.5" fill="${MATS.red.m}"/>`; };
  return girder(c, [20, 12], [20, 140], 15, r) + wheelB(58, 44, 29, 1) + wheelB(60, 106, 33, -1); });

/* ======================= C ======================= */
/* C — a G-clamp holding a plank */
define('C', 108, ['blue', 'steel', 'brown'], c => { const [b, s, w] = c.M, turn = c.t * 3;
  const frame = mkPath(arc(52, 77, 40, 57, -58, -302, 40));
  let g = beam(c, [70, 49], [102, 49], 17, w, { rivets: false });
  g += solid(c, ribbon(frame, -8, 8, 3), b, { w: 1.5 });
  g += beam(c, [64, 24], [94, 24], 14, b, { rivets: false }) + beam(c, [64, 130], [94, 130], 14, b, { rivets: false });
  g += beam(c, [84, 34], [84, 38], 22, s, { rivets: false });
  g += screw(c, [84, 138], [84, 62], 5, s, { dir: 1, head: false }) + beam(c, [84, 60], [84, 56], 20, s, { rivets: false });
  const hy = 142; g += bar([66 + 8 * Math.sin(turn), hy], [102 - 8 * Math.sin(turn), hy], 3.4, s.m, s.l) + `<circle cx="${f(66 + 8 * Math.sin(turn))}" cy="${hy}" r="3.2" fill="${s.m}" stroke="${INK}" stroke-width="1"/><circle cx="${f(102 - 8 * Math.sin(turn))}" cy="${hy}" r="3.2" fill="${s.m}" stroke="${INK}" stroke-width="1"/>`;
  return g; });

/* C — a hose that sprays */
define('C', 108, ['olive', 'steel', 'blue'], c => { const [o, s, b] = c.M;
  const pts = arc(54, 77, 38, 56, -40, -305, 60);
  let g = '', p0 = pts[0], p1 = pts[pts.length - 1];
  g += pipe(c, pts, 9, o, { collars: [.16, .4, .64, .88] });
  g += solid(c, [add(p0, [-6, -2]), add(p0, [18, -14]), add(p0, [18, 8]), add(p0, [-4, 10])], s, { w: 1.3, dk: .6 }) + hex(c, p0[0] + 20, p0[1] - 3, 6, 0, s);
  for (let k = 0; k < 8; k++) { const u = (c.t * .8 + k / 8) % 1, x = p0[0] + 26 + 46 * u, y = p0[1] - 3 + 26 * u * u - 6 * u; g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.4 - u * .9)}" fill="${b.l}" stroke="${INK}" stroke-width=".8" opacity="${f(1 - u * .6)}"/>`; }
  return g + wheel(c, p1[0] + 4, p1[1] + 2, 10, M('red'), { spin: 1, spokes: 4 }); });

/* ======================= D ======================= */
/* D — a boiler with a fire in it */
define('D', 104, ['rust', 'steel', 'orange'], c => { const [r, s, o] = c.M;
  const outer = cat(seg([20, 14], [44, 14], 2), arc(44, 77, 52, 63, -90, 90, 36), seg([44, 140], [20, 140], 2));
  const inner = cat(seg([36, 30], [44, 30], 2), arc(44, 77, 34, 47, -90, 90, 30), seg([44, 124], [36, 124], 2)).reverse();
  let g = flame(c, 52, 126, 13, 30, 0) + flame(c, 64, 126, 13, 36, 2) + flame(c, 76, 124, 12, 26, 4) + flame(c, 58, 126, 11, 18, 1);
  g += solid(c, outer, r, { holes: [inner], w: 1.6 });
  const mid = mkPath(arc(44, 77, 43, 55, -90, 90, 40)); for (const q of mid.samples(8)) g += `<circle cx="${f(q.p[0])}" cy="${f(q.p[1])}" r="1.5" fill="${r.d}" stroke="${INK}" stroke-width=".5"/>`;
  for (let y = 22; y < 134; y += 9) g += `<circle cx="28" cy="${y}" r="1.5" fill="${r.d}" stroke="${INK}" stroke-width=".5"/>`;
  g += pipe(c, [[44, 14], [44, 2]], 3.6, s, { ticks: false }) + beam(c, [44, 3], [44, 1], 12, o, { rivets: false }) + smoke(c, 52, -2, 30, 4);
  return g + gauge(c, 96, 40, 7, c.t); });

/* D — a bow and its arrow, drawn back and let go */
define('D', 104, ['orange', 'steel', 'red'], c => { const [o, s, r] = c.M, k = c.on ? .5 + .5 * Math.sin(c.t * 2.2) : .25, pull = 16 * k, P = [26 - pull, 77];
  const bow = arc(26, 77, 62, 63, -90, 90, 30);
  let g = pipe(c, bow, 6, o, { collars: [.5] });
  g += `<path d="M26 14L${f(P[0])} ${f(P[1])}L26 140" fill="none" stroke="${INK}" stroke-width="3"/><path d="M26 14L${f(P[0])} ${f(P[1])}L26 140" fill="none" stroke="#f1e6c4" stroke-width="1.4"/>`;
  const tip = [P[0] + 80, 77];
  g += bar([P[0], 77], tip, 2.6, MATS.brown.m, MATS.brown.l) + fillp(pd([add(tip, [12, 0]), add(tip, [-2, -5.5]), add(tip, [-2, 5.5])]), s.m, `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`);
  for (const dy of [-1, 1]) g += fillp(pd([[P[0], 77], [P[0] + 14, 77 + dy * 7], [P[0] + 16, 77 + dy * 7], [P[0] + 7, 77]]), r.m, `stroke="${INK}" stroke-width=".9" stroke-linejoin="round"`);
  return g; });

/* ======================= E ======================= */
/* E — three lamps on arms */
define('E', 96, ['yellow', 'steel', 'orange'], c => { const [y, s, o] = c.M;
  let g = girder(c, [20, 12], [20, 140], 15, s);
  for (const [yy, len] of [[20, 40], [78, 30], [132, 40]]) g += pipe(c, [[26, yy], [26 + len, yy]], 4.5, o, { collars: [0, 1] }) + bulb(c, 26 + len + 14, yy, 11, { rot: 90 });
  return g; });

/* E — a plug with three pins and a cable */
define('E', 100, ['red', 'steel', 'dark'], c => { const [r, s, d] = c.M, sp = c.on && Math.sin(c.t * 25) > .1;
  let g = pipe(c, cat(seg([14, 108], [14, 126], 3), arc(2, 126, 12, 16, 0, 90, 8), seg([2, 142], [-12, 142], 2)), 4, d, { cap: 'round', ticks: false });
  g += solid(c, [[8, 12], [32, 12], [32, 140], [8, 140]], r, { w: 1.6 });
  for (const yy of [24, 77, 130]) g += pipe(c, [[32, yy], [76, yy]], 5.5, s, { cap: 'round', collars: [0] });
  if (sp) for (const yy of [24, 130]) g += ink(`M82 ${yy}l5 -6l-2 5l7 -3l-4 6l5 -1`, 1.3);
  return g + `<rect x="13" y="56" width="14" height="42" rx="3" fill="${r.l}" stroke="${INK}" stroke-width="1"/>`; });

/* ======================= F ======================= */
/* F — a flagpole flying two flags */
define('F', 98, ['red', 'steel', 'blue'], c => { const [r, s, b] = c.M;
  return girder(c, [20, 22], [20, 140], 13, s) + `<circle cx="20" cy="14" r="6" fill="${MATS.yellow.l}" stroke="${INK}" stroke-width="1.3"/>` + flag(c, 27, 22, 62, 30, r) + flag(c, 27, 74, 44, 26, b); });

/* F — a forklift mast carrying a crate */
define('F', 98, ['orange', 'steel', 'brown'], c => { const [o, s, w] = c.M, bob = c.on ? 4 * Math.sin(c.t * 2) : 0;
  return girder(c, [20, 12], [20, 134], 15, o) + crate(c, 34, -2 + bob, 30, 22, w) + beam(c, [27, 22 + bob], [76, 22 + bob], 5, s, { rivets: false }) + beam(c, [27, 80], [62, 80], 5, s, { rivets: false })
    + wheel(c, 20, 128, 14, M('dark'), { spin: 1, spokes: 5 }); });

/* ======================= G ======================= */
/* G — a micrometer: C frame, thimble and sleeve */
define('G', 112, ['green', 'steel', 'orange'], c => { const [g1, s, o] = c.M, tick = ((c.t * 8) % 4.4 + 4.4) % 4.4;
  const frame = mkPath(arc(52, 77, 42, 58, -34, -326, 50));
  let g = solid(c, ribbon(frame, -7, 7, 3), g1, { w: 1.5 });
  g += beam(c, [60, 88], [38, 88], 10, s, { rivets: false }) + beam(c, [102, 88], [60, 88], 17, o, { rivets: false });
  for (let x = 62 - 4.4 + tick; x < 100; x += 4.4) if (x > 62) g += line2([x, 80.5], [x, 95.5], .8);
  g += beam(c, [108, 88], [102, 88], 22, s, { rivets: false });
  return g + beam(c, [38, 84], [34, 84], 12, s, { rivets: false }); });

/* G — a curved conveyor carrying parcels round */
define('G', 112, ['orange', 'steel', 'brown'], c => { const [o, s, w] = c.M;
  const path = mkPath(arc(54, 77, 42, 58, -36, -344, 70));
  let g = solid(c, ribbon(path, -9, 9, 3), o, { w: 1.5 }), cl = '', off = (c.t * 14) % 8;
  for (let t = off; t < path.L; t += 8) { const q = path.at(t); cl += 'M' + f(q.p[0] + q.n[0] * 7.5) + ' ' + f(q.p[1] + q.n[1] * 7.5) + 'L' + f(q.p[0] - q.n[0] * 7.5) + ' ' + f(q.p[1] - q.n[1] * 7.5); }
  g += ink(cl, .9, 'opacity=".75"') + beam(c, [66, 90], [102, 90], 11, s) + hex(c, 66, 90, 7, 0, s);
  for (let k = 0; k < 5; k++) { const q = path.at((k * path.L / 5 + c.t * 16) % path.L); g += crate(c, q.p[0] - 7, q.p[1] - 16, 14, 14, M(k % 2 ? 'brown' : 'cream')); }
  return g; });

/* ======================= H ======================= */
/* H — two factory chimneys joined by a pipe bridge */
define('H', 104, ['rust', 'steel', 'yellow'], c => { const [r, s, y] = c.M, chim = x => {
    let g = solid(c, [[x - 11, 140], [x + 11, 140], [x + 8, 20], [x - 8, 20]], r, { w: 1.5 });
    for (let yy = 32; yy < 138; yy += 7) g += line2([x - 10 + (140 - yy) * .02, yy], [x + 10 - (140 - yy) * .02, yy], .6);
    return g + solid(c, [[x - 10, 20], [x + 10, 20], [x + 10, 12], [x - 10, 12]], M('dark'), { w: 1.3, dk: .8 }) + smoke(c, x + 2, 8, 34, 4); };
  return chim(20) + chim(84) + pipe(c, [[26, 88], [78, 88]], 7, s, { collars: [0, .5, 1] }) + wheel(c, 52, 74, 9, y, { spin: 1, spokes: 4 }) + pipe(c, [[52, 88], [52, 78]], 2.5, s, { ticks: false }); });

/* H — two pistons and a flywheel */
define('H', 104, ['green', 'steel', 'orange'], c => { const [g1, s, o] = c.M, ph = x => 14 + 11 * Math.sin(c.t * 3 + x);
  let g = '';
  for (const x of [22, 82]) { const top = ph(x); g += pipe(c, [[x, 62], [x, top + 4]], 4, s, { ticks: false }) + beam(c, [x, top + 4], [x, top], 26, o, { rivets: false }) + pipe(c, [[x, 56], [x, 140]], 11, g1, { collars: [0, .22] }); }
  g += pipe(c, [[22, 100], [82, 100]], 4.5, s, { ticks: false });
  return g + gear(c, 52, 100, 17, 12, 1, o, { spokes: 4, depth: .2, rim: .62 }); });


/*@@END1@@*/

Object.assign(parts, { bulb, rays, flask, flag, crate, smoke, flame, flameDown, arrow, ball, dish, polyBar, ringPts, rrect });
Object.assign(parts, { taper, cone, beltOver, roundedLoop, candle, drum, screwdriver, chisel, sawBlade, signBoard, cloth, fish, cabin, loco, coolingTower, mountain, tower2, spannerHead, hullBoat, lamp2 });

/* --------------------------------------------------------- scene / layout */
const rnd = n => { let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const LINE_H = 186, TOP = -26, BOT = 160;

function glyphFor(ch) {
  const nf = ch.toUpperCase().normalize('NFD'), base = nf[0], mark = nf[1] && /[̀-ͯ]/.test(nf[1]) ? nf[1] : null;
  const vs = GL[base] || GL[ch];
  return vs ? { vs, ch: base, mark } : null;
}

function build(text, o = {}) {
  o = Object.assign({ gap: 4, jitter: 1.3, palette: 'cover', seed: 3, depth: 1, variant: 'mix', vsel: {} }, o);
  const seen = {}, pickFresh = (ch, nv, h) => { const u = seen[ch] || (seen[ch] = []); let v = h % nv; for (let k = 0; k < nv && u.includes(v); k++) v = (v + 1) % nv; if (u.length >= nv) u.length = 0; u.push(v); return v; };
  const lines = String(text).split('\n'), rows = [];
  let idx = 0, maxW = 0;
  lines.forEach((ln, li) => {
    let x = 0; const row = [];
    for (const chr of ln) {
      const gg = glyphFor(chr); if (!gg) continue;
      const r1 = rnd(idx * 7 + o.seed), r2 = rnd(idx * 13 + o.seed + 5), r3 = rnd(idx * 5 + o.seed + 9), nv = gg.vs.length;
      let vi = o.vsel[idx] != null ? o.vsel[idx] % nv : o.variant === 'mix' ? pickFresh(gg.ch, nv, Math.floor(rnd(idx * 3 + o.seed + 1) * 97)) : (+o.variant || 0) % nv;
      const def = gg.vs[vi];
      row.push({ i: idx, ch: gg.ch, vs: gg.vs, vi, def, mark: gg.mark, x, y: li * LINE_H + (r2 - .5) * 16 * o.jitter, rot: (r1 - .5) * 6 * o.jitter, sc: 1 + (r3 - .5) * .16 * o.jitter, t0: r1 * 8, t: 0, v: 0, latched: false, hover: false });
      x += def.w * (1 + (r3 - .5) * .16 * o.jitter) + o.gap; idx++;
    }
    const w = x - o.gap; maxW = Math.max(maxW, w); rows.push({ row, w });
  });
  const letters = [], cyc = Array.isArray(o.palette) ? o.palette : PALETTES[o.palette];
  rows.forEach(({ row, w }) => row.forEach(L => {
    L.x += (maxW - w) / 2;
    let pal = L.def.pal.slice();
    if (cyc) pal = [cyc[L.i % cyc.length], pal[1], cyc[(L.i + 1) % cyc.length]];
    L.pal = pal; letters.push(L);
  }));
  return { letters, width: maxW, height: (lines.length - 1) * LINE_H + BOT - TOP, opts: o };
}

const PROP_KINDS = ['gear', 'bolt', 'nut', 'arrow', 'spark', 'drop', 'ball', 'screw', 'spring', 'ring'];
function propsSvg(sc, uidBase) {
  const o = sc.opts, W = sc.width, H = sc.height, out = [], n = Math.max(6, Math.round(W / 70));
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i * 17 + o.seed + 3), r2 = rnd(i * 29 + o.seed + 7), r3 = rnd(i * 11 + o.seed + 1), r4 = rnd(i * 5 + o.seed + 13);
    const x = (i + .15 + r1 * .7) * W / n, rowCount = Math.round((H - (BOT - TOP)) / 188) + 1, top = r2 > .45;
    const y = top ? TOP - 2 - r3 * 8 : (sc.height + TOP) + 4 + r3 * 8;
    out.push({ kind: PROP_KINDS[Math.floor(r4 * PROP_KINDS.length)], x, y, sz: 5.5 + r3 * 5, rot: r1 * 360, i });
  }
  const c = { uid: uidBase, t: 0, on: false, D: [3.4 * (o.depth == null ? 1 : o.depth), -2.8 * (o.depth == null ? 1 : o.depth)], M: [], n: 0, id() { return this.uid + '_' + (++this.n); } };
  const cols = ['yellow', 'orange', 'red', 'blue', 'green', 'teal', 'brass', 'steel'];
  let g = '';
  for (const p of out) {
    const m = M(cols[(p.i * 3 + Math.floor(p.rot)) % cols.length]);
    let inner = '';
    if (p.kind === 'gear') inner = gear(c, 0, 0, p.sz, 8, 0, m, { depth: .22, hubSize: p.sz * .26 });
    else if (p.kind === 'bolt') inner = hex(c, 0, 0, p.sz * .8, 0, m, { dk: .8 }) + bar([0, p.sz * .8], [0, p.sz * 2.2], p.sz * .5, M('steel').m, null);
    else if (p.kind === 'nut') inner = solid(c, circ(0, 0, p.sz * .85, 6), m, { w: 1.2, dk: .7, holes: [circ(0, 0, p.sz * .38, 12).reverse()] });
    else if (p.kind === 'arrow') inner = arrow(c, 0, 0, p.sz * 1.3, 200, 330, m);
    else if (p.kind === 'spark') inner = ink('M0 ' + -p.sz + 'L' + p.sz * .25 + ' ' + -p.sz * .25 + 'L' + p.sz + ' 0L' + p.sz * .25 + ' ' + p.sz * .25 + 'L0 ' + p.sz + 'L' + -p.sz * .25 + ' ' + p.sz * .25 + 'L' + -p.sz + ' 0L' + -p.sz * .25 + ' ' + -p.sz * .25 + 'Z', 1.2).replace('fill="none"', 'fill="' + MATS.yellow.l + '"');
    else if (p.kind === 'drop') inner = fillp('M0 ' + -p.sz + 'Q' + p.sz * .9 + ' 0 0 ' + p.sz * .8 + 'Q' + -p.sz * .9 + ' 0 0 ' + -p.sz + 'Z', MATS.blue.m, 'stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"') + '<ellipse cx="' + -p.sz * .25 + '" cy="' + -p.sz * .1 + '" rx="' + p.sz * .12 + '" ry="' + p.sz * .25 + '" fill="#fff" opacity=".8"/>';
    else if (p.kind === 'ball') inner = ball(c, 0, 0, p.sz * .7, m);
    else if (p.kind === 'screw') inner = screw(c, [-p.sz * 1.2, 0], [p.sz * 1.2, 0], p.sz * .38, M('steel'), { head: true });
    else if (p.kind === 'spring') inner = spring(c, [-p.sz * 1.3, 0], [p.sz * 1.3, 0], p.sz * .6, 5, M('steel'));
    else inner = pipe(c, circ(0, 0, p.sz * .8, 20).concat([[p.sz * .8, 0]]), p.sz * .26, m, { ticks: false });
    g += '<g transform="translate(' + f(p.x) + ' ' + f(p.y) + ') rotate(' + f(p.kind === 'arrow' || p.kind === 'drop' ? p.rot * .2 : p.rot) + ')">' + inner + '</g>';
  }
  return g;
}
function drawLetter(L, sceneOpts, on) {
  const k = sceneOpts.depth == null ? 1 : sceneOpts.depth;
  const c = { uid: 'L' + L.i, t: L.t0 + L.t, on: !!on, D: [6 * k, -5 * k], M: L.pal.map(M), n: 0, id() { return this.uid + '_' + (++this.n); } };
  let s = L.def.draw(c);
  if (L.mark) s += accent(c, L.mark, L.def.w);
  return s;
}
const letterTransform = L => `translate(${f(L.x)} ${f(L.y)}) rotate(${f(L.rot)} ${f(L.def.w / 2)} 80) scale(${f(L.sc)})`;

function defsSvg(wob) {
  let g = '';
  for (const n in MATS) { const m = MATS[n]; g += '<linearGradient id="g-' + n + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m.l + '"/><stop offset=".55" stop-color="' + m.l + '"/><stop offset=".55" stop-color="' + m.m + '"/><stop offset="1" stop-color="' + m.m + '"/></linearGradient>'; }
  const ln = (id, w, h, rot, body) => '<pattern id="' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse"' + (rot ? ' patternTransform="rotate(' + rot + ')"' : '') + '>' + body + '</pattern>';
  const st = (op, w) => 'stroke="' + INK + '" stroke-width="' + w + '" opacity="' + op + '" fill="none"';
  return '<defs>' + g
    + ln('hatch', 2.4, 2.4, 38, '<line x1="0" y1="0" x2="0" y2="2.4" ' + st(.85, .55) + '/>')
    + ln('hatchL', 3.2, 3.2, -38, '<line x1="0" y1="0" x2="0" y2="3.2" ' + st(.6, .45) + '/>')
    + ln('tex-wood', 26, 12, 0, '<path d="M0 2.5C6 1 12 4 26 2.5M0 6.5C8 8 14 5 26 6.5M0 10C5 9 13 11 26 10" ' + st(.5, .5) + '/><ellipse cx="19" cy="6.4" rx="2.4" ry="1.4" ' + st(.55, .5) + '/>')
    + ln('tex-brick', 18, 9, 0, '<path d="M0 .3H18M0 4.8H18M0 .3V4.8M9 4.8V9M18 .3V4.8" ' + st(.6, .55) + '/>')
    + ln('tex-corr', 3, 3, 0, '<line x1="0" y1="0" x2="3" y2="0" ' + st(.5, .6) + '/>')
    + ln('tex-metal', 40, 6, 0, '<path d="M0 1.2H17M22 3.4H40M6 5H26" ' + st(.28, .5) + '/>')
    + ln('tex-weave', 5, 5, 45, '<path d="M0 0V5M2.5 0V5" ' + st(.55, .55) + '/>')
    + ln('dots', 3.4, 3.4, 0, '<circle cx="1.2" cy="1.2" r=".5" fill="' + INK + '" opacity=".6"/>')
    + '<filter id="hand" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">'
    + '<feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="4" result="w"/>'
    + '<feDisplacementMap id="wob" in="SourceGraphic" in2="w" scale="' + wob + '" xChannelSelector="R" yChannelSelector="G" result="d"/>'
    + '<feTurbulence type="fractalNoise" baseFrequency=".055" numOctaves="2" seed="21" result="w2"/>'
    + '<feDisplacementMap id="wob2" in="SourceGraphic" in2="w2" scale="' + (wob * 1.5).toFixed(2) + '" xChannelSelector="G" yChannelSelector="R" result="d2"/>'
    + '<feColorMatrix in="d2" type="matrix" values="0 0 0 0 .17  0 0 0 0 .13  0 0 0 0 .09  -1.6 -1.6 -1.6 0 1.18" result="i0"/>'
    + '<feComposite in="i0" in2="d2" operator="in" result="ink2"/>'
    + '<feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="11" result="n1"/>'
    + '<feColorMatrix in="n1" type="matrix" values=".34 0 0 0 .80  .34 0 0 0 .80  .34 0 0 0 .80  0 0 0 0 1" result="grain"/>'
    + '<feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="3" seed="7" result="n2"/>'
    + '<feColorMatrix in="n2" type="matrix" values=".42 0 0 0 .76  .42 0 0 0 .76  .42 0 0 0 .76  0 0 0 0 1" result="blot"/>'
    + '<feBlend in="d" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/>'
    + '<feComposite in="g2" in2="d" operator="in" result="g3"/>'
    + '<feMerge><feMergeNode in="g3"/><feMergeNode in="ink2"/></feMerge>'
    + '</filter>'
    + '<filter id="paperfx" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
    + '<feTurbulence type="fractalNoise" baseFrequency=".75 .6" numOctaves="4" seed="3" result="t"/>'
    + '<feColorMatrix in="t" type="matrix" values="0 0 0 0 .40  0 0 0 0 .31  0 0 0 0 .18  1.0 0 0 0 -.56"/>'
    + '</filter>'
    + '<filter id="fibres" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
    + '<feTurbulence type="fractalNoise" baseFrequency=".006 .22" numOctaves="3" seed="15" result="t"/>'
    + '<feColorMatrix in="t" type="matrix" values="0 0 0 0 .55  0 0 0 0 .44  0 0 0 0 .27  0 .8 0 0 -.42"/>'
    + '</filter>'
    + '<radialGradient id="vign" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#7a5a2c" stop-opacity="0"/><stop offset="1" stop-color="#7a5a2c" stop-opacity=".30"/></radialGradient>'
    + '</defs>';
}
function render(text, opts = {}) {
  const sc = build(text, opts), pad = 24, wob = opts.wobble == null ? 1.6 : opts.wobble;
  const vb = [-pad, TOP - pad, sc.width + pad * 2, sc.height + pad * 2];
  let body = '';
  if (opts.props) body += '<g class="props" filter="url(#hand)" pointer-events="none">' + propsSvg(sc, 'P') + '</g>';
  sc.letters.forEach(L => { body += `<g class="L" data-i="${L.i}" transform="${letterTransform(L)}" filter="url(#hand)"><g class="in">${drawLetter(L, sc.opts, false)}</g><rect class="hit" x="-4" y="${TOP}" width="${L.def.w + 8}" height="${BOT - TOP}" fill="transparent"/></g>`; });
  const paper = opts.paper && opts.paper !== 'none' ? (PAPERS[opts.paper] || opts.paper) : null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(f).join(' ')}" width="${f(vb[2])}" height="${f(vb[3])}" style="fill:#000;stroke:none;stroke-width:1">${defsSvg(wob)}${(opts.transparent || !paper) ? '' : `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${paper}"/><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" filter="url(#fibres)" opacity=".3"/><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" filter="url(#paperfx)" opacity=".35"/><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="url(#vign)"/>`}${body}</svg>`;
  return { svg, scene: sc, vb };
}

/* ------------------------------------------------------- PNG export (transparent) */
const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = ~0; for (let i = 0; i < u8.length; i++) c = crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (~c) >>> 0; };
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
  for (const fl of files) {
    const nm = enc.encode(fl.name), crc = crc32(fl.data), sz = fl.data.length, lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(lh.buffer), nm, fl.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    cd.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + sz;
  }
  let cdl = 0; cd.forEach(p => cdl += p.length);
  const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdl, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...cd, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
const rasterize = (svg, w, h) => new Promise((res, rej) => { const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(im, 0, 0, w, h); res(cv); }; im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
function trimAlpha(cv, margin) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, d = ctx.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return cv;
  x0 = Math.max(0, x0 - margin); y0 = Math.max(0, y0 - margin); x1 = Math.min(W - 1, x1 + margin); y1 = Math.min(H - 1, y1 + margin);
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(cv, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o;
}
const canvasBlob = cv => new Promise(res => cv.toBlob(res, 'image/png'));
/* one letter, upright, on a transparent canvas, cropped to its ink */
async function letterPNG(L, sceneOpts, scale = 4, wob = 1.6) {
  const pad = 14, w = L.def.w + pad * 2, h = BOT - TOP, on = L.v > .02 || L.latched;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [-pad, TOP, w, h].join(' ') + '" width="' + w * scale + '" height="' + h * scale + '" style="fill:#000;stroke:none;stroke-width:1">' + defsSvg(wob) + '<g filter="url(#hand)">' + drawLetter(L, sceneOpts, on) + '</g></svg>';
  return trimAlpha(await rasterize(svg, Math.round(w * scale), Math.round(h * scale)), Math.round(scale * 2));
}

/* ------------------------------------------------------------------ mount */
const CSS = `
:root{--paper:#f4ecd7;--ink:#2b2117;--muted:#8a7c64;--rule:#ddd0b4}
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{background:var(--paper);color:var(--ink);font:13px/1.4 "Georgia",serif;display:flex;flex-direction:column;align-items:center;padding:20px 16px 32px}
.ml-head{width:100%;max-width:1100px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;color:var(--muted);font-style:italic}
.ml-head b{color:var(--ink);font-style:normal;font-size:15px;letter-spacing:.03em}
#ml-stage{width:100%;max-width:1100px;margin:6px 0 10px;touch-action:manipulation}
#ml-stage svg{width:100%;height:auto;display:block;user-select:none}
#ml-stage .L{cursor:pointer}
.ml-ctl{width:100%;max-width:1100px;display:flex;flex-wrap:wrap;gap:14px 26px;align-items:center;border-top:1px solid var(--rule);padding-top:14px}
.ml-ctl label{color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase;display:flex;flex-direction:column;gap:5px}
.ml-ctl select{font:inherit;font-size:14px;padding:4px 8px;border:1.5px solid var(--ink);border-radius:8px;background:transparent;color:var(--ink)}
.ml-ctl input[type=text]{font:inherit;font-size:18px;padding:4px 10px;border:1.5px solid var(--ink);border-radius:8px;background:transparent;color:var(--ink);width:min(300px,80vw);letter-spacing:.08em;text-transform:uppercase}
.ml-ctl input[type=range]{accent-color:var(--ink);width:150px}
.ml-ctl button{font:inherit;color:var(--ink);background:transparent;border:1.5px solid var(--ink);border-radius:999px;padding:5px 14px;cursor:pointer}
.ml-ctl button:hover{background:#2b211711}
.ml-sw{display:flex;gap:7px}.ml-sw button{width:24px;height:24px;padding:0;border-radius:50%}.ml-sw button[aria-pressed=true]{outline:2px solid var(--ink);outline-offset:2px}
.ml-foot{margin-top:12px;color:var(--muted);font-style:italic;font-size:12px;text-align:center}`;

function mount(el, cfg = {}) {
  if (typeof el === 'string') el = document.querySelector(el);
  const q = new URLSearchParams(location.search);
  const st = Object.assign({ text: 'JOUONS', palette: 'cover', paper: 'cream', wobble: 1.6, jitter: 1.3, depth: 1, seed: 3, variant: 'mix', vsel: {}, props: cfg.chrome !== false }, cfg);
  if (q.has('text')) st.text = q.get('text');
  if (q.has('palette')) st.palette = q.get('palette');
  if (q.has('paper')) st.paper = q.get('paper');
  if (q.has('wobble')) st.wobble = +q.get('wobble');
  if (q.has('seed')) st.seed = +q.get('seed');
  if (q.has('variant')) st.variant = q.get('variant');
  if (q.has('props')) st.props = q.get('props') === '1';
  const ui = cfg.chrome !== false;           // chrome:false = no built-in controls, `el` is the bare stage (host builds its own UI)
  if (ui) { const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style); }
  if (ui) el.innerHTML = `<div class="ml-head"><b>${st.title || 'Machine Letters'}</b><span>${st.hint || 'survolez / cliquez une lettre pour la mettre en marche · maj+clic : changer son dessin'}</span></div>
    <div id="ml-stage"></div>
    <div class="ml-ctl">
      <label>Mot<input id="ml-text" type="text" value="" maxlength="26" spellcheck="false"></label>
      <label>Tremblé du trait<input id="ml-wob" type="range" min="0" max="4" step=".1" value="${st.wobble}"></label>
      <label>Fantaisie<input id="ml-jit" type="range" min="0" max="2.4" step=".1" value="${st.jitter}"></label>
      <label>Profondeur<input id="ml-depth" type="range" min="0" max="1.8" step=".1" value="${st.depth}"></label>
      <label>Dessins<select id="ml-var"><option value="mix">Mélange</option><option value="0">Série 1 (classique)</option><option value="1">Série 2</option><option value="2">Série 3</option><option value="3">Série 4</option><option value="4">Série 5</option><option value="5">Série 6</option></select></label>
      <label>Détails autour<button id="ml-props" aria-pressed="true" style="min-width:56px">Oui</button></label>
      <label>Couleurs<div class="ml-sw" id="ml-pal"></div></label>
      <label>Fond d’aperçu (hors export)<div class="ml-sw" id="ml-paper"></div></label>
      <button id="ml-all">Tout mettre en marche</button><button id="ml-re">Autre composition</button><button id="ml-svg">SVG</button><button id="ml-png">PNG du mot</button><button id="ml-zip">Lettres en PNG (.zip)</button>
    </div><div class="ml-foot">${st.foot || ''}</div>`;
  const stage = ui ? el.querySelector('#ml-stage') : el, inp = ui ? el.querySelector('#ml-text') : null;
  if (ui) inp.value = st.text;
  let cur, raf = 0, last = 0;

  function paint() {
    const r = render(st.text, Object.assign({}, st, { paper: null, transparent: true, props: !!st.props }));
    stage.innerHTML = r.svg; cur = r.scene;
    if (ui) document.documentElement.style.setProperty('--paper', PAPERS[st.paper] || st.paper);
    cur.letters.forEach(L => { L.el = stage.querySelector(`.L[data-i="${L.i}"] .in`); });
    if (q.get('on') === '1') cur.letters.forEach(L => { L.latched = true; L.v = 1; });
    if (q.has('t')) cur.letters.forEach(L => { L.t = +q.get('t'); L.el.innerHTML = drawLetter(L, cur.opts, L.latched); });
    kick();
  }
  const draw = L => { L.el.innerHTML = drawLetter(L, cur.opts, L.v > .02 || L.latched); };
  function step(dt) {
    let any = false;
    cur.letters.forEach(L => {
      const target = L.latched || L.hover ? 1 : 0;
      L.v += (target - L.v) * Math.min(1, dt * 4.5);
      if (!target && L.v < .01) { if (L.v > 0) { L.v = 0; draw(L); } return; }
      L.t += dt * L.v; draw(L); any = true;
    });
    return any;
  }
  function tick(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; raf = step(dt) ? requestAnimationFrame(tick) : 0; }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  const find = e => { const g = e.target.closest && e.target.closest('.L'); return g ? cur.letters[+g.dataset.i] : null; };
  stage.addEventListener('pointerover', e => { const L = find(e); if (L && e.pointerType !== 'touch') { L.hover = true; kick(); } });
  stage.addEventListener('pointerout', e => { const L = find(e); if (L) { L.hover = false; kick(); } });
  stage.addEventListener('pointerdown', e => { const L = find(e); if (!L) return; if (e.shiftKey) { st.vsel[L.i] = (L.vi + 1) % L.vs.length; paint(); } else { L.latched = !L.latched; kick(); } });
  const svgText = () => stage.querySelector('svg').outerHTML.replace(/ class="[^"]*"/g, '');
  const png = (w = 2400) => new Promise(res => { const s = stage.querySelector('svg'), vb = s.viewBox.baseVal, im = new Image(), k = w / vb.width;
    im.onload = () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = Math.round(vb.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/png')); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText()); });
  const dl = (name, href) => { const a = document.createElement('a'); a.download = name; a.href = href; a.click(); };
  const api = { st, paint, step, kick, svg: svgText, png, get letters() { return cur.letters; },
    set(patch) { Object.assign(st, patch); if ('text' in patch || 'jitter' in patch || 'variant' in patch || 'palette' in patch || 'paper' in patch || 'seed' in patch || 'props' in patch) { if ('variant' in patch || 'seed' in patch) st.vsel = {}; paint(); } if ('wobble' in patch) { const w = stage.querySelector('#wob'), w2 = stage.querySelector('#wob2'); if (w) w.setAttribute('scale', st.wobble); if (w2) w2.setAttribute('scale', (st.wobble * 1.5).toFixed(2)); } if ('depth' in patch) { cur.opts.depth = st.depth; cur.letters.forEach(draw); } },
    redraw() { cur.letters.forEach(draw); },
    /* freeze every letter in a running (or resting) pose at animation time t */
    pose({ on = true, t = 2.3 } = {}) { cur.letters.forEach(L => { L.latched = !!on; L.v = on ? 1 : 0; L.t = t; }); cur.letters.forEach(draw); },
    reshuffle() { st.seed = (st.seed * 7 + 5) % 97; st.vsel = {}; paint(); },
    runAll(on) { const any = on == null ? cur.letters.some(L => L.latched) : !on; cur.letters.forEach(L => L.latched = !any); kick(); return !any; },
    saveSVG() { dl('machine-letters.svg', URL.createObjectURL(new Blob([svgText()], { type: 'image/svg+xml' }))); },
    async savePNG(w) { dl('machine-letters.png', await png(w)); },
    /* one transparent PNG per letter (blobs), cropped to the ink */
    async lettersPNG(scale = 4) { const out = []; let i = 0; for (const L of cur.letters) { if (L.ch === ' ') { i++; continue; } const cv = await letterPNG(L, cur.opts, scale, st.wobble); out.push({ name: String(++i).padStart(2, '0') + '-' + (L.ch === '.' ? 'point' : L.ch === '!' ? 'excl' : L.ch === '-' ? 'tiret' : L.ch) + '.png', blob: await canvasBlob(cv), width: cv.width, height: cv.height }); } return out; },
    async saveLettersZip(scale = 4) { const files = []; for (const x of await api.lettersPNG(scale)) files.push({ name: x.name, data: new Uint8Array(await x.blob.arrayBuffer()) }); dl('lettres-machines.zip', URL.createObjectURL(zipStore(files))); } };
  if (!ui) { paint(); return api; }
  inp.oninput = () => { st.text = inp.value || ' '; paint(); };
  el.querySelector('#ml-wob').oninput = e => api.set({ wobble: +e.target.value });
  el.querySelector('#ml-jit').oninput = e => { st.jitter = +e.target.value; paint(); };
  el.querySelector('#ml-depth').oninput = e => { st.depth = +e.target.value; cur.opts.depth = st.depth; cur.letters.forEach(draw); };
  el.querySelector('#ml-var').value = String(st.variant); el.querySelector('#ml-var').onchange = e => { st.variant = e.target.value; st.vsel = {}; paint(); };
  const pb = el.querySelector('#ml-props'); const syncProps = () => { pb.textContent = st.props ? 'Oui' : 'Non'; pb.setAttribute('aria-pressed', String(!!st.props)); }; syncProps(); pb.onclick = () => { st.props = !st.props; syncProps(); paint(); };
  el.querySelector('#ml-all').onclick = () => { const any = cur.letters.some(L => L.latched); cur.letters.forEach(L => L.latched = !any); kick(); };
  el.querySelector('#ml-re').onclick = () => { st.seed = (st.seed * 7 + 5) % 97; st.vsel = {}; paint(); };
  const swatch = (host, items, key, color) => { const box = el.querySelector(host); items.forEach(k => { const b = document.createElement('button'); b.title = k; b.style.background = color(k); b.setAttribute('aria-pressed', st[key] === k); b.onclick = () => { st[key] = k; [...box.children].forEach(x => x.setAttribute('aria-pressed', x === b)); paint(); }; box.appendChild(b); }); };
  swatch('#ml-pal', Object.keys(PALETTES), 'palette', k => k === 'cover' ? 'linear-gradient(120deg,#f4d654 25%,#58964c 25% 50%,#d3714b 50% 75%,#5588b7 75%)' : MATS[PALETTES[k][0]].m);
  swatch('#ml-paper', Object.keys(PAPERS), 'paper', k => PAPERS[k]);
  el.querySelector('#ml-svg').onclick = () => api.saveSVG();
  el.querySelector('#ml-png').onclick = () => api.savePNG();
  el.querySelector('#ml-zip').onclick = () => api.saveLettersZip();
  paint();
  return api;
}

root.MachineLetters = { mount, render, build, define, parts, letterPNG, zipStore, drawLetter, glyphs: GL, MATS, INK, PAPERS, variants: ch => (GL[ch] || []).length };
})(typeof window !== 'undefined' ? window : globalThis);

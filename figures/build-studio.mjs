// Fig 10 · Studio d'extracteurs PDF : une machine à reproduire les clés.
// node figures/build-studio.mjs  →  figures/studio.html
// La clé modèle (le PDF exemple) est serrée à l'arrière, l'ébauche à l'avant. Le pont glisse le long
// des deux lames : le palpeur suit chaque zone tracée sur le modèle, la fraise taille la même
// encoche dans l'ébauche. La clé taillée (l'extracteur) entre dans la serrure de sa famille,
// tourne d'un quart de tour et ouvre son casier. Contour de clé : modèle GLB fourni (key-outline.mjs).
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";
import { FIXED, HOLE, BITTING, THICKNESS } from "./key-outline.mjs";

const WIDTH = 600, HEIGHT = 420;
const PLATE = { x: -128, y: -78, w: 268, d: 134, r: 8 };
const BASE = { x: -110, y: -62, w: 156, d: 104, r: 4 }, BASE_H = 14;
// Clé : coordonnées locales u le long de la lame (pointe en +u), v en travers (denture en +v).
const SCALE = 24, KT = THICKNESS * SCALE * 1.07;
const KEY = { x0: -38, z: BASE_H + 4, tip: 1.784 * SCALE, top: BITTING.top * SCALE, back: BITTING.back * SCALE };
KEY.vc = (KEY.top + KEY.back) / 2;                                 // axe de la lame
const LANES = { master: -24, blank: 18 };                          // y de l'axe v = 0 de chaque clé
const RAIL = { y: -54, z: 22 }, BRIDGE_Z = 48;
const LOCKER = { x: 52, y: -66, w: 78, d: 36, r: 2 }, LOCKER_H = 82, FACE = LOCKER.y + LOCKER.d;
const DOOR = { w: 36, h: 37, th: 1.6, ka: 27, kz: 18 };            // ka, kz : serrure sur la porte
const DOORS = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([c, r]) => ({ x: LOCKER.x + 2 + c * (DOOR.w + 2), z: 3 + (1 - r) * (DOOR.h + 2) }));

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [BASE.x, RAIL.y, BRIDGE_Z + 18], [LOCKER.x + LOCKER.w, LOCKER.y, LOCKER_H + 5], [LOCKER.x + LOCKER.w + 4, FACE + 40, 70]], WIDTH, HEIGHT, { pad: 20, azimuth: 52, elevation: 34 });
const { at, S, L, D, slab, front, right, flat } = tools(P);

// ---------------------------------------------------------------- bâti, rail, lits des clés
function baseSvg() {
  const out = [], b = BASE;
  out.push(`<path class="iso-halo" d="${k.haloOf(b, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(b, 0, BASE_H, 4, 1), { tone: "mid", inner: L(k.sideSeam(b, 4, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(b, 4), BASE_H, P, 3), { tone: "faint" }));
  out.push(D(k.corners(b, 6).map(([x, y]) => at([x, y, BASE_H])), { size: 0.45 }));
  // Rail arrière du pont, avec ses butées, et règle graduée le long de la denture.
  out.push(S(slab({ x: b.x + 4, y: RAIL.y - 3, w: b.w - 8, d: 6, r: 1 }, BASE_H, RAIL.z - BASE_H, 3, 0.5), { tone: "mid" }));
  out.push(L(k.lineOnTop([b.x + 6, RAIL.y], [b.x + b.w - 6, RAIL.y], RAIL.z, P), { tone: "lo" }));
  for (const x of [b.x + 4, b.x + b.w - 8]) out.push(S(slab({ x, y: RAIL.y - 4, w: 4, d: 8, r: 0.8 }, RAIL.z, 4, 2, 0.3), { tone: "mid" }));
  const ticks = k.topTicks(KEY.x0, KEY.x0 + KEY.tip, 2, 5, RAIL.y + 3.4, BASE_H, [1.6, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // Afficheur de la famille sur la face avant ; sélecteur à droite.
  out.push(display(front(b.y + b.d), flat(b.x + 8, 4, b.x + 60, 10.5, 1), { part: "family", x: b.x + 34, y: -5.2, size: 4.8, text: "CERFA" }));
  out.push(S(k.cylinder(b.x + b.w - 16, b.y + b.d - 12, 6, BASE_H, 1, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(b.x + b.w - 16, b.y + b.d - 12, 4.6, BASE_H + 1, 4, P, 32, 0.4), { tone: "mid", inner: L(k.knurl(b.x + b.w - 16, b.y + b.d - 12, 4.6, BASE_H + 1, BASE_H + 5, 30, P), { tone: "faint" }) }));
  out.push(`<g data-part="selector"></g>`);
  return out.join("");
}
// Lit de l'étau sous chaque clé, et butée d'épaulement côté anneau.
function bedSvg(lane) {
  const bed = { x: KEY.x0 - 33, y: lane - 20, w: 80, d: 20 + KEY.top - 0.8, r: 1.2 };
  return S(slab(bed, BASE_H, KEY.z - BASE_H, 3, 0.4), { tone: "lo" }) + D(k.corners(bed, 1.8).map(([x, y]) => at([x, y, KEY.z])), { size: 0.4 });
}
// Bride de serrage posée sur le dos de la lame, près de l'épaulement : vis et molette moletée.
function clampSvg(lane) {
  const x = KEY.x0 + 10, y0 = lane + KEY.back - 3, y1 = lane + 1.4, z = KEY.z + KT;
  const out = [];
  out.push(S(slab({ x: x - 1, y: y0, w: 8, d: 3, r: 0.6 }, KEY.z, KT + 2.6, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x, y: y0, w: 6, d: y1 - y0, r: 0.8 }, z, 2.4, 2, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(x + 3, (y0 + y1) / 2, 2.4, z + 2.4, 3, P, 24, 0.3), { tone: "mid", inner: L(k.knurl(x + 3, (y0 + y1) / 2, 2.4, z + 2.4, z + 5.4, 20, P), { tone: "faint" }) }));
  out.push(D([at([x + 3, y0 + 1.2, z + 2.4])], { size: 0.4 }));
  return out.join("");
}
// Pont mobile : chariot sur le rail, colonne, poutre (dessiné en x = 0).
function bridgeSvg() {
  const out = [], beam = { x: -4, y: RAIL.y - 3, w: 8, d: LANES.blank + KEY.top + 12 - RAIL.y + 3, r: 1.2 };
  out.push(S(slab({ x: -6, y: RAIL.y - 5, w: 12, d: 10, r: 1.4 }, RAIL.z, 6, 3, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: -3, y: RAIL.y - 2, w: 6, d: 6, r: 1 }, RAIL.z + 6, BRIDGE_Z - RAIL.z - 6, 2, 0.4), { tone: "mid" }));
  out.push(S(slab(beam, BRIDGE_Z, 5, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(beam, BRIDGE_Z + 2.5, P, 3), { tone: "faint" }) }));
  out.push(D([at([0, RAIL.y, BRIDGE_Z + 5]), at([0, beam.y + beam.d - 3, BRIDGE_Z + 5])], { size: 0.45 }));
  return out.join("");
}

// ---------------------------------------------------------------- casier à quatre portes
function lockerSvg() {
  const out = [], l = LOCKER;
  out.push(`<path class="iso-halo" d="${k.haloOf(l, 0, 2, P)}" style="filter:blur(3px)"/>`);
  for (const [x, y] of k.corners(l, 5)) out.push(S(k.cylinder(x, y, 2.4, 0, 2, P, 16), { tone: "lo" }));
  out.push(S(slab(l, 2, LOCKER_H - 2, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(l, 6, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: l.x - 1.6, y: l.y - 1.6, w: l.w + 3.2, d: l.d + 3.2, r: 2 }, LOCKER_H, 3, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners({ x: l.x - 1.6, y: l.y - 1.6, w: l.w + 3.2, d: l.d + 3.2 }, 3).map(([x, y]) => at([x, y, LOCKER_H + 3])), { size: 0.42 }));
  // Ouïes d'aération sur le flanc droit.
  const side = right(l.x + l.w), slots = [];
  for (let i = 0; i < 6; i++) slots.push(flat(-l.y - l.d + 7, 44 + i * 3.6, -l.y - 7, 45.8 + i * 3.6, 0.8, 3));
  out.push(`<g transform="${side}"><path class="iso-line" data-tone="lo" d="${slots.join("")}"/></g>`);
  // Logements derrière les portes : fond sombre et les PDF de la famille posés au fond.
  const f = front(FACE);
  out.push(`<g transform="${f}">${DOORS.map((d) => `<path class="iso-shade" data-shade="0" d="${flat(d.x, d.z, d.x + DOOR.w, d.z + DOOR.h, 0.6, 2)}"/>`).join("")}</g>`);
  for (const d of DOORS) for (let i = 0; i < 3; i++) out.push(S(slab({ x: d.x + 7 + i * 0.6, y: FACE - 11 + i * 0.4, w: 15, d: 9, r: 0.3 }, d.z + 0.3 + i * 0.7, 0.6, 2, 0), { tone: "hi", crease: "none" }));
  out.push(`<g data-part="doors"></g>`);
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Une machine à reproduire les clés sur un établi : à l'arrière, la clé modèle serrée sur son lit ; à l'avant, l'ébauche ; un pont mobile porte un palpeur et une fraise. À droite, un casier à quatre portes à serrure, une par famille de documents. Le pont suit les encoches du modèle et taille les mêmes dans l'ébauche ; la clé taillée entre dans la serrure de sa famille, tourne d'un quart de tour et la porte s'ouvre.",
  body: [
    bench(P, PLATE, { strip: { x: -112, y: PLATE.y + PLATE.d - 11, w: 96, d: 7, r: 1 }, label: { x: 64, y: PLATE.y + PLATE.d - 14, w: 46, d: 10, r: 1.2 } }),
    baseSvg(), bedSvg(LANES.master), `<g data-part="master"></g>`, clampSvg(LANES.master), `<g data-part="stylus"></g>`,
    bedSvg(LANES.blank), `<g data-part="blank"></g>`, clampSvg(LANES.blank),
    `<g data-part="bridge">${bridgeSvg()}</g>`, `<g data-part="cutter"></g>`,
    lockerSvg(), `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const KEY = ${JSON.stringify(KEY)}, KT = ${KT}, SCALE = ${SCALE}, LANES = ${JSON.stringify(LANES)}, RAIL = ${JSON.stringify(RAIL)}, BRIDGE_Z = ${BRIDGE_Z}, BASE_H = ${BASE_H};
const LOCKER = ${JSON.stringify(LOCKER)}, FACE = ${FACE}, DOOR = ${JSON.stringify(DOOR)}, DOORS = ${JSON.stringify(DOORS)}, SEL = ${JSON.stringify([BASE.x + BASE.w - 16, BASE.y + BASE.d - 12])};
const FIXED = ${JSON.stringify(FIXED)}, HOLE = ${JSON.stringify(HOLE)}, BIT = ${JSON.stringify(BITTING)};
${LOOP}
// Vrais chiffres : 5 à 10 jours de développement (7 h) remplacés par 4 h avec le studio,
// soit 31 à 66 h et 3 200 à 6 900 € évités par famille à 104,74 €/h ; traitement 100 % local.
// Le nombre de zones et la profondeur des encoches par famille sont illustratifs.
const FAMILIES = [["CERFA", 7], ["VRE", 5], ["PP", 6], ["FACTURES", 4]];
const hash = (i) => { let h = Math.imul(i + 17, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const T = { trace: 9, fly: 1.7, insert: 0.8, turn: 0.9, open: 1.3, hold: 2.2, close: 0.8 };
const AT = { fly: T.trace, insert: T.trace + T.fly, turn: T.trace + T.fly + T.insert, open: T.trace + T.fly + T.insert + T.turn };
AT.hold = AT.open + T.open; AT.close = AT.hold + T.hold; AT.end = AT.close + T.close;
// La clé entre jusqu'à sa butée d'épaulement (z = 0,21 sur le modèle) : rien ne dépasse de la serrure.
const s = SCALE / 20, CUT = { from: 3.4 * s, to: 31 * s }, U_IN = 0.205 * SCALE;                       // zone dentée, profondeur d'insertion
const notches = (f) => { const n = FAMILIES[f][1]; return Array.from({ length: n }, (_, i) => ({ u: CUT.from + 1.6 * s + (i + 0.5) * (CUT.to - CUT.from - 3.2 * s) / n, d: (1 + hash(f * 31 + i) * 2.1) * s })); };
// Encoche à fond plat et flancs à 45°, comme celles du modèle.
const depthAt = (list, u) => list.reduce((m, n) => Math.max(m, Math.min(n.d, Math.max(0, n.d - Math.max(0, Math.abs(u - n.u) - 0.8 * s)))), 0);
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const V3 = { add: (a, b) => a.map((x, i) => x + b[i]), mul: (a, s) => a.map((x) => x * s), dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] };
const VIEW = [depthOf([1, 0, 0], P), depthOf([0, 1, 0], P), depthOf([0, 0, 1], P)];
const area = (r) => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
// Contour local de la clé : modèle mis à l'échelle (u = z, v = x), denture retaillée par le profil.
const local = ([x, z]) => [z * SCALE, x * SCALE];
const HOLE_L = (() => { const r = HOLE.map(local); return area(r) > 0 ? r.reverse() : r; })();
function outline(profile) {
  const from = local(BIT.from), to = local(BIT.to), teeth = [from, [CUT.from - 0.2 * s, KEY.top]];
  for (let u = CUT.from; u <= CUT.to; u += 0.4) teeth.push([u, KEY.top - profile(u)]);
  teeth.push([CUT.to + 0.4 * s, KEY.top]);
  const ring = [...teeth, ...FIXED.map(local)];
  return area(ring) < 0 ? ring.reverse() : ring;
}
// Découpe d'un contour au plan de la porte : on ne garde que u ≤ umax.
function clipU(ring, umax) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], ina = a[0] <= umax, inb = b[0] <= umax;
    if (ina) out.push(a);
    if (ina !== inb) { const s = (umax - a[0]) / (b[0] - a[0]); out.push([umax, a[1] + (b[1] - a[1]) * s]); }
  }
  return out;
}
// Plaque épaisse quelconque dans l'espace : flancs visibles du fond vers l'avant, puis la face vue.
// F : { A (point monde), ua (u local du point A), U, V, N }.
function keySvg(profile, F, { lit = false, umax = Infinity, label = "" } = {}) {
  const pt = (u, v, w) => V3.add(V3.add(V3.add(F.A, V3.mul(F.U, u - F.ua)), V3.mul(F.V, v - KEY.vc)), V3.mul(F.N, w - KT / 2));
  const facing = V3.dot(F.N, VIEW), wf = facing > 0 ? KT : 0, wb = KT - wf;
  const rings = [clipU(outline(profile), umax), HOLE_L.every((p) => p[0] <= umax) ? HOLE_L : []].filter((r) => r.length > 2);
  const sides = [], sil = [], fmt = (q) => q[0].toFixed(1) + " " + q[1].toFixed(1);
  for (const r of rings) {
    const vis = r.map((a, i) => { const b = r[(i + 1) % r.length], du = b[0] - a[0], dv = b[1] - a[1], n = V3.add(V3.mul(F.U, dv), V3.mul(F.V, -du)); return V3.dot(n, VIEW) > 1e-9 && Math.hypot(du, dv) > 1e-6; });
    r.forEach((a, i) => {
      const b = r[(i + 1) % r.length], prev = vis[(i - 1 + r.length) % r.length];
      if (vis[i]) {
        const q = [pt(a[0], a[1], wf), pt(b[0], b[1], wf), pt(b[0], b[1], wb), pt(a[0], a[1], wb)];
        const du = b[0] - a[0], dv = b[1] - a[1], len = Math.hypot(du, dv), n = V3.add(V3.mul(F.U, dv / len), V3.mul(F.V, -du / len)), lightness = V3.dot(n, [-0.3, 0.2, 0.93]);
        sides.push({ depth: depthOf(V3.mul(V3.add(q[0], q[2]), 0.5), P), shade: lightness > 0.4 ? 3 : lightness > 0 ? 2 : lightness > -0.4 ? 1 : 0, d: "M" + q.map((p) => fmt(iso(p, P))).join("L") + "Z" });
        sil.push("M" + fmt(iso(q[3], P)) + "L" + fmt(iso(q[2], P)));
      }
      if (vis[i] !== prev) sil.push("M" + fmt(iso(pt(a[0], a[1], wf), P)) + "L" + fmt(iso(pt(a[0], a[1], wb), P)));
    });
  }
  sides.sort((p, q) => p.depth - q.depth);
  const cap = rings.map((r) => "M" + r.map((a) => fmt(iso(pt(a[0], a[1], wf), P))).join("L") + "Z").join("");
  const capUp = V3.dot(facing > 0 ? F.N : V3.mul(F.N, -1), [0, 0, 1]) > 0.35;
  // Détails repris de la texture du modèle : rebord de l'anneau, rainure de la lame, gravure.
  const line = (pts) => "M" + pts.map((a) => fmt(iso(pt(a[0], a[1], wf), P))).join("L") + "Z";
  const bowC = [-13.8 * s, -0.86 * s], rim = FIXED.slice(10, 31).map(local).map(([u, v]) => [bowC[0] + (u - bowC[0]) * 0.86, bowC[1] + (v - bowC[1]) * 0.86]);
  let inner = line(rim);
  const g1 = Math.min(30 * s, umax - 0.6);
  if (g1 > 9 * s) inner += line([[8 * s, -2.6 * s], [g1, -2.6 * s], [g1, -1.4 * s], [8 * s, -1.4 * s]]);
  let text = "";
  if (label && facing > 0) {
    inner += line([[-6.6 * s, -7 * s], [-6 * s, -7 * s], [-6 * s, 5.2 * s], [-6.6 * s, 5.2 * s]]);
    const o = iso(pt(-10 * s, bowC[1], wf), P), a = iso(pt(-10 * s, bowC[1] + 1, wf), P), b = iso(pt(-9 * s, bowC[1], wf), P);
    // Gravure lisible depuis le lecteur : jamais en miroir, jamais tête en bas.
    let ax = a[0] - o[0], ay = a[1] - o[1], bx = b[0] - o[0], by = b[1] - o[1];
    if (ax * by - ay * bx < 0) { bx = -bx; by = -by; }
    if (by < 0) { ax = -ax; ay = -ay; bx = -bx; by = -by; }
    text = '<text class="iso-face-text" data-tone="hi" font-size="' + ((label.length > 5 ? 3.2 : 4.4) * s).toFixed(2) + '" text-anchor="middle" dominant-baseline="central" letter-spacing=".08em" transform="matrix(' + [ax, ay, bx, by, o[0], o[1]].map((x) => x.toFixed(3)).join(" ") + ')">' + label + "</text>";
  }
  return '<g class="iso-solid"' + (lit ? " data-lit" : "") + ">" + sides.map((s) => '<path class="iso-shade" data-shade="' + s.shade + '" d="' + s.d + '"/>').join("") +
    '<path class="' + (capUp ? "iso-top" : "iso-shade") + '" data-shade="2" fill-rule="evenodd" d="' + cap + '"/>' + lineSvg(inner, { tone: "faint" }) + text +
    '<path class="iso-line iso-edge" data-tone="hi" d="' + cap + sil.join("") + '"/></g>';
}
// Repère de la clé : lacet psi autour de z, puis roulis rho autour de sa lame.
function keyFrame(A, ua, psi, rho) {
  const U = [Math.cos(psi), Math.sin(psi), 0], V0 = [-Math.sin(psi), Math.cos(psi), 0], N0 = [0, 0, 1];
  return { A, ua, U, V: V3.add(V3.mul(V0, Math.cos(rho)), V3.mul(N0, Math.sin(rho))), N: V3.add(V3.mul(N0, Math.cos(rho)), V3.mul(V0, -Math.sin(rho))) };
}
const rotZ = (p, c, th) => { const x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * Math.cos(th) - y * Math.sin(th), c[1] + x * Math.sin(th) + y * Math.cos(th), p[2]]; };
const turnF = (F, c, th) => ({ ...F, A: rotZ(F.A, c, th), U: rotZ(F.U, [0, 0], th), V: rotZ(F.V, [0, 0], th), N: rotZ(F.N, [0, 0], th) });
const vise = (lane) => keyFrame([KEY.x0 + KEY.tip, lane + KEY.vc, KEY.z + KT / 2], KEY.tip, 0, 0);
// Outils : palpeur sur le modèle, fraise sur l'ébauche, à l'abscisse u.
const edgeY = (lane, d) => lane + KEY.top - d;
const stylusSvg = (x, d) => solidSvg(cylinder(x, edgeY(LANES.master, d) + 1.2, 1.2, KEY.z - 0.5, BRIDGE_Z - KEY.z + 0.5, P, 14), { tone: "hi", crease: "none" });
function cutterSvg(x, d, spin, cutting, t) {
  const out = [], cy = edgeY(LANES.blank, d) + 5.4;
  out.push(solidSvg(cylinder(x, cy, 1.4, KEY.z + 2, BRIDGE_Z - KEY.z - 2, P, 14), { tone: "mid", crease: "none" }));
  const teeth = Array.from({ length: 12 }, (_, i) => { const a = spin + i / 12 * 2 * Math.PI; return lineOnTop([x + Math.cos(a) * 3.2, cy + Math.sin(a) * 3.2], [x + Math.cos(a) * 5.4, cy + Math.sin(a) * 5.4], KEY.z + 2, P); });
  out.push(solidSvg(cylinder(x, cy, 5.4, KEY.z, 2, P, 32), { tone: "mid", inner: lineSvg(teeth.join(""), { tone: "lo" }) }));
  out.push(solidSvg(cylinder(x, cy, 4.6, BRIDGE_Z + 5, 9, P, 28, 0.6), { tone: "mid", inner: lineSvg(lineOnTop([x, cy], [x + Math.cos(spin) * 4, cy + Math.sin(spin) * 4], BRIDGE_Z + 14, P), { tone: "hi" }) }));
  // Copeaux projetés par la fraise quand elle mord dans l'ébauche.
  if (cutting) out.push(dotsSvg(Array.from({ length: 5 }, (_, i) => { const s = (t * 3 + i * 0.21) % 1, a = -1.2 + i * 0.55; return iso([x + Math.cos(a) * (2 + s * 7), cy - 5.4 + Math.sin(a) * s * 3, KEY.z + KT + s * 4 - s * s * 3], P); }), { size: 0.45 }));
  return out.join("");
}
function boxPath(c) {
  const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], ctr = c.reduce((s, p) => s.map((v, i) => v + p[i] / 8), [0, 0, 0]);
  const pts = c.map((p) => iso(p, P)), hull = convexHull(pts), d = (f) => "M" + f.map((i) => pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1)).join("L") + "Z";
  const shades = ["", "", "", ""]; let top = "";
  for (const f of faces.slice(1)) {
    const fc = f.reduce((s, i) => s.map((v, j) => v + c[i][j] / 4), [0, 0, 0]), n = fc.map((v, j) => v - ctr[j]);
    if (V3.dot(n, VIEW) <= 0) continue;
    if (n[2] > 0.5) top += d(f); else shades[Math.abs(n[0]) > Math.abs(n[1]) ? 1 : 2] += d(f);
  }
  const h = "M" + hull.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
  return { fill: h, outline: h, shades, top };
}
// Porte : charnière à gauche, ouverte de th radians ; serrure dont le panneton tourne de rho.
function doorSvg(d, th, rho) {
  const hinge = [d.x, FACE, 0], A = rotZ([1, 0, 0], [0, 0], th), Nd = rotZ([0, 1, 0], [0, 0], th);
  const at3 = (a, n, z) => [hinge[0] + A[0] * a + Nd[0] * n, hinge[1] + A[1] * a + Nd[1] * n, z];
  const corners = [[0, 0], [DOOR.w, 0], [DOOR.w, DOOR.th], [0, DOOR.th]];
  const box = [...corners.map(([a, n]) => at3(a, n, d.z)), ...corners.map(([a, n]) => at3(a, n, d.z + DOOR.h))];
  let inner = "";
  if (V3.dot(Nd, VIEW) > 0) {
    const pf = (a, z) => iso(at3(a, DOOR.th, d.z + z), P), poly = (pts) => "M" + pts.map(([a, z]) => pf(a, z).map((x) => x.toFixed(1)).join(" ")).join("L") + "Z";
    const circle = (r, n = 24) => poly(Array.from({ length: n }, (_, i) => [DOOR.ka + Math.cos(i / n * 6.283) * r, DOOR.kz + Math.sin(i / n * 6.283) * r]));
    const c = Math.cos(rho), sn = Math.sin(rho), slot = [[-2.2, -0.5], [2.2, -0.5], [2.2, 0.5], [-2.2, 0.5]].map(([p, q]) => [DOOR.ka + p * c - q * sn, DOOR.kz + p * sn + q * c]);
    const vents = [0, 1, 2].map((i) => poly([[5, DOOR.h - 6 - i * 2.6], [17, DOOR.h - 6 - i * 2.6], [17, DOOR.h - 5 - i * 2.6], [5, DOOR.h - 5 - i * 2.6]])).join("");
    inner = lineSvg(poly([[1.6, 1.6], [DOOR.w - 1.6, 1.6], [DOOR.w - 1.6, DOOR.h - 1.6], [1.6, DOOR.h - 1.6]]), { tone: "faint" }) +
      lineSvg(vents + poly([[5, 6], [15, 6], [15, 11], [5, 11]]) + circle(4.6) + circle(3) + poly(slot) + poly([[DOOR.ka - 1, 5], [DOOR.ka + 1, 5], [DOOR.ka + 1, 10], [DOOR.ka - 1, 10]]), { tone: "lo" }) +
      dotsSvg([pf(6.2, 8.5), pf(13.8, 8.5)], { size: 0.4 });
  }
  return solidSvg(boxPath(box), { tone: "mid", inner });
}
const knuckles = () => DOORS.map((d) => [d.z + 4, d.z + DOOR.h - 8].map((z) => solidSvg(cylinder(d.x - 0.4, FACE + 0.9, 1, z, 4, P, 12), { tone: "mid", crease: "none" })).join("")).join("");
const parts = { master: $("master"), blank: $("blank"), bridge: $("bridge"), stylus: $("stylus"), cutter: $("cutter"), doors: $("doors"), air: $("air"), family: $("family"), selector: $("selector") };
let fam = 0, t = 0, touring = true, idle = 0;
function draw() {
  const list = notches(fam), name = FAMILIES[fam][0], profile = (u) => depthAt(list, u);
  const u = CUT.from - 2 + (CUT.to - CUT.from + 4) * ease(Math.min(1, t / T.trace)), x = KEY.x0 + u, d = profile(u), spin = t * 18;
  parts.master.innerHTML = keySvg(profile, vise(LANES.master), { label: name });
  const flying = t >= AT.fly;
  parts.blank.innerHTML = flying ? "" : keySvg((uu) => (uu <= u ? profile(uu) : 0), vise(LANES.blank));
  parts.bridge.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  parts.stylus.innerHTML = stylusSvg(x, d);
  parts.cutter.innerHTML = cutterSvg(x, d, spin, !flying && t > 0.2 && d > 0.05, t);
  // Vol vers la serrure, insertion, quart de tour, ouverture : la clé suit la porte.
  const door = DOORS[fam], K = [door.x + DOOR.ka, FACE + DOOR.th, door.z + DOOR.kz], hinge = [door.x, FACE];
  const open = ease((t - AT.open) / T.open) * (1 - ease((t - AT.close) / T.close)), th = open * 1.85;
  let air = "", keyIn = "", rho = 0;
  if (flying) {
    const v = ease((t - AT.fly) / T.fly), start = vise(LANES.blank).A, end = [K[0], K[1] + 6, K[2]];
    const A = start.map((s, i) => s + (end[i] - s) * v); A[2] += 30 * Math.sin(Math.PI * v);
    if (t < AT.insert) air = keySvg(profile, keyFrame(A, KEY.tip, -Math.PI / 2 * v, 0), { lit: true });
    else {
      const ua = KEY.tip + 6 - (KEY.tip + 6 - U_IN) * ease((t - AT.insert) / T.insert);
      rho = -Math.PI / 2 * ease((t - AT.turn) / T.turn);
      const fade = 1 - ease((t - AT.close) / T.close);
      keyIn = '<g opacity="' + fade.toFixed(2) + '">' + keySvg(profile, turnF(keyFrame(K, ua, -Math.PI / 2, rho), hinge, th), { lit: true, umax: ua }) + "</g>";
    }
  }
  parts.air.innerHTML = air;
  // Portes fermées d'abord ; la porte active ensuite, avec sa clé devant ou derrière selon la face vue.
  const active = doorSvg(door, th, rho), outerSeen = V3.dot(rotZ([0, 1, 0], [0, 0], th), VIEW) > 0;
  parts.doors.innerHTML = DOORS.map((dd, i) => (i === fam ? "" : doorSvg(dd, 0, 0))).join("") + knuckles() + (outerSeen ? active + keyIn : keyIn + active);
  if (parts.family.textContent !== name) parts.family.textContent = name;
  const a = -Math.PI * 0.5 + fam * Math.PI / 3;
  parts.selector.innerHTML = lineSvg(lineOnTop([SEL[0], SEL[1]], [SEL[0] + Math.cos(a) * 4.2, SEL[1] + Math.sin(a) * 4.2], BASE_H + 5, P), { tone: "hi" }) + dotsSvg([iso([SEL[0], SEL[1], BASE_H + 5], P)], { size: 0.6 });
  const traced = list.filter((n) => n.u <= u).length;
  say(!flying ? name + " · zone " + traced + " / " + list.length + " tracée" + (traced > 1 ? "s" : "")
    : t < AT.turn ? name + " · extracteur prêt en 4 h au lieu de 5 à 10 jours"
    : t < AT.open ? name + " · la clé tourne dans la serrure de sa famille"
    : name + " · casier ouvert · 3 200 à 6 900 € évités · 100 % local");
}
const run = loop((dt, calm) => {
  if (calm) t = AT.hold + 0.1;
  else { t += dt; if (t >= AT.end) { t = 0; if (touring) fam = (fam + 1) % FAMILIES.length; } }
  draw();
});
const choose = (f) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 6000); fam = (f + FAMILIES.length) % FAMILIES.length; t = 0; run(); };
dragX(() => fam, (v, share) => { const f = (Math.round(v + share * 4) % 4 + 4) % 4; if (f !== fam) choose(f); });
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: fam + 1, ArrowLeft: fam - 1, Enter: fam, " ": fam }[e.key];
  if (to !== undefined) { e.preventDefault(); choose(to); }
});
// Accès de vérification (captures).
window.__fig = { at: (f, tt) => { touring = false; fam = f; t = tt; draw(); return readout.textContent; }, AT, T };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 10",
  title: "Studio d'extracteurs",
  hint: "Glisse ou ← → : famille",
  readout: "CERFA · zone 0 / 7 tracée",
  keys: [
    { mark: "lit", label: "La clé taillée : l'extracteur de la famille" },
    { mark: "raised", label: "Clé modèle gravée à l'arrière (le PDF exemple), ébauche à l'avant, casier des quatre familles à droite" },
  ],
  caption: "Les zones à lire sont tracées sur un exemple du document, sans écrire de code ; l'extracteur est essayé sur des documents réels puis livré en page HTML ou en exécutable, et traite les PDF sur l'appareil, sans qu'aucun ne le quitte. Un extracteur prenait 5 à 10 jours de développement ; avec le studio, 4 h : 31 à 66 h et 3 200 à 6 900 € évités par famille, à 104,74 €/h. Nombre de zones par famille illustratif. Clé d'après « PSX Tower Key » de ZwiebelGames (CC BY 4.0).",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Studio d'extracteurs : flèches gauche et droite pour changer de famille" aria-valuemin="1" aria-valuemax="4" aria-valuenow="1">${svg}</div>`,
});

writeFigure("studio", { title: "Studio d'extracteurs · reproduction de clés", plate, live });

// Fig 11 (variante C) · VRE Studio : un synchrotron local. Une page est lue, triée, verrouillée, validée, versée au corpus,
// accélérée en anneau (entraînement), mesurée, publiée, puis sa lumière balaie des pages inédites ; les cadres validés reviennent par un tube.
// node figures/build-anneau.mjs  →  figures/vrestudio-anneau.html
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { bench, writeFigure, LOOP } from "./common.mjs";
import { scene } from "./scene-kit.mjs";

const WIDTH = 940, HEIGHT = 700;
const PLATE = { x: -230, y: -180, w: 460, d: 425, r: 16 };
const RC = [40, -24], RM = 100, RB = 50;                                // centre commun, rayons de l'anneau principal et du booster
const ZP = 6;                                                          // hauteur de l'axe du faisceau
const LY = -74;
const HS = 1.35, HOX = 53.6, HOY = 108;                                 // la halle est dessinée à l'échelle 1 (x 96..226, y 96..172) puis agrandie
const hx = (x) => HOX + (x - 96) * HS, hy = (y) => HOY + (y - 96) * HS, hz = (z) => z * HS;                                                        // axe du linac (tangent au booster)

const P = k.fitProjection(
  [[PLATE.x, PLATE.y, -22], [PLATE.x + PLATE.w, PLATE.y, -22], [PLATE.x + PLATE.w, PLATE.y + PLATE.d, -22], [PLATE.x, PLATE.y + PLATE.d, -22], [190, -150, 80]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 33 },
);
const Sc = scene(P);
const [VX, VY] = k.towardViewer(P), VANG = Math.atan2(VY, VX);          // direction du point de vue dans le plan du sol
const { T, at, S, L, D, put, bx, cy, turn, tube, lamp, dark, ln3, flat, pth, rad, polar, rect } = Sc;
const TAU = Math.PI * 2;
const onRing = (r, a, z = 0, c = RC) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), z];
const tang = (a) => [-Math.sin(a), Math.cos(a), 0];
const X = [1, 0, 0], Y = [0, 1, 0], Zv = [0, 0, 1];
const dots = (pts, size = 0.4, tone = "lo") => D(pts.map((p) => at(p)), { size, tone });

// ---------------------------------------------------------------- socle et sol
const base = [bench(P, PLATE, { plateH: 14, footH: 6 })];
const arcPoly = (r, a0, a1, n = 48, c = RC) => Array.from({ length: n + 1 }, (_, i) => polar(r, a0 + (a1 - a0) * i / n, c));
function gallery(r0, r1, h) {
  base.push(`<path class="fig-deck" fill-rule="evenodd" d="${pth(arcPoly(r1, 0, TAU, 120).map(([x, y]) => at([x, y, 0.2])), true)}${pth(arcPoly(r0, 0, TAU, 120).map(([x, y]) => at([x, y, 0.2])), true)}"/>`);
  const N = 72;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, am = (a0 + a1) / 2, frontness = Math.cos(am - VANG);
    for (const [rr, hh] of [[r0, h], [r1, frontness > 0.15 ? 1.6 : h]]) {
      const ring = [...arcPoly(rr + 1.4, a0, a1, 3), ...arcPoly(rr - 1.4, a1, a0, 3)];
      put(onRing(rr, am, hh / 2), S(k.extrude(ring, 0, hh, P, { bevel: 0.25, convex: false }), { tone: "mid" }), rr === r0 ? 0.01 : 0);
    }
  }
}
gallery(82, 118, 7);
gallery(36, 64, 6);

// ---------------------------------------------------------------- pièces de faisceau
const cavity = (c3, axis, len, r, cells, o = {}) => {
  const prof = [[0, r * 0.5], [1.6, r * 0.5], [2.4, r]];
  const step = (len - 6) / cells;
  for (let i = 0; i < cells; i++) { const s0 = 2.4 + i * step; prof.push([s0 + step * 0.8, r], [s0 + step * 0.9, r * 0.82], [s0 + step, r]); }
  prof.push([len - 2.4, r], [len - 1.6, r * 0.5], [len, r * 0.5]);
  return turn(c3, axis, prof, { tone: o.tone || "mid", inner: (F) => L(G.ribsOf(F, 3, len - 3, r, 14, P), { tone: "faint", free: true }), at3: [c3[0] + axis[0] * len / 2, c3[1] + axis[1] * len / 2, c3[2]] });
};
const flange = (c3, axis, r = 3.6, h = 1.2) => turn(c3, axis, [[0, r], [h, r]], { tone: "lo", at3: c3, bias: 0.02 });
const quad = (c3, axis) => {
  const mid = [c3[0] + axis[0] * 5, c3[1] + axis[1] * 5, c3[2]];
  turn(c3, axis, [[0, 3.4], [10, 3.4]], { tone: "mid", at3: mid });
  turn([c3[0] + axis[0] * 1, c3[1] + axis[1] * 1, c3[2]], axis, [[0, 6], [8, 6]], { tone: "hi", at3: mid, bias: 0.05, inner: (F) => L(G.ribsOf(F, 0, 8, 6, 12, P), { tone: "lo" }) });
};
const beamSeg = (a3, b3, r = 2) => tube([a3, b3], r, { maxLength: 60, spacing: 4, caps: [true, true], tone: "mid" });

// ---------------------------------------------------------------- anneau principal : douze dipôles, tubes, cavités, quadrupôles
const ringRoute = (r, z, n = 120) => Array.from({ length: n }, (_, i) => onRing(r, (i / n) * TAU, z));
const arcSpan = (r, d0, d1) => [rad(d0) * r, rad(d1) * r];
const DIP = (q) => (q * 30 + 15);
tube(ringRoute(RM, ZP), 2.1, { closed: true, maxLength: 26, spacing: 2, gaps: Array.from({ length: 12 }, (_, q) => arcSpan(RM, DIP(q) - 9.6, DIP(q) + 9.6)), tone: "mid" });
function dipole(r, a, span, w, h, name) {
  const a0 = rad(a - span), a1 = rad(a + span), am = rad(a);
  const ring = [...arcPoly(r + w / 2, a0, a1, 8), ...arcPoly(r - w / 2, a1, a0, 8)];
  let svg = S(k.extrude(ring, 1, h, P, { bevel: 0.7, convex: false }), { tone: "mid" });
  // face supérieure : liseré, glow dynamique (data-part), enroulements radiaux de bord à bord
  const top = (rr, ang) => at(onRing(rr, ang, 1 + h));
  const inset = [...arcPoly(r + w / 2 - 1.3, a0 + 0.015, a1 - 0.015, 8), ...arcPoly(r - w / 2 + 1.3, a1 - 0.015, a0 + 0.015, 8)];
  svg += `<path class="fig-glow" data-part="${name}" d="${pth(inset.map(([x, y]) => at([x, y, 1 + h + 0.05])), true)}" opacity="0"/>`;
  svg += L(pth(inset.map(([x, y]) => at([x, y, 1 + h + 0.05])), true), { tone: "faint", free: true });
  const wind = [];
  for (let i = 1; i < 8; i++) { const ang = a0 + (a1 - a0) * (i / 8); wind.push(pth([top(r + w / 2 - 1.3, ang), top(r - w / 2 + 1.3, ang)])); }
  svg += L(wind.join(""), { tone: "lo", free: true });
  // brides d'extrémité sur le faisceau
  for (const ang of [a0, a1]) svg += S(k.cylinder(...onRing(r, ang, 0).slice(0, 2), 3.2, ZP - 1.6, 3.2, P, 16), { tone: "lo", crease: "none" });
  put(onRing(r, am, h / 2), svg);
}
for (let q = 0; q < 12; q++) dipole(RM, DIP(q), 9, 12, 11, "dip-" + q);
// quadrupôles aux straights 1, 3, 5, 8, 10
for (const sct of [1, 3, 5, 8, 10]) { const a = rad(sct * 30), c = onRing(RM, a, ZP); const t = tang(a); quad([c[0] - t[0] * 5, c[1] - t[1] * 5, ZP], t); }
// straight 2 : cavité du modèle publié ; straight 4 : cavité du candidat
function ringCavity(sct, name) {
  const a = rad(sct * 30), c = onRing(RM, a, ZP), t = tang(a);
  const o3 = [c[0] - t[0] * 9, c[1] - t[1] * 9, ZP];
  cavity(o3, t, 18, 6.4, 3);
  // amplificateur hors anneau : armoire et guide d'onde
  const o = onRing(RM + 26, a, 0);
  const cab = [o[0] - 7, o[0] + 7, o[1] - 6, o[1] + 6];
  bx(cab[0], cab[1], cab[2], cab[3], 0, 15, { tone: "mid", bevel: 0.6 });
  put([o[0], o[1], 8], `<path class="fig-glow" data-part="${name}" d="${pth(rect(cab[0] + 1, cab[1] - 1, cab[2] + 1, cab[3] - 1).map(([x, y]) => at([x, y, 15.05])), true)}" opacity="0"/>`, 0.2);
  put([o[0], o[1], 8], L(ln3([cab[0], cab[2], 10], [cab[0], cab[3], 10]) + ln3([cab[0], cab[3], 10], [cab[1], cab[3], 10]), { tone: "faint", free: true }), 0.21);
  tube([[o[0] - (o[0] - c[0]) * 0.0, o[1], 4], onRing(RM + 14, a, 4), onRing(RM + 4, a, ZP + 4)], 1.3, { maxLength: 40, caps: [true, true], tone: "mid" });
}
ringCavity(2, "cav-pub"); ringCavity(4, "cav-cand");
// straight 7 : pompes ioniques ; straight 9 : sondes de position ; straight 11 : kicker de rétroaction
for (const dd of [-3, 3]) { const a = rad(7 * 30 + dd * 1.6), c = onRing(RM + 9, a, 0); cy(c[0], c[1], 3.2, 0, 8, { tone: "mid" }); cy(c[0], c[1], 2.2, 8, 3, { tone: "hi" }); }
for (const dd of [-4, 4]) { const a = rad(9 * 30 + dd * 1.4), c = onRing(RM, a, ZP); put(c, S(k.cylinder(c[0], c[1], 3.6, ZP - 1.2, 2.4, P, 20), { tone: "lo" })); }
{ const a = rad(330), c = onRing(RM, a, ZP), t = tang(a), n = [Math.cos(a), Math.sin(a)]; for (const sg of [-1, 1]) { const q = [c[0] + n[0] * 5 * sg, c[1] + n[1] * 5 * sg]; bx(q[0] - 2.4, q[0] + 2.4, q[1] - 2.4, q[1] + 2.4, ZP - 3, 6, { tone: "hi", bevel: 0.3 }); } }

// ---------------------------------------------------------------- booster (le corpus) : quatre dipôles, tube, tambour central
tube(ringRoute(RB, ZP, 80), 1.9, { closed: true, maxLength: 24, gaps: Array.from({ length: 4 }, (_, q) => arcSpan(RB, q * 90 + 45 - 21, q * 90 + 45 + 21)), tone: "mid" });
for (let q = 0; q < 4; q++) dipole(RB, q * 90 + 45, 20, 11, 10, "bdip-" + q);

// ---------------------------------------------------------------- tambour du corpus, au centre du booster : trois feuillets empilés, douze alvéoles
{
  const [cx, cy0] = RC;
  put([cx, cy0, 1], S(k.cylinder(cx, cy0, 31, 0, 3.4, P, 56, 0.5), { tone: "lo" }));
  const layers = [[25, 3.4, "lo", "img"], [24, 6, "mid", "txt"], [23, 8.6, "hi", "pos"]];
  for (const [r, z, tone, nm] of layers) {
    let svg = S(k.cylinder(cx, cy0, r, z, 2.6, P, 48, 0.4), { tone });
    if (nm === "img") svg += L(k.ring(cx, cy0, r - 2, z + 2.6, P, 48) + k.ring(cx, cy0, r - 7, z + 2.6, P, 40), { tone: "faint", free: true });
    if (nm === "txt") svg += L(Array.from({ length: 5 }, (_, i) => k.lineOnTop([cx - 14, cy0 - 9 + i * 4.5], [cx + 14, cy0 - 9 + i * 4.5], z + 2.6, P)).join(""), { tone: "lo", free: true });
    if (nm === "pos") svg += L(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * TAU; return k.lineOnTop(polar(14, a, RC), polar(20.5, a, RC), z + 2.6, P); }).join(""), { tone: "mid", free: true });
    put([cx, cy0, z + 1.3], svg, 0.02 + z * 0.001);
  }
  put([cx, cy0, 20], S(k.cylinder(cx, cy0, 5, 11.2, 10, P, 28), { tone: "mid" }) + S(k.cylinder(cx, cy0, 7.5, 21.2, 2.4, P, 32, 0.3), { tone: "hi", lit: true }), 0.1);
  // douze alvéoles lumineuses sur la jante : une fiche versée, un voyant
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const [x, y] = polar(28.4, a, RC); put([x, y, 3.4], lamp("slot-" + i, x, y, 3.4, 1.15), 0.2); }
}

// ---------------------------------------------------------------- linac, étage 0 : trémie, plateau de lecture, portique du laser
const PW = 16, PH = 18, FY = [-6.5, -2.2, 2.2, 6.5];                      // page : profondeur x, largeur y ; champs
const pageMarkup = (z, sc = 1) => {
  const w = PW * sc, h = PH * sc;
  let svg = S(k.extrude(rect(-w / 2, w / 2, -h / 2, h / 2), z, 0.7 * sc, P, { bevel: 0.15 }), { tone: "hi", crease: "none" });
  svg += L(FY.map((y) => k.planOutline({ x: -3.6 * sc, y: (y - 1.4) * sc, w: 7.2 * sc, d: 2.8 * sc, r: 0.3 }, z + 0.7 * sc, P, 2)).join(""), { tone: "mid" });
  svg += L([[7.4, 6.2], [8.4, 2.4]].map(([y, c]) => k.lineOnTop([(-PW / 2 + 1.4) * sc, y * sc], [(-PW / 2 + 1.4 + c * 0.6) * sc, y * sc], z + 0.7 * sc, P)).join(""), { tone: "lo", free: true });
  return svg;
};
{
  const hx = -218;
  bx(hx - 11, hx + 11, LY - 14, LY + 14, 0, 11, { tone: "mid", bevel: 0.7 });
  bx(hx - 12, hx + 12, LY - 15, LY + 15, 9.4, 2, { tone: "lo", bevel: 0.4 });
  for (let i = 0; i < 4; i++) put([hx, LY, 13 + i], S(k.extrude(rect(hx - 8, hx + 8, LY - 9, LY + 9), 11.4 + i * 0.9, 0.8, P, { bevel: 0.1 }), { tone: "hi", crease: "none" }), 0.3);
  const sl = [at([hx + 11, LY - 11, 2.2]), at([hx + 11, LY + 11, 2.2]), at([hx + 11, LY + 11, 5.2]), at([hx + 11, LY - 11, 5.2])];
  put([hx + 11, LY, 4], dark(pth(sl, true)) + L(pth(sl, true), { tone: "lo" }), 0.4);
  // plateau de lecture
  bx(-205, -182, LY - 12, LY + 12, 0, 2.4, { tone: "lo", bevel: 0.5 });
  put([-193, LY, 2.4], L(k.planOutline({ x: -203.5, y: LY - 10.5, w: 20, d: 21, r: 0.5 }, 2.4, P, 2), { tone: "faint", free: true }) + dots([[-203, LY - 11, 2.4], [-184, LY + 11, 2.4], [-203, LY + 11, 2.4], [-184, LY - 11, 2.4]]), 0.2);
  // portique du laser : deux pylônes de part et d'autre de la page, traverse selon y
  for (const sg of [-1, 1]) {
    put([-193, LY + sg * 17, 12], S(k.cylinder(-193, LY + sg * 17, 3.6, 0, 1.4, P, 24), { tone: "lo" }) + S(G.solidOf([[0, 2], [24, 2], [24.6, 2.8], [26, 2.8]], G.frameAlong([-193, LY + sg * 17, 1.4], Zv), P), { tone: "mid" }));
  }
  bx(-197, -189, LY - 20, LY + 20, 26.6, 3.6, { tone: "mid", bevel: 0.5 });
  put([-193, LY, 30], L(ln3([-197, LY - 20, 28.4], [-197, LY + 20, 28.4]), { tone: "faint", free: true }) + dots([[-193, LY - 17, 30.2], [-193, LY + 17, 30.2]], 0.45, "mid"), 0.5);
  put([-193, LY - 17, 30], lamp("lamp-read", -193, LY + 15, 30.3, 1.5), 0.6);
  // canon à électrons : corps tourné, empilement isolant, câble haute tension
  turn([-176, LY, ZP], X, [[0, 2.4], [2, 5.6], [4, 7], [16, 7], [18, 4.6], [20, 2.4]], { tone: "mid", inner: (F) => L(G.arcOf(F, 6, 7, P) + G.arcOf(F, 13, 7, P), { tone: "faint", free: true }), at3: [-166, LY, ZP] });
  for (let i = 0; i < 6; i++) put([-166, LY, 12 + i * 3], S(k.cylinder(-166, LY, 3.4 - (i % 2) * 0.6, 12 + i * 3, 2.4, P, 20, 0.2), { tone: i % 2 ? "mid" : "hi" }), 0.1);
  put([-166, LY, 31], S(k.cylinder(-166, LY, 2.4, 30.6, 2, P, 16), { tone: "lo" }), 0.12);
}

// ---------------------------------------------------------------- linac, étage 1 : chicane de tri — deux dipôles, quatre voies, fente à quatre empreintes
const LANES = [-14, -5, 5, 14], LX0 = -146, LX1 = -108;
const laneRoute = (dy, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const x = LX0 + (LX1 - LX0) * i / n, u = i / n; const w = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.6; return [x, LY + dy * Math.min(1, Math.sin(Math.PI * u) ** 0.5 * 1.0) , ZP]; });
{
  bx(-156, -146, LY - 10, LY + 10, 1, 11, { tone: "mid", bevel: 0.7 }); bx(-108, -98, LY - 10, LY + 10, 1, 11, { tone: "mid", bevel: 0.7 });
  put([-151, LY, 12], L(Array.from({ length: 6 }, (_, i) => k.lineOnTop([-155 + i * 1.5 + 1, LY - 9], [-155 + i * 1.5 + 1, LY + 9], 12.05, P)).join(""), { tone: "lo", free: true }) + `<path class="fig-glow" data-part="chic-a" d="${pth(rect(-154.5, -147.5, LY - 8.5, LY + 8.5).map(([x, y]) => at([x, y, 12.1])), true)}" opacity="0"/>`, 0.3);
  put([-103, LY, 12], L(Array.from({ length: 6 }, (_, i) => k.lineOnTop([-107 + i * 1.5 + 1, LY - 9], [-107 + i * 1.5 + 1, LY + 9], 12.05, P)).join(""), { tone: "lo", free: true }) + `<path class="fig-glow" data-part="chic-b" d="${pth(rect(-106.5, -99.5, LY - 8.5, LY + 8.5).map(([x, y]) => at([x, y, 12.1])), true)}" opacity="0"/>`, 0.3);
  LANES.forEach((dy) => { tube(laneRoute(dy), 1.0, { maxLength: 40, spacing: 2, caps: [true, true], tone: "mid" }); });
  // bloc de fente au centre : quatre empreintes de catégorie
  const xs = -127;
  put([xs, LY, 8], S(k.extrude(rect(xs - 3, xs + 3, LY - 22, LY + 22), 0, 14, P, { bevel: 0.5 }), { tone: "hi" }), 0.5);
  LANES.forEach((dy, i) => {
    const sl = [at([xs + 3, LY + dy - 1.6, ZP - 2.2]), at([xs + 3, LY + dy + 1.6, ZP - 2.2]), at([xs + 3, LY + dy + 1.6, ZP + 2.2]), at([xs + 3, LY + dy - 1.6, ZP + 2.2])];
    put([xs + 3, LY + dy, ZP], dark(pth(sl, true)) + L(pth(sl, true), { tone: "lo" }) + lamp("sort-lamp-" + i, xs, LY + dy, 14.4, 1.1), 0.6);
  });
}

// ---------------------------------------------------------------- linac, étage 2 : deux cavités accordées (modèle, règles) et l'armoire à deux clés
{
  const cx = [-90, -62];
  cavity([cx[0], LY, ZP], X, 20, 6.6, 3, { tone: "mid" });
  cavity([cx[1], LY, ZP], X, 18, 6.6, 3, { tone: "mid" });
  put([-70, LY, 10], `<path class="fig-glow" data-part="cav-model" d="${pth(rect(-89, -71, LY - 5, LY + 5).map(([x, y]) => at([x, y, 13.2])), true)}" opacity="0"/>`, 0.4);
  put([-53, LY, 10], `<path class="fig-glow" data-part="cav-rules" d="${pth(rect(-61, -45, LY - 5, LY + 5).map(([x, y]) => at([x, y, 13.2])), true)}" opacity="0"/>`, 0.4);
  // coupleur de phase entre les deux : boîtier et deux guides d'onde
  bx(-70, -62, LY - 5, LY + 5, ZP - 4, 8, { tone: "hi", bevel: 0.4 });
  // armoires radiofréquence hors axe, guides d'onde jusqu'aux cavités
  for (const [x, nm] of [[-80, "rf1"], [-53, "rf2"]]) {
    bx(x - 8, x + 8, LY - 32, LY - 20, 0, 18, { tone: "mid", bevel: 0.6 });
    put([x, LY - 26, 9], L(ln3([x - 8, LY - 20, 12], [x + 8, LY - 20, 12]) + ln3([x - 8, LY - 20, 5], [x + 8, LY - 20, 5]), { tone: "faint", free: true }) + dots([[x - 6, LY - 20, 15], [x + 6, LY - 20, 15], [x - 6, LY - 20, 2.4], [x + 6, LY - 20, 2.4]]), 0.3);
    tube([[x, LY - 20, 14], [x, LY - 14, 14], [x, LY - 8, ZP + 4]], 1.4, { maxLength: 30, caps: [true, true], tone: "mid" });
  }
  // armoire à deux clés : face tournée vers nous (y +) ; une clé ronde (le modèle), une clé carrée (les règles)
  const kx = -66, ky = LY - 52;
  bx(kx - 14, kx + 14, ky - 6, ky + 6, 0, 26, { tone: "mid", bevel: 0.7 });
  const face = ky + 6;
  const rd = Array.from({ length: 14 }, (_, i) => at([kx - 7 + 2.4 * Math.cos(i * Math.PI / 7), face, 15 + 2.4 * Math.sin(i * Math.PI / 7)]));
  const sq = [at([kx + 4.8, face, 12.8]), at([kx + 9.2, face, 12.8]), at([kx + 9.2, face, 17.2]), at([kx + 4.8, face, 17.2])];
  put([kx, face, 14], dark(pth(rd, true)) + L(pth(rd, true), { tone: "lo" }) + dark(pth(sq, true)) + L(pth(sq, true), { tone: "lo" }) + L(ln3([kx - 14, face, 21], [kx + 14, face, 21]) + ln3([kx - 14, face, 7], [kx + 14, face, 7]), { tone: "faint", free: true }) + dots([[kx - 12, face, 24], [kx + 12, face, 24], [kx - 12, face, 3], [kx + 12, face, 3]]) + lamp("lamp-lock", kx, face, 23.4, 1.6), 0.3);
  // rails des deux clés
  put([kx, face + 10, 8], bx(kx - 8, kx - 6, face, face + 22, 0, 8.4, { reg: false, tone: "lo", bevel: 0.2 }) + bx(kx + 6, kx + 8, face, face + 22, 0, 8.4, { reg: false, tone: "lo", bevel: 0.2 }), 0.2);
}

// ---------------------------------------------------------------- linac, étage 3 : collimateur à mâchoires, volant de validation
{
  const cx = -25;
  bx(cx - 11, cx + 11, LY - 9, LY + 9, 0, 6, { tone: "mid", bevel: 0.6 });
  bx(cx - 11, cx + 11, LY - 9, LY - 4, 6, 9, { tone: "hi", bevel: 0.4, bias: 0.1 });         // mâchoire fixe, côté arrière ; la mobile est dynamique
  put([cx, LY + 5, 10], `<g data-part="jaw">${bx(cx - 9, cx + 9, LY + 4, LY + 9, 6, 9, { reg: false, tone: "hi", lit: true, bevel: 0.4 })}</g>`, 0.2);
  put([cx, LY, 20], S(k.cylinder(cx, LY, 3, 15, 8, P, 20), { tone: "mid" }) + S(k.cylinder(cx, LY, 4.4, 23, 1.6, P, 24), { tone: "lo" }), 0.3);
  // volant à main, axe vers nous
  const wy = LY + 20, wz = 11;
  put([cx, wy, wz], turn([cx, wy - 8, wz], Y, [[0, 1.6], [10, 1.6]], { reg: false, tone: "mid" }) + turn([cx, wy + 2, wz], Y, [[0, 7.4], [1.4, 7.4], [1.4, 6.2], [3, 6.2], [3, 7.4], [4, 7.4]], { reg: false, tone: "hi" }) + S(k.cylinder(cx, wy + 3, 1.8, wz - 1.8, 0, P, 4), { tone: "mid" }), 0.2);
  put([cx, wy + 2, wz], `<g data-part="wheel"></g>`, 0.4);
  // socle du volant et butée
  bx(cx - 6, cx + 6, LY + 9, LY + 20, 0, 5, { tone: "lo", bevel: 0.4 });
}
// quadrupôles, sondes, aimant de septum à l'entrée du booster
quad([-8, LY, ZP], X); quad([10, LY, ZP], X);
for (const x of [-34 + 40, 20]) put([x, LY, ZP], S(k.cylinder(x, LY, 3.6, ZP - 1.2, 2.4, P, 20), { tone: "lo" }), 0.1);
bx(30, 42, LY - 7, LY + 7, 1, 10, { tone: "hi", bevel: 0.5 });
put([36, LY, 12], `<path class="fig-glow" data-part="kick-in" d="${pth(rect(31, 41, LY - 6, LY + 6).map(([x, y]) => at([x, y, 11.1])), true)}" opacity="0"/>`, 0.3);

// tube du linac : segments entre les éléments
{
  const x0 = -176, spans = [[-176, -156], [-156, -98], [-90, -70], [-70, -62], [-62, -44], [-38, -12], [-9, 2], [10, 20], [30, 42]];
  tube([[x0, LY, ZP], [42, LY, ZP]], 2, { maxLength: 60, spacing: 4, gaps: spans.map(([a, b]) => [a - x0, b - x0]), tone: "mid" });
  // brides de part et d'autre de chaque élément
  for (const x of [-156, -98, -90, -44, -38, -12, -9, 2, 10, 20, 30]) put([x, LY, ZP], S(G.solidOf([[0, 3.2], [1.2, 3.2]], G.frameAlong([x, LY, ZP], X), P), { tone: "lo" }), 0.6);
}
// transfert booster → anneau principal
tube([[-14, RC[1], ZP], [-64, RC[1], ZP]], 1.9, { maxLength: 60, spacing: 4, caps: [true, true], tone: "mid" });
bx(-72, -62, RC[1] - 6, RC[1] + 6, 1, 10, { tone: "hi", bevel: 0.5 }); bx(-18, -8, RC[1] - 6, RC[1] + 6, 1, 10, { tone: "hi", bevel: 0.5 });
put([-67, RC[1], 11], `<path class="fig-glow" data-part="kick-main" d="${pth(rect(-71, -63, RC[1] - 5, RC[1] + 5).map(([x, y]) => at([x, y, 11.1])), true)}" opacity="0"/>`, 0.3);

// ---------------------------------------------------------------- faisceau de lumière : la ligne qui sort de l'anneau vers la halle
const BX = RC[0] + RM;                                                 // x de la ligne (tangente à l'anneau en θ = 0)
{
  bx(BX - 5, BX + 5, RC[1] + 6, RC[1] + 18, 1, 11, { tone: "hi", bevel: 0.5 });                      // porte de sortie, obturateur de tête
  put([BX, RC[1] + 12, 12], `<path class="fig-glow" data-part="front-end" d="${pth(rect(BX - 4, BX + 4, RC[1] + 7, RC[1] + 17).map(([x, y]) => at([x, y, 12.1])), true)}" opacity="0"/>`, 0.3);
  const spans = [[RC[1] + 6, RC[1] + 18], [30, 48], [62, 74], [84, 94]];
  const y0 = RC[1] + 4;
  tube([[BX, y0, ZP], [BX, HOY, ZP]], 1.7, { maxLength: 50, spacing: 4, gaps: spans.map(([a, b]) => [a - y0, b - y0]), tone: "mid" });
  // cuve du miroir : cylindre vertical et hublot
  cy(BX, 39, 8, 0, 14, { tone: "mid" }); cy(BX, 39, 5.6, 14, 2.4, { tone: "hi", lit: true });
  put([BX, 39, 8], L(k.ring(BX, 39, 8.02, 5, P, 28) + k.ring(BX, 39, 8.02, 10, P, 28), { tone: "faint", free: true }), 0.3);
  // fentes de la ligne : deux blocs qui se ferment sur le faisceau
  bx(BX - 7, BX + 7, 62, 66, 1, 11, { tone: "mid", bevel: 0.4 }); bx(BX - 7, BX + 7, 70, 74, 1, 11, { tone: "mid", bevel: 0.4 });
  // obturateur de sécurité avant la halle
  bx(BX - 6, BX + 6, 84, 92, 1, 12, { tone: "hi", bevel: 0.5 });
  // portées : un pylône tous les vingt pas
  for (const y of [14, 54, 80]) put([BX, y, 2], S(k.cylinder(BX, y, 1.2, 0, ZP - 1.7, P, 12), { tone: "lo", crease: "none" }), 0.2);
}

// ---------------------------------------------------------------- halle des échantillons (dessinée à l'échelle de conception, puis agrandie : HS)
const H3 = (x, y, z) => [hx(x), hy(y), hz(z)];
const hbx = (x0, x1, y0, y1, z, h, o = {}) => bx(hx(x0), hx(x1), hy(y0), hy(y1), hz(z), h * HS, o);
const hcy = (x, y, r, z, h, o = {}) => cy(hx(x), hy(y), r * HS, hz(z), h * HS, o);
const hat = (x, y, z) => at(H3(x, y, z));
const hln = (...pts) => pth(pts.map((p) => hat(...p)));
const hdots = (pts, size = 0.4, tone = "lo") => D(pts.map((p) => hat(...p)), { size, tone });
const hrect = (x0, x1, y0, y1) => rect(hx(x0), hx(x1), hy(y0), hy(y1));
const hdepth = (x, y, z) => H3(x, y, z);
const hlamp = (name, x, y, z, r) => lamp(name, hx(x), hy(y), hz(z), r * 1.1);
const hglow = (name, x0, x1, y0, y1, z) => `<path class="fig-glow" data-part="${name}" d="${pth(hrect(x0, x1, y0, y1).map(([x, y]) => at([x, y, hz(z)])), true)}" opacity="0"/>`;
const HX0 = 96, HX1 = 226, HY0 = 96, HY1 = 172, HZ = 1.6;
{
  base.push(S(k.extrude(hrect(HX0, HX1, HY0, HY1), 0, hz(HZ), P, { bevel: 0.5 }), { tone: "lo" }));
  base.push(L(Array.from({ length: 7 }, (_, i) => k.lineOnTop([hx(HX0 + (i + 1) * 16.25), hy(HY0)], [hx(HX0 + (i + 1) * 16.25), hy(HY1)], hz(HZ), P)).join("") + Array.from({ length: 4 }, (_, i) => k.lineOnTop([hx(HX0), hy(HY0 + (i + 1) * 15.2)], [hx(HX1), hy(HY0 + (i + 1) * 15.2)], hz(HZ), P)).join(""), { tone: "faint", free: true }));
  // murs arrière : nord et ouest ; poteaux et lisses sur les côtés ouverts
  hbx(HX0, HX1, HY0, HY0 + 2.4, HZ, 34, { tone: "mid", bevel: 0.6 });
  hbx(HX0, HX0 + 2.4, HY0, HY1, HZ, 34, { tone: "mid", bevel: 0.6 });
  const dx = 160, op = [hat(dx - 4, HY0 + 2.4, 3.6), hat(dx + 4, HY0 + 2.4, 3.6), hat(dx + 4, HY0 + 2.4, 11), hat(dx - 4, HY0 + 2.4, 11)];
  put(hdepth(dx, HY0 + 2.4, 8), dark(pth(op, true)) + L(pth(op, true), { tone: "lo" }) + L(hln([HX0, HY0 + 2.4, 20], [HX1, HY0 + 2.4, 20]) + hln([HX0, HY0 + 2.4, 30], [HX1, HY0 + 2.4, 30]), { tone: "faint", free: true }), 0.2);
  for (const [x, y] of [[HX1 - 1.4, HY0 + 1.4], [HX1 - 1.4, HY1 - 1.4], [HX0 + 1.4, HY1 - 1.4]]) hcy(x, y, 1.4, HZ, 34, { tone: "mid", crease: "none" });
  put(hdepth(HX1, (HY0 + HY1) / 2, 34), hbx(HX1 - 2.8, HX1, HY0, HY1, 33, 2.4, { reg: false, tone: "mid", bevel: 0.3 }), 0.1);
  put(hdepth((HX0 + HX1) / 2, HY1, 34), hbx(HX0, HX1, HY1 - 2.8, HY1, 33, 2.4, { reg: false, tone: "mid", bevel: 0.3 }), 0.1);
  // plateau de mesure
  hbx(124, 172, 112, 150, HZ, 7, { tone: "mid", bevel: 0.6 });
  hbx(126, 170, 114, 148, HZ + 7, 1.2, { tone: "lo", bevel: 0.3 });
  put(hdepth(148, 131, 10), L(k.planOutline({ x: hx(128), y: hy(116), w: 40 * HS, d: 30 * HS, r: 1 }, hz(HZ + 8.2), P, 3) + Array.from({ length: 5 }, (_, i) => k.lineOnTop([hx(130 + i * 8.5), hy(116)], [hx(130 + i * 8.5), hy(146)], hz(HZ + 8.2), P)).join(""), { tone: "faint", free: true }) + hdots([[128, 116, 9.8], [168, 116, 9.8], [128, 146, 9.8], [168, 146, 9.8]]), 0.3);
  // arche du détecteur : deux montants, traverse, tête de lecture
  for (const y of [106, 156]) put(hdepth(148, y, 14), S(k.cylinder(hx(148), hy(y), 3.4 * HS, hz(HZ), 1.2 * HS, P, 20), { tone: "lo" }) + S(G.solidOf([[0, 2 * HS], [30 * HS, 2 * HS], [30.6 * HS, 2.8 * HS], [32.4 * HS, 2.8 * HS]], G.frameAlong([hx(148), hy(y), hz(HZ + 1.2)], Zv), P), { tone: "mid" }), 0.2);
  hbx(144, 152, 104, 158, 33.6, 3.6, { tone: "mid", bevel: 0.5 });
  put(hdepth(148, 131, 40), `<g data-part="det">${S(k.cylinder(hx(148), hy(131), 4.4 * HS, hz(24), 9.6 * HS, P, 22), { tone: "hi", lit: true })}${S(k.cylinder(hx(148), hy(131), 2.4 * HS, hz(20.4), 3.6 * HS, P, 18), { tone: "lo" })}</g>`, 0.6);
  // armoire des pages inédites : caisson verrouillé, tiroir qui sort vers nous
  hbx(198, 222, 100, 118, HZ, 28, { tone: "mid", bevel: 0.7 });
  const dr = [hat(201, 118, HZ + 4), hat(219, 118, HZ + 4), hat(219, 118, HZ + 20), hat(201, 118, HZ + 20)];
  put(hdepth(210, 118, 16), L(pth(dr, true), { tone: "lo" }) + L(hln([198, 118, 24], [222, 118, 24]) + hln([198, 118, HZ + 2], [222, 118, HZ + 2]), { tone: "faint", free: true }) + hdots([[200, 118, 27], [220, 118, 27]]) + hlamp("lamp-cab", 210, 118, 24.4, 1.4), 0.3);
  put(hdepth(210, 123, 4), `<g data-part="drawer">${hbx(201, 219, 118, 134, HZ + 4, 2.2, { reg: false, tone: "lo", bevel: 0.3 })}${hbx(201, 219, 133, 135, HZ + 4, 6, { reg: false, tone: "mid", bevel: 0.3 })}</g>`, 0.5);
  // convoyeur armoire → plateau
  hbx(174, 197, 128, 140, HZ, 4, { tone: "mid", bevel: 0.4 });
  put(hdepth(186, 134, 6), L(Array.from({ length: 6 }, (_, i) => k.lineOnTop([hx(176 + i * 4), hy(128)], [hx(176 + i * 4), hy(140)], hz(HZ + 4), P)).join(""), { tone: "faint", free: true }), 0.2);
  // trémie des pages de production : au sud du plateau
  hbx(134, 162, 154, 168, HZ, 11, { tone: "mid", bevel: 0.6 }); hbx(133, 163, 153.4, 169, HZ + 9.6, 2, { tone: "lo", bevel: 0.3 });
  for (let i = 0; i < 3; i++) put(hdepth(148, 161, 14), S(k.extrude(hrect(140, 156, 157, 166), hz(HZ + 11.6 + i * 0.9), 0.8 * HS, P, { bevel: 0.1 }), { tone: "hi", crease: "none" }), 0.3);
  const hs = [hat(138, 154, HZ + 2.2), hat(158, 154, HZ + 2.2), hat(158, 154, HZ + 5.2), hat(138, 154, HZ + 5.2)];
  put(hdepth(148, 154, 6), dark(pth(hs, true)) + L(pth(hs, true), { tone: "lo" }), 0.5);
  // trois bureaux de validation : écran, tampon, voyant ; un bus partagé les relie
  [0, 1, 2].forEach((i) => {
    const x = 172 + i * 17, y = 150;
    hbx(x - 6.4, x + 6.4, y, y + 14, HZ, 8, { tone: "mid", bevel: 0.5 });
    hbx(x - 4.4, x + 4.4, y + 9, y + 10.6, HZ + 8, 8, { tone: "hi", bevel: 0.3 });
    put(hdepth(x, y + 10, 14), `<path class="iso-fill fig-window" d="${pth([hat(x - 3.6, y + 10.8, HZ + 9.4), hat(x + 3.6, y + 10.8, HZ + 9.4), hat(x + 3.6, y + 10.8, HZ + 14.2), hat(x - 3.6, y + 10.8, HZ + 14.2)], true)}"/>` + hlamp("vdesk-" + i, x + 4.8, y + 3.4, HZ + 8.1, 1.2) + `<g data-part="stamp-${i}">${S(k.cylinder(hx(x - 3), hy(y + 4.4), 1.6 * HS, hz(HZ + 8), 2.4 * HS, P, 14), { tone: "hi", lit: true })}${S(k.cylinder(hx(x - 3), hy(y + 4.4), 0.8 * HS, hz(HZ + 10.4), 3.2 * HS, P, 10), { tone: "mid" })}</g>`, 0.4);
  });
  hbx(158, 198, 165, 168, HZ, 3, { tone: "lo", bevel: 0.3 });
  put(hdepth(178, 166.5, 4), hglow("bus", 159, 197, 165.4, 167.6, HZ + 3.05), 0.5);
}

// ---------------------------------------------------------------- bâtiment de contrôle : compteur du corpus, cadran du gain ×2,3
{
  const cx0 = 160, cx1 = 224, cy0 = -172, cy1 = -130, hh = 36;
  put([192, -151, 1], `<path class="iso-halo" d="${k.haloOf({ x: cx0 - 4, y: cy0 - 4, w: cx1 - cx0 + 8, d: cy1 - cy0 + 8, r: 3 }, 0, 4, P)}" style="filter:blur(3px)"/>`, -0.5);
  bx(cx0, cx1, cy0, cy1, 0, hh, { tone: "mid", bevel: 0.8 });
  bx(cx0 - 2, cx1 + 2, cy0 - 2, cy1 + 2, hh, 3, { tone: "lo", bevel: 0.5 });
  // face avant (y = cy1) : six fenêtres hautes, porte, cadran du gain
  const win = (x0, x1, z0, z1, yy) => { const p = [at([x0, yy, z0]), at([x1, yy, z0]), at([x1, yy, z1]), at([x0, yy, z1])]; return `<path class="iso-fill fig-window" d="${pth(p, true)}"/>` + L(pth(p, true), { tone: "lo" }) + L(ln3([(x0 + x1) / 2, yy, z0], [(x0 + x1) / 2, yy, z1]), { tone: "faint", free: true }); };
  let f = "";
  for (const x of [166, 176, 206, 216]) f += win(x - 3, x + 3, 22, 31, cy1);
  f += win(206 - 3, 216 + 3, 6, 16, cy1).replace(/./, "");
  put([192, cy1, 18], f + L(ln3([cx0, cy1, 4], [cx1, cy1, 4]) + ln3([cx0, cy1, 33], [cx1, cy1, 33]), { tone: "faint", free: true }), 0.5);
  // grand cadran : disque, graduations de 0 à 3, repère de 2,3, aiguille grise fixe à 1
  const gx = 191, gz = 18, gr = 11.5, ga = (v) => (205 - v * 230 / 3) * Math.PI / 180;
  const P3 = (rr, a) => at([gx + rr * Math.cos(a), cy1 + 0.1, gz + rr * Math.sin(a)]);
  let g = S(G.disc(-1.6, 0, gr, G.frameAlong([gx, cy1, gz], Y), P), { tone: "mid" });
  const circ = (rr) => pth(Array.from({ length: 40 }, (_, i) => P3(rr, i / 40 * TAU)), true);
  g += `<path class="iso-fill fig-window" d="${circ(gr - 1.2)}"/>` + L(circ(gr - 1.2), { tone: "lo" }) + L(circ(gr - 3.4), { tone: "faint", free: true });
  const tk = [], tm = [];
  for (let q = 0; q <= 12; q++) { const a = ga(q * 0.25), r0 = q % 4 === 0 ? gr - 4.6 : gr - 3.7; (q % 4 === 0 ? tm : tk).push(pth([P3(r0, a), P3(gr - 1.2, a)])); }
  g += L(tk.join(""), { tone: "lo" }) + L(tm.join(""), { tone: "mid" });
  g += L(pth([P3(gr - 5.4, ga(2.3)), P3(gr - 1.2, ga(2.3))]), { tone: "hi" }) + D([P3(gr - 5.4, ga(2.3))], { size: 0.7, tone: "hi" });
  g += L(pth([P3(0, 0), P3(gr - 3.7, ga(1))]), { tone: "mid" });
  put([gx, cy1, gz], g, 0.6);
  put([gx, cy1, gz], `<g data-part="gain-needle"></g>`, 0.8);
  // toit : groupes froid, cheminées, pas d'antenne : rien ne sort
  for (const [x, y] of [[172, -160], [188, -150], [206, -158]]) put([x, y, hh + 8], S(k.cylinder(x, y, 4.2, hh + 3, 6, P, 22), { tone: "mid" }) + S(k.cylinder(x, y, 3, hh + 9, 1, P, 18), { tone: "lo" }), 0.5);
  bx(176, 202, -168, -156, hh + 3, 4, { tone: "hi", bevel: 0.5 });
}

// ---------------------------------------------------------------- pupitre de publication, colonnes de seuil, coffre des modules précédents
{
  const x0 = -36, x1 = 14, y0 = 100, y1 = 120;
  put([-11, 110, 1], `<path class="iso-halo" d="${k.haloOf({ x: x0 - 3, y: y0 - 3, w: x1 - x0 + 6, d: y1 - y0 + 6, r: 3 }, 0, 4, P)}" style="filter:blur(3px)"/>`, -0.5);
  bx(x0, x1, y0, y1, 0, 9, { tone: "mid", bevel: 0.8 });
  bx(x0, x1, y0, y0 + 3, 9, 20, { tone: "mid", bevel: 0.6 });
  // cadran de fiabilité sur le panneau arrière (face y = y0 + 3)
  const gx = -22, gz = 20, gr = 6.4, ga = (v) => (200 - v * 220)* Math.PI / 180;
  const P3 = (rr, a) => at([gx + rr * Math.cos(a), y0 + 3.05, gz + rr * Math.sin(a)]);
  const circ = (rr) => pth(Array.from({ length: 32 }, (_, i) => P3(rr, i / 32 * TAU)), true);
  put([gx, y0 + 3, gz], `<path class="iso-fill fig-window" d="${circ(gr)}"/>` + L(circ(gr), { tone: "mid" }) + L(circ(gr - 1.4), { tone: "faint", free: true }) + L(Array.from({ length: 11 }, (_, q) => pth([P3(gr - 1.4, ga(q / 10)), P3(gr, ga(q / 10))])).join(""), { tone: "lo" }) + L(pth([P3(gr - 1.4, ga(0.75)), P3(gr, ga(0.75))]) + pth([P3(gr - 1.4, ga(0.9)), P3(gr, ga(0.9))]), { tone: "hi" }) + `<g data-part="rel-needle"></g>`, 0.6);
  put([6, y0 + 3, 24], lamp("lamp-pub", 6, y0 + 3.1, 26, 1.7) + lamp("lamp-cand", -2, y0 + 3.1, 26, 1.5), 0.6);
  // deux colonnes de seuil sur le pupitre : graduations de 0,5 à 1 ; repères pleins à 0,75 et 0,90
  const zv = (v) => 12 + (v - 0.5) / 0.5 * 19.2;
  for (const [i, cx2, mk] of [[0, -28, 0.75], [1, -14, 0.9]]) {
    cy(cx2, 112, 3.6, 9, 1.6, { tone: "lo" }); cy(cx2, 112, 1.8, 10.6, 22, { tone: "mid", crease: "none" });
    put([cx2, 112, 24], L(Array.from({ length: 9 }, (_, q) => k.ring(cx2, 112, 1.85, zv(0.5 + q * 0.0625), P, 14)).join(""), { tone: "faint", free: true }) + L(k.ring(cx2, 112, 1.9, zv(mk), P, 14), { tone: "hi" }) + lamp("fork-" + i, cx2, 112, 33, 1.4), 0.6);
  }
  // levier et goupille
  put([4, 112, 16], `<g data-part="lever"></g>`, 0.7);
  put([4, 112, 12], S(k.cylinder(4, 112, 2.6, 9, 1.4, P, 20), { tone: "lo" }) + `<g data-part="pin">${S(k.cylinder(12, 105, 0.9, 9, 9, P, 10), { tone: "hi", lit: true })}</g>`, 0.3);
  bx(10, 15, 103, 108, 9, 3, { tone: "lo", bevel: 0.3 });
  // coffre : étagères avec les modules précédents
  const vx = -88;
  bx(vx - 16, vx + 16, 100, 112, 0, 3, { tone: "lo", bevel: 0.5 });
  for (const x of [vx - 15, vx + 14]) bx(x, x + 1.4, 100.4, 111.6, 3, 36, { tone: "mid", bevel: 0.2 });
  for (const z of [14, 28]) bx(vx - 15, vx + 15.4, 100.4, 111.6, z, 1.6, { tone: "hi", bevel: 0.3 });
  turn([vx - 6, 106, 15.6], X, [[0, 3.6], [1, 5.4], [3, 5.4], [4, 3.6], [8, 3.6], [9, 5.4], [11, 5.4], [12, 3.6]], { tone: "mid", at3: [vx, 106, 18] });
  turn([vx - 6, 106, 29.6], X, [[0, 3.6], [1, 5.4], [3, 5.4], [4, 3.6], [8, 3.6], [9, 5.4], [11, 5.4], [12, 3.6]], { tone: "mid", at3: [vx, 106, 32] });
  put([vx, 106, 20], `<path class="fig-glow" data-part="vault-0" d="${pth(rect(vx - 6, vx + 6, 103, 109).map(([x, y]) => at([x, y, 15.7])), true)}" opacity="0"/>`, 0.7);
}

// ---------------------------------------------------------------- clôture du site : « local », une seule porte
{
  const x0 = -222, x1 = 222, y0 = -172, y1 = 232, step = 22;
  const post = (x, y) => { put([x, y, 5], S(k.cylinder(x, y, 0.9, 0, 11, P, 10), { tone: "mid", crease: "none" }), 0.1); };
  const rails = (a, b) => { const out = []; for (const z of [10, 6]) out.push(pth([at([...a, z]), at([...b, z])])); return L(out.join(""), { tone: "lo", free: true }) + dots([[...a, 10], [...b, 10]], 0.5, "mid"); };
  const side = (ax, ay, bx2, by2, gate) => {
    const n = Math.round(Math.hypot(bx2 - ax, by2 - ay) / step);
    for (let i = 0; i <= n; i++) { const x = ax + (bx2 - ax) * i / n, y = ay + (by2 - ay) * i / n; post(x, y); }
    for (let i = 0; i < n; i++) {
      const a = [ax + (bx2 - ax) * i / n, ay + (by2 - ay) * i / n], b = [ax + (bx2 - ax) * (i + 1) / n, ay + (by2 - ay) * (i + 1) / n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (gate && gate(m)) continue;
      put([m[0], m[1], 8], rails(a, b), 0.2);
    }
  };
  side(x0, y0, x1, y0); side(x1, y0, x1, y1); side(x1, y1, x0, y1, ([mx]) => mx > -62 && mx < -18); side(x0, y1, x0, y0);
  // porte : deux vantaux, cadenas, plaque gravée LOCAL, caméra
  const gx0 = -62, gx1 = -18;
  for (const [a, b] of [[gx0, -41], [-39, gx1]]) put([(a + b) / 2, y1, 8], bx(a, b, y1 - 0.8, y1 + 0.8, 1, 10, { reg: false, tone: "hi", bevel: 0.2 }) + L(ln3([a, y1 + 0.8, 5], [b, y1 + 0.8, 5]), { tone: "faint", free: true }), 0.3);
  put([-40, y1, 8], S(k.cylinder(-40, y1 + 1, 1.8, 3, 3, P, 12), { tone: "mid" }) + S(G.sphereOf([-40, y1 + 1, 3], 1.1, P), { tone: "hi", lit: true }), 0.4);
  put([-40, y1, 16], bx(-50, -30, y1 - 0.6, y1 + 0.6, 12, 6, { reg: false, tone: "lo", bevel: 0.2 }) + `<text class="iso-face-text" data-tone="hi" transform="${k.sideMatrix([0, y1 + 0.7], 0, P, "left")}" x="-40" y="-14.2" font-size="3.4" text-anchor="middle" letter-spacing=".18em">LOCAL</text>`, 0.5);
  for (const x of [gx0, gx1]) { cy(x, y1, 1.3, 0, 22, { tone: "mid", crease: "none" }); cy(x, y1, 2.2, 22, 1.2, { tone: "lo" }); }
  bx(gx0 - 1, gx1 + 1, y1 - 1, y1 + 1, 22.4, 1.6, { tone: "mid", bevel: 0.3 });
}

// ---------------------------------------------------------------- tube de retour : des cadres validés jusqu'à la trémie, en verre
const RET = [[hx(218), hy(170), 4], [hx(218), 222, 4], [-210, 222, 4], [-210, -100, 4], [-218, -100, 4], [-218, -88, 8]];
tube(RET, 2.6, { maxLength: 40, spacing: 4, caps: [true, true], tone: "lo", rings: { pitch: 6, fade: [0.05, 0.4] } });
for (let x = 190; x > -210; x -= 56) put([x, 222, 2], S(k.cylinder(x, 222, 1.1, 0, 1.4, P, 10), { tone: "lo", crease: "none" }) + S(k.cylinder(x, 222, 0.8, 1.4, 1.2, P, 8), { tone: "mid", crease: "none" }), -0.1);
for (let y = 200; y > -100; y -= 56) put([-210, y, 2], S(k.cylinder(-210, y, 1.1, 0, 1.4, P, 10), { tone: "lo", crease: "none" }), -0.1);

// ---------------------------------------------------------------- pièces mobiles : tête laser, clés, colonnes, pages, périscope de la lumière
const pageGroup = (name, sc = 1) => `<g data-part="${name}" opacity="0">${pageMarkup(0, sc)}</g>`;
{
  // tête du laser : coulisseau sur la traverse, émetteur, bague de sortie
  put([-193, LY, 28], `<g data-part="lhead">${bx(-199, -187, LY - 3.4, LY + 3.4, 25, 5.8, { reg: false, tone: "mid", bevel: 0.5 })}${S(k.cylinder(-193, LY, 2.2, 13, 12, P, 20), { tone: "hi", crease: "none" })}${S(k.cylinder(-193, LY, 3.2, 11.8, 1.4, P, 22), { tone: "hi", lit: true })}${L(k.ring(-193, LY, 2.25, 20, P, 18) + k.ring(-193, LY, 2.25, 16, P, 18), { tone: "faint", free: true })}</g>`, 0.9);
  // clés : le modèle (ronde) et les règles (carrée), couchées sur leurs rails, bout en y = 0
  const kx = -66, face = LY - 52 + 6;
  const keyPts = (kind) => kind === 0
    ? S(k.cylinder(0, 17.6, 3.3, -0.8, 1.6, P, 22), { tone: "hi", lit: true }) + S(k.cylinder(0, 17.6, 1.2, -0.8, 1.7, P, 12), { tone: "lo", crease: "none" })
    : bx(-3.2, 3.2, 14.4, 20.8, -0.8, 1.6, { reg: false, tone: "hi", lit: true, bevel: 0.3 }) + bx(-1, 1, 16.4, 18.8, -0.8, 1.7, { reg: false, tone: "lo", bevel: 0.1 });
  const key = (name, dx, kind) => `<g data-part="${name}">${bx(-0.8, 0.8, 0, 14.4, -0.8, 1.6, { reg: false, tone: "mid", bevel: 0.2 })}${bx(-1.4, 1.4, 3, 4.2, -0.8, 1.6, { reg: false, tone: "mid", bevel: 0.15 })}${bx(-1.4, 1.4, 6, 7.2, -0.8, 1.6, { reg: false, tone: "mid", bevel: 0.15 })}${keyPts(kind)}</g>`;
  put([kx, face + 8, 15], key("key-n", 0, 0) + key("key-r", 0, 1), 0.9);
  // colonnes de seuil et pages
  put([-14, 112, 20], `<g data-part="cols"></g>`, 0.9);
  put([-193, LY, 6], pageGroup("page0"), 0.8);
  put(H3(148, 131, 12), pageGroup("page1", HS), 0.8);
  put(H3(148, 160, 12), pageGroup("page2", HS), 0.8);
  // périscope : la ligne monte dans la halle, longe l'arche, redescend sur le plateau
  const PX = BX, PY = hy(102);
  tube([[PX, HOY, ZP], [PX, PY, ZP], [PX, PY, hz(34)], [hx(148), PY, hz(34)], [hx(148), hy(112), hz(34)]], 1.6 * 1.1, { maxLength: 30, spacing: 2, caps: [false, true], tone: "mid" });
  put([PX, PY, 20], S(k.cylinder(PX, PY, 3.4, hz(18), 3, P, 18), { tone: "lo" }) + S(k.cylinder(PX, PY, 3.4, 5, 3, P, 18), { tone: "lo" }), 0.6);
  // afficheur du corpus sur la face est du bâtiment de contrôle
  const rightFace = k.sideMatrix([224, 0], 0, P, "right");
  put([224, -151, 18], `<g transform="${rightFace}"><path class="iso-fill fig-window" d="${T.flat(150, 16, 168, 28, 1)}"/><path class="iso-line" data-tone="lo" d="${T.flat(150, 16, 168, 28, 1)}"/><text class="fig-digits" data-part="count" x="159" y="-19.4" text-anchor="middle" font-size="7">10</text></g>`, 0.8);
}

// ---------------------------------------------------------------- modèle
const STATIONS = [
  ["Lecture · Document AI", "un laser lit les quatre champs de la page"],
  ["Tri · mini-BERT", "chaque champ prend sa voie dans la chicane"],
  ["Hybride neuro-symbolique", "deux cavités accordées : le modèle et les règles"],
  ["Relecture · Human-in-the-Loop", "la main règle la mâchoire, chaque champ est étiqueté"],
  ["Corpus multimodal", "le booster verse la fiche : image, texte, positions"],
  ["Entraînement · LayoutLMv3", "trois rampes d'énergie : le candidat se forme"],
  ["Évaluation et publication", "pages inédites, deux seuils, le levier promeut le candidat"],
  ["Inférence", "la lumière balaie une page de production et propose des cadres"],
  ["Validation et boucle", "trois pupitres, une correction partagée, le tube la renvoie au corpus : gain × 2,3"],
];
const live = `
const P = ${JSON.stringify(P)};
const RC = ${JSON.stringify(RC)}, RM = ${RM}, RB = ${RB}, LY = ${LY}, ZP = ${ZP}, BX = ${BX};
const PW = ${PW}, PH = ${PH}, FY = ${JSON.stringify(FY)}, LANES = ${JSON.stringify(LANES)}, CAT = [2, 0, 3, 1];
const HZ = ${HZ}, RET = ${JSON.stringify(RET)}, VANG = ${VANG};
const HS = ${HS}, HOX = ${HOX}, HOY = ${HOY};
const Hm = (x, y, z) => [HOX + (x - 96) * HS, HOY + (y - 96) * HS, z * HS];
const prH = (x, y, z) => iso(Hm(x, y, z), P);
const STATIONS = ${JSON.stringify(STATIONS)};
${LOOP}
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const TAU = Math.PI * 2;
const hash = (n) => { let h = Math.imul(n + 7, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const pr = (x, y, z) => iso([x, y, z], P);
const tW = (dx, dy, dz) => translateAlong(P, [dx, dy, dz || 0]);
const Ts = [0, 6, 12.5, 19.5, 27.5, 34, 45, 57, 67], TD = 80, TEND = 82;
const stationAt = (s) => { let i = 0; Ts.forEach((a, j) => { if (s >= a) i = j; }); return i; };
const lineFx = (d, w, a, extra) => '<path class="fx-line" d="' + d + '" style="stroke-width:' + w + ';opacity:' + clamp01(a).toFixed(2) + (extra || '') + '"/>';
const dotFx = (p, r, a, cls) => '<circle class="' + (cls || 'fx-dot') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(2) + '" style="opacity:' + clamp01(a).toFixed(2) + '"/>';
const ringPts = (cx, cy, r, z, n) => Array.from({ length: n || 28 }, (_, i) => pr(cx + r * Math.cos(i / (n || 28) * TAU), cy + r * Math.sin(i / (n || 28) * TAU), z));
const rectAt = (cx, cy, w, d, z) => pathOf([pr(cx - w / 2, cy - d / 2, z), pr(cx + w / 2, cy - d / 2, z), pr(cx + w / 2, cy + d / 2, z), pr(cx - w / 2, cy + d / 2, z)], true);
// piecewise-linear lissé : kf = [[t, v], ...]
const pw = (kf, t) => { if (t <= kf[0][0]) return kf[0][1]; for (let i = 1; i < kf.length; i++) if (t <= kf[i][0]) return lerp(kf[i - 1][1], kf[i][1], ease((t - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0] || 1))); return kf[kf.length - 1][1]; };
// ---- énergie de l'anneau : trois rampes (les trois époques d'entraînement), intégrale précalculée
const OMK = [[0, 1.0], [35, 1.0], [36.4, 2.0], [38.4, 2.0], [39.8, 3.2], [41.8, 3.2], [43.2, 4.6], [90, 4.6]];
const OM = (t) => pw(OMK, t);
const CUM = []; { let c = 0; for (let i = 0; i <= 9000; i++) { CUM.push(c); c += OM(i * 0.01) * 0.01; } }
const C = (t) => { const x = Math.max(0, Math.min(8999.99, t * 100)), i = Math.floor(x); return CUM[i] + (CUM[i + 1] - CUM[i]) * (x - i); };
const ramp = (t) => clamp01((OM(t) - 1) / 3.6);
// ---- trajectoire d'un champ (0..3) : du plateau de lecture jusqu'à l'anneau
const laneY = (k, x) => LY + LANES[CAT[k]] * Math.min(1, Math.pow(Math.sin(Math.PI * clamp01((x + 146) / 38)), 0.5));
function linPos(u, k) {
  const x = u - 193;
  if (x < -176) { const v = ease((x + 193) / 17); return [x, LY + FY[k] * (1 - v), lerp(3.4, ZP, v)]; }
  if (x >= -146 && x <= -108) return [x, laneY(k, x), ZP];
  return [x, LY, ZP];
}
const bpos = (th) => [RC[0] + RB * Math.cos(th), RC[1] + RB * Math.sin(th), ZP];
const mpos = (th) => [RC[0] + RM * Math.cos(th), RC[1] + RM * Math.sin(th), ZP];
const T0 = (k) => 3.6 + 0.35 * k, TI = (k) => 24.4 + 1.2 * k, TX = (k) => TI(k) + 6, TR = (k) => TX(k) + 0.5, VB = 92;
const KF = (k) => [[T0(k), 0], [5.4 + 0.35 * k, 34 - 3 * k], [6.4 + 0.9 * k, 47], [8.3 + 0.9 * k, 85], [9.6 + 0.9 * k, 100 - 3.5 * k],
  [16.0 + 0.9 * k, 100 - 3.5 * k], [17.4 + 0.9 * k, 149], [18.6 + 0.9 * k, 156 - 2.2 * k],
  [20.0 + 1.2 * k, 156 - 2.2 * k], [20.9 + 1.2 * k, 168], [21.9 + 1.2 * k, 168], [23.0 + 1.2 * k, 205], [24.2 + 1.2 * k, 228], [TI(k), 233]];
const KFS = [0, 1, 2, 3].map(KF);
// position, énergie et existence du champ k à l'instant s
function bunch(k, s) {
  if (s < T0(k) || s > TD + 0.8) return null;
  const fade = 1 - ease(seg(s, TD - 0.4, TD + 0.8));
  if (s < TI(k)) { const u = pw(KFS[k], s); return { p: linPos(u, k), e: 0, a: fade, u, ring: -1 }; }
  if (s < TX(k)) { const th = 1.5 * Math.PI + (233 + VB * (s - TI(k)) - 233) / RB; return { p: bpos(th), e: 0, a: fade, ring: 0, th }; }
  if (s < TR(k)) {
    const f = (s - TX(k)) / 0.5, a0 = [RC[0] - RB, RC[1], ZP], a1 = [-48, RC[1], ZP], c = [-60, RC[1], ZP], z1 = [-59.3, -36.2, ZP];
    let p; if (f < 0.68) { const g = f / 0.68; p = [lerp(a0[0], a1[0], g), RC[1], ZP]; } else { const g = (f - 0.68) / 0.32; p = [(1 - g) * (1 - g) * a1[0] + 2 * (1 - g) * g * c[0] + g * g * z1[0], (1 - g) * (1 - g) * a1[1] + 2 * (1 - g) * g * c[1] + g * g * z1[1], ZP]; }
    return { p, e: 0.05, a: fade, ring: 0.5 };
  }
  const th = Math.PI * 187 / 180 + C(s) - C(TR(k));
  return { p: mpos(th), e: ramp(s), a: fade, ring: 1, th };
}
// ---- calendrier des événements
const EV = {
  pageIn: 0.2, scan0: 1.8, scan1: 3.4, keyN: [12.8, 14.0], keyR: [13.8, 15.0], lock: 15.2, cav: 15.4,
  jaw: (k) => 20.8 + 1.2 * k, kickIn: (k) => TI(k) - 0.3, drum: 29.0, slot: 30.4,
  frontEnd: 44.6, drawer: [45.3, 46.6], belt: [46.6, 48.6], scanE: [49.0, 53.0], pin: [53.6, 54.2], lever: [54.2, 55.6],
  prod: [57.2, 58.6], scanI: [59.2, 64.4], toDesk: [67.2, 68.6], stamp: 69.2, toTube: [70.4, 71.6], cap: [71.8, 77.4], gain: [72.5, 77]
};
function stateAt(s) {
  const o = { s }, res = ease(seg(s, TD + 0.2, TD + 1.8)), per = (a, b) => ease(seg(s, a, b)) * (1 - res);
  o.res = res;
  // 0 · le laser lit la page
  o.page0 = { x: lerp(-212, -193, ease(seg(s, EV.pageIn, 1.4))), a: ease(seg(s, 0.2, 0.7)) * (1 - ease(seg(s, 4.4, 5.2))) };
  o.headY = s < EV.scan1 ? lerp(LY - 22, LY + 10, ease(seg(s, 1.2, 1.8))) * 0 + (s < EV.scan0 ? lerp(LY - 22, LY - 10, ease(seg(s, 1.0, 1.8))) : lerp(LY - 10, LY + 10, seg(s, EV.scan0, EV.scan1))) : lerp(LY + 10, LY - 22, ease(seg(s, 3.5, 4.4)));
  o.scan0 = s > EV.scan0 && s < EV.scan1;
  o.read = FY.map((y) => (s > EV.scan0 && o.headY >= LY + y - 1 ? clamp01(1 - (s - 4.6) / 0.6) : 0));
  o.lampRead = s > 1.0 && s < 4.4;
  // faisceau d'électrons
  o.bunches = [0, 1, 2, 3].map((k) => bunch(k, s));
  // 1 · chicane : chaque champ allume l'empreinte de sa catégorie
  o.sorted = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) o.sorted[CAT[k]] = per(6.4 + 0.9 * k + 1.0, 6.4 + 0.9 * k + 1.1) > 0.5 ? 1 : 0;
  // 2 · deux clés dans l'armoire, cavités qui s'allument ensemble
  o.keyN = per(EV.keyN[0], EV.keyN[1]); o.keyR = per(EV.keyR[0], EV.keyR[1]); o.lampLock = per(EV.lock, EV.lock + 0.2) > 0.5 ? 1 : 0;
  o.cavModel = per(EV.cav, EV.cav + 0.8); o.cavRules = per(EV.cav + 0.4, EV.cav + 1.2);
  // 3 · collimateur : la mâchoire se règle au volant, un champ à la fois
  o.jaw = 0; o.wheel = 0;
  for (let k = 0; k < 4; k++) { const a = EV.jaw(k), d = s - a; const v = d < 0 ? 0 : d < 0.45 ? ease(d / 0.45) : d < 1.0 ? 1 - ease((d - 0.45) / 0.55) : 0; o.jaw = Math.max(o.jaw, v); if (d > 0 && d < 1.0) o.wheel += d * 6 * (d < 0.45 ? 1 : -1); }
  o.wheelBase = [0, 1, 2, 3].reduce((acc, k) => acc + clamp01((s - EV.jaw(k)) / 1.0) * 1.3, 0);
  o.tag = [0, 1, 2, 3].map((k) => ease(seg(s, EV.jaw(k) + 0.55, EV.jaw(k) + 0.95)));
  o.flashChic = Math.max(...[0, 1, 2, 3].map((k) => { const d = s - (6.4 + 0.9 * k); return d > 0 && d < 1.9 ? Math.sin(Math.PI * d / 1.9) : 0; }));
  // 4 · booster et corpus
  o.kickIn = Math.max(...[0, 1, 2, 3].map((k) => { const d = s - EV.kickIn(k); return d > 0 && d < 0.8 ? Math.sin(Math.PI * d / 0.8) : 0; }));
  o.kickMain = Math.max(...[0, 1, 2, 3].map((k) => { const d = s - TX(k); return d > -0.1 && d < 0.8 ? Math.sin(Math.PI * clamp01((d + 0.1) / 0.9)) : 0; }));
  o.drum = s > EV.drum && s < EV.drum + 1.6 ? Math.sin(Math.PI * (s - EV.drum) / 1.6) : 0;
  o.slots = 10 + (per(EV.slot, EV.slot + 0.2) > 0.5 ? 1 : 0);
  // 5 · anneau principal : les rampes d'énergie
  o.ramp = per(34.4, 34.6) > 0 ? ramp(s) * (1 - res) : 0;
  o.cavCand = Math.max(per(35.0, 36.4) * 0.35 + per(38.4, 39.8) * 0.3 + per(41.8, 43.2) * 0.35, 0) * (s < 55.2 ? 1 : 1);
  o.cavPub = 0.6 * (1 - res) - 0.45 * per(55.2, 56.4);
  o.vault = per(55.6, 56.6) * 0.7;
  o.epoch = s < 35 ? 0 : s < 38.4 ? 1 : s < 41.8 ? 2 : 3;
  // 6 · évaluation : tiroir, page inédite, balayage, seuils, levier
  o.frontEnd = (per(EV.frontEnd, EV.frontEnd + 0.4) - per(56.0, 56.6)) + (per(58.4, 58.8) - per(65.0, 65.6));
  o.drawer = per(EV.drawer[0], EV.drawer[1]) * (1 - ease(seg(s, 48.0, 48.6)));
  const pe = seg(s, EV.belt[0], EV.belt[1]);
  o.page1 = s >= EV.belt[0] - 0.3 && s < 56.0 ? { x: pe < 0.5 ? lerp(210, 186, ease(pe * 2)) : lerp(186, 148, ease(pe * 2 - 1)), y: lerp(126, 131, ease(pe)), z: lerp(8.4, 10.4, ease(pe)), a: ease(seg(s, EV.belt[0] - 0.3, EV.belt[0] + 0.1)) * (1 - ease(seg(s, 55.4, 56.0))) } : null;
  o.rel = s < EV.scanE[0] ? 0 : s < 56 ? ease(seg(s, EV.scanE[0] + 0.3, EV.scanE[1])) * 0.92 : 0.92;
  o.relShow = s >= EV.scanE[0] && s < 80;
  o.colV = [0.5 + per(49.8, 51.2) * 0.25, 0.5 + per(51.4, 52.6) * 0.4];
  o.forkOn = [o.colV[0] >= 0.749 ? 1 : 0, o.colV[1] >= 0.899 ? 1 : 0];
  o.pin = per(EV.pin[0], EV.pin[1]); o.pull = per(EV.lever[0], EV.lever[1]); o.lampPub = o.pull > 0.97 ? 1 : 0; o.lampCand = o.forkOn[1] && !o.lampPub ? 1 : 0;
  o.cab = s > 44.6 && s < 56 ? 1 : 0;
  // 7 · inférence : la page de production, le détecteur
  const pp = seg(s, EV.prod[0], EV.prod[1]);
  o.page2 = s >= EV.prod[0] && s < EV.toDesk[1] + 1.4 ? (s < EV.toDesk[0] ? { x: 148, y: lerp(158, 131, ease(pp)), z: lerp(7.6, 10.4, ease(pp)), a: ease(seg(s, EV.prod[0], EV.prod[0] + 0.4)) } : (s < EV.toTube[0] ? { x: lerp(148, 189, ease(seg(s, EV.toDesk[0], EV.toDesk[1]))), y: lerp(131, 157, ease(seg(s, EV.toDesk[0], EV.toDesk[1]))), z: lerp(10.4, 10.4, 0), a: 1 } : { x: lerp(189, 218, ease(seg(s, EV.toTube[0], EV.toTube[1]))), y: lerp(157, 170, ease(seg(s, EV.toTube[0], EV.toTube[1]))), z: lerp(10.4, 3, ease(seg(s, EV.toTube[0], EV.toTube[1]))), a: 1 - ease(seg(s, EV.toTube[1] - 0.3, EV.toTube[1] + 0.3)) })) : null;
  const sc = (a, b) => (s > a && s < b ? seg(s, a, b) : -1);
  o.scanE = sc(EV.scanE[0], EV.scanE[1]); o.scanI = sc(EV.scanI[0], EV.scanI[1]);
  const sw = (u) => (u < 0 ? 0 : (u * 3.2) % 2 < 1 ? (u * 3.2) % 1 : 1 - (u * 3.2) % 1);
  o.detY = 131 + (o.scanE >= 0 ? (sw(o.scanE) - 0.5) * 20 : o.scanI >= 0 ? (sw(o.scanI) - 0.5) * 20 : 0);
  o.frames = o.scanI >= 0 || (s >= EV.scanI[1] && s < 80);
  o.frameP = (i) => ease(seg(s, EV.scanI[0] + 1.0 + i * 1.3, EV.scanI[0] + 1.5 + i * 1.3));
  // 8 · pupitres, bus, tube de retour, gain
  o.stampPress = (() => { const d = s - EV.stamp; return d < 0 ? 0 : d < 0.18 ? ease(d / 0.18) : d < 0.36 ? 1 - ease((d - 0.18) / 0.18) : 0; })();
  o.validated = s > EV.stamp + 0.2 ? ease(seg(s, EV.stamp + 0.2, EV.stamp + 0.6)) : 0;
  o.bus = s > EV.stamp && s < EV.stamp + 2.2 ? Math.sin(Math.PI * (s - EV.stamp) / 2.2) : 0;
  o.vdesk = s > EV.stamp + 0.3 && s < EV.toTube[1] ? 1 : 0;
  o.cap = s > EV.cap[0] && s < EV.cap[1] + 0.4 ? seg(s, EV.cap[0], EV.cap[1]) : -1;
  o.gain = lerp(1, 2.3, ease(seg(s, EV.gain[0], EV.gain[1]))) * (1 - res) + res;
  o.light = o.frontEnd > 0.05 && (o.scanE >= 0 || o.scanI >= 0 || (s > 48 && s < 56.5) || (s > 58.4 && s < 65.6));
  return o;
}
const parts = {};
for (const n of ["page0", "page1", "page2", "lhead", "key-n", "key-r", "cols", "lever", "pin", "jaw", "wheel", "drawer", "det", "gain-needle", "rel-needle", "count", "bus", "front-end", "kick-in", "kick-main", "chic-a", "chic-b", "cav-model", "cav-rules", "cav-pub", "cav-cand", "vault-0", "lamp-read", "lamp-lock", "lamp-pub", "lamp-cand", "lamp-cab"]) parts[n] = $(n);
const dip = Array.from({ length: 12 }, (_, i) => $("dip-" + i)), bdip = [0, 1, 2, 3].map((i) => $("bdip-" + i)), slots = Array.from({ length: 12 }, (_, i) => $("slot-" + i));
const sortLamps = [0, 1, 2, 3].map((i) => $("sort-lamp-" + i)), forkLamps = [0, 1].map((i) => $("fork-" + i)), vdesk = [0, 1, 2].map((i) => $("vdesk-" + i)), stamps = [0, 1, 2].map((i) => $("stamp-" + i));
const fxLayer = svg.querySelector("#fx"), frontFx = svg.querySelector("#fxf");
let t = 0, frozen = false, touring = true, idle = 0;
const setG = (el, v) => { if (el) el.setAttribute("opacity", clamp01(v).toFixed(2)); };
// ---- la lumière : de l'anneau à la halle, puis jusqu'à la tête du détecteur
const PYH = HOY + (102 - 96) * HS;
const LIGHT = [[BX, RC[1] + 6, ZP], [BX, HOY, ZP], [BX, PYH, ZP], [BX, PYH, 34 * HS], [HOX + (148 - 96) * HS, PYH, 34 * HS]];
function lightFx(o, s) {
  let out = '';
  const a = o.frontEnd * 0.9; if (a <= 0.05 || !o.light) return out;
  const hxs = HOX + (148 - 96) * HS, ydet = HOY + (o.detY - 96) * HS;
  const all = LIGHT.map((p) => iso(p, P)).concat([iso([hxs, ydet, 34 * HS], P)]);
  const d = pathOf(all);
  out += lineFx(d, 3.4, 0.12 * a, ';filter:blur(1.4px)') + lineFx(d, 1.4, 0.8 * a, ';stroke-dasharray:6 5;stroke-dashoffset:' + (-s * 40).toFixed(1));
  const hs = iso([hxs, ydet, 20.4 * HS], P), tz = 10.9 * HS;
  out += '<path class="fx-cone" style="opacity:' + (0.9 * a).toFixed(2) + '" d="' + pathOf([hs, iso([hxs - 8 * HS, ydet, tz], P), iso([hxs + 8 * HS, ydet, tz], P)], true) + '"/>';
  out += lineFx(pathOf([iso([hxs - 8 * HS, ydet, tz], P), iso([hxs + 8 * HS, ydet, tz], P)]), 1.5, a);
  return out;
}
function fxSvg(o, s) {
  let out = '';
  // 0 : la nappe du laser balaie la page, les champs lus s'entourent
  if (o.scan0) {
    const yh = o.headY, zl = 11.8, zp = 3.3;
    out += '<path class="fx-cone" d="' + pathOf([pr(-193, yh, zl), pr(-193 - PW / 2, yh, zp), pr(-193 + PW / 2, yh, zp)], true) + '"/>' + lineFx(pathOf([pr(-193 - PW / 2, yh, zp), pr(-193 + PW / 2, yh, zp)]), 1.4, 0.95);
  }
  o.read.forEach((a, i) => { if (a > 0.02) out += lineFx(k_rect(-193, LY + FY[i], 7.6, 3.2, 3.2), 1.1, a); });
  // faisceaux d'électrons : traînée de points qui s'éteignent, noyau clair, anneau d'étiquette
  o.bunches.forEach((b, k) => {
    if (!b || b.a <= 0.01) return;
    for (let q = 6; q >= 1; q--) { const bq = bunch(k, s - q * 0.035 * (b.ring === 1 ? 1.2 : 1)); if (bq && bq.ring === b.ring) out += dotFx(pr(...bq.p), 2.2 - q * 0.22 + b.e * 0.8, (0.5 - q * 0.07) * b.a * 0.9); }
    const rr = 2.4 + b.e * 1.4, pp = pr(...b.p);
    out += dotFx(pp, rr * 2.1, 0.28 * b.a, 'fx-halo') + dotFx(pp, rr, b.a) + dotFx(pp, rr * 0.45, b.a, 'fx-core');
    const tg = o.tag[k]; if (tg > 0.05) out += '<circle class="fx-ring" cx="' + pp[0].toFixed(1) + '" cy="' + pp[1].toFixed(1) + '" r="' + (rr + 2.4).toFixed(2) + '" style="opacity:' + (tg * b.a).toFixed(2) + '"/>';
  });
  // 5 : la rampe d'énergie : ondes sur le sol de l'anneau
  if (o.epoch > 0) { const ph = (s * 0.6) % 1; out += lineFx(pathOf(ringPts(RC[0], RC[1], RM + 22 * ph, 0.5, 72), true), 1, (1 - ph) * 0.5 * ramp(s)); }
  if (o.drum > 0.02) { out += lineFx(pathOf(ringPts(RC[0], RC[1], 25 + 8 * o.drum, 11.4, 40), true), 1.3, o.drum) + lineFx(pathOf(ringPts(RC[0], RC[1], 23, 14, 36), true), 1, o.drum * 0.7); }
  // 6/7 : la lumière et les repères du balayage
  out += lightFx(o, s);
  const scanning = o.scanE >= 0 ? o.scanE : o.scanI;
  const pg = o.scanE >= 0 ? o.page1 : (o.page2 && o.scanI >= 0 ? o.page2 : null);
  if ((o.scanE >= 0 || o.scanI >= 0) && o.light) { const yy = o.detY; for (let i = 0; i < 3; i++) { const rr = (2 + ((s * 1.6 + i * 0.33) % 1) * 7) * HS, c = Hm(148, yy, 10.9); out += lineFx(pathOf(ringPts(c[0], c[1], rr, c[2], 22), true), 1.1, 1 - ((s * 1.6 + i * 0.33) % 1)); } }
  // propositions : deux sortes de cadres, BT (plein) et locaux (coins arrondis, double trait)
  if (o.frames && o.page2) {
    const c = Hm(o.page2.x, o.page2.y, o.page2.z), px = c[0], py = c[1], z = c[2] + 0.9 * HS;
    const F2 = [[-4.6, -6.2, 5.6, 3.4, 0], [1.4, -1.6, 6.4, 4.6, 1], [-1.2, 5.6, 7.4, 2.8, 0]];
    F2.forEach(([fx, fy, w, d, kind], i) => {
      const u = o.page2.a >= 1 || s < EV.toTube[0] ? o.frameP(i) : 1;
      if (u < 0.02) return;
      const v = o.validated, W2 = w * HS, D2 = d * HS;
      out += lineFx(rectAt(px + fx * HS, py + fy * HS, W2 * u, D2 * u, z), kind ? 1.0 : 1.5, u * (0.6 + 0.4 * v));
      if (kind) out += lineFx(rectAt(px + fx * HS, py + fy * HS, (W2 + 1.6) * u, (D2 + 1.6) * u, z), 0.7, u * 0.7);
      if (v > 0.02) out += '<path class="fx-lit" style="opacity:' + (0.25 * v * u).toFixed(2) + '" d="' + rectAt(px + fx * HS, py + fy * HS, W2, D2, z + 0.02) + '"/>';
    });
  }
  // 8 : onde d'encre au pupitre, capsule dans le tube
  if (s > EV.stamp + 0.15 && s < EV.stamp + 1.0) { const u = (s - EV.stamp - 0.15) / 0.85; const c = Hm(189, 150, HZ + 8.3); out += lineFx(pathOf(ringPts(c[0], c[1], (4 + u * 14) * HS, c[2], 30), true), 1.3, 1 - u) + lineFx(pathOf(ringPts(c[0], c[1], (2 + u * 8) * HS, c[2], 24), true), 0.8, (1 - u) * 0.7); }
  if (o.cap >= 0) {
    const tot = RET.reduce((acc, p, i) => acc + (i ? Math.hypot(p[0] - RET[i - 1][0], p[1] - RET[i - 1][1], p[2] - RET[i - 1][2]) : 0), 0);
    const at = (d) => { let walked = 0; for (let i = 1; i < RET.length; i++) { const L2 = Math.hypot(RET[i][0] - RET[i - 1][0], RET[i][1] - RET[i - 1][1], RET[i][2] - RET[i - 1][2]); if (d <= walked + L2 || i === RET.length - 1) { const g = clamp01((d - walked) / L2); return [lerp(RET[i - 1][0], RET[i][0], g), lerp(RET[i - 1][1], RET[i][1], g), lerp(RET[i - 1][2], RET[i][2], g)]; } walked += L2; } return RET[RET.length - 1]; };
    const d0 = ease(o.cap) * tot;
    for (let q = 8; q >= 1; q--) out += dotFx(pr(...at(Math.max(0, d0 - q * 7))), 2.4 - q * 0.2, 0.55 - q * 0.06);
    const pp = pr(...at(d0)); out += dotFx(pp, 4.4, 0.3, 'fx-halo') + dotFx(pp, 2.4, 1) + dotFx(pp, 1.1, 1, 'fx-core');
    if (o.cap > 0.96) out += lineFx(pathOf(ringPts(-218, LY, 6 + (o.cap - 0.96) * 200, 14, 28), true), 1.2, 1 - (o.cap - 0.96) / 0.04);
  }
  return out;
}
const k_rect = (cx, cy, w, d, z) => rectAt(cx, cy, w, d, z);
function barSvg(x0, y0, x1, y1, w, z, h, tone) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
  return solidSvg(extrude([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], z, h, P, { bevel: 0.2 }), { tone: tone || "mid" });
}
function draw(o, s) {
  // 0
  parts.page0.setAttribute("transform", tW(o.page0.x + 193, 0, 2.4)); parts.page0.setAttribute("opacity", o.page0.a.toFixed(2));
  parts.lhead.setAttribute("transform", tW(0, o.headY - LY, 0)); parts["lamp-read"].dataset.on = String(o.lampRead);
  // 1
  sortLamps.forEach((l, i) => { l.dataset.on = String(o.sorted[i] === 1); });
  setG(parts["chic-a"], o.flashChic * 0.8); setG(parts["chic-b"], o.flashChic * 0.8);
  // 2 : clés posées sur l'armoire, face en y = LY - 46
  const face = LY - 46;
  parts["key-n"].setAttribute("transform", tW(-66 - 7, face + lerp(14, 0.2, o.keyN), 15)); parts["key-r"].setAttribute("transform", tW(-66 + 7, face + lerp(14, 0.2, o.keyR), 15));
  parts["lamp-lock"].dataset.on = String(o.lampLock === 1);
  setG(parts["cav-model"], o.cavModel); setG(parts["cav-rules"], o.cavRules);
  // 3
  parts.jaw.setAttribute("transform", tW(0, -3.8 * o.jaw, 0));
  const wa = (o.wheelBase * 1.4 + o.wheel) * 1.0, wc = -25, wy = LY + 22, wz = 11;
  let sp = ''; for (let q = 0; q < 6; q++) { const a = wa + q * Math.PI / 3; sp += pathOf([pr(wc, wy, wz), pr(wc + 5.8 * Math.cos(a), wy, wz + 5.8 * Math.sin(a))]); }
  parts.wheel.innerHTML = '<path class="iso-line" data-tone="hi" d="' + sp + '"/>' + dotsSvg([pr(wc, wy, wz)], { size: 0.7, tone: "hi" });
  // 4
  setG(parts["kick-in"], o.kickIn); bdip.forEach((g, i) => setG(g, 0.35 * ramp(s) + 0.15 + Math.max(0, o.bunches.reduce((m, b) => m + (b && b.ring === 0 ? 1 : 0), 0) ? 0.35 : 0)));
  bdip.forEach((g) => { if (!o.bunches.some((b) => b && b.ring === 0)) setG(g, 0); });
  slots.forEach((g, i) => { g.dataset.on = String(i < o.slots); });
  const cn = String(o.slots + 0); if (parts.count.textContent !== cn) parts.count.textContent = cn;
  // 5
  setG(parts["kick-main"], o.kickMain);
  dip.forEach((g, i) => setG(g, o.ramp * (0.55 + 0.45 * hash(i + Math.floor(s * 3)))));
  setG(parts["cav-cand"], o.cavCand); setG(parts["cav-pub"], o.cavPub); setG(parts["vault-0"], o.vault);
  // 6
  setG(parts["front-end"], o.frontEnd);
  parts.drawer.setAttribute("opacity", Math.min(1, o.drawer * 2).toFixed(2)); parts.drawer.setAttribute("transform", tW(0, 12 * (o.drawer - 1) * 0 + 8 * o.drawer, 0));
  parts["lamp-cab"].dataset.on = String(o.cab === 1);
  if (o.page1) { const q = Hm(o.page1.x, o.page1.y, o.page1.z); parts.page1.setAttribute("opacity", o.page1.a.toFixed(2)); parts.page1.setAttribute("transform", tW(q[0], q[1], q[2])); } else parts.page1.setAttribute("opacity", "0");
  parts["rel-needle"].innerHTML = o.relShow ? '<path class="iso-line" data-tone="hi" d="' + pathOf([pr(-22, 103.05, 20), pr(-22 + 5 * Math.cos((200 - o.rel * 220) * Math.PI / 180), 103.05, 20 + 5 * Math.sin((200 - o.rel * 220) * Math.PI / 180))]) + '"/>' + dotsSvg([pr(-22, 103.05, 20)], { size: 0.6, tone: "hi" }) : "";
  const zv = (v) => 12 + (v - 0.5) / 0.5 * 19.2;
  parts.cols.innerHTML = [0, 1].map((i) => solidSvg(cylinder(i ? -14 : -28, 112, 3.2, zv(o.colV[i]) - 0.9, 1.8, P, 20, 0.2), { tone: "hi", lit: true })).join("");
  forkLamps.forEach((l, i) => { l.dataset.on = String(o.forkOn[i] === 1); });
  parts.pin.setAttribute("transform", tW(0, 0, 8 * o.pin));
  const ang = lerp(Math.atan2(-7, 8), Math.atan2(-7, 8) - 1.55, o.pull), tx = 4 + 10.6 * Math.cos(ang), ty = 112 + 10.6 * Math.sin(ang);
  parts.lever.innerHTML = barSvg(4, 112, tx, ty, 2.6, 11, 2.2, "mid") + solidSvg(cylinder(tx, ty, 2, 13.2, 2.4, P, 16), { tone: "hi", lit: true });
  parts["lamp-pub"].dataset.on = String(o.lampPub === 1); parts["lamp-cand"].dataset.on = String(o.lampCand === 1);
  // 7
  parts.det.setAttribute("transform", tW(0, (o.detY - 131) * HS, 0));
  if (o.page2) { const q = Hm(o.page2.x, o.page2.y, o.page2.z); parts.page2.setAttribute("opacity", o.page2.a.toFixed(2)); parts.page2.setAttribute("transform", tW(q[0], q[1], q[2])); } else parts.page2.setAttribute("opacity", "0");
  // 8
  setG(parts.bus, o.bus); vdesk.forEach((l, i) => { l.dataset.on = String(i === 1 && o.vdesk === 1); });
  parts.stampDummy = null; stamps[1].setAttribute("transform", tW(0, 0, -2.6 * HS * o.stampPress));
  const ga = (205 - o.gain * 230 / 3) * Math.PI / 180;
  parts["gain-needle"].innerHTML = '<path class="iso-line" data-tone="hi" d="' + pathOf([pr(191, ${-130 + 0.12}, 18), pr(191 + 8.2 * Math.cos(ga), ${-130 + 0.12}, 18 + 8.2 * Math.sin(ga))]) + '"/>' + dotsSvg([pr(191, ${-130 + 0.12}, 18)], { size: 0.9, tone: "hi" });
  fxLayer.innerHTML = fxSvg(o, s);
}
function reading(s) { const i = stationAt(s), [name, status] = STATIONS[Math.min(i, STATIONS.length - 1)]; return (i + 1) + " · " + name + " · " + status; }
const run = loop((dt, calm) => {
  if (frozen) return;
  if (touring) { t = calm ? Ts[7] + 4 : t + dt; if (t >= TEND) t = 0; }
  const o = stateAt(t); draw(o, t); say(reading(t));
});
const jump = (i) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 9000); t = Ts[(i + 9) % 9] + 3.4; run(); };
dragX(() => stationAt(t), (v, share) => { const n = (Math.round(v + share * 9) % 9 + 9) % 9; if (n !== stationAt(t)) jump(n); });
stage.addEventListener("keydown", (e) => { const i = stationAt(t); if (e.key === "ArrowRight") { e.preventDefault(); jump(i + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); jump(i - 1); } });
window.__fig = { at: (s) => { touring = false; frozen = true; t = s; const o = stateAt(s); draw(o, s); say(reading(s)); return reading(s); }, Ts, stateAt };
draw(stateAt(0), 0); say(reading(0));
`;

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un synchrotron local, sur un socle clos par une clôture. Un laser lit une page, une chicane trie ses quatre champs, deux cavités accordées et une armoire à deux clés les laissent passer, un collimateur réglé à la main les étiquette, le booster verse la fiche dans un tambour à trois feuillets, l'anneau principal monte en énergie en trois rampes, deux colonnes de seuil et un levier publient le candidat, puis la lumière balaie des pages inédites dans la halle et propose des cadres. Trois pupitres partagent les corrections, un tube de verre les renvoie à la trémie, et le cadran du bâtiment de contrôle compare le gain à l'extracteur VRE : ×1 contre ×2,3.",
  body: [...base, Sc.flush(), `<g id="fx" class="fx"></g>`, `<g id="fxf" class="fx"></g>`],
});
const plate = k.plateHtml({
  fig: "Fig 11", title: "VRE Studio", hint: "Glisse ou ← → : étape", readout: "1 · Lecture · Document AI",
  keys: [
    { mark: "raised", label: "Le faisceau : une page devient quatre champs, puis le corpus, puis l'énergie du modèle" },
    { mark: "flat", label: "La clôture : tout est local, une seule porte, aucun câble ne sort" },
    { mark: "lit", label: "Ce qui vient d'agir : laser, clé, mâchoire, rampe, lumière" },
  ],
  caption: "Un synchrotron local. Une page est lue par un laser (Document AI) ; une chicane trie ses quatre champs par catégorie (mini-BERT) ; deux cavités, l'une pour le modèle, l'autre pour les règles métiers, ne laissent passer le faisceau que si une armoire à deux clés les accorde (hybride neuro-symbolique) ; un collimateur réglé à la main étiquette chaque champ (Human-in-the-Loop) ; le booster verse la fiche dans un tambour à trois feuillets, image, texte et positions (corpus multimodal). L'anneau principal monte en énergie en trois rampes : le candidat se forme (LayoutLMv3). Deux colonnes de seuil mesurent sa lumière sur des pages inédites gardées sous clé, et le levier publie le candidat ; le module précédent reste au coffre pour revenir en arrière (MLOps local). La lumière balaie ensuite une page de production dans la halle et propose des cadres, de deux sortes, BT et locaux (inférence). Trois pupitres partagent les corrections ; un tube de verre les renvoie à la trémie, et elles repartent dans le corpus. Le cadran du bâtiment de contrôle compare le gain : ×1 pour l'extracteur VRE, ×2,3 pour VRE Studio. Les seuils et les cadres sont des valeurs d'illustration.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="VRE Studio : flèches gauche et droite pour passer d'une étape à l'autre" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0">${svg}</div>`,
});
const defs = "";
writeFigure("vrestudio-anneau", { title: "VRE Studio · l'anneau", plate, live, width: 960, css: "<style>.fig-deck{fill:var(--anatomy-lo);opacity:.3}.fig-dark{fill:var(--anatomy-lo);opacity:.55}.fig-glow{fill:var(--g,#34d399);stroke:none;pointer-events:none}.fx{pointer-events:none}.fx-line{fill:none;stroke:var(--g,#34d399);stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 2.5px var(--g,#34d399))}.fx-cone{fill:var(--g,#34d399);opacity:.28;stroke:none}.fx-dot{fill:var(--g,#34d399);stroke:none}.fx-halo{fill:var(--g,#34d399);stroke:none;filter:blur(2px)}.fx-core{fill:#fff;stroke:none}.fx-ring{fill:none;stroke:var(--g,#34d399);stroke-width:1.1}.fx-lit{fill:var(--g,#34d399);stroke:none}</style>" });

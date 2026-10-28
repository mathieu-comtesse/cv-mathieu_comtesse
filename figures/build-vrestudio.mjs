// Fig 11 · VRE Studio : un phare en coupe. Huit étages, un monte-charge central qui porte la page, puis la caisse, puis la lentille.
// node figures/build-vrestudio.mjs  →  figures/vrestudio.html
// 0 lecture · 1 tri · 2 serrure à deux clés · 3 relecture au tampon · 4 fichier du corpus · 5 presse d'entraînement
// 6 évaluation et publication · 7 lanterne : la lentille publiée balaie la mer et propose des cadres sur les pages qui flottent.
// À côté, la petite tour de l'extracteur VRE : le phare est 2,3 fois plus haut.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 720, HEIGHT = 1040;
const PITCH = 46, NF = 8, HWN = 12.5, BN = 12.5, RISL = 124;                       // étages, demi-côté du puits, rayon de la mer
const Z0 = 7;                                                         // dessus de l'îlot : plancher du rez-de-chaussée
const ZF = (f) => Z0 + f * PITCH;                                     // dessus du plancher de l'étage f
const RF = (f) => 62 - 2.5 * f;                                       // rayon extérieur du mur de l'étage f : la tour s'effile
const WT = 5;                                                         // épaisseur du mur
const A = 100 * Math.PI / 180;                                        // demi-ouverture du mur autour de l'arrière
const T0 = Math.PI / 2 - A, T1 = Math.PI / 2 + A;                     // angle (dans le repère latéral, arrière) de chaque bras de mur
const LANT_Z = ZF(7), KNEE = 9, GLASS = 34, DOME_Z = LANT_Z + KNEE + GLASS;
const TOP_Z = DOME_Z + 46;
const OLD = { x: -50, y: 84, r: 19, h: TOP_Z / 2.3 };                // la petite tour : 1 / 2,3 de la grande

const P = k.fitProjection(
  [[-80, 80, -16], [80, -80, -16], [88, 88, -16], [0, 0, TOP_Z + 6], [-92, 50, TOP_Z + 4], [OLD.x, OLD.y, OLD.h + 10]],
  WIDTH, HEIGHT, { pad: 12, azimuth: 45 },
);
const { at, S, L, D, slab, front, right, flat } = tools(P);
const [vx, vy] = k.towardViewer(P), vl = Math.hypot(vx, vy);
const Bd = [-vx / vl, -vy / vl], Ud = [-Bd[1], Bd[0]];                   // arrière et latéral du point de vue
const wUB = (u, b) => [u * Ud[0] + b * Bd[0], u * Ud[1] + b * Bd[1]];
const W = (u, b) => wUB(u, b);
const rad = (d) => (d * Math.PI) / 180;
const polar = (r, a, c = [0, 0]) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
const cyl = (R, th, z) => at([...wUB(R * Math.cos(th), R * Math.sin(th)), z]);           // un point sur un cylindre de la tour
const arcPts = (R, a0, a1, z, n = 40) => Array.from({ length: n + 1 }, (_, i) => cyl(R, a0 + (a1 - a0) * (i / n), z));
const pth = (pts, closed = false) => k.pathOf(pts, closed);
const cyl2 = (u, b, z) => at([...wUB(u, b), z]);
const wuv = (pts) => pts.map(([u, b]) => wUB(u, b));
const rectUB = (u0, u1, b0, b1) => [[u0, b0], [u1, b0], [u1, b1], [u0, b1]];
const boxUB = (u0, u1, b0, b1, z, h, o = {}) => S(k.extrude(wuv(rectUB(u0, u1, b0, b1)), z, h, P, { bevel: o.bevel ?? 0.4 }), { tone: o.tone || "mid", lit: o.lit, crease: o.crease });
const cylUB = (u, b, r, z, h, o = {}) => S(k.cylinder(...wUB(u, b), r, z, h, P, o.steps || 20, o.bevel || 0), { tone: o.tone || "mid", lit: o.lit, crease: o.crease });
const pUB = (u, b, z) => at([...wUB(u, b), z]);
const lnUB = (...pts) => pth(pts.map((p) => pUB(...p)));
const topUB = (u0, b0, u1, b1, z) => k.lineOnTop(wUB(u0, b0), wUB(u1, b1), z, P);
const flatUB = (pts, z) => pth(pts.map(([u, b]) => pUB(u, b, z)), true);
const lampAt = (name, u, b, z, r = 1.3) => { const [x, y] = pUB(u, b, z); return `<circle class="fig-lamp" data-part="${name}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/>`; };
const sectorUB = (r0, r1, a0, a1, n = 44) => [
  ...Array.from({ length: n + 1 }, (_, i) => [r1 * Math.cos(a0 + (a1 - a0) * (i / n)), r1 * Math.sin(a0 + (a1 - a0) * (i / n))]),
  ...Array.from({ length: n + 1 }, (_, i) => [r0 * Math.cos(a1 - (a1 - a0) * (i / n)), r0 * Math.sin(a1 - (a1 - a0) * (i / n))]),
];
const ink = (d, w = 1.5) => `<path class="iso-line" data-tone="hi" d="${d}" style="stroke-width:${w}"/>`;
const winFill = (pts) => `<path class="iso-fill fig-window" d="${pth(pts, true)}"/>`;

// ---------------------------------------------------------------- mer, îlot et quai
function seaSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: -RISL, y: -RISL, w: 2 * RISL, d: 2 * RISL, r: RISL }, -12, 14, P)}" style="filter:blur(4px)"/>`);
  out.push(S(k.cylinder(0, 0, RISL, -12, 12, P, 80, 1.4), { tone: "mid" }));
  out.push(L(k.ring(0, 0, RISL - 5, 0, P, 100), { tone: "lo" }));
  const waves = [];
  for (const [r, a0, a1] of [[108, 130, 215], [108, 250, 335], [96, 20, 80], [112, 40, 100], [100, 150, 200], [90, 280, 350], [114, 300, 15], [84, 95, 140], [104, 205, 245]]) waves.push(pth(Array.from({ length: 30 }, (_, i) => at([...polar(r, rad(a0 + (a1 - a0) * i / 29)), 0.2]))));
  out.push(L(waves.join(""), { tone: "faint", free: true }));
  const bolts = []; for (let i = 0; i < 28; i++) bolts.push(at([...polar(RISL - 5, rad(i * 360 / 28)), 0]));
  out.push(D(bolts, { size: 0.45, tone: "lo" }));
  return out.join("");
}
// un rocher : bloc taillé à facettes, un deuxième plus petit posé dessus
const jit = (n) => { const h = Math.sin(n * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); };
function rock(cx, cy, r, h, seed) {
  const n = 13, pts = [], top = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + seed, rr = r * (0.72 + 0.42 * jit(seed * 10 + i)); pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); top.push([cx + rr * 0.58 * Math.cos(a + 0.2) + r * 0.08, cy + rr * 0.58 * Math.sin(a + 0.2)]); }
  return S(k.extrude(pts, -2, h + 2, P, { bevel: 1.1, convex: false }), { tone: "mid" })
    + S(k.extrude(top, h - 0.4, 2.6 + 3 * jit(seed), P, { bevel: 0.8, convex: false }), { tone: "lo" });
}
function islet() {
  const out = [];
  const rim = [[80, 0.2, 12, 3], [77, 1.0, 9, 5], [82, 1.9, 13, 7], [79, 2.8, 10, 11], [84, 3.6, 12, 13], [77, 4.4, 11, 17], [82, 5.3, 13, 19], [70, 0.6, 8, 23], [72, 1.5, 9, 29], [68, 2.3, 8, 31], [73, 3.2, 9, 37], [70, 4.0, 8, 41], [72, 4.9, 9, 43], [69, 5.8, 8, 47]];
  const list = rim.map(([r, a, s, id]) => ({ x: r * Math.cos(a), y: r * Math.sin(a), s, id, d: k.depthOf([r * Math.cos(a), r * Math.sin(a), 0], P) }));
  list.sort((p, q) => p.d - q.d);
  out.push(S(k.cylinder(0, 0, 66, 0, Z0 - 3, P, 72, 0.8), { tone: "lo" }));
  for (const m of list) out.push(rock(m.x, m.y, m.s, 5 + (m.id % 4), m.id * 0.37));
  out.push(S(k.cylinder(0, 0, 64.5, Z0 - 3, 3, P, 72, 0.5), { tone: "mid" }));
  out.push(L(k.ring(0, 0, 64.8, Z0 - 1.4, P, 90), { tone: "faint" }));
  return out.join("");
}
// le quai : un ponton bas vers la droite, où les pages arrivent
function pierSvg() {
  const out = [], x0 = 40, x1 = 108, y0 = -4, y1 = 20;
  out.push(S(slab({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 1 }, 1, 4, 4, 0.6), { tone: "mid" }));
  const pl = []; for (let x = x0 + 8; x < x1 - 2; x += 8) pl.push(k.lineOnTop([x, y0], [x, y1], 5, P));
  out.push(L(pl.join(""), { tone: "faint" }));
  const piles = []; for (let x = x0 + 6; x < x1; x += 20) for (const y of [y0 + 1, y1 - 1]) piles.push([x, y]);
  for (const [x, y] of piles) out.push(S(k.cylinder(x, y, 1.6, -9, 10, P, 12), { tone: "lo", crease: "none" }));
  for (const [x, y] of [[x0 + 6, y0 + 3.2], [x1 - 5, y0 + 3.2], [x1 - 5, y1 - 3.2]]) { out.push(S(k.cylinder(x, y, 1.9, 5, 3.6, P, 14), { tone: "mid" }), S(k.cylinder(x, y, 2.6, 8.6, 1.1, P, 14), { tone: "mid" })); }
  return out.join("");
}

// ---------------------------------------------------------------- murs de la tour
function wallSvg(f) {
  const z = ZF(f), h = PITCH - 3, R = RF(f), RIN = R - WT, out = [];
  const ring = wuv(sectorUB(RIN, R, T0, T1));
  out.push(S(k.extrude(ring, z, h, P, { bevel: 0.5, convex: false }), { tone: "mid" }));
  return out.join("");
}
// ceinture saillante sur chaque plancher : elle rattrape l'effilement
function beltSvg(f) {
  const z = ZF(f), R = RF(f);
  return S(k.extrude(wuv(sectorUB(R - WT, R + 2.6, T0, T1)), z - 5, 6.5, P, { bevel: 0.5, convex: false }), { tone: "lo" });
}
function wallInner(f) {
  // face intérieure du fond : assises, rivets et trois fenêtres cintrées
  const z = ZF(f), h = PITCH - 3, R = RF(f) - WT, out = [], a0 = rad(9), a1 = rad(171);
  const courses = [];
  for (const dz of [14.5, 29]) courses.push(pth(arcPts(R, a0 - 0.15, a1 + 0.15, z + dz, 52)));
  out.push(L(courses.join(""), { tone: "faint", free: true }));
  const rv = []; for (let i = 0; i <= 26; i++) rv.push(cyl(R, a0 + (a1 - a0) * i / 26, z + h - 2.4));
  out.push(D(rv, { size: 0.36, tone: "lo" }));
  for (const th of [rad(90), rad(48), rad(132)]) {
    const dl = rad(th === rad(90) ? 8.5 : 7), z0 = z + 17, z1 = z + 31, ar = 5.5, pts = [];
    pts.push(cyl(R, th - dl, z0));
    pts.push(cyl(R, th - dl, z1));
    for (let i = 1; i < 12; i++) { const a = -dl + 2 * dl * i / 12; pts.push(cyl(R, th + a, z1 + ar * Math.sqrt(Math.max(0, 1 - (a / dl) ** 2)))); }
    pts.push(cyl(R, th + dl, z1), cyl(R, th + dl, z0));
    out.push(winFill(pts), L(pth(pts, true), { tone: "lo" }));
    // montant, traverse et deux traits de houle dans le verre
    out.push(L(pth([cyl(R, th, z0), cyl(R, th, z1 + ar - 0.2)]) + pth([cyl(R, th - dl, z1 - 3), cyl(R, th + dl, z1 - 3)]), { tone: "lo" }));
    out.push(L(pth([cyl(R, th - dl, z0 + 3.4), cyl(R, th + dl, z0 + 3.4)]) + pth([cyl(R, th - dl, z0 + 7), cyl(R, th, z0 + 7)]), { tone: "faint" }));
    // appui saillant
    out.push(L(pth([cyl(R, th - dl - 0.05, z0 - 1.2), cyl(R, th + dl + 0.05, z0 - 1.2)]), { tone: "mid" }));
  }
  return out.join("");
}
function wallOuter(f) {
  // face extérieure des deux bras : fente d'éclairage et, au rez, la porte
  const z = ZF(f), R = RF(f), out = [];
  for (const th of [rad(-21), rad(201)]) {
    const dl = rad(2.6), z0 = z + 20, z1 = z + 32, ar = 3, pts = [];
    pts.push(cyl(R, th - dl, z0), cyl(R, th - dl, z1));
    for (let i = 1; i < 10; i++) { const a = -dl + 2 * dl * i / 10; pts.push(cyl(R, th + a, z1 + ar * Math.sqrt(Math.max(0, 1 - (a / dl) ** 2)))); }
    pts.push(cyl(R, th + dl, z1), cyl(R, th + dl, z0));
    if (f === 0 && th < 0) continue;
    out.push(winFill(pts), L(pth(pts, true), { tone: "lo" }));
    out.push(L(pth([cyl(R, th, z0), cyl(R, th, z1 + ar - 0.2)]), { tone: "lo" }));
  }
  if (f === 0) {
    // la porte du gardien, à droite, avec son seuil et deux marches
    const th = rad(-22), dl = rad(5), z0 = z + 1, z1 = z + 22, ar = 5, pts = [];
    pts.push(cyl(R, th - dl, z0), cyl(R, th - dl, z1));
    for (let i = 1; i < 14; i++) { const a = -dl + 2 * dl * i / 14; pts.push(cyl(R, th + a, z1 + ar * Math.sqrt(Math.max(0, 1 - (a / dl) ** 2)))); }
    pts.push(cyl(R, th + dl, z1), cyl(R, th + dl, z0));
    out.push(S({ fill: pth(pts, true), shades: [], top: "", outline: pth(pts, true), crease: "" }, { tone: "lo", flat: true }));
    out.push(L(pth([cyl(R, th, z0), cyl(R, th, z1 + ar)]), { tone: "faint" }));
    out.push(D([cyl(R, th - dl * 0.4, z + 11), cyl(R, th + dl * 0.4, z + 11)], { size: 0.5, tone: "mid" }));
  }
  return out.join("");
}
// bande peinte sur les deux bras : un étage sur deux, comme un vrai phare
function bandSvg(f) {
  if (f % 2) return "";
  const z0 = ZF(f) + 3, z1 = ZF(f) + PITCH - 8, R = RF(f), out = [];
  for (const [a0, a1] of [[T0 + 0.02, rad(-1)], [rad(181), T1 - 0.02]]) {
    const top = [], bot = [];
    for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; top.push(cyl(R + 0.05, a, z1)); bot.push(cyl(R + 0.05, a, z0)); }
    out.push(`<path class="fig-band" d="${pth([...top, ...bot.reverse()], true)}"/>`);
  }
  return out.join("");
}
// planchers : demi-disques percés du puits, bord de dalle et rivets
function slabSvg(f) {
  const z = ZF(f) - 3, R = f === NF - 1 ? 54 : RF(f), CUT = 12, t0 = -Math.asin(CUT / R), t1 = Math.PI - t0, pts = [];
  const n = 60;
  for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * (i / n); pts.push([R * Math.cos(t), R * Math.sin(t)]); }
  pts.push([-HWN, -CUT], [-HWN, BN], [HWN, BN], [HWN, -CUT]);
  const out = [S(k.extrude(wuv(pts), z, 3, P, { bevel: 0.5, convex: false }), { tone: f === 0 ? "lo" : "mid" })];
  out.push(`<path class="fig-deck" d="${pth(wuv(pts).map(([x, y]) => at([x, y, ZF(f)])), true)}"/>`);
  const seam = [];
  for (const b of [8, 20, 32, 44]) {
    const r = R - 4, uu = Math.sqrt(Math.max(0, r * r - b * b)); if (uu < 4) continue;
    if (b < BN) seam.push(pth([cyl2(-uu, b, ZF(f)), cyl2(-HWN, b, ZF(f))]), pth([cyl2(HWN, b, ZF(f)), cyl2(uu, b, ZF(f))]));
    else seam.push(pth([cyl2(-uu, b, ZF(f)), cyl2(uu, b, ZF(f))]));
  }
  out.push(L(seam.join(""), { tone: "faint", free: true }));
  const rim = []; for (let i = 0; i <= 28; i++) rim.push(cyl(R - 2.2, t0 + 0.05 + (t1 - t0 - 0.1) * i / 28, ZF(f)));
  out.push(D(rim, { size: 0.4, tone: "lo" }));
  out.push(L(pth(arcPts(R - 4, t0 + 0.04, t1 - 0.04, ZF(f), 56)), { tone: "faint", free: true }));
  out.push(L(pth([cyl2(-HWN, -CUT + 0.01, ZF(f)), cyl2(-HWN, BN, ZF(f)), cyl2(HWN, BN, ZF(f)), cyl2(HWN, -CUT + 0.01, ZF(f))]), { tone: "mid" }));
  return out.join("");
}
// montants du puits : quatre cornières qui guident le monte-charge
function shaftPosts(back, f) {
  const out = [], z = ZF(f), h = PITCH - 3;
  for (const [u, b] of [[-11.2, 11.2], [11.2, 11.2]]) {
    const [x, y] = wUB(u, b), isBack = b > 0;
    if (isBack !== back) continue;
    out.push(S(k.cylinder(x, y, 1.1, z, h, P, 12), { tone: "mid", crease: "none" }));
  }
  return out.join("");
}
// ---------------------------------------------------------------- lanterne : galerie, vitrage, dôme
function lanternParts() {
  const z = LANT_Z, RG = 51, RK = 40, RGL = 37, back = [], front = [];
  const sideOf = (th) => Math.sin(th) > 0.001;                              // b > 0 : en arrière du plan de coupe
  // appui : muret de la lanterne
  back.push(S(k.extrude(wuv(sectorUB(RK - 4, RK, T0, T1)), z, KNEE, P, { bevel: 0.5, convex: false }), { tone: "mid" }));
  // corniche du muret
  back.push(S(k.extrude(wuv(sectorUB(RK - 5, RK + 1.6, T0, T1)), z + KNEE - 1.6, 2.4, P, { bevel: 0.4, convex: false }), { tone: "lo" }));
  // garde-corps de la galerie : poteaux tous les 11° et deux lisses
  const N = 21, posts = [];
  for (let i = 0; i <= N; i++) posts.push(T0 + (T1 - T0) * i / N);
  const railTop = 11, railMid = 5.2;
  for (const th of posts) {
    const g = S(k.cylinder(...wUB(RG * Math.cos(th), RG * Math.sin(th)), 0.8, z, railTop, P, 10), { tone: "mid", crease: "none" });
    (sideOf(th) ? back : front).push(g);
  }
  const rail = (zz) => L(pth(arcPts(RG, T0, T1, z + zz, 70)), { tone: zz === railTop ? "hi" : "mid" });
  back.push(rail(railTop), rail(railMid));
  back.push(D(posts.map((th) => cyl(RG, th, z + railTop)), { size: 0.5, tone: "mid" }));
  // fuseaux du vitrage : douze montants, une ceinture à mi-hauteur et une lisse haute
  const mull = [];
  for (let i = 0; i <= 11; i++) mull.push(T0 + (T1 - T0) * i / 11);
  for (const th of mull) {
    const g = S(k.cylinder(...wUB(RGL * Math.cos(th), RGL * Math.sin(th)), 1.0, z + KNEE, GLASS, P, 10), { tone: "mid", crease: "none" });
    (sideOf(th) ? back : front).push(g);
  }
  const bars = [];
  for (const dz of [GLASS * 0.34, GLASS * 0.68]) bars.push(pth(arcPts(RGL, T0, T1, z + KNEE + dz, 70)));
  back.push(L(bars.join(""), { tone: "mid" }));
  // vitres : croisillons losanges, un trait diagonal par vitre, de montant à montant
  const diag = [];
  for (let i = 0; i < mull.length - 1; i++) {
    const a = mull[i], b = mull[i + 1];
    for (const [d0, d1] of [[0, 0.34], [0.34, 0.68], [0.68, 1]]) {
      const [z0, z1] = [z + KNEE + GLASS * d0, z + KNEE + GLASS * d1];
      if ((i + (d0 > 0.3 ? 1 : 0) + (d0 > 0.6 ? 1 : 0)) % 2) diag.push(pth([cyl(RGL, a, z0), cyl(RGL, b, z1)])); else diag.push(pth([cyl(RGL, a, z1), cyl(RGL, b, z0)]));
    }
  }
  const diagBack = diag.filter((_, i) => true).join("");
  back.push(L(diagBack, { tone: "faint", free: false }));
  // couronne : anneau de tête sur les montants
  const top = [];
  top.push(S(k.extrude(wuv(sectorUB(RGL - 2, RGL + 2, T0, T1)), z + KNEE + GLASS - 0.5, 2.6, P, { bevel: 0.4, convex: false }), { tone: "lo" }));
  return { back: back.join(""), front: front.join(""), top: top.join("") };
}
function roofSvg() {
  const z = DOME_Z, F = G.frameAlong([0, 0, z], [0, 0, 1]), out = [], RR = RGL_R();
  out.push(S(k.cylinder(0, 0, RR + 5, z + 2.4, 2.2, P, 64, 0.5), { tone: "lo" }));
  out.push(S(G.solidOf([[2, RR + 3], [4, RR + 1.4], [6, 34], [24, 5.4], [26, 4]], F, P), { tone: "mid", inner: L(G.ribsOf(F, 6, 24, 34, 18, P, { r1: 5.4, seams: true }), { tone: "faint" }) }));
  out.push(S(k.cylinder(0, 0, 5.8, z + 25, 1.6, P, 24), { tone: "lo" }));
  out.push(S(G.sphereOf([0, 0, z + 29.6], 3.6, P), { tone: "hi", lit: true }));
  out.push(S(k.cylinder(0, 0, 0.6, z + 32, 12, P, 8), { tone: "mid", crease: "none" }));
  out.push(L(k.segment([0, 0, z + 41], [7, 0, z + 41], P) + k.segment([0, 0, z + 41], [-3.5, 0, z + 41], P) + k.segment([7, 0, z + 41], [4.6, 1.6, z + 41], P) + k.segment([7, 0, z + 41], [4.6, -1.6, z + 41], P), { tone: "hi" }));
  return out.join("");
}
function RGL_R() { return 37; }
// ---------------------------------------------------------------- petite tour (l'extracteur VRE) et règle de hauteur
function oldTower() {
  const out = [], { x, y, r, h } = OLD, F = G.frameAlong([x, y, 0], [0, 0, 1]);
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: x - r - 4, y: y - r - 4, w: 2 * r + 8, d: 2 * r + 8, r: r + 4 }, 0, 3, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.cylinder(x, y, r + 5, 0, 4, P, 40, 0.5), { tone: "lo" }));
  out.push(S(G.solidOf([[0, r], [h - 22, r - 6]], F, P), { tone: "mid", inner: L(G.arcOf(F, 36, r - 1, P), { tone: "faint" }) + L(G.arcOf(F, 80, r - 3, P), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, r - 3, h - 22, 3, P, 32, 0.3), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 7, h - 19, 10, P, 24), { tone: "hi", lit: true }));
  out.push(S(G.solidOf([[h - 9, 11], [h - 7, 10], [h + 6, 3.6], [h + 8, 2.4]], G.frameAlong([x, y, 0], [0, 0, 1]), P), { tone: "mid" }));
  return out.join("");
}
function rulerSvg() {
  const x = -92, y = 50, out = [], zt = TOP_Z;
  out.push(S(k.cylinder(x, y, 5, 0, 2, P, 20), { tone: "lo" }));
  out.push(S(slab({ x: x - 1.6, y: y - 1.6, w: 3.2, d: 3.2, r: 0.6 }, 2, zt - 2, 2, 0.3), { tone: "mid", crease: "none" }));
  const f = front(y + 1.6), minor = [], major = [];
  for (let z = 10; z < zt - 4; z += 10) (z % 50 === 0 ? major : minor).push(`M${x - 1.6} ${-z}L${x - 1.6 + (z % 50 === 0 ? 3.2 : 1.8)} ${-z}`);
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${minor.join("")}"/><path class="iso-line" data-tone="mid" d="${major.join("")}"/></g>`);
  out.push(S(slab({ x: x - 1.6, y: y - 5, w: 3.2, d: 10, r: 0.5 }, OLD.h - 1, 2, 2, 0.2), { tone: "hi", lit: true }));
  out.push(S(slab({ x: x - 1.6, y: y - 5, w: 3.2, d: 10, r: 0.5 }, zt - 4, 2, 2, 0.2), { tone: "hi", lit: true }));
  return out.join("");
}
function platformSvg() {
  const under = [], over = [], C = 8.4, ch = 6.2;
  under.push(boxUB(-9.5, 9.5, -9.5, 9.5, 0, 2.4, { bevel: 0.5 }));
  under.push(L(flatUB(rectUB(-8.2, 8.2, -8.2, 8.2), 2.4), { tone: "faint" }));
  under.push(D([[-9.1, -9.1], [9.1, 9.1], [-9.1, 9.1], [9.1, -9.1]].map(([u, b]) => pUB(u, b, 2.4)), { size: 0.38 }));
  // galets de guidage : un petit disque sur chaque montant du puits
  for (const sgn of [-1, 1]) under.push(cylUB(sgn * 10.8, 8.6, 1.5, 0.4, 1.6, { tone: "lo", steps: 14 }));
  // garde-corps : montants aux quatre coins, lisses sur le fond et les côtés
  const post = (u, b) => cylUB(u, b, 0.7, 2.4, ch, { tone: "mid", crease: "none", steps: 10 });
  under.push(post(-C, C), post(C, C), post(-C, -C + 1), post(C, -C + 1));
  const zt = 2.4 + ch, zm = 2.4 + ch / 2;
  under.push(L([lnUB([-C, C, zt], [C, C, zt]), lnUB([-C, C, zm], [C, C, zm]), lnUB([-C, C, zt], [-C, -C + 1, zt]), lnUB([C, C, zt], [C, -C + 1, zt])].join(""), { tone: "mid" }));
  under.push(D([pUB(-C, C, zt), pUB(C, C, zt), pUB(-C, -C + 1, zt), pUB(C, -C + 1, zt)], { size: 0.5, tone: "mid" }));
  return { under: under.join(""), over: over.join("") };
}
// ================================================================ pièces mobiles du monte-charge
const PAGE = { u: 7.5, b: 6 }, FU = [-5.4, -1.8, 1.8, 5.4], FB = [-4.6, 1.2], PZ = 2.4;     // la page est posée sur la plate-forme
const faceM = (b, z) => {                                                                  // matrice d'une face qui regarde le point de vue, à la profondeur b
  const o = pUB(0, b, z), u = pUB(1, b, z), v = pUB(0, b, z - 1);
  return `matrix(${(u[0] - o[0]).toFixed(4)} ${(u[1] - o[1]).toFixed(4)} ${(v[0] - o[0]).toFixed(4)} ${(v[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`;
};
const fieldRect = (i, z, inset = 0) => flatUB(rectUB(FU[i] - 1.6 + inset, FU[i] + 1.6 - inset, FB[0] + inset, FB[1] - inset), z);
function pageSvg() {
  const out = [];
  out.push(boxUB(-PAGE.u, PAGE.u, -PAGE.b, PAGE.b, PZ, 0.7, { tone: "hi", crease: "none", bevel: 0.15 }));
  const z = PZ + 0.7, rules = [];
  for (const [b, a, c] of [[2.9, -6.3, 6.3], [4.3, -6.3, 2.6], [4.3, 3.6, 6.3]]) rules.push(topUB(a, b, c, b, z));
  out.push(L(rules.join(""), { tone: "lo", free: true }));
  out.push(L(FU.map((_, i) => fieldRect(i, z)).join(""), { tone: "mid" }));
  out.push(D([[-6.7, -5.3], [6.7, -5.3], [-6.7, 5.3], [6.7, 5.3]].map(([u, b]) => pUB(u, b, z)), { size: 0.34, tone: "lo" }));
  return out.join("");
}
const inkSvg = (i) => { const d = fieldRect(i, PZ + 0.8, 0.25); return `<g data-part="ink-${i}" opacity="0"><path class="fig-ink" d="${d}"/>${ink(d, 1.5)}</g>`; };
// jetons : une forme par catégorie sémantique, posés au zéro de leur repère
const chipShape = (kind) => {
  if (kind === 0) return Array.from({ length: 6 }, (_, i) => [1.7 * Math.cos(i * Math.PI / 3), 1.7 * Math.sin(i * Math.PI / 3)]);
  if (kind === 1) return [[-1.4, -1.4], [1.4, -1.4], [1.4, 1.4], [-1.4, 1.4]];
  if (kind === 2) return Array.from({ length: 18 }, (_, i) => [1.5 * Math.cos(i * Math.PI / 9), 1.5 * Math.sin(i * Math.PI / 9)]);
  return [[-1.7, -1.4], [1.7, -1.4], [0, 1.7]];
};
const chipSvg = (kind) => S(k.extrude(wuv(chipShape(kind)), 0, 1.3, P, { bevel: 0.25 }), { tone: "hi", lit: true });
// feuillets de la fiche : image, texte, positions
function cardSvg() {
  const out = [], u0 = -7, u1 = 7, b0 = -5, b1 = 5;
  const layer = (name, z, tone, detail) => `<g data-part="card-${name}">${boxUB(u0, u1, b0, b1, z, 0.7, { tone, crease: "none", bevel: 0.15 })}${detail(z + 0.7)}</g>`;
  out.push(layer("img", PZ, "lo", (z) => L(topUB(-5.6, -3.4, 5.6, 3.8, z) + topUB(-5.6, 3.8, 5.6, -3.4, z), { tone: "faint" }) + L(flatUB(rectUB(-5.6, 5.6, -3.4, 3.8), z), { tone: "faint" })));
  out.push(layer("txt", PZ + 0.7, "mid", (z) => L([-3.2, -1.2, 0.8, 2.8].map((b) => topUB(-5.8, b, 5.8, b, z)).join(""), { tone: "lo", free: true })));
  out.push(layer("pos", PZ + 1.4, "hi", (z) => L(FU.map((_, i) => flatUB(rectUB(FU[i] - 1.5, FU[i] + 1.5, -3.6, 0.2), z)).join(""), { tone: "mid" })));
  return out.join("");
}
function crateSvg() {
  const out = [];
  out.push(boxUB(-7, 7, -7, 7, PZ, 9, { tone: "mid", bevel: 0.6 }));
  out.push(boxUB(-7.2, 7.2, -1.8, 1.8, PZ + 8.2, 0.9, { tone: "lo", crease: "none", bevel: 0.1 }));
  out.push(boxUB(-1.8, 1.8, -7.2, 7.2, PZ + 8.2, 0.9, { tone: "lo", crease: "none", bevel: 0.1 }));
  out.push(cylUB(0, 0, 2.6, PZ + 9.1, 1.2, { tone: "hi", lit: true, steps: 18 }));
  out.push(L([3.4, 6.2].map((z) => lnUB([-7, -7, PZ + z], [7, -7, PZ + z])).join(""), { tone: "faint" }));
  return out.join("");
}
// lentille de Fresnel : socle, tambour d'anneaux à prismes, couronne
function lensSvg(r, h, z0, lit = true) {
  const out = [], F = G.frameAlong([0, 0, z0], [0, 0, 1]), n = Math.round(h / 2.6);
  out.push(S(k.cylinder(0, 0, r + 1.8, z0, 2.6, P, 36, 0.4), { tone: "lo" }));
  out.push(S(k.cylinder(0, 0, r * 0.74, z0 + 2.6, 2.4, P, 32, 0.3), { tone: "mid" }));
  let zz = z0 + 5;
  const ringH = (h - 9) / n;
  for (let i = 0; i < n; i++) {
    const rr = i % 2 ? r - 0.9 : r;
    out.push(S(k.cylinder(0, 0, rr, zz, ringH, P, 36, 0.28), { tone: "hi", lit: false }));
    zz += ringH;
  }
  out.push(S(G.solidOf([[zz - z0, r - 0.6], [zz - z0 + 2.4, r * 0.82], [zz - z0 + 5, r * 0.46], [zz - z0 + 6.2, r * 0.28]], F, P), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, r * 0.2, zz + 6.2, 2.2, P, 20), { tone: "hi", lit }));
  return out.join("");
}

// ---------------------------------------------------------------- repères tournés : pièces rondes d'axe arrière, latéral ou vertical
const axB = [Bd[0], Bd[1], 0], axU = [Ud[0], Ud[1], 0];
const frB = (u, b, z) => G.frameAlong([...wUB(u, b), z], axB);
const frU = (u, b, z) => G.frameAlong([...wUB(u, b), z], axU);
const frZ = (u, b, z) => G.frameAlong([...wUB(u, b), z], [0, 0, 1]);
const turned = (F, profile, o = {}) => S(G.solidOf(profile, F, P), { tone: o.tone || "mid", lit: o.lit, crease: o.crease, inner: o.inner });
const dark = (d) => `<path class="iso-fill fig-dark" d="${d}"/>`;
const circUB = (u, b, r, z, n = 20) => pth(Array.from({ length: n }, (_, i) => pUB(u + r * Math.cos(i / n * 6.2832), b, z + r * Math.sin(i / n * 6.2832))), true);   // cercle dans le plan d'une face avant
const pylon = (u, b, z, h, o = {}) => [
  turned(frZ(u, b, z), [[0, 3.8], [1.2, 3.8], [1.7, 2.5], [2.5, 1.9], [h - 1.6, 1.9], [h - 1.2, 2.6], [h, 2.6]], o),
  D([0, 1, 2, 3].map((i) => pUB(u + 3 * Math.cos(i * 1.5708 + 0.785), b + 3 * Math.sin(i * 1.5708 + 0.785), z + 1.2)), { size: 0.38, tone: "lo" }),
].join("");
const facePlate = (u0, u1, b, z0, z1, name, o = {}) => {
  const poly = [pUB(u0, b, z0), pUB(u1, b, z0), pUB(u1, b, z1), pUB(u0, b, z1)];
  return `<path class="iso-fill fig-window" d="${pth(poly, true)}"/>` + L(pth(poly, true), { tone: "lo" });
};
const ruleLines = (u0, u1, b, zs) => L(zs.map((z) => lnUB([u0, b, z], [u1, b, z])).join(""), { tone: "lo", free: true });

// ---------------------------------------------------------------- étage 0 · lecture : trémie à rouleaux et portique à tête de lecture
function floor0() {
  const z = ZF(0), back = [], front = [];
  back.push(boxUB(-14, 14, 17, 36, z, 11, { tone: "mid", bevel: 0.7 }));
  back.push(boxUB(-15, 15, 16.4, 36.6, z + 9.4, 2.2, { tone: "lo", bevel: 0.4 }));
  back.push(boxUB(-13, 13, 18.6, 34.4, z + 11.6, 0.8, { tone: "lo", crease: "none", bevel: 0.1 }));
  back.push(boxUB(-10.6, 10.6, 33.4, 34.8, z + 11.6, 6.6, { tone: "mid", bevel: 0.2 }));
  for (let i = 0; i < 4; i++) back.push(boxUB(-8.2 + i * 0.1, 8.2 - i * 0.1, 21, 32.6, z + 12.4 + i * 0.9, 0.8, { tone: "hi", crease: "none", bevel: 0.1 }));
  back.push(L(lnUB([-8.2, 21, z + 12.4], [8.2, 21, z + 12.4]), { tone: "lo", free: true }));
  // fente d'alimentation, aérations et plaque
  const slot = [pUB(-9.8, 17, z + 2.2), pUB(9.8, 17, z + 2.2), pUB(9.8, 17, z + 5.4), pUB(-9.8, 17, z + 5.4)];
  back.push(dark(pth(slot, true)) + L(pth(slot, true), { tone: "lo" }));
  for (const u of [-12, -10.8, -9.6]) { const v = [pUB(u - 0.35, 17, z + 6.6), pUB(u + 0.35, 17, z + 6.6), pUB(u + 0.35, 17, z + 9), pUB(u - 0.35, 17, z + 9)]; back.push(dark(pth(v, true))); }
  back.push(facePlate(5.6, 12.6, 17, z + 6.6, z + 9.2) + ruleLines(6.6, 11.6, 17, [z + 7.4, z + 8.2]));
  back.push(L(lnUB([-14, 17, z + 5.9], [14, 17, z + 5.9]), { tone: "faint" }));
  back.push(D([[-12.8, 1.4], [12.8, 1.4], [-12.8, 8.4], [12.8, 8.4]].map(([u, h]) => pUB(u, 17, z + h)), { size: 0.4, tone: "lo" }));
  // rouleaux d'entraînement : deux cylindres d'axe latéral devant la fente
  for (const [zz, ph] of [[z + 1.3, 0], [z + 4.4, 0.5]]) {
    const F = frU(-12, 15.2, zz);
    back.push(turned(F, [[0, 1.2], [24, 1.2]], { tone: "mid", inner: L(G.ribsOf(F, 0, 24, 1.2, 10, P, { phase: ph }), { tone: "lo" }) }));
  }
  for (const u of [-13.4, 13.4]) back.push(boxUB(u - 1, u + 1, 14.2, 16.2, z, 6.2, { tone: "lo", bevel: 0.3 }));
  // portique : deux pylônes, traverse à double rail
  for (const sgn of [-1, 1]) back.push(pylon(sgn * 28, 7.2, z, 23.4));
  back.push(boxUB(-31, 31, 5.2, 9.2, z + 23, 3.8, { tone: "mid", bevel: 0.5 }));
  back.push(L([24.2, 25.4].map((h) => lnUB([-31, 5.2, z + h], [31, 5.2, z + h])).join(""), { tone: "faint" }));
  back.push(L(topUB(-26, 7.2, 26, 7.2, z + 26.8), { tone: "faint" }) + D([pUB(-26, 7.2, z + 26.8), pUB(26, 7.2, z + 26.8)], { size: 0.45, tone: "mid" }));
  back.push(lampAt("lamp-read", 23, 7.2, z + 26.8, 1.5));
  const F = frZ(0, 0.2, z + 6.6);
  front.push(`<g data-part="head">${boxUB(-4.6, 4.6, 3.2, 5.2, z + 21.4, 7, { tone: "mid" })}${boxUB(-1.4, 1.4, 1.2, 3.4, z + 22.2, 3.4, { tone: "mid", bevel: 0.2 })}${boxUB(-3.9, 3.9, -2.4, 2.6, z + 12.6, 8.8, { tone: "hi", bevel: 0.5 })}${turned(F, [[0, 3.6], [0.8, 3.6], [1.5, 2.6], [3, 2.4], [6, 2.6]], { tone: "mid" })}${S(G.disc(-0.2, 0.3, 2.1, F, P), { tone: "lo" })}${L(lnUB([-3.9, -2.4, z + 17.4], [3.9, -2.4, z + 17.4]), { tone: "faint" })}${S(G.sphereOf([0, 0, z + 21.6], 1.1, P), { tone: "hi", lit: true })}${D([pUB(-2.6, -2.4, z + 15), pUB(2.6, -2.4, z + 15)], { size: 0.42, tone: "lo" })}</g>`);
  return { back: back.join(""), front: front.join("") };
}
// ---------------------------------------------------------------- étage 1 · tri : plateau à quatre empreintes, glyphes et pile d'encodeur
const HOLES = [-21, -7, 7, 21], HB = 25, TRAY_H = 7;
function floor1() {
  const z = ZF(1), back = [], front = [];
  back.push(boxUB(-34, 34, 19, 31, z, TRAY_H, { tone: "mid", bevel: 0.7 }));
  back.push(boxUB(-35.4, 35.4, 18.2, 19.6, z, 2.4, { tone: "lo", bevel: 0.3 }));
  back.push(L(flatUB(rectUB(-32, 32, 21, 29), z + TRAY_H), { tone: "faint" }));
  HOLES.forEach((u, i) => {
    const pts = chipShape(i).map(([a, c]) => [u + a * 1.65, HB + c * 1.65]);
    const rim = chipShape(i).map(([a, c]) => [u + a * 2.15, HB + c * 2.15]);
    back.push(L(flatUB(rim, z + TRAY_H), { tone: "mid" }));
    back.push(dark(flatUB(pts, z + TRAY_H)) + L(flatUB(pts, z + TRAY_H), { tone: "lo" }));
    back.push(lampAt(`sort-lamp-${i}`, u, 20.2, z + TRAY_H, 1.15));
    // glyphe de la catégorie, gravé sur la face avant
    const g = chipShape(i).map(([a, c]) => pUB(u + a * 1.15, 19, z + 3.6 + c * 1.15));
    back.push(L(pth(g, true), { tone: "mid" }));
  });
  back.push(L(lnUB([-34, 19, z + 2.6], [34, 19, z + 2.6]), { tone: "faint" }));
  back.push(D([[-32.6, 29.6], [32.6, 29.6], [-32.6, 20.4], [32.6, 20.4]].map(([u, b]) => pUB(u, b, z + TRAY_H)), { size: 0.42, tone: "lo" }));
  // pile d'encodeur : six couches de mini-BERT, quatre tirants, plaque d'aération, conduit vers le plateau
  for (let i = 0; i < 6; i++) back.push(boxUB(-51, -39.4, 20, 31, z + i * 2.5, 2.0, { tone: i % 2 ? "mid" : "hi", bevel: 0.3 }));
  for (const [u, b] of [[-49.6, 21.4], [-40.8, 21.4], [-49.6, 29.6], [-40.8, 29.6]]) back.push(cylUB(u, b, 0.5, z, 15, { tone: "lo", crease: "none", steps: 8 }));
  back.push(boxUB(-51.6, -38.8, 19.6, 31.4, z + 15, 1.2, { tone: "lo", bevel: 0.3 }));
  back.push(L([0, 1, 2, 3, 4, 5].map((i) => lnUB([-51, 20, z + i * 2.5 + 1], [-39.4, 20, z + i * 2.5 + 1])).join(""), { tone: "faint" }));
  back.push(boxUB(-39.4, -34, 24, 26, z + 3.4, 2.2, { tone: "mid", bevel: 0.3 }));
  back.push(L([22, 26].map((b) => lnUB([-51.6, b, z + 16.2], [-38.8, b, z + 16.2])).join("").replace(/^$/, ""), { tone: "faint", free: true }));
  for (const u of [-37, 37]) back.push(cylUB(u, 25, 1.1, z + TRAY_H, 9, { tone: "mid", crease: "none" }));
  return { back: back.join(""), front: front.join("") };
}
// ---------------------------------------------------------------- étage 2 · serrure à deux clés (le modèle, les règles) et verrou latéral
function floor2() {
  const z = ZF(2), back = [], front = [];
  back.push(boxUB(-21, 21, 20, 31, z, 17, { tone: "mid", bevel: 0.7 }));
  // entrées : platine ronde pour la clé du modèle, platine carrée pour celle des règles
  const F = frB(-14, 20, z + 8.4);
  back.push(S(G.disc(-0.8, 0, 4.4, F, P), { tone: "lo" }));
  back.push(dark(circUB(-14, 19.2, 2.3, z + 8.4)) + L(circUB(-14, 19.2, 2.3, z + 8.4), { tone: "lo" }));
  back.push(boxUB(10.8, 17.2, 19.2, 20, z + 5.2, 6.4, { tone: "lo", bevel: 0.2 }));
  const sq = [pUB(11.8, 19.2, z + 6.2), pUB(16.2, 19.2, z + 6.2), pUB(16.2, 19.2, z + 10.6), pUB(11.8, 19.2, z + 10.6)];
  back.push(dark(pth(sq, true)) + L(pth(sq, true), { tone: "lo" }));
  back.push(facePlate(-7, 7, 20, z + 6.6, z + 11.4) + ruleLines(-5, 5, 20, [z + 8, z + 9.6]));
  back.push(L([4, 14.4].map((h) => lnUB([-21, 20, z + h], [21, 20, z + h])).join(""), { tone: "faint" }));
  back.push(D([[-19, 2.2], [19, 2.2], [-19, 15.6], [19, 15.6]].map(([u, h]) => pUB(u, 20, z + h)), { size: 0.4, tone: "lo" }));
  back.push(lampAt("lamp-lock", 0, 25.5, z + 17, 1.7));
  back.push(L(flatUB(rectUB(-19, 19, 22, 29), z + 17), { tone: "faint" }));
  // rails de guidage des deux clés, butées d'extrémité
  for (const u of [-14, 14]) { back.push(boxUB(u - 0.8, u + 0.8, -9, 19.4, z, 7.2, { tone: "lo", bevel: 0.2 })); back.push(boxUB(u - 1.6, u + 1.6, -10.2, -8.4, z, 8.6, { tone: "mid", bevel: 0.2 })); }
  // fourreau du verrou, à droite : il avale la barre
  front.push(boxUB(17, 49, -10.8, -5.2, z + 1.2, 7.4, { tone: "mid", bevel: 0.5 }));
  front.push(L(lnUB([17, -10.8, z + 4.6], [49, -10.8, z + 4.6]), { tone: "faint" }));
  front.push(D([[18.6, 7.4], [47.4, 7.4], [18.6, 2.4], [47.4, 2.4]].map(([u, h]) => pUB(u, -10.8, z + h)), { size: 0.4, tone: "lo" }));
  return { back: back.join(""), front: front.join("") };
}
const bowDisc = (r, h0, h1) => `${S(G.disc(h0, h1, r, G.frameAlong([0, 0, 0], [0, 0, 1]), P), { tone: "hi", lit: true })}`;
const keyN = () => `<g data-part="key-n">${S(G.disc(0, 1.6, 3.5, G.frameAlong([...wUB(0, -17.8), 0], [0, 0, 1]), P), { tone: "hi", lit: true })}${cylUB(0, -17.8, 1.2, 0, 1.7, { tone: "lo", steps: 14 })}${boxUB(-0.8, 0.8, -16, 0, 0, 1.6, { tone: "mid", bevel: 0.2 })}${boxUB(-1.4, 1.4, -4.6, -3.4, 0, 1.6, { tone: "mid", bevel: 0.15 })}${boxUB(-1.4, 1.4, -1.6, -0.6, 0, 1.6, { tone: "mid", bevel: 0.15 })}</g>`;
const keyR = () => `<g data-part="key-r">${boxUB(-3.4, 3.4, -21, -14.4, 0, 1.6, { tone: "hi", lit: true, bevel: 0.3 })}${boxUB(-1, 1, -19.4, -16, 0, 1.7, { tone: "lo", bevel: 0.1 })}${boxUB(-0.8, 0.8, -16, 0, 0, 1.6, { tone: "mid", bevel: 0.2 })}${boxUB(-1.5, 1.5, -5, -3.8, 0, 1.6, { tone: "mid", bevel: 0.15 })}${boxUB(-1.5, 1.5, -2.2, -1, 0, 1.6, { tone: "mid", bevel: 0.15 })}</g>`;
const gateSvg = (z) => `<g data-part="gate">${boxUB(-14, 14, -10.2, -5.8, z + 2.4, 2.8, { tone: "hi", lit: true, bevel: 0.4 })}${L(lnUB([-14, -10.2, z + 3.8], [14, -10.2, z + 3.8]), { tone: "faint" })}${boxUB(14, 17, -9.6, -6.4, z + 2.8, 2, { tone: "mid", bevel: 0.2 })}</g>`;
// ---------------------------------------------------------------- étage 3 · relecture humaine : portique du tampon à main, encrier, râtelier
function floor3() {
  const z = ZF(3), back = [], front = [];
  for (const sgn of [-1, 1]) back.push(pylon(sgn * 28, 6, z, 23.4));
  back.push(boxUB(-31, 31, 4.2, 8.2, z + 23, 3.8, { tone: "mid", bevel: 0.5 }));
  back.push(L(lnUB([-31, 4.2, z + 24.9], [31, 4.2, z + 24.9]), { tone: "faint" }));
  // compteur de cadres validés, sur la traverse
  back.push(facePlate(-5.4, 5.4, 4.2, z + 23.7, z + 26.1));
  back.push(`<text class="fig-digits" data-part="tally" transform="${faceM(4.2, z + 23.7)}" x="0" y="-0.7" text-anchor="middle" font-size="2.1">0/4</text>`);
  // encrier : plateau, tampon encreur, couvercle ouvert sur sa charnière
  back.push(boxUB(14, 34, 14, 28, z, 4, { tone: "mid", bevel: 0.6 }));
  back.push(boxUB(16, 32, 16, 26, z + 4, 1.4, { tone: "lo", bevel: 0.3 }));
  back.push(dark(flatUB(rectUB(17.5, 30.5, 17.5, 24.5), z + 5.4)) + L(flatUB(rectUB(17.5, 30.5, 17.5, 24.5), z + 5.4), { tone: "lo" }));
  back.push(boxUB(14, 34, 27.4, 29, z + 4, 9.4, { tone: "mid", bevel: 0.4 }));
  back.push(L(lnUB([14, 28, z + 11], [34, 28, z + 11]), { tone: "faint" }));
  back.push(D([[15.6, z + 6], [32.4, z + 6]].map(([u, h]) => pUB(u, 27.4, h)), { size: 0.4, tone: "lo" }));
  // râtelier de deux tampons de rechange
  back.push(boxUB(-40, -16, 20, 26, z, 3, { tone: "lo", bevel: 0.4 }));
  for (const u of [-33, -23]) {
    back.push(turned(frZ(u, 23, z + 3), [[0, 2.6], [3, 2.6], [3.4, 1.2], [7.4, 1.2], [8.2, 2.8], [10, 3], [11, 2.4], [11.6, 0.8]], { tone: "mid" }));
  }
  back.push(L(flatUB(rectUB(-38, -18, 21, 25), z + 3), { tone: "faint" }));
  // chariot et tampon : rails, fourreau, tige, ressort, pommeau
  front.push(`<g data-part="shead">${boxUB(-4.6, 4.6, 2.8, 4.4, z + 22.4, 5.8, { tone: "mid" })}${boxUB(-1.6, 1.6, 0.4, 2.8, z + 23, 3.4, { tone: "mid", bevel: 0.2 })}<g data-part="splow">${cylUB(0, 0, 1.2, z + 10.8, 19, { tone: "hi", crease: "none", lit: true })}${turned(frZ(0, 0, z + 29.4), [[0, 1.6], [0.6, 3.1], [2.6, 3.4], [3.6, 2.6], [4.2, 1.2]], { tone: "hi", lit: true })}${cylUB(0, 0, 2.6, z + 6.4, 0.8, { tone: "lo", steps: 24 })}${cylUB(0, 0, 2.1, z + 7.2, 3.6, { tone: "hi", lit: true, steps: 24 })}</g>${cylUB(0, 0, 2.5, z + 15.6, 8.4, { tone: "mid", crease: "none" })}${turned(frZ(0, 0, z + 23.8), [[0, 3.1], [0.8, 3.1]], { tone: "lo" })}<g data-part="sspring"></g></g>`);
  return { back: back.join(""), front: front.join("") };
}
// ---------------------------------------------------------------- étage 4 · fichier du corpus : classeur à fiches à onglets, couvercle de scellement
const SLOTS = 12, SU0 = -37, SDU = 2.2;
function floor4() {
  const z = ZF(4), back = [], front = [];
  back.push(boxUB(-41, -10, 17, 32, z, 9, { tone: "mid", bevel: 0.7 }));
  back.push(dark(flatUB(rectUB(-39, -12, 19, 30), z + 9)) + L(flatUB(rectUB(-39, -12, 19, 30), z + 9), { tone: "lo" }));
  back.push(L(lnUB([-41, 17, z + 3.2], [-10, 17, z + 3.2]), { tone: "faint" }));
  back.push(facePlate(-24, -13, 17, z + 2.2, z + 6.6));
  back.push(`<text class="fig-digits" data-part="count" transform="${faceM(17, z + 3.2)}" x="-18.5" y="-1.1" text-anchor="middle" font-size="3.4">00</text>`);
  back.push(turned(frB(-34, 17, z + 4.4), [[0, 1.0], [-1.4, 1.0], [-1.8, 1.9], [-3, 1.9]], { tone: "mid" }));
  back.push(D([[-39.6, 7.6], [-11.4, 7.6], [-39.6, 1.2], [-11.4, 1.2]].map(([u, h]) => pUB(u, 17, z + h)), { size: 0.4, tone: "lo" }));
  const cards = [];
  for (let i = 0; i < SLOTS; i++) {
    const u = SU0 + i * SDU, tabU = u + ((i * 7) % 3 - 1) * 0.0;
    cards.push(`<g data-part="card-${i}" opacity="0">${boxUB(u - 0.5, u + 0.5, 20.4, 28.6, z + 3, 8.6 + (i % 3) * 0.5, { tone: "hi", crease: "none", bevel: 0.1 })}${boxUB(u - 0.5, u + 0.5, 20.4 + (i % 4) * 2, 22.4 + (i % 4) * 2, z + 11.6 + (i % 3) * 0.5, 1.2, { tone: "mid", crease: "none", bevel: 0.1 })}</g>`);
  }
  back.push(cards.join(""));
  back.push(boxUB(-42, -9, 31.4, 33, z, 15, { tone: "mid", bevel: 0.4 }));
  back.push(L(lnUB([-42, 31.4, z + 12], [-9, 31.4, z + 12]), { tone: "faint" }));
  front.push(`<g data-part="lid" opacity="0">${boxUB(-40, -11, 18, 31, z + 9.4, 1.6, { tone: "mid", bevel: 0.5 })}${turned(frZ(-25, 24.5, z + 11), [[0, 2.8], [0.6, 2.8], [1, 1.4], [2.2, 1.4], [2.8, 2.4], [3.4, 0.8]], { tone: "hi", lit: true })}${L(lnUB([-40, 18, z + 10.2], [-11, 18, z + 10.2]), { tone: "faint" })}</g>`);
  return { back: back.join(""), front: front.join("") };
}
// ---------------------------------------------------------------- étage 5 · presse d'entraînement LayoutLMv3 : montants, traverse, vérin, cadran, groupe hydraulique
function floor5() {
  const z = ZF(5), back = [], front = [];
  for (const sgn of [-1, 1]) {
    back.push(boxUB(sgn * 22 - 3.4, sgn * 22 + 3.4, 1.8, 8.6, z, 2, { tone: "lo", bevel: 0.4 }));
    back.push(turned(frZ(sgn * 22, 5.2, z + 2), [[0, 2.7], [0.8, 2.7], [1.4, 2.2], [21.8, 2.2], [22.4, 2.7]], { tone: "mid", inner: L(G.ribsOf(frZ(sgn * 22, 5.2, z + 2), 3, 20, 2.2, 10, P), { tone: "lo" }) }));
    back.push(D([[-2.4, -2.4], [2.4, 2.4], [-2.4, 2.4], [2.4, -2.4]].map(([a, c]) => pUB(sgn * 22 + a, 5.2 + c, z + 2)), { size: 0.38, tone: "lo" }));
  }
  back.push(boxUB(-26, 26, 1.8, 8.6, z + 24, 4.2, { tone: "mid", bevel: 0.6 }));
  back.push(L(lnUB([-26, 1.8, z + 26.2], [26, 1.8, z + 26.2]), { tone: "faint" }));
  // cadran de perte : lunette ronde, face claire, aiguille dynamique
  const cx = -17, cz = z + 26.2, ring1 = (r) => circUB(cx, 1.8, r, cz, 32);
  back.push(`<path class="iso-fill fig-window" d="${ring1(3.3)}"/>` + L(ring1(3.3), { tone: "mid" }) + L(ring1(2.6), { tone: "faint" }));
  back.push(L(Array.from({ length: 11 }, (_, i) => { const a = (150 - i * 12) * Math.PI / 180; return pth([pUB(cx + 2.6 * Math.cos(a), 1.8, cz + 2.6 * Math.sin(a)), pUB(cx + 3.3 * Math.cos(a), 1.8, cz + 3.3 * Math.sin(a))]); }).join(""), { tone: "lo" }));
  back.push(lampAt("lamp-press", 19, 1.8, z + 26.2, 1.5));
  // groupe hydraulique à gauche : caisson, moteur, tuyau qui monte au vérin
  back.push(boxUB(-46, -31, 14, 27, z, 9, { tone: "mid", bevel: 0.6 }));
  back.push(turned(frZ(-38.5, 20.5, z + 9), [[0, 4.6], [1, 4.6], [4.4, 4.2], [5, 3.4]], { tone: "hi" }));
  back.push(L(lnUB([-46, 14, z + 4.2], [-31, 14, z + 4.2]), { tone: "faint" }));
  back.push(D([[-44.6, 7.4], [-32.4, 7.4]].map(([u, h]) => pUB(u, 14, z + h)), { size: 0.4, tone: "lo" }));
  back.push(L(lnUB([-33, 17, z + 9], [-33, 17, z + 14], [-18, 9.6, z + 14], [-18, 5.2, z + 26]), { tone: "mid", free: true }) + D([pUB(-33, 17, z + 9), pUB(-18, 5.2, z + 26)], { size: 0.55, tone: "hi" }));
  front.push(`<g data-part="needle"></g>`);
  front.push(`<g data-part="ram">${turned(frZ(0, 4.4, z + 16.6), [[0, 5.8], [0.8, 5.8], [0.8, 7], [3.6, 7], [4.2, 6.2], [3.6, 2.6], [7.6, 2.4]], { tone: "mid" })}${cylUB(0, 4.4, 2.4, z + 20.2, 3.8, { tone: "hi", crease: "none", lit: true })}</g>`);
  front.push(turned(frZ(0, 4.4, z + 19), [[0, 3.6], [5, 3.6]], { tone: "mid", inner: L(k.ring(...wUB(0, 4.4), 3.6, z + 21.4, P, 24), { tone: "faint" }) }));
  return { back: back.join(""), front: front.join("") };
}
// ---------------------------------------------------------------- étage 6 · évaluation et publication : colonnes graduées, levier à boule, goupille, butées
const COLS = [{ u: -21, mark: 0.75 }, { u: 21, mark: 0.9 }], COLZ = [4, 25];
const colY = (v) => 4 + (v - 0.5) / 0.5 * 21;
function floor6() {
  const z = ZF(6), back = [], front = [];
  COLS.forEach((c, i) => {
    back.push(boxUB(c.u - 5.6, c.u + 5.6, 5.4, 16.6, z, 3, { tone: "lo", bevel: 0.5 }));
    back.push(turned(frZ(c.u, 11, z + 3), [[0, 3.6], [1, 3.6], [1.8, 2.2], [25, 2.2], [25.6, 2.9], [27.6, 2.9], [28.2, 1.6]], { tone: "mid" }));
    for (let q = 0; q <= 10; q++) { const v = 0.5 + q * 0.05; back.push(L(k.ring(...wUB(c.u, 11), 2.25, z + colY(v), P, 20), { tone: Math.abs(v - c.mark) < 0.001 ? "hi" : q % 2 ? "faint" : "lo" })); }
    back.push(boxUB(c.u - 1.8, c.u + 1.8, 8.4 - 0, 9.6, z + colY(c.mark) - 0.6, 1.2, { tone: "hi", lit: true, bevel: 0.15 }));
    back.push(lampAt(`fork-${i}`, c.u, 11, z + 28.2, 1.5));
    back.push(D([[-4.4, -4.4], [4.4, 4.4], [-4.4, 4.4], [4.4, -4.4]].map(([a, d]) => pUB(c.u + a, 11 + d, z + 3)), { size: 0.38, tone: "lo" }));
  });
  // levier de publication : caisson, pivot, butée d'arrivée, console de la goupille
  back.push(boxUB(-14, 14, 22, 32, z, 9, { tone: "mid", bevel: 0.7 }));
  back.push(L(lnUB([-14, 22, z + 4.4], [14, 22, z + 4.4]), { tone: "faint" }));
  back.push(facePlate(-8, 3, 22, z + 5.8, z + 8.2));
  back.push(turned(frZ(0, 27, z + 9), [[0, 2.8], [1.4, 2.8], [1.4, 1.4], [2.6, 1.4]], { tone: "lo" }));
  back.push(lampAt("lamp-pub", 9, 22, z + 6.8, 1.7));
  back.push(boxUB(8, 14, 12, 16.4, z, 3.4, { tone: "lo", bevel: 0.4 }));
  const tipRest = [12, 16.2], tipPull = [27 + 16.1 * 0 - 9 + 0, 13];
  back.push(cylUB(-9, 13, 1.4, z, 9, { tone: "lo", crease: "none" }) + cylUB(-9, 13, 2.2, z + 9, 0.8, { tone: "mid" }));
  front.push(`<g data-part="forks"></g>`);
  front.push(`<g data-part="lever"></g>`);
  front.push(`<g data-part="pin">${cylUB(12, 16.2, 0.9, z + 3.4, 10, { tone: "hi", crease: "none", lit: true })}${S(G.sphereOf([...wUB(12, 16.2), z + 14.2], 1.7, P), { tone: "hi", lit: true })}</g>`);
  return { back: back.join(""), front: front.join("") };
}
// ---------------------------------------------------------------- étage 7 · lanterne : la lentille publiée tourne
const bigLens = () => `<g data-part="biglens" opacity="0">${lensSvg(13, 30, PZ, true)}<g data-part="lens-spin"></g></g>`;

const FL = [floor0(), floor1(), floor2(), floor3(), floor4(), floor5(), floor6(), { back: "", front: "" }];
FL[2].front += gateSvg(ZF(2));
FL[2].back += `<g data-part="keys-slot"></g>`;
const payload = `<g data-part="page">${pageSvg()}${[0, 1, 2, 3].map(inkSvg).join("")}</g><g data-part="chips"></g><g data-part="card" opacity="0">${cardSvg()}</g><g data-part="crate" opacity="0">${crateSvg()}</g><g data-part="lens" opacity="0">${lensSvg(7, 13, PZ, true)}</g>${bigLens()}`;
const worldBits = `<g data-part="cardfly" opacity="0"></g><g data-part="crateflight" opacity="0">${crateFlightSvg()}</g>`;
function crateFlightSvg() { const z0 = 0; return boxUB(-7, 7, -7, 7, 0, 9, { tone: "mid", bevel: 0.6 }) + boxUB(-7.2, 7.2, -1.8, 1.8, 8.2, 0.9, { tone: "lo", crease: "none", bevel: 0.1 }) + boxUB(-1.8, 1.8, -7.2, 7.2, 8.2, 0.9, { tone: "lo", crease: "none", bevel: 0.1 }); }

const lant = lanternParts();
const keysMarkup = keyN() + keyR();
const bodyParts = [seaSvg(), `<g id="seapages"></g><g id="beam-back" class="fx"></g>`, rulerSvg(), oldTower(), islet(), pierSvg()];
for (let f = 0; f < NF - 1; f++) {
  bodyParts.push(wallSvg(f), bandSvg(f), beltSvg(f), wallOuter(f), slabSvg(f), shaftPosts(true, f), FL[f].back);
  if (f === 2) bodyParts.push(keysMarkup);
}
bodyParts.push(slabSvg(NF - 1), lant.back);
const plat = platformSvg();
bodyParts.push(`<g id="mast"></g><g data-part="platform">${plat.under}${payload}${plat.over}</g>`);
for (let f = 0; f < NF - 1; f++) bodyParts.push(FL[f].front);
bodyParts.push(worldBits, lant.front, lant.top, roofSvg(), `<g id="fx" class="fx"></g>`);
bodyParts.push(`<defs><linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g,#34d399);stop-opacity:.6"/><stop offset="1" style="stop-color:var(--g,#34d399);stop-opacity:.05"/></linearGradient></defs>`);


// ---------------------------------------------------------------- modèle
const STATIONS = [
  ["Lecture · Document AI", "la tête lit les quatre champs de la page"],
  ["Tri sémantique · mini-BERT", "chaque champ tombe dans sa catégorie"],
  ["Hybride neuro-symbolique", "la clé du modèle et la clé des règles ouvrent ensemble"],
  ["Relecture · Human-in-the-Loop", "un tampon à main valide chaque cadre"],
  ["Corpus multimodal", "la fiche garde l'image, le texte et les positions"],
  ["Entraînement · LayoutLMv3", "la presse tire du lot une lentille"],
  ["Évaluation et publication", "deux seuils tenus, le levier publie"],
  ["Inférence · le faisceau", "la lentille balaie la mer et propose des cadres"],
];
const live = `
const P = ${JSON.stringify(P)};
const UDv = ${JSON.stringify(Ud)}, BDv = ${JSON.stringify(Bd)};
const Z0 = ${Z0}, PITCH = ${PITCH}, PZ = ${PZ}, FU = ${JSON.stringify(FU)}, FB = ${JSON.stringify(FB)};
const HOLES = ${JSON.stringify(HOLES)}, HB = ${HB}, TRAY_H = ${TRAY_H}, SLOTS = ${SLOTS}, SU0 = ${SU0}, SDU = ${SDU};
const COLS = ${JSON.stringify(COLS)}, LENSC = ${PZ + 5 + 10.5}, TOPLANT = ${LANT_Z};
const STATIONS = ${JSON.stringify(STATIONS)};
const CHIPS = ${JSON.stringify([0, 1, 2, 3].map(chipSvg))};
${LOOP}
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ZFl = (f) => Z0 + f * PITCH;
// Calendrier : début de chaque étage ; la dernière seconde et demie avant le suivant, le monte-charge monte.
const Ts = [0, 5.4, 11.0, 17.2, 25.4, 33.4, 41.0, 48.4], LIFT = 1.5, TD = 62, TEND = 64;
const stationAt = (s) => { let i = 0; Ts.forEach((a, j) => { if (s >= a) i = j; }); return i; };
const liftZ = (s) => {
  if (s >= TD) return lerp(ZFl(7), ZFl(0), ease(seg(s, TD, TD + 1.8)));
  for (let i = 0; i < 7; i++) { const a = Ts[i + 1] - LIFT; if (s >= a && s < Ts[i + 1]) return lerp(ZFl(i), ZFl(i + 1), ease((s - a) / LIFT)); }
  return ZFl(stationAt(s));
};
const w3 = (u, b, z) => [u * UDv[0] + b * BDv[0], u * UDv[1] + b * BDv[1], z];
const pr = (u, b, z) => iso(w3(u, b, z), P);
const dUB = (du, db, dz) => translateAlong(P, [du * UDv[0] + db * BDv[0], du * UDv[1] + db * BDv[1], dz || 0]);
const hash = (n) => { let h = Math.imul(n + 7, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const ringAt = (u, b, r, z, n) => ring(w3(u, b, 0)[0], w3(u, b, 0)[1], r, z, P, n || 36);
const lineFx = (d, w, a) => '<path class="fx-line" d="' + d + '" style="stroke-width:' + w + ';opacity:' + clamp01(a).toFixed(2) + '"/>';
const rectUBpath = (u0, b0, u1, b1, z) => pathOf([pr(u0, b0, z), pr(u1, b0, z), pr(u1, b1, z), pr(u0, b1, z)], true);
function vcoil(cx, cy, z0, z1, r, turns) {
  const count = Math.round(turns * 24), back = [], front = []; let run = [], near = null; const V = towardViewer(P);
  for (let i = 0; i <= count; i++) {
    const a = i / count * turns * Math.PI * 2, p = iso([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + (z1 - z0) * i / count], P), f = Math.cos(a) * V[0] + Math.sin(a) * V[1] > 0;
    if (near === null) near = f;
    if (f !== near) { run.push(p); (near ? front : back).push(pathOf(run)); run = [p]; near = f; continue; }
    run.push(p);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(""), front: front.join("") };
}
// barre fine qui relie deux points du plan (u, b), à la hauteur z
const bar = (u0, b0, u1, b1, w, z, h, tone) => {
  const dx = u1 - u0, dy = b1 - b0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
  const ringp = [[u0 + nx, b0 + ny], [u1 + nx, b1 + ny], [u1 - nx, b1 - ny], [u0 - nx, b0 - ny]].map(([u, b]) => w3(u, b, 0).slice(0, 2));
  return solidSvg(extrude(ringp, z, h, P, { bevel: 0.2 }), { tone: tone || "mid" });
};
const parts = {}; parts.mast = svg.querySelector("#mast"); parts.seapages = svg.querySelector("#seapages");
for (const n of ["platform", "page", "chips", "card", "card-img", "card-txt", "card-pos", "crate", "lens", "biglens", "lens-spin", "cardfly", "crateflight", "head", "key-n", "key-r", "gate", "shead", "splow", "sspring", "lid", "count", "tally", "ram", "needle", "forks", "lever", "pin", "lamp-read", "lamp-lock", "lamp-press", "lamp-pub"]) parts[n] = $(n);
const inks = [0, 1, 2, 3].map((i) => $("ink-" + i)), cardEls = Array.from({ length: SLOTS }, (_, i) => $("card-" + i));
const sortLamps = [0, 1, 2, 3].map((i) => $("sort-lamp-" + i)), forkLamps = [0, 1].map((i) => $("fork-" + i));
const fxLayer = svg.querySelector("#fx"), beamBack = svg.querySelector("#beam-back");
parts.cardfly.innerHTML = parts.card.innerHTML;
let t = 0, frozen = false, touring = true, idle = 0;

// ---- état de la boucle à l'instant s (fonction pure de s : sauter d'une station à l'autre ne laisse aucune trace)
function stateAt(s) {
  const o = {}, res = ease(seg(s, TD + 0.2, TD + 1.8)), per = (a, b) => ease(seg(s, a, b)) * (1 - res);
  const E = (n) => Ts[n];
  o.lift = liftZ(s); const zf = o.lift;
  // 0 · la page sort de la trémie, la tête de lecture lit ses quatre champs
  o.pageB = lerp(24, 0, ease(seg(s, 0.2, 1.5)));
  o.pageA = clamp01((20 - o.pageB) / 5) * (s < E(4) + 0.3 ? 1 : 0);
  o.headU = s < 3.7 ? (s < 1.8 ? lerp(-14, -5.4, ease(seg(s, 1.1, 1.8))) : lerp(-5.4, 5.4, seg(s, 1.8, 3.6))) : lerp(5.4, -14, ease(seg(s, 3.8, 4.6)));
  o.read = FU.map((u) => s > 1.7 && s < 4.4 && o.headU >= u - 0.5 ? clamp01(1 - (s - 3.9) / 0.5) : 0);
  o.scan = s > 1.7 && s < 3.8;
  o.lampRead = s > 1.1 && s < 4.4;
  // 1 · les champs deviennent des jetons qui tombent chacun dans son empreinte
  o.chips = []; o.sorted = [0, 0, 0, 0]; o.drop = [-1, -1, -1, -1];
  for (let q = 0; q < 4; q++) {
    const a = E(1) + 0.6 + q * 0.75, u = seg(s, a, a + 0.55), f = seg(s, a + 0.55, a + 0.85);
    o.sorted[q] = per(a + 0.55, a + 0.85) > 0.5 ? 1 : 0;
    if (u > 0 && u < 1) o.chips.push({ q, x: lerp(FU[q], HOLES[q], ease(u)), y: lerp(-1.7, HB, ease(u)), z: lerp(PZ + 0.8, TRAY_H, ease(u)) + 14 * Math.sin(u * Math.PI), a: 1 });
    else if (u >= 1 && f < 1) { o.chips.push({ q, x: HOLES[q], y: HB, z: lerp(TRAY_H, TRAY_H - 1.4, f), a: 1 - f }); o.drop[q] = f; }
  }
  // 2 · deux clés dans la serrure, le verrou s'efface
  o.keyN = per(E(2) + 0.5, E(2) + 1.7); o.keyR = per(E(2) + 1.6, E(2) + 2.8); o.lampLock = per(E(2) + 2.9, E(2) + 3.1) > 0.5 ? 1 : 0; o.gate = per(E(2) + 3.2, E(2) + 4.2);
  // 3 · le tampon passe d'un champ à l'autre, appuie, encre le cadre
  const stepT = (n) => E(3) + 0.5 + n * 1.45;
  o.stU = -15; o.press = 0; o.hitStamp = [];
  for (let n = 0; n < 4; n++) {
    if (s >= stepT(n)) {
      o.stU = n === 0 ? lerp(-15, FU[0], ease(seg(s, stepT(0), stepT(0) + 0.45))) : lerp(FU[n - 1], FU[n], ease(seg(s, stepT(n), stepT(n) + 0.4)));
      const d = s - stepT(n) - 0.5; o.press = Math.max(o.press, d < 0 ? 0 : d < 0.18 ? ease(d / 0.18) : d < 0.36 ? 1 - ease((d - 0.18) / 0.18) : 0);
      const age = s - (stepT(n) + 0.68); if (age >= 0 && age < 0.7) o.hitStamp.push({ n, age });
    }
  }
  if (s > stepT(3) + 1.0) o.stU = lerp(FU[3], -15, ease(seg(s, stepT(3) + 1.0, stepT(3) + 1.8)));
  o.ink = FU.map((_, n) => ease(seg(s, stepT(n) + 0.65, stepT(n) + 0.75)) * (s < E(4) + 0.3 ? 1 : 0));
  // 4 · la page devient une fiche à trois feuillets, rangée dans le classeur, qui est scellé : un lot naît
  o.cardA = s >= E(4) + 0.3 && s < E(4) + 1.9 ? 1 : 0;
  o.spread = ease(seg(s, E(4) + 0.4, E(4) + 1.2));
  const cf = seg(s, E(4) + 1.9, E(4) + 3.6), ce = ease(cf);
  o.cardFly = cf > 0 && cf < 1 ? { u: lerp(0, SU0 + 9 * SDU, ce), b: lerp(0, 24.5, ce), z: lerp(0, 8.6, ce) + 12 * Math.sin(cf * Math.PI), a: 1 } : null;
  o.nCards = 9 + (per(E(4) + 3.6, E(4) + 3.8) > 0.5 ? 1 : 0);
  o.lid = per(E(4) + 4.2, E(4) + 4.9);
  const tf = seg(s, E(4) + 5.2, E(4) + 6.5), te = ease(tf);
  o.crateFly = tf > 0 && tf < 1 ? { u: lerp(-25, 0, te), b: lerp(24.5, 0, te), z: lerp(11.4, PZ, te) + 7 * Math.sin(tf * Math.PI), a: ease(seg(s, E(4) + 5.2, E(4) + 5.5)) } : null;
  // 5 · la presse : trois frappes, la perte baisse, la lentille sort du lot
  const strike = (k2) => E(5) + 0.9 + k2 * 1.5;
  o.ram = 0; o.hitRam = -1;
  for (let k2 = 0; k2 < 3; k2++) { const d = s - strike(k2); o.ram = Math.max(o.ram, d < 0 ? 0 : d < 0.4 ? ease(d / 0.4) : d < 0.9 ? 1 - ease((d - 0.4) / 0.5) : 0); const age = d - 0.4; if (age >= 0 && age < 0.9) o.hitRam = Math.max(o.hitRam, age); }
  o.lampPress = s > E(5) + 0.4 && s < strike(2) + 1.4 ? 1 : 0;
  o.loss = lerp(1, 0.14, ease(seg(s, strike(0) + 0.3, strike(2) + 0.6)));
  o.crateA = (s >= E(4) + 6.5 && s < strike(2) + 0.45 ? 1 : 0);
  o.lensA = ease(seg(s, strike(2) + 0.4, strike(2) + 0.85)) * (1 - ease(seg(s, E(7) + 0.6, E(7) + 1.8))) * (1 - res);
  o.flash = s > strike(2) + 0.35 && s < strike(2) + 1.1 ? (s - strike(2) - 0.35) / 0.75 : -1;
  // 6 · deux colonnes de mesure, puis la goupille, puis le levier
  o.colV = [per(E(6) + 0.5, E(6) + 2.3) * 0.25 + 0.5, per(E(6) + 2.0, E(6) + 3.8) * 0.4 + 0.5];
  o.forkOn = [o.colV[0] >= 0.749 ? 1 : 0, o.colV[1] >= 0.899 ? 1 : 0];
  o.pin = per(E(6) + 4.1, E(6) + 4.8); o.pull = per(E(6) + 4.8, E(6) + 6.1); o.lampPub = o.pull > 0.97 ? 1 : 0;
  // 7 · la lentille grandit dans la lanterne et tourne : un faisceau, des pages qui reçoivent des cadres
  o.bigA = ease(seg(s, E(7) + 0.6, E(7) + 1.8)) * (1 - res);
  o.phi = s > E(7) + 1.8 && s < TD ? (s - E(7) - 1.8) * 1.5 : null;
  o.beamA = s > E(7) + 1.8 && s < TD ? ease(seg(s, E(7) + 1.8, E(7) + 2.6)) * (1 - ease(seg(s, TD - 1.2, TD))) : 0;
  o.spin = Math.max(0, s - E(7) - 1.6) * 1.5;
  return o;
}
function mastMarkup(zl) {
  const E = zl - Z0, N = 6, Lt = 70; let out = "";
  const seg2 = []; for (let j = 0; j < N; j++) { const b0 = Z0 - 2 + E * j / N; seg2.push([b0, Math.min(b0 + Lt, zl)]); }
  for (let j = N - 1; j >= 0; j--) {
    const [b0, b1] = seg2[j]; if (b1 - b0 < 0.6) continue; const r = 3.4 - 0.4 * j;
    out += solidSvg(cylinder(0, 0, r, b0, b1 - b0, P, 22, 0.3), { tone: "mid", crease: "none" });
    if (j > 0) out += '<path class="iso-line" data-tone="faint" d="' + ring(0, 0, r + 0.02, Math.min(b1 - 1.2, b0 + 3), P, 22) + '"/>';
  }
  return out;
}
const TAU = Math.PI * 2, angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
// pages qui flottent : sept feuilles sur la mer, dont la houle les fait danser doucement
const SEA = Array.from({ length: 7 }, (_, i) => ({ th: -0.3 + i * 0.9 + (i % 2) * 0.2, r: 90 + (i * 5) % 3 * 10 + (i % 2) * 4, rot: hash(i) * 3, fr: [0, 1, 2].map((q) => [hash(i * 5 + q) * 8 - 4, hash(i * 7 + q + 3) * 5 - 2.5, 3 + hash(i + q) * 2.5, 2 + hash(i * 3 + q) * 1.5]) }));
function seaMarkup(s, o) {
  let out = "", fx = "";
  const phi = o.phi, w = 24, d = 17;
  SEA.forEach((g, i) => {
    const th = g.th + Math.sin(s * 0.16 + i) * 0.05, bob = 0.6 + 0.5 * Math.sin(s * 1.2 + i * 1.3), ca = Math.cos(g.rot + s * 0.08 * (i % 2 ? 1 : -1)), sa = Math.sin(g.rot + s * 0.08 * (i % 2 ? 1 : -1));
    const [cx, cy] = w3(g.r * Math.cos(th), g.r * Math.sin(th), 0);
    const loc = (x, y) => [cx + ca * x - sa * y, cy + sa * x + ca * y];
    const ringp = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, y]) => loc(x, y));
    out += solidSvg(extrude(ringp, bob, 0.8, P, { bevel: 0.15 }), { tone: "hi", crease: "none" });
    const lines = [-4.4, -1.4, 1.6, 4.6].map((y) => pathOf([iso([...loc(-9.5, y), bob + 0.8], P), iso([...loc(3, y), bob + 0.8], P)])).join("");
    out += '<path class="iso-line" data-tone="lo" data-free="" d="' + lines + '"/>';
    if (phi !== null) {
      const since = ((angDiff(phi, th) % TAU) + TAU) % TAU / 1.5;
      const near = Math.abs(angDiff(phi, th)) < 0.18;
      const age = near ? 0 : (angDiff(phi, th) > 0 ? since : 9);
      if (age < 1.5) g.fr.forEach(([fx0, fy0, fw, fh], q) => {
        const u = ease(seg(age, q * 0.15, q * 0.15 + 0.3)) * (1 - ease(seg(age, 1.0, 1.5)));
        if (u <= 0.02) return;
        const a0 = loc(fx0 - fw / 2 * u, fy0 - fh / 2 * u), b0 = loc(fx0 + fw / 2 * u, fy0 - fh / 2 * u), c0 = loc(fx0 + fw / 2 * u, fy0 + fh / 2 * u), d0 = loc(fx0 - fw / 2 * u, fy0 + fh / 2 * u);
        fx += lineFx(pathOf([a0, b0, c0, d0].map((p) => iso([p[0], p[1], bob + 0.9], P)), true), 1.1, u);
      });
    }
  });
  return { out, fx };
}
function beamFx(o, s) {
  if (o.beamA <= 0.01 || o.phi === null) return { back: "", front: "" };
  const phi = o.phi, d = 0.24, zc = TOPLANT + LENSC;
  const ptAt = (r, a, z) => iso(w3(r * Math.cos(a), r * Math.sin(a), z), P);
  const origin = ptAt(36, phi, zc), a = ptAt(112, phi - d, 0.8), b = ptAt(112, phi + d, 0.8), a2 = ptAt(64, phi - d * 0.7, 0.8), b2 = ptAt(64, phi + d * 0.7, 0.8);
  const cone = '<path class="fx-cone" style="opacity:' + o.beamA.toFixed(2) + '" d="' + pathOf([origin, a, b], true) + '"/>';
  const sector = '<path class="fx-lit" style="opacity:' + (0.5 * o.beamA).toFixed(2) + '" d="' + pathOf([a2, a, b, b2], true) + '"/>';
  const edges = lineFx(pathOf([origin, a]), 0.9, 0.5 * o.beamA) + lineFx(pathOf([origin, b]), 0.9, 0.5 * o.beamA);
  const s1 = cone + sector + edges, back = Math.sin(phi) > 0;
  return { back: back ? s1 : "", front: back ? "" : s1 };
}
function fxSvg(o, s) {
  let out = "";
  const z0 = o.lift;
  // 0 : le faisceau de lecture balaie la page, les champs lus s'entourent d'un cadre
  if (o.scan) {
    const lz = ZFl(0) + 7.2, u = o.headU, tz = ZFl(0) + PZ + 0.8;
    out += '<path class="fx-cone" d="' + pathOf([pr(u, 0, lz), pr(u, -6.4, tz), pr(u, 6.4, tz)], true) + '"/>' + lineFx(pathOf([pr(u, -6.4, tz), pr(u, 6.4, tz)]), 1.2, 0.95);
  }
  o.read.forEach((a, k2) => { if (a > 0.02) out += lineFx(rectUBpath(FU[k2] - 1.8, FB[0] - 0.2, FU[k2] + 1.8, FB[1] + 0.2, ZFl(0) + PZ + 0.82), 1.1, a); });
  // 1 : un anneau marque l'arrivée de chaque jeton dans son empreinte
  o.drop.forEach((f, q) => { if (f >= 0) out += lineFx(ringAt(HOLES[q], HB, 2.4 + f * 5, ZFl(1) + TRAY_H + 0.1, 24), 1, 1 - f); });
  // 3 : onde d'encre à chaque coup de tampon
  o.hitStamp.forEach((h) => { const u = h.age / 0.7, z3 = ZFl(3) + PZ + 0.9; out += lineFx(ringAt(FU[h.n], -1.7, 3 + u * 9, z3, 28), 1.3, 1 - u) + lineFx(ringAt(FU[h.n], -1.7, 2 + u * 5, z3, 24), 0.8, (1 - u) * 0.7); });
  // 5 : à chaque frappe, une onde et des étincelles ; à la dernière, un éclair de lentille
  if (o.hitRam >= 0) {
    const u = o.hitRam / 0.9, z5 = ZFl(5) + PZ + 0.1;
    out += lineFx(ringAt(0, 0, 8 + u * 18, z5, 36), 1.4, 1 - u);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + hash(i) * 0.5, r0 = 8 + u * 8, r1 = r0 + 3 + hash(i + 9) * 4, zz = z5 + 1 + u * 8 * (0.5 + hash(i + 3)); out += lineFx(pathOf([pr(Math.cos(a) * r0, Math.sin(a) * r0, zz), pr(Math.cos(a) * r1, Math.sin(a) * r1, zz + 2)]), 0.9, 1 - u); }
  }
  if (o.flash >= 0) { const u = o.flash; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r0 = 9 + u * 5, r1 = r0 + 6 + 8 * hash(i); out += lineFx(pathOf([pr(Math.cos(a) * r0, Math.sin(a) * r0, ZFl(5) + PZ + 9), pr(Math.cos(a) * r1, Math.sin(a) * r1, ZFl(5) + PZ + 9 + 4 * Math.sin(a))]), 1, 1 - u); } }
  return out;
}
function draw(o, s) {
  const zf = o.lift;
  parts.platform.setAttribute("transform", dUB(0, 0, zf));
  parts.mast.innerHTML = mastMarkup(zf);
  // la page, les jetons, la fiche, le lot, la lentille
  parts.page.setAttribute("transform", dUB(0, o.pageB, 0)); parts.page.setAttribute("opacity", o.pageA.toFixed(2));
  inks.forEach((g, i) => g.setAttribute("opacity", o.ink[i].toFixed(2)));
  parts.chips.innerHTML = o.chips.map((c) => '<g transform="' + dUB(c.x, c.y, c.z) + '" opacity="' + c.a.toFixed(2) + '">' + CHIPS[c.q] + "</g>").join("");
  parts.card.setAttribute("opacity", o.cardA);
  parts["card-txt"].setAttribute("transform", dUB(0, 0, 2.2 * o.spread)); parts["card-pos"].setAttribute("transform", dUB(0, 0, 4.4 * o.spread));
  parts.crate.setAttribute("opacity", o.crateA);
  parts.lens.setAttribute("opacity", o.lensA.toFixed(2));
  parts.biglens.setAttribute("opacity", o.bigA.toFixed(2)); parts.biglens.setAttribute("transform", dUB(0, 0, -5 * (1 - o.bigA)));
  // 0 : tête de lecture
  parts.head.setAttribute("transform", dUB(o.headU, 0, 0)); parts["lamp-read"].dataset.on = String(o.lampRead);
  // 1 : voyants du plateau
  sortLamps.forEach((l, i) => { l.dataset.on = String(o.sorted[i] === 1); });
  // 2 : clés, voyant, verrou
  parts["key-n"].setAttribute("transform", dUB(-14, lerp(8, 20.2, o.keyN), ZFl(2) + 7.6));
  parts["key-r"].setAttribute("transform", dUB(14, lerp(8, 20.2, o.keyR), ZFl(2) + 7.6));
  parts["lamp-lock"].dataset.on = String(o.lampLock === 1);
  parts.gate.setAttribute("transform", dUB(31 * o.gate, 0, 0));
  // 3 : tampon, ressort
  parts.shead.setAttribute("transform", dUB(o.stU, 0, 0));
  const dz = 3.2 * o.press, z3 = ZFl(3);
  parts.splow.setAttribute("transform", dUB(0, 0, -dz));
  const spr = vcoil(0, 0, z3 + 24.6, z3 + 29.6 - dz, 2.3, 5);
  const ntal = o.ink.filter((v) => v > 0.5).length; if (parts.tally.textContent !== ntal + "/4") parts.tally.textContent = ntal + "/4";
  parts.sspring.innerHTML = '<path class="iso-line" data-tone="faint" d="' + spr.back + '"/><path class="iso-line" data-tone="mid" d="' + spr.front + '"/>';
  // 4 : classeur, couvercle, vol de la fiche et du lot
  cardEls.forEach((g, i) => { const v = i < o.nCards ? "1" : "0"; if (g.getAttribute("opacity") !== v) g.setAttribute("opacity", v); });
  const cnt = String(o.nCards).padStart(2, "0"); if (parts.count.textContent !== cnt) parts.count.textContent = cnt;
  parts.lid.setAttribute("opacity", o.lid.toFixed(2)); parts.lid.setAttribute("transform", dUB(0, 0, 9 * (1 - o.lid)));
  if (o.cardFly) { parts.cardfly.setAttribute("opacity", "1"); parts.cardfly.setAttribute("transform", dUB(o.cardFly.u, o.cardFly.b, ZFl(4) + o.cardFly.z)); } else parts.cardfly.setAttribute("opacity", "0");
  if (o.crateFly) { parts.crateflight.setAttribute("opacity", o.crateFly.a.toFixed(2)); parts.crateflight.setAttribute("transform", dUB(o.crateFly.u, o.crateFly.b, ZFl(4) + o.crateFly.z)); } else parts.crateflight.setAttribute("opacity", "0");
  // 5 : presse, cadran
  parts.ram.setAttribute("transform", dUB(0, 0, -4.7 * o.ram)); parts["lamp-press"].dataset.on = String(o.lampPress === 1);
  const na = (150 - 120 * (1 - o.loss) / 0.86) * Math.PI / 180, z5 = ZFl(5) + 26.2, cx = -17;
  parts.needle.innerHTML = '<path class="iso-line" data-tone="hi" d="' + pathOf([pr(cx, 1.78, z5), pr(cx + 2.9 * Math.cos(na), 1.78, z5 + 2.9 * Math.sin(na))]) + '"/>' + dotsSvg([pr(cx, 1.78, z5)], { size: 0.5, tone: "hi" });
  // 6 : colonnes, goupille, levier
  const z6 = ZFl(6);
  let fk = "";
  COLS.forEach((c, i) => {
    const h = 4 + (o.colV[i] - 0.5) / 0.5 * 21;
    fk += solidSvg(cylinder(...w3(c.u, 11, 0).slice(0, 2), 3.6, z6 + h - 1, 2.2, P, 20, 0.2), { tone: "hi", lit: true }) + bar(c.u, 11, c.u > 0 ? 8.2 : -8.2, 2.4, 1.5, z6 + h - 0.6, 1.2, "mid");
    forkLamps[i].dataset.on = String(o.forkOn[i] === 1);
  });
  parts.forks.innerHTML = fk;
  parts.pin.setAttribute("transform", dUB(0, 0, 10.4 * o.pin));
  const ang = lerp(Math.atan2(16.2 - 27, 12), Math.atan2(-14, -9), o.pull), px = 0, py = 27, Lh = 16.1;
  const tx = px + Lh * Math.cos(ang), ty = py + Lh * Math.sin(ang);
  parts.lever.innerHTML = bar(px, py, tx, ty, 3.2, z6 + 10.4, 2.2, "mid") + solidSvg(cylinder(...w3(tx, ty, 0).slice(0, 2), 2.3, z6 + 12.6, 3, P, 20), { tone: "hi", lit: true }) + solidSvg(cylinder(...w3(px, py, 0).slice(0, 2), 1.5, z6 + 12.6, 0.9, P, 16), { tone: "lo" });
  parts["lamp-pub"].dataset.on = String(o.lampPub === 1);
  // 7 : lentille qui tourne
  let spin = "";
  if (o.bigA > 0.05) {
    const V = towardViewer(P), ang0 = o.spin, zl = LENSC, R = 13.1;
    for (let q = 0; q < 22; q++) { const a = ang0 + q / 22 * TAU, f = Math.cos(a) * V[0] + Math.sin(a) * V[1]; if (f < 0.2) continue; spin += '<path class="iso-line" data-tone="lo" d="' + pathOf([iso([R * Math.cos(a), R * Math.sin(a), PZ + 5.2], P), iso([R * Math.cos(a), R * Math.sin(a), PZ + 25.8], P)]) + '"/>'; }
    for (const a of [ang0, ang0 + Math.PI]) {
      const f = Math.cos(a) * V[0] + Math.sin(a) * V[1]; if (f < 0.15) continue;
      const circ = (r) => pathOf(Array.from({ length: 28 }, (_, i) => { const b = i / 28 * TAU; return iso([R * Math.cos(a) - Math.sin(a) * r * Math.cos(b), R * Math.sin(a) + Math.cos(a) * r * Math.cos(b), zl + r * Math.sin(b)], P); }), true);
      spin += '<path class="iso-fill fig-window" d="' + circ(6.4) + '"/><path class="iso-line" data-tone="hi" d="' + circ(6.4) + '"/><path class="iso-line" data-tone="mid" d="' + circ(3.8) + '"/>';
    }
  }
  parts["lens-spin"].innerHTML = spin;
  // mer, faisceau, effets
  const sm = seaMarkup(s, o), bf = beamFx(o, s);
  parts.seapages.innerHTML = sm.out;
  beamBack.innerHTML = bf.back;
  fxLayer.innerHTML = bf.front + fxSvg(o, s) + sm.fx;
}
function reading(s) {
  const i = stationAt(s), [name, status] = STATIONS[Math.min(i, 7)];
  return (i + 1) + " · " + name + " · " + status;
}
const run = loop((dt, calm) => {
  if (frozen) return;
  if (touring) { t = calm ? Ts[7] + 5 : t + dt; if (t >= TEND) t = 0; }
  const o = stateAt(t); draw(o, t); say(reading(t));
});
const jump = (i) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 9000); t = Ts[(i + 8) % 8] + 3.2; run(); };
dragX(() => stationAt(t), (v, share) => { const n = (Math.round(v + share * 8) % 8 + 8) % 8; if (n !== stationAt(t)) jump(n); });
stage.addEventListener("keydown", (e) => {
  const i = stationAt(t);
  if (e.key === "ArrowRight") { e.preventDefault(); jump(i + 1); }
  if (e.key === "ArrowLeft") { e.preventDefault(); jump(i - 1); }
});
window.__fig = { at: (s) => { touring = false; frozen = true; t = s; const o = stateAt(s); draw(o, s); say(reading(s)); return reading(s); }, Ts };
draw(stateAt(0), 0); say(reading(0));
`;

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un phare en coupe : huit étages autour d'un monte-charge central. Une page monte d'étage en étage : lecture par une tête optique, tri en quatre catégories, serrure à deux clés, tampon à main, fichier du corpus, presse d'entraînement qui en tire une lentille, mesure et publication, puis la lentille tourne dans la lanterne et balaie la mer. À gauche, une tour plus petite : l'extracteur VRE, 2,3 fois moins haut que VRE Studio.",
  body: bodyParts,
});
const plate = k.plateHtml({
  fig: "Fig 11", title: "VRE Studio", hint: "Glisse ou ← → : étage", readout: "1 · Lecture · Document AI",
  keys: [
    { mark: "raised", label: "Le monte-charge : la page, puis la fiche, puis le lot, puis la lentille" },
    { mark: "flat", label: "Chaque étage est une brique de la chaîne, tout fonctionne" },
    { mark: "lit", label: "Ce qui vient d'agir : tête, clé, tampon, presse, faisceau" },
  ],
  caption: "Un phare en coupe, huit étages autour d'un monte-charge. Une page sort de la trémie : une tête optique lit ses quatre champs (Document AI), un plateau à empreintes les trie par catégorie (mini-BERT), deux clés, celle du modèle et celle des règles métiers, ouvrent ensemble le verrou (hybride neuro-symbolique), un tampon à main valide chaque cadre (Human-in-the-Loop), puis la page devient une fiche à trois feuillets, image, texte et positions, rangée dans le classeur du corpus multimodal. Le lot scellé entre sous la presse : trois frappes d'entraînement (LayoutLMv3) en font sortir une lentille, deux colonnes la mesurent et un levier la publie. Dans la lanterne, la lentille tourne : son faisceau balaie la mer et propose des cadres sur les pages qui flottent (inférence). À gauche, la tour de l'extracteur VRE : VRE Studio en est l'évolution et fait gagner 2,3 fois plus de temps. Les seuils de mesure et les cadres sont des valeurs d'illustration.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="VRE Studio : flèches gauche et droite pour passer d'un étage à l'autre" aria-valuemin="0" aria-valuemax="7" aria-valuenow="0">${svg}</div>`,
});
writeFigure("vrestudio", { title: "VRE Studio · le phare", plate, live, width: 760, css: "<style>.fig-band{fill:var(--anatomy-lo);opacity:.7}.fig-deck{fill:var(--anatomy-lo);opacity:.3}.fig-slot{fill:var(--anatomy-lo)}.fig-dark{fill:var(--anatomy-lo);opacity:.55}.fig-ink{fill:var(--anatomy-lit);opacity:.14}.fx{pointer-events:none}.fx-line{fill:none;stroke:var(--g,#34d399);stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 2.5px var(--g,#34d399))}.fx-cone{fill:url(#scan-grad);stroke:none}.fx-lit{fill:var(--g,#34d399);stroke:none}</style>" });

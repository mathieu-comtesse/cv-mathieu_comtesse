// Fig 11 · VRE Studio : la chaîne documentaire complète, du PDF au modèle publié, avec ce qui n'est pas encore branché.
// node figures/build-vrestudio.mjs  →  figures/vrestudio.html
// Un circuit de tapis en U. Dos du circuit : ce qui est intégré et tourne (lecture, tri sémantique, serrure à deux clés,
// relecture au tampon, fichier du corpus). Face du circuit : ce qui est développé mais pas encore éprouvé ou branché
// (presse d'entraînement essayée à vide sur une plaque factice, colonnes de mesure débranchées, levier verrouillé,
// table d'inférence hors circuit, tapis de retour absent). À gauche, la balance du gain : 2,3 fois l'extracteur VRE.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 860, HEIGHT = 500;
const PLATE = { x: -214, y: -110, w: 440, d: 220, r: 10 };
const BT = 7;                                                  // dessus des tapis
const YB = -66, YF = 66;                                       // axes du tapis du dos et du tapis de face
// circuit en U : dos (+x), premier coude, montée (+y), second coude, face (-x). Rayon de l'axe des coudes : RC.
const RC = 40, XB = 140, BW = 28;
const C1 = [XB, YB + RC], C2 = [XB, YF - RC];
const L0 = XB + 196, LA = (Math.PI / 2) * RC, LV = YF - YB - 2 * RC, LF = XB + 112, LT = L0 + LA + LV + LA + LF;
function pose(s) {
  if (s < L0) return { x: -196 + s, y: YB, h: 0 };
  s -= L0;
  if (s < LA) { const a = -Math.PI / 2 + s / RC; return { x: C1[0] + RC * Math.cos(a), y: C1[1] + RC * Math.sin(a), h: a + Math.PI / 2 }; }
  s -= LA;
  if (s < LV) return { x: XB + RC, y: C1[1] + s, h: Math.PI / 2 };
  s -= LV;
  if (s < LA) { const a = s / RC; return { x: C2[0] + RC * Math.cos(a), y: C2[1] + RC * Math.sin(a), h: a + Math.PI / 2 }; }
  s -= LA;
  return { x: XB - s, y: YF, h: Math.PI };
}

// ---- page : quatre champs
const PAGE = { w: 64, d: 22 }, FOFF = [-24, -8, 8, 24], FW = 11, FD = 12;
const fieldPlan = (i, y = YB) => ({ x: FOFF[i] - FW / 2, y: y - FD / 2, w: FW, d: FD, r: 1.5 });
// ---- S1 lecture, S2 tri, S3 serrure
const READ_X = -140;
const SORT = { x: -156, y: -34, w: 60, d: 22, r: 3 }, SORT_H = 10, HOLE_X = [-143, -129, -115, -101], HOLE_Y = -23;
const SHAPES = [["hex", 4.8], ["square", 7.8], ["circle", 4.3], ["tri", 5.2]];
const BAR_X = -72, LOCK = { x: -90, y: -34, w: 26, d: 20, r: 2.5 }, LOCK_H = 5, BAR_LIFT = 14;
// ---- S4 tampon
const PAD_X = 0, ARM_Z = 36, ARM_TOP = 42, PZ_UP = 26, PAD = { x: -6.5, y: YB - 6.5, w: 13, d: 13, r: 1.5 };
// ---- S5 fichier du corpus
const SLOTS = 10, TRAY = { x: 78, y: -46, w: 62, d: 34, r: 3 }, TRAY_H = 12, WALL = 3, PITCH = 5, SLOT0 = 86;
const CARD = { d: 22, h: 17, z: 2 }, EXIT_X = 109;
const slotX = (i) => SLOT0 + i * PITCH;
// ---- S6 presse
const PRESS = { x: 128 }, RAM_UP = 18, RAM_DOWN = BT + 2.2, CROWN_Z = 44;
// ---- S7 colonnes de mesure
const COLS = [{ x: 10, y: 12, th: 0.75, wy: -16 }, { x: 38, y: 12, th: 0.9, wy: -20 }];
const Z0 = 10, ZSPAN = 38, COLLAR_H = 5, FORK_X = 7.5;
const forkZ = (th) => Z0 + COLLAR_H + ZSPAN * th;
// ---- S8 levier
const PIV = [-68, 16], BAR_L = 34, BAR_W = 6, HOLE_R = 28;
const ANG = { rest: Math.PI, act: (105 * Math.PI) / 180 };
const HOLE = [PIV[0] + Math.cos(ANG.rest) * HOLE_R, PIV[1] + Math.sin(ANG.rest) * HOLE_R];
const BARZ = 6, BARH = 3, BRACKET = { x: HOLE[0] - 3, y: -22, w: 6, d: 8, r: 1 };
// ---- S9 inférence hors circuit, S10 balance
const INF = { x: -92 }, BAL = { x: -140, y: 2 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [READ_X, -92, 48], [PRESS.x, 40, 64], [COLS[1].x + 10, COLS[1].y, 66], [BAL.x, BAL.y, 60], [INF.x, 90, 50]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 39 },
);
const { at, S, L, D, slab, front, right, flat } = tools(P);
const ink = (d, w = 1.5) => `<path class="iso-line" data-tone="hi" d="${d}" style="stroke-width:${w}"/>`;
const ngon = (cx, cy, r, n, rot = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(rot + (i / n) * Math.PI * 2), cy + r * Math.sin(rot + (i / n) * Math.PI * 2)]);
const ringOfShape = (i, cx, cy, s = 1) => {
  const [name, r] = SHAPES[i];
  if (name === "hex") return ngon(cx, cy, r * s, 6, Math.PI / 6);
  if (name === "tri") return ngon(cx, cy, r * s, 3, -Math.PI / 2);
  if (name === "circle") return ngon(cx, cy, r * s, 24);
  return [[cx - (r * s) / 2, cy - (r * s) / 2], [cx + (r * s) / 2, cy - (r * s) / 2], [cx + (r * s) / 2, cy + (r * s) / 2], [cx - (r * s) / 2, cy + (r * s) / 2]];
};
const rot2 = (pts, [cx, cy], a) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);

// ---------------------------------------------------------------- tapis
// Un seul tapis en U : pieds, profilés latéraux boulonnés, bande de caoutchouc à chevrons, rouleaux d'extrémité, coudes en arc.
const CLEAT = 12, BELT_Z = 4, HW = BW / 2;
const sector = (c, r0, r1, a0, a1, n = 28) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([c[0] + r1 * Math.cos(a), c[1] + r1 * Math.sin(a)]); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / n); pts.push([c[0] + r0 * Math.cos(a), c[1] + r0 * Math.sin(a)]); }
  return pts;
};
const ARC1 = [-Math.PI / 2, 0], ARC2 = [0, Math.PI / 2];
function frameRail(plan, tone = "mid") {
  const out = [S(slab({ r: 0.7, ...plan }, BT, 4, 2, 0.3), { tone, crease: "none" })];
  const long = plan.w > plan.d, n = Math.floor((long ? plan.w : plan.d) / 24), dots = [];
  for (let i = 0; i <= n; i++) { const o = Math.min(6 + i * 24, (long ? plan.w : plan.d) - 4); dots.push(long ? at([plan.x + o, plan.y + plan.d / 2, BT + 4]) : at([plan.x + plan.w / 2, plan.y + o, BT + 4])); }
  out.push(D(dots, { size: 0.34, tone: "lo" }));
  return out.join("");
}
function arcRail(c, r0, r1, [a0, a1]) {
  const out = [S(k.extrude(sector(c, r0, r1, a0, a1), BT, 4, P, { bevel: 0.3, convex: false }), { tone: "mid", crease: "none" })], dots = [];
  for (let i = 0; i <= 4; i++) { const a = a0 + (a1 - a0) * (0.06 + 0.88 * i / 4), r = (r0 + r1) / 2; dots.push(at([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), BT + 4])); }
  out.push(D(dots, { size: 0.34, tone: "lo" }));
  return out.join("");
}
function rollerY(x, y0, y1, r = 3.5) {
  const F = G.frameAlong([x, y0, BT - r], [0, 1, 0]);
  return S(G.disc(0, y1 - y0, r, F, P), { tone: "mid", inner: L(G.ribsOf(F, 0, y1 - y0, r, 14, P), { tone: "faint" }) });
}
function legsX(y0, y1, step, from, to) {
  const out = [];
  for (let x = from; x <= to; x += step) {
    out.push(S(slab({ x: x - 3, y: y0 - 5, w: 6, d: 4, r: 0.8 }, 0, 4, 2, 0.2), { tone: "lo", crease: "none" }));
    out.push(S(slab({ x: x - 3, y: y1 + 1, w: 6, d: 4, r: 0.8 }, 0, 4, 2, 0.2), { tone: "lo", crease: "none" }));
    out.push(S(slab({ x: x - 1.6, y: y0 - 3, w: 3.2, d: y1 - y0 + 6, r: 0.6 }, 1.6, 2.2, 2, 0.2), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}
function legsArc(c, [a0, a1]) {
  const out = [];
  for (let i = 0; i <= 3; i++) {
    const a = a0 + (a1 - a0) * (0.1 + 0.8 * i / 3);
    for (const r of [RC - HW - 5, RC + HW + 3]) out.push(S(k.cylinder(c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), 2.2, 0, 4, P, 14), { tone: "lo", crease: "none" }));
    const r0 = RC - HW - 3, r1 = RC + HW + 3;
    out.push(S(k.extrude(rot2([[c[0] + r0, c[1] - 1.4], [c[0] + r1, c[1] - 1.4], [c[0] + r1, c[1] + 1.4], [c[0] + r0, c[1] + 1.4]], c, a), 1.6, 2.2, P, { bevel: 0.2 }), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}
function radialRollers(c, [a0, a1]) {
  const d = [];
  for (let i = 1; i < 12; i++) { const a = a0 + (a1 - a0) * (i / 12); d.push(k.lineOnTop([c[0] + (RC - HW) * Math.cos(a), c[1] + (RC - HW) * Math.sin(a)], [c[0] + (RC + HW) * Math.cos(a), c[1] + (RC + HW) * Math.sin(a)], BT, P)); }
  return L(d.join(""), { tone: "faint" });
}
function motorY(x, y0, dir) {
  const out = [], F = G.frameAlong([x, y0, BT - 3.5], [0, dir, 0]);
  out.push(S(G.disc(0, 2.4, 1.8, F, P), { tone: "hi", crease: "none" }));
  out.push(S(G.disc(2.4, 15, 6.2, F, P), { tone: "mid", inner: L(G.ribsOf(F, 2.4, 15, 6.2, 22, P), { tone: "faint" }) }));
  out.push(S(G.disc(15, 18, 4.6, F, P), { tone: "lo" }));
  out.push(S(slab({ x: x - 3.6, y: dir > 0 ? y0 + 6 : y0 - 12, w: 7.2, d: 6, r: 1 }, BT + 2.4, 3.6, 2, 0.3), { tone: "mid" }));
  return out.join("");
}
function motorX(x0, y) {                                              // moteur de la montée : axe en x, vers l'extérieur du circuit
  const out = [], F = G.frameAlong([x0, y, BT - 3.5], [1, 0, 0]);
  out.push(S(G.disc(0, 2.4, 1.8, F, P), { tone: "hi", crease: "none" }));
  out.push(S(G.disc(2.4, 15, 6.2, F, P), { tone: "mid", inner: L(G.ribsOf(F, 2.4, 15, 6.2, 22, P), { tone: "faint" }) }));
  out.push(S(G.disc(15, 18, 4.6, F, P), { tone: "lo" }));
  out.push(S(slab({ x: x0 + 6, y: y - 3.6, w: 6, d: 7.2, r: 1 }, BT + 2.4, 3.6, 2, 0.3), { tone: "mid" }));
  return out.join("");
}
function beltsSvg() {
  const out = [], X1 = XB + RC;
  // dos : profilés, bande, pieds, rouleau d'entrée
  out.push(legsX(-80, -52, 40, -176, 124));
  out.push(S(slab({ x: -196, y: -80, w: XB + 196, d: 28, r: 2 }, BELT_Z, BT - BELT_Z, 3, 0.4), { tone: "lo" }));
  out.push(frameRail({ x: -196, y: -83, w: XB + 196, d: 3 }), frameRail({ x: -196, y: -52, w: 286, d: 3 }), frameRail({ x: 128, y: -52, w: XB - 128, d: 3 }));
  out.push(rollerY(-193, -80, -52), motorY(-193, -83, -1));
  const [mx, my] = at([-193, -92, BT + 6.8]);
  out.push(`<circle class="fig-lamp" data-part="motor-b" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="1.2"/>`);
  // premier coude, montée, second coude
  out.push(legsArc(C1, ARC1), legsArc(C2, ARC2));
  out.push(S(k.extrude(sector(C1, RC - HW, RC + HW, ...ARC1), BELT_Z, BT - BELT_Z, P, { bevel: 0.4, convex: false }), { tone: "lo" }));
  out.push(S(k.extrude(sector(C2, RC - HW, RC + HW, ...ARC2), BELT_Z, BT - BELT_Z, P, { bevel: 0.4, convex: false }), { tone: "lo" }));
  out.push(S(slab({ x: X1 - HW, y: C1[1], w: BW, d: LV, r: 0 }, BELT_Z, BT - BELT_Z, 3, 0.4), { tone: "lo" }));
  for (let y = C1[1] - 4; y <= C2[1] + 4; y += 16) out.push(S(slab({ x: X1 - HW - 5, y: y - 2, w: 4, d: 4, r: 0.8 }, 0, 4, 2, 0.2), { tone: "lo", crease: "none" }), S(slab({ x: X1 + HW + 3, y: y - 2, w: 4, d: 4, r: 0.8 }, 0, 4, 2, 0.2), { tone: "lo", crease: "none" }));
  out.push(arcRail(C1, RC + HW, RC + HW + 3, ARC1), arcRail(C1, RC - HW - 3, RC - HW, ARC1), arcRail(C2, RC + HW, RC + HW + 3, ARC2), arcRail(C2, RC - HW - 3, RC - HW, ARC2));
  out.push(frameRail({ x: X1 + HW, y: C1[1], w: 3, d: LV }), frameRail({ x: X1 - HW - 3, y: C1[1], w: 3, d: LV }));
  out.push(radialRollers(C1, ARC1), radialRollers(C2, ARC2));
  out.push(L(Array.from({ length: 5 }, (_, i) => k.lineOnTop([X1 - HW, C1[1] + 6 + i * 10], [X1 + HW, C1[1] + 6 + i * 10], BT, P)).join(""), { tone: "faint" }));
  out.push(motorX(X1 + HW + 3, 0));
  const [cx, cy] = at([X1 + HW + 10, 0, BT + 6.8]);
  out.push(`<circle class="fig-lamp" data-part="motor-f" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.2"/>`);
  // face : bande, profilés, pieds, bout franc sans raccord
  out.push(legsX(52, 80, 40, -96, 124));
  out.push(S(slab({ x: -112, y: 52, w: XB + 112, d: 28, r: 2 }, BELT_Z, BT - BELT_Z, 3, 0.4), { tone: "lo" }));
  out.push(frameRail({ x: -112, y: 80, w: XB + 112, d: 3 }), frameRail({ x: -112, y: 49, w: XB + 112, d: 3 }));
  out.push(rollerY(-109, 52, 80));
  out.push(S(slab({ x: -118, y: 49, w: 6, d: 34, r: 1 }, 0, 12, 2, 0.4), { tone: "mid" }));
  out.push(D([at([-115, 56, 12]), at([-115, 76, 12])], { size: 0.45 }));
  // entrée du tapis du dos : pile de PDF
  out.push(S(slab({ x: -204, y: -83, w: 8, d: 34, r: 1 }, 0, 12, 2, 0.4), { tone: "mid" }));
  out.push(D([at([-200, -76, 12]), at([-200, -56, 12])], { size: 0.45 }));
  for (let i = 0; i < 5; i++) out.push(S(slab({ x: -190, y: YB - 10, w: 30, d: 20, r: 1 }, BT + i * 0.9, 0.8, 2, 0.1), { tone: "hi", crease: "none" }));
  return out.join("");
}

// ---------------------------------------------------------------- page
function pageSvg() {
  const out = [], plan = { x: -PAGE.w / 2, y: YB - PAGE.d / 2, w: PAGE.w, d: PAGE.d, r: 1 };
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, BT, 0.8, P)}" style="filter:blur(2px)"/>`);
  out.push(S(slab(plan, BT, 0.8, 3, 0.1), { tone: "hi", crease: "none" }));
  const rules = [];
  for (const [dy, a, b] of [[-9, -29, 24], [9, -29, 10], [9.0, 14, 29]]) rules.push(k.lineOnTop([a, YB + dy], [b, YB + dy], BT + 0.8, P));
  out.push(L(rules.join(""), { tone: "lo", free: true }));
  out.push(L(FOFF.map((_, i) => k.planOutline(fieldPlan(i), BT + 0.8, P, 2)).join(""), { tone: "mid" }));
  out.push(D(k.corners(plan, 2).map(([x, y]) => at([x, y, BT + 0.8])), { size: 0.36, tone: "lo" }));
  return out.join("");
}
const inkSvg = (i) => {
  const d = k.planOutline(fieldPlan(i), BT + 0.9, P, 2);
  return `<g data-part="ink-${i}" opacity="0"><path class="fig-ink" d="${d}"/>${ink(d, 1.6)}</g>`;
};
// ---------------------------------------------------------------- S1 : lecture (Document AI)
function readerSvg() {
  const out = [], x = READ_X;
  for (const y of [-94, -46]) {                                       // pylônes posés sur le socle, hors des profilés du tapis
    out.push(S(slab({ x: x - 6, y: y - 1, w: 12, d: 10, r: 1.5 }, 0, 2, 2, 0.3), { tone: "lo" }));
    out.push(S(slab({ x: x - 3.5, y, w: 7, d: 8, r: 1 }, 2, 40, 3, 0.4), { tone: "mid", crease: "none" }));
  }
  const beam = { x: x - 6, y: -96, w: 12, d: 60, r: 2 };
  out.push(S(slab(beam, 42, 6, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(beam, 45, P, 3), { tone: "faint" }) }));
  out.push(L(k.lineOnTop([x, -95.4], [x, -36.6], 48, P), { tone: "faint" }));
  out.push(D([at([x, -92, 48]), at([x, -40, 48])], { size: 0.42 }));
  out.push(S(k.cylinder(x, YB, 7, 34, 8, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(x, YB, 7, 34, 42, 24, P), { tone: "lo" }));
  out.push(S(k.cylinder(x, YB, 4.2, 28, 6, P, 24), { tone: "hi", lit: true }));
  const [lx, ly] = at([x + 7, YB + 0.2, 40]);
  out.push(`<circle class="fig-lamp" data-part="read-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.4"/>`);
  return out.join("");
}
// ---------------------------------------------------------------- S2 : tri sémantique (boîte à formes)
function sorterSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(SORT, 0, 4, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(SORT, 0, SORT_H, 3, 0.7), { tone: "mid", inner: L(k.sideSeam(SORT, 4, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(SORT, 2.4), SORT_H, P, 3), { tone: "faint" }));
  SHAPES.forEach((_, i) => {
    const ring = ringOfShape(i, HOLE_X[i], HOLE_Y, 1.18), d = k.onTop(ring, SORT_H, P, true);
    out.push(`<path class="iso-fill fig-slot" d="${d}"/><path class="iso-line" data-tone="mid" d="${d}"/>`);
  });
  const f = front(SORT.y + SORT.d);
  out.push(`<g transform="${f}">${HOLE_X.map((x) => `<path class="iso-line" data-tone="lo" d="${flat(x - 3, 2.6, x + 3, 5.6, 0.8, 2)}"/>`).join("")}</g>`);
  HOLE_X.forEach((x, i) => { const [lx, ly] = at([x, SORT.y + SORT.d, 4.1]); out.push(`<circle class="fig-lamp" data-part="sort-lamp-${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.15"/>`); });
  out.push(D(k.corners(SORT, 3.2).map(([x, y]) => at([x, y, SORT_H])), { size: 0.42 }));
  return out.join("");
}
const chipSvg = (i, lit) => S(k.extrude(ringOfShape(i, 0, 0), 0, 3, P, { bevel: 0.35 }), { tone: "hi", lit });
// ---------------------------------------------------------------- S3 : serrure à deux clés et barrière
function lockSvg() {
  const out = [];
  out.push(S(slab(LOCK, 0, LOCK_H, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(LOCK, 2, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(LOCK, 2), LOCK_H, P, 3), { tone: "faint" }));
  out.push(D(k.corners(LOCK, 2.6).map(([x, y]) => at([x, y, LOCK_H])), { size: 0.4 }));
  out.push(`<g transform="${front(LOCK.y + LOCK.d)}"><path class="iso-fill fig-slot" d="${flat(-81, 1.2, -73, 3.6, 0.6, 2)}"/><path class="iso-line" data-tone="lo" d="${flat(-81, 1.2, -73, 3.6, 0.6, 2)}"/></g>`);
  const [lx, ly] = at([LOCK.x + LOCK.w - 4, LOCK.y + LOCK.d - 3, LOCK_H]);
  out.push(`<circle class="fig-lamp" data-part="lock-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.5"/>`);
  return out.join("");
}
const keySvg = (rule) => rule
  ? S(slab({ x: -4, y: 0, w: 8, d: 14, r: 1 }, 1.2, 2.4, 2, 0.3), { tone: "hi" }) + S(k.cylinder(0, 15.4, 3.2, 1.2, 4.4, P, 18), { tone: "mid" }) + L(k.lineOnTop([0, 3], [0, 11], 3.6, P), { tone: "faint", free: true })
  : S(slab({ x: -14, y: -4, w: 14, d: 8, r: 1 }, 1.2, 2.4, 2, 0.3), { tone: "hi" }) + S(k.cylinder(-15.4, 0, 3.2, 1.2, 4.4, P, 18), { tone: "mid" }) + L(k.lineOnTop([-3, 0], [-11, 0], 3.6, P), { tone: "faint", free: true });
function barrierPostsSvg() {
  const out = [];
  for (const [y, face] of [[-94, 1], [-46, -1]]) {                    // émetteur et récepteur du rideau lumineux
    out.push(S(slab({ x: BAR_X - 6, y: y - 1, w: 12, d: 10, r: 1.5 }, 0, 2, 2, 0.3), { tone: "lo" }));
    out.push(S(slab({ x: BAR_X - 3, y, w: 6, d: 8, r: 1 }, 2, 30, 3, 0.4), { tone: "mid", crease: "none" }));
    out.push(S(slab({ x: BAR_X - 3.6, y: y + (face > 0 ? 6.4 : -1.6), w: 7.2, d: 3.2, r: 0.8 }, BT + 12, 6, 2, 0.3), { tone: "hi", lit: true }));
  }
  return out.join("");
}
const barrierSvg = () => S(slab({ x: BAR_X - 2, y: -80, w: 4, d: 28, r: 1 }, BT + 0.1, 5, 2, 0.4), { tone: "hi" }) + D([at([BAR_X, -76, BT + 5.1]), at([BAR_X, -56, BT + 5.1])], { size: 0.4 });
// ---------------------------------------------------------------- S4 : relecture au tampon
function stampSvg() {
  const out = [];
  out.push(S(slab({ x: -8, y: -104, w: 16, d: 12, r: 2 }, 0, 40, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: -8, y: -104, w: 16, d: 12, r: 2 }, 20, P, 3), { tone: "faint" }) }));
  out.push(D([at([-4, -98, 40]), at([4, -98, 40])], { size: 0.4 }));
  return out.join("");
}
const ARM = { x: -4.5, y: -92, w: 9, d: 36, r: 2 };
function armSvg() {
  const out = [];
  out.push(S(slab(ARM, ARM_Z, ARM_TOP - ARM_Z, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(ARM, 39, P, 3), { tone: "faint" }) }));
  out.push(L(k.lineOnTop([ARM.x + 2.4, ARM.y], [ARM.x + 2.4, ARM.y + ARM.d], ARM_TOP, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([ARM.x + ARM.w - 2.4, ARM.y], [ARM.x + ARM.w - 2.4, ARM.y + ARM.d], ARM_TOP, P), { tone: "faint" }));
  out.push(S(k.cylinder(PAD_X, YB, 3.4, ARM_TOP, 2, P, 20), { tone: "mid" }));
  return out.join("");
}
function padSvg() {
  const out = [];
  out.push(S(k.cylinder(PAD_X, YB, 1.5, PZ_UP + 3, 12, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(slab(PAD, PZ_UP, 3, 3, 0.4), { tone: "mid" }));
  out.push(S(slab(k.insetPlan(PAD, 0.8), PZ_UP - 0.8, 0.8, 3, 0.1), { tone: "hi", lit: true }));
  out.push(D([at([PAD.x + 2, PAD.y + 2, PZ_UP + 3]), at([PAD.x + PAD.w - 2, PAD.y + PAD.d - 2, PZ_UP + 3])], { size: 0.38 }));
  return out.join("");
}
const KNOB_Z = 58, KNOB_H = 4;
function knobSvg() {
  const out = [];
  out.push(S(k.cylinder(PAD_X, YB, 4.8, KNOB_Z, KNOB_H, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(PAD_X, YB, 4.8, KNOB_Z, KNOB_Z + KNOB_H, 24, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([PAD_X, YB], [PAD_X + 3.8, YB], KNOB_Z + KNOB_H, P), { tone: "hi" }));
  return out.join("");
}
// ---------------------------------------------------------------- S5 : fichier du corpus multimodal
function trayBack() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 3, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(TRAY, 0, 2, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: WALL, r: 1 }, 2, TRAY_H - 2, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: TRAY.x, y: TRAY.y, w: WALL, d: TRAY.d, r: 1 }, 2, TRAY_H - 2, 2, 0.4), { tone: "mid" }));
  return out.join("");
}
// une fiche = trois feuillets : image, texte, positions
function cardSvg(lit) {
  const plate = (x0, tone, l) => S(slab({ x: x0, y: -CARD.d / 2, w: 0.9, d: CARD.d, r: 0.3 }, 0, CARD.h, 2, 0.15), { tone, crease: "none", lit: l });
  return plate(-1.5, "mid", false) + plate(-0.3, "hi", false) + plate(0.9, "hi", lit);
}
function trayFront() {
  const out = [], yF = TRAY.y + TRAY.d;
  out.push(S(slab({ x: TRAY.x, y: yF - WALL, w: TRAY.w, d: WALL, r: 1 }, 2, TRAY_H - 2, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: TRAY.x + TRAY.w - WALL, y: TRAY.y, w: WALL, d: TRAY.d, r: 1 }, 2, TRAY_H - 2, 2, 0.4), { tone: "mid" }));
  out.push(L(k.lineOnTop([TRAY.x + 0.9, yF - WALL / 2], [TRAY.x + TRAY.w - 0.9, yF - WALL / 2], TRAY_H, P), { tone: "faint" }));
  const cx = TRAY.x + TRAY.w / 2;
  out.push(S(slab({ x: cx - 13, y: yF, w: 26, d: 1, r: 0.6 }, 2, 8, 2, 0.2), { tone: "lo", crease: "none" }));
  out.push(display(front(yF + 1), flat(cx - 10, 3.2, cx + 10, 8.8, 1), { part: "count", x: cx, y: -4.3, size: 4.6, text: "00" }));
  out.push(D(k.corners({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: TRAY.d }, 1.5).map(([x, y]) => at([x, y, TRAY_H])), { size: 0.4 }));
  return out.join("");
}
const sealSvg = () => {
  const out = [], x0 = SLOT0 - 3, w = SLOTS * PITCH + 2, z = CARD.z + CARD.h;
  out.push(S(slab({ x: x0, y: TRAY.y + 15, w, d: 3.2, r: 0.6 }, z, 0.8, 2, 0.1), { tone: "lo", crease: "none" }));
  out.push(S(k.cylinder(x0 + w / 2, TRAY.y + 16.6, 3.2, z + 0.8, 1.4, P, 20), { tone: "hi", lit: true }));
  return out.join("");
};
// ---------------------------------------------------------------- S6 : presse d'entraînement LayoutLMv3 (essai à vide)
function pressSvg() {
  const out = [], x = PRESS.x;
  for (const y of [38, 90]) {
    out.push(S(slab({ x: x - 7, y: y - 1, w: 14, d: 10, r: 1.5 }, 0, 2, 2, 0.3), { tone: "lo" }));
    out.push(S(slab({ x: x - 4, y, w: 8, d: 8, r: 1 }, 2, CROWN_Z - 2, 3, 0.4), { tone: "mid", crease: "none" }));
  }
  const crown = { x: x - 6, y: 36, w: 12, d: 64, r: 2 };
  out.push(S(k.cylinder(x, YF, 5.6, CROWN_Z - 8, 8, P, 24), { tone: "mid", crease: "none" }));
  out.push(S(slab(crown, CROWN_Z, 8, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(crown, CROWN_Z + 4, P, 3), { tone: "faint" }) }));
  out.push(L(k.lineOnTop([x, 36.6], [x, 99.4], CROWN_Z + 8, P), { tone: "faint" }));
  out.push(D([at([x, 40, CROWN_Z + 8]), at([x, 96, CROWN_Z + 8])], { size: 0.42 }));
  // trois trémies : texte, positions, image
  for (const y of [50, 68, 86]) {
    const F = G.frameAlong([x, y, CROWN_Z + 8], [0, 0, 1]);
    out.push(S(G.solidOf([[0, 3.4], [3, 3.4], [14, 8.6], [15.4, 8.9]], F, P), { tone: "mid", inner: L(G.arcOf(F, 8, 6, P), { tone: "faint" }) }));
  }
  const [lx, ly] = at([x + 6, 96, CROWN_Z - 4]);
  out.push(`<circle class="fig-lamp" data-part="press-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.4"/>`);
  return out.join("");
}
const ramSvg = () => S(k.cylinder(PRESS.x, YF, 3.6, RAM_UP + 3, 26, P, 24), { tone: "mid", crease: "none" }) + S(k.cylinder(PRESS.x, YF, 8, RAM_UP, 3, P, 28, 0.3), { tone: "mid" }) + S(k.cylinder(PRESS.x, YF, 6.4, RAM_UP - 0.8, 0.8, P, 28), { tone: "hi", lit: true });
const plateSvg = () => `<path class="iso-halo" d="${k.haloOf({ x: -12, y: YF - 8, w: 24, d: 16, r: 1.6 }, BT, 2, P)}" style="filter:blur(2px)"/>` + S(slab({ x: -12, y: YF - 8, w: 24, d: 16, r: 1.6 }, BT, 2, 3, 0.3), { tone: "lo" }) + L(k.lineOnTop([-10, YF], [10, YF], BT + 2, P), { tone: "faint" }) + D([at([-9, YF - 5.6, BT + 2]), at([9, YF + 5.6, BT + 2])], { size: 0.36 });
function tagSvg() {
  const x = PRESS.x + 6, out = [];
  out.push(S(slab({ x, y: 56, w: 0.8, d: 14, r: 1 }, 24, 14, 2, 0.1), { tone: "hi", crease: "none" }));
  out.push(L(k.segment([x + 0.4, 63, 38], [x + 0.4, 63, CROWN_Z], P), { tone: "mid" }));
  out.push(D([at([x + 0.4, 63, 38]), at([x + 0.4, 63, CROWN_Z])], { size: 0.5, tone: "hi" }));
  out.push(`<g transform="${right(x + 0.8)}"><text class="iso-face-text" data-tone="mid" x="-63" y="-37" font-size="3.4" text-anchor="middle" letter-spacing=".08em">FACTICE</text></g>`);
  return out.join("");
}
// ---------------------------------------------------------------- S7 : colonnes de mesure, fourches, prises débranchées
function columnBase(c) {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: c.x - 9, y: c.y - 9, w: 18, d: 18, r: 3 }, 0, 4, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab({ x: c.x - 8, y: c.y - 8, w: 16, d: 16, r: 2.5 }, 0, 6, 4, 0.7), { tone: "mid" }));
  out.push(D(k.corners({ x: c.x - 8, y: c.y - 8, w: 16, d: 16 }, 2).map(([x, y]) => at([x, y, 6])), { size: 0.4 }));
  const pillar = { x: c.x - 3, y: c.y - 3, w: 6, d: 6, r: 1 };
  out.push(S(slab(pillar, 6, 56, 3, 0.4), { tone: "mid", crease: "none" }));
  const f = front(c.y + 3), minor = [], major = [];
  for (let s = 0; s <= 1.0001; s += 0.05) {
    const z = Z0 + COLLAR_H + ZSPAN * s, long = Math.abs((s / 0.25) - Math.round(s / 0.25)) < 1e-6;
    (long ? major : minor).push(`M${c.x - 3} ${(-z).toFixed(2)}L${c.x - 3 + (long ? 4 : 2.2)} ${(-z).toFixed(2)}`);
  }
  const zt = forkZ(c.th);
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${minor.join("")}"/><path class="iso-line" data-tone="mid" d="${major.join("")}"/><path class="iso-line" data-tone="hi" d="M${c.x - 3} ${-zt}L${c.x + 1.5} ${-zt}" style="stroke-width:1.1"/></g>`);
  out.push(S(slab({ x: c.x - 5, y: c.y - 5, w: 10, d: 10, r: 1.4 }, 62, 4, 3, 0.5), { tone: "mid" }));
  out.push(`<g transform="${front(c.y + 8)}"><path class="iso-fill fig-slot" d="${flat(c.x - 4, 1.4, c.x + 4, 4.4, 0.6, 2)}"/><path class="iso-line" data-tone="lo" d="${flat(c.x - 4, 1.4, c.x + 4, 4.4, 0.6, 2)}"/></g>`);
  return out.join("");
}
const collarSvg = (c) =>
  S(slab({ x: c.x - 5.2, y: c.y - 5.2, w: 10.4, d: 10.4, r: 1.4 }, Z0, COLLAR_H, 3, 0.5), { tone: "hi", crease: "lo" })
  + L(k.lineOnTop([c.x - 3.8, c.y + 5.2], [c.x + 3.8, c.y + 5.2], Z0 + COLLAR_H, P), { tone: "faint" })
  + S(slab({ x: c.x + 5.2, y: c.y - 1.4, w: FORK_X + 3.5 - 5.2 + 1, d: 2.8, r: 0.5 }, Z0 + COLLAR_H - 1.6, 1.6, 2, 0.2), { tone: "hi", lit: true });
function forkBack(c) {
  const zf = forkZ(c.th), x0 = c.x + FORK_X, out = [];
  out.push(S(slab({ x: x0 + 6, y: c.y - 2.4, w: 3, d: 4.8, r: 0.6 }, 0, zf - 3, 2, 0.3), { tone: "lo", crease: "none" }));
  out.push(S(slab({ x: x0, y: c.y - 4.4, w: 6, d: 1.8, r: 0.4 }, zf - 3, 6, 2, 0.2), { tone: "mid" }));
  return out.join("");
}
function forkFront(c, i) {
  const zf = forkZ(c.th), x0 = c.x + FORK_X, out = [];
  out.push(S(slab({ x: x0, y: c.y + 2.6, w: 6, d: 1.8, r: 0.4 }, zf - 3, 6, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: x0 + 6, y: c.y - 4.4, w: 3, d: 8.8, r: 0.6 }, zf - 3, 6, 2, 0.3), { tone: "mid" }));
  const [lx, ly] = at([x0 + 7.5, c.y + 4.4, zf]);
  out.push(`<circle class="fig-lamp" data-part="fork-${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.5"/>`);
  out.push(D([at([x0 + 7.5, c.y + 4.4, zf - 2.2])], { size: 0.38 }));
  return out.join("");
}
// prise volante : posée devant le socle, câble qui repart au pied du tapis de face
function plugSvg(c) {
  const px = c.x + 4, py = c.y + 22, out = [];
  out.push(S(slab({ x: px - 3.5, y: py - 4, w: 7, d: 8, r: 1 }, 0, 3, 2, 0.3), { tone: "hi" }));
  out.push(D([at([px - 1.4, py + 3.6, 3]), at([px + 1.4, py + 3.6, 3])], { size: 0.34, tone: "hi" }));
  out.push(L(k.onTop([[px, py - 4], [px, py - 12], [px + 14, py - 12], [px + 14, 46]], 0.4, P), { tone: "mid" }));
  out.push(D([at([px, py - 4, 0.4]), at([px + 14, 46, 0.4])], { size: 1.0, tone: "hi" }));
  return out.join("");
}
// ---------------------------------------------------------------- S8 : levier de publication, secteur, goupille, fils
function sectorSvg() {
  const out = [], R = 36, a0 = (92 * Math.PI) / 180, a1 = (194 * Math.PI) / 180, pts = [PIV];
  for (let s = 0; s <= 40; s++) { const a = a0 + (a1 - a0) * (s / 40); pts.push([PIV[0] + Math.cos(a) * R, PIV[1] + Math.sin(a) * R]); }
  out.push(`<path class="iso-halo" d="${k.pathOf(pts.map(([x, y]) => at([x, y, 0])), true)}" style="filter:blur(3px)"/>`);
  out.push(S(k.extrude(pts, 0, 4, P, { bevel: 0.5, convex: false }), { tone: "lo" }));
  const t = [];
  for (let a = 96; a <= 192; a += 4) { const r = (a - 105) % 75 === 0 ? 4.8 : 3.4, ar = (a * Math.PI) / 180; t.push(k.lineOnTop([PIV[0] + Math.cos(ar) * R, PIV[1] + Math.sin(ar) * R], [PIV[0] + Math.cos(ar) * (R - r), PIV[1] + Math.sin(ar) * (R - r)], 4, P)); }
  out.push(L(t.join(""), { tone: "mid" }));
  for (const deg of [190.2, 94.8]) { const a = (deg * Math.PI) / 180, x = PIV[0] + Math.cos(a) * 24, y = PIV[1] + Math.sin(a) * 24; out.push(S(k.cylinder(x, y, 1.6, 4, 8, P, 14), { tone: "mid" })); }
  return out.join("");
}
const hubSvg = () => S(k.cylinder(PIV[0], PIV[1], 4.2, BARZ + BARH, 2.4, P, 24, 0.3), { tone: "mid" }) + D([at([PIV[0], PIV[1], BARZ + BARH + 2.4])], { size: 0.6, tone: "hi" });
function bracketSvg() {
  const out = [], b = BRACKET;
  out.push(S(slab(k.insetPlan(b, -2), 0, 2, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(b, 2, 18, 3, 0.5), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: HOLE[0] - 4, y: b.y, w: 8, d: HOLE[1] + 4.5 - b.y, r: 1.5 }, 16, 3.4, 3, 0.4), { tone: "mid" }));
  out.push(D([at([b.x + 3, b.y + 3, 18])], { size: 0.4 }));
  return out.join("");
}
const HOUSING = { x: HOLE[0] - 5, y: HOLE[1] - 5, w: 10, d: 10, r: 2 };
function housingSvg() {
  const out = [];
  out.push(S(slab(HOUSING, 19.4, 9, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(HOUSING, 25, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(HOUSING, 2), 28.4, P, 3), { tone: "faint" }));
  const [lx, ly] = at([HOLE[0], HOUSING.y + HOUSING.d, 24]);
  out.push(`<circle class="fig-lamp" data-part="pub-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.6"/>`);
  return out.join("");
}
const pinSvg = () => S(k.cylinder(HOLE[0], HOLE[1], 1.6, BARZ, 15, P, 16), { tone: "hi", crease: "none", lit: true });
function wiresSvg() {
  const out = [], z = 0.45, wx = BRACKET.x + BRACKET.w;
  for (const c of COLS) {
    const sx = c.x + FORK_X + 7.5, w = [[sx, c.y], [sx, c.wy], [wx, c.wy]];
    out.push(L(k.onTop(w, z, P), { tone: "mid" }), D([at([w[0][0], w[0][1], z]), at([w[2][0], w[2][1], z])], { size: 1.1, tone: "hi" }));
  }
  return out.join("");
}
// ---------------------------------------------------------------- S9 : inférence multimodale hors circuit
function inferSvg() {
  const out = [], x = INF.x;
  out.push(S(slab({ x: x - 24, y: 88, w: 48, d: 14, r: 2 }, 0, 3, 2, 0.4), { tone: "lo" }));
  for (const px of [x - 20, x + 20]) out.push(S(slab({ x: px - 3.5, y: 90, w: 7, d: 8, r: 1 }, 3, 38, 3, 0.4), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: x - 24, y: 88, w: 48, d: 10, r: 2 }, 41, 6, 3, 0.5), { tone: "mid", inner: L(k.sideSeam({ x: x - 24, y: 88, w: 48, d: 10, r: 2 }, 44, P, 3), { tone: "faint" }) }));
  out.push(`<g transform="${front(98)}"><path class="iso-fill fig-slot" d="${flat(x - 7, 42.4, x + 7, 45.4, 0.8, 2)}"/><path class="iso-line" data-tone="lo" d="${flat(x - 7, 42.4, x + 7, 45.4, 0.8, 2)}"/></g>`);
  out.push(D([at([x - 18, 93, 47]), at([x + 18, 93, 47])], { size: 0.42 }));
  for (let i = 0; i < 4; i++) out.push(S(slab({ x: x - 22, y: 80, w: 26, d: 8, r: 1 }, 3 + i * 0.9, 0.8, 2, 0.1), { tone: "hi", crease: "none" }));
  return out.join("");
}
function crankSvg() {
  const x = INF.x + 24, out = [];
  out.push(S(k.cylinder(x, 98, 2.6, 36, 2, P, 18), { tone: "mid" }));
  out.push(S(k.cylinder(x, 98, 1.2, 38, 2, P, 12), { tone: "hi", crease: "none" }));
  return out.join("");
}
function missingSvg() {
  const out = [], legs = [{ x: -196, y: -52, w: 28, d: 104, r: 2 }, { x: -168, y: 52, w: 56, d: 28, r: 2 }];
  for (const p of legs) {
    out.push(L(k.planOutline(p, 0.4, P, 3), { tone: "mid" }));
    out.push(D(k.corners(p, 3).map(([x, y]) => at([x, y, 0.4])), { size: 0.5, tone: "mid" }));
  }
  const c = [-140, 36], a = 0.32, box = (dy0, dy1) => rot2([[-22, dy0], [22, dy0], [22, dy1], [-22, dy1]].map(([x, y]) => [c[0] + x, c[1] + y]), c, a);
  out.push(S(k.extrude(box(-12, 12), 0, 4, P, { bevel: 0.5 }), { tone: "mid" }));
  out.push(S(k.extrude(box(-12, -10), 4, 3, P, { bevel: 0.2 }), { tone: "mid", crease: "none" }), S(k.extrude(box(10, 12), 4, 3, P, { bevel: 0.2 }), { tone: "mid", crease: "none" }));
  for (const [x, y] of [[-112, 22], [-106, 29]]) out.push(S(k.cylinder(x, y, 1.6, 0, 3, P, 14), { tone: "hi", crease: "none" }));
  return out.join("");
}
// ---------------------------------------------------------------- S10 : la balance du gain
const BEAM = { cx: BAL.x, cz: 46, half: 34, tilt: (7 * Math.PI) / 180 };
function balanceSvg() {
  const out = [], { cx, cz, half, tilt } = BEAM, base = { x: cx - 24, y: BAL.y - 12, w: 48, d: 24, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(base, 0, 4, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(base, 0, 4, 3, 0.6), { tone: "lo" }));
  out.push(D(k.corners(base, 3).map(([x, y]) => at([x, y, 4])), { size: 0.4 }));
  out.push(S(k.cylinder(cx, BAL.y, 3, 4, 4, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(cx, BAL.y, 1.8, 8, cz - 8, P, 20), { tone: "mid", crease: "none" }));
  const ends = [-1, 1].map((s) => [cx + s * half * Math.cos(tilt), cz - s * half * Math.sin(tilt)]);
  const F = G.frameOf([0, BAL.y - 1.8, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const dx = Math.sin(tilt) * 1.6, dz = Math.cos(tilt) * 1.6;
  const beam = [[ends[0][0] - dx, ends[0][1] - dz], [ends[0][0] + dx, ends[0][1] + dz], [ends[1][0] + dx, ends[1][1] + dz], [ends[1][0] - dx, ends[1][1] - dz]];
  out.push(S(G.prismOf(F, beam, 0, 3.6, P), { tone: "mid" }));
  out.push(S(k.cylinder(cx, BAL.y, 2.6, cz - 2, 4.4, P, 20), { tone: "hi", lit: true }));
  const pans = ends.map(([x, z], i) => ({ x, z: z - 16, i }));
  for (const p of pans) {
    out.push(S(k.cylinder(p.x, BAL.y, 8, p.z, 1.2, P, 28), { tone: "mid" }));
    const top = [p.x, BAL.y, p.z + 15.8], feet = [[p.x - 7, BAL.y, p.z + 1.2], [p.x + 7, BAL.y, p.z + 1.2]];
    out.push(L(feet.map((f) => k.pathOf([at(top), at(f)])).join(""), { tone: "mid" }), D([at(top), ...feet.map((f) => at(f))], { size: 0.8, tone: "hi" }));
  }
  const block = (x, y, z, w, h) => S(slab({ x: x - w / 2, y: y - w / 2, w, d: w, r: 0.8 }, z, h, 2, 0.3), { tone: "hi" });
  out.push(block(pans[0].x, BAL.y, pans[0].z + 1.2, 8, 8));
  out.push(block(pans[1].x - 4.2, BAL.y, pans[1].z + 1.2, 8, 8), block(pans[1].x + 4.2, BAL.y, pans[1].z + 1.2, 8, 8));
  out.push(S(slab({ x: pans[1].x - 3.6, y: BAL.y - 3.6, w: 7.2, d: 7.2, r: 0.6 }, pans[1].z + 9.2, 2.4, 2, 0.2), { tone: "hi", lit: true }));
  return out.join("");
}

// plaquettes numérotées : elles relient chaque poste à la ligne de lecture sous la figure
const NUMS = [[-122, -44], [-104, -6], [-58, -30], [14, -44], [76, -28], [98, 40], [-14, 26], [-26, 32], [-122, 94], [-112, 20]];
const numSvg = () => NUMS.map(([x, y], i) => {
  const out = [S(slab({ x, y, w: 11, d: 3, r: 0.8 }, 0, 6.5, 2, 0.3), { tone: "mid" })];
  out.push(display(front(y + 3), flat(x + 1.4, 1.6, x + 9.6, 5.2, 0.6, 2), { part: "n" + i, x: x + 5.5, y: -2.1, size: 3.4, text: String(i + 1).padStart(2, "0") }));
  return out.join("");
}).join("");

const bodyParts = [
  `<defs><linearGradient id="scan-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--g,#34d399);stop-opacity:.6"/><stop offset="1" style="stop-color:var(--g,#34d399);stop-opacity:.05"/></linearGradient></defs>`,
  bench(P, PLATE, { strip: { x: -170, y: PLATE.y + PLATE.d - 12, w: 150, d: 7, r: 1 }, label: { x: 60, y: PLATE.y + PLATE.d - 17, w: 48, d: 11, r: 1.2 } }),
  missingSvg(), balanceSvg(), numSvg(),
  beltsSvg(), `<g data-part="cleats"></g>`, inferSvg(), `<g data-part="crank">${crankSvg()}</g>`, `<g data-part="crank-arm"></g>`,
  sorterSvg(), `<g data-part="chips"></g>`,
  lockSvg(), `<g data-part="key-n">${keySvg(false)}</g>`, `<g data-part="key-r">${keySvg(true)}</g>`,
  barrierPostsSvg(), `<g data-part="barrier">${barrierSvg()}</g>`,
  readerSvg(),
  stampSvg(),
  `<g data-part="page">${pageSvg()}${FOFF.map((_, i) => inkSvg(i)).join("")}</g>`,
  `<g data-part="plow">${padSvg()}</g>`, armSvg(), `<g data-part="pspring"></g><g data-part="pknob">${knobSvg()}</g>`,
  `<g data-part="crate" opacity="0"></g>`,
  trayBack(), ...Array.from({ length: SLOTS }, (_, i) => `<g data-part="card-${i}" opacity="0" transform="${k.translateAlong(P, [slotX(i), TRAY.y + TRAY.d / 2, CARD.z])}">${cardSvg(false)}</g>`),
  `<g data-part="seal" opacity="0">${sealSvg()}</g>`, trayFront(),
  `<g data-part="plate" opacity="0">${plateSvg()}</g>`, `<g data-part="ram">${ramSvg()}</g>`, pressSvg(), tagSvg(),
  ...COLS.map((c, i) => columnBase(c) + forkBack(c) + `<g data-part="collar-${i}">${collarSvg(c)}</g>` + forkFront(c, i) + `<g data-part="plug-${i}">${plugSvg(c)}</g>`),
  wiresSvg(), sectorSvg(), bracketSvg(), `<g data-part="pin">${pinSvg()}</g>`, housingSvg(), `<g data-part="lever"></g>`, hubSvg(),
  `<g id="fx" class="fx"></g>`,
];

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "La chaîne documentaire de VRE Studio sur un circuit de tapis en U. Au dos du circuit, ce qui est intégré : une tête de lecture extrait les champs de la page, une boîte à formes les trie par catégorie, une serrure à deux clés (le modèle, les règles) lève une barrière, un tampon à main valide chaque cadre, et la page devient une fiche à trois feuillets dans le fichier du corpus, scellé en version figée. À la face du circuit, ce qui n'est pas encore branché : une presse d'entraînement essayée à vide sur une plaque factice, deux colonnes de mesure dont la prise est débranchée, un levier de publication verrouillé, une table d'inférence hors circuit et un tronçon de tapis de retour posé à côté de son logement. À gauche, une balance : le gain de VRE Studio pèse 2,3 fois celui de l'extracteur VRE.",
  body: bodyParts,
});

// ---------------------------------------------------------------- modèle
const STATIONS = [
  ["Lecture · Document AI", "intégré"], ["Tri sémantique · mini-BERT", "intégré"], ["Hybride · modèle, règles et validations", "intégré"],
  ["Relecture humaine · Human-in-the-Loop", "intégré"], ["Corpus multimodal · texte, positions, image", "intégré"],
  ["Entraînement LayoutLMv3", "pipeline développé, exécution réelle à valider"], ["Évaluation sur rapports inédits", "fiabilité non mesurée"],
  ["Publication explicite", "levier verrouillé"], ["Inférence multimodale en production", "non intégrée"], ["Bilan", "2,3 fois le temps gagné par l’extracteur VRE"],
];
const live = `
const P = ${JSON.stringify(P)};
const FOFF = ${JSON.stringify(FOFF)}, YB = ${YB}, YF = ${YF}, BT = ${BT}, READ_X = ${READ_X}, HOLE_X = ${JSON.stringify(HOLE_X)}, HOLE_Y = ${HOLE_Y}, SORT_H = ${SORT_H};
const BAR_X = ${BAR_X}, BAR_LIFT = ${BAR_LIFT}, LOCK_H = ${LOCK_H};
const PAD_X = ${PAD_X}, PZ_UP = ${PZ_UP}, ARM_TOP = ${ARM_TOP}, KNOB_Z = ${KNOB_Z};
const SLOTS = ${SLOTS}, EXIT_X = ${EXIT_X};
const RC = ${RC}, XB = ${XB}, BW = ${BW}, C1 = ${JSON.stringify(C1)}, C2 = ${JSON.stringify(C2)}, L0 = ${L0}, LA = ${LA}, LV = ${LV}, LF = ${LF}, LT = ${LT}, CLEAT = ${CLEAT}, HW = ${HW};
const pose = ${pose.toString()};
const rot2 = ${rot2.toString()};
const PRESS_X = ${PRESS.x}, RAM_STROKE = ${(18 - (BT + 2.2)).toFixed(1)};
const PIV = ${JSON.stringify(PIV)}, BAR_L = ${BAR_L}, BAR_W = ${BAR_W}, BARZ = ${BARZ}, BARH = ${BARH}, ANG = ${JSON.stringify(ANG)};
const INF_X = ${INF.x};
const CHIPS = ${JSON.stringify([0, 1, 2, 3].map((i) => chipSvg(i, true)))};
const STATIONS = ${JSON.stringify(STATIONS)};
${LOOP}
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
// Calendrier : début de chaque station ; la boucle dure T.end secondes.
const T = { read: 0, sort: 4.8, hybrid: 7.8, review: 12.2, corpus: 20.4, press: 26.6, evalu: 31.6, publish: 35.4, infer: 38.6, balance: 42.6, end: 47 };
const START = [T.read, T.sort, T.hybrid, T.review, T.corpus, T.press, T.evalu, T.publish, T.infer, T.balance];
const stationAt = (t) => { let s = 0; START.forEach((a, i) => { if (t >= a) s = i; }); return s; };
const parts = {};
for (const n of ["cleats", "motor-b", "motor-f", "page", "chips", "key-n", "key-r", "barrier", "plow", "pspring", "pknob", "seal", "crate", "plate", "ram", "pin", "lever", "crank-arm", "count", "read-lamp", "lock-lamp", "press-lamp", "pub-lamp"]) parts[n] = $(n);
const inks = FOFF.map((_, i) => $("ink-" + i)), cardEls = Array.from({ length: SLOTS }, (_, i) => $("card-" + i));
const sortLamps = [0, 1, 2, 3].map((i) => $("sort-lamp-" + i)), plugs = ${JSON.stringify(COLS)}.map((_, i) => $("plug-" + i)), collars = [0, 1].map((i) => $("collar-" + i)), forks = [0, 1].map((i) => $("fork-" + i));
let t = 0, frozen = false, touring = true, idle = 0;
const fxLayer = svg.querySelector("#fx");

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
function barSvg(th) {
  const c = Math.cos(th), s = Math.sin(th), p = (d, w) => [PIV[0] + c * d - s * w, PIV[1] + s * d + c * w], top = BARZ + BARH;
  const ring = [p(0, -BAR_W / 2), p(BAR_L - 3, -BAR_W / 2), p(BAR_L, -BAR_W / 2 + 1.2), p(BAR_L, BAR_W / 2 - 1.2), p(BAR_L - 3, BAR_W / 2), p(0, BAR_W / 2)];
  let out = solidSvg(extrude(ring, BARZ, BARH, P, { bevel: 0.4 }), { tone: "mid" });
  out += solidSvg(extrude([p(10, -2.4), p(24, -2.4), p(24, 2.4), p(10, 2.4)], top, 0.8, P, { bevel: 0.1 }), { tone: "hi", lit: true });
  const g = p(BAR_L - 3.4, 0);
  out += solidSvg(cylinder(g[0], g[1], 2.8, top, 6, P, 20), { tone: "mid" }) + lineSvg(knurl(g[0], g[1], 2.8, top, top + 6, 16, P), { tone: "lo" });
  return out;
}
// ---- état de la boucle à l'instant s
function stateAt(s) {
  const o = { travel2: 0, travel3: 0, scan: null, hitStamp: -1, hitRam: -1, page: -176, pageY: 0, ink: [0, 0, 0, 0], chips: [], sorted: 0, keyN: 0, keyR: 0, lock: 0, barrier: 0, press: 0, cards: 9, cardNew: 0, seal: 0, crate: null, ram: 0, plate: null, plugSway: 0, pull: 0, crank: 0, lampRead: false, lampPress: false };
  // S1 : la page entre, s'arrête sous la tête, quatre champs sont lus
  o.page = lerp(-176, READ_X, ease(seg(s, 0.2, 1.6)));
  for (let k = 0; k < 4; k++) {
    const a = 1.83 + k * 0.65, u = seg(s, a, a + 0.5);
    if (u > 0 && u < 1) o.chips.push({ k, x: lerp(READ_X + FOFF[k], HOLE_X[k], ease(u)), y: lerp(YB, HOLE_Y, ease(u)), z: lerp(BT + 1, SORT_H + 1.6, ease(u)) + 16 * Math.sin(u * Math.PI), fall: 0 });
    else if (u >= 1) { const f = seg(s, a + 0.5, a + 0.8); if (f < 1) o.chips.push({ k, x: HOLE_X[k], y: HOLE_Y, z: lerp(SORT_H + 1.6, SORT_H - 2.2, f), fall: f }); o.sorted = Math.max(o.sorted, k + 1); }
  }
  o.lampRead = s > 1.5 && s < 4.5;
  o.scan = s > 1.5 && s < 4.4 ? -172 + ((s - 1.5) / 2.9) * 64 : null;
  // S2/S3 : clé du modèle, page jusqu'à la barrière, clé des règles, barrière levée
  o.keyN = ease(seg(s, T.sort + 0.4, T.sort + 1.4));
  if (s >= T.hybrid - 1.4) o.page = lerp(READ_X, BAR_X - 33, ease(seg(s, T.hybrid - 1.4, T.hybrid)));
  o.keyR = ease(seg(s, T.hybrid + 0.2, T.hybrid + 1.1));
  o.lock = s > T.hybrid + 1.2 ? 1 : 0;
  o.barrier = ease(seg(s, T.hybrid + 1.5, T.hybrid + 2.3));
  // S4 : la page avance sous le tampon (le champ de tête d'abord), quatre cadres validés à la main
  const stepT = (n) => T.review + 0.2 + n * 1.5, PX = (n) => PAD_X - FOFF[3 - n];
  if (s >= T.hybrid + 2.3) {
    o.page = lerp(BAR_X - 33, PX(0), ease(seg(s, T.hybrid + 2.4, T.review)));
    for (let n = 0; n < 4; n++) {
      if (s >= stepT(n)) {
        if (n > 0) o.page = lerp(PX(n - 1), PX(n), ease(seg(s, stepT(n), stepT(n) + 0.35)));
        const d = s - stepT(n) - 0.5; o.press = Math.max(o.press, d < 0 ? 0 : d < 0.15 ? ease(d / 0.15) : d < 0.3 ? 1 - ease((d - 0.15) / 0.15) : 0);
        o.ink[3 - n] = seg(s, stepT(n) + 0.62, stepT(n) + 0.7);
        const age = s - (stepT(n) + 0.65); if (age >= 0 && age < 0.7) o.hitStamp = age;
      }
    }
  }
  if (s >= T.corpus - 0.8) o.page = lerp(PX(3), EXIT_X, ease(seg(s, T.corpus - 0.8, T.corpus + 0.9)));
  // S5 : la page entre dans le fichier et devient une fiche, le lot est scellé
  o.pageY = ease(seg(s, T.corpus + 1.0, T.corpus + 1.9)) * 36;
  if (s >= T.corpus + 1.9) { o.page = null; o.cards = 10; o.cardNew = ease(seg(s, T.corpus + 1.9, T.corpus + 2.3)); }
  o.seal = ease(seg(s, T.corpus + 2.6, T.corpus + 3.2));
  // le lot scellé ressort par la fente, suit le tapis dans les deux coudes et entre sous la presse
  const sCrate0 = EXIT_X + 196, sCrate1 = L0 + LA + LV + LA + (XB - PRESS_X);
  if (s >= T.corpus + 3.3) {
    const u = ease(seg(s, T.corpus + 3.3, T.press + 0.8)), sc = lerp(sCrate0, sCrate1, u), q = pose(sc), slide = (1 - ease(seg(s, T.corpus + 3.3, T.corpus + 4.1))) * 22;
    o.crate = { x: q.x, y: q.y + slide, h: q.h, a: s < T.press + 0.8 ? 1 : 0 };
    o.travel2 = sc - sCrate0;
  }
  // S6 : deux frappes à vide sur la plaque factice, qui repart vers les colonnes
  if (s >= T.press) {
    o.lampPress = s > T.press + 0.6 && s < T.evalu - 0.6;
    for (const a of [T.press + 1.0, T.press + 2.4]) { const d = s - a; o.ram = Math.max(o.ram, d < 0 ? 0 : d < 0.5 ? ease(d / 0.5) : d < 0.9 ? 1 - ease((d - 0.5) / 0.4) : 0); const age = d - 0.5; if (age >= 0 && age < 0.8) o.hitRam = age; }
    if (s > T.press + 0.8) { o.plate = { x: lerp(PRESS_X, 26, ease(seg(s, T.press + 3.4, T.evalu + 0.4))), a: 1 }; o.travel3 = PRESS_X - o.plate.x; }
  }
  // S7 : rien ne mesure, la prise pend et se balance un peu
  o.plugSway = s >= T.evalu ? Math.sin((s - T.evalu) * 2.2) : 0;
  // S8 : le levier essaie de partir, la goupille tient
  if (s >= T.publish) { const u = seg(s, T.publish + 0.3, T.publish + 2.8); o.pull = 0.07 * Math.sin(u * Math.PI * 3) * Math.sin(u * Math.PI); }
  // S9 : la manivelle tourne à la main, rien n'arrive au circuit
  o.crank = s >= T.infer ? (s - T.infer) * 2.4 : 0;
  return o;
}
const mod = (v) => ((v % 12) + 12) % 12;
const pr = (x, y, z) => iso([x, y, z], P);
const ringPath = (cx, cy, r, z) => ring(cx, cy, r, z, P, 40);
const hash = (n) => { let h = Math.imul(n + 7, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
function fxSvg(o, s) {
  let out = "";
  const line = (d, w, a) => '<path class="fx-line" d="' + d + '" style="stroke-width:' + w + ';opacity:' + a.toFixed(2) + '"/>';
  // S1 : le faisceau de lecture balaie la page, un cône de lumière descend de l'optique
  if (o.scan !== null) {
    const x = o.scan, a = pr(READ_X, YB, 28), b = pr(x, YB - 11, BT + 0.9), c = pr(x, YB + 11, BT + 0.9);
    out += '<path class="fx-cone" d="' + pathOf([a, b, c], true) + '"/>' + line(pathOf([b, c]), 1.3, 0.95) + line(pathOf([pr(x - 2.4, YB - 11, BT + 0.9), pr(x - 2.4, YB + 11, BT + 0.9)]), 0.6, 0.45);
  }
  // S2 : un anneau marque l'arrivée de chaque jeton dans son trou
  for (const c of o.chips) if (c.fall > 0) out += line(ringPath(HOLE_X[c.k], HOLE_Y, 3 + c.fall * 6, SORT_H + 0.1), 1, 1 - c.fall);
  // S3 : rideau lumineux de la barrière, coupé quand elle se lève
  if (o.barrier < 0.95) out += line(pathOf([pr(BAR_X, -88, BT + 15), pr(BAR_X, -44, BT + 15)]), 1.2, (1 - o.barrier) * (0.55 + 0.35 * Math.sin(s * 9)));
  // S4 : l'impact du tampon fait naître une onde d'encre
  if (o.hitStamp >= 0) { const u = o.hitStamp / 0.7; out += line(ringPath(PAD_X, YB, 5 + u * 12, BT + 0.95), 1.4, 1 - u) + line(ringPath(PAD_X, YB, 3 + u * 7, BT + 0.95), 0.8, (1 - u) * 0.7); }
  // S6 : la frappe à vide de la presse : onde et étincelles
  if (o.hitRam >= 0) {
    const u = o.hitRam / 0.8; out += line(ringPath(PRESS_X, YF, 6 + u * 18, BT + 2.3), 1.5, 1 - u);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + hash(i) * 0.6, r0 = 7 + u * 8, r1 = r0 + 4 + hash(i + 9) * 4, zz = BT + 2.6 + u * 9 * (0.6 + hash(i + 3)); out += line(pathOf([pr(PRESS_X + Math.cos(a) * r0, YF + Math.sin(a) * r0, zz), pr(PRESS_X + Math.cos(a) * r1, YF + Math.sin(a) * r1, zz + 2.5)]), 0.9, 1 - u); }
  }
  // S7 : la prise débranchée crache des étincelles par intermittence
  if (s >= T.evalu && s < T.publish) {
    const n = Math.floor(s * 7), on = hash(n) > 0.55;
    if (on) for (let ci = 0; ci < 2; ci++) { const cx = [10, 38][ci]; for (let i = 0; i < 3; i++) { const j = hash(n * 3 + i + ci * 11); out += line(pathOf([pr(cx - 2 + i * 2, 20.6, 2.4), pr(cx - 3 + i * 3.4 + j * 3, 24 + j * 3, 3.4 + j * 3), pr(cx - 1 + i * 2.2 + j * 5, 26 + j * 4, 2.6 + j * 2)]), 0.8, 0.9); } }
  }
  return out;
}
let lastCleats = "";
function cleatsSvg(ph) {
  let out = "";
  const base = ((ph % CLEAT) + CLEAT) % CLEAT;
  for (let sc = base + CLEAT * 3; sc < LT - 6; sc += CLEAT) {
    const fade = Math.min(1, (sc - 30) / 14, (LT - 6 - sc) / 14); if (fade <= 0) continue;
    const t = pose(sc), b = pose(sc - 4.5), nx = -Math.sin(b.h), ny = Math.cos(b.h), e = HW - 0.15;
    const d = pathOf([iso([b.x + nx * e, b.y + ny * e, BT], P), iso([t.x, t.y, BT], P), iso([b.x - nx * e, b.y - ny * e, BT], P)]);
    out += '<path class="iso-line" data-tone="mid" d="' + d + '" style="opacity:' + fade.toFixed(2) + '"/>';
  }
  return out;
}
function crateMarkup(c) {
  const rect = (x0, x1, y0, y1) => rot2([[c.x + x0, c.y + y0], [c.x + x1, c.y + y0], [c.x + x1, c.y + y1], [c.x + x0, c.y + y1]], [c.x, c.y], c.h);
  return solidSvg(extrude(rect(-12, 12, -8, 8), BT, 9, P, { bevel: 0.5 }), { tone: "mid" })
    + solidSvg(extrude(rect(-2, 2, -8.2, 8.2), BT + 9, 0.8, P, { bevel: 0.1 }), { tone: "lo", crease: "none" })
    + solidSvg(cylinder(c.x, c.y, 2.6, BT + 9.8, 1.2, P, 18), { tone: "hi", lit: true });
}
function draw(o, s) {
  const travelled = (o.page === null ? EXIT_X + 176 : o.page + 176) + o.travel2 + o.travel3;
  const cs = cleatsSvg(travelled); if (cs !== lastCleats) { parts.cleats.innerHTML = cs; lastCleats = cs; }
  parts["motor-b"].dataset.on = String(s > 0.2 && s < T.corpus + 1.2);
  parts["motor-f"].dataset.on = String(o.crate !== null && o.crate.a > 0.5 || o.plate !== null && s < T.evalu + 0.6);
  fxLayer.innerHTML = fxSvg(o, s);
  const gone = o.page === null;
  parts.page.setAttribute("transform", gone ? "" : translateAlong(P, [o.page, o.pageY || 0, 0]));
  parts.page.setAttribute("opacity", gone ? "0" : "1");
  inks.forEach((g, i) => g.setAttribute("opacity", o.ink[i].toFixed(2)));
  parts.chips.innerHTML = o.chips.map((c) => '<g transform="' + translateAlong(P, [c.x, c.y, c.z]) + '" opacity="' + (1 - c.fall).toFixed(2) + '">' + CHIPS[c.k] + "</g>").join("");
  sortLamps.forEach((l, i) => { l.dataset.on = String(o.sorted > i); });
  parts["read-lamp"].dataset.on = String(o.lampRead);
  parts["key-n"].setAttribute("transform", translateAlong(P, [lerp(-103, -86, o.keyN), -24, 0]));
  parts["key-r"].setAttribute("transform", translateAlong(P, [-77, lerp(-2, -16, o.keyR), 0]));
  parts["lock-lamp"].dataset.on = String(o.lock === 1);
  parts.barrier.setAttribute("transform", translateAlong(P, [0, 0, BAR_LIFT * o.barrier]));
  // tampon
  const dz = (PZ_UP - (BT + 0.8 + 0.8)) * o.press;
  parts.plow.setAttribute("transform", translateAlong(P, [0, 0, -dz]));
  parts.pknob.setAttribute("transform", translateAlong(P, [0, 0, -dz]));
  const spr = vcoil(PAD_X, YB, ARM_TOP + 2, KNOB_Z - dz, 2.6, 5 - dz * 0.1);
  parts.pspring.innerHTML = solidSvg(cylinder(PAD_X, YB, 1.3, ARM_TOP, KNOB_Z - dz - ARM_TOP, P, 12), { tone: "hi", crease: "none", lit: true }) + lineSvg(spr.back, { tone: "faint" }) + lineSvg(spr.front, { tone: "mid" });
  // fichier
  const visible = 9 + (o.cardNew > 0.02 ? 1 : 0);
  cardEls.forEach((g, i) => { const v = i < visible ? "1" : "0"; if (g.getAttribute("opacity") !== v) g.setAttribute("opacity", v); });
  const cnt = String(Math.min(SLOTS, visible)).padStart(2, "0"); if (parts.count.textContent !== cnt) parts.count.textContent = cnt;
  parts.seal.setAttribute("opacity", o.seal.toFixed(2));
  if (o.crate) { parts.crate.setAttribute("opacity", o.crate.a.toFixed(2)); parts.crate.innerHTML = crateMarkup(o.crate); } else { parts.crate.setAttribute("opacity", "0"); parts.crate.innerHTML = ""; }
  if (o.plate) { parts.plate.setAttribute("opacity", o.plate.a.toFixed(2)); parts.plate.setAttribute("transform", translateAlong(P, [o.plate.x, 0, 0])); } else parts.plate.setAttribute("opacity", "0");
  parts.ram.setAttribute("transform", translateAlong(P, [0, 0, -RAM_STROKE * o.ram]));
  parts["press-lamp"].dataset.on = String(o.lampPress);
  plugs.forEach((g, i) => g.setAttribute("transform", translateAlong(P, [o.plugSway * 1.4 * (i ? -1 : 1), o.plugSway * 0.6, 0])));
  collars.forEach((g) => g.setAttribute("transform", ""));
  forks.forEach((f) => { f.dataset.on = "false"; });
  parts.pin.setAttribute("transform", "");
  parts["pub-lamp"].dataset.on = "false";
  parts.lever.innerHTML = barSvg(ANG.rest + (ANG.act - ANG.rest) * (o.pull || 0));
  const ax = INF_X + 24, a = o.crank;
  parts["crank-arm"].innerHTML = lineSvg(pathOf([iso([ax, 98, 38], P), iso([ax + 7 * Math.cos(a), 98, 38 + 7 * Math.sin(a)], P)]), { tone: "hi", free: true }) + solidSvg(cylinder(ax + 7 * Math.cos(a), 98, 1.4, 38 + 7 * Math.sin(a) - 1, 2.4, P, 12), { tone: "mid" });
}
function reading(s) {
  const i = stationAt(s), [name, status] = STATIONS[i];
  return (i + 1) + " · " + name + " · " + status;
}
const run = loop((dt, calm) => {
  if (frozen) return;
  if (touring) { t = calm ? T.review + 3.3 : t + dt; if (t >= T.end) t = 0; }
  const o = stateAt(t); draw(o, t); say(reading(t));
});
const jump = (i) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 9000); t = START[(i + START.length) % START.length] + 2.4; run(); };
dragX(() => stationAt(t), (v, share) => { const n = (Math.round(v + share * 10) % START.length + START.length) % START.length; if (n !== stationAt(t)) jump(n); });
stage.addEventListener("keydown", (e) => {
  const i = stationAt(t);
  if (e.key === "ArrowRight") { e.preventDefault(); jump(i + 1); }
  if (e.key === "ArrowLeft") { e.preventDefault(); jump(i - 1); }
});
window.__fig = { at: (s) => { touring = false; frozen = true; t = s; const o = stateAt(s); draw(o, s); say(reading(s)); return reading(s); }, T };
draw(stateAt(0), 0); say(reading(0));
`;

const plate = k.plateHtml({
  fig: "Fig 11",
  title: "VRE Studio",
  hint: "Glisse ou ← → : station",
  readout: "1 · Lecture · Document AI · intégré",
  keys: [
    { mark: "raised", label: "Au dos du circuit, tout est boulonné et tourne : lecture, tri sémantique, serrure à deux clés, tampon à main, fichier du corpus" },
    { mark: "flat", label: "À la face : presse essayée à vide sur une plaque factice, colonnes de mesure sans lecture, levier verrouillé" },
    { mark: "lit", label: "Tampon, encre et jetons : ce que la machine ou la main vient d'écrire" },
  ],
  caption: "Une page entre sur le tapis : une tête lit ses quatre champs (Document AI), une boîte à formes les trie par catégorie (mini-BERT), et la barrière ne se lève que si deux clés sont insérées, celle du modèle et celle des règles métiers (hybride neuro-symbolique). Un tampon à main valide chaque cadre (Human-in-the-Loop), puis la page devient une fiche à trois feuillets, image, texte et positions, rangée dans le fichier du corpus, scellé en version figée. À la face du circuit, ce qui n'est pas encore intégré : la presse d'entraînement LayoutLMv3 est construite mais n'a tourné qu'à vide sur une plaque factice, les deux colonnes de mesure n'ont aucune prise branchée (la fiabilité sur des rapports inédits n'est pas mesurée), le levier de publication reste verrouillé, la table d'inférence est hors circuit et le tronçon de tapis de retour est posé à côté de son logement. À gauche, la balance : VRE Studio fait gagner 2,3 fois plus de temps que l'extracteur VRE dont il est l'évolution.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="VRE Studio : flèches gauche et droite pour passer d'une station à l'autre" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0">${svg}</div>`,
});

writeFigure("vrestudio", {
  title: "VRE Studio · la chaîne documentaire complète", plate, live, width: 860,
  css: "<style>.fig-slot{fill:var(--anatomy-lo)}.fig-ink{fill:var(--anatomy-lit);opacity:.14}.fx{pointer-events:none}.fx-line{fill:none;stroke:var(--g,#34d399);stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 2.5px var(--g,#34d399))}.fx-cone{fill:url(#scan-grad);stroke:none}</style>",
});

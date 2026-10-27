// Fig 11 · VRE Studio : un poste de relecture à tampon et son calibre de publication.
// node figures/build-vrestudio.mjs  →  figures/vrestudio.html
// Un chariot porte un tampon : chaque cadre du rapport est validé à la main, jamais par la machine.
// Chaque rapport relu est classé dans le fichier ; ses fiches font monter deux colonnes, F1 et rappel U1.
// Deux fourches optiques lisent les colonnes : tant que les deux faisceaux ne sont pas coupés, une goupille
// verrouille le levier. Le levier tiré, la plaque du modèle est active ; ce qu'elle propose reste au crayon.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 660, HEIGHT = 400;
const PLATE = { x: -182, y: -58, w: 326, d: 106, r: 8 };

// ---- table lumineuse, feuille, cadres
const LB = { x: -166, y: -36, w: 112, d: 72, r: 3 }, LB_H = 10;
const SHEET = { x: -158, y: -29, w: 96, d: 58, r: 1 }, SH_TOP = LB_H + 0.8;
const FRAME_W = 18, FRAME_D = 14, FX = [-143, -121, -99, -77];
const framePlan = (cx) => ({ x: cx - FRAME_W / 2, y: -FRAME_D / 2, w: FRAME_W, d: FRAME_D, r: 1.5 });
// ---- rail et chariot (relatif à x = 0)
const RAIL = { x: -170, y: -52, w: 122, d: 6, r: 1 }, RAIL_TOP = 3;
const BLOCK = { x: -9, y: -53, w: 18, d: 14, r: 2.5 }, BLOCK_TOP = 26;
const ARM = { x: -4.5, y: -39, w: 9, d: 46, r: 2 }, ARM_Z = 22, ARM_TOP = 28;
const PZ_UP = 17, PAD_PLAN = { x: -8.5, y: -6, w: 17, d: 12, r: 1.5 }, TRAVEL = SH_TOP + 0.8 - (PZ_UP - 0.8) - 0 ; // course du tampon
const DROP = PZ_UP - 0.8 - (SH_TOP + 0.02) + 0.8;            // descente jusqu'à la feuille
const KNOB_Z = 42, KNOB_H = 4, BUSH_TOP = 30;
// ---- fichier (bac à fiches)
const SLOTS = 12, SLOT0 = -33, PITCH = 5;
const TRAY = { x: -41, y: -28, w: 70, d: 50, r: 3 }, TRAY_H = 14, WALL = 3;
const CARD = { w: 1.8, d: 30, h: 24, z: 2 };
const slotX = (i) => SLOT0 + i * PITCH;
// ---- colonnes de mesure et fourches
const COLS = [{ x: 44, y: -12, th: 0.75 }, { x: 70, y: -12, th: 0.9 }];
const Z0 = 10, ZSPAN = 60, COLLAR_H = 5;
const zOf = (score) => Z0 + ZSPAN * score;                    // bas du collier
const forkZ = (th) => Z0 + COLLAR_H + ZSPAN * th;             // hauteur du faisceau
// ---- levier de publication
const PIV = [136, -34], BAR_L = 44, BAR_W = 7, HOLE_R = 41;
const ANG = { rest: Math.PI, act: (105 * Math.PI) / 180 };
const HOLE = [PIV[0] + Math.cos(ANG.rest) * HOLE_R, PIV[1] + Math.sin(ANG.rest) * HOLE_R];
const BAR_Z = 6, BAR_H = 3, BRACKET = { x: 92, y: -54, w: 6, d: 6, r: 1 }, PIN_UP = 5;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [FX[0] - 14, -54, 48], [PIV[0] + 6, PIV[1], 40], [COLS[1].x + 10, COLS[1].y, 84], [BRACKET.x, BRACKET.y, 36]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 47 },
);
const { at, S, L, D, slab, front, right, flat } = tools(P);
const [vx, vy] = k.towardViewer(P);
const ink = (d, w = 1.5) => `<path class="iso-line" data-tone="hi" d="${d}" style="stroke-width:${w}"/>`;

// ---------------------------------------------------------------- table lumineuse
function tableSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(LB, 0, 4, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(LB, 0, LB_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(LB, 3.4, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(LB, 3.5), LB_H, P, 3), { tone: "faint" }));
  out.push(D(k.corners(LB, 2.4).map(([x, y]) => at([x, y, LB_H])), { size: 0.42 }));
  // face avant : trois évents et un interrupteur ; flanc droit : fente de sortie des fiches.
  const f = front(LB.y + LB.d), vents = [], x0 = LB.x + 14;
  for (let i = 0; i < 3; i++) vents.push(flat(x0 + i * 7, 3, x0 + i * 7 + 4.6, 7.2, 1, 3));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/><circle class="iso-line" data-tone="faint" cx="${LB.x + LB.w - 14}" cy="-5" r="2.2" fill="none"/></g>`);
  out.push(D([at([LB.x + LB.w - 14, LB.y + LB.d, 5])], { size: 0.5, tone: "hi" }));
  out.push(`<g transform="${right(LB.x + LB.w)}"><path class="iso-fill fig-slot" d="${flat(-10, 3.6, 10, 6.6, 0.8, 3)}"/><path class="iso-line" data-tone="lo" d="${flat(-10, 3.6, 10, 6.6, 0.8, 3)}"/></g>`);
  return out.join("");
}
function sheetSvg() {
  const out = [];
  out.push(S(slab(SHEET, LB_H, 0.8, 3, 0.1), { tone: "hi", crease: "none" }));
  const rules = [];
  for (const [y, len] of [[-24, 0.82], [-20.6, 0.6], [-17.2, 0.74], [11.5, 0.7], [14.9, 0.84], [18.3, 0.5], [21.7, 0.78], [25, 0.4]])
    rules.push(k.lineOnTop([SHEET.x + 6, y], [SHEET.x + 6 + (SHEET.w - 12) * len, y], SH_TOP, P));
  out.push(L(rules.join(""), { tone: "lo", free: true }));
  out.push(D(k.corners(SHEET, 2.2).map(([x, y]) => at([x, y, SH_TOP])), { size: 0.4, tone: "lo" }));
  // cadres au crayon : proposés ou tracés, jamais encore validés
  out.push(L(FX.map((x) => k.planOutline(framePlan(x), SH_TOP, P, 2)).join(""), { tone: "mid" }));
  return out.join("");
}
const inkSvg = (i) => {
  const plan = framePlan(FX[i]), d = k.planOutline(plan, SH_TOP + 0.1, P, 2);
  return `<g data-part="ink-${i}" opacity="0"><path class="fig-ink" d="${d}"/>${ink(d, 1.7)}</g>`;
};

// ---------------------------------------------------------------- rail et chariot
function railSvg() {
  const out = [];
  out.push(S(slab(RAIL, 0, RAIL_TOP, 3, 0.5), { tone: "mid" }));
  out.push(L(k.lineOnTop([RAIL.x + 0.5, RAIL.y + 3], [RAIL.x + RAIL.w - 0.5, RAIL.y + 3], RAIL_TOP, P), { tone: "faint" }));
  for (const x of [RAIL.x - 5, RAIL.x + RAIL.w]) {
    out.push(S(slab({ x, y: RAIL.y - 1, w: 5, d: 8, r: 1 }, 0, 10, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, RAIL.y + 3, 10])], { size: 0.45 }));
  }
  const ticks = k.topTicks(RAIL.x + 6, RAIL.x + RAIL.w - 6, 4, 5, RAIL.y + 0.7, RAIL_TOP, [1.4, 2.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}
function blockSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(BLOCK, RAIL_TOP, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(BLOCK, RAIL_TOP, BLOCK_TOP - RAIL_TOP, 4, 0.7), { tone: "mid", inner: L(k.sideSeam(BLOCK, 12, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BLOCK, 2.6), BLOCK_TOP, P, 3), { tone: "faint" }));
  out.push(D([at([BLOCK.x + 3.4, BLOCK.y + 3.4, BLOCK_TOP]), at([BLOCK.x + BLOCK.w - 3.4, BLOCK.y + 3.4, BLOCK_TOP])], { size: 0.42 }));
  // vis de blocage sur le flanc droit
  const sx = BLOCK.x + BLOCK.w, sy = BLOCK.y + BLOCK.d / 2;
  out.push(S(k.cylinder(sx + 1.2, sy, 2.6, 13, 2, P, 14), { tone: "mid" }));
  out.push(L(k.lineOnTop([sx + 1.2 - 2, sy], [sx + 1.2 + 2, sy], 15, P), { tone: "hi" }));
  return out.join("");
}
function armSvg() {
  const out = [];
  out.push(S(slab(ARM, ARM_Z, ARM_TOP - ARM_Z, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(ARM, 25, P, 3), { tone: "faint" }) }));
  out.push(L(k.lineOnTop([ARM.x + 2.4, ARM.y], [ARM.x + 2.4, ARM.y + ARM.d], ARM_TOP, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([ARM.x + ARM.w - 2.4, ARM.y], [ARM.x + ARM.w - 2.4, ARM.y + ARM.d], ARM_TOP, P), { tone: "faint" }));
  out.push(D([at([0, ARM.y + 4, ARM_TOP]), at([0, ARM.y + ARM.d - 4, ARM_TOP])], { size: 0.4 }));
  out.push(S(k.cylinder(0, 0, 3.4, ARM_TOP, BUSH_TOP - ARM_TOP, P, 20), { tone: "mid" }));
  return out.join("");
}
function padSvg() {
  const out = [];
  out.push(S(k.cylinder(0, 0, 1.6, PZ_UP + 3, 8, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(slab(PAD_PLAN, PZ_UP, 3, 3, 0.4), { tone: "mid" }));
  out.push(S(slab(k.insetPlan(PAD_PLAN, 0.8), PZ_UP - 0.8, 0.8, 3, 0.1), { tone: "hi", lit: true }));
  out.push(D([at([PAD_PLAN.x + 2, PAD_PLAN.y + 2, PZ_UP + 3]), at([PAD_PLAN.x + PAD_PLAN.w - 2, PAD_PLAN.y + PAD_PLAN.d - 2, PZ_UP + 3])], { size: 0.38 }));
  return out.join("");
}
function knobSvg() {
  const out = [];
  out.push(S(k.cylinder(0, 0, 4.6, KNOB_Z, KNOB_H, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(0, 0, 4.6, KNOB_Z, KNOB_Z + KNOB_H, 24, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([0, 0], [3.6, 0], KNOB_Z + KNOB_H, P), { tone: "hi" }));
  return out.join("");
}

// ---------------------------------------------------------------- fichier
function trayBack() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 3, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(TRAY, 0, 2, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: WALL, r: 1 }, 2, TRAY_H - 2, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: TRAY.x, y: TRAY.y, w: WALL, d: TRAY.d, r: 1 }, 2, TRAY_H - 2, 2, 0.4), { tone: "mid" }));
  const tk = k.topTicks(slotX(0), slotX(SLOTS - 1), PITCH, 5, TRAY.y + 0.7, TRAY_H, [1, 1.8], P);
  out.push(L(tk.minor, { tone: "lo" }), L(tk.major, { tone: "mid" }));
  return out.join("");
}
const cardSvg = (lit) => S(slab({ x: -CARD.w / 2, y: -CARD.d / 2, w: CARD.w, d: CARD.d, r: 0.4 }, 0, CARD.h, 2, 0.2), { tone: "hi", crease: "faint", lit })
  + L(k.lineOnTop([0, -CARD.d / 2 + 6], [0, CARD.d / 2 - 6], CARD.h, P), { tone: "lo", free: true });
function trayFront() {
  const out = [], yF = TRAY.y + TRAY.d;
  out.push(S(slab({ x: TRAY.x, y: yF - WALL, w: TRAY.w, d: WALL, r: 1 }, 2, TRAY_H - 2, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: TRAY.x + TRAY.w - WALL, y: TRAY.y, w: WALL, d: TRAY.d, r: 1 }, 2, TRAY_H - 2, 2, 0.4), { tone: "mid" }));
  out.push(L(k.lineOnTop([TRAY.x + 0.9, yF - WALL / 2], [TRAY.x + TRAY.w - 0.9, yF - WALL / 2], TRAY_H, P), { tone: "faint" }));
  const cx = TRAY.x + TRAY.w / 2;
  out.push(S(slab({ x: cx - 12, y: yF, w: 24, d: 1, r: 0.6 }, 2, 10, 2, 0.2), { tone: "lo", crease: "none" }));
  out.push(display(front(yF + 1), flat(cx - 9, 4, cx + 9, 11, 1), { part: "count", x: cx, y: -5.4, size: 5.6, text: "00" }));
  out.push(D([at([cx - 14, yF + 1, 6]), at([cx + 14, yF + 1, 6])], { size: 0.4 }));
  out.push(D(k.corners({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: TRAY.d }, 1.5).map(([x, y]) => at([x, y, TRAY_H])), { size: 0.4 }));
  return out.join("");
}
// éjecteur : la fiche du rapport relu monte par une fente, puis une palette la pousse vers le fichier
const EJ = { x: LB.x + LB.w + 0.5, y: -14, w: 9, d: 28, r: 1.5 }, EJ_H = 12, SLIT = [EJ.x + 3.6, EJ.x + 5.4];
function ejectorSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(EJ, 0, 3, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(EJ, 0, EJ_H, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(EJ, 3, P, 3), { tone: "faint" }) }));
  out.push(S(slab({ x: SLIT[0], y: EJ.y + 3, w: SLIT[1] - SLIT[0], d: EJ.d - 6, r: 0.4 }, EJ_H, 0.1, 2, 0), { tone: "lo", crease: "none", flat: true }));
  out.push(D([at([EJ.x + 1.6, EJ.y + 1.6, EJ_H]), at([EJ.x + 1.6, EJ.y + EJ.d - 1.6, EJ_H]), at([EJ.x + EJ.w - 1.6, EJ.y + 1.6, EJ_H]), at([EJ.x + EJ.w - 1.6, EJ.y + EJ.d - 1.6, EJ_H])], { size: 0.4 }));
  return out.join("");
}
// zone visible de la fiche pendant qu'elle monte : au-dessus de la fente seulement
function ejectorClip() {
  const c = [[SLIT[0], EJ.y + 3], [SLIT[1], EJ.y + 3], [SLIT[1], EJ.y + EJ.d - 3], [SLIT[0], EJ.y + EJ.d - 3]].map(([x, y]) => at([x, y, EJ_H]));
  const hull = G.hullOf([...c, ...c.map(([x, y]) => [x, y - 200])]);
  return `<clipPath id="ej-clip"><path d="${hull.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join("")}Z"/></clipPath>`;
}
const paddleSvg = () => S(slab({ x: EJ.x - 2.2, y: EJ.y + 2, w: 2.2, d: EJ.d - 4, r: 0.5 }, EJ_H, 7, 2, 0.2), { tone: "mid" });

// ---------------------------------------------------------------- colonnes et fourches
function columnBase(c) {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: c.x - 9, y: c.y - 9, w: 18, d: 18, r: 3 }, 0, 4, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab({ x: c.x - 8, y: c.y - 8, w: 16, d: 16, r: 2.5 }, 0, 6, 4, 0.7), { tone: "mid" }));
  out.push(D(k.corners({ x: c.x - 8, y: c.y - 8, w: 16, d: 16 }, 2).map(([x, y]) => at([x, y, 6])), { size: 0.4 }));
  const pillar = { x: c.x - 3, y: c.y - 3, w: 6, d: 6, r: 1 };
  out.push(S(slab(pillar, 6, 74, 3, 0.4), { tone: "mid", crease: "none" }));
  // graduations sur la face avant : un trait tous les 0,05, un long tous les 0,25, l'index du seuil plein
  const f = front(c.y + 3), minor = [], major = [];
  for (let s = 0; s <= 1.0001; s += 0.05) {
    const z = Z0 + COLLAR_H + ZSPAN * s, long = Math.abs((s / 0.25) - Math.round(s / 0.25)) < 1e-6;
    (long ? major : minor).push(`M${c.x - 3} ${(-z).toFixed(2)}L${c.x - 3 + (long ? 4 : 2.2)} ${(-z).toFixed(2)}`);
  }
  const zt = forkZ(c.th);
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${minor.join("")}"/><path class="iso-line" data-tone="mid" d="${major.join("")}"/><path class="iso-line" data-tone="hi" d="M${c.x - 3} ${-zt}L${c.x + 1.5} ${-zt}" style="stroke-width:1.1"/></g>`);
  out.push(S(slab({ x: c.x - 5, y: c.y - 5, w: 10, d: 10, r: 1.4 }, 80, 4, 3, 0.5), { tone: "mid" }));
  return out.join("");
}
const FORK_X = 7.5;                                           // la fourche est à droite de la colonne, face au visiteur
function collarSvg(c) {                                       // dessiné en position zéro (bas du collier à Z0) puis translaté
  const out = [];
  out.push(S(slab({ x: c.x - 5.2, y: c.y - 5.2, w: 10.4, d: 10.4, r: 1.4 }, Z0, COLLAR_H, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.lineOnTop([c.x - 3.8, c.y + 5.2], [c.x + 3.8, c.y + 5.2], Z0 + COLLAR_H, P), { tone: "faint" }));
  out.push(S(slab({ x: c.x + 5.2, y: c.y - 1.4, w: FORK_X + 3.5 - 5.2 + 1, d: 2.8, r: 0.5 }, Z0 + COLLAR_H - 1.6, 1.6, 2, 0.2), { tone: "hi", lit: true }));
  return out.join("");
}
function forkBack(c, i) {
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
// ---------------------------------------------------------------- levier, secteur, goupille
const bar = (a) => [PIV[0] + Math.cos(a) * BAR_L, PIV[1] + Math.sin(a) * BAR_L];
function sectorSvg() {
  const out = [], R = 52, a0 = (92 * Math.PI) / 180, a1 = (194 * Math.PI) / 180, pts = [PIV];
  for (let s = 0; s <= 40; s++) { const a = a0 + (a1 - a0) * (s / 40); pts.push([PIV[0] + Math.cos(a) * R, PIV[1] + Math.sin(a) * R]); }
  out.push(`<path class="iso-halo" d="${k.pathOf(pts.map(([x, y]) => at([x, y, 0])), true)}" style="filter:blur(3px)"/>`);
  out.push(S(k.extrude(pts, 0, 4, P, { bevel: 0.5, convex: false }), { tone: "lo" }));
  // arc gradué : un trait tous les 5°, un long aux deux positions
  const t = [];
  for (let a = 96; a <= 192; a += 4) { const r = (a - 105) % 75 === 0 ? 4.8 : 3.4, ar = (a * Math.PI) / 180; t.push(k.lineOnTop([PIV[0] + Math.cos(ar) * R, PIV[1] + Math.sin(ar) * R], [PIV[0] + Math.cos(ar) * (R - r), PIV[1] + Math.sin(ar) * (R - r)], 4, P)); }
  out.push(L(t.join(""), { tone: "mid" }));
  // butées aux deux extrémités de la course
  for (const deg of [190.2, 94.8]) { const a = (deg * Math.PI) / 180, x = PIV[0] + Math.cos(a) * 30, y = PIV[1] + Math.sin(a) * 30; out.push(S(k.cylinder(x, y, 1.8, 4, 8, P, 14), { tone: "mid" })); }
  return out.join("");
}
function hubSvg() {
  const out = [];
  out.push(S(k.cylinder(PIV[0], PIV[1], 4.4, BAR_Z + BAR_H, 2.4, P, 24, 0.3), { tone: "mid" }));
  out.push(D([at([PIV[0], PIV[1], BAR_Z + BAR_H + 2.4])], { size: 0.6, tone: "hi" }));
  return out.join("");
}
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
  out.push(`<circle class="fig-lamp" data-part="lock" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.6"/>`);
  return out.join("");
}
const pinSvg = () => S(k.cylinder(HOLE[0], HOLE[1], 1.6, BAR_Z, 15, P, 16), { tone: "hi", crease: "none", lit: true });
// fils des deux fourches vers le boîtier : au sol, un par côté du support
function wiresSvg() {
  const out = [], z = 0.45;
  const w1 = [[COLS[0].x + FORK_X + 7.5, COLS[0].y], [COLS[0].x + FORK_X + 7.5, -51], [BRACKET.x, -51]];
  const w2 = [[COLS[1].x + FORK_X + 7.5, COLS[1].y], [COLS[1].x + FORK_X + 7.5, -47], [BRACKET.x, -47]];
  for (const w of [w1, w2]) {
    out.push(L(k.onTop(w, z, P), { tone: "mid" }));
    out.push(D([at([w[0][0], w[0][1], z]), at([w[2][0], w[2][1], z])], { size: 1.1, tone: "hi" }));
  }
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un poste de relecture. Un chariot porte un tampon qui valide à la main chaque cadre d'un rapport sur une table lumineuse ; chaque rapport relu est classé dans un fichier de fiches. Deux colonnes graduées montent avec le nombre de fiches, l'une pour le F1, l'autre pour le rappel U1 ; une fourche optique par colonne lit le seuil. Tant que les deux faisceaux ne sont pas coupés, une goupille verrouille le levier de publication. Levier tiré, la plaque du modèle est active et ses propositions restent au crayon jusqu'au tampon.",
  body: [
    bench(P, PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 12, w: 130, d: 7, r: 1 }, label: { x: 30, y: PLATE.y + PLATE.d - 17, w: 46, d: 11, r: 1.2 } }),
    railSvg(), tableSvg(), sheetSvg(),
    `<g data-part="sheet-ink">${FX.map((_, i) => inkSvg(i)).join("")}</g>`,
    `<g data-part="car">${blockSvg()}<g data-part="plow">${padSvg()}</g>${armSvg()}<g data-part="pspring"></g><g data-part="pknob">${knobSvg()}</g></g>`,
    ejectorClip(), ejectorSvg(), `<g data-part="rise" clip-path="url(#ej-clip)"></g>`, `<g data-part="paddle">${paddleSvg()}</g>`,
    trayBack(), ...Array.from({ length: SLOTS }, (_, i) => `<g data-part="card-${i}" opacity="0" transform="${k.translateAlong(P, [slotX(i), 0, CARD.z])}">${cardSvg(false)}</g>`), trayFront(), `<g data-part="flight"></g>`,
    ...COLS.map((c, i) => columnBase(c) + forkBack(c, i) + `<g data-part="collar-${i}">${collarSvg(c)}</g>` + forkFront(c, i)),
    wiresSvg(), sectorSvg(), bracketSvg(), `<g data-part="pin">${pinSvg()}</g>`, housingSvg(),
    `<g data-part="lever"></g>`, hubSvg(),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const FX = ${JSON.stringify(FX)}, SLOTS = ${SLOTS}, SLOT0 = ${SLOT0}, PITCH = ${PITCH}, CARD = ${JSON.stringify(CARD)}, TRAY_H = ${TRAY_H};
const COLS = ${JSON.stringify(COLS)}, Z0 = ${Z0}, ZSPAN = ${ZSPAN}, COLLAR_H = ${COLLAR_H};
const PIV = ${JSON.stringify(PIV)}, BAR_L = ${BAR_L}, BAR_W = ${BAR_W}, BAR_Z = ${BAR_Z}, BAR_H = ${BAR_H}, ANG = ${JSON.stringify(ANG)}, HOLE = ${JSON.stringify(HOLE)}, PIN_UP = ${PIN_UP};
const DROP = ${DROP.toFixed(2)}, ARM_TOP = ${ARM_TOP}, BUSH_TOP = ${BUSH_TOP}, KNOB_Z = ${KNOB_Z}, KNOB_H = ${KNOB_H}, EJ_X = ${EJ.x}, EJ_H = ${EJ_H};
const CARD_LIT = ${JSON.stringify(cardSvg(true))}, CARD_ON = ${JSON.stringify(cardSvg(false))};
${LOOP}
// Seuils du calibre (publication.md) : au moins 10 rapports, F1 ≥ 0,75, rappel U1 ≥ 0,90. Courbes illustratives.
const F1 = [0, .31, .42, .50, .57, .62, .67, .70, .72, .74, .77, .79, .80];
const U1 = [0, .22, .35, .46, .56, .65, .72, .78, .83, .87, .92, .93, .94];
const score = (tab, n) => { const i = Math.min(Math.floor(n), tab.length - 2), f = Math.min(1, n - i); return tab[i] + (tab[i + 1] - tab[i]) * f; };
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const clamp = (u) => Math.max(0, Math.min(1, u));
const slotX = (i) => SLOT0 + i * PITCH;

// Calendrier de la boucle : dix rapports relus, publication, un rapport proposé et validé, retour.
const RT = 2.0, FS = 0.34, N = 10, T_GATE = N * RT, T_PIN = T_GATE + 0.3, T_PULL = T_PIN + 0.7, T_LAST = T_PULL + 1.7;
const T_PROP = T_LAST + 0.6, T_HOLD = T_PROP + 3.4, T_BACK = T_HOLD + 1.4, T_END = T_BACK + 1.6;
const parts = {};
for (const n of ["car", "plow", "pspring", "pknob", "paddle", "rise", "flight", "pin", "lever", "lock", "count", "sheet-ink"]) parts[n] = $(n);
const cardEls = Array.from({ length: SLOTS }, (_, i) => $("card-" + i)), inks = FX.map((_, i) => $("ink-" + i)), collars = COLS.map((_, i) => $("collar-" + i)), forks = COLS.map((_, i) => $("fork-" + i));
let t = 0, frozen = false, touring = true, idle = 0, manualN = 0, manualPull = 0;

// ---- état de la boucle à l'instant s
function tourAt(s) {
  const o = { n: 0, cx: FX[0], press: 0, ink: [0, 0, 0, 0], flight: null, paddle: 0, pull: 0, pin: 0, prop: 0, say: "" };
  const r = Math.min(N - 1, Math.floor(s / RT)), u = s - r * RT;
  if (s < T_GATE) {
    let cx = FX[0];
    for (let i = 0; i < 4; i++) {
      const a = 0.12 + i * FS, prev = i ? FX[i - 1] : FX[0];
      if (u >= a) cx = FX[i] + 0; else { cx = prev + (FX[i] - prev) * ease((u - (a - 0.12)) / 0.12); break; }
      const d = u - a - 0.1; o.press = Math.max(o.press, d < 0 ? 0 : d < 0.07 ? ease(d / 0.07) : d < 0.14 ? 1 - ease((d - 0.07) / 0.07) : 0);
      o.ink[i] = clamp((u - a - 0.14) / 0.05);
    }
    o.cx = cx;
    if (u > RT - 0.3) o.cx = FX[3] + (FX[0] - FX[3]) * ease((u - (RT - 0.3)) / 0.3);
    const e = u - (0.12 + 3 * FS + 0.28);
    if (e > 0 && e < 0.5) o.flight = { u: e / 0.5, slot: r };
    if (e > 0) o.paddle = Math.sin(clamp(e / 0.16) * Math.PI);
    if (u > RT - 0.12) o.ink = o.ink.map((v) => v * (1 - ease((u - (RT - 0.12)) / 0.12)));
    o.n = r + (e >= 0.5 ? 1 : 0);
    o.say = "Rapport " + Math.min(N, o.n + (e >= 0.5 ? 0 : 1)) + " · cadres validés au tampon";
    return o;
  }
  o.n = N; o.ink = [1, 1, 1, 1]; o.cx = FX[3];
  if (s >= T_PIN) o.pin = ease((s - T_PIN) / 0.5);
  if (s >= T_PULL) o.pull = ease((s - T_PULL) / 1.4);
  if (s >= T_PROP && s < T_HOLD) {
    const w = s - T_PROP; o.prop = 1; o.ink = [0, 0, 0, 0]; o.cx = FX[0];
    for (let i = 0; i < 4; i++) { const a = 0.4 + i * 0.7; o.ink[i] = clamp((w - a - 0.3) / 0.1); if (w >= a - 0.12 && w < a + 0.4) { const d = w - a - 0.2; o.press = Math.max(o.press, d < 0 ? 0 : d < 0.1 ? ease(d / 0.1) : d < 0.2 ? 1 - ease((d - 0.1) / 0.1) : 0); } if (w >= a) o.cx = FX[i]; else if (w > a - 0.12) o.cx = FX[Math.max(0, i - 1)] + (FX[i] - FX[Math.max(0, i - 1)]) * ease((w - (a - 0.12)) / 0.12); }
    if (w > 3.0) o.n = N + 1;
  } else if (s >= T_HOLD) { o.prop = 1; o.ink = [1, 1, 1, 1]; o.n = N + 1; o.cx = FX[3]; }
  if (s >= T_BACK) { const b = ease((s - T_BACK) / 1.2); o.pull = 1 - b; o.pin = 1 - ease(clamp((s - T_BACK - 1) / 0.3)); o.n = (N + 1) * (1 - ease(clamp((s - T_BACK - 0.8) / 0.7))); o.ink = [1, 1, 1, 1].map((v) => v * (1 - b)); }
  o.say = s < T_PULL ? "Faisceaux coupés · goupille levée" : s < T_PROP ? "Modèle publié · levier tiré" : "Propositions du modèle : à valider au tampon";
  return o;
}
function manualAt() {
  const o = { n: manualN, cx: FX[0], press: 0, ink: manualN ? [1, 1, 1, 1] : [0, 0, 0, 0], flight: null, paddle: 0, pull: manualPull, pin: 0, prop: 0, say: "" };
  const open = score(F1, manualN) >= .75 && score(U1, manualN) >= .9 && manualN >= 10;
  o.pin = open ? 1 : 0; if (!open) o.pull = Math.min(o.pull, 0.04);
  return o;
}
let shown = { sf: 0, su: 0 };
function vcoil(cx, cy, z0, z1, r, turns) {
  const count = Math.round(turns * 24), back = [], front = []; let run = [], near = null;
  for (let i = 0; i <= count; i++) {
    const a = i / count * turns * Math.PI * 2, p = iso([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + (z1 - z0) * i / count], P), f = Math.cos(a) * towardViewer(P)[0] + Math.sin(a) * towardViewer(P)[1] > 0;
    if (near === null) near = f;
    if (f !== near) { run.push(p); (near ? front : back).push(pathOf(run)); run = [p]; near = f; continue; }
    run.push(p);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(""), front: front.join("") };
}
function barSvg(th) {
  const c = Math.cos(th), s = Math.sin(th), p = (d, w) => [PIV[0] + c * d - s * w, PIV[1] + s * d + c * w];
  const ring = [p(0, -BAR_W / 2), p(BAR_L - 3.5, -BAR_W / 2), p(BAR_L, -BAR_W / 2 + 1.2), p(BAR_L, BAR_W / 2 - 1.2), p(BAR_L - 3.5, BAR_W / 2), p(0, BAR_W / 2)];
  const top = BAR_Z + BAR_H, hole = p(HOLE_R_, 0);
  let out = solidSvg(extrude(ring, BAR_Z, BAR_H, P, { bevel: 0.4 }), { tone: "mid" });
  const plaque = [p(14, -2.6), p(31, -2.6), p(31, 2.6), p(14, 2.6)];
  out += solidSvg(extrude(plaque, top, 0.8, P, { bevel: 0.1 }), { tone: "hi", lit: true });
  out += lineSvg([0, 1, 2].map((i) => pathOf([p(16.2, -1.6 + i * 1.6), p(16.2 + [11, 8, 9.5][i], -1.6 + i * 1.6)].map((q) => iso([q[0], q[1], top + 0.8], P)))).join(""), { tone: "lo", free: true });
  out += solidSvg(cylinder(hole[0], hole[1], 0.1, top, 0.1, P, 6), { tone: "lo", crease: "none" });
  const g = p(BAR_L - 4, 0);
  out += solidSvg(cylinder(g[0], g[1], 3, top, 7, P, 20), { tone: "mid" });
  out += lineSvg(knurl(g[0], g[1], 3, top, top + 7, 16, P), { tone: "lo" });
  return out;
}
const HOLE_R_ = ${HOLE_R};
function draw(o) {
  // chariot et tampon
  parts.car.setAttribute("transform", translateAlong(P, [o.cx, 0, 0]));
  const dz = DROP * o.press;
  parts.plow.setAttribute("transform", translateAlong(P, [0, 0, -dz]));
  parts.pknob.setAttribute("transform", translateAlong(P, [0, 0, -dz]));
  const spr = vcoil(0, 0, BUSH_TOP, KNOB_Z - dz, 2.6, 5 - dz * 0.12);
  parts.pspring.innerHTML = solidSvg(cylinder(0, 0, 1.3, ARM_TOP, KNOB_Z - dz - ARM_TOP, P, 12), { tone: "hi", crease: "none", lit: true }) + lineSvg(spr.back, { tone: "faint" }) + lineSvg(spr.front, { tone: "mid" });
  inks.forEach((g, i) => g.setAttribute("opacity", o.ink[i].toFixed(2)));
  // fichier : fiches posées, fiche en vol, palette
  cardEls.forEach((g, i) => { const v = i < Math.floor(o.n + 1e-6) ? "1" : "0"; if (g.getAttribute("opacity") !== v) g.setAttribute("opacity", v); });
  let fl = "", rs = "";
  if (o.flight) {
    const f = o.flight, x0 = EJ_X + 5.4, xs = slotX(f.slot);
    if (f.u < 0.3) rs = '<g transform="' + translateAlong(P, [x0, 0, EJ_H - CARD.h + (CARD.h + 2) * ease(f.u / 0.3)]) + '">' + CARD_LIT + "</g>";
    else { const w = (f.u - 0.3) / 0.7, x = x0 + (xs - x0) * ease(w), z = EJ_H + 2 + 20 * Math.sin(w * Math.PI) - (EJ_H + 2 - CARD.z) * ease(w);
      fl = '<g transform="' + translateAlong(P, [x, 0, z]) + '">' + CARD_LIT + "</g>"; }
  }
  parts.rise.innerHTML = rs; parts.flight.innerHTML = fl;
  parts.paddle.setAttribute("transform", translateAlong(P, [o.paddle * 6, 0, 0]));
  const cnt = String(Math.min(SLOTS, Math.floor(o.n + 1e-6))).padStart(2, "0"); if (parts.count.textContent !== cnt) parts.count.textContent = cnt;
  // colonnes : les colliers suivent les scores, les fourches s'allument quand le faisceau est coupé
  const sc = [score(F1, o.n), score(U1, o.n)];
  shown.sf += (sc[0] - shown.sf) * 0.35; shown.su += (sc[1] - shown.su) * 0.35;
  const sh = [shown.sf, shown.su];
  collars.forEach((g, i) => g.setAttribute("transform", translateAlong(P, [0, 0, ZSPAN * sh[i]])));
  forks.forEach((f, i) => { f.dataset.on = String(sh[i] >= COLS[i].th - 0.002); });
  const both = sh[0] >= COLS[0].th - 0.002 && sh[1] >= COLS[1].th - 0.002 && o.n >= 10 - 1e-6;
  parts.lock.dataset.on = String(both && o.pin > 0.05);
  // goupille et levier
  parts.pin.setAttribute("transform", translateAlong(P, [0, 0, PIN_UP * o.pin]));
  const th = ANG.rest + (ANG.act - ANG.rest) * o.pull;
  parts.lever.innerHTML = barSvg(th);
  window.__lastSay = o.say;
}
const FMT = (x) => x.toFixed(2).replace(".", ",");
function reading(o) {
  const n = Math.min(12, Math.floor(o.n + 1e-6)), f = score(F1, o.n), u = score(U1, o.n);
  return o.say ? o.say + " · " + n + " rapports · F1 " + FMT(f) + " · U1 " + FMT(u) : n + " rapports · F1 " + FMT(f) + " · U1 " + FMT(u);
}
const run = loop((dt, calm) => {
  if (frozen) return;
  let o;
  if (touring) { t = calm ? T_PROP + 1.2 : t + dt; if (t >= T_END) t = 0; o = tourAt(t); }
  else o = manualAt();
  draw(o); say(reading(o));
});
const choose = (n) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; t = 0; shown = { sf: 0, su: 0 }; }, 7000); manualN = Math.max(0, Math.min(SLOTS, n)); manualPull = 0; run(); };
dragX(() => manualN, (v, share) => { const n = Math.round(v + share * 14); if (n !== manualN) choose(n); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); choose((touring ? Math.floor(tourAt(t).n) : manualN) + (e.key === "ArrowRight" ? 1 : -1)); }
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (touring) choose(Math.floor(tourAt(t).n)); manualPull = manualPull > 0.5 ? 0 : 1; run(); }
});
window.__fig = { at: (s) => { touring = false; frozen = true; shown = { sf: score(F1, tourAt(s).n), su: score(U1, tourAt(s).n) }; const o = tourAt(s); draw(o); say(reading(o)); return reading(o); }, T: { T_GATE, T_PULL, T_PROP, T_HOLD, T_END } };
draw(tourAt(0)); say(reading(tourAt(0)));
`;

const plate = k.plateHtml({
  fig: "Fig 11",
  title: "VRE Studio",
  hint: "Glisse ou ← → : rapports · Entrée : levier",
  readout: "0 rapports · F1 0,00 · U1 0,00",
  keys: [
    { mark: "lit", label: "Tampon et encre : un cadre validé à la main" },
    { mark: "raised", label: "Colonnes, de gauche à droite : F1 (seuil 0,75), rappel U1 (seuil 0,90) ; chaque fourche lit son seuil" },
  ],
  caption: "Chaque cadre est validé à la main au tampon, puis le rapport est classé dans le fichier. Les fiches font monter deux colonnes : le F1 doit atteindre 0,75 et le rappel U1 0,90, sur au moins 10 rapports. Tant qu'une fourche n'est pas coupée, la goupille garde le levier de publication verrouillé. Tiré, le levier active la plaque du modèle : ses propositions restent au crayon jusqu'au prochain coup de tampon. VRE Studio fait gagner 2,3 fois plus de temps que l'extracteur VRE qu'il fait évoluer. Le pipeline LayoutLMv3 est développé mais son exécution réelle reste à valider, et la fiabilité sur des rapports inédits n'est pas encore mesurée : les courbes de score sont illustratives.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="VRE Studio : flèches gauche et droite pour changer le nombre de rapports validés, Entrée pour tirer le levier" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0">${svg}</div>`,
});

writeFigure("vrestudio", {
  title: "VRE Studio · poste de relecture et calibre de publication", plate, live,
  css: "<style>.fig-slot{fill:var(--anatomy-lo)}.fig-ink{fill:var(--anatomy-lit);opacity:.14}</style>",
});

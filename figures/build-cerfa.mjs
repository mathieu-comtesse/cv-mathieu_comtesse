// Fig 01 · CERFA v3 : une trieuse de fiches.
// node figures/build-cerfa.mjs  →  figures/cerfa.html (thème clair)
// Le lot de fiches part du chargeur, passe sous la tête de lecture, puis le poussoir de sa
// case la fait tomber : conforme, doublon, non-conformité ou retard.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 600, HEIGHT = 400;

// ---------------------------------------------------------------- monde (1 unité ≈ 5 mm)
const PLATE = { x: -164, y: -60, w: 326, d: 120, r: 8 }, PLATE_H = 10, FOOT_H = 5;
const BACK = { x: -140, y: -36, w: 270, d: 27, r: 3 };        // pont de transport, haut
const FRONT = { x: -140, y: -9, w: 270, d: 35, r: 3 };        // caisson des cases, bas
const BED = 112, DECK = 67, PLINTH = 5;
const CARD = { l: 37, w: 17 };                                 // fiche : 187 × 83 mm
const T = 0.085;                                               // épaisseur d'une fiche dans une pile
const LANE_Y = -21;                                            // axe du transport
const X = [-140, -94, -48, -2, 44];                            // cloisons des cases
const CENTRES = X.slice(0, 4).map((x) => x + 23);
const HOPPER = { x: 87, y: LANE_Y - CARD.w / 2, w: CARD.l, d: CARD.w, r: 0.6 };
const POCKET_Y = 5;                                            // bord arrière de la pile en case
const ROLLERS = [-94, -48, -2, 52];
const READ_X = 72;
const LOT = { min: 50, max: 500, rest: 300 };
const KNOB = { y: -22.5, z: 86, r: 8 };
const TOP = BED + 2 + LOT.max * T + 4;                         // haut du chargeur

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(BACK, 0, BED), [127, -36, TOP], [127, -9, TOP], [85, -36, TOP]],
  WIDTH, HEIGHT, { pad: 26, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0.4) => k.slabOf(plan, z, h, P, steps, bevel);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const front = (y) => k.sideMatrix([0, y], 0, P, "left");      // face d'équerre à y : local (x, −z)
const right = (x) => k.sideMatrix([x, 0], 0, P, "right");     // face d'équerre à x : local (−y, −z)
const flat = (x0, z0, x1, z1, r = 1.2, steps = 4) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);

// Fiche : un rectangle au coin coupé, comme les formulaires CERFA perforés.
const cardRing = (cx, cy) => {
  const x0 = cx - CARD.l / 2, x1 = cx + CARD.l / 2, y0 = cy - CARD.w / 2, y1 = cy + CARD.w / 2, c = 3;
  return [[x0 + c, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0 + c]];
};

// ---------------------------------------------------------------- socle
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(slab(PLATE, -PLATE_H, PLATE_H, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Règle graduée le long du bord avant : un pas = 5 mm, un majeur tous les 5.
  const strip = { x: -138, y: PLATE.y + PLATE.d - 16, w: 200, d: 7, r: 1 };
  out.push(S(slab(strip, 0, 0.6, 3, 0), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // Plaque signalétique : trois lignes imprimées et deux vis.
  const label = { x: 84, y: PLATE.y + PLATE.d - 20, w: 46, d: 11, r: 1.2 };
  out.push(S(slab(label, 0, 0.8, 3, 0), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
  out.push(L([30, 22, 26].map((w, i) => k.lineOnTop([label.x + 6, label.y + 3 + i * 2.6], [label.x + 6 + w, label.y + 3 + i * 2.6], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + 3, label.y + label.d / 2, 0.8]), at([label.x + label.w - 3, label.y + label.d / 2, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------------------------------------------------------------- caisson
function cabinet() {
  const out = [];
  const plinth = (plan) => S(slab(k.insetPlan(plan, 3), 0, PLINTH, 3, 0.4), { tone: "lo" });
  out.push(plinth(BACK), plinth(FRONT));
  // Pont arrière : une couture à mi-hauteur qui fait le tour des coins.
  out.push(S(slab(BACK, PLINTH, BED - PLINTH, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(BACK, 60, P, 3), { tone: "faint" }) }));
  out.push(S(slab(FRONT, PLINTH, DECK - 3 - PLINTH, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(FRONT, 34, P, 3), { tone: "faint" }) }));
  out.push(S(slab({ x: FRONT.x - 2, y: FRONT.y, w: FRONT.w + 4, d: FRONT.d + 2, r: 3 }, DECK - 3, 3, 3, 0.8), { tone: "mid" }));
  return out.join("");
}

// Compteurs mécaniques au-dessus des cases, sur la face avant du pont (y = −9).
function counters() {
  const out = [], y = FRONT.y;
  CENTRES.forEach((cx, i) => {
    const win = flat(cx - 13, 102, cx + 13, 109.5, 1.4);
    out.push(`<g transform="${front(y)}"><path class="iso-fill fig-window" d="${win}"/><path class="iso-line" data-tone="lo" d="${win}"/>`);
    out.push(`<text class="fig-digits" data-part="count-${i}" x="${cx}" y="${-103.8}" text-anchor="middle" font-size="5.2">0000</text></g>`);
    out.push(D([at([cx - 15.5, y, 105.8]), at([cx + 15.5, y, 105.8])], { size: 0.42 }));
  });
  return out.join("");
}

// Face avant du caisson : trappe de service vissée autour des fentes, plaque gravée.
function frontFace() {
  const out = [], y = FRONT.y + FRONT.d;
  const door = flat(-56, 9, 34, 31, 2.4, 5);
  out.push(`<g transform="${front(y)}"><path class="iso-line" data-tone="lo" d="${door}"/></g>`);
  out.push(D([[-52.5, 12.5], [30.5, 12.5], [-52.5, 27.5], [30.5, 27.5]].map(([x, z]) => at([x, y, z])), { size: 0.45 }));
  const slots = [];
  for (let i = 0; i < 9; i++) slots.push(flat(-43 + i * 9, 14, -39 + i * 9, 26, 2, 4));
  out.push(`<g transform="${front(y)}"><path class="iso-line" data-tone="lo" d="${slots.join("")}"/></g>`);
  // Plaque gravée, seule inscription de la machine.
  const plate = flat(66, 40, 118, 50, 1.4);
  out.push(`<g transform="${front(y)}"><path class="iso-fill" d="${plate}"/><path class="iso-line" data-tone="lo" d="${plate}"/></g>`);
  out.push(k.faceTextSvg(`${front(y)} translate(92 -43.3)`, "CERFA v3", { size: 4.6, tone: "mid", anchor: "middle" }));
  out.push(D([at([69, y, 45]), at([115, y, 45])], { size: 0.42 }));
  return out.join("");
}

// Totalisateur des retards sur le plateau, à droite des cases.
const TOTAL = { x: 54, y: -6, w: 64, d: 26, r: 2 }, TOTAL_H = 22;
function totalizer() {
  const out = [], y = TOTAL.y + TOTAL.d, top = DECK + TOTAL_H;
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(TOTAL, 2), DECK, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(TOTAL, DECK, TOTAL_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(TOTAL, DECK + 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(TOTAL, 3.5), top, P, 3), { tone: "faint" }));
  out.push(D(k.corners(TOTAL, 6).map(([x, yy]) => at([x, yy, top])), { size: 0.45 }));
  const win = flat(TOTAL.x + 6, DECK + 9.5, TOTAL.x + TOTAL.w - 6, DECK + 18.5, 1.6);
  out.push(`<g transform="${front(y)}"><path class="iso-fill fig-window" d="${win}"/><path class="iso-line" data-tone="lo" d="${win}"/>`);
  out.push(`<text class="fig-digits" data-part="late" x="${TOTAL.x + TOTAL.w - 9}" y="${-(DECK + 11.4)}" text-anchor="end" font-size="7">0 retard</text></g>`);
  // Manivelle de remise à zéro sur le flanc droit.
  const F = G.frameAlong([TOTAL.x + TOTAL.w, TOTAL.y + 13, DECK + 12], [1, 0, 0]);
  out.push(S(G.disc(0, 2.2, 4.2, F, P), { tone: "lo" }));
  out.push(S(G.disc(2.2, 6, 3.2, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 2.2, 6, 3.2, 20, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(S(G.disc(6, 7, 2.2, F, P), { tone: "mid" }));
  return out.join("");
}

// Flanc droit : bouton de lot gradué, afficheur, fentes ; prise secteur en bas.
function sidePanel() {
  const out = [], x = BACK.x + BACK.w;
  // Afficheur du lot.
  const win = flat(-KNOB.y - 9, 103, -KNOB.y + 9, 109.5, 1.4);
  out.push(`<g transform="${right(x)}"><path class="iso-fill fig-window" d="${win}"/><path class="iso-line" data-tone="lo" d="${win}"/>`);
  out.push(`<text class="fig-digits" data-part="lot" x="${-KNOB.y}" y="-104.6" text-anchor="middle" font-size="5">300</text></g>`);
  // Graduations : 50 à 500, un majeur toutes les 100.
  const minor = [], major = [];
  for (let lot = LOT.min; lot <= LOT.max; lot += 50) {
    const a = angleOf(lot), r0 = KNOB.r + 2, r1 = lot % 100 ? KNOB.r + 4 : KNOB.r + 5.5;
    const p = (r) => [x, KNOB.y + Math.sin(a) * r, KNOB.z + Math.cos(a) * r];
    (lot % 100 ? minor : major).push(k.segment(p(r0), p(r1), P));
  }
  out.push(`<g data-part="dial-ring">${L(G.circleOf(G.frameAlong([x, KNOB.y, KNOB.z], [1, 0, 0]), 0, KNOB.r + 2, P), { tone: "faint" })}</g>`);
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  // Bouton moleté : corps, bague, chapeau.
  const F = G.frameAlong([x, KNOB.y, KNOB.z], [1, 0, 0]);
  out.push(S(G.disc(0, 2, KNOB.r + 1, F, P), { tone: "lo" }));
  out.push(S(G.disc(2, 8, KNOB.r, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 2, 8, KNOB.r, 36, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(S(G.disc(8, 9.4, KNOB.r - 1.6, F, P), { tone: "hi" }));
  out.push(`<path data-part="knob-pointer" class="iso-line" data-tone="hi" data-free="end" d="${pointerAt(LOT.rest)}" style="stroke-width:1"/>`);
  // Fentes d'aération du flanc avant, prise secteur.
  const xs = FRONT.x + FRONT.w, slots = [];
  for (let i = 0; i < 5; i++) slots.push(flat(-(FRONT.y + 6 + i * 5.5) - 1.2, 14, -(FRONT.y + 6 + i * 5.5) + 1.2, 40, 1.2, 4));
  out.push(`<g transform="${right(xs)}"><path class="iso-line" data-tone="lo" d="${slots.join("")}"/></g>`);
  const inlet = flat(-20, 46, -10, 56, 1.4);
  out.push(`<g transform="${right(xs)}"><path class="iso-fill" d="${inlet}"/><path class="iso-line" data-tone="lo" d="${inlet}"/><path class="iso-line" data-tone="lo" d="M-17 -51.5h1.4M-14 -51.5h1.4"/></g>`);
  return out.join("");
}
function angleOf(lot) { return (-0.75 + 1.5 * (lot - LOT.min) / (LOT.max - LOT.min)) * Math.PI; }
function pointerAt(lot) {
  const a = angleOf(lot), x = BACK.x + BACK.w + 9.5;
  return k.segment([x, KNOB.y, KNOB.z], [x, KNOB.y + Math.sin(a) * 5.4, KNOB.z + Math.cos(a) * 5.4], P);
}

// ---------------------------------------------------------------- pont de transport (z = BED)
const rail = (y0, y1) => ({ x: -138, y: y0, w: 220, d: y1 - y0, r: 0.8 });
function transportBack() {
  const out = [];
  // Rail arrière, socle du chargeur, mur du chargeur, pilier arrière de la lecture.
  out.push(S(slab(rail(-33, -28), BED, 2, 3, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: 86, y: -34, w: 41, d: 25, r: 1 }, BED, 2, 3, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: 85, y: -36, w: 42, d: 3, r: 0.8 }, BED, TOP - BED, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: 87, y: -35.4, w: 38, d: 1.8, r: 0.5 }, TOP, P, 2), { tone: "faint" }));
  // Règle de niveau sur le mur du chargeur : un trait toutes les 50 fiches, un majeur toutes les 100.
  const gauge = { x: 87, y: -33, w: 2.4, d: 0.6, r: 0.3 };
  out.push(S(slab(gauge, BED + 2, LOT.max * T + 2, 2, 0), { tone: "lo", crease: "none" }));
  const minor = [], major = [];
  for (let n = 50; n <= LOT.max; n += 50) (n % 100 ? minor : major).push(k.segment([89.4, -32.4, BED + 2 + n * T], [n % 100 ? 91.4 : 93, -32.4, BED + 2 + n * T], P));
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(S(slab({ x: 66, y: -36, w: 12, d: 3.5, r: 0.8 }, BED, 18, 3, 0.4), { tone: "mid" }));
  // Paliers arrière des rouleaux et vérins des poussoirs.
  ROLLERS.forEach((rx) => out.push(S(slab({ x: rx - 3, y: -36, w: 6, d: 3, r: 0.8 }, BED, 9.6, 2, 0.3), { tone: "mid" })));
  CENTRES.forEach((cx, i) => {
    out.push(S(slab({ x: cx - 6, y: -36, w: 12, d: 3, r: 0.8 }, BED, 9, 2, 0.4), { tone: "mid" }));
    out.push(D([at([cx - 4, -36 + 1.5, BED + 9]), at([cx + 4, -36 + 1.5, BED + 9])], { size: 0.4 }));
    out.push(`<g data-part="ram-${i}">${S(slab({ x: cx - 8, y: -33, w: 16, d: 1.6, r: 0.4 }, BED + 2.4, 5.2, 2, 0.2), { tone: "mid" })}</g>`);
  });
  out.push(S(slab(rail(-14, -9), BED, 2, 3, 0.3), { tone: "mid" }));
  out.push(D([-120, -60, 0, 60].map((x) => at([x, -11.5, BED + 2])), { size: 0.4 }));
  return out.join("");
}
function transportFront() {
  const out = [];
  // Rouleaux d'entraînement (axe y), puis leurs paliers avant.
  for (const rx of [...ROLLERS, READ_X]) {
    const F = G.frameAlong([rx, -33, BED + 2 + 0.8 + 3], [0, 1, 0]);
    out.push(S(G.disc(0, 21.5, 3, F, P), { tone: "mid", inner: L(G.arcOf(F, 10.75, 3, P), { tone: "faint" }) }));
  }
  // Chargeur : la pile (dynamique) puis ce qui est devant elle.
  out.push(`<g data-part="hopper-stack"></g>`);
  out.push(S(slab({ x: 80.5, y: -33, w: 6, d: 23, r: 0.8 }, BED + 3.6, 12, 2, 0.4), { tone: "mid" }));
  out.push(D([at([83.5, -29, BED + 15.6]), at([83.5, -14, BED + 15.6])], { size: 0.42 }));
  out.push(S(slab({ x: 124.2, y: -34, w: 3, d: 25, r: 0.8 }, BED + 2, TOP - BED - 2, 3, 0.4), { tone: "mid" }));
  for (const px of [92, 118]) out.push(S(slab({ x: px - 1.5, y: -11, w: 3, d: 2.4, r: 0.6 }, BED + 2, TOP - BED - 2, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: 89, y: -11, w: 33, d: 2.4, r: 0.6 }, TOP - 3, 3, 2, 0.3), { tone: "mid" }));
  // Station de lecture : pilier avant, chapeau, voyant.
  out.push(S(slab({ x: 66, y: -12.5, w: 12, d: 3.5, r: 0.8 }, BED + 2, 16, 3, 0.4), { tone: "mid" }));
  const hood = { x: 62, y: -37, w: 20, d: 28, r: 2 };
  out.push(S(slab(hood, BED + 18, 10, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(hood, BED + 22, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(hood, 3), BED + 28, P, 3), { tone: "faint" }));
  out.push(S(k.cylinder(72, -23, 2.6, BED + 28, 2.2, P, 20), { tone: "mid" }));
  { const [lx, ly] = at([72, -23, BED + 30.2]); out.push(`<circle class="fig-lamp" data-part="lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.3"/>`); }
  for (const rx of ROLLERS) out.push(S(slab({ x: rx - 3, y: -12.5, w: 6, d: 3.5, r: 0.8 }, BED + 2, 7.6, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- cases
function pockets() {
  const out = [];
  X.forEach((x, j) => {
    out.push(S(slab({ x: x - 1, y: -9, w: 2, d: 35, r: 0.5 }, DECK, 33, 2, 0.3), { tone: "mid" }));
    out.push(D([at([x, 22, DECK + 33]), at([x, -5, DECK + 33]), at([x + 1, 22, DECK + 29]), at([x + 1, 22, DECK + 4])], { size: 0.4 }));
    if (j < 4) out.push(S(slab({ x: x + 2, y: POCKET_Y - 1.5, w: 42, d: CARD.w + 3, r: 0.8 }, DECK, 0.6, 2, 0), { tone: "lo", crease: "none" }));
    if (j < 4) out.push(`<g data-part="stack-${j}"></g><g data-part="slot-${j}"></g>`);
  });
  // Butées basses à l'avant de chaque case : la pile reste visible au-dessus.
  X.slice(0, 4).forEach((x) => {
    const lip = { x: x + 1, y: 23.5, w: 44, d: 2.5, r: 0.6 };
    out.push(S(slab(lip, DECK, 7, 2, 0.4), { tone: "mid" }));
    out.push(D([at([x + 6, 24.75, DECK + 7]), at([x + 40, 24.75, DECK + 7])], { size: 0.4 }));
    // Porte-étiquette de la case, sans inscription.
    const holder = flat(x + 14, DECK + 1.6, x + 32, DECK + 5.4, 0.8, 3);
    out.push(`<g transform="${front(26)}"><path class="iso-line" data-tone="lo" d="${holder}"/><path class="iso-line" data-tone="faint" d="${flat(x + 15.2, DECK + 2.6, x + 30.8, DECK + 4.4, 0.4, 2)}"/></g>`);
    out.push(D([at([x + 12.6, 26, DECK + 3.5]), at([x + 33.4, 26, DECK + 3.5])], { size: 0.38 }));
  });
  return out.join("");
}

// ---------------------------------------------------------------- fiches (dessinées à l'origine)
function cardSvg() {
  const ring = cardRing(0, 0);
  const rules = [10, 16, 22].map((w, i) => k.lineOnTop([-CARD.l / 2 + 5, -4 + i * 3.4], [-CARD.l / 2 + 5 + w, -4 + i * 3.4], 0.8, P)).join("");
  return S(k.extrude(ring, 0, 0.8, P, { bevel: 0.3 }), { tone: "hi", lit: true }) + L(rules, { tone: "lo", free: true });
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Une trieuse de fiches sur un établi. Le chargeur à droite tient le lot de fiches CERFA ; chaque fiche passe sous la tête de lecture, puis le poussoir de sa case la fait tomber dans l'une des quatre cases : conforme, doublon, non-conformité ou retard. Des compteurs comptent chaque case et un afficheur cumule les fiches en retard.",
  body: [base(), cabinet(), counters(), frontFace(), sidePanel(), transportBack(), `<g data-part="lane"></g>`, transportFront(), pockets(), totalizer()],
});

// ---------------------------------------------------------------- modèle et animation
const live = `
const P = ${JSON.stringify(P)};
const T = ${T}, BED = ${BED}, DECK = ${DECK}, LANE_Y = ${LANE_Y}, POCKET_Y = ${POCKET_Y}, CARD = ${JSON.stringify(CARD)};
const CARD_SVG = ${JSON.stringify(cardSvg())};
const CENTRES = ${JSON.stringify(CENTRES)}, HOPPER = ${JSON.stringify(HOPPER)}, READ_X = ${READ_X}, LOT = ${JSON.stringify(LOT)}, KNOB = ${JSON.stringify(KNOB)}, RIGHT_X = ${BACK.x + BACK.w};
// Vrais chiffres : un lot de 300 fiches en 1 min 20 s ; 20 à 25 h à la main, soit 4 à 5 min par fiche.
const MACHINE_S = 80 / 300, HAND_MIN = [4, 5];
// Répartition illustrative des fiches entre les cases (les chiffres réels sont dans la légende).
const WEIGHTS = [0.72, 0.06, 0.1, 0.12];
const kindOf = (i) => { let h = Math.imul(i + 1, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; const u = (h >>> 0) / 4294967296; let s = 0; for (let k = 0; k < 4; k++) { s += WEIGHTS[k]; if (u < s) return [3, 2, 1, 0][k]; } return 3; };
const INTERVAL = 0.42, SPEED = 240, PUSH = 0.2, FALL = 0.38;
const stage = document.querySelector(".iso-stage"), svg = stage.querySelector("svg");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const readout = document.querySelector("[data-readout]");
const lane = $("lane"), hopper = $("hopper-stack"), lamp = $("lamp"), pointer = $("knob-pointer"), lotText = $("lot"), late = $("late");
const stacks = [0, 1, 2, 3].map((i) => $("stack-" + i)), slots = [0, 1, 2, 3].map((i) => $("slot-" + i)), rams = [0, 1, 2, 3].map((i) => $("ram-" + i)), counts = [0, 1, 2, 3].map((i) => $("count-" + i));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const pool = Array.from({ length: 6 }, () => { const u = document.createElementNS("http://www.w3.org/2000/svg", "g"); u.innerHTML = CARD_SVG; u.style.display = "none"; lane.append(u); return u; });
const fr = (n) => n.toLocaleString("fr-FR");
const clock = (s) => s < 60 ? s.toFixed(0) + " s" : Math.floor(s / 60) + " min " + String(Math.round(s % 60)).padStart(2, "0") + " s";
const span = (a, b) => b < 60 ? Math.round(a) + "–" + Math.round(b) + " min" : (b >= 600 ? Math.round(a / 60) + "–" + Math.round(b / 60) : (a / 60).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "–" + (b / 60).toLocaleString("fr-FR", { maximumFractionDigits: 1 })) + " h";
let lot = LOT.rest, shown = lot, kinds = [], t = 0, holdUntil = 0, frame = 0, last = 0, visible = false, touring = true, idle = 0, drag = null;
const reset = () => { kinds = Array.from({ length: lot }, (_, i) => kindOf(i)); t = still.matches ? 1e6 : -0.6; holdUntil = 0; drawn.hopper = drawn.stacks = null; };
const travel = (i) => (HOPPER.x + CARD.l / 2 - CENTRES[kinds[i]]) / SPEED;
const duration = (i) => travel(i) + PUSH + FALL;
const ease = (u) => u * u * (3 - 2 * u);
const drawn = { hopper: null, stacks: null };
function stackSvg(plan, z, n, lit) {
  if (!n) return "";
  const h = n * T, seams = [];
  for (let s = 1.2; s < h - 0.6; s += 2.4) seams.push(sideSeam(plan, z + s, P, 2));
  return solidSvg(slabOf(plan, z, h, P, 2, 0.2), { tone: "hi", inner: lineSvg(seams.join(""), { tone: "faint" }) });
}
function state() {
  // Combien de fiches sont parties, lesquelles volent, lesquelles sont tombées.
  let sent = 0, landed = [0, 0, 0, 0], flying = [];
  for (let i = 0; i < lot; i++) {
    const age = t - i * INTERVAL;
    if (age < 0) break;
    sent++;
    if (age >= duration(i)) landed[kinds[i]]++; else flying.push([i, age]);
  }
  return { sent, landed, flying, done: landed.reduce((a, b) => a + b, 0) };
}
function place(u, i, age, s) {
  const k = kinds[i], cx = CENTRES[k], tA = travel(i), top = DECK + s.landed[k] * T;
  let x, y = LANE_Y, z = BED + 2, slot = lane;
  if (age < tA) x = HOPPER.x + CARD.l / 2 - age * SPEED;
  else {
    x = cx; slot = slots[k];
    const push = Math.min(1, (age - tA) / PUSH), fall = Math.max(0, (age - tA - PUSH) / FALL);
    y = LANE_Y + 9 * ease(push) + (POCKET_Y + CARD.w / 2 - LANE_Y - 9) * ease(fall);
    z = BED + 2 + (top - BED - 2) * fall * fall;
  }
  if (u.parentNode !== slot) slot.append(u);
  u.setAttribute("transform", translateAlong(P, [x, y, z]));
  u.style.display = "";
  return x;
}
function draw() {
  const s = state();
  // Chargeur : la pile perd une fiche à chaque départ ; la plus basse sort sous la gorge.
  const left = lot - s.sent;
  if (drawn.hopper !== left) { hopper.innerHTML = stackSvg(HOPPER, BED + 2 + (left ? 0.85 : 0), left, false) + (left ? weightSvg(BED + 2 + 0.85 + left * T) : weightSvg(BED + 2)); drawn.hopper = left; }
  const key = s.landed.join(",");
  if (drawn.stacks !== key) {
    s.landed.forEach((n, k) => { stacks[k].innerHTML = stackSvg({ x: CENTRES[k] - CARD.l / 2, y: POCKET_Y, w: CARD.l, d: CARD.w, r: 0.6 }, DECK, n, false); counts[k].textContent = String(n).padStart(4, "0"); });
    late.textContent = fr(s.landed[0]) + (s.landed[0] > 1 ? " retards" : " retard");
    drawn.stacks = key;
  }
  let reading = false;
  pool.forEach((u, n) => { const f = s.flying[n]; if (!f) { u.style.display = "none"; return; } const x = place(u, f[0], f[1], s); if (Math.abs(x - READ_X) < CARD.l / 2) reading = true; });
  lamp.dataset.on = String(reading);
  // Poussoirs : celui de la case choisie avance quand la fiche s'y arrête.
  const push = [0, 0, 0, 0];
  s.flying.forEach(([i, age]) => { const a = age - travel(i); if (a > 0 && a < PUSH + 0.25) push[kinds[i]] = Math.max(push[kinds[i]], Math.sin(Math.min(1, a / (PUSH + 0.25)) * Math.PI) * 9); });
  rams.forEach((r, k) => r.setAttribute("transform", translateAlong(P, [0, push[k], 0])));
  pointer.setAttribute("d", pointerAt(shown));
  lotText.textContent = String(Math.round(shown / 10) * 10);
  const done = s.done, machine = clock(done * MACHINE_S), hand = span(done * HAND_MIN[0], done * HAND_MIN[1]);
  const text = done < lot ? fr(done) + " / " + fr(lot) + " fiches · " + machine + " · à la main " + hand : fr(lot) + " fiches en " + machine + " · à la main " + hand;
  if (readout.textContent !== text) readout.textContent = text;
  return s;
}
function weightSvg(z) {
  const plan = { x: HOPPER.x + 8, y: LANE_Y - 5, w: 21, d: 10, r: 1.4 };
  return solidSvg(slabOf(plan, z, 5, P, 3, 0.5), { tone: "mid" }) + solidSvg(cylinder(HOPPER.x + 18.5, LANE_Y, 3, z + 5, 4, P, 24), { tone: "mid" }) + lineSvg(knurl(HOPPER.x + 18.5, LANE_Y, 3, z + 5, z + 9, 20, P), { tone: "lo" });
}
function pointerAt(lot) {
  const a = (-0.75 + 1.5 * (lot - LOT.min) / (LOT.max - LOT.min)) * Math.PI, x = RIGHT_X + 9.5;
  return segment([x, KNOB.y, KNOB.z], [x, KNOB.y + Math.sin(a) * 5.4, KNOB.z + Math.cos(a) * 5.4], P);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  shown += (lot - shown) * (1 - Math.exp(-dt / 0.18));
  if (Math.abs(lot - shown) < 0.5) shown = lot;
  if (!still.matches) t += dt;
  const s = draw();
  if (s.done === lot && !still.matches) {
    if (!holdUntil) holdUntil = t + 3;
    else if (t > holdUntil && touring) reset();
  }
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const setLot = (next) => {
  next = Math.max(LOT.min, Math.min(LOT.max, Math.round(next / 10) * 10));
  touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 3600);
  if (next !== lot) { lot = next; reset(); }
  stage.setAttribute("aria-valuenow", String(lot));
  stage.setAttribute("aria-valuetext", "Lot de " + lot + " fiches : " + clock(lot * MACHINE_S) + " à la machine, " + span(lot * HAND_MIN[0], lot * HAND_MIN[1]) + " à la main");
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, lot }; stage.setPointerCapture(e.pointerId); });
stage.addEventListener("pointermove", (e) => { if (!drag) return; const box = svg.getBoundingClientRect(); setLot(drag.lot + (e.clientX - drag.x) / box.width * 900); });
const release = () => { drag = null; };
stage.addEventListener("pointerup", release); stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (e) => {
  const step = e.shiftKey ? 100 : 50;
  const to = { ArrowRight: lot + step, ArrowUp: lot + step, ArrowLeft: lot - step, ArrowDown: lot - step, Home: LOT.min, End: LOT.max }[e.key];
  if (to !== undefined) { e.preventDefault(); setLot(to); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reset(); run(); }
});
still.addEventListener("change", () => { reset(); run(); });
reset(); draw();
`;

const body = k.plateHtml({
  fig: "Fig 01",
  title: "CERFA v3",
  hint: "Glisse ← → : taille du lot",
  readout: "0 / 300 fiches · 0 s · à la main 0–0 min",
  keys: [
    { mark: "lit", label: "La fiche lue, du chargeur à sa case" },
    { mark: "raised", label: "Cases : conforme, doublon, non-conformité, retard" },
  ],
  caption: "La trieuse traite un lot de 300 fiches CERFA et attestations en 1 min 20 s, contre 20 à 25 h à la main. L’extracteur permet d’appliquer des pénalités sur les retards, fait remonter les non-conformités et a permis un audit national sur les CERFA fluides frigorigènes. La répartition entre les cases est illustrative.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Trieuse de fiches CERFA : flèches gauche et droite pour changer la taille du lot, Entrée pour relancer" aria-valuemin="${LOT.min}" aria-valuemax="${LOT.max}" aria-valuenow="${LOT.rest}">${svg}</div>`,
});

const css = `<style>
.fig-window{fill:var(--anatomy-paper)}
.fig-digits{font-family:var(--anatomy-mono);font-variant-numeric:tabular-nums;fill:var(--anatomy-hi);letter-spacing:.06em}
.fig-lamp{fill:var(--anatomy-lo);stroke:var(--anatomy-mid);stroke-width:.5}.fig-lamp[data-on="true"]{fill:var(--anatomy-lit)}
.iso-stage{touch-action:pan-y;cursor:var(--cv-resize-x);outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
</style>`;
const page = k.pageHtml({ title: "CERFA v3 · trieuse de fiches", theme: "light", body, script: kitScript() + live, width: 680 })
  .replace('<html lang="en">', '<html lang="fr">').replace("</head>", css + "</head>");
writeFileSync(join(HERE, "cerfa.html"), page);
console.log("wrote figures/cerfa.html", (page.length / 1024).toFixed(0), "KB");

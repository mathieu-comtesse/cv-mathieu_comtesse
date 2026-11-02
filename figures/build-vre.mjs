// Fig 03 · Extracteur VRE : un abaque à quatre tiges devant un rapport lu ligne à ligne.
// node figures/build-vre.mjs  →  figures/vre.html
// Le sélecteur choisit le bâtiment. Le rapport (une feuille souple) est lu ligne à ligne : chaque équipement part sous forme de boule,
// roule sur la gouttière et tombe sur la tige de sa famille, BT31, BT33, BT21 ou BT11, au bon diamètre. Les boules s'empilent :
// la hauteur de chaque pile est le total ; les compteurs du socle suivent, le voyant confirme, puis les piles rejoignent le classeur.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP, PAPER } from "./common.mjs";
import { aframe } from "./parts.mjs";

const WIDTH = 640, HEIGHT = 420;
const PLATE = { x: -164, y: -46, w: 320, d: 96, r: 8 };
const BASE = { x: -92, y: -20, w: 192, d: 40, r: 3 }, BASE_H = 14, FACE_Y = BASE.y + BASE.d;
const TX = [-62, -24, 14, 52], R = [4.4, 5.2, 6, 6.8], THICK = 1.9;
const STACK_Z = BASE_H + 2, ROD_TOP = 92;
const CHUTE = { x0: -112, x1: 96, z0: 118, slope: 0.1, half: 6.6 };
const ZR = (x) => CHUTE.z0 - (x - CHUTE.x0) * CHUTE.slope;
const HOPPER = { x: -108 };
const DESK = { x: -152, y: -24, w: 46, d: 44, r: 2.4 }, DESK_H = 26;
const KNOB = { x: 84, z: 7, r: 4.6 };
const POSTS = [-96, 12, 84];

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(BASE, 0, ROD_TOP + 12), [HOPPER.x, 0, CHUTE.z0 + 30]], WIDTH, HEIGHT, { pad: 22, azimuth: 56 });
const { at, S, L, D, slab, front, right, flat } = tools(P);
const FRM = (y1) => G.frameOf([0, y1, 0], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
const plank = (poly, y0, y1) => G.prismOf(FRM(y1), poly, 0, y1 - y0, P);

// ---------------------------------------------------------------- socle, tiges, montants
function baseSvg() {
  const out = [], f = front(FACE_Y), r = right(BASE.x + BASE.w);
  out.push(`<path class="iso-halo" d="${k.haloOf(BASE, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(BASE, 3), 0, 3, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(BASE, 3, BASE_H - 3, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BASE, 8, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(BASE, 4).map(([x, y]) => at([x, y, BASE_H])), { size: 0.42 }));
  // Compteurs sous chaque tige, vissés ; évents et prise sur le flanc.
  TX.forEach((x, i) => {
    out.push(display(f, flat(x - 11, 4, x + 11, 11, 1.2), { part: "count-" + i, x, y: -5.6, size: 4.6, text: ["BT31 00", "BT33 00", "BT21 00", "BT11 00"][i].replace(/ 00$/, " 00") }));
    out.push(D([at([x - 13, FACE_Y, 7.5]), at([x + 13, FACE_Y, 7.5])], { size: 0.34 }));
  });
  const vents = []; for (let i = 0; i < 6; i++) vents.push(flat(-(BASE.y + 6 + i * 5.6) - 1, 3.4, -(BASE.y + 6 + i * 5.6) + 1, 11, 1, 3));
  out.push(`<g transform="${r}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  // Lampe de confirmation et règle de tête de socle.
  const [lx, ly] = at([BASE.x + BASE.w - 12, FACE_Y - 8, BASE_H + 1.4]);
  out.push(S(k.cylinder(BASE.x + BASE.w - 12, FACE_Y - 8, 2.4, BASE_H, 1.4, P, 18), { tone: "mid" }));
  out.push(`<circle class="fig-lamp" data-part="lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  out.push(S(slab({ x: BASE.x + 4, y: FACE_Y - 8, w: BASE.w - 34, d: 3.2, r: 0 }, BASE_H, 0.5, 2, 0), { tone: "lo", crease: "none" }));
  const t = k.topTicks(BASE.x + 6, BASE.x + BASE.w - 32, 6, 5, FACE_Y - 7.8, BASE_H + 0.5, [1, 1.8], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}
function rodSvg(i) {
  const out = [], x = TX[i], F = G.frameAlong([x, 0, BASE_H], [0, 0, 1]);
  out.push(S(G.disc(0, 2, R[i] + 2.4, F, P), { tone: "lo" }));
  out.push(S(G.disc(2, ROD_TOP - BASE_H - 6, 1.1, F, P), { tone: "mid" }));
  // Entonnoir de tête : deux bagues et un col, graduations de la tige sur un montant voisin.
  out.push(S(G.disc(ROD_TOP - BASE_H - 6, ROD_TOP - BASE_H - 3, R[i] + 1.2, F, P), { tone: "mid" }));
  out.push(S(G.disc(ROD_TOP - BASE_H - 3, ROD_TOP - BASE_H, 2.4, F, P), { tone: "hi" }));
  out.push(`<g data-part="stack-${i}"></g>`);
  return out.join("");
}
function rulerSvg() {
  // Règle verticale entre les tiges 1 et 2 : un trait par boule de 0 à 24, un majeur tous les 5.
  const out = [], x = (TX[1] + TX[2]) / 2, post = { x: x - 1, y: -3, w: 2, d: 2, r: 0.3 };
  out.push(S(slab(post, STACK_Z, ROD_TOP - STACK_Z - 8, 2, 0), { tone: "mid" }));
  const minor = [], major = [];
  for (let n = 0; n <= 24; n++) { const z = STACK_Z + n * THICK, long = n % 5 === 0; (long ? major : minor).push(k.segment([x + 1, -1, z], [x + 1 + (long ? 3.4 : 2), -1, z], P)); }
  out.push(L(minor.join(""), { tone: "lo", free: true }), L(major.join(""), { tone: "mid", free: true }));
  return out.join("");
}
function frameSvg() {
  const out = [];
  for (const x of POSTS) {
    const top = ZR(x) - 3;
    out.push(aframe({ k, G, P, S, L, D, at }, { x, y: -16, z0: 0, z1: top, span: 20, t: 3.4, depth: 6 }));
    out.push(S(slab({ x: x - 3, y: -14, w: 6, d: 12, r: 0.8 }, top - 3, 3, 2, 0.4), { tone: "mid" }));       // console vers la gouttière
    out.push(D([at([x, -2.2, top - 1.5]), at([x, -13.4, top - 1.5])], { size: 0.34 }));
  }
  return out.join("");
}
function chuteSvg(kind) {
  const out = [], hs = CHUTE.half, y0 = -hs, y1 = hs;
  const holes = TX.map((x, i) => [x - R[i] - 1.4, x + R[i] + 1.4]);
  const segs = []; let a = CHUTE.x0;
  for (const [h0, h1] of holes) { segs.push([a, h0]); a = h1; }
  segs.push([a, CHUTE.x1]);
  const floor = ([a1, b1]) => [[a1, ZR(a1)], [b1, ZR(b1)], [b1, ZR(b1) - 2.2], [a1, ZR(a1) - 2.2]];
  if (kind === "back") {
    for (const sg of segs) out.push(S(plank(floor(sg), y0, y1), { tone: "mid" }));
    out.push(S(plank([[CHUTE.x0, ZR(CHUTE.x0)], [CHUTE.x1, ZR(CHUTE.x1)], [CHUTE.x1, ZR(CHUTE.x1) + 4], [CHUTE.x0, ZR(CHUTE.x0) + 4]], y0, y0 + 1.6), { tone: "mid" }));
    return out.join("");
  }
  // lèvre avant, rivets et règle de gouttière
  for (const sg of segs) out.push(S(plank([[sg[0], ZR(sg[0])], [sg[1], ZR(sg[1])], [sg[1], ZR(sg[1]) + 2.4], [sg[0], ZR(sg[0]) + 2.4]], y1 - 1.6, y1), { tone: "mid" }));
  const dots = []; for (let x = CHUTE.x0 + 8; x < CHUTE.x1 - 4; x += 12) if (!holes.some(([h0, h1]) => x > h0 - 3 && x < h1 + 3)) dots.push(at([x, y1, ZR(x) + 1.2]));
  out.push(D(dots, { size: 0.32 }));
  return out.join("");
}

// ---------------------------------------------------------------- pupitre de lecture, sélecteur
function deskSvg() {
  const out = [], d = DESK, f = front(d.y + d.d), r = right(d.x + d.w);
  out.push(`<path class="iso-halo" d="${k.haloOf(d, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(d, 0, DESK_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(d, 6, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: d.x - 1.6, y: d.y - 1.6, w: d.w + 3.2, d: d.d + 3.2, r: 2.4 }, DESK_H - 3, 3, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners({ x: d.x - 1.6, y: d.y - 1.6, w: d.w + 3.2, d: d.d + 3.2 }, 2.6).map(([x, y]) => at([x, y, DESK_H])), { size: 0.4 }));
  // Face : un tiroir, une plaque ; flanc : évents.
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(d.x + 5, 4, d.x + d.w - 5, 14, 1.2, 3)}"/><path class="iso-line" data-tone="mid" d="${flat(d.x + 17, 8.4, d.x + d.w - 17, 9.6, 0.5, 2)}"/></g>`);
  const vents = []; for (let i = 0; i < 5; i++) vents.push(flat(-(d.y + 8 + i * 7) - 1, 4, -(d.y + 8 + i * 7) + 1, 18, 1, 3));
  out.push(`<g transform="${r}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  // Tablette en creux pour la feuille et bac des boules en attente.
  out.push(L(k.planOutline({ x: d.x + 3, y: d.y + 3, w: 30, d: 26, r: 1.4 }, DESK_H, P, 3), { tone: "faint" }));
  out.push(S(slab({ x: d.x + 3, y: d.y + 31, w: 40, d: 9, r: 1.2 }, DESK_H, 1.4, 2, 0.3), { tone: "lo" }));
  out.push(`<g data-part="heap"></g>`);
  out.push(`<g data-part="report"></g>`);
  return out.join("");
}
function selectorSvg() {
  const out = [], f = front(FACE_Y);
  const F = G.frameAlong([KNOB.x, FACE_Y, KNOB.z], [0, 1, 0]), ticks = [];
  for (let i = 0; i < 6; i++) { const a = ((i - 2.5) * 30 * Math.PI) / 180, r0 = KNOB.r + 1.4, r1 = KNOB.r + (i % 5 ? 3 : 4); ticks.push(`M${(KNOB.x + Math.sin(a) * r0).toFixed(2)} ${(-(KNOB.z + Math.cos(a) * r0)).toFixed(2)}L${(KNOB.x + Math.sin(a) * r1).toFixed(2)} ${(-(KNOB.z + Math.cos(a) * r1)).toFixed(2)}`); }
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="mid" d="${ticks.join("")}"/></g>`);
  out.push(S(G.disc(0, 1, KNOB.r + 0.8, F, P), { tone: "lo" }));
  out.push(S(G.disc(1, 3.6, KNOB.r, F, P), { tone: "mid", inner: L(G.ribsOf(F, 1.2, 3.4, KNOB.r, 24, P), { tone: "faint" }) }));
  out.push(`<g transform="${front(FACE_Y + 3.6)}"><path class="iso-line" data-tone="hi" data-part="pointer" d="" style="stroke-width:1.1"/></g>`);
  return out.join("");
}
// Boule : un disque épais d'axe z, à l'origine, au diamètre de sa famille.
const tokenSvg = (i, lit) => k.solidSvg(k.cylinder(0, 0, R[i], 0, THICK, P, 24, 0.3), lit ? { tone: "hi", lit: true } : { tone: "hi" });


// ---------------------------------------------------------------- finitions
function baseDetail() {
  const out = [], b = BASE, f = front(FACE_Y);
  // Pieds réglables, tiroir à poignée, plaque gravée et lettres des bâtiments autour du sélecteur.
  ["A", "B", "C", "D", "E", "F"].forEach((c, i) => { const a = ((i - 2.5) * 30 * Math.PI) / 180, r = KNOB.r + 6.4; out.push(k.faceTextSvg(`${f} translate(${(KNOB.x + Math.sin(a) * r).toFixed(2)} ${(-(KNOB.z + Math.cos(a) * r) + 1).toFixed(2)})`, c, { size: 2.4, tone: "lo", anchor: "middle" })); });
  // Bouches d'aération sur le dessus du socle, entre les tiges.
  for (let i = 0; i < 3; i++) { const x = (TX[i] + TX[i + 1]) / 2; out.push(L(k.planOutline({ x: x - 5, y: BASE.y + 5, w: 10, d: 4, r: 1.2 }, BASE_H, P, 3), { tone: "faint" })); }
  return out.join("");
}
function rodDetail(i) {
  const out = [], x = TX[i], F = G.frameAlong([x, 0, BASE_H], [0, 0, 1]), top = ROD_TOP - BASE_H;
  // Écrou à la base, bague d'arrêt au-dessus de la pile maximale, pastille de famille sur l'entonnoir.
  out.push(S(G.disc(2, 4.4, 2.6, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 2, 4.4, 2.6, 12, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(S(G.disc(top - 18, top - 16.4, 2.2, F, P), { tone: "hi" }));
  out.push(L(G.circleOf(F, top - 6, R[i] + 1.2, P), { tone: "faint" }));
  out.push(D(G.dotsOf(F, top - 4.4, R[i] + 0.6, 4, P, { phase: Math.PI / 4, all: true }), { size: 0.3 }));
  return out.join("");
}
function frameDetail() {
  const out = [];
  // Tirant arrière entre les trois montants, équerres, chapeaux boulonnés.
  out.push(S(slab({ x: POSTS[0], y: -18, w: POSTS[2] - POSTS[0], d: 1.6, r: 0.3 }, 30, 2.2, 2, 0.15), { tone: "mid" }));
  for (const x of POSTS) out.push(S(slab({ x: x - 1.2, y: -12.2, w: 2.4, d: 6, r: 0.3 }, ZR(x) - 11, 5, 2, 0.15), { tone: "mid" }));
  return out.join("");
}
function chuteDetail() {
  const out = [], hs = CHUTE.half;
  // Entonnoir d'entrée avec volet, butée de fin, consoles sous la gouttière.
  out.push(S(slab({ x: CHUTE.x0 - 8, y: -hs - 2, w: 8, d: 2 * hs + 4, r: 1 }, ZR(CHUTE.x0) - 2.2, 2.2, 3, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: CHUTE.x0 - 8, y: -hs - 2, w: 1.6, d: 2 * hs + 4, r: 0.3 }, ZR(CHUTE.x0), 8, 2, 0.15), { tone: "mid" }));
  out.push(S(slab({ x: CHUTE.x1, y: -hs, w: 2.4, d: 2 * hs, r: 0.4 }, ZR(CHUTE.x1) - 2.2, 7, 2, 0.2), { tone: "mid" }));
  for (let x = CHUTE.x0 + 14; x < CHUTE.x1 - 6; x += 30) if (!TX.some((tx, i) => Math.abs(x - tx) < R[i] + 5)) out.push(S(slab({ x: x - 1.2, y: -hs + 2, w: 2.4, d: 2 * hs - 4, r: 0.3 }, ZR(x) - 8, 5.8, 2, 0.15), { tone: "mid" }));
  return out.join("");
}
function deskDetail() {
  const out = [], d = DESK;
  // Sous-main avec pince, godet à stylos, lampe articulée.
  out.push(S(slab({ x: d.x + 2, y: d.y + 2, w: 34, d: 30, r: 1.2 }, DESK_H, 0.8, 2, 0.2), { tone: "lo", crease: "none" }));
  out.push(S(slab({ x: d.x + 12, y: d.y + 0.6, w: 14, d: 3.4, r: 0.6 }, DESK_H + 0.8, 2.2, 2, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(d.x + 40, d.y + 6, 2.6, DESK_H, 6, P, 16), { tone: "mid" }));
  out.push(D([at([d.x + 39, d.y + 6, DESK_H + 6]), at([d.x + 41, d.y + 5.4, DESK_H + 6])], { size: 0.3 }));
  out.push(S(k.cylinder(d.x + 40, d.y + 38, 3, DESK_H, 1.4, P, 18), { tone: "lo" }));
  out.push(S(k.cylinder(d.x + 40, d.y + 38, 0.9, DESK_H + 1.4, 12, P, 10), { tone: "mid" }));
  out.push(S(slab({ x: d.x + 36, y: d.y + 37, w: 10, d: 2, r: 0.5 }, DESK_H + 12, 1.8, 2, 0.2), { tone: "mid" }));
  out.push(S(k.cylinder(d.x + 45, d.y + 38, 2, DESK_H + 10.4, 3.4, P, 14), { tone: "hi" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un abaque à quatre tiges devant un pupitre de lecture. Le rapport, une feuille souple, est lu ligne à ligne ; chaque équipement devient une boule qui roule sur une gouttière et tombe sur la tige de sa famille, BT31, BT33, BT21 ou BT11. Les boules s'empilent, la hauteur de chaque pile donne le total du bâtiment ; quatre compteurs et un voyant confirment, un sélecteur choisit le bâtiment.",
  body: [
    bench(P, PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 13, w: 150, d: 7, r: 1 }, label: { x: 66, y: PLATE.y + PLATE.d - 17, w: 46, d: 11, r: 1.2 } }),
    frameSvg(), frameDetail(), deskSvg(), baseSvg(), baseDetail(), selectorSvg(), chuteSvg("back"), chuteDetail(),
    ...TX.map((_, i) => rodSvg(i) + rodDetail(i)), rulerSvg(),
    `<g data-part="ride"></g>`, ...TX.map((_, i) => `<g data-part="fall-${i}"></g>`), chuteSvg("front"),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
${PAPER}
const TX = ${JSON.stringify(TX)}, R = ${JSON.stringify(R)}, THICK = ${THICK}, STACK_Z = ${STACK_Z}, CHUTE = ${JSON.stringify(CHUTE)}, HOPPER = ${JSON.stringify(HOPPER)}, KNOB = ${JSON.stringify(KNOB)}, FACE_Y = ${FACE_Y}, DESK = ${JSON.stringify(DESK)}, DESK_H = ${DESK_H};
const TOKENS = ${JSON.stringify(TX.map((_, i) => tokenSvg(i, false)))}, TOKENS_LIT = ${JSON.stringify(TX.map((_, i) => tokenSvg(i, true)))};
const ZR = (x) => CHUTE.z0 - (x - CHUTE.x0) * CHUTE.slope;
// Vrais chiffres : 25 min de comptage évitées par rapport, valorisées à 104,74 €/h (43,64 €).
// Les quantités par bâtiment sont illustratives.
const SAVED_MIN = 25, EUR_PER_REPORT = 25 / 60 * 104.74, FAMILY = ["BT31", "BT33", "BT21", "BT11"];
const BUILDINGS = [["A", [18, 9, 7, 3]], ["B", [12, 6, 4, 0]], ["C", [24, 11, 8, 5]], ["D", [9, 4, 6, 2]], ["E", [15, 7, 5, 4]], ["F", [21, 8, 9, 1]]];
const GAP = 0.3, V0 = 40, ACC = 60, GRAV = 420, VERIFY = 1.2, SINK = 0.9, TURN = 0.9;
const hash = (i) => { let h = Math.imul(i + 11, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
function report(b) {
  const list = [];
  BUILDINGS[b][1].forEach((n, f) => { for (let j = 0; j < n; j++) list.push(f); });
  list.forEach((_, j) => { const r = Math.floor(hash(b * 97 + j) * (j + 1)); [list[j], list[r]] = [list[r], list[j]]; });
  const seen = [0, 0, 0, 0];
  const tokens = list.map((f, j) => {
    const d = TX[f] - HOPPER.x, ride = (-V0 + Math.sqrt(V0 * V0 + 2 * ACC * d)) / ACC, level = seen[f]++;
    const drop = ZR(TX[f]) - (STACK_Z + level * THICK), fall = Math.sqrt(2 * Math.max(drop, 0) / GRAV);
    return { f, level, t0: j * GAP, ride, fall, land: j * GAP + ride + fall };
  });
  const landed = Math.max(...tokens.map((t) => t.land));
  return { tokens, landed, verify: landed + 0.3, sink: landed + 0.3 + VERIFY, end: landed + 0.3 + VERIFY + SINK + TURN };
}
const REPORTS = BUILDINGS.map((_, b) => report(b));
let b = 0, t = 0, touring = true, idle = 0, sig = "";
const parts = { ride: $("ride"), heap: $("heap"), pointer: $("pointer"), lamp: $("lamp"), report: $("report") };
const stacks = TX.map((_, i) => $("stack-" + i)), falls = TX.map((_, i) => $("fall-" + i)), counts = TX.map((_, i) => $("count-" + i));
const HEAP = [[0, 0], [7, 2], [-7, 2], [14, -1], [-14, -1], [21, 2], [-21, 2]];
function stackSvg(i, n) {
  if (!n) return "";
  const arcs = []; for (let j = 1; j < n; j++) arcs.push(sideArc(TX[i], 0, R[i], STACK_Z + j * THICK, P, 16));
  return solidSvg(cylinder(TX[i], 0, R[i], STACK_Z, n * THICK, P, 24), { tone: "hi", inner: lineSvg(arcs.join(""), { tone: "faint" }) });
}
function pointerD(kk) { const a = (kk - 2.5) * 30 * Math.PI / 180; return "M" + KNOB.x + " " + (-KNOB.z) + "L" + (KNOB.x + Math.sin(a) * KNOB.r).toFixed(2) + " " + (-(KNOB.z + Math.cos(a) * KNOB.r)).toFixed(2); }
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
function draw(now) {
  const rep = REPORTS[b], tk = rep.tokens, have = [0, 0, 0, 0];
  let ride = "", fall = ["", "", "", ""];
  for (const q of tk) {
    if (t >= q.land) { have[q.f]++; continue; }
    if (t < q.t0) continue;
    const a = t - q.t0;
    if (a < q.ride) { const x = HOPPER.x + V0 * a + ACC * a * a / 2; ride += '<g transform="' + translateAlong(P, [x, 0, ZR(x) + 0.1]) + '">' + TOKENS_LIT[q.f] + "</g>"; }
    else { const u = a - q.ride, z = ZR(TX[q.f]) - GRAV * u * u / 2; fall[q.f] += '<g transform="' + translateAlong(P, [TX[q.f], 0, z]) + '">' + TOKENS_LIT[q.f] + "</g>"; }
  }
  html(parts.ride, ride);
  falls.forEach((g, i) => html(g, fall[i]));
  const s = have.join() + "|" + b;
  if (s !== sig) { stacks.forEach((g, i) => html(g, stackSvg(i, have[i]))); sig = s; }
  const sink = t > rep.sink ? Math.min(1, (t - rep.sink) / SINK) : 0;
  stacks.forEach((g, i) => attr(g, "transform", sink ? translateAlong(P, [0, 0, -have[i] * THICK * sink * sink - 0.01]) : ""));
  counts.forEach((c, i) => { const v = FAMILY[i] + " " + String(have[i]).padStart(2, "0"); if (c.textContent !== v) c.textContent = v; });
  const left = tk.filter((q) => t < q.t0).length, sent = tk.length - left;
  const heap = HEAP.slice(0, Math.min(HEAP.length, Math.ceil(left / 4))).map(([x, y], j) => '<g transform="' + translateAlong(P, [DESK.x + 23 + x, DESK.y + 36 + y * 0.6, DESK_H + 1.4]) + '">' + TOKENS[(j * 3) % 4] + "</g>").join("");
  html(parts.heap, heap);
  // Le rapport : une feuille souple dont les lignes se cochent à mesure que les équipements partent.
  const calm = left === 0 ? 0.25 : 1;
  html(parts.report, paperSvg(paperRows({ c: [DESK.x + 22, DESK.y + 15, DESK_H + 0.6], d: [1, 0, 0], w: [0, 1, 0], L: 38, W: 28, curl: 0.035, wave: 0.9 * calm, roll: 0.5 * calm, ph: b * 1.7, t: now, NT: 12 }), { head: true, done: Math.floor(sent / tk.length * 10) }));
  attr(parts.lamp, "data-on", t >= rep.verify && t < rep.end - TURN);
  const turn = t > rep.end - TURN ? ease((t - (rep.end - TURN)) / TURN) : 0;
  attr(parts.pointer, "d", pointerD(b + (touring ? turn : 0)));
  const total = have.reduce((a, c) => a + c, 0), name = "Bât. " + BUILDINGS[b][0];
  say(t >= rep.verify ? name + " · " + total + " équipements contrôlés · " + SAVED_MIN + " min évitées · " + fr(EUR_PER_REPORT, 2) + " €" : name + " · " + FAMILY.map((f, i) => f + " " + have[i]).join(" · "));
}
const run = loop((dt, calm) => {
  const rep = REPORTS[b];
  if (calm) t = rep.verify + 0.1;
  else { t += dt; if (t >= rep.end) { if (touring) b = (b + 1) % BUILDINGS.length; t = 0; } }
  draw(performance.now() / 1000);
});
const choose = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 6000); b = (next + BUILDINGS.length) % BUILDINGS.length; t = 0; sig = ""; run(); };
dragX(() => b, (v, share) => { const n = (Math.round(v + share * 6) % 6 + 6) % 6; if (n !== b) choose(n); });
stage.addEventListener("keydown", (e) => { const to = { ArrowRight: b + 1, ArrowLeft: b - 1, Enter: b, " ": b }[e.key]; if (to !== undefined) { e.preventDefault(); choose(to); } });
window.__fig = { at: (bb, tt) => { touring = false; b = bb; t = tt; sig = ""; draw(1); return readout.textContent; }, REPORTS };
draw(1);
`;

const plate = k.plateHtml({
  fig: "Fig 03",
  title: "Extracteur VRE",
  hint: "Glisse ou ← → : bâtiment",
  readout: "Bât. A · BT31 0 · BT33 0 · BT21 0 · BT11 0",
  keys: [
    { mark: "lit", label: "L'équipement lu, de la feuille à sa tige" },
    { mark: "raised", label: "Tiges, de gauche à droite : BT31, BT33, BT21, BT11" },
  ],
  caption: "Le sélecteur rattache le rapport à son bâtiment ; chaque équipement tombe sur la tige de sa famille, les compteurs suivent les piles et le voyant confirme les totaux avant qu'ils rejoignent le classeur de suivi. Le comptage manuel prenait 25 min par rapport : sur 4 000 à 5 000 rapports par an, 1 667 à 2 083 h et 174 566,67 à 218 208,33 € à 104,74 €/h. Les quantités par bâtiment sont illustratives.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Extracteur VRE : flèches gauche et droite pour changer de bâtiment" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0">${svg}</div>`,
});

writeFigure("vre", { title: "Extracteur VRE · abaque à quatre tiges", plate, live });

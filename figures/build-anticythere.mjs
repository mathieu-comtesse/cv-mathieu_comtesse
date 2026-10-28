// Fig 11 (variante D) · VRE Studio : le mécanisme d'Anticythère.
// Un boîtier de bois ouvert sur un établi. Une fiche (le rapport) descend par la fente du dessus : la lecture (Document AI).
// La manivelle fait tourner la grande roue à quatre rayons de couleur : chaque rayon qui passe sous le peigne allume le voyant
// de son champ (tri, mini-BERT). Deux roues empilées sur des axes décalés, la cheville du modèle dans la coulisse des règles,
// ne laissent avancer l'aiguille que si elles s'accordent (hybride neuro-symbolique). Au dos, le cadran à spirale prédit
// douze pages inédites (inférence) ; une case rouge est une erreur. Chaque erreur corrigée à la main taille une dent sur la roue
// de la machine à diviser (Human-in-the-Loop) ; les trois anneaux coaxiaux du corpus (image, texte, position) avancent ;
// la roue finie entre dans le boîtier et l'ancienne rejoint le tableau des versions (MLOps local). Le gain est littéral :
// une roue de 46 dents mène une roue de 20 dents, l'aiguille tourne 46 / 20 = 2,3 fois plus vite.
// node figures/build-anticythere.mjs  →  figures/vrestudio-anticythere.html
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 900, HEIGHT = 660;
const PLATE = { x: -128, y: -64, w: 318, d: 150, r: 12 };
const CASE = { x0: -72, x1: 82, y0: -42, y1: 0, h: 132, t: 6 };
const MECH_Y = -16;                                         // plan de la platine de bronze
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -21, 0), [CASE.x0, CASE.y0, CASE.h + 18], [CASE.x1, CASE.y0, CASE.h + 18], [CASE.x0, CASE.y1, CASE.h + 18]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 32 },
);
const { at, S, L, D, slab, front, right } = tools(P);
const TAU = Math.PI * 2;
const dots = (pts, size = 0.45, tone = "lo") => D(pts.map((p) => at(p)), { size, tone });
const box = (x0, x1, y0, y1, z, h, o = {}) => S(k.extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z, h, P, { bevel: o.bevel ?? 0.5 }), { tone: o.tone || "mid", lit: o.lit, crease: o.crease });

// ---------------------------------------------------------------- engrenages (coordonnées de la face : u vers la droite, v vers le bas = -z)
const GEARS = {
  b1: { u: -25, z: 62, r: 40, n: 64 },        // grande roue motrice, quatre rayons = quatre champs
  crank: { u: -57, z: 26, r: 10.5, n: 16 },   // pignon de la manivelle
  idle: { u: 16, z: 91, r: 9.5, n: 14 },      // renvoi vers le couple cheville-coulisse
  pin: { u: 39, z: 104, r: 15, n: 24 },       // roue du modèle (cheville)
  slot: { u: 43, z: 104, r: 15, n: 24 },      // roue des règles (coulisse), axe décalé de 4
  p2: { u: 22, z: 60, r: 8, n: 12 },          // pignon vers les anneaux du corpus
  corpus: { u: 46, z: 60, r: 16, n: 26 },     // trois anneaux coaxiaux : image, texte, position
  d46: { u: 21, z: 26, r: 18.4, n: 46 },      // menante du gain : 46 dents
  o20: { u: 47.4, z: 26, r: 8, n: 20 },       // menée : 20 dents → ×2,3
};
function gearD(r, n, depth = 2.2, cut = n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, w = TAU / n, has = i < cut;
    const ro = has ? r : r - depth, ri = r - depth;
    pts.push([ri, a], [ri, a + w * 0.18], [ro, a + w * 0.3], [ro, a + w * 0.62], [ri, a + w * 0.74]);
  }
  return "M" + pts.map(([rr, a]) => (rr * Math.cos(a)).toFixed(2) + " " + (rr * Math.sin(a)).toFixed(2)).join("L") + "Z";
}
const ring48 = (r, cx = 0, cy = 0) => "M" + Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * TAU; return (cx + r * Math.cos(a)).toFixed(2) + " " + (cy + r * Math.sin(a)).toFixed(2); }).join("L");
const circ = (r, cx = 0, cy = 0) => `M${(cx + r).toFixed(2)} ${cy}A${r} ${r} 0 1 0 ${(cx - r).toFixed(2)} ${cy}A${r} ${r} 0 1 0 ${(cx + r).toFixed(2)} ${cy}Z`;
// une roue sur la face : épaisseur (copie sombre décalée vers le fond), moyeu, rayons ou trous d'allègement, axe
function wheelSvg(g, o = {}) {
  const r = g.r, body = gearD(r, g.n, o.depth ?? Math.max(1.6, r * 0.07), o.cut ?? g.n);
  let s = `<path class="ak-back" d="${body}" transform="translate(1.1 0.9)"/><path class="ak-gear${o.lit ? " ak-lit" : ""}" d="${body}"/>`;
  if (o.spokes) {
    s += `<path class="ak-back" d="${circ(r - 4.2)}"/>`;
    o.spokes.forEach((cls, i) => { const a = (i / o.spokes.length) * TAU, c = Math.cos(a), sn = Math.sin(a), w = 3.2; s += `<path class="ak-gear ${cls}" d="M${(-sn * w).toFixed(2)} ${(c * w).toFixed(2)}L${((r - 4) * c - sn * w).toFixed(2)} ${((r - 4) * sn + c * w).toFixed(2)}L${((r - 4) * c + sn * w).toFixed(2)} ${((r - 4) * sn - c * w).toFixed(2)}L${(sn * w).toFixed(2)} ${(-c * w).toFixed(2)}Z"/>`; });
    s += `<path class="ak-gear" d="${circ(r - 4.2) + circ(r - 6.4)}" fill-rule="evenodd"/>`;
  } else if (r > 9) {
    s += `<path class="ak-hole" d="${[0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + 0.4; return circ(r * 0.22, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); }).join("")}"/>`;
  }
  s += `<path class="ak-gear" d="${circ(Math.max(2.4, r * 0.18))}"/><path class="ak-axle" d="${circ(1.1)}"/>`;
  return s;
}

// ---------------------------------------------------------------- l'établi
const base = [bench(P, PLATE, { plateH: 14, footH: 7, strip: { x: -112, y: PLATE.y + PLATE.d - 12, w: 120, d: 7, r: 1 }, label: { x: 30, y: PLATE.y + PLATE.d - 14, w: 50, d: 10, r: 1.2 } })];

// ---------------------------------------------------------------- le boîtier : fond, flancs, dessus, platine de bronze ; face avant ouverte
const caseSvg = (() => {
  const { x0, x1, y0, y1, h, t } = CASE, out = [];
  out.push(box(x0 - 4, x1 + 4, y0 - 4, y1 + 4, 0, 5, { tone: "lo", bevel: 1 }));                                          // socle
  out.push(box(x0, x1, y0, y0 + t, 5, h - 5, { tone: "lo" }));                                                          // fond
  out.push(box(x0, x0 + t, y0, y1, 5, h - 5, { tone: "mid" }));                                                         // flanc gauche
  // platine de bronze : la face portée par quatre entretoises, chanfreins et vis
  out.push(box(x0 + t + 2, x1 - t - 2, MECH_Y - 3, MECH_Y, 10, h - 20, { tone: "mid", bevel: 0.8 }));
  const f = front(MECH_Y);
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="faint" d="M${x0 + t + 6} -14H${x1 - t - 6}M${x0 + t + 6} ${-(h - 14)}H${x1 - t - 6}"/></g>`);
  out.push(dots([[x0 + t + 6, MECH_Y, 16], [x1 - t - 6, MECH_Y, 16], [x0 + t + 6, MECH_Y, h - 16], [x1 - t - 6, MECH_Y, h - 16]], 0.7, "mid"));
  return out.join("");
})();
const caseFront = (() => {
  const { x0, x1, y0, y1, h, t } = CASE, out = [];
  out.push(box(x1 - t, x1, y0, y1, 5, h - 5, { tone: "mid" }));                                                         // flanc droit (porte le cadran)
  out.push(box(x0 - 3, x1 + 3, y0 - 3, y1 + 3, h, 7, { tone: "mid", bevel: 1.2 }));                                     // dessus
  // fente de lecture et ses lèvres de laiton
  out.push(box(-48, -22, -24, -18, h + 7, 0.8, { tone: "hi", crease: "none" }));
  out.push(`<path class="iso-fill fig-dark" d="${k.pathOf([at([-46, -23, h + 7.9]), at([-24, -23, h + 7.9]), at([-24, -19, h + 7.9]), at([-46, -19, h + 7.9])], true)}"/>`);
  // voyants des quatre champs sur le chant avant du dessus
  out.push(box(-6, 46, y1 - 1, y1 + 3, h + 1, 5, { tone: "lo", bevel: 0.4 }));
  // chants : arêtes de bois, coins de laiton
  out.push(L(k.ring(0, 0, 0.1, 0, P, 3).slice(0, 0), { tone: "faint" }));
  out.push(dots([[x0 - 3, y1 + 3, h + 7], [x1 + 3, y1 + 3, h + 7], [x1 + 3, y0 - 3, h + 7]], 0.6, "mid"));
  return out.join("");
})();
const lampsXY = [0, 1, 2, 3].map((i) => [2 + i * 12, CASE.y1 + 3.1, CASE.h + 3.5]);

// ---------------------------------------------------------------- le cadran à spirale du dos (flanc droit) : douze pages inédites
const DIAL = { u: 21, z: 64, r0: 5, r1: 17, turns: 3 };
const spiralAt = (s) => { const a = s * DIAL.turns * TAU, r = DIAL.r0 + (DIAL.r1 - DIAL.r0) * s; return [DIAL.u + r * Math.cos(a - Math.PI / 2), -DIAL.z + r * Math.sin(a - Math.PI / 2)]; };
const CELLS = Array.from({ length: 12 }, (_, i) => 0.1 + i * 0.075);
const dialSvg = (() => {
  let sp = ""; for (let i = 0; i <= 160; i++) { const [u, v] = spiralAt(i / 160); sp += (i ? "L" : "M") + u.toFixed(2) + " " + v.toFixed(2); } { const [u, v] = spiralAt(1), dx = u - DIAL.u, dy = v + DIAL.z, l = Math.hypot(dx, dy); sp += "L" + (DIAL.u + dx / l * 22.5).toFixed(2) + " " + (-DIAL.z + dy / l * 22.5).toFixed(2); } sp += ring48(DIAL.r0, DIAL.u, -DIAL.z);
  let ticks = ""; for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU, r0 = i % 3 ? 20.6 : 19.2, r1 = 22.5; ticks += `M${(DIAL.u + r0 * Math.cos(a)).toFixed(2)} ${(-DIAL.z + r0 * Math.sin(a)).toFixed(2)}L${(DIAL.u + r1 * Math.cos(a)).toFixed(2)} ${(-DIAL.z + r1 * Math.sin(a)).toFixed(2)}`; }
  const cells = CELLS.map((s, i) => { const [u, v] = spiralAt(s); return `<rect class="ak-cell" data-part="cell-${i}" x="${(u - 1.5).toFixed(2)}" y="${(v - 1.5).toFixed(2)}" width="3" height="3" rx="0.5"/>`; }).join("");
  const ver = Array.from({ length: 4 }, (_, i) => { const a = -Math.PI / 2 + (i - 1.5) * 0.55; return `<path class="iso-line" data-tone="lo" d="M${(DIAL.u + 4 * Math.cos(a)).toFixed(2)} ${(-106 + 4 * Math.sin(a)).toFixed(2)}L${(DIAL.u + 10.5 * Math.cos(a)).toFixed(2)} ${(-106 + 10.5 * Math.sin(a)).toFixed(2)}"/>`; }).join("");
  return `<g transform="${right(CASE.x1)}">
    <path class="ak-plate" d="M2 -8H40V-124H2Z"/><path class="iso-line" data-tone="faint" d="M4 -10H38V-122H4Z"/>
    <path class="ak-face" d="${circ(22.5, DIAL.u, -DIAL.z)}"/><path class="iso-line" data-tone="mid" d="${ring48(22.5, DIAL.u, -DIAL.z)}"/>
    <path class="iso-line" data-tone="lo" d="${ticks}"/><path class="iso-line" data-tone="mid" d="${sp}"/>${cells}
    <path class="ak-face" d="${circ(10.5, DIAL.u, -106)}"/><path class="iso-line" data-tone="mid" d="${ring48(10.5, DIAL.u, -106)}"/>${ver}<path class="iso-line" data-tone="lo" d="${ring48(4, DIAL.u, -106)}"/>
    <g data-part="ver-hand"></g><g data-part="spiral-hand"></g>
    <path class="iso-line" data-tone="faint" d="M6 -30H36M6 -26H30" data-free=""/>
  </g>`;
})();

// ---------------------------------------------------------------- machine à diviser (établi, devant à droite) et tableau des versions
const DIV = { x: 128, y: 40, r: 20, z: 22 };
const divSvg = (() => {
  const out = [];
  out.push(box(DIV.x - 34, DIV.x + 34, DIV.y - 24, DIV.y + 26, 0, 6, { tone: "lo", bevel: 1 }));
  out.push(S(k.cylinder(DIV.x, DIV.y, 6, 6, DIV.z - 8, P, 18), { tone: "mid" }));
  out.push(S(k.cylinder(DIV.x, DIV.y, DIV.r + 6, 6, 3, P, 48), { tone: "mid" }));                                      // plateau diviseur
  const holes = []; for (let ring = 0; ring < 2; ring++) for (let i = 0; i < (ring ? 46 : 20); i++) { const a = (i / (ring ? 46 : 20)) * TAU, rr = ring ? DIV.r + 3.8 : DIV.r - 1; holes.push(at([DIV.x + rr * Math.cos(a), DIV.y + rr * Math.sin(a), 9])); }
  out.push(D(holes, { size: 0.35, tone: "lo" }));
  // glissière du couteau et son chariot fixe
  out.push(box(DIV.x - 30, DIV.x - 22, DIV.y - 8, DIV.y + 8, 6, 20, { tone: "mid" }));
  out.push(box(DIV.x - 30, DIV.x + 4, DIV.y - 3, DIV.y + 3, 24, 3, { tone: "mid" }));
  // alidade à vis (manivelle de l'opérateur)
  out.push(box(DIV.x + 22, DIV.x + 30, DIV.y + 12, DIV.y + 22, 6, 12, { tone: "mid" }));
  return out.join("");
})();
const BOARD = { x0: 98, x1: 170, y: -46, z0: 6, z1: 70 };
const boardSvg = (() => {
  const out = [box(BOARD.x0, BOARD.x1, BOARD.y - 3, BOARD.y, 0, BOARD.z1, { tone: "lo" })];
  out.push(box(BOARD.x0 - 2, BOARD.x1 + 2, BOARD.y - 5, BOARD.y + 3, 0, 4, { tone: "mid" }));
  const f = front(BOARD.y);
  let pegs = ""; for (let i = 0; i < 4; i++) { const u = BOARD.x0 + 12 + i * 16; pegs += `<path class="ak-gear" d="${circ(1.6, u, -58)}"/>`; }
  out.push(`<g transform="${f}">${pegs}<path class="iso-line" data-tone="faint" d="M${BOARD.x0} -66H${BOARD.x1}M${BOARD.x0} -8H${BOARD.x1}"/></g>`);
  return out.join("");
})();
// plateau des fiches (gauche) : pile d'entrée, boîte du corpus à trois intercalaires
const TRAY = { x: -98, y: 40 };
const traySvg = (() => {
  const out = [box(TRAY.x - 24, TRAY.x + 24, TRAY.y - 18, TRAY.y + 18, 0, 4, { tone: "lo" })];
  for (let i = 0; i < 6; i++) out.push(box(TRAY.x - 18 + i * 0.4, TRAY.x - 2 + i * 0.4, TRAY.y - 12, TRAY.y + 10, 4 + i * 1.2, 1.1, { tone: "hi", crease: "none", bevel: 0.2 }));
  out.push(box(TRAY.x + 4, TRAY.x + 22, TRAY.y - 14, TRAY.y + 14, 4, 12, { tone: "mid" }));
  return out.join("");
})();

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un mécanisme d'Anticythère sur un établi : une fiche entre par la fente, une manivelle fait tourner une grande roue à quatre rayons, deux roues à cheville et coulisse s'accordent, un cadran à spirale prédit douze pages inédites, une machine à diviser taille une dent par correction, la roue neuve entre dans le boîtier et l'ancienne rejoint le tableau des versions ; une roue de 46 dents mène une roue de 20 dents : gain ×2,3.",
  body: [...base, boardSvg, traySvg, caseSvg,
    `<g transform="${front(MECH_Y + 1)}" data-part="gears-back"></g><g transform="${front(MECH_Y + 4)}" data-part="gears"></g>`,
    caseFront, dialSvg,
    `<g data-part="lamps"></g><g data-part="card"></g><g data-part="crank"></g>`,
    divSvg, `<g data-part="div"></g><g data-part="board"></g><g data-part="travel"></g>`],
});

// ---------------------------------------------------------------- vivant
const live = `
const P = ${JSON.stringify(P)};
const GEARS = ${JSON.stringify(GEARS)}, CASE = ${JSON.stringify(CASE)}, DIAL = ${JSON.stringify(DIAL)}, CELLS = ${JSON.stringify(CELLS)}, DIV = ${JSON.stringify(DIV)}, BOARD = ${JSON.stringify(BOARD)};
const LAMPS = ${JSON.stringify(lampsXY)}, MECH_Y = ${MECH_Y};
${LOOP}
const TAU = Math.PI * 2;
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
${gearD.toString()}
const circ = ${circ.toString()};
${wheelSvg.toString()}
const at = (p) => iso(p, P);
const front = (y) => sideMatrix([0, y], 0, P, "left");
const box = (x0, x1, y0, y1, z, h, o = {}) => solidSvg(extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z, h, P, { bevel: o.bevel ?? 0.5 }), { tone: o.tone || "mid", lit: o.lit, crease: o.crease });
const T = { read: [0.5, 4.2], sort: [2.0, 6.0], accord: [6.0, 9.6], infer: [10.0, 15.6], fix: [16.0, 23.0], train: [23.0, 28.0], ship: [28.4, 32.0], rerun: [32.4, 38.0], gain: [36.0, 40.0] }, LOOP_T = 42;
const ERR = [4, 9];
const STATIONS = ["Lecture · Document AI", "Tri des quatre champs · mini-BERT", "Hybride · cheville du modèle dans la coulisse des règles", "Inférence · douze pages inédites au cadran à spirale", "Correction humaine · une dent taillée par erreur", "Corpus et entraînement · la roue neuve se termine", "Publication · la roue neuve entre, l'ancienne passe au tableau des versions", "Nouvel essai · douze pages, douze cases vertes", "Gain · 46 dents mènent 20 dents : ×2,3"];
const TS = [0, 2.0, 6.0, 10.0, 16.0, 23.0, 28.4, 32.4, 36.0];
const stationAt = (s) => { let i = 0; TS.forEach((a, j) => { if (s >= a) i = j; }); return i; };
const parts = {}; for (const n of ["gears", "gears-back", "lamps", "card", "crank", "div", "board", "travel", "ver-hand", "spiral-hand"]) parts[n] = $(n);
const cells = CELLS.map((_, i) => $("cell-" + i));
const FIELDS = ["ak-f0", "ak-f1", "ak-f2", "ak-f3"];
let t = 0, frozen = false, touring = true, idle = 0;

function stateAt(s) {
  const o = {};
  // la manivelle : tourne pendant la lecture, l'inférence et le nouvel essai ; la grande roue suit (16 / 64)
  const crankTurns = 2.0 * ease(seg(s, 0.5, 9.6)) + 3.0 * ease(seg(s, 10.0, 15.6)) + 3.0 * ease(seg(s, 32.4, 40.0));
  o.crank = crankTurns * TAU; o.b1 = -o.crank * GEARS.crank.n / GEARS.b1.n;
  o.idle = -o.b1 * GEARS.b1.n / GEARS.idle.n; o.pin = -o.idle * GEARS.idle.n / GEARS.pin.n;
  // la coulisse suit la cheville quand l'accord est fait ; avant, elle hésite (décalage qui se résorbe)
  const ac = ease(seg(s, T.accord[0], T.accord[1]));
  o.slot = o.pin + (1 - ac) * 0.5 * Math.sin(s * 3);
  o.accord = s > T.accord[0] + 2.4 && s < T.accord[1] + 0.6 || s > T.rerun[0] + 0.8 && s < T.gain[1];
  o.p2 = -o.b1 * GEARS.b1.n / GEARS.p2.n;
  // anneaux du corpus : chaque correction les fait avancer d'un cran ; ils tournent pendant l'entraînement
  const fixes = ERR.map((_, i) => ease(seg(s, T.fix[0] + i * 3.2, T.fix[0] + i * 3.2 + 1.2)));
  o.corpus = [0.6, -0.9, 1.3].map((k2, i) => k2 * (fixes[0] + fixes[1]) * 0.8 + k2 * 2.2 * ease(seg(s, T.train[0], T.train[1])) + i * 0.4);
  // gain : la menante tourne, la menée tourne 46 / 20 fois plus vite
  o.d46 = -0.9 * TAU * ease(seg(s, T.gain[0], T.gain[1])) * 2; o.o20 = -o.d46 * 46 / 20;
  // voyants des champs : allumés quand un rayon passe sous le peigne (en haut de la grande roue)
  o.lamps = [0, 1, 2, 3].map((i) => { const a = ((o.b1 + i * TAU / 4) % TAU + TAU) % TAU, d = Math.abs(((a + Math.PI / 2) % TAU + TAU) % TAU - Math.PI); return (s > 2.0 && s < 9.6) || (s > 32.4 && s < 40) ? (d > Math.PI - 0.5 || s % 46 > 6 ? 1 : 0) : 0; });
  // cadran à spirale : l'aiguille parcourt les douze cases ; premier passage : deux erreurs ; second : tout vert
  const p1 = seg(s, T.infer[0], T.infer[1]), p2 = seg(s, T.rerun[0], T.rerun[1]);
  o.spiral = s < T.rerun[0] ? lerp(0.04, 0.96, p1) : lerp(0.04, 0.96, p2);
  o.cells = CELLS.map((c, i) => {
    const second = s >= T.rerun[0], u = second ? p2 : p1, reached = lerp(0.04, 0.96, u) >= c && (second || s >= T.infer[0]);
    if (!reached) return second || s < T.infer[0] ? 0 : 0;
    if (!second && ERR.includes(i)) { const k2 = ERR.indexOf(i), fixed = s > T.fix[0] + k2 * 3.2 + 1.2; return fixed ? 3 : 2; }
    return 1;
  });
  // machine à diviser : une dent par correction, puis la roue se termine pendant l'entraînement
  const cutTeeth = Math.floor(fixes[0] * 6 + fixes[1] * 6 + 34 * ease(seg(s, T.train[0], T.train[1])));
  o.cut = Math.min(46, cutTeeth); o.index = (o.cut / 46) * TAU;
  o.cutter = (() => { const strokes = []; ERR.forEach((_, i) => strokes.push([T.fix[0] + i * 3.2, T.fix[0] + i * 3.2 + 1.2])); strokes.push([T.train[0], T.train[1]]); let v = 0; for (const [a, b] of strokes) if (s > a && s < b) v = Math.abs(Math.sin((s - a) * 9)); return v; })();
  // publication : la roue neuve monte du plateau jusqu'au boîtier ; l'ancienne roue de gain part au tableau
  o.ship = ease(seg(s, T.ship[0], T.ship[0] + 1.8)); o.old = ease(seg(s, T.ship[0] + 1.2, T.ship[1]));
  o.version = s < T.ship[0] + 2.4 ? 2 : 3;
  // fiche : descend dans la fente au début, une seconde au nouvel essai
  o.card = [ease(seg(s, 0.5, 2.6)), ease(seg(s, 32.4, 34.2))];
  return o;
}

function draw(o, s) {
  const g = GEARS, rot = (gg, a, inner) => '<g transform="translate(' + gg.u + ' ' + (-gg.z) + ') rotate(' + (a * 180 / Math.PI).toFixed(2) + ')">' + inner + '</g>';
  let fr = "";
  fr += rot(g.b1, o.b1, wheelSvg(g.b1, { spokes: FIELDS }));
  fr += rot(g.crank, o.crank, wheelSvg(g.crank));
  fr += rot(g.idle, o.idle, wheelSvg(g.idle));
  fr += rot(g.p2, o.p2, wheelSvg(g.p2));
  fr += rot(g.pin, o.pin, wheelSvg(g.pin) + '<path class="ak-pin" d="' + circ(1.8, 10, 0) + '"/>');
  fr += rot(g.slot, o.slot, wheelSvg(g.slot, { lit: o.accord }) + '<path class="ak-slot" d="M4 -1.6H13.5V1.6H4Z"/>');
  fr += '<g transform="translate(' + g.corpus.u + ' ' + (-g.corpus.z) + ')">' + ['ak-r0', 'ak-r1', 'ak-r2'].map((cls, i) => { const r = 16 - i * 4.6; return '<g transform="rotate(' + (o.corpus[i] * 180 / Math.PI).toFixed(1) + ')"><path class="ak-gear ' + cls + '" d="' + gearD(r, 26 - i * 7, 1.4) + '"/><path class="ak-hole" d="' + circ(r - 2.6) + '"/><path class="ak-mark" d="M' + (r - 2.4) + ' -0.8H' + (r - 0.6) + 'V0.8H' + (r - 2.4) + 'Z"/></g>'; }).join("") + '<path class="ak-axle" d="' + circ(1.2) + '"/></g>';
  fr += rot(g.d46, o.d46, wheelSvg(g.d46));
  fr += rot(g.o20, o.o20, wheelSvg(g.o20, { lit: s > 36 }) + '<path class="ak-hand" d="M-1 0L0 -13L1 0Z"/>');
  // peigne de lecture au-dessus de la grande roue, aiguille d'accord
  fr += '<path class="ak-gear" d="M' + (g.b1.u - 10) + ' ' + (-(g.b1.z + 44)) + 'h20v-3h-20Z"/>' + [0, 1, 2, 3].map((i) => '<path class="ak-gear" d="M' + (g.b1.u - 7.5 + i * 5) + ' ' + (-(g.b1.z + 44)) + 'v5h1.4v-5Z"/>').join("");
  fr += '<g transform="translate(' + (g.slot.u + 14) + ' ' + (-(g.slot.z + 14)) + ')"><path class="ak-face" d="' + circ(3.4) + '"/><path class="' + (o.accord ? 'ak-ok' : 'ak-off') + '" d="' + circ(2) + '"/></g>';
  parts.gears.innerHTML = fr;
  // voyants des champs
  parts.lamps.innerHTML = LAMPS.map((p, i) => { const q = at(p); return '<circle class="ak-lamp ' + (o.lamps[i] ? FIELDS[i] + ' ak-on' : '') + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.6"/>'; }).join("");
  // fiche qui descend dans la fente, avec ses quatre lignes de champs
  parts.card.innerHTML = o.card.map((u, i) => { if (u <= 0 || u >= 1) return ""; const z = CASE.h + 8 + 40 * (1 - u); return box(-46, -24, -22.6, -19.4, z - 30, 30, { tone: "hi", crease: "none", bevel: 0.2 }); }).join("");
  // manivelle : bras et poignée qui sortent vers le spectateur
  const ca = o.crank, cu = g.crank.u, cz = g.crank.z, hx = cu + 14 * Math.cos(ca), hz = cz + 14 * Math.sin(ca);
  parts.crank.innerHTML = '<path class="iso-line" data-tone="hi" d="M' + at([cu, MECH_Y + 6, cz]).join(" ") + 'L' + at([hx, MECH_Y + 6, hz]).join(" ") + '"/>' + solidSvg(cylinder(hx, MECH_Y + 6, 2.2, 0, 0.01, P, 4), { tone: "hi" }).slice(0, 0) + box(hx - 2, hx + 2, MECH_Y + 6, MECH_Y + 16, hz - 2, 4, { tone: "hi", lit: true, bevel: 0.8 });
  // cadran à spirale : aiguille, cases ; cadran des versions
  const [su, sv] = (() => { const a = o.spiral * DIAL.turns * TAU, r = DIAL.r0 + (DIAL.r1 - DIAL.r0) * o.spiral; return [DIAL.u + r * Math.cos(a - Math.PI / 2), -DIAL.z + r * Math.sin(a - Math.PI / 2)]; })();
  parts["spiral-hand"].innerHTML = '<path class="ak-hand" d="M' + DIAL.u + ' ' + (-DIAL.z) + 'L' + su.toFixed(2) + ' ' + sv.toFixed(2) + '"/><path class="ak-gear" d="' + circ(1.6, su, sv) + '"/><path class="ak-axle" d="' + circ(1.1, DIAL.u, -DIAL.z) + '"/>';
  cells.forEach((c, i) => c.setAttribute("class", "ak-cell" + [" ", " ak-ok", " ak-bad", " ak-fixed"][o.cells[i]]));
  const va = -Math.PI / 2 + (o.version - 2.5) * 0.55;
  parts["ver-hand"].innerHTML = '<path class="ak-hand" d="M' + DIAL.u + ' -106L' + (DIAL.u + 8 * Math.cos(va)).toFixed(2) + ' ' + (-106 + 8 * Math.sin(va)).toFixed(2) + '"/><path class="ak-axle" d="' + circ(1, DIAL.u, -106) + '"/>';
  // machine à diviser : roue en cours de taille (horizontale), couteau qui frappe
  const R = DIV.r, wheelPlan = [];
  for (let i = 0; i < 46; i++) { const a = o.index + (i / 46) * TAU, w = TAU / 46, has = i < o.cut, ro = has ? R : R - 1.6, ri = R - 1.6; for (const [rr, f2] of [[ri, 0], [ri, 0.18], [ro, 0.3], [ro, 0.62], [ri, 0.74]]) wheelPlan.push([DIV.x + rr * Math.cos(a + w * f2), DIV.y + rr * Math.sin(a + w * f2)]); }
  const rise = o.ship;
  let dv = "";
  if (rise < 1) {
    const z = DIV.z - 13 + rise * 0;
    dv += solidSvg(extrude(wheelPlan, z, 2.4, P, { bevel: 0.2 }), { tone: "hi", lit: o.cutter > 0, crease: "none" });
    dv += solidSvg(cylinder(DIV.x, DIV.y, 3, z + 2.4, 3, P, 16), { tone: "mid" });
  }
  const cx = DIV.x - R - 6 + o.cutter * 4.5;
  dv += box(cx - 6, cx + 2, DIV.y - 2.5, DIV.y + 2.5, 22, 6, { tone: "mid", bevel: 0.6 }) + box(cx + 1, cx + 5, DIV.y - 1, DIV.y + 1, 22.4, 2, { tone: "hi", lit: o.cutter > 0.5, bevel: 0.2 });
  const ha = (o.cut / 46) * TAU * 4, hx2 = DIV.x + 26 + 6 * Math.cos(ha), hy2 = DIV.y + 17 + 6 * Math.sin(ha);
  dv += '<path class="iso-line" data-tone="hi" d="M' + at([DIV.x + 26, DIV.y + 17, 18.5]).join(" ") + 'L' + at([hx2, hy2, 18.5]).join(" ") + '"/>' + box(hx2 - 1.5, hx2 + 1.5, hy2 - 1.5, hy2 + 1.5, 18.5, 5, { tone: "hi", bevel: 0.6 });
  parts.div.innerHTML = dv;
  // la roue neuve voyage du plateau vers le boîtier ; l'ancienne voyage du boîtier au tableau
  let tr = "";
  if (rise > 0 && rise < 1) { const x = lerp(DIV.x, -35, rise), y = lerp(DIV.y, -21, rise), z = lerp(DIV.z - 13, CASE.h + 9, rise) + 70 * Math.sin(rise * Math.PI * 0.85); tr += solidSvg(cylinder(x, y, DIV.r, z, 2.4, P, 46), { tone: "hi", lit: true }); }
  if (o.old > 0 && o.old < 1) { const x = lerp(CASE.x1 - 20, BOARD.x0 + 12 + 3 * 16, o.old), y = lerp(-10, BOARD.y + 3, o.old), z = lerp(30, 58, o.old) + 20 * Math.sin(o.old * Math.PI); tr += '<g transform="' + front(y) + '"><path class="ak-gear" d="' + gearD(10, 20, 1.2) + '" transform="translate(' + x.toFixed(1) + ' ' + (-z).toFixed(1) + ')"/></g>'; }
  parts.travel.innerHTML = tr;
  // tableau des versions : anciennes roues accrochées ; la dernière arrive à la publication
  let bd = ""; for (let i = 0; i < 4; i++) { if (i === 3 && o.old < 1) continue; const u = BOARD.x0 + 12 + i * 16; bd += '<path class="ak-back" d="' + gearD(10, 20, 1.2) + '" transform="translate(' + (u + 0.8) + ' -57.2)"/><path class="ak-gear' + (i === 3 ? ' ak-lit' : '') + '" d="' + gearD(10, 20, 1.2) + '" transform="translate(' + u + ' -58)"/><path class="ak-axle" d="' + circ(1.6, u, -58) + '"/>'; }
  parts.board.innerHTML = '<g transform="' + front(BOARD.y + 1) + '">' + bd + '</g>';
}
function reading(s) { const i = stationAt(s); const fixed = (s > T.fix[0] + 1.2 ? 1 : 0) + (s > T.fix[0] + 4.4 ? 1 : 0); const ok = s < T.rerun[0] ? (s < T.infer[0] ? 0 : 10 + fixed) : 12; return (i + 1) + " · " + STATIONS[i] + (s >= T.infer[0] ? " · " + ok + "/12" : ""); }
const run = loop((dt, calm) => { if (frozen) return; if (touring) { t = calm ? 38.5 : t + dt; if (t >= LOOP_T) t = 0; } draw(stateAt(t), t); say(reading(t)); });
const jump = (i) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 9000); t = TS[(i + TS.length) % TS.length] + 1.5; run(); };
dragX(() => stationAt(t), (v, share) => { const n = (Math.round(v + share * 9) % 9 + 9) % 9; if (n !== stationAt(t)) jump(n); });
stage.addEventListener("keydown", (e) => { const i = stationAt(t); if (e.key === "ArrowRight") { e.preventDefault(); jump(i + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); jump(i - 1); } });
window.__fig = { at: (s) => { touring = false; frozen = true; t = s; draw(stateAt(s), s); say(reading(s)); return reading(s); }, Ts: TS };
draw(stateAt(0), 0); say(reading(0));
`;

const css = `<style>
.ak-gear{fill:var(--ak-bronze);stroke:var(--anatomy-hi);stroke-width:.35;stroke-linejoin:round}
.ak-back{fill:var(--ak-bronze-d);stroke:none}
.ak-lit{fill:var(--ak-bronze-l)}
.ak-hole{fill:var(--ak-hole);stroke:var(--anatomy-mid);stroke-width:.25}
.ak-axle{fill:var(--anatomy-hi)}
.ak-plate{fill:var(--ak-bronze-d);stroke:var(--anatomy-mid);stroke-width:.4}
.ak-face{fill:var(--anatomy-paper);stroke:none}
.ak-hand{fill:var(--anatomy-lit);stroke:var(--anatomy-lit);stroke-width:.7;stroke-linecap:round}
.ak-pin{fill:var(--anatomy-lit);stroke:var(--anatomy-hi);stroke-width:.3}
.ak-slot{fill:var(--ak-hole);stroke:var(--anatomy-hi);stroke-width:.3}
.ak-mark{fill:var(--anatomy-lit)}
.ak-cell{fill:var(--anatomy-paper);stroke:var(--anatomy-mid);stroke-width:.3}
.ak-cell.ak-ok,.ak-ok{fill:#5fae6e}.ak-cell.ak-bad{fill:#d2452f}.ak-cell.ak-fixed{fill:#e0a33a}.ak-off{fill:var(--anatomy-faint)}
.ak-f0{fill:#d2452f}.ak-f1{fill:#3f6fb0}.ak-f2{fill:#e0b23a}.ak-f3{fill:#3d8f8a}
.ak-r0{fill:#c98a6a}.ak-r1{fill:#8aa3c4}.ak-r2{fill:#c9b26a}
.ak-lamp{fill:var(--anatomy-faint);stroke:var(--anatomy-mid);stroke-width:.5}.ak-lamp.ak-on{stroke:var(--anatomy-hi)}
.iso{--ak-bronze:#7a6a52;--ak-bronze-d:#4a4033;--ak-bronze-l:#a89272;--ak-hole:#1e1b17}
[data-theme="light"]{--ak-bronze:#d9c39a;--ak-bronze-d:#a68e66;--ak-bronze-l:#f2e3c2;--ak-hole:#3a332a}
</style>`;

const plate = k.plateHtml({
  fig: "Fig 11", title: "VRE Studio", hint: "Glisse ou ← → : étape", readout: "1 · Lecture · Document AI",
  keys: [
    { mark: "lit", label: "Ce qui vient d'agir : roue, aiguille, couteau, case du cadran" },
    { mark: "raised", label: "Le boîtier fermé sur trois côtés : tout tourne en local" },
  ],
  caption: "Un mécanisme d'Anticythère pour VRE Studio. La fiche entre par la fente (lecture, Document AI). La grande roue porte quatre rayons de couleur : chacun allume le voyant de son champ en passant sous le peigne (tri, mini-BERT). La cheville du modèle doit tomber dans la coulisse des règles pour que l'aiguille avance (hybride neuro-symbolique). Au dos, le cadran à spirale prédit douze pages inédites : deux cases rouges sont des erreurs (inférence). Chaque erreur corrigée à la main taille des dents sur la roue de la machine à diviser (Human-in-the-Loop) ; les trois anneaux du corpus, image, texte et position, avancent ; la roue se termine (entraînement LayoutLMv3), entre dans le boîtier, et l'ancienne rejoint le tableau des versions (MLOps local). Au nouvel essai, les douze cases sont vertes. Le gain est un vrai rapport d'engrenage : 46 dents mènent 20 dents, 46 / 20 = 2,3. Les erreurs et les cases sont des valeurs d'illustration.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="VRE Studio : flèches gauche et droite pour passer d'une étape à l'autre" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0">${svg}</div>`,
});
writeFigure("vrestudio-anticythere", { title: "VRE Studio · le mécanisme d'Anticythère", plate, live, width: 900, css });

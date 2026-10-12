// Fig 04 · Reporteur Q18 : un fichier rotatif motorisé.
// node figures/build-moteur.mjs  →  figures/moteur.html
// Le rapport SharePoint donne son OT ; on le compose au cadran, le moteur fait tourner le fichier
// jusqu'à la fiche de la bonne ligne Excel, qui s'écarte et se lève ; le tampon y reporte les données
// et, si le rapport en contient, un cavalier Q18 se clipse sur la tranche : les Q18 restent visibles.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 400;
const PLATE = { x: -128, y: -36, w: 236, d: 88, r: 8 };
const AX = { z: 62, r0: 11, r1: 36, half: 26, rows: 36 };      // axe du fichier, rayon des fiches
const STAND = 33, STAND_W = 6, GANTRY_Z = 118;
const MOTOR = { x0: 44, x1: 70, r: 12 };
const STAMP = { w: 20, rest: 24, z0: 96, z1: 106 };
const CONSOLE = { x: -112, y: 14, w: 46, d: 32, r: 2.4 }, CONSOLE_H = 14;
const DIAL = { x: -89, y: 28, r: 11 };
const HOLDER = { x: -60, y: 20, w: 24, d: 8, r: 1.4 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [-STAND - 12, -10, GANTRY_Z + 6], [STAND + 12, 10, GANTRY_Z + 6], [MOTOR.x1, 0, AX.z + MOTOR.r + 4], [0, 0, AX.z + AX.r1 + 12]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 70 },
);
const { at, S, L, D, slab, front, right, flat } = tools(P);
const X = [1, 0, 0], up = [0, 0, 1];
const axis = (x) => G.frameOf([x, 0, AX.z], X, [0, 1, 0], up);

// ---------------------------------------------------------------- bâti, manivelle, moteur
function standSvg(x) {
  const out = [], plan = { x: x - STAND_W / 2, y: -18, w: STAND_W, d: 36, r: 1.2 };
  out.push(S(slab(k.insetPlan(plan, -2), 0, 3, 3, 0.5), { tone: "lo" }));
  out.push(D(k.corners(k.insetPlan(plan, -2), 2).map(([px, py]) => at([px, py, 3])), { size: 0.42 }));
  out.push(S(slab({ x: plan.x, y: -6, w: STAND_W, d: 12, r: 1.2 }, 3, GANTRY_Z - 3, 3, 0.5), { tone: "mid", inner: L(k.sideSeam({ x: plan.x, y: -6, w: STAND_W, d: 12, r: 1.2 }, AX.z - 8, P, 3), { tone: "faint" }) }));
  // Gousset et palier de l'axe.
  out.push(S(slab({ x: plan.x + 0.6, y: -16, w: STAND_W - 1.2, d: 32, r: 1 }, 3, 8, 2, 0.4), { tone: "mid" }));
  const F = axis(x + (x < 0 ? -STAND_W / 2 - 1.6 : STAND_W / 2));
  out.push(S(G.disc(0, 1.6, 6.4, F, P), { tone: "mid" }));
  out.push(D(G.dotsOf(F, 1.6, 4.6, 4, P, { phase: Math.PI / 4 }), { size: 0.4 }));
  return out.join("");
}
function crankSvg() {
  const F = axis(-STAND - STAND_W / 2 - 14);
  return [
    S(G.disc(0, 12.4, 2.4, F, P), { tone: "mid" }),
    S(G.disc(0, 3, 7, F, P), { tone: "mid", inner: L(G.ribsOf(F, 0.4, 2.6, 7, 30, P), { tone: "faint" }) }),
  ].join("");
}
function motorSvg() {
  const out = [], len = MOTOR.x1 - MOTOR.x0;
  out.push(S(slab({ x: MOTOR.x0 + 3, y: -10, w: len - 6, d: 20, r: 1.6 }, 0, 4, 3, 0.5), { tone: "lo" }));
  out.push(S(slab({ x: MOTOR.x0 + 7, y: -4, w: len - 14, d: 8, r: 1 }, 4, AX.z - MOTOR.r - 2, 3, 0.4), { tone: "mid" }));
  const F = axis(MOTOR.x0);
  out.push(S(G.disc(-(MOTOR.x0 - STAND - STAND_W / 2), 0, 3.4, F, P), { tone: "mid" }));
  out.push(S(G.disc(0, 2.4, MOTOR.r + 1, F, P), { tone: "mid" }));
  out.push(S(G.disc(2.4, len - 2.4, MOTOR.r, F, P), { tone: "mid", inner: L(G.ribsOf(F, 2.4, len - 2.4, MOTOR.r, 24, P), { tone: "faint" }) }));
  out.push(S(G.disc(len - 2.4, len, MOTOR.r + 1, F, P), { tone: "mid" }));
  out.push(D(G.dotsOf(F, len, MOTOR.r - 2, 4, P, { phase: Math.PI / 4 }), { size: 0.45 }));
  // Repère d'arbre sur le flasque : il tourne avec le fichier.
  out.push(`<g data-part="shaft-mark"></g>`);
  // Boîte à bornes et câble vers le bâti.
  out.push(S(slab({ x: MOTOR.x0 + 8, y: -5, w: 10, d: 10, r: 1 }, AX.z + MOTOR.r - 1, 5, 2, 0.4), { tone: "mid" }));
  out.push(D([at([MOTOR.x0 + 10, -3, AX.z + MOTOR.r + 4]), at([MOTOR.x0 + 16, 3, AX.z + MOTOR.r + 4])], { size: 0.4 }));
  return out.join("");
}
// Moyeu entre les fiches de l'arrière et celles de l'avant.
function hubSvg(side) {
  const F = axis(-AX.half - 1);
  const gap = STAND - STAND_W / 2 - AX.half - 1;
  if (side === "left") return S(G.disc(-1.6 - gap, -1.6, 2.4, F, P), { tone: "mid" }) + S(G.disc(-1.6, 0, AX.r0 + 2.4, F, P), { tone: "mid" });
  if (side === "right") return S(G.disc(AX.half * 2 + 2, AX.half * 2 + 3.6, AX.r0 + 2.4, F, P), { tone: "mid" }) + D(G.dotsOf(F, AX.half * 2 + 3.6, AX.r0, 6, P), { size: 0.4 }) + S(G.disc(AX.half * 2 + 3.6, AX.half * 2 + 2 + gap, 2.4, F, P), { tone: "mid" });
  return S(G.disc(0, AX.half * 2 + 2, AX.r0, F, P), { tone: "mid", inner: L([0.25, 0.5, 0.75].map((u) => G.arcOf(F, u * (AX.half * 2 + 2), AX.r0, P)).join(""), { tone: "faint" }) });
}

// ---------------------------------------------------------------- portique et tampon
function gantrySvg() {
  const out = [];
  out.push(S(slab({ x: -STAND - 4, y: -4, w: STAND * 2 + 8, d: 8, r: 1.2 }, GANTRY_Z, 5, 3, 0.5), { tone: "mid", inner: L(k.sideSeam({ x: -STAND - 4, y: -4, w: STAND * 2 + 8, d: 8, r: 1.2 }, GANTRY_Z + 2.5, P, 3), { tone: "faint" }) }));
  out.push(D([-STAND, STAND].flatMap((x) => [at([x - 1.6, 2, GANTRY_Z + 5]), at([x + 1.6, -2, GANTRY_Z + 5])]), { size: 0.42 }));
  // Glissière du tampon, vers l'avant.
  out.push(S(slab({ x: -5, y: -2, w: 10, d: STAMP.rest + 14, r: 1 }, GANTRY_Z - 4, 4, 3, 0.4), { tone: "mid" }));
  out.push(L(k.lineOnTop([-2.4, -2], [-2.4, STAMP.rest + 12], GANTRY_Z, P) + k.lineOnTop([2.4, -2], [2.4, STAMP.rest + 12], GANTRY_Z, P), { tone: "faint" }));
  return out.join("");
}
// Tampon dessiné au repos ; il glisse vers −y jusqu'à la fiche.
function stampSvg() {
  const y = STAMP.rest, out = [];
  out.push(S(slab({ x: -7, y: y - 1, w: 14, d: 10, r: 1.2 }, GANTRY_Z - 9, 5, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(0, y + 4, 2.2, STAMP.z1, GANTRY_Z - 9 - STAMP.z1, P, 18), { tone: "mid" }));
  out.push(S(slab({ x: -STAMP.w / 2, y, w: STAMP.w, d: 8, r: 1.2 }, STAMP.z0, STAMP.z1 - STAMP.z0, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: -STAMP.w / 2, y, w: STAMP.w, d: 8, r: 1.2 }, STAMP.z0 + 4, P, 3), { tone: "faint" }) }));
  out.push(S(slab({ x: -STAMP.w / 2 + 1, y: y - 1.4, w: STAMP.w - 2, d: 1.4, r: 0.4 }, STAMP.z0 + 1, STAMP.z1 - STAMP.z0 - 2, 2, 0), { tone: "lo" }));
  return out.join("");
}

// ---------------------------------------------------------------- pupitre : cadran et afficheur
function consoleSvg() {
  const out = [], f = front(CONSOLE.y + CONSOLE.d);
  out.push(`<path class="iso-halo" d="${k.haloOf(CONSOLE, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(CONSOLE, 0, CONSOLE_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(CONSOLE, 3, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(CONSOLE, 3).map(([x, y]) => at([x, y, CONSOLE_H])), { size: 0.42 }));
  const cx = CONSOLE.x + CONSOLE.w / 2;
  out.push(display(f, flat(cx - 19, 4, cx + 19, 11, 1), { part: "ot", x: cx, y: -5.6, size: 5.4, text: "_______" }));
  // Cadran : couronne fixe, disque à dix trous qui tourne, butée.
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r + 1.6, CONSOLE_H, 1, P, 40), { tone: "mid" }));
  out.push(L(k.ring(DIAL.x, DIAL.y, DIAL.r - 6, CONSOLE_H + 1, P, 32), { tone: "faint" }));
  out.push(`<g data-part="dial"></g>`);
  const sa = (Math.PI / 180) * 60;
  out.push(S(k.cylinder(DIAL.x + Math.cos(sa) * (DIAL.r + 0.4), DIAL.y + Math.sin(sa) * (DIAL.r + 0.4), 0.9, CONSOLE_H + 1, 2.4, P, 12), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 3.2, CONSOLE_H + 1, 1.2, P, 20), { tone: "lo" }));
  // Voyant moteur.
  const [lx, ly] = at([cx + 15, CONSOLE.y + 8, CONSOLE_H]);
  out.push(L(k.ring(cx + 15, CONSOLE.y + 8, 2.6, CONSOLE_H, P, 24), { tone: "lo" }), `<circle class="fig-lamp" data-part="lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.4"/>`);
  return out.join("");
}
// Pupitre du rapport : la fiche SharePoint en cours, debout dans sa pince.
function holderSvg() {
  const out = [];
  out.push(S(slab(HOLDER, 0, 4, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: HOLDER.x + 2, y: HOLDER.y + 3.2, w: HOLDER.w - 4, d: 1.4, r: 0.5 }, 4, P, 2), { tone: "lo" }));
  out.push(`<g data-part="report"></g>`);
  out.push(S(slab({ x: HOLDER.x + 8, y: HOLDER.y + 4.8, w: 8, d: 1.6, r: 0.5 }, 4, 6, 2, 0.3), { tone: "mid" }));
  out.push(D([at([HOLDER.x + 12, HOLDER.y + 6.4, 8.4])], { size: 0.45 }));
  return out.join("");
}
const reportSvg = () => {
  const x = HOLDER.x + 2, y = HOLDER.y + 3.6;
  return k.solidSvg(k.extrude([[x, y], [x + 20, y], [x + 20, y + 0.8], [x, y + 0.8]], 4, 28, P, { bevel: 0 }), { tone: "hi" }) +
    `<g transform="${front(y + 0.8)}">${k.lineSvg(`M${x + 3} -27.5h9M${x + 3} -25h13M${x + 3} -22.5h7M${x + 3} -14h14M${x + 3} -11.5h10`, { tone: "lo", free: true })}<path class="iso-line" data-tone="faint" d="${flat(x + 2.4, 17.6, x + 17.6, 21.6, 0.5, 2)}"/></g>`;
};

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un fichier rotatif motorisé sur un établi, sous un portique qui porte un tampon. À gauche, un pupitre à cadran rotatif et une pince tenant le rapport SharePoint. On compose l'OT, le moteur fait tourner le fichier jusqu'à la fiche de la bonne ligne, qui s'écarte et se lève ; le tampon y reporte les données et un cavalier Q18 se clipse sur sa tranche quand le rapport en contient.",
  body: [
    bench(P, PLATE, { strip: { x: -40, y: PLATE.y + PLATE.d - 12, w: 120, d: 7, r: 1 }, label: { x: 48, y: PLATE.y + PLATE.d - 26, w: 46, d: 11, r: 1.2 } }),
    crankSvg(), standSvg(-STAND), hubSvg("left"),
    `<g data-part="back"></g>`, hubSvg("hub"), `<g data-part="front"></g>`,
    hubSvg("right"), standSvg(STAND), motorSvg(), gantrySvg(),
    `<g data-part="stamp">${stampSvg()}</g>`,
    consoleSvg(), holderSvg(),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const AX = ${JSON.stringify(AX)}, STAMP = ${JSON.stringify(STAMP)}, DIAL = ${JSON.stringify(DIAL)}, CONSOLE_H = ${CONSOLE_H}, MOTOR = ${JSON.stringify(MOTOR)};
const REPORT = ${JSON.stringify(reportSvg())};
${LOOP}
// Vrais chiffres : 15 min de report évitées par rapport, valorisées à 104,74 €/h (26,19 €).
// Les OT, les lignes et la part de rapports avec Q18 sont illustratifs.
const SAVED_MIN = 15, EUR = 15 / 60 * 104.74, STEP = 360 / AX.rows, READ = 90;
const hash = (i) => { let h = Math.imul(i + 5, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const ROWS = Array.from({ length: AX.rows }, (_, r) => ({ ot: String(4102000 + r * 24117 + Math.floor(hash(r) * 900)), q18: hash(r + 300) < 0.18 }));
const START_Q18 = ROWS.map((r) => r.q18);
const QUEUE = Array.from({ length: 8 }, (_, i) => ({ row: Math.floor(hash(i + 900) * AX.rows), q18: hash(i + 700) < 0.45 }));
// Une prise en charge : arrivée, sept chiffres composés, rotation, écartement, tampon, cavalier.
const T = { arrive: 0.8, digit: 0.5, spin: 1.8, open: 0.5, stamp: 0.8, tab: 0.6, rest: 1.4 };
const DIALED = 0.8, SPUN = DIALED + 7 * T.digit, OPENED = SPUN + T.spin, STAMPED = OPENED + T.open, TABBED = STAMPED + T.stamp, CLOSED = TABBED + T.tab, END = CLOSED + T.open + T.rest;
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
let job = 0, t = 0, angle = READ, from = READ, touring = true, idle = 0, manual = false, done = 0;
const target = (row) => READ - row * STEP;
const short = (a, b) => b + ((((a - b) % 360) + 540) % 360) - 180;
const V = [depthOf([1, 0, 0], P), depthOf([0, 1, 0], P), depthOf([0, 0, 1], P)];
// Fiche r à l'angle a (degrés), décalée de lift vers l'extérieur.
function cardPaths(a, lift) {
  const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180), r0 = AX.r0 + 1 + lift, r1 = AX.r1 + lift;
  const pt = (x, r) => iso([x, r * c, AX.z + r * s], P);
  const q = [pt(-AX.half, r0), pt(AX.half, r0), pt(AX.half, r1), pt(-AX.half, r1)];
  const d = "M" + q.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
  const n = [0, -s, c], facing = n[1] * V[1] + n[2] * V[2], up = facing > 0 ? c : -c;
  return { d, up, facing, c, s, r1, r0, pt };
}
function cardSvg(r, a, lift, lit, printed, tabDrop) {
  const k = cardPaths(a, lift), fill = { fill: k.d, outline: k.d, shades: ["", k.up > 0.2 ? "" : k.d, "", ""], top: k.up > 0.2 ? k.d : "" };
  let lines = "";
  // Ligne d'en-tête de la fiche (l'OT) et, une fois reportées, les données du rapport.
  const rr = (u) => k.r0 + (k.r1 - k.r0) * u;
  const seg = (x0, x1, u) => { const p = k.pt(x0, rr(u)), q = k.pt(x1, rr(u)); return "M" + p[0].toFixed(1) + " " + p[1].toFixed(1) + "L" + q[0].toFixed(1) + " " + q[1].toFixed(1); };
  lines += seg(-AX.half + 3, -AX.half + 18, 0.84);
  if (printed) lines += [0.64, 0.5, 0.36, 0.22].map((u, i) => seg(-AX.half + 5, -AX.half + 5 + [30, 22, 36, 16][i] * printed, u)).join("");
  let svg = solidSvg(fill, { tone: "hi", lit, crease: "none", inner: k.facing > 0 || lit ? lineSvg(lines, { tone: "lo", free: true }) : "" });
  // Cavalier Q18 : une pince sur la tranche extérieure, près du bord droit.
  if (ROWS[r].q18 || tabDrop !== null) {
    const drop = tabDrop === null ? 0 : (1 - tabDrop) * 14, x0 = AX.half - 12, x1 = AX.half - 4, R1 = k.r1 + drop;
    const cc = k.c, ss = k.s, p = (x, r, t) => [x, r * cc - ss * t, AX.z + r * ss + cc * t];
    const box = [[x0, R1 - 3, -1.2], [x1, R1 - 3, -1.2], [x1, R1 + 3, -1.2], [x0, R1 + 3, -1.2], [x0, R1 - 3, 1.2], [x1, R1 - 3, 1.2], [x1, R1 + 3, 1.2], [x0, R1 + 3, 1.2]].map(([x, r, t]) => iso(p(x, r, t), P));
    const hull = hullPath(box);
    svg += solidSvg({ fill: hull, outline: hull, shades: [hull, "", "", ""], top: "" }, { tone: "hi", crease: "none" });
  }
  return svg;
}
function hullPath(pts) {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of s) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of s.reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const h = lo.slice(0, -1).concat(hi.slice(0, -1));
  return "M" + h.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
}
const back = $("back"), frontG = $("front"), stamp = $("stamp"), dial = $("dial"), ot = $("ot"), lamp = $("lamp"), report = $("report"), mark = $("shaft-mark");
const axisDepth = depthOf([0, 0, AX.z], P);
function holes(rot) {
  const out = [];
  for (let i = 0; i < 10; i++) { const a = (60 + 30 + i * 28 + rot) * Math.PI / 180; out.push(ring(DIAL.x + Math.cos(a) * (DIAL.r - 3), DIAL.y + Math.sin(a) * (DIAL.r - 3), 2, CONSOLE_H + 1, P, 16)); }
  return solidSvg(cylinder(DIAL.x, DIAL.y, DIAL.r, CONSOLE_H + 1, 0.8, P, 40), { tone: "mid", inner: lineSvg(out.join(""), { tone: "lo" }) });
}
function draw() {
  const q = QUEUE[job], row = manual ? null : q.row;
  // Angle du fichier : rotation motorisée vers la ligne demandée.
  if (!manual) { const u = ease((t - SPUN) / T.spin); angle = t < SPUN ? from : from + (short(target(row), from) - from) * u; }
  const open = manual ? 0 : ease((t - OPENED) / T.open) * (1 - ease((t - CLOSED) / T.open));
  const sel = manual ? Math.round(((READ - angle) / STEP % AX.rows + AX.rows) % AX.rows) % AX.rows : row;
  const printed = !manual && t > STAMPED + T.stamp * 0.5 ? 1 : 0;
  if (printed) ROWS[row].printed = true;
  const tabbing = !manual && q.q18 && t > TABBED && t < CLOSED + 0.05 ? ease((t - TABBED) / T.tab) : null;
  if (!manual && q.q18 && t >= CLOSED) ROWS[row].q18 = true;
  const list = [];
  for (let r = 0; r < AX.rows; r++) {
    let a = angle + r * STEP, d = ((a - READ) % 360 + 540) % 360 - 180;
    a = READ + d + Math.sign(d) * 16 * open * Math.max(0, 1 - Math.abs(d) / 60);
    const lift = r === sel ? 10 * open : 0, mid = AX.r0 + 1 + lift + (AX.r1 - AX.r0) / 2;
    const depth = depthOf([0, mid * Math.cos(a * Math.PI / 180), AX.z + mid * Math.sin(a * Math.PI / 180)], P);
    list.push({ r, a, lift, depth });
  }
  list.sort((p, q) => p.depth - q.depth);
  let b = "", f = "";
  for (const c of list) {
    const s = cardSvg(c.r, c.a, c.lift, c.r === sel && (open > 0 || manual), ROWS[c.r].printed ? 1 : 0, c.r === sel ? tabbing : null);
    if (c.depth < axisDepth) b += s; else f += s;
  }
  back.innerHTML = b; frontG.innerHTML = f;
  // Tampon : il avance jusqu'à la fiche levée, presse, revient.
  const press = manual ? 0 : Math.sin(Math.PI * Math.max(0, Math.min(1, (t - STAMPED) / T.stamp)));
  stamp.setAttribute("transform", translateAlong(P, [0, -(STAMP.rest - 1.8) * press, 0]));
  // Cadran : chaque chiffre fait tourner le disque jusqu'à la butée, puis il revient.
  const digits = q.row === undefined ? "" : ROWS[q.row].ot;
  let rot = 0, shown = "_______";
  if (!manual) {
    const k = Math.floor((t - DIALED) / T.digit), u = (t - DIALED) / T.digit - k;
    if (t >= DIALED && k < 7) { const n = +digits[k] || 10; rot = (u < 0.45 ? ease(u / 0.45) : 1 - ease((u - 0.45) / 0.55)) * n * 28; }
    const typed = Math.max(0, Math.min(7, t < DIALED ? 0 : k + (u > 0.45 ? 1 : 0)));
    shown = digits.slice(0, typed).padEnd(7, "_");
  } else shown = ROWS[sel].ot;
  dial.innerHTML = holes(-rot);
  if (ot.textContent !== shown) ot.textContent = shown;
  lamp.dataset.on = String(!manual && t >= SPUN && t < OPENED);
  const sa = angle * Math.PI / 180, F = [MOTOR.x1, 0, AX.z];
  mark.innerHTML = lineSvg(segment([MOTOR.x1, Math.cos(sa) * 2, AX.z + Math.sin(sa) * 2], [MOTOR.x1, Math.cos(sa) * (MOTOR.r - 2.4), AX.z + Math.sin(sa) * (MOTOR.r - 2.4)], P), { tone: "mid" }) + dotsSvg([iso([MOTOR.x1, Math.cos(sa) * 2, AX.z + Math.sin(sa) * 2], P), iso([MOTOR.x1, Math.cos(sa) * (MOTOR.r - 2.4), AX.z + Math.sin(sa) * (MOTOR.r - 2.4)], P)], { size: 0.5 });
  const rise = manual ? 0 : (1 - ease(t / T.arrive)) * 30 + ease((t - END + 0.6) / 0.6) * 30;
  report.innerHTML = '<g transform="' + translateAlong(P, [0, 0, rise]) + '" opacity="' + (1 - rise / 30).toFixed(2) + '">' + REPORT + "</g>";
  const line = "ligne " + (sel + 1);
  if (manual) say(line + " · OT " + ROWS[sel].ot + " · " + (ROWS[sel].q18 ? "Q18 visible" : "sans Q18"));
  else if (t < DIALED + 7 * T.digit) say("Rapport " + (job + 1) + " · OT composé " + shown);
  else if (t < OPENED) say("OT " + digits + " · le moteur cherche la ligne");
  else if (t < TABBED) say("OT " + digits + " → " + line + " · report en cours");
  else say("OT " + digits + " → " + line + " · " + (q.q18 ? "Q18 visible" : "sans Q18") + " · " + SAVED_MIN + " min · " + fr(EUR, 2) + " €");
}
function next(step) {
  from = ((angle % 360) + 360) % 360; job = (job + step + QUEUE.length) % QUEUE.length; t = 0; manual = false;
  if (job === 0) ROWS.forEach((r, i) => { r.q18 = START_Q18[i]; r.printed = false; });
}
const run = loop((dt, calm) => {
  if (manual) { draw(); return; }
  if (calm) t = CLOSED + T.open + 0.1;
  else { t += dt; if (t >= END && touring) { done++; next(1); } else if (t >= END) t = END - 0.01; }
  draw();
});
const steer = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; next(1); }, 6000); };
dragX(() => { steer(); manual = true; return angle; }, (v, share) => { angle = v - share * 240; run(); });
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(); next(to); run(); }
});
// Accès de vérification (captures).
window.__fig = { at: (j, tt) => { touring = false; manual = false; job = j; t = tt; draw(); return readout.textContent; }, T: { SPUN, OPENED, STAMPED, TABBED, CLOSED, END }, QUEUE };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 04",
  title: "Reporteur Q18",
  hint: "Glisse : fichier · ← → : rapport",
  readout: "Rapport 1 · OT composé _______",
  keys: [
    { mark: "lit", label: "La fiche de la bonne ligne du suivi Excel" },
    { mark: "raised", label: "Cavaliers Q18 sur la tranche des fiches, tampon de report sous le portique" },
  ],
  caption: "Chaque rapport SharePoint donne son OT ; le moteur amène la fiche de la bonne ligne, le tampon y reporte les données et le cavalier rend les Q18 visibles pour Power BI, les COSI et les clients de l'ABE SUD IdF. Le report manuel prenait 15 min par rapport : sur 4 000 à 5 000 rapports par an, 1 000 à 1 250 h et 104 740 à 130 925 € à 104,74 €/h. Les OT et les lignes affichés sont illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Fichier rotatif : glisser pour tourner les fiches, flèches pour changer de rapport" aria-valuemin="1" aria-valuemax="36" aria-valuenow="1">${svg}</div>`,
});

writeFigure("moteur", { title: "Reporteur Q18 · fichier rotatif", plate, live });

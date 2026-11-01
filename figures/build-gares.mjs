// Fig 05 · Gares prioritaires : une batterie de colonnes de niveau et un doseur à deux jauges.
// node figures/build-gares.mjs  →  figures/gares.html
// L'armoire du modèle (19 tiroirs pour les 19 tables, 159 picots pour les 159 mesures) calcule un score par gare.
// Le doseur répartit un même volume entre deux jauges, conformité et maintenance : le bouton déplace le liquide de l'une à l'autre.
// Six colonnes montent à la hauteur du score des six gares les mieux classées ; la plus haute allume son voyant.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 640, HEIGHT = 460;
const PLATE = { x: -136, y: -44, w: 272, d: 108, r: 8 };
const WALL = { x: -10, y: -42, w: 142, d: 10, r: 2 }, WALL_H = 96;          // armoire du modèle (fond)
const BLOCK = { x: -10, y: -32, w: 142, d: 34, r: 3 }, BLOCK_H = 22;       // comptoir des colonnes
const GX = [4, 28, 52, 76, 100, 124].map((x) => x - 2);                    // axes des six colonnes
const GAUGE = { w: 16, d: 3.4, y: -20 }, SL = 62, G0 = BLOCK_H + 3;         // plaque, hauteur de l'échelle, pied
const DESK = { x: -128, y: -32, w: 108, d: 66, r: 3 }, DESK_H = 14;        // doseur
const JARS = [-110, -86];                                                   // axes : conformité, maintenance
const JAR_Y = -14, JW = 20;
const KNOB = { x: -98, y: 16, r: 9 };
const ROWS = 6;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(WALL, 0, WALL_H + 4), ...k.boxCorners(DESK, 0, DESK_H + SL + 12)], WIDTH, HEIGHT, { pad: 22, azimuth: 62 });
const { at, S, L, D, slab, front, right, flat } = tools(P);

// ---------------------------------------------------------------- armoire du modèle, comptoir et doseur
function wallSvg() {
  const out = [], f = front(WALL.y + WALL.d);
  out.push(S(slab(WALL, 0, WALL_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(WALL, 22, P, 4), { tone: "faint" }) }));
  // 19 tiroirs (les tables) au-dessus des colonnes, une plaque de serrure.
  const cols = 5, rows = 4, x0 = WALL.x + 6, dw = (WALL.w - 12) / cols, z0 = 56, dh = 9, drawers = [], pulls = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * dw, z = z0 + r * dh, last = r === rows - 1 && c === cols - 1;
    drawers.push(flat(x + 0.6, z + 0.6, x + dw - 0.6, z + dh - 0.6, 0.8, 2));
    if (!last) pulls.push(flat(x + dw / 2 - 3, z + dh / 2 - 0.6, x + dw / 2 + 3, z + dh / 2 + 0.6, 0.5, 2));
  }
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${drawers.join("")}"/><path class="iso-line" data-tone="mid" d="${pulls.join("")}"/></g>`);
  out.push(S(G.disc(0, 1, 2.2, G.frameAlong([x0 + 4.5 * dw, WALL.y + WALL.d, z0 + 3.5 * dh], [0, 1, 0]), P), { tone: "mid" }));
  // 159 picots sur le dessus (les mesures) : trois rangées de 53.
  out.push(S(slab({ x: WALL.x + 4, y: WALL.y + 2, w: WALL.w - 8, d: WALL.d - 4, r: 1 }, WALL_H, 0.8, 2, 0.2), { tone: "lo" }));
  const pins = [], gx = (WALL.w - 16) / 52;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 53; i++) pins.push([WALL.x + 8 + i * gx, WALL.y + 3 + j * 2]);
  out.push(D(pins.map(([x, y]) => at([x, y, WALL_H + 0.8])), { size: 0.4 }));
  return out.join("");
}
function blockSvg() {
  const out = [], f = front(BLOCK.y + BLOCK.d);
  out.push(`<path class="iso-halo" d="${k.haloOf(BLOCK, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(BLOCK, 3), 0, 4, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(BLOCK, 4, BLOCK_H - 4, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(BLOCK, 12, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(BLOCK, 4).map(([x, y]) => at([x, y, BLOCK_H])), { size: 0.42 }));
  // Fenêtres des noms de gare sous chaque colonne.
  GX.forEach((cx, r) => out.push(display(f, flat(cx - 10, 7, cx + 10, 15, 1.2), { part: "name-" + r, x: cx, y: -8.6, size: 4, text: "GARE 00" })));
  out.push(D(GX.flatMap((cx) => [at([cx - 12, BLOCK.y + BLOCK.d, 11]), at([cx + 12, BLOCK.y + BLOCK.d, 11])]), { size: 0.36 }));
  return out.join("");
}
function deskSvg() {
  const out = [], d = DESK, f = front(d.y + d.d);
  out.push(`<path class="iso-halo" d="${k.haloOf(d, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(d, 0, DESK_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(d, 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(d, 3), DESK_H, P, 3), { tone: "faint" }));
  out.push(D(k.corners(d, 5).map(([x, y]) => at([x, y, DESK_H])), { size: 0.42 }));
  // Échelle de 0 à 100 % de conformité sur trois quarts de tour.
  const from = -Math.PI * 0.75, span = Math.PI * 1.5;
  out.push(L(k.onTop(Array.from({ length: 41 }, (_, i) => { const a = from + (i / 40) * span; return [KNOB.x + Math.sin(a) * (KNOB.r + 6), KNOB.y - Math.cos(a) * (KNOB.r + 6)]; }), DESK_H, P), { tone: "lo" }));
  const ticks = k.radialTicks(KNOB.x, KNOB.y, KNOB.r + 6, 20, 2, DESK_H, [1.6, 3], P, from, span);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 1.6, DESK_H, 1, P, 40), { tone: "lo" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1, 6, P, 40, 0.5), { tone: "mid", inner: L(k.knurl(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1, DESK_H + 7, 44, P), { tone: "faint" }) }));
  out.push(`<g data-part="pointer"></g>`);
  // Étiquettes des deux jauges, sur la face avant du doseur.
  JARS.forEach((cx, i) => out.push(display(f, flat(cx - 11, 3.4, cx + 11, 10.6, 1.2), { part: "jar-name-" + i, x: cx, y: -5.4, size: 3.4, text: i ? "MAINT." : "CONFORM." })));
  return out.join("");
}

// ---------------------------------------------------------------- une colonne de niveau : plaque, liquide (dynamique), montants et graduations
// Éprouvette de verre : socle à bouchon-pied, tube transparent à parois visibles, graduations sur le verre, bouchon de tête à col et collier de serrage sur le montant.
function gaugeBack(cx, wid, y, z0, key) {
  const out = [], yc = y + GAUGE.d / 2, r = wid / 2 - 1.2, F = G.frameAlong([cx, yc, z0 - 3], [0, 0, 1]);
  out.push(S(G.disc(0, 3, r + 3.4, F, P), { tone: "lo", inner: k.fadedSvg(G.ribsOf(F, 0, 3, r + 3.4, 28, P, { fade: [0.1, 0.55] }), { tone: "faint" }) }));
  out.push(S(G.disc(3, 5, r + 1.8, F, P), { tone: "mid" }));
  out.push(D(G.dotsOf(F, 3, r + 2.6, 4, P, { phase: 0.78, all: true }), { size: 0.34 }));
  // Fond du verre : un disque clair qui reçoit le liquide.
  out.push(`<g data-part="${key}"></g>`);
  return out.join("");
}
function gaugeFront(cx, wid, y, z0, key, lamp = false) {
  const out = [], yc = y + GAUGE.d / 2, r = wid / 2 - 1.2, yf = yc + r, F = G.frameAlong([cx, yc, z0 + 2], [0, 0, 1]), H = SL + 4;
  // Tube : paroi de verre à contour fin, bord supérieur meulé ; deux montants-guides pour le montage.
  const wall = G.lathe([[0, r], [H, r]], F, P, { fill: "surface" });
  out.push(`<g class="iso-solid fig-glass2">${k.solidSvg(wall, { tone: "hi", className: "fig-glass" })}</g>`);
  out.push(L(G.circleOf(F, H, r, P) + G.circleOf(F, H - 1.6, r - 0.5, P), { tone: "faint" }));
  // Graduations sur le verre : un trait tous les 10 %, un majeur tous les 50 %.
  const minor = [], major = [];
  for (let s = 0; s <= 10; s++) { const z = z0 + 3 + s * (SL / 10), len = s % 5 ? 2.2 : 3.8; (s % 5 ? minor : major).push(k.segment([cx + r - 0.2 - len, yf, z], [cx + r - 0.2, yf, z], P)); }
  out.push(L(minor.join(""), { tone: "lo", free: true }), L(major.join(""), { tone: "mid", free: true }));
  // Collier de serrage sur le tube, deux vis, et bouchon de tête à col.
  const zc = z0 + 2 + H * 0.78;
  out.push(S(G.disc(zc - z0 - 1, zc - z0 + 0.4, r + 0.9, F, P), { tone: "lo" }));
  out.push(D(G.dotsOf(F, zc - z0 - 2, r + 1.4, 3, P, { phase: 0.4, all: true }), { size: 0.32 }));
  out.push(S(G.disc(H, H + 2.4, r + 1.4, F, P), { tone: "mid" }));
  out.push(S(G.disc(H + 2.4, H + 5, r * 0.55, F, P), { tone: "hi" }));
  if (lamp) {
    const [lx, ly] = at([cx, yc, z0 + 2 + H + 7.4]);
    out.push(S(k.cylinder(cx, yc, 2.2, z0 + 2 + H + 5, 1.8, P, 18), { tone: "mid" }));
    out.push(`<circle class="fig-lamp" data-part="${key}-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  }
  if (key.startsWith("col")) out.push(display(front(yf + 0.6), flat(cx - 5.6, z0 + SL + 8.4, cx + 5.6, z0 + SL + 12.8, 0.8), { part: key.replace("col", "score"), x: cx, y: -(z0 + SL + 9.4), size: 3.6, text: "000" }));
  return out.join("");
}
function wallDetail() {
  const out = [], f = right(WALL.x + WALL.w), yf = WALL.y + WALL.d;
  out.push(S(slab({ x: WALL.x - 1.4, y: WALL.y - 1, w: WALL.w + 2.8, d: WALL.d + 2, r: 1.2 }, WALL_H - 3, 3, 3, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: WALL.x - 1.4, y: WALL.y - 1, w: WALL.w + 2.8, d: WALL.d + 2, r: 1.2 }, 0, 4, 3, 0.5), { tone: "lo" }));
  out.push(D([[WALL.x + 6, 50], [WALL.x + WALL.w - 6, 50], [WALL.x + 6, 94], [WALL.x + WALL.w - 6, 94]].map(([x, z]) => at([x, yf, z])), { size: 0.4 }));
  // Fentes d'aération sur le flanc droit et plaque de série.
  const vents = []; for (let i = 0; i < 5; i++) vents.push(flat(-(WALL.y + 2.4 + i * 1.5) - 0.4, 40, -(WALL.y + 2.4 + i * 1.5) + 0.4, 70, 0.4, 2));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  // Règle de score sur le chant du fond : un trait tous les 10 points.
  const ticks = k.topTicks(WALL.x + 6, WALL.x + WALL.w - 6, 7.1, 5, WALL.y + 0.8, WALL_H + 0.8, [0.8, 1.4], P);
  void ticks;
  // Rangée de tiroirs : étiquettes de table, un trait sous chaque poignée.
  const tabs = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if (r * 5 + c < 19) tabs.push(flat(WALL.x + 6 + c * 25.6 + 9, 56 + r * 9 + 1.2, WALL.x + 6 + c * 25.6 + 17, 56 + r * 9 + 2.4, 0.2, 2));
  out.push(`<g transform="${front(yf)}"><path class="iso-line" data-tone="faint" d="${tabs.join("")}"/></g>`);
  return out.join("");
}
function blockDetail() {
  const out = [], f = right(BLOCK.x + BLOCK.w);
  const vents = []; for (let i = 0; i < 6; i++) vents.push(flat(-(BLOCK.y + 5 + i * 4.8) - 0.9, 5, -(BLOCK.y + 5 + i * 4.8) + 0.9, 16, 0.9, 3));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  for (const [x, y] of k.corners(BLOCK, 7)) out.push(S(k.cylinder(x, y + 0, 2.4, BLOCK_H, 0.6, P, 14), { tone: "mid" }));
  // Robinets de purge au pied de chaque colonne : un corps moleté et un levier.
  GX.forEach((cx) => {
    const F = G.frameAlong([cx + 11, GAUGE.y + 1.7, BLOCK_H], [0, 0, 1]);
    out.push(S(G.disc(0, 2.4, 1.8, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 0, 2.4, 1.8, 10, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
    out.push(S(G.disc(2.4, 3.2, 1.1, F, P), { tone: "hi" }));
  });
  return out.join("");
}
function deskDetail() {
  const out = [], d = DESK, f = right(d.x + d.w);
  const vents = []; for (let i = 0; i < 7; i++) vents.push(flat(-(d.y + 8 + i * 6.5) - 1, 3, -(d.y + 8 + i * 6.5) + 1, 11, 1, 3));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  // Pont de transfert sous les deux jauges, deux robinets et un voyant de mélange.
  out.push(S(slab({ x: JARS[0] - 14, y: JAR_Y - 3, w: JARS[1] - JARS[0] + 28, d: 9, r: 1.2 }, DESK_H, 3, 3, 0.5), { tone: "lo" }));
  for (const cx of JARS) {
    const F = G.frameAlong([cx, JAR_Y + 8, DESK_H + 1.6], [0, 1, 0]);
    out.push(S(G.disc(0, 4, 1.8, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 0, 4, 1.8, 10, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  }
  out.push(L(k.planOutline({ x: -122, y: -28, w: 96, d: 4, r: 1 }, DESK_H, P, 2), { tone: "faint" }));
  out.push(D(k.corners({ x: -122, y: -28, w: 96, d: 4 }, 1).map(([x, y]) => at([x, y, DESK_H])), { size: 0.32 }));
  return out.join("");
}

const body = [
  bench(P, PLATE, { strip: { x: -128, y: PLATE.y + PLATE.d - 13, w: 120, d: 7, r: 1 }, label: { x: 40, y: PLATE.y + PLATE.d - 15, w: 46, d: 11, r: 1.2 } }),
  wallSvg(), wallDetail(), blockSvg(), blockDetail(),
  ...GX.flatMap((cx, r) => [gaugeBack(cx, GAUGE.w, GAUGE.y, G0, "col-" + r), gaugeFront(cx, GAUGE.w, GAUGE.y, G0, "col-" + r, r === 0)]),
  deskSvg(), deskDetail(),
  ...JARS.flatMap((cx, i) => [gaugeBack(cx, JW, JAR_Y, DESK_H + 3, "jar-" + i), gaugeFront(cx, JW, JAR_Y, DESK_H + 3, "jar-" + i)]),
];
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Une batterie de six colonnes de niveau devant l'armoire du modèle, et un doseur à deux jauges. Le bouton du doseur répartit un même volume entre la jauge conformité et la jauge maintenance. Chaque colonne monte à la hauteur du score d'une gare ; les six gares les mieux classées sont affichées, la plus haute allume son voyant.",
  body,
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
const KNOB = ${JSON.stringify(KNOB)}, DESK_H = ${DESK_H}, ROWS = ${ROWS}, GX = ${JSON.stringify(GX)}, JARS = ${JSON.stringify(JARS)};
const GAUGE = ${JSON.stringify(GAUGE)}, JAR_Y = ${JAR_Y}, JW = ${JW}, SL = ${SL}, G0 = ${G0};
// Scores illustratifs par gare : risque de conformité et retard de maintenance, sur 100.
// Le temps évité est vrai : 10 à 15 min par consultation, 20 à 30 consultations par jour.
const STATIONS = [["GARE 01", 82, 41], ["GARE 02", 35, 88], ["GARE 03", 64, 66], ["GARE 04", 91, 22], ["GARE 05", 48, 74], ["GARE 06", 27, 59], ["GARE 07", 73, 80], ["GARE 08", 56, 31], ["GARE 09", 40, 93], ["GARE 10", 69, 52]];
let w = 0.5, shownW = 0.5, touring = true, idle = 0, hold = 0, dir = 1;
const rank = (wt) => STATIONS.map(([n, c, m], i) => ({ n, i, s: Math.round(wt * c + (1 - wt) * m) })).sort((a, b) => b.s - a.s || a.i - b.i);
let top = rank(w);
const level = Array.from({ length: ROWS }, (_, r) => top[r].s), jars = [w, 1 - w];
const cols = Array.from({ length: ROWS }, (_, r) => $("col-" + r)), jarGroups = [$("jar-0"), $("jar-1")];
const names = Array.from({ length: ROWS }, (_, r) => $("name-" + r)), scores = Array.from({ length: ROWS }, (_, r) => $("score-" + r)), lamp = $("col-0-lamp");
// Le liquide : une plaque fine qui monte dans la colonne (la première en accent).
const liquid = (cx, wid, y, z0, frac, lit) => frac < 0.004 ? "" : solidSvg(cylinder(cx, y + GAUGE.d / 2, wid / 2 - 2, z0 + 2, Math.max(0.6, frac * SL), P, 28), { tone: "hi", className: "fig-liquid" });
function pointer() {
  const a = -Math.PI * 0.75 + shownW * Math.PI * 1.5, r0 = 2.4, r1 = KNOB.r - 1;
  const p0 = [KNOB.x + Math.sin(a) * r0, KNOB.y - Math.cos(a) * r0, DESK_H + 7], p1 = [KNOB.x + Math.sin(a) * r1, KNOB.y - Math.cos(a) * r1, DESK_H + 7];
  return lineSvg(segment(p0, p1, P), { tone: "hi" }) + dotsSvg([iso(p0, P), iso(p1, P)], { size: 0.6 });
}
const ptr = $("pointer");
const text = (el, s) => { if (el.textContent !== s) el.textContent = s; };
function draw(dt) {
  const k1 = Math.min(1, dt * 7);
  top = rank(shownW);
  jars[0] += (shownW - jars[0]) * k1; jars[1] += ((1 - shownW) - jars[1]) * k1;
  jarGroups.forEach((g, i) => html(g, liquid(JARS[i], JW, JAR_Y, DESK_H + 3, jars[i], false)));
  for (let r = 0; r < ROWS; r++) {
    level[r] += (top[r].s - level[r]) * k1;
    html(cols[r], liquid(GX[r], GAUGE.w, GAUGE.y, G0, level[r] / 100, r === 0));
    text(names[r], top[r].n); text(scores[r], String(top[r].s).padStart(3, " "));
  }
  html(ptr, pointer());
  attr(lamp, "data-on", true);
  const pc = Math.round(w * 100);
  say(pc + " % conformité · " + (100 - pc) + " % maintenance · 1re " + top[0].n + " · " + top[0].s + " pts");
}
const run = loop((dt, calm) => {
  if (touring && !calm) {
    // Tour : le bouton balaie de 20 à 80 % en marquant des pauses.
    if ((hold -= dt) <= 0) { w += dir * dt * 0.08; if (w > 0.8 || w < 0.2) { dir = -dir; w = Math.max(0.2, Math.min(0.8, w)); hold = 2.5; } }
  }
  shownW += (w - shownW) * Math.min(1, dt * 8);
  draw(dt);
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); w = Math.max(0, Math.min(1, next)); run(); };
dragX(() => w, (v, share) => steer(v + share * 1.2));
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: w + 0.1, ArrowLeft: w - 0.1, Home: 0, End: 1 }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(Math.round(to * 10) / 10); }
});
// Accès de vérification (captures).
window.__fig = { at: (ww) => { touring = false; w = shownW = ww; top = rank(w); level.forEach((_, r) => { level[r] = top[r].s; }); jars[0] = w; jars[1] = 1 - w; draw(1); return readout.textContent; } };
draw(1);
`;

const plate = k.plateHtml({
  fig: "Fig 05",
  title: "Gares prioritaires",
  hint: "Glisse ou ← → : pondération",
  readout: "Conformité 50 % · maintenance 50 %",
  keys: [
    { mark: "lit", label: "La colonne et le voyant de la gare la plus prioritaire" },
    { mark: "raised", label: "Armoire du modèle : 19 tiroirs pour les 19 tables, 159 picots pour les 159 mesures" },
  ],
  caption: "Le score de chaque gare mêle risque de conformité et retard de maintenance selon la pondération choisie ; les colonnes affichent aussitôt les six premières. Une consultation prenait 10 à 15 min, 20 à 30 fois par jour : sur 225 jours, 750 à 1 687,5 h et 78 555 à 176 748,75 € par an à 104,74 €/h, valorisation estimative. Noms et scores des gares illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Gares prioritaires : flèches gauche et droite pour changer la pondération" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">${svg}</div>`,
});

writeFigure("gares", { title: "Gares prioritaires · colonnes de niveau", plate, live, css: `<style>.fig-glass .iso-fill{fill:color-mix(in srgb,var(--anatomy-paper) 55%,transparent)}.fig-glass .iso-shade,.fig-glass .iso-top{fill:color-mix(in srgb,var(--anatomy-shade-1) 30%,transparent)}.fig-liquid .iso-fill,.fig-liquid .iso-top{fill:color-mix(in srgb,var(--g) 34%,var(--anatomy-top))}.fig-liquid .iso-shade{fill:color-mix(in srgb,var(--g) 20%,var(--anatomy-shade-1))}.fig-liquid .iso-edge,.fig-liquid .iso-line{stroke:color-mix(in srgb,var(--g) 70%,var(--anatomy-hi))}</style>` });

// Fig 05 · Gares prioritaires : un tableau à palettes piloté par un bouton de pondération.
// node figures/build-gares.mjs  →  figures/gares.html
// L'armoire du modèle (19 tiroirs pour les 19 tables, 159 picots pour les 159 mesures) calcule
// un score par gare ; le bouton dose conformité et maintenance, et les palettes se retournent
// pour afficher le nouveau classement. Le voyant de tête signale la gare la plus prioritaire.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 420;
const PLATE = { x: -134, y: -36, w: 268, d: 100, r: 8 };
const BOARD = { x: -92, y: -22, w: 184, d: 14, r: 2 }, BOARD_Z = [56, 140], FACE = BOARD.y + BOARD.d;
const ROWS = 6, CELL = { w: 8.4, h: 9.4, gap: 1.2 }, ROW_H = 11, TOP_RAIL = 130;
const COLS = { rank: [-80, 2], name: [-54, 7], score: [34, 3] };   // x de départ, nombre de palettes
const LAMP_X = 74;
const DESK = { x: -112, y: 16, w: 74, d: 34, r: 2.4 }, DESK_H = 20;
const KNOB = { x: -75, y: 33, r: 9 };
const CAB = { x: 6, y: 14, w: 96, d: 34, r: 2.4 }, CAB_H = 34;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(BOARD, BOARD_Z[0], BOARD_Z[1] + 12)],
  WIDTH, HEIGHT, { pad: 20, azimuth: 64 },
);
const { at, S, L, D, slab, front, right, flat } = tools(P);
const rowZ = (r) => TOP_RAIL - (r + 1) * ROW_H + 0.8;               // bas de la rangée r

// ---------------------------------------------------------------- tableau et pieds
function postsSvg() {
  const out = [];
  for (const x of [-74, 66]) {
    const plan = { x, y: -18, w: 8, d: 6, r: 1 };
    out.push(S(slab({ x: x - 4, y: -24, w: 16, d: 18, r: 2 }, 0, 3, 3, 0.5), { tone: "lo" }));
    out.push(D(k.corners({ x: x - 4, y: -24, w: 16, d: 18 }, 2.4).map(([px, py]) => at([px, py, 3])), { size: 0.42 }));
    out.push(S(slab(plan, 3, BOARD_Z[0] - 3, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 20, P, 3), { tone: "faint" }) }));
  }
  return out.join("");
}
function boardSvg() {
  const out = [], f = front(FACE);
  out.push(S(slab(BOARD, BOARD_Z[0], BOARD_Z[1] - BOARD_Z[0], 4, 1), { tone: "mid", inner: L(k.sideSeam(BOARD, BOARD_Z[0] + 4, P, 4), { tone: "faint" }) }));
  // Auvent au-dessus du cadran et vis de façade.
  out.push(S(slab({ x: BOARD.x - 3, y: BOARD.y - 1, w: BOARD.w + 6, d: BOARD.d + 7, r: 1.6 }, BOARD_Z[1], 4, 3, 0.6), { tone: "mid" }));
  out.push(D([[BOARD.x + 4, BOARD_Z[0] + 4], [BOARD.x + BOARD.w - 4, BOARD_Z[0] + 4], [BOARD.x + 4, BOARD_Z[1] - 4], [BOARD.x + BOARD.w - 4, BOARD_Z[1] - 4]].map(([x, z]) => at([x, FACE, z])), { size: 0.45 }));
  // Cadre intérieur, rangées, palettes.
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(BOARD.x + 7, TOP_RAIL - ROWS * ROW_H - 1.6, BOARD.x + BOARD.w - 7, TOP_RAIL + 1.6, 1.4, 3)}"/>`);
  const cells = [], splits = [];
  for (let r = 0; r < ROWS; r++) {
    const z0 = rowZ(r);
    for (const [name, [x0, n]] of Object.entries(COLS)) for (let c = 0; c < n; c++) {
      const x = x0 + c * (CELL.w + CELL.gap);
      cells.push(`<path class="iso-fill fig-window" d="${flat(x, z0, x + CELL.w, z0 + CELL.h, 0.8, 2)}"/><path class="iso-line" data-tone="lo" d="${flat(x, z0, x + CELL.w, z0 + CELL.h, 0.8, 2)}"/><rect class="fig-flap" data-cell="${r}-${name}-${c}" x="${x + 0.4}" y="${-(z0 + CELL.h / 2)}" width="${CELL.w - 0.8}" height="${CELL.h / 2 - 0.4}"/><text class="fig-digits" data-cell="${r}-${name}-${c}" x="${x + CELL.w / 2}" y="${-(z0 + 2.2)}" text-anchor="middle" font-size="7.4"> </text>`);
      splits.push(`M${x} ${-(z0 + CELL.h / 2)}h${CELL.w}`);
    }
  }
  out.push(cells.join(""), `<path class="iso-line" data-tone="lo" d="${splits.join("")}"/>`);
  // Rails de rangée entre les lignes.
  const rails = [];
  for (let r = 0; r <= ROWS; r++) rails.push(`M${BOARD.x + 7} ${-(TOP_RAIL - r * ROW_H)}h${BOARD.w - 14}`);
  out.push(`<path class="iso-line" data-tone="faint" d="${rails.join("")}"/></g>`);
  // Voyants de vigilance au bout de chaque rangée.
  for (let r = 0; r < ROWS; r++) {
    const [lx, ly] = at([LAMP_X, FACE, rowZ(r) + CELL.h / 2]);
    out.push(`<g transform="${f}"><circle class="iso-line" data-tone="lo" cx="${LAMP_X}" cy="${-(rowZ(r) + CELL.h / 2)}" r="3" fill="none"/></g><circle class="fig-lamp" data-part="lamp-${r}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.9"/>`);
  }
  return out.join("");
}

// ---------------------------------------------------------------- pupitre de pondération
function deskSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(DESK, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(DESK, 0, DESK_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(DESK, 4, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(DESK, 3), DESK_H, P, 3), { tone: "faint" }));
  out.push(D(k.corners(DESK, 5).map(([x, y]) => at([x, y, DESK_H])), { size: 0.42 }));
  // Échelle de 0 à 100 % de conformité sur un demi-tour, graduée tous les 10 %.
  const from = -Math.PI * 0.75, span = Math.PI * 1.5;
  out.push(L(k.onTop(Array.from({ length: 41 }, (_, i) => { const a = from + (i / 40) * span; return [KNOB.x + Math.sin(a) * (KNOB.r + 6), KNOB.y - Math.cos(a) * (KNOB.r + 6)]; }), DESK_H, P), { tone: "lo" }));
  const ticks = k.radialTicks(KNOB.x, KNOB.y, KNOB.r + 6, 20, 2, DESK_H, [1.6, 3], P, from, span);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r + 1.6, DESK_H, 1, P, 40), { tone: "lo" }));
  out.push(S(k.cylinder(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1, 6, P, 40, 0.5), { tone: "mid", inner: L(k.knurl(KNOB.x, KNOB.y, KNOB.r, DESK_H + 1, DESK_H + 7, 44, P), { tone: "faint" }) }));
  out.push(`<g data-part="pointer"></g>`);
  return out.join("");
}

// ---------------------------------------------------------------- armoire du modèle
function cabinetSvg() {
  const out = [], f = front(CAB.y + CAB.d);
  out.push(`<path class="iso-halo" d="${k.haloOf(CAB, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(CAB, 0, CAB_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(CAB, 3, P, 4), { tone: "faint" }) }));
  // 19 tiroirs (les tables) et une plaque de serrure.
  const cols = 5, rows = 4, dw = (CAB.w - 12) / cols, dh = (CAB_H - 9) / rows, drawers = [], pulls = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = CAB.x + 6 + c * dw, z = 5 + r * dh, last = r === rows - 1 && c === cols - 1;
    drawers.push(flat(x + 0.6, z + 0.6, x + dw - 0.6, z + dh - 0.6, 0.8, 2));
    if (!last) pulls.push(flat(x + dw / 2 - 3, z + dh / 2 - 0.7, x + dw / 2 + 3, z + dh / 2 + 0.7, 0.6, 2));
  }
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${drawers.join("")}"/><path class="iso-line" data-tone="mid" d="${pulls.join("")}"/></g>`);
  const lock = [CAB.x + 6 + 4.5 * dw, CAB.y + CAB.d, 5 + 3.5 * dh];
  out.push(S(G.disc(0, 1, 2.2, G.frameAlong(lock, [0, 1, 0]), P), { tone: "mid" }));
  // 159 picots sur le dessus (les mesures) : 16 × 10 moins un.
  out.push(S(slab({ x: CAB.x + 8, y: CAB.y + 5, w: CAB.w - 16, d: CAB.d - 10, r: 1.4 }, CAB_H, 1, 3, 0.3), { tone: "lo" }));
  const pins = [], gx = (CAB.w - 24) / 15, gy = (CAB.d - 16) / 9;
  for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (i + j * 16 < 159) pins.push([CAB.x + 12 + i * gx, CAB.y + 8 + j * gy]);
  out.push(`<g data-part="pins">${D(pins.map(([x, y]) => at([x, y, CAB_H + 1])), { size: 0.55 })}</g>`);
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un tableau à palettes de gare sur deux pieds, devant lequel un pupitre porte un bouton de pondération et une armoire de dix-neuf tiroirs porte cent cinquante-neuf picots. Le bouton dose conformité et maintenance ; les palettes se retournent pour afficher les six gares les plus prioritaires et leur score, et le voyant de tête signale la première.",
  body: [
    bench(P, PLATE, { strip: { x: -100, y: PLATE.y + PLATE.d - 11, w: 96, d: 7, r: 1 }, label: { x: 30, y: PLATE.y + PLATE.d - 13, w: 46, d: 10, r: 1.2 } }),
    postsSvg(), boardSvg(), deskSvg(), cabinetSvg(),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const KNOB = ${JSON.stringify(KNOB)}, DESK_H = ${DESK_H}, ROWS = ${ROWS}, COLS = ${JSON.stringify(COLS)};
${LOOP}
// Scores illustratifs par gare : risque de conformité et retard de maintenance, sur 100.
// Le temps évité est vrai : 10 à 15 min par consultation, 20 à 30 consultations par jour.
const STATIONS = [["GARE 01", 82, 41], ["GARE 02", 35, 88], ["GARE 03", 64, 66], ["GARE 04", 91, 22], ["GARE 05", 48, 74], ["GARE 06", 27, 59], ["GARE 07", 73, 80], ["GARE 08", 56, 31], ["GARE 09", 40, 93], ["GARE 10", 69, 52]];
const CHARS = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const cells = {};
svg.querySelectorAll("text[data-cell]").forEach((t) => { cells[t.dataset.cell] = { text: t, flap: svg.querySelector('rect[data-cell="' + t.dataset.cell + '"]'), shown: " ", target: " ", next: 0, spins: 0 }; });
let w = 0.5, shownW = 0.5, clock = 0, touring = true, idle = 0, hold = 0, dir = 1;
const rank = (wt) => STATIONS.map(([n, c, m], i) => ({ n, i, s: Math.round(wt * c + (1 - wt) * m) })).sort((a, b) => b.s - a.s || a.i - b.i);
function setTargets() {
  const top = rank(w);
  for (let r = 0; r < ROWS; r++) {
    const row = top[r], parts = { rank: String(r + 1).padStart(2, "0"), name: row.n, score: String(row.s).padStart(3, " ") };
    for (const [name, [, n]] of Object.entries(COLS)) for (let c = 0; c < n; c++) {
      const cell = cells[r + "-" + name + "-" + c], ch = parts[name][c] || " ";
      if (cell.target !== ch) { cell.target = ch; cell.next = clock + r * 0.07 + c * 0.03; cell.spins = 2 + ((r + c) % 3); }
    }
  }
  return top;
}
let top = setTargets();
function flip() {
  for (const key in cells) {
    const cell = cells[key];
    if (cell.shown === cell.target || clock < cell.next) { if (cell.flap.dataset.on) delete cell.flap.dataset.on; continue; }
    // Une palette tombe toutes les 60 ms ; quelques caractères défilent avant le bon.
    cell.flap.dataset.on = "1";
    cell.shown = cell.spins-- > 0 ? CHARS[(CHARS.indexOf(cell.shown) + 1 + Math.floor(Math.random() * 6)) % CHARS.length] : cell.target;
    cell.text.textContent = cell.shown;
    cell.next = clock + 0.06;
  }
}
function pointer() {
  const a = -Math.PI * 0.75 + shownW * Math.PI * 1.5, r0 = 2.4, r1 = KNOB.r - 1;
  const p0 = [KNOB.x + Math.sin(a) * r0, KNOB.y - Math.cos(a) * r0, DESK_H + 7], p1 = [KNOB.x + Math.sin(a) * r1, KNOB.y - Math.cos(a) * r1, DESK_H + 7];
  return lineSvg(segment(p0, p1, P), { tone: "hi" }) + dotsSvg([iso(p0, P), iso(p1, P)], { size: 0.6 });
}
const ptr = $("pointer");
function draw() {
  ptr.innerHTML = pointer();
  for (let r = 0; r < ROWS; r++) $("lamp-" + r).dataset.on = String(r === 0);
  const pc = Math.round(w * 100);
  say(pc + " % conformité · " + (100 - pc) + " % maintenance · 1re " + top[0].n + " · " + top[0].s + " pts");
}
const run = loop((dt, calm) => {
  clock += dt;
  if (touring && !calm) {
    // Tour : le bouton balaie de 20 à 80 % en marquant des pauses.
    if ((hold -= dt) <= 0) { w += dir * dt * 0.08; if (w > 0.8 || w < 0.2) { dir = -dir; w = Math.max(0.2, Math.min(0.8, w)); hold = 2.5; } }
  }
  shownW += (w - shownW) * Math.min(1, dt * 8);
  const before = top.map((t) => t.n + t.s).join();
  const now = rank(w);
  if (now.map((t) => t.n + t.s).join() !== before) top = setTargets();
  flip(); draw();
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); w = Math.max(0, Math.min(1, next)); run(); };
dragX(() => w, (v, share) => steer(v + share * 1.2));
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: w + 0.1, ArrowLeft: w - 0.1, Home: 0, End: 1 }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(Math.round(to * 10) / 10); }
});
// Accès de vérification (captures).
window.__fig = { at: (ww) => { touring = false; w = ww; shownW = ww; top = setTargets(); for (const k in cells) { cells[k].shown = cells[k].target; cells[k].text.textContent = cells[k].target; } draw(); return readout.textContent; } };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 05",
  title: "Gares prioritaires",
  hint: "Glisse ou ← → : pondération",
  readout: "Conformité 50 % · maintenance 50 %",
  keys: [
    { mark: "lit", label: "Le voyant de la gare la plus prioritaire" },
    { mark: "raised", label: "Armoire du modèle : 19 tiroirs pour les 19 tables, 159 picots pour les 159 mesures" },
  ],
  caption: "Le score de chaque gare mêle risque de conformité et retard de maintenance selon la pondération choisie ; le tableau affiche aussitôt les six premières. Une consultation prenait 10 à 15 min, 20 à 30 fois par jour : sur 225 jours, 750 à 1 687,5 h et 78 555 à 176 748,75 € par an à 104,74 €/h, valorisation estimative. Noms et scores des gares illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Gares prioritaires : flèches gauche et droite pour changer la pondération" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">${svg}</div>`,
});

writeFigure("gares", { title: "Gares prioritaires · tableau à palettes", plate, live, css: `<style>.fig-flap{fill:var(--anatomy-shade-1);opacity:0}.fig-flap[data-on]{opacity:1}</style>` });

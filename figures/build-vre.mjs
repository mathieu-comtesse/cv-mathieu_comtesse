// Fig 03 · Extracteur VRE : une trieuse de jetons à quatre tubes.
// node figures/build-vre.mjs  →  figures/vre.html
// Le sélecteur choisit le bâtiment, la trémie lâche les équipements du rapport sur la goulotte,
// chaque jeton tombe dans le premier trou à sa taille : BT31, BT33, BT21, BT11. Les compteurs
// du socle suivent les piles, le voyant confirme les totaux, puis les piles rejoignent le classeur.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 380;
const PLATE = { x: -168, y: -40, w: 280, d: 82, r: 8 };
const BASE = { x: -98, y: -20, w: 166, d: 40, r: 3 }, BASE_H = 16, FACE_Y = BASE.y + BASE.d;
const TX = [-72, -32, 8, 48], R = [4.6, 5.6, 6.6, 7.6], THICK = 2.2;
const CUP_Z = BASE_H, STACK_Z = BASE_H + 3, CAGE_TOP = 78;
const CHUTE = { x0: -134, x1: 78, z0: 98.6, slope: 0.08, half: 9.6 };
const ZR = (x) => CHUTE.z0 - (x - CHUTE.x0) * CHUTE.slope;
const HOPPER = { x: -118, z: 99.6 }, POST_L = { x: -142, y: -4, w: 8, d: 8, r: 1 }, POST_R = { x: 72, y: -4, w: 8, d: 8, r: 1 };
const PANEL = { x: -150, y: 4, w: 24, d: 4, r: 1 }, PANEL_Z = [30, 56], KNOB = { x: -138, z: 43, r: 5.4 };
const LAMP = [60, FACE_Y, 9.5];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [HOPPER.x - 22, -22, HOPPER.z + 30], [HOPPER.x + 22, 22, HOPPER.z + 30], [CHUTE.x1 + 4, 8, ZR(CHUTE.x1) + 6]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 52 },
);
const { at, S, L, D, slab, front, right, flat } = tools(P);
const [vx, vy] = k.towardViewer(P);
const Y = [0, 1, 0], up = [0, 0, 1];
const chuteFrame = (y) => G.frameOf([0, y, 0], Y, [1, 0, 0], up);

// ---------------------------------------------------------------- montants, sélecteur, socle
function postSvg(plan, top) {
  const out = [];
  out.push(S(slab(k.insetPlan(plan, -3), 0, 2, 3, 0.4), { tone: "lo" }));
  out.push(D(k.corners(k.insetPlan(plan, -3), 1.4).map(([x, y]) => at([x, y, 2])), { size: 0.4 }));
  out.push(S(slab(plan, 2, top - 2, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 12, P, 3), { tone: "faint" }) }));
  return out.join("");
}
function selectorSvg() {
  const out = [], f = front(PANEL.y + PANEL.d);
  out.push(S(slab(PANEL, PANEL_Z[0], PANEL_Z[1] - PANEL_Z[0], 3, 0.5), { tone: "mid" }));
  out.push(D([[PANEL.x + 2.4, PANEL_Z[0] + 2.4], [PANEL.x + PANEL.w - 2.4, PANEL_Z[0] + 2.4], [PANEL.x + 2.4, PANEL_Z[1] - 2.4], [PANEL.x + PANEL.w - 2.4, PANEL_Z[1] - 2.4]].map(([x, z]) => at([x, PANEL.y + PANEL.d, z])), { size: 0.42 }));
  // Six positions, une par bâtiment : graduations autour du bouton.
  const ticks = [];
  for (let i = 0; i < 6; i++) {
    const a = ((i - 2.5) * 30 * Math.PI) / 180, r0 = KNOB.r + 1.6, r1 = KNOB.r + (i % 5 ? 3 : 4);
    ticks.push(`M${(KNOB.x + Math.sin(a) * r0).toFixed(2)} ${(-(KNOB.z + Math.cos(a) * r0)).toFixed(2)}L${(KNOB.x + Math.sin(a) * r1).toFixed(2)} ${(-(KNOB.z + Math.cos(a) * r1)).toFixed(2)}`);
  }
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="mid" d="${ticks.join("")}"/><circle class="iso-line" data-tone="faint" cx="${KNOB.x}" cy="${-KNOB.z}" r="${KNOB.r + 1.6}" fill="none"/></g>`);
  const F = G.frameAlong([KNOB.x, PANEL.y + PANEL.d, KNOB.z], Y);
  out.push(S(G.disc(0, 1.2, KNOB.r + 0.8, F, P), { tone: "lo" }));
  out.push(S(G.disc(1.2, 4, KNOB.r, F, P), { tone: "mid", inner: L(G.ribsOf(F, 1.4, 3.8, KNOB.r, 28, P), { tone: "faint" }) }));
  out.push(`<g transform="${front(PANEL.y + PANEL.d + 4)}"><path class="iso-line" data-tone="hi" data-part="pointer" d="" style="stroke-width:1.2"/><circle class="iso-dot" cx="${KNOB.x}" cy="${-KNOB.z}" r="0.8"/></g>`);
  return out.join("");
}
function baseSvg() {
  const out = [], f = front(FACE_Y);
  out.push(`<path class="iso-halo" d="${k.haloOf(BASE, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(BASE, 0, BASE_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BASE, 3, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 3), BASE_H, P, 3), { tone: "faint" }));
  out.push(D(k.corners(BASE, 5).map(([x, y]) => at([x, y, BASE_H])), { size: 0.45 }));
  // Compteurs à deux chiffres sous chaque tube, voyant de contrôle des totaux.
  TX.forEach((x, i) => {
    out.push(display(f, flat(x - 8, 6, x + 8, 13, 1), { part: "count-" + i, x, y: -7.6, size: 5.4, text: "00" }));
    out.push(D([at([x - 10, FACE_Y, 9.5]), at([x + 10, FACE_Y, 9.5])], { size: 0.38 }));
  });
  const [lx, ly] = at(LAMP);
  out.push(`<g transform="${f}"><circle class="iso-line" data-tone="lo" cx="${LAMP[0]}" cy="${-LAMP[2]}" r="3" fill="none"/></g><circle class="fig-lamp" data-part="lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.7"/>`);
  // Tiroir-classeur sur le flanc droit : poignée et fente d'étiquette.
  const side = right(BASE.x + BASE.w);
  out.push(`<g transform="${side}"><path class="iso-line" data-tone="lo" d="${flat(-12, 3.5, 12, 12.5, 1, 3)}"/><path class="iso-line" data-tone="faint" d="${flat(-6, 9.4, 6, 11.2, 0.4, 2)}"/></g>`);
  out.push(S(k.extrude([[BASE.x + BASE.w, -5], [BASE.x + BASE.w + 1.6, -5], [BASE.x + BASE.w + 1.6, 5], [BASE.x + BASE.w, 5]], 5, 2.4, P, { bevel: 0.2 }), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- tubes
const cageR = (i) => R[i] + 1.8;
const rodAngles = [45, 135, 225, 315].map((d) => (d * Math.PI) / 180);
const isFront = (a) => Math.cos(a) * vx + Math.sin(a) * vy > 0;
function rods(i, front) {
  return rodAngles.filter((a) => isFront(a) === front).map((a) => S(k.cylinder(TX[i] + Math.cos(a) * cageR(i), Math.sin(a) * cageR(i), 0.75, STACK_Z, CAGE_TOP - STACK_Z, P, 12), { tone: "mid", crease: "none" })).join("");
}
// La pile n'est visible qu'au-dessus de la coupelle : elle s'y enfonce en fin de rapport.
function clipOf(i) {
  const face = Math.atan2(vy, vx), r = R[i] + 0.2, pts = [];
  for (let s = 0; s <= 24; s++) { const a = face - Math.PI / 2 + (s / 24) * Math.PI; pts.push(at([TX[i] + Math.cos(a) * r, Math.sin(a) * r, STACK_Z])); }
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  return `<clipPath id="tube-${i}"><path d="M${pts.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L")}L${bx.toFixed(1)} ${(by - 140).toFixed(1)}L${ax.toFixed(1)} ${(ay - 140).toFixed(1)}Z"/></clipPath>`;
}
function tubeSvg(i) {
  const x = TX[i], out = [clipOf(i)];
  out.push(S(k.cylinder(x, 0, R[i] + 3, CUP_Z, 3, P, 32, 0.4), { tone: "lo" }));
  out.push(L(k.ring(x, 0, R[i] + 0.6, STACK_Z, P, 32), { tone: "faint" }));
  out.push(rods(i, false));
  out.push(`<g clip-path="url(#tube-${i})"><g data-part="stack-${i}"></g></g><g data-part="fall-${i}"></g>`);
  out.push(rods(i, true));
  out.push(L(k.ring(x, 0, cageR(i), CAGE_TOP, P, 32), { tone: "mid" }));
  out.push(D(rodAngles.map((a) => at([x + Math.cos(a) * cageR(i), Math.sin(a) * cageR(i), CAGE_TOP])), { size: 0.45 }));
  return out.join("");
}

// ---------------------------------------------------------------- goulotte inclinée
const chuteSide = (z0, z1) => [[CHUTE.x0, ZR(CHUTE.x0) + z0], [CHUTE.x1, ZR(CHUTE.x1) + z0], [CHUTE.x1, ZR(CHUTE.x1) + z1], [CHUTE.x0, ZR(CHUTE.x0) + z1]];
function holeLine(i, r) {
  const pts = [];
  for (let s = 0; s <= 32; s++) { const a = (s / 32) * Math.PI * 2, x = TX[i] + Math.cos(a) * r; pts.push(at([x, Math.sin(a) * r, ZR(x) + 0.02])); }
  return k.pathOf(pts, true);
}
function chuteSvg() {
  const out = [];
  out.push(S(G.prismOf(chuteFrame(0), chuteSide(-2, 0), -CHUTE.half, CHUTE.half, P), { tone: "mid" }));
  out.push(S(G.prismOf(chuteFrame(0), chuteSide(-2, 5), -CHUTE.half - 1.4, -CHUTE.half, P), { tone: "mid" }));
  // Trous de tri, du plus petit au plus grand, avec leur chanfrein.
  out.push(`<path class="iso-shade" data-shade="1" d="${TX.map((_, i) => holeLine(i, R[i] + 0.6)).join("")}"/>`);
  out.push(L(TX.map((_, i) => holeLine(i, R[i] + 0.6)).join(""), { tone: "mid" }), L(TX.map((_, i) => holeLine(i, R[i] + 1.5)).join(""), { tone: "faint" }));
  // Rail de guidage le long de la paroi arrière, butée en bout.
  out.push(L(k.pathOf([at([CHUTE.x0 + 4, -CHUTE.half + 1.2, ZR(CHUTE.x0 + 4)]), at([CHUTE.x1 - 2, -CHUTE.half + 1.2, ZR(CHUTE.x1 - 2)])]), { tone: "faint" }));
  out.push(S(G.prismOf(chuteFrame(0), [[CHUTE.x1 - 2, ZR(CHUTE.x1) - 2], [CHUTE.x1, ZR(CHUTE.x1) - 2], [CHUTE.x1, ZR(CHUTE.x1) + 6], [CHUTE.x1 - 2, ZR(CHUTE.x1) + 6]], -CHUTE.half, CHUTE.half, P), { tone: "mid" }));
  return out.join("");
}
function chuteLipSvg() {
  const out = [S(G.prismOf(chuteFrame(0), chuteSide(-2, 2.2), CHUTE.half, CHUTE.half + 1.2, P), { tone: "mid" })];
  const rivets = [];
  for (let x = CHUTE.x0 + 8; x < CHUTE.x1 - 4; x += 22) rivets.push(at([x, CHUTE.half + 1.2, ZR(x) + 0.6]));
  out.push(D(rivets, { size: 0.36 }));
  return out.join("");
}
// Pattes qui portent la goulotte sur ses deux montants.
function bracket(x) { return S(slab({ x: x - 5, y: -CHUTE.half - 1.4, w: 10, d: CHUTE.half * 2 + 2.6, r: 0.6 }, ZR(x) - 4.6, 2.6, 2, 0.3), { tone: "lo" }); }

// ---------------------------------------------------------------- trémie
const HF = G.frameAlong([HOPPER.x, 0, HOPPER.z], up);
const HOP = [[0, 6], [5, 6], [22, 20], [24, 20.4]], HOP_TOP = HOPPER.z + 24;
function hopperSvg() {
  const out = [];
  // Bras de suspension depuis le montant gauche.
  out.push(S(slab({ x: POST_L.x + 1, y: -2, w: 4, d: 4, r: 0.6 }, ZR(CHUTE.x0) - 2, 16, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: POST_L.x + 1, y: -2, w: HOPPER.x - 7.5 - POST_L.x - 1, d: 4, r: 0.6 }, HOPPER.z + 8, 3, 2, 0.3), { tone: "mid" }));
  out.push(S(G.solidOf(HOP, HF, P), { tone: "mid", inner: L(G.arcOf(HF, 13, 6 + (8 / 17) * 14, P), { tone: "faint" }) }));
  out.push(S(G.disc(23.6, 25.2, 21.2, HF, P), { tone: "mid" }));
  out.push(L(k.ring(HOPPER.x, 0, 18, HOP_TOP + 1.2, P, 40), { tone: "lo" }));
  out.push(`<g data-part="heap"></g>`);
  return out.join("");
}

// Jeton couché (disque) centré à l'origine, posé sur z = 0.
const tokenSvg = (i, lit) => k.solidSvg(k.cylinder(0, 0, R[i], 0, THICK, P, 24), { tone: "hi", lit });

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Une trieuse de jetons sur un établi. Un sélecteur choisit le bâtiment, une trémie lâche les équipements du rapport sur une goulotte inclinée percée de quatre trous de taille croissante ; chaque jeton tombe dans le premier trou à sa taille et s'empile dans son tube : BT31, BT33, BT21, BT11. Des compteurs sous les tubes suivent les piles, un voyant confirme les totaux, puis les piles descendent dans le classeur.",
  body: [
    bench(P, PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 12, w: 120, d: 7, r: 1 }, label: { x: 52, y: PLATE.y + PLATE.d - 16, w: 46, d: 11, r: 1.2 } }),
    postSvg(POST_L, ZR(POST_L.x + POST_L.w) - 2), selectorSvg(), baseSvg(),
    ...TX.map((_, i) => tubeSvg(i)),
    postSvg(POST_R, ZR(POST_R.x + POST_R.w / 2) - 4.6),
    bracket(POST_R.x + POST_R.w / 2 - 2), bracket(CHUTE.x0 + 3),
    chuteSvg(), `<g data-part="ride"></g>`, chuteLipSvg(), hopperSvg(),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const TX = ${JSON.stringify(TX)}, R = ${JSON.stringify(R)}, THICK = ${THICK}, STACK_Z = ${STACK_Z}, CHUTE = ${JSON.stringify(CHUTE)}, HOPPER = ${JSON.stringify(HOPPER)}, HOP_TOP = ${HOP_TOP}, KNOB = ${JSON.stringify(KNOB)};
const TOKENS = ${JSON.stringify(TX.map((_, i) => tokenSvg(i, false)))}, TOKENS_LIT = ${JSON.stringify(TX.map((_, i) => tokenSvg(i, true)))};
const ZR = (x) => CHUTE.z0 - (x - CHUTE.x0) * CHUTE.slope;
${LOOP}
// Vrais chiffres : 25 min de comptage évitées par rapport, valorisées à 104,74 €/h (43,64 €).
// Les quantités par bâtiment sont illustratives.
const SAVED_MIN = 25, EUR_PER_REPORT = 25 / 60 * 104.74, FAMILY = ["BT31", "BT33", "BT21", "BT11"];
const BUILDINGS = [["A", [18, 9, 7, 3]], ["B", [12, 6, 4, 0]], ["C", [24, 11, 8, 5]], ["D", [9, 4, 6, 2]], ["E", [15, 7, 5, 4]], ["F", [21, 8, 9, 1]]];
const GAP = 0.3, V0 = 40, ACC = 60, GRAV = 420, VERIFY = 1.2, SINK = 0.9, TURN = 0.9;
const hash = (i) => { let h = Math.imul(i + 11, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
// Un rapport : ses jetons dans un ordre mêlé, chacun avec son départ, son trou et sa chute.
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
let b = 0, t = 0, touring = true, idle = 0, sig = "", reports = 0;
const parts = { ride: $("ride"), heap: $("heap"), pointer: $("pointer"), lamp: $("lamp") };
const stacks = TX.map((_, i) => $("stack-" + i)), falls = TX.map((_, i) => $("fall-" + i)), counts = TX.map((_, i) => $("count-" + i));
const HEAP = [[0, 0], [8, 4], [-8, 3], [3, -9], [-5, -8], [10, -4], [-10, -3], [4, 10], [-3, 7]];
function stackSvg(i, n) {
  if (!n) return "";
  const arcs = []; for (let j = 1; j < n; j++) arcs.push(sideArc(TX[i], 0, R[i], STACK_Z + j * THICK, P, 16));
  return solidSvg(cylinder(TX[i], 0, R[i], STACK_Z, n * THICK, P, 24), { tone: "hi", inner: lineSvg(arcs.join(""), { tone: "faint" }) });
}
function pointerD(k) { const a = (k - 2.5) * 30 * Math.PI / 180; return "M" + KNOB.x + " " + (-KNOB.z) + "L" + (KNOB.x + Math.sin(a) * KNOB.r).toFixed(2) + " " + (-(KNOB.z + Math.cos(a) * KNOB.r)).toFixed(2); }
function draw() {
  const rep = REPORTS[b], tk = rep.tokens, have = [0, 0, 0, 0];
  let ride = "", fall = ["", "", "", ""];
  for (const q of tk) {
    if (t >= q.land) { have[q.f]++; continue; }
    if (t < q.t0) continue;
    const a = t - q.t0;
    if (a < q.ride) {
      const x = HOPPER.x + V0 * a + ACC * a * a / 2;
      ride += '<g transform="' + translateAlong(P, [x, 0, ZR(x)]) + '">' + TOKENS_LIT[q.f] + "</g>";
    } else {
      const u = a - q.ride, z = ZR(TX[q.f]) - GRAV * u * u / 2;
      fall[q.f] += '<g transform="' + translateAlong(P, [TX[q.f], 0, z]) + '">' + TOKENS_LIT[q.f] + "</g>";
    }
  }
  parts.ride.innerHTML = ride;
  falls.forEach((g, i) => { if (g.innerHTML !== fall[i]) g.innerHTML = fall[i]; });
  // Piles et compteurs : redessinés quand une pile change ; en fin de rapport, la pile descend.
  const s = have.join() + "|" + b;
  if (s !== sig) { stacks.forEach((g, i) => { g.innerHTML = stackSvg(i, have[i]); }); sig = s; }
  const sink = t > rep.sink ? Math.min(1, (t - rep.sink) / SINK) : 0;
  stacks.forEach((g, i) => g.setAttribute("transform", sink ? translateAlong(P, [0, 0, -have[i] * THICK * sink * sink - (sink ? 0.01 : 0)]) : ""));
  counts.forEach((c, i) => { const v = String(have[i]).padStart(2, "0"); if (c.textContent !== v) c.textContent = v; });
  const left = tk.filter((q) => t < q.t0).length;
  const heap = HEAP.slice(0, Math.min(HEAP.length, Math.ceil(left / 4))).map(([x, y], j) => '<g transform="' + translateAlong(P, [HOPPER.x + x, y, HOP_TOP + 1.2]) + '">' + TOKENS[(j * 3) % 4] + "</g>").join("");
  if (parts.heap.innerHTML !== heap) parts.heap.innerHTML = heap;
  parts.lamp.dataset.on = String(t >= rep.verify && t < rep.end - TURN);
  // Sélecteur : il tourne vers le bâtiment suivant pendant la dernière phase.
  const turn = t > rep.end - TURN ? ease((t - (rep.end - TURN)) / TURN) : 0;
  parts.pointer.setAttribute("d", pointerD(b + (touring ? turn : 0)));
  const total = have.reduce((a, c) => a + c, 0), name = "Bât. " + BUILDINGS[b][0];
  say(t >= rep.verify
    ? name + " · " + total + " équipements contrôlés · " + SAVED_MIN + " min évitées · " + fr(EUR_PER_REPORT, 2) + " €"
    : name + " · " + FAMILY.map((f, i) => f + " " + have[i]).join(" · "));
}
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const run = loop((dt, calm) => {
  const rep = REPORTS[b];
  if (calm) t = rep.verify + 0.1;
  else { t += dt; if (t >= rep.end) { if (touring) b = (b + 1) % BUILDINGS.length; t = 0; reports++; } }
  draw();
});
const choose = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 6000); b = (next + BUILDINGS.length) % BUILDINGS.length; t = 0; sig = ""; run(); };
dragX(() => b, (v, share) => { const n = (Math.round(v + share * 6) % 6 + 6) % 6; if (n !== b) choose(n); });
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: b + 1, ArrowLeft: b - 1, Enter: b, " ": b }[e.key];
  if (to !== undefined) { e.preventDefault(); choose(to); }
});
// Accès de vérification (captures) : fige le bâtiment et l'instant.
window.__fig = { at: (bb, tt) => { touring = false; b = bb; t = tt; sig = ""; draw(); return readout.textContent; }, REPORTS };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 03",
  title: "Extracteur VRE",
  hint: "Glisse ou ← → : bâtiment",
  readout: "Bât. A · BT31 0 · BT33 0 · BT21 0 · BT11 0",
  keys: [
    { mark: "lit", label: "Les équipements du rapport en route vers leur tube" },
    { mark: "raised", label: "Tubes, de gauche à droite : BT31 disjoncteurs, BT33 fusibles, BT21 éclairage de sécurité, BT11 candélabres" },
  ],
  caption: "Le sélecteur rattache le rapport à son bâtiment ; chaque équipement tombe dans le tube de sa famille, les compteurs suivent les piles et le voyant confirme les totaux avant qu'ils rejoignent le classeur de suivi. Le comptage manuel prenait 25 min par rapport : sur 4 000 à 5 000 rapports par an, 1 667 à 2 083 h et 174 566,67 à 218 208,33 € à 104,74 €/h. Les quantités par bâtiment sont illustratives.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Trieuse VRE : flèches gauche et droite pour changer de bâtiment" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0">${svg}</div>`,
});

writeFigure("vre", { title: "Extracteur VRE · trieuse à quatre tubes", plate, live });

// Fig 08 · Power BI · PP & MOSO : un paternoster de dossiers.
// node figures/build-powerbi.mjs  →  figures/powerbi.html
// Deux gains distincts sur la même machine. À l'arrivée d'un PP, la VM l'extrait et le dépose sur l'étagère qui passe devant elle ; l'ancien
// dossier de cette étagère part aux archives. À chaque consultation, la chaîne monte jusqu'à l'étagère demandée, dont le dossier se lève
// et glisse sur le comptoir. Les dossiers sont des feuilles souples qui ondulent quand la chaîne avance.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP, PAPER } from "./common.mjs";

const WIDTH = 640, HEIGHT = 460;
const PLATE = { x: -134, y: -50, w: 268, d: 112, r: 8 };
const LOOPG = { R: 24, z0: 34, z1: 98 }, H = LOOPG.z1 - LOOPG.z0, LEN = 2 * H + 2 * Math.PI * LOOPG.R, SHELVES = 12, SP = LEN / SHELVES;
const FRAME = { x: -40, w: 80, d: 22 }, TOP = LOOPG.z1 + LOOPG.R + 14;
const BASE = { x: -48, y: -14, w: 96, d: 28, r: 3 }, BASE_H = 20;
const COUNTER = { x: 54, y: 6, w: 44, d: 28, r: 2 }, COUNTER_Z = 40;
const VM = { x: -92, y: -12, w: 30, d: 24, r: 2 }, VM_H = 70;
const ARCHIVE = { x: -112, y: 18, w: 34, d: 26, r: 2 };
const S_COUNTER = H * 0.35, S_VM = H + Math.PI * LOOPG.R + H * 0.4;     // arcs du comptoir (montée) et de la VM (descente)
const FH = 13, FW = 11;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(BASE, 0, TOP + 8), ...k.boxCorners(VM, 0, VM_H + 22)], WIDTH, HEIGHT, { pad: 22, azimuth: 58 });
const { at, S, L, D, slab, front, right, flat } = tools(P);

// Point de la boucle à l'abscisse curviligne s : montée à droite, arc du haut, descente à gauche, arc du bas.
function pathAt(s) {
  const { R, z0, z1 } = LOOPG; s = ((s % LEN) + LEN) % LEN;
  if (s < H) return [R, z0 + s];
  if (s < H + Math.PI * R) { const a = (s - H) / R; return [R * Math.cos(a), z1 + R * Math.sin(a)]; }
  if (s < 2 * H + Math.PI * R) return [-R, z1 - (s - H - Math.PI * R)];
  const a = (s - 2 * H - Math.PI * R) / R; return [-R * Math.cos(a), z0 - R * Math.sin(a)];
}
const loopPts = (y, n = 90) => Array.from({ length: n }, (_, i) => { const [x, z] = pathAt(i / n * LEN); return at([x, y, z]); });

// ---------------------------------------------------------------- socle, montants, chaîne
function baseSvg() {
  const out = [], b = BASE, f = front(b.y + b.d), r = right(b.x + b.w);
  out.push(`<path class="iso-halo" d="${k.haloOf(b, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(b, 3), 0, 3, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(b, 3, BASE_H - 3, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(b, 9, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(b, 4).map(([x, y]) => at([x, y, BASE_H])), { size: 0.42 }));
  out.push(display(f, flat(-40, 6, -6, 14, 1.2), { part: "vm", x: -23, y: -9.6, size: 5, text: "PRÊTE" }));
  out.push(display(f, flat(6, 6, 40, 14, 1.2), { part: "ask", x: 23, y: -9.6, size: 5, text: "PP ----" }));
  out.push(D([-44, -2, 2, 44].map((x) => at([x, b.y + b.d, 10])), { size: 0.34 }));
  const vents = []; for (let i = 0; i < 5; i++) vents.push(flat(-(b.y + 5 + i * 5) - 1, 4, -(b.y + 5 + i * 5) + 1, 15, 1, 3));
  out.push(`<g transform="${r}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  const [vx, vy] = at([-26, b.y + b.d, 17]), [ax, ay] = at([26, b.y + b.d, 17]);
  out.push(`<circle class="fig-lamp" data-part="vm-lamp" cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="1.1"/><circle class="fig-lamp" data-part="ask-lamp" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="1.1"/>`);
  return out.join("");
}
function postsSvg() {
  const out = [];
  for (const x of [FRAME.x - 3, FRAME.x + FRAME.w - 3]) {
    const pl = { x, y: -FRAME.d / 2, w: 6, d: FRAME.d, r: 1 };
    out.push(S(slab({ x: x - 2, y: -FRAME.d / 2 - 2, w: 10, d: FRAME.d + 4, r: 1.4 }, BASE_H, 2.4, 3, 0.4), { tone: "lo" }));
    out.push(S(slab(pl, BASE_H + 2.4, TOP - BASE_H - 2.4, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(pl, 60, P, 3), { tone: "faint" }) }));
    out.push(D([at([x + 3, FRAME.d / 2, BASE_H + 7]), at([x + 3, FRAME.d / 2, TOP - 8]), at([x + 3, FRAME.d / 2, 60])], { size: 0.38 }));
  }
  out.push(S(slab({ x: FRAME.x - 4, y: -FRAME.d / 2 - 1, w: FRAME.w + 8, d: FRAME.d + 2, r: 1.4 }, TOP, 3.6, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: FRAME.x - 4, y: -FRAME.d / 2 - 1, w: FRAME.w + 8, d: FRAME.d + 2, r: 1.4 }, TOP + 1.8, P, 3), { tone: "faint" }) }));
  return out.join("");
}
function chainSvg(y) {
  // Deux flasques de pignon aux extrémités de la boucle, la chaîne et ses maillons (points).
  const out = [], { R, z0, z1 } = LOOPG;
  for (const z of [z0, z1]) {
    const F = G.frameAlong([0, y - 0.8, z], [0, 1, 0]);
    out.push(S(G.disc(0, 1.6, 9, F, P), { tone: "lo", inner: k.fadedSvg(G.ribsOf(F, 0, 1.6, 9, 24, P, { fade: [0.1, 0.55] }), { tone: "faint" }) }));
    out.push(S(G.disc(1.6, 2.6, 4, F, P), { tone: "hi" }));
  }
  const pts = loopPts(y, 120);
  out.push(`<path class="iso-line" data-tone="mid" d="M${pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L")}Z" style="stroke-width:1.6" data-free="end"/>`);
  out.push(D(loopPts(y, 60), { size: 0.4 }));
  return out.join("");
}
function counterSvg() {
  const out = [], c = COUNTER;
  // Comptoir : plateau, pieds, lèvre, rail d'arrivée du dossier.
  out.push(S(slab(c, COUNTER_Z - 2.4, 2.4, 3, 0.5), { tone: "mid" }));
  for (const [x, y] of k.corners(c, 3)) out.push(S(k.cylinder(x, y, 1.8, 0, COUNTER_Z - 2.4, P, 14), { tone: "lo" }));
  out.push(S(slab({ x: c.x, y: c.y + c.d - 1.6, w: c.w, d: 1.6, r: 0.4 }, COUNTER_Z, 3, 2, 0.2), { tone: "mid" }));
  out.push(D([at([c.x + 3, c.y + c.d, COUNTER_Z + 3]), at([c.x + c.w - 3, c.y + c.d, COUNTER_Z + 3])], { size: 0.34 }));
  out.push(`<g data-part="counter"></g>`);
  return out.join("");
}
function stationSvg() {
  const out = [], vm = VM;
  // Poste de la VM : pupitre, écran, bras de dépôt jusqu'à la chaîne.
  out.push(S(slab(vm, 0, VM_H - 8, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(vm, 20, P, 3), { tone: "faint" }) }));
  out.push(S(slab({ x: vm.x - 1.4, y: vm.y - 1.4, w: vm.w + 2.8, d: vm.d + 2.8, r: 1.6 }, VM_H - 8, 4, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners(vm, 3).map(([x, y]) => at([x, y, VM_H - 4])), { size: 0.38 }));
  out.push(`<g transform="${front(vm.y + vm.d)}"><path class="iso-line" data-tone="lo" d="${flat(vm.x + 4, 8, vm.x + vm.w - 4, 30, 1.4, 3)}"/></g>`);
  out.push(S(slab({ x: vm.x + vm.w, y: -3, w: FRAME.x - 3 - vm.x - vm.w + 6, d: 6, r: 0.8 }, VM_H - 8, 3, 2, 0.3), { tone: "mid" }));
  // Caisse d'archives : cuve ouverte et ses dossiers.
  const a = ARCHIVE;
  out.push(S(slab(a, 0, 2, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: a.x, y: a.y, w: a.w, d: 1.6, r: 0.4 }, 2, 12, 2, 0.2), { tone: "mid" }), S(slab({ x: a.x, y: a.y, w: 1.6, d: a.d, r: 0.4 }, 2, 12, 2, 0.2), { tone: "mid" }));
  out.push(`<g data-part="archive"></g>`);
  out.push(S(slab({ x: a.x, y: a.y + a.d - 1.6, w: a.w, d: 1.6, r: 0.4 }, 2, 12, 2, 0.2), { tone: "mid" }), S(slab({ x: a.x + a.w - 1.6, y: a.y, w: 1.6, d: a.d, r: 0.4 }, 2, 12, 2, 0.2), { tone: "mid" }));
  out.push(D([at([a.x + 3, a.y + a.d, 12]), at([a.x + a.w - 3, a.y + a.d, 12])], { size: 0.34 }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un paternoster de dossiers : une chaîne en boucle monte à droite et descend à gauche, avec douze étagères de trois dossiers souples. À gauche, la VM dépose le nouveau PP sur l'étagère qui passe devant elle et l'ancien part dans la caisse d'archives ; à droite, quand on demande un PP, la chaîne amène son étagère devant le comptoir et le dossier glisse dessus.",
  body: [
    bench(P, PLATE, { strip: { x: -126, y: PLATE.y + PLATE.d - 13, w: 140, d: 7, r: 1 }, label: { x: 66, y: PLATE.y + PLATE.d - 17, w: 46, d: 11, r: 1.2 } }),
    stationSvg(), baseSvg(), postsSvg(), chainSvg(-FRAME.d / 2 + 3), `<g data-part="shelves"></g>`, chainSvg(FRAME.d / 2 - 3), counterSvg(), `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
${PAPER}
const LG = ${JSON.stringify(LOOPG)}, H = ${H}, LEN = ${LEN}, SHELVES = ${SHELVES}, SP = ${SP}, COUNTER = ${JSON.stringify(COUNTER)}, COUNTER_Z = ${COUNTER_Z}, VM = ${JSON.stringify(VM)}, VM_H = ${VM_H}, ARCHIVE = ${JSON.stringify(ARCHIVE)}, S_COUNTER = ${S_COUNTER}, S_VM = ${S_VM}, FH = ${FH}, FW = ${FW};
function pathAt(s) {
  const { R, z0, z1 } = LG; s = ((s % LEN) + LEN) % LEN;
  if (s < H) return [R, z0 + s];
  if (s < H + Math.PI * R) { const a = (s - H) / R; return [R * Math.cos(a), z1 + R * Math.sin(a)]; }
  if (s < 2 * H + Math.PI * R) return [-R, z1 - (s - H - Math.PI * R)];
  const a = (s - 2 * H - Math.PI * R) / R; return [-R * Math.cos(a), z0 - R * Math.sin(a)];
}
// Vrais chiffres. Consultation : 10 min évitées × 40 consultations par jour = 6 h 40, 698,27 €.
// Traitement : 15 à 20 min évitées par PP (extraction VM, rangement SharePoint, archivage), 400 à 500 PP par an.
// Horaires des demandes et numéros de PP illustratifs.
const RATE = 104.74, CONSULT_MIN = 10, PER_DAY = 40, START = 480, END = 1020, SPEED = 6, TIERS = 3;
const hash = (i) => { let h = Math.imul(i + 9, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
let next = 2400; const stock = Array.from({ length: TIERS }, () => Array.from({ length: SHELVES }, () => next++));
const START_STOCK = stock.map((t) => [...t]);
const ASKS = Array.from({ length: PER_DAY }, (_, i) => ({ at: START + (i + 0.5) * (END - START) / PER_DAY + (hash(i) - 0.5) * 6, tier: Math.floor(hash(i + 50) * TIERS), pocket: Math.floor(hash(i + 90) * SHELVES) }));
const DEPOSITS = [{ at: 600, tier: 2 }, { at: 870, tier: 1 }];
let m = START, touring = true, idle = 0, hold = 0, archived = [];
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
// La chaîne n'avance que dans un sens : chaque demande amène l'étagère voulue devant le comptoir en 4 min de modèle.
function advAt(t) {
  let a = 0;
  for (const q of ASKS) { if (t < q.at) break; const want = S_COUNTER - q.pocket * SP, d = ((want - a) % LEN + LEN) % LEN; a += d * ease((t - q.at) / 4); }
  return a;
}
const shelfSvgs = (adv, spd, now, active, lift) => {
  const items = [];
  for (let p = 0; p < SHELVES; p++) {
    const [x, z] = pathAt(p * SP + adv);
    let g = solidSvg(slabOf({ x: x - 9, y: -7, w: 18, d: 14, r: 0.8 }, z - 1.6, 1.6, P, 2, 0.2), { tone: "mid" }) + solidSvg(slabOf({ x: x - 9, y: 5.4, w: 18, d: 1.6, r: 0.3 }, z, 3.4, P, 2, 0.1), { tone: "mid" });
    for (let i = 0; i < TIERS; i++) {
      const mine = active && active.tier === i && active.pocket === p, up = mine ? lift : 0;
      g += paperSvg(paperRows({ c: [x + (i - 1) * 5.4, 0, z + 0.8 + FH / 2 + up * 7], d: [0, 0, 1], w: [0, 1, 0], L: FH, W: FW, curl: (i % 2 ? 1 : -1) * 0.05, wave: 0.35 + spd * 1.4, roll: 0.25 + spd * 0.8, ph: p * 1.3 + i, t: now, NT: 6 }), { head: true, lit: mine && lift > 0.4 });
    }
    items.push({ x, svg: g });
  }
  return items.sort((a, b) => a.x - b.x).map((q) => q.svg).join("");
};
function draw(now) {
  const adv = advAt(m), spd = Math.min(1, Math.abs(advAt(m + 0.05) - advAt(m - 0.05)) * 1.6), active = ASKS.find((q) => m >= q.at && m < q.at + 14), dep = DEPOSITS.find((d) => m >= d.at && m < d.at + 10);
  stock.forEach((t, i) => t.forEach((_, p) => { t[p] = START_STOCK[i][p]; })); archived = [];
  let nextId = 2400 + TIERS * SHELVES;
  for (const d of DEPOSITS) { if (m < d.at + 6) break; const p = ((Math.round((S_VM - advAt(d.at)) / SP) % SHELVES) + SHELVES) % SHELVES; archived.push(stock[d.tier][p]); stock[d.tier][p] = nextId++; }
  const lift = active ? Math.sin(Math.PI * Math.max(0, Math.min(1, (m - active.at - 4) / 9))) : 0;
  html($("shelves"), shelfSvgs(adv, spd, now, active, lift));
  // Dossier demandé : il glisse de l'étagère au comptoir ; le dépôt vole de la VM à l'étagère, l'ancien à la caisse.
  let air = "", counter = "";
  const doc = (c, curl, wave, lit) => paperSvg(paperRows({ c, d: [0, 0, 1], w: [0, 1, 0], L: FH, W: FW, curl, wave, roll: wave * 0.6, ph: next, t: now, NT: 6 }), { head: true, lit });
  if (active && lift > 0.05) {
    const [sx, sz] = pathAt(active.pocket * SP + adv), v = ease((m - active.at - 9) / 5), c = [sx + (COUNTER.x + COUNTER.w / 2 - sx) * v, (COUNTER.y + COUNTER.d / 2) * v, sz + 8 + (COUNTER_Z + 8 - sz - 8) * v];
    if (v > 0) air += doc(c, -0.06 * Math.sin(v * Math.PI), 1.2 * Math.sin(v * Math.PI), true);
  }
  if (active && m - active.at > 12) counter = doc([COUNTER.x + COUNTER.w / 2, COUNTER.y + COUNTER.d / 2, COUNTER_Z + 3.8 + FH / 2 - 3], 0.05, 0.25, true);
  if (dep) {
    const u = (m - dep.at) / 10, [sx, sz] = pathAt(S_VM - 0 + 0), vm = [VM.x + VM.w / 2, VM.y + VM.d / 2, VM_H + 8], side = [sx, 0, sz + 8], ar = [ARCHIVE.x + 14, ARCHIVE.y + 12, 8];
    const fly = (from, to, v) => from.map((x, j) => x + (to[j] - x) * ease(v)).map((x, j) => j === 2 ? x + 24 * Math.sin(Math.PI * Math.max(0, Math.min(1, v))) : x);
    if (u < 0.6) air += doc(fly(vm, side, u / 0.6), -0.07, 1.1, true);
    if (u > 0.4) air += doc(fly(side, ar, (u - 0.4) / 0.6), -0.07, 1.1, true);
  }
  html($("air"), air); html($("counter"), counter);
  html($("archive"), archived.map((_, i) => paperSvg(paperRows({ c: [ARCHIVE.x + 6 + i * 6, ARCHIVE.y + 12, 2 + FH / 2], d: [0, 0, 1], w: [0, 1, 0], L: FH, W: FW, curl: 0.04, wave: 0.2, ph: i * 2, t: now, NT: 5 }), { head: true })).join(""));
  const vmText = dep ? ((m - dep.at) < 5 ? "EXTRAIT" : "RANGÉ") : "PRÊTE";
  if ($("vm").textContent !== vmText) $("vm").textContent = vmText;
  attr($("vm-lamp"), "data-on", !!dep);
  const ask = active ? "PP " + stock[active.tier][active.pocket] : "PP ----";
  if ($("ask").textContent !== ask) $("ask").textContent = ask;
  attr($("ask-lamp"), "data-on", !!active);
  const n = ASKS.filter((q) => m >= q.at + 13).length, mins = n * CONSULT_MIN, h = Math.floor(mins / 60), mm = mins % 60;
  const clock = String(Math.floor(Math.min(m, END) / 60)).padStart(2, "0") + ":" + String(Math.floor(Math.min(m, END) % 60)).padStart(2, "0");
  if (dep) say(clock + " · PP rangé, ancien archivé · 15–20 min évitées");
  else say(clock + " · " + n + " consultation" + (n > 1 ? "s" : "") + " · " + (h ? h + " h" + (mm ? " " + String(mm).padStart(2, "0") : "") : mm + " min") + " rendues · " + fr(n * CONSULT_MIN / 60 * RATE, 2) + " €");
}
const run = loop((dt, calm) => {
  if (calm) m = END;
  else if (touring) { if (m < END + 10) m += dt * SPEED; else if ((hold += dt) > 4) { m = START; hold = 0; } }
  draw(performance.now() / 1000);
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); m = Math.max(START, Math.min(END + 10, next)); run(); };
dragX(() => m, (v, share) => steer(v + share * 540));
stage.addEventListener("keydown", (e) => { const to = { ArrowRight: m + 30, ArrowLeft: m - 30, Home: START, End: END + 10 }[e.key]; if (to !== undefined) { e.preventDefault(); steer(to); } });
window.__fig = { at: (t) => { touring = false; m = t; draw(1); return readout.textContent; }, ASKS, DEPOSITS };
draw(1);
`;

const plate = k.plateHtml({
  fig: "Fig 08",
  title: "Power BI · PP & MOSO",
  hint: "Glisse ou ← → : heure",
  readout: "08:00 · 0 consultation",
  keys: [
    { mark: "lit", label: "Le dossier demandé, du paternoster au comptoir" },
    { mark: "raised", label: "À gauche, la VM range et archive ; à droite, le comptoir" },
  ],
  caption: "Deux gains distincts. Le traitement : extraction par la VM, rangement SharePoint et archivage automatique évitent 15 à 20 min par PP, soit 100 à 167 h et 10 474 à 17 456,67 € par an pour 400 à 500 PP. La consultation : le plan, son PDF et son échéance se retrouvent en quelques secondes au lieu de 10 min, 40 fois par jour, soit 6 h 40 et 698,27 € par jour, à 104,74 €/h. Horaires et numéros de PP illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Power BI PP et MOSO : flèches gauche et droite pour avancer l'heure" aria-valuemin="480" aria-valuemax="1020" aria-valuenow="480">${svg}</div>`,
});

writeFigure("powerbi", { title: "Power BI · paternoster de dossiers", plate, live });

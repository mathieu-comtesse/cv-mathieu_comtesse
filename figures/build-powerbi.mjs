// Fig 08 · Power BI · PP & MOSO : un classeur rotatif vertical.
// node figures/build-powerbi.mjs  →  figures/powerbi.html
// Deux gains distincts sur la même machine. À l'arrivée d'un PP, la VM l'extrait et le range dans
// la case du carrousel tournée vers elle ; l'ancien dossier de cette case part aux archives.
// À chaque consultation, le carrousel tourne jusqu'au dossier demandé, qui sort devant le comptoir.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 400;
const PLATE = { x: -118, y: -70, w: 236, d: 150, r: 8 };
const CAR = { r: 36, hub: 6, tiers: [6, 38, 70], shelf: 2.4, pockets: 12, top: 102 };
const BINDER = { r0: 10, r1: 33, t: 3.4, h: 25 };
const VM = { x: -110, y: -16, w: 30, d: 34, r: 2 }, VM_H = 26;
const ARCHIVE = { x: 64, y: -64, w: 40, d: 30, r: 2 }, ARCHIVE_H = 18;
const COUNTER = { x: -40, y: 50, w: 80, d: 22, r: 2.4 }, COUNTER_H = 18;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [0, 0, CAR.top + 14], [-CAR.r, 0, CAR.top + 6], [CAR.r, 0, CAR.top + 6], [VM.x, VM.y, VM_H + 6]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 48, elevation: 32 },
);
const { at, S, L, D, slab, front, right, flat } = tools(P);
const Z = [0, 0, 1];

// ---------------------------------------------------------------- carrousel : socle, plateaux, colonne
function baseSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: -CAR.r, y: -CAR.r, w: CAR.r * 2, d: CAR.r * 2, r: CAR.r }, 0, 2, P)}"/>`);
  out.push(S(k.cylinder(0, 0, CAR.r + 4, 0, 3, P, 64, 0.6), { tone: "lo" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + 0.2; return at([Math.cos(a) * (CAR.r + 2), Math.sin(a) * (CAR.r + 2), 3]); }), { size: 0.42 }));
  out.push(S(k.cylinder(0, 0, 12, 3, 3, P, 40, 0.4), { tone: "mid" }));
  return out.join("");
}
const shelfSvg = (z) => S(k.cylinder(0, 0, CAR.r, z, CAR.shelf, P, 72, 0.5), { tone: "mid", inner: L(k.ring(0, 0, CAR.r - 3, z + CAR.shelf, P, 64), { tone: "faint" }) });
const columnSvg = (z0, z1) => S(k.cylinder(0, 0, CAR.hub, z0, z1 - z0, P, 32), { tone: "mid" });
function capSvg() {
  const z = CAR.top;
  return [
    S(k.cylinder(0, 0, CAR.r + 1, z, 3, P, 72, 0.6), { tone: "mid", inner: L(k.ring(0, 0, CAR.r - 4, z + 3, P, 64), { tone: "faint" }) }),
    S(k.cylinder(0, 0, 9, z + 3, 4, P, 40, 0.4), { tone: "mid", inner: L(k.knurl(0, 0, 9, z + 3, z + 7, 40, P), { tone: "faint" }) }),
    D([at([0, 0, z + 7])], { size: 0.6 }),
  ].join("");
}

// ---------------------------------------------------------------- VM, archives, comptoir
function vmSvg() {
  const out = [], v = VM;
  out.push(S(slab(v, 0, VM_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(v, 6, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(v, 3), VM_H, P, 3), { tone: "faint" }));
  out.push(S(slab({ x: v.x + 7, y: v.y + v.d / 2 - 2, w: v.w - 14, d: 4, r: 1 }, VM_H, 1.2, 3, 0.2), { tone: "mid" }));
  const slots = [];
  for (let i = 0; i < 5; i++) slots.push(flat(v.x + 4 + i * 6, 3, v.x + 7.4 + i * 6, 12, 1.2, 3));
  out.push(`<g transform="${front(v.y + v.d)}"><path class="iso-line" data-tone="lo" d="${slots.join("")}"/></g>`);
  out.push(display(right(v.x + v.w), flat(-v.y - v.d + 4, 15, -v.y - 4, 22, 1), { part: "vm", x: -v.y - v.d / 2, y: -16.6, size: 4.6, text: "PRÊTE" }));
  const [lx, ly] = at([v.x + v.w - 4, v.y + 4, VM_H]);
  out.push(`<circle class="fig-lamp" data-part="vm-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.3"/>`);
  return out.join("");
}
function archiveSvg(part) {
  const out = [], a = ARCHIVE, w = 1.6;
  if (part === "back") {
    out.push(S(slab(a, 0, 2, 3, 0.4), { tone: "lo" }));
    out.push(S(slab({ x: a.x, y: a.y, w: a.w, d: w, r: 0.5 }, 2, ARCHIVE_H - 2, 2, 0.3), { tone: "mid" }));
    out.push(S(slab({ x: a.x, y: a.y, w, d: a.d, r: 0.5 }, 2, ARCHIVE_H - 2, 2, 0.3), { tone: "mid" }));
    out.push(`<g data-part="archive"></g>`);
    return out.join("");
  }
  out.push(S(slab({ x: a.x + a.w - w, y: a.y, w, d: a.d, r: 0.5 }, 2, ARCHIVE_H - 2, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: a.x, y: a.y + a.d - w, w: a.w, d: w, r: 0.5 }, 2, ARCHIVE_H - 2, 2, 0.3), { tone: "mid" }));
  out.push(`<g transform="${front(a.y + a.d)}"><path class="iso-line" data-tone="lo" d="${flat(a.x + a.w / 2 - 7, 9, a.x + a.w / 2 + 7, 13, 1, 3)}"/></g>`);
  return out.join("");
}
function counterSvg() {
  const out = [], c = COUNTER;
  out.push(`<path class="iso-halo" d="${k.haloOf(c, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(c, 0, COUNTER_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(c, 4, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: c.x - 2, y: c.y - 2, w: c.w + 4, d: c.d + 3, r: 2 }, COUNTER_H, 2, 3, 0.5), { tone: "mid" }));
  out.push(display(front(c.y + c.d + 1), flat(c.x + 8, 6, c.x + c.w - 8, 13, 1.2), { part: "ask", x: c.x + c.w / 2, y: -7.6, size: 5.2, text: "PP ----" }));
  // Bouton d'appel et voyant de consultation.
  out.push(S(k.cylinder(c.x + c.w - 12, c.y + c.d / 2, 3.4, COUNTER_H + 2, 1.6, P, 24, 0.3), { tone: "mid" }));
  const [lx, ly] = at([c.x + 10, c.y + c.d / 2, COUNTER_H + 2]);
  out.push(L(k.ring(c.x + 10, c.y + c.d / 2, 2.6, COUNTER_H + 2, P, 20), { tone: "lo" }), `<circle class="fig-lamp" data-part="ask-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.4"/>`);
  out.push(D(k.corners({ x: c.x - 2, y: c.y - 2, w: c.w + 4, d: c.d + 3 }, 2.4).map(([x, y]) => at([x, y, COUNTER_H + 2])), { size: 0.4 }));
  return out.join("");
}

// ---------------------------------------------------------------- étages du carrousel (dynamiques)
const tiersSvg = CAR.tiers.map((z, i) => `${shelfSvg(z)}<g data-part="back-${i}"></g>${columnSvg(z + CAR.shelf, (CAR.tiers[i + 1] ?? CAR.top))}<g data-part="front-${i}"></g>`).join("");

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un classeur rotatif vertical à trois étages de douze cases, entre une VM qui extrait et range les plans de prévention, une caisse d'archives et un comptoir de consultation. À chaque consultation, le carrousel tourne jusqu'au dossier demandé, qui sort devant le comptoir ; à chaque dépôt, la VM range le nouveau PP et l'ancien part aux archives.",
  body: [
    bench(P, PLATE, { strip: { x: -100, y: PLATE.y + PLATE.d - 11, w: 52, d: 7, r: 1 }, label: { x: 58, y: PLATE.y + PLATE.d - 14, w: 46, d: 10, r: 1.2 } }),
    vmSvg(), archiveSvg("back"), archiveSvg("front"), baseSvg(), tiersSvg, capSvg(), `<g data-part="air"></g>`, counterSvg(),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const CAR = ${JSON.stringify(CAR)}, BINDER = ${JSON.stringify(BINDER)}, VM = ${JSON.stringify(VM)}, VM_H = ${VM_H}, ARCHIVE = ${JSON.stringify(ARCHIVE)}, COUNTER = ${JSON.stringify(COUNTER)};
${LOOP}
// Vrais chiffres. Consultation : 10 min évitées × 40 consultations par jour = 6 h 40, 698,27 €.
// Traitement : 15 à 20 min évitées par PP (extraction VM, rangement SharePoint, archivage), 400 à 500 PP par an.
// Horaires des demandes et numéros de PP illustratifs.
const RATE = 104.74, CONSULT_MIN = 10, PER_DAY = 40, START = 480, END = 1020, SPEED = 6;
const hash = (i) => { let h = Math.imul(i + 9, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const STEP = 2 * Math.PI / CAR.pockets, FRONT = Math.atan2(COUNTER.y + COUNTER.d / 2, COUNTER.x + COUNTER.w / 2), SIDE = Math.atan2(VM.y + VM.d / 2, VM.x + VM.w / 2);
const V = [depthOf([1, 0, 0], P), depthOf([0, 1, 0], P), depthOf([0, 0, 1], P)];
// Stock : un numéro de PP par case ; les nouveaux remplacent les anciens.
let next = 2400; const stock = CAR.tiers.map(() => Array.from({ length: CAR.pockets }, () => next++));
const START_STOCK = stock.map((t) => [...t]);
const ASKS = Array.from({ length: PER_DAY }, (_, i) => ({ at: START + (i + 0.5) * (END - START) / PER_DAY + (hash(i) - 0.5) * 6, tier: Math.floor(hash(i + 50) * 3), pocket: Math.floor(hash(i + 90) * CAR.pockets) }));
const DEPOSITS = [{ at: 600, tier: 2 }, { at: 870, tier: 1 }];
let m = START, rot = 0, touring = true, idle = 0, hold = 0, archived = [];
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Rotation du carrousel : chaque demande amène sa case devant le comptoir en 4 min de modèle.
function rotationAt(t) {
  let a = 0;
  for (const q of ASKS) { if (t < q.at) break; const want = FRONT - q.pocket * STEP, d = wrap(want - a); a += d * ease((t - q.at) / 4); }
  return a;
}
function boxPath(c) {
  const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], ctr = c.reduce((s, p) => s.map((v, i) => v + p[i] / 8), [0, 0, 0]);
  const pts = c.map((p) => iso(p, P)), hull = convexHull(pts), d = (f) => "M" + f.map((i) => pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1)).join("L") + "Z";
  const shades = ["", "", "", ""]; let top = "";
  for (const f of faces.slice(1)) {
    const fc = f.reduce((s, i) => s.map((v, j) => v + c[i][j] / 4), [0, 0, 0]), n = fc.map((v, j) => v - ctr[j]);
    if (n[0] * V[0] + n[1] * V[1] + n[2] * V[2] <= 0) continue;
    if (n[2] > 0.5) top += d(f); else shades[Math.abs(n[0]) > Math.abs(n[1]) ? 1 : 2] += d(f);
  }
  const h = "M" + hull.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
  return { fill: h, outline: h, shades, top };
}
// Classeur dans la case p de l'étage i, à l'angle a, sorti de out unités.
function binder(z, a, out, lit) {
  const c = Math.cos(a), s = Math.sin(a), pc = -s, ps = c, r0 = BINDER.r0 + out, r1 = BINDER.r1 + out, t = BINDER.t / 2;
  const ring = [[r0, -t], [r1, -t], [r1, t], [r0, t]].map(([r, w]) => [r * c + w * pc, r * s + w * ps]);
  const corners = [...ring.map(([x, y]) => [x, y, z]), ...ring.map(([x, y]) => [x, y, z + BINDER.h])];
  // Porte-étiquette sur le dos du classeur, seulement quand le dos regarde le lecteur.
  const back = c * V[0] + s * V[1] > 0, e = 1.1, lab = [[-e, BINDER.h - 9], [e, BINDER.h - 9], [e, BINDER.h - 3], [-e, BINDER.h - 3]].map(([w, h]) => iso([r1 * c + w * pc, r1 * s + w * ps, z + h], P));
  const label = back ? "M" + lab.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L") + "Z" : "";
  return solidSvg(boxPath(corners), { tone: "hi", lit, crease: "none", inner: label ? lineSvg(label, { tone: "lo" }) : "" });
}
function divider(z, a) {
  const c = Math.cos(a), s = Math.sin(a), pc = -s, ps = c, t = 0.5;
  const ring = [[CAR.hub, -t], [CAR.r - 1, -t], [CAR.r - 1, t], [CAR.hub, t]].map(([r, w]) => [r * c + w * pc, r * s + w * ps]);
  return solidSvg(boxPath([...ring.map(([x, y]) => [x, y, z]), ...ring.map(([x, y]) => [x, y, z + 8])]), { tone: "mid", crease: "none" });
}
const axisDepth = depthOf([0, 0, 0], P);
function draw() {
  const a0 = rotationAt(m), active = ASKS.find((q) => m >= q.at && m < q.at + 14), dep = DEPOSITS.find((d) => m >= d.at && m < d.at + 10);
  // Le dépôt : la case tournée vers la VM reçoit le nouveau PP, l'ancien part aux archives.
  const done = DEPOSITS.filter((d) => m >= d.at + 6);
  stock.forEach((t, i) => t.forEach((_, p) => { t[p] = START_STOCK[i][p]; }));
  archived = [];
  let nextId = 2400 + CAR.tiers.length * CAR.pockets;
  for (const d of DEPOSITS) { if (m < d.at + 6) break; const p = ((Math.round(wrap(SIDE - rotationAt(d.at)) / STEP) % CAR.pockets) + CAR.pockets) % CAR.pockets; archived.push(stock[d.tier][p]); stock[d.tier][p] = nextId++; }
  CAR.tiers.forEach((z0, i) => {
    const z = z0 + CAR.shelf, items = [];
    for (let p = 0; p < CAR.pockets; p++) {
      const a = a0 + p * STEP, aDiv = a + STEP / 2, mine = active && active.tier === i && active.pocket === p;
      const out = mine ? 16 * Math.sin(Math.PI * Math.max(0, Math.min(1, (m - active.at - 4) / 9))) : 0;
      const depth = depthOf([Math.cos(a) * (20 + out), Math.sin(a) * (20 + out), 0], P);
      items.push({ depth, svg: binder(z, a, out, mine && out > 0.5) });
      items.push({ depth: depthOf([Math.cos(aDiv) * 20, Math.sin(aDiv) * 20, 0], P), svg: divider(z, aDiv) });
    }
    items.sort((p, q) => p.depth - q.depth);
    $("back-" + i).innerHTML = items.filter((x) => x.depth < axisDepth).map((x) => x.svg).join("");
    $("front-" + i).innerHTML = items.filter((x) => x.depth >= axisDepth).map((x) => x.svg).join("");
  });
  // Vol du dépôt : de la VM vers la case, puis l'ancien vers la caisse d'archives.
  let air = "";
  if (dep) {
    const u = (m - dep.at) / 10, side = [Math.cos(SIDE) * 30, Math.sin(SIDE) * 30, CAR.tiers[dep.tier] + 8], vm = [VM.x + VM.w / 2, VM.y + VM.d / 2, VM_H + 2], ar = [ARCHIVE.x + 14, ARCHIVE.y + 12, 4];
    const fly = (from, to, v) => from.map((x, j) => x + (to[j] - x) * ease(v)).map((x, j) => j === 2 ? x + 30 * Math.sin(Math.PI * Math.max(0, Math.min(1, v))) : x);
    const box = (p) => '<g transform="' + translateAlong(P, p) + '">' + solidSvg(slabOf({ x: -6, y: -2, w: 12, d: 4, r: 0.4 }, 0, 14, P, 2, 0.2), { tone: "hi" }) + "</g>";
    if (u < 0.6) air += box(fly(vm, side, u / 0.6));
    if (u > 0.4) air += box(fly(side, ar, (u - 0.4) / 0.6));
  }
  $("air").innerHTML = air;
  $("archive").innerHTML = archived.map((_, i) => '<g transform="' + translateAlong(P, [ARCHIVE.x + 6 + i * 6, ARCHIVE.y + 6, 2]) + '">' + solidSvg(slabOf({ x: 0, y: 0, w: 4, d: 16, r: 0.4 }, 0, 12, P, 2, 0.2), { tone: "hi" }) + "</g>").join("");
  const vmText = dep ? ((m - dep.at) < 5 ? "EXTRAIT" : "RANGÉ") : "PRÊTE";
  if ($("vm").textContent !== vmText) $("vm").textContent = vmText;
  $("vm-lamp").dataset.on = String(!!dep);
  const ask = active ? "PP " + stock[active.tier][active.pocket] : "PP ----";
  if ($("ask").textContent !== ask) $("ask").textContent = ask;
  $("ask-lamp").dataset.on = String(!!active);
  const n = ASKS.filter((q) => m >= q.at + 13).length, mins = n * CONSULT_MIN, h = Math.floor(mins / 60), mm = mins % 60;
  const clock = String(Math.floor(Math.min(m, END) / 60)).padStart(2, "0") + ":" + String(Math.floor(Math.min(m, END) % 60)).padStart(2, "0");
  if (dep) say(clock + " · PP rangé, ancien archivé · 15–20 min évitées");
  else say(clock + " · " + n + " consultation" + (n > 1 ? "s" : "") + " · " + (h ? h + " h" + (mm ? " " + String(mm).padStart(2, "0") : "") : mm + " min") + " rendues · " + fr(n * CONSULT_MIN / 60 * RATE, 2) + " €");
}
const run = loop((dt, calm) => {
  if (calm) m = END;
  else if (touring) { if (m < END + 10) m += dt * SPEED; else if ((hold += dt) > 4) { m = START; hold = 0; } }
  draw();
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); m = Math.max(START, Math.min(END + 10, next)); run(); };
dragX(() => m, (v, share) => steer(v + share * 540));
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: m + 30, ArrowLeft: m - 30, Home: START, End: END + 10 }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(to); }
});
// Accès de vérification (captures).
window.__fig = { at: (t) => { touring = false; m = t; draw(); return readout.textContent; }, ASKS, DEPOSITS };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 08",
  title: "Power BI · PP & MOSO",
  hint: "Glisse ou ← → : heure",
  readout: "08:00 · 0 consultation",
  keys: [
    { mark: "lit", label: "Le dossier demandé, sorti devant le comptoir" },
    { mark: "raised", label: "Carrousel : trois étages de douze cases ; VM à gauche, archives à droite" },
  ],
  caption: "Deux gains distincts. Le traitement : extraction par la VM, rangement SharePoint et archivage automatique évitent 15 à 20 min par PP, soit 100 à 167 h et 10 474 à 17 456,67 € par an pour 400 à 500 PP. La consultation : le plan, son PDF et son échéance se retrouvent en quelques secondes au lieu de 10 min, 40 fois par jour, soit 6 h 40 et 698,27 € par jour, à 104,74 €/h. Horaires et numéros de PP illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Carrousel PP et MOSO : flèches gauche et droite pour avancer d'une demi-heure" aria-valuemin="480" aria-valuemax="1030" aria-valuenow="480">${svg}</div>`,
});

writeFigure("powerbi", { title: "Power BI · PP & MOSO · carrousel", plate, live });

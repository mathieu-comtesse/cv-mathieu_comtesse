// Fig 02 · VRE traités par VM : deux pointeuses et une seule clé.
// node figures/build-vm.mjs  →  figures/vm.html
// Les demandes déposées attendent dans le casier de gauche. Toutes les deux minutes, la
// pointeuse qui tient la clé relève la plus ancienne, lit R004 et l'OT à sept chiffres,
// inscrit le lien, puis la range dans l'historique (un doublon part à la corbeille).
// À 17 h, l'imprimante sort le récapitulatif. Touche P : panne de la VM 1 (scénario à concevoir).
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure } from "./common.mjs";
import { LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 380;
const PLATE = { x: -192, y: -44, w: 384, d: 92, r: 8 };
const CARD = { w: 16, h: 27 };
const RACK_Y = -10, LIP_Y = -1.6;                       // fond du casier, devant de la lèvre
const IN = { x: -184, cols: 4, pitch: 19 };             // file d'attente
const OUT = { x: 44, cols: 6, pitch: 19 };              // historique
const POCKET_Z = 16, LIP_H = 10, RACK_H = 58;
const VM = [{ x: -94 }, { x: -26 }].map((v) => ({ ...v, w: 54, cx: v.x + 27 }));
const BODY = { y: -22, d: 34 }, FACE_Y = BODY.y + BODY.d, TOPZ = 92;
const DIAL = { z: 66, r: 14 };
const KEYHOLE = (cx) => [cx + 17, FACE_Y, 44];
const BIN = { x: 104, y: 14, w: 32, d: 20, r: 1.4 }, BIN_H = 13;
const PRINTER = { x: 144, y: 10, w: 32, d: 26, r: 2 }, PRINTER_H = 16;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [VM[0].x, BODY.y, TOPZ + 34], [VM[1].x + 54, BODY.y, TOPZ + 34], [OUT.x + 110, RACK_Y, RACK_H + 40]],
  WIDTH, HEIGHT, { pad: 24, azimuth: 58 },
);
const { at, S, L, D, slab, front, right, flat } = tools(P);
const pocketX = (rack, i) => rack.x + 4 + i * rack.pitch + (rack.pitch - CARD.w) / 2;

// ---------------------------------------------------------------- casiers
function rackSvg(rack, part) {
  const out = [], w = rack.cols * rack.pitch + 8;
  const board = { x: rack.x, y: RACK_Y - 4, w, d: 4, r: 1 };
  for (const fx of [rack.x + 6, rack.x + w - 6]) out.push(S(slab({ x: fx - 5, y: RACK_Y - 12, w: 10, d: 18, r: 2 }, 0, 4, 3, 0.5), { tone: "lo" }));
  out.push(S(slab(board, 0, RACK_H, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(board, RACK_H - 6, P, 3), { tone: "faint" }) }));
  out.push(S(slab({ x: rack.x - 1, y: RACK_Y - 5, w: w + 2, d: 6, r: 1.2 }, RACK_H, 3, 3, 0.5), { tone: "mid" }));
  out.push(D([at([rack.x + 3, RACK_Y - 2, RACK_H + 3]), at([rack.x + w - 3, RACK_Y - 2, RACK_H + 3])], { size: 0.45 }));
  // Porte-étiquettes au-dessus de chaque poche : cadre, carton et deux rivets.
  for (let i = 0; i < rack.cols; i++) {
    const hx = rack.x + 5 + i * rack.pitch, hw = rack.pitch - 4;
    out.push(S(k.extrude([[hx, RACK_Y], [hx + hw, RACK_Y], [hx + hw, RACK_Y + 0.8], [hx, RACK_Y + 0.8]], RACK_H - 16, 7, P, { bevel: 0 }), { tone: "mid" }));
    out.push(`<g transform="${front(RACK_Y + 0.8)}"><path class="iso-line" data-tone="faint" d="${flat(hx + 1.4, RACK_H - 14.6, hx + hw - 1.4, RACK_H - 10.4, 0.4, 2)}"/></g>`);
    out.push(D([at([hx + 1.2, RACK_Y + 0.8, RACK_H - 9.8]), at([hx + hw - 1.2, RACK_Y + 0.8, RACK_H - 9.8])], { size: 0.36 }));
  }
  // Fond de poche, puis cartes (dynamiques) et une fente de vol par casier.
  out.push(S(slab({ x: rack.x + 2, y: RACK_Y, w: w - 4, d: LIP_Y - 2 - RACK_Y, r: 0.4 }, POCKET_Z - 1, 1, 2, 0), { tone: "lo", crease: "none" }));
  out.push(`<g data-part="${part}-cards"></g><g data-part="${part}-slot"></g>`);
  // Lèvres et montants de poches, rivets.
  for (let i = 0; i <= rack.cols; i++) out.push(S(slab({ x: rack.x + 3 + i * rack.pitch, y: RACK_Y, w: 2, d: LIP_Y - RACK_Y + 2, r: 0.4 }, POCKET_Z - 1, LIP_H + 1, 2, 0.2), { tone: "mid" }));
  for (let i = 0; i < rack.cols; i++) {
    const lip = { x: rack.x + 5 + i * rack.pitch, y: LIP_Y, w: rack.pitch - 2, d: 2, r: 0.5 };
    out.push(S(slab(lip, POCKET_Z - 1, LIP_H, 2, 0.3), { tone: "mid" }));
    out.push(D([at([lip.x + 2.4, LIP_Y + 2, POCKET_Z + LIP_H - 2.4]), at([lip.x + lip.w - 2.4, LIP_Y + 2, POCKET_Z + LIP_H - 2.4])], { size: 0.38 }));
  }
  out.push(S(slab({ x: rack.x + 2, y: LIP_Y - 0.6, w: w - 4, d: 2.6, r: 0.6 }, POCKET_Z - 3, 2, 2, 0.2), { tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------- pointeuses
function clockSvg(v, n) {
  const out = [], plan = { x: v.x, y: BODY.y, w: v.w, d: BODY.d, r: 3 }, cx = v.cx;
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(plan, 2), 0, 3, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(plan, 3, TOPZ - 7, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(plan, 52, P, 4), { tone: "faint" }) }));
  const cap = k.insetPlan(plan, -1.5);
  out.push(S(slab(cap, TOPZ - 4, 4, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(cap, 4), TOPZ, P, 3), { tone: "faint" }));
  out.push(D(k.corners(cap, 6).map(([x, y]) => at([x, y, TOPZ])), { size: 0.45 }));
  // Fente d'insertion et son couvre-joint.
  out.push(S(slab({ x: cx - 12, y: -7.2, w: 24, d: 4.4, r: 1.2 }, TOPZ, 1.2, 3, 0.2), { tone: "mid" }));
  out.push(L(k.planOutline({ x: cx - 9, y: -5.6, w: 18, d: 1.2, r: 0.5 }, TOPZ + 1.2, P, 2), { tone: "lo" }));
  // Cadran : 60 graduations, majeures toutes les heures, aiguilles dynamiques.
  const f = front(FACE_Y), minor = [], major = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, r0 = i % 5 ? DIAL.r - 1.6 : DIAL.r - 3, x0 = cx + Math.sin(a) * r0, z0 = DIAL.z + Math.cos(a) * r0, x1 = cx + Math.sin(a) * (DIAL.r - 0.4), z1 = DIAL.z + Math.cos(a) * (DIAL.r - 0.4);
    (i % 5 ? minor : major).push(`M${x0.toFixed(2)} ${(-z0).toFixed(2)}L${x1.toFixed(2)} ${(-z1).toFixed(2)}`);
  }
  out.push(`<g transform="${f}"><circle class="iso-fill fig-window" cx="${cx}" cy="${-DIAL.z}" r="${DIAL.r + 2.6}"/><circle class="iso-line" data-tone="mid" cx="${cx}" cy="${-DIAL.z}" r="${DIAL.r + 2.6}" fill="none"/><circle class="iso-line" data-tone="lo" cx="${cx}" cy="${-DIAL.z}" r="${DIAL.r}" fill="none"/>`);
  out.push(`<path class="iso-line" data-tone="lo" d="${minor.join("")}"/><path class="iso-line" data-tone="mid" d="${major.join("")}"/>`);
  out.push(`<path class="iso-line" data-tone="hi" data-part="hour-${n}" d="" style="stroke-width:1.1"/><path class="iso-line" data-tone="mid" data-part="minute-${n}" d=""/><circle class="iso-dot" cx="${cx}" cy="${-DIAL.z}" r="1"/></g>`);
  // Lecteur : sept rouleaux pour l'OT, voyant de relevé, voyant R004.
  out.push(display(f, flat(cx - 21, 29, cx + 21, 38, 1.4), { part: "ot-" + n, x: cx, y: -31, size: 5.6, text: "0000000" }));
  out.push(D([at([cx - 23.5, FACE_Y, 33.5]), at([cx + 23.5, FACE_Y, 33.5])], { size: 0.42 }));
  const [lx, ly] = at([cx - 17, FACE_Y, 44]);
  out.push(`<circle class="fig-lamp" data-part="lamp-${n}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.6"/>`);
  const [rx, ry] = at([cx - 10, FACE_Y, 44]);
  out.push(`<circle class="fig-lamp" data-part="r004-${n}" cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="1.2"/>`);
  // Serrure de la clé partagée.
  const F = G.frameAlong(KEYHOLE(cx), [0, 1, 0]);
  out.push(S(G.disc(0, 1.2, 3.4, F, P), { tone: "mid" }));
  out.push(L(G.circleOf(G.frameAlong(KEYHOLE(cx), [0, 1, 0]), 1.2, 1.4, P), { tone: "lo" }));
  // Grille d'aération et plaque de pied sur la face avant.
  const slots = [];
  for (let i = 0; i < 6; i++) slots.push(flat(cx - 19 + i * 7, 9, cx - 15 + i * 7, 20, 1.6, 4));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${slots.join("")}"/></g>`);
  // Flanc droit : coulisse du levier de poinçon, bouton qui descend à chaque inscription.
  const side = right(v.x + v.w);
  out.push(`<g transform="${side}"><path class="iso-line" data-tone="lo" d="${flat(-4.8, 40, -3.2, 72, 0.8, 3)}"/></g>`);
  out.push(`<g data-part="punch-${n}">${S(k.cylinder(v.x + v.w + 3, 4, 3, 66, 4, P, 20), { tone: "mid" })}${S(slab({ x: v.x + v.w, y: 3.4, w: 3, d: 1.2, r: 0.3 }, 67, 2, 2, 0), { tone: "mid" })}</g>`);
  return out.join("");
}

// Clé du verrou partagé : un seul écrivain à la fois. Dessinée dans la serrure de la VM 1.
function keySvg() {
  const [x, y, z] = KEYHOLE(VM[0].cx), F = G.frameAlong([x, y + 1.2, z], [0, 1, 0]);
  return S(G.disc(0, 5, 0.9, F, P), { tone: "hi", lit: true }) + S(G.disc(5, 6.4, 3, F, P), { tone: "hi", lit: true }) + L(G.circleOf(F, 6.4, 1, P), { tone: "lo" });
}

// ---------------------------------------------------------------- corbeille et imprimante
function binSvg() {
  const out = [], top = BIN_H;
  out.push(S(slab(BIN, 0, 1.2, 3, 0.2), { tone: "lo" }));
  out.push(S(slab({ x: BIN.x, y: BIN.y, w: BIN.w, d: 1.6, r: 0.6 }, 1.2, top - 1.2, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: BIN.x, y: BIN.y, w: 1.6, d: BIN.d, r: 0.6 }, 1.2, top - 1.2, 2, 0.3), { tone: "mid" }));
  out.push(`<g data-part="bin-cards"></g>`);
  out.push(S(slab({ x: BIN.x + BIN.w - 1.6, y: BIN.y, w: 1.6, d: BIN.d, r: 0.6 }, 1.2, top - 1.2, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: BIN.x, y: BIN.y + BIN.d - 1.6, w: BIN.w, d: 1.6, r: 0.6 }, 1.2, top - 1.2, 2, 0.3), { tone: "mid" }));
  out.push(D([at([BIN.x + 4, BIN.y + BIN.d, top - 2.5]), at([BIN.x + BIN.w - 4, BIN.y + BIN.d, top - 2.5])], { size: 0.4 }));
  return out.join("");
}
function printerSvg() {
  const out = [], top = PRINTER_H;
  out.push(`<path class="iso-halo" d="${k.haloOf(PRINTER, 0, 1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(PRINTER, 0, top, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(PRINTER, 5, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PRINTER, 3), top, P, 3), { tone: "faint" }));
  out.push(S(slab({ x: PRINTER.x + 5, y: PRINTER.y + 9, w: 20, d: 4, r: 1 }, top, 1.2, 3, 0.2), { tone: "mid" }));
  out.push(L(k.planOutline({ x: PRINTER.x + 6.5, y: PRINTER.y + 10.5, w: 17, d: 1, r: 0.4 }, top + 1.2, P, 2), { tone: "lo" }));
  out.push(`<g data-part="ticket"></g>`);
  out.push(S(k.cylinder(PRINTER.x + 24, PRINTER.y + 19, 2.2, top, 1.6, P, 18), { tone: "mid" }));
  const [lx, ly] = at([PRINTER.x + 7, PRINTER.y + 19, top]);
  out.push(`<circle class="fig-lamp" data-part="printer-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  return out.join("");
}

// Carte de demande debout (plan XZ), dessinée à l'origine : bas gauche en (0, 0, 0).
function cardSvg(lit) {
  const ring = [[0, 0], [CARD.w, 0], [CARD.w, 0.8], [0, 0.8]];
  const face = `<g transform="${front(0.8)}">${k.lineSvg("M2.6 -22h8M2.6 -19h10M2.6 -16h7", { tone: "lo", free: true })}<path class="iso-line" data-tone="faint" d="${flat(1.8, 3.4, CARD.w - 1.8, 10, 0.6, 2)}"/></g>`;
  const body = k.solidSvg(prismXZ(CARD.w, CARD.h), { tone: "hi", lit });
  return body + face;
  function prismXZ(w, h) { return k.extrude(ring, 0, h, P, { bevel: 0 }); }
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Deux pointeuses sur un établi, entre un casier de demandes en attente à gauche et un casier d'historique à droite. La pointeuse qui tient la clé relève la plus ancienne demande toutes les deux minutes, affiche l'OT à sept chiffres, inscrit le lien, puis range la carte dans l'historique ; un doublon tombe dans la corbeille. À 17 h, l'imprimante sort le récapitulatif.",
  body: [
    bench(P, PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 15, w: 180, d: 7, r: 1 }, label: { x: 36, y: PLATE.y + PLATE.d - 19, w: 46, d: 11, r: 1.2 } }),
    rackSvg(IN, "in"), clockSvg(VM[0], 0), clockSvg(VM[1], 1),
    `<g data-part="key">${keySvg()}</g>`,
    `<g data-part="air"></g>`,
    rackSvg(OUT, "out"), binSvg(), printerSvg(),
    `<g data-part="sky"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const CARD = ${JSON.stringify(CARD)}, IN = ${JSON.stringify(IN)}, OUT = ${JSON.stringify(OUT)}, VM = ${JSON.stringify(VM)}, DIAL = ${JSON.stringify(DIAL)};
const RACK_Y = ${RACK_Y}, POCKET_Z = ${POCKET_Z}, TOPZ = ${TOPZ}, FACE_Y = ${FACE_Y}, BIN = ${JSON.stringify(BIN)}, PRINTER = ${JSON.stringify(PRINTER)}, PRINTER_H = ${PRINTER_H};
const CARD_SVG = ${JSON.stringify(cardSvg(false))}, CARD_LIT = ${JSON.stringify(cardSvg(true))};
${LOOP}
// Vrais chiffres : 4 000 à 5 000 rapports par an sur 225 jours, soit 18 à 22 par jour ;
// 30 min épargnées par rapport, valorisées à 104,74 €/h (52,37 €). Relevé toutes les 2 min.
const PER_REPORT = { min: 30, eur: 52.37 }, POLL = 2, WORK = 8, START = 480, END = 1020, RECAP = 1028;
const pocketX = (rack, i) => rack.x + 4 + i * rack.pitch + (rack.pitch - CARD.w) / 2;
// Une journée de 20 dépôts ; le 12e redépose le 5e (doublon écarté par l'historique).
const hash = (i) => { let h = Math.imul(i + 7, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const DAY = Array.from({ length: 20 }, (_, i) => ({ arrive: START + 12 + i * 25 + Math.round((hash(i) - 0.5) * 16), ot: String(4100000 + Math.floor(hash(i + 40) * 899999)), dup: false }));
DAY[11].ot = DAY[4].ot; DAY[11].dup = true;
let failAt = null;
// Planning sans état : chaque demande attend le relevé suivant puis la machine libre.
function plan() {
  let free = START, seen = new Set(), stored = 0;
  return DAY.map((c, i) => {
    let s = Math.ceil(Math.max(c.arrive, free) / POLL) * POLL, vm = failAt !== null && s >= failAt ? 1 : 0;
    // Reprise : la VM 2 attend la révocation des droits de la VM 1 (un relevé de plus).
    if (vm && s < failAt + POLL) s = Math.ceil((failAt + POLL) / POLL) * POLL;
    free = s + WORK;
    const dup = seen.has(c.ot); seen.add(c.ot);
    return { ...c, i, start: s, end: s + WORK, vm, rejected: dup, slot: dup ? -1 : stored++ };
  });
}
const lerp = (a, b, u) => a + (b - a) * u, ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const inPos = (n) => [pocketX(IN, n % IN.cols), RACK_Y + 2.8, POCKET_Z];
const outPos = (n) => [pocketX(OUT, Math.floor(n / 4) % OUT.cols), RACK_Y + 0.6 + (n % 4) * 1.6, POCKET_Z + (n % 4) * 1.2];
const binPos = () => [BIN.x + 8, BIN.y + 8, 1.2];
// Trajet d'une carte pendant son traitement (minutes du modèle, depuis le début du relevé).
function path(c, a) {
  const v = VM[c.vm], from = inPos(c.i), slot = [v.cx - CARD.w / 2, -5.6, TOPZ + 2], dest = c.rejected ? binPos() : outPos(c.slot);
  const hi = TOPZ + 30;
  if (a < 1) return { p: [from[0], from[1], from[2] + 48 * ease(a)], layer: "in" };
  if (a < 2.2) { const u = ease((a - 1) / 1.2); return { p: [lerp(from[0], slot[0], u), lerp(from[1], slot[1], u), from[2] + 48 + (hi - from[2] - 48) * Math.sin(u * Math.PI / 2)], layer: "air" }; }
  if (a < 3) return { p: [slot[0], slot[1], lerp(hi, TOPZ - 22, ease((a - 2.2) / 0.8))], layer: "slot" };
  if (a < 5) return { p: [slot[0], slot[1], TOPZ - 22], layer: "slot", reading: true };
  if (a < 5.8) return { p: [slot[0], slot[1], lerp(TOPZ - 22, hi, ease((a - 5) / 0.8))], layer: "slot" };
  if (a < 7.2) { const u = ease((a - 5.8) / 1.4); return { p: [lerp(slot[0], dest[0], u), lerp(slot[1], dest[1], u), hi + (c.rejected ? 0 : 6) * Math.sin(u * Math.PI)], layer: "sky" }; }
  const u = ease((a - 7.2) / 0.8);
  return { p: [dest[0], dest[1], lerp(hi, dest[2], u)], layer: c.rejected ? "bin" : "out" };
}
const air = $("air"), key = $("key"), slots = { in: $("in-slot"), out: $("out-slot"), bin: $("bin-cards"), sky: $("sky") };
const inCards = $("in-cards"), outCards = $("out-cards"), binCards = $("bin-cards"), ticket = $("ticket");
// Fente d'insertion : la carte n'est visible qu'au-dessus du capot de la pointeuse.
const clips = VM.map((v, n) => { const id = "vm-slot-" + n, poly = [[v.x - 40, -5.6, TOPZ + 1.2], [v.x + v.w + 40, -5.6, TOPZ + 1.2], [v.x + v.w + 40, -5.6, TOPZ + 200], [v.x - 40, -5.6, TOPZ + 200]].map((p) => iso(p, P).join(" ")).join(" L"); const c = document.createElementNS("http://www.w3.org/2000/svg", "clipPath"); c.id = id; c.innerHTML = '<path d="M' + poly + 'Z"/>'; svg.append(c); return id; });
const flyer = document.createElementNS("http://www.w3.org/2000/svg", "g"); flyer.innerHTML = CARD_LIT;
const holder = document.createElementNS("http://www.w3.org/2000/svg", "g"); holder.append(flyer);
const card = (p) => '<g transform="' + translateAlong(P, p) + '">' + CARD_SVG + '</g>';
let m = START, hold = 0, touring = true, idle = 0, drawn = "";
function hand(cx, frac, r) { const a = frac * Math.PI * 2; return "M" + cx + " " + (-DIAL.z) + "L" + (cx + Math.sin(a) * r).toFixed(2) + " " + (-(DIAL.z + Math.cos(a) * r)).toFixed(2); }
function clockText(min) { const h = Math.floor(min / 60), mm = Math.floor(min % 60); return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); }
function draw() {
  const day = plan(), t = Math.min(m, RECAP + 6);
  const pending = day.filter((c) => c.arrive <= t && t < c.start);
  const busy = day.find((c) => t >= c.start && t < c.end);
  const done = day.filter((c) => t >= c.end && !c.rejected), rejected = day.filter((c) => t >= c.end && c.rejected);
  // Casiers : redessinés seulement quand leur contenu change.
  const sig = pending.map((c) => c.i).join() + "|" + done.length + "|" + rejected.length;
  if (sig !== drawn) {
    inCards.innerHTML = pending.map((c) => card(inPos(c.i))).join("");
    outCards.innerHTML = done.map((c) => card(outPos(c.slot))).join("");
    binCards.innerHTML = rejected.map(() => card(binPos())).join("");
    drawn = sig;
  }
  if (holder.parentNode) holder.remove();
  if (busy) {
    const q = path(busy, t - busy.start), layer = q.layer === "slot" ? air : slots[q.layer] || air;
    flyer.setAttribute("transform", translateAlong(P, q.p));
    if (q.layer === "slot") holder.setAttribute("clip-path", "url(#" + clips[busy.vm] + ")"); else holder.removeAttribute("clip-path");
    layer.append(holder);
  }
  // Pointeuses : aiguilles, OT lu, voyants de relevé et de code R004, poinçon.
  VM.forEach((v, n) => {
    const alive = !(n === 0 && failAt !== null && t >= failAt), active = n === (failAt !== null && t >= failAt ? 1 : 0);
    $("hour-" + n).setAttribute("d", hand(v.cx, (t / 60 % 12) / 12, 7.5));
    $("minute-" + n).setAttribute("d", hand(v.cx, (t % 60) / 60, 11.5));
    const mine = busy && busy.vm === n ? busy : null, a = mine ? t - mine.start : -1;
    const shownOt = mine && a >= 3 ? (a < 4 ? String(Math.floor(hash(Math.floor(t * 7)) * 9999999)).padStart(7, "0") : mine.ot) : (alive ? "-------" : "       ");
    const ot = $("ot-" + n); if (ot.textContent !== shownOt) ot.textContent = shownOt;
    $("lamp-" + n).dataset.on = String(alive && active && (Math.floor(t) % POLL === 0 && t % 1 < 0.35 || !!mine));
    $("r004-" + n).dataset.on = String(!!mine && a >= 4 && a < 5.8 && !mine.rejected);
    $("punch-" + n).setAttribute("transform", translateAlong(P, [0, 0, mine && a >= 4.4 && a < 5.2 ? -14 * Math.sin((a - 4.4) / 0.8 * Math.PI) : 0]));
  });
  // La clé quitte la VM 1 quand elle tombe en panne et rejoint la serrure de la VM 2.
  const kk = failAt === null ? 0 : ease((t - failAt) / 1.6);
  key.setAttribute("transform", translateAlong(P, [(VM[1].cx - VM[0].cx) * kk, 0, 14 * Math.sin(kk * Math.PI)]));
  // Récapitulatif de 17 h : un ticket monte de l'imprimante.
  const printed = Math.max(0, Math.min(1, (t - END) / (RECAP - END))), h = 30 * printed;
  ticket.innerHTML = h > 0.5 ? solidSvg(slabOf({ x: PRINTER.x + 7, y: PRINTER.y + 10.6, w: 16, d: 0.8, r: 0.2 }, PRINTER_H + 1.2, h, P, 2, 0), { tone: "hi" }) + lineSvg([4, 8.5, 13, 17.5, 22, 26].filter((z) => z < h - 1).map((z) => segment([PRINTER.x + 9, PRINTER.y + 11.4, PRINTER_H + 1.2 + h - z], [PRINTER.x + 9 + (z % 9 > 4 ? 9 : 12), PRINTER.y + 11.4, PRINTER_H + 1.2 + h - z], P)).join(""), { tone: "lo", free: true }) : "";
  $("printer-lamp").dataset.on = String(printed > 0 && printed < 1);
  const n = done.length, saved = n * PER_REPORT.min, euros = n * PER_REPORT.eur, hours = Math.floor(saved / 60) + " h" + (saved % 60 ? " " + String(saved % 60).padStart(2, "0") : "");
  const fail = failAt !== null && t >= failAt;
  say(t >= END ? "17:00 · récap" + (fail ? " (VM 2)" : "itulatif") + " : " + n + " rapports · " + hours + " · " + fr(euros) + " €"
    : fail ? clockText(t) + " · VM 2 reprend · " + n + " rapport" + (n > 1 ? "s" : "") + " · " + fr(euros) + " €"
    : clockText(t) + " · " + n + " rapport" + (n > 1 ? "s" : "") + " inscrit" + (n > 1 ? "s" : "") + " · " + hours + " rendue" + (saved >= 120 ? "s" : "") + " · " + fr(euros) + " €");
}
const run = loop((dt, calm) => {
  if (calm) m = RECAP + 6;
  else if (touring) { if (m < RECAP + 6) m += dt * 3.6; else if ((hold += dt) > 4) { m = START; hold = 0; failAt = null; } }
  draw();
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 3600); m = Math.max(START, Math.min(RECAP + 6, next)); run(); };
dragX(() => m, (v, share) => steer(v + share * 600));
stage.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P") { failAt = failAt === null ? Math.max(START, m) : null; drawn = ""; run(); return; }
  const to = { ArrowRight: m + 30, ArrowLeft: m - 30, Home: START, End: RECAP + 6 }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(to); }
});
// Accès de vérification (captures) : fige l'heure et la panne.
window.__fig = { at: (t, fail = null) => { touring = false; failAt = fail; drawn = ""; m = t; draw(); return readout.textContent; }, plan };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 02",
  title: "VRE par VM",
  hint: "Glisse ← → : heure · P : panne VM 1",
  readout: "08:00 · 0 rapport inscrit · 0 h · 0 €",
  keys: [
    { mark: "lit", label: "La demande traitée et la clé : une seule VM écrit à la fois" },
    { mark: "raised", label: "Casiers : file d'attente à gauche, historique à droite, corbeille des doublons" },
  ],
  caption: "Toutes les deux minutes, la VM qui tient la clé relève la plus ancienne demande, contrôle le code R004 et l'OT à sept chiffres, inscrit le lien dans Excel et le vérifie ; seuls les résultats confirmés rejoignent l'historique. Chaque rapport rend 30 min, soit 52,37 € : sur 4 000 à 5 000 rapports par an, 2 000 à 2 500 h et 209 480 à 261 850 €. La reprise par une seconde VM reste à concevoir ; les heures de dépôt sont illustratives.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Pointeuses VM : flèches gauche et droite pour avancer l'heure, P pour simuler la panne de la VM 1" aria-valuemin="480" aria-valuemax="1034" aria-valuenow="480">${svg}</div>`,
});

writeFigure("vm", { title: "VRE · pointeuses VM", plate, live });

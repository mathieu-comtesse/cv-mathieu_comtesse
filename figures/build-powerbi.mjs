// Fig 08 · Power BI · PP & MOSO : un téléphérique de dossiers.
// node figures/build-powerbi.mjs  →  figures/powerbi.html
// Deux gains distincts sur la même machine. Au sommet, la bibliothèque d'archives (36 cases) ; dans la vallée, le comptoir et la VM.
// Deux cabines vont et viennent sur deux câbles, l'une montant quand l'autre descend. À chaque consultation, le dossier demandé sort de sa case,
// monte dans la cabine du sommet, descend et glisse sur le comptoir ; à l'arrivée d'un PP, la VM l'extrait, la cabine le monte, il prend la place
// de l'ancien, qui part à la caisse d'archives. Les dossiers sont des feuilles souples qui ondulent dans la cabine.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP, PAPER } from "./common.mjs";

const WIDTH = 680, HEIGHT = 470;
const PLATE = { x: -156, y: -62, w: 312, d: 124, r: 9 };
const STEPS = [{ x: -146, y: -48, w: 112, d: 88, z: 0, h: 14 }, { x: -136, y: -40, w: 88, d: 72, z: 14, h: 16 }, { x: -124, y: -32, w: 62, d: 56, z: 30, h: 16 }];
const SUMMIT_Z = 46, LIB = { x: -118, y: -26, w: 50, d: 40, r: 2 }, LIB_H = 34;
const CELLS = { cols: 12, rows: 3, w: 2.9, h: 6.4, px: 3.6, py: 8.4 };
const ARCH = { x: -146, y: 24, w: 26, d: 24, r: 2 };
const TOPDOCK = { x: -58, z: 76 }, VALDOCK = { x: 64, z: 56 }, CY = [-7, 7];
const cableZ = (x) => TOPDOCK.z + (VALDOCK.z - TOPDOCK.z) * (x - TOPDOCK.x) / (VALDOCK.x - TOPDOCK.x);
const PYL = [-14, 30];
const SHOP = { x: 72, y: -14, w: 52, d: 36, r: 2 }, SHOP_H = 22, COUNTER = { x: 74, y: 22, w: 46, d: 16, r: 1.4 }, COUNTER_Z = 14;
const VMK = { x: 108, y: -52, w: 34, d: 26, r: 2 }, VM_H = 32;
const TIERS = 3, SHELVES = 12, FH = 13, FW = 11;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(LIB, SUMMIT_Z, SUMMIT_Z + LIB_H + 6), ...k.boxCorners(VMK, 0, VM_H + 12), [TOPDOCK.x, 0, TOPDOCK.z + 8]], WIDTH, HEIGHT, { pad: 22, azimuth: 52 });
const { at, S, L, D, slab, front, right, flat, byDepth } = tools(P);

// ---------------------------------------------------------------- relief et bibliothèque d'archives
function terrainSvg() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(STEPS[0], 0, 2, P)}" style="filter:blur(4px)"/>`);
  STEPS.forEach((t, i) => {
    out.push(S(slab({ x: t.x, y: t.y, w: t.w, d: t.d, r: 5 - i }, t.z, t.h, 4, 1.2), { tone: i % 2 ? "mid" : "lo", inner: L(k.sideSeam({ x: t.x, y: t.y, w: t.w, d: t.d, r: 5 - i }, t.z + t.h / 2, P, 4), { tone: "faint" }) }));
    // Dalles de pierre : rainures verticales sur la face avant de chaque palier.
    const f = front(t.y + t.d), cuts = []; for (let x = t.x + 10; x < t.x + t.w - 6; x += 12) cuts.push(flat(x, t.z + 2.4, x + 0.01, t.z + t.h - 2.4, 0.2, 2));
    out.push(`<g transform="${f}"><path class="iso-line" data-tone="faint" d="${cuts.join("")}"/></g>`);
    out.push(D(k.corners({ x: t.x, y: t.y, w: t.w, d: t.d }, 3).map(([x, y]) => at([x, y, t.z + t.h])), { size: 0.38 }));
  });
  // Quelques sapins sur les paliers : tronc et trois étages.
  const tree = (x, y, z, sc = 1) => { const F = G.frameAlong([x, y, z], [0, 0, 1]); return S(G.disc(0, 3.6 * sc, 0.9 * sc, F, P), { tone: "lo" }) + S(G.lathe([[3 * sc, 4.4 * sc], [9 * sc, 0.2 * sc]], F, P), { tone: "mid" }) + S(G.lathe([[7 * sc, 3.4 * sc], [13 * sc, 0.2 * sc]], F, P), { tone: "hi" }); };
  const trees = [[-136, 36, 14, 1], [-116, 38, 14, 1.2], [-96, 36, 14, 0.9], [-76, 38, 14, 1.1], [-56, 36, 14, 0.9], [-128, 28, 30, 0.9], [-108, 29, 30, 1], [-84, 28, 30, 0.8]];
  for (const t of trees.sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) out.push(tree(...t));
  return out.join("");
}
function libSvg() {
  const out = [], b = LIB, f = front(b.y + b.d), cellsPath = [], tabs = [];
  out.push(S(slab(b, SUMMIT_Z, LIB_H, 4, 1), { tone: "mid", inner: L(k.sideSeam(b, SUMMIT_Z + 10, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: b.x - 2.4, y: b.y - 2.4, w: b.w + 4.8, d: b.d + 4.8, r: 3 }, SUMMIT_Z + LIB_H, 3.6, 4, 0.8), { tone: "mid" }));
  out.push(S(slab({ x: b.x - 4.4, y: b.y - 4.4, w: b.w + 8.8, d: b.d + 8.8, r: 3.6 }, SUMMIT_Z + LIB_H + 3.6, 2, 4, 0.6), { tone: "lo" }));
  // 36 cases (3 étages de 12) sur la face avant, étiquettes au-dessus de chaque case.
  const x0 = b.x + (b.w - (CELLS.cols * CELLS.px - (CELLS.px - CELLS.w))) / 2, z0 = SUMMIT_Z + 5;
  for (let r = 0; r < CELLS.rows; r++) for (let c = 0; c < CELLS.cols; c++) {
    const x = x0 + c * CELLS.px, z = z0 + r * CELLS.py;
    cellsPath.push(flat(x, z, x + CELLS.w, z + CELLS.h, 0.5, 2));
    tabs.push(flat(x + 0.3, z + CELLS.h + 0.6, x + CELLS.w - 0.3, z + CELLS.h + 1.6, 0.2, 2));
  }
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${cellsPath.join("")}"/><path class="iso-line" data-tone="faint" d="${tabs.join("")}"/></g>`);
  out.push(`<g data-part="cell-lit"></g>`);
  out.push(D([[b.x + 2, SUMMIT_Z + 2], [b.x + b.w - 2, SUMMIT_Z + 2], [b.x + 2, SUMMIT_Z + LIB_H - 2], [b.x + b.w - 2, SUMMIT_Z + LIB_H - 2]].map(([x, z]) => at([x, b.y + b.d, z])), { size: 0.4 }));
  out.push(display(f, flat(b.x + 8, SUMMIT_Z + 27, b.x + 28, SUMMIT_Z + 32.4, 0.8), { part: "ask", x: b.x + 18, y: -(SUMMIT_Z + 28.4), size: 3.4, text: "PP ----" }));
  out.push(display(f, flat(b.x + 30, SUMMIT_Z + 27, b.x + 44, SUMMIT_Z + 32.4, 0.8), { part: "vm", x: b.x + 37, y: -(SUMMIT_Z + 28.4), size: 3, text: "PRÊTE" }));
  const [lx, ly] = at([b.x + b.w + 2, b.y + b.d / 2, SUMMIT_Z + 6]);
  out.push(`<circle class="fig-lamp" data-part="ask-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  // Quai de la gare haute : plateforme sur le flanc est, garde-corps.
  out.push(S(slab({ x: b.x + b.w, y: -10, w: 14, d: 20, r: 1 }, SUMMIT_Z + 14, 2, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: b.x + b.w + 12, y: -10, w: 1.6, d: 20, r: 0.3 }, SUMMIT_Z + 16, 6, 2, 0.2), { tone: "mid" }));
  out.push(D([at([b.x + b.w + 6, 8, SUMMIT_Z + 16]), at([b.x + b.w + 6, -8, SUMMIT_Z + 16])], { size: 0.34 }));
  return out.join("");
}
function archiveSvg() {
  const out = [], a = ARCH;
  out.push(S(slab(a, SUMMIT_Z - 8, 1.6, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: a.x, y: a.y, w: a.w, d: 1.6, r: 0.4 }, SUMMIT_Z - 6.4, 11, 2, 0.2), { tone: "mid" }), S(slab({ x: a.x, y: a.y, w: 1.6, d: a.d, r: 0.4 }, SUMMIT_Z - 6.4, 11, 2, 0.2), { tone: "mid" }));
  out.push(`<g data-part="archive"></g>`);
  out.push(S(slab({ x: a.x, y: a.y + a.d - 1.6, w: a.w, d: 1.6, r: 0.4 }, SUMMIT_Z - 6.4, 11, 2, 0.2), { tone: "mid" }), S(slab({ x: a.x + a.w - 1.6, y: a.y, w: 1.6, d: a.d, r: 0.4 }, SUMMIT_Z - 6.4, 11, 2, 0.2), { tone: "mid" }));
  out.push(D([at([a.x + 3, a.y + a.d, SUMMIT_Z + 3.6]), at([a.x + a.w - 3, a.y + a.d, SUMMIT_Z + 3.6])], { size: 0.32 }));
  return out.join("");
}

// ---------------------------------------------------------------- pylônes, câbles, cabines
function pylonSvg(x) {
  const out = [], zc = cableZ(x) + 6, base = { x: x - 5, y: -9, w: 10, d: 18, r: 1.4 };
  out.push(S(slab(base, 0, 3, 3, 0.5), { tone: "lo" }));
  for (const y of [-6.4, 5.2]) out.push(S(slab({ x: x - 1.4, y, w: 2.8, d: 1.2, r: 0.3 }, 3, zc - 3, 3, 0.2), { tone: "mid" }));
  // Croisillons : traverses tous les 14, bras de poulies en tête.
  for (let z = 14; z < zc - 4; z += 14) out.push(S(slab({ x: x - 1.2, y: -6.4, w: 2.4, d: 12, r: 0.3 }, z, 1.4, 2, 0.15), { tone: "mid" }));
  out.push(S(slab({ x: x - 3, y: -12, w: 6, d: 24, r: 1 }, zc - 3, 3.2, 3, 0.5), { tone: "mid" }));
  for (const y of CY) { out.push(S(G.disc(0, 4, 3.4, G.frameAlong([x - 2, y, cableZ(x) + 1.6], [1, 0, 0]), P), { tone: "lo" })); }
  out.push(D([at([x, 5.8, 6]), at([x, 5.8, zc - 6]), at([x, 11.6, zc])], { size: 0.34 }));
  return out.join("");
}
function cableSvg(y) {
  const pts = []; for (let i = 0; i <= 24; i++) { const x = TOPDOCK.x + (VALDOCK.x - TOPDOCK.x) * i / 24, sag = -2.4 * Math.sin(Math.PI * i / 24); pts.push(at([x, y, cableZ(x) + sag])); }
  return `<path class="iso-line" data-tone="mid" data-free="both" d="M${pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L")}" style="stroke-width:1.1"/>`;
}
function stationHigh() {
  const out = [];
  // Portique du sommet : deux montants et poulie motrice.
  out.push(S(slab({ x: TOPDOCK.x - 4, y: -12, w: 6, d: 4, r: 0.8 }, SUMMIT_Z + 14, TOPDOCK.z - SUMMIT_Z - 14 + 8, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: TOPDOCK.x - 4, y: 8, w: 6, d: 4, r: 0.8 }, SUMMIT_Z + 14, TOPDOCK.z - SUMMIT_Z - 14 + 8, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: TOPDOCK.x - 6, y: -12, w: 10, d: 24, r: 1 }, TOPDOCK.z + 4, 3.6, 3, 0.5), { tone: "mid" }));
  for (const y of CY) out.push(S(G.disc(0, 4, 5.6, G.frameAlong([TOPDOCK.x - 3, y, TOPDOCK.z - 1.6], [1, 0, 0]), P), { tone: "lo", inner: k.fadedSvg(G.ribsOf(G.frameAlong([TOPDOCK.x - 3, y, TOPDOCK.z - 1.6], [1, 0, 0]), 0, 4, 5.6, 28, P, { fade: [0.1, 0.55] }), { tone: "faint" }) }));
  return out.join("");
}
function shopSvg() {
  const out = [], b = SHOP, c = COUNTER, f = front(b.y + b.d);
  out.push(S(slab({ x: b.x - 3, y: b.y - 3, w: b.w + 6, d: b.d + 6, r: 3 }, 0, 3, 3, 0.5), { tone: "lo" }));
  out.push(S(slab(b, 3, SHOP_H - 3, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(b, 12, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: b.x - 3, y: b.y - 3, w: b.w + 6, d: b.d + 8, r: 3 }, SHOP_H, 3, 3, 0.8), { tone: "mid" }));
  // Guichet : fenêtre, store, rebord ; comptoir devant.
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(b.x + 6, 8, b.x + b.w - 6, 21, 1.4, 3)}"/><path class="iso-line" data-tone="faint" d="${flat(b.x + 8, 10, b.x + b.w - 8, 19, 1, 3)}"/></g>`);
  out.push(D([[b.x + 6, 8], [b.x + b.w - 6, 8], [b.x + 6, 21], [b.x + b.w - 6, 21]].map(([x, z]) => at([x, b.y + b.d, z])), { size: 0.36 }));
  out.push(S(slab(c, COUNTER_Z - 2.4, 2.4, 3, 0.5), { tone: "mid" }));
  for (const [x, y] of k.corners(c, 3)) out.push(S(k.cylinder(x, y, 1.6, 0, COUNTER_Z - 2.4, P, 14), { tone: "lo" }));
  out.push(S(slab({ x: c.x, y: c.y + c.d - 1.6, w: c.w, d: 1.6, r: 0.4 }, COUNTER_Z, 2.8, 2, 0.2), { tone: "mid" }));
  out.push(`<g data-part="counter"></g>`);
  // Quai de la gare basse.
  out.push(S(slab({ x: VALDOCK.x - 8, y: -10, w: 12, d: 20, r: 1 }, VALDOCK.z - 6, 2, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: VALDOCK.x - 6, y: -10, w: 4, d: 3, r: 0.6 }, 0, VALDOCK.z - 6, 3, 0.4), { tone: "mid" }), S(slab({ x: VALDOCK.x - 6, y: 7, w: 4, d: 3, r: 0.6 }, 0, VALDOCK.z - 6, 3, 0.4), { tone: "mid" }));
  return out.join("");
}
function vmSvg() {
  const out = [], v = VMK, f = front(v.y + v.d);
  out.push(S(slab(v, 0, VM_H, 4, 1), { tone: "mid", inner: L(k.sideSeam(v, 8, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: v.x - 1.6, y: v.y - 1.6, w: v.w + 3.2, d: v.d + 3.2, r: 2 }, VM_H, 3, 3, 0.6), { tone: "mid" }));
  out.push(display(f, flat(v.x + 5, 16, v.x + 29, 24, 1.2), { part: "vm2", x: v.x + 17, y: -20, size: 4.6, text: "PRÊTE" }));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(v.x + 5, 4, v.x + 29, 12, 1.2, 3)}"/></g>`);
  out.push(D([[v.x + 3, 3], [v.x + v.w - 3, 3], [v.x + 3, VM_H - 3], [v.x + v.w - 3, VM_H - 3]].map(([x, z]) => at([x, v.y + v.d, z])), { size: 0.36 }));
  const [lx, ly] = at([v.x + v.w - 6, v.y + v.d, 20]);
  out.push(`<circle class="fig-lamp" data-part="vm-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un téléphérique de dossiers. Au sommet, une bibliothèque d'archives de trente-six cases et une caisse d'archives ; dans la vallée, le comptoir et le poste de la VM. Deux cabines vont et viennent sur deux câbles, l'une montant quand l'autre descend : à chaque consultation le dossier demandé sort de sa case, descend et glisse sur le comptoir ; à chaque nouveau PP, la VM l'envoie au sommet où il prend la place de l'ancien, qui part aux archives.",
  body: [
    bench(P, PLATE, { strip: { x: -148, y: PLATE.y + PLATE.d - 13, w: 150, d: 7, r: 1 }, label: { x: 70, y: PLATE.y + PLATE.d - 17, w: 46, d: 11, r: 1.2 } }),
    terrainSvg(), archiveSvg(), libSvg(), stationHigh(), vmSvg(),
    cableSvg(CY[0]), `<g data-part="cab-a"></g>`, pylonSvg(PYL[0]), pylonSvg(PYL[1]), cableSvg(CY[1]), `<g data-part="cab-b"></g>`, shopSvg(), `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
${PAPER}
const CELLS = ${JSON.stringify(CELLS)}, LIB = ${JSON.stringify(LIB)}, SUMMIT_Z = ${SUMMIT_Z}, TOPDOCK = ${JSON.stringify(TOPDOCK)}, VALDOCK = ${JSON.stringify(VALDOCK)}, CY = ${JSON.stringify(CY)}, ARCH = ${JSON.stringify(ARCH)}, COUNTER = ${JSON.stringify(COUNTER)}, COUNTER_Z = ${COUNTER_Z}, VMK = ${JSON.stringify(VMK)}, VM_H = ${VM_H}, TIERS = ${TIERS}, SHELVES = ${SHELVES}, FH = ${FH}, FW = ${FW};
const cableZ = (x) => TOPDOCK.z + (VALDOCK.z - TOPDOCK.z) * (x - TOPDOCK.x) / (VALDOCK.x - TOPDOCK.x);
// Vrais chiffres. Consultation : 10 min évitées × 40 consultations par jour = 6 h 40, 698,27 €.
// Traitement : 15 à 20 min évitées par PP (extraction VM, rangement SharePoint, archivage), 400 à 500 PP par an.
// Horaires des demandes et numéros de PP illustratifs.
const RATE = 104.74, CONSULT_MIN = 10, PER_DAY = 40, START = 480, END = 1020, SPEED = 6;
const hash = (i) => { let h = Math.imul(i + 9, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
let next = 2400; const stock = Array.from({ length: TIERS }, () => Array.from({ length: SHELVES }, () => next++));
const START_STOCK = stock.map((t) => [...t]);
const ASKS = Array.from({ length: PER_DAY }, (_, i) => ({ at: START + (i + 0.5) * (END - START) / PER_DAY + (hash(i) - 0.5) * 6, tier: Math.floor(hash(i + 50) * TIERS), pocket: Math.floor(hash(i + 90) * SHELVES) }));
const DEPOSITS = [{ at: 600, tier: 2, pocket: 3 }, { at: 870, tier: 1, pocket: 8 }];
let m = START, touring = true, idle = 0, hold = 0;
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const lerp = (a, b, u) => a + (b - a) * u;
// Les cabines se croisent : chaque voyage (consultation ou dépôt) fait descendre l'une quand l'autre monte.
const TRIPS = [...ASKS.map((q) => ({ at: q.at + 2, kind: "ask", q })), ...DEPOSITS.map((d) => ({ at: d.at + 3, kind: "dep", q: d }))].sort((a, b) => a.at - b.at);
const TRIP_T = 6;
function cabinS(t) { let c = 0; for (const tr of TRIPS) { if (t < tr.at) break; c += ease((t - tr.at) / TRIP_T); } const p = c % 2; return p <= 1 ? p : 2 - p; }   // 0 : cabine A au sommet
const cellPos = (tier, pocket) => { const x0 = LIB.x + (LIB.w - (CELLS.cols * CELLS.px - (CELLS.px - CELLS.w))) / 2; return [x0 + pocket * CELLS.px + CELLS.w / 2, LIB.y + LIB.d, SUMMIT_Z + 5 + tier * CELLS.py + CELLS.h / 2]; };
const cabinAt = (s, y) => { const x = lerp(TOPDOCK.x, VALDOCK.x, s); return [x, y, cableZ(x) - 9]; };
function cabinSvg(c, docs, now, tilt) {
  const [x, y, z] = c;
  let out = '<path class="iso-line" data-tone="mid" data-free="both" d="' + "M" + iso([x, y, z + 9], P).map((v) => v.toFixed(1)).join(" ") + "L" + iso([x, y, z + 2], P).map((v) => v.toFixed(1)).join(" ") + '"/>';
  out += solidSvg(slabOf({ x: x - 3, y: y - 1.2, w: 6, d: 2.4, r: 0.4 }, z + 7.6, 2, P, 2, 0.1), { tone: "lo" });
  for (const dx of [-7, 7]) out += solidSvg(slabOf({ x: x + dx - 0.5, y: y - 0.4, w: 1, d: 0.8, r: 0.1 }, z - 0.2, 9.2, P, 2, 0), { tone: "mid" });
  out += solidSvg(slabOf({ x: x - 10, y: y - 6.4, w: 20, d: 12.8, r: 1 }, z - 8, 1.8, P, 2, 0.2), { tone: "mid" });
  for (let i = 0; i < docs; i++) out += paperSvg(paperRows({ c: [x + (i - (docs - 1) / 2) * 4.6, y, z - 6.4 + FH / 2], d: [0, 0, 1], w: [0, 1, 0], L: FH, W: FW - 2, curl: (i % 2 ? 1 : -1) * 0.05, wave: 0.5 + tilt, roll: 0.3, ph: i * 1.7 + x * 0.1, t: now, NT: 5 }), { head: true });
  out += solidSvg(slabOf({ x: x - 10, y: y - 6.4, w: 20, d: 1.4, r: 0.2 }, z - 8, 6.4, P, 2, 0.1), { tone: "mid" }) + solidSvg(slabOf({ x: x - 10, y: y + 5, w: 20, d: 1.4, r: 0.2 }, z - 8, 6.4, P, 2, 0.1), { tone: "mid" }) + solidSvg(slabOf({ x: x - 10, y: y - 6.4, w: 1.4, d: 12.8, r: 0.2 }, z - 8, 6.4, P, 2, 0.1), { tone: "mid" }) + solidSvg(slabOf({ x: x + 8.6, y: y - 6.4, w: 1.4, d: 12.8, r: 0.2 }, z - 8, 6.4, P, 2, 0.1), { tone: "mid" });
  return out;
}
const doc = (c, curl, wave, lit, ph = 0, now = 0) => paperSvg(paperRows({ c, d: [0, 0, 1], w: [0, 1, 0], L: FH, W: FW, curl, wave, roll: wave * 0.6, ph, t: now, NT: 6 }), { head: true, lit });
const parts = { a: $("cab-a"), b: $("cab-b"), air: $("air"), counter: $("counter"), archive: $("archive"), cell: $("cell-lit") };
function draw(now) {
  const s = cabinS(m), moving = Math.abs(cabinS(m + 0.05) - cabinS(m - 0.05)) * 6, active = ASKS.find((q) => m >= q.at && m < q.at + 14), dep = DEPOSITS.find((d) => m >= d.at && m < d.at + 12);
  // Stock : les dépôts font entrer un nouveau numéro et sortir l'ancien aux archives.
  stock.forEach((t, i) => t.forEach((_, p) => { t[p] = START_STOCK[i][p]; })); const archived = [];
  let nextId = 2400 + TIERS * SHELVES;
  for (const d of DEPOSITS) { if (m < d.at + 9) break; archived.push(stock[d.tier][d.pocket]); stock[d.tier][d.pocket] = nextId++; }
  // Cabine A (câble du fond) : au sommet quand s = 0 ; cabine B : à l'opposé.
  const aPos = cabinAt(s, CY[0]), bPos = cabinAt(1 - s, CY[1]);
  const aLoad = (active && m - active.at >= 2 && m - active.at < 8.6 && s <= 1) ? 1 : 0, bLoad = dep && m - dep.at >= 3 && m - dep.at < 9.4 ? 1 : 0;
  // Qui descend : la consultation prend la cabine du sommet ; le dépôt, celle de la vallée. Les deux cabines se croisent.
  const topIsA = (TRIPS.filter((tr) => m >= tr.at + TRIP_T).length % 2) === 0;
  const askCab = active && m - active.at >= 2 && m - active.at < 8.6, depCab = dep && m - dep.at >= 3 && m - dep.at < 9.4;
  const cargoA = (askCab && (topIsA ? m < active.at + 2 + TRIP_T : true)) || (depCab && !topIsA === false), cargoB = depCab;
  html(parts.a, cabinSvg(aPos, askCab || depCab ? 1 : 0, now, moving)); html(parts.b, cabinSvg(bPos, askCab || depCab ? 1 : 0, now, moving));
  void aLoad; void bLoad; void cargoA; void cargoB;
  let air = "", counter = "", cellLit = "";
  const cellRect = (tier, pocket) => { const [cx, , cz] = cellPos(tier, pocket); return '<path class="iso-fill" style="fill:var(--anatomy-lit);opacity:.9" d="' + "M" + iso([cx - CELLS.w / 2, LIB.y + LIB.d + 0.05, cz - CELLS.h / 2], P).map((v) => v.toFixed(1)).join(" ") + "L" + iso([cx + CELLS.w / 2, LIB.y + LIB.d + 0.05, cz - CELLS.h / 2], P).map((v) => v.toFixed(1)).join(" ") + "L" + iso([cx + CELLS.w / 2, LIB.y + LIB.d + 0.05, cz + CELLS.h / 2], P).map((v) => v.toFixed(1)).join(" ") + "L" + iso([cx - CELLS.w / 2, LIB.y + LIB.d + 0.05, cz + CELLS.h / 2], P).map((v) => v.toFixed(1)).join(" ") + 'Z"/>'; };
  if (active) {
    const a = m - active.at, c0 = cellPos(active.tier, active.pocket), topCab = cabinAt(s <= 0.5 ? s : 0, s <= 0.5 ? CY[0] : CY[0]);
    cellLit += cellRect(active.tier, active.pocket);
    // 0–2 : le dossier sort de sa case jusqu'au quai ; 2–8 : il descend dans la cabine ; 8–12 : il glisse sur le comptoir.
    const dock = [TOPDOCK.x - 6, 0, TOPDOCK.z - 14];
    if (a < 2) { const v = ease(a / 2); air += doc([c0[0] + (dock[0] - c0[0]) * v, c0[1] + 4 + (dock[1] - c0[1] - 4) * v, c0[2] + (dock[2] - c0[2]) * v + 8 * Math.sin(v * Math.PI)], -0.05, 0.9 * Math.sin(v * Math.PI), true, active.pocket, now); }
    else if (a >= 8 && a < 12) { const v = ease((a - 8) / 4), from = [VALDOCK.x - 4, 0, VALDOCK.z - 14], to = [COUNTER.x + COUNTER.w / 2, COUNTER.y + COUNTER.d / 2, COUNTER_Z + 3.6 + FH / 2 - 3]; air += doc([from[0] + (to[0] - from[0]) * v, from[1] + (to[1] - from[1]) * v, from[2] + (to[2] - from[2]) * v + 14 * Math.sin(v * Math.PI)], -0.06 * Math.sin(v * Math.PI), 1.2 * Math.sin(v * Math.PI), true, active.pocket, now); }
    if (a >= 12) counter = doc([COUNTER.x + COUNTER.w / 2, COUNTER.y + COUNTER.d / 2, COUNTER_Z + 3.6 + FH / 2 - 3], 0.05, 0.25, true, 1, now);
    void topCab;
  }
  if (dep) {
    const a = m - dep.at, c0 = cellPos(dep.tier, dep.pocket), vm = [VMK.x + VMK.w / 2, VMK.y + VMK.d / 2, VM_H + 8], valDock = [VALDOCK.x - 4, 0, VALDOCK.z - 14], topDock = [TOPDOCK.x - 6, 0, TOPDOCK.z - 14], arch = [ARCH.x + 14, ARCH.y + 12, SUMMIT_Z - 4];
    cellLit += cellRect(dep.tier, dep.pocket);
    const fly = (f, t, v, h) => f.map((x, j) => lerp(x, t[j], ease(v)) + (j === 2 ? h * Math.sin(Math.PI * Math.max(0, Math.min(1, v))) : 0));
    if (a < 3) air += doc(fly(vm, valDock, a / 3, 14), -0.07, 1.1, true, 3, now);
    else if (a >= 9 && a < 11) air += doc(fly(topDock, c0.map((v, j) => j === 1 ? v + 4 : v), (a - 9) / 2, 6), -0.06, 1, true, 4, now);
    if (a >= 9 && a < 12) air += doc(fly([c0[0], c0[1] + 4, c0[2]], arch, (a - 9) / 3, 16), -0.07, 1.1, false, 5, now);
  }
  html(parts.air, air); html(parts.counter, counter); html(parts.cell, cellLit);
  html(parts.archive, archived.map((_, i) => doc([ARCH.x + 6 + i * 6, ARCH.y + 12, SUMMIT_Z - 6 + FH / 2], 0.04, 0.2, false, i * 2, now)).join(""));
  const vmText = dep ? ((m - dep.at) < 5 ? "EXTRAIT" : "RANGÉ") : "PRÊTE";
  for (const id of ["vm", "vm2"]) { const e = $(id); if (e.textContent !== vmText) e.textContent = vmText; }
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
    { mark: "lit", label: "Le dossier demandé, de sa case au comptoir" },
    { mark: "raised", label: "Au sommet, les archives ; dans la vallée, le comptoir et la VM" },
  ],
  caption: "Deux gains distincts. Le traitement : extraction par la VM, rangement SharePoint et archivage automatique évitent 15 à 20 min par PP, soit 100 à 167 h et 10 474 à 17 456,67 € par an pour 400 à 500 PP. La consultation : le plan, son PDF et son échéance se retrouvent en quelques secondes au lieu de 10 min, 40 fois par jour, soit 6 h 40 et 698,27 € par jour, à 104,74 €/h. Horaires et numéros de PP illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Power BI PP et MOSO : flèches gauche et droite pour avancer l'heure" aria-valuemin="480" aria-valuemax="1020" aria-valuenow="480">${svg}</div>`,
});

writeFigure("powerbi", { title: "Power BI · téléphérique de dossiers", plate, live });

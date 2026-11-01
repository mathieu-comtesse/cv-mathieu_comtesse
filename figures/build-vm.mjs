// Fig 02 · VRE traités par VM : un pont roulant à deux chariots sur une seule poutre, avec une seule clé.
// node figures/build-vm.mjs  →  figures/vm.html
// Les demandes déposées attendent dans le bac de gauche. Les deux chariots (VM 1 et VM 2) roulent sur la même poutre,
// mais seul celui qui tient la clé peut la parcourir : toutes les deux minutes il relève la plus ancienne demande, la porte
// sur le pupitre de lecture (code R004 et OT à sept chiffres), puis la pose dans l'historique ; un doublon part au bac des rebuts.
// Touche P : panne du chariot 1, la clé passe au chariot 2 (reprise à concevoir).
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP, PAPER } from "./common.mjs";
import { column, ibeam } from "./parts.mjs";

const WIDTH = 640, HEIGHT = 420;
// ---------------------------------------------------------------- monde (1 unité ≈ 5 mm)
const PLATE = { x: -158, y: -50, w: 316, d: 100, r: 8 };
const TAB = { x: -142, y: -34, w: 284, d: 56, r: 3 }, TH = 20;            // table de travail
const CARD = { w: 13, d: 9 };
const IN = { x: -132, y: -26, cols: 6, rows: 2, px: 11, py: 12 };           // file d'attente
const OUT = { x: 38, y: -26, cols: 6, rows: 2, px: 11, py: 12 };            // historique
const BIN = { x: 18, y: 4, w: 24, d: 16, r: 1.2 };                           // rebuts (doublons)
const PAD = { x: -8, y: -12, w: 30, d: 20, r: 1.4 }, PAD_H = 12;           // pupitre de lecture
const BZ = TH + 78, BEAM_Y = -8;                                           // poutre : z bas, y du bord arrière
const HOME = [-124, 124];                                                  // butées de VM 1 et VM 2
const BY = BEAM_Y + 4;                                                     // axe de la poutre
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners({ x: -150, y: -36, w: 300, d: 60 }, 0, BZ + 22)], WIDTH, HEIGHT, { pad: 22, azimuth: 58 });
const { at, S, L, D, slab, front, right, flat, byDepth } = tools(P);
const slotAt = (tray, n) => [tray.x + 7 + (n % tray.cols) * tray.px, tray.y + 6 + (Math.floor(n / tray.cols) % tray.rows) * tray.py];

// ---------------------------------------------------------------- table et bacs
function tableSvg() {
  const out = [], d = TAB;
  out.push(`<path class="iso-halo" d="${k.haloOf(d, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(d, 4), 0, 4, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(d, 4, TH - 4, 3, 1), { tone: "mid", inner: L(k.sideSeam(d, 12, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(d, 4).map(([x, y]) => at([x, y, TH])), { size: 0.45 }));
  // Face avant : deux tiroirs vissés et une plaque.
  const f = front(d.y + d.d);
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(-128, 5, -62, 15, 1.4, 3)}${flat(-50, 5, 14, 15, 1.4, 3)}"/><path class="iso-line" data-tone="mid" d="${flat(-102, 9.2, -88, 10.8, 0.6, 2)}${flat(-26, 9.2, -12, 10.8, 0.6, 2)}"/></g>`);
  out.push(D([-130, -60, -52, 12].map((x) => at([x, d.y + d.d, 10])), { size: 0.4 }));
  // Bacs : fond, séparateurs de cases, étiquette.
  for (const tray of [IN, OUT]) {
    const w = tray.cols * tray.px + 6, dd = tray.rows * tray.py + 6;
    out.push(S(slab({ x: tray.x, y: tray.y, w, d: dd, r: 1 }, TH, 1.6, 2, 0.3), { tone: "lo" }));
    for (let r = 0; r <= tray.cols; r++) out.push(S(slab({ x: tray.x + 1.6 + r * tray.px, y: tray.y + 0.8, w: 1, d: dd - 1.6, r: 0.2 }, TH + 1.6, 1.4, 2, 0), { tone: "mid" }));
    out.push(S(slab({ x: tray.x, y: tray.y + dd - 2, w, d: 2, r: 0.5 }, TH, 4.4, 2, 0.3), { tone: "mid" }));
    out.push(D([at([tray.x + 3, tray.y + dd - 1, TH + 4.4]), at([tray.x + w - 3, tray.y + dd - 1, TH + 4.4])], { size: 0.38 }));
    out.push(`<g data-part="${tray === IN ? "in" : "out"}-cards"></g>`);
  }
  // Bac des rebuts : une cuvette basse et sa corbeille de cartes.
  out.push(S(slab(BIN, TH, 1.6, 2, 0.3), { tone: "lo" }));
  out.push(S(slab({ x: BIN.x, y: BIN.y + BIN.d - 2, w: BIN.w, d: 2, r: 0.5 }, TH, 5, 2, 0.3), { tone: "mid" }));
  out.push(`<g data-part="bin-cards"></g>`);
  return out.join("");
}
function padSvg() {
  const out = [], f = front(PAD.y + PAD.d);
  out.push(S(slab(PAD, TH, PAD_H, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(PAD, TH + 5, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 2.6), TH + PAD_H, P, 3), { tone: "faint" }));
  out.push(display(f, flat(PAD.x + 3, TH + 3, PAD.x + PAD.w - 3, TH + 9, 1), { part: "ot", x: PAD.x + PAD.w / 2, y: -(TH + 4.7), size: 4.2, text: "-------" }));
  out.push(D([at([PAD.x + 1.6, PAD.y + PAD.d, TH + 6]), at([PAD.x + PAD.w - 1.6, PAD.y + PAD.d, TH + 6])], { size: 0.38 }));
  return out.join("");
}
// Pupitre : voyant R004 sur le chapeau arrière.
function padLamp() {
  const [lx, ly] = at([PAD.x + PAD.w - 5, PAD.y + 4, TH + PAD_H + 1.6]);
  return S(k.cylinder(PAD.x + PAD.w - 5, PAD.y + 4, 2.4, TH + PAD_H, 1.6, P, 20), { tone: "mid" }) + `<circle class="fig-lamp" data-part="r004" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`;
}

// ---------------------------------------------------------------- portique et poutre
const LEGS = [[-148, -30], [-148, 16], [148, -30], [148, 16]];
const CTX = () => ({ k, G, P, S, L, D, at });
function legsBack() {
  return LEGS.filter(([, ly]) => ly < 0).map(([x, y]) => column(CTX(), { x, y, z0: 2.4, z1: BZ - 6, r: 3.2, base: false })).join("");
}
function frameSvg() {
  const out = [];
  // Montants avant (turned), traverse de tête sous la poutre, platine d'accrochage.
  for (const x of [-148, 148]) {
    out.push(column(CTX(), { x, y: 16, z0: 2.4, z1: BZ - 6, r: 3.2, base: false }));
    const bar = { x: x - 3.4, y: -30, w: 6.8, d: 52, r: 1 };
    out.push(S(slab(bar, BZ - 6, 6, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(bar, BZ - 3, P, 3), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(bar, 1.4), BZ, P, 3), { tone: "faint" }));
    out.push(D(k.corners(bar, 1.4).map(([bx, by]) => at([bx, by, BZ])), { size: 0.38 }));
  }
  return out.join("");
}
function beamSvg() {
  const out = [], beam = { x: -148, y: BEAM_Y, w: 296, d: 8, r: 1 };
  out.push(ibeam(CTX(), { x0: beam.x, x1: beam.x + beam.w, y: beam.y, z: BZ, h: 7, d: 8 }));
  // Rail de roulement posé sur la poutre et un semis de rivets.
  out.push(S(slab({ x: -146, y: BY - 1, w: 292, d: 2, r: 0.3 }, BZ + 7, 1.2, 2, 0.2), { tone: "lo" }));
  const dots = []; for (let x = -140; x <= 140; x += 14) dots.push(at([x, BEAM_Y + 8, BZ + 3.5]));
  out.push(D(dots, { size: 0.36 }));
  // Règle sur la poutre : un trait tous les 20, un majeur tous les 100.
  const strip = { x: -138, y: BEAM_Y + 1.6, w: 276, d: 1.6, r: 0 };
  void strip;
  for (const x of [-146, 146]) out.push(S(slab({ x: x - 1, y: BEAM_Y - 0.5, w: 2.4, d: 9, r: 0.4 }, BZ - 0.5, 8, 2, 0.2), { tone: "hi" }));
  return out.join("");
}
// Un chariot : châssis, deux galets, moteur, voyant. Dessiné à l'origine, déplacé le long de la poutre.
function trolleySvg(n) {
  const out = [], w = 22;
  const F = G.frameAlong([0, BY, BZ + 8.2], [0, 1, 0]);
  out.push(S(slab({ x: -w / 2, y: BEAM_Y - 2, w, d: 12, r: 1.2 }, BZ + 8.2, 7, 3, 0.7), { tone: "mid", inner: L(k.sideSeam({ x: -w / 2, y: BEAM_Y - 2, w, d: 12, r: 1.2 }, BZ + 11.5, P, 3), { tone: "faint" }) }));
  for (const sx of [-7, 7]) out.push(S(G.disc(-7.4, -5.6, 2.6, G.frameAlong([sx, BY, BZ + 8.2], [0, 1, 0]), P), { tone: "lo" }));
  void F;
  const M = G.frameAlong([0, BY, BZ + 15.2], [0, 0, 1]);
  out.push(S(G.disc(0, 5, 3.6, M, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(M, 0, 5, 3.6, 18, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(S(G.disc(5, 6, 2.4, M, P), { tone: "hi" }));
  out.push(`<path class="iso-line" data-tone="lo" d="${k.segment([-w / 2 + 3, BEAM_Y + 9.9, BZ + 12], [w / 2 - 3, BEAM_Y + 9.9, BZ + 12], P)}"/>`);
  // Galets avant, boîte de jonction, presse-étoupe, frein du moteur, poulie et crochet.
  for (const sx of [-7, 7]) { out.push(S(G.disc(5.6, 7.4, 2.6, G.frameAlong([sx, BY, BZ + 8.2], [0, 1, 0]), P), { tone: "lo" })); }
  out.push(S(slab({ x: -9, y: BEAM_Y + 0.5, w: 7, d: 5, r: 0.6 }, BZ + 13.2, 4, 2, 0.3), { tone: "mid", inner: L(k.planOutline({ x: -8, y: BEAM_Y + 1.5, w: 5, d: 3, r: 0.4 }, BZ + 17.2, P, 2), { tone: "faint" }) }));
  out.push(S(G.disc(0, 2, 1.1, G.frameAlong([-5.5, BY, BZ + 17.2], [0, 0, 1]), P), { tone: "lo" }));
  out.push(D([at([-9.4, BEAM_Y + 10, BZ + 10]), at([9.4, BEAM_Y + 10, BZ + 10]), at([-9.4, BEAM_Y + 10, BZ + 14]), at([9.4, BEAM_Y + 10, BZ + 14])], { size: 0.32 }));
  out.push(S(G.disc(0, 1.6, 2.2, G.frameAlong([0, BY, BZ + 3], [0, 1, 0]), P), { tone: "mid" }));
  return out.join("");
}
function lampOf(n) { const [lx, ly] = at([0, BEAM_Y + 10, BZ + 13]); return `<circle class="fig-lamp" data-part="lamp-${n}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`; }

// ---------------------------------------------------------------- clé et cartes
function keySvg() {
  // La clé de verrouillage : anneau, tige et deux dents, pendue au chariot actif.
  const out = [];
  const F = G.frameAlong([0, BEAM_Y + 9.2, BZ + 8], [0, 1, 0]);
  out.push(S(G.disc(0, 1.4, 3.2, G.frameAlong([0, BEAM_Y + 10, BZ + 4.6], [0, 1, 0]), P), { tone: "hi", lit: true }));
  out.push(S(slab({ x: -0.7, y: BEAM_Y + 10, w: 1.4, d: 1.2, r: 0.2 }, BZ - 3, 7.6, 2, 0), { tone: "hi", lit: true }));
  out.push(S(slab({ x: -0.7, y: BEAM_Y + 10, w: 3.2, d: 1.2, r: 0.2 }, BZ - 3, 1.4, 2, 0), { tone: "hi", lit: true }));
  void F;
  return out.join("");
}
function cardSvg(lit) {
  const plan = { x: -CARD.w / 2, y: -CARD.d / 2, w: CARD.w, d: CARD.d, r: 0.8 };
  const rules = [4, 6, 3].map((w, i) => k.lineOnTop([-5, -2.4 + i * 2.2], [-5 + w, -2.4 + i * 2.2], 0.8, P)).join("");
  return S(slab(plan, 0, 0.8, 2, 0.25), lit ? { tone: "hi", lit: true } : { tone: "hi" }) + L(rules, { tone: "lo", free: true });
}


// ---------------------------------------------------------------- finitions : pieds, entretoises, nervures, plaques, évents
function feetSvg() {
  const out = [];
  for (const [x, y] of byDepth(LEGS)) {
    out.push(S(slab({ x: x - 6, y: y - 6, w: 12, d: 12, r: 1.4 }, 0, 2.4, 3, 0.5), { tone: "lo" }));
    out.push(D(k.corners({ x: x - 6, y: y - 6, w: 12, d: 12 }, 1.8).map(([bx, by]) => at([bx, by, 2.4])), { size: 0.38 }));
    out.push(L(k.ring(x, y, 4.4, 2.4, P, 16), { tone: "faint" }));
  }
  return out.join("");
}
function bracesSvg() {
  const out = [];
  for (const x of [-148, 148]) {
    // Entretoise basse et collier de chaque montant, platine d'accrochage en tête.
    out.push(S(slab({ x: x - 1.4, y: -27, w: 2.8, d: 41, r: 0.4 }, 34, 3, 2, 0.3), { tone: "mid" }));
    out.push(D([at([x, 12, 37]), at([x, -24, 37])], { size: 0.36 }));
    // Platine de tête : quatre boulons sur la traverse.
    out.push(D(k.corners({ x: x - 3, y: -30, w: 6, d: 52 }, 1.4).slice(0, 4).map(([bx, by]) => at([bx, by, BZ])), { size: 0.38 }));
  }
  return out.join("");
}
function beamDetail() {
  const out = [], yf = BEAM_Y + 8;
  const yf2 = yf;
  void yf2;
  const plate = { x: 112, y: yf, w: 20, d: 0.6, r: 0 };
  out.push(S(slab(plate, BZ + 1.2, 4.6, 2, 0), { tone: "lo", crease: "none" }));
  out.push(L([0.7, 0.5].map((w, i) => k.segment([116, yf + 0.6, BZ + 2.4 + i * 1.6], [116 + 14 * w, yf + 0.6, BZ + 2.4 + i * 1.6], P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([113.2, yf + 0.6, BZ + 3.5]), at([130.8, yf + 0.6, BZ + 3.5])], { size: 0.3 }));
  // Règle de course sur le dessus : un trait tous les 10, un majeur tous les 50.
  const strip = { x: -138, y: BEAM_Y + 0.8, w: 276, d: 1.6, r: 0 };
  out.push(S(slab(strip, BZ + 7, 0.5, 2, 0), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 10, 5, strip.y + 0.2, BZ + 7.5, [0.8, 1.3], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}
function tableDetail() {
  const out = [], d = TAB, f = front(d.y + d.d), r = right(d.x + d.w);
  // Pieds réglables sous la table, évents et prise sur le flanc droit.
  const vents = []; for (let i = 0; i < 6; i++) vents.push(flat(-(d.y + 8 + i * 5) - 1, 5, -(d.y + 8 + i * 5) + 1, 15, 1, 4));
  out.push(`<g transform="${r}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  const sock = flat(-d.y - d.d + 9, 5, -d.y - d.d + 19, 13, 1.2);
  out.push(`<g transform="${r}"><path class="iso-fill" d="${sock}"/><path class="iso-line" data-tone="lo" d="${sock}"/><path class="iso-line" data-tone="lo" d="M${(-d.y - d.d + 12).toFixed(1)} -9.2h1.2M${(-d.y - d.d + 16).toFixed(1)} -9.2h1.2"/></g>`);
  // Poignées des tiroirs, charnières et rivets de la face avant.
  out.push(D([-128, -62, -50, 14].flatMap((x) => [at([x, d.y + d.d, 6]), at([x, d.y + d.d, 14])]), { size: 0.34 }));
  // Règle graduée sur le chant arrière de la table.
  const strip = { x: -136, y: d.y + 2, w: 272, d: 3, r: 0 };
  out.push(S(slab(strip, TH, 0.4, 2, 0), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 8, 5, strip.y + 0.4, TH + 0.4, [1, 1.8], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  void f;
  return out.join("");
}
function trayDetail() {
  const out = [];
  for (const tray of [IN, OUT]) {
    const w = tray.cols * tray.px + 6, dd = tray.rows * tray.py + 6, yf = tray.y + dd;
    // Numéros de case : un trait par case sur la lèvre avant, deux rivets de fixation et deux pattes de maintien.
    for (let c = 0; c < tray.cols; c++) out.push(S(slab({ x: tray.x + 3 + c * tray.px, y: yf - 0.6, w: 7, d: 0.6, r: 0 }, TH + 1, 2.4, 2, 0), { tone: "lo", crease: "none" }));
    for (const x of [tray.x + 4, tray.x + w - 4]) out.push(S(slab({ x: x - 2, y: yf - 0.4, w: 4, d: 1.6, r: 0.4 }, TH + 4.4, 1.2, 2, 0.2), { tone: "mid" }));
    out.push(D([at([tray.x + 2.2, tray.y + 0.8, TH + 1.6]), at([tray.x + w - 2.2, tray.y + 0.8, TH + 1.6])], { size: 0.32 }));
  }
  return out.join("");
}
function padDetail() {
  const out = [], top = TH + PAD_H;
  // Fente de lecture, trois boutons et lentille du lecteur sur le dessus du pupitre.
  out.push(L(k.planOutline({ x: PAD.x + 4, y: PAD.y + 4, w: 14, d: 10, r: 1 }, top, P, 3), { tone: "lo" }));
  for (let i = 0; i < 3; i++) {
    const bx = PAD.x + 21 + i * 2.6;
    out.push(S(k.cylinder(bx, PAD.y + 14.4, 0.9, top, 0.9, P, 10), { tone: "mid" }));
  }
  out.push(L(k.ring(PAD.x + 11, PAD.y + 9, 2.2, top, P, 16), { tone: "faint" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un pont roulant à deux chariots sur une seule poutre, avec une seule clé. Les demandes attendent dans le bac de gauche. Seul le chariot qui tient la clé roule : il relève la plus ancienne demande, la porte sur le pupitre de lecture, puis la pose dans l'historique ; un doublon part au bac des rebuts. Si le chariot 1 tombe en panne, la clé passe au chariot 2.",
  body: [
    bench(P, PLATE, { strip: { x: -150, y: PLATE.y + PLATE.d - 15, w: 200, d: 7, r: 1 }, label: { x: 76, y: PLATE.y + PLATE.d - 19, w: 46, d: 11, r: 1.2 } }),
    tableSvg(), tableDetail(), trayDetail(), padSvg(), padDetail(), padLamp(), feetSvg(), legsBack(), beamSvg(), beamDetail(), frameSvg(), bracesSvg(),
    `<g data-part="trolley-0">${trolleySvg(0)}${lampOf(0)}</g>`, `<g data-part="trolley-1">${trolleySvg(1)}${lampOf(1)}</g>`,
    `<g data-part="key">${keySvg()}</g>`, `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
const CARD = ${JSON.stringify(CARD)}, IN = ${JSON.stringify(IN)}, OUT = ${JSON.stringify(OUT)}, BIN = ${JSON.stringify(BIN)}, PAD = ${JSON.stringify(PAD)};
const TH = ${TH}, PAD_H = ${PAD_H}, BZ = ${BZ}, BY = ${BY}, BEAM_Y = ${BEAM_Y}, HOME = ${JSON.stringify(HOME)};
${PAPER}
// Vrais chiffres : 4 000 à 5 000 rapports par an sur 225 jours, soit 18 à 22 par jour ;
// 30 min épargnées par rapport, valorisées à 104,74 €/h (52,37 €). Relevé toutes les 2 min.
const PER_REPORT = { min: 30, eur: 52.37 }, POLL = 2, WORK = 8, START = 480, END = 1020, RECAP = 1028;
const slotAt = (tray, n) => [tray.x + 7 + (n % tray.cols) * tray.px, tray.y + 6 + (Math.floor(n / tray.cols) % tray.rows) * tray.py];
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
const inPos = (i) => slotAt(IN, i % 12), outPos = (n) => slotAt(OUT, n);
const binPos = () => [BIN.x + BIN.w / 2, BIN.y + BIN.d / 2];
const READ = [PAD.x + PAD.w / 2 - 5, PAD.y + PAD.d / 2 - 1], HI = TH + 34, PADZ = TH + PAD_H + 0.8;
// Trajet d'une carte : [x, y, z] et x du chariot, minutes du modèle depuis le début du relevé.
function path(c, a, prevX) {
  const from = inPos(c.i), dest = c.rejected ? binPos() : outPos(c.slot), OUTZ = TH + 1.6 + Math.floor(c.slot / 12) * 1.2;
  const tableZ = TH + 1.6, destZ = c.rejected ? TH + 2 : OUTZ;
  if (a < 1) return { p: [from[0], from[1], tableZ], tx: lerp(prevX, from[0], ease(a)), hook: false };
  if (a < 2) { const u = ease(a - 1); return { p: [from[0], lerp(from[1], BY, u), lerp(tableZ, HI, u)], tx: from[0], hook: true }; }
  if (a < 3.4) { const u = ease((a - 2) / 1.4); return { p: [lerp(from[0], READ[0], u), BY, HI], tx: lerp(from[0], READ[0], u), hook: true }; }
  if (a < 4.2) { const u = ease((a - 3.4) / 0.8); return { p: [READ[0], lerp(BY, READ[1], u), lerp(HI, PADZ, u)], tx: READ[0], hook: true }; }
  if (a < 5.6) return { p: [READ[0], READ[1], PADZ], tx: READ[0], hook: false, reading: true };
  if (a < 6.2) { const u = ease((a - 5.6) / 0.6); return { p: [READ[0], lerp(READ[1], BY, u), lerp(PADZ, HI, u)], tx: READ[0], hook: true }; }
  if (a < 7.4) { const u = ease((a - 6.2) / 1.2); return { p: [lerp(READ[0], dest[0], u), BY, HI], tx: lerp(READ[0], dest[0], u), hook: true }; }
  const u = ease((a - 7.4) / 0.6);
  return { p: [dest[0], lerp(BY, dest[1], u), lerp(HI, destZ, u)], tx: dest[0], hook: u < 0.95 };
}
const air = $("air"), key = $("key"), inCards = $("in-cards"), outCards = $("out-cards"), binCards = $("bin-cards");
const trolleys = [$("trolley-0"), $("trolley-1")], ot = $("ot"), r004 = $("r004"), lamps = [$("lamp-0"), $("lamp-1")];
const flyer = document.createElementNS("http://www.w3.org/2000/svg", "g"), rope = document.createElementNS("http://www.w3.org/2000/svg", "g");
const holder = document.createElementNS("http://www.w3.org/2000/svg", "g");
holder.append(rope, flyer); air.append(holder);
const sheet = (p, o = {}) => paperSvg(paperRows({ c: [p[0], p[1], p[2] + 0.5], d: [1, 0, 0], w: [0, 1, 0], L: CARD.w, W: CARD.d, curl: o.curl ?? 0.022, wave: o.wave || 0, roll: o.roll || 0, ph: o.ph || 0, t: o.t || 0 }), { head: true, lit: o.lit });
const depth = (p) => iso([p[0], p[1], 0], P)[1];
const stackOf = (list) => list.slice().sort((a, b) => depth(a.p) - depth(b.p) || a.p[2] - b.p[2]).map((c) => sheet(c.p, { ph: c.i, curl: (c.i % 2 ? 1 : -1) * 0.02 })).join("");
let m = START, hold = 0, touring = true, idle = 0, drawn = "";
function clockText(min) { const h = Math.floor(min / 60), mm = Math.floor(min % 60); return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); }
// Position d'un chariot : sur la carte pendant un travail, puis il reste où il l'a posée.
function trolleyX(day, vm, t) {
  let x = HOME[vm];
  for (const c of day) {
    if (c.vm !== vm || c.start > t) continue;
    const prev = x, a = t - c.start;
    x = a >= WORK ? (c.rejected ? binPos()[0] : outPos(c.slot)[0]) : path(c, a, prev).tx;
    if (a < WORK) break;
  }
  return x;
}
function draw() {
  const day = plan(), t = Math.min(m, RECAP + 6);
  const pending = day.filter((c) => c.arrive <= t && t < c.start);
  const busy = day.find((c) => t >= c.start && t < c.end);
  const done = day.filter((c) => t >= c.end && !c.rejected), rejected = day.filter((c) => t >= c.end && c.rejected);
  const sig = pending.map((c) => c.i).join() + "|" + done.length + "|" + rejected.length;
  if (sig !== drawn) {
    html(inCards, stackOf(pending.map((c) => ({ i: c.i, p: [...inPos(c.i), TH + 1.6] }))));
    html(outCards, stackOf(done.map((c) => ({ i: c.i, p: [...outPos(c.slot), TH + 1.6 + Math.floor(c.slot / 12) * 1.2] }))));
    html(binCards, stackOf(rejected.map((c, n) => ({ i: c.i, p: [...binPos(), TH + 1.6 + n * 1.2] }))));
    drawn = sig;
  }
  const fail = failAt !== null && t >= failAt;
  const xs = [trolleyX(day, 0, t), trolleyX(day, 1, t)];
  let q = null;
  if (busy) { let prev = HOME[busy.vm]; for (const c of day) { if (c.vm === busy.vm && c.start < busy.start) prev = c.rejected ? binPos()[0] : outPos(c.slot)[0]; } q = path(busy, t - busy.start, prev); xs[busy.vm] = q.tx; }
  trolleys.forEach((el, n) => put(el, translateAlong(P, [xs[n], 0, 0])));
  // Carte portée : une corde tendue du chariot à la carte quand elle est accrochée.
  if (busy) {
    html(flyer, sheet(q.p, { lit: true, curl: q.hook ? -0.07 : 0.02, wave: q.hook ? 1.3 : 0.15, roll: q.hook ? 0.7 : 0, ph: busy.i, t: performance.now() / 1000 }));
    const [px, py, pz] = q.p;
    html(rope, q.hook ? lineSvg(segment([xs[busy.vm], BY, BZ + 6], [px, py, pz + 0.8], P), { tone: "hi" }) : "");
    attr(holder, "style", "");
  } else attr(holder, "style", "display:none");
  // Voyants, pupitre de lecture.
  lamps.forEach((l, n) => attr(l, "data-on", n === (fail ? 1 : 0) && !!busy));
  const a = busy ? t - busy.start : -1, reading = !!busy && a >= 4.2 && a < 5.6;
  attr(r004, "data-on", reading && !busy.rejected);
  const shown = busy && a >= 3.4 && a < 7 ? (a < 4.2 ? String(Math.floor(hash(Math.floor(t * 7)) * 9999999)).padStart(7, "0") : busy.ot) : "-------";
  if (ot.textContent !== shown) ot.textContent = shown;
  // La clé suit le chariot actif ; en panne, elle glisse de la VM 1 à la VM 2.
  const kk = failAt === null ? 0 : ease((t - failAt) / 1.6);
  const kx = lerp(xs[0], xs[1], kk);
  put(key, translateAlong(P, [kx, 0, 6 * Math.sin(kk * Math.PI)]));
  const n = done.length, saved = n * PER_REPORT.min, euros = n * PER_REPORT.eur, hours = Math.floor(saved / 60) + " h" + (saved % 60 ? " " + String(saved % 60).padStart(2, "0") : "");
  say(t >= END ? "17:00 · récapitulatif" + (fail ? " (VM 2)" : "") + " : " + n + " rapports · " + hours + " · " + fr(euros) + " €"
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
window.__fig = { at: (t, fail = null) => { touring = false; failAt = fail; drawn = ""; m = t; draw(); return readout.textContent; }, plan };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 02",
  title: "VRE par VM",
  hint: "Glisse ← → : heure · P : panne VM 1",
  readout: "08:00 · 0 rapport inscrit · 0 h · 0 €",
  keys: [
    { mark: "lit", label: "La demande portée et la clé : un seul chariot roule à la fois" },
    { mark: "raised", label: "Bacs : file d'attente à gauche, historique à droite, rebuts des doublons" },
  ],
  caption: "Toutes les deux minutes, la VM qui tient la clé relève la plus ancienne demande, contrôle le code R004 et l'OT à sept chiffres, inscrit le lien dans Excel et le vérifie ; seuls les résultats confirmés rejoignent l'historique. Chaque rapport rend 30 min, soit 52,37 € : sur 4 000 à 5 000 rapports par an, 2 000 à 2 500 h et 209 480 à 261 850 €. La reprise par une seconde VM reste à concevoir ; les heures de dépôt sont illustratives.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Pont roulant VM : flèches gauche et droite pour avancer l'heure, P pour simuler la panne de la VM 1" aria-valuemin="480" aria-valuemax="1034" aria-valuenow="480">${svg}</div>`,
});

writeFigure("vm", { title: "VRE · pont roulant à deux chariots", plate, live });

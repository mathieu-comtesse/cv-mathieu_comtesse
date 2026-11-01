// Fig 09 · Retrouver tout le suivi : un tableau d'enquête sur chevalet.
// node figures/build-suivi.mjs  →  figures/suivi.html
// Trois fiches de recherche, OT, équipement, bâtiment, s'épinglent à gauche du tableau de liège ; cinq fiches de source, GMAO, exports, SharePoint,
// Excel et Power BI, sont épinglées à droite. Une recherche arrive dans le bac, sa fiche s'épingle à sa ligne, et un fil se tend jusqu'à la bonne
// source dont le voyant s'allume : le lien direct est établi. Le fil relie, il ne recopie pas : aucune donnée ne passe de fiche en fiche.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP, PAPER } from "./common.mjs";
import { column } from "./parts.mjs";

const WIDTH = 640, HEIGHT = 480;
const PLATE = { x: -112, y: -50, w: 224, d: 100, r: 8 };
const CAB = { x: -66, y: -12, w: 132, d: 30, r: 3 }, CAB_H = 34;                    // classeur à tiroirs sous le tableau
const BOARD = { x: -62, w: 124, z0: 46, z1: 140 }, CORK = { x0: -58, x1: 58, z0: 50, z1: 128 };
const QROWS = [112, 90, 68], QX = -36, QW = 22, QH = 17;                              // fiches de recherche (OT, équipement, bâtiment)
const SROWS = [116, 100, 84, 68, 52], SX = 12, SW = 24, SH = 12;                      // fiches de source
const PINY = 2.6;                                                                    // les fils passent devant le liège
const TRAY = { x: -26, y: 14, w: 52, d: 18, r: 2 }, TRAY_Z = CAB_H;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners({ x: -70, y: -14, w: 140, d: 50 }, 0, 160)], WIDTH, HEIGHT, { pad: 22, azimuth: 56 });
const { at, S, L, D, slab, front, right, flat, byDepth } = tools(P);
const CTX = { k, G, P, S, L, D, at };

// ---------------------------------------------------------------- classeur à tiroirs
function cabinetSvg() {
  const out = [], c = CAB, f = front(c.y + c.d), r = right(c.x + c.w);
  out.push(`<path class="iso-halo" d="${k.haloOf(c, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(c, 3), 0, 4, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(c, 4, CAB_H - 4, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(c, 12, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: c.x - 1.6, y: c.y - 1.6, w: c.w + 3.2, d: c.d + 3.2, r: 3.4 }, CAB_H - 3, 3, 3, 0.7), { tone: "mid" }));
  out.push(D(k.corners({ x: c.x - 1.6, y: c.y - 1.6, w: c.w + 3.2, d: c.d + 3.2 }, 2.4).map(([x, y]) => at([x, y, CAB_H])), { size: 0.42 }));
  // Six tiroirs en deux rangées : cadre, poignée, étiquette, deux vis.
  const dw = (c.w - 14) / 3, dh = 11;
  for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
    const x0 = c.x + 7 + col * dw, z0 = 6 + row * (dh + 3.4);
    out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(x0 + 0.8, z0, x0 + dw - 0.8, z0 + dh, 1, 3)}"/><path class="iso-line" data-tone="mid" d="${flat(x0 + dw / 2 - 5, z0 + dh - 3.4, x0 + dw / 2 + 5, z0 + dh - 2.2, 0.5, 2)}"/><path class="iso-line" data-tone="faint" d="${flat(x0 + dw / 2 - 6, z0 + 2.2, x0 + dw / 2 + 6, z0 + 5.4, 0.5, 2)}"/></g>`);
    out.push(D([at([x0 + 3, c.y + c.d, z0 + 2.2]), at([x0 + dw - 3, c.y + c.d, z0 + 2.2])], { size: 0.32 }));
  }
  const vents = []; for (let i = 0; i < 6; i++) vents.push(flat(-(c.y + 5 + i * 3.8) - 0.9, 6, -(c.y + 5 + i * 3.8) + 0.9, 24, 0.9, 3));
  out.push(`<g transform="${r}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  // Bac des recherches : plateau en saillie sur le dessus, ruban gradué à son bord.
  const t = TRAY;
  out.push(S(slab(t, CAB_H, 1.6, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: t.x, y: t.y + t.d - 1.6, w: t.w, d: 1.6, r: 0.4 }, CAB_H + 1.6, 3.4, 2, 0.2), { tone: "mid" }), S(slab({ x: t.x, y: t.y, w: 1.6, d: t.d, r: 0.4 }, CAB_H + 1.6, 3.4, 2, 0.2), { tone: "mid" }), S(slab({ x: t.x + t.w - 1.6, y: t.y, w: 1.6, d: t.d, r: 0.4 }, CAB_H + 1.6, 3.4, 2, 0.2), { tone: "mid" }));
  const tk = k.topTicks(t.x + 4, t.x + t.w - 4, 4, 5, t.y + t.d - 1.4, CAB_H + 5, [0.9, 1.6], P);
  void tk;
  out.push(`<g data-part="slip"></g>`);
  return out.join("");
}

// ---------------------------------------------------------------- chevalet et tableau
function easelSvg() {
  const out = [];
  // Montants tournés, traverses du haut et du bas, pieds en équerre, étais arrière.
  for (const x of [BOARD.x - 4, BOARD.x + BOARD.w + 4]) {
    out.push(column(CTX, { x, y: 0, z0: CAB_H + 2, z1: BOARD.z1 + 12, r: 2.8, base: true, flutes: 10, collars: [0.2, 0.5, 0.8] }));
    out.push(S(slab({ x: x - 2.4, y: -12, w: 4.8, d: 12, r: 0.8 }, CAB_H + 1.6, 2, 2, 0.3), { tone: "lo" }));
  }
  out.push(S(slab({ x: BOARD.x - 8, y: -3.4, w: BOARD.w + 16, d: 6.8, r: 1 }, BOARD.z1 + 10, 4, 3, 0.7), { tone: "mid", inner: L(k.sideSeam({ x: BOARD.x - 8, y: -3.4, w: BOARD.w + 16, d: 6.8, r: 1 }, BOARD.z1 + 12, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners({ x: BOARD.x - 8, y: -3.4, w: BOARD.w + 16, d: 6.8 }, 1.8).map(([x, y]) => at([x, y, BOARD.z1 + 14])), { size: 0.36 }));
  out.push(S(slab({ x: BOARD.x - 6, y: -3, w: BOARD.w + 12, d: 6, r: 0.8 }, BOARD.z0 - 5, 3, 3, 0.5), { tone: "mid" }));
  return out.join("");
}
function boardSvg() {
  const out = [], b = BOARD, yf = 2.2, f = front(yf);
  // Cadre en onglet : quatre moulures, liège en retrait, 160 picots de liège (grille).
  const frame = { x: b.x, y: -2.2, w: b.w, d: 4.4, r: 1.2 };
  out.push(S(slab(frame, b.z0, b.z1 - b.z0, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(frame, (b.z0 + b.z1) / 2, P, 3), { tone: "faint" }) }));
  out.push(`<g transform="${f}"><path class="iso-fill" d="${flat(CORK.x0, CORK.z0, CORK.x1, CORK.z1, 1, 3)}"/><path class="iso-line" data-tone="lo" d="${flat(CORK.x0, CORK.z0, CORK.x1, CORK.z1, 1, 3)}"/><path class="iso-line" data-tone="faint" d="${flat(CORK.x0 + 2.4, CORK.z0 + 2.4, CORK.x1 - 2.4, CORK.z1 - 2.4, 1, 3)}"/></g>`);
  const holes = []; for (let x = CORK.x0 + 6; x <= CORK.x1 - 5; x += 8) for (let z = CORK.z0 + 6; z <= CORK.z1 - 5; z += 8) holes.push(at([x, yf, z]));
  out.push(D(holes, { size: 0.28 }));
  out.push(D([[b.x + 2.4, b.z0 + 2.4], [b.x + b.w - 2.4, b.z0 + 2.4], [b.x + 2.4, b.z1 - 2.4], [b.x + b.w - 2.4, b.z1 - 2.4]].map(([x, z]) => at([x, yf, z])), { size: 0.5 }));
  // Bandeau : fenêtre de la recherche en cours, deux vis ; au bord gauche, les lignes de recherche ; au bord droit, les plaques de source.
  out.push(display(f, flat(-34, b.z1 - 10, 34, b.z1 - 2.4, 1.2), { part: "query", x: 0, y: -(b.z1 - 6.2), size: 4.6, text: "EN ATTENTE" }));
  const KN = ["OT", "ÉQ.", "BÂT."];
  QROWS.forEach((z, i) => out.push(display(f, flat(-57, z - 3, -48, z + 3, 0.8), { part: "kind-" + i, x: -52.5, y: -(z - 1), size: 2.6, text: KN[i] })));
  ["GMAO", "exports", "SharePoint", "Excel", "Power BI"].forEach((n, i) => {
    const z = SROWS[i];
    out.push(display(f, flat(43, z - 3.4, 57, z + 3.4, 0.8), { part: "src-" + i, x: 50, y: -(z - 1.2), size: 2.6, text: n }));
    const [lx, ly] = at([58.6, yf, z]);
    out.push(`<circle class="fig-lamp" data-part="lamp-${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="0.95"/>`);
  });
  // Crochets de fil sur le cadre : un oeillet par ligne, côtés gauche et droit.
  for (const z of QROWS) out.push(S(k.cylinder(-30, yf + 0.4, 0.9, z - 0.8, 1.2, P, 10), { tone: "hi" }).slice(0, 0));
  out.push(`<g data-part="cards"></g>`);
  return out.join("");
}
// Poignées : pointes de repère des quatre coins du liège (ne s'ajoutent pas aux fils).
function pinsSvg() {
  const out = [];
  // Épingles de laiton plantées en tête de chaque fiche : tête bombée et tige.
  const pins = [...QROWS.map((z) => [QX, z + QH / 2 - 1.4]), ...SROWS.map((z) => [SX + SW / 2, z + SH / 2 - 1.2])];
  for (const [x, z] of pins) {
    const F = G.frameAlong([x, 1.4, z], [0, 1, 0]);
    out.push(S(G.disc(0, 1.2, 1.5, F, P), { tone: "hi" }), S(G.disc(1.2, 2.2, 0.8, F, P), { tone: "mid" }));
  }
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un tableau d'enquête sur chevalet, au-dessus d'un classeur à tiroirs. À gauche du liège, trois fiches de recherche : OT, équipement, bâtiment ; à droite, cinq fiches de source : GMAO, exports, SharePoint, Excel, Power BI. Une recherche arrive dans le bac, sa fiche s'épingle à sa ligne et un fil se tend jusqu'à la bonne source dont le voyant s'allume : le lien direct est établi, sans recopier les données.",
  body: [
    bench(P, PLATE, { strip: { x: -104, y: PLATE.y + PLATE.d - 13, w: 120, d: 7, r: 1 }, label: { x: 40, y: PLATE.y + PLATE.d - 17, w: 46, d: 11, r: 1.2 } }),
    cabinetSvg(), easelSvg(), boardSvg(), pinsSvg(), `<g data-part="strings"></g>`, `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
${PAPER}
const QROWS = ${JSON.stringify(QROWS)}, QX = ${QX}, QW = ${QW}, QH = ${QH}, SROWS = ${JSON.stringify(SROWS)}, SX = ${SX}, SW = ${SW}, SH = ${SH}, PINY = ${PINY}, TRAY = ${JSON.stringify(TRAY)}, TRAY_Z = ${TRAY_Z};
// Vrais chiffres : 10 à 15 min gagnées par recherche, ≈ 26 € la recherche (15 min à 104,74 €/h).
// Les recherches affichées sont illustratives ; le montant annuel (118 à 589 k€) reste à confirmer.
const SOURCES = ["GMAO", "exports", "SharePoint", "Excel", "Power BI"], KINDS = ["OT", "équipement", "bâtiment"];
const hash = (i) => { let h = Math.imul(i + 13, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const QUERIES = Array.from({ length: 12 }, (_, i) => {
  const kind = Math.floor(hash(i) * 3), src = kind === 0 ? [0, 2, 3][Math.floor(hash(i + 20) * 3)] : Math.floor(hash(i + 40) * 5);
  const value = kind === 0 ? "OT " + (4100000 + Math.floor(hash(i + 60) * 899999)) : kind === 1 ? "ÉQ " + ["TGBT", "CTA", "SSI", "ASC", "GE"][Math.floor(hash(i + 80) * 5)] + "-" + String(Math.floor(hash(i + 90) * 90) + 10) : "BÂT " + String.fromCharCode(65 + Math.floor(hash(i + 70) * 8));
  return { kind, src, value };
});
const CYCLE = 4.8, ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u)), lerp = (a, b, u) => a + (b - a) * u;
let clock = 0, touring = true, idle = 0;
const parts = { cards: $("cards"), strings: $("strings"), air: $("air"), slip: $("slip"), query: $("query") };
const vcard = (c, w, h, o = {}) => paperSvg(paperRows({ c, d: [0, 0, 1], w: [1, 0, 0], L: h, W: w, curl: o.curl ?? 0.03, wave: o.wave ?? 0.25, roll: o.roll ?? 0.2, ph: o.ph || 0, t: o.t || 0, NT: o.nt || 6 }), { head: true, lit: o.lit });
// Fil : de la fiche de recherche à la fiche de source, qui se tend avec une flèche et un oeillet à chaque bout.
function stringSvg(a, b, v, now) {
  const n = 18, pts = [];
  for (let i = 0; i <= n * v; i++) { const t = i / n, x = lerp(a[0], b[0], t), z = lerp(a[2], b[2], t) - 3.4 * Math.sin(Math.PI * t) * (1 - 0.35 * v), y = PINY + 0.8 + 0.5 * Math.sin(t * 9 - now * 6) * (1 - v) * 0.6; pts.push(iso([x, y, z], P)); }
  if (pts.length < 2) return "";
  return '<path class="fg-str" d="M' + pts.map(pPt).join("L") + '"/>';
}
function draw(now) {
  const n = Math.floor(clock / CYCLE), u = clock / CYCLE - n, q = QUERIES[n % QUERIES.length];
  // Phases : 0–0,22 la fiche vole du bac à sa ligne ; 0,22–0,4 le fil se tend ; 0,4–0,8 lien établi ; 0,8–1 le fil se rend, la fiche repart.
  const qz = QROWS[q.kind], sz = SROWS[q.src], pinQ = [QX + QW / 2 + 1, 0, qz + 3], pinS = [SX - 1, 0, sz + 1];
  const tray = [TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, TRAY_Z + 3 + QH / 2];
  let air = "", cards = "", strings = "";
  const fly = (v) => [lerp(tray[0], QX, ease(v)), lerp(tray[1], 1.2, ease(v)), lerp(tray[2], qz, ease(v)) + 12 * Math.sin(Math.PI * Math.max(0, Math.min(1, v)))];
  if (u < 0.22) air = vcard(fly(u / 0.22), QW, QH, { lit: true, curl: -0.07 * Math.sin(Math.PI * u / 0.22), wave: 1.2 * Math.sin(Math.PI * u / 0.22), roll: 0.7, ph: n, t: now });
  else if (u < 0.82) cards = vcard([QX, 1.4, qz], QW, QH, { lit: true, ph: n, t: now, curl: 0.02, wave: 0.2 });
  else air = vcard(fly(1 - (u - 0.82) / 0.18), QW, QH, { lit: true, curl: -0.07 * Math.sin(Math.PI * (u - 0.82) / 0.18), wave: 1.2 * Math.sin(Math.PI * (u - 0.82) / 0.18), roll: 0.7, ph: n, t: now });
  // Les cinq fiches de source et les deux autres fiches de recherche, toujours épinglées.
  let fixed = "";
  QROWS.forEach((z, i) => { if (!(i === q.kind && u >= 0.22 && u < 0.82)) fixed += vcard([QX, 1.4, z], QW, QH, { ph: i, t: now, curl: (i % 2 ? 1 : -1) * 0.025, wave: 0.18 }); });
  SROWS.forEach((z, i) => { fixed += vcard([SX + SW / 2, 1.4, z], SW, SH, { ph: i + 5, t: now, curl: (i % 2 ? 1 : -1) * 0.03, wave: 0.22, lit: i === q.src && u >= 0.4 && u < 0.8 }); });
  const v = u < 0.22 ? 0 : u < 0.4 ? ease((u - 0.22) / 0.18) : u < 0.8 ? 1 : 1 - ease((u - 0.8) / 0.18);
  if (v > 0.001) strings = stringSvg(pinQ, pinS, v, now);
  html(parts.cards, fixed + cards); html(parts.air, air); html(parts.strings, strings);
  html(parts.slip, u < 0.02 || u > 0.98 ? "" : vcard(tray, QW, QH, { ph: n + 3, t: now, curl: 0.03 }));
  for (let c = 0; c < 5; c++) attr($("lamp-" + c), "data-on", u >= 0.4 && u < 0.8 && c === q.src);
  const text = u < 0.9 ? q.value : "EN ATTENTE";
  if (parts.query.textContent !== text) parts.query.textContent = text;
  const done = n + (u >= 0.4 ? 1 : 0), lo = done * 10, hi = done * 15, hm = (m) => m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + String(m % 60).padStart(2, "0") : "") : m + " min";
  const span = hi < 60 ? lo + " à " + hi + " min" : hm(lo) + " à " + hm(hi);
  say(u >= 0.4 && u < 0.8 ? q.value + " → " + SOURCES[q.src] + " · lien direct · 10–15 min gagnées" : done + " recherche" + (done > 1 ? "s" : "") + " · " + span + " · ≈ " + fr(done * 26.19) + " €");
}
const run = loop((dt, calm) => { if (calm) clock = 0.6 * CYCLE; else if (touring) clock += dt; draw(performance.now() / 1000); });
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); clock = Math.max(0, next); run(); };
dragX(() => clock, (v, share) => steer(v + share * CYCLE * 6));
stage.addEventListener("keydown", (e) => { const to = { ArrowRight: (Math.floor(clock / CYCLE) + 1.6) * CYCLE, ArrowLeft: Math.max(0.6, Math.floor(clock / CYCLE) - 0.4) * CYCLE }[e.key]; if (to !== undefined) { e.preventDefault(); steer(to); } });
window.__fig = { at: (c) => { touring = false; clock = c * CYCLE; draw(1); return readout.textContent; }, QUERIES };
draw(1);
`;

const plate = k.plateHtml({
  fig: "Fig 09",
  title: "Retrouver tout le suivi",
  hint: "Glisse ou ← → : recherche",
  readout: "0 recherche",
  keys: [
    { mark: "lit", label: "La fiche de la recherche en cours, le fil et la source atteinte" },
    { mark: "raised", label: "À gauche, OT, équipement, bâtiment ; à droite, GMAO, exports, SharePoint, Excel, Power BI" },
  ],
  caption: "Une recherche par OT, équipement ou bâtiment arrive au même tableau ; la bonne source s'allume et le lien mène directement à l'écran concerné, sans recopier les données des outils. Chaque recherche fait gagner 10 à 15 min (près d'1 h quand elle passait par d'autres outils), soit ≈ 26 € à 104,74 €/h. Pour 14 utilisateurs, l'estimation annuelle de 118 à 589 k€ reste à confirmer. Recherches affichées illustratives.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Tableau d'enquête : flèches gauche et droite pour passer à la recherche suivante" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0">${svg}</div>`,
});

writeFigure("suivi", { title: "Retrouver tout le suivi · tableau d'enquête", plate, live, css: `<style>.fg-str{fill:none;stroke:#3e63dd;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}</style>` });

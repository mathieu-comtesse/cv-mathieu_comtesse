// Fig 09 · Retrouver tout le suivi : un monorail de capsules (poste pneumatique à rail).
// node figures/build-suivi.mjs  →  figures/suivi.html
// Trois chargeurs au pupitre : OT, équipement, bâtiment. Une recherche arrive, la capsule de sa ligne est saisie par le chariot
// du rail, roule jusqu'à la station de la bonne source (GMAO, exports, SharePoint, Excel, Power BI) et s'y pose ;
// le voyant de la station s'allume : le lien direct est établi. La capsule ne porte que l'adresse : le rail relie, il ne recopie pas.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 640, HEIGHT = 420;
const PLATE = { x: -128, y: -46, w: 256, d: 104, r: 8 };
const DESK = { x: -120, y: -30, w: 70, d: 54, r: 3 }, DESK_H = 22;                  // pupitre des chargeurs
const SOCKETS = [-110, -96, -82].map((x) => x + 0), SOCKET_Y = -4;                    // OT, équipement, bâtiment (axes x)
const BLOCK = { x: -36, y: -22, w: 150, d: 30, r: 3 }, BLOCK_H = 26;                  // socle des stations
const COLS = [-18, 12, 42, 72, 102];                                                  // axes des cinq stations
const POD = { r: 8.4, h: 10 };                                                        // station : cuvette d'accueil
const TRUNK = 112, CAPH = 12, CR = 3;                                                 // rail : hauteur du dessous, capsule
const RAIL_Y = -8;                                                                    // axe du rail et des stations
const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners({ x: -120, y: -40, w: 240, d: 60 }, 0, TRUNK + 14)], WIDTH, HEIGHT, { pad: 22, azimuth: 60 });
const { at, S, L, D, slab, front, right, flat, byDepth } = tools(P);
const HANG = TRUNK - 4 - CAPH;                                                        // z du pied de la capsule en transport
const PODZ = BLOCK_H + POD.h;                                                         // z du siège de la capsule en station

// ---------------------------------------------------------------- pupitre et socle
function deskSvg() {
  const out = [], d = DESK, f = front(d.y + d.d);
  out.push(`<path class="iso-halo" d="${k.haloOf(d, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(d, 0, DESK_H, 4, 1), { tone: "mid", inner: L(k.sideSeam(d, 6, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: d.x - 2, y: d.y - 2, w: d.w + 4, d: d.d + 4, r: 3 }, DESK_H - 3, 3, 3, 0.6), { tone: "mid" }));
  out.push(D(k.corners({ x: d.x - 2, y: d.y - 2, w: d.w + 4, d: d.d + 4 }, 3).map(([x, y]) => at([x, y, DESK_H])), { size: 0.42 }));
  // Trois chargeurs : un cylindre creux par type de recherche, et leur plaque.
  out.push(L(k.planOutline({ x: -116, y: SOCKET_Y - 9, w: 62, d: 18, r: 2 }, DESK_H, P, 3), { tone: "lo" }));
  for (const x of SOCKETS) {
    out.push(S(k.cylinder(x, SOCKET_Y, 5.6, DESK_H, 1.2, P, 28, 0.3), { tone: "mid" }));
    out.push(L(k.ring(x, SOCKET_Y, 3.6, DESK_H + 1.2, P, 20), { tone: "lo" }));
  }
  // Afficheur de la recherche en cours sur la face avant, deux tiroirs.
  out.push(display(f, flat(-114, 12, -56, 19, 1.2), { part: "query", x: -85, y: -13.6, size: 4.4, text: "EN ATTENTE" }));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(-114, 3, -90, 9, 1, 3)}${flat(-80, 3, -56, 9, 1, 3)}"/></g>`);
  out.push(D([-116, -54].map((x) => at([x, d.y + d.d, 7])), { size: 0.4 }));
  return out.join("");
}
function blockSvg() {
  const out = [], b = BLOCK, f = front(b.y + b.d);
  out.push(`<path class="iso-halo" d="${k.haloOf(b, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(b, 3), 0, 4, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(b, 4, BLOCK_H - 4, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(b, 12, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(b, 4).map(([x, y]) => at([x, y, BLOCK_H])), { size: 0.42 }));
  // Fenêtres des noms de source, une par station.
  ["GMAO", "exports", "SharePoint", "Excel", "Power BI"].forEach((name, c) => out.push(display(f, flat(COLS[c] - 12, 6, COLS[c] + 12, 14, 1.2), { part: "src-" + c, x: COLS[c], y: -8.4, size: 3.8, text: name })));
  out.push(D(COLS.flatMap((x) => [at([x - 14, b.y + b.d, 10]), at([x + 14, b.y + b.d, 10])]), { size: 0.36 }));
  return out.join("");
}
function stationSvg(c) {
  // Station : embase, cuvette d'accueil à bord renforcé et voyant sur sa face avant.
  const out = [], x = COLS[c], F = G.frameAlong([x, RAIL_Y, BLOCK_H], [0, 0, 1]);
  out.push(S(G.disc(0, 3, POD.r + 2, F, P), { tone: "lo" }));
  out.push(S(G.disc(3, POD.h, POD.r, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 3, POD.h, POD.r, 20, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(L(G.circleOf(F, POD.h, POD.r - 1.4, P), { tone: "lo" }));
  const [lx, ly] = at([x + POD.r + 5, RAIL_Y + 6, BLOCK_H + 1.2]);
  out.push(S(k.cylinder(x + POD.r + 5, RAIL_Y + 6, 2.4, BLOCK_H, 1.2, P, 18), { tone: "mid" }));
  out.push(`<circle class="fig-lamp" data-part="lamp-${c}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  return out.join("");
}
// ---------------------------------------------------------------- rail
const POSTS = [-108, -38, 34, 106];
function railSvg() {
  const out = [], beam = { x: -112, y: RAIL_Y - 3.5, w: 226, d: 7, r: 1 };
  for (const x of POSTS) {
    const base = x < -50 ? DESK_H + 3 : BLOCK_H;                 // les montants arrière partent du pupitre ou du socle
    out.push(S(slab({ x: x - 2.4, y: RAIL_Y - 12, w: 4.8, d: 4.8, r: 0.8 }, x < -50 ? DESK_H : BLOCK_H, TRUNK - (x < -50 ? DESK_H : BLOCK_H), 3, 0.5), { tone: "mid" }));
    void base;
  }
  out.push(S(slab(beam, TRUNK, 6, 3, 0.7), { tone: "mid", inner: L(k.sideSeam(beam, TRUNK + 3, P, 3), { tone: "faint" }) }));
  out.push(S(slab({ x: -110, y: RAIL_Y - 1, w: 222, d: 2, r: 0.3 }, TRUNK + 6, 1.2, 2, 0.2), { tone: "lo" }));
  const dots = []; for (let x = -104; x <= 104; x += 16) dots.push(at([x, RAIL_Y + 3.5, TRUNK + 3]));
  out.push(D(dots, { size: 0.36 }));
  for (const x of [-112, 111]) out.push(S(slab({ x: x - 1, y: RAIL_Y - 4, w: 2, d: 8, r: 0.4 }, TRUNK, 8, 2, 0.2), { tone: "hi" }));
  return out.join("");
}
// Capsule dessinée à l'origine (pied en z = 0) : corps cylindrique, deux bagues, nez arrondi.
function capsuleSvg(lit) {
  const st = lit ? { tone: "hi", lit: true } : { tone: "hi" };
  const F = G.frameAlong([0, 0, 0], [0, 0, 1]);
  return S(G.disc(0, CAPH - 2, CR, F, P), st) + S(G.sphereOf([0, 0, CAPH - 2], CR, P), st) + L(G.circleOf(F, 3, CR, P) + G.circleOf(F, CAPH - 4.4, CR, P), { tone: "lo" });
}
// Chariot du rail : châssis, deux galets et crochet, dessiné à l'origine sur le rail.
function carrierSvg() {
  const out = [];
  out.push(S(slab({ x: -7, y: RAIL_Y - 5, w: 14, d: 10, r: 1 }, TRUNK + 7.2, 5, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: -7, y: RAIL_Y - 5, w: 14, d: 10, r: 1 }, TRUNK + 9.5, P, 3), { tone: "faint" }) }));
  for (const sx of [-4, 4]) out.push(S(G.disc(-4.4, -2.8, 2.2, G.frameAlong([sx, RAIL_Y, TRUNK + 7], [0, 1, 0]), P), { tone: "lo" }));
  out.push(S(slab({ x: -1.2, y: RAIL_Y - 5, w: 2.4, d: 10, r: 0.2 }, TRUNK - 4, 4, 2, 0), { tone: "mid" }));
  for (const sx of [-4, 4]) out.push(S(G.disc(5.2, 6.8, 2.2, G.frameAlong([sx, RAIL_Y, TRUNK + 7], [0, 1, 0]), P), { tone: "lo" }));
  const M = G.frameAlong([0, RAIL_Y, TRUNK + 12.2], [0, 0, 1]);
  out.push(S(G.disc(0, 3.4, 2.6, M, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(M, 0, 3.4, 2.6, 14, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(S(G.disc(3.4, 4.2, 1.6, M, P), { tone: "hi" }));
  out.push(D([at([-5.6, RAIL_Y + 5, TRUNK + 9]), at([5.6, RAIL_Y + 5, TRUNK + 9])], { size: 0.32 }));
  return out.join("");
}


// ---------------------------------------------------------------- finitions
function deskDetail() {
  const out = [], d = DESK, f = right(d.x + d.w);
  // Pieds, évents du flanc, repères de chargeur et règle graduée sur la tablette.
  for (const [x, y] of k.corners(d, 6)) out.push(S(k.cylinder(x, y, 2.4, DESK_H, 0.6, P, 14), { tone: "mid" }));
  const vents = []; for (let i = 0; i < 6; i++) vents.push(flat(-(d.y + 8 + i * 6.8) - 1, 4, -(d.y + 8 + i * 6.8) + 1, 14, 1, 3));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  SOCKETS.forEach((x, i) => out.push(L(k.ring(x, SOCKET_Y, 7.4, DESK_H, P, 20), { tone: i === 0 ? "mid" : "lo" })));
  const strip = { x: -116, y: 12, w: 62, d: 4, r: 0.6 };
  out.push(S(slab(strip, DESK_H, 0.5, 2, 0), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 4, 5, strip.y + 0.3, DESK_H + 0.5, [1, 1.9], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // Voyants de chargeur : un voyant par type de recherche.
  SOCKETS.forEach((x) => out.push(S(k.cylinder(x, 8, 1.1, DESK_H, 0.9, P, 10), { tone: "mid" })));
  return out.join("");
}
function blockDetail() {
  const out = [], b = BLOCK, f = right(b.x + b.w);
  const vents = []; for (let i = 0; i < 5; i++) vents.push(flat(-(b.y + 5 + i * 5) - 1, 5, -(b.y + 5 + i * 5) + 1, 19, 1, 3));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  // Prises de service sur le dessus entre les stations, cache-câbles arrière.
  out.push(S(slab({ x: b.x + 4, y: b.y + 2, w: b.w - 8, d: 3, r: 0.6 }, BLOCK_H, 3.2, 2, 0.3), { tone: "mid", inner: L(k.sideSeam({ x: b.x + 4, y: b.y + 2, w: b.w - 8, d: 3, r: 0.6 }, BLOCK_H + 1.6, P, 2), { tone: "faint" }) }));
  COLS.slice(0, 4).forEach((x) => { const xm = x + 15; out.push(S(k.cylinder(xm, RAIL_Y + 10, 1.4, BLOCK_H, 0.8, P, 12), { tone: "mid" })); });
  // Ruban de repère sous chaque nom : une pastille de couleur-ton par source.
  out.push(D(COLS.map((x) => at([x, b.y + b.d, 4.6])), { size: 0.5 }));
  return out.join("");
}
function podDetail(c) {
  const out = [], x = COLS[c], F = G.frameAlong([x, RAIL_Y, BLOCK_H + POD.h], [0, 0, 1]);
  // Bague de sertissage, quatre vis sur le bord, repère de pose en croix au fond.
  out.push(L(G.circleOf(F, 0, POD.r - 3, P), { tone: "faint" }));
  out.push(D(G.dotsOf(F, 0, POD.r - 0.8, 6, P, { phase: Math.PI / 6, all: true }), { size: 0.34 }));
  return out.join("");
}
function railDetail() {
  const out = [], yf = RAIL_Y + 3.5;
  // Raidisseurs, rivets, plaque et règle de course sur le rail.
  for (let x = -100; x <= 100; x += 20) out.push(S(slab({ x: x - 0.8, y: yf, w: 1.6, d: 1.3, r: 0.2 }, TRUNK + 0.8, 4.4, 2, 0.15), { tone: "mid" }));
  const rows = []; for (let x = -108; x <= 108; x += 8) rows.push(at([x, yf, TRUNK + 0.9]), at([x, yf, TRUNK + 5.1]));
  out.push(D(rows, { size: 0.3 }));
  const strip = { x: -108, y: RAIL_Y - 3.1, w: 216, d: 1.5, r: 0 };
  out.push(S(slab(strip, TRUNK + 6, 0.5, 2, 0), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 2, strip.x + strip.w - 2, 6, 5, strip.y + 0.2, TRUNK + 6.5, [0.7, 1.2], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // Colliers et semelles des montants.
  for (const x of POSTS) { const b = x < -50 ? DESK_H : BLOCK_H; out.push(S(slab({ x: x - 3.6, y: RAIL_Y - 13.2, w: 7.2, d: 7.2, r: 0.8 }, b, 2.2, 2, 0.3), { tone: "lo" })); out.push(S(slab({ x: x - 3.6, y: RAIL_Y - 13.2, w: 7.2, d: 7.2, r: 0.8 }, TRUNK - 14, 2.2, 2, 0.3), { tone: "mid" })); }
  out.push(D(POSTS.map((x) => at([x, RAIL_Y - 7.6, TRUNK])), { size: 0.36 }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un monorail de capsules. Le pupitre porte trois chargeurs : OT, équipement, bâtiment. Une recherche arrive ; le chariot du rail saisit la capsule de sa ligne, la mène à la station de la bonne source (GMAO, exports, SharePoint, Excel ou Power BI) et la pose dans sa cuvette ; le voyant de la station s'allume : le lien direct est établi, sans recopier les données.",
  body: [
    bench(P, PLATE, { strip: { x: -48, y: PLATE.y + PLATE.d - 13, w: 120, d: 7, r: 1 }, label: { x: 80, y: PLATE.y + PLATE.d - 15, w: 40, d: 11, r: 1.2 } }),
    deskSvg(), deskDetail(), blockSvg(), blockDetail(), ...COLS.map((_, c) => stationSvg(c) + podDetail(c)), railSvg(), railDetail(),
    `<g data-part="loaders"></g>`,
    `<g data-part="carrier">${carrierSvg()}</g>`, `<g data-part="fly"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
const COLS = ${JSON.stringify(COLS)}, SOCKETS = ${JSON.stringify(SOCKETS)}, SOCKET_Y = ${SOCKET_Y}, DESK_H = ${DESK_H}, TRUNK = ${TRUNK}, RAIL_Y = ${RAIL_Y}, HANG = ${HANG}, PODZ = ${PODZ}, CAPH = ${CAPH};
const CAPS = [${JSON.stringify(capsuleSvg(false))}, ${JSON.stringify(capsuleSvg(true))}];
// Vrais chiffres : 10 à 15 min gagnées par recherche, ≈ 26 € la recherche (15 min à 104,74 €/h).
// Les recherches affichées sont illustratives ; le montant annuel (118 à 589 k€) reste à confirmer.
const SOURCES = ["GMAO", "exports", "SharePoint", "Excel", "Power BI"], KINDS = ["OT", "équipement", "bâtiment"];
const hash = (i) => { let h = Math.imul(i + 13, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const QUERIES = Array.from({ length: 12 }, (_, i) => {
  const kind = Math.floor(hash(i) * 3), src = kind === 0 ? [0, 2, 3][Math.floor(hash(i + 20) * 3)] : Math.floor(hash(i + 40) * 5);
  const value = kind === 0 ? "OT " + (4100000 + Math.floor(hash(i + 60) * 899999)) : kind === 1 ? "ÉQ " + ["TGBT", "CTA", "SSI", "ASC", "GE"][Math.floor(hash(i + 80) * 5)] + "-" + String(Math.floor(hash(i + 90) * 90) + 10) : "BÂT " + String.fromCharCode(65 + Math.floor(hash(i + 70) * 8));
  return { kind, src, value };
});
const CYCLE = 4.6, ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u)), lerp = (a, b, u) => a + (b - a) * u;
let clock = 0, touring = true, idle = 0;
const loaders = $("loaders"), query = $("query"), fly = $("fly"), carrier = $("carrier");
const seat = (kind) => [SOCKETS[kind], SOCKET_Y, DESK_H + 1.2];
// Trajet : le chariot rejoint le chargeur, saisit, roule, descend dans la station, y reste, remonte et rapporte.
function carry(q, u) {
  const from = seat(q.kind), to = [COLS[q.src], RAIL_Y, PODZ + 0.4], home = -112 + 8;
  let cx, z, holding = true;
  const lift = (a, b) => lerp(a, b, 1);
  if (u < 0.14) { cx = lerp(home + 0, from[0], ease(u / 0.14)); z = from[2]; holding = false; }
  else if (u < 0.24) { cx = from[0]; z = lerp(from[2], HANG, ease((u - 0.14) / 0.1)); }
  else if (u < 0.5) { cx = lerp(from[0], to[0], ease((u - 0.24) / 0.26)); z = HANG; }
  else if (u < 0.6) { cx = to[0]; z = lerp(HANG, to[2], ease((u - 0.5) / 0.1)); }
  else if (u < 0.8) { cx = to[0]; z = to[2]; }
  else if (u < 0.86) { cx = to[0]; z = lerp(to[2], HANG, ease((u - 0.8) / 0.06)); }
  else if (u < 0.96) { cx = lerp(to[0], from[0], ease((u - 0.86) / 0.1)); z = HANG; }
  else { cx = from[0]; z = lerp(HANG, from[2], ease((u - 0.96) / 0.04)); }
  void lift; void holding;
  return { cx, z, atStation: u >= 0.6 && u < 0.8, plugged: u >= 0.58 && u < 0.82, away: u >= 0.14 && u < 0.96 };
}
function draw() {
  const n = Math.floor(clock / CYCLE), u = clock / CYCLE - n, q = QUERIES[n % QUERIES.length];
  const st = carry(q, u);
  // Les trois chargeurs : la capsule de la recherche en cours part avec le chariot, les deux autres attendent.
  html(loaders, SOCKETS.map((x, kind) => kind === q.kind && st.away ? "" : '<g transform="' + translateAlong(P, seat(kind)) + '">' + CAPS[0] + "</g>").join(""));
  const carried = !(u < 0.14);
  put(carrier, translateAlong(P, [st.cx, 0, 0]));
  // Capsule portée : suspendue au chariot par une tige pendant le transport.
  html(fly, carried && st.away || u >= 0.96 ? '<g transform="' + translateAlong(P, [st.cx, RAIL_Y, st.z]) + '">' + CAPS[1] + "</g>" + (st.z > PODZ + 4 && st.z > DESK_H + 8 ? lineSvg(segment([st.cx, RAIL_Y, TRUNK - 3], [st.cx, RAIL_Y, st.z + CAPH - 1], P), { tone: "hi" }) : "") : "");
  COLS.forEach((_, c) => attr($("lamp-" + c), "data-on", st.plugged && c === q.src));
  const text = u < 0.9 ? q.value : "EN ATTENTE";
  if (query.textContent !== text) query.textContent = text;
  const done = n + (u >= 0.6 ? 1 : 0), lo = done * 10, hi = done * 15, hm = (m) => m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + String(m % 60).padStart(2, "0") : "") : m + " min";
  const span = hi < 60 ? lo + " à " + hi + " min" : hm(lo) + " à " + hm(hi);
  say(st.plugged ? q.value + " → " + SOURCES[q.src] + " · lien direct · 10–15 min gagnées" : done + " recherche" + (done > 1 ? "s" : "") + " · " + span + " · ≈ " + fr(done * 26.19) + " €");
}
const run = loop((dt, calm) => { if (calm) clock = 0.7 * CYCLE; else if (touring) clock += dt; draw(); });
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); clock = Math.max(0, next); run(); };
dragX(() => clock, (v, share) => steer(v + share * CYCLE * 6));
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: (Math.floor(clock / CYCLE) + 1.7) * CYCLE, ArrowLeft: Math.max(0.7, Math.floor(clock / CYCLE) - 0.3) * CYCLE }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(to); }
});
// Accès de vérification (captures).
window.__fig = { at: (c) => { touring = false; clock = c * CYCLE; draw(); return readout.textContent; }, QUERIES };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 09",
  title: "Retrouver tout le suivi",
  hint: "Glisse ou ← → : recherche",
  readout: "0 recherche",
  keys: [
    { mark: "lit", label: "La capsule de la recherche en cours, posée dans sa station" },
    { mark: "raised", label: "Chargeurs : OT, équipement, bâtiment ; stations : GMAO, exports, SharePoint, Excel, Power BI" },
  ],
  caption: "Une recherche par OT, équipement ou bâtiment arrive au même pupitre ; la bonne source s'allume et le lien mène directement à l'écran concerné, sans recopier les données des outils. Chaque recherche fait gagner 10 à 15 min (près d'1 h quand elle passait par d'autres outils), soit ≈ 26 € à 104,74 €/h. Pour 14 utilisateurs, l'estimation annuelle de 118 à 589 k€ reste à confirmer. Recherches affichées illustratives.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Monorail de recherche : flèches gauche et droite pour passer à la recherche suivante" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0">${svg}</div>`,
});

writeFigure("suivi", { title: "Retrouver tout le suivi · monorail de capsules", plate, live });

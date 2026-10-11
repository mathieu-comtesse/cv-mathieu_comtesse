// Fig 09 · Retrouver tout le suivi : un standard téléphonique à fiches.
// node figures/build-suivi.mjs  →  figures/suivi.html
// Trois prises d'appel sur le pupitre : OT, équipement, bâtiment. Une recherche arrive, la fiche de sa
// ligne monte et se branche sur le jack de la bonne source (GMAO, exports, SharePoint, Excel, Power BI) ;
// la lampe au-dessus s'allume : le lien direct est établi. Le standard relie, il ne recopie pas.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 420;
const PLATE = { x: -112, y: -46, w: 224, d: 104, r: 8 };
const DESK = { x: -92, y: -34, w: 184, d: 62, r: 3 }, DESK_H = 30;
const PANEL = { x: -86, y: -32, w: 172, d: 12, r: 2 }, PANEL_Z = [DESK_H, 118], FACE = PANEL.y + PANEL.d;
const COLS = [-56, -28, 0, 28, 56], ROWS_Z = [96, 74, 52];        // sources × entrées
const SOCKETS = [-40, 0, 40], SOCKET_Y = 12;                       // OT, équipement, bâtiment
const PLUG = { r: 3, h: 13 };

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(PANEL, PANEL_Z[0], PANEL_Z[1] + 6)], WIDTH, HEIGHT, { pad: 20, azimuth: 60, elevation: 30 });
const { at, S, L, D, slab, front, flat } = tools(P);
const Y = [0, 1, 0];

// ---------------------------------------------------------------- pupitre et tableau
function deskSvg() {
  const out = [], d = DESK;
  out.push(`<path class="iso-halo" d="${k.haloOf(d, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(d, 0, DESK_H, 4, 1), { tone: "mid", inner: L(k.sideSeam(d, 6, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: d.x - 2, y: d.y - 2, w: d.w + 4, d: d.d + 4, r: 3 }, DESK_H - 3, 3, 3, 0.6), { tone: "mid" }));
  out.push(D(k.corners({ x: d.x - 2, y: d.y - 2, w: d.w + 4, d: d.d + 4 }, 3).map(([x, y]) => at([x, y, DESK_H])), { size: 0.42 }));
  // Tablette des fiches : trois douilles, une par type de recherche, et la règle du pupitre.
  out.push(L(k.planOutline({ x: -60, y: SOCKET_Y - 8, w: 120, d: 16, r: 2 }, DESK_H, P, 3), { tone: "lo" }));
  for (const x of SOCKETS) {
    out.push(S(k.cylinder(x, SOCKET_Y, 5.6, DESK_H, 1.2, P, 28, 0.3), { tone: "mid" }));
    out.push(L(k.ring(x, SOCKET_Y, 3.4, DESK_H + 1.2, P, 20), { tone: "lo" }));
  }
  // Afficheur de la recherche en cours sur la face avant, et deux tiroirs.
  const f = front(d.y + d.d);
  out.push(display(f, flat(-44, 18, 44, 25, 1.2), { part: "query", x: 0, y: -19.6, size: 5.2, text: "EN ATTENTE" }));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(-84, 4, -50, 14, 1, 3)}${flat(50, 4, 84, 14, 1, 3)}"/><path class="iso-line" data-tone="mid" d="${flat(-70, 8.4, -64, 9.6, 0.5, 2)}${flat(64, 8.4, 70, 9.6, 0.5, 2)}"/></g>`);
  return out.join("");
}
function panelSvg() {
  const out = [], f = front(FACE);
  out.push(S(slab(PANEL, PANEL_Z[0], PANEL_Z[1] - PANEL_Z[0], 4, 1), { tone: "mid", inner: L(k.sideSeam(PANEL, PANEL_Z[0] + 8, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: PANEL.x - 2, y: PANEL.y - 1, w: PANEL.w + 4, d: PANEL.d + 4, r: 2 }, PANEL_Z[1], 4, 3, 0.6), { tone: "mid" }));
  out.push(D([[PANEL.x + 4, PANEL_Z[0] + 4], [PANEL.x + PANEL.w - 4, PANEL_Z[0] + 4], [PANEL.x + 4, PANEL_Z[1] - 4], [PANEL.x + PANEL.w - 4, PANEL_Z[1] - 4]].map(([x, z]) => at([x, FACE, z])), { size: 0.45 }));
  // Cadres des colonnes de sources et des lignes d'entrées.
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="faint" d="${COLS.map((x) => flat(x - 11, 40, x + 11, 108, 2, 3)).join("")}"/></g>`);
  COLS.forEach((x, c) => ROWS_Z.forEach((z, r) => {
    const F = G.frameAlong([x, FACE, z], Y);
    out.push(S(G.disc(0, 1.2, 4.4, F, P), { tone: "mid" }));
    out.push(L(G.circleOf(F, 1.2, 2.2, P), { tone: "lo" }));
    const [lx, ly] = at([x, FACE, z + 8]);
    out.push(`<g transform="${f}"><circle class="iso-line" data-tone="lo" cx="${x}" cy="${-(z + 8)}" r="2.6" fill="none"/></g><circle class="fig-lamp" data-part="lamp-${r}-${c}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.6"/>`);
  }));
  return out.join("");
}
// Fiche (plug) debout dans sa douille, base à l'origine.
const plugSvg = (lit) => k.solidSvg(k.cylinder(0, 0, 2, 0, 4, P, 16, 0.2), { tone: "hi", lit }) + k.solidSvg(k.cylinder(0, 0, PLUG.r, 4, PLUG.h - 4, P, 20, 0.4), { tone: "hi", lit, inner: k.lineSvg(k.knurl(0, 0, PLUG.r, 4, PLUG.h, 14, P), { tone: "faint" }) });

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un standard téléphonique à fiches sur un établi. Le tableau porte cinq colonnes de jacks, une par source (GMAO, exports, SharePoint, Excel, Power BI), sur trois lignes : OT, équipement, bâtiment. Sur le pupitre, trois fiches attendent dans leurs douilles. À chaque recherche, la fiche de sa ligne se branche sur le jack de la bonne source et la lampe au-dessus s'allume.",
  body: [
    bench(P, PLATE, { strip: { x: -90, y: PLATE.y + PLATE.d - 11, w: 90, d: 7, r: 1 }, label: { x: 40, y: PLATE.y + PLATE.d - 13, w: 46, d: 10, r: 1.2 } }),
    deskSvg(), panelSvg(), `<g data-part="plugs"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const COLS = ${JSON.stringify(COLS)}, ROWS_Z = ${JSON.stringify(ROWS_Z)}, SOCKETS = ${JSON.stringify(SOCKETS)}, SOCKET_Y = ${SOCKET_Y}, DESK_H = ${DESK_H}, FACE = ${FACE}, PLUG = ${JSON.stringify(PLUG)};
const PLUGS = [${JSON.stringify(plugSvg(false))}, ${JSON.stringify(plugSvg(true))}];
${LOOP}
// Vrais chiffres : 10 à 15 min gagnées par recherche, ≈ 26 € la recherche (15 min à 104,74 €/h).
// Les recherches affichées sont illustratives ; le montant annuel (118 à 589 k€) reste à confirmer.
const SOURCES = ["GMAO", "exports", "SharePoint", "Excel", "Power BI"], KINDS = ["OT", "équipement", "bâtiment"];
const hash = (i) => { let h = Math.imul(i + 13, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const QUERIES = Array.from({ length: 12 }, (_, i) => {
  const kind = Math.floor(hash(i) * 3), src = kind === 0 ? [0, 2, 3][Math.floor(hash(i + 20) * 3)] : Math.floor(hash(i + 40) * 5);
  const value = kind === 0 ? "OT " + (4100000 + Math.floor(hash(i + 60) * 899999)) : kind === 1 ? "ÉQ " + ["TGBT", "CTA", "SSI", "ASC", "GE"][Math.floor(hash(i + 80) * 5)] + "-" + String(Math.floor(hash(i + 90) * 90) + 10) : "BÂT " + String.fromCharCode(65 + Math.floor(hash(i + 70) * 8));
  return { kind, src, value };
});
const CYCLE = 4.2, ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
let clock = 0, touring = true, idle = 0;
const plugs = $("plugs"), query = $("query");
// Trajet de la fiche : sortie de la douille, vol jusqu'au jack, branchement, maintien, retour.
function plugAt(q, u) {
  const home = [SOCKETS[q.kind], SOCKET_Y, DESK_H + 1.2], jack = [COLS[q.src], FACE + 1.2 + PLUG.h, ROWS_Z[q.kind]];
  const go = ease(u / 0.3), back = ease((u - 0.75) / 0.25), v = u < 0.75 ? go : 1 - back;
  const p = home.map((h, i) => h + (jack[i] - h) * v);
  p[2] += 22 * Math.sin(Math.PI * v) * (u < 0.3 || u > 0.75 ? 1 : 0);
  return { p, plugged: u >= 0.3 && u < 0.75, v };
}
// Cordon : de la douille à la fiche, en chaînette.
function cord(from, to) {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14, sag = 8 * Math.sin(Math.PI * t) * Math.min(1, Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / 40); pts.push(iso([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, Math.max(DESK_H + 1.2, from[2] + (to[2] - from[2]) * t - sag)], P)); }
  return wireSvg(pts[0], pts[pts.length - 1], { via: pts.slice(1, -1), tone: "hi", size: 1.4 });
}
function draw() {
  const n = Math.floor(clock / CYCLE), u = clock / CYCLE - n, q = QUERIES[n % QUERIES.length];
  const st = plugAt(q, u);
  let svgPlugs = "";
  SOCKETS.forEach((x, kind) => {
    if (kind === q.kind && st.v > 0.001) {
      // La fiche est couchée vers le tableau une fois branchée : sa tige entre dans le jack.
      const base = st.plugged ? [st.p[0], st.p[1] - PLUG.h, st.p[2]] : st.p;
      svgPlugs += cord([x, SOCKET_Y, DESK_H + 1.2], st.plugged ? [st.p[0], st.p[1], st.p[2]] : base);
      svgPlugs += st.plugged
        ? solidSvg(G_rod(base, 4), { tone: "hi", lit: true }) + solidSvg(G_cap(base), { tone: "hi", lit: true })
        : '<g transform="' + translateAlong(P, base) + '">' + PLUGS[1] + "</g>";
    } else svgPlugs += '<g transform="' + translateAlong(P, [x, SOCKET_Y, DESK_H + 1.2]) + '">' + PLUGS[0] + "</g>";
  });
  plugs.innerHTML = svgPlugs;
  COLS.forEach((_, c) => ROWS_Z.forEach((_, r) => { $("lamp-" + r + "-" + c).dataset.on = String(st.plugged && r === q.kind && c === q.src); }));
  const text = u < 0.85 ? q.value : "EN ATTENTE";
  if (query.textContent !== text) query.textContent = text;
  const done = n + (u >= 0.3 ? 1 : 0), lo = done * 10, hi = done * 15, hm = (m) => m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + String(m % 60).padStart(2, "0") : "") : m + " min";
  const span = hi < 60 ? lo + " à " + hi + " min" : hm(lo) + " à " + hm(hi);
  say(st.plugged ? q.value + " → " + SOURCES[q.src] + " · lien direct · 10–15 min gagnées" : done + " recherche" + (done > 1 ? "s" : "") + " · " + span + " · ≈ " + fr(done * 26.19) + " €");
}
// Tige couchée le long de −y depuis la fiche (prisme rond le long de l'axe y).
function G_rod(base, len) { const r = 2, ring = Array.from({ length: 16 }, (_, i) => [Math.cos(i / 16 * 6.283) * r, Math.sin(i / 16 * 6.283) * r]); return prismY(base, ring, 0, len); }
function G_cap(base) { const r = PLUG.r, ring = Array.from({ length: 20 }, (_, i) => [Math.cos(i / 20 * 6.283) * r, Math.sin(i / 20 * 6.283) * r]); return prismY(base, ring, 4, PLUG.h); }
function prismY(o, ring, s0, s1) {
  const a = ring.map(([x, z]) => iso([o[0] + x, o[1] + s0, o[2] + z], P)), b = ring.map(([x, z]) => iso([o[0] + x, o[1] + s1, o[2] + z], P));
  const hull = convexHull([...a, ...b]), d = (pts) => "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
  return { fill: d(hull), outline: d(hull), shades: ["", "", "", ""], top: d(b) };
}
const run = loop((dt, calm) => { if (calm) clock = 0.5 * CYCLE; else if (touring) clock += dt; draw(); });
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); clock = Math.max(0, next); run(); };
dragX(() => clock, (v, share) => steer(v + share * CYCLE * 6));
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: (Math.floor(clock / CYCLE) + 1.5) * CYCLE, ArrowLeft: Math.max(0.5, Math.floor(clock / CYCLE) - 0.5) * CYCLE }[e.key];
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
    { mark: "lit", label: "La fiche de la recherche en cours, branchée sur sa source" },
    { mark: "raised", label: "Lignes : OT, équipement, bâtiment ; colonnes : GMAO, exports, SharePoint, Excel, Power BI" },
  ],
  caption: "Une recherche par OT, équipement ou bâtiment arrive au même pupitre ; la bonne source s'allume et le lien mène directement à l'écran concerné, sans recopier les données des outils. Chaque recherche fait gagner 10 à 15 min (près d'1 h quand elle passait par d'autres outils), soit ≈ 26 € à 104,74 €/h. Pour 14 utilisateurs, l'estimation annuelle de 118 à 589 k€ reste à confirmer. Recherches affichées illustratives.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Standard de recherche : flèches gauche et droite pour passer à la recherche suivante" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0">${svg}</div>`,
});

writeFigure("suivi", { title: "Retrouver tout le suivi · standard à fiches", plate, live, css: `<style>.iso-wire .iso-line{stroke-width:1.5}</style>` });

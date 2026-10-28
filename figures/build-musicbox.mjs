// Fig 11 (variante E) · Lecteur VRE : la boîte à musique.
// Le modèle est un cylindre à picots : la position de chaque picot est ce que le modèle a appris. Un rapport PDF entre dans le lecteur,
// la manivelle fait tourner le cylindre (une roue de 46 dents mène une roue de 20 : 2,3 fois plus vite) et chaque picot pince la lamelle de
// son champ (tri, mini-BERT). L'étouffoir, c'est les règles métiers : il coupe les notes impossibles (hybride neuro-symbolique). Les douze
// cases du devant sont les pages inédites proposées ; chaque page sort par la bouche du flanc, l'agent la valide ou la corrige sur la table
// lumineuse (Radiographie, Human-in-the-Loop) puis elle part au corpus. Le corpus figé sert à planter les picots d'un cylindre neuf
// (entraînement LayoutLMv3), le banc d'essai le juge sur deux rapports séparés, le levier le publie : l'ancien cylindre rejoint l'étagère
// des versions, le nouveau descend dans le boîtier (MLOps local).
// node figures/build-musicbox.mjs  →  figures/vrestudio-musicbox.html
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, writeFigure, LOOP } from "./common.mjs";
import { readFileSync } from "node:fs";
import * as MD from "../refonte/m3d/musicbox-model.js";
const { CASE, CYL, GEARS, GEAR_X, NT, CONTACT, tx, TOOTH, IMPOSSIBLE, PINS3, PINS4, PLANT, CELLS, FACIA, cellX, TRAY, CORPUS_TOP, EXIT, DECK, READER, READ_SLOT, DIV, BLANK, GAUGE, LEVER, BOARD, DESK, ABOVE } = MD;
const PH = MD.phases(false);
const CYC = [CYL.xc, CYL.y, CYL.z];

const WIDTH = 900, HEIGHT = 660;
const PLATE = { x: -128, y: -64, w: 340, d: 150, r: 12 };
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -21, 0), [CASE.x0, CASE.y0 - 6, CASE.h + 58], [CASE.x1, CASE.y0 - 6, CASE.h + 58], [CASE.x0, CASE.y1, CASE.h + 18], [BOARD.x1, BOARD.y, BOARD.z1 + 4]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 32 },
);
const { at, S, L, D, slab, front, right } = tools(P);
const TAU = Math.PI * 2;
const dots = (pts, size = 0.45, tone = "lo") => D(pts.map((p) => at(p)), { size, tone });
const box = (x0, x1, y0, y1, z, h, o = {}) => S(k.extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z, h, P, { bevel: o.bevel ?? 0.5 }), { tone: o.tone || "mid", lit: o.lit, crease: o.crease, className: o.cls });
const WOOD = { cls: "mat-wood" }, BRONZE = { cls: "mat-bronze" }, STEEL = { cls: "mat-steel" };
// une roue couchée (plan horizontal) : denture extrudée, pour la machine à diviser et les pignons de rechange
const gearPlan = (cx, cy, r, n, a0 = 0, cut = n, depth = 1.6) => { const out = []; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU, w = TAU / n, ro = i < cut ? r : r - depth, ri = r - depth; for (const [rr, f] of [[ri, 0], [ri, 0.18], [ro, 0.3], [ro, 0.62], [ri, 0.74]]) out.push([cx + rr * Math.cos(a + w * f), cy + rr * Math.sin(a + w * f)]); } return out; };
// inscription gravée : rangées de lettres en traits (alphabet de traits inspiré des inscriptions du mécanisme)
const GLYPHS = ["M0 3L1 0L2 3", "M0 0V3M0 0H2V3", "M2 0H0L1 1.5L0 3H2", "M0 0V3H2", "M0 0H2M1 0V3", "M0 0V3M2 0V3M0 1.5H2", "M0 0L2 3M2 0L0 3", "M0 0H2V1.5H0M0 0V3", "M1 0V3", "M0 3V0L2 3V0"];
function inscription(u0, v0, w, rows, seed = 1, gap = 3.2) {
  let d = "", r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let j = 0; j < rows; j++) { let u = u0; const end = u0 + w * (j === rows - 1 ? 0.6 : 1); while (u < end - 2) { if (rnd() < 0.14) { u += 2.2; continue; } d += GLYPHS[(rnd() * GLYPHS.length) | 0].replace(/([ML])([\d.]+) ([\d.]+)|([HV])([\d.]+)/g, (m, c, x, y, c2, q) => c ? c + (u + x * 0.6).toFixed(2) + " " + (v0 + j * gap + y * 0.6).toFixed(2) : c2 + (c2 === "H" ? (u + q * 0.6).toFixed(2) : (v0 + j * gap + q * 0.6).toFixed(2))); u += 1.9; } }
  return `<path class="ak-engr" d="${d}"/>`;
}

const ring48 = (r, cx = 0, cy = 0) => "M" + Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * TAU; return (cx + r * Math.cos(a)).toFixed(2) + " " + (cy + r * Math.sin(a)).toFixed(2); }).join("L");
const circ = (r, cx = 0, cy = 0) => `M${(cx + r).toFixed(2)} ${cy}A${r} ${r} 0 1 0 ${(cx - r).toFixed(2)} ${cy}A${r} ${r} 0 1 0 ${(cx + r).toFixed(2)} ${cy}Z`;
// une roue sur la face : épaisseur (copie sombre décalée vers le fond), moyeu, rayons ou trous d'allègement, axe
// Roues en volume. Dans le plan d'une face, reculer d'une unité de profondeur (vers -y) décale le dessin d'un vecteur fixe OFF :
// une roue est un prisme, face arrière décalée, flancs des dents (seuls ceux tournés vers OFF se voient) ombrés selon leur
// orientation, parois des trous d'allègement, puis face avant. Une pièce « levée » (rayons, moyeu, cheville) avance vers le spectateur.
const OFF = (() => { const m = right(GEAR_X).match(/[-\d.e]+/g).map(Number), o = at([GEAR_X, 0, 0]), q = at([GEAR_X - 1, 0, 0]), dx = q[0] - o[0], dy = q[1] - o[1], det = m[0] * m[3] - m[2] * m[1];
  return [+((dx * m[3] - m[2] * dy) / det).toFixed(4), +((m[0] * dy - m[1] * dx) / det).toFixed(4)]; })();
function gearPts(r, n, depth, cut, a0, cx, cy) { const pts = []; for (let i = 0; i < n; i++) { const w = TAU / n, a = a0 + i * w, ro = i < cut ? r : r - depth, ri = r - depth; for (const [rr, q] of [[ri, 0], [ri, 0.18], [ro, 0.3], [ro, 0.62], [ri, 0.74]]) pts.push([cx + rr * Math.cos(a + w * q), cy + rr * Math.sin(a + w * q)]); } return pts; }
function circPts(r, cx, cy, steps = 40) { return Array.from({ length: steps }, (_, i) => { const a = (i / steps) * TAU; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }); }
function prism(pts, T, o = {}) { return prismS(pts, OFF[0] * T, OFF[1] * T, o); }
function prismS(pts, ox, oy, o = {}) {
  const f = (v) => v.toFixed(2), L = [-0.45, -0.89];
  const poly = (ps, dx = 0, dy = 0) => "M" + ps.map((p) => f(p[0] + dx) + " " + f(p[1] + dy)).join("L") + "Z";
  let area = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area > 0 ? 1 : -1, bk = ["", "", ""];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1, nx = sg * ey / l, ny = -sg * ex / l;
    if (nx * ox + ny * oy <= 0) continue;
    const d = nx * L[0] + ny * L[1];
    bk[d > 0.3 ? 0 : d > -0.4 ? 1 : 2] += "M" + f(a[0]) + " " + f(a[1]) + "L" + f(b[0]) + " " + f(b[1]) + "L" + f(b[0] + ox) + " " + f(b[1] + oy) + "L" + f(a[0] + ox) + " " + f(a[1] + oy) + "Z";
  }
  let out = '<path class="ak-sbk" d="' + poly(pts, ox, oy) + '"/>' + bk.map((d, i) => (d ? '<path class="ak-s' + i + '" d="' + d + '"/>' : "")).join(""), holes = "";
  for (const [hx, hy, hr] of o.holes || []) {
    const th = circPts(hr, hx + ox, hy + oy, 32).map(([x, y]) => { const dx = x - hx, dy = y - hy, dd = Math.hypot(dx, dy); return dd > hr ? [hx + dx / dd * hr, hy + dy / dd * hr] : [x, y]; });
    out += '<path class="ak-s2" d="' + poly(circPts(hr, hx, hy, 32)) + '"/><path class="ak-thru" d="' + poly(th) + '"/>';
    holes += poly(circPts(hr, hx, hy, 32));
  }
  return out + '<path class="' + (o.cls || "ak-gear") + '" d="' + poly(pts) + holes + '" fill-rule="evenodd"/>';
}
const lift = (pts, h) => pts.map((p) => [p[0] - OFF[0] * h, p[1] - OFF[1] * h]);
const raised = (pts, h, T, cls) => prism(lift(pts, h + T), T, { cls });
// une roue complète : jante dentée, trous d'allègement ou rayons levés, moyeu levé, vis et axe ; h = hauteur au-dessus de la platine
function wheel3d(g, ang, o = {}) {
  const r = g.r, dep = o.depth ?? g.d ?? Math.max(1.6, r * 0.07), T = o.T ?? (r > 12 ? 3 : 2.2), h = o.h ?? 0, f = (v) => v.toFixed(2);
  const c0 = lift([[g.u, -g.z]], h)[0], cx = c0[0], cy = c0[1];
  const rot = (x, y) => [cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang)];
  const top = (p, k) => lift([p], k)[0];
  const holes = !o.spokes && r > 9 ? [0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + 0.4, p = rot(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); return [...top(p, T), r * 0.22]; }) : [];
  let s = prism(lift(gearPts(r, g.n, dep, o.cut ?? g.n, ang, cx, cy), T), T, { holes, cls: "ak-gear" + (o.lit ? " ak-lit" : "") });
  const [fx, fy] = top([cx, cy], T);
  s += '<path class="ak-root" d="' + circ(r - dep - 0.5, fx, fy) + '"/>';
  if (o.spokes) {
    s += '<path class="ak-web" d="' + circ(r - 5.6, fx, fy) + '"/>';
    o.spokes.forEach((cls, i) => {
      const a = ang + (i / o.spokes.length) * TAU, c = Math.cos(a), sn = Math.sin(a), w = 3.2, R = r - 5.8;
      s += raised([[-sn * w, c * w], [R * c - sn * w, R * sn + c * w], [R * c + sn * w, R * sn - c * w], [sn * w, -c * w]].map(([x, y]) => [cx + x, cy + y]), T, 1.2, "ak-gear " + cls);
      for (const k of [0.42, 0.78]) { const p = top([cx + r * k * c, cy + r * k * sn], T + 1.2); s += '<path class="ak-rivet" d="' + circ(0.75, p[0], p[1]) + '"/>'; }
    });
  }
  const hub = Math.max(2.4, r * 0.18);
  s += raised(circPts(hub + 0.9, cx, cy, 28), T, 1.4, "ak-gear ak-hub");
  const [hx, hy] = top([cx, cy], T + 1.4);
  if (r > 9) s += [0, 1, 2].map((i) => { const a = (i / 3) * TAU + 0.5 + ang; return '<path class="ak-rivet" d="' + circ(0.45, hx + Math.cos(a) * hub * 0.62, hy + Math.sin(a) * hub * 0.62) + '"/>'; }).join("");
  s += raised(circPts(1.3, cx, cy, 14), T + 1.4, 1, "ak-axle3");
  return s;
}


// ---------------------------------------------------------------- l'établi
const base = [bench(P, PLATE, { plateH: 14, footH: 7, strip: { x: -112, y: PLATE.y + PLATE.d - 12, w: 120, d: 7, r: 1 }, label: { x: 30, y: PLATE.y + PLATE.d - 14, w: 50, d: 10, r: 1.2 } })];
const X = [1, 0, 0];
const axisX = (c, prof, tone = "mid", cls = "mat-steel") => S(G.solidOf(prof, G.frameAlong(c, X), P), { tone, className: cls });

// le cylindre à picots : le corps est dessiné une fois, au centre CYC, puis déplacé (la projection est affine)
const CYL_BODY = (() => {
  const h = (CYL.x1 - CYL.x0) / 2, r = CYL.r;
  return S(G.solidOf([[-h - 4, 1.6], [-h, 1.6], [-h, r - 1.5], [-h + 1.2, r], [h - 1.2, r], [h, r - 1.5], [h, 1.6], [h + 4, 1.6]], G.frameAlong(CYC, X), P), { tone: "hi", className: "mat-bronze" });
})();

// ---------------------------------------------------------------- le boîtier ouvert : couvercle dressé derrière, fond, flancs, tête de lecture, peigne
const { x0, x1, y0, y1, h, t } = CASE;
const caseSvg = (() => {
  const out = [];
  // couvercle dressé sur deux charnières : face intérieure feutrée, cadre de marqueterie, plaque gravée
  out.push(box(x0 - 3, x1 + 3, y0 - 6, y0 - 2, h, 56, { tone: "lo", bevel: 1, ...WOOD }));
  const lid = front(y0 - 2);
  out.push(`<g transform="${lid}"><path class="iso-line" data-tone="faint" d="M${x0 + 4} ${-(h + 6)}H${x1 - 4}V${-(h + 50)}H${x0 + 4}Z"/><path class="iso-line" data-tone="faint" d="M${x0 + 8} ${-(h + 10)}H${x1 - 8}V${-(h + 46)}H${x0 + 8}Z"/>`
    + `<path class="ak-bridge" d="M-22 ${-(h + 29)}H22V${-(h + 38)}H-22Z"/>${inscription(-19, -(h + 36.6), 38, 2, 61, 3)}${inscription(x0 + 12, -(h + 14), 40, 1, 63)}${inscription(x1 - 52, -(h + 14), 40, 1, 67)}</g>`);
  for (const x of [-50, 56]) out.push(axisX([x - 6, y0 - 2, h], [[0, 1.6], [12, 1.6]]));
  // socle mouluré sur quatre pieds en boule
  for (const [x, y] of [[x0 - 1, y0 - 1], [x1 + 1, y0 - 1], [x0 - 1, y1 + 1], [x1 + 1, y1 + 1]]) out.push(S(k.cylinder(x, y, 2.6, 0, 2, P, 16), { tone: "mid", className: "mat-bronze" }));
  out.push(box(x0 - 5, x1 + 5, y0 - 5, y1 + 5, 2, 3, { tone: "lo", bevel: 0.8, ...WOOD }));
  out.push(box(x0 - 3.5, x1 + 3.5, y0 - 3.5, y1 + 3.5, 5, 2, { tone: "lo", bevel: 0.6, ...WOOD }));
  out.push(box(x0 + t, x1 - t, y0 + t, y1, 7, 1.2, { tone: "lo", bevel: 0.2, ...WOOD }));                               // plancher
  out.push(box(x0, x1, y0, y0 + t, 7, h - 7, { tone: "lo", ...WOOD }));                                                  // fond
  out.push(box(x0, x0 + t, y0, y1, 7, h - 7, { tone: "mid", ...WOOD }));                                                 // flanc gauche
  out.push(`<g transform="${right(x0 + t)}">${[0.22, 0.47, 0.71].map((q, i) => `<path class="ak-grain" d="M${-y1} ${-(7 + (h - 7) * q).toFixed(1)}C${(-y1 + 14).toFixed(1)} ${-(9 + (h - 7) * q + i).toFixed(1)} ${(-y0 - 16).toFixed(1)} ${-(5 + (h - 7) * q).toFixed(1)} ${-y0 - t} ${-(8 + (h - 7) * q).toFixed(1)}"/>`).join("")}</g>`);
  // face intérieure du fond : cadre, gravure des six champs à plat
  const bk = front(y0 + t);
  out.push(`<g transform="${bk}"><path class="iso-line" data-tone="faint" d="M${x0 + t + 4} -11H${x1 - t - 4}V${-(h - 5)}H${x0 + t + 4}Z"/>${inscription(x0 + t + 8, -(h - 12), 36, 2, 7, 3)}${inscription(x1 - t - 46, -(h - 12), 36, 2, 11, 3)}${inscription(-8, -16, 60, 1, 15)}</g>`);
  out.push(dots([[x0 + t + 6, y0 + t, 14], [x1 - t - 6, y0 + t, 14], [x0 + t + 6, y0 + t, h - 8], [x1 - t - 6, y0 + t, h - 8]], 0.7, "mid"));
  // tête de lecture : bloc d'acier, vitre sombre, objectif (le voyant s'allume pendant la lecture)
  out.push(box(54, 76, y0 + t + 1, -30, 8, 50, { tone: "mid", bevel: 0.8, ...STEEL }));
  out.push(`<g transform="${front(-30)}"><path class="iso-fill fig-dark" d="M57 -44H73V-30H57Z"/><path class="iso-line" data-tone="mid" d="${ring48(4.2, 65, -37)}"/><path class="iso-line" data-tone="lo" d="${ring48(2.4, 65, -37)}"/><g data-part="lamp"></g>${inscription(55, -20, 20, 1, 71)}</g>`);
  // paliers du cylindre : tourillon gauche, tourillon droit contre le flanc ; arbre d'entraînement qui traverse le flanc
  out.push(box(CYL.x0 - 6, CYL.x0 - 1, CYL.y - 4, CYL.y + 4, 7, CYL.z - 1.6 - 7, { tone: "mid", bevel: 0.4, ...STEEL }));
  out.push(box(CYL.x1 + 0.5, CYL.x1 + 4.5, CYL.y - 4, CYL.y + 4, 7, CYL.z - 1.6 - 7, { tone: "mid", bevel: 0.4, ...STEEL }));
  out.push(axisX([GEAR_X, CYL.y, CYL.z], [[0, 1.8], [CYL.x0 - 3.5 - GEAR_X, 1.8]], "mid", "mat-bronze"));
  // peigne : deux pieds, socle d'acier à vis ; les lamelles sont vivantes
  const bz = TOOTH.z - 4;
  for (const xx of [CYL.x0 - 2, CYL.x1 - 1.5]) out.push(box(xx, xx + 3.5, TOOTH.y0, TOOTH.y0 + 4.5, 7, bz - 7, { tone: "mid", bevel: 0.3, ...STEEL }));
  out.push(box(CYL.x0 - 2, CYL.x1 + 2, TOOTH.y0, TOOTH.y0 + 4.5, bz, 5.8, { tone: "mid", bevel: 0.5, ...STEEL }));
  out.push(dots(Array.from({ length: 5 }, (_, i) => [CYL.x0 + 2 + i * ((CYL.x1 - CYL.x0 - 4) / 4), TOOTH.y0 + 4.5, bz + 3]), 0.5, "hi"));
  // montants de l'étouffoir, avec leur rainure
  for (const xx of [CYL.x0 - 2.5, CYL.x1 + 1]) { out.push(box(xx, xx + 1.8, TOOTH.y0, TOOTH.y0 + 2, bz + 5.8, 12, { tone: "mid", bevel: 0.2, ...STEEL })); }
  return out.join("");
})();
const caseFront = (() => {
  const out = [];
  out.push(box(x1 - t, x1, y0, y1, 7, h - 7, { tone: "mid", ...WOOD }));                                                // flanc droit (porte le train du gain)
  out.push(box(DECK.x0, DECK.x1, y0 - 3, y1 + 3, DECK.z, DECK.h, { tone: "mid", bevel: 0.8, ...WOOD }));               // plateau du lecteur
  out.push(dots([[DECK.x0 + 3, y1 + 3, DECK.z + 1.5], [DECK.x1 - 3, y1 + 3, DECK.z + 1.5]], 0.5, "hi"));
  // lecteur : bloc d'acier, fente d'entrée entre deux lèvres de laiton
  out.push(box(READER.x0, READER.x1, READER.y0, READER.y1, READER.z0, READER.z1 - READER.z0, { tone: "mid", bevel: 0.8, ...STEEL }));
  const rx = READ_SLOT[0], ry = READ_SLOT[1];
  out.push(box(rx - 8.5, rx + 8.5, ry - 2.6, ry + 2.6, READER.z1, 1.2, { tone: "mid", bevel: 0.4, ...BRONZE }));
  out.push(`<path class="iso-fill fig-dark" d="${k.pathOf([at([rx - 6.6, ry - 0.9, READER.z1 + 1.2]), at([rx + 6.6, ry - 0.9, READER.z1 + 1.2]), at([rx + 6.6, ry + 0.9, READER.z1 + 1.2]), at([rx - 6.6, ry + 0.9, READER.z1 + 1.2])], true)}"/>`);
  out.push(dots([[rx - 7.4, ry + 2.6, READER.z1 + 1.2], [rx + 7.4, ry + 2.6, READER.z1 + 1.2]], 0.5, "hi"));
  out.push(`<g transform="${front(READER.y1)}">${inscription(READER.x0 + 3, -(READER.z0 + 9), READER.x1 - READER.x0 - 6, 2, 81, 3)}</g>`);
  // rampe des douze cases : une case par page inédite
  out.push(box(x0 - 3, x1 + 3, y1 - 1, y1 + 3, FACIA.z0, FACIA.z1 - FACIA.z0, { tone: "mid", bevel: 0.8, ...WOOD }));
  out.push(`<g transform="${front(FACIA.y)}">${CELLS.map((_, i) => `<rect class="ak-cell" data-part="cell-${i}" x="${(cellX(i) - 3).toFixed(2)}" y="${-(FACIA.z0 + 6.6).toFixed(2)}" width="6" height="4.4" rx="0.7"/>`).join("")}${inscription(x0 + 2, -(FACIA.z0 + 1.2), 20, 1, 91)}</g>`);
  // bouche de sortie des pages, sur le flanc : lèvres, ouverture sombre
  out.push(box(x1, EXIT[0], EXIT[1] - 11, EXIT[1] + 11, EXIT[2] - 6, 12, { tone: "mid", bevel: 0.8, ...STEEL }));
  out.push(`<g transform="${right(EXIT[0])}"><path class="iso-fill fig-dark" d="M${-(EXIT[1] + 9)} ${-(EXIT[2] + 3.5)}H${-(EXIT[1] - 9)}V${-(EXIT[2] - 3.5)}H${-(EXIT[1] + 9)}Z"/><path class="iso-line" data-tone="mid" d="M${-(EXIT[1] + 10)} ${-(EXIT[2] + 4.5)}H${-(EXIT[1] - 10)}V${-(EXIT[2] - 4.5)}H${-(EXIT[1] + 10)}Z"/></g>`);
  out.push(dots([[x1, y0 + 3, 9], [x1, y1 - 3, 9], [x1, y0 + 3, h - 3], [x1, y1 - 3, h - 3]], 0.5, "hi"));
  out.push(`<g transform="${right(x1)}"><path class="ak-bridge" d="M14 -30H36V-18H14Z"/><text class="ak-tag" x="25" y="-22.2" text-anchor="middle" style="font-size:4.2px">46 : 20</text>${inscription(12, -42, 26, 2, 97, 3)}</g>`);
  return out.join("");
})();

// ---------------------------------------------------------------- la machine à planter les picots (établi, devant à droite)
const RB = CYL.r + 2;
const divSvg = (() => {
  const out = [];
  out.push(box(DIV.x - 54, DIV.x + 54, DIV.y - 24, DIV.y + 26, 0, 2, { tone: "lo", bevel: 0.6, ...STEEL }));
  out.push(box(DIV.x - 52, DIV.x + 52, DIV.y - 22, DIV.y + 24, 2, 4, { tone: "lo", bevel: 1, ...STEEL }));
  out.push(dots([[DIV.x - 49, DIV.y - 19, 6], [DIV.x + 49, DIV.y - 19, 6], [DIV.x - 49, DIV.y + 21, 6], [DIV.x + 49, DIV.y + 21, 6]], 0.55, "hi"));
  out.push(box(DIV.x - 12, DIV.x + 12, DIV.y + 24, DIV.y + 24.6, 2.6, 2.8, { tone: "mid", bevel: 0.1, ...BRONZE }));
  out.push(`<g transform="${front(DIV.y + 24.6)}">${inscription(DIV.x - 10, -4.9, 20, 1, 21)}</g>`);
  // deux berceaux : le cylindre neuf y repose par ses tourillons
  for (const dx of [-36, 36]) out.push(box(DIV.x + dx - 4, DIV.x + dx + 4, DIV.y - 9, DIV.y + 9, 6, BLANK.z - CYL.r - 6, { tone: "mid", bevel: 0.6, ...STEEL }));
  // rail du chariot, au fond, sur deux montants ; l'aiguille est vivante
  for (const dx of [-52, 49]) out.push(box(DIV.x + dx, DIV.x + dx + 3, DIV.y - 21, DIV.y - 17, 6, BLANK.z + CYL.r - 8, { tone: "mid", bevel: 0.4, ...STEEL }));
  out.push(box(DIV.x - 52, DIV.x + 52, DIV.y - 21, DIV.y - 17, BLANK.z + CYL.r + 6, 3, { tone: "mid", bevel: 0.5, ...STEEL }));
  // banc d'essai : fente des rapports de test sur le dessus, deux cadrans (F1, rappel U1) et leur seuil, voyant
  const Gg = GAUGE, gx = (Gg.x0 + Gg.x1) / 2, gy = (Gg.y0 + Gg.y1) / 2;
  out.push(box(Gg.x0, Gg.x1, Gg.y0, Gg.y1, 6, Gg.z1 - 6, { tone: "mid", bevel: 0.6, ...STEEL }));
  out.push(`<path class="iso-fill fig-dark" d="${k.pathOf([at([gx - 6.5, gy - 0.8, Gg.z1]), at([gx + 6.5, gy - 0.8, Gg.z1]), at([gx + 6.5, gy + 0.8, Gg.z1]), at([gx - 6.5, gy + 0.8, Gg.z1])], true)}"/>`);
  let meters = "";
  for (const [cu, th] of [[Gg.x0 + 4.8, 0.75], [Gg.x1 - 4.8, 0.9]]) {
    const cv = -11, r = 3.6, arc = Array.from({ length: 25 }, (_, i) => { const a = Math.PI - (i / 24) * Math.PI; return (i ? "L" : "M") + (cu + r * Math.cos(a)).toFixed(2) + " " + (cv - r * Math.sin(a)).toFixed(2); }).join("");
    const ta = Math.PI - th * Math.PI;
    meters += `<path class="ak-face" d="M${cu - r - 0.8} ${cv + 0.8}H${cu + r + 0.8}V${cv - r - 0.8}H${cu - r - 0.8}Z"/><path class="ak-meter" d="${arc}"/><path class="ak-thr" d="M${(cu + (r - 1.2) * Math.cos(ta)).toFixed(2)} ${(cv - (r - 1.2) * Math.sin(ta)).toFixed(2)}L${(cu + (r + 0.4) * Math.cos(ta)).toFixed(2)} ${(cv - (r + 0.4) * Math.sin(ta)).toFixed(2)}"/>`;
  }
  out.push(`<g transform="${front(Gg.y1)}">${meters}${inscription(Gg.x0 + 1.5, -21.5, Gg.x1 - Gg.x0 - 3, 1, 41)}</g>`);
  // levier de publication : son boîtier ; le bras est dessiné vivant
  out.push(box(LEVER.x - 4, LEVER.x + 4, LEVER.y - 10, LEVER.y, 6, LEVER.z - 6, { tone: "mid", ...STEEL }));
  out.push(`<g transform="${front(LEVER.y)}"><path class="ak-bridge" d="M${LEVER.x - 3} ${-(LEVER.z - 4)}H${LEVER.x + 3}V${-(LEVER.z - 8)}H${LEVER.x - 3}Z"/>${inscription(LEVER.x - 2.4, -(LEVER.z - 4.6), 4.8, 1, 31)}</g>`);
  return out.join("");
})();

// étagère des versions : planche, socle, un berceau par cylindre, une étiquette par emplacement
const boardSvg = (() => {
  const out = [box(BOARD.x0, BOARD.x1, BOARD.y, BOARD.y + 3, 4, BOARD.z1 - 4, { tone: "lo", ...WOOD })];
  out.push(box(BOARD.x0 - 3, BOARD.x1 + 3, BOARD.y - 3, BOARD.y + 12, 0, 4, { tone: "mid", bevel: 0.8, ...WOOD }));
  out.push(box(BOARD.x0 - 1, BOARD.x1 + 1, BOARD.y - 2, BOARD.y + 5, BOARD.z1, 3, { tone: "mid", bevel: 0.6, ...WOOD }));
  let s = `<path class="ak-grain" d="M${BOARD.x0} -30C${BOARD.x0 + 26} -32 ${BOARD.x0 + 50} -28 ${BOARD.x1} -31M${BOARD.x0} -76C${BOARD.x0 + 30} -74 ${BOARD.x0 + 44} -78 ${BOARD.x1} -75"/>`;
  BOARD.slots.forEach(([u, z], i) => {
    for (const dx of [-42, 36]) out.push(box(u + dx, u + dx + 6, BOARD.y + 3, BOARD.cy + 5, z - CYL.r - 2, 2, { tone: "mid", bevel: 0.3, ...WOOD }));
    s += `<path class="ak-bridge" d="M${BOARD.x1 - 8} ${-(z + 2.6)}H${BOARD.x1 - 2}V${-(z - 1.4)}H${BOARD.x1 - 8}Z"/><text class="ak-tag" x="${BOARD.x1 - 5}" y="${-(z - 0.2)}" text-anchor="middle">v${i + 1}</text>`;
  });
  out.push(`<g transform="${front(BOARD.y + 3)}">${s}</g>`);
  return out.join("");
})();
const traySvg = (() => {
  const out = [box(TRAY.x - 24, TRAY.x + 24, TRAY.y - 18, TRAY.y + 18, 0, 3, { tone: "lo", bevel: 0.8, ...WOOD })];
  out.push(box(TRAY.x - 24, TRAY.x - 22, TRAY.y - 18, TRAY.y + 18, 3, 3, { tone: "lo", bevel: 0.2, ...WOOD }), box(TRAY.x - 24, TRAY.x + 24, TRAY.y - 18, TRAY.y - 16, 3, 3, { tone: "lo", bevel: 0.2, ...WOOD }));
  // pile des rapports à lire : la fiche du dessus montre ses quatre champs
  for (let i = 0; i < 7; i++) out.push(box(TRAY.x - 19 + (i % 2) * 0.6, TRAY.x - 1 + (i % 2) * 0.6, TRAY.y - 12 + (i % 3) * 0.3, TRAY.y + 11, 3 + i * 1.1, 1, { tone: "hi", crease: "none", bevel: 0.2 }));
  const zt = 3 + 7 * 1.1, fields = ["ak-f0s", "ak-f1s", "ak-f2s", "ak-f3s"];
  fields.forEach((c, i) => out.push(`<path class="${c}" d="${k.pathOf([at([TRAY.x - 16, TRAY.y - 8 + i * 4.5, zt]), at([TRAY.x - 16 + [11, 7, 13, 9][i], TRAY.y - 8 + i * 4.5, zt])])}"/>`));
  // boîte du corpus : trois intercalaires (image, texte, position) qui dépassent
  out.push(box(TRAY.x + 3, TRAY.x + 22, TRAY.y - 14, TRAY.y + 14, 3, 11, { tone: "mid", bevel: 0.6, ...WOOD }));
  ["ak-r0", "ak-r1", "ak-r2"].forEach((c, i) => out.push(box(TRAY.x + 5 + i * 5.6, TRAY.x + 7.4 + i * 5.6, TRAY.y - 11 + i * 2, TRAY.y + 11, 14, 3 + i * 0.6, { tone: "mid", bevel: 0.2, cls: "mat-" + c })));
  return out.join("");
})();
// l'établi de l'horloger : plan de la roue, compas, lime, pignons de rechange, burette, loupe
const toolsSvg = (() => {
  const out = [];
  // feuille de tracé à l'arrière gauche : la roue dessinée au compas
  const sheet = { x: -122, y: -10, w: 40, d: 28 };
  out.push(S(k.slabOf({ ...sheet, r: 0.6 }, 0, 0.4, P, 2, 0), { tone: "mid", crease: "none", className: "mat-paper" }));
  const scx = sheet.x + 16, scy = sheet.y + 14;
  out.push(`<path class="ak-ink" d="${[10, 8.6, 3.6].map((r) => k.ring(scx, scy, r, 0.4, P, 40)).join("")}${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU; return k.pathOf([at([scx, scy, 0.4]), at([scx + 10 * Math.cos(a), scy + 10 * Math.sin(a), 0.4])]); }).join("")}"/>`);
  out.push(`<path class="ak-ink" d="${[0, 1, 2, 3].map((i) => k.pathOf([at([sheet.x + 30, sheet.y + 5 + i * 5, 0.4]), at([sheet.x + 37, sheet.y + 5 + i * 5, 0.4])])).join("")}"/>`);
  // compas à pointes : deux branches ouvertes depuis la tête
  const hx = -36, hy = 18;
  out.push(`<path class="ak-leg" d="${k.pathOf([at([hx - 12, hy + 16, 0.4]), at([hx, hy, 2.6]), at([hx + 15, hy + 12, 0.4])])}"/><path class="ak-legc" d="${k.pathOf([at([hx - 12, hy + 16, 0.4]), at([hx, hy, 2.6]), at([hx + 15, hy + 12, 0.4])])}"/>`);
  out.push(D([at([hx, hy, 2.6])], { size: 1.3, tone: "hi" }), D([at([hx - 12, hy + 16, 0.4]), at([hx + 15, hy + 12, 0.4])], { size: 0.5, tone: "hi" }));
  // lime : manche de bois, taille croisée
  out.push(box(-12, 10, 52, 55, 0, 1.4, { tone: "mid", bevel: 0.2, ...STEEL }), box(10, 22, 51.6, 55.4, 0, 2.2, { tone: "mid", bevel: 0.6, ...WOOD }));
  out.push(`<path class="ak-hatch" d="${Array.from({ length: 10 }, (_, i) => k.pathOf([at([-10 + i * 2, 52, 1.4]), at([-9 + i * 2, 55, 1.4])])).join("")}"/>`);
  // boîte de picots de rechange et pince
  out.push(box(-56, -34, 50, 64, 0, 2.4, { tone: "mid", bevel: 0.5, ...WOOD }));
  out.push(D(Array.from({ length: 14 }, (_, i) => at([-53 + (i % 5) * 4.2, 53 + Math.floor(i / 5) * 4, 2.4])), { size: 0.7, tone: "hi" }));
  // burette d'huile
  out.push(S(k.cylinder(-70, 66, 5, 0, 5, P, 24), { tone: "mid", className: "mat-bronze" }), S(k.cylinder(-70, 66, 3.2, 5, 2, P, 20), { tone: "mid", className: "mat-bronze" }));
  out.push(L(k.pathOf([at([-70, 66, 7]), at([-61, 61, 14])]), { tone: "hi" }), D([at([-70, 66, 7]), at([-61, 61, 14])], { size: 0.6, tone: "hi" }));
  // table lumineuse « Radiographie » : cadre de bois, verre dépoli quadrillé, plaque gravée
  out.push(box(DESK.x0, DESK.x1, DESK.y0, DESK.y1, 0, DESK.z - 1, { tone: "mid", bevel: 0.8, ...WOOD }));
  out.push(box(DESK.x0 + 1.6, DESK.x1 - 1.6, DESK.y0 + 1.6, DESK.y1 - 1.6, DESK.z - 1, 1, { tone: "lo", bevel: 0.2, cls: "mat-light" }));
  out.push(`<path class="ak-lightgrid" d="${[0.25, 0.5, 0.75].map((q) => k.pathOf([at([DESK.x0 + 1.6 + (DESK.x1 - DESK.x0 - 3.2) * q, DESK.y0 + 1.6, DESK.z]), at([DESK.x0 + 1.6 + (DESK.x1 - DESK.x0 - 3.2) * q, DESK.y1 - 1.6, DESK.z])]) + k.pathOf([at([DESK.x0 + 1.6, DESK.y0 + 1.6 + (DESK.y1 - DESK.y0 - 3.2) * q, DESK.z]), at([DESK.x1 - 1.6, DESK.y0 + 1.6 + (DESK.y1 - DESK.y0 - 3.2) * q, DESK.z])])).join("")}"/>`);
  out.push(`<g transform="${front(DESK.y1)}"><path class="ak-bridge" d="M${DESK.x0 + 4} -1H${DESK.x1 - 4}V-4H${DESK.x0 + 4}Z"/>${inscription(DESK.x0 + 5.5, -3.4, DESK.x1 - DESK.x0 - 11, 1, 51, 3)}</g>`);
  // loupe d'horloger
  out.push(S(k.cylinder(36, 64, 5, 0, 2.4, P, 28), { tone: "mid", className: "mat-steel" }), S(k.cylinder(36, 64, 3.8, 2.4, 0.2, P, 28), { tone: "lo", crease: "none", className: "mat-glass" }));
  return out.join("");
})();


const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Une boîte à musique sur un établi : le rapport entre dans le lecteur, le cylindre à picots, qui est le modèle, pince les lamelles du peigne, l'étouffoir des règles coupe les notes impossibles, douze cases proposent les pages inédites ; l'agent valide chaque page sur la table lumineuse ; le corpus figé sert à planter les picots d'un cylindre neuf, le banc d'essai le juge sur deux rapports séparés ; le levier le publie : l'ancien cylindre rejoint l'étagère des versions et le nouveau descend dans le boîtier ; une roue de 46 dents mène une roue de 20 dents : gain ×2,3.",
  body: [...base, toolsSvg, boardSvg, `<g data-part="board"></g>`, traySvg, caseSvg,
    `<g data-part="inside"></g><g data-part="teeth"></g>`, caseFront, `<g transform="${right(GEAR_X)}" data-part="gears"></g>`,
    `<g data-part="seal"></g>`, divSvg, `<g data-part="div"></g><g data-part="travel"></g><g data-part="sheets"></g><g data-part="hand"></g>`],
});

// ---------------------------------------------------------------- vivant
const MODEL_SRC = readFileSync(new URL("../refonte/m3d/musicbox-model.js", import.meta.url), "utf8").replace(/^export /gm, "");
const live = `
const P = ${JSON.stringify(P)};
const MODEL = (() => {
${MODEL_SRC}
return { TAU, CASE, CYL, GEARS, GEAR_X, phases, NT, CONTACT, tx, TOOTH, IMPOSSIBLE, PINS3, PINS4, PLANT, NEWPINS, CELLS, FACIA, cellX, TRAY, DIV, BLANK, GAUGE, LEVER, BOARD, ABOVE, T, LOOP_T, TS, STATIONS, stationAt, SHEETS, sheetPose, sheetRows, sheetTrail, stateAt, cylInCase, newInFlight, oldInFlight, handAt, stampOf, AGENT };
})();
const { TAU, CASE, CYL, GEARS, TRAY, NT, CONTACT, tx, TOOTH, IMPOSSIBLE, PINS3, PINS4, PLANT, NEWPINS, CELLS, DIV, BLANK, GAUGE, LEVER, BOARD, T, LOOP_T, TS, STATIONS, stationAt, SHEETS, sheetPose, sheetRows, sheetTrail, stateAt, cylInCase, newInFlight, oldInFlight, handAt, stampOf, AGENT } = MODEL;
const PH = MODEL.phases(false), CYC = ${JSON.stringify(CYC)}, CYL_BODY = ${JSON.stringify(CYL_BODY)};
${LOOP}
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const lerp = (a, b, u) => a + (b - a) * u;
const circ = ${circ.toString()};
const OFF = ${JSON.stringify(OFF)};
${gearPts.toString()}
${circPts.toString()}
${prism.toString()}
${prismS.toString()}
const lift = ${lift.toString()};
const raised = ${raised.toString()};
${wheel3d.toString()}
const at = (p) => iso(p, P);
const front = (y) => sideMatrix([0, y], 0, P, "left");
const box = (x0, x1, y0, y1, z, h, o = {}) => solidSvg(extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z, h, P, { bevel: o.bevel ?? 0.5 }), { tone: o.tone || "mid", lit: o.lit, crease: o.crease, className: o.cls });
const f2 = (v) => v.toFixed(2), pt = (q) => f2(q[0]) + " " + f2(q[1]);
const parts = {}; for (const n of ["inside", "teeth", "gears", "lamp", "seal", "div", "board", "hand", "travel", "sheets"]) parts[n] = $(n);
const cells = CELLS.map((_, i) => $("cell-" + i));
let t = 0, frozen = false, touring = true, idle = 0;
// ---- feuilles de papier : bandes cintrées, recto blanc et verso teinté, lignes de texte, sillage ondulé ----
const area = (q) => { let a = 0; for (let i = 0; i < q.length; i++) { const p0 = q[i], p1 = q[(i + 1) % q.length]; a += p0[0] * p1[1] - p1[0] * p0[1]; } return a; };
const REF = Math.sign(area([at([0, 0, 0]), at([1, 0, 0]), at([1, 1, 0]), at([0, 1, 0])]));
const LW = (() => { const l = [-0.35, 0.45, 0.82], n = Math.hypot(...l); return l.map((x) => x / n); })();
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mixP = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
function sheetSvg(pose, s) {
  const rows = sheetRows(pose); if (rows.length < 2) return "";
  const sp = rows.map(([l, r]) => [at(l), at(r)]), sh = pose.sh;
  let out = "", text = "";
  for (let i = 0; i < rows.length - 1; i++) {
    const q = [sp[i][0], sp[i + 1][0], sp[i + 1][1], sp[i][1]], fr = Math.sign(area(q)) === REF;
    const nn = cr(sub(rows[i + 1][0], rows[i][0]), sub(rows[i][1], rows[i][0])), nl = Math.hypot(...nn) || 1, k = (fr ? 1 : -1) * (nn[0] * LW[0] + nn[1] * LW[1] + nn[2] * LW[2]) / nl;
    out += '<path class="' + (fr ? (k > 0.72 ? "ak-pp0" : k > 0.4 ? "ak-pp1" : "ak-pp2") : "ak-ppb") + '" d="M' + q.map(pt).join("L") + 'Z"/>';
    if (!fr) continue;
    const L0 = mixP(rows[i][0], rows[i + 1][0], 0.5), R0 = mixP(rows[i][1], rows[i + 1][1], 0.5);
    if (i === 0 && (sh.mark || sh.kind === "test")) { const a0 = rows[i][0], a1 = rows[i + 1][0], b0 = mixP(rows[i][0], rows[i][1], 0.32), b1 = mixP(rows[i + 1][0], rows[i + 1][1], 0.32); out += '<path class="' + (sh.mark ? "ak-shmark" : "ak-shtest") + '" d="M' + [a0, a1, b1, b0].map((v) => pt(at(v))).join("L") + 'Z"/>'; }
    if (i >= 2 && i <= 7) { const len = [0.62, 0.48, 0.66, 0.4, 0.58, 0.5][i - 2], cls = sh.kind === "freeze" && i <= 4 ? "ak-tx" + (i - 2) : "ak-shtext"; text += '<path class="' + cls + '" d="M' + pt(at(mixP(L0, R0, 0.16))) + "L" + pt(at(mixP(L0, R0, 0.16 + len))) + '"/>'; }
  }
  const st = stampOf(sh, s);
  if (st && rows.length > 7) {
    const q = [[4, 0.3], [4, 0.72], [7, 0.72], [7, 0.3]].map(([i, k]) => at(mixP(rows[i][0], rows[i][1], k)));
    if (Math.sign(area(q)) === -REF) text += '<path class="ak-stamp-' + st + '" d="M' + q.map(pt).join("L") + 'Z"/>';
  }
  const outline = sp.map((r) => r[0]).concat(sp.map((r) => r[1]).reverse());
  return out + text + '<path class="ak-shline" d="M' + outline.map(pt).join("L") + 'Z"/>';
}
function trailSvg(sh, s) {
  const tr = sheetTrail(sh, s); if (!tr) return "";
  const sp = tr.pts.map(at), n = sp.length - 1;
  const d = sp.map((q, i) => { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, w = 1.3 * Math.sin(i * 1.9 - s * 11) * Math.sin(Math.PI * i / n); return f2(q[0] - ty / l * w) + " " + f2(q[1] + tx / l * w); });
  return '<path class="ak-trail" style="opacity:' + (0.55 * tr.fade).toFixed(2) + '" d="M' + d.join("L") + '"/>';
}
const pinPeg = (u, z, a, h0) => raised(circPts(1.8, u + 10 * Math.cos(a), -z + 10 * Math.sin(a), 16), h0, 4.4, "ak-gear ak-hub");

// ---- la main de l'agent (Human-in-the-Loop) : la main détourée de « La Création d'Adam », à plat face au spectateur ;
// elle descend vers la page posée sur la table lumineuse et la valide du bout de l'index (une étincelle à la couleur de la décision) ----
function handsSvg(s) {
  const h = handAt(s); if (!h) return "";
  const q = at(h.tip), sv = Math.hypot(...[0, 1].map((i) => at([h.tip[0], h.tip[1], h.tip[2] + 10])[i] - q[i])) / 10, k = AGENT.k * sv;
  let out = '<image href="../assets/figures/main-agent.webp" transform="rotate(' + (-AGENT.tilt * 57.2958).toFixed(1) + ' ' + f2(q[0]) + ' ' + f2(q[1]) + ')" x="' + f2(q[0] - AGENT.tip[0] * k) + '" y="' + f2(q[1] - AGENT.tip[1] * k) + '" width="' + f2(AGENT.w * k) + '" height="' + f2(AGENT.h * k) + '"/>';
  if (h.press > 0.35) { const r = (0.8 + 2.2 * h.press) * sv;
    out = '<g class="ak-spark ak-spark-' + h.kind + '" style="opacity:' + h.press.toFixed(2) + '"><path d="' + circ(r, q[0], q[1]) + '"/>' + [0, 1, 2, 3, 4, 5].map((i) => { const a = i * Math.PI / 3 + 0.3; return '<path d="M' + f2(q[0] + (r + 0.6 * sv) * Math.cos(a)) + ' ' + f2(q[1] + (r + 0.6 * sv) * Math.sin(a)) + 'L' + f2(q[0] + (r + 2.6 * sv) * Math.cos(a)) + ' ' + f2(q[1] + (r + 2.6 * sv) * Math.sin(a)) + '"/>'; }).join("") + '</g>' + out; }
  return out;
}


// ---- le cylindre : corps dessiné une fois puis déplacé (projection affine), picots recalculés à chaque image ----
const body = (c) => { const a0 = at(CYC), a1 = at(c); return '<g transform="translate(' + f2(a1[0] - a0[0]) + ' ' + f2(a1[1] - a0[1]) + ')">' + CYL_BODY + '</g>'; };
const NEWSET = new Set(NEWPINS.map(([i, a]) => i + ":" + a));
function pinList(c, rot, list, mark) {
  let ln = "", hd = "", nw = "";
  for (const { i, an } of list) {
    const a = an - rot, ca = Math.cos(a), sa = Math.sin(a);
    if (0.73 * ca + 0.5 * sa < 0.08) continue;
    const x = c[0] + (tx(i) - CYL.xc), p0 = at([x, c[1] + CYL.r * ca, c[2] + CYL.r * sa]), p1 = at([x, c[1] + (CYL.r + 1.7) * ca, c[2] + (CYL.r + 1.7) * sa]);
    ln += "M" + pt(p0) + "L" + pt(p1);
    const d = "M" + f2(p1[0] + 0.95) + " " + f2(p1[1]) + "a0.95 0.95 0 1 0 -1.9 0a0.95 0.95 0 1 0 1.9 0";
    if (mark && NEWSET.has(i + ":" + an)) nw += d; else hd += d;
  }
  return '<path class="ak-pinl" d="' + ln + '"/><path class="ak-pinh" d="' + hd + '"/><path class="ak-pinn" d="' + nw + '"/>';
}
const listOf = (sets) => sets.flatMap((arr, i) => arr.map((an) => ({ i, an })));
const L3 = listOf(PINS3), L4 = listOf(PINS4);
const ROT_NEW = PLANT[PLANT.length - 1].an - Math.PI / 2;

function draw(o, s) {
  const g = GEARS, cc = cylInCase(o), live3 = o.version === 4;
  // cylindre dans le boîtier (actuel, ou ancien qui monte, ou neuf qui descend), lamelles, étouffoir
  let ins = "";
  if (cc) ins += body(cc.c) + pinList(cc.c, cc.which === "new" ? ROT_NEW * (1 - o.newDrop) + 0.3 * o.newDrop : o.cyl, cc.which === "cur" && !live3 || cc.which === "old" ? L3 : L4, cc.which !== "old" && (live3 || cc.which === "new"));
  parts.inside.innerHTML = ins;
  let th = "";
  for (let i = 0; i < NT; i++) {
    const amp = o.pluck[i], x = tx(i), mute = IMPOSSIBLE.includes(i) && o.damp > 0.5;
    th += box(x - TOOTH.w / 2, x + TOOTH.w / 2, TOOTH.tip, TOOTH.y0, TOOTH.z, 0.8, { tone: "mid", lit: amp > 0.15, bevel: 0.15, cls: mute ? "mat-ak-off" : "mat-ak-f" + ((i / 3) | 0) });
    if (amp > 0.12) { const q = at([x, TOOTH.tip - 1.4, TOOTH.z + 0.9]); th += '<path class="ak-vib" style="opacity:' + Math.min(1, amp * 1.4).toFixed(2) + '" d="M' + f2(q[0] - 2.2) + " " + f2(q[1] - 0.6) + "Q" + f2(q[0]) + " " + f2(q[1] - 3.2) + " " + f2(q[0] + 2.2) + " " + f2(q[1] - 0.6) + 'M' + f2(q[0] - 3.4) + " " + f2(q[1] - 2) + "Q" + f2(q[0]) + " " + f2(q[1] - 5.6) + " " + f2(q[0] + 3.4) + " " + f2(q[1] - 2) + '"/>'; }
  }
  const zb = lerp(53, TOOTH.z + 1.3, o.damp), xa = CYL.x0 - 2.5, xb = CYL.x1 + 1;
  th += box(xa, xa + 1.8, -13, TOOTH.y0 + 2, zb, 2, { tone: "mid", bevel: 0.2, lit: o.accord, cls: "mat-steel" }) + box(xb, xb + 1.8, -13, TOOTH.y0 + 2, zb, 2, { tone: "mid", bevel: 0.2, lit: o.accord, cls: "mat-steel" });
  th += box(CYL.x0 - 1, CYL.x1 + 1, -13, -10, zb, 2, { tone: "mid", bevel: 0.3, lit: o.accord, cls: "mat-steel" });
  for (const i of IMPOSSIBLE) th += box(tx(i) - 1.5, tx(i) + 1.5, -13, -10, zb - 1.1, 1.1, { tone: "lo", bevel: 0.1, cls: "mat-ak-felt" });
  parts.teeth.innerHTML = th;
  parts.lamp.innerHTML = (s > T.read[0] && s < T.read[1] + 1) || (s > 45 && s < 48) ? '<path class="ak-ok" d="' + circ(1.7, 65, -37) + '"/>' : "";
  // train du gain, sur le flanc : la roue de 46 dents mène la roue de 20 dents du cylindre ; la manivelle suit la grande roue
  let fr = wheel3d(g.d46, o.d46 + PH.d46) + wheel3d(g.o20, o.o20 + PH.o20, { lit: s > T.gain[0] });
  { const a = o.d46 + PH.d46, c = g.d46, rot = ([x, y]) => [c.u + x * Math.cos(a) - y * Math.sin(a), -c.z + x * Math.sin(a) + y * Math.cos(a)];
    fr += raised([[0, -1.3], [12, -1.3], [12, 1.3], [0, 1.3]].map(rot), 4.4, 1.2, "ak-gear");
    const e = rot([12, 0]); fr += raised(circPts(2.4, e[0], e[1], 18), 5.6, 3.4, "ak-gear ak-hub"); }
  parts.gears.innerHTML = fr;
  cells.forEach((c, i) => c.setAttribute("class", "ak-cell" + [" ", " ak-ok", " ak-bad", " ak-fixed", " ak-prop"][o.cells[i]]));
  // le corpus est figé : un sceau de cire sur la boîte, sa version
  parts.seal.innerHTML = o.sealed ? '<g transform="' + front(TRAY.y + 14) + '"><path class="ak-seal" d="' + circ(2.6, TRAY.x + 12.5, -8.5) + '"/><path class="ak-sealin" d="' + circ(1.5, TRAY.x + 12.5, -8.5) + '"/></g>' : "";
  // machine à planter : le cylindre neuf, nu, puis un picot après l'autre ; l'aiguille du chariot descend à chaque pose
  let dv = "";
  const BC = [BLANK.x, BLANK.y, BLANK.z], rotB = o.divRot - Math.PI / 2;
  if (o.blank && !(o.newFly > 0)) dv += body(BC) + pinList(BC, rotB, PLANT.slice(0, o.planted), true);
  { const cx = BLANK.x + (o.carriage - CYL.xc), tip = lerp(BLANK.z + CYL.r + 7, BLANK.z + CYL.r + 0.4, o.needle);
    dv += box(cx - 3.5, cx + 3.5, DIV.y - 22, DIV.y - 16, BLANK.z + CYL.r + 9, 4, { tone: "mid", bevel: 0.5, lit: o.needle > 0.3, cls: "mat-steel" }) + box(cx - 1.5, cx + 1.5, DIV.y - 16, DIV.y + 0.8, BLANK.z + CYL.r + 10.6, 2.2, { tone: "mid", bevel: 0.3, cls: "mat-steel" }) + box(cx - 0.5, cx + 0.5, DIV.y - 0.5, DIV.y + 0.5, tip, BLANK.z + CYL.r + 10.6 - tip, { tone: "hi", bevel: 0.1, lit: o.needle > 0.3, cls: "mat-steel" }); }
  { const Gg = GAUGE; let gs = "";
    [[Gg.x0 + 4.8, o.f1], [Gg.x1 - 4.8, o.u1]].forEach(([u, v]) => { const a = Math.PI - v * Math.PI; gs += '<path class="ak-needle" d="M' + u + ' -11L' + f2(u + 3.1 * Math.cos(a)) + ' ' + f2(-11 - 3.1 * Math.sin(a)) + '"/><path class="ak-axle" d="' + circ(0.55, u, -11) + '"/>'; });
    gs += '<path class="' + (o.pass ? "ak-ok" : "ak-off") + '" d="' + circ(1.3, (Gg.x0 + Gg.x1) / 2, -18) + '"/>';
    dv += '<g transform="' + front(Gg.y1) + '">' + gs + '</g>'; }
  { const th2 = o.lever * 1.2, tip = [LEVER.x, LEVER.y - 5 + 11 * Math.sin(th2), LEVER.z + 11 * Math.cos(th2)];
    dv += '<path class="iso-line" data-tone="hi" d="M' + at([LEVER.x, LEVER.y - 5, LEVER.z]).join(" ") + 'L' + at(tip).join(" ") + '"/>' + dotsSvg([at([LEVER.x, LEVER.y - 5, LEVER.z])], { size: 1.3, tone: "hi" }) + box(tip[0] - 1.6, tip[0] + 1.6, tip[1] - 1.6, tip[1] + 1.6, tip[2] - 1, 3.4, { tone: "hi", lit: o.lever > 0.05, bevel: 0.6, cls: "mat-wood" }); }
  parts.div.innerHTML = dv;
  // étagère des versions : v1 et v2 posés, v3 arrive à la publication, v4 attend le prochain
  let bd = "";
  BOARD.slots.forEach(([u, z], i) => { if (i === 3 || (i === 2 && o.oldFly < 1)) return; const c = [u, BOARD.cy, z]; bd += body(c) + pinList(c, 0.6 + i * 1.1, L3, false); });
  parts.board.innerHTML = bd;
  parts.hand.innerHTML = handsSvg(s);
  // cylindres en vol : l'ancien vers l'étagère, le neuf vers le dessus du boîtier
  let tr = "";
  const ol = oldInFlight(o), nw = newInFlight(o);
  if (ol) tr += body(ol.c) + pinList(ol.c, o.cyl + o.oldFly * 2, L3, false);
  if (nw) tr += body(nw.c) + pinList(nw.c, ROT_NEW * (1 - o.newFly) + 0.3 * o.newFly, L4, true);
  parts.travel.innerHTML = tr;
  // feuilles : posées d'abord, puis celles qui volent
  let sh = "", fly = "";
  for (const q of SHEETS) { const p = sheetPose(q, s); if (!p) continue; if (p.u >= 1) sh += sheetSvg(p, s); else fly += trailSvg(q, s) + sheetSvg(p, s); }
  parts.sheets.innerHTML = sh + fly;
}

function reading(s) { const i = stationAt(s), o = stateAt(s); return (i + 1) + " · " + STATIONS[i] + (s >= T.infer[0] ? " · " + o.validated + "/12 validées" : ""); }
const run = loop((dt, calm) => { if (frozen) return; if (touring) { t = calm ? 53 : t + dt; if (t >= LOOP_T) t = 0; } draw(stateAt(t), t); say(reading(t)); });
const jump = (i) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 9000); t = TS[(i + TS.length) % TS.length] + 1.5; run(); };
dragX(() => stationAt(t), (v, share) => { const n = (Math.round(v + share * 9) % 9 + 9) % 9; if (n !== stationAt(t)) jump(n); });
stage.addEventListener("keydown", (e) => { const i = stationAt(t); if (e.key === "ArrowRight") { e.preventDefault(); jump(i + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); jump(i - 1); } });
window.__fig = { at: (s) => { touring = false; frozen = true; t = s; draw(stateAt(s), s); say(reading(s)); return reading(s); }, Ts: TS };
draw(stateAt(0), 0); say(reading(0));
`;

const css = `<style>
.ak-pinl{fill:none;stroke:var(--anatomy-hi);stroke-width:.5;stroke-linecap:round}
.ak-pinh{fill:var(--anatomy-lit);stroke:var(--anatomy-hi);stroke-width:.3}
.ak-pinn{fill:#e0a33a;stroke:#a57224;stroke-width:.3}
.ak-vib{fill:none;stroke:var(--anatomy-lit);stroke-width:.45;stroke-linecap:round}
.mat-ak-f0{--anatomy-top:#e07a66;--anatomy-face:#d2452f;--anatomy-shade-0:#a83525;--anatomy-shade-1:#b53a28;--anatomy-shade-2:#c23e2a;--anatomy-shade-3:#d2452f;--anatomy-lit-top:#f19a88;--anatomy-lit-shade:#e07a66}
.mat-ak-f1{--anatomy-top:#7fa3d6;--anatomy-face:#3f6fb0;--anatomy-shade-0:#2f5388;--anatomy-shade-1:#35609b;--anatomy-shade-2:#3a68a8;--anatomy-shade-3:#3f6fb0;--anatomy-lit-top:#a6c2e8;--anatomy-lit-shade:#7fa3d6}
.mat-ak-f2{--anatomy-top:#f0d070;--anatomy-face:#e0b23a;--anatomy-shade-0:#b08a24;--anatomy-shade-1:#c49a2c;--anatomy-shade-2:#d4a834;--anatomy-shade-3:#e0b23a;--anatomy-lit-top:#f7e29a;--anatomy-lit-shade:#f0d070}
.mat-ak-f3{--anatomy-top:#6fbab5;--anatomy-face:#3d8f8a;--anatomy-shade-0:#2c6b67;--anatomy-shade-1:#327874;--anatomy-shade-2:#388580;--anatomy-shade-3:#3d8f8a;--anatomy-lit-top:#9bd2ce;--anatomy-lit-shade:#6fbab5}
.mat-ak-off{--anatomy-top:#8c8c88;--anatomy-face:#7a7a76;--anatomy-shade-0:#5e5e5a;--anatomy-shade-1:#686864;--anatomy-shade-2:#72726e;--anatomy-shade-3:#7a7a76}
.mat-ak-felt{--anatomy-top:#c9b26a;--anatomy-face:#b49c58;--anatomy-shade-0:#8c7a42;--anatomy-shade-1:#9c8848;--anatomy-shade-2:#a8924e;--anatomy-shade-3:#b49c58}
.ak-gear{fill:var(--ak-bronze);stroke:var(--anatomy-hi);stroke-width:.35;stroke-linejoin:round}
.ak-back{fill:var(--ak-bronze-d);stroke:none}
.ak-lit{fill:var(--ak-bronze-l)}
.ak-hole{fill:var(--ak-hole);stroke:var(--anatomy-mid);stroke-width:.25}
.ak-axle{fill:var(--anatomy-hi)}
.ak-plate{fill:var(--ak-bronze-d);stroke:var(--anatomy-mid);stroke-width:.4}
.ak-face{fill:var(--anatomy-paper);stroke:none}
.ak-hand{fill:var(--anatomy-lit);stroke:var(--anatomy-lit);stroke-width:.7;stroke-linecap:round}
.ak-pin{fill:var(--anatomy-lit);stroke:var(--anatomy-hi);stroke-width:.3}
.ak-slot{fill:var(--ak-hole);stroke:var(--anatomy-hi);stroke-width:.3}
.ak-mark{fill:var(--anatomy-lit)}
.ak-cell{fill:var(--anatomy-paper);stroke:var(--anatomy-mid);stroke-width:.3}
.ak-cell.ak-prop{fill:#dbe6fb;stroke:#3e63dd}.ak-cell.ak-ok,.ak-ok{fill:#5fae6e}.ak-cell.ak-bad{fill:#d2452f}.ak-cell.ak-fixed{fill:#e0a33a}.ak-off{fill:var(--anatomy-faint)}
.ak-f0{fill:#d2452f}.ak-f1{fill:#3f6fb0}.ak-f2{fill:#e0b23a}.ak-f3{fill:#3d8f8a}
.ak-r0{fill:#c98a6a}.ak-r1{fill:#8aa3c4}.ak-r2{fill:#c9b26a}
.ak-lamp{fill:var(--anatomy-faint);stroke:var(--anatomy-mid);stroke-width:.5}.ak-lamp.ak-on{stroke:var(--anatomy-hi)}
.ak-sbk{fill:var(--ak-s3);stroke:var(--anatomy-hi);stroke-width:.35;stroke-linejoin:round}
.ak-s0{fill:var(--ak-s0);stroke:var(--ak-s0);stroke-width:.25;stroke-linejoin:round}.ak-s1{fill:var(--ak-s1);stroke:var(--ak-s1);stroke-width:.25;stroke-linejoin:round}.ak-s2{fill:var(--ak-s2);stroke:var(--ak-s2);stroke-width:.25;stroke-linejoin:round}
.ak-thru{fill:var(--pl-3)}
.ak-web{fill:var(--ak-bronze-d);stroke:var(--anatomy-hi);stroke-width:.3}
.ak-axle3{fill:var(--ak-bronze-l);stroke:var(--anatomy-hi);stroke-width:.3}
.ak-root{fill:none;stroke:var(--ak-bronze-d);stroke-width:.3}
.ak-rivet{fill:var(--ak-bronze-l);stroke:var(--ak-bronze-d);stroke-width:.2}
.ak-hub{fill:var(--ak-bronze-l)}
.ak-bridge{fill:var(--ak-bronze-l);stroke:var(--anatomy-hi);stroke-width:.35;stroke-linejoin:round}
.ak-slotline{fill:none;stroke:var(--ak-hole);stroke-width:.35}
.ak-guide{fill:none;stroke:var(--ak-bronze-d);stroke-width:.3;stroke-dasharray:1.2 1.6}
.ak-engr{fill:none;stroke:var(--ak-engr);stroke-width:.32;stroke-linecap:round;stroke-linejoin:round}
.ak-grain{fill:none;stroke:var(--wd-grain);stroke-width:.35;stroke-linecap:round}
.ak-bracket{fill:var(--ak-bronze);stroke:var(--anatomy-hi);stroke-width:.3;stroke-linejoin:round}
.ak-ink{fill:none;stroke:var(--ak-ink);stroke-width:.3}
.ak-hatch{fill:none;stroke:var(--anatomy-mid);stroke-width:.3}
.ak-steel{fill:var(--st-1);stroke:var(--anatomy-hi);stroke-width:.3}
.ak-tag{font:600 2.6px var(--anatomy-mono);fill:var(--ak-engr)}
.ak-f0s,.ak-f1s,.ak-f2s,.ak-f3s{fill:none;stroke-width:1.1;stroke-linecap:round}.ak-f0s{stroke:#d2452f}.ak-f1s{stroke:#3f6fb0}.ak-f2s{stroke:#e0b23a}.ak-f3s{stroke:#3d8f8a}
.fig-dark{fill:var(--ak-hole)}
.ak-pp0{fill:var(--pp0)}.ak-pp1{fill:var(--pp1)}.ak-pp2{fill:var(--pp2)}.ak-ppb{fill:var(--ppb)}
.ak-pp0,.ak-pp1,.ak-pp2,.ak-ppb{stroke-width:.25;stroke-linejoin:round}.ak-pp0{stroke:var(--pp0)}.ak-pp1{stroke:var(--pp1)}.ak-pp2{stroke:var(--pp2)}.ak-ppb{stroke:var(--ppb)}
.ak-shline{fill:none;stroke:var(--ppl);stroke-width:.4;stroke-linejoin:round}
.ak-shtext{fill:none;stroke:var(--anatomy-mid);stroke-width:.45;stroke-linecap:round}
.ak-tx0,.ak-tx1,.ak-tx2{fill:none;stroke-width:.7;stroke-linecap:round}.ak-tx0{stroke:#c98a6a}.ak-tx1{stroke:#8aa3c4}.ak-tx2{stroke:#c9b26a}
.ak-shmark{fill:#e0a33a}.ak-shtest{fill:#8fb0ee}
.ak-trail{fill:none;stroke:var(--ppl);stroke-width:.45;stroke-linecap:round;stroke-linejoin:round}
.ak-seal{fill:#a8392b;stroke:#6e1f17;stroke-width:.3}.ak-sealin{fill:none;stroke:#d36a55;stroke-width:.3}
.ak-meter{fill:none;stroke:var(--anatomy-mid);stroke-width:.35}.ak-thr{fill:none;stroke:#d2452f;stroke-width:.5}
.ak-needle{fill:none;stroke:var(--anatomy-lit);stroke-width:.45;stroke-linecap:round}
.mat-wood{--anatomy-face:var(--wd-1);--anatomy-top:var(--wd-0);--anatomy-lit-top:var(--wd-0);--anatomy-lit-shade:var(--wd-2);--anatomy-shade-0:var(--wd-4);--anatomy-shade-1:var(--wd-3);--anatomy-shade-2:var(--wd-2);--anatomy-shade-3:var(--wd-1)}
.mat-bronze{--anatomy-face:var(--bz-1);--anatomy-top:var(--bz-0);--anatomy-lit-top:var(--bz-0);--anatomy-lit-shade:var(--bz-2);--anatomy-shade-0:var(--bz-4);--anatomy-shade-1:var(--bz-3);--anatomy-shade-2:var(--bz-2);--anatomy-shade-3:var(--bz-1)}
.mat-steel{--anatomy-face:var(--st-1);--anatomy-top:var(--st-0);--anatomy-lit-top:var(--st-0);--anatomy-lit-shade:var(--st-2);--anatomy-shade-0:var(--st-4);--anatomy-shade-1:var(--st-3);--anatomy-shade-2:var(--st-2);--anatomy-shade-3:var(--st-1)}
.mat-plate{--anatomy-face:var(--pl-1);--anatomy-top:var(--pl-0);--anatomy-lit-top:var(--pl-0);--anatomy-lit-shade:var(--pl-2);--anatomy-shade-0:var(--pl-3);--anatomy-shade-1:var(--pl-2);--anatomy-shade-2:var(--pl-2);--anatomy-shade-3:var(--pl-1)}
.ak-leg{fill:none;stroke:var(--anatomy-hi);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.ak-legc{fill:none;stroke:var(--st-0);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}
.mat-skin{--anatomy-face:#eab894;--anatomy-top:#f3c8a6;--anatomy-lit-top:#f3c8a6;--anatomy-lit-shade:#e0a886;--anatomy-shade-0:#c98b69;--anatomy-shade-1:#d69a77;--anatomy-shade-2:#e0a886;--anatomy-shade-3:#eab894}
.mat-sleeve{--anatomy-face:#3f5f8f;--anatomy-top:#4d6da0;--anatomy-lit-top:#4d6da0;--anatomy-lit-shade:#3a5785;--anatomy-shade-0:#2b4269;--anatomy-shade-1:#324c77;--anatomy-shade-2:#3a5785;--anatomy-shade-3:#3f5f8f}
.mat-cuff{--anatomy-face:#f4f3ee;--anatomy-top:#ffffff;--anatomy-lit-top:#ffffff;--anatomy-lit-shade:#e6e5df;--anatomy-shade-0:#cfcec7;--anatomy-shade-1:#dad9d2;--anatomy-shade-2:#e6e5df;--anatomy-shade-3:#f4f3ee}
.mat-ink-ok{--anatomy-face:#4f9e5f;--anatomy-top:#5fae6e;--anatomy-lit-top:#5fae6e;--anatomy-shade-0:#3c7c49;--anatomy-shade-1:#448a52;--anatomy-shade-2:#4a955a;--anatomy-shade-3:#4f9e5f}
.mat-ink-bad{--anatomy-face:#c23e2a;--anatomy-top:#d2452f;--anatomy-lit-top:#d2452f;--anatomy-shade-0:#963021;--anatomy-shade-1:#a83525;--anatomy-shade-2:#b53a28;--anatomy-shade-3:#c23e2a}
.mat-ink-fix{--anatomy-face:#d4952f;--anatomy-top:#e0a33a;--anatomy-lit-top:#e0a33a;--anatomy-shade-0:#a57224;--anatomy-shade-1:#b67e28;--anatomy-shade-2:#c5892b;--anatomy-shade-3:#d4952f}
.ak-stamp-ok{fill:rgba(53,169,116,.28);stroke:#35a974;stroke-width:.55}.ak-stamp-bad{fill:rgba(210,69,47,.28);stroke:#d2452f;stroke-width:.55}.ak-stamp-fix{fill:rgba(224,163,58,.32);stroke:#e0a33a;stroke-width:.55}
.ak-lightgrid{fill:none;stroke:#9db6ea;stroke-width:.3}
.mat-light{--anatomy-face:var(--gl);--anatomy-top:var(--gl);--anatomy-lit-top:var(--gl)}
.ak-spark path{fill:none;stroke-width:.5;stroke-linecap:round}.ak-spark>path:first-child{fill:#fff8d8}.ak-spark-ok path{stroke:#35a974}.ak-spark-bad path{stroke:#d2452f}.ak-spark-fix path{stroke:#e0a33a}
.ak-skinline{fill:none;stroke:#b07a5a;stroke-width:.35;stroke-linecap:round}
.mat-paper{--anatomy-face:var(--pp);--anatomy-top:var(--pp);--anatomy-lit-top:var(--pp)}
.mat-glass{--anatomy-face:var(--gl);--anatomy-top:var(--gl);--anatomy-lit-top:var(--gl)}
.mat-ak-r0{--anatomy-top:#c98a6a;--anatomy-face:#c98a6a;--anatomy-shade-0:#a86c4e;--anatomy-shade-1:#b4775a;--anatomy-shade-2:#bf8264;--anatomy-shade-3:#c98a6a}
.mat-ak-r1{--anatomy-top:#8aa3c4;--anatomy-face:#8aa3c4;--anatomy-shade-0:#6c85a6;--anatomy-shade-1:#7690b0;--anatomy-shade-2:#809aba;--anatomy-shade-3:#8aa3c4}
.mat-ak-r2{--anatomy-top:#c9b26a;--anatomy-face:#c9b26a;--anatomy-shade-0:#a8924e;--anatomy-shade-1:#b49c58;--anatomy-shade-2:#bfa862;--anatomy-shade-3:#c9b26a}
.iso{--ak-bronze:#2a2a2a;--ak-bronze-d:#1b1b1b;--ak-bronze-l:#343434;--ak-hole:#0f0f0f;--ak-engr:#5a5a5a;--ak-ink:#6a6a6a;--ak-s0:#262626;--ak-s1:#202020;--ak-s2:#1a1a1a;--ak-s3:#151515;
  --wd-0:#262626;--wd-1:#1b1b1b;--wd-2:#151515;--wd-3:#121212;--wd-4:#0f0f0f;--wd-grain:#2c2c2c;
  --bz-0:#262626;--bz-1:#1b1b1b;--bz-2:#151515;--bz-3:#121212;--bz-4:#0f0f0f;
  --st-0:#262626;--st-1:#1b1b1b;--st-2:#151515;--st-3:#121212;--st-4:#0f0f0f;--pp:#1b1b1b;--gl:#1d2430;--pp0:#e9eef7;--pp1:#cfd8e8;--pp2:#b4c0d6;--ppb:#6f8fd0;--ppl:#9db6ea;--pl-0:#202020;--pl-1:#191919;--pl-2:#141414;--pl-3:#101010}
[data-theme="light"]{--ak-bronze:#ffffff;--ak-bronze-d:#dcdcd9;--ak-bronze-l:#ffffff;--ak-hole:#8a8a8f;--ak-engr:#b4b4b8;--ak-ink:#b4b4b8;--ak-s0:#f4f4f1;--ak-s1:#ededea;--ak-s2:#e5e5e2;--ak-s3:#dcdcd9;
  --wd-0:#ffffff;--wd-1:#ffffff;--wd-2:#ededea;--wd-3:#e5e5e2;--wd-4:#dcdcd9;--wd-grain:#e5e5e2;
  --bz-0:#ffffff;--bz-1:#ffffff;--bz-2:#ededea;--bz-3:#e5e5e2;--bz-4:#dcdcd9;
  --st-0:#ffffff;--st-1:#ffffff;--st-2:#ededea;--st-3:#e5e5e2;--st-4:#dcdcd9;--pp:#ffffff;--gl:#eef3fb;--pp0:#ffffff;--pp1:#f1f4fa;--pp2:#dfe6f3;--ppb:#bcd0f4;--ppl:#3e63dd;--pl-0:#f7f7f5;--pl-1:#f1f1ee;--pl-2:#e8e8e5;--pl-3:#dededa}
</style>`;

const plate = k.plateHtml({
  fig: "Fig 11", title: "Lecteur VRE", hint: "Glisse ou ← → : étape", readout: "1 · Lecture · Document AI",
  keys: [
    { mark: "lit", label: "Ce qui vient d'agir : lamelle pincée, étouffoir, aiguille, feuille, levier, index de l'agent sur la page" },
    { mark: "raised", label: "Case bleue : cadre proposé, jamais validé sans l'agent ; tout tourne en local" },
  ],
  caption: "Une boîte à musique pour le Lecteur VRE. Le cylindre à picots est le modèle : la place de chaque picot est ce qu'il a appris. Le rapport PDF quitte la pile et entre dans le lecteur (Document AI) ; la manivelle fait tourner le cylindre, et chaque picot pince la lamelle de son champ, une couleur par champ (tri, mini-BERT). L'étouffoir, ce sont les règles métiers : il coupe les notes impossibles, le modèle et les règles jouent ensemble (hybride neuro-symbolique). Les douze cases du devant sont les pages inédites : le cylindre propose des cadres, jamais des certitudes. Chaque page sort par la bouche du flanc ; l'agent, la main de La Création d'Adam, la touche du bout de l'index sur la table lumineuse (Radiographie) : vert, validée ; rouge puis orange, corrigée. Elle part au corpus partagé, qui est ensuite scellé. Les copies du corpus figé servent à planter, un à un, les picots d'un cylindre neuf (entraînement LayoutLMv3, en local). Le banc d'essai le joue sur deux rapports séparés : il doit passer F1 0,75 et rappel U1 0,90. Seul un candidat accepté est publié, d'un coup de levier : l'ancien cylindre rejoint l'étagère des versions et le nouveau descend dans le boîtier. Le gain est littéral : une roue de 46 dents mène une roue de 20 dents, le cylindre tourne 46 / 20 = 2,3 fois plus vite.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Lecteur VRE : flèches gauche et droite pour passer d'une étape à l'autre" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0">${svg}</div>`,
});
writeFigure("vrestudio-musicbox", { title: "Lecteur VRE · la boîte à musique", plate, live, width: 900, css });

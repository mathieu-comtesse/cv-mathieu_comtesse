// Fig 11 (variante D) · VRE Studio : le mécanisme d'Anticythère.
// Un boîtier de bois ouvert sur un établi. Une fiche (le rapport) descend par la fente du dessus : la lecture (Document AI).
// La manivelle fait tourner la grande roue à quatre rayons de couleur : chaque rayon qui passe sous le peigne allume le voyant
// de son champ (tri, mini-BERT). Deux roues empilées sur des axes décalés, la cheville du modèle dans la coulisse des règles,
// ne laissent avancer l'aiguille que si elles s'accordent (hybride neuro-symbolique). Au dos, le cadran à spirale prédit
// douze pages inédites (inférence) ; une case rouge est une erreur. Chaque erreur corrigée à la main taille une dent sur la roue
// de la machine à diviser (Human-in-the-Loop) ; les trois anneaux coaxiaux du corpus (image, texte, position) avancent ;
// la roue finie entre dans le boîtier et l'ancienne rejoint le tableau des versions (MLOps local). Le gain est littéral :
// une roue de 46 dents mène une roue de 20 dents, l'aiguille tourne 46 / 20 = 2,3 fois plus vite.
// node figures/build-anticythere.mjs  →  figures/vrestudio-anticythere.html
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 900, HEIGHT = 660;
const PLATE = { x: -128, y: -64, w: 318, d: 150, r: 12 };
const CASE = { x0: -72, x1: 82, y0: -42, y1: 0, h: 132, t: 6 };
const MECH_Y = -16;                                         // plan de la platine de bronze
const P = k.fitProjection(
  [...k.boxCorners(PLATE, -21, 0), [CASE.x0, CASE.y0, CASE.h + 18], [CASE.x1, CASE.y0, CASE.h + 18], [CASE.x0, CASE.y1, CASE.h + 18]],
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

// ---------------------------------------------------------------- engrenages (coordonnées de la face : u vers la droite, v vers le bas = -z)
const GEARS = {
  b1: { u: -25, z: 62, r: 40, n: 64 },        // grande roue motrice, quatre rayons = quatre champs
  crank: { u: -57, z: 26, r: 10.5, n: 16 },   // pignon de la manivelle
  idle: { u: 16, z: 91, r: 9.5, n: 14 },      // renvoi vers le couple cheville-coulisse
  pin: { u: 39, z: 104, r: 15, n: 24 },       // roue du modèle (cheville)
  slot: { u: 43, z: 104, r: 15, n: 24 },      // roue des règles (coulisse), axe décalé de 4
  p2: { u: 22, z: 60, r: 8, n: 12 },          // pignon vers les anneaux du corpus
  corpus: { u: 46, z: 60, r: 16, n: 26 },     // trois anneaux coaxiaux : image, texte, position
  d46: { u: 21, z: 26, r: 18.4, n: 46 },      // menante du gain : 46 dents
  o20: { u: 47.4, z: 26, r: 8, n: 20 },       // menée : 20 dents → ×2,3
};
function gearD(r, n, depth = 2.2, cut = n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, w = TAU / n, has = i < cut;
    const ro = has ? r : r - depth, ri = r - depth;
    pts.push([ri, a], [ri, a + w * 0.18], [ro, a + w * 0.3], [ro, a + w * 0.62], [ri, a + w * 0.74]);
  }
  return "M" + pts.map(([rr, a]) => (rr * Math.cos(a)).toFixed(2) + " " + (rr * Math.sin(a)).toFixed(2)).join("L") + "Z";
}
const ring48 = (r, cx = 0, cy = 0) => "M" + Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * TAU; return (cx + r * Math.cos(a)).toFixed(2) + " " + (cy + r * Math.sin(a)).toFixed(2); }).join("L");
const circ = (r, cx = 0, cy = 0) => `M${(cx + r).toFixed(2)} ${cy}A${r} ${r} 0 1 0 ${(cx - r).toFixed(2)} ${cy}A${r} ${r} 0 1 0 ${(cx + r).toFixed(2)} ${cy}Z`;
// une roue sur la face : épaisseur (copie sombre décalée vers le fond), moyeu, rayons ou trous d'allègement, axe
function wheelSvg(g, o = {}) {
  const r = g.r, dep = o.depth ?? Math.max(1.6, r * 0.07), body = gearD(r, g.n, dep, o.cut ?? g.n), f = (v) => v.toFixed(2);
  const dot = (x, y, rr) => `M${f(x + rr)} ${f(y)}A${rr} ${rr} 0 1 0 ${f(x - rr)} ${f(y)}A${rr} ${rr} 0 1 0 ${f(x + rr)} ${f(y)}Z`;
  // épaisseur : copie sombre décalée vers le fond, puis la face ; cercle de pied de dent gravé
  let s = `<path class="ak-back" d="${body}" transform="translate(1.1 0.9)"/><path class="ak-gear${o.lit ? " ak-lit" : ""}" d="${body}"/><path class="ak-root" d="${circ(r - dep - 0.5)}"/>`;
  if (o.spokes) {
    s += `<path class="ak-back" d="${circ(r - 4.2)}"/>`;
    o.spokes.forEach((cls, i) => { const a = (i / o.spokes.length) * TAU, c = Math.cos(a), sn = Math.sin(a), w = 3.2; s += `<path class="ak-gear ${cls}" d="M${f(-sn * w)} ${f(c * w)}L${f((r - 4) * c - sn * w)} ${f((r - 4) * sn + c * w)}L${f((r - 4) * c + sn * w)} ${f((r - 4) * sn - c * w)}L${f(sn * w)} ${f(-c * w)}Z"/><path class="ak-rivet" d="${dot((r - 9) * c, (r - 9) * sn, 0.75) + dot(r * 0.42 * c, r * 0.42 * sn, 0.75)}"/>`; });
    s += `<path class="ak-gear" d="${circ(r - 4.2) + circ(r - 6.4)}" fill-rule="evenodd"/><path class="ak-root" d="${circ(r - 5.3)}"/>`;
  } else if (r > 9) {
    s += `<path class="ak-hole" d="${[0, 1, 2, 3].map((i) => { const a = (i / 4) * TAU + 0.4; return circ(r * 0.22, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); }).join("")}"/><path class="ak-root" d="${circ(r * 0.83)}"/>`;
  } else s += `<path class="ak-root" d="${circ(r * 0.6)}"/>`;
  // moyeu tourné : collet, trois vis, axe
  const hub = Math.max(2.4, r * 0.18);
  s += `<path class="ak-gear ak-hub" d="${circ(hub + 0.9)}"/><path class="ak-gear" d="${circ(hub)}"/>`;
  if (r > 9) s += `<path class="ak-rivet" d="${[0, 1, 2].map((i) => { const a = (i / 3) * TAU + 0.5; return dot(Math.cos(a) * hub * 0.62, Math.sin(a) * hub * 0.62, 0.45); }).join("")}"/>`;
  s += `<path class="ak-axle" d="${circ(1.1)}"/>`;
  return s;
}

// ---------------------------------------------------------------- l'établi
const base = [bench(P, PLATE, { plateH: 14, footH: 7, strip: { x: -112, y: PLATE.y + PLATE.d - 12, w: 120, d: 7, r: 1 }, label: { x: 30, y: PLATE.y + PLATE.d - 14, w: 50, d: 10, r: 1.2 } })];

// ---------------------------------------------------------------- le boîtier : fond, flancs, dessus, platine de bronze ; face avant ouverte
const caseSvg = (() => {
  const { x0, x1, y0, y1, h, t } = CASE, out = [];
  // socle mouluré sur quatre pieds en boule
  for (const [x, y] of [[x0 - 1, y0 - 1], [x1 + 1, y0 - 1], [x0 - 1, y1 + 1], [x1 + 1, y1 + 1]]) out.push(S(k.cylinder(x, y, 2.6, 0, 2, P, 16), { tone: "mid", className: "mat-bronze" }));
  out.push(box(x0 - 5, x1 + 5, y0 - 5, y1 + 5, 2, 3, { tone: "lo", bevel: 0.8, ...WOOD }));
  out.push(box(x0 - 3.5, x1 + 3.5, y0 - 3.5, y1 + 3.5, 5, 2, { tone: "lo", bevel: 0.6, ...WOOD }));
  out.push(box(x0, x1, y0, y0 + t, 7, h - 7, { tone: "lo", ...WOOD }));                                                  // fond
  out.push(box(x0, x0 + t, y0, y1, 7, h - 7, { tone: "mid", ...WOOD }));                                                 // flanc gauche
  // face intérieure du flanc gauche : veinage et deux planches
  out.push(`<g transform="${right(x0 + t)}">${[0.22, 0.47, 0.71].map((q, i) => `<path class="ak-grain" d="M${-y1} ${-(7 + (h - 7) * q).toFixed(1)}C${(-y1 + 14).toFixed(1)} ${-(9 + (h - 7) * q + i).toFixed(1)} ${(-y0 - 16).toFixed(1)} ${-(5 + (h - 7) * q).toFixed(1)} ${-y0 - t} ${-(8 + (h - 7) * q).toFixed(1)}"/>`).join("")}</g>`);
  // platine de bronze : portée par quatre entretoises, gravures de tracé et vis
  out.push(box(x0 + t + 2, x1 - t - 2, MECH_Y - 3, MECH_Y, 10, h - 20, { tone: "mid", bevel: 0.8, cls: "mat-plate" }));
  const f = front(MECH_Y), pu0 = x0 + t + 2, pu1 = x1 - t - 2, g = GEARS;
  let guides = "";
  for (const key of ["b1", "pin", "corpus", "d46"]) guides += ring48(g[key].r + 2.6, g[key].u, -g[key].z);
  out.push(`<g transform="${f}"><path class="ak-guide" d="${guides}"/>${inscription(pu0 + 3, -(h - 15), 30, 2, 7, 3)}${inscription(pu1 - 10, -86, 8, 6, 11, 3)}</g>`);
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="faint" d="M${pu0} -14H${pu1}M${pu0} ${-(h - 14)}H${pu1}"/></g>`);
  out.push(dots([[x0 + t + 6, MECH_Y, 16], [x1 - t - 6, MECH_Y, 16], [x0 + t + 6, MECH_Y, h - 16], [x1 - t - 6, MECH_Y, h - 16]], 0.7, "mid"));
  return out.join("");
})();
const caseFront = (() => {
  const { x0, x1, y0, y1, h, t } = CASE, out = [];
  out.push(box(x1 - t, x1, y0, y1, 7, h - 7, { tone: "mid", ...WOOD }));                                                // flanc droit (porte le cadran)
  out.push(box(x0 - 3, x1 + 3, y0 - 3, y1 + 3, h, 7, { tone: "mid", bevel: 1.2, ...WOOD }));                            // dessus
  // dessus : trois planches, veinage, équerres de bronze aux coins
  out.push(L([-28, -14].map((y) => k.lineOnTop([x0 - 3, y], [x1 + 3, y], h + 7, P)).join(""), { tone: "lo" }));
  out.push(`<path class="ak-grain" d="${[[-37, 0.2], [-33, 0.7], [-23, 0.35], [-9, 0.55], [-5, 0.15]].map(([y, q]) => k.pathOf([at([x0 - 3 + (x1 - x0 + 6) * q, y, h + 7]), at([x0 - 3 + (x1 - x0 + 6) * (q + 0.22), y + 0.8, h + 7]), at([x0 - 3 + (x1 - x0 + 6) * (q + 0.4), y - 0.4, h + 7])])).join("")}"/>`);
  for (const [x, y, sx, sy] of [[x0 - 3, y1 + 3, 1, -1], [x1 + 3, y1 + 3, -1, -1], [x1 + 3, y0 - 3, -1, 1]]) {
    out.push(`<path class="ak-bracket" d="${k.pathOf([at([x, y, h + 7]), at([x + 12 * sx, y, h + 7]), at([x + 12 * sx, y + 3 * sy, h + 7]), at([x + 3 * sx, y + 3 * sy, h + 7]), at([x + 3 * sx, y + 12 * sy, h + 7]), at([x, y + 12 * sy, h + 7])], true)}"/>`);
    out.push(dots([[x + 1.6 * sx, y + 1.6 * sy, h + 7], [x + 9 * sx, y + 1.6 * sy, h + 7], [x + 1.6 * sx, y + 9 * sy, h + 7]], 0.5, "hi"));
  }
  // fente de lecture et ses lèvres de laiton
  out.push(box(-50, -20, -26, -16, h + 7, 1.2, { tone: "mid", bevel: 0.4, ...BRONZE }));
  out.push(`<path class="iso-fill fig-dark" d="${k.pathOf([at([-46, -23, h + 8.2]), at([-24, -23, h + 8.2]), at([-24, -19, h + 8.2]), at([-46, -19, h + 8.2])], true)}"/>`);
  out.push(dots([[-48.5, -21, h + 8.2], [-21.5, -21, h + 8.2]], 0.5, "hi"));
  // rampe des voyants des quatre champs sur le chant avant du dessus
  out.push(box(-6, 46, y1 - 1, y1 + 3, h + 1, 5, { tone: "lo", bevel: 0.4, ...BRONZE }));
  // flanc droit : plaque de bronze, équerres d'angle rivetées
  const r = right(x1);
  out.push(`<g transform="${r}">${[[0, -7, 1, -1], [42, -7, -1, -1], [0, -h, 1, 1], [42, -h, -1, 1]].map(([u, v, su, sv]) => `<path class="ak-bracket" d="M${u} ${v}H${u + 9 * su}V${v + 2.4 * sv}H${u + 2.4 * su}V${v + 9 * sv}H${u}Z"/>`).join("")}</g>`);
  out.push(dots([[x1, -1.4, 8.4], [x1, -40.6, 8.4], [x1, -1.4, h - 1.4], [x1, -40.6, h - 1.4], [x1, -6, 8.4], [x1, -36, 8.4]], 0.45, "hi"));
  return out.join("");
})();
const lampsXY = [0, 1, 2, 3].map((i) => [2 + i * 12, CASE.y1 + 3.1, CASE.h + 3.5]);

// ---------------------------------------------------------------- le cadran à spirale du dos (flanc droit) : douze pages inédites
const DIAL = { u: 21, z: 64, r0: 5, r1: 17, turns: 3 };
const spiralAt = (s) => { const a = s * DIAL.turns * TAU, r = DIAL.r0 + (DIAL.r1 - DIAL.r0) * s; return [DIAL.u + r * Math.cos(a - Math.PI / 2), -DIAL.z + r * Math.sin(a - Math.PI / 2)]; };
const CELLS = Array.from({ length: 12 }, (_, i) => 0.1 + i * 0.075);
const dialSvg = (() => {
  let sp = ""; for (let i = 0; i <= 160; i++) { const [u, v] = spiralAt(i / 160); sp += (i ? "L" : "M") + u.toFixed(2) + " " + v.toFixed(2); } { const [u, v] = spiralAt(1), dx = u - DIAL.u, dy = v + DIAL.z, l = Math.hypot(dx, dy); sp += "L" + (DIAL.u + dx / l * 22.5).toFixed(2) + " " + (-DIAL.z + dy / l * 22.5).toFixed(2); } sp += ring48(DIAL.r0, DIAL.u, -DIAL.z);
  let ticks = ""; for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU, r0 = i % 3 ? 20.6 : 19.2, r1 = 22.5; ticks += `M${(DIAL.u + r0 * Math.cos(a)).toFixed(2)} ${(-DIAL.z + r0 * Math.sin(a)).toFixed(2)}L${(DIAL.u + r1 * Math.cos(a)).toFixed(2)} ${(-DIAL.z + r1 * Math.sin(a)).toFixed(2)}`; }
  const cells = CELLS.map((s, i) => { const [u, v] = spiralAt(s); return `<rect class="ak-cell" data-part="cell-${i}" x="${(u - 1.5).toFixed(2)}" y="${(v - 1.5).toFixed(2)}" width="3" height="3" rx="0.5"/>`; }).join("");
  const ver = Array.from({ length: 4 }, (_, i) => { const a = -Math.PI / 2 + (i - 1.5) * 0.55; return `<path class="iso-line" data-tone="lo" d="M${(DIAL.u + 4 * Math.cos(a)).toFixed(2)} ${(-106 + 4 * Math.sin(a)).toFixed(2)}L${(DIAL.u + 10.5 * Math.cos(a)).toFixed(2)} ${(-106 + 10.5 * Math.sin(a)).toFixed(2)}"/>`; }).join("");
  return `<g transform="${right(CASE.x1)}">
    <path class="ak-plate" d="M2 -8H40V-124H2Z"/><path class="iso-line" data-tone="faint" d="M4 -10H38V-122H4Z"/>
    <path class="ak-face" d="${circ(22.5, DIAL.u, -DIAL.z)}"/><path class="iso-line" data-tone="mid" d="${ring48(22.5, DIAL.u, -DIAL.z)}"/>
    <path class="iso-line" data-tone="lo" d="${ticks}"/><path class="iso-line" data-tone="mid" d="${sp}"/>${cells}
    <path class="ak-face" d="${circ(10.5, DIAL.u, -106)}"/><path class="iso-line" data-tone="mid" d="${ring48(10.5, DIAL.u, -106)}"/>${ver}<path class="iso-line" data-tone="lo" d="${ring48(4, DIAL.u, -106)}"/>
    <g data-part="ver-hand"></g><g data-part="spiral-hand"></g>
    ${inscription(7, -37, 28, 6, 3, 3.6)}${inscription(7, -122, 28, 1, 5)}${inscription(5, -91, 6, 1, 9)}${inscription(31, -91, 6, 1, 13)}
  </g>`;
})();

// ---------------------------------------------------------------- machine à diviser (établi, devant à droite) et tableau des versions
const DIV = { x: 128, y: 40, r: 20, z: 22 };
const divSvg = (() => {
  const out = [];
  // socle de fonte sur patins, vis d'angle, plaque signalétique
  out.push(box(DIV.x - 34, DIV.x + 34, DIV.y - 24, DIV.y + 26, 0, 2, { tone: "lo", bevel: 0.6, ...STEEL }));
  out.push(box(DIV.x - 32, DIV.x + 32, DIV.y - 22, DIV.y + 24, 2, 4, { tone: "lo", bevel: 1, ...STEEL }));
  out.push(dots([[DIV.x - 29, DIV.y - 19, 6], [DIV.x + 29, DIV.y - 19, 6], [DIV.x - 29, DIV.y + 21, 6], [DIV.x + 29, DIV.y + 21, 6]], 0.55, "hi"));
  out.push(box(DIV.x - 12, DIV.x + 12, DIV.y + 24, DIV.y + 24.6, 2.6, 2.8, { tone: "mid", bevel: 0.1, ...BRONZE }));
  out.push(`<g transform="${front(DIV.y + 24.6)}">${inscription(DIV.x - 10, -4.9, 20, 1, 21)}</g>`);
  // colonne du diviseur, collet moleté, plateau diviseur à deux rangées de trous (20 et 46)
  out.push(S(k.cylinder(DIV.x, DIV.y, 8, 6, 2, P, 24), { tone: "mid", className: "mat-steel" }));
  out.push(S(k.cylinder(DIV.x, DIV.y, 6, 8, DIV.z - 10, P, 18), { tone: "mid", className: "mat-steel" }));
  out.push(S(k.cylinder(DIV.x, DIV.y, DIV.r + 6, 6, 3, P, 48), { tone: "mid", className: "mat-bronze" }));
  out.push(L(k.knurl(DIV.x, DIV.y, 8, 6.2, 7.8, 28, P), { tone: "lo" }));
  const holes = []; for (let ring = 0; ring < 2; ring++) for (let i = 0; i < (ring ? 46 : 20); i++) { const a = (i / (ring ? 46 : 20)) * TAU, rr = ring ? DIV.r + 3.8 : DIV.r - 1; holes.push(at([DIV.x + rr * Math.cos(a), DIV.y + rr * Math.sin(a), 9])); }
  out.push(D(holes, { size: 0.35, tone: "lo" }));
  // index à ressort : potence, lame et doigt dans un trou de la rangée de 46
  const ix = DIV.x + 18, iy = DIV.y - 20;
  out.push(box(ix - 2.5, ix + 2.5, iy - 2.5, iy + 2.5, 6, 6, { tone: "mid", bevel: 0.5, ...STEEL }));
  const tipA = Math.atan2(iy + 6 - DIV.y, ix - 4 - DIV.x), tip = [DIV.x + (DIV.r + 3.8) * Math.cos(tipA), DIV.y + (DIV.r + 3.8) * Math.sin(tipA)];
  out.push(L(k.pathOf([at([ix, iy, 12]), at([tip[0], tip[1], 10.2])]), { tone: "hi" }));
  out.push(D([at([ix, iy, 12]), at([tip[0], tip[1], 10.2])], { size: 1.2, tone: "hi" }));
  // glissière du couteau : bâti, coulisse, volant moleté
  out.push(box(DIV.x - 31, DIV.x - 21, DIV.y - 9, DIV.y + 9, 6, 16, { tone: "mid", bevel: 0.8, ...STEEL }));
  out.push(box(DIV.x - 31, DIV.x + 2, DIV.y - 3.5, DIV.y + 3.5, 22, 2.4, { tone: "mid", bevel: 0.4, ...STEEL }));
  out.push(S(k.cylinder(DIV.x - 26, DIV.y + 13, 4.5, 6, 2.4, P, 24), { tone: "mid", className: "mat-steel" }));
  out.push(L(k.knurl(DIV.x - 26, DIV.y + 13, 4.5, 6.2, 8.2, 22, P), { tone: "lo" }));
  // copeaux de bronze
  const chips = []; for (let i = 0; i < 26; i++) { const a = i * 2.39, rr = DIV.r + 8 + (i * 7 % 9); chips.push(at([DIV.x - 6 + rr * 0.5 * Math.cos(a), DIV.y + rr * 0.45 * Math.sin(a) + 2, 6.1])); }
  out.push(`<g class="ak-chips">${D(chips, { size: 0.5, tone: "mid" })}</g>`);
  // manivelle de l'opérateur
  out.push(box(DIV.x + 22, DIV.x + 30, DIV.y + 12, DIV.y + 22, 6, 12, { tone: "mid", ...STEEL }));
  return out.join("");
})();
const BOARD = { x0: 98, x1: 170, y: -46, z0: 6, z1: 70 };
const boardSvg = (() => {
  const out = [box(BOARD.x0, BOARD.x1, BOARD.y - 3, BOARD.y, 4, BOARD.z1 - 4, { tone: "lo", ...WOOD })];
  out.push(box(BOARD.x0 - 3, BOARD.x1 + 3, BOARD.y - 6, BOARD.y + 4, 0, 4, { tone: "mid", bevel: 0.8, ...WOOD }));
  out.push(box(BOARD.x0 - 1, BOARD.x1 + 1, BOARD.y - 4, BOARD.y + 1, BOARD.z1, 3, { tone: "mid", bevel: 0.6, ...WOOD }));
  const f = front(BOARD.y);
  let s = "";
  for (const z of [24, 46]) s += `<path class="ak-grain" d="M${BOARD.x0} ${-z}H${BOARD.x1}"/>`;
  s += `<path class="ak-grain" d="M${BOARD.x0} -36C${BOARD.x0 + 26} -38 ${BOARD.x0 + 50} -34 ${BOARD.x1} -37M${BOARD.x0} -60C${BOARD.x0 + 30} -58 ${BOARD.x0 + 44} -62 ${BOARD.x1} -59"/>`;
  // plaque de titre et quatre étiquettes de version
  s += `<path class="ak-bridge" d="M${BOARD.x0 + 18} -19H${BOARD.x1 - 18}V-13H${BOARD.x0 + 18}Z"/>${inscription(BOARD.x0 + 21, -17.6, BOARD.x1 - BOARD.x0 - 42, 1, 17)}`;
  for (let i = 0; i < 4; i++) { const u = BOARD.x0 + 12 + i * 16; s += `<path class="ak-bridge" d="M${u - 5} -44H${u + 5}V-39.5H${u - 5}Z"/><text class="ak-tag" x="${u}" y="-40.6" text-anchor="middle">v${i + 1}</text><path class="ak-gear" d="${circ(1.6, u, -58)}"/>`; }
  out.push(`<g transform="${f}">${s}</g>`);
  out.push(dots([[BOARD.x0 + 20, BOARD.y, 16], [BOARD.x1 - 20, BOARD.y, 16]], 0.45, "hi"));
  return out.join("");
})();
// plateau des fiches (gauche) : pile d'entrée, boîte du corpus à trois intercalaires
const TRAY = { x: -98, y: 40 };
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
  // deux pignons de rechange posés à plat
  out.push(S(k.extrude(gearPlan(-48, 52, 7, 14, 0.2), 0, 1.6, P, { bevel: 0.15 }), { tone: "mid", crease: "none", className: "mat-bronze" }));
  out.push(S(k.extrude(gearPlan(-30, 62, 5, 10, 0.5), 0, 1.6, P, { bevel: 0.15 }), { tone: "mid", crease: "none", className: "mat-bronze" }));
  out.push(D([at([-48, 52, 1.6]), at([-30, 62, 1.6])], { size: 0.9, tone: "hi" }));
  // burette d'huile
  out.push(S(k.cylinder(-70, 66, 5, 0, 5, P, 24), { tone: "mid", className: "mat-bronze" }), S(k.cylinder(-70, 66, 3.2, 5, 2, P, 20), { tone: "mid", className: "mat-bronze" }));
  out.push(L(k.pathOf([at([-70, 66, 7]), at([-61, 61, 14])]), { tone: "hi" }), D([at([-70, 66, 7]), at([-61, 61, 14])], { size: 0.6, tone: "hi" }));
  // loupe d'horloger
  out.push(S(k.cylinder(36, 64, 5, 0, 2.4, P, 28), { tone: "mid", className: "mat-steel" }), S(k.cylinder(36, 64, 3.8, 2.4, 0.2, P, 28), { tone: "lo", crease: "none", className: "mat-glass" }));
  return out.join("");
})();

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un mécanisme d'Anticythère sur un établi : une fiche entre par la fente, une manivelle fait tourner une grande roue à quatre rayons, deux roues à cheville et coulisse s'accordent, un cadran à spirale prédit douze pages inédites, une machine à diviser taille une dent par correction, la roue neuve entre dans le boîtier et l'ancienne rejoint le tableau des versions ; une roue de 46 dents mène une roue de 20 dents : gain ×2,3.",
  body: [...base, toolsSvg, boardSvg, traySvg, caseSvg,
    `<g transform="${front(MECH_Y + 1)}" data-part="gears-back"></g><g transform="${front(MECH_Y + 4)}" data-part="gears"></g>`,
    caseFront, dialSvg,
    `<g data-part="lamps"></g><g data-part="card"></g><g data-part="crank"></g>`,
    divSvg, `<g data-part="div"></g><g data-part="board"></g><g data-part="travel"></g>`],
});

// ---------------------------------------------------------------- vivant
const live = `
const P = ${JSON.stringify(P)};
const GEARS = ${JSON.stringify(GEARS)}, CASE = ${JSON.stringify(CASE)}, DIAL = ${JSON.stringify(DIAL)}, CELLS = ${JSON.stringify(CELLS)}, DIV = ${JSON.stringify(DIV)}, BOARD = ${JSON.stringify(BOARD)};
const LAMPS = ${JSON.stringify(lampsXY)}, MECH_Y = ${MECH_Y};
${LOOP}
const TAU = Math.PI * 2;
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
${gearD.toString()}
const circ = ${circ.toString()};
const gearPlan = ${gearPlan.toString()};
${wheelSvg.toString()}
const at = (p) => iso(p, P);
const front = (y) => sideMatrix([0, y], 0, P, "left");
const box = (x0, x1, y0, y1, z, h, o = {}) => solidSvg(extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z, h, P, { bevel: o.bevel ?? 0.5 }), { tone: o.tone || "mid", lit: o.lit, crease: o.crease, className: o.cls });
const T = { read: [0.5, 4.2], sort: [2.0, 6.0], accord: [6.0, 9.6], infer: [10.0, 15.6], fix: [16.0, 23.0], train: [23.0, 28.0], ship: [28.4, 32.0], rerun: [32.4, 38.0], gain: [36.0, 40.0] }, LOOP_T = 42;
const ERR = [4, 9];
const STATIONS = ["Lecture · Document AI", "Tri des quatre champs · mini-BERT", "Hybride · cheville du modèle dans la coulisse des règles", "Inférence · douze pages inédites au cadran à spirale", "Correction humaine · une dent taillée par erreur", "Corpus et entraînement · la roue neuve se termine", "Publication · la roue neuve entre, l'ancienne passe au tableau des versions", "Nouvel essai · douze pages, douze cases vertes", "Gain · 46 dents mènent 20 dents : ×2,3"];
const TS = [0, 2.0, 6.0, 10.0, 16.0, 23.0, 28.4, 32.4, 36.0];
const stationAt = (s) => { let i = 0; TS.forEach((a, j) => { if (s >= a) i = j; }); return i; };
const parts = {}; for (const n of ["gears", "gears-back", "lamps", "card", "crank", "div", "board", "travel", "ver-hand", "spiral-hand"]) parts[n] = $(n);
const cells = CELLS.map((_, i) => $("cell-" + i));
const FIELDS = ["ak-f0", "ak-f1", "ak-f2", "ak-f3"];
let t = 0, frozen = false, touring = true, idle = 0;

function stateAt(s) {
  const o = {};
  // la manivelle : tourne pendant la lecture, l'inférence et le nouvel essai ; la grande roue suit (16 / 64)
  const crankTurns = 2.0 * ease(seg(s, 0.5, 9.6)) + 3.0 * ease(seg(s, 10.0, 15.6)) + 3.0 * ease(seg(s, 32.4, 40.0));
  o.crank = crankTurns * TAU; o.b1 = -o.crank * GEARS.crank.n / GEARS.b1.n;
  o.idle = -o.b1 * GEARS.b1.n / GEARS.idle.n; o.pin = -o.idle * GEARS.idle.n / GEARS.pin.n;
  // la coulisse suit la cheville quand l'accord est fait ; avant, elle hésite (décalage qui se résorbe)
  const ac = ease(seg(s, T.accord[0], T.accord[1]));
  o.slot = o.pin + (1 - ac) * 0.5 * Math.sin(s * 3);
  o.accord = s > T.accord[0] + 2.4 && s < T.accord[1] + 0.6 || s > T.rerun[0] + 0.8 && s < T.gain[1];
  o.p2 = -o.b1 * GEARS.b1.n / GEARS.p2.n;
  // anneaux du corpus : chaque correction les fait avancer d'un cran ; ils tournent pendant l'entraînement
  const fixes = ERR.map((_, i) => ease(seg(s, T.fix[0] + i * 3.2, T.fix[0] + i * 3.2 + 1.2)));
  o.corpus = [0.6, -0.9, 1.3].map((k2, i) => k2 * (fixes[0] + fixes[1]) * 0.8 + k2 * 2.2 * ease(seg(s, T.train[0], T.train[1])) + i * 0.4);
  // gain : la menante tourne, la menée tourne 46 / 20 fois plus vite
  o.d46 = -0.9 * TAU * ease(seg(s, T.gain[0], T.gain[1])) * 2; o.o20 = -o.d46 * 46 / 20;
  // voyants des champs : allumés quand un rayon passe sous le peigne (en haut de la grande roue)
  o.lamps = [0, 1, 2, 3].map((i) => { const a = ((o.b1 + i * TAU / 4) % TAU + TAU) % TAU, d = Math.abs(((a + Math.PI / 2) % TAU + TAU) % TAU - Math.PI); return (s > 2.0 && s < 9.6) || (s > 32.4 && s < 40) ? (d > Math.PI - 0.5 || s % 46 > 6 ? 1 : 0) : 0; });
  // cadran à spirale : l'aiguille parcourt les douze cases ; premier passage : deux erreurs ; second : tout vert
  const p1 = seg(s, T.infer[0], T.infer[1]), p2 = seg(s, T.rerun[0], T.rerun[1]);
  o.spiral = s < T.rerun[0] ? lerp(0.04, 0.96, p1) : lerp(0.04, 0.96, p2);
  o.cells = CELLS.map((c, i) => {
    const second = s >= T.rerun[0], u = second ? p2 : p1, reached = lerp(0.04, 0.96, u) >= c && (second || s >= T.infer[0]);
    if (!reached) return second || s < T.infer[0] ? 0 : 0;
    if (!second && ERR.includes(i)) { const k2 = ERR.indexOf(i), fixed = s > T.fix[0] + k2 * 3.2 + 1.2; return fixed ? 3 : 2; }
    return 1;
  });
  // machine à diviser : une dent par correction, puis la roue se termine pendant l'entraînement
  const cutTeeth = Math.floor(fixes[0] * 6 + fixes[1] * 6 + 34 * ease(seg(s, T.train[0], T.train[1])));
  o.cut = Math.min(46, cutTeeth); o.index = (o.cut / 46) * TAU;
  o.cutter = (() => { const strokes = []; ERR.forEach((_, i) => strokes.push([T.fix[0] + i * 3.2, T.fix[0] + i * 3.2 + 1.2])); strokes.push([T.train[0], T.train[1]]); let v = 0; for (const [a, b] of strokes) if (s > a && s < b) v = Math.abs(Math.sin((s - a) * 9)); return v; })();
  // publication : la roue neuve monte du plateau jusqu'au boîtier ; l'ancienne roue de gain part au tableau
  o.ship = ease(seg(s, T.ship[0], T.ship[0] + 1.8)); o.old = ease(seg(s, T.ship[0] + 1.2, T.ship[1]));
  o.version = s < T.ship[0] + 2.4 ? 2 : 3;
  // fiche : descend dans la fente au début, une seconde au nouvel essai
  o.card = [ease(seg(s, 0.5, 2.6)), ease(seg(s, 32.4, 34.2))];
  return o;
}

function draw(o, s) {
  const g = GEARS, rot = (gg, a, inner) => '<g transform="translate(' + gg.u + ' ' + (-gg.z) + ') rotate(' + (a * 180 / Math.PI).toFixed(2) + ')">' + inner + '</g>';
  let fr = "";
  fr += rot(g.b1, o.b1, wheelSvg(g.b1, { spokes: FIELDS }));
  fr += rot(g.crank, o.crank, wheelSvg(g.crank));
  fr += rot(g.idle, o.idle, wheelSvg(g.idle));
  fr += rot(g.p2, o.p2, wheelSvg(g.p2));
  fr += rot(g.pin, o.pin, wheelSvg(g.pin) + '<path class="ak-pin" d="' + circ(1.8, 10, 0) + '"/>');
  fr += rot(g.slot, o.slot, wheelSvg(g.slot, { lit: o.accord }) + '<path class="ak-slot" d="M4 -1.6H13.5V1.6H4Z"/>');
  fr += '<g transform="translate(' + g.corpus.u + ' ' + (-g.corpus.z) + ')">' + ['ak-r0', 'ak-r1', 'ak-r2'].map((cls, i) => { const r = 16 - i * 4.6; return '<g transform="rotate(' + (o.corpus[i] * 180 / Math.PI).toFixed(1) + ')"><path class="ak-gear ' + cls + '" d="' + gearD(r, 26 - i * 7, 1.4) + '"/><path class="ak-hole" d="' + circ(r - 2.6) + '"/><path class="ak-mark" d="M' + (r - 2.4) + ' -0.8H' + (r - 0.6) + 'V0.8H' + (r - 2.4) + 'Z"/></g>'; }).join("") + '<path class="ak-axle" d="' + circ(1.2) + '"/></g>';
  fr += rot(g.d46, o.d46, wheelSvg(g.d46));
  fr += rot(g.o20, o.o20, wheelSvg(g.o20, { lit: s > 36 }) + '<path class="ak-hand" d="M-1 0L0 -13L1 0Z"/>');
  // peigne de lecture au-dessus de la grande roue, aiguille d'accord
  fr += '<path class="ak-gear" d="M' + (g.b1.u - 10) + ' ' + (-(g.b1.z + 44)) + 'h20v-3h-20Z"/>' + [0, 1, 2, 3].map((i) => '<path class="ak-gear" d="M' + (g.b1.u - 7.5 + i * 5) + ' ' + (-(g.b1.z + 44)) + 'v5h1.4v-5Z"/>').join("");
  fr += '<g transform="translate(' + (g.slot.u + 14) + ' ' + (-(g.slot.z + 14)) + ')"><path class="ak-face" d="' + circ(3.4) + '"/><path class="' + (o.accord ? 'ak-ok' : 'ak-off') + '" d="' + circ(2) + '"/></g>';
  parts.gears.innerHTML = fr;
  // voyants des champs
  parts.lamps.innerHTML = LAMPS.map((p, i) => { const q = at(p); return '<circle class="ak-lamp ' + (o.lamps[i] ? FIELDS[i] + ' ak-on' : '') + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.6"/>'; }).join("");
  // fiche qui descend dans la fente, avec ses quatre lignes de champs
  parts.card.innerHTML = o.card.map((u, i) => { if (u <= 0 || u >= 1) return ""; const z = CASE.h + 8 + 40 * (1 - u); return box(-46, -24, -22.6, -19.4, z - 30, 30, { tone: "hi", crease: "none", bevel: 0.2 }) + '<g transform="' + front(-19.4) + '">' + ["ak-f0s", "ak-f1s", "ak-f2s", "ak-f3s"].map((c, j) => '<path class="' + c + '" d="M-43 ' + (-(z - 4 - j * 5)).toFixed(1) + 'h' + [12, 8, 15, 10][j] + '"/>').join("") + '</g>'; }).join("");
  // manivelle : bras et poignée qui sortent vers le spectateur
  const ca = o.crank, cu = g.crank.u, cz = g.crank.z, hx = cu + 14 * Math.cos(ca), hz = cz + 14 * Math.sin(ca);
  parts.crank.innerHTML = '<path class="iso-line" data-tone="hi" d="M' + at([cu, MECH_Y + 6, cz]).join(" ") + 'L' + at([hx, MECH_Y + 6, hz]).join(" ") + '"/>' + dotsSvg([at([cu, MECH_Y + 6, cz])], { size: 1.3, tone: "hi" }) + solidSvg(cylinder(hx, MECH_Y + 6, 2.2, 0, 0.01, P, 4), { tone: "hi" }).slice(0, 0) + box(hx - 2, hx + 2, MECH_Y + 6, MECH_Y + 16, hz - 2, 4, { tone: "hi", lit: true, bevel: 0.8, cls: "mat-wood" });
  // cadran à spirale : aiguille, cases ; cadran des versions
  const [su, sv] = (() => { const a = o.spiral * DIAL.turns * TAU, r = DIAL.r0 + (DIAL.r1 - DIAL.r0) * o.spiral; return [DIAL.u + r * Math.cos(a - Math.PI / 2), -DIAL.z + r * Math.sin(a - Math.PI / 2)]; })();
  parts["spiral-hand"].innerHTML = '<path class="ak-hand" d="M' + DIAL.u + ' ' + (-DIAL.z) + 'L' + su.toFixed(2) + ' ' + sv.toFixed(2) + '"/><path class="ak-gear" d="' + circ(1.6, su, sv) + '"/><path class="ak-axle" d="' + circ(1.1, DIAL.u, -DIAL.z) + '"/>';
  cells.forEach((c, i) => c.setAttribute("class", "ak-cell" + [" ", " ak-ok", " ak-bad", " ak-fixed"][o.cells[i]]));
  const va = -Math.PI / 2 + (o.version - 2.5) * 0.55;
  parts["ver-hand"].innerHTML = '<path class="ak-hand" d="M' + DIAL.u + ' -106L' + (DIAL.u + 8 * Math.cos(va)).toFixed(2) + ' ' + (-106 + 8 * Math.sin(va)).toFixed(2) + '"/><path class="ak-axle" d="' + circ(1, DIAL.u, -106) + '"/>';
  // machine à diviser : roue en cours de taille (horizontale), couteau qui frappe
  const R = DIV.r, wheelPlan = [];
  for (let i = 0; i < 46; i++) { const a = o.index + (i / 46) * TAU, w = TAU / 46, has = i < o.cut, ro = has ? R : R - 1.6, ri = R - 1.6; for (const [rr, f2] of [[ri, 0], [ri, 0.18], [ro, 0.3], [ro, 0.62], [ri, 0.74]]) wheelPlan.push([DIV.x + rr * Math.cos(a + w * f2), DIV.y + rr * Math.sin(a + w * f2)]); }
  const rise = o.ship;
  let dv = "";
  if (rise < 1) {
    const z = DIV.z - 13 + rise * 0;
    dv += solidSvg(extrude(wheelPlan, z, 2.4, P, { bevel: 0.2 }), { tone: "hi", lit: o.cutter > 0, crease: "none", className: "mat-bronze" });
    dv += solidSvg(cylinder(DIV.x, DIV.y, 3, z + 2.4, 3, P, 16), { tone: "mid", className: "mat-steel" }) + solidSvg(cylinder(DIV.x, DIV.y, 1.6, z + 5.4, 1.2, P, 12), { tone: "hi", className: "mat-steel" });
  }
  const cx = DIV.x - R - 6 + o.cutter * 4.5;
  dv += box(cx - 7, cx + 1, DIV.y - 3, DIV.y + 3, 24.4, 6, { tone: "mid", bevel: 0.6, cls: "mat-steel" });
  // fraise : disque denté vertical qui tourne pendant la coupe, sur son arbre
  const fa = s * 14 * (o.cutter > 0 ? 1 : 0), fz = DIV.z - 11.8;
  dv += '<g transform="' + front(DIV.y + 0.6) + '"><g transform="translate(' + (cx + 3).toFixed(2) + ' ' + (-fz).toFixed(2) + ') rotate(' + (fa * 57.3 % 360).toFixed(1) + ')"><path class="ak-back" d="' + gearD(4.2, 12, 0.9) + '" transform="translate(0.5 0.4)"/><path class="ak-steel' + (o.cutter > 0.5 ? ' ak-lit' : '') + '" d="' + gearD(4.2, 12, 0.9) + '"/><path class="ak-axle" d="' + circ(0.9) + '"/></g></g>';
  dv += box(cx - 0.8, cx + 1.2, DIV.y - 0.8, DIV.y + 0.8, fz, 24.4 - fz, { tone: "mid", bevel: 0.1, cls: "mat-steel" });
  const ha = (o.cut / 46) * TAU * 4, hx2 = DIV.x + 26 + 6 * Math.cos(ha), hy2 = DIV.y + 17 + 6 * Math.sin(ha);
  dv += '<path class="iso-line" data-tone="hi" d="M' + at([DIV.x + 26, DIV.y + 17, 18.5]).join(" ") + 'L' + at([hx2, hy2, 18.5]).join(" ") + '"/>' + box(hx2 - 1.5, hx2 + 1.5, hy2 - 1.5, hy2 + 1.5, 18.5, 5, { tone: "hi", bevel: 0.6, cls: "mat-wood" });
  parts.div.innerHTML = dv;
  // la roue neuve voyage du plateau vers le boîtier ; l'ancienne voyage du boîtier au tableau
  let tr = "";
  if (rise > 0 && rise < 1) { const x = lerp(DIV.x, -35, rise), y = lerp(DIV.y, -21, rise), z = lerp(DIV.z - 13, CASE.h + 9, rise) + 70 * Math.sin(rise * Math.PI * 0.85); tr += solidSvg(extrude(gearPlan(x, y, DIV.r, 46, s * 2), z, 2.4, P, { bevel: 0.2 }), { tone: "mid", crease: "none", className: "mat-bronze" }) + solidSvg(cylinder(x, y, 3, z + 2.4, 1.2, P, 16), { tone: "mid", className: "mat-steel" }); }
  if (o.old > 0 && o.old < 1) { const x = lerp(CASE.x1 - 20, BOARD.x0 + 12 + 3 * 16, o.old), y = lerp(-10, BOARD.y + 3, o.old), z = lerp(30, 58, o.old) + 20 * Math.sin(o.old * Math.PI); tr += '<g transform="' + front(y) + '"><path class="ak-gear" d="' + gearD(10, 20, 1.2) + '" transform="translate(' + x.toFixed(1) + ' ' + (-z).toFixed(1) + ')"/></g>'; }
  parts.travel.innerHTML = tr;
  // tableau des versions : anciennes roues accrochées ; la dernière arrive à la publication
  let bd = ""; for (let i = 0; i < 4; i++) { if (i === 3 && o.old < 1) continue; const u = BOARD.x0 + 12 + i * 16; bd += '<path class="ak-back" d="' + gearD(10, 20, 1.2) + '" transform="translate(' + (u + 0.8) + ' -57.2)"/><path class="ak-gear' + (i === 3 ? ' ak-lit' : '') + '" d="' + gearD(10, 20, 1.2) + '" transform="translate(' + u + ' -58)"/><path class="ak-axle" d="' + circ(1.6, u, -58) + '"/>'; }
  parts.board.innerHTML = '<g transform="' + front(BOARD.y + 1) + '">' + bd + '</g>';
}
function reading(s) { const i = stationAt(s); const fixed = (s > T.fix[0] + 1.2 ? 1 : 0) + (s > T.fix[0] + 4.4 ? 1 : 0); const ok = s < T.rerun[0] ? (s < T.infer[0] ? 0 : 10 + fixed) : 12; return (i + 1) + " · " + STATIONS[i] + (s >= T.infer[0] ? " · " + ok + "/12" : ""); }
const run = loop((dt, calm) => { if (frozen) return; if (touring) { t = calm ? 38.5 : t + dt; if (t >= LOOP_T) t = 0; } draw(stateAt(t), t); say(reading(t)); });
const jump = (i) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 9000); t = TS[(i + TS.length) % TS.length] + 1.5; run(); };
dragX(() => stationAt(t), (v, share) => { const n = (Math.round(v + share * 9) % 9 + 9) % 9; if (n !== stationAt(t)) jump(n); });
stage.addEventListener("keydown", (e) => { const i = stationAt(t); if (e.key === "ArrowRight") { e.preventDefault(); jump(i + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); jump(i - 1); } });
window.__fig = { at: (s) => { touring = false; frozen = true; t = s; draw(stateAt(s), s); say(reading(s)); return reading(s); }, Ts: TS };
draw(stateAt(0), 0); say(reading(0));
`;

const css = `<style>
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
.ak-cell.ak-ok,.ak-ok{fill:#5fae6e}.ak-cell.ak-bad{fill:#d2452f}.ak-cell.ak-fixed{fill:#e0a33a}.ak-off{fill:var(--anatomy-faint)}
.ak-f0{fill:#d2452f}.ak-f1{fill:#3f6fb0}.ak-f2{fill:#e0b23a}.ak-f3{fill:#3d8f8a}
.ak-r0{fill:#c98a6a}.ak-r1{fill:#8aa3c4}.ak-r2{fill:#c9b26a}
.ak-lamp{fill:var(--anatomy-faint);stroke:var(--anatomy-mid);stroke-width:.5}.ak-lamp.ak-on{stroke:var(--anatomy-hi)}
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
.mat-wood{--anatomy-face:var(--wd-1);--anatomy-top:var(--wd-0);--anatomy-lit-top:var(--wd-0);--anatomy-lit-shade:var(--wd-2);--anatomy-shade-0:var(--wd-4);--anatomy-shade-1:var(--wd-3);--anatomy-shade-2:var(--wd-2);--anatomy-shade-3:var(--wd-1)}
.mat-bronze{--anatomy-face:var(--bz-1);--anatomy-top:var(--bz-0);--anatomy-lit-top:var(--bz-0);--anatomy-lit-shade:var(--bz-2);--anatomy-shade-0:var(--bz-4);--anatomy-shade-1:var(--bz-3);--anatomy-shade-2:var(--bz-2);--anatomy-shade-3:var(--bz-1)}
.mat-steel{--anatomy-face:var(--st-1);--anatomy-top:var(--st-0);--anatomy-lit-top:var(--st-0);--anatomy-lit-shade:var(--st-2);--anatomy-shade-0:var(--st-4);--anatomy-shade-1:var(--st-3);--anatomy-shade-2:var(--st-2);--anatomy-shade-3:var(--st-1)}
.mat-plate{--anatomy-face:var(--pl-1);--anatomy-top:var(--pl-0);--anatomy-lit-top:var(--pl-0);--anatomy-lit-shade:var(--pl-2);--anatomy-shade-0:var(--pl-3);--anatomy-shade-1:var(--pl-2);--anatomy-shade-2:var(--pl-2);--anatomy-shade-3:var(--pl-1)}
.ak-leg{fill:none;stroke:var(--anatomy-hi);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.ak-legc{fill:none;stroke:var(--st-0);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}
.mat-paper{--anatomy-face:var(--pp);--anatomy-top:var(--pp);--anatomy-lit-top:var(--pp)}
.mat-glass{--anatomy-face:var(--gl);--anatomy-top:var(--gl);--anatomy-lit-top:var(--gl)}
.mat-ak-r0{--anatomy-top:#c98a6a;--anatomy-face:#c98a6a;--anatomy-shade-0:#a86c4e;--anatomy-shade-1:#b4775a;--anatomy-shade-2:#bf8264;--anatomy-shade-3:#c98a6a}
.mat-ak-r1{--anatomy-top:#8aa3c4;--anatomy-face:#8aa3c4;--anatomy-shade-0:#6c85a6;--anatomy-shade-1:#7690b0;--anatomy-shade-2:#809aba;--anatomy-shade-3:#8aa3c4}
.mat-ak-r2{--anatomy-top:#c9b26a;--anatomy-face:#c9b26a;--anatomy-shade-0:#a8924e;--anatomy-shade-1:#b49c58;--anatomy-shade-2:#bfa862;--anatomy-shade-3:#c9b26a}
.iso{--ak-bronze:#7a6a52;--ak-bronze-d:#4a4033;--ak-bronze-l:#a89272;--ak-hole:#1e1b17;--ak-engr:#2a241c;--ak-ink:#8a7a62;
  --wd-0:#4a3826;--wd-1:#3f3020;--wd-2:#36291b;--wd-3:#2e2317;--wd-4:#261d13;--wd-grain:#5a4630;
  --bz-0:#6a5a42;--bz-1:#5e4f3a;--bz-2:#544632;--bz-3:#4a3e2c;--bz-4:#403526;
  --st-0:#4a4d50;--st-1:#404346;--st-2:#383a3d;--st-3:#303235;--st-4:#28292b;--pp:#2a2722;--gl:#3a4a50;--pl-0:#3d4a3e;--pl-1:#344036;--pl-2:#2c372e;--pl-3:#252e27}
[data-theme="light"]{--ak-bronze:#d9c39a;--ak-bronze-d:#a68e66;--ak-bronze-l:#f2e3c2;--ak-hole:#3a332a;--ak-engr:#6e5a3c;--ak-ink:#7a8aa0;
  --wd-0:#e9d3ae;--wd-1:#dfc59c;--wd-2:#d2b68b;--wd-3:#c4a67a;--wd-4:#b39469;--wd-grain:#c2a173;
  --bz-0:#e3cfa6;--bz-1:#d6bf92;--bz-2:#cab283;--bz-3:#bca274;--bz-4:#ab9165;
  --st-0:#eceeef;--st-1:#dfe2e4;--st-2:#d3d7da;--st-3:#c6cbcf;--st-4:#b8bec3;--pp:#fbf6e8;--gl:#d8eef2;--pl-0:#a9b29a;--pl-1:#9aa58b;--pl-2:#8c977d;--pl-3:#7e8970}
</style>`;

const plate = k.plateHtml({
  fig: "Fig 11", title: "VRE Studio", hint: "Glisse ou ← → : étape", readout: "1 · Lecture · Document AI",
  keys: [
    { mark: "lit", label: "Ce qui vient d'agir : roue, aiguille, couteau, case du cadran" },
    { mark: "raised", label: "Le boîtier fermé sur trois côtés : tout tourne en local" },
  ],
  caption: "Un mécanisme d'Anticythère pour VRE Studio. La fiche entre par la fente (lecture, Document AI). La grande roue porte quatre rayons de couleur : chacun allume le voyant de son champ en passant sous le peigne (tri, mini-BERT). La cheville du modèle doit tomber dans la coulisse des règles pour que l'aiguille avance (hybride neuro-symbolique). Au dos, le cadran à spirale prédit douze pages inédites : deux cases rouges sont des erreurs (inférence). Chaque erreur corrigée à la main taille des dents sur la roue de la machine à diviser (Human-in-the-Loop) ; les trois anneaux du corpus, image, texte et position, avancent ; la roue se termine (entraînement LayoutLMv3), entre dans le boîtier, et l'ancienne rejoint le tableau des versions (MLOps local). Au nouvel essai, les douze cases sont vertes. Le gain est un vrai rapport d'engrenage : 46 dents mènent 20 dents, 46 / 20 = 2,3. Les erreurs et les cases sont des valeurs d'illustration.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="VRE Studio : flèches gauche et droite pour passer d'une étape à l'autre" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0">${svg}</div>`,
});
writeFigure("vrestudio-anticythere", { title: "VRE Studio · le mécanisme d'Anticythère", plate, live, width: 900, css });

// Fig 11 (variante D) · Lecteur VRE : le mécanisme d'Anticythère.
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
import { readFileSync } from "node:fs";
import * as MD from "../refonte/m3d/anticythere-model.js";
const { CASE, MECH_Y, GEARS, DIAL, CELLS, TRAY, DIV, GAUGE, LEVER, HATCH, BOARD, CORPUS_TOP, LID_Z, DESK, ELBOW } = MD;
const PH = MD.phases(false);

const WIDTH = 900, HEIGHT = 660;
const PLATE = { x: -128, y: -64, w: 318, d: 150, r: 12 };
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

const ring48 = (r, cx = 0, cy = 0) => "M" + Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * TAU; return (cx + r * Math.cos(a)).toFixed(2) + " " + (cy + r * Math.sin(a)).toFixed(2); }).join("L");
const circ = (r, cx = 0, cy = 0) => `M${(cx + r).toFixed(2)} ${cy}A${r} ${r} 0 1 0 ${(cx - r).toFixed(2)} ${cy}A${r} ${r} 0 1 0 ${(cx + r).toFixed(2)} ${cy}Z`;
// une roue sur la face : épaisseur (copie sombre décalée vers le fond), moyeu, rayons ou trous d'allègement, axe
// Roues en volume. Dans le plan d'une face, reculer d'une unité de profondeur (vers -y) décale le dessin d'un vecteur fixe OFF :
// une roue est un prisme, face arrière décalée, flancs des dents (seuls ceux tournés vers OFF se voient) ombrés selon leur
// orientation, parois des trous d'allègement, puis face avant. Une pièce « levée » (rayons, moyeu, cheville) avance vers le spectateur.
const OFF = (() => { const m = front(0).match(/[-\d.e]+/g).map(Number), o = at([0, 0, 0]), q = at([0, -1, 0]), dx = q[0] - o[0], dy = q[1] - o[1], u = dx / m[0]; return [+u.toFixed(4), +((dy - m[1] * u) / m[3]).toFixed(4)]; })();
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
  // trappe de la roue du modèle : lèvres de laiton et ouverture, par où l'on échange la roue à la publication
  out.push(box(HATCH.x0 - 2.5, HATCH.x1 + 2.5, HATCH.y0 - 2.5, HATCH.y1 + 2.5, h + 7, 1.2, { tone: "mid", bevel: 0.4, ...BRONZE }));
  out.push(`<path class="iso-fill fig-dark" d="${k.pathOf([at([HATCH.x0, HATCH.y0, h + 8.2]), at([HATCH.x1, HATCH.y0, h + 8.2]), at([HATCH.x1, HATCH.y1, h + 8.2]), at([HATCH.x0, HATCH.y1, h + 8.2])], true)}"/>`);
  out.push(dots([[HATCH.x0 - 1.3, (HATCH.y0 + HATCH.y1) / 2, h + 8.2], [HATCH.x1 + 1.3, (HATCH.y0 + HATCH.y1) / 2, h + 8.2]], 0.5, "hi"));
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
const spiralAt = (s) => { const a = s * DIAL.turns * TAU, r = DIAL.r0 + (DIAL.r1 - DIAL.r0) * s; return [DIAL.u + r * Math.cos(a - Math.PI / 2), -DIAL.z + r * Math.sin(a - Math.PI / 2)]; };
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
    ${inscription(7, -32.4, 28, 5, 3, 3.6)}<path class="ak-bridge" d="M12 -36.4H30V-39.6H12Z"/><path class="fig-dark" d="M13.6 -37.4H28.4V-38.6H13.6Z"/>${inscription(7, -122, 28, 1, 5)}${inscription(5, -91, 6, 1, 9)}${inscription(31, -91, 6, 1, 13)}
  </g>`;
})();

// ---------------------------------------------------------------- machine à diviser (établi, devant à droite) et tableau des versions
const RW = GEARS.pin.r, RP = RW + 6;                          // roue du modèle, plateau diviseur
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
  out.push(S(k.cylinder(DIV.x, DIV.y, RP, 6, 3, P, 48), { tone: "mid", className: "mat-bronze" }));
  out.push(L(k.knurl(DIV.x, DIV.y, 8, 6.2, 7.8, 28, P), { tone: "lo" }));
  const holes = []; for (let ring = 0; ring < 2; ring++) for (let i = 0; i < (ring ? 48 : 24); i++) { const a = (i / (ring ? 48 : 24)) * TAU, rr = ring ? RP - 2.2 : RP - 4.6; holes.push(at([DIV.x + rr * Math.cos(a), DIV.y + rr * Math.sin(a), 9])); }
  out.push(D(holes, { size: 0.35, tone: "lo" }));
  // index à ressort : potence, lame et doigt dans un trou de la rangée de 46
  const ix = DIV.x + 18, iy = DIV.y - 20;
  out.push(box(ix - 2.5, ix + 2.5, iy - 2.5, iy + 2.5, 6, 6, { tone: "mid", bevel: 0.5, ...STEEL }));
  const tipA = Math.atan2(iy + 6 - DIV.y, ix - 4 - DIV.x), tip = [DIV.x + (RP - 2.2) * Math.cos(tipA), DIV.y + (RP - 2.2) * Math.sin(tipA)];
  out.push(L(k.pathOf([at([ix, iy, 12]), at([tip[0], tip[1], 10.2])]), { tone: "hi" }));
  out.push(D([at([ix, iy, 12]), at([tip[0], tip[1], 10.2])], { size: 1.2, tone: "hi" }));
  // glissière du couteau : bâti, coulisse, volant moleté
  out.push(box(DIV.x - 31, DIV.x - 21, DIV.y - 9, DIV.y + 9, 6, 16, { tone: "mid", bevel: 0.8, ...STEEL }));
  out.push(box(DIV.x - 31, DIV.x + 2, DIV.y - 3.5, DIV.y + 3.5, 22, 2.4, { tone: "mid", bevel: 0.4, ...STEEL }));
  out.push(S(k.cylinder(DIV.x - 26, DIV.y - 13, 4.5, 6, 2.4, P, 24), { tone: "mid", className: "mat-steel" }));
  out.push(L(k.knurl(DIV.x - 26, DIV.y - 13, 4.5, 6.2, 8.2, 22, P), { tone: "lo" }));
  // copeaux de bronze
  const chips = []; for (let i = 0; i < 26; i++) { const a = i * 2.39, rr = RP + 2 + (i * 7 % 9); chips.push(at([DIV.x - 6 + rr * 0.5 * Math.cos(a), DIV.y + rr * 0.45 * Math.sin(a) + 2, 6.1])); }
  out.push(`<g class="ak-chips">${D(chips, { size: 0.5, tone: "mid" })}</g>`);
  // levier de publication : son boîtier ; le bras est dessiné vivant
  out.push(box(LEVER.x - 4, LEVER.x + 4, LEVER.y - 10, LEVER.y, 6, LEVER.z - 6, { tone: "mid", ...STEEL }));
  out.push(`<g transform="${front(LEVER.y)}"><path class="ak-bridge" d="M${LEVER.x - 3} ${-(LEVER.z - 4)}H${LEVER.x + 3}V${-(LEVER.z - 8)}H${LEVER.x - 3}Z"/>${inscription(LEVER.x - 2.4, -(LEVER.z - 4.6), 4.8, 1, 31)}</g>`);
  // banc d'essai : fente des rapports de test sur le dessus, deux cadrans (F1, rappel U1) et leur seuil, voyant
  const G = GAUGE, gx = (G.x0 + G.x1) / 2, gy = (G.y0 + G.y1) / 2;
  out.push(box(G.x0, G.x1, G.y0, G.y1, 6, G.z1 - 6, { tone: "mid", bevel: 0.6, ...STEEL }));
  out.push(`<path class="iso-fill fig-dark" d="${k.pathOf([at([gx - 6.5, gy - 0.8, G.z1]), at([gx + 6.5, gy - 0.8, G.z1]), at([gx + 6.5, gy + 0.8, G.z1]), at([gx - 6.5, gy + 0.8, G.z1])], true)}"/>`);
  let meters = "";
  for (const [cu, th] of [[G.x0 + 4.8, 0.75], [G.x1 - 4.8, 0.9]]) {
    const cv = -11, r = 3.6, arc = Array.from({ length: 25 }, (_, i) => { const a = Math.PI - (i / 24) * Math.PI; return (i ? "L" : "M") + (cu + r * Math.cos(a)).toFixed(2) + " " + (cv - r * Math.sin(a)).toFixed(2); }).join("");
    const ta = Math.PI - th * Math.PI;
    meters += `<path class="ak-face" d="M${cu - r - 0.8} ${cv + 0.8}H${cu + r + 0.8}V${cv - r - 0.8}H${cu - r - 0.8}Z"/><path class="ak-meter" d="${arc}"/><path class="ak-thr" d="M${(cu + (r - 1.2) * Math.cos(ta)).toFixed(2)} ${(cv - (r - 1.2) * Math.sin(ta)).toFixed(2)}L${(cu + (r + 0.4) * Math.cos(ta)).toFixed(2)} ${(cv - (r + 0.4) * Math.sin(ta)).toFixed(2)}"/>`;
  }
  out.push(`<g transform="${front(G.y1)}">${meters}${inscription(G.x0 + 1.5, -21.5, G.x1 - G.x0 - 3, 1, 41)}</g>`);
  return out.join("");
})();
const boardSvg = (() => {
  const out = [box(BOARD.x0, BOARD.x1, BOARD.y - 3, BOARD.y, 4, BOARD.z1 - 4, { tone: "lo", ...WOOD })];
  out.push(box(BOARD.x0 - 3, BOARD.x1 + 3, BOARD.y - 6, BOARD.y + 4, 0, 4, { tone: "mid", bevel: 0.8, ...WOOD }));
  out.push(box(BOARD.x0 - 1, BOARD.x1 + 1, BOARD.y - 4, BOARD.y + 1, BOARD.z1, 3, { tone: "mid", bevel: 0.6, ...WOOD }));
  let s = `<path class="ak-grain" d="M${BOARD.x0} -15C${BOARD.x0 + 26} -17 ${BOARD.x0 + 50} -13 ${BOARD.x1} -16M${BOARD.x0} -52C${BOARD.x0 + 30} -50 ${BOARD.x0 + 44} -54 ${BOARD.x1} -51"/><path class="ak-grain" d="M${BOARD.x0} -44H${BOARD.x1}"/>`;
  BOARD.slots.forEach(([u, z], i) => { const tz = z + RW + 1.2; s += `<path class="ak-bridge" d="M${u - 5} ${-(tz + 4.2)}H${u + 5}V${-tz}H${u - 5}Z"/><text class="ak-tag" x="${u}" y="${-(tz + 1.1)}" text-anchor="middle">v${i + 1}</text><path class="ak-gear" d="${circ(1.8, u, -z)}"/>`; });
  out.push(`<g transform="${front(BOARD.y)}">${s}</g>`);
  return out.join("");
})();
// plateau des fiches (gauche) : pile d'entrée, boîte du corpus à trois intercalaires
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
  // table lumineuse « Radiographie » : cadre de bois, verre dépoli quadrillé, plaque gravée
  out.push(box(DESK.x0, DESK.x1, DESK.y0, DESK.y1, 0, DESK.z - 1, { tone: "mid", bevel: 0.8, ...WOOD }));
  out.push(box(DESK.x0 + 1.6, DESK.x1 - 1.6, DESK.y0 + 1.6, DESK.y1 - 1.6, DESK.z - 1, 1, { tone: "lo", bevel: 0.2, cls: "mat-light" }));
  out.push(`<path class="ak-lightgrid" d="${[0.25, 0.5, 0.75].map((q) => k.pathOf([at([DESK.x0 + 1.6 + (DESK.x1 - DESK.x0 - 3.2) * q, DESK.y0 + 1.6, DESK.z]), at([DESK.x0 + 1.6 + (DESK.x1 - DESK.x0 - 3.2) * q, DESK.y1 - 1.6, DESK.z])]) + k.pathOf([at([DESK.x0 + 1.6, DESK.y0 + 1.6 + (DESK.y1 - DESK.y0 - 3.2) * q, DESK.z]), at([DESK.x1 - 1.6, DESK.y0 + 1.6 + (DESK.y1 - DESK.y0 - 3.2) * q, DESK.z])])).join("")}"/>`);
  out.push(`<g transform="${front(DESK.y1)}"><path class="ak-bridge" d="M${DESK.x0 + 4} -1H${DESK.x1 - 4}V-4H${DESK.x0 + 4}Z"/>${inscription(DESK.x0 + 5.5, -3.4, DESK.x1 - DESK.x0 - 11, 1, 51, 3)}</g>`);
  // potence du bras automate : socle, colonne, rotule ; le bras de bronze en part vers la table lumineuse
  { const [bx, by, bz] = ELBOW;
    out.push(S(k.cylinder(bx, by, 5, 0, 1.6, P, 28), { tone: "mid", className: "mat-bronze" }), S(k.cylinder(bx, by, 1.6, 1.6, bz - 6, P, 18), { tone: "mid", className: "mat-bronze" }), S(k.cylinder(bx, by, 2.6, bz - 4.4, 2.4, P, 20), { tone: "mid", className: "mat-bronze" })); }
  // loupe d'horloger
  out.push(S(k.cylinder(36, 64, 5, 0, 2.4, P, 28), { tone: "mid", className: "mat-steel" }), S(k.cylinder(36, 64, 3.8, 2.4, 0.2, P, 28), { tone: "lo", crease: "none", className: "mat-glass" }));
  return out.join("");
})();

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un mécanisme d'Anticythère sur un établi : la fiche entre par la fente, la grande roue allume les champs, la cheville du modèle tombe dans la coulisse des règles, le cadran à spirale propose les cadres de douze pages ; chaque page validée part en feuille vers le corpus ; les copies du corpus figé forment un flan sur la machine à diviser, qui devient une roue taillée ; le banc d'essai la juge sur deux rapports séparés ; le levier la publie : l'ancienne roue sort par la trappe vers le tableau des versions et la nouvelle descend ; une roue de 46 dents mène une roue de 20 dents : gain ×2,3.",
  body: [...base, toolsSvg, boardSvg, traySvg, caseSvg,
    `<g transform="${front(MECH_Y + 1)}" data-part="gears-back"></g><g transform="${front(MECH_Y + 4)}" data-part="gears"></g>`,
    caseFront, `<clipPath id="ak-lid" clipPathUnits="userSpaceOnUse"><rect x="-400" y="-1000" width="800" height="${1000 - LID_Z}"/></clipPath><g transform="${front(MECH_Y + 4)}" clip-path="url(#ak-lid)" data-part="lidtop"></g>`, dialSvg,
    `<g data-part="lamps"></g><g data-part="crank"></g><g data-part="seal"></g>`,
    divSvg, `<g data-part="div"></g><g data-part="board"></g><g data-part="travel"></g><g data-part="sheets"></g><g data-part="hand"></g>`],
});

// ---------------------------------------------------------------- vivant
const MODEL_SRC = readFileSync(new URL("../refonte/m3d/anticythere-model.js", import.meta.url), "utf8").replace(/^export /gm, "");
const live = `
const P = ${JSON.stringify(P)};
const MODEL = (() => {
${MODEL_SRC}
return { TAU, CASE, MECH_Y, FY, GEARS, phases, DIAL, CELLS, TRAY, CORPUS_TOP, DIV, GAUGE, LEVER, HATCH, BOARD, LID_Z, ABOVE, T, LOOP_T, TS, STATIONS, stationAt, SHEETS, sheetPose, sheetRows, sheetTrail, stateAt, pinInCase, newInFlight, oldInFlight, handsAt, stampOf, HANDS };
})();
const { TAU, CASE, MECH_Y, FY, GEARS, DIAL, CELLS, TRAY, DIV, GAUGE, LEVER, BOARD, LID_Z, T, LOOP_T, TS, STATIONS, stationAt, SHEETS, sheetPose, sheetRows, sheetTrail, stateAt, pinInCase, newInFlight, oldInFlight, handsAt, stampOf, HANDS } = MODEL;
const PH = MODEL.phases(false), LAMPS = ${JSON.stringify(lampsXY)}, RW = GEARS.pin.r;
${LOOP}
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const lerp = (a, b, u) => a + (b - a) * u;
const circ = ${circ.toString()};
const gearPlan = ${gearPlan.toString()};
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
const parts = {}; for (const n of ["gears", "lidtop", "lamps", "crank", "seal", "div", "board", "hand", "travel", "sheets", "ver-hand", "spiral-hand"]) parts[n] = $(n);
const cells = CELLS.map((_, i) => $("cell-" + i));
const FIELDS = ["ak-f0", "ak-f1", "ak-f2", "ak-f3"];
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

// ---- « La Création d'Adam » : la main de bronze de la machine et la main de l'agent ; au contact des index, la page est validée ----
function handPaint(H, tip, m) {
  const P2 = (q) => pt([tip[0] + q[0], -(tip[2] + q[1])]);
  const poly = (pts, c) => '<path class="' + c + '" d="M' + pts.map(P2).join("L") + 'Z"/>';
  const line = (pts, c, w, dz = 0) => '<path class="' + c + '" stroke-width="' + f2(w) + '" d="M' + pts.map((q) => P2([q[0], q[1] + dz])).join("L") + '"/>';
  let out = "";
  if (H.sleeve) out += poly(H.sleeve, "hd-sleeve") + line(H.sleeve.slice(0, 2), "hd-hi-sleeve", 0.8, -0.6) + poly(H.cuff, "hd-cuff");
  out += poly(H.arm, "hd-" + m) + line(H.arm.slice(0, 2), "hd-hi-" + m, 1.4, -0.9);
  if (m === "bronze") { const K = 1.4; out += [-29, -34].map((u) => line([[u * K, 9.9 * K], [u * K, 0.9 * K]], "hd-ol-bronze", 0.5)).join(""); }
  out += poly(H.palm, "hd-" + m) + line(H.palm.slice(0, 3), "hd-hi-" + m, 1.1, -0.7);
  for (const f of H.fingers) {
    out += line(f.pts, "hd-ol-" + m, f.w + 0.8) + line(f.pts, "hd-fill-" + m, f.w) + line(f.pts, "hd-hi-" + m, f.w * 0.32, f.w * 0.22);
    if (m === "bronze") out += f.pts.slice(1, -1).map((q) => '<path class="hd-rivet" d="' + circ(0.42, tip[0] + q[0], -(tip[2] + q[1])) + '"/>').join("");
  }
  const ix = H.fingers.find((f) => f.pts[f.pts.length - 1][0] === 0), q1 = ix.pts[ix.pts.length - 2], d = Math.hypot(q1[0], q1[1]);
  out += '<path class="hd-nail-' + m + '" d="' + circ(0.55, tip[0] + q1[0] / d * 0.9, -(tip[2] + q1[1] / d * 0.9 + 0.35)) + '"/>';
  return out;
}
function handsSvg(s) {
  const h = handsAt(s); let out = handPaint(HANDS.machine, h.machine, "bronze");
  if (h.human) {
    out += handPaint(HANDS.human, h.human, "skin");
    if (h.press > 0.35) { const cx = (h.machine[0] + h.human[0]) / 2, cz = h.machine[2] + 0.1, r = 0.8 + 2.2 * h.press;
      out += '<g class="ak-spark ak-spark-' + h.kind + '" style="opacity:' + h.press.toFixed(2) + '"><path d="' + circ(r, cx, -cz) + '"/>' + [0, 1, 2, 3, 4, 5].map((i) => { const a = i * Math.PI / 3 + 0.3; return '<path d="M' + f2(cx + (r + 0.6) * Math.cos(a)) + ' ' + f2(-cz + (r + 0.6) * Math.sin(a)) + 'L' + f2(cx + (r + 2.6) * Math.cos(a)) + ' ' + f2(-cz + (r + 2.6) * Math.sin(a)) + '"/>'; }).join("") + '</g>'; }
  }
  return '<g transform="' + front(h.machine[1]) + '">' + out + '</g>';
}

function draw(o, s) {
  const g = GEARS;
  let fr = "", top = "";
  fr += wheel3d(g.b1, o.b1 + PH.b1, { spokes: FIELDS });
  fr += wheel3d(g.crank, o.crank + PH.crank);
  fr += wheel3d(g.idle, o.idle + PH.idle);
  fr += wheel3d(g.p2, o.p2 + PH.p2);
  // roue du modèle contre la platine (elle sort par la trappe à la publication), roue des règles levée devant elle
  const pc = pinInCase(o), pa = o.pin + PH.pin;
  if (pc) { const w = wheel3d({ ...g.pin, z: pc.z }, pa); fr += w; if (pc.z + RW > LID_Z) top += w + pinPeg(g.pin.u, pc.z, pa, 3); }
  fr += wheel3d(g.slot, o.slot + PH.pin, { lit: o.accord, h: 4.2 });
  { const T = 3, h = 4.2 + T, c = lift([[g.slot.u, -g.slot.z]], h)[0], sa = o.slot + PH.pin, rr = (x, y) => [c[0] + x * Math.cos(sa) - y * Math.sin(sa), c[1] + x * Math.sin(sa) + y * Math.cos(sa)];
    fr += '<path class="ak-slot" d="M' + [rr(4, -1.6), rr(13.5, -1.6), rr(13.5, 1.6), rr(4, 1.6)].map(pt).join("L") + 'Z"/>'; }
  if (pc) fr += pinPeg(g.pin.u, pc.z, pa, 3);
  ['ak-r0', 'ak-r1', 'ak-r2'].forEach((cls, i) => { const r = g.corpus.r - i * 4.6, T = 1.6, h = i * T, a = o.corpus[i] + (i ? 0 : PH.corpus), c = lift([[g.corpus.u, -g.corpus.z]], h + T)[0];
    fr += prism(lift(gearPts(r, 26 - i * 7, i ? 1.4 : g.corpus.d, 99, a, g.corpus.u, -g.corpus.z), h + T), T, { cls: "ak-gear " + cls, holes: [[c[0], c[1], r - 2.6]] });
    const m = [[r - 2.4, -0.8], [r - 0.6, -0.8], [r - 0.6, 0.8], [r - 2.4, 0.8]].map(([x, y]) => [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]);
    fr += '<path class="ak-mark" d="M' + m.map(pt).join("L") + 'Z"/>'; });
  fr += raised(circPts(1.4, g.corpus.u, -g.corpus.z, 14), 4.8, 1.2, "ak-axle3");
  fr += wheel3d(g.p3, o.p3 + PH.p3);
  fr += wheel3d(g.d46, o.d46, { h: 3.2 });
  fr += wheel3d(g.o20, o.o20 + PH.o20, { lit: s > T.gain[0], h: 3.2 });
  { const c = lift([[g.o20.u, -g.o20.z]], 3.2 + 2.2 + 2.6)[0], a = o.o20 + PH.o20, rr = (x, y) => [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
    fr += '<path class="ak-hand" d="M' + [rr(-1, 0), rr(0, -13), rr(1, 0)].map(pt).join("L") + 'Z"/>'; }
  { const u = g.b1.u, v = -(g.b1.z + 44), rect = (u0, v0, w, hh) => [[u0, v0], [u0 + w, v0], [u0 + w, v0 + hh], [u0, v0 + hh]];
    fr += [0, 1, 2, 3].map((i) => raised(rect(u - 7.5 + i * 5, v, 1.4, 5), 0, 2.4, "ak-gear")).join("") + raised(rect(u - 10, v - 3, 20, 3), 0, 3.6, "ak-gear"); }
  fr += '<g transform="translate(' + (g.slot.u + 14) + ' ' + (-(g.slot.z + 14)) + ')"><path class="ak-face" d="' + circ(3.4) + '"/><path class="' + (o.accord ? 'ak-ok' : 'ak-off') + '" d="' + circ(2) + '"/></g>';
  parts.gears.innerHTML = fr; parts.lidtop.innerHTML = top;
  parts.lamps.innerHTML = LAMPS.map((p, i) => { const q = at(p); return '<circle class="ak-lamp ' + (o.lamps[i] ? FIELDS[i] + ' ak-on' : '') + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.6"/>'; }).join("");
  const ca = o.crank, cu = g.crank.u, cz = g.crank.z, hx = cu + 14 * Math.cos(ca), hz = cz + 14 * Math.sin(ca);
  parts.crank.innerHTML = '<path class="iso-line" data-tone="hi" d="M' + at([cu, MECH_Y + 6, cz]).join(" ") + 'L' + at([hx, MECH_Y + 6, hz]).join(" ") + '"/>' + dotsSvg([at([cu, MECH_Y + 6, cz])], { size: 1.3, tone: "hi" }) + box(hx - 2, hx + 2, MECH_Y + 6, MECH_Y + 16, hz - 2, 4, { tone: "hi", lit: true, bevel: 0.8, cls: "mat-wood" });
  // le corpus est figé : un sceau de cire sur la boîte, sa version
  parts.seal.innerHTML = o.sealed ? '<g transform="' + front(TRAY.y + 14) + '"><path class="ak-seal" d="' + circ(2.6, TRAY.x + 12.5, -8.5) + '"/><path class="ak-sealin" d="' + circ(1.5, TRAY.x + 12.5, -8.5) + '"/></g>' : "";
  // cadran à spirale : aiguille, cases ; cadran des versions
  const [su, sv] = (() => { const a = o.spiral * DIAL.turns * TAU, r = DIAL.r0 + (DIAL.r1 - DIAL.r0) * o.spiral; return [DIAL.u + r * Math.cos(a - Math.PI / 2), -DIAL.z + r * Math.sin(a - Math.PI / 2)]; })();
  parts["spiral-hand"].innerHTML = '<path class="ak-hand" d="M' + DIAL.u + ' ' + (-DIAL.z) + 'L' + f2(su) + ' ' + f2(sv) + '"/><path class="ak-gear" d="' + circ(1.6, su, sv) + '"/><path class="ak-axle" d="' + circ(1.1, DIAL.u, -DIAL.z) + '"/>';
  cells.forEach((c, i) => c.setAttribute("class", "ak-cell" + [" ", " ak-ok", " ak-bad", " ak-fixed", " ak-prop"][o.cells[i]]));
  const va = -Math.PI / 2 + (o.version - 2.5) * 0.55;
  parts["ver-hand"].innerHTML = '<path class="ak-hand" d="M' + DIAL.u + ' -106L' + f2(DIAL.u + 8 * Math.cos(va)) + ' ' + f2(-106 + 8 * Math.sin(va)) + '"/><path class="ak-axle" d="' + circ(1, DIAL.u, -106) + '"/>';
  // machine à diviser : axe nu, puis flan pressé, puis roue taillée ; couteau, banc d'essai, levier de publication
  let dv = "";
  const onDiv = o.blank > 0 && !(o.newFly > 0);
  if (onDiv) {
    const plan = o.blank < 1 ? circPts((RW - g.pin.d) * (0.55 + 0.45 * o.blank), DIV.x, DIV.y, 40) : gearPlan(DIV.x, DIV.y, RW, 24, o.index, o.cut, g.pin.d);
    dv += solidSvg(extrude(plan, DIV.z, 3, P, { bevel: 0.2 }), { tone: "hi", lit: o.cutter > 0 || o.blank < 1, crease: "none", className: "mat-bronze" });
    dv += solidSvg(cylinder(DIV.x, DIV.y, 2.6, DIV.z + 3, 2, P, 16), { tone: "mid", className: "mat-steel" });
    if (o.peg) dv += solidSvg(cylinder(DIV.x + 10 * Math.cos(o.index), DIV.y + 10 * Math.sin(o.index), 1.8, DIV.z + 3, 3.6, P, 14), { tone: "mid", className: "mat-bronze" });
  } else dv += solidSvg(cylinder(DIV.x, DIV.y, 2.6, DIV.z, 5, P, 16), { tone: "mid", className: "mat-steel" });
  const cx = DIV.x - RW - 6 + o.cutter * 4.5, fz = DIV.z + 1.5;
  dv += box(cx - 7, cx + 1, DIV.y - 3, DIV.y + 3, 24.4, 6, { tone: "mid", bevel: 0.6, cls: "mat-steel" });
  const fa = s * 14 * (o.cutter > 0 ? 1 : 0);
  dv += '<g transform="' + front(DIV.y + 0.6) + '"><g transform="translate(' + f2(cx + 3) + ' ' + f2(-fz) + ') rotate(' + (fa * 57.3 % 360).toFixed(1) + ')">' + prism(lift(gearPts(4.2, 12, 0.9, 12, 0, 0, 0), 1.6), 1.6, { cls: "ak-steel" + (o.cutter > 0.5 ? " ak-lit" : "") }) + '<path class="ak-axle" d="' + circ(0.9, -OFF[0] * 1.6, -OFF[1] * 1.6) + '"/></g></g>';
  dv += box(cx - 0.8, cx + 1.2, DIV.y - 0.8, DIV.y + 0.8, fz, 24.4 - fz, { tone: "mid", bevel: 0.1, cls: "mat-steel" });
  { const G = GAUGE; let gs = "";
    [[G.x0 + 4.8, o.f1], [G.x1 - 4.8, o.u1]].forEach(([u, v]) => { const a = Math.PI - v * Math.PI; gs += '<path class="ak-needle" d="M' + u + ' -11L' + f2(u + 3.1 * Math.cos(a)) + ' ' + f2(-11 - 3.1 * Math.sin(a)) + '"/><path class="ak-axle" d="' + circ(0.55, u, -11) + '"/>'; });
    gs += '<path class="' + (o.pass ? "ak-ok" : "ak-off") + '" d="' + circ(1.3, (G.x0 + G.x1) / 2, -18) + '"/>';
    dv += '<g transform="' + front(G.y1) + '">' + gs + '</g>'; }
  { const th = o.lever * 1.2, tip = [LEVER.x, LEVER.y - 5 + 11 * Math.sin(th), LEVER.z + 11 * Math.cos(th)];
    dv += '<path class="iso-line" data-tone="hi" d="M' + at([LEVER.x, LEVER.y - 5, LEVER.z]).join(" ") + 'L' + at(tip).join(" ") + '"/>' + dotsSvg([at([LEVER.x, LEVER.y - 5, LEVER.z])], { size: 1.3, tone: "hi" }) + box(tip[0] - 1.6, tip[0] + 1.6, tip[1] - 1.6, tip[1] + 1.6, tip[2] - 1, 3.4, { tone: "hi", lit: o.lever > 0.05, bevel: 0.6, cls: "mat-wood" }); }
  parts.div.innerHTML = dv;
  // tableau des versions : v1 et v2 accrochées, v3 arrive à la publication, v4 attend la prochaine
  let bd = "";
  BOARD.slots.forEach(([u, z], i) => { if (i === 3 || (i === 2 && o.oldFly < 1)) return; bd += prism(lift(gearPts(RW, 24, g.pin.d, 24, i * 0.7, u, -z), 3), 3, { cls: "ak-gear" + (i === 2 ? " ak-lit" : ""), holes: [[u - OFF[0] * 3, -z - OFF[1] * 3, 1.8]] }); });
  parts.board.innerHTML = '<g transform="' + front(BOARD.y) + '">' + bd + '</g>';
  parts.hand.innerHTML = handsSvg(s);
  // roues en vol : l'ancienne, dressée, vers le tableau ; la candidate, qui se redresse en montant vers la trappe
  let tr = "";
  const ol = oldInFlight(o);
  if (ol) { const [x, y, z] = ol.c, a = pa + o.oldFly * 3; tr += '<g transform="' + front(y) + '">' + prism(lift(gearPts(RW, 24, g.pin.d, 24, a, x, -z), 3), 3, { cls: "ak-gear" }) + pinPeg(x, z, a, 3) + '</g>'; }
  const nw = newInFlight(o);
  if (nw) {
    const ca2 = Math.cos(nw.alpha), sa2 = Math.sin(nw.alpha), e2 = [0, ca2, sa2], n = [0, -sa2, ca2], c = nw.c, spin = s * 1.6;
    const W = (a, b, k) => [c[0] + a, c[1] + e2[1] * b + n[1] * k, c[2] + e2[2] * b + n[2] * k];
    const pts = gearPts(RW, 24, g.pin.d, 24, spin, 0, 0).map(([a, b]) => at(W(a, b, 3))), q0 = at(W(0, 0, 3)), q1 = at(W(0, 0, 0));
    tr += prismS(pts, q1[0] - q0[0], q1[1] - q0[1], { cls: "ak-gear ak-lit" });
  }
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
.mat-light{--anatomy-face:#eef5ff;--anatomy-top:#f5f9ff;--anatomy-lit-top:#f5f9ff;--anatomy-shade-0:#c9d8ee;--anatomy-shade-1:#d6e2f3;--anatomy-shade-2:#e2ebf8;--anatomy-shade-3:#eef5ff}
.hd-skin{fill:#e7b48f;stroke:#8c5a3c;stroke-width:.4;stroke-linejoin:round}.hd-bronze{fill:#d6b57a;stroke:#6e5228;stroke-width:.4;stroke-linejoin:round}
.hd-sleeve{fill:#3f5f8f;stroke:#22324d;stroke-width:.4;stroke-linejoin:round}.hd-cuff{fill:#f4f3ee;stroke:#9a9890;stroke-width:.35}
.hd-ol-skin,.hd-fill-skin,.hd-hi-skin,.hd-ol-bronze,.hd-fill-bronze,.hd-hi-bronze,.hd-hi-sleeve{fill:none;stroke-linecap:round;stroke-linejoin:round}
.hd-ol-skin{stroke:#8c5a3c}.hd-fill-skin{stroke:#e7b48f}.hd-hi-skin{stroke:#f6d3b8}.hd-ol-bronze{stroke:#6e5228}.hd-fill-bronze{stroke:#d6b57a}.hd-hi-bronze{stroke:#f1dcae}.hd-hi-sleeve{stroke:#5b7db0}
.hd-nail-skin{fill:#f8dccb;stroke:#b98a6c;stroke-width:.2}.hd-nail-bronze{fill:#efdcb0;stroke:#8a6a36;stroke-width:.2}.hd-rivet{fill:#8a6a36}
.ak-spark path{fill:none;stroke-width:.5;stroke-linecap:round}.ak-spark>path:first-child{fill:#fff8d8}.ak-spark-ok path{stroke:#35a974}.ak-spark-bad path{stroke:#d2452f}.ak-spark-fix path{stroke:#e0a33a}
.ak-skinline{fill:none;stroke:#b07a5a;stroke-width:.35;stroke-linecap:round}
.mat-paper{--anatomy-face:var(--pp);--anatomy-top:var(--pp);--anatomy-lit-top:var(--pp)}
.mat-glass{--anatomy-face:var(--gl);--anatomy-top:var(--gl);--anatomy-lit-top:var(--gl)}
.mat-ak-r0{--anatomy-top:#c98a6a;--anatomy-face:#c98a6a;--anatomy-shade-0:#a86c4e;--anatomy-shade-1:#b4775a;--anatomy-shade-2:#bf8264;--anatomy-shade-3:#c98a6a}
.mat-ak-r1{--anatomy-top:#8aa3c4;--anatomy-face:#8aa3c4;--anatomy-shade-0:#6c85a6;--anatomy-shade-1:#7690b0;--anatomy-shade-2:#809aba;--anatomy-shade-3:#8aa3c4}
.mat-ak-r2{--anatomy-top:#c9b26a;--anatomy-face:#c9b26a;--anatomy-shade-0:#a8924e;--anatomy-shade-1:#b49c58;--anatomy-shade-2:#bfa862;--anatomy-shade-3:#c9b26a}
.iso{--ak-bronze:#7a6a52;--ak-bronze-d:#4a4033;--ak-bronze-l:#a89272;--ak-hole:#1e1b17;--ak-engr:#2a241c;--ak-ink:#8a7a62;--ak-s0:#6a5b45;--ak-s1:#56493a;--ak-s2:#41372b;--ak-s3:#2e271f;
  --wd-0:#4a3826;--wd-1:#3f3020;--wd-2:#36291b;--wd-3:#2e2317;--wd-4:#261d13;--wd-grain:#5a4630;
  --bz-0:#6a5a42;--bz-1:#5e4f3a;--bz-2:#544632;--bz-3:#4a3e2c;--bz-4:#403526;
  --st-0:#4a4d50;--st-1:#404346;--st-2:#383a3d;--st-3:#303235;--st-4:#28292b;--pp:#2a2722;--gl:#3a4a50;--pp0:#e9eef7;--pp1:#cfd8e8;--pp2:#b4c0d6;--ppb:#6f8fd0;--ppl:#9db6ea;--pl-0:#3d4a3e;--pl-1:#344036;--pl-2:#2c372e;--pl-3:#252e27}
[data-theme="light"]{--ak-bronze:#d9c39a;--ak-bronze-d:#a68e66;--ak-bronze-l:#f2e3c2;--ak-hole:#3a332a;--ak-engr:#6e5a3c;--ak-ink:#7a8aa0;--ak-s0:#c8ae80;--ak-s1:#b0956a;--ak-s2:#937a54;--ak-s3:#7a6444;
  --wd-0:#e9d3ae;--wd-1:#dfc59c;--wd-2:#d2b68b;--wd-3:#c4a67a;--wd-4:#b39469;--wd-grain:#c2a173;
  --bz-0:#e3cfa6;--bz-1:#d6bf92;--bz-2:#cab283;--bz-3:#bca274;--bz-4:#ab9165;
  --st-0:#eceeef;--st-1:#dfe2e4;--st-2:#d3d7da;--st-3:#c6cbcf;--st-4:#b8bec3;--pp:#fbf6e8;--gl:#d8eef2;--pp0:#ffffff;--pp1:#f1f4fa;--pp2:#dfe6f3;--ppb:#bcd0f4;--ppl:#3e63dd;--pl-0:#a9b29a;--pl-1:#9aa58b;--pl-2:#8c977d;--pl-3:#7e8970}
</style>`;

const plate = k.plateHtml({
  fig: "Fig 11", title: "Lecteur VRE", hint: "Glisse ou ← → : étape", readout: "1 · Lecture · Document AI",
  keys: [
    { mark: "lit", label: "Ce qui vient d'agir : roue, aiguille, couteau, feuille, levier, contact des deux index" },
    { mark: "raised", label: "Case bleue : cadre proposé, jamais validé sans l'agent ; tout tourne en local" },
  ],
  caption: "Un mécanisme d'Anticythère pour le Lecteur VRE. La fiche entre par la fente (lecture, Document AI). La grande roue porte quatre rayons de couleur : chacun allume le voyant de son champ en passant sous le peigne (tri, mini-BERT). La cheville du modèle doit tomber dans la coulisse des règles métiers pour que l'aiguille avance (hybride neuro-symbolique). Au dos, le cadran à spirale propose les cadres de douze pages inédites : chaque case reste bleue, une proposition. Chaque page se pose sur la table lumineuse de Radiographie : comme dans La Création d'Adam, l'index de l'agent vient toucher celui de la main de bronze de la machine, vert pour valider, rouge puis orange pour corriger, la case du cadran change au même instant, et la page part en feuille vers la boîte du corpus partagé. Le corpus est figé (sceau) : ses copies, image, texte et positions, volent sur l'axe de la machine à diviser et sont pressées en un flan, dont l'entraînement LayoutLMv3 taille les dents. Le banc d'essai juge la roue candidate sur deux rapports séparés : F1 au-delà de 0,75, rappel U1 au-delà de 0,90, le voyant passe au vert. Le levier publie explicitement : l'ancienne roue du modèle sort par la trappe et rejoint le tableau des versions, la nouvelle descend à sa place ; les règles ne changent pas. Au nouvel essai, les cadres restent des propositions : les deux index se touchent encore pour chaque page. Le gain est un vrai rapport d'engrenage : 46 dents mènent 20 dents, 46 / 20 = 2,3. Les pages, erreurs et scores sont des valeurs d'illustration.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Lecteur VRE : flèches gauche et droite pour passer d'une étape à l'autre" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0">${svg}</div>`,
});
writeFigure("vrestudio-anticythere", { title: "Lecteur VRE · le mécanisme d'Anticythère", plate, live, width: 900, css });

// Pièces et mise en page communes aux figures du CV (compétence anatomy).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";

export const HERE = dirname(fileURLToPath(import.meta.url));

// Raccourcis liés à une projection.
export function tools(P) {
  const at = (p) => k.iso(p, P);
  return {
    at,
    S: (paths, style) => k.solidSvg(paths, style),
    L: (d, style) => k.lineSvg(d, style),
    D: (points, style) => k.dotsSvg(points, style),
    slab: (plan, z, h, steps = 3, bevel = 0.4) => k.slabOf(plan, z, h, P, steps, bevel),
    byDepth: (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P)),
    front: (y) => k.sideMatrix([0, y], 0, P, "left"),   // face d'équerre à y : local (x, −z)
    right: (x) => k.sideMatrix([x, 0], 0, P, "right"),  // face d'équerre à x : local (−y, −z)
    flat: (x0, z0, x1, z1, r = 1.2, steps = 4) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true),
  };
}

// Établi sur pieds : rainure, vis d'angle, règle avant et plaque signalétique.
export function bench(P, PLATE, { strip, label, plateH = 10, footH = 5 } = {}) {
  const { at, S, L, D, slab, byDepth } = tools(P);
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -plateH - footH, plateH, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -plateH - footH, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -plateH - footH + 1.6, footH - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(slab(PLATE, -plateH, plateH, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (strip) {
    out.push(S(slab(strip, 0, 0.6, 3, 0), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
    // Chiffres de la règle sous chaque trait majeur, à plat sur l'établi.
    for (let i = 0, x = strip.x + 4; x <= strip.x + strip.w - 4 + 0.01; i++, x += 20) out.push(k.faceTextSvg(k.topMatrix([x, strip.y + 5.6], 0.62, P, "x"), String(i * 5), { size: 2.2, tone: "lo", anchor: "middle" }));
    out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  }
  if (label) {
    out.push(S(slab(label, 0, 0.8, 3, 0), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
    out.push(L([0.65, 0.48, 0.56].map((w, i) => k.lineOnTop([label.x + 6, label.y + 3 + i * 2.6], [label.x + 6 + (label.w - 12) * w, label.y + 3 + i * 2.6], 0.8, P)).join(""), { tone: "lo", free: true }));
    out.push(D([at([label.x + 3, label.y + label.d / 2, 0.8]), at([label.x + label.w - 3, label.y + label.d / 2, 0.8])], { size: 0.45 }));
  }
  return out.join("");
}

// Fenêtre d'afficheur dans une face (coordonnées locales de la face) et son texte.
export function display(transform, flatPath, { part, x, y, size = 5, anchor = "middle", text = "" }) {
  return `<g transform="${transform}"><path class="iso-fill fig-window" d="${flatPath}"/><path class="iso-line" data-tone="lo" d="${flatPath}"/><text class="fig-digits" data-part="${part}" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}">${text}</text></g>`;
}

export const FIG_CSS = `<style>
.fg-p0{fill:#fff;stroke:#fff}.fg-p1{fill:#f1f4fa;stroke:#f1f4fa}.fg-p2{fill:#dfe6f3;stroke:#dfe6f3}.fg-pb{fill:#bcd0f4;stroke:#bcd0f4}
.fg-p0,.fg-p1,.fg-p2,.fg-pb{stroke-width:.25;stroke-linejoin:round}
.fg-pl{fill:none;stroke:#3e63dd;stroke-width:.4;stroke-linejoin:round}.fg-pl.fg-lit{stroke-width:.55}
.fg-dn{stroke:#3e63dd;stroke-width:.8}.fg-tx{fill:none;stroke:#8da2cf;stroke-width:.55;stroke-linecap:round}.fg-hd{fill:#9db6ea}.fg-fl{fill:none;stroke:#3e63dd;stroke-width:.35;stroke-linejoin:round;opacity:.75}.fg-bd{fill:none;stroke:#3e63dd;stroke-width:.9;stroke-linecap:round}
.fig-window{fill:var(--anatomy-paper)}
.fig-digits{font-family:var(--anatomy-mono);font-variant-numeric:tabular-nums;fill:var(--anatomy-hi);letter-spacing:.06em}
.fig-lamp{fill:var(--anatomy-lo);stroke:var(--anatomy-mid);stroke-width:.5}.fig-lamp[data-on="true"]{fill:var(--anatomy-lit)}
.iso-stage{touch-action:pan-y;cursor:var(--cv-resize-x);outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
@media (max-width:560px){.iso-plate{padding-bottom:86px}.iso-plate-corner[data-corner="hint"]{bottom:34px}.iso-plate-corner[data-corner="readout"]{left:0;white-space:normal;text-align:right;line-height:1.4}}
</style>`;


// Papier souple (même rendu que les feuilles du modèle sémantique VRE) : une bande de quadrilatères cintrée, ondulée,
// ombrée selon sa normale, recto clair et verso teinté, lignes d'écriture. À inclure dans le script vivant de la figure.
export const PAPER = `
const v3 = { add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mix: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
const quadArea = (q) => { let a = 0; for (let i = 0; i < q.length; i++) { const p0 = q[i], p1 = q[(i + 1) % q.length]; a += p0[0] * p1[1] - p1[0] * p0[1]; } return a; };
const PAPER_REF = Math.sign(quadArea([iso([0, 0, 0], P), iso([1, 0, 0], P), iso([1, 1, 0], P), iso([0, 1, 0], P)]));
const PAPER_LW = (() => { const l = [-0.35, 0.45, 0.82], n = Math.hypot(...l); return l.map((x) => x / n); })();
const pPt = (q) => q[0].toFixed(1) + " " + q[1].toFixed(1);
// Rangées de la feuille : c centre, d sens de la longueur L, w sens de la largeur W ; curl courbure (1/unité, négative : les bouts tombent),
// wave et roll : houle et roulis qui parcourent la feuille quand elle bouge, t le temps.
function paperRows(o) {
  const { c, d, w, L, W, curl = 0, wave = 0, roll = 0, ph = 0, t = 0, NT = 10 } = o, n = v3.cross(d, w), rows = [];
  for (let i = 0; i <= NT; i++) {
    const u = i / NT, s = (u - 0.5) * L;
    let a = s, h = 0;
    if (Math.abs(curl) > 1e-5) { a = Math.sin(curl * s) / curl; h = (1 - Math.cos(curl * s)) / curl; }
    h += wave * Math.sin(6.283 * (u * 0.9 - t * 0.7) + ph) * (0.35 + 0.65 * u);
    const r = roll * Math.sin(6.283 * (u * 0.6 + t * 0.5) + ph * 1.7), P0 = v3.add(v3.add(c, d, a), n, h);
    rows.push([v3.add(v3.add(P0, w, -W / 2), n, r), v3.add(v3.add(P0, w, W / 2), n, -r)]);
  }
  return rows;
}
// Point d'une feuille : v le long des rangées (0 à 1), k en travers (0 à 1), n décalage le long de la normale locale.
function paperPoint(rows, v, kk) {
  const f = Math.max(0, Math.min(rows.length - 1 - 1e-6, v * (rows.length - 1))), i = Math.floor(f), u = f - i;
  const a = v3.mix(rows[i][0], rows[i][1], kk), b = v3.mix(rows[i + 1][0], rows[i + 1][1], kk);
  return v3.mix(a, b, u);
}
function paperSvg(rows, o = {}) {
  const sp = rows.map(([l, r]) => [iso(l, P), iso(r, P)]);
  let out = "", text = "";
  for (let i = 0; i < rows.length - 1; i++) {
    const q = [sp[i][0], sp[i + 1][0], sp[i + 1][1], sp[i][1]], fr = Math.sign(quadArea(q)) === PAPER_REF;
    const nn = v3.cross(v3.sub(rows[i + 1][0], rows[i][0]), v3.sub(rows[i][1], rows[i][0])), nl = Math.hypot(...nn) || 1, k = (fr ? 1 : -1) * (nn[0] * PAPER_LW[0] + nn[1] * PAPER_LW[1] + nn[2] * PAPER_LW[2]) / nl;
    out += '<path class="' + (fr ? (k > 0.72 ? "fg-p0" : k > 0.4 ? "fg-p1" : "fg-p2") : "fg-pb") + '" d="M' + q.map(pPt).join("L") + 'Z"/>';
    if (!fr || o.blank) continue;
    const L0 = v3.mix(rows[i][0], rows[i + 1][0], 0.5), R0 = v3.mix(rows[i][1], rows[i + 1][1], 0.5), last = rows.length - 2;
    if (o.lines !== false && i >= 1 && i <= last - 1) { const len = [0.62, 0.48, 0.66, 0.4, 0.58, 0.5, 0.44, 0.6][(i - 1) % 8]; text += '<path class="fg-tx' + (o.done !== undefined && i - 1 < o.done ? " fg-dn" : "") + '" d="M' + pPt(iso(v3.mix(L0, R0, 0.14), P)) + "L" + pPt(iso(v3.mix(L0, R0, 0.14 + len), P)) + '"/>'; }
    if (o.head && i === 0) { const b0 = v3.mix(rows[i][0], rows[i][1], 0.34), b1 = v3.mix(rows[i + 1][0], rows[i + 1][1], 0.34); out += '<path class="fg-hd" d="M' + [rows[i][0], rows[i + 1][0], b1, b0].map((v) => pPt(iso(v, P))).join("L") + 'Z"/>'; }
  }
  // Enveloppe : rabat en V depuis les coins du haut, adresse en bas, bande de dépassement.
  if (o.flap) {
    const mid = Math.floor((rows.length - 1) * 0.55), tip = v3.mix(rows[mid][0], rows[mid][1], 0.5);
    text += '<path class="fg-fl" d="M' + [rows[0][0], tip, rows[0][1]].map((v) => pPt(iso(v, P))).join("L") + '"/>';
    if (o.band) for (const k of [0.74, 0.84]) { const i = Math.floor((rows.length - 1) * k); text += '<path class="fg-bd" d="M' + pPt(iso(v3.mix(rows[i][0], rows[i][1], 0.1), P)) + "L" + pPt(iso(v3.mix(rows[i][0], rows[i][1], 0.9), P)) + '"/>'; }
  }
  const outline = sp.map((r) => r[0]).concat(sp.map((r) => r[1]).reverse());
  return out + text + '<path class="fg-pl' + (o.lit ? " fg-lit" : "") + '" d="M' + outline.map(pPt).join("L") + 'Z"/>';
}
`;

// Page autonome en français, thème clair.
export function writeFigure(name, { title, plate, live, width = 680, css = "" }) {
  const page = k.pageHtml({ title, theme: "light", body: plate, script: kitScript() + live, width })
    .replace('<html lang="en">', '<html lang="fr">').replace("</head>", FIG_CSS + css + "</head>").replace(/<\/body>(?![\s\S]*<\/body>)/, '<script src="../js/figure-glow.js"></script></body>');
  writeFileSync(join(HERE, name + ".html"), page);
  console.log("wrote figures/" + name + ".html", (page.length / 1024).toFixed(0), "KB");
}

// Boucle commune : visibilité, mouvement réduit, glisser horizontal et clavier.
export const LOOP = `
const stage = document.querySelector(".iso-stage"), svg = stage.querySelector("svg");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const fr = (n, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
const say = (text) => { if (readout.textContent !== text) readout.textContent = text; };
// N'écrit dans le DOM que ce qui change : une pièce réécrite à l'identique s'allumerait à chaque image (figure-glow.js).
const attr = (el, name, v) => { v = String(v); if (el.getAttribute(name) !== v) el.setAttribute(name, v); };
const put = (el, v) => attr(el, "transform", v);
const html = (el, s) => { if (el.__h !== s) { el.__h = s; el.innerHTML = s; } };
let frame = 0, last = 0, visible = false;
function loop(step) {
  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now; step(dt, still.matches);
    frame = visible ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
  still.addEventListener("change", run);
  return run;
}
function dragX(onStart, onMove) {
  let drag = null;
  stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, v: onStart() }; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", (e) => { if (drag) onMove(drag.v, (e.clientX - drag.x) / svg.getBoundingClientRect().width); });
  const end = () => { drag = null; };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
}
`;

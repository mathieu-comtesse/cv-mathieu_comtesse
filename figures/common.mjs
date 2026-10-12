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
.fig-window{fill:var(--anatomy-paper)}
.fig-digits{font-family:var(--anatomy-mono);font-variant-numeric:tabular-nums;fill:var(--anatomy-hi);letter-spacing:.06em}
.fig-lamp{fill:var(--anatomy-lo);stroke:var(--anatomy-mid);stroke-width:.5}.fig-lamp[data-on="true"]{fill:var(--anatomy-lit)}
.iso-stage{touch-action:pan-y;cursor:ew-resize;outline:none}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
@media (max-width:560px){.iso-plate{padding-bottom:86px}.iso-plate-corner[data-corner="hint"]{bottom:34px}.iso-plate-corner[data-corner="readout"]{left:0;white-space:normal;text-align:right;line-height:1.4}}
</style>`;

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

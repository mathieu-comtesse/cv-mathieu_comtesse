// Outils de scène communs aux figures « large » (anneau, fusée) : registre de pièces triées par profondeur,
// boîtes, cylindres, pièces tournées d'axe quelconque, tubes en pièces, lampes, plaques et cadrans.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../.claude/skills/anatomy/kit/tube.mjs";
import { tools } from "./common.mjs";

export function scene(P) {
  const T = tools(P), { at, S, L, D } = T;
  const items = [];
  const put = (p3, svg, bias = 0) => { if (svg) items.push({ d: k.depthOf(p3, P) + bias, svg }); };
  const pth = (pts, closed = false) => k.pathOf(pts, closed);
  const rad = (d) => (d * Math.PI) / 180;
  const polar = (r, a, c = [0, 0]) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];

  // boîte alignée sur les axes ; o.reg === false : renvoie le balisage sans l'enregistrer
  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const bx = (x0, x1, y0, y1, z, h, o = {}) => {
    const svg = S(k.extrude(rect(x0, x1, y0, y1), z, h, P, { bevel: o.bevel ?? 0.4 }), { tone: o.tone || "mid", lit: o.lit, crease: o.crease, halo: o.halo });
    if (o.reg !== false) put([(x0 + x1) / 2, (y0 + y1) / 2, z + h / 2], svg, o.bias || 0);
    return svg;
  };
  const cy = (x, y, r, z, h, o = {}) => {
    const svg = S(k.cylinder(x, y, r, z, h, P, o.steps || (r > 8 ? 40 : 22), o.bevel || 0), { tone: o.tone || "mid", lit: o.lit, crease: o.crease });
    if (o.reg !== false) put([x, y, z + h / 2], svg, o.bias || 0);
    return svg;
  };
  // pièce de révolution : repère d'axe a (vecteur monde), profil [[s, r], ...]
  const frame = (o3, a) => G.frameAlong(o3, a);
  const turn = (o3, a, profile, o = {}) => {
    const F = G.frameAlong(o3, a);
    const svg = S(G.solidOf(profile, F, P), { tone: o.tone || "mid", lit: o.lit, crease: o.crease, inner: typeof o.inner === "function" ? o.inner(F) : o.inner });
    if (o.reg !== false) put(o.at3 || o3, svg, o.bias || 0);
    return svg;
  };
  const tube = (route, r, o = {}) => {
    const out = [];
    for (const piece of tubePieces(route, r, P, { maxLength: o.maxLength || 26, spacing: o.spacing || 2, closed: !!o.closed, caps: o.caps ?? true, rings: o.rings || null, gaps: o.gaps || [], breaks: o.breaks || [] })) {
      const svg = tubeSvg(piece, { tone: o.tone || "mid" });
      if (o.reg !== false) put(piece.mid, svg, o.bias || 0);
      out.push(svg);
    }
    return out.join("");
  };
  const lamp = (name, x, y, z, r = 1.3) => { const [px, py] = at([x, y, z]); return `<circle class="fig-lamp" data-part="${name}" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r}"/>`; };
  const dark = (d) => `<path class="iso-fill fig-dark" d="${d}"/>`;
  // lignes et points rattachés à une pièce (pas de registre : on les concatène au balisage de la pièce)
  const ln3 = (...pts) => pth(pts.map((p) => at(p)));
  const flat = (pts, z) => pth(pts.map(([x, y]) => at([x, y, z])), true);
  const flush = () => items.sort((a, b) => a.d - b.d).map((i) => i.svg).join("");
  return { T, at, S, L, D, put, bx, cy, turn, tube, lamp, dark, ln3, flat, flush, pth, rad, polar, rect, frame, k, G, items };
}

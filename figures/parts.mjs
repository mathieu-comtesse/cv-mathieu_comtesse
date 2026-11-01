// Pièces détaillées réutilisables (niveau de finition de la compétence anatomy) : montants tournés, piliers à nervures, poutres en I.
// Chaque fonction prend le contexte de la figure { k, G, P, S, L, D, at } et renvoie du SVG à peindre dans l'ordre.
import * as kit from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as lathe from "../.claude/skills/anatomy/kit/lathe.mjs";

// Montant tourné : socle à quatre vis et gousset, congé lisse, fût cannelé entre deux bagues, collerettes boulonnées, chapiteau.
export function column(ctx, { x, y, z0, z1, r = 3.2, base = true, flutes = 10, collars = [0.34, 0.68], cap = true, tone = "mid" }) {
  const { k, G, P, S, L, D, at } = ctx, out = [], F = G.frameAlong([x, y, z0], [0, 0, 1]), H = z1 - z0;
  const lo = base ? 2.6 : 0;
  if (base) {
    const plate = { x: x - r - 4.2, y: y - r - 4.2, w: 2 * r + 8.4, d: 2 * r + 8.4, r: 1.2 };
    out.push(S(k.slabOf(plate, z0, 2.6, P, 3, 0.5), { tone: "lo" }));
    out.push(D(k.corners(plate, 1.9).map(([bx, by]) => at([bx, by, z0 + 2.6])), { size: 0.42 }));
    out.push(L(k.ring(x, y, r + 2.2, z0 + 2.6, P, 24), { tone: "faint" }));
    // Quatre goussets triangulaires qui montent du socle vers le fût.
    const gh = Math.min(9, H * 0.14), gl = 4.4;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const along = dx !== 0 ? G.frameOf([x + dx * r, y + 0.65, z0 + 2.6], [0, -1, 0], [dx, 0, 0], [0, 0, 1]) : G.frameOf([x - 0.65, y + dy * r, z0 + 2.6], [1, 0, 0], [0, dy, 0], [0, 0, 1]);
      out.push(S(G.prismOf(along, [[0, 0], [gl, 0], [0, gh]], 0, 1.3, P), { tone: "mid" }));
    }
  }
  const s0 = lo, s1 = H - (cap ? 3.4 : 0);
  // Fût : congé lisse en pied et en tête.
  const prof = [[s0 - 0.01, r * 1.35, 1], [s0 + 1.1, r * 1.12, 1], [s0 + 2.6, r, 1], [s1 - 2.6, r, 1], [s1 - 1.1, r * 1.12, 1], [s1, r * 1.35, 1]];
  out.push(S(G.lathe(prof, F, P), { tone }));
  // Cannelures entre les collerettes, qui finissent sur leurs bords.
  const cuts = [s0 + 2.6, ...collars.map((c) => s0 + 2.6 + c * (s1 - s0 - 5.2)), s1 - 2.6];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i] + (i ? 1.4 : 0), b = cuts[i + 1] - (i < cuts.length - 2 ? 1.4 : 0);
    if (b - a > 4) out.push(L(G.ribsOf(F, a, b, r, flutes, P, { seams: true }), { tone: "faint" }));
  }
  // Collerettes : disque, anneau de filetage, quatre vis.
  for (const c of collars) {
    const s = s0 + 2.6 + c * (s1 - s0 - 5.2);
    out.push(S(G.disc(s - 1.4, s + 1.4, r + 1.3, F, P), { tone: "lo" }));
    out.push(S(G.disc(s + 1.4, s + 2.4, r + 0.6, F, P), { tone: "mid" }));
    out.push(D(G.dotsOf(F, s + 1.4, r + 0.8, 5, P, { phase: 0.4, all: true }), { size: 0.32 }));
    out.push(L(G.circleOf(F, s - 1.4, r + 1.3, P), { tone: "faint" }));
  }
  if (cap) {
    out.push(S(G.disc(s1, s1 + 1.6, r + 1.8, F, P), { tone: "lo" }));
    out.push(S(G.disc(s1 + 1.6, s1 + 3.4, r + 0.8, F, P), { tone: "hi" }));
    out.push(D(G.dotsOf(F, s1 + 1.6, r + 1.1, 6, P, { all: true }), { size: 0.3 }));
    out.push(L(G.circleOf(F, s1 + 3.4, r - 0.4, P), { tone: "faint" }));
  }
  return out.join("");
}

// Poutre en I vue de côté : semelles, âme avec raidisseurs, rivets, joint boulonné, repère gravé.
export function ibeam(ctx, { x0, x1, y, z, h = 7, d = 8, tone = "mid" }) {
  const { k, S, L, D, at } = ctx, out = [], w = x1 - x0, flange = Math.max(1.6, h * 0.22);
  out.push(S(k.slabOf({ x: x0, y, w, d, r: 1 }, z, flange, ctx.P, 3, 0.4), { tone }));                      // semelle basse
  out.push(S(k.slabOf({ x: x0, y: y + d * 0.28, w, d: d * 0.44, r: 0.3 }, z + flange, h - 2 * flange, ctx.P, 2, 0.15), { tone: "lo" }));   // âme
  out.push(S(k.slabOf({ x: x0, y, w, d, r: 1 }, z + h - flange, flange, ctx.P, 3, 0.4), { tone }));          // semelle haute
  const yf = y + d, rows = [];
  for (let x = x0 + 6; x < x0 + w - 4; x += 8) rows.push(at([x, yf, z + flange * 0.5]), at([x, yf, z + h - flange * 0.5]));
  out.push(D(rows, { size: 0.3 }));
  // Raidisseurs : lames verticales sur l'âme tous les 24, deux boulons chacune.
  for (let x = x0 + 12; x < x0 + w - 8; x += 24) {
    out.push(S(k.slabOf({ x: x - 0.7, y: y + d * 0.72, w: 1.4, d: d * 0.28 + 0.4, r: 0.15 }, z + flange, h - 2 * flange, ctx.P, 2, 0.1), { tone: "mid" }));
    out.push(D([at([x - 2.6, y + d * 0.72, z + h * 0.5]), at([x + 2.6, y + d * 0.72, z + h * 0.5])], { size: 0.28 }));
  }
  return out.join("");
}

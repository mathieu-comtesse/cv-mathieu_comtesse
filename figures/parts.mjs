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

// ---- Supports spécifiques : chaque machine a le sien, selon ce qu'il porte. ----

// Montant en U (profilé de bâti) : ouverture vers l'avant, trous oblongs dans l'âme, pied boulonné, goussets.
export function channelPost(ctx, { x, y, z0, z1, w = 5, d = 6, holes = true, tone = "mid" }) {
  const { k, P, S, L, D, at } = ctx, out = [], H = z1 - z0, t = Math.max(1, w * 0.22);
  const plate = { x: x - w / 2 - 2.4, y: y - d / 2 - 2.4, w: w + 4.8, d: d + 4.8, r: 0.8 };
  out.push(S(k.slabOf(plate, z0, 2, P, 3, 0.4), { tone: "lo" }));
  out.push(D(k.corners(plate, 1.3).map(([bx, by]) => at([bx, by, z0 + 2])), { size: 0.36 }));
  out.push(S(k.slabOf({ x: x - w / 2, y: y - d / 2, w, d, r: 0.5 }, z0 + 2, H - 2, P, 3, 0.3), { tone, inner: L(k.sideSeam({ x: x - w / 2, y: y - d / 2, w, d, r: 0.5 }, z0 + H * 0.5, P, 3), { tone: "faint" }) }));
  // Ailes en retrait vers l'avant : le U se lit par deux lames et l'âme sombre entre elles.
  out.push(S(k.slabOf({ x: x - w / 2, y: y + d / 2 - 0.2, w: t, d: 1.2, r: 0.1 }, z0 + 2, H - 2, P, 2, 0.1), { tone: "hi" }));
  out.push(S(k.slabOf({ x: x + w / 2 - t, y: y + d / 2 - 0.2, w: t, d: 1.2, r: 0.1 }, z0 + 2, H - 2, P, 2, 0.1), { tone: "hi" }));
  if (holes) {
    const f = k.sideMatrix([0, y + d / 2 + 1.0], 0, P, "left"), hs = [];
    for (let z = z0 + 8; z < z1 - 4; z += 7) hs.push(k.pathOf(k.roundedPlan({ x: x - 1.2, y: z - 1.6, w: 2.4, d: 3.2, r: 1.2 }, 4).map(([u, v]) => [u, -v]), true));
    out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${hs.join("")}"/></g>`);
  }
  return out.join("");
}

// Portique sur galets : jambe en U posée sur un boggie (deux galets et leur caisse d'essieu) qui roule sur un rail.
export function bogie(ctx, { x, y, z, len = 12, wheel = 2.6 }) {
  const { k, G, P, S, L, D, at } = ctx, out = [];
  out.push(S(k.slabOf({ x: x - len / 2, y: y - 3.6, w: len, d: 7.2, r: 1 }, z + wheel - 0.6, 3.4, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam({ x: x - len / 2, y: y - 3.6, w: len, d: 7.2, r: 1 }, z + wheel + 1, P, 3), { tone: "faint" }) }));
  for (const sx of [-len * 0.32, len * 0.32]) for (const sy of [-1, 1]) {
    const F = G.frameAlong([x + sx, y + sy * 3.9, z + wheel], [0, sy, 0]);
    out.push(S(G.disc(0, 1.2, wheel, F, P), { tone: "lo", inner: k.fadedSvg(G.ribsOf(F, 0, 1.2, wheel, 18, P, { fade: [0.1, 0.55] }), { tone: "faint" }) }));
    out.push(S(G.disc(1.2, 1.8, wheel * 0.42, F, P), { tone: "hi" }));
  }
  out.push(D(k.corners({ x: x - len / 2, y: y - 3.6, w: len, d: 7.2 }, 1.1).map(([bx, by]) => at([bx, by, z + wheel + 2.8])), { size: 0.3 }));
  return out.join("");
}

// Chevalet de bois : deux montants carrés à chanfrein, traverse haute à tenons, jambe arrière inclinée, chevilles.
export function easelPost(ctx, { x, y, z0, z1, s = 5, rear = 20, tone = "mid" }) {
  const { k, G, P, S, L, D, at } = ctx, out = [], H = z1 - z0;
  // Jambe arrière : prisme incliné vers l'arrière, vu de côté (plan y-z), posée au sol derrière le montant.
  const F = G.frameOf([x - 1.2, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.prismOf(F, [[y - s / 2 + 0.2, z0 + H * 0.58], [y - rear - s * 0.4, z0 + 1], [y - rear + s * 0.4, z0 + 1], [y + s / 2 - 0.2, z0 + H * 0.58 + 6]], 0, 2.4, P), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x - s / 2, y: y - s / 2, w: s, d: s, r: 0.5 }, z0, H, P, 3, 0.7), { tone, inner: L(k.sideSeam({ x: x - s / 2, y: y - s / 2, w: s, d: s, r: 0.5 }, z0 + H * 0.5, P, 3), { tone: "faint" }) }));
  // Pied ferré, cheville de bois à mi-hauteur, chapeau.
  out.push(S(k.slabOf({ x: x - s / 2 - 0.8, y: y - s / 2 - 0.8, w: s + 1.6, d: s + 1.6, r: 0.6 }, z0, 2, P, 3, 0.3), { tone: "lo" }));
  out.push(D(k.corners({ x: x - s / 2 - 0.8, y: y - s / 2 - 0.8, w: s + 1.6, d: s + 1.6 }, 1).map(([bx, by]) => at([bx, by, z0 + 2])), { size: 0.3 }));
  out.push(S(k.cylinder(x, y + s / 2, 0.8, z0 + H * 0.5, 0.9, P, 10), { tone: "hi" }));
  return out.join("");
}

// Chevalet en A (support de gouttière) : deux jambes inclinées, entretoise, sabot et boulon d'assemblage au sommet.
export function aframe(ctx, { x, y, z0, z1, span = 18, t = 3.2, depth = 5, tone = "mid" }) {
  const { k, G, P, S, L, D, at } = ctx, out = [], F = G.frameOf([0, y + depth / 2, 0], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
  const leg = (sx) => [[x + sx * span / 2 - t / 2, z0], [x + sx * span / 2 + t / 2, z0], [x + t / 2 * sx + sx * 0.0 + (sx > 0 ? -0.2 : 0.2), z1], [x - t / 2 * sx + (sx > 0 ? -0.2 : 0.2), z1]];
  for (const sx of [-1, 1]) {
    const poly = sx < 0 ? [[x - span / 2 - t / 2, z0], [x - span / 2 + t / 2, z0], [x + t / 2, z1], [x - t / 2, z1]] : [[x + span / 2 - t / 2, z0], [x + span / 2 + t / 2, z0], [x + t / 2, z1], [x - t / 2, z1]];
    out.push(S(G.prismOf(F, poly.map(([u, v]) => [u, v]), 0, depth, P), { tone }));
  }
  void leg;
  const zb = z0 + (z1 - z0) * 0.32, hw = span / 2 * (1 - 0.32) + t * 0.4;
  out.push(S(k.slabOf({ x: x - hw, y: y - depth / 2 + 0.6, w: 2 * hw, d: depth - 1.2, r: 0.3 }, zb, 1.8, P, 2, 0.15), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x - span / 2 - t, y: y - depth / 2 - 0.8, w: 2 * t + 0, d: depth + 1.6, r: 0.5 }, z0, 1.6, P, 2, 0.2), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x + span / 2 - t, y: y - depth / 2 - 0.8, w: 2 * t + 0, d: depth + 1.6, r: 0.5 }, z0, 1.6, P, 2, 0.2), { tone: "lo" }));
  out.push(S(k.cylinder(x, y + depth / 2 + 0.3, 1, z1 - 2.4, 0.9, P, 10), { tone: "hi" }));
  return out.join("");
}

// Flasque de bâti de bobine : plaque coulée avec alésages d'allègement, bossage de palier et poignée de manutention.
export function sidePlate(ctx, { x, y0, y1, z0, z1, axisZ, tone = "mid", thick = 4 }) {
  const { k, G, P, S, L, D, at } = ctx, out = [], yc = (y0 + y1) / 2;
  const plan = { x, y: y0, w: thick, d: y1 - y0, r: 1.2 };
  out.push(S(k.slabOf(plan, z0, z1 - z0, P, 3, 0.6), { tone, inner: L(k.sideSeam(plan, (z0 + z1) / 2, P, 3), { tone: "faint" }) }));
  const f = k.sideMatrix([x + thick, 0], 0, P, "right"), hs = [];
  for (const [yy, zz, r] of [[yc, z0 + 14, 3.2], [yc, z1 - 12, 3.2], [yc - 6, (z0 + z1) / 2 + 8, 2], [yc + 6, (z0 + z1) / 2 - 8, 2]]) hs.push(`<circle class="iso-line" data-tone="lo" cx="${-yy}" cy="${-zz}" r="${r}" fill="none"/>`);
  out.push(`<g transform="${f}">${hs.join("")}</g>`);
  out.push(D(k.corners(plan, 1.6).map(([bx, by]) => at([bx + thick * 0.5, by, z1])), { size: 0.34 }));
  const B = G.frameAlong([x + thick, yc, axisZ], [1, 0, 0]);
  out.push(S(G.disc(0, 1.8, 6.2, B, P), { tone: "lo", inner: k.fadedSvg(G.ribsOf(B, 0, 1.8, 6.2, 24, P, { fade: [0.1, 0.55] }), { tone: "faint" }) }));
  out.push(D(G.dotsOf(B, 1.8, 5, 6, P, { phase: 0.5, all: true }), { size: 0.3 }));
  return out.join("");
}

/* Mise en évidence des nœuds du graphe, dans le tableau plat de nœuds (16 flottants par nœud, voir frame.js). */
import { a as KIND, c as FLAG_B, d as FLAG_C } from './frame.js';
export const HALO_RADIUS = 6, RING_WIDTH = 4, LABEL_SPAN = 4, GROW = 1.5;
export const isRound = (kind) => kind === KIND.circle || kind === KIND.ring;
/** Fait tendre un disque ou un anneau vers un anneau de rayon `radius`, à hauteur de `amount`. */
export function toRing(nodes, at, amount, radius = HALO_RADIUS) {
  if (amount <= 0 || !isRound(nodes[at + 3])) return;
  const size = nodes[at + 2];
  nodes[at + 2] = size + (radius - size) * amount;
  nodes[at + 3] = KIND.ring;
}
/** Éclaire un nœud : grossit (sauf image), glisse vers la couleur, signale les images. */
export function lightUp(nodes, at, amount, color, flag, boost = amount) {
  const image = nodes[at + 3] === KIND.image;
  if (!image) nodes[at + 2] += GROW * boost;
  for (let k = 0; k < 3; k++) nodes[at + 4 + k] += (color[k] - nodes[at + 4 + k]) * amount;
  nodes[at + FLAG_B] = image ? flag : 0;
  nodes[at + FLAG_C] = image ? amount : 0;
}
/** Applique une couleur de trait (début et fin) et un facteur d'opacité. */
export function tint(nodes, at, color, opacity = 1) {
  for (let k = 0; k < 3; k++) nodes[at + 8 + k] = nodes[at + 12 + k] = color[k];
  nodes[at + 11] *= opacity; nodes[at + 15] *= opacity;
}
export { HALO_RADIUS as H, RING_WIDTH as R, LABEL_SPAN as S, isRound as a, tint as b, lightUp as h, toRing as r };

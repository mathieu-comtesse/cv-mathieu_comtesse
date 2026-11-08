/* Format des nœuds du graphe : un tableau plat, 16 flottants par nœud (position, taille, type, couleurs, marques). */
export const STRIDE = 16;
export const KIND = { circle: 0, square: 1, ring: 2, image: 3 };
export const SLOT_FLAG_A = 12, SLOT_FLAG_B = 13, SLOT_FLAG_C = 14, SLOT_FLAG_D = 15;
export const MARK_BOOST = 1.5, MAX_LAYERS = 20, DEFAULT_HALO = 6;
/** Remplace les images par des disques de taille bornée (rendu sans textures). */
export function flattenImages(graph, maxSize) {
  for (let i = 0; i < graph.nodeCount; i++) {
    const at = i * STRIDE;
    if (graph.nodes[at + 3] !== KIND.image) continue;
    graph.nodes[at + 3] = KIND.circle;
    graph.nodes[at + 2] = Math.min(graph.nodes[at + 2], maxSize);
    graph.nodes[at + SLOT_FLAG_A] = -1;
  }
}
/** Part de fondu propre aux repères : 0 tant que le repère n'est pas plus visible que le nœud. */
export function markShare(state) {
  const fade = state.fade ?? 1, mark = Math.min(1, state.markFade ?? fade);
  return fade < 1 && mark > fade ? (mark - fade) / (1 - fade) : 0;
}
export { MAX_LAYERS as E, STRIDE as N, KIND as a, SLOT_FLAG_A as b, SLOT_FLAG_B as c, SLOT_FLAG_C as d, DEFAULT_HALO as e, MARK_BOOST as f, SLOT_FLAG_D as g, flattenImages as h, markShare as m };

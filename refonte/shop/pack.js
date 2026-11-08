/* Constellation du héros : réglages de la simulation, flux de paquets le long des liens, indexation du graphe et permutation de couleurs. */
export const physics = {
  seed: 15, trunkReach: .4, tertiaryRadiusJitter: 1, ringAspectX: 1.2, linkLength: 100,
  magnetOn: true, magnet: 1, magnetRadius: 15, magnetSections: 1,
  repel: 6e4, repelRange: 240, rootRepel: 3, linkStiffness: .5, linkDamp: 1, velDamp: 2.5, restitution: .6, maxSpeed: 1400,
  margin: 0, collidePad: 3, wallSoft: 20, wallSoftForce: 1, sectionSpace: 180, sectionRepel: 1.2, warmup: 160, warmBudget: 8, responsive: true,
  orbitOn: true, orbitSpeed: .02, orbitGain: .5, orbitFollow: 1, orbitAlternate: true,
  constrictOn: true, constrict: .25, hoverConstrict: .25, hoverStagger: .15, hoverResponse: 15, hoverSlow: .2,
  grabPull: 38, grabResponse: 30, releaseRelaxation: 3, releaseDamping: 14, grabSturdiness: .05, throwOn: true, throwScale: 1.25, dragStiffenBy: 1, dragDampenBy: .75,
  centerFill: 0, homeStrength: 1, openingBoost: 0, settleTime: 1.5,
  repelOn: true, cursorRepel: 2, repelRadius: 265, repelSections: .6, repelInner: 24, repelCarry: 1.45, repelShield: 1, repelGate: 24, repelMaxSpeed: 1800, repelFade: .04,
  driftOn: false, drift: 173, driftScale: 1.2, driftSpeed: .1, driftGain: 1, driftLeaf: .88,
  rootRadius: 4, sectionRadius: 4, updateRadius: 2, featuredRadius: 4, imageRadius: 8
};
export const flowDefaults = { flowOn: true, flowSpeed: 1.5, flowTrail: 1 };
export const PACKETS_PER_EDGE = 2, FIRST_LEVEL = 3, SECOND_LEVEL = 2;

/** Empreinte 32 bits d'une chaîne (FNV-1a). */
export function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
const speedOf = (seed) => .1 + (seed % 7) * .015;
/** Phase (0..1) d'un paquet à l'instant t ; la direction dépend de la parité de la graine. */
export function packetPhase(seed, t, speed = 1) {
  const phase = (((t * speedOf(seed) * speed + ((seed >>> 8) % 1000) / 1000) % 1) + 1) % 1;
  return seed % 2 ? phase : 1 - phase;
}
/** Flux de paquets : un petit nombre de points qui parcourent chaque lien. */
export class PacketFlow {
  packets = []; settings = { ...flowDefaults }; count; #seeds;
  constructor(edgeNames, perEdge = PACKETS_PER_EDGE) {
    this.count = perEdge; this.#seeds = new Uint32Array(edgeNames.length * perEdge);
    for (const [e, name] of edgeNames.entries()) for (let k = 0; k < perEdge; k++) this.#seeds[e * perEdge + k] = hashText(`${name}:dot:${k}`);
  }
  step(t) {
    this.packets.length = 0;
    if (!this.settings.flowOn) return this.packets;
    const { flowSpeed, flowTrail } = this.settings;
    for (let i = 0; i < this.#seeds.length; i++) {
      const seed = this.#seeds[i], head = packetPhase(seed, t, flowSpeed), tail = packetPhase(seed, t - flowTrail, flowSpeed);
      if (Math.abs(head - tail) > .5) continue;                      // le paquet vient de passer d'un bout à l'autre du lien
      this.packets.push({ edge: Math.floor(i / this.count), head, tail });
    }
    return this.packets;
  }
}

function radiusOf(node, p) {
  if (node.shape === 'ring') return p.rootRadius;
  if (node.role === 'section') return p.sectionRadius;
  if (node.prominence === 'featured') return p.featuredRadius;
  return node.shape === 'image' ? p.imageRadius : p.updateRadius;
}
export function fillRadii(out, graph, p) {
  for (const [i, node] of graph.nodes.entries()) out[i] = Math.max(0, radiusOf(node, p));
  out[graph.nodes.length] = Math.max(0, p.rootRadius);
}
function hashSigned(id, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
}
export function fillSamples(out, graph, seed) { for (const [i, { id }] of graph.nodes.entries()) out[i] = hashSigned(id, seed); }

/** Index du graphe : sections (pivots), parent de chaque nœud, enfants, rayons et échantillons stables. */
export function buildGraphIndex(graph, p) {
  const n = graph.nodes.length, sectionOf = new Int32Array(n).fill(-1), ordinal = new Int32Array(n).fill(-1);
  const children = Array.from({ length: n + 1 }, () => []);
  const indexOfId = new Map(graph.nodes.map((node, i) => [node.id, i])), hubIds = new Set(graph.hubIds ?? []);
  const isHub = (node) => hubIds.has(node.id) || (node.role === 'section' && !node.primarySectionId);
  const sections = graph.nodes.map((node, index) => ({ node, index })).filter(({ node }) => isHub(node)).sort((a, b) => a.node.id.localeCompare(b.node.id)).map(({ index }) => index);
  children[n] = sections.toSorted((a, b) => a - b);
  for (const [k, index] of sections.entries()) ordinal[index] = k;
  for (const [i, node] of graph.nodes.entries()) {
    if (isHub(node)) continue;
    const parent = indexOfId.get(node.primarySectionId ?? ''), parentNode = parent === undefined ? undefined : graph.nodes[parent];
    if (parent === undefined || parent === i || !parentNode || (parentNode.role !== 'section' && !hubIds.has(parentNode.id))) throw new Error(`Graph update ${node.id} is missing a primary section`);
    sectionOf[i] = parent; children[parent]?.push(i);
  }
  const radius = new Float32Array(n + 1); fillRadii(radius, graph, p);
  const samples = new Float32Array(n); fillSamples(samples, graph, p.seed);
  return { count: n, rootIndex: n, sections, sectionOf, sectionOrdinal: ordinal, children, samples, radius, maxRadius: Math.max(...radius) };
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/** Permutation qui disperse les rangs : multiplie chaque rang par un entier premier avec la taille. */
export function spreadRanks(values) {
  const n = values.length;
  let step = Math.max(1, Math.floor(n / 2));
  while (step > 1 && gcd(step, n) !== 1) step--;
  const sorted = values.toSorted((a, b) => a - b);
  return values.map((v) => (sorted.indexOf(v) * step) % n);
}
export { flowDefaults as F, PacketFlow as H, physics as M, FIRST_LEVEL as P, SECOND_LEVEL as V, PACKETS_PER_EDGE as a, hashText as b, fillRadii as c, fillSamples as d, packetPhase as f, buildGraphIndex as p, spreadRanks as r };

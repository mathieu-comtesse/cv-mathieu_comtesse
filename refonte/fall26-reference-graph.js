import { REFERENCE_BRANCHES, REFERENCE_PAIRS, REFERENCE_GRAPH_TOPOLOGY, REFERENCE_ORBIT_ORDER } from './fall26-reference-topology.js?v=fall26-graph-motion';
import { ReferenceMotion } from './fall26-reference-motion.js?v=fall26-graph-motion';

/**
 * Foyers relevés sur Shopify Fall '26 à 1470 × 802, dans le graphe
 * encadré par x=423–1460 et y=60–792. Les foyers bougent au survol.
 * Les rayons et les étiquettes restent calibrés séparément.
 */
export const REFERENCE_HUBS = Object.freeze([
  {x:0.4455,y:0.0751,r:1.03,points:16,tone:'blue'}, // Agentic
  {x:0.6066,y:0.7049,r:.91,points:12,tone:'blue'}, // Sidekick
  {x:0.9421,y:0.4822,r:.88,points:9,tone:'blue'}, // Merchandising
  {x:0.1360,y:0.7158,r:1.04,points:20,tone:'mint'}, // Retail
  {x:0.6567,y:0.1899,r:1.02,points:30,tone:'blue'}, // Payments
  {x:0.5159,y:0.9167,r:.91,points:23,tone:'cyan'}, // Operations
  {x:0.1331,y:0.3101,r:1.09,points:17,tone:'blue'}, // Online
  {x:0.8361,y:0.6995,r:.80,points:9,tone:'blue'}, // Marketing
  {x:0.2613,y:0.5096,r:1.07,points:19,tone:'blue'}, // Fulfillment
  {x:0.7184,y:0.4153,r:1.09,points:57,tone:'mint'}, // Developer
  {x:0.3790,y:0.3019,r:.72,points:10,tone:'blue'}, // Shop
]);
// Map the actual chapter IDs to the locations of the original reference hubs.
// The site's editorial chapter order differs from the reference diagram order.
export const REFERENCE_CHAPTER_IDS=Object.freeze([
  'agentic','sidekick','merchandising','retail','payments','operations',
  'online','marketing','fulfillment','developer','shop'
]);
export const REFERENCE_SHORT_LABELS=Object.freeze({
  agentic:'Prévention',sidekick:'Maintenance',merchandising:'IA appliquée',
  retail:'Référentiels',payments:'Méthodes',operations:'Savoir-être',
  online:'Data',marketing:'Parcours',fulfillment:'Mondes & jeux',
  developer:'Blog & études',shop:'Projets pro'
});
function referenceIndex(hub,fallback){
  const key=typeof hub?.id==='string'&&hub.id.startsWith('accueil:')?hub.id.slice(8):'';
  const index=REFERENCE_CHAPTER_IDS.indexOf(key);
  return index<0?fallback:index;
}
const REFERENCE_RADIUS = Math.min(1037 * .12, 732 * .17);
export const REFERENCE_CARD_SLOTS = Object.freeze(REFERENCE_CHAPTER_IDS.map(
  id => REFERENCE_BRANCHES[id].filter(([, , image]) => image).length
));

const { associations, updateSlots, conceptsByType } = REFERENCE_GRAPH_TOPOLOGY;
const firstConcept = REFERENCE_CHAPTER_IDS.length + updateSlots.length;
const slotKey = (chapter, index) => chapter + ':' + index;
const productSlots = associations.map(ids => ids.filter(
  id => id >= firstConcept && id < firstConcept + conceptsByType.product
));
const groupBySlot = new Map(updateSlots.map(([chapter, index], global) => [slotKey(chapter, index), global]));

export function relatedReferenceUpdates(chapter, index) {
  const own = groupBySlot.get(slotKey(chapter, index));
  if (own === undefined) return [];
  const products = new Set(productSlots[own]);
  return productSlots.flatMap((ids, other) => {
    if (own === other) return [];
    const matches = ids.filter(id => products.has(id)).length;
    return matches ? [{ slot: updateSlots[other], matches }] : [];
  });
}

function editorialSample(nodes, count) {
  const selected = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * nodes.length / count);
    const end = Math.floor((i + 1) * nodes.length / count);
    const segment = nodes.slice(start, end);
    selected.push(segment.find(node => node.ed.image) ?? segment[0]);
  }
  return selected;
}

export function calibrateReferenceBranches(ciel) {
  const hubs = [...ciel.etoiles.values()].filter(e => e.parent === 'accueil').sort((a,b) => a.rang-b.rang);
  const lookup = new Map();
  hubs.forEach((hub, index) => {
    const reference = referenceIndex(hub, index);
    const chapter = REFERENCE_CHAPTER_IDS[reference];
    const rows = REFERENCE_BRANCHES[chapter];
    if (!rows) return;

    hub.sol = false;
    hub.referenceFlat = true;
    hub.referenceOrbitOrder = REFERENCE_ORBIT_ORDER[chapter];
    hub.flatTone = REFERENCE_HUBS[reference].tone;
    hub.referenceShortLabel = REFERENCE_SHORT_LABELS[chapter] || hub.label;
    const editorial = hub.noeuds.filter(node => node.ed);
    hub.referenceEditorialCount = editorial.length;
    const cards = editorialSample(editorial, Math.min(editorial.length, REFERENCE_CARD_SLOTS[reference]));
    const dots = hub.noeuds.filter(node => !node.ed);
    const radius = REFERENCE_RADIUS * REFERENCE_HUBS[reference].r;
    hub.noeuds = rows.map(([dx, dy, isImage], slot) => {
      const card = isImage ? cards.shift() : null;
      const angle = Math.atan2(dy, dx);
      const template = card ?? dots[slot % dots.length] ?? editorial[0];
      const node = {
        ...template, ed: card?.ed ?? null, a: angle < 0 ? angle + 2 * Math.PI : angle, r: Math.hypot(dx, dy) / radius,
        phase: template?.phase ?? 0, ox: 0, oy: 0, vis: false, gg: 0, cl: 0,
        dh: 0, cv: 0, ar: 0, par: null, enf: [], pul: false, niveau: card ? 0 : 1, taille: 2,
        referenceSlot: [chapter, slot], referenceCos: Math.cos(angle), referenceSin: Math.sin(angle),
      };
      lookup.set(slotKey(chapter, slot), { hub, node });
      return node;
    });
  });
  ciel.referenceNodes = lookup;
  ciel.referenceHubs = hubs;
  ciel.referenceMotion = new ReferenceMotion();
  ciel.referenceHoveredLeaf = null;
  ciel.referencePairs = REFERENCE_PAIRS.flatMap(pair => {
    const [a, b] = pair.map(([chapter, slot]) => lookup.get(slotKey(chapter, slot)));
    return a && b ? [[a, b]] : [];
  });
  ciel.referenceFocus = null;
  ciel.referenceHoverEdges = new Map();
  return hubs.length;
}
/**
 * Plateau bleu nuit sous le graphe de l'accueil en exposition.
 * Projette une seule surface quadrangulaire au sol, sans maillage
 * supplémentaire et sans interaction avec les modèles métiers.
 */
/**
 * Place les onze foyers selon la géométrie relevée sur la référence.
 * La méthode Ciel.place du parent répartit les enfants en spirale :
 * cette étape explicite doit donc être appliquée APRES le placement parent
 * à chaque resize, scroll et transition entre les deux modes.
 *
 * width / height sont les dimensions du graphe et non celles de la fenêtre.
 * left / top / lift correspondent à sa translation dans la scène courante.
 */
export function placeReferenceHubs(ciel,width,height,{left=0,top=0,lift=0,expo=0,spread=1}={}){
  if(!ciel?.etoiles||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 0;
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
  const transition=Math.min(1,Math.max(0,Number.isFinite(expo)?expo:0));
  const radius=Math.max(22,Math.min(210,width*.12,height*.17))*(1-.18*transition);
  // Frame-calibrated rays: ~120px base radius at a 1000px panel, before per-star scale.\n  // Opening of the flat hero constellation as the visitor scrolls toward chapter 1.
  // Keep the calibrated positions exact at spread=1, including in Expo.
  const opening=Number.isFinite(spread)?Math.min(1.6,Math.max(.7,spread)):1;
  for(let i=0;i<hubs.length;i++){
    const e=hubs[i],ref=REFERENCE_HUBS[referenceIndex(e,i)];
    if(!ref)continue;
    const centre=[left+(opening===1?ref.x:0.5+(ref.x-0.5)*opening)*width,top+(opening===1?ref.y:0.5+(ref.y-0.5)*opening)*height,lift];
    ciel.place(e.id,centre,radius*ref.r);
  }
  return Math.min(hubs.length,REFERENCE_HUBS.length);
}

export function drawReferenceStage(ctx,ciel,project,alpha=1){
  if(!ctx||!ciel||typeof project!=='function'||alpha<=.005)return;
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil'&&e.centre);
  if(hubs.length<3)return;
  const xs=hubs.map(e=>e.centre[0]),ys=hubs.map(e=>e.centre[1]);
  const x0=Math.min(...xs)-32,x1=Math.max(...xs)+72;
  const y0=Math.min(...ys)-70,y1=Math.max(...ys)+105;
  const pts=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>project(x,y,0));
  if(pts.some(p=>!p||!Number.isFinite(p.x+p.y)))return;
  ctx.save();ctx.globalAlpha*=Math.min(1,alpha);
  ctx.beginPath();for(let i=0;i<pts.length;i++){
    const p=pts[i];if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
  }
  ctx.closePath();
  ctx.fillStyle='rgba(0,8,62,.36)';ctx.fill();
  ctx.lineWidth=.65;ctx.strokeStyle='rgba(160,198,255,.14)';ctx.stroke();
  ctx.restore();
}
/* Use the leaf coordinates from the current frame, including drag offsets. */
export function drawReferenceLinks(ctx, ciel, alpha = 1, dt = 1/60, reduced = false) {
  if (!ctx || !ciel.referencePairs || alpha <= .003) return;
  const visible = ({hub,node}) => hub.ecran && node.vis && node.cl !== 3;
  const focus = (ciel.pris ?? ciel.survol)?.noeud;
  const active = focus?.referenceSlot ? focus : null;
  const animated = ciel.referenceHoverEdges;
  if (active !== ciel.referenceFocus) {
    ciel.referenceFocus = active;
    for (const edge of animated.values()) edge.target = 0;
    if (active) {
      const candidates = relatedReferenceUpdates(...active.referenceSlot)
        .map(({slot,matches}) => ({ end: ciel.referenceNodes.get(slotKey(...slot)), matches }))
        .filter(({end}) => end && visible(end))
        .sort((a,b) => b.matches-a.matches ||
          Math.hypot(a.end.node.x1-active.x1,a.end.node.y1-active.y1) -
          Math.hypot(b.end.node.x1-active.x1,b.end.node.y1-active.y1));
      const start = ciel.referenceNodes.get(slotKey(...active.referenceSlot));
      for (const {end} of candidates.slice(0,6)) {
        const key = [slotKey(...start.node.referenceSlot),slotKey(...end.node.referenceSlot)].sort().join('|');
        const previous = animated.get(key);
        animated.set(key, { start, end, opacity: previous?.opacity ?? 0, target: 1 });
      }
    }
  }
  ctx.save();
  ctx.lineWidth = .45;
  ctx.strokeStyle = 'rgba(194,201,255,.15)';
  ctx.beginPath();
  for (const [a,b] of ciel.referencePairs) {
    if (!visible(a) || !visible(b)) continue;
    ctx.moveTo(a.node.x1,a.node.y1);
    ctx.lineTo(b.node.x1,b.node.y1);
  }
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.lineWidth = .75;
  ctx.strokeStyle = 'rgba(194,201,255,.5)';
  for (const [key, edge] of animated) {
    const step = reduced ? 1 : dt / .3;
    edge.opacity = edge.target ? Math.min(1,edge.opacity + step) : Math.max(0,edge.opacity - step);
    if (!edge.opacity && !edge.target) { animated.delete(key); continue; }
    if (!visible(edge.start) || !visible(edge.end)) continue;
    ctx.globalAlpha = alpha * edge.opacity;
    ctx.beginPath();
    ctx.moveTo(edge.start.node.x1,edge.start.node.y1);
    ctx.lineTo(edge.end.node.x1,edge.end.node.y1);
    ctx.stroke();
  }
  ctx.restore();
}

/* Discrete junction visible near the middle of the reference. This is not a
 * twelfth star: a hollow ring with a handful of near-invisible connectors.
 * Infer the reference panel dimensions from calibrated hub centres so the
 * junction remains correctly placed through 2D / Expo projection. */
export function drawReferenceJunction(ctx,ciel,project,alpha=1){
  if(!ctx||!ciel||typeof project!=='function'||alpha<=.003)return;
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil');
  const byReference=Array(REFERENCE_HUBS.length).fill(null);
  hubs.forEach((e,i)=>{const j=referenceIndex(e,i);if(e.centre)byReference[j]=e;});
  const a=byReference[0],b=byReference[4];
  if(!a||!b)return;
  const w=(b.centre[0]-a.centre[0])/(REFERENCE_HUBS[4].x-REFERENCE_HUBS[0].x);
  const h=(b.centre[1]-a.centre[1])/(REFERENCE_HUBS[4].y-REFERENCE_HUBS[0].y);
  if(!Number.isFinite(w+h)||Math.abs(w)<10||Math.abs(h)<10)return;
  const left=a.centre[0]-REFERENCE_HUBS[0].x*w;
  const top=a.centre[1]-REFERENCE_HUBS[0].y*h;
  const center=project(left+w*.5,top+h*.5,a.centre[2]||0);
  if(!center||!Number.isFinite(center.x+center.y))return;
  ctx.save();
  ctx.globalAlpha*=Math.min(1,Math.max(0,alpha));
  ctx.strokeStyle='rgba(68,87,188,.22)';
  ctx.lineWidth=.75;ctx.beginPath();
  for(const hub of byReference){
    const p=hub&&(hub.ecran??project(...hub.centre));
    if(!p||!Number.isFinite(p.x+p.y))continue;
    ctx.moveTo(center.x,center.y);ctx.lineTo(p.x,p.y);
  }
  ctx.stroke();
  ctx.strokeStyle='rgba(95,119,239,.62)';ctx.lineWidth=.9;
  ctx.beginPath();ctx.arc(center.x,center.y,4.6,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

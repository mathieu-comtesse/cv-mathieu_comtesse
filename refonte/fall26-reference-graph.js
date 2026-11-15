/**
 * Topologie de l'accueil des éditions Fall '26.
 * Calibrée à partir de la vidéo fournie (état du graphe vers 1,7 s).
 * Coordonnées normalisées mesurées dans la fenêtre du graphe Shopify.
 * Tous les textes et les miniatures proviennent de comtesse.me.
 *
 * Pas de code/texture/maillage/ressource Shopify.
 */
export const REFERENCE_HUBS = Object.freeze([
  // Correspondance avec l'ordre des onze chapitres du site.
  {x:.455,y:.181,r:1.03,points:20,tone:'blue'},  // Agentic
  {x:.575,y:.682,r:.91,points:15,tone:'blue'},    // Sidekick
  {x:.817,y:.485,r:.88,points:15,tone:'blue'},    // Merchandising
  {x:.296,y:.653,r:1.04,points:21,tone:'mint'},   // Retail
  {x:.627,y:.199,r:1.02,points:19,tone:'blue'},   // Payments
  {x:.561,y:.922,r:.91,points:16,tone:'cyan'},    // Operations
  {x:.367,y:.402,r:1.09,points:20,tone:'blue'},   // Online
  {x:.737,y:.703,r:.80,points:15,tone:'blue'},    // Marketing
  {x:.202,y:.444,r:1.07,points:19,tone:'blue'},   // Fulfillment
  {x:.659,y:.440,r:1.09,points:24,tone:'mint'},   // Developer
  {x:.286,y:.210,r:.72,points:14,tone:'blue'}     // Shop
]);
export const REFERENCE_LINKS = Object.freeze([
  [0,4],[0,6],[0,10],[1,3],[1,5],[1,7],[1,9],
  [2,4],[2,7],[2,9],[3,5],[3,6],[3,8],
  [4,6],[4,9],[5,7],[6,8],[6,9],[7,9]
]);

const GOLDEN=2.399963229728653;
const TAU=Math.PI*2;

export function calibrateReferenceBranches(ciel) {
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
  hubs.forEach((e,index)=>{
    const ref=REFERENCE_HUBS[index];
    if(!ref)return;
    e.sol=false; e.referenceFlat=true;e.flatTone=ref.tone;
    const nodes=e.noeuds,editorial=nodes.filter(n=>n.ed),visual=nodes.filter(n=>!n.ed);
    // Distribution radiale régulière mais asymétrique, comme les rayons filmés.
    // Les vraies vignettes gardent leur référence, leur click et leur drag.
    editorial.forEach((n,i)=>{
      n.a=((i+.33)*GOLDEN+index*.42)%TAU;
      n.r=.65+.32*((i*7+index*3)%9)/8;
    });
    visual.forEach((n,i)=>{
      n.a=((i+.41)*GOLDEN+index*.23)%TAU;
      n.r=.48+.68*((i*11+index*5)%17)/16;
    });
    nodes.forEach((n,i)=>{
      n.dh=0;n.cv=0;n.ar=0;n.par=null;n.enf=[];
      n.niveau=n.ed?0:1;n.taille=n.ed?1.5:1.2+(i%5)*.27;
      n.pul=false;
    });
  });
  return hubs.length;
}
export function placeReferenceHubs(ciel,width,height) {
  const w=Number(width),h=Number(height);
  if(!(w>0&&h>0))return;
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
  const baseR=Math.min(w*.105,h*.145);
  for(let i=0;i<hubs.length&&i<REFERENCE_HUBS.length;i++){
    const e=hubs[i],r=REFERENCE_HUBS[i],z=0;
    e.centre=[r.x*w,r.y*h,z];e.rayon=baseR*r.r;
  }
}
export function drawReferenceLinks(ctx,ciel,proj,alpha=1){
  if(!ctx||!ciel||typeof proj!=='function')return;
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
  ctx.save();ctx.lineWidth=.65;ctx.strokeStyle='rgba(81,111,218,'+(Math.min(.2,Math.max(0,alpha)*.14)).toFixed(3)+')';
  ctx.beginPath();
  for(const [a,b] of REFERENCE_LINKS){
    const A=hubs[a]?.centre,B=hubs[b]?.centre;
    if(!A||!B)continue;
    const p=proj(...A),q=proj(...B);
    if(!p||!q)continue;
    ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
  }
  ctx.stroke();ctx.restore();
}

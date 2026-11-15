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
  {x:.627,y:.199,r:1.02,points:30,tone:'blue'},   // Payments
  {x:.561,y:.922,r:.91,points:16,tone:'cyan'},    // Operations
  {x:.367,y:.402,r:1.09,points:20,tone:'blue'},   // Online
  {x:.737,y:.703,r:.80,points:15,tone:'blue'},    // Marketing
  {x:.202,y:.444,r:1.07,points:19,tone:'blue'},   // Fulfillment
  {x:.659,y:.440,r:1.09,points:57,tone:'mint'},   // Developer
  {x:.286,y:.210,r:.72,points:14,tone:'blue'}     // Shop
]);
export const REFERENCE_LINKS = Object.freeze([
  [0,4],[0,6],[0,10],[1,3],[1,5],[1,7],[1,9],
  [2,4],[2,7],[2,9],[3,5],[3,6],[3,8],
  [4,6],[4,9],[5,7],[6,8],[6,9],[7,9]
]);

/* Directions principales mesurées sur la trame vidéo (degrés).
 * Les directions supplémentaires de l'éventail sont reconstituées
 * de façon déterministe quand une vignette n'est pas détectable. */
export const REFERENCE_SPOKES = Object.freeze([
  [-166,-138,-112,-68,-49,-35,-3,29,53,75,91,112,140,171,-90,-21,16,65,122,156],   // Agentic
  [-168,-140,-88,-39,-11,-5,14,31,50,72,110,150,176,-114,92],             // Sidekick
  [-176,-169,-146,-120,-90,-60,-28,-8,15,31,55,79,115,146,172],           // Merchandising
  [-169,-150,-127,-99,-57,-49,-30,-24,-4,3,19,42,61,76,95,115,137,171,183,209,249], // Retail
  [-176,-115,-98,-48,-29,-18,-13,15,28,64,94,121,135,152,172,-145,-81,49,106], // Payments
  [-178,-174,-161,-146,-133,-107,-88,-86,-72,-66,7,30,70,110,145,176],    // Operations
  [-172,-133,-111,-83,-45,-34,21,40,61,79,118,143,178,-152,-90,-13,6,91,161,199], // Online
  [-176,-159,-155,-141,-106,-104,-93,-45,7,34,70,94,120,141,170],         // Marketing
  [-174,-152,-132,-95,-81,-68,-43,-20,-4,7,19,32,47,56,69,87,106,120,150], // Fulfillment
  [-179,-161,-150,-139,-125,-106,-83,-65,-47,-35,-12,8,21,38,51,78,95,112,129,156,176,195,229,263], // Developer
  [-173,-165,-149,-139,-90,-57,-34,-12,9,28,63,118,139,173]              // Shop
]);
const GOLDEN=2.399963229728653;
const TAU=Math.PI*2;

export function calibrateReferenceBranches(ciel) {
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
  hubs.forEach((e,index)=>{
    const ref=REFERENCE_HUBS[index];
    if(!ref)return;
    e.sol=false; e.referenceFlat=true;e.flatTone=ref.tone;
    const nodes=e.noeuds,editorial=nodes.filter(n=>n.ed);
    const pool=nodes.filter(n=>!n.ed);
    const target=Math.max(4,ref.points-editorial.length);
    const visual=pool.slice(0,target);
    // Ajouter des extrémités décoratives si la vidéo montre davantage
    // de rayons que le générateur de base, sans jamais créer de liens factices.
    for(let i=visual.length;i<target&&pool.length;i++){
      const template=pool[i%pool.length];
      visual.push({...template,ed:null,enf:[],ox:0,oy:0,
        phase:(template.phase+(i+1)*.173)%TAU,vis:false,gg:0});
    }
    e.noeuds=[...editorial,...visual];
    const directions=REFERENCE_SPOKES[index]||[];
    // Les vignettes réellement cliquables demeurent intactes.
    editorial.forEach((n,i)=>{
      n.a=((i+.33)*GOLDEN+index*.42)%TAU;
      n.r=.65+.32*((i*7+index*3)%9)/8;
    });
    // Contrairement à un soleil procédural uniforme, chaque foyer conserve
    // les orientations irrégulières relevées dans les séquences de référence.
    visual.forEach((n,i)=>{
      const base=directions[i%directions.length]??((i+.41)*GOLDEN*180/Math.PI);
      const deg=base+(i>=directions.length?((Math.floor(i/directions.length)*2-1)*5.5):0);
      n.a=deg*Math.PI/180;
      n.r=.59+.59*((i*11+index*5)%17)/16;
    });
    e.noeuds.forEach((n,i)=>{
      n.dh=0;n.cv=0;n.ar=0;n.par=null;n.enf=[];
      n.niveau=n.ed?0:1;n.taille=n.ed?1.5:1.2+(i%5)*.27;
      n.pul=false;
    });
  });
  return hubs.length;
}
export function placeReferenceHubs(ciel,width,height,{left=0,top=0,lift=0}={}) {
  const w=Number(width),h=Number(height);
  if(!(w>0&&h>0))return;
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
  const baseR=Math.min(w*.105,h*.145);
  for(let i=0;i<hubs.length&&i<REFERENCE_HUBS.length;i++){
    const e=hubs[i],r=REFERENCE_HUBS[i],z=lift;
    e.centre=[left+r.x*w,top+r.y*h,z];e.rayon=baseR*r.r;
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

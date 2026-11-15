/**
 * Topologie de l'accueil des éditions Fall '26.
 * Calibrée à partir de la vidéo fournie (état du graphe vers 1,7 s).
 * Coordonnées normalisées recalées sur le cadre réel du graphe (capture vidéo\n * 1440 × 900 fournie, en excluant la sidebar de gauche).
 * Tous les textes et les miniatures proviennent de comtesse.me.
 *
 * Pas de code/texture/maillage/ressource Shopify.
 */
export const REFERENCE_HUBS = Object.freeze([
  // Correspondance avec l'ordre des onze chapitres du site.
  {x:.448,y:.169,r:1.03,points:20,tone:'blue'},  // Agentic
  {x:.604,y:.693,r:.91,points:15,tone:'blue'},    // Sidekick
  {x:.914,y:.518,r:.88,points:15,tone:'blue'},    // Merchandising
  {x:.224,y:.630,r:1.04,points:21,tone:'mint'},   // Retail
  {x:.660,y:.202,r:1.02,points:30,tone:'blue'},   // Payments
  {x:.550,y:.926,r:.91,points:16,tone:'cyan'},    // Operations
  {x:.343,y:.384,r:1.09,points:20,tone:'blue'},   // Online
  {x:.815,y:.728,r:.80,points:15,tone:'blue'},    // Marketing
  {x:.131,y:.412,r:1.07,points:19,tone:'blue'},   // Fulfillment
  {x:.704,y:.440,r:1.09,points:57,tone:'mint'},   // Developer
  {x:.225,y:.194,r:.72,points:14,tone:'blue'}     // Shop
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
// Map the actual chapter IDs to the locations of the original reference hubs.
// The site's editorial chapter order differs from the reference diagram order.
export const REFERENCE_CHAPTER_IDS=Object.freeze([
  'agentic','sidekick','merchandising','retail','payments','operations',
  'online','marketing','fulfillment','developer','shop'
]);
function referenceIndex(hub,fallback){
  const key=typeof hub?.id==='string'&&hub.id.startsWith('accueil:')?hub.id.slice(8):'';
  const index=REFERENCE_CHAPTER_IDS.indexOf(key);
  return index<0?fallback:index;
}
const TAU=Math.PI*2;
/**
 * Étend les orientations relevées dans les captures sans produire des rayons
 * presque confondus. Les directions d'origine sont préservées et les rayons
 * supplémentaires sont placés dans les lacunes angulaires les plus larges.
 */
export function referenceSpokeAngles(index,count){
  if(!Number.isInteger(count)||count<0)return [];
  const raw=REFERENCE_SPOKES[index]||[];
  const norm=d=>((d%360)+360)%360;
  const values=[...new Set(raw.map(norm).map(d=>Math.round(d*1000)/1000))].sort((a,b)=>a-b);
  if(!values.length)values.push(0);
  // Les positions présentes dans la vidéo sont conservées en priorité.
  while(values.length<count){
    let widest=-1,at=0;
    for(let i=0;i<values.length;i++){
      const gap=((values[(i+1)%values.length]+(i===values.length-1?360:0))-values[i]);
      if(gap>widest){widest=gap;at=i;}
    }
    const midpoint=norm(values[at]+widest/2);
    values.push(midpoint);values.sort((a,b)=>a-b);
  }
  return values.slice(0,count).map(x=>x*Math.PI/180);
}
export function calibrateReferenceBranches(ciel) {
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
  hubs.forEach((e,index)=>{
    const refIndex=referenceIndex(e,index),ref=REFERENCE_HUBS[refIndex];
    if(!ref)return;
    e.sol=false;e.referenceFlat=true;e.flatTone=ref.tone;
    const editorial=e.noeuds.filter(n=>n.ed);
    const pool=e.noeuds.filter(n=>!n.ed);
    const count=Math.max(ref.points,editorial.length+4);
    const decorativeCount=count-editorial.length;
    const visual=pool.slice(0,decorativeCount);
    for(let i=visual.length;i<decorativeCount&&pool.length;i++){
      const template=pool[i%pool.length];
      visual.push({...template,ed:null,enf:[],ox:0,oy:0,phase:(template.phase+(i+1)*.173)%TAU,vis:false,gg:0});
    }
    if(!pool.length&&decorativeCount){ // Graceful degradation for a chapter with no generated decorative nodes.
      const template=editorial[0];
      for(let i=0;i<decorativeCount&&template;i++)
        visual.push({...template,ed:null,enf:[],ox:0,oy:0,phase:(i+1)*.618%TAU,vis:false,gg:0});
    }
    e.noeuds=[...editorial,...visual];
    const angles=referenceSpokeAngles(refIndex,e.noeuds.length);
    const assigned=new Set();
    // Les miniatures sont réparties sur l'éventail, au lieu d'être concentrées
    // selon le nombre d'or du générateur procédural.
    editorial.forEach((n,i)=>{
      const at=Math.min(angles.length-1,Math.floor((i+.5)*angles.length/editorial.length));
      n.a=angles[at];assigned.add(at);
      n.r=.8+.38*((i*7+refIndex*3)%11)/10;
    });
    let cursor=0;
    visual.forEach((n,i)=>{
      while(assigned.has(cursor)&&cursor<angles.length)cursor++;
      n.a=angles[cursor++]??(i+.5)*TAU/Math.max(1,visual.length);
      // Chaque direction possède une profondeur distincte, sans motif radial répété.
      n.r=.66+.60*((i*11+refIndex*5)%23)/22;
    });
    e.noeuds.forEach((n,i)=>{
      n.dh=0;n.cv=0;n.ar=0;n.par=null;n.enf=[];
      n.niveau=n.ed?0:1;n.taille=n.ed?1.5:1.1+(i%5)*.20;
      n.pul=false;
    });
    // Reference video: the constellation is not a pure radial fan.
    // Roughly one in five decorative tips forks from an existing spoke.
    // Parents precede their children in the render loop, so animation,
    // picking and spring return use the native Ciel implementation.
    for(let i=5;i<visual.length;i+=5){
      const twig=visual[i],parent=visual[i-2];
      if(!twig||!parent||parent.par)continue;
      twig.par=parent;parent.enf.push(twig);
      twig.niveau=2;
      twig.t0=.62+.07*((i+refIndex)%3);
      twig.ang=(i%2?-1:1)*(.36+.08*((i+refIndex)%4));
      twig.len=.18+.045*((i+refIndex)%4);
      twig.cv=0;twig.ar=0;twig.dh=0;
    }
    // Dense reference hubs include secondary forks which themselves fork.
    // Building from earlier visual nodes guarantees parent-before-child
    // ordering and keeps every editorial thumbnail at level zero.
    for(let i=11;i<visual.length;i+=11){
      const twig=visual[i],parent=visual[i-1];
      if(!twig||!parent||parent.niveau!==2||twig.par)continue;
      twig.par=parent;parent.enf.push(twig);
      twig.niveau=3;
      twig.t0=.52+.08*((i+refIndex)%3);
      twig.ang=(i%2?-1:1)*(.55+.06*((i+refIndex)%4));
      twig.len=.11+.025*((i+refIndex)%4);
      twig.cv=0;twig.ar=0;twig.dh=0;
    }
  });
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
  const radius=Math.max(18,Math.min(160,width*.095,height*.145))*(1-.32*transition);
  // Opening of the flat hero constellation as the visitor scrolls toward chapter 1.
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
export function drawReferenceLinks(ctx,ciel,proj,alpha=1){
  if(!ctx||!ciel||typeof proj!=='function')return;
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
  const byReference=Array.from({length:REFERENCE_HUBS.length},()=>null);
  hubs.forEach((hub,i)=>{byReference[referenceIndex(hub,i)]=hub;});
  ctx.save();ctx.lineWidth=.65;ctx.strokeStyle='rgba(81,111,218,'+(Math.min(.2,Math.max(0,alpha)*.14)).toFixed(3)+')';
  ctx.beginPath();
  for(const [a,b] of REFERENCE_LINKS){
    const A=byReference[a]?.centre,B=byReference[b]?.centre;
    if(!A||!B)continue;
    const p=proj(...A),q=proj(...B);
    if(!p||!q)continue;
    ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
  }
  ctx.stroke();ctx.restore();
}

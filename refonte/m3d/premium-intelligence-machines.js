// Outils transverses et intelligence documentaire : 3 machines conçues intégralement.
import * as THREE from 'three';
import {P,M,clamp,ease,phase,createAssembly,block,cyl,cone,shaft,hoop,gear,cable,label,readout,paper,documentStream,drivePair,valve,gauge,glassTower} from './premium-core.js';
const TAU=Math.PI*2;
const directions=[[-24,32,-10],[-12,33,-25],[0,46,14],[15,33,26],[31,27,3]];
const xs=[-109,-56,0,57,113];
const standby={update(){}};
export function buildSuivi(){
 const a=createAssembly('UNIFIED_OT_SIGNAL_EXCHANGE',278,118);
 const console=a.zone(0,'User inquiry',[xs[0],0,0],directions[0]),
 selector=a.zone(1,'Selector',[xs[1],0,0],directions[1]),
 rack=a.zone(2,'Switchboard',[xs[2],0,0],directions[2]),
 linked=a.zone(3,'Cross-connect',[xs[3],0,0],directions[3]),
 screen=a.zone(4,'Response',[xs[4],0,0],directions[4]);
 // An analog keyboard and mechanical search drum
 block(console,43,25,34,0,19,0,'graphite');
 const keyboard=Array.from({length:12},(_,i)=>{
  const x=(i%4-1.5)*9,z=Math.floor(i/4)*8-10;
  const key=block(console,6,2,5,x,33,z,'silver');return key;
 });
 const user=readout(console,38,10,0,56,17);
 const inputRotor=gear(console,18,26,0,71,0,'bronze');
 label(console,'ENTREE OT',0,94,14,39,6);
 // Coaxial 3-selector racks with legible equipment type tokens
 const switches=[];
 for(let i=0;i<3;i++){
  const z=(i-1)*17;
  const ring=hoop(selector,14,2,0,45,z,'steel','x');
  const selectorPin=block(selector,23,3,6,0,44,z,'bronze');
  const dial=gear(selector,7,12,19,45,z,'copper');
  label(selector,['OT','EQUIPEMENT','BATIMENT'][i],0,70,z+8,30,5);
  switches.push({ring,selectorPin,dial});
 }
 block(selector,42,4,48,0,12,0,'graphite');
 // Huge patch panel with sockets in a physically 5 x 4 matrix
 block(rack,65,92,17,0,54,0,'graphite',{shell:true});
 const nodes=[];
 for(let r=0;r<5;r++)for(let c=0;c<4;c++){
  const x=-22+c*14,y=30+r*14;
  const outer=hoop(rack,4,1,x,y,10,'steel');
  const pin=cyl(rack,1.9,2,x,y,11,'off',16);pin.rotation.x=Math.PI/2;
  nodes.push({pin,x,y,r,c});
 }
 label(rack,'20 PRISES DE DONNEES',0,105,13,56,6);
 // Actual curves connected to jacks. Mechanical selector runs down a 5-source bus
 block(linked,47,80,29,0,48,0,'steel',{shell:true});
 const tabs=Array.from({length:5},(_,i)=>{
  const z=-24+i*12;
  const tab=block(linked,36,8,7,0,24+i*11,z,'graphite');
  const led=cyl(linked,2.2,1,12,24+i*11,z+4,'off',14);
  return {tab,led};
 });
 const commutator=gear(linked,15,18,0,82,18,'bronze');
 const patchCables=[];
 for(let i=0;i<5;i++){
  const x=-19+i*9;
  const line=cable(linked,[[x,15,-26],[x-6,25,-8],[x-9,40,12],[x,60,23]],.65,i%2?'blue':'bronze');
  patchCables.push(line);
 }
 label(linked,'RACCORDEMENT',0,104,18,44,7);
 // Physically elevated search console, dossier tray and results
 block(screen,60,68,22,0,45,0,'graphite',{shell:true});
 const result=readout(screen,49,13,0,58,13);
 const route=readout(screen,49,9,0,39,13);
 const drawer=block(screen,49,5,25,0,15,19,'bronze');
 const docs=paper(screen,0,20,21,23,20);
 label(screen,'ACCES DIRECT',0,90,13,41,7);
 const connector=documentStream(a.group,[[-110,45,0],[-56,45,0],[0,50,0],[55,48,0],[114,52,0]],5,16);
 const choices=['OT','EQUIPEMENT','BATIMENT'];
 a.animate(t=>{
  const query=Math.floor(phase(t,24)*12),kind=query%3,source=(query*3)%5;
  inputRotor.rotation.z=t*.2;
  keyboard.forEach((k,i)=>k.position.y=33+(i===query%12?-2.1:0));
  user.set(choices[kind]+' '+(4100000+query*53));
  switches.forEach(({selectorPin,dial},i)=>{
    selectorPin.rotation.y=i===kind?t*.3:0;
    dial.rotation.z=i===kind?t*.3:0;
  });
  nodes.forEach((n,i)=>n.pin.material=i===((query*3)%20)?M.light:M.off);
  tabs.forEach(({tab,led},i)=>led.material=i===source?M.light:M.off);
  commutator.rotation.z=source*.4;
  result.set('RESULTAT '+(query%11+1));
  route.set(['GMAO','PDF','SHAREPOINT','EXCEL','POWER BI'][source]);
  docs.position.z=21+Math.sin(t*.8)**2*8;
  drawer.position.z=19+Math.sin(t*.8)**2*8;
  connector.update(t);
 });
 a.controls={label:'Recherche',min:1,max:12,step:1,fmt:v=>'Recherche '+v+' / 12',get:t=>1+Math.floor(phase(t,24)*12),seek:v=>(v-1)*2};
 a.readout=t=>'Recherche '+a.controls.get(t)+' · OT, équipement ou bâtiment · résolution simulée';
 a.areas=[
 ['Requête','Saisie du numéro d’OT, de l’équipement ou du bâtiment'],
 ['Sélecteur','Reconnaissance du type de recherche'],
 ['Référentiels','Sources techniques disponibles'],
 ['Liaisons','Rapprochement et vérification de correspondance'],
 ['Accès','Restitution du dossier et du lien direct']
 ];return a;
}

export function buildStudio(){
 const a=createAssembly('PDF_EXTRACTOR_TOOLMAKER',284,126);
 const sample=a.zone(0,'Document sample',[xs[0],0,0],directions[0]),
 tracing=a.zone(1,'Coordinate tracing',[xs[1],0,0],directions[1]),
 foundry=a.zone(2,'Generator CNC',[xs[2],0,0],directions[2]),
 tests=a.zone(3,'Testing station',[xs[3],0,0],directions[3]),
 library=a.zone(4,'Delivery vault',[xs[4],0,0],directions[4]);
 // Original PDF sample with four annotated boxes and field labels
 const tray=block(sample,45,6,32,0,11,0,'graphite');
 const reference=paper(sample,0,26,0,29,31);
 const markers=[[-11,-8],[8,-8],[-10,5],[8,5]].map(([x,z],i)=>{
  const frame=hoop(sample,4.5,.9,x,28,z,'bronze','y');return frame;
 });
 const scroll=gear(sample,12,18,24,39,16,'steel');
 label(sample,'PDF DE REFERENCE',0,70,15,47,7);
 // Precision scanner guide with XY plotter axis, moving probe
 for(let x of [-20,20])shaft(tracing,[x,12,-21],[x,12,22],1.6,'steel');
 for(let z of [-21,22])shaft(tracing,[-20,12,z],[20,12,z],1.6,'bronze');
 const beam=block(tracing,42,3,4,0,34,0,'silver');
 const bridge=block(tracing,7,4,34,0,29,0,'graphite');
 const probe=cone(tracing,2.5,.2,15,0,20,0,'copper');
 const target=paper(tracing,0,12,0,31,30);
 const reader=readout(tracing,35,9,0,67,19);
 label(tracing,'TRACE DES ZONES',0,82,18,43,6);
 // Genuine mill with spindle, rails and new cut key blank
 for(let x of [-25,25])shaft(foundry,[x,12,-23],[x,75,-23],1.6,'steel');
 const header=block(foundry,65,8,26,0,79,-12,'graphite');
 const spindle=shaft(foundry,[0,74,-12],[0,29,-12],4,'steel');
 const bit=cone(foundry,3,.15,9,0,24,-12,'bronze');
 const work=block(foundry,54,4,20,0,16,0,'steel');
 const blank=block(foundry,41,5,8,0,23,0,'bronze');
 const nicks=Array.from({length:8},(_,i)=>block(foundry,3,4+(i%3)*2,9,-17+i*5,29,0,'graphite'));
 const motor=gear(foundry,18,25,22,56,13,'steel');
 const text=readout(foundry,40,8,0,94,16);
 label(foundry,'FRAISEUSE DE REGLES',0,107,17,53,6);
 // Physical testing jig: field examples and sample diff comparator
 block(tests,55,67,36,0,44,0,'graphite',{shell:true});
 const gates=Array.from({length:4},(_,i)=>{
  const x=-18+i*12;
  const cylinder=cyl(tests,4,24,x,49,0,i%2?'bronze':'silver',20);
  const piston=block(tests,6,9,11,x,54,12,'silver');
  return {cylinder,piston};
 });
 const acceptance=readout(tests,44,10,0,81,20);
 label(tests,'RECETTE DES CHAMPS',0,96,18,47,6);
 // Four drawers with individual self-contained extractor definitions
 block(library,47,73,37,0,46,0,'graphite',{shell:true});
 const drawers=[];
 ['CERFA','VRE','PP','FACTURE'].forEach((name,i)=>{
  const drawer=block(library,39,4,29,0,25+i*12,9,'bronze');
  const key=block(library,25,2,9,0,28+i*12,20,'porcelain');
  label(library,name,0,28+i*12,23,25,5);
  drawers.push(drawer);
 });
 label(library,'EXTRACTEURS',0,94,18,39,6);
 const flow=documentStream(a.group,[[-111,31,0],[-59,32,0],[0,52,0],[59,48,0],[113,49,0]],6,17);
 const families=['CERFA','VRE','PP','FACTURES'];
 a.animate(t=>{
  const n=Math.floor(phase(t,40)*4),loc=phase(t,10);
  scroll.rotation.z=t*.28;
  markers.forEach((m,i)=>m.material=i===Math.floor(loc*4)?M.light:M.bronze);
  bridge.position.x=Math.sin(t*.35)*17;
  beam.position.z=Math.cos(t*.3)*15;
  probe.position.x=bridge.position.x;
  probe.position.z=beam.position.z;
  reader.set('ZONE '+(Math.floor(loc*4)+1));
  spindle.rotation.z=t*3;
  bit.position.y=24+Math.sin(t*2)*6;
  motor.rotation.z=t*.6;
  nicks.forEach((p,i)=>p.position.y=29+(i%3)*Math.sin(t*.5));
  text.set('MODELE '+families[n]);
  gates.forEach(({piston},i)=>{piston.position.y=54+(i===n?7:0);piston.material=i===n?M.light:M.silver;});
  acceptance.set((96+n)+' % TEST');
  drawers.forEach((d,i)=>d.position.z=i===n?19:9);
  flow.update(t);
 });
 a.controls={label:'Famille documentaire',min:1,max:4,step:1,fmt:v=>families[v-1],get:t=>1+Math.floor(phase(t,40)*4),seek:v=>(v-1)*10};
 a.readout=t=>'Famille '+families[a.controls.get(t)-1]+' · configuration, test et fabrication d’extracteur simulés';
 a.areas=[
 ['Exemple','PDF représentatif de la famille'],
 ['Tracé','Repérage spatial des champs et zones à lire'],
 ['Générateur','Assemblage des règles et production du modèle'],
 ['Essais','Comparaison avec des réponses vérifiées'],
 ['Livraison','Extracteur autonome réutilisable']
 ];return a;
}

export function buildCognitive(){
 const a=createAssembly('VRE_COGNITIVE_DOCUMENT_ENGINE',306,132);
 const intake=a.zone(0,'Acquisition & geometry',[xs[0],0,0],[-22,37,-8]),
 semantic=a.zone(1,'Neural meaning',[xs[1],0,0],[-8,39,-28]),
 fusion=a.zone(2,'Spatial semantic fusion',[xs[2],0,0],[0,56,18]),
 human=a.zone(3,'Human validation',[xs[3],0,0],[16,37,27]),
 trainer=a.zone(4,'Training & publication',[xs[4],0,0],[30,35,5]);
 // Spatial document portal, elevated page elevator with scanning frames
 block(intake,47,80,38,0,47,0,'graphite',{shell:true});
 const pages=Array.from({length:5},(_,i)=>paper(intake,0,18+i*9,0,27,30));
 const scanner=hoop(intake,19,2,0,55,0,'bronze','y');
 const scanBeam=block(intake,38,3,34,0,54,0,'blue');
 const pageMeter=readout(intake,39,9,0,95,18);
 label(intake,'COORDONNEES PDF',0,106,17,49,6);
 // Neural encoding chamber : geodesic neurons, curved synapses, motor drive
 const brain=new THREE.Group();brain.position.set(0,53,0);semantic.add(brain);
 const neurons=[];
 // Deterministic organic point placement across six successive layers
 for(let layer=0;layer<6;layer++){
  for(let j=0;j<8;j++){
   const theta=(j+layer*.57)*TAU/8;
   const rr=13+Math.sin(j*2+layer)*3;
   const px=(layer-2.5)*8,py=Math.cos(theta)*rr,pz=Math.sin(theta)*rr;
   const node=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7,1),j%3?M.silver:M.bronze);
   node.position.set(px,py,pz);node.castShadow=true;brain.add(node);
   neurons.push({node,layer,j,p:[px,py,pz]});
  }
 }
 const synapses=[];
 for(let k=0;k<neurons.length-11;k++){
  if(k%2!==0)continue;
  const p=neurons[k].p,q=neurons[k+8+(k%4)].p;
  const bend=(k%4-1.5)*3;
  const c=cable(brain,[p,[(p[0]+q[0])*.5,p[1]+bend,p[2]+bend],q],.25,k%3?'steel':'bronze');
  const pulse=new THREE.Mesh(new THREE.SphereGeometry(.85,8,6),M.light);
  brain.add(pulse);synapses.push({pulse,curve:c.curve,k});
 }
 hoop(semantic,31,1,0,53,0,'steel','x');
 const g1=gear(semantic,12,20,-29,20,19,'bronze');
 const g2=gear(semantic,12,20,-5,20,19,'steel');
 const score=readout(semantic,39,8,0,102,20);
 label(semantic,'ENCODEUR SEMANTIQUE',0,114,20,55,7);
 // Dual-lane spatial vs semantic data combiner
 block(fusion,72,12,47,0,30,0,'graphite');
 const rings=[0,1,2].map(i=>hoop(fusion,16+i*9,1.5,0,65,0,i===1?'bronze':'steel','y'));
 const decision=gear(fusion,18,28,0,52,17,'bronze');
 const impossible=[-18,-6,6,18].map((x,i)=>block(fusion,6,30,14,x,31,15,'silver'));
 const validity=readout(fusion,48,10,0,110,16);
 label(fusion,'FUSION + REGLES',0,123,14,49,6);
 // Human correction table: actual luminous sheet and five physical validation paddles
 const table=block(human,63,9,48,0,18,0,'graphite');
 const lightPlate=block(human,57,3,42,0,24,0,'glass',{shell:true});
 const annotated=paper(human,0,30,0,37,37);
 const paddles=Array.from({length:5},(_,i)=>{
  const p=block(human,8,11,8,-20+i*10,47,24,i%2?'silver':'bronze');
  return p;
 });
 const accepted=cyl(human,4,2,19,57,19,'green');
 const hand=block(human,35,4,18,0,69,0,'steel');
 const verify=readout(human,48,10,0,96,26);
 label(human,'VALIDATION HUMAINE',0,110,25,53,6);
 // Candidate model and production model are separated physically with a version gate
 const production=new THREE.Group();production.position.set(-19,46,0);trainer.add(production);
 const candidate=new THREE.Group();candidate.position.set(18,46,0);trainer.add(candidate);
 const rotatingDrums=[];
 [production,candidate].forEach((g,i)=>{
  const shell=cyl(g,12,37,0,0,0,i?'bronze':'steel',32);shell.rotation.z=Math.PI/2;
  for(let k=0;k<32;k++){
   const ang=k*TAU/32;
   const pin=cyl(g,.9,4,(k%4-1.5)*8,Math.cos(ang)*12,Math.sin(ang)*12,i?'steel':'copper',8);
   pin.rotation.x=ang;
  }
  rotatingDrums.push(g);
 });
 const modelGate=block(trainer,6,56,6,0,53,9,'graphite');
 const publish=block(trainer,27,5,29,0,23,0,'bronze');
 const calibrate=gauge(trainer,0,90,21,11);
 const benchmark=readout(trainer,50,9,0,112,18);
 label(trainer,'ESSAI / PUBLICATION',0,125,16,54,6);
 // 'Memory' consists of individual immutable-looking data tiles, not actual JSON writes
 const memories=Array.from({length:10},(_,i)=>{
  const z=24+(i%2)*9;
  return block(trainer,11,3,7,-22+i%5*11,12+Math.floor(i/5)*5,z,i%3?'steel':'bronze');
 });
 const stream=documentStream(a.group,[[-108,44,0],[-57,54,0],[0,62,0],[57,49,0],[113,48,0]],7,18);
 const stationNames=['Pages','Sémantique','Règles','Propositions','Validation','Mémoire','Entraînement','Évaluation','Publication'];
 const step=t=>Math.min(8,Math.floor(phase(t,54)*9));
 a.animate(t=>{
  const st=step(t),prog=phase(t,6);
  scanner.position.y=55+21*Math.sin(t*.4);
  scanBeam.position.y=scanner.position.y;pageMeter.set('PAGE '+(1+Math.floor(phase(t,25)*12)));
  pages.forEach((p,i)=>p.position.y=18+i*9+Math.sin(t*.55+i)*.8);
  neurons.forEach(({node,layer,j})=>{
   const active=.15+.25*(1+Math.sin(t*2.6+layer*.7+j*1.6));
   node.scale.setScalar(.8+active);
   node.material=active>.46?M.light:(j%3===0?M.bronze:M.silver);
  });
  synapses.forEach(({pulse,curve,k})=>pulse.position.copy(curve.getPoint(phase(t+k*.13,3.9))));
  g1.rotation.z=t*.3;g2.rotation.z=-t*.3;score.set('MINI BERT');
  rings.forEach((r,i)=>r.rotation.y=t*.15*(i%2?-1:1));
  decision.rotation.z=t*.3;
  impossible.forEach((p,i)=>p.position.y=31+(st>=2&&i%2===0?12:0));
  validity.set(st>3?'PROPOSITION':'REGLES');
  paddles.forEach((p,i)=>p.position.y=47+(st===4&&i===Math.floor(prog*5)?-6:0));
  accepted.material=st>=4?M.green:M.off;
  hand.position.x=Math.sin(t*.36)*16;
  verify.set(st>=4?'CADRES VALIDES':'EN ATTENTE');
  rotatingDrums.forEach((g,i)=>g.rotation.x=t*(i?.6:.23));
  modelGate.position.y=st>=8?65:53;
  publish.position.y=23+(st===8?8:0);
  calibrate.update(st>=7?.81:.34);
  benchmark.set(st===8?'CANDIDAT PUBLIE':st===7?'EVALUATION':'MODELE CANDIDAT');
  memories.forEach((p,i)=>p.position.y=12+Math.floor(i/5)*5+(st>=5?.4*Math.sin(t*.8+i):0));
  stream.update(t);
 });
 a.controls={label:'Étape documentaire',min:1,max:9,step:1,fmt:v=>v+' · '+stationNames[v-1],get:t=>1+step(t),seek:v=>(v-1)*6};
 a.readout=t=>stationNames[step(t)]+' · démonstration symbolique (pas d’inférence réelle ni de publication de modèle)';
 a.areas=[
 ['Acquisition','Pages, positions et structure documentaire'],
 ['Sémantique','Représentations neuronales conceptuelles'],
 ['Fusion','Règles métier, géométrie et classification'],
 ['Humain','Vérification, correction et validation'],
 ['Apprentissage','Mémoire partagée, candidat, évaluation et publication contrôlée']
 ];return a;
}

// Quatre installations métiers nouvelles : criticité, finances, PP et Power BI.
import * as THREE from 'three';
import {M,clamp,ease,phase,createAssembly,block,cyl,cone,shaft,hoop,gear,cable,label,readout,paper,documentStream,drivePair,valve,gauge,glassTower} from './premium-core.js';
const TAU=Math.PI*2;
const directions=[[-22,32,-10],[-10,34,-30],[0,45,10],[15,28,29],[26,25,0]];
const coords=[-110,-59,0,58,114];
const indicators=(root,count=5)=>Array.from({length:count},(_,i)=>cyl(root,2.3,1,0,0,0,'off',14));
function gantry(g,w=39,h=52,d=28){
 for(let x of [-w/2,w/2])for(let z of [-d/2,d/2]){
  shaft(g,[x,8,z],[x,8+h,z],1.2,'steel');}
 block(g,w+4,3,d+4,0,9+h,0,'graphite');
}
function conveyor(g,w=45,z=0){
 block(g,w,3,23,0,12,z,'graphite');
 const rolls=[];for(let x=-w/2+4;x<w/2;x+=7){const r=cyl(g,2.4,19,x,15,z,'silver',12);r.rotation.x=Math.PI/2;rolls.push(r);}
 return {update(t){rolls.forEach(r=>r.rotation.z=t*1.3);}};
}
const garesData=Array.from({length:10},(_,i)=>({
 n:'G'+String(i+1).padStart(2,'0'),conform:[.88,.25,.61,.94,.42,.19,.74,.56,.39,.69][i],
 preventive:[.39,.91,.56,.23,.77,.63,.83,.27,.95,.51][i]
}));
export function buildGares(){
 const a=createAssembly('RAILWAY_CRITICALITY_CALCULATOR',286,124);
 const rack=a.zone(0,'Sources',[coords[0],0,0],directions[0]),
 prep=a.zone(1,'Filters',[coords[1],0,0],directions[1]),
 mixer=a.zone(2,'Weighted differential',[coords[2],0,0],directions[2]),
 rank=a.zone(3,'Ranking display',[coords[3],0,0],directions[3]),
 send=a.zone(4,'Action station',[coords[4],0,0],directions[4]);
 // Nineteen independently identified source cartridges
 block(rack,40,75,37,0,41,0,'graphite',{shell:true});
 const cartridges=Array.from({length:19},(_,i)=>{
  const x=(i%4-1.5)*8,y=18+Math.floor(i/4)*11;
  return block(rack,6,9,28,x,y,5,i%3===0?'bronze':'silver');
 });
 label(rack,'19 SOURCES',0,86,21,34,7);
 const screenIn=readout(rack,33,8,0,14,21);
 // Precision filter racks, pressure rails and validation gate
 gantry(prep,40,50,35);
 const filters=Array.from({length:5},(_,i)=>{
  const c=cyl(prep,4.7,26,-14+i*7,28,0,i%2?'bronze':'silver',20);
  const pin=block(prep,3,15,8,-14+i*7,47,12,'graphite');
  return {c,pin};
 });
 const inlet=conveyor(prep,42,6),receipt=readout(prep,36,8,0,70,18);
 label(prep,'QUALIFICATION',0,79,18,37,6);
 // Central real mechanical weighted differential, twin coaxial drums
 const left=gear(mixer,20,30,-24,46,0,'bronze');
 const right=gear(mixer,20,30,24,46,0,'steel');
 const transfer=gear(mixer,10,14,0,22,1,'copper');
 const balance=block(mixer,64,4,6,0,78,0,'graphite');
 const arm=block(mixer,43,3,8,0,67,18,'bronze');
 const centerBolt=cyl(mixer,3,4,0,67,20,'graphite');
 const central=gauge(mixer,0,96,8,12);
 const bias=readout(mixer,50,9,0,12,25);
 label(mixer,'CONFORMITÉ / MAINT.',0,114,10,56,6);
 // Actual scrolling split flap rows and visible strip gears
 block(rank,75,83,27,0,50,0,'graphite',{shell:true});
 const lines=Array.from({length:6},(_,i)=>{
  const y=79-i*11;
  const d=readout(rank,55,7,0,y,15);
  const drum=cyl(rank,2,65,0,y-1,6,'steel',16);drum.rotation.z=Math.PI/2;
  return {d,drum};
 });
 label(rank,'CLASSEMENT',0,101,16,51,6);
 // Decision extractor arm picks highest-priority card
 gantry(send,43,47,41);
 const screw=shaft(send,[-18,60,-15],[18,60,-15],1.7,'steel');
 const actuator=block(send,14,9,18,0,57,-15,'bronze');
 const pointer=paper(send,0,22,7,19,22);
 const badge=readout(send,43,12,0,81,16);
 const sendLight=cyl(send,3.8,2,18,65,14,'green');
 const stream=documentStream(a.group,[[-105,33,0],[-58,36,0],[0,55,0],[59,51,0],[109,44,0]],6,15);
 let weight=.5;
 const sorted=()=>garesData.map((g,i)=>({...g,score:weight*(1-g.conform)+(1-weight)*(1-g.preventive)})).sort((a,b)=>b.score-a.score);
 a.animate(t=>{
  const speed=.65+t*.07;
  cartridges.forEach((c,i)=>c.position.z=5+(i%3===Math.floor(t*.75)%3?5:0));
  filters.forEach(({c,pin},i)=>pin.position.y=47+3*Math.sin(t*1.7+i*.8));
  inlet.update(t);
  left.rotation.z=t*.25*weight;right.rotation.z=-t*.25*(1-weight);
  transfer.rotation.z=t*.32;
  arm.rotation.z=(weight-.5)*.6;
  central.update(weight);bias.set(Math.round(weight*100)+' / '+Math.round((1-weight)*100));
  receipt.set('19 SOURCES OK');
  const scored=sorted();
  lines.forEach(({d,drum},i)=>{
   const row=scored[i],score=Math.round(row.score*100);
   d.set((i+1)+'. '+row.n+'  '+score);
   drum.rotation.x=t*.15+i*TAU/6;
  });
  actuator.position.x=Math.sin(t*.7)*14;
  pointer.position.x=actuator.position.x;
  badge.set('PRIORITÉ '+scored[0].n);
  sendLight.material=M.light;screenIn.set('19 / 19');
  stream.update(t);
 });
 a.controls={label:'Pondération conformité',min:0,max:100,step:5,fmt:v=>v+' % / '+(100-v)+' %',get:()=>Math.round(weight*100),set:v=>{weight=clamp(v/100);}};
 a.readout=t=>'Conformité '+Math.round(weight*100)+' % · maintenance '+Math.round((1-weight)*100)+' % · gare prioritaire '+sorted()[0].n;
 a.areas=[
 ['19 sources','Croisement GMAO, SharePoint et référentiels'],
 ['Préparation','Contrôles, filtres et qualité'],
 ['Pondération','Différentiel conformité et maintenance'],
 ['Classement','Scores et rangs actualisés'],
 ['Décision','Sélection des gares à surveiller']
 ];return a;
}

const financeFunds=[420,260,180,140],endRatios=[.93,.72,1.12,.86];
const FIN_DAYS=225;
function expenditure(day){const u=clamp(day/FIN_DAYS),w=u-.6*Math.sin(TAU*u*9)/(TAU*9);
 const amounts=financeFunds.map((f,i)=>f*endRatios[i]*w);
 return [...amounts.map((v,i)=>v/financeFunds[i]),amounts.reduce((a,b)=>a+b,0)/financeFunds.reduce((a,b)=>a+b,0)];
}
export function buildFinance(){
 const a=createAssembly('FINANCIAL_THRESHOLD_REACTOR',280,119);
 const money=a.zone(0,'Budget source',[coords[0],0,0],directions[0]),
 perimeter=a.zone(1,'Four networks',[coords[1],0,0],directions[1]),
 guards=a.zone(2,'Budget valves',[coords[2],0,0],directions[2]),
 triggers=a.zone(3,'Threshold relays',[coords[3],0,0],directions[3]),
 alerts=a.zone(4,'Alert dispatch',[coords[4],0,0],directions[4]);
 // Four funds encased in a secure budget vault
 block(money,39,71,35,0,42,0,'graphite',{shell:true});
 const assets=Array.from({length:4},(_,i)=>{
  const x=(i-1.5)*8;
  const p=block(money,6,32,21,x,43,0,'bronze');
  return p;
 });
 label(money,'BUDGET EXCEL',0,85,20,37,7);const total=readout(money,31,8,0,16,18);
 // Four transparent resource reservoirs and a separate total gauge
 const reservoirs=[],plates=[];
 for(let i=0;i<4;i++){
  const x=-18+i*12;
  glassTower(perimeter,x,13,0,5,55);
  const fill=cyl(perimeter,3.5,1,x,15,0,i%2?'blue':'bronze',18);
  reservoirs.push(fill);
  plates.push(readout(perimeter,14,6,x,78,11));
 }
 label(perimeter,'CS / LOC / MEC / PPTM',0,91,12,56,6);
 // Filtering manifold with four hand wheels and boundary checks
 block(guards,65,9,34,0,29,0,'graphite');
 const valves=[-24,-8,8,24].map(x=>valve(guards,x,40,0));
 const manifold=Array.from({length:4},(_,i)=>shaft(guards,[-24+i*16,30,0],[-24+i*16,65,0],1.8,i%2?'bronze':'steel'));
 const topTube=shaft(guards,[-31,65,0],[31,65,0],2.3,'copper');
 const rules=readout(guards,48,9,0,79,18);label(guards,'PRG / PSE / GLOBAL',0,90,15,51,6);
 // A separate mechanical contact and needle for every fiscal perimeter
 block(triggers,77,76,23,0,47,0,'graphite',{shell:true});
 const dials=Array.from({length:5},(_,i)=>{
  const x=(i-2)*14;
  const dial=gauge(triggers,x,56,13,6.6);
  const pin=block(triggers,7,4,8,x,24,13,'silver');
  return {dial,pin};
 });
 const setting=readout(triggers,55,9,0,83,14);
 label(triggers,'CONTACTS & SEUILS',0,95,15,51,6);
 // Physical threshold print and ratchet anti-duplicate
 const rack=gear(alerts,18,26,0,46,-5,'bronze');
 const ratchet=gear(alerts,8,12,23,46,-2,'steel');
 const printer=block(alerts,45,28,31,0,24,11,'graphite');
 const envelope=paper(alerts,0,38,25,21,16);
 const result=readout(alerts,40,9,0,76,15);
 label(alerts,'ANTI-DOUBLONS',0,91,16,39,6);
 const stream=documentStream(a.group,[[-109,35,0],[-59,39,0],[0,55,0],[58,55,0],[110,39,0]],5,17);
 let threshold=.8;
 const eventCache=new Map();
 function crossings(day){
  const key=String(threshold.toFixed(4))+':'+Math.floor(day);
  if(eventCache.has(key))return eventCache.get(key);
  const events=[];let previous=expenditure(0);
  for(let d=1;d<=Math.floor(day);d++){
   const next=expenditure(d);
   next.forEach((v,i)=>{
    if(previous[i]<threshold&&v>=threshold)events.push({day:d,i,type:'préventive'});
    if(previous[i]<1&&v>=1&&threshold<1)events.push({day:d,i,type:'dépassement'});
   });previous=next;
  }eventCache.set(key,events);return events;
 }
 const state=t=>{const day=clamp(t*2,0,FIN_DAYS),ratios=expenditure(day);return {day,ratios,events:crossings(day)};};
 a.animate(t=>{
  const s=state(t);
  reservoirs.forEach((f,i)=>{
   const height=Math.max(.4,50*clamp(s.ratios[i],0,1));
   f.scale.y=height;f.position.y=13+height/2;
   plates[i].set(Math.round(s.ratios[i]*100)+'%');
   valves[i].rotation.z=t*.2;
  });
  assets.forEach((p,i)=>p.scale.y=.5+s.ratios[i]);
  dials.forEach(({dial,pin},i)=>{
   dial.update(s.ratios[i]);
   pin.material=s.ratios[i]>=1?M.warning:s.ratios[i]>=threshold?M.light:M.off;
  });
  setting.set('SEUIL '+Math.round(threshold*100)+'%');
  rules.set('4 FLUX + GLOBAL');
  total.set('JOUR '+Math.floor(s.day));
  const hit=s.events.length;
  rack.rotation.z=hit*TAU/26;ratchet.rotation.z=-hit*TAU/12;
  envelope.position.y=37+Math.sin(t*.9)**2*5;
  result.set(hit+' ALERTES');
  stream.update(t);
 });
 a.controls={label:'Seuil d’alerte',min:50,max:100,step:5,fmt:v=>v+' %',get:()=>Math.round(threshold*100),set:v=>{threshold=clamp(v/100,.5,1);eventCache.clear();}};
 a.readout=t=>{const s=state(t);return 'Jour '+Math.floor(s.day)+' · '+s.events.length+' alertes · '+s.ratios.filter(v=>v>=1).length+' dépassement(s), simulation';};
 a.areas=[
 ['Budgets','Données de suivi et enveloppes'],
 ['Périmètres','CS, Locatif, MEC, PPTM'],
 ['Règles','Filtres PRG/PSE et conditions de contrôle'],
 ['Relais','Franchissement effectif des seuils'],
 ['Dispatch','Alertes produites sans doublons']
 ];return a;
}
export function buildPP(){
 const a=createAssembly('PREVENTION_DOCUMENT_LOGISTICS',278,114);
 const doc=a.zone(0,'Incoming PP',[coords[0],0,0],directions[0]),
 scanner=a.zone(1,'Validation scanner',[coords[1],0,0],directions[1]),
 calendar=a.zone(2,'Expiry mechanism',[coords[2],0,0],directions[2]),
 archive=a.zone(3,'Version vault',[coords[3],0,0],directions[3]),
 notification=a.zone(4,'Notifications',[coords[4],0,0],directions[4]);
 // Gravity paper elevator
 const magazine=block(doc,36,64,28,0,41,0,'graphite',{shell:true});
 const stack=Array.from({length:7},(_,i)=>paper(doc,0,14+i*5,0,18,18));
 const lift=block(doc,30,3,25,0,16,0,'bronze');
 const drive=gear(doc,12,18,20,42,16,'steel');
 label(doc,'DEPOT PP',0,84,19,30,6);
 // Dual inspection / capture head
 block(scanner,53,6,34,0,67,0,'graphite');
 for(let x of [-23,23])shaft(scanner,[x,9,0],[x,67,0],1.7,'steel');
 const ring=hoop(scanner,17,2,0,39,0,'bronze','y');
 const scan=block(scanner,39,4,26,0,45,0,'blue');
 const gate=block(scanner,19,7,16,0,24,0,'steel');
 const scanDisplay=readout(scanner,44,9,0,82,16);
 label(scanner,'CONTROLE CHAMPS',0,95,16,48,6);
 // Month wheel with numbered teeth and sliding time probe
 const monthRotor=new THREE.Group();monthRotor.position.set(0,50,0);calendar.add(monthRotor);
 const monthGear=gear(monthRotor,33,36,0,0,0,'bronze');
 for(let i=0;i<12;i++){
  const ang=i*TAU/12;
  const tile=block(monthRotor,10,8,3,Math.sin(ang)*25,Math.cos(ang)*25,4,'porcelain');
  tile.rotation.z=-ang;
 }
 const pointer=block(calendar,4,29,10,0,55,22,'copper');
 label(calendar,'12 ECHEANCES',0,95,14,44,7);
 // Mechanical archive shelves with 3 levels and moving elevator
 block(archive,52,81,34,0,46,0,'graphite',{shell:true});
 const drawers=[];
 for(let i=0;i<6;i++){
  const shelf=block(archive,41,2,29,0,17+i*11,0,'steel');
  const dossier=paper(archive,0,19+i*11,3,28,8);
  drawers.push(dossier);
 }
 const carrier=block(archive,41,5,22,0,26,19,'bronze');
 label(archive,'VERSIONS / ARCHIVES',0,98,18,54,6);
 // An autonomous clock motor + stop lever + printed relance
 const clock=gear(notification,25,30,0,48,0,'steel');
 const hand=block(notification,3,25,3,0,58,8,'copper');
 const paperOut=paper(notification,0,20,26,18,17);
 const relay=block(notification,38,17,26,0,14,15,'graphite');
 const out=readout(notification,38,9,0,86,15);
 label(notification,'RELANCES',0,99,15,34,6);
 const conveyor=documentStream(a.group,[[-111,30,0],[-60,41,0],[0,54,0],[59,47,0],[115,46,0]],6,18);
 a.animate(t=>{
  const day=40+Math.floor(phase(t,65)*185);
  stack.forEach((p,i)=>p.position.y=14+i*5+Math.sin(t*.3+i)*1.1);
  lift.position.y=16+Math.sin(t*.7)**2*9;drive.rotation.z=t*.55;
  ring.position.y=39+Math.sin(t*.9)*9;scan.position.x=12*Math.sin(t*1.3);
  gate.rotation.y=.18*Math.sin(t*2);
  scanDisplay.set('PP CONTROLES');
  monthRotor.rotation.z=day/365*TAU;
  pointer.rotation.z=day/365*TAU;
  drawers.forEach((d,i)=>d.position.z=3+(Math.floor(day/30)%6===i?12:0));
  carrier.position.y=26+Math.floor(day/37)%6*11;
  clock.rotation.z=t*.06;hand.rotation.z=-day/365*TAU;
  paperOut.position.y=20+(day%30<5?9:0);
  out.set('JOUR '+day);
  conveyor.update(t);
 });
 a.controls={label:'Jour de suivi',min:40,max:225,step:5,fmt:v=>'Jour '+v,get:t=>40+Math.floor(phase(t,65)*185),seek:v=>(v-40)*65/185};
 a.readout=t=>'Jour '+a.controls.get(t)+' · contrôle, archivage et échéances illustratifs';
 a.areas=[
 ['Dépôt','Plan de prévention reçu dans SharePoint'],
 ['Extraction','Champs, échéances et vérification qualité'],
 ['Échéances','Chronologie et surveillance mensuelle'],
 ['Historique','Classement et archivage du document'],
 ['Relances','Message déclenché par la date et les règles']
 ];return a;
}
export function buildPowerBI(){
 const a=createAssembly('RELATIONAL_REPORTING_ENGINE',285,124);
 const intake=a.zone(0,'Inputs',[coords[0],0,0],directions[0]),
 etl=a.zone(1,'Transform',[coords[1],0,0],directions[1]),
 join=a.zone(2,'Relations',[coords[2],0,0],directions[2]),
 measures=a.zone(3,'DAX measures',[coords[3],0,0],directions[3]),
 portal=a.zone(4,'HTML portal',[coords[4],0,0],directions[4]);
 // Two feeding towers PP and MOSO with a visible dispatch belt
 for(let i=0;i<2;i++){
  const z=i?20:-20;
  block(intake,26,60,27,0,41,z,'graphite',{shell:true});
  for(let j=0;j<5;j++)block(intake,21,3,21,0,22+j*9,z,i?'bronze':'silver');
  label(intake,i?'MOSO':'PP',0,83,z+16,25,6);
 }
 const feed=conveyor(intake,44);
 // Power Query -> physical sorting baffles / separators / gate
 block(etl,54,72,40,0,42,0,'graphite',{shell:true});
 const staging=Array.from({length:5},(_,i)=>{
  const x=(i-2)*9;
  const p=block(etl,7,33,28,x,47,0,i%2?'steel':'bronze');
  return p;
 });
 const filter=block(etl,40,5,34,0,20,0,'blue');
 const etlScreen=readout(etl,43,9,0,82,22);
 label(etl,'POWER QUERY',0,97,19,41,7);
 // Relational model: physical cross-linked three-dimensional tables
 const tableParts=[];
 for(let floor=0;floor<3;floor++){
  const y=19+floor*22;
  const plate=block(join,60,3,41,0,y,0,floor===1?'bronze':'steel');
  for(let j=0;j<3;j++){
   const node=cyl(join,3,5,-18+j*18,y+5,(floor%2?8:-9),'blue',16);
   tableParts.push(node);
  }
 }
 for(let i=0;i<4;i++)cable(join,[[-20+i*13,26,-10],[-20+i*13,48,0],[-20+i*13,69,9]],.9,i%2?'bronze':'blue');
 label(join,'RELATIONS',0,96,18,39,6);
 // Compute wheel and measures: gears visibly derive a number
 const big=gear(measures,24,32,0,48,0,'bronze');
 const sub=gear(measures,12,20,-30,29,1,'steel');
 const accum=readout(measures,39,10,0,90,17);
 block(measures,62,9,35,0,13,0,'graphite');
 const shaftOut=shaft(measures,[0,22,0],[0,50,0],2,'steel');
 label(measures,'CALCUL DAX',0,107,13,38,6);
 // Actual layered HTML-like physical screen kiosk with search drawers
 block(portal,58,79,27,0,48,0,'graphite',{shell:true});
 const panel=block(portal,52,58,3,0,52,16,'glass',{shell:true});
 const header=block(portal,48,6,2,0,72,19,'steel');
 const cards=Array.from({length:4},(_,i)=>block(portal,20,15,2,i%2?12:-12,56-Math.floor(i/2)*18,19,i%2?'bronze':'silver'));
 const query=readout(portal,47,10,0,86,18);
 label(portal,'PORTAIL HTML',0,103,17,42,6);
 const packets=documentStream(a.group,[[-110,50,0],[-60,42,0],[0,56,0],[56,54,0],[114,48,0]],7,14);
 a.animate(t=>{
  const hour=480+Math.floor(phase(t,48)*540),visits=Math.floor((hour-480)/12);
  feed.update(t);
  staging.forEach((p,i)=>p.position.y=47+4*Math.sin(t*.7+i*.8));
  filter.position.y=20+Math.sin(t*1.4)**2*9;
  etlScreen.set('CLEAN / JOIN');
  tableParts.forEach((p,i)=>p.material=(Math.floor(t*.8+i)%4===0)?M.light:M.blue);
  big.rotation.z=t*.15;sub.rotation.z=-t*.3;
  accum.set(visits+' RECHERCHES');
  cards.forEach((c,i)=>c.position.z=19+Math.sin(t*.3+i)**2*3);
  query.set('PP / MOSO '+(visits%40+1));
  packets.update(t);
 });
 a.controls={label:'Heure',min:480,max:1020,step:30,fmt:v=>Math.floor(v/60)+'h'+String(v%60).padStart(2,'0'),get:t=>480+Math.floor(phase(t,48)*540),seek:v=>(v-480)/540*48};
 a.readout=t=>a.controls.fmt(a.controls.get(t))+' · ingestion, relations, DAX et consultation de démonstration';
 a.areas=[
 ['Sources','PP, marchés et données de prévention'],
 ['ETL','Préparation et contrôle Power Query'],
 ['Relations','Correspondances entre tables'],
 ['Calculs','Mesures et indicateurs DAX'],
 ['Restitution','Portail HTML, CSS et navigation']
 ];return a;
}

// Machines documentaires V3 : 4 conceptions totalement nouvelles.
// Ni import ni réutilisation des anciennes géométries du portfolio.
import * as THREE from 'three';
import {P,M,clamp,ease,lerp,phase,createAssembly,block,cyl,cone,shaft,hoop,gear,cable,label,readout,paper,documentStream,drivePair,gauge,glassTower} from './premium-core.js';

const TAU=Math.PI*2;
const slide=(v,a,b)=>ease((v-a)/(b-a));
const status=(g,x,y,z)=>cyl(g,2,1,x,y,z,'off',14);
function chainFrame(g,x,y,z,w=30,d=30,h=38){
 for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])shaft(g,[x+dx,y,z+dz],[x+dx,y+h,z+dz],1.25,'steel');
 block(g,w+3,2,d+3,x,y+h,z,'silver');
}
function bar(g,x,y,z,w=26){const b=block(g,w,2,5,x,y,z,'bronze');return b;}
function conveyor(g,len=38,w=17,y=8){
 const bed=block(g,len,3,w,0,y,0,'graphite');const rollers=[];
 for(let x=-len/2+4;x<len/2-2;x+=7){
  const r=cyl(g,2,w-1,x,y+2,0,'silver',14);r.rotation.x=Math.PI/2;rollers.push(r);
 }
 return{update(t){rollers.forEach(r=>r.rotation.z=t*2);},bed};
}
const axis=[[-18,30,0],[-11,27,-24],[0,38,12],[14,28,25],[30,23,0]];
const areas={cerfa:[
 ['Alimentation','Lots de fiches CERFA et attestations'],
 ['Lecture','Scanner des deux pages et extraction'],
 ['Contrôles','Vérification des dates et cohérences'],
 ['Répartition','Routage conforme, doublon, non-conforme ou retard'],
 ['Sortie','Consolidation des anomalies et export']],
 vm:[
 ['Entrées','Dépôts, OT et demandes SharePoint'],
 ['Traitement','VM autorisée et contrôles R004/OT'],
 ['Verrou','Exclusivité de l’écriture Excel'],
 ['Historique','Éviction des doublons et confirmation'],
 ['Restitution','Récapitulatif des inscriptions vérifiées']],
 vre:[
 ['Rapports','Documents et pages entrants'],
 ['Reconnaissance','Lecture et identification des locaux'],
 ['Affectation','Rattachement au bâtiment'],
 ['Tri BT','Quatre familles BT31, BT33, BT21, BT11'],
 ['PAM SSI','Comptages vérifiés pour maintenance']],
 moteur:[
 ['Source','Rapports SharePoint et identifiants OT'],
 ['Index','Carrousel des lignes de suivi'],
 ['Rapprochement','Comparaison des identifiants'],
 ['Report','Tampon Q18 et données extraites'],
 ['Synthèse','Suivi Excel disponible dans Power BI']]
};

export function buildCerfa(){
 const a=createAssembly('Trieuse documentaire CERFA',260,112);
 const f=a.zone(0,'Feeder',[-94,0,0],axis[0]),scan=a.zone(1,'Double scanner',[-46,0,0],axis[1]),
 ctrl=a.zone(2,'Quality gates',[5,0,0],axis[2]),sort=a.zone(3,'Diverter',[52,0,0],axis[3]),
 out=a.zone(4,'Four outputs',[99,0,0],axis[4]);
 label(f,'CHARGEUR',0,6,24,27,6);block(f,32,39,24,0,32,0,'steel',{shell:true});
 block(f,28,32,20,0,33,0,'glass',{shell:true});block(f,35,4,26,0,53,0,'graphite');
 const feedGear=gear(f,9,14,17,20,13,'bronze'),drive=gear(f,6,12,27,20,13,'steel');
 const lift=paper(f,0,18,1,17,20);const gate=block(f,2,15,23,18,14,0,'copper');
 const c1=conveyor(scan,44,19,11);
 chainFrame(scan,0,9,0,37,28,48);
 const scanner=block(scan,40,8,30,0,54,0,'graphite',{shell:true});
 const glass=block(scan,36,3,24,0,44,0,'glass',{shell:true});
 const beam=block(scan,34,1,23,0,40,0,'blue');
 label(scan,'OCR 2 PAGES',0,58,16,30,6);
 const r1=drivePair(ctrl,0,30,13,{r:10});
 const filters=[-12,0,12].map((x,i)=>{block(ctrl,8,36,20,x,26,0,'steel',{shell:true});
  const t=block(ctrl,7,12,17,x,27,2,i===2?'copper':'silver');return t;});
 const gauge1=gauge(ctrl,0,59,19,9);
 label(ctrl,'REGLES',0,70,15,26,6);
 const belt=conveyor(sort,50,22,12);
 const diverters=[];
 for(let i=0;i<4;i++){
  const v=block(sort,2,20,16,-17+i*11,24,0,'bronze');
  v.position.x=-17+i*11;diverters.push(v);
 }
 const lamp=Array.from({length:4},(_,i)=>{const b=cyl(sort,2,1,-17+i*11,44,0,'off');return b;});
 const labels=['OK','DOUBLON','NON CONF.','RETARD'];
 const trays=[];
 labels.forEach((name,i)=>{
  const z=-32+i*21;
  block(out,34,3,18,0,6,z,'graphite');
  block(out,2,13,18,-16,13,z,'silver');
  block(out,2,13,18,16,13,z,'silver');
  const p=paper(out,0,9,z,13,13);trays.push(p);
  label(out,name,0,24,z+8,29,5);
 });
 const display=readout(out,27,8,0,50,0);
 const packets=documentStream(a.group,[[-82,21,0],[-46,35,0],[-8,24,0],[48,25,0],[100,21,0]],5,14);
 const controls={label:'Taille du lot',min:50,max:500,step:50,fmt:v=>v+' fiches',value:300,get(){return this.value;},set(v){this.value=v;},seek(){return null;}};
 const classify=(i)=>i%29===0?3:i%17===0?1:i%13===0?2:0;
 const sums=Array.from({length:501},()=>[0,0,0,0]);
 for(let i=0;i<500;i++){sums[i+1]=sums[i].slice();sums[i+1][classify(i)]++;}
 const analysed=t=>Math.floor(controls.value*Math.min(1,phase(t,50)*1.35));
 a.animate(t=>{
  const step=phase(t,7);
  feedGear.rotation.z=t*.9;drive.rotation.z=-t*1.3;
  lift.position.y=18+18*Math.max(0,1-Math.abs(step-.3)*3);
  gate.position.y=14+(step>.1&&step<.45?7:0);
  c1.update(t);belt.update(t);r1.update(t);
  beam.position.x=17*Math.sin(t*2.4);beam.material=M.light;
  filters.forEach((b,i)=>b.position.y=27+5*Math.sin(t*2+i));
  const done=analysed(t),family=classify(Math.min(499,done));
  diverters.forEach((d,i)=>{d.rotation.y=i===family?-.55:0;lamp[i].material=i===family?M.light:M.off;});
  display.set(done+' / '+controls.value);
  trays.forEach((p,i)=>p.position.y=9+Math.sin(t*.7+i)*.45);
  gauge1.update(done/Math.max(1,controls.value));
  packets.update(t);
 });
 a.controls=controls;
 a.readout=t=>{const n=analysed(t),counts=sums[n];
  return n+' fiches analysées · '+counts[1]+' doublons · '+counts[2]+' anomalies · '+counts[3]+' retards (fictif)';};
 a.areas=areas.cerfa;return a;
}

const VM_START=480,VM_STOP=1020,VM_FAILURE=13*60+10;
const vmEvents=Array.from({length:20},(_,i)=>({
  minute:VM_START+12+i*24,ot:'41'+String(37500+i*193).padStart(5,'0'),duplicate:i===11
}));
vmEvents[11].ot=vmEvents[4].ot;
const vmDone=(minute)=>vmEvents.filter(x=>x.minute+7<=minute);
export function buildVM(){
 const a=createAssembly('Centrale VM à verrou exclusif',288,124);
 const inlet=a.zone(0,'Document buffer',[-107,0,0],axis[0]),
 primary=a.zone(1,'VM controller',[-58,0,0],axis[1]),
 lock=a.zone(2,'Exclusive interlock',[-2,0,0],axis[2]),
 history=a.zone(3,'Evidence archive',[55,0,0],axis[3]),
 result=a.zone(4,'Excel confirmation',[110,0,0],axis[4]);
 // Transparent FIFO rack and four input documents
 block(inlet,39,53,34,0,29,0,'steel',{shell:true});
 block(inlet,31,41,29,0,31,0,'glass',{shell:true});
 const fifo=[0,1,2,3,4].map((i)=>paper(inlet,0,13+i*6,0,16,19));
 const front=readout(inlet,29,9,0,63,18);label(inlet,'FIFO · 2 MIN',0,72,18,31,6);
 const primCab=block(primary,39,61,35,0,40,0,'graphite',{shell:true});
 const vmFace=block(primary,31,37,3,0,49,19,'glass',{shell:true});
 const twin=block(primary,31,29,24,0,42,-39,'steel',{shell:true});
 const twinScreen=block(primary,25,12,2,0,46,-25,'blue');
 label(primary,'VM PRINCIPALE',0,79,18,35,6);
 const ports=[-9,0,9].map(x=>cyl(primary,2,2,x,17,20,'bronze'));
 const leds=[-8,3,14].map(x=>cyl(primary,2.2,1,x,69,20,'off'));
 const activeScreen=readout(primary,30,9,0,47,21);
 // Exclusive lock: only one key can occupy the writable position
 chainFrame(lock,0,12,0,46,39,64);
 const gearA=gear(lock,12,19,-12,47,23,'bronze');
 const gearB=gear(lock,12,19,14,47,23,'steel');
 const key=block(lock,23,6,5,0,43,31,'copper');
 const barlock=block(lock,46,4,5,0,28,31,'graphite');
 const lockLamp=cyl(lock,3.6,1,0,73,22,'green');
 label(lock,'VERROU UNIQUE',0,82,22,39,7);
 // Rotating history register with irreversible duplicate rejection
 const drum=new THREE.Group();drum.position.set(0,43,0);history.add(drum);
 const torus=hoop(drum,25,4,0,0,0,'steel','y');
 for(let i=0;i<12;i++){let angle=i*Math.PI/6;
  const plate=block(drum,13,3,11,Math.sin(angle)*23,Math.cos(angle)*23,0,i%3?'porcelain':'bronze');
  plate.rotation.z=-angle; }
 const duplicator=block(history,31,6,14,0,14,24,'graphite');
 const discard=paper(history,0,13,-24,14,17);
 label(history,'HISTORIQUE',0,83,18,32,7);
 // Excel line writer and confirmed report printer
 block(result,45,52,32,0,34,0,'silver',{shell:true});
 block(result,38,18,4,0,44,19,'graphite');
 const saved=readout(result,35,9,0,44,22);
 const print=block(result,29,16,27,0,11,27,'graphite');
 const page=paper(result,0,22,28,14,17);
 const stamp=block(result,13,9,9,0,38,30,'bronze');
 label(result,'EXCEL · 17 H',0,68,18,34,7);
 // Deliberately physical cables and threaded data pipes
 const conductor=[[-105,34,4],[-74,39,4],[-57,44,0],[-25,44,0],[-2,47,0],[29,46,0],[55,43,0],[81,44,0],[110,43,0]];
 const flow=documentStream(a.group,conductor,6,17);
 let scenario='normal';
 const calc=t=>{
  const min=Math.min(VM_STOP,VM_START+((t%150)+150)%150*3.6);
  const time=scenario==='incident'?Math.min(min,VM_FAILURE):min;
  const finished=vmDone(time);
  const done=finished.filter(e=>!e.duplicate).length,dup=finished.filter(e=>e.duplicate).length;
  const active=vmEvents.find(e=>e.minute<=time&&e.minute+7>time);
  return {time,done,dup,active,failed:scenario==='incident'&&min>=VM_FAILURE};
 };
 a.animate(t=>{
  const s=calc(t),turn=t*1.2;
  fifo.forEach((p,i)=>{p.position.y=13+i*6-(s.done%5)*.8;});
  gearA.rotation.z=s.failed?0:turn;gearB.rotation.z=s.failed?0:-turn;
  key.position.x=s.failed?-20:(s.active?Math.sin(t*.7)*6:0);
  lockLamp.material=s.failed?M.warning:M.light;
  drum.rotation.z=-(s.done+s.dup)*Math.PI/6;
  leds[0].material=s.failed?M.warning:M.light;
  leds[1].material=s.active?M.green:M.off;
  leds[2].material=s.dup?M.warning:M.off;
  activeScreen.set(s.active?s.active.ot:'EN ATTENTE');
  front.set(String(20-s.done-s.dup).padStart(2,'0')+' EN FILE');
  saved.set(s.done+' VALIDÉS');
  stamp.position.y=38+(s.active?Math.sin(t*8)*4:0);
  page.position.y=22+(s.time>1000?12:0);
  flow.update(t);
 });
 a.controls={label:'Heure',min:VM_START,max:VM_STOP,step:30,fmt:v=>String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0'),get:t=>calc(t).time,seek:v=>(v-VM_START)/3.6};
 a.scenarios=[
 {id:'normal',label:'Cycle normal',note:'Traitement illustratif de 20 dépôts fictifs, un seul droit d’écriture.'},
 {id:'duplicate',label:'Doublon',note:'Le registre reconnaît le second OT et empêche une deuxième inscription.'},
 {id:'incident',label:'Arrêt VM',note:'La VM principale s’arrête. Le transfert automatique reste une architecture cible non validée.'}
 ];
 a.setScenario=id=>{if(a.scenarios.some(s=>s.id===id))scenario=id;};
 a.scenarioStart=id=>id==='duplicate'?(vmEvents[11].minute-VM_START-4)/3.6:id==='incident'?(VM_FAILURE-VM_START-3)/3.6:0;
 a.readout=t=>{const s=calc(t);return Math.floor(s.time/60)+'h'+String(Math.floor(s.time%60)).padStart(2,'0')+' · '+s.done+' inscrits · '+s.dup+' doublon(s)'+(s.failed?' · VM arrêtée':'');};
 a.areas=areas.vm;return a;
}

export function buildVRE(){
 const a=createAssembly('Tour de classification VRE',270,118);
 const input=a.zone(0,'Pages',[-107,0,0],axis[0]),recognition=a.zone(1,'Document reading',[-56,0,0],axis[1]),
 location=a.zone(2,'Facility mapping',[0,0,0],axis[2]),classify=a.zone(3,'Four counters',[57,0,0],axis[3]),
 pam=a.zone(4,'PAM dashboard',[113,0,0],axis[4]);
 // Sheet elevator with physical scroll
 const feed=block(input,34,67,28,0,34,0,'graphite',{shell:true});
 block(input,31,55,29,0,36,0,'glass',{shell:true});
 const stack=Array.from({length:8},(_,i)=>paper(input,0,12+i*5,0,18,16));
 const drive=gear(input,12,18,19,48,17,'bronze');label(input,'RAPPORT PDF',0,80,18,32,6);
 // Orbiting scan rings around vertical paper
 for(let j=0;j<3;j++)hoop(recognition,18+j*4,1,0,25+j*15,0,j%2?'blue':'steel','y');
 const scanRing=hoop(recognition,22,2,0,40,0,'bronze','y');
 const page=paper(recognition,0,44,0,20,22);
 block(recognition,39,4,34,0,12,0,'graphite');
 label(recognition,'SCAN + LOCAUX',0,78,0,36,6);
 // Building model, 3 floors, 4 offices, localized objects
 const building=new THREE.Group();location.add(building);building.position.y=13;
 for(let floor=0;floor<3;floor++){
  block(building,45,2,28,0,floor*19,0,'steel');
  for(let room=0;room<4;room++)block(building,1.4,16,25,-17+room*11,floor*19+9,0,'glass',{shell:true});
 }
 block(location,45,3,30,0,13,0,'graphite');
 const buildingGauge=readout(location,34,8,0,79,17);label(location,'BAT / LOCAL',0,88,16,36,6);
 // Four real measurement cylinders with visible rising fill
 const names=['BT31','BT33','BT21','BT11'];
 const buildingCounts=Array.from({length:9},(_,b)=>[9+(b*7)%19,4+(b*3)%11,8+(b*5)%15,3+(b*2)%8]);
 const counters=[];
 names.forEach((name,i)=>{
  const x=(i-1.5)*24;
  glassTower(classify,x,13,0,8,54);
  const fill=cyl(classify,5,1,x,15,0,i%2?'blue':'bronze',24);
  const base=cyl(classify,8,2,x,14,0,'graphite');
  const disp=readout(classify,21,8,x,78,10);
  label(classify,name,x,88,11,21,5);
  counters.push({fill,disp,x});
 });
 // Electrical PAM console, four needle gauges and a result board
 block(pam,64,59,18,0,44,0,'graphite',{shell:true});
 const screen=readout(pam,55,13,0,66,10);
 const needles=Array.from({length:4},(_,i)=>gauge(pam,-22+i*14,39,10,6));
 const archive=Array.from({length:6},(_,i)=>block(pam,43,2,4,0,14+i*5,17,'silver'));
 label(pam,'PLAN MAINTENANCE',0,84,10,54,6);
 const stream=documentStream(a.group,[[-105,27,0],[-55,43,0],[0,50,0],[58,39,0],[109,54,0]],6,16);
 a.animate(t=>{
  drive.rotation.z=t*.9;
  stack.forEach((p,i)=>p.position.y=12+i*5+Math.sin(t*.7+i)*.6);
  scanRing.position.y=40+22*Math.sin(t*.5);
  page.rotation.y=Math.sin(t*.4)*.3;
  const b=Math.floor(phase(t,21)*9)+1;buildingGauge.set('BAT '+b+' / 03');
  counters.forEach((c,i)=>{
   const count=buildingCounts[b-1][i];
   c.fill.scale.y=Math.max(.5,count*2.1);c.fill.position.y=13+Math.max(.5,count*2.1)*.5;
   c.disp.set(names[i]+' '+count);needles[i].update(count/30);
  });
  screen.set('BT : '+buildingCounts[b-1].reduce((u,v)=>u+v,0));
  stream.update(t);
 });
 a.controls={label:'Bâtiment',min:1,max:9,step:1,fmt:v=>'Bâtiment '+v,get:t=>Math.floor(phase(t,21)*9)+1,seek:v=>(v-1)*21/9};
 a.readout=t=>'Bâtiment '+a.controls.get(t)+' · familles BT31 / BT33 / BT21 / BT11 · données de démonstration';
 a.areas=areas.vre;return a;
}
export function buildQ18(){
 const a=createAssembly('Reporteur Q18 robotisé',266,112);
 const source=a.zone(0,'Intake',[-108,0,0],axis[0]),wheel=a.zone(1,'Rotary index',[-43,0,0],axis[1]),
 match=a.zone(2,'Match station',[12,0,0],axis[2]),stamp=a.zone(3,'Q18 reporter',[62,0,0],axis[3]),
 results=a.zone(4,'Export',[110,0,0],axis[4]);
 const trays=Array.from({length:5},(_,i)=>paper(source,0,15+i*4,0,19,20));
 const spinner=gear(source,11,18,17,30,15,'bronze');
 chainFrame(source,0,10,0,32,34,55);label(source,'OT / PDF',0,72,20,28,6);
 // Deep central rotary rack with 18 individually indexed physical files
 const roll=new THREE.Group();roll.position.set(0,46,0);wheel.add(roll);
 const axle=cyl(roll,16,45,0,0,0,'graphite');axle.rotation.z=Math.PI/2;
 for(let i=0;i<18;i++){
  const angle=i*TAU/18;
  const leaf=block(roll,30,2,11,0,Math.cos(angle)*29,Math.sin(angle)*29,i%4===0?'bronze':'porcelain');
  leaf.rotation.x=angle;
  block(leaf,17,.5,1,0,1,0,'blue');
 }
 hoop(wheel,34,2,0,46,0,'bronze','x');
 const driver=gear(wheel,9,15,27,19,28,'steel');
 label(wheel,'RECHERCHE LIGNE',0,92,27,45,6);
 // Key comparator with two opposing jaws
 chainFrame(match,0,10,0,46,39,56);
 const jaws=[block(match,8,15,19,-13,45,0,'bronze'),block(match,8,15,19,13,45,0,'steel')];
 const identifier=readout(match,39,8,0,76,20);
 const ok=status(match,0,87,17);label(match,'MATCH OT',0,96,17,31,5);
 // Stepper press and genuine raised Q18 tab
 block(stamp,51,6,28,0,57,0,'steel');
 shaft(stamp,[0,58,0],[0,22,0],3,'graphite');
 const ram=block(stamp,25,9,19,0,36,0,'bronze');
 const record=paper(stamp,0,13,0,22,18);
 const tab=block(stamp,11,4,4,0,18,7,'amber');
 label(stamp,'TAMPON Q18',0,78,16,36,6);
 // Power BI exports, two sliding drawers
 block(results,43,62,32,0,40,0,'graphite',{shell:true});
 const output=readout(results,34,12,0,65,18);
 const lids=[0,1,2].map(i=>block(results,32,4,6,0,21+i*13,20,'silver'));
 label(results,'EXCEL / POWER BI',0,85,14,42,6);
 const packets=documentStream(a.group,[[-108,25,0],[-44,47,0],[12,45,0],[62,42,0],[109,45,0]],5,17);
 const records=36;
 a.animate(t=>{
  const idx=Math.floor(phase(t,18)*records),u=phase(t,18)*records-idx;
  spinner.rotation.z=t*.9;driver.rotation.z=t*1.1;
  roll.rotation.x=idx*TAU/records+ease(u)*TAU/records;
  jaws[0].position.x=-13+5*Math.sin(t*3)**2;jaws[1].position.x=13-5*Math.sin(t*3)**2;
  identifier.set('OT '+(4100000+idx*713));
  ok.material=u>.6?M.green:M.off;
  ram.position.y=36-12*Math.max(0,Math.sin(t*2.7));
  tab.visible=u>.65;output.set('Q18 : '+(idx%4===0?'OUI':'NON'));
  lids.forEach((p,i)=>p.position.z=20+Math.max(0,Math.sin(t*.6+i))*7);
  packets.update(t);
 });
 a.controls={label:'Rapport',min:1,max:36,step:1,fmt:v=>'Rapport '+v+' / 36',get:t=>1+Math.floor(phase(t,18)*36),seek:v=>(v-1)*18/36};
 a.readout=t=>'OT '+(4100000+(a.controls.get(t)-1)*713)+' · indexation et report Q18 fictifs';
 a.areas=areas.moteur;return a;
}

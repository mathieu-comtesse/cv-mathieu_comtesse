const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {RoadRun}=require('../road-core.js');
// Model: accidents are counted and the run goes on, an infraction flashes, a posted limit is enforced.
{const run=new RoadRun(7);for(let i=0;i<600&&run.running;i++)run.step(.016,{gas:true});assert(run.speed>0||run.collisions>0);
 const car=run.objects.find(o=>o.type==='car');assert(car&&car.name&&car.length,'vehicles carry a name and size');
 run.limit=30;run.speed=80;run.speeding=0;run.stun=0;for(let i=0;i<120&&run.running;i++)run.step(.016,{gas:true});assert(run.violations>=1&&run.flash>0,'speeding is an infraction that flashes');
 const crashRun=new RoadRun(7);crashRun.speed=60;crashRun.crash('Test');assert(crashRun.collisions===1&&crashRun.running&&!crashRun.crashed&&crashRun.speed===0,'un accident est compté sans arrêter le trajet');
 const d0=crashRun.distance;crashRun.step(.016,{gas:true});assert(crashRun.distance===d0,'la voiture est sonnée juste après le choc');
 for(let i=0;i<120;i++)crashRun.step(.016,{gas:true});assert(crashRun.speed>5,'puis elle repart');
 const wreck=new RoadRun(7);for(let i=0;i<6&&wreck.running;i++){wreck.stun=0;wreck.speed=120;wreck.crash('Choc');}assert(wreck.crashed&&!wreck.running&&wreck.damage>=100,'les dégâts cumulés finissent par immobiliser la voiture');
 assert(['Maintenir','Freiner','Changer de voie','Arrêt d’urgence'].includes(run.advice.action),'advice is computed');}
// Dynamics: quick pedals, 220 km/h top speed, a sharp wheel, reverse after holding the brake at a standstill.
const bare=seed=>{const r=new RoadRun(seed);r.objects=[];r.scenery=[];r.populate=()=>{};return r;};
{const {TOP}=require('../road-core.js');const run=bare(11);
 for(let i=0;i<6;i++)run.step(.016,{gas:true});assert(run.throttle>.5,'l’accélérateur répond en moins d’un dixième de seconde');
 for(let i=0;i<4000&&run.speed<TOP-1.5;i++){run.x=25;run.heading=0;run.step(.02,{gas:true});}assert(TOP===220&&run.speed>218,'vitesse de pointe 220 km/h : '+run.speed.toFixed(0));
 const steer=bare(11);steer.speed=60;const x0=steer.x;for(let i=0;i<30;i++)steer.step(.016,{right:true});assert(steer.x-x0>12,'la direction réagit vite ('+(steer.x-x0).toFixed(1)+')');
 const back=bare(11);for(let i=0;i<90;i++)back.step(.016,{brake:true});assert(back.speed<-3,'marche arrière en maintenant le frein à l’arrêt');}
// Cyclists: overtaking closer than 1,5 m is an infraction, hitting one is an accident with a victim, and they are on the roads.
{const bike=d=>({type:'bike',d,lane:92,velocity:5,width:8,length:20,passed:false,tone:0});
 const run=bare(5);run.objects=[bike(20)];run.x=76;run.speed=60;const seen=[];
 for(let i=0;i<120;i++){run.step(.016,{gas:true});seen.push(run.message);}assert(seen.some(m=>/1,5 m/.test(m))&&!run.collisions,'dépassement trop serré signalé');
 const hit=bare(5);hit.objects=[bike(15)];hit.x=92;hit.speed=50;
 for(let i=0;i<120&&!hit.collisions;i++)hit.step(.016,{gas:true});assert(hit.collisions===1&&hit.victims===1&&hit.running,'cycliste percuté : accident et victime, le trajet continue');
 const gen=new RoadRun(9);let bikes=new Set();for(let k=0;k<40;k++){gen.distance+=55;gen.populate();gen.objects.filter(o=>o.type==='bike').forEach(o=>bikes.add(o));}assert(bikes.size>=2,'des cyclistes circulent ('+bikes.size+')');}
// Off road: the verge drags and counts, the ditch jolts, the countryside beyond is drivable and its trees are accidents.
const {center}=require('../road-core.js');
{const verge=new RoadRun(3);verge.speed=80;verge.x=130;verge.step(.03,{});
 assert(verge.offroadNow&&verge.offroad>0,'hors chaussée, le bas-côté est compté');
 assert(verge.speed<80,'le bas-côté freine la voiture');
 assert(verge.violations>=1&&/Sortie de route/.test(verge.message),'la sortie de route est signalée : '+verge.message);
 const field=bare(3);field.x=500;field.speed=40;for(let i=0;i<100;i++)field.step(.016,{gas:true});assert(field.running&&field.x>400&&field.speed>20,'on roule dans les champs au-delà du fossé');
 const ditch=bare(3);ditch.x=255;ditch.speed=30;for(let i=0;i<40;i++)ditch.step(.016,{gas:true,right:true});assert(ditch.x>262&&!ditch.collisions,'le fossé se franchit lentement sans accident');
 const run=new RoadRun(3);run.speed=80;
 const tree=run.scenery.find(o=>o.kind<3&&o.d>run.distance+8);assert(tree,'le décor comporte des arbres');
 run.distance=tree.d-2;run.x=tree.x+center(tree.d)-center(run.distance);run.step(.03,{});
 assert(run.collisions===1&&/Sortie de route/.test(run.message)&&run.running,'percuter un arbre est un accident, pas la fin : '+run.message);
 assert(run.scenery.some(o=>Math.abs(o.x)>600),'le décor s’étend loin de la route');}
{let off=0;for(let seed=1;seed<=8;seed++){const run=new RoadRun(seed);let n=0;
  while(run.running&&n<3000){run.step(.03,{gas:n<25||n>60,right:n>25});n++;}
  if(run.offroad>0)off++;}
 assert(off>=3,`braquer vers le bas-côté y emmène vraiment la voiture (${off}/8)`);}
// Browser script: keyboard mapping, pause on blur, resume, end-of-run report.
const events={},els={};const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>{})});
function el(id){return els[id]??=( {value:id==='drug'?'none':'0',dataset:{},textContent:'',getContext:()=>ctx,getBoundingClientRect:()=>({width:800,height:650}),replaceChildren(){},setPointerCapture(){},focus(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},style:{}})}
let frame;const env={document:{getElementById:el,querySelectorAll:()=>[],createElement:()=>el('offscreen')},window:{addEventListener:(n,fn)=>events[n]=fn},matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:fn=>frame=fn,Math};env.window.RoadModel=require('../road-core.js');
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../route-vigilance.js'),'utf8'),env);let now=0;const tick=n=>{for(let i=0;i<n;i++)frame(now+=16)};const key=(type,code,key)=>events[type]({code,key,target:{tagName:'CANVAS'},preventDefault(){}});
el('duration').value='90';els['road-start'].onclick();key('keydown','ShiftLeft','Shift');tick(120);key('keyup','ShiftLeft','Shift');assert(+els['road-canvas'].dataset.speed>25&&+els['road-canvas'].dataset.speed<90,'vive accélération : '+els['road-canvas'].dataset.speed);key('keydown','ControlLeft','Control');for(let i=0;i<200&&+els['road-canvas'].dataset.speed>0;i++)tick(1);key('keyup','ControlLeft','Control');assert(Math.abs(+els['road-canvas'].dataset.speed)<=1,'arrêt au frein');
key('keydown','ShiftLeft','Shift');tick(150);events.blur();const before=els['road-canvas'].dataset.distance;tick(50);assert.equal(els['road-canvas'].dataset.distance,before);els['road-start'].onclick();tick(6000);assert.equal(els['road-canvas'].dataset.running,'false');assert(/[Tt]rajet/.test(els['road-results'].innerHTML),'bilan affiché');assert(/ne pas prendre le volant/.test(els['road-results'].innerHTML),'message de prévention');console.log('PASS: modèle (accidents cumulés, épave, infractions, conseil), dynamique (220 km/h, direction, marche arrière), cyclistes, hors-piste et commandes');

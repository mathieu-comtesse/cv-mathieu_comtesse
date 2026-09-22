const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {RoadRun}=require('../road-core.js');
// Model: a collision ends the run, an infraction flashes, a posted limit is enforced.
{const run=new RoadRun(7);for(let i=0;i<600&&run.running;i++)run.step(.016,{gas:true});assert(run.speed>0||run.crashed);
 const car=run.objects.find(o=>o.type==='car');assert(car&&car.name&&car.length,'vehicles carry a name and size');
 run.limit=30;run.speed=80;run.speeding=0;for(let i=0;i<120&&run.running;i++)run.step(.016,{gas:true});assert(run.violations>=1&&run.flash>0,'speeding is an infraction that flashes');
 const crashRun=new RoadRun(7);crashRun.crash('Test');assert(crashRun.crashed&&!crashRun.running&&crashRun.speed===0,'a crash stops the run');crashRun.step(.016,{gas:true});assert(crashRun.distance===0,'nothing moves after a crash');
 assert(['Maintenir','Freiner','Changer de voie','Arrêt d’urgence'].includes(run.advice.action),'advice is computed');}
// Leaving the tarmac is allowed: the verge drags and counts, and the trees beyond it end the run.
const {center}=require('../road-core.js');
{const verge=new RoadRun(3);verge.speed=80;verge.x=200;verge.step(.03,{});
 assert(verge.offroadNow&&verge.offroad>0,'hors chaussée, le bas-côté est compté');
 assert(verge.speed<80,'le bas-côté freine la voiture');
 assert(verge.violations>=1&&/Sortie de route/.test(verge.message),'la sortie de route est signalée : '+verge.message);
 const run=new RoadRun(3);run.speed=80;
 const tree=run.scenery.find(o=>o.kind<4&&o.d>run.distance+8);assert(tree,'le décor comporte des arbres');
 run.distance=tree.d-2;run.x=tree.x+center(tree.d)-center(run.distance);run.step(.03,{});
 assert(run.crashed&&/Sortie de route/.test(run.message),'le décor arrête la voiture : '+run.message);}
{let off=0;for(let seed=1;seed<=8;seed++){const run=new RoadRun(seed);let n=0;
  while(run.running&&n<3000){run.step(.03,{gas:n<25||n>60,right:n>25});n++;}
  if(run.offroad>0)off++;}
 assert(off>=3,`braquer vers le bas-côté y emmène vraiment la voiture (${off}/8)`);}
// Browser script: keyboard mapping, pause on blur, resume, end-of-run report.
const events={},els={};const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>{})});
function el(id){return els[id]??=( {value:id==='drug'?'none':'0',dataset:{},textContent:'',getContext:()=>ctx,getBoundingClientRect:()=>({width:800,height:650}),replaceChildren(){},setPointerCapture(){},focus(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},style:{}})}
let frame;const env={document:{getElementById:el,querySelectorAll:()=>[],createElement:()=>el('offscreen')},window:{addEventListener:(n,fn)=>events[n]=fn},matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:fn=>frame=fn,Math};env.window.RoadModel=require('../road-core.js');
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../route-vigilance.js'),'utf8'),env);let now=0;const tick=n=>{for(let i=0;i<n;i++)frame(now+=16)};const key=(type,code,key)=>events[type]({code,key,target:{tagName:'CANVAS'},preventDefault(){}});
els['road-start'].onclick();key('keydown','ShiftLeft','Shift');tick(120);key('keyup','ShiftLeft','Shift');assert(+els['road-canvas'].dataset.speed>12&&+els['road-canvas'].dataset.speed<40,'progressive acceleration');key('keydown','ControlLeft','Control');tick(80);key('keyup','ControlLeft','Control');assert.equal(+els['road-canvas'].dataset.speed,0);
key('keydown','ShiftLeft','Shift');tick(150);events.blur();const before=els['road-canvas'].dataset.distance;tick(50);assert.equal(els['road-canvas'].dataset.distance,before);els['road-start'].onclick();tick(6000);assert.equal(els['road-canvas'].dataset.running,'false');assert(els['road-results'].textContent.includes('Trajet')||els['road-results'].textContent.includes('Accident'));console.log('PASS: modèle (accident, infraction, limitation, conseil) et commandes (Maj, Ctrl, pause au blur, reprise, bilan)');

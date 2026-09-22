// The sound is the feedback loop: the engine note must follow the revs (climb inside a gear, drop on the
// shift), the tyres must follow the speed, and the brakes must only squeal when they are actually biting.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const log=[];
function param(name,kind,id){return {_v:0,get value(){return this._v;},set value(v){this._v=v;},
 setTargetAtTime(v){this._v=v;log.push({kind,name,v,id});},setValueAtTime(v){this._v=v;},
 exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}};}
let id=0;
const node=kind=>{const i=id++,n={kind,id:i,connect:d=>d,start(){},stop(){},buffer:null,loop:false,type:'',Q:param('Q',kind,i)};
 n.gain=param('gain',kind,i);n.frequency=param('frequency',kind,i);n.detune=param('detune',kind,i);
 n.setPeriodicWave=()=>{};return n;};
class Ctx{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination=node('dest');}
 createGain(){return node('gain');}createOscillator(){return node('osc');}createBiquadFilter(){return node('filter');}
 createBufferSource(){return node('src');}createPeriodicWave(re,im){assert(re.length===im.length&&re.length>1,'periodic wave needs matching real and imaginary parts');return {};}
 createBuffer(ch,len){assert(len>0);return {getChannelData:()=>new Float32Array(len)};}resume(){}}
const els={};function el(id){return els[id]??=({value:id==='drug'?'none':'0',dataset:{},textContent:'',getContext:()=>new Proxy({createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>{})}),getBoundingClientRect:()=>({width:800,height:650}),replaceChildren(){},setPointerCapture(){},focus(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},style:{}});}
const events={};let frame;
const env={document:{getElementById:el,querySelectorAll:()=>[],createElement:()=>el('offscreen')},
 window:{addEventListener:(n,fn)=>events[n]=fn,AudioContext:Ctx},matchMedia:()=>({matches:false}),
 ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:fn=>frame=fn,Math,setTimeout};
env.window.RoadModel=require('../road-core.js');
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../route-vigilance.js'),'utf8'),env);
let now=0;const tick=n=>{for(let i=0;i<n;i++)frame(now+=16)};
const key=(type,code)=>events[type]({code,key:code,target:{tagName:'CANVAS'},preventDefault(){}});
// The crankshaft note is the first oscillator built, so it carries the lowest node id.
const noteId=()=>Math.min(...log.filter(e=>e.kind==='osc'&&e.name==='frequency').map(e=>e.id));
const last=(kind,name,id)=>{for(let i=log.length-1;i>=0;i--){const e=log[i];if(e.kind===kind&&e.name===name&&(id===undefined||e.id===id))return e.v;}};
const note=()=>last('osc','frequency',noteId());
const snapshot=()=>{const m={};for(const e of log)if(e.name==='gain')m[e.id]=e.v;return m;};
els['road-start'].onclick();
key('keydown','ShiftLeft');tick(40);
assert(note()>0,'the engine is given a firing frequency');
// Sweep the whole speed range: the note has to climb far more often than it falls, and fall on each shift.
const notes=[];const hud=els['road-canvas'].dataset;
for(let i=0;i<900&&hud.crashed!=='true';i++){tick(1);notes.push(note());}
const rises=notes.filter((v,i)=>i&&v>notes[i-1]+.5).length,drops=notes.filter((v,i)=>i&&v<notes[i-1]-3).length;
assert(Math.max(...notes)>Math.min(...notes)*2.5,`the note spans a full rev range (${Math.min(...notes).toFixed(0)}-${Math.max(...notes).toFixed(0)} Hz)`);
assert(rises>drops*5&&rises>50,`accelerating climbs (${rises} montées / ${drops} chutes)`);
assert(drops>=2,`the revs fall back on each gear change (${drops})`);
// Braking hard from speed must open a channel that cruising leaves shut: the tyres letting go.
els['road-start'].onclick();key('keydown','ShiftLeft');tick(3);   // a fresh run, so the sweep's crash is behind us
for(let i=0;i<400&&hud.crashed!=='true'&&+hud.speed<75;i++)tick(1);
assert(hud.crashed!=='true'&&+hud.speed>50,`the car is rolling before the brake test (${hud.speed} km/h)`);
const cruising=snapshot();
key('keyup','ShiftLeft');key('keydown','ControlLeft');tick(25);
const braking=snapshot();
const opened=Object.keys(braking).filter(k=>braking[k]-(cruising[k]||0)>.05);
assert(opened.length>0,'braking hard opens the pad and squeal channels');
key('keyup','ControlLeft');
console.log('PASS: son moteur (régime, montées, passages de rapport) et freinage (crissement sous forte décélération)');

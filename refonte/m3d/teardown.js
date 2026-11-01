// Nouveau moteur de démontage. Les cinq modules sont des assemblages conçus
// physiquement par le constructeur de chaque machine, pas cinq tranches de X.
// Les parties mobiles sont animées par leurs propres mécanismes métiers.
import * as THREE from 'three';
import {clamp,ease} from './premium-core.js';

export function createTeardown(name,machine,holder,camera){
 const root=machine.group,zones=machine.zones;
 const hero=root.userData.hero||null,backstage=root.userData.backstage||null;
 const spec={title:machine.title,areas:machine.areas};
 const scenarios=machine.scenarios||[];
 if(zones.length!==5||!zones.every(z=>z?.userData?.explode))
  throw new Error('Modularité Teardown absente : '+name);
 const state={mode:'assembled',selected:1,scenario:'normal',tour:false,progress:0};
 const origins=zones.map(z=>z.position.clone());
 const normal=new Map(),materialCache=new WeakMap(),variants=new Set();
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const available=new Set(['assembled','exploded','section','xray','isolate']);
 const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches;
 const baseBounds=new THREE.Box3().setFromObject(holder);
 const center=baseBounds.getCenter(new THREE.Vector3());
 const sectionPlane=new THREE.Plane(new THREE.Vector3(0,0,1),-center.z);
 let explosion=0,lastWall=null,disposed=false;
 const moduleOf=o=>{
  let p=o;
  while(p&&p!==root){if(Number.isInteger(p.userData?.moduleIndex))return p.userData.moduleIndex;p=p.parent;}
  return null;
 };
 function variant(original,type){
  if(Array.isArray(original))return original.map(m=>variant(m,type));
  if(!original?.isMaterial)return original;
  let cache=materialCache.get(original);
  if(!cache){cache=new Map();materialCache.set(original,cache);}
  if(cache.has(type))return cache.get(type);
  const clone=original.clone();
  clone.side=THREE.DoubleSide;
  if(type==='section'){clone.clippingPlanes=[sectionPlane];clone.clipShadows=true;}
  if(type==='ghost'||type==='xray'){
   clone.transparent=true;clone.opacity=type==='ghost'?.075:.15;
   clone.depthWrite=false;
   clone.emissiveIntensity=0;
  }
  variants.add(clone);cache.set(type,clone);return clone;
 }
 function restore(){
  zones.forEach((g,i)=>g.position.copy(origins[i]));
  for(const [object,material] of normal)object.material=material;
  normal.clear();
 }
 function setMode(mode){if(available.has(mode)){state.mode=mode;state.tour=false;}}
 function select(index){state.selected=clamp(Math.trunc(index),0,4);state.tour=false;}
 function scenario(id){
  const exists=scenarios.some(s=>s.id===id);
  if(!exists)return null;
  state.scenario=id;state.tour=false;
  machine.setScenario?.(id);
  return machine.scenarioStart?.(id)??null;
 }
 function beforeFrame(){if(disposed)return;if(normal.size||explosion>0)restore();}
 function afterFrame(time){
  if(disposed)return;
  if(state.tour){
   const beat=Math.floor(Math.max(0,time)/9),sequence=['assembled','section','exploded','isolate','xray'];
   state.mode=sequence[beat%sequence.length];state.selected=beat%5;
  }
  const opened=state.mode!=='assembled';
  zones.forEach(zone=>zone.visible=opened);
  if(hero)hero.visible=!opened;
  if(backstage)backstage.visible=opened;
  const now=performance.now()/1000;
  const dt=lastWall==null?.016:clamp(now-lastWall,0,.08);
  lastWall=now;
  const goal=state.mode==='exploded'?1:0;
  explosion=reduce?goal:explosion+(goal-explosion)*clamp(dt*5.5,0,1);
  if(Math.abs(goal-explosion)<.001)explosion=goal;
  zones.forEach((group,i)=>{
   if(explosion>0){
    const direction=group.userData.explode;
    group.position.copy(origins[i]).addScaledVector(direction,ease(explosion));
   }
   const fading=state.mode==='isolate'&&i!==state.selected;
   const section=state.mode==='section';
   const xray=state.mode==='xray';
   if(!fading&&!section&&!xray)return;
   group.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const shell=!!mesh.userData.shell;
    const type=fading?'ghost':section?(shell?'section':null):xray?(shell?'xray':null):null;
    if(!type)return;
    normal.set(mesh,mesh.material);
    mesh.material=variant(mesh.material,type);
   });
  });
  state.progress=((time%45)+45)%45/45;
 }
 function inspect(x,y){
  pointer.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(holder,true).find(h=>h.object.isMesh&&moduleOf(h.object)!==null);
  if(!hit){
   if(!hero)return null;
   const shell=raycaster.intersectObject(hero,true).find(h=>h.object.isMesh);
   if(!shell)return null;
   select(2);
   return {index:2,label:spec.areas[2][0],description:spec.areas[2][1]};
  }
  const index=moduleOf(hit.object);select(index);
  return {index,label:spec.areas[index][0],description:spec.areas[index][1]};
 }
 function snapshot(time){
  const i=clamp(state.selected,0,4),ctl=machine.controls;
  const reading=machine.readout?.(time)||(ctl?.fmt&&ctl?.get?ctl.label+' : '+ctl.fmt(ctl.get(time)):null);
  return {...state,title:spec.title,area:spec.areas[i],scenarios,reading};
 }
 function dispose(){
  if(disposed)return;
  restore();disposed=true;
  zones.forEach(z=>z.visible=true);
  if(hero)hero.visible=true;
  if(backstage)backstage.visible=true;
  variants.forEach(m=>m.dispose?.());variants.clear();
 }
 return {state,name,spec,scenarios,setMode,select,scenario,beforeFrame,afterFrame,inspect,snapshot,dispose};
}

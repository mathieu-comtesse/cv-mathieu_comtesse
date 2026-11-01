// Sous-ensembles mécaniques de démonstration. Les états proviennent du même
// calcul que les simulations sources. Aucune donnée métier externe n'est lue.
import * as THREE from 'three';

const metal=(color,metalness=.55)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.48});
const MAT={
 steel:metal('#c9cbd0'),shadow:metal('#6f777e'),bronze:metal('#b18b58',.62),
 accent:metal('#a26437',.5),
 glass:new THREE.MeshPhysicalMaterial({color:'#d6e1e6',transparent:true,opacity:.24,roughness:.17,metalness:0,depthWrite:false,side:THREE.DoubleSide}),
 signal:new THREE.MeshStandardMaterial({color:'#bf804c',emissive:'#965222',emissiveIntensity:.6,roughness:.48}),
 alarm:new THREE.MeshStandardMaterial({color:'#c04445',emissive:'#bd2628',emissiveIntensity:.8,roughness:.45}),
 idle:metal('#7a8589')
};
function box(parent,w,h,d,x,y,z,material){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function rod(parent,a,b,r,material){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
 const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,start.distanceTo(end),12),material);
 m.position.copy(start).add(end).multiplyScalar(.5);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());
 m.castShadow=true;parent.add(m);return m;
}
function wheel(parent,r,teeth,x,y,z,material){
 const sh=new THREE.Shape(),step=Math.PI*2/teeth;
 for(let i=0;i<teeth*4;i++){
   const a=-Math.PI/2+i*step/4;
   const radius=(i%4===1||i%4===2)?r+1.15:r;
   if(i===0)sh.moveTo(Math.cos(a)*radius,Math.sin(a)*radius);
   else sh.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);
 }sh.closePath();
 const hole=new THREE.Path();hole.absarc(0,0,2.2,0,Math.PI*2,true);sh.holes.push(hole);
 const g=new THREE.ExtrudeGeometry(sh,{depth:2.4,bevelEnabled:true,bevelSize:.35,bevelThickness:.35,bevelSegments:1,steps:1});
 const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);
 const hub=new THREE.Mesh(new THREE.TorusGeometry(3.5,.55,8,24),MAT.shadow);hub.position.set(0,0,2.6);m.add(hub);
 return m;
}
function stationVM(machine){
 const root=machine.group,unit=new THREE.Group();unit.name='TD_VM_INTERLOCK';root.add(unit);
 const deck=box(unit,95,3.2,30,-39,101,0,MAT.steel);
 const shield=box(unit,95,23,1.5,-39,116,20,MAT.glass);
 const a=wheel(unit,9,16,-61,117,21,MAT.bronze);
 const b=wheel(unit,9,16,-42,117,21,MAT.steel);
 rod(unit,[-61,117,7],[-61,117,21],2.1,MAT.shadow);
 rod(unit,[-42,117,7],[-42,117,21],2.1,MAT.shadow);
 const bridge=box(unit,54,3,4,-39,107,24,MAT.shadow);
 const bolt=box(unit,19,6,5,-34,108,26,MAT.accent);
 const gates=[box(unit,8,11,9,-79,109,27,MAT.shadow),box(unit,8,11,9,2,109,27,MAT.shadow)];
 const caution=box(unit,6,4,1,-40,105,30,MAT.alarm);
 let current='normal';
 const update=t=>{
   const s=machine.getMechanicalState?.(t);
   if(!s)return;
   const phase=t*.6,working=!s.failed;
   a.rotation.z=working?phase:a.rotation.z;
   b.rotation.z=working?-phase:b.rotation.z;
   bolt.position.x=s.failed?-48:(s.duplicate?-32:-34)+Math.sin(phase*2)*1.5;
   caution.material=s.failed||s.duplicate?MAT.alarm:MAT.signal;
   bridge.material=s.failed?MAT.alarm:MAT.shadow;
   shield.visible=true;
 };
 return {update};
}
function stationFinance(machine){
 const root=machine.group,unit=new THREE.Group();unit.name='TD_FINANCIAL_RELAYS';root.add(unit);
 const pistons=[],plates=[];
 const positions=[-104,-60,-16,28,84];
 const anchor=box(unit,264,2,8,-9,114,-6,MAT.shadow);
 positions.forEach((x,i)=>{
  const body=box(unit,25,11,13,x,123,-5,MAT.steel);
  const stem=box(unit,4,13,4,x,121,4,MAT.shadow);
  const piston=box(unit,14,3,8,x,127,7,MAT.signal);
  const contact=box(unit,20,3,5,x,132,9,MAT.shadow);
  plates.push(contact);pistons.push(piston);
 });
 const rail=rod(unit,[-120,136,12],[106,136,12],1.4,MAT.bronze);
 return {update(t){
  const st=machine.getMechanicalState?.(t);
  if(!st)return;
  pistons.forEach((p,i)=>{
   const r=st.ratios[i];
   p.position.y=121+Math.min(1.15,r)*9;
   p.material=r>=1?MAT.alarm:r>=st.threshold?MAT.signal:MAT.idle;
   plates[i].material=r>=st.threshold?MAT.bronze:MAT.shadow;
  });
 }};
}
function stationMusicbox(machine){
 const root=machine.group,unit=new THREE.Group();unit.name='TD_LEARNING_TEST_BENCH';root.add(unit);
 const base=box(unit,66,4,34,167,7,46,MAT.steel);
 const rollers=[wheel(unit,10,18,151,28,67,MAT.bronze),wheel(unit,10,18,173,28,67,MAT.shadow)];
 const carriage=box(unit,36,3,9,162,16,66,MAT.signal);
 const lens=new THREE.Mesh(new THREE.TorusGeometry(13,1.3,12,42),MAT.steel);
 lens.position.set(162,34,64);unit.add(lens);
 return {update(t){
  const step=machine.controls?.get?.(t)||1,validating=step>=6;
  rollers[0].rotation.z=t*(validating?.52:.14);
  rollers[1].rotation.z=-t*(validating?.52:.14);
  carriage.position.x=162+Math.sin(t*.7)*Math.min(7,step);
  carriage.material=validating?MAT.signal:MAT.shadow;
 }};
}
export function enhanceMachine(name,machine) {
 if(name==='vm')return stationVM(machine);
 if(name==='finance')return stationFinance(machine);
 // La boîte à musique étant déjà dense, son banc d'essai complémentaire est
 // reporté à la prochaine passe de composition et d'optimisation.
 return {update(){}};
}

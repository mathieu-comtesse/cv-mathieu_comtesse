// Portfolio / Teardown Premium V3 : REMPLACEMENT intégral des onze modèles.
// Aucun import des anciennes machines m3d/*.js n'est utilisé par ce moteur.
import * as THREE from 'three';
import {makeStage} from './core.js';
import {createTeardown} from './teardown.js';
import {buildCerfa,buildVM,buildVRE,buildQ18} from './premium-doc-machines.js';
import {buildGares,buildFinance,buildPP,buildPowerBI} from './premium-pilot-machines.js';
import {buildSuivi,buildStudio,buildCognitive} from './premium-intelligence-machines.js';

const CONSTRUCTORS={
 cerfa:buildCerfa, vm:buildVM, vre:buildVRE, moteur:buildQ18,
 gares:buildGares, finance:buildFinance, pp:buildPP, powerbi:buildPowerBI,
 suivi:buildSuivi, studio:buildStudio, 'vrestudio-musicbox':buildCognitive
};
export const REBUILT_MACHINE_IDS=Object.freeze(Object.keys(CONSTRUCTORS));

export async function mountMachine(name,canvas,cam,origin=new THREE.Vector3(),options={}){
 const build=CONSTRUCTORS[name];
 if(!build)throw new Error('Machine non répertoriée : '+name);
 const machine=build();
 if(!machine.group||!Array.isArray(machine.zones)||machine.zones.length!==5)
  throw new Error('Assemblage incomplet : '+name+' (5 modules attendus)');
 const {renderer,scene}=makeStage(canvas);
 const holder=new THREE.Group();holder.add(machine.group);
 const nominal=options.width??12.6;
 holder.scale.setScalar(nominal/305);
 scene.add(holder);
 scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(holder);
 const center=bounds.getCenter(new THREE.Vector3());
 holder.position.set(origin.x-center.x,origin.y-bounds.min.y,origin.z-center.z);
 const rim=new THREE.DirectionalLight(0xb9d0ed,.42);
 rim.position.set(10,12,-8);scene.add(rim);
 const teardown=createTeardown(name,machine,holder,cam);
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function resize(){renderer.setSize(innerWidth,innerHeight,false);}
 resize();
 let disposed=false;
 function pick(x,y){
  if(disposed)return false;
  pointer.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);
  ray.setFromCamera(pointer,cam);
  return ray.intersectObject(holder,true).some(hit=>hit.object.isMesh&&hit.object.visible&&!hit.object.userData.glowShell);
 }
 function render(t){
  if(disposed)return;
  teardown.beforeFrame();
  machine.update(t);
  teardown.afterFrame(t);
  renderer.render(scene,cam);
 }
 function dispose(){
  if(disposed)return;disposed=true;
  teardown.dispose();
  const geometries=new Set(),materials=new Set(),textures=new Set();
  machine.group.traverse(o=>{
   if(!o.isMesh)return;
   if(o.geometry)geometries.add(o.geometry);
   for(const mat of Array.isArray(o.material)?o.material?[...o.material]:[]:[o.material])
    if(mat){ // central shared palette intentionally remains alive between scene changes
      if(mat.map)textures.add(mat.map);
      materials.add(mat);
    }
  });
  geometries.forEach(g=>g.dispose());
  // Shared cached materials belong to premium-core.js, not this one scene.
  for(const m of materials)if(m.map&&!m.userData?.shared){m.map.dispose();m.dispose();}
  renderer.dispose();
 }
 return {resize,controls:machine.controls,teardown,pick,render,dispose,machine};
}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.min.js';
const threeURL=new URL('../vendor/three.module.min.js',import.meta.url).href;
const source=(await readFile(new URL('../js/conveyor-motion.js',import.meta.url),'utf8')).replace("from 'three'","from '"+threeURL+"'");
const {createConveyorMotion}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const ids=['finance','vmvre','moteur44','pa','cerfa','vre','studio','powerbi','suivi','gares','terrain'];
const results=[];
for(const id of ids){
 const bytes=await readFile(new URL('../assets/dioramas/'+id+'.glb',import.meta.url)),length=bytes.readUInt32LE(12);
 const gltf=JSON.parse(bytes.toString('utf8',20,20+length)),binary=28+length;
 const geometry=p=>{
  const a=gltf.accessors[p.attributes.POSITION],view=gltf.bufferViews[a.bufferView],at=binary+(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||12;
  assert.equal(a.componentType,5126);
  const positions=new Float32Array(a.count*3);
  for(let i=0;i<a.count;i++)for(let c=0;c<3;c++)positions[i*3+c]=bytes.readFloatLE(at+i*stride+c*4);
  return new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3));
 };
 const nodes=gltf.nodes.map(n=>{
  const o=n.mesh===undefined?new THREE.Group():new THREE.Mesh(geometry(gltf.meshes[n.mesh].primitives[0]),new THREE.MeshStandardMaterial());
  o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);if(n.matrix){o.matrix.fromArray(n.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale);}return o;
 });
 gltf.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));
 const model=new THREE.Group();gltf.scenes[gltf.scene||0].nodes.forEach(i=>model.add(nodes[i]));model.updateMatrixWorld(true);
 const before=nodes.filter(n=>n.isMesh&&/^LiveRoller_|^LivePaperRoller|^MachineRoller_/.test(n.name)).map(mesh=>{
  mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),dimensions=[size.x,size.y,size.z],axis=new THREE.Vector3().setComponent(dimensions.indexOf(Math.max(...dimensions)),1);
  return {mesh,center:box.getCenter(new THREE.Vector3()),shaft:axis.clone().applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion())),axis,world:box.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),q:mesh.quaternion.clone()};
 });
 const motion=createConveyorMotion(model),treads=[];model.traverse(o=>{if(o.name.startsWith('ConveyorTread:')){const m=new THREE.Matrix4();o.getMatrixAt(0,m);treads.push({o,p:new THREE.Vector3().setFromMatrixPosition(m)});}});
 motion.update(.5,true);model.updateMatrixWorld(true);
 for(const b of before){
  assert.ok(b.world.distanceTo(b.center.clone().applyMatrix4(b.mesh.matrixWorld))<1e-6,id+' roller center must remain fixed');
  assert.ok(b.shaft.distanceTo(b.axis.clone().applyQuaternion(b.mesh.getWorldQuaternion(new THREE.Quaternion())))<1e-6,id+' roller must spin along its shaft');
  assert.ok(b.q.angleTo(b.mesh.quaternion)>.1,id+' roller must turn');
 }
 for(let i=0;i<treads.length;i++){
  const {o,p}=treads[i],matrix=new THREE.Matrix4();o.getMatrixAt(0,matrix);const delta=new THREE.Vector3().setFromMatrixPosition(matrix).sub(p),direction=new THREE.Vector3().fromArray(model.userData.conveyors[i].direction);
  assert.ok(Math.abs(delta.dot(direction)-.13)<1e-6&&delta.clone().cross(direction).length()<1e-6,id+' belt advances in one direction');
 }
 const paused=before.map(b=>b.mesh.quaternion.clone());motion.update(1,false);before.forEach((b,i)=>assert.ok(paused[i].angleTo(b.mesh.quaternion)<1e-6));
 results.push({id,rollers:before.length,belts:treads.length});motion.dispose();
}
assert.ok(results.filter(r=>r.belts>0).length>=5);
assert.equal(results.find(r=>r.id==='cerfa').belts,2,'Separate brake-test beds cannot share a tread across the gap');
console.log('PASS: actual Blender rollers keep their shafts and centers; belt treads move linearly and freeze on pause',JSON.stringify(results));

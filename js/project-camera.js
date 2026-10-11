import * as THREE from 'three';

// Fit the fixed machinery, never moving packets, labels or temporary effects.
const directions={gares:[.50,.62,1],pa:[.80,.46,1.35],finance:[.56,.43,1.35],
 studio:[.8,.56,1.4],suivi:[.7,.65,1.4],vre:[.6,.47,1.5],
 vmvre:[1,.62,1.35],cerfa:[.70,.62,1.5],powerbi:[.7,.80,1.4],moteur44:[1,.72,1.5]};
export function projectViews(bounds,camera,id,points=[],eyes=[]){
 const center=bounds.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(...(directions[id]||[.7,.6,1.4])).normalize();
 const corners=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z));
 function view(index=-1){
  const target=center.clone(),dir=direction.clone();
  if(index>=0&&points[index]){
   target.lerp(points[index],.12);
   // Small deliberate changes of viewpoint; no endless orbit or geometry movement.
   if(eyes[index])dir.copy(eyes[index]).sub(points[index]).normalize();
   else dir.applyAxisAngle(new THREE.Vector3(0,1,0),Math.sin(index*Math.PI/4)*.14);
  }
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right).normalize();
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),margin=camera.aspect<1?.86:.87;
  let distance=0;for(const corner of corners){const d=corner.clone().sub(target),depth=d.dot(dir);distance=Math.max(distance,depth+Math.abs(d.dot(right))/(tan*camera.aspect*margin),depth+Math.abs(d.dot(up))/(tan*margin));}
  return {target,eye:target.clone().addScaledVector(dir,distance+.08)};
 }
 return {view,bounds:bounds.clone()};
}
export function applyProjectView(camera,view){camera.position.copy(view.eye);camera.lookAt(view.target);camera.updateMatrixWorld();}

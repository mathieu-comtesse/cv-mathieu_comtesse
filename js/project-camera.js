import * as THREE from 'three';

// Fit the fixed machinery, never moving packets, labels or temporary effects.
const directions={gares:[.50,.62,1],pa:[.80,.46,1.35],finance:[.56,.43,1.35],
 studio:[.8,.56,1.4],suivi:[.7,.65,1.4],vre:[.6,.47,1.5],
 vmvre:[1,.62,1.35],cerfa:[.70,.62,1.5],powerbi:[.7,.80,1.4],moteur44:[1,.72,1.5]};
// World-space vertices of the model packed as xyz triplets: the silhouette, not its box.
// Every vertex is kept so that small protruding parts (hoppers, wheels) are never cropped.
export function modelSamples(model,extra=[]){
 model.updateMatrixWorld(true);let total=extra.length;model.traverseVisible(o=>{if(o.isMesh)total+=o.geometry.attributes.position.count;});
 const out=new Float32Array(total*3),p=new THREE.Vector3();let k=0;
 model.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);out[k++]=p.x;out[k++]=p.y;out[k++]=p.z;}});
 for(const e of extra){out[k++]=e.x;out[k++]=e.y;out[k++]=e.z;}
 return out;
}
export function projectViews(bounds,camera,id,points=[],eyes=[],samples=null){
 const center=bounds.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(...(directions[id]||[.7,.6,1.4])).normalize();
 const corners=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(x,y,z);
 const hull=samples?.length?samples:corners;
 // Views are pure functions of the step and the aspect ratio: fit once, reuse every frame.
 const cache=new Map();
 function view(index=-1){
  const key=index+':'+camera.aspect.toFixed(4)+':'+camera.fov;if(!cache.has(key))cache.set(key,fit(index));
  const v=cache.get(key);return {target:v.target.clone(),eye:v.eye.clone()};
 }
 function fit(index){
  const target=center.clone(),dir=direction.clone();
  if(index>=0&&points[index]){
   target.lerp(points[index],.12);
   // Small deliberate changes of viewpoint; no endless orbit or geometry movement.
   if(eyes[index])dir.copy(eyes[index]).sub(points[index]).normalize();
   else dir.applyAxisAngle(new THREE.Vector3(0,1,0),Math.sin(index*Math.PI/4)*.14);
  }
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right).normalize();
  const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),margin=camera.aspect<1?.88:.86,tx=tan*camera.aspect*margin,ty=tan*margin;
  // Exact perspective fit: for each axis the eye distance is max(z+|x-s|/tan); its minimum
  // over the lateral shift s is reached when both sides of the silhouette touch the frame.
  let ax=-Infinity,bx=-Infinity,ay=-Infinity,by=-Infinity;
  for(let i=0;i<hull.length;i+=3){const dx=hull[i]-target.x,dy=hull[i+1]-target.y,dz=hull[i+2]-target.z,z=dx*dir.x+dy*dir.y+dz*dir.z,x=dx*right.x+dy*right.y+dz*right.z,y=dx*up.x+dy*up.y+dz*up.z;ax=Math.max(ax,z+x/tx);bx=Math.max(bx,z-x/tx);ay=Math.max(ay,z+y/ty);by=Math.max(by,z-y/ty);}
  const distance=Math.max((ax+bx)/2,(ay+by)/2);
  target.addScaledVector(right,(ax-bx)*tx/2).addScaledVector(up,(ay-by)*ty/2);
  return {target,eye:target.clone().addScaledVector(dir,distance+.08)};
 }
 return {view,bounds:bounds.clone()};
}
export function applyProjectView(camera,view){camera.position.copy(view.eye);camera.lookAt(view.target);camera.updateMatrixWorld();}
// Studio lighting shared by the workshop dialog and the card previews: key light with a
// shadow frustum fitted to the model, cool fill and a rim light for metal edges.
export function stageLights(scene,{shadow=true,mapSize=1024,rim=true}={}){
 scene.add(new THREE.HemisphereLight('#ffffff','#a9b3b8',1));
 const key=new THREE.DirectionalLight('#fff4e4',2.7);key.castShadow=shadow;key.shadow.mapSize.set(mapSize,mapSize);key.shadow.bias=-.0003;key.shadow.normalBias=.015;scene.add(key,key.target);
 // The rim light costs a light per pixel: only the large workshop view gets it.
 if(rim){const back=new THREE.DirectionalLight('#ffffff',1.1);back.position.set(.35,.6,-.9);scene.add(back);}
 return {key,fit(bounds){
  const c=bounds.getCenter(new THREE.Vector3()),r=bounds.getSize(new THREE.Vector3()).length()/2+.3;
  key.target.position.copy(c);key.position.copy(c).add(new THREE.Vector3(-.45,.85,.6).multiplyScalar(r*3));
  Object.assign(key.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:r*.5,far:r*5.5});key.shadow.camera.updateProjectionMatrix();
 }};
}

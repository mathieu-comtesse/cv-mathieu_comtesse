import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/BufferGeometryUtils.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)}, mix=(a,b,t)=>a+(b-a)*ease(t);
const red=new THREE.MeshStandardMaterial({color:'#c81e2e',metalness:.36,roughness:.27});
const black=new THREE.MeshStandardMaterial({color:'#171b20',metalness:.35,roughness:.42});
const rubber=new THREE.MeshStandardMaterial({color:'#161719',roughness:.88});
const metal=new THREE.MeshStandardMaterial({color:'#b8bec4',metalness:.83,roughness:.26});
function mesh(parent,geometry,material,pos=V()){const o=new THREE.Mesh(geometry,material);o.position.copy(pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
function box(parent,x,y,z,pos,mat){return mesh(parent,new THREE.BoxGeometry(x,y,z),mat,pos)}
function cylinder(parent,r,h,pos,mat=red,segments=48){const o=mesh(parent,new THREE.CylinderGeometry(r,r,h,segments),mat,pos);o.rotation.x=Math.PI/2;return o}
function tube(parent,points,r,mat=black){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,r,8,false),mat)}
// Merge only siblings on the same articulated link: hinges and jaws remain independent.
export function batch(group){
 for(const child of [...group.children])if(child.children.length)batch(child);
 const materials=new Map();for(const child of [...group.children])if(child.isMesh&&!child.userData.independent){if(!materials.has(child.material))materials.set(child.material,[]);materials.get(child.material).push(child)}
 for(const [mat,objects] of materials){if(objects.length<2)continue;const geometries=objects.map(o=>{o.updateMatrix();const g=o.geometry.clone().applyMatrix4(o.matrix);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g.index?g.toNonIndexed():g});const combined=mergeGeometries(geometries,false);if(combined){for(const o of objects){group.remove(o);o.geometry.dispose()}mesh(group,combined,mat)}geometries.forEach(g=>g.dispose())}
}
function pivot(parent,r){cylinder(parent,r,.42,V());for(const s of [-1,1]){cylinder(parent,r*.74,.027,V(0,0,s*.225),black);cylinder(parent,r*.43,.031,V(0,0,s*.244),metal);for(let i=0;i<8;i++){const a=i*Math.PI/4;cylinder(parent,.018,.018,V(Math.cos(a)*r*.57,Math.sin(a)*r*.57,s*.249),metal,12)}}}
function link(parent,L,width,depth){
 const s=new THREE.Shape();s.moveTo(.02,-width*.56);s.bezierCurveTo(L*.35,-width*.61,L*.65,-width*.28,L-.04,-width*.36);s.quadraticCurveTo(L+.09,0,L-.04,width*.36);s.bezierCurveTo(L*.63,width*.31,L*.31,width*.78,.02,width*.56);s.quadraticCurveTo(-.12,0,.02,-width*.56);
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.05,bevelSize:.045,bevelSegments:5,steps:1,curveSegments:20});g.translate(0,0,-depth/2);mesh(parent,g,red);
 // Segmented cable carrier follows the upper profile rather than crossing the joint.
 for(let i=0;i<19;i++){const x=.19+i*(L-.4)/18,y=width*(.58-.24*x/L);box(parent,.064,.075,depth*.78,V(x,y+.09,0),black)}
 tube(parent,[V(.12,width*.68,.12),V(L*.3,width*.8,.12),V(L*.65,width*.46,.12),V(L-.13,width*.49,.12)],.024);
}
export function makeRobot(scene,x,z){
 const root=new THREE.Group();root.position.set(x,.70,z);scene.add(root);
 const yaw=new THREE.Group();root.add(yaw);
 mesh(yaw,new THREE.CylinderGeometry(.28,.33,.42,64),red,V(0,.20,0));
 const shoulder=new THREE.Group();shoulder.position.y=.48;yaw.add(shoulder);pivot(shoulder,.29);
 const L1=1.8,L2=1.85;link(shoulder,L1,.36,.40);
 const elbow=new THREE.Group();elbow.position.x=L1;shoulder.add(elbow);pivot(elbow,.255);link(elbow,L2,.245,.30);
 tube(shoulder,[V(.1,.4,-.28),V(.4,.60,-.32),V(1.25,.47,-.29),V(L1,.24,-.27)],.033);
 const wrist=new THREE.Group();wrist.position.x=L2;elbow.add(wrist);pivot(wrist,.16);

 const tool=new THREE.Group();wrist.add(tool);
 let jaws=[],shoes=[];
 // Compact pivoted gripper imported from Blender; each jaw keeps its own hinge.
 const contactOffset=gap=>.25+Math.sqrt(.9*.9+.233*.233-(gap-.14)*(gap-.14));
 const jawAngle=gap=>Math.atan2(.233,.9)-Math.asin((gap-.14)/Math.hypot(.9,.233));
 const installGripper=asset=>{
  const body=asset.clone(true);tool.add(body);jaws=[body.getObjectByName('JawLeft'),body.getObjectByName('JawRight')];shoes=[body.getObjectByName('ShoeLeft'),body.getObjectByName('ShoeRight')];
  body.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});batch(body);
  solve(requested,gap);
 };
 const idle=V(x+.28,3.75,z*.43);let requested=idle.clone(),gap=.78,reachError=0;
 const solve=(p,newGap)=>{
  requested.copy(p);gap=newGap;const dx=p.x-x,dz=p.z-z,dy=p.y-1.18,h=Math.hypot(dx,dz),d=Math.hypot(h,dy);reachError=Math.max(0,d-(L1+L2));
  yaw.rotation.y=Math.atan2(-dz,dx);
  const a=Math.atan2(dy,h)+Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*Math.max(d,.001)),-1,1));
  const b=-Math.acos(clamp((d*d-L1*L1-L2*L2)/(2*L1*L2),-1,1));shoulder.rotation.z=a;elbow.rotation.z=b;wrist.rotation.z=-a-b;tool.rotation.y=-yaw.rotation.y;
  jaws.forEach((j,i)=>{j.rotation.x=(i?1:-1)*jawAngle(gap);shoes[i].rotation.x=-j.rotation.x});root.updateMatrixWorld(true);
 };
 batch(root);solve(idle,gap);return {root,idle,solve,tool,installGripper,contactOffset,get state(){return {tcp:tool.getWorldPosition(V()).toArray(),requested:requested.toArray(),gap,reachError,pads:shoes.map(j=>j.getWorldPosition(V()).toArray()),mounts:jaws.map(j=>j.getWorldPosition(V()).toArray()),crossheadEnds:[tool.localToWorld(V(0,-.25,-.14)).toArray(),tool.localToWorld(V(0,-.25,.14)).toArray()],jawAngles:jaws.map(j=>j.rotation.x),shoeAngles:shoes.map(j=>j.rotation.x),contactOffset:contactOffset(gap),angles:[yaw.rotation.y,shoulder.rotation.z,elbow.rotation.z]}}};
}
function kraftTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#be8c55';ctx.fillRect(0,0,512,512);let seed=57;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<24000;i++){const a=rand();ctx.fillStyle=a>.5?'rgba(255,235,191,.12)':'rgba(66,33,12,.10)';ctx.fillRect(rand()*512,rand()*512,1+rand()*4,.4+rand()*1.3)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
export function makeCarton(scene){
 const root=new THREE.Group();scene.add(root);const kraft=new THREE.MeshStandardMaterial({map:kraftTexture(),color:'#e9c697',roughness:.96});const inner=kraft.clone();inner.color.set('#ab8458');const crease=new THREE.MeshStandardMaterial({color:'#86623c',roughness:1});
 const W=.82,H=.68,D=.72,T=.012;const colliders=[];
 const solid=(parent,w,h,d,pos,mat,name)=>{colliders.push({parent,half:V(w/2,h/2,d/2),pos:pos.clone(),name});return box(parent,w,h,d,pos,mat)};
 solid(root,W,T,D,V(0,-H/2,0),inner,'fond');
 for(const sign of [-1,1]){solid(root,W,H,T,V(0,0,sign*D/2),kraft,'paroi longitudinale '+sign);solid(root,T,H,D,V(sign*W/2,0,0),kraft,'paroi transversale '+sign)}
 for(const x of [-W/2,W/2])for(const z of [-D/2,D/2])box(root,.008,H-.024,.008,V(x,0,z),crease);
 const flaps=[];
 for(const sign of [-1,1]){
  const hinge=new THREE.Group();hinge.position.set(0,H/2+(sign===1?.004:0),sign*D/2);root.add(hinge);
  solid(hinge,W-.024,T,D/2-.010,V(0,0,-sign*(D/4-.005)),kraft,'grand rabat '+sign);
  box(hinge,W-.03,.006,.006,V(0,-.002,-sign*.009),crease);
  flaps.push({hinge,axis:'x',sign,minor:false});
 }
 for(const sign of [-1,1]){
  const hinge=new THREE.Group();hinge.position.set(sign*W/2,H/2-.015,0);root.add(hinge);
  solid(hinge,W/2-.017,T,D-.031,V(-sign*(W/4-.0085),0,0),kraft,'petit rabat '+sign);
  box(hinge,.006,.006,D-.035,V(-sign*.009,-.003,0),crease);
  flaps.push({hinge,axis:'z',sign:-sign,minor:true});
 }
 // Corrugated cut edges remain visible on each flap.
 for(const f of flaps){const count=f.minor?28:32;for(let i=0;i<count;i++){
  const p=f.minor?V(f.sign*(W/2-.02),0,-D/2+.023+i*(D-.046)/(count-1)):V(-W/2+.021+i*(W-.042)/(count-1),0,-f.sign*(D/2-.015));
  box(f.hinge,.004,.008,.004,p,crease);
 }}
 const tape=new THREE.MeshStandardMaterial({color:'#d3ad6e',transparent:true,opacity:.66,roughness:.72});const seal=box(root,W-.015,.003,.063,V(0,H/2+.018,0),tape);seal.visible=false;seal.userData.independent=true;
 let foldState=[1.91,1.91,1.91,1.91];
 function fold(minor,major){flaps.forEach((f,i)=>{const a=f.minor?minor:major;f.hinge.rotation[f.axis]=f.sign*a;foldState[i]=a});seal.visible=major<.04&&minor<.04}
 batch(root);fold(1.91,1.91);return {root,fold,colliders,get state(){return {flaps:[...foldState],sealed:seal.visible}}};
}
export function makeRollers(scene){
 const profile=[V(0,-.585),V(.041,-.585),V(.066,-.58),V(.074,-.567),V(.076,-.55),V(.076,.55),V(.074,.567),V(.066,.58),V(.041,.585),V(0,.585)].map(v=>new THREE.Vector2(v.x,v.y));
 const g=new THREE.LatheGeometry(profile,64);g.rotateX(Math.PI/2);
 const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#b7bec3';ctx.fillRect(0,0,64,64);ctx.fillStyle='#a3abb1';ctx.fillRect(0,0,64,3);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshStandardMaterial({map:texture,metalness:.86,roughness:.28});const rollers=new THREE.InstancedMesh(g,mat,72);rollers.castShadow=rollers.receiveShadow=true;scene.add(rollers);const dummy=new THREE.Object3D();
 function update(t){for(let i=0;i<72;i++){const x=-5.89+i*.166;dummy.position.set(x,1.184,0);dummy.rotation.z=-t*1.9;dummy.scale.setScalar(1);dummy.updateMatrix();rollers.setMatrixAt(i,dummy.matrix)}rollers.instanceMatrix.needsUpdate=true}
 update(0);return {update,mesh:rollers};
}
export function countGeometry(scene){let triangles=0,vertices=0;scene.traverse(o=>{if(o.isMesh){const n=o.isInstancedMesh?o.count:1;vertices+=o.geometry.attributes.position.count*n;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*n}else if(o.isSprite){triangles+=2;vertices+=4}});return {triangles,vertices,maxTriangles:500000,maxVertices:280000}};

 // Exact mesh triangles against the thickness of the carton walls and hinged flaps.
 // Called only by the local inspection harness, never by the production render loop.
 export function inspectGripCollisions(robots,carton){
  const hits=[],tri=new THREE.Triangle(),local=new THREE.Matrix4(),inv=new THREE.Matrix4(),bounds=new THREE.Box3(),testBox=new THREE.Box3();
  carton.root.updateMatrixWorld(true);
  robots.forEach((robot,id)=>{robot.root.updateMatrixWorld(true);robot.tool.traverse(o=>{
   if(!o.isMesh)return;const g=o.geometry,attr=g.attributes.position,index=g.index;if(!g.boundingBox)g.computeBoundingBox();
   for(const c of carton.colliders){
    inv.copy(c.parent.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(c.pos.x,c.pos.y,c.pos.z)).invert();
    local.multiplyMatrices(inv,o.matrixWorld);testBox.set(c.half.clone().negate().addScalar(.0001),c.half.clone().addScalar(-.0001));
    bounds.copy(g.boundingBox).applyMatrix4(local);if(!bounds.intersectsBox(testBox))continue;
    for(let j=0,n=index?index.count:attr.count;j<n;j+=3){
     tri.a.fromBufferAttribute(attr,index?index.getX(j):j).applyMatrix4(local);tri.b.fromBufferAttribute(attr,index?index.getX(j+1):j+1).applyMatrix4(local);tri.c.fromBufferAttribute(attr,index?index.getX(j+2):j+2).applyMatrix4(local);
     if(testBox.intersectsTriangle(tri)){hits.push({robot:id,part:o.name||o.material.name||o.material.color.getHexString(),carton:c.name});break}
    }
   }
  })});return hits;
 }

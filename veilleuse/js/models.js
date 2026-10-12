import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/BufferGeometryUtils.js';
import {rng} from './noise.js';

// Bibliothèque de modèles low-poly construits à la main en code (équivalent d'un export Blender), faces plates.
const norm=g=>{let n=g.index?g.toNonIndexed():g;n.deleteAttribute('uv');if(n.getAttribute('normal')===undefined)n.computeVertexNormals();return n};
const merge=list=>{const g=mergeGeometries(list.map(norm),false);g.computeVertexNormals();return g};
const M=(g,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>{g=norm(g);const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));g.applyMatrix4(m);return g};
const jitter=(g,amt,seed)=>{const r=rng(seed),p=g.getAttribute('position'),map=new Map();
  for(let i=0;i<p.count;i++){const k=p.getX(i).toFixed(3)+p.getY(i).toFixed(3)+p.getZ(i).toFixed(3);let d=map.get(k);if(!d){d=[(r()-.5)*amt,(r()-.5)*amt,(r()-.5)*amt];map.set(k,d)}p.setXYZ(i,p.getX(i)+d[0],p.getY(i)+d[1],p.getZ(i)+d[2])}
  g.computeVertexNormals();return g};

// Arbre fin à plateaux horizontaux (pin parasol), hauteur ~8.
export function tree(){
  const parts=[M(new THREE.CylinderGeometry(.09,.2,8,5,1),0,4,0)];
  const r=rng(7);
  for(let i=0;i<5;i++){const y=3.3+i*.85+r()*.3,rad=(1.9-i*.18)*(.8+r()*.5);
    parts.push(M(new THREE.CylinderGeometry(rad*.25,rad,.45,6,1),(r()-.5)*.8,y,(r()-.5)*.8,0,r()*6,0));}
  parts.push(M(new THREE.ConeGeometry(.9,1.4,5,1),0,8.6,0));
  return merge(parts);
}
export function deadTree(){
  const r=rng(11),parts=[M(new THREE.CylinderGeometry(.07,.2,6.5,5,1),0,3.25,0)];
  for(let i=0;i<7;i++){const y=2.5+r()*3.6,a=r()*6.28,len=1.6+r()*1.8;parts.push(M(new THREE.CylinderGeometry(.03,.09,len,4,1),Math.cos(a)*len*.35,y+len*.25,Math.sin(a)*len*.35,Math.sin(a)*.9,0,-Math.cos(a)*.9));}
  return merge(parts);
}
export function rock(){return jitter(new THREE.IcosahedronGeometry(1,0),.5,3)}
export function slab(){
  const g=new THREE.BoxGeometry(1,1,1,1,1,1);g.translate(0,.5,0);
  const p=g.getAttribute('position');for(let i=0;i<p.count;i++){if(p.getY(i)>.9){p.setX(i,p.getX(i)*.86);p.setZ(i,p.getZ(i)*.86)}}
  return jitter(norm(g),.06,5);
}
export function crystal(){
  const g=new THREE.CylinderGeometry(0,.55,3.4,5,1);g.translate(0,1.7,0);
  const g2=new THREE.CylinderGeometry(.5,.55,1.1,5,1);g2.translate(0,.2,0);
  return jitter(merge([g,g2]),.12,9);
}
export function tuft(){
  const parts=[];for(let i=0;i<5;i++){const a=i*1.26;parts.push(M(new THREE.ConeGeometry(.09,.9,3,1),Math.cos(a)*.12,.4,Math.sin(a)*.12,Math.sin(a)*.5,0,-Math.cos(a)*.5))}
  return merge(parts);
}
export function bush(){return jitter(new THREE.IcosahedronGeometry(.6,0).translate(0,.2,0),.25,4)}

// Stèle : dalle haute, bandeau de glyphes séparé pour pouvoir s'allumer.
export function stele(){
  const body=jitter(norm(new THREE.BoxGeometry(2.6,9,1.2,1,2,1).translate(0,4.5,0)),.18,8);
  const cap=M(new THREE.BoxGeometry(3.2,.6,1.6),0,9.3,0);
  const base=M(new THREE.BoxGeometry(3.6,.8,2.2),0,.4,0);
  return merge([body,cap,base]);
}
export const steleGlyph=()=>{const parts=[];for(let i=0;i<5;i++)parts.push(M(new THREE.BoxGeometry(.22,1.1-i*.1,.12),(i-2)*.4,3.1+i*1.0,.66));return merge(parts)};
export function brazier(){
  return merge([M(new THREE.CylinderGeometry(.9,.55,.9,7,1),0,.45,0),M(new THREE.CylinderGeometry(.7,.9,.35,7,1),0,.95,0),M(new THREE.BoxGeometry(2.4,.4,2.4),0,.2,0)]);
}
export const flameGeo=()=>{const g=new THREE.ConeGeometry(.55,1.9,6,1);g.translate(0,1.9,0);return g};
export function arch(){return merge([M(new THREE.BoxGeometry(1.5,7,1.5),-3,3.5,0),M(new THREE.BoxGeometry(1.5,7,1.5),3,3.5,0),M(new THREE.BoxGeometry(8.4,1.4,1.8),0,7.4,0,0,0,.02),M(new THREE.BoxGeometry(2.2,.6,2.2),-3,.3,0),M(new THREE.BoxGeometry(2.2,.6,2.2),3,.3,0)])}
export function gateArch(){return merge([M(new THREE.BoxGeometry(2.4,14,2.4),-6,7,0),M(new THREE.BoxGeometry(2.4,14,2.4),6,7,0),M(new THREE.BoxGeometry(16,2.6,3),0,14.6,0),M(new THREE.BoxGeometry(3.4,.8,3.4),-6,.4,0),M(new THREE.BoxGeometry(3.4,.8,3.4),6,.4,0)])}
export function mirror(){return merge([M(new THREE.BoxGeometry(3.8,2.8,.28),0,1.9,0),M(new THREE.CylinderGeometry(.5,.8,.8,6,1),0,.4,0)])}
export function mirrorPedestal(){return M(new THREE.CylinderGeometry(.5,.9,.9,6,1),0,.45,0)}
export function mirrorSlab(){const g=new THREE.BoxGeometry(3.8,2.6,.26);g.translate(0,1.9,0);return norm(g)}
export function prism(){
  const g=new THREE.OctahedronGeometry(1.2,0);g.scale(1,1.8,1);g.translate(0,3,0);
  return merge([g,M(new THREE.CylinderGeometry(.9,1.2,1.2,6,1),0,.6,0)]);
}
export function relicGeo(){return new THREE.OctahedronGeometry(.55,0)}

// Le veilleur : silhouette sombre, cape triangulaire, lanterne tenue à bout de bras. Hauteur ~1.8.
export function playerParts(){
  return {
    body:merge([M(new THREE.ConeGeometry(.5,1.35,6,1),0,.95,0),M(new THREE.SphereGeometry(.24,6,5),0,1.78,0),M(new THREE.ConeGeometry(.3,.35,6,1),0,2.05,0)]),
    leg:M(new THREE.BoxGeometry(.2,.65,.2),0,-.32,0),
    arm:M(new THREE.BoxGeometry(.14,.7,.14),0,-.35,0)
  };
}

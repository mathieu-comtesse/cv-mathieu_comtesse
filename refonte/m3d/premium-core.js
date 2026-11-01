// Teardown Premium : composants paramétriques des NOUVELLES machines.
// Géométrie inédite. Toutes les positions sont exprimées en unités d'atelier.
// Aucun des anciens fichiers m3d/cerfa, vm, vre, ... n'est utilisé ici.
import * as THREE from 'three';

export const P={
 ivory:'#f0eee8', porcelain:'#f9f8f4', graphite:'#232c36', steel:'#a9b2ba',
 silver:'#d5dadb', bronze:'#ba8751', copper:'#a75b33', amber:'#d49a52',
 glass:'#cbdce5', blue:'#5487ac', green:'#5a9c83', red:'#c95450', shadow:'#6b7681'
};
export const M={};
for(const [id,col] of Object.entries(P))
  M[id]=new THREE.MeshStandardMaterial({color:col,metalness:['steel','silver','bronze','copper','graphite'].includes(id)?.58:.12,roughness:id==='glass'?.12:.48});
M.glass=new THREE.MeshPhysicalMaterial({color:P.glass,transparent:true,opacity:.22,depthWrite:false,roughness:.1,metalness:0,side:THREE.DoubleSide});
M.paper=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85,side:THREE.DoubleSide});
M.light=new THREE.MeshStandardMaterial({color:P.amber,emissive:P.amber,emissiveIntensity:.7,roughness:.48});
M.warning=new THREE.MeshStandardMaterial({color:P.red,emissive:P.red,emissiveIntensity:.9,roughness:.5});
M.off=new THREE.MeshStandardMaterial({color:'#747b80',emissive:'#000000',roughness:.52});
const TAU=Math.PI*2;
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const ease=(v)=>{v=clamp(v);return v*v*(3-2*v);};
export const lerp=(a,b,u)=>a+(b-a)*u;
export const sin=(t,rate=1)=>Math.sin(t*rate);
export const phase=(t,period=12)=>((t%period)+period)%period/period;

export function mesh(parent,geometry,material,x=0,y=0,z=0,opts={}){
 const ob=new THREE.Mesh(geometry,material);
 ob.position.set(x,y,z);ob.castShadow=!opts.noShadow;ob.receiveShadow=true;
 ob.userData.part=opts.part||'';
 ob.userData.shell=!!opts.shell;
 if(opts.id)ob.name=opts.id;
 parent.add(ob);return ob;
}
export function block(parent,w,h,d,x,y,z,mat='ivory',opt={}){
 return mesh(parent,new THREE.BoxGeometry(w,h,d),typeof mat==='string'?M[mat]:mat,x,y,z,opt);
}
export function cyl(parent,rad,h,x,y,z,mat='steel',segments=32,opt={}){
 return mesh(parent,new THREE.CylinderGeometry(rad,rad,h,segments),typeof mat==='string'?M[mat]:mat,x,y,z,opt);
}
export function cone(parent,r1,r2,h,x,y,z,mat='steel',opt={}){
 return mesh(parent,new THREE.CylinderGeometry(r1,r2,h,24),M[mat],x,y,z,opt);
}
export function shaft(parent,a,b,r=.9,mat='steel',opt={}){
 const v0=new THREE.Vector3(...a),v1=new THREE.Vector3(...b),d=v1.clone().sub(v0);
 const ob=mesh(parent,new THREE.CylinderGeometry(r,r,d.length(),12),M[mat],0,0,0,opt);
 ob.position.copy(v0).addScaledVector(d,.5);
 ob.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return ob;
}
export function hoop(parent,rad,tube,x,y,z,mat='bronze',axis='z'){
 const o=mesh(parent,new THREE.TorusGeometry(rad,tube,10,44),M[mat],x,y,z);
 if(axis==='x')o.rotation.y=Math.PI/2;
 if(axis==='y')o.rotation.x=Math.PI/2;
 return o;
}
export function gear(parent,r=13,teeth=20,x=0,y=0,z=0,mat='bronze',thickness=3){
 const path=new THREE.Shape();
 for(let j=0;j<teeth*4;j++){const a=TAU*j/(teeth*4),rr=r+(j%4===1||j%4===2?1.55:0);
  if(j===0)path.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else path.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}
 path.closePath();
 const hole=new THREE.Path();hole.absarc(0,0,2.7,0,TAU,true);path.holes.push(hole);
 const g=new THREE.ExtrudeGeometry(path,{depth:thickness,bevelEnabled:true,bevelThickness:.38,bevelSize:.38,bevelSegments:1,curveSegments:6});
 const o=mesh(parent,g,M[mat],x,y,z);hoop(o,4,.5,0,0,thickness+.45,'graphite');
 return o;
}
export function cable(parent,points,r=.5,mat='bronze',opt={}){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const shape=new THREE.TubeGeometry(curve,Math.max(20,points.length*12),r,8,false);
 const ob=mesh(parent,shape,M[mat],0,0,0,opt);
 return {object:ob,curve};
}
export function label(parent,text,x,y,z,w=28,h=7,angle=0){
 const can=document.createElement('canvas');can.width=512;can.height=128;
 const g=can.getContext('2d');g.fillStyle='#f1efe9';g.fillRect(0,0,512,128);
 g.strokeStyle='#c5c5bf';g.lineWidth=4;g.strokeRect(3,3,506,122);
 g.fillStyle='#303944';g.textAlign='center';g.textBaseline='middle';
 g.font='600 46px Arial';g.fillText(String(text).slice(0,24),256,66,475);
 const tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
 const ob=mesh(parent,new THREE.PlaneGeometry(w,h),mat,x,y,z,{noShadow:true});
 ob.rotation.y=angle;return ob;
}
export function readout(parent,w=24,h=9,x=0,y=0,z=0){
 const can=document.createElement('canvas');can.width=512;can.height=160;
 const g=can.getContext('2d'),tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshBasicMaterial({map:tex});
 const ob=mesh(parent,new THREE.PlaneGeometry(w,h),mat,x,y,z,{noShadow:true});
 let previous;
 return {mesh:ob,set(value){
  const s=String(value);if(s===previous)return;previous=s;
  g.fillStyle='#28343c';g.fillRect(0,0,512,160);
  g.fillStyle='#d5d9c8';g.textAlign='center';g.textBaseline='middle';
  g.font='600 57px ui-monospace,Consolas,monospace';g.fillText(s,256,82,486);tex.needsUpdate=true;
 }};
}
export function paper(parent,x=0,y=0,z=0,w=15,h=20,material='paper'){
 const root=new THREE.Group();root.position.set(x,y,z);parent.add(root);
 block(root,w,.65,h,0,0,0,material);
 for(let i=0;i<5;i++)block(root,w*.67,.11,.65,-w*.09,.4,-h*.34+i*h*.145,'shadow');
 block(root,4,.15,2,-w*.29,.42,-h*.37,'amber');
 return root;
}
export function documentStream(parent,points,count=5,period=9,opts={}){
 const route=cable(parent,points,.44,'silver');
 const units=Array.from({length:count},()=>{const x=new THREE.Group();parent.add(x);
   const p=block(x,2.5,3.2,1.1,0,0,0,'porcelain');block(x,1.7,.3,.4,0,.7,.58,'amber');return x;});
 return {update(t){units.forEach((item,j)=>{
  const pct=phase(t+j*period/count,period),p=route.curve.getPoint(pct);
  item.position.copy(p);item.visible=(opts.only?opts.only(t,j,pct):true);
  item.rotation.y=-pct*Math.PI*.7;
 });}};
}
export function pedestal(parent,w=242,d=102){
 const g=new THREE.Group();parent.add(g);
 block(g,w,7,d,0,-5,0,'ivory',{shell:true,id:'structural-plinth'});
 block(g,w-5,1,d-5,0,-.9,0,'silver');
 for(const x of [-w/2+13,w/2-13])for(const z of [-d/2+13,d/2-13]){
  cyl(g,4.2,5.4,x,-10,z,'graphite',18);
  cyl(g,2.5,.6,x,-1.1,z,'bronze',16);
 }
 for(let i=0;i<15;i++)block(g,.5,.24,i%5?3:6,-w*.42+i*w*.06,.06,d/2-7,'shadow');
 return g;
}
export function createAssembly(title='Machine',w=242,d=102){
 const root=new THREE.Group();root.name='NOUVELLE_MACHINE_'+title;
 pedestal(root,w,d);const zones=[],updates=[],resources=[];
 function zone(i,labelText,pos=[0,0,0],direction=[0,20,0]){
  const gr=new THREE.Group();gr.name='Module_'+i+'_'+labelText.replace(/\W/g,'_');
  gr.position.set(...pos);gr.userData.moduleIndex=i;gr.userData.label=labelText;
  gr.userData.explode=new THREE.Vector3(...direction);
  root.add(gr);zones[i]=gr;return gr;
 }
 function animate(fn){updates.push(fn);return fn;}
 function update(t){updates.forEach(fn=>fn(t));}
 return {group:root,zones,resources,zone,animate,update,title};
}
export function drivePair(g,x=0,y=16,z=0,opts={}){
 const a=gear(g,opts.r||10,16,x-10,y,z,'bronze');
 const b=gear(g,opts.r||10,16,x+10,y,z,'steel');
 const bridge=block(g,45,3,5,x,y-14,z,'graphite');
 shaft(g,[x-10,y-12,z],[x-10,y,z],1.4);
 shaft(g,[x+10,y-12,z],[x+10,y,z],1.4);
 return {update(t,enabled=true){a.rotation.z=enabled?t:0;b.rotation.z=enabled?-t:0;},a,b};
}
export function valve(parent,x,y,z){
 const base=cyl(parent,4,7,x,y,z,'graphite',24);
 const wheel=hoop(parent,6,1,x,y+5,z,'bronze','y');
 for(let k=0;k<4;k++){const a=k*Math.PI/2;
  shaft(parent,[x,y+5,z],[x+5*Math.cos(a),y+5,z+5*Math.sin(a)],.7,'steel');}
 return wheel;
}
export function gauge(parent,x,y,z,rad=10){
 cyl(parent,rad,2,x,y,z,'ivory',40);
 const rim=hoop(parent,rad,.9,x,y,z+1.4,'steel');
 const needle=block(parent,1.2,rad*.8,.7,x,y+rad*.3,z+2,'copper');
 const dot=cyl(parent,1.8,1.3,x,y,z+2.1,'graphite');
 dot.rotation.x=Math.PI/2;
 return {update(value){needle.rotation.z=-(clamp(value,0,1.25)/1.25-0.5)*Math.PI*1.5;}};
}
export function glassTower(parent,x,y,z,rad=8,height=37){
 const wall=mesh(parent,new THREE.CylinderGeometry(rad,rad,height,40,1,true),M.glass,x,y+height/2,z,{shell:true});
 cyl(parent,rad+1.6,2,x,y,z,'steel');
 cyl(parent,rad+1.6,2,x,y+height,z,'bronze');
 return {wall,fill(h,mat='blue'){
  const level=clamp(h)*height;
  return cyl(parent,rad*.72,Math.max(.2,level),x,y+level*.5,z,mat);
 }};
}

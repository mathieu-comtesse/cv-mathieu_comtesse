import * as THREE from 'three';
import {batch} from './robot-atelier-v5.js?v=cv-projects-v4';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)},lerp=(a,b,t)=>a+(b-a)*ease(t);
const metal=new THREE.MeshStandardMaterial({color:'#b7bdc2',metalness:.8,roughness:.29});
const dark=new THREE.MeshStandardMaterial({color:'#202529',metalness:.45,roughness:.38});
const red=new THREE.MeshStandardMaterial({color:'#c81e2e',metalness:.35,roughness:.3});
const paper=new THREE.MeshStandardMaterial({color:'#e2dfd5',roughness:.95});
const blue=new THREE.MeshStandardMaterial({color:'#526975',roughness:.64});
function m(p,g,mat,pos=V()){const o=new THREE.Mesh(g,mat);o.position.copy(pos);o.castShadow=o.receiveShadow=true;p.add(o);return o}
const box=(p,w,h,d,pos,mat=metal)=>m(p,new THREE.BoxGeometry(w,h,d),mat,pos);
export function makeDevices(scene){
 const barriers=[];
 for(const [x,z,sign] of [[-4.2,-.73,1],[4.2,.73,-1]]){
  const g=new THREE.Group();g.position.set(x,1.51,z);scene.add(g);
  m(g,new THREE.CylinderGeometry(.065,.065,.25,32),metal,V(0,-.04,0));
  const neck=box(g,.085,.10,.27,V(.065,0,sign*.12),dark);neck.rotation.y=sign*.50;
  box(g,.085,.10,1.20,V(.13,0,sign*.85),dark);
  box(g,.017,.036,1.36,V(.084,.007,sign*.80),metal);
  box(g,.115,.15,.105,V(.13,0,sign*1.45),dark);
  batch(g);barriers.push(g);
 }
 const screens=[];
 for(const [x,z,sign] of [[-4.2,-.95,1],[4.2,.95,-1]]){
  const screen=m(scene,new THREE.PlaneGeometry(.46,.30),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}),V(x,1.691,z));
  screen.rotation.x=-Math.PI/2+sign*.35;screen.castShadow=screen.receiveShadow=false;screens.push(screen);
 }

 let elevator,piston;const feedRoot=new THREE.Group();feedRoot.position.set(-2.1,0,1.22);scene.add(feedRoot);const leaves=[];
 const installFeed=asset=>{const body=asset.clone(true);feedRoot.add(body);elevator=body.getObjectByName('Lift');piston=body.getObjectByName('Piston');body.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});batch(body)};
 const product=new THREE.Group();scene.add(product);
 box(product,.52,.29,.44,V(0,0,0),paper);
 for(let i=0;i<12;i++)box(product,.525,.002,.444,V(0,-.14+i*.024,0),dark);
 box(product,.535,.016,.455,V(0,.15,0),blue);batch(product);
 const marker=m(product,new THREE.PlaneGeometry(.20,.20),new THREE.MeshBasicMaterial({transparent:true}),V(0,.01,.224));
 marker.castShadow=marker.receiveShadow=false;
 const scannerSignals=[];
 for(const x of [-2.95,3.35]){
  const s=m(scene,new THREE.PlaneGeometry(.25,1.1),new THREE.MeshBasicMaterial({color:'#73c4c9',transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false}),V(x,1.58,0));s.rotation.y=Math.PI/2;s.castShadow=s.receiveShadow=false;scannerSignals.push(s);
 }
 return {barriers,screens,get elevator(){return elevator},get piston(){return piston},leaves,feedRoot,installFeed,product,marker,scannerSignals};
}

function transfer(robot,a,b,t,gap=.368,lift=.75){
 const clearance=gap>.3?.90:.24;const OFFSET=V(0,robot.contactOffset(gap),0);const start=a.clone().add(OFFSET),end=b.clone().add(OFFSET);
 let tcp=start.clone(),jaw=.78,p=a.clone(),held=false,phase='approche';
 if(t<.50)tcp.copy(robot.idle).lerp(start.clone().add(V(0,clearance,0)),ease(t/.5));
 else if(t<.95){phase='descente';tcp.copy(start).add(V(0,lerp(clearance,0,(t-.5)/.45),0))}
 else if(t<1.25){phase='fermeture';jaw=lerp(.78,gap,(t-.95)/.3)}
 else if(t<1.7){phase='levage';held=true;jaw=gap;tcp.copy(start).add(V(0,lerp(0,lift,(t-1.25)/.45),0))}
 else if(t<2.6){phase='transfert';held=true;jaw=gap;tcp.copy(start).lerp(end,ease((t-1.7)/.9)).add(V(0,lift,0))}
 else if(t<3.15){phase='dépôt';held=true;jaw=gap;tcp.copy(end).add(V(0,lerp(lift,0,(t-2.6)/.55),0))}
 else if(t<3.45){phase='libération';p.copy(b);tcp.copy(end);jaw=lerp(gap,.78,(t-3.15)/.3)}
 else if(t<3.85){phase='retrait';p.copy(b);tcp.copy(end).add(V(0,lerp(0,clearance,(t-3.45)/.4),0))}
 else{phase='repos';p.copy(b);tcp.copy(end).add(V(0,clearance,0)).lerp(robot.idle,ease((t-3.85)/.55))}
 tcp.y+=robot.contactOffset(jaw)-robot.contactOffset(gap);robot.solve(tcp,jaw);
 if(held)p.copy(robot.tool.getWorldPosition(V())).sub(OFFSET);
 return {p,held,phase};
}
export function animateCycle(T,robots,carton,d){
 robots.forEach(r=>r.solve(r.idle,.78));
 const input=V(-4.66,1.607,0),belt=V(2.85,1.607,0),table=V(2.95,1.374,2.55),output=V(3.72,1.607,0);
 let p=input.clone(),phase='réception',held=false,heldObject=null,activeRobot=null;
 if(T<1)p.x=lerp(-5.55,input.x,T);
 else if(T<9.2)phase='chargement';
 else if(T<12.6){phase='convoyage';p.lerp(belt,ease((T-9.2)/3.4))}
 else if(T<13.8){phase='attente';p.copy(belt)}
 else if(T<18.4){const s=transfer(robots[1],belt,table,T-13.8);p.copy(s.p);({phase,held}=s);heldObject=held?'carton':null;activeRobot=1}
 else if(T<23){phase='pliage';p.copy(table)}
 else if(T<27.6){const s=transfer(robots[1],table,output,T-23);p.copy(s.p);({phase,held}=s);heldObject=held?'carton':null;activeRobot=1}
 else if(T<37.7){p.copy(output);phase=T<32.2?'consolidation':'contrôle optique'}
 else{p.copy(output);p.x=lerp(output.x,5.55,(T-37.7)/2.8);phase='diffusion'}
 carton.root.position.copy(p);carton.root.rotation.set(0,0,0);
 const minor=T<18.4?1.91:lerp(1.91,0,(T-19.1)/.85),major=T<18.4?1.91:lerp(1.91,0,(T-20.05)/1.05);
 carton.fold(minor,major);
 const hatch=ease((T-.8)/.6)*(1-ease((T-6)/.5));
 // The visible grey block is the side hatch itself; no split rollers on the belt.
 const rise=ease((T-1.4)/1.1)*(1-ease((T-4.6)/1.2));
 d.elevator.position.y=.50+rise*1.15;
 d.piston.scale.y=Math.max(.02,d.elevator.position.y-.80);d.piston.position.y=.10;d.piston.visible=d.elevator.position.y>.84;
 let product=V(-2.1,d.elevator.position.y+.177,1.22),productHeld=false;
 if(T>=2.5&&T<7.4){
  const s=transfer(robots[0],V(-2.1,1.827,1.22),input.clone().add(V(0,.98,0)),(T-2.5)*4.6/4.9,.2295,.17);
  product.copy(s.p);productHeld=s.held;phase=s.phase;held=s.held;heldObject=held?'produit':null;activeRobot=0;
  if(T>=2.5+3.15*4.9/4.6){const fall=Math.max(0,T-(2.5+3.15*4.9/4.6)-.08);product.copy(p).add(V(0,Math.max(-.145,.98-4.905*fall*fall),0));}
 }else if(T>=7.4)product.copy(p).add(V(0,-.145,0));
 d.product.position.copy(product);
 const gate1=ease((T-8.6)/.55)*(1-ease((T-10.7)/.5));
 const gate2=ease((T-37.2)/.5);
 d.barriers[0].rotation.y=gate1*Math.PI/2;d.barriers[1].rotation.y=-gate2*Math.PI/2;
 d.scannerSignals.forEach((s,i)=>{s.visible=i===0?(T>10&&T<11.5):(T>32.2&&T<35);s.material.opacity=.15+.13*(.5+.5*Math.sin(T*9))});
 sceneUpdate(d,carton);
 const attachmentError=held?V(...robots[activeRobot].state.tcp).sub(V(0,robots[activeRobot].state.contactOffset,0)).distanceTo(heldObject==='produit'?product:p):0;
 return {time:T,phase,held,heldObject,activeRobot,attachmentError,packet:p.toArray(),product:product.toArray(),productHeld,carton:carton.state,robots:robots.map(r=>r.state),hatch,rise,feedPosition:[-2.1,0,1.22],elevatorTop:d.elevator.position.y+.024,barriers:[gate1,gate2],tableTop:1.027};
}
function sceneUpdate(d,carton){d.product.updateMatrixWorld(true);carton.root.updateMatrixWorld(true)}

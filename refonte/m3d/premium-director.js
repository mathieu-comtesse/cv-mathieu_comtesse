// V4 · Direction artistique spatiale des machines du portfolio.
// Les scènes ne sont plus des chaînes de cinq postes sur une planche : onze
// architectures et onze silhouettes, composées autour de leurs fonctions.
import * as THREE from 'three';
import {M,P,block,cyl,shaft,hoop,gear,cable,clamp,phase,ease,readout} from './premium-core.js';
const TAU=Math.PI*2;
const THEMES={
 cerfa:{title:'L’ORGANISME DE TRI',type:'fan',accent:'#bf6f41',layout:[[-108,0,-25],[-61,20,12],[-3,49,-13],[55,7,-22],[102,-5,39]]},
 vm:{title:'LA CHAMBRE DES DEUX TEMPS',type:'vault',accent:'#b0824d',layout:[[-108,2,-35],[-64,5,15],[0,47,-18],[67,7,15],[111,0,-35]]},
 vre:{title:'LE PHARE ÉLECTROTECHNIQUE',type:'spire',accent:'#669ca0',layout:[[-110,0,5],[-57,19,-26],[-7,47,15],[62,11,-25],[110,-6,25]]},
 moteur:{title:'L’ASTROLABE DES RAPPORTS',type:'carousel',accent:'#bf885c',layout:[[-110,0,-36],[-9,37,-5],[65,-2,-40],[50,6,47],[118,-5,31]]},
 gares:{title:'L’AMPHITHÉÂTRE DES PRIORITÉS',type:'city',accent:'#b58d5b',layout:[[-106,0,-37],[-68,12,20],[-2,42,-25],[64,14,23],[115,-4,-30]]},
 finance:{title:'LE CŒUR HYDRAULIQUE',type:'hydro',accent:'#6b9d9c',layout:[[-113,1,-12],[-58,17,31],[0,57,-21],[69,21,18],[113,-4,-35]]},
 pp:{title:'L’HORLOGE DES ÉCHÉANCES',type:'chronos',accent:'#b07a53',layout:[[-110,0,-25],[-50,20,24],[6,55,-16],[65,14,33],[115,-5,-28]]},
 powerbi:{title:'LE CRISTAL RELATIONNEL',type:'lattice',accent:'#6e8cb5',layout:[[-108,-4,-16],[-58,17,32],[0,54,-8],[64,13,28],[115,-2,-24]]},
 suivi:{title:'LA CATHÉDRALE DES CONNEXIONS',type:'switch',accent:'#b7875b',layout:[[-116,-3,-30],[-71,15,22],[0,48,-28],[72,15,22],[115,-2,-30]]},
 studio:{title:'LA MANUFACTURE DES RÈGLES',type:'forge',accent:'#ac7c53',layout:[[-111,0,-25],[-58,17,31],[0,42,-18],[62,16,25],[115,-3,-25]]},
 'vrestudio-musicbox':{title:'LA NEUROFORGE DOCUMENTAIRE',type:'brain',accent:'#9d866f',layout:[[-110,-3,-20],[-66,53,17],[0,76,-14],[66,45,19],[113,-2,-19]]}
};
const THIN=new THREE.MeshStandardMaterial({color:'#bfc4bf',metalness:.68,roughness:.34});
const DARK=new THREE.MeshStandardMaterial({color:'#353c45',metalness:.38,roughness:.4});
const GLASS=new THREE.MeshPhysicalMaterial({color:'#d5e1e4',metalness:0,roughness:.1,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
const COLORS={...Object.fromEntries(Object.entries(THEMES).map(([k,v])=>[k,new THREE.MeshStandardMaterial({color:v.accent,metalness:.45,roughness:.44})]))};
function part(parent,geometry,material,x=0,y=0,z=0){
 const o=new THREE.Mesh(geometry,material);
 o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function arc(parent,r,tube,x,y,z,axis='z',start=0,length=TAU,m=THIN){
 const o=part(parent,new THREE.TorusGeometry(r,tube,8,72,length),m,x,y,z);
 o.rotation.z=start;
 if(axis==='y')o.rotation.x=Math.PI/2;
 if(axis==='x')o.rotation.y=Math.PI/2;
 return o;
}
function ball(parent,r,x,y,z,mat=DARK){return part(parent,new THREE.IcosahedronGeometry(r,1),mat,x,y,z);}
function stick(parent,a,b,r=.8,mat=THIN){
 const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);
 const m=part(parent,new THREE.CylinderGeometry(r,r,d.length(),10),mat);
 m.position.copy(p).addScaledVector(d,.5);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
 return m;
}
function ribbon(parent,pts,r=.45,material=THIN){
 const curve=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v)));
 part(parent,new THREE.TubeGeometry(curve,Math.max(32,pts.length*12),r,7,false),material);
 return curve;
}
function helixPoints(rx,rz,y0,y1,turns,count=110,x=0,z=0){
 return Array.from({length:count},(_,i)=>{
  const u=i/(count-1),a=turns*TAU*u;
  return [x+Math.cos(a)*rx,y0+(y1-y0)*u,z+Math.sin(a)*rz];
 });
}
function ringIsland(root,x,y,z,idx,theme){
 const island=new THREE.Group();
 island.position.set(x,y-10,z);root.add(island);
 part(island,new THREE.CylinderGeometry(31,35,3,7),DARK,0,0,0);
 part(island,new THREE.CylinderGeometry(29,32,.7,7),THIN,0,2,0);
 arc(island,25,.7,0,2.7,0,'y',0,TAU,COLORS[theme]);
 for(let j=0;j<7;j++){
  const angle=j*TAU/7;
  const p=ball(island,1.5,Math.cos(angle)*29,3,Math.sin(angle)*29,COLORS[theme]);
 }
 for(const k of [-1,1])stick(island,[k*15,-18,0],[k*15,-2,0],1.4,DARK);
 const led=ball(island,2.1,0,4,25,COLORS[theme]);
 return island;
}
function floatingRoute(root,from,to,theme,index,particles){
 const mid=[(from[0]+to[0])*.5,(from[1]+to[1])*.5+27+index*3,(from[2]+to[2])*.5+15*(index%2?-1:1)];
 const points=[from,[from[0],from[1]+24,from[2]],mid,[to[0],to[1]+25,to[2]],to];
 const curve=ribbon(root,points,.75,THIN);
 const runner=ball(root,2.5,...from,COLORS[theme]);
 particles.push({runner,curve,speed:16+index*2,phase:index*.2});
 return curve;
}
function sculpture(name,root,profile,animate,center){
 const mat=COLORS[name],kind=profile.type;
 if(kind==='vault'){
  // Twin engine architecture, a large shared-interlock suspended in an arch.
  for(const x of [-53,53]){
   for(const z of [-31,31])stick(root,[x,5,z],[x,135,z],1.9,DARK);
   part(root,new THREE.CylinderGeometry(26,26,90,8,1,true),GLASS,x,80,0);
   for(let h=32;h<127;h+=16)arc(root,24,.85,x,h,0,'y',0,TAU,mat);
   const signal=ball(root,7,x,129,0,mat);
  }
  const vault=arc(root,93,4,0,101,0,'z',.1,Math.PI-.2,mat);
  const pin=part(root,new THREE.OctahedronGeometry(16,0),mat,0,147,0);
  const key=part(root,new THREE.TorusKnotGeometry(17,3,100,8,2,3),THIN,0,106,6);
  animate(t=>{pin.rotation.y=t*.14;key.rotation.z=Math.sin(t*.3)*.13;});
 } else if(kind==='brain'){
  // A suspended neuro-lantern; spatial and semantic rings at two pitches.
  const orb=new THREE.Group();orb.position.set(0,119,0);root.add(orb);
  const globe=part(orb,new THREE.IcosahedronGeometry(29,2),GLASS,0,0,0);
  const shells=[
   arc(orb,40,1.8,0,0,0,'x',0,TAU,mat),
   arc(orb,47,1.4,0,0,0,'y',0,TAU,THIN),
   arc(orb,55,1,0,0,0,'z',0,TAU,mat)
  ];
  const neurons=[];
  for(let i=0;i<90;i++){
   const y=1-2*(i+.5)/90,phi=i*2.39996323,rr=Math.sqrt(1-y*y);
   const p=[rr*Math.cos(phi)*31,y*31,rr*Math.sin(phi)*31];
   neurons.push(p);
   ball(orb,i%10?1.2:2,p[0],p[1],p[2],i%6?THIN:mat);
   if(i<86&&i%3===0){
    const q=helixPoints(27,27,-18,18,1.1,11,p[0]*.05,p[2]*.05).slice(2,8);
    ribbon(orb,[p,...q,neurons[(i+13)%neurons.length]||p],.24,mat);
   }
  }
  const beam=part(root,new THREE.CylinderGeometry(2,2,88,16),mat,0,44,0);
  animate(t=>{orb.rotation.y=t*.075;shells[2].rotation.z=t*.12;globe.rotation.z=t*.025;});
 } else if(kind==='hydro'){
  // Central elevated hydraulic ring with four independent input reservoirs.
  const column=part(root,new THREE.CylinderGeometry(15,21,91,24),DARK,0,59,0);
  for(let i=0;i<4;i++){
   const a=i*TAU/4+.5,x=Math.cos(a)*76,z=Math.sin(a)*61;
   const tank=part(root,new THREE.SphereGeometry(17,32,22),GLASS,x,77,z);
   const valve=part(root,new THREE.CylinderGeometry(7,7,14,24),mat,x,51,z);
   ribbon(root,[[x,51,z],[x*.7,46,z*.7],[x*.45,75,z*.45],[0,89,0]],2.4,mat);
   arc(root,18,.9,x,77,z,'y',0,TAU,THIN);
  }
  const turbine=part(root,new THREE.TorusKnotGeometry(30,2.5,150,12,2,5),mat,0,117,0);
  const lid=arc(root,42,3.1,0,121,0,'y',0,TAU,DARK);
  animate(t=>{turbine.rotation.y=t*.16;lid.rotation.z=t*.03;});
 } else if(kind==='spire'){
  // Four-tube helical light-tower and layered atrium.
  const tower=part(root,new THREE.CylinderGeometry(29,34,144,8,1,true),GLASS,0,81,0);
  const spine=part(root,new THREE.CylinderGeometry(4,5,137,14),mat,0,81,0);
  for(let j=0;j<4;j++){
   const a=j*TAU/4;
   const x=Math.cos(a)*43,z=Math.sin(a)*43;
   part(root,new THREE.CylinderGeometry(9,9,82,22,1,true),GLASS,x,69,z);
   for(let h=34;h<105;h+=15)arc(root,11,.7,x,h,z,'y',0,TAU,j%2?THIN:mat);
  }
  const spiral=ribbon(root,helixPoints(45,45,13,144,2.8,145),1.1,mat);
  const crown=arc(root,39,3,0,156,0,'y',0,TAU,DARK);
  animate(t=>{spine.rotation.y=t*.15;crown.rotation.y=t*.07;});
 } else if(kind==='carousel'){
  // Library planetarium, a vertical 360-degree book wheel.
  const rotor=new THREE.Group();rotor.position.set(0,95,-13);root.add(rotor);
  arc(rotor,71,4,0,0,0,'z',0,TAU,mat);
  arc(rotor,56,1,0,0,0,'z',0,TAU,THIN);
  for(let i=0;i<28;i++){
   const a=i*TAU/28,x=Math.cos(a)*63,y=Math.sin(a)*63;
   const card=part(rotor,new THREE.BoxGeometry(12,17,3.5),i%5?THIN:mat,x,y,0);
   card.rotation.z=a+Math.PI/2;
  }
  for(let k=0;k<8;k++){
   const a=k*TAU/8;
   stick(rotor,[0,0,0],[Math.cos(a)*68,Math.sin(a)*68,0],1.7,DARK);
  }
  ball(rotor,9,0,0,0,DARK);
  for(const x of [-85,85])stick(root,[x,8,-13],[x,95,-13],3,DARK);
  animate(t=>{rotor.rotation.z=t*.07;});
 } else if(kind==='city'){
  // Criticity theatre, an actually legible 10-station skyline on semicircular terraces.
  for(let i=0;i<10;i++){
   const a=Math.PI*(.1+i*.8/9),r=49+(i%2)*33;
   const x=Math.cos(a)*r*1.3,z=-Math.sin(a)*r;
   const height=22+(i*17%70);
   const plinth=part(root,new THREE.CylinderGeometry(8,10,height,6),i%3?DARK:mat,x,height/2+8,z);
   const rim=arc(root,12,1.2,x,height+8,z,'y',0,TAU,THIN);
  }
  const bridge=stick(root,[-78,102,-20],[78,102,-20],3.3,DARK);
  const beam=part(root,new THREE.BoxGeometry(170,5,6),mat,0,114,-20);
  const indicator=ball(root,13,0,122,-19,mat);
  animate(t=>{beam.rotation.z=Math.sin(t*.35)*.11;indicator.position.x=Math.sin(t*.25)*8;});
 } else if(kind==='chronos'){
  // Grand clockwork atrium: calendar is the dominant architecture, not a shelf.
  const dial=new THREE.Group();dial.position.set(0,98,-15);root.add(dial);
  arc(dial,75,4,0,0,0,'z',0,TAU,mat);
  arc(dial,62,1,0,0,0,'z',0,TAU,THIN);
  for(let i=0;i<12;i++){
   const a=i*TAU/12;
   const capsule=part(dial,new THREE.BoxGeometry(18,12,7),i%4===0?mat:DARK,Math.sin(a)*66,Math.cos(a)*66,0);
   capsule.rotation.z=-a;
  }
  const hand=part(dial,new THREE.BoxGeometry(4,60,5),mat,0,29,8);
  ball(dial,9,0,0,9,DARK);
  for(let x of [-75,75])stick(root,[x,0,-15],[x,96,-15],2.5,THIN);
  const second=gear(root,15,18,28,40,24);
  animate(t=>{hand.rotation.z=-t*.1;dial.rotation.z=t*.007;second.rotation.z=t*.12;});
 } else if(kind==='lattice'){
  // Multi-storey glass data cube, a weaving loom rather than a row of boxes.
  const rack=new THREE.Group();rack.position.set(0,88,-14);root.add(rack);
  for(let i=0;i<4;i++){
   const rad=32+i*15;
   const frame=part(rack,new THREE.BoxGeometry(rad*2,1.6,rad*2),i%2?THIN:mat,0,-38+i*24,0);
   frame.material=GLASS;
   for(const x of [-rad,rad])for(const z of [-rad,rad]){
    stick(rack,[x,-65,z],[x,55,z],.8,THIN);
   }
  }
  for(let i=0;i<20;i++){
   const x=-55+i*5.8;
   ribbon(rack,[[x,-43,-45],[x*.85,-10,20],[x*.65,13,-9],[x*.85,40,39]],.35,i%4===0?mat:THIN);
  }
  const core=part(rack,new THREE.OctahedronGeometry(22,1),mat,0,0,0);
  const rotor=arc(rack,43,1.5,0,0,0,'x',0,TAU,THIN);
  animate(t=>{core.rotation.y=t*.08;rotor.rotation.z=t*.12;});
 } else if(kind==='switch'){
  // Half-dome patchboard plus cabling nest, not a flat switchboard.
  const hall=arc(root,92,4,0,77,-17,'z',.05,Math.PI-.1,THIN);
  const central=part(root,new THREE.CylinderGeometry(17,29,118,12,1,true),GLASS,0,73,-15);
  const jacks=[];
  for(let i=0;i<60;i++){
   const row=Math.floor(i/12),a=(i%12)/11*Math.PI*.89+.07;
   const r=37+row*9;
   const p=[Math.cos(a)*r,35+Math.sin(a)*r,-16-row*4];
   const led=ball(root,2.2,...p,i%7===0?mat:DARK);
   jacks.push(led);
   if(i%3===0)ribbon(root,[p,[p[0]*.7,92,p[2]+16],[0,108,-12]],.4,mat);
  }
  const dial=arc(root,35,2.3,0,92,13,'z',0,TAU,mat);
  animate(t=>{dial.rotation.z=t*.08;jacks.forEach((p,i)=>p.material=(i===Math.floor(t*2)%60)?mat:DARK);});
 } else if(kind==='forge'){
  // An overhead CNC portal with suspended 3-joint articulated robot.
  for(const x of [-93,93]){
   for(const z of [-36,36])stick(root,[x,3,z],[x,135,z],2.8,DARK);
  }
  stick(root,[-95,132,-35],[95,132,-35],4.3,THIN);
  stick(root,[-95,132,35],[95,132,35],4.3,THIN);
  const carriage=part(root,new THREE.BoxGeometry(29,18,38),DARK,0,126,0);
  const shoulder=ball(root,10,0,112,0,mat);
  const segment=part(root,new THREE.CylinderGeometry(4,6,58,12),THIN,0,81,0);
  segment.rotation.z=.32;
  const elbow=ball(root,7,17,62,0,DARK);
  const hand=part(root,new THREE.CylinderGeometry(3,5,40,12),mat,21,39,0);
  hand.rotation.z=-.28;
  const drill=part(root,new THREE.ConeGeometry(3.2,18,14),DARK,25,14,0);
  const table=part(root,new THREE.BoxGeometry(100,6,64),DARK,0,9,0);
  const tray=part(root,new THREE.BoxGeometry(74,1,44),THIN,0,13,0);
  animate(t=>{carriage.position.x=Math.sin(t*.21)*25;segment.rotation.z=.32+Math.sin(t*.4)*.12;hand.rotation.z=-.28+Math.cos(t*.5)*.2;drill.rotation.y=t*2.1;});
 } else if(kind==='fan'){
  // Bloom-like triage organism with a central optical chamber and four petals.
  const lens=part(root,new THREE.DodecahedronGeometry(32,2),GLASS,0,90,0);
  const iris=arc(root,39,3.3,0,91,0,'y',0,TAU,mat);
  const rings=[arc(root,53,2,0,91,0,'z',0,TAU,THIN),arc(root,60,1.3,0,91,0,'x',0,TAU,mat)];
  for(let i=0;i<4;i++){
   const a=i*TAU/4+.4,x=Math.cos(a)*79,z=Math.sin(a)*57;
   const petal=part(root,new THREE.ConeGeometry(18,51,5,1),i%2?THIN:mat,x,58,z);
   petal.rotation.x=.25*Math.sin(a);petal.rotation.z=.25*Math.cos(a);
   ribbon(root,[[0,67,0],[x*.5,78,z*.5],[x,50,z]],1.8,mat);
  }
  const core=ball(root,13,0,91,0,mat);
  animate(t=>{iris.rotation.z=t*.16;rings[0].rotation.y=t*.08;rings[1].rotation.z=-t*.05;core.rotation.y=t*.12;});
 }
}
export function directMachine(name,machine){
 const profile=THEMES[name];
 if(!profile)return {update(){}};
 // The previous factory plinth, five linear machine locations and associated
 // straight documentary stream are removed. Modules retain their real internals.
 const root=machine.group;
 for(const child of [...root.children])if(!machine.zones.includes(child))root.remove(child);
 const animations=[],particles=[];
 const animate=fn=>animations.push(fn);
 machine.zones.forEach((group,i)=>{
  const position=profile.layout[i],previous=group.position.clone();
  group.position.set(...position);
  const d=new THREE.Vector3(position[0]*.14,24+i*4,position[2]*.2);
  group.userData.explode=d;
  ringIsland(root,position[0],position[1],position[2],i,name);
 });
 // A floating, curved choreography instead of the previous straight pipe.
 for(let i=0;i<4;i++){
  const p=profile.layout[i],q=profile.layout[i+1];
  floatingRoute(root,[p[0],p[1]+56,p[2]],[q[0],q[1]+56,q[2]],name,i,particles);
 }
 sculpture(name,root,profile,animate);
 const signature=new THREE.Group();signature.name='ArtDirection_'+profile.type;
 root.userData.themeName=profile.title;
 root.userData.themeType=profile.type;
 const original=machine.update.bind(machine);
 machine.update=t=>{
  original(t);
  animations.forEach(fn=>fn(t));
  for(const p of particles){
   const u=phase(t+p.phase*p.speed,p.speed),v=p.curve.getPoint(u);
   p.runner.position.copy(v);
   p.runner.scale.setScalar(.8+Math.sin(Math.PI*u)*.5);
  }
 };
 return {profile,update(){}};
}

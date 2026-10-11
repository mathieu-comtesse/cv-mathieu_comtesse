import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/BufferGeometryUtils.js';
import {processSymbol} from './process-symbols.js?v=cv-scene-v29';
import {reconstructedProjects} from './project-scenes-data.js?v=cv-projects-v2b';
export const isReconstructed=id=>reconstructedProjects.some(p=>p.id===id);
export function initReconstructedScene(model,id){
 const project=reconstructedProjects.find(p=>p.id===id),steps=project.steps,v=a=>new THREE.Vector3(...a);
 const scene=new THREE.Group();scene.name='ProcessObjects';model.add(scene);
 let step=0,elapsed=0,operation={},gauge=80,resources=[],tokens=[],markers=[],screens=[],nodes={},base={},disposed=false,loaded=false,lastScreen=-1;
 const duration=6.4,cycle=57.6;
 function mesh(g,m,pos,parent=scene){const o=new THREE.Mesh(g,m);o.position.fromArray(pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function smooth(a,b,x){return THREE.MathUtils.smoothstep(x,a,b)}
 function canvasTexture(draw,w=512,h=320){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;resources.push(t);return t}
async function symbolTexture(kind){return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(canvasTexture((ctx,w,h)=>{ctx.fillStyle='#fafbf7';ctx.beginPath();ctx.roundRect(0,0,w,h,28);ctx.fill();ctx.drawImage(img,24,24,w-48,h-48)},128,128));img.onerror=reject;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(processSymbol(kind).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" ').replaceAll('currentColor',project.color))})}
function drawDisplay(ctx,w,h,index=0){ctx.fillStyle='#0e222b';ctx.fillRect(0,0,w,h);ctx.fillStyle='#90c8ce';ctx.font='bold 22px Arial';ctx.fillText(id==='studio'?'STUDIO LOCAL':id==='gares'?'VIGILANCE · GARES':'SUIVI · '+['OT','ÉQUIPEMENT','BÂTIMENT'][index%3],22,35);ctx.fillStyle='#e6eee9';ctx.font='18px Arial';ctx.fillText(steps[step].title.slice(0,36),22,69);
 if(id==='studio'){
  ctx.fillStyle='#eceee4';ctx.fillRect(60,84,210,220);ctx.strokeStyle=project.color;ctx.lineWidth=3;for(let i=0;i<5;i++){ctx.fillStyle='#a0aaaa';ctx.fillRect(80,108+i*31,160,5);if(step>=2){ctx.strokeRect(75,100+i*31,171,25)}}ctx.fillStyle='#9dccba';ctx.font='16px Arial';ctx.fillText(['PDF exemple','Page rendue','Zones tracées','Champs définis','Règles configurées','Essai effectué','HTML autonome','Export de l’outil','100 % local'][step],300,132);for(let i=0;i<4;i++){ctx.fillStyle='#386167';ctx.fillRect(303,164+i*30,164,13)}
 }else if(id==='gares'){
  ctx.font='15px Arial';const rows=['Gare A · vigilance','Gare B · conformité','Gare C · maintenance'];rows.forEach((txt,i)=>{ctx.fillStyle=i===0&&step>=4?'#e7af4f':'#94c8c3';ctx.fillRect(22,95+i*57,11,11);ctx.fillText(txt,47,108+i*57)});ctx.fillStyle='#9dadad';ctx.fillText('Démonstration illustrative',22,290)
 }else{
  for(let i=0;i<6;i++){ctx.fillStyle=i===(step+index)%6?'#307c84':'#24404a';ctx.fillRect(22,89+i*32,w-44,25);ctx.fillStyle='#bdd2d3';ctx.font='15px Arial';ctx.fillText(['Ordre de travail','Équipement','Bâtiment','Lien documentaire','Maintenance','Source associée'][i],34,106+i*32)}
 }}
function paintScreens(){screens.forEach((o,i)=>{const tex=o.material.map;const c=tex.image;drawDisplay(c.getContext('2d'),c.width,c.height,i);tex.needsUpdate=true})}
function screenUV(o){
 const g=o.geometry=o.geometry.clone(),p=g.attributes.position;g.computeBoundingBox();const b=g.boundingBox,size=b.getSize(new THREE.Vector3()),vertical=size.z>size.y?'z':'y',uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){uv[i*2]=(p.getX(i)-b.min.x)/size.x;uv[i*2+1]=((vertical==='z'?p.getZ(i):p.getY(i))-b.min[vertical])/size[vertical]}
 g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}
function optimise(root){
 root.updateMatrixWorld(true);const groups=new Map();
 root.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material))return;
  let dynamic=/^(Display_\d|SideDisplay_|StudioScreen|Radar face)/.test(o.name);
  for(let p=o;p&&p!==root;p=p.parent)if(/^(Drum|Door_|Locker_|Trolley|Spreader|Cargo|HoistCable_|Gauge|Wheel|GateBlade|Alert_|Sweep|ToolParcel|Observer|Colleague)/.test(p.name))dynamic=true;
  if(dynamic)return;
  let group=groups.get(o.material.uuid);
  if(!group){group={material:o.material,geo:[],objects:[]};groups.set(o.material.uuid,group)}
  // Blender primitives have different attribute sets. Normalize them before merging.
  const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);
  for(const name of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(name))geo.deleteAttribute(name);
  if(!geo.attributes.normal)geo.computeVertexNormals();
  if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
  group.geo.push(geo);group.objects.push(o);
 });
 for(const group of groups.values()){
  const merged=mergeGeometries(group.geo,false);
  // A failed merge must never remove visible source meshes.
  if(merged){const o=mesh(merged,group.material,[0,0,0]);o.name='Static '+group.material.name;group.objects.forEach(o=>o.removeFromParent())}
  group.geo.forEach(g=>g.dispose());
 }
}
function node(n){return nodes[n]}
function reset(n){const o=node(n);if(o&&base[n]){o.position.copy(base[n].p);o.quaternion.copy(base[n].q);o.scale.copy(base[n].s)}return o}
let flowBars,vrCounters=[],cargoAttached=false;
function update(T){const t=THREE.MathUtils.euclideanModulo(T,cycle),f=t/duration;operation={time:t};
 if(id==='cerfa'){
  node('Drum').rotation.x=t*.78;tokens.forEach((o,i)=>{const u=THREE.MathUtils.euclideanModulo(t*.09+i/3,1);o.position.set(1.8+u*2.85,.77+u*.20,.25);o.rotation.x=-Math.atan2(.22,3.15);o.visible=u>.05&&u<.94});operation.drum=node('Drum').rotation.x;
 }else if(id==='vre'){
  for(let i=0;i<3;i++){const o=reset('Door_'+i),start=[1,2.6,6][i],angle=smooth(start,start+.65,f);o.rotation.y=-1.36*angle;vrCounters[i].visible=f>=start+.65;}operation.doors=[0,1,2].map(i=>node('Door_'+i).rotation.y);
 }else if(id==='vmvre'){
  const x=THREE.MathUtils.lerp(-.84,.8,smooth(4.5,5.7,f));let y=1.15-.5*smooth(2,2.7,f)+2.15*smooth(3,3.8,f)-2.15*smooth(5.7,6.5,f)+.9*smooth(7,7.6,f);node('Trolley').position.x=x;node('Spreader').position.set(x,y,0);cargoAttached=f>=2.7&&f<6.6;const cargo=node('Cargo');cargo.position.set(cargoAttached?x:(f<2.7?-.84:.8),cargoAttached?y-.61:.04,0);
  for(let i=0;i<4;i++){const c=reset('HoistCable_'+i);if(c){c.position.y+=(y-1.15)/2;c.position.x+=x;c.scale.y=(3.60-y)/(3.60-1.15)}}operation={time:t,x,hoistY:y,cargoAttached,cargo:cargo.position.toArray(),clearance:y-cargo.position.y-.42};
 }else if(id==='finance'){
  const ratio=f<5?.22+f*.09:f<6?.65+(f-5)*.17:f<7?.82:1.05;const g=node('Gauge');g.scale.y=Math.min(ratio,1);node('Wheel').rotation.y=gauge/100*Math.PI*2+Math.sin(t*.5)*.025;node('GateBlade').position.y=base.GateBlade.p.y;
  reset('Alert_0').visible=ratio>=gauge/100;reset('Alert_1').visible=ratio>1;operation={time:t,ratio,threshold:gauge/100,preventive:ratio>=gauge/100,overspend:ratio>1};
 }else if(id==='gares'){
  node('Sweep').rotation.y=-t*.9;for(let i=0;i<4;i++){const b=reset('Blip_'+i);b.scale.setScalar(f>=4?1+(i===3?.35:0):.75);b.visible=f>=1+i*.6;}operation.sweep=node('Sweep').rotation.y;
 }else if(id==='studio'){
  const selected='Locker_1_1_3';for(const n of Object.keys(nodes).filter(n=>n.startsWith('Locker_')))reset(n);
  const open=smooth(6.6,7.4,f);node(selected).rotation.y=-1.5*open;node('ToolParcel').position.z=base.ToolParcel.p.z+.45*smooth(7.5,8.3,f);operation={time:t,door:node(selected).rotation.y,exported:f>=7.5};
 }else if(id==='terrain'){
  for(const n of ['Observer_Arm_-1','Colleague_Arm_-1']){const a=reset(n);a.rotation.x=Math.sin(t*1.3)*.09-.12;}operation.observation=f<3;operation.workshop=f>=3;
 }else if(id==='suivi'){operation.activeScreen=step%3;}
 processUpdate(f);model.updateMatrixWorld(true);
}
async function extras(){
 for(let i=0;i<9;i++){const tex=await symbolTexture(steps[i].kind);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.position.copy(v(steps[i].point)).add(v([0,project.size*.06,0]));s.scale.setScalar(project.size*.065);s.renderOrder=20;scene.add(s);markers.push(s)}
 if(id==='cerfa'){const tex=await symbolTexture('pdf');for(let i=0;i<3;i++){const g=new THREE.Group();mesh(new THREE.BoxGeometry(.26,.025,.30),new THREE.MeshStandardMaterial({color:'#eeeadd'}),[0,0,0],g);const m=mesh(new THREE.PlaneGeometry(.22,.26),new THREE.MeshBasicMaterial({map:tex}),[0,.014,0],g);m.rotation.x=-Math.PI/2;scene.add(g);tokens.push(g)}}
 if(id==='vre')for(let i=0;i<3;i++)vrCounters.push(new THREE.Group());
 if(id==='studio'||id==='suivi'){const names=id==='studio'?['StudioScreen']:['Display_0','Display_1','Display_2','SideDisplay_-1','SideDisplay_1'];for(const name of names){const o=node(name);if(o){screenUV(o);o.material=new THREE.MeshBasicMaterial({map:canvasTexture((c,w,h)=>drawDisplay(c,w,h,screens.length)),toneMapped:false});screens.push(o)}}}
 if(id==='gares'){const panel=mesh(new THREE.PlaneGeometry(1.04,.32),new THREE.MeshBasicMaterial({map:canvasTexture(drawDisplay)}),[0,1.95,-.398]);screens.push(panel)}
}

 // The process is acted out by objects within the scenery, without added displays or cables.
let physical=[],familyTiles=[],historyUnits=[],summaryEnvelope,clockFace,clockHands=[];
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.65});
function paper(kind,position,size=.40){
 const g=new THREE.Group();g.position.fromArray(position);scene.add(g);
 mesh(new THREE.BoxGeometry(size,size*.035,size*.75),mat('#efe9d6'),[0,0,0],g);
 const icon=mesh(new THREE.PlaneGeometry(size*.82,size*.60),new THREE.MeshBasicMaterial({map:physicalIcons[kind],transparent:true,toneMapped:false}),[0,size*.019,0],g);icon.rotation.x=-Math.PI/2;
 return g;
}
let physicalIcons={};
async function processExtras(){
 for(const kind of ['pdf','excel','outlook','check','inject','html'])physicalIcons[kind]=await symbolTexture(kind);
 if(id==='vre'){
  for(let j=0;j<4;j++){
   const g=new THREE.Group();g.position.set(-1.5+j,.15,1.05);scene.add(g);familyTiles.push(g);
   mesh(new THREE.BoxGeometry(.82,.06,.68),mat('#e8e3d0'),[0,0,0],g);
   for(let k=0;k<[18,18,4,6][j];k++)mesh(new THREE.BoxGeometry(.07,.05,.09),mat(['#597578','#a3791f','#476b82','#297577'][j]),[-.3+(k%6)*.12,.06, -.23+Math.floor(k/6)*.18],g);
   const sheet=paper('excel',[-1.5+j,.25,1.05],.62);physical.push({o:sheet,j});
  }
 }else if(id==='vmvre'){
  for(let j=0;j<2;j++){const g=paper('check',[.65+j*.48,.12,1.1],.38);historyUnits.push(g);}
  summaryEnvelope=paper('outlook',[.9,.13,1.55],.56);
  clockFace=new THREE.Group();clockFace.position.set(.45,2.9,.38);scene.add(clockFace);
  const face=mesh(new THREE.CylinderGeometry(.23,.23,.035,32),mat('#efe9d6'),[0,0,0],clockFace);face.rotation.x=Math.PI/2;
  for(let j=0;j<12;j++){const a=j*Math.PI/6;mesh(new THREE.SphereGeometry(.012,8,6),mat('#71542c'),[Math.sin(a)*.19,Math.cos(a)*.19,.025],clockFace);}
  for(const length of [.12,.17]){const hand=new THREE.Group();clockFace.add(hand);mesh(new THREE.BoxGeometry(.012,length,.02),mat('#71542c'),[0,length/2,.045],hand);clockHands.push(hand);}
 }else if(id==='finance'){
  for(let j=0;j<2;j++)physical.push({o:paper('outlook',[2.57,1.1+j*.53,.45],.35),j});
 }else if(id==='cerfa'){
  for(let j=0;j<3;j++)physical.push({o:paper('excel',[3.9+j*.20,1.02,.25],.24),j});
 }else if(id==='studio'){
  // The configured extractor leaves the existing animated locker as a physical parcel.
  const parcel=node('ToolParcel');if(parcel)physical.push({o:paper('html',[1.29,1.88,.56],.28),j:0});
 }
}
function processUpdate(f){
 const i=Math.min(8,Math.floor(f)),p=smooth(.08,.85,f-i);operation.semantic={step:i,progress:p,addedDisplays:0,addedConnections:0};
 if(id==='vre'){
  familyTiles.forEach((g,j)=>{
   g.visible=i>=2;g.children.slice(1).forEach((o,k)=>{o.visible=i>=6||i>=j+2;o.position.y=.06+(i===6&&p<j*.18+.15?.16*(1-p):0);});
   g.position.set(-1.5+j,.15,1.05);
  });
  physical.forEach(({o,j})=>{o.visible=i>=7;o.position.set(-1.5+j,.23+(i===7?(1-p)*.5:0),1.05+(i===8?p*.65:0));});
  operation.semantic.checkedFamilies=i===6?Math.min(4,Math.floor(p*5)):i>6?4:0;
  operation.semantic.excelRows=i===7?Math.min(4,Math.floor(p*5)):i>7?4:0;
  operation.semantic.pamRows=i===8?Math.min(4,Math.floor(p*5)):0;
 }else if(id==='vmvre'){
  historyUnits.forEach((o,j)=>{o.visible=i>=7&& (i>7||p>j*.3+.16);o.position.y=.12+(i===7?(1-p)*.55:0);});
  clockFace.visible=i===8;clockHands[0].rotation.z=-5*Math.PI/6;clockHands[1].rotation.z=(1-p)*Math.PI*.03;
  summaryEnvelope.visible=i===8&&p>.25;summaryEnvelope.position.set(.9,.13+p*.9,1.55);
  operation.semantic.historyRows=i===7?(p>.46?2:p>.16?1:0):i===8?2:0;
  operation.semantic.duplicateRejected=i===7&&p>.68;
  operation.semantic.summaryRows=i===8?(p>.5?2:p>.25?1:0):0;
  operation.semantic.time=i===8&&p>.8?'17:00':'16:59';
 }else if(id==='finance'){
  physical.forEach(({o,j})=>{o.visible=j?operation.overspend:operation.preventive;o.position.set(2.57,1.1+j*.53+p*.18,.45+p*.23);});
  const g=node('Gauge');if(g?.material?.color)g.material.color.set(operation.overspend?'#b94a35':operation.preventive?'#e4aa37':'#417f87');
 }else if(id==='cerfa')physical.forEach(({o,j})=>{o.visible=i>=7;o.position.x=3.7+j*.22+(i===8?p*.55:0);});
 else if(id==='studio')physical.forEach(({o})=>{o.visible=i>=7;o.position.z=.56+.45*smooth(7.5,8.3,f);});
}

 function cleanup(){scene.removeFromParent();scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}if(o.isSprite)o.material.dispose();});resources.forEach(t=>t.dispose());resources=[];}
 const ready=(async()=>{model.traverse(o=>{nodes[o.name]=o;base[o.name]={p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()};});optimise(model);await extras();await processExtras();if(disposed){cleanup();return;}loaded=true;update(0);paintScreens();})();
 return {ready,duration,focusPoint:i=>v(steps[i].point),get state(){return {id,ready:loaded,step,elapsed,operation,addedDisplays:0,addedConnections:0}},
 update(state){if(!loaded||disposed)return;step=state.step;elapsed=Math.min(state.elapsed,duration-.001);markers.forEach((m,i)=>m.visible=i===step);let time=step*duration+elapsed;if(id==='finance'&&state.exception)time=6.8*duration;update(time);if(lastScreen!==step){paintScreens();lastScreen=step;}model.userData.processState=this.state;},
 dispose(){disposed=true;cleanup();}};
}

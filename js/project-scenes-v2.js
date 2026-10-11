import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/BufferGeometryUtils.js';
import {processSymbol} from './process-symbols.js?v=cv-scene-v29';
import {reconstructedProjects} from './project-scenes-data.js?v=cv-projects-v4';
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
 root.updateMatrixWorld(true);const inverseRoot=root.matrixWorld.clone().invert(),groups=new Map();
 root.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material))return;
  let dynamic=/^(Display_\d|SideDisplay_|StudioScreen|Radar face)/.test(o.name);
  for(let p=o;p&&p!==root;p=p.parent)if(/^(Drum|Door_|Locker_|Trolley|Spreader|Cargo|HoistCable_|Gauge|Wheel|GateBlade|Alert_|Sweep|Blip_|Needle_|Valve_|StatusLamp_|InputDocument|OutputDocument|ToolParcel|Observer|Colleague|MailEnvelope_|ThresholdMarker|FlowPipe_|Exchanger_body)/.test(p.name))dynamic=true;
  if(dynamic)return;
  // Static meshes received per-mesh material clones: identical clones share one draw call.
  const key=o.material.name||o.material.uuid;let group=groups.get(key);
  if(!group){group={material:o.material,geo:[],objects:[]};groups.set(key,group)}
  // Blender primitives have different attribute sets. Normalize them before merging.
  const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseRoot,o.matrixWorld));
  for(const name of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(name))geo.deleteAttribute(name);
  if(!geo.attributes.normal)geo.computeVertexNormals();
  if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
  group.geo.push(geo);group.objects.push(o);
 });
 for(const group of groups.values()){
  const merged=mergeGeometries(group.geo,false);
  // A failed merge must never remove visible source meshes.
  if(merged){const o=mesh(merged,group.material,[0,0,0]);o.name='Static '+group.material.name;group.objects.forEach(o=>{o.removeFromParent();if(o.material!==group.material)o.material.dispose();})}
  group.geo.forEach(g=>g.dispose());
 }
}
function node(n){return nodes[n]}
// Point financier : un tour de volant lève l'opercule d'un pas de vis (valeurs du modèle Blender).
const PITCH=.055,TRAVEL=1.05,TAU=Math.PI*2;
function bezier(a,b,c,u){return a.clone().multiplyScalar((1-u)*(1-u)).addScaledVector(b,2*u*(1-u)).addScaledVector(c,u*u)}
function mailFlight(o,u,exitY,target){
 // Inside the feed pipe, out through the opened port, then an arc onto its alert plate.
 const start=v([1.3,exitY,-.30]),mouth=v([1.3,exitY,.34]),end=v(target);
 if(u<.32){o.position.lerpVectors(start,mouth,smooth(0,1,u/.32));o.rotation.set(0,0,0);return}
 const k=smooth(0,1,(u-.32)/.68);o.position.copy(bezier(mouth,v([(1.3+target[0])/2,Math.max(exitY,target[1])+.75,.55]),end,k));
 o.rotation.set(Math.sin(k*Math.PI)*.35,0,Math.sin(k*Math.PI*2)*.22);
}
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
  const ratio=f<5?.22+f*.09:f<6?.65+(f-5)*.17:f<7?.82:1.05;const g=node('Gauge');g.scale.y=Math.min(ratio,1);
  // Seuil modulable : le repère oscille puis se cale à 80 %.
  const marker=reset('ThresholdMarker');if(marker&&f>=4&&f<5)marker.position.y+=Math.sin((f-4)*TAU*1.5)*(1-smooth(4,4.9,f))*.25;
  // The handwheel turns the screw; the bronze nut carries the blade by one pitch per turn.
  const lift=TRAVEL*(.5*smooth(6.06,6.4,f)+.5*smooth(7.06,7.4,f)-smooth(8.12,8.75,f)),turns=lift/PITCH;
  reset('GateBlade').position.y+=lift;reset('Wheel').rotateY(-turns*TAU);
  const mails=[[6.4,.52,[2.57,1.1,.06]],[7.4,.74,[2.57,1.63,.06]]].map(([start,exitY,target],i)=>{const o=node('MailEnvelope_'+i),u=THREE.MathUtils.clamp((f-start)/.38,0,1);if(o){o.visible=f>=start&&f<9;mailFlight(o,u,exitY,target);}const plate=node('Alert_'+i);plate?.traverse(m=>{if(m.isMesh&&/Envelope[ _]folds/.test(m.name)){m.visible=u>=1;m.material.emissive?.set(u>=1&&f<8.12?(i?'#5a0b06':'#5a3a00'):'#000000');}});return u>=1?'delivered':f>=start?'sending':'waiting';});
  operation={time:t,ratio,threshold:gauge/100,preventive:ratio>=gauge/100,overspend:ratio>1,gateLift:lift,wheelTurns:turns,mails};
 }else if(id==='pa'){
  const valves=[],needles=[];
  // Each valve turns three times when its circuit opens: 0 prise en charge, 4 listing,
  // 2-3 régulateurs du classement, 1 relances.
  for(let i=0;i<5;i++){const valve=reset('Valve_'+i);if(valve){const axis=i===2||i===3?'z':'y',start=[1.05,8.05,5.05,5.3,4.05][i];valve.rotation[axis]+=smooth(start,start+.55,f)*3*TAU;valves.push(valve.rotation[axis]);}}
  const flow=paFlow(f);
  for(let i=0;i<3;i++){const needle=reset('Needle_'+i);if(needle){needle.rotation.z=i<2?-.9+1.7*smooth(3.05+i*.3,3.6+i*.3,f)+.06*Math.sin(t*7+i*2)*flow.red:-.9+1.7*(f<7?0:f<8?.5-.5*Math.cos((f-7)*TAU*1.5):1);needles.push(needle.rotation.z);}}
  for(let i=0;i<9;i++){const lamp=node('StatusLamp_'+i);lamp?.traverse(o=>{if(o.isMesh){o.material.color.set(i<=step?'#4da97b':'#244d39');o.material.emissive.set(i===step?'#123a23':'#000000');}});}
  const input=reset('InputDocument'),output=reset('OutputDocument');
  if(input){const drop=1-smooth(0,.3,f),go=smooth(1.05,1.55,f);input.visible=f<1.55;input.position.y+=drop*.45+go*.72;input.position.x+=go*-.39;input.position.z+=go*.06;input.scale.setScalar(1-go*.75);}
  if(output){const fall=smooth(6.05,6.5,f);output.visible=f>=6.05;output.position.y+=(1-fall)*.62;output.position.x+=(1-fall)*.28;output.scale.setScalar(.3+.7*fall);}
  paUpdate(t,f,flow);
  operation={time:t,valves,needles,checked:f>=3.6,classified:f>=6.5,flow,steam:paSteam,relances:paRelances};
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
// Chaîne des PP : flux qui défile dans les conduites, vapeur des évents, mails de relance.
let paPipes=[],paStripes,paScanner,paPuffs=[],paMails=[],paSteam=[0,0],paRelances=0;
const paCircuits={red:'#ff7656',yellow:'#ffd75a',green:'#8dffa8',standby:'#8dffa8'};
function paFlow(f){return {red:smooth(1.1,1.6,f)*(1+.7*(f>=5&&f<6?Math.sin((f-5)*Math.PI):0)),yellow:smooth(2.05,2.5,f),green:smooth(4.05,4.5,f),standby:smooth(4.05,4.5,f)}}
function paVentRate(vent,f){f=THREE.MathUtils.euclideanModulo(f,9);return vent?(f<2?0:f<3?1:.22):(f<4?0:f<8?.3:1)}
function paExtras(){
 paStripes=canvasTexture((c,w,h)=>{c.fillStyle='#000';c.fillRect(0,0,w,h);c.fillStyle='#fff';for(const y of [0,h/2]){c.beginPath();c.moveTo(w*.40,y+h*.08);c.lineTo(w*.55,y+h*.08);c.lineTo(w*.76,y+h*.25);c.lineTo(w*.55,y+h*.42);c.lineTo(w*.40,y+h*.42);c.lineTo(w*.61,y+h*.25);c.closePath();c.fill();}},128,128);
 paStripes.colorSpace=THREE.NoColorSpace;paStripes.wrapS=paStripes.wrapT=THREE.RepeatWrapping;paStripes.repeat.set(1/.42,1);
 for(const [key,color] of Object.entries(paCircuits)){const o=node('FlowPipe_'+key);o?.traverse(m=>{if(m.isMesh){m.material.emissiveMap=paStripes;m.material.emissive.set(color);m.material.emissiveIntensity=0;m.material.needsUpdate=true;paPipes.push({m,key});}});}
 const body=node('Exchanger_body');if(body?.isMesh)body.material.emissive.set('#ff8a3a');
 paScanner=mesh(new THREE.TorusGeometry(.215,.012,12,72),new THREE.MeshStandardMaterial({color:'#bff7ff',emissive:'#41d6ff',emissiveIntensity:1.6,roughness:.3}),[0,1.5,-.33]);paScanner.rotation.y=Math.PI/2;paScanner.castShadow=false;
 const puff=canvasTexture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.45,'rgba(240,244,246,.55)');g.addColorStop(1,'rgba(240,244,246,0)');c.fillStyle=g;c.fillRect(0,0,w,h);},64,64);
 for(let i=0;i<44;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:puff,transparent:true,depthWrite:false,opacity:0,color:'#9aa6ad'}));sp.renderOrder=5;scene.add(sp);paPuffs.push(sp);}
 const flapShape=new THREE.Shape([new THREE.Vector2(-.11,0),new THREE.Vector2(.11,0),new THREE.Vector2(0,-.08)]);
 for(let i=0;i<3;i++){const g=new THREE.Group();mesh(new THREE.BoxGeometry(.22,.15,.008),new THREE.MeshStandardMaterial({color:'#f3eedf',roughness:.8,transparent:true}),[0,0,0],g);mesh(new THREE.ShapeGeometry(flapShape),new THREE.MeshStandardMaterial({color:'#d7462e',roughness:.6,transparent:true,side:THREE.DoubleSide}),[0,.075,.0045],g);scene.add(g);paMails.push(g);}
}
function paUpdate(t,f,flow){
 paStripes.offset.x=-t*.5/.42;
 for(const {m,key} of paPipes)m.material.emissiveIntensity=.6*flow[key];
 const reading=f>=2&&f<3,body=node('Exchanger_body');if(body?.isMesh)body.material.emissiveIntensity=reading?.22+.18*Math.sin(t*5):0;
 paScanner.visible=reading;paScanner.position.x=.025+.6*Math.sin((f-2)*TAU*1.2);
 // Stateless steam: each puff is reborn on a fixed period, its density set by the vent rate at birth.
 const vents=[0,1].map(i=>node('SteamVent_'+i)?.getWorldPosition(new THREE.Vector3())??v([0,3,0])),life=2.1,up=v([0,1,0]),out=[v([1,.15,0]),v([0,1,0])];
 paSteam=[paVentRate(0,f),paVentRate(1,f)];
 paPuffs.forEach((p,i)=>{const vent=i%2,phase=(i>>1)/(paPuffs.length/2),age=THREE.MathUtils.euclideanModulo(t+phase*life,life),birth=(t-age)/duration,rate=paVentRate(vent,birth),seed=Math.sin(i*12.9898+Math.floor((t-age)/life)*78.233)*43758.5453%1,alive=Math.abs(seed)<rate;
  p.visible=alive;if(!alive)return;const k=age/life;p.position.copy(vents[vent]).addScaledVector(out[vent],Math.min(age,.5)*.55).addScaledVector(up,age*.24+age*age*.05).add(v([Math.sin(i*1.7)*k*.22,0,Math.cos(i*2.3)*k*.22]));
  p.scale.setScalar(.08+k*.46);p.material.opacity=.85*Math.pow(1-k,1.2)*smooth(0,.08,k);});
 paRelances=0;paMails.forEach((g,i)=>{const u=THREE.MathUtils.clamp((f-8.15-i*.22)/.6,0,1);g.visible=u>0&&u<1;if(!g.visible)return;paRelances++;g.position.copy(vents[0]).addScaledVector(out[0],u*.5).addScaledVector(up,u*.62).add(v([0,0,Math.sin(u*Math.PI*2+i)*.12]));g.rotation.set(0,u*1.5+i,Math.sin(u*TAU+i)*.3);g.children.forEach(m=>m.material.opacity=1-smooth(.7,1,u));});
}
async function extras(){
 if(id==='pa')paExtras();
 for(let i=0;i<(['gares','pa','finance'].includes(id)?0:9);i++){const tex=await symbolTexture(steps[i].kind);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.position.copy(v(steps[i].point)).add(v([0,project.size*.06,0]));s.scale.setScalar(project.size*.065);s.renderOrder=20;scene.add(s);markers.push(s)}
 if(id==='cerfa'){const tex=await symbolTexture('pdf');for(let i=0;i<3;i++){const g=new THREE.Group();mesh(new THREE.BoxGeometry(.26,.025,.30),new THREE.MeshStandardMaterial({color:'#eeeadd'}),[0,0,0],g);const m=mesh(new THREE.PlaneGeometry(.22,.26),new THREE.MeshBasicMaterial({map:tex}),[0,.014,0],g);m.rotation.x=-Math.PI/2;scene.add(g);tokens.push(g)}}
 if(id==='vre')for(let i=0;i<3;i++)vrCounters.push(new THREE.Group());
 if(id==='studio'||id==='suivi'){const names=id==='studio'?['StudioScreen']:['Display_0','Display_1','Display_2','SideDisplay_-1','SideDisplay_1'];for(const name of names){const o=node(name);if(o){screenUV(o);o.material=new THREE.MeshBasicMaterial({map:canvasTexture((c,w,h)=>drawDisplay(c,w,h,screens.length)),toneMapped:false});screens.push(o)}}}

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
  physical.forEach(({o,j})=>{o.visible=j?operation.overspend:operation.preventive;o.position.set(2.57,1.1+j*.53,.045);});
  const g=node('Gauge');if(g?.material?.color)g.material.color.set(operation.overspend?'#b94a35':operation.preventive?'#e4aa37':'#417f87');
 }else if(id==='cerfa')physical.forEach(({o,j})=>{o.visible=i>=7;o.position.x=3.7+j*.22+(i===8?p*.55:0);});
 else if(id==='studio')physical.forEach(({o})=>{o.visible=i>=7;o.position.z=.56+.45*smooth(7.5,8.3,f);});
}

 function cleanup(){scene.removeFromParent();scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}if(o.isSprite)o.material.dispose();});resources.forEach(t=>t.dispose());resources=[];}
 const ready=(async()=>{model.traverse(o=>{nodes[o.name]=o;base[o.name]={p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()};if(o.isMesh&&o.parent?.name.startsWith('StatusLamp_'))o.material=o.material.clone();});optimise(model);await extras();await processExtras();if(disposed){cleanup();return;}loaded=true;update(0);paintScreens();})();
 // Moving effects that must stay inside the fitted camera frame (steam plumes, mail arcs).
 const framePoints=()=>id==='pa'?[0,1].flatMap(i=>{const p=node('SteamVent_'+i)?.getWorldPosition(new THREE.Vector3());return p?[p.clone().add(v([i?0:.3,.35,0]))]:[]}):id==='finance'?[v([1.9,2.3,.6]),v([2.57,1.9,.2])]:[];
 return {ready,duration,framePoints,focusPoint:i=>v(steps[i].point),get state(){return {id,ready:loaded,step,elapsed,operation,addedDisplays:0,addedConnections:0}},
 update(state){if(!loaded||disposed)return;step=state.step;elapsed=Math.min(state.elapsed,duration-.001);markers.forEach((m,i)=>m.visible=i===step);let time=step*duration+elapsed;if(id==='finance'&&state.exception)time=6.8*duration;update(time);if(lastScreen!==step){paintScreens();lastScreen=step;}model.userData.processState=this.state;},
 dispose(){disposed=true;cleanup();}};
}

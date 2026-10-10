import {THREE,tube,mat} from './kit.js?v=cv-scene-v29';
// Blender authored pump: the handle, hands, valve and pressure share one clock.
export function createBicyclePump(gltf,bike){
 const root=gltf.scene;root.name='BicycleFloorPump';root.userData.dynamic=true;
 const piston=root.getObjectByName('PumpPiston'),needle=root.getObjectByName('GaugeNeedle');
 const left=root.getObjectByName('LeftGrip'),right=root.getObjectByName('RightGrip'),outlet=root.getObjectByName('HoseOutlet');
 const state={active:false,time:0,wheel:0,strokes:0,pressure:[0,0],handErrors:[0,0]};
 let hose=null,valve=null,lastWheel=-1;
 const wheelValves=[new THREE.Vector3(-.57,.14,.04),new THREE.Vector3(.57,.14,.04)];
 const reconnect=wheel=>{
  bike.updateWorldMatrix(true,true);root.updateWorldMatrix(true,true);
  valve=bike.localToWorld(wheelValves[wheel].clone());
  const a=outlet.getWorldPosition(new THREE.Vector3()),inv=root.matrixWorld.clone().invert();
  const pts=[a,a.clone().add(new THREE.Vector3(.08,-.025,0)),new THREE.Vector3((a.x+valve.x)/2,.023,(a.z+valve.z)/2+.18),new THREE.Vector3(valve.x,.025,valve.z),valve];
  if(hose){root.remove(hose);hose.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
  hose=tube(pts.map(p=>p.clone().applyMatrix4(inv).toArray()),.006,mat('#1c2326'),{segs:36,radial:6});hose.name='Pump hose connected to wheel';root.add(hose);lastWheel=wheel;
 };
 const frame=(dt,active,hero)=>{
  root.updateWorldMatrix(true,true);
  if(active&&!state.active){state.time=0;state.pressure=[0,0];lastWheel=-1;}
  state.active=active;if(active)state.time+=dt;
  state.wheel=state.time<5.8?0:1;
  const stage=state.wheel===0?state.time:Math.max(0,state.time-7.2);
  const cycling=active&&(state.time<5.8||state.time>=7.2&&state.time<13);
  const phase=cycling?(stage%1.05)/1.05:0;
  const push=(1-Math.cos(phase*Math.PI*2))/2;
  piston.position.y=-.20*push;
  state.cycling=cycling;
  state.strokes=Math.min(5,Math.floor(stage/1.05));
  if(cycling)state.pressure[state.wheel]=Math.min(1,(stage/1.05)/5);
  needle.rotation.z=2.25-4.5*state.pressure[state.wheel];
  if(lastWheel!==state.wheel)reconnect(state.wheel);
  root.updateWorldMatrix(true,true);
  if(active){
   hero.poseStanding();const b=hero.bones;
   hero.model.position.y+=.04-Math.min(hero.wp('ball_l').y,hero.wp('ball_r').y);
   hero.group.updateMatrixWorld(true);
   for(const n of ['spine_01','spine_02','spine_03'])hero.rotChar(b[n],(.40+push*.26)/3);
   const pelvis=hero.wp('pelvis'),forward=new THREE.Vector3(Math.sin(hero.group.rotation.y),0,Math.cos(hero.group.rotation.y)),side=new THREE.Vector3(forward.z,0,-forward.x);
   for(const [suffix,grip,sign,i] of [['l',right,1,0],['r',left,-1,1]]){
    const target=grip.getWorldPosition(new THREE.Vector3());
    const pole=pelvis.clone().addScaledVector(side,sign*.35).addScaledVector(forward,.20);pole.y+=.34;
    hero.ik2(b['upperarm_'+suffix],b['lowerarm_'+suffix],b['hand_'+suffix],target,pole);
    hero.group.updateMatrixWorld(true);state.handErrors[i]=hero.wp('hand_'+suffix).distanceTo(target);
   }
  }
  root.userData.pump={...state,pressure:[...state.pressure],handErrors:[...state.handErrors],valve:valve?.toArray(),hoseStart:outlet.getWorldPosition(new THREE.Vector3()).toArray(),handleY:left.getWorldPosition(new THREE.Vector3()).y};
 };
 return {root,frame,state};
}

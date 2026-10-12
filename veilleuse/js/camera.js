import * as THREE from 'three';
import {clamp} from './noise.js';

// Caméra de suivi en plongée, pensée pour garder le veilleur minuscule face au paysage.
export class FollowCam{
  constructor(aspect){
    this.cam=new THREE.PerspectiveCamera(34,aspect,1,900);
    this.yaw=.62;this.pitch=.66;this.dist=50;this.ty=.62;this.td=50;this.tp=.66;
    this.target=new THREE.Vector3();this.look=new THREE.Vector3();this.drag=null;
  }
  setAspect(a){this.cam.aspect=a;this.cam.updateProjectionMatrix()}
  rotate(dy,dp){this.ty+=dy;this.tp=clamp(this.tp+dp,.35,1.2)}
  zoom(d){this.td=clamp(this.td+d,24,90)}
  update(dt,x,y,z,shake=0){
    const k=Math.min(1,dt*6);
    this.yaw+=(this.ty-this.yaw)*k;this.pitch+=(this.tp-this.pitch)*k;this.dist+=(this.td-this.dist)*k;
    this.target.lerp(this.look.set(x,y+1,z),Math.min(1,dt*5));
    const cp=Math.cos(this.pitch),d=this.dist;
    this.cam.position.set(this.target.x+Math.sin(this.yaw)*cp*d,this.target.y+Math.sin(this.pitch)*d,this.target.z+Math.cos(this.yaw)*cp*d);
    if(shake)this.cam.position.x+=Math.sin(performance.now()*.05)*shake;
    this.cam.lookAt(this.target);
  }
  snap(x,y,z){this.target.set(x,y+1,z);this.yaw=this.ty;this.pitch=this.tp;this.dist=this.td}
}

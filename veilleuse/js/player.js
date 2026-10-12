import {canStep,WALK} from './terrain.js';
import {clamp} from './noise.js';

export class Player{
  constructor(){this.x=0;this.z=0;this.y=0;this.rot=0;this.vx=0;this.vz=0;this.step=0;this.moving=0;this.speedNow=0;this.wading=0}
  place(R,x,z){this.x=x;this.z=z;this.y=R.height(x,z);this.vx=this.vz=0}
  // Mouvement relatif à la caméra, glissement le long des obstacles, pentes et eau profonde infranchissables.
  update(dt,inp,yaw,R,grid,t){
    const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    let dx=rx*inp.x+fx*inp.y,dz=rz*inp.x+fz*inp.y;const m=Math.hypot(dx,dz);
    if(m>1){dx/=m;dz/=m}
    const depth=R.depthAt(this.x,this.z,t);this.wading=clamp((depth-.15)/.45,0,1);
    const speed=(inp.run?WALK.run:WALK.speed)*(1-.4*this.wading)*(inp.slow?.4:1);
    const tvx=dx*speed,tvz=dz*speed,k=Math.min(1,dt*12);
    this.vx+=(tvx-this.vx)*k;this.vz+=(tvz-this.vz)*k;
    const mv=Math.hypot(this.vx,this.vz);this.speedNow=mv;this.moving=clamp(mv/2.5,0,1);
    if(mv>.05){
      const tries=[[this.vx*dt,this.vz*dt],[this.vx*dt,0],[0,this.vz*dt]];
      for(const [sx,sz] of tries){
        let nx=this.x+sx,nz=this.z+sz;
        if(!canStep(R,this.x,this.z,nx,nz,t))continue;
        grid.query(nx,nz,3,c=>{const ex=nx-c.x,ez=nz-c.z,d=Math.hypot(ex,ez),min=c.r+.35;if(d<min&&d>1e-4){nx=c.x+ex/d*min;nz=c.z+ez/d*min}});
        if(!canStep(R,this.x,this.z,nx,nz,t))continue;
        this.x=nx;this.z=nz;break;
      }
      const ta=Math.atan2(this.vz,this.vx);let da=ta-this.rot;da=Math.atan2(Math.sin(da),Math.cos(da));this.rot+=da*Math.min(1,dt*12);
      this.step+=mv*dt*2.1;
    }
    const gy=R.height(this.x,this.z);this.y+=(gy-this.y)*Math.min(1,dt*14);
  }
}

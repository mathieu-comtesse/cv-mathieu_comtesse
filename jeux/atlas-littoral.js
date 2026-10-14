/* Littoral asymétrique. Déformation commune du relief et de sa carte physique.
 * Les plateformes des bâtiments et les passages restent dans leur repère. */
import * as THREE from './three.module.js';
export function deformerLittoral(carte,geo){
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
 const centres=Object.values(carte.meta.batiments);
 function warp(x,z){
  const r=Math.hypot(x,z),a=Math.atan2(z,x);let libre=1;
  for(const b of centres)libre=Math.min(libre,smooth(b.r+1,b.r+3.8,Math.hypot(x-b.pos[0],z-b.pos[1])));
  const k=smooth(8,17,r)*libre;
  const delta=(3.1*Math.sin(a*3+.5)+1.6*Math.sin(a*5-1))*k;
  return [x+Math.cos(a)*delta+1.7*Math.sin(z*.16)*k,z+Math.sin(a)*delta-2.2*k*Math.sin(a*2+.7)];
 }
 const old={...carte},p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const q=warp(p.getX(i),p.getZ(i));p.setXYZ(i,q[0],p.getY(i),q[1]);}
 p.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
 const inverse=(x,z)=>{let u=x,v=z;for(let i=0;i<14;i++){const q=warp(u,v),dx=x-q[0],dz=z-q[1];u+=dx*.62;v+=dz*.62;if(Math.abs(dx)+Math.abs(dz)<.0001)break;}return [u,v]};
 carte.hauteur=(x,z)=>{const q=inverse(x,z);return old.hauteur(q[0],q[1])};
 carte.eau=(x,z)=>{const q=inverse(x,z);return old.eau(q[0],q[1])};
 // Rebuild the physical texture over the enlarged bounds. CPU/GPU share it.
 const N=360,x0=-25,z0=-22,res=50/(N-1),H=new Float32Array(N*N),E=new Uint8Array(N*N);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=x0+i*res,z=z0+j*res,k=i*N+j;H[k]=carte.hauteur(x,z);E[k]=carte.eau(x,z)?255:0;}
 const tH=new THREE.DataTexture(H,N,N,THREE.RedFormat,THREE.FloatType),tE=new THREE.DataTexture(E,N,N,THREE.RedFormat);
 for(const t of [tH,tE]){t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;}
 Object.assign(carte,{x0,z0,nx:N,nz:N,res,H,eauU8:E,texH:tH,texEau:tE,zone:new THREE.Vector4(x0,z0,N*res,N*res)});
 carte.meta.bord=carte.meta.bord.map(b=>{const q=warp(b[0],b[2]);return [q[0],b[1],q[1],b[3],b[4]]});
 carte.littoral={style:'caps-et-criques',warp,inverse};return carte;
}

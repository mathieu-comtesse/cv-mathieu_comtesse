/* Nacre · original coastal ecology. Editable Blender meshes, no commercial assets.
 * const e = await creerEcologie(M); e.tick(dt,t); e.stats
 * Static objects and fish schools are instanced to retain mobile performance.
 */
import * as THREE from './three.module.js';
import { chargerMailles } from './atlas-maille.js?v=20261014-mediterranee';
import { aleatoire } from './atlas-flore.js?v=20261014-mediterranee';

const TAU=Math.PI*2;
const distanceSegment=(x,z,a,b)=>{
 const dx=b[0]-a[0],dz=b[1]-a[1],u=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
 return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz);
};

export async function creerEcologie(M){
 const mailles=await chargerMailles(new URL('assets/atlas/nacre/ecologie.bin',import.meta.url));
 const groupe=new THREE.Group();groupe.name='Nacre : faune et flore côtières';
 const rng=aleatoire(133071),carte=M.carte,niveau=M.dio?.niveau??0;
 const temps={value:0},objet=new THREE.Object3D(),fish=[],groundItems=[];
 const stats={poissons:0,bancs:0,coquillages:0,herbiers:0,oyats:0,coraux:0,originalBlender:true};
 const ileAtelier=(x,z)=>Math.hypot((x+30)/6.8,(z-15)/5.2)<1;
 const depth=(x,z)=>{
   if(ileAtelier(x,z))return -1;
   const y=carte.hauteur(x,z);
   if(y>-20)return niveau-y;
   return M.fondReel?.depth(x,z)??(1.2+Math.hypot(x,z)*.045);
 };
 const loin=(x,z,marge=.7)=>{
   if(ileAtelier(x,z))return false;
   if(Object.values(M.bats??{}).some(b=>Math.hypot(x-b.x,z-b.z)<b.rayon+marge))return false;
   for(const structure of [carte.meta.pont,carte.meta.ponton])if(structure&&distanceSegment(x,z,structure.a,structure.b)<.95+marge)return false;
   if(M.liaisons?.surChemin?.(x,z))return false;
   const voie=carte.meta.voie;
   if(voie&&Math.abs(Math.hypot((x-voie.c[0])/voie.rx,(z-voie.c[1])/voie.rz)-1)<.1)return false;
   return true;
 };
 const mat=(roughness=.8)=>new THREE.MeshStandardMaterial({vertexColors:true,roughness,envMapIntensity:.32,side:THREE.DoubleSide});
 const matCoquille=mat(.56),matCorail=mat(.83);
 const matPlante=mat(.85);
 matPlante.onBeforeCompile=sh=>{
   sh.uniforms.uTempsEcologie=temps;
   sh.vertexShader='uniform float uTempsEcologie;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float phase=0.;
   #ifdef USE_INSTANCING
     phase=instanceMatrix[3].x*.72+instanceMatrix[3].z*.64;
   #endif
   float hauteur=max(0.,position.y);
   transformed.x+=sin(uTempsEcologie*.95+phase+hauteur*2.8)*hauteur*hauteur*.18;
   transformed.z+=cos(uTempsEcologie*.73+phase)*hauteur*hauteur*.11;`);
 };
 matPlante.customProgramCacheKey=()=> 'nacre-herbier-1';
 const marine=[];
 // Spread living seabed around several coves rather than one uniformly packed carpet.
 const centres=[[-8,11],[8,13],[15,5],[-14,2],[1,-13],[21,-3],[-23,21]];
 for(let k=0;k<16000&&marine.length<245;k++){
   const c=centres[k%centres.length],a=rng()*TAU,r=Math.sqrt(rng())*4.7;
   const x=c[0]+Math.cos(a)*r,z=c[1]+Math.sin(a)*r,d=depth(x,z);
   if(d<.55||d>3.0||!loin(x,z,.12))continue;
   marine.push({x,z,y:niveau-d+.015});
 }
 const littoral=[];
 for(let k=0;k<15000&&littoral.length<165;k++){
   const bord=carte.meta.bord;
   if(!bord?.length)break;
   const b=bord[Math.floor(rng()*bord.length)],r=.3+rng()*1.7;
   const x=b[0]-b[3]*r+(rng()-.5)*.8,z=b[2]-b[4]*r+(rng()-.5)*.8,y=carte.hauteur(x,z);
   if(y<niveau+.035||y>niveau+1.35||!loin(x,z,.3))continue;
   // Keep the walking surfaces and approaches clear; this filter belongs to
   // the dry littoral only, so offshore ecosystems and fish stay unaffected.
   if((M.liaisons?.distChemin?.(x,z)??Infinity)<.6||
      (M.liaisons?.surfaceMarche?.(x,z)??null)!==null)continue;
   const a=carte.meta.refonte?.atelier;
   if(a&&Math.hypot((x-a.c[0])/5.5,(z-a.c[1])/3.4)<1)continue;
   littoral.push({x,z,y});
 }
 const instancier=(nom,points,materiau,scaleMin,scaleMax,stat)=>{
   const mesh=new THREE.InstancedMesh(mailles[nom].geo,materiau,points.length);
   mesh.name=nom;mesh.receiveShadow=true;mesh.castShadow=nom==='oyat';
   points.forEach((p,i)=>{
     const s=scaleMin+rng()*(scaleMax-scaleMin);
     objet.position.set(p.x,p.y,p.z);objet.scale.setScalar(s);objet.rotation.set(0,rng()*TAU,0);objet.updateMatrix();
     mesh.setMatrixAt(i,objet.matrix);
     if(nom.startsWith('coquille'))groundItems.push({x:p.x,y:p.y,z:p.z});
   });
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();groupe.add(mesh);stats[stat]+=points.length;return mesh;
 };
 instancier('herbier',marine.slice(0,160),matPlante,.65,1.35,'herbiers');
 instancier('corail_ocres',marine.slice(160,176),matCorail,.8,1.6,'coraux');
 instancier('corail_nacre',marine.slice(176,190),matCorail,.6,1.2,'coraux');
 instancier('oyat',littoral.slice(0,68),matPlante,.65,1.25,'oyats');
 instancier('coquille_eventail',littoral.slice(68,119).map(p=>({...p,y:p.y+.012})),matCoquille,.55,.95,'coquillages');
 instancier('coquille_spirale',littoral.slice(119).map(p=>({...p,y:p.y+.01})),matCoquille,.7,1.2,'coquillages');
 // Underwater shells remain visible through the lagoon instead of being painted in the water shader.
 instancier('coquille_eventail',marine.slice(190,225),matCoquille,.65,1.25,'coquillages');

 const matFish=mat(.38);matFish.metalness=.22;
 matFish.onBeforeCompile=sh=>{
   sh.uniforms.uTempsEcologie=temps;
   sh.vertexShader='uniform float uTempsEcologie;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     float phase=0.;
     #ifdef USE_INSTANCING
       phase=instanceMatrix[3].x*.8+instanceMatrix[3].z*.3;
     #endif
     float queue=clamp((-position.x-.07)*5.,0.,1.);
     transformed.z+=sin(uTempsEcologie*9.+phase)*queue*.065;
     transformed.y+=sin(uTempsEcologie*3.+phase)*.004;`);
 };
 matFish.customProgramCacheKey=()=> 'nacre-poisson-1';
 const centresPoissons=[];
 for(const c of centres){
   const candidat=marine.find(p=>Math.hypot(p.x-c[0],p.z-c[1])<2.4&&depth(p.x,p.z)>1);
   if(candidat&&centresPoissons.every(q=>Math.hypot(q.x-candidat.x,q.z-candidat.z)>4))centresPoissons.push(candidat);
   if(centresPoissons.length===4)break;
 }
 for(let k=0;k<centresPoissons.length;k++){
   const home=centresPoissons[k];
   for(let i=0;i<10;i++){
     let x=home.x+(rng()-.5)*1.5,z=home.z+(rng()-.5)*1.5;
     if(depth(x,z)<.7){x=home.x;z=home.z;}
     fish.push({x,z,home,k,heading:rng()*TAU,speed:.32+rng()*.25,phase:rng()*TAU,scale:.65+rng()*.8,y:niveau-.45-rng()*.35});
   }
 }
 const meshFish=new THREE.InstancedMesh(mailles.poisson_argente.geo,matFish,fish.length);
 meshFish.name='Bancs de poissons argentés';meshFish.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const colors=['#a7cdd0','#d0d4b9','#d6bf98','#a5bab8'];
 fish.forEach((p,i)=>meshFish.setColorAt(i,new THREE.Color(colors[p.k%colors.length])));
 groupe.add(meshFish);stats.poissons=fish.length;stats.bancs=centresPoissons.length;
 const tick=(dt,t)=>{
   temps.value=t;dt=Math.min(Math.max(dt,0),.1);
   fish.forEach((p,i)=>{
     const target=Math.atan2(p.home.z-p.z,p.home.x-p.x);
     const dist=Math.hypot(p.x-p.home.x,p.z-p.home.z);
     const desired=dist>2.7?target:(t*.24+p.k*1.4+Math.sin(t*.33+p.phase)*.55);
     let turn=Math.atan2(Math.sin(desired-p.heading),Math.cos(desired-p.heading));
     p.heading+=THREE.MathUtils.clamp(turn,-dt*.8,dt*.8);
     let speed=p.speed;
     for(const b of [M.objets?.bateau,M.objets?.yacht,M.objets?.voilier]){
       if(!b)continue;
       const dx=p.x-b.position.x,dz=p.z-b.position.z,d=Math.hypot(dx,dz);
       if(d<1.8){p.heading=Math.atan2(dz,dx);speed*=1.6;break;}
     }
     const nx=p.x+Math.cos(p.heading)*speed*dt,nz=p.z+Math.sin(p.heading)*speed*dt;
     if(depth(nx,nz)>.55&&depth(nx+Math.cos(p.heading)*.35,nz+Math.sin(p.heading)*.35)>.5){p.x=nx;p.z=nz;}
     else p.heading+=Math.PI*.75;
     const d=depth(p.x,p.z);p.y=niveau-Math.min(Math.max(.24,d*.45+Math.sin(t*.7+p.phase)*.06),d-.18);
     objet.position.set(p.x,p.y,p.z);objet.rotation.set(Math.sin(t*.8+p.phase)*.035,-p.heading,0);objet.scale.setScalar(p.scale);objet.updateMatrix();meshFish.setMatrixAt(i,objet.matrix);
   });
   meshFish.instanceMatrix.needsUpdate=true;
   meshFish.computeBoundingSphere();
 };
 tick(0,0);M.scene.add(groupe);
 const inspecter=()=>({
   stats:{...stats},
   poissons:fish.map(p=>({x:p.x,y:p.y,z:p.z,profondeur:depth(p.x,p.z)})),
   coquillages:groundItems.map(p=>({...p})),
   mailles:Object.keys(mailles)
 });
 // Reuse the authored fish in the existing fishing game while preserving the
 // group and its saved gameplay metadata (jump, hook, discovery).
 const habillerPoissons=liste=>{
   for(const g of liste??[]){
     if(g.userData.ecologieNacre)continue;
     while(g.children.length)g.remove(g.children[0]);
     const corps=new THREE.Mesh(mailles.poisson_argente.geo,matFish);
     corps.scale.setScalar(.8);corps.userData.poisson=true;g.add(corps);
     g.userData.ecologieNacre=true;
   }
 };
 return {groupe,tick,stats,inspecter,profondeur:depth,habillerPoissons};
}

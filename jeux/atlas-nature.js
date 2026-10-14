import * as THREE from './three.module.js';
import { chargerMailles } from './atlas-maille.js?v=20261014-mediterranee';
import { aleatoire } from './atlas-flore.js?v=20261014-mediterranee';
import { GLSL_BRUIT } from './atlas-ciel.js?v=20261014-mediterranee';
import { GLSL_CAUSTIQUES } from './atlas-eau-matiere.js?v=20261014-mediterranee';

export async function ameliorerCanopes(flore){
 const meshes=await chargerMailles(new URL('assets/atlas/refonte/vegetation.bin',import.meta.url));
 const arbre=flore.arbre,cache=new Map();
 const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,envMapIntensity:.35});
 mat.onBeforeCompile=sh=>{
  sh.uniforms.uTemps=flore.vent.uTemps;
  sh.vertexShader='attribute float vent; uniform float uTemps;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  transformed.x+=sin(uTemps*1.15+transformed.y*1.4)*vent*.026;
  transformed.z+=cos(uTemps*.85+transformed.y)*vent*.018;`);
 };
 flore.arbre=(type,graine)=>{
  const key=type+':'+graine;if(cache.has(key))return cache.get(key);
  const original=arbre(type,graine),m=meshes[type];if(!m)return original;
  original.feuillage.computeBoundingBox();const b=original.feuillage.boundingBox,center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()).multiplyScalar(.5);
  const geo=m.geo.clone().scale(size.x,size.y,size.z).translate(center.x,center.y,center.z);
  const v=new Float32Array(geo.attributes.position.count);for(let i=0;i<v.length;i++)v[i]=Math.max(0,(geo.attributes.position.getY(i)-b.min.y)/(b.max.y-b.min.y));geo.setAttribute('vent',new THREE.BufferAttribute(v,1));
  const result={...original,feuillage:geo,matFeuille:mat};cache.set(key,result);return result;
 };
}

export function creerFondReel(M){
 const {carte,ciel,dio,roches}=M,U=dio.surface.material.uniforms;
 const groupe=new THREE.Group();groupe.name='Fond marin : sable, galets et herbiers';M.scene.add(groupe);
 const H=U.uSDF.value.image,region=U.uSDFZone.value;
 function depth(x,z){
  const h=carte.hauteur(x,z);
  // Un fond continu reste sous les falaises immergées et ferme les anciennes
  // découpes de la carte. La terre opaque le cache naturellement au-dessus.
  if(h>-20)return -Math.min(-.25,h-.08);
  const i=THREE.MathUtils.clamp(Math.floor((x-region.x)/region.z*H.width),0,H.width-1),j=THREE.MathUtils.clamp(Math.floor((z-region.y)/region.w*H.height),0,H.height-1);
  return .35+THREE.DataUtils.fromHalfFloat(H.data[j*H.width+i])*.28;
 }
 const g=new THREE.PlaneGeometry(region.z,region.w,160,120).rotateX(-Math.PI/2),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i)+region.x+region.z/2,z=p.getZ(i)+region.y+region.w/2;p.setXYZ(i,x,-depth(x,z),z);}g.computeVertexNormals();
 const mat=new THREE.MeshStandardMaterial({color:'#ddd1a5',roughness:1,envMapIntensity:.2});
 mat.onBeforeCompile=sh=>{
  Object.assign(sh.uniforms,{uTemps:U.uTemps,uNuit:U.uNuit,uOriginalCaustics:U.uOriginalCaustics});
  sh.vertexShader='varying vec3 vBed;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBed=transformed;');
  sh.fragmentShader=`uniform float uTemps,uNuit;varying vec3 vBed;${GLSL_BRUIT}${GLSL_CAUSTIQUES}\n`+sh.fragmentShader
  .replace('#include <color_fragment>',`#include <color_fragment>
    float sand=.5+.5*sin(dot(vBed.xz,vec2(.6,.8))*12.+n2(vBed.xz*.35)*4.);
    float grain=n2(vBed.xz*65.);float grainFade=1.-smoothstep(.5,1.6,length(fwidth(vBed.xz*65.)));
    diffuseColor.rgb*=(.975+.025*sand)*(1.+(grain-.5)*.035*grainFade);`)
  .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    totalEmissiveRadiance+=vec3(.8,.9,.75)*caustiqueAtlas(vBed.xz,uTemps)*.025*(1.-uNuit);`);
 };
 const bed=new THREE.Mesh(g,mat);bed.receiveShadow=true;groupe.add(bed);
 const rng=aleatoire(125),rockGeo=roches.geometries;
 for(let k=0;k<5;k++){
  const inst=new THREE.InstancedMesh(rockGeo[k],new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}),22),tmp=new THREE.Object3D();let n=0;
  for(let i=0;i<500&&n<22;i++){const x=(rng()-.5)*70,z=(rng()-.5)*60;if(carte.hauteur(x,z)>-20||depth(x,z)>4.3)continue;const s=.35+rng()*.6;tmp.position.set(x,-depth(x,z)+.1*s,z);tmp.scale.set(s,.65*s,s);tmp.rotation.set(0,rng()*6.28,0);tmp.updateMatrix();inst.setMatrixAt(n++,tmp.matrix);}
  inst.count=n;inst.castShadow=inst.receiveShadow=true;groupe.add(inst);
 }
 // Three dimensional ribbons sway below the surface; no painted blobs.
 const blades=new THREE.BufferGeometry(),verts=[],inds=[];
 for(let k=0;k<7;k++)for(let j=0;j<5;j++){
  const a=k*2.4,t=j/4,r=t*t*.15,y=t*(.23+.05*Math.sin(k)),width=(1-t*.85)*.024;
  for(const side of [-1,1])verts.push(Math.cos(a)*r+Math.sin(a)*width*side,y,Math.sin(a)*r-Math.cos(a)*width*side);
  if(j<4){const n=k*10+j*2;inds.push(n,n+1,n+2,n+1,n+3,n+2);}
 }
 blades.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));blades.setIndex(inds);blades.computeVertexNormals();
 const weedMat=new THREE.MeshStandardMaterial({color:'#657641',roughness:.9,side:THREE.DoubleSide});
 weedMat.onBeforeCompile=sh=>{
  Object.assign(sh.uniforms,{uTemps:U.uTemps,uHoule:U.uHoule,uSDFZone:U.uSDFZone});
  sh.vertexShader='uniform float uTemps;uniform sampler2D uHoule;uniform vec4 uSDFZone;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 rootWorld=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
    vec4 localWave=texture2D(uHoule,(rootWorld.xz-uSDFZone.xy)/uSDFZone.zw);
    float flex=transformed.y*transformed.y;
    transformed.x+=(sin(uTemps*.65+transformed.y*3.)*.22+localWave.g*2.)*flex;
    transformed.z+=(cos(uTemps*.53+rootWorld.x*.4)*.11+localWave.b*2.)*flex;`);
 };
 const weeds=new THREE.InstancedMesh(blades,weedMat,110),tmp=new THREE.Object3D();let n=0;
 for(let i=0;i<2500&&n<110;i++){const x=(rng()-.5)*65,z=(rng()-.5)*52;if(carte.hauteur(x,z)>-20||depth(x,z)>2.8)continue;tmp.position.set(x,-depth(x,z),z);tmp.rotation.y=rng()*6.28;tmp.scale.setScalar(.7+rng()*.6);tmp.updateMatrix();weeds.setMatrixAt(n++,tmp.matrix);}weeds.count=n;groupe.add(weeds);
 return {groupe,depth,herbiers:n};
}

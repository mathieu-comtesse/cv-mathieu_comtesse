/* Resources decoded from the installed Sandcastle build. See provenance.json.
 * The WebGL shaders are a port: shared source resources do not prove parity. */
import * as THREE from './three.module.js';
const ROOT=new URL('./assets/atlas/sandcastle/',import.meta.url);
let promise;
export function ressourcesSandcastle(){return promise??= (async()=>{
 const loader=new THREE.TextureLoader(),[models,materials,provenance,sandParameters]=await Promise.all(['models.json','materials.json','provenance.json','sand-parameters.json'].map(p=>fetch(new URL(p+'?v=20261019-nacre-tranche',ROOT)).then(r=>{if(!r.ok)throw Error(p);return r.json()})));
 const textures={};await Promise.all(provenance.files.filter(r=>!/UiAtlas|ui-|Stencil|Background/.test(r.file)).map(async r=>{const t=await loader.loadAsync(new URL(r.file,ROOT).href);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(r.file.includes('CausticsAtlas')){t.flipY=false;t.generateMipmaps=false;t.minFilter=t.magFilter=THREE.LinearFilter;}if(r.file.includes('ImposterAtlas'))t.colorSpace=THREE.SRGBColorSpace;textures[r.file.replace(/^\d+-/,'').replace('.png','')]=t;}));
 const geometry=name=>{
  const d=models[name];if(!d)throw Error('Sandcastle mesh absent: '+name);
  const g=new THREE.BufferGeometry(),P=[],N=[],C=[];
  for(const v of d.position)P.push(v[0],v[1],-v[2]);
  for(const v of d.normal??[])N.push(v[0],v[1],-v[2]);
  for(const v of d.color??[])C.push(v[0]/255,v[1]/255,v[2]/255);
  const ix=[];for(const batch of d.triangles)for(const v of batch){ix.push(v[0],v[2],v[1]);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));if(N.length===P.length)g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));else g.computeVertexNormals();
  if(C.length===P.length)g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));else g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(P.length).fill(1),3));
  if(d.uv?.length)g.setAttribute('uv',new THREE.Float32BufferAttribute(d.uv.flatMap(v=>[v[0],v[1]]),2));
  g.name=name;g.setIndex(ix);g.computeBoundingBox();g.computeBoundingSphere();return g;
 };
 return {models,materials,provenance,textures,geometry,sandParameters};
})();}
export async function appliquerEcosystemeSource(M){
 const R=await ressourcesSandcastle(),group=new THREE.Group();group.name='Sandcastle · ressources originales';const rng=(()=>{let n=8407;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296}})();
 const stats={texturesSource:true,maillagesSource:true,plantes:0,coraux:0,rochers:0,coquillages:0,poissons:0,dynamiqueIdentique:false};
 const color=(name,key,def)=>{const m=R.materials.find(m=>m.material.name===name),v=m?.colors?.find(c=>c[0]===key)?.[1];return v?new THREE.Color().setRGB(v.r,v.g,v.b):new THREE.Color(def)};
 const rockMat=new THREE.MeshStandardMaterial({vertexColors:true,color:color('Rocks','baseColor','#bab8a4'),roughness:.92});
 const patterns=R.textures.Patterns_01;if(patterns){rockMat.bumpMap=patterns;rockMat.bumpScale=.045;}
 const shells=['CalicoScallopShell_01','CommonMusselShell_01','ClamShell_01','MoonSnailShell_01','Starfish_01'];
 const shellMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.65});
 const rocks=Array.from({length:6},(_,i)=>R.geometry('Rock_0'+(i+1)));
 for(const g of rocks){g.computeBoundingBox();const b=g.boundingBox;g.translate(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2);}
 // Replace old coastal stones; source meshes and vertex colours retain identity.
 M.roches.groupe.visible=false;
 let floorRock=0;
 M.fondReel.groupe.traverse(o=>{if(!o.isInstancedMesh)return;if(o.instanceMatrix.count===22){o.geometry=rocks[floorRock++%6];o.material=rockMat;stats.rochers+=o.count;}else o.visible=false;});
 M.ilot.groupe.traverse(o=>{if(!o.isMesh||o.geometry.type!=='IcosahedronGeometry')return;if(o.material.color.g>o.material.color.r){o.visible=false;return;}o.geometry=rocks[(floorRock++)%6];o.material=rockMat;stats.rochers++;});
 for(let i=0;i<180;i++){
  const b=M.meta.bord[i%M.meta.bord.length],x=b[0]+(rng()-.4)*2.1,z=b[2]+(rng()-.4)*2.1,h=M.carte.hauteur(x,z);
  if(h<-3||h>.6||(M.liaisons.distChemin(x,z)<.55))continue;
  const o=new THREE.Mesh(rocks[i%6],rockMat),s=.22+rng()*.7;o.scale.setScalar(s);o.position.set(x,h-.06,z);o.rotation.y=rng()*6.28;o.castShadow=o.receiveShadow=true;group.add(o);stats.rochers++;
 }
 const atlasMaterials=R.materials.filter(r=>r.material.name.endsWith('_Imposter'));
 const billboard=[];
 for(const spec of atlasMaterials){
  const name=spec.material.name.replace('_Imposter',''),t=R.textures[name+'_ImposterAtlas'];if(!t)continue;
  const slot=spec.textures.find(t=>t.slot==='atlasMap'),n=slot?.scale?.x??12;
  const texture=t.clone();texture.repeat.set(1/n,1/n);texture.offset.set(0,0);texture.needsUpdate=true;
  // Original DXBC applies smoothstep(0,.4,alpha) and clips at .5:
  // for a single imposter frame the equivalent alpha threshold is .2.
  const mat=new THREE.MeshStandardMaterial({map:texture,alphaTest:.2,roughness:.9,side:THREE.DoubleSide,depthWrite:true});
  mat.onBeforeCompile=sh=>{sh.uniforms.uAtlasCount={value:n};sh.vertexShader='uniform float uAtlasCount;\n'+sh.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
   vec3 viewOct=normalize(cameraPosition-modelMatrix[3].xyz);vec2 oct=vec2(viewOct.x-viewOct.z,viewOct.x+viewOct.z)/(abs(viewOct.x)+abs(viewOct.y)+abs(viewOct.z));
   vec2 frame=floor((oct*.5+.5)*(uAtlasCount-1.)+.5);
   vMapUv=(uv+frame)/uAtlasCount;`);};mat.customProgramCacheKey=()=> 'sandcastle-octa-'+n;
  const marine=/Kelp|Algae|Seagrass|Coral/.test(name),coral=/Coral/.test(name),max=marine?24:34;
  for(let k=0,placed=0;k<5000&&placed<max;k++){
   const x=-22+rng()*45,z=-18+rng()*37,h=M.carte.hauteur(x,z);
   if(marine?(h< -2.5||h>-.25):(h<.08||h>1.8))continue;
   if(M.liaisons.distChemin(x,z)<.8||Object.values(M.bats).some(b=>Math.hypot(x-b.x,z-b.z)<b.rayon+.45))continue;
   const size=(coral?.6:1.15)+rng()*(coral?.65:1.2),o=new THREE.Mesh(new THREE.PlaneGeometry(size,size),mat);
   o.position.set(x,h+size*.44,z);o.userData.baseY=o.position.y;o.userData.phase=rng()*6.28;o.userData.marine=marine;group.add(o);billboard.push(o);placed++;stats[coral?'coraux':'plantes']++;
  }
 }
 const shellGeo=shells.map(n=>R.geometry(n));
 for(let i=0;i<90;i++){const b=M.meta.bord[i%M.meta.bord.length],x=b[0]-b[3]*(.3+rng()*1.8),z=b[2]-b[4]*(.3+rng()*1.8),h=M.carte.hauteur(x,z);if(h<-.7||h>.6||M.liaisons.distChemin(x,z)<.6)continue;const o=new THREE.Mesh(shellGeo[i%5],shellMat);o.scale.setScalar(.5+rng()*.6);o.rotation.y=rng()*6.28;o.position.set(x,h+.015,z);group.add(o);stats.coquillages++;}
 // Source geometry also dresses the fish already owned by fishing gameplay.
 const fishGeo=R.geometry('Fish_01');
 M.objets.poissons.forEach(f=>f.traverse(o=>{if(o.isMesh){o.geometry=fishGeo;o.material=shellMat;stats.poissons++;}}));
 const schools=[];for(let i=0;i<32;i++){const o=new THREE.Mesh(fishGeo,shellMat);o.scale.setScalar(.5+rng()*.3);group.add(o);schools.push({o,a:rng()*6.28,r:14+rng()*6,y:-.5-rng()*.5});stats.poissons++;}
 if(M.ecologie)M.ecologie.groupe.visible=false;
 // Original Atlas canopy balls are removed from this coastline.
 M.decor.groupe.visible=false;M.plage.groupe.visible=false;
 M.scene.add(group);
 return {group,stats,tick(t){const wind=M.climat?.vent??.7;for(const o of billboard){o.quaternion.copy(M.camera.quaternion);o.rotateZ(Math.sin(t*(o.userData.marine?.7:1.1)+o.userData.phase)*(.018+.012*wind));}for(const f of schools){const a=f.a+t*.035,x=Math.cos(a)*f.r,z=Math.sin(a)*f.r,h=M.carte.hauteur(x,z);f.o.visible=h<f.y-.15;f.o.position.set(x,Math.max(f.y,-M.fondReel.depth(x,z)+.12),z);f.o.rotation.set(0,-a-Math.PI/2,Math.sin(t*7+f.a)*.05);}}};
}

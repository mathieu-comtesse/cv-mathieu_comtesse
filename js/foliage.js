import {THREE} from './kit.js?v=cv-scene-v29';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const time={value:0},wind={value:1},tracked=[];
// One GPU deformation per canopy, rather than moving/uploading every leaf on the CPU.
export function animateFoliage(root,{tree=false}={}){
 root.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(root),height=bounds.max.y-bounds.min.y;
 const base={value:bounds.min.y+(tree?.28:.30)*height},span={value:Math.max(.08,height*.7)},amount={value:tree?.035:.022},scale={value:root.getWorldScale(new THREE.Vector3()).x},materials=new Map();
 const declaration='uniform float foliageTime,foliageWind,foliageBase,foliageSpan,foliageAmount,foliageScale;';
 const deformation=`vec4 leafLocal=vec4(transformed,1.0);float leafScale=1.0;
 #ifdef USE_INSTANCING
 leafLocal=instanceMatrix*leafLocal;leafScale=max(.001,length(instanceMatrix[0].xyz));
 #endif
 vec3 leafWorld=(modelMatrix*leafLocal).xyz;
 float leafWeight=smoothstep(foliageBase,foliageBase+foliageSpan,leafWorld.y);
 float leafWave=sin(foliageTime*1.35+leafWorld.x*3.1+leafWorld.z*2.2)+.35*sin(foliageTime*2.7+leafWorld.z*5.0);
 transformed.x+=leafWave*foliageAmount*leafWeight*foliageWind/max(.001,foliageScale*leafScale);
 transformed.z+=cos(foliageTime*1.1+leafWorld.x*2.0)*foliageAmount*.35*leafWeight*foliageWind/max(.001,foliageScale*leafScale);`;
 const shader=s=>{Object.assign(s.uniforms,{foliageTime:time,foliageWind:wind,foliageBase:base,foliageSpan:span,foliageAmount:amount,foliageScale:scale});s.vertexShader=declaration+'\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+deformation);};
 const meshes=[];root.traverse(o=>{if(!o.isMesh||o.userData.isInk||Array.isArray(o.material))return;const c=o.material.color;if(!c)return;const green=c.g>c.r*1.1&&c.g>c.b*.95,autumn=tree&&c.r>c.g*1.45&&c.r>c.b*1.5;if(green||autumn||!tree&&o.material.map)meshes.push(o);});
 for(const o of meshes){let m=materials.get(o.material);if(!m){m=o.material.clone();m.onBeforeCompile=shader;m.customProgramCacheKey=()=> 'foliage-v49';materials.set(o.material,m);}o.material=m;const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:m.side});depth.onBeforeCompile=shader;depth.customProgramCacheKey=()=> 'foliage-depth-v49';o.customDepthMaterial=depth;o.userData.foliage=true;}
 root.userData.foliageMeshes=meshes.length;tracked.push({root,base,height});
}
export function updateFoliage(t,strength=1){time.value=t;wind.value=reduced.matches?0:strength;for(const q of tracked){q.base.value=q.root.getWorldPosition(new THREE.Vector3()).y+q.height*.30;}}
export function createFallingLeaves(garden,trees){
 const count=matchMedia('(max-width:809px)').matches?20:36,shape=new THREE.Shape();shape.moveTo(0,.065);shape.bezierCurveTo(.06,.02,.045,-.035,0,-.06);shape.bezierCurveTo(-.045,-.035,-.06,.02,0,.065);
 const geo=new THREE.ShapeGeometry(shape,4),fade=new THREE.InstancedBufferAttribute(new Float32Array(count),1);geo.setAttribute('leafFade',fade);
 const material=new THREE.MeshStandardMaterial({color:'#c96537',roughness:.9,side:THREE.DoubleSide,transparent:true,depthWrite:false});
 material.onBeforeCompile=s=>{s.vertexShader='attribute float leafFade;varying float vLeafFade;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLeafFade=leafFade;');s.fragmentShader='varying float vLeafFade;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vLeafFade;');};
 const mesh=new THREE.InstancedMesh(geo,material,count);mesh.name='ShedGardenLeaves';mesh.frustumCulled=false;garden.add(mesh);
 const dummy=new THREE.Object3D(),leaves=Array.from({length:count},(_,i)=>({age:-i*.7-.15,phase:i*2.399,pos:new THREE.Vector3(),drift:new THREE.Vector3(Math.sin(i*5)*.15,0,Math.cos(i*7)*.10),rotation:new THREE.Euler()}));
 const reset=(leaf,i)=>{const tree=trees[i%trees.length],b=new THREE.Box3().setFromObject(tree),p=new THREE.Vector3(b.min.x+(b.max.x-b.min.x)*(.2+Math.random()*.6),b.min.y+(b.max.y-b.min.y)*(.65+Math.random()*.25),b.min.z+(b.max.z-b.min.z)*(.2+Math.random()*.6));garden.worldToLocal(p);leaf.pos.copy(p);leaf.age=0;leaf.rotation.set(0,leaf.phase,0);};
 // Drift, spin and settle follow the archived Shujaat shed-leaf animation, with a bounded pool.
 return {mesh,leaves,update(dt,strength=1){mesh.visible=!reduced.matches&&trees.length>0;if(!mesh.visible)return;for(let i=0;i<count;i++){const leaf=leaves[i];leaf.age+=dt;if(leaf.age<0){dummy.scale.setScalar(0);fade.setX(i,0);}else{if(leaf.age<dt*1.5||leaf.age>14)reset(leaf,i);if(leaf.pos.y>.025){leaf.pos.y-=dt*(.16+Math.min(leaf.age,2)*.075);leaf.pos.addScaledVector(leaf.drift,dt*.35*strength);leaf.pos.x+=Math.sin(leaf.age*2+leaf.phase)*dt*.075*strength;leaf.pos.z+=Math.cos(leaf.age*1.7+leaf.phase)*dt*.05*strength;leaf.rotation.x+=dt*1.1;leaf.rotation.z+=Math.sin(leaf.age*3+leaf.phase)*dt*.8;}else{leaf.pos.y=.025;leaf.rotation.x=-Math.PI/2;}dummy.position.copy(leaf.pos);dummy.rotation.copy(leaf.rotation);dummy.scale.setScalar(.45+i%3*.12);fade.setX(i,Math.min(1,leaf.age*3)*Math.max(0,Math.min(1,(14-leaf.age)/2)));}dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}fade.needsUpdate=true;mesh.instanceMatrix.needsUpdate=true;}};
}

/* Abysses & babioles : plongée archéologique (et un peu absurde) en Three.js.
   Un scaphandrier, 2 047 poissons en bancs, 25 000 brins d’herbier, huit objets à dégager au pinceau.
   Rendu : scène en HDR dans une cible hors écran, puis une passe finale qui ajoute l’absorption de l’eau,
   des rayons de lumière volumétriques, un halo lumineux, un vignettage et le mappage des tons. */
import * as THREE from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
// Diver (rig and four actions) and seabed props, modelled in Blender: tools/blender-diver.py, tools/blender-reef.py.
const gltf=new GLTFLoader();
const [DIVER_GLB,REEF_GLB,BOAT_GLB]=await Promise.all([gltf.loadAsync('assets/diver.glb?v=20260924-4'),gltf.loadAsync('assets/reef.glb?v=20260924-4'),gltf.loadAsync('assets/boat.glb?v=20260924-6')]);
const reefMesh=n=>REEF_GLB.scene.getObjectByName(n);
const $=id=>document.getElementById(id);
const host=$('abyss-stage'),canvas=$('abyss-canvas');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
let pixelRatio=Math.min(devicePixelRatio,1.5);renderer.setPixelRatio(pixelRatio);renderer.toneMapping=THREE.NoToneMapping;
const scene=new THREE.Scene();scene.background=null;
const camera=new THREE.PerspectiveCamera(58,1,.1,1400);
const SURF=24,EDGE=74;
const SUN=new THREE.Vector3(.32,1,.18).normalize();
const hemi=new THREE.HemisphereLight(0xa6d4dc,0x4a4032,.95);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2dc,2.4);sun.position.copy(SUN).multiplyScalar(40);scene.add(sun);
const uni={uTime:{value:0},uDiver:{value:new THREE.Vector3()},uSun:{value:SUN},uDusk:{value:0},uSkySun:{value:new THREE.Vector3(-.55,.3,-.78).normalize()}};
// Sky above the sea (day, or sunset when uDusk = 1): gradient, sun, drifting clouds. Linear HDR colours.
const SKY_GLSL=`float sh1(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}
float sn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(sh1(i),sh1(i+vec2(1,0)),f.x),mix(sh1(i+vec2(0,1)),sh1(i+vec2(1,1)),f.x),f.y);}
vec3 sky(vec3 d){float y=clamp(d.y,0.0,1.0);vec3 zen=mix(vec3(.07,.18,.48),vec3(.025,.045,.15),uDusk),hor=mix(vec3(.55,.66,.78),vec3(1.15,.5,.2),uDusk);
 vec3 c=mix(hor,zen,pow(y,.5));if(d.y<0.0)c=hor*.6;float s=max(dot(d,uSkySun),0.0);
 c+=mix(vec3(1.0,.92,.75),vec3(1.3,.55,.2),uDusk)*(pow(s,1400.0)*70.0+pow(s,12.0)*.25*(1.0+uDusk*3.0));
 if(d.y>0.0){vec2 p=d.xz/(d.y+.1)*1.2+vec2(uTime*.006,0.0);float n=sn(p)*.55+sn(p*2.2)*.3+sn(p*5.1)*.15;float cl=smoothstep(.58,.82,n)*smoothstep(.0,.2,d.y);
  vec3 cc=mix(vec3(.95,.95,.97),vec3(1.1,.55,.35),uDusk)*(.75+.5*pow(s,4.0));c=mix(c,cc,cl*.85);}
 return c;}`;
const LIN=`vec3 lin(vec3 c){return pow(max(c,0.0),vec3(2.2));}`;

// Environment map for metals and wet surfaces: bright water above, dark depths below, the sun as a hot spot.
{const pm=new THREE.PMREMGenerator(renderer),es=new THREE.Scene();
 es.add(new THREE.Mesh(new THREE.SphereGeometry(10,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec3 vP;void main(){vec3 d=normalize(vP);vec3 c=mix(vec3(.02,.1,.16),vec3(.3,.75,.9)*1.8,smoothstep(.0,1.0,d.y));c=mix(c,vec3(.01,.03,.05),smoothstep(.0,-.7,d.y));
   c+=vec3(1.0,.95,.82)*5.0*pow(max(dot(d,normalize(vec3(.32,1.0,.18))),0.0),48.0);c+=vec3(.25,.5,.55)*smoothstep(.02,.0,abs(d.y-.05))*.4;gl_FragColor=vec4(c,1.0);}`})));
 const envUnder=pm.fromScene(es,.02).texture;
 // a second environment for the open air: blue sky, bright horizon, warm sun, dark sea below
 es.children[0].material=new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec3 vP;void main(){vec3 d=normalize(vP);vec3 c=mix(vec3(.7,.78,.85),vec3(.12,.28,.62),pow(max(d.y,0.0),.5));if(d.y<0.0)c=mix(vec3(.08,.12,.16),vec3(.02,.05,.08),min(1.0,-d.y*4.0));
   c+=vec3(1.0,.9,.75)*6.0*pow(max(dot(d,normalize(vec3(-.55,.3,-.78))),0.0),60.0);gl_FragColor=vec4(c,1.0);}`});
 const envAbove=pm.fromScene(es,.02).texture;pm.dispose();scene.environment=envUnder;scene.userData.env={envUnder,envAbove};}
// Light rig switches between the underwater look and open daylight as the camera crosses the surface.
function airLight(above,dusk){uni.uSkySun.value.set(-.55,.3-.26*dusk,-.78).normalize();scene.environment=above?scene.userData.env.envAbove:scene.userData.env.envUnder;
 if(above){hemi.color.setRGB(.75-.1*dusk,.82-.3*dusk,.95-.5*dusk);hemi.groundColor.setRGB(.25,.24,.22);hemi.intensity=.9;sun.color.setRGB(1,.93-.35*dusk,.82-.55*dusk);sun.intensity=3-1.6*dusk;sun.position.set(-22,14+ 10*(1-dusk),-32);}
 else{hemi.color.set(0xa6d4dc);hemi.groundColor.set(0x4a4032);hemi.intensity=.95;sun.color.set(0xfff2dc);sun.intensity=2.4;sun.position.copy(SUN).multiplyScalar(40);}}

const CAUSTIC_GLSL=`float caustic(vec2 p,float t){vec2 q=p*.55;float c=0.0;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.7+t*.9+float(i)),cos(q.x*1.5-t*.7+float(i)*1.3));c+=abs(sin(q.x+q.y));}c=c/3.0;return pow(1.0-c,4.0)*2.6;}`;
const HASH_GLSL=`float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}`;

// --- Relief ----------------------------------------------------------------------
function ground(x,z){const d=Math.hypot(x,z);return Math.sin(x*.075)*Math.cos(z*.061)*1.3+Math.sin(x*.19+z*.13)*.45+Math.cos(z*.23-x*.05)*.3+Math.max(0,d-58)*.35-Math.exp(-((x+4)**2+(z+22)**2)/140)*1.4;}
{const g=new THREE.PlaneGeometry(200,200,260,260);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,ground(p.getX(i),p.getZ(i)));g.computeVertexNormals();
 const m=new THREE.ShaderMaterial({uniforms:uni,vertexShader:`varying vec3 vW;varying vec3 vN;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;vN=normal;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;uniform vec3 uSun;varying vec3 vW;varying vec3 vN;${CAUSTIC_GLSL}${HASH_GLSL}${LIN}
  void main(){vec3 n=normalize(vN);vec2 p=vW.xz;
   // two families of sand ripples, with their slope bent into the normal
   float a1=p.x*2.3+sin(p.y*.8)*1.8+sin(p.y*.23)*3.0,a2=(p.x*.55+p.y*1.8)*1.25+sin(p.x*.5)*2.0;
   vec2 g1=vec2(2.3,1.44*cos(p.y*.8)+.69*cos(p.y*.23))*cos(a1),g2=vec2(.69+cos(p.x*.5),2.25)*cos(a2);
   float fade=smoothstep(40.0,6.0,distance(vW,cameraPosition))*.8+.2;n=normalize(n+vec3(-(g1.x*.1+g2.x*.035),0.0,-(g1.y*.1+g2.y*.035))*fade);
   float rip=sin(a1)*.6+sin(a2)*.3;vec3 sand=mix(vec3(.58,.6,.55),vec3(.86,.86,.78),smoothstep(-.8,.9,rip));
   sand*=.9+.1*h(floor(vW.xz*55.0));float patchy=smoothstep(.25,.85,sin(vW.x*.13)*sin(vW.z*.11)*.5+.5);sand=mix(sand,vec3(.5,.55,.48),patchy*.3);
   float lit=.28+.72*max(dot(n,uSun),0.0);vec3 c=sand*lit*vec3(.86,.93,.95);c+=caustic(p,uTime)*vec3(.55,.8,.8)*.32*max(n.y,0.0);
   gl_FragColor=vec4(lin(c)*1.1,1.0);}`});
 scene.add(new THREE.Mesh(g,m));}

// --- Herbier : 25 000 brins qui ondulent et s’écartent au passage du plongeur -------------
const BLADES=25000;let grassMesh=null;
{const seg=4,pos=[],idx=[];for(let i=0;i<=seg;i++){const y=i/seg,w=.05*(1-y*.85);pos.push(-w,y,0,w,y,0);if(i<seg){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);
 const mat=new THREE.ShaderMaterial({uniforms:uni,side:THREE.DoubleSide,
  vertexShader:`uniform float uTime;uniform vec3 uDiver;varying float vY;varying vec3 vW;varying float vTone;
  void main(){vec4 base=instanceMatrix*vec4(0.0,0.0,0.0,1.0);float hgt=length(instanceMatrix[1].xyz);vec4 w=modelMatrix*instanceMatrix*vec4(position,1.0);vY=position.y;vTone=fract(base.x*.37+base.z*.71);
   float k=position.y*position.y;w.x+=sin(uTime*1.3+base.x*.35+base.z*.22)*.32*k*hgt+sin(uTime*3.1+base.z)*.05*k;w.z+=cos(uTime*1.1+base.z*.3)*.2*k*hgt;
   vec3 d=w.xyz-uDiver;d.y=0.0;float dl=length(d);float push=smoothstep(1.9,0.2,dl)*k*1.1;w.xz+=normalize(d.xz+1e-4)*push;w.y-=push*.4;
   vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;varying float vY;varying vec3 vW;varying float vTone;${CAUSTIC_GLSL}${LIN}
  void main(){vec3 lo=mix(vec3(.05,.12,.08),vec3(.1,.13,.06),vTone),hi=mix(vec3(.3,.46,.24),vec3(.46,.5,.22),vTone);vec3 c=mix(lo,hi,vY*vY);c+=caustic(vW.xz,uTime)*.1*vY;gl_FragColor=vec4(lin(c),1.0);}`});
 const mesh=new THREE.InstancedMesh(geo,mat,BLADES),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),s=new THREE.Vector3(),v=new THREE.Vector3();
 const patches=[];for(let i=0;i<34;i++)patches.push([Math.random()*120-60,Math.random()*120-60,4+Math.random()*9]);
 for(let i=0;i<BLADES;i++){const pc=patches[i%patches.length],a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*pc[2],x=pc[0]+Math.cos(a)*r,z=pc[1]+Math.sin(a)*r,hh=.5+Math.random()*1.3*(1-r/pc[2]*.6);
  e.set(0,Math.random()*Math.PI,(Math.random()-.5)*.3);q.setFromEuler(e);s.set(1+Math.random()*.6,hh,1);v.set(x,ground(x,z)-.05,z);m.compose(v,q,s);mesh.setMatrixAt(i,m);}
 mesh.frustumCulled=false;scene.add(mesh);grassMesh=mesh;}

// --- Décor : rochers, falaises, gorgones, coraux, épave, amphores, éponges ----------------------
// Static props are baked into a few merged meshes: hundreds of small parts, a handful of draw calls.
const buckets=new Map();
function bake(geo,mat,matrix){const g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(matrix);if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(g);}
function flushBake(){for(const [mat,list] of buckets){let n=0;for(const g of list)n+=g.attributes.position.count;const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=mat.vertexColors?new Float32Array(n*3):null;let o=0;
 for(const g of list){pos.set(g.attributes.position.array,o*3);if(!g.attributes.normal)g.computeVertexNormals();nor.set(g.attributes.normal.array,o*3);if(col){if(g.attributes.color)col.set(g.attributes.color.array,o*3);else col.fill(1,o*3,(o+g.attributes.position.count)*3);}o+=g.attributes.position.count;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));if(col)geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeBoundingSphere();scene.add(new THREE.Mesh(geo,mat));}buckets.clear();}
const _o=new THREE.Object3D();const at=(x,y,z,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>{_o.position.set(x,y,z);_o.rotation.set(rx,ry,rz);_o.scale.set(sx,sy,sz);_o.updateMatrix();return _o.matrix.clone();};
const rockMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.93,metalness:0,envMapIntensity:.35});
const noise3=(x,y,z,s)=>Math.sin(x*1.7+s)*Math.cos(z*1.9-s)*.5+Math.sin(x*3.9+y*2.3+s*2)*.22+Math.cos(z*4.3-y*3.1+s)*.18+Math.sin((x+z)*8.1+y*5+s)*.07;
const rocks=[];
// Icosahedra come unindexed, so shared corners are welded here to get smooth, rounded boulders.
function smoothNormals(g){const p=g.attributes.position,n=g.attributes.normal,acc=new Map(),key=i=>`${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
 for(let i=0;i<p.count;i++){const k=key(i),a=acc.get(k)||[0,0,0];a[0]+=n.getX(i);a[1]+=n.getY(i);a[2]+=n.getZ(i);acc.set(k,a);}
 for(let i=0;i<p.count;i++){const a=acc.get(key(i)),l=Math.hypot(a[0],a[1],a[2])||1;n.setXYZ(i,a[0]/l,a[1]/l,a[2]/l);}}
const rockPlace=[];
function rock(x,z,s,flat=.7,kind){rockPlace.push({x,z,s,flat,k:kind||'rock'+Math.floor(Math.random()*5),ry:Math.random()*6.28});rocks.push({x,z,s,top:ground(x,z)+s*flat*.8,r:s*.9});}
for(let i=0;i<70;i++){const x=Math.random()*140-70,z=Math.random()*140-70;if(Math.hypot(x,z-8)>6)rock(x,z,.4+Math.random()*1.8);}
for(let i=0;i<14;i++){const a=Math.random()*Math.PI*2,r=10+Math.random()*50,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x-2,z-10)>9&&Math.hypot(x+4,z+22)>9)rock(x,z,2.5+Math.random()*2.5,.8);}
// cliffs closing the horizon, like the walls of a submerged valley
for(let i=0;i<22;i++){const a=i/22*Math.PI*2+Math.random()*.2,r=66+Math.random()*16;rock(Math.cos(a)*r,Math.sin(a)*r,9+Math.random()*9,1.1+Math.random()*.5,'cliff'+(i%2));}
// one InstancedMesh per Blender variant; rocks are sunk a little into the sand
const _m4=new THREE.Matrix4(),_q4=new THREE.Quaternion(),_e4=new THREE.Euler(),_s4=new THREE.Vector3(),_v4=new THREE.Vector3();
function instance(name,list,fn){const src=reefMesh(name);if(!src||!list.length)return null;const im=new THREE.InstancedMesh(src.geometry,src.material,list.length);list.forEach((o,i)=>{fn(o,_v4,_e4,_s4);_q4.setFromEuler(_e4);_m4.compose(_v4,_q4,_s4);im.setMatrixAt(i,_m4);});im.computeBoundingSphere();scene.add(im);return im;}
{const groups={};for(const r of rockPlace)(groups[r.k]??=[]).push(r);for(const k in groups){const g=reefMesh(k)?.geometry;if(!g)continue;g.computeBoundingBox();const top=g.boundingBox.max.y;
  // keep every rock and cliff at least 3 m under the surface, so nothing pokes out of the sea
  instance(k,groups[k],(r,v,e,sc)=>{const gy=ground(r.x,r.z)+r.s*.08;let sy=r.s*r.flat/.75;sy=Math.min(sy,(SURF-3-gy)/top);v.set(r.x,gy,r.z);e.set(0,r.ry,0);sc.set(r.s,sy,r.s);r.top=Math.min(r.top,gy+top*sy);});}
 REEF_GLB.scene.traverse(o=>{if(o.isMesh&&o.material){o.material.envMapIntensity=.35;o.material.roughness=Math.max(o.material.roughness,.8);}});}
// Sea fans on the rocks, brain corals and tube sponges on the sand (Blender meshes, instanced).
{const fans=[[],[],[]];for(const r of rocks){if(r.s>6)continue;const k=r.s>2?3:r.s>1?2:1;for(let j=0;j<k;j++){const a=Math.random()*6.28,d=r.s*(.25+Math.random()*.35);fans[Math.floor(Math.random()*3)].push({x:r.x+Math.cos(a)*d,y:r.top-r.s*.3,z:r.z+Math.sin(a)*d,ry:Math.random()*6.28,s:.7+Math.random()*1.1});}}
 const fanMat=reefMesh('fan0').material;fanMat.side=THREE.DoubleSide;fanMat.onBeforeCompile=sh=>{sh.uniforms.uTime=uni.uTime;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvec4 ip=instanceMatrix*vec4(0.0,0.0,0.0,1.0);transformed.z+=sin(uTime*1.1+ip.x*.4+ip.z*.3)*.09*position.y*position.y;`);};
 for(let k=0;k<3;k++){reefMesh('fan'+k).material=fanMat;instance('fan'+k,fans[k],(o,v,e,sc)=>{v.set(o.x,o.y,o.z);e.set((Math.random()-.5)*.25,o.ry,(Math.random()-.5)*.25);sc.setScalar(o.s);});}
 const lumps=[[],[],[]];for(let i=0;i<70;i++){const a=Math.random()*6.28,r=6+Math.random()*58,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.hypot(x-2,z-10)<5)continue;lumps[i%3].push({x,z,s:.25+Math.random()*.45,ry:Math.random()*6.28});}
 ['brain0','brain1','tubes0'].forEach((n,k)=>instance(n,lumps[k],(o,v,e,sc)=>{v.set(o.x,ground(o.x,o.z)-.04,o.z);e.set(0,o.ry,0);sc.setScalar(o.s*(k===2?1.2:1));}));}
const coralCols=[0xff7a59,0xf2668b,0xb07cff,0xffc15e,0x5fd4c4];
const coralMats=coralCols.map(col=>new THREE.MeshStandardMaterial({color:col,roughness:.8,emissive:col,emissiveIntensity:.05}));
function coral(x,z){const mat=coralMats[Math.floor(Math.random()*coralMats.length)],base=at(x,ground(x,z)-.05,z,0,Math.random()*6,0,.8+Math.random()*1.2),q=new THREE.Quaternion(),m=new THREE.Matrix4();
 const branch=(o,dir,len,r,depth)=>{q.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);m.compose(o.clone().addScaledVector(dir,len/2),q,new THREE.Vector3(1,1,1));bake(new THREE.CylinderGeometry(r*.7,r,len,6),mat,base.clone().multiply(m));
  const end=o.clone().addScaledVector(dir,len);if(depth>0)for(let k=0;k<2;k++){const nd=dir.clone().add(new THREE.Vector3(Math.random()-.5,.3,Math.random()-.5).multiplyScalar(1.1)).normalize();branch(end,nd,len*.75,r*.7,depth-1);}else{m.makeTranslation(end.x,end.y,end.z);bake(new THREE.SphereGeometry(r*1.1,6,5),mat,base.clone().multiply(m));}};
 for(let k=0;k<3;k++)branch(new THREE.Vector3(),new THREE.Vector3(Math.random()-.5,1,Math.random()-.5).normalize(),.5+Math.random()*.4,.07,2);}
for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,r=8+Math.random()*60;coral(Math.cos(a)*r,Math.sin(a)*r);}
const spongeMat=new THREE.MeshStandardMaterial({color:0xd99a3e,roughness:1,side:THREE.DoubleSide});
for(let i=0;i<30;i++){const x=Math.random()*130-65,z=Math.random()*130-65;bake(new THREE.CylinderGeometry(.25,.18,.6,9,1,true),spongeMat,at(x,ground(x,z)+.25,z));}
const terracotta=new THREE.MeshStandardMaterial({color:0xa85a36,roughness:.85});
function amphoraGeo(){const pts=[[0,0],[.08,.02],[.16,.12],[.22,.35],[.24,.55],[.2,.75],[.1,.86],[.07,.95],[.09,1.05],[.08,1.07]].map(([x,y])=>new THREE.Vector2(x,y));return new THREE.LatheGeometry(pts,16);}
const AMPH=amphoraGeo();
function amphora(x,z,lying){bake(AMPH,terracotta,lying?at(x,ground(x,z)+.25,z,0,Math.random()*6,Math.PI/2*.95,1.3):at(x,ground(x,z),z,0,0,0,1.3));}
// The wreck: a keel, curved ribs, loose planks, a fallen mast and its cargo of amphorae.
const wood=new THREE.MeshStandardMaterial({color:0x4d3a28,roughness:.95}),woodD=new THREE.MeshStandardMaterial({color:0x33271c,roughness:1});
const WRECK=new THREE.Vector3(-4,0,-22);
{const grp=new THREE.Group();const keel=new THREE.Mesh(new THREE.BoxGeometry(.5,.4,14),woodD);keel.position.y=.2;grp.add(keel);
 for(let i=0;i<9;i++){const z=-6+i*1.5,r=2.2-Math.abs(i-4)*.15,rib=new THREE.Mesh(new THREE.TorusGeometry(r,.12,6,14,Math.PI*(.55+Math.random()*.4)),wood);rib.position.set(0,r*.55,z);rib.rotation.z=Math.PI+(.2-Math.random()*.4);grp.add(rib);}
 for(let i=0;i<12;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.3,.06,2+Math.random()*2),wood);p.position.set(Math.random()*6-3,.1,Math.random()*14-7);p.rotation.y=Math.random()-.5;grp.add(p);}
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,9,8),woodD);mast.rotation.z=Math.PI/2*.92;mast.rotation.y=.6;mast.position.set(3,.5,2);grp.add(mast);
 grp.position.set(WRECK.x,ground(WRECK.x,WRECK.z)-.3,WRECK.z);grp.rotation.y=.4;scene.add(grp);
 for(let i=0;i<16;i++){const a=Math.random()*6,r=1+Math.random()*6;amphora(WRECK.x+Math.cos(a)*r,WRECK.z+Math.sin(a)*r,Math.random()<.6);}flushBake();}

// --- Surface, bateau, ligne de vie ----------------------------------------------------
const START=new THREE.Vector3(2,0,10);
// The sea surface: gentle travelling waves. From the air it reflects the sky; from below it is a bright Snell window.
const ocean=(()=>{const g=new THREE.PlaneGeometry(700,700,280,280);g.rotateX(-Math.PI/2);
 const m=new THREE.ShaderMaterial({uniforms:uni,side:THREE.DoubleSide,
  vertexShader:`uniform float uTime;varying vec3 vW;varying vec3 vN;
  void main(){vec4 w=modelMatrix*vec4(position,1.0);vec2 p=w.xz;float h=0.0;vec2 g=vec2(0.0);
   vec2 D[5];D[0]=normalize(vec2(1.0,.3));D[1]=normalize(vec2(-.4,1.0));D[2]=normalize(vec2(.8,-.7));D[3]=normalize(vec2(.2,.9));D[4]=normalize(vec2(-.9,-.2));
   float A[5];A[0]=.24;A[1]=.14;A[2]=.08;A[3]=.045;A[4]=.025;float Lw[5];Lw[0]=22.0;Lw[1]=13.0;Lw[2]=9.0;Lw[3]=3.1;Lw[4]=1.9;
   for(int i=0;i<3;i++){float k=6.2832/Lw[i],c=sqrt(9.8/k),ph=k*dot(D[i],p)-c*k*uTime*.8;h+=A[i]*sin(ph);g+=A[i]*k*cos(ph)*D[i];}
   w.y+=h;vW=w.xyz;vN=normalize(vec3(-g.x,1.0,-g.y));gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime,uDusk;uniform vec3 uSkySun;varying vec3 vW;varying vec3 vN;${CAUSTIC_GLSL}${LIN}${SKY_GLSL}
  void main(){vec3 n=normalize(vN);vec3 v=normalize(cameraPosition-vW);
   {vec2 p=vW.xz;vec2 g=vec2(0.0);for(int i=0;i<4;i++){float fi=float(i);vec2 D=normalize(vec2(cos(fi*2.1+.4),sin(fi*2.1+.4)));float L=3.2/(1.0+fi*.7),k=6.2832/L,ph=k*dot(D,p)-sqrt(9.8*k)*uTime*.8+fi*1.7;g+=.035/(1.0+fi*.5)*k*cos(ph)*D;}
    float fade=exp(-distance(vW,cameraPosition)*.012);n=normalize(n+vec3(-g.x,0.0,-g.y)*fade);}
   if(gl_FrontFacing){float fr=.02+.98*pow(1.0-max(dot(n,v),0.0),5.0);vec3 r=reflect(-v,n);r.y=abs(r.y);
    vec3 body=vec3(.004,.02,.034)+vec3(.0,.025,.035)*max(0.0,(vW.y-${SURF.toFixed(1)})*2.0+.3);vec3 c=mix(body,sky(r),fr);
    c+=mix(vec3(1.0,.9,.75),vec3(1.3,.55,.25),uDusk)*pow(max(dot(r,uSkySun),0.0),500.0)*mix(16.0,9.0,uDusk);gl_FragColor=vec4(c,1.0);}
   else{float d=distance(vW.xz,cameraPosition.xz);float c=caustic(vW.xz*.5,uTime*1.4);vec3 col=mix(vec3(.42,.72,.8),vec3(.08,.3,.4),smoothstep(3.0,40.0,d));col*=.75+.5*c;col+=c*.25*(1.0-smoothstep(8.0,40.0,d));
    gl_FragColor=vec4(lin(col)*1.2*mix(1.0,.35,uDusk),1.0);}}`});
 const o=new THREE.Mesh(g,m);o.position.y=SURF;o.frustumCulled=false;scene.add(o);return o;})();
// The sponge divers' boat and the island on the horizon (Blender: tools/blender-boat.py).
const LANDING=new THREE.Vector3(START.x,ground(START.x,START.z+1.5),START.z+1.5);
const island=BOAT_GLB.scene.getObjectByName('island'),boat=BOAT_GLB.scene.getObjectByName('boat');
island.removeFromParent();island.position.set(-90,SURF-1,-430);island.rotation.y=.25;island.scale.set(1.3,1,1.3);island.material.envMapIntensity=.15;island.material.color.setRGB(.5,.4,.32);scene.add(island);
boat.removeFromParent();scene.add(boat);boat.traverse(o=>{if(o.isMesh){o.material.envMapIntensity=.6;o.frustumCulled=false;}});
{const lb=boat.getObjectByName('ladder_bottom').position;boat.position.set(LANDING.x-lb.x,SURF,LANDING.z-lb.z);}
const boatBase=boat.position.clone();boat.updateMatrixWorld(true);
const bp=n=>boat.getObjectByName(n).getWorldPosition(new THREE.Vector3());
{const l=new THREE.PointLight(0xffc27a,0,8,2);boat.getObjectByName('lamp').add(l);boat.userData.lamp=l;}
const ROPE_BASE=new THREE.Vector3(START.x+.6,ground(START.x+.6,START.z)+.1,START.z);
{const len=SURF-ROPE_BASE.y,rope=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,len,6),new THREE.MeshStandardMaterial({color:0xcbb68a,roughness:1}));rope.position.set(ROPE_BASE.x,ROPE_BASE.y+len/2,ROPE_BASE.z);scene.add(rope);
 const iron=new THREE.MeshStandardMaterial({color:0x6b5a4a,metalness:.6,roughness:.6}),anchor=new THREE.Group();anchor.add(new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.2,8),iron));const arm=new THREE.Mesh(new THREE.TorusGeometry(.45,.06,6,12,Math.PI),iron);arm.rotation.z=Math.PI;arm.position.y=-.45;anchor.add(arm);
 anchor.position.copy(ROPE_BASE).add(new THREE.Vector3(0,.55,0));anchor.rotation.z=.12;scene.add(anchor);
 const lamp=new THREE.PointLight(0xffe6a0,6,9,2);lamp.position.copy(ROPE_BASE).add(new THREE.Vector3(0,1.5,0));scene.add(lamp);}

// --- Neige marine ----------------------------------------------------------------------------
{const n=6000,pos=new Float32Array(n*3);for(let i=0;i<n*3;i++)pos[i]=(Math.random()-.5)*40;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const m=new THREE.ShaderMaterial({uniforms:uni,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`uniform float uTime;varying float vA;void main(){vec3 p=position;p.y-=uTime*.15;p.x+=sin(uTime*.3+p.z)*.3;p=mod(p-cameraPosition+20.0,40.0)-20.0+cameraPosition;vec4 mv=viewMatrix*vec4(p,1.0);gl_PointSize=clamp(46.0/-mv.z,1.0,5.0);vA=clamp(1.0-(-mv.z)/26.0,0.0,1.0);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;void main(){vec2 c=gl_PointCoord-.5;float d=dot(c,c);if(d>.25)discard;gl_FragColor=vec4(vec3(.5,.62,.62)*vA*(1.0-d*4.0)*.5,1.0);}`});
 const pts=new THREE.Points(g,m);pts.frustumCulled=false;scene.add(pts);}

// --- 2 047 poissons en bancs -----------------------------------------------------------------
const FISH=2047;const fishSchools=[];
const fish=(()=>{const prof=[[0,-.5],[.07,-.43],[.13,-.28],[.155,-.08],[.145,.12],[.1,.3],[.045,.44],[0,.5]].map(([r,y])=>new THREE.Vector2(r,y));
 const body=new THREE.LatheGeometry(prof,14).toNonIndexed();body.rotateZ(Math.PI/2);body.scale(1,1,.55);
 const tail=new THREE.BufferGeometry();tail.setAttribute('position',new THREE.Float32BufferAttribute([-.44,0,0,-.9,.28,0,-.78,0,0,-.44,0,0,-.78,0,0,-.9,-.28,0,
  .12,.13,0,-.18,.3,0,-.26,.1,0],3));
 const parts=[body,tail],n=parts.reduce((a,g)=>a+g.attributes.position.count,0),pos=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
 for(const g of parts){const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);pos.set([p.getX(i),y,p.getZ(i)],(o+i)*3);const k=THREE.MathUtils.smoothstep(y,-.1,.12);col.set([.95-.6*k,.97-.55*k,1-.45*k],(o+i)*3);}o+=p.count;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();smoothNormals(g);
 const mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.3,metalness:.55,side:THREE.DoubleSide,envMapIntensity:1.3});
 mat.onBeforeCompile=sh=>{sh.uniforms.uTime=uni.uTime;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat sw=sin(uTime*11.0+float(gl_InstanceID)*1.7-position.x*6.0);transformed.z+=sw*.14*smoothstep(.25,-.8,position.x);`);};
 const mesh=new THREE.InstancedMesh(g,mat,FISH);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
 const cols=[[0x9fb6c8,0xdfe9f2],[0x6a8fb0,0xbcd3e6],[0xff5a4a,0xff9a7a],[0xe86a5a,0xffb3a1],[0x5fb6d4,0xb8ecf7],[0xf2c14e,0xfff0b3]];
 const sizes=[520,420,380,300,200,120,60,30,15,2];let k=0;
 sizes.forEach((n,si)=>{const big=n<=30,red=!big&&(si===2||si===5),sch={n,start:k,c:new THREE.Vector3(Math.random()*80-40,red?2.5+Math.random()*3:4+Math.random()*9,Math.random()*80-40),rx:(red?6:14)+Math.random()*(red?10:22),rz:(red?6:12)+Math.random()*(red?10:22),w:(.05+Math.random()*.05)*(big?.6:1)*(Math.random()<.5?-1:1),ph:Math.random()*6,spread:big?2.5:red?2.2:1.2+n/260,size:big?1.6+Math.random():red?.22+Math.random()*.08:.35+Math.random()*.2,off:[]};
  const pal=big?cols[si%2]:cols[si%cols.length];for(let i=0;i<n;i++){const a=Math.random()*6.28,b=Math.acos(Math.random()*2-1),r=Math.cbrt(Math.random())*sch.spread*2;sch.off.push([Math.sin(b)*Math.cos(a)*r,Math.cos(b)*r*.5,Math.sin(b)*Math.sin(a)*r,Math.random()*6.28,.85+Math.random()*.3,new THREE.Vector3()]);
   const col=new THREE.Color(pal[0]).lerp(new THREE.Color(pal[1]),Math.random());mesh.setColorAt(k+i,col);}k+=n;fishSchools.push(sch);});
 scene.add(mesh);return mesh;})();
const _m=new THREE.Matrix4(),_x=new THREE.Vector3(),_y=new THREE.Vector3(),_z=new THREE.Vector3(),_p=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0),_s=new THREE.Vector3();
function schoolPath(s,t,out){const a=t*s.w+s.ph;out.set(s.c.x+Math.sin(a)*s.rx,s.c.y+Math.sin(a*2.3)*2,s.c.z+Math.cos(a)*s.rz);return out;}
const _c0=new THREE.Vector3(),_c1=new THREE.Vector3();
function updateFish(t,diver){for(const s of fishSchools){for(let i=0;i<s.n;i++){const o=s.off[i],lag=i*.0025/Math.abs(s.w),tt=t-lag;schoolPath(s,tt,_c0);schoolPath(s,tt+.05,_c1);_x.subVectors(_c1,_c0).normalize();
   const wob=Math.sin(t*1.3+o[3]);_p.set(_c0.x+o[0]+wob*.3,_c0.y+o[1]+Math.cos(t*.9+o[3])*.25,_c0.z+o[2]);
   // flee from the diver, and remember the push so the school closes back smoothly
   const dx=_p.x-diver.x,dy=_p.y-diver.y,dz=_p.z-diver.z,dd=dx*dx+dy*dy+dz*dz;if(dd<16){const f=(4-Math.sqrt(dd))*.6;o[5].x+=dx*f*.02;o[5].y+=dy*f*.02;o[5].z+=dz*f*.02;}o[5].multiplyScalar(.975);_p.add(o[5]);
   const gy=ground(_p.x,_p.z)+.6;if(_p.y<gy)_p.y=gy;if(_p.y>SURF-1)_p.y=SURF-1;
   _z.crossVectors(_x,_up).normalize();_y.crossVectors(_z,_x);const sz=s.size*o[4];_m.makeBasis(_x,_y,_z).scale(_s.set(sz,sz,sz)).setPosition(_p);fish.setMatrixAt(s.start+i,_m);}}
 fish.instanceMatrix.needsUpdate=true;}

// --- Le scaphandrier ------------------------------------------------------------------------
// Materials used by the props and treasures below.
const brass=new THREE.MeshStandardMaterial({color:0xd6a453,metalness:1,roughness:.26});
const darkM=new THREE.MeshStandardMaterial({color:0x2a211a,roughness:.8});
// The diver: one skinned mesh, an AnimationMixer blending idle, walk, bound and brush.
const diver=new THREE.Group(),rig={};
{const m=DIVER_GLB.scene;m.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const x of [].concat(o.material)){x.envMapIntensity=x.name==='glass'?2.4:x.name==='copper'||x.name==='brass'?1.4:.5;if(x.name==='suit')x.color.setRGB(1.25,1.05,.8);if(x.name==='leather')x.color.setRGB(1.2,1,.9);}}});
 diver.add(m);rig.model=m;rig.mixer=new THREE.AnimationMixer(m);rig.act={};
 for(const c of DIVER_GLB.animations){const a=rig.mixer.clipAction(c);a.play();a.setEffectiveWeight(c.name==='idle'?1:0);rig.act[c.name]=a;}
 rig.act.bound.setLoop(THREE.LoopOnce,1);rig.act.bound.clampWhenFinished=true;rig.w={idle:1,walk:0,bound:0,brush:0};
 for(const n of ['hose_anchor','valve','lamp_anchor','brush_tip','footL','footR'])rig[n]=m.getObjectByName(n);
 const lamp=new THREE.SpotLight(0xfff0c8,9,16,.5,.6,1.4);lamp.position.set(0,1.62,.3);lamp.target.position.set(0,.5,4);diver.add(lamp,lamp.target);rig.lamp=lamp;}
diver.position.set(START.x,ground(START.x,START.z),START.z+1.5);scene.add(diver);
// The air hose from the helmet to the boat: a tube whose vertices follow a sagging curve every frame.
const HOSE_N=48,HOSE_R=6,hoseGeo=new THREE.BufferGeometry();{const idx=[];for(let i=0;i<HOSE_N-1;i++)for(let j=0;j<HOSE_R;j++){const a=i*HOSE_R+j,b=i*HOSE_R+(j+1)%HOSE_R,c=a+HOSE_R,d=b+HOSE_R;idx.push(a,c,b,b,c,d);}
 hoseGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(HOSE_N*HOSE_R*3),3));hoseGeo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(HOSE_N*HOSE_R*3),3));hoseGeo.setIndex(idx);}
const hose=new THREE.Mesh(hoseGeo,new THREE.MeshStandardMaterial({color:0x2e2822,roughness:.55}));hose.frustumCulled=false;scene.add(hose);
const _hp=[],_t=new THREE.Vector3(),_n=new THREE.Vector3(),_b=new THREE.Vector3();for(let i=0;i<HOSE_N;i++)_hp.push(new THREE.Vector3());
function updateHose(){const a=rig.hose_anchor?rig.hose_anchor.getWorldPosition(new THREE.Vector3()):_p.set(-.1,1.56,-.34).applyMatrix4(diver.matrixWorld).clone(),b=bp('pump_out'),pa=hoseGeo.attributes.position.array,na=hoseGeo.attributes.normal.array,sag=Math.min(6,a.distanceTo(b)*.15);
 for(let i=0;i<HOSE_N;i++){const t=i/(HOSE_N-1);_hp[i].set(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*sag-Math.sin(t*Math.PI*3+uni.uTime.value)*.08,a.z+(b.z-a.z)*t);}
 for(let i=0;i<HOSE_N;i++){_t.subVectors(_hp[Math.min(HOSE_N-1,i+1)],_hp[Math.max(0,i-1)]).normalize();_n.crossVectors(_t,_up);if(_n.lengthSq()<1e-4)_n.set(1,0,0);_n.normalize();_b.crossVectors(_t,_n);
  for(let j=0;j<HOSE_R;j++){const an=j/HOSE_R*Math.PI*2,cx=Math.cos(an),cy=Math.sin(an),k=(i*HOSE_R+j)*3;const nx=_n.x*cx+_b.x*cy,ny=_n.y*cx+_b.y*cy,nz=_n.z*cx+_b.z*cy;pa[k]=_hp[i].x+nx*.035;pa[k+1]=_hp[i].y+ny*.035;pa[k+2]=_hp[i].z+nz*.035;na[k]=nx;na[k+1]=ny;na[k+2]=nz;}}
 hoseGeo.attributes.position.needsUpdate=true;hoseGeo.attributes.normal.needsUpdate=true;hoseGeo.computeBoundingSphere();}
// Bubbles from the exhaust valve: a steady trickle, and a big burst at each breath.
const BUB=520,bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(.026,12,8),new THREE.MeshStandardMaterial({color:0xcff4ff,transparent:true,opacity:.5,metalness:0,roughness:0,envMapIntensity:3,emissive:0x0a2a33}),BUB);bubbles.frustumCulled=false;scene.add(bubbles);
const bubs=Array.from({length:BUB},()=>({p:new THREE.Vector3(0,-99,0),s:1,life:0,ph:0}));let bubT=0,breathT=2,bubI=0;
function emitBubble(src,spread,size){const b=bubs[bubI++%BUB];b.p.copy(src).add(new THREE.Vector3((Math.random()-.5)*spread,Math.random()*spread,(Math.random()-.5)*spread));b.s=size*(.4+Math.random());b.life=9;b.ph=Math.random()*6;}
function updateBubbles(dt){const src=rig.valve?rig.valve.getWorldPosition(new THREE.Vector3()):_p.set(.36,1.5,-.1).applyMatrix4(diver.matrixWorld).clone();bubT-=dt;breathT-=dt;
 if(bubT<=0){bubT=.07;emitBubble(src,.05,.5);}
 if(breathT<=0){breathT=3+Math.random()*1.5;for(let k=0;k<26;k++)emitBubble(src,.2,.4+Math.random()*1.2);sound.bubble();}
 if(Math.random()<dt*3)emitBubble(_p.set(ROPE_BASE.x+(Math.random()-.5)*.3,ROPE_BASE.y+Math.random()*4,ROPE_BASE.z),.1,.4);
 for(let i=0;i<BUB;i++){const b=bubs[i];if(b.life>0){b.life-=dt;b.p.y+=dt*(.9+b.s*.6);b.p.x+=Math.sin(b.life*5+b.ph)*dt*.25;b.p.z+=Math.cos(b.life*4+b.ph)*dt*.2;b.s+=dt*.03;if(b.p.y>SURF)b.life=0;}
  const s=b.life>0?b.s:0;_m.makeScale(s,s*.85,s).setPosition(b.life>0?b.p:_p.set(0,-99,0));bubbles.setMatrixAt(i,_m);}bubbles.instanceMatrix.needsUpdate=true;}

// --- Passe finale : eau, rayons volumétriques, halo ------------------------------------------------
const post=(()=>{const mkRT=(o={})=>new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,...o});
 const rt=mkRT({depthBuffer:true});rt.depthTexture=new THREE.DepthTexture(1,1);rt.depthTexture.type=THREE.UnsignedIntType;
 const rA=mkRT(),rB=mkRT();
 const qc=new THREE.OrthographicCamera(-1,1,1,-1,0,1),qg=new THREE.BufferGeometry();qg.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
 const quad=new THREE.Mesh(qg);quad.frustumCulled=false;const qs=new THREE.Scene();qs.add(quad);
 const VS=`varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.0,1.0);}`,opt={vertexShader:VS,depthTest:false,depthWrite:false};
 const bright=new THREE.ShaderMaterial({...opt,uniforms:{t:{value:null}},fragmentShader:`uniform sampler2D t;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=dot(c,vec3(.3,.6,.1));gl_FragColor=vec4(c*smoothstep(.6,1.6,l),1.0);}`});
 const blur=new THREE.ShaderMaterial({...opt,uniforms:{t:{value:null},dir:{value:new THREE.Vector2()}},fragmentShader:`uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227;c+=(texture2D(t,vUv+dir*1.38).rgb+texture2D(t,vUv-dir*1.38).rgb)*.316;c+=(texture2D(t,vUv+dir*3.23).rgb+texture2D(t,vUv-dir*3.23).rgb)*.07;gl_FragColor=vec4(c,1.0);}`});
 const comp=new THREE.ShaderMaterial({...opt,uniforms:{tColor:{value:rt.texture},tDepth:{value:rt.depthTexture},tBloom:{value:rA.texture},uProjInv:{value:new THREE.Matrix4()},uViewInv:{value:new THREE.Matrix4()},uCam:{value:new THREE.Vector3()},uL:{value:SUN},uTime:uni.uTime,uSurf:{value:SURF},uSteps:{value:24},uBloom:{value:1},uFade:{value:0},uAbove:{value:0},uDusk:uni.uDusk,uSkySun:uni.uSkySun},
  fragmentShader:`uniform sampler2D tColor,tDepth,tBloom;uniform mat4 uProjInv,uViewInv;uniform vec3 uCam,uL;uniform float uTime,uSurf,uSteps,uBloom,uFade,uAbove,uDusk;uniform vec3 uSkySun;varying vec2 vUv;
  ${SKY_GLSL}
  float hash(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}
  float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  float shaft(vec3 p){vec2 q=p.xz-uL.xz/uL.y*(uSurf-p.y);q=vec2(q.x*.8+q.y*.6,q.y*.8-q.x*.6);float n=vn(q*vec2(.09,.22)+vec2(uTime*.04,uTime*.025))*.65+vn(q*vec2(.25,.6)-uTime*.05)*.35;return pow(smoothstep(.42,.95,n),1.6);}
  vec3 water(vec3 rd,float below){vec3 deep=vec3(.002,.018,.045),mid=vec3(.008,.07,.13),hi=vec3(.06,.3,.4);vec3 c=mix(mid,hi,smoothstep(-.05,.95,rd.y));c=mix(c,deep,smoothstep(.0,-.8,rd.y));return c*exp(-below*.025);}
  vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
  void main(){vec3 col=texture2D(tColor,vUv).rgb;float d=texture2D(tDepth,vUv).x;vec4 v=uProjInv*vec4(vUv*2.0-1.0,d*2.0-1.0,1.0);v/=v.w;vec3 wp=(uViewInv*v).xyz;vec3 rd=normalize(wp-uCam);
   float dist=d>=.99999?220.0:length(wp-uCam);float below=max(0.0,uSurf-uCam.y);
   vec3 c=col*exp(-dist*vec3(.07,.036,.028));c=mix(c,water(rd,below),1.0-exp(-dist*.05));
   float tmax=min(dist,70.0),st=tmax/uSteps,t=hash(gl_FragCoord.xy+fract(uTime*7.0))*st,acc=0.0;
   for(int i=0;i<32;i++){if(float(i)>=uSteps)break;vec3 p=uCam+rd*t;if(p.y>uSurf)break;acc+=shaft(p)*smoothstep(1.0,9.0,t)*exp(-t*.045)*exp(-(uSurf-p.y)*.05);t+=st;}
   c+=vec3(.4,.78,.86)*acc*st*.17;
   vec3 cA=d>=.99999?sky(rd):mix(col,sky(normalize(vec3(rd.x,max(rd.y,.03),rd.z)))*.85,1.0-exp(-dist*.0035));c=mix(c,cA,uAbove);
   c+=texture2D(tBloom,vUv).rgb*.5*uBloom*mix(1.0,.5,uAbove);
   vec2 q=vUv-.5;c*=1.0-dot(q,q)*1.1;c=aces(c*1.35);c=pow(c,vec3(1.0/2.2));c=mix(c,vec3(0.0),uFade);c+=(hash(gl_FragCoord.xy+uTime)-.5)*.014;gl_FragColor=vec4(c,1.0);}`});
 const api={comp,setSize(w,h){rt.setSize(w,h);rt.depthTexture.image.width=w;rt.depthTexture.image.height=h;const bw=Math.max(1,w>>2),bh=Math.max(1,h>>2);rA.setSize(bw,bh);rB.setSize(bw,bh);api.bw=bw;api.bh=bh;},bw:1,bh:1,bloom:true,
  render(){renderer.setRenderTarget(rt);renderer.setClearColor(0x000000,1);renderer.clear();renderer.render(scene,camera);
   if(api.bloom){quad.material=bright;bright.uniforms.t.value=rt.texture;renderer.setRenderTarget(rA);renderer.render(qs,qc);
    for(let k=0;k<2;k++){quad.material=blur;blur.uniforms.t.value=rA.texture;blur.uniforms.dir.value.set(1/api.bw,0);renderer.setRenderTarget(rB);renderer.render(qs,qc);blur.uniforms.t.value=rB.texture;blur.uniforms.dir.value.set(0,1/api.bh);renderer.setRenderTarget(rA);renderer.render(qs,qc);}}
   comp.uniforms.uBloom.value=api.bloom?1:0;comp.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);comp.uniforms.uViewInv.value.copy(camera.matrixWorld);comp.uniforms.uCam.value.copy(camera.position);comp.uniforms.uAbove.value=THREE.MathUtils.smoothstep(camera.position.y,SURF-.05,SURF+.12);
   renderer.setRenderTarget(null);quad.material=comp;renderer.render(qs,qc);}};
 return api;})();

// --- Les huit babioles ----------------------------------------------------------------------
const bronze=new THREE.MeshStandardMaterial({color:0x6f8f6e,metalness:.7,roughness:.45}),gold=new THREE.MeshStandardMaterial({color:0xd6a64a,metalness:.9,roughness:.3});
const M=(g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);return o;};
const ITEMS=[
 {id:'anticythere',name:'Mécanisme d’Anticythère, modèle « Pro »',era:'IIe – Ier siècle av. J.-C.',at:[-9,-26],
  text:'Le vrai, repêché en 1901 au large de l’île grecque d’Anticythère, calculait les éclipses avec une trentaine d’engrenages : c’est le plus ancien calculateur connu. Celui-ci affiche en plus une notification : « Pensez à vous hydrater. »',
  build(){const g=new THREE.Group();g.add(M(new THREE.BoxGeometry(.7,.5,.14),bronze));for(const [x,y,r] of [[-.12,.05,.17],[.18,-.08,.12],[.12,.14,.07]]){const gear=M(new THREE.CylinderGeometry(r,r,.05,24),gold,x,y,.09);gear.rotation.x=Math.PI/2;g.add(gear);}return g;}},
 {id:'garum',name:'Amphore de garum, édition limitée',era:'Ier siècle apr. J.-C.',at:[3,-17],
  text:'Le garum, une sauce de poisson fermenté, voyageait dans tout l’Empire romain en amphores. Inscription peinte sur la panse : « À consommer de préférence avant la chute de Rome ».',
  build(){const g=new THREE.Group(),a=M(AMPH,terracotta);a.scale.setScalar(.8);a.rotation.z=Math.PI/2;g.add(a);const label=M(new THREE.BoxGeometry(.02,.2,.28),new THREE.MeshStandardMaterial({color:0xf2e6c8}),0,.17,.2);label.position.set(.35,.12,0);g.add(label);return g;}},
 {id:'hoplite',name:'Casque corinthien à antenne',era:'VIIe siècle av. J.-C. (antenne : plus tard)',at:[24,12],
  text:'Le casque corinthien protégeait tout le visage des hoplites grecs, au prix d’une vue et d’une ouïe très réduites. Celui-ci capte la 4G. Une barre.',
  build(){const g=new THREE.Group(),h=M(new THREE.SphereGeometry(.3,16,12,0,Math.PI*2,0,Math.PI*.62),bronze);g.add(h);const cheek=M(new THREE.BoxGeometry(.5,.3,.05),bronze,0,-.2,.2);g.add(cheek);const slit=M(new THREE.BoxGeometry(.3,.05,.06),darkM,0,-.08,.23);g.add(slit);
   const crest=M(new THREE.BoxGeometry(.06,.18,.5),new THREE.MeshStandardMaterial({color:0xb53a2e,roughness:1}),0,.32,0);g.add(crest);const ant=M(new THREE.CylinderGeometry(.01,.01,.5,5),darkM,.18,.42,0);g.add(ant);g.add(M(new THREE.SphereGeometry(.03,6,5),new THREE.MeshStandardMaterial({color:0xff4444,emissive:0xff2222,emissiveIntensity:2}),.18,.68,0));return g;}},
 {id:'canard',name:'Canard en plastique, cargaison 1992',era:'1992 apr. J.-C.',at:[-30,20],
  text:'Histoire vraie : en 1992, près de 29 000 jouets de bain tombés d’un porte-conteneurs dans le Pacifique ont aidé les océanographes à suivre les courants pendant des années. Celui-ci s’est très bien adapté à la Méditerranée.',
  build(){const y=new THREE.MeshStandardMaterial({color:0xffd23f,roughness:.4}),g=new THREE.Group();const b=M(new THREE.SphereGeometry(.25,14,10),y);b.scale.set(1.2,.8,1);g.add(b);g.add(M(new THREE.SphereGeometry(.15,12,10),y,.18,.22,0));const beak=M(new THREE.ConeGeometry(.06,.14,8),new THREE.MeshStandardMaterial({color:0xff7a1a}),.36,.2,0);beak.rotation.z=-Math.PI/2;g.add(beak);g.add(M(new THREE.SphereGeometry(.025,6,5),darkM,.27,.27,.08),M(new THREE.SphereGeometry(.025,6,5),darkM,.27,.27,-.08));return g;}},
 {id:'tablette',name:'Tablette de cire « motdepasse123 »',era:'Époque romaine',at:[40,-30],
  text:'Les Romains écrivaient au stylet sur des tablettes de bois enduites de cire, effaçables à volonté. Celle-ci garde le mot de passe des thermes. La sécurité informatique a peu progressé.',
  build(){const g=new THREE.Group();g.add(M(new THREE.BoxGeometry(.55,.05,.38),wood));g.add(M(new THREE.BoxGeometry(.47,.02,.3),new THREE.MeshStandardMaterial({color:0x2f2a22,roughness:.6}),0,.03,0));for(let i=0;i<3;i++)g.add(M(new THREE.BoxGeometry(.3-i*.05,.005,.012),new THREE.MeshStandardMaterial({color:0xcfc2a0}),-.02,.045,-.08+i*.08));return g;}},
 {id:'chat',name:'Statuette de chat qui juge',era:'Basse Époque égyptienne, 664 – 332 av. J.-C.',at:[-40,-18],
  text:'Les Égyptiens offraient des statuettes de chat en bronze à la déesse Bastet. Celui-ci vous juge depuis vingt-cinq siècles, et il n’a pas fini.',
  build(){const g=new THREE.Group(),b=M(new THREE.CylinderGeometry(.12,.17,.45,12),bronze,0,.22,0);g.add(b);g.add(M(new THREE.SphereGeometry(.12,12,10),bronze,0,.52,.02));for(const s of [-1,1]){const ear=M(new THREE.ConeGeometry(.04,.1,4),bronze,s*.07,.64,0);g.add(ear);g.add(M(new THREE.SphereGeometry(.018,6,5),gold,s*.045,.54,.11));}const tail=M(new THREE.TorusGeometry(.14,.025,6,10,Math.PI),bronze,0,.05,-.1);tail.rotation.x=Math.PI/2;g.add(tail);return g;}},
 {id:'miroir',name:'Miroir en bronze, filtre intégré',era:'Époque étrusque, IVe siècle av. J.-C.',at:[16,-44],
  text:'Avant le verre étamé, on se regardait dans du bronze poli ; les Étrusques gravaient des scènes au dos. Filtre par défaut : patine vert-de-gris.',
  build(){const g=new THREE.Group(),d=M(new THREE.CylinderGeometry(.24,.24,.03,28),new THREE.MeshStandardMaterial({color:0xc9b07a,metalness:1,roughness:.12}));d.rotation.x=Math.PI/2;g.add(d);g.add(M(new THREE.CylinderGeometry(.03,.03,.3,8),bronze,0,-.36,0));return g;}},
 {id:'ancre',name:'Ancre phocéenne « J’♥ Massalia »',era:'Vers 600 av. J.-C. (graffiti : non daté)',at:[34,34],
  text:'Des marins grecs venus de Phocée ont fondé Massalia, la future Marseille, vers 600 av. J.-C. Les ancres de l’époque étaient souvent des pierres percées. Le graffiti est sans doute plus récent.',
  build(){const g=new THREE.Group(),st=M(new THREE.CylinderGeometry(.35,.42,.2,7),new THREE.MeshStandardMaterial({color:0x8b8d86,roughness:1,flatShading:true}));g.add(st);const hole=M(new THREE.TorusGeometry(.09,.03,6,12),darkM,0,.11,0);hole.rotation.x=Math.PI/2;g.add(hole);const heart=M(new THREE.SphereGeometry(.05,8,6),new THREE.MeshStandardMaterial({color:0xe23b4a,emissive:0x901020,emissiveIntensity:.6}),.2,.11,.1);g.add(heart);return g;}}
];
const moundMat=new THREE.MeshStandardMaterial({color:0x9c9884,roughness:1});
const glintMat=new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const k=c.getContext('2d'),gr=k.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,250,220,1)');gr.addColorStop(.25,'rgba(255,230,150,.6)');gr.addColorStop(1,'rgba(255,230,150,0)');k.fillStyle=gr;k.fillRect(0,0,64,64);k.fillStyle='rgba(255,255,255,.9)';k.fillRect(30,4,4,56);k.fillRect(4,30,56,4);return new THREE.CanvasTexture(c);})(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
for(const it of ITEMS){const [x,z]=it.at,y=ground(x,z);it.pos=new THREE.Vector3(x,y,z);it.obj=it.build();it.obj.position.set(x,y-.25,z);it.obj.rotation.y=Math.random()*6;it.obj.rotation.z=.35;scene.add(it.obj);
 it.mound=new THREE.Mesh(new THREE.SphereGeometry(.9,16,10,0,Math.PI*2,0,Math.PI/2),moundMat);it.mound.scale.set(1,.45,1);it.mound.position.set(x,y-.05,z);scene.add(it.mound);
 it.glint=new THREE.Sprite(glintMat);it.glint.scale.setScalar(.6);it.glint.position.set(x+.2,y+.35,z);scene.add(it.glint);it.dig=0;it.found=false;}
const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,30,16,1,true),new THREE.MeshBasicMaterial({color:0x9ff3ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));scene.add(beacon);
const pingRing=new THREE.Mesh(new THREE.TorusGeometry(1,.04,6,48),new THREE.MeshBasicMaterial({color:0x9ff3ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));pingRing.rotation.x=Math.PI/2;scene.add(pingRing);
// Sand kicked up by the brush.
// Sand kicked up by boots and brush: soft, growing puffs that settle slowly.
const DUST=420,dustPos=new Float32Array(DUST*3),dustA=new Float32Array(DUST*2);
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));dustGeo.setAttribute('aSA',new THREE.BufferAttribute(dustA,2));
const dust=new THREE.Points(dustGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`attribute vec2 aSA;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=aSA.x*420.0/max(.5,-mv.z);vA=aSA.y;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`varying float vA;void main(){vec2 c=gl_PointCoord-.5;float d=dot(c,c)*4.0;if(d>1.0)discard;gl_FragColor=vec4(pow(vec3(.62,.58,.47),vec3(2.2)),vA*(1.0-d)*(1.0-d));}`}));
dust.frustumCulled=false;scene.add(dust);
const dusts=Array.from({length:DUST},()=>({p:new THREE.Vector3(0,-99,0),v:new THREE.Vector3(),life:0,max:1}));let dustI=0;
function puff(at,n){for(let k=0;k<n;k++){const d=dusts[dustI++%DUST];d.p.copy(at).add(new THREE.Vector3(Math.random()-.5,.05,Math.random()-.5).multiplyScalar(.5));d.v.set((Math.random()-.5)*.8,.15+Math.random()*.45,(Math.random()-.5)*.8);d.max=d.life=1.8+Math.random()*1.6;}}
function updateDust(dt){for(let i=0;i<DUST;i++){const d=dusts[i];if(d.life>0){d.life-=dt;d.v.multiplyScalar(1-dt*1.6);d.v.y-=dt*.05;d.p.addScaledVector(d.v,dt);}const k=d.life>0?1-d.life/d.max:1;
  dustPos[i*3]=d.p.x;dustPos[i*3+1]=d.life>0?d.p.y:-99;dustPos[i*3+2]=d.p.z;dustA[i*2]=.06+k*.3;dustA[i*2+1]=d.life>0?.34*Math.min(1,k*6)*(1-k):0;}
 dustGeo.attributes.position.needsUpdate=true;dustGeo.attributes.aSA.needsUpdate=true;}

// --- Son --------------------------------------------------------------------------------------
const sound=(()=>{let ac=null,muted=false,amb=null;const api={};
 const noiseBuf=s=>{const b=ac.createBuffer(1,ac.sampleRate*s,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;l=(l+w*.02)/1.02;d[i]=l*3.5;}return b;};
 // No continuous ambience: only bubbles, brush, sonar and finds make a sound. Audio sleeps when the page is hidden.
 api.start=()=>{if(ac||muted)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ac=new C();document.addEventListener('visibilitychange',()=>{if(document.hidden)ac.suspend();else if(!muted)ac.resume();});};
 const tone=(f0,f1,dur,vol,type='sine',delay=0)=>{if(!ac||muted)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur+.05);};
 const hiss=(dur,vol,freq,q=1,delay=0)=>{if(!ac||muted)return;const t=ac.currentTime+delay,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf(dur+.1);f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f).connect(g).connect(ac.destination);s.start(t);};
 api.bubble=()=>{for(let k=0;k<4;k++)tone(300+Math.random()*500,900+Math.random()*700,.07,.025,'sine',k*.06+Math.random()*.05);};
 api.ping=()=>{for(let k=0;k<4;k++)tone(1350,1300,.9,.12/(k+1),'sine',k*.32);};
 api.brush=()=>hiss(.12,.25,2600,2);api.found=()=>{[523,659,784,1046].forEach((f,k)=>tone(f,f,.8,.07,'triangle',k*.11));};
 api.splash=()=>{hiss(1.1,.35,600);hiss(.5,.2,2600,.05);};
 api.heart=()=>{tone(70,45,.15,.3);tone(70,45,.15,.22,'sine',.22);};
 api.toggle=()=>{muted=!muted;if(ac){if(muted)ac.suspend();else ac.resume();}return muted;};return api;})();

// --- Commandes et caméra ------------------------------------------------------------------
const keys={};let yaw=Math.PI,pitch=.22,dist=3.6,drag=null,dragT=0;
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;keys[e.code]=true;
 if(state.mode==='title'&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();dive();return;}
 if(e.code==='KeyR'&&state.mode==='play')sonar();if(e.code==='KeyJ')toggleJournal();if(e.code==='Escape'&&state.mode==='play'){state.paused=!state.paused;$('abyss-pause').hidden=!state.paused;}
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>{keys[e.code]=false;});addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);sound.start();});
canvas.addEventListener('pointermove',e=>{if(!drag)return;dragT=1.6;yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(-.35,Math.min(1.1,pitch+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',()=>{drag=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(2.2,Math.min(9,dist*(1+Math.sign(e.deltaY)*.1)));},{passive:false});
const touch={};for(const b of document.querySelectorAll('[data-touch]')){b.onpointerdown=e=>{e.preventDefault();touch[b.dataset.touch]=true;if(b.dataset.touch==='sonar')sonar();};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>{touch[b.dataset.touch]=false;};}
const down=(...c)=>c.some(k=>keys[k]);

// --- État du jeu -----------------------------------------------------------------------------
const state={seqT:0,endPhase:0,splashed:false,sinking:false,outYaw:0,mode:'title',paused:false,air:1,vel:new THREE.Vector3(),onGround:true,speed:0,turnV:0,vy:0,jumpHeld:false,lean:0,stepPh:0,landT:0,time:0,dives:1,sonarCd:0,sonarT:0,sonarTarget:null,found:0,heartT:0,near:null,faceYaw:0,endT:0};
// Entering the water from the boat, as in the reference: walk to the rail, turn, climb down the ladder, let go and sink.
function dive(skip){if(state.mode!=='title')return;sound.start();$('abyss-title').hidden=true;canvas.focus();
 if(skip){state.mode='play';diver.position.copy(LANDING);$('abyss-hud').hidden=false;return;}state.mode='enter';state.seqT=0;}
function setAnim(tg,dt,walkScale=1){for(const k in rig.w){rig.w[k]=lerp(rig.w[k],tg[k]||0,Math.min(1,dt*6));rig.act[k].setEffectiveWeight(rig.w[k]);}rig.act.walk.setEffectiveTimeScale(walkScale);}
const foam=[];
function splash(p){for(let k=0;k<3;k++){const m=new THREE.Mesh(new THREE.RingGeometry(.42,.5,48),new THREE.MeshBasicMaterial({color:0xdff4f6,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  m.rotation.x=-Math.PI/2;m.position.set(p.x,SURF+.22,p.z);m.userData.t=-k*.3;scene.add(m);foam.push(m);}
 for(let k=0;k<50;k++)emitBubble(new THREE.Vector3(p.x,SURF-.8-Math.random(),p.z),.9,.5+Math.random()*1.2);sound.splash();}
function updateFoam(dt){for(let i=foam.length-1;i>=0;i--){const m=foam[i];m.userData.t+=dt;const t=m.userData.t;if(t<0)continue;m.scale.setScalar(1+t*3.2);m.material.opacity=Math.max(0,.3*(1-t/2.2));if(t>2.2){scene.remove(m);m.geometry.dispose();foam.splice(i,1);}}}
function onDeck(dt){diver.position.copy(bp('deck_spot'));state.faceYaw=state.outYaw;setAnim({idle:1},dt);diver.rotation.set(0,state.faceYaw,0);}
function stepEnter(dt){const t=(state.seqT+=dt),deck=bp('deck_spot'),top=bp('ladder_top'),bot=bp('ladder_bottom'),out=state.outYaw;
 if(t<1.5){const k=t/1.5;diver.position.lerpVectors(deck,top,k*k*(3-2*k));state.faceYaw=out;setAnim({walk:1},dt,.8);}
 else if(t<2.3){diver.position.copy(top);state.faceYaw=out+Math.PI*THREE.MathUtils.smootherstep((t-1.5)/.8,0,1);setAnim({walk:.5},dt,.45);}
 else if(t<6){const k=(t-2.3)/3.7;diver.position.lerpVectors(top,bot,k);diver.position.y+=Math.abs(Math.sin(k*26))*.04;state.faceYaw=out+Math.PI;setAnim({walk:1},dt,.5);
  if(!state.splashed&&diver.position.y<SURF-.3){state.splashed=true;splash(diver.position);}}
 else{if(!state.sinking){state.sinking=true;state.vy=-.3;}
  state.vy=Math.max(-2.4,state.vy-dt*1.4);diver.position.y+=state.vy*dt;diver.position.x=lerp(diver.position.x,LANDING.x,Math.min(1,dt*.6));diver.position.z=lerp(diver.position.z,LANDING.z,Math.min(1,dt*.6));
  setAnim({bound:1},dt);const gy=ground(diver.position.x,diver.position.z);
  if(diver.position.y<=gy){diver.position.y=gy;state.mode='play';state.onGround=true;state.vy=0;state.landT=.4;puff(diver.position,16);$('abyss-hud').hidden=false;}}
 diver.rotation.set(0,state.faceYaw,0);}
// The way home: rise along the line to the ladder, climb aboard at sunset.
function stepEnding(dt){const t=(state.endT+=dt),top=bp('ladder_top'),bot=bp('ladder_bottom');uni.uDusk.value=THREE.MathUtils.smoothstep(t,2,12);
 if(t<2.5){setAnim({idle:1},dt);}
 else if(state.endPhase===0){diver.position.y+=dt*3.2;$('abyss-card').hidden=true;$('abyss-journal').hidden=true;diver.position.x=lerp(diver.position.x,bot.x,Math.min(1,dt*.5));diver.position.z=lerp(diver.position.z,bot.z,Math.min(1,dt*.5));setAnim({bound:1},dt);
  let d=(state.outYaw+Math.PI)-state.faceYaw;d=Math.atan2(Math.sin(d),Math.cos(d));state.faceYaw+=d*Math.min(1,dt*2);
  if(diver.position.y>=bot.y){state.endPhase=1;state.climb0=diver.position.clone();state.climbT=0;$('abyss-hud').hidden=true;}}
 else if(state.endPhase===1){state.climbT+=dt;const k=Math.min(1,state.climbT/3.6);diver.position.lerpVectors(state.climb0,top,k);diver.position.y+=Math.abs(Math.sin(k*26))*.04;setAnim({walk:1},dt,.5);
  if(!state.splash2&&diver.position.y>SURF-.2){state.splash2=true;splash(diver.position);}if(k>=1){state.endPhase=2;state.endAt=t;}}
 else{diver.position.lerp(bp('deck_spot'),Math.min(1,dt*1.5));setAnim({idle:1},dt);
  if(t-state.endAt>1.5&&$('abyss-end').hidden){$('abyss-end').hidden=false;$('end-summary').textContent=`Les huit babioles sont au carnet en ${fmtT(state.time)}, avec ${state.dives} plongée${state.dives>1?'s':''}. Le musée le plus absurde de la Méditerranée ouvre ses portes.`;}}
 diver.rotation.set(0,state.faceYaw,0);}
function stepMode(dt){if(state.mode==='play')stepPlay(dt);else if(state.mode==='enter')stepEnter(dt);else if(state.mode==='ending')stepEnding(dt);else if(state.mode==='title')onDeck(dt);
 // the boat rides the swell
 const T=uni.uTime.value;boat.position.y=boatBase.y+Math.sin(T*.7)*.07;boat.rotation.set(Math.sin(T*.55)*.02,0,Math.sin(T*.62)*.028);boat.updateMatrixWorld(true);
 boat.userData.lamp.intensity=uni.uDusk.value*6;}
$('abyss-dive').onclick=dive;$('abyss-again').onclick=()=>location.reload();$('abyss-sound').onclick=e=>{e.target.textContent=sound.toggle()?'Son : non':'Son : oui';};$('abyss-journal-btn').onclick=toggleJournal;$('card-close').onclick=()=>{$('abyss-card').hidden=true;};
function toggleJournal(){const j=$('abyss-journal');j.hidden=!j.hidden;if(!j.hidden)renderJournal();}
function renderJournal(){const list=$('journal-list');list.replaceChildren();for(const it of ITEMS){const li=document.createElement('li');li.className=it.found?'got':'';li.innerHTML=it.found?`<b>${it.name}</b><small>${it.era}</small>`:'<b>???</b><small>Encore enfoui quelque part</small>';list.append(li);}}
function sonar(){if(state.sonarCd>0||state.mode!=='play')return;state.sonarCd=3;state.sonarT=4.5;const left=ITEMS.filter(i=>!i.found);if(!left.length)return;
 state.sonarTarget=left.reduce((a,b)=>a.pos.distanceTo(diver.position)<b.pos.distanceTo(diver.position)?a:b);sound.ping();pingRing.position.copy(diver.position).add(new THREE.Vector3(0,.3,0));pingRing.userData.t=0;beacon.position.copy(state.sonarTarget.pos).add(new THREE.Vector3(0,15,0));beacon.userData.t=0;}
function discover(it){it.found=true;state.found++;sound.found();puff(it.pos,40);scene.remove(it.mound);it.glint.visible=false;
 $('card-name').textContent=it.name;$('card-era').textContent=it.era;$('card-text').textContent=it.text;$('card-count').textContent=`${state.found} / ${ITEMS.length} dans le carnet`;$('abyss-card').hidden=false;updateSlots();
 if(state.found===ITEMS.length){state.mode='ending';state.endT=0;state.endPhase=0;}}
function updateSlots(){const s=$('abyss-slots');s.replaceChildren();for(const it of ITEMS){const i=document.createElement('i');if(it.found)i.className='on';s.append(i);}$('abyss-count').textContent=`${state.found} / ${ITEMS.length}`;}
updateSlots();
const fmtT=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

// Heavy-boot walking on the seabed: forward/back with inertia, tank-style turning, low-gravity bounds.
const WALK=1.2,RUN=1.9,BACK=.55,ACC=1.9,BRAKE=2.6,TURN=1.7,STAND_TURN=1.25,G=2.4,BOUND_VY=1.75;
const lerp=THREE.MathUtils.lerp,clamp=THREE.MathUtils.clamp;
function footPuff(foot){if(!foot)return;foot.getWorldPosition(_p);_p.y=ground(_p.x,_p.z)+.05;puff(_p,4);}
function stepPlay(dt){state.time+=dt;state.sonarCd-=dt;state.sonarT-=dt;dragT-=dt;
 const fwd=(down('KeyW','ArrowUp')||touch.fwd?1:0)-(down('KeyS','ArrowDown')||touch.back?1:0),turn=(down('KeyA','ArrowLeft')||touch.left?1:0)-(down('KeyD','ArrowRight')||touch.right?1:0);
 const run=down('ShiftLeft','ShiftRight')||touch.down,jump=down('Space')||touch.up,brushing=!!(state.near&&(down('KeyE')||touch.brush)&&state.onGround);
 // turning: quicker on the move, slower standing; while brushing the diver faces the find
 if(brushing){const d=state.near.pos,want=Math.atan2(d.x-diver.position.x,d.z-diver.position.z);let dd=want-state.faceYaw;dd=Math.atan2(Math.sin(dd),Math.cos(dd));state.faceYaw+=dd*Math.min(1,dt*3);state.turnV=0;}
 else{state.turnV=lerp(state.turnV,turn*(Math.abs(state.speed)>.25?TURN:STAND_TURN)*(state.onGround?1:.5),Math.min(1,dt*5));state.faceYaw+=state.turnV*dt;}
 // forward speed: the suit weighs ~90 kg in water, so it takes a moment to get going and to stop
 const target=brushing?0:fwd>0?(run?RUN:WALK):fwd<0?-BACK:0,a=(fwd!==0&&!brushing?ACC:BRAKE)*(state.onGround?1:.3);
 state.speed+=clamp(target-state.speed,-a*dt,a*dt);
 const sx=Math.sin(state.faceYaw),sz=Math.cos(state.faceYaw);diver.position.x+=sx*state.speed*dt;diver.position.z+=sz*state.speed*dt;
 // rocks push the diver out
 for(const r of rocks){const dx=diver.position.x-r.x,dz=diver.position.z-r.z,d=Math.hypot(dx,dz),min=r.r+.35;if(d<min&&d>1e-4&&diver.position.y<r.top){diver.position.x=r.x+dx/d*min;diver.position.z=r.z+dz/d*min;state.speed*=.9;}}
 diver.position.x=clamp(diver.position.x,-EDGE,EDGE);diver.position.z=clamp(diver.position.z,-EDGE,EDGE);
 // bounds: a slow push off the sand, a long floating arc, a soft landing in a puff of sand
 const gy=ground(diver.position.x,diver.position.z);
 if(jump&&!state.jumpHeld&&state.onGround&&!brushing){state.vy=BOUND_VY+(run?.25:0);state.onGround=false;state.speed+=(fwd>0?.35:0);rig.act.bound.reset().play();footPuff(rig.footL);footPuff(rig.footR);}
 state.jumpHeld=jump;
 if(!state.onGround){state.vy-=G*dt;state.vy=Math.max(state.vy,-2.2);diver.position.y+=state.vy*dt;if(diver.position.y<=gy&&state.vy<0){diver.position.y=gy;state.onGround=true;state.landT=.35;footPuff(rig.footL);footPuff(rig.footR);puff(diver.position,10);}}
 else diver.position.y=lerp(diver.position.y,gy,Math.min(1,dt*10));
 if(diver.position.y>SURF-2.2){diver.position.y=SURF-2.2;state.vy=Math.min(0,state.vy);}
 state.landT-=dt;
 // body: lean into turns and acceleration, face the heading
 state.lean=lerp(state.lean,-state.turnV*Math.min(1,Math.abs(state.speed))*.09,Math.min(1,dt*4));
 diver.rotation.set(state.onGround?Math.max(0,state.speed)*.05:0,state.faceYaw,state.lean,'YXZ');
 // animation weights, smoothed: idle / walk / bound / brush
 const sp=Math.abs(state.speed),turning=Math.abs(state.turnV)>.35&&sp<.25;
 const W={idle:0,walk:state.onGround?Math.max(clamp(sp/.8,0,1),turning?.6:0):0,bound:state.onGround?(state.landT>0?.5:0):1,brush:brushing?1:0};
 if(brushing){W.walk=0;W.bound=0;}W.idle=Math.max(0,1-W.walk-W.bound-W.brush);
 for(const k in W){rig.w[k]=lerp(rig.w[k],W[k],Math.min(1,dt*6));rig.act[k].setEffectiveWeight(rig.w[k]);}
 rig.act.walk.setEffectiveTimeScale((state.speed<-.05?-1:1)*Math.max(.55,sp/1.05)*(turning?.7:1));
 // footfalls: two contacts per walk cycle kick up sand
 if(rig.w.walk>.4&&state.onGround){const ph=(rig.act.walk.time/rig.act.walk.getClip().duration)%1,step=Math.floor(ph*2);if(step!==state.stepPh){state.stepPh=step;footPuff(step?rig.footR:rig.footL);}}
 // air: surface-supplied by the hose, but the compressor on the boat only has so much; refill at the anchor line
 const nearRope=Math.hypot(diver.position.x-ROPE_BASE.x,diver.position.z-ROPE_BASE.z)<3;state.air=Math.min(1,Math.max(0,state.air+(nearRope?.25:-1/240)*dt));$('abyss-rope').hidden=!nearRope||state.air>=.999;
 if(state.air<.2){state.heartT-=dt;if(state.heartT<=0){state.heartT=.9;sound.heart();}}
 if(state.air<=0){state.dives++;state.air=1;diver.position.set(START.x,ground(START.x,START.z),START.z+1.5);state.speed=0;state.vy=0;state.onGround=true;$('abyss-flash').classList.remove('go');void $('abyss-flash').offsetWidth;$('abyss-flash').classList.add('go');}
 // digging
 const t=state.time;state.near=null;for(const it of ITEMS){if(it.found)continue;if(it.pos.distanceTo(diver.position)<2.4){state.near=it;break;}}
 if(brushing&&state.near){const it=state.near;it.dig=Math.min(1,it.dig+dt/2.6);if(Math.random()<.6){if(rig.brush_tip){rig.brush_tip.getWorldPosition(_p);puff(_p,2);}else puff(it.pos,2);}if(Math.floor(t*8)!==Math.floor((t-dt)*8))sound.brush();
  it.mound.scale.set(1-it.dig*.4,.45*(1-it.dig),1-it.dig*.4);it.obj.position.y=it.pos.y-.25+it.dig*.55;it.obj.rotation.z=.35*(1-it.dig);if(it.dig>=1)discover(it);}
 const pr=$('abyss-prompt');if(state.near){pr.hidden=false;pr.querySelector('span').textContent=state.near.dig>0?`Dégager au pinceau : ${Math.round(state.near.dig*100)} %`:'Maintenir E pour dégager au pinceau';pr.querySelector('i').style.width=state.near.dig*100+'%';}else pr.hidden=true;
 uni.uDiver.value.copy(diver.position);}
// Third-person camera: swings behind the diver when walking (unless the player just looked around), eases in, stays above the sand.
const camTarget=new THREE.Vector3(),camPos=new THREE.Vector3(),camLook=new THREE.Vector3();
function placeCamera(dt,snap){
 if(state.mode==='title'){const c=boat.position;camTarget.set(c.x,SURF+2,c.z);if(!snap)yaw+=dt*.05;const D=17;camPos.set(c.x+Math.sin(yaw)*D,SURF+3.4,c.z+Math.cos(yaw)*D);
  if(snap){camera.position.copy(camPos);camLook.copy(camTarget);}else{camera.position.lerp(camPos,Math.min(1,dt*3));camLook.lerp(camTarget,Math.min(1,dt*3));}camera.lookAt(camLook);return;}
 if(state.mode==='enter'||state.mode==='ending'){let d=(state.outYaw+.7)-yaw;d=Math.atan2(Math.sin(d),Math.cos(d));yaw+=d*Math.min(1,dt*1.2);
  camTarget.copy(diver.position).add(_p.set(0,1.3,0));const D=6.5,cp=Math.cos(.14);camPos.set(camTarget.x+Math.sin(yaw)*D*cp,camTarget.y+Math.sin(.14)*D,camTarget.z+Math.cos(yaw)*D*cp);
  if(Math.abs(camPos.y-SURF)<.35)camPos.y=SURF+(camTarget.y>SURF?.35:-.35);const gy=ground(camPos.x,camPos.z)+.5;if(camPos.y<gy)camPos.y=gy;
  camera.position.lerp(camPos,Math.min(1,dt*2.5));camLook.lerp(camTarget,Math.min(1,dt*4));camera.lookAt(camLook);return;}
 if(state.mode==='play'&&dragT<=0&&Math.abs(state.speed)>.2){let d=(state.faceYaw+Math.PI)-yaw;d=Math.atan2(Math.sin(d),Math.cos(d));yaw+=d*Math.min(1,dt*1.8*Math.min(1,Math.abs(state.speed)));}
 camTarget.copy(diver.position).add(_p.set(0,1.45,0));const cp=Math.cos(pitch);camPos.set(camTarget.x+Math.sin(yaw)*dist*cp,camTarget.y+Math.sin(pitch)*dist,camTarget.z+Math.cos(yaw)*dist*cp);
 // keep the lens out of rocks: slide it back towards the diver until it clears them
 for(let k=0;k<6;k++){let hit=false;for(const r of rocks){const dx=camPos.x-r.x,dz=camPos.z-r.z;if(dx*dx+dz*dz<(r.r*.95+.3)**2&&camPos.y<r.top+.4){hit=true;break;}}if(!hit)break;camPos.lerp(camTarget,.3);}
 const gy=ground(camPos.x,camPos.z)+.45;if(camPos.y<gy)camPos.y=gy;if(camPos.y>SURF-.4)camPos.y=SURF-.4;
 if(snap){camera.position.copy(camPos);camLook.copy(camTarget);}else{camera.position.lerp(camPos,Math.min(1,dt*4));camLook.lerp(camTarget,Math.min(1,dt*8));}
 const sh=state.landT>0?state.landT*.04:0;camera.lookAt(camLook.x,camLook.y-sh,camLook.z);}
function hud(){const a=state.air,deg=a*360;$('air-ring').style.background=`conic-gradient(${a<.2?'#ff6b74':'#ffe8b0'} ${deg}deg, rgba(255,255,255,.12) 0)`;$('air-time').textContent=fmtT(a*240);$('abyss-depth').textContent=`${Math.max(0,SURF-diver.position.y).toFixed(1).replace('.',',')} m`;$('abyss-hud').classList.toggle('low',a<.2);
 const arrow=$('abyss-sonar');if(state.sonarT>0&&state.sonarTarget&&!state.sonarTarget.found){arrow.hidden=false;const d=state.sonarTarget.pos.clone().sub(diver.position),fw=d.x*-Math.sin(yaw)+d.z*-Math.cos(yaw),rt=d.x*Math.cos(yaw)+d.z*-Math.sin(yaw);arrow.querySelector('b').style.transform=`rotate(${Math.atan2(rt,fw)}rad)`;arrow.querySelector('span').textContent=`${Math.round(Math.hypot(d.x,d.z))} m`;}else arrow.hidden=true;}
let last=performance.now(),perfT=0,perfN=0,quality=0;
function degrade(){if(quality>=3)return;quality++;if(quality===1){grassMesh.count=12000;fish.count=1100;post.comp.uniforms.uSteps.value=16;}else if(quality===2){pixelRatio=Math.max(.6,pixelRatio-.4);renderer.setPixelRatio(pixelRatio);resize();post.comp.uniforms.uSteps.value=12;}else{grassMesh.count=5000;fish.count=500;post.bloom=false;post.comp.uniforms.uSteps.value=8;}}
if(new URLSearchParams(location.search).has('lite')){quality=2;degrade();grassMesh.count=3000;fish.count=300;}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(!state.paused){uni.uTime.value+=dt;
 stepMode(dt);updateFoam(dt);airLight(camera.position.y>SURF,uni.uDusk.value);ocean.position.x=Math.round(camera.position.x/2.5)*2.5;ocean.position.z=Math.round(camera.position.z/2.5)*2.5;
 rig.mixer.update(dt);updateFish(uni.uTime.value,diver.position);updateBubbles(dt);updateDust(dt);
  for(const it of ITEMS){if(!it.found){it.glint.material.rotation=uni.uTime.value;it.glint.scale.setScalar(.35+.25*Math.max(0,Math.sin(uni.uTime.value*2+it.pos.x)));}else{it.obj.rotation.y+=dt*.6;it.obj.position.y=it.pos.y+.4+Math.sin(uni.uTime.value*1.5)*.08;}}
 if(pingRing.userData.t!==undefined){pingRing.userData.t+=dt;const k=pingRing.userData.t;pingRing.scale.setScalar(1+k*14);pingRing.material.opacity=Math.max(0,.8-k*.5);}
 if(beacon.userData.t!==undefined){beacon.userData.t+=dt;beacon.material.opacity=Math.max(0,.35*Math.sin(Math.min(1,beacon.userData.t/4.5)*Math.PI));}
 diver.updateMatrixWorld();updateHose();placeCamera(dt,false);if(state.mode==='play')hud();}
 post.render();
 // Adaptive quality: on a slow machine, fewer grass blades and fish, then a lower resolution.
 perfT+=Math.min(dt,.5);perfN++;if(perfT>2){if(perfT/perfN>.03)degrade();perfT=perfN=0;}}
function resize(){const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);post.setSize(Math.max(1,Math.round(r.width*pixelRatio)),Math.max(1,Math.round(r.height*pixelRatio)));camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
{const d=bp('ladder_top').sub(bp('deck_spot'));state.outYaw=Math.atan2(d.x,d.z);}onDeck(0);
new ResizeObserver(resize).observe(host);resize();placeCamera(0,true);requestAnimationFrame(frame);
window.AbyssGame={state,ITEMS,diver,discover,sonar,dive,keys,rig,
 // advance the simulation without waiting for frames (automated checks)
 look(y,p,d){yaw=state.faceYaw+y;pitch=p;dist=d;dragT=99;},
 step(n,dt=1/30){for(let i=0;i<n;i++){uni.uTime.value+=dt;stepMode(dt);updateFoam(dt);rig.mixer.update(dt);diver.updateMatrixWorld();placeCamera(dt,false);}}};
// Test hook (?shot=item,found,swim,sonar): stage a scene without waiting for input, for automated screenshots.
{const q=new URLSearchParams(location.search).get('shot');if(q){const [item,found,swim,son]=q.split(',').map(Number);dive(true);const it=ITEMS[item||0];diver.position.set(it.pos.x-1.5,it.pos.y+(swim||0),it.pos.z+1);for(let i=0;i<(found||0);i++)discover(ITEMS[i]);if(son)sonar();diver.updateMatrixWorld();placeCamera(0,true);}}

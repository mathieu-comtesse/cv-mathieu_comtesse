/* Abysses & babioles : plongée archéologique (et un peu absurde) en Three.js.
   Un scaphandrier, 2 047 poissons en bancs, 25 000 brins d’herbier, huit objets à dégager au pinceau. */
import * as THREE from './three.module.js';
const $=id=>document.getElementById(id);
const host=$('abyss-stage'),canvas=$('abyss-canvas');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
let pixelRatio=Math.min(devicePixelRatio,1.5);renderer.setPixelRatio(pixelRatio);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const scene=new THREE.Scene(),FOG=new THREE.Color(0x0b4f63),FOG_DENSITY=.03;scene.background=FOG.clone();scene.fog=new THREE.FogExp2(FOG,FOG_DENSITY);
const camera=new THREE.PerspectiveCamera(58,1,.1,400);
const SURF=24,EDGE=74;
scene.add(new THREE.HemisphereLight(0x9fe8ff,0x3a4a36,1.35));
const sun=new THREE.DirectionalLight(0xe6fbff,1.7);sun.position.set(12,40,6);scene.add(sun);
const uni={uTime:{value:0},uFog:{value:FOG},uDensity:{value:FOG_DENSITY},uDiver:{value:new THREE.Vector3()},uSun:{value:new THREE.Vector3(.3,1,.15).normalize()}};

// --- Relief ----------------------------------------------------------------------
function ground(x,z){const d=Math.hypot(x,z);return Math.sin(x*.075)*Math.cos(z*.061)*1.3+Math.sin(x*.19+z*.13)*.45+Math.cos(z*.23-x*.05)*.3+Math.max(0,d-58)*.35-Math.exp(-((x+4)**2+(z+22)**2)/140)*1.4;}
const FOG_GLSL=`uniform vec3 uFog;uniform float uDensity;vec3 fogMix(vec3 c,float d){float f=1.0-exp(-uDensity*uDensity*d*d);return mix(c,uFog,clamp(f,0.0,1.0));}`;
const CAUSTIC_GLSL=`float caustic(vec2 p,float t){vec2 q=p*.55;float c=0.0;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.7+t*.9+float(i)),cos(q.x*1.5-t*.7+float(i)*1.3));c+=abs(sin(q.x+q.y));}c=c/3.0;return pow(1.0-c,4.0)*2.4;}`;
{const g=new THREE.PlaneGeometry(190,190,240,240);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,ground(p.getX(i),p.getZ(i)));g.computeVertexNormals();
 const m=new THREE.ShaderMaterial({uniforms:uni,vertexShader:`varying vec3 vW;varying vec3 vN;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;vN=normal;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;uniform vec3 uSun;varying vec3 vW;varying vec3 vN;${FOG_GLSL}${CAUSTIC_GLSL}
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec3 n=normalize(vN);float rip=sin(vW.x*2.2+sin(vW.z*.7)*1.6)*.5+.5;rip=smoothstep(.2,.95,rip);
   vec3 sand=mix(vec3(.78,.71,.54),vec3(.88,.82,.66),rip);sand*=.93+.07*sin(vW.x*9.1+sin(vW.z*7.3))*sin(vW.z*8.7+sin(vW.x*6.1));sand*=.95+.1*h(floor(vW.xz*60.0));
   float patchy=smoothstep(.2,.8,sin(vW.x*.13)*sin(vW.z*.11)*.5+.5);sand=mix(sand,vec3(.62,.64,.5),patchy*.25);
   float lit=.45+.55*max(dot(n,uSun),0.0);vec3 c=sand*lit*vec3(.72,.92,1.0);c+=caustic(vW.xz,uTime)*vec3(.55,.8,.85)*.5;
   gl_FragColor=vec4(fogMix(c,distance(vW,cameraPosition)),1.0);}`});
 scene.add(new THREE.Mesh(g,m));}

// --- Herbier : 25 000 brins qui ondulent et s’écartent au passage du plongeur -------------
const BLADES=25000;let grassMesh=null;
{const seg=4,pos=[],idx=[];for(let i=0;i<=seg;i++){const y=i/seg,w=.055*(1-y*.85);pos.push(-w,y,0,w,y,0);if(i<seg){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);
 const mat=new THREE.ShaderMaterial({uniforms:uni,side:THREE.DoubleSide,
  vertexShader:`uniform float uTime;uniform vec3 uDiver;varying float vY;varying vec3 vW;varying float vTone;
  void main(){vec4 base=instanceMatrix*vec4(0.0,0.0,0.0,1.0);float hgt=length(instanceMatrix[1].xyz);vec4 w=modelMatrix*instanceMatrix*vec4(position,1.0);vY=position.y;vTone=fract(base.x*.37+base.z*.71);
   float k=position.y*position.y;w.x+=sin(uTime*1.3+base.x*.35+base.z*.22)*.32*k*hgt+sin(uTime*3.1+base.z)*.05*k;w.z+=cos(uTime*1.1+base.z*.3)*.2*k*hgt;
   vec3 d=w.xyz-uDiver;d.y=0.0;float dl=length(d);float push=smoothstep(1.9,0.2,dl)*k*1.1;w.xz+=normalize(d.xz+1e-4)*push;w.y-=push*.4;
   vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;varying float vY;varying vec3 vW;varying float vTone;${FOG_GLSL}${CAUSTIC_GLSL}
  void main(){vec3 lo=mix(vec3(.08,.25,.16),vec3(.12,.3,.12),vTone),hi=mix(vec3(.45,.72,.34),vec3(.62,.74,.3),vTone);vec3 c=mix(lo,hi,vY);c+=caustic(vW.xz,uTime)*.12*vY;gl_FragColor=vec4(fogMix(c,distance(vW,cameraPosition)),1.0);}`});
 const mesh=new THREE.InstancedMesh(geo,mat,BLADES),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),s=new THREE.Vector3(),v=new THREE.Vector3();
 const patches=[];for(let i=0;i<34;i++)patches.push([Math.random()*120-60,Math.random()*120-60,4+Math.random()*9]);
 for(let i=0;i<BLADES;i++){const pc=patches[i%patches.length],a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*pc[2],x=pc[0]+Math.cos(a)*r,z=pc[1]+Math.sin(a)*r,hh=.5+Math.random()*1.3*(1-r/pc[2]*.6);
  e.set(0,Math.random()*Math.PI,(Math.random()-.5)*.3);q.setFromEuler(e);s.set(1+Math.random()*.6,hh,1);v.set(x,ground(x,z)-.05,z);m.compose(v,q,s);mesh.setMatrixAt(i,m);}
 mesh.frustumCulled=false;scene.add(mesh);grassMesh=mesh;}

// --- Décor : rochers, coraux, épave, amphores, éponges ----------------------------------
// Static props are baked into a few merged meshes: hundreds of small parts, a handful of draw calls.
const buckets=new Map();
function bake(geo,mat,matrix){const g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(matrix);if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(g);}
function flushBake(){for(const [mat,list] of buckets){let n=0;for(const g of list)n+=g.attributes.position.count;const pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;
 for(const g of list){pos.set(g.attributes.position.array,o*3);if(!g.attributes.normal)g.computeVertexNormals();nor.set(g.attributes.normal.array,o*3);o+=g.attributes.position.count;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.computeBoundingSphere();scene.add(new THREE.Mesh(geo,mat));}buckets.clear();}
const _o=new THREE.Object3D();const at=(x,y,z,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>{_o.position.set(x,y,z);_o.rotation.set(rx,ry,rz);_o.scale.set(sx,sy,sz);_o.updateMatrix();return _o.matrix.clone();};
const rockMat=new THREE.MeshStandardMaterial({color:0x5d6b62,roughness:.95,flatShading:true});
function rock(x,z,s){const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const k=1+Math.sin(p.getX(i)*3.1+x)*.18+Math.cos(p.getZ(i)*2.7+z)*.18;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.7,p.getZ(i)*k);}g.computeVertexNormals();
 bake(g,rockMat,at(x,ground(x,z)+s*.2,z,0,x*z,0,s));}
for(let i=0;i<70;i++){const x=Math.random()*140-70,z=Math.random()*140-70;if(Math.hypot(x,z-8)>6)rock(x,z,.4+Math.random()*1.8);}
const coralCols=[0xff7a59,0xf2668b,0xb07cff,0xffc15e,0x5fd4c4];
const coralMats=coralCols.map(col=>new THREE.MeshStandardMaterial({color:col,roughness:.8,emissive:col,emissiveIntensity:.08}));
function coral(x,z){const mat=coralMats[Math.floor(Math.random()*coralMats.length)],base=at(x,ground(x,z)-.05,z,0,Math.random()*6,0,.8+Math.random()*1.2),q=new THREE.Quaternion(),m=new THREE.Matrix4();
 const branch=(o,dir,len,r,depth)=>{q.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);m.compose(o.clone().addScaledVector(dir,len/2),q,new THREE.Vector3(1,1,1));bake(new THREE.CylinderGeometry(r*.7,r,len,6),mat,base.clone().multiply(m));
  const end=o.clone().addScaledVector(dir,len);if(depth>0)for(let k=0;k<2;k++){const nd=dir.clone().add(new THREE.Vector3(Math.random()-.5,.3,Math.random()-.5).multiplyScalar(1.1)).normalize();branch(end,nd,len*.75,r*.7,depth-1);}else{m.makeTranslation(end.x,end.y,end.z);bake(new THREE.SphereGeometry(r*1.1,6,5),mat,base.clone().multiply(m));}};
 for(let k=0;k<3;k++)branch(new THREE.Vector3(),new THREE.Vector3(Math.random()-.5,1,Math.random()-.5).normalize(),.5+Math.random()*.4,.07,2);}
for(let i=0;i<46;i++){const a=Math.random()*Math.PI*2,r=8+Math.random()*60;coral(Math.cos(a)*r,Math.sin(a)*r);}
const spongeMat=new THREE.MeshStandardMaterial({color:0xd99a3e,roughness:1,side:THREE.DoubleSide});
for(let i=0;i<30;i++){const x=Math.random()*130-65,z=Math.random()*130-65;bake(new THREE.CylinderGeometry(.25,.18,.6,7,1,true),spongeMat,at(x,ground(x,z)+.25,z));}
const terracotta=new THREE.MeshStandardMaterial({color:0xb5643c,roughness:.85});
function amphoraGeo(){const pts=[[0,0],[.08,.02],[.16,.12],[.22,.35],[.24,.55],[.2,.75],[.1,.86],[.07,.95],[.09,1.05],[.08,1.07]].map(([x,y])=>new THREE.Vector2(x,y));return new THREE.LatheGeometry(pts,14);}
const AMPH=amphoraGeo();
function amphora(x,z,lying){bake(AMPH,terracotta,lying?at(x,ground(x,z)+.25,z,0,Math.random()*6,Math.PI/2*.95,1.3):at(x,ground(x,z),z,0,0,0,1.3));}
// The wreck: a keel, curved ribs, loose planks, a fallen mast and its cargo of amphorae.
const wood=new THREE.MeshStandardMaterial({color:0x4d3a28,roughness:.95}),woodD=new THREE.MeshStandardMaterial({color:0x33271c,roughness:1});
const WRECK=new THREE.Vector3(-4,0,-22);
{const grp=new THREE.Group();const keel=new THREE.Mesh(new THREE.BoxGeometry(.5,.4,14),woodD);keel.position.y=.2;grp.add(keel);
 for(let i=0;i<9;i++){const z=-6+i*1.5,r=2.2-Math.abs(i-4)*.15,rib=new THREE.Mesh(new THREE.TorusGeometry(r,.12,5,12,Math.PI*(.55+Math.random()*.4)),wood);rib.position.set(0,r*.55,z);rib.rotation.z=Math.PI+(.2-Math.random()*.4);grp.add(rib);}
 for(let i=0;i<12;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.3,.06,2+Math.random()*2),wood);p.position.set(Math.random()*6-3,.1,Math.random()*14-7);p.rotation.y=Math.random()-.5;grp.add(p);}
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.14,.18,9,8),woodD);mast.rotation.z=Math.PI/2*.92;mast.rotation.y=.6;mast.position.set(3,.5,2);grp.add(mast);
 grp.position.set(WRECK.x,ground(WRECK.x,WRECK.z)-.3,WRECK.z);grp.rotation.y=.4;scene.add(grp);
 for(let i=0;i<16;i++){const a=Math.random()*6,r=1+Math.random()*6;amphora(WRECK.x+Math.cos(a)*r,WRECK.z+Math.sin(a)*r,Math.random()<.6);}flushBake();}

// --- Surface, bateau, ligne de vie ----------------------------------------------------
const START=new THREE.Vector3(2,0,10);
{const m=new THREE.ShaderMaterial({uniforms:uni,side:THREE.DoubleSide,transparent:true,depthWrite:false,vertexShader:`varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uTime;varying vec3 vW;${CAUSTIC_GLSL}void main(){float d=distance(vW.xz,cameraPosition.xz);float c=caustic(vW.xz*.6,uTime*1.4);vec3 col=mix(vec3(.55,.9,.95),vec3(.1,.45,.55),smoothstep(10.0,70.0,d));col+=c*.25;gl_FragColor=vec4(col,1.0-smoothstep(40.0,120.0,d)*.7);}`});
 const s=new THREE.Mesh(new THREE.PlaneGeometry(400,400,1,1),m);s.rotation.x=-Math.PI/2;s.position.y=SURF;scene.add(s);
 const hull=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,9,12,1,false,0,Math.PI),new THREE.MeshStandardMaterial({color:0x201810,roughness:1}));hull.rotation.x=Math.PI/2;hull.rotation.z=Math.PI;hull.position.set(START.x,SURF-.1,START.z+2);scene.add(hull);}
const ROPE_BASE=new THREE.Vector3(START.x+.6,ground(START.x+.6,START.z)+.1,START.z);
{const len=SURF-ROPE_BASE.y,rope=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,len,5),new THREE.MeshStandardMaterial({color:0xcbb68a,roughness:1}));rope.position.set(ROPE_BASE.x,ROPE_BASE.y+len/2,ROPE_BASE.z);scene.add(rope);
 const iron=new THREE.MeshStandardMaterial({color:0x6b5a4a,metalness:.5,roughness:.7}),anchor=new THREE.Group();anchor.add(new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.2,6),iron));const arm=new THREE.Mesh(new THREE.TorusGeometry(.45,.06,5,10,Math.PI),iron);arm.rotation.z=Math.PI;arm.position.y=-.45;anchor.add(arm);
 anchor.position.copy(ROPE_BASE).add(new THREE.Vector3(0,.55,0));anchor.rotation.z=.12;scene.add(anchor);
 const lamp=new THREE.PointLight(0xffe6a0,6,9,2);lamp.position.copy(ROPE_BASE).add(new THREE.Vector3(0,1.5,0));scene.add(lamp);}

// --- Rayons de lumière et neige marine ------------------------------------------------
const rays=[];{const m=new THREE.ShaderMaterial({uniforms:uni,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,vertexShader:`varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform float uTime;varying vec2 vU;void main(){float a=smoothstep(0.0,.5,vU.y)*smoothstep(1.0,.6,vU.y)*(1.0-abs(vU.x-.5)*2.0);a*=.10+.05*sin(uTime*.5+vU.y*6.0);gl_FragColor=vec4(.75,.95,1.0,a);}`});
 for(let i=0;i<14;i++){const r=new THREE.Mesh(new THREE.PlaneGeometry(2.5+Math.random()*4,34),m);r.position.set(Math.random()*90-45,SURF-15,Math.random()*90-45);r.rotation.z=.18;r.userData.p=Math.random()*6;scene.add(r);rays.push(r);}}
{const n=5000,pos=new Float32Array(n*3);for(let i=0;i<n*3;i++)pos[i]=(Math.random()-.5)*40;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const m=new THREE.ShaderMaterial({uniforms:uni,transparent:true,depthWrite:false,vertexShader:`uniform float uTime;varying float vA;void main(){vec3 p=position;p.y-=uTime*.15;p.x+=sin(uTime*.3+p.z)*.3;p=mod(p-cameraPosition+20.0,40.0)-20.0+cameraPosition;vec4 mv=viewMatrix*vec4(p,1.0);gl_PointSize=clamp(40.0/-mv.z,1.0,4.0);vA=clamp(1.0-(-mv.z)/28.0,0.0,1.0);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vA;void main(){vec2 c=gl_PointCoord-.5;if(dot(c,c)>.25)discard;gl_FragColor=vec4(.85,.95,.95,vA*.55);}`});
 const pts=new THREE.Points(g,m);pts.frustumCulled=false;scene.add(pts);}

// --- 2 047 poissons en bancs -----------------------------------------------------------------
const FISH=2047;const fishSchools=[];
const fish=(()=>{const body=new THREE.SphereGeometry(.5,9,6).toNonIndexed();const p=body.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i),p.getY(i)*.36,p.getZ(i)*.16);
 const tail=[-.45,0,0,-.8,.2,0,-.8,-.2,0,-.45,0,0,-.8,-.2,0,-.8,.2,0];const all=new Float32Array(p.array.length+tail.length);all.set(p.array);all.set(tail,p.array.length);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(all,3));g.computeVertexNormals();
 const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.35,metalness:.45,side:THREE.DoubleSide});
 mat.onBeforeCompile=sh=>{sh.uniforms.uTime=uni.uTime;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat sw=sin(uTime*11.0+float(gl_InstanceID)*1.7-position.x*6.0);transformed.z+=sw*.14*smoothstep(.25,-.8,position.x);`);};
 const mesh=new THREE.InstancedMesh(g,mat,FISH);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
 const cols=[[0x9fb6c8,0xdfe9f2],[0x6a8fb0,0xbcd3e6],[0xf2c14e,0xfff0b3],[0xe86a5a,0xffb3a1],[0x5fb6d4,0xb8ecf7]];
 const sizes=[520,420,380,300,200,120,60,30,15,2];let k=0;
 sizes.forEach((n,si)=>{const big=n<=30,sch={n,start:k,c:new THREE.Vector3(Math.random()*80-40,4+Math.random()*9,Math.random()*80-40),rx:14+Math.random()*22,rz:12+Math.random()*22,w:(.05+Math.random()*.05)*(big?.6:1)*(Math.random()<.5?-1:1),ph:Math.random()*6,spread:big?2.5:1.2+n/260,size:big?1.6+Math.random():.35+Math.random()*.2,off:[]};
  const pal=cols[si%cols.length];for(let i=0;i<n;i++){const a=Math.random()*6.28,b=Math.acos(Math.random()*2-1),r=Math.cbrt(Math.random())*sch.spread*2;sch.off.push([Math.sin(b)*Math.cos(a)*r,Math.cos(b)*r*.5,Math.sin(b)*Math.sin(a)*r,Math.random()*6.28,.85+Math.random()*.3,new THREE.Vector3()]);
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
const brass=new THREE.MeshStandardMaterial({color:0xb8793a,metalness:.85,roughness:.32}),suitM=new THREE.MeshStandardMaterial({color:0x8d6b3c,roughness:.95}),glass=new THREE.MeshStandardMaterial({color:0x10222a,metalness:.2,roughness:.05}),darkM=new THREE.MeshStandardMaterial({color:0x2a211a,roughness:.8});
const diver=new THREE.Group(),rig={};
{const helmet=new THREE.Mesh(new THREE.SphereGeometry(.3,20,16),brass);helmet.position.y=1.62;diver.add(helmet);rig.helmet=helmet;
 const port=(x,y,z,r,rot)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.035,8,18),brass),g2=new THREE.Mesh(new THREE.CircleGeometry(r,18),glass);const grp=new THREE.Group();grp.add(ring,g2);grp.position.set(x,y,z);grp.rotation.y=rot;helmet.add(grp);};
 port(0,0,.28,.13,0);port(.27,0,.08,.08,Math.PI/2*.9);port(-.27,0,.08,.08,-Math.PI/2*.9);
 const collar=new THREE.Mesh(new THREE.CylinderGeometry(.34,.4,.16,18),brass);collar.position.y=1.38;diver.add(collar);
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.27,.5,6,12),suitM);torso.position.y=1.02;diver.add(torso);
 const belt=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.08,14),darkM);belt.position.y=.82;diver.add(belt);
 const pack=new THREE.Mesh(new THREE.BoxGeometry(.4,.45,.18),brass);pack.position.set(0,1.1,-.3);diver.add(pack);
 const limb=(x,y,len,r,mat,foot)=>{const pivot=new THREE.Group();pivot.position.set(x,y,0);const l=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,5,8),mat);l.position.y=-len/2-r*.4;pivot.add(l);
  if(foot){const b=new THREE.Mesh(new THREE.BoxGeometry(.2,.13,.34),darkM);b.position.set(0,-len-r*1.4,.06);pivot.add(b);}else{const h=new THREE.Mesh(new THREE.SphereGeometry(r*1.2,8,6),darkM);h.position.y=-len-r;pivot.add(h);}diver.add(pivot);return pivot;};
 rig.armL=limb(-.34,1.26,.42,.08,suitM);rig.armR=limb(.34,1.26,.42,.08,suitM);rig.legL=limb(-.13,.74,.5,.1,suitM,true);rig.legR=limb(.13,.74,.5,.1,suitM,true);
 const brush=new THREE.Group();const handle=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.3,6),new THREE.MeshStandardMaterial({color:0x8a5a2b}));const bristles=new THREE.Mesh(new THREE.BoxGeometry(.07,.08,.03),new THREE.MeshStandardMaterial({color:0xe0cf9a}));bristles.position.y=-.18;brush.add(handle,bristles);brush.position.y=-.62;brush.rotation.x=.4;rig.armR.add(brush);
 const lamp=new THREE.SpotLight(0xfff0c8,9,16,.5,.6,1.4);lamp.position.set(0,1.62,.3);lamp.target.position.set(0,.5,4);diver.add(lamp,lamp.target);rig.lamp=lamp;}
diver.position.set(START.x,ground(START.x,START.z),START.z+1.5);scene.add(diver);
// The air hose from the helmet to the boat, recomputed as a sagging curve.
const hoseGeo=new THREE.BufferGeometry(),HOSE_N=40;hoseGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(HOSE_N*3),3));const hose=new THREE.Line(hoseGeo,new THREE.LineBasicMaterial({color:0x2a2622}));hose.frustumCulled=false;scene.add(hose);
function updateHose(){const a=_p.set(0,1.75,-.25).applyMatrix4(diver.matrixWorld).clone(),b=new THREE.Vector3(START.x,SURF,START.z+1),arr=hoseGeo.attributes.position.array;
 for(let i=0;i<HOSE_N;i++){const t=i/(HOSE_N-1);const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*Math.min(6,a.distanceTo(b)*.15);arr[i*3]=x;arr[i*3+1]=y;arr[i*3+2]=z;}hoseGeo.attributes.position.needsUpdate=true;}
// Bubbles from the helmet valve.
const BUB=80,bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshStandardMaterial({color:0xdff8ff,transparent:true,opacity:.6,metalness:.1,roughness:.05}),BUB);bubbles.frustumCulled=false;scene.add(bubbles);
const bubs=Array.from({length:BUB},()=>({p:new THREE.Vector3(0,-99,0),s:1,life:0}));let bubT=0,bubI=0;
function updateBubbles(dt){bubT-=dt;if(bubT<=0){bubT=.9+Math.random()*1.1;const src=_p.set(.18,1.8,-.1).applyMatrix4(diver.matrixWorld);for(let k=0;k<5+Math.random()*6;k++){const b=bubs[bubI++%BUB];b.p.copy(src).add(new THREE.Vector3(Math.random()*.15,Math.random()*.2,Math.random()*.15));b.s=.5+Math.random()*1.5;b.life=6;}sound.bubble();}
 for(let i=0;i<BUB;i++){const b=bubs[i];if(b.life>0){b.life-=dt;b.p.y+=dt*(1.2+b.s*.4);b.p.x+=Math.sin(b.life*6+i)*dt*.2;if(b.p.y>SURF)b.life=0;}_m.makeScale(b.s,b.s,b.s).setPosition(b.life>0?b.p:_p.set(0,-99,0));bubbles.setMatrixAt(i,_m);}bubbles.instanceMatrix.needsUpdate=true;}

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
const moundMat=new THREE.MeshStandardMaterial({color:0xcdbd92,roughness:1});
const glintMat=new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const k=c.getContext('2d'),gr=k.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,250,220,1)');gr.addColorStop(.25,'rgba(255,230,150,.6)');gr.addColorStop(1,'rgba(255,230,150,0)');k.fillStyle=gr;k.fillRect(0,0,64,64);k.fillStyle='rgba(255,255,255,.9)';k.fillRect(30,4,4,56);k.fillRect(4,30,56,4);return new THREE.CanvasTexture(c);})(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
for(const it of ITEMS){const [x,z]=it.at,y=ground(x,z);it.pos=new THREE.Vector3(x,y,z);it.obj=it.build();it.obj.position.set(x,y-.25,z);it.obj.rotation.y=Math.random()*6;it.obj.rotation.z=.35;scene.add(it.obj);
 it.mound=new THREE.Mesh(new THREE.SphereGeometry(.9,16,10,0,Math.PI*2,0,Math.PI/2),moundMat);it.mound.scale.set(1,.45,1);it.mound.position.set(x,y-.05,z);scene.add(it.mound);
 it.glint=new THREE.Sprite(glintMat);it.glint.scale.setScalar(.6);it.glint.position.set(x+.2,y+.35,z);scene.add(it.glint);it.dig=0;it.found=false;}
const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,30,16,1,true),new THREE.MeshBasicMaterial({color:0x9ff3ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));scene.add(beacon);
const pingRing=new THREE.Mesh(new THREE.TorusGeometry(1,.04,6,48),new THREE.MeshBasicMaterial({color:0x9ff3ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));pingRing.rotation.x=Math.PI/2;scene.add(pingRing);
// Sand kicked up by the brush.
const DUST=240,dust=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshStandardMaterial({color:0xd9c89c,roughness:1,transparent:true,opacity:.8}),DUST);dust.frustumCulled=false;scene.add(dust);
const dusts=Array.from({length:DUST},()=>({p:new THREE.Vector3(0,-99,0),v:new THREE.Vector3(),life:0}));let dustI=0;
function puff(at,n){for(let k=0;k<n;k++){const d=dusts[dustI++%DUST];d.p.copy(at).add(new THREE.Vector3(Math.random()-.5,.1,Math.random()-.5).multiplyScalar(.8));d.v.set(Math.random()-.5,.4+Math.random()*.8,Math.random()-.5);d.life=1.6+Math.random();}}
function updateDust(dt){for(let i=0;i<DUST;i++){const d=dusts[i];if(d.life>0){d.life-=dt;d.v.multiplyScalar(1-dt*1.2);d.v.y-=dt*.15;d.p.addScaledVector(d.v,dt);}const s=d.life>0?Math.min(1,d.life):0;_m.makeScale(s,s,s).setPosition(d.life>0?d.p:_p.set(0,-99,0));dust.setMatrixAt(i,_m);}dust.instanceMatrix.needsUpdate=true;}

// --- Son --------------------------------------------------------------------------------------
const sound=(()=>{let ac=null,muted=false,amb=null;const api={};
 const noiseBuf=s=>{const b=ac.createBuffer(1,ac.sampleRate*s,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;l=(l+w*.02)/1.02;d[i]=l*3.5;}return b;};
 api.start=()=>{if(ac||muted)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ac=new C();const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf(4);s.loop=true;f.type='lowpass';f.frequency.value=380;g.gain.value=.5;s.connect(f).connect(g).connect(ac.destination);s.start();amb=g;};
 const tone=(f0,f1,dur,vol,type='sine',delay=0)=>{if(!ac||muted)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur+.05);};
 const hiss=(dur,vol,freq,q=1,delay=0)=>{if(!ac||muted)return;const t=ac.currentTime+delay,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf(dur+.1);f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f).connect(g).connect(ac.destination);s.start(t);};
 api.bubble=()=>{for(let k=0;k<4;k++)tone(300+Math.random()*500,900+Math.random()*700,.07,.025,'sine',k*.06+Math.random()*.05);};
 api.ping=()=>{for(let k=0;k<4;k++)tone(1350,1300,.9,.12/(k+1),'sine',k*.32);};
 api.brush=()=>hiss(.12,.25,2600,2);api.found=()=>{[523,659,784,1046].forEach((f,k)=>tone(f,f,.8,.07,'triangle',k*.11));};
 api.heart=()=>{tone(70,45,.15,.3);tone(70,45,.15,.22,'sine',.22);};
 api.toggle=()=>{muted=!muted;if(ac){amb.gain.value=muted?0:.5;}return muted;};return api;})();

// --- Commandes et caméra ------------------------------------------------------------------
const keys={};let yaw=Math.PI,pitch=.25,dist=5.2,drag=null;
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;keys[e.code]=true;
 if(state.mode==='title'&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();dive();return;}
 if(e.code==='KeyR'&&state.mode==='play')sonar();if(e.code==='KeyJ')toggleJournal();if(e.code==='Escape'&&state.mode==='play'){state.paused=!state.paused;$('abyss-pause').hidden=!state.paused;}
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>{keys[e.code]=false;});addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);sound.start();});
canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(-.35,Math.min(1.1,pitch+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',()=>{drag=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(2.6,Math.min(10,dist*(1+Math.sign(e.deltaY)*.1)));},{passive:false});
const touch={};for(const b of document.querySelectorAll('[data-touch]')){b.onpointerdown=e=>{e.preventDefault();touch[b.dataset.touch]=true;if(b.dataset.touch==='sonar')sonar();};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>{touch[b.dataset.touch]=false;};}
const down=(...c)=>c.some(k=>keys[k]);

// --- État du jeu -----------------------------------------------------------------------------
const state={mode:'title',paused:false,air:1,vel:new THREE.Vector3(),onGround:true,time:0,dives:1,sonarCd:0,sonarT:0,sonarTarget:null,found:0,heartT:0,near:null,faceYaw:Math.PI,endT:0};
function dive(){if(state.mode!=='title')return;sound.start();state.mode='play';$('abyss-title').hidden=true;$('abyss-hud').hidden=false;canvas.focus();}
$('abyss-dive').onclick=dive;$('abyss-again').onclick=()=>location.reload();$('abyss-sound').onclick=e=>{e.target.textContent=sound.toggle()?'Son : non':'Son : oui';};$('abyss-journal-btn').onclick=toggleJournal;$('card-close').onclick=()=>{$('abyss-card').hidden=true;};
function toggleJournal(){const j=$('abyss-journal');j.hidden=!j.hidden;if(!j.hidden)renderJournal();}
function renderJournal(){const list=$('journal-list');list.replaceChildren();for(const it of ITEMS){const li=document.createElement('li');li.className=it.found?'got':'';li.innerHTML=it.found?`<b>${it.name}</b><small>${it.era}</small>`:'<b>???</b><small>Encore enfoui quelque part</small>';list.append(li);}}
function sonar(){if(state.sonarCd>0||state.mode!=='play')return;state.sonarCd=3;state.sonarT=4.5;const left=ITEMS.filter(i=>!i.found);if(!left.length)return;
 state.sonarTarget=left.reduce((a,b)=>a.pos.distanceTo(diver.position)<b.pos.distanceTo(diver.position)?a:b);sound.ping();pingRing.position.copy(diver.position).add(new THREE.Vector3(0,.3,0));pingRing.userData.t=0;beacon.position.copy(state.sonarTarget.pos).add(new THREE.Vector3(0,15,0));beacon.userData.t=0;}
function discover(it){it.found=true;state.found++;sound.found();puff(it.pos,40);scene.remove(it.mound);it.glint.visible=false;
 $('card-name').textContent=it.name;$('card-era').textContent=it.era;$('card-text').textContent=it.text;$('card-count').textContent=`${state.found} / ${ITEMS.length} dans le carnet`;$('abyss-card').hidden=false;updateSlots();
 if(state.found===ITEMS.length){state.mode='ending';state.endT=0;}}
function updateSlots(){const s=$('abyss-slots');s.replaceChildren();for(const it of ITEMS){const i=document.createElement('i');if(it.found)i.className='on';s.append(i);}$('abyss-count').textContent=`${state.found} / ${ITEMS.length}`;}
updateSlots();
const fmtT=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

function stepPlay(dt){state.time+=dt;state.sonarCd-=dt;state.sonarT-=dt;
 const f=(down('KeyW','ArrowUp')||touch.fwd?1:0)-(down('KeyS','ArrowDown')||touch.back?1:0),r=(down('KeyD','ArrowRight')||touch.right?1:0)-(down('KeyA','ArrowLeft')||touch.left?1:0),up=(down('Space')||touch.up?1:0)-(down('ShiftLeft','ShiftRight','KeyC')||touch.down?1:0);
 const gy=ground(diver.position.x,diver.position.z);state.onGround=diver.position.y<=gy+.05;
 const speed=state.onGround&&up<=0?2:3.4,fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
 const want=new THREE.Vector3((fx*f+rx*r)*speed,up>0?2.2:up<0?-2.4:-.45,(fz*f+rz*r)*speed);if(state.onGround&&up===0)want.y=0;
 state.vel.lerp(want,Math.min(1,dt*2.2));diver.position.addScaledVector(state.vel,dt);
 diver.position.x=THREE.MathUtils.clamp(diver.position.x,-EDGE,EDGE);diver.position.z=THREE.MathUtils.clamp(diver.position.z,-EDGE,EDGE);
 const g2=ground(diver.position.x,diver.position.z);if(diver.position.y<g2){diver.position.y=g2;state.vel.y=Math.max(0,state.vel.y);}if(diver.position.y>SURF-2.2){diver.position.y=SURF-2.2;state.vel.y=Math.min(0,state.vel.y);}
 const hv=Math.hypot(state.vel.x,state.vel.z);if(hv>.2){const target=Math.atan2(state.vel.x,state.vel.z);let d=target-state.faceYaw;d=Math.atan2(Math.sin(d),Math.cos(d));state.faceYaw+=d*Math.min(1,dt*5);}
 diver.rotation.y=state.faceYaw;const swim=!state.onGround;diver.rotation.x=THREE.MathUtils.lerp(diver.rotation.x,swim?Math.min(.9,hv*.3):0,dt*3);
 // limbs: flutter kicks and breast strokes in the water, a heavy walk on the sand
 const t=state.time,step=hv*2.6;if(swim){rig.legL.rotation.x=Math.sin(t*6)*.5;rig.legR.rotation.x=-Math.sin(t*6)*.5;rig.armL.rotation.x=-1.2+Math.sin(t*2.4)*.6;rig.armR.rotation.x=-1.2+Math.sin(t*2.4)*.6;rig.armL.rotation.z=-.4-Math.cos(t*2.4)*.4;rig.armR.rotation.z=.4+Math.cos(t*2.4)*.4;}
 else{const s=Math.sin(t*step*1.4)*Math.min(.6,hv*.35);rig.legL.rotation.x=s;rig.legR.rotation.x=-s;rig.armL.rotation.x=-s*.8;rig.armR.rotation.x=s*.8;rig.armL.rotation.z=-.15;rig.armR.rotation.z=.15;}
 // air: surface-supplied by the hose, but the compressor on the boat only has so much; refill at the anchor line
 const nearRope=Math.hypot(diver.position.x-ROPE_BASE.x,diver.position.z-ROPE_BASE.z)<3;state.air=Math.min(1,Math.max(0,state.air+(nearRope?.25:-1/240)*dt));$('abyss-rope').hidden=!nearRope||state.air>=.999;
 if(state.air<.2){state.heartT-=dt;if(state.heartT<=0){state.heartT=.9;sound.heart();}}
 if(state.air<=0){state.dives++;state.air=1;diver.position.set(START.x,ground(START.x,START.z),START.z+1.5);state.vel.set(0,0,0);$('abyss-flash').classList.remove('go');void $('abyss-flash').offsetWidth;$('abyss-flash').classList.add('go');}
 // digging
 state.near=null;for(const it of ITEMS){if(it.found)continue;if(it.pos.distanceTo(diver.position)<2.4){state.near=it;break;}}
 if(state.near&&(down('KeyE')||touch.brush)){const it=state.near;it.dig=Math.min(1,it.dig+dt/2.6);rig.armR.rotation.x=-.9+Math.sin(t*18)*.35;if(Math.random()<.5)puff(it.pos,2);if(Math.floor(t*8)!==Math.floor((t-dt)*8))sound.brush();
  it.mound.scale.set(1-it.dig*.4,.45*(1-it.dig),1-it.dig*.4);it.obj.position.y=it.pos.y-.25+it.dig*.55;it.obj.rotation.z=.35*(1-it.dig);if(it.dig>=1)discover(it);}
 const pr=$('abyss-prompt');if(state.near){pr.hidden=false;pr.querySelector('span').textContent=state.near.dig>0?`Dégager au pinceau : ${Math.round(state.near.dig*100)} %`:'Maintenir E pour dégager au pinceau';pr.querySelector('i').style.width=state.near.dig*100+'%';}else pr.hidden=true;
 uni.uDiver.value.copy(diver.position);}
const camTarget=new THREE.Vector3(),camPos=new THREE.Vector3();
function placeCamera(dt,snap){camTarget.copy(diver.position).add(_p.set(0,1.3,0));const cp=Math.cos(pitch);camPos.set(camTarget.x+Math.sin(yaw)*dist*cp,camTarget.y+Math.sin(pitch)*dist,camTarget.z+Math.cos(yaw)*dist*cp);
 const gy=ground(camPos.x,camPos.z)+.5;if(camPos.y<gy)camPos.y=gy;if(camPos.y>SURF-.4)camPos.y=SURF-.4;if(snap)camera.position.copy(camPos);else camera.position.lerp(camPos,Math.min(1,dt*6));camera.lookAt(camTarget);}
function hud(){const a=state.air,deg=a*360;$('air-ring').style.background=`conic-gradient(${a<.2?'#ff6b74':'#ffe8b0'} ${deg}deg, rgba(255,255,255,.12) 0)`;$('air-time').textContent=fmtT(a*240);$('abyss-depth').textContent=`${Math.max(0,SURF-diver.position.y).toFixed(1).replace('.',',')} m`;$('abyss-hud').classList.toggle('low',a<.2);
 const arrow=$('abyss-sonar');if(state.sonarT>0&&state.sonarTarget&&!state.sonarTarget.found){arrow.hidden=false;const d=state.sonarTarget.pos.clone().sub(diver.position),fw=d.x*-Math.sin(yaw)+d.z*-Math.cos(yaw),rt=d.x*Math.cos(yaw)+d.z*-Math.sin(yaw);arrow.querySelector('b').style.transform=`rotate(${Math.atan2(rt,fw)}rad)`;arrow.querySelector('span').textContent=`${Math.round(Math.hypot(d.x,d.z))} m`;}else arrow.hidden=true;}
let last=performance.now(),perfT=0,perfN=0,quality=0;
function degrade(){if(quality>=3)return;quality++;if(quality===1){grassMesh.count=12000;fish.count=1100;}else if(quality===2){pixelRatio=Math.max(.75,pixelRatio-.35);renderer.setPixelRatio(pixelRatio);resize();}else{grassMesh.count=5000;fish.count=500;}}
if(new URLSearchParams(location.search).has('lite')){quality=2;degrade();grassMesh.count=3000;fish.count=300;}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!state.paused){uni.uTime.value+=dt;
 if(state.mode==='play')stepPlay(dt);
 if(state.mode==='title'){yaw+=dt*.08;pitch=.3;}
 if(state.mode==='ending'){state.endT+=dt;if(state.endT>2.5){diver.position.y+=dt*2.2;state.vel.set(0,0,0);rig.legL.rotation.x=Math.sin(uni.uTime.value*6)*.5;rig.legR.rotation.x=-rig.legL.rotation.x;}if(state.endT>3.2&&$('abyss-end').hidden){$('abyss-end').hidden=false;$('end-summary').textContent=`Les huit babioles sont au carnet en ${fmtT(state.time)}, avec ${state.dives} plongée${state.dives>1?'s':''}. Le musée le plus absurde de la Méditerranée ouvre ses portes.`;}}
 updateFish(uni.uTime.value,diver.position);updateBubbles(dt);updateDust(dt);
 for(const r of rays){r.lookAt(camera.position.x,r.position.y,camera.position.z);r.material.opacity=1;}
 for(const it of ITEMS){if(!it.found){it.glint.material.rotation=uni.uTime.value;it.glint.scale.setScalar(.35+.25*Math.max(0,Math.sin(uni.uTime.value*2+it.pos.x)));}else{it.obj.rotation.y+=dt*.6;it.obj.position.y=it.pos.y+.4+Math.sin(uni.uTime.value*1.5)*.08;}}
 if(pingRing.userData.t!==undefined){pingRing.userData.t+=dt;const k=pingRing.userData.t;pingRing.scale.setScalar(1+k*14);pingRing.material.opacity=Math.max(0,.8-k*.5);}
 if(beacon.userData.t!==undefined){beacon.userData.t+=dt;beacon.material.opacity=Math.max(0,.35*Math.sin(Math.min(1,beacon.userData.t/4.5)*Math.PI));}
 diver.updateMatrixWorld();updateHose();placeCamera(dt,false);if(state.mode!=='title')hud();}
 renderer.render(scene,camera);
 // Adaptive quality: on a slow machine, fewer grass blades and fish, then a lower resolution.
 perfT+=Math.min(dt,.5);perfN++;if(perfT>2){if(perfT/perfN>.03)degrade();perfT=perfN=0;}
 requestAnimationFrame(frame);}
function resize(){const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);resize();placeCamera(0,true);requestAnimationFrame(frame);
window.AbyssGame={state,ITEMS,diver,discover,sonar,dive};
// Test hook (?shot=item,found,swim,sonar): stage a scene without waiting for input, for automated screenshots.
{const q=new URLSearchParams(location.search).get('shot');if(q){const [item,found,swim,son]=q.split(',').map(Number);dive();const it=ITEMS[item||0];diver.position.set(it.pos.x-1.5,it.pos.y+(swim||0),it.pos.z+1);for(let i=0;i<(found||0);i++)discover(ITEMS[i]);if(son)sonar();diver.updateMatrixWorld();placeCamera(0,true);}}

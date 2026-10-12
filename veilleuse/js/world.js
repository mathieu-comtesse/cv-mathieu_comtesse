import * as THREE from 'three';
import {makeRegion,genProps,HALF,EXTRA,rimE,traceBeam,mirrorAngle} from './terrain.js';
import * as MD from './models.js';
import {stipple,BAYER_GLSL} from './render.js';
import {TINT} from './palettes.js';
import {fbm,smooth,lerp,clamp,vnoise} from './noise.js';

const col=(t,b=1)=>new THREE.Color().setRGB(t[0]*b,t[1]*b,t[2]*b);
const lumOf=c=>c[0]*.299+c[1]*.587+c[2]*.114;
const withLum=(t,l)=>{const k=l/lumOf(t);return [t[0]*k,t[1]*k,t[2]*k]};
const FOG={forest:[.34,'neutral'],crystal:[.27,'neutral'],shore:[.74,'accent']};
const CLOUD={forest:.1,crystal:.18,shore:.42};

// Construit tout ce qui compose une région : terrain, props instanciés, eau, lumières et objets interactifs.
export class World{
  constructor(id,{shadow=2048,detail=1}={}){
    this.R=makeRegion(id);this.id=id;this.props=genProps(this.R);this.env=this.R.env;
    this.scene=new THREE.Scene();this.stipples=[];this.timeU={value:0};this.emitters=[];this.interact=[];
    const fg=FOG[id],fc=withLum(TINT[fg[1]],fg[0]);
    this.scene.fog=new THREE.Fog(col(fc),this.env.fogNear,this.env.fogFar);this.scene.background=col(fc);
    this.buildLights(shadow);this.buildTerrain(detail);this.buildProps();this.buildGround();this.buildWater();this.buildObjects();this.buildPlayer();
  }
  stip(o){const m=stipple(o);this.stipples.push(m);return m}
  // ---------------------------------------------------------------- lumières
  buildLights(shadow){
    const e=this.env,s=this.scene;
    this.hemi=new THREE.HemisphereLight(0xffffff,0x9a9a9a,e.ambient*Math.PI);s.add(this.hemi);
    this.sun=new THREE.DirectionalLight(0xffffff,e.sun*Math.PI);
    this.sunDir=new THREE.Vector3(...e.sunDir).normalize();
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(shadow,shadow);
    const c=this.sun.shadow.camera;c.left=-62;c.right=62;c.top=62;c.bottom=-62;c.near=1;c.far=260;this.sun.shadow.bias=-.0006;this.sun.shadow.normalBias=.15;
    s.add(this.sun,this.sun.target);
    this.lantern=new THREE.PointLight(new THREE.Color().setRGB(1,.5,.18),0,22,1.7);s.add(this.lantern);
    this.pool=[0,1,2].map(()=>{const l=new THREE.PointLight(col(TINT.warm),0,30,1.3);s.add(l);return l});
  }
  // ---------------------------------------------------------------- terrain
  groundColor(x,z,h,ny){
    const id=this.id,R=this.R,n1=fbm(x*.045,z*.045,5,2),n2=fbm(x*.18,z*.18,9,2),slope=1-ny;
    let t,b;
    const mix=(a,c,w)=>[lerp(a[0],c[0],w),lerp(a[1],c[1],w),lerp(a[2],c[2],w)];
    if(id==='forest'){
      b=.5+.26*n1+.1*n2;t=TINT.neutral;
      const moss=smooth(.12,.3,fbm(x*.02,z*.02,33,3));t=mix(t,TINT.green,moss*(1-smooth(.2,.5,slope)));
      if(h<-.6){t=mix(t,TINT.green,.8);b*=.7}
      b*=1-.4*smooth(.25,.6,slope);
    }else if(id==='crystal'){
      b=.3+.26*n1+.12*n2;t=TINT.neutral;
      t=mix(t,TINT.green,smooth(.26,.38,fbm(x*.017,z*.017,44,3))*(1-smooth(.15,.4,slope)));
      t=mix(t,TINT.accent,smooth(.3,.5,slope));if(slope>.3)b=.72+.1*n2;
    }else{
      const blot=fbm(x*.008,z*.012,61,3),sand=1-smooth(.2,.55,slope+Math.max(0,h-6)*.1);
      b=(.74+.24*n1+.1*n2)*(.8+.5*blot);t=mix(TINT.neutral,TINT.warm,sand);
      t=mix(t,TINT.green,smooth(.3,.42,fbm(x*.015,z*.015,52,3))*smooth(1,2.4,h)*(1-smooth(.2,.5,slope)));
      if(h<-.3)b*=.82;if(h<-1.1)b*=.85;
    }
    const rim=smooth(366,440,rimE(x,z));
    if(rim>0){
      const alt=smooth(4,70,h);
      if(id==='forest'){t=mix(t,TINT.neutral,rim*.85);b=b*(1-.25*rim)+.3*alt}
      else if(id==='crystal'){t=mix(t,TINT.accent,rim*(.35+.6*smooth(.2,.6,slope)));b=b*(1-.25*rim)+.28*alt}
      else{t=mix(t,TINT.neutral,rim*.9);b=b*(1-.1*rim)+.3*alt}
    }
    return [t[0]*b,t[1]*b,t[2]*b];
  }
  buildTerrain(detail){
    const R=this.R,cell=2.5/detail,TS=95,TILES=Math.round(2*(HALF+EXTRA)/TS),ORG=-(HALF+EXTRA),seg=Math.round(TS/cell);
    const m=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
    const cloud=CLOUD[this.id],tu=this.timeU;
    m.onBeforeCompile=sh=>{
      sh.uniforms.uTime=tu;sh.uniforms.uCloud={value:cloud};
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vWp;uniform float uTime,uCloud;
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}`)
        .replace('#include <color_fragment>',`#include <color_fragment>
float cl=vn(vWp.xz*.011+vec2(uTime*.012,uTime*.004))*.65+vn(vWp.xz*.028-vec2(uTime*.007,0.))*.35;
diffuseColor.rgb*=mix(1.-uCloud,1.04,smoothstep(.32,.68,cl));`);
    };
    this.terrainMat=m;this.terrain=new THREE.Group();
    for(let ti=0;ti<TILES;ti++)for(let tj=0;tj<TILES;tj++){
      const x0=ORG+ti*TS,z0=ORG+tj*TS;
      const g=new THREE.PlaneGeometry(TS,TS,seg,seg);g.rotateX(-Math.PI/2);g.translate(x0+TS/2,0,z0+TS/2);
      const p=g.getAttribute('position'),cols=new Float32Array(p.count*3);
      for(let i=0;i<p.count;i++)p.setY(i,R.height(p.getX(i),p.getZ(i)));
      g.computeVertexNormals();const nrm=g.getAttribute('normal');
      for(let i=0;i<p.count;i++){const c=this.groundColor(p.getX(i),p.getZ(i),p.getY(i),nrm.getY(i));cols[i*3]=c[0];cols[i*3+1]=c[1];cols[i*3+2]=c[2]}
      g.setAttribute('color',new THREE.BufferAttribute(cols,3));g.computeBoundingSphere();
      const mesh=new THREE.Mesh(g,m);mesh.castShadow=true;mesh.receiveShadow=true;this.terrain.add(mesh);
    }
    this.scene.add(this.terrain);
  }
  // ---------------------------------------------------------------- props instanciés
  inst(geo,list,fn,{shadow=true}={}){
    if(!list.length)return null;
    const m=new THREE.MeshLambertMaterial({flatShading:true}),CH=95,groups=new Map();
    for(const it of list){const k=Math.floor((it.x+HALF)/CH)*100+Math.floor((it.z+HALF)/CH);(groups.get(k)||groups.set(k,[]).get(k)).push(it)}
    const mat=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3();
    for(const arr of groups.values()){
      const im=new THREE.InstancedMesh(geo,m,arr.length);
      arr.forEach((it,i)=>{const o=fn(it);e.set(o.rx||0,o.ry||0,o.rz||0);q.setFromEuler(e);v.set(it.x,this.R.height(it.x,it.z)+(o.dy||0),it.z);s.set(...o.s);
        mat.compose(v,q,s);im.setMatrixAt(i,mat);im.setColorAt(i,col(o.c))});
      im.castShadow=shadow;im.receiveShadow=true;im.computeBoundingSphere();im.boundingSphere.radius+=12;this.scene.add(im);
    }
  }
  buildProps(){
    const P=this.props,id=this.id,N=TINT.neutral,A=TINT.accent,G=TINT.green,W=TINT.warm;
    const r=(a=0,b=1)=>a+Math.random()*(b-a);
    const tint=(t,b)=>[t[0]*b,t[1]*b,t[2]*b];
    if(id==='forest'){
      this.inst(MD.tree(),P.trees,t=>({ry:t.rot,s:[t.s,t.s*(t.big?1.1:1),t.s],c:tint(N,t.big?.3:.2+((t.x*7.3+t.z*3.1)%1+1)%1*.14)}));
      this.inst(MD.rock(),P.rocks,t=>({ry:t.rot,s:[t.s,t.s*.7,t.s*.9],dy:-.1,c:tint(N,.34+((t.x*3)%.2+.2)*.5)}));
      this.inst(MD.slab(),P.slabs,t=>({ry:t.rot,rz:t.tilt,s:[t.w,t.h,t.d],dy:-1.5,c:tint(N,.5)}));
      this.inst(MD.bush(),P.bushes,t=>({s:[t.s*1.6,t.s,t.s*1.6],c:tint(G,.5+((t.x*5)%.3+.3)*.4)}),{shadow:false});
      if(P.arches.length)this.inst(MD.arch(),P.arches,t=>({ry:t.rot,s:[1,1,1],dy:-.4,c:tint(N,.46)}));
    }else if(id==='crystal'){
      const cl=[];for(const c of P.crystals)for(let k=0;k<c.n;k++)cl.push({x:c.x+Math.cos(c.rot+k*2.1)*k*1.1,z:c.z+Math.sin(c.rot+k*2.1)*k*1.1,s:c.s*(1-k*.25),rot:c.rot+k,k});
      this.inst(MD.crystal(),cl,t=>({ry:t.rot,rx:(t.k?.18:0),rz:(t.k?-.12:0),s:[t.s*.8,t.s,t.s*.8],dy:-.3,c:tint(A,.78+((t.x*5)%.2+.2)*.5)}));
      this.inst(MD.rock(),P.rocks,t=>({ry:t.rot,s:[t.s,t.s*.7,t.s*.9],dy:-.1,c:tint(N,.5)}));
      this.inst(MD.deadTree(),P.trees,t=>({ry:t.rot,s:[t.s,t.s,t.s],c:tint(N,.14)}));
      this.inst(MD.slab(),P.slabs,t=>({ry:t.rot,rz:t.tilt,s:[t.w,t.h,t.d],dy:-1.5,c:tint(A,.62)}));
      this.inst(MD.bush(),P.bushes,t=>({s:[t.s*1.7,t.s,t.s*1.7],c:tint(G,.5)}),{shadow:false});
    }else{
      this.inst(MD.slab(),P.slabs,t=>({ry:t.rot,rz:t.tilt,s:[t.w,t.h,t.d],dy:-.9,c:tint(N,.56+((t.x*3)%.2+.2)*.5)}));
      this.inst(MD.rock(),P.rocks,t=>({ry:t.rot,s:[t.s,t.s*.6,t.s*.9],dy:-.1,c:tint(N,.5)}));
      this.inst(MD.bush(),P.bushes,t=>({s:[t.s*1.6,t.s*.8,t.s*1.6],c:tint(G,.55)}),{shadow:false});
    }
  }
  // petits détails de sol : touffes et cailloux, uniquement décoratifs, pour casser les grands aplats
  buildGround(){
    const R=this.R,id=this.id,rnd=(()=>{let a=77;return()=>{a=(a*16807)%2147483647;return a/2147483647}})();
    const tufts=[],pebbles=[],N=TINT.neutral,G=TINT.green;
    const n=id==='shore'?2200:4200;
    for(let i=0;i<n*3&&tufts.length<n;i++){
      const x=(rnd()*2-1)*(HALF-8),z=(rnd()*2-1)*(HALF-8),h=R.height(x,z);
      if(R.depthAt(x,z,0)>.05||(id==='shore'&&h<.2))continue;
      if(id==='forest'&&fbm(x*.02,z*.02,33,3)<-.15&&rnd()<.5)continue;
      tufts.push({x,z,s:.5+rnd()*.7,rot:rnd()*6.28});
    }
    for(let i=0;i<1800;i++){const x=(rnd()*2-1)*(HALF-8),z=(rnd()*2-1)*(HALF-8);if(R.depthAt(x,z,0)>.05)continue;pebbles.push({x,z,s:.15+rnd()*.35,rot:rnd()*6.28})}
    const gt=id==='shore'?[.55,.85,.4]:[.4,.9,.45];
    this.inst(MD.tuft(),tufts,t=>({ry:t.rot,s:[t.s,t.s*(.8+((t.x*3)%1+1)%1*.7),t.s],c:[gt[0]*.62,gt[1]*.62,gt[2]*.62]}),{shadow:false});
    this.inst(MD.rock(),pebbles,t=>({ry:t.rot,s:[t.s,t.s*.6,t.s],dy:-.05,c:[.5,.5,.5]}),{shadow:false});
  }
  // ---------------------------------------------------------------- eau (marais ou estran) : lit la carte de hauteurs pour tracer la ligne d'écume
  buildWater(){
    const R=this.R;if(!R.waterLevelAt(0)&&R.waterLevelAt(0)!==0)return;
    const S=380,EXT=HALF+EXTRA,data=new Uint16Array(S*S);
    for(let j=0;j<S;j++)for(let i=0;i<S;i++)data[j*S+i]=THREE.DataUtils.toHalfFloat(R.height(-EXT+(i+.5)*2*EXT/S,-EXT+(j+.5)*2*EXT/S));
    const tex=new THREE.DataTexture(data,S,S,THREE.RedFormat,THREE.HalfFloatType);tex.minFilter=tex.magFilter=THREE.LinearFilter;tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;tex.needsUpdate=true;
    const kind=this.id==='shore'?1:0;
    this.waterU={uH:{value:tex},uLevel:{value:R.waterLevelAt(0)},uTime:this.timeU,uKind:{value:kind},uHalf:{value:HALF+EXTRA},uCol:{value:new THREE.Vector3(...TINT.accent)}};
    const mat=new THREE.ShaderMaterial({uniforms:this.waterU,
      vertexShader:'varying vec3 vWp;void main(){vWp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWp,1.);}',
      fragmentShader:`precision highp float;precision highp int;uniform sampler2D uH;uniform float uLevel,uTime,uKind,uHalf;uniform vec3 uCol;varying vec3 vWp;${BAYER_GLSL}
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec2 uv=(vWp.xz+uHalf)/(2.*uHalf);float h=texture2D(uH,uv).r;float d=uLevel-h;
  if(d<=0.)discard;
  float b=bayer8(gl_FragCoord.xy),lum,a=1.;
  if(uKind<.5){
    vec2 p=vWp.xz*.42,id=floor(p),f=fract(p)-.5;float ph=h21(id)*6.28,r=length(f);
    float ring=step(.88,sin(r*15.-uTime*3.+ph))*step(r,.44)*step(.5,h21(id+3.));
    lum=.26+.42*ring+.05*clamp(d,0.,1.);
    if(d<.35&&b>.3+d*1.7)discard;
  }else{
    float w=vn(vWp.xz*.08+vec2(uTime*.03,0.));
    float foam=step(d,.1+.15*sin(uTime*.8+w*7.)+w*.2);
    float bands=fract(d*.65+w*.9-uTime*.04);
    lum=mix(.3+.36*bands,.97,foam);
    if(foam<.5)a=.5;
    if(d<.55&&b>.38+d*1.2&&foam<.5)discard;
  }
  gl_FragColor=vec4(uCol*lum,a);}`});
    const g=new THREE.PlaneGeometry(4200,4200);g.rotateX(-Math.PI/2);
    this.water=new THREE.Mesh(g,mat);this.water.position.y=R.waterLevelAt(0);this.water.frustumCulled=false;this.scene.add(this.water);
  }
  // ---------------------------------------------------------------- objets interactifs
  buildObjects(){
    const L=this.R.layout,N=TINT.neutral,W=TINT.warm,A=TINT.accent;
    const lam=b=>new THREE.MeshLambertMaterial({color:col(N,b),flatShading:true});
    const gy=(x,z)=>this.R.height(x,z);
    this.foyers=L.foyers.map(f=>{
      const y=gy(f.x,f.z),g=new THREE.Group();g.position.set(f.x,y,f.z);
      const base=new THREE.Mesh(MD.brazier(),lam(.5));base.castShadow=base.receiveShadow=true;
      const fm=this.stip({color:[1,.62,.26],density:.92,cycle:false});const flame=new THREE.Mesh(MD.flameGeo(),fm);
      const colm=this.stip({color:[1,.6,.26],density:.3,fadeY:1,pulse:.12});const column=new THREE.Mesh(new THREE.CylinderGeometry(.35,1.3,24,8,1,true),colm);column.position.y=12;
      g.add(base,flame,column);this.scene.add(g);
      this.emitters.push({x:f.x,y:y+2.2,z:f.z,k:1.0,on:true});
      this.interact.push({type:'foyer',id:f.id,x:f.x,z:f.z,r:3.4});
      return {def:f,g,flame};
    });
    const stGeo=MD.stele(),glGeo=MD.steleGlyph();
    this.steles=L.steles.map(s=>{
      const y=gy(s.x,s.z),g=new THREE.Group();g.position.set(s.x,y,s.z);
      const body=new THREE.Mesh(stGeo,lam(.52));body.castShadow=body.receiveShadow=true;
      const tint=s.kind==='puzzle'?A:W;
      const glyph=new THREE.Mesh(glGeo,new THREE.MeshBasicMaterial({color:col(tint,.12)}));
      const beam=this.stip({color:s.kind==='puzzle'?[.5,.65,1]:[1,.62,.28],density:0,fadeY:.85,pulse:.1});
      const column=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.9,60,8,1,true),beam);column.position.y=30;
      g.add(body,glyph,column);this.scene.add(g);
      const em={x:s.x,y:y+5,z:s.z,k:1.6,on:false};this.emitters.push(em);
      this.interact.push({type:'stele',id:s.id,x:s.x,z:s.z,r:4});
      return {def:s,g,glyph,tint,beam,em,lit:false};
    });
    this.relics=L.relics.map(r=>{
      const y=gy(r.x,r.z),g=new THREE.Group();g.position.set(r.x,y+1.4,r.z);
      const core=new THREE.Mesh(MD.relicGeo(),new THREE.MeshBasicMaterial({color:col(W,.98)}));core.scale.setScalar(1.5);
      const halo=new THREE.Mesh(new THREE.SphereGeometry(1.2,8,6),this.stip({color:[1,.64,.3],density:.2,pulse:.5}));
      const spire=new THREE.Mesh(new THREE.CylinderGeometry(.18,.9,18,6,1,true),this.stip({color:[1,.64,.3],density:.55,fadeY:1}));spire.position.y=9;
      g.add(core,halo,spire);this.scene.add(g);
      return {def:r,g,core,got:false,y:y+1.4};
    });
    const gt=L.gate,gy0=gy(gt.x,gt.z),gg=new THREE.Group();gg.position.set(gt.x,gy0,gt.z);
    const arch=new THREE.Mesh(MD.gateArch(),lam(.45));arch.castShadow=arch.receiveShadow=true;
    const veilMat=this.stip({color:[.2,.2,.24],density:.55,cycle:true});
    const veil=new THREE.Mesh(new THREE.PlaneGeometry(9.6,13.4),veilMat);veil.position.y=7;
    const gcol=new THREE.Mesh(new THREE.CylinderGeometry(3.4,5,70,10,1,true),this.stip({color:[1,.64,.3],density:0,fadeY:.8,pulse:.1}));gcol.position.y=35;
    gg.add(arch,veil,gcol);this.scene.add(gg);
    this.gate={def:gt,g:gg,veil,veilMat,column:gcol,open:false,em:{x:gt.x,y:gy0+6,z:gt.z,k:1.4,on:false}};this.emitters.push(this.gate.em);
    this.interact.push({type:'gate',id:'gate',x:gt.x,z:gt.z,r:8});
    // puzzles à miroirs
    this.puzzles=(L.puzzles||[]).map(p=>{
      const py=gy(p.src.x,p.src.z);
      const prism=new THREE.Mesh(MD.prism(),new THREE.MeshLambertMaterial({color:col(A,.55),flatShading:true}));prism.position.set(p.src.x,py,p.src.z);prism.castShadow=true;this.scene.add(prism);
      this.interact.push({type:'source',id:p.id,x:p.src.x,z:p.src.z,r:3.4});
      const ms=p.mirrors.map((m,i)=>{
        const y=gy(m.x,m.z),g=new THREE.Group();g.position.set(m.x,y,m.z);
        const ped=new THREE.Mesh(MD.mirrorPedestal(),lam(.45));ped.castShadow=true;
        const slab=new THREE.Mesh(MD.mirrorSlab(),new THREE.MeshLambertMaterial({color:col(A,.85),flatShading:true}));slab.castShadow=true;
        g.add(ped,slab);this.scene.add(g);
        const o={m,g,slab,angle:mirrorAngle(m.state)};slab.rotation.y=-o.angle;
        this.interact.push({type:'mirror',id:p.id,idx:i,x:m.x,z:m.z,r:3.2});
        return o;
      });
      const segs=[];for(let i=0;i<14;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,1,6,1,true),this.stip({color:[.5,.66,1],density:1,cycle:false}));c.visible=false;this.scene.add(c);segs.push(c)}
      return {def:p,prism,ms,segs,armed:false,hit:false};
    });
  }
  // Le faisceau repart des miroirs dans leur état courant.
  refreshBeam(pz){
    const t=traceBeam(pz.def);pz.hit=t.hit;
    pz.segs.forEach(s=>s.visible=false);
    if(!pz.armed)return t.hit;
    for(let i=0;i<t.pts.length-1&&i<pz.segs.length;i++){
      const a=t.pts[i],b=t.pts[i+1],s=pz.segs[i],len=Math.hypot(b.x-a.x,b.z-a.z);
      const ya=this.R.height(a.x,a.z)+2.3,yb=this.R.height(b.x,b.z)+2.3;
      s.visible=true;s.position.set((a.x+b.x)/2,(ya+yb)/2,(a.z+b.z)/2);
      const dir=new THREE.Vector3(b.x-a.x,yb-ya,b.z-a.z);s.scale.set(1,dir.length(),1);
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    }
    return t.hit;
  }
  setSteleLit(id,on=true){
    const s=this.steles.find(x=>x.def.id===id);if(!s)return;s.lit=on;
    s.glyph.material.color.copy(col(s.tint,on?.98:.12));s.beam.uniforms.uDensity.value=on?.62:0;s.em.on=on;
    if(s.def.kind==='puzzle'&&on){s.em.k=1.3}
  }
  setGateOpen(on){
    const g=this.gate;g.open=on;g.veilMat.uniforms.uDensity.value=on?.88:.55;g.veilMat.uniforms.uColor.value.set(...(on?[1,.64,.3]:[.2,.2,.24]));
    g.column.material.uniforms.uDensity.value=on?.6:0;g.em.on=on;
  }
  setRelicGot(id){const r=this.relics.find(x=>x.def.id===id);if(r){r.got=true;r.g.visible=false}}
  // ---------------------------------------------------------------- le veilleur
  buildPlayer(){
    const pp=MD.playerParts(),N=TINT.neutral;
    const dark=new THREE.MeshLambertMaterial({color:col(N,.16),flatShading:true});
    const g=new THREE.Group();
    const body=new THREE.Mesh(pp.body,dark);body.castShadow=true;g.add(body);
    this.legL=new THREE.Mesh(pp.leg,dark);this.legL.position.set(-.14,.66,0);this.legR=new THREE.Mesh(pp.leg,dark);this.legR.position.set(.14,.66,0);
    this.legL.castShadow=this.legR.castShadow=true;g.add(this.legL,this.legR);
    const arm=new THREE.Mesh(pp.arm,dark);arm.position.set(.42,1.5,.1);arm.rotation.x=-.9;g.add(arm);this.arm=arm;
    const eye=new THREE.MeshBasicMaterial({color:col(TINT.green,.9)});
    for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.07),eye);e.position.set(s*.1,1.82,.2);g.add(e)}
    this.lanternMesh=new THREE.Group();this.lanternMesh.position.set(.46,1.0,.55);
    this.lanternCore=new THREE.Mesh(new THREE.SphereGeometry(.17,6,5),new THREE.MeshBasicMaterial({color:col(TINT.warm,.98)}));
    this.lanternHalo=new THREE.Mesh(new THREE.SphereGeometry(.7,8,6),this.stip({color:[1,.62,.28],density:.2,pulse:.25}));
    this.lanternMesh.add(this.lanternCore,this.lanternHalo);g.add(this.lanternMesh);
    this.player=g;this.scene.add(g);
  }
  // ---------------------------------------------------------------- boucle
  update(dt,time,ctx){
    this.timeU.value=time;this.stipples.forEach(m=>m.uniforms.uTime.value=time);
    const P=ctx.player;
    if(this.water){this.waterU.uLevel.value=this.R.waterLevelAt(ctx.tideT??time);this.water.position.y=this.waterU.uLevel.value}
    // soleil et ombres suivent le joueur, calées sur les texels pour éviter le scintillement
    const q=124/this.sun.shadow.mapSize.x,sx=Math.round(P.x/q)*q,sz=Math.round(P.z/q)*q;
    this.sun.target.position.set(sx,P.y,sz);this.sun.position.set(sx+this.sunDir.x*100,P.y+this.sunDir.y*100,sz+this.sunDir.z*100);
    // lanterne
    const f=ctx.flame/100,flick=1+Math.sin(time*13)*.04+Math.sin(time*7.3)*.03;
    this.lantern.position.set(P.x+Math.cos(P.rot)*.5,P.y+1.6,P.z+Math.sin(P.rot)*.5);
    this.lantern.intensity=(ctx.flame>0?(.25+.75*f):0)*this.env.lantern*58*flick;
    const lc=this.lanternCore.material.color;lc.copy(col(TINT.warm,ctx.flame>0?.98:.18));
    this.lanternHalo.material.uniforms.uDensity.value=ctx.flame>0?.1+.22*f:0;
    // trois émetteurs les plus proches se partagent les lumières ponctuelles
    const cand=this.emitters.filter(e=>e.on).map(e=>({e,d:Math.hypot(e.x-P.x,e.z-P.z)})).sort((a,b)=>a.d-b.d).slice(0,3);
    this.pool.forEach((l,i)=>{const c=cand[i];if(!c||c.d>80){l.intensity=0;return}l.position.set(c.e.x,c.e.y,c.e.z);l.intensity=26*c.e.k*(1+Math.sin(time*9+i*2)*.05)});
    // objets
    for(const f of this.foyers){f.flame.scale.y=1+Math.sin(time*11+f.def.x)*.12+Math.sin(time*17)*.06;f.flame.scale.x=f.flame.scale.z=1+Math.sin(time*13+f.def.z)*.08}
    for(const r of this.relics){if(r.got)continue;r.core.rotation.y=time*1.4;r.core.rotation.x=time*.7;r.g.position.y=r.y+Math.sin(time*1.8+r.def.x)*.35;
      if(r.def.tide&&this.water)r.g.visible=this.R.depthAt(r.def.x,r.def.z,ctx.tideT??time)<.15}
    for(const pz of this.puzzles)for(const m of pz.ms){const d=mirrorAngle(m.m.state)-m.angle;let dd=((d+Math.PI*1.5)%Math.PI)-Math.PI/2;if(Math.abs(dd)>.001){m.angle+=dd*Math.min(1,dt*10);m.slab.rotation.y=-m.angle}}
    // joueur
    const pl=this.player;pl.position.set(P.x,P.y,P.z);pl.rotation.y=-P.rot+Math.PI/2;
    const sw=Math.sin(P.step)*.55*P.moving;this.legL.rotation.x=sw;this.legR.rotation.x=-sw;pl.children[0].position.y=Math.abs(Math.sin(P.step))*.05*P.moving;
  }
  dispose(){
    this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}});
    this.sun.shadow.map?.dispose();
  }
}

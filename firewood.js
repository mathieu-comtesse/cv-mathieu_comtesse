import * as THREE from './three.module.js';
/* Timber ! — une clairière réaliste : billot, bûches aux cernes visibles, faces de fente en bois de fil, écorce en relief,
   sol forestier, herbe animée sur le GPU, pile de bois fendu entre deux piquets et tas de rondins. La hache vient de Blender. */
const canvas=document.getElementById('wood-canvas'),host=canvas.parentElement,renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene(),SKY='#c7d6de';scene.fog=new THREE.Fog(SKY,16,58);const camera=new THREE.PerspectiveCamera(48,1,.05,90);scene.add(camera);
{const c=document.createElement('canvas');c.width=4;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#8fb3cf');g.addColorStop(.55,'#c9dbe4');g.addColorStop(1,SKY);x.fillStyle=g;x.fillRect(0,0,4,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;scene.background=t;}
scene.add(new THREE.HemisphereLight('#dce8f2','#5c4b35',1.15));
const sun=new THREE.DirectionalLight('#ffeccc',3.1);sun.position.set(-5,10,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.025;Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:30});scene.add(sun);

// --- Procedural textures (painted once on canvases). Every function returns a colour map and a bump map.
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
const vnoise=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
const fbm=(x,y,o=4)=>{let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vnoise(x*f,y*f);f*=2.03;a*=.5;}return s;};
const mix3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function painted(w,h,fn,repeat=false){const c=document.createElement('canvas'),b=document.createElement('canvas');c.width=b.width=w;c.height=b.height=h;const cx=c.getContext('2d'),bx=b.getContext('2d'),ci=cx.createImageData(w,h),bi=bx.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const [r,g,bl,bump]=fn(x/w,y/h),i=(y*w+x)*4;ci.data[i]=r;ci.data[i+1]=g;ci.data[i+2]=bl;ci.data[i+3]=255;const v=Math.max(0,Math.min(255,bump*255));bi.data[i]=bi.data[i+1]=bi.data[i+2]=v;bi.data[i+3]=255;}
 cx.putImageData(ci,0,0);bx.putImageData(bi,0,0);const map=new THREE.CanvasTexture(c),bump=new THREE.CanvasTexture(b);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=bump.anisotropy=renderer.capabilities.getMaxAnisotropy();
 if(repeat)map.wrapS=map.wrapT=bump.wrapS=bump.wrapT=THREE.RepeatWrapping;return {map,bump};}
// End grain: the texture spans 1.2 m, centred on the pith. Rings, darker heartwood, pith, drying checks and saw marks.
const EARLY=hex('#e6c79b'),LATE=hex('#a9794c'),HEART=hex('#c08a57'),SAP=hex('#efd7b0'),CHECK=[70,48,30];
const endGrain=painted(768,768,(u,v)=>{const x=(u-.5)*1.2,y=(v-.5)*1.2,r=Math.hypot(x,y),a=Math.atan2(y,x);
 const wob=(fbm(Math.cos(a)*2+3,Math.sin(a)*2+3,3)-.5)*.02+(fbm(x*9,y*9,2)-.5)*.004,rr=r+wob,f=rr*62,ring=f-Math.floor(f);
 const late=Math.pow(Math.max(0,Math.sin(ring*Math.PI*.98)),6)*.2+(ring>.78?(ring-.78)/.22:0);
 let col=mix3(EARLY,LATE,Math.min(1,late*1.15));col=mix3(col,mix3(HEART,SAP,Math.min(1,Math.max(0,(rr-.14)/.08))),.4);
 let check=0;for(let k=0;k<5;k++){const ca=k*1.37+.4,d=Math.abs(Math.atan2(Math.sin(a-ca),Math.cos(a-ca)))*r;if(r<.05+.2*hash(k,2)&&d<.0025*(1-r/.25))check=1;}
 const saw=.5+.5*Math.sin((x*.9+y*.3)*260+fbm(x*6,y*6,2)*6),grain=fbm(x*60,y*60,2);
 col=col.map(c=>c*(.92+grain*.1+saw*.03));if(r<.008)col=mix3(col,[92,60,34],.8);if(check)col=CHECK;
 return [...col,.55-late*.3-check*.5+saw*.04+grain*.08];});
// Bark: deep vertical furrows between plates, horizontal cracks and patches of lichen. Repeats around the log.
const barkTex=painted(512,512,(u,v)=>{const w=fbm(v*1.6,u*3,3)*1.4+fbm(u*30,v*4,2)*.25,ridge=Math.abs(Math.sin((u*18+w)*Math.PI)),plates=Math.pow(ridge,.45),furrow=Math.pow(1-ridge,4),crack=Math.pow(Math.abs(Math.sin((v*5+fbm(u*18,v*2,2)*3)*Math.PI)),60)*.5*plates;
 const n=fbm(u*40,v*12,3),lichen=fbm(u*5+9,v*5,3)>.66?1:0;let col=mix3(hex('#857566'),hex('#3a2f27'),Math.min(1,furrow*1.6+crack));col=col.map(c=>c*(.8+n*.35));if(lichen)col=mix3(col,hex('#8d977a'),.35);
 return [...col,plates*.8-crack*.4+n*.2];},true);
// Split face (long grain): fibres run along the log, rings show as long parallel stripes.
const splitTex=painted(512,512,(u,v)=>{const s=u*26+fbm(v*3,u*3,3)*1.5,ring=s-Math.floor(s),late=ring>.8?(ring-.8)/.2:0,fib=fbm(u*120,v*6,3),tear=fbm(u*8,v*40,2)>.7?1:0;
 let col=mix3(hex('#e8cda2'),hex('#b98a5a'),late*.7);col=col.map(c=>c*(.88+fib*.2));if(tear)col=col.map(c=>c*.9);return [...col,.5+fib*.35-late*.2-tear*.15];},true);
// Forest floor: soil, moss, grass patches, leaf litter and a few pebbles. Tiled over the clearing.
const groundTex=painted(1024,1024,(u,v)=>{const big=fbm(u*6,v*6,4),moss=fbm(u*14+5,v*14,3),leaf=fbm(u*90,v*90,2),peb=0;
 let col=mix3(hex('#5b4631'),hex('#6d7a3a'),Math.min(1,Math.max(0,(big-.35)*2.2)));col=mix3(col,hex('#4f6a2e'),moss>.6?(moss-.6)*2.5:0);
 if(leaf>.62)col=mix3(col,[[168,110,52],[140,86,40],[186,142,74]][Math.floor(leaf*97)%3],.7);if(peb)col=hex('#9c958a');col=col.map(c=>c*(.86+fbm(u*300,v*300,1)*.25));return [...col,big*.6+leaf*.3+peb*.4];},true);
groundTex.map.repeat.set(10,10);groundTex.bump.repeat.set(10,10);
const endMat=new THREE.MeshStandardMaterial({map:endGrain.map,bumpMap:endGrain.bump,bumpScale:1.2,roughness:.9});
const barkMat=new THREE.MeshStandardMaterial({map:barkTex.map,bumpMap:barkTex.bump,bumpScale:4,roughness:1});
const splitMat=new THREE.MeshStandardMaterial({map:splitTex.map,bumpMap:splitTex.bump,bumpScale:1.6,roughness:.88});

// --- Wood pieces. A polygon lists its outline points [x, y, kind]; kind tells what the edge starting at that point is:
// 'b' bark (smooth round side) or 's' split (flat fresh wood). The top and bottom show the end grain.
function logGeometry(poly,height,capSpan=1.2){const P=[],N=[],U=[],groups=[],n=poly.length,cx=poly.reduce((s,p)=>s+p[0],0)/n,cy=poly.reduce((s,p)=>s+p[1],0)/n;
 const V=(x,y,h)=>[x,h,-y];let start=0;
 const contour=poly.map(p=>new THREE.Vector2(p[0],p[1])),tris=THREE.ShapeUtils.triangulateShape(contour,[]);
 for(const [yy,up] of [[height,1],[0,-1]]){for(const t of tris){const idx=up>0?t:[t[0],t[2],t[1]];for(const k of idx){const p=poly[k];P.push(...V(p[0],p[1],yy));N.push(0,up,0);U.push(p[0]/capSpan+.5,p[1]/capSpan+.5);}}}
 groups.push([start,P.length/3-start,0]);start=P.length/3;
 // outward normal of each edge, and smoothed normals where two bark edges meet
 const en=poly.map((p,i)=>{const q=poly[(i+1)%n];let nx=q[1]-p[1],ny=-(q[0]-p[0]);const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;const mx=(p[0]+q[0])/2-cx,my=(p[1]+q[1])/2-cy;if(nx*mx+ny*my<0){nx=-nx;ny=-ny;}return [nx,ny];});
 const vn=(i,e)=>{const prev=(i-1+n)%n;if(poly[i][2]==='b'&&poly[prev][2]==='b'){const x=en[i][0]+en[prev][0],y=en[i][1]+en[prev][1],l=Math.hypot(x,y)||1;return [x/l,y/l];}return en[e];};
 for(const kind of ['b','s']){let along=0;for(let i=0;i<n;i++){const p=poly[i],q=poly[(i+1)%n],len=Math.hypot(q[0]-p[0],q[1]-p[1]);if(p[2]!==kind){along+=len;continue;}
  const na=kind==='b'?vn(i,i):en[i],nb=kind==='b'?vn((i+1)%n,i):en[i],u0=along/.9,u1=(along+len)/.9,h=height*1.1;
  const quad=[[p,na,u0,0],[q,nb,u1,0],[q,nb,u1,h],[p,na,u0,0],[q,nb,u1,h],[p,na,u0,h]];
  for(const [pt,nn,u,v] of quad){P.push(...V(pt[0],pt[1],v/1.1));N.push(nn[0],0,-nn[1]);U.push(kind==='s'?(pt[0]*.7+pt[1]*.7+1)*.8:u,v);}along+=len;}
  groups.push([start,P.length/3-start,kind==='b'?1:2]);start=P.length/3;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
 for(const [s,c,m] of groups)if(c)g.addGroup(s,c,m);return g;}
function mesh(poly,height){const m=new THREE.Mesh(logGeometry(poly,height),[endMat,barkMat,splitMat]);m.castShadow=m.receiveShadow=true;m.userData={poly,height};return m;}
const roundPoly=(radius,n=28,jit=.05)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2,r=radius*(1-jit/2+Math.random()*jit)*(1+.03*Math.sin(a*3));return [Math.cos(a)*r,Math.sin(a)*r,'b'];});
// Cut a polygon by the line n·p = offset; keeps the side where sign·(n·p − offset) ≥ 0 and marks the new edge as split wood.
function clip(poly,n,offset,sign){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a[0]*n[0]+a[1]*n[1]-offset)*sign,db=(b[0]*n[0]+b[1]*n[1]-offset)*sign;
 if(da>=0)out.push([a[0],a[1],a[2]]);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,da>=0?'s':a[2]]);}}return out;}
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0)/2);

// --- The clearing: a gently rolling forest floor, flat around the block.
const groundGeo=new THREE.PlaneGeometry(90,90,180,180);groundGeo.rotateX(-Math.PI/2);{const p=groundGeo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);p.setY(i,(fbm(x*.15+20,z*.15,3)-.5)*.9*Math.min(1,Math.max(0,(r-4)/10))+(r>28?(r-28)*.06:0));}groundGeo.computeVertexNormals();}
const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({map:groundTex.map,bumpMap:groundTex.bump,bumpScale:3,roughness:1}));ground.receiveShadow=true;scene.add(ground);
// The chopping block: a wide round, rings on top, a few axe gashes.
const blockPoly=roundPoly(.62,36,.03),stump=new THREE.Mesh(logGeometry(blockPoly,.66,1.9),[endMat,barkMat,splitMat]);stump.castShadow=stump.receiveShadow=true;scene.add(stump);
{const gash=new THREE.MeshStandardMaterial({color:'#7a5c3e',roughness:1});for(let i=0;i<5;i++){const g=new THREE.Mesh(new THREE.BoxGeometry(.1+Math.random()*.12,.002,.006),gash);const a=Math.random()*6.3,r=Math.random()*.3;g.position.set(Math.cos(a)*r,.661,Math.sin(a)*r);g.rotation.y=Math.random()*3.14;scene.add(g);}}
// Chips and bark flakes scattered around the block (static), plus the ones each blow throws out.
const chipGeo=new THREE.BoxGeometry(.05,.006,.02),chipMats=[new THREE.MeshStandardMaterial({color:'#dcc39c',roughness:1}),new THREE.MeshStandardMaterial({color:'#c2a57c',roughness:1}),new THREE.MeshStandardMaterial({color:'#5e4c3d',roughness:1})];
const litter=new THREE.InstancedMesh(chipGeo,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),260),dummy=new THREE.Object3D(),tint=new THREE.Color();
for(let i=0;i<260;i++){const a=Math.random()*6.3,r=.62+Math.pow(Math.random(),2)*1.6;dummy.position.set(Math.cos(a)*r,.006,Math.sin(a)*r);dummy.rotation.set(0,Math.random()*6.3,(Math.random()-.5)*.3);dummy.scale.setScalar(.35+Math.random()*.6);dummy.updateMatrix();litter.setMatrixAt(i,dummy.matrix);litter.setColorAt(i,tint.set(['#c9b393','#a8916f','#7d6a56','#5f5143','#b7a07c'][i%5]));}
litter.receiveShadow=true;scene.add(litter);
const chips=[];function throwChips(at){for(let i=0;i<14;i++){const m=new THREE.Mesh(chipGeo,chipMats[i%3]);m.position.copy(at);m.castShadow=true;scene.add(m);chips.push({m,v:new THREE.Vector3((Math.random()-.5)*3.2,1.2+Math.random()*2,(Math.random()-.5)*3.2),s:new THREE.Vector3(Math.random()*20,Math.random()*20,Math.random()*20),rest:false});}
 while(chips.length>260){const c=chips.shift();scene.remove(c.m);}}
// Grass: thousands of tapered, bending blades; the wind is computed on the GPU so the page stays fluid.
const bladeGeo=(()=>{const P=[],C=[],seg=4;for(let i=0;i<seg;i++){const y0=i/seg,y1=(i+1)/seg,w0=.5*(1-y0),w1=.5*(1-y1);P.push(-w0,y0,0,w0,y0,0,w1,y1,0,-w0,y0,0,w1,y1,0,-w1,y1,0);for(const y of [y0,y0,y1,y0,y1,y1])C.push(y);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('tip',new THREE.Float32BufferAttribute(C,1));g.computeVertexNormals();return g;})();
const wind={value:0},grassMat=new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:.9});
grassMat.onBeforeCompile=sh=>{sh.uniforms.uTime=wind;sh.vertexShader='uniform float uTime;\nattribute float tip;\nvarying float vTip;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vTip=tip;vec3 base=vec3(instanceMatrix[3][0],0.,instanceMatrix[3][2]);float gust=sin(uTime*1.3+base.x*.35+base.z*.2)*.5+sin(uTime*2.7+base.x*1.1)*.2;
 transformed.z+=tip*tip*(.35+gust*.35);transformed.x+=tip*tip*gust*.12;`);
 sh.fragmentShader='varying float vTip;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb*=mix(.62,1.12,vTip);');};
const GRASS=24000,grassMesh=new THREE.InstancedMesh(bladeGeo,grassMat,GRASS),greens=['#5d7a36','#6f8a3e','#4e6a2f','#86984a','#9aa35a','#b5a96a'];
const nearPile=(x,z)=>(Math.abs(x)<1.3&&z<-1.8&&z>-3.6)||(Math.hypot(x-2.4,z+1.2)<1.1);
const tufts=Array.from({length:2600},()=>{const a=Math.random()*6.3,r=1+Math.pow(Math.random(),.8)*16;return [Math.cos(a)*r,Math.sin(a)*r];});
for(let i=0,k=0;i<GRASS*3&&k<GRASS;i++){const t=tufts[i%tufts.length],sp=.05+Math.random()*.18,aa=Math.random()*6.3,x=t[0]+Math.cos(aa)*sp,z=t[1]+Math.sin(aa)*sp,r=Math.hypot(x,z);if(r<1.15+Math.random()*.8||nearPile(x,z))continue;
 const h=(.18+Math.random()*.32)*(r<2.5?.6:1)*(fbm(x*.4,z*.4,2)>.55?1.5:1);dummy.position.set(x,(fbm(x*.15+20,z*.15,3)-.5)*.9*Math.min(1,Math.max(0,(r-4)/10))-.01,z);dummy.rotation.set(0,Math.random()*6.3,0);dummy.scale.set(.035+Math.random()*.04,h,1);dummy.updateMatrix();grassMesh.setMatrixAt(k,dummy.matrix);grassMesh.setColorAt(k,tint.set(greens[Math.floor(Math.random()*greens.length)]));k++;}
grassMesh.receiveShadow=true;scene.add(grassMesh);
// Forest edge: firs and broadleaves, instanced.
{const trunks=[],firs=[],leafy=[];for(let i=0;i<90;i++){const a=Math.random()*6.3,r=14+Math.random()*26,x=Math.cos(a)*r,z=Math.sin(a)*r,h=7+Math.random()*9;(i%3?firs:leafy).push({x,z,h});trunks.push({x,z,h:i%3?h*.35:h*.55,r:.18+Math.random()*.15});}
 const trunkMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.7,1,1,8).translate(0,.5,0),barkMat,trunks.length);trunks.forEach((t,i)=>{dummy.position.set(t.x,0,t.z);dummy.rotation.set(0,Math.random()*6,0);dummy.scale.set(t.r,t.h,t.r);dummy.updateMatrix();trunkMesh.setMatrixAt(i,dummy.matrix);});trunkMesh.castShadow=true;scene.add(trunkMesh);
 const cone=new THREE.ConeGeometry(1,1,9,1).translate(0,.5,0),firMesh=new THREE.InstancedMesh(cone,new THREE.MeshStandardMaterial({roughness:1}),firs.length*4);let k=0;
 firs.forEach(f=>{for(let j=0;j<4;j++){const y=f.h*(.25+j*.18),w=f.h*(.24-j*.045);dummy.position.set(f.x,y,f.z);dummy.rotation.set(0,Math.random()*6,0);dummy.scale.set(w,f.h*.32,w);dummy.updateMatrix();firMesh.setMatrixAt(k,dummy.matrix);firMesh.setColorAt(k++,tint.set(['#2d4a2e','#35553a','#27402a'][j%3]));}});firMesh.castShadow=true;scene.add(firMesh);
 const puff=new THREE.IcosahedronGeometry(1,1),leafMesh=new THREE.InstancedMesh(puff,new THREE.MeshStandardMaterial({roughness:1}),leafy.length*5);k=0;
 leafy.forEach(f=>{for(let j=0;j<5;j++){dummy.position.set(f.x+(Math.random()-.5)*2.4,f.h*.62+Math.random()*f.h*.3,f.z+(Math.random()-.5)*2.4);dummy.rotation.set(Math.random(),Math.random()*6,0);dummy.scale.setScalar(f.h*.16+Math.random()*.8);dummy.updateMatrix();leafMesh.setMatrixAt(k,dummy.matrix);leafMesh.setColorAt(k++,tint.set(['#4f6b35','#5f7d3c','#6b8540','#465f31'][j%4]));}});leafMesh.castShadow=true;scene.add(leafMesh);}
// --- The woodpile: two base poles, two stakes, and split pieces lying along the pile, row after row.
const PILE={x0:-1.05,x1:1.05,z:-2.45,base:.1,row:0,x:-1.05,top:.1,stack:0,stacks:[[],[]]},pile=[];
{const pole=r=>new THREE.Mesh(logGeometry(roundPoly(r,14,.08),2.5,.6),[endMat,barkMat,splitMat]);for(const dz of [-.18,.18,-.68,-.32]){const p=pole(.05);p.rotation.z=Math.PI/2;p.position.set(1.25,.05,PILE.z+dz);p.castShadow=p.receiveShadow=true;scene.add(p);}
 for(const x of [PILE.x0-.12,PILE.x1+.12])for(const dz of [.2,-.7]){const s=pole(.045);s.scale.y=.56;s.position.set(x,0,PILE.z+dz);s.castShadow=true;scene.add(s);}}
// Next free place on the pile. Each piece lies along the pile (z) on its largest split face, and settles on the actual
// profile of the pieces below it: the pile keeps a height per 2 cm column along x, so pieces nest like real firewood.
const COL=.02,NCOL=Math.ceil((PILE.x1-PILE.x0)/COL);PILE.h=[new Array(NCOL).fill(.1),new Array(NCOL).fill(.1)];PILE.cursor=PILE.x0;
const lay=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2),zAxis=new THREE.Vector3(0,0,1);
function profileAt(pts,X){let lo=Infinity,hi=-Infinity;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a[0]-X)*(b[0]-X)>0||a[0]===b[0])continue;const y=a[1]+(b[1]-a[1])*(X-a[0])/(b[0]-a[0]);lo=Math.min(lo,y);hi=Math.max(hi,y);}return [lo,hi];}
function pileSlot(m){const poly=m.userData.poly,n=poly.length,cx=poly.reduce((t,p)=>t+p[0],0)/n,cy=poly.reduce((t,p)=>t+p[1],0)/n;
 let best=0,nx=0,ny=-1;for(let i=0;i<n;i++){const p=poly[i],q=poly[(i+1)%n],len=Math.hypot(q[0]-p[0],q[1]-p[1]);if(p[2]==='s'&&len>best){best=len;let ex=q[1]-p[1],ey=-(q[0]-p[0]);const l=Math.hypot(ex,ey);ex/=l;ey/=l;if(ex*((p[0]+q[0])/2-cx)+ey*((p[1]+q[1])/2-cy)<0){ex=-ex;ey=-ey;}nx=ex;ny=ey;}}
 const phi=(best?-Math.PI/2-Math.atan2(ny,nx):Math.random()*6.3)+(Math.random()-.5)*.1,c=Math.cos(phi),sn=Math.sin(phi),pts=poly.map(p=>[p[0]*c-p[1]*sn,p[0]*sn+p[1]*c]);
 const xs=pts.map(p=>p[0]),minx=Math.min(...xs),w=Math.max(...xs)-minx;
 for(let attempt=0;attempt<2;attempt++){if(PILE.cursor+w>PILE.x1)PILE.cursor=PILE.x0+Math.random()*.04;
  const H=PILE.h[PILE.stack],c0=Math.max(0,Math.floor((PILE.cursor-PILE.x0)/COL)),c1=Math.min(NCOL-1,Math.ceil((PILE.cursor+w-PILE.x0)/COL)),dx=PILE.cursor-minx;let base=-Infinity;const prof=[];
  for(let k=c0;k<=c1;k++){const X=PILE.x0+(k+.5)*COL-dx,[lo,hi]=profileAt(pts,X);prof.push([k,lo,hi]);if(lo<Infinity)base=Math.max(base,H[k]-lo);}
  if(base===-Infinity)base=Math.max(...H.slice(c0,c1+1));
  const top=Math.max(...prof.map(p=>p[2]).filter(isFinite));
  if(base+top>1.2&&attempt===0){// this face is full: switch to the other face, clearing what was stacked there
   PILE.stack=1-PILE.stack;PILE.h[PILE.stack].fill(.1);PILE.cursor=PILE.x0;for(const old of PILE.stacks[PILE.stack].splice(0)){scene.remove(old);old.geometry.dispose();const i=pile.indexOf(old);if(i>=0)pile.splice(i,1);}continue;}
  for(const [k,lo,hi] of prof)if(hi>-Infinity)H[k]=Math.max(H[k],base+hi);PILE.cursor+=w+.006;PILE.stacks[PILE.stack].push(m);
  const q=new THREE.Quaternion().setFromAxisAngle(zAxis,phi).multiply(lay);
  return {pos:new THREE.Vector3(dx,base,PILE.z-PILE.stack*.5-m.userData.height/2+(Math.random()-.5)*.06),q};}}
function splitPieces(radius,height,cuts){let pieces=[roundPoly(radius)];for(let c=0;c<cuts;c++){pieces.sort((a,b)=>area(b)-area(a));const p=pieces.shift(),a=Math.random()*Math.PI,n=[Math.cos(a),Math.sin(a)],cx=p.reduce((s,q)=>s+q[0],0)/p.length,cy=p.reduce((s,q)=>s+q[1],0)/p.length,off=cx*n[0]+cy*n[1];for(const s of [-1,1]){const q=clip(p,n,off,s);if(q.length>=3)pieces.push(q);}}return pieces.map(p=>mesh(p,height));}
// Already stacked: a few rows of split wood.
for(let i=0;i<6;i++)for(const m of splitPieces(.2+Math.random()*.08,.42,3+Math.floor(Math.random()*2))){const {pos,q}=pileSlot(m);m.position.copy(pos);m.quaternion.copy(q);scene.add(m);pile.push(m);}
// A heap of unsplit rounds waiting their turn.
{const rounds=[[0,0],[.5,0],[1,0],[.25,.42],[.75,.42],[.5,.84]];rounds.forEach(([x,y],i)=>{const r=.2+Math.random()*.05,m=mesh(roundPoly(r,24),.9+Math.random()*.2);m.rotation.z=Math.PI/2;m.rotation.y=(Math.random()-.5)*.12;m.position.set(1.95+x-(m.userData.height/2),.2+y,-1.2+(Math.random()-.5)*.1);scene.add(m);});}
// First-person tool modelled in Blender (tools/blender-axe.py): shaft along +Y, bit toward -Z, thickness along X.
const axe=new THREE.Group(),woodMat=new THREE.MeshStandardMaterial({color:'#b98567',roughness:.86}),steelMat=new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.45,roughness:.42,vertexColors:true});
const cuttingEdge=new THREE.Vector3(0,1.17,-.475);
fetch('timber-axe.json?v=20260921-3').then(r=>r.json()).then(model=>{
 for(const [name,part] of Object.entries(model)){if(!part.position)continue;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(part.position,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(part.normal,3));
  if(name!=='handle'){const colors=[],poll=new THREE.Color('#8e9cab'),bit=new THREE.Color('#f4f7fa');for(let i=0;i<part.position.length;i+=3){const z=part.position[i+2],u=THREE.MathUtils.clamp((-.30-z)/.17,0,1);const col=poll.clone().lerp(bit,u*u);colors.push(col.r,col.g,col.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
  const mesh=new THREE.Mesh(geo,name==='handle'?woodMat:steelMat);mesh.castShadow=true;axe.add(mesh);}
 cuttingEdge.fromArray(model.edge.point);
});
scene.add(axe);
// Poses are expressed relative to the camera: grip position, shaft direction and edge direction.
// The shaft runs along local +Y and the cutting edge points along local -Z.
const restPose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion()},raisedPose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion()},hitPose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion()};
const tmpX=new THREE.Vector3(),tmpY=new THREE.Vector3(),tmpZ=new THREE.Vector3(),tmpM=new THREE.Matrix4(),tmpEdge=new THREE.Vector3(),tmpHands=new THREE.Vector3();
function orient(pose,shaft,edge){tmpY.copy(shaft).normalize();tmpZ.copy(edge).negate();tmpZ.addScaledVector(tmpY,-tmpY.dot(tmpZ)).normalize();tmpX.crossVectors(tmpY,tmpZ).normalize();tmpM.makeBasis(tmpX,tmpY,tmpZ);pose.quaternion.setFromRotationMatrix(tmpM);}
function cameraPose(pose,grip,shaft,edge){pose.position.copy(grip).applyMatrix4(camera.matrixWorld);orient(pose,tmpY.copy(shaft).applyQuaternion(camera.quaternion),tmpEdge.copy(edge).applyQuaternion(camera.quaternion));}
// At impact the grip lies on the line from the log toward the viewer's hands, at the axe's own reach,
// and the head rolls so the edge bites as vertically as the shaft allows.
const tmpU=new THREE.Vector3(),tmpW=new THREE.Vector3();
function strikePose(pose,target){const reach=Math.hypot(cuttingEdge.y,cuttingEdge.z),bite=Math.atan2(-cuttingEdge.z,cuttingEdge.y);tmpHands.set(.45,-.62,-.8).applyMatrix4(camera.matrixWorld);tmpU.subVectors(target,tmpHands).normalize();tmpW.set(0,-1,0).addScaledVector(tmpU,-tmpU.dot(new THREE.Vector3(0,-1,0))).normalize();
 tmpY.copy(tmpU).multiplyScalar(Math.cos(bite)).addScaledVector(tmpW,-Math.sin(bite));tmpZ.copy(tmpU).multiplyScalar(-Math.sin(bite)).addScaledVector(tmpW,-Math.cos(bite));tmpX.crossVectors(tmpY,tmpZ).normalize();tmpM.makeBasis(tmpX,tmpY,tmpZ);pose.quaternion.setFromRotationMatrix(tmpM);
 pose.position.copy(target).addScaledVector(tmpU,-reach);}

let orbit=.15,pitch=0,drag=null,chargeAt=null,active=[],flying=[],cuts=0,targetCuts=3,logs=0,swing=null,shake=0,muted=false,audio=null,birdAt=0;
function spawn(){cuts=0;targetCuts=2+Math.floor(Math.random()*4);const radius=.26+Math.random()*.2,height=.36+Math.random()*.2,m=mesh(roundPoly(radius),height);m.position.y=.66;scene.add(m);active=[m];canvas.dataset.requiredCuts=targetCuts;update();}
function update(){document.getElementById('wood-count').textContent=logs+' bûche'+(logs>1?'s':'')+' · '+pile.length+' morceau'+(pile.length>1?'x':'')+' · coupe '+cuts+'/'+targetCuts;canvas.dataset.pile=pile.length;canvas.dataset.cuts=cuts;canvas.dataset.logs=logs;}
function eject(m){flying.push({m,v:new THREE.Vector3((Math.random()-.5)*2.4,1.3+Math.random(),(Math.random()-.5)*2.4),spin:new THREE.Vector3(Math.random()*4,Math.random()*3,Math.random()*4),time:0,phase:'fly'});}
function impact(){if(!active.length)return;cuts++;const old=active.reduce((a,b)=>area(a.userData.poly)>area(b.userData.poly)?a:b),poly=old.userData.poly,c=poly.reduce((s,p)=>[s[0]+p[0]/poly.length,s[1]+p[1]/poly.length],[0,0]),a=orbit,n=[Math.cos(a),Math.sin(a)],off=c[0]*n[0]+c[1]*n[1];
 active=active.filter(m=>m!==old);scene.remove(old);for(const sign of [-1,1]){const p=clip(poly,n,off,sign);if(p.length<3)continue;const m=mesh(p,old.userData.height);m.position.copy(old.position);m.position.x+=n[0]*sign*.03;m.position.z-=n[1]*sign*.03;m.rotation.z=-n[0]*sign*.05;m.rotation.x=-n[1]*sign*.05;scene.add(m);active.push(m);}
 old.geometry.dispose();throwChips(new THREE.Vector3(c[0],.66+old.userData.height,-c[1]));shake=.055;chopSound();if(cuts>=targetCuts){for(const m of active)eject(m);active=[];logs++;setTimeout(spawn,1100);}update();}
function initAudio(){if(audio)return;const C=window.AudioContext||window.webkitAudioContext;audio=new C();audio.resume();}
function chirp(){if(!audio||muted)return;const t=audio.currentTime;for(let j=0;j<3;j++){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(1900+Math.random()*1000,t+j*.13);o.frequency.exponentialRampToValueAtTime(3100+Math.random()*800,t+j*.13+.08);g.gain.setValueAtTime(.0001,t+j*.13);g.gain.exponentialRampToValueAtTime(.018,t+j*.13+.02);g.gain.exponentialRampToValueAtTime(.0001,t+j*.13+.11);o.connect(g).connect(audio.destination);o.start(t+j*.13);o.stop(t+j*.13+.12)}}
function chopSound(){if(!audio||muted)return;const buf=audio.createBuffer(1,audio.sampleRate*.3,audio.sampleRate),a=buf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.exp(-i/(audio.sampleRate*.025))*(i%31?1:2);const s=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();s.buffer=buf;f.type='lowpass';f.frequency.value=900+Math.random()*1400;g.gain.value=.55;s.connect(f).connect(g).connect(audio.destination);s.start();const o=audio.createOscillator(),v=audio.createGain();o.frequency.setValueAtTime(140+Math.random()*60,audio.currentTime);o.frequency.exponentialRampToValueAtTime(45,audio.currentTime+.14);v.gain.setValueAtTime(.3,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+.2)}

function strike(){initAudio();if(swing||!active.length)return;const log=active.reduce((a,b)=>area(a.userData.poly)>area(b.userData.poly)?a:b);const center=log.userData.poly.reduce((v,p)=>v.add(new THREE.Vector3(p[0],0,-p[1])),new THREE.Vector3()).divideScalar(log.userData.poly.length);center.add(log.position);center.y+=log.userData.height;swing={t:performance.now(),hit:false,target:center,from:axe.position.clone(),rotation:axe.quaternion.clone()};canvas.dataset.phase='armer';}
canvas.oncontextmenu=e=>e.preventDefault();
canvas.onpointerdown=e=>{e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);if(e.button===2){drag={x:e.clientX,y:e.clientY,orbit,pitch};}else if(e.button===0&&!swing){initAudio();chargeAt=performance.now();canvas.dataset.phase='armer';}};
canvas.onpointermove=e=>{if(drag){orbit=drag.orbit+(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.002,-.2,.3);}};
const cancel=()=>{drag=null;chargeAt=null;};canvas.onpointercancel=canvas.onlostpointercapture=cancel;window.addEventListener('blur',cancel);
canvas.onpointerup=e=>{if(e.button===0&&chargeAt!==null){chargeAt=null;strike();}drag=null;};
canvas.onkeydown=e=>{if(e.code==='ArrowLeft'||e.code==='KeyQ'||e.code==='KeyA'){e.preventDefault();orbit-=.09;}else if(e.code==='ArrowRight'||e.code==='KeyD'){e.preventDefault();orbit+=.09;}else if(e.code==='ArrowUp'){e.preventDefault();pitch=THREE.MathUtils.clamp(pitch-.05,-.2,.3);}else if(e.code==='ArrowDown'){e.preventDefault();pitch=THREE.MathUtils.clamp(pitch+.05,-.2,.3);}if(e.code==='Space'){e.preventDefault();if(!e.repeat&&!swing){chargeAt=performance.now();canvas.dataset.phase='armer';}}};canvas.onkeyup=e=>{if(e.code==='Space'){e.preventDefault();chargeAt=null;strike();}};
document.getElementById('wood-new').onclick=()=>{for(const m of active){scene.remove(m);m.geometry.dispose();}active=[];swing=null;chargeAt=null;spawn();};
document.getElementById('wood-sound').onclick=e=>{initAudio();muted=!muted;e.target.textContent=muted?'Son : non':'Son : oui';e.target.setAttribute('aria-pressed',!muted)};

const resize=()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()};new ResizeObserver(resize).observe(host);resize();spawn();let last=0;
function frame(t){const dt=Math.min(.035,(t-last)/1000||.016);last=t;wind.value=t/1000;camera.position.set(Math.sin(orbit)*1.55,2.3+pitch,Math.cos(orbit)*1.55);camera.lookAt(0,1.0+pitch*.35,0);if(shake>.001){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake*=.83}camera.updateMatrixWorld();
cameraPose(restPose,new THREE.Vector3(.44,-.78,-1.15),new THREE.Vector3(-.22,.92,-.32),new THREE.Vector3(-.4,0,-1));
cameraPose(raisedPose,new THREE.Vector3(.34,-.42,-.95),new THREE.Vector3(.08,.84,.52),new THREE.Vector3(0,.6,-1));
if(swing){const p=(t-swing.t)/1100;strikePose(hitPose,swing.target);if(p>=.53&&!swing.hit){swing.hit=true;impact();canvas.dataset.phase='impact';}
 if(p<.30){const u=p/.30,ease=u*u*(3-2*u);axe.position.lerpVectors(swing.from,raisedPose.position,ease);axe.quaternion.slerpQuaternions(swing.rotation,raisedPose.quaternion,ease);}
 else if(p<.53){const u=(p-.30)/.23,ease=u*u;axe.position.lerpVectors(raisedPose.position,hitPose.position,ease);axe.quaternion.slerpQuaternions(raisedPose.quaternion,hitPose.quaternion,ease);canvas.dataset.phase='frapper';}
 else if(p<.66){axe.position.copy(hitPose.position);axe.quaternion.copy(hitPose.quaternion);}
 else{const u=Math.min(1,(p-.66)/.34),ease=u*u*(3-2*u);axe.position.lerpVectors(hitPose.position,restPose.position,ease);axe.quaternion.slerpQuaternions(hitPose.quaternion,restPose.quaternion,ease);canvas.dataset.phase='retirer';}
 if(p>=1){swing=null;canvas.dataset.phase='repos';}
}else{const u=chargeAt===null?0:Math.min(1,(t-chargeAt)/650),ease=u*u*(3-2*u);axe.position.lerpVectors(restPose.position,raisedPose.position,ease);axe.quaternion.slerpQuaternions(restPose.quaternion,raisedPose.quaternion,ease);}
// chips: fly, bounce once, then lie flat on the ground
for(const c of chips){if(c.rest)continue;c.v.y-=9.8*dt;c.m.position.addScaledVector(c.v,dt);c.m.rotation.x+=c.s.x*dt;c.m.rotation.y+=c.s.y*dt;c.m.rotation.z+=c.s.z*dt;if(c.m.position.y<.005){c.m.position.y=.005;if(c.v.y<-1.2){c.v.y*=-.25;c.v.x*=.4;c.v.z*=.4;c.s.multiplyScalar(.3);}else{c.rest=true;c.m.rotation.set(0,c.m.rotation.y,0);}}}
// split pieces: thrown off the block, then carried onto the pile
for(let i=flying.length-1;i>=0;i--){const p=flying[i];p.time+=dt;
 if(p.phase==='fly'){p.v.y-=6*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=p.spin.x*dt;p.m.rotation.z+=p.spin.z*dt;if(p.m.position.y<.1||p.time>1.4){const s=pileSlot(p.m);Object.assign(p,{phase:'stack',time:0,from:p.m.position.clone(),q0:p.m.quaternion.clone(),to:s.pos,q1:s.q});}}
 else{const u=Math.min(1,p.time/.7),e=u*u*(3-2*u);p.m.position.lerpVectors(p.from,p.to,e);p.m.position.y+=Math.sin(u*Math.PI)*.5;p.m.quaternion.slerpQuaternions(p.q0,p.q1,e);if(u>=1){pile.push(p.m);flying.splice(i,1);update();}}}
if(audio&&t>birdAt){birdAt=t+4000+Math.random()*6500;chirp()}renderer.render(scene,camera);requestAnimationFrame(frame)}
window.addEventListener('keydown',e=>{if(e.target!==canvas&&!/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName)&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyQ','KeyD','KeyA'].includes(e.code))canvas.onkeydown(e);});window.addEventListener('keyup',e=>{if(e.target!==canvas&&e.code==='Space')canvas.onkeyup(e);});canvas.dataset.ready='true';requestAnimationFrame(frame);

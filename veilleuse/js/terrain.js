// Données pures du monde (aucun import Three.js) : hauteurs, implantation, puzzles, marées, props.
// Utilisable tel quel dans Node pour vérifier l'accessibilité des objectifs.
import {rng,fbm,lerp,smooth,clamp,dist} from './noise.js';

export const HALF=380;                 // chaque région fait 760 x 760 unités
export const WALK={speed:4.4,run:7.0,maxSlope:1.05,wade:.6,swim:.6};
export const TIDE={period:150,low:-1.0,high:.9};
export const tideLevel=t=>{const m=(TIDE.low+TIDE.high)/2,a=(TIDE.high-TIDE.low)/2;return m+a*Math.cos((t/TIDE.period)*Math.PI*2+Math.PI*.15)};

const DIRS=[...Array(8)].map((_,k)=>[Math.cos(k*Math.PI/4),Math.sin(k*Math.PI/4)]);
// Un puzzle : un prisme source, des miroirs aux coudes, une stèle cible.
function buildPuzzle(id,src,dirs,lens,seed){
  const pts=[src];let p=src;const r=rng(seed);
  for(let i=0;i<dirs.length;i++){p={x:p.x+DIRS[dirs[i]][0]*lens[i],z:p.z+DIRS[dirs[i]][1]*lens[i]};pts.push(p)}
  const mirrors=[];
  for(let i=1;i<pts.length-1;i++){
    const ain=dirs[i-1]*Math.PI/4,aout=dirs[i]*Math.PI/4;
    const need=((Math.round((((ain+aout)/2)%Math.PI+Math.PI)%Math.PI/(Math.PI/8)))%8+8)%8;
    const start=(need+1+Math.floor(r()*6))%8;
    mirrors.push({x:pts[i].x,z:pts[i].z,need,state:start});
  }
  return {id,src:pts[0],dir:dirs[0],mirrors,target:pts[pts.length-1]};
}
export function mirrorAngle(state){return state*Math.PI/8}

function withSites(base,sites){
  const sh=sites.map(s=>({...s,h:base(s.x,s.z)}));
  return (x,z)=>{let h=base(x,z);for(const s of sh){const d=Math.hypot(x-s.x,z-s.z);if(d<s.r*2){const w=1-smooth(s.r,s.r*2,d);h+=(s.h-h)*w}}return h};
}

export const REGION_IDS=['forest','crystal','shore'];

// Bordure du monde : au-delà de ~365 unités le terrain se relève en massifs, assez raides pour bloquer la marche.
// Le rendu s'étend jusqu'à HALF + EXTRA ; le brouillard fond le reste.
export const EXTRA=190,RIM0=362,RIM1=445;
export const rimE=(x,z)=>Math.pow(Math.pow(Math.abs(x)/HALF,4)+Math.pow(Math.abs(z)/HALF,4),.25)*HALF;
const RIM_A={forest:64,crystal:72,shore:54};
function rimHeight(R,x,z){
  const e=rimE(x,z);if(e<RIM0)return 0;
  const t=smooth(RIM0,RIM1,e),seed=R.seed||7;
  const ridge=1-Math.abs(fbm(x*.011+5,z*.011,seed,3));
  let h=RIM_A[R.id]*(.62+.7*ridge)*Math.pow(t,1.2)+9*t*fbm(x*.045,z*.045,seed+9,3);
  if(R.id==='crystal'){const st=9,q=h/st;h=(Math.floor(q)+smooth(.82,1,q-Math.floor(q)))*st}   // gradins taillés comme le plateau
  if(R.id==='shore'){const c=R.coast(x);h*=smooth(c+40,c-30,z)}                                  // la mer reste ouverte
  return h;
}

export function makeRegion(id){
  const R=({forest,crystal,shore})[id]();
  R.id=id;R.half=HALF;
  const inner=R.baseHeight;R.baseHeight=(x,z)=>inner(x,z)+rimHeight(R,x,z);
  const sites=[];
  for(const f of R.layout.foyers)sites.push({x:f.x,z:f.z,r:5});
  for(const s of R.layout.steles)sites.push({x:s.x,z:s.z,r:7});
  sites.push({x:R.layout.gate.x,z:R.layout.gate.z,r:10});
  for(const r of R.layout.relics)sites.push({x:r.x,z:r.z,r:3});
  for(const p of R.layout.puzzles||[]){sites.push({x:p.src.x,z:p.src.z,r:5},{x:p.target.x,z:p.target.z,r:5});for(const m of p.mirrors)sites.push({x:m.x,z:m.z,r:4})}
  if(R.layout.islets)for(const i of R.layout.islets)sites.push({x:i.x,z:i.z,r:i.r});
  R.sites=sites;
  R.height=withSites(R.baseHeight,sites);
  R.waterLevelAt=R.waterLevelAt||(()=>null);
  R.depthAt=(x,z,t)=>{const w=R.waterLevelAt(t);return w==null?0:Math.max(0,w-R.height(x,z))};
  return R;
}

// ------------------------------------------------------------------ FORET DE LA PLUIE
function forest(){
  const seed=1701,wl=-.9;
  const base=(x,z)=>{
    let h=4.2*fbm(x*.0038,z*.0038,seed,4)+1.1*fbm(x*.018,z*.018,seed+9,3)+1.6;
    const m=smooth(-170,-235,z);                 // marais au nord
    const islands=Math.max(0,fbm(x*.03,z*.03,seed+4,3)+.12)*2.6;
    h=lerp(h,-1.5+islands,m);
    return h;
  };
  const layout={
    spawn:{x:-310,z:290},
    foyers:[{id:'F0',x:-310,z:290},{id:'F1',x:-90,z:60},{id:'F2',x:190,z:110},{id:'F3',x:180,z:-140},{id:'F4',x:-40,z:-185},{id:'F5',x:-150,z:-275}],
    steles:[{id:'S1',x:-190,z:200,kind:'flame'},{id:'S2',x:60,z:170,kind:'flame'},{id:'S3',x:290,z:-30,kind:'flame'},{id:'S4',x:40,z:-120,kind:'flame'},{id:'S5',x:-250,z:-300,kind:'flame',storm:true}],
    relics:[{id:'a',x:-335,z:110},{id:'b',x:-60,z:330},{id:'c',x:335,z:215},{id:'d',x:335,z:-300},{id:'e',x:120,z:-50},{id:'f',x:-215,z:-105}],
    gate:{x:-335,z:-235,need:{relics:5}},
    route:[[-310,290],[-190,200],[-90,60],[60,170],[190,110],[290,-30],[180,-140],[40,-120],[-40,-185],[-150,-275],[-250,-300],[-335,-235]]
  };
  const shelters=[];
  for(let i=0;i<layout.route.length-1;i++){
    const [ax,az]=layout.route[i],[bx,bz]=layout.route[i+1],L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.floor(L/55));
    for(let k=1;k<=n;k++){const t=k/(n+1),nx=-(bz-az)/L,nz=(bx-ax)/L,side=((i+k)%2?1:-1)*9;
      shelters.push({x:ax+(bx-ax)*t+nx*side,z:az+(bz-az)*t+nz*side,r:5.2,marsh:az<-190&&bz<-190})}
  }
  layout.shelters=shelters;
  return {name:'Averse',sub:'I',palette:'forest',baseHeight:base,layout,
    waterLevelAt:()=>wl,waterStatic:wl,
    env:{rain:true,ambient:.24,sun:.85,sunDir:[-.55,.5,.4],fogNear:60,fogFar:240,lantern:1,drain:{dry:.9,storm:3.0}}};
}

// ------------------------------------------------------------------ PLATEAU DES CRISTAUX
function crystal(){
  const seed=2203,step=3.4;
  const base=(x,z)=>{
    const b=17*(fbm(x*.0036,z*.0036,seed,3)*.5+.5);
    const t=b/step,fl=Math.floor(t),fr=t-fl;
    const m=fbm(x*.0085+40,z*.0085-17,seed+3,2);
    const ter=(fl+smooth(.965,1,fr))*step;
    return lerp(b,ter,smooth(-.2,-.04,m))+.5*fbm(x*.05,z*.05,seed+7,2);
  };
  const P=[
    buildPuzzle('P1',{x:-290,z:255},[0,6],[60,45],11),
    buildPuzzle('P2',{x:-150,z:80},[1,0,7],[48,42,48],12),
    buildPuzzle('P3',{x:60,z:200},[7,0,2,1],[50,55,60,40],13),
    buildPuzzle('P4',{x:240,z:-10},[6,5,4,7],[45,40,52,36],14),
    buildPuzzle('P5',{x:-20,z:-260},[0,1,2,3,4],[65,40,50,40,60],15)
  ];
  const layout={
    spawn:{x:-335,z:300},
    foyers:[{id:'F0',x:-335,z:300},{id:'F1',x:-195,z:110},{id:'F2',x:110,z:210},{id:'F3',x:280,z:40},{id:'F4',x:50,z:-150}],
    steles:P.map((p,i)=>({id:'S'+(i+1),x:p.target.x,z:p.target.z,kind:'puzzle',puzzle:p.id})),
    puzzles:P,
    relics:[{id:'a',x:-340,z:-60},{id:'b',x:-120,z:330},{id:'c',x:330,z:310},{id:'d',x:345,z:-190},{id:'e',x:-130,z:-170},{id:'f',x:150,z:-330}],
    gate:{x:-330,z:-300,need:{relics:5}},
    route:[[-335,300],[-290,255],[-195,110],[-150,80],[60,200],[110,210],[240,-10],[280,40],[50,-150],[-20,-260],[-330,-300]]
  };
  return {name:'Prisme',sub:'II',palette:'crystal',baseHeight:base,layout,
    env:{rain:false,ambient:.22,sun:1.0,sunDir:[.55,.42,.35],fogNear:90,fogFar:330,lantern:.8,drain:{dry:0,storm:0}}};
}

// ------------------------------------------------------------------ RIVAGE DES MAREES
function shore(){
  const seed=3307;
  const coast=x=>130+36*fbm(x*.006,3,seed,2);
  const islets=[{x:-110,z:120,r:20},{x:105,z:135,r:20},{x:265,z:105,r:22}];
  const base=(x,z)=>{
    const d=coast(x)-z;                                   // d>0 : vers l'intérieur des terres
    let h;
    if(d<0)h=lerp(-3.6,-.6,smooth(-130,0,d));
    else h=-.6+2.2*smooth(0,230,d)+Math.max(0,d-230)*.005+1.9*fbm(x*.011,z*.011,seed+2,3)*smooth(120,260,d);
    // criques de marée : ruisseaux sinueux, fonds à -1,45, franchissables seulement à marée basse
    const ridge=1-Math.abs(fbm(x*.012+9,z*.012,seed+5,3));
    const win=smooth(8,40,d)*(1-smooth(190,230,d));
    const creek=smooth(.84,.93,ridge)*win;
    h=lerp(h,Math.min(h,-1.45+.2*fbm(x*.05,z*.05,seed+6,2)),creek);
    h+=.35*fbm(x*.045,z*.045,seed+8,2)*(1-creek);
    for(const i of islets){const dd=Math.hypot(x-i.x,z-i.z);h=Math.max(h,lerp(h,2.1,1-smooth(i.r*.7,i.r*1.8,dd)))}
    return h;
  };
  // points de relique exposés seulement à marée basse : on cherche une cuvette basse près du point visé
  const lowSpot=(hx,hz)=>{let best={x:hx,z:hz,e:9};for(let dx=-60;dx<=60;dx+=4)for(let dz=-60;dz<=60;dz+=4){const x=hx+dx,z=hz+dz,h=base(x,z);const e=Math.abs(h+.85)+Math.hypot(dx,dz)*.004;if(e<best.e)best={x,z,e}}return {x:best.x,z:best.z}};
  const rel=[['a',-300,60],['b',-30,150],['c',190,90],['d',330,170]].map(([id,x,z])=>({id,...lowSpot(x,z),tide:true}));
  const layout={
    spawn:{x:-335,z:-250},
    foyers:[{id:'F0',x:-335,z:-250},{id:'F1',x:-170,z:-20},{id:'F2',x:10,z:60},{id:'F3',x:340,z:-20}],
    steles:[{id:'S1',x:-230,z:-80,kind:'flame'},{id:'S2',x:-110,z:120,kind:'tide'},{id:'S3',x:105,z:135,kind:'tide'},{id:'S4',x:265,z:105,kind:'tide'},{id:'S5',x:330,z:-130,kind:'flame'}],
    islets,
    relics:[...rel,{id:'e',x:-250,z:-300},{id:'f',x:120,z:-250}],
    gate:{x:340,z:-250,need:{relics:5}},
    route:[[-335,-250],[-230,-80],[-170,-20],[-110,120],[10,60],[105,135],[265,105],[340,-20],[330,-130],[340,-250]]
  };
  return {name:'Étale',sub:'III',palette:'shore',baseHeight:base,layout,coast,
    waterLevelAt:t=>tideLevel(t),
    env:{rain:false,ambient:.5,sun:.95,sunDir:[-.55,.5,.45],fogNear:120,fogFar:420,lantern:.6,drain:{dry:0,storm:0,wade:5}}};
}

// ------------------------------------------------------------------ marche
export function canStep(R,x,z,nx,nz,t){
  if(Math.abs(nx)>HALF+60||Math.abs(nz)>HALF+60)return false;
  const d=Math.hypot(nx-x,nz-z)||1e-6,dh=Math.abs(R.height(nx,nz)-R.height(x,z));
  if(dh/d>WALK.maxSlope)return false;
  if(R.depthAt(nx,nz,t)>WALK.swim)return false;
  return true;
}

// ------------------------------------------------------------------ props
export function genProps(R){
  const r=rng(R.id==='forest'?91:R.id==='crystal'?92:93);
  const P={trees:[],rocks:[],slabs:[],crystals:[],bushes:[]};
  const keepOut=(x,z,pad=0)=>{for(const s of R.sites){if(Math.hypot(x-s.x,z-s.z)<s.r+pad)return true}return false};
  const t0=R.id==='shore'?0:0;
  const ok=(x,z,maxDepth=0)=>R.depthAt(x,z,t0)<=maxDepth&&!keepOut(x,z,3);
  const place=(arr,n,f)=>{let tries=0;while(arr.length<n&&tries++<n*30){const x=(r()*2-1)*(HALF-8),z=(r()*2-1)*(HALF-8);f(x,z,arr)}};
  if(R.id==='forest'){
    for(const s of R.layout.shelters)P.trees.push({x:s.x,z:s.z,s:s.marsh?0:2.2,big:true,arch:s.marsh,rot:r()*6.28});
    P.trees=P.trees.filter(t=>t.s>0);
    P.arches=R.layout.shelters.filter(s=>s.marsh).map(s=>({x:s.x,z:s.z,rot:r()*6.28}));
    place(P.trees,4600,(x,z,a)=>{const d=fbm(x*.02,z*.02,5,2);if(d<-.18)return;if(!ok(x,z))return;a.push({x,z,s:.8+r()*.9,rot:r()*6.28})});
    place(P.rocks,160,(x,z,a)=>{if(!ok(x,z))return;a.push({x,z,s:.8+r()*2.4,rot:r()*6.28})});
    place(P.slabs,16,(x,z,a)=>{if(!ok(x,z,0)||Math.hypot(x-R.layout.spawn.x,z-R.layout.spawn.z)<40)return;a.push({x,z,w:6+r()*6,h:12+r()*16,d:3+r()*2,rot:r()*6.28,tilt:(r()-.5)*.12})});
    place(P.bushes,900,(x,z,a)=>{if(!ok(x,z))return;a.push({x,z,s:.5+r()*.8})});
  }else if(R.id==='crystal'){
    place(P.crystals,150,(x,z,a)=>{if(!ok(x,z))return;a.push({x,z,s:1.4+r()*3.6,rot:r()*6.28,n:1+Math.floor(r()*3)})});
    place(P.rocks,130,(x,z,a)=>{if(!ok(x,z))return;a.push({x,z,s:.8+r()*2.2,rot:r()*6.28})});
    place(P.trees,170,(x,z,a)=>{if(!ok(x,z))return;a.push({x,z,s:.9+r()*.8,rot:r()*6.28,dead:true})});
    place(P.slabs,10,(x,z,a)=>{if(!ok(x,z))return;a.push({x,z,w:5+r()*5,h:10+r()*12,d:3,rot:r()*6.28,tilt:(r()-.5)*.2})});
    place(P.bushes,260,(x,z,a)=>{if(!ok(x,z))return;a.push({x,z,s:.6+r()*.7})});
  }else{
    place(P.slabs,70,(x,z,a)=>{if(R.depthAt(x,z,0)>0||R.height(x,z)<-.2||keepOut(x,z,4))return;a.push({x,z,w:5+r()*9,h:1.4+r()*3,d:3+r()*5,rot:r()*6.28,tilt:(r()-.5)*.08,flat:true})});
    place(P.rocks,140,(x,z,a)=>{if(R.height(x,z)<-.9||keepOut(x,z,3))return;a.push({x,z,s:.6+r()*1.8,rot:r()*6.28})});
    place(P.bushes,160,(x,z,a)=>{if(R.height(x,z)<.6||keepOut(x,z,3))return;a.push({x,z,s:.5+r()*.6})});
    // ruines monumentales sur chaque îlot et autour de la porte
    for(const i of R.layout.islets)for(let k=0;k<6;k++){const a=k/6*6.28+r(),d=i.r*.7+r()*4;P.slabs.push({x:i.x+Math.cos(a)*d,z:i.z+Math.sin(a)*d,w:3+r()*5,h:3+r()*6,d:2+r()*2.5,rot:a,tilt:(r()-.5)*.1,flat:true})}
  }
  // massifs de bordure : mêmes familles d'objets que la zone, en grand
  const rimPlace=(arr,n,e0,e1,f)=>{let tries=0;const R2=HALF+EXTRA-12,goal=arr.length+n;while(arr.length<goal&&tries++<n*40){const x=(r()*2-1)*R2,z=(r()*2-1)*R2,e=rimE(x,z);if(e<e0||e>e1)continue;f(x,z,arr)}};
  if(R.id==='forest'){
    const rt=[];rimPlace(rt,3200,350,500,(x,z,a)=>{if(R.height(x,z)>34||fbm(x*.02,z*.02,5,2)<-.25)return;a.push({x,z,s:1.2+r()*1.3,rot:r()*6.28})});P.trees.push(...rt);
    rimPlace(P.slabs,26,372,520,(x,z,a)=>{a.push({x,z,w:9+r()*10,h:22+r()*30,d:5+r()*4,rot:r()*6.28,tilt:(r()-.5)*.14})});
  }else if(R.id==='crystal'){
    rimPlace(P.crystals,110,352,500,(x,z,a)=>a.push({x,z,s:5+r()*12,rot:r()*6.28,n:1+Math.floor(r()*3)}));
    rimPlace(P.slabs,22,372,520,(x,z,a)=>a.push({x,z,w:8+r()*9,h:24+r()*30,d:5,rot:r()*6.28,tilt:(r()-.5)*.2}));
  }else{
    rimPlace(P.slabs,56,360,520,(x,z,a)=>{if(R.height(x,z)<1.5)return;a.push({x,z,w:8+r()*14,h:16+r()*30,d:6+r()*6,rot:r()*6.28,tilt:(r()-.5)*.1,flat:true})});
    // piliers marins et récifs au large
    let tries=0;while(P.slabs.length<200&&tries++<4000){const x=(r()*2-1)*(HALF+EXTRA-20),z=R.coast(x)+60+r()*(HALF+EXTRA-R.coast(x)-80);if(z>HALF+EXTRA-20)continue;if(R.height(x,z)>-2.2)continue;P.slabs.push({x,z,w:3+r()*7,h:7+r()*24,d:3+r()*6,rot:r()*6.28,tilt:(r()-.5)*.08})}
  }
  // colliders : seulement dans la zone jouable
  const C=[];
  for(const t of P.trees)C.push({x:t.x,z:t.z,r:t.s>1.5?1.6:.45*t.s+.2});
  for(const t of P.rocks)C.push({x:t.x,z:t.z,r:t.s*.8});
  for(const t of P.slabs)C.push({x:t.x,z:t.z,r:Math.max(t.w,t.d)*.5});
  for(const t of P.crystals)C.push({x:t.x,z:t.z,r:t.s*.35+.4});
  for(const t of P.arches||[])C.push({x:t.x-1.8*Math.cos(t.rot),z:t.z-1.8*Math.sin(t.rot),r:.9},{x:t.x+1.8*Math.cos(t.rot),z:t.z+1.8*Math.sin(t.rot),r:.9});
  P.colliders=C.filter(c=>Math.abs(c.x)<HALF+10&&Math.abs(c.z)<HALF+10);
  return P;
}

export function colliderGrid(list,cell=10){
  const g=new Map(),k=(i,j)=>i*100003+j;
  for(const c of list){const i=Math.floor(c.x/cell),j=Math.floor(c.z/cell),key=k(i,j);(g.get(key)||g.set(key,[]).get(key)).push(c)}
  return {query(x,z,rad,fn){const i0=Math.floor((x-rad-8)/cell),i1=Math.floor((x+rad+8)/cell),j0=Math.floor((z-rad-8)/cell),j1=Math.floor((z+rad+8)/cell);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const a=g.get(k(i,j));if(a)for(const c of a)fn(c)}}};
}

// Solveur de faisceau : renvoie les segments et indique si la cible est touchée.
export function traceBeam(p){
  const pts=[{x:p.src.x,z:p.src.z}];let ang=p.dir*Math.PI/4,cx=p.src.x,cz=p.src.z,last=-1,hit=false;
  for(let b=0;b<12;b++){
    const dx=Math.cos(ang),dz=Math.sin(ang);let best=null,bd=1e9,bi=-1;
    p.mirrors.forEach((m,i)=>{if(i===last)return;const vx=m.x-cx,vz=m.z-cz,al=vx*dx+vz*dz,pe=Math.abs(vx*dz-vz*dx);if(al>.5&&pe<1.1&&al<bd){bd=al;best=m;bi=i}});
    const vx=p.target.x-cx,vz=p.target.z-cz,al=vx*dx+vz*dz,pe=Math.abs(vx*dz-vz*dx);
    if(al>.5&&pe<1.6&&al<bd){pts.push({x:p.target.x,z:p.target.z});hit=true;break}
    if(!best){pts.push({x:cx+dx*70,z:cz+dz*70});break}
    pts.push({x:best.x,z:best.z});cx=best.x;cz=best.z;last=bi;ang=2*mirrorAngle(best.state)-ang;
  }
  return {pts,hit};
}
export const solved=p=>traceBeam(p).hit;

export function nearestFree(R,x,z,t){
  for(let rad=0;rad<80;rad+=2)for(let a=0;a<12;a++){const nx=x+Math.cos(a*.52)*rad,nz=z+Math.sin(a*.52)*rad;if(R.depthAt(nx,nz,t)<.2&&canStep(R,nx,nz,nx,nz,t))return {x:nx,z:nz}}
  return {x,z};
}

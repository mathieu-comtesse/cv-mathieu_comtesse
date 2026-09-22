import * as THREE from './three.module.js';
/* Atlas du parcours : une île en origami. Les bâtiments, arbres, véhicules et l’île elle-même sont modélisés dans Blender
   (tools/blender-atlas.py → atlas-models.json) en papier plié : facettes, plis et ombrage plat. Chaque étape du parcours
   est un bâtiment ; les œufs de Pâques sont des objets cliquables comptés dans le coin de l’écran. */
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.95,metalness:0,flatShading:true,...extra});
const canvas=document.getElementById('world-canvas'),host=canvas.parentElement,card=document.getElementById('world-card'),eggsHud=document.getElementById('world-eggs'),hint=document.getElementById('world-hint');
const INK='#1e1e1e',PAPER='#fefefe',ORANGE='#ff8a3d',GRASS='#cfe9c2',ROCK='#d9d3c7',WATER='#cfe6ee';
const paperMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0,flatShading:true,side:THREE.DoubleSide});
const models=await fetch('atlas-models.json?v=20260923-2').then(r=>r.json());
// Folded-paper meshes: one colour per facet (baked in Blender), flat shading and faint crease lines.
function origami(name,scale=1,creases=true){const m=models[name],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(m.position,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(m.normal,3));const col=new Float32Array(m.position.length),lin=c=>{c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);};for(let i=0;i<m.color.length;i+=3)for(let k=0;k<3;k++){col[i*3+k*3]=lin(m.color[i]);col[i*3+k*3+1]=lin(m.color[i+1]);col[i*3+k*3+2]=lin(m.color[i+2]);}geo.setAttribute('color',new THREE.BufferAttribute(col,3));
 const mesh=new THREE.Mesh(geo,paperMat);mesh.castShadow=mesh.receiveShadow=true;mesh.scale.setScalar(scale);
 if(creases){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo,24),new THREE.LineBasicMaterial({color:'#5a5248',transparent:true,opacity:.28}));mesh.add(l);}return mesh;}
const steps=[
 {id:'usp',name:'Université Sorbonne Paris Nord',role:'Master MQSE (M1 validé le 22 juin 2026, M2 en cours)',text:'Maintenance, Qualité, Sécurité, Environnement. Mémoire sur le suivi des plans de prévention et de la coactivité.',pos:[-3.2,0,-1.6],kind:'campus'},
 {id:'sncf',name:'SNCF Gares & Connexions',role:'Alternance · Assistant Sécurité & Production, ABE Sud Île-de-France',text:'Prévention terrain, plans de prévention, coactivité et équipements EPM / EPTx.',pos:[2.6,0,-2.2],kind:'station'},
 {id:'reseau',name:'SNCF Réseau',role:'Expérience · environnement ferroviaire',text:'Sécurité des circulations et coordination des travaux sur le réseau. (Dates et missions à préciser.)',pos:[1.6,0,3.4],kind:'signal'},
 {id:'studio',name:'Studio d’extracteurs PDF',role:'Projet · extraction CERFA, VRE et rapports',text:'Les PDF sont lus, structurés et contrôlés : les écarts apparaissent sans relire page par page.',pos:[3.4,0,1.4],kind:'workshop'},
 {id:'bi',name:'Portail Power BI',role:'Projet · tableaux de bord de coactivité',text:'Rapports déployés pour l’équipe au printemps 2026, puis industrialisés avec Power Automate.',pos:[-0.2,0,2.9],kind:'tower'},
 {id:'lean',name:'Dojo Lean Six Sigma',role:'Yellow Belt · ISO 9001 / 45001 / 14001 / 27001',text:'Analyse des causes, amélioration continue et référentiels qualité, sécurité, environnement et sécurité de l’information.',pos:[-3.4,0,1.8],kind:'dojo'},
 {id:'perso',name:'Stade des projets perso',role:'Timber !, Route & vigilance, Labyrinthe, Rubik, Sandboard',text:'Le terrain de jeu Three.js et Canvas du site.',pos:[0,0,0],kind:'arcade',link:'projets-perso.html'},
];
const SPREAD=1.24;// how far the buildings sit from the centre
const footprint=kind=>{const g=models[kind].position;let hx=0,hz=0;for(let i=0;i<g.length;i+=3){hx=Math.max(hx,Math.abs(g[i]));hz=Math.max(hz,Math.abs(g[i+2]));}return Math.hypot(hx,hz);};
const eggs=new Map();let found=0,night=false,paused=false,dragging=null,spin=0,spinVel=.0018,pitch=.62,zoom=28,audio=null,muted=false,pinch=null;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(PAPER);const camera=new THREE.PerspectiveCamera(30,1,.1,100);
const world=new THREE.Group();scene.add(world);
const hemi=new THREE.HemisphereLight('#ffffff','#b9c4c8',.85),sun=new THREE.DirectionalLight('#fff4e0',1.7);sun.position.set(6,10,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8});scene.add(hemi,sun);
const edges=(mesh,color='#8f8a80')=>{const l=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,28),new THREE.LineBasicMaterial({color,transparent:true,opacity:.55}));mesh.add(l);return mesh;};
const box=(w,h,d,color,x=0,y=0,z=0,outline=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return outline?edges(m):m;};
// --- Island folded in Blender.
const island=origami('island',1.65);world.add(island);scene.updateMatrixWorld(true);
const down=new THREE.Raycaster();function groundY(x,z,fallback=null){down.set(new THREE.Vector3(x,8,z),new THREE.Vector3(0,-1,0));const h=down.intersectObject(island,false)[0];return h?h.point.y:(fallback??0);}
const groundMax=(x,z,rad=.6)=>{let y=groundY(x,z);for(let i=0;i<8;i++){const a=i/8*Math.PI*2,cx=Math.cos(a)*rad,cz=Math.sin(a)*rad;y=Math.max(y,groundY(x+cx,z+cz,y),groundY(x+cx*.55,z+cz*.55,y));}return y;};
// The island is not a disc: for a bearing, find the last radius where the ground is still well above the sea.
const shoreRadius=(a,minY=.06)=>{const cx=Math.cos(a),cz=Math.sin(a);for(let r=9.4;r>3;r-=.15){if(groundY(cx*r,cz*r,-9)>minY)return r;}return 6.5;};
// --- Sea: a faceted sheet that folds and unfolds, ringed by paper wave crests.
const seaGeo=(()=>{const rings=24,segs=72,R=18,pos=[],idx=[];pos.push(0,0,0);for(let r=1;r<=rings;r++)for(let i=0;i<segs;i++){const a=i/segs*Math.PI*2,rad=R*r/rings*(r===rings?1+Math.sin(a*5)*.03:1);pos.push(Math.cos(a)*rad,0,Math.sin(a)*rad);}
 for(let i=0;i<segs;i++)idx.push(0,1+i,1+(i+1)%segs);for(let r=1;r<rings;r++)for(let i=0;i<segs;i++){const a=1+(r-1)*segs+i,b=1+(r-1)*segs+(i+1)%segs,c=1+r*segs+(i+1)%segs,d=1+r*segs+i;idx.push(a,b,c,a,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);return g.toNonIndexed();})();const seaBase=seaGeo.attributes.position.array.slice();
const seaCol=new Float32Array(seaGeo.attributes.position.count*3);for(let i=0;i<seaCol.length;i+=3){const k=.9+Math.random()*.2;seaCol[i]=.08*k;seaCol[i+1]=.45*k;seaCol[i+2]=.57*k;}seaGeo.setAttribute('color',new THREE.BufferAttribute(seaCol,3));
const water=new THREE.Mesh(seaGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:.05,flatShading:true}));water.position.y=-.5;water.receiveShadow=true;scene.add(water);
// The sea surface, exactly as the sheet above is folded (it only moves vertices up and down).
const seaY=(x,z,t)=>-.5+Math.sin(x*.9+t*1.1)*.07+Math.sin(z*1.3-t*.9)*.06+Math.sin((x+z)*.5+t*.6)*.05;
// Where the beach meets the water, bearing by bearing: the first ground above sea level, coming in from the open sea.
const waterline=(()=>{const N=120,r=new Float32Array(N);for(let i=0;i<N;i++){const a=i/N*Math.PI*2,cx=Math.cos(a),cz=Math.sin(a);let k=12;while(k>4&&groundY(cx*k,cz*k,-9)<-.47)k-=.08;r[i]=k;}
 return a=>{const f=((a/(Math.PI*2))%1+1)%1*N,i=Math.floor(f),w=f-i;return r[i%N]*(1-w)+r[(i+1)%N]*w;};})();
const offIslet=a=>{const d=Math.atan2(Math.sin(a-.35),Math.cos(a-.35));return Math.abs(d)<.17?a+(d<0?-.34:.34):a;};// .35 is the islet's bearing
const foamGeo=(()=>{const g=new THREE.CircleGeometry(.5,14,-Math.PI*.9,Math.PI*.8);g.rotateX(-Math.PI/2);return g;})();
const waves=[];for(let i=0;i<36;i++){const w=origami('wave',1,false);w.castShadow=false;w.material=paperMat.clone();w.material.transparent=true;
 const foam=new THREE.Mesh(foamGeo,new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false}));scene.add(w,foam);
 w.userData={a:offIslet(i/36*Math.PI*2+Math.random()*.12),d:.6+Math.random()*4.2,speed:.32+Math.random()*.22,scale:.8+Math.random()*.5,phase:'in',age:1+Math.random(),foam};waves.push(w);}
for(let i=0;i<9;i++){const a=i/9*Math.PI*2+.4,r=7.2+Math.sin(i*3.3)*.5,st=origami('stone',.5+Math.random()*.6);st.position.set(Math.cos(a)*r,groundY(Math.cos(a)*r,Math.sin(a)*r)-.05,Math.sin(a)*r);st.rotation.set(Math.random(),Math.random()*6,Math.random());world.add(st);}
// --- Paths: a loop of flat ribbon linking every building.
const groundCurve=(points,lift,samples)=>{const base=new THREE.CatmullRomCurve3(points,true,'catmullrom',.6),pts=[];for(let i=0;i<samples;i++){const p=base.getPointAt(i/samples);pts.push(new THREE.Vector3(p.x,groundY(p.x,p.z)+lift,p.z));}return new THREE.CatmullRomCurve3(pts,true,'catmullrom',.5);};
function ribbon(curve,halfWidth,lift,color,segments=320,across=4,closed=true){const pos=[],idx=[],up=new THREE.Vector3(0,1,0),t=new THREE.Vector3(),n=new THREE.Vector3();
 // Every vertex — edges included — is dropped onto the ground, with the centre height as a fallback, so the strip never tears.
 for(let i=0;i<=segments;i++){const u=closed?(i/segments)%1:Math.min(.999,i/segments),p=curve.getPointAt(u);t.copy(curve.getTangentAt(u)).setY(0).normalize();n.crossVectors(up,t).normalize();
  const mid=groundY(p.x,p.z);for(let k=0;k<=across;k++){const w=(k/across*2-1)*halfWidth,x=p.x+n.x*w,z=p.z+n.z*w;pos.push(x,groundY(x,z,mid)+lift,z);}}
 const row=across+1;for(let i=0;i<segments;i++)for(let k=0;k<across;k++){const a=i*row+k,b=a+1,c2=a+row,d=c2+1;idx.push(a,c2,b,b,c2,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const m=new THREE.Mesh(geo,mat(color,{polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));m.receiveShadow=true;return m;}
// A ring road inside the buildings, plus a short driveway from the ring to each doorstep: it links them, never crosses them.
const ringRadius=1.72;
const loop=groundCurve(Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return new THREE.Vector3(Math.cos(a)*ringRadius,0,Math.sin(a)*ringRadius);}),.12,320);
const road=ribbon(loop,.24,.09,'#e9c98d',420,4,true);world.add(road);
for(const step of steps){const x=step.pos[0]*SPREAD,z=step.pos[2]*SPREAD,r=Math.hypot(x,z),a=Math.atan2(z,x);
 if(r<ringRadius+.5)continue;// the arcade sits inside the ring
 const stopR=Math.max(ringRadius+.35,r-footprint(step.kind)-.18);// stop at the doorstep, never under the walls
 const from=new THREE.Vector3(Math.cos(a)*ringRadius,0,Math.sin(a)*ringRadius),to=new THREE.Vector3(Math.cos(a)*stopR,0,Math.sin(a)*stopR);
 const spur=new THREE.CatmullRomCurve3([from,from.clone().lerp(to,.5),to],false,'catmullrom',.5);
 world.add(ribbon(spur,.19,.09,'#e9c98d',48,3,false));}
// --- Buildings by kind.
const windows=[];function windowRow(group,w,h,d,rows,cols){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const win=new THREE.Mesh(new THREE.PlaneGeometry(.18,.22),new THREE.MeshStandardMaterial({color:'#dfe7ec',emissive:'#ffb94c',emissiveIntensity:0}));win.position.set(-w/2+(c+.5)*w/cols,.35+r*.42,d/2+.01);group.add(win);windows.push(win);const b=new THREE.LineSegments(new THREE.EdgesGeometry(win.geometry),new THREE.LineBasicMaterial({color:INK}));win.add(b);}}
function roof(w,d,h,color){const g=new THREE.Group();const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,h);shape.lineTo(w/2,0);shape.closePath();const m=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false}),mat(color));m.position.z=-d/2;m.castShadow=true;g.add(edges(m));return g;}
// The three aspects of the signal box's light, top to bottom on its head (heights from the Blender model).
const signal={aspect:0,t:0,glow:null,halo:null,aspects:[{c:'#39d98a',y:1.73,d:7},{c:'#ff9a2e',y:1.55,d:3.5},{c:'#9b5cf0',y:1.37,d:3.5}],
 set(k){this.aspect=(k%3+3)%3;this.t=0;const a=this.aspects[this.aspect];if(!this.glow)return;this.glow.position.set(.95,a.y,-.4);this.glow.material.color.set(a.c);this.halo.color.set(a.c);}};
function building(step){const g=new THREE.Group();g.position.set(step.pos[0]*SPREAD,groundMax(step.pos[0]*SPREAD,step.pos[2]*SPREAD,.8)-.02,step.pos[2]*SPREAD);g.userData.step=step;g.add(origami(step.kind));
 if(step.kind==='campus'){const bell=new THREE.Mesh(new THREE.LatheGeometry([[0,.1],[.03,.095],[.05,.06],[.06,.02],[.085,-.02],[.085,-.035],[0,-.035]].map(([x,y])=>new THREE.Vector2(x,y)),12),mat('#d9a441',{metalness:.35,roughness:.5}));bell.position.set(.72,2.95,0);g.add(bell);egg(bell,'cloche','La cloche de la fac sonne la fin du cours.',()=>tone([880,1175,1480],.5));}
 else if(step.kind==='station'){const hand=new THREE.Mesh(new THREE.PlaneGeometry(.03,.14),mat(PAPER));hand.position.set(0,.77,.66);g.add(hand);g.userData.hand=hand;const cat=new THREE.Group();const body=box(.28,.16,.14,INK,0,.08,0,false),head=box(.16,.14,.14,INK,.18,.16,0,false);cat.add(body,head);cat.position.set(.9,1.3,.2);g.add(cat);egg(cat,'chat','Un chat sur le toit de la gare : il miaule et saute.',()=>{tone([660,520],.25);cat.userData.jump=1;});g.userData.cat=cat;}
 else if(step.kind==='workshop'){const pdf=box(.35,.45,.05,PAPER,-.95,.25,.4);pdf.rotation.y=.4;g.add(pdf);egg(pdf,'pdf','Un PDF qui traîne : l’extracteur l’a déjà lu.',()=>{tone([440,880],.15);pdf.rotation.y+=Math.PI;});}
 else if(step.kind==='signal'){signal.glow=new THREE.Mesh(new THREE.SphereGeometry(.062,12,10),new THREE.MeshBasicMaterial({color:'#39d98a'}));signal.halo=new THREE.PointLight('#39d98a',.6,1.6);signal.glow.add(signal.halo);g.add(signal.glow);signal.set(0);
  egg(signal.glow,'signal','Le signal change d’aspect : vert, voie libre · orange, avertissement · violet, carré de manœuvre.',()=>{signal.set(signal.aspect+1);tone([988],.08);});}
 else if(step.kind==='tower'){const bulb=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),new THREE.MeshStandardMaterial({color:'#fff2b0',emissive:'#ffcc55',emissiveIntensity:.6}));bulb.position.y=3.42;g.add(bulb);egg(bulb,'ampoule','L’ampoule bascule le jour et la nuit.',()=>setNight(!night));const bars=[.5,.8,1.1];bars.forEach((h,i)=>{const bar=box(.14,h,.14,i===1?ORANGE:INK,-.85+i*.22,h/2,.8,false);g.add(bar);});}
 else if(step.kind==='dojo'){const belt=new THREE.Mesh(new THREE.TorusGeometry(.22,.05,8,24),mat('#ffd23f'));belt.position.set(0,.55,.78);g.add(belt);egg(belt,'ceinture','Une Yellow Belt Lean Six Sigma accrochée à la porte.',()=>{tone([523,659,784],.2);belt.userData.spin=1;});}
 else if(step.kind==='arcade'){// the games of the site, laid out on the pitch of the stadium
  const log=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.16,12),mat('#e0c9a6'));log.position.set(.36,.13,.1);g.add(edges(log));egg(log,'billot','Le billot de Timber ! — un coup de hache.',()=>{tone([120,90],.12);log.scale.y=.6;setTimeout(()=>log.scale.y=1,300);});
  const cube=box(.15,.15,.15,'#ffd23f',-.36,.125,-.08);g.add(cube);egg(cube,'rubik','Le Rubik’s Cube du banc tourne d’un quart.',()=>{cube.rotation.y+=Math.PI/2;tone([700],.08);});
  const sand=new THREE.Mesh(new THREE.CircleGeometry(.13,20),mat('#ffd9a8'));sand.rotation.x=-Math.PI/2;sand.position.set(-.08,.052,.14);g.add(sand);egg(sand,'sable','Une flaque de sable : le Sandboard en miniature.',()=>{tone([300,240],.2);sand.material.color.set('#ff9a3d');});
  const hedge=new THREE.Group();for(let i=0;i<3;i++){const h=box(.06,.13,.22,'#8fd39a',.08+i*.08,.115,-.12,false);hedge.add(h);}g.add(hedge);egg(hedge,'haie','La haie du Labyrinthe, taillée au carré.',()=>{tone([500,600,700,800],.1);hedge.scale.y=1.4;setTimeout(()=>hedge.scale.y=1,400);});}
 const label=makeLabel(step.name);label.position.y=(step.kind==='tower'?3.9:step.kind==='campus'?3.6:2);g.add(label);
 g.traverse(o=>{if(o.isMesh)o.userData.building=g;});world.add(g);return g;}
function makeLabel(text){const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');x.fillStyle=INK;x.fillRect(0,0,512,96);x.fillStyle=PAPER;x.fillRect(4,4,504,88);x.fillStyle=INK;let size=34;x.font=`bold ${size}px "JetBrains Mono",monospace`;while(x.measureText(text).width>470&&size>16){size-=2;x.font=`bold ${size}px "JetBrains Mono",monospace`;}x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,50);const t=new THREE.CanvasTexture(c);t.anisotropy=4;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));s.scale.set(1.5,.28,1);return s;}
function egg(obj,id,text,action){obj.traverse(o=>{o.userData.egg=id;});eggs.set(id,{obj,text,action,found:false});}
steps.forEach(building);
// --- Trees folded in Blender.
for(let i=0;i<26;i++){const a=i/26*Math.PI*2+Math.sin(i)*.3,r=4.9+Math.sin(i*2.3)*1.1;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(steps.some(s=>Math.hypot(s.pos[0]*SPREAD-x,s.pos[2]*SPREAD-z)<1.8))continue;const tree=origami(i%4===0?'blossom':i%3?'pine':'bush',.85+Math.random()*.4);tree.position.set(x,groundY(x,z)-.03,z);tree.rotation.y=Math.random()*6.3;world.add(tree);}
const lighthouse=new THREE.Group();lighthouse.add(origami('lighthouse'));const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.25,8),new THREE.MeshStandardMaterial({color:'#fff6c8',emissive:'#ffcc55',emissiveIntensity:.3,flatShading:true}));lamp.position.y=1.42;lighthouse.add(lamp);const beamPivot=new THREE.Group();beamPivot.position.y=1.42;lighthouse.add(beamPivot);const beam=new THREE.Mesh(new THREE.ConeGeometry(.7,4.5,20,1,true),new THREE.MeshBasicMaterial({color:'#ffe7a0',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));beam.rotation.z=Math.PI/2;beam.position.x=2.25;beamPivot.add(beam);const isletA=.35,isletR=Math.min(9.3,waterline(isletA)+1.9),isletX=Math.cos(isletA)*isletR,isletZ=Math.sin(isletA)*isletR;
const islet=origami('islet');islet.position.set(isletX,-.55,isletZ);islet.rotation.y=1.3;scene.add(islet);
const isletFoam=new THREE.Mesh(new THREE.RingGeometry(.58,.9,28),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.35,depthWrite:false}));isletFoam.rotation.x=-Math.PI/2;scene.add(isletFoam);
lighthouse.position.set(isletX,-.55+.54,isletZ);world.add(lighthouse);egg(lighthouse,'phare','Le phare s’allume et la nuit tombe sur l’île.',()=>{setNight(!night);tone([330,330],.3);});
// --- Moving things: a train, a white car, a boat, birds, a duck.
// The track: the coastline smoothed into a gentle loop, then pushed outside every building footprint so it
// never clips one, and never bent tighter than the rails themselves can be offset.
const rail=(()=>{const N=72,ang=Array.from({length:N},(_,i)=>i/N*Math.PI*2);
 const blur=(v,w,it)=>{for(let k=0;k<it;k++){const o=v.slice();v=o.map((_,i)=>{let t=0;for(let j=-w;j<=w;j++)t+=o[(i+j+N*2)%N];return t/(w*2+1);});}return v;};
 const coast=blur(ang.map(a=>shoreRadius(a)),5,3);
 // Each building keeps a no-go disc the size of its own footprint plus the ballast.
 const keep=steps.map(st=>({x:st.pos[0]*SPREAD,z:st.pos[2]*SPREAD,r:footprint(st.kind)+.45}));
 let rad=coast.map(r=>r-.9);
 for(let pass=0;pass<6;pass++){for(let i=0;i<N;i++){const cx=Math.cos(ang[i]),cz=Math.sin(ang[i]);
   for(const k of keep){const t=k.x*cx+k.z*cz,d=Math.abs(k.x*cz-k.z*cx);if(d<k.r)rad[i]=Math.max(rad[i],t+Math.sqrt(k.r*k.r-d*d));}
   rad[i]=Math.min(rad[i],coast[i]-.4);}
  if(pass<5)rad=blur(rad,2,1);}
 return groundCurve(ang.map((a,i)=>new THREE.Vector3(Math.cos(a)*rad[i],0,Math.sin(a)*rad[i])),.14,360);})();
const ballast=ribbon(rail,.3,.08,'#bfb7a6',360,3,true);world.add(ballast);
{const N=320,gauge=.11,railMat=mat('#f2f0ea'),sleeperMat=mat('#2b2b33'),up=new THREE.Vector3(0,1,0),side=new THREE.Vector3(),tan=new THREE.Vector3();
 const at=u=>{const p=rail.getPointAt(u);tan.copy(rail.getTangentAt(u));side.set(tan.x,0,tan.z).normalize().cross(up);return p;};
 for(const s of [-1,1]){const pts=[];for(let i=0;i<N;i++){const p=at(i/N),x=p.x+side.x*gauge*s,z=p.z+side.z*gauge*s;pts.push(new THREE.Vector3(x,Math.max(p.y+.07,groundY(x,z,p.y)+.15),z));}
  const r=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true,'centripetal'),N*2,.026,5,true),railMat);r.castShadow=true;world.add(r);}
 // Sleepers square to the track: x across it, z along it (pitch included), y the resulting up.
 const count=150,sleeper=new THREE.InstancedMesh(new THREE.BoxGeometry(.34,.035,.09),sleeperMat,count),m=new THREE.Matrix4(),yAxis=new THREE.Vector3(),zAxis=new THREE.Vector3();
 for(let i=0;i<count;i++){const p=at(i/count);zAxis.copy(tan).normalize();yAxis.crossVectors(zAxis,side).normalize();
  m.makeBasis(side,yAxis,zAxis).setPosition(p.x,p.y+.035,p.z);sleeper.setMatrixAt(i,m);}
 sleeper.castShadow=true;world.add(sleeper);}
// Each car rides on its own two bogies: the body is placed between them, so it pitches on the slopes,
// leans into the curves and never cuts a corner the way a single rigid model does.
const railLen=rail.getLength(),cars=[];
{let s=0;for(const [name,len] of [['loco',1.01],['tender',.42],['wagon',.56],['wagon',.56],['wagon',.56]]){
  const g=new THREE.Group();g.add(origami(name));g.userData.half=len*.38;g.userData.behind=s+len/2;world.add(g);cars.push(g);s+=len+.08;}}
const wrap=t=>(t%1+1)%1,_a=new THREE.Vector3(),_b=new THREE.Vector3(),_f=new THREE.Vector3(),_u=new THREE.Vector3(),_s=new THREE.Vector3(),_m=new THREE.Matrix4();
function carPose(g,dist,curve=rail,len=railLen,lift=.06){const h=g.userData.half;
 _a.copy(curve.getPointAt(wrap((dist-h)/len)));_b.copy(curve.getPointAt(wrap((dist+h)/len)));
 g.position.addVectors(_a,_b).multiplyScalar(.5);g.position.y+=lift;
 _f.subVectors(_b,_a).normalize();_s.set(0,1,0).cross(_f);if(_s.lengthSq()<1e-8)_s.set(1,0,0);_s.normalize();
 _u.crossVectors(_f,_s).normalize();g.quaternion.setFromRotationMatrix(_m.makeBasis(_f,_u,_s.crossVectors(_f,_u)));}
const train=cars[0];cars.slice(1).forEach(c=>c.traverse(o=>o.userData.egg='train'));let trainT=0,trainSpeed=.028;egg(train,'train','Le train siffle et prend de la vitesse.',()=>{tone([520,520,690],.35);trainSpeed=.09;setTimeout(()=>trainSpeed=.028,4000);});
const car=new THREE.Group();car.add(origami('car'));car.userData.half=.11;world.add(car);const loopLen=loop.getLength();let carS=0;egg(car,'voiture','La voiture blanche de Route & vigilance respecte la limite.',()=>tone([200,260],.15));
const boat=new THREE.Group();boat.add(origami('boat',1.1));const sails=origami('sails',1.1,false),rig=new THREE.Group();rig.position.y=.27*1.1;sails.position.y=-.27*1.1;rig.add(sails);boat.add(rig);boat.userData={state:'sail',timer:6,blend:1};scene.add(boat);let boatT=(2.35-1.1)/.35,boatSpeed=.0045;egg(boat,'voilier','Le voilier hisse ses voiles et file, avant de revenir les ranger au quai.',()=>{const u=boat.userData;if(u.state==='dock'){u.timer=-1;}else{boatSpeed=.014;setTimeout(()=>boatSpeed=.0045,6000);}tone([392,494],.2);});
const fish=[];for(let i=0;i<9;i++){const f=origami('fish',.9+Math.random()*.5,false);const a=Math.random()*Math.PI*2,r=9.4+Math.random()*4;f.userData={x:Math.cos(a)*r,z:Math.sin(a)*r,a:Math.random()*6.3,t:Math.random()*10,jump:0,dx:0,dz:0};scene.add(f);fish.push(f);}
egg(fish[0],'poisson','Un poisson en papier saute hors de l’eau.',()=>{fish.forEach(f=>{if(!f.userData.jump){f.userData.jump=.001;f.userData.dx=Math.cos(f.userData.a);f.userData.dz=Math.sin(f.userData.a);}});tone([900,1300],.1);});fish.slice(1).forEach(f=>f.traverse(o=>o.userData.egg='poisson'));
const harbourAngle=2.35,pier=origami('pier');pier.position.set(Math.cos(harbourAngle)*7.3,-.28,Math.sin(harbourAngle)*7.3);pier.rotation.y=-harbourAngle;scene.add(pier);
const fisher=new THREE.Group();fisher.add(origami('fisher',1.2));fisher.userData.home=new THREE.Vector3(Math.cos(harbourAngle)*9.2+Math.cos(harbourAngle+Math.PI/2)*1.1,-.45,Math.sin(harbourAngle)*9.2+Math.sin(harbourAngle+Math.PI/2)*1.1);fisher.userData.timer=14;fisher.position.copy(fisher.userData.home);fisher.rotation.y=-harbourAngle-Math.PI/2;scene.add(fisher);egg(fisher,'pêcheur','Le bateau de pêche quitte lentement le quai, fait un tour et revient s’amarrer.',()=>{tone([220,330],.25);if(!fisher.userData.go)fisher.userData.go=.001;});
const duck=new THREE.Group();const db=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),mat('#ffd23f')),dh=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),mat('#ffd23f')),beak=box(.06,.03,.04,ORANGE,.1,.1,0,false);dh.position.set(.06,.09,0);duck.add(db,dh,beak);duck.position.set(-9.4,-.45,-2.6);scene.add(duck);egg(duck,'canard','Un canard en papier : coin.',()=>{tone([740,620],.12);duck.userData.flee=1;});
const birds=[];for(let i=0;i<5;i++){const b=origami('crane',.7,false);b.userData.phase=i*1.3;scene.add(b);birds.push(b);}
egg(birds[0],'oiseau','Les oiseaux tournent autour de l’île, comme les flux Power Automate.',()=>tone([1200,1500,1200],.08));
// --- Camera snapshot egg lives in the HUD.
document.getElementById('world-photo').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download='atlas-du-parcours.png';a.href=canvas.toDataURL('image/png');a.click();foundEgg('photo','Une photo souvenir de l’île, enregistrée sur votre appareil.');};
eggs.set('photo',{text:'',found:false});
// --- Sound: tiny synth notes.
let ambience=null;function startAmbience(){if(ambience||muted)return;audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const buf=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate),a=buf.getChannelData(0);let b=0;for(let i=0;i<a.length;i++){b=(b+(Math.random()*2-1)*.05)/1.02;a[i]=b;}const src=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain(),lfo=audio.createOscillator(),lg=audio.createGain();src.buffer=buf;src.loop=true;f.type='lowpass';f.frequency.value=520;g.gain.value=.05;lfo.frequency.value=.16;lg.gain.value=.03;lfo.connect(lg).connect(g.gain);src.connect(f).connect(g).connect(audio.destination);src.start();lfo.start();ambience={g};gull();}
function gull(){if(!ambience||muted)return;const t=audio.currentTime;for(let k=0;k<1+(Math.random()*3|0);k++){const o=audio.createOscillator(),v=audio.createOscillator(),vg=audio.createGain(),g=audio.createGain(),s=t+k*.28;o.type='sawtooth';o.frequency.setValueAtTime(1500+Math.random()*400,s);o.frequency.exponentialRampToValueAtTime(1050,s+.22);v.frequency.value=28;vg.gain.value=60;v.connect(vg).connect(o.frequency);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(.045,s+.03);g.gain.exponentialRampToValueAtTime(.0001,s+.26);const f=audio.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=2;o.connect(f).connect(g).connect(audio.destination);o.start(s);v.start(s);o.stop(s+.3);v.stop(s+.3);}setTimeout(gull,4000+Math.random()*9000);}
canvas.addEventListener('pointerdown',startAmbience,{once:false});
function tone(freqs,dur){if(muted)return;audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();freqs.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=f;const t=audio.currentTime+i*dur*.8;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+dur+.05);});}
document.getElementById('world-sound').onclick=e=>{muted=!muted;e.target.textContent=muted?'Son : non':'Son : oui';e.target.setAttribute('aria-pressed',!muted);if(ambience)ambience.g.gain.setTargetAtTime(muted?0:.05,audio.currentTime,.2);if(!muted&&!ambience)startAmbience();if(!muted&&ambience)gull();};
// --- Night mode.
function setNight(on){night=on;scene.background.set(on?'#1e1e2a':PAPER);hemi.intensity=on?.3:.85;sun.intensity=on?.45:1.7;paperMat.emissive.set('#ff8a3d');paperMat.emissiveIntensity=on?.12:0;water.material.color.set(on?'#2a3d4a':'#ffffff');beam.material.opacity=on?.28:0;lamp.material.emissiveIntensity=on?1.4:.3;document.body.classList.toggle('is-night',on);}
// --- Cards.
function showCard(step){card.innerHTML=`<button class="world-close" aria-label="Fermer">×</button><span class="world-kicker">${step.role}</span><h2>${step.name}</h2><p>${step.text}</p>${step.link?`<a href="${step.link}">Ouvrir <span>↗</span></a>`:''}`;card.hidden=false;card.querySelector('.world-close').onclick=()=>card.hidden=true;}
function foundEgg(id,text){const e=eggs.get(id);if(!e)return;if(!e.found){e.found=true;found++;eggsHud.textContent=`Easter eggs : ${found} / ${eggs.size}`;if(found===eggs.size)fireworks();}hint.textContent=text;hint.classList.add('is-flash');setTimeout(()=>hint.classList.remove('is-flash'),900);}
let sparks=[];function fireworks(){tone([523,659,784,1047],.3);for(let i=0;i<120;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.05,6,4),mat(i%3?ORANGE:i%2?'#ffd23f':INK));s.position.set(0,3,0);s.userData.v=new THREE.Vector3((Math.random()-.5)*.25,Math.random()*.2,(Math.random()-.5)*.25);scene.add(s);sparks.push(s);}hint.textContent='Tous les easter eggs sont trouvés : feu d’artifice !';}
// --- Interaction.
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let downAt=null;
canvas.addEventListener('pointerdown',e=>{downAt={x:e.clientX,y:e.clientY,spin};dragging={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(dragging){spin=downAt.spin+(e.clientX-downAt.x)*.006;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-dragging.y)*.002,.35,1.1);dragging.y=e.clientY;}else{pick(e,false);}});
canvas.addEventListener('pointerup',e=>{const moved=downAt&&Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)>5;dragging=null;if(!moved)pick(e,true);});
canvas.addEventListener('pointercancel',()=>dragging=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.02,12,40);},{passive:false});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinch)zoom=THREE.MathUtils.clamp(zoom*(pinch/d),12,40);pinch=d;e.preventDefault();}},{passive:false});canvas.addEventListener('touchend',()=>pinch=null);
function pick(e,click){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects([world,boat,duck,fisher,pier,...fish,...birds],true).find(h=>h.object.visible&&!(h.object.isLineSegments));canvas.style.cursor=hit&&(hit.object.userData.egg||hit.object.userData.building)?'pointer':'grab';if(!click||!hit)return;const o=hit.object;if(o.userData.egg){const e2=eggs.get(o.userData.egg);e2.action?.();foundEgg(o.userData.egg,e2.text);return;}if(o.userData.building)showCard(o.userData.building.userData.step);}
document.getElementById('world-pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'▶':'Ⅱ';e.target.setAttribute('aria-label',paused?'Reprendre la rotation':'Mettre en pause');};
document.getElementById('world-reset').onclick=()=>{spin=0;pitch=.62;zoom=28;card.hidden=true;setNight(false);};
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.code==='ArrowLeft')spin-=.08;if(e.code==='ArrowRight')spin+=.08;if(e.key==='+'||e.key==='=')zoom=Math.max(12,zoom-2);if(e.key==='-')zoom=Math.min(40,zoom+2);if(e.code==='Space'){e.preventDefault();document.getElementById('world-pause').click();}});
const resize=()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
const clock=new THREE.Clock();
function frame(){const dt=Math.min(.05,clock.getDelta()),t=clock.elapsedTime;if(!paused&&!dragging)spin+=spinVel;
 const dist=zoom,shift=innerWidth>850?-4.6*(zoom/28):0;camera.position.set(Math.sin(spin)*dist*Math.cos(pitch),Math.sin(pitch)*dist,Math.cos(spin)*dist*Math.cos(pitch));camera.lookAt(0,.4,0);camera.translateX(shift);camera.lookAt(camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3())));
 {const pa=seaGeo.attributes.position.array;for(let i=0;i<pa.length;i+=3){const x=seaBase[i],z=seaBase[i+2];pa[i+1]=Math.sin(x*.9+t*1.1)*.07+Math.sin(z*1.3-t*.9)*.06+Math.sin((x+z)*.5+t*.6)*.05;}seaGeo.attributes.position.needsUpdate=true;seaGeo.computeVertexNormals();}
 waves.forEach(w=>{const u=w.userData,f=u.foam;u.age+=dt;
  if(u.phase==='in'){u.d-=u.speed*dt*(.7+.6*Math.min(1,u.d/3));if(u.d<.42){u.phase='break';u.age=0;}}
  else if(u.age>1.1){u.phase='in';u.age=0;u.d=4.2+Math.random()*.9;u.a=offIslet(u.a+Math.random()*.24-.12);u.scale=.8+Math.random()*.5;}
  const r=waterline(u.a)+u.d,x=Math.cos(u.a)*r,z=Math.sin(u.a)*r,near=Math.max(0,Math.min(1,1-(u.d-.42)/4.2));
  w.position.set(x,seaY(x,z,t)-.025,z);w.rotation.y=-u.a-Math.PI/2;
  if(u.phase==='in'){// a swell far out, a steepening curl as the bottom rises
   const s=u.scale*(.55+near*.7);w.scale.set(s,s*(.45+near*.9),s*(.8+near*.35));w.rotation.x=-.32*near*near;
   w.material.opacity=Math.min(1,u.age/1.2);f.material.opacity=0;}
  else{// breaking: the lip falls, the crest spreads and turns to foam on the water
   const k=u.age/1.1,s=u.scale*1.25;w.scale.set(s*(1+k*.3),s*1.35*Math.max(.08,1-k*1.1),s*(1.15+k*.5));w.rotation.x=-.4-k*.5;w.material.opacity=Math.max(0,1-k*1.3);
   const fr=r-.18-k*.35;f.position.set(Math.cos(u.a)*fr,seaY(Math.cos(u.a)*fr,Math.sin(u.a)*fr,t)+.012,Math.sin(u.a)*fr);f.rotation.y=-u.a+Math.PI/2;
   f.scale.setScalar(u.scale*(1+k*1.4));f.material.opacity=.75*Math.sin(Math.min(1,k*1.2)*Math.PI);}});
 signal.t+=dt;if(signal.t>signal.aspects[signal.aspect].d)signal.set(signal.aspect+1);
 isletFoam.position.set(isletX,seaY(isletX,isletZ,t)+.012,isletZ);isletFoam.material.opacity=.28+.14*Math.sin(t*1.7);isletFoam.scale.setScalar(1+.06*Math.sin(t*1.7));
 fish.forEach((f,i)=>{const u=f.userData;u.t+=dt;if(Math.hypot(u.x-isletX,u.z-isletZ)<1.1&&!u.jump){u.a=Math.atan2(u.z-isletZ,u.x-isletX);u.x+=Math.cos(u.a)*.05;u.z+=Math.sin(u.a)*.05;}if(u.jump>0){u.jump+=dt*1.6;const h=Math.sin(Math.min(Math.PI,u.jump*Math.PI))*1.1;f.position.set(u.x+u.dx*u.jump*1.2,-.5+h,u.z+u.dz*u.jump*1.2);f.rotation.z=(.5-u.jump)*1.6;if(u.jump>=1){u.jump=0;u.x+=u.dx*1.2;u.z+=u.dz*1.2;u.a=Math.atan2(u.dz,u.dx);}}else{u.a+=Math.sin(u.t*.7+i)*dt*.4;u.x+=Math.cos(u.a)*dt*.6;u.z+=Math.sin(u.a)*dt*.6;const r=Math.hypot(u.x,u.z);if(r>15||r<8.8){u.a+=Math.PI;u.x+=Math.cos(u.a)*.3;u.z+=Math.sin(u.a)*.3;}f.position.set(u.x,-.56+Math.sin(u.t*3)*.03,u.z);f.rotation.z=0;if(Math.random()<dt*.06){u.jump=.001;u.dx=Math.cos(u.a);u.dz=Math.sin(u.a);}}f.rotation.y=-u.a;f.rotation.x=Math.sin(u.t*9)*.15;});
 trainT=(trainT+trainSpeed*dt)%1;const head=trainT*railLen;for(const c of cars)carPose(c,head-c.userData.behind);
 carS+=.5*dt;carPose(car,carS,loop,loopLen,-.03);// the ring's centre line sits .12 above ground, its tarmac .09
 {const u=boat.userData,dock=new THREE.Vector3(Math.cos(harbourAngle)*9.9-Math.cos(harbourAngle+Math.PI/2)*1.1,-.45,Math.sin(harbourAngle)*9.9-Math.sin(harbourAngle+Math.PI/2)*1.1);u.timer-=dt;
 if(u.state==='sail'){boatT+=boatSpeed*dt*60;boat.position.set(Math.cos(boatT*.35)*10.95,-.45+Math.sin(t*2)*.04,Math.sin(boatT*.35)*10.95);boat.rotation.y=-boatT*.35+Math.PI;u.blend=Math.min(1,u.blend+dt*.5);if(u.timer<0&&Math.abs(((boatT*.35)%(Math.PI*2))-harbourAngle)<.25){u.state='in';u.timer=0;}}
 else if(u.state==='in'){u.timer+=dt;const k=Math.min(1,u.timer/4);boat.position.lerp(dock,k*.08);boat.rotation.y+=(-harbourAngle-Math.PI/2-boat.rotation.y)*.05;u.blend=Math.max(0,1-k);if(k>=1){u.state='dock';u.timer=12+Math.random()*8;}}
 else if(u.state==='dock'){boat.position.y=-.45+Math.sin(t*1.3)*.04;if(u.timer<0){u.state='out';u.timer=0;boatT=harbourAngle/.35;}}
 else{u.timer+=dt;const k=Math.min(1,u.timer/4);const target=new THREE.Vector3(Math.cos(boatT*.35)*10.95,-.45,Math.sin(boatT*.35)*10.95);boat.position.lerp(target,k*.08);u.blend=k;if(k>=1){u.state='sail';u.timer=20+Math.random()*15;}}
 boat.rotation.z=Math.sin(t*1.7)*.06*(.3+.7*u.blend);const e=u.blend*u.blend*(3-2*u.blend);rig.scale.set(.42+.58*e,.07+.93*e,1);}
 fisher.position.y=-.45+Math.sin(t*1.4)*.05;fisher.rotation.z=Math.sin(t*1.1)*.05;if(fisher.userData.go){const g=fisher.userData.go+=dt,T=42,u=g/T,ang=harbourAngle+Math.sin(u*Math.PI*2)*.9,rad=9.6+Math.sin(u*Math.PI)*2.6;const target=new THREE.Vector3(Math.cos(ang)*rad,fisher.position.y,Math.sin(ang)*rad);fisher.position.x+=(target.x-fisher.position.x)*.04;fisher.position.z+=(target.z-fisher.position.z)*.04;fisher.rotation.y+=((-ang-Math.PI/2+Math.cos(u*Math.PI*2)*.6)-fisher.rotation.y)*.03;if(g>T){fisher.position.x+=(fisher.userData.home.x-fisher.position.x)*.05;fisher.position.z+=(fisher.userData.home.z-fisher.position.z)*.05;fisher.rotation.y+=((-harbourAngle-Math.PI/2)-fisher.rotation.y)*.05;if(g>T+6){fisher.userData.go=0;fisher.position.copy(fisher.userData.home);fisher.rotation.y=-harbourAngle-Math.PI/2;}}}
 if(duck.userData.flee){duck.userData.flee+=dt;duck.position.x-=dt*1.5;duck.position.z+=dt*.6;if(duck.userData.flee>4){duck.userData.flee=0;duck.position.set(-9.4,-.45,-2.6);}}duck.position.y=-.45+Math.sin(t*3)*.03;
 birds.forEach((b,i)=>{const a=t*.25+b.userData.phase;b.position.set(Math.cos(a)*(8.2+i*.5),3.8+Math.sin(t*2+i)*.2,Math.sin(a)*(8.2+i*.5));b.rotation.y=-a-Math.PI/2;b.rotation.x=Math.sin(t*6+i)*.25;});
 world.traverse(o=>{if(o.userData.hand)o.userData.hand.rotation.z=-t*.2;if(o.userData.cat&&o.userData.cat.userData.jump){const c=o.userData.cat;c.userData.jump+=dt*4;c.position.y=1.18+Math.sin(Math.min(Math.PI,c.userData.jump))*.4;if(c.userData.jump>Math.PI){c.userData.jump=0;c.position.y=1.18;}}});
 eggs.forEach(e=>{if(e.obj?.userData.spin){e.obj.rotation.y+=dt*6;e.obj.userData.spin+=dt;if(e.obj.userData.spin>1.5)e.obj.userData.spin=0;}});
 beamPivot.rotation.y=t*.6;
 sparks=sparks.filter(s=>{s.position.add(s.userData.v);s.userData.v.y-=.006;if(s.position.y<-1){scene.remove(s);return false;}return true;});
 renderer.render(scene,camera);requestAnimationFrame(frame);}
setNight(false);eggsHud.textContent=`Easter eggs : 0 / ${eggs.size}`;canvas.dataset.ready='true';frame();

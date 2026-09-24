import * as THREE from './three.module.js';
/* Atlas du parcours : une île en origami. Les bâtiments, arbres, véhicules et l’île elle-même sont modélisés dans Blender
   (tools/blender-atlas.py → atlas-models.json) en papier plié : facettes, plis et ombrage plat. Chaque étape du parcours
   est un bâtiment ; les œufs de Pâques sont des objets cliquables comptés dans le coin de l’écran. */
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.95,metalness:0,flatShading:true,...extra});
const canvas=document.getElementById('world-canvas'),host=canvas.parentElement,card=document.getElementById('world-card'),eggsHud=document.getElementById('world-eggs'),hint=document.getElementById('world-hint');
const INK='#1e1e1e',PAPER='#fefefe',ORANGE='#ff8a3d',GRASS='#cfe9c2',ROCK='#d9d3c7',WATER='#cfe6ee';
const paperMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0,flatShading:true,side:THREE.DoubleSide});
const models=await fetch('atlas-models.json?v=20260924-avignon').then(r=>r.json());
// Folded-paper meshes: one colour per facet (baked in Blender), flat shading and faint crease lines.
function origami(name,scale=1,creases=true,creaseOpacity=.28){const m=models[name],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(m.position,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(m.normal,3));const col=new Float32Array(m.position.length),lin=c=>{c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);};for(let i=0;i<m.color.length;i+=3)for(let k=0;k<3;k++){col[i*3+k*3]=lin(m.color[i]);col[i*3+k*3+1]=lin(m.color[i+1]);col[i*3+k*3+2]=lin(m.color[i+2]);}geo.setAttribute('color',new THREE.BufferAttribute(col,3));
 const mesh=new THREE.Mesh(geo,paperMat);mesh.castShadow=mesh.receiveShadow=true;mesh.scale.setScalar(scale);
 if(creases){const l=new THREE.LineSegments(new THREE.EdgesGeometry(geo,24),new THREE.LineBasicMaterial({color:'#5a5248',transparent:true,opacity:creaseOpacity}));mesh.add(l);}return mesh;}
const steps=[
 {id:'avignon',name:'Avignon Université',tag:'Master d’histoire · 2017 – 2022',role:'Master d’histoire · 2017 – 2022',text:'Campus Hannah Arendt, dans l’ancien Hôtel-Dieu. Cinq ans d’histoire : recherche documentaire, critique des sources et rédaction, la rigueur de méthode reprise ensuite dans l’enquête terrain MQSE.',pos:[-0.4,0,-3.3],kind:'avignon',link:'parcours.html'},
 {id:'usp',name:'Université Sorbonne Paris Nord',tag:'M2 MQSE · M1 validé juin 2026',role:'Master MQSE (M1 validé le 22 juin 2026, M2 en cours)',text:'Maintenance, Qualité, Sécurité, Environnement. Mémoire et soutenance sur l’amélioration du suivi des plans de prévention et de la coactivité (Power BI V0 → V4).',pos:[-3.2,0,-1.6],kind:'campus',link:'parcours.html'},
 {id:'sncf',name:'SNCF Gares & Connexions',tag:'Assistant Sécurité & Production',role:'Alternance · Assistant Sécurité & Production, ABE Sud Île-de-France',text:'Prévention terrain, plans de prévention et coactivité, maintenance réglementaire, accès et habilitations ; outils d’extraction, Power Automate et Power BI construits pour l’équipe.',pos:[2.6,0,-2.2],kind:'station',link:'profil.html'},
 {id:'reseau',name:'État des lieux EPM / EPTx',tag:'Enquête terrain · rentrée 2026',role:'Démarche MQSE · passage des travaux à la maintenance',text:'Entretiens (QQOQCP), gemba et groupe de travail transverse ; proposition d’un processus simplifié « EPM light » en cinq étapes, 16 arbitrages obtenus en réunion d’agence.',pos:[1.6,0,3.4],kind:'signal',link:'projet-5.html'},
 {id:'studio',name:'Studio d’extracteurs PDF',tag:'CERFA v3 · VRE · PP',role:'Projet · extraction CERFA, attestations, VRE et plans de prévention',text:'Les PDF sont lus, structurés et contrôlés : les écarts apparaissent sans relire page par page. 300 fiches en quelques minutes au lieu de ≈ 20 h ; ≈ 50 000 € de pénalités de retard identifiées.',pos:[3.4,0,1.4],kind:'workshop',link:'projet-studio.html'},
 {id:'bi',name:'Portail Power BI',tag:'Déployé mai – juin 2026',role:'Projet · plans de prévention et coactivité',text:'Premiers tableaux de bord au printemps 2026, portail déployé pour l’équipe en mai – juin 2026 puis alimenté par Power Automate : un plan retrouvé en 10 s au lieu de 3 à 5 min.',pos:[-0.2,0,2.9],kind:'tower',link:'projet-4.html'},
 {id:'lean',name:'Dojo Lean Six Sigma',tag:'Yellow Belt validé · ISO',role:'Yellow Belt validé · ISO 9001 / 45001 / 14001 / 27001',text:'DMAIC, PDCA, analyse des causes et amélioration continue ; référentiels qualité, sécurité, environnement et sécurité de l’information.',pos:[-3.4,0,1.8],kind:'dojo',link:'methode.html'},
 {id:'perso',name:'Stade des projets perso',tag:'10 démos jouables en ligne',role:'Arène des arcanes, Abysses & babioles, Route & vigilance, Timber !, Labyrinthe, Rubik, Sandboard, Pixels',text:'Le terrain de jeu Three.js et Canvas du site : combat en pixel art, plongée modélisée dans Blender, conduite, bûcheronnage, labyrinthe, casse-tête et bacs à sable.',pos:[0,0,0],kind:'arcade',link:'projets-perso.html'},
];
const SPREAD=1.24;// how far the buildings sit from the centre
const footprint=kind=>{const g=models[kind].position;let hx=0,hz=0;for(let i=0;i<g.length;i+=3){hx=Math.max(hx,Math.abs(g[i]));hz=Math.max(hz,Math.abs(g[i+2]));}return Math.hypot(hx,hz);};
const eggs=new Map();let found=0,night=false,paused=false,dragging=null,spin=0,spinVel=.0018,pitch=.62,zoom=28,audio=null,muted=false,pinch=null;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});let pixelRatio=Math.min(devicePixelRatio,1.5);renderer.setPixelRatio(pixelRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.14;
// A pale sea haze: the ocean fades into it at the horizon, so the island floats on the paper of the page.
const SKY='#e3efec',NIGHT_SKY='#1b2230';const scene=new THREE.Scene();scene.background=new THREE.Color(SKY);scene.fog=new THREE.Fog(SKY,36,78);const camera=new THREE.PerspectiveCamera(30,1,.1,100);
const world=new THREE.Group();scene.add(world);
// Warm late-morning sun, sky-blue fill from above and sand bounce from below; the shadow box also covers the lagoon and the clouds' shadows.
const hemi=new THREE.HemisphereLight('#e6f4ff','#ecd9b0',1.1),sun=new THREE.DirectionalLight('#fff0d4',2.1);sun.position.set(14,24,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0008;sun.shadow.normalBias=.045;sun.shadow.intensity=.8;Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:1,far:70});scene.add(hemi,sun);
const edges=(mesh,color='#8f8a80')=>{const l=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,28),new THREE.LineBasicMaterial({color,transparent:true,opacity:.55}));mesh.add(l);return mesh;};
const box=(w,h,d,color,x=0,y=0,z=0,outline=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return outline?edges(m):m;};
// --- Island folded in Blender.
const island=origami('island',1.65,true,.1);world.add(island);scene.updateMatrixWorld(true);
const down=new THREE.Raycaster();function groundY(x,z,fallback=null){down.set(new THREE.Vector3(x,8,z),new THREE.Vector3(0,-1,0));const h=down.intersectObject(island,false)[0];return h?h.point.y:(fallback??0);}
const groundMax=(x,z,rad=.6)=>{let y=groundY(x,z);for(let i=0;i<8;i++){const a=i/8*Math.PI*2,cx=Math.cos(a)*rad,cz=Math.sin(a)*rad;y=Math.max(y,groundY(x+cx,z+cz,y),groundY(x+cx*.55,z+cz*.55,y));}return y;};
// The island is not a disc: for a bearing, find the last radius where the ground is still well above the sea.
const shoreRadius=(a,minY=.06)=>{const cx=Math.cos(a),cz=Math.sin(a);for(let r=9.4;r>3;r-=.15){if(groundY(cx*r,cz*r,-9)>minY)return r;}return 6.5;};
// --- Sea: a faceted sheet that folds and unfolds (built further down, once the sea floor under it is known).
// The sea surface, exactly as the water shader folds it (it only moves vertices up and down).
const seaY=(x,z,t)=>-.5+Math.sin(x*.9+t*1.1)*.07+Math.sin(z*1.3-t*.9)*.06+Math.sin((x+z)*.5+t*.6)*.05;
// Where the beach meets the water, bearing by bearing: the first ground above sea level, coming in from the open sea.
const waterline=(()=>{const N=120,r=new Float32Array(N);for(let i=0;i<N;i++){const a=i/N*Math.PI*2,cx=Math.cos(a),cz=Math.sin(a);let k=12;while(k>4&&groundY(cx*k,cz*k,-9)<-.47)k-=.08;r[i]=k;}
 return a=>{const f=((a/(Math.PI*2))%1+1)%1*N,i=Math.floor(f),w=f-i;return r[i%N]*(1-w)+r[(i+1)%N]*w;};})();
const offIslet=a=>{const d=Math.atan2(Math.sin(a-.35),Math.cos(a-.35));return Math.abs(d)<.17?a+(d<0?-.34:.34):a;};// .35 is the islet's bearing
const foamGeo=(()=>{const g=new THREE.CircleGeometry(.5,14,-Math.PI*.9,Math.PI*.8);g.rotateX(-Math.PI/2);return g;})();
const waves=[];for(let i=0;i<22;i++){const w=origami('wave',1,false);w.castShadow=false;w.material=paperMat.clone();w.material.transparent=true;
 const foam=new THREE.Mesh(foamGeo,new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false}));scene.add(w,foam);
 w.userData={a:offIslet(i/22*Math.PI*2+Math.random()*.2),d:.6+Math.random()*4.2,speed:.32+Math.random()*.22,scale:.55+Math.random()*.35,phase:'in',age:1+Math.random(),foam};waves.push(w);}
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
 else if(step.kind==='avignon'){const bell=new THREE.Mesh(new THREE.LatheGeometry([[0,.07],[.02,.066],[.035,.04],[.042,.012],[.06,-.015],[.06,-.025],[0,-.025]].map(([x,y])=>new THREE.Vector2(x,y)),12),mat('#d9a441',{metalness:.35,roughness:.5}));bell.position.set(0,1.8,.445);g.add(bell);egg(bell,'cloche-avignon','La cloche de l’Hôtel-Dieu sonne : retour sur les bancs d’Avignon.',()=>{tone([784,659,523],.45);bell.rotation.z=.5;setTimeout(()=>bell.rotation.z=0,350);});}
 else if(step.kind==='station'){const hand=new THREE.Mesh(new THREE.PlaneGeometry(.03,.14),mat(PAPER));hand.position.set(0,.77,.66);g.add(hand);g.userData.hand=hand;const cat=paperCat();cat.position.set(.9,1.18,.2);cat.rotation.y=-.5;g.add(cat);egg(cat,'chat','Un chat sur le toit de la gare : il miaule et saute.',()=>{tone([660,520],.25);cat.userData.jump=1;});g.userData.cat=cat;}
 else if(step.kind==='workshop'){const pdf=box(.35,.45,.05,PAPER,-.95,.25,.4);pdf.rotation.y=.4;g.add(pdf);egg(pdf,'pdf','Un PDF qui traîne : l’extracteur l’a déjà lu.',()=>{tone([440,880],.15);pdf.rotation.y+=Math.PI;});}
 else if(step.kind==='signal'){signal.glow=new THREE.Mesh(new THREE.SphereGeometry(.062,12,10),new THREE.MeshBasicMaterial({color:'#39d98a'}));signal.halo=new THREE.PointLight('#39d98a',.6,1.6);signal.glow.add(signal.halo);g.add(signal.glow);signal.set(0);
  egg(signal.glow,'signal','Le signal change d’aspect : vert, voie libre · orange, avertissement · violet, carré de manœuvre.',()=>{signal.set(signal.aspect+1);tone([988],.08);});}
 else if(step.kind==='tower'){const bulb=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),new THREE.MeshStandardMaterial({color:'#fff2b0',emissive:'#ffcc55',emissiveIntensity:.6}));bulb.position.y=3.42;g.add(bulb);egg(bulb,'ampoule','L’ampoule bascule le jour et la nuit.',()=>setNight(!night));const bars=[.5,.8,1.1];bars.forEach((h,i)=>{const bar=box(.14,h,.14,i===1?ORANGE:INK,-.85+i*.22,h/2,.8,false);g.add(bar);});}
 else if(step.kind==='dojo'){const belt=new THREE.Mesh(new THREE.TorusGeometry(.22,.05,8,24),mat('#ffd23f'));belt.position.set(0,.62,1.02);g.add(belt);egg(belt,'ceinture','Une Yellow Belt Lean Six Sigma accrochée à la porte.',()=>{tone([523,659,784],.2);belt.userData.spin=1;});}
 else if(step.kind==='arcade'){// the games of the site, laid out on the pitch of the stadium
  const log=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.16,12),mat('#e0c9a6'));log.position.set(.36,.13,.1);g.add(edges(log));egg(log,'billot','Le billot de Timber ! — un coup de hache.',()=>{tone([120,90],.12);log.scale.y=.6;setTimeout(()=>log.scale.y=1,300);});
  const cube=box(.15,.15,.15,'#ffd23f',-.36,.125,-.08);g.add(cube);egg(cube,'rubik','Le Rubik’s Cube du banc tourne d’un quart.',()=>{cube.rotation.y+=Math.PI/2;tone([700],.08);});
  const sand=new THREE.Mesh(new THREE.CircleGeometry(.13,20),mat('#ffd9a8'));sand.rotation.x=-Math.PI/2;sand.position.set(-.08,.052,.14);g.add(sand);egg(sand,'sable','Une flaque de sable : le Sandboard en miniature.',()=>{tone([300,240],.2);sand.material.color.set('#ff9a3d');});
  const hedge=new THREE.Group();for(let i=0;i<3;i++){const h=box(.06,.13,.22,'#8fd39a',.08+i*.08,.115,-.12,false);hedge.add(h);}g.add(hedge);egg(hedge,'haie','La haie du Labyrinthe, taillée au carré.',()=>{tone([500,600,700,800],.1);hedge.scale.y=1.4;setTimeout(()=>hedge.scale.y=1,400);});}
 // Label floats clear of the roof: measured on the building itself, always drawn on top.
 const bb=new THREE.Box3().setFromObject(g);g.userData.box=bb;const top=bb.max.y-g.position.y;const label=makeLabel(step.name,step.tag);label.position.y=top+(step.kind==='arcade'?1.5:.45);g.add(label);g.userData.label=label;label.userData.y=label.position.y;
 g.traverse(o=>{if(o.isMesh)o.userData.building=g;});world.add(g);return g;}
function makeLabel(text,sub=''){const c=document.createElement('canvas');c.width=640;c.height=160;const x=c.getContext('2d');x.fillStyle=INK;x.fillRect(0,0,640,160);x.fillStyle=PAPER;x.fillRect(5,5,630,150);x.fillStyle=INK;x.textAlign='center';x.textBaseline='middle';
 const fit=(t,size,weight,max)=>{x.font=`${weight} ${size}px "JetBrains Mono",monospace`;while(x.measureText(t).width>max&&size>14){size-=2;x.font=`${weight} ${size}px "JetBrains Mono",monospace`;}};
 fit(text,44,'bold',600);x.fillText(text,320,sub?56:80);if(sub){x.fillRect(40,94,560,2);fit(sub,34,'500',600);x.fillText(sub,320,126);}
 const t=new THREE.CanvasTexture(c);t.anisotropy=4;t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,depthWrite:false,fog:false}));s.renderOrder=20;s.center.set(.5,0);s.scale.set(2.6,.65,1);return s;}
function paperCat(){const cat=new THREE.Group(),C='#2a2830',D='#1a1920',eyeM=new THREE.MeshStandardMaterial({color:'#ffd23f',emissive:'#ffb000',emissiveIntensity:.5,flatShading:true});
 const haunch=new THREE.Mesh(new THREE.SphereGeometry(.1,6,4),mat(C));haunch.scale.set(1.15,.85,1);haunch.position.set(-.04,.08,0);
 const chest=new THREE.Mesh(new THREE.CylinderGeometry(.055,.08,.2,6),mat(C));chest.position.set(.06,.15,0);chest.rotation.z=-.35;
 const head=new THREE.Group();head.position.set(.12,.27,0);
 const skull=new THREE.Mesh(new THREE.IcosahedronGeometry(.075,0),mat(C));skull.scale.set(1,.88,1.05);head.add(skull);
 const muzzle=new THREE.Mesh(new THREE.BoxGeometry(.05,.035,.06),mat('#3c3a46'));muzzle.position.set(.06,-.02,0);head.add(muzzle);
 for(const sd of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.032,.07,4),mat(C));ear.position.set(-.005,.075,sd*.038);ear.rotation.set(sd*.25,0,-.15);head.add(ear);
  const inner=new THREE.Mesh(new THREE.ConeGeometry(.016,.04,3),mat('#e8a0a8'));inner.position.set(.012,.07,sd*.038);inner.rotation.set(sd*.25,0,-.15);head.add(inner);
  const eye=new THREE.Mesh(new THREE.BoxGeometry(.012,.022,.022),eyeM);eye.position.set(.068,.012,sd*.03);head.add(eye);
  const paw=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,.13,5),mat(C));paw.position.set(.11,.065,sd*.035);cat.add(paw);
  const toe=new THREE.Mesh(new THREE.BoxGeometry(.04,.02,.03),mat(D));toe.position.set(.125,.005,sd*.035);cat.add(toe);
  const whisk=new THREE.Mesh(new THREE.BoxGeometry(.002,.002,.07),mat('#d8d4cc'));whisk.position.set(.085,-.02,sd*.035);whisk.rotation.y=sd*.4;head.add(whisk);}
 const tail=new THREE.Group();tail.position.set(-.13,.05,0);let prev=tail;for(let i=0;i<6;i++){const seg=new THREE.Group();seg.position.set(i?-.045:0,i?.03:0,0);const m=new THREE.Mesh(new THREE.CylinderGeometry(.018-i*.002,.02-i*.002,.05,5),mat(i===5?D:C));m.rotation.z=1.1;seg.add(m);prev.add(seg);prev=seg;tail.userData['s'+i]=seg;}
 cat.add(haunch,chest,head,tail);cat.userData.head=head;cat.userData.tail=tail;cat.userData.eyes=eyeM;return cat;}
function egg(obj,id,text,action){obj.traverse(o=>{o.userData.egg=id;});eggs.set(id,{obj,text,action,found:false});}
const houses=steps.map(building);
// --- Trees folded in Blender.
for(let i=0;i<26;i++){const a=i/26*Math.PI*2+Math.sin(i)*.3,r=4.9+Math.sin(i*2.3)*1.1;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(steps.some(s=>Math.hypot(s.pos[0]*SPREAD-x,s.pos[2]*SPREAD-z)<1.8))continue;const tree=origami(i%4===0?'blossom':i%3?'pine':'bush',.85+Math.random()*.4);tree.position.set(x,groundY(x,z)-.03,z);tree.rotation.y=Math.random()*6.3;world.add(tree);}
const lighthouse=new THREE.Group();lighthouse.add(origami('lighthouse'));const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.25,8),new THREE.MeshStandardMaterial({color:'#fff6c8',emissive:'#ffcc55',emissiveIntensity:.3,flatShading:true}));lamp.position.y=1.42;lighthouse.add(lamp);const beamPivot=new THREE.Group();beamPivot.position.y=1.42;lighthouse.add(beamPivot);const beam=new THREE.Mesh(new THREE.ConeGeometry(.7,4.5,20,1,true),new THREE.MeshBasicMaterial({color:'#ffe7a0',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));beam.rotation.z=Math.PI/2;beam.position.x=2.25;beamPivot.add(beam);const isletA=.35,isletR=waterline(isletA)+2.1,isletX=Math.cos(isletA)*isletR,isletZ=Math.sin(isletA)*isletR;
const islet=origami('islet');islet.position.set(isletX,-.55,isletZ);islet.rotation.y=1.3;scene.add(islet);
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
const boat=new THREE.Group();boat.add(origami('boat',1.1));const sails=origami('sails',1.1,false),rig=new THREE.Group();rig.position.y=.27*1.1;sails.position.y=-.27*1.1;rig.add(sails);boat.add(rig);boat.userData={state:'dock',timer:14,blend:0,go:0};scene.add(boat);let boatT=(2.35-1.1)/.35,boatSpeed=.0045;const BOAT_R=Math.max(Math.max(...Array.from({length:90},(_,i)=>waterline(i/90*Math.PI*2)))+1.6,isletR+1.4);egg(boat,'voilier','Le voilier hisse ses voiles et file, avant de revenir les ranger au quai.',()=>{const u=boat.userData;if(u.state==='dock'||u.state==='furl'){u.go=1;}else{boatSpeed=.014;setTimeout(()=>boatSpeed=.0045,6000);}tone([392,494],.2);});
const fish=[];for(let i=0;i<9;i++){const f=origami('fish',.9+Math.random()*.5,false);const a=Math.random()*Math.PI*2,r=waterline(a)+3+Math.random()*4;f.userData={x:Math.cos(a)*r,z:Math.sin(a)*r,a:Math.random()*6.3,t:Math.random()*10,jump:0,dx:0,dz:0};scene.add(f);fish.push(f);}
egg(fish[0],'poisson','Un poisson en papier saute hors de l’eau.',()=>{fish.forEach(f=>{if(!f.userData.jump){f.userData.jump=.001;f.userData.dx=Math.cos(f.userData.a);f.userData.dz=Math.sin(f.userData.a);}});tone([900,1300],.1);});fish.slice(1).forEach(f=>f.traverse(o=>o.userData.egg='poisson'));
const harbourAngle=2.35,PIER_R=waterline(harbourAngle)-1.3,pier=origami('pier');pier.position.set(Math.cos(harbourAngle)*PIER_R,-.28,Math.sin(harbourAngle)*PIER_R);pier.rotation.y=-harbourAngle;scene.add(pier);
const fisher=new THREE.Group();fisher.add(origami('fisher',1.2));fisher.userData.home=new THREE.Vector3(Math.cos(harbourAngle)*(PIER_R+2.7)+Math.cos(harbourAngle+Math.PI/2)*1.1,-.45,Math.sin(harbourAngle)*(PIER_R+2.7)+Math.sin(harbourAngle+Math.PI/2)*1.1);fisher.userData.timer=14;fisher.position.copy(fisher.userData.home);fisher.rotation.y=-harbourAngle-Math.PI/2;scene.add(fisher);egg(fisher,'pêcheur','Le bateau de pêche est à vous : ZQSD ou flèches pour naviguer, F pour pêcher près d’un banc.',()=>{tone([220,330],.25);enterSail();});
const duck=new THREE.Group();const db=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),mat('#ffd23f')),dh=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),mat('#ffd23f')),beak=box(.06,.03,.04,ORANGE,.1,.1,0,false);dh.position.set(.06,.09,0);duck.add(db,dh,beak);const DUCK=new THREE.Vector3(Math.cos(3.41)*(waterline(3.41)+1.2),-.45,Math.sin(3.41)*(waterline(3.41)+1.2));duck.position.copy(DUCK);scene.add(duck);egg(duck,'canard','Un canard en papier : coin.',()=>{tone([740,620],.12);duck.userData.flee=1;});
const birds=[];for(let i=0;i<5;i++){const b=origami('crane',.7,false);b.userData.phase=i*1.3;scene.add(b);birds.push(b);}
egg(birds[0],'oiseau','Les oiseaux tournent autour de l’île, comme les flux Power Automate.',()=>tone([1200,1500,1200],.08));
// --- Sea floor: a folded sand sheet under the lagoon. It shelves gently away from the beach, carries sea-grass and
// rock patches, then drops to the deep. Its depth, baked once from above, tints the water and stops the boat.
const hash2=(x,z)=>{const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);};
const vnoise=(x,z)=>{const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf),L=THREE.MathUtils.lerp;return L(L(hash2(xi,zi),hash2(xi+1,zi),u),L(hash2(xi,zi+1),hash2(xi+1,zi+1),u),v);};
const sstep=(a,b,x)=>{const k=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return k*k*(3-2*k);};
function floorY(x,z){const d=Math.hypot(x,z)-waterline(Math.atan2(z,x)),di=Math.hypot(x-isletX,z-isletZ)-.8;
 const shelf=-.5-.52*sstep(-.3,1.6,d)-.14*sstep(1.6,3.8,d)-2.6*sstep(3.6,7.5,d),around=-.55-.5*sstep(0,1.4,di)-2.6*sstep(1.4,3.4,di);
 return Math.max(shelf,around)+(vnoise(x*.9,z*.9)-.5)*.1;}
const seabed=(()=>{const R0=4,R1=46,rings=80,segs=168,P=[],C=[],V=[],col=new THREE.Color(),tmp=new THREE.Color();
 for(let i=0;i<=rings;i++){const r=R0+(R1-R0)*Math.pow(i/rings,1.8),row=[];for(let j=0;j<segs;j++){const a=(j+(i%2)*.5)/segs*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r;row.push([x,floorY(x,z),z]);}V.push(row);}
 const tri=(a,b,c)=>{P.push(...a,...b,...c);const x=(a[0]+b[0]+c[0])/3,z=(a[2]+b[2]+c[2])/3,depth=-.5-(a[1]+b[1]+c[1])/3,n=vnoise(x*.5+7,z*.5-3);
  col.set('#f1dcaa').lerp(tmp.set('#cdbf98'),sstep(.45,1.3,depth)).lerp(tmp.set('#6f9a98'),sstep(1.3,3,depth));
  if(depth>.3&&depth<1.5&&n>.64)col.lerp(tmp.set(n>.75?'#5d9a6c':'#79a96c'),.8);else if(depth>.3&&n<.16)col.lerp(tmp.set('#a39c8c'),.7);
  col.multiplyScalar(.93+hash2(x,z)*.12);for(let k=0;k<3;k++)C.push(col.r,col.g,col.b);};
 for(let i=0;i<rings;i++)for(let j=0;j<segs;j++){const a=V[i][j],b=V[i][(j+1)%segs],c=V[i+1][(j+1)%segs],d=V[i+1][j];tri(a,b,c);tri(a,c,d);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,side:THREE.DoubleSide}));m.receiveShadow=true;scene.add(m);return m;})();
// Heights seen from straight above (island, islet, pier and sea floor), in one red channel from -3 to +1.
const BAKE={x:-26,z:-26,size:52,res:512};
const bake=(()=>{const rt=new THREE.WebGLRenderTarget(BAKE.res,BAKE.res),h=BAKE.size/2,cam=new THREE.OrthographicCamera(-h,h,h,-h,.1,40);
 cam.position.set(BAKE.x+h,20,BAKE.z+h);cam.up.set(0,0,-1);cam.lookAt(BAKE.x+h,0,BAKE.z+h);cam.layers.set(1);
 [island,islet,pier,seabed].forEach(o=>o.traverse(c=>{if(c.isMesh)c.layers.enable(1);}));
 const hm=new THREE.ShaderMaterial({side:THREE.DoubleSide,toneMapped:false,vertexShader:'varying float h;void main(){vec4 w=modelMatrix*vec4(position,1.);h=w.y;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:'varying float h;void main(){gl_FragColor=vec4(clamp((h+3.)/4.,0.,1.),0.,0.,1.);}'});
 const bg=scene.background,fog=scene.fog;scene.overrideMaterial=hm;scene.background=null;scene.fog=null;
 renderer.setRenderTarget(rt);renderer.setClearColor(0x000000,1);renderer.clear();renderer.render(scene,cam);
 const buf=new Uint8Array(BAKE.res*BAKE.res*4);renderer.readRenderTargetPixels(rt,0,0,BAKE.res,BAKE.res,buf);
 renderer.setRenderTarget(null);scene.overrideMaterial=null;scene.background=bg;scene.fog=fog;return {texture:rt.texture,buf};})();
function heightAt(x,z){const N=BAKE.res,u=(x-BAKE.x)/BAKE.size*N-.5,v=(1-(z-BAKE.z)/BAKE.size)*N-.5;if(u<0||v<0||u>=N-1||v>=N-1)return -3;
 const i=Math.floor(u),j=Math.floor(v),fu=u-i,fv=v-j,px=(a,b)=>bake.buf[(b*N+a)*4]/255*4-3;
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(px(i,j),px(i+1,j),fu),THREE.MathUtils.lerp(px(i,j+1),px(i+1,j+1),fu),fv);}
// --- Water: the folded sheet, now a lagoon. Turquoise over the sand shelf, deep blue past the drop-off, caustics
// dancing on the shallows, paper-white foam lapping along every shore; its facets still catch the sun.
const waterU={uTime:{value:0},uHeight:{value:bake.texture},uBake:{value:new THREE.Vector3(BAKE.x,BAKE.z,BAKE.size)},uShallow:{value:new THREE.Color()},uLagoon:{value:new THREE.Color()},uMid:{value:new THREE.Color()},uDeep:{value:new THREE.Color()},uFoam:{value:new THREE.Color()},uCaustic:{value:1}};
const waterMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.3,metalness:0,flatShading:true,transparent:true});waterMat.userData.u=waterU;
waterMat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,waterU);
 sh.vertexShader='uniform float uTime;\nvarying vec3 vWorld;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec3 w0=(modelMatrix*vec4(transformed,1.)).xyz;
 transformed.y+=sin(w0.x*.9+uTime*1.1)*.07+sin(w0.z*1.3-uTime*.9)*.06+sin((w0.x+w0.z)*.5+uTime*.6)*.05;
 vWorld=(modelMatrix*vec4(transformed,1.)).xyz;`);
 sh.fragmentShader=`uniform float uTime,uCaustic;uniform sampler2D uHeight;uniform vec3 uBake,uShallow,uLagoon,uMid,uDeep,uFoam;varying vec3 vWorld;
float wHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float wNoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(wHash(i),wHash(i+vec2(1,0)),u.x),mix(wHash(i+vec2(0,1)),wHash(i+vec2(1,1)),u.x),u.y);}
float wCaustic(vec2 p,float t){vec2 i=p;float c=1.;for(int n=0;n<4;n++){float tt=t*(1.-3.5/float(n+1));i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));c+=1./length(vec2(p.x/(sin(i.x+tt)/.005),p.y/(cos(i.y+tt)/.005)));}c/=4.;c=1.17-pow(c,1.4);return pow(abs(c),8.);}
`+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 buv=vec2((vWorld.x-uBake.x)/uBake.z,1.-(vWorld.z-uBake.y)/uBake.z);
 float inb=step(0.,buv.x)*step(buv.x,1.)*step(0.,buv.y)*step(buv.y,1.);
 float depth=max(0.,vWorld.y-mix(-3.,texture2D(uHeight,buv).r*4.-3.,inb));
 vec3 wc=mix(uShallow,uLagoon,smoothstep(0.,.45,depth));wc=mix(wc,uMid,smoothstep(.4,1.3,depth));wc=mix(wc,uDeep,smoothstep(1.2,2.8,depth));
 float wa=mix(.46,.97,smoothstep(0.,2.2,depth));
 float cs=smoothstep(.16,.5,wCaustic(vWorld.xz*.85-250.,uTime*.5));
 wc+=vec3(.85,1.,.95)*cs*.3*uCaustic*(1.-smoothstep(.2,1.8,depth));
 float nz=wNoise(vWorld.xz*2.6+uTime*.25);
 float foam=1.-smoothstep(.04,.14,depth+nz*.06);
 foam=max(foam,.75*smoothstep(.82,1.,sin(depth*16.-uTime*1.8+nz*2.5))*(1.-smoothstep(.1,.42,depth)));
 wc=mix(wc,uFoam,foam);wa=max(wa,foam*.92);
 diffuseColor=vec4(wc,wa);`);};
const water=new THREE.Mesh(new THREE.PlaneGeometry(140,140,170,170).rotateX(-Math.PI/2),waterMat);water.position.y=-.5;water.receiveShadow=true;scene.add(water);
// --- Fishing spots: one reef bank off each building, named after it.
const spotNames={avignon:['Rade du Rhône',0],usp:['Anse de la fac',0],sncf:['Récif de la gare',0],reseau:['Passe du signal',0],studio:['Chenal de l’atelier',-.5],bi:['Lagon de la tour',0],lean:['Banc du dojo',.4]};
const spots=steps.filter(s=>spotNames[s.id]).map(s=>{const [name,off]=spotNames[s.id],a=Math.atan2(s.pos[2],s.pos[0])+off,r=waterline(a)+2.2;return {id:s.id,name,x:Math.cos(a)*r,z:Math.sin(a)*r};});
// --- Reef: folded-paper corals, sponges and sea-grass on the shelf, seen through the shallow water.
const reefSway={value:0};
{const P=[],C=[],S=[],col=new THREE.Color(),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),sc=new THREE.Vector3(),at=new THREE.Vector3(),R=Math.random;
 const CORAL=['#ff8fa3','#ff6f61','#ffb347','#ffd166','#b388eb','#8a7cf0','#4cc9f0','#3fb68b','#f28482','#e76f9a','#ff9ecf','#7ad3c4'],pick=a=>a[R()*a.length|0];
 const G={brain:new THREE.IcosahedronGeometry(1,0),rock:new THREE.DodecahedronGeometry(1,0),horn:new THREE.ConeGeometry(1,1,4).translate(0,.5,0),stem:new THREE.CylinderGeometry(.6,1,1,5).translate(0,.5,0),
  table:new THREE.CylinderGeometry(1,.3,.25,7),tube:new THREE.CylinderGeometry(1,.8,1,6).translate(0,.5,0),fan:new THREE.CircleGeometry(1,7,0,Math.PI),blade:new THREE.PlaneGeometry(1,1,1,3).translate(0,.5,0),ball:new THREE.OctahedronGeometry(1,0)};
 for(const k in G)G[k]=G[k].index?G[k].toNonIndexed():G[k];
 const add=(g,x,y,z,sx,sy,sz,rx,ry,rz,hex,sway=0)=>{const pa=g.attributes.position.array;e.set(rx,ry,rz);q.setFromEuler(e);m.compose(at.set(x,y,z),q,sc.set(sx,sy,sz));
  for(let i=0;i<pa.length;i+=9){col.set(hex).multiplyScalar(.88+R()*.2);for(let j=0;j<9;j+=3){p.set(pa[i+j],pa[i+j+1],pa[i+j+2]).applyMatrix4(m);P.push(p.x,p.y,p.z);C.push(col.r,col.g,col.b);S.push(sway*Math.max(0,p.y-y));}}};
 const item=(x,z)=>{const g=heightAt(x,z),room=-.55-g;if(room<.08||g<-1.7)return;const c=pick(CORAL),k=R(),ry=R()*6.3;
  if(k<.2){const r=Math.min(.09+R()*.1,room*.8);add(G.brain,x,g+r*.3,z,r,r*.72,r,R(),ry,R(),c);}
  else if(k<.36){for(let i=0;i<5+R()*3;i++){const L=Math.min(.16+R()*.2,room*.95);add(G.horn,x+(R()-.5)*.1,g,z+(R()-.5)*.1,.022,L,.022,(R()-.5)*.9,ry,(R()-.5)*.9,c);}}
  else if(k<.47){const h=Math.min(.1,room*.5),r=.13+R()*.12;add(G.stem,x,g,z,.035,h,.035,0,ry,0,c);add(G.table,x,g+h,z,r,.35,r,0,ry,0,c);}
  else if(k<.58){for(let i=0;i<3+R()*3;i++){const h=Math.min(.1+R()*.2,room*.9);add(G.tube,x+(R()-.5)*.14,g,z+(R()-.5)*.14,.028,h,.028,(R()-.5)*.3,ry,(R()-.5)*.3,c);}}
  else if(k<.66){const r=Math.min(.12+R()*.1,room*.85);add(G.fan,x,g,z,r,r,1,(R()-.5)*.3,ry,0,c);}
  else if(k<.76){const r=.1+R()*.14;add(G.rock,x,g+r*.15,z,r*1.3,Math.min(r*.8,room),r*1.2,R(),ry,R(),R()<.5?'#8ea69a':'#a2a08f');}
  else if(k<.9){for(let i=0;i<3+R()*4;i++){const h=Math.min(.22+R()*.3,room*.95);add(G.blade,x+(R()-.5)*.16,g,z+(R()-.5)*.16,.045,h,1,0,R()*6.3,0,pick(['#4caf7a','#2f8f6a','#8bc34a','#3d8b5f']),1);}}
  else{for(let i=0;i<3;i++){const r=.035+R()*.03;add(G.ball,x+(R()-.5)*.12,g+r,z+(R()-.5)*.12,r,r,r,R(),R(),R(),c);}}};
 const cluster=(x,z,n)=>{for(let i=0;i<n;i++){const a=R()*6.3,r=Math.sqrt(R())*.55;item(x+Math.cos(a)*r,z+Math.sin(a)*r);}};
 for(let c=0;c<240;c++){const a=R()*Math.PI*2;if(Math.abs(Math.atan2(Math.sin(a-harbourAngle),Math.cos(a-harbourAngle)))<.24)continue;const r=waterline(a)+.7+Math.pow(R(),1.3)*3.3;cluster(Math.cos(a)*r,Math.sin(a)*r,3+R()*5|0);}
 for(const s of spots)for(let c=0;c<7;c++){const a=R()*6.3,r=.5+R()*1.1;cluster(s.x+Math.cos(a)*r,s.z+Math.sin(a)*r,4+R()*4|0);}
 for(let c=0;c<24;c++){const a=R()*6.3,r=1+R()*1.4;cluster(isletX+Math.cos(a)*r,isletZ+Math.sin(a)*r,3+R()*4|0);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('sway',new THREE.Float32BufferAttribute(S,1));g.computeVertexNormals();
 const rm=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.85,side:THREE.DoubleSide});
 rm.onBeforeCompile=sh=>{sh.uniforms.uTime=reefSway;sh.vertexShader='uniform float uTime;\nattribute float sway;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=sin(uTime*1.3+position.z*2.)*sway*.2;transformed.z+=cos(uTime*1.1+position.x*2.)*sway*.14;');};
 const reef=new THREE.Mesh(g,rm);reef.receiveShadow=true;scene.add(reef);}
// --- Schools of little folded fish circling each bank; they scatter when a hull passes over them.
const school=(()=>{const g=new THREE.BufferGeometry(),n=[.09,0,0],l=[0,.014,.032],t=[-.06,0,0],r=[0,.014,-.032],fl=[-.1,.004,.034],fr=[-.1,.004,-.034];
 g.setAttribute('position',new THREE.Float32BufferAttribute([...n,...l,...t,...n,...t,...r,...t,...fl,...fr],3));g.computeVertexNormals();
 const COLS=['#ffd166','#4cc9f0','#ff8fa3','#b8c4cc','#ff8a3d','#7ad3c4'],list=[],N=96,mesh=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({flatShading:true,roughness:.7,side:THREE.DoubleSide}),N),c=new THREE.Color();
 for(let i=0;i<N;i++){const s=i<spots.length*13?spots[i%spots.length]:null,a=Math.random()*6.3,wl=waterline(a)+1+Math.random()*3,cx=s?s.x:Math.cos(a)*wl,cz=s?s.z:Math.sin(a)*wl;
  list.push({cx,cz,r:.35+Math.random()*.8,w:(.5+Math.random()*.6)*(Math.random()<.5?-1:1),ph:Math.random()*6.3,y:Math.max(heightAt(cx,cz)+.12,-.8)+Math.random()*.08,flee:0,s:.8+Math.random()*.6});
  mesh.setColorAt(i,c.set(s?COLS[spots.indexOf(s)%COLS.length]:COLS[i%COLS.length]));}
 mesh.frustumCulled=false;scene.add(mesh);return {mesh,list};})();
const spotRipples=spots.map(()=>[0,1].map(k=>{const m=new THREE.Mesh(new THREE.RingGeometry(.26,.3,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false}));scene.add(m);return m;}));
// --- Palms on the beach, leaning out over the water.
{const railPts=rail.getSpacedPoints(300);let n=0;for(let i=0;i<90&&n<16;i++){const a=hash2(i,3)*Math.PI*2;if(Math.abs(Math.atan2(Math.sin(a-harbourAngle),Math.cos(a-harbourAngle)))<.3)continue;
 const r=waterline(a)-.95-hash2(i,5)*.5,x=Math.cos(a)*r,z=Math.sin(a)*r,g=groundY(x,z);if(g<-.3||g>.25)continue;
 if(railPts.some(p=>Math.hypot(p.x-x,p.z-z)<.55)||steps.some(s=>Math.hypot(s.pos[0]*SPREAD-x,s.pos[2]*SPREAD-z)<footprint(s.kind)+.4))continue;
 const palm=origami('palm',.85+hash2(i,7)*.4);palm.position.set(x,g-.03,z);palm.rotation.y=-a+(hash2(i,9)-.5)*.8;world.add(palm);n++;}}
// --- Clouds drifting high above the lagoon: only their shadows are drawn, sliding across the island and the water.
const clouds=[];for(let i=0;i<6;i++){const c=new THREE.Group(),cm=mat('#ffffff',{colorWrite:false,depthWrite:false}),n=3+(i%3);
 for(let k=0;k<n;k++){const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(.7+hash2(i,k)*.5,0),cm);puff.position.set(k*.55-n*.27,hash2(k,i)*.2,(hash2(i+k,2)-.5)*.5);puff.scale.y=.62;puff.castShadow=true;c.add(puff);}
 c.userData={a:i/6*Math.PI*2,r:5+hash2(i,1)*9,y:9+hash2(i,4)*1.4,w:.01+hash2(i,6)*.008,m:cm};scene.add(c);clouds.push(c);}
// --- Wakes: paper confetti peeling off the stern of anything that moves on the water.
const wakeGeo=new THREE.CircleGeometry(.12,5).rotateX(-Math.PI/2),wakes=[];let wakeNext=0;
for(let i=0;i<150;i++){const m=new THREE.Mesh(wakeGeo,new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false}));m.visible=false;scene.add(m);wakes.push({m,life:0,vx:0,vz:0});}
function trail(obj,dt,stern=.35){const u=obj.userData,p=obj.position;if(!u.last){u.last=p.clone();return;}const vx=(p.x-u.last.x)/dt,vz=(p.z-u.last.z)/dt,sp=Math.hypot(vx,vz);u.last.copy(p);
 u.wakeT=(u.wakeT||0)-dt;if(sp<.18||u.wakeT>0)return;u.wakeT=.06;const fx=vx/sp,fz=vz/sp;
 for(const side of [-1,1]){const w=wakes[wakeNext++%wakes.length];w.m.visible=true;w.life=1;w.m.position.set(p.x-fx*stern+fz*side*.1,0,p.z-fz*stern-fx*side*.1);w.vx=fz*side*.28;w.vz=-fx*side*.28;w.m.rotation.y=Math.random()*6.3;}}
// --- Sailing: take the helm of the fishing boat. ZQSD or the arrows (physical keys), Space to stop, Escape to leave.
const sail={on:false,speed:0,heading:0,roll:0,keys:new Set(),brake:false,goal:null},camTarget=new THREE.Vector3(0,.4,0),_ct=new THREE.Vector3();fisher.rotation.order='YZX';
const bubble=document.getElementById('world-bubble'),sailHud=document.getElementById('world-sailhud'),sailBtn=document.getElementById('world-sail'),pad=document.getElementById('world-pad'),fishPanel=document.getElementById('world-fish');
function enterSail(){if(sail.on)return;exitWalk();sail.on=true;fisher.userData.go=0;sail.heading=-Math.atan2(fisher.position.z,fisher.position.x);/* bow to the open sea */sail.speed=0;sail.goal={zoom:13,pitch:.98};card.hidden=true;document.body.classList.add('is-sailing');sailHud.hidden=false;pad.hidden=false;sailBtn.textContent='⚓ Quitter la barre';sailBtn.setAttribute('aria-pressed','true');hint.textContent='Vous tenez la barre : approchez un banc de poissons pour pêcher.';canvas.focus({preventScroll:true});}
function exitSail(){if(!sail.on)return;endFishing();sail.on=false;sail.keys.clear();fisher.userData.go=42.001;sail.goal={zoom:28,pitch:.62};document.body.classList.remove('is-sailing');sailHud.hidden=true;pad.hidden=true;bubble.hidden=true;sailBtn.textContent='⛵ Naviguer';sailBtn.setAttribute('aria-pressed','false');}
sailBtn.onclick=()=>{sail.on?exitSail():enterSail();sailBtn.blur();canvas.focus({preventScroll:true});};
pad.querySelectorAll('button').forEach(b=>{const k=b.dataset.k,on=e=>{e.preventDefault();if(walk.on){k==='fish'?walkInteract():walk.keys.add(k);return;}k==='fish'?(nearSpot()&&startFishing(nearSpot())):sail.keys.add(k);},off=()=>{sail.keys.delete(k);walk.keys.delete(k);};b.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,off));});
const nearSpot=()=>{let best=null,bd=1.6;for(const s of spots){const d=Math.hypot(s.x-fisher.position.x,s.z-fisher.position.z);if(d<bd){bd=d;best=s;}}return best;};
function updateSail(dt,t){const u=sail,thrust=(u.keys.has('up')?1:0)-(u.keys.has('down')?.55:0),turn=(u.keys.has('left')?1:0)-(u.keys.has('right')?1:0);
 if(fishing.phase)u.speed*=Math.pow(.15,dt);else{u.speed+=(thrust*2.1-u.speed*1.05)*dt;if(u.brake)u.speed*=Math.pow(.04,dt);}
 u.heading+=turn*dt*1.5*(.3+.7*Math.min(1,Math.abs(u.speed)/1.2))*(u.speed<-.05?-1:1);
 const fx=Math.cos(u.heading),fz=-Math.sin(u.heading),dir=u.speed<0?-1:1,nx=fisher.position.x+fx*u.speed*dt,nz=fisher.position.z+fz*u.speed*dt;
 if(heightAt(nx+fx*.42*dir,nz+fz*.42*dir)>-.7||Math.hypot(nx,nz)>30){if(Math.abs(u.speed)>.6)tone([140,95],.12);u.speed*=-.3;}else{fisher.position.x=nx;fisher.position.z=nz;}
 u.roll+=((-turn*u.speed*.1)-u.roll)*Math.min(1,dt*4);
 fisher.position.y=seaY(fisher.position.x,fisher.position.z,t)+.05;fisher.rotation.set(u.roll+Math.sin(t*1.3)*.035,u.heading,Math.sin(t*1.1)*.04+u.speed*.03);}
// --- Fishing: cast near a bank, wait for the bite, then reel in without snapping the line.
const SPECIES=[{id:'sardine',name:'Sardine',rar:0,cm:[12,20],c:['#9fb8c8','#eef4f6','#5f7f99'],d:.8},{id:'clown',name:'Poisson-clown',rar:0,cm:[8,11],c:['#ff8a3d','#fefefe','#1e1e1e'],d:.9,stripe:true},
 {id:'papillon',name:'Poisson-papillon',rar:1,cm:[12,18],c:['#ffd23f','#fefefe','#1e1e1e'],d:1},{id:'chirurgien',name:'Chirurgien bleu',rar:1,cm:[20,30],c:['#2f6fdb','#1e3f8f','#ffd23f'],d:1.1},
 {id:'perroquet',name:'Poisson-perroquet',rar:2,cm:[30,60],c:['#2ec4b6','#ff9ecf','#ff6f61'],d:1.3},{id:'merou',name:'Mérou',rar:2,cm:[40,90],c:['#8c6b4f','#c9a27e','#5a4432'],d:1.5},
 {id:'lune',name:'Poisson-lune',rar:3,cm:[120,180],c:['#b8c4cc','#e6ecef','#7d8b94'],d:1.7}];
const RARITY=['Commun','Peu commun','Rare','Légendaire'],RWEIGHT=[46,24,9,2],FAVOUR={usp:'papillon',sncf:'merou',reseau:'chirurgien',studio:'perroquet',bi:'clown',lean:'sardine'};
const loadLog=()=>{try{return JSON.parse(localStorage.getItem('atlas-carnet')||'{}');}catch(_){return {};}},saveLog=l=>{try{localStorage.setItem('atlas-carnet',JSON.stringify(l));}catch(_){}};
const mixHex=(a,b,k)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*k).toString(16).padStart(2,'0')).join('');};
function fishSVG(sp,known=true){const [b,be,ac]=known?sp.c:['#d8d3c8','#e6e2d9','#c4beb2'],L=h=>mixHex(h,'#ffffff',.2),D=h=>mixHex(h,'#000000',.18),poly=(pt,f)=>`<polygon points="${pt}" fill="${f}" stroke="#1e1e1e" stroke-opacity=".2" stroke-width=".8" stroke-linejoin="round"/>`;
 return `<svg viewBox="0 0 200 120" aria-hidden="true"><ellipse cx="100" cy="110" rx="60" ry="5" fill="#1e1e1e" opacity=".08"/>${poly('150,60 186,26 174,60',ac)}${poly('150,60 174,60 186,96',D(ac))}${poly('78,27 122,12 116,38',ac)}${poly('28,60 95,22 95,58',L(b))}${poly('95,22 142,48 95,58',b)}${poly('142,48 152,60 95,58',D(b))}${poly('28,60 95,58 95,96',be)}${poly('95,58 152,60 140,74',D(be))}${poly('95,58 140,74 95,96',mixHex(be,b,.35))}${sp.stripe&&known?poly('70,33 82,29 84,87 72,83','#fefefe')+poly('118,35 128,41 128,77 118,84','#fefefe'):''}${poly('92,66 112,74 96,86',ac)}<circle cx="50" cy="52" r="5" fill="#1e1e1e"/><circle cx="51.5" cy="50.5" r="1.6" fill="#fefefe"/></svg>`;}
const rod=new THREE.Mesh(new THREE.CylinderGeometry(.008,.014,.9,5).translate(0,.45,0),mat('#6b4a2e'));rod.position.set(-.22,.22,.1);rod.rotation.set(.5,0,.62);rod.visible=false;fisher.add(rod);
const rodTip=new THREE.Object3D();rodTip.position.set(0,.9,0);rod.add(rodTip);
const bobber=new THREE.Group();{const top=new THREE.Mesh(new THREE.ConeGeometry(.05,.07,6),mat('#e63946')),bot=new THREE.Mesh(new THREE.ConeGeometry(.05,.05,6),mat('#fefefe'));top.position.y=.035;bot.rotation.x=Math.PI;bot.position.y=-.025;bobber.add(top,bot);}bobber.visible=false;scene.add(bobber);
const lineGeo=new THREE.BufferGeometry().setFromPoints(Array.from({length:32},()=>new THREE.Vector3())),fishLine=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:'#fefefe',transparent:true,opacity:.9}));fishLine.visible=false;fishLine.frustumCulled=false;scene.add(fishLine);
const hooked=origami('fish',1,false);hooked.visible=false;hooked.castShadow=false;hooked.material=paperMat.clone();scene.add(hooked);
function paintHooked(sp){const c=hooked.geometry.attributes.color,col=new THREE.Color();for(let i=0;i<c.count;i+=3){col.set(sp.c[(i/3)%3]);for(let k=0;k<3;k++)c.setXYZ(i+k,col.r,col.g,col.b);}c.needsUpdate=true;}
const fishing={phase:null,t:0,spot:null,holding:false,progress:0,tension:0,sp:null,cm:0,from:new THREE.Vector3(),to:new THREE.Vector3(),wait:0,nibble:0,struggle:0,tick:0,ui:{}};
function splash(v=.12){if(muted)return;audio??=new(window.AudioContext||window.webkitAudioContext)();const n=audio.sampleRate*.25|0,b=audio.createBuffer(1,n,audio.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);const s=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();s.buffer=b;f.type='bandpass';f.frequency.value=900;g.gain.value=v;s.connect(f).connect(g).connect(audio.destination);s.start();}
function fishCard(inner,view=''){fishPanel.dataset.view=view;fishPanel.classList.remove('is-strained');fishPanel.innerHTML=`<span class="world-kicker">${view==='log'||!fishing.spot?'Carnet de bord':fishing.spot.name}</span><button class="world-close" aria-label="Fermer">×</button>${inner}`;fishPanel.hidden=false;fishPanel.querySelector('.world-close').onclick=()=>{fishing.phase?endFishing():fishPanel.hidden=true;};
 fishPanel.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>({again:()=>startFishing(fishing.spot),sail:()=>endFishing(),log:()=>showLog(),back:()=>fishing.phase==='log'?showResult():(fishPanel.hidden=true)})[b.dataset.act]());}
function startFishing(spot){if(!sail.on)return;endFishing(true);Object.assign(fishing,{phase:'cast',t:0,spot,holding:false,progress:0,tension:0,sp:null});sail.speed=0;rod.visible=bobber.visible=fishLine.visible=true;hooked.visible=false;bubble.hidden=true;
 fisher.updateMatrixWorld(true);rodTip.getWorldPosition(fishing.from);const dx=spot.x-fisher.position.x,dz=spot.z-fisher.position.z,d=Math.hypot(dx,dz);
 const side=new THREE.Vector3(0,0,1).applyQuaternion(fisher.quaternion);const dir=d>.35?new THREE.Vector3(dx/d,0,dz/d):side.setY(0).normalize(),reach=THREE.MathUtils.clamp(d,1.2,1.8);
 fishing.to.set(fisher.position.x+dir.x*reach,0,fisher.position.z+dir.z*reach);tone([300,500],.12);
 fishCard(`<h2>On lance…</h2><p class="fish-help">La ligne file vers le banc.</p>`);}
function endFishing(keepPanel){fishing.phase=null;fishing.holding=false;rod.visible=bobber.visible=fishLine.visible=hooked.visible=false;if(!keepPanel)fishPanel.hidden=true;}
function showReel(){fishCard(`<h2>Un peu de mou, un peu de tension</h2><div class="fish-meter"><div class="fish-row"><span>Prise</span><b data-p>0 %</b></div><div class="fish-bar"><i data-pb></i></div></div>
 <div class="fish-meter"><div class="fish-row"><span>Tension de la ligne</span><b data-t>0 %</b></div><div class="fish-bar fish-tension"><em data-tm></em></div><div class="fish-zones"><span>Sûr</span><span>Attention</span><span>Rupture</span></div></div>
 <p class="fish-help">Maintenir pour ramener · relâcher pour donner du mou</p><button class="fish-hold" data-hold>Maintenir pour ramener</button>`);
 const q=s=>fishPanel.querySelector(s);fishing.ui={p:q('[data-p]'),pb:q('[data-pb]'),t:q('[data-t]'),tm:q('[data-tm]')};const h=q('[data-hold]');
 h.addEventListener('pointerdown',e=>{e.preventDefault();fishing.holding=true;h.setPointerCapture(e.pointerId);});['pointerup','pointercancel','lostpointercapture'].forEach(k=>h.addEventListener(k,()=>fishing.holding=false));}
function showResult(){const f=fishing,log=loadLog();if(f.phase==='lost'){fishCard(`<h2>${f.lostWhy}</h2><p class="fish-help">Le poisson est reparti dans le récif.</p><div class="fish-actions"><button data-act="again">Pêcher encore</button><button data-act="sail">Reprendre la barre</button></div>`);return;}
 f.phase='caught';const e=log[f.sp.id];fishCard(`<h2>Belle journée sur le récif</h2><div class="fish-art">${fishSVG(f.sp)}</div><p class="fish-rarity r${f.sp.rar}">${RARITY[f.sp.rar]}</p><p class="fish-name">${f.sp.name}</p><p class="fish-size">${f.cm} cm</p>
 <p class="fish-note">${f.isNew?'Nouvelle espèce au carnet !':f.isRecord?'Record personnel !':`Déjà ${e.n} au carnet · record ${e.best} cm`}</p><p class="fish-help">Relâché dans le récif.</p>
 <div class="fish-actions"><button data-act="again">Pêcher encore</button><button data-act="sail">Reprendre la barre</button><button data-act="log">Carnet de bord ↗</button></div>`);}
function showLog(){const log=loadLog(),n=SPECIES.filter(s=>log[s.id]).length,wasFishing=fishing.phase==='caught';if(wasFishing)fishing.phase='log';
 fishCard(`<h2>${n} / ${SPECIES.length} espèces</h2><ul class="fish-log">${SPECIES.map(s=>{const e=log[s.id];return `<li class="${e?'':'is-unknown'}">${fishSVG(s,!!e)}<b>${e?s.name:'???'}</b><span>${RARITY[s.rar]}${e?` · ×${e.n} · ${e.best} cm`:''}</span></li>`;}).join('')}</ul>
 <div class="fish-actions">${wasFishing?'<button data-act="back">← Retour</button><button data-act="again">Pêcher encore</button>':'<button data-act="back">Fermer</button>'}</div>`,'log');}
document.getElementById('world-log').onclick=e=>{e.currentTarget.blur();if(/cast|wait|bite|reel|jump/.test(fishing.phase||''))return;if(!fishPanel.hidden&&fishPanel.dataset.view==='log'){fishing.phase==='log'?showResult():(fishPanel.hidden=true);}else showLog();};
function rollSpecies(spot){const w=SPECIES.map(s=>RWEIGHT[s.rar]*(FAVOUR[spot.id]===s.id?3:1)),tot=w.reduce((a,b)=>a+b);let r=Math.random()*tot;for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return SPECIES[i];}return SPECIES[0];}
const _tip=new THREE.Vector3(),_ctl=new THREE.Vector3(),_bp=new THREE.Vector3();
function updateFishing(dt,t){const f=fishing;if(!f.phase)return;f.t+=dt;fisher.updateMatrixWorld(true);rodTip.getWorldPosition(_tip);
 const sy=seaY(f.to.x,f.to.z,t)+.02;let sag=.35;
 if(f.phase==='cast'){const k=Math.min(1,f.t/.65);_bp.lerpVectors(_tip,_ctl.set(f.to.x,sy,f.to.z),k);_bp.y+=Math.sin(k*Math.PI)*.6;sag=.05;if(k>=1){splash(.1);f.phase='wait';f.t=0;f.wait=2+Math.random()*3.5;f.nibble=0;fishCard(`<h2>Ça mordille. Attendez la touche.</h2><button class="fish-hold" disabled>Attendre la touche…</button>`);}}
 else if(f.phase==='wait'){_bp.set(f.to.x,sy,f.to.z);f.nibble-=dt;if(f.nibble<-.2&&Math.random()<dt*1.2){f.nibble=.25;tone([620],.04);}if(f.nibble>0)_bp.y-=Math.sin(f.nibble/.25*Math.PI)*.035;
  if(f.t>f.wait){f.phase='bite';f.t=0;f.sp=rollSpecies(f.spot);f.cm=Math.round(f.sp.cm[0]+Math.pow(Math.random(),1.6)*(f.sp.cm[1]-f.sp.cm[0]));paintHooked(f.sp);hooked.scale.setScalar(.6+f.cm/90);splash(.2);tone([880,660],.1);fishCard(`<h2>Ça mord !</h2><button class="fish-hold" disabled>Ferrer…</button>`);}}
 else if(f.phase==='bite'){_bp.set(f.to.x,sy-.07,f.to.z);if(f.t>.55){f.phase='reel';f.t=0;f.progress=10;f.tension=25;showReel();}}
 else if(f.phase==='reel'){const d=f.sp.d;f.struggle=Math.max(0,Math.sin(t*2.3+f.cm)*.6+Math.sin(t*5.1)*.4)+(Math.random()<dt*.5?1.5:0);
  if(f.holding){f.progress+=dt*(17/d)*(1-f.tension/220);f.tension+=dt*(26+30*d*f.struggle);f.tick-=dt;if(f.tick<0){f.tick=.08;tone([1500+Math.random()*200],.025);}}
  else{f.tension-=dt*50;f.progress-=dt*3.5*d;}
  f.tension=THREE.MathUtils.clamp(f.tension,0,100);f.progress=THREE.MathUtils.clamp(f.progress,0,100);
  const k=f.progress/100;_bp.lerpVectors(_ctl.set(f.to.x,0,f.to.z),fisher.position,k*.8);_bp.x+=Math.sin(t*3.1)*.12*f.struggle;_bp.z+=Math.cos(t*2.7)*.12*f.struggle;_bp.y=seaY(_bp.x,_bp.z,t)-.03*f.struggle;sag=.35*(1-f.tension/100);
  hooked.visible=true;hooked.position.set(_bp.x-.1,-.66,_bp.z-.05);hooked.rotation.set(0,t*2.4+Math.sin(t*9)*.4,Math.sin(t*12)*.2);
  const u=f.ui;if(u.p){u.p.textContent=Math.round(f.progress)+' %';u.pb.style.width=f.progress+'%';u.t.textContent=Math.round(f.tension)+' %';u.tm.style.left=f.tension+'%';fishPanel.classList.toggle('is-strained',f.tension>80);}
  if(f.tension>=100){f.phase='lost';f.lostWhy='La ligne a cassé';tone([180,90],.25);rod.visible=bobber.visible=fishLine.visible=hooked.visible=false;showResult();return;}
  if(f.progress>=100){f.phase='jump';f.t=0;splash(.25);const log=loadLog(),e=log[f.sp.id];f.isNew=!e;f.isRecord=!!e&&f.cm>e.best;log[f.sp.id]={n:(e?.n||0)+1,best:Math.max(e?.best||0,f.cm)};saveLog(log);f.jumpFrom=_bp.clone();}}
 else if(f.phase==='jump'){const k=Math.min(1,f.t/.9);hooked.visible=true;hooked.position.lerpVectors(f.jumpFrom,fisher.position,k);hooked.position.y=-.5+Math.sin(k*Math.PI)*1.1;hooked.rotation.z=(.5-k)*3;_bp.copy(hooked.position);sag=0;
  if(k>=1){hooked.visible=false;bobber.visible=fishLine.visible=false;tone([523,659,784],.18);showResult();if(!eggs.get('pêche').found)foundEgg('pêche','Première prise : le carnet de bord s’ouvre dans le coin.');}}
 if(!bobber.visible)return;bobber.position.copy(_bp);
 const pa=lineGeo.attributes.position;_ctl.lerpVectors(_tip,_bp,.5);_ctl.y-=sag;for(let i=0;i<32;i++){const s=i/31,a=(1-s)*(1-s),b=2*(1-s)*s,c=s*s;pa.setXYZ(i,_tip.x*a+_ctl.x*b+_bp.x*c,_tip.y*a+_ctl.y*b+_bp.y*c,_tip.z*a+_ctl.z*b+_bp.z*c);}pa.needsUpdate=true;}
// --- Walking: explore the island at eye level. ZQSD (physical keys) to walk and strafe, drag to look, ← → to turn,
// Shift to run, E to open the nearest building's card, Escape to leave. Collisions are cast against the real meshes.
const walk={on:false,pos:new THREE.Vector3(),yaw:0,look:-.08,keys:new Set(),run:false,bob:0,near:null,lastFov:30},EYE=.3,walkHud=document.getElementById('world-walkhud'),walkBtn=document.getElementById('world-walk');
const walkRay=new THREE.Raycaster();walkRay.params.Line.threshold=.001;walkRay.camera=camera;
const obstacles=()=>world.children.filter(o=>o!==island&&!o.isSprite);
function blocked(from,dir,len){walkRay.far=len;for(const h of [.2,.3]){walkRay.set(new THREE.Vector3(from.x,groundY(from.x,from.z)+h,from.z),dir);const hit=walkRay.intersectObjects(obstacles(),true).find(x=>x.object.isMesh&&x.object.visible);if(hit)return true;}return false;}
const dry=(x,z)=>groundY(x,z,-9)>-.4;
function enterWalk(){if(walk.on)return;exitSail();card.hidden=true;walk.on=true;walk.keys.clear();
 // Start on the ring road, facing the stadium, on the side the camera was looking from.
 const a=Math.atan2(Math.cos(spin),Math.sin(spin));walk.pos.set(Math.cos(a)*2.05,0,Math.sin(a)*2.05);walk.yaw=Math.atan2(walk.pos.x,walk.pos.z);walk.look=-.08;
 walk.lastFov=camera.fov;camera.fov=62;camera.near=.02;camera.updateProjectionMatrix();camera.rotation.order='YXZ';
 document.body.classList.add('is-sailing','is-walking');walkHud.hidden=false;pad.hidden=false;walkBtn.textContent='🚶 Quitter la marche';walkBtn.setAttribute('aria-pressed','true');hint.textContent='À pied sur l’île : approchez un bâtiment et appuyez sur E pour ouvrir sa fiche.';canvas.focus({preventScroll:true});}
function exitWalk(){if(!walk.on)return;for(const h of houses){const l=h.userData.label;l.scale.set(2.6,.65,1);l.position.y=l.userData.y;l.visible=true;}walk.on=false;walk.keys.clear();camera.fov=walk.lastFov;camera.near=.1;camera.updateProjectionMatrix();camera.rotation.order='XYZ';
 document.body.classList.remove('is-sailing','is-walking');walkHud.hidden=true;pad.hidden=true;walkBtn.textContent='🚶 Marcher';walkBtn.setAttribute('aria-pressed','false');}
walkBtn.onclick=()=>{walk.on?exitWalk():enterWalk();walkBtn.blur();canvas.focus({preventScroll:true});};
function nearHouse(){let best=null,bd=1.5;for(const g of houses){const b=g.userData.box,dx=Math.max(b.min.x-walk.pos.x,0,walk.pos.x-b.max.x),dz=Math.max(b.min.z-walk.pos.z,0,walk.pos.z-b.max.z),d=Math.hypot(dx,dz);if(d<bd){bd=d;best=g;}}return best;}
function walkInteract(){const g=nearHouse();if(g)showCard(g.userData.step);}
function updateWalk(dt,t){const k=walk.keys,turn=(k.has('left')?1:0)-(k.has('right')?1:0);walk.yaw+=turn*dt*1.9;
 const fwd=(k.has('up')?1:0)-(k.has('down')?1:0),side=(k.has('sright')?1:0)-(k.has('sleft')?1:0),speed=(walk.run?2.3:1.15)*dt;
 const moving=fwd||side;if(moving){const sy=Math.sin(walk.yaw),cy=Math.cos(walk.yaw),v=new THREE.Vector3(-sy*fwd+cy*side,0,-cy*fwd-sy*side).normalize();
  // Try the full step, then slide along whichever axis is free.
  for(const d of [v,new THREE.Vector3(v.x,0,0),new THREE.Vector3(0,0,v.z)]){if(d.lengthSq()<1e-4)continue;const dir=d.clone().normalize(),nx=walk.pos.x+dir.x*speed,nz=walk.pos.z+dir.z*speed;
   if(dry(nx,nz)&&!blocked(walk.pos,dir,speed+.14)){walk.pos.x=nx;walk.pos.z=nz;break;}}
  walk.bob+=dt*(walk.run?13:9);}
 const gy=groundY(walk.pos.x,walk.pos.z);walk.pos.y+=(gy-walk.pos.y)*Math.min(1,dt*12);
 camera.position.set(walk.pos.x,walk.pos.y+EYE+(moving?Math.sin(walk.bob)*.012:0),walk.pos.z);camera.rotation.set(walk.look,walk.yaw,0);
 // Labels shrink to signposts at eye level and step aside when you stand right under them.
 for(const h of houses){const l=h.userData.label,d=Math.hypot(h.position.x-walk.pos.x,h.position.z-walk.pos.z);l.scale.set(1.15,.29,1);l.position.y=l.userData.y+.15;l.visible=d>1.3;}
 const g=nearHouse();if(g!==walk.near){walk.near=g;hint.textContent=g?`E · ouvrir la fiche : ${g.userData.step.name}`:'À pied · ZQSD, glisser pour regarder';}}
function onWalkKey(e,down){if(!walk.on||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return false;
 const K={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'sleft',KeyD:'sright',ArrowLeft:'left',ArrowRight:'right'}[e.code];
 if(K){e.preventDefault();down?walk.keys.add(K):walk.keys.delete(K);return true;}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight'){walk.run=down;return true;}
 if((e.code==='KeyE'||e.code==='Enter')&&down&&!e.repeat){e.preventDefault();walkInteract();return true;}
 if(e.code==='Escape'&&down){card.hidden?exitWalk():card.hidden=true;return true;}return false;}
window.addEventListener('keyup',e=>onWalkKey(e,false));
window.addEventListener('blur',()=>{walk.keys.clear();walk.run=false;});
function onSailKey(e,down){if(!sail.on||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return false;const K={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'}[e.code];
 if(fishing.phase){if(e.code==='Space'||e.code==='KeyF'){e.preventDefault();if(fishing.phase==='reel')fishing.holding=down;else if(down&&!e.repeat&&/caught|lost|log/.test(fishing.phase))startFishing(fishing.spot);return true;}
  if(e.code==='Escape'&&down){endFishing();return true;}if(K){e.preventDefault();if(down&&/caught|lost|log/.test(fishing.phase)){endFishing();sail.keys.add(K);}else if(!down)sail.keys.delete(K);return true;}return false;}
 if(K){e.preventDefault();down?sail.keys.add(K):sail.keys.delete(K);return true;}
 if(e.code==='Space'){e.preventDefault();sail.brake=down;return true;}
 if(e.code==='KeyF'){if(down&&!e.repeat){const s=nearSpot();if(s)startFishing(s);}return true;}
 if(e.code==='Escape'&&down){exitSail();return true;}return false;}
window.addEventListener('keyup',e=>onSailKey(e,false));
bubble.onclick=()=>{const s=nearSpot();if(s)startFishing(s);};
const _proj=new THREE.Vector3(),_q=new THREE.Quaternion(),_e=new THREE.Euler();
function updateLagoon(dt,t){
 school.list.forEach((f,i)=>{const bx=fisher.position.x-f.cx,bz=fisher.position.z-f.cz;if(Math.hypot(bx,bz)<f.r+.8&&(sail.on||fisher.userData.go))f.flee=Math.min(1,f.flee+dt*3);else f.flee=Math.max(0,f.flee-dt*.4);
  const a=f.ph+t*f.w*(1+f.flee*1.5),r=f.r*(1+.15*Math.sin(t*.7+f.ph)+f.flee*.9),x=f.cx+Math.cos(a)*r,z=f.cz+Math.sin(a)*r,tx=-Math.sin(a)*Math.sign(f.w),tz=Math.cos(a)*Math.sign(f.w);
  _e.set(0,Math.atan2(-tz,tx)+Math.sin(t*8+i)*.25,0);_m.compose(_a.set(x,f.y+Math.sin(t*2+i)*.02,z),_q.setFromEuler(_e),_s.setScalar(f.s));school.mesh.setMatrixAt(i,_m);});school.mesh.instanceMatrix.needsUpdate=true;
 spots.forEach((s,i)=>spotRipples[i].forEach((m,k)=>{const ph=((t*.35+k*.5+i*.13)%1);m.position.set(s.x,seaY(s.x,s.z,t)+.01,s.z);m.scale.setScalar(1+ph*3.2);m.material.opacity=.4*Math.sin(ph*Math.PI)*(night?.4:1);}));
 clouds.forEach(c=>{const u=c.userData;u.a+=u.w*dt;c.position.set(Math.cos(u.a)*u.r,u.y,Math.sin(u.a)*u.r);c.rotation.y=-u.a;});
 trail(boat,dt,.45);trail(fisher,dt,.38);
 wakes.forEach(w=>{if(w.life<=0)return;w.life-=dt/1.8;if(w.life<=0){w.m.visible=false;return;}w.m.position.x+=w.vx*dt;w.m.position.z+=w.vz*dt;w.vx*=.97;w.vz*=.97;w.m.position.y=seaY(w.m.position.x,w.m.position.z,t)+.015;w.m.scale.setScalar(1+(1-w.life)*2.4);w.m.material.opacity=.6*w.life*w.life;});
 if(sail.on)updateSail(dt,t);updateFishing(dt,t);
 const s=sail.on&&!fishing.phase?nearSpot():null;bubble.hidden=!s;
 if(s){if(bubble.dataset.spot!==s.name){bubble.dataset.spot=s.name;bubble.innerHTML=`<small>${s.name}</small><span><kbd>F</kbd> · Pêcher</span>`;}_proj.copy(fisher.position).setY(fisher.position.y+1.1).project(camera);bubble.style.transform=`translate(${(_proj.x*.5+.5)*host.clientWidth}px,${(-_proj.y*.5+.5)*host.clientHeight}px) translate(-50%,-100%)`;}}
eggs.set('pêche',{text:'',found:false});
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
function setNight(on){night=on;scene.background.set(on?NIGHT_SKY:SKY);scene.fog.color.set(on?NIGHT_SKY:SKY);hemi.intensity=on?.3:1.1;sun.intensity=on?.45:2.1;paperMat.emissive.set('#ff8a3d');paperMat.emissiveIntensity=on?.05:0;
 const w=water.material.userData.u,pal=on?['#3f7f8a','#23596b','#193f58','#122a40','#9fb4c0']:['#a4f0dc','#3fc8c0','#1f93b5','#1c5f94','#ffffff'];['uShallow','uLagoon','uMid','uDeep','uFoam'].forEach((k,i)=>w[k].value.set(pal[i]));w.uCaustic.value=on?.25:1;beam.material.opacity=on?.28:0;lamp.material.emissiveIntensity=on?1.4:.3;document.body.classList.toggle('is-night',on);}
// --- Cards.
function showCard(step){card.innerHTML=`<button class="world-close" aria-label="Fermer">×</button><span class="world-kicker">${step.role}</span><h2>${step.name}</h2><p>${step.text}</p>${step.link?`<a href="${step.link}">Ouvrir <span>↗</span></a>`:''}`;card.hidden=false;card.querySelector('.world-close').onclick=()=>card.hidden=true;}
function foundEgg(id,text){const e=eggs.get(id);if(!e)return;if(!e.found){e.found=true;found++;eggsHud.textContent=`Easter eggs : ${found} / ${eggs.size}`;if(found===eggs.size)fireworks();}hint.textContent=text;hint.classList.add('is-flash');setTimeout(()=>hint.classList.remove('is-flash'),900);}
let sparks=[];function fireworks(){tone([523,659,784,1047],.3);for(let i=0;i<120;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.05,6,4),mat(i%3?ORANGE:i%2?'#ffd23f':INK));s.position.set(0,3,0);s.userData.v=new THREE.Vector3((Math.random()-.5)*.25,Math.random()*.2,(Math.random()-.5)*.25);scene.add(s);sparks.push(s);}hint.textContent='Tous les easter eggs sont trouvés : feu d’artifice !';}
// --- Interaction.
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let downAt=null;
canvas.addEventListener('pointerdown',e=>{downAt={x:e.clientX,y:e.clientY,spin};dragging={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(dragging&&walk.on){walk.yaw-=(e.clientX-dragging.x)*.004;walk.look=THREE.MathUtils.clamp(walk.look-(e.clientY-dragging.y)*.003,-1.1,.9);dragging.x=e.clientX;dragging.y=e.clientY;}else if(dragging){spin=downAt.spin+(e.clientX-downAt.x)*.006;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-dragging.y)*.002,.35,1.25);dragging.y=e.clientY;}else{pick(e,false);}});
canvas.addEventListener('pointerup',e=>{const moved=downAt&&Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)>5;dragging=null;if(!moved)pick(e,true);});
canvas.addEventListener('pointercancel',()=>dragging=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(walk.on)return;zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.02,8,40);},{passive:false});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinch)zoom=THREE.MathUtils.clamp(zoom*(pinch/d),8,40);pinch=d;e.preventDefault();}},{passive:false});canvas.addEventListener('touchend',()=>pinch=null);
function pick(e,click){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(ndc,camera);const hit=ray.intersectObjects([world,boat,duck,fisher,pier,...fish,...birds],true).find(h=>h.object.visible&&!(h.object.isLineSegments));canvas.style.cursor=hit&&(hit.object.userData.egg||hit.object.userData.building)?'pointer':'grab';if(!click||!hit)return;const o=hit.object;if(o.userData.egg){const e2=eggs.get(o.userData.egg);e2.action?.();foundEgg(o.userData.egg,e2.text);return;}if(o.userData.building)showCard(o.userData.building.userData.step);}
document.getElementById('world-pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'▶':'Ⅱ';e.target.setAttribute('aria-label',paused?'Reprendre la rotation':'Mettre en pause');};
document.getElementById('world-reset').onclick=()=>{exitWalk();exitSail();spin=0;pitch=.62;zoom=28;card.hidden=true;setNight(false);};
window.addEventListener('keydown',e=>{if(onWalkKey(e,true)||onSailKey(e,true))return;if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(/^Arrow/.test(e.code))e.preventDefault();if(e.code==='ArrowLeft')spin-=.08;if(e.code==='ArrowRight')spin+=.08;if(e.code==='ArrowUp')pitch=Math.min(1.25,pitch+.04);if(e.code==='ArrowDown')pitch=Math.max(.35,pitch-.04);if(e.key==='+'||e.key==='=')zoom=Math.max(8,zoom-2);if(e.key==='-')zoom=Math.min(40,zoom+2);if(e.code==='Space'){e.preventDefault();document.getElementById('world-pause').click();}});
const resize=()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
const clock=new THREE.Clock();
let perfT=0,perfN=0;
function frame(){const raw=clock.getDelta(),dt=Math.min(.05,raw),t=clock.elapsedTime;
 if(raw<.25){perfT+=raw;perfN++;}if(perfT>2){const avg=perfT/perfN;if(avg>.024&&pixelRatio>.9){pixelRatio=Math.max(.85,pixelRatio-.2);renderer.setPixelRatio(pixelRatio);resize();}perfT=perfN=0;}if(!paused&&!dragging&&!sail.on)spin+=spinVel;
 if(sail.goal){const g=sail.goal,k=Math.min(1,dt*2.2);zoom+=(g.zoom-zoom)*k;pitch+=(g.pitch-pitch)*k;if(Math.abs(g.zoom-zoom)<.05)sail.goal=null;}
 // At the helm the camera follows the boat from high above; otherwise it circles the island, shifted clear of the intro text.
 // while fishing, aim a little nearer so the boat sits above the fishing panel
 if(walk.on)updateWalk(dt,t);else{
 camTarget.lerp(sail.on?_ct.set(fisher.position.x+(fishing.phase?Math.sin(spin)*1.8:0),-.3,fisher.position.z+(fishing.phase?Math.cos(spin)*1.8:0)):_ct.set(0,.4,0),Math.min(1,dt*(sail.on?3:1.6)));
 const dist=zoom,shift=innerWidth>850&&!sail.on?-4.6*(zoom/28):0;camera.position.set(camTarget.x+Math.sin(spin)*dist*Math.cos(pitch),camTarget.y+Math.sin(pitch)*dist,camTarget.z+Math.cos(spin)*dist*Math.cos(pitch));camera.lookAt(camTarget);camera.translateX(shift);camera.lookAt(camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3())));}
 water.material.userData.u.uTime.value=t;reefSway.value=t;
 waves.forEach(w=>{const u=w.userData,f=u.foam;u.age+=dt;
  if(u.phase==='in'){u.d-=u.speed*dt*(.7+.6*Math.min(1,u.d/3));if(u.d<.42){u.phase='break';u.age=0;}}
  else if(u.age>1.1){u.phase='in';u.age=0;u.d=4.2+Math.random()*.9;u.a=offIslet(u.a+Math.random()*.24-.12);u.scale=.55+Math.random()*.35;}
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
 fish.forEach((f,i)=>{const u=f.userData;u.t+=dt;if(Math.hypot(u.x-isletX,u.z-isletZ)<1.1&&!u.jump){u.a=Math.atan2(u.z-isletZ,u.x-isletX);u.x+=Math.cos(u.a)*.05;u.z+=Math.sin(u.a)*.05;}if(u.jump>0){u.jump+=dt*1.6;const h=Math.sin(Math.min(Math.PI,u.jump*Math.PI))*1.1;f.position.set(u.x+u.dx*u.jump*1.2,-.5+h,u.z+u.dz*u.jump*1.2);f.rotation.z=(.5-u.jump)*1.6;if(u.jump>=1){u.jump=0;u.x+=u.dx*1.2;u.z+=u.dz*1.2;u.a=Math.atan2(u.dz,u.dx);}}else{u.a+=Math.sin(u.t*.7+i)*dt*.4;u.x+=Math.cos(u.a)*dt*.6;u.z+=Math.sin(u.a)*dt*.6;const r=Math.hypot(u.x,u.z);if(r>17||r<waterline(Math.atan2(u.z,u.x))+2.4){u.a+=Math.PI;u.x+=Math.cos(u.a)*.3;u.z+=Math.sin(u.a)*.3;}f.position.set(u.x,-.56+Math.sin(u.t*3)*.03,u.z);f.rotation.z=0;if(Math.random()<dt*.06){u.jump=.001;u.dx=Math.cos(u.a);u.dz=Math.sin(u.a);}}f.rotation.y=-u.a;f.rotation.x=Math.sin(u.t*9)*.15;});
 trainT=(trainT+trainSpeed*dt)%1;const head=trainT*railLen;for(const c of cars)carPose(c,head-c.userData.behind);
 carS+=.5*dt;carPose(car,carS,loop,loopLen,-.03);// the ring's centre line sits .12 above ground, its tarmac .09
 {const u=boat.userData,dock=new THREE.Vector3(Math.cos(harbourAngle)*(PIER_R+3.2)-Math.cos(harbourAngle+Math.PI/2)*1.9,-.45,Math.sin(harbourAngle)*(PIER_R+3.2)-Math.sin(harbourAngle+Math.PI/2)*1.9);if(!u.placed){u.placed=1;boat.position.copy(dock);boat.rotation.y=-harbourAngle-Math.PI/2;}
 if(u.state==='sail'){u.timer-=dt;boatT+=boatSpeed*dt*60;boat.position.set(Math.cos(boatT*.35)*BOAT_R,-.45+Math.sin(t*2)*.04,Math.sin(boatT*.35)*BOAT_R);boat.rotation.y=-boatT*.35+Math.PI;u.blend=1;if(u.timer<0&&Math.abs(((boatT*.35)%(Math.PI*2))-harbourAngle)<.25){u.state='in';u.timer=0;}}
 else if(u.state==='in'){u.timer+=dt;const k=Math.min(1,u.timer/4);boat.position.lerp(dock,k*.08);boat.rotation.y+=(-harbourAngle-Math.PI/2-boat.rotation.y)*.05;if(k>=1){u.state='furl';u.timer=0;}}
 else if(u.state==='furl'){u.timer+=dt;boat.position.lerp(dock,.1);u.blend=Math.max(0,1-u.timer/2.5);if(u.go){u.state='hoist';u.timer=u.blend*2.2;u.go=0;}else if(u.timer>2.5){u.state='dock';u.timer=30+Math.random()*20;}}
 else if(u.state==='dock'){u.timer-=dt;boat.position.lerp(dock,.1);boat.position.y=-.45+Math.sin(t*1.3)*.04;boat.rotation.y+=(-harbourAngle-Math.PI/2-boat.rotation.y)*.05;u.blend=0;if(u.timer<0||u.go){u.go=0;u.state='hoist';u.timer=0;}}
 else if(u.state==='hoist'){u.timer+=dt;boat.position.lerp(dock,.1);u.blend=Math.min(1,u.timer/2.2);if(u.timer>2.6){u.state='out';u.timer=0;boatT=harbourAngle/.35;}}
 else{u.timer+=dt;const k=Math.min(1,u.timer/4);const target=new THREE.Vector3(Math.cos(boatT*.35)*BOAT_R,-.45,Math.sin(boatT*.35)*BOAT_R);boat.position.lerp(target,k*.08);u.blend=1;if(k>=1){u.state='sail';u.timer=24+Math.random()*12;}}
 boat.rotation.z=Math.sin(t*1.7)*.06*(.3+.7*u.blend);const e=u.blend*u.blend*(3-2*u.blend);rig.scale.set(.3+.7*e,.05+.95*e,1);sails.rotation.y=u.blend>.95?Math.sin(t*3.1)*.04:0;}
 if(!sail.on){fisher.position.y=-.45+Math.sin(t*1.4)*.05;fisher.rotation.x=0;fisher.rotation.z=Math.sin(t*1.1)*.05;}if(fisher.userData.go&&!sail.on){const g=fisher.userData.go+=dt,T=42,u=g/T,ang=harbourAngle+Math.sin(u*Math.PI*2)*.9,rad=PIER_R+3+Math.sin(u*Math.PI)*2.6;const target=new THREE.Vector3(Math.cos(ang)*rad,fisher.position.y,Math.sin(ang)*rad);fisher.position.x+=(target.x-fisher.position.x)*.04;fisher.position.z+=(target.z-fisher.position.z)*.04;fisher.rotation.y+=((-ang-Math.PI/2+Math.cos(u*Math.PI*2)*.6)-fisher.rotation.y)*.03;if(g>T){fisher.position.x+=(fisher.userData.home.x-fisher.position.x)*.05;fisher.position.z+=(fisher.userData.home.z-fisher.position.z)*.05;fisher.rotation.y+=((-harbourAngle-Math.PI/2)-fisher.rotation.y)*.05;if(g>T+6){fisher.userData.go=0;fisher.position.copy(fisher.userData.home);fisher.rotation.y=-harbourAngle-Math.PI/2;}}}
 if(duck.userData.flee){duck.userData.flee+=dt;duck.position.x-=dt*1.5;duck.position.z+=dt*.6;if(duck.userData.flee>4){duck.userData.flee=0;duck.position.copy(DUCK);}}duck.position.y=-.45+Math.sin(t*3)*.03;
 birds.forEach((b,i)=>{const a=t*.25+b.userData.phase;b.position.set(Math.cos(a)*(8.2+i*.5),3.8+Math.sin(t*2+i)*.2,Math.sin(a)*(8.2+i*.5));b.rotation.y=-a-Math.PI/2;b.rotation.x=Math.sin(t*6+i)*.25;});
 world.traverse(o=>{if(o.userData.hand)o.userData.hand.rotation.z=-t*.2;if(o.userData.cat){const c=o.userData.cat,u=c.userData;u.head.rotation.y=Math.sin(t*.6)*.5;u.head.rotation.z=Math.sin(t*.9)*.08;for(let i=0;i<6;i++)u.tail.userData['s'+i].rotation.z=.22+Math.sin(t*2.2-i*.6)*.18;u.tail.rotation.y=Math.sin(t*.8)*.4;u.eyes.emissiveIntensity=night?1.6:.4;
  if(u.jump){u.jump+=dt*4;c.position.y=1.18+Math.sin(Math.min(Math.PI,u.jump))*.4;c.rotation.z=Math.sin(Math.min(Math.PI,u.jump))*.3;if(u.jump>Math.PI){u.jump=0;c.position.y=1.18;c.rotation.z=0;}}}});
 eggs.forEach(e=>{if(e.obj?.userData.spin){e.obj.rotation.y+=dt*6;e.obj.userData.spin+=dt;if(e.obj.userData.spin>1.5)e.obj.userData.spin=0;}});
 beamPivot.rotation.y=t*.6;
 sparks=sparks.filter(s=>{s.position.add(s.userData.v);s.userData.v.y-=.006;if(s.position.y<-1){scene.remove(s);return false;}return true;});
 updateLagoon(dt,t);
 renderer.render(scene,camera);requestAnimationFrame(frame);}
setNight(false);eggsHud.textContent=`Easter eggs : 0 / ${eggs.size}`;canvas.dataset.ready='true';frame();
// ?marche opens the island on foot (shareable link).
if(/[?&]marche\b/.test(location.search))enterWalk();
// Audit hook for automated checks: can every easter egg be seen and clicked from some orbit angle and zoom?
window.AtlasGame={eggs,foundEgg,boat,view(sp,pt,z){spin=sp;pitch=pt;zoom=z;paused=true;},shot(id,dist=1.6,az=.6,el=.35){const o=eggs.get(id).obj,c=new THREE.Vector3();new THREE.Box3().setFromObject(o).getCenter(c);const cam=camera.clone();cam.position.set(c.x+Math.sin(az)*dist*Math.cos(el),c.y+Math.sin(el)*dist,c.z+Math.cos(az)*dist*Math.cos(el));cam.lookAt(c);renderer.render(scene,cam);return canvas.toDataURL('image/jpeg',.85);},audit(){const out={},cam=camera.clone(),rc=new THREE.Raycaster(),targets=[world,boat,duck,fisher,pier,...fish,...birds],box=new THREE.Box3(),c=new THREE.Vector3(),sz=new THREE.Vector3();
 scene.updateMatrixWorld(true);
 eggs.forEach((e,id)=>{if(!e.obj){out[id]='bouton/action';return;}box.setFromObject(e.obj);box.getCenter(c);box.getSize(sz);let best=null;
  for(const z of [28,16,9])for(let k=0;k<24;k++)for(const pt of [.35,.62,1.0]){const sp=k/24*Math.PI*2;cam.position.set(Math.sin(sp)*z*Math.cos(pt),.4+Math.sin(pt)*z,Math.cos(sp)*z*Math.cos(pt));cam.lookAt(0,.4,0);cam.updateMatrixWorld();
   const dir=c.clone().sub(cam.position).normalize();rc.set(cam.position,dir);rc.camera=cam;const hit=rc.intersectObjects(targets,true).find(h=>h.object.visible&&!h.object.isLineSegments);
   if(hit&&hit.object.userData.egg===id){const d=cam.position.distanceTo(c),px=Math.max(sz.x,sz.y,sz.z)/d*(600/2)/Math.tan(cam.fov*Math.PI/360);if(!best||px>best.px)best={z,spin:+sp.toFixed(2),px:+px.toFixed(1)};}}
  out[id]=best||'INVISIBLE';});return out;}};
// Walking test hook: AtlasGame.walkFor(keys,frames) advances the walker without a keyboard.
Object.assign(window.AtlasGame,{walk,enterWalk,exitWalk,walkFor(keys,n=30,dt=1/30){walk.keys=new Set(keys);for(let i=0;i<n;i++)updateWalk(dt,0);walk.keys.clear();return walk.pos.clone();}});

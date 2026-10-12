import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/RoomEnvironment.js';

/* iPhone flottant en 3D : même mise en scène que le livre photo (dialogue modal, fond flouté,
   objet seul, rotation d'ouverture), la vidéo est projetée sur l'écran. 1 unité = 100 mm. */
const W=.706,H=1.466,D=.0825,R=.1,BEZEL=.012,SW=W-2*BEZEL,SH=H-2*BEZEL,SR=R-BEZEL;
const VIDEO_ASPECT=720/900;
const roundedRect=(w,h,r)=>{const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.absarc(x+w-r,y+r,r,-Math.PI/2,0);s.lineTo(x+w,y+h-r);s.absarc(x+w-r,y+h-r,r,0,Math.PI/2);s.lineTo(x+r,y+h);s.absarc(x+r,y+h-r,r,Math.PI/2,Math.PI);s.lineTo(x,y+r);s.absarc(x+r,y+r,r,Math.PI,Math.PI*1.5);s.closePath();return s;};
const flatGeometry=(w,h,r)=>{const g=new THREE.ShapeGeometry(roundedRect(w,h,r),16);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);return g;};

export function createPhoneVideo(onChange=()=>{}){
 const dialog=document.createElement('dialog');dialog.className='film-album phone-video';dialog.setAttribute('aria-label','Montée en cordée sur un glacier, vidéo sur iPhone');
 dialog.innerHTML='<header><button class="film-close" type="button" aria-label="Quitter la vidéo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="film-book"><canvas tabindex="0" role="application" aria-label="iPhone en 3D. Touche l’écran pour mettre la vidéo en pause. Glisse pour pivoter. Flèches pour inspecter, Entrée pour la pause, Échap pour quitter."></canvas></div>';
 const video=document.createElement('video');video.src='assets/media/cordee-glacier.mp4';video.preload='none';video.loop=true;video.playsInline=true;video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('aria-hidden','true');video.className='phone-video-source';
 dialog.append(video);document.body.append(dialog);
 const stage=dialog.querySelector('.film-book'),canvas=stage.querySelector('canvas'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),view={pitch:.075,yaw:-.12};
 let renderer,scene,camera,pivot,screen,screenMat,ready=false,raf=0,reveal=1,press=null,returnFocus=null,start=0;

 function build(){
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  scene=new THREE.Scene();scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.9;
  const key=new THREE.DirectionalLight('#fff8eb',1.6);key.position.set(-2.6,3.1,4);scene.add(key);
  camera=new THREE.PerspectiveCamera(28,1,.1,30);pivot=new THREE.Group();scene.add(pivot);

  const titanium=new THREE.MeshStandardMaterial({color:'#3d5a47',metalness:1,roughness:.34});
  const glass=new THREE.MeshPhysicalMaterial({color:'#2f4a3a',metalness:.2,roughness:.55,clearcoat:.4,clearcoatRoughness:.35});
  const black=new THREE.MeshStandardMaterial({color:'#050505',metalness:.3,roughness:.18});

  // châssis en titane : plaque extrudée à arêtes biseautées
  const bevel=.012,body=new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(W-2*bevel,H-2*bevel,R-bevel),{depth:D-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:5,curveSegments:24}),titanium);
  body.position.z=-D/2+bevel;pivot.add(body);
  // dos en verre dépoli et plateau photo
  const back=new THREE.Mesh(flatGeometry(W-.016,H-.016,R-.008),glass);back.rotation.y=Math.PI;back.position.z=-D/2-.0004;pivot.add(back);
  const plate=new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(.36,.38,.07),{depth:.006,bevelEnabled:false,curveSegments:16}),new THREE.MeshPhysicalMaterial({color:'#35523f',metalness:.1,roughness:.25,clearcoat:.8}));
  plate.rotation.y=Math.PI;plate.position.set(W/2-.045-.18,H/2-.045-.19,-D/2);pivot.add(plate);
  const ring=new THREE.MeshStandardMaterial({color:'#6f8f7a',metalness:1,roughness:.25}),lens=new THREE.MeshStandardMaterial({color:'#07090d',metalness:.6,roughness:.06});
  const cx=plate.position.x,cy=plate.position.y,lz=-D/2-.006; // vu de dos, l’objectif est en haut à gauche : x inversé dans le repère du modèle
  for(const[x,y]of[[.085,.09],[.085,-.095],[-.075,-.003]]){
   const r1=new THREE.Mesh(new THREE.CylinderGeometry(.062,.062,.02,48),ring),l1=new THREE.Mesh(new THREE.CylinderGeometry(.047,.047,.022,48),lens);
   for(const m of[r1,l1]){m.rotation.x=-Math.PI/2;m.position.set(cx+x,cy+y,lz-(m===r1?.01:.011));pivot.add(m);}
  }
  const flash=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.004,24),new THREE.MeshStandardMaterial({color:'#e9e3cf',roughness:.4}));flash.rotation.x=Math.PI/2;flash.position.set(cx-.115,cy+.12,lz-.002);pivot.add(flash);
  // boutons latéraux
  for(const[x,y,h]of[[-W/2,.46,.1],[-W/2,.3,.17],[-W/2,.08,.17],[W/2,.26,.26]]){const b=new THREE.Mesh(new THREE.BoxGeometry(.012,h,.026),titanium);b.position.set(x,y,0);pivot.add(b);}

  // face avant : verre noir, écran vidéo, îlot dynamique, barre d'accueil
  const front=new THREE.Mesh(flatGeometry(W-.016,H-.016,R-.008),black);front.position.z=D/2+.0004;pivot.add(front);
  const panel=new THREE.Mesh(flatGeometry(SW,SH,SR),new THREE.MeshBasicMaterial({color:'#000',toneMapped:false}));panel.position.z=D/2+.0008;pivot.add(panel);
  const tex=new THREE.VideoTexture(video);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=false;
  screenMat=new THREE.MeshBasicMaterial({map:tex,color:'#000',toneMapped:false});
  const vh=SW/VIDEO_ASPECT;screen=new THREE.Mesh(new THREE.PlaneGeometry(SW,vh),screenMat);screen.position.set(0,-.02,D/2+.0012);pivot.add(screen);
  const island=new THREE.Mesh(flatGeometry(.205,.06,.03),new THREE.MeshBasicMaterial({color:'#000',toneMapped:false}));island.position.set(0,H/2-.1,D/2+.0016);pivot.add(island);
  const bar=new THREE.Mesh(flatGeometry(.24,.01,.005),new THREE.MeshBasicMaterial({color:'#f2f2f2',transparent:true,opacity:.85,toneMapped:false}));bar.position.set(0,-H/2+.04,D/2+.0016);pivot.add(bar);
  new ResizeObserver(resize).observe(stage);ready=true;resize();
 }
 function resize(){if(!renderer||!stage.clientWidth)return;renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}
 function frame(now){
  if(!dialog.open)return;
  if(start){const p=reduced.matches?1:Math.min(1,(now-start)/1300);reveal=.5*(1-Math.cos(p*Math.PI));if(p>=1)start=0;}
  // ouverture : le téléphone se retourne du dos vers la face, monte en place, l'écran s'allume
  pivot.rotation.set(view.pitch,view.yaw+(1-reveal)*Math.PI,0,'YXZ');pivot.position.y=-.12*(1-reveal);pivot.scale.setScalar(.88+.12*reveal);
  const on=Math.max(0,(reveal-.55)/.45);screenMat.color.setScalar(on);
  const vf=THREE.MathUtils.degToRad(camera.fov)/2,dist=Math.max(1.78/(2*Math.tan(vf)),1.08/(2*Math.tan(vf)*camera.aspect));
  camera.position.set(0,0,dist);camera.lookAt(0,0,0);renderer.render(scene,camera);raf=requestAnimationFrame(frame);
 }
 const playing=()=>!video.paused&&!video.ended;
 function toggle(){if(playing())video.pause();else video.play().catch(()=>{});}
 function play(){
  let muted=false;try{muted=localStorage.getItem('scene-muted')==='1';}catch{}
  video.muted=muted;video.currentTime=0;
  video.play().catch(()=>{video.muted=true;video.play().catch(()=>{});});
 }
 function onScreen(x,y){const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(ndc,camera);return ray.intersectObject(screen).length>0;}
 stage.addEventListener('pointerdown',e=>{if(!ready||e.button!==0)return;stage.setPointerCapture(e.pointerId);press={id:e.pointerId,x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,moved:false};});
 stage.addEventListener('pointermove',e=>{
  if(!press||press.id!==e.pointerId)return;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>7)press.moved=true;
  if(press.moved){view.yaw+=(e.clientX-press.px)*.008;view.pitch=THREE.MathUtils.clamp(view.pitch+(e.clientY-press.py)*.006,-1.25,1.25);}
  press.px=e.clientX;press.py=e.clientY;
 });
 stage.addEventListener('pointerup',e=>{if(!press||press.id!==e.pointerId)return;const moved=press.moved;press=null;if(!moved&&onScreen(e.clientX,e.clientY))toggle();});
 stage.addEventListener('pointercancel',()=>press=null);
 canvas.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter',' '].includes(e.key))e.preventDefault();
  if(e.key==='Enter'||e.key===' ')toggle();else if(e.key==='Home'){view.pitch=.075;view.yaw=-.12;}
  else if(e.key==='ArrowLeft')view.yaw-=.22;else if(e.key==='ArrowRight')view.yaw+=.22;else if(e.key==='ArrowUp')view.pitch=Math.max(-1.25,view.pitch-.15);else if(e.key==='ArrowDown')view.pitch=Math.min(1.25,view.pitch+.15);
 });
 const close=()=>{if(dialog.open)dialog.close();};dialog.querySelector('.film-close').onclick=close;
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);video.pause();press=null;onChange(false);document.dispatchEvent(new CustomEvent('film-album-change',{detail:{open:false}}));returnFocus?.focus({preventScroll:true});});
 return{open(){
  if(dialog.open)return;returnFocus=document.activeElement;
  play(); // dans le geste de l'utilisateur, avant tout chargement : iOS l'exige pour le son
  dialog.showModal();onChange(true);document.dispatchEvent(new CustomEvent('film-album-change',{detail:{open:true}}));
  view.pitch=.075;view.yaw=-.12;reveal=0;
  try{if(!ready)build();}catch(e){console.warn('[Phone video]',e);close();return;}
  resize();start=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);canvas.focus({preventScroll:true});
 }};
}

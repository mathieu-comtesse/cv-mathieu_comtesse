import * as THREE from 'three';
import {preparePaper} from './paper-sheet.js?v=cv-scene-v49';

const frames=[1514,1510,1500,1513,1507,1506,1495,1505,1493,1504,1494,1489,1512,1511,1509,1508,1503,1496,1498,1499];
const PAGE_W=1,PAGE_H=1.377,SEGMENTS=64;
// Original book implementation: curved paper, two printed sides and local lighting.
// The photographic scans remain intact; only their paper mounts are drawn here.
export function createFilmAlbum(onChange=()=>{}){
 const album=document.createElement('dialog');album.className='film-album';album.setAttribute('aria-labelledby','film-title');
 album.innerHTML='<header><div><span class="film-kicker">Mamiya · carnet argentique</span><h2 id="film-title">Fragments de montagne</h2></div><button class="film-close" type="button" aria-label="Fermer le livre">×</button></header><div class="film-book"><canvas aria-hidden="true"></canvas><button class="film-page film-left" type="button" aria-label="Tourner la page de gauche"><img class="film-photo" alt=""></button><button class="film-page film-right" type="button" aria-label="Tourner la page de droite"><img class="film-photo" alt=""></button><p class="film-loading" role="status">Ouverture du carnet…</p></div><footer><span>Clichés argentiques de Mathieu</span><output aria-live="polite"></output></footer><p class="film-book-hint">Clique sur une page pour la tourner.</p>';
 document.body.append(album);
 const stage=album.querySelector('.film-book'),canvas=stage.querySelector('canvas'),leftButton=album.querySelector('.film-left'),rightButton=album.querySelector('.film-right'),count=album.querySelector('output'),status=album.querySelector('.film-loading');
 let renderer,scene,camera,book,left,right,turning,spread=0,returnFocus=null,raf=0,flight=null,request=0,press=null,lastTilt=0,pattern;
 const textures=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function sheet(){
  const geometry=new THREE.PlaneGeometry(PAGE_W,PAGE_H,SEGMENTS,88);geometry.translate(PAGE_W/2,0,0);
  const front=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.5,metalness:.17,side:THREE.FrontSide});
  const back=front.clone();back.side=THREE.BackSide;
  const group=new THREE.Group();group.add(new THREE.Mesh(geometry,front),new THREE.Mesh(geometry,back));book.add(group);
  const paper=preparePaper(geometry,[front,back],pattern);for(const m of group.children){m.customDepthMaterial=paper.depth;m.frustumCulled=false;}group.userData={geometry,front,back,paper};return group;
 }
 function bend(page,progress,direction=1,tilt=0){page.userData.paper.set(progress,direction,tilt);}
 function setup(){
  if(renderer)return;pattern=new THREE.TextureLoader().load('assets/film-paper-grain-v49.webp',()=>render());pattern.wrapS=pattern.wrapT=THREE.RepeatWrapping;
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(max-width:809px)').matches?1.5:2));
  renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#a59a85',1.3));
  const key=new THREE.DirectionalLight('#ffffff',1.7);key.position.set(-3.5,1.3,4.1);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.1,far:10});key.shadow.bias=-.001;scene.add(key);
  camera=new THREE.PerspectiveCamera(28,1,.1,20);
  book=new THREE.Group();book.rotation.x=-.045;scene.add(book);
  const paper=new THREE.MeshStandardMaterial({color:'#ddd3bc',roughness:.95}),cover=new THREE.MeshStandardMaterial({color:'#6b5541',roughness:.9});
  for(const side of [-1,1]){
   const stack=new THREE.Mesh(new THREE.BoxGeometry(1,PAGE_H,.032),paper);stack.position.set(side*.5,0,-.026);stack.castShadow=stack.receiveShadow=true;book.add(stack);
   const board=new THREE.Mesh(new THREE.BoxGeometry(1.018,PAGE_H+.024,.012),cover);board.position.set(side*.502,0,-.051);board.castShadow=true;book.add(board);
   for(let i=1;i<6;i++){const line=new THREE.Mesh(new THREE.BoxGeometry(1.005,.001,.001),paper);line.position.set(side*.5,-PAGE_H/2-.001,-.007-i*.005);book.add(line);}
  }
  const spine=new THREE.Mesh(new THREE.BoxGeometry(.028,PAGE_H+.026,.06),cover);spine.position.z=-.03;book.add(spine);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(5,4),new THREE.ShadowMaterial({opacity:.16}));ground.position.z=-.065;ground.receiveShadow=true;scene.add(ground);
  left=sheet();right=sheet();turning=sheet();turning.visible=false;
  [left,right,turning].forEach(o=>o.children.forEach(m=>m.castShadow=m.receiveShadow=true));
  left.position.z=right.position.z=.004;turning.position.z=.011;
  new ResizeObserver(resize).observe(stage);resize();
 }
 function resize(){
  if(!renderer||!stage.clientWidth)return;
  const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
  const vf=THREE.MathUtils.degToRad(camera.fov)/2,dist=Math.max((PAGE_H+.23)/(2*Math.tan(vf)),2.16/(2*Math.tan(vf)*camera.aspect));
  camera.position.set(0,0,dist);camera.lookAt(0,0,0);camera.updateProjectionMatrix();render();
 }
 function render(){if(renderer&&album.open){renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);}}
 async function texture(index){
  if(textures.has(index))return textures.get(index);
  const pending=(async()=>{
   const image=new Image();image.decoding='async';image.src='assets/film/'+frames[index]+'.webp';await image.decode();
   const paper=document.createElement('canvas');paper.width=1024;paper.height=Math.round(1024*PAGE_H);const c=paper.getContext('2d');
   c.fillStyle='#f4efdf';c.fillRect(0,0,paper.width,paper.height);
   // Subtle fibrous paper surrounds, never obscures, the photograph.
   for(let i=0;i<2800;i++){const x=(i*7919)%paper.width,y=(i*3571)%paper.height;c.fillStyle=i%2?'#d7c9b31a':'#ffffff40';c.fillRect(x,y,1,1);}
   const maxW=paper.width-104,maxH=paper.height-176,k=Math.min(maxW/image.naturalWidth,maxH/image.naturalHeight),w=image.naturalWidth*k,h=image.naturalHeight*k,x=(paper.width-w)/2,y=(paper.height-h)/2-12;
   c.fillStyle='#78665126';c.fillRect(x+4,y+5,w,h);c.drawImage(image,x,y,w,h);
   c.fillStyle='#6a5a45';c.font='18px Georgia';c.textAlign='left';c.fillText('Mathieu · argentique',52,paper.height-42);c.textAlign='right';c.fillText(String(index+1).padStart(2,'0'),paper.width-52,paper.height-42);
   const gutter=c.createLinearGradient(0,0,90,0);gutter.addColorStop(0,'#30281855');gutter.addColorStop(.25,'#30281820');gutter.addColorStop(1,'#30281800');c.fillStyle=gutter;c.fillRect(0,0,90,paper.height);
   const front=new THREE.CanvasTexture(paper);front.colorSpace=THREE.SRGBColorSpace;front.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   const back=front.clone();back.repeat.x=-1;back.offset.x=1;back.needsUpdate=true;
   return {front,back};
  })();
  textures.set(index,pending);try{return await pending;}catch(e){textures.delete(index);throw e;}
 }
 const assign=(page,face,t)=>{page.userData[face].map=t;page.userData[face].needsUpdate=true;};
 function labels(){
  album.dataset.spread=String(spread);album.dataset.frame=String(spread*2);count.textContent=String(spread*2+1).padStart(2,'0')+'–'+String(spread*2+2).padStart(2,'0')+' / '+frames.length;
  for(const [button,n] of [[leftButton,spread*2],[rightButton,spread*2+1]]){const img=button.querySelector('img');img.src='assets/film/'+frames[n]+'.webp';img.alt='Cliché argentique '+(n+1)+' : paysage de montagne en noir et blanc';}
  leftButton.disabled=spread===0||!!flight;rightButton.disabled=spread===frames.length/2-1||!!flight;
 }
 async function display(token=request){
  status.hidden=false;
  try{
   const [l,r]=await Promise.all([texture(spread*2),texture(spread*2+1)]);if(token!==request||!album.open)return;
   assign(left,'back',l.back);assign(right,'front',r.front);bend(left,1);bend(right,0);turning.visible=false;status.hidden=true;labels();render();trim();
  }catch{if(token===request){status.textContent='Le tirage ne s’est pas chargé. Ferme puis rouvre le carnet.';}}
 }
 function trim(){
  for(const [index,p] of textures)if(index<spread*2-2||index>spread*2+3){textures.delete(index);p.then(t=>{t.front.dispose();t.back.dispose();}).catch(()=>{});}
  for(const i of [spread*2-1,spread*2+2])if(i>=0&&i<frames.length)texture(i).catch(()=>{});
 }
 async function flip(direction){
  if(flight||!album.open||spread+direction<0||spread+direction>=frames.length/2)return;
  const token=++request,target=spread+direction;flight={loading:true};labels();
  try{
   const frontIndex=direction>0?spread*2+1:spread*2-1,backIndex=direction>0?spread*2+2:spread*2;
   const [front,back,under]=await Promise.all([texture(frontIndex),texture(backIndex),texture(direction>0?target*2+1:target*2)]);
   if(token!==request||!album.open)return;
   assign(turning,'front',front.front);assign(turning,'back',back.back);
   assign(direction>0?right:left,direction>0?'front':'back',direction>0?under.front:under.back);
   turning.visible=true;flight={start:performance.now(),direction,target,tilt:lastTilt};album.dataset.turning='true';
   const tick=now=>{
    if(!album.open||token!==request)return;
    const p=reduced.matches?1:Math.min(1,(now-flight.start)/850),ease=.5*(1-Math.cos(p*Math.PI));
    bend(turning,direction>0?ease:1-ease,direction,flight.tilt);render();
    if(p<1){raf=requestAnimationFrame(tick);return;}
    spread=target;flight=null;album.dataset.turning='false';display(token);
   };
   tick(performance.now());
  }catch{flight=null;labels();status.hidden=false;status.textContent='Le tirage ne s’est pas chargé.';}
 }
 leftButton.onclick=()=>flip(-1);rightButton.onclick=()=>flip(1);
 for(const button of [leftButton,rightButton]){
  button.addEventListener('pointerdown',e=>press={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,tilt:THREE.MathUtils.clamp((.5-(e.clientY-button.getBoundingClientRect().top)/button.clientHeight)*60,-35,35)});
  button.addEventListener('pointermove',e=>{if(press&&press.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)press.moved=true;});
  button.addEventListener('click',e=>{if(press?.moved){e.preventDefault();e.stopImmediatePropagation();}lastTilt=press?.tilt??0;press=null;},true);
 }
 const close=()=>{if(album.open)album.close();};album.querySelector('.film-close').onclick=close;
 album.addEventListener('click',e=>{if(e.target!==album)return;const r=album.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 album.addEventListener('close',()=>{request++;cancelAnimationFrame(raf);flight=null;album.dataset.turning='false';onChange(false);document.dispatchEvent(new CustomEvent('film-album-change',{detail:{open:false}}));returnFocus?.focus({preventScroll:true});});
 return {open(){if(album.open)return;returnFocus=document.activeElement;album.showModal();onChange(true);document.dispatchEvent(new CustomEvent('film-album-change',{detail:{open:true}}));setup();labels();display(++request);album.querySelector('.film-close').focus({preventScroll:true});},close};
}

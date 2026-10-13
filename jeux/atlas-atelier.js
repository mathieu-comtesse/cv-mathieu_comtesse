/* Atelier original : relief modifiable, modules authorés dans Blender et sauvegarde locale. */
import * as THREE from './three.module.js';
import { chargerMailles } from './atlas-maille.js';

export async function creerAtelier(J) {
  const {M,canvas}=J, config=M.meta.refonte.atelier, [cx,cz]=config.c;
  const W=config.largeur,D=config.profondeur,NX=100,NZ=40,base=.25;
  const A={on:false,outil:'tour',angle:0,taille:1,constructions:[],sable:new Float32Array((NX+1)*(NZ+1)),historique:[]};
  const mailles=await chargerMailles(new URL('assets/atlas/refonte/chateaux.bin',import.meta.url));
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,envMapIntensity:.35});
  mat.onBeforeCompile=(sh)=>{
    sh.vertexShader='varying vec3 vSandP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSandP=transformed;');
    sh.fragmentShader='varying vec3 vSandP;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=fract(sin(dot(vSandP.xz,vec2(127.1,311.7)))*43758.5453);diffuseColor.rgb*=.97+.06*grain;');
  };
  const groupe=new THREE.Group();M.scene.add(groupe);
  const options=document.createElement('details');options.className='atlas-options';options.innerHTML='<summary>Options</summary><div></div>';J.hote.append(options);
  for(const id of ['world-pause','world-log','world-photo','world-sound'])options.querySelector('div').append(document.getElementById(id));
  const jour=document.createElement('button');jour.textContent='Jour / nuit';jour.onclick=()=>J.reglerNuit(!J.estNuit());options.querySelector('div').append(jour);
  const geo=new THREE.PlaneGeometry(W,D,NX,NZ).rotateX(-Math.PI/2);
  const pos=geo.attributes.position,colors=new Float32Array(pos.count*3),sandColor=new THREE.Color('#e6cf9c');
  for(let i=0;i<pos.count;i++)colors.set([sandColor.r,sandColor.g,sandColor.b],i*3);
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const sol=new THREE.Mesh(geo,mat);sol.position.set(cx,0,cz);sol.castShadow=sol.receiveShadow=true;groupe.add(sol);
  // Rounded beach apron joins the editable area to the coast instead of leaving a rectangular platform.
  const apronP=[],apronI=[],NR=16,NA=96,RX=4.8,RZ=3.2;
  function apronHeight(x,z){const r=Math.hypot((x-cx)/RX,(z-cz)/RZ);return base+.008-THREE.MathUtils.smoothstep(r,.8,1)*1.05;}
  for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const a=i/NA*Math.PI*2,r=j/NR,x=cx+Math.cos(a)*r*RX,z=cz+Math.sin(a)*r*RZ;apronP.push(x,apronHeight(x,z),z);if(j<NR&&i<NA){const k=j*(NA+1)+i;apronI.push(k,k+1,k+NA+1,k+1,k+NA+2,k+NA+1);}}
  const apronGeo=new THREE.BufferGeometry();apronGeo.setAttribute('position',new THREE.Float32BufferAttribute(apronP,3));apronGeo.setIndex(apronI);apronGeo.computeVertexNormals();
  const apronColors=new Float32Array(apronP.length);for(let i=0;i<apronP.length/3;i++)apronColors.set([sandColor.r,sandColor.g,sandColor.b],i*3);apronGeo.setAttribute('color',new THREE.BufferAttribute(apronColors,3));
  const apronMat=mat.clone();
  apronMat.onBeforeCompile=sh=>{mat.onBeforeCompile(sh);sh.fragmentShader=sh.fragmentShader.replace('void main() {',`void main() { if(abs(vSandP.x-(${cx.toFixed(3)}))<${(W/2).toFixed(3)} && abs(vSandP.z-(${cz.toFixed(3)}))<${(D/2).toFixed(3)})discard;`);};
  apronMat.customProgramCacheKey=()=> 'atlas-apron-ouvert-v1';
  const apron=new THREE.Mesh(apronGeo,apronMat);apron.receiveShadow=true;groupe.add(apron);
  const originalHeight=M.carte.hauteur.bind(M.carte);
  function local(x,z){return [(x-cx+W/2)/W*NX,(z-cz+D/2)/D*NZ];}
  function dedans(x,z,m=0){return Math.abs(x-cx)<W/2-m && Math.abs(z-cz)<D/2-m;}
  function hauteur(x,z){const [u,v]=local(x,z),i=THREE.MathUtils.clamp(Math.floor(u),0,NX-1),j=THREE.MathUtils.clamp(Math.floor(v),0,NZ-1),fu=THREE.MathUtils.clamp(u-i,0,1),fv=THREE.MathUtils.clamp(v-j,0,1),k=j*(NX+1)+i;return base+(A.sable[k]*(1-fu)+A.sable[k+1]*fu)*(1-fv)+(A.sable[k+NX+1]*(1-fu)+A.sable[k+NX+2]*fu)*fv;}
  const surPlage=(x,z)=>Math.hypot((x-cx)/RX,(z-cz)/RZ)<1;
  M.carte.hauteur=(x,z)=>dedans(x,z)?hauteur(x,z):surPlage(x,z)?Math.max(originalHeight(x,z),apronHeight(x,z)):originalHeight(x,z);
  // Remove the underlying surface only inside the editable patch, preserving the rest of the island.
  const terrain=M.ile.mesh.geometry.attributes.position;
  for(let i=0;i<terrain.count;i++)if(surPlage(terrain.getX(i),terrain.getZ(i))&&terrain.getY(i)>-.65)terrain.setY(i,-.82);
  terrain.needsUpdate=true;M.ile.mesh.geometry.computeVertexNormals();
  function actualiser(){
    for(let j=0;j<=NZ;j++)for(let i=0;i<=NX;i++)pos.setY(j*(NX+1)+i,base+A.sable[j*(NX+1)+i]+.008);
    pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
    const c=M.carte;
    for(let i=0;i<c.nx;i++)for(let j=0;j<c.nz;j++){
      const x=c.x0+i*c.res,z=c.z0+j*c.res;if(!surPlage(x,z))continue;
      const k=i*c.nz+j,h=c.hauteur(x,z);c.H[k]=h;c.texH.image.data[k]=THREE.DataUtils.toHalfFloat(h);c.eauU8[k]=h<-.01?255:0;
    }
    c.texH.needsUpdate=c.texEau.needsUpdate=true;
    for(const o of A.constructions)o.position.y=hauteur(o.position.x,o.position.z)+.008;
  }
  actualiser();
  const btn=document.createElement('button');btn.id='world-build';btn.textContent='Construire';btn.setAttribute('aria-pressed','false');document.querySelector('.world-controls').prepend(btn);
  const panel=document.createElement('section');panel.className='sand-tools';panel.hidden=true;panel.setAttribute('aria-label','Atelier de châteaux de sable');
  panel.innerHTML=`<div class="sand-heading"><div><small>PLAGE CRÉATIVE</small><h2>Ton château de sable</h2></div><button data-action="fermer" aria-label="Fermer l’atelier">×</button></div><p>Pose les pièces sur la plage. Maintiens pour modeler le sable.</p><div class="sand-tool-row">${[['tour','Tour'],['mur','Mur'],['donjon','Donjon'],['lever','Ajouter du sable'],['creuser','Creuser'],['lisser','Lisser'],['retirer','Retirer une pièce']].map(([k,t])=>`<button data-tool="${k}" aria-pressed="${k==='tour'}">${t}</button>`).join('')}</div><div class="sand-settings"><label>Taille <input id="sand-size" type="range" min=".6" max="1.5" step=".1" value="1"></label><button data-action="rotation">Tourner : 0°</button><button data-action="annuler">Annuler</button></div><output class="sand-status" aria-live="polite">Clique sur la plage pour poser une tour.</output><div class="sand-footer"><span>Sauvegarde sur cet appareil</span><button data-action="effacer">Effacer ma création</button></div>`;
  J.hote.append(panel);const status=panel.querySelector('output');
  const preview=new THREE.Mesh(mailles.tour.geo,new THREE.MeshStandardMaterial({color:'#a3ded2',transparent:true,opacity:.52,depthWrite:false}));preview.visible=false;M.scene.add(preview);
  const brush=new THREE.Mesh(new THREE.RingGeometry(.32,.35,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#0f756a',side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.8}));brush.visible=false;M.scene.add(brush);
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let pointer=null,hold=false,lastTime=0,savedCamera=null;
  function message(s){status.textContent=s;}
  function serialize(){return {version:1,sable:Array.from(A.sable),pieces:A.constructions.map(o=>({type:o.userData.type,x:o.position.x,z:o.position.z,angle:o.rotation.y,taille:o.scale.x}))};}
  function sauver(){try{localStorage.setItem('atlas-plage-creative-v1',JSON.stringify(serialize()));}catch{message('Création visible ; stockage indisponible sur cet appareil.');}}
  function checkpoint(){A.historique.push(serialize());if(A.historique.length>20)A.historique.shift();}
  function ajouter(type,x,z,angle=A.angle,taille=A.taille){
    if(!mailles[type]||!dedans(x,z,.35*taille))return false;
    if(A.constructions.length>=100){message('100 pièces : retire une pièce pour continuer.');return false;}
    const o=new THREE.Mesh(mailles[type].geo,mat);o.position.set(x,hauteur(x,z)+.008,z);o.rotation.y=angle;o.scale.setScalar(taille);o.castShadow=o.receiveShadow=true;o.userData.type=type;groupe.add(o);A.constructions.push(o);return true;
  }
  function charger(data){
    if(!data||data.version!==1)return;
    if(Array.isArray(data.sable)&&data.sable.length===A.sable.length)for(let i=0;i<A.sable.length;i++)A.sable[i]=Number.isFinite(data.sable[i])?THREE.MathUtils.clamp(data.sable[i],-.65,1.3):0;
    for(const o of A.constructions)groupe.remove(o);A.constructions.length=0;
    for(const p of (Array.isArray(data.pieces)?data.pieces:[]).slice(0,100))if([p.x,p.z,p.angle,p.taille].every(Number.isFinite))ajouter(p.type,p.x,p.z,p.angle,THREE.MathUtils.clamp(p.taille,.6,1.5));
    actualiser();
  }
  try{charger(JSON.parse(localStorage.getItem('atlas-plage-creative-v1')||'null'));}catch{}
  function ouvrir(){if(A.on)return;J.sortirMarche();J.pecher.sortir();J.fermerFiche();savedCamera={spin:J.cam.spin,pitch:J.cam.pitch,zoom:J.cam.zoom,pause:J.cam.pause};A.on=true;J.cam.spin=.12;J.cam.pitch=1.05;J.cam.zoom=14;J.cam.pause=true;panel.hidden=false;document.body.classList.add('is-building');btn.textContent='Quitter l’atelier';btn.setAttribute('aria-pressed','true');canvas.focus();}
  function fermer(){if(!A.on)return;A.on=false;hold=false;pointer=null;preview.visible=brush.visible=false;panel.hidden=true;document.body.classList.remove('is-building');Object.assign(J.cam,savedCamera);btn.textContent='Construire';btn.setAttribute('aria-pressed','false');sauver();}
  A.ouvrir=ouvrir;A.fermer=fermer;A.serialize=serialize;A.ajouter=ajouter;A.hauteur=hauteur;A.sol=sol;
  btn.onclick=()=>A.on?fermer():ouvrir();
  panel.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{A.outil=b.dataset.tool;panel.querySelectorAll('[data-tool]').forEach(k=>k.setAttribute('aria-pressed',String(k===b)));if(mailles[A.outil])preview.geometry=mailles[A.outil].geo;message(mailles[A.outil]?`Clique sur la plage pour poser : ${b.textContent.toLowerCase()}.`:'Maintiens sur la plage pour '+b.textContent.toLowerCase()+'.');});
  panel.querySelector('#sand-size').oninput=e=>A.taille=Number(e.target.value);
  panel.querySelector('[data-action="rotation"]').onclick=e=>{A.angle=(A.angle+Math.PI/4)%(Math.PI*2);e.currentTarget.textContent='Tourner : '+Math.round(A.angle*180/Math.PI)+'°';};
  panel.querySelector('[data-action="fermer"]').onclick=fermer;
  panel.querySelector('[data-action="annuler"]').onclick=()=>{const data=A.historique.pop();if(data){charger(data);sauver();message('Dernière action annulée.');}};
  panel.querySelector('[data-action="effacer"]').onclick=()=>{checkpoint();charger({version:1,sable:Array(A.sable.length).fill(0),pieces:[]});sauver();message('Plage remise à zéro. Annuler pour restaurer.');};
  function cible(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(ndc,M.camera);const hit=ray.intersectObject(sol)[0];return hit&&dedans(hit.point.x,hit.point.z,.18)?hit.point:null;}
  function modeler(x,z,dt){
    const radius=.48*A.taille,[u,v]=local(x,z),before=A.sable.slice();
    for(let j=Math.max(1,Math.floor(v-radius/D*NZ));j<Math.min(NZ,v+radius/D*NZ+1);j++)for(let i=Math.max(1,Math.floor(u-radius/W*NX));i<Math.min(NX,u+radius/W*NX+1);i++){
      const d=Math.hypot((i-u)*W/NX,(j-v)*D/NZ);if(d>radius)continue;const k=j*(NX+1)+i,weight=(1-d/radius)**2;
      if(A.outil==='lisser'){const avg=(before[k-1]+before[k+1]+before[k-NX-1]+before[k+NX+1])/4;A.sable[k]+=(avg-before[k])*Math.min(1,dt*12)*weight;}
      else A.sable[k]=THREE.MathUtils.clamp(A.sable[k]+dt*.65*weight*(A.outil==='creuser'?-1:1),-.65,1.3);
    }actualiser();
  }
  A.modeler=modeler;
  canvas.addEventListener('pointermove',e=>{if(!A.on)return;pointer=cible(e);const modular=!!mailles[A.outil];preview.visible=modular&&!!pointer;brush.visible=!modular&&!!pointer;if(pointer){preview.position.set(pointer.x,hauteur(pointer.x,pointer.z),pointer.z);preview.scale.setScalar(A.taille);preview.rotation.y=A.angle;brush.position.set(pointer.x,pointer.y+.035,pointer.z);brush.scale.setScalar(A.taille);}});
  canvas.addEventListener('pointerdown',e=>{
    if(!A.on||e.button!==0)return;e.preventDefault();pointer=cible(e);if(!pointer){message('Construis dans la plage créative, sous la caméra.');return;}checkpoint();canvas.setPointerCapture(e.pointerId);
    if(mailles[A.outil]){if(ajouter(A.outil,pointer.x,pointer.z)){sauver();message(A.constructions.length+' pièce(s) dans ton château.');}}
    else if(A.outil==='retirer'){ray.setFromCamera(ndc,M.camera);const hit=ray.intersectObjects(A.constructions)[0];if(hit){groupe.remove(hit.object);A.constructions.splice(A.constructions.indexOf(hit.object),1);sauver();message('Pièce retirée.');}}
    else hold=true;
  });
  const release=()=>{if(hold){hold=false;sauver();message('Sable modelé et sauvegardé.');}};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  for(const id of ['world-walk','world-sail','world-reset'])document.getElementById(id).addEventListener('click',fermer,{capture:true});
  A.tick=(dt,t)=>{if(hold&&pointer){modeler(pointer.x,pointer.z,dt);lastTime=t;}if(A.on&&pointer)preview.position.y=hauteur(pointer.x,pointer.z);};
  J.atelier=A;return A;
}

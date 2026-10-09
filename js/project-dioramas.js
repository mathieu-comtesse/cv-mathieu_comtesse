import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { initWorkshopPreviews } from './project-previews.js?v=cv-scene-v29';
import { initProcessMachines } from './process-machines.js?v=cv-scene-v29';
import { processSymbol } from './process-symbols.js?v=cv-scene-v29';
import { createMarquee } from './marquee.js?v=cv-scene-v29';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
function orbit(camera,canvas){
  const target=new THREE.Vector3(0,.6,0),pointers=new Map();let theta=.6298,phi=.9428,distance=13.8,pinch=0,manualUntil=0;
  canvas.addEventListener('pointerdown',e=>{manualUntil=Infinity;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{const p=pointers.get(e.pointerId);if(!p)return;if(pointers.size===1){theta-=(e.clientX-p.x)*.006;phi=Math.max(.3,Math.min(Math.PI*.48,phi+(e.clientY-p.y)*.006));}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)distance=Math.max(.1,Math.min(100,distance*pinch/d));pinch=d;}});
  const release=e=>{pointers.delete(e.pointerId);pinch=0;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('wheel',e=>{manualUntil=Infinity;e.preventDefault();distance=Math.max(9,Math.min(22,distance*Math.exp(e.deltaY*.001)));},{passive:false});
  return {target,frame(point,zoom){target.copy(point);distance=zoom;},reset(){theta=.6298;phi=.9428;distance=12.8;manualUntil=0;},focus(point,dt,zoom=12.8){if(performance.now()<manualUntil)return;const k=1-Math.exp(-dt*3);target.lerp(point,k);distance+=(zoom-distance)*k;},update(){camera.position.set(target.x+distance*Math.sin(phi)*Math.sin(theta),target.y+distance*Math.cos(phi),target.z+distance*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);}};
}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const extraGainHTML=p=>(p.extraGains||[]).map(g=>`<span><small>Temps libéré</small><b>${esc(g.time)}</b>${esc(g.timeCtx)}</span><span><small>Valorisation du temps</small><b>${esc(g.money)}</b>${esc(g.moneyCtx)}</span>`).join('');
const palettes={pa:'#328b81',finance:'#cd9355',vmvre:'#587cb3',cerfa:'#df725b',vre:'#668dab',studio:'#bc819e',powerbi:'#c5a647',suivi:'#628d85',gares:'#88a85a',terrain:'#c4835c',moteur44:'#298b81'};
const cache=new Map();
const load=id=>{if(!cache.has(id))cache.set(id,new GLTFLoader().loadAsync(`assets/dioramas/${id}.glb?v=cv-scene-v29`).catch(e=>{cache.delete(id);throw e;}));return cache.get(id);};

export function initProjectDioramas(host,projects){
  host.className='marquee process-gallery';
  host.innerHTML=`<div class="mq-track process-track">${projects.map((p,i)=>`<button class="process-card" type="button" data-project="${i}" aria-label="Explorer ${esc(p.title)}"><span class="process-kind">${p.id==='vmvre'?'Continuité de traitement':p.id==='finance'?'Pilotage financier':'Processus métier'}</span><img src="assets/dioramas/${p.id}.png?v=cv-scene-v29" alt="" width="720" height="560" loading="lazy"><b>${esc(p.title)}</b><span>${esc(p.sub)}</span>${p.gainStatus!=='none'?`<small class="process-card-gains"><span><em>Temps libéré</em><strong>${esc(p.time)}</strong><i>${esc(p.timeCtx)}</i></span><span><em>${p.gainStatus==='penalties'?'Pénalités identifiées':'Valorisation financière'}</em><strong>${esc(p.money)}</strong><i>${esc(p.moneyCtx)}</i></span></small>`:''}${p.extraGains?`<span class="process-consultation-gain">Consultation : 10 min × ≈ 40/jour · 6 h 40/jour · 698,27 €/jour<br>Traitement : 500 PP/an · 125–167 h/an · 13 092,50–17 456,67 €/an</span>`:''}<span class="process-card-action" aria-hidden="true"></span></button>`).join('')}</div><p class="process-hint">Glissez pour parcourir · cliquez pour faire fonctionner un projet</p>`;
  createMarquee(host, { loopEnd: -1 });
  host.querySelectorAll('img').forEach(img=>img.draggable=false);
  initWorkshopPreviews(host,projects,load,palettes);
  const modal=document.createElement('dialog');modal.className='process-dialog';modal.setAttribute('aria-labelledby','process-title');
  modal.innerHTML=`<div class="process-toolbar"><button type="button" class="process-back">Retour aux projets</button><span>Atelier des processus</span><button type="button" class="process-theme" aria-label="Changer le thème de l’atelier">Clair / sombre</button></div><div class="process-content"><div class="process-stage" aria-label="Diorama interactif : faites glisser pour tourner"><img class="process-poster" alt=""/><canvas></canvas><p class="process-loading" role="status">Chargement de l’atelier…</p></div><div class="process-transform" aria-label="Transformation des données"><span class="transform-input"></span><span class="transform-machine"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h4l2-5h4l2 5h4v9H4zM7 14h10M10 19v-5m4 5v-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span><span class="transform-output"></span><b></b></div><div class="process-copy"><p class="process-operation" aria-live="polite"></p><p class="process-eyebrow"></p><h2 id="process-title"></h2><p class="process-sub"></p><div class="process-outcome"></div><div class="process-controls"><button class="process-play" type="button" aria-pressed="false">Mettre en pause</button><button class="process-next" type="button">Étape suivante</button><button class="process-test" type="button" hidden></button></div><div class="process-steps" role="group" aria-label="Étapes du processus"></div><div class="process-explanation" aria-live="polite"><b></b><p></p></div><details class="process-study" hidden><summary>Lire la fiche complète</summary><div></div></details><p class="process-foot">Démonstration avec des données fictives · glissez le modèle pour le tourner</p></div><div class="process-projects" aria-label="Choisir un autre projet"></div></div>`;
  document.body.append(modal);
  const stage=modal.querySelector('.process-stage'),canvas=stage.querySelector('canvas'),status=stage.querySelector('.process-loading'),labels=modal.querySelector('.process-transform');
  let renderer,scene,camera,controls,model,current,index=0,step=0,elapsed=0,playing=true,raf=0,previous=0,request=0,opener,exception=false;
  let machines;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setup(){
    if(renderer)return;
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
    scene=new THREE.Scene();const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.24;pmrem.dispose();scene.add(new THREE.HemisphereLight('#ffffff','#bcc6cb',1.3));
    const key=new THREE.DirectionalLight('#fff6e8',2.5);key.position.set(-4,8,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});key.shadow.bias=-.0004;scene.add(key);
    camera=new THREE.PerspectiveCamera(32,1,.1,100);camera.position.set(8,8,11);controls=orbit(camera,canvas);controls.target.set(0,.6,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=9;controls.maxDistance=22;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI*.48;
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.13}));ground.rotation.x=-Math.PI/2;ground.position.y=-.055;ground.receiveShadow=true;scene.add(ground);
    new ResizeObserver(resize).observe(stage);resize();
  }
  function resize(){if(!renderer||!stage.clientWidth)return;renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}
  const select=n=>{step=(n+current.diag.length)%current.diag.length;elapsed=0;modal.dataset.step=String(step);modal.querySelectorAll('.process-step').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===step)));modal.querySelector('.process-explanation b').textContent=`${step+1}. ${current.diag[step][0]}`;modal.querySelector('.process-explanation p').textContent=current.diag[step][1];labels.querySelector('.transform-input').innerHTML=processSymbol(current.diag[Math.max(0,step-1)][2]);labels.querySelector('.transform-output').innerHTML=processSymbol(current.diag[step][2]);labels.querySelector('b').textContent=current.diag[step][0];};
  function animate(now){
    if(!modal.open)return;
    modal.dataset.playing=String(playing);
    if(previous&&now-previous<1000/30){raf=requestAnimationFrame(animate);return;}
    const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
    if(playing&&model){elapsed+=dt;if(elapsed>4.6)select(step+1);}
    if(model){
      machines?.update({step,elapsed,dt,playing,exception});
      const anchors=current.diag.map((_,i)=>model.getObjectByName('StepAnchor_'+i)?.position.clone()||new THREE.Vector3(-2.8+i*5.6/(current.diag.length-1),.65,1.15));
      const end=anchors[step],start=step?anchors[step-1]:end.clone().add(new THREE.Vector3(-.7,0,0));
      for(let i=0;i<3;i++){const packet=model.getObjectByName('Packet_'+i);if(packet){const phase=((elapsed/4.6)+i*.23)%1;packet.position.copy(start).lerp(end,phase);packet.position.y+=.10+Math.sin(phase*Math.PI)*.09;packet.visible=playing||i===0;}}
      const sparks=model.getObjectByName('ProcessConfirmation');sparks?.children.forEach((o,i)=>{const phase=((elapsed*.7)+i/10)%1;o.position.copy(end).add(new THREE.Vector3(Math.sin(i*2.39)*phase*.22,.10+phase*.32,Math.cos(i*1.91)*phase*.22));o.material.opacity=playing?(1-phase)*.55:0;});
      const beam=model.getObjectByName('ProcessScannerBeam');if(beam){beam.position.copy(end);beam.position.y+=.18;beam.position.z+=Math.sin(elapsed*4)*.09;beam.material.opacity=playing&&['extract','check'].includes(current.diag[step][2])?.30:0;}

    }
    controls.update();renderer.shadowMap.needsUpdate=playing&&Number(modal.dataset.frames||0)%6===0||!Number(modal.dataset.frames);renderer.render(scene,camera);

    const operation=modal.querySelector('.process-operation');if(current.id==='terrain'){const s=['Le billet brut arrive sur la palette.','Le métal fond dans le creuset, puis est coulé dans le moule.','Le marteau-pilon transforme le billet en poutrelle.','Le pont roulant lève et transporte la pièce forgée.','La pièce refroidie est contrôlée puis déposée en sortie.'][step];if(operation.textContent!==s)operation.textContent=s;}else operation.textContent=current.diag[step][1];
    modal.dataset.frames=String((Number(modal.dataset.frames)||0)+1);raf=requestAnimationFrame(animate);
  }
  function close(){request++;cancelAnimationFrame(raf);modal.close();document.body.classList.remove('lock');document.dispatchEvent(new CustomEvent('project-workshop',{detail:{open:false}}));opener?.focus();}
  async function open(n,trigger){
    index=n;current=projects[n];exception=false;modal.dataset.exception='false';playing=!reduced;opener=trigger||opener;const ticket=++request;
    if(!modal.open){modal.showModal();document.body.classList.add('lock');document.dispatchEvent(new CustomEvent('project-workshop',{detail:{open:true}}));}
    modal.scrollTop=0;
    modal.dataset.project=current.id;modal.style.setProperty('--process-accent',palettes[current.id]);modal.querySelector('#process-title').textContent=current.title;modal.querySelector('.process-sub').textContent=current.sub;modal.querySelector('.process-eyebrow').textContent=current.id==='vmvre'?'VM Windows · reprise à deux VM à concevoir':'Projet professionnel';
    modal.querySelector('.process-outcome').innerHTML=current.gainStatus==='none'?'':`<span><small>Temps libéré</small><b>${esc(current.time)}</b>${esc(current.timeCtx)}</span><span><small>${current.gainStatus==='penalties'?'Pénalités identifiées':'Valorisation financière du temps'}</small><b>${esc(current.money)}</b>${esc(current.moneyCtx)}</span>${extraGainHTML(current)}<p class="process-gain-basis">${esc(current.gainBasis)}${current.gainStatus==='time-value'?' Valorisation de capacité de travail libérée, pas une recette encaissée.':''}</p>`;
    const study=modal.querySelector('.process-study');study.hidden=!current.pro;study.open=false;study.querySelector('div').innerHTML=current.pro?[current.pro.lead,current.pro.gain,current.pro.team].filter(Boolean).map(t=>'<p>'+esc(t)+'</p>').join(''):'';
    modal.querySelector('.process-steps').innerHTML=current.diag.map((s,i)=>`<button type="button" class="process-step" data-step="${i}"><small>${String(i+1).padStart(2,'0')}</small><span class="process-tool">${processSymbol(s[2])}</span>${esc(s[0])}</button>`).join('');
    modal.querySelector('.process-projects').innerHTML=projects.map((p,i)=>`<button type="button" data-project="${i}" aria-current="${i===n?'true':'false'}">${esc(p.title)}</button>`).join('');
    const test=modal.querySelector('.process-test');test.hidden=!['finance','vmvre'].includes(current.id);test.textContent=current.id==='vmvre'?'Simuler la panne de VM 1':'Simuler un dépassement';
    modal.querySelector('.process-play').textContent=playing?'Mettre en pause':'Lire l’animation';modal.querySelector('.process-play').setAttribute('aria-pressed',String(!playing));
    if(!reduced){stage.animate([{opacity:.2,transform:'translateY(28px) scale(.84)'},{opacity:1,transform:'none'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});modal.querySelector('.process-copy').animate([{opacity:0,transform:'translateY(15px)'},{opacity:1,transform:'none'}],{duration:600,delay:100,fill:'backwards'});}
    const poster=stage.querySelector('.process-poster');poster.src=`assets/dioramas/${current.id}.png?v=cv-scene-v29`;poster.hidden=false;status.hidden=false;status.textContent='Chargement de l’atelier…';select(0);
    try{
      setup();const asset=await load(current.id);if(ticket!==request||!modal.open)return;if(model){machines?.dispose();scene.remove(model);model.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});}model=asset.scene.clone(true);model.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;}});scene.add(model);machines=initProcessMachines(model,current.diag,palettes[current.id],current.id);
      const sparkGroup=new THREE.Group();sparkGroup.name='ProcessConfirmation';model.add(sparkGroup);
      for(let i=0;i<10;i++){const spark=new THREE.Mesh(new THREE.IcosahedronGeometry(.022,0),new THREE.MeshBasicMaterial({color:i%3===0?'#ffffff':palettes[current.id],transparent:true,opacity:0}));sparkGroup.add(spark);}
      const beam=new THREE.Mesh(new THREE.PlaneGeometry(.52,.32),new THREE.MeshBasicMaterial({color:'#69d5db',transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false}));beam.name='ProcessScannerBeam';beam.rotation.x=-Math.PI/2;beam.position.set(-.8,.84,.35);model.add(beam);
      controls.reset();resize();const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());center.y=Math.max(.7,center.y*.85);let distance=12.8;for(let pass=0;pass<2;pass++){controls.frame(center,distance);controls.update();camera.updateMatrixWorld();let extent=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new THREE.Vector3(x,y,z).project(camera);extent=Math.max(extent,Math.abs(v.x),Math.abs(v.y));}distance*=extent/.9;}controls.frame(center,distance);modal.scrollTop=0;poster.hidden=true;status.hidden=true;modal.dataset.loaded=current.id;previous=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);
    }catch(e){if(ticket!==request)return;status.textContent='Aperçu disponible. Les étapes restent consultables.';console.warn('Project diorama unavailable',e);}
    modal.querySelector('.process-back').focus();
  }
  host.addEventListener('click',e=>{const b=e.target.closest('button[data-project]');if(b)open(Number(b.dataset.project),b);});
  modal.addEventListener('click',e=>{const project=e.target.closest('button[data-project]'),s=e.target.closest('button[data-step]');if(project)open(Number(project.dataset.project));else if(s){select(Number(s.dataset.step));playing=false;renderer&&(renderer.shadowMap.needsUpdate=true);modal.querySelector('.process-play').textContent='Lire l’animation';modal.querySelector('.process-play').setAttribute('aria-pressed','true');}});
  modal.querySelector('.process-back').onclick=close;modal.addEventListener('cancel',e=>{e.preventDefault();close();});
  modal.querySelector('.process-next').onclick=()=>select(step+1);
  modal.querySelector('.process-play').onclick=e=>{playing=!playing;e.currentTarget.textContent=playing?'Mettre en pause':'Lire l’animation';e.currentTarget.setAttribute('aria-pressed',String(!playing));};
  modal.querySelector('.process-theme').onclick=()=>modal.classList.toggle('process-dark');
  modal.querySelector('.process-test').onclick=()=>{
    exception=!exception;playing=false;modal.querySelector('.process-play').textContent='Lire l’animation';modal.querySelector('.process-play').setAttribute('aria-pressed','true');select(current.id==='vmvre'?3:4);
    const message=current.id==='vmvre'?(exception?'Scénario de reprise à concevoir : VM 1 ne répond plus. Son droit d’écriture doit être révoqué avant la reprise par VM 2, avec verrou partagé et historique anti-doublons. Le raccordement reste à valider dans l’environnement restreint.':'VM 1 traite les rapports. VM 2 attend : un seul écrivain détient le verrou.'):(exception?'Le montant fictif dépasse le seuil lu dans Excel. Il est orienté vers l’alerte ; la même exception ne doit pas déclencher une relance en double.':'Le montant fictif reste sous le seuil : le suivi se poursuit sans alerte.');
    modal.querySelector('.process-explanation p').textContent=message;
    modal.querySelector('.process-test').textContent=exception?'Revenir au fonctionnement normal':current.id==='vmvre'?'Simuler la panne de VM 1':'Simuler un dépassement';
    modal.dataset.exception=String(exception);
    if(model){if(current.id==='vmvre')for(let i=0;i<2;i++)model.getObjectByName('VM_'+i)?.traverse(o=>{if(o.isMesh&&/Server[ _]status[ _]LED/.test(o.name)){o.material.color.set(i===(exception?1:0)?'#59bc82':'#d87868');o.material.emissive.set(i===(exception?1:0)?'#164f31':'#4b1313');}});const gate=(model.getObjectByName('Budget_threshold_gate')||model.getObjectByName('Budget threshold gate'));if(gate)gate.rotation.z=exception?.45:0;const parcels=[0,1,2].map(i=>model.getObjectByName('Packet_'+i));parcels.forEach(p=>{if(p)p.position.z=exception&&current.id==='finance'?.66:0;});}
  };
}

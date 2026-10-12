import {Renderer} from './render.js';
import {World} from './world.js';
import {Player} from './player.js';
import {FollowCam} from './camera.js';
import {REGION_IDS,HALF,colliderGrid,TIDE,tideLevel,traceBeam,nearestFree} from './terrain.js';
import {Audio} from './audio.js';
import {UI} from './ui.js';
import * as S from './story.js';
import {PALETTES} from './palettes.js';
import {clamp} from './noise.js';

const SAVE_KEY='veilleuse.save.v1',SET_KEY='veilleuse.settings.v1';
const blank=()=>({v:1,region:0,flame:100,playSec:0,deaths:0,done:false,
  lit:{forest:[],crystal:[],shore:[]},relics:{forest:[],crystal:[],shore:[]},armed:{crystal:[]},mirrors:{},gate:{},checkpoint:{},shown:[],pos:null});
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const COST={light:20,source:10};

export class Game{
  constructor(){
    this.ui=new UI();this.audio=new Audio();this.rd=new Renderer(document.getElementById('view'));
    this.settings=Object.assign({volume:70,pixels:300,shadow:2048,flash:true,motion:true},store.get(SET_KEY)||{});
    this.rd.setTargetHeight(this.settings.pixels);this.audio.vol=this.settings.volume/100;
    this.cam=new FollowCam(this.rd.aspect);this.player=new Player();
    this.keys=Object.create(null);this.state='boot';this.time=0;this.tideClock=38;this.last=performance.now();
    this.save=store.get(SAVE_KEY)||null;this.rainI=.5;this.flash=0;this.nextBolt=8;this.shelter=0;this.sheltered=false;this.flame=100;
    this.hintT=0;this.discovered=null;this.autoT=0;this.lastStep=0;this.deadT=0;this.swept=0;
    this.bindInput();this.bindUI();
    addEventListener('resize',()=>{this.rd.resize();this.cam.setAspect(this.rd.aspect)});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='play'){this.persist();this.pause(true)}});
  }
  // ------------------------------------------------------------------ démarrage
  async init(){
    await this.buildWorld(0,{menu:true});
    this.state='menu';this.ui.show('menu',true);
    document.getElementById('btn-continue').hidden=!(this.save&&this.save.v===1);
    this.ui.loaded();requestAnimationFrame(t=>this.loop(t));
  }
  async buildWorld(i,{menu=false}={}){
    const id=REGION_IDS[i];
    this.world?.dispose();
    await new Promise(r=>setTimeout(r,30));
    this.world=new World(id,{shadow:this.settings.shadow});this.rid=id;this.ri=i;this.R=this.world.R;
    this.grid=colliderGrid(this.world.props.colliders);
    this.rd.setPalette(id);this.ui.theme(id);this.audio.setRegion(id);
    this.rd.uniforms.uRain.value=0;
    this.discovered=new Uint8Array(48*48);this.mapBase=null;
    const sp=this.R.layout.spawn;this.player.place(this.R,sp.x,sp.z);this.cam.snap(sp.x,this.player.y,sp.z);
    this.menuMode=menu;
  }
  async newGame(){
    this.save=blank();this.persist();await this.startRegion(0,{intro:true});
  }
  async continueGame(){
    if(this.save.done){this.save.done=false;this.save.region=0;this.save.pos=null}
    await this.startRegion(this.save.region,{resume:true});
  }
  async startRegion(i,{intro=false,resume=false}={}){
    this.audio.start();this.state='loading';this.ui.show('menu',false);this.ui.clearSpeech();
    await this.ui.fade(true,700);
    await this.buildWorld(i);
    const id=this.rid,sv=this.save,R=this.R,W=this.world;
    sv.region=i;this.menuMode=false;
    for(const s of sv.lit[id])W.setSteleLit(s);
    for(const r of sv.relics[id])W.setRelicGot(r);
    if(sv.gate[id])W.setGateOpen(true);
    W.puzzles.forEach(pz=>{const m=sv.mirrors[pz.def.id];if(m)m.forEach((st,k)=>pz.def.mirrors[k].state=st);pz.armed=sv.armed.crystal.includes(pz.def.id);W.refreshBeam(pz)});
    const cpId=sv.checkpoint[id],cp=cpId&&R.layout.foyers.find(f=>f.id===cpId),sp=cp?{x:cp.x+2.5,z:cp.z+3}:R.layout.spawn;
    const pos=resume&&sv.pos&&sv.pos.region===id?sv.pos:sp;
    this.player.place(R,pos.x,pos.z);this.cam.snap(pos.x,this.player.y,pos.z);
    this.flame=resume?sv.flame:(i===0?100:Math.max(60,sv.flame));
    this.tideClock=38;this.rainI=.5;this.flash=0;this.shelter=0;this.hintT=0;this.autoT=0;this.dirty=true;this.gateT=0;
    this.updateGate(true);
    this.ui.hudShow(true);this.ui.setTide(0,'',id==='shore');
    this.state='play';await this.ui.fade(false,1100);
    const T=S.REGIONS[id];this.ui.titleCard(T.title,T.sub);
    if(intro&&i===0){S.PROLOGUE.forEach(t=>this.ui.speak('',t,2600))}
    else if(!resume||!sv.shown.includes('enter-'+id)){T.enter.forEach(t=>this.ui.speak('',t,3200));sv.shown.push('enter-'+id)}
    if(i===0)setTimeout(()=>this.hint('move'),intro?16000:5000);
    if(id==='shore')setTimeout(()=>this.hint('tide'),9000);
    this.persist();
  }
  hint(k){if(this.save.shown.includes(k))return;this.save.shown.push(k);this.ui.toast(S.HINTS[k],7000)}
  persist(){if(!this.save)return;this.save.flame=this.flame;this.save.pos={region:this.rid,x:this.player.x,z:this.player.z};store.set(SAVE_KEY,this.save)}
  // ------------------------------------------------------------------ entrées
  bindInput(){
    const cv=document.getElementById('view');
    addEventListener('keydown',e=>{
      if(e.target.tagName==='SELECT'||e.target.tagName==='INPUT')return;
      this.keys[e.code]=true;const k=e.key.toLowerCase();
      if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();
      if(k==='escape'){if(this.state==='play')this.pause(true);else if(this.state==='pause')this.pause(false);else if(this.state==='map'||this.state==='journal')this.closeOverlay()}
      if(this.state==='play'&&!e.repeat){
        if(k==='e'||e.code==='Space'||e.code==='Enter')this.interact(e.shiftKey);
        else if(k==='h')this.hintT=7;
        else if(k==='m')this.openMap();
        else if(k==='j')this.openJournal();
        else if(k==='r')this.cam.ty+=(e.shiftKey?-1:1)*Math.PI/4;
        else if(k==='p')this.pause(true);
      }else if((this.state==='map'&&k==='m')||(this.state==='journal'&&k==='j'))this.closeOverlay();
      if(this.state==='play'&&(e.code==='Enter'||e.code==='Space')&&this.ui.speaking&&!this.nearInteract)this.ui.skipSpeech();
    });
    addEventListener('keyup',e=>this.keys[e.code]=false);
    addEventListener('blur',()=>{for(const k in this.keys)this.keys[k]=false});
    let drag=null;
    cv.addEventListener('pointerdown',e=>{if(this.state!=='play')return;drag={x:e.clientX,y:e.clientY};cv.setPointerCapture(e.pointerId);cv.classList.add('drag')});
    cv.addEventListener('pointermove',e=>{if(!drag)return;this.cam.ty-=(e.clientX-drag.x)*.006;this.cam.tp=clamp(this.cam.tp+(e.clientY-drag.y)*.004,.35,1.2);drag={x:e.clientX,y:e.clientY}});
    const up=()=>{drag=null;cv.classList.remove('drag')};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',e=>{e.preventDefault();this.cam.zoom(Math.sign(e.deltaY)*4)},{passive:false});
  }
  bindUI(){
    const $=id=>document.getElementById(id);
    $('btn-new').onclick=()=>{if(this.save&&!this.save.done&&this.save.lit&&!confirm('Écraser la partie en cours ?'))return;this.newGame()};
    $('btn-continue').onclick=()=>this.continueGame();
    const openSet=from=>{this.setFrom=from;this.ui.show(from,false);this.ui.show('settings',true)};
    $('btn-settings').onclick=()=>openSet('menu');$('btn-settings2').onclick=()=>openSet('pause');
    $('btn-settings-back').onclick=()=>{this.ui.show('settings',false);this.ui.show(this.setFrom,true)};
    $('btn-resume').onclick=()=>this.pause(false);
    $('btn-journal').onclick=()=>{this.ui.show('pause',false);this.openJournal(true)};
    $('btn-journal-close').onclick=()=>this.closeOverlay();
    $('btn-quit').onclick=()=>this.toMenu();
    $('btn-end-continue').onclick=()=>this.afterEnding(false);$('btn-end-menu').onclick=()=>this.afterEnding(true);
    const S0=this.settings;$('set-volume').value=S0.volume;$('set-pixels').value=S0.pixels;$('set-shadow').value=S0.shadow;$('set-flash').checked=S0.flash;$('set-motion').checked=S0.motion;
    const apply=()=>{S0.volume=+$('set-volume').value;S0.pixels=+$('set-pixels').value;S0.shadow=+$('set-shadow').value;S0.flash=$('set-flash').checked;S0.motion=$('set-motion').checked;
      this.audio.setVolume(S0.volume/100);this.rd.setTargetHeight(S0.pixels);this.cam.setAspect(this.rd.aspect);store.set(SET_KEY,S0)};
    ['set-volume','set-pixels','set-shadow','set-flash','set-motion'].forEach(id=>$(id).addEventListener('input',apply));
  }
  pause(on){
    if(on&&this.state==='play'){this.state='pause';this.ui.show('pause',true);const s=this.save,m=Math.floor(s.playSec/60);document.getElementById('pause-stats').textContent=`${m} min de jeu · ${this.relicTotal()} souvenirs · ${s.deaths} flammes éteintes`;this.persist()}
    else if(!on&&this.state==='pause'){this.state='play';this.ui.show('pause',false);this.ui.show('settings',false);this.last=performance.now()}
  }
  closeOverlay(){this.ui.show('map',false);this.ui.show('journal',false);if(this.journalFromPause){this.journalFromPause=false;this.state='pause';this.ui.show('pause',true)}else this.state='play'}
  toMenu(){this.persist();this.state='menu';this.ui.show('pause',false);this.ui.hudShow(false);this.ui.clearSpeech();this.ui.show('menu',true);document.getElementById('btn-continue').hidden=false}
  relicTotal(){return Object.values(this.save.relics).reduce((a,b)=>a+b.length,0)}
  // ------------------------------------------------------------------ boucle
  loop(now){
    const dt=Math.min(.05,(now-this.last)/1000);this.last=now;
    if(this.state==='play'||this.state==='dead')this.update(dt);
    else if(this.state==='menu'||this.state==='loading'||this.state==='pause'||this.state==='map'||this.state==='journal'||this.state==='ending')this.idle(dt);
    requestAnimationFrame(t=>this.loop(t));
  }
  idle(dt){
    this.time+=dt;
    if(this.state==='menu'||this.state==='ending'){this.cam.ty+=dt*.05;this.cam.snap(this.player.x,this.player.y,this.player.z);this.cam.yaw=this.cam.ty;this.cam.update(dt,this.player.x,this.player.y,this.player.z)}
    this.rd.uniforms.uRain.value=this.world.env.rain?.7:0;
    this.world.update(dt,this.time,{player:this.player,flame:100,tideT:this.tideClock+=dt});
    this.rd.render(this.world.scene,this.cam.cam,this.time);
  }
  update(dt){
    const W=this.world,R=this.R,P=this.player,env=W.env,sv=this.save;
    this.time+=dt;sv.playSec+=dt;this.tideClock+=dt;this.frames=(this.frames||0)+1;
    const k=this.keys,dead=this.state==='dead';
    const inp={x:(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),y:(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),run:k.ShiftLeft||k.ShiftRight,slow:k.KeyC||k.ControlLeft||k.ControlRight};
    if(!dead){P.update(dt,inp,this.cam.yaw,R,this.grid,this.tideClock);if(inp.x||inp.y)this.firstMove=(this.firstMove||0)+dt}
    else{P.vx=P.vz=0;P.moving=0}
    this.cam.update(dt,P.x,P.y,P.z,this.settings.motion?this.flash*.35:0);
    this.hazards(dt,inp);
    this.interactions();
    this.puzzles();
    W.update(dt,this.time,{player:P,flame:this.flame,tideT:this.tideClock});
    this.fx(dt);
    this.hud(dt);
    this.rd.render(W.scene,this.cam.cam,this.time);
    // pas
    const si=Math.floor(P.step/Math.PI);if(si!==this.lastStep&&P.moving>.3){this.lastStep=si;this.audio.step(P.wading>0?'water':this.rid==='shore'&&R.height(P.x,P.z)<1.2?'sand':'soil')}
    // exploration (carte)
    const cx=Math.floor((P.x+HALF)/16),cz=Math.floor((P.z+HALF)/16);
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){const a=cx+dx,b=cz+dz;if(a>=0&&b>=0&&a<48&&b<48&&dx*dx+dz*dz<=17)this.discovered[b*48+a]=1}
    this.audio.tick(dt,{tide:this.rid==='shore'?(tideLevel(this.tideClock)-TIDE.low)/(TIDE.high-TIDE.low):0});
    if((this.autoT+=dt)>10){this.autoT=0;this.persist()}
    if(this.gate&&0){}
    if(sv.playSec>110)this.hint('help');
    if(this.firstMove>12)this.hint('cam');
  }
  // ------------------------------------------------------------------ dangers : pluie, eau, flamme
  hazards(dt,inp){
    const P=this.player,R=this.R,W=this.world,env=W.env;
    // abri sous les grands arbres / arches
    this.sheltered=false;
    for(const s of R.layout.shelters||[]){if(Math.hypot(P.x-s.x,P.z-s.z)<s.r){this.sheltered=true;break}}
    const marsh=this.rid==='forest'&&P.z<-185;
    if(env.rain){
      const t=this.time,base=clamp(.5+.28*Math.sin(t*.055)+.22*Math.sin(t*.13+1.3),.25,1);
      const target=marsh?Math.max(.92,base):base;
      this.rainI+=(target-this.rainI)*dt*.35;
      if(this.rainI>.82&&t>this.nextBolt){this.flash=1;this.audio.thunder();this.nextBolt=t+9+Math.random()*16}
      this.audio.setRain(this.rainI);
    }else this.audio.setRain(0);
    this.flash*=Math.exp(-dt*6);
    if(this.state==='dead'){this.deadT+=dt;return}
    let drain=0;
    if(env.rain&&!this.sheltered)drain=(.5+1.5*this.rainI)*(marsh?1.35:1);
    if(P.wading>0)drain+=env.drain.wade*P.wading;
    if(inp.slow)drain*=.45;
    // foyer proche : la braise reprend doucement
    const near=this.nearestFoyer();
    if(near.d<5)this.flame=Math.min(100,this.flame+30*dt);
    else if(this.rid==='crystal')this.flame=Math.min(100,this.flame+10*dt);
    if(drain>0&&near.d>=5){const before=this.flame;this.flame=Math.max(0,this.flame-drain*dt);
      if(before>60&&this.flame<=60)this.hint('rain');
      if(before>25&&this.flame<=25)this.ui.toast('Ta flamme faiblit. Cherche un abri ou un foyer.',3500)}
    if(this.flame<=0)this.die();
    // montée de la marée : rattraper le joueur piégé dans un bassin
    if(this.rid==='shore'){const d=R.depthAt(P.x,P.z,this.tideClock);this.swept=d>.62?this.swept+dt:0;
      if(this.swept>.7){this.swept=0;this.ui.toast('Le courant te ramène sur la rive.',3500);this.flame=Math.max(15,this.flame-30);const f=nearestFree(R,P.x,P.z,this.tideClock);let best=null,bd=1e9;
        for(let a=0;a<48;a++)for(let rr=4;rr<60;rr+=4){const x=P.x+Math.cos(a*.13)*rr,z=P.z+Math.sin(a*.13)*rr;if(R.depthAt(x,z,this.tideClock)<.1&&R.height(x,z)>-.2&&rr<bd){bd=rr;best={x,z}}}
        const to=best||f;P.place(R,to.x,to.z);this.cam.snap(to.x,P.y,to.z);this.audio.chime('fail')}}
  }
  nearestFoyer(){const P=this.player;let best={d:1e9,f:null};for(const f of this.world.foyers){const d=Math.hypot(P.x-f.def.x,P.z-f.def.z);if(d<best.d)best={d,f}}return best}
  async die(){
    if(this.state==='dead')return;this.state='dead';this.deadT=0;this.save.deaths++;this.audio.chime('fail');
    this.ui.toast('La flamme s’éteint. Le dernier foyer te rappelle.',3500);
    await this.ui.fade(true,900);
    const R=this.R,sv=this.save,cp=R.layout.foyers.find(f=>f.id===sv.checkpoint[this.rid])||{x:R.layout.spawn.x-2.5,z:R.layout.spawn.z-3};
    this.player.place(R,cp.x+2.5,cp.z+3);this.cam.snap(cp.x+2.5,this.player.y,cp.z+3);this.flame=100;
    await this.ui.fade(false,900);this.state='play';this.persist();
  }
  // ------------------------------------------------------------------ interactions
  interactions(){
    const W=this.world,P=this.player;let best=null,bd=1e9;
    for(const it of W.interact){const d=Math.hypot(P.x-it.x,P.z-it.z);if(d<it.r&&d<bd){bd=d;best=it}}
    this.nearInteract=best;
    if(best)this.hint('interact');
    if(best&&best.type==='mirror')this.hint('mirror');
    let txt=null;const sv=this.save;
    if(best){
      const e='<kbd>E</kbd>';
      if(best.type==='foyer')txt=e+(this.flame<99?'Raviver la flamme':'Veiller au foyer');
      else if(best.type==='stele'){const s=W.steles.find(x=>x.def.id===best.id);txt=e+(s.lit?'Relire l’inscription':s.def.kind==='puzzle'?'Examiner la stèle':'Allumer la stèle')}
      else if(best.type==='source'){const pz=W.puzzles.find(x=>x.def.id===best.id);txt=e+(pz.armed?'Prisme allumé':'Allumer le prisme')}
      else if(best.type==='mirror')txt=e+'Tourner le miroir';
      else if(best.type==='gate')txt=e+(W.gate.open?'Franchir la porte':'Examiner la porte');
    }
    this.ui.setPrompt(this.state==='play'?txt:null);
    // reliques
    for(const r of W.relics){if(r.got||!r.g.visible)continue;if(Math.hypot(P.x-r.def.x,P.z-r.def.z)<2.8)this.collectRelic(r)}
    // porte ouverte : on la franchit en marchant dedans
    const g=W.gate;if(g.open&&this.state==='play'&&Math.hypot(P.x-g.def.x,P.z-g.def.z)<3.4)this.passGate();
  }
  interact(rev){
    const it=this.nearInteract,W=this.world;if(!it||this.state!=='play')return;
    if(it.type==='foyer'){
      const f=W.foyers.find(x=>x.def.id===it.id),first=this.save.checkpoint[this.rid]!==it.id;
      this.flame=100;this.save.checkpoint[this.rid]=it.id;this.audio.chime('foyer');
      if(first){const idx=this.R.layout.foyers.findIndex(x=>x.id===it.id);this.ui.toast(S.FOYER[this.rid][idx]||'Un foyer.',4200);this.ui.toast&&0}
      this.persist();
    }else if(it.type==='stele'){
      const s=W.steles.find(x=>x.def.id===it.id),idx=W.steles.indexOf(s);
      if(s.lit)this.ui.speak('Inscription',S.STELE[this.rid][idx],3000);
      else if(s.def.kind==='puzzle'){this.ui.toast('Cette stèle répond à un faisceau de lumière. Cherche son prisme.',4500);const pz=W.puzzles.find(p=>p.def.id===s.def.puzzle);this.pingPuzzle=pz}
      else if(this.flame<COST.light+5)this.ui.toast('Ta flamme est trop faible pour cette stèle. Ravivée-la à un foyer.',4000);
      else{this.flame-=COST.light;this.lightStele(s,idx)}
    }else if(it.type==='source'){
      const pz=W.puzzles.find(x=>x.def.id===it.id);
      if(pz.armed)this.ui.toast('Le prisme est déjà allumé. Tourne les miroirs.',3500);
      else if(this.flame<COST.source+5)this.ui.toast('Ta flamme est trop faible.',3000);
      else{this.flame-=COST.source;pz.armed=true;this.save.armed.crystal.push(pz.def.id);W.refreshBeam(pz);this.audio.chime('light');this.persist()}
    }else if(it.type==='mirror'){
      const pz=W.puzzles.find(x=>x.def.id===it.id),m=pz.def.mirrors[it.idx];
      m.state=(m.state+(rev?7:1))%8;this.save.mirrors[pz.def.id]=pz.def.mirrors.map(q=>q.state);this.audio.chime('mirror');this.dirty=true;
    }else if(it.type==='gate'){
      if(!W.gate.open){const st=this.gateStatus();this.ui.speak('Porte',S.REGIONS[this.rid].gateLocked({have:st.have,need:st.need},st.relics,st.needRelics),3200)}
    }
  }
  lightStele(s,idx){
    this.world.setSteleLit(s.def.id);this.save.lit[this.rid].push(s.def.id);this.audio.chime(s.def.kind==='puzzle'?'solve':'light');
    this.ui.speak('Inscription',S.STELE[this.rid][idx],3200);this.updateGate();this.persist();
  }
  collectRelic(r){
    r.got=true;this.world.setRelicGot(r.def.id);this.save.relics[this.rid].push(r.def.id);
    const n=this.save.relics[this.rid].length,[t,x]=S.RELIC[this.rid]['abcdef'.indexOf(r.def.id)];
    this.audio.chime('relic');this.ui.speak('Souvenir · '+t,x,3600);this.ui.toast(`Souvenirs de la région : ${n}/6`,3000);this.updateGate();this.persist();
  }
  gateStatus(){const L=this.R.layout,sv=this.save;return {have:sv.lit[this.rid].length,need:L.steles.length,relics:sv.relics[this.rid].length,needRelics:L.gate.need.relics}}
  updateGate(silent=false){
    const st=this.gateStatus(),ok=st.have>=st.need&&st.relics>=st.needRelics;
    if(ok&&!this.world.gate.open){this.world.setGateOpen(true);this.save.gate[this.rid]=true;if(!silent){this.audio.chime('gate');this.ui.speak('',S.REGIONS[this.rid].gateOpen,4000)}}
  }
  // ------------------------------------------------------------------ puzzles à miroirs
  puzzles(){
    const W=this.world;if(!W.puzzles.length)return;
    for(const pz of W.puzzles){
      if(this.dirty||pz.hit===undefined)W.refreshBeam(pz);
    }
    this.dirty=false;
    for(const pz of W.puzzles){
      if(pz.armed&&pz.hit){const s=W.steles.find(x=>x.def.puzzle===pz.def.id);if(s&&!s.lit)this.lightStele(s,W.steles.indexOf(s))}
    }
  }
  // ------------------------------------------------------------------ transitions
  async passGate(){
    if(this.state!=='play')return;this.state='loading';this.audio.chime('gate');this.persist();
    if(this.ri>=REGION_IDS.length-1){await this.ending();return}
    this.save.pos=null;this.save.region=this.ri+1;await this.startRegion(this.ri+1);
  }
  async ending(){
    this.state='ending';this.ui.clearSpeech();this.ui.hudShow(false);await this.ui.fade(true,1600);this.audio.ending();
    this.save.done=true;this.save.pos=null;this.persist();
    const box=document.getElementById('ending-text');box.innerHTML='';document.getElementById('ending-buttons').hidden=true;document.getElementById('ending-stats').textContent='';
    this.ui.show('ending',true);await this.ui.fade(false,800);
    for(const line of S.EPILOGUE){const p=document.createElement('p');p.textContent=line;box.appendChild(p);await new Promise(r=>setTimeout(r,60));p.classList.add('on');await new Promise(r=>setTimeout(r,3600))}
    const s=this.save;document.getElementById('ending-stats').textContent=`${Math.round(s.playSec/60)} minutes · ${this.relicTotal()}/18 souvenirs · ${s.deaths} flammes éteintes`;
    document.getElementById('ending-buttons').hidden=false;
  }
  async afterEnding(menu){
    this.ui.show('ending',false);
    if(menu){this.state='menu';this.ui.show('menu',true);document.getElementById('btn-continue').hidden=false;return}
    this.save.done=false;this.save.region=2;await this.startRegion(2,{resume:false});
  }
  // ------------------------------------------------------------------ effets, HUD
  fx(dt){
    const u=this.rd.uniforms,env=this.world.env;
    u.uRain.value=env.rain?this.rainI*(this.sheltered?1:1):0;
    this.shelter+=((this.sheltered?1:0)-this.shelter)*Math.min(1,dt*5);u.uShelter.value=this.shelter;
    const v=this._v||(this._v=this.cam.cam.position.clone());v.set(this.player.x,this.player.y+1.2,this.player.z).project(this.cam.cam);u.uShelterPos.value.set(v.x*.5+.5,v.y*.5+.5);
    u.uFlash.value=this.settings.flash?this.flash:0;
  }
  hud(dt){
    const ui=this.ui,st=this.gateStatus(),L=this.R.layout;
    ui.setFlame(this.flame);
    if(!this._keys)this._keys=document.querySelector('.keys');this._keys.style.opacity=this.save.playSec<150?'':'0';
    const lines=[{html:`Stèles <b>${st.have}/${st.need}</b>`,done:st.have>=st.need},{html:`Souvenirs <b>${st.relics}/6</b> <span class="small">(${st.needRelics} requis)</span>`,done:st.relics>=st.needRelics},{html:this.world.gate.open?'Porte <b>ouverte</b>':'Porte <b>scellée</b>',done:this.world.gate.open}];
    ui.setGoals(lines);
    if(this.rid==='shore'){const lv=tideLevel(this.tideClock),dl=tideLevel(this.tideClock+1)-lv,f=(lv-TIDE.low)/(TIDE.high-TIDE.low);
      ui.setTide(f,lv<-.72?'Passage ouvert':dl>0?'Montante':'Descendante',true)}
    // flèche d'aide
    if(this.hintT>0){this.hintT-=dt;const t=this.nextTarget();if(t){const P=this.player,dx=t.x-P.x,dz=t.z-P.z,y=this.cam.yaw,a=dx*Math.cos(y)-dz*Math.sin(y),b=-dx*Math.sin(y)-dz*Math.cos(y);ui.arrow(true,Math.atan2(a,b),t.label,Math.hypot(dx,dz))}}
    else ui.arrow(false);
  }
  nextTarget(){
    const W=this.world,P=this.player,sv=this.save,R=this.R,pick=(arr,label)=>{let b=null,bd=1e9;for(const o of arr){const d=Math.hypot(o.x-P.x,o.z-P.z);if(d<bd){bd=d;b={x:o.x,z:o.z,label}}}return b};
    const needFlame=W.env.drain.dry>0||W.env.drain.wade>0;
    if(needFlame&&this.flame<35)return pick(R.layout.foyers,'Foyer');
    const unlit=W.steles.filter(s=>!s.lit);
    if(unlit.length){
      if(W.puzzles.length){
        const pts=[];for(const pz of W.puzzles){if(unlit.find(s=>s.def.puzzle===pz.def.id)){if(!pz.armed)pts.push(pz.def.src);else for(const m of pz.def.mirrors)pts.push(m)}}
        return pick(pts,'Prisme');
      }
      if(this.flame<COST.light+5)return pick(R.layout.foyers,'Foyer');
      return pick(unlit.map(s=>s.def),'Stèle');
    }
    if(sv.relics[this.rid].length<R.layout.gate.need.relics)return pick(W.relics.filter(r=>!r.got&&r.g.visible).map(r=>r.def),'Souvenir')||pick(R.layout.foyers,'Marée');
    return pick([R.layout.gate],'Porte');
  }
  // ------------------------------------------------------------------ carte, carnet
  openMap(){
    this.state='map';this.ui.show('map',true);document.getElementById('map-title').textContent=S.REGIONS[this.rid].title;
    const cv=document.getElementById('map-canvas'),g=cv.getContext('2d'),R=this.R,pal=PALETTES[this.rid],N=190,cs=cv.width/N;
    if(!this.mapBase){
      const base=document.createElement('canvas');base.width=base.height=N;const bg=base.getContext('2d'),img=bg.createImageData(N,N);
      let mn=1e9,mx=-1e9;const hs=new Float32Array(N*N);
      for(let j=0;j<N;j++)for(let i=0;i<N;i++){const h=R.height(-HALF+(i+.5)*(2*HALF/N),-HALF+(j+.5)*(2*HALF/N));hs[j*N+i]=h;mn=Math.min(mn,h);mx=Math.max(mx,h)}
      const bay=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
      for(let j=0;j<N;j++)for(let i=0;i<N;i++){const h=hs[j*N+i],wl=R.waterLevelAt(0);let c;
        if(wl!=null&&h<wl)c=pal.ramps[2][1+Math.floor(((wl-h)/3+bay[(j&3)*4+(i&3)]/16*.4)*2)%3];
        else{const t=(h-mn)/(mx-mn),l=Math.min(4,Math.floor(t*4.5+bay[(j&3)*4+(i&3)]/16-.3));c=pal.ramps[0][Math.max(0,l)+1>5?5:Math.max(0,l)+1]}
        const o=(j*N+i)*4;img.data[o]=c[0]*255;img.data[o+1]=c[1]*255;img.data[o+2]=c[2]*255;img.data[o+3]=255}
      bg.putImageData(img,0,0);this.mapBase=base;
    }
    g.imageSmoothingEnabled=false;g.fillStyle='#05090d';g.fillRect(0,0,cv.width,cv.height);
    g.drawImage(this.mapBase,0,0,cv.width,cv.height);
    const sc=cv.width/(2*HALF),px=x=>(x+HALF)*sc;
    g.fillStyle='rgba(5,9,13,.93)';
    for(let b=0;b<48;b++)for(let a=0;a<48;a++)if(!this.discovered[b*48+a])g.fillRect(a*16*sc,b*16*sc,16*sc+1,16*sc+1);
    const seen=(x,z)=>this.discovered[Math.floor((z+HALF)/16)*48+Math.floor((x+HALF)/16)];
    const W=this.world,warm='#'+pal.ramps[1][4].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join(''),pale='#'+pal.ramps[0][5].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
    for(const f of W.foyers)if(seen(f.def.x,f.def.z)){g.fillStyle=warm;g.fillRect(px(f.def.x)-3,px(f.def.z)-3,6,6)}
    for(const s of W.steles)if(seen(s.def.x,s.def.z)){g.strokeStyle=s.lit?warm:pale;g.fillStyle=warm;g.lineWidth=2;g.strokeRect(px(s.def.x)-4,px(s.def.z)-6,8,12);if(s.lit)g.fillRect(px(s.def.x)-3,px(s.def.z)-5,6,10)}
    if(seen(W.gate.def.x,W.gate.def.z)){g.strokeStyle=W.gate.open?warm:pale;g.lineWidth=3;g.strokeRect(px(W.gate.def.x)-8,px(W.gate.def.z)-8,16,16)}
    const P=this.player;g.save();g.translate(px(P.x),px(P.z));g.rotate(P.rot+Math.PI/2);g.fillStyle='#fff';g.beginPath();g.moveTo(0,-7);g.lineTo(5,6);g.lineTo(-5,6);g.fill();g.restore();
  }
  openJournal(fromPause=false){
    this.journalFromPause=fromPause;this.state='journal';this.ui.show('journal',true);
    const sv=this.save,body=document.getElementById('journal-body');let h='';
    REGION_IDS.forEach((id,ri)=>{
      h+=`<h3>${S.REGIONS[id].title}</h3>`;
      const lit=sv.lit[id],rel=sv.relics[id];
      S.STELE[id].forEach((t,i)=>{const sid='S'+(i+1);h+=lit.includes(sid)?`<p><b>Stèle ${i+1}</b>${t}</p>`:`<p class="locked"><b>Stèle ${i+1}</b>Pas encore allumée.</p>`});
      'abcdef'.split('').forEach((c,i)=>{const [t,x]=S.RELIC[id][i];h+=rel.includes(c)?`<p><b>Souvenir · ${t}</b>${x}</p>`:`<p class="locked"><b>Souvenir</b>?</p>`});
    });
    body.innerHTML=h;
  }
}

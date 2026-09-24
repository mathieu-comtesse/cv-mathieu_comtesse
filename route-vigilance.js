(()=>{
'use strict';
const $=id=>document.getElementById(id),c=$('road-canvas'),out=c.getContext('2d'),buffer=document.createElement('canvas'),g=buffer.getContext('2d'),lc=document.createElement('canvas'),lx=lc.getContext('2d'),{RoadRun,center}=window.RoadModel;
let audio=null,engine=null,muted=false,w=800,h=720,last=0,model=null,paused=false,keys={},cameraY=0,crashAge=9,finished=false,trackSeed=1783,lastCar={x:400,y:500},camX=0,seenCrashes=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,runs={};
const settings=()=>({alcohol:+$('alcohol').value,drug:$('drug').value,level:+$('drug-level').value/100,night:$('daytime')?.value==='night',duration:+($('duration')?.value??300)});
// What the settings do to the driver: reaction delay in seconds, used by the model and shown on screen.
const impair=(st={})=>{const alcohol=+st.alcohol||0,kind=st.drug||'none',drug=kind==='none'?0:+st.level||0;return {alcohol,kind,drug,delay:alcohol*.16+drug*(kind==='sedating'?.5:.2)};};
const fmtTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`,fmt=(v,n=2)=>v.toFixed(n).replace('.',',');
// French legal thresholds (g/L of blood): 0,2 for probationary licences and bus/coach drivers, 0,5 for everyone, 0,8 makes it a criminal offence.
const LEGAL=[[.8,'crime','Au-dessus de 0,8 g/L : délit. Jusqu’à 2 ans de prison, 4 500 € d’amende, 6 points retirés, suspension ou annulation du permis.'],
 [.5,'over','Au-dessus de 0,5 g/L : conduite interdite. 135 € d’amende, 6 points retirés, immobilisation possible du véhicule.'],
 [.2,'warn','Au-dessus de 0,2 g/L : interdit en permis probatoire et pour les conducteurs de bus et d’autocar.'],
 [.001,'low','Sous 0,2 g/L, les réflexes baissent déjà : le risque commence au premier verre.'],
 [0,'none','0,0 g/L : aucune consommation simulée.']];
// Widmark: grams of pure alcohol / (body mass × r), a rough estimate — never a legal measurement.
const drinks=[...document.querySelectorAll('#drinks .drink')];
function computeAlcohol(){let glasses=0,grams=0;for(const d of drinks){const n=+d.querySelector('output').textContent||0;glasses+=n;grams+=n*(+d.dataset.cl)*10*(+d.dataset.deg)/100*.8;}
 const weight=+($('weight')?.value||75),r=$('sex')?.value==='f'?.55:.68,bac=weight>0?grams/(weight*r):0,[,level,verdict]=LEGAL.find(([v])=>bac>=v)||LEGAL[4];
 if($('alcohol'))$('alcohol').value=bac.toFixed(2);
 if($('alcohol-readout'))$('alcohol-readout').textContent=`${glasses} verre${glasses>1?'s':''} · ${Math.round(grams)} g d’alcool pur · ${fmt(bac)} g/L`;
 if($('bac-fill'))$('bac-fill').style.width=Math.min(100,bac/2*100)+'%';
 if($('bac'))$('bac').dataset.level=level;
 // Elimination runs at roughly 0,10 to 0,15 g/L per hour, whatever one drinks or eats afterwards.
 if($('bac-verdict'))$('bac-verdict').textContent=verdict+(bac>0?` Retour à 0 g/L : ${Math.max(1,Math.round(bac/.15))} à ${Math.max(1,Math.round(bac/.1))} h environ ; ni café ni douche n’accélèrent l’élimination.`:'');
 if($('weight-value'))$('weight-value').value=weight+' kg';}
function refresh(){if(model?.running)model.settings=settings();}
for(const d of drinks)for(const b of d.querySelectorAll('button'))b.onclick=()=>{const o=d.querySelector('output');o.textContent=Math.max(0,Math.min(20,(+o.textContent||0)+ +b.dataset.step));computeAlcohol();refresh();};
function controls(){$('drug-value').value=$('drug-level').value+' / 100';computeAlcohol();refresh();}
['drug','drug-level','weight','sex','daytime','duration'].forEach(id=>{const e=$(id);if(e)e.oninput=e.onchange=controls;});controls();
// --- Sound -----------------------------------------------------------------
// A four-cylinder four-stroke fires twice per revolution, so what the ear hears is the rev counter, not the
// speedometer: the note climbs inside each gear and drops on the shift. Everything else is filtered noise —
// induction, tyres, gravel, brake pads, rubber — because that is what those things actually are.
const GEARS=[42,76,112,150,188,226];
function noiseBuffer(seconds,brown){const buf=audio.createBuffer(1,audio.sampleRate*seconds,audio.sampleRate),a=buf.getChannelData(0);let b=0;
 for(let i=0;i<a.length;i++){const w=Math.random()*2-1;if(brown){b=(b+w*.045)/1.02;a[i]=b*3.2;}else a[i]=w;}return buf;}
function noiseChain(buf,type,freq,Q,dest){const src=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();
 src.buffer=buf;src.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=Q;g.gain.value=0;src.connect(f).connect(g).connect(dest);src.start();return {f,g};}
function initAudio(){if(audio||muted)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audio=new C();
 const master=audio.createGain();master.gain.value=.85;master.connect(audio.destination);
 // The firing pulse: a harmonic series weighted so the low orders dominate and the upper ones rasp.
 const N=28,re=new Float32Array(N),im=new Float32Array(N);
 for(let n=1;n<N;n++){const w=1/Math.pow(n,.92);re[n]=w*Math.cos(n*1.9)*(n%2?1:.55);im[n]=w*Math.sin(n*.7);}
 const wave=audio.createPeriodicWave(re,im),osc=audio.createOscillator();osc.setPeriodicWave(wave);
 const sub=audio.createOscillator();sub.type='triangle';
 const oscG=audio.createGain(),subG=audio.createGain(),body=audio.createBiquadFilter();
 oscG.gain.value=0;subG.gain.value=0;body.type='lowpass';body.frequency.value=600;body.Q.value=4.5;
 osc.connect(oscG).connect(body).connect(master);sub.connect(subG).connect(body);osc.start();sub.start();
 const white=noiseBuffer(2,false),brown=noiseBuffer(2,true);
 const ind=noiseChain(brown,'bandpass',400,1.1,master),  // induction roar, opens with the throttle
  road=noiseChain(brown,'lowpass',500,.7,master),        // tyres and wind: the sense of speed
  grav=noiseChain(white,'bandpass',260,.6,master),       // the verge under the wheels
  brk=noiseChain(white,'bandpass',1600,1.4,master),      // pad against disc
  squeal=noiseChain(white,'bandpass',1100,24,master);    // rubber letting go
 engine={osc,sub,oscG,subG,body,ind,road,grav,brk,squeal,master,gear:0,shift:-9};}
function engineSound(r){if(!engine||muted)return;const t=audio.currentTime,live=r.running&&!paused;
 const sp=Math.abs(r.speed||0),th=r.throttle||0,bf=r.brakeForce||0;
 let g=0;while(g<GEARS.length-1&&sp>GEARS[g])g++;
 const lo=g?GEARS[g-1]:0,frac=Math.min(1.1,(sp-lo)/Math.max(1,GEARS[g]-lo)),rpm=820+frac*5500+th*420,f=rpm/30;
 if(g!==engine.gear){engine.gear=g;engine.shift=t;}
 const shifting=t-engine.shift<.16,load=Math.min(1,th*.85+frac*.25);
 engine.osc.frequency.setTargetAtTime(f,t,.04);engine.sub.frequency.setTargetAtTime(f/2,t,.04);
 engine.oscG.gain.setTargetAtTime(live?(shifting?.018:.045+load*.105):0,t,.04);
 engine.subG.gain.setTargetAtTime(live?(.03+(1-frac)*.035)*(shifting?.35:1):0,t,.05);
 engine.body.frequency.setTargetAtTime(300+load*1450+f*3.2,t,.05);
 engine.ind.f.frequency.setTargetAtTime(230+f*6,t,.05);
 engine.ind.g.gain.setTargetAtTime(live?(shifting?.008:.015+th*.07):0,t,.04);
 engine.road.g.gain.setTargetAtTime(live?Math.min(.12,sp*sp*.0000082):0,t,.1);
 engine.road.f.frequency.setTargetAtTime(280+sp*11,t,.12);
 engine.grav.g.gain.setTargetAtTime(live&&r.offroadNow?Math.min(.19,.03+sp*.0021):0,t,.05);
 engine.brk.g.gain.setTargetAtTime(live?bf*Math.min(1,sp/45)*.09:0,t,.03);
 engine.brk.f.frequency.setTargetAtTime(1450+sp*9,t,.08);
 const bite=live&&bf>.6&&sp>36?Math.min(1,(bf-.6)/.28)*Math.min(1,(sp-36)/45):0;
 engine.squeal.g.gain.setTargetAtTime(bite*.13,t,.04);
 engine.squeal.f.frequency.setTargetAtTime(1020+bite*280+Math.sin(t*9)*60,t,.04);}
function crashSound(){if(!audio||muted)return;const t=audio.currentTime,out=engine?engine.master:audio.destination;
 if(engine){engine.oscG.gain.setTargetAtTime(0,t,.05);engine.road.g.gain.setTargetAtTime(0,t,.08);engine.squeal.g.gain.setTargetAtTime(0,t,.03);}
 const thud=audio.createOscillator(),tg=audio.createGain();thud.type='sine';           // the body hitting
 thud.frequency.setValueAtTime(90,t);thud.frequency.exponentialRampToValueAtTime(32,t+.35);
 tg.gain.setValueAtTime(.9,t);tg.gain.exponentialRampToValueAtTime(.001,t+.45);thud.connect(tg).connect(out);thud.start(t);thud.stop(t+.5);
 const crunch=audio.createBufferSource(),cf=audio.createBiquadFilter(),cg=audio.createGain();  // folding metal
 crunch.buffer=noiseBuffer(.7,false);cf.type='bandpass';cf.frequency.setValueAtTime(900,t);cf.frequency.exponentialRampToValueAtTime(260,t+.5);cf.Q.value=.8;
 cg.gain.setValueAtTime(.75,t);cg.gain.exponentialRampToValueAtTime(.001,t+.55);crunch.connect(cf).connect(cg).connect(out);crunch.start(t);
 for(let i=0;i<5;i++){const s2=audio.createBufferSource(),hf=audio.createBiquadFilter(),hg=audio.createGain(),at=t+.03+i*.055+Math.random()*.05;
  s2.buffer=noiseBuffer(.12,false);hf.type='highpass';hf.frequency.value=2600+Math.random()*2200;   // glass
  hg.gain.setValueAtTime(.22,at);hg.gain.exponentialRampToValueAtTime(.001,at+.16);s2.connect(hf).connect(hg).connect(out);s2.start(at);}}
function begin(){initAudio();model=new RoadRun(trackSeed,settings());c.model=model;paused=false;keys={};finished=false;crashAge=9;seenCrashes=0;camX=0;cameraY=h*.74;$('road-start').textContent='Mettre en pause';$('road-results').replaceChildren();$('road-status').textContent=model.message;c.focus({preventScroll:true});}
const PREVENTION='Après avoir bu, ne pas prendre le volant : laisser conduire une personne qui n’a pas bu, prendre un taxi ou les transports, ou dormir sur place. Et proposer la même chose à un proche qui a bu.';
// Each course keeps its last sober run and its last impaired run, so the two can be read side by side.
function finish(){finished=true;const r=model;keys={};const im=impair(r.settings),sober=!im.alcohol&&!im.drug;
 const rec={...im,distance:Math.round(r.distance),violations:r.violations,offroad:Math.round(r.offroad),crashed:r.crashed,accidents:r.collisions,victims:r.victims,damage:Math.round(r.damage),why:r.crashed?'Véhicule hors d’usage':r.collisions?'Arrivée, abîmée':'Arrivée'};
 const slot=runs[trackSeed]??={};slot[sober?'sober':'impaired']=rec;
 let html=`<p><strong>${r.crashed?'Véhicule hors d’usage — fin du trajet.':'Trajet terminé.'}</strong> ${rec.distance} m · ${rec.accidents} accident(s) · ${rec.violations} infraction(s) · ${rec.offroad} s hors chaussée · dégâts ${rec.damage} %.</p>`;
 if(rec.victims)html+=`<p class="prevention"><strong>${rec.victims} piéton(s) ou cycliste(s) percuté(s).</strong> Sans carrosserie, ils encaissent seuls le choc : au-delà de 30 km/h, les blessures deviennent vite graves ou mortelles.</p>`;
 if(!sober)html+=`<p>Réaction allongée de ${Math.round(im.delay*1000)} ms : à 50 km/h, ${fmt(50/3.6*im.delay,1)} m de plus parcourus avant le début du freinage.</p>`;
 const a=slot.sober,b=slot.impaired;
 if(a&&b){const col=b.alcohol?`${fmt(b.alcohol)} g/L${b.drug?' + psychoactif':''}`:'Psychoactif';const row=(t,f)=>`<tr><th>${t}</th><td>${f(a)}</td><td>${f(b)}</td></tr>`;
  html+=`<table class="run-compare"><thead><tr><th>Même parcours</th><th>À jeun</th><th>${col}</th></tr></thead><tbody>${row('Issue',x=>x.why)}${row('Accidents',x=>x.accidents)}${row('Victimes',x=>x.victims)}${row('Distance',x=>x.distance+' m')}${row('Infractions',x=>x.violations)}${row('Hors chaussée',x=>x.offroad+' s')}</tbody></table>`;}
 else html+=sober?'<p>Référence à jeun enregistrée. Ajouter des verres puis recommencer le même parcours pour comparer.</p>':'<p>« Comparer à jeun » relance ce même parcours sans substance pour mesurer l’écart.</p>';
 $('road-results').innerHTML=html+`<p class="prevention">${PREVENTION}</p>`;$('road-start').textContent='Recommencer';}
$('road-start').onclick=()=>{if(!model||!model.running)begin();else{paused=!paused;keys={};$('road-start').textContent=paused?'Reprendre':'Mettre en pause';}};
$('road-random').onclick=()=>{trackSeed=Math.floor(Math.random()*4294967295);begin();};
$('road-sound').onclick=e=>{muted=!muted;e.target.textContent=muted?'Son : non':'Son : oui';e.target.setAttribute('aria-pressed',!muted);if(!muted){initAudio();audio.resume();}};
$('road-night')&&($('road-night').onclick=()=>toggleNight());
function toggleNight(){const d=$('daytime');if(!d)return;d.value=d.value==='night'?'day':'night';controls();const b=$('road-night');if(b){b.textContent=d.value==='night'?'Nuit : oui':'Nuit : non';b.setAttribute('aria-pressed',d.value==='night');}}
$('road-sober').onclick=()=>{for(const d of drinks)d.querySelector('output').textContent='0';$('drug').value='none';$('drug-level').value=0;controls();begin();};
const keyOf=e=>({ShiftLeft:'gas',ControlLeft:'brake',KeyW:'up',KeyZ:'up',KeyA:'left',KeyQ:'left',KeyS:'brake',KeyD:'right',ArrowUp:'gas',ArrowDown:'brake',ArrowLeft:'left',ArrowRight:'right',Space:'brake'}[e.code]);
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.code==='KeyN'&&!e.repeat){toggleNight();return;}const key=keyOf(e);if(key){e.preventDefault();keys[key]=true;}});
window.addEventListener('keyup',e=>{keys[keyOf(e)]=false;});window.addEventListener('blur',()=>{keys={};if(model?.running){paused=true;$('road-start').textContent='Reprendre';}});
for(const b of document.querySelectorAll('[data-drive]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.drive]=true;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{keys[b.dataset.drive]=false;};}
function resize(){const r=c.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio,1.75);for(const k of [c,buffer,lc]){k.width=w*d;k.height=h*d;}g.setTransform(d,0,0,d,0,0);out.setTransform(d,0,0,d,0,0);lx.setTransform(d,0,0,d,0,0);}new ResizeObserver(resize).observe(c);resize();
// --- Drawing ---------------------------------------------------------------
// Ten pixels per metre at full scale: a 48-unit sedan is about five metres long.
const zoom=()=>1-Math.min(1,Math.abs(model?.speed||0)/220)*.48,scale=()=>Math.min(1.5,w/390)*zoom(),ppm=()=>9*scale();
const roadX=d=>w/2+(center(d)-center(model?.distance||0)-camX)*scale();
const py=d=>cameraY-(d-(model?.distance||0))*ppm();
const TAU=Math.PI*2,hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function shade(hex,f){const n=parseInt(hex.slice(1,7),16),m=f<0?0:255,a=Math.abs(f),ch=s=>Math.round(((n>>s)&255)*(1-a)+m*a);return `rgb(${ch(16)},${ch(8)},${ch(0)})`;}
function gradient(k,type,args,stops){const gr=type==='r'?k.createRadialGradient(...args):k.createLinearGradient(...args);if(!gr?.addColorStop)return stops[0][1];for(const [o,col] of stops)gr.addColorStop(o,col);return gr;}
// Ground textures are painted once, then laid as patterns pinned to the road so they scroll with it.
function tile(size,paint){const t=document.createElement('canvas');t.width=t.height=size;const k=t.getContext('2d');if(k)paint(k,size);return t;}
function speckle(k,s,n,colors,rmax,seed){for(let i=0;i<n;i++){k.fillStyle=colors[i%colors.length];const r=.6+hash(seed+i*3.1)*rmax;k.fillRect(hash(seed+i)*s,hash(seed+i*1.7+9)*s,r,r);}}
const tiles={
 grass:tile(192,(k,s)=>{k.fillStyle='#a3cf88';k.fillRect(0,0,s,s);speckle(k,s,1100,['#8fbf76','#b3d997','#98c77e','#c2e0a3','#86b86e'],2.2,1);k.strokeStyle='#76a45e66';k.lineWidth=1;for(let i=0;i<70;i++){const x=hash(i*5.3)*s,y=hash(i*7.1)*s;k.beginPath();k.moveTo(x,y);k.lineTo(x+1.5,y-4);k.stroke();}}),
 asphalt:tile(128,(k,s)=>{k.fillStyle='#3d4653';k.fillRect(0,0,s,s);speckle(k,s,1600,['#353d49','#48525f','#2f3743','#525c6a'],1.5,50);}),
 gravel:tile(96,(k,s)=>{k.fillStyle='#cfc7b4';k.fillRect(0,0,s,s);speckle(k,s,800,['#b9b09c','#ddd6c6','#a89f8b','#e6e0d2'],2.2,90);})
};
let patterns=null;
function pattern(name,fallback){if(!patterns){patterns={};for(const k in tiles)patterns[k]=g.createPattern(tiles[k],'repeat');}
 const p=patterns[name];if(!p?.setTransform||typeof DOMMatrix==='undefined')return fallback;
 const s=scale()*.5;p.setTransform(new DOMMatrix([s,0,0,s,w/2-(center(model?.distance||0)+camX)*scale(),py(0)]));return p;}
function pathRoad(offset){g.beginPath();for(let y=-20;y<=h+20;y+=8){const d=(model?.distance||0)+(cameraY-y)/ppm();const x=roadX(d)+offset*scale();y===-20?g.moveTo(x,y):g.lineTo(x,y);}g.stroke();}
// Light sources collected while drawing, used by the night pass: beams cut the darkness, glows add up on top.
const lights=[],glows=[];let night=false,glare=1;
function glow(x,y,r,rgb,a=1){if(night)glows.push({x,y,r,rgb,a});}
function vehicle(x,y,o,angle=0,damaged=false){
 const W=o.width||20,L=o.length||48,kind=o.kind||'sedan',s=scale(),col=o.color||'#f4f8fb',cos=Math.cos(angle),sin=Math.sin(angle);
 const at=(px,py2)=>[x+(px*cos-py2*sin)*s,y+(px*sin+py2*cos)*s];
 if(night&&!o.player&&!o.wreck){const [fx,fy]=at(0,-L/2);lights.push({x:fx,y:fy,a:angle,len:24*ppm(),spread:.34,k:.75});
  for(const side of [-1,1]){const [hx,hy]=at(side*(W/2-3),-L/2),[tx,ty]=at(side*(W/2-3),L/2);glow(hx,hy,(o.velocity<0?11*glare:7)*s,'255,244,214',o.velocity<0?.95:.7);glow(tx,ty,5*s,'255,40,50',.8);}}
 // Soft contact shadow, cast down and to the right whatever the heading.
 g.save();g.translate(x+3*s,y+4*s);g.rotate(angle);g.scale(s,s);g.fillStyle='rgba(14,20,30,.24)';g.beginPath();g.roundRect(-W/2-1,-L/2,W+2,L+2,6);g.fill();g.restore();
 g.save();g.translate(x,y);g.rotate(angle);g.scale(s,s);
 g.fillStyle='#161a20';const axles=kind==='truck'?[-L/2+9,L/2-18,L/2-8]:[-L/2+(kind==='city'?8:10),L/2-(kind==='city'?8:10)];
 for(const ay of axles)for(const side of [-1,1])g.fillRect(side*W/2-1.8,ay-4,3.6,8);
 const body=(x0,y0,bw,bl,r,c)=>{g.fillStyle=gradient(g,'l',[x0,0,x0+bw,0],[[0,shade(c,-.28)],[.22,shade(c,.1)],[.5,c],[.82,shade(c,-.06)],[1,shade(c,-.32)]]);g.beginPath();g.roundRect(x0,y0,bw,bl,r);g.fill();};
 const glass=(y0,y1,wTop,wBot)=>{g.fillStyle=gradient(g,'l',[0,y0,0,y1],[[0,'#23384a'],[1,'#44607a']]);g.beginPath();g.moveTo(-wTop/2,y0);g.lineTo(wTop/2,y0);g.lineTo(wBot/2,y1);g.lineTo(-wBot/2,y1);g.closePath();g.fill();};
 if(kind==='truck'){const cab=L*.24;body(-W/2,-L/2,W,cab,3,col);glass(-L/2+3,-L/2+9,W-5,W-4);g.fillStyle=shade(col,.14);g.fillRect(-W/2+2.5,-L/2+10,W-5,cab-12);
  g.fillStyle='#20252c';g.fillRect(-W/2+3,-L/2+cab,W-6,2.5);body(-W/2,-L/2+cab+2.5,W,L-cab-2.5,2,'#e3e8ec');
  g.strokeStyle='rgba(40,50,60,.18)';g.lineWidth=.6;for(let yy=-L/2+cab+7;yy<L/2-2;yy+=5){g.beginPath();g.moveTo(-W/2+1.5,yy);g.lineTo(W/2-1.5,yy);g.stroke();}
  g.fillStyle=col;g.fillRect(-W/2,-L/2+cab+2.5,1.6,L-cab-2.5);g.fillRect(W/2-1.6,-L/2+cab+2.5,1.6,L-cab-2.5);}
 else if(kind==='van'){body(-W/2,-L/2,W,L,4,col);glass(-L/2+5,-L/2+13,W-6,W-4);g.fillStyle=shade(col,.12);g.beginPath();g.roundRect(-W/2+2.5,-L/2+14,W-5,L-17,2);g.fill();
  g.strokeStyle=shade(col,-.12);g.lineWidth=.7;for(let yy=-L/2+19;yy<L/2-4;yy+=5){g.beginPath();g.moveTo(-W/2+3.5,yy);g.lineTo(W/2-3.5,yy);g.stroke();}}
 else{const city=kind==='city',ws=city?.2:.25,rf=city?.36:.4,rr=city?.74:.69,re=city?.84:.8;body(-W/2,-L/2,W,L,city?7:6,col);
  g.strokeStyle=shade(col,-.14);g.lineWidth=.6;g.beginPath();g.moveTo(-W/4,-L/2+3);g.lineTo(-W/5,-L/2+L*ws);g.moveTo(W/4,-L/2+3);g.lineTo(W/5,-L/2+L*ws);g.stroke();
  glass(-L/2+L*ws,-L/2+L*rf,W-4,W-6.5);g.fillStyle=shade(col,.1);g.beginPath();g.roundRect(-W/2+3.2,-L/2+L*rf,W-6.4,L*(rr-rf),3);g.fill();
  glass(-L/2+L*re,-L/2+L*rr,W-5,W-6.5);g.fillStyle='#2b3f52';g.fillRect(-W/2+1,-L/2+L*ws+2,1.6,L*(rr-ws)-2);g.fillRect(W/2-2.6,-L/2+L*ws+2,1.6,L*(rr-ws)-2);
  g.fillStyle=shade(col,-.2);for(const side of [-1,1]){g.beginPath();g.ellipse(side*(W/2+1.3),-L/2+L*ws+1,1.8,1.1,0,0,TAU);g.fill();}}
 g.fillStyle='#fff4cf';for(const side of [-1,1]){g.beginPath();g.roundRect(side>0?W/2-6:-W/2+1.2,-L/2+.6,4.8,2.4,1);g.fill();}
 g.fillStyle=o.braking?'#ff2b36':'#a8232f';for(const side of [-1,1])g.fillRect(side>0?W/2-6:-W/2+1.2,L/2-2.6,4.8,2.2);
 if(o.braking&&!night){g.fillStyle='rgba(255,40,50,.28)';for(const side of [-1,1]){g.beginPath();g.arc(side*(W/2-3.5),L/2+1,5,0,TAU);g.fill();}}
 if(damaged){g.fillStyle='#262b33';g.beginPath();g.moveTo(-W/2,-L/2+2);g.lineTo(-W/4,-L/2+9);g.lineTo(0,-L/2+5);g.lineTo(W/4,-L/2+11);g.lineTo(W/2,-L/2+3);g.lineTo(W/2,-L/2);g.lineTo(-W/2,-L/2);g.fill();
  g.strokeStyle='#e8f1f6';g.lineWidth=.6;g.beginPath();for(let i=0;i<6;i++){g.moveTo(-1,-L/2+L*.32);g.lineTo(Math.cos(i*1.1)*7,-L/2+L*.32+Math.sin(i*1.1)*4);}g.stroke();}
 g.restore();
 if(night&&o.braking)for(const side of [-1,1]){const [tx,ty]=at(side*(W/2-3),L/2);glow(tx,ty,9*s,'255,30,40',.9);}}
function pedestrian(x,y,facing,t,tone){const s=scale()*1.4,stride=Math.sin(t*7.5)*3;g.save();g.translate(x,y);g.scale(s,s);
 g.fillStyle='rgba(14,20,30,.25)';g.beginPath();g.ellipse(2.2,3,6.5,4.2,0,0,TAU);g.fill();g.rotate(facing);
 g.fillStyle='#2e3542';for(const side of [-1,1]){g.beginPath();g.ellipse(side*2.1,side*stride,1.6,2.8,0,0,TAU);g.fill();}
 g.fillStyle='#e7b596';for(const side of [-1,1]){g.beginPath();g.arc(side*5.6,-side*stride*.8,1.4,0,TAU);g.fill();}
 g.fillStyle=tone;g.beginPath();g.ellipse(0,0,5.6,3.3,0,0,TAU);g.fill();g.fillStyle='#3b2b22';g.beginPath();g.arc(0,-.3,2.6,0,TAU);g.fill();g.restore();}
// Cyclist seen from above: two thin tyres, frame, rider leaning on the bars, helmet, knees pumping.
function cyclist(x,y,angle,t,tone){const s=scale()*1.3,pedal=Math.sin(t*9)*2.6;g.save();g.translate(x+2.5*s,y+3.5*s);g.rotate(angle);g.scale(s,s);g.fillStyle='rgba(14,20,30,.22)';g.beginPath();g.roundRect(-3.5,-10,7,20,3);g.fill();g.restore();
 g.save();g.translate(x,y);g.rotate(angle);g.scale(s,s);g.fillStyle='#1b1f25';g.fillRect(-.9,-10,1.8,6.5);g.fillRect(-.9,3.5,1.8,6.5);g.fillStyle='#8a939c';g.fillRect(-.5,-4,1,8);g.fillStyle='#2b3038';g.fillRect(-4.2,-6.2,8.4,1.2);
 g.fillStyle='#2e3542';g.beginPath();g.ellipse(-2,1+pedal,1.4,2.4,0,0,TAU);g.ellipse(2,1-pedal,1.4,2.4,0,0,TAU);g.fill();
 g.fillStyle='#e7b596';g.beginPath();g.arc(-3.8,-5.6,1.1,0,TAU);g.arc(3.8,-5.6,1.1,0,TAU);g.fill();g.strokeStyle=tone;g.lineWidth=1.6;g.beginPath();g.moveTo(-3.8,-5.2);g.lineTo(-3.2,-1);g.moveTo(3.8,-5.2);g.lineTo(3.2,-1);g.stroke();
 g.fillStyle=tone;g.beginPath();g.ellipse(0,0,4.2,3,0,0,TAU);g.fill();g.fillStyle=shade(tone,.35);g.beginPath();g.ellipse(0,-2.6,2.3,2.7,0,0,TAU);g.fill();g.fillStyle='#1f2a36';g.fillRect(-.4,-4.8,.8,4);g.restore();}
// Someone knocked down: lying still, with a warning triangle; no gore, the scene speaks for itself.
function casualty(x,y,tone,bike=false){const s=scale()*1.3;g.save();g.translate(x,y);g.scale(s,s);
 if(bike){g.save();g.translate(-9,4);g.rotate(1.2);g.fillStyle='#1b1f25';g.fillRect(-.9,-10,1.8,20);g.fillStyle='#8a939c';g.fillRect(-4,-1,8,1.2);g.restore();}
 g.rotate(.9);g.fillStyle='rgba(14,20,30,.25)';g.beginPath();g.ellipse(1.5,2,5,9,0,0,TAU);g.fill();g.fillStyle='#2e3542';g.beginPath();g.ellipse(-1.6,5,1.5,3.4,.15,0,TAU);g.ellipse(1.8,5.2,1.5,3.4,-.2,0,TAU);g.fill();
 g.fillStyle=tone;g.beginPath();g.ellipse(0,-1,3.6,4.8,0,0,TAU);g.fill();g.fillStyle='#e7b596';g.beginPath();g.arc(-4.6,-3,1.2,0,TAU);g.arc(4.2,.5,1.2,0,TAU);g.fill();g.fillStyle='#3b2b22';g.beginPath();g.arc(0,-7.4,2.5,0,TAU);g.fill();g.restore();
 g.save();g.translate(x,y-26*s);g.scale(s,s);g.fillStyle='#d8262f';g.beginPath();g.moveTo(0,-6);g.lineTo(6,4.5);g.lineTo(-6,4.5);g.closePath();g.fill();g.fillStyle='#fff';g.beginPath();g.moveTo(0,-2.6);g.lineTo(3.2,2.6);g.lineTo(-3.2,2.6);g.closePath();g.fill();g.restore();
 glow(x,y-26*s,10*s,'255,60,60',.6);}
function tree(o,x,y,k){g.save();g.translate(x,y);g.scale(k,k);
 g.fillStyle='rgba(22,44,28,.26)';g.beginPath();g.ellipse(8,10,17,13,.5,0,TAU);g.fill();
 if(o.kind===1){for(const [r,c] of [[17,'#2c6448'],[12,'#3a7a58'],[7,'#4f936b']]){g.fillStyle=c;g.beginPath();for(let i=0;i<18;i++){const a=i/18*TAU+o.tone,rr=i%2?r*.62:r;i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();}}
 else{const base=o.kind===2?['#79ad63','#8bbb6b','#6ea15b'][o.tone]:['#4b8f5c','#5a9e62','#3f7d56'][o.tone],blobs=[[0,0,14],[8,-6,10],[-8,4,10],[6,7,9],[-6,-8,9]];
  g.fillStyle=shade(base,-.2);for(const [bx,by,r] of blobs){g.beginPath();g.arc(bx+1.5,by+1.5,r,0,TAU);g.fill();}
  g.fillStyle=base;for(const [bx,by,r] of blobs){g.beginPath();g.arc(bx,by,r,0,TAU);g.fill();}
  g.fillStyle=shade(base,.2);for(const [bx,by,r] of blobs){g.beginPath();g.arc(bx-r*.3,by-r*.3,r*.5,0,TAU);g.fill();}}
 g.restore();}
function sceneryItem(o){const y=py(o.d),x=roadX(o.d)+o.x*scale(),k=o.scale*scale();
 if(o.kind<3)return tree(o,x,y,k);
 g.save();g.translate(x,y);g.scale(k,k);
 if(o.kind===3){const roof=['#b85c43','#66707c','#c98b5a'][o.tone];g.fillStyle='#b6d99a';g.fillRect(-31,-39,62,78);g.strokeStyle='#6f9f5a';g.lineWidth=2.5;g.setLineDash([2,2.5]);g.strokeRect(-31,-39,62,78);g.setLineDash([]);
  g.fillStyle='rgba(22,30,34,.3)';g.fillRect(-18,-26,46,62);g.fillStyle=shade(roof,.14);g.fillRect(-23,-31,23,62);g.fillStyle=shade(roof,-.18);g.fillRect(0,-31,23,62);
  g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=.8;for(let yy=-27;yy<31;yy+=4){g.beginPath();g.moveTo(-23,yy);g.lineTo(23,yy);g.stroke();}
  g.fillStyle=shade(roof,.3);g.fillRect(-1,-31,2,62);g.fillStyle='#8a7d72';g.fillRect(7,-18,6,6);g.fillStyle='#4b433d';g.fillRect(8.5,-16.5,3,3);
  if(night)glow(x-24*k*Math.sign(o.x),y+20*k,10*k,'255,190,110',.7);}
 else if(o.kind===4){g.fillStyle='rgba(22,44,28,.18)';g.fillRect(-18,-12,42,30);g.fillStyle=['#d3c17a','#c7b56e','#bcc98a'][o.tone];g.fillRect(-20,-14,40,28);g.strokeStyle='rgba(120,100,50,.35)';g.lineWidth=1;for(let xx=-17;xx<20;xx+=4){g.beginPath();g.moveTo(xx,-14);g.lineTo(xx,14);g.stroke();}}
 else{for(let i=-2;i<=2;i++){g.fillStyle='rgba(22,44,28,.22)';g.beginPath();g.arc(i*7+2,3,6,0,TAU);g.fill();}for(let i=-2;i<=2;i++){g.fillStyle=i%2?'#5f9a5c':'#548f55';g.beginPath();g.arc(i*7,0,5.5+hash(o.d+i)*1.5,0,TAU);g.fill();}}
 g.restore();}
// Beyond the ditch: fields and hedgerows, drawn only for the eye — the ditch ends a run long before them.
function countryside(r){const s=scale(),span=46,m=ppm(),cols=['#d6c479','#a8cf86','#c4b47c','#9ac47e','#cdbf8f'];
 for(let d=Math.floor((r.distance-(h-cameraY)/m-span)/span)*span;d<r.distance+cameraY/m+span;d+=span)for(const side of [-1,1]){
  const id=Math.round(d/span)*2+(side>0?1:0),kind=Math.floor(hash(id)*5),y0=py(d+span),y1=py(d),edge=roadX(d+span/2)+side*272*s,xa=side>0?edge:-20,xb=side>0?w+20:edge;
  if(xb<=xa)continue;g.fillStyle=cols[kind];g.fillRect(xa,y0,xb-xa,y1-y0);g.strokeStyle=shade(cols[kind],-.13);g.lineWidth=1.1*s;g.beginPath();
  if(kind===0||kind===2)for(let xx=xa+3*s;xx<xb;xx+=6*s){g.moveTo(xx,y0);g.lineTo(xx,y1);}else if(kind===4)for(let yy=y0+3*s;yy<y1;yy+=5*s){g.moveTo(xa,yy);g.lineTo(xb,yy);}g.stroke();
  g.fillStyle='#4f8a55';for(let xx=xa;xx<xb;xx+=6*s){g.beginPath();g.arc(xx,y1,(3+hash(xx*.13+id)*1.8)*s,0,TAU);g.fill();}}}
function road(r){const s=scale(),m=ppm();
 g.strokeStyle=pattern('gravel','#d3cbb8');g.lineWidth=292*s;pathRoad(0);
 g.strokeStyle='rgba(30,34,40,.35)';g.lineWidth=232*s;pathRoad(0);g.strokeStyle=pattern('asphalt','#3d4653');g.lineWidth=226*s;pathRoad(0);
 // Tyre wear darkens the wheel tracks, the lane centres stay a shade lighter.
 g.strokeStyle='rgba(16,20,26,.17)';g.lineWidth=8*s;for(const l of [-84,-66,-34,-16,16,34,66,84])pathRoad(l);
 g.strokeStyle='rgba(255,255,255,.04)';g.lineWidth=10*s;for(const l of [-75,-25,25,75])pathRoad(l);
 // French markings, dashes pinned to the ground: continuous centre line, T1 lane dashes (3 m / 10 m), T2 edge lines (3 m / 3,5 m).
 const off=-(r.distance*m+cameraY+20),line=(lane,width,dash)=>{g.lineWidth=width*s;g.setLineDash(dash?dash.map(v=>v*m):[]);g.lineDashOffset=off;pathRoad(lane);};
 g.strokeStyle='#eef1f2';line(-3.5,1.4);line(3.5,1.4);line(-50,1.3,[3,10]);line(50,1.3,[3,10]);line(-105,2.2,[3,3.5]);line(105,2.2,[3,3.5]);g.setLineDash([]);
 // Roadside delineators every 10 m; their streak grows with speed.
 const smear=Math.min(22,r.speed*.18)*s;
 for(let d=Math.ceil((r.distance-(h-cameraY)/m-12)/10)*10;d<r.distance+cameraY/m+12;d+=10){const y=py(d),gap=d-r.distance;for(const side of [-1,1]){const x=roadX(d)+side*124*s;
  g.fillStyle='rgba(20,24,30,.25)';g.fillRect(x,y+1.5*s,3.5*s,3*s);if(smear>1&&!reduced){g.fillStyle='rgba(240,244,246,.3)';g.fillRect(x-1.5*s,y,3*s,smear);}
  g.fillStyle='#f4f6f7';g.fillRect(x-1.5*s,y-1.5*s,3*s,3*s);g.fillStyle='#1d232b';g.fillRect(x-1.5*s,y-.3*s,3*s,.9*s);
  if(gap>0&&gap<45)glow(x,y,4*s,side>0?'255,176,70':'255,255,255',1-gap/45);}}}
function junctionGround(o){const y=py(o.d),s=scale(),x=roadX(o.d),hw=34*s;
 g.fillStyle=pattern('gravel','#d3cbb8');g.fillRect(-20,y-hw-9*s,w+40,2*hw+18*s);g.fillStyle=pattern('asphalt','#3d4653');g.fillRect(-20,y-hw,w+40,2*hw);
 g.strokeStyle='#eef1f2';g.lineWidth=1.3*s;g.setLineDash([3*ppm(),10*ppm()]);g.beginPath();g.moveTo(-20,y);g.lineTo(x-113*s,y);g.moveTo(x+113*s,y);g.lineTo(w+20,y);g.stroke();g.setLineDash([]);
 g.lineWidth=2*s;g.beginPath();for(const e of [-hw+2*s,hw-2*s]){g.moveTo(-20,y+e);g.lineTo(x-146*s,y+e);g.moveTo(x+146*s,y+e);g.lineTo(w+20,y+e);}g.stroke();
 if(night)for(const side of [-1,1])lights.push({x:x+side*150*s,y:y+side*hw,pool:120*s,k:.8});}
function junctionTop(o){const y=py(o.d),x=roadX(o.d),s=scale(),hw=34*s;
 g.fillStyle=pattern('asphalt','#3d4653');g.fillRect(x-113*s,y-hw,226*s,hw*2);
 if(o.rule!=='yield'){const t=(o.rule==='stop'?5:3.5)*s;g.fillStyle='#eef1f2';g.fillRect(x+4*s,y+hw+3*s,101*s,t);g.fillRect(x-105*s,y-hw-3*s-t,101*s,t);}
 if(o.rule==='stop'){g.save();g.fillStyle='#eef1f2';g.font=`bold ${15*s}px sans-serif`;g.textAlign='center';g.fillText('STOP',x+55*s,y+hw+32*s);g.restore();}}
function trafficLight(x,y,state){const s=scale();g.fillStyle='rgba(14,20,30,.3)';g.fillRect(x+2*s,y-9*s,9*s,24*s);g.fillStyle='#1b2129';g.beginPath();g.roundRect(x-4.5*s,y-11*s,9*s,24*s,2*s);g.fill();
 const on={red:0,amber:1,green:2}[state],cols=['#ff3b4a','#ffb020','#22e39a'],rgb=['255,59,74','255,176,32','34,227,154'];
 for(let k=0;k<3;k++){const ly=y-6*s+k*7*s;g.fillStyle=k===on?cols[k]:'#303a45';g.beginPath();g.arc(x,ly,2.6*s,0,TAU);g.fill();if(k===on){g.fillStyle=`rgba(${rgb[k]},.25)`;g.beginPath();g.arc(x,ly,6*s,0,TAU);g.fill();glow(x,ly,16*s,rgb[k],.9);}}}
function roadSign(x,y,draw){const s=scale();g.fillStyle='rgba(14,20,30,.28)';g.beginPath();g.ellipse(x+4*s,y+5*s,11*s,9*s,0,0,TAU);g.fill();g.save();g.translate(x,y);g.scale(s,s);draw();g.restore();}
const stopSign=()=>{g.fillStyle='#fff';g.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU+Math.PI/8;g.lineTo(Math.cos(a)*10.5,Math.sin(a)*10.5);}g.fill();g.fillStyle='#d8262f';g.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU+Math.PI/8;g.lineTo(Math.cos(a)*9,Math.sin(a)*9);}g.fill();g.fillStyle='#fff';g.font='bold 5.5px sans-serif';g.textAlign='center';g.fillText('STOP',0,2);};
const yieldRight=()=>{g.fillStyle='#d8262f';g.beginPath();g.moveTo(0,-11);g.lineTo(11,8);g.lineTo(-11,8);g.closePath();g.fill();g.fillStyle='#fff';g.beginPath();g.moveTo(0,-6.5);g.lineTo(7,5.5);g.lineTo(-7,5.5);g.closePath();g.fill();g.strokeStyle='#111';g.lineWidth=1.6;g.beginPath();g.moveTo(-2.8,-1.5);g.lineTo(2.8,4);g.moveTo(2.8,-1.5);g.lineTo(-2.8,4);g.stroke();};
const limitSign=v=>()=>{g.fillStyle='#fff';g.beginPath();g.arc(0,0,11,0,TAU);g.fill();g.strokeStyle='#d8262f';g.lineWidth=2.8;g.beginPath();g.arc(0,0,9.4,0,TAU);g.stroke();g.fillStyle='#111';g.font='bold 9px sans-serif';g.textAlign='center';g.fillText(v,0,3.3);};
const crossingSign=()=>{g.fillStyle='#fff';g.fillRect(-9,-9,18,18);g.fillStyle='#1f5fb8';g.fillRect(-8,-8,16,16);g.fillStyle='#fff';g.beginPath();g.moveTo(0,-6);g.lineTo(6.5,5.5);g.lineTo(-6.5,5.5);g.closePath();g.fill();g.fillStyle='#111';g.beginPath();g.arc(.5,-1.5,1.2,0,TAU);g.fill();g.fillRect(-.6,-.3,1.6,3.6);g.fillRect(-2,3,4.2,1.2);};
function label(x,y,text){g.font=`${Math.max(9,7*scale())}px monospace`;const pad=4,tw=g.measureText(text).width;g.fillStyle='rgba(11,18,32,.86)';g.beginPath();g.roundRect(x,y-9,tw+pad*2,13,2);g.fill();g.fillStyle='#4fc3f7';g.fillRect(x,y-9,1.5,13);g.fillStyle='#e8f2f8';g.textAlign='left';g.fillText(text,x+pad,y+1);}
function wrap(k,text,max){const words=text.split(' '),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(k.measureText(next).width>max&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
// Instruments sit on the windscreen, not in the world: drawn after the impairment pass, they stay sharp.
function decisionPanel(k,r){
 if(w<560||!model)return;const a=r.advice,pw=Math.min(230,w*.34),x=w-pw-10,y=10,colors={Maintenir:'#4fc3f7',Freiner:'#f0a13a','Changer de voie':'#f5d76e','Arrêt d’urgence':'#ff5c6c'};
 k.font='10px monospace';const lines=wrap(k,a.reason,pw-24);const ph=126+lines.length*12;
 k.fillStyle='rgba(11,18,32,.9)';k.beginPath();k.roundRect(x,y,pw,ph,4);k.fill();k.strokeStyle='#2c3a4d';k.lineWidth=1;k.stroke();
 k.fillStyle=colors[a.action];k.beginPath();k.roundRect(x+10,y+10,k.measureText(a.action.toUpperCase()).width+12,16,2);k.fill();
 k.fillStyle='#0b1220';k.font='bold 10px monospace';k.textAlign='left';k.fillText(a.action.toUpperCase(),x+16,y+21);
 k.fillStyle='#f4f8fa';k.textAlign='right';k.fillText(Math.round(a.scores[a.action]*100)+' %',x+pw-10,y+21);k.textAlign='left';
 k.fillStyle='#2c3a4d';k.fillRect(x+10,y+32,pw-20,2);k.fillStyle=colors[a.action];k.fillRect(x+10,y+32,(pw-20)*a.scores[a.action],2);
 k.fillStyle='#8fb3c9';k.font='10px monospace';lines.forEach((line,i)=>k.fillText(line,x+10,y+50+i*12));
 let row=y+62+lines.length*12;k.fillStyle='#5b7386';k.fillText('ACTIONS · P(A|S)',x+10,row);row+=8;
 for(const key of Object.keys(a.scores)){const v=a.scores[key];k.fillStyle=key===a.action?'#f4f8fa':'#7f95a6';k.fillText(key,x+10,row+8);k.fillStyle='#22303f';k.fillRect(x+pw-104,row+2,60,4);k.fillStyle=colors[key];k.fillRect(x+pw-104,row+2,60*v,4);k.fillStyle='#7f95a6';k.textAlign='right';k.fillText(Math.round(v*100)+'%',x+pw-10,row+8);k.textAlign='left';row+=13;}}
// The driver's own state: estimated blood alcohol against the legal marks, and what the delay costs in metres.
function vigilanceCard(r){if(!model||w<520||r.crashed)return;const k=out,{alcohol,drug,kind,delay}=impair(r.settings),x=12,y=46,sp=Math.abs(r.speed)>30?Math.abs(r.speed):50;
 const rows=[`Réaction 1,0 s + ${Math.round(delay*1000)} ms`,`${Math.round(sp/3.6*(1+delay))} m avant de freiner à ${Math.round(sp)} km/h`];
 if(drug)rows.push(`Psychoactif : ${{sedating:'somnolence',stimulating:'impulsivité',perception:'perception'}[kind]} ${Math.round(drug*100)}/100`);
 if(r.settings.night)rows.push(`Nuit : ≈ 40 m éclairés, éblouissement ×${fmt(glare,1)}`);
 k.font='10px monospace';const cw=Math.max(222,...rows.map(t=>k.measureText(t).width+20)),ch=58+rows.length*13,tone=alcohol>=.5?'#ff6b74':alcohol>=.2?'#f5c26b':'#7ee0b0';
 k.save();k.fillStyle='rgba(11,18,32,.88)';k.beginPath();k.roundRect(x,y,cw,ch,4);k.fill();k.font='10px monospace';k.textAlign='left';k.fillStyle='#8fb3c9';k.fillText('ALCOOLÉMIE SIMULÉE',x+10,y+16);
 k.textAlign='right';k.fillStyle=tone;k.font='bold 12px monospace';k.fillText(fmt(alcohol)+' g/L',x+cw-10,y+16);
 const gx=x+10,gy=y+24,gw=cw-20;k.fillStyle='#22303f';k.fillRect(gx,gy,gw,5);k.fillStyle=tone;k.fillRect(gx,gy,gw*Math.min(1,alcohol/2),5);
 k.textAlign='center';k.font='9px monospace';for(const [v,t] of [[.2,'0,2'],[.5,'0,5'],[.8,'0,8']]){const mx=gx+gw*v/2;k.fillStyle='#f4f8fa';k.fillRect(mx-.5,gy-2,1,9);k.fillStyle='#7f95a6';k.fillText(t,mx,gy+17);}
 k.textAlign='left';k.font='10px monospace';k.fillStyle='#dfe9f0';rows.forEach((t,i)=>k.fillText(t,x+10,y+60+i*13));k.restore();}
function lighting(r,cx,cy){const s=scale();
 lx.save();lx.setTransform(1,0,0,1,0,0);lx.clearRect(0,0,lc.width,lc.height);lx.restore();
 lx.globalCompositeOperation='source-over';lx.fillStyle='rgba(5,9,24,.87)';lx.fillRect(0,0,w,h);lx.globalCompositeOperation='destination-out';
 if(!r.crashed)lights.push({x:cx,y:cy-24*s,a:r.heading,len:40*ppm(),spread:.42,k:1});lights.push({x:cx,y:cy,pool:38*s,k:.6});
 for(const L of lights){if(L.pool){lx.fillStyle=gradient(lx,'r',[L.x,L.y,0,L.x,L.y,L.pool],[[0,`rgba(0,0,0,${L.k})`],[1,'rgba(0,0,0,0)']]);lx.beginPath();lx.arc(L.x,L.y,L.pool,0,TAU);lx.fill();continue;}
  lx.save();lx.translate(L.x,L.y);lx.rotate(L.a);lx.fillStyle=gradient(lx,'r',[0,0,0,0,0,L.len],[[0,`rgba(0,0,0,${L.k})`],[.5,`rgba(0,0,0,${L.k*.8})`],[1,'rgba(0,0,0,0)']]);
  lx.beginPath();lx.moveTo(-6*s,0);lx.lineTo(-Math.sin(L.spread)*L.len,-Math.cos(L.spread)*L.len);lx.arc(0,0,L.len,-Math.PI/2-L.spread,-Math.PI/2+L.spread);lx.lineTo(6*s,0);lx.closePath();lx.fill();lx.restore();}
 lx.globalCompositeOperation='source-over';g.drawImage(lc,0,0,w,h);
 g.globalCompositeOperation='lighter';for(const q of glows){g.fillStyle=gradient(g,'r',[q.x,q.y,0,q.x,q.y,q.r],[[0,`rgba(${q.rgb},${q.a})`],[.35,`rgba(${q.rgb},${q.a*.45})`],[1,`rgba(${q.rgb},0)`]]);g.beginPath();g.arc(q.x,q.y,q.r,0,TAU);g.fill();}g.globalCompositeOperation='source-over';}
function render(dt){
 const r=model||{distance:0,speed:0,x:25,heading:0,time:0,objects:[],scenery:[],settings:settings(),flash:0,limit:50,advice:null},s=scale(),im=impair(r.settings);
 night=!!r.settings.night;glare=1+im.alcohol*1.4+(im.kind==='perception'?im.drug*1.5:im.drug*.4);lights.length=0;glows.length=0;
 // The faster the car, the lower it sits on screen and the further the view reaches; off the road, the view follows it sideways.
 const desired=h*(r.speed<0?.55:.74+Math.min(1,r.speed/220)*.13);cameraY+=(desired-cameraY)*Math.min(1,dt*3);camX+=(r.x-Math.max(-95,Math.min(95,r.x))-camX)*Math.min(1,dt*5);
 g.save();if(!reduced&&crashAge<.45)g.translate(Math.sin(crashAge*95)*16*(1-crashAge/.45),Math.cos(crashAge*74)*11*(1-crashAge/.45));
 g.fillStyle=pattern('grass','#a3cf88');g.fillRect(-20,-20,w+40,h+40);countryside(r);
 // The ditch marks the end of the verge: past it, the run is over.
 g.strokeStyle='#89a96e';g.lineWidth=22*s;pathRoad(-262);pathRoad(262);g.strokeStyle='#6d998f';g.lineWidth=5*s;pathRoad(-262);pathRoad(262);
 const objs=r.objects.filter(o=>{const y=py(o.d);return y>-180&&y<h+180;}),scen=r.scenery.filter(o=>{const y=py(o.d);if(y<-110||y>h+110)return false;const x=roadX(o.d)+o.x*s;return x>-90&&x<w+90;});
 for(const o of objs)if(o.type==='junction')junctionGround(o);
 for(const o of scen)if(o.kind>=4)sceneryItem(o);
 road(r);for(const o of objs)if(o.type==='junction')junctionTop(o);
 for(const o of scen)if(o.kind<4)sceneryItem(o);
 const cx=w/2+(r.x-camX)*s,cy=cameraY,sensed=[];
 for(const o of objs){const y=py(o.d),x=roadX(o.d),gap=o.d-r.distance,near=gap>-5&&gap<130;
  if(o.type==='junction'){const hw=34*s;vehicle(x+o.cross*s,y-14*s,{color:'#c89b85',kind:'sedan',width:20,length:48,velocity:-1},-Math.PI/2);
   if(o.rule==='light'){const left=6-((r.time+o.phase)%6),state=o.red?'red':left<1.5?'amber':'green';trafficLight(x+124*s,y+hw+10*s,state);trafficLight(x-124*s,y-hw-10*s,state);}
   else if(o.rule==='stop'){roadSign(x+126*s,y+hw+14*s,stopSign);roadSign(x-126*s,y-hw-14*s,stopSign);}
   else{roadSign(x+126*s,y+hw+50*s,yieldRight);roadSign(x-126*s,y-hw-50*s,yieldRight);}
   if(near)sensed.push({x:x+o.cross*s,y:y-14*s,text:o.rule==='light'?`Feu ${o.red?'rouge':'vert'}`:o.rule==='stop'?'Stop':'Priorité à droite'});}
  else if(o.type==='car'){const x1=x+o.lane*s;vehicle(x1,y,o.hit?{...o,wreck:true}:o,(o.lane<0?Math.PI:0)+(o.hit?.35:0),o.hit);if(near&&!o.hit)sensed.push({x:x1,y,text:`${o.name} · ${Math.round(Math.abs(o.velocity)*3.6)} km/h`});}
  else if(o.type==='barrier'){const x1=x+o.lane*s;
   if(o.kind==='bin'){g.fillStyle='rgba(14,20,30,.28)';g.fillRect(x1-6*s,y-6*s,16*s,18*s);g.fillStyle='#1f7d4c';g.beginPath();g.roundRect(x1-8*s,y-9*s,16*s,18*s,2*s);g.fill();g.fillStyle='#2a9a60';g.fillRect(x1-7*s,y-8*s,14*s,11*s);g.fillStyle='#164f33';g.fillRect(x1-8*s,y-9*s,16*s,3.5*s);g.fillStyle='#111';g.fillRect(x1-7*s,y+7*s,4*s,2.5*s);g.fillRect(x1+3*s,y+7*s,4*s,2.5*s);}
   else{g.fillStyle='rgba(14,20,30,.28)';g.fillRect(x1-20*s,y-2*s,44*s,9*s);g.save();g.beginPath();g.rect(x1-22*s,y-5*s,44*s,10*s);g.clip();g.fillStyle='#fff';g.fillRect(x1-22*s,y-5*s,44*s,10*s);g.fillStyle='#d8262f';for(let k=-26;k<26;k+=8){g.beginPath();g.moveTo(x1+k*s,y+5*s);g.lineTo(x1+(k+4)*s,y+5*s);g.lineTo(x1+(k+9)*s,y-5*s);g.lineTo(x1+(k+5)*s,y-5*s);g.fill();}g.restore();
    g.fillStyle='#2a2f36';g.fillRect(x1-23*s,y-6*s,3*s,12*s);g.fillRect(x1+20*s,y-6*s,3*s,12*s);const blink=Math.floor(r.time*2.4)%2===0;g.fillStyle=blink?'#ffc233':'#8a6a1c';g.beginPath();g.arc(x1-21.5*s,y-7*s,2.4*s,0,TAU);g.fill();if(blink){glow(x1-21.5*s,y-7*s,18*s,'255,190,50',.9);if(!night){g.fillStyle='rgba(255,194,51,.25)';g.beginPath();g.arc(x1-21.5*s,y-7*s,6*s,0,TAU);g.fill();}}
    for(const dx of [-15,0,15]){const kx=x1+dx*s,ky=y+17*s;g.fillStyle='rgba(14,20,30,.25)';g.beginPath();g.arc(kx+1.5*s,ky+2*s,4.5*s,0,TAU);g.fill();g.fillStyle='#f06a1f';g.beginPath();g.arc(kx,ky,4.3*s,0,TAU);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(kx,ky,2.6*s,0,TAU);g.fill();g.fillStyle='#f06a1f';g.beginPath();g.arc(kx,ky,1.5*s,0,TAU);g.fill();}}
   if(near)sensed.push({x:x1,y,text:o.kind==='bin'?'Conteneur':'Barrière de chantier'});}
  else if(o.type==='bike'){const x1=x+o.lane*s;if(o.hit)casualty(x1+8*s,y,['#2f9e6b','#e0763a','#5b6fd6'][o.tone],true);else{cyclist(x1,y,o.velocity<0?Math.PI:0,r.time+o.d,['#2f9e6b','#e0763a','#5b6fd6'][o.tone]);if(near)sensed.push({x:x1,y,text:`Cycliste · ${Math.round(Math.abs(o.velocity)*3.6)} km/h`});}}
  else if(o.type==='sign'){const x1=x+130*s;roadSign(x1,y,limitSign(o.limit));if(near)sensed.push({x:x1,y,text:`Limitation ${o.limit} km/h`,quiet:true});}
  else{g.fillStyle='#eef1f2';for(let k=-104;k<105;k+=15)g.fillRect(x+k*s,y-10*s,7.5*s,20*s);for(const side of [-1,1])roadSign(x+side*126*s,y-side*24*s,crossingSign);
   if(night)lights.push({x,y,pool:130*s,k:.75});
   const phase=r.time*.65+o.phase,tone=['#eb696d','#6c8ef0','#f2c744'][Math.floor(o.phase)%3];
   if(o.hit){const px=x+o.downX*s;casualty(px,y,tone);}else{const px=x+Math.sin(phase)*95*s;pedestrian(px,y,Math.cos(phase)>0?Math.PI/2:-Math.PI/2,r.time+o.phase,tone);if(near)sensed.push({x:px,y,text:'Piéton · passage'});}}}
 const jitter=r.speed>0&&!reduced&&!r.crashed?Math.sin(r.time*47)*Math.min(1.6,r.speed/110)*s+(r.offroadNow?Math.sin(r.time*31)*Math.min(2.5,Math.abs(r.speed)/25)*s:0):0;
 const spin=r.crashed?Math.min(1,crashAge/.9):0,ease=spin*(2-spin),slide=ease*Math.min(70,(r.impactSpeed||30)*.9)*s,ox=cx+ease*18*s,oy=cy-slide;
 vehicle(cx+jitter+ease*18*s,oy,{color:'#f4f8fb',kind:'sedan',width:20,length:48,braking:keys.brake||r.speed<0,player:true},r.heading+ease*2.6,r.damage>25);
 // Each accident: flash, flying debris and smoke around the car; heavy damage keeps the bonnet smoking.
 if(crashAge<2.4){const k=Math.min(1,crashAge*1.6);for(let i=0;i<26;i++){const a=i*2.39,rad=k*(30+i%5*9)*s,fall=Math.min(crashAge,1.2)*14;g.fillStyle=i%3?'#e8954c':i%2?'#dfe7ee':'#3c4854';g.globalAlpha=Math.max(0,1-crashAge/2.4);g.fillRect(ox+Math.cos(a)*rad,oy+Math.sin(a)*rad*.6+fall,3,i%2?6:3);}g.globalAlpha=1;
  if(crashAge<.5){g.fillStyle=`rgba(255,240,200,${.9-crashAge*1.8})`;g.beginPath();g.arc(ox,oy-12*s,(20+crashAge*160)*s,0,TAU);g.fill();}}
 if(r.damage>45||crashAge<2.4){const n=r.damage>45?7:4;for(let i=0;i<n;i++){const age=((r.time||0)*.8+i*.37)%2.4;g.fillStyle=`rgba(60,66,75,${Math.max(0,(r.damage>70?.6:.4)-age*.2)})`;g.beginPath();g.arc(ox+Math.sin(i*2.1+age)*8*s,oy-20*s-age*34*s,(6+age*12)*s,0,TAU);g.fill();}}
 if(night)lighting(r,cx,cy);
 // Perception overlay: the sensor cone and dashed rays to what the driver should be tracking.
 if(model&&!r.crashed){g.save();g.translate(cx,cy-18*s);g.rotate(r.heading);g.fillStyle=gradient(g,'l',[0,0,0,-240*s],[[0,'rgba(99,216,235,.2)'],[1,'rgba(99,216,235,0)']]);g.beginPath();g.moveTo(-8,0);g.lineTo(-70*s,-240*s);g.lineTo(70*s,-240*s);g.lineTo(8,0);g.fill();
  g.strokeStyle='rgba(82,219,228,.28)';g.lineWidth=.7;g.setLineDash([4,8]);for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(0,0);g.lineTo(i*23*s,-240*s);g.stroke();}g.setLineDash([]);g.restore();
  g.strokeStyle='rgba(79,195,247,.45)';g.lineWidth=.8;g.setLineDash([3,5]);for(const q of sensed){if(q.quiet)continue;g.beginPath();g.moveTo(cx,cy-18*s);g.lineTo(q.x,q.y);g.stroke();}g.setLineDash([]);for(const q of sensed)label(q.x+14*s,q.y-14*s,q.text);}
 if(r.speed>55&&!reduced){g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;const n=Math.min(22,Math.floor(r.speed/8));for(let i=0;i<n;i++){const x=cx+(i%2?1:-1)*(24+i%5*9)*s,y=cy+30+((r.distance*9+i*37)%(h*.6));g.beginPath();g.moveTo(x,y);g.lineTo(x,y+Math.min(60,r.speed*.3));g.stroke();}}
 g.restore();
 if(r.crashed||crashAge<1.2){const pulse=(.28+.18*Math.sin(crashAge*6))*(r.crashed?1:Math.max(0,1-crashAge/1.2));g.fillStyle=gradient(g,'r',[w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.7],[[0,'rgba(200,20,40,0)'],[1,`rgba(200,20,40,${reduced?.35:pulse+.15*(r.crashed?1:Math.max(0,1-crashAge/1.2))})`]]);g.fillRect(0,0,w,h);if(r.crashed){g.strokeStyle='#ff3b50';g.lineWidth=10;g.strokeRect(5,5,w-10,h-10);}}
 if(r.flash>0&&!r.crashed){g.fillStyle=`rgba(235,35,48,${reduced?.18:.12+.2*(.5+.5*Math.cos(r.flash*Math.PI*4))})`;g.fillRect(0,0,w,h);g.strokeStyle='#ff3b50';g.lineWidth=8;g.strokeRect(4,4,w-8,h-8);}
 lastCar={x:cx,y:cy};
 $('road-hud').textContent=`${r.speed<0?'R ':''}${Math.round(Math.abs(r.speed))} km/h · limite ${r.limit} · ${fmtTime(r.time)} / ${r.settings.duration?fmtTime(r.settings.duration):'∞'} · ${r.violations||0} infraction(s) · ${r.collisions||0} accident(s) · dégâts ${Math.round(r.damage||0)} %`;
 if(model){c.dataset.running=String(r.running&&!paused);c.dataset.speed=Math.round(r.speed);c.dataset.distance=Math.round(r.distance);c.dataset.collisions=r.collisions;c.dataset.violations=r.violations;c.dataset.crashed=String(r.crashed);c.dataset.damage=Math.round(r.damage);c.dataset.limit=r.limit;if($('road-status').textContent!==r.message)$('road-status').textContent=r.message;}
}
// The accident / pause window sits on top of the game: it is drawn after the impairment pass, so it stays sharp.
function banner(r){if(!(r.crashed||paused||!model))return;const x=out,im=impair(r.settings);x.save();x.filter='none';x.globalAlpha=1;
 x.fillStyle='rgba(12,20,32,.8)';x.fillRect(0,h*.35,w,h*.28);x.strokeStyle=r.crashed?'#ff3b50':'rgba(243,248,255,.35)';x.lineWidth=2;x.strokeRect(1,h*.35,w-2,h*.28);
 x.textAlign='center';x.fillStyle=r.crashed?'#ff6b74':'#f3f8ff';x.font=`bold ${Math.min(30,w/13)}px monospace`;x.fillText(r.crashed?'VÉHICULE HORS D’USAGE':paused?'PAUSE':'PRENDRE LE VOLANT',w/2,h*.44);
 x.font='13px monospace';x.fillStyle='#fff';x.fillText(r.crashed?'Trop de chocs : recommencer pour repartir.':paused?'Reprendre avec le bouton de conduite':(matchMedia('(pointer:coarse)').matches?'Accélérer pour démarrer · ← → pour tourner':'ZQSD · Maj gauche / Ctrl gauche'),w/2,h*.50);
 const note=im.alcohol>=.5?`${fmt(im.alcohol)} g/L : au-delà de la limite légale, ce trajet ne devrait pas avoir lieu.`:im.alcohol>0?`${fmt(im.alcohol)} g/L : sous la limite générale, mais les réflexes sont déjà touchés.`:im.drug?'Psychoactif simulé : ne pas conduire sous l’effet d’une substance.':'';
 if(note){x.font='12px monospace';x.fillStyle=im.alcohol>=.5?'#ffb3b8':'#f5d58f';x.fillText(note,w/2,h*.56);}x.restore();}
// Impairment of the driver's eyes, grown from the estimated blood alcohol and the psychoactive setting:
// blur and double vision, peripheral vision narrowing into a tunnel, colour shifts, and eyelids that droop shut.
function eyelids(t,k){const period=10-4*k,dur=.45+.6*k,p=(t+period*.6)%period;if(p>dur)return;const close=Math.sin(Math.PI*p/dur)*Math.min(.95,.4+k*.6),hh=h/2*close,soft=40;
 for(const top of [true,false]){out.fillStyle=gradient(out,'l',top?[0,0,0,hh+soft]:[0,h,0,h-hh-soft],[[0,'#040404'],[hh/(hh+soft),'#040404'],[1,'rgba(4,4,4,0)']]);out.fillRect(0,top?0:h-hh-soft,w,hh+soft);}}
function present(r){const {alcohol,drug,kind}=impair(r.settings);
 const blur=Math.min(7,alcohol*2.6+(kind==='sedating'?drug*4:drug*1.5)),ghost=Math.min(16,alcohol*7+(kind==='perception'?drug*14:drug*3)),sway=alcohol*3+(kind==='stimulating'?drug*6:drug*2);
 const tunnel=Math.min(.55,Math.max(0,alcohol-.2)*.3+(kind==='sedating'?drug*.35:drug*.15)),sleepy=Math.min(1,(kind==='sedating'?drug:0)+Math.max(0,alcohol-.5)*.45);
 out.setTransform(1,0,0,1,0,0);out.clearRect(0,0,c.width,c.height);const d=Math.min(devicePixelRatio,1.75);out.setTransform(d,0,0,d,0,0);out.filter='none';out.globalAlpha=1;
 if(blur<.05&&ghost<.05&&tunnel<.02)out.drawImage(buffer,0,0,w,h);
 else{const t=performance.now()/1000,sx=reduced?0:Math.sin(t*1.1)*sway,sy=reduced?0:Math.cos(t*.7)*sway*.6;
  const tint=` saturate(${(1-Math.min(.5,alcohol*.2)).toFixed(2)})`+(kind==='perception'&&!reduced?` hue-rotate(${(Math.sin(t*.45)*55*drug).toFixed(0)}deg)`:''),sharp=`blur(${blur.toFixed(2)}px)`+tint;
  const fx=lastCar.x,fy=lastCar.y-h*.24,R=Math.max(w,h)*Math.max(.2,.62-tunnel*.75);
  if(tunnel>.02){out.filter=`blur(${(blur+2+tunnel*10).toFixed(2)}px)`+tint;out.drawImage(buffer,sx,sy,w,h);out.save();out.beginPath();out.ellipse(fx,fy,R,R*.9,0,0,TAU);out.clip();out.filter=sharp;out.drawImage(buffer,sx,sy,w,h);out.restore();}
  else{out.filter=sharp;out.drawImage(buffer,sx,sy,w,h);}
  if(ghost>.05&&!reduced){out.filter=sharp;out.globalAlpha=Math.min(.5,alcohol*.3+drug*.3);out.drawImage(buffer,sx+Math.cos(t*.9)*ghost,sy+Math.sin(t*1.3)*ghost*.5,w,h);out.globalAlpha=1;}
  out.filter='none';
  if(tunnel>.02||alcohol>.2||drug>.2){out.fillStyle=gradient(out,'r',[fx,fy,R*.7,fx,fy,Math.max(w,h)*.8],[[0,'rgba(14,8,2,0)'],[1,`rgba(14,8,2,${Math.min(.85,.2+tunnel*1.2).toFixed(2)})`]]);out.fillRect(0,0,w,h);}}
 if(sleepy>.05&&!reduced&&model?.running&&!paused)eyelids(r.time,sleepy);
 if(model&&!r.crashed&&!paused)decisionPanel(out,r);vigilanceCard(r);toast(r);banner(r);}
// A passing notice for each accident: what was hit and how fast. The run goes on.
function toast(r){if(!model||r.crashed||!r.lastCrash||crashAge>3)return;const a=Math.min(1,(3-crashAge)*1.5),k=out,msg=`${r.lastCrash.what} · ${Math.round(r.lastCrash.speed)} km/h`;
 k.save();k.globalAlpha=a;k.font='bold 15px monospace';const tw=Math.max(k.measureText(msg).width,k.measureText('ACCIDENT').width)+36,x=w/2-tw/2,y=h*.16;
 k.fillStyle=r.lastCrash.victim?'rgba(120,10,24,.92)':'rgba(12,20,32,.9)';k.beginPath();k.roundRect(x,y,tw,54,4);k.fill();k.strokeStyle='#ff3b50';k.lineWidth=2;k.stroke();
 k.textAlign='center';k.fillStyle='#ff6b74';k.fillText('ACCIDENT',w/2,y+22);k.fillStyle='#fff';k.font='12px monospace';k.fillText(msg,w/2,y+42);k.restore();}
function frame(t){const dt=Math.min(.04,(t-last)/1000||.016);last=t;if(model?.running&&!paused){model.step(dt,{...keys,gas:keys.gas||keys.up});if(!model.running&&!finished)finish();}crashAge+=dt;if(model&&model.collisions>seenCrashes){seenCrashes=model.collisions;crashAge=0;crashSound();/* crashSound() cuts the engine; engineSound() brings it back once the car moves again */}if(model)engineSound(model);render(dt);present(model||{settings:settings()});requestAnimationFrame(frame);}c.redraw=()=>{render(.016);present(model||{settings:settings()});};requestAnimationFrame(frame);
})();

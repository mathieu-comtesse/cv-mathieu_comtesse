(()=>{
'use strict';
const $=id=>document.getElementById(id),c=$('road-canvas'),out=c.getContext('2d'),buffer=document.createElement('canvas'),g=buffer.getContext('2d'),{RoadRun,center}=window.RoadModel;
let audio=null,engine=null,muted=false,w=800,h=720,last=0,model=null,paused=false,keys={},cameraY=0,crashAge=0,finished=false,baseline=null,trackSeed=1783;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings=()=>({alcohol:+$('alcohol').value,drug:$('drug').value,level:+$('drug-level').value/100});
// Widmark: grams of pure alcohol / (body mass × 0.68), a rough estimate — never a legal measurement.
const drinks=[...document.querySelectorAll('#drinks .drink')];
function computeAlcohol(){let glasses=0,grams=0;for(const d of drinks){const n=+d.querySelector('output').textContent||0;glasses+=n;grams+=n*(+d.dataset.cl)*10*(+d.dataset.deg)/100*.8;}
 const weight=+($('weight')?.value||75),bac=grams/(weight*.68);
 if($('alcohol'))$('alcohol').value=bac.toFixed(2);
 if($('alcohol-readout'))$('alcohol-readout').textContent=`${glasses} verre${glasses>1?'s':''} · ${Math.round(grams)} g d’alcool · ${bac.toFixed(2).replace('.',',')} g/L`;
 if($('weight-value'))$('weight-value').value=weight+' kg';}
for(const d of drinks)for(const b of d.querySelectorAll('button'))b.onclick=()=>{const o=d.querySelector('output');o.textContent=Math.max(0,Math.min(20,(+o.textContent||0)+ +b.dataset.step));computeAlcohol();if(model?.running)model.settings=settings();};
$('weight')?.addEventListener('input',()=>{computeAlcohol();if(model?.running)model.settings=settings();});
function controls(){$('drug-value').value=$('drug-level').value+' / 100';computeAlcohol();}
['drug','drug-level'].forEach(id=>{const e=$(id);if(e)e.oninput=controls;});controls();
// --- Sound -----------------------------------------------------------------
// A four-cylinder four-stroke fires twice per revolution, so what the ear hears is the rev counter, not the
// speedometer: the note climbs inside each gear and drops on the shift. Everything else is filtered noise —
// induction, tyres, gravel, brake pads, rubber — because that is what those things actually are.
const GEARS=[36,60,90,124,160];
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
 const sp=Math.max(0,r.speed||0),th=r.throttle||0,bf=r.brakeForce||0;
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
function begin(){initAudio();model=new RoadRun(trackSeed,settings());c.model=model;paused=false;keys={};finished=false;crashAge=0;cameraY=h*.74;$('road-start').textContent='Mettre en pause';$('road-results').replaceChildren();$('road-status').textContent=model.message;c.focus({preventScroll:true});}
function finish(){finished=true;const r=model;keys={};if(!r.settings.alcohol&&r.settings.drug==='none')baseline={distance:r.distance,collisions:r.collisions};$('road-results').textContent=`${r.crashed?'Accident — fin du trajet.':'Trajet terminé.'} ${Math.round(r.distance)} m · ${r.violations} infraction(s) · ${Math.round(r.offroad)} s hors chaussée.`+(baseline&&r.settings.alcohol?` Référence sans substance : ${baseline.collisions} accident(s), ${Math.round(baseline.distance)} m.`:'');$('road-start').textContent='Recommencer';}
$('road-start').onclick=()=>{if(!model||!model.running)begin();else{paused=!paused;keys={};$('road-start').textContent=paused?'Reprendre':'Mettre en pause';}};
$('road-random').onclick=()=>{trackSeed=Math.floor(Math.random()*4294967295);begin();};
$('road-sound').onclick=e=>{muted=!muted;e.target.textContent=muted?'Son : non':'Son : oui';e.target.setAttribute('aria-pressed',!muted);if(!muted){initAudio();audio.resume();}};
$('road-sober').onclick=()=>{for(const d of drinks)d.querySelector('output').textContent='0';$('drug').value='none';$('drug-level').value=0;controls();begin();};
const keyOf=e=>({ShiftLeft:'gas',ControlLeft:'brake',KeyW:'up',KeyZ:'up',KeyA:'left',KeyQ:'left',KeyS:'brake',KeyD:'right',ArrowUp:'gas',ArrowDown:'brake',ArrowLeft:'left',ArrowRight:'right',Space:'brake'}[e.code]);
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;const key=keyOf(e);if(key){e.preventDefault();keys[key]=true;}});
window.addEventListener('keyup',e=>{keys[keyOf(e)]=false;});window.addEventListener('blur',()=>{keys={};if(model?.running){paused=true;$('road-start').textContent='Reprendre';}});
for(const b of document.querySelectorAll('[data-drive]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.drive]=true;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{keys[b.dataset.drive]=false;};}
function resize(){const r=c.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio,1.75);c.width=buffer.width=w*d;c.height=buffer.height=h*d;g.setTransform(d,0,0,d,0,0);out.setTransform(d,0,0,d,0,0);}new ResizeObserver(resize).observe(c);resize();
// Ten pixels per metre at full scale: a 48-unit sedan is about five metres long.
const zoom=()=>1-Math.min(1,(model?.speed||0)/180)*.22,scale=()=>Math.min(1.5,w/390)*zoom(),ppm=()=>9*scale();
const roadX=d=>w/2+(center(d)-center(model?.distance||0))*scale();
const py=d=>cameraY-(d-(model?.distance||0))*ppm();
function pathRoad(offset){g.beginPath();for(let y=-20;y<=h+20;y+=8){const d=(model?.distance||0)+(cameraY-y)/ppm();const x=roadX(d)+offset*scale();y===-20?g.moveTo(x,y):g.lineTo(x,y);}g.stroke();}
function vehicle(x,y,o,angle=0,damaged=false){
 const width=o.width||20,length=o.length||48,kind=o.kind||'sedan',s=scale();
 g.save();g.translate(x,y);g.rotate(angle);g.scale(s,s);
 g.fillStyle='#0004';g.fillRect(-width/2+3,-length/2+2,width,length);
 g.fillStyle='#15212d';g.fillRect(-width/2-2,-length/2+6,width+4,length-12);
 g.fillStyle=o.color;g.beginPath();g.roundRect(-width/2,-length/2,width,length,kind==='truck'?2:4);g.fill();
 if(kind==='truck'){g.fillStyle='#e9eef2';g.fillRect(-width/2+2,-length/2+16,width-4,length-20);g.fillStyle='#082b3c';g.fillRect(-width/2+2,-length/2+4,width-4,9);}
 else if(kind==='van'){g.fillStyle='#082b3c';g.fillRect(-width/2+2,-length/2+5,width-4,10);g.fillStyle='#ffffff30';g.fillRect(-width/2+2,-length/2+18,width-4,length-24);}
 else{g.fillStyle='#082b3c';g.fillRect(-width/2+2,-length/2+11,width-4,length*.27);g.fillRect(-width/2+2,length/2-16,width-4,7);}
 g.fillStyle='#bceeff';g.fillRect(-width/2+1,-length/2+1,5,3);g.fillRect(width/2-6,-length/2+1,5,3);
 g.fillStyle=o.braking?'#ff3434':'#c64651';g.fillRect(-width/2+1,length/2-3,5,3);g.fillRect(width/2-6,length/2-3,5,3);
 if(damaged){g.strokeStyle='#20212b';g.lineWidth=2;g.beginPath();g.moveTo(-width/2,-length/2+1);g.lineTo(0,-12);g.lineTo(8,-length/2+2);g.moveTo(-8,-8);g.lineTo(7,-1);g.stroke();}
 g.restore();
}
function scenery(o){const y=py(o.d);if(y<-100||y>h+100)return;const x=roadX(o.d)+o.x*scale();g.save();g.translate(x,y);g.scale(o.scale*scale(),o.scale*scale());
 if(o.kind<3){g.fillStyle=['#3f8f66','#5aa072','#2f7a5d'][o.tone];g.beginPath();g.arc(0,0,15,0,7);g.arc(9,-6,11,0,7);g.arc(-8,5,10,0,7);g.fill();g.fillStyle='#2b5b45';g.beginPath();g.arc(-3,-3,4,0,7);g.fill();}
 else if(o.kind===3){g.fillStyle='#c3cbd3';g.fillRect(-22,-30,44,60);g.fillStyle=['#8fa0ad','#c49a8a','#a3a1c2'][o.tone];g.fillRect(-19,-27,38,54);g.strokeStyle='#f1f5f7';g.lineWidth=1.5;g.strokeRect(-12,-18,24,36);}
 else if(o.kind===4){g.fillStyle='#d9cfb4';g.fillRect(-20,-14,40,28);g.strokeStyle='#b7a682';g.lineWidth=1;for(let k=-10;k<14;k+=7){g.beginPath();g.moveTo(-20,k);g.lineTo(20,k);g.stroke();}}
 else{g.fillStyle='#c6cfce';g.beginPath();g.ellipse(0,0,13,7,.5,0,7);g.fill();}g.restore();}
function label(x,y,text,color='#0e1622'){g.font=`${Math.max(9,7*scale())}px monospace`;const pad=4,tw=g.measureText(text).width;g.fillStyle=color+'e6';g.beginPath();g.roundRect(x,y-9,tw+pad*2,13,2);g.fill();g.fillStyle='#e8f2f8';g.textAlign='left';g.fillText(text,x+pad,y+1);}
function wrap(text,max){const words=text.split(' '),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(g.measureText(next).width>max&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
function decisionPanel(r){
 if(w<560||!model)return;const a=r.advice,pw=Math.min(230,w*.34),x=w-pw-10,y=10,colors={Maintenir:'#4fc3f7',Freiner:'#f0a13a','Changer de voie':'#f5d76e','Arrêt d’urgence':'#ff5c6c'};
 g.font='10px monospace';const lines=wrap(a.reason,pw-24);const ph=126+lines.length*12;
 g.fillStyle='#0b1220f0';g.beginPath();g.roundRect(x,y,pw,ph,4);g.fill();g.strokeStyle='#2c3a4d';g.lineWidth=1;g.stroke();
 g.fillStyle=colors[a.action];g.beginPath();g.roundRect(x+10,y+10,g.measureText(a.action.toUpperCase()).width+12,16,2);g.fill();
 g.fillStyle='#0b1220';g.font='bold 10px monospace';g.textAlign='left';g.fillText(a.action.toUpperCase(),x+16,y+21);
 g.fillStyle='#f4f8fa';g.textAlign='right';g.fillText(Math.round(a.scores[a.action]*100)+' %',x+pw-10,y+21);g.textAlign='left';
 g.fillStyle='#2c3a4d';g.fillRect(x+10,y+32,pw-20,2);g.fillStyle=colors[a.action];g.fillRect(x+10,y+32,(pw-20)*a.scores[a.action],2);
 g.fillStyle='#8fb3c9';g.font='10px monospace';lines.forEach((line,i)=>g.fillText(line,x+10,y+50+i*12));
 let row=y+62+lines.length*12;g.fillStyle='#5b7386';g.fillText('ACTIONS · P(A|S)',x+10,row);row+=8;
 for(const key of Object.keys(a.scores)){const v=a.scores[key];g.fillStyle=key===a.action?'#f4f8fa':'#7f95a6';g.fillText(key,x+10,row+8);g.fillStyle='#22303f';g.fillRect(x+pw-84,row+2,70,4);g.fillStyle=colors[key];g.fillRect(x+pw-84,row+2,70*v,4);g.fillStyle='#7f95a6';g.textAlign='right';g.fillText(Math.round(v*100)+'%',x+pw-10,row+8);g.textAlign='left';row+=13;}
}
function render(dt){
 const r=model||{distance:0,speed:0,x:25,heading:0,time:0,objects:[],scenery:[],settings:{},flash:0,limit:50,advice:null};
 const desired=h*(.78-Math.min(1,r.speed/180)*.34);cameraY+=(desired-cameraY)*Math.min(1,dt*3);
 g.save();if(r.crashed&&!reduced&&crashAge<.45)g.translate(Math.sin(crashAge*95)*16*(1-crashAge/.45),Math.cos(crashAge*74)*11*(1-crashAge/.45));
 g.fillStyle='#f4f7f8';g.fillRect(0,0,w,h);g.strokeStyle='#bdf5cf';g.lineWidth=760*scale();pathRoad(0);r.scenery.forEach(scenery);
 g.strokeStyle='#dbe3e8';g.lineWidth=290*scale();pathRoad(0);g.strokeStyle='#303e50';g.lineWidth=224*scale();pathRoad(0);
 // Road texture is anchored to world distance, including dashed lane markings.
 const smear=Math.min(26,r.speed*.22)*scale();g.fillStyle='#c9d3da';for(let d=Math.floor((r.distance-60)/4)*4;d<r.distance+400;d+=4){const y=py(d);if(y<-30||y>h+30)continue;for(const side of [-1,1])g.fillRect(roadX(d)+side*128*scale()-2*scale(),y-smear,4*scale(),3*scale()+smear);}
 g.strokeStyle='#526174';g.lineWidth=.5;for(let d=Math.floor((r.distance-100)/6)*6;d<r.distance+350;d+=6){const y=py(d);if(y<-10||y>h+10)continue;g.beginPath();g.moveTo(roadX(d)-110*scale(),y);g.lineTo(roadX(d)+110*scale(),y+3);g.stroke();}
 for(const lane of [-107,-55,-2,2,55,107]){g.strokeStyle=Math.abs(lane)===2?'#d9bf45':'#e7edf2';g.lineWidth=(Math.abs(lane)===2?1.3:1.2)*scale();g.setLineDash(Math.abs(lane)===55?[26*scale(),30*scale()]:[]);g.lineDashOffset=-r.distance*ppm()+cameraY;pathRoad(lane);}g.setLineDash([]);
 const cx=w/2+r.x*scale(),cy=cameraY,sensed=[];
 for(const o of r.objects){const y=py(o.d),x=roadX(o.d);if(y<-180||y>h+180)continue;const gap=o.d-r.distance;
  if(o.type==='junction'){
   g.fillStyle='#303e50';g.fillRect(0,y-34*scale(),w,68*scale());g.strokeStyle='#d7b54b';g.lineWidth=.8;for(let k=-100;k<110;k+=22){g.beginPath();g.moveTo(x+k*scale(),y-32*scale());g.lineTo(x+(k+32)*scale(),y+32*scale());g.moveTo(x+k*scale(),y+32*scale());g.lineTo(x+(k+32)*scale(),y-32*scale());g.stroke();}
   g.fillStyle='#f4f8fa';g.fillRect(x+6*scale(),y+46*scale(),100*scale(),3*scale());
   if(o.rule==='stop'){g.fillStyle='#f4f8fa';g.font=`bold ${11*scale()}px monospace`;g.textAlign='center';g.fillText('STOP',x+55*scale(),y+70*scale());g.textAlign='left';}
   for(let lane of [-80,-27,27,80]){g.fillStyle='#15212b';g.beginPath();g.roundRect(x+lane*scale()-7*scale(),y-64*scale(),14*scale(),24*scale(),3);g.fill();const on=o.rule==='light'?(o.red?'#ff495e':'#28e49d'):'#e45757';for(let k=0;k<3;k++){g.fillStyle=(o.rule==='light'?(o.red?k===0:k===2):k===0)?on:'#2b3a46';g.beginPath();g.arc(x+lane*scale(),y-58*scale()+k*6*scale(),2.4*scale(),0,7);g.fill();}}
   g.fillStyle='#f4f8fa';g.font=`bold ${9*scale()}px monospace`;g.fillText(o.rule==='light'?'FEUX':o.rule==='stop'?'STOP':'PRIORITÉ À DROITE',x+112*scale(),y-40*scale());
   vehicle(x+o.cross*scale(),y,{color:'#c89b85',kind:'sedan',width:20,length:48},Math.PI/2);
   if(gap>-5&&gap<130)sensed.push({x:x+o.cross*scale(),y,text:o.rule==='light'?`Feu ${o.red?'rouge':'vert'}`:o.rule==='stop'?'Stop':'Priorité à droite'});
  }else if(o.type==='car'){const x1=x+o.lane*scale();vehicle(x1,y,o,o.velocity<0?Math.PI:0);if(gap>-5&&gap<130)sensed.push({x:x1,y,text:`${o.name} · ${Math.round(Math.abs(o.velocity)*3.6)} km/h`});}
  else if(o.type==='barrier'){const x1=x+o.lane*scale();if(o.kind==='bin'){g.fillStyle='#1f7d4c';g.beginPath();g.roundRect(x1-8*scale(),y-9*scale(),16*scale(),18*scale(),2);g.fill();g.fillStyle='#164f33';g.fillRect(x1-8*scale(),y-9*scale(),16*scale(),4*scale());}
   else{g.fillStyle='#f09343';g.fillRect(x1-22*scale(),y-6*scale(),44*scale(),12*scale());g.strokeStyle='#fff2d7';g.lineWidth=3*scale();for(let k=-18;k<22;k+=10){g.beginPath();g.moveTo(x1+k*scale(),y+5*scale());g.lineTo(x1+(k+5)*scale(),y-5*scale());g.stroke();}}
   if(gap>-5&&gap<130)sensed.push({x:x1,y,text:o.kind==='bin'?'Conteneur':'Barrière de chantier'});}
  else if(o.type==='sign'){const x1=x+130*scale();g.fillStyle='#6b7480';g.fillRect(x1-1.5*scale(),y,3*scale(),22*scale());g.fillStyle='#ffffff';g.beginPath();g.arc(x1,y,11*scale(),0,7);g.fill();g.strokeStyle='#d8323c';g.lineWidth=3*scale();g.stroke();g.fillStyle='#111';g.font=`bold ${10*scale()}px sans-serif`;g.textAlign='center';g.fillText(o.limit,x1,y+3.5*scale());g.textAlign='left';if(gap>-5&&gap<130)sensed.push({x:x1,y,text:`Limitation ${o.limit} km/h`,quiet:true});}
  else{g.fillStyle='#f5f7f7';for(let k=-100;k<105;k+=15)g.fillRect(x+k*scale(),y-9*scale(),8*scale(),18*scale());g.fillStyle='#ffd447';for(let sign of [-1,1]){g.save();g.translate(x+sign*125*scale(),y);g.rotate(Math.PI/4);g.fillRect(-6*scale(),-6*scale(),12*scale(),12*scale());g.restore();}
   const px=x+Math.sin(r.time*.65+o.phase)*95*scale();g.fillStyle='#eb696d';g.beginPath();g.ellipse(px,y,5*scale(),3.5*scale(),0,0,7);g.fill();g.fillStyle='#ffd9c2';g.beginPath();g.arc(px,y,2.4*scale(),0,7);g.fill();
   if(gap>-5&&gap<130)sensed.push({x:px,y,text:'Piéton · passage'});}
 }
 // Perception overlay: dashed rays from the car to what the driver should be tracking.
 if(model&&!r.crashed){g.strokeStyle='#4fc3f766';g.lineWidth=.8;g.setLineDash([3,5]);for(const s of sensed){if(s.quiet)continue;g.beginPath();g.moveTo(cx,cy-18*scale());g.lineTo(s.x,s.y);g.stroke();}g.setLineDash([]);for(const s of sensed)label(s.x+14*scale(),s.y-14*scale(),s.text);}
 if(!r.crashed){g.save();g.translate(cx,cy-18*scale());g.rotate(r.heading);g.fillStyle='#63d8eb12';g.beginPath();g.moveTo(-8,0);g.lineTo(-70*scale(),-240*scale());g.lineTo(70*scale(),-240*scale());g.lineTo(8,0);g.fill();g.strokeStyle='#52dbe44d';g.lineWidth=.7;g.setLineDash([4,8]);for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(0,0);g.lineTo(i*23*scale(),-240*scale());g.stroke();}g.setLineDash([]);g.restore();}
 if(r.speed>55&&!reduced){g.strokeStyle='#fff9';g.lineWidth=1;const n=Math.min(22,Math.floor(r.speed/8));for(let i=0;i<n;i++){const x=cx+(i%2?1:-1)*(24+i%5*9)*scale(),y=cy+30+((r.distance*9+i*37)%(h*.6));g.beginPath();g.moveTo(x,y);g.lineTo(x,y+Math.min(60,r.speed*.3));g.stroke();}}
 const jitter=r.speed>0&&!reduced&&!r.crashed?Math.sin(r.time*47)*Math.min(1.2,r.speed/120)*scale():0;
 const spin=r.crashed?Math.min(1,crashAge/.9):0,ease=spin*(2-spin),slide=ease*Math.min(70,(r.impactSpeed||30)*.9)*scale();
 vehicle(cx+jitter+ease*18*scale(),cy-slide,{color:'#f4f8fb',kind:'sedan',width:20,length:48,braking:keys.brake},r.crashed?r.heading+ease*2.6:r.heading,r.crashed);
 if(r.crashed){const ox=cx+ease*18*scale(),oy=cy-slide;for(let i=0;i<26;i++){const a=i*2.39,rad=Math.min(1,crashAge*1.6)*(30+i%5*9)*scale(),fall=Math.min(crashAge,1.2)*14;g.fillStyle=i%3?'#e8954c':i%2?'#dfe7ee':'#3c4854';g.fillRect(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad*.6+fall,3,i%2?6:3);}
  for(let i=0;i<7;i++){const age=(crashAge*.8+i*.37)%2.4;g.fillStyle=`rgba(60,66,75,${Math.max(0,.55-age*.22)})`;g.beginPath();g.arc(ox+Math.sin(i*2.1+crashAge)*10*scale(),oy-14*scale()-age*38,(8+age*16)*scale(),0,7);g.fill();}
  if(crashAge<.5){g.fillStyle=`rgba(255,240,200,${.9-crashAge*1.8})`;g.beginPath();g.arc(ox,oy-12*scale(),(20+crashAge*160)*scale(),0,7);g.fill();}}
 g.restore();
 if(r.crashed){const pulse=.28+.18*Math.sin(crashAge*6);const v=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.7);v.addColorStop(0,'rgba(200,20,40,0)');v.addColorStop(1,`rgba(200,20,40,${reduced?.35:pulse+.15})`);g.fillStyle=v;g.fillRect(0,0,w,h);g.strokeStyle='#ff3b50';g.lineWidth=10;g.strokeRect(5,5,w-10,h-10);}
 if(r.flash>0&&!r.crashed){g.fillStyle=`rgba(235,35,48,${reduced?.18:.12+.2*(.5+.5*Math.cos(r.flash*Math.PI*4))})`;g.fillRect(0,0,w,h);g.strokeStyle='#ff3b50';g.lineWidth=8;g.strokeRect(4,4,w-8,h-8);}
 if(model&&!r.crashed&&!paused)decisionPanel(r);
 $('road-hud').textContent=`${Math.round(r.speed)} km/h · limite ${r.limit} · ${Math.round(r.time)} / 90 s · ${r.violations||0} infraction(s)`;
 if(model){c.dataset.running=String(r.running&&!paused);c.dataset.speed=Math.round(r.speed);c.dataset.distance=Math.round(r.distance);c.dataset.collisions=r.collisions;c.dataset.violations=r.violations;c.dataset.crashed=String(r.crashed);c.dataset.limit=r.limit;if($('road-status').textContent!==r.message)$('road-status').textContent=r.message;}
}
// Impairment: blur, double vision and a warm tint grow with the estimated blood alcohol and the psychoactive setting.
// The accident / pause window sits on top of the game: it is drawn after the impairment pass, so it stays sharp.
function banner(r){if(!(r.crashed||paused||!model))return;const x=out;x.save();x.filter='none';x.globalAlpha=1;
 x.fillStyle='#0c1420bd';x.fillRect(0,h*.35,w,h*.26);x.strokeStyle=r.crashed?'#ff3b50':'#f3f8ff55';x.lineWidth=2;x.strokeRect(1,h*.35,w-2,h*.26);
 x.textAlign='center';x.fillStyle=r.crashed?'#ff6b74':'#f3f8ff';x.font=`bold ${Math.min(30,w/13)}px monospace`;x.fillText(r.crashed?'ACCIDENT':paused?'PAUSE':'PRENDRE LE VOLANT',w/2,h*.44);
 x.font='13px monospace';x.fillStyle='#fff';x.fillText(r.crashed?(r.message||'')+' Recommencer pour repartir.':paused?'Reprendre avec le bouton de conduite':'ZQSD · Maj gauche / Ctrl gauche',w/2,h*.50);x.restore();}
function present(r){const alcohol=Number(r.settings?.alcohol)||0,drug=r.settings?.drug==='none'?0:Number(r.settings?.level)||0,kind=r.settings?.drug;
 const blur=Math.min(7,alcohol*2.6+(kind==='sedating'?drug*4:drug*1.5)),ghost=Math.min(16,alcohol*7+(kind==='perception'?drug*14:drug*3)),sway=alcohol*3+(kind==='stimulating'?drug*6:drug*2);
 out.setTransform(1,0,0,1,0,0);out.clearRect(0,0,c.width,c.height);const d=Math.min(devicePixelRatio,1.75);out.setTransform(d,0,0,d,0,0);
 if(reduced||(blur<.05&&ghost<.05)){out.filter='none';out.globalAlpha=1;out.drawImage(buffer,0,0,w,h);banner(r);return;}
 const t=performance.now()/1000,dx=Math.cos(t*.9)*ghost,dy=Math.sin(t*1.3)*ghost*.5;
 out.filter=`blur(${blur.toFixed(2)}px) saturate(${(1-Math.min(.5,alcohol*.2)).toFixed(2)})`;
 out.globalAlpha=1;out.drawImage(buffer,Math.sin(t*1.1)*sway,Math.cos(t*.7)*sway*.6,w,h);
 out.globalAlpha=Math.min(.55,alcohol*.32+drug*.3);out.drawImage(buffer,dx,dy,w,h);
 out.filter='none';out.globalAlpha=1;
 if(alcohol>.2||drug>.2){const v=out.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.62);v.addColorStop(0,'rgba(20,10,0,0)');v.addColorStop(1,`rgba(20,10,0,${Math.min(.5,alcohol*.22+drug*.25).toFixed(2)})`);out.fillStyle=v;out.fillRect(0,0,w,h);}banner(r);}
function frame(t){const dt=Math.min(.04,(t-last)/1000||.016);last=t;if(model?.running&&!paused){model.step(dt,{...keys,gas:keys.gas||keys.up});if(!model.running&&!finished)finish();}if(model?.crashed){if(crashAge===0)crashSound();/* crashSound() silences the engine and the tyres itself */crashAge+=dt;}if(model)engineSound(model);render(dt);present(model||{settings:{}});requestAnimationFrame(frame);}c.redraw=()=>{render(.016);present(model||{settings:{}});};requestAnimationFrame(frame);
})();

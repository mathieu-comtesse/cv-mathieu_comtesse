(()=>{
'use strict';
const $=id=>document.getElementById(id),c=$('ink-canvas'),g=c.getContext('2d'),ink='#28558a',red='#aa514c',purple='#7c5d91';
let w=1000,h=650,last=0,t=0,run=false,score=0,lives=5,wave=1,charge=0,player=150,invul=0,aim={x:700,y:250},keys={},shots=[],enemies=[],barrels=[],sparks=[],animals=[],timer=0,muted=true,audio,shotClock=0,eventTimer=0,storm=null,notice='Prendre la mer';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function size(){const r=c.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio,1.7);c.width=w*d;c.height=h*d;g.setTransform(d,0,0,d,0,0);player=Math.min(player,w*.7);}new ResizeObserver(size).observe(c);size();
const sea=x=>h*.66+Math.sin(x*.017+t*1.4)*(storm?16:9)+Math.sin(x*.006-t)*5;
function line(points,color=ink,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
// Cached pen drawings: stable hatching avoids noisy redraws and keeps mobile rendering light.
const waveDrawings=Array.from({length:7},(_,variant)=>{
 const tile=document.createElement('canvas');tile.width=360;tile.height=160;
 const pen=tile.getContext('2d');pen.scale(2,2);
 let seed=8301+variant*971;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const crest=66+variant*6,top=12+variant%3*4;
 const shape=()=>{pen.beginPath();pen.moveTo(5,60);pen.bezierCurveTo(37,59,crest-22,top+10,crest,top);pen.bezierCurveTo(crest+22,top-9,crest+43,top+5,crest+33,top+17);pen.bezierCurveTo(crest+24,top+27,crest+12,top+14,crest+23,top+12);pen.bezierCurveTo(crest+2,top+18,crest+22,53,170,62);pen.bezierCurveTo(124,74,54,72,5,60);pen.closePath()};
 shape();pen.fillStyle='#f8f7e9';pen.fill();
 pen.save();shape();pen.clip();
 for(let i=0;i<420;i++){
  const x=random()*177,y=top+random()*60,length=7+random()*23;
  pen.strokeStyle=i%4?'#354a9a':'#1b3180';pen.globalAlpha=.4+random()*.45;pen.lineWidth=.3+random()*.55;
  pen.beginPath();pen.moveTo(x,y);pen.quadraticCurveTo(x+length*.3,y-4,x+length,y-9-random()*5);pen.stroke();
 }
 for(let i=0;i<36;i++){
  const x=15+random()*145,y=47+random()*22;pen.globalAlpha=.3;pen.lineWidth=.4;
  pen.beginPath();pen.moveTo(x,y);pen.lineTo(x+9,y+12);pen.stroke();
 }
 pen.restore();
 // A ragged double contour and untouched paper form the foam.
 for(let pass=0;pass<3;pass++){
  pen.save();pen.translate((random()-.5)*1.6,(random()-.5)*1.3);shape();pen.strokeStyle='#253885';pen.globalAlpha=pass?.38:.85;pen.lineWidth=pass?.45:1;pen.stroke();pen.restore();
 }
 pen.strokeStyle='#f8f7e9';pen.lineWidth=3;pen.beginPath();pen.moveTo(23,56);pen.bezierCurveTo(45,49,crest-10,top+3,crest+8,top+3);pen.stroke();
 pen.strokeStyle='#344999';pen.lineWidth=.65;
 for(let i=0;i<10;i++){
  const x=25+i*13,y=68+Math.sin(i+variant)*3;pen.beginPath();pen.moveTo(x,y);pen.quadraticCurveTo(x+7,y+2,x+14,y-1);pen.stroke();
 }
 for(let i=0;i<6;i++){
  const x=crest-19+random()*40,y=top-3-random()*8;pen.beginPath();pen.ellipse(x,y,.6+random()*.7,1.1+random(),.6,0,Math.PI*2);pen.stroke();
 }
 return tile;
});
function drawSea(){
 g.save();
 // Three fine, imperfect strokes follow the exact gameplay waterline.
 for(let pass=0;pass<3;pass++){
  const pts=[];for(let x=0;x<=w+5;x+=5)pts.push([x,sea(x)+pass*1.6+Math.sin(x*.31+pass)*.65]);
  g.globalAlpha=pass?.38:.75;line(pts,'#293c91',pass?.55:.9);
 }
 const rows=Math.ceil(h*.34/27)+2;
 for(let row=0;row<rows;row++){
  const scale=.53+row*.065,spacing=150*scale,drift=(t*(row%2?5:-7))%spacing;
  g.globalAlpha=Math.max(.48,.95-row*.035);
  for(let col=-2;col<Math.ceil(w/spacing)+2;col++){
   const x=col*spacing+(row%2)*spacing*.5+drift+Math.sin(col*7.1+row*2.8)*18;
   const variant=((col+row*3)%7+7)%7;
   const y=sea(x)+12+row*26+Math.sin(col*2.7+row)*9;
   const stretch=.88+Math.sin(col*4.9+row)*.18;g.drawImage(waveDrawings[variant],x,y-20*scale,180*scale*stretch,80*scale);
  }
 }
 g.restore();
}
function wake(x,y,scale=1){
 g.save();g.translate(x,y+11*scale);g.scale(scale,scale);
 for(let row=0;row<4;row++){
  const pts=[];for(let dx=-53;dx<=53;dx+=4)pts.push([dx,row*2.5+Math.sin(dx*.14+t*2+row)*1.4]);
  g.globalAlpha=.8-row*.14;line(pts,row%2?'#293c91':'#f8f7e9',row%2?.6:1.8);
 }g.restore();
}
const sheet=new Image();sheet.src='armada-sprites.png';
const sprites={blue:[0,45,430,421],red:[431,62,403,390],pirate:[836,30,419,423],cloud:[0,529,449,274],island:[457,470,365,388],lighthouse:[863,450,374,414],kraken:[53,845,364,384],barrel:[500,851,302,381],blast:[832,859,417,377]};
function sprite(name,x,y,width,height){if(!sheet.complete||!sheet.naturalWidth)return;g.drawImage(sheet,...sprites[name],x,y,width,height)}
function cloud(x,y,s=1){sprite('cloud',x-52*s,y-32*s,104*s,64*s)}
const expedition=new Image();expedition.src='armada-expedition.png';
const extras={brig:[0,55,403,397],galleon:[403,0,439,453],dutch:[842,0,412,452],shark:[0,470,418,370],dolphin:[420,470,418,370],octopus:[839,457,415,387],serpent:[0,846,420,404],storm:[426,837,407,412]};
function art(name,x,y,width,height){if(extras[name]&&expedition.complete&&expedition.naturalWidth)g.drawImage(expedition,...extras[name],x,y,width,height);else if(!extras[name])sprite(name,x,y,width,height);}
function ship(e,isPlayer=false){const y=sea(e.x),width=e.width||127,height=e.height||130;g.save();g.translate(e.x,y);g.rotate(Math.sin(t+e.x)*(storm?.09:.035));if(e.flash>0)g.globalAlpha=.6;art(isPlayer?'blue':e.sprite,-width/2,-height+12,width,height);g.restore();wake(e.x,y,width/102);if(!isPlayer){g.fillStyle='#314676';g.fillRect(e.x-width*.3,y-height-1,width*.6,3);g.fillStyle='#b26067';g.fillRect(e.x-width*.3,y-height-1,width*.6*e.hp/e.maxHp,3);}}
function update(){$('ink-score').textContent=`Vague ${wave} · ${lives} vies · Score ${score} · Encre ${Math.floor(charge)} %`;$('ink-event').textContent=notice;c.dataset.score=score;c.dataset.wave=wave;c.dataset.lives=lives;c.dataset.running=run;c.dataset.enemies=enemies.map(e=>e.type).join(',');c.dataset.animals=animals.map(a=>a.type).join(',');c.dataset.storm=String(!!storm);}
function sound(freq=130){if(muted)return;audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(35,audio.currentTime+.15);v.gain.setValueAtTime(.06,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+.19);}
function creature(type){const hp={dolphin:1,shark:3,octopus:14,serpent:10}[type];animals.push({type,x:w*.8+60,hp,maxHp:hp,age:0,attack:2});notice={dolphin:'Dauphins — naviguer à leurs côtés pour gagner de l’encre',shark:'Requins — éviter leurs bonds',octopus:'Pieuvre géante — repousser les tentacules',serpent:'Serpent de mer — éviter les projections'}[type];}
function hurricane(){storm={age:0,x:w*.82};notice='Ouragan — compenser le vent et éviter la trombe';}
function spawn(){const selected=$('ink-expedition').value;let types=wave===1?['brig','frigate']:wave%4===0?['dutch','galleon']:wave%2===0?['galleon','brig']:['frigate','brig','brig'];if(wave===1&&selected==='galleon')types=['galleon','galleon'];if(wave===1&&selected==='dutch')types=['dutch'];for(let i=0;i<types.length;i++)enemies.push(ArmadaModel.enemy(types[i],w*.78+i*180));barrels.push({x:w*.45+Math.random()*w*.25});notice=types.map(type=>{const e=ArmadaModel.ships[type];return `${e.name} · ${e.tons} t · ${e.cannons} canons`;}).join(' / ');if(wave===1){if(['octopus','shark','dolphin','serpent'].includes(selected))creature(selected);if(selected==='storm')hurricane();}}
function start(){run=true;score=0;lives=5;wave=1;charge=0;player=w*.20;shots=[];enemies=[];animals=[];barrels=[];sparks=[];timer=0;eventTimer=0;storm=null;invul=0;shotClock=0;keys={};$('ink-start').textContent='Recommencer';spawn();update();c.focus();}
function shoot(){if(!run||shotClock>0)return;const y=sea(player)-30,dx=aim.x-player,dy=aim.y-y,len=Math.hypot(dx,dy)||1;shots.push({x:player,y,vx:dx/len*370,vy:dy/len*370-25,friend:true,bounces:0});shotClock=.25;sound(170);c.dataset.shots=shots.length;}
function explosion(x,y,color=red){for(let i=0;i<18;i++){const a=Math.random()*7,s=35+Math.random()*100;sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4+Math.random()*.6,color});}sound(80);}
function damage(){if(invul>0||!run)return;lives--;invul=1.8;explosion(player,sea(player),ink);if(lives<=0){run=false;$('ink-start').textContent='Reprendre la mer';notice='Navire coulé — recommencer une expédition';}update();}
function burst(){if(!run||charge<100)return;charge=0;for(const e of enemies){e.hp-=4;explosion(e.x,sea(e.x));}for(const a of animals)if(a.type!=='dolphin')a.hp-=5;shots=shots.filter(s=>s.friend);update();}
c.onpointermove=e=>{const r=c.getBoundingClientRect();aim={x:e.clientX-r.left,y:e.clientY-r.top};};c.onpointerdown=e=>{if(e.button!==0)return;c.focus();const r=c.getBoundingClientRect();aim={x:e.clientX-r.left,y:e.clientY-r.top};if(!run)start();else shoot();};
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(['q','d','a','arrowleft','arrowright',' '].includes(key)){e.preventDefault();keys[key]=true;if(key===' ')burst();}});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',()=>keys={});
for(const [id,key] of [['ink-left','q'],['ink-right','d']]){$(id).onpointerdown=e=>{e.preventDefault();e.target.setPointerCapture(e.pointerId);keys[key]=true;};$(id).onpointerup=$(id).onpointercancel=$(id).onlostpointercapture=()=>keys[key]=false;}
$('ink-burst').onclick=burst;$('ink-start').onclick=start;$('ink-expedition').onchange=start;$('ink-sound').onclick=e=>{muted=!muted;e.target.textContent=muted?'Son : non':'Son : oui';e.target.setAttribute('aria-pressed',!muted);if(!muted)sound(200);};
function simulate(dt){
 timer+=dt;eventTimer+=dt;shotClock=Math.max(0,shotClock-dt);invul=Math.max(0,invul-dt);charge=Math.min(100,charge+dt*4);
 const wind=storm?Math.sin(storm.age*.7)*35+20:0;
 player=Math.max(50,Math.min(w-50,player+((keys.d||keys.arrowright?1:0)-(keys.q||keys.a||keys.arrowleft?1:0))*155*dt+wind*dt));
 for(const e of enemies){e.x-=e.speed*dt;e.fire-=dt;e.flash=Math.max(0,e.flash-dt);if(e.fire<0){e.fire=3.5+e.cannons*.12;for(let n=0;n<e.cannons;n++){const sx=e.x+(n/(e.cannons-1)-.5)*e.width*.5,dx=player-sx;shots.push({x:sx,y:sea(e.x)-18,vx:Math.sign(dx)*(105+wave*5+n*2),vy:-80-n*5,friend:false,bounces:0});}sound(65);}if(Math.abs(e.x-player)<e.width*.34+24||e.x<-e.width){e.hp=0;damage();}}
 if(eventTimer>15){eventTimer=0;const index=Math.floor(timer/15)%6;if(index===5)hurricane();else creature(['dolphin','shark','dolphin','octopus','serpent'][index]);}
 if(storm){storm.age+=dt;storm.x=w*.72+Math.sin(storm.age*.35)*w*.18;if(Math.abs(player-storm.x)<32)damage();if(storm.age>18){storm=null;notice='Accalmie — poursuivre la traversée';}}
 for(const a of animals){a.age+=dt;a.attack-=dt;a.x-=dt*(a.type==='dolphin'?45:a.type==='shark'?32:9);if(a.type==='dolphin'&&Math.abs(a.x-player)<50&&!a.helped){a.helped=true;charge=Math.min(100,charge+25);score+=100;notice='Escorte de dauphins : +25 % d’encre';}
  if(a.type!=='dolphin'&&Math.abs(a.x-player)<(a.type==='octopus'?90:40)&&Math.sin(a.age*2)>0)damage();
  if(a.type==='serpent'&&a.attack<0){a.attack=3;shots.push({x:a.x,y:sea(a.x)-80,vx:(player-a.x)*.5,vy:-40,friend:false,bounces:0});}
 }
 for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.vx+=wind*.12*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=95*dt;let remove=false;
  if(s.y>sea(s.x)){if(s.friend&&s.bounces<2&&Math.abs(s.vy)<165){s.y=sea(s.x)-2;s.vy=-Math.abs(s.vy)*.7;s.bounces++;}else remove=true;}
  if(!remove&&s.friend){const e=enemies.find(e=>e.hp>0&&Math.abs(s.x-e.x)<e.width*.38&&s.y>sea(e.x)-e.height*.8&&s.y<sea(e.x)+12);if(e){e.hp--;e.flash=.12;score+=60;charge=Math.min(100,charge+9);explosion(s.x,s.y);remove=true;}
   if(!remove){const a=animals.find(a=>a.type!=='dolphin'&&a.hp>0&&Math.abs(s.x-a.x)<(a.type==='octopus'?70:40)&&s.y>sea(a.x)-(a.type==='octopus'?125:85)&&s.y<sea(a.x)+20);if(a){a.hp--;score+=80;explosion(s.x,s.y,purple);remove=true;}}
   if(!remove){const index=barrels.findIndex(b=>Math.hypot(s.x-b.x,s.y-(sea(b.x)-10))<20);if(index>=0){const b=barrels.splice(index,1)[0];explosion(b.x,sea(b.x),'#c07b39');for(const e of enemies)if(Math.abs(e.x-b.x)<160)e.hp-=4;score+=150;remove=true;}}
  }else if(!remove&&!s.friend&&Math.abs(s.x-player)<35&&s.y>sea(player)-65&&s.y<sea(player)+10){damage();remove=true;}
  if(s.x<-80||s.x>w+100||s.y>h+40)remove=true;if(remove)shots.splice(i,1);
 }
 enemies=enemies.filter(e=>{if(e.hp<=0){score+=150;explosion(e.x,sea(e.x));return false;}return true;});
 animals=animals.filter(a=>{if(a.hp<=0){score+=300;explosion(a.x,sea(a.x),purple);return false;}return a.x>-180;});
 if(!enemies.length&&timer>2){wave++;spawn();}update();
}
function drawWeather(){if(!storm)return;g.save();g.globalAlpha=.86;art('storm',storm.x-100,h*.17,200,h*.49);g.globalAlpha=.5;for(let j=0;j<70;j++){const x=(j*47+t*135)%w,y=(j*71+t*220)%h;line([[x,y],[x-15,y+21]],'#554776',.65);}g.restore();}
function render(dt){
 g.fillStyle='#f8f7e9';g.fillRect(0,0,w,h);g.strokeStyle='#dce1d4';g.lineWidth=.6;for(let y=15;y<h;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}line([[45,0],[45,h]],'#e6b6aa',1);
 for(let i=0;i<4;i++)cloud((i*w/3+t*3)%(w+130)-65,125+(i%2)*42,.65+i*.1);
 sprite('island',w*.02,h*.40,130,145);sprite('lighthouse',w*.84,h*.35,110,160);drawWeather();drawSea();
 for(const a of animals){const y=sea(a.x),jump=Math.max(0,Math.sin(a.age*2))*45;if(a.type==='octopus')art(a.type,a.x-85,y-125+Math.sin(a.age)*8,170,155);else if(a.type==='serpent')art(a.type,a.x-55,y-105,110,130);else art(a.type,a.x-48,y-45-jump,96,85);}
 for(const b of barrels)sprite('barrel',b.x-14,sea(b.x)-36,28,40);for(const e of enemies)ship(e);if(invul===0||reduced||Math.floor(t*8)%2)ship({x:player},true);
 for(const s of shots){g.fillStyle=s.friend?ink:purple;g.beginPath();g.arc(s.x,s.y,3.5,0,7);g.fill();line([[s.x-s.vx*.035,s.y-s.vy*.035],[s.x,s.y]],s.friend?ink:purple,.6);}
 for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;line([[s.x,s.y],[s.x-s.vx*.06,s.y-s.vy*.06]],s.color,1);if(s.life<0)sparks.splice(i,1);}
 g.strokeStyle=red;g.lineWidth=.8;g.beginPath();g.arc(aim.x,aim.y,8,0,7);g.stroke();line([[aim.x-13,aim.y],[aim.x+13,aim.y]],red);line([[aim.x,aim.y-13],[aim.x,aim.y+13]],red);
 if(!run){g.fillStyle='#f8f7e9ed';g.fillRect(w*.08,h*.29,w*.84,100);g.fillStyle=ink;g.font=`${Math.min(24,w/19)}px Georgia`;g.textAlign='center';g.fillText(lives<=0?'Navire coulé — reprendre la mer':'Explorer une mer dessinée à l’encre',w/2,h*.29+36);g.font='14px Georgia';g.fillText('Choisir une expédition ou cliquer pour commencer',w/2,h*.29+65);g.textAlign='left';}
}
function frame(now){const dt=Math.min(.035,(now-last)/1000||.016);last=now;t+=dt;if(run)simulate(dt);render(dt);requestAnimationFrame(frame);}update();requestAnimationFrame(frame);
})();

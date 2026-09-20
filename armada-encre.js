(()=>{const $=id=>document.getElementById(id),c=$('ink-canvas'),g=c.getContext('2d');let w=1000,h=650,last=0,t=0,run=false,score=0,lives=4,wave=1,charge=0,player=150,invul=0,aim={x:700,y:250},keys={},shots=[],enemies=[],barrels=[],sparks=[],timer=0,boss=null,muted=true,audio,shotClock=0;const ink='#28558a',red='#aa514c',purple='#7c5d91';
function size(){const r=c.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio,1.7);c.width=w*d;c.height=h*d;g.setTransform(d,0,0,d,0,0);player=Math.min(player,w*.7)}new ResizeObserver(size).observe(c);size();const sea=x=>h*.66+Math.sin(x*.017+t*1.4)*9+Math.sin(x*.006-t)*5;
function line(points,color=ink,width=1){g.strokeStyle=color;g.lineWidth=width;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()}function poly(points,color=ink,fill='#f8f7e9'){g.fillStyle=fill;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.strokeStyle=color;g.lineWidth=1.2;g.stroke();for(let j=0;j<2;j++)line(points.map(([x,y])=>[x+Math.sin(x+j)*.65,y+Math.cos(y+j)*.6]),color,.45)}
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
function ship(x,y,color=ink,scale=1,angle=0){g.save();g.translate(x,y);g.rotate(angle);const name=color===ink?'blue':color===red?'red':'pirate';sprite(name,-51*scale,-88*scale,102*scale,100*scale);g.restore();wake(x,y,scale)}
function cloud(x,y,s=1){sprite('cloud',x-52*s,y-32*s,104*s,64*s)}
function update(){$('ink-score').textContent=`Vague ${wave} · ${lives} vies · Score ${score} · Encre ${Math.floor(charge)} %`;c.dataset.score=score;c.dataset.wave=wave;c.dataset.lives=lives;c.dataset.running=run;}
function sound(freq=130){if(muted)return;audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(35,audio.currentTime+.15);v.gain.setValueAtTime(.08,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+.19)}
function start(){run=true;score=0;lives=4;wave=1;charge=0;player=w*.2;shots=[];enemies=[];barrels=[];sparks=[];boss=null;timer=0;invul=0;$('ink-start').textContent='Recommencer';spawn();update()}
function spawn(){for(let i=0;i<Math.min(5,1+wave);i++)enemies.push({x:w*.8+i*170,hp:wave>=5?4:2,fire:1.5+i*.6,speed:14+wave*3,color:wave>=5?'#32263e':red});barrels.push({x:w*.55+Math.random()*w*.3});if(wave%3===0)boss={x:w*.78,hp:5+wave,phase:0};}
function shoot(){if(!run||shotClock>0)return;const py=sea(player)-30,dx=aim.x-player,dy=aim.y-py,len=Math.hypot(dx,dy)||1;shots.push({x:player,y:py,vx:dx/len*330,vy:dy/len*330-25,friend:true,bounces:0});shotClock=.28;sound(170);c.dataset.shots=shots.length;}
function explosion(x,y,color=red){for(let i=0;i<22;i++){const a=Math.random()*7,s=35+Math.random()*100;sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4+Math.random()*.6,color})}sound(80)}
function damage(){if(invul>0)return;lives--;invul=1.5;explosion(player,sea(player),ink);if(lives<=0){run=false;$('ink-start').textContent='Reprendre la mer'}update()}
function burst(){if(!run||charge<100)return;charge=0;for(const e of enemies){e.hp-=3;explosion(e.x,sea(e.x))}if(boss)boss.hp-=4;shots=shots.filter(s=>s.friend);update()}
c.onpointermove=e=>{const r=c.getBoundingClientRect();aim={x:e.clientX-r.left,y:e.clientY-r.top}};c.onpointerdown=e=>{const r=c.getBoundingClientRect();aim={x:e.clientX-r.left,y:e.clientY-r.top};if(!run)start();else shoot()};window.addEventListener('keydown',e=>{if(/INPUT|SELECT/.test(e.target.tagName))return;if(['q','d','a','ArrowLeft','ArrowRight',' '].includes(e.key)){e.preventDefault();keys[e.key]=true;if(e.key===' ')burst()}});window.addEventListener('keyup',e=>keys[e.key]=false);window.addEventListener('blur',()=>keys={});for(const [id,key] of [['ink-left','q'],['ink-right','d']]){$(id).onpointerdown=e=>{e.preventDefault();e.target.setPointerCapture(e.pointerId);keys[key]=true};$(id).onpointerup=$(id).onpointercancel=()=>keys[key]=false}$('ink-burst').onclick=burst;$('ink-start').onclick=start;$('ink-sound').onclick=e=>{muted=!muted;e.target.textContent=muted?'Son : non':'Son : oui';e.target.setAttribute('aria-pressed',!muted);if(!muted)sound(200)};
function frame(now){const dt=Math.min(.035,(now-last)/1000||.016);last=now;t+=dt;if(run){timer+=dt;shotClock=Math.max(0,shotClock-dt);invul=Math.max(0,invul-dt);charge=Math.min(100,charge+dt*3);player=Math.max(50,Math.min(w-50,player+((keys.d||keys.ArrowRight?1:0)-(keys.q||keys.a||keys.ArrowLeft?1:0))*135*dt));for(const e of enemies){e.x-=e.speed*dt;e.fire-=dt;if(e.fire<0){e.fire=2+Math.random()*2;const dx=player-e.x;shots.push({x:e.x,y:sea(e.x)-35,vx:Math.sign(dx)*(100+wave*4),vy:-100-Math.random()*65,friend:false,bounces:0})}if(Math.abs(e.x-player)<50||e.x<-60){e.hp=0;damage()}}
for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=95*dt;let remove=false;if(s.y>sea(s.x)){if(s.friend&&s.bounces<2&&Math.abs(s.vy)<160){s.y=sea(s.x)-2;s.vy=-Math.abs(s.vy)*.7;s.bounces++}else remove=true}if(s.friend){for(const e of enemies)if(e.hp>0&&Math.abs(s.x-e.x)<40&&s.y>sea(e.x)-75&&s.y<sea(e.x)+15){e.hp--;score+=75;charge=Math.min(100,charge+12);explosion(s.x,s.y);remove=true;break}if(boss&&Math.abs(s.x-boss.x)<26&&s.y>sea(boss.x)-140){boss.hp--;remove=true;score+=100;explosion(s.x,s.y,purple)}for(let j=barrels.length-1;j>=0;j--)if(Math.hypot(s.x-barrels[j].x,s.y-(sea(barrels[j].x)-8))<22){const bx=barrels[j].x;explosion(bx,sea(bx),'#c07b39');for(const e of enemies)if(Math.abs(e.x-bx)<170)e.hp-=3;barrels.splice(j,1);score+=150;remove=true}}else if(Math.abs(s.x-player)<35&&s.y>sea(player)-65&&s.y<sea(player)+10){damage();remove=true}if(s.x<-60||s.x>w+80||s.y>h+40)remove=true;if(remove)shots.splice(i,1)}enemies=enemies.filter(e=>{if(e.hp<=0){score+=100;explosion(e.x,sea(e.x));return false}return true});if(boss){boss.phase+=dt;if(Math.abs(player-boss.x)<38&&Math.sin(boss.phase)>0)damage();if(boss.hp<=0){explosion(boss.x,sea(boss.x),purple);score+=500;boss=null}}if(!enemies.length&&!boss&&timer>2){wave++;timer=0;spawn()}update()}
g.fillStyle='#f8f7e9';g.fillRect(0,0,w,h);g.strokeStyle='#dce1d4';g.lineWidth=.6;for(let y=15;y<h;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}g.strokeStyle='#e6b6aa';g.beginPath();g.moveTo(45,0);g.lineTo(45,h);g.stroke();for(let i=0;i<4;i++)cloud((i*w/3+t*3)%(w+130)-65,115+(i%2)*42,.65+i*.1);g.strokeStyle='#c58b4c';g.beginPath();g.arc(w*.83,150,21,0,7);g.stroke();for(let a=0;a<6.3;a+=.32)line([[w*.83+Math.cos(a)*26,150+Math.sin(a)*26],[w*.83+Math.cos(a)*35,150+Math.sin(a)*35]],'#c58b4c');
drawSea();sprite('island',w*.02,h*.40,130,145);sprite('lighthouse',w*.84,h*.35,110,160);if(wave>=3){for(let j=0;j<5;j++)cloud(w*j/4,82,.95);if(run)for(let j=0;j<60;j++){const rx=(j*43+t*95)%w,ry=(j*71+t*180)%(h*.55);line([[rx,ry],[rx-19,ry+23]],'#797982',.35)}}
if(boss)sprite('kraken',boss.x-38,sea(boss.x)-150,85,160);for(const b of barrels)sprite('barrel',b.x-14,sea(b.x)-36,28,40);for(const e of enemies)ship(e.x,sea(e.x),e.color,e.hp>3?1.6:1.25,Math.sin(t+e.x)*.06);if(invul===0||Math.floor(t*10)%2)ship(player,sea(player),ink,1.25,Math.sin(t+player)*.045);for(const s of shots){g.fillStyle=s.friend?ink:purple;g.beginPath();g.arc(s.x,s.y,3.5,0,7);g.fill();line([[s.x-s.vx*.035,s.y-s.vy*.035],[s.x,s.y]],s.friend?ink:purple,.5)}for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;line([[s.x,s.y],[s.x-s.vx*.06,s.y-s.vy*.06]],s.color,1);if(s.life<0)sparks.splice(i,1)}g.strokeStyle=red;g.lineWidth=.8;g.beginPath();g.arc(aim.x,aim.y,8,0,7);g.stroke();line([[aim.x-13,aim.y],[aim.x+13,aim.y]],red);line([[aim.x,aim.y-13],[aim.x,aim.y+13]],red);if(!run){g.fillStyle='#f8f7e9e8';g.fillRect(w*.2,h*.3,w*.6,90);g.fillStyle=ink;g.font='24px Georgia';g.textAlign='center';g.fillText(lives<=0?'Navire coulé — à toi de rejouer':'Prends la mer sur une page de cahier',w/2,h*.3+35);g.font='15px Georgia';g.fillText('Clique pour commencer',w/2,h*.3+65);g.textAlign='left'}requestAnimationFrame(frame)}update();requestAnimationFrame(frame);})();

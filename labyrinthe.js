(()=>{
'use strict';
const $=id=>document.getElementById(id),map=$('maze-map'),view=$('maze-view'),timeline=$('maze-timeline'),mg=map.getContext('2d'),vg=view.getContext('2d'),tg=timeline.getContext('2d'),{Maze,directions}=MazeModel;
let maze,auto=false,elapsed=0,last=0,accumulator=0,from={x:1,y:1},moveAt=0,options=[],decisions=[],asked=0,queue=[],codeSeed=1,codes=new Map();
const names=['haut','droite','bas','gauche'],verbs=['monter','aller à droite','descendre','aller à gauche'];
const patterns=Array.from({length:8},(_,k)=>{const c=document.createElement('canvas');c.width=c.height=4;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,4,4);g.fillStyle='#16151a';const b=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];for(let i=0;i<16;i++)if(b[i]<k*2)g.fillRect(i%4,Math.floor(i/4),1,1);return vg.createPattern(c,'repeat');});
$('maze-date').textContent=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
const code=key=>{if(!codes.has(key)){codeSeed=(codeSeed*1103515245+12345)>>>0;const a='BCDFGHJKLMNPQRSTVWXZ';codes.set(key,a[codeSeed%20]+a[Math.floor(codeSeed/20)%20]);}return codes.get(key);};
// A junction is any open cell with more than two exits; corridors are walked through in one option.
const exits=(x,y)=>directions.filter(([dx,dy])=>maze.open(x+dx,y+dy)).length;
function buildOptions(){
 options=[];
 for(let dir=0;dir<4;dir++){const [dx,dy]=directions[dir];if(!maze.open(maze.x+dx,maze.y+dy))continue;
  let n=0,x=maze.x,y=maze.y,fresh=0;while(maze.open(x+dx,y+dy)){x+=dx;y+=dy;n++;if(!maze.visits.has(x+','+y))fresh++;if(n>1&&exits(x,y)>2)break;}
  const goal=Math.abs(maze.size-2-x)+Math.abs(maze.size-2-y),before=Math.abs(maze.size-2-maze.x)+Math.abs(maze.size-2-maze.y);
  const seen=maze.visits.get(x+','+y)||0;
  const score=fresh*1.1+(before-goal)*.18-seen*1.6-(dir===(maze.facing+2)%4?.9:0)+(exits(x,y)>2?.4:0);
  options.push({dir,n,x,y,fresh,score,code:code(x+','+y),text:`${verbs[dir]} de ${n} case${n>1?'s':''}${exits(x,y)>2?' jusqu’au carrefour':maze.open(x+dx,y+dy)?'':' jusqu’au mur'}`});
 }
 const max=Math.max(...options.map(o=>o.score)),sum=options.reduce((s,o)=>s+Math.exp((o.score-max)*1.4),0);
 for(const o of options)o.p=Math.exp((o.score-max)*1.4)/sum;
 options.sort((a,b)=>b.p-a.p);
}
function sightLine(dir){const [dx,dy]=directions[dir];let n=maze.sight(dir);if(!n)return '#';let out='';for(let i=1;i<=n;i++){const x=maze.x+dx*i,y=maze.y+dy*i,left=directions[(dir+3)%4],right=directions[(dir+1)%4];const l=maze.open(x+left[0],y+left[1]),r=maze.open(x+right[0],y+right[1]);const opt=options.find(o=>o.x===x&&o.y===y);out+=opt?opt.code:l&&r?'+':l?'<':r?'>':'-';out+=' ';}return out+'#';}
function update(){
 buildOptions();
 $('maze-size-label').textContent='×'+maze.size;
 $('maze-state').textContent=`pas ${maze.steps} · demandes ${asked}`;$('maze-shortest').textContent=`plus court ${maze.shortest}`;
 $('maze-bearing').textContent=`regard ${names[maze.facing]} · mur à ${maze.sight(maze.facing)} case${maze.sight(maze.facing)>1?'s':''}`;
 let tokens=0;for(let i=0;i<4;i++){const line=sightLine(i);tokens+=line.replace(/\s/g,'').length;$('maze-sight-'+i).textContent=line;}
 $('maze-tokens').textContent=`${tokens} tok`;
 const menu=$('maze-menu');menu.replaceChildren();
 options.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.className='maze-option'+(i===0?' is-best':'');b.disabled=maze.won;b.innerHTML=`<span class="code">${o.code}</span><span>${o.text}</span><span class="bar"><i style="width:${Math.round(o.p*100)}%"></i></span><span class="value">${o.p.toFixed(2)}</span>`;b.onclick=()=>choose(o,true);menu.append(b);});
 $('maze-menu-meta').textContent=maze.won?'sortie atteinte':`${options.length} option${options.length>1?'s':''} · confiance ${(options[0]?.p||0).toFixed(2)}`;
 const seen=maze.seen.flat().filter(Boolean).length/(maze.size*maze.size);
 $('st-steps').textContent=maze.steps;$('st-asked').textContent=asked;$('st-menu').textContent=(decisions.length?(decisions.reduce((s,d)=>s+d.options,0)/decisions.length).toFixed(1):'0')+' moy.';$('st-back').textContent=maze.backtracks;$('st-seen').textContent=Math.round(seen*100)+' %';
 $('maze-decisions').textContent=`${decisions.length} décision${decisions.length>1?'s':''}`;
 map.dataset.steps=maze.steps;map.dataset.won=maze.won;map.dataset.options=options.length;
 if(maze.won){auto=false;queue=[];$('maze-auto').textContent='Exploration terminée';}
}
function choose(o,manual){if(maze.won)return;asked++;decisions.push({options:options.length,p:o.p,back:o.fresh===0});queue=Array.from({length:o.n},()=>o.dir);if(manual){auto=false;$('maze-auto').textContent='Explorer automatiquement';}maze.facing=o.dir;update();}
function step(dir){from={x:maze.x,y:maze.y};if(maze.move(dir))moveAt=performance.now();update();}
function newMaze(){maze=new Maze(+$('maze-size').value,Math.floor(Math.random()*4294967295));auto=false;elapsed=0;accumulator=0;from={x:1,y:1};moveAt=0;asked=0;decisions=[];queue=[];codes=new Map();$('maze-auto').textContent='Explorer automatiquement';update();}
$('maze-new').onclick=newMaze;$('maze-size').onchange=newMaze;
$('maze-auto').onclick=()=>{if(maze.won)return;auto=!auto;$('maze-auto').textContent=auto?'Suspendre l’exploration':'Explorer automatiquement';};
// AZERTY first: Z/Q/S/D and the arrows move north/west/south/east on the map; A/E turn the view.
const keyDirs={z:0,arrowup:0,d:1,arrowright:1,s:2,arrowdown:2,q:3,arrowleft:3,w:0,a:3};
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(!(key in keyDirs)&&key!=='e')return;e.preventDefault();auto=false;queue=[];$('maze-auto').textContent='Explorer automatiquement';if(key==='e')maze.facing=(maze.facing+1)%4;else if(key==='a')maze.facing=(maze.facing+3)%4;else{const dir=keyDirs[key];if(maze.open(maze.x+directions[dir][0],maze.y+directions[dir][1]))step(dir);else maze.facing=dir;}update();});
function drawMap(){const n=maze.size,size=map.width,unit=size/n;mg.fillStyle='white';mg.fillRect(0,0,size,size);
 // Unseen cells are hatched, seen walls are solid: the map only knows what the line of sight revealed.
 mg.strokeStyle='#c9c8cf';mg.lineWidth=1;for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(maze.seen[y][x]){if(maze.grid[y][x]){mg.fillStyle='#111';mg.fillRect(x*unit,y*unit,Math.ceil(unit),Math.ceil(unit));}}else if((x+y)%2===0){mg.beginPath();mg.moveTo(x*unit,y*unit+unit);mg.lineTo(x*unit+unit,y*unit);mg.stroke();}}
 mg.strokeStyle='#f640a0';mg.lineWidth=Math.max(1,unit*.16);mg.beginPath();maze.trail.forEach(([x,y],i)=>i?mg.lineTo((x+.5)*unit,(y+.5)*unit):mg.moveTo((x+.5)*unit,(y+.5)*unit));mg.stroke();
 mg.fillStyle='#e7c822';mg.fillRect((n-2)*unit,(n-2)*unit,unit,unit);
 for(const o of options){mg.fillStyle='#08080a';mg.font=`bold ${Math.max(8,unit*.9)}px monospace`;mg.textAlign='center';mg.fillText(o.code,(o.x+.5)*unit,(o.y+.5)*unit+unit*.32);}
 mg.fillStyle='#00a68a';mg.beginPath();mg.arc((maze.x+.5)*unit,(maze.y+.5)*unit,unit*.42,0,7);mg.fill();}
function drawView(now){const width=view.width,height=view.height,u=Math.min(1,(now-moveAt)/120),px=from.x+(maze.x-from.x)*u+.5,py=from.y+(maze.y-from.y)*u+.5,angle=(maze.facing-1)*Math.PI/2;
 vg.fillStyle='#fdfcfc';vg.fillRect(0,0,width,height/2);vg.fillStyle=patterns[2];vg.fillRect(0,height/2,width,height/2);
 for(let column=0;column<width;column+=2){const delta=Math.atan((column/width-.5)*1.25),a=angle+delta,dx=Math.cos(a),dy=Math.sin(a);let dist=0,hitX=px,hitY=py;while(dist<maze.size){dist+=.035;hitX=px+dx*dist;hitY=py+dy*dist;if(!maze.open(Math.floor(hitX),Math.floor(hitY)))break;}const corrected=Math.max(.12,dist*Math.cos(delta)),wall=Math.min(height*3,height/corrected),shade=Math.min(7,Math.max(2,Math.floor(corrected*.8)+((hitX%1<.06||hitX%1>.94)?1:0)));vg.fillStyle=patterns[shade];vg.fillRect(column,(height-wall)/2,2,wall);if(Math.min(hitX%1,hitY%1)<.055){vg.fillStyle='#16151a55';vg.fillRect(column,(height-wall)/2,1,wall);} }
 if(maze.won){vg.fillStyle='#fffddd';vg.fillRect(width*.2,height*.36,width*.6,height*.28);vg.fillStyle='#111';vg.font='bold 24px monospace';vg.textAlign='center';vg.fillText('SORTIE ATTEINTE',width/2,height*.54);vg.textAlign='left';}
}
function drawTimeline(){const w=timeline.width,h=timeline.height;tg.fillStyle='#fff';tg.fillRect(0,0,w,h);const n=Math.max(60,decisions.length),bw=w/n;decisions.forEach((d,i)=>{tg.fillStyle=d.back?'#f640a0':'#08080a';const bh=4+Math.min(1,d.options/4)*(h-8);tg.fillRect(i*bw,h-bh,Math.max(1,bw-1),bh);});tg.fillStyle='#4ed6c8';tg.fillRect(0,h-3,w*Math.min(1,maze.steps/Math.max(1,maze.shortest*3)),3);}
function frame(now){const dt=Math.min(.1,(now-last)/1000||0);last=now;if(maze.steps&&!maze.won)elapsed+=dt;
 if((auto||queue.length)&&!maze.won){accumulator+=dt;const interval=1/(+$('maze-speed').value);let count=0;while(accumulator>=interval&&count++<6){if(!queue.length){if(!auto)break;choose(options[0],false);}from={x:maze.x,y:maze.y};if(maze.move(queue.shift()))moveAt=now;accumulator-=interval;update();if(maze.won)break;}}
 drawMap();drawView(now);drawTimeline();$('st-time').textContent=elapsed.toFixed(1).replace('.',',')+' s';requestAnimationFrame(frame);}
newMaze();requestAnimationFrame(frame);
})();

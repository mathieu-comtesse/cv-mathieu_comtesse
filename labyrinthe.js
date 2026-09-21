(()=>{
'use strict';
const $=id=>document.getElementById(id),map=$('maze-map'),view=$('maze-view'),mg=map.getContext('2d'),vg=view.getContext('2d'),{Maze}=MazeModel;
let maze,auto=false,elapsed=0,last=0,accumulator=0,from={x:1,y:1},moveAt=0;
const names=['Nord','Est','Sud','Ouest'];
const patterns=Array.from({length:8},(_,k)=>{const c=document.createElement('canvas');c.width=c.height=4;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,4,4);g.fillStyle='#16151a';const b=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];for(let i=0;i<16;i++)if(b[i]<k*2)g.fillRect(i%4,Math.floor(i/4),1,1);return vg.createPattern(c,'repeat');});
function newMaze(){maze=new Maze(+$('maze-size').value,Math.floor(Math.random()*4294967295));auto=false;elapsed=0;accumulator=0;from={x:1,y:1};moveAt=0;$('maze-auto').textContent='Explorer automatiquement';update();}
function update(){
 $('maze-state').textContent=maze.won?'Sortie atteinte !':'Explorer les couloirs pour rejoindre la sortie.';
 $('maze-stats').textContent=`${maze.steps} pas · ${maze.backtracks} retours · chemin le plus court : ${maze.shortest} pas · ${elapsed.toFixed(1)} s`;
 $('maze-bearing').textContent=`Regarder vers ${names[maze.facing].toLowerCase()} · ${maze.sight(maze.facing)} case(s) devant`;
 for(let i=0;i<4;i++){const n=maze.sight(i);$('maze-sight-'+i).textContent=n?`${'· '.repeat(Math.min(n,20))}# — ${n} case(s)`:'# — mur';const b=$('maze-dir-'+i);b.disabled=n===0||maze.won;b.textContent=`Marcher vers ${names[i].toLowerCase()}${n?' →':' — mur'}`;}
 map.dataset.steps=maze.steps;map.dataset.won=maze.won;
 if(maze.won){auto=false;$('maze-auto').textContent='Exploration terminée';}
}
function step(dir){from={x:maze.x,y:maze.y};if(maze.move(dir))moveAt=performance.now();update();}
for(let i=0;i<4;i++)$('maze-dir-'+i).onclick=()=>step(i);
$('maze-new').onclick=newMaze;$('maze-size').onchange=newMaze;
$('maze-auto').onclick=()=>{if(maze.won)return;auto=!auto;$('maze-auto').textContent=auto?'Suspendre l’exploration':'Explorer automatiquement';};
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','z','q','s','d'].includes(key)){e.preventDefault();auto=false;$('maze-auto').textContent='Explorer automatiquement';if(key==='q'||key==='arrowleft')maze.facing=(maze.facing+3)%4;else if(key==='d'||key==='arrowright')maze.facing=(maze.facing+1)%4;else step((maze.facing+(key==='s'||key==='arrowdown'?2:0))%4);update();}});
function drawMap(){const n=maze.size,size=map.width,unit=size/n;mg.fillStyle='white';mg.fillRect(0,0,size,size);for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(maze.seen[y][x]){if(maze.grid[y][x]){mg.fillStyle='#111';mg.fillRect(x*unit,y*unit,Math.ceil(unit),Math.ceil(unit));}}else{mg.fillStyle='#b8b7bd';mg.fillRect(x*unit+unit*.35,y*unit+unit*.35,unit*.20,unit*.20);}}
 mg.strokeStyle='#b4a3aa';mg.lineWidth=Math.max(1,unit*.14);mg.beginPath();maze.trail.forEach(([x,y],i)=>i?mg.lineTo((x+.5)*unit,(y+.5)*unit):mg.moveTo((x+.5)*unit,(y+.5)*unit));mg.stroke();
 mg.fillStyle='#e7c822';mg.fillRect((n-2)*unit,(n-2)*unit,unit,unit);mg.fillStyle='#00a68a';mg.beginPath();mg.arc((maze.x+.5)*unit,(maze.y+.5)*unit,unit*.38,0,7);mg.fill();}
function drawView(now){const width=view.width,height=view.height,u=Math.min(1,(now-moveAt)/120),px=from.x+(maze.x-from.x)*u+.5,py=from.y+(maze.y-from.y)*u+.5,angle=(maze.facing-1)*Math.PI/2;
 vg.fillStyle='#fdfcfc';vg.fillRect(0,0,width,height/2);vg.fillStyle=patterns[2];vg.fillRect(0,height/2,width,height/2);
 for(let column=0;column<width;column+=2){const delta=Math.atan((column/width-.5)*1.25),a=angle+delta,dx=Math.cos(a),dy=Math.sin(a);let dist=0,hitX=px,hitY=py;while(dist<maze.size){dist+=.035;hitX=px+dx*dist;hitY=py+dy*dist;if(!maze.open(Math.floor(hitX),Math.floor(hitY)))break;}const corrected=Math.max(.12,dist*Math.cos(delta)),wall=Math.min(height*3,height/corrected),shade=Math.min(7,Math.max(2,Math.floor(corrected*.8)+((hitX%1<.06||hitX%1>.94)?1:0)));vg.fillStyle=patterns[shade];vg.fillRect(column,(height-wall)/2,2,wall);if(Math.min(hitX%1,hitY%1)<.055){vg.fillStyle='#16151a55';vg.fillRect(column,(height-wall)/2,1,wall);} }
 if(maze.won){vg.fillStyle='#fffddd';vg.fillRect(width*.2,height*.36,width*.6,height*.28);vg.fillStyle='#111';vg.font='bold 24px monospace';vg.textAlign='center';vg.fillText('SORTIE ATTEINTE',width/2,height*.54);vg.textAlign='left';}
}
function frame(now){const dt=Math.min(.1,(now-last)/1000||0);last=now;if(maze.steps&&!maze.won)elapsed+=dt;if(auto&&!maze.won){accumulator+=dt;const interval=1/(+$('maze-speed').value);let count=0;while(accumulator>=interval&&count++<6){from={x:maze.x,y:maze.y};maze.autoStep();moveAt=now;accumulator-=interval;update();if(maze.won)break;}}drawMap();drawView(now);$('maze-time').textContent=elapsed.toFixed(1)+' s';requestAnimationFrame(frame);}
newMaze();requestAnimationFrame(frame);
})();

(()=>{
'use strict';
/* Une grille de cases qui s’échauffe sous le curseur : la chaleur diffuse vers les voisines, s’éteint lentement et
   se colore du brun sombre au jaune, à l’orange puis au rouge, comme des pixels de braise. */
const canvas=document.getElementById('pixels-canvas'),g=canvas.getContext('2d'),stage=canvas.parentElement,hud=document.getElementById('pixels-count');
const CELL=18;let cols=0,rows=0,heat=null,next=null,w=0,h=0,pointer=null,painted=0,palette='braise';
const palettes={braise:[[20,12,8],[64,52,18],[150,140,30],[240,200,60],[255,140,40],[220,50,30]],encre:[[10,12,20],[20,40,70],[40,110,150],[90,200,210],[240,250,255],[255,120,90]],gouache:[[30,20,20],[120,40,30],[230,70,40],[255,166,47],[255,214,106],[7,88,61]]};
function resize(){const r=stage.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio,2);canvas.width=w*d;canvas.height=h*d;g.setTransform(d,0,0,d,0,0);cols=Math.ceil(w/CELL);rows=Math.ceil(h/CELL);heat=new Float32Array(cols*rows);next=new Float32Array(cols*rows);}
new ResizeObserver(resize).observe(stage);resize();
const color=v=>{const p=palettes[palette],x=Math.max(0,Math.min(.999,v))*(p.length-1),i=Math.floor(x),f=x-i,a=p[i],b=p[i+1];return `rgb(${a[0]+(b[0]-a[0])*f|0},${a[1]+(b[1]-a[1])*f|0},${a[2]+(b[2]-a[2])*f|0})`;};
function inject(x,y,amount){const c=Math.floor(x/CELL),r=Math.floor(y/CELL);for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){const cc=c+dc,rr=r+dr;if(cc<0||rr<0||cc>=cols||rr>=rows)continue;const d=Math.hypot(dc,dr);heat[rr*cols+cc]=Math.min(1.6,heat[rr*cols+cc]+amount*Math.max(0,1-d/2.6));}}
const toStage=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
canvas.addEventListener('pointermove',e=>{const p=toStage(e);if(pointer){const steps=Math.ceil(Math.hypot(p.x-pointer.x,p.y-pointer.y)/6);for(let i=1;i<=steps;i++)inject(pointer.x+(p.x-pointer.x)*i/steps,pointer.y+(p.y-pointer.y)*i/steps,.4/Math.max(1,steps*.3));}else inject(p.x,p.y,.5);pointer=p;painted++;});
canvas.addEventListener('pointerdown',e=>{const p=toStage(e);inject(p.x,p.y,1.2);pointer=p;});canvas.addEventListener('pointerleave',()=>pointer=null);
document.getElementById('pixels-clear').onclick=()=>{heat.fill(0);painted=0;};
document.getElementById('pixels-palette').onclick=e=>{const keys=Object.keys(palettes);palette=keys[(keys.indexOf(palette)+1)%keys.length];e.target.textContent='Palette : '+palette;};
function step(){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*cols+c;let s=0,n=0;if(c>0){s+=heat[i-1];n++;}if(c<cols-1){s+=heat[i+1];n++;}if(r>0){s+=heat[i-cols];n++;}if(r<rows-1){s+=heat[i+cols];n++;}const v=heat[i]*.9+(s/n)*.1-.0012;next[i]=v>0?v+(Math.random()-.5)*.012*v:0;}[heat,next]=[next,heat];}
function draw(){g.fillStyle='#140c08';g.fillRect(0,0,w,h);let lit=0;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const v=heat[r*cols+c];if(v<.01)continue;lit++;g.fillStyle=color(v);g.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);}
 g.strokeStyle='rgba(240,179,90,.07)';g.lineWidth=1;g.beginPath();for(let x=0;x<=w;x+=CELL){g.moveTo(x+.5,0);g.lineTo(x+.5,h);}for(let y=0;y<=h;y+=CELL){g.moveTo(0,y+.5);g.lineTo(w,y+.5);}g.stroke();
 hud.textContent=`${lit} case${lit>1?'s':''} allumée${lit>1?'s':''}`;canvas.dataset.lit=lit;}
function frame(){step();draw();requestAnimationFrame(frame);}
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){let t=0;const idle=setInterval(()=>{if(painted)return clearInterval(idle);t+=.05;inject(w*.5+Math.cos(t)*w*.25,h*.5+Math.sin(t*1.3)*h*.25,.08);},40);}
frame();
})();

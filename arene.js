/* Arène des arcanes : jeu de combat en pixel art, tout dessiné au code sur une toile de 384 × 216. */
(()=>{
'use strict';
const W=384,H=216,GROUND=184,TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const cv=$('arena-canvas'),ctx=cv.getContext('2d');cv.width=W;cv.height=H;ctx.imageSmoothingEnabled=false;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const k=c.getContext('2d');k.imageSmoothingEnabled=false;return [c,k];};
const [bgC,bg]=mk(W,H),[spr,sk]=mk(80,80),[sil,sl]=mk(80,80);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let K=ctx;
const P=(x,y,w,h,c)=>{K.fillStyle=c;K.fillRect(Math.round(x),Math.round(y),w,h);};
function line(x0,y0,x1,y1,c,t=1){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,o=t>1?1:0;let e=dx+dy;K.fillStyle=c;
 for(let i=0;i<400;i++){K.fillRect(x0-o,y0-o,t,t);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}}
function disc(cx,cy,r,c){for(let y=-r;y<=r;y++){const w=Math.floor(Math.sqrt(Math.max(0,r*r-y*y))+.3);P(cx-w,cy+y,w*2+1,1,c);}}
function ring(cx,cy,r,c,squash=1){K.fillStyle=c;for(let i=0;i<Math.max(12,r*6);i++){const a=i/(Math.max(12,r*6))*TAU;K.fillRect(Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r*squash),1,1);}}
const rnd=(()=>{let s=7;return ()=>(s=(s*1664525+1013904223)>>>0)/4294967296;})();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// --- Personnages -----------------------------------------------------------
const CHARS=[
 {id:'mage',name:'Orvyn',title:'Archimage',hp:950,speed:62,body:'robe',head:'wizard',weapon:'staff',color:'#5fd4ff',
  pal:{robe:'#b3263a',robeD:'#7a1628',robeL:'#dc4a55',trim:'#e8b04a',skin:'#f0c39a',hair:'#e9eef5',hat:'#8c1f45',hatD:'#5c1433',gem:'#5fd4ff',staff:'#8a5a2b'},
  skills:[['Orbe arcanique','Maintenir pour charger, relâcher pour lancer',18,1.1],['Transfert','Téléportation dans le dos de l’adversaire',25,4],['Pluie d’étoiles','Ultime : météores sur toute l’arène',0,0]]},
 {id:'cleric',name:'Séraphine',title:'Prêtresse',hp:1000,speed:58,body:'robe',head:'priestess',weapon:'cross',color:'#ffd86b',
  pal:{robe:'#efe8dc',robeD:'#b9ae9c',robeL:'#ffffff',trim:'#c42a36',skin:'#f3cfae',hair:'#f4d35e',hairD:'#c9a13a',gem:'#ffd86b',staff:'#d8a93b'},
  skills:[['Colonne sacrée','Un pilier de lumière frappe l’adversaire',28,2.4],['Prière','Soigne et protège quelques secondes',35,8],['Jugement','Ultime : trois colonnes géantes',0,0]]},
 {id:'knight',name:'Bran',title:'Chevalier',hp:1150,speed:54,body:'armor',head:'knight',weapon:'sword',color:'#f2f6fa',
  pal:{robe:'#3c5a8f',robeD:'#263c63',robeL:'#5578b5',trim:'#e8b04a',skin:'#e3b08a',metal:'#c3ccd7',metalD:'#7d8a99',metalL:'#f2f6fa',plume:'#d6333f',staff:'#e7edf3'},
  skills:[['Charge au bouclier','Ruée qui repousse et étourdit',22,3],['Parade','Garde parfaite : renvoie les sorts, étourdit',15,4],['Lame solaire','Ultime : vague de lumière tranchante',0,0]]},
 {id:'necro',name:'Morgane',title:'Nécromancienne',hp:900,speed:60,body:'robe',head:'hood',weapon:'skull',color:'#7cf2a6',
  pal:{robe:'#3d2b56',robeD:'#261a38',robeL:'#5b4380',trim:'#7cf2a6',skin:'#cfd6e0',hair:'#1c1626',gem:'#7cf2a6',staff:'#5a4a3c'},
  skills:[['Feux follets','Trois esprits à tête chercheuse',28,2.8],['Drain de vie','Rayon qui vole des points de vie',30,5],['Armée d’os','Ultime : des mains surgissent du sol',0,0]]}
];
const ARENAS=[
 {name:'Rempart au clair de lune',sub:'Nuit étoilée sur les créneaux'},
 {name:'Cathédrale des vitraux',sub:'Cierges et verre coloré'},
 {name:'Forêt aux lucioles',sub:'Champignons qui luisent'},
 {name:'Forge volcanique',sub:'Lave et braises'}
];

// Pose of the fighter for the current state: hand angle, weapon angle, body bob and leg phase.
function pose(f){const t=f.anim,st=f.state;
 if(st==='walk')return {bob:Math.floor(t*8)%2,leg:Math.floor(t*8)%4,hand:.9,wpn:-1.35};
 if(st==='jump')return {bob:0,leg:5,hand:-.4,wpn:-1.7};
 if(st==='attack'){const p=clamp(f.stateT/f.dur,0,1),k=p<.35?p/.35:1;return {bob:0,leg:0,hand:-1.3+k*1.6,wpn:-2.5+k*2.7,lean:k>0?1:0};}
 if(st==='cast'||st==='charge'||st==='blink')return {bob:st==='charge'?Math.floor(t*20)%2:0,leg:0,hand:-1.1,wpn:-1.25,glow:true};
 if(st==='dash')return {bob:0,leg:2,hand:.2,wpn:-.2,lean:2};
 if(st==='block')return {bob:0,leg:0,hand:.1,wpn:-1.65,block:true};
 if(st==='hurt')return {bob:0,leg:0,hand:1.5,wpn:-2,lean:-2};
 if(st==='ko')return {bob:0,leg:0,hand:1.5,wpn:-.3};
 return {bob:Math.floor(t*2.2)%2,leg:0,hand:.9,wpn:-1.42};}
function drawBody(f,ps){const d=f.def,c=d.pal,b=ps.bob,ln=ps.lean||0;
 const legA=ps.leg===1?-2:ps.leg===3?2:ps.leg===5?-1:0,legB=-legA;
 // Back arm and shield (behind the body).
 if(d.id==='knight'&&!ps.block){P(-9+ln,-21+b,6,10,c.robeD);P(-9+ln,-21+b,6,1,c.trim);P(-8+ln,-12+b,4,2,c.robeD);P(-7+ln,-18+b,2,4,c.trim);}
 // Legs and boots.
 if(d.body==='armor'){P(-5+legA,-9,3,9,c.metalD);P(2+legB,-9,3,9,c.metal);P(-6+legA,-2,4,2,'#3a3f47');P(1+legB,-2,5,2,'#4a515b');}
 else{P(-5+legA,-3,4,3,'#2b2233');P(1+legB,-3,5,3,'#3a2e44');}
 // Torso.
 if(d.body==='robe'){for(let y=-23;y<=-3;y++){const w=Math.round(4+(y+23)*.24);P(-w+ln,y+b,w*2,1,c.robe);P(w-2+ln,y+b,2,1,c.robeD);P(-w+ln,y+b,1,1,c.robeL);}
  P(-8+ln,-4+b,16,1,c.trim);P(-4+ln,-15+b,9,1,c.trim);P(-1+ln,-22+b,2,7,c.robeL);
  if(d.id==='cleric'){P(-1+ln,-12+b,3,7,c.trim);P(-2+ln,-10+b,5,2,c.trim);}}
 else{P(-6+ln,-21+b,12,12,c.metal);P(3+ln,-21+b,3,12,c.metalD);P(-6+ln,-21+b,1,12,c.metalL);P(-2+ln,-19+b,5,11,c.robe);P(-1+ln,-17+b,3,1,c.trim);P(-6+ln,-10+b,12,2,'#5a3a22');P(-1+ln,-10+b,2,2,c.trim);
  P(-7+ln,-22+b,5,3,c.metalL);P(3+ln,-22+b,5,3,c.metal);}
 // Head.
 const hx=-3+ln+(ps.lean<0?-1:0),hy=-31+b;
 if(d.head==='priestess'){P(hx-2,hy-1,4,13,c.hairD);P(hx-1,hy-2,9,3,c.hair);}
 if(d.head!=='knight'){P(hx,hy,7,7,c.skin);P(hx+5,hy+2,1,1,'#2a1a22');P(hx+6,hy+4,1,1,'#d99a7a');}
 if(d.head==='wizard'){P(hx,hy+3,7,2,c.hair);P(hx+1,hy+5,6,3,c.hair);P(hx+2,hy+8,4,3,c.hair);P(hx+3,hy+11,2,2,c.hair);P(hx+4,hy+1,3,1,c.hair);
  P(hx-3,hy-2,13,2,c.hat);P(hx-3,hy-1,13,1,c.hatD);for(let i=0;i<12;i++){const w=Math.max(1,Math.round(9-i*.72)),ox=Math.round(-i*.42);P(hx-1+ox+(9-w)/2,hy-3-i,w,1,i===1?c.trim:c.hat);if(w>2)P(hx-1+ox+(9-w)/2+w-1,hy-3-i,1,1,c.hatD);}P(hx+1,hy-8,1,1,c.trim);}
 else if(d.head==='priestess'){P(hx-1,hy-2,8,3,c.hair);P(hx+5,hy-1,2,4,c.hair);P(hx-2,hy,2,5,c.hair);P(hx-3,hy-1,2,3,c.trim);P(hx+5,hy+2,1,1,'#2a1a22');}
 else if(d.head==='knight'){P(hx-1,hy-1,9,9,c.metal);P(hx+5,hy-1,3,9,c.metalD);P(hx-1,hy-1,9,1,c.metalL);P(hx+2,hy+3,6,1,'#141821');P(hx+5,hy+5,3,1,'#141821');
  for(let i=0;i<6;i++)P(hx-3-i*.8,hy-3+Math.round(i*i*.15),3,2,c.plume);}
 else if(d.head==='hood'){P(hx-2,hy-2,10,11,c.robeD);P(hx-1,hy-3,8,2,c.robe);P(hx+1,hy+1,6,6,c.skin);P(hx+1,hy+1,6,2,'#9aa3b3');P(hx+5,hy+3,1,1,c.gem);P(hx+3,hy+3,1,1,c.gem);}
 // Front arm, hand and weapon.
 const sx=1+ln,sy=-20+b,hxx=sx+Math.cos(ps.hand)*6,hyy=sy+Math.sin(ps.hand)*6;line(sx,sy,hxx,hyy,d.body==='armor'?c.metal:c.robe,2);P(hxx-1,hyy-1,2,2,d.body==='armor'?c.metalD:c.skin);
 const ux=Math.cos(ps.wpn),uy=Math.sin(ps.wpn);
 if(d.weapon==='sword'){line(hxx-ux*2,hyy-uy*2,hxx+ux*15,hyy+uy*15,c.staff,2);line(hxx+ux*2,hyy+uy*2,hxx+ux*14,hyy+uy*14,'#ffffff');line(hxx-uy*3,hyy+ux*3,hxx+uy*3,hyy-ux*3,c.trim);
  if(ps.block){P(4+ln,-24+b,6,11,c.robe);P(4+ln,-24+b,6,1,c.trim);P(6+ln,-21+b,2,5,c.trim);P(5+ln,-13+b,4,1,c.robe);}}
 else{const tx=hxx+ux*17,ty=hyy+uy*17;line(hxx-ux*10,hyy-uy*10,tx,ty,c.staff,1);
  if(d.weapon==='staff'){P(tx-1,ty-2,3,4,c.gem);P(tx,ty-1,1,1,'#ffffff');}
  else if(d.weapon==='cross'){line(tx,ty,tx+ux*4,ty+uy*4,c.staff);line(tx+ux*2-uy*3,ty+uy*2+ux*3,tx+ux*2+uy*3,ty+uy*2-ux*3,c.staff);P(tx+ux*2-1,ty+uy*2-1,3,3,c.gem);}
  else{P(tx-2,ty-3,5,4,'#e9e4d6');P(tx-1,ty-2,1,1,c.gem);P(tx+1,ty-2,1,1,c.gem);P(tx-1,ty+1,3,1,'#bfb8a6');}}}
function drawFighter(f){const ps=pose(f);
 K=sk;sk.clearRect(0,0,80,80);sk.save();sk.translate(40,72);drawBody(f,ps);sk.restore();K=ctx;
 sl.globalCompositeOperation='source-over';sl.clearRect(0,0,80,80);sl.drawImage(spr,0,0);sl.globalCompositeOperation='source-in';sl.fillStyle='#0b0812';sl.fillRect(0,0,80,80);
 // Shadow on the floor, smaller when airborne.
 const air=clamp((GROUND-f.y)/60,0,1);ctx.fillStyle=`rgba(0,0,0,${.35-air*.2})`;ctx.fillRect(Math.round(f.x-8+air*3),GROUND+1,Math.round(16-air*6),2);
 ctx.save();ctx.translate(Math.round(f.x),Math.round(f.y));if(f.facing<0)ctx.scale(-1,1);
 if(f.state==='ko'){ctx.rotate(-Math.PI/2*Math.min(1,f.stateT*4));ctx.translate(0,4);}
 if(f.state==='blink'&&f.stateT>.08&&f.stateT<.2)ctx.globalAlpha=.25;
 for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])ctx.drawImage(sil,-40+dx,-72+dy);
 ctx.drawImage(spr,-40,-72);
 if(f.flash>0||f.shield>0||f.stun>0){sl.fillStyle=f.flash>0?'#ffffff':f.stun>0?'#ffe066':'#ffd86b';sl.fillRect(0,0,80,80);ctx.globalAlpha=f.flash>0?.85:.25+.15*Math.sin(f.anim*12);ctx.drawImage(sil,-40,-72);}
 ctx.restore();ctx.globalAlpha=1;
 if(f.stun>0)for(let i=0;i<3;i++){const a=f.anim*5+i*2.1;P(f.x+Math.cos(a)*7,f.y-38+Math.sin(a)*2,2,2,'#ffe066');}}

// --- Décors ------------------------------------------------------------------
const deco={stars:[],flames:[],candles:[],flies:[],shrooms:[],embers:[]};
function bricks(y0,y1,c,m,hl,bw=12,bh=5){P(0,y0,W,y1-y0,c);for(let y=y0,r=0;y<y1;y+=bh,r++){P(0,y,W,1,m);for(let x=(r%2)*bw/2;x<W;x+=bw){P(x,y,1,bh,m);if(rnd()<.18)P(x+1,y+1,bw-2,bh-2,hl);}}}
function bands(cols,y0,y1){const n=cols.length,hh=(y1-y0)/n;cols.forEach((c,i)=>{P(0,y0+i*hh,W,Math.ceil(hh),c);if(i)for(let x=0;x<W;x+=2){P(x+((i)%2),y0+i*hh-1,1,1,c);P(x,y0+i*hh-2,1,1,c);}});}
function ridge(base,amp,freq,c,seed){for(let x=0;x<W;x++){const h=Math.sin(x*freq+seed)*amp+Math.sin(x*freq*2.7+seed*3)*amp*.4+Math.sin(x*freq*.3+seed)*amp*.8;P(x,base-h,1,H-(base-h),c);}}
function buildArena(i){K=bg;bg.clearRect(0,0,W,H);deco.stars=[];deco.flames=[];deco.candles=[];deco.flies=[];deco.shrooms=[];deco.embers=[];
 if(i===0){bands(['#0b0d27','#0f1233','#13173f','#181d4b','#1d2458','#232b66'],0,170);
  for(let s=0;s<90;s++){const x=rnd()*W,y=rnd()*150;P(x,y,1,1,rnd()<.3?'#8f97d9':'#4d548f');if(rnd()<.35)deco.stars.push({x,y,p:rnd()*TAU});}
  disc(300,42,17,'#1f275e');disc(300,42,15,'#262f6d');disc(300,42,12,'#f1e9c6');disc(296,38,3,'#d8cfa6');disc(305,46,2,'#d8cfa6');disc(303,36,1,'#d8cfa6');P(290,40,2,2,'#d8cfa6');
  ridge(158,9,.02,'#1a1f4d',1);ridge(170,7,.035,'#141840',4);
  // stone walkway, and the watch tower on the left with its torch
  bricks(GROUND,H,'#433d57','#2b2739','#4d4663',14,6);P(0,GROUND,W,3,'#6a6283');P(0,GROUND,W,1,'#8a82a3');for(let x=0;x<W;x+=14)P(x,GROUND,1,3,'#4d4663');
  P(0,96,22,GROUND-96,'#3a344c');for(let y=96,r=0;y<GROUND;y+=5,r++){P(0,y,22,1,'#262233');for(let x=(r%2)*4;x<22;x+=8)P(x,y,1,5,'#262233');if(rnd()<.4)P(2+rnd()*14,y+1,5,3,'#433d57');}
  P(0,92,24,4,'#5a5373');P(0,92,24,1,'#766e92');P(20,96,2,GROUND-96,'#2a2538');P(7,89,5,3,'#5a4a3a');deco.flames.push({x:9,y:88});}
 else if(i===1){bricks(0,GROUND,'#2a2436','#1b1725','#322a40',14,6);
  for(const x of [0,W-20,W/2-10]){P(x,0,20,GROUND,'#3a3249');P(x,0,3,GROUND,'#4a4160');P(x+17,0,3,GROUND,'#282133');for(let y=0;y<GROUND;y+=24)P(x,y,20,1,'#282133');}
  for(const wx of [96,258]){const w=34,top=26,h=92;for(let y=0;y<h;y++){const arc=y<w/2?Math.round(w/2-Math.sqrt(Math.max(0,(w/2)**2-(w/2-y)**2))):0;P(wx+arc-2,top+y,w-arc*2+4,1,'#4a4160');P(wx+arc,top+y,w-arc*2,1,'#141024');}
   for(let y=0;y<h;y++){const arc=y<w/2?Math.round(w/2-Math.sqrt(Math.max(0,(w/2)**2-(w/2-y)**2))):0;for(let x=arc+1;x<w-arc-1;x++){const gx=Math.floor((x+y)/5),gy=Math.floor((x-y+60)/5),k=(gx*3+gy*5)%7;const col=['#2d4fa8','#4a74d6','#b8323f','#2d4fa8','#d9a441','#4a74d6','#7a2a8a'][k];if(((x+y)%5)&&((x-y+60)%5))P(wx+x,top+y,1,1,col);else P(wx+x,top+y,1,1,'#1a1428');}}
   disc(wx+w/2,top+14,8,'#1a1428');disc(wx+w/2,top+14,6,'#c7433f');disc(wx+w/2,top+14,3,'#e8b04a');line(wx+w/2,top+6,wx+w/2,top+22,'#1a1428');line(wx+w/2-8,top+14,wx+w/2+8,top+14,'#1a1428');
   P(wx-4,top+h,w+8,4,'#4a4160');P(wx-4,top+h,w+8,1,'#5d5378');}
  for(const x of [40,150,230,340]){P(x,GROUND-26,1,26,'#b8892f');P(x-3,GROUND-2,7,2,'#b8892f');P(x-3,GROUND-27,7,1,'#d9a441');P(x-1,GROUND-34,3,7,'#f3eee0');deco.candles.push({x,y:GROUND-35});}
  for(let x=0;x<W;x+=16)for(let r=0;r<4;r++)P(x+(r%2)*8,GROUND+r*8,16,8,(x/16+r)%2?'#3b3547':'#453e55');P(0,GROUND,W,1,'#5d5378');}
 else if(i===2){bands(['#07141a','#0a1b20','#0d2327','#112c2e','#143533'],0,GROUND);
  for(let s=0;s<40;s++)P(rnd()*W,rnd()*70,1,1,'#3f6f6a');disc(70,34,9,'#cfe7d6');disc(67,31,9,'#0a1b20');
  for(let k=0;k<22;k++){const x=rnd()*W,h=50+rnd()*50,base=GROUND-10;for(let y=0;y<h;y++){const w=Math.round((y/h)*12)+1;P(x-w/2,base-h+y,w,1,'#0e2a2b');}}
  for(let k=0;k<14;k++){const x=rnd()*W,h=70+rnd()*60,base=GROUND;for(let y=0;y<h;y++){const w=Math.round((y/h)*18)+1;P(x-w/2,base-h+y,w,1,'#0a2021');}}
  for(const x of [8,W-26]){P(x,0,18,GROUND,'#1a1512');P(x+12,0,6,GROUND,'#120e0c');P(x,0,2,GROUND,'#2a211b');}
  P(0,GROUND,W,H-GROUND,'#1c2f22');for(let x=0;x<W;x++){if(rnd()<.5)P(x,GROUND-1-Math.floor(rnd()*3),1,2,'#2e5a3a');if(rnd()<.2)P(x,GROUND+2+rnd()*28,1,1,'#264a31');}
  for(let k=0;k<9;k++){const x=20+rnd()*(W-40),pink=rnd()<.5;deco.shrooms.push({x,pink});P(x,GROUND-5,2,5,'#d9e6d6');P(x-3,GROUND-8,8,3,pink?'#f06aa8':'#5fe0e6');P(x-2,GROUND-9,6,1,pink?'#ff9fcb':'#a6f5f7');}
  for(let k=0;k<26;k++)deco.flies.push({x:rnd()*W,y:40+rnd()*130,p:rnd()*TAU,s:.4+rnd()});}
 else{bands(['#140608','#1d090b','#2a0d0d','#3a1210','#4f1a12','#6a2414'],0,GROUND);
  ridge(120,18,.012,'#240b0c',2);for(let x=150;x<200;x++){const h=Math.abs(x-175);P(x,95+h*.5,1,40,'#240b0c');}P(168,96,14,2,'#ff7a2a');P(170,94,10,2,'#ffb347');
  for(let y=98;y<150;y++)P(172+Math.sin(y*.3)*2,y,3,1,y%3?'#ff6a1a':'#ffb347');
  ridge(150,10,.03,'#1a0808',7);
  for(let x=0;x<W;x++)P(x,168+Math.sin(x*.05)*2,1,16,x%7?'#b33a12':'#ff7a2a');P(0,176,W,8,'#1a0808');
  for(const x of [30,W-50]){P(x,70,20,GROUND-70,'#2a1614');P(x,70,3,GROUND-70,'#3a201c');P(x-3,66,26,5,'#3a201c');}
  P(0,GROUND,W,H-GROUND,'#1c1418');for(let k=0;k<30;k++){let x=rnd()*W,y=GROUND+3+rnd()*28;for(let s=0;s<8;s++){P(x,y,2,1,'#ff6a2a');x+=rnd()*4-1;y+=rnd()*2-1;}}P(0,GROUND,W,1,'#3a2a30');
  for(let k=0;k<40;k++)deco.embers.push({x:rnd()*W,y:rnd()*H,v:10+rnd()*20,p:rnd()*TAU});}
 K=ctx;}
function drawDecoLive(t){const i=game.arena;
 for(const s of deco.stars){if(Math.sin(t*2+s.p)>.6)P(s.x,s.y,1,1,'#e9ecff');}
 for(const f of deco.flames){const h=4+Math.floor(Math.sin(t*14)*1.5+1.5);P(f.x-1,f.y-h+2,3,h,'#ff9a2a');P(f.x,f.y-h+3,1,h-2,'#ffe38a');glow(f.x,f.y-2,14,'255,150,60',.35);}
 for(const c of deco.candles){const fl=Math.sin(t*9+c.x)*1;P(c.x-1+fl*.5,c.y-3,2,3,'#ffcf5a');P(c.x,c.y-2,1,1,'#fff6d0');glow(c.x,c.y-2,12,'255,200,110',.3);if(Math.sin(t*3+c.x)>.7)P(c.x+Math.sin(t*7+c.x)*4,c.y-6-((t*8+c.x)%8),1,1,'#ffe38a');}
 if(i===1){ctx.globalCompositeOperation='lighter';for(const wx of [96,258]){ctx.fillStyle='rgba(120,140,255,.05)';ctx.beginPath();ctx.moveTo(wx+4,40);ctx.lineTo(wx+30,40);ctx.lineTo(wx+80,GROUND);ctx.lineTo(wx+30,GROUND);ctx.fill();}
  for(let k=0;k<14;k++){const x=(k*37+t*6)%W,y=60+((k*53+t*4)%120);P(x,y,1,1,'rgba(255,240,200,.5)');}ctx.globalCompositeOperation='source-over';}
 for(const f of deco.flies){const x=f.x+Math.sin(t*f.s+f.p)*14,y=f.y+Math.cos(t*f.s*1.3+f.p)*8;if(Math.sin(t*3+f.p*3)>-.2){P(x,y,1,1,'#eaff8a');glow(x,y,6,'200,255,120',.35);}}
 for(const s of deco.shrooms)glow(s.x+1,GROUND-8,10,s.pink?'240,106,168':'95,224,230',.18+.06*Math.sin(t*2+s.x));
 for(const e of deco.embers){e.y-=e.v*(1/60);if(e.y<0){e.y=H;e.x=rnd()*W;}const x=e.x+Math.sin(t*2+e.p)*3;P(x,e.y,1,1,e.y>120?'#ffb347':'#ff6a1a');}
 if(i===3)glow(175,150,90,'255,90,30',.08+.03*Math.sin(t*1.5));}
function glow(x,y,r,rgb,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalCompositeOperation='source-over';}

// --- Son (petites puces 8 bits) ---------------------------------------------
let ac=null,muted=false,noise=null;
function audioOn(){if(ac||muted)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ac=new C();noise=ac.createBuffer(1,ac.sampleRate*.5,ac.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
function tone(type,f0,f1,dur,vol=.12,delay=0){if(!ac||muted)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur+.02);}
function hiss(dur,vol,freq,delay=0){if(!ac||muted)return;const t=ac.currentTime+delay,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=freq;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f).connect(g).connect(ac.destination);s.start(t);s.stop(t+dur);}
const sfx={hit:()=>{hiss(.12,.35,900);tone('square',180,60,.12,.1);},block:()=>{tone('square',900,700,.05,.06);hiss(.05,.15,3000);},swing:()=>hiss(.08,.1,2200),jump:()=>tone('square',300,600,.08,.05),
 cast:()=>{tone('sine',400,1200,.25,.08);tone('triangle',800,1600,.2,.05,.05);},orb:()=>tone('sawtooth',600,200,.3,.05),holy:()=>{for(const [k,f] of [[0,523],[1,659],[2,784]])tone('triangle',f,f,.6,.06,k*.05);},
 dark:()=>{tone('sawtooth',160,90,.4,.07);hiss(.3,.08,400);},boom:()=>{hiss(.35,.4,300);tone('square',120,30,.35,.12);},ko:()=>{tone('square',440,55,.9,.12);hiss(.5,.2,500);},
 round:()=>{tone('square',523,523,.1,.08);tone('square',784,784,.2,.08,.12);},heal:()=>{tone('sine',660,990,.4,.06);tone('sine',880,1320,.4,.04,.1);},parry:()=>{tone('square',1400,1800,.12,.08);tone('triangle',2000,2400,.1,.05,.05);}};

// --- État du jeu ----------------------------------------------------------
const game={phase:'menu',mode:'1p',diff:1,arena:0,sel:[0,1],p:[],round:1,timer:99,phaseT:0,shake:0,hitstop:0,slow:1,proj:[],parts:[],texts:[],fx:[],paused:false,flashW:0,winner:null,stats:[{hits:0,dmg:0},{hits:0,dmg:0}]};
function fighter(def,side){return {def,side,x:side?W-110:110,y:GROUND,vx:0,vy:0,facing:side?-1:1,hp:def.hp,hpShow:def.hp,mana:100,ult:0,state:'idle',stateT:0,dur:0,anim:0,cd:[0,0],combo:0,comboT:0,hitDone:false,charge:0,flash:0,parry:0,shield:0,regen:0,stun:0,inv:0,wins:0,drainT:0,hits:0,hitsT:0,sub:0};}
function setState(f,s,keep){if(keep&&f.state===s)return;f.state=s;f.stateT=0;f.hitDone=false;f.sub=0;}
function part(x,y,vx,vy,life,c,s=1,g=0,add=true){game.parts.push({x,y,vx,vy,life,max:life,c,s,g,add});}
function burst(x,y,n,c,sp=60,life=.5,g=0){for(let i=0;i<n;i++){const a=rnd()*TAU,v=sp*(.3+rnd()*.7);part(x,y,Math.cos(a)*v,Math.sin(a)*v,life*(.5+rnd()*.5),c,rnd()<.3?2:1,g);}}
function popup(x,y,text,c='#fff',big=false){if(big)game.texts=game.texts.filter(t=>!t.big);game.texts.push({x,y,text,c,life:big?1.4:.8,big});}

function damage(t,amt,a,o={}){
 if(t.state==='ko'||t.inv>0||game.phase!=='fight')return false;
 const fromFront=((o.fromX??a.x)-t.x)*t.facing>0;
 if(t.parry>0&&fromFront){burst(t.x+t.facing*8,t.y-20,14,'#fff6c0',90,.35);popup(t.x,t.y-44,'PARADE','#ffe066');sfx.parry();if(!o.proj){a.stun=.9;setState(a,'hurt');a.dur=.9;}return 'parry';}
 if(t.state==='block'&&fromFront&&!o.unblockable){amt*=.2;t.vx=-t.facing*50;burst(t.x+t.facing*8,t.y-18,6,'#9fd6ff',50,.25);sfx.block();}
 else{setState(t,'hurt');t.dur=o.stun||.32;t.vx=(o.dir||Math.sign(t.x-a.x)||1)*(o.knock||70);if(o.launch){t.vy=-o.launch;t.y-=1;}t.flash=.1;game.hitstop=o.big?.12:.06;game.shake=o.big?6:3;sfx.hit();
  burst(t.x,t.y-20,o.big?22:10,o.color||'#ffffff',o.big?120:80,.4);}
 if(t.shield>0)amt*=.6;amt=Math.round(amt);
 t.hp=Math.max(0,t.hp-amt);a.ult=Math.min(100,a.ult+amt*.12);t.ult=Math.min(100,t.ult+amt*.07);
 const st=game.stats[a.side];st.dmg+=amt;st.hits++;a.hits=a.hitsT>0?a.hits+1:1;a.hitsT=1.1;if(a.hits>=3)popup(a.side?W-60:60,56,a.hits+' COUPS !','#ffe066');
 popup(t.x+(rnd()*10-5),t.y-40,String(amt),t.state==='block'?'#9fd6ff':'#ffffff');
 if(t.hp<=0)knockout(t,a);return true;}
function knockout(t,a){setState(t,'ko');t.vy=-140;t.vx=Math.sign(t.x-a.x)*90;game.phase='ko';game.phaseT=0;game.slow=.3;game.flashW=.6;a.wins++;sfx.ko();popup(W/2,90,'K.O.','#ff4d5e',true);}

// --- Compétences ------------------------------------------------------------
const ATK=[{dur:.26,at:.09,dmg:42,range:26,knock:40},{dur:.26,at:.09,dmg:42,range:26,knock:40},{dur:.42,at:.16,dmg:78,range:30,knock:150,launch:0}];
function startAttack(f){f.combo=f.comboT>0?(f.combo+1)%3:0;f.comboT=.5;setState(f,'attack');f.dur=ATK[f.combo].dur;f.atk=ATK[f.combo];f.vx=f.facing*20;sfx.swing();}
function canUse(f,i){if(i===2)return f.ult>=100;const s=f.def.skills[i];return f.cd[i]<=0&&f.mana>=s[2];}
function startSkill(f,o,i){if(!canUse(f,i)){if(i<2&&f.cd[i]<=0)popup(f.x,f.y-44,'MANA','#6fa8ff');return;}
 const s=f.def.skills[i];if(i===2){f.ult=0;game.flashW=.35;popup(f.x,f.y-50,s[0].toUpperCase(),f.def.color);}else{f.mana-=s[2];f.cd[i]=s[3];}
 f.skill=i;const id=f.def.id;
 if(id==='mage'&&i===0){setState(f,'charge');f.charge=0;sfx.cast();return;}
 if(id==='mage'&&i===1){setState(f,'blink');f.dur=.34;f.inv=.3;sfx.cast();return;}
 if(id==='knight'&&i===0){setState(f,'dash');f.dur=.42;sfx.swing();return;}
 if(id==='knight'&&i===1){setState(f,'block');f.parry=.45;f.dur=.45;f.sub=1;sfx.block();return;}
 if(id==='knight'&&i===2){setState(f,'attack');f.dur=.6;f.atk=null;f.sub=2;return;}
 setState(f,'cast');f.dur=id==='necro'&&i===1?1.05:i===2?1.2:id==='cleric'&&i===1?.6:.45;sfx.cast();}
function skillTick(f,o,dt){const id=f.def.id,i=f.skill,t=f.stateT;
 if(f.state==='attack'&&f.atk){if(!f.hitDone&&t>=f.atk.at){f.hitDone=true;const dx=(o.x-f.x)*f.facing;if(dx>-4&&dx<f.atk.range&&Math.abs(o.y-f.y)<30)damage(o,f.atk.dmg,f,{knock:f.atk.knock,big:f.combo===2,color:f.def.color,stun:f.combo===2?.45:.28});}f.vx*=.8;return;}
 if(id==='knight'&&f.state==='attack'&&f.sub===2){if(!f.hitDone&&t>=.25){f.hitDone=true;game.proj.push({type:'wave',x:f.x+f.facing*14,y:f.y-18,vx:f.facing*250,vy:0,r:14,dmg:260,owner:f,life:2,hit:new Set(),pierce:true});sfx.holy();game.shake=5;}return;}
 if(f.state==='dash'){f.vx=t<.32?f.facing*270:f.vx*.7;if(t<.32&&Math.floor(t*60)%2)part(f.x-f.facing*8,f.y-10-rnd()*16,-f.facing*30,0,.25,'#c3ccd7',1,0,false);
  if(!f.hitDone&&Math.abs(o.x-f.x)<20&&Math.abs(o.y-f.y)<30){f.hitDone=true;damage(o,90,f,{knock:230,stun:.55,big:true,color:'#f2f6fa'});f.vx=-f.facing*40;}return;}
 if(f.state==='blink'){if(!f.hitDone&&t>=.12){f.hitDone=true;burst(f.x,f.y-18,24,'#b48cff',70,.5);const side=o.x>f.x?1:-1;f.x=clamp(o.x+side*26,14,W-14);f.facing=o.x>f.x?1:-1;burst(f.x,f.y-18,24,'#5fd4ff',70,.5);sfx.orb();}return;}
 if(f.state!=='cast')return;
 if(id==='mage'&&i===2){if(t<1&&Math.floor(t*60)%6===0&&f.sub<14){f.sub++;const tx=clamp(o.x+(rnd()*120-60),10,W-10);game.proj.push({type:'meteor',x:tx+50,y:-10-rnd()*30,vx:-55,vy:230,r:5,dmg:42,owner:f,life:3,hit:new Set()});}return;}
 if(id==='cleric'&&(i===0||i===2)){if(!f.hitDone&&t>=.15){f.hitDone=true;const xs=i===2?[o.x,o.x-44,o.x+44]:[o.x];for(const x of xs)game.fx.push({type:'pillar',x:clamp(x,10,W-10),t:0,warn:i===2?.55:.5,life:.6,w:i===2?22:14,dmg:i===2?150:125,owner:f,done:false});sfx.holy();}return;}
 if(id==='cleric'&&i===1){if(!f.hitDone&&t>=.2){f.hitDone=true;f.regen=3;f.shield=3.2;sfx.heal();for(let k=0;k<20;k++)part(f.x+rnd()*20-10,f.y-rnd()*30,0,-30-rnd()*30,1,'#ffd86b');}return;}
 if(id==='necro'&&i===0){if(!f.hitDone&&t>=.15){f.hitDone=true;for(let k=0;k<3;k++)game.proj.push({type:'wisp',x:f.x+f.facing*10,y:f.y-26-k*8,vx:f.facing*(60+k*20),vy:-30+k*30,r:4,dmg:38,owner:f,life:3.2+k*.2,hit:new Set(),delay:k*.12});sfx.dark();}return;}
 if(id==='necro'&&i===1){f.drainT-=dt;const dx=(o.x-f.x)*f.facing;f.beam=t>.15&&dx>0&&dx<130&&Math.abs(o.y-f.y)<40;if(f.beam&&f.drainT<=0){f.drainT=.1;if(damage(o,14,f,{knock:10,stun:.12,color:'#7cf2a6'}))f.hp=Math.min(f.def.hp,f.hp+10);}return;}
 if(id==='necro'&&i===2){if(t<.9&&Math.floor(t*60)%4===0&&f.sub<12){const x=f.x+f.facing*(20+f.sub*24);f.sub++;if(x>4&&x<W-4)game.fx.push({type:'bones',x,t:0,owner:f,done:false,dmg:48});if(f.sub%3===1)sfx.dark();}return;}}

// --- Projectiles et effets ------------------------------------------------------
function updateProj(dt){for(const p of game.proj){if(p.delay>0){p.delay-=dt;continue;}p.life-=dt;const tgt=game.p[1-p.owner.side];
 if(p.type==='wisp'){const dx=tgt.x-p.x,dy=tgt.y-20-p.y,d=Math.hypot(dx,dy)||1;p.vx+=dx/d*260*dt;p.vy+=dy/d*260*dt;const sp=Math.hypot(p.vx,p.vy);if(sp>120){p.vx*=120/sp;p.vy*=120/sp;}if(rnd()<.5)part(p.x,p.y,0,-8,.4,'#bdf7d3',1);}
 if(p.type==='orb'&&rnd()<.8)part(p.x-p.vx*.02+rnd()*4-2,p.y+rnd()*4-2,-p.vx*.1,rnd()*20-10,.35,rnd()<.5?'#5fd4ff':'#c79bff');
 if(p.type==='meteor'){part(p.x,p.y,rnd()*10,-10,.3,rnd()<.5?'#ffb347':'#ff6a1a',2);if(p.y>=GROUND-2){p.life=0;burst(p.x,GROUND-3,14,'#ffb347',80,.45,120);sfx.boom();game.shake=3;if(Math.abs(tgt.x-p.x)<16&&tgt.y>GROUND-30)damage(tgt,p.dmg,p.owner,{fromX:p.x,knock:60,unblockable:false,color:'#ffb347',proj:true});}}
 if(p.type==='wave'&&rnd()<.9)part(p.x-p.vx*.03,p.y+rnd()*28-14,0,0,.3,'#fff3b0',1);
 p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<-20||p.x>W+20)p.life=0;
 if(p.type!=='meteor'&&!p.hit.has(tgt)&&Math.abs(p.x-tgt.x)<p.r+7&&p.y>tgt.y-38-p.r&&p.y<tgt.y+p.r){
  const r=damage(tgt,p.dmg,p.owner,{fromX:p.x-p.vx*.05,knock:p.type==='wave'?160:80,big:p.dmg>100,color:p.type==='wisp'?'#7cf2a6':p.type==='wave'?'#fff3b0':'#5fd4ff',proj:true,stun:p.dmg>100?.5:.3});
  if(r==='parry'){p.vx*=-1.2;p.vy=0;p.owner=tgt;p.hit=new Set();continue;}p.hit.add(tgt);if(!p.pierce)p.life=0;}}
 // Two opposing spells cancel out in a burst.
 for(const a of game.proj)for(const b of game.proj)if(a!==b&&a.owner!==b.owner&&a.life>0&&b.life>0&&a.type!=='meteor'&&b.type!=='meteor'&&Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r){const big=a.dmg>b.dmg?a:b,small=big===a?b:a;small.life=0;big.dmg-=small.dmg;if(big.dmg<=0)big.life=0;burst((a.x+b.x)/2,(a.y+b.y)/2,16,'#ffffff',90,.4);sfx.block();}
 game.proj=game.proj.filter(p=>p.life>0);
 for(const e of game.fx){e.t+=dt;const tgt=game.p[1-e.owner.side];
  if(e.type==='pillar'&&!e.done&&e.t>=e.warn){e.done=true;game.shake=4;burst(e.x,GROUND-4,18,'#fff3b0',90,.6,-40);if(Math.abs(tgt.x-e.x)<e.w/2+6)damage(tgt,e.dmg,e.owner,{fromX:e.x,unblockable:true,knock:40,launch:120,big:true,color:'#ffd86b'});}
  if(e.type==='bones'&&!e.done&&e.t>=.18){e.done=true;burst(e.x,GROUND-2,8,'#e9e4d6',60,.4,160);if(Math.abs(tgt.x-e.x)<13&&tgt.y>GROUND-8)damage(tgt,e.dmg,e.owner,{fromX:e.x,unblockable:true,launch:150,knock:30,color:'#7cf2a6'});}}
 game.fx=game.fx.filter(e=>e.t<(e.type==='pillar'?e.warn+e.life:.7));}
function drawProj(){for(const p of game.proj){if(p.delay>0)continue;const x=Math.round(p.x),y=Math.round(p.y);
 if(p.type==='orb'){glow(x,y,p.r*4,'95,212,255',.55);disc(x,y,p.r,'#8fe3ff');disc(x,y,Math.max(1,p.r-2),'#ffffff');ring(x,y,p.r+2+Math.sin(game.t*20),'#c79bff');}
 else if(p.type==='wisp'){glow(x,y,12,'124,242,166',.45);disc(x,y,3,'#f2fff6');P(x-2,y+2,1,2,'#f2fff6');P(x+1,y+2,1,3,'#f2fff6');P(x-1,y-1,1,1,'#1d2a22');P(x+1,y-1,1,1,'#1d2a22');}
 else if(p.type==='meteor'){glow(x,y,14,'255,150,60',.5);disc(x,y,3,'#ffb347');disc(x,y,1,'#fff3b0');}
 else if(p.type==='wave'){glow(x,y,28,'255,230,140',.5);const d=Math.sign(p.vx);for(let k=-14;k<=14;k++){const bend=Math.round((1-(k/14)**2)*6)*d;P(x+bend,y+k,2,1,'#fff3b0');P(x+bend-d*2,y+k,1,1,'#ffd86b');}}}
 for(const e of game.fx){if(e.type==='pillar'){if(e.t<e.warn){const k=e.t/e.warn;ring(e.x,GROUND+1,e.w/2+4,'#ffd86b',.25);ring(e.x,GROUND+1,(e.w/2+4)*k,'#fff3b0',.25);if(Math.floor(e.t*20)%2)P(e.x,GROUND-30*k,1,2,'#ffd86b');}
  else{const k=1-(e.t-e.warn)/e.life,wd=Math.round(e.w*(.6+.4*k));ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(255,216,107,${.5*k})`;ctx.fillRect(e.x-wd/2,0,wd,GROUND);ctx.fillStyle=`rgba(255,255,230,${.8*k})`;ctx.fillRect(e.x-wd/4,0,wd/2,GROUND);ctx.globalCompositeOperation='source-over';glow(e.x,GROUND-10,40,'255,216,107',.5*k);for(let s=0;s<3;s++)part(e.x+rnd()*wd-wd/2,GROUND-rnd()*150,0,-40,.4,'#fff3b0');}}
  if(e.type==='bones'){const k=clamp(e.t/.18,0,1),out=e.t<.18?k:1-clamp((e.t-.4)/.3,0,1),h=Math.round(14*out);if(h>0){P(e.x-1,GROUND-h,3,h,'#e9e4d6');P(e.x-3,GROUND-h,2,3,'#e9e4d6');P(e.x+2,GROUND-h-1,2,3,'#e9e4d6');P(e.x-1,GROUND-h-2,1,2,'#e9e4d6');glow(e.x,GROUND-4,10,'124,242,166',.3*out);}P(e.x-4,GROUND,9,1,'#2a2233');}}
 for(const f of game.p){if(f.state==='cast'&&f.def.id==='necro'&&f.skill===1&&f.beam){const o=game.p[1-f.side],x0=f.x+f.facing*14,y0=f.y-26,x1=o.x,y1=o.y-20;for(let k=0;k<=48;k++){const u=k/48;P(x0+(x1-x0)*u,y0+(y1-y0)*u+Math.sin(u*20+game.t*30)*2,2,2,k%3?'#7cf2a6':'#e8fff0');}glow((x0+x1)/2,(y0+y1)/2,30,'124,242,166',.25);glow(x1,y1,14,'124,242,166',.4);if(rnd()<.6)part(x1,y1,(x0-x1)*1.5,(y0-y1)*1.5,.6,'#7cf2a6');}
  if(f.state==='charge'){const r=3+f.charge*4,x=f.x+f.facing*14,y=f.y-38;glow(x,y,r*4,'95,212,255',.4+f.charge*.2);disc(x,y,Math.round(r*.7),'#8fe3ff');for(let s=0;s<2;s++){const a=rnd()*TAU;part(x+Math.cos(a)*18,y+Math.sin(a)*18,-Math.cos(a)*50,-Math.sin(a)*50,.35,rnd()<.5?'#5fd4ff':'#c79bff');}P(f.x-10,f.y+2,Math.round(20*Math.min(1,f.charge/1.5)),1,'#5fd4ff');}
  if(f.state==='cast'&&!(f.def.id==='necro'&&f.skill===1))glow(f.x+f.facing*14,f.y-36,12,f.def.id==='cleric'?'255,216,107':f.def.id==='necro'?'124,242,166':'95,212,255',.45);
  if(f.shield>0)ring(f.x,f.y-18,20+Math.sin(game.t*6),'rgba(255,216,107,.8)',1.1);if(f.regen>0&&rnd()<.4)part(f.x+rnd()*16-8,f.y-rnd()*30,0,-25,.6,'#ffe9a0');}}

// --- Joueurs, IA ---------------------------------------------------------------
const keys={};let prevIn=[{},{}];
const MAP=[{left:['KeyA'],right:['KeyD'],up:['KeyW'],down:['KeyS'],atk:['KeyF'],s1:['KeyG'],s2:['KeyH'],ult:['KeyR']},
 {left:['ArrowLeft'],right:['ArrowRight'],up:['ArrowUp'],down:['ArrowDown'],atk:['KeyK'],s1:['KeyL'],s2:['KeyO'],ult:['KeyP']}];
function readInput(side){const m=MAP[side],r={};for(const k in m)r[k]=m[k].some(c=>keys[c]);
 if(game.mode==='1p'&&side===0){const m2=MAP[1];for(const k in m2)r[k]=r[k]||m2[k].some(c=>keys[c]);r.atk=r.atk||keys.Space;}
 for(const k in touch)r[k]=r[k]||(side===0&&touch[k]);return r;}
const touch={};
const ai={t:0,plan:{},hold:0};
function aiInput(f,o,dt){const lvl=[.35,.6,.85][game.diff];ai.t-=dt;const dx=o.x-f.x,dist=Math.abs(dx),dir=Math.sign(dx)||1;
 if(f.state==='charge'){ai.hold-=dt;return {s1:ai.hold>0};}
 if(ai.t>0)return ai.plan;ai.t=.12+(1-lvl)*.25+rnd()*.1;const p={};
 const threat=game.proj.some(q=>q.owner!==f&&Math.abs(q.x-f.x)<70&&Math.sign(f.x-q.x)===Math.sign(q.vx))||(o.state==='attack'&&dist<34)||(o.state==='dash'&&dist<80);
 if(threat&&rnd()<lvl){if(f.def.id==='knight'&&canUse(f,1))p.s2=true;else if(rnd()<.5)p.down=true;else p.up=true;ai.plan=p;return p;}
 if(f.ult>=100&&rnd()<lvl){p.ult=true;ai.plan=p;return p;}
 const id=f.def.id;
 if(dist>70){if(rnd()<lvl*.7){if(id==='mage'&&canUse(f,0)){p.s1=true;ai.hold=.3+rnd()*.9;}else if(id==='cleric'&&canUse(f,0))p.s1=true;else if(id==='necro'&&canUse(f,0))p.s1=true;else if(id==='knight'&&canUse(f,0)&&dist<150)p.s1=true;}
  if(!p.s1){p[dir>0?'right':'left']=true;if(rnd()<.05)p.up=true;}}
 else if(dist<32){if(id==='cleric'&&f.hp<f.def.hp*.5&&canUse(f,1))p.s2=true;else if(id==='mage'&&canUse(f,1)&&rnd()<.3)p.s2=true;else if(id==='necro'&&canUse(f,1)&&rnd()<.4)p.s2=true;else if(rnd()<.2+lvl*.6)p.atk=true;else p[dir>0?'left':'right']=rnd()<.3;}
 else{if(id==='necro'&&canUse(f,1)&&rnd()<.3)p.s2=true;else p[dir>0?'right':'left']=true;}
 ai.plan=p;return p;}
function updateFighter(f,o,inp,dt){const pr={};for(const k in inp)pr[k]=inp[k]&&!prevIn[f.side][k];prevIn[f.side]={...inp};
 f.anim+=dt;f.stateT+=dt;f.cd[0]=Math.max(0,f.cd[0]-dt);f.cd[1]=Math.max(0,f.cd[1]-dt);f.flash-=dt;f.parry-=dt;f.shield-=dt;f.inv-=dt;f.comboT-=dt;f.hitsT-=dt;
 if(f.state!=='charge')f.mana=Math.min(100,f.mana+9*dt);if(f.regen>0){f.regen-=dt;f.hp=Math.min(f.def.hp,f.hp+50*dt);}
 f.hpShow+=(f.hp-f.hpShow)*Math.min(1,dt*(f.hpShow>f.hp?2.5:10));
 if(f.y<GROUND||f.vy<0){f.vy+=560*dt;f.y+=f.vy*dt;if(f.y>=GROUND){f.y=GROUND;f.vy=0;if(f.state==='jump')setState(f,'idle');if(f.state!=='ko')burst(f.x,GROUND,4,'#8a82a3',30,.25,0);}}
 f.x+=f.vx*dt;if(f.y>=GROUND&&!['walk','dash'].includes(f.state))f.vx*=Math.pow(.0005,dt);f.x=clamp(f.x,12,W-12);
 if(f.state==='ko'||game.phase!=='fight')return;
 if(f.stun>0){f.stun-=dt;if(f.state!=='hurt'){setState(f,'hurt');f.dur=f.stun;}return;}
 if(f.state==='hurt'){if(f.stateT>f.dur)setState(f,'idle');return;}
 if(['attack','cast','dash','blink'].includes(f.state)||(f.state==='block'&&f.sub===1)){skillTick(f,o,dt);if(f.state==='attack'&&f.stateT>=f.dur*.7&&pr.atk&&f.combo<2&&f.atk){startAttack(f);return;}if(f.stateT>=f.dur)setState(f,'idle');return;}
 if(f.state==='charge'){f.charge=Math.min(1.5,f.charge+dt);f.vx=0;if(!inp.s1){game.proj.push({type:'orb',x:f.x+f.facing*14,y:f.y-24,vx:f.facing*(150+f.charge*70),vy:0,r:Math.round(3+f.charge*3),dmg:Math.round(55+f.charge*105),owner:f,life:3,hit:new Set()});sfx.orb();setState(f,'cast');f.dur=.22;f.hitDone=true;f.skill=-1;}return;}
 if(f.y>=GROUND)f.facing=o.x>f.x?1:-1;
 if(inp.down&&f.y>=GROUND){f.vx=0;setState(f,'block',true);return;}else if(f.state==='block')setState(f,'idle');
 if(pr.atk)return startAttack(f);if(pr.s1)return startSkill(f,o,0);if(pr.s2)return startSkill(f,o,1);if(pr.ult)return startSkill(f,o,2);
 const dir=(inp.right?1:0)-(inp.left?1:0);
 if(pr.up&&f.y>=GROUND){f.vy=-235;f.y-=1;setState(f,'jump');sfx.jump();}
 if(f.y>=GROUND){f.vx=dir*f.def.speed;if(f.state!=='jump')setState(f,dir?'walk':'idle',true);}else f.vx=dir*f.def.speed*.85;
 // bodies do not overlap
 const gap=o.x-f.x;if(Math.abs(gap)<14&&Math.abs(o.y-f.y)<20){f.x-=Math.sign(gap||1)*(14-Math.abs(gap))/2;}}

// --- Interface -------------------------------------------------------------------
function text(s,x,y,c,size=10,align='left',shadow=true){ctx.font=`${size}px VT323, monospace`;ctx.textAlign=align;ctx.textBaseline='top';if(shadow){ctx.fillStyle='#0b0812';ctx.fillText(s,x+1,y+1);}ctx.fillStyle=c;ctx.fillText(s,x,y);}
function hud(){for(const f of game.p){const L=f.side===0,bw=150,x0=L?12:W-12-bw,y=10;
 P(x0-1,y-1,bw+2,9,'#0b0812');P(x0,y,bw,7,'#3a1420');const show=Math.round(bw*f.hpShow/f.def.hp),now=Math.round(bw*f.hp/f.def.hp);
 P(L?x0:x0+bw-show,y,show,7,'#ffffff');const hc=f.hp/f.def.hp>.5?'#4fd67a':f.hp/f.def.hp>.25?'#f0c33c':'#ff4d5e';P(L?x0:x0+bw-now,y,now,7,hc);P(L?x0:x0+bw-now,y,now,2,'rgba(255,255,255,.35)');
 const mw=Math.round(bw*.6*f.mana/100);P(L?x0:x0+bw-bw*.6,y+9,bw*.6,2,'#1c2140');P(L?x0:x0+bw-mw,y+9,mw,2,'#5f9fff');
 const uw=Math.round(bw*.6*f.ult/100),ux=L?x0:x0+bw-uw;P(L?x0:x0+bw-bw*.6,y+12,bw*.6,2,'#2a2233');P(ux,y+12,uw,2,f.ult>=100&&Math.floor(game.t*6)%2?'#ffffff':'#ffc233');
 text(`${f.def.name} · ${f.def.title}`,L?x0:x0+bw,y+15,'#f3ecff',10,L?'left':'right');if(f.ult>=100)text('ULTIME PRÊT',L?x0:x0+bw,y+24,'#ffc233',9,L?'left':'right');
 for(let k=0;k<2;k++)disc(L?x0+bw-6-k*8:x0+6+k*8,y+19,2,f.wins>k?'#ffc233':'#3a3249');
 // skill slots
 const keysLbl=game.mode==='1p'&&L?['F','G','H','R']:L?['F','G','H','R']:['K','L','O','P'];if(game.mode==='1p'&&!L)continue;
 for(let k=0;k<4;k++){const sx=L?8+k*22:W-8-22*4+k*22+2,sy=H-22,ready=k===0||(k<3?canUse(f,k-1):f.ult>=100);P(sx,sy,18,16,'#0b0812');P(sx+1,sy+1,16,14,ready?'#3a3249':'#221c2c');
  if(k>0&&k<3&&f.cd[k-1]>0){const h=Math.round(14*f.cd[k-1]/f.def.skills[k-1][3]);P(sx+1,sy+1+14-h,16,h,'rgba(0,0,0,.55)');}
  text(keysLbl[k],sx+9,sy+2,ready?'#ffffff':'#6e6480',10,'center',false);P(sx+4,sy+12,10,1,k===0?'#c3ccd7':k===3?'#ffc233':f.def.color);}}
 P(W/2-14,6,28,18,'#0b0812');P(W/2-13,7,26,16,'#2a2233');text(String(Math.ceil(game.timer)).padStart(2,'0'),W/2,6,game.timer<10?'#ff4d5e':'#ffffff',20,'center',false);
 text(`MANCHE ${game.round}`,W/2,26,'#bdb3d4',9,'center');}
function drawTexts(dt){for(const t of game.texts){t.life-=dt;const a=clamp(t.life*2,0,1);ctx.globalAlpha=a;if(t.big){const s=28+Math.max(0,(t.life-1)*40);text(t.text,t.x,t.y-s/2,t.c,s,'center');}else{t.y-=18*dt;text(t.text,t.x,t.y,t.c,10,'center');}ctx.globalAlpha=1;}game.texts=game.texts.filter(t=>t.life>0);}
function drawParts(dt){for(const p of game.parts){p.life-=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;}game.parts=game.parts.filter(p=>p.life>0);
 ctx.globalCompositeOperation='lighter';for(const p of game.parts)if(p.add){ctx.globalAlpha=clamp(p.life/p.max*1.5,0,1);P(p.x,p.y,p.s,p.s,p.c);}ctx.globalCompositeOperation='source-over';
 for(const p of game.parts)if(!p.add){ctx.globalAlpha=clamp(p.life/p.max*1.5,0,1);P(p.x,p.y,p.s,p.s,p.c);}ctx.globalAlpha=1;}

// --- Déroulé des manches ---------------------------------------------------
function startMatch(){audioOn();game.p=[fighter(CHARS[game.sel[0]],0),fighter(CHARS[game.sel[1]],1)];game.round=1;game.stats=[{hits:0,dmg:0},{hits:0,dmg:0}];buildArena(game.arena);startRound();$('arena-menu').hidden=true;$('arena-end').hidden=true;cv.focus();}
function startRound(){for(const f of game.p){const w=f.wins;Object.assign(f,fighter(f.def,f.side),{wins:w});}game.proj=[];game.fx=[];game.parts=[];game.texts=[];game.timer=99;game.phase='intro';game.phaseT=0;game.slow=1;prevIn=[{},{}];popup(W/2,80,`MANCHE ${game.round}`,'#ffffff',true);sfx.round();}
function endMatch(){game.phase='over';const w=game.p.find(f=>f.wins>=2)||game.p.reduce((a,b)=>a.hp>=b.hp?a:b);$('end-title').textContent=`${w.def.name} remporte le combat !`;
 $('end-stats').textContent=game.p.map(f=>`${f.def.name} : ${game.stats[f.side].hits} coups, ${game.stats[f.side].dmg} dégâts`).join(' · ');$('arena-end').hidden=false;}
function stepGame(dt){game.phaseT+=dt;
 if(game.phase==='intro'){if(game.phaseT>1.5){game.phase='fight';popup(W/2,80,'COMBAT !','#ffc233',true);sfx.round();}}
 else if(game.phase==='fight'){game.timer-=dt;if(game.timer<=0){game.timer=0;const [a,b]=game.p,ra=a.hp/a.def.hp,rb=b.hp/b.def.hp;if(ra!==rb){const w=ra>rb?a:b;w.wins++;popup(W/2,80,'TEMPS !','#ffffff',true);}game.phase='ko';game.phaseT=0;}}
 else if(game.phase==='ko'){if(game.phaseT>1.2)game.slow=1;if(game.phaseT>2.6){if(game.p.some(f=>f.wins>=2)||game.round>=5)endMatch();else{game.round++;startRound();}}}
 const [a,b]=game.p,ia=readInput(0),ib=game.mode==='1p'?aiInput(b,a,dt):readInput(1);
 if(game.phase==='fight'||game.phase==='ko'){updateFighter(a,b,game.phase==='fight'?ia:{},dt);updateFighter(b,a,game.phase==='fight'?ib:{},dt);}
 updateProj(dt);}
game.t=0;let last=0;
function frame(ts){const raw=Math.min(.05,(ts-last)/1000||.016);last=ts;
 if(game.phase!=='menu'&&!game.paused){let dt=raw*game.slow;if(game.hitstop>0){game.hitstop-=raw;dt=0;}game.t+=dt;if(dt>0)stepGame(dt);}
 ctx.save();if(game.shake>0&&!reduced){ctx.translate(Math.round((rnd()-.5)*game.shake),Math.round((rnd()-.5)*game.shake));game.shake=Math.max(0,game.shake-raw*20);}
 ctx.drawImage(bgC,0,0);drawDecoLive(game.t);
 if(game.phase==='menu'){demo(raw);}else{drawProj();for(const f of [...game.p].sort((x,y)=>x.state==='ko'?-1:1))drawFighter(f);drawParts(game.paused?0:raw*game.slow);}
 ctx.restore();
 if(game.flashW>0){ctx.fillStyle=`rgba(255,255,255,${game.flashW})`;ctx.fillRect(0,0,W,H);game.flashW=Math.max(0,game.flashW-raw*1.5);}
 if(game.phase!=='menu'){hud();drawTexts(game.paused?0:raw);}
 if(game.paused){ctx.fillStyle='rgba(8,6,14,.7)';ctx.fillRect(0,0,W,H);text('PAUSE',W/2,90,'#ffffff',26,'center');text('Échap pour reprendre',W/2,118,'#bdb3d4',10,'center');}
 requestAnimationFrame(frame);}
// Menu backdrop: the two chosen fighters idle on the chosen arena.
const demoF=[null,null];function demo(dt){for(let s=0;s<2;s++){if(!demoF[s]||demoF[s].def!==CHARS[game.sel[s]]){demoF[s]=fighter(CHARS[game.sel[s]],s);demoF[s].x=s?W-120:120;}const f=demoF[s];f.anim+=dt;drawFighter(f);}}

// --- Menu ------------------------------------------------------------------------
function portrait(i){const [c,k]=mk(40,44);const f=fighter(CHARS[i],0);K=sk;sk.clearRect(0,0,80,80);sk.save();sk.translate(40,72);drawBody(f,pose(f));sk.restore();K=ctx;k.drawImage(spr,-20,-30);return c;}
function menu(){const grid=(id,side)=>{const box=$(id);box.replaceChildren();CHARS.forEach((ch,i)=>{const b=document.createElement('button');b.type='button';b.className='pick'+(game.sel[side]===i?' on':'');b.setAttribute('aria-pressed',game.sel[side]===i);
  const pc=portrait(i);pc.className='pick-art';b.append(pc);const t=document.createElement('span');t.innerHTML=`<b>${ch.name}</b><small>${ch.title}</small>`;b.append(t);b.onclick=()=>{game.sel[side]=i;menu();};box.append(b);});};
 grid('pick-1',0);grid('pick-2',1);
 const ar=$('pick-arena');ar.replaceChildren();ARENAS.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.className='pick'+(game.arena===i?' on':'');b.innerHTML=`<span><b>${a.name}</b><small>${a.sub}</small></span>`;b.onclick=()=>{game.arena=i;buildArena(i);menu();};ar.append(b);});
 const info=$('skills-info');info.replaceChildren();for(const side of [0,1]){const ch=CHARS[game.sel[side]],d=document.createElement('div');const keysL=side===0?['F','G','H','R']:game.mode==='2p'?['K','L','O','P']:['IA','IA','IA','IA'];
  d.innerHTML=`<b style="color:${ch.color}">${ch.name}</b><ul><li><kbd>${keysL[0]}</kbd> Attaque en trois coups</li>${ch.skills.map((s,k)=>`<li><kbd>${keysL[k+1]}</kbd> ${s[0]} — ${s[1]}${s[2]?` (${s[2]} mana)`:''}</li>`).join('')}</ul>`;info.append(d);}
 $('p2-label').textContent=game.mode==='2p'?'Joueur 2 (flèches · K L O P)':'Adversaire (IA)';}
$('mode').onchange=e=>{game.mode=e.target.value;menu();};$('diff').onchange=e=>{game.diff=+e.target.value;};
$('fight').onclick=startMatch;$('again').onclick=()=>{for(const f of game.p)f.wins=0;startMatch();};$('to-menu').onclick=()=>{game.phase='menu';$('arena-end').hidden=true;$('arena-menu').hidden=false;menu();};
$('sound').onclick=e=>{muted=!muted;e.target.textContent=muted?'Son : non':'Son : oui';};
const GAME_KEYS=new Set(['KeyA','KeyD','KeyW','KeyS','KeyF','KeyG','KeyH','KeyR','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyK','KeyL','KeyO','KeyP','Space']);
addEventListener('keydown',e=>{if(e.code==='Escape'&&(game.phase==='fight'||game.phase==='intro'||game.phase==='ko')){game.paused=!game.paused;return;}if(GAME_KEYS.has(e.code)&&game.phase!=='menu'){e.preventDefault();keys[e.code]=true;}else if(e.code==='Enter'&&game.phase==='menu'&&!/BUTTON|SELECT/.test(e.target.tagName))startMatch();});
addEventListener('keyup',e=>{keys[e.code]=false;});addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(game.phase==='fight')game.paused=true;});
for(const b of document.querySelectorAll('[data-pad]')){b.onpointerdown=e=>{e.preventDefault();audioOn();touch[b.dataset.pad]=true;};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>{touch[b.dataset.pad]=false;};}
buildArena(0);menu();requestAnimationFrame(frame);
// Hook for automated checks: advance the simulation without waiting for animation frames.
game.advance=(n,dt=1/60)=>{for(let i=0;i<n;i++){game.t+=dt;stepGame(dt);for(const pt of game.parts){pt.life-=dt;pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;}}};
window.ArenaGame=game;
})();

/* TALAS: integer raster effects. The world keeps its original 360/480-line renderer. */
window.TalasRetroCombat=(()=>{
  'use strict';
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glyphs={A:'01110100011000111111100011000110001',B:'11110100011000111110100011000111110',C:'01111100001000010000100001000001111',D:'11110100011000110001100011000111110',E:'11111100001000011110100001000011111',F:'11111100001000011110100001000010000',G:'01111100001000010111100011000101111',H:'10001100011000111111100011000110001',I:'11111001000010000100001000010011111',J:'00111000100001000010000101001001100',K:'10001100101010011000101001001010001',L:'10000100001000010000100001000011111',M:'10001110111010110101100011000110001',N:'10001110011010110011100011000110001',O:'01110100011000110001100011000101110',P:'11110100011000111110100001000010000',Q:'01110100011000110001101011001001101',R:'11110100011000111110101001001010001',S:'01111100001000001110000010000111110',T:'11111001000010000100001000010000100',U:'10001100011000110001100011000101110',V:'10001100011000110001100010101000100',W:'10001100011000110101101011101110001',X:'10001100010101000100010101000110001',Y:'10001100010101000100001000010000100',Z:'11111000010001000100010001000011111',0:'01110100011001110101110011000101110',1:'00100011000010000100001000010001110',2:'01110100010000100010001000100011111',3:'11110000010000101110000010000111110',4:'00010001100101010010111110001000010',5:'11111100001000011110000010000111110',6:'01110100001000011110100011000101110',7:'11111000010001000100010000100001000',8:'01110100011000101110100011000101110',9:'01110100011000101111000010000101110','!':'00100001000010000100001000000000100','?':'01110100010000100010001000000000100','-':'00000000000000011111000000000000000','.':'00000000000000000000000000000000100',':':'00000001000010000000001000010000000','/':'00001000010001000100010001000010000'};
  const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/§/g,'S').replace(/[’«»]/g,'').toUpperCase();
  function text(g,s,x,y,k=1,color='#fff3cf',align='center'){
    s=normalize(s);k=Math.max(1,Math.round(k));const width=s.length*6*k;
    x=Math.round(x-(align==='center'?width/2:align==='right'?width:0));y=Math.round(y);g.fillStyle=color;
    for(const c of s){const b=glyphs[c];if(b)for(let i=0;i<35;i++)if(b[i]==='1')g.fillRect(x+(i%5)*k,y+Math.floor(i/5)*k,k,k);x+=6*k;}
  }
  function line(g,x,y,xx,yy,c,th=1){x=Math.round(x);y=Math.round(y);xx=Math.round(xx);yy=Math.round(yy);g.fillStyle=c;const dx=Math.abs(xx-x),sx=x<xx?1:-1,dy=-Math.abs(yy-y),sy=y<yy?1:-1;let e=dx+dy;
    for(let i=0;i<3000;i++){g.fillRect(x,y,th,th);if(x===xx&&y===yy)break;const e2=e*2;if(e2>=dy){e+=dy;x+=sx}if(e2<=dx){e+=dx;y+=sy}}}
  const src={fight:'arcade-fight.webp',ko:'arcade-ko.webp',d:'arcade-dylan-estampe.webp',c:'arcade-aurelien-estampe.webp'},art={};
  const readyPromise=Promise.all(Object.entries(src).map(([k,s])=>new Promise(resolve=>{const im=new Image();art[k]=im;im.onload=()=>resolve(true);im.onerror=()=>resolve(false);im.src='assets/talas/'+s+'?v=20261003-combat-2'})));
  const good=im=>im&&im.complete&&im.naturalWidth>0;
  function raster(c,host,hi=true){const h=hi?(matchMedia('(pointer: coarse)').matches?360:480):240,w=Math.round(h*(host.clientWidth||640)/(host.clientHeight||480));if(c.width!==w||c.height!==h){c.width=w;c.height=h}const g=c.getContext('2d');g.imageSmoothingEnabled=false;return {g,w,h};}
  function cover(g,im,x,y,w,h){if(!good(im))return;const s=Math.max(w/im.width,h/im.height);g.drawImage(im,Math.round(x+(w-im.width*s)/2),Math.round(y+(h-im.height*s)/2),Math.round(im.width*s),Math.round(im.height*s));}
  async function cinema(host,kind,who='d',sprites=null){
    const c=document.createElement('canvas');c.className='talas-retro-cinema';host.append(c);document.getElementById('frame').classList.add('combat-cinema');
    await readyPromise;const t0=performance.now(),duration=kind==='vs'?4.15:5.3;
    try{await new Promise(done=>{const tick=()=>{const t=(performance.now()-t0)/1000,{g,w,h}=raster(c,host);g.fillStyle='#0e101c';g.fillRect(0,0,w,h);
      const unit=Math.max(1,Math.round(h/240)),j=!reduced()&&t<.5?Math.round(Math.sin(t*80)*3):0;
      if(kind==='vs'){
        const inq=Math.min(1,t/.45),slide=reduced()?0:(1-inq)**3*w*.5;
        for(const [side,key]of[[0,'d'],[1,'c']]){const x=side*w/2+(side?slide:-slide);g.save();g.beginPath();g.rect(side*w/2,0,w/2,h);g.clip();const im=art[key];if(good(im)){const ds=Math.min(w*.47/im.width,h*.65/im.height),dw=Math.round(im.width*ds),dh=Math.round(im.height*ds);g.drawImage(im,Math.round(x+w*.25-dw/2+j),Math.round(h*.12),dw,dh)}g.restore();const cx=side?w*.78:w*.22;g.fillStyle='#ddcd9a';for(let y=-4;y<=4;y++){const ww=Math.sqrt(1-y*y/20)*w*.14;g.fillRect(Math.round(cx-ww),Math.round(h*.93+y*unit),Math.round(ww*2),unit)}const sprite=sprites&&sprites[key];if(sprite){const dh=h*.51,dw=dh*sprite.width/sprite.height;g.drawImage(sprite,Math.round(cx-dw/2+j),Math.round(h*.92-dh),Math.round(dw),Math.round(dh));}text(g,side?'AURELIEN':'DYLAN',cx,h*.025,unit*2,'#efd07c');}
        for(let i=0;i<8;i++){const x=w/2-10+Math.sin(t*7+i)*16,y=h*.38+i*unit;line(g,x,y,x+unit*6,y-unit*6,i%2?'#e77424':'#ba321b',unit*2)}
        text(g,'VS',w*.5+j+unit*2,h*.38+unit*2,unit*6,'#19112a');text(g,'VS',w*.5+j,h*.38,unit*6,'#66a8ff');
        text(g,'LEADERSHIP / DUEL',w/2,h-unit*10,unit,'#fff3cf');

      }else{
        g.fillStyle='#f2e4be';g.fillRect(0,0,w,h);g.fillStyle='#17294b';g.fillRect(w*.54,0,w*.46,h);cover(g,art[who],w*.03,h*.1,w*.48,h*.82);
        const x=w*.77;const scale=Math.max(1,Math.min(unit*2,Math.floor(w*.43/(18*6))));text(g,who==='d'?'DYLAN GAGNE !':'AURELIEN GAGNE !',x,h*.21,scale,'#ffd772');
        text(g,who==='d'?'POLITIQUE SST SIGNEE':'DIRECTION A CONVAINCRE',x,h*.42,unit,'#fff4ce');text(g,who==='d'?'BUDGET ET MOYENS':'LA PREVENTION CONTINUE',x,h*.5,unit,'#fff4ce');
        text(g,'ISO 45001',x,h*.69,unit*2,'#9ce6cf');text(g,'FIN DU COMBAT',x,h*.88,unit,'#fff4ce');
      }
      if(t<duration&&c.isConnected)requestAnimationFrame(tick);else done();};tick()});
    }finally{c.remove();document.getElementById('frame').classList.remove('combat-cinema')}
  }
  async function banner(host,kind,ms=1000){await readyPromise;const c=document.createElement('canvas');c.className='talas-retro-banner';host.append(c);const t0=performance.now();
    try{await new Promise(done=>{const tick=()=>{const t=(performance.now()-t0)/ms,{g,w,h}=raster(c,host);g.clearRect(0,0,w,h);const im=art[kind];
      if(good(im)){const s=(reduced()?1:Math.min(1.2,1+(1-Math.min(1,t*5))*.4))*Math.min(w*.74/im.width,h*.47/im.height),dw=Math.round(im.width*s),dh=Math.round(im.height*s);g.globalCompositeOperation='screen';g.drawImage(im,Math.round((w-dw)/2),Math.round((h-dh)*.43),dw,dh);g.globalCompositeOperation='source-over';}
      else text(g,kind==='ko'?'K.O.':'FIGHT !',w/2,h*.4,Math.max(2,Math.floor(h/32)),'#ffd875');
      if(t<1&&c.isConnected)requestAnimationFrame(tick);else done();};tick()});}finally{c.remove()}}
  const profiles={resp:{c:['#80c8ff','#d2eeff','#fff5c9'],k:'rise'},cout:{c:['#2caa76','#a8efbd','#fff4cc'],k:'grid'},bird:{c:['#ffd86c','#ed833d','#f9efcf'],k:'triangle'},cse:{c:['#8fe6e1','#e0f8da','#fff8cc'],k:'rings'},revue:{c:['#ae91f0','#e8ceff','#fff6ce'],k:'vortex'},obj:{c:['#5aaff3','#8ee8ef','#fff4d6'],k:'darts'},role:{c:['#5aaee5','#d0e3ff','#f7df84'],k:'orbit'},rolex:{c:['#a87928','#ffcc54','#fff0b9'],k:'orbit'},golf:{c:['#f8e7a6','#ed9d52','#fff7d3'],k:'slash'},postit:{c:['#f3da59','#ff9db1','#fff4bf'],k:'paper'},mail:{c:['#d8e6ff','#7cacdf','#fff4da'],k:'paper'},thalasso:{c:['#278fcb','#6ad9eb','#ebfcff'],k:'water'},cafe:{c:['#7a3a23','#bc7850','#ead8aa'],k:'steam'},fax:{c:['#bfb1df','#ece5fd','#ffffdf'],k:'paper'},staple:{c:['#8f9aa9','#dce4ec','#f9faf0'],k:'metal'},pie:{c:['#f06463','#6bbbda','#ffcc58'],k:'triangle'},calendar:{c:['#db8995','#f8d6ca','#ffffe7'],k:'paper'},parachute:{c:['#bd8226','#ffcd55','#fff4bd'],k:'coins'}};
  function create(host){const cv=document.createElement('canvas');cv.className='talas-retro-fx';host.append(cv);let events=[],ghosts=[],cue=null,profile=profiles.resp,run=true,acc=0;
    function burst(x,y,big=true){if(!run)return;const p=profile;events.push({kind:'hit',x,y,t:0,life:big?.42:.2,p,r:big?27:12});for(let i=0;i<(big?26:9);i++){const a=Math.random()*Math.PI*2,s=25+Math.random()*70;events.push({kind:p.k,x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-25,t:0,life:.35+Math.random()*.55,p,r:2+Math.random()*2});}events=events.slice(-260);}
    function cueAttack(id,side){profile=profiles[id]||profiles.resp;cue={id,side,t:0,life:['cse','revue','thalasso','parachute'].includes(id)?.6:.3};return new Promise(r=>setTimeout(r,Math.round(cue.life*1000)));}
    function step(dt){if(!run)return;const {g,w,h}=raster(cv,host,false);g.clearRect(0,0,w,h);events=events.filter(q=>(q.t+=dt)<q.life);ghosts=ghosts.filter(q=>(q.t+=dt)<.25);
      for(const q of ghosts){g.globalAlpha=(1-q.t/.25)*.28;g.drawImage(q.im,0,0,w,h)}g.globalAlpha=1;
      for(const q of events){const k=q.t/q.life,p=q.p,x=Math.round(q.x+(q.vx||0)*q.t),y=Math.round(q.y+(q.vy||0)*q.t+40*q.t*q.t),c=p.c[Math.min(2,Math.floor(k*3))];
        if(q.kind==='hit'){const r=Math.round(q.r*(.65+k)),pts=[];for(let i=0;i<20;i++){const a=i*Math.PI/10,rr=i%2?r*.32:r;pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}for(const [t,col]of[[5,'#111225'],[3,p.c[0]],[1,'#fff9da']])for(let i=0;i<20;i++)line(g,...pts[i],...pts[(i+1)%20],col,t);g.fillStyle='#fff9da';g.fillRect(x-3,y-3,7,7);}
        else if(q.kind==='rings'||q.kind==='orbit'||q.kind==='vortex'){const r=6+k*16;for(let i=0;i<12;i++){const a=i*Math.PI/6;line(g,x+Math.cos(a)*r,y+Math.sin(a)*r,x+Math.cos(a+.52)*r,y+Math.sin(a+.52)*r,c,1)}}
        else if(q.kind==='paper'||q.kind==='grid'){g.fillStyle='#18152c';g.fillRect(x-1,y-1,8,6);g.fillStyle=c;g.fillRect(x,y,6,4);line(g,x+1,y+1,x+4,y+1,p.c[0]);}
        else if(q.kind==='water'){g.fillStyle=c;g.fillRect(x,y-2,2,5);g.fillRect(x-1,y+1,4,3);}
        else if(q.kind==='coins'){g.fillStyle=p.c[0];g.fillRect(x-2,y-2,5,5);g.fillStyle=p.c[2];g.fillRect(x-1,y-2,2,4);}
        else if(q.kind==='triangle'){line(g,x,y-4,x-4,y+3,c,2);line(g,x-4,y+3,x+4,y+3,c,2);line(g,x+4,y+3,x,y-4,c,2)}
        else if(q.kind==='steam'){g.fillStyle=c;g.fillRect(x,y,4,4);g.fillRect(x-1,y-2,3,3);}
        else {const dx=q.kind==='rise'?4:q.kind==='darts'?12:8,dy=q.kind==='rise'?-12:-4;line(g,x,y,x+dx,y+dy,c,q.kind==='metal'?1:2)}
      }
      if(cue){cue.t+=dt;if(cue.t<cue.life&&!reduced()){const yy=64;g.fillStyle='#091629';g.fillRect(0,yy,w,30);for(let i=0;i<12;i++){const x=Math.round((i*43+cue.t*450)%w);line(g,x,yy+4,x-25,yy+26,profile.c[0],2)}const im=art[cue.side];if(good(im)){g.save();g.beginPath();g.rect(cue.side==='d'?0:w-80,yy,80,30);g.clip();cover(g,im,cue.side==='d'?0:w-80,yy-9,80,80);g.restore();}text(g,cue.side==='d'?'DYLAN':'AURELIEN',w/2,yy+11,1,profile.c[2]);}else cue=null;}
    }
    function ghost(im,dt){if(reduced()||!im)return;acc+=dt;if(acc<.08)return;acc=0;const tint=document.createElement('canvas');tint.width=im.width;tint.height=im.height;const g=tint.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-in';g.fillStyle=profile.c[0];g.fillRect(0,0,tint.width,tint.height);ghosts.push({im:tint,t:0});if(ghosts.length>4)ghosts.shift();}
    function drench(){const p=profiles.thalasso;for(let i=0;i<30;i++)events.push({kind:'water',x:Math.random()*cv.width,y:Math.random()*120,vx:0,vy:45,t:0,life:1+Math.random(),p,r:3});}
    return {canvas:cv,cue:cueAttack,step,burst,ghost,drench,projectedBurst(p,b){burst((p.x*.5+.5)*cv.width,(.5-p.y*.5)*cv.height,b)},destroy(){run=false;cv.remove();events=[];ghosts=[]},setProfile(id){profile=profiles[id]||profiles.resp}};
  }
  return {readyPromise,profiles,text,line,create,cinema,banner,reduced};
})();

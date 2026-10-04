/* Le rendu arcade du seul mini-jeu de combat. Questions et règles dans le CV. */
(() => {
  'use strict';
  window.TALAS_HK=window.TALAS_HK||{on:true};
  const BASE='assets/talas-natifs/combat/';
  const clamp=x=>Math.max(0,Math.min(1,x));
  window.TALAS_COMBAT={
    async preload(N){
      const data=await N.json(BASE+'combat.json');
      data.background=await N.image('assets/talas-natifs/'+data.office);
      data.ui={};
      for(const [name,file] of Object.entries(data.hud))data.ui[name]=await N.image(BASE+file);
      data.icons={d:await N.image('assets/talas-natifs/characters/icon-d.png'),c:await N.image('assets/talas-natifs/characters/icon-c.png')};
      data.objects=await N.json(BASE+'objets.json');
      await Promise.all(Object.values(data.objects).map(async o=>{o.image=await N.image(BASE+o.file)}));
      for(const fx of Object.values(data.effects))for(const entry of Object.values(fx.images))entry.image=await N.image(BASE+entry.file);
      return data;
    },
    attach({box,DY,AU,A,R},N){
      const cv=document.createElement('canvas');cv.className='native-hokuto';cv.setAttribute('role','img');
      cv.setAttribute('aria-label','Combat de Dylan contre Aurélien dans le bureau du PDG. Vie et chrono indiqués dans l’interface.');box.prepend(cv);box.classList.add('hk','hk-natif');R.domElement.style.visibility='hidden';
      const style=document.createElement('style');style.textContent=`
        .hk-natif .native-hokuto{position:absolute;inset:0;width:100%;height:100%;z-index:0;image-rendering:pixelated}
        .hk-natif .a3hud{clip-path:inset(50%);width:1px;height:1px;overflow:hidden;white-space:nowrap}
        .hk-natif .a3fx,.hk-natif .hk-bot{display:none}
        .hk-natif .a3big.native-banner,.hk-natif .a3name{visibility:hidden}
        .hk-natif .a3ico>canvas{display:none}
        .hk-natif .a3crt{z-index:1;opacity:.3}
      `;box.append(style);
      box.querySelector('.a3l .a3ico img').src='assets/talas-natifs/characters/icon-d.png';box.querySelector('.a3r .a3ico img').src='assets/talas-natifs/characters/icon-c.png';
      const state={t:0,hp:[100,200],hits:0,rage:false,effects:[],objects:[],particles:[],gags:{},attack:null,cut:null,banner:null,clips:{},poses:{},damageTrail:[1,1],seen:new Set()};
      const H={S:state};
      const mapping={idleD:0,idleC:0,crouchD:5,airD:9,strikeD:121,relD:125,throwD:125,shoutD:100,blockC:86,windC:123,swingC:125,followC:125,hitD:44,hitC:44,flyD:60,lieD:72,winD:99,tauntC:100,drawD:123,showD:125,drawC:123,showC:125,throwC:125,relC:125};
      const push=(kind,x,y,life,size,dir=1)=>state.effects.push({kind,x,y,t:0,life,size,dir});
      H.impact=(big,dir,p)=>{
        push(big?'heavy':'spark',p.x,1.65,big?.2:.16,big?205:108,dir);
        if(big){push('burst',p.x,1.5,.55,220,dir);push('ring',p.x,1.6,.24,210,dir);state.hits++;state.hitLabel=.8}
        state.flash=big?.055:.025;
      };
      H.guard=(p,dir=1)=>push('guard',p.x,1.45,.22,125,dir);
      H.cut=(txt,right)=>{state.cut={txt,right,t:0};push('energy',right?AU.root.position.x:DY.root.position.x,1.3,.3,170,right?-1:1)};
      H.rage=()=>{state.rage=true;state.rageStart=state.t;state.flash=.04};
      H.ko=()=>{push('finish',(DY.root.position.x+AU.root.position.x)/2,1.3,.55,440);state.ko=true};
      const workKeys=new Set(['resp','cout','bird','cse','revue','obj','role']);
      H.object=(kind,o)=>{if(kind==='chutepack')kind='parachute';const shot=kind==='dart';if(shot)kind='obj';if(!N.combat.objects[kind])return;state.objects.push({kind,o,shot,born:state.t,role:workKeys.has(kind)?'d':'c'})};
      H.attack=(kind,role)=>{if(kind==='chutepack')kind='parachute';state.attack={kind,role,start:state.t,hit:null};state.seen.add('attack:'+kind)};
      const scatter=(kind,x,y,n,life=1.5)=>{
        for(let i=0;i<n;i++){const a=i*2.39996;state.particles.push({kind,x,y,vx:Math.cos(a)*(1.5+(i%4)*.5),vy:1.2+(i%5)*.65,t:0,life,spin:(i%2?1:-1)*(3+i%5),size:kind==='coins'?20:kind==='paper'?24:kind==='note'?20:32,seed:i})}
      };
      H.attackHit=(target,ok=true)=>{
        const a=state.attack;if(!a)return;a.hit=state.t;a.ok=ok;
        if(!ok)return;
        const f=target==='d'?DY:AU,x=f.root.position.x;
        const gag={postit:'buried',fax:'mummy',cafe:'drenched'}[a.kind];if(gag&&target==='d')state.gags.d={kind:gag,until:state.t+2.5};
        if(a.kind==='resp'&&target==='c')state.gags.c={kind:'stamp-mark',until:state.t+2};
        const bits={rolex:'coins',postit:'note',mail:'paper',fax:'paper',calendar:'paper',parachute:'coins',cout:'paper',revue:'paper',cafe:'coffee-splash',thalasso:'fish',pie:'pie',bird:'bird'}[a.kind];
        if(bits)scatter(bits,x,1.65,bits==='pie'||bits==='bird'?5:bits==='coffee-splash'?4:20,1.8);
        state.seen.add('gag:'+a.kind);
      };
      H.banner=(txt,ms)=>{
        const type=/^ROUND \d+/.test(txt)?'round':/^FIGHT/.test(txt)?'fight':txt==='K.O.'?'ko':txt==='TIME OVER'?'time':null;
        if(!type)return false;
        state.banner={type,txt,t:0,life:ms/1000,round:Number(txt.match(/\d+/)?.[0]||1)};return true;
      };
      const cover=(g,im,w,h,zoom=1,dx=0,dy=0)=>{
        const s=Math.max(w/im.width,h/im.height)*zoom;
        g.drawImage(im,Math.round((w-im.width*s)/2+dx),Math.round((h-im.height*s)/2+dy),Math.round(im.width*s),Math.round(im.height*s));
      };
      const lettering=(g,txt,x,y,s=1,align='left')=>{
        txt=String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/’/g,"'").toUpperCase();
        if(align==='right')x-=txt.length*12*s;if(align==='center')x-=txt.length*6*s;
        for(let i=0;i<txt.length;i++){const c=txt.charCodeAt(i)-32;if(c<0||c>94)continue;g.drawImage(N.combat.ui.glyphs,(c%16)*12,Math.floor(c/16)*16,12,16,Math.round(x+i*12*s),Math.round(y),Math.round(12*s),Math.round(16*s))}
      };
      // The native speed maps and ANMH frames remain images, with nearest sampling.
      const speed=(g,w,h,t,right=false)=>{
        const im=N.combat.ui['intro-speed-'+(Math.floor(t*24)%2)];
        g.save();g.globalAlpha=.9;g.translate(right?w:0,0);g.scale(right?-1:1,1);
        const zoom=1.2+(t*3%1)*.4;cover(g,im,w,h,zoom,-w*.06*Math.sin(t*22),0);g.restore();
      };
      const nativeFx=(g,kind,x,y,t,life,size,loop=false)=>{
        const fx=N.combat.effects[kind];let ticks=t/Math.max(.001,life)*fx.clip.ticks;
        ticks=loop?((ticks%fx.clip.ticks)+fx.clip.ticks)%fx.clip.ticks:Math.min(fx.clip.ticks-.001,Math.max(0,ticks));
        let frame=fx.clip.frames.at(-1);for(const f of fx.clip.frames){ticks-=Math.max(1,f.ticks);if(ticks<0){frame=f;break}}
        const b=fx.bounds,s=size/Math.max(b[2]-b[0],b[3]-b[1]),cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2;
        g.save();g.translate(Math.round(x),Math.round(y));g.scale(s,s);
        for(const sp of frame.sprites){const e=fx.images[sp.image];if(e)g.drawImage(e.image,sp.x+e.crop[0]-cx,sp.y+e.crop[1]-cy)}g.restore();
      };
      const subtitle=(g,w,h,txt,y)=>{
        g.save();g.font=`700 ${Math.max(8,Math.round(h*.032))}px "Trebuchet MS",sans-serif`;g.textAlign='center';g.lineJoin='round';g.lineWidth=3;g.strokeStyle='#170b0d';g.fillStyle='#ffe19a';g.strokeText(txt,w/2,y);g.fillText(txt,w/2,y);g.restore();
      };
      H.challengerFrame=(g,w,h,t)=>{
        g.save();g.imageSmoothingEnabled=false;cover(g,N.combat.background,w,h);g.fillStyle='rgba(15,7,9,.82)';g.fillRect(0,0,w,h);speed(g,w,h,t);
        const q=clamp((t-.48)/.5),e=1-Math.pow(1-q,3),exit=clamp((t-3.55)/.35);
        if(t<.65){lettering(g,'NOUVEAU CHALLENGER',w/2,h*.44,Math.min(1.8,w/260),'center')}
        for(const right of [false,true]){
          g.save();g.beginPath();g.moveTo(right?w*.56:0,0);g.lineTo(right?w:w*.56,0);g.lineTo(right?w:w*.44,h);g.lineTo(right?w*.44:0,h);g.closePath();g.clip();speed(g,w,h,t,right);
          const im=N.portraits[right?'c':'d'],ph=h*.93,pw=ph*im.width/im.height,shift=((1-e)+exit)*w*(right?1:-1);
          const x=(right?w*.5-pw*.18:w*.45-pw)+shift;
          g.drawImage(im,Math.round(x),Math.round(h-ph+Math.sin(t*18)*h*.004),Math.round(pw),Math.round(ph));g.restore();
        }
        if(t>.65){
          if(t<1.7)nativeFx(g,'ring',w/2,h*.49,t-.65,1.05,h*.38);
          const scale=Math.min(3,w/160)*(1+Math.max(0,1-q*2));
          lettering(g,'VS',w/2,h*.42,scale,'center');
          lettering(g,'DYLAN',w*.23,h*.86,Math.min(1.45,w/360),'center');lettering(g,'AURELIEN',w*.77,h*.86,Math.min(1.45,w/360),'center');
          lettering(g,'ISO 45001 - LE CHOC DES EGOS',w/2,h*.96,Math.min(.65,w/580),'center');
        }
        if(t>.94&&t<1.09){g.globalAlpha=Math.max(0,1-(t-.94)/.15)*.75;g.fillStyle='#fff3cc';g.fillRect(0,0,w,h);g.globalAlpha=1}
        if(t>3.85){g.globalAlpha=clamp((t-3.85)/.25);g.fillStyle='#fff3cc';g.fillRect(0,0,w,h)}g.restore();
        state.seen.add('intro:portraits');state.introTime=t;
      };
      H.victoryFrame=(g,w,h,t,who)=>{
        g.save();g.imageSmoothingEnabled=false;
        // Preloaded opaque illustration is always drawn, including the very first frame.
        const im=N.combat.ui['victory-'+who],settle=1-Math.pow(1-clamp(t/.65),3);
        cover(g,im,w,h,1.07-.07*settle,(who==='d'?-1:1)*w*.022*(1-settle),0);
        if(t<.55)nativeFx(g,'finish',w*.5,h*.5,t,.55,h*1.2);
        if(t<.32){g.globalAlpha=(1-t/.32)*.8;speed(g,w,h,t,who==='c');g.globalAlpha=1}
        if(t>.6){const q=clamp((t-.6)/.2);g.globalAlpha=q;g.fillStyle='rgba(26,7,8,.85)';g.fillRect(0,h*.875,w,h*.125);
          const name=who==='d'?'DYLAN GAGNE !':'AURELIEN GAGNE !';lettering(g,name,w/2,h*.9,Math.min(1.75,w/(name.length*13)),'center');g.globalAlpha=1}
        if(t>.8){const caption=who==='d'?'La sécurité gagne. Le PDG a perdu son trône.':'Le PDG gagne. L’audit de mardi reste à faire.';
          subtitle(g,w,h,caption,h*.055);if(t>2)subtitle(g,w,h,'安全 (anzen) = sécurité. Toujours pas un sushi.',h*.10)}
        if(t>.35&&t<1.15)nativeFx(g,'ring',w*(who==='d'?.58:.81),h*.45,t-.35,.8,h*.38);
        g.restore();state.seen.add('victory:'+who);state.victoryTime=t;state.victoryWho=who;
      };
      H.cutFrame=(g,w,h,t,right,txt)=>{
        if(t>=1.08)return;
        const enter=1-Math.pow(1-clamp(t/.13),3),exit=clamp((t-.77)/.31),span=w*.65,by=h*.17,bh=h*.39;
        const shift=((1-enter)+exit*exit)*span*(right?1:-1),x=(right?w-span:0)+shift,slant=h*.18;
        g.save();g.beginPath();g.moveTo(x+(right?slant:0),by);g.lineTo(x+span,by);g.lineTo(x+span-(right?0:slant),by+bh);g.lineTo(x,by+bh);g.closePath();g.clip();
        g.fillStyle='rgba(12,7,9,.87)';g.fillRect(x,by,span,bh);speed(g,w,h,t,right);
        const im=N.portraits[right?'c':'d'],ph=bh*.99,pw=ph*im.width/im.height,ix=right?x+span-pw:x;
        g.drawImage(im,Math.round(ix+(1-enter)*span*(right?1:-1)),Math.round(by+bh-ph),Math.round(pw),Math.round(ph));
        g.fillStyle='#d89b34';g.fillRect(x,by+bh-2,span,2);g.fillRect(x,by,span,2);
        if(t<.22)nativeFx(g,'ring',x+(right?slant:span-slant),by+bh*.5,t,.22,bh*.6);
        const words=String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/§/g,'ISO ').toUpperCase().split(' '),rows=[];let row='';for(const word of words){if((row+' '+word).trim().length>17){rows.push(row);row=word}else row=(row+' '+word).trim()}if(row)rows.push(row);
        const cx=right?x+span*.30:x+span*.70,s=Math.min(.78,w/800);rows.slice(0,3).forEach((line,i)=>lettering(g,line,cx,by+bh*.62+i*19*s,s,'center'));
        g.restore();
        state.seen.add('cut:'+(right?'c':'d'));state.cutTime=t;
      };
      H.etape=dt=>{
        state.t+=dt;state.hp=[DY.hp,AU.hp];state.effects.forEach(e=>e.t+=dt);state.effects=state.effects.filter(e=>e.t<e.life);
        state.flash=Math.max(0,(state.flash||0)-dt);state.hitLabel=Math.max(0,(state.hitLabel||0)-dt);
        state.objects=state.objects.filter(x=>x.o.parent&&state.t-x.born<12);
        state.particles.forEach(p=>p.t+=dt);state.particles=state.particles.filter(p=>p.t<p.life);
        for(const role of ['d','c'])if(state.gags[role]?.until<state.t)delete state.gags[role];
        if(state.attack&&state.t-state.attack.start>9)state.attack=null;
        if(state.cut&&(state.cut.t+=dt)>1.5)state.cut=null;
        if(state.banner&&(state.banner.t+=dt)>state.banner.life)state.banner=null;
        [DY,AU].forEach((f,i)=>{const value=clamp(f.hp/f.max);state.damageTrail[i]=Math.max(value,state.damageTrail[i]-dt*.6)});
      };
      H.rendre=()=>{
        // Same finite arcade pixel grid on desktop and phone; CSS only enlarges it.
        const ratio=(box.clientWidth||640)/(box.clientHeight||480),h=Math.min(480,Math.round(640/Math.max(1.1,ratio))),w=Math.round(h*ratio),unit=h/480;
        if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
        const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
        if(!N.ready){g.fillStyle='#111723';g.fillRect(0,0,w,h);return}
        const data=N.combat,ui=data.ui;
        const mid=(DY.root.position.x+AU.root.position.x)/2,pp=w/Math.max(9,Math.abs(DY.root.position.x-AU.root.position.x)+5),foot=h*.8;
        const px=x=>Math.round(w/2+(x-mid)*pp);
        const objectSprite=(kind,x,y,size,angle=0,flip=false,alpha=1)=>{
          const o=data.objects[kind];if(!o)return;const ww=Math.round(size*unit),hh=Math.round(ww*o.image.height/o.image.width);
          g.save();g.globalAlpha=alpha;g.translate(Math.round(x),Math.round(y));g.rotate(angle);g.scale(flip?-1:1,1);g.drawImage(o.image,-Math.round(ww/2),-Math.round(hh/2),ww,hh);g.restore();state.seen.add('object:'+kind);
        };
        const objectPoint=new THREE.Vector3();
        // Preserve the full office and the clear fighting lane even in a narrow viewport.
        const bh=h,bw=bh*data.background.width/data.background.height;
        g.drawImage(data.background,Math.round((w-bw)/2),0,Math.round(bw),bh);
        function effect(kind,x,y,t,life,size,dir=1,loop=false){
          const fx=data.effects[kind];if(!fx)return;
          let ticks=(t/Math.max(.001,life))*fx.clip.ticks;ticks=loop?((ticks%fx.clip.ticks)+fx.clip.ticks)%fx.clip.ticks:Math.min(fx.clip.ticks-.001,Math.max(0,ticks));
          let frame=fx.clip.frames.at(-1);for(const f of fx.clip.frames){ticks-=Math.max(1,f.ticks);if(ticks<0){frame=f;break}}
          const b=fx.bounds,sc=size/Math.max(1,b[2]-b[0],b[3]-b[1]),cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2;
          g.save();g.translate(Math.round(x),Math.round(y));g.scale(dir<0?-sc:sc,sc);
          for(const sp of frame.sprites){const e=fx.images[sp.image];if(e)g.drawImage(e.image,Math.round(sp.x+e.crop[0]-cx),Math.round(sp.y+e.crop[1]-cy))}
          g.restore();state.seen.add(kind);
        }
        const stamp=(name,x,y,width,flip=false)=>{
          const im=ui[name];if(!im)return;const hh=width*im.height/im.width;g.save();g.translate(Math.round(x),Math.round(y));g.scale(flip?-1:1,1);g.drawImage(im,flip?-width:0,0,Math.round(width),Math.round(hh));g.restore();return hh;
        };
        const text=(txt,x,y,s=1,align='left')=>{
          txt=String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/’/g,"'").toUpperCase();
          if(align==='right')x-=txt.length*12*s;if(align==='center')x-=txt.length*6*s;
          for(let i=0;i<txt.length;i++){const c=txt.charCodeAt(i)-32;if(c<0||c>94)continue;g.drawImage(ui.glyphs,(c%16)*12,Math.floor(c/16)*16,12,16,Math.round(x+i*12*s),Math.round(y),Math.round(12*s),Math.round(16*s))}
        };
        if(state.rage&&AU.hp>0){
          effect('aura',px(AU.root.position.x),foot-92*unit,state.t-(state.rageStart||0),.8,290*unit,-1,true);
          effect('electric',px(AU.root.position.x),foot-135*unit,state.t,.38,270*unit,-1,true);
        }
        for(const [role,f] of [['d',DY],['c',AU]]){
          let pose=f.cur.p,elapsed=state.t,duration=0;
          if(f.anim){let i=0;while(i<f.anim.tr.length-1&&f.anim.tr[i+1][0]<=f.anim.t)i++;const a=f.anim.tr[i],b=f.anim.tr[Math.min(i+1,f.anim.tr.length-1)];pose=b[1];elapsed=f.anim.t-a[0];duration=b[0]-a[0]}
          let id=mapping[pose]??0;if(/idle/.test(pose)&&f.anim&&Math.abs(f.root.position.x-f.cur.x)>.2)id=1;
          const clip=N.hk.fighters[role].clips[id]||N.hk.fighters[role].clips[0],ticks=duration&&!/idle/.test(pose)?elapsed/duration*clip.ticks:elapsed*60;
          const personal=N.characters.combat[role],seq=personal.sequences[id]||personal.sequences[0],period=Math.max(1,clip.ticks),loopPhase=((ticks%period)+period)%period/period;
          const phase=duration&&!/idle/.test(pose)?Math.min(.999,Math.max(0,elapsed/duration)):loopPhase,index=seq[Math.floor(phase*seq.length)];
          const y=foot-Math.max(0,f.root.position.y-f.HIP)*pp;
          g.save();g.fillStyle='rgba(12,8,16,.32)';g.beginPath();g.ellipse(px(f.root.position.x),foot+2*unit,40*unit,7*unit,0,0,Math.PI*2);g.fill();g.restore();
          if(id===1)effect('dust',px(f.root.position.x)+(role==='c'?20:-20)*unit,foot,state.t,.32,80*unit,role==='c'?-1:1,true);
          const gag=state.gags[role];
          if(gag&&['buried','mummy','drenched'].includes(gag.kind)){
            const im=data.objects[gag.kind].image,hh=174*unit,ww=hh*im.width/im.height;
            g.drawImage(im,Math.round(px(f.root.position.x)-ww/2),Math.round(y-hh),Math.round(ww),Math.round(hh));state.seen.add('victim:'+gag.kind);
          }else N.drawCharacter(g,personal,index,px(f.root.position.x),Math.round(y),.68*unit,role==='c');
          if(gag?.kind==='stamp-mark')objectSprite('stamp-mark',px(f.root.position.x)-8*unit,y-140*unit,42,-.18);
          if(['strikeD','swingC','followC','relD'].includes(pose)&&phase>.05&&phase<.8)effect(role==='c'?'swing':'sweep',px(f.root.position.x)+(role==='c'?-35:35)*unit,y-95*unit,phase,.8,150*unit,role==='c'?-1:1);
          state.clips[role]={id,pose,ticks,index,identity:role==='d'?'Dylan':'Aurelien',x:f.root.position.x};N.stats.combatFrames++;
        }
        // These sprites follow the original objects' real trajectories and life cycles.
        for(const entry of state.objects){
          const o=entry.o,kind=entry.kind;o.getWorldPosition(objectPoint);
          let x=px(objectPoint.x),y=foot-objectPoint.y*83*unit,size=data.objects[kind].width,angle=o.rotation.z+o.rotation.y*.3+o.rotation.x*.2;
          const scale=Math.max(.02,o.scale.x);let alpha=1;
          if(['wave','flood','puddle'].includes(kind)){
            const breaker=kind==='wave'&&state.t-entry.born>1.5,im=data.objects[breaker?'wave-break':kind].image,hh=(kind==='wave'?300:kind==='flood'?180:30)*unit*Math.max(.02,o.scale.y),ww=(kind==='wave'?380:size)*unit*scale;
            g.drawImage(im,Math.round(x-ww/2),Math.round(foot-hh),Math.round(ww),Math.round(hh));state.seen.add('object:'+kind);continue;
          }
          if(kind==='parachute'){y=foot-(objectPoint.y+1.4)*83*unit;angle=Math.sin(state.t*9)*.08;size*=Math.min(1.2,scale)}
          // Attached objects grow in the hand; projectiles spin using the existing 3D object clock.
          else if(scale<.9)size*=scale;
          if(entry.shot)size*=.3;
          if(o.parent===DY.J.hdR||o.parent===AU.J.hdR){
            const f=entry.role==='d'?DY:AU,dir=entry.role==='d'?1:-1;x=px(f.root.position.x)+dir*28*unit;y=foot-122*unit;
          }
          objectSprite(kind,x,y,size,angle,entry.role==='c',alpha);
          if(!workKeys.has(kind)&&['rolex','mail','pie','fax'].includes(kind)&&o.parent!==DY.J.hdR&&o.parent!==AU.J.hdR){
            g.save();g.globalAlpha=.3;for(let j=1;j<=3;j++)objectSprite(kind,x+j*14*unit,y,size*.8,angle,false,.14*(4-j));g.restore();
          }
        }
        for(const p of state.particles){const t=p.t,x=px(p.x+p.vx*t),y=foot-(p.y+p.vy*t-3.5*t*t)*83*unit;
          objectSprite(p.kind,x,Math.min(foot-3,y),p.size,p.spin*t+p.seed,false,Math.min(1,(p.life-t)*3));
        }
        const attack=state.attack;
        if(attack?.kind==='parachute'&&state.t-attack.start>1.55&&state.t-attack.start<3){
          for(let i=0;i<16;i++){const f=(state.t*1.3+i*.073)%1;objectSprite('coins',px(DY.root.position.x)+(i%4-1.5)*28*unit,foot-h*.7+f*h*.65,22,state.t*4+i)}
        }
        for(const e of state.effects)effect(e.kind,px(e.x),foot-e.y*83*unit,e.t,e.life,e.size*unit,e.dir);
        if(state.flash){g.save();g.globalAlpha=state.flash/.1;g.fillStyle='#fff1cc';g.fillRect(0,0,w,h);g.restore()}
        if(state.cut)H.cutFrame(g,w,h,state.cut.t,state.cut.right,state.cut.txt);
        // Native gold frame, animated energy texture and original glyphs, driven by the real HP/timer.
        const margin=Math.max(5,Math.round(w*.017)),icon=Math.min(52,w*.083),gap=7,barW=(w-2*margin-2*icon-2*gap-68)/2,barY=8;
        [DY,AU].forEach((f,i)=>{
          const role=i?'c':'d',ix=i?w-margin-icon:margin,bx=i?w-margin-icon-gap-barW:margin+icon+gap,frac=clamp(f.hp/f.max),height=barW*32/246;
          const inset=barW*.092,cellX=bx+(i?inset*.35:inset),cellW=barW-inset*1.35;
          stamp('health-frame',bx,barY,barW,!!i);
          g.save();g.beginPath();g.rect(Math.round(cellX),barY+height*.28,cellW,height*.39);g.clip();g.fillStyle='#33101a';g.fillRect(bx,barY,barW,height);
          const trail=state.damageTrail[i],tw=cellW*trail,fw=cellW*frac;
          g.fillStyle='#f4cfd0';g.fillRect(i?cellX:cellX+cellW-tw,barY,tw,height);
          g.beginPath();g.rect(i?cellX:cellX+cellW-fw,barY,fw,height);g.clip();
          const fill=ui['health-fill-'+Math.floor(state.t*12)%3];g.drawImage(fill,bx,barY,barW,height);g.restore();
          g.save();g.beginPath();g.moveTo(ix+2,icon*.62+5);g.lineTo(ix+icon*.5,5);g.lineTo(ix+icon-3,5);g.lineTo(ix+icon*.95,icon*.55);g.lineTo(ix+icon*.48,icon+5);g.closePath();g.clip();
          g.fillStyle='#16101d';g.fillRect(ix,3,icon,icon+5);g.drawImage(data.icons[role],ix+2,6,icon-4,icon-4);g.restore();stamp('portrait-frame',ix,4,icon);
          text(i?'AURELIEN':'DYLAN',i?bx+barW:bx,barY+height+2,1,i?'right':'left');
          const won=A.wins.filter(x=>x===(i?'C':'D')).length;
          for(let j=0;j<2;j++){g.save();g.globalAlpha=j<won?1:.22;stamp('round-on',i?bx+barW-13-j*13:bx+j*13,barY+height+18,9);g.restore()}
        });
        const timerW=52,tx=w/2-timerW/2;stamp('timer-frame',tx,1,timerW);
        const digits=String(Math.max(0,Math.min(99,Math.ceil(A.timer)))).padStart(2,'0');
        for(let i=0;i<2;i++){const n=+digits[i],x=n%4*64,y=Math.floor(n/4)*80;g.drawImage(ui['timer-digits'],x,y,64,80,Math.round(w/2-15+i*15),6,16,24)}
        text('ISO 45001',w/2,43,.6,'center');
        const botW=Math.min(210,w*.33),bottom=h-27;
        [0,1].forEach(i=>{const x=i?w-margin-botW:margin,value=i?(state.rage?1:Math.min(.94,state.hits*.07)):Math.min(.94,state.hits*.12);g.fillStyle='#130e1a';g.fillRect(x+10,bottom+4,(botW-17),8);g.fillStyle=i?'#ef7811':'#397aac';g.fillRect(x+10,bottom+4,(botW-17)*value,8);stamp('boost-frame',x,bottom,botW,!!i);text(i?'AURA':'ELAN',i?x+botW:x,bottom-18,.8,i?'right':'left')});
        if(state.hitLabel)stamp(A.fin?'fatal-label':'hit-label',w*.58,h*.26,w*.3);
        if(state.banner){
          const b=state.banner,k=b.t/b.life,zoom=1+.3*Math.max(0,1-k*5),alpha=Math.min(1,k*12,(1-k)*8);g.save();g.globalAlpha=alpha;
          if(b.type==='round'){
            const bw=Math.min(w*.48,h*.8),name=b.round>=3?'final':'battle',bh=bw*ui[name].height/ui[name].width;stamp(name,w/2-bw*.62,h*.33,bw);
            stamp('round-digit-'+Math.min(2,b.round),w/2+bw*.32,h*.31,bh*.5);
          }else{
            const name=b.type==='time'?'time-over':b.type,bw=Math.min(w*(b.type==='fight'?.7:.42),h*(b.type==='fight'?1.5:.85))*zoom,bh=bw*ui[name].height/ui[name].width;stamp(name,w/2-bw/2,h*.48-bh/2,bw);
          }
          g.restore();state.seen.add('banner:'+b.type);
        }
        state.viewport={width:w,height:h,pixelated:true};state.health=[clamp(DY.hp/DY.max),clamp(AU.hp/AU.max)];
      };
      H.detruire=()=>{cv.remove();style.remove()};window.TALAS_HK.dernier=H;return H;
    }
  };
})();

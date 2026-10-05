/* Effets originaux Talas : dessins et animation locale, sans fichiers Hun0fx. */
(() => {
  'use strict';
  const BASE='assets/talas-natifs/combat/',clamp=x=>Math.max(0,Math.min(1,x));
  window.TALAS_ARCADE_FX={
    async preload(N){const data=await N.json(BASE+'effets-originaux.json?v=1');data.image=await N.image(BASE+data.file);return data},
    attach(H,N,{DY,AU}){
      const S=H.S;S.arcadeEffects=[];S.arcadeEvents=[];
      const contact={resp:'tampon',cout:'choc',bird:'papier',cse:'voix',revue:'papier',obj:'electrique',role:'electrique',rolex:'impact',golf:'impact',postit:'papier',mail:'papier',thalasso:'eau',cafe:'cafe',fax:'choc',staple:'pointe',pie:'impact',calendar:'papier',parachute:'stress'};
      const index={impact:0,coup:1,pointe:2,electrique:3,tampon:4,papier:4,choc:5,eau:6,voix:7,cafe:8,stress:9,aura:10,final:11};
      const lifespan={impact:.48,coup:.37,pointe:.3,electrique:.6,tampon:.55,papier:.58,choc:.65,eau:.72,voix:.56,cafe:.78,stress:.62,final:.66};
      const add=(kind,x,y,size=185,dir=1,track=null)=>{
        const e={kind,x,y,size,dir,track,born:S.t,life:lifespan[kind]||.6,seed:S.arcadeEvents.length};
        S.arcadeEffects.push(e);if(S.arcadeEffects.length>8)S.arcadeEffects.shift();
        S.arcadeEvents.push({kind,t:S.t,x,y});S.seen.add('arcade:'+kind);return e;
      };
      const wrap=(name,fn)=>{const original=H[name];H[name]=(...args)=>{const result=original(...args);fn(...args);return result}};
      wrap('attackHit',(target,ok=true)=>{
        const a=S.attack;if(!a||!ok)return;const f=target==='d'?DY:AU,kind=contact[a.kind];if(!kind)return;
        const ground=['choc','eau','cafe'].includes(kind),size=ground?215:kind==='voix'?160:185;
        add(kind,f.root.position.x,ground?.65:1.65,size,a.role==='c'?-1:1);
      });
      wrap('release',(o,role)=>{
        const e=S.objects.find(e=>e.o===o);if(!e?.release)return;
        if(['dart','staple-shot'].includes(e.kind))add('pointe',e.release.origin.x,e.release.origin.y,115,role==='c'?-1:1,e);
      });
      wrap('rage',()=>{S.arcadeEvents.push({kind:'aura',t:S.t});S.seen.add('arcade:aura')});
      wrap('ko',()=>add('final',(DY.root.position.x+AU.root.position.x)/2,1.35,345));
      wrap('etape',()=>{S.arcadeEffects=S.arcadeEffects.filter(e=>S.t-e.born<e.life)});
      const vec=new THREE.Vector3();
      const sprite=(g,kind,x,y,size,dir=1,angle=0,alpha=1,anchorBottom=false)=>{
        const data=N.combat.arcade,frame=data.frames[index[kind]];if(!frame||size<1||alpha<.02)return;
        g.save();g.globalAlpha=Math.round(clamp(alpha)*7)/7;g.translate(Math.round(x),Math.round(y));g.scale(dir,1);g.rotate(Math.round(angle/(Math.PI/24))*Math.PI/24);
        g.drawImage(data.image,...frame.rect,-Math.round(size/2),anchorBottom?-Math.round(size):-Math.round(size/2),Math.round(size),Math.round(size));g.restore();
      };
      return {
        actor(role,pose,phase,f){
          const a=S.attack;if(!a||a.role!==role||phase<.08)return;
          if(!a.arcadeSwing&&['golf','calendar','cout','revue'].includes(a.kind)&&['strikeD','swingC','followC','relD'].includes(pose)){
            a.arcadeSwing=true;add('coup',f.root.position.x+(role==='c'?-.55:.55),1.4,215,role==='c'?-1:1);
          }
          if(!a.arcadeVoice&&a.kind==='cse'&&S.hands[role]){
            const p=S.hands[role].world;a.arcadeVoice=true;add('voix',p.x+.45,p.y,170,1);
          }
        },
        behind(g,{px,foot,unit}){
          if(S.rage&&AU.hp>0){const phase=Math.floor((S.t-(S.rageStart||0))*12)%6,scale=1+(phase%3)*.035;
            sprite(g,'aura',px(AU.root.position.x),foot+4*unit,212*unit*scale,-1,0,.7+(phase%2)*.14,true);
          }
        },
        draw(g,{px,foot,unit}){
          for(const e of S.arcadeEffects){
            const p=clamp((S.t-e.born)/e.life),burst=1-Math.pow(1-p,3),fade=clamp((1-p)/.42);let x=px(e.x),y=foot-e.y*83*unit;
            if(e.track?.o.parent){const t=e.track;e.track.o.getWorldPosition(vec);const bias=t.release.returning??(1-t.release.progress);x=px(vec.x+(t.release.origin.x-t.release.physics.x)*bias);y=foot-(vec.y+(t.release.origin.y-t.release.physics.y)*bias)*83*unit;}
            const size=e.size*unit;
            if(e.kind==='coup'){
              // A short trail opens from the weapon through the strike, then breaks into sparks.
              sprite(g,e.kind,x+e.dir*(p-.3)*38*unit,y,size*(.65+.35*burst),e.dir,(p-.4)*.48,fade);
            }else if(e.kind==='pointe'){
              sprite(g,e.kind,x-e.dir*25*unit,y,size*(.8+.2*burst),e.dir,0,fade);
            }else if(e.kind==='voix'){
              for(let n=0;n<3;n++){const q=clamp(p-n*.12);if(p<n*.12)continue;sprite(g,e.kind,x+e.dir*q*60*unit,y,size*(.5+q*.55),e.dir,0,fade*(1-n*.18));}
            }else{
              const angle=e.kind==='electrique'?(Math.floor(p*6)-2)*.12:0;
              sprite(g,e.kind,x,y,size*(.55+.45*burst),e.dir,angle,fade);
              // Hand drawn shards travel on independent arcs rather than scaling the entire hit alone.
              const bits=['choc','eau','cafe','papier','tampon','impact','stress','final'].includes(e.kind)?6:3;
              for(let n=0;n<bits;n++){
                const a=n*Math.PI*2/bits+e.seed*.73,r=size*(.15+.48*burst),xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r*.65-p*size*.14;
                sprite(g,e.kind==='eau'?'pointe':e.kind==='cafe'?'cafe':'impact',xx,yy,size*(e.kind==='final'?.12:.085),e.dir,a+p*.6,fade*.8);
              }
            }
          }
        }
      };
    }
  };
})();

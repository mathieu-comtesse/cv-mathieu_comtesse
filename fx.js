/* Effets d'interface : mot qui bascule (accueil), onglets en « split showcase », menus déroulants à aperçu qui suit le curseur. Sans dépendance. */
(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const wide=()=>innerWidth>760;

/* ---- 1. Mot qui bascule : « conformité. » <-> « traçabilité. », lettre par lettre ---- */
document.querySelectorAll('em.flip[data-a][data-b]').forEach(el=>{
  if(reduce)return;
  const A=[...el.dataset.a],B=[...el.dataset.b],n=Math.max(A.length,B.length);
  const build=()=>{
    const cs=getComputedStyle(el),size=parseFloat(cs.fontSize),ctx=document.createElement('canvas').getContext('2d');
    ctx.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const w=c=>c?ctx.measureText(c).width/size:0;
    el.setAttribute('aria-label',el.dataset.a);el.textContent='';el.classList.add('is-built');
    for(let i=0;i<n;i++){
      const a=A[i]||'',b=B[i]||'',s=document.createElement('span');
      s.className='fs';s.setAttribute('aria-hidden','true');
      s.style.setProperty('--wa',w(a)+'em');s.style.setProperty('--wb',w(b)+'em');
      s.style.setProperty('--d',(Math.sin(i/n*Math.PI/2)*0.9).toFixed(2)+'s');
      s.innerHTML=`<i class="f f1">${a}</i><i class="f f2">${b}</i><i class="f f3">${a}</i>`;
      el.append(s);
    }
  };
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(build);
});

if(!fine)return;

/* ---- 2. Split showcase sur les onglets : le sens du décalage dépend de la moitié de la barre ---- */
const nav=document.querySelector('.theme-nav');
if(nav){
  nav.querySelectorAll(':scope>a,:scope>.nav-menu>summary').forEach(t=>t.addEventListener('pointerenter',()=>{
    const r=t.getBoundingClientRect(),nr=nav.getBoundingClientRect();
    t.style.setProperty('--fx-sx',(r.left+r.width/2<nr.left+nr.width/2?-5:5)+'px');
  }));
}

/* ---- 3. Menus déroulants : ouverture au survol (souris), clic = épingler ; aperçu qui suit le curseur ---- */
const menus=[...document.querySelectorAll('.nav-menu')];
menus.forEach(m=>{
  let timer=0,byHover=false,pinned=false;
  const sum=m.querySelector('summary');
  m.addEventListener('pointerenter',e=>{
    if(e.pointerType!=='mouse'||!wide())return;
    clearTimeout(timer);
    timer=setTimeout(()=>{if(!m.open){byHover=true;pinned=false;m.open=true}},90);
  });
  m.addEventListener('pointerleave',e=>{
    if(e.pointerType!=='mouse')return;
    clearTimeout(timer);
    timer=setTimeout(()=>{if(m.open&&byHover&&!pinned)m.open=false},240);
  });
  sum.addEventListener('click',e=>{
    if(m.open&&byHover&&!pinned){e.preventDefault();pinned=true;return}   /* ouvert au survol : le clic épingle au lieu de refermer */
    byHover=false;pinned=false;
  });
  m.addEventListener('toggle',()=>{if(!m.open){byHover=false;pinned=false}});
});

const H=200,W=320,state=new WeakMap();
function thumbFor(panel){
  if(state.has(panel))return state.get(panel);
  const links=[...panel.querySelectorAll('a[data-img]')];
  const box=document.createElement('div');box.className='fx-thumb';box.setAttribute('aria-hidden','true');
  const strip=document.createElement('div');strip.className='fx-strip';
  links.forEach(a=>{const d=document.createElement('div'),i=new Image();i.alt='';i.decoding='async';i.src=a.dataset.img;d.append(i);strip.append(d)});
  box.append(strip);document.body.append(box);
  const th={box,strip,links,x:0,y:0,tx:0,ty:0,sc:0,tsc:0,sy:0,tsy:0,raf:0,shown:false};
  state.set(panel,th);return th;
}
function frame(th){
  const k=reduce?1:.18;
  th.x+=(th.tx-th.x)*k;th.y+=(th.ty-th.y)*k;th.sc+=(th.tsc-th.sc)*(reduce?1:.2);th.sy+=(th.tsy-th.sy)*(reduce?1:.22);
  th.box.style.transform=`translate(${th.x.toFixed(1)}px,${th.y.toFixed(1)}px) scale(${th.sc.toFixed(3)})`;
  th.strip.style.transform=`translateY(${th.sy.toFixed(1)}px)`;
  const moving=Math.abs(th.tx-th.x)>.4||Math.abs(th.ty-th.y)>.4||Math.abs(th.tsc-th.sc)>.004||Math.abs(th.tsy-th.sy)>.4;
  th.raf=moving?requestAnimationFrame(()=>frame(th)):0;
  if(!moving&&th.tsc===0)th.box.style.transform='translate(-999px,-999px) scale(0)';
}
const run=th=>{if(!th.raf)th.raf=requestAnimationFrame(()=>frame(th))};
function aim(th,cx,cy,panel){
  /* l'aperçu reste à côté du menu pour ne jamais masquer les entrées : à droite, ou à gauche s'il n'y a pas la place */
  const r=panel.getBoundingClientRect();
  let x=r.right+18+Math.max(0,cx-r.left)*.06;if(x+W>innerWidth-8)x=Math.max(8,r.left-W-18);
  th.tx=x;th.ty=Math.min(innerHeight-H-8,Math.max(8,cy-H/2));
}
function show(th,idx,cx,cy,panel){
  th.tsy=-idx*H;
  if(!th.shown){th.shown=true;aim(th,cx,cy,panel);th.x=th.tx;th.y=th.ty;th.sy=th.tsy}   /* première apparition : pas de glissement depuis le coin */
  th.tsc=1;run(th);
}
function hide(th){th.shown=false;th.tsc=0;run(th)}

menus.forEach(m=>{
  const panel=m.querySelector('.nav-panel');if(!panel)return;
  panel.querySelectorAll('a[data-img]').forEach(a=>{   /* le libellé et la légende bougent séparément */
    const t=[...a.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
    if(t){const s=document.createElement('span');s.className='fx-t';s.textContent=t.textContent;t.replaceWith(s)}
  });
  m.addEventListener('toggle',()=>{const th=thumbFor(panel);if(m.open)return;hide(th)});
  panel.addEventListener('pointerover',e=>{
    const a=e.target.closest('a[data-img]');if(!a||!wide())return;
    const th=thumbFor(panel);show(th,th.links.indexOf(a),e.clientX,e.clientY,panel);
  });
  panel.addEventListener('pointermove',e=>{
    const th=state.get(panel);if(!th||!th.shown)return;aim(th,e.clientX,e.clientY,panel);run(th);
  },{passive:true});
  panel.addEventListener('pointerleave',()=>{const th=state.get(panel);if(th)hide(th)});
  panel.addEventListener('focusin',e=>{
    const a=e.target.closest('a[data-img]');if(!a||!wide())return;
    const th=thumbFor(panel),r=a.getBoundingClientRect();show(th,th.links.indexOf(a),r.right,r.top+r.height/2,panel);
  });
  panel.addEventListener('focusout',()=>{const th=state.get(panel);if(th)hide(th)});
  m.addEventListener('toggle',()=>{if(m.open)thumbFor(panel)});   /* précharge les images à l'ouverture */
});
})();

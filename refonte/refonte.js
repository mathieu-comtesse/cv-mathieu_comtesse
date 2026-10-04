(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
/* 1 · text stream : le texte arrive par petits paquets (mots), curseur bloc */
function stream(el,delay=0){const t=el.dataset.stream;if(reduce){el.textContent=t;el.classList.add('is-done');return Promise.resolve()}
 const parts=t.match(/\S+\s*/g)||[];el.classList.add('is-typing');el.setAttribute('aria-label',t);let i=0;
 return new Promise(res=>setTimeout(function tick(){if(i>=parts.length){el.classList.replace('is-typing','is-done');return res()}
  el.textContent+=parts[i++];setTimeout(tick,60+Math.random()*110)},delay))}
/* 1b · flip text : un mot en remplace un autre en basculant */
function flip(el){const words=el.dataset.words.split('|');let i=0;const w=document.createElement('span');w.className='in';w.textContent=words[0];el.append(w);
 if(reduce||words.length<2)return;
 setInterval(()=>{const o=document.createElement('span');o.className='out';o.textContent=words[i];i=(i+1)%words.length;const n=document.createElement('span');n.className='in';n.textContent=words[i];
  el.replaceChildren(o,n);el.classList.remove('go');void el.offsetWidth;el.classList.add('go')},2600)}
const [h1,sub]=[$$('.rf-h1 .rf-stream')[0],$$('.rf-sub')[0]];
stream(h1,300).then(()=>flip($$('.rf-flip')[0]));stream(sub,+sub.dataset.delay||0);
if(reduce)flip($$('.rf-flip')[0]);
/* 2 · marquee glissable : défilement continu + saisie souris/doigt + inertie */
$$('.rf-track').forEach(tr=>{const row=tr.firstElementChild;row.append(...[...row.children].map(c=>c.cloneNode(true)));
 const dir=tr.classList.contains('rf-track--rev')?1:-1,speed=+tr.dataset.speed;let x=0,v=speed*dir,drag=false,lx=0,vel=0,last=performance.now();
 const half=()=>row.scrollWidth/2;
 const wrap=()=>{const h=half();if(x<=-h)x+=h;if(x>0)x-=h};
 const down=e=>{drag=true;lx=e.clientX;vel=0;tr.classList.add('drag');tr.setPointerCapture(e.pointerId)};
 const move=e=>{if(!drag)return;const dx=e.clientX-lx;lx=e.clientX;x+=dx;vel=dx*60;wrap()};
 const up=()=>{drag=false;tr.classList.remove('drag')};
 tr.addEventListener('pointerdown',down);tr.addEventListener('pointermove',move);tr.addEventListener('pointerup',up);tr.addEventListener('pointercancel',up);
 (function loop(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(!drag){if(!reduce){vel+=(0-vel)*Math.min(1,dt*3);x+=(v+vel)*dt;wrap()}}row.style.transform=`translate3d(${x}px,0,0)`;requestAnimationFrame(loop)})(last)});
/* 3 · hover img : aperçu qui suit le curseur avec un léger retard */
const peek=document.getElementById('rf-peek');
if(peek&&matchMedia('(hover:hover)').matches){const img=peek.querySelector('img');let tx=0,ty=0,px=0,py=0,on=false;
 $$('#rf-list a').forEach(a=>{const src=a.dataset.img;const pre=new Image();pre.src=src;
  a.addEventListener('pointerenter',()=>{img.src=src;peek.classList.add('on');on=true});
  a.addEventListener('pointerleave',()=>{peek.classList.remove('on');on=false});
  a.addEventListener('focus',()=>{img.src=src;peek.classList.add('on');const r=a.getBoundingClientRect();tx=r.right-340;ty=r.top-40});
  a.addEventListener('blur',()=>peek.classList.remove('on'))});
 addEventListener('pointermove',e=>{tx=e.clientX+24;ty=e.clientY-90},{passive:true});
 (function loop(){px+=(tx-px)*.16;py+=(ty-py)*.16;const rot=Math.max(-8,Math.min(8,(tx-px)*.06));peek.style.transform=`translate(${px}px,${py}px) rotate(${on?rot:-3}deg) scale(${on?1:.92})`;requestAnimationFrame(loop)})()}
/* 4 · galerie : saisie à la souris sur la rangée (le tactile défile nativement) */
const g=document.getElementById('rf-gallery');
if(g){let d=false,sx=0,sl=0,moved=0;
 g.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;d=true;sx=e.clientX;sl=g.scrollLeft;moved=0});
 addEventListener('pointermove',e=>{if(!d)return;const dx=e.clientX-sx;moved=Math.abs(dx);if(moved>4)g.classList.add('drag');g.scrollLeft=sl-dx});
 addEventListener('pointerup',()=>{d=false;setTimeout(()=>g.classList.remove('drag'),0)})}
/* 5 · split : la vidéo ne se charge qu'au survol / focus du côté « Après » */
const v=document.querySelector('.side--apres video');
if(v){const load=()=>{if(!v.src){v.src=v.dataset.src}v.play().catch(()=>{})};const s=v.closest('.side');s.addEventListener('pointerenter',load);s.addEventListener('focus',load);
 if(matchMedia('(hover:none)').matches){new IntersectionObserver(([e])=>{e.isIntersecting?load():v.pause()},{threshold:.4}).observe(v)}}
})();

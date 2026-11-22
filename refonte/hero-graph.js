/* Graphe à plat. Les foyers et vignettes utilisent la même constellation que le chemin Expo. */
import { CielExpo } from './ciel-expo.js?v=12';

const borne = t => Math.max(0, Math.min(1,t));
const lisse = t => { const t0=borne(t); return t0*t0*(3-2*t0); };
const imagesCles = fabrique => Array.from({length:21},(_,i)=>({offset:i/20,...fabrique(i/20)}));

function entreeAccueil(zone, reduit) {
  const hero=zone.closest('#hero');
  if(!hero||reduit.matches||innerWidth<940||scrollY>4)return;
  const items=[...hero.querySelectorAll('.hero-entrance-item')];
  const wordmark=hero.querySelector('.hero-logo.global-lg\\:block')||hero.querySelector('.hero-logo');
  const tagline=hero.querySelector('.hero-tagline');
  const rect=zone.getBoundingClientRect(), width=document.documentElement.clientWidth;
  if(!items.length||rect.width<120)return;
  const travel=rect.left-(width-rect.right);
  const temps = seconds => seconds/1.18*1000;
  const timing={delay:temps(1.4),duration:temps(1.2),easing:'cubic-bezier(.83,0,.17,1)',fill:'backwards'};
  const cover=document.createElement('div');
  cover.className='cv-hero-intro-cover';
  cover.setAttribute('aria-hidden','true');
  Object.assign(cover.style,{left:'10px',top:rect.top+'px',width:Math.max(0,rect.left-10)+'px',height:rect.height+'px'});
  zone.prepend(cover);
  hero.setAttribute('data-cv-intro','');
  const curtain=cover.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{...timing,fill:'both'});
  const animations=[curtain];
  const widgetFrames=imagesCles(t=>({
    transform:'translateX('+(-1.11*travel*(1-t))+'px)',
    marginLeft:(-65*(1-t)**1.5)+'%',
    opacity:lisse(t*2)
  }));
  for(const [i,item] of items.entries())animations.push(item.animate(widgetFrames,{...timing,delay:temps(1.4+.08*i)}));
  if(wordmark)animations.push(wordmark.animate(imagesCles(t=>({
    transform:'translateX('+(-140*(1-t))+'px)',opacity:lisse(t*2)
  })),{...timing,delay:temps(1.75),duration:temps(1.05)}));
  const wordmarkWidth=wordmark?.getBoundingClientRect().width;
  if(tagline&&wordmarkWidth){
    const span=1.2+.08*(items.length-1),count=Math.ceil(temps(span)*.06);
    const widgetWidth=items[0].offsetWidth;
    const frames=Array.from({length:count+1},(_,i)=>{
      const seconds=i/count*span;
      let intrusion=0;
      for(let j=0;j<items.length;j++){
        const t=borne((seconds-j*.08)/1.2);
        const remaining=1-(t<.5?16*t**5:1-(-2*t+2)**5/2);
        intrusion=Math.min(intrusion,-1.11*travel*remaining-.65*widgetWidth*remaining**1.5);
      }
      return {opacity:lisse((1+intrusion/wordmarkWidth-.72)/.28)};
    });
    animations.push(tagline.animate(frames,{delay:timing.delay,duration:temps(span),fill:'backwards'}));
  }
  let actif=true;
  const events=new AbortController();
  function termine(){
    if(!actif)return;
    actif=false;
    for(const animation of animations)animation.cancel();
    cover.remove();
    hero.removeAttribute('data-cv-intro');
    events.abort();
  }
  for(const type of ['wheel','touchstart','keydown','resize','pointerdown'])addEventListener(type,termine,{once:true,passive:true,signal:events.signal});
  addEventListener('scroll',()=>{if(scrollY>4)termine();},{passive:true,signal:events.signal});
  reduit.addEventListener('change',termine,{once:true,signal:events.signal});
  Promise.allSettled(animations.map(a=>a.finished)).then(termine);
  return {
    decalage:()=>actif?travel*(1-(curtain.effect.getComputedTiming().progress??0))*.5:0,
    enCours:()=>actif,
    termine
  };
}

export function demarre(chapitres) {
  const zone = document.querySelector('.hero-entrance-hold'); if (!zone || zone.querySelector('.cv-hero-graph')) return;
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), reduit = matchMedia('(prefers-reduced-motion: reduce)');
  cv.className = 'cv-hero-graph'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Graphe des chapitres du site et de leurs contenus');
  cv.style.cssText = 'position:absolute;top:0;left:0;height:100%;z-index:3;touch-action:pan-y';
  zone.append(cv); zone.querySelector('.hero-graph-spinner-track')?.remove();
  const ciel = new CielExpo(), souris = { x: -1e4, y: -1e4 };
  ciel.accueil(chapitres,'Mathieu Comtesse');
  const etiquette = document.createElement('span');
  etiquette.className = 'cv-graph-hover';
  etiquette.setAttribute('aria-hidden','true');
  document.body.append(etiquette);
  const entree=entreeAccueil(zone,reduit);
  const arrivee=performance.now();
  let W = 0, H = 0, dpr = 1, vu = false, dernier = 0;
  /* le canevas n'occupe que la partie libre de la zone : à droite du nom et des cartes quand ils la recouvrent (grand écran) */
  let largeurVue = 0;
  const mesure = () => { const r = zone.getBoundingClientRect(); let x0 = 0;
    for (const c of document.querySelectorAll('#hero .hero-chrome')) { const q = c.getBoundingClientRect(); if (q.width && q.height && q.top < r.bottom - 40 && q.bottom > r.top + 40 && q.right > r.left) x0 = Math.max(x0, q.right - r.left); }
    if (x0 > r.width - 160) x0 = 0;
    x0 = Math.max(0, x0); cv.style.left = x0 + 'px'; cv.style.width = (r.width - x0) + 'px'; W = Math.round(r.width - x0); H = Math.round(r.height); };
  const taille = () => { mesure(); dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); };
  new ResizeObserver(taille).observe(zone); addEventListener('resize', taille); document.fonts?.ready.then(taille); taille();
  new IntersectionObserver(([e]) => { vu = e.isIntersecting; }).observe(zone);
  const local = (ev) => { const r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  cv.style.cursor = 'auto';
  const va = (n) => { const cible = document.getElementById(n.handle) || document.getElementById(n.chapitre); if (cible) cible.scrollIntoView({ behavior: reduit.matches ? 'auto' : 'smooth', block: 'start' }); };
  addEventListener('pointermove', ev => {
    [souris.x, souris.y] = local(ev);
    ciel.tire(souris.x, souris.y);
    const node = ev.pointerType==='mouse'&&dessus(ev)&&ciel.touche(souris.x,souris.y);
    cv.style.cursor = node?'pointer':'auto';
    etiquette.toggleAttribute('data-visible',Boolean(node));
    if(node){
      etiquette.textContent=node.title;
      etiquette.style.left=Math.max(12,Math.min(innerWidth-etiquette.offsetWidth-12,ev.clientX+14))+'px';
      etiquette.style.top=Math.max(12,ev.clientY-28)+'px';
    }
  }, { passive: true });
  cv.addEventListener('pointerleave', () => { if (!ciel.pris) souris.x = souris.y = -1e4; });
  /* écoute au niveau du document : d'autres calques de l'accueil passent au-dessus du canevas et recevraient l'appui à sa place */
  const dessus = (ev) => { const r = cv.getBoundingClientRect(); return !document.documentElement.classList.contains('cv-parity-active') && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom && !ev.target.closest('a,button,input,select,textarea,.cv-site-nav'); };
  document.addEventListener('pointerdown', (ev) => { if (ev.button !== 0 || !dessus(ev)) return; [souris.x, souris.y] = local(ev); ciel.saisit(souris.x, souris.y); }, { capture: true });
  const fin = (annule) => { const r = ciel.lache(); if (r?.clic && !annule) va(r); };
  document.addEventListener('pointerup', () => fin(false), { capture: true }); document.addEventListener('pointercancel', () => fin(true));
  function image(t) {
    requestAnimationFrame(image);
    if (!vu || document.hidden || W < 120 || H < 120 || t - dernier < 30 || document.documentElement.classList.contains('cv-parity-active')) return;
    const dt = Math.min(0.1, (t - dernier) / 1000); dernier = t;
    const proj = (x, y, h) => ({ x, y, z:2000-h });
    /* sortie de l'accueil : le graphe s'ouvre (les foyers s'écartent) et s'efface ; l'étoile du premier chapitre prend le relais */
    const fin = (document.querySelector('[data-f26-page-section]')?.getBoundingClientRect().top ?? 1e9) + scrollY - innerHeight * 0.8, s = Math.max(0, Math.min(1, scrollY / Math.max(200, fin))), ouvre = 1 + .8 * s * s;
    cv.style.opacity = String(1 - Math.max(0, Math.min(1, (s - 0.45) / 0.5)));
    if (s > 0.02 || largeurVue !== innerWidth) { largeurVue = innerWidth; const avant = W; mesure(); if (Math.abs(W - avant) > 1) taille(); }
    const reveal=entree?.enCours()?lisse((t-arrivee)/1017):1;
    ciel.place('accueil',[W/2-(entree?.decalage()||0),H*.5,Math.min(H*.12,90)],Math.min(W,H)*.48,{
      largeur:W*.51,hauteur:H*.48,etalement:ouvre
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ciel.dessine(ctx,proj,reduit.matches?null:t/1000,{souris,W,H,dt,plat:true,ouverture:reveal});
  }
  requestAnimationFrame(image);
  window.__cvHeroGraph = { cibles: () => { const r = cv.getBoundingClientRect(); return ciel.cibles.map((c) => ({ x: c.x + r.left, y: c.y + r.top, handle: c.noeud.ed.handle })); }, etat: () => ({ ...ciel.compte('accueil'), vignettes: ciel.ecran('accueil').length, foyers: ciel.etat('accueil').filter((e) => e.visible).length, largeur: W, hauteur: H }), ciel };
}

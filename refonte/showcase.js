/* Vitrines « outil réel » : fenêtres qui s'ouvrent à mesure que le cadre du parcours avance dans l'écran.
   - UNE seule boucle d'images partagée (requestAnimationFrame, donc le bus commun), réveillée par le défilement, le redimensionnement, un geste ou un clic et éteinte 1,4 s après le dernier mouvement ; à l'arrêt elle ne demande aucune image ;
   - la progression se lit sur la position réelle du cadre (getBoundingClientRect : elle suit donc la perspective et le défilement du parcours, en HTML-in-Canvas comme en repli DOM) ;
   - aucune écoute de pointeur sur la scène : seuls les clics sur une capture réelle ou sur un onglet agissent, les gestes de navigation 3D passent ;
   - captures chargées uniquement à l'approche du cadre ; console reconstituée à partir des étapes de la fiche (aucune sortie inventée). */
const frames = [...document.querySelectorAll('.cv-pf-showcase')];
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const ambient=[...document.querySelectorAll('video[data-cv-ambient]')];
if(ambient.length){
  const visible=new Set();
  const sync=()=>{
    for(const video of ambient){
      if(visible.has(video)&&!document.hidden&&!motion.matches){
        if(video.paused)video.play().catch(()=>{});
      }else video.pause();
    }
  };
  const media=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting)visible.add(entry.target);
      else visible.delete(entry.target);
    }
    sync();
  },{threshold:.15});
  ambient.forEach(video=>media.observe(video));
  document.addEventListener('visibilitychange',sync);
  motion.addEventListener('change',sync);
}
const playLinks=[...document.querySelectorAll('.cv-game-card a[data-cv-play]')];
if(playLinks.length){
  const dialog=document.createElement('dialog');
  dialog.className='cv-game-player';
  dialog.setAttribute('aria-label','Jeu plein écran');
  dialog.innerHTML='<div class="cv-game-screen"><iframe allow="fullscreen; autoplay" allowfullscreen></iframe><button type="button" aria-label="Fermer le jeu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>';
  document.body.append(dialog);
  const screen=dialog.firstElementChild, frame=screen.querySelector('iframe'), close=screen.querySelector('button');
  let opener=null, fullscreen=false;
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    if(document.fullscreenElement===screen)document.exitFullscreen().catch(()=>{});
    frame.removeAttribute('src');
    opener?.focus({preventScroll:true});
  });
  document.addEventListener('fullscreenchange',()=>{
    if(document.fullscreenElement===screen)fullscreen=true;
    else if(fullscreen){fullscreen=false;if(dialog.open)dialog.close();}
  });
  for(const a of playLinks)a.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
    event.preventDefault();
    opener=a;
    frame.title=a.closest('.cv-game-card').querySelector('h3').textContent;
    frame.src=a.href;
    dialog.showModal();
    if(document.fullscreenEnabled&&screen.requestFullscreen)screen.requestFullscreen().catch(()=>{});
    frame.focus();
  });
}
if (frames.length) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const near = new Set(); let raf = 0, until = 0, ticks = 0, dirty = true;
  const S = new Map(frames.map((f) => {
    const st = { f, card: f.closest('.cv-pf-main'), N: +f.dataset.steps || 4, step: -1, lock: 0, wins: [...f.querySelectorAll('.sc-win')], res: f.querySelector('.sc-result'), log: f.querySelector('.sc-log'), tabs: [...f.querySelectorAll('.sc-tabs button')], shown: -1, queued: false, key: '' };
    st.lines = st.log ? [...st.log.children] : []; st.cstep = +(f.querySelector('.sc-console')?.dataset.step || 2);
    st.interval = Number(f.dataset.scInterval) || 0;
    const camera=f.querySelector('.sc-camera');
    if(camera){
      const viewport=camera.querySelector('.sc-camera-viewport');
      st.camera={viewport,image:viewport.querySelector('img'),caption:camera.querySelector('figcaption span'),places:JSON.parse(camera.dataset.camera)};
      new ResizeObserver(()=>cadreCamera(st)).observe(viewport);
    }
    return [f, st];
  }));
  function cadreCamera(st){
    const c=st.camera, point=c?.places[st.step-1];
    if(!point)return;
    const [x,y,field,caption]=point;
    const width=c.viewport.clientWidth,height=c.viewport.clientHeight;
    if(!width||!height)return;
    const imageWidth=+c.image.getAttribute('width'),imageHeight=+c.image.getAttribute('height');
    const scale=Math.max(width/imageWidth,width/field);
    const left=clamp(width/2-x*scale,Math.min(0,width-imageWidth*scale),0);
    const top=clamp(height/2-y*scale,Math.min(0,height-imageHeight*scale),0);
    c.image.style.transform=`translate(${left}px,${top}px) scale(${scale})`;
    c.caption.textContent=caption;
  }
  /* captures : file unique, une image à la fois (160 ms entre deux), seulement pour les cadres proches de l'écran ; actif aussi en mouvements réduits */
  const queue = []; let loading = 0;
  const chargeImage = (img) => { if (img && !img.hasAttribute('src')) img.src = img.dataset.src; };
  const pump = () => {
    loading = 0;
    while (queue[0]?.hasAttribute('src')) queue.shift();
    const img = queue.shift();
    if (!img) return;
    chargeImage(img);
    loading = setTimeout(pump, 160);
  };
  const load = (st) => { if (st.queued) return; st.queued = true; st.f.querySelectorAll('img[data-src]').forEach((i) => queue.push(i)); if (!loading) pump(); };
  const chargeEtape = (st) => {
    for (const w of st.wins) if (+w.dataset.step <= st.step) chargeImage(w.querySelector('img[data-src]'));
  };
  const apply = (st, step, frac) => {
    if (step !== st.step) {
      st.step = step;
      st.wins.forEach((w) => { const s = +w.dataset.step, on = step >= s; w.classList.toggle('on', on); w.classList.toggle('front', on && s === step); w.classList.toggle('back', on && s < step); w.dataset.age = on ? Math.min(3, step - s) : ''; });   // âge = nombre d'étapes depuis l'apparition : la fenêtre active domine, les anciennes s'effacent progressivement
      st.wins.forEach(w => { w.inert = +w.dataset.step > step; });
      st.f.querySelector('.sc-stage').dataset.step = step;
      cadreCamera(st);
      if (st.res) st.res.classList.toggle('on', step >= st.N);
      st.tabs.forEach((b, i) => b.setAttribute('aria-selected', String(i + 1 === step)));
    }
    if (st.lines.length) {   // console : une ligne de plus à chaque fraction de l'étape de traitement ; la dernière tourne tant que le traitement est en cours
      const L = st.lines.length, n = step < st.cstep ? 0 : step > st.cstep ? L : clamp(Math.round(frac * L), 0, L);
      if (n !== st.shown) { st.shown = n; st.lines.forEach((li, i) => { li.hidden = i >= n; li.classList.toggle('run', step === st.cstep && i === n - 1 && n < L); li.firstChild.textContent = i < n - 1 || n >= L || step > st.cstep ? '✓' : '›'; }); }
    }
  };
  const update = (st, now) => {
    const r = st.f.getBoundingClientRect(), key = (r.top | 0) + ',' + (r.height | 0) + ',' + innerHeight;
    if (st.card) {
      const top = st.card.getBoundingClientRect().top;
      const reveal = clamp((innerHeight * .98 - top) / (innerHeight * .22), 0, 1);
      const opacity = (reveal * reveal * (3 - 2 * reveal)).toFixed(3);
      // Le mode Expo réécrit le style en déplaçant la carte. La valeur de la carte
      // reste la source de vérité au retour sur le parcours à plat.
      if (st.card.style.getPropertyValue('--cv-copy-progress') !== opacity) {
        st.card.style.setProperty('--cv-copy-progress', opacity);
      }
    }
    if (st.f.hasAttribute('data-sc-auto')) {
      const visible = r.bottom > innerHeight * .18 && r.top < innerHeight * .82;
      if (!visible || st.f.matches(':focus-within')) { st.nextStep = 0; st.position = null; return false; }
      const at = r.top;
      const threshold = Math.max(35, r.height * .16);
      if (st.position === null) {
        st.position = at;
        st.nextStep = now + (st.interval || (st.camera ? 3000 : 2100));
      } else if (!st.interval && Math.abs(at - st.position) >= threshold) {
        const change = Math.trunc((st.position - at) / threshold);
        st.position -= change * threshold;
        st.lock = 0;
        apply(st, clamp(st.step + change, 1, st.N), 1);
        st.nextStep = now + (st.interval || (st.camera ? 3000 : 2100));
      } else if (now >= Math.max(st.nextStep, st.lock || 0)) {
        if(st.step<st.N)apply(st,st.step+1,1);
        st.nextStep=now+(st.interval || (st.camera ? 3300 : 2100));
      }
      chargeEtape(st);
      return st.step<st.N;
    }
    if (st.lock && now < st.lock) return; st.lock = 0;
    if (key === st.key && !dirty) return; st.key = key;   // rien n'a bougé : aucun calcul
    const vh = innerHeight, p = clamp((vh - r.top) / (vh + r.height), 0, 1), q = clamp((p - .22) / .5, 0, 1);
    const x = q * st.N, step = clamp(Math.floor(x) + 1, 1, st.N); apply(st, step, x - Math.floor(x));
    if (r.top < vh && r.bottom > 0) chargeEtape(st);
  };
  /* ordonnancement : aucune image n'est demandée tant que rien ne bouge. Défilement, redimensionnement, geste ou clic réveillent la boucle ; elle s'éteint 1,4 s après le dernier mouvement de la page. */
  const tick = (t) => {
    raf = 0;
    ticks++;
    if (document.hidden) return;
    let playing = false;
    for (const f of near) { if (update(S.get(f), t)) playing = true; }
    dirty = false;
    if (playing || t < until) raf = requestAnimationFrame(tick);
  };
  const wake = (ms = 1400) => { until = performance.now() + ms; dirty = true; if (!raf && near.size && !document.hidden) raf = requestAnimationFrame(tick); };
  frames.forEach((f) => {
    const st = S.get(f); f.classList.add('sc-js');
    st.position = null;
    f.addEventListener('focusout', () => { if (!reduce) wake(); });
    if (reduce) { apply(st, st.camera ? 1 : st.N, 1); return; }
    apply(st, 1, 0);
    st.tabs.forEach((b) => b.addEventListener('click', () => { apply(st, +b.dataset.go, 1); chargeEtape(st); st.lock = performance.now() + 7000; }));   // choix manuel : la progression au défilement reprend après 7 s
  });
  frames.forEach((f) => { if (reduce) f.querySelectorAll('.sc-tabs button').forEach((b) => b.addEventListener('click', () => { const st=S.get(f); apply(st, +b.dataset.go, 1); chargeEtape(st); })); });
  const io = new IntersectionObserver((es) => { es.forEach((e) => { const st = S.get(e.target); if (e.isIntersecting) { near.add(e.target); load(st); } else near.delete(e.target); }); if (!reduce) wake(); }, { rootMargin: '700px 0px 700px 0px' });
  frames.forEach((f) => io.observe(f));
  if (!reduce) {
    for (const ev of ['scroll', 'resize', 'wheel', 'touchmove', 'pointerdown', 'keydown']) addEventListener(ev, () => wake(), { passive: true });
    document.addEventListener('click', () => wake(2200), { passive: true });   // un clic sur un cadre déclenche un déplacement de caméra du parcours : la boucle suit ce mouvement
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  }
  window.__scTest = new URLSearchParams(location.search).has('uxtest') ? { go: (slug, step) => { const st = S.get(frames.find((f) => f.dataset.showcase === slug)); load(st); queue.splice(0).forEach((i) => { i.src = i.dataset.src; }); apply(st, step, 1); st.lock = performance.now() + 60000; }, state: (slug) => { const st = S.get(frames.find((f) => f.dataset.showcase === slug)); return { step: st.step, near: near.has(st.f) }; }, ticks: () => ticks, active: () => !!raf, reset: () => { ticks = 0; } } : undefined;
}

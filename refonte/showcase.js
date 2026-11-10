/* Vitrines « outil réel » : fenêtres qui s'ouvrent à mesure que le cadre du parcours avance dans l'écran.
   - UNE seule boucle d'images partagée (requestAnimationFrame, donc le bus commun), active seulement tant qu'une vitrine est proche de l'écran ;
   - la progression se lit sur la position réelle du cadre (getBoundingClientRect : elle suit donc la perspective et le défilement du parcours, en HTML-in-Canvas comme en repli DOM) ;
   - aucune écoute de pointeur sur la scène : seuls les clics sur une capture réelle ou sur un onglet agissent, les gestes de navigation 3D passent ;
   - captures chargées uniquement à l'approche du cadre ; console reconstituée à partir des étapes de la fiche (aucune sortie inventée). */
const frames = [...document.querySelectorAll('.cv-pf-showcase')];
if (frames.length) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const near = new Set(); let raf = 0, zoom = null;
  const S = new Map(frames.map((f) => {
    const st = { f, N: +f.dataset.steps || 4, step: -1, lock: 0, wins: [...f.querySelectorAll('.sc-win')], res: f.querySelector('.sc-result'), log: f.querySelector('.sc-log'), tabs: [...f.querySelectorAll('.sc-tabs button')], shown: -1, loaded: false };
    st.lines = st.log ? [...st.log.children] : []; st.cstep = +(f.querySelector('.sc-console')?.dataset.step || 2);
    return [f, st];
  }));
  const load = (st) => { if (st.loaded) return; st.loaded = true; st.f.querySelectorAll('img[data-src]').forEach((i) => { i.src = i.dataset.src; }); };
  const apply = (st, step, frac) => {
    if (step !== st.step) {
      st.step = step;
      st.wins.forEach((w) => { const s = +w.dataset.step, on = step >= s; w.classList.toggle('on', on); w.classList.toggle('front', on && s === step); w.classList.toggle('back', on && s < step); });
      if (st.res) st.res.classList.toggle('on', step >= st.N);
      st.tabs.forEach((b, i) => b.setAttribute('aria-selected', String(i + 1 === step)));
    }
    if (st.lines.length) {   // console : une ligne de plus à chaque fraction de l'étape de traitement ; la dernière tourne tant que le traitement est en cours
      const L = st.lines.length, n = step < st.cstep ? 0 : step > st.cstep ? L : clamp(Math.round(frac * L), 0, L);
      if (n !== st.shown) { st.shown = n; st.lines.forEach((li, i) => { li.hidden = i >= n; li.classList.toggle('run', step === st.cstep && i === n - 1 && n < L); li.firstChild.textContent = i < n - 1 || n >= L || step > st.cstep ? '✓' : '›'; }); }
    }
  };
  const update = (st, now) => {
    if (st.lock && now < st.lock) return; st.lock = 0;
    const r = st.f.getBoundingClientRect(), vh = innerHeight, p = clamp((vh - r.top) / (vh + r.height), 0, 1), q = clamp((p - .22) / .5, 0, 1);
    const x = q * st.N, step = clamp(Math.floor(x) + 1, 1, st.N); apply(st, step, x - Math.floor(x));
  };
  const tick = (t) => { raf = 0; if (!near.size) return; if (!document.hidden) near.forEach((f) => update(S.get(f), t)); raf = requestAnimationFrame(tick); };
  const kick = () => { if (!raf && near.size) raf = requestAnimationFrame(tick); };
  frames.forEach((f) => {
    const st = S.get(f); f.classList.add('sc-js');
    if (reduce) { apply(st, st.N, 1); load(st); return; }
    apply(st, 1, 0);
    st.tabs.forEach((b) => b.addEventListener('click', () => { apply(st, +b.dataset.go, 1); st.lock = performance.now() + 7000; }));   // choix manuel : la progression au défilement reprend après 7 s
  });
  if (!reduce) {
    const io = new IntersectionObserver((es) => { es.forEach((e) => { const st = S.get(e.target); if (e.isIntersecting) { near.add(e.target); load(st); } else near.delete(e.target); }); kick(); }, { rootMargin: '700px 0px 700px 0px' });
    frames.forEach((f) => io.observe(f));
  }
  document.addEventListener('visibilitychange', kick);
  /* agrandir une capture réelle (dialogue natif : focus, Échap, retour du focus) */
  const open = (w) => {
    const img = w.querySelector('img'); if (!img) return;
    if (!zoom) {
      zoom = document.createElement('dialog'); zoom.className = 'sc-zoom'; zoom.setAttribute('aria-label', 'Capture agrandie');
      zoom.innerHTML = '<img alt=""><div class="sc-zoom-t"><span></span><span><a href="#">Fiche complète du projet</a> <button type="button">Fermer</button></span></div>';
      zoom.querySelector('button').addEventListener('click', () => zoom.close());
      zoom.addEventListener('click', (e) => { if (e.target === zoom) zoom.close(); });
      document.body.append(zoom);
    }
    const z = zoom.querySelector('img'); z.src = img.dataset.big || img.currentSrc || img.src; z.alt = img.alt;
    zoom.querySelector('.sc-zoom-t span').textContent = w.dataset.caption || img.alt;
    zoom.querySelector('a').href = w.closest('.cv-pf-showcase').dataset.showcase + '.html';
    zoom.showModal();
  };
  frames.forEach((f) => f.addEventListener('click', (e) => { const w = e.target.closest('.sc-win[role="button"]'); if (w) open(w); }));
  frames.forEach((f) => f.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.sc-win[role="button"]')) { e.preventDefault(); open(e.target); } }));
  window.__scTest = new URLSearchParams(location.search).has('uxtest') ? { go: (slug, step) => { const st = S.get(frames.find((f) => f.dataset.showcase === slug)); load(st); apply(st, step, 1); st.lock = performance.now() + 60000; }, state: (slug) => { const st = S.get(frames.find((f) => f.dataset.showcase === slug)); return { step: st.step, near: near.has(st.f) }; } } : undefined;
}

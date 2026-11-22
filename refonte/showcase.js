/* Vitrines « outil réel » : fenêtres qui s'ouvrent à mesure que le cadre du parcours avance dans l'écran.
   - UNE seule boucle d'images partagée (requestAnimationFrame, donc le bus commun), réveillée par le défilement, le redimensionnement, un geste ou un clic et éteinte 1,4 s après le dernier mouvement ; à l'arrêt elle ne demande aucune image ;
   - la progression se lit sur la position réelle du cadre (getBoundingClientRect : elle suit donc la perspective et le défilement du parcours, en HTML-in-Canvas comme en repli DOM) ;
   - aucune écoute de pointeur sur la scène : seuls les clics sur une capture réelle ou sur un onglet agissent, les gestes de navigation 3D passent ;
   - captures chargées uniquement à l'approche du cadre ; console reconstituée à partir des étapes de la fiche (aucune sortie inventée). */
for (const recording of document.querySelectorAll('.cv-pf-video')) {
  const video = recording.querySelector('video');
  const chapters = [...recording.querySelectorAll('[data-video-start]')];
  if (!video || !chapters.length) continue;
  function selectChapter(current) {
    for (const chapter of chapters) {
      if (chapter === current) chapter.setAttribute('aria-current', 'step');
      else chapter.removeAttribute('aria-current');
    }
  }
  video.addEventListener('timeupdate', () => {
    const current = chapters.findLast(chapter => Number(chapter.dataset.videoStart) <= video.currentTime + .04);
    selectChapter(current || chapters[0]);
  });
  for (const chapter of chapters) {
    chapter.addEventListener('click', () => {
      video.currentTime = Number(chapter.dataset.videoStart);
      selectChapter(chapter);
      video.play().catch(() => {}); // Les commandes natives restent utilisables.
    });
  }
}
const frames = [...document.querySelectorAll('.cv-pf-showcase')];
if (frames.length) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const near = new Set(); let raf = 0, until = 0, ticks = 0, zoom = null, dirty = true;
  const S = new Map(frames.map((f) => {
    const st = { f, card: f.closest('.cv-pf-main'), N: +f.dataset.steps || 4, step: -1, lock: 0, wins: [...f.querySelectorAll('.sc-win')], res: f.querySelector('.sc-result'), log: f.querySelector('.sc-log'), tabs: [...f.querySelectorAll('.sc-tabs button')], shown: -1, queued: false, key: '' };
    st.lines = st.log ? [...st.log.children] : []; st.cstep = +(f.querySelector('.sc-console')?.dataset.step || 2);
    return [f, st];
  }));
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
  function bindTour(st) {
    const button = st.f.querySelector('[data-sc-tour]');
    if (!button) return;
    const steps = button.dataset.scTour.split(',').map(Number);
    let timer = 0, playing = false, run = 0;
    const stop = () => {
      clearTimeout(timer);
      playing = false;
      run++;
      st.lock = 0;
      st.f.classList.remove('sc-tour-playing');
      button.setAttribute('aria-pressed', 'false');
      button.textContent = 'Animer les captures';
    };
    st.tabs.forEach(tab => tab.addEventListener('click', () => { if (playing) stop(); }, {capture: true}));
    button.addEventListener('click', () => {
      if (playing) { stop(); return; }
      playing = true;
      const id = ++run;
      const duration = reduce ? 1600 : 4200;
      button.setAttribute('aria-pressed', 'true');
      button.textContent = 'Arrêter l’animation';
      const show = async index => {
        const step = steps[index];
        st.lock = Infinity;
        st.f.classList.remove('sc-tour-playing');
        apply(st, step, 1);
        const image = st.wins.find(w => +w.dataset.step === step && w.hasAttribute('data-sc-browser'))?.querySelector('img');
        chargeImage(image);
        try { await image?.decode(); } catch { if (run === id) stop(); return; }
        if (run !== id) return;
        requestAnimationFrame(() => { if (run === id) st.f.classList.add('sc-tour-playing'); });
        timer = setTimeout(index + 1 < steps.length ? () => show(index + 1) : stop, duration);
      };
      show(0);
    });
  }
  const apply = (st, step, frac) => {
    if (step !== st.step) {
      st.step = step;
      st.wins.forEach((w) => { const s = +w.dataset.step, on = step >= s; w.classList.toggle('on', on); w.classList.toggle('front', on && s === step); w.classList.toggle('back', on && s < step); w.dataset.age = on ? Math.min(3, step - s) : ''; });   // âge = nombre d'étapes depuis l'apparition : la fenêtre active domine, les anciennes s'effacent progressivement
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
      if (opacity !== st.opacity) {
        st.opacity = opacity;
        st.card.style.setProperty('--cv-copy-progress', opacity);
      }
    }
    if (st.lock && now < st.lock) return; st.lock = 0;
    if (key === st.key && !dirty) return; st.key = key;   // rien n'a bougé : aucun calcul
    const vh = innerHeight, p = clamp((vh - r.top) / (vh + r.height), 0, 1), q = clamp((p - .22) / .5, 0, 1);
    const x = q * st.N, step = clamp(Math.floor(x) + 1, 1, st.N); apply(st, step, x - Math.floor(x));
    if (r.top < vh && r.bottom > 0) chargeEtape(st);
  };
  /* ordonnancement : aucune image n'est demandée tant que rien ne bouge. Défilement, redimensionnement, geste ou clic réveillent la boucle ; elle s'éteint 1,4 s après le dernier mouvement de la page. */
  const tick = (t) => { raf = 0; ticks++; if (document.hidden) return; near.forEach((f) => update(S.get(f), t)); dirty = false; if (t < until) raf = requestAnimationFrame(tick); };
  const wake = (ms = 1400) => { until = performance.now() + ms; dirty = true; if (!raf && near.size && !document.hidden) raf = requestAnimationFrame(tick); };
  frames.forEach((f) => {
    const st = S.get(f); f.classList.add('sc-js');
    bindTour(st);
    if (reduce) { apply(st, st.N, 1); return; }
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
  /* agrandir une capture (dialogue natif : focus, Échap, retour du focus ; molette / glissé pour parcourir l'image haute définition) */
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
    zoom.querySelector('.sc-zoom-t span').textContent = (w.dataset.badge ? w.dataset.badge + ' · ' : '') + (w.dataset.caption || img.alt);
    zoom.querySelector('a').href = w.closest('.cv-pf-showcase').dataset.showcase + '.html';
    zoom.showModal();
  };
  frames.forEach((f) => f.addEventListener('click', (e) => { const w = e.target.closest('.sc-win[role="button"]'); if (w) open(w); }));
  frames.forEach((f) => f.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.sc-win[role="button"]')) { e.preventDefault(); open(e.target); } }));
  window.__scTest = new URLSearchParams(location.search).has('uxtest') ? { go: (slug, step) => { const st = S.get(frames.find((f) => f.dataset.showcase === slug)); load(st); queue.splice(0).forEach((i) => { i.src = i.dataset.src; }); apply(st, step, 1); st.lock = performance.now() + 60000; }, state: (slug) => { const st = S.get(frames.find((f) => f.dataset.showcase === slug)); return { step: st.step, near: near.has(st.f) }; }, ticks: () => ticks, active: () => !!raf, reset: () => { ticks = 0; } } : undefined;
}

/* Bus d'images unique : remplace requestAnimationFrame par un multiplexeur (un seul rappel natif par image, un seul horodatage partagé).
   Sémantique conservée : un rappel inscrit pendant une image s'exécute à l'image suivante ; cancelAnimationFrame fonctionne.
   Instrumentation : window.__cvBus.stats() donne, par origine de boucle, le coût moyen et le p95 en ms (mesure réelle via performance.now).
   Gouverneur de qualité : window.__cvBus.quality (1 = pleine, 0,75, 0,5), niveau 0 à 2, piloté par P95/P99 et nombre d'interruptions > 100 ms sur 240 images, avec hystérésis (baisse après 2 évaluations mauvaises, remontée après 12 s stables, 4 s minimum entre deux changements).
   Aucun intervalle n'est écarté parce qu'il est long : seules les reprises d'onglet et les veilles système (> 3 s) sont comptées à part. window.__cvBus.snapshot() : médiane, P95, P99, max, compteurs > 50 / 100 / 200 / 500 ms, images manquées, reprises, tâches différées. bus.defer(fn) : tâche de faible priorité. */
(() => {
  if (window.__cvBus) return;
  const native = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
  let queue = [], nextId = 1, armed = 0, last = 0;
  const cost = new Map();
  const key = () => { const s = (new Error().stack || '').split('\n').slice(3, 4).join('').replace(/^\s*at\s+/, '').replace(/https?:\/\/[^/]+\//, '').replace(/\?[^:)]*/, ''); return s.slice(-80); };
  /* ---- mesure : fenêtre glissante de 240 intervalles ; un intervalle n'est jamais écarté parce qu'il est long. Seules les reprises (onglet masqué, veille système) sont mises à part ---- */
  const N = 240, win = new Float32Array(N), cbw = new Float32Array(N); let wn = 0, wi = 0, resume = true, sinceEval = 0;
  const T = { frames: 0, gt50: 0, gt100: 0, gt200: 0, gt500: 0, missed: 0, resumes: 0, wakes: 0, deferredRun: 0, deferredQueued: 0, max: 0 };
  const low = [];   // tâches à faible priorité : exécutées seulement s'il reste du budget dans l'image
  const pct = (a, n, p) => { const b = Array.prototype.slice.call(a, 0, n).sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * p))] : 0; };
  const snapshot = () => ({ ...T, fenetre: wn, mediane: +pct(win, wn, .5).toFixed(1), p95: +pct(win, wn, .95).toFixed(1), p99: +pct(win, wn, .99).toFixed(1), callbacks_p95: +pct(cbw, wn, .95).toFixed(2), qualite: bus.quality, niveau: bus.level, tachesEnAttente: low.length });
  /* ---- gouverneur de qualité, avec hystérésis : baisse vite sur P95/P99 ou freezes répétés, remonte lentement après une longue période stable, jamais deux changements à moins de 4 s ---- */
  const LV = [1, .75, .5]; let lastChange = 0, okSince = 0, strikes = 0;
  const setLevel = (l, t, why) => { bus.level = l; bus.quality = LV[l]; lastChange = t; okSince = 0; strikes = 0; bus.lastChange = why; bus.listeners.forEach((f) => f(bus.quality)); };
  function govern(t) {
    const p95 = pct(win, wn, .95), p99 = pct(win, wn, .99); let big = 0; for (let k = 0; k < wn; k++) if (win[k] > 100) big++;
    const bad = p95 > 33 || p99 > 80 || big >= 2;
    if (bad) { strikes++; okSince = 0; } else if (p95 < 20 && p99 < 40) { strikes = 0; if (!okSince) okSince = t; } else { strikes = 0; okSince = 0; }
    if (t - lastChange < 4000) return;
    if (strikes >= 2 && bus.level < 2) setLevel(bus.level + 1, t, 'baisse p95=' + p95.toFixed(0) + ' p99=' + p99.toFixed(0) + ' >100ms=' + big);
    else if (okSince && t - okSince > 12000 && bus.level > 0) setLevel(bus.level - 1, t, 'remontée après 12 s stables');
  }
  const bus = { quality: 1, level: 0, frameMs: 16.7, lastChange: '', listeners: new Set(), snapshot, reset() { wn = wi = 0; for (const k in T) T[k] = 0; },
    /** exécute fn quand l'image a du budget (sinon à l'image suivante) ; priorité basse : préchargements, calculs non urgents */
    defer(fn) { T.deferredQueued++; low.push(fn); arm(); },
    stats() { return [...cost.entries()].map(([k, v]) => { const a = v.s.slice().sort((x, y) => x - y); return { k, n: v.n, avg: +(v.t / v.n).toFixed(3), p95: +(a[Math.floor(a.length * .95)] || 0).toFixed(3), max: +v.m.toFixed(2) }; }).sort((a, b) => b.avg - a.avg); }, profile: /[?&]perf\b/.test(location.search) };
  document.addEventListener('visibilitychange', () => { if (document.hidden) resume = true; else { resume = true; T.resumes++; } });
  function run(t) {
    armed = 0; const q = queue; queue = []; const t0f = performance.now();
    if (last) {
      const dt = t - last;
      if (resume || document.hidden) { resume = false; }                         // reprise d'onglet : mise à part, pas un freeze de rendu
      else if (dt > 3000) T.wakes++;                                            // veille système : idem
      else {
        T.frames++; if (dt > T.max) T.max = dt; if (dt > 50) T.gt50++; if (dt > 100) T.gt100++; if (dt > 200) T.gt200++; if (dt > 500) T.gt500++; T.missed += Math.max(0, Math.round(dt / 16.7) - 1);
        win[wi] = dt; wi = (wi + 1) % N; if (wn < N) wn++; bus.frameMs += (dt - bus.frameMs) * .05;
        if (++sinceEval >= 30 && wn >= 60) { sinceEval = 0; govern(t); }
      }
    }
    last = t;
    for (const it of q) {
      if (it.dead) continue;
      if (bus.profile) { const t0 = performance.now(); try { it.cb(t); } catch (e) { setTimeout(() => { throw e; }); } const d = performance.now() - t0; let c = cost.get(it.k); if (!c) cost.set(it.k, c = { n: 0, t: 0, m: 0, s: [] }); c.n++; c.t += d; c.m = Math.max(c.m, d); if (c.s.length < 600) c.s.push(d); }
      else try { it.cb(t); } catch (e) { setTimeout(() => { throw e; }); }
    }
    /* tâches basses : au plus une par image tant que le budget (10 ms) n'est pas consommé */
    if (low.length && performance.now() - t0f < 10) { const f = low.shift(); T.deferredRun++; try { f(); } catch (e) { setTimeout(() => { throw e; }); } }
    cbw[(wi + N - 1) % N] = performance.now() - t0f;
    if (queue.length || low.length) arm();
  }
  const arm = () => { if (!armed) armed = native(run); };
  window.requestAnimationFrame = (cb) => { const id = nextId++; queue.push({ id, cb, dead: false, k: bus.profile ? key() : '' }); arm(); return id; };
  window.cancelAnimationFrame = (id) => { for (const it of queue) if (it.id === id) it.dead = true; };
  window.__cvBus = bus;
})();

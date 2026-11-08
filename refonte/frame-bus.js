/* Bus d'images unique : remplace requestAnimationFrame par un multiplexeur (un seul rappel natif par image, un seul horodatage partagé).
   Sémantique conservée : un rappel inscrit pendant une image s'exécute à l'image suivante ; cancelAnimationFrame fonctionne.
   Instrumentation : window.__cvBus.stats() donne, par origine de boucle, le coût moyen et le p95 en ms (mesure réelle via performance.now).
   Gouverneur de qualité : window.__cvBus.quality (1 = pleine, 0,75, 0,5) baisse si la durée d'image reste trop haute, remonte sinon ; les moteurs 3D peuvent le lire. */
(() => {
  if (window.__cvBus) return;
  const native = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
  let queue = [], nextId = 1, armed = 0, last = 0, ema = 16.7, slow = 0, fast = 0;
  const cost = new Map();
  const key = () => { const s = (new Error().stack || '').split('\n').slice(3, 4).join('').replace(/^\s*at\s+/, '').replace(/https?:\/\/[^/]+\//, '').replace(/\?[^:)]*/, ''); return s.slice(-80); };
  const bus = { quality: 1, frameMs: 16.7, listeners: new Set(), stats() { return [...cost.entries()].map(([k, v]) => { const a = v.s.slice().sort((x, y) => x - y); return { k, n: v.n, avg: +(v.t / v.n).toFixed(3), p95: +(a[Math.floor(a.length * .95)] || 0).toFixed(3), max: +v.m.toFixed(2) }; }).sort((a, b) => b.avg - a.avg); }, profile: /[?&]perf\b/.test(location.search) };
  function run(t) {
    armed = 0; const q = queue; queue = [];
    if (last) { const dt = t - last; if (dt < 250) { ema += (dt - ema) * .05; bus.frameMs = ema; if (!document.hidden) { if (ema > 28) { slow++; fast = 0; } else if (ema < 19) { fast++; slow = 0; } if (slow > 90 && bus.quality > .5) { bus.quality = bus.quality > .75 ? .75 : .5; slow = 0; bus.listeners.forEach((f) => f(bus.quality)); } if (fast > 600 && bus.quality < 1) { bus.quality = bus.quality < .75 ? .75 : 1; fast = 0; bus.listeners.forEach((f) => f(bus.quality)); } } } }
    last = t;
    for (const it of q) {
      if (it.dead) continue;
      if (bus.profile) { const t0 = performance.now(); try { it.cb(t); } catch (e) { setTimeout(() => { throw e; }); } const d = performance.now() - t0; let c = cost.get(it.k); if (!c) cost.set(it.k, c = { n: 0, t: 0, m: 0, s: [] }); c.n++; c.t += d; c.m = Math.max(c.m, d); if (c.s.length < 600) c.s.push(d); }
      else try { it.cb(t); } catch (e) { setTimeout(() => { throw e; }); }
    }
    if (queue.length) arm();
  }
  const arm = () => { if (!armed) armed = native(run); };
  window.requestAnimationFrame = (cb) => { const id = nextId++; queue.push({ id, cb, dead: false, k: bus.profile ? key() : '' }); arm(); return id; };
  window.cancelAnimationFrame = (id) => { for (const it of queue) if (it.id === id) it.dead = true; };
  window.__cvBus = bus;
})();

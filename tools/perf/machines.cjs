// Test des onze machines 3D : construction, 240 mises à jour sur 120 s simulées, absence d'exception/NaN, nombre de pièces et de ressources,
// puis 15 cycles construction/destruction pour détecter les fuites de géométries et de textures (compteurs de renderer.info).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary' };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 900, height: 600 } });
  await ctx.route(/^https?:\/\/(comtesse\.me|localhost:\d+)\//, async (r) => { const u = new URL(r.request().url()); let f = u.pathname === '/_h.html' ? path.join(root, 'tools/perf/harness.html') : path.join(root, decodeURIComponent(u.pathname)); try { await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { await r.fulfill({ status: 404, body: '' }); } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto('http://localhost:1/_h.html');
  const res = await p.evaluate(async () => {
    const THREE = await import('three'); const core = await import('/refonte/m3d/core.js');
    const MODS = { moteur: 'moteur', cerfa: 'cerfa', vm: 'vm', vre: 'vre-wattselse', gares: 'gares', finance: 'finance', pp: 'pp', powerbi: 'powerbi-wattselse', suivi: 'suivi', studio: 'studio-wattselse', 'vrestudio-musicbox': 'nisaru', 'vm-livre': 'vm-livre', 'moteur-livre': 'moteur-livre', 'pp-livre': 'pp-livre' };
    const out = {};
    const stats = (g) => { let meshes = 0, tris = 0, nan = 0; const geo = new Set(), mat = new Set(); g.traverse((o) => { if (o.isMesh) { meshes++; geo.add(o.geometry); [].concat(o.material).forEach((m) => mat.add(m)); const pos = o.geometry.attributes.position; if (pos) { tris += (o.geometry.index ? o.geometry.index.count : pos.count) / 3; } } const e = o.matrixWorld.elements; for (let i = 0; i < 16; i++) if (!isFinite(e[i])) nan++; }); return { meshes, geometries: geo.size, materials: mat.size, tris: Math.round(tris), nan }; };
    for (const [name, mod] of Object.entries(MODS)) {
      try {
        if (core.setDA) core.setDA(name);
        const m = await import('/refonte/m3d/' + mod + '.js'); const t0 = performance.now(); const mc = m.build(); const buildMs = performance.now() - t0;
        let worst = 0, err = null; const u0 = performance.now();
        try { for (let i = 0; i < 240; i++) { const a = performance.now(); mc.update(i * .5); worst = Math.max(worst, performance.now() - a); } } catch (e) { err = String(e).slice(0, 120); }
        mc.group.updateMatrixWorld(true);
        out[name] = { buildMs: +buildMs.toFixed(0), avgUpdateMs: +((performance.now() - u0) / 240).toFixed(2), worstUpdateMs: +worst.toFixed(1), hasControls: !!mc.controls, err, ...stats(mc.group) };
      } catch (e) { out[name] = { err: String(e).slice(0, 160) }; }
    }
    // cycles d'ouverture/fermeture : un renderer, 15 constructions et destructions de la machine la plus lourde ; les compteurs doivent rester plats
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 200; const r = new THREE.WebGLRenderer({ canvas }); const cam = new THREE.PerspectiveCamera(30, 1.6, 1, 4000); cam.position.set(300, 300, 300); cam.lookAt(0, 0, 0);
    const leak = {};
    for (const name of ['vrestudio-musicbox', 'vm']) {
      const m = await import('/refonte/m3d/' + MODS[name] + '.js'); const counts = [];
      for (let k = 0; k < 15; k++) { const sc = new THREE.Scene(); sc.add(new THREE.AmbientLight(0xffffff, 1)); const mc = m.build(); sc.add(mc.group); mc.update(k); r.render(sc, cam); mc.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); [].concat(o.material).forEach((q) => { for (const key in q) if (q[key] && q[key].isTexture) q[key].dispose(); q.dispose(); }); } }); r.renderLists.dispose(); counts.push(r.info.memory.geometries + '/' + r.info.memory.textures); }
      leak[name] = counts.filter((_, i) => i % 4 === 0 || i === 14).join(' ');
    }
    return { out, leak };
  });
  console.log(JSON.stringify(res.leak)); for (const [k, v] of Object.entries(res.out)) console.log(k.padEnd(20), JSON.stringify(v));
  console.log('pageerrors', errs); await b.close();
})();

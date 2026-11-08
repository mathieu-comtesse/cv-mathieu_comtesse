// Banc du rendu de maillages : exécute le vrai cvRegisterGeometry d'index.html sur une machine et fait publier l'image par refonte/mesh-gpu.js.
// Usage : node tools/perf/mesh-check.cjs <machine> <sortie.png> [webgpu|webgl] [images]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary' };
(async () => {
  const [, , machine = 'vre-wattselse', out = '/tmp/mesh.png', mode = 'webgpu', frames = '12'] = process.argv;
  const args = mode === 'webgpu' ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const b = await chromium.launch({ args }); const ctx = await b.newContext({ viewport: { width: 900, height: 600 } });
  await ctx.route(/^https?:\/\/(comtesse\.me|localhost:\d+)\//, async (r) => { const u = new URL(r.request().url()); let f = u.pathname === '/_h.html' ? path.join(root, 'tools/perf/harness.html') : path.join(root, decodeURIComponent(u.pathname)); try { await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { await r.fulfill({ status: 404, body: '' }); } });
  const p = await ctx.newPage(); const logs = []; p.on('console', (m) => { if (['warning', 'error'].includes(m.type())) logs.push(m.text().slice(0, 300)); }); p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message.slice(0, 300)));
  await p.goto('http://localhost:1/_h.html');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const i = html.indexOf('const cvGeometryEntries=[];'), j = html.indexOf('\n}\n', html.indexOf('async function cvRegisterGeometry')) + 3;
  const src = html.slice(i, j);
  const res = await p.evaluate(async ([src, machine, frames]) => {
    const THREE = await import('three'); const core = await import('/refonte/m3d/core.js'); const mod = await import('/refonte/m3d/' + machine + '.js');
    const base = 'http://localhost:1/', state = {}; const factory = new Function('base', 'state', src + '\nreturn {cvRegisterGeometry,cvGeometryEntries,state};');
    const { cvRegisterGeometry } = factory(base, state);
    const m = mod.build(); const scene = new THREE.Scene(); scene.add(m.group); scene.add(new THREE.HemisphereLight(0xffffff, 0x8998b8, 2)); const sun = new THREE.DirectionalLight(0xffffff, 3); sun.position.set(-200, 400, 300); scene.add(sun);
    m.group.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(m.group), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), span = Math.max(size.x, size.y, size.z);
    const cam = new THREE.PerspectiveCamera(31, 1.5, .1, span * 20); cam.position.copy(c).add(new THREE.Vector3(span * .7, span * .8, span * 1.1)); cam.lookAt(c); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 600; document.body.append(canvas); const ctx2 = canvas.getContext('2d');
    const entry = await cvRegisterGeometry(canvas, scene, cam, { clear: () => ctx2.clearRect(0, 0, 900, 600) }); let took = 0, t0 = performance.now(), times = [];
    for (let k = 0; k < +frames * 40 && took < +frames; k++) { m.update?.(k * .05); ctx2.clearRect(0, 0, 900, 600); const a = performance.now(); if (entry.publish()) { took++; times.push(performance.now() - a); } await new Promise((r) => setTimeout(r, 60)); }
    /* image de comparaison : le rendu Three.js local historique (même scène, mêmes lumières) */
    const wr = new THREE.WebGLRenderer({ alpha: true, antialias: true }); wr.setPixelRatio(1); wr.setClearColor(0, 0); wr.outputColorSpace = THREE.SRGBColorSpace; wr.toneMapping = THREE.ACESFilmicToneMapping; wr.toneMappingExposure = .8; wr.setSize(900, 600, false);
    cam.updateMatrixWorld(true); wr.render(scene, cam); const c3 = document.createElement('canvas'); c3.width = 900; c3.height = 600; c3.getContext('2d').drawImage(wr.domElement, 0, 0);
    const stat = (cv) => { const d = cv.getContext('2d').getImageData(0, 0, 900, 600).data; let n = 0, r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { n++; r += d[i]; g += d[i + 1]; b += d[i + 2]; } return { px: n, mean: [r / n | 0, g / n | 0, b / n | 0] }; };
    return { cmp: c3.toDataURL('image/png'), statNew: stat(canvas), statOld: stat(c3), took, taken: entry.taken, ms: times.slice(-5).map((x) => +x.toFixed(1)), png: canvas.toDataURL('image/png'), draws: entry.latest?.draws.length };
  }, [src, machine, frames]);
  fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64')); fs.writeFileSync(out.replace('.png', '_old.png'), Buffer.from(res.cmp.split(',')[1], 'base64')); delete res.png; delete res.cmp; console.log(JSON.stringify(res)); console.log(logs.slice(0, 6).join('\n')); await b.close();
})();

// Mesures du moteur dans les deux modes : intervalles d'image (p50, p95, p99, max), tâches longues, durée de la bascule, mémoire JS, taille des ressources.
// ATTENTION : exécuté ici en rendu logiciel (SwiftShader). Ces chiffres ne décrivent PAS les performances sur carte graphique ;
// ils servent à comparer deux versions du code dans le même banc. Usage : node tools/mesure-perf.mjs [sortie.json]
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), sortie = process.argv[2] || path.join(root, 'docs/perf/fall26-moteur-swiftshader.json');
let chromium; { try { ({ chromium } = createRequire(root + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); } }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, res) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); } }).listen(0); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(120000); let octets = 0, requetes = 0, shopify = 0;
await p.route(/shopify(cdn)?\.com/, (r) => { shopify++; r.abort(); });
await p.route('https://comtesse.me/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.abort(); });
p.on('response', async (r) => { requetes++; try { octets += (await r.body()).length; } catch {} });
const t0 = Date.now(); await p.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load' }); const chargement = Date.now() - t0;
await p.waitForFunction(() => window.__cvStandardPath && window.__cvHeroGraph, null, { timeout: 90000 }); const pret = Date.now() - t0; await p.waitForTimeout(3000);
const images = (duree, defile) => p.evaluate(async ([duree, defile]) => { const d = [], lt = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => lt.push(Math.round(e.duration)))); try { po.observe({ entryTypes: ['longtask'] }); } catch {} let avant = performance.now(); const debut = avant, y0 = scrollY;
  await new Promise((fin) => { const f = (t) => { d.push(t - avant); avant = t; if (defile) scrollTo(0, y0 + (t - debut) * 0.35); t - debut < duree ? requestAnimationFrame(f) : fin(); }; requestAnimationFrame(f); }); po.disconnect();
  const s = d.slice(1).sort((a, b) => a - b), q = (x) => +s[Math.min(s.length - 1, Math.floor(s.length * x))].toFixed(1);
  return { images: s.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: +s.at(-1).toFixed(1), tachesLongues: lt.length, tacheLongueMax: lt.length ? Math.max(...lt) : 0, memoireMo: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; }, [duree, defile]);
const R = { banc: 'Chromium sans tête, rendu logiciel SwiftShader, 1440 × 900', avertissement: 'Mesures en rendu logiciel : elles ne valent pas pour une carte graphique matérielle.', date: new Date().toISOString().slice(0, 10), chargementMs: chargement, moteurPretMs: pret, requetes: 0, poidsMo: 0, requetesShopify: 0 };
R.platAccueil = await images(6000, false); await p.evaluate(() => scrollTo(0, 2600)); await p.waitForTimeout(800); R.platDefilement = await images(6000, true);
await p.evaluate(() => scrollTo(0, 3000)); await p.waitForTimeout(800);
R.bascule = await p.evaluate(async () => { const t = performance.now(); document.querySelector('.cv-parity-toggle').click(); let n = 0; await new Promise((fin) => { const f = () => { n++; const s = window.__cvStandardPath; s.active && Math.abs(s.progress - 1) < 1e-3 ? fin() : requestAnimationFrame(f); }; requestAnimationFrame(f); }); return { dureeMs: Math.round(performance.now() - t), images: n, nominalMs: 900 }; });
R.expoFixe = await images(6000, false); R.expoDefilement = await images(6000, true);
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500); R.expoAccueil = await images(6000, false);
R.cadresExpo = await p.evaluate(() => window.__cvParity.boxes().length);
/* stabilité : dix bascules de suite, la mémoire ne doit pas grimper sans fin */
const m0 = await p.evaluate(() => performance.memory?.usedJSHeapSize || 0);
for (let i = 0; i < 10; i++) { await p.evaluate(() => window.__cvStandardPath.active ? window.__cvStandardPath.leave() : window.__cvStandardPath.enter()); await p.waitForTimeout(700); }
const m1 = await p.evaluate(() => performance.memory?.usedJSHeapSize || 0);
R.dixBascules = { memoireAvantMo: +(m0 / 1048576).toFixed(1), memoireApresMo: +(m1 / 1048576).toFixed(1), contexteWebGLPerdu: await p.evaluate(() => [...document.querySelectorAll('canvas')].some((c) => { try { const g = c.getContext('webgl2') || c.getContext('webgl'); return g && g.isContextLost(); } catch { return false; } })) };
R.requetes = requetes; R.poidsMo = +(octets / 1048576).toFixed(2); R.requetesShopify = shopify;
R.fichiers = Object.fromEntries(['index.html', 'refonte/moteur.js', 'refonte/hero-graph.js', 'refonte/theme-stars.js', 'refonte/site.css'].map((f) => [f, +(fs.statSync(path.join(root, f)).size / 1024).toFixed(1)]));
fs.mkdirSync(path.dirname(sortie), { recursive: true }); fs.writeFileSync(sortie, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1)); await b.close(); srv.close();

// Profilage reproductible des freezes. À lancer sur une machine AVEC accélération matérielle (Windows + Chrome).
//   node tools/profil-gpu.mjs --gpu                          profil complet (3 répétitions, variantes de base)
//   node tools/profil-gpu.mjs --gpu --slug q18 --reps 5      une autre fiche, 5 répétitions
//   node tools/profil-gpu.mjs --gpu --variants base,machine:off,bg:static,dpr:1,fx:off
//   node tools/profil-gpu.mjs                                Chromium du bac à sable (SwiftShader) : résultats étiquetés « logiciel »
// Sans --gpu l'outil n'utilise pas de GPU et le dit. Avec --gpu il REFUSE de mesurer si le moteur WebGL actif est logiciel
// (SwiftShader, llvmpipe, Basic Render Driver) sauf --allow-software.
// Sorties (dossier --out, défaut docs/profil/<date>-<backend>/) : resultats.json, resume.md, traces/*.json (trace Chrome, à ouvrir
// dans chrome://tracing ou l'onglet Performance de DevTools), backend.json (GPU, pilote, états des fonctions).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const GPU = !!arg('gpu', false), SLUG = arg('slug', 'moteur44'), REPS = +arg('reps', 3), ALLOW_SW = !!arg('allow-software', false), TRACE = arg('trace', true) !== 'off';
const VARIANTS = String(arg('variants', 'base,machine:off,bg:static,bg:off,dpr:1,shadow:off,fx:off')).split(',');
const VPS = String(arg('viewports', 'desktop')).split(',');   // desktop, mobile
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }

const args = GPU ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--disable-frame-rate-limit=false'] : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch(GPU ? { channel: 'chrome', headless: false, args } : { args });

/* ---- 1. quel moteur graphique est réellement actif ---- */
const SOFT = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i;
const probeCtx = await browser.newContext(); const probe = await probeCtx.newPage(); await probe.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
const gl = await probe.evaluate(() => { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return { ok: false }; const e = g.getExtension('WEBGL_debug_renderer_info'); return { ok: true, version: g.getParameter(g.VERSION), vendor: e ? g.getParameter(e.UNMASKED_VENDOR_WEBGL) : null, renderer: e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : null, timer: !!g.getExtension('EXT_disjoint_timer_query_webgl2') || !!g.getExtension('EXT_disjoint_timer_query'), webgpu: !!navigator.gpu }; });
let sys = null; try { const cdp = await probeCtx.newCDPSession(probe); sys = await cdp.send('SystemInfo.getInfo'); } catch {}
await probeCtx.close();
const soft = !gl.ok || SOFT.test(`${gl.renderer} ${gl.vendor}`);
const backend = { mode: soft ? 'LOGICIEL' : 'MATERIEL', gl, navigateur: browser.version(), gpu: sys?.gpu?.devices?.map((d) => ({ vendor: d.vendorString, device: d.deviceString, driver: sys.gpu.auxAttributes?.driverVersion })), fonctions: sys?.gpu?.featureStatus, os: process.platform };
console.log('Moteur graphique :', JSON.stringify({ mode: backend.mode, renderer: gl.renderer, vendor: gl.vendor, navigateur: backend.navigateur, timerQuery: gl.timer, webgpu: gl.webgpu }));
if (GPU && soft && !ALLOW_SW) { console.error('\nARRET : --gpu demandé mais le moteur WebGL actif est logiciel (' + gl.renderer + '). Vérifie chrome://gpu (« Hardware accelerated »), les pilotes, puis relance. --allow-software pour forcer.'); await browser.close(); srv.close(); process.exit(2); }
const label = soft ? 'logiciel' : 'materiel';
const outDir = path.resolve(root, arg('out', `docs/profil/${new Date().toISOString().slice(0, 10)}-${label}`)); fs.mkdirSync(path.join(outDir, 'traces'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'backend.json'), JSON.stringify(backend, null, 1));

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const stat = (d, long) => ({ images: d.length, mediane_ms: +q(d, .5).toFixed(1), p95_ms: +q(d, .95).toFixed(1), p99_ms: +q(d, .99).toFixed(1), max_ms: +Math.max(0, ...d).toFixed(1), gt100: d.filter((x) => x > 100).length, gt200: d.filter((x) => x > 200).length, taches_longues: long.n, tache_longue_max_ms: +long.max.toFixed(0), taches_longues_total_ms: +long.sum.toFixed(0) });

async function run(variant, vp, rep) {
  const [w, h] = vp === 'mobile' ? [390, 844] : [1440, 900];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: vp === 'mobile' });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  await ctx.addInitScript(() => {
    window.__fr = { on: false, d: [], last: 0, long: { n: 0, max: 0, sum: 0 } };
    const tick = (t) => { if (window.__fr.on && window.__fr.last) window.__fr.d.push(t - window.__fr.last); window.__fr.last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    try { new PerformanceObserver((l) => { if (!window.__fr.on) return; for (const e of l.getEntries()) { window.__fr.long.n++; window.__fr.long.sum += e.duration; window.__fr.long.max = Math.max(window.__fr.long.max, e.duration); } }).observe({ entryTypes: ['longtask'] }); } catch {}
  });
  const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const tracePath = path.join(outDir, 'traces', `${SLUG}_${vp}_${variant.replace(/[:,]/g, '-')}_${rep}.json`);
  if (TRACE) await browser.startTracing(p, { path: tracePath, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8', 'blink.user_timing', 'gpu', 'viz', 'cc', 'latencyInfo'] });
  const url = `http://localhost:${port}/projet-${SLUG}.html?uxtest${variant === 'base' ? '' : '&diag=' + variant}`;
  const t0 = Date.now(); await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.rf-cb-dock', { state: 'attached' }); await p.waitForFunction(() => window.__rfFlowReady && window.__rfTest);
  await p.waitForFunction(() => performance.getEntriesByName('rf:first-render').length || window.__diag?.machine === 'off', null, { timeout: 120000 }).catch(() => {});
  const load = { total_ms: Date.now() - t0, ...(await p.evaluate(() => { const m = (n) => performance.getEntriesByName('rf:' + n)[0]?.startTime; const s = m('machine-start'), b = m('machine-built'), f = m('first-render'); return { construction_machine_ms: s != null && b != null ? +(b - s).toFixed(0) : null, premier_rendu_apres_construction_ms: b != null && f != null ? +(f - b).toFixed(0) : null }; })) };
  const win = async (ms, act) => { await p.evaluate(() => { const f = window.__fr; f.d = []; f.long = { n: 0, max: 0, sum: 0 }; f.on = true; }); const m0 = await metrics(); const ta = Date.now(); if (act) await act(); const rest = ms - (Date.now() - ta); if (rest > 0) await p.waitForTimeout(rest); const r = await p.evaluate(() => { window.__fr.on = false; return { d: window.__fr.d, long: window.__fr.long }; }); const m1 = await metrics();
    const dt = (m1.Timestamp - m0.Timestamp) || 1; return { ...stat(r.d, r.long), cpu_principal_pct: +(((m1.ScriptDuration - m0.ScriptDuration) + (m1.LayoutDuration - m0.LayoutDuration) + (m1.RecalcStyleDuration - m0.RecalcStyleDuration) + (m1.TaskDuration - m0.TaskDuration - (m1.ScriptDuration - m0.ScriptDuration) - (m1.LayoutDuration - m0.LayoutDuration) - (m1.RecalcStyleDuration - m0.RecalcStyleDuration))) / dt * 100).toFixed(0), js_pct: +((m1.ScriptDuration - m0.ScriptDuration) / dt * 100).toFixed(0), mise_en_page_pct: +((m1.LayoutDuration - m0.LayoutDuration) / dt * 100).toFixed(0), styles_pct: +((m1.RecalcStyleDuration - m0.RecalcStyleDuration) / dt * 100).toFixed(0), tas_js_Mo: +(m1.JSHeapUsedSize / 1048576).toFixed(1), noeuds_dom: m1.Nodes }; };
  const sc = {};
  sc.repos = await win(4000);
  sc.defilement = await win(3000, async () => { for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 90); await p.waitForTimeout(100); } });
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
  const o0 = Date.now(); await p.click('.rf-cta[data-demo="magic"]', { force: true }); await p.waitForSelector('.fl-ov.is-open'); const tOpen = Date.now() - o0;
  sc.magie = await win(5000);
  await p.evaluate(() => window.__rfFlowTest.seek(window.__rfFlowTest.run() + 400, true)); await p.waitForFunction(() => !document.querySelector('.fl-ov-end').hidden);
  const t1 = Date.now(); await p.click('.fl-ov-end [data-act="machine"]', { force: true }); await p.waitForSelector('.cv-cb-panel.is-open', { timeout: 60000 }); const tTr = Date.now() - t1;
  sc.explorer = await win(5000, async () => { const b = p.locator('.cv-cb-panel button').nth(1); if (await b.count()) await b.click({ force: true }).catch(() => {}); });
  if (TRACE) await browser.stopTracing();
  const gc = await metrics();
  await ctx.close();
  return { load, ouvertures: { ouverture_magie_ms: tOpen, magie_vers_machine_ms: tTr }, scenarios: sc, cpu_total: { script_s: +gc.ScriptDuration.toFixed(2), taches_s: +gc.TaskDuration.toFixed(2) } };
}

const results = { meta: { date: new Date().toISOString(), mode: backend.mode, renderer: gl.renderer, navigateur: backend.navigateur, slug: SLUG, reps: REPS, variantes: VARIANTS, viewports: VPS, note: soft ? 'RENDU LOGICIEL : ces intervalles mesurent le CPU qui simule le GPU. Ne pas en déduire de cadence 60/30 FPS ni de gain GPU.' : 'Rendu matériel.' }, runs: {} };
for (const vp of VPS) for (const v of VARIANTS) {
  const key = `${vp} | ${v}`; results.runs[key] = [];
  for (let r = 1; r <= REPS; r++) { const res = await run(v, vp, r); results.runs[key].push(res); const s = res.scenarios; console.log(key, `#${r}`, `charge ${res.load.total_ms}ms`, `repos med ${s.repos.mediane_ms}/p95 ${s.repos.p95_ms}`, `magie med ${s.magie.mediane_ms}/p95 ${s.magie.p95_ms}/>100:${s.magie.gt100}`, `explorer med ${s.explorer.mediane_ms}/p95 ${s.explorer.p95_ms}`); }
}
fs.writeFileSync(path.join(outDir, 'resultats.json'), JSON.stringify(results, null, 1));

/* ---- résumé : médiane des répétitions, par variante et scénario ---- */
const med = (a) => q(a, .5);
let md = `# Profilage ${SLUG} (${backend.mode})\n\n- Date : ${results.meta.date}\n- Moteur WebGL : ${gl.renderer} (${gl.vendor})\n- Navigateur : ${backend.navigateur}\n- Répétitions : ${REPS} par variante (valeur affichée = médiane des répétitions)\n- ${results.meta.note}\n\n`;
for (const vp of VPS) {
  md += `## ${vp}\n\n| variante | scénario | médiane ms | P95 ms | P99 ms | >100 ms | >200 ms | tâches longues | CPU principal % | JS % |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const v of VARIANTS) for (const s of ['repos', 'defilement', 'magie', 'explorer']) { const rs = results.runs[`${vp} | ${v}`].map((r) => r.scenarios[s]); const m = (k) => +med(rs.map((x) => x[k])).toFixed(1); md += `| ${v} | ${s} | ${m('mediane_ms')} | ${m('p95_ms')} | ${m('p99_ms')} | ${m('gt100')} | ${m('gt200')} | ${m('taches_longues')} | ${m('cpu_principal_pct')} | ${m('js_pct')} |\n`; }
  md += `\n| variante | chargement ms | construction machine ms | 1er rendu ms | ouverture magie ms | magie vers machine ms |\n|---|---|---|---|---|---|\n`;
  for (const v of VARIANTS) { const rs = results.runs[`${vp} | ${v}`]; const m = (f) => { const a = rs.map(f).filter((x) => x != null); return a.length ? +med(a).toFixed(0) : '-'; }; md += `| ${v} | ${m((r) => r.load.total_ms)} | ${m((r) => r.load.construction_machine_ms)} | ${m((r) => r.load.premier_rendu_apres_construction_ms)} | ${m((r) => r.ouvertures.ouverture_magie_ms)} | ${m((r) => r.ouvertures.magie_vers_machine_ms)} |\n`; }
  md += '\n';
}
fs.writeFileSync(path.join(outDir, 'resume.md'), md);
console.log('\nÉcrit dans', path.relative(root, outDir)); await browser.close(); srv.close();

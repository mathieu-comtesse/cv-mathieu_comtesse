// Test des onze machines : (1) cohérence statique du registre, (2) harnais navigateur : import, construction, temps, scénarios, commandes, inspection.
// Échoue si une machine charge un autre module que celui du registre, ou produit une valeur non finie.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const fail = []; const log = (...a) => console.log(...a);
const { MACHINES, OLD_MACHINES } = await import(root + '/refonte/m3d/registry.js');
// 1. statique
for (const [k, f] of Object.entries(MACHINES)) { if (!fs.existsSync(`${root}/refonte/m3d/${f}.js`)) fail.push(`registre : ${k} -> ${f}.js absent`); if (f === OLD_MACHINES[k] && k !== 'vrestudio-musicbox') fail.push(`registre : ${k} pointe vers l'ancien module`); }
const oldFiles = new Set(Object.entries(OLD_MACHINES).filter(([k, f]) => f !== MACHINES[k]).map(([, f]) => f + '.js'));
const scan = (dir, exts, skip = []) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (skip.includes(e.name) || e.name.startsWith('.') ? [] : scan(path.join(dir, e.name), exts, skip)) : exts.some((x) => e.name.endsWith(x)) ? [path.join(dir, e.name)] : []);
for (const f of [...scan(root, ['.html'], ['node_modules', 'vendor', 'tools']), ...scan(root + '/refonte', ['.js'])]) {
  if (f.endsWith('/registry.js')) continue; const s = fs.readFileSync(f, 'utf8');
  for (const o of oldFiles) { const re = new RegExp(`m3d/${o.replace('.', '\\.')}|['"]\\./${o.replace('.', '\\.')}['"]`); if (re.test(s) && !/m3d\/(vre|powerbi|studio)-wattselse\.js/.test(path.basename(f))) fail.push(`${path.relative(root, f)} référence l'ancien module ${o}`); }
}
// 1 bis. modules natifs embarqués dans refonte/boot-native.js : chacun doit être analysable (une redéclaration dans un correctif coupe tout le chemin 3D)
{ const { execSync } = await import('node:child_process'); const os = await import('node:os'); const src = fs.readFileSync(`${root}/refonte/boot-native.js`, 'utf8'), re = /new Blob\(\["((?:[^"\\]|\\.)*)"\]/g; let m, n = 0; const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-'));
  while ((m = re.exec(src))) { let code; try { code = JSON.parse('"' + m[1] + '"'); } catch (e) { fail.push(`boot-native.js : module ${n} illisible (${e.message})`); n++; continue; } const f = path.join(dir, `m${n}.mjs`); fs.writeFileSync(f, code); try { execSync(`node --check ${f}`, { stdio: 'pipe' }); } catch (e) { fail.push(`boot-native.js : module embarqué ${n} invalide : ${String(e.stderr).split('\n').find((l) => /Error/.test(l))}`); } n++; }
  if (!n) fail.push('boot-native.js : aucun module embarqué trouvé'); log('modules natifs analysés :', n); }
log('registre statique :', fail.length ? 'ÉCHEC' : 'ok');
// 2. navigateur
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }).end(fs.readFileSync(f)); }).listen(0);
const port = srv.address().port; let chromium; try { const { createRequire } = await import('node:module'); const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q18/')('playwright')); } } catch { console.error(fail.join('\n')); log('playwright absent : harnais navigateur ignoré'); srv.close(); process.exit(fail.length ? 1 : 0); }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage();
p.on('pageerror', (e) => fail.push('erreur de page : ' + e)); await p.goto(`http://localhost:${port}/tools/machines-harness.html`); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
const rep = await p.evaluate(() => window.runMachines());
for (const [k, r] of Object.entries(rep)) { const ok = !r.errors.length && r.module === r.expected; log((ok ? 'ok     ' : 'ÉCHEC  ') + k.padEnd(20), r.module, JSON.stringify(r.notes)); if (r.module !== r.expected) fail.push(`${k} : module chargé ${r.module}, attendu ${r.expected}`); for (const e of r.errors.slice(0, 6)) fail.push(`${k} : ${e}`); if (r.errors.length > 6) fail.push(`${k} : … ${r.errors.length - 6} autres erreurs`); }
if (process.env.PERF) { const pf = await p.evaluate(() => window.perfMachines()); log('\nCoût CPU (construction, mise à jour par image, maillages) :'); for (const [k, v] of Object.entries(pf)) log(k.padEnd(20), JSON.stringify(v)); }
// ?machines=old doit rester explicite : sans le paramètre, aucun ancien module
await b.close(); srv.close();
if (fail.length) { console.error('\n' + fail.join('\n')); process.exit(1); } log('\nles onze machines : modules corrects, construction et commandes valides');

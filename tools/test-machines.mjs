// Test des onze machines : (1) cohérence statique du registre, (2) harnais navigateur : import, construction, temps, scénarios, commandes, inspection.
// Échoue si une machine charge un autre module que celui du registre, ou produit une valeur non finie.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { routeCheckout } from './route-checkout.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const fail = []; const log = (...a) => console.log(...a);
const { MACHINES, OLD_MACHINES } = await import(new URL('../refonte/m3d/registry.js', import.meta.url));
// 1. statique
for (const [k, f] of Object.entries(MACHINES)) { if (!fs.existsSync(`${root}/refonte/m3d/${f}.js`)) fail.push(`registre : ${k} -> ${f}.js absent`); if (f === OLD_MACHINES[k] && k !== 'vrestudio-musicbox') fail.push(`registre : ${k} pointe vers l'ancien module`); }
const oldFiles = new Set(Object.entries(OLD_MACHINES).filter(([k, f]) => f !== MACHINES[k]).map(([, f]) => f + '.js'));
const scan = (dir, exts, skip = []) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (skip.includes(e.name) || e.name.startsWith('.') ? [] : scan(path.join(dir, e.name), exts, skip)) : exts.some((x) => e.name.endsWith(x)) ? [path.join(dir, e.name)] : []);
for (const f of [...scan(root, ['.html'], ['node_modules', 'vendor', 'tools']), ...scan(root + '/refonte', ['.js'])]) {
  if (f.endsWith('/registry.js')) continue; const s = fs.readFileSync(f, 'utf8');
  for (const o of oldFiles) { const re = new RegExp(`m3d/${o.replace('.', '\\.')}|['"]\\./${o.replace('.', '\\.')}['"]`); if (re.test(s) && !/m3d\/(vre|powerbi|studio)-wattselse\.js/.test(path.basename(f))) fail.push(`${path.relative(root, f)} référence l'ancien module ${o}`); }
}
// 1 bis. moteur du chemin : modules originaux analysables, et plus aucune adresse Shopify dans l'accueil
{ const { execSync } = await import('node:child_process'); for (const f of ['refonte/moteur.js', 'refonte/hero-graph.js', 'refonte/theme-stars.js']) { try { execSync(`node --check ${root}/${f}`, { stdio: 'pipe' }); } catch (e) { fail.push(`${f} : ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); } }
  if (/shopify(cdn)?\.com/.test(fs.readFileSync(`${root}/index.html`, 'utf8'))) fail.push('index.html : adresse Shopify présente'); }
log('registre statique :', fail.length ? 'ÉCHEC' : 'ok');
// 2. navigateur
const origin = 'http://cv.test';
let chromium; try { const { createRequire } = await import('node:module'); const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q18/')('playwright')); } } catch { console.error(fail.join('\n')); log('playwright absent : harnais navigateur ignoré'); process.exit(fail.length ? 1 : 0); }
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage();
await routeCheckout(p.context(), root, origin);
p.on('pageerror', (e) => fail.push('erreur de page : ' + e)); await p.goto(origin + '/tools/machines-harness.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
const rep = await p.evaluate(() => window.runMachines());
for (const [k, r] of Object.entries(rep)) { const ok = !r.errors.length && r.module === r.expected; log((ok ? 'ok     ' : 'ÉCHEC  ') + k.padEnd(20), r.module, JSON.stringify(r.notes)); if (r.module !== r.expected) fail.push(`${k} : module chargé ${r.module}, attendu ${r.expected}`); for (const e of r.errors.slice(0, 6)) fail.push(`${k} : ${e}`); if (r.errors.length > 6) fail.push(`${k} : … ${r.errors.length - 6} autres erreurs`); }
if (process.env.PERF) { const pf = await p.evaluate(() => window.perfMachines()); log('\nCoût CPU (construction, mise à jour par image, maillages) :'); for (const [k, v] of Object.entries(pf)) log(k.padEnd(20), JSON.stringify(v)); }
// ?machines=old doit rester explicite : sans le paramètre, aucun ancien module
await b.close();
if (fail.length) { console.error('\n' + fail.join('\n')); process.exit(1); } log('\nles onze machines : modules corrects, construction et commandes valides');

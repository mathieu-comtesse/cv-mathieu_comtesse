/* Console pour la page du jeu, sans serveur : lance Chrome sans interface (tube DevTools), charge la page de capture,
 * évalue une expression JavaScript (ou un fichier .js) et affiche le résultat ; les erreurs et avertissements de la page
 * sont affichés à la fin. Sert au débogage (lire un shader de three.js, interroger un monde, mesurer un rendu).
 *   node tools/forge/preview/evalue.mjs "THREE.REVISION"
 *   node tools/forge/preview/evalue.mjs --fichier essai.js [--attendre 4]      (--attendre : secondes de jeu avancées avant)
 *   node tools/forge/preview/evalue.mjs --url "?monde=quai" "typeof TALAS_QUAI"   (paramètres d'URL de la page)
 *   node tools/forge/preview/evalue.mjs --sortie x.png "TALAS_MONDE.planche()"   (enregistre un résultat data:image) */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../../..')
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const fichier = opt('--fichier'), attendre = +opt('--attendre', 0), suffixe = opt('--url', ''), sortie = opt('--sortie')
const rest = args.filter((a, i) => !a.startsWith('--') && !['--fichier', '--attendre', '--url', '--sortie'].includes(args[i - 1]))
const expr = fichier ? readFileSync(resolve(fichier), 'utf8') : rest.join(' ')
if (!expr) { console.log('usage : evalue.mjs "<expression>" | --fichier x.js'); process.exit(1) }

const OUT = resolve(HERE, '../out/videos'); mkdirSync(OUT, { recursive: true })
let html = readFileSync(join(ROOT, 'village-talas-scene.html'), 'utf8')
html = html.replace(/<head>/i, `<head><base href="${pathToFileURL(ROOT).href}/">`)
html = html.replace(/<script src="talas-config\.js[^"]*"><\/script>/, '<script>window.TALAS_SB={url:"",key:""}</script>')
html = html.replace(/<script src="talas-ile\.js[^"]*"><\/script>/, (m) => m + '\n<script src="tools/forge/preview/talas-capture.js"></script>')
const PAGE = join(OUT, 'evalue.html'); writeFileSync(PAGE, html)

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(existsSync)
const profile = mkdtempSync(join(tmpdir(), 'talas-eval-'))
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', '--window-size=1280,720', '--hide-scrollbars', '--mute-audio', '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] })
let seq = 0, buf = ''; const pending = new Map(), logs = []
chrome.stdio[4].on('data', (d) => { buf += d.toString('utf8'); let i; while ((i = buf.indexOf('\0')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1)
  if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result) }
  else if (m.method === 'Runtime.exceptionThrown') logs.push('[exception] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
  else if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) { const t = m.params.args.map((a) => a.value ?? a.description).join(' '); if (!/flatShading/.test(t)) logs.push(`[${m.params.type}] ` + t) } } })
const send = (method, params = {}, sessionId) => new Promise((ok, ko) => { const id = ++seq; pending.set(id, [ok, ko]); chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0') })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const S = (m, p) => send(m, p, sessionId)
const ev = async (expression) => { const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, replMode: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
await S('Page.enable'); await S('Runtime.enable')
await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false })
await S('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__VIRTUAL_TIME = true' })
await S('Page.navigate', { url: pathToFileURL(PAGE).href + suffixe })
const t0 = Date.now()
while (!(await ev('!!(window.TalasCapture && TalasCapture.isReady())').catch(() => false))) { if (Date.now() - t0 > 90000) { console.log('le jeu ne démarre pas'); break } await new Promise((r) => setTimeout(r, 400)) }
for (let i = 0; i < attendre * 30; i++) await ev('TalasCapture.step(33.3)')
try { const v = await ev(expr); if (sortie && typeof v === 'string' && v.startsWith('data:image')) { writeFileSync(resolve(sortie), Buffer.from(v.split(',')[1], 'base64')); console.log('image enregistrée : ' + sortie) } else console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 1)) } catch (e) { console.log('ERREUR : ' + e.message) }
if (logs.length) console.log('\n--- console de la page ---\n' + [...new Set(logs)].slice(0, 30).join('\n'))
await send('Browser.close').catch(() => 0)
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch (e) {} process.exit(0) }, 600)

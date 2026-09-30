/* Photos de chaque mini-jeu en situation, sans serveur (même banc que record.mjs : Chrome sans interface par tube,
 * horloge virtuelle). Une page neuve par mini-jeu ; deux photos : au début de la partie et un peu plus tard.
 *   node tools/forge/preview/apercu-jeux.mjs [prefixe] [jeu ...]   -> tools/forge/out/photos/jeux/<prefixe>-<jeu>-1|2.png */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, appendFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../../..')
const OUT = resolve(HERE, '../out/photos/jeux'); mkdirSync(OUT, { recursive: true })
const LOG = join(OUT, 'journal.txt'); writeFileSync(LOG, '')
const JEUX = { fantome: [0, 'catch3D', 7, 16], combat: [1, 'battle', 13, 22], course: [1, 'run3D', 9, 20], budget: [2, 'budget3D', 7, 30], festin: [2, 'feast3D', 9, 20],
  karaoke: [3, 'karaoke3D', 9, 18], docs: [3, 'docs2D', 9, 22], revue: [5, 'revue3D', 7, 20], chirurgie: [6, 'surgery3D', 9, 20] }
const args = process.argv.slice(2), prefixe = args[0] || 'avant', choix = args.slice(1).filter((a) => JEUX[a])
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(existsSync)
const W = 1280, H = 720, FPS = 15

let html = readFileSync(join(ROOT, 'village-talas-scene.html'), 'utf8')
html = html.replace(/<head>/i, `<head><base href="${pathToFileURL(ROOT).href}/">`)
html = html.replace(/<script src="talas-config\.js[^"]*"><\/script>/, '<script>window.TALAS_SB={url:"",key:""}</script>')
html = html.replace(/<script src="talas-ile\.js[^"]*"><\/script>/, (m) => m + '\n<script src="tools/forge/preview/talas-capture.js"></script>')
const PAGE = join(OUT, 'capture.html'); writeFileSync(PAGE, html)

const profile = mkdtempSync(join(tmpdir(), 'talas-jeux-'))
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let seq = 0, buf = ''; const pending = new Map(), listeners = []
chrome.stdio[4].on('data', (d) => { buf += d.toString('utf8'); let i; while ((i = buf.indexOf('\0')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result) } else listeners.forEach((f) => f(m)) } })
const send = (method, params = {}, sessionId) => new Promise((ok, ko) => { const id = ++seq; pending.set(id, [ok, ko]); chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0') })
listeners.push((m) => { if (m.method === 'Runtime.exceptionThrown') appendFileSync(LOG, '[exception] ' + JSON.stringify(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text) + '\n') })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const S = (m, p) => send(m, p, sessionId)
const ev = async (expression) => { const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
await S('Page.enable'); await S('Runtime.enable')
await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await S('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__VIRTUAL_TIME = true' })
const step = (n) => (async () => { for (let i = 0; i < n; i++) await ev(`TalasCapture.step(${1000 / FPS})`) })()
const shot = async (f) => { const { data } = await S('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, f), Buffer.from(data, 'base64')) }

for (const nom of (choix.length ? choix : Object.keys(JEUX))) {
  const [n, fn, t1, t2] = JEUX[nom]
  await S('Page.navigate', { url: pathToFileURL(PAGE).href + (process.env.TALAS_QUERY || '?r=' + Date.now()) })
  const t0 = Date.now(); while (!(await ev('!!(window.TalasCapture && TalasCapture.isReady())').catch(() => false))) { if (Date.now() - t0 > 90000) throw new Error('jeu non prêt'); await new Promise((r) => setTimeout(r, 400)) }
  await ev(`TalasCapture.stage('apercu', ${JSON.stringify({ n, fn })})`)
  let k = 0; while (!(await ev('window.__jeuT > 0')) && k < 120) { await step(15); k++ }
  if (k >= 120) { console.log(`✗ ${nom} : le jeu n'a pas démarré`); continue }
  await step(t1 * FPS); await shot(`${prefixe}-${nom}-1.png`)
  await step((t2 - t1) * FPS); await shot(`${prefixe}-${nom}-2.png`)
  console.log(`📷 ${nom}`)
}
await send('Browser.close').catch(() => 0)
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch (e) {} process.exit(0) }, 800)

/* Joue le vrai jeu sans fenêtre : Chrome sans interface (tube DevTools), horloge virtuelle, scénario JSON de touches et de photos.
 *   node tools/forge/preview/jouer.mjs scenario.json [--url "?fx=1&pr=1"] [--taille 1280x720] [--dt 50] [--tactile]
 * Le scénario est une liste d'étapes :
 *   ["attendre", 2]                 avance le jeu de 2 s (virtuelles)
 *   ["tenir", "U", 1.5]             maintient la touche U (U D L R S J) 1,5 s
 *   ["clic", "#play"]               clique sur un élément
 *   ["photo", "nom"]                capture -> tools/forge/out/photos/<nom>.png
 *   ["js", "expression"]            évalue une expression (le résultat est affiché)
 *   ["souris", dx, dy]              glisse la souris sur le canevas (rotation de la caméra)
 * Les erreurs et avertissements de la page sont affichés à la fin. Variables : CHROME. */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../../..')
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const suffixe = opt('--url', ''), [W, H] = opt('--taille', '1280x720').split('x').map(Number), DT = +opt('--dt', 33.3)
const scen = JSON.parse(readFileSync(resolve(args.find((a, i) => !a.startsWith('--') && !['--url', '--taille', '--dt'].includes(args[i - 1]))), 'utf8'))
const OUT = resolve(HERE, '../out/videos'), DIR = resolve(HERE, '../out/photos'); mkdirSync(OUT, { recursive: true }); mkdirSync(DIR, { recursive: true })
let html = readFileSync(join(ROOT, 'village-talas-scene.html'), 'utf8')
html = html.replace(/<head>/i, `<head><base href="${pathToFileURL(ROOT).href}/">`)
html = html.replace(/<script src="talas-config\.js[^"]*"><\/script>/, '<script>window.TALAS_SB={url:"",key:""}</script>')
html = html.replace(/<script src="talas-ile\.js[^"]*"><\/script>/, (m) => m + '\n<script src="tools/forge/preview/talas-capture.js"></script>')
const PAGE = join(OUT, 'jouer.html'); writeFileSync(PAGE, html)

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(existsSync)
const profile = mkdtempSync(join(tmpdir(), 'talas-jeu-'))
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] })
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
await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await S('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__VIRTUAL_TIME = true' })
if (args.includes('--tactile')) { await S('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] }); await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }) } // simule un écran tactile
await S('Page.navigate', { url: pathToFileURL(PAGE).href + suffixe })
const t0 = Date.now()
while (!(await ev('!!(window.TalasCapture && TalasCapture.isReady())').catch(() => false))) { if (Date.now() - t0 > 120000) { console.log('le jeu ne démarre pas'); break } await new Promise((r) => setTimeout(r, 400)) }
console.log(`jeu prêt en ${((Date.now() - t0) / 1000).toFixed(1)} s`)
let rec = null // enregistrement vidéo en cours : une image JPEG par pas, envoyée à ffmpeg
const image = async () => { if (!rec) return; const { data } = await S('Page.captureScreenshot', { format: 'jpeg', quality: 88 }); if (!rec.ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => rec.ff.stdin.once('drain', r)) }
const pas = async (sec) => { const dt = rec ? 1000 / rec.fps : DT; for (let i = 0; i < Math.round(sec * 1000 / dt); i++) { await ev(`TalasCapture.step(${dt})`); await image() } }
for (const st of scen) {
  const [cmd, a, b] = st
  try {
    if (cmd === 'attendre') await pas(a)
    else if (cmd === 'tenir') { await ev(`KEYS[${JSON.stringify(a)}] = 1`); await pas(b); await ev(`KEYS[${JSON.stringify(a)}] = 0`) }
    else if (cmd === 'boucle') { const dt = rec ? 1000 / rec.fps : DT; for (let i = 0; i < Math.round(a * 1000 / dt); i++) { await ev(b + `;TalasCapture.step(${dt})`); await image() } }
    else if (cmd === 'video_debut') { const fps = b || 15, out = join(OUT, `${a}.mp4`), ff = spawn(process.env.FFMPEG || 'ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] }); rec = { ff, fps, fin: new Promise((r) => ff.on('close', r)), out } }
    else if (cmd === 'video_fin') { if (rec) { rec.ff.stdin.end(); await rec.fin; console.log('🎬 ' + rec.out); rec = null } }
    else if (cmd === 'jusqua') { const max = st[2] || 120, clic = st[3]; for (let i = 0; i < Math.round(max * 2); i++) { if (await ev(a)) break; if (clic) await ev(`(function(){const b=document.querySelector('#pact button');if(b)b.click()})()`); await pas(.5) } }
    else if (cmd === 'rapide') await ev(a ? "(window.__r0 = window.__r0 || renderer.render, renderer.render = () => {}, window.__rr0 = window.__rr0 || TALAS_RENDU.rendre, TALAS_RENDU.rendre = () => {}, 1)" : "(renderer.render = window.__r0, TALAS_RENDU.rendre = window.__rr0, 1)")
    else if (cmd === 'clic') await ev(`document.querySelector(${JSON.stringify(a)}).click()`)
    else if (cmd === 'dialogue') { for (let i = 0; i < a; i++) { const t = await ev(`(function(){const b=document.querySelector('#pact button');if(!b)return '';const t=b.textContent;b.click();return t})()`); if (!t) { await pas(.5); continue } if (/Attrape|Jouer|Go|Courir|Lancer|Commencer/i.test(t)) { await pas(.5); break } await pas(.9) } }
    else if (cmd === 'photo') { await pas(.05); const { data } = await S('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(DIR, `${a}.png`), Buffer.from(data, 'base64')); console.log('📷 ' + a) }
    else if (cmd === 'js') { const v = await ev(a); console.log(typeof v === 'string' ? v : JSON.stringify(v)) }
    else if (cmd === 'souris') { const cx = W / 2, cy = H / 2
      await S('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 }); await S('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + a, y: cy + b, button: 'left' }); await S('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + a, y: cy + b, button: 'left', clickCount: 1 }); await pas(.1) }
  } catch (e) { console.log(`ERREUR à l'étape ${JSON.stringify(st)} : ${e.message}`) }
}
if (logs.length) console.log('\n--- console de la page ---\n' + [...new Set(logs)].slice(0, 40).join('\n'))
await send('Browser.close').catch(() => 0)
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch (e) {} process.exit(0) }, 600)

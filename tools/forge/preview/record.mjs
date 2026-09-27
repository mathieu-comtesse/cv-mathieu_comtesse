/* Enregistre les comptes rendus vidéo du Village Talas sans serveur ni fenêtre : Chrome sans interface piloté par
 * tube (--remote-debugging-pipe : aucun port réseau), fichiers du dépôt lus directement, horloge virtuelle
 * (talas-capture.js) avancée de 1/30 s par image, une capture d'écran par image, encodage H.264 par ffmpeg.
 *
 *   node tools/forge/preview/record.mjs [intro] [ile-avant] [ile-apres] [parcours-avant] [parcours-apres] [--court]
 *   -> tools/forge/out/videos/<nom>.mp4 (+ journal.txt : erreurs de la page)
 * --court : 3 s par séquence (vérification rapide). Variables : CHROME, FFMPEG. */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, appendFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../../..')
const OUT = resolve(HERE, '../out/videos'); mkdirSync(OUT, { recursive: true })
const LOG = join(OUT, 'journal.txt'); writeFileSync(LOG, '')
const args = process.argv.slice(2), SHORT = args.includes('--court')
const ALL = {
  budget: ['atelier', { n: 2, jeu: 'budget3D', label: '§6 · Le budget de l’atelier', plan: { 1: [[0, 2], [1, 2], [3, 4]], 2: [[3, 2], [4, 3], [2, 4]], 3: [[0, 0]], 4: [[2, 2], [4, 2]] } }],
  combat: ['combat', {}],
  'ile-cycle': ['cycle', {}],
  festin: ['festin', {}],
  revue: ['atelier', { n: 5, jeu: 'revue3D', label: '§9 · La revue de direction, le jeu télé' }],
  intro: ['intro', {}], 'ile-avant': ['ile', { apres: false }], 'ile-apres': ['ile', { apres: true }], 'parcours-avant': ['parcours', { apres: false }], 'parcours-apres': ['parcours', { apres: true }] }
const wanted = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--photos'); if (args.includes('--planche') && !wanted.length) wanted.push('__aucun')
const plan = (wanted.length ? wanted : Object.keys(ALL)).filter((k) => ALL[k]).map((k) => [k, ...ALL[k]])
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync)
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const W = 1280, H = 720, FPS = 30

/* page locale : le jeu tel quel, base sur la racine du dépôt, statistiques coupées, banc de capture branché */
let html = readFileSync(join(ROOT, 'village-talas-scene.html'), 'utf8')
html = html.replace(/<head>/i, `<head><base href="${pathToFileURL(ROOT).href}/">`)
html = html.replace(/<script src="talas-config\.js[^"]*"><\/script>/, '<script>window.TALAS_SB={url:"",key:""}</script>')
html = html.replace('<script src="talas-ile.js?v=1"></script>', '<script src="talas-ile.js?v=1"></script>\n<script src="tools/forge/preview/talas-capture.js"></script>')
if (!html.includes('talas-capture.js') || html.includes('talas-config.js')) throw new Error('page locale : points d\'insertion introuvables')
const PAGE = join(OUT, 'capture.html'); writeFileSync(PAGE, html)

/* Chrome et protocole DevTools sur tube (messages JSON séparés par \0) */
const profile = mkdtempSync(join(tmpdir(), 'talas-rec-'))
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--allow-file-access-from-files',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'],
{ stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
chrome.stderr.on('data', (d) => appendFileSync(LOG, '[chrome] ' + d))
let seq = 0, buf = ''
const pending = new Map(), listeners = []
chrome.stdio[4].on('data', (d) => {
  buf += d.toString('utf8'); let i
  while ((i = buf.indexOf('\0')) >= 0) {
    const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1)
    if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result) } else listeners.forEach((f) => f(m))
  }
})
const send = (method, params = {}, sessionId) => new Promise((ok, ko) => { const id = ++seq; pending.set(id, [ok, ko]); chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0') })
listeners.push((m) => {
  if (m.method === 'Runtime.exceptionThrown') appendFileSync(LOG, '[exception] ' + JSON.stringify(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text) + '\n')
  if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) appendFileSync(LOG, `[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description).join(' ') + '\n')
})

const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const S = (m, p) => send(m, p, sessionId)
const ev = async (expression) => { const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
await S('Page.enable'); await S('Runtime.enable')
await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await S('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__VIRTUAL_TIME = true' })
await S('Page.navigate', { url: pathToFileURL(PAGE).href })

const t0 = Date.now()
while (!(await ev('!!(window.TalasCapture && TalasCapture.isReady())').catch(() => false))) {
  if (Date.now() - t0 > 90000) throw new Error('le jeu ne démarre pas (voir journal.txt)')
  await new Promise((r) => setTimeout(r, 500))
}
console.log(`jeu prêt en ${((Date.now() - t0) / 1000).toFixed(1)} s`)

/* --photos <fichier.json> : [[nom, avant|apres, [px,py,pz], [lx,ly,lz]], ...] -> out/photos/<nom>.png */
const pi = args.indexOf('--photos')
if (pi >= 0) {
  const shots = JSON.parse(readFileSync(resolve(args[pi + 1]), 'utf8')), dir = resolve(HERE, '../out/photos'); mkdirSync(dir, { recursive: true })
  for (const [nom, quand, pos, look, heure] of shots) {
    if (typeof pos === 'string' && pos.startsWith('parcours:')) { const [, x, y, zoom] = pos.split(':').map(Number); await ev(`TalasCapture.stage('pvue', ${JSON.stringify({ apres: quand === 'apres', x, y, zoom: zoom || 0 })})`) }
    else await ev(`TalasCapture.stage('vue', ${JSON.stringify({ apres: quand === 'apres' || quand === 'nuit', nuit: quand === 'nuit', pos, look })})`)
    if (heure !== undefined) await ev(`window.TALAS_NUIT && (TALAS_NUIT.fixe = ${heure})`)
    for (let i = 0; i < (String(pos).startsWith('parcours:') ? 90 : 12); i++) await ev(`TalasCapture.step(${1000 / FPS})`)
    const { data } = await S('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(dir, `${nom}.png`), Buffer.from(data, 'base64'))
    await ev('TalasCapture.unstage()'); console.log('📷 ' + nom)
  }
  plan.length = 0
}
/* --planche : textures peintes de la direction Panthère -> out/photos/planche-da-panthere.png */
if (args.includes('--planche')) {
  const url = await ev('TalasCapture.plancheDA()'), dir = resolve(HERE, '../out/photos'); mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'planche-da-panthere.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('🎨 planche-da-panthere.png'); plan.length = 0
}
for (const [file, name, opts] of plan) {
  const { seconds } = await ev(`TalasCapture.stage(${JSON.stringify(name)}, ${JSON.stringify(opts)})`)
  const n = Math.round((SHORT ? 3 : seconds) * FPS), out = join(OUT, `${file}.mp4`)
  const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] })
  const done = new Promise((r) => ff.on('close', r)), ts = Date.now()
  for (let i = 0; i < n; i++) {
    await ev(`TalasCapture.step(${1000 / FPS})`)
    if (i % 15 === 14 && i > FPS * 3 && await ev('TalasCapture.isDone()')) { ff.stdin.write(Buffer.alloc(0)); console.log(`  fin du mini-jeu à ${(i / FPS).toFixed(1)} s`); break }
    const { data } = await S('Page.captureScreenshot', { format: 'jpeg', quality: 92 })
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r))
    if (i % 150 === 149) process.stdout.write(`  ${file} ${i + 1}/${n}\r`)
  }
  ff.stdin.end(); await done; await ev('TalasCapture.unstage()')
  console.log(`✓ ${file}.mp4  ${(n / FPS).toFixed(1)} s vidéo, ${((Date.now() - ts) / 1000).toFixed(0)} s de rendu`)
}
await send('Browser.close').catch(() => 0)
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch (e) {} process.exit(0) }, 800)

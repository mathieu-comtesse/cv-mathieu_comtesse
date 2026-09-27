/* Aperçu fictif de la salle de contrôle (village-talas-stats.html) pour la page du CV.
 * Rend la vraie page, à jour, avec des sessions inventées injectées dans build() : aucune connexion à Supabase.
 *   node tools/forge/preview/salle-controle.mjs
 *   -> assets/talas-salle-controle-grand.jpg (1120 px de large) et assets/talas-salle-controle.jpg (800 px)
 * Chrome sans interface piloté par tube (comme record.mjs), ffmpeg pour la réduction et le JPEG. */
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../../..')
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync)
const FFMPEG = process.env.FFMPEG || 'ffmpeg', W = 1120

/* sessions fictives : mêmes joueurs que l'aperçu précédent, compteurs des nouveaux jeux (§6 budget, §9 jeu télé, §10 régate) */
const DATA = `(() => {
  const P = [
    // pseudo, début, minutes, statut §4..§10 (ok / ko / run / no), morts, fin {win, cdi}, compteurs
    ['Kevin_du_BTP', '2026-09-27T09:45', 40, ['ok','ok','ko','ok','ok','ko','ok'], 2, { win: 1, cdi: 88 },
      { slippers: 4, blood: 14, run_m: 1900, saved: 5, items: 9, mesures: 12, parades: 21, meals: 14, notes: 6, coins: 41, buzz: 9, ecarts: 4, bzzt: 3, jet_vol: 14.6, jet_eau: 37.5, jet_plongeon: 3, jet_ecarts: 5, jet_plage: 2, signalements: 5, bouees: 37, etapes10: 12 }],
    ['LaPréventrice', '2026-09-27T09:50', 4, ['ok','ok','run','no','no','no','no'], 9, null, { slippers: 3, blood: 9, run_m: 800, saved: 2, items: 4, mesures: 3, parades: 4 }],
    ['<b>Hack</b>', '2026-09-27T09:55', 2, ['run','no','no','no','no','no','no'], 0, null, { slippers: 1 }],
    ['Jean-Norme', '2026-09-27T10:00', 4, ['ok','ok','ko','ok','run','no','no'], 1, null, { slippers: 5, blood: 6, run_m: 1100, saved: 3, items: 6, mesures: 9, parades: 15, meals: 8, notes: 4, angry: 1, coins: 18 }],
    ['Stagiaire42', '2026-09-27T10:05', 4, ['ok','run','no','no','no','no','no'], 3, null, { slippers: 2, blood: 3 }],
  ]
  const ss = [], ev = []
  P.forEach(([pseudo, t, min, st, deaths, end, c], i) => {
    const id = 'f' + i + '0e8a3c-4b1d-4c2e-9f7a-00000000000' + i, t0 = new Date(t), at = (m) => new Date(t0.getTime() + m * 60000).toISOString()
    ss.push({ id, pseudo, created_at: t0.toISOString() })
    ev.push({ session_id: id, kind: 'start', data: { touch: 0 }, at: at(0) })
    st.forEach((x, k) => { if (x === 'no') return; ev.push({ session_id: id, kind: 'mission', chapter: k + 4, data: { phase: x === 'run' ? 'in' : 'done' }, ok: x === 'ok', at: at(min * (k + 1) / 8) }) })
    for (let d = 0; d < deaths; d++) ev.push({ session_id: id, kind: 'death', data: {}, at: at(min * .5) })
    ev.push({ session_id: id, kind: end ? 'end' : 'progress', data: Object.assign({}, c, end || {}), at: at(min) })
  })
  document.getElementById('login').hidden = true; document.getElementById('app').hidden = false
  document.getElementById('who').textContent = '· connecté : mathieu@example.fr'
  build(ss, ev)
  return document.getElementById('app').getBoundingClientRect().height
})()`

const profile = mkdtempSync(join(tmpdir(), 'talas-sc-'))
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--allow-file-access-from-files', `--window-size=${W},1400`, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] })
let seq = 0, buf = ''; const pending = new Map()
chrome.stdio[4].on('data', (d) => { buf += d.toString('utf8'); let i; while ((i = buf.indexOf('\0')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result) } } })
const send = (method, params = {}, sessionId) => new Promise((ok, ko) => { const id = ++seq; pending.set(id, [ok, ko]); chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0') })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const S = (m, p) => send(m, p, sessionId)
await S('Page.enable'); await S('Emulation.setDeviceMetricsOverride', { width: W, height: 1400, deviceScaleFactor: 1, mobile: false })
await S('Page.navigate', { url: pathToFileURL(join(ROOT, 'village-talas-stats.html')).href })
for (let t = 0; t < 60; t++) { const r = await S('Runtime.evaluate', { expression: "typeof build === 'function' && document.readyState === 'complete'", returnByValue: true }); if (r.result.value) break; await new Promise((r) => setTimeout(r, 500)) }
await new Promise((r) => setTimeout(r, 1500)) // polices
const r = await S('Runtime.evaluate', { expression: DATA, returnByValue: true })
if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
await new Promise((res) => setTimeout(res, 800))
const H = Math.ceil(r.result.value) + 24
const { data } = await S('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 }, captureBeyondViewport: true })
const png = join(profile, 'salle.png'); writeFileSync(png, Buffer.from(data, 'base64'))
const ff = (args) => new Promise((ok, ko) => spawn(FFMPEG, ['-v', 'error', '-y', ...args], { stdio: 'inherit' }).on('close', (c) => (c ? ko(new Error('ffmpeg ' + c)) : ok())))
await ff(['-i', png, '-q:v', '3', join(ROOT, 'assets/talas-salle-controle-grand.jpg')])
await ff(['-i', png, '-vf', 'scale=800:-2:flags=lanczos', '-q:v', '3', join(ROOT, 'assets/talas-salle-controle.jpg')])
console.log(`✓ salle de contrôle : ${W} × ${H} px -> assets/talas-salle-controle(-grand).jpg`)
await send('Browser.close').catch(() => 0); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch (e) {} process.exit(0) }, 500)

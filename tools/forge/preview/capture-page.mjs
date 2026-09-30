/* Capture d'une page du CV sans serveur : Chrome sans interface par tube DevTools.
 *   node tools/forge/preview/capture-page.mjs <fichier.html|url> <sortie.png> [--w 1280] [--h 900] [--sombre] [--clair] [--eval "js"] [--hash "#gains"] [--plein] [--tactile]
 * --plein : capture toute la hauteur du document. --eval : JS évalué après le chargement (le résultat est affiché). */
import { spawn } from 'node:child_process'
import { writeFileSync, existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const flag = (n) => args.includes(n)
const cible = args[0], sortie = resolve(args[1])
const W = +opt('--w', 1280), H = +opt('--h', 900)
const url = /^https?:|^file:/.test(cible) ? cible : pathToFileURL(resolve(cible)).href + (opt('--hash', '') || '')
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const profile = mkdtempSync(join(tmpdir(), 'cv-shot-'))
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--allow-file-access-from-files', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', `--window-size=${W},${H}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let seq = 0, buf = ''; const pending = new Map(), listeners = []
chrome.stdio[4].on('data', (d) => { buf += d.toString('utf8'); let i; while ((i = buf.indexOf('\0')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result) } else listeners.forEach((f) => f(m)) } })
const send = (method, params = {}, sessionId) => new Promise((ok, ko) => { const id = ++seq; pending.set(id, [ok, ko]); chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0') })
const dodo = (ms) => new Promise((r) => setTimeout(r, ms))
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const S = (m, p) => send(m, p, sessionId)
const ev = async (expression) => { const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
const erreurs = []
listeners.push((m) => { if (m.method === 'Runtime.exceptionThrown') erreurs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text) })
await S('Page.enable'); await S('Runtime.enable')
await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: flag('--tactile') })
if (flag('--sombre') || flag('--clair')) await S('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: flag('--sombre') ? 'dark' : 'light' }] })
await S('Page.navigate', { url })
await dodo(2500)
// fait défiler toute la page pour déclencher les apparitions au défilement, puis revient en haut
const hauteur = await ev(`(async () => { const h = () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight); for (let y = 0; y < h(); y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)) } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 400)); return h() })()`)
const js = opt('--eval', ''); if (js) { const v = await ev(js); console.log(typeof v === 'string' ? v : JSON.stringify(v)); await dodo(500) }
const plein = flag('--plein')
const hh = plein ? Math.min(hauteur, 16000) : H
if (plein) await S('Emulation.setDeviceMetricsOverride', { width: W, height: hh, deviceScaleFactor: 1, mobile: flag('--tactile') })
await dodo(500)
const { data } = await S('Page.captureScreenshot', { format: 'png' })
writeFileSync(sortie, Buffer.from(data, 'base64'))
console.log('📷', sortie, W + 'x' + hh, erreurs.length ? 'erreurs: ' + erreurs.join(' | ') : 'sans erreur')
try { await send('Browser.close') } catch (e) {}
try { chrome.kill() } catch (e) {}
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch (e) {} process.exit(0) }, 500)

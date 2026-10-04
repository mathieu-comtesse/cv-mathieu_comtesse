/* Capture de l'atlas avec le vrai GPU : Chrome sans interface piloté par tube DevTools (aucun port ouvert).
 *   node tools/atlas-ile/capture.mjs <url|fichier> <sortie.png> [--w 1400] [--h 900] [--attente 5000] [--eval "js"] [--sw]
 * --eval : JS évalué après l'attente (await possible) ; son résultat est affiché. --sw : rendu logiciel (SwiftShader). */
import { spawn } from 'node:child_process'
import { writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const flag = (n) => args.includes(n)
const cible = args[0], sortie = resolve(args[1])
const W = +opt('--w', 1400), H = +opt('--h', 900), ATTENTE = +opt('--attente', 5000)
const url = /^https?:|^file:/.test(cible) ? cible : pathToFileURL(resolve(cible)).href
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const profile = mkdtempSync(join(tmpdir(), 'atlas-shot-'))
const gpu = flag('--sw') ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu-rasterization']
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--allow-file-access-from-files', ...gpu, '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
let seq = 0, buf = ''; const pending = new Map(), listeners = []
chrome.stdio[4].on('data', (d) => { buf += d.toString('utf8'); let i; while ((i = buf.indexOf('\0')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); if (m.id && pending.has(m.id)) { const [ok, ko] = pending.get(m.id); pending.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result) } else listeners.forEach((f) => f(m)) } })
const send = (method, params = {}, sessionId) => new Promise((ok, ko) => { const id = ++seq; pending.set(id, [ok, ko]); chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0') })
const dodo = (ms) => new Promise((r) => setTimeout(r, ms))
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const S = (m, p) => send(m, p, sessionId)
const ev = async (expression) => { const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
const journal = []
listeners.push((m) => {
  if (m.method === 'Runtime.exceptionThrown') journal.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text))
  if (m.method === 'Runtime.consoleAPICalled' && /error|warning/.test(m.params.type)) journal.push(m.params.type + ' ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400))
})
await S('Page.enable'); await S('Runtime.enable')
await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await S('Page.navigate', { url })
await dodo(ATTENTE)
const js = opt('--eval', ''); if (js) { const v = await ev(js); console.log(typeof v === 'string' ? v : JSON.stringify(v)); await dodo(400) }
const { data } = await S('Page.captureScreenshot', { format: 'png' })
writeFileSync(sortie, Buffer.from(data, 'base64'))
console.log('📷', sortie, W + 'x' + H, journal.length ? '\n' + journal.slice(0, 12).join('\n') : 'sans erreur')
try { await send('Browser.close') } catch (e) {}
try { chrome.kill() } catch (e) {}
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch (e) {} process.exit(0) }, 500)

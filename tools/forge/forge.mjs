#!/usr/bin/env node
/* Forge Talas : génère les assets du catalogue et les dépose dans le jeu.
 *
 *   node tools/forge/forge.mjs list                     liste le catalogue
 *   node tools/forge/forge.mjs build [id...] [--jobs 3] export -> Blender -> validation -> assets/talas/props
 *   node tools/forge/forge.mjs validate                 revalide les GLB déposés avec le lecteur du jeu
 *   node tools/forge/forge.mjs gallery                  régénère tools/forge/galerie.html
 *
 * Variables : VIBE3D_DIR (défaut ../vibe3d à côté du dépôt), BLENDER (défaut : recherche Windows/macOS/Linux).
 * Chaque build écrit tools/forge/out/rapport.json (lisible par un agent). */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validate } from './validate.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const OUT = join(HERE, 'out')
const cat = JSON.parse(readFileSync(join(HERE, 'catalogue.json'), 'utf8'))
const VIBE3D = resolve(process.env.VIBE3D_DIR || resolve(ROOT, '../vibe3d'))

function findBlender() {
  if (process.env.BLENDER) return process.env.BLENDER
  const cands = []
  const pf = 'C:/Program Files/Blender Foundation'
  if (existsSync(pf)) for (const d of readdirSync(pf).sort().reverse()) cands.push(join(pf, d, 'blender.exe'))
  cands.push('/Applications/Blender.app/Contents/MacOS/Blender', '/usr/bin/blender', '/snap/bin/blender')
  return cands.find(existsSync) || 'blender'
}

function run(cmd, args, cwd) {
  return new Promise((ok) => {
    const p = spawn(cmd, args, { cwd, shell: false })
    let out = '', err = ''
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => ok({ code, out, err }))
  })
}

const conf = (a) => ({ ...cat.defaults, ...a })

async function build(a) {
  const c = conf(a), t0 = Date.now(), log = { id: c.id, steps: {} }
  const raw = join(OUT, 'raw', `${c.id}.glb`), fin = join(OUT, `${c.id}.glb`), png = join(OUT, DA ? `apercu-${DA}` : 'apercu', `${c.id}.png`)
  const [kind, rel] = c.source.split(/:(.*)/s)
  const module = kind === 'vibe3d' ? resolve(VIBE3D, rel) : resolve(HERE, 'models', rel)
  if (!existsSync(module)) return { ...log, ok: false, error: `source introuvable : ${module}` }

  // 1. export (Node + tsx de vibe3d, pour partager son instance three)
  const args = ['--import', 'tsx', join(HERE, 'toon-export.mts'), '--module', module, '--id', c.id, '--out', raw,
    '--cartoon', String(c.cartoon), '--occlusion', String(c.occlusion)]
  if (c.height) args.push('--height', String(c.height))
  if (c.params) args.push('--params', JSON.stringify(c.params))
  if (kind === 'local') args.push('--children')
  const e = await run(process.execPath, args, VIBE3D)
  const eLine = e.out.split('\n').find((l) => l.startsWith('{"ok"'))
  if (e.code || !eLine) return { ...log, ok: false, error: 'export : ' + (e.err || e.out).trim().split('\n').slice(-4).join(' | ') }
  log.steps.export = JSON.parse(eLine)

  // 2. Blender : budget + aperçu toon
  const b = await run(findBlender(), ['--background', '--factory-startup', '--python', join(HERE, 'blender_stage.py'), '--',
    '--in', raw, '--out', fin, '--png', png, '--max-tris', String(c.maxTris), '--yaw', String(c.yaw), '--pitch', String(c.pitch), ...(DA && c.theme !== false ? ['--palette', join(HERE, 'palettes', `${DA}.json`)] : DA ? ['--bg', JSON.parse(readFileSync(join(HERE, 'palettes', `${DA}.json`), 'utf8')).style.background] : [])], HERE)
  const bLine = b.out.split('\n').find((l) => l.startsWith('FORGE_BLENDER '))
  if (!bLine) return { ...log, ok: false, error: 'blender : ' + (b.err + b.out).trim().split('\n').filter((l) => /Error|Traceback|line \d/.test(l)).slice(-4).join(' | ') }
  log.steps.blender = JSON.parse(bLine.slice(14))

  // 3. validation avec le lecteur du jeu
  const v = await validate(fin, { maxTris: Math.ceil(c.maxTris * 1.05) })
  log.steps.validate = v
  if (!v.ok) return { ...log, ok: false, error: v.errors.join(' ; ') }

  // 4. dépôt dans le jeu
  const dest = resolve(ROOT, c.dest); mkdirSync(dest, { recursive: true })
  copyFileSync(fin, join(dest, `${c.id}.glb`))
  copyFileSync(raw.replace(/\.glb$/, '.roles.json'), join(dest, `${c.id}.roles.json`))
  return { ...log, ok: true, ms: Date.now() - t0, tris: v.tris, kb: v.kb, size: v.size, parts: v.parts, roles: v.roles, warnings: v.warnings }
}

async function pool(items, n, fn) {
  const res = []; let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k]); const r = res[k]
      console.log(`${r.ok ? '✓' : '✗'} ${r.id.padEnd(28)} ${r.ok ? `${String(r.tris).padStart(5)} tris ${String(r.kb).padStart(4)} Ko ${r.size.join('×')} m ${(r.ms / 1000).toFixed(1)} s` : r.error}`) }
  }))
  return res
}

function gallery() {
  const reportPath = join(OUT, 'rapport.json')
  const rep = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : { results: [] }
  const byId = Object.fromEntries(rep.results.map((r) => [r.id, r]))
  const cards = cat.assets.map((a) => {
    const r = byId[a.id] || {}, rolesPath = resolve(ROOT, conf(a).dest, `${a.id}.roles.json`)
    const roles = existsSync(rolesPath) ? JSON.parse(readFileSync(rolesPath, 'utf8')).roles : {}
    const sw = Object.entries(roles).map(([k, v]) => `<i title="${k} ${v.hex}${v.unlit ? ' (lumineux)' : ''}" style="background:${v.hex}"></i>`).join('')
    return `<figure class="${r.ok ? '' : 'ko'}"><img src="out/${DA ? `apercu-${DA}` : 'apercu'}/${a.id}.png" alt="${a.id}" loading="lazy"><figcaption><b>${a.id}</b>
<small>${r.ok ? `${r.tris} tris · ${r.kb} Ko · ${r.size?.join(' × ')} m` : r.error || 'pas encore généré'}</small><small>${a.source}</small><span>${sw}</span><small>${(a.tags || []).join(' · ')}</small></figcaption></figure>`
  }).join('\n')
  writeFileSync(join(HERE, DA ? `galerie-${DA}.html` : 'galerie.html'), `<!doctype html><meta charset="utf-8"><title>Forge Talas – galerie</title>
<style>body{font:14px system-ui;margin:0;padding:20px;background:#f4ead8;color:#2b2233}h1{margin:0 0 4px}p{margin:0 0 16px;color:#6b5a4a}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}figure{margin:0;background:#fffaf0;border:2px solid #2b2233;border-radius:10px;overflow:hidden}
figure.ko{opacity:.55;border-style:dashed}img{width:100%;display:block;aspect-ratio:1;object-fit:cover;background:#efe3cc}figcaption{padding:8px 10px;display:grid;gap:3px}
small{color:#6b5a4a;font-size:11px;overflow-wrap:anywhere}span i{display:inline-block;width:14px;height:14px;border:1px solid #2b2233;border-radius:3px;margin-right:2px}</style>
<h1>Forge Talas${DA ? ` · ${DA}` : ''}</h1><p>${rep.results.filter((r) => r.ok).length}/${cat.assets.length} assets valides · généré le ${rep.date || '—'} · aperçus Blender au rendu toon du jeu</p><main>${cards}</main>`)
  console.log(`galerie : tools/forge/${DA ? `galerie-${DA}` : 'galerie'}.html`)
}

const [cmd = 'list', ...rest] = process.argv.slice(2)
const jobs = rest.includes('--jobs') ? Number(rest[rest.indexOf('--jobs') + 1]) : 3
const DA = rest.includes('--da') ? rest[rest.indexOf('--da') + 1] : null // direction artistique : palettes/<da>.json
const ids = rest.filter((x, i) => !x.startsWith('--') && rest[i - 1] !== '--jobs' && rest[i - 1] !== '--da')

if (cmd === 'list') {
  for (const a of cat.assets) console.log(`${a.id.padEnd(28)} ${String(conf(a).height ?? '').padStart(5)} m  ≤${String(conf(a).maxTris).padStart(5)} tris  ${a.source}`)
} else if (cmd === 'build') {
  if (!existsSync(join(VIBE3D, 'node_modules', 'tsx'))) { console.error(`vibe3d introuvable ou non installé : ${VIBE3D} (VIBE3D_DIR, puis bun install)`); process.exit(1) }
  const sel = ids.length ? cat.assets.filter((a) => ids.includes(a.id)) : cat.assets
  const unknown = ids.filter((i) => !cat.assets.some((a) => a.id === i))
  if (unknown.length) console.error(`inconnus : ${unknown.join(', ')}`)
  const results = await pool(sel, jobs, build)
  const reportPath = join(OUT, 'rapport.json')
  const prev = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')).results : []
  const merged = [...prev.filter((p) => !results.some((r) => r.id === p.id)), ...results]
  mkdirSync(OUT, { recursive: true })
  writeFileSync(reportPath, JSON.stringify({ date: new Date().toISOString(), vibe3d: VIBE3D, blender: findBlender(), results: merged }, null, 1))
  gallery()
  process.exitCode = results.every((r) => r.ok) ? 0 : 1
} else if (cmd === 'validate') {
  const dir = resolve(ROOT, cat.defaults.dest)
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
    const a = cat.assets.find((x) => `${x.id}.glb` === f)
    const v = await validate(join(dir, f), { maxTris: a ? Math.ceil(conf(a).maxTris * 1.05) : 0 })
    console.log(`${v.ok ? '✓' : '✗'} ${f.padEnd(32)} ${v.tris} tris ${v.errors.join(' ; ')}`)
  }
} else if (cmd === 'gallery') gallery()
else console.error('commandes : list | build [id...] [--jobs n] | validate | gallery')

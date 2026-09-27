/* Construit la préversion publiable du Village Talas (artifact claude.ai), quand le serveur local n'est pas disponible.
 *   node tools/forge/preview/build.mjs  ->  tools/forge/out/preview/ (index.html + files.json pour l'outil Artifact)
 * Différences avec le site : statistiques Supabase coupées (talas-config.js vide), banc de capture vidéo ajouté,
 * balises html/head/body retirées (l'artifact fournit son propre squelette). Le jeu lui-même n'est pas modifié. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../..')
const OUT = resolve(HERE, '../out/preview')
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true })

let html = readFileSync(join(ROOT, 'village-talas-scene.html'), 'utf8')
html = html.replace(/<!doctype html>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head>/gi, '').replace(/<\/?body[^>]*>/gi, '')
html = html.replace(/<title>[^<]*<\/title>/, '<title>Talas préversion</title>')
html = html.replace('<script src="talas-ile.js?v=1"></script>', '<script src="talas-ile.js?v=1"></script>\n<script src="talas-capture.js"></script>')
if (!html.includes('talas-capture.js')) throw new Error('point d\'insertion du banc de capture introuvable')
writeFileSync(join(OUT, 'index.html'), html)

const files = {}
const add = (rel, src = join(ROOT, rel)) => { if (rel.endsWith('.glb')) rel += '.wasm' /* type servi par les artifacts ; fetch réécrit par talas-capture.js */; const dst = join(OUT, rel); mkdirSync(dirname(dst), { recursive: true }); copyFileSync(src, dst); files[rel.replace(/\\/g, '/')] = relative(ROOT, dst).replace(/\\/g, '/') }
writeFileSync(join(OUT, 'talas-config.js'), '/* préversion : statistiques désactivées */\nwindow.TALAS_SB = { url: "", key: "" };\n')
files['talas-config.js'] = relative(ROOT, join(OUT, 'talas-config.js')).replace(/\\/g, '/')
;['talas-panthere.js', 'talas-props.js', 'talas-ile.js', 'talas-jeux.js'].forEach((f) => add(f))
add('talas-capture.js', join(HERE, 'talas-capture.js'))
const walk = (d) => readdirSync(join(ROOT, d)).forEach((f) => { const r = join(d, f); statSync(join(ROOT, r)).isDirectory() ? walk(r) : add(r) })
;['assets/talas', 'assets/talas-doc', 'assets/talas-fight', 'assets/fonts'].forEach(walk)

const total = Object.keys(files).reduce((n, f) => n + statSync(join(OUT, f)).size, 0) + statSync(join(OUT, 'index.html')).size
writeFileSync(join(OUT, 'files.json'), JSON.stringify(files, null, 1))
console.log(`${Object.keys(files).length} fichiers + index.html, ${(total / 1048576).toFixed(1)} Mo -> ${relative(ROOT, OUT)}`)

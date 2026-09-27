/* Forge Talas, étape 3 : valide un GLB avec le lecteur réellement utilisé par le jeu.
 * La fonction loadGLB est extraite à chaud de village-talas-scene.html : si le jeu change de lecteur,
 * la validation suit sans rien recopier.
 *
 *   node tools/forge/validate.mjs <fichier.glb> [--max-tris 6000] [--json]
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const THREE = await import(pathToFileURL(resolve(root, 'three.module.js')).href)

export function extractLoader() {
  const html = readFileSync(resolve(root, 'village-talas-scene.html'), 'utf8')
  const start = html.indexOf('function loadGLB(url)')
  if (start < 0) throw new Error('loadGLB introuvable dans village-talas-scene.html')
  const end = html.indexOf('return root})}', start)
  if (end < 0) throw new Error('fin de loadGLB introuvable')
  const src = html.slice(start, end + 'return root})}'.length)
  // fetch vers le disque, Image factice : les textures ne font pas partie du contrat
  const fetchFile = async (url) => {
    const p = url.split('?')[0]
    const buf = readFileSync(p)
    return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }
  }
  return new Function('THREE', 'fetch', 'Image', 'URL', `${src};return loadGLB`)(THREE, fetchFile, class {}, { createObjectURL: () => '' })
}

export async function validate(file, { maxTris = 0 } = {}) {
  const errors = [], warnings = []
  const raw = readFileSync(file)
  const json = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)).toString())
  const withMatrix = (json.nodes || []).filter((n) => n.matrix).map((n) => n.name)
  if (withMatrix.length) errors.push(`nœud(s) en « matrix » ignoré(s) par loadGLB (exporter en TRS) : ${withMatrix.slice(0, 4).join(', ')}`)
  const hollow = (json.nodes || []).filter((n) => n.mesh === undefined && !n.children?.length && n.name?.includes('__')).map((n) => n.name)
  if (hollow.length) errors.push(`nœud(s) « piece__role » sans maillage : ${hollow.slice(0, 4).join(', ')}`)
  if (json.skins?.length) errors.push('skin présent : le lecteur Talas ne gère pas le squelette')
  if (json.animations?.length) warnings.push('animations ignorées par le lecteur Talas')
  if (json.textures?.length) warnings.push(`${json.textures.length} texture(s) : hors contrat toon (autorisé pour la végétation)`)
  if (json.extensionsUsed?.length) warnings.push(`extensions ignorées : ${json.extensionsUsed.join(', ')}`)

  const loadGLB = extractLoader()
  let obj
  try { obj = await loadGLB(file) } catch (e) { errors.push(`loadGLB échoue : ${e.message}`); return { file, ok: false, errors, warnings } }

  const rolesPath = file.replace(/\.glb$/, '.roles.json')
  const rawRoles = resolve(dirname(file), 'raw', basename(rolesPath))
  const rolesFile = existsSync(rolesPath) ? rolesPath : existsSync(rawRoles) ? rawRoles : null
  const roles = rolesFile ? JSON.parse(readFileSync(rolesFile, 'utf8')).roles : null
  if (!roles) warnings.push('pas de .roles.json : couleurs non documentées')

  let tris = 0, meshes = 0, noColour = 0
  const parts = new Set(), usedRoles = new Set()
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(obj)
  obj.traverse((o) => {
    if (!o.isMesh) return
    meshes++
    const g = o.geometry
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3
    if (!g.attributes.color) noColour++
    const [part, role] = o.name.split('__')
    if (!role) { errors.push(`maillage « ${o.name} » sans rôle (attendu piece__role)`); return }
    parts.add(part); const r = role.replace(/\.\d+$/, ''); usedRoles.add(r)
    if (roles && !roles[r]) errors.push(`rôle « ${r} » absent de ${basename(rolesFile)}`)
    for (const a of ['position', 'normal']) {
      const arr = g.attributes[a]?.array
      if (arr && arr.some((v) => !Number.isFinite(v))) errors.push(`${o.name} : ${a} non fini`)
    }
  })
  if (noColour) warnings.push(`${noColour} maillage(s) sans COLOR_0 (ombrage cuit absent)`)
  if (maxTris && tris > maxTris) errors.push(`${tris} triangles > budget ${maxTris}`)
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
  if (Math.abs(box.min.y) > 0.02 * Math.max(size.y, 0.1)) warnings.push(`base à y=${box.min.y.toFixed(3)} (attendu 0)`)
  if (Math.hypot(c.x, c.z) > 0.05 * Math.max(size.x, size.z)) warnings.push(`emprise décentrée (${c.x.toFixed(2)}, ${c.z.toFixed(2)})`)
  return {
    file: basename(file), ok: errors.length === 0, tris, meshes, parts: [...parts], roles: [...usedRoles],
    size: [size.x, size.y, size.z].map((v) => +v.toFixed(3)), kb: Math.round(raw.length / 1024), errors, warnings,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const maxTris = args.includes('--max-tris') ? Number(args[args.indexOf('--max-tris') + 1]) : 0
  const files = args.filter((a, i) => a.endsWith('.glb') && args[i - 1] !== '--max-tris')
  let bad = 0
  for (const f of files) {
    const r = await validate(resolve(f), { maxTris })
    if (!r.ok) bad++
    if (args.includes('--json')) console.log(JSON.stringify(r))
    else console.log(`${r.ok ? 'OK ' : 'ERR'} ${r.file.padEnd(28)} ${String(r.tris ?? '-').padStart(6)} tris ${String(r.kb ?? '-').padStart(5)} Ko  ${(r.size || []).join(' x ')} m`
      + (r.errors.length ? `\n    ✗ ${r.errors.join('\n    ✗ ')}` : '') + (r.warnings.length ? `\n    · ${r.warnings.join('\n    · ')}` : ''))
  }
  process.exitCode = bad ? 1 : 0
}

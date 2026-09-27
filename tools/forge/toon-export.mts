/* Forge Talas — étape 1 : source Three.js (vibe3d ou modèle maison) -> GLB « contrat Talas ».
 *
 * Lancement (depuis le dossier vibe3d, qui fournit three r185 et tsx) :
 *   node --import tsx <jeu>/tools/forge/toon-export.ts --module <model.ts> --id <id> --out <fichier.glb>
 *
 * Contrat Talas (lu par loadGLB de village-talas-scene.html) :
 *   - mètres, Y vers le haut, origine au sol au centre de l'emprise ;
 *   - un nœud Group par pièce animable, des maillages nommés « piece__role » ;
 *   - role -> couleur via baseColorFactor (linéaire), COLOR_0 = ombrage cuit (occlusion), pas de texture ;
 *   - ni skin ni animation : le jeu anime les pièces par leur nom.
 * Un fichier <id>.roles.json accompagne le GLB : couleur sRGB de chaque rôle, rôles lumineux (non éclairés). */
import { createRequire } from 'node:module'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values: opt } = parseArgs({
  options: {
    module: { type: 'string' },
    export: { type: 'string', default: 'createModel' },
    id: { type: 'string' },
    out: { type: 'string' },
    cartoon: { type: 'string', default: '1' }, // 0 = couleurs d'origine, 1 = saturées et éclaircies façon dessin animé
    occlusion: { type: 'string', default: '0.55' }, // force de l'ombrage cuit dans COLOR_0
    'drop-glass': { type: 'boolean', default: false },
    children: { type: 'boolean', default: false }, // modèles maison : chaque enfant nommé de la racine est une pièce
    height: { type: 'string' },
    params: { type: 'string' }, // JSON passé à createModel(params, THREE) : variantes procédurales // hauteur finale en mètres (les kits vibe3d ne sont pas tous à l'échelle réelle)
  },
  strict: true,
})
if (!opt.module || !opt.id || !opt.out) throw new Error('--module, --id et --out sont requis')

// three est résolu depuis vibe3d (cwd) pour partager la même instance que le modèle
const req = createRequire(resolve(process.cwd(), 'package.json'))
const THREE = await import(pathToFileURL(req.resolve('three/webgpu')).href)
const { GLTFExporter } = await import(pathToFileURL(req.resolve('three/addons/exporters/GLTFExporter.js')).href)
const { mergeVertices } = await import(pathToFileURL(req.resolve('three/addons/utils/BufferGeometryUtils.js')).href)

// GLTFExporter binaire s'appuie sur FileReader, absent de Node
;(globalThis as any).FileReader ??= class {
  result: ArrayBuffer | string | null = null
  onloadend: null | (() => void) = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.() }) }
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`
      this.onloadend?.()
    })
  }
}

const mod = await import(pathToFileURL(resolve(opt.module)).href)
const factory = mod[opt.export!]
if (typeof factory !== 'function') throw new Error(`export ${opt.export} introuvable dans ${opt.module}`)
// les modèles maison reçoivent THREE en argument (aucune dépendance à installer) ; les modèles vibe3d l'ignorent
const made = await factory(opt.params ? JSON.parse(opt.params) : {}, THREE)
const source: any = made?.isObject3D ? made : made?.root
if (!source?.isObject3D) throw new Error('createModel doit renvoyer un Object3D ou { root }')
source.updateMatrixWorld(true)

const cartoon = Number(opt.cartoon)
const occStrength = Number(opt.occlusion)

/* ---------- couleurs ---------- */
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function stylise(lin: [number, number, number]): [number, number, number] {
  let [r, g, b] = lin.map(toSrgb)
  if (cartoon > 0) {
    // HSV : saturation et valeur relevées, teintes quantifiées légèrement pour limiter le nombre de rôles
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
    let h = 0
    if (d > 1e-6) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h = ((h * 60) + 360) % 360
    let s = max ? d / max : 0, v = max
    s = Math.min(1, s * (1 + 0.35 * cartoon))
    v = Math.min(0.97, v + (1 - v) * 0.22 * cartoon) // éclaircit les sombres sans brûler les clairs
    const q = (x: number, n: number) => Math.round(x * n) / n
    h = q(h / 360, 48) * 360; s = q(s, 16); v = q(v, 16)
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c
    ;[r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
    r += m; g += m; b += m
  }
  return [r, g, b] // sRGB
}
/* nom de rôle lisible d'après la couleur (le jeu adresse les couleurs par rôle, comme TPAL) */
function colourName([r, g, b]: [number, number, number]): string {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, s = max ? d / max : 0, v = max
  if (s < 0.18) return v < 0.18 ? 'noir' : v < 0.4 ? 'gris_fonce' : v < 0.65 ? 'gris' : v < 0.88 ? 'gris_clair' : 'blanc'
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = ((h * 60) + 360) % 360
  const base = h < 15 ? 'rouge' : h < 40 ? 'orange' : h < 68 ? 'jaune' : h < 160 ? 'vert' : h < 200 ? 'cyan' : h < 250 ? 'bleu' : h < 290 ? 'violet' : h < 335 ? 'rose' : 'rouge'
  if (base === 'orange' && v < 0.55) return 'brun'
  return base + (v < 0.4 ? '_nuit' : v < 0.65 ? '_fonce' : s < 0.4 ? '_pale' : '')
}
const hex = (s: [number, number, number]) => s.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('')

/* ---------- parcours ---------- */
const slug = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '_').slice(0, 40).replace(/^_+|_+$/g, '') || 'piece' // jamais « __ » : séparateur piece__role

interface Bucket { pos: number[]; nor: number[]; shade: number[]; srgb: [number, number, number]; unlit: boolean; name: string }
interface Part { name: string; matrix: any; buckets: Map<string, Bucket>; obj?: any; parent?: Part }

const excluded = (o: any) => { for (let p = o; p; p = p.parent) if (p.userData?.excludeFromExport) return true; return false }

// Pièces : l'anatomie déclarée par le contrôleur vibe3d (made.parts) si elle existe — pièces imbriquées conservées,
// le reste fusionné dans « corps » ; sinon les enfants directs de la racine (modèles maison).
const parts: Part[] = []
const partOf = new Map<any, Part>()
const usedNames = new Set<string>()
const uniq = (n: string) => { let r = n; for (let i = 2; usedNames.has(r); i++) r = `${n}${i}`; usedNames.add(r); return r }
const snake = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
const declaredParts = made && !made.isObject3D && made.parts && typeof made.parts === 'object'
  ? Object.entries(made.parts).filter(([, o]: any) => o?.isObject3D && o !== source && !excluded(o)) as [string, any][] : []
if (declaredParts.length) {
  const body: Part = { name: uniq('corps'), matrix: source.matrixWorld.clone(), buckets: new Map(), obj: source }
  parts.push(body)
  const declared = new Map<any, Part>()
  for (const [key, o] of declaredParts) {
    if (declared.has(o)) continue
    const p: Part = { name: uniq(slug(snake(key))), matrix: o.matrixWorld.clone(), buckets: new Map(), obj: o }
    declared.set(o, p); parts.push(p)
  }
  const nearest = (o: any) => { for (let a = o; a; a = a.parent) if (declared.has(a)) return declared.get(a); return undefined }
  for (const p of parts) if (p !== body) p.parent = nearest(p.obj.parent)
  source.traverse((o: any) => partOf.set(o, nearest(o) ?? body))
} else {
  // repli : seuls les enfants au nom fonctionnel restent des pièces ; lots de matériaux et couches d'usure -> « corps »
  const FUNCTIONAL = /(lid|hinge|handle|drawer|door|lever|valve|hook|latch|wheel|arm|fork|mast|carriage|lamp|beacon|fan|rotor|blade|hose|nozzle|flap|gate|button|knob|switch|torch|reel|poteau|panneau|porte|tiroir|couvercle|roue)/
  const rootSlug = slug(source.name || '')
  const clean = (n: string) => {
    let r = slug(n)
    for (const t of [rootSlug, ...rootSlug.split('_')]) if (t.length > 2) r = r.replace(new RegExp(`(^|_)${t}(?=_|$)`, 'g'), '')
    return r.replace(/(^|_)(axr|bounded|grounded|hinged|static|supported|part|default|idle|localized|maintained|oversized|complete)(?=_|$)/g, '').replace(/__+/g, '_').replace(/^_+|_+$/g, '')
  }
  let body: Part | undefined
  const bodyPart = () => body ??= (parts.push(body = { name: uniq('corps'), matrix: source.matrixWorld.clone(), buckets: new Map(), obj: source }), body)
  for (const child of source.children) {
    if (excluded(child)) continue
    const raw = child.name || child.userData?.part || ''
    const name = opt.children ? slug(raw) : clean(raw) || slug(raw)
    if (!raw || (!opt.children && (!FUNCTIONAL.test(name) || /(^|_)mat_\d/.test(slug(raw))))) { const b = bodyPart(); child.traverse((o: any) => partOf.set(o, b)); continue }
    const p: Part = { name: uniq(name.slice(0, 32).replace(/_+$/, '') || 'piece'), matrix: child.matrixWorld.clone(), buckets: new Map(), obj: child }
    parts.push(p)
    child.traverse((o: any) => partOf.set(o, p))
  }
}
if (!parts.length) { const p: Part = { name: slug(opt.id!), matrix: source.matrixWorld.clone(), buckets: new Map() }; parts.push(p); source.traverse((o: any) => partOf.set(o, p)) }

const tmp = new THREE.Vector3(), tmpN = new THREE.Vector3(), nm = new THREE.Matrix3()
const stats = { meshes: 0, skipped: 0, tris: 0 }
const roleColours = new Map<string, { hex: string; unlit: boolean }>()

const roleByHex = new Map<string, string>(), takenRoles = new Set<string>()
function roleFor(h: string, srgb: [number, number, number], unlit: boolean) {
  const key = (unlit ? 'L' : '') + h
  let r = roleByHex.get(key)
  if (!r) {
    const base = (unlit ? 'lum_' : '') + colourName(srgb)
    r = base; for (let i = 2; takenRoles.has(r); i++) r = `${base}${i}`
    roleByHex.set(key, r); takenRoles.add(r)
  }
  return r
}

function addMesh(mesh: any, world: any) {
  const part = partOf.get(mesh) ?? parts[0]
  const inv = new THREE.Matrix4().copy(part.matrix).invert()
  const local = new THREE.Matrix4().multiplyMatrices(inv, world)
  nm.getNormalMatrix(local)
  const g = mesh.geometry
  const P = g.getAttribute('position'); if (!P) return
  let N = g.getAttribute('normal')
  if (!N) { g.computeVertexNormals(); N = g.getAttribute('normal') }
  const C = g.getAttribute('aColor'), M = g.getAttribute('aMask'), VC = g.getAttribute('color')
  const idx = g.index
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  const groups = g.groups?.length && Array.isArray(mesh.material) ? g.groups : [{ start: 0, count: idx ? idx.count : P.count, materialIndex: 0 }]
  for (const grp of groups) {
    const mat = mats[grp.materialIndex ?? 0]
    if (!mat || mat.visible === false) continue
    const glassy = (mat.transmission ?? 0) > 0.3 || (mat.transparent && mat.opacity < 0.5)
    if (glassy && opt['drop-glass']) { stats.skipped++; continue }
    const emissive = mat.emissive && (mat.emissive.r + mat.emissive.g + mat.emissive.b) * (mat.emissiveIntensity ?? 1) > 0.6
    for (let t = grp.start; t < grp.start + grp.count; t += 3) {
      const vi = [0, 1, 2].map((k) => (idx ? idx.getX(t + k) : t + k))
      // couleur du triangle : aColor (vibe3d) > couleur de sommet > couleur du matériau
      let lin: [number, number, number] = [0, 0, 0]
      for (const v of vi) {
        const src = C ? [C.getX(v), C.getY(v), C.getZ(v)] : VC ? [VC.getX(v), VC.getY(v), VC.getZ(v)] : [mat.color?.r ?? 1, mat.color?.g ?? 1, mat.color?.b ?? 1]
        lin[0] += src[0] / 3; lin[1] += src[1] / 3; lin[2] += src[2] / 3
      }
      if (emissive && mat.emissive) lin = [mat.emissive.r, mat.emissive.g, mat.emissive.b].map((c: number) => Math.min(1, c * (mat.emissiveIntensity ?? 1))) as any
      const srgb = stylise(lin)
      const h = hex(srgb)
      const role = roleFor(h, srgb, !!emissive)
      let b = part.buckets.get(role)
      if (!b) { b = { pos: [], nor: [], shade: [], srgb, unlit: !!emissive, name: role }; part.buckets.set(role, b) }
      roleColours.set(role, { hex: '#' + h, unlit: !!emissive })
      for (const v of vi) {
        tmp.set(P.getX(v), P.getY(v), P.getZ(v)).applyMatrix4(local)
        tmpN.set(N.getX(v), N.getY(v), N.getZ(v)).applyMatrix3(nm).normalize()
        b.pos.push(tmp.x, tmp.y, tmp.z); b.nor.push(tmpN.x, tmpN.y, tmpN.z)
        const occ = M ? M.getY(v) : 0
        b.shade.push(Math.max(0.25, 1 - occStrength * occ))
      }
      stats.tris++
    }
  }
  stats.meshes++
}

const mtx = new THREE.Matrix4()
source.traverse((o: any) => {
  if (!o.isMesh || excluded(o) || o.visible === false) return
  if (o.isInstancedMesh) {
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mtx); addMesh(o, new THREE.Matrix4().multiplyMatrices(o.matrixWorld, mtx)) }
  } else addMesh(o, o.matrixWorld)
})

/* ---------- sol à l'origine : on recale les pièces pour que la base touche y=0 au centre ---------- */
const box = new THREE.Box3()
for (const p of parts) for (const b of p.buckets.values()) for (let i = 0; i < b.pos.length; i += 3) box.expandByPoint(tmp.set(b.pos[i], b.pos[i + 1], b.pos[i + 2]).applyMatrix4(p.matrix))
const centre = box.getCenter(new THREE.Vector3()), shift = new THREE.Vector3(-centre.x, -box.min.y, -centre.z)
const rawSize = box.getSize(new THREE.Vector3())
const k = opt.height ? Number(opt.height) / rawSize.y : 1

/* ---------- scène de sortie ---------- */
const out = new THREE.Group(); out.name = opt.id
const matCache = new Map<string, any>()
const groupOf = new Map<Part, any>()
for (const p of parts) {
  const g = new THREE.Group(); g.name = p.name
  if (p.parent) new THREE.Matrix4().copy(p.parent.matrix).invert().multiply(p.matrix).decompose(g.position, g.quaternion, g.scale)
  else { p.matrix.decompose(g.position, g.quaternion, g.scale); g.position.add(shift).multiplyScalar(k); g.scale.multiplyScalar(k) }
  for (const b of p.buckets.values()) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3))
    const sh: number[] = []; for (const v of b.shade) sh.push(v, v, v)
    geo.setAttribute('color', new THREE.Float32BufferAttribute(sh, 3))
    const merged = mergeVertices(geo, 1e-5)
    let m = matCache.get(b.name)
    if (!m) {
      m = new THREE.MeshStandardMaterial({ name: b.name, vertexColors: true, roughness: 1, metalness: 0 })
      m.color.setRGB(...b.srgb.map(toLin) as [number, number, number]) // glTF : baseColorFactor linéaire
      matCache.set(b.name, m)
    }
    const mesh = new THREE.Mesh(merged, m); mesh.name = `${p.name}__${b.name}`
    g.add(mesh)
  }
  groupOf.set(p, g)
}
for (const p of parts) (p.parent ? groupOf.get(p.parent) : out).add(groupOf.get(p))
// élague les pièces sans maillage (ni directement ni dans leurs sous-pièces)
const hasMesh = (o: any): boolean => o.children.some((c: any) => c.isMesh || hasMesh(c))
for (const g of groupOf.values()) if (!hasMesh(g)) g.removeFromParent()
out.updateMatrixWorld(true)

const glb: ArrayBuffer = await new GLTFExporter().parseAsync(out, { binary: true, trs: true, onlyVisible: false, animations: [] }) // trs : loadGLB ignore « matrix »
await mkdir(dirname(resolve(opt.out)), { recursive: true })
await writeFile(resolve(opt.out), Buffer.from(glb))
const size = rawSize.clone().multiplyScalar(k)
const roles = Object.fromEntries([...roleColours].sort())
await writeFile(resolve(opt.out).replace(/\.glb$/, '.roles.json'), JSON.stringify({
  id: opt.id, source: opt.module, size: [size.x, size.y, size.z].map((v) => +v.toFixed(3)),
  parts: [...groupOf.values()].filter((g) => g.parent).map((g) => g.name), roles,
}, null, 1))
console.log(JSON.stringify({ ok: true, id: opt.id, out: opt.out, tris: stats.tris, meshes: stats.meshes, skipped: stats.skipped, parts: parts.length, roles: roleColours.size, size: [size.x, size.y, size.z].map((v) => +v.toFixed(2)) }))
process.exit(0)

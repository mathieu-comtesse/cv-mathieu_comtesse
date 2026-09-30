/* Mesure la taille native (mètres) d'un modèle maison avant mise à l'échelle par la forge :
 *   cd ../vibe3d && node --import tsx ../cv-mathieu_comtesse/tools/forge/mesure.mts <fichier.mts> '<params json>'
 * (chemins Windows acceptés : le séparateur est remplacé par « / » ; three vient de vibe3d, comme pour l'export) */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const [file, params] = process.argv.slice(2)
const req = createRequire(resolve(process.cwd(), 'package.json'))
const THREE = await import(pathToFileURL(req.resolve('three/webgpu')).href)
const mod = await import('file:///' + file.split(String.fromCharCode(92)).join('/'))
const { root } = mod.createModel(JSON.parse(params || '{}'), THREE)
root.updateMatrixWorld(true)
const b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3())
console.log(JSON.stringify({ size: [s.x, s.y, s.z].map((v: number) => +v.toFixed(3)), min: b.min.toArray().map((v: number) => +v.toFixed(3)), max: b.max.toArray().map((v: number) => +v.toFixed(3)) }))

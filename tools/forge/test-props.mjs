/* Test d'intégration hors navigateur : talas-props.js + loadGLB extrait du jeu, sur tout le catalogue.
 *   node tools/forge/test-props.mjs */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { extractLoader } from './validate.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const THREE = await import(pathToFileURL(resolve(ROOT, 'three.module.js')).href)
const cat = JSON.parse(readFileSync(resolve(ROOT, 'tools/forge/catalogue.json'), 'utf8'))
const loadGLB = extractLoader()
const ctx = { THREE, window: {}, console, loadGLB: (u) => loadGLB(resolve(ROOT, u.split('?')[0])),
  fetch: async (u) => ({ json: async () => JSON.parse(readFileSync(resolve(ROOT, u.split('?')[0]), 'utf8')) }) }
vm.createContext(ctx); vm.runInContext(readFileSync(resolve(ROOT, 'talas-props.js'), 'utf8'), ctx)
const P = ctx.window.TalasProps; ctx.TalasProps = P
const ids = cat.assets.map((a) => a.id)
const PANTHERE = JSON.parse(readFileSync(resolve(ROOT, 'tools/forge/palettes/panthere.json'), 'utf8'))
await P.preload(ids)
let bad = 0
for (const id of ids) {
  const g = P.make(id, {}, { outline: 1.04 })
  const errs = []
  if (!g) errs.push('non chargé')
  else {
    let meshes = 0, magenta = 0, outlines = 0
    g.traverse((o) => { if (!o.isMesh) return; if (o.material.side === THREE.BackSide) { outlines++; return } meshes++
      if (o.material.color.getHexString() === 'ff00ff') magenta++ })
    if (magenta) errs.push(`${magenta} maillage(s) sans couleur de rôle`)
    if (!meshes) errs.push('aucun maillage')
    // recoloration par rôle
    const role = Object.keys(P.roles(id))[0], g2 = P.make(id, { [role]: '#123456' }, {})
    let hit = false; g2.traverse((o) => { if (o.isMesh && o.name.endsWith('__' + role) && o.material.color.getHexString() === '123456') hit = true })
    if (!hit) errs.push(`recoloration du rôle ${role} sans effet`)
    // direction artistique « panthere » : chaque rôle non lumineux trouve sa couleur, les lum_* restent intacts
    const asset = cat.assets.find((x) => x.id === id)
    if (asset.theme !== false) {
      const tp = P.themePalette(id, PANTHERE), roles = Object.keys(P.roles(id))
      const miss = roles.filter((r) => !r.startsWith('lum_') && !tp[r]), lumHit = roles.filter((r) => r.startsWith('lum_') && tp[r])
      if (miss.length) errs.push(`palette panthere : rôles sans couleur ${miss.join(', ')}`)
      if (lumHit.length) errs.push(`palette panthere : rôles lumineux recolorés ${lumHit.join(', ')}`)
    }
    if (!errs.length) console.log(`✓ ${id.padEnd(28)} ${meshes} maillages, ${outlines} contours, pièces : ${Object.keys(g.userData.parts).join(', ')}`)
  }
  if (errs.length) { bad++; console.log(`✗ ${id.padEnd(28)} ${errs.join(' ; ')}`) }
}
process.exitCode = bad ? 1 : 0

/* Panneau de sécurité ISO 7010 sur poteau, procédural.
 * createModel(params, THREE) — THREE est fourni par la forge (aucune dépendance).
 *   params.kind  : 'danger' (triangle jaune) | 'obligation' (rond bleu) | 'evacuation' (rectangle vert) | 'interdiction' (rond barré rouge)
 *   params.picto : 'general' | 'electrique' | 'casque' | 'sortie' | 'chariot'
 *   params.hauteur : hauteur du poteau en mètres (défaut 2,1)
 * Pièces exportées : « poteau » (fixe) et « panneau » (pivot en haut du poteau, pour le faire osciller en jeu).
 * Règle vibe-model n°9 : chaque couche est décollée de 4 mm de son support, jamais coplanaire. */
export function createModel(params: any = {}, THREE: any) {
  const kind = params.kind ?? 'danger', picto = params.picto ?? 'general', H = params.hauteur ?? 2.1
  const col = (hex: string, name: string) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), name })
  const M = {
    metal: col('#8d99a6', 'metal'), base: col('#4a5360', 'socle'), ink: col('#1d1d1f', 'encre'), white: col('#f4f4f0', 'blanc'),
    yellow: col('#f9a800', 'jaune'), blue: col('#005387', 'bleu'), green: col('#008855', 'vert'), red: col('#c8102e', 'rouge'),
  }
  const LAYER = 0.004
  const extrude = (shape: any, depth: number, mat: any, z: number, bevel = 0.004) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 20 })
    const m = new THREE.Mesh(g, mat); m.position.z = z; return m
  }
  const poly = (pts: number[][]) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s }
  const circle = (r: number) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s }
  const ring = (r: number, w: number) => { const s = circle(r); const h = new THREE.Path(); h.absarc(0, 0, r - w, 0, Math.PI * 2, true); s.holes.push(h); return s }
  const rect = (w: number, h: number, x = 0, y = 0) => poly([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]])

  const root = new THREE.Group(); root.name = `panneau ${kind} ${picto}`
  /* poteau */
  const poteau = new THREE.Group(); poteau.name = 'poteau'
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H, 14), M.metal); tube.position.y = H / 2
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.06, 20), M.base); socle.position.y = 0.03
  const bague = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14), M.base); bague.position.y = 0.085
  poteau.add(tube, socle, bague)

  /* panneau : plaque + fond + bordure + pictogramme, face vers +Z */
  const panneau = new THREE.Group(); panneau.name = 'panneau'; panneau.position.set(0, H - 0.02, 0.035)
  const face = new THREE.Group(); face.position.y = -0.3; panneau.add(face)
  let fg = M.ink, S = 0.6
  if (kind === 'danger') {
    const t = (r: number) => poly([[0, r], [-r * 0.866, -r / 2], [r * 0.866, -r / 2]])
    face.add(extrude(t(0.34), 0.012, M.ink, 0), extrude(t(0.29), LAYER, M.yellow, 0.012 + LAYER, 0.002))
    face.position.y = -0.26; S = 0.36
  } else if (kind === 'obligation' || kind === 'interdiction') {
    const bg = kind === 'obligation' ? M.blue : M.white
    face.add(extrude(circle(0.28), 0.012, kind === 'obligation' ? M.white : M.red, 0), extrude(circle(0.255), LAYER, bg, 0.012 + LAYER, 0.002))
    if (kind === 'interdiction') {
      face.add(extrude(ring(0.255, 0.05), LAYER, M.red, 0.012 + 3 * LAYER, 0))
      const bar = extrude(rect(0.05, 0.46), LAYER, M.red, 0.012 + 3 * LAYER, 0); bar.rotation.z = Math.PI / 4; face.add(bar)
    }
    fg = kind === 'obligation' ? M.white : M.ink; S = 0.4
  } else {
    face.add(extrude(rect(0.62, 0.36), 0.012, M.white, 0), extrude(rect(0.59, 0.33), LAYER, M.green, 0.012 + LAYER, 0.002))
    face.position.y = -0.22; fg = M.white; S = 0.3
  }
  const z = 0.012 + 3 * LAYER
  const P = (pts: number[][]) => extrude(poly(pts.map(([x, y]) => [x * S, y * S])), LAYER, fg, z, 0)
  const addPicto = (m: any) => { face.add(m); return m }
  if (picto === 'general') { // point d'exclamation
    addPicto(P([[-0.07, 0.42], [0.07, 0.42], [0.04, -0.12], [-0.04, -0.12]]))
    const dot = extrude(circle(0.065 * S), LAYER, fg, z, 0); dot.position.y = -0.3 * S; addPicto(dot)
    face.children.slice(-2).forEach((m: any) => (m.position.y -= 0.04))
  } else if (picto === 'electrique') { // éclair
    addPicto(P([[0.1, 0.5], [-0.2, 0.0], [0.0, 0.0], [-0.12, -0.5], [0.22, 0.08], [0.02, 0.08], [0.16, 0.5]])).position.y = -0.05
  } else if (picto === 'casque') { // casque de chantier
    const dome = new THREE.Shape(); dome.absarc(0, 0, 0.42 * S, 0, Math.PI, false); dome.lineTo(-0.42 * S, 0); face.add(extrude(dome, LAYER, fg, z, 0))
    addPicto(P([[-0.62, -0.02], [0.62, -0.02], [0.62, -0.13], [-0.62, -0.13]]))
    addPicto(P([[-0.06, 0.44], [0.06, 0.44], [0.06, 0.02], [-0.06, 0.02]]))
    face.children.slice(-3).forEach((m: any) => (m.position.y -= 0.02))
  } else if (picto === 'sortie') { // flèche + porte + silhouette
    addPicto(P([[-0.9, -0.08], [-0.2, -0.08], [-0.2, -0.3], [0.2, 0.0], [-0.2, 0.3], [-0.2, 0.08], [-0.9, 0.08]]))
    addPicto(P([[0.35, -0.55], [0.85, -0.55], [0.85, 0.55], [0.35, 0.55]]))
    const man = extrude(circle(0.09 * S), LAYER, M.green, z + LAYER, 0); man.position.set(0.6 * S, 0.3 * S, 0); face.add(man)
  } else if (picto === 'chariot') {
    addPicto(P([[-0.6, -0.3], [0.2, -0.3], [0.2, 0.2], [-0.2, 0.2], [-0.3, 0.0], [-0.6, 0.0]]))
    addPicto(P([[0.3, -0.35], [0.38, -0.35], [0.38, 0.55], [0.3, 0.55]]))
    addPicto(P([[0.38, -0.35], [0.75, -0.35], [0.75, -0.27], [0.38, -0.27]]))
  }
  /* fixations : deux colliers derrière la plaque */
  for (const y of [-0.08, -0.42]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.05), M.base); c.position.set(0, y + (kind === 'danger' ? 0.04 : 0.1), -0.02); panneau.add(c)
  }
  root.add(poteau, panneau)
  return { root, dispose() {} }
}

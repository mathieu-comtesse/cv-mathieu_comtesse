/* Mobilier et embarcations de l'île, procéduraux. createModel(params, THREE).
 *   params.kind : 'voilier' | 'lampadaire' | 'banc' | 'parasol'
 *   params.couleur : couleur principale (coque, toile, assise) ; params.variante : graine de variation
 * Pièces animables (enfants nommés de la racine) :
 *   voilier : coque (roulis/tangage en jeu), grand_voile et foc (battement), girouette
 *   lampadaire : poteau, lanterne (verre en rôle lumineux « lum_* »)
 *   parasol : mat, toile (balancement au vent)   ·   banc : corps
 * Mètres, Y vers le haut, avant vers +Z ; couches décollées de 3 à 5 mm (pas de faces coplanaires). */
export function createModel(params: any = {}, THREE: any) {
  const kind = params.kind ?? 'voilier', main = params.couleur ?? '#e03131'
  let seed = (params.variante ?? 1) * 9301 + 49297
  const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const std = (hex: string, name: string, emissive?: string) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), name })
    if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = 1 }
    return m
  }
  const M = {
    main: std(main, 'principal'), blanc: std('#f8f4ea', 'blanc'), bois: std('#b07a45', 'bois'), boisFonce: std('#7a4f2a', 'bois_fonce'),
    metal: std('#5c6470', 'metal'), noir: std('#2b2233', 'noir'), corde: std('#d8c39a', 'corde'), verre: std('#ffe9a8', 'verre', '#ffd873'),
  }
  const mesh = (g: any, m: any, x = 0, y = 0, z = 0, p?: any) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p?.add(o); return o }
  const root = new THREE.Group(); root.name = `${kind}`

  if (kind === 'voilier') {
    const L = 3.2, B = 1.1
    const coque = new THREE.Group(); coque.name = 'coque'; root.add(coque)
    // coque : profil de pont (vue de dessus) extrudé vers le bas, étrave pointue vers +Z, tableau arrière droit
    const deck = new THREE.Shape()
    deck.moveTo(-B / 2, -L / 2); deck.lineTo(B / 2, -L / 2)
    deck.bezierCurveTo(B * .62, -L * .05, B * .45, L * .3, 0, L / 2)
    deck.bezierCurveTo(-B * .45, L * .3, -B * .62, -L * .05, -B / 2, -L / 2)
    const hull = new THREE.ExtrudeGeometry(deck, { depth: .55, bevelEnabled: true, bevelThickness: .08, bevelSize: .06, bevelSegments: 2, curveSegments: 16 })
    hull.rotateX(Math.PI / 2); // la forme passe dans le plan XZ, l'extrusion descend en -Y
    const pos = hull.attributes.position // carène : on resserre le fond pour un V doux
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < -.2) { const k = 1 - Math.min(1, (-y - .2) / .5) * .45; pos.setX(i, pos.getX(i) * k) } }
    hull.computeVertexNormals()
    mesh(hull, M.main, 0, .55, 0, coque)
    // liston blanc et pont en bois, décollés de la coque
    const band = new THREE.ExtrudeGeometry(deck, { depth: .08, bevelEnabled: false, curveSegments: 16 }); band.rotateX(Math.PI / 2); band.scale(1.035, 1, 1.02)
    mesh(band, M.blanc, 0, .5, 0, coque)
    const plank = new THREE.ExtrudeGeometry(deck, { depth: .03, bevelEnabled: false, curveSegments: 16 }); plank.rotateX(Math.PI / 2); plank.scale(.9, 1, .9)
    mesh(plank, M.bois, 0, .595, -.02, coque)
    mesh(new THREE.BoxGeometry(.6, .28, .7), M.blanc, 0, .74, -.55, coque) // roof de cabine
    mesh(new THREE.BoxGeometry(.64, .04, .74), M.boisFonce, 0, .9, -.55, coque)
    ;[-.2, .2].forEach((x) => mesh(new THREE.CircleGeometry(.07, 12), M.noir, x, .76, -.19, coque)) // hublots
    // mât et bôme
    mesh(new THREE.CylinderGeometry(.035, .045, 3.4, 8), M.bois, 0, 2.3, .15, coque)
    const bome = mesh(new THREE.CylinderGeometry(.03, .03, 1.5, 8), M.bois, 0, 1.05, -.55, coque); bome.rotation.x = Math.PI / 2
    // voiles : triangles légèrement creusés (quelques segments), pièces séparées pour le battement
    const sail = (name: string, pts: number[][], x: number) => {
      const g = new THREE.Group(); g.name = name; g.position.set(0, 0, .15); root.add(g)
      const s = new THREE.Shape(); pts.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b))); s.closePath()
      const geo = new THREE.ShapeGeometry(s, 8); const p = geo.attributes.position
      for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i); p.setZ(i, Math.sin(Math.min(1, Math.abs(u) / 1.4) * Math.PI) * .12 * (1 - v / 4)) }
      geo.rotateY(Math.PI / 2); geo.computeVertexNormals()
      const m = mesh(geo, M.blanc, x, 0, 0, g); m.material = M.blanc
      const back = m.clone(); back.geometry = geo.clone().scale(-1, 1, 1); back.position.x = x - .006; g.add(back) // envers : pas de face unique invisible
      return g
    }
    sail('grand_voile', [[0, 1.12], [-1.35, 1.12], [0, 3.85]], .05)
    sail('foc', [[.05, .95], [1.45, .95], [.05, 3.4]], .05)
    const gir = new THREE.Group(); gir.name = 'girouette'; gir.position.set(0, 4.02, .15); root.add(gir)
    const f = new THREE.Shape(); f.moveTo(0, 0); f.lineTo(-.34, .08); f.lineTo(0, .16); f.closePath()
    const fl = mesh(new THREE.ShapeGeometry(f), M.main, 0, 0, 0, gir); fl.rotation.y = Math.PI / 2
    mesh(new THREE.ShapeGeometry(f), M.main, -.004, 0, 0, gir).rotation.y = -Math.PI / 2
  } else if (kind === 'lampadaire') {
    const poteau = new THREE.Group(); poteau.name = 'poteau'; root.add(poteau)
    mesh(new THREE.CylinderGeometry(.14, .18, .18, 12), M.noir, 0, .09, 0, poteau)
    mesh(new THREE.CylinderGeometry(.045, .06, 2.6, 10), M.noir, 0, 1.4, 0, poteau)
    const crook = new THREE.TorusGeometry(.22, .03, 6, 16, Math.PI); mesh(crook, M.noir, .22, 2.7, 0, poteau)
    const lanterne = new THREE.Group(); lanterne.name = 'lanterne'; lanterne.position.set(.44, 2.62, 0); root.add(lanterne)
    mesh(new THREE.ConeGeometry(.2, .16, 8), M.noir, 0, -.02, 0, lanterne)
    mesh(new THREE.CylinderGeometry(.12, .09, .26, 8), M.verre, 0, -.24, 0, lanterne)
    mesh(new THREE.CylinderGeometry(.1, .1, .04, 8), M.noir, 0, -.39, 0, lanterne)
    ;[[0, 0], [Math.PI / 2, 0]].forEach(([r]) => { const b = mesh(new THREE.BoxGeometry(.012, .27, .26), M.noir, 0, -.24, 0, lanterne); b.rotation.y = r })
  } else if (kind === 'banc') {
    const corps = new THREE.Group(); corps.name = 'corps'; root.add(corps)
    for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(1.7, .05, .11), M.bois, 0, .45, -.2 + i * .13, corps).rotation.y = (R() - .5) * .01
    for (let i = 0; i < 3; i++) { const d = mesh(new THREE.BoxGeometry(1.7, .1, .04), M.bois, 0, .62 + i * .13, -.29, corps); d.rotation.x = -.18 }
    ;[-.72, .72].forEach((x) => {
      const pied = new THREE.Shape(); pied.moveTo(-.25, 0); pied.lineTo(-.18, 0); pied.lineTo(-.1, .42); pied.lineTo(.2, .42); pied.lineTo(.26, 0); pied.lineTo(.33, 0); pied.lineTo(.24, .47); pied.lineTo(-.28, .47); pied.lineTo(-.34, .95); pied.lineTo(-.4, .95); pied.closePath()
      const g = new THREE.ExtrudeGeometry(pied, { depth: .05, bevelEnabled: false }); g.rotateY(Math.PI / 2)
      mesh(g, M.noir, x - .025, 0, .05, corps)
      mesh(new THREE.BoxGeometry(.06, .05, .5), M.noir, x, .6, -.05, corps).rotation.x = 0
    })
  } else if (kind === 'parasol') {
    const mat = new THREE.Group(); mat.name = 'mat'; root.add(mat)
    mesh(new THREE.CylinderGeometry(.03, .03, 2.3, 8), M.bois, 0, 1.15, 0, mat)
    const toile = new THREE.Group(); toile.name = 'toile'; toile.position.y = 2.2; root.add(toile)
    const n = 8
    for (let i = 0; i < n; i++) { // pans alternés couleur / blanc
      const g = new THREE.CylinderGeometry(.05, 1.25, .38, 3, 1, true, i * Math.PI * 2 / n, Math.PI * 2 / n)
      const m = mesh(g, i % 2 ? M.blanc : M.main, 0, 0, 0, toile); m.material = (i % 2 ? M.blanc : M.main)
      const under = mesh(g.clone(), M.boisFonce, 0, -.012, 0, toile); under.scale.set(.985, 1, .985); under.material = std('#6b4a3a', 'dessous') // sous la toile
    }
    mesh(new THREE.SphereGeometry(.05, 8, 6), M.bois, 0, .22, 0, toile)
    // transat
    const tr = new THREE.Group(); tr.position.set(.9, 0, .5); tr.rotation.y = -.6; mat.add(tr)
    const seat = mesh(new THREE.BoxGeometry(.55, .04, 1.2), M.main, 0, .3, 0, tr); seat.rotation.x = .08
    const backr = mesh(new THREE.BoxGeometry(.55, .04, .6), M.main, 0, .5, -.75, tr); backr.rotation.x = .9
    ;[[-.25, .5], [.25, .5], [-.25, -.45], [.25, -.45]].forEach(([x, z]) => mesh(new THREE.CylinderGeometry(.02, .02, .3, 6), M.bois, x, .15, z, tr))
    mesh(new THREE.BoxGeometry(.9, .03, .5), std('#f1c27d', 'serviette'), -.2, .02, 1.4, mat).rotation.y = .3
  }
  return { root, dispose() {} }
}

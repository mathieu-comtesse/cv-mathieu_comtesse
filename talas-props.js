/* Accessoires de la forge (tools/forge) pour le Village Talas — script classique, THREE global (r128).
 * Dépend de loadGLB(url) du jeu (ou le reçoit en option) ; même logique que toonFromGLB pour les personnages :
 * chaque maillage s'appelle « piece__role », le rôle donne la couleur, COLOR_0 porte l'ombrage cuit.
 *
 *   await TalasProps.preload(['extincteur','cone'])            // une seule fois
 *   const e = TalasProps.make('extincteur', {rouge_fonce:'#e03131'}, {gradientMap:grad, outline:1.04})
 *   scene.add(e); e.userData.parts.panneau.rotation.z = ...     // pièces animables par leur nom
 */
(function () {
  const V = '?v=1'
  const GLB = {}, ROLES = {}, MATS = {}
  const loader = () => (typeof loadGLB === 'function' ? loadGLB : TalasProps.loadGLB)

  function preload(ids) {
    return Promise.all(ids.map((id) => GLB[id] ? 1 : Promise.all([
      loader()(TalasProps.base + id + '.glb' + V),
      fetch(TalasProps.base + id + '.roles.json' + V).then((r) => r.json()),
    ]).then(([g, r]) => { GLB[id] = g; ROLES[id] = r.roles }).catch((e) => console.warn('prop', id, e))))
  }

  function material(hex, unlit, gradientMap) {
    const k = hex + (unlit ? 'u' : '') + (gradientMap ? 't' : '')
    return MATS[k] || (MATS[k] = unlit ? new THREE.MeshBasicMaterial({ color: hex })
      : gradientMap ? new THREE.MeshToonMaterial({ color: hex, gradientMap, vertexColors: true })
      : new THREE.MeshLambertMaterial({ color: hex, vertexColors: true }))
  }

  /* pal : { role: '#hex' } remplace des couleurs (comme TPAL) ; opts.gradientMap : dégradé toon du jeu ;
     opts.outline : échelle de la coque encre (0 = sans) ; opts.ink : matériau de contour */
  function make(id, pal, opts) {
    const src = GLB[id]; if (!src) return null
    pal = pal || {}; opts = opts || {}
    const roles = ROLES[id] || {}, g = src.clone(true), parts = {}, outs = []
    g.traverse((o) => {
      if (!o.isMesh) { if (o !== g && o.name) parts[o.name] = o; return }
      const role = (o.name.split('__')[1] || '').replace(/\.\d+$/, ''), def = roles[role] || { hex: '#ff00ff' }
      o.material = material(pal[role] || def.hex, def.unlit, opts.gradientMap)
      o.castShadow = o.receiveShadow = true
      if (opts.outline && !def.unlit) outs.push(o)
    })
    const ink = opts.ink || (TalasProps._ink || (TalasProps._ink = new THREE.MeshBasicMaterial({ color: '#2b2233', side: THREE.BackSide })))
    outs.forEach((o) => { const h = new THREE.Mesh(o.geometry, ink); h.scale.setScalar(opts.outline); o.add(h) })
    g.userData.parts = parts; g.userData.prop = id
    return g
  }

  /* palette d'une direction artistique (tools/forge/palettes/*.json) -> { role: couleur } pour make() ;
     gris_clair2 prend la couleur de gris_clair, bleu_nuit3 celle de bleu_nuit, à défaut celle de sa teinte ; lum_* intacts */
  function themePalette(id, pal) {
    const out = {}, map = (pal && pal.roles) || pal || {}
    Object.keys(ROLES[id] || {}).forEach((role) => {
      if (role.startsWith('lum_')) return
      const fam = role.replace(/\d+$/, ''), hue = fam.split('_')[0]
      if (map[fam] || map[hue]) out[role] = map[fam] || map[hue]
    })
    return out
  }

  window.TalasProps = { preload, make, themePalette, roles: (id) => ROLES[id], loaded: (id) => !!GLB[id], loadGLB: null, base: 'assets/talas/props/' }
})()

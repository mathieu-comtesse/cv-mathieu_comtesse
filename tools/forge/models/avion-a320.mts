/* A320 aux couleurs de Talas Aéronautique, procédural. createModel(params, THREE).
 * Avant vers +Z, mètres de maquette (le jeu le met à l'échelle de la piste).
 * Pièces : corps (fuselage, ailes, empennage), train_avant, train_principal (rentrent au décollage en jeu),
 *          soufflante_g, soufflante_d (tournent), feux (rôle lumineux : feux de navigation et anticollision).
 * Livrée : fuselage blanc, ventre et dérive bleu Talas, liseré jaune, logo « T » sur la dérive. */
export function createModel(params: any = {}, THREE: any) {
  const L = params.longueur ?? 8.2, R = .46
  const col = (hex: string, name: string, emissive?: string) => { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), name }); if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = 1 } return m }
  const M = {
    blanc: col('#f8f9fa', 'blanc'), bleu: col('#2f6fd6', 'bleu'), jaune: col('#ffd43b', 'jaune'), gris: col('#adb5bd', 'gris'),
    metal: col('#6c757d', 'metal'), noir: col('#1f2330', 'vitrage'), pneu: col('#2b2b2b', 'pneu'), rouge: col('#e03131', 'feu_rouge', '#ff2b2b'), vert: col('#2fb344', 'feu_vert', '#2bff5a'),
    flash: col('#ffffff', 'feu_blanc', '#ffffff'), cone: col('#dfe3e8', 'radome'),
  }
  const mesh = (g: any, m: any, p: any, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p.add(o); return o }
  /* symétrie gauche/droite : un miroir inverse l'ordre des sommets, on le rétablit sinon les faces regardent vers l'intérieur */
  const mirrorX = (geo: any) => {
    geo.scale(-1, 1, 1)
    if (geo.index) { const a = geo.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t } geo.index.needsUpdate = true }
    else for (const k of Object.keys(geo.attributes)) { const at = geo.attributes[k], n = at.itemSize, a = at.array; for (let i = 0; i < at.count; i += 3) for (let c = 0; c < n; c++) { const t = a[(i + 1) * n + c]; a[(i + 1) * n + c] = a[(i + 2) * n + c]; a[(i + 2) * n + c] = t } at.needsUpdate = true }
    geo.computeVertexNormals(); return geo
  }
  const root = new THREE.Group(); root.name = 'A320 Talas'
  const corps = new THREE.Group(); corps.name = 'corps'; root.add(corps)
  const H = 1.25 // hauteur de l'axe du fuselage au-dessus du sol (train sorti)

  /* ---------- fuselage : profil tourné, cône de queue relevé ---------- */
  const zN = L * .5, zT = -L * .5
  const radius = (z: number) => {
    const u = (z - zT) / L // 0 queue -> 1 nez
    if (u > .9) { const k = (u - .9) / .1; return R * Math.sqrt(Math.max(0, 1 - k * k * .96)) } // nez en ogive
    if (u < .26) { const k = u / .26; return R * (.16 + .84 * Math.sin(k * Math.PI / 2)) } // cône de queue
    return R
  }
  const lift = (z: number) => { const u = (z - zT) / L; return u < .26 ? (1 - u / .26) ** 2 * R * .55 : 0 } // la queue remonte
  const fuse = (r0: number, zFrom = zT, zTo = zN, seg = 64, thetaStart = 0, thetaLen = Math.PI * 2) => {
    const pts: any[] = []; for (let i = 0; i <= seg; i++) { const z = zFrom + (zTo - zFrom) * i / seg; pts.push(new THREE.Vector2(Math.max(.001, radius(z) + r0), z)) }
    const g = new THREE.LatheGeometry(pts, 40, thetaStart, thetaLen)
    const p = g.attributes.position // lathe autour de Y : Y = axe long -> on bascule vers Z et on relève la queue
    // (x,y,z) -> (-x, z, y) : rotation (déterminant +1), l'orientation des faces reste vers l'extérieur
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, -x, z + lift(y), y) }
    g.computeVertexNormals(); return g
  }
  mesh(fuse(0), M.blanc, corps, 0, H, 0)
  // ventre bleu : demi-coque inférieure décollée de 4 mm
  mesh(fuse(.004, zT + .9, zN - .6, 48, Math.PI * .62, Math.PI * .76), M.bleu, corps, 0, H, 0)
  // liseré jaune le long de la ligne des hublots, de chaque côté
  ;[1, -1].forEach((s) => { const st = mesh(fuse(.006, zT + 1.5, zN - .9, 40, s > 0 ? Math.PI * .44 : Math.PI * 1.5, Math.PI * .06), M.jaune, corps, 0, H - .11, 0) })
  mesh(new THREE.SphereGeometry(.12, 12, 8), M.cone, corps, 0, H - .02, zN - .07).scale.set(1, .9, .5) // pointe de radôme

  /* hublots et portes */
  // hublots : vitres plates sombres posées 4 mm au-dessus de la peau (lisibles de loin, pas d'anneau de contour)
  for (let z = zT + 2.3; z < zN - 1.1; z += .19) [1, -1].forEach((s) => mesh(new THREE.BoxGeometry(.01, .065, .05), M.noir, corps, s * (R + .004), H + .1, z))
  ;[[zN - .95, 1], [zN - .95, -1], [zT + 2.05, 1], [zT + 2.05, -1]].forEach(([z, s]) => {
    const d = mesh(new THREE.BoxGeometry(.012, .42, .2), M.gris, corps, s * (R + .002), H + .02, z)
    mesh(new THREE.BoxGeometry(.014, .38, .16), M.blanc, corps, s * (R + .003), H + .02, z)
  })
  // pare-brise : quatre vitres inclinées
  ;[-.17, -.06, .06, .17].forEach((x, i) => { const w = mesh(new THREE.BoxGeometry(.1, .1, .02), M.noir, corps, x, H + .2, zN - .5 + Math.abs(x) * -.35); w.rotation.set(-.9, x * 2.2, 0) })

  /* ---------- ailes en flèche, dièdre, sharklets ---------- */
  const planform = (root: number, tip: number, span: number, sweep: number) => {
    const s = new THREE.Shape(); s.moveTo(0, root * .5); s.lineTo(span, root * .5 - span * Math.tan(sweep)); s.lineTo(span, root * .5 - span * Math.tan(sweep) - tip); s.lineTo(0, -root * .5); s.closePath(); return s
  }
  const wing = (side: number) => {
    const g = new THREE.Group(); g.position.set(side * R * .7, H - .22, -.2); g.rotation.z = side * .09; corps.add(g)
    const geo = new THREE.ExtrudeGeometry(planform(1.5, .45, 3.5, .45), { depth: .09, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 })
    geo.rotateX(Math.PI / 2); geo.translate(0, .06, 0); if (side < 0) mirrorX(geo)
    mesh(geo, M.blanc, g)
    const tipZ = .75 - 3.5 * Math.tan(.45), sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.42, .1); sh.lineTo(.42, -.05); sh.lineTo(0, -.4); sh.closePath()
    const winglet = mesh(new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: false }), M.bleu, g, side * 3.5, .05, tipZ - .1)
    winglet.rotation.set(0, Math.PI / 2, Math.PI / 2 - side * .25)
    mesh(new THREE.SphereGeometry(.04, 8, 6), side > 0 ? M.vert : M.rouge, g, side * 3.52, .08, tipZ - .3) // feu de navigation
    // volets : bande grise qui épouse le bord de fuite, posée 6 mm au-dessus de l'extrados (les anciennes barres dépassaient de l'aile)
    const tipT = .75 - 3.5 * Math.tan(.45) - .45, trail = (x: number) => -.75 + (tipT + .75) * x / 3.5 // bord de fuite (plan de l'aile)
    const te = new THREE.Shape(); te.moveTo(.35, trail(.35) + .02); te.lineTo(3.2, trail(3.2) + .02); te.lineTo(3.2, trail(3.2) + .13); te.lineTo(.35, trail(.35) + .13); te.closePath()
    const tg = new THREE.ExtrudeGeometry(te, { depth: .012, bevelEnabled: false }); tg.rotateX(Math.PI / 2); tg.translate(0, .108, 0); if (side < 0) mirrorX(tg)
    mesh(tg, M.gris, g)
    return g
  }
  const wl = wing(1), wr = wing(-1)

  /* ---------- réacteurs sous les ailes ---------- */
  const engine = (side: number) => {
    const g = new THREE.Group(); g.position.set(side * 1.35, H - .62, .55); corps.add(g)
    const prof = [[.2, -.55], [.26, -.45], [.28, 0], [.27, .35], [.24, .5], [.21, .52]].map(([r, z]) => new THREE.Vector2(r, z))
    const nac = new THREE.LatheGeometry(prof, 28); nac.rotateX(Math.PI / 2); mesh(nac, M.blanc, g)
    const lip = new THREE.TorusGeometry(.215, .025, 8, 28); mesh(lip, M.metal, g, 0, 0, .51)
    mesh(new THREE.CircleGeometry(.205, 28), M.noir, g, 0, 0, .44)
    const fan = new THREE.Group(); fan.name = side > 0 ? 'soufflante_g' : 'soufflante_d'; fan.position.set(side * 1.35, H - .62, .55 + .445); root.add(fan)
    for (let i = 0; i < 12; i++) { const b = mesh(new THREE.BoxGeometry(.03, .19, .006), M.metal, fan, 0, 0, 0); b.rotation.z = i * Math.PI / 6; b.geometry.translate(0, .1, 0) }
    const sp = new THREE.ConeGeometry(.06, .12, 16); sp.rotateX(Math.PI / 2); mesh(sp, M.gris, fan, 0, 0, .05)
    mesh(new THREE.BoxGeometry(.08, .3, .7), M.blanc, g, 0, .28, .05) // mât
    const tuy = new THREE.CylinderGeometry(.12, .15, .25, 20, 1, true); tuy.rotateX(Math.PI / 2); mesh(tuy, M.metal, g, 0, 0, -.62)
  }
  engine(1); engine(-1)

  /* ---------- empennage ---------- */
  const tailZ = zT + .55, tailY = H + lift(tailZ) + .05
  ;[1, -1].forEach((side) => {
    const geo = new THREE.ExtrudeGeometry(planform(.8, .3, 1.35, .6), { depth: .05, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1 })
    geo.rotateX(Math.PI / 2); if (side < 0) mirrorX(geo)
    const h = mesh(geo, M.blanc, corps, side * .1, tailY - .05, tailZ + .05); h.rotation.z = side * .12
  })
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(1.3, 0); fin.lineTo(.55 - 1.45 * .75 + 1.25, 1.55); fin.lineTo(.2 + .4, 1.55); fin.closePath()
  const fg = new THREE.ExtrudeGeometry(fin, { depth: .06, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 1 })
  fg.rotateY(-Math.PI / 2); fg.translate(.03, 0, 0)
  const finM = mesh(fg, M.bleu, corps, 0, tailY + .15, tailZ + 1.1); finM.rotation.y = Math.PI
  // logo : disque jaune et « T » blanc des deux côtés de la dérive (décollés de 5 mm)
  ;[1, -1].forEach((s) => {
    const disc = mesh(new THREE.CircleGeometry(.3, 28), M.jaune, corps, s * .065, tailY + .95, tailZ + .15); disc.rotation.y = s * Math.PI / 2
    const t1 = mesh(new THREE.BoxGeometry(.006, .06, .34), M.blanc, corps, s * .07, tailY + 1.08, tailZ + .15)
    const t2 = mesh(new THREE.BoxGeometry(.006, .3, .07), M.blanc, corps, s * .07, tailY + .9, tailZ + .15)
  })

  /* ---------- train d'atterrissage ---------- */
  const wheel = (p: any, x: number, y: number, z: number, r = .13) => { const w = new THREE.CylinderGeometry(r, r, .09, 16); w.rotateZ(Math.PI / 2); mesh(w, M.pneu, p, x, y, z); const h = new THREE.CylinderGeometry(r * .45, r * .45, .1, 12); h.rotateZ(Math.PI / 2); mesh(h, M.gris, p, x, y, z) }
  const nose = new THREE.Group(); nose.name = 'train_avant'; nose.position.set(0, H - .35, zN - 1.25); root.add(nose)
  mesh(new THREE.CylinderGeometry(.03, .03, .62, 8), M.metal, nose, 0, -.31, 0)
  ;[-.07, .07].forEach((x) => wheel(nose, x, -.62 + .11, 0, .11))
  const main = new THREE.Group(); main.name = 'train_principal'; main.position.set(0, H - .4, -.55); root.add(main)
  ;[1, -1].forEach((s) => {
    mesh(new THREE.CylinderGeometry(.045, .045, .72, 8), M.metal, main, s * .95, -.26, 0)
    ;[-.08, .08].forEach((dx) => wheel(main, s * .95 + dx * 1.3, -.72 + .13, 0))
  })
  /* feux : anticollision rouge sur le dos, strobe blanc en queue */
  const feux = new THREE.Group(); feux.name = 'feux'; root.add(feux)
  mesh(new THREE.SphereGeometry(.05, 8, 6), M.rouge, feux, 0, H + R + .02, .2)
  mesh(new THREE.SphereGeometry(.05, 8, 6), M.rouge, feux, 0, H - R - .02, -.3)
  mesh(new THREE.SphereGeometry(.04, 8, 6), M.flash, feux, 0, H + lift(zT) + .02, zT - .02)
  return { root, dispose() {} }
}

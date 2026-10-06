/* LE JARDIN ZEN DU QUAI DE TALAS : sur la grande terrasse en planches du centre (entre l'escalier de la place et celui du manoir), un jardin sec
 * (karesansui) : sable ratissé en lignes droites qui contournent des rochers en ronds concentriques, cadre de poutres sombres, clôture de bambou,
 * deux bonsaïs en jardinières de pierre, lanterne de pierre (elle s'allume la nuit comme les autres), bassin à ablutions avec son shishi-odoshi
 * (le tube de bambou qui se remplit, bascule et claque), pétales qui tombent. Autour : trois bancs de bois où Dylan peut s'asseoir (E, et E ou une
 * direction pour se relever ; la pose est celle de la bibliothèque Quaternius « Sitting_Idle_Loop »).
 * Prolonge talas-quai-decor.js (Q.zen(contexte) est appelé après le village) et talas-quai-vie.js (Q.zenAnim, Q.sieges). ?zen=non le retire. */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE, Q = window.TALAS_QUAI
  if (!THREE || !M || !Q || !Q.on) return
  if (/[?&]zen=non/.test(location.search)) return
  const PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const Y = 7.6, GX = -5.8, GZ = -40.75, GW = 4.2, GD = 3.1          // dessus du plancher, centre et dimensions du sable (x vers l'est, z vers le sud)
  Q.sieges = []

  Q.zen = function (c) {
    const { s, MT, LAN, boite, cyl, toon, toonT, haloMat } = c
    const R = M.alea(20261005), ombre = (m) => { m.castShadow = true; m.receiveShadow = true; return m }
    Q.sieges.length = 0
    const jardin = new THREE.Group(); jardin.position.set(GX, Y, GZ); s.add(jardin)      // repère du jardin : origine au centre du sable
    const aire = (x, z, hw, hd, h) => Q.obstacles.push({ t: 'b', x, z, hw, hd, ry: 0, y: Y, h: h || .6 })
    const aireC = (x, z, rr) => Q.obstacles.push({ t: 'c', x, z, r: rr, y: Y })

    /* ------------------------------------------------------------ le sable : texture ratissée */
    const PXM = 240, cw = Math.round(GW * PXM), ch = Math.round(GD * PXM), pas = .072 * PXM
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch
    const g = cv.getContext('2d')
    g.fillStyle = '#e9dec3'; g.fillRect(0, 0, cw, ch)
    for (let i = 0; i < 14000; i++) { const t = R(); g.fillStyle = t < .5 ? 'rgba(255,250,236,.55)' : 'rgba(176,160,124,.28)'; g.fillRect(R() * cw, R() * ch, 1 + R() * 1.6, 1 + R() * 1.2) }
    const GROUPES = [   // rochers : centre (m, repère du jardin), rayon d'emprise des ronds
      { x: -1.05, z: .12, rr: .62, n: 5 }, { x: .95, z: -.62, rr: .42, n: 4 }, { x: 1.38, z: .8, rr: .3, n: 3 }
    ]
    const dansZone = (px, py) => { for (const q of GROUPES) { const cx = (q.x / GW + .5) * cw, cy = (q.z / GD + .5) * ch; if (Math.hypot(px - cx, py - cy) < (q.rr + q.n * .072 + .06) * PXM) return true } return false }
    const trait = (fn, sombre, clair) => { g.lineCap = 'round'; g.strokeStyle = sombre; g.lineWidth = 2.6; fn(0); g.stroke(); g.strokeStyle = clair; g.lineWidth = 1.5; fn(1.7); g.stroke() }
    for (let y = pas * .6; y < ch - 2; y += pas) {            // lignes droites, interrompues autour des groupes de rochers
      for (const [dec, col, lw] of [[0, 'rgba(160,141,104,.75)', 2.6], [1.8, 'rgba(255,252,240,.95)', 1.5]]) {
        g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); let ouvert = false
        for (let x = 2; x < cw - 1; x += 3) {
          const yy = y + dec + Math.sin(x * .05 + y) * .5
          if (dansZone(x, yy)) { ouvert = false; continue }
          if (!ouvert) { g.moveTo(x, yy); ouvert = true } else g.lineTo(x, yy)
        }
        g.stroke()
      }
    }
    for (const q of GROUPES) {                                // ronds concentriques autour des rochers
      const cx = (q.x / GW + .5) * cw, cy = (q.z / GD + .5) * ch
      for (let k = 0; k < q.n; k++) {
        const rad = (q.rr - .1 + k * .072) * PXM
        for (const [dec, col, lw] of [[0, 'rgba(160,141,104,.75)', 2.6], [1.8, 'rgba(255,252,240,.95)', 1.5]]) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(cx + dec * .4, cy + dec * .4, rad, 0, PI * 2); g.stroke() }
      }
    }
    g.strokeStyle = 'rgba(120,102,70,.5)'; g.lineWidth = 6; g.strokeRect(0, 0, cw, ch)
    const tSable = new THREE.CanvasTexture(cv); tSable.anisotropy = 4
    const cote = toon('#cdbf9f')
    const sable = new THREE.Mesh(new THREE.BoxBufferGeometry(GW, .13, GD), [cote, cote, toonT(tSable), cote, cote, cote]); sable.position.y = .065; sable.receiveShadow = true; jardin.add(sable)

    /* ------------------------------------------------------------ cadre de poutres sombres, avec angles */
    boite(GW + .44, .22, .2, MT.boisSombre, 0, .11, -(GD / 2 + .1), jardin, 1); boite(GW + .44, .22, .2, MT.boisSombre, 0, .11, GD / 2 + .1, jardin, 1)
    boite(.2, .22, GD, MT.boisSombre, -(GW / 2 + .1), .11, 0, jardin, 1); boite(.2, .22, GD, MT.boisSombre, GW / 2 + .1, .11, 0, jardin, 1)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) boite(.24, .26, .24, MT.bois, sx * (GW / 2 + .1), .13, sz * (GD / 2 + .1), jardin, 1)
    aire(GX, GZ, GW / 2 + .22, GD / 2 + .22, .5)

    /* ------------------------------------------------------------ rochers (blocs bruités, mousse sur le dessus) */
    const rocher = (x, z, sx, sy, sz, ry, graine) => {
      const geo = new THREE.IcosahedronBufferGeometry(1, 2), p = geo.attributes.position, v = V3(0, 0, 0)
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = M.fbm2(v.x * 1.6 + graine, v.z * 1.6 + v.y * 1.3 + graine * .7); v.multiplyScalar(.82 + n * .42); if (v.y < -.35) v.y = -.35 + (v.y + .35) * .25; p.setXYZ(i, v.x, v.y, v.z) }
      geo.computeVertexNormals()
      const m = ombre(new THREE.Mesh(geo, MT.pierre)); m.scale.set(sx, sy, sz); m.position.set(x, .12 + sy * .22, z); m.rotation.y = ry; jardin.add(m)
      const cap = ombre(new THREE.Mesh(new THREE.IcosahedronBufferGeometry(1, 1), toon('#5f9b3e'))); cap.scale.set(sx * .55, sy * .16, sz * .5); cap.position.set(x + sx * .06, .12 + sy * .22 + sy * .62, z - sz * .04); cap.rotation.y = ry; jardin.add(cap)
      return m
    }
    rocher(-1.05, .12, .62, .5, .5, .4, 3.1); rocher(-.55, -.12, .3, .26, .32, 1.1, 8.7); rocher(-1.4, .52, .22, .2, .24, 2.2, 5.3)
    rocher(.95, -.62, .34, .55, .3, 2.6, 1.9); rocher(1.2, -.4, .2, .18, .2, .5, 7.7)
    rocher(1.38, .8, .26, .22, .24, 1.7, 4.4)

    /* ------------------------------------------------------------ clôture de bambou à l'ouest */
    { const fx = GX - GW / 2 - .95, z0 = GZ - GD / 2 - .55, z1 = GZ + GD / 2 + .55
      const n = Math.round((z1 - z0) / .095), tige = new THREE.CylinderBufferGeometry(.034, .04, 1, 7), im = new THREE.InstancedMesh(tige, toon('#d8c874'), n)
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = V3(0, 0, 0), sc = V3(1, 1, 1), col = new THREE.Color()
      for (let i = 0; i < n; i++) { const h = 1.12 + (R() - .5) * .1; p.set(fx, Y + h / 2, z0 + i * (z1 - z0) / (n - 1)); sc.set(1, h, 1); m4.compose(p, q, sc); im.setMatrixAt(i, m4); im.setColorAt(i, col.setRGB(.9 + R() * .1, .85 + R() * .12, .45 + R() * .15)) }
      im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; s.add(im)
      for (const hy of [.3, .8]) { const t = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.03, .03, z1 - z0 + .1, 6), toon('#5b4030'))); t.rotation.x = PI / 2; t.position.set(fx + .05, Y + hy, (z0 + z1) / 2); s.add(t) }
      aire(fx, (z0 + z1) / 2, .1, (z1 - z0) / 2, 1.2) }

    /* ------------------------------------------------------------ bonsaïs en jardinières de pierre */
    const bonsai = (x, z, teinte, fleurs) => {
      const gp = new THREE.Group(); gp.position.set(x, Y, z); s.add(gp)
      boite(1.0, .32, 1.0, MT.pierre, 0, .16, 0, gp, .8); boite(1.08, .06, 1.08, MT.pierre, 0, .34, 0, gp, .8)
      const terre = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.42, .46, .06, 12), toon('#3e2c24'))); terre.position.y = .36; gp.add(terre)
      const courbe = new THREE.CatmullRomCurve3([V3(0, .36, 0), V3(.08, .7, .04), V3(-.12, 1.0, -.04), V3(.14, 1.28, .06), V3(.3, 1.5, 0)])
      const tronc = ombre(new THREE.Mesh(new THREE.TubeBufferGeometry(courbe, 28, .07, 6), toon('#4a3446'))); gp.add(tronc)
      const pads = [[.32, 1.5, 0, .5, .2], [-.14, 1.12, -.08, .42, .17], [.12, 1.3, .12, .36, .15], [.5, 1.4, -.1, .28, .13]]
      pads.forEach(([px, py, pz, rr, hh], i) => { const m = ombre(new THREE.Mesh(new THREE.IcosahedronBufferGeometry(1, 1), toon(teinte[i % teinte.length]))); m.scale.set(rr, hh, rr * .9); m.position.set(px, py, pz); m.rotation.y = i; gp.add(m) })
      if (fleurs) for (let i = 0; i < 16; i++) { const a = R() * 6.28, d = R() * .5, f = new THREE.Mesh(new THREE.IcosahedronBufferGeometry(.04, 0), toon(fleurs)); f.position.set(.3 + Math.cos(a) * d, 1.5 + (R() - .3) * .2, Math.sin(a) * d * .8); gp.add(f) }
      return gp
    }
    bonsai(GX - GW / 2 - .35, GZ - GD / 2 - 1.12, ['#3f8a4a', '#5aa84a', '#2f7a44'], null)
    bonsai(GX - GW / 2 - .35, GZ + GD / 2 + 1.12, ['#d9532f', '#e8802f', '#c43f2a'], null)
    aire(GX - GW / 2 - .35, GZ - GD / 2 - 1.12, .55, .55, 1.6); aire(GX - GW / 2 - .35, GZ + GD / 2 + 1.12, .55, .55, 1.6)

    /* ------------------------------------------------------------ bassin à ablutions et shishi-odoshi */
    const bx = GX - GW / 2 - .48, bz = GZ
    const bassin = new THREE.Group(); bassin.position.set(bx, Y, bz); s.add(bassin)
    cyl(.3, .34, .34, MT.pierre, 0, .17, 0, bassin, 12); const eau = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.26, .26, .02, 14), new THREE.MeshToonMaterial({ color: '#6fc4d8' }))); eau.position.y = .34; bassin.add(eau)
    boite(.06, .78, .06, MT.boisSombre, -.06, .39, -.34, bassin); boite(.06, .78, .06, MT.boisSombre, -.06, .39, .34, bassin); boite(.07, .07, .74, MT.boisSombre, -.06, .78, 0, bassin)
    const pivot = new THREE.Group(); pivot.position.set(-.06, .78, 0); bassin.add(pivot)
    const tube = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.05, .05, .6, 8), toon('#c9b860'))); tube.rotation.z = PI / 2; tube.position.x = .12; pivot.add(tube)
    const bout = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.046, .046, .01, 8), toon('#4b3a24'))); bout.rotation.z = PI / 2; bout.position.x = -.18; pivot.add(bout)
    const filet = new THREE.Mesh(new THREE.CylinderBufferGeometry(.012, .012, .6, 5), new THREE.MeshBasicMaterial({ color: '#bfeaf5', transparent: true, opacity: .7 })); filet.position.set(.2, 1.02, 0); bassin.add(filet)
    aireC(bx, bz, .42)
    let bascule = { t: R() * 3, etat: 0 }

    /* ------------------------------------------------------------ lanterne de pierre (s'allume la nuit comme les lanternes du quai) */
    { const lx = GX + GW / 2 + .5, lz = GZ + GD / 2 + .62
      const gl = new THREE.Group(); gl.position.set(lx, Y, lz); s.add(gl)
      boite(.62, .1, .62, MT.pierre, 0, .05, 0, gl, 1); cyl(.1, .13, .5, MT.pierre, 0, .35, 0, gl, 8); cyl(.2, .18, .08, MT.pierre, 0, .64, 0, gl, 8)
      const cg = new THREE.MeshBasicMaterial({ color: '#ffd889' }), chambre = new THREE.Mesh(new THREE.BoxBufferGeometry(.26, .26, .26), cg); chambre.position.y = .81; gl.add(chambre)
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) boite(.05, .28, .05, MT.pierre, dx * .14, .81, dz * .14, gl, 1)
      const toit = ombre(new THREE.Mesh(new THREE.ConeBufferGeometry(.34, .2, 4), MT.pierre)); toit.position.y = 1.04; toit.rotation.y = PI / 4; gl.add(toit)
      const bille = ombre(new THREE.Mesh(new THREE.SphereBufferGeometry(.055, 8, 6), MT.pierre)); bille.position.y = 1.18; gl.add(bille)
      const halo = new THREE.Sprite(haloMat('#ffb45a', 0)); halo.scale.setScalar(2.4); halo.position.y = .81; gl.add(halo)
      const wp = V3(lx, Y + .81, lz)
      const mare = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1), new THREE.MeshBasicMaterial({ map: c.HALO, color: '#ff9a3c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); mare.rotation.x = -PI / 2; mare.scale.setScalar(4.2); mare.position.set(lx, Y + .03, lz); mare.renderOrder = 3; s.add(mare)
      LAN.push({ g: gl, pos: wp, coeur: cg, halo, mare, x: lx, z: lz, phase: R() * 6.28, force: 1 })
      aireC(lx, lz, .38) }

    /* ------------------------------------------------------------ bancs autour du sable : on s'y assoit, face au jardin */
    const banc = (cx, cz, ry, long, places) => {   // ry : orientation du banc (l'assise est tournée vers le jardin)
      const gb = new THREE.Group(); gb.position.set(cx, Y, cz); gb.rotation.y = ry; s.add(gb)
      boite(long, .07, .46, MT.boisClair, 0, .44, 0, gb, 1.2); boite(long + .06, .05, .5, MT.bois, 0, .485, 0, gb, 1.2)
      for (const sx of [-1, 1]) { boite(.12, .42, .4, MT.boisSombre, sx * (long / 2 - .2), .21, 0, gb); boite(.07, .07, .5, MT.boisSombre, sx * (long / 2 - .2), .1, 0, gb) }
      boite(long - .5, .06, .06, MT.boisSombre, 0, .24, 0, gb)
      const co = Math.cos(ry), si = Math.sin(ry)
      Q.obstacles.push({ t: 'b', x: cx, z: cz, hw: long / 2 + .06, hd: .3, ry, y: Y, h: .55 })
      const ang = Math.atan2(GX - cx, GZ - cz)
      places.forEach((u) => { const x = cx + co * u, z = cz - si * u, sortie = V3(x - Math.sin(ang) * 1.0, Y, z - Math.cos(ang) * 1.0); Q.sieges.push({ x, y: Y + .5, z, ang: Math.atan2(GX - x, GZ - z) * .35 + ang * .65, sortie, plan: Y }) })
    }
    banc(GX, GZ - GD / 2 - .78, 0, 3.7, [-.95, .95])               // côté nord : assis face au sud
    banc(GX, GZ + GD / 2 + .78, PI, 3.7, [-.95, .95])               // côté sud : assis face au nord
    banc(GX + GW / 2 + .72, GZ, -PI / 2, 2.6, [-.62, .62])        // côté est : face à l'ouest, dos au passage
    { const q = Q.sieges; for (let i = 0; i < q.length; i++) q[i].nom = 'banc ' + (i + 1) }

    /* ------------------------------------------------------------ pétales qui tombent doucement */
    const NP = 70, pp = new Float32Array(NP * 3), pv = []
    for (let i = 0; i < NP; i++) { pp[i * 3] = GX + (R() - .5) * (GW + 1.6); pp[i * 3 + 1] = Y + R() * 3; pp[i * 3 + 2] = GZ + (R() - .5) * (GD + 1.6); pv.push({ v: .14 + R() * .12, ph: R() * 6.28, a: .25 + R() * .3 }) }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3))
    const petales = new THREE.Points(pg, new THREE.PointsMaterial({ size: .09, color: '#ffc2da', transparent: true, opacity: .92, depthWrite: false })); petales.frustumCulled = false; s.add(petales)

    /* ------------------------------------------------------------ animation : shishi-odoshi, pétales */
    Q.zenAnim = function (dt, T, J) {
      const loin = Math.hypot(J.x - GX, J.z - GZ) > 30 || Math.abs(J.y - Y) > 6
      if (loin) return
      bascule.t += dt
      let ang = .32
      if (bascule.etat === 0) { ang = .32 - Math.min(1, bascule.t / 5) * .06; filet.visible = true; if (bascule.t > 5) { bascule.etat = 1; bascule.t = 0 } }
      else if (bascule.etat === 1) { const k = Math.min(1, bascule.t / .35); ang = .26 - k * k * .95; filet.visible = false; if (k >= 1) { bascule.etat = 2; bascule.t = 0; if (window.beep && Math.hypot(J.x - GX, J.z - GZ) < 14) { try { beep(190, .06, 'square', .05); setTimeout(() => beep(150, .05, 'square', .03), 60) } catch (e) {} } } }
      else { const k = Math.min(1, bascule.t / .9); ang = -.69 + k * k * .95; filet.visible = false; if (k >= 1) { bascule.etat = 0; bascule.t = 0 } }
      pivot.rotation.z = ang
      const a = pg.attributes.position.array
      for (let i = 0; i < NP; i++) {
        const p = pv[i]; a[i * 3 + 1] -= p.v * dt; a[i * 3] += Math.sin(T * .8 + p.ph) * p.a * dt; a[i * 3 + 2] += Math.cos(T * .6 + p.ph) * p.a * dt * .6
        if (a[i * 3 + 1] < Y + .14) { a[i * 3] = GX + (R() - .5) * (GW + 1.6); a[i * 3 + 1] = Y + 2.6 + R() * .6; a[i * 3 + 2] = GZ + (R() - .5) * (GD + 1.6) }
      }
      pg.attributes.position.needsUpdate = true
    }
  }
})()

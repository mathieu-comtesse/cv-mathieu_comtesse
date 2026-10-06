/* LE QUAI DE TALAS, partie « vie » : cycle jour / nuit, lumières (lanternes, fenêtres), décor animé (bannières, fumées, bateaux,
 * faisceau du phare), caméra, déplacement de Dylan sur les zones praticables, interactions, HUD. Prolonge talas-quai.js. */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE, Q = window.TALAS_QUAI
  if (!THREE || !M || !Q || !Q.on) return
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a + (b - a) * t

  Q.animer = function (W, ctx) {
    const s = W.scene, N = window.TALAS_NUIT, MT = ctx.MT
    W.t = 0
    const pC = V3(0, 1, 6) // point suivi par l'éclairage et la caméra (le joueur, ou la cible d'une photo)
    const eauU = W.eauU
    let nuitPrec = -1

    /* ---- mares de lumière des lanternes projetées dans la carte de l'eau (reflets orange la nuit) ---- */
    { const g = W.cLuz.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W.cLuz.width, W.cLuz.height)
      W.LAN.forEach((L) => { const px = (L.x - W.CARTE.x0) / W.CARTE.w * W.cLuz.width, pz = (L.z - W.CARTE.z0) / W.CARTE.h * W.cLuz.height, R = 30, gr = g.createRadialGradient(px, pz, 0, px, pz, R); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.globalCompositeOperation = 'lighter'; g.fillRect(px - R, pz - R, R * 2, R * 2) })
      g.globalCompositeOperation = 'source-over'; W.tLuz.needsUpdate = true }

    /* ---- pool de vraies lumières ponctuelles : les plus proches lanternes prêtent leur position ---- */
    const NL = 6, pool = []
    for (let i = 0; i < NL; i++) { const L = new THREE.PointLight('#ffa855', 0, 11, 2); L.position.set(0, -50, 0); s.add(L); pool.push(L) }
    const tri = []

    /* ---- fumées des cheminées ---- */
    const fum = M.particules({ max: 260, scene: s })
    let fumT = 0

    const K = W.k = { pool: .38, halo: .4, mare: .4, bloom: .55, hemi: 1, dir: 1, ampoule: .9 } // réglages d'exposition (outil de mise au point)
    /* ---- cycle jour / nuit ---- */
    function cycle(dt, T) {
      const u = W.heureFixe !== undefined ? W.heureFixe : ((W.heure + W.t / W.cycle) % 1)
      W.u = u
      const e = N.etat(u, 'quai'), x = e.x, S = e.sun, L = e.dayUp ? S : V3(-S.x, -S.y, -S.z), nt = x.night
      W.etat = e
      W.hemi.color.copy(x.hemiC); W.hemi.groundColor.copy(x.hemiG); W.hemi.intensity = x.hemiI * K.hemi
      W.soleil.color.copy(x.dirC); W.soleil.intensity = x.dirI * (e.dayUp ? 1 : .85) * K.dir
      W.soleil.position.copy(pC).addScaledVector(L, 60); W.soleil.target.position.copy(pC)
      const tx = 52 / 2048; W.soleil.position.x = Math.round(W.soleil.position.x / tx) * tx; W.soleil.position.z = Math.round(W.soleil.position.z / tx) * tx
      s.fog.color.copy(x.fog); s.fog.near = mix(75, 36, nt * .7); s.fog.far = mix(310, 200, nt * .6); if (!(s.background && s.background.isColor)) s.background = new THREE.Color(); s.background.copy(x.hor) // les effets météo du jeu (fx) peuvent remplacer le fond par une texture
      N.majCiel(W.ciel, x, S, T); W.ciel.uniforms.uCouv.value = mix(.15, 0, nt); W.ciel.uniforms.uEp.value = mix(.9, 1.3, nt)
      eauU.uT.value = T; eauU.uSun.value.copy(L); eauU.uSunC.value.copy(x.sun).multiplyScalar(e.dayUp ? 1 : .5); eauU.uSkyT.value.copy(x.zen); eauU.uSkyH.value.copy(x.hor)
      eauU.uDeep.value.copy(x.mer[1]).multiplyScalar(mix(.7, .9, nt)); eauU.uShal.value.copy(x.mer[0]).lerp(x.mer[2], .1); eauU.uNuit.value = nt
      M.brume(s)
      W.rendu = { bloom: mix(.24, .55, nt) * K.bloom, seuil: mix(.9, .72, nt), vignette: mix(.22, .42, nt), exp: mix(1, .97, nt), contraste: mix(1.08, 1.16, nt), sat: mix(1.14, 1.2, nt), dof: W.dofForce === undefined ? mix(.5, .35, nt) : W.dofForce,
        ombre: [mix(.9, .8, nt), mix(.95, .9, nt), mix(1.16, 1.3, nt)], lumiere: [mix(1.07, 1.12, nt), 1, mix(.9, .82, nt)], split: mix(.55, .72, nt), rimCouleur: nt > .5 ? '#8f86ff' : '#ffe6b8', focus: W.focus }
      // fenêtres : reflets du ciel le jour, lumière chaude la nuit
      const nuitF = nt > .42 ? 1 : 0; if (nuitF !== nuitPrec) { nuitPrec = nuitF; MT.vitre.map = nuitF ? MT.vitreN.map : MT.vitreJ.map; MT.vitre.color.set(nuitF ? '#ffffff' : '#c8d6e4'); MT.vitre.needsUpdate = true }
      // lanternes : lueur, mares de lumière, vraies lumières pour les plus proches
      const g = clamp((nt - .18) / .5, 0, 1)
      W.LAN.forEach((Ln) => {
        const fl = .9 + .1 * Math.sin(T * 6.3 + Ln.phase) + .04 * Math.sin(T * 17 + Ln.phase * 2), k = g * fl * Ln.force
        const dc = camera.position.distanceTo(Ln.pos), pres = Math.max(.12, Math.min(1, (dc - 1.6) / 5)); if (!Ln.halo.userData.s0) Ln.halo.userData.s0 = Ln.halo.scale.x; Ln.halo.scale.setScalar(Ln.halo.userData.s0 * (.45 + .55 * pres))
        Ln.halo.material.opacity = (.05 + k * .85) * pres * K.halo; Ln.halo.visible = true; Ln.coeur.color.setRGB(mix(.75, 1, g) * 1.0, mix(.6, .85, g), mix(.35, .55, g)).multiplyScalar(mix(.7, 1.5, g))
        if (Ln.mare) Ln.mare.material.opacity = k * .34 * K.mare
      })
      if (nt > .12) {
        tri.length = 0; W.LAN.forEach((Ln) => { tri.push([(Ln.x - pC.x) ** 2 + (Ln.z - pC.z) ** 2, Ln]) }); tri.sort((a, b) => a[0] - b[0])
        pool.forEach((pl, i) => { const Ln = tri[i] && tri[i][1]; if (Ln && tri[i][0] < 900) { pl.position.copy(Ln.pos); pl.intensity = g * 1.25 * K.pool * (.92 + .08 * Math.sin(T * 6 + Ln.phase)) } else pl.intensity = 0 })
      } else pool.forEach((pl) => (pl.intensity = 0))
      if (Q._salon) Q._salon.intensity = mix(.25, 1.7, g)
      if (window.TALAS_SON) TALAS_SON.nuit(nt)
      if (Q._ampoulesMat) { const u = Q._ampoulesMat.uniforms; u.uNuit.value = g * K.ampoule; u.uT.value = T; u.uScale.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan(camera.fov * Math.PI / 360)) }
      // phare : faisceau et halo
      if (Q._faisceau) { Q._faisceau.pivot.rotation.y = T * .55; Q._faisceau.mat.opacity = .05 + g * .22 * (.6 + .4 * Math.pow(Math.max(0, Math.sin(T * .55)), 2)); Q._phareCoeur.color.setRGB(1, mix(.85, .93, g), mix(.55, .68, g)).multiplyScalar(mix(1, 1.6, g)); Q._phareHalo.material.opacity = .1 + g * .8 }
      if (ctx.onair) ctx.onair.material.color.set(g > .3 && Math.sin(T * 2.2) > -.2 ? '#ff3a2a' : '#5a1a1a')
      return x
    }

    /* ---- animations du décor ---- */
    const smokeTmp = V3(0, 0, 0)
    function decor(dt, T) {
      // bannières : le vent (le même bruit que l'herbe et la fumée) les fait ondoyer
      ;(Q._BAN || []).forEach((b) => { const p = b.geo.attributes.position, a = p.array; for (let i = 0; i < p.count; i++) { const bx = b.base[i * 3], by = b.base[i * 3 + 1], k = (0.5 - by / 2.4) ; const w = M.vent(bx + b.ph, T * .3, T)[0]; a[i * 3 + 2] = Math.sin(T * 2.4 + bx * 2.2 + by * 1.1 + b.ph) * b.amp * Math.max(0, Math.min(1, .5 - by * .2)) * (.6 + w * .4); a[i * 3 + 1] = by - Math.abs(a[i * 3 + 2]) * .15 } p.needsUpdate = true; b.geo.computeVertexNormals() })
      // bateaux
      ;(Q._bateaux || []).forEach((b) => { b.g.position.y = (b.baseY || 0) + Math.sin(T * 1.1 + b.ph) * .025; b.g.rotation.z = Math.sin(T * .9 + b.ph) * .009; b.g.rotation.x = Math.sin(T * .7 + b.ph * 1.3) * .006 })
      // girouette
      if (ctx.girouette) ctx.girouette.rotation.y = Math.sin(T * .4) * 1.2 + 1.2
      // fumée des cheminées
      fumT -= dt
      if (fumT <= 0 && Q._fumees) { fumT = .28; Q._fumees.forEach((f) => { f.g.updateMatrixWorld(true); f.g.localToWorld(smokeTmp.set(f.x, f.y, f.z)); const nt = W.etat ? W.etat.x.night : 0
        fum.emettre({ pos: [smokeTmp.x + (Math.random() - .5) * .2, smokeTmp.y, smokeTmp.z + (Math.random() - .5) * .2], vel: [0, .9 + Math.random() * .4, 0], t0: .5, t1: 2.4, c0: nt > .4 ? '#8a80b8' : '#efe9f4', c1: nt > .4 ? '#5a5090' : '#c9c2d8', a0: .5, a1: 0, vie: 5 + Math.random() * 2, grav: .05, vent: 1 }) }) }
      if (W.etat) { const cl = W.scene.userData.__cle; fum.lumiere(camera, W.soleil.position.clone().sub(W.soleil.target.position), W.soleil.color.clone().multiplyScalar(W.soleil.intensity * .7), W.hemi.color.clone().multiplyScalar(W.hemi.intensity * .55), W.etat.x.night > .5 ? new THREE.Color('#5a4cc0') : new THREE.Color('#ffd9a0')) }
      fum.maj(dt, T, camera)
    }

    /* ---- caméra ---- */
    const camP = V3(0, 6, 30), camL = V3(0, 2, 0)
    W.cam = function (dt) {
      if (W.photo) { camera.position.copy(W.photo.pos); camera.lookAt(W.photo.look); if (W.photo.fov && camera.fov !== W.photo.fov) { camera.fov = W.photo.fov; camera.updateProjectionMatrix() } W.focus = camera.position.distanceTo(W.photo.look); cielSuit(); return }
      camera.position.copy(camP); camera.lookAt(camL); W.focus = camera.position.distanceTo(camL); cielSuit()
    }
    W.cielMesh = s.children.find((o) => o.material === W.ciel)
    function cielSuit() { if (W.cielMesh) W.cielMesh.position.copy(camera.position); W.eau.position.set(0, 0, 0) }

    /* ================================================================ LE JOUEUR : Dylan, Boulon, déplacement, interactions */
    const J = { x: 0, y: ctx.DECK, z: 15.6, ang: Math.PI, vit: 0, courir: 0, proche: -1 }
    W.joueur = J
    const KE = { shift: 0 }
    addEventListener('keydown', (e) => { if (e.key === 'Shift') KE.shift = 1 }); addEventListener('keyup', (e) => { if (e.key === 'Shift') KE.shift = 0 })
    const PAL_DYLAN = { skin: '#dca070', nose: '#c98a5c', shirt: '#efe4c8', sleeve: '#e8681c', vest: '#e8681c', stripe: '#f2e6c4', pants: '#5fa4d0', belt: '#3a2210', shoe: '#28284c', sole: '#efe0b8', hair: '#2e1c12', hat: '#dba02a', white: '#ffffff', pupil: '#1c1a2a', mouth: '#6a2418', stubble: '#c99472' }
    let dylan = null, perso = false
    if (window.TALAS_PERSO && TALAS_PERSO.on) { dylan = TALAS_PERSO.creer('dylan', { echelle: .82 }); perso = !!dylan }   // le vrai modèle skinné, animé par la bibliothèque Quaternius
    if (!dylan) { try { dylan = typeof toonFromGLB === 'function' ? toonFromGLB('dylan', PAL_DYLAN, .72) : null } catch (e) { dylan = null }
      if (!dylan) dylan = makeDylan()
      else if (window.TALAS_DA && TALAS_DA.on && TALAS_DA.cartoon) dylan = TALAS_DA.cartoon(dylan, 'dylan') }
    dylan.position.set(J.x, J.y, J.z); dylan.rotation.y = J.ang; s.add(dylan); dylan.traverse((o) => { if (o.isMesh && !o.userData.ink) o.castShadow = true })
    W.dylan = dylan
    if (Q.pnj) { try { Q.pnj(W, ctx, J) } catch (e) { console.warn('[pnj]', e.message) } }   // les habitants du quai (talas-quai-pnj.js)
    const bo = makeBoulon(); bo.scale.setScalar(.5); bo.position.set(J.x + 1.4, J.y + 1.3, J.z - 1.2); s.add(bo); W.boulon = bo; const boP = V3(J.x + 1.4, J.y + 1.3, J.z - 1.2)
    const fx = makeFX(s); W.fx = fx
    const pous = M.particules({ max: 120, scene: s })
    // hydravion d'arrivée : sert à la fin du jeu (décollage), comme l'avion de l'ancienne île
    { const pl = new THREE.Group(); pl.position.set(6.4, .55, 15.2); pl.rotation.y = -Math.PI / 2; s.add(pl)
      const PR = window.TalasProps, forge = PR && PR.loaded('hydravion')
      if (forge) {   // modèle de la forge (embarcations.mts) : nez vers +z du modèle -> +x du groupe, pour que le tangage du décollage (rotation.z) reste un tangage
        pl.position.set(8.0, 0, 15.2)
        const mod = PR.make('hydravion', null, { gradientMap: grad, outline: 1.03 }); mod.rotation.y = Math.PI / 2; mod.position.y = -.3; pl.add(mod)
        Q._helice = mod.userData.parts.helice; Q._heliceForge = true
        pl.userData.home = pl.position.clone(); pl.userData.dir = V3(0, 0, 1); W.plane = pl; Q._hydravion = pl
      } else {
      const blanc = ctx.toon('#efe7d4'), rouge = ctx.toon('#c8352a'), orange = ctx.toon('#f08c00')
      const fus = ctx.ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.5, .32, 5.2, 12), blanc)); fus.rotation.z = Math.PI / 2; fus.position.y = 1.5; pl.add(fus)
      const nez = ctx.ombre(new THREE.Mesh(new THREE.SphereBufferGeometry(.5, 12, 8), rouge)); nez.position.set(2.6, 1.5, 0); pl.add(nez)
      ctx.boite(.6, .06, 7.2, orange, .3, 2.1, 0, pl); ctx.boite(.8, .06, 2.6, orange, -2.4, 1.7, 0, pl); ctx.boite(.06, .9, .5, rouge, -2.5, 2.1, 0, pl)
      ;[-1, 1].forEach((q) => { ctx.boite(3.6, .18, .22, ctx.toon('#3a3542'), .3, .35, q * 1.5, pl); ctx.boite(.1, 1.2, .1, ctx.toon('#3a3542'), 1.2, 1.0, q * 1.5, pl); ctx.boite(.1, 1.2, .1, ctx.toon('#3a3542'), -.6, 1.0, q * 1.5, pl) })
      const helice = ctx.boite(.06, 1.6, .16, ctx.toon('#2b1c24'), 3.15, 1.5, 0, pl); Q._helice = helice
      const cabine = new THREE.Mesh(new THREE.BoxBufferGeometry(1.1, .5, .8), ctx.MT.vitre); cabine.position.set(.9, 2.0, 0); pl.add(cabine)
      pl.userData.home = pl.position.clone(); pl.userData.dir = V3(0, 0, 1); W.plane = pl; Q._hydravion = pl }
    }

    /* le fantôme de Talas rôde la nuit au-dessus de la jetée, devant la boutique : même drap simulé que dans le grenier */
    let gQ = null; const fumG = M.particules({ max: 170, scene: s }); let fumGT = 0; const gCible = V3(-1, 3.5, 4)
    if (window.TALAS_FANTOME && TALAS_FANTOME.creer) { gQ = TALAS_FANTOME.creer(); gQ.scale.setScalar(.01); gQ.visible = false; gQ.position.copy(gCible); s.add(gQ); W.fantomeQuai = gQ }
    function fantomeQuai(dt, T) {
      if (!gQ) return
      const nuit = W.etat ? W.etat.x.night : 0, veut = nuit > .45 && !busy && !W.photoSansFantome ? .72 : 0
      const kb = gQ.userData.kb === undefined ? gQ.scale.x : gQ.userData.kb, k = kb + (veut - kb) * Math.min(1, dt * 1.4); gQ.userData.kb = k; gQ.scale.setScalar(Math.max(.01, k)); gQ.visible = k > .04   // kb : échelle de base (l'étirement ci-dessous ne doit pas s'accumuler)
      if (!gQ.visible) return
      const a = T * .36; gCible.set(-.6 + Math.sin(a) * 2.6, 3.7 + Math.sin(T * 1.1) * .3, 3.5 + Math.sin(a * 2) * 3.6)
      const px0 = gQ.position.x, py0 = gQ.position.y, pz0 = gQ.position.z
      gQ.position.lerp(gCible, Math.min(1, dt * 1.8))
      { const vit = Math.hypot(gQ.position.x - px0, gQ.position.y - py0, gQ.position.z - pz0) / Math.max(dt, .001), lis = (gQ.userData.etire || 0) + (Math.min(.16, vit * .05) - (gQ.userData.etire || 0)) * Math.min(1, dt * 5)
        gQ.userData.etire = lis; gQ.scale.set(k * (1 - lis * .5), k * (1 + lis), k * (1 - lis * .5)) }   // plus il file, plus il s'étire ; à l'arrêt il reprend sa forme
      const U = gQ.userData, face = Math.atan2(J.x - gQ.position.x, J.z - gQ.position.z)
      let d = face - gQ.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; gQ.rotation.y += d * Math.min(1, dt * 2)
      U.b.rotation.z = Math.sin(T * 1.7) * .1; U.hands.forEach((h, i) => { h.rotation.z = Math.sin(T * 2.4 + i * Math.PI) * .4 + (i ? -1 : 1) * .25 })
      U.eyes.forEach((p, i) => { p.position.x = (i ? .36 : -.36) + Math.max(-1, Math.min(1, (J.x - gQ.position.x) / 8)) * .08; p.position.y = .72 })
      U.tick(dt, T)
      fumGT -= dt; if (fumGT <= 0 && k > .3) { fumGT = .08
        const q = U.queue(); fumG.emettre({ pos: [q.x + (Math.random() - .5) * .4, q.y + .1, q.z + (Math.random() - .5) * .4], vel: [(Math.random() - .5) * .4, .3 + Math.random() * .3, (Math.random() - .5) * .4], t0: .6, t1: 2.4, c0: '#46f0c0', c1: '#5b3cc8', a0: .3, a1: 0, vie: 2.6, add: .3, grav: .05, vent: 1 })
        fumG.emettre({ pos: [gQ.position.x + (Math.random() - .5) * 3, DECKG + .2 + Math.random() * .4, gQ.position.z + (Math.random() - .5) * 3], vel: [(Math.random() - .5) * .3, .03, (Math.random() - .5) * .3], t0: 2.4, t1: 5, c0: '#57f0d0', c1: '#7a54d8', a0: .26, a1: 0, vie: 5, add: .1, vent: .4 }) }
      fumG.lumiere(camera, W.soleil.position.clone().sub(W.soleil.target.position), new THREE.Color('#8fa0ff').multiplyScalar(.5), new THREE.Color('#6a58c0'), new THREE.Color('#3dffc4')); fumG.maj(dt, T, camera)
    }
    const DECKG = ctx.DECK
    /* Le chien de brume explore le quai, s'arrête pour renifler et revient de lui-même.
     * Sa position de navigation est le sol ; le volume visible est calé au-dessus, pattes comprises. */
    let chien = null; const cP = V3(J.x + 1.6, J.y, J.z + 2.2)
    if (window.TALAS_CHIEN && TALAS_CHIEN.creer) { chien = TALAS_CHIEN.creer(); chien.scale.setScalar(.62); chien.position.set(cP.x, cP.y + chien.userData.solOffset * .62 + .04, cP.z); s.add(chien); W.chien = chien }
    const lumV = V3(0, 1, 0), lumC = new THREE.Color(), ambC = new THREE.Color(), RC = .62
    const chienLibre = (x, z, y0) => {
      const y = Q.sol(x, z, y0); if (y === null || Math.abs(y - y0) > .7) return null
      // Une empreinte entière sur le ponton, pas seulement son point central.
      for (const [dx, dz] of [[RC,0],[-RC,0],[0,RC],[0,-RC]]) { const h = Q.sol(x + dx, z + dz, y); if (h === null || Math.abs(h - y) > .7) return null }
      for (const o of Q.obstacles) {
        if (Math.abs((o.y || 0) - y) > 3.2) continue
        if (o.t === 'c') { if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + RC) ** 2) return null }
        else { const cx = Math.cos(o.ry), sx = Math.sin(o.ry), lx = (x - o.x) * cx - (z - o.z) * sx, lz = (x - o.x) * sx + (z - o.z) * cx; if (Math.abs(lx) < o.hw + RC && Math.abs(lz) < o.hd + RC) return null }
      }
      const rond = (ox, oz, r) => { const d2 = (x - ox) ** 2 + (z - oz) ** 2; return d2 < (r + RC) ** 2 && d2 <= (cP.x - ox) ** 2 + (cP.z - oz) ** 2 }
      if (Math.abs(J.y - y) < 1.6 && rond(J.x, J.z, .4)) return null
      if (W.pnjSolides) for (const n of W.pnjSolides()) if (Math.abs(n.y - y) < 1.6 && rond(n.x, n.z, n.r)) return null
      return y
    }
    if (chienLibre(cP.x, cP.z, cP.y) === null) for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, x = J.x + Math.sin(a) * 1.8, z = J.z + Math.cos(a) * 1.8, y = chienLibre(x, z, J.y); if (y !== null) { cP.set(x, y, z); break } }
    const chienBalade = window.TALAS_COMPAGNONS ? TALAS_COMPAGNONS.promeneur({ position: cP, sol: Q.sol, libre: chienLibre }) : null
    W.chienComportement = chienBalade
    function chienQuai(dt, T) {
      if (!chien || !chienBalade) return
      const mouvement = chienBalade.update(dt, J)
      let solVisible = cP.y
      for (const [dx, dz] of [[RC,0],[-RC,0],[0,RC],[0,-RC]]) { const h = Q.sol(cP.x + dx, cP.z + dz, cP.y); if (h !== null) solVisible = Math.max(solVisible, h) }
      const minY = solVisible + chien.userData.solOffset * chien.scale.y + .04
      // Montée immédiate pour ne jamais traverser une pente ; descente amortie sans passer sous le sol.
      chien.position.set(cP.x, Math.max(minY, chien.position.y + (minY - chien.position.y) * (1 - Math.exp(-dt * 14))), cP.z)
      chien.rotation.y = mouvement.angle
      lumV.copy(W.soleil.position).sub(W.soleil.target.position).normalize(); lumC.copy(W.soleil.color).multiplyScalar(Math.min(1.2, W.soleil.intensity)); ambC.copy(W.hemi.color).multiplyScalar(W.hemi.intensity * .75)
      chien.userData.materiau.uniforms.uAlpha.value = .8 + .2 * (W.etat ? W.etat.x.night : 0)
      chien.userData.tick(dt, T, mouvement.speed, camera, lumV, lumC, ambC)
    }
    // flèche d'objectif et mini-carte
    const flecheObj = ctx.ombre(new THREE.Mesh(new THREE.ConeBufferGeometry(.5, 1.1, 4), new THREE.MeshToonMaterial({ color: '#ff3a2a', gradientMap: grad }))); flecheObj.rotation.x = Math.PI; flecheObj.visible = false; s.add(flecheObj)
    const bague = new THREE.Mesh(new THREE.TorusBufferGeometry(.8, .09, 6, 24), new THREE.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, opacity: .85 })); bague.rotation.x = Math.PI / 2; bague.visible = false; s.add(bague)
    let manuel = -9, yawPrec = W.yaw; W.pitch = .42; W.yaw = 0; W.zoom = 1

    function hudCreer() {
      if (document.getElementById('qhud')) { document.getElementById('qhud').remove() }
      const st = document.getElementById('qhudCss') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'qhudCss' }))
      st.textContent = `#qhud{position:absolute;inset:0;pointer-events:none;z-index:7;font-family:"Luckiest Guy","Trebuchet MS",sans-serif}
        #qhud .qobj{position:absolute;right:10px;top:54px;max-width:44%;display:flex;gap:10px;align-items:center;background:linear-gradient(90deg,rgba(24,14,50,0),rgba(24,14,50,.72) 30%);padding:8px 16px 8px 34px;color:#fff;-webkit-text-stroke:.5px #1a0d22;text-shadow:2px 2px 0 #1a0d22}
        #qhud .qobj svg{flex:none;width:44px;height:52px;filter:drop-shadow(2px 2px 0 #1a0d22)} #qhud .qobj b{display:block;font-size:17px;line-height:1.05;letter-spacing:.3px;color:#ffe9b0} #qhud .qobj span{display:block;font:600 13px/1.2 "Trebuchet MS",sans-serif;-webkit-text-stroke:0;color:#fff;margin-top:3px}
        #qhud canvas.qmap{position:absolute;right:10px;bottom:${TOUCH ? 156 : 12}px;width:170px;height:170px;transition:opacity .15s;filter:drop-shadow(2px 3px 0 rgba(20,10,40,.7))}
        #qhud .qinv{position:absolute;left:50%;bottom:${TOUCH ? 160 : 58}px;transform:translateX(-50%);padding:8px 18px;border-radius:14px;border:3px solid #1a0d22;background:#fff3c8;color:#3a1c40;font-size:17px;text-shadow:none;box-shadow:0 3px 0 #1a0d22;opacity:0;transition:opacity .15s;white-space:nowrap}
        #qhud .qinv i{font-style:normal;display:inline-block;min-width:24px;padding:0 7px;margin-right:8px;border-radius:6px;background:#3a1c40;color:#ffe9b0;text-align:center}
        #qhud .qson{position:absolute;left:12px;top:80px;pointer-events:auto;border:3px solid #1a0d22;border-radius:10px;background:#fff3c8;color:#3a1c40;font:700 12px "Trebuchet MS",sans-serif;padding:4px 10px;box-shadow:0 2px 0 #1a0d22;cursor:pointer}
        #qhud .qaide{position:absolute;left:12px;top:58px;font:600 12px "Trebuchet MS",sans-serif;color:#fff;text-shadow:1px 1px 0 #1a0d22;opacity:.85}`
      const d = document.createElement('div'); d.id = 'qhud'
      d.innerHTML = `<div class="qobj"><svg viewBox="0 0 44 52"><path d="M22 3 40 14v18c0 9-8 15-18 17C12 47 4 41 4 32V14z" fill="#3a7bd5" stroke="#1a0d22" stroke-width="3" stroke-linejoin="round"/><path d="M14 30c0-9 4-15 8-15s8 6 8 15l-3-2-2 3-3-3-3 3-2-3z" fill="#e9fff4" stroke="#1a0d22" stroke-width="2"/><circle cx="19" cy="24" r="1.6" fill="#1a0d22"/><circle cx="25" cy="24" r="1.6" fill="#1a0d22"/></svg><div><b class="qtitre">Objectif</b><span class="qtexte"></span></div></div>
        <canvas class="qmap" width="300" height="300" aria-label="Minimap : objectif rouge, repère clignotant en bordure quand il est hors champ"></canvas><div class="qinv"><i>${TOUCH ? 'ACTION' : 'E'}</i><span></span></div><div class="qaide">${TOUCH ? '' : 'ZQSD / flèches : marcher · Maj : courir · glisser : tourner la caméra · E : entrer'}</div><button class="qson" type="button"></button>`
      document.getElementById('frame').append(d); return d
    }
    const hud = hudCreer(), qSon = hud.querySelector('.qson'), qMap = hud.querySelector('canvas.qmap'), qg = qMap.getContext('2d'), qTitre = hud.querySelector('.qtitre'), qTexte = hud.querySelector('.qtexte'), qInv = hud.querySelector('.qinv'), qInvT = qInv.querySelector('span')
    // fond de la mini-carte : la roche (hauteur) et les chemins praticables, vus de dessus, nord en haut
    const CART = { x0: -75, z0: -95, w: 150, h: 130, ppm: 4 }
    const cBase = document.createElement('canvas'); cBase.width = CART.w * CART.ppm; cBase.height = CART.h * CART.ppm
    { const g = cBase.getContext('2d'); g.fillStyle = '#2a2a6a'; g.fillRect(0, 0, cBase.width, cBase.height)
      for (let j = 0; j < CART.h; j += 1.5) for (let i = 0; i < CART.w; i += 1.5) { const h = ctx.hauteur(CART.x0 + i, CART.z0 + j); if (h > 0) { g.fillStyle = h > 9 ? '#5a4a9a' : h > 4 ? '#4a4a8e' : '#3c3c82'; g.fillRect(i * CART.ppm, j * CART.ppm, 1.6 * CART.ppm, 1.6 * CART.ppm) } }
      g.fillStyle = '#b8a8ff'; g.strokeStyle = '#b8a8ff'
      Q.zones.forEach((q) => { if (q.t === 'r') g.fillRect((q.x0 - CART.x0) * CART.ppm, (q.z0 - CART.z0) * CART.ppm, (q.x1 - q.x0) * CART.ppm, (q.z1 - q.z0) * CART.ppm); else if (q.t === 'd') { g.beginPath(); g.arc((q.x - CART.x0) * CART.ppm, (q.z - CART.z0) * CART.ppm, q.r * CART.ppm, 0, 7); g.fill() } else { g.lineWidth = q.w * CART.ppm; g.lineCap = 'butt'; g.beginPath(); g.moveTo((q.ax - CART.x0) * CART.ppm, (q.az - CART.z0) * CART.ppm); g.lineTo((q.bx - CART.x0) * CART.ppm, (q.bz - CART.z0) * CART.ppm); g.stroke() } }) }
    function carte(cible, nx) {
      const R = 150, RM = 128, ppm = 3.2 * 1 // pixels par mètre dans la mini-carte (rayon de 46 m environ) ; RM : rayon du disque, la pastille N reste entière dans la toile
      let bordX = null, bordZ = null, direction = 0
      if (cible) {
        const dx = (cible.x - J.x) * ppm, dz = (cible.z - J.z) * ppm, c = Math.cos(W.yaw), s = Math.sin(W.yaw)
        const x = dx * c - dz * s, z = dx * s + dz * c, d = Math.hypot(x, z)
        // La pastille en bordure s'efface dès que le point de l'objectif tient dans la carte.
        if (d > RM - 16) { bordX = R + x / d * RM; bordZ = R + z / d * RM; direction = Math.atan2(z, x) }
      }
      qg.clearRect(0, 0, 300, 300); qg.save(); qg.beginPath(); qg.arc(R, R, RM, 0, 7); qg.clip(); qg.fillStyle = '#1d1a4a'; qg.fillRect(0, 0, 300, 300)
      qg.translate(R, R); qg.rotate(W.yaw); qg.scale(ppm / CART.ppm, ppm / CART.ppm); qg.translate(-(J.x - CART.x0) * CART.ppm, -(J.z - CART.z0) * CART.ppm); qg.drawImage(cBase, 0, 0)
      const P = (x, z) => [(x - CART.x0) * CART.ppm, (z - CART.z0) * CART.ppm]
      // ateliers
      for (const k in ctx.PORTES) { const [px, pz] = P(ctx.PORTES[k].x, ctx.PORTES[k].z), n = +k; const ouv = n === 7 ? (allDone() || S.all) : unlocked(n), fait = n < 7 && S.done[n]
        qg.fillStyle = fait ? '#51cf66' : ouv ? '#ffd43b' : '#8888aa'; qg.strokeStyle = '#1a0d22'; qg.lineWidth = 5; qg.beginPath(); qg.arc(px, pz, 15, 0, 7); qg.fill(); qg.stroke(); qg.fillStyle = '#1a0d22'; qg.font = 'bold 22px sans-serif'; qg.textAlign = 'center'; qg.textBaseline = 'middle'; qg.fillText(n === 7 ? '★' : String(n + 4), px, pz + 1) }
      if (cible) { const [px, pz] = P(cible.x, cible.z); qg.strokeStyle = '#ff3a2a'; qg.lineWidth = 6; qg.beginPath(); qg.arc(px, pz, 24 + 5 * Math.sin(W.t * 6), 0, 7); qg.stroke() }
      qg.restore()
      qg.strokeStyle = '#1a0d22'; qg.lineWidth = 9; qg.beginPath(); qg.arc(R, R, RM, 0, 7); qg.stroke(); qg.strokeStyle = '#8f86ff'; qg.lineWidth = 6; qg.beginPath(); qg.arc(R, R, RM, 0, 7); qg.stroke()
      qg.fillStyle = '#8f86ff'; qg.strokeStyle = '#1a0d22'; qg.lineWidth = 3; qg.font = 'bold 26px "Luckiest Guy",sans-serif'; qg.textAlign = 'center'; qg.textBaseline = 'middle'
      // Si l'objectif est au nord, garder les deux repères lisibles sur leur axe.
      const nordProche = bordX !== null && Math.hypot(bordX - (R + Math.sin(W.yaw) * RM), bordZ - (R - Math.cos(W.yaw) * RM)) < 34
      const nordR = nordProche ? RM - 36 : RM, nxp = R + Math.sin(W.yaw) * nordR, nzp = R - Math.cos(W.yaw) * nordR; qg.beginPath(); qg.arc(nxp, nzp, 15, 0, 7); qg.fill(); qg.stroke(); qg.fillStyle = '#fff'; qg.fillText('N', nxp, nzp + 1)
      qg.save(); qg.translate(R, R); qg.rotate(W.yaw - J.ang + Math.PI); qg.fillStyle = '#ffd43b'; qg.strokeStyle = '#1a0d22'; qg.lineWidth = 4; qg.beginPath(); qg.moveTo(0, -17); qg.lineTo(11, 12); qg.lineTo(0, 6); qg.lineTo(-11, 12); qg.closePath(); qg.fill(); qg.stroke(); qg.restore()
      if (bordX !== null) {
        qg.save(); qg.globalAlpha = .45 + .55 * (.5 + .5 * Math.sin(W.t * 6)); qg.fillStyle = '#ff3a2a'; qg.strokeStyle = '#fff3c8'; qg.lineWidth = 3
        qg.beginPath(); qg.arc(bordX, bordZ, 14, 0, 7); qg.fill(); qg.stroke()
        qg.strokeStyle = '#1a0d22'; qg.lineWidth = 3; qg.beginPath(); qg.arc(bordX, bordZ, 17, 0, 7); qg.stroke()
        qg.translate(bordX, bordZ); qg.rotate(direction); qg.fillStyle = '#fff3c8'; qg.beginPath(); qg.moveTo(8, 0); qg.lineTo(-4, -5); qg.lineTo(-1, 0); qg.lineTo(-4, 5); qg.closePath(); qg.fill(); qg.restore()
      }
    }
    const OBJ = [['Contexte', 'Va à la boutique TALAS : un fantôme hante l’atelier.'], ['Leadership', 'Monte tout en haut, jusqu’au manoir du PDG.'], ['Planification', 'Prends l’escalier de gauche : l’atelier des plans t’attend.'], ['Support', 'Prends l’escalier de droite : la bibliothèque des preuves.'], ['Réalisation', 'Le hangar d’assemblage, sur le quai de gauche.'], ['Évaluation', 'Le studio télé, en haut à droite.'], ['Amélioration', 'Le hangar à bateaux, au bout de la grande jetée.'], ['Le verdict', 'Traverse le pont : le phare rend son verdict.']]

    let prevS = 0, moveT = 0, pasT = 0, idleT = 0, mapTime = 0, sprintMobile = false
    const majSon = () => { qSon.textContent = 'Son : ' + (window.TALAS_SON && TALAS_SON.on ? 'oui' : 'non') }; majSon(); qSon.onclick = () => { if (window.TALAS_SON) { TALAS_SON.regler(!TALAS_SON.on); majSon() } }
    const camDans = (x, y, z) => { if (ctx.hauteur(x, z) > y + .1) return true
      for (const o of Q.obstacles) { if (o.t !== 'b' || !o.h) continue; if (y < o.y - .3 || y > o.y + o.h) continue; const cx = Math.cos(o.ry), sx = Math.sin(o.ry), lx = (x - o.x) * cx - (z - o.z) * sx, lz = (x - o.x) * sx + (z - o.z) * cx; if (Math.abs(lx) < o.hw + .5 && Math.abs(lz) < o.hd + .5) return true }
      return false }
    /* ---- s'asseoir (bancs du jardin zen, talas-quai-zen.js) : E près d'une place pour s'asseoir, E ou une direction pour se relever ---- */
    const DY_ASSIS = .0
    const siegeProche = () => { if (J.assis || !Q.sieges) return null; let b = null, bd = 1.7; for (const q of Q.sieges) { if (Math.abs(q.y - .5 - J.y) > 1.2) continue; const d = Math.hypot(q.x - J.x, q.z - J.z); if (d < bd) { bd = d; b = q } } return b }
    const asseoir = (q) => { J.assis = q; J.x = q.x; J.z = q.z; J.y = q.y - .5; J.ang = q.ang; J.vit = 0; try { beep(330, .08, 'triangle', .03) } catch (er) {} }
    const lever = () => { const q = J.assis; if (!q) return; J.assis = null; J.x = q.sortie.x; J.z = q.sortie.z; J.y = q.plan; J.vit = 0 }
    const siegeToucher = (appui, proche, fige, modal) => {
      if (Q.loisirToucher && Q.loisirToucher(appui, proche, fige, modal)) return true   // loisirs de l'île (talas-quai-loisirs.js)
      if (!appui || fige || modal) return false
      if (J.assis) { lever(); return true }
      if (proche >= 0) return false
      const q = siegeProche(); if (q) { asseoir(q); return true }
      return false }
    W.suivre = function (dt, T, pCentre) {
      const libre = W.photo || busy || S.tStop, fige = libre || S.intro
      // --- entrées
      const modal = !$('#modal').hidden, v = mobileControls.vector
      let ix = 0, iz = 0, intensite = 0
      if (!fige && !modal) {
        const ax = v.active ? v.x : (KEYS.R ? 1 : 0) - (KEYS.L ? 1 : 0), az = v.active ? -v.y : (KEYS.U ? 1 : 0) - (KEYS.D ? 1 : 0)
        if (ax || az) { const cy = Math.cos(W.yaw), sy = Math.sin(W.yaw); ix = cy * ax - sy * az; iz = -sy * ax - cy * az; const n = Math.hypot(ix, iz); ix /= n; iz /= n; intensite = v.active ? v.magnitude : 1 }
      }
      const veut = ix || iz
      if (J.assis) { if (veut || fige || modal) lever(); else { J.vit = 0; J.ang = J.assis.ang } }
      idleT = !veut && J.vit < .3 ? idleT + dt : 0 // le chien n'invite à la caresse que quand Dylan s'arrête un instant
      if (veut && !fige && !$('#panel').hidden) { moveT += dt; if (moveT > .7) hidePanel() } else if (!veut) moveT = 0
      // Bord du joystick : courir ; revenir vers le centre : marcher.
      // Deux seuils évitent de basculer sans cesse lorsque le doigt tremble.
      sprintMobile = !!(TOUCH && veut && v.active && v.magnitude >= (sprintMobile ? .8 : .92))
      J.courir += (((KE.shift || sprintMobile) && veut ? 1 : 0) - J.courir) * Math.min(1, dt * 8)
      const vitMax = (perso ? 2.3 : 3.5) + J.courir * (perso ? 3.4 : 2.8)
      J.vit += ((veut ? vitMax * intensite : 0) - J.vit) * Math.min(1, dt * (veut ? 9 : 12))
      if (J.vit > 1 && !libre) { pasT -= J.vit * dt; if (pasT <= 0) { pasT = 1.55; if (window.TALAS_SON) TALAS_SON.pas(J.courir > .5) } } else pasT = .2
      if (J.vit > .05) {
        const dx = (veut ? ix : Math.sin(J.ang)) * J.vit * dt, dz = (veut ? iz : Math.cos(J.ang)) * J.vit * dt, r0 = .34
        const libreDe = (x, z) => { const y = Q.sol(x, z, J.y); if (y === null || Math.abs(y - J.y) > .95) return null; for (const o of Q.obstacles) { if (Math.abs((o.y || 0) - J.y) > 3.2) continue; if (o.t === 'c') { if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + r0) ** 2) return null } else { const cx = Math.cos(o.ry), sx = Math.sin(o.ry), lx = (x - o.x) * cx - (z - o.z) * sx, lz = (x - o.x) * sx + (z - o.z) * cx; if (Math.abs(lx) < o.hw + r0 && Math.abs(lz) < o.hd + r0) return null } } if (W.pnjSolides) for (const n of W.pnjSolides()) { if (!n.mobile || Math.abs(n.y - J.y) > 1.6) continue; const d2 = (x - n.x) ** 2 + (z - n.z) ** 2; if (d2 < (n.r + r0) ** 2 && d2 <= (J.x - n.x) ** 2 + (J.z - n.z) ** 2) return null } return y }
        let nx = J.x + dx, nz = J.z + dz, y = libreDe(nx, nz)
        if (y === null) { y = libreDe(nx, J.z); if (y !== null) nz = J.z; else { y = libreDe(J.x, nz); if (y !== null) nx = J.x; else { nx = J.x; nz = J.z; y = J.y; J.vit *= .5 } } }
        J.x = nx; J.z = nz; J.y += (y - J.y) * Math.min(1, dt * 16)
      }
      if (veut) { let d = Math.atan2(ix, iz) - J.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; J.ang += d * Math.min(1, dt * 12) }
      if (!libre || W.gardeJoueur) { dylan.position.set(J.x, J.y + (J.assis ? DY_ASSIS : 0), J.z); dylan.rotation.y = J.ang }
      // animation
      const mode = J.vit > 4.6 ? 'run' : J.vit > .5 ? 'walk' : 'idle'
      if (perso) {   // la bibliothèque Quaternius : la cadence de la foulée suit la vitesse réelle
        const v = J.vit
        if (Q.loisirClip && Q.loisirClip()) TALAS_PERSO.jouer(dylan, Q.loisirClip(), { vitesse: 1.2, fondu: .12 })
        else if (J.assis) TALAS_PERSO.jouer(dylan, 'Sitting_Idle_Loop', { vitesse: 1, fondu: .3 })
        else if (v < .15) TALAS_PERSO.jouer(dylan, 'Idle_Loop', { vitesse: 1, fondu: .25 })
        else if (J.courir > .45 || v > 3.6) TALAS_PERSO.jouer(dylan, 'Jog_Fwd_Loop', { vitesse: Math.max(.55, Math.min(1.35, v / 5.2)), fondu: .2 })
        else TALAS_PERSO.jouer(dylan, 'Walk_Loop', { vitesse: Math.max(.9, Math.min(3, v / .92)), fondu: .2 })
      } else animPerson(dylan, mode, T * (1 + J.courir * .35))
      if (J.vit > 3 && Math.random() < dt * (6 + J.courir * 8)) pous.emettre({ pos: [J.x - Math.sin(J.ang) * .3 + (Math.random() - .5) * .3, J.y + .12, J.z - Math.cos(J.ang) * .3 + (Math.random() - .5) * .3], vel: [-Math.sin(J.ang) * .8 + (Math.random() - .5) * .6, .5, -Math.cos(J.ang) * .8 + (Math.random() - .5) * .6], t0: .16, t1: .5, c0: '#efe4d0', c1: '#d8ccb8', a0: .55, a1: 0, vie: .7, grav: -.3, vent: 0 })
      pous.lumiere(camera, W.soleil.position.clone().sub(W.soleil.target.position), W.soleil.color.clone().multiplyScalar(W.soleil.intensity * .6), W.hemi.color.clone().multiplyScalar(W.hemi.intensity * .7)); pous.maj(dt, T, camera)
      // Boulon suit avec de l'inertie ; ses articulations restent vivantes, même à l'arrêt.
      const tb = V3(J.x - Math.sin(J.ang + 1.1) * 1.5 + Math.sin(T * .7) * .14, J.y + 1.5 + Math.sin(T * 2.2) * .18, J.z - Math.cos(J.ang + 1.1) * 1.5 + Math.cos(T * .9) * .12)
      if (!libre && !bo.userData.busy) { boP.lerp(tb, 1 - Math.pow(.02, dt)); bo.position.copy(boP) }
      if (bo.userData.animer) bo.userData.animer(dt, T, { speed: J.vit, talk: !$('#panel').hidden }); else bo.userData.prop.rotation.y += dt * 8
      { const fy = Math.atan2(camera.position.x - bo.position.x, camera.position.z - bo.position.z); bo.userData.face = fy; if (!bo.userData.busy) { const d = Math.atan2(Math.sin(fy - bo.rotation.y), Math.cos(fy - bo.rotation.y)); bo.rotation.y += d * (1 - Math.exp(-dt * 4)) } }
      // hélice de l'hydravion, phare
      if (Q._helice) Q._helice.rotation[Q._heliceForge ? 'z' : 'x'] += dt * 30
      fantomeQuai(dt, T); chienQuai(dt, T)
      if (Q.zenAnim) Q.zenAnim(dt, T, J)
      if (Q.loisirTick) Q.loisirTick(dt, T, J, W, veut)
      fx.update(dt)
      // --- proximité d'un atelier
      let proche = -1, dm = 3.4, invPnj = null
      if (!fige && !modal) for (const k in ctx.PORTES) { const p = ctx.PORTES[k], d = Math.hypot(p.x - J.x, p.z - J.z); if (d < dm && Math.abs(p.y - J.y) < 2.6) { dm = d; proche = +k } }
      J.proche = proche
      if (TOUCH) mobileControls.setAction(proche >= 0 ? 'enter' : 'interact')
      const e = !!KEYS.S, appui = (e && !prevS) || !!KEYP.S; KEYP.S = 0;
      const siegeFait = siegeToucher(appui, proche, fige, modal)
      if (siegeFait) { /* assis / relevé : rien d'autre à faire */ } else if (appui && proche >= 0) { if (proche === 7) clickTower(); else clickBuilding(proche) }
      else if (appui && proche < 0 && !fige && !modal && W.pnjParle && W.pnjParle()) { /* un habitant du quai répond (talas-quai-pnj.js) */ }
      else if (appui && proche < 0 && chien && !fige && !modal && Math.hypot(cP.x - J.x, cP.z - J.z) < 2.8) { if (chienBalade) chienBalade.caresse(); chien.userData.aboie(); if (window.TALAS_SON) TALAS_SON.aboie(); try { beep(260, .12, 'square', .05); setTimeout(() => beep(390, .16, 'square', .05), 120) } catch (er) {} fx.burst(V3(cP.x, cP.y + 1.6, cP.z), 8) }
      prevS = e ? 1 : 0
      const dlg = !$('#panel').hidden   // un dialogue est ouvert : pas d'invite par-dessus le panneau
      qMap.style.opacity = dlg ? 0 : 1
      if (dlg || (Q.loisirActif && Q.loisirActif())) qInv.style.opacity = 0
      else if (J.assis) { qInv.style.opacity = 1; qInvT.textContent = (Q.loisirInviteAssis && Q.loisirInviteAssis(J)) || 'Se lever (E ou une direction)'; qInv.style.background = '#fff3c8' }
      else if (proche < 0 && !fige && !modal && Q.loisirInvite && (Q._invL = Q.loisirInvite(J))) { qInv.style.opacity = 1; qInvT.textContent = Q._invL; qInv.style.background = '#fff3c8' }
      else if (proche < 0 && !fige && !modal && siegeProche()) { qInv.style.opacity = 1; qInvT.textContent = siegeProche().hamac ? 'S’allonger dans le hamac' : 'S’asseoir au jardin zen'; qInv.style.background = '#fff3c8' }
      else if (proche >= 0) { const nom = proche === 7 ? 'la tour de contrôle' : CH[proche].t; const ok = proche === 7 ? (allDone() || S.all) : unlocked(proche); qInv.style.opacity = 1; qInvT.textContent = ok ? (proche === 7 ? 'Demander le verdict' : `Entrer : atelier ${nom}`) : `Fermé — termine d’abord l’atelier précédent`; qInv.style.background = ok ? '#fff3c8' : '#e9dcd0' } else if (!fige && !modal && W.pnjInvite && (invPnj = W.pnjInvite())) { qInv.style.opacity = 1; qInvT.textContent = invPnj; qInv.style.background = '#fff3c8' } else if (chien && !fige && !modal && idleT > .9 && Math.hypot(cP.x - J.x, cP.z - J.z) < 2.6) { qInv.style.opacity = 1; qInvT.textContent = 'Caresser le chien-fantôme'; qInv.style.background = '#fff3c8' } else qInv.style.opacity = 0
      // --- objectif
      const nx = nextN(); const cible = nx === null ? null : ctx.PORTES[nx]
      { const cb = nx === null ? null : (nx === 7 ? HUB_TOWER : B[nx]); W.contour = cb && !fige ? { objets: [cb], couleur: '#ffd86a', force: (.5 + .22 * Math.sin(T * 4)) * (proche === nx ? 1.6 : 1) } : null } // éclat de contour doré autour de l'atelier à rejoindre
      if (cible && !fige) { flecheObj.visible = bague.visible = true; const tp = nx === 7 ? 19.6 : nx === 1 ? 6.6 : 5.4; flecheObj.position.set(cible.x, cible.y + tp + Math.abs(Math.sin(T * 4)) * .5, cible.z); flecheObj.rotation.y = T * 2.4; bague.position.set(cible.x, cible.y + .08, cible.z); bague.scale.setScalar(1 + Math.sin(T * 5) * .08) } else flecheObj.visible = bague.visible = false
      const oi = nx === null ? null : OBJ[nx]; if (oi) { const title = 'Objectif : ' + oi[0]; if (qTitre.textContent !== title) qTitre.textContent = title; if (qTexte.textContent !== oi[1]) qTexte.textContent = oi[1] } else { if (qTitre.textContent !== 'Village Talas') qTitre.textContent = 'Village Talas'; if (qTexte.textContent !== 'Choisis un atelier.') qTexte.textContent = 'Choisis un atelier.' }
      hud.style.display = ((libre && !W.photo) || S.intro || W.sansHud) ? 'none' : ''
      mapTime -= dt; if (!TOUCH || mapTime <= 0) { if (!dlg) carte(cible, nx); mapTime = .1 }
      // --- panneaux d'ateliers tournés vers la caméra
      const q = new THREE.Quaternion(); B.concat([HUB_TOWER]).forEach((b) => { if (b && b.userData.sign) { b.getWorldQuaternion(q); b.userData.sign.quaternion.copy(q.invert().multiply(camera.quaternion)) } })
      // --- caméra
      const uti = Math.abs(W.yaw - yawPrec) > 1e-4; if (uti) manuel = W.t; yawPrec = W.yaw
      if (!libre && !W.camLoisir) {
        // Keep the camera basis stable while the thumb circles the stick.
        if (!mobileControls.vector.active && W.t - manuel > 1.4 && J.vit > 1.5) { let d = Math.atan2(-Math.sin(J.ang), -Math.cos(J.ang)) - W.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) < 2.3) { W.yaw += d * Math.min(1, dt * 1.6); yawPrec = W.yaw } }
        const d0 = 7.6 * (W.zoom || 1) + J.courir * .8, dR = Math.cos(W.yaw), sR = -Math.sin(W.yaw)
        W.look.set(J.x + dR * .9, J.y + 1.75, J.z + sR * .9); W.dist += (d0 - W.dist) * Math.min(1, dt * 6)
      }
      const ph = W.pitch, D = W.dist * (W.pdcaOverview ? (W.zoom || 1) : 1)
      const want = V3(W.look.x + Math.sin(W.yaw) * Math.cos(ph) * D, W.look.y + Math.sin(ph) * D, W.look.z + Math.cos(W.yaw) * Math.cos(ph) * D)
      const sol = Math.max(ctx.hauteur(want.x, want.z), 0) + .7; if (want.y < sol) want.y = sol
      { const a = W.look; let lim = 1
        if (!W.pdcaOverview) for (let t = .12; t <= 1.001; t += .08) { if (camDans(a.x + (want.x - a.x) * t, a.y + (want.y - a.y) * t, a.z + (want.z - a.z) * t)) { lim = Math.max(.12, t - .1); break } }
        if (lim < 1) want.set(a.x + (want.x - a.x) * lim, a.y + (want.y - a.y) * lim, a.z + (want.z - a.z) * lim) }
      camP.lerp(want, libre ? 1 - Math.pow(.0005, dt) : 1 - Math.pow(.0009, dt)); camL.lerp(W.look, 1 - Math.pow(.0002, dt))
      if (!W.photo) pCentre.set(J.x, J.y, J.z)
    }

    W.update = function (dt, T) {
      W.t += dt
      if (W.photo) pC.copy(W.photo.look)
      cycle(dt, T); decor(dt, T)
      if (W.pnjMaj) W.pnjMaj(dt, T)
      if (!W.photo) { pC.set(J.x, J.y, J.z) }
      if (W.suivre) W.suivre(dt, T, pC)
    }
    /* introduction : du grand large jusqu'à la caméra de jeu derrière Dylan */
    const introA = V3(38, 24, 62), introL = V3(2, 5, -20), tmpI = V3(0, 0, 0)
    W.introCam = function (e) { const k = e * e * (3 - 2 * e); camera.position.lerpVectors(introA, camP, k); tmpI.lerpVectors(introL, camL, k); camera.lookAt(tmpI); W.focus = camera.position.distanceTo(tmpI); cielSuit() }
    W.finaleLook = W.plane.position.clone().add(V3(0, 3, 0)); W.finaleYaw = Math.PI / 2 + .35; W.finaleDist = 24; W.linkScale = 2.4
    W.hint0 = TOUCH ? 'Boulon, ton guide ! Sept ateliers pour l’ISO 45001. Joystick : marcher ; pousse-le au bord pour sprinter. Glisse pour tourner la caméra, puis AGIR devant la boutique TALAS (cercle rouge).' : 'Salut Dylan, moi c’est Boulon ! Voici le village Talas : sept ateliers, un par chapitre de la norme, et chacun nourrit le suivant. Marche avec Z Q S D ou les flèches (Maj pour courir), glisse la souris pour tourner la caméra, et appuie sur E devant la porte de la boutique TALAS (le cercle rouge).'
    W.photoDe = (pos, look, heure) => { W.photo = pos ? { pos: V3(...pos), look: V3(...look) } : null; if (heure !== undefined) W.heureFixe = heure }
  }
})()

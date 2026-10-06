/* Refonte de l'île du Village Talas : détails et vie. Script classique chargé avant le jeu, branché sur buildHub().
 *   ?ile=classique -> île d'origine (comparaison)
 * Les accessoires viennent de la forge (tools/forge, assets/talas/props, via talas-props.js) ; tout le reste est
 * construit ici avec les matériaux toon du jeu (dégradé 4 paliers + contour encre), comme le reste du village.
 * Tout objet est posé sur le vrai relief cuit dans Blender (lancer de rayon sur sol.glb), jamais à une hauteur devinée.
 *
 * Contenu :
 *  - vie : voiliers en ronde avec sillage, ouvriers qui font le tour de la place, poissons qui sautent, avion de ligne
 *    et sa traînée, ombres de nuages, jets de la fontaine, radar et feu à éclats de la tour, manche à air, balisage
 *    lumineux de piste en chenillard ;
 *  - détails : lampadaires le long de l'anneau, bancs de la place, parasols et transats sur la plage, extincteur à
 *    chaque porte d'atelier, panneaux ISO 7010, coin logistique au bout de la piste (chariot, palettes, fûts, cônes). */
(function () {
  const q = location.search.match(/[?&]ile=([a-z]+)/)
  const on = !(q && q[1] === 'classique')
  const PROPS = ['avion-a320', 'voilier-rouge', 'voilier-bleu', 'lampadaire', 'banc', 'parasol-rouge', 'parasol-jaune', 'extincteur',
    'panneau-casque', 'panneau-danger-general', 'panneau-sortie', 'cone', 'palette', 'fut-chimique', 'bouteille-gaz', 'chariot-elevateur', 'barriere']

  function preload() {
    if (!window.TALAS_ILE.on) return Promise.resolve()
    const jobs = []
    if (window.TalasProps) jobs.push(TalasProps.preload(PROPS))
    if (typeof preloadToons === 'function') jobs.push(preloadToons())
    return Promise.all(jobs).catch(() => 0)
  }

  function decorate(c) {
    window.TALAS_ILE.rocks = []
    if (!window.TALAS_ILE.on) return null // lu à chaque construction : bascule avant/après sans recharger
    const { s, THREE, SEA, B, tower, rand, grad } = c
    const V = (x, y, z) => new THREE.Vector3(x, y, z)
    const ups = [] // fonctions de mise à jour (dt, T)

    /* ---------- relief : lancer de rayon sur la géométrie cuite de l'île ---------- */
    const groundGeo = new Set()
    ;['sol', 'falaise'].forEach((k) => c.ILE[k] && c.ILE[k].traverse((o) => { if (o.isMesh) groundGeo.add(o.geometry) }))
    const ground = []; s.traverse((o) => { if (o.isMesh && groundGeo.has(o.geometry)) ground.push(o) })
    const ray = new THREE.Raycaster()
    s.updateMatrixWorld(true)
    const hAt = (x, z, def = .4) => { if (!ground.length) return def; ray.set(V(x, 60, z), V(0, -1, 0)); const h = ray.intersectObjects(ground, false)[0]; return h ? h.point.y : def }

    /* ---------- matériaux toon du jeu ---------- */
    const MT = {}
    const toon = (col) => MT[col] || (MT[col] = new THREE.MeshToonMaterial({ color: col, gradientMap: grad }))
    const mk = (geo, col, x, y, z, p = s) => { const m = new THREE.Mesh(geo, typeof col === 'string' ? toon(col) : col); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m }
    const out = (m, k = 1.05) => (c.outline ? c.outline(m, k) : m)
    const glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv) })()
    const glow = (col, size, p) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.setScalar(size); p.add(sp); return sp }

    /* ---------- accessoires de la forge ---------- */
    const P = window.TalasProps
    const prop = (id, x, z, ry = 0, sc = 1, pal) => {
      if (!P || !P.loaded(id)) return null
      const o = P.make(id, pal || {}, { gradientMap: grad, outline: 1.035 }); o.position.set(x, hAt(x, z), z); o.rotation.y = ry; o.scale.setScalar(sc)
      o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false } }); s.add(o); return o
    }
    const parts = (o) => (o && o.userData.parts) || {}

    // extincteur et panneau devant chaque atelier (côté porte = +Z local après lookAt vers la place)
    const signs = ['panneau-casque', 'panneau-danger-general', 'panneau-casque', 'panneau-sortie', 'panneau-danger-general', 'panneau-casque', 'panneau-sortie']
    B.forEach((b, n) => {
      b.updateMatrixWorld(true)
      const e = b.localToWorld(V(2.05, 0, 1.95)); prop('extincteur', e.x, e.z, b.rotation.y + .4, 1.1)
      const p = b.localToWorld(V(-2.55, 0, 2.3)); prop(signs[n], p.x, p.z, Math.atan2(-p.x, -p.z) + Math.PI, .62)
    })

    // lampadaires sur l'anneau (r ≈ 10,4), entre les allées des ateliers
    const lamps = []
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + .31, x = Math.sin(a) * 10.4, z = -Math.cos(a) * 10.4
      if (z > 11 && Math.abs(x) < 13) continue // côté piste
      const l = prop('lampadaire', x, z, -a + Math.PI / 2, .9); if (!l) continue
      const lan = parts(l).lanterne; if (lan) lamps.push(glow('#ffd873', 1.4, lan))
    }
    // bancs adossés aux jardinières de la place (diagonales), assise tournée vers l'anneau et les ateliers
    ;[1, 3, 5, 7].forEach((q) => { const a = q * Math.PI / 4, x = Math.sin(a) * 6.95, z = -Math.cos(a) * 6.95; prop('banc', x, z, Math.atan2(x, z), 1) })

    // plage (sud) : parasols et transats, entre les deux pontons
    ;[[-.62, 'parasol-rouge'], [-.34, 'parasol-jaune'], [.3, 'parasol-rouge'], [.58, 'parasol-jaune']].forEach(([da, id]) => {
      const a = Math.PI + da, r = 27.3, x = Math.sin(a) * r, z = -Math.cos(a) * r
      const u = prop(id, x, z, rand(0, 6), .8); const t = parts(u).toile; if (t) { t.userData.ph = rand(0, 6); ups.push((dt, T) => { t.rotation.z = Math.sin(T * 1.3 + t.userData.ph) * .04; t.rotation.x = Math.cos(T * 1.1 + t.userData.ph) * .03 }) }
    })

    // coin logistique au bout est de la piste, près de la tour
    prop('chariot-elevateur', 15.2, 13.6, -Math.PI / 2 + .3, .75)
    ;[[13.4, 16.6], [14.4, 16.9]].forEach(([x, z], i) => { const p = prop('palette', x, z, i * .2, 1); if (p && i === 0) { const f = prop('fut-chimique', x - .2, z, .3, .8); if (f) f.position.y += .15 } })
    prop('bouteille-gaz', 16.4, 15.8, 1, .75); prop('bouteille-gaz', 16.9, 15.3, 2.2, .75)
    for (let i = 0; i < 6; i++) prop('cone', -11 + i * 4.4, 17.6, rand(0, 6), .9)
    prop('barriere', -14.2, 15, Math.PI / 2, .6)

    /* ---------- tour de contrôle : radar tournant et feu à éclats ---------- */
    if (tower) {
      const box = new THREE.Box3().setFromObject(tower), top = box.max.y - tower.position.y
      const rad = new THREE.Group(); rad.position.set(0, top - .9, 0); tower.add(rad)
      out(mk(new THREE.CylinderGeometry(.06, .06, .5, 8), '#495057', 0, .25, 0, rad), 1.1)
      const bar = new THREE.Group(); bar.position.y = .55; rad.add(bar)
      out(mk(new THREE.BoxGeometry(1.8, .28, .08), '#f1f3f5', 0, 0, 0, bar), 1.06)
      mk(new THREE.BoxGeometry(1.7, .06, .1), '#e03131', 0, .13, .01, bar)
      const bl = glow('#ff3b3b', 1.6, rad); bl.position.y = 1.1
      ups.push((dt, T) => { bar.rotation.y += dt * 1.6; const k = (T % 1.4) < .12 ? 1 : 0; bl.material.opacity = k; bl.scale.setScalar(1.3 + k * .6) })
    }

    /* ---------- piste : balisage en chenillard et manche à air ---------- */
    const rl = []
    for (let i = 0; i < 13; i++) [12.85, 17.15].forEach((z) => {
      const x = -12 + i * 2; const g = new THREE.Group(); g.position.set(x, hAt(x, z) + .05, z); s.add(g)
      mk(new THREE.CylinderGeometry(.07, .09, .12, 8), '#343a40', 0, .06, 0, g); const b = mk(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe066' }), 0, .15, 0, g)
      const gl = glow('#ffd43b', .9, g); gl.position.y = .16; rl.push({ i, gl, b })
    })
    ups.push((dt, T) => rl.forEach((l) => { const k = Math.max(0, 1 - Math.abs(((T * 5) % 16) - l.i) / 1.6); l.gl.material.opacity = .15 + k * .85; l.gl.scale.setScalar(.6 + k * .8) }))
    {
      const x = 13.2, z = 18.4, g = new THREE.Group(); g.position.set(x, hAt(x, z), z); s.add(g)
      out(mk(new THREE.CylinderGeometry(.05, .06, 3, 8), '#adb5bd', 0, 1.5, 0, g), 1.1)
      const sock = new THREE.Group(); sock.position.y = 2.9; g.add(sock)
      const seg = []; for (let i = 0; i < 4; i++) { const m = mk(new THREE.CylinderGeometry(.22 - i * .035, .19 - i * .035, .36, 12, 1, true), i % 2 ? '#ffffff' : '#ff6b1a', -.2 - i * .36, 0, 0, sock); m.rotation.z = Math.PI / 2; m.material.side = THREE.DoubleSide; seg.push(m) }
      ups.push((dt, T) => { sock.rotation.y = -.5 + Math.sin(T * .7) * .35; sock.rotation.z = -.12 + Math.sin(T * 2.3) * .06; seg.forEach((m, i) => { m.position.y = Math.sin(T * 6 - i) * .03 * i }) })
    }

    /* ---------- fontaine de la place : quatre jets en arc ---------- */
    {
      const N = 220, pos = new Float32Array(N * 3), life = new Float32Array(N), jet = new Uint8Array(N)
      for (let i = 0; i < N; i++) { life[i] = Math.random(); jet[i] = i % 4 }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#dff6ff', size: .16, map: glowTex, transparent: true, depthWrite: false, opacity: .9 }))
      s.add(pts); const y0 = hAt(0, 2.2) + .15
      ups.push((dt) => {
        for (let i = 0; i < N; i++) {
          life[i] += dt * .9; if (life[i] > 1) life[i] -= 1
          const a = jet[i] * Math.PI / 2 + .78, t = life[i], r = 2.9 - t * 2.2
          pos[i * 3] = Math.sin(a) * r; pos[i * 3 + 2] = -Math.cos(a) * r; pos[i * 3 + 1] = y0 + 4 * t * (1 - t) * 1.6
        }
        geo.attributes.position.needsUpdate = true
      })
    }

    /* ---------- ouvriers qui font le tour de la place ---------- */
    const walkers = []
    if (typeof toonFromGLB === 'function') [['#2f9e44', 0, 1], ['#e8590c', 2.1, 1], ['#1c7ed6', 4.2, -1]].forEach(([col, a0, dir]) => {
      const w = toonFromGLB('worker', { shirt: col, sleeve: col }, .5); if (!w) return
      s.add(w); walkers.push({ w, a: a0, dir, r: 9 + (dir < 0 ? .45 : -.45), ph: rand(0, 6), rig: w.userData.rig })
    })
    ups.push((dt, T) => walkers.forEach((k) => {
      k.a += dt * .11 * k.dir; const x = Math.sin(k.a) * k.r, z = -Math.cos(k.a) * k.r
      const dx = Math.cos(k.a) * k.dir, dz = Math.sin(k.a) * k.dir
      k.w.position.set(x, hAt(x, z) + Math.abs(Math.sin(T * 7 + k.ph)) * .04, z); k.w.rotation.y = Math.atan2(dx, dz)
      const sw = Math.sin(T * 7 + k.ph) * .55, rg = k.rig
      if (rg && rg.nouveau) animPerson(k.w, 'walk', T)
      else if (rg && rg.hips) { rg.hips.forEach((h, i) => h && (h.rotation.x = i ? sw : -sw)); rg.knees.forEach((n, i) => n && (n.rotation.x = Math.max(0, i ? -sw : sw) * .9)) }
      if (rg && !rg.nouveau && rg.shs) rg.shs.forEach((h, i) => h && (h.rotation.x = (i ? -sw : sw) * .6))
    }))

    /* ---------- voiliers en ronde, sillage d'écume ---------- */
    const foamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false })
    ;[['voilier-rouge', 40, .045, 0], ['voilier-bleu', 54, -.032, 2.6]].forEach(([id, r, w, a0]) => {
      const b = prop(id, 0, 0, 0, 1); if (!b) return
      const pp = parts(b), wake = []
      for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(.5, 12), foamMat.clone()); m.rotation.x = -Math.PI / 2; s.add(m); wake.push({ m, t: i / 16 }) }
      let a = a0, drop = 0
      ups.push((dt, T) => {
        a += w * dt; const x = Math.sin(a) * r, z = -Math.cos(a) * r, sgn = Math.sign(w)
        b.position.set(x, SEA - .15 + Math.sin(T * 1.7 + r) * .08, z); b.rotation.y = Math.atan2(Math.cos(a) * sgn, Math.sin(a) * sgn)
        if (pp.coque) { pp.coque.rotation.z = Math.sin(T * 1.3 + r) * .06 - .08 * sgn; pp.coque.rotation.x = Math.sin(T * 1.7 + r) * .03 }
        ;['grand_voile', 'foc'].forEach((k, i) => { if (pp[k]) { pp[k].rotation.z = pp.coque ? pp.coque.rotation.z : 0; pp[k].scale.x = 1 + Math.sin(T * 9 + i) * .04 } })
        if (pp.girouette) pp.girouette.rotation.y = Math.sin(T * 2) * .3
        drop += dt; if (drop > .18) { drop = 0; const f = wake.shift(); f.t = 0; const back = V(-Math.sin(b.rotation.y), 0, -Math.cos(b.rotation.y)); f.m.position.set(x + back.x * 1.7, SEA + .06, z + back.z * 1.7); wake.push(f) }
        wake.forEach((f) => { f.t += dt / 2.8; f.m.scale.setScalar(.4 + f.t * 2.2); f.m.material.opacity = Math.max(0, .55 * (1 - f.t)) })
      })
    })

    /* ---------- poissons qui sautent près du rivage ---------- */
    const fish = []
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(); s.add(g); g.visible = false
      out(mk(new THREE.SphereGeometry(.22, 10, 8), ['#ff922b', '#74c0fc', '#ffd43b'][i], 0, 0, 0, g), 1.08).scale.set(1.8, .8, .6)
      const tail = mk(new THREE.ConeGeometry(.16, .3, 4), ['#e8590c', '#339af0', '#fab005'][i], -.45, 0, 0, g); tail.rotation.z = Math.PI / 2
      const ring = new THREE.Mesh(new THREE.RingGeometry(.2, .32, 24), foamMat.clone()); ring.rotation.x = -Math.PI / 2; s.add(ring); ring.visible = false
      fish.push({ g, ring, t: -rand(1, 6), a: 0, r: 0 })
    }
    ups.push((dt) => fish.forEach((f) => {
      f.t += dt
      if (f.t > 0 && !f.g.visible) { f.a = rand(0, Math.PI * 2); f.r = rand(33, 46); f.g.visible = true; f.t = 0 }
      if (!f.g.visible) return
      const u = f.t / 1.1, x = Math.sin(f.a) * f.r, z = -Math.cos(f.a) * f.r
      f.g.position.set(x + Math.cos(f.a) * (u - .5) * 3, SEA + 2.2 * 4 * u * (1 - u) * .8, z + Math.sin(f.a) * (u - .5) * 3)
      f.g.rotation.set(0, -f.a, (.5 - u) * 2.4)
      f.ring.visible = u > .9; f.ring.position.set(x + Math.cos(f.a) * 1.5, SEA + .07, z + Math.sin(f.a) * 1.5)
      if (u > .9) { const k = (u - .9) * 6; f.ring.scale.setScalar(1 + k * 4); f.ring.material.opacity = Math.max(0, .7 - k * .5) }
      if (u >= 2.2) { f.g.visible = false; f.ring.visible = false; f.t = -rand(2, 7) }
    }))

    /* ---------- avion de ligne qui traverse le ciel, traînée ---------- */
    if (c.ILE.avion) {
      const jet = c.ILE.avion.clone(); jet.scale.setScalar(.45); s.add(jet)
      jet.traverse((o) => { if (o.isMesh) o.castShadow = false })
      const trail = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.9, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, fog: false })); s.add(m); trail.push({ m, t: 1 }) }
      let t = -8, emit = 0, k = 0
      ups.push((dt) => {
        t += dt; const u = t / 26
        if (u > 1.15) t = -rand(10, 22)
        jet.visible = u >= 0 && u <= 1
        if (jet.visible) {
          const x = -150 + u * 300, z = -70 + u * 30; jet.position.set(x, 48, z); jet.rotation.y = Math.atan2(300, 30) - Math.PI / 2
          emit += dt; if (emit > .12) { emit = 0; const p = trail[k++ % trail.length]; p.t = 0; p.m.position.set(x - 4, 48.4, z - .4) }
        }
        trail.forEach((p) => { p.t += dt / 7; p.m.visible = p.t < 1; p.m.material.opacity = .5 * (1 - p.t); p.m.scale.setScalar(.6 + p.t * 2.6) })
      })
    }

    /* ---------- ombres de nuages qui glissent sur l'île (invisibles, ne font qu'ombrer) ---------- */
    const clouds = []
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group(); g.position.set(rand(-60, 60), 30, rand(-30, 30)); s.add(g)
      const m = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
      for (let j = 0; j < 5; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(rand(3, 5.5), 10, 8), m); b.position.set(j * 3.5 - 7, 0, rand(-2, 2)); b.scale.y = .35; b.castShadow = true; g.add(b) }
      clouds.push(g)
    }
    ups.push((dt) => clouds.forEach((g) => { g.position.x += dt * 1.6; if (g.position.x > 70) { g.position.x = -70; g.position.z = rand(-30, 30) } }))

    /* ---------- lampes : légère pulsation (vivantes même de jour) ---------- */
    ups.push((dt, T) => lamps.forEach((l, i) => { l.material.opacity = .45 + Math.sin(T * 2 + i) * .08 }))

    /* =====================================================================================================
       Shaders « peints » partagés : vent dans les feuillages et lianes, matière peinte des murs et rochers
       ===================================================================================================== */
    const WIND = { value: 0 }
    ups.push((dt, T) => { WIND.value = T })
    const NOISE = `
      float hsh(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
        return mix(mix(mix(hsh(i), hsh(i + vec3(1,0,0)), f.x), mix(hsh(i + vec3(0,1,0)), hsh(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hsh(i + vec3(0,0,1)), hsh(i + vec3(1,0,1)), f.x), mix(hsh(i + vec3(0,1,1)), hsh(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm3(vec3 p){ return .55 * vnoise(p) + .3 * vnoise(p * 2.03) + .15 * vnoise(p * 4.1); }`
    /* vent : décalage proportionnel à la hauteur locale (feuilles) ou à l'attribut aSway (lianes : 0 en haut, 1 en bas) */
    function windify(m, { sway = false, amp = 1 } = {}) {
      if (m.userData.wind) return; m.userData.wind = 1
      const prev = m.onBeforeCompile
      m.onBeforeCompile = (sh, r) => {
        prev && prev.call(m, sh, r); sh.uniforms.uWind = WIND
        sh.vertexShader = (sway ? 'attribute float aSway;\n' : '') + 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float wgt = ${sway ? 'aSway * aSway * 2.2' : 'clamp(transformed.y * .22, 0., 1.6)'} * ${amp.toFixed(2)};
          vec3 wpos0 = (modelMatrix * vec4(transformed, 1.)).xyz;
          float ph = uWind * 1.6 + wpos0.x * .31 + wpos0.z * .23;
          transformed.x += (sin(ph) * .06 + sin(ph * 2.7) * .02) * wgt;
          transformed.z += cos(ph * 1.3) * .05 * wgt;
          transformed.y += sin(ph * 2.1) * .012 * wgt;`)
      }
      m.customProgramCacheKey = () => 'wind' + (sway ? 's' : 'h') + amp; m.needsUpdate = true
    }
    /* matière peinte : bruit en espace monde, crasse au pied, reflets de pinceau ; option strates et mousse (rochers) */
    function paintify(m, { ground = 0, rock = false } = {}) {
      if (m.userData.paint) return m; m.userData.paint = 1
      const prev = m.onBeforeCompile
      m.onBeforeCompile = (sh, r) => {
        prev && prev.call(m, sh, r); sh.uniforms.uGround = { value: ground }
        sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.)).xyz;')
        sh.fragmentShader = 'varying vec3 vWPos;\nuniform float uGround;\n' + NOISE + '\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float n = fbm3(vWPos * vec3(1.7, .9, 1.7));
          float streak = vnoise(vec3(vWPos.x * 7., vWPos.y * .7, vWPos.z * 7.));
          diffuseColor.rgb *= .88 + .18 * n + .05 * (streak - .5);
          diffuseColor.rgb *= mix(.7, 1., smoothstep(uGround, uGround + ${rock ? '1.1' : '.9'}, vWPos.y));
          ${rock ? `diffuseColor.rgb *= .9 + .1 * sin(vWPos.y * 7.5 + n * 4.);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.33, .55, .2), smoothstep(.58, .78, fbm3(vWPos * .9 + 3.)) * .45);` : ''}`)
      }
      m.customProgramCacheKey = () => 'paint' + (rock ? 'r' : 'w'); m.needsUpdate = true
      return m
    }
    /* fusion de géométries non indexées (position, normale, aSway) : une liane = une mesh par rocher, pas cent */
    function merge(list) {
      let n = 0; list.forEach((g) => (n += g.attributes.position.count))
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), sw = new Float32Array(n); let o = 0
      list.forEach((g) => { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.aSway) sw.set(g.attributes.aSway.array, o); o += c })
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('aSway', new THREE.BufferAttribute(sw, 1)); return g
    }

    /* ---------- végétation : vent dans les palmes, touffes, fougères et feuillages procéduraux ---------- */
    {
      const leafMaps = new Set(); try { Object.entries(VEGTEX).forEach(([k, t]) => { if (!/planches|stipe/.test(k)) leafMaps.add(t) }) } catch (e) {}
      const leafMats = new Set(); try { Object.values(LM).forEach((m) => leafMats.add(m)) } catch (e) {}
      const seen = new Set()
      s.traverse((o) => {
        if (!o.isMesh || !o.material || seen.has(o.material)) return
        const m = o.material; seen.add(m)
        if ((m.map && leafMaps.has(m.map)) || leafMats.has(m)) windify(m, { amp: m.map && /palme/.test(m.map.image && m.map.image.src || '') ? 1.3 : 1 })
      })
      // fleurs sur les buissons : quelques corolles vives, en instances (un appel de dessin par couleur)
      const bushGeo = new Set(); ;['buisson1', 'buisson2'].forEach((k) => c.ILE[k] && c.ILE[k].traverse((o) => { if (o.isMesh) bushGeo.add(o.geometry) }))
      const spots = []; const bb = new THREE.Box3()
      s.traverse((o) => { if (o.isMesh && bushGeo.has(o.geometry) && o.name === 'feuilles') { bb.setFromObject(o); const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, rx = (bb.max.x - bb.min.x) / 2, rz = (bb.max.z - bb.min.z) / 2; for (let i = 0; i < 4; i++) { const a = rand(0, 6.28), k = rand(.2, .8); spots.push([cx + Math.cos(a) * rx * k, bb.max.y - (1 - Math.sqrt(1 - k * k)) * (bb.max.y - bb.min.y) * .8 + .03, cz + Math.sin(a) * rz * k]) } } })
      const cols = ['#ff6fae', '#ffffff', '#ffd43b', '#ff8c42']
      cols.forEach((col, ci) => {
        const mine = spots.filter((_, i) => i % cols.length === ci); if (!mine.length) return
        const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09, 0), toon(col), mine.length), m4 = new THREE.Matrix4()
        mine.forEach((p, i) => { m4.makeScale(1, .6, 1).setPosition(p[0], p[1], p[2]); im.setMatrixAt(i, m4) }); s.add(im)
      })
    }

    /* ---------- l'avion : A320 aux couleurs de Talas (forge), train qui rentre au décollage ---------- */
    if (c.plane && P && P.loaded('avion-a320')) {
      const pl = c.plane, a = P.make('avion-a320', {}, { gradientMap: grad, outline: 1.03 })
      pl.children.forEach((ch) => (ch.visible = false))
      a.rotation.y = Math.PI / 2; a.position.y = hAt(pl.position.x, pl.position.z) - pl.position.y + .02
      a.traverse((m) => { if (m.isMesh) m.castShadow = true }); pl.add(a)
      const pp = parts(a), home = pl.userData.home ? pl.userData.home.clone() : pl.position.clone()
      let gear = 1
      ups.push((dt, T) => {
        ;['soufflante_g', 'soufflante_d'].forEach((k) => pp[k] && (pp[k].rotation.z += dt * (pl.position.distanceTo(home) > .1 ? 30 : 3.5)))
        if (pp.feux) pp.feux.visible = (T % 1.2) < .1
        const up = pl.position.y - home.y > .5; gear += ((up ? 0 : 1) - gear) * Math.min(1, dt * 2.5)
        ;['train_avant', 'train_principal'].forEach((k) => pp[k] && (pp[k].scale.y = Math.max(.02, gear), pp[k].visible = gear > .05))
      })
    }

    /* ---------- ateliers : matière peinte et entrée habillée (marches, auvent, jardinières, appliques) ---------- */
    {
      const accents = ['#e03131', '#7048e8', '#1c7ed6', '#f08c00', '#2f9e44', '#e64980', '#0ca678']
      const stripes = (col) => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const x = cv.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#fff8ec' : col; x.fillRect(i * 8, 0, 8, 8) } const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; return t }
      B.forEach((b, n) => {
        const glb = b.children.find((ch) => !ch.userData.sign && ch !== b.userData.sign && ch.type === 'Group') || b.children[0]
        if (!glb) return
        b.updateMatrixWorld(true)
        const wb = new THREE.Box3().setFromObject(glb), inv = new THREE.Matrix4().copy(b.matrixWorld).invert(), lb = new THREE.Box3()
        ;[[wb.min.x, wb.min.z], [wb.max.x, wb.min.z], [wb.min.x, wb.max.z], [wb.max.x, wb.max.z]].forEach(([x, z]) => lb.expandByPoint(V(x, wb.min.y, z).applyMatrix4(inv)))
        const g0 = wb.min.y
        glb.traverse((o) => { if (o.isMesh && o.material && !(o.material.map && o.material.transparent)) { o.material = paintify(o.material.clone(), { ground: g0 }) } })
        const fz = Math.min(lb.max.z, 3.2), w = Math.min(lb.max.x - lb.min.x, 5), acc = accents[n % accents.length]
        const e = new THREE.Group(); e.position.set(0, 0, fz); b.add(e)
        const stone = paintify(new THREE.MeshToonMaterial({ color: '#cfc6b4', gradientMap: grad }), { ground: g0 })
        mk(new THREE.BoxGeometry(1.7, .14, .5), stone, 0, .07, .22, e); mk(new THREE.BoxGeometry(1.5, .14, .3), stone, 0, .2, .1, e)
        const aw = new THREE.Group(); aw.position.set(0, 2.25, .05); aw.rotation.x = .42; e.add(aw)
        out(mk(new THREE.BoxGeometry(1.9, .05, .85), new THREE.MeshToonMaterial({ map: stripes(acc), gradientMap: grad }), 0, 0, .4, aw), 1.04)
        mk(new THREE.BoxGeometry(1.92, .16, .03), acc, 0, -.08, .83, aw) // lambrequin
        ;[-1, 1].forEach((sd) => {
          const pot = out(mk(new THREE.CylinderGeometry(.26, .2, .42, 12), paintify(new THREE.MeshToonMaterial({ color: '#c8653a', gradientMap: grad }), { ground: g0 }), sd * 1.12, .21, .45, e), 1.06)
          if (c.ILE.fougere) { const f = c.ILE.fougere.clone(); f.scale.setScalar(.42); f.position.set(sd * 1.12, .4, .45); f.rotation.y = rand(0, 6); e.add(f) }
          const lamp = new THREE.Group(); lamp.position.set(sd * .82, 1.95, .06); e.add(lamp)
          out(mk(new THREE.BoxGeometry(.16, .24, .16), '#2b2233', 0, 0, .08, lamp), 1.08); mk(new THREE.BoxGeometry(.11, .15, .12), new THREE.MeshBasicMaterial({ color: '#ffe8a3' }), 0, -.01, .09, lamp)
          const gl = glow('#ffd873', .9, lamp); gl.position.set(0, 0, .18); lamps.push(gl)
        })
        // socle en pierre : un bandeau autour de l'emprise, qui ancre le bâtiment dans le sol
        const cx = (lb.min.x + lb.max.x) / 2, cz = (lb.min.z + lb.max.z) / 2
        mk(new THREE.BoxGeometry(Math.min(w + .18, 5.2), .3, Math.min(lb.max.z - lb.min.z, 5) + .18), stone, cx, .12, cz, b).castShadow = false
      })
    }

    /* ---------- rochers en mer : strates, mousse, lianes qui pendent et ondulent, écume, touffes et goélands ---------- */
    if (c.ILE.pilier) {
      const pg = new Set(); c.ILE.pilier.traverse((o) => { if (o.isMesh) pg.add(o.geometry) })
      const rocks = s.children.filter((o) => { let hit = false; o.traverse((m) => { if (m.isMesh && pg.has(m.geometry)) hit = true }); return hit && o.position.y < 0 })
      const vineMat = new THREE.MeshToonMaterial({ color: '#3f6b2a', gradientMap: grad }); windify(vineMat, { sway: true, amp: 1 })
      const leafMat = new THREE.MeshToonMaterial({ color: '#5fa83a', gradientMap: grad, side: THREE.DoubleSide }); windify(leafMat, { sway: true, amp: 1 })
      const flowerMat = new THREE.MeshToonMaterial({ color: '#ff7eb6', gradientMap: grad, side: THREE.DoubleSide }); windify(flowerMat, { sway: true, amp: 1 })
      const rockMats = new Map()
      rocks.forEach((rk, ri) => {
        // les « mousses » d'origine sont des pointes vertes rigides : on les masque et la végétation est refaite plus bas ;
        // elles sont aussi exclues de l'emprise et des lancers de rayon, pour que tout s'appuie sur la roche elle-même
        const meshes = []; rk.traverse((m) => {
          if (!m.isMesh) return
          if (/mousse/.test(m.name) || /mousse/.test(m.parent && m.parent.name || '')) { m.visible = false; return }
          meshes.push(m); if (!m.material.map) { if (!rockMats.has(m.material)) rockMats.set(m.material, paintify(m.material.clone(), { ground: SEA, rock: true })); m.material = rockMats.get(m.material) }
        })
        rk.updateMatrixWorld(true)
        const box = new THREE.Box3(); meshes.forEach((m) => box.expandByObject(m))
        const ctr = box.getCenter(V(0, 0, 0)), top = box.max.y, Hh = top - SEA, R0 = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2
        if (Hh < 1) return
        ;(window.TALAS_ILE.rocks = window.TALAS_ILE.rocks || []).push({ x: ctr.x, z: ctr.z, top, R0 }) // cadrages des comptes rendus
        const surf = (ang, y) => { // rayon de la surface à cette hauteur : lancer de rayon horizontal vers l'axe du rocher
          const dir = V(Math.cos(ang), 0, Math.sin(ang)), from = V(ctr.x + dir.x * R0 * 2.2, y, ctr.z + dir.z * R0 * 2.2)
          ray.set(from, dir.clone().negate()); const h = ray.intersectObjects(meshes, false)[0]
          return h ? h.point.add(dir.multiplyScalar(.06)) : null
        }
        const vines = [], leaves = [], flowers = [], nV = Math.round(8 + R0 * 3)
        for (let i = 0; i < nV; i++) {
          const ang = (i / nV) * Math.PI * 2 + rand(-.2, .2), len = rand(.35, .85) * Hh, pts = []
          for (let k = 0; k <= 6; k++) { const y = top - .25 - len * k / 6, p = surf(ang, y); if (p) pts.push(p); else if (pts.length) pts.push(pts[pts.length - 1].clone().add(V(0, -len / 6, 0))) }
          if (pts.length < 3) continue
          const curve = new THREE.CatmullRomCurve3(pts), tube = new THREE.TubeGeometry(curve, 18, .035 + R0 * .004, 5).toNonIndexed()
          const pp = tube.attributes.position, sw = new Float32Array(pp.count)
          for (let v = 0; v < pp.count; v++) sw[v] = Math.max(0, Math.min(1, (top - pp.getY(v)) / Hh))
          tube.setAttribute('aSway', new THREE.BufferAttribute(sw, 1)); vines.push(tube)
          // feuilles alternées le long de la liane, fleurs de temps en temps
          const nl = Math.round(curve.getLength() / .22)
          for (let k = 1; k < nl; k++) {
            const t = k / nl, p = curve.getPoint(t), tg = curve.getTangent(t), side = V(-tg.z, 0, tg.x).normalize().multiplyScalar(k % 2 ? 1 : -1)
            const out2 = V(p.x - ctr.x, 0, p.z - ctr.z).normalize(), sz = rand(.1, .17)
            const a0 = p.clone(), tip = p.clone().add(side.clone().multiplyScalar(sz * 1.6)).add(out2.clone().multiplyScalar(sz * .6)).add(V(0, -sz * .5, 0))
            const w1 = p.clone().lerp(tip, .5).add(V(0, sz * .45, 0)), w2 = p.clone().lerp(tip, .5).add(V(0, -sz * .45, 0))
            const tri = [a0, w1, tip, a0, tip, w2], target = (rand(0, 1) < .08) ? flowers : leaves
            const sw0 = Math.max(0, Math.min(1, (top - p.y) / Hh))
            target.push(tri, sw0)
          }
        }
        const fromTris = (arr) => {
          if (!arr.length) return null
          const nT = arr.length / 2, pos = new Float32Array(nT * 18), nor = new Float32Array(nT * 18), sw = new Float32Array(nT * 6)
          for (let i = 0; i < nT; i++) {
            const tri = arr[i * 2], s0 = arr[i * 2 + 1]
            const nrm = V(0, 0, 0).subVectors(tri[1], tri[0]).cross(V(0, 0, 0).subVectors(tri[2], tri[0])).normalize()
            tri.forEach((p, k) => { pos.set([p.x, p.y, p.z], i * 18 + k * 3); nor.set([nrm.x, nrm.y, nrm.z], i * 18 + k * 3); sw[i * 6 + k] = s0 })
          }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('aSway', new THREE.BufferAttribute(sw, 1)); return g
        }
        if (vines.length) { const m = new THREE.Mesh(merge(vines), vineMat); m.castShadow = true; s.add(m) }
        const lg = fromTris(leaves); if (lg) s.add(new THREE.Mesh(lg, leafMat))
        const fg = fromTris(flowers); if (fg) s.add(new THREE.Mesh(fg, flowerMat))
        // écume au pied
        const ringR = (surf(0, SEA + .1) ? surf(0, SEA + .1).distanceTo(V(ctr.x, SEA + .1, ctr.z)) : R0 * .8)
        const foam = new THREE.Mesh(new THREE.RingGeometry(ringR * .98, ringR * 1.28, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, depthWrite: false }))
        foam.rotation.x = -Math.PI / 2; foam.position.set(ctr.x, SEA + .05, ctr.z); s.add(foam)
        const ph = rand(0, 6); ups.push((dt, T) => { const k = (Math.sin(T * 1.4 + ph) + 1) / 2; foam.scale.setScalar(1 + k * .12); foam.material.opacity = .3 + (1 - k) * .4 })
        /* chapeau végétal : jupe de mousse à lobes qui coule sur le rebord, coussin bosselé au sommet,
           rideau de fougères arquées qui pendent et ondulent, touffes et petit palmier */
        const capY = top - .12, capRs = []
        for (let k = 0; k < 12; k++) { const p = surf(k / 12 * Math.PI * 2, capY - .1); capRs.push(p ? Math.hypot(p.x - ctr.x, p.z - ctr.z) : R0 * .8) }
        const capR = capRs.reduce((a, b) => a + b, 0) / capRs.length, radAt = (a) => { const f = ((a / (Math.PI * 2)) % 1 + 1) % 1 * 12, i = Math.floor(f), u = f - i; return capRs[i % 12] * (1 - u) + capRs[(i + 1) % 12] * u }
        {
          const sk = new THREE.CylinderGeometry(1, 1, 1, 56, 8, true), p = sk.attributes.position, ph1 = rand(0, 6), ph2 = rand(0, 6)
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = .5 - y // 0 en haut, 1 en bas
            // coulures franches : quelques grandes langues de mousse, des moyennes, et un bord qui ne descend presque pas entre elles
            const lobe = .12 + 1.1 * Math.pow(Math.abs(Math.sin(a * 2.5 + ph1)), 6) + .55 * Math.pow(Math.abs(Math.sin(a * 6 + ph2)), 5) + .25 * Math.pow(Math.abs(Math.sin(a * 13 + ph1 * 2)), 4)
            const r = radAt(a) + .07 + Math.sin(t * Math.PI) * .07 - t * t * .09
            p.setXYZ(i, Math.cos(a) * r, -t * lobe * (.8 + R0 * .3), Math.sin(a) * r)
          }
          sk.computeVertexNormals()
          const moss = paintify(new THREE.MeshToonMaterial({ color: '#4f9a33', gradientMap: grad, side: THREE.DoubleSide }), { ground: SEA })
          const skirt = new THREE.Mesh(sk, moss); skirt.position.set(ctr.x, capY + .02, ctr.z); s.add(skirt)
          for (let k = 0; k < 6; k++) { // coussin : quelques bosses aplaties qui cassent la ligne du sommet
            const a = rand(0, 6.28), d = rand(0, capR * .6), b = new THREE.Mesh(new THREE.SphereGeometry(capR * rand(.28, .45), 12, 8), moss)
            b.scale.y = .32; b.position.set(ctr.x + Math.cos(a) * d, top - .02, ctr.z + Math.sin(a) * d); s.add(b)
          }
        }
        if (typeof vegTex === 'function') {
          const frondMat = new THREE.MeshLambertMaterial({ map: vegTex('fougere'), alphaTest: .5, side: THREE.DoubleSide }); windify(frondMat, { sway: true, amp: 1.3 })
          const nF = Math.round(12 + R0 * 4), fr = []
          for (let i = 0; i < nF; i++) {
            const a = (i / nF) * Math.PI * 2 + rand(-.15, .15), out = V(Math.cos(a), 0, Math.sin(a)), side = V(-Math.sin(a), 0, Math.cos(a))
            const base = V(ctr.x, capY + .06, ctr.z).add(out.clone().multiplyScalar(radAt(a) + .12)), Lf = rand(1.3, 2.3) * (.6 + R0 * .2), Wd = Lf * .27, SEG = 8
            const pos = [], uv = [], sw = [], idx = []
            for (let k = 0; k <= SEG; k++) {
              const u = k / SEG, arc = u * Math.PI / 2 * rand(.95, 1.05)
              // la fronde part vers l'extérieur en montant un peu, puis s'arque et retombe
              const c0 = base.clone().add(out.clone().multiplyScalar(Math.sin(arc) * Lf * .62)).add(V(0, (Math.cos(arc) - 1) * Lf * .8 + Math.sin(u * Math.PI) * Lf * .28, 0))
              ;[-1, 1].forEach((sd) => { const q = c0.clone().add(side.clone().multiplyScalar(sd * Wd * .5 * (1 - u * .35))); pos.push(q.x, q.y, q.z); uv.push(1 - u, sd < 0 ? 0 : 1); sw.push(u * .8) })
              if (k) { const b0 = (k - 1) * 2; idx.push(b0, b0 + 1, b0 + 2, b0 + 1, b0 + 3, b0 + 2) }
            }
            const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(sw, 1)); g.setIndex(idx); g.computeVertexNormals()
            fr.push(g.toNonIndexed())
          }
          // fusion avec les UV (merge() ne porte que position/normale/aSway)
          let n = 0; fr.forEach((g) => (n += g.attributes.position.count))
          const P3 = new Float32Array(n * 3), N3 = new Float32Array(n * 3), U2 = new Float32Array(n * 2), S1 = new Float32Array(n); let o = 0
          fr.forEach((g) => { const cN = g.attributes.position.count; P3.set(g.attributes.position.array, o * 3); N3.set(g.attributes.normal.array, o * 3); U2.set(g.attributes.uv.array, o * 2); S1.set(g.attributes.aSway.array, o); o += cN })
          const fg2 = new THREE.BufferGeometry(); fg2.setAttribute('position', new THREE.BufferAttribute(P3, 3)); fg2.setAttribute('normal', new THREE.BufferAttribute(N3, 3)); fg2.setAttribute('uv', new THREE.BufferAttribute(U2, 2)); fg2.setAttribute('aSway', new THREE.BufferAttribute(S1, 1))
          const fm = new THREE.Mesh(fg2, frondMat); fm.castShadow = true; s.add(fm)
        }
        if (c.ILE.fougere) for (let k = 0; k < 3; k++) { const f = c.ILE.fougere.clone(); f.scale.setScalar(rand(.5, .8)); const a = rand(0, 6.28), d = rand(0, capR * .5); f.position.set(ctr.x + Math.cos(a) * d, top, ctr.z + Math.sin(a) * d); f.rotation.y = rand(0, 6); s.add(f) }
        if (c.ILE.palmier2 && ri % 2 === 0) { const p = c.ILE.palmier2.clone(); p.scale.setScalar(rand(.32, .45)); p.position.set(ctr.x + rand(-.3, .3), top - .05, ctr.z + rand(-.3, .3)); p.rotation.y = rand(0, 6); s.add(p) }
        // goéland sur un rocher sur trois
        if (c.ILE.goeland && ri % 3 === 0) {
          const gl = c.ILE.goeland.clone(); gl.scale.setScalar(.9); gl.position.set(ctr.x + R0 * .2, top - .05, ctr.z); gl.rotation.y = rand(0, 6); s.add(gl)
          const wings = ['aile_L', 'aile_R'].map((nm) => gl.getObjectByName(nm)).filter(Boolean), gp = rand(0, 20)
          ups.push((dt, T) => { const flap = ((T + gp) % 7) < .5; wings.forEach((w, i) => (w.rotation.z = flap ? Math.sin(T * 30) * .6 * (i ? 1 : -1) : 0)); gl.position.y = top - .05 + (flap ? .04 : 0) })
        }
      })
    }

    return { update(dt, T) { for (const f of ups) f(dt, T) } }
  }

  window.TALAS_ILE = { on, preload, decorate, props: PROPS }
})()

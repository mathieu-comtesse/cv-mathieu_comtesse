/* LE FANTÔME DE TALAS : une boule (la tête) sur laquelle un drap est drapé. Le drap est une vraie simulation de tissu (Verlet, contraintes de
 * distance, collision avec la sphère de la tête, ressort de forme, vent échantillonné dans le bruit partagé) ; il traîne derrière les mouvements du
 * fantôme comme un voile. Le visage, les griffes et les antennes sont des pièces rigides accrochées à la tête.
 *
 *   TALAS_FANTOME.creer()  -> Group compatible avec l'ancien ghostMesh() : userData.{b, tail[], eyes[], mouth, tongue, hands[], slippers[], wm}
 *                             + userData.tick(dt, T) à appeler chaque image, userData.queue() = position monde de la pointe du drap.
 * Dépend de : talas-monde.js (bruit, halo), talas-rendu.js (activé). Les pantoufles utilisent slipperMesh() du jeu. */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE, RD = window.TALAS_RENDU
  if (!THREE || !M || !RD || !RD.on) return
  const F = window.TALAS_FANTOME = {}
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const COLS = 22, ROWS = 27, TETE = 9, RH = 1.0, HY = .25, LONG = 2.8, N = COLS * ROWS

  /* forme de repos du drap dans le repère du fantôme (+z = devant) : calotte sphérique puis queue effilée */
  const REPOS = new Float32Array(N * 3), TQ = new Float32Array(ROWS)
  ;(function () {
    const th1 = 1.75, r0 = RH * Math.sin(th1), y0 = HY + RH * 1.1 * Math.cos(th1)
    for (let j = 0; j < ROWS; j++) {
      let r, y, t = 0
      if (j < TETE) { const th = j / (TETE - 1) * th1; r = RH * Math.sin(th); y = HY + RH * 1.1 * Math.cos(th) }
      else { t = (j - TETE + 1) / (ROWS - TETE); r = r0 * (1 + .34 * Math.sin(t * Math.PI * .9)) * Math.pow(1 - t, .8) + .015; y = y0 - t * LONG }
      TQ[j] = t
      for (let c = 0; c < COLS; c++) { const a = c / COLS * Math.PI * 2, k = (j * COLS + c) * 3; REPOS[k] = Math.sin(a) * r; REPOS[k + 1] = y; REPOS[k + 2] = Math.cos(a) * r }
    }
  })()
  /* longueurs au repos des contraintes : vers la colonne suivante, vers la rangée suivante */
  const LC = new Float32Array(N), LR = new Float32Array(N)
  for (let j = 0; j < ROWS; j++) for (let c = 0; c < COLS; c++) {
    const i = j * COLS + c, ic = j * COLS + (c + 1) % COLS, ir = (j + 1) * COLS + c, d = (a, b) => Math.hypot(REPOS[a * 3] - REPOS[b * 3], REPOS[a * 3 + 1] - REPOS[b * 3 + 1], REPOS[a * 3 + 2] - REPOS[b * 3 + 2])
    LC[i] = d(i, ic); LR[i] = j < ROWS - 1 ? d(i, ir) : 0
  }
  /* raideur du ressort de forme : forte près de la tête, faible au bout de la queue (le drap flotte) */
  const RAID = new Float32Array(ROWS); for (let j = 0; j < ROWS; j++) RAID[j] = j < TETE ? 0 : 70 * Math.pow(1 - TQ[j], 1.3) + 5

  /* matériau du corps : lueur d'ectoplasme, liseré clair sur les bords, volutes qui montent, queue qui s'efface */
  let matCorps = null
  function corps() {
    if (matCorps) return matCorps
    matCorps = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uCore: { value: new THREE.Color('#0b8f86') }, uGlow: { value: new THREE.Color('#4dffc6') }, uRim: { value: new THREE.Color('#c9fff3') }, uAlpha: { value: 1 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec2 vUv;
        void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform float uT; uniform vec3 uCore; uniform vec3 uGlow; uniform vec3 uRim; uniform float uAlpha; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec2 vUv;
        ${M.GLSL.bruit}
        void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; vec3 v = normalize(vV);
          float fr = pow(1. - clamp(dot(n, v), 0., 1.), 2.3);
          float sw = twN(vW.xz * 1.25 + vec2(0., vW.y * .9 - uT * .7)) * .6 + twN(vW.xz * 3.1 - vec2(uT * .4, vW.y * 1.7)) * .4;
          vec3 col = mix(uCore, uGlow, sw * .8 + .1);
          col = mix(col, uRim, fr);
          col += uGlow * smoothstep(.62, .9, sw) * .45;
          float a = mix(.72, .98, fr) * (1. - smoothstep(.7, 1., vUv.y) * .78);
          gl_FragColor = vec4(col, a * uAlpha); }`
    })
    return matCorps
  }

  F.creer = function () {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b)
    const U = g.userData; U.b = b
    const mBasic = (c) => new THREE.MeshBasicMaterial({ color: c }), mToon = (c, o) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad }, o || {}))
    const mc = corps()

    /* ---- le drap : géométrie en grille, positions réécrites à chaque image ---- */
    const pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = []
    for (let j = 0; j < ROWS; j++) for (let c = 0; c < COLS; c++) { const i = j * COLS + c; uv[i * 2] = c / COLS; uv[i * 2 + 1] = j / (ROWS - 1); pos[i * 3] = REPOS[i * 3]; pos[i * 3 + 1] = REPOS[i * 3 + 1]; pos[i * 3 + 2] = REPOS[i * 3 + 2] }
    for (let j = 0; j < ROWS - 1; j++) for (let c = 0; c < COLS; c++) { const a = j * COLS + c, bb = j * COLS + (c + 1) % COLS, d = (j + 1) * COLS + c, e = (j + 1) * COLS + (c + 1) % COLS; idx.push(a, d, bb, bb, d, e) }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx)
    const drap = new THREE.Mesh(geo, mc); drap.frustumCulled = false; drap.renderOrder = 6; g.add(drap)
    // halo d'ectoplasme : le même drap, un peu plus grand et très transparent
    const mAura = mc.clone(); mAura.uniforms.uAlpha.value = .3; const aura = new THREE.Mesh(geo, mAura); aura.frustumCulled = false; aura.renderOrder = 5; aura.scale.setScalar(1.16); aura.position.y = HY * (1 - 1.16); g.add(aura)

    /* ---- visage (pièces rigides sur la tête, posées juste devant la surface du drap) ---- */
    const rcy = (dy) => RH * Math.sqrt(Math.max(.01, 1 - (dy / (RH * 1.1)) ** 2)), zc = (x, dy) => Math.sqrt(Math.max(0, rcy(dy) ** 2 - x * x)) // rayon et profondeur de la tête à la hauteur dy
    const oeilDy = .22
    const yeux = [-1, 1].map((q) => { // groupe décalé pour que le jeu pilote la pupille à y ≈ .72 comme avant
      const gr = new THREE.Group(); gr.position.set(0, HY + oeilDy - .72, 0); b.add(gr)
      const zo = zc(.36, oeilDy) + .05
      const blanc = new THREE.Mesh(new THREE.SphereBufferGeometry(1, 16, 12), mBasic('#ffe23f')); blanc.scale.set(.23, .2, .1); blanc.position.set(q * .36, .72, zo); blanc.rotation.z = -q * .28; gr.add(blanc)
      const cerc = new THREE.Mesh(new THREE.TorusBufferGeometry(1, .085, 6, 22), mBasic('#3a1c02')); cerc.scale.set(.23, .2, .1); cerc.position.set(q * .36, .72, zo + .012); cerc.rotation.z = blanc.rotation.z; gr.add(cerc)
      const pup = new THREE.Mesh(new THREE.SphereBufferGeometry(1, 10, 8), mBasic('#160822')); pup.scale.set(.05, .16, .05); pup.position.set(q * .36, .72, zo + .1); gr.add(pup)
      return pup
    })
    U.eyes = yeux
    ;[-1, 1].forEach((q) => { // sourcils en colère
      const dy = .53, sc = new THREE.Mesh(new THREE.BoxBufferGeometry(.44, .09, .1), mToon('#0a4d57')); sc.position.set(q * .38, HY + dy, zc(.38, dy) + .05); sc.rotation.z = q * .5; sc.rotation.y = -q * .3; b.add(sc)
    })
    const mDy = -.3
    const bouche = new THREE.Mesh(new THREE.SphereBufferGeometry(.2, 16, 12), mBasic('#340a52')); bouche.scale.set(2.3, 1.2, .6); bouche.position.set(0, HY + mDy, zc(0, mDy) + .03); b.add(bouche); U.mouth = bouche
    const lv = new THREE.Mesh(new THREE.SphereBufferGeometry(.2, 10, 8), mBasic('#d04ca8')); lv.scale.set(.7, .5, .6); lv.position.set(.02, -.05, .05); bouche.add(lv); U.tongue = lv
    ;[-.36, -.2, .2, .36].forEach((x, i) => { // crocs du haut
      const dent = new THREE.Mesh(new THREE.ConeBufferGeometry(.075, i === 1 || i === 2 ? .34 : .22, 6), mToon('#f4fff8')); dent.rotation.x = Math.PI; dent.position.set(x, HY + mDy + .15, zc(x, mDy + .15) + .05); b.add(dent)
    })
    ;[-.27, .27].forEach((x) => { const dent = new THREE.Mesh(new THREE.ConeBufferGeometry(.06, .22, 6), mToon('#f4fff8')); dent.position.set(x, HY + mDy - .14, zc(x, mDy - .14) + .05); b.add(dent) })

    /* ---- antennes ---- */
    U.antennes = [-1, 1].map((q) => {
      const gr = new THREE.Group(); gr.position.set(q * .2, HY + RH * 1.02, .05); b.add(gr)
      const cv = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(q * .12, .35, 0), V3(q * .34, .68, .05), V3(q * .3, .95, .1)])
      gr.add(new THREE.Mesh(new THREE.TubeBufferGeometry(cv, 12, .03, 6), mc))
      const bout = new THREE.Mesh(new THREE.SphereBufferGeometry(.075, 8, 6), mBasic('#d8fff4')); bout.position.set(q * .3, .95, .1); gr.add(bout)
      return gr
    })

    /* ---- bras et griffes : le jeu fait pivoter les groupes `hands` autour de l'épaule (rotation.z) ---- */
    U.hands = [-1, 1].map((q) => {
      const h = new THREE.Group(); h.position.set(q * .8, HY - .1, .12); b.add(h)
      const dir = V3(q * 1.0, -.1, .6).normalize(), L = 1.8
      const bras = new THREE.Mesh(new THREE.CylinderBufferGeometry(.11, .3, L, 12, 1, true), mc); bras.position.copy(dir).multiplyScalar(L / 2); bras.quaternion.setFromUnitVectors(V3(0, 1, 0), dir); h.add(bras)
      const main = new THREE.Group(); main.position.copy(dir).multiplyScalar(L); h.add(main)
      const paume = new THREE.Mesh(new THREE.SphereBufferGeometry(.27, 12, 8), mc); paume.scale.set(1, .8, 1); main.add(paume)
      for (let k = 0; k < 4; k++) {
        const a = (k - 1.5) * .36, doigt = new THREE.Mesh(new THREE.ConeBufferGeometry(.06, .68, 6), mToon('#dffff6')); doigt.geometry.translate(0, .34, 0)
        doigt.rotation.set(Math.PI / 2 + .35, 0, -a * q); doigt.position.set(Math.sin(a) * .2, -.02, .14); main.add(doigt)
      }
      return h
    })

    /* ---- pantoufles (elles servent de projectiles dans le mini-jeu) ---- */
    U.slippers = [-1, 1].map((q) => { const sl = typeof slipperMesh === 'function' ? slipperMesh() : new THREE.Group(); sl.scale.setScalar(1.25); sl.position.set(q * .42, -2.1, .3); b.add(sl); return sl })

    /* ---- halo, et éléments fictifs pour l'ancienne interface (la queue est désormais le drap) ---- */
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.peintre.halo(), color: '#37f5b8', transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); halo.scale.setScalar(7.5); halo.position.set(0, HY - .6, -.3); b.add(halo); U.halo = halo
    U.tail = [0, 1, 2, 3, 4, 5].map(() => new THREE.Object3D()); U.wm = mBasic('#ffffff')

    /* ---- simulation ---- */
    const P = new Float32Array(N * 3), Pp = new Float32Array(N * 3), CB = new Float32Array(N * 3)
    const inv = new THREE.Matrix4(), tmp = V3(0, 0, 0)
    let init = false, dernier = V3(0, 0, 0), sc0 = 1, tps = 0
    const cible = (T, bw) => { // positions monde cibles de chaque point : forme de repos + ondulation de la queue, dans le repère de la tête
      const e = bw.elements
      for (let j = 0; j < ROWS; j++) {
        const t = TQ[j], ph = T * 1.7 + t * 4.2
        for (let c = 0; c < COLS; c++) {
          const i = (j * COLS + c) * 3, om = c / COLS * 6.283
          const x = REPOS[i] + (t > 0 ? Math.sin(ph + om * .5) * .3 * Math.pow(t, 1.2) + Math.sin(T * .9 + t * 2) * .35 * t * t : 0)
          const y = REPOS[i + 1] + (t > 0 ? Math.sin(T * 2.1 + t * 5 + om) * .05 * t : 0)
          const z = REPOS[i + 2] + (t > 0 ? Math.cos(T * 1.3 + t * 3.6 + om * .5) * .26 * t : 0)
          CB[i] = e[0] * x + e[4] * y + e[8] * z + e[12]; CB[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; CB[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]
        }
      }
    }
    const reset = () => { for (let i = 0; i < N * 3; i++) { P[i] = CB[i]; Pp[i] = CB[i] } init = true }
    U.tick = function (dt, T) {
      if (dt <= 0) return
      dt = Math.min(dt, 1 / 30); mc.uniforms.uT.value = T; mAura.uniforms.uT.value = T + 1.7
      g.updateMatrixWorld(true)
      const sc = g.scale.x
      drap.visible = aura.visible = sc > .05
      // antennes qui oscillent
      U.antennes.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (Math.sin(T * 3.1 + i * 2) * .14 + .05); a.rotation.x = Math.sin(T * 2.3 + i) * .1 })
      if (sc < .2) { init = false; sc0 = sc; return }
      const bw = b.matrixWorld
      cible(T, bw)
      tmp.setFromMatrixPosition(bw)
      if (!init || (sc0 < .9 && sc >= .9) || tmp.distanceToSquared(dernier) > 16) reset()
      dernier.copy(tmp); sc0 = sc
      const e = bw.elements, hx = e[12] + e[4] * HY, hy = e[13] + e[5] * HY, hz = e[14] + e[6] * HY, rc = RH * 1.06 * sc
      const damp = Math.pow(.08, dt), d2 = dt * dt
      for (let j = 0; j < ROWS; j++) {
        for (let c = 0; c < COLS; c++) {
          const i = (j * COLS + c) * 3
          if (j < TETE) { P[i] = Pp[i] = CB[i]; P[i + 1] = Pp[i + 1] = CB[i + 1]; P[i + 2] = Pp[i + 2] = CB[i + 2]; continue }
          const k = RAID[j], w = M.vent(P[i], P[i + 2], T)
          const x = P[i], y = P[i + 1], z = P[i + 2]
          const ax = (CB[i] - x) * k + (w[0] - .7) * 1.6, ay = (CB[i + 1] - y) * k - 3.2, az = (CB[i + 2] - z) * k + (w[2] - .5) * 1.4
          P[i] = x + (x - Pp[i]) * damp + ax * d2; P[i + 1] = y + (y - Pp[i + 1]) * damp + ay * d2; P[i + 2] = z + (z - Pp[i + 2]) * damp + az * d2
          Pp[i] = x; Pp[i + 1] = y; Pp[i + 2] = z
        }
      }
      for (let it = 0; it < 3; it++) {
        for (let j = TETE - 1; j < ROWS; j++) for (let c = 0; c < COLS; c++) {
          const a = j * COLS + c
          // vers la colonne suivante
          let bI = j * COLS + (c + 1) % COLS
          if (j >= TETE) rel(a, bI, LC[a] * sc, j < TETE, j < TETE)
          // vers la rangée suivante
          if (j < ROWS - 1) rel(a, (j + 1) * COLS + c, LR[a] * sc, j < TETE, false)
        }
        // collision avec la sphère de la tête
        for (let j = TETE; j < TETE + 7; j++) for (let c = 0; c < COLS; c++) {
          const i = (j * COLS + c) * 3, dx = P[i] - hx, dy = P[i + 1] - hy, dz = P[i + 2] - hz, d = Math.hypot(dx, dy, dz)
          if (d < rc) { const f = rc / (d || 1e-4); P[i] = hx + dx * f; P[i + 1] = hy + dy * f; P[i + 2] = hz + dz * f }
        }
      }
      function rel(a, bIdx, L, fa, fb) {
        const ia = a * 3, ib = bIdx * 3, dx = P[ib] - P[ia], dy = P[ib + 1] - P[ia + 1], dz = P[ib + 2] - P[ia + 2], d = Math.hypot(dx, dy, dz) || 1e-5, diff = (d - L) / d
        if (fa && fb) return
        const wa = fa ? 0 : fb ? 1 : .5, wb = fb ? 0 : fa ? 1 : .5
        P[ia] += dx * diff * wa; P[ia + 1] += dy * diff * wa; P[ia + 2] += dz * diff * wa; P[ib] -= dx * diff * wb; P[ib + 1] -= dy * diff * wb; P[ib + 2] -= dz * diff * wb
      }
      // écriture dans le repère du fantôme
      inv.copy(g.matrixWorld).invert(); const q = inv.elements
      for (let i = 0; i < N * 3; i += 3) {
        const x = P[i], y = P[i + 1], z = P[i + 2]
        pos[i] = q[0] * x + q[4] * y + q[8] * z + q[12]; pos[i + 1] = q[1] * x + q[5] * y + q[9] * z + q[13]; pos[i + 2] = q[2] * x + q[6] * y + q[10] * z + q[14]
      }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals()
    }
    U.queue = () => { const i = ((ROWS - 1) * COLS) * 3; return init ? tmp.set(P[i], P[i + 1], P[i + 2]) : g.getWorldPosition(tmp) }
    // état de départ : le drap est déjà en place au premier affichage
    g.updateMatrixWorld(true); cible(0, b.matrixWorld); reset()
    const q0 = new THREE.Matrix4().copy(g.matrixWorld).invert().elements
    for (let i = 0; i < N * 3; i += 3) { const x = P[i], y = P[i + 1], z = P[i + 2]; pos[i] = q0[0] * x + q0[4] * y + q0[8] * z + q0[12]; pos[i + 1] = q0[1] * x + q0[5] * y + q0[9] * z + q0[13]; pos[i + 2] = q0[2] * x + q0[6] * y + q0[10] * z + q0[14] }
    geo.computeVertexNormals()
    return g
  }
})()

/* AMBIANCE DES MINI-JEUX : la mise en lumière ajoutée par-dessus les mini-jeux existants, sans toucher à leur logique.
 * Chaque mini-jeu est enveloppé ; quand il pose sa boucle d'animation (R.extra), l'ambiance construit ses effets dans R.stage
 * (effacés avec le jeu) et les anime en même temps que lui.
 *   karaoké  : faisceaux colorés qui balayent le plateau, boule à facettes et ses éclats sur le sol, halos qui battent avec la mesure
 *   revue    : projecteurs de plateau télé, halos au sol, poussière de lumière
 *   budget   : rayons de soleil par les verrières de l'atelier, halos colorés sous chaque poste, poussière
 *   festin   : suspensions chaudes au-dessus des tables, vapeur qui monte des assiettes
 *   chirurgie: scialytique (grande lampe d'opération) et poussière de lumière
 * Tout est additif, sans ombre ni texture externe. ?ambiance=non désactive. */
(function () {
  'use strict'
  const THREE = window.THREE
  if (!THREE) return
  const A = window.TALAS_AMBIANCE = { on: !/[?&]ambiance=non/.test(location.search), pret: false }
  if (!A.on) return
  const V3 = THREE.Vector3

  /* ---------------------------------------------------------------------------------------------- briques */
  let TEX = null
  function doux() {   // disque flou blanc -> transparent
    if (TEX) return TEX
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64)
    return (TEX = new THREE.CanvasTexture(c))
  }
  const ADD = (o) => Object.assign({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }, o)

  /* cône de lumière : sommet à l'origine du groupe, pointe vers -y ; le groupe se pilote par sa rotation */
  function faisceau(couleur, r, h, opa) {
    const g = new THREE.Group(), geo = new THREE.ConeGeometry(r, h, 28, 1, true); geo.translate(0, -h / 2, 0)
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial(ADD({ color: couleur, opacity: opa, side: THREE.DoubleSide })))
    m.renderOrder = 4; m.castShadow = m.receiveShadow = false; g.add(m); g.userData.mat = m.material; g.userData.h = h; return g
  }
  /* flaque de lumière posée au sol */
  function flaque(couleur, r, opa) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial(ADD({ color: couleur, opacity: opa, map: doux() })))
    m.rotation.x = -Math.PI / 2; m.position.y = .04; m.renderOrder = 3; return m
  }
  /* poussière de lumière : points qui dérivent dans une boîte */
  function poussiere(n, box, couleur, taille, opa) {
    const pos = new Float32Array(n * 3), ph = new Float32Array(n)
    for (let i = 0; i < n; i++) { pos[i * 3] = box[0] + Math.random() * (box[3] - box[0]); pos[i * 3 + 1] = box[1] + Math.random() * (box[4] - box[1]); pos[i * 3 + 2] = box[2] + Math.random() * (box[5] - box[2]); ph[i] = Math.random() * 6.28 }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial(ADD({ color: couleur, size: taille, map: doux(), opacity: opa, sizeAttenuation: true })))
    pts.frustumCulled = false; pts.renderOrder = 5
    pts.userData.maj = (dt, T) => { const a = geo.attributes.position.array; for (let i = 0; i < n; i++) { a[i * 3 + 1] += dt * (.08 + .05 * Math.sin(ph[i])); a[i * 3] += Math.sin(T * .3 + ph[i]) * dt * .12; if (a[i * 3 + 1] > box[4]) a[i * 3 + 1] = box[1] } geo.attributes.position.needsUpdate = true }
    return pts
  }

  /* oriente un faisceau (pointe vers -y) vers un point du sol, puis ajoute un balayage (rz, rx) */
  function viser(g, apex, cible, rx, rz) {
    g.position.copy(apex)
    const d = new V3().subVectors(cible, apex).normalize()
    // rotation qui amène (0,-1,0) sur d
    g.quaternion.setFromUnitVectors(new V3(0, -1, 0), d)
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, 0, rz || 0)); g.quaternion.multiply(q)
  }
  function sol(g) {   // point d'impact du faisceau sur le plan y = 0.04
    const d = new V3(0, -1, 0).applyQuaternion(g.quaternion); if (d.y > -.05) return null
    const t = (g.position.y - .04) / -d.y; return new V3().copy(g.position).addScaledVector(d, t)
  }

  /* ---------------------------------------------------------------------------------------------- les décors de lumière */
  const DECO = {
    karaoke(R, cfg) {
      const st = R.stage, g = new THREE.Group(); st.add(g)
      const cols = ['#ff4d6d', '#4dd2ff', '#7dff6b', '#ffd84d', '#c77dff'], apex = [[-7.5, 9.5, -6.6], [-2.6, 9.8, -6.8], [2.6, 9.8, -6.8], [7.5, 9.5, -6.6], [0, 10.4, -7]]
      const fx = apex.map((a, i) => { const f = faisceau(cols[i], 1.35, 12, .13), p = flaque(cols[i], 1.7, .5); g.add(f, p); return { f, p, a: new V3(...a), i } })
      const boule = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 1), new THREE.MeshBasicMaterial({ color: '#dfe6f5', vertexColors: false }))
      boule.position.set(0, 8, -3.2); g.add(boule)
      const fil = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 3, 4), new THREE.MeshBasicMaterial({ color: '#8894b8' })); fil.position.set(0, 9.6, -3.2); g.add(fil)
      // éclats de la boule : points lumineux qui tournent sur le sol
      const N = 46, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), rd = [], c = new THREE.Color()
      for (let i = 0; i < N; i++) { rd.push([2 + Math.random() * 8, Math.random() * 6.28, (Math.random() < .5 ? -1 : 1) * (.15 + Math.random() * .25)]); c.set(cols[i % cols.length]); col.set([c.r, c.g, c.b], i * 3) }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      const eclats = new THREE.Points(geo, new THREE.PointsMaterial(ADD({ size: .55, map: doux(), vertexColors: true, opacity: .75, sizeAttenuation: true }))); eclats.frustumCulled = false; eclats.renderOrder = 5; g.add(eclats)
      // halos sous les trois pistes : ils battent avec la mesure
      const LX = [-4, 0, 4], pistes = LX.map((x, i) => { const p = flaque(['#e03131', '#2f9e44', '#1c7ed6'][i], 1.6, .3); p.position.set(x, .05, 2.4); g.add(p); return p })
      const beat = (cfg && cfg.beat) || .5, mo = poussiere(70, [-9, 0.5, -6, 9, 8, 3], '#ffe9c8', .28, .35); g.add(mo)
      return { maj(dt, T) {
        fx.forEach((o) => { const s = Math.sin(T * (.7 + o.i * .11) + o.i * 1.9), s2 = Math.cos(T * (.5 + o.i * .07) + o.i); viser(o.f, o.a, new V3(s * 3.6, 0, -1.5 + s2 * 2.2), 0, 0)
          const im = sol(o.f); if (im) { o.p.position.copy(im); o.p.position.y = .05 }
          const bt = .55 + .45 * Math.abs(Math.sin(Math.PI * T / beat)); o.f.userData.mat.opacity = .09 + .06 * bt; o.p.material.opacity = .3 + .3 * bt })
        boule.rotation.y = T * .9; boule.rotation.x = Math.sin(T * .3) * .1
        const a = eclats.geometry.attributes.position.array; rd.forEach((r, i) => { const th = r[1] + T * r[2]; a[i * 3] = Math.cos(th) * r[0] * 1.2; a[i * 3 + 1] = .07; a[i * 3 + 2] = -3.2 + Math.sin(th) * r[0] * .75 }); eclats.geometry.attributes.position.needsUpdate = true
        const b = Math.abs(Math.sin(Math.PI * T / beat)); pistes.forEach((p, i) => { p.material.opacity = .16 + .34 * b; p.scale.setScalar(1 + .12 * b) })
        mo.userData.maj(dt, T) } }
    },

    revue(R) {
      const st = R.stage, g = new THREE.Group(); st.add(g)
      const cols = ['#ffe8a3', '#9ad0ff', '#ffb3d1'], apex = [[-8.5, 10.5, 4.5], [8.5, 10.5, 4.5], [0, 11.5, 5.5]]
      const fx = apex.map((a, i) => { const f = faisceau(cols[i], 1.7, 13, .11), p = flaque(cols[i], 2.1, .4); g.add(f, p); return { f, p, a: new V3(...a), i } })
      const mo = poussiere(60, [-8, 0.5, -5, 8, 9, 5], '#dfe8ff', .3, .32); g.add(mo)
      return { maj(dt, T) {
        fx.forEach((o) => { const s = Math.sin(T * (.55 + o.i * .13) + o.i * 2.2), s2 = Math.cos(T * (.4 + o.i * .09) + o.i); viser(o.f, o.a, new V3(s * 3.2, 0, -.6 + s2 * 1.6), 0, 0)
          const im = sol(o.f); if (im) { o.p.position.copy(im); o.p.position.y = .27 } })
        mo.userData.maj(dt, T) } }
    },

    budget(R) {
      const st = R.stage, g = new THREE.Group(); st.add(g)
      // rayons de soleil par les verrières : trois faisceaux larges, presque verticaux
      const rays = [[-5.5, -3], [0.5, -2], [6, -3.5]].map(([x, z], i) => { const f = faisceau('#fff0c2', 2.1, 13, .15); f.position.set(x - 3.2, 11, z - 3.5); const cible = new V3(x, 0, z); viser(f, f.position, cible, 0, 0); g.add(f); return { f, x, z, i } })
      // halos colorés sous les postes (couleur de chaque poste)
      const cols = ['#40c057', '#ff922b', '#845ef7', '#fcc419', '#339af0']
      const halos = cols.map((c, i) => { const p = flaque(c, 2.3, .42); p.position.set(-7.2 + i * 3.6, .06, -3.4); g.add(p); return p })
      const mo = poussiere(90, [-9, 0.3, -5.5, 9, 9, 4], '#fff4d6', .26, .3); g.add(mo)
      return { maj(dt, T) {
        rays.forEach((o) => { o.f.userData.mat.opacity = .13 + .04 * Math.sin(T * .5 + o.i * 2) })
        halos.forEach((p, i) => { p.material.opacity = .36 + .09 * Math.sin(T * 1.4 + i) })
        mo.userData.maj(dt, T) } }
    },

    festin(R) {
      const st = R.stage, g = new THREE.Group(); st.add(g)
      // suspensions au-dessus des deux tables
      const lampes = [-3.1, 3.1].map((x, i) => {
        const l = new THREE.Group(); l.position.set(x, 5.6, .1); g.add(l)
        const fil = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 2.2, 4), new THREE.MeshBasicMaterial({ color: '#3b2d22' })); fil.position.y = 1.1; l.add(fil)
        const abat = new THREE.Mesh(new THREE.ConeGeometry(.9, .55, 20, 1, true), new THREE.MeshToonMaterial({ color: '#f2b84a', side: THREE.DoubleSide, gradientMap: window.grad || null })); abat.position.y = 0; l.add(abat)
        const bulbe = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff4c8' })); bulbe.position.y = -.12; l.add(bulbe)
        const f = faisceau('#ffd889', 2.4, 4.6, .11); f.position.set(0, -.2, 0); l.add(f)
        const p = flaque('#ffd889', 2.9, .3); p.position.set(x, 1.12, .3); g.add(p)
        return { l, f, p }
      })
      // vapeur qui monte des assiettes
      const X = [-4.4, -1.8, 1.8, 4.4], N = 4 * 6, sp = [], TY = 1.05, PZ = .45
      for (let i = 0; i < N; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial(ADD({ map: doux(), color: '#fff5e0', opacity: 0 }))); m.scale.setScalar(.5); m.userData = { x: X[i % 4], k: Math.random(), v: .32 + Math.random() * .2, ph: Math.random() * 6.28 }; g.add(m); sp.push(m) }
      const mo = poussiere(50, [-8, 0.5, -3, 8, 6, 3], '#fff2d0', .24, .28); g.add(mo)
      return { maj(dt, T) {
        lampes.forEach((o, i) => { o.l.rotation.z = Math.sin(T * .8 + i * 2) * .02; o.f.userData.mat.opacity = .1 + .015 * Math.sin(T * 3 + i) })
        sp.forEach((m) => { const u = m.userData; u.k += dt * u.v; if (u.k > 1) { u.k = 0; u.ph = Math.random() * 6.28 }
          m.position.set(u.x + Math.sin(u.k * 5 + u.ph) * .12, TY + .35 + u.k * 1.3, PZ); m.material.opacity = Math.sin(u.k * Math.PI) * .22; m.scale.setScalar(.35 + u.k * .7) })
        mo.userData.maj(dt, T) } }
    },

    chirurgie(R) {
      const st = R.stage, g = new THREE.Group(); st.add(g)
      const lampe = new THREE.Group(); lampe.position.set(.6, 8.4, .2); g.add(lampe)
      const disque = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, .28, 24), new THREE.MeshToonMaterial({ color: '#dfe7ee', gradientMap: window.grad || null })); lampe.add(disque)
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, b = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), new THREE.MeshBasicMaterial({ color: '#f6fbff' })); b.position.set(Math.cos(a) * .95, -.18, Math.sin(a) * .95); lampe.add(b) }
      const f = faisceau('#eaf7ff', 4.3, 7.4, .1); f.position.set(0, -.25, 0); lampe.add(f)
      const p = flaque('#eaf7ff', 5.6, .34); p.position.set(.6, 1.22, .2); g.add(p)
      const mo = poussiere(70, [-7, 1.2, -4, 7, 8, 4], '#f0fbff', .22, .3); g.add(mo)
      return { maj(dt, T) { lampe.rotation.z = Math.sin(T * .5) * .015; f.userData.mat.opacity = .095 + .012 * Math.sin(T * 2.1); p.material.opacity = .32 + .04 * Math.sin(T * 1.7); mo.userData.maj(dt, T) } }
    }
  }

  /* ---------------------------------------------------------------------------------------------- enveloppe des mini-jeux */
  /* R.extra est la boucle du mini-jeu ; on l'intercepte à sa première pose pour construire l'ambiance (le décor du jeu existe alors) et on la double d'une mise à jour */
  function accroche(R, nom, cfg) {
    const S = R.__amb || (R.__amb = { nom: null, fait: false, amb: null, f: null })
    S.nom = nom; S.fait = false; S.amb = null; S.cfg = cfg
    if (S.def) return
    S.def = true
    Object.defineProperty(R, 'extra', {
      configurable: true, enumerable: true,
      get() { return S.f },
      set(fn) {
        if (!fn) { S.f = fn; return }
        if (fn.__amb) { S.f = fn; return }
        if (!S.fait) { S.fait = true; try { S.amb = DECO[S.nom] ? DECO[S.nom](R, S.cfg) : null } catch (e) { console.warn('[ambiance]', S.nom, e); S.amb = null } }
        const S2 = S
        const w = (dt, T) => { if (S2.amb && S2.amb.maj) { try { S2.amb.maj(dt, T) } catch (e) { S2.amb = null } } return fn(dt, T) }
        w.__amb = 1; S.f = w
      }
    })
  }
  function envelopper(hote, cle, nom) {
    const orig = hote && hote[cle]; if (typeof orig !== 'function' || orig.__amb) return
    const w = function () {
      const R = typeof cur !== 'undefined' ? cur : null
      if (R && DECO[nom]) accroche(R, nom, arguments[1])
      return orig.apply(this, arguments)
    }
    w.__amb = 1; hote[cle] = w
  }

  A.installe = function () {
    if (A.pret) return true
    const J = window.TALAS_JEUX
    if (J) { envelopper(J, 'budget3D', 'budget'); envelopper(J, 'revue3D', 'revue') }
    envelopper(window, 'karaoke3D', 'karaoke'); envelopper(window, 'feast3D', 'festin'); envelopper(window, 'surgery3D', 'chirurgie')
    A.pret = true; return true
  }
})()

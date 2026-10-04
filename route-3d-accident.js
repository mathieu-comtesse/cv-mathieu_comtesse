/* Route & vigilance — effets d'accident (three.js r128) : étincelles, éclats de verre, fumée du capot, poussière, débris et pièces arrachées (rétroviseurs, feux, roue),
 * déformation de la carrosserie à l'impact, traces de freinage. Les effets sont proportionnés à la vitesse de rapprochement (m/s).
 *   const A = Accident3D.creer({ scene, piste, renderer })  ·  A.choc(V, point, normale, vrel, opt)  ·  A.maj(dt)  ·  A.fumeeContinue(V, local)  ·  A.trace(...)  ·  A.vider() */
(function (root) {
  'use strict'
  const THREE = root.THREE, clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z)

  const VS = 'attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float uScale; varying float vA; varying vec3 vC; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = max(1., aSize * uScale / max(.5, -mv.z)); vA = aAlpha; vC = aColor; }'
  const FS = 'varying float vA; varying vec3 vC; void main(){ vec2 c = gl_PointCoord - .5; float r = length(c); float a = smoothstep(.5, .12, r) * vA; if (a < .01) discard; gl_FragColor = vec4(vC, a); }'

  class Systeme {
    constructor(scene, n, additif, scaleRef) {
      this.n = n; this.i = 0; this.actif = 0
      this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.vie = new Float32Array(n); this.vieMax = new Float32Array(n).fill(1); this.sol = new Float32Array(n); this.taille0 = new Float32Array(n); this.croit = new Float32Array(n)
      this.grav = new Float32Array(n); this.frott = new Float32Array(n); this.col0 = new Float32Array(n * 3); this.alpha0 = new Float32Array(n)
      this.aSize = new Float32Array(n); this.aAlpha = new Float32Array(n); this.aColor = new Float32Array(n * 3)
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(this.aSize, 1)); g.setAttribute('aAlpha', new THREE.BufferAttribute(this.aAlpha, 1)); g.setAttribute('aColor', new THREE.BufferAttribute(this.aColor, 3))
      this.uniforms = { uScale: { value: 600 } }
      const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending })
      this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 15; scene.add(this.points); this.g = g
    }
    emettre(x, y, z, vx, vy, vz, o) {
      const k = this.i; this.i = (this.i + 1) % this.n
      this.pos[k * 3] = x; this.pos[k * 3 + 1] = y; this.pos[k * 3 + 2] = z; this.vel[k * 3] = vx; this.vel[k * 3 + 1] = vy; this.vel[k * 3 + 2] = vz
      this.vie[k] = this.vieMax[k] = o.vie || 1; this.taille0[k] = o.taille || .1; this.croit[k] = o.croit || 0; this.grav[k] = o.grav === undefined ? 9.81 : o.grav; this.frott[k] = o.frott || 0; this.sol[k] = o.sol === undefined ? -1e9 : o.sol
      const c = o.couleur || [1, 1, 1]; this.col0[k * 3] = c[0]; this.col0[k * 3 + 1] = c[1]; this.col0[k * 3 + 2] = c[2]; this.alpha0[k] = o.alpha === undefined ? 1 : o.alpha
    }
    maj(dt, scale) {
      this.uniforms.uScale.value = scale
      let vivants = 0
      for (let k = 0; k < this.n; k++) {
        if (this.vie[k] <= 0) { this.aAlpha[k] = 0; continue }
        vivants++; this.vie[k] -= dt
        const f = Math.max(0, this.vie[k] / this.vieMax[k]), fr = Math.max(0, 1 - this.frott[k] * dt)
        this.vel[k * 3] *= fr; this.vel[k * 3 + 2] *= fr; this.vel[k * 3 + 1] = (this.vel[k * 3 + 1] - this.grav[k] * dt) * (this.grav[k] < 0 ? fr : 1)
        this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt
        if (this.pos[k * 3 + 1] < this.sol[k]) { this.pos[k * 3 + 1] = this.sol[k]; this.vel[k * 3 + 1] *= -.28; this.vel[k * 3] *= .6; this.vel[k * 3 + 2] *= .6 }
        this.aSize[k] = this.taille0[k] + this.croit[k] * (1 - f); this.aAlpha[k] = this.alpha0[k] * Math.min(1, f * 2.2) * (this.croit[k] ? Math.min(1, (1 - f) * 8) : 1)
        this.aColor[k * 3] = this.col0[k * 3]; this.aColor[k * 3 + 1] = this.col0[k * 3 + 1]; this.aColor[k * 3 + 2] = this.col0[k * 3 + 2]
      }
      this.actif = vivants
      const a = this.g.attributes; a.position.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = a.aColor.needsUpdate = true
    }
    vider() { this.vie.fill(0); this.aAlpha.fill(0); this.g.attributes.aAlpha.needsUpdate = true }
  }

  function creer(o) {
    const scene = o.scene, piste = o.piste, A = {}
    const sys = { etincelles: new Systeme(scene, 600, true), verre: new Systeme(scene, 500, false), fumee: new Systeme(scene, 700, false), poussiere: new Systeme(scene, 500, false), eclats: new Systeme(scene, 300, false) }
    const pieces = [], fumees = [], rnd = Math.random
    let echelle = 600
    A.regler = (hauteurEcran, fov) => { echelle = hauteurEcran / (2 * Math.tan(fov * Math.PI / 360)) }

    /* ------------------------------------------------------------------------------------------------ émetteurs de base */
    A.etincelles = (p, dir, n, vit) => { for (let i = 0; i < n; i++) { const v = (vit || 8) * (.4 + rnd()); sys.etincelles.emettre(p.x, p.y, p.z, dir.x * v + (rnd() - .5) * 5, dir.y * v + rnd() * 4, dir.z * v + (rnd() - .5) * 5, { vie: .35 + rnd() * .6, taille: .09 + rnd() * .09, couleur: [1, .62 + rnd() * .3, .2], grav: 9, sol: p.y - 1.2 }) } }
    A.verre = (p, n, vit) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, v = (vit || 4) * rnd(); sys.verre.emettre(p.x + (rnd() - .5) * .4, p.y + rnd() * .3, p.z + (rnd() - .5) * .4, Math.cos(a) * v, 1 + rnd() * 4, Math.sin(a) * v, { vie: 1.6 + rnd() * 1.2, taille: .05 + rnd() * .06, couleur: [.78, .9, 1], grav: 9.81, frott: 1.2, sol: p.y - 1.1, alpha: .9 }) } }
    A.poussiere = (p, n, vit) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, v = (vit || 3) * rnd(); sys.poussiere.emettre(p.x, p.y + .1, p.z, Math.cos(a) * v, .5 + rnd() * 1.5, Math.sin(a) * v, { vie: 1.4 + rnd() * 1.6, taille: .5, croit: 2.2 + rnd() * 1.6, grav: -.3, frott: 1.3, couleur: [.62, .56, .5], alpha: .38 }) } }
    A.eclats = (p, n, vit) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, v = (vit || 6) * (.3 + rnd()); sys.eclats.emettre(p.x, p.y + .2, p.z, Math.cos(a) * v, 1 + rnd() * 5, Math.sin(a) * v, { vie: 1.5 + rnd() * 1.5, taille: .11 + rnd() * .1, couleur: [.12, .12, .14], grav: 9.81, frott: .8, sol: p.y - 1.1 }) } }
    A.fumeeBouffee = (p, n, sombre) => { for (let i = 0; i < n; i++) { const t = sombre ? .18 : .55; sys.fumee.emettre(p.x + (rnd() - .5) * .5, p.y, p.z + (rnd() - .5) * .5, (rnd() - .5) * 1.4, 1.4 + rnd() * 1.6, (rnd() - .5) * 1.4, { vie: 3.5 + rnd() * 3, taille: .45, croit: 3 + rnd() * 2.5, grav: -.5, frott: .6, couleur: [t, t, t * 1.04], alpha: .5 }) } }

    /* fumée continue sur un véhicule (capot) : { V, local, debit, fin } */
    A.fumeeContinue = (V, local, debit, duree) => { fumees.push({ V, local: local.clone(), debit: debit || 18, reste: duree || 40, acc: 0, sombre: false }) }

    /* ------------------------------------------------------------------------------------------------ déformation de la carrosserie */
    A.deformer = (V, pointMonde, dirMonde, profondeur, rayon) => {
      let touche = 0
      for (const mesh of V.pieces.corps) {
        if (!mesh.userData.unique) { mesh.geometry = mesh.geometry.clone(); mesh.geometry.userData.orig = mesh.geometry.attributes.position.array.slice(); mesh.userData.unique = true }
        mesh.updateWorldMatrix(true, false)
        const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert(), pl = pointMonde.clone().applyMatrix4(inv)
        const qi = mesh.getWorldQuaternion(new THREE.Quaternion()).invert(), dl = dirMonde.clone().applyQuaternion(qi).normalize()
        const sc = mesh.getWorldScale(new THREE.Vector3()).x || 1, r = rayon / sc, prof = profondeur / sc
        const pos = mesh.geometry.attributes.position, a = pos.array
        for (let i = 0; i < pos.count; i++) {
          const dx = a[i * 3] - pl.x, dy = a[i * 3 + 1] - pl.y, dz = a[i * 3 + 2] - pl.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (d > r) continue
          const w = Math.pow(1 - d / r, 1.6), bruit = .75 + .5 * Math.abs(Math.sin(a[i * 3] * 47.1 + a[i * 3 + 2] * 31.7 + a[i * 3 + 1] * 17.3))
          a[i * 3] += dl.x * prof * w * bruit; a[i * 3 + 1] += dl.y * prof * w * bruit - prof * .12 * w * bruit; a[i * 3 + 2] += dl.z * prof * w * bruit
          touche++
        }
        pos.needsUpdate = true; mesh.geometry.computeVertexNormals()
      }
      return touche
    }
    A.reparer = (V) => { for (const mesh of V.pieces.corps) if (mesh.userData.unique) { mesh.geometry.attributes.position.array.set(mesh.geometry.userData.orig); mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.computeVertexNormals() } }

    /* ------------------------------------------------------------------------------------------------ pièces arrachées */
    function arracher(obj, vit, spin) {
      obj.updateWorldMatrix(true, false); scene.attach(obj)
      pieces.push({ obj, v: vit.clone(), w: spin.clone(), vie: 14, repos: false })
    }
    A.arracherPieces = (V, pointMonde, n, vit, grave) => {
      const proches = V.pieces.pieces.filter((m) => m.parent && !m.userData.arrachee).map((m) => ({ m, d: m.getWorldPosition(new THREE.Vector3()).distanceTo(pointMonde) })).sort((a, b) => a.d - b.d).slice(0, n)
      for (const { m } of proches) { m.userData.arrachee = true; arracher(m, vit.clone().multiplyScalar(.6 + rnd() * .6).add(V3((rnd() - .5) * 3, 2 + rnd() * 3, (rnd() - .5) * 3)), V3((rnd() - .5) * 12, (rnd() - .5) * 12, (rnd() - .5) * 12)) }
      if (grave && V.pieces.roues.length) {      // une roue part rouler
        const r = V.pieces.roues.map((w) => ({ w, d: w.getWorldPosition(new THREE.Vector3()).distanceTo(pointMonde) })).sort((a, b) => a.d - b.d)[0].w
        const pivot = r.parent && r.parent !== V.corpsGroupe ? r.parent : r
        if (!pivot.userData.arrachee) { pivot.userData.arrachee = true; arracher(pivot, vit.clone().multiplyScalar(.9).add(V3((rnd() - .5) * 4, 3, (rnd() - .5) * 4)), V3(18, 0, 0)) }
      }
    }

    /* ------------------------------------------------------------------------------------------------ choc : effets proportionnés à la vitesse de rapprochement */
    A.choc = (V, pointMonde, normaleMonde, vrel, opt) => {
      opt = opt || {}
      const kmh = vrel * 3.6, grave = kmh > 40, tresGrave = kmh > 75
      const dir = normaleMonde.clone().normalize(), prof = clamp(.06 + vrel * .028, .08, .7), rayon = clamp(.55 + vrel * .06, .6, 1.9)
      A.etincelles(pointMonde, dir.clone().multiplyScalar(-1).add(V3(0, .4, 0)), Math.round(clamp(vrel * 2.2, 8, 70)), clamp(vrel * .5, 4, 14))
      A.eclats(pointMonde, Math.round(clamp(vrel * 1.2, 4, 36)), clamp(vrel * .45, 3, 12))
      A.poussiere(pointMonde, Math.round(clamp(vrel * .9, 4, 24)), 4)
      if (V && V.pieces && V.pieces.corps && V.pieces.corps.length && !opt.sansDeformation) {
        const touche = A.deformer(V, pointMonde, dir.clone().multiplyScalar(-1), prof, rayon)
        if (kmh > 14) A.arracherPieces(V, pointMonde, kmh > 30 ? (tresGrave ? 6 : 3) : 1, dir.clone().multiplyScalar(-vrel * .5), grave)
        if (kmh > 28) {
          A.verre(pointMonde.clone().add(V3(0, .7, 0)), Math.round(clamp(vrel * 3, 20, 140)), clamp(vrel * .25, 3, 9))
          if (V.mats && V.mats.verre) { V.mats.verre.opacity = .78; V.mats.verre.color.set('#cfd6e0'); V.mats.verre.roughness = .5 }
        }
        if (kmh > 22 && !V.fume) {
          V.fume = true; const bb = V.taille || V3(1.8, 1.4, 4.2)
          const loc = pointMonde.clone(); V.corpsGroupe.worldToLocal(loc); loc.y = Math.max(.7, loc.y); A.fumeeContinue(V, loc, kmh > 55 ? 30 : 16, kmh > 55 ? 70 : 40)
        }
      }
      return { grave, tresGrave, kmh }
    }

    /* ------------------------------------------------------------------------------------------------ traces de freinage */
    const NT = 500, tPos = new Float32Array(NT * 6 * 3), tAl = new Float32Array(NT * 6); let tI = 0
    const gT = new THREE.BufferGeometry(); gT.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); gT.setAttribute('aAlpha', new THREE.BufferAttribute(tAl, 1))
    const mT = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, vertexShader: 'attribute float aAlpha; varying float vA; void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(.02, .02, .025, vA); }' })
    const traces = new THREE.Mesh(gT, mT); traces.frustumCulled = false; traces.renderOrder = 3; scene.add(traces)
    const derniere = {}
    A.trace = (cle, p, cap, largeur, alpha) => {
      const prev = derniere[cle]; derniere[cle] = { x: p.x, y: p.y, z: p.z, t: performance.now() }
      if (!prev || performance.now() - prev.t > 160) return
      const dx = p.x - prev.x, dz = p.z - prev.z, L = Math.hypot(dx, dz); if (L < .05 || L > 4) return
      const nx = -dz / L * largeur / 2, nz = dx / L * largeur / 2, k = (tI++ % NT) * 6, y = p.y + .03
      const q = [[prev.x - nx, y, prev.z - nz], [prev.x + nx, y, prev.z + nz], [p.x - nx, y, p.z - nz], [prev.x + nx, y, prev.z + nz], [p.x + nx, y, p.z + nz], [p.x - nx, y, p.z - nz]]
      for (let i = 0; i < 6; i++) { tPos[(k + i) * 3] = q[i][0]; tPos[(k + i) * 3 + 1] = q[i][1]; tPos[(k + i) * 3 + 2] = q[i][2]; tAl[k + i] = alpha }
      gT.attributes.position.needsUpdate = gT.attributes.aAlpha.needsUpdate = true
    }

    /* ------------------------------------------------------------------------------------------------ mise à jour */
    const tmp = V3(0, 0, 0)
    A.maj = (dt, sol) => {
      for (const k in sys) sys[k].maj(dt, echelle)
      for (let i = fumees.length - 1; i >= 0; i--) {
        const f = fumees[i]; f.reste -= dt; if (f.reste <= 0 || !f.V.groupe.parent) { fumees.splice(i, 1); continue }
        f.acc += dt * f.debit; tmp.copy(f.local); f.V.corpsGroupe.localToWorld(tmp)
        while (f.acc >= 1) { f.acc -= 1; A.fumeeBouffee(tmp, 1, f.sombre) }
        if (f.reste < 25 && !f.V.feu && f.debit > 20) f.sombre = true
      }
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]; p.vie -= dt; if (p.vie <= 0) { scene.remove(p.obj); pieces.splice(i, 1); continue }
        if (p.repos) continue
        p.v.y -= 9.81 * dt; p.obj.position.addScaledVector(p.v, dt); p.obj.rotation.x += p.w.x * dt; p.obj.rotation.y += p.w.y * dt; p.obj.rotation.z += p.w.z * dt
        const gy = sol ? sol(p.obj.position.x, p.obj.position.z) : 0
        if (p.obj.position.y < gy + .08) { p.obj.position.y = gy + .08; if (Math.abs(p.v.y) > 1.6) { p.v.y *= -.32; p.v.x *= .6; p.v.z *= .6; p.w.multiplyScalar(.6) } else { p.v.multiplyScalar(1 - 2.5 * dt); p.w.multiplyScalar(1 - 3 * dt); if (p.v.length() < .15) p.repos = true } }
      }
    }
    A.vider = () => { for (const k in sys) sys[k].vider(); fumees.length = 0; for (const p of pieces) scene.remove(p.obj); pieces.length = 0; tAl.fill(0); gT.attributes.aAlpha.needsUpdate = true }
    A.sys = sys; A.pieces = pieces
    return A
  }
  root.Accident3D = { creer }
})(typeof window !== 'undefined' ? window : globalThis)

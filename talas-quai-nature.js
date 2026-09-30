/* LE QUAI DE TALAS, partie « nature » : arbres à troncs violets et houppiers en touffes, buissons fleuris, rochers, herbe au vent
 * (lames générées dans le shader, comme dans Ghost of Tsushima). Prolonge talas-quai.js : Q.decorNature(contexte). */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE, Q = window.TALAS_QUAI
  if (!THREE || !M || !Q || !Q.on) return
  const PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

  Q.decorNature = function (c) {
    const { s, r, hauteur, MT, toon, ombre, uvMonde } = c
    const T = M.peintre
    const pente = (x, z) => { const e = .8, dx = hauteur(x + e, z) - hauteur(x - e, z), dz = hauteur(x, z + e) - hauteur(x, z - e); return 1 / Math.sqrt(1 + (dx * dx + dz * dz) / (4 * e * e)) } // = normale.y
    const couvert = (x, z, y) => Q.sol(x, z, y) !== null // sous un plancher

    /* ------------------------------------------------------------ houppiers : un seul maillage, couleurs par sommet */
    const FEU = { P: [], N: [], C: [], I: [] }; let foff = 0
    const puffG = new THREE.IcosahedronBufferGeometry(1, 2)
    function puff(x, y, z, rx, ry, rz, bas, haut, graine) {
      const p = puffG.attributes.position, n = puffG.attributes.normal, q = new THREE.Color(), lo = new THREE.Color(bas), hi = new THREE.Color(haut), rr = M.alea(graine)
      const bump = new Float32Array(p.count); for (let i = 0; i < p.count; i++) bump[i] = 1 + (M.fbm2(p.getX(i) * 2.2 + graine, p.getY(i) * 2.2 + p.getZ(i) * 1.7) - .5) * .5
      for (let i = 0; i < p.count; i++) {
        const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i), px = p.getX(i) * bump[i], py = p.getY(i) * bump[i], pz = p.getZ(i) * bump[i]
        FEU.P.push(x + px * rx, y + py * ry, z + pz * rz); FEU.N.push(nx, ny * .8 + .2, nz)
        const t = clamp(ny * .5 + .5 + (rr() - .5) * .1, 0, 1); q.copy(lo).lerp(hi, t * t * .9 + .05); FEU.C.push(q.r, q.g, q.b)
      }
      if (puffG.index) for (let i = 0; i < puffG.index.count; i++) FEU.I.push(puffG.index.getX(i) + foff); else for (let i = 0; i < p.count; i++) FEU.I.push(i + foff)
      foff += p.count
    }
    const TRONCS = { P: [], N: [], U: [], I: [] }; let toff = 0
    function tronc(x, y, z, h, rb, courbe) {
      const g = new THREE.CylinderBufferGeometry(rb * .55, rb, h, 7, 5, true), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
      for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + h / 2) / h; TRONCS.P.push(x + p.getX(i) + Math.sin(t * 3 + x) * courbe * t, y + p.getY(i) + h / 2, z + p.getZ(i) + Math.cos(t * 2.4 + z) * courbe * t * .6); TRONCS.N.push(n.getX(i), n.getY(i), n.getZ(i)); TRONCS.U.push(uv.getX(i) * 2, uv.getY(i) * h * .6) }
      for (let i = 0; i < g.index.count; i++) TRONCS.I.push(g.index.getX(i) + toff); toff += p.count
      return { x: x + Math.sin(3 + x) * courbe, z: z + Math.cos(2.4 + z) * courbe * .6 }
    }
    function arbre(x, z, sz, teinte, yOpt) {
      const y = yOpt === undefined ? hauteur(x, z) - .15 : yOpt, h = (3.4 + r() * 1.6) * sz, top = tronc(x, y, z, h, .3 * sz, (r() - .5) * .9 * sz)
      const pal = teinte === 'violet' ? [['#4a2a70', '#a86ad0'], ['#5a2f7a', '#b980e0']] : teinte === 'ambre' ? [['#7a4a1c', '#e0a838'], ['#8a5a20', '#f0c04a']] : [['#2c6a3a', '#93cf4a'], ['#35773a', '#a6d955'], ['#2a5f3c', '#7fbf50']]
      const n = 6 + (r() * 3 | 0)
      for (let i = 0; i < n; i++) { const a = r() * 6.28, d = (i ? 1.0 + r() * 1.3 : 0) * sz, pp = pal[(r() * pal.length) | 0]; puff(top.x + Math.cos(a) * d, y + h + (r() - .2) * 1.2 * sz + (i ? 0 : .4 * sz), top.z + Math.sin(a) * d, (1.5 + r() * .9) * sz, (1.2 + r() * .6) * sz, (1.5 + r() * .9) * sz, pp[0], pp[1], (r() * 999) | 0) }
    }
    function buisson(x, z, sz, y) { y = y === undefined ? hauteur(x, z) : y; for (let i = 0; i < 3; i++) puff(x + (r() - .5) * 1.1 * sz, y + .35 * sz, z + (r() - .5) * 1.1 * sz, (.7 + r() * .4) * sz, (.55 + r() * .25) * sz, (.7 + r() * .4) * sz, '#2a5f36', r() < .3 ? '#d86aa0' : '#82c24a', (r() * 999) | 0) }

    // arbres composés à la main : autour de la boutique, des terrasses et du phare
    ;[[-17.5, 5.6, 1.5, 'vert'], [-13.4, 7.6, 1.15, 'violet'], [-19, -3.2, 1.2, 'vert'], [-25.6, -19.5, 1.7, 'vert'], [-25, -25.6, 1.4, 'violet'], [24.5, -19.5, 1.5, 'vert'], [25.6, -27, 1.3, 'vert'], [-3.5, -30.5, 1.4, 'vert'], [4.6, -31.4, 1.2, 'violet'], [24.5, -31.5, 1.35, 'vert'],
      [-8, -56, 1.3, 'vert'], [8.6, -55, 1.2, 'violet'], [-11.5, -62, 1.7, 'vert'], [11.6, -64, 1.6, 'vert'], [40.6, -21, 1.3, 'vert'], [33.6, -12.5, 1.1, 'violet'], [-27, -47, 1.4, 'vert'], [-31, -38, 1.6, 'violet'], [29, -47, 1.5, 'vert'], [34, -41, 1.7, 'vert']].forEach(([x, z, sz, t]) => arbre(x, z, sz, t))
    // semis d'arbres et de buissons sur la roche (hors planchers, sur les pentes douces)
    for (let i = 0, n = 0; i < 1400 && n < 70; i++) { const x = -70 + r() * 140, z = -100 + r() * 100, y = hauteur(x, z); if (y < 1.4 || pente(x, z) < .72 || couvert(x, z, y + .3) || Math.hypot(x - 37, z + 16) < 8) continue
      if (Math.abs(x) < 14 && z > -30) continue; arbre(x, z, .9 + r() * .8, r() < .18 ? 'violet' : r() < .1 ? 'ambre' : 'vert'); n++ }
    for (let i = 0, n = 0; i < 2600 && n < 130; i++) { const x = -70 + r() * 140, z = -95 + r() * 90, y = hauteur(x, z); if (y < .9 || pente(x, z) < .68 || couvert(x, z, y + .3)) continue; buisson(x, z, .8 + r() * .7); n++ }
    ;(function () { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(FEU.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(FEU.N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(FEU.C, 3)); g.setIndex(FEU.I)
      const m = ombre(new THREE.Mesh(g, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad }))); s.add(m)
      const gt = new THREE.BufferGeometry(); gt.setAttribute('position', new THREE.Float32BufferAttribute(TRONCS.P, 3)); gt.setAttribute('normal', new THREE.Float32BufferAttribute(TRONCS.N, 3)); gt.setAttribute('uv', new THREE.Float32BufferAttribute(TRONCS.U, 2)); gt.setIndex(TRONCS.I)
      const mt = ombre(new THREE.Mesh(gt, new THREE.MeshToonMaterial({ map: T.ecorce({ couleur: '#5d4470' }), side: THREE.DoubleSide, gradientMap: grad }))); s.add(mt) })()

    /* ------------------------------------------------------------ rochers (petits blocs de détail) */
    { const G = new THREE.IcosahedronBufferGeometry(1, 1), lotR = c.lot(MT.pierre); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3()
      const poser = (x, y, z, sz) => { q.setFromEuler(e.set(r() * 3, r() * 6, r() * 3)); p.set(x, y, z); sc.set(sz * (.8 + r() * .6), sz * (.5 + r() * .4), sz * (.8 + r() * .6)); m4.compose(p, q, sc); const g2 = G.clone(); const uv = g2.attributes.uv, pos = g2.attributes.position; for (let i = 0; i < pos.count; i++) { pos.setXYZ(i, pos.getX(i) * (1 + (M.fbm2(pos.getX(i) * 3 + x, pos.getZ(i) * 3) - .5) * .5), pos.getY(i), pos.getZ(i) * (1 + (M.fbm2(pos.getY(i) * 3, pos.getZ(i) * 3 + z) - .5) * .5)) } g2.computeVertexNormals(); uvMonde(g2, .4); lotR.ajouter(g2, m4) }
      for (let i = 0, n = 0; i < 3000 && n < 150; i++) { const x = -80 + r() * 160, z = -100 + r() * 130, y = hauteur(x, z); if (y < -.3 || y > 14 || couvert(x, z, y + .3)) continue; if (y > 1.2 && r() < .6) continue; poser(x, y - .1, z, .5 + r() * 1.3); n++ }
      lotR.construire() }

    /* ------------------------------------------------------------ piliers de roche et arche au large (silhouettes du fond, comme sur l'illustration) */
    { const pilier = (x, z, R, H, ph) => { const g = new THREE.CylinderBufferGeometry(R * .55, R, H, 14, 12), p = g.attributes.position
        for (let i = 0; i < p.count; i++) { const y = p.getY(i), an = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + (M.fbm2(Math.cos(an) * 1.4 + ph, y * .1 + Math.sin(an) * 1.4) - .5) * .8; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k) }
        g.computeVertexNormals(); uvMonde(g, .1); const m = ombre(new THREE.Mesh(g, MT.pierre)); m.position.set(x, H / 2 - 5, z); s.add(m); return m }
      pilier(84, -58, 5, 34, 1); pilier(97, -51, 3.6, 27, 5); pilier(112, -68, 6.2, 42, 9); pilier(-98, -72, 5, 31, 3); pilier(-112, -54, 3.3, 23, 7); pilier(-88, -90, 6.5, 38, 11)
      const arche = ombre(new THREE.Mesh(new THREE.TorusBufferGeometry(7.4, 2.1, 8, 18, PI), MT.pierre)); arche.position.set(90.5, 16, -54.5); arche.rotation.y = .22; s.add(arche) }

    /* ------------------------------------------------------------ herbe au vent (lames issues de l'indice de sommet) */
    { const hb = M.herbe({ lames: 26000, segments: 5, hauteur: .9, largeur: .085, graine: 77, placer: (rn) => { for (let t = 0; t < 80; t++) { const x = -70 + rn() * 140, z = -100 + rn() * 100, y = hauteur(x, z); if (y > 1.0 && pente(x, z) > .8 && !couvert(x, z, y + .3) && !(Math.abs(x) < 9 && z > -30)) return [x, y - .05, z] } return [0, -40, 0] } })
      s.add(hb.mesh); Q._herbe = hb }
  }
})()

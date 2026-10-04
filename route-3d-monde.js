/* Route & vigilance — le monde 3D (three.js r128, script classique) : tronçons de terrain et de route générés à la demande autour de la voiture,
 * décor peint en aplats (conifères, buissons, rochers, arbres morts rouges, herbes sèches, panneaux à chevrons), ciel de crépuscule pluvieux,
 * montagnes enneigées lointaines, pluie en traits, ligne idéale, balises de points de passage et voitures en polygones.
 *   const M = Monde3D.creer({ piste, renderer })   M.scene · M.camera · M.maj(dt, etat) · M.voiture(couleurs) · M.ligneIdeale(s)
 * Dépend de : three.js r128 et route-3d-piste.js. */
(function (root) {
  'use strict'
  const THREE = root.THREE, P3 = root.Piste3D
  const { clamp, lerp, smooth, mulberry32 } = P3
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const CH = 120                                   // longueur d'un tronçon (m)
  const COLS = [-600, -420, -300, -220, -160, -115, -80, -56, -38, -26, -18, -12.5, -8.5, -6.6, -5.1, 5.1, 6.6, 8.5, 12.5, 18, 26, 38, 56, 80, 115, 160, 220, 300, 420, 600]
  const col = (hex) => new THREE.Color(hex)

  /* ------------------------------------------------------------------------------------------------------------ géométries de décor */
  /* tout est non indexé (ombrage à facettes) avec une couleur par sommet ; fusion() les assemble par tronçon */
  function plat(g, fn) {                              // g : BufferGeometry -> non indexée, couleur par sommet fn(x, y, z, i) -> Color
    g = g.index ? g.toNonIndexed() : g
    const p = g.attributes.position, c = new Float32Array(p.count * 3), t = new THREE.Color()
    for (let i = 0; i < p.count; i++) { t.copy(fn(p.getX(i), p.getY(i), p.getZ(i), i)); c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g
  }
  const GEO = {}
  function preparer() {
    if (GEO.pret) return
    // conifère : 5 étages de cônes qui s'amenuisent, deux teintes par étage (face éclairée plus jaune), tronc
    const conifere = []; const etages = [[.10, .32, .34], [.27, .30, .29], [.43, .28, .24], [.58, .26, .19], [.72, .24, .12]]
    etages.forEach(([y0, h, r], k) => {
      const cn = new THREE.ConeGeometry(r, h, 7, 1, false); cn.translate(0, y0 + h / 2, 0)
      conifere.push(plat(cn, (x, y, z, i) => col((i % 6 < 3 ? '#8b8f2c' : '#56652a')).lerp(col('#2f4424'), (1 - (y - y0) / h) * .35 + k * .02)))
    })
    const tr = new THREE.CylinderGeometry(.03, .045, .16, 5); tr.translate(0, .08, 0); conifere.push(plat(tr, () => col('#4a3426')))
    GEO.conifere = conifere
    const bu = new THREE.IcosahedronGeometry(1, 0); bu.scale(1, .62, 1); bu.translate(0, .36, 0)
    GEO.buisson = [plat(bu, (x, y, z, i) => col(i % 6 < 3 ? '#6d8f3c' : '#476b2f'))]
    const ro = new THREE.DodecahedronGeometry(1, 0); ro.scale(1, .7, .85); ro.translate(0, .3, 0)
    GEO.roche = [plat(ro, (x, y, z, i) => col(i % 6 < 3 ? '#7d8596' : '#535b6e'))]
    // arbre mort rouge : tronc incliné et cinq branches fines en V
    const mort = []; const br = (x0, y0, z0, x1, y1, z1, r0, r1) => {
      const d = V3(x1 - x0, y1 - y0, z1 - z0), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, 5); g.translate(0, L / 2, 0)
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()))); g.translate(x0, y0, z0); mort.push(plat(g, (x, y, z, i) => col(i % 4 < 2 ? '#a83a2a' : '#7c2a20')))
    }
    br(0, 0, 0, .05, .5, 0, .035, .028); br(.05, .5, 0, -.12, .9, .05, .028, .018); br(.05, .5, 0, .2, .95, -.06, .026, .016); br(-.04, .7, .02, -.3, .98, .1, .016, .01); br(.12, .75, -.03, .36, 1.05, .04, .015, .009); br(-.12, .9, .05, -.06, 1.2, 0, .014, .008)
    GEO.mort = mort
    // herbe sèche : trois flammèches jaunes
    const herbe = []; ;[[0, 0, 0, .09, .6], [.07, 0, .04, .07, .45], [-.06, 0, .03, .06, .4]].forEach(([x, y, z, r, h], k) => { const c = new THREE.ConeGeometry(r, h, 4); c.translate(x, h / 2, z); herbe.push(plat(c, (xx, yy, zz, i) => col(i % 4 < 2 ? '#f0b53a' : '#c9791c'))) })
    GEO.herbe = herbe
    const so = new THREE.CylinderGeometry(.5, .6, .5, 6); so.translate(0, .25, 0); GEO.souche = [plat(so, (x, y, z, i) => col(i % 4 < 2 ? '#bd4a3a' : '#8c3326'))]
    const po = new THREE.BoxGeometry(.12, .95, .12); po.translate(0, .475, 0); const pt = new THREE.BoxGeometry(.13, .16, .13); pt.translate(0, .86, 0)
    GEO.poteau = [plat(po, () => col('#e8e9ee')), plat(pt, () => col('#d84a3a'))]
    // maison de hameau : mur, toit à deux pans, porte, fenêtres, cheminée (unités : 1 m, centrés au sol) ; le jeu les met à l'échelle
    const mur = new THREE.BoxGeometry(1, 1, 1); mur.translate(0, .5, 0); GEO.mur = [plat(mur, (x, y) => col(y > .25 ? '#e6dccb' : '#b9ad98'))]
    { const pr = new THREE.BufferGeometry(), v = [], tri = (a, b, c) => v.push(...a, ...b, ...c)
      const A = [-.5, 0, -.5], B = [.5, 0, -.5], C = [0, 1, -.5], A2 = [-.5, 0, .5], B2 = [.5, 0, .5], C2 = [0, 1, .5]
      tri(A, B, C); tri(A2, C2, B2); tri(A, C, C2); tri(A, C2, A2); tri(B, B2, C2); tri(B, C2, C); tri(A, A2, B2); tri(A, B2, B)
      pr.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); pr.computeVertexNormals(); GEO.toit = [plat(pr, (x, y, z, i) => col(i % 6 < 3 ? '#9a4a37' : '#7f3b2c'))] }
    const fen = new THREE.BoxGeometry(1, 1, 1); GEO.fenetre = [plat(fen, () => col('#26374d'))]
    const por = new THREE.BoxGeometry(1, 1, 1); GEO.porte = [plat(por, () => col('#5b3b28'))]
    const chem = new THREE.BoxGeometry(1, 1, 1); chem.translate(0, .5, 0); GEO.cheminee = [plat(chem, () => col('#8c7f74'))]
    const volet = new THREE.BoxGeometry(1, 1, 1); GEO.volet = [plat(volet, () => col('#3c6b5c'))]
    // lampadaire : mât, bras, tête éclairante
    const lm = new THREE.CylinderGeometry(.06, .08, 6, 6); lm.translate(0, 3, 0); const lb = new THREE.BoxGeometry(1.2, .08, .08); lb.translate(.55, 5.95, 0)
    GEO.lampadaire = [plat(lm, () => col('#4a4f5c')), plat(lb, () => col('#4a4f5c'))]
    const lt = new THREE.BoxGeometry(.5, .12, .24); lt.translate(1.1, 5.9, 0); GEO.lampe = [plat(lt, () => col('#fff3c4'))]
    GEO.pret = true
  }
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), E4 = new THREE.Euler()
  const mat = (x, y, z, ry, sx, sy, sz, rx, rz) => M4.compose(V3(x, y, z), Q4.setFromEuler(E4.set(rx || 0, ry || 0, rz || 0)), V3(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz)).clone()
  function fusion(items) {       // items : [{ g: [geos], m: Matrix4, t: [r,g,b] multiplicateur de teinte }]
    let n = 0; for (const it of items) for (const g of it.g) n += g.attributes.position.count
    if (!n) return null
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), v = V3(0, 0, 0); let o = 0
    for (const it of items) for (const g of it.g) {
      const p = g.attributes.position, c = g.attributes.color
      for (let i = 0; i < p.count; i++, o++) {
        v.fromBufferAttribute(p, i).applyMatrix4(it.m); pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z
        const t = it.t || [1, 1, 1]; col[o * 3] = c.getX(i) * t[0]; col[o * 3 + 1] = c.getY(i) * t[1]; col[o * 3 + 2] = c.getZ(i) * t[2]
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); g.computeBoundingSphere(); return g
  }

  /* ------------------------------------------------------------------------------------------------------------ textures */
  function toile(w, h, dessin) { const c = document.createElement('canvas'); c.width = w; c.height = h; dessin(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t }
  function textureChevrons() {    // gauche « , droite » : plaque sombre à chevrons blancs
    return toile(256, 128, (g, w, h) => {
      for (let k = 0; k < 2; k++) {
        const x0 = k * 128; g.fillStyle = '#20222c'; g.fillRect(x0 + 4, 4, 120, 120); g.strokeStyle = '#f3f5fa'; g.lineWidth = 9; g.lineJoin = 'miter'
        for (let j = 0; j < 2; j++) { const dx = j * 34; g.beginPath(); if (k === 0) { g.moveTo(x0 + 80 - dx, 26); g.lineTo(x0 + 48 - dx, 64); g.lineTo(x0 + 80 - dx, 102) } else { g.moveTo(x0 + 44 + dx, 26); g.lineTo(x0 + 76 + dx, 64); g.lineTo(x0 + 44 + dx, 102) } g.stroke() }
        g.strokeStyle = '#e9b82a'; g.lineWidth = 4; g.strokeRect(x0 + 6, 6, 116, 116)
      }
    })
  }
  function texturePanneau(kind) {       // 50 / 70 / 80 : disque rouge ; 'agglo' : entrée d'agglomération ; 'pieton' : panneau bleu carré
    return toile(128, 128, (g, w, h) => {
      g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h)
      if (kind === 'pieton') { g.fillStyle = '#1b5cc0'; g.fillRect(6, 6, 116, 116); g.fillStyle = '#fff'; g.fillRect(14, 14, 100, 100); g.fillStyle = '#1b5cc0'; g.fillRect(18, 18, 92, 92); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64, 26); g.lineTo(104, 100); g.lineTo(24, 100); g.closePath(); g.fill(); g.fillStyle = '#1b5cc0'; g.beginPath(); g.arc(64, 52, 7, 0, 7); g.fill(); g.fillRect(60, 60, 8, 22); return }
      if (kind === 'agglo') { g.fillStyle = '#fff'; g.fillRect(4, 24, 120, 80); g.strokeStyle = '#c0261e'; g.lineWidth = 8; g.strokeRect(8, 28, 112, 72); g.fillStyle = '#1e2330'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('HAMEAU', 64, 70); g.font = 'bold 15px sans-serif'; g.fillText('50 km/h', 64, 92); return }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#c0261e'; g.lineWidth = 15; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke()
      g.fillStyle = '#16181f'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kind, 64, 68)
    })
  }
  function textureCiel(jour) {
    return toile(1024, 512, (g, w, h) => {
      const d = g.createLinearGradient(0, 0, 0, h)
      if (jour) { d.addColorStop(0, '#3f78c8'); d.addColorStop(.38, '#6ea0dd'); d.addColorStop(.62, '#a4c6ea'); d.addColorStop(.8, '#cfe0f2'); d.addColorStop(1, '#e3ecf6') }
      else { d.addColorStop(0, '#26365f'); d.addColorStop(.38, '#3b5187'); d.addColorStop(.62, '#5f79a8'); d.addColorStop(.8, '#8ea2c4'); d.addColorStop(1, '#a9b8d2') }
      g.fillStyle = d; g.fillRect(0, 0, w, h)
      const R = mulberry32(99)
      for (let i = 0; i < 70; i++) {             // traînées de nuages étirées, inclinées comme dans la pluie
        const x = R() * w, y = h * (.12 + R() * .5), L = 120 + R() * 320, T = 5 + R() * 14
        g.save(); g.translate(x, y); g.rotate(-.12 + R() * .1); const r = g.createRadialGradient(0, 0, 0, 0, 0, L); r.addColorStop(0, (jour ? 'rgba(255,255,255,' : 'rgba(220,230,250,') + (jour ? .22 + R() * .3 : .1 + R() * .16) + ')'); r.addColorStop(1, jour ? 'rgba(255,255,255,0)' : 'rgba(220,230,250,0)')
        g.fillStyle = r; g.scale(1, T / L); g.beginPath(); g.arc(0, 0, L, 0, 7); g.fill(); g.restore()
      }
    })
  }

  /* ------------------------------------------------------------------------------------------------------------ monde */
  function creer(o) {
    preparer()
    const piste = o.piste, renderer = o.renderer, mobile = !!o.mobile
    const scene = new THREE.Scene(), HOR = '#6f84ad'
    scene.background = col(HOR); scene.fog = new THREE.FogExp2(HOR, mobile ? .0012 : .00085)
    const camera = new THREE.PerspectiveCamera(66, 16 / 9, .15, 9000)
    scene.add(new THREE.HemisphereLight('#8aa0d2', '#1a2a24', .95))
    const lune = new THREE.DirectionalLight('#a9bbe2', .55); lune.position.set(-300, 420, 160); scene.add(lune)
    const phare = new THREE.SpotLight('#fff1cf', 2.6, 190, .62, .75, 1.15); phare.castShadow = false; scene.add(phare, phare.target)
    const materiaux = {
      terrain: new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 4, specular: 0x222a30 }),
      route: new THREE.MeshPhongMaterial({ color: '#34364a', shininess: 90, specular: 0x333d58 }),
      accotement: new THREE.MeshPhongMaterial({ color: '#57525a', shininess: 8, specular: 0x222222 }),
      blanc: new THREE.MeshPhongMaterial({ color: '#e7eaf3', shininess: 90, specular: 0xaab6d8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      jaune: new THREE.MeshPhongMaterial({ color: '#e9b82a', shininess: 70, specular: 0x998844, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      decor: new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 5, specular: 0x1e2426 }),
      panneau: new THREE.MeshBasicMaterial({ map: textureChevrons(), side: THREE.DoubleSide }),
      lampe: new THREE.MeshBasicMaterial({ color: '#fff3c4' }),
      pan50: new THREE.MeshBasicMaterial({ map: texturePanneau('50'), transparent: true, alphaTest: .3, side: THREE.DoubleSide }), pan80: new THREE.MeshBasicMaterial({ map: texturePanneau('80'), transparent: true, alphaTest: .3, side: THREE.DoubleSide }),
      panpieton: new THREE.MeshBasicMaterial({ map: texturePanneau('pieton'), side: THREE.DoubleSide }), panagglo: new THREE.MeshBasicMaterial({ map: texturePanneau('agglo'), transparent: true, alphaTest: .3, side: THREE.DoubleSide })
    }
    materiaux.route.polygonOffset = true; materiaux.route.polygonOffsetFactor = -1; materiaux.route.polygonOffsetUnits = -1
    const troncons = new Map(), groupeTroncons = new THREE.Group(); scene.add(groupeTroncons)

    /* ---- un tronçon : terrain, chaussée, marquages, décor, panneaux ; retourne aussi les arbres (collisions) ---- */
    function batir(k) {
      const s0 = k * CH, s1 = s0 + CH, g = new THREE.Group(), R = mulberry32(piste.graine * 7 + k * 131), arbres = []
      // terrain : grille s (4 m) × colonnes latérales ; deux triangles par case, sommets dupliqués (facettes)
      const nL = Math.round(CH / 4), nC = COLS.length, H = new Float32Array((nL + 1) * nC), Cc = []
      for (let i = 0; i <= nL; i++) for (let j = 0; j < nC; j++) H[i * nC + j] = piste.hauteurTerrain(s0 + i * 4, COLS[j])
      const pos = [], clr = [], c = new THREE.Color()
      const couleur = (s, d, h, pente) => {
        const v = P3.fbm(s / 40, d / 40, piste.graine + 3, 3), v2 = P3.noise2(s / 9, d / 9, piste.graine + 8)
        c.set(pente > 1.1 ? '#5b6072' : v > .56 ? '#3b6334' : v > .46 ? '#2f5230' : '#27452a'); if (v2 > .8) c.lerp(col('#6f7a2e'), .5); c.multiplyScalar(.9 + .22 * v2)
        if (Math.abs(d) > 200) c.lerp(col('#2a3d3a'), .4)
        return c
      }
      const P_ = (i, j) => { const s = s0 + i * 4, d = COLS[j], e = piste.echant(s), w = piste.monde(s, d, true); return [w.x, H[i * nC + j], w.z, s, d] }
      for (let i = 0; i < nL; i++) for (let j = 0; j < nC - 1; j++) {
        if (COLS[j] < 0 && COLS[j + 1] > 0) continue              // sous la chaussée : rien
        const a = P_(i, j), b = P_(i, j + 1), cc = P_(i + 1, j), d = P_(i + 1, j + 1)
        const tri = (p, q, r) => {
          const u = V3(q[0] - p[0], q[1] - p[1], q[2] - p[2]), v = V3(r[0] - p[0], r[1] - p[1], r[2] - p[2]), nn = u.cross(v).normalize(), pente = Math.sqrt(1 - Math.abs(nn.y) ** 2) / Math.max(.1, Math.abs(nn.y))
          const cm = couleur((p[3] + q[3] + r[3]) / 3, (p[4] + q[4] + r[4]) / 3, 0, pente); for (const t of [p, q, r]) { pos.push(t[0], t[1], t[2]); clr.push(cm.r, cm.g, cm.b) }
        }
        if ((i + j) % 2) { tri(a, b, cc); tri(b, d, cc) } else { tri(a, d, cc); tri(a, b, d) }
      }
      const gt = new THREE.BufferGeometry(); gt.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gt.setAttribute('color', new THREE.Float32BufferAttribute(clr, 3)); gt.computeVertexNormals()
      const mt = new THREE.Mesh(gt, materiaux.terrain); mt.frustumCulled = false; g.add(mt)
      // chaussée : bandes toutes les 2 m ; colonnes : accotement (-5,1 -4,5) asphalte (-4,5 4,5) accotement
      const rows = Math.round(CH / 2), ra = [], rp = []
      const asph = [], acc = [], blanc = [], jaune = []
      const pt = (s, d, dy, hors) => { const w = piste.monde(s, d, hors); return [w.x, (hors ? piste.hauteurTerrain(s, d) : w.y) + (dy || 0), w.z] }
      const ruban = (arr, s, d0, d1, dy, hors0, hors1, face) => {       // ajoute un quad entre s et s+2 pour les bords d0..d1
        const a = pt(s, d0, dy, hors0), b = pt(s, d1, dy, hors1), cc = pt(s + 2, d0, dy, hors0), d = pt(s + 2, d1, dy, hors1)
        arr.push(...a, ...b, ...cc, ...b, ...d, ...cc)
      }
      for (let i = 0; i < rows; i++) {
        const s = s0 + i * 2
        ruban(asph, s, -4.5, 4.5, 0, false, false)
        ruban(acc, s, -5.1, -4.5, 0, true, false); ruban(acc, s, 4.5, 5.1, 0, false, true)
        ruban(blanc, s, -4.32, -4.14, .03, false, false); ruban(blanc, s, 4.14, 4.32, .03, false, false)
        ruban(jaune, s, -.2, -.08, .03, false, false); ruban(jaune, s, .08, .2, .03, false, false)
        if (Math.floor(s / 12) % 2 === 0 && false) ruban(blanc, s, -2.3, -2.2, .03, false, false)
      }
      const mk = (arr, m, ordre) => { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); gg.computeVertexNormals(); const me = new THREE.Mesh(gg, m); me.frustumCulled = false; me.renderOrder = ordre || 0; g.add(me); return me }
      mk(asph, materiaux.route); mk(acc, materiaux.accotement); mk(blanc, materiaux.blanc, 1); mk(jaune, materiaux.jaune, 1)

      // décor : conifères (groupes denses), buissons, rochers, arbres morts rouges, herbes sèches, souches, poteaux
      const items = { conif: [], bu: [], ro: [], mort: [], herbe: [], souche: [], poteau: [] }
      const place = (s, d, dec, dy) => { const w = piste.monde(s, d, true); return [w.x, piste.hauteurTerrain(s, d) + (dy || 0), w.z] }
      for (let n = 0; n < 150; n++) {
        const s = s0 + R() * CH, cote = R() < .5 ? -1 : 1
        const dist = R() < .42 ? 9 + R() * 26 : 20 + Math.pow(R(), 1.6) * 210, d = cote * dist
        const dens = P3.fbm(s / 150, d / 150, piste.graine + 21, 3); if (dens < .42 && R() < .8) continue
        const hauteur = dist < 30 ? 6 + R() * 14 : 7 + R() * 22, p = place(s, d)
        const tint = .85 + R() * .3, tn = [tint * (.92 + R() * .12), tint, tint * (.9 + R() * .1)]
        items.conif.push({ g: GEO.conifere, m: mat(p[0], p[1] - .3, p[2], R() * 6.28, hauteur * .36, hauteur, hauteur * .36), t: tn })
        if (dist < 40) arbres.push({ s, d, r: Math.max(.45, hauteur * .03) })
      }
      for (let n = 0; n < 50; n++) { const s = s0 + R() * CH, cote = R() < .5 ? -1 : 1, d = cote * (7 + Math.pow(R(), 1.5) * 70), p = place(s, d), r = .8 + R() * 1.6
        items.bu.push({ g: GEO.buisson, m: mat(p[0], p[1] - .1, p[2], R() * 6.28, r, r * (.8 + R() * .5), r), t: [.9 + R() * .2, .9 + R() * .25, .9 + R() * .2] }) }
      for (let n = 0; n < 20; n++) { const s = s0 + R() * CH, cote = R() < .5 ? -1 : 1, d = cote * (6.5 + Math.pow(R(), 1.3) * 120), p = place(s, d), r = .7 + R() * R() * 2.3
        items.ro.push({ g: GEO.roche, m: mat(p[0], p[1] - .15 * r, p[2], R() * 6.28, r, r * (.6 + R() * .5), r, (R() - .5) * .4, (R() - .5) * .4) }); if (d * cote < 30 && r > 1.1) arbres.push({ s, d, r: r * .9 }) }
      for (let n = 0; n < 5; n++) { const s = s0 + R() * CH, cote = R() < .5 ? -1 : 1, d = cote * (8 + R() * 38), p = place(s, d), h = 4 + R() * 6
        items.mort.push({ g: GEO.mort, m: mat(p[0], p[1] - .2, p[2], R() * 6.28, h, h, h, (R() - .5) * .25, (R() - .5) * .25) }) }
      for (let n = 0; n < 60; n++) { const s = s0 + R() * CH, cote = R() < .5 ? -1 : 1, d = cote * (5.6 + R() * 10), p = place(s, d), h = .9 + R() * 1.4
        items.herbe.push({ g: GEO.herbe, m: mat(p[0], p[1] - .03, p[2], R() * 6.28, h, h, h) }) }
      for (let n = 0; n < 2; n++) { const s = s0 + R() * CH, cote = R() < .5 ? -1 : 1, d = cote * (10 + R() * 40), p = place(s, d); items.souche.push({ g: GEO.souche, m: mat(p[0], p[1], p[2], R() * 6.28, 1.2 + R(), 1 + R() * 1.4, 1.2 + R()) }) }
      // poteaux blancs tous les 40 m à l'extérieur des courbes
      for (let s = Math.ceil(s0 / 40) * 40; s < s1; s += 40) { const e = piste.echant(s); if (Math.abs(e.k) > 1 / 500) { const cote = e.k > 0 ? -1 : 1, p = place(s, cote * 5.4); items.poteau.push({ g: GEO.poteau, m: mat(p[0], p[1], p[2], 0, 1, 1, 1) }) } }
      for (const nom in items) { const gm = fusion(items[nom]); if (gm) { const me = new THREE.Mesh(gm, materiaux.decor); me.frustumCulled = true; g.add(me) } }
      // panneaux à chevrons : à l'extérieur de chaque courbe serrée, tous les 13 m
      const pan = []
      for (let s = Math.ceil(s0 / 13) * 13; s < s1; s += 13) {
        const e = piste.echant(s); if (Math.abs(e.k) < 1 / 330) continue
        const cote = e.k > 0 ? -1 : 1, d = cote * 6.3, p = place(s, d), f = V3(e.fx, 0, e.fz), r = V3(e.rx, 0, e.rz), hw = .78, y0 = p[1] + .75, y1 = y0 + 1.25
        const u0 = e.k > 0 ? .5 : 0, u1 = u0 + .5                 // virage à droite : »
        const faceDir = f.clone().multiplyScalar(-1), bx = r.clone().multiplyScalar(hw)
        const A = V3(p[0], 0, p[2]).sub(bx), B = V3(p[0], 0, p[2]).add(bx)
        const pa = [[A.x, y0, A.z, u1, 0], [B.x, y0, B.z, u0, 0], [A.x, y1, A.z, u1, 1], [B.x, y1, B.z, u0, 1]]
        pan.push(pa)
        const po = mat(p[0], p[1], p[2], 0, 1, 1, 1)           // poteau du panneau
        items.poteau.push({ g: [GEO.poteau[0]], m: mat(p[0], p[1] - .02, p[2], 0, .7, 1.1, .7) })
      }
      if (pan.length) {
        const ps = [], us = []; for (const q of pan) { for (const i of [0, 2, 1, 1, 2, 3]) { ps.push(q[i][0], q[i][1], q[i][2]); us.push(q[i][3], q[i][4]) } }
        const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); gp.setAttribute('uv', new THREE.Float32BufferAttribute(us, 2)); const me = new THREE.Mesh(gp, materiaux.panneau); me.frustumCulled = false; g.add(me)
      }

      // ---- hameaux : maisons, lampadaires, panneaux, passage piéton ----
      const hm = piste.hameaux.filter((h) => h.s1 > s0 - 20 && h.s0 < s1 + 20)
      if (hm.length) {
        const maisons = [], lamp = [], lampes = [], tex = { '50': [], '80': [], pieton: [], agglo: [] }
        const Rh = mulberry32(piste.graine * 11 + k * 977)
        for (const h of hm) {
          // maisons des deux côtés, alignées sur la route, espacées de 16 à 26 m
          for (const cote of [-1, 1]) {
            for (let s = Math.max(h.s0 + 8, Math.ceil(s0 / 18) * 18) + Rh() * 6; s < Math.min(h.s1 - 4, s1); s += 17 + Rh() * 10) {
              if (Math.abs(s - h.passage) < 9 && Rh() < .7) continue
              const d = cote * (12.5 + Rh() * 6), w = 6.5 + Rh() * 4, pr = 6 + Rh() * 3, ha = 3.8 + Rh() * 2.2
              const p = place(s, d), e = piste.echant(s), yaw = -e.th + (cote > 0 ? 0 : Math.PI) + (Rh() - .5) * .25
              const base = M4.clone().compose(V3(p[0], p[1] - 1.2, p[2]), Q4.clone().setFromEuler(E4.clone().set(0, yaw, 0)), V3(1, 1, 1))
              const teinte = [.9 + Rh() * .1, .9 + Rh() * .1, .88 + Rh() * .12]
              const loc = (lx, ly, lz, sx, sy, sz) => base.clone().multiply(M4.clone().compose(V3(lx, ly, lz), Q4.clone().identity(), V3(sx, sy, sz)))
              maisons.push({ g: GEO.mur, m: loc(0, 0, 0, w, ha + 1.2, pr), t: teinte })
              maisons.push({ g: GEO.toit, m: loc(0, ha + 1.2, 0, w + .7, 2.4 + Rh() * .8, pr + .7), t: [.9 + Rh() * .2, .9 + Rh() * .15, .9 + Rh() * .15] })
              maisons.push({ g: GEO.cheminee, m: loc(w * .25, ha + 1.2, 0, .5, 2.6, .5), t: [1, 1, 1] })
              const zf = -pr / 2 - .02          // façade tournée vers la route (−z local)
              maisons.push({ g: GEO.porte, m: loc((Rh() - .5) * w * .4, 1.2 + 1.0, zf, 1.0, 2.0, .08), t: [1, 1, 1] })
              for (const fx of [-w * .33, w * .33]) for (const fy of [1.2 + 1.7, 1.2 + ha - 1.0]) { if (fy > 1.2 + ha - .5) continue
                maisons.push({ g: GEO.volet, m: loc(fx - .62, fy, zf - .005, .28, 1.35, .05), t: [1, 1, 1] }); maisons.push({ g: GEO.volet, m: loc(fx + .62, fy, zf - .005, .28, 1.35, .05), t: [1, 1, 1] }); maisons.push({ g: GEO.fenetre, m: loc(fx, fy, zf - .01, .9, 1.25, .06), t: [1, 1, 1] }) }
              arbres.push({ s, d, r: Math.max(w, pr) * .5 })
            }
          }
          // lampadaires tous les 26 m, des deux côtés (têtes allumées la nuit)
          for (let s = Math.ceil(Math.max(h.s0, s0) / 26) * 26; s < Math.min(h.s1, s1); s += 26) for (const cote of [-1, 1]) {
            const p = place(s, cote * 6.1), e = piste.echant(s), yaw = -e.th + (cote > 0 ? Math.PI : 0)
            lamp.push({ g: GEO.lampadaire, m: mat(p[0], p[1], p[2], yaw, 1, 1, 1), t: [1, 1, 1] }); lampes.push({ g: GEO.lampe, m: mat(p[0], p[1], p[2], yaw, 1, 1, 1), t: [1, 1, 1] })
          }
          // panneaux : entrée (50), sortie (80), passage piéton de part et d'autre du passage
          const poste = (s, cote, kind, dy) => { const p = place(s, cote * 5.7), e = piste.echant(s), yaw = -e.th, hw = .42
            tex[kind].push({ p, e, cote, hw, y0: p[1] + (dy || 1.6) }); lamp.push({ g: [GEO.poteau[0]], m: mat(p[0], p[1] - .02, p[2], 0, .6, 1.8, .6), t: [1, 1, 1] }) }
          if (h.s0 - 40 >= s0 && h.s0 - 40 < s1) { poste(h.s0 - 40, 1, 'agglo'); poste(h.s0 - 10, 1, '50'); poste(h.s0 - 10, -1, '50') }
          if (h.s1 + 14 >= s0 && h.s1 + 14 < s1) { poste(h.s1 + 14, 1, '80'); poste(h.s1 + 14, -1, '80') }
          if (h.passage - 22 >= s0 && h.passage - 22 < s1) poste(h.passage - 22, 1, 'pieton', 1.9)
          if (h.passage + 22 >= s0 && h.passage + 22 < s1) poste(h.passage + 22, -1, 'pieton', 1.9)
          // passage piéton : bandes blanches parallèles à la route sur toute la largeur
          if (h.passage >= s0 - 3 && h.passage < s1 + 3) {
            const zq = []
            for (let d0 = -4.0; d0 < 4.0; d0 += 1.0) for (let a = -1.4; a < 1.4; a += 2.8) { const sA = h.passage + a, sB = h.passage + a + 2.8
              const A_ = pt(sA, d0, .035), B_ = pt(sA, d0 + .5, .035), C_ = pt(sB, d0, .035), D_ = pt(sB, d0 + .5, .035); zq.push(...A_, ...B_, ...C_, ...B_, ...D_, ...C_) }
            mk(zq, materiaux.blanc, 2)
          }
        }
        for (const [nm, arr] of [['maison', maisons], ['lamp', lamp]]) { const gm = fusion(arr); if (gm) { const me = new THREE.Mesh(gm, materiaux.decor); me.frustumCulled = true; g.add(me) } }
        const gl = fusion(lampes); if (gl) { const me = new THREE.Mesh(gl, materiaux.lampe); me.frustumCulled = true; g.add(me) }
        for (const kind in tex) for (const t of tex[kind]) {
          const f = V3(t.e.fx, 0, t.e.fz), r = V3(t.e.rx, 0, t.e.rz), hw = t.hw, y0 = t.y0, y1 = y0 + hw * 2
          const A = V3(t.p[0], 0, t.p[2]).sub(r.clone().multiplyScalar(hw)), B = V3(t.p[0], 0, t.p[2]).add(r.clone().multiplyScalar(hw))
          const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.Float32BufferAttribute([A.x, y0, A.z, B.x, y0, B.z, A.x, y1, A.z, B.x, y0, B.z, B.x, y1, B.z, A.x, y1, A.z], 3)); gp.setAttribute('uv', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1], 2))
          const me = new THREE.Mesh(gp, materiaux['pan' + kind]); me.frustumCulled = false; g.add(me)
        }
      }
      groupeTroncons.add(g)
      return { g, arbres, k }
    }
    const liberer = (t) => { groupeTroncons.remove(t.g); t.g.traverse((o) => { if (o.geometry) o.geometry.dispose() }) }
    function actualiser(s, tout) {       // au plus un tronçon bâti par appel en course (évite les à-coups) ; tout = true : tous d'un coup (départ)
      const k0 = Math.floor(s / CH), a = k0 - 1, b = Math.min(Math.floor(piste.longueur / CH) + 6, k0 + (mobile ? 6 : 8)); let neufs = 0
      for (let k = Math.max(0, a); k <= b; k++) if (!troncons.has(k) && (tout || neufs < 1)) { troncons.set(k, batir(k)); neufs++ }
      for (const [k, t] of troncons) if (k < a - 1 || k > b + 1) { liberer(t); troncons.delete(k) }
    }
    function arbresProches(s) { const out = []; const k0 = Math.floor(s / CH); for (let k = k0 - 1; k <= k0 + 1; k++) { const t = troncons.get(k); if (t) for (const a of t.arbres) out.push(a) } return out }

    /* ---- ciel, montagnes lointaines (suivent la voiture en x/z) ---- */
    const cieux = { crep: textureCiel(false), jour: textureCiel(true) }
    const ciel = new THREE.Mesh(new THREE.SphereGeometry(8500, 32, 16), new THREE.MeshBasicMaterial({ map: cieux.crep, side: THREE.BackSide, fog: false, depthWrite: false })); ciel.renderOrder = -10; scene.add(ciel)
    const montagnes = new THREE.Group(); scene.add(montagnes)
    { const R = mulberry32(4242), mNeige = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 2, fog: true })
      for (let i = 0; i < 46; i++) {
        const a = R() * Math.PI * 2, dist = 3600 + R() * 3600, h = 700 + R() * 1500, r = h * (.55 + R() * .4)
        const cone = new THREE.ConeGeometry(r, h, 6 + Math.floor(R() * 3), 3), p = cone.attributes.position
        for (let j = 0; j < p.count; j++) { const x = p.getX(j), z = p.getZ(j), y = p.getY(j); if (y < h / 2 - 1) { const k = 1 + (P3.hash2(Math.round(x), Math.round(z), i) - .5) * .28; p.setX(j, x * k); p.setZ(j, z * k); p.setY(j, y + (P3.hash2(Math.round(z), Math.round(x), i + 9) - .5) * h * .08) } }
        const g = plat(cone, (x, y, z, j) => { const t = (y + h / 2) / h; return col(t > .74 ? (j % 6 < 3 ? '#d3dbec' : '#8f9dbf') : (j % 6 < 3 ? '#44557d' : '#2c3859')) })
        g.computeVertexNormals(); const m = new THREE.Mesh(g, mNeige); m.position.set(Math.cos(a) * dist, h / 2 - 240, Math.sin(a) * dist); m.rotation.y = R() * 6; montagnes.add(m)
      } }

    /* ---- pluie : traits qui tombent autour de la caméra, allongés par la vitesse relative ---- */
    const NP = o.reduit ? 500 : mobile ? 1100 : 2000, pluiePos = new Float32Array(NP * 6), pluieBase = new Float32Array(NP * 3), R2 = mulberry32(5)
    for (let i = 0; i < NP; i++) { pluieBase[i * 3] = (R2() - .5) * 70; pluieBase[i * 3 + 1] = R2() * 34; pluieBase[i * 3 + 2] = -R2() * 110 + 10 }
    const gPluie = new THREE.BufferGeometry(); gPluie.setAttribute('position', new THREE.BufferAttribute(pluiePos, 3))
    const pluie = new THREE.LineSegments(gPluie, new THREE.LineBasicMaterial({ color: '#c6d3ee', transparent: true, opacity: .42, fog: false, depthWrite: false })); pluie.frustumCulled = false; pluie.renderOrder = 20; scene.add(pluie)
    const qCam = new THREE.Quaternion(), vv = V3(0, 0, 0), ww = V3(0, 0, 0)
    function majPluie(dt, vitesse, t) {
      const tombe = 21, len = .05                                  // m/s ; durée d'exposition simulée
      camera.getWorldQuaternion(qCam)
      for (let i = 0; i < NP; i++) {
        let x = pluieBase[i * 3], y = pluieBase[i * 3 + 1], z = pluieBase[i * 3 + 2]
        y -= tombe * dt; z += vitesse * dt                          // la caméra avance : les gouttes défilent vers l'arrière (repère caméra : -z devant)
        if (y < -3) { y += 36; x = (R2() - .5) * 70; z = -R2() * 110 + 10 }
        if (z > 14) { z -= 124; x = (R2() - .5) * 70; y = R2() * 34 }
        pluieBase[i * 3] = x; pluieBase[i * 3 + 1] = y; pluieBase[i * 3 + 2] = z
        vv.set(x, y, z).applyQuaternion(qCam).add(camera.position)
        ww.set(x + .6 * len * 8, y + tombe * len, z - vitesse * len).applyQuaternion(qCam).add(camera.position)
        pluiePos[i * 6] = vv.x; pluiePos[i * 6 + 1] = vv.y; pluiePos[i * 6 + 2] = vv.z; pluiePos[i * 6 + 3] = ww.x; pluiePos[i * 6 + 4] = ww.y; pluiePos[i * 6 + 5] = ww.z
      }
      gPluie.attributes.position.needsUpdate = true
    }

    /* ---- ligne idéale (ruban cyan) ---- */
    const NLI = 70, lignePos = new Float32Array(NLI * 2 * 3), ligneCol = new Float32Array(NLI * 2 * 3), idxL = []
    for (let i = 0; i < NLI - 1; i++) { const a = i * 2; idxL.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    const gLigne = new THREE.BufferGeometry(); gLigne.setAttribute('position', new THREE.BufferAttribute(lignePos, 3)); gLigne.setAttribute('color', new THREE.BufferAttribute(ligneCol, 3)); gLigne.setIndex(idxL)
    const ligneMesh = new THREE.Mesh(gLigne, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); ligneMesh.frustumCulled = false; ligneMesh.renderOrder = 3; scene.add(ligneMesh)
    const bleu = new THREE.Color('#43e6ff'), rouge = new THREE.Color('#ff5a4a'), fond = new THREE.Color('#2b2f40'), tc = new THREE.Color()
    function ligneIdeale(s, freinage) {
      for (let i = 0; i < NLI; i++) {
        const si = s + 6 + i * 2.6, e = piste.echant(si), d = e.ligne, w = .22
        for (let k = 0; k < 2; k++) {
          const dd = d + (k ? w : -w), p = piste.monde(si, dd), o3 = (i * 2 + k) * 3
          lignePos[o3] = p.x; lignePos[o3 + 1] = p.y + .06; lignePos[o3 + 2] = p.z
          tc.copy(freinage > .5 ? rouge : bleu).lerp(fond, smooth(i / NLI) * .85); ligneCol[o3] = tc.r; ligneCol[o3 + 1] = tc.g; ligneCol[o3 + 2] = tc.b
        }
      }
      gLigne.attributes.position.needsUpdate = true; gLigne.attributes.color.needsUpdate = true
    }

    /* ---- balises de points de passage : épingle bleue lumineuse + faisceau ---- */
    const balises = piste.CP.map((s, i) => {
      const g = new THREE.Group(), e = piste.echant(s), p = piste.monde(s, 0)
      const bille = new THREE.Mesh(new THREE.SphereGeometry(.65, 14, 10), new THREE.MeshBasicMaterial({ color: '#3fa8ff', fog: false })); bille.position.y = 3.6; g.add(bille)
      const pointe = new THREE.Mesh(new THREE.ConeGeometry(.4, 1.1, 10), new THREE.MeshBasicMaterial({ color: '#3fa8ff', fog: false })); pointe.rotation.x = Math.PI; pointe.position.y = 2.65; g.add(pointe)
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: toile(64, 64, (c, w) => { const r = c.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(120,200,255,.95)'); r.addColorStop(.4, 'rgba(70,150,255,.35)'); r.addColorStop(1, 'rgba(60,120,255,0)'); c.fillStyle = r; c.fillRect(0, 0, 64, 64) }), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); halo.scale.set(7, 7, 1); halo.position.y = 3.6; g.add(halo)
      const faisceau = new THREE.Mesh(new THREE.CylinderGeometry(.3, .9, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#58b8ff', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); faisceau.position.y = 15; g.add(faisceau)
      // portique d'arrivée / de passage : deux poteaux et une bande à damier
      const cad = new THREE.MeshPhongMaterial({ color: '#2b3142', flatShading: true }), bande = new THREE.Mesh(new THREE.BoxGeometry(11, .7, .3), new THREE.MeshBasicMaterial({ map: toile(128, 16, (c) => { for (let q = 0; q < 16; q++) for (let r = 0; r < 2; r++) { c.fillStyle = (q + r) % 2 ? '#f4f6fb' : '#20222c'; c.fillRect(q * 8, r * 8, 8, 8) } }) }))
      bande.position.y = 6.2; g.add(bande); [-5.4, 5.4].forEach((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.35, 6.4, .35), cad); m.position.set(x, 3.2, 0); g.add(m) })
      g.position.set(p.x, p.y, p.z); g.rotation.y = -e.th; scene.add(g); g.userData = { s, pin: [bille, pointe, halo, faisceau] }; return g
    })
    function balise(i, actif) { balises.forEach((b, j) => { b.visible = true; b.userData.pin.forEach((m) => (m.visible = j === i && actif)) }) }

    /* ---- phare : cône lumineux visible dans l'air humide ---- */
    const cone = new THREE.Mesh(new THREE.ConeGeometry(11, 62, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3cf', transparent: true, opacity: .075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }))
    cone.geometry.translate(0, -31, 0); cone.geometry.rotateX(-Math.PI / 2); cone.renderOrder = 5; scene.add(cone)

    /* ---- voitures en polygones ---- */
    function voiture(c) {
      c = Object.assign({ corps: '#6f9bd6', bande: '#f3f5fa', toit: '#20242f', nom: 'VOITURE' }, c || {})
      const g = new THREE.Group(), PH = (hex, o) => new THREE.MeshPhongMaterial(Object.assign({ color: hex, flatShading: false, shininess: 60, specular: 0x8899bb }, o || {}))
      const mCorps = PH(c.corps), mBande = PH(c.bande, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), mVitre = PH('#16202e', { shininess: 120, specular: 0x99aacc }), mNoir = PH('#15151c', { shininess: 10, specular: 0x222222 })
      const mFeu = new THREE.MeshBasicMaterial({ color: '#b3161c' }), mFeuF = new THREE.MeshBasicMaterial({ color: '#fff0c0' })
      // carrosserie par balayage : stations (z, demi-largeur, bas, haut, exposant) de l'arrière (-z) vers l'avant (+z) ; la voiture regarde vers +z
      const ST = [[-2.18, .72, .36, .92, 3.2], [-2.05, .8, .3, .98, 3], [-1.6, .86, .28, 1.04, 2.8], [-1.0, .89, .26, 1.06, 2.6], [0, .9, .26, 1.06, 2.6], [1.0, .89, .26, 1.0, 2.6], [1.7, .85, .28, .9, 2.8], [2.1, .78, .32, .8, 3], [2.22, .68, .4, .68, 3.4]]
      const interp = (z) => { let i = 0; while (i < ST.length - 2 && z > ST[i + 1][0]) i++; const a = ST[i], b = ST[i + 1], t = smooth((z - a[0]) / (b[0] - a[0])); return [1, 2, 3, 4].map((k) => lerp(a[k], b[k], t)) }
      const loft = (n, m, fn) => {
        const pos = [], idx = []; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const p = fn(i / (n - 1), j / m); pos.push(p[0], p[1], p[2]) }
        for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) { const j2 = (j + 1) % m, a = i * m + j, b = i * m + j2, cc = (i + 1) * m + j, d = (i + 1) * m + j2; idx.push(a, cc, b, b, cc, d) }
        const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals(); return ge
      }
      const sect = (z, ph, grow, scaleY) => { const [w, yb, yt, e] = interp(z), cs = Math.cos(ph), sn = Math.sin(ph), yc = (yb + yt) / 2, h = (yt - yb) / 2 * (scaleY || 1); return [Math.sign(cs) * Math.pow(Math.abs(cs), 2 / e) * (w + (grow || 0)), yc + Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e) * (h + (grow || 0)), z] }
      const cg = loft(34, 28, (s, a) => sect(-2.22 + s * 4.44, a * Math.PI * 2, 0, 1)); const corps = new THREE.Mesh(cg, mCorps); g.add(corps)
      // bande blanche centrale sur le capot, le toit et le hayon (plaquée de 4 mm)
      const bg = loft(40, 6, (s, a) => { const z = -2.12 + s * 4.3, [w, yb, yt, e] = interp(z), x = (a - .5) * .5 * 1; const yy = yt - Math.pow(Math.abs(x) / Math.max(w, .3), e) * (yt - yb) * .5; return [x, yt + .006 + Math.abs(x) * .0, z] })
      { const pos = [], idx = []; const Ns = 44; for (let i = 0; i < Ns; i++) { const z = -2.1 + i / (Ns - 1) * 4.2, [w, yb, yt] = interp(z); const hy = z > -1.2 && z < .9 ? 1.27 : yt; for (const x of [-.22, .22]) pos.push(x, (z > -1.2 && z < .9 ? 1.272 : yt + .01), z) } for (let i = 0; i < Ns - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) } const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gb.setIndex(idx); gb.computeVertexNormals(); g.add(new THREE.Mesh(gb, mBande)) }
      // habitacle : boîte effilée en verre fumé + montants de la couleur de la carrosserie
      const hab = loft(16, 20, (s, a) => { const z = -1.35 + s * 2.3, t = s, ph = a * Math.PI * 2, cs = Math.cos(ph), sn = Math.sin(ph), w = .76 - Math.abs(t - .45) * .16 - (t > .7 ? (t - .7) * .5 : 0) - (t < .2 ? (.2 - t) * .5 : 0), h = .34 + .06 * Math.sin(t * Math.PI); return [Math.sign(cs) * Math.pow(Math.abs(cs), .55) * w, 1.05 + (sn > 0 ? Math.pow(Math.abs(sn), .7) * h * (1 - Math.abs(t - .5) * .35) : Math.sign(sn) * Math.abs(sn) * .02), z] })
      g.add(new THREE.Mesh(hab, mVitre)); { const toit = loft(10, 16, (s, a) => { const z = -.55 + s * 1.05, ph = a * Math.PI * 2, cs = Math.cos(ph), sn = Math.sin(ph); return [Math.sign(cs) * Math.pow(Math.abs(cs), .5) * .66, 1.36 + Math.max(0, sn) * .02 - .3 + (sn > 0 ? .3 : 0) * 0.0, z] }); void toit }
      // roues : pneu, jante, garde-boue sombre
      const roues = []
      const pneuG = new THREE.CylinderGeometry(.34, .34, .26, 18); pneuG.rotateZ(Math.PI / 2); const janteG = new THREE.CylinderGeometry(.22, .22, .27, 10); janteG.rotateZ(Math.PI / 2)
      ;[[-.83, 1.38], [.83, 1.38], [-.83, -1.32], [.83, -1.32]].forEach(([x, z], i) => { const w = new THREE.Group(); w.position.set(x, .34, z); const pn = new THREE.Mesh(pneuG, mNoir); const jt = new THREE.Mesh(janteG, PH('#b9c2d6', { shininess: 90 })); w.add(pn, jt); g.add(w); roues.push(w) })
      // feux arrière (réactifs au freinage), plaque, pots d'échappement, becquet
      const feuxAR = []; ;[-1, 1].forEach((q) => { const f = new THREE.Mesh(new THREE.BoxGeometry(.56, .2, .06), mFeu.clone()); f.position.set(q * .55, .78, -2.17); g.add(f); feuxAR.push(f) })
      { const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, .05, .05), mFeu.clone()); bar.position.set(0, .78, -2.165); g.add(bar); feuxAR.push(bar) }
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.52, .13), new THREE.MeshBasicMaterial({ map: toile(128, 32, (cx, w, h) => { cx.fillStyle = '#f5f6fa'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#1e4fb4'; cx.fillRect(0, 0, 12, h); cx.fillStyle = '#20222c'; cx.font = 'bold 20px monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(c.plaque || 'TA-045-LS', 70, 17) }) }))
      plaque.position.set(0, .56, -2.19); plaque.rotation.y = Math.PI; g.add(plaque)
      ;[-.4, .4].forEach((x) => { const e = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .2, 8), PH('#888fa0', { shininess: 100 })); e.rotation.x = Math.PI / 2; e.position.set(x, .36, -2.25); g.add(e) })
      { const bq = new THREE.Mesh(new THREE.BoxGeometry(1.5, .06, .28), mCorps); bq.position.set(0, .99, -2.06); bq.rotation.x = -.12; g.add(bq) }
      // phares (avant) et grille
      ;[-1, 1].forEach((q) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .06, 12), mFeuF); f.rotation.x = Math.PI / 2; f.position.set(q * .55, .7, 2.16); g.add(f) })
      // ombre portée simple (tache sombre collée au sol)
      const ombre = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 4.7), new THREE.MeshBasicMaterial({ map: toile(64, 128, (cx, w, h) => { const r = cx.createRadialGradient(32, 64, 4, 32, 64, 60); r.addColorStop(0, 'rgba(0,0,0,.42)'); r.addColorStop(.6, 'rgba(0,0,0,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)'); cx.save(); cx.scale(1, 1); cx.fillStyle = r; cx.fillRect(0, 0, w, h); cx.restore() }), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }))
      ombre.rotation.x = -Math.PI / 2; ombre.position.y = .03; ombre.renderOrder = 2
      g.userData = { roues, feuxAR, ombre, corps }
      const conteneur = new THREE.Group(); conteneur.add(g); conteneur.add(ombre); conteneur.userData = g.userData; conteneur.userData.interieur = g
      return conteneur
    }

    const M = { scene, camera, piste, materiaux, phare, cone, lune, ciel, cieux, montagnes, balises, balise, voiture, ligneIdeale, actualiser, arbresProches, majPluie, pluie, CH, troncons }
    M.suivre = (x, z) => { ciel.position.set(x, 0, z); montagnes.position.set(x, 0, z) }
    return M
  }
  root.Monde3D = { creer, CH }
})(typeof window !== 'undefined' ? window : globalThis)

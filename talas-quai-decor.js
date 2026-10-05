/* LE QUAI DE TALAS, partie « décor » : escaliers, garde-corps, lanternes, fenêtres, maisons sur pilotis (une par atelier), phare,
 * arbres, herbe, rochers, bateaux, bannières. Tout est modélisé ici en code (aucun modèle importé) et peint avec talas-monde.js.
 * Prolonge talas-quai.js : Q.decor(contexte) est appelé pendant Q.build(). */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE, Q = window.TALAS_QUAI
  if (!THREE || !M || !Q || !Q.on) return
  const PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

  Q.decor = function (c) {
    const { s, r, DECK, PLACE, HAB, LAN, FEN, PORTES, cliquables, hauteur, rangee, pilesSous, zoneRect, zoneDisque, zoneRampe } = c
    const T = M.peintre
    const toon = (col, o) => new THREE.MeshToonMaterial(Object.assign({ color: col, gradientMap: grad }, o || {}))
    const toonT = (map, o) => new THREE.MeshToonMaterial(Object.assign({ map, color: '#ffffff', gradientMap: grad }, o || {}))
    const ombre = (m) => { m.castShadow = true; m.receiveShadow = true; return m }

    /* ------------------------------------------------------------ outils de géométrie */
    function uvMonde(g, k, ox, oy) { // UV en mètres du monde (la texture garde la même taille quelle que soit la face)
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
      for (let i = 0; i < p.count; i++) {
        const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v
        if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i) } else if (ay >= az) { u = p.getX(i); v = p.getZ(i) } else { u = p.getX(i); v = p.getY(i) }
        uv.setXY(i, u * k + (ox || 0), v * k + (oy || 0))
      }
      uv.needsUpdate = true; return g
    }
    const boite = (w, h, d, mat, x, y, z, par, k) => { const g = new THREE.BoxBufferGeometry(w, h, d); if (k) uvMonde(g, k); const m = ombre(new THREE.Mesh(g, mat)); m.position.set(x, y, z); (par || s).add(m); return m }
    const cyl = (rt, rb, h, mat, x, y, z, par, seg) => { const m = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(rt, rb, h, seg || 10), mat)); m.position.set(x, y, z); (par || s).add(m); return m }
    function poutre(a, b, ep, mat, par, ep2) { const d = b.clone().sub(a), L = d.length(), m = ombre(new THREE.Mesh(new THREE.BoxBufferGeometry(ep, ep2 || ep, L), mat)); m.position.copy(a).addScaledVector(d, .5); m.lookAt(b); (par || s).add(m); return m }
    /* lot : regroupe beaucoup de petites pièces d'un même matériau dans un seul maillage */
    function lot(mat) {
      const P = [], N = [], U = [], I = []; let off = 0
      return {
        ajouter(geo, matrix) {
          const g = geo.index ? geo : geo, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(matrix)
          for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(matrix); P.push(v.x, v.y, v.z); v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z); U.push(uv.getX(i), uv.getY(i)) }
          if (g.index) for (let i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + off); else for (let i = 0; i < pos.count; i++) I.push(i + off)
          off += pos.count
        },
        construire() { if (!P.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); const m = ombre(new THREE.Mesh(g, mat)); s.add(m); return m }
      }
    }
    const M4 = new THREE.Matrix4(), Qt = new THREE.Quaternion(), EU = new THREE.Euler()
    const placer = (x, y, z, rx, ry, rz, sx, sy, sz) => M4.compose(V3(x, y, z), Qt.setFromEuler(EU.set(rx || 0, ry || 0, rz || 0)), V3(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz))

    /* ------------------------------------------------------------ matériaux peints */
    const PALS = {
      violet: ['#6b4a8f', '#5d3f7f', '#7b5aa0', '#54367a'], rouge: ['#8f3a2f', '#7a2e27', '#a04638', '#6d2a26'], teal: ['#3f7f86', '#356d75', '#4b9098', '#2d5f68'],
      ocre: ['#b58a45', '#a77b3a', '#c29a55', '#94692f'], gris: ['#7a7a8c', '#6a6a7e', '#8b8b9e', '#5c5c70'], creme: ['#d9c9a0', '#cbb98c', '#e6d8b4', '#bfae82']
    }
    const TOITS = { violet: ['#5a2f5e', '#6b3a72', '#4d284f', '#7a4680'], brun: ['#7a3a2a', '#8a4634', '#6a3024', '#9a5240'], teal: ['#2f6a70', '#3a7c82', '#265a60', '#468a90'], ocre: ['#8a5a2a', '#9a6a34', '#7a4e22', '#a87a40'] }
    const MUR = {}, TOIT = {}
    Object.keys(PALS).forEach((k, i) => { MUR[k] = toonT(T.planches({ taille: 512, planches: 8, vertical: true, pal: PALS[k], graine: 3 + i, noeuds: .5 })) })
    Object.keys(TOITS).forEach((k, i) => { TOIT[k] = toonT(T.toit({ pal: TOITS[k], graine: 5 + i })) })
    const MT = {
      boisSombre: toon('#3e2a34'), bois: toon('#6b4a38'), boisClair: toon('#93683f'), metal: toon('#3a3542'), pierre: toonT(T.roche({ graine: 17, mousse: 0 })), corde: toonT(T.corde()),
      toile: toonT(T.toile({ graine: 9 }), { side: THREE.DoubleSide }), toileUnie: toonT(T.toile({ graine: 4, motif: 'aucun' }), { side: THREE.DoubleSide }),
      rouge: toon('#c8352a'), blanc: toon('#efe7d4'), jaune: toon('#e9b63a'), cuivre: toon('#b5772f'),
      vitreJ: new THREE.MeshBasicMaterial({ map: T.fenetre({ nuit: 0 }), color: '#dfe8f0' }), vitreN: new THREE.MeshBasicMaterial({ map: T.fenetre({ nuit: 1 }), color: '#ffffff' })
    }
    MT.vitre = new THREE.MeshBasicMaterial({ map: T.fenetre({ nuit: 0 }) })
    c.MT = MT; c.MUR = MUR; c.TOIT = TOIT

    /* ------------------------------------------------------------ éclairage d'appoint : lanternes, halos, mares de lumière */
    const HALO = T.halo()
    const haloMat = (col, op) => new THREE.SpriteMaterial({ map: HALO, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    function lanterne(x, y, z, par, o) { // (x,y,z) : point d'attache dans le repère de `par`
      o = o || {}
      const g = new THREE.Group(); g.position.set(x, y, z); (par || s).add(g)
      const chaine = boite(.025, o.chaine === undefined ? .35 : o.chaine, .025, MT.metal, 0, -(o.chaine === undefined ? .35 : o.chaine) / 2, 0, g)
      const dy = -(o.chaine === undefined ? .35 : o.chaine)
      const toitL = new THREE.Mesh(new THREE.ConeBufferGeometry(.22, .16, 4), MT.metal); toitL.position.y = dy - .06; toitL.rotation.y = PI / 4; g.add(toitL)
      boite(.26, .04, .26, MT.metal, 0, dy - .5, 0, g)
      const cg = new THREE.MeshBasicMaterial({ color: '#ffd889' })
      const coeur = new THREE.Mesh(new THREE.BoxBufferGeometry(.19, .34, .19), cg); coeur.position.y = dy - .27; g.add(coeur)
      ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => boite(.03, .4, .03, MT.metal, a * .1, dy - .28, b * .1, g))
      const halo = new THREE.Sprite(haloMat('#ffb45a', .0)); halo.scale.setScalar(o.echelle || 2.6); halo.position.y = dy - .27; g.add(halo)
      const wp = new THREE.Vector3(); g.updateMatrixWorld(true); g.localToWorld(wp.set(0, dy - .27, 0))
      let mare = null
      if (o.sol !== undefined) { mare = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1), new THREE.MeshBasicMaterial({ map: HALO, color: '#ff9a3c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); mare.rotation.x = -PI / 2; mare.scale.setScalar(o.mare || 4.6); mare.position.set(wp.x, o.sol + .03, wp.z); mare.renderOrder = 3; s.add(mare) }
      const L = { g, pos: wp, coeur: cg, halo, mare, x: wp.x, z: wp.z, phase: r() * 6.28, force: o.force || 1 }
      LAN.push(L); return L
    }
    function fenetre(par, x, y, z, w, h, ry, o) { // sur la face +z du repère `par`, centrée en (x, y)
      o = o || {}
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; par.add(g)
      const v = new THREE.Mesh(new THREE.PlaneBufferGeometry(w, h), MT.vitre); v.position.z = .025; g.add(v)
      boite(w + .24, .12, .1, MT.boisSombre, 0, h / 2 + .06, .05, g); boite(w + .28, .1, .18, MT.boisClair, 0, -h / 2 - .05, .07, g); boite(.11, h, .1, MT.boisSombre, -w / 2 - .055, 0, .05, g); boite(.11, h, .1, MT.boisSombre, w / 2 + .055, 0, .05, g)
      boite(.06, h, .05, MT.boisSombre, 0, 0, .04, g); boite(w, .06, .05, MT.boisSombre, 0, 0, .04, g)
      if (o.volets !== false) { [-1, 1].forEach((q) => { const vo = boite(w * .5, h, .05, o.voletMat || MT.bois, q * (w / 2 + w * .27), 0, .06, g); vo.rotation.y = q * .5; vo.position.x = q * (w / 2 + w * .24); vo.position.z += .05 }) }
      FEN.push(g); return g
    }
    Q._fenetreMat = MT

    /* ------------------------------------------------------------ escaliers et garde-corps */
    const LOTS = { poteau: lot(MT.boisSombre), rampe: lot(MT.corde), limon: lot(MT.bois) }
    const posteG = new THREE.BoxBufferGeometry(.13, 1.1, .13), chapeauG = new THREE.BoxBufferGeometry(.19, .07, .19)
    function corde(a, b, aff, rayon, par) { // corde en catenaire de a à b ; `par` : groupe dans le repère duquel a et b sont donnés (sans lui, repère du monde)
      const mid = a.clone().lerp(b, .5); mid.y -= aff === undefined ? .09 : aff
      const cv = new THREE.CatmullRomCurve3([a, mid, b]), L = a.distanceTo(b), g = new THREE.TubeBufferGeometry(cv, Math.max(4, Math.round(L * 3)), rayon || .03, 5, false)
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L * 5, uv.getY(i))
      let M = new THREE.Matrix4(); if (par) { par.updateWorldMatrix(true, false); M = par.matrixWorld.clone() }
      LOTS.rampe.ajouter(g, M)
    }
    function garde(pts, o) { // pts : [[x,y,z],…] au niveau du plancher
      o = o || {}; const H = o.h || 1.05, pas = o.pas || 2.1
      // Découpe les bords des plateaux autour des accès, avant de placer poteaux et cordages.
      if (o.ouvertures) {
        for (let i = 0; i < pts.length - 1; i++) {
          const A = V3(...pts[i]), B = V3(...pts[i + 1]), dx = B.x - A.x, dz = B.z - A.z, l2 = dx * dx + dz * dz
          if (l2 < .0001) continue
          let morceaux = [[0, 1]]
          for (const e of o.ouvertures) for (const p of [e.a, e.b]) {
            if (Math.abs(A.y - p[1]) > .6 || Math.abs(B.y - p[1]) > .6) continue
            const t = ((p[0] - A.x) * dx + (p[2] - A.z) * dz) / l2
            const d2 = (A.x + t * dx - p[0]) ** 2 + (A.z + t * dz - p[2]) ** 2, rayon = e.w / 2 + .22
            if (d2 >= rayon * rayon) continue
            const dt = Math.sqrt((rayon * rayon - d2) / l2), lo = t - dt, hi = t + dt
            morceaux = morceaux.flatMap(([a, b]) => hi <= a || lo >= b ? [[a, b]] : [[a, Math.max(a, lo)], [Math.min(b, hi), b]].filter(([u, v]) => v - u > .001))
          }
          // Sur un bord courbe, l'accès peut croiser le garde-corps après son extrémité : dégager aussi son axe.
          for (const e of o.ouvertures) {
            if (![e.a, e.b].some(p => Math.abs(A.y - p[1]) <= .6 && Math.abs(B.y - p[1]) <= .6)) continue
            const ex = e.b[0] - e.a[0], ez = e.b[2] - e.a[2], L = Math.hypot(ex, ez), rayon = e.w / 2 + .22
            const along = ((A.x - e.a[0]) * ex + (A.z - e.a[2]) * ez) / L, da = (dx * ex + dz * ez) / L
            const across = (-(A.x - e.a[0]) * ez + (A.z - e.a[2]) * ex) / L, dc = (-dx * ez + dz * ex) / L
            let lo = 0, hi = 1
            for (const [v, dv, min, max] of [[along, da, 0, L], [across, dc, -rayon, rayon]]) {
              if (Math.abs(dv) < .000001) { if (v < min || v > max) hi = -1 }
              else { const a = (min - v) / dv, b = (max - v) / dv; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)) }
            }
            if (hi > lo) morceaux = morceaux.flatMap(([a, b]) => hi <= a || lo >= b ? [[a, b]] : [[a, Math.max(a, lo)], [Math.min(b, hi), b]].filter(([u, v]) => v - u > .001))
          }
          for (const [a, b] of morceaux) if ((b - a) * Math.sqrt(l2) > .12) garde([A.clone().lerp(B, a).toArray(), A.clone().lerp(B, b).toArray()], Object.assign({}, o, { ouvertures: null }))
        }
        return
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const A = V3(...pts[i]), B = V3(...pts[i + 1]), L = A.distanceTo(B), n = Math.max(1, Math.round(L / pas))
        const ps = []; for (let k = 0; k <= n; k++) ps.push(A.clone().lerp(B, k / n))
        ps.forEach((p, k) => { if (k === 0 && i > 0) return; LOTS.poteau.ajouter(posteG, placer(p.x, p.y + H / 2 - .02, p.z, 0, r() * 6)); LOTS.poteau.ajouter(chapeauG, placer(p.x, p.y + H, p.z, 0, r() * 6)) })
        for (let k = 0; k < n; k++) { corde(ps[k].clone().add(V3(0, H - .12, 0)), ps[k + 1].clone().add(V3(0, H - .12, 0)), .08); if (!o.simple) corde(ps[k].clone().add(V3(0, H * .55, 0)), ps[k + 1].clone().add(V3(0, H * .55, 0)), .06) }
      }
    }
    const riserG = new THREE.BoxBufferGeometry(1, 1, 1), limonG = new THREE.BoxBufferGeometry(1, 1, 1)
    /* une volée : marches fermées (plateau + contremarche), trois limons, pilotis là où le vide dépasse 60 cm, pierre au pied ; garde-corps des deux côtés.
     * a, b : bas et haut de la volée, au niveau du dessus des marches ; w : largeur. La roche est creusée dessous par talas-quai.js (creuse). */
    function escalier(a, b, w, o) {
      o = o || {}; const A = V3(...a), B = V3(...b), d = B.clone().sub(A), run = Math.hypot(d.x, d.z), L3 = d.length(), n = Math.max(2, Math.ceil(Math.abs(d.y) / .2), o.pas ? Math.ceil(run / o.pas) : 0), dx = d.x / run, dz = d.z / run, ry = Math.atan2(-dx, -dz)
      const ht = d.y / n, pr = run / n, nx = -dz, nz = dx
      for (let i = 0; i < n; i++) {
        const u = (i + .5) / n, uf = i / n
        HAB.planches[i % 3 ? 'clair' : 'usee'].push([A.x + d.x * u, A.y + d.y * (i + 1) / n - .045, A.z + d.z * u, w, pr + .05, ry + (r() - .5) * .01, (r() - .5) * .12])
        LOTS.limon.ajouter(riserG, placer(A.x + d.x * uf + dx * .02, A.y + d.y * (i + .5) / n - .02, A.z + d.z * uf + dz * .02, 0, ry, 0, w - .05, Math.abs(ht) + .06, .04))
      }
      // Trois petites lames au niveau de chaque plateau raccordent toute la largeur de la volée.
      for (const [P, sens] of [[A, -1], [B, 1]]) {
        for (let i = 0; i < 3; i++) HAB.planches.clair.push([P.x + dx * sens * (i + .5) * .16, P.y - .045, P.z + dz * sens * (i + .5) * .16, w, .18, ry, 0])
        zoneRampe(P.x, P.y, P.z, P.x + dx * sens * .48, P.y, P.z + dz * sens * .48, w - .1)
      }
      // limons : deux sur les côtés, un au milieu si la volée est large ; ils suivent la pente et dépassent sous les marches
      const coffres = o.limons !== false ? (w > 3 ? [-1, 0, 1] : [-1, 1]) : []
      const sol = V3(0, 0, 0), dm = new THREE.Object3D()
      coffres.forEach((q) => {
        const off = V3(nx * q * (w / 2 - .09), -.26, nz * q * (w / 2 - .09)), p0 = A.clone().add(off), p1 = B.clone().add(off)
        dm.position.copy(p0).lerp(p1, .5); dm.lookAt(p1); dm.scale.set(q === 0 ? .14 : .16, .44, L3 + .2); dm.updateMatrix(); LOTS.limon.ajouter(limonG, dm.matrix.clone())
        // pilotis sous le limon, tous les ~2,4 m, seulement là où le terrain est loin dessous
        if (o.pilotis !== false) for (let s0 = .6; s0 < L3; s0 += 2.4) {
          const t = s0 / L3, P = p0.clone().lerp(p1, t), sous = P.y - .22, gnd = hauteur(P.x, P.z)
          if (sous - gnd > .6) {
            HAB.piles.push([P.x, sous - .3, P.z])
            if (q === 1 && sous - gnd > 1.4) { const G = A.clone().add(V3(nx * (w / 2 - .09) * -1, -.26, nz * (w / 2 - .09) * -1)).lerp(B.clone().add(V3(nx * (w / 2 - .09) * -1, -.26, nz * (w / 2 - .09) * -1)), t); poutre(V3(P.x, sous - .02, P.z), V3(G.x, G.y - .22 - .02, G.z), .11, MT.boisSombre, null, .16) }   // traverse entre les deux files de pilotis
          }
        }
      })
      if (o.garde !== false) [-1, 1].forEach((q) => { const off = V3(nx * q * (w / 2 - .03), Math.abs(ht) * .5, nz * q * (w / 2 - .03)); garde([A.clone().add(off).toArray(), B.clone().add(off).toArray()], { simple: true, pas: 2 }) })
      zoneRampe(A.x, A.y, A.z, B.x, B.y, B.z, w - .1)
      // un seuil de pierre au pied (la volée ne flotte pas sur la roche)
      if (o.pierre !== false) { const sl = boite(w + .5, .34, .8, MT.pierre, A.x - dx * .25, A.y - .2, A.z - dz * .25, null, .3); sl.rotation.y = ry }
      return { A, B }
    }
    c.escalier = escalier; c.garde = garde; c.corde = corde; c.lanterne = lanterne; c.fenetre = fenetre

    /* ------------------------------------------------------------ toit à deux pentes (prisme extrudé) */
    function toit(w, d, h, dep, mat, par, y, o) {
      o = o || {}; const sp = d / 2 + dep, sh = new THREE.Shape(); sh.moveTo(-sp, 0); sh.lineTo(0, h); sh.lineTo(sp, 0); sh.lineTo(sp - .08, -.06); sh.lineTo(-sp + .08, -.06); sh.closePath()
      const L = w + 2 * dep, g = new THREE.ExtrudeBufferGeometry(sh, { depth: L, bevelEnabled: false }); g.rotateY(PI / 2); g.translate(-L / 2 + 0, 0, 0); g.computeVertexNormals(); uvMonde(g, 1 / 2.2)
      const m = ombre(new THREE.Mesh(g, mat)); m.position.y = y; par.add(m)
      const fa = boite(L + .08, .09, .2, MT.boisSombre, 0, y + h + .02, 0, par); fa.scale.y = 1
      ;[-1, 1].forEach((q) => { const p0 = V3(-L / 2, y, q * sp), p1 = V3(L / 2, y, q * sp); boite(L + .04, .14, .09, MT.boisSombre, 0, y + .02, q * sp, par) })
      return m
    }

    /* ------------------------------------------------------------ maison sur pilotis (base commune des ateliers) */
    function maison(o) {
      const g = new THREE.Group(); g.position.set(o.x, o.y, o.z); g.rotation.y = o.ry || 0; s.add(g)
      const W = o.w, D = o.d, H = o.h, mur = o.mur || MUR.violet
      const wg = new THREE.BoxBufferGeometry(W, H, D); uvMonde(wg, 1 / 1.8)
      const wall = ombre(new THREE.Mesh(wg, mur)); wall.position.y = H / 2 + .3; g.add(wall)
      boite(W + .16, .34, D + .16, MT.pierre, 0, .17, 0, g, .2)
      ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => boite(.24, H + .5, .24, MT.boisSombre, a * (W / 2), (H + .5) / 2 + .05, b * (D / 2), g))
      if (o.etage2) boite(W + .2, .18, D + .2, MT.boisSombre, 0, o.etage2 + .3, 0, g)
      toit(W, D, o.pente || 2.1, o.dep || .8, o.toit || TOIT.violet, g, H + .3)
      g.userData.W = W; g.userData.D = D; g.userData.H = H
      Q.obstacles.push({ t: 'b', x: o.x, z: o.z, hw: W / 2 + .12, hd: D / 2 + .12, ry: o.ry || 0, y: o.y, h: H + (o.pente || 2) + 1 })
      return g
    }
    c.maison = maison; c.toit = toit; c.boite = boite; c.cyl = cyl; c.poutre = poutre; c.toonT = toonT; c.toon = toon; c.uvMonde = uvMonde; c.lot = lot; c.placer = placer; c.ombre = ombre; c.HALO = HALO; c.haloMat = haloMat; c.LOTS = LOTS

    /* ------------------------------------------------------------ construction du village */
    if (Q.decorVillage) Q.decorVillage(c)
    if (Q.zen) Q.zen(c)                                    // jardin zen de la terrasse centrale (talas-quai-zen.js)
    for (const k in LOTS) LOTS[k].construire()
    if (Q.decorNature) Q.decorNature(c)
  }
})()

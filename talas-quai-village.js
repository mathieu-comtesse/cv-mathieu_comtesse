/* LE QUAI DE TALAS, partie « village » : la conception du niveau. La boutique TALAS (atelier §4), les six autres ateliers sur leurs
 * terrasses, la place ronde, les escaliers, le pont du phare, le phare (tour de contrôle), lanternes, caisses, tonneaux, bannières,
 * bateaux. Prolonge talas-quai.js / talas-quai-decor.js : Q.decorVillage(contexte). */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE, Q = window.TALAS_QUAI
  if (!THREE || !M || !Q || !Q.on) return
  const PI = Math.PI, V3 = (x, y, z) => new THREE.Vector3(x, y, z)

  Q.decorVillage = function (c) {
    const { s, r, DECK, PLACE, HAB, LAN, FEN, PORTES, cliquables, hauteur, rangee, pilesSous, zoneRect, zoneDisque, zoneRampe, MT, MUR, TOIT, boite, cyl, poutre, toonT, toon, uvMonde, lot, placer, ombre, HALO, haloMat, LOTS, escalier, garde, corde, lanterne, fenetre, maison, toit } = c
    const T = M.peintre
    const sol = (rx0, rz0, rx1, rz1, y, piles) => { rangee(rx0, rz0, rx1, rz1, y); zoneRect(rx0, rz0, rx1, rz1, y); if (piles !== false) pilesSous(Math.min(rx0, rx1), Math.min(rz0, rz1), Math.max(rx0, rx1), Math.max(rz0, rz1), y, 3) }

    /* ==================================================================== ponton, rampes d'accès, garde-corps */
    // le ponton d'arrivée est déjà posé par talas-quai.js (de z = 19 à z = -10) ; on le prolonge jusqu'à la place
    sol(-1.7, -11.3, 1.7, -10, DECK)
    escalier([0, DECK, -11.3], [0, PLACE.y, -13.1], 3.2, { garde: false })
    // plates-formes reliées au ponton : quai du hangar (ouest, n°4), grande jetée (est, n°6)
    sol(-10.5, -8, -1.7, -3.2, DECK); sol(-22.5, -14.5, -10.5, -3.2, DECK)
    sol(1.7, -7, 16, -2.5, DECK); sol(16, -10.5, 28.5, -1, DECK)
    // la place vers les terrasses
    Q.ESC.forEach((e) => escalier(e.a, e.b, e.w))   // bas et haut de chaque volée : au bord des planchers ci-dessous, qui sont raccourcis pour les recevoir
    // terrasses (planchers) : T1 ouest, T3 est, TC centre, T5 nord-est, T4 manoir, T6 belvédère
    sol(-23, -27, -11.8, -15, 4.1); sol(9.6, -29, 22, -17, 3.1); sol(-9, -46, 9, -35.5, 7.6); sol(12, -47.5, 28, -37.2, 8.0); sol(-9, -67, 9, -55.6, 13.4); sol(-27, -50, -14, -40.5, 9.6)
    zoneRampe(9, 7.6, -41.5, 12, 8.0, -41.5, 3.2)
    HAB.planches.clair.push([10.5, 7.8 - .045, -41.5, 3.2, 3.2, PI / 2, 0])
    // le pont du phare (long, en légère montée) et l'îlot
    const pont = escalier([5.2, PLACE.y, -13.2], [30.5, 2.6, -15.5], 2.4, { garde: false, pilotis: false, pierre: false })
    ;(function () { const A = V3(5.2, PLACE.y, -13.2), B = V3(30.5, 2.6, -15.5); for (let q of [-1, 1]) { const n = V3(-(B.z - A.z), 0, B.x - A.x).normalize().multiplyScalar(q * 1.14); garde([A.clone().add(n).toArray(), B.clone().add(n).toArray()], { pas: 2.4 }) }
      for (let t = 0; t <= 1.001; t += .09) HAB.piles.push([A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t - .0, A.z + (B.z - A.z) * t + 1.3]) })()
    zoneDisque(37, -16, 6.5, 2.6); for (let x = 30.5; x < 43; x += .3) { const w = Math.sqrt(Math.max(0, 6.5 * 6.5 - (x - 37) ** 2)); HAB.planches.clair.push([x, 2.6 - .045, -16, .28, w * 2, PI / 2 * 0 + PI / 2, (r() - .5) * .1]) }
    // garde-corps du ponton (avec ouvertures vers les plates-formes)
    garde([[-1.7, DECK, 19], [-1.7, DECK, 8.6]]); garde([[-1.7, DECK, -8.1], [-1.7, DECK, -11.3]]); garde([[1.7, DECK, 19], [1.7, DECK, 9.6]]); garde([[1.7, DECK, 5.9], [1.7, DECK, -2.4]]); garde([[1.7, DECK, -7.1], [1.7, DECK, -11.3]])
    garde([[-11.5, DECK, 8.5], [-11.5, DECK, -3.2]]); garde([[-11.5, DECK, 8.5], [-1.7, DECK, 8.5]]); garde([[1.7, DECK, 9.5], [7.5, DECK, 9.5], [7.5, DECK, 6], [1.7, DECK, 6]])
    garde([[-22.5, DECK, -3.2], [-10.5, DECK, -3.2]]); garde([[-22.5, DECK, -14.5], [-10.5, DECK, -14.5]]); garde([[-22.5, DECK, -3.2], [-22.5, DECK, -14.5]]); garde([[-10.5, DECK, -14.5], [-10.5, DECK, -8.05]])
    garde([[-10.5, DECK, -8.05], [-1.7, DECK, -8.05]])
    garde([[1.7, DECK, -7], [16, DECK, -7], [16, DECK, -10.5], [28.5, DECK, -10.5], [28.5, DECK, -1], [16, DECK, -1], [16, DECK, -2.5], [1.7, DECK, -2.5]])
    // la place
    { const pts = []; for (let a = 0; a <= 6.284; a += .3927) { const ang = a; const px = Math.cos(ang) * (PLACE.r - .25), pz = PLACE.z + Math.sin(ang) * (PLACE.r - .25); const inOpening = (Math.abs(px) < 1.9 && pz > PLACE.z + 5) || (px < -5.2 && Math.abs(pz - PLACE.z) < 1.6) || (px > 3.5 && pz > PLACE.z + 4.4) || (Math.abs(px) < 2.3 && pz < PLACE.z - 5.8) || (px > 3.5 && pz < PLACE.z - 4); pts.push(inOpening ? null : [px, PLACE.y, pz]) }
      let cur = []; pts.forEach((p) => { if (p) cur.push(p); else { if (cur.length > 1) garde(cur); cur = [] } }); if (cur.length > 1) garde(cur) }
    // terrasses : garde-corps sur les bords qui donnent sur le vide
    garde([[-23, 4.1, -27], [-23, 4.1, -15], [-11.8, 4.1, -15]]); garde([[-23, 4.1, -27], [-18.5, 4.1, -27]]); garde([[-15.5, 4.1, -27], [-11.8, 4.1, -27]]); garde([[22, 3.1, -29], [22, 3.1, -17], [9.6, 3.1, -17]]); garde([[22, 3.1, -29], [19.8, 3.1, -29]]); garde([[9.6, 3.1, -29], [16.3, 3.1, -29]]); garde([[-9, 7.6, -35.5], [-2.5, 7.6, -35.5]]); garde([[2.5, 7.6, -35.5], [9, 7.6, -35.5], [9, 7.6, -46]]); garde([[-9, 7.6, -46], [-2.3, 7.6, -46]]); garde([[2.3, 7.6, -46], [9, 7.6, -46]])
    garde([[-9, 7.6, -46], [-9, 7.6, -35.5]]); garde([[28, 8, -37.2], [28, 8, -47.5], [12, 8, -47.5]]); garde([[12, 8, -37.2], [17.3, 8, -37.2]]); garde([[22.3, 8, -37.2], [28, 8, -37.2]])
    garde([[-9, 13.4, -55.6], [-2.2, 13.4, -55.6]]); garde([[2.2, 13.4, -55.6], [9, 13.4, -55.6], [9, 13.4, -67]]); garde([[-9, 13.4, -67], [-9, 13.4, -55.6]])
    garde([[-27, 9.6, -40.5], [-20, 9.6, -40.5]]); garde([[-18, 9.6, -40.5], [-14, 9.6, -40.5], [-14, 9.6, -50], [-27, 9.6, -50], [-27, 9.6, -40.5]])

    /* ==================================================================== accessoires : caisses, tonneaux, bollards, lanternes sur poteaux */
    const cais = toonT(T.planches({ taille: 256, planches: 4, pal: ['#6a4a34', '#5a3d2a', '#7a5638'], graine: 31, noeuds: .3 }))
    function caisse(x, y, z, sz, ry, mat, par) { if (!par) Q.obstacles.push({ t: 'b', x, z, hw: sz / 2 + .03, hd: sz / 2 + .03, ry: ry || 0, y }); const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; (par || s).add(g); const b = boite(sz, sz, sz, mat || cais, 0, sz / 2, 0, g, .7); [-1, 1].forEach((q) => { boite(sz + .05, .08, sz + .05, MT.boisSombre, 0, sz / 2 + q * sz * .38, 0, g); boite(.09, sz + .05, sz + .05, MT.boisSombre, q * sz * .4, sz / 2, 0, g) }); return g }
    function tonneau(x, y, z, h) { Q.obstacles.push({ t: 'c', x, z, r: .38, y }); h = h || 1.05; const g = new THREE.Group(); g.position.set(x, y, z); s.add(g); const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(.33 * (1 + .18 * Math.sin(t * PI)), t * h)) }
      const m = ombre(new THREE.Mesh(new THREE.LatheBufferGeometry(pts, 12), toonT(T.planches({ taille: 256, planches: 8, vertical: true, pal: ['#7a5232', '#6a4428', '#8a6038'], graine: 8 })))); g.add(m); [.16, .84].forEach((t) => cyl(.375 * (1 + .18 * Math.sin(t * PI)) * .96, .375 * (1 + .18 * Math.sin(t * PI)) * .96, .07, MT.metal, 0, t * h, 0, g, 12)); return g }
    function bollard(x, y, z, h) { Q.obstacles.push({ t: 'c', x, z, r: .24, y }); h = h || 1.1; cyl(.2, .24, h, MT.bois, x, y + h / 2, z); for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusBufferGeometry(.235, .05, 5, 14), MT.corde); t.rotation.x = PI / 2; t.position.set(x, y + h - .12 - i * .11, z); s.add(t) } }
    function potence(x, z, ry, y) { // poteau de lanterne : mât + bras
      Q.obstacles.push({ t: 'c', x, z, r: .2, y })
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; s.add(g); boite(.17, 2.9, .17, MT.boisSombre, 0, 1.45, 0, g); boite(.1, .1, 1.0, MT.boisSombre, 0, 2.75, .48, g)
      const b = poutre(V3(0, 1.95, 0), V3(0, 2.7, .6), .07, MT.boisSombre, g)
      return lanterne(0, 2.7, .95, g, { sol: y, mare: 5.2, chaine: .28 }) }
    // lanternes le long du ponton (alternées), sur la place et aux escaliers
    Q._ampoules = []; const postes = []
    for (let z = 16; z > -10; z -= 5.2) { const w = (Math.round(z) % 2) ? -1 : 1; potence(w * 1.5, z, w > 0 ? -PI / 2 : PI / 2, DECK); postes.push(V3(w * 1.5, DECK + 2.86, z)) }
    // guirlandes d'ampoules tendues d'un poteau au suivant (elles s'allument la nuit)
    for (let i = 0; i < postes.length - 1; i++) { const a = postes[i], b = postes[i + 1]; corde(a, b, .5, .012); for (let k = 1; k < 10; k++) { const t = k / 10; Q._ampoules.push([a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * PI) * .5, a.z + (b.z - a.z) * t]) } }
    ;[[-4.8, PLACE.z + 3.5], [4.8, PLACE.z + 3.5], [-4.2, PLACE.z - 3.6], [4.2, PLACE.z - 3.6]].forEach(([x, z]) => potence(x, z, Math.atan2(-x, -(z - PLACE.z)), PLACE.y))
    // gros bollards à cordages en bord de ponton
    ;[[-1.55, 17], [1.55, 17], [-1.55, 12.4], [1.55, 10.6], [-1.55, 1.6], [1.55, 3.4], [-1.55, -9], [1.55, -9]].forEach(([x, z]) => bollard(x, DECK, z, 1.15))
    // caisses et tonneaux
    caisse(-3.2, DECK, 12.4, 1.1, .3); caisse(-3.2, DECK + 1.1, 12.4, .8, -.4); tonneau(-3.6, DECK, 15.2); tonneau(-3.6, DECK, 9.6); tonneau(4.6, DECK, 7.4); caisse(6.2, DECK, 8, 1.0, .5); caisse(-8.2, DECK, 8.1, 1.2, .1)
    caisse(3.4, DECK, -4.6, 1.2, .2); caisse(3.4, DECK + 1.2, -4.6, .9, .5); tonneau(6, DECK, -5.4); tonneau(6.9, DECK, -4.9, .95); caisse(-15.6, DECK, -3.9, 1.1, -.2)
    caisse(-5.2, PLACE.y, PLACE.z + 5.4, 1.1, .6); tonneau(5.6, PLACE.y, PLACE.z + 3.8)

    /* ==================================================================== MÂT ET FANIONS DE LA PLACE */
    { const g = new THREE.Group(); g.position.set(0, PLACE.y, PLACE.z); s.add(g); Q.obstacles.push({ t: 'c', x: 0, z: PLACE.z, r: .34, y: PLACE.y }); cyl(.2, .28, 7, MT.bois, 0, 3.5, 0, g, 10); const anneau = new THREE.Mesh(new THREE.TorusBufferGeometry(.5, .07, 6, 16), MT.metal); anneau.rotation.x = PI / 2; anneau.position.y = 3.2; g.add(anneau)
      ;[[-4.8, 3.5], [4.8, 3.5], [-4.2, -3.6], [4.2, -3.6]].forEach(([px, pz], i) => { const a = Math.atan2(pz, px); const P0 = V3(0, 6.55, 0), P1 = V3(px, 2.86, pz); corde(P0, P1, .5, .025, g)
        for (let k = 1; k < 9; k++) { const u = k / 9.5, p = P0.clone().lerp(P1, u); p.y -= Math.sin(u * PI) * .5; const fl = new THREE.Mesh(new THREE.PlaneBufferGeometry(.32, .4), toon(['#e7c45a', '#c8352a', '#4b9098', '#8a4ab0'][(i + k) % 4], { side: THREE.DoubleSide })); fl.position.copy(p).add(V3(0, -.2, 0)); fl.rotation.y = -a; fl.rotation.z = (r() - .5) * .3; g.add(fl) } })
      lanterne(0, 6.3, 0, g, { sol: PLACE.y, mare: 8, echelle: 3.6, chaine: .3, force: 1.2 }) }

    /* ==================================================================== BANNIÈRES (fantômes de Talas) */
    const BAN = []
    function banniere(x, y, z, ry, w, h, o) {
      o = o || {}; const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; s.add(g)
      boite(w + .3, .1, .1, MT.boisSombre, 0, h / 2 + .05, 0, g); const geo = new THREE.PlaneBufferGeometry(w, h, 6, 8), m = ombre(new THREE.Mesh(geo, o.mat || MT.toile)); m.position.y = -.02; g.add(m)
      const base = geo.attributes.position.array.slice(); BAN.push({ geo, base, ph: r() * 6, amp: o.amp || .09 }); return g
    }

    /* ==================================================================== LA BOUTIQUE TALAS (atelier §4, point de départ) */
    { const W = 7.2, D = 5.6, H = 3.3, g = new THREE.Group(); g.position.set(-7.4, DECK, 2.7); g.rotation.y = PI / 2; s.add(g)
      const mur = MUR.violet
      const bloc = (w, h, d, x, y, z) => { const geo = new THREE.BoxBufferGeometry(w, h, d); uvMonde(geo, 1 / 1.8); const m = ombre(new THREE.Mesh(geo, mur)); m.position.set(x, y, z); g.add(m); return m }
      bloc(W, H, .28, 0, H / 2, -D / 2) // fond
      bloc(.28, H, D, -W / 2, H / 2, 0); bloc(.28, H, D, W / 2, H / 2, 0) // côtés
      bloc(2.1, H, .28, -W / 2 + 1.05 + .14, H / 2, D / 2 - .14); bloc(2.0, H, .28, W / 2 - 1.0 - .14, H / 2, D / 2 - .14) // montants de la façade
      bloc(3.1, H - 2.3, .28, 0, 2.3 + (H - 2.3) / 2, D / 2 - .14) // linteau
      boite(W + .5, .35, D + .5, MT.pierre, 0, .17, 0, g, .2)
      ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => boite(.28, H + .6, .28, MT.boisSombre, a * W / 2, (H + .6) / 2, b * D / 2, g))
      toit(W, D, 2.2, 1.0, TOIT.violet, g, H + .3)
      // comptoir
      const cptr = boite(3.5, 1.02, .8, MT.bois, 0, .51, D / 2 - .1, g, .8); boite(3.7, .1, 1.0, MT.boisClair, 0, 1.05, D / 2 - .1, g); [-1, 1].forEach((q) => boite(.14, 1.1, .14, MT.boisSombre, q * 1.75, .55, D / 2 + .3, g))
      // auvent rayé
      { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#e9dcc0' : '#7a3a8a'; x.fillRect(i * 32, 0, 32, 128) } x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 32, 108); x.quadraticCurveTo(i * 32 + 16, 132, i * 32 + 32, 108); x.lineTo(i * 32 + 32, 128); x.lineTo(i * 32, 128); x.fill() }
        const tx = new THREE.CanvasTexture(cv); tx.wrapS = THREE.RepeatWrapping; const au = ombre(new THREE.Mesh(new THREE.PlaneBufferGeometry(3.9, 1.5), toonT(tx, { side: THREE.DoubleSide }))); au.position.set(0, 2.95, D / 2 + .65); au.rotation.x = -.5 - PI / 2 + PI / 2; g.add(au) }
      // enseigne TALAS sur le toit
      { const en = ombre(new THREE.Mesh(new THREE.BoxBufferGeometry(3.7, 1.4, .18), [MT.boisSombre, MT.boisSombre, MT.boisSombre, MT.boisSombre, toonT(T.enseigne({ texte: 'TALAS', icone: 1, largeur: 512, hauteur: 190 })), MT.boisSombre])); en.position.set(-.3, H + 1.5, D / 2 + .95); en.rotation.x = -.1; en.rotation.z = .04; g.add(en)
        ;[-1.6, 1.6].forEach((q) => { boite(.14, 1.3, .14, MT.boisSombre, q - .3, H + .85, D / 2 + .8, g) }) }
      // lanternes noires sous l'avant-toit
      ;[-2.4, 0, 2.4].forEach((x) => lanterne(x, H - .05, D / 2 + 1.35, g, { sol: DECK, mare: 4, chaine: .3, force: 1.1 }))
      // intérieur : étagères, bocaux, outils, affiche, coffre rouge
      for (let i = 0; i < 3; i++) { const y = .85 + i * .8; boite(W - .9, .08, .5, MT.boisClair, 0, y, -D / 2 + .5, g); for (let k = 0; k < 9; k++) { const x = -W / 2 + .9 + k * .68 + (r() - .5) * .1, tp = r(); if (tp < .4) cyl(.11, .11, .3, toon(['#6cc6c0', '#e7a04a', '#a06ad0', '#7bd07a'][k % 4], { transparent: true, opacity: .85 }), x, y + .19, -D / 2 + .5, g, 8); else boite(.3, .22 + r() * .2, .3, toon(['#c8352a', '#e9b63a', '#5a8fd0', '#e9e0c8'][k % 4]), x, y + .15, -D / 2 + .5, g) } }
      const affiche = ombre(new THREE.Mesh(new THREE.PlaneBufferGeometry(1.0, 1.4), toonT(T.toile({ graine: 2, couleur: '#e6d4a4', motifCouleur: '#4a3355' })))); affiche.position.set(-W / 2 + .2, 1.9, -1.0); affiche.rotation.y = PI / 2; g.add(affiche)
      boite(.9, .55, .55, toon('#c8352a'), 1.7, 1.32, D / 2 - .05, g); boite(.92, .08, .57, MT.metal, 1.7, 1.63, D / 2 - .05, g) // coffre à outils rouge sur le comptoir
      cyl(.12, .1, .3, toon('#7bd07a'), -1.2, 1.35, D / 2 - .05, g, 8)
      const salon = new THREE.PointLight('#ffb060', 0, 9, 2); salon.position.set(0, 2.4, 0); g.add(salon); Q._salon = salon
      fenetre(g, -W / 2 + 1.2 + .14, 1.75, D / 2 + .02, .8, 1.15, 0)
      // porte à gauche de la façade
      boite(1.0, 2.1, .1, MT.bois, W / 2 - 1.0 - .14, 1.1, D / 2 + .05, g, .8); boite(1.16, .1, .16, MT.boisSombre, W / 2 - 1.14, 2.2, D / 2 + .06, g)
      // le groupe cliquable
      g.userData = { n: 0, hover: 1, onClick: () => clickBuilding(0) }; B[0] = g; cliquables.push(g); PORTES[0] = V3(-7.4 + D / 2 + 1.3, DECK, 2.7 + 0); c.boutique = g
      const sg = labelPlane('', 5.2, 1.5, {}); sg.position.set(0, H + 3.4, D / 2 + .5); g.add(sg); g.userData.sign = sg }
    // sous la fenêtre : affiche de travaux et panneau de fantôme
    banniere(-7.4, DECK + 3.8, 6.05, PI / 2, 1.1, 2.2, {})
    caisse(-3.0, DECK, 6.4, .9, .2); tonneau(-3.5, DECK, -2.4)

    /* ==================================================================== LES AUTRES ATELIERS (n°1 à n°6) */
    function panneau(par, texte, x, y, z, w, h, ry, o) { const p = ombre(new THREE.Mesh(new THREE.BoxBufferGeometry(w, h, .14), [MT.boisSombre, MT.boisSombre, MT.boisSombre, MT.boisSombre, toonT(T.enseigne(Object.assign({ texte, largeur: 512, hauteur: Math.round(512 * h / w) }, o || {}))), MT.boisSombre])); p.position.set(x, y, z); p.rotation.y = ry || 0; par.add(p); return p }
    function etiquette(g, n, hauteur) { const sg = labelPlane('', 5.2, 1.5, {}); sg.position.set(0, hauteur, 0); g.add(sg); g.userData = Object.assign(g.userData || {}, { n, hover: 1, onClick: () => clickBuilding(n), sign: sg }); B[n] = g; cliquables.push(g) }
    function porteFacade(g, W, D, x) { boite(1.1, 2.2, .12, MT.bois, x, 1.4, D / 2 + .06, g, .8); boite(1.3, .12, .2, MT.boisSombre, x, 2.55, D / 2 + .08, g); boite(1.5, .1, .5, MT.pierre, x, .4, D / 2 + .3, g, .5) }
    function cheminee(g, x, y, z) { boite(.7, 1.6, .7, MT.pierre, x, y + .8, z, g, .6); boite(.85, .12, .85, MT.boisSombre, x, y + 1.66, z, g); Q._fumees = Q._fumees || []; Q._fumees.push({ g, x, y: y + 1.8, z }) }
    function nEtage(g, W, D, y, h, mat) { const geo = new THREE.BoxBufferGeometry(W, h, D); uvMonde(geo, 1 / 1.8); const m = ombre(new THREE.Mesh(geo, mat)); m.position.y = y + h / 2; g.add(m); return m }

    // n°1 — Leadership : le manoir au sommet
    { const g = maison({ x: 0, y: 13.4, z: -63, w: 11, d: 8, h: 4.6, mur: MUR.rouge, toit: TOIT.violet, pente: 2.6, dep: .9 }); PORTES[1] = V3(0, 13.4, -57.6)
      const up = new THREE.Group(); up.position.y = 4.9; g.add(up); nEtage(up, 8.4, 6.4, 0, 3.4, MUR.rouge); boite(8.7, .22, 6.7, MT.boisSombre, 0, 0, 0, up); toit(8.4, 6.4, 2.2, .7, TOIT.violet, up, 3.4)
      const tour = new THREE.Group(); tour.position.set(-3.8, 8.3, -.8); g.add(tour); nEtage(tour, 3.2, 3.2, 0, 4.6, MUR.violet); const cone = ombre(new THREE.Mesh(new THREE.ConeBufferGeometry(2.6, 3.4, 8), TOIT.violet)); cone.position.y = 4.6 + 1.7; cone.rotation.y = .4; tour.add(cone)
      poutre(V3(0, 4.6 + 3.3, 0), V3(0, 4.6 + 4.9, 0), .07, MT.metal, tour); const fl = boite(.9, .3, .05, toon('#e7c45a'), .45, 4.6 + 4.6, 0, tour); c.girouette = fl
      for (const x of [-3.6, -1.2, 1.4, 3.6]) fenetre(g, x, 2.6, 4.03, .95, 1.3, 0); for (const x of [-2.6, 0, 2.6]) fenetre(up, x, 1.7, 3.23, .9, 1.25, 0); fenetre(tour, 0, 2.6, 1.63, .8, 1.1, 0)
      porteFacade(g, 11, 8, 0); const bal = boite(9.4, .16, 1.6, MT.boisClair, 0, 4.85, 4.7, g); garde([[-4.7, 4.9, 5.4], [4.7, 4.9, 5.4]], { h: .95 }); [-4.4, 4.4].forEach((x) => boite(.2, 4.9, .2, MT.boisSombre, x, 2.45, 5.4, g))
      panneau(g, 'LEADERSHIP', 0, 6.8, 4.15, 4.6, 1.2, 0, { fond: '#4a2a48' }); cheminee(g, 3.4, 8.6, -1.5)
      banniere(-5.3, 3.6, 4.15, 0, 1.1, 2.6); banniere(5.3, 3.6, 4.15, 0, 1.1, 2.6)
      lanterne(-1.4, 3.3, 4.6, g, { sol: 13.4, mare: 5, force: 1.1 }); lanterne(1.4, 3.3, 4.6, g, { sol: 13.4, mare: 5, force: 1.1 })
      etiquette(g, 1, 11.8); c.manoir = g }
    // n°2 — Planification : l'atelier des plans (T1, ouest)
    { const g = maison({ x: -19.6, y: 4.1, z: -21, w: 7, d: 5.2, h: 3.5, ry: PI / 2, mur: MUR.gris, toit: TOIT.brun, pente: 1.9 }); PORTES[2] = V3(-15.9, 4.1, -21)
      const tab = ombre(new THREE.Mesh(new THREE.PlaneBufferGeometry(3.6, 2.2), toonT((() => { const [cv2, x] = [document.createElement('canvas')]; cv2.width = 512; cv2.height = 320; const q = cv2.getContext('2d'); q.fillStyle = '#2f5a86'; q.fillRect(0, 0, 512, 320); q.strokeStyle = 'rgba(255,255,255,.55)'; q.lineWidth = 2; for (let i = 0; i < 16; i++) { q.beginPath(); q.moveTo(0, i * 20); q.lineTo(512, i * 20); q.stroke() } q.lineWidth = 4; q.strokeRect(70, 60, 130, 90); q.strokeRect(230, 60, 200, 60); q.beginPath(); q.arc(150, 230, 50, 0, 7); q.stroke(); q.beginPath(); q.moveTo(200, 105); q.lineTo(230, 90); q.moveTo(330, 120); q.lineTo(330, 210); q.moveTo(330, 210); q.lineTo(430, 210); q.stroke(); return new THREE.CanvasTexture(cv2) })()))); tab.position.set(0, 2.2, 2.7); g.add(tab)
      boite(3.9, 2.5, .1, MT.boisSombre, 0, 2.2, 2.62, g)
      fenetre(g, -2.4, 2.0, 2.63, .8, 1.1, 0); fenetre(g, 2.5, 2.0, 2.63, .8, 1.1, 0); porteFacade(g, 7, 5.2, 0); panneau(g, 'PLANIFICATION', 0, 4.7, 2.75, 4.2, 1.0, 0, { fond: '#3a4a5a' })
      // palan de levage : potence plantée au pied de la façade, flèche en avant, câble et caisse suspendue
      poutre(V3(-3.35, .3, 2.95), V3(-3.35, 4.3, 2.95), .18, MT.boisSombre, g); poutre(V3(-3.35, 4.3, 2.95), V3(-3.35, 4.4, 4.2), .14, MT.boisSombre, g); poutre(V3(-3.35, 2.6, 2.95), V3(-3.35, 4.05, 3.75), .09, MT.boisSombre, g)
      corde(V3(-3.35, 4.36, 4.15), V3(-3.35, 2.85, 4.15), .0, .02, g); caisse(-3.35, 2.05, 4.15, .8, .25, null, g)
      lanterne(-1.2, 3.4, 2.9, g, { sol: 4.1, mare: 4 }); lanterne(1.2, 3.4, 2.9, g, { sol: 4.1, mare: 4 }); cheminee(g, -2, 4.6, -1); etiquette(g, 2, 8); c.planif = g }
    // n°3 — Support : la bibliothèque (T3, est)
    { const g = maison({ x: 18.4, y: 3.1, z: -23, w: 7.2, d: 5.4, h: 3.6, ry: -PI / 2, mur: MUR.ocre, toit: TOIT.ocre, pente: 2 }); PORTES[3] = V3(14.6, 3.1, -23)
      const rond = new THREE.Mesh(new THREE.CircleBufferGeometry(.7, 20), MT.vitre); rond.position.set(0, 4.4, 2.75); g.add(rond); const bague = new THREE.Mesh(new THREE.TorusBufferGeometry(.72, .09, 6, 20), MT.boisSombre); bague.position.set(0, 4.4, 2.76); g.add(bague)
      fenetre(g, -2.4, 2.0, 2.73, .8, 1.15, 0); fenetre(g, 2.5, 2.0, 2.73, .8, 1.15, 0); porteFacade(g, 7.2, 5.4, 0); panneau(g, 'SUPPORT', 0, 3.4, 2.85, 3.0, .9, 0, { fond: '#6a4a2a' })
      for (let i = 0; i < 6; i++) boite(.14, .5 + r() * .2, .4, toon(['#c8352a', '#e9b63a', '#5a8fd0', '#e9e0c8', '#4a9a5a'][i % 5]), -2.5 + i * .17, 4.3 - 3.2 + .5, 3.2, g); caisse(2.7, 0, 3.4, .8, .3); c.livres = 1
      lanterne(-1.2, 3.5, 3.0, g, { sol: 3.1, mare: 4 }); lanterne(1.2, 3.5, 3.0, g, { sol: 3.1, mare: 4 }); banniere(3.7, 3.4, 2.85, 0, 1, 2.3); etiquette(g, 3, 8.3); c.biblio = g }
    // n°4 — Réalisation : le hangar d'assemblage (quai ouest)
    { const g = maison({ x: -17.6, y: DECK, z: -9.4, w: 8.2, d: 7, h: 3.9, ry: PI / 2, mur: MUR.teal, toit: TOIT.teal, pente: 1.5, dep: .9 }); PORTES[4] = V3(-13.8, DECK, -9.4)
      boite(4.6, 3.1, .16, MT.boisSombre, 0, 1.9, 3.55, g); for (let i = 0; i < 6; i++) boite(.06, 3.1, .05, toon('#2b1c24'), -2 + i * .8, 1.9, 3.64, g); poutre(V3(-2.3, .3, 3.6), V3(2.3, 3.4, 3.6), .08, toon('#2b1c24'), g); poutre(V3(2.3, .3, 3.6), V3(-2.3, 3.4, 3.6), .08, toon('#2b1c24'), g)
      panneau(g, 'RÉALISATION', 0, 4.65, 3.62, 4.4, 1.0, 0, { fond: '#254a52' }); fenetre(g, -3.3, 2.2, 3.55, .7, 1.0, 0); fenetre(g, 3.3, 2.2, 3.55, .7, 1.0, 0)
      // grue à flèche
      const gr = new THREE.Group(); gr.position.set(-3.2, 0, 3.3); g.add(gr); boite(.25, 6.2, .25, MT.metal, 0, 3.1, 0, gr); poutre(V3(0, 6.2, 0), V3(-4.6, 6.0, 1.8), .18, MT.metal, gr); poutre(V3(0, 6.2, 0), V3(1.5, 6.0, -.6), .14, MT.metal, gr); corde(V3(-4.4, 5.95, 1.75), V3(-4.4, 3.4, 1.75), 0, .025, gr); caisse(-4.4, 2.5, 1.75, .9, .3, null, gr)
      caisse(2.4, 0, 4.6, 1.1, .1); caisse(3.7, 0, 4.4, .9, .5); tonneau(-2.8, 0, 4.4)
      lanterne(-2.6, 3.7, 3.9, g, { sol: DECK, mare: 4 }); lanterne(2.6, 3.7, 3.9, g, { sol: DECK, mare: 4 }); cheminee(g, 2, 5.0, -1.5); etiquette(g, 4, 7.8); c.hangar = g }
    // n°5 — Évaluation : le studio de télévision (T5, nord-est)
    { const g = maison({ x: 21, y: 8.0, z: -43.4, w: 8, d: 6, h: 3.7, ry: 0, mur: MUR.creme, toit: TOIT.teal, pente: 1.2, dep: .7 }); PORTES[5] = V3(21, 8.0, -37.7)
      panneau(g, 'ÉVALUATION', 0, 4.9, 3.05, 4.2, 1.0, 0, { fond: '#1f4a58', lettre: '#ffe9b0' }); const air = boite(1.6, .6, .1, toon('#c8352a'), 3.2, 3.3, 3.1, g); c.onair = air
      fenetre(g, -2.4, 2.1, 3.03, .9, 1.2, 0); fenetre(g, 2.4, 2.1, 3.03, .9, 1.2, 0); porteFacade(g, 8, 6, 0)
      const dish = new THREE.Group(); dish.position.set(-2.3, 4.7, -1.2); g.add(dish); const bol = ombre(new THREE.Mesh(new THREE.SphereBufferGeometry(1.3, 16, 10, 0, PI * 2, 0, PI / 2.6), MT.blanc)); bol.rotation.x = -1.0; bol.rotation.z = .5; dish.add(bol); boite(.15, 1.2, .15, MT.metal, 0, -.4, 0, dish); poutre(V3(0, 0, 0), V3(.6, .8, 1.0), .06, MT.metal, dish)
      poutre(V3(2.5, 4.7, -1.5), V3(2.5, 9.6, -1.5), .1, MT.metal, g); for (let i = 0; i < 4; i++) poutre(V3(2.5 - .9 + i * 0, 5.4 + i * 1.0, -1.5), V3(2.5 + .9, 5.4 + i * 1.0, -1.5), .05, MT.metal, g)
      lanterne(-1.4, 3.5, 3.4, g, { sol: 8.0, mare: 4 }); lanterne(1.4, 3.5, 3.4, g, { sol: 8.0, mare: 4 }); banniere(-3.9, 3.5, 3.05, 0, 1, 2.3); etiquette(g, 5, 8.6); c.studio = g }
    // n°6 — Amélioration : le hangar à bateaux, au bout de la jetée est
    { const g = maison({ x: 23.6, y: DECK, z: -5.7, w: 8.4, d: 6.4, h: 3.4, ry: -PI / 2, mur: MUR.violet, toit: TOIT.ocre, pente: 2.0, dep: 1.0 }); PORTES[6] = V3(19.8, DECK, -5.7)
      panneau(g, 'AMÉLIORATION', 0, 4.4, 3.3, 4.6, 1.0, 0, { fond: '#3a2a55' }); boite(4.4, 2.6, .12, toon('#231822'), 0, 1.7, 3.25, g); fenetre(g, -3.3, 2.1, 3.25, .7, 1.0, 0)
      const jet = new THREE.Group(); jet.position.set(0, 0, 5.2); g.add(jet); const coque = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.34, .3, 2.4, 10), toon('#1c7ed6'))); coque.rotation.x = PI / 2; coque.position.y = .7; jet.add(coque); boite(.5, .3, .9, toon('#ffd43b'), 0, 1.05, -.1, jet); boite(.7, .07, .07, MT.metal, 0, 1.4, .5, jet)
      ;[[-1.4, 0, 5.9], [1.4, 0, 5.9]].forEach(([x, y, z]) => boite(.15, .7, .15, MT.boisSombre, x, .4, z, g))
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereBufferGeometry(.32, 10, 8), toon(['#e03131', '#f08c00', '#fff'][i])); b.position.set(3.3, 3.0 - i * .05, 3.3 - i * .6); g.add(b); corde(V3(3.3, 3.4, 3.3 - i * .6), V3(3.3, 3.0 - i * .05 + .3, 3.3 - i * .6), 0, .02, g) }
      lanterne(-2.6, 3.4, 3.5, g, { sol: DECK, mare: 4 }); lanterne(2.6, 3.4, 3.5, g, { sol: DECK, mare: 4 }); etiquette(g, 6, 7.4); c.remise = g }

    /* ==================================================================== LE PHARE (tour de contrôle du verdict) */
    { const g = new THREE.Group(); g.position.set(37, 2.6, -16); s.add(g); Q.obstacles.push({ t: 'c', x: 37, z: -16, r: 3.0, y: 2.6 })
      const bandes = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const x = cv.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#efe7d6' : '#c8352a'; x.fillRect(0, i * 32, 64, 32) } for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(Math.random() * 64, Math.random() * 256, 2, 14) } const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t })()
      const fut = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(1.35, 2.2, 13, 24, 1), toonT(bandes))); fut.position.y = 6.5; g.add(fut)
      cyl(2.6, 2.9, .8, MT.pierre, 0, .4, 0, g, 24); const gal = cyl(2.0, 1.7, .3, MT.boisSombre, 0, 13.2, 0, g, 24); gal.scale.set(1, 1, 1)
      for (let a = 0; a < 6.28; a += .5) boite(.08, .9, .08, MT.metal, Math.cos(a) * 1.9, 13.75, Math.sin(a) * 1.9, g); const rg = new THREE.Mesh(new THREE.TorusBufferGeometry(1.9, .05, 5, 24), MT.metal); rg.rotation.x = PI / 2; rg.position.y = 14.2; g.add(rg)
      const lant = new THREE.Mesh(new THREE.CylinderBufferGeometry(1.15, 1.25, 1.8, 16), new THREE.MeshBasicMaterial({ color: '#ffe6a0' })); lant.position.y = 14.4; g.add(lant); Q._phareCoeur = lant.material
      const toitPh = ombre(new THREE.Mesh(new THREE.ConeBufferGeometry(1.75, 1.7, 16), toon('#c8352a'))); toitPh.position.y = 16.1; g.add(toitPh); cyl(.1, .1, .8, MT.metal, 0, 17.2, 0, g, 6)
      // faisceau (cône additif) qui tourne
      const fais = new THREE.Mesh(new THREE.ConeBufferGeometry(4.5, 30, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }))
      const pivot = new THREE.Group(); pivot.position.y = 14.4; g.add(pivot); fais.geometry.translate(0, -15, 0); fais.rotation.z = PI / 2; fais.position.x = 0; pivot.add(fais); Q._faisceau = { pivot, mat: fais.material }
      const hl = new THREE.Sprite(haloMat('#ffd27a', 0)); hl.scale.setScalar(9); hl.position.y = 14.4; g.add(hl); Q._phareHalo = hl
      // cabane, barque et rochers au pied
      const cab = maison({ x: 37 + 4, y: 2.6, z: -16 + 2.4, w: 3.2, d: 2.6, h: 2.3, ry: -.6, mur: MUR.gris, toit: TOIT.brun, pente: 1.1, dep: .5 }); fenetre(cab, 0, 1.6, 1.33, .6, .8, 0)
      lanterne(-1.8, 3.4, 4.2, g, { sol: 2.6, mare: 5 })
      g.userData = { hover: 1, onClick: () => clickTower() }; HUB_TOWER = g; cliquables.push(g); PORTES[7] = V3(33.4, 2.6, -16)
      const sg = labelPlane('', 5.2, 1.8, {}); sg.position.set(0, 19.4, 0); g.add(sg); g.userData.sign = sg }

    /* ==================================================================== BATEAUX AMARRÉS */
    Q._bateaux = []
    /* modèles de la forge (tools/forge/models/embarcations.mts) : quille à y = 0, flottaison à 0,58 m (0,18 m pour la barque) ; repli procédural si le GLB manque */
    function bateauForge(id, x, z, ry, draft, lampe) {
      const P = window.TalasProps; if (!(P && P.loaded(id))) return null
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g)
      const m = P.make(id, null, { gradientMap: grad, outline: 1.03 }); m.position.y = -draft; g.add(m)
      if (lampe) { const Lm = lanterne(0, lampe[0], lampe[1], g, { chaine: .05 }); Lm.g.children.forEach((ch) => { if (ch !== Lm.halo) ch.visible = false }) }   // seul le halo de la lanterne d'étrave brille la nuit
      Q._bateaux.push({ g, ph: r() * 6 }); return g
    }
    function bateauProc(x, z, ry, coque, cabine) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g)
      const sh = new THREE.Shape(); sh.moveTo(-2.9, .5); sh.quadraticCurveTo(-2.8, -.55, 0, -.6); sh.quadraticCurveTo(2.4, -.55, 3.7, .35); sh.lineTo(3.7, .55); sh.lineTo(-2.9, .55); sh.closePath()
      const hg = new THREE.ExtrudeBufferGeometry(sh, { depth: 2.2, bevelEnabled: true, bevelSize: .12, bevelThickness: .1, bevelSegments: 2, curveSegments: 8 }); hg.translate(0, 0, -1.1); hg.rotateY(-PI / 2); uvMonde(hg, .5)
      const m = ombre(new THREE.Mesh(hg, toon(coque))); g.add(m); const bande = boite(.02, .16, 6.7, toon('#efe7d4'), 0, .42, .45, g); bande.visible = false
      const cab = boite(1.7, 1.3, 1.9, toon(cabine || '#efe7d4'), 0, 1.15, -.3, g, .5); boite(1.9, .12, 2.1, MT.boisSombre, 0, 1.85, -.3, g); fenetreJ(g, 0, 1.3, .68, .9, .5)
      cyl(.22, .26, .9, toon('#c8352a'), 0, 2.4, -.7, g, 8); boite(.4, .08, .4, MT.boisSombre, 0, 2.87, -.7, g)
      for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.TorusBufferGeometry(.25, .1, 6, 12), toon('#221a20')); b.position.set(i ? 1.1 : -1.1, .35, .6); b.rotation.y = PI / 2; g.add(b) }
      lanterne(0, 2.6, 1.3, g, { chaine: .2 }); Q._bateaux.push({ g, ph: r() * 6 }); return g
    }
    function fenetreJ(g, x, y, z, w, h) { const v = new THREE.Mesh(new THREE.PlaneBufferGeometry(w, h), MT.vitre); v.position.set(x, y, z + .03); g.add(v); boite(w + .1, h + .1, .05, MT.boisSombre, x, y, z, g) }
    const bateau = (x, z, ry, coque, cabine, id, lampe) => bateauForge(id, x, z, ry, .58, lampe) || bateauProc(x, z, ry, coque, cabine)
    bateau(14.2, 3.5, PI / 2 + .08, '#c8352a', undefined, 'bateau-remorqueur', [1.22, 2.92]); bateau(-6.5, 14.6, .12, '#2f6f86', '#e9d8b0', 'bateau-chalutier', [1.3, 3.2]); bateau(36, 4, -.5, '#8a4ab0', '#efe7d4', 'bateau-vedette', [1.15, 2.75])
    // barques amarrées à la boutique
    ;(function () { if (bateauForge('barque', -13.2, 4, .3, .18)) return; const g = new THREE.Group(); g.position.set(-13.2, 0, 4); g.rotation.y = .3; s.add(g); const sh = new THREE.Shape(); sh.moveTo(-1.6, .3); sh.quadraticCurveTo(-1.4, -.35, 0, -.4); sh.quadraticCurveTo(1.4, -.35, 1.7, .3); sh.closePath(); const hg = new THREE.ExtrudeBufferGeometry(sh, { depth: .9, bevelEnabled: false }); hg.translate(0, 0, -.45); ombre; const m = ombre(new THREE.Mesh(hg, toon('#7a5232'))); g.add(m); Q._bateaux.push({ g, ph: 1.7 }) })()

    /* ==================================================================== BANNIÈRES le long des passerelles, filets */
    banniere(-5.2, DECK + 3.3, -17.5, PI / 2, 1.0, 2.3); banniere(5.2, PLACE.y + 3.0, PLACE.z - 3, -PI / 2, 1.0, 2.3)
    c.BAN = BAN; Q._BAN = BAN
    // filet de pêche qui sèche sur la petite terrasse de l'est : deux mâts, une traverse, un vrai filet à mailles en losange (segments de droite, pas de texture)
    { const g = new THREE.Group(); g.position.set(4.6, DECK, 6.5); s.add(g)
      ;[-2.4, 2.4].forEach((q) => { boite(.16, 3.7, .16, MT.boisSombre, q, 1.85, 0, g); Q.obstacles.push({ t: 'c', x: 4.6 + q, z: 6.5, r: .22, y: DECK }) }); boite(5.2, .13, .13, MT.boisSombre, 0, 3.6, 0, g)
      const W = 4.7, H = 2.2, pas = .26, seg = []
      const clip = (px, py, dx, dy) => { let t0 = -1e3, t1 = 1e3; const f = (p, d, lo, hi) => { if (Math.abs(d) < 1e-6) return p >= lo && p <= hi; let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) { const t = ta; ta = tb; tb = t } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); return t0 < t1 }; return f(px, dx, 0, W) && f(py, dy, 0, H) ? [px + dx * t0, py + dy * t0, px + dx * t1, py + dy * t1] : null }
      for (let c = -H - 2; c < W + H + 2; c += pas) { [[1, 1], [1, -1]].forEach(([sx, sy]) => { const l = clip(c, sy > 0 ? 0 : H, sx, sy); if (l) seg.push(l) }) }
      const P = []; seg.forEach(([x0, y0, x1, y1]) => { const sag = (x, y) => [x - W / 2, 3.5 - y, Math.sin(x / W * Math.PI) * .3 * (y / H + .3)]; P.push(...sag(x0, y0), ...sag(x1, y1)) })
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
      const filet = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#d8c79c' })); g.add(filet); Q._filet = filet
      for (let i = 0; i < 9; i++) { const fl = new THREE.Mesh(new THREE.SphereBufferGeometry(.09, 8, 6), toon(i % 2 ? '#c8352a' : '#e9b63a')); fl.position.set(-W / 2 + i * W / 8, 3.45, .04); g.add(fl) } }
    /* ampoules : un seul nuage de points additifs, l'intensité suit la nuit (uNuit) */
    { const P = Q._ampoules, pos = new Float32Array(P.length * 3), ph = new Float32Array(P.length); P.forEach((p, i) => { pos.set(p, i * 3); ph[i] = r() * 6 })
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1))
      const mat = new THREE.ShaderMaterial({ uniforms: { uNuit: { value: 0 }, uT: { value: 0 }, uScale: { value: 400 }, tHalo: { value: HALO } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'attribute float ph; uniform float uNuit, uT, uScale; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; float fl = .92 + .08 * sin(uT * 7. + ph * 3.); vA = (.25 + .6 * uNuit) * fl; vA *= smoothstep(1.2, 4., -mv.z); gl_PointSize = min((.1 + .2 * uNuit) * fl * uScale / max(-mv.z, .1), 44.); }',
        fragmentShader: 'uniform sampler2D tHalo; varying float vA; void main(){ float a = texture2D(tHalo, gl_PointCoord).r; gl_FragColor = vec4(vec3(1., .74, .38) * 1.5, a * vA); }' })
      const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 8; s.add(pts); Q._ampoulesMat = mat }
    // sécurité : les lanternes ont besoin d'un sol pour leurs mares de lumière ; le tableau LAN est lu par talas-quai-vie.js
  }
})()

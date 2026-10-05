/* LES LOISIRS DU QUAI DE TALAS : quatre pauses réparties sur l'île, une par quartier, pour ne pas la surcharger.
 *   - Belvédère (nord-ouest, terrasse haute) : PAPIER-AVIONS. Un pupitre, un manche à air, trois ballons-cibles qui portent un anneau au-dessus du village.
 *     On fixe le cap puis la force (deux appuis sur E), l'avion plane, le vent le pousse ; 5 lancers, 1 / 2 / 3 points par anneau traversé.
 *   - Terrasse est : PÉTANQUE contre Boulon. Une piste de gravier de 3 m sur 6,4 m ; 3 boules chacun ; on fixe le cap puis la force, Boulon joue de son côté
 *     (il pointe ou il tire). Chocs entre boules, boules mortes hors de la piste, décompte de la mène.
 *   - Grande jetée (sud-est) : LANTERNES DES VŒUX. On choisit un engagement de sécurité (ISO 45001), une lanterne de papier s'élève et rejoint le ciel des vœux,
 *     qui garde la mémoire des lanternes lancées (stockage local) et brille la nuit.
 *   - Terrasse ouest : HAMAC. On s'y assoit (E), E de nouveau pour faire la sieste : le jour avance de quelques heures. Boulon rappelle que la fatigue est un risque.
 * Tout se joue avec la seule touche E / ACTION : une direction (ZQSD, flèches, stick) quitte le jeu. Dépend de talas-quai.js, talas-quai-decor.js (Q.loisirs(contexte)
 * est appelé après le village) et talas-quai-vie.js (Q.loisirTick, Q.loisirToucher, Q.loisirInvite, Q.loisirClip). ?loisirs=non les retire. */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE, Q = window.TALAS_QUAI
  if (!THREE || !M || !Q || !Q.on) return
  if (/[?&]loisirs=non/.test(location.search)) return
  const PI = Math.PI, TAU = PI * 2, V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t
  const aj = (a, b, t) => { const d = ((b - a + PI) % TAU + TAU) % TAU - PI; return a + d * t }                  // angle : plus court chemin
  const tri = (t) => 1 - Math.abs((t % 1) * 2 - 1)                      // onde triangulaire 0..1..0 : le curseur des barres de réglage
  const mem = {
    lire(k, d) { try { const v = JSON.parse(localStorage.getItem('talas-' + k)); return v === null || v === undefined ? d : v } catch (e) { return d } },
    ecrire(k, v) { try { localStorage.setItem('talas-' + k, JSON.stringify(v)) } catch (e) {} }
  }
  const bip = (f, d, t, g) => { try { if (window.beep) window.beep(f, d, t || 'triangle', g || .04) } catch (e) {} }
  const ST = Q.stations = []
  /* lieux (repère du monde) : choisis loin des portes d'ateliers (l'invite « Entrer » est prioritaire à moins de 3,4 m) et des escaliers */
  const AVC = { x: -23.6, y: 9.6, z: -42.3 }                                  // belvédère : pupitre, on lance vers le sud
  const PTC = { x: 14.2, y: 8.0, zL: -38.9, L: 6.4, hl: 1.5 }                 // terrasse nord-est : ligne de lancer au sud, piste vers le nord
  const LNC = { x: 11.6, y: 1.05, z: -6.35 }                                  // grande jetée, côté nord
  const HMC = { x: -14.0, y: 4.1, z: -24.5, h: 3.2 }                          // terrasse ouest, au nord de l'atelier 2
  let jeu = null, W0 = null, camT = 0

  /* ====================================================================== panneau d'information du jeu en cours */
  const panneau = (() => {
    let el = null
    const creer = () => {
      const st = document.getElementById('qloisirCss') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'qloisirCss' }))
      st.textContent = `#qloisir{position:absolute;left:50%;bottom:54px;transform:translateX(-50%);min-width:300px;max-width:min(440px,92%);padding:9px 18px 11px;border-radius:14px;border:3px solid #1a0d22;background:#fff3c8;color:#3a1c40;box-shadow:0 3px 0 #1a0d22;z-index:8;pointer-events:none;text-align:center;font-family:"Luckiest Guy","Trebuchet MS",sans-serif;opacity:0;transition:opacity .2s}
        #qloisir>b{display:block;font-size:17px;letter-spacing:.3px} #qloisir .l{font:700 13px/1.3 "Trebuchet MS",sans-serif;margin-top:2px} #qloisir .s{font:600 12px/1.25 "Trebuchet MS",sans-serif;margin-top:3px;opacity:.8}
        #qloisir .b{position:relative;height:16px;margin:9px 4px 3px;border-radius:9px;border:3px solid #1a0d22;background:linear-gradient(90deg,#7bd07a,#f2d44b,#e8681c)}
        #qloisir .b.cap{background:linear-gradient(90deg,#9ad0ff,#fff3c8 50%,#9ad0ff)} #qloisir .b.cap:after{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;background:#1a0d22;opacity:.45}
        #qloisir .b i{position:absolute;top:-8px;width:7px;height:28px;border-radius:4px;background:#3a1c40;border:2px solid #fff3c8;transform:translateX(-4px)}
        #qsieste{position:absolute;inset:0;z-index:9;pointer-events:none;background:#080a24;opacity:0;transition:opacity .7s;display:flex;align-items:center;justify-content:center;color:#cfd6ff;font:700 44px "Luckiest Guy","Trebuchet MS",sans-serif;letter-spacing:6px}`
      el = document.createElement('div'); el.id = 'qloisir'
      el.innerHTML = '<b></b><div class="l"></div><div class="b"><i></i></div><div class="s"></div>'
      document.getElementById('frame').append(el)
      const sv = document.createElement('div'); sv.id = 'qsieste'; sv.textContent = 'Zzz…'; document.getElementById('frame').append(sv)
    }
    return {
      montrer(titre, ligne, o) {
        if (!el) creer(); o = o || {}
        el.querySelector('b').textContent = titre; el.querySelector('.l').innerHTML = ligne || ''; el.querySelector('.s').innerHTML = o.sous || ''
        const b = el.querySelector('.b'); b.style.display = o.barre === undefined ? 'none' : ''; b.className = 'b' + (o.cap ? ' cap' : '')
        if (o.barre !== undefined) b.querySelector('i').style.left = (clamp(o.barre, 0, 1) * 100) + '%'
        el.style.opacity = 1
      },
      cacher() { if (el) el.style.opacity = 0 },
      sommeil(v) { if (!el) creer(); document.getElementById('qsieste').style.opacity = v }
    }
  })()

  /* ====================================================================== petits outils de décor */
  const toile = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t }
  const enseigne = (texte, fond, encre) => toile(512, 160, (x, w, h) => { x.fillStyle = fond; x.fillRect(0, 0, w, h); x.strokeStyle = encre; x.lineWidth = 10; x.strokeRect(6, 6, w - 12, h - 12)
    x.fillStyle = encre; x.font = '800 62px "Trebuchet MS",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; const l = texte.split('\n'); l.forEach((t, i) => x.fillText(t, w / 2, h / 2 + (i - (l.length - 1) / 2) * 66)) })
  const nombre = (n, col) => toile(128, 128, (x, w, h) => { x.fillStyle = col; x.beginPath(); x.arc(64, 64, 58, 0, TAU); x.fill(); x.strokeStyle = '#1a0d22'; x.lineWidth = 8; x.stroke(); x.fillStyle = '#1a0d22'; x.font = '800 78px "Trebuchet MS",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 64, 70) })

  /* proximité d'une station : la plus proche dans son rayon, au même niveau */
  const stationProche = (J) => { let b = null, bd = 1e9; for (const q of ST) { if (Math.abs(q.y - J.y) > 1.5) continue; const d = Math.hypot(q.x - J.x, q.z - J.z); if (d < q.r && d < bd) { bd = d; b = q } } return b }
  Q.loisirActif = () => !!jeu
  Q.loisirEtat = () => jeu ? { jeu: jeu.nom || 'x', etat: jeu.etat, score: jeu.score, n: jeu.n, f: jeu.f, ang: jeu.ang, log: jeu.log, tally: jeu.tally, bilan: jeu.bilan } : null   // (tests)
  Q.loisirInvite = (J) => { if (jeu || J.assis) return null; const q = stationProche(J); return q ? q.invite : null }
  Q.loisirInviteAssis = (J) => J.assis && J.assis.hamac ? (sieste.on ? null : 'Faire la sieste (E) · ou se lever (direction)') : null
  Q.loisirClip = () => (clipT > 0 ? 'Interact' : null)
  let clipT = 0

  /* ====================================================================== construction */
  Q.loisirs = function (c) {
    const { s, MT, LAN, boite, cyl, toon, toonT, haloMat } = c
    const R = M.alea(20261006), ombre = (m) => { m.castShadow = true; m.receiveShadow = true; return m }
    ST.length = 0
    const poteau = (x, y, z, h, r, mat) => cyl(r, r * 1.08, h, mat || MT.boisSombre, x, y + h / 2, z, null, 8)

    /* ---------------------------------------------------------------- 1. belvédère : pupitre, manche à air, ballons-cibles */
    const AV = AVC
    {
      const g = new THREE.Group(); g.position.set(AV.x, AV.y, AV.z); s.add(g)
      boite(1.1, .9, .5, MT.bois, 0, .45, 0, g, 1); const pente = boite(1.2, .08, .62, MT.boisClair, 0, .98, .02, g, 1); pente.rotation.x = .35
      ;[['#fff6cf', 0], ['#ffd1dc', .02], ['#cfeaff', .04]].forEach(([col, dz], i) => { const f = boite(.5, .02, .38, toon(col), -.25 + i * .06, 1.05 + i * .02, .02, g); f.rotation.x = .35; f.rotation.y = i * .25 - .2 })
      const p = ombre(new THREE.Mesh(new THREE.PlaneBufferGeometry(1.6, .5), new THREE.MeshToonMaterial({ map: enseigne('PAPIER-AVIONS', '#fff3c8', '#3a1c40') }))); p.position.set(0, 1.9, -.05); p.rotation.y = PI; g.add(p)
      boite(.08, 1.4, .08, MT.boisSombre, -.72, 1.2, -.05, g); boite(.08, 1.4, .08, MT.boisSombre, .72, 1.2, -.05, g)
      Q.obstacles.push({ t: 'b', x: AV.x, z: AV.z, hw: .62, hd: .34, ry: 0, y: AV.y, h: 1.0 })
      // ligne de lancer peinte
      const lg = new THREE.Mesh(new THREE.PlaneBufferGeometry(2.2, .12), new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: .8 })); lg.rotation.x = -PI / 2; lg.position.set(AV.x, AV.y + .02, AV.z + 1.45); s.add(lg)
      // manche à air : mât et manche tournante (animée dans loisirTick)
      const mx = AV.x + 3.0, mz = AV.z + .5; poteau(mx, AV.y, mz, 2.8, .06)
      const pivot = new THREE.Group(); pivot.position.set(mx, AV.y + 2.7, mz); s.add(pivot)
      const tex = toile(64, 128, (x, w, h) => { for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#fff3c8' : '#e8681c'; x.fillRect(0, i * 21.4, w, 22) } })
      const manche = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.26, .09, 1.1, 10, 1, true), new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide }))); manche.rotation.z = -PI / 2; manche.position.x = .55; pivot.add(manche)
      AV.manche = pivot
      ST.push({ id: 'avions', x: AV.x, y: AV.y, z: AV.z + 1.0, r: 2.1, invite: 'Lancer des avions en papier', demarrer: (W, J) => avions.demarrer(W, J) })
    }
    // trois ballons-cibles qui flottent au-dessus du village, chacun porte un anneau (de plus en plus loin, de plus en plus de points)
    const CIBLES = [                                            // calibrées avec la physique de avions.tick (une trajectoire par anneau : cap et force différents)
      { x: -26.0, y: 10.2, z: -26.5, pts: 1, r: 2.2, col: '#ffd33d' },
      { x: -17.0, y: 11.4, z: -11.0, pts: 2, r: 2.1, col: '#ff8a4a' },
      { x: -12.0, y: 12.4, z: 2.0, pts: 3, r: 2.0, col: '#ff5b86' }
    ]
    CIBLES.forEach((t, i) => {
      const g = new THREE.Group(); g.position.set(t.x, t.y, t.z); s.add(g); t.g = g; t.h0 = t.y; t.ph = i * 2.1
      const ring = ombre(new THREE.Mesh(new THREE.TorusBufferGeometry(t.r, .1, 8, 28), toon(t.col))); g.add(ring); t.ring = ring
      const bal = ombre(new THREE.Mesh(new THREE.SphereBufferGeometry(.95, 14, 10), toon(t.col))); bal.scale.set(1, 1.2, 1); bal.position.y = t.r + 2.5; g.add(bal)
      const noeud = ombre(new THREE.Mesh(new THREE.ConeBufferGeometry(.18, .3, 8), toon('#3a1c40'))); noeud.position.y = t.r + 1.3; noeud.rotation.x = PI; g.add(noeud)
      for (const a of [0, 1.57, 3.14, 4.71]) { const c0 = V3(Math.cos(a) * t.r * .72, t.r * .7, Math.sin(a) * t.r * .72), c1 = V3(0, t.r + 1.3, 0), d = c1.clone().sub(c0), L = d.length()
        const f = new THREE.Mesh(new THREE.CylinderBufferGeometry(.018, .018, L, 4), new THREE.MeshBasicMaterial({ color: '#3a1c40' })); f.position.copy(c0).addScaledVector(d, .5); f.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); g.add(f) }
      const n = new THREE.Mesh(new THREE.PlaneBufferGeometry(.9, .9), new THREE.MeshBasicMaterial({ map: nombre(t.pts, '#fff3c8'), transparent: true, side: THREE.DoubleSide })); n.position.set(0, t.r + 2.5, -.97); n.rotation.y = PI; g.add(n)
      t.flash = 0
    })
    Q._cibles = CIBLES; Q._manche = AV.manche

    /* ---------------------------------------------------------------- 2. terrasse est : piste de pétanque */
    const PT = PTC
    {
      const gr = toile(256, 512, (x, w, h) => { x.fillStyle = '#c9b88f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 5200; i++) { const t = R(); x.fillStyle = t < .4 ? 'rgba(255,248,224,.55)' : t < .75 ? 'rgba(130,108,72,.4)' : 'rgba(80,66,46,.35)'; x.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 2) } })
      const piste = ombre(new THREE.Mesh(new THREE.BoxBufferGeometry(PT.hl * 2, .08, PT.L + .5), [toon('#a99a76'), toon('#a99a76'), toonT(gr), toon('#a99a76'), toon('#a99a76'), toon('#a99a76')])); piste.position.set(PT.x, PT.y + .04, PT.zL - PT.L / 2 + .15); s.add(piste)
      const zc = PT.zL - PT.L / 2 + .15, lg = PT.L + .5
      boite(PT.hl * 2 + .4, .16, .2, MT.boisSombre, PT.x, PT.y + .08, zc - lg / 2 - .1, null, 1); boite(PT.hl * 2 + .4, .16, .2, MT.boisSombre, PT.x, PT.y + .08, zc + lg / 2 + .1, null, 1)
      boite(.2, .16, lg, MT.boisSombre, PT.x - PT.hl - .1, PT.y + .08, zc, null, 1); boite(.2, .16, lg, MT.boisSombre, PT.x + PT.hl + .1, PT.y + .08, zc, null, 1)
      const cercle = new THREE.Mesh(new THREE.RingBufferGeometry(.2, .27, 24), new THREE.MeshBasicMaterial({ color: '#fff3c8', side: THREE.DoubleSide })); cercle.rotation.x = -PI / 2; cercle.position.set(PT.x - .4, PT.y + .09, PT.zL + .45); s.add(cercle)
      // caisse à boules et panneau
      const caisse = boite(.8, .45, .55, MT.bois, PT.x + 1.9, PT.y + .225, PT.zL + .9, null, 1); caisse.rotation.y = .2
      for (let i = 0; i < 3; i++) { const b = ombre(new THREE.Mesh(new THREE.SphereBufferGeometry(.11, 14, 10), toon(i === 2 ? '#e9c46a' : '#c7ced8', { }))); b.position.set(PT.x + 1.68 + i * .2, PT.y + .56, PT.zL + .9); s.add(b) }
      Q.obstacles.push({ t: 'b', x: PT.x + 1.9, z: PT.zL + .9, hw: .42, hd: .3, ry: .2, y: PT.y, h: .5 })
      const pn = ombre(new THREE.Mesh(new THREE.PlaneBufferGeometry(1.5, .47), new THREE.MeshToonMaterial({ map: enseigne('PÉTANQUE\nAVEC BOULON', '#e9dcc0', '#7a3a8a') }))); pn.position.set(PT.x + 1.9, PT.y + 1.5, PT.zL + .95); pn.rotation.y = PI; s.add(pn)
      poteau(PT.x + 1.9, PT.y, PT.zL + .95, 1.2, .05);
      ST.push({ id: 'petanque', x: PT.x - .4, y: PT.y, z: PT.zL + .5, r: 2.0, invite: 'Jouer à la pétanque avec Boulon', demarrer: (W, J) => petanque.demarrer(W, J) })
    }

    /* ---------------------------------------------------------------- 3. grande jetée : table des lanternes des vœux */
    const LN = LNC
    {
      const g = new THREE.Group(); g.position.set(LN.x, LN.y, LN.z); s.add(g)
      boite(1.5, .08, .8, MT.boisClair, 0, .85, 0, g, 1); for (const sx of [-1, 1]) for (const sz of [-1, 1]) boite(.08, .85, .08, MT.boisSombre, sx * .65, .42, sz * .32, g)
      boite(1.7, .16, .95, toon('#7a3a8a'), 0, .9, 0, g)                                       // nappe violette
      for (let i = 0; i < 4; i++) { const l = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.2, .2, .34, 10), toon(['#ffb85a', '#ff8fb5', '#8fe3d6', '#ffe08a'][i]))); l.position.set(-.45 + i * .3, 1.2, -.05 + (i % 2) * .15); g.add(l) }
      boite(.1, .02, .5, toon('#1a0d22'), .6, .96, .1, g)                                     // pinceau et encre
      const p = ombre(new THREE.Mesh(new THREE.PlaneBufferGeometry(1.5, .47), new THREE.MeshToonMaterial({ map: enseigne('LANTERNES\nDES VŒUX', '#fff3c8', '#c8352a') }))); p.position.set(0, 2.15, .02); g.add(p)
      boite(.08, 1.4, .08, MT.boisSombre, -.7, 1.55, .0, g); boite(.08, 1.4, .08, MT.boisSombre, .7, 1.55, .0, g)
      Q.obstacles.push({ t: 'b', x: LN.x, z: LN.z, hw: .9, hd: .55, ry: 0, y: LN.y, h: 1.2 })
      ST.push({ id: 'lanternes', x: LN.x, y: LN.y, z: LN.z + 1.1, r: 2.1, invite: 'Faire un vœu : lancer une lanterne', demarrer: (W, J) => lanternes.demarrer(W, J) })
    }

    /* ---------------------------------------------------------------- 4. terrasse ouest : hamac entre deux poteaux */
    const HM = HMC
    {
      for (const dz of [-1, 1]) { poteau(HM.x, HM.y, HM.z + dz * (HM.h / 2 + .3), 2.2, .1); const cap = ombre(new THREE.Mesh(new THREE.SphereBufferGeometry(.13, 8, 6), MT.boisSombre)); cap.position.set(HM.x, HM.y + 2.25, HM.z + dz * (HM.h / 2 + .3)); s.add(cap)
        Q.obstacles.push({ t: 'c', x: HM.x, z: HM.z + dz * (HM.h / 2 + .3), r: .16, y: HM.y }) }
      const tex = toile(256, 256, (x, w, h) => { const cols = ['#e8681c', '#fff3c8', '#3fb6c9', '#fff3c8']; for (let i = 0; i < 16; i++) { x.fillStyle = cols[i % 4]; x.fillRect(i * 16, 0, 16, h) } x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 40; i++) x.fillRect(0, i * 7, w, 2) })
      const geo = new THREE.PlaneBufferGeometry(1.0, HM.h, 6, 28), p = geo.attributes.position
      for (let i = 0; i < p.count; i++) { const v = p.getY(i) / (HM.h / 2), u = p.getX(i) / .5; p.setZ(i, 1.55 - .78 * (1 - v * v) + .12 * u * u) }
      geo.computeVertexNormals()
      const hm = ombre(new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: tex, side: THREE.DoubleSide }))); hm.rotation.x = -PI / 2; hm.rotation.z = PI / 2; hm.rotation.set(-PI / 2, 0, 0)
      // le plan est dans XY avec Y le long du hamac : on le couche pour que Y devienne Z (le long des poteaux), et Z (la flèche) devienne la hauteur
      hm.position.set(HM.x, HM.y, HM.z); s.add(hm)
      for (const dz of [-1, 1]) { const A = V3(HM.x, HM.y + 1.55, HM.z + dz * HM.h / 2), B = V3(HM.x, HM.y + 1.95, HM.z + dz * (HM.h / 2 + .3)); const d = B.clone().sub(A), L = d.length()
        const f = new THREE.Mesh(new THREE.CylinderBufferGeometry(.025, .025, L, 5), MT.corde); f.position.copy(A).addScaledVector(d, .5); f.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); s.add(f) }
      const co = ombre(new THREE.Mesh(new THREE.BoxBufferGeometry(.55, .14, .4), toon('#ffd1dc'))); co.position.set(HM.x, HM.y + .95, HM.z - 1.1); co.rotation.set(.3, 0, 0); s.add(co)
      // petite table basse et verre
      cyl(.34, .34, .06, MT.boisClair, HM.x + 1.3, HM.y + .52, HM.z, null, 12); cyl(.07, .1, .5, MT.boisSombre, HM.x + 1.3, HM.y + .25, HM.z, null, 8); cyl(.07, .06, .16, toon('#7bd07a', { transparent: true, opacity: .8 }), HM.x + 1.3, HM.y + .64, HM.z + .05, null, 10)
      Q.obstacles.push({ t: 'c', x: HM.x + 1.3, z: HM.z, r: .36, y: HM.y })
      // la place de hamac : une assise du système de sièges (talas-quai-zen.js / talas-quai-vie.js)
      if (Q.sieges) Q.sieges.push({ x: HM.x, y: HM.y + 1.0, z: HM.z, ang: -PI / 2, sortie: V3(HM.x + 1.0, HM.y, HM.z + 1.3), plan: HM.y, nom: 'hamac', hamac: true, penche: -.5 })
    }

    /* ---------------------------------------------------------------- ciel des vœux : lanternes lancées, mémorisées */
    {
      const memo = mem.lire('voeux', [])
      const slot = (i) => { const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678, d = Math.sin(i * 37.719) * 9753.31; const fr = (v) => v - Math.floor(v); let x = 14 + fr(a) * 36, z = -42 + fr(d) * 40; if (Math.hypot(x - 37, z + 16) < 5) x += 8; return V3(x, 15 + fr(b) * 17, z) }
      const pal = ['#ffb85a', '#ff8fb5', '#8fe3d6']
      const faire = (i, col) => {
        const g = new THREE.Group(); const corps = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(.3, .24, .55, 10), new THREE.MeshBasicMaterial({ color: col })))
        const cap = new THREE.Mesh(new THREE.CylinderBufferGeometry(.31, .31, .05, 10), toon('#3a1c40')); cap.position.y = .3; const bas = cap.clone(); bas.position.y = -.3; g.add(corps, cap, bas)
        const halo = new THREE.Sprite(haloMat(col, 0)); halo.scale.setScalar(3.2); g.add(halo); g.userData = { halo, col, ph: i * 1.3, base: slot(i), vol: 0 }
        s.add(g); return g
      }
      const ciel = Q.cielVoeux = []
      memo.slice(-18).forEach((v, k) => { const g = faire(k, pal[(v.i | 0) % 3]); g.position.copy(g.userData.base); ciel.push(g) })
      Q._faireLanterne = (i) => { const g = faire(ciel.length + 100, pal[i % 3]); ciel.push(g); return g }
      Q._slotLanterne = slot
    }
  }

  /* ====================================================================== JEU 1 : papier-avions */
  const VENT = { x: 0 }
  const avions = {
    nom: 'Papier-avions', AIM: .31, lancers: 5,
    demarrer(W, J) {
      const AV = AVC
      this.AV = AV; this.etat = 'cap'; this.t = 0; this.n = 0; this.score = 0; this.f = .5; this.ang = 0; this.log = ''
      J.x = AV.x; J.y = AV.y; J.z = AV.z + 1.0; J.ang = 0; J.vit = 0
      VENT.x = (Math.random() - .5) * 2.6
      if (!this.plane) this.plane = fabriquerAvion(W)
      this.plane.visible = false
      if (!this.guide) { this.guide = []; for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(new THREE.SphereBufferGeometry(.07, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff3c8' })); W.scene.add(d); this.guide.push(d) } }
      jeu = this; this.maj(W, 0)
    },
    maj(W) {
      const sous = `Vent : ${VENT.x > 0 ? '→' : '←'} ${Math.abs(VENT.x).toFixed(1)} m/s · meilleur : ${mem.lire('avions-best', 0)}`
      if (this.etat === 'cap') panneau.montrer('Papier-avions · lancer ' + (this.n + 1) + '/' + this.lancers, 'Score ' + this.score + ' · <b>E</b> : fixer le cap', { barre: tri(this.t / 2.4), cap: true, sous })
      else if (this.etat === 'force') panneau.montrer('Papier-avions · lancer ' + (this.n + 1) + '/' + this.lancers, 'Score ' + this.score + ' · <b>E</b> : lancer (force)', { barre: tri(this.t / 1.9), sous })
      else if (this.etat === 'vol' || this.etat === 'fin') panneau.montrer('Papier-avions · lancer ' + (this.n + 1) + '/' + this.lancers, 'Score ' + this.score + ' · ' + (this.log || 'il plane…'), { sous })
      else panneau.montrer('Papier-avions : bilan', `Score <b>${this.score}</b> · meilleur ${mem.lire('avions-best', 0)}`, { sous: '<b>E</b> : rejouer · une direction : quitter' })
    },
    appui() {
      if (this.etat === 'cap') { this.ang = lerp(-this.AIM, this.AIM, tri(this.t / 2.4)); this.etat = 'force'; this.t = 0; bip(520, .05) }
      else if (this.etat === 'force') { this.f = tri(this.t / 1.9); this.lancer() }
      else if (this.etat === 'bilan') this.demarrer(W0, W0.joueur)
    },
    lancer() {
      const AV = this.AV, v0 = 7 + 15 * this.f, el = .12
      this.pos = V3(AV.x, AV.y + 1.5, AV.z + 1.3); this.vel = V3(v0 * Math.cos(el) * Math.sin(this.ang), v0 * Math.sin(el), v0 * Math.cos(el) * Math.cos(this.ang))
      this.plane.visible = true; this.plane.position.copy(this.pos); this.etat = 'vol'; this.t = 0; this.touches = new Set(); this.zPrec = this.pos.z; this.log = 'il plane…'
      clipT = .8; bip(300, .1, 'sawtooth', .03)
    },
    tick(dt, T, W, J, veut) {
      this.t += dt; J.vit = 0; J.ang = 0
      const cibles = Q._cibles || []
      // guide de visée
      const vis = this.etat === 'cap' || this.etat === 'force'
      const a = this.etat === 'cap' ? lerp(-this.AIM, this.AIM, tri(this.t / 2.4)) : this.ang
      this.guide.forEach((d, i) => { d.visible = vis; if (vis) d.position.set(this.AV.x + Math.sin(a) * (1.8 + i * .55), this.AV.y + 1.5 + i * .02, this.AV.z + 1.3 + Math.cos(a) * (1.8 + i * .55)) })
      if (this.etat === 'cap' || this.etat === 'force') this.maj(W)
      if (this.etat === 'vol') {
        const p = this.pos, v = this.vel, g = 9.0
        for (let k = 0; k < 4; k++) {                       // 4 sous-pas
          const h = dt / 4, vh = Math.hypot(v.x, v.z), port = clamp(vh / 16, 0, .85)
          v.y += -g * (1 - port) * h; const dr = Math.exp(-.12 * h); v.x = v.x * dr + VENT.x * .25 * h; v.z *= dr
          p.addScaledVector(v, h)
          for (const t of cibles) if (!this.touches.has(t) && this.zPrec < t.g.position.z && p.z >= t.g.position.z) {
            const k2 = (t.g.position.z - this.zPrec) / Math.max(1e-6, p.z - this.zPrec), cx = lerp(this.xPrec, p.x, k2), cy = lerp(this.yPrec, p.y, k2)
            if (Math.hypot(cx - t.g.position.x, cy - t.g.position.y) < t.r) { this.touches.add(t); this.score += t.pts; t.flash = 1; bip(660 + t.pts * 120, .12); if (W.fx) W.fx.burst(t.g.position.clone(), 14); this.log = '+' + t.pts + ' !' }
          }
          this.zPrec = p.z; this.xPrec = p.x; this.yPrec = p.y
        }
        this.plane.position.copy(p); const dir = v.clone().normalize(); this.plane.lookAt(p.clone().add(dir)); this.plane.rotateZ(-v.x * .04)
        if (p.y < 3 || p.z > 70 || this.t > 9) { this.etat = 'fin'; this.t = 0; if (!this.touches.size) this.log = 'raté'; this.plane.visible = false }
        this.maj(W)
        W.look.lerp(p, Math.min(1, dt * 5)); W.dist += (14 - W.dist) * Math.min(1, dt * 3); W.pitch += (.32 - W.pitch) * Math.min(1, dt * 3)
      } else {
        const l = V3(this.AV.x + 1.5, this.AV.y + 4.5, this.AV.z + 18); W.look.lerp(l, Math.min(1, dt * 3)); W.dist += (30 - W.dist) * Math.min(1, dt * 2); W.pitch += (.2 - W.pitch) * Math.min(1, dt * 2)
      }
      W.yaw = aj(W.yaw, PI, Math.min(1, dt * 3))
      if (this.etat === 'fin' && this.t > 1.2) {
        this.n++
        if (this.n >= this.lancers) { const b = mem.lire('avions-best', 0); if (this.score > b) mem.ecrire('avions-best', this.score); this.etat = 'bilan'; this.guide.forEach((d) => { d.visible = false }); if (this.score >= 8 && W.fx) W.fx.burst(W.dylan.position.clone().add(V3(0, 2, 0)), 20) }
        else { this.etat = 'cap'; this.t = 0; VENT.x = clamp(VENT.x + (Math.random() - .5) * 2.4, -1.8, 1.8) }
        this.maj(W)
      }
    },
    quitter(W) { if (this.plane) this.plane.visible = false; this.guide && this.guide.forEach((d) => { d.visible = false }); panneau.cacher() }
  }
  function fabriquerAvion(W) {
    const g = new THREE.Group(), pos = [], idx = []
    const sommets = [[0, 0, .55], [-.5, .06, -.4], [0, -.04, -.45], [.5, .06, -.4], [0, -.2, -.38]]
    const m = new THREE.MeshToonMaterial({ color: '#fffaf0', side: THREE.DoubleSide }), m2 = new THREE.MeshToonMaterial({ color: '#cfeaff', side: THREE.DoubleSide })
    const tri3 = (a, b, c, mat) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([...sommets[a], ...sommets[b], ...sommets[c]], 3)); geo.computeVertexNormals(); const me = new THREE.Mesh(geo, mat); me.castShadow = true; g.add(me) }
    tri3(0, 1, 2, m); tri3(0, 2, 3, m); tri3(0, 2, 4, m2)
    g.scale.setScalar(1.1); W.scene.add(g); return g
  }

  /* ====================================================================== JEU 2 : pétanque contre Boulon */
  const petanque = {
    PT: PTC, A: 3.0, ordre: [0, 1, 0, 1, 0, 1], tally: [0, 0],
    pw(u, v) { return { x: this.PT.x + v, z: this.PT.zL - u } },
    demarrer(W, J) {
      const PT = this.PT; this.bp = null
      this.etat = 'cap'; this.t = 0; this.n = 0; this.ang = 0; this.f = .5; this.log = ''
      if (!this.meshes) this.meshes = []
      this.meshes.forEach((m) => W.scene.remove(m)); this.meshes = []; this.balles = []
      J.x = PT.x - .4; J.y = PT.y; J.z = PT.zL + .5; J.ang = PI; J.vit = 0
      const uc = 3.3 + Math.random() * 1.9, vc = (Math.random() - .5) * .8
      this.coch = this.balle(-1, uc, vc, .055, .3); jeu = this
      this.maj(W)
    },
    balle(team, u, v, r, m) {
      const mat = team === 0 ? '#e8681c' : team === 1 ? '#3fb6c9' : '#e9c46a'
      const me = new THREE.Mesh(new THREE.SphereBufferGeometry(r, 14, 10), new THREE.MeshToonMaterial({ color: mat })); me.castShadow = true; W0.scene.add(me); this.meshes.push(me)
      if (team >= 0) { const bd = new THREE.Mesh(new THREE.TorusBufferGeometry(r * .96, r * .13, 6, 18), new THREE.MeshToonMaterial({ color: '#c7ced8' })); bd.rotation.x = PI / 2; me.add(bd) }
      const b = { team, u, v, vu: 0, vv: 0, r, m, me, vive: true, h: 0 }; this.balles.push(b); this.poser(b); return b
    },
    poser(b) { const p = this.pw(b.u, b.v); b.me.position.set(p.x, this.PT.y + .08 + b.r + (b.h || 0), p.z) },
    lancerBalle(team, ang, v0) {
      const b = this.balle(team, .25, team === 0 ? -.4 : .55, .11, 1); b.vu = v0 * Math.cos(ang); b.vv = v0 * Math.sin(ang); b.h = 0; b.vol = .35; this.derniere = b
      this.etat = 'roule'; this.t = 0
    },
    maj(W) {
      const reste = [0, 1].map((t) => this.ordre.filter((o, i) => o === t && i >= this.n).length)
      const sous = `Boules : toi ${reste[0]} · Boulon ${reste[1]} · victoires ${this.tally[0]} – ${this.tally[1]}`
      if (this.etat === 'cap') panneau.montrer('Pétanque · à toi de jouer', '<b>E</b> : fixer le cap', { barre: tri(this.t / 1.8), cap: true, sous })
      else if (this.etat === 'force') panneau.montrer('Pétanque · à toi de jouer', '<b>E</b> : lancer (plus fort = plus loin)', { barre: tri(this.t / 1.35), sous })
      else if (this.etat === 'roule') panneau.montrer('Pétanque', this.log || 'la boule roule…', { sous })
      else if (this.etat === 'boulon') panneau.montrer('Pétanque · Boulon réfléchit', 'Boulon vise…', { sous })
      else panneau.montrer('Pétanque : ' + (this.log || 'fin de mène'), this.bilan || '', { sous: sous + '<br><b>E</b> : une autre mène · une direction : quitter' })
    },
    appui() {
      if (this.etat === 'cap') { this.ang = lerp(-.24, .24, tri(this.t / 1.8)); this.etat = 'force'; this.t = 0; bip(520, .05) }
      else if (this.etat === 'force') { this.f = tri(this.t / 1.35); clipT = .8; bip(260, .1, 'square', .04); this.lancerBalle(0, this.ang, 1.6 + 6.6 * this.f) }
      else if (this.etat === 'bilan') this.demarrer(W0, W0.joueur)
    },
    jouerBoulon() {
      const c = this.coch, vives = this.balles.filter((b) => b.team >= 0 && b.vive)
      const dist = (b) => Math.hypot(b.u - c.u, b.v - c.v), mienne = vives.filter((b) => b.team === 1).sort((a, b) => dist(a) - dist(b))[0], sienne = vives.filter((b) => b.team === 0).sort((a, b) => dist(a) - dist(b))[0]
      const u0 = .25, v0 = .55, A = this.A
      let cible = { u: c.u - .02, v: c.v }, tir = false
      if (sienne && (!mienne || dist(sienne) < dist(mienne)) && Math.random() < .55) { cible = { u: sienne.u, v: sienne.v }; tir = true }
      const D = Math.hypot(cible.u - u0, cible.v - v0); let v = Math.sqrt(2 * A * D + (tir ? 3.2 * 3.2 : 0)); v = clamp(v * (1 + (Math.random() - .5) * (tir ? .09 : .13)), 2, 8.4)
      const ang = Math.atan2(cible.v - v0, cible.u - u0) + (Math.random() - .5) * .08
      this.lancerBalle(1, ang, v)
    },
    tick(dt, T, W, J) {
      J.vit = 0; J.ang = PI; this.t += dt
      const PT = this.PT
      // physique : sous-pas de 1/120 s
      const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n
      for (let s = 0; s < n; s++) {
        for (const b of this.balles) if (b.vive) {
          b.u += b.vu * h; b.v += b.vv * h
          const sp = Math.hypot(b.vu, b.vv); if (sp > 0) { const ns = Math.max(0, sp - this.A * h); b.vu *= ns / sp; b.vv *= ns / sp }
          if (b.vol > 0) { b.vol -= h; b.h = Math.sin(clamp(b.vol / .35, 0, 1) * PI) * .35 * Math.min(1, sp / 6) } else b.h = 0
        }
        for (let i = 0; i < this.balles.length; i++) for (let j = i + 1; j < this.balles.length; j++) {
          const a = this.balles[i], b = this.balles[j]; if (!a.vive || !b.vive || (a.vol > 0 || b.vol > 0)) continue
          const dx = b.u - a.u, dy = b.v - a.v, d = Math.hypot(dx, dy), mn = a.r + b.r
          if (d < mn && d > 1e-6) {
            const nx = dx / d, ny = dy / d, rv = (b.vu - a.vu) * nx + (b.vv - a.vv) * ny
            const ov = mn - d; a.u -= nx * ov * b.m / (a.m + b.m); a.v -= ny * ov * b.m / (a.m + b.m); b.u += nx * ov * a.m / (a.m + b.m); b.v += ny * ov * a.m / (a.m + b.m)
            if (rv < 0) { const j2 = -(1 + .72) * rv / (1 / a.m + 1 / b.m); a.vu -= j2 * nx / a.m; a.vv -= j2 * ny / a.m; b.vu += j2 * nx / b.m; b.vv += j2 * ny / b.m; if (-rv > .5) bip(900 + Math.random() * 200, .04, 'square', .03) }
          }
        }
      }
      let bouge = false
      for (const b of this.balles) { if (!b.vive) continue
        if (Math.hypot(b.vu, b.vv) > .06) bouge = true
        if (b.u < -.6 || b.u > this.PT.L + .2 || Math.abs(b.v) > this.PT.hl + .05) { b.vive = false; b.me.visible = false; if (b === this.coch) { this.log = 'cochonnet perdu : on recommence' } else this.log = 'boule morte (hors piste)' }
        if (Math.hypot(b.vu, b.vv) < .06) { b.vu = b.vv = 0 }
        this.poser(b) }
      if (!this.coch.vive) { this.etat = 'bilan'; this.bilan = 'Le cochonnet est sorti de la piste.'; this.maj(W) }
      if (this.etat === 'cap' || this.etat === 'force') this.maj(W)
      if (this.etat === 'roule' && !bouge && this.t > .4) {
        this.n++; this.log = ''
        if (this.n >= this.ordre.length) this.finMene(W)
        else if (this.ordre[this.n] === 1) { this.etat = 'boulon'; this.t = 0; this.maj(W) }
        else { this.etat = 'cap'; this.t = 0; this.maj(W) }
      } else if (this.etat === 'boulon' && this.t > 1.1) { this.jouerBoulon(); this.maj(W) }
      // visée
      if (!this.guide) { this.guide = []; for (let i = 0; i < 12; i++) { const d = new THREE.Mesh(new THREE.SphereBufferGeometry(.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff3c8' })); W.scene.add(d); this.guide.push(d) } }
      const vis = this.etat === 'cap' || this.etat === 'force', a = this.etat === 'cap' ? lerp(-.24, .24, tri(this.t / 1.8)) : this.ang
      this.guide.forEach((d, i) => { d.visible = vis; if (vis) { const p = this.pw(.25 + (i + 1) * .5 * Math.cos(a), -.4 + (i + 1) * .5 * Math.sin(a)); d.position.set(p.x, PT.y + .14, p.z) } })
      // Boulon flotte à son poste de lancer
      const bp = this.pw(.0, .9); this.bp = this.bp || W.boulon.position.clone(); this.bp.lerp(V3(bp.x, PT.y + 1.4 + Math.sin(T * 2.2) * .12, bp.z), Math.min(1, dt * 2.5)); W.boulon.position.copy(this.bp)
      // caméra : derrière la ligne, sur l'axe de la piste
      const cen = this.pw(3.0, 0); W.look.lerp(V3(cen.x, PT.y + .4, cen.z), Math.min(1, dt * 3)); W.dist += (9.5 - W.dist) * Math.min(1, dt * 3); W.pitch += (.78 - W.pitch) * Math.min(1, dt * 3); W.yaw = aj(W.yaw, 0, Math.min(1, dt * 3))
    },
    finMene(W) {
      const c = this.coch, vives = this.balles.filter((b) => b.team >= 0 && b.vive), d = (b) => Math.hypot(b.u - c.u, b.v - c.v)
      const meilleur = (t) => Math.min(1e9, ...vives.filter((b) => b.team === t).map(d)), m0 = meilleur(0), m1 = meilleur(1)
      this.etat = 'bilan'
      if (m0 === 1e9 && m1 === 1e9) { this.log = 'mène nulle'; this.bilan = 'Aucune boule en jeu.' }
      else {
        const gagnant = m0 < m1 ? 0 : 1, adv = gagnant ? m0 : m1, pts = vives.filter((b) => b.team === gagnant && d(b) < adv).length
        this.tally[gagnant]++; this.log = gagnant === 0 ? 'tu gagnes la mène !' : 'Boulon gagne la mène'
        this.bilan = `<b>${gagnant === 0 ? 'Dylan' : 'Boulon'}</b> marque ${pts} point${pts > 1 ? 's' : ''} · boule la plus proche à ${(Math.min(m0, m1) * 100).toFixed(0)} cm`
        if (gagnant === 0) { bip(700, .12); setTimeout(() => bip(880, .15), 140); if (W.fx) W.fx.burst(W.dylan.position.clone().add(V3(0, 2, 0)), 16) }
      }
      this.maj(W)
    },
    quitter(W) { this.meshes && this.meshes.forEach((m) => W.scene.remove(m)); this.meshes = []; this.balles = []; this.guide && this.guide.forEach((d) => { d.visible = false }); panneau.cacher() }
  }

  /* ====================================================================== JEU 3 : lanternes des vœux */
  const VOEUX = [
    { t: 'Je signale chaque situation dangereuse', n: 'C’est l’identification des dangers (§6.1.2) : un risque signalé est un risque traité avant l’accident.' },
    { t: 'Je porte mes EPI, sans exception', n: 'Dernier recours après élimination et protection collective (§8.1.2), mais toujours porté : gilet, casque, chaussures.' },
    { t: 'J’écoute mes collègues avant d’agir', n: 'La consultation et la participation des travailleurs (§5.4) : le terrain connaît les vrais risques.' }
  ]
  const lanternes = {
    demarrer(W, J) {
      if (jeu) return
      jeu = this; this.etat = 'choix'; J.vit = 0; J.ang = PI; J.x = LNC.x; J.z = LNC.z + 1.2; J.y = LNC.y
      panneau.montrer('Lanternes des vœux', 'Choisis ton engagement, la lanterne l’emportera dans le ciel.', {})
      const quoi = typeof say === 'function' ? say('boulon', '<b>Un vœu de sécurité</b> : quel engagement veux-tu confier à la lanterne ?', { btns: VOEUX.map((v, i) => ({ t: v.t, v: i })), cls: '', grid: false }) : Promise.resolve(0)
      quoi.then((i) => { if (jeu !== this) return; this.lancer(W, J, i | 0) })
    },
    lancer(W, J, i) {
      clipT = .9; bip(520, .1); setTimeout(() => bip(660, .12), 160)
      const g = Q._faireLanterne(i); g.userData.vol = 1; g.userData.t0 = 0; g.userData.depart = V3(LNC.x, LNC.y + 1.4, LNC.z); g.position.copy(g.userData.depart)
      const memo = mem.lire('voeux', []); memo.push({ i, t: Date.now() }); mem.ecrire('voeux', memo.slice(-60))
      this.etat = 'envol'; this.t = 0
      if (W.fx) W.fx.burst(V3(LNC.x, LNC.y + 2.2, LNC.z), 12)
      panneau.montrer('Vœu envolé', VOEUX[i].t, { sous: VOEUX[i].n })
      this.fin = 5.5
    },
    appui() {},
    tick(dt, T, W, J) { J.vit = 0; J.ang = PI; this.t += dt
      if (this.etat === 'envol') { W.look.lerp(V3(LNC.x + 8, 9, LNC.z - 10), Math.min(1, dt * 1.5)); W.dist += (16 - W.dist) * Math.min(1, dt * 2); W.pitch += (.25 - W.pitch) * Math.min(1, dt * 2); W.yaw = aj(W.yaw, PI - .6, Math.min(1, dt * 2))
        if (this.t > this.fin) { jeu = null; panneau.cacher(); W.camLoisir = false } } },
    quitter() { panneau.cacher(); if (this.etat === 'choix' && typeof hidePanel === 'function') hidePanel() }
  }

  /* ====================================================================== sieste dans le hamac */
  const sieste = { on: false, t: 0, demarrer() { this.on = true; this.t = 0; bip(300, .2, 'sine', .03) }, fin(W) { this.on = false; panneau.sommeil(0)
      if (typeof say === 'function') say('boulon', '<b>Réveil en douceur.</b> La fatigue est un danger comme un autre : une pause bien placée évite l’erreur de fin de poste. <i>(ISO 45001, §6.1.2)</i> Allez, l’audit ne va pas se faire tout seul !', { btns: [] }) } }

  /* ====================================================================== intégration : appelée à chaque image par talas-quai-vie.js */
  Q.loisirToucher = function (appui, proche, fige, modal) {
    if (jeu) { if (appui) jeu.appui(); return !!appui }
    if (!appui || fige || modal || proche >= 0) return false
    const J = W0 && W0.joueur; if (!J) return false
    if (J.assis) { if (J.assis.hamac && !sieste.on) { sieste.demarrer(); return true } return false }
    const st = stationProche(J); if (st) { st.demarrer(W0, J); return true }
    return false
  }
  Q.loisirTick = function (dt, T, J, W, veut) {
    W0 = W
    if (clipT > 0) clipT -= dt
    // manche à air (tournée dans le sens du vent) et ballons-cibles (ils flottent, grossissent quand on les traverse)
    if (Q._manche) { const m = Q._manche, but = VENT.x >= 0 ? 0 : PI; let d = but - m.rotation.y; while (d > PI) d -= TAU; while (d < -PI) d += TAU; m.rotation.y += d * Math.min(1, dt * 2); m.children[0].rotation.z = -PI / 2 + .9 * (1 - clamp(Math.abs(VENT.x) / 1.8, 0, 1)) + Math.sin(T * 5) * .04 }
    for (const t of (Q._cibles || [])) { t.g.position.y = t.h0 + Math.sin(T * .8 + t.ph) * .18; t.g.position.x = t.x + Math.sin(T * .3 + t.ph) * .25; t.flash = Math.max(0, t.flash - dt * 2); t.ring.scale.setScalar(1 + .3 * t.flash) }
    // lanternes du ciel des vœux
    const nuit = W.etat && W.etat.x ? W.etat.x.night : 0
    for (const g of (Q.cielVoeux || [])) { const u = g.userData
      if (u.vol) { u.t0 = (u.t0 || 0) + dt; const k = clamp(u.t0 / 16, 0, 1), e = k * k * (3 - 2 * k); const fin = u.base; g.position.set(lerp(u.depart.x, fin.x, e) + Math.sin(u.t0 * .8) * .6 * (1 - k), lerp(u.depart.y, fin.y, e), lerp(u.depart.z, fin.z, e)); if (k >= 1) u.vol = 0 }
      else g.position.set(u.base.x + Math.sin(T * .15 + u.ph) * 1.2, u.base.y + Math.sin(T * .4 + u.ph) * .5, u.base.z + Math.cos(T * .13 + u.ph) * 1.0)
      u.halo.material.opacity = .08 + .7 * nuit; g.rotation.y = T * .2 + u.ph }
    // sieste
    if (J.assis && J.assis.hamac) {
      W.dylan.rotation.order = 'YXZ'; W.dylan.rotation.x = J.assis.penche || -.5
      if (sieste.on) { sieste.t += dt; panneau.sommeil(sieste.t < 5.5 ? .88 : 0); if (!W.heureFixe) W.heure += .30 / 6 * dt * (sieste.t < 5.5 ? 1 : 0)
        if (sieste.t > 6.6) sieste.fin(W) }
    } else { if (W.dylan.rotation.x) { W.dylan.rotation.x = 0 }; if (sieste.on) { sieste.fin(W) } }
    // jeu en cours : une direction le quitte ; sinon il pilote caméra et animations
    if (jeu) {
      if (veut) { const j = jeu; jeu = null; if (j.quitter) j.quitter(W); W.camLoisir = false; return }
      W.camLoisir = true; jeu.tick(dt, T, W, J, veut)
    } else if (W.camLoisir) W.camLoisir = false
  }
})()

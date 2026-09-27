/* Direction artistique « Panthère » du parcours (hangar d'assemblage) — d'après Pink Panther : Pinkadelic Pursuit (PS1),
 * niveau « The Construction Site ». Script classique, chargé avant le jeu ; aucune image : tout est peint sur canvas.
 *
 * Principe : les textures procédurales du parcours (PTD[clé] = [largeur, hauteur, peintre]) sont repeintes sous les
 * mêmes clés, donc la jouabilité, les collisions et le level design ne changent pas. Voir tools/forge/DA-panthere.md.
 *   ?da=classique  -> ancienne direction (comparaison)      ?da=panthere -> forcer celle-ci
 *
 * Grammaire visuelle retenue :
 *  - fond : ciel cyan uni + ligne d'horizon monochrome bleue (hangars, tour, grues, palmiers de l'île), fenêtres en tirets ;
 *  - sol : bleu saturé peint à grands coups de brosse horizontaux, aucune texture « réaliste » ;
 *  - matières peintes : planches orange à nœuds, brique rouge à coulures de mortier crème, plâtre moucheté pêche ;
 *  - faces du dessous et flancs tirés vers le bordeaux (lumière hémisphère sol rose-bordeaux) ;
 *  - rien n'est droit, pas de contour encre sur le décor, grain léger façon texture PS1 agrandie. */
(function () {
  const q = location.search.match(/[?&]da=([a-z]+)/)
  const on = q ? q[1] !== 'classique' : window.TALAS_DA_DEFAUT !== 'classique'

  /* palette relevée sur la vidéo de référence (tools/forge/out/ref-pink) */
  const C = {
    ciel: '#86c6e4', cielHaut: '#6db6e2', ville: '#2e72d2', villeLoin: '#5aa7ea', villeFen: '#7cc3f4', brume: '#a6d8f0',
    sol: '#0e91d7', solClair: '#3aa8ea', solFonce: '#0a74b4', solTrait: '#6cc4f2',
    planche: '#eea34c', plancheClair: '#f3b866', plancheFonce: '#d88a3a', veine: '#a45c22', noeud: '#7a3f14',
    brique: '#c14120', briqueFonce: '#9e3216', briqueClair: '#d8572e', joint: '#e98a5c', creme: '#f6e1b7',
    platre: '#e8b99a', platreFonce: '#cb8a75', pilier: '#d6b98e', bordeaux: '#561c22', saumon: '#e6753b',
    caisse: '#c16e26', rose: '#f58ab4', roseVif: '#fea0e7', jaune: '#f7b928', acier: '#6c73a6', acierClair: '#9aa2d4',
  }

  /* ---------- outils de peinture ---------- */
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }
  function brush(x, X, Y, L, ang, width, col) { // coup de brosse effilé
    x.save(); x.translate(X, Y); x.rotate(ang); x.fillStyle = col; x.beginPath()
    x.moveTo(0, 0); x.quadraticCurveTo(L * .5, -width, L, 0); x.quadraticCurveTo(L * .5, width * .6, 0, 0); x.fill(); x.restore()
  }
  function strokes(x, w, h, R, n, cols, len, wid, ang = 0, jit = .12) {
    for (let i = 0; i < n; i++) brush(x, R() * w, R() * h, len * (.5 + R()), ang + (R() - .5) * jit, wid * (.5 + R()), cols[Math.floor(R() * cols.length)])
  }
  function speckle(x, w, h, R, n, cols, s = 2) {
    for (let i = 0; i < n; i++) { x.fillStyle = cols[Math.floor(R() * cols.length)]; const r = s * (.4 + R()); x.beginPath(); x.ellipse(R() * w, R() * h, r, r * (.6 + R() * .5), R() * 3, 0, 7); x.fill() }
  }
  function wobbleLine(x, x0, y0, x1, y1, R, amp = 2, step = 14) { // trait tremblé
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / step)); x.beginPath(); x.moveTo(x0, y0)
    for (let i = 1; i <= n; i++) { const t = i / n; x.lineTo(x0 + (x1 - x0) * t + (R() - .5) * amp, y0 + (y1 - y0) * t + (R() - .5) * amp) } x.stroke()
  }
  const wrap = (w, X, f) => { f(X); if (X < w * .25) f(X + w); if (X > w * .75) f(X - w) } // motifs raccordables à droite/gauche

  /* ---------- planches (plateformes, rampes, palissades) ---------- */
  function planks(x, w, h, R, n, vertical) {
    const cols = [C.planche, C.plancheClair, '#e99a42', '#f0ad58']
    for (let i = 0; i < n; i++) {
      const a = i * (vertical ? w : h) / n, b = (i + 1) * (vertical ? w : h) / n, s = b - a
      x.fillStyle = cols[Math.floor(R() * cols.length)]
      vertical ? x.fillRect(a, 0, s, h) : x.fillRect(0, a, w, s)
      // veinage en longues ondulations
      x.strokeStyle = rgba(C.veine, .35); x.lineWidth = 1.4
      for (let k = 0; k < 4; k++) {
        const o = a + s * (.15 + R() * .7)
        vertical ? wobbleLine(x, o, 0, o + (R() - .5) * 8, h, R, 3, 20) : wobbleLine(x, 0, o, w, o + (R() - .5) * 8, R, 3, 20)
      }
      // nœuds : ellipses concentriques brun foncé
      for (let k = 0; k < (R() < .7 ? 1 : 2); k++) {
        const kx = vertical ? a + s / 2 + (R() - .5) * s * .3 : R() * w, ky = vertical ? R() * h : a + s / 2 + (R() - .5) * s * .3
        x.strokeStyle = rgba(C.noeud, .7); x.lineWidth = 1.6
        for (let r = 2; r < s * .28; r += 3) { x.beginPath(); vertical ? x.ellipse(kx, ky, r * .6, r * 1.7, 0, 0, 7) : x.ellipse(kx, ky, r * 1.7, r * .6, 0, 0, 7); x.stroke() }
      }
      // jour sombre entre planches + lumière sur l'arête haute
      x.fillStyle = rgba(C.noeud, .75); vertical ? x.fillRect(a, 0, 2.5, h) : x.fillRect(0, a, w, 2.5)
      x.fillStyle = 'rgba(255,240,200,.35)'; vertical ? x.fillRect(a + 3, 0, 2, h) : x.fillRect(0, a + 3, w, 2)
      // clous aux extrémités
      x.fillStyle = '#5a3a20'
      ;(vertical ? [8, h - 8] : [8, w - 8]).forEach((p) => { x.beginPath(); vertical ? x.arc(a + s / 2 - 5, p, 2, 0, 7) : x.arc(p, a + s / 2 - 5, 2, 0, 7); x.fill(); x.beginPath(); vertical ? x.arc(a + s / 2 + 5, p, 2, 0, 7) : x.arc(p, a + s / 2 + 5, 2, 0, 7); x.fill() })
    }
    strokes(x, w, h, R, w * h / 1400, ['rgba(255,235,190,.16)', rgba(C.veine, .1)], 40, 3, vertical ? Math.PI / 2 : 0)
  }

  /* ---------- fond : ciel + ligne d'horizon de l'île, monochrome bleu ---------- */
  function skyline(x, w, h, R) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, C.cielHaut); g.addColorStop(.55, C.ciel); g.addColorStop(1, C.brume)
    x.fillStyle = g; x.fillRect(0, 0, w, h)
    strokes(x, w, h * .5, R, 40, ['rgba(255,255,255,.08)', 'rgba(60,140,200,.06)'], 120, 8, 0, .05) // ciel peint
    const base = h * .9
    // plan lointain : hangars à toit courbe, grues, dérive d'avion
    x.fillStyle = C.villeLoin
    for (let X = 0; X < w; X += 90 + R() * 70) wrap(w, X, (X) => {
      const bw = 80 + R() * 110, bh = 110 + R() * 120
      x.beginPath(); x.moveTo(X, base); x.lineTo(X, base - bh); x.quadraticCurveTo(X + bw / 2, base - bh - 34, X + bw, base - bh); x.lineTo(X + bw, base); x.fill()
    })
    ;[w * .18, w * .63].forEach((X) => wrap(w, X, (X) => { // grues à tour
      x.fillRect(X, base - 330, 10, 330); x.fillRect(X - 80, base - 332, 220, 9); x.fillRect(X + 2, base - 366, 6, 36)
      x.strokeStyle = C.villeLoin; x.lineWidth = 2; x.beginPath(); x.moveTo(X + 115, base - 326); x.lineTo(X + 115, base - 250); x.stroke()
    }))
    wrap(w, w * .42, (X) => { x.beginPath(); x.moveTo(X, base - 70); x.lineTo(X + 30, base - 210); x.lineTo(X + 62, base - 210); x.lineTo(X + 70, base - 70); x.fill() })
    // plan proche : bâtiments de l'île, tour de contrôle, antennes, palmiers — bleu soutenu à fenêtres en tirets
    x.fillStyle = C.ville
    const blocks = []
    for (let X = -10; X < w; X += 34 + R() * 60) {
      const bw = 36 + R() * 70, bh = 120 + R() * 200; blocks.push([X, bw, bh])
      wrap(w, X, (X) => {
        x.fillStyle = C.ville; x.beginPath(); x.moveTo(X, base); x.lineTo(X + (R() - .5) * 4, base - bh)
        if (R() < .35) x.quadraticCurveTo(X + bw / 2, base - bh - bw * .5, X + bw, base - bh); else x.lineTo(X + bw + (R() - .5) * 4, base - bh)
        x.lineTo(X + bw, base); x.fill()
        if (R() < .45) { x.fillRect(X + bw * .45, base - bh - 26, 3, 26); x.fillRect(X + bw * .3, base - bh - 30, bw * .3, 3) } // antenne
        if (R() < .25) { x.fillRect(X + bw * .2, base - bh - 16, bw * .5, 14) } // panneau publicitaire
        x.fillStyle = C.villeFen // fenêtres : quelques colonnes de tirets, pas une grille
        const cols = 1 + Math.floor(R() * 3)
        for (let c = 0; c < cols; c++) {
          const xx = X + bw * (c + .5) / cols - 3
          for (let yy = base - bh + 18 + R() * 10; yy < base - 20; yy += 10 + R() * 6) if (R() < .75) x.fillRect(xx + (R() - .5) * 2, yy, 6, 3)
        }
      })
    }
    wrap(w, w * .82, (X) => { // tour de contrôle de Talas
      x.fillStyle = C.ville; x.fillRect(X, base - 350, 30, 350); x.beginPath(); x.moveTo(X - 26, base - 350); x.lineTo(X + 56, base - 350); x.lineTo(X + 44, base - 392); x.lineTo(X - 14, base - 392); x.fill()
      x.fillRect(X - 4, base - 410, 38, 18); x.fillRect(X + 13, base - 440, 4, 30); x.fillStyle = C.villeFen; x.fillRect(X - 16, base - 385, 60, 9)
    })
    for (let i = 0; i < 7; i++) wrap(w, R() * w, (X) => { // palmiers de l'île
      const H = 80 + R() * 70, lean = (R() - .5) * 30; x.strokeStyle = C.ville; x.lineWidth = 5; x.beginPath(); x.moveTo(X, base); x.quadraticCurveTo(X + lean * .3, base - H * .6, X + lean, base - H); x.stroke()
      x.fillStyle = C.ville; for (let k = 0; k < 6; k++) brush(x, X + lean, base - H, 34 + R() * 12, -Math.PI + k * Math.PI / 5 + (R() - .5) * .2, 7, C.ville)
    })
    // brume de pied et sol bleu : raccord avec le sol du niveau
    const b = x.createLinearGradient(0, base - 60, 0, base); b.addColorStop(0, rgba(C.brume, 0)); b.addColorStop(1, rgba(C.brume, .75)); x.fillStyle = b; x.fillRect(0, base - 60, w, 60)
    x.fillStyle = C.sol; x.fillRect(0, base, w, h - base); strokes(x, w, h - base, R, 30, [C.solClair, C.solFonce], 90, 3, 0, .04)
    speckle(x, w, base, R, 900, ['rgba(255,255,255,.05)', 'rgba(20,60,140,.05)'], 1.6) // grain PS1
  }

  /* ---------- peintres ---------- */
  const P = {
    /* sol bleu peint à la brosse ; l'allée piétonne jaune reste (ISO 45001), en bandes peintes irrégulières */
    floor: [512, 512, (x, w, h, R) => {
      x.fillStyle = C.sol; x.fillRect(0, 0, w, h)
      strokes(x, w, h, R, 140, [C.solClair, C.solFonce, rgba(C.solTrait, .7)], 110, 5, 0, .06)
      x.strokeStyle = rgba(C.solTrait, .55); x.lineWidth = 2.2; for (let i = 0; i < 16; i++) { const Y = R() * h; wobbleLine(x, R() * w * .5, Y, R() * w * .5 + 120 + R() * 200, Y + (R() - .5) * 6, R, 3, 18) }
      ;[.26, .74].forEach((v) => { x.fillStyle = C.jaune; for (let X = 0; X < w; X += 64) { x.save(); x.translate(X, v * h); x.rotate((R() - .5) * .03); x.fillRect(0, -6, 60, 12); x.restore() } })
      speckle(x, w, h, R, 400, ['rgba(255,255,255,.06)', 'rgba(0,40,90,.07)'], 1.5)
    }],
    floor2: [512, 256, (x, w, h, R) => { x.fillStyle = C.solFonce; x.fillRect(0, 0, w, h); strokes(x, w, h, R, 60, [C.sol, rgba(C.solTrait, .5)], 120, 4, 0, .04) }],
    wood: [256, 256, (x, w, h, R) => planks(x, w, h, R, 4, false)],
    crate: [256, 256, (x, w, h, R) => {
      x.fillStyle = C.caisse; x.fillRect(0, 0, w, h); planks(x, w, h, R, 5, true)
      x.fillStyle = rgba(C.caisse, .45); x.fillRect(0, 0, w, h)
      x.strokeStyle = C.noeud; x.lineWidth = 18; x.strokeRect(9, 9, w - 18, h - 18)
      x.fillStyle = C.plancheFonce; [[0, 0], [w - 26, 0], [0, h - 26], [w - 26, h - 26]].forEach(([a, b]) => x.fillRect(a + 4, b + 4, 18, 18))
      x.lineWidth = 16; x.strokeStyle = C.plancheFonce; wobbleLine(x, 16, 16, w - 16, h - 16, R, 2)
      x.save(); x.translate(w / 2, h / 2); x.rotate(-.08); x.fillStyle = rgba(C.bordeaux, .85); x.textAlign = 'center'
      x.font = '34px "Luckiest Guy", sans-serif'; x.fillText('A320', 0, -14); x.font = '22px "Luckiest Guy", sans-serif'; x.fillText('FRAGILE', 0, 26); x.restore()
    }],
    /* tronçons de fuselage : apprêt vert anis conservé, mais en aplats peints et rivets à la main */
    skin: [512, 256, (x, w, h, R) => {
      x.fillStyle = '#9fd05a'; x.fillRect(0, 0, w, h); strokes(x, w, h, R, 90, ['#b6e070', '#86bd45', 'rgba(255,255,255,.15)'], 90, 7, 0, .08)
      x.strokeStyle = 'rgba(60,100,30,.55)'; x.lineWidth = 2
      for (let X = 0; X < w; X += 64) wobbleLine(x, X, 0, X + (R() - .5) * 4, h, R, 2)
      for (let Y = 32; Y < h; Y += 64) wobbleLine(x, 0, Y, w, Y + (R() - .5) * 4, R, 2)
      x.fillStyle = 'rgba(50,80,25,.55)'; for (let X = 6; X < w; X += 11) for (let Y = 32; Y < h; Y += 64) { x.beginPath(); x.arc(X, Y - 5, 1.3, 0, 7); x.fill() }
      for (let X = 16; X < w; X += 42) { x.fillStyle = C.ville; x.beginPath(); x.ellipse(X + 10, h * .43, 9, 13, (R() - .5) * .2, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(X + 5, h * .43 - 9, 3, 7) }
    }],
    /* poutrelles : acier bleu-violet mat, rivets ronds, bords éclaircis à la brosse */
    steel: [256, 64, (x, w, h, R) => {
      x.fillStyle = C.acier; x.fillRect(0, 0, w, h); strokes(x, w, h, R, 30, [C.acierClair, '#565c8c'], 60, 3, 0, .05)
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 3, w, 4); x.fillStyle = 'rgba(30,20,60,.3)'; x.fillRect(0, h - 6, w, 6)
      for (let X = 12; X < w; X += 24) [13, h - 13].forEach((Y) => { x.fillStyle = '#3c3f66'; x.beginPath(); x.arc(X, Y, 4.5, 0, 7); x.fill(); x.fillStyle = C.acierClair; x.beginPath(); x.arc(X - 1, Y - 1, 2, 0, 7); x.fill() })
    }],
    /* garde-corps et montants : jaune sécurité mais peint, pas plastique */
    yellow: [256, 64, (x, w, h, R) => {
      x.fillStyle = C.jaune; x.fillRect(0, 0, w, h); strokes(x, w, h, R, 40, ['#ffd45a', '#dd9a18'], 50, 4, 0, .06)
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 5, w, 3); speckle(x, w, h, R, 60, ['rgba(140,70,0,.3)'], 1.4)
    }],
    hazard: [128, 32, (x, w, h, R) => {
      x.fillStyle = C.jaune; x.fillRect(0, 0, w, h); x.fillStyle = '#2a1a2e'
      for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 16 + R() * 2, h); x.lineTo(i * 16 + 8, h); x.lineTo(i * 16 + 8 + h, 0); x.lineTo(i * 16 + h + R() * 2, 0); x.fill() }
    }],
    /* plateformes : plancher de chantier en planches (la tôle larmée disparaît) */
    checker: [256, 256, (x, w, h, R) => planks(x, w, h, R, 4, true)],
    /* volumes bâtis : brique rouge peinte, joints clairs, coulures de mortier crème en tête de mur */
    cladding: [256, 256, (x, w, h, R) => {
      x.fillStyle = C.joint; x.fillRect(0, 0, w, h)
      const bh = 16, bw = 42
      for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) {
        const X = c * bw + (r % 2 ? bw / 2 : 0), Y = r * bh
        x.fillStyle = [C.brique, C.briqueFonce, C.briqueClair, C.brique][Math.floor(R() * 4)]
        x.fillRect(X + 2 + (R() - .5), Y + 2, bw - 4 + (R() - .5) * 2, bh - 4)
        x.fillStyle = 'rgba(255,200,160,.18)'; x.fillRect(X + 3, Y + 2.5, bw - 8, 2)
      }
      strokes(x, w, h, R, 50, ['rgba(120,20,0,.12)', 'rgba(255,180,140,.1)'], 70, 6, 0, .05)
      x.fillStyle = C.creme; x.fillRect(0, 0, w, 12) // coulures
      for (let X = 0; X < w; X += 10 + R() * 18) { const L = 6 + R() * 24; x.beginPath(); x.moveTo(X, 10); x.lineTo(X + 6, 10); x.lineTo(X + 4, 10 + L); x.arc(X + 3, 10 + L, 3, 0, Math.PI); x.fill() }
    }],
    /* palissade de chantier (cloisons de zone) : planches verticales à nœuds, traverses, ombre bordeaux en pied */
    fence: [128, 256, (x, w, h, R) => {
      planks(x, w, h, R, 3, true)
      x.fillStyle = C.plancheFonce; x.fillRect(0, h * .22, w, 10); x.fillRect(0, h * .78, w, 10) // traverses
      const g = x.createLinearGradient(0, h * .8, 0, h); g.addColorStop(0, 'rgba(86,28,34,0)'); g.addColorStop(1, 'rgba(86,28,34,.35)'); x.fillStyle = g; x.fillRect(0, h * .8, w, h * .2)
    }],
    /* cloisons et murs : plâtre pêche moucheté */
    concrete: [256, 256, (x, w, h, R) => {
      x.fillStyle = C.platre; x.fillRect(0, 0, w, h)
      for (let i = 0; i < 18; i++) { const X = R() * w, Y = R() * h, r = 30 + R() * 70, g = x.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, rgba(R() < .5 ? C.platreFonce : '#f7d4bb', .45)); g.addColorStop(1, rgba(C.platre, 0)); x.fillStyle = g; x.fillRect(X - r, Y - r, 2 * r, 2 * r) }
      speckle(x, w, h, R, 700, [rgba(C.bordeaux, .35), 'rgba(255,255,255,.35)', rgba(C.platreFonce, .6)], 1.3)
    }],
    /* carrelage du magasin EPI : damier rose et vert peint, carreaux de travers */
    check: [256, 256, (x, w, h, R) => {
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { x.fillStyle = (r + c) % 2 ? '#43a36a' : C.rose; x.save(); x.translate(c * 32 + 16, r * 32 + 16); x.rotate((R() - .5) * .05); x.fillRect(-15, -15, 30, 30); x.restore() }
      strokes(x, w, h, R, 40, ['rgba(255,255,255,.12)'], 50, 3)
    }],
    hangar: [1024, 512, skyline],
    sky: [256, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, C.cielHaut); g.addColorStop(1, C.ciel); x.fillStyle = g; x.fillRect(0, 0, w, h) }],
  }

  /* réglages de scène lus par buildPlatformer (fond, brume, lumières) */
  const scene = {
    fog: [C.brume, 70, 170],
    hemi: ['#fff8ee', '#b8566e', 1.0], // sol rose-bordeaux : dessous et flancs virent au bordeaux comme dans la référence
    sun: ['#fff3dd', .5],
    skipHangarPhoto: true, // la photo hangar-fond.jpg remplaçait la texture peinte
    skipRays: true, // rayons de verrière : on est dehors
  }

  /* ---------- personnages « dessin animé » (Dylan, ouvriers, Georges, Bernard, Aurelien, chien) ----------
     Comme dans la référence : aplats francs (deux tons seulement), trait d'encre fin et sombre autour de chaque volume,
     jambes et bras allongés, silhouette plus fine, grands yeux. La forme est modifiée par le squelette du jeu
     (hanches, épaules, buste), jamais les nœuds que le jeu anime lui-même (pose.position). */
  const INK = '#2b1623'
  let GRAD2 = null, INKMAT = null
  const MATS = {}
  function grad2() {
    if (GRAD2) return GRAD2
    const cv = document.createElement('canvas'); cv.width = 2; cv.height = 1; const x = cv.getContext('2d')
    x.fillStyle = '#c4b4c4'; x.fillRect(0, 0, 1, 1); x.fillStyle = '#ffffff'; x.fillRect(1, 0, 1, 1) // ombre légèrement mauve, lumière blanche
    GRAD2 = new THREE.CanvasTexture(cv); GRAD2.minFilter = GRAD2.magFilter = THREE.NearestFilter; GRAD2.generateMipmaps = false; return GRAD2
  }
  function inkMat() { // coque inversée gonflée le long des normales : trait d'épaisseur constante, même sur les formes fines
    if (INKMAT) return INKMAT
    INKMAT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
    INKMAT.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.028;') }
    INKMAT.customProgramCacheKey = () => 'encre-panthere'
    return INKMAT
  }
  const flatMat = (col) => MATS[col] || (MATS[col] = new THREE.MeshToonMaterial({ color: col, gradientMap: grad2() }))
  function cartoon(obj, kind) {
    // rappelable : les EPI portés en cours de partie sont redessinés au moment où Dylan les enfile
    if (!window.TALAS_DA.on || !obj) return obj
    const skip = /pupil|mouth|ember|mouthO|mouthS/
    const hulls = []
    obj.traverse((o) => {
      if (!o.isMesh || o.userData.ink || o.children.some((c) => c.userData.ink)) return
      const m = o.material; if (!m || Array.isArray(m)) return
      if (m.isMeshBasicMaterial && !m.map) return // parties non éclairées (braise du cigare, pupilles) : telles quelles
      if (m.transparent || (m.map && m.alphaTest)) return
      const col = '#' + m.color.getHexString()
      o.material = flatMat(col); o.material.userData.character = 1
      const role = (o.name.split('__')[1] || '').replace(/\.\d+$/, '')
      if (!skip.test(role) && o.geometry.attributes.normal) hulls.push(o)
    })
    hulls.forEach((o) => { const h = new THREE.Mesh(o.geometry, inkMat()); h.userData.ink = 1; h.castShadow = false; h.renderOrder = -1; o.add(h) })
    // proportions façon cartoon des années 60 : sur le squelette Blender des personnages Talas
    const rig = obj.userData.rig
    if (rig && rig.glb && rig.pose && rig.pose.parent && !obj.userData.cartoonRig) {
      obj.userData.cartoonRig = 1
      const LEG = kind === 'bernard' ? 1.12 : 1.24, ARM = 1.14
      ;(rig.hips || []).forEach((h) => h && (h.scale.y *= LEG))
      ;(rig.shs || []).forEach((h) => h && (h.scale.y *= ARM))
      rig.pose.parent.position.y += (LEG - 1) * 1.0 // jambes plus longues : le corps monte d'autant (hanches à 1,0 dans le repère du modèle)
      if (rig.up) { rig.up.scale.x *= .9; rig.up.scale.z *= .9 }
      // grands yeux : le blanc et sa pupille sont agrandis ensemble autour du centre de l'œil (leur géométrie est exprimée
      // dans le repère de la tête : un simple scale les ferait avancer et le blanc avalerait la pupille)
      ;['L', 'R'].forEach((sd) => {
        const white = obj.getObjectByName(`eye_${sd}__white`), pupil = obj.getObjectByName(`pupil_${sd}__pupil`)
        if (!white || !white.geometry) return
        // le jeu anime lui-même l'échelle des yeux (clignement) : on n'y touche pas. Un pivot intermédiaire, posé au centre de l'œil,
        // porte le blanc et sa pupille ; c'est lui qu'on agrandit, le clignement continue de jouer à l'intérieur
        white.geometry.computeBoundingBox(); const c = white.geometry.boundingBox.getCenter(new THREE.Vector3()), k = 1.2
        const head = white.parent, piv = new THREE.Group(); piv.name = `oeil_${sd}`; piv.position.copy(c); piv.scale.setScalar(k); head.add(piv)
        ;[white, pupil].forEach((o) => { if (!o) return; head.remove(o); o.position.sub(c); piv.add(o) })
        if (pupil) { pupil.position.z += .003; pupil.renderOrder = 2 } // la pupille reste devant le blanc
      })
    }
    return obj
  }
  /* ---------- décor : flancs et dessous tirés vers le bordeaux, faces tournées vers la caméra et dessus intacts ---------- */
  function decor(scene) {
    if (!window.TALAS_DA.on) return
    const seen = new Set()
    scene.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return
      const m = o.material
      if (seen.has(m) || m.userData.character || o.userData.ink || !(m.isMeshLambertMaterial || m.isMeshToonMaterial) || m.transparent) return
      seen.add(m)
      const prev = m.onBeforeCompile
      m.onBeforeCompile = (sh, r) => {
        prev && prev.call(m, sh, r)
        sh.vertexShader = 'varying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWN = normalize(mat3(modelMatrix) * normal);')
        sh.fragmentShader = 'varying vec3 vWN;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float sideK = clamp(max(abs(vWN.x) * 1.15 - .15, -vWN.y), 0., 1.);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.62, .34, .40), sideK * .62);`)
      }
      m.customProgramCacheKey = () => 'flanc-panthere'
      m.needsUpdate = true
    })
  }

  window.TALAS_DA = {
    on, name: 'panthere', C, painters: P, scene, cartoon, decor,
    patch(PTD, PT_NOPAINT) {
      // les peintres d'origine sont gardés : set(false) rend l'ancienne direction sans recharger (comparaisons avant/après)
      this.PTD = PTD; this.NOP = PT_NOPAINT; this.orig = { ptd: Object.assign({}, PTD), nop: Object.assign({}, PT_NOPAINT) }
      if (this.on) this.apply()
    },
    apply() { Object.assign(this.PTD, P); this.NOP.hangar = this.NOP.sky = this.NOP.cladding = this.NOP.checker = 1 },
    /* bascule à chaud ; le parcours doit être reconstruit (buildPlatformer) et les caches PT vidés par l'appelant */
    set(v) { if (!this.PTD) return; this.on = !!v; if (v) this.apply(); else { Object.keys(P).forEach((k) => { if (k in this.orig.ptd) this.PTD[k] = this.orig.ptd[k]; else delete this.PTD[k] }); Object.keys(this.NOP).forEach((k) => delete this.NOP[k]); Object.assign(this.NOP, this.orig.nop) } },
  }
})()

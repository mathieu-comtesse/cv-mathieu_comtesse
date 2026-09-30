/* Boîte à outils du « monde peint » du Village Talas. Script classique chargé avant le jeu, après three.js r128.
 *
 *   TALAS_MONDE.alea(graine)           -> générateur pseudo-aléatoire déterministe
 *   TALAS_MONDE.bruit2 / fbm2 / vent   -> bruit et vent : la MÊME fonction en JavaScript et en GLSL (TALAS_MONDE.GLSL.bruit),
 *                                         pour que la fumée (CPU) et l'herbe (GPU) suivent exactement le même vent
 *   TALAS_MONDE.peintre.*              -> textures peintes sur canvas (planches, roche, toit, écorce, corde, toile, enseigne, verre)
 *   TALAS_MONDE.mat.*                  -> matériaux toon (rampe globale du jeu) avec ou sans texture
 *   TALAS_MONDE.particules(opts)       -> particules de fumée/brume/flamme : sprites éclairés par des normales de sphère,
 *                                         un seul état de mélange « add/alpha » (alpha prémultiplié : alpha 0 = additif)
 *   TALAS_MONDE.herbe(opts)            -> herbe à la Ghost of Tsushima : les sommets de chaque lame sont générés dans le
 *                                         shader de sommets à partir de l'indice, vent échantillonné dans le bruit partagé
 *   TALAS_MONDE.brume(scene)           -> recopie la brume de la scène dans les shaders maison
 * Tout est procédural : aucune image, aucun fichier externe. */
(function () {
  const THREE = window.THREE
  if (!THREE) return
  const M = window.TALAS_MONDE = { peintre: {}, mat: {}, GLSL: {} }

  /* ---------------------------------------------------------------- aléa, couleurs */
  M.alea = (graine) => { let s = (graine >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296 }
  const h2r = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
  const r2h = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
  M.melange = (a, b, t) => { const A = h2r(a), B = h2r(b); return r2h(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t) }
  M.clair = (h, k) => (k >= 0 ? M.melange(h, '#ffffff', k) : M.melange(h, '#000000', -k))
  M.rgba = (h, a) => { const c = h2r(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})` }

  /* ---------------------------------------------------------------- bruit partagé CPU / GPU (hachage sans sinus) */
  const fract = (x) => x - Math.floor(x)
  function h21(x, y) {
    let a = fract(x * .1031), b = fract(y * .1031); const c = a
    const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33)
    a += d; b += d
    return fract((a + b) * (c + d))
  }
  function vn(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    const a = h21(ix, iy), b = h21(ix + 1, iy), c = h21(ix, iy + 1), d = h21(ix + 1, iy + 1)
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy
  }
  M.bruit2 = vn
  M.fbm2 = (x, y) => { let s = 0, a = .5; for (let i = 0; i < 4; i++) { s += a * vn(x, y); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; a *= .5 } return s }
  /* vent : direction et force en (x, z, t) ; deux octaves qui défilent */
  M.vent = (x, z, t) => {
    const a = vn(x * .06 + t * .35, z * .06 + t * .1), b = vn(x * .21 - t * .6 + 7.3, z * .21 + t * .4 + 3.1)
    const f = a * .65 + b * .35, ang = (f - .5) * 1.6 + .4, k = .4 + f
    return [Math.cos(ang) * k, Math.sin(ang) * k * .6, f]
  }
  M.GLSL.bruit = `
float twH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float twN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(twH(i), twH(i + vec2(1., 0.)), f.x), mix(twH(i + vec2(0., 1.)), twH(i + vec2(1., 1.)), f.x), f.y); }
vec3 twVent(vec2 p, float t){
  float a = twN(p * .06 + vec2(t * .35, t * .1)), b = twN(p * .21 + vec2(-t * .6 + 7.3, t * .4 + 3.1));
  float f = a * .65 + b * .35, ang = (f - .5) * 1.6 + .4, k = .4 + f;
  return vec3(cos(ang) * k, sin(ang) * k * .6, f); }`

  /* ---------------------------------------------------------------- peinture sur canvas */
  const cache = {}
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')] }
  const tx = (c, o) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (o && o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]); return t }
  function trait(g, x1, y1, x2, y2, w, col, a) { g.globalAlpha = a === undefined ? 1 : a; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.globalAlpha = 1 }
  function tache(g, x, y, rx, ry, col, a, rot) { g.globalAlpha = a === undefined ? 1 : a; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 7); g.fill(); g.globalAlpha = 1 }
  /* répète un tracé décalé d'une période pour que la texture se raccorde à ses bords */
  function enroule(S, fn) { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(dx, dy) }
  const pick = (r, a) => a[(r() * a.length) | 0]
  const memo = (k, f) => cache[k] || (cache[k] = f())

  /* planches de bois : fibres, nœuds, joints, clous, coups de pinceau larges, contour d'encre */
  M.peintre.planches = (o) => {
    o = o || {}
    return memo('planches' + JSON.stringify(o), () => {
      const S = o.taille || 512, n = o.planches || 8, r = M.alea(o.graine || 3), pal = o.pal || ['#8a5e3b', '#7a5232', '#946845', '#6f4a2c']
      const encre = o.encre || '#22121c', bh = S / n
      const [c0, g0] = cv(S, S)
      for (let i = 0; i < n; i++) {
        const y0 = i * bh, base = M.clair(pick(r, pal), (r() - .5) * .14)
        g0.fillStyle = base; g0.fillRect(0, y0, S, bh)
        for (let k = 0; k < 12; k++) { const y = y0 + r() * bh, x = r() * S, L = S * (.25 + r() * .5), cl = r() < .5 ? M.clair(base, .22) : M.clair(base, -.22); enroule(S, (dx) => trait(g0, x + dx, y, x + dx + L, y + (r() - .5) * 5, bh * (.12 + r() * .3), cl, .05 + r() * .09)) }
        for (let k = 0; k < 44; k++) { const y = y0 + 3 + r() * (bh - 6), x = r() * S, L = S * (.15 + r() * .6); enroule(S, (dx) => trait(g0, x + dx, y, x + dx + L, y + (r() - .5) * 7, 1 + r() * 1.6, M.clair(base, -.45), .12 + r() * .2)) }
        if (r() < (o.noeuds === undefined ? .45 : o.noeuds)) {
          const x = r() * S, y = y0 + bh * (.3 + r() * .4), rx = bh * (.12 + r() * .1), ry = rx * .7
          tache(g0, x, y, rx * 1.6, ry * 1.6, M.clair(base, -.18), .55); tache(g0, x, y, rx, ry, M.clair(base, -.45), .85)
          g0.strokeStyle = M.rgba(encre, .6); g0.lineWidth = 2; g0.beginPath(); g0.ellipse(x, y, rx * 1.15, ry * 1.15, 0, 0, 7); g0.stroke()
        }
        const nj = 1 + (r() * 2 | 0)
        for (let j = 0; j < nj; j++) {
          const x = r() * S; trait(g0, x, y0 + 2, x, y0 + bh - 2, 3.4, encre, .9); trait(g0, x + 4, y0 + 3, x + 4, y0 + bh - 3, 2, M.clair(base, .35), .3)
          if (o.clous !== false) [.24, .76].forEach((u) => [-11, 11].forEach((d) => { const cx = x + d, cy = y0 + bh * u; tache(g0, cx, cy, 2.6, 2.6, encre, .9); tache(g0, cx - .8, cy - .8, 1, 1, M.clair(base, .6), .8) }))
        }
        trait(g0, 0, y0 + 1.5, S, y0 + 1.5, 3.2, encre, .92); trait(g0, 0, y0 + 4.5, S, y0 + 4.5, 1.8, M.clair(base, .4), .22)
        trait(g0, 0, y0 + bh - 2, S, y0 + bh - 2, 2.2, M.melange(encre, base, .3), .5)
        if (o.mousse) for (let k = 0; k < o.mousse * 6; k++) { const x = r() * S, y = y0 + bh * (r() < .5 ? .05 : .9); enroule(S, (dx) => tache(g0, x + dx, y, 8 + r() * 26, 3 + r() * 5, pick(r, ['#5f8d3f', '#4d7a35', '#78a04a']), .35 + r() * .3)) }
      }
      for (let k = 0; k < S * S / 90; k++) { g0.fillStyle = r() < .5 ? 'rgba(255,240,210,.05)' : 'rgba(20,10,30,.06)'; g0.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 3) }
      if (!o.vertical) return tx(c0, o)
      const [c1, g1] = cv(S, S); g1.translate(S / 2, S / 2); g1.rotate(Math.PI / 2); g1.drawImage(c0, -S / 2, -S / 2); return tx(c1, o)
    })
  }

  /* roche stratifiée : facettes, coups de pinceau, fissures à l'encre, mousse sur les faces hautes */
  M.peintre.roche = (o) => {
    o = o || {}
    return memo('roche' + JSON.stringify(o), () => {
      const S = o.taille || 512, r = M.alea(o.graine || 11), pal = o.pal || ['#6f6a86', '#5d5878', '#7d7896', '#6a6480']
      const [c, g] = cv(S, S); g.fillStyle = pal[0]; g.fillRect(0, 0, S, S)
      for (let i = 0; i < 260; i++) {
        const x = r() * S, y = r() * S, sz = 26 + r() * 70, n = 5 + (r() * 3 | 0), base = M.clair(pick(r, pal), (r() - .5) * .22)
        enroule(S, (dx, dy) => {
          g.beginPath(); for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + r() * .5, rr = sz * (.55 + r() * .5); g.lineTo(x + dx + Math.cos(a) * rr * 1.25, y + dy + Math.sin(a) * rr * .8) }
          g.closePath(); g.fillStyle = base; g.globalAlpha = .55 + r() * .3; g.fill(); g.globalAlpha = 1; g.strokeStyle = M.rgba('#1c1428', .28 + r() * .3); g.lineWidth = 1.5 + r() * 2; g.stroke()
        })
      }
      for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, L = 14 + r() * 50; enroule(S, (dx, dy) => trait(g, x + dx, y + dy, x + dx + L, y + dy + (r() - .5) * 10, 1 + r() * 2, r() < .5 ? M.clair(pal[0], .3) : '#1c1428', .1 + r() * .18)) }
      if (o.mousse !== 0) for (let i = 0; i < 70; i++) { const x = r() * S, y = r() * S; enroule(S, (dx, dy) => { tache(g, x + dx, y + dy, 8 + r() * 22, 3 + r() * 9, pick(r, o.mousseCouleurs || ['#5c8a3e', '#4a7734', '#6f9a45']), .4 + r() * .3); tache(g, x + dx - 2, y + dy - 2, 4 + r() * 8, 1.5 + r() * 3, '#9bc25e', .22) }) }
      return tx(c, o)
    })
  }

  /* toit de bardeaux : rangées écaillées décalées, ombre sous chaque bardeau */
  M.peintre.toit = (o) => {
    o = o || {}
    return memo('toit' + JSON.stringify(o), () => {
      const S = o.taille || 512, r = M.alea(o.graine || 5), pal = o.pal || ['#5a2f5e', '#6b3a72', '#4d284f', '#7a4680'], rows = o.rangs || 9, sw = S / (o.colonnes || 7), rh = S / rows
      const [c, g] = cv(S, S); g.fillStyle = M.clair(pal[0], -.35); g.fillRect(0, 0, S, S)
      for (let j = -1; j < rows + 1; j++) for (let i = -1; i < (o.colonnes || 7) + 1; i++) {
        const x = i * sw + (j % 2 ? sw / 2 : 0), y = j * rh, base = M.clair(pick(r, pal), (r() - .5) * .18)
        enroule(S, (dx, dy) => {
          g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + sw + dx, y + dy); g.lineTo(x + sw + dx, y + rh * .62 + dy); g.quadraticCurveTo(x + sw / 2 + dx, y + rh * 1.35 + dy, x + dx, y + rh * .62 + dy); g.closePath()
          g.fillStyle = base; g.fill(); g.strokeStyle = M.rgba('#1a0d22', .85); g.lineWidth = 2.4; g.stroke()
          trait(g, x + 5 + dx, y + 5 + dy, x + sw - 6 + dx, y + 5 + dy, 2, M.clair(base, .4), .35); trait(g, x + 8 + dx, y + rh * .5 + dy, x + sw - 8 + dx, y + rh * .5 + dy, 1.4, M.clair(base, -.3), .3)
        })
      }
      return tx(c, o)
    })
  }

  /* écorce : coups de pinceau verticaux, fissures, arêtes claires */
  M.peintre.ecorce = (o) => {
    o = o || {}
    return memo('ecorce' + JSON.stringify(o), () => {
      const S = o.taille || 256, r = M.alea(o.graine || 7), base = o.couleur || '#5d4470'
      const [c, g] = cv(S, S); g.fillStyle = base; g.fillRect(0, 0, S, S)
      for (let i = 0; i < 90; i++) { const x = r() * S, y = r() * S, L = 30 + r() * 110, w = 2 + r() * 8; enroule(S, (dx, dy) => trait(g, x + dx, y + dy, x + dx + (r() - .5) * 6, y + dy + L, w, r() < .55 ? M.clair(base, -.3) : M.clair(base, .25), .18 + r() * .25)) }
      for (let i = 0; i < 26; i++) { const x = r() * S, y = r() * S, L = 30 + r() * 80; enroule(S, (dx, dy) => trait(g, x + dx, y + dy, x + dx + (r() - .5) * 8, y + dy + L, 2.4, '#1c1030', .55)) }
      return tx(c, o)
    })
  }

  /* corde torsadée */
  M.peintre.corde = () => memo('corde', () => {
    const [c, g] = cv(64, 64); g.fillStyle = '#c9b48a'; g.fillRect(0, 0, 64, 64)
    for (let i = -4; i < 12; i++) { g.strokeStyle = '#7a6440'; g.lineWidth = 6; g.beginPath(); g.moveTo(i * 8, 0); g.lineTo(i * 8 + 32, 64); g.stroke(); g.strokeStyle = '#e6d5ac'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 8 + 3, 0); g.lineTo(i * 8 + 35, 64); g.stroke() }
    return tx(c)
  })

  /* toile : tissu écru, trame, taches ; motif optionnel (fantôme de Talas) */
  M.peintre.toile = (o) => {
    o = o || {}
    return memo('toile' + JSON.stringify(o), () => {
      const W = o.largeur || 256, H = o.hauteur || 384, r = M.alea(o.graine || 9), base = o.couleur || '#e9dbb6'
      const [c, g] = cv(W, H); g.fillStyle = base; g.fillRect(0, 0, W, H)
      for (let y = 0; y < H; y += 3) trait(g, 0, y, W, y, 1, M.clair(base, -.3), .07)
      for (let x = 0; x < W; x += 3) trait(g, x, 0, x, H, 1, M.clair(base, -.3), .06)
      for (let i = 0; i < 14; i++) tache(g, r() * W, r() * H, 10 + r() * 40, 8 + r() * 30, M.clair(base, -.35), .08 + r() * .1)
      if (o.motif !== 'aucun') {
        const cx = W / 2, cy = H * .48, s = W * .3
        g.beginPath(); g.moveTo(cx - s, cy + s * 1.9)
        g.bezierCurveTo(cx - s * 1.2, cy - s * .2, cx - s * .9, cy - s * 1.5, cx, cy - s * 1.5)
        g.bezierCurveTo(cx + s * .9, cy - s * 1.5, cx + s * 1.2, cy - s * .2, cx + s, cy + s * 1.9)
        for (let k = 0; k < 4; k++) { const x1 = cx + s - (k + .5) * s * .5, x2 = cx + s - (k + 1) * s * .5; g.quadraticCurveTo(x1, cy + s * (k % 2 ? 1.6 : 2.15), x2, cy + s * 1.9) }
        g.closePath(); g.fillStyle = o.motifCouleur || '#3a2d45'; g.fill(); g.strokeStyle = '#1d1226'; g.lineWidth = 5; g.stroke()
        g.fillStyle = base; ;[-1, 1].forEach((q) => { g.beginPath(); g.ellipse(cx + q * s * .38, cy - s * .55, s * .2, s * .28, q * .15, 0, 7); g.fill() })
        g.fillStyle = '#e7c45a'; ;[-1, 1].forEach((q) => tache(g, cx + q * s * .38, cy - s * .5, s * .06, s * .1, '#e7c45a', 1))
        g.fillStyle = base; g.beginPath(); g.ellipse(cx, cy + s * .05, s * .3, s * .38, 0, 0, 7); g.fill()
        g.fillStyle = '#3a2d45'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * s * .11 - s * .05, cy - s * .12); g.lineTo(cx + k * s * .11, cy + s * .1); g.lineTo(cx + k * s * .11 + s * .05, cy - s * .12); g.fill() }
      }
      g.strokeStyle = M.rgba('#3a2a20', .5); g.lineWidth = 6; g.strokeRect(0, 0, W, H)
      return tx(c, { repeat: [1, 1] })
    })
  }

  /* enseigne : planche sombre, lettres gravées + clair dessous, petite icône de fantôme */
  M.peintre.enseigne = (o) => {
    o = o || {}
    const texte = o.texte || 'TALAS', key = 'enseigne' + JSON.stringify(o)
    const W = o.largeur || 512, H = o.hauteur || 256
    const [c, g] = cv(W, H), r = M.alea(o.graine || 13), fond = o.fond || '#5b3d2e', lettre = o.lettre || '#e9dcb8'
    g.fillStyle = fond; g.fillRect(0, 0, W, H)
    for (let i = 0; i < 26; i++) trait(g, 0, r() * H, W, r() * H + (r() - .5) * 20, 2 + r() * 4, r() < .5 ? M.clair(fond, .18) : M.clair(fond, -.3), .12)
    for (let i = 1; i < 4; i++) trait(g, 0, H * i / 4, W, H * i / 4, 3, '#1e1018', .7)
    const fs = o.police || Math.min(H * .62, W / (texte.length * .78))
    g.font = `${fs}px "Luckiest Guy","Arial Black",Impact,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
    const tx0 = W / 2 + (o.icone ? W * .09 : 0), ty = H / 2
    g.lineJoin = 'round'; g.strokeStyle = 'rgba(15,6,20,.75)'; g.lineWidth = fs * .13; g.strokeText(texte, tx0 + 3, ty + 4)
    g.fillStyle = M.clair(lettre, -.05); g.fillText(texte, tx0, ty); g.globalAlpha = .28; g.fillStyle = '#5a3a2a'; g.fillText(texte, tx0 + 1, ty + 2); g.globalAlpha = 1
    if (o.icone) {
      const ix = W * .16, iy = H * .5, s = H * .26
      g.beginPath(); g.moveTo(ix - s * .8, iy + s * 1.2); g.bezierCurveTo(ix - s * .9, iy - s * 1.3, ix + s * .9, iy - s * 1.3, ix + s * .8, iy + s * 1.2)
      g.quadraticCurveTo(ix + s * .5, iy + s * .8, ix + s * .25, iy + s * 1.2); g.quadraticCurveTo(ix, iy + s * .8, ix - s * .25, iy + s * 1.2); g.quadraticCurveTo(ix - s * .5, iy + s * .8, ix - s * .8, iy + s * 1.2); g.closePath()
      g.fillStyle = lettre; g.fill(); g.strokeStyle = '#1e1018'; g.lineWidth = 4; g.stroke()
      g.fillStyle = '#1e1018'; ;[-1, 1].forEach((q) => tache(g, ix + q * s * .33, iy - s * .1, s * .12, s * .2, '#1e1018', 1)); g.beginPath(); g.ellipse(ix, iy + s * .48, s * .22, s * .16, 0, 0, 7); g.fill()
    }
    g.strokeStyle = '#1e1018'; g.lineWidth = 12; g.strokeRect(0, 0, W, H); g.strokeStyle = M.clair(fond, .25); g.lineWidth = 3; g.strokeRect(9, 9, W - 18, H - 18)
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4
    // les polices web arrivent parfois après le premier dessin : on redessine une fois qu'elles sont prêtes
    if (document.fonts && document.fonts.load && !o._deja) document.fonts.load(`40px "Luckiest Guy"`).then(() => { const p = M.peintre.enseigne(Object.assign({}, o, { _deja: 1 })); t.image = p.image; t.needsUpdate = true }).catch(() => {})
    return t
  }

  /* fenêtre à petits carreaux ; `nuit` : lueur chaude, sinon reflets du ciel */
  M.peintre.fenetre = (o) => {
    o = o || {}
    return memo('fenetre' + JSON.stringify(o), () => {
      const S = 128, [c, g] = cv(S, S), nuit = !!o.nuit
      const gr = g.createLinearGradient(0, 0, 0, S)
      if (nuit) { gr.addColorStop(0, '#ffd27a'); gr.addColorStop(1, '#f08a2c') } else { gr.addColorStop(0, '#a9d8ef'); gr.addColorStop(1, '#5a8fb8') }
      g.fillStyle = gr; g.fillRect(0, 0, S, S)
      if (nuit) { g.fillStyle = 'rgba(70,30,20,.45)'; g.beginPath(); g.arc(S * .3, S * .55, S * .16, 0, 7); g.fill(); g.fillRect(S * .22, S * .55, S * .16, S * .5) } else { trait(g, 10, 30, 60, 10, 10, '#ffffff', .5); trait(g, 70, 100, 118, 76, 8, '#ffffff', .35) }
      g.strokeStyle = '#2a1626'; g.lineWidth = 9; g.strokeRect(2, 2, S - 4, S - 4); trait(g, S / 2, 0, S / 2, S, 7, '#2a1626'); trait(g, 0, S / 2, S, S / 2, 7, '#2a1626')
      return tx(c)
    })
  }

  /* halo doux (lanternes, flammes, lucioles) */
  M.peintre.halo = () => memo('halo', () => {
    const [c, g] = cv(128, 128), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(255,255,255,.7)'); gr.addColorStop(.5, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c)
  })

  /* planche-contact : toutes les textures pour vérification visuelle */
  M.planche = () => {
    const P = M.peintre, list = [P.planches(), P.planches({ vertical: true, pal: ['#6b4a8f', '#5d3f7f', '#7b5aa0', '#54367a'], graine: 8 }), P.planches({ pal: ['#8f3a2f', '#7a2e27', '#a04638'], graine: 4 }), P.roche(), P.toit(), P.ecorce(), P.corde(), P.toile(), P.enseigne({ icone: 1 }), P.fenetre({ nuit: 1 }), P.fenetre()]
    const [c, g] = cv(4 * 256, 3 * 256); list.forEach((t, i) => g.drawImage(t.image, (i % 4) * 256, ((i / 4) | 0) * 256, 256, 256)); return c.toDataURL('image/png')
  }

  /* ---------------------------------------------------------------- matériaux toon (rampe globale `grad` du jeu) */
  M.mat.toon = (color, o) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: window.grad || (typeof grad !== 'undefined' ? grad : null) }, o || {}))
  M.mat.tex = (map, o) => new THREE.MeshToonMaterial(Object.assign({ map, gradientMap: typeof grad !== 'undefined' ? grad : null }, o || {}))
  M.mat.lueur = (color, alpha) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha === undefined ? 1 : alpha, depthWrite: false })

  /* ---------------------------------------------------------------- brume partagée avec les shaders maison */
  const FOG = { uFogC: { value: new THREE.Color('#bfe6f3') }, uFogNF: { value: new THREE.Vector2(60, 240) } }
  M.FOG = FOG
  M.brume = (scene) => { if (scene && scene.fog) { FOG.uFogC.value.copy(scene.fog.color); FOG.uFogNF.value.set(scene.fog.near, scene.fog.far) } }

  /* ---------------------------------------------------------------- particules (fumée, brume, flammes) */
  M.particules = function (opts) {
    opts = opts || {}
    const MAX = opts.max || 400, scene = opts.scene
    const quad = new THREE.PlaneBufferGeometry(1, 1)
    const geo = new THREE.InstancedBufferGeometry(); geo.index = quad.index; geo.setAttribute('position', quad.attributes.position); geo.instanceCount = 0
    const aPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage)
    const aCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage)
    const aP = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aPos', aPos); geo.setAttribute('aCol', aCol); geo.setAttribute('aP', aP)
    const uni = { uT: { value: 0 }, uLightV: { value: new THREE.Vector3(0, 1, 0) }, uLightC: { value: new THREE.Color('#ffffff') }, uAmbC: { value: new THREE.Color('#556') }, uRimC: { value: new THREE.Color('#000') } }
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      vertexShader: `attribute vec3 aPos; attribute vec4 aCol; attribute vec4 aP; varying vec2 vUv; varying vec4 vCol; varying float vAdd; varying float vSeed;
        void main(){ vec4 mv = viewMatrix * vec4(aPos, 1.); float c = cos(aP.y), s = sin(aP.y);
          vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * aP.x; mv.xy += q;
          gl_Position = projectionMatrix * mv; vUv = position.xy * 2.; vCol = aCol; vAdd = aP.z; vSeed = aP.w; }`,
      fragmentShader: `uniform float uT; uniform vec3 uLightV; uniform vec3 uLightC; uniform vec3 uAmbC; uniform vec3 uRimC; varying vec2 vUv; varying vec4 vCol; varying float vAdd; varying float vSeed;
        ${M.GLSL.bruit}
        void main(){ float r2 = dot(vUv, vUv); if(r2 > 1.) discard;
          float nz = twN(vUv * 2.6 + vSeed * 17. + uT * .15) * .6 + twN(vUv * 5.1 - vSeed * 9.) * .4;
          float mask = smoothstep(1., .32, sqrt(r2) + (nz - .5) * .6); if(mask < .01) discard;
          /* normale de sphère (espace vue), légèrement perturbée par le bruit : la fumée est éclairée comme un volume */
          vec3 n = normalize(vec3(vUv, sqrt(max(1. - r2, 0.))) + vec3((nz - .5) * .7, (twN(vUv * 3. + 5. + vSeed) - .5) * .7, 0.));
          float ndl = dot(n, normalize(uLightV)) * .5 + .5;
          vec3 lit = uAmbC + uLightC * ndl * ndl + uRimC * pow(1. - n.z, 2.5);
          float a = vCol.a * mask;
          vec3 baseC = vCol.rgb * lit;
          vec3 addC = vCol.rgb * (1. + (1. - r2) * 1.3);
          gl_FragColor = vec4(mix(baseC * a, addC * a, vAdd), a * (1. - vAdd)); }`
    })
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5; if (scene) scene.add(mesh)
    const P = [] // particules vivantes
    const tmp = new THREE.Vector3(), idx = []
    const api = {
      mesh, mat, uni, P,
      /* p : pos [x,y,z], vel [x,y,z], t0/t1 taille début/fin, c0/c1 couleur début/fin (#hex), a0/a1 alpha, vie, add 0..1 (1 = additif), rot, rv, grav, freine, vent */
      emettre(p) {
        if (P.length >= MAX) P.shift()
        const c0 = new THREE.Color(p.c0 || '#ffffff'), c1 = new THREE.Color(p.c1 || p.c0 || '#ffffff')
        P.push({ x: p.pos[0], y: p.pos[1], z: p.pos[2], vx: p.vel ? p.vel[0] : 0, vy: p.vel ? p.vel[1] : 0, vz: p.vel ? p.vel[2] : 0, t0: p.t0 || 1, t1: p.t1 || p.t0 || 1, c0, c1, a0: p.a0 === undefined ? .6 : p.a0, a1: p.a1 === undefined ? 0 : p.a1,
          vie: p.vie || 3, age: 0, add: p.add || 0, rot: p.rot === undefined ? Math.random() * 6.28 : p.rot, rv: p.rv || (Math.random() - .5) * .4, grav: p.grav || 0, frein: p.freine === undefined ? 1.2 : p.freine, vent: p.vent === undefined ? 1 : p.vent, seed: Math.random() })
      },
      maj(dt, T, camera) {
        uni.uT.value = T
        const cp = camera.position
        for (let i = P.length - 1; i >= 0; i--) {
          const q = P[i]; q.age += dt; if (q.age >= q.vie) { P.splice(i, 1); continue }
          if (q.vent) { const w = M.vent(q.x, q.z, T); q.vx += (w[0] * q.vent * 1.6 - q.vx) * Math.min(1, q.frein * dt * .35); q.vz += (w[1] * q.vent * 1.6 - q.vz) * Math.min(1, q.frein * dt * .35) }
          q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rot += q.rv * dt
        }
        const n = P.length; idx.length = n
        for (let i = 0; i < n; i++) { const q = P[i]; idx[i] = { i, d: (q.x - cp.x) ** 2 + (q.y - cp.y) ** 2 + (q.z - cp.z) ** 2 } }
        idx.sort((a, b) => b.d - a.d) // du plus lointain au plus proche
        const pa = aPos.array, ca = aCol.array, ma = aP.array
        for (let k = 0; k < n; k++) {
          const q = P[idx[k].i], u = q.age / q.vie, e = u * u * (3 - 2 * u), fade = Math.min(1, u * 8) * Math.min(1, (1 - u) * 3) // entrée douce, sortie douce
          pa[k * 3] = q.x; pa[k * 3 + 1] = q.y; pa[k * 3 + 2] = q.z
          ca[k * 4] = q.c0.r + (q.c1.r - q.c0.r) * e; ca[k * 4 + 1] = q.c0.g + (q.c1.g - q.c0.g) * e; ca[k * 4 + 2] = q.c0.b + (q.c1.b - q.c0.b) * e; ca[k * 4 + 3] = (q.a0 + (q.a1 - q.a0) * e) * fade
          ma[k * 4] = q.t0 + (q.t1 - q.t0) * e; ma[k * 4 + 1] = q.rot; ma[k * 4 + 2] = q.add; ma[k * 4 + 3] = q.seed
        }
        geo.instanceCount = n; aPos.needsUpdate = aCol.needsUpdate = aP.needsUpdate = true
      },
      /* lumière de la scène en espace vue : à appeler chaque image */
      lumiere(camera, dirMonde, couleur, ambiante, rim) {
        tmp.copy(dirMonde).normalize().transformDirection(camera.matrixWorldInverse); uni.uLightV.value.copy(tmp)
        if (couleur) uni.uLightC.value.copy(couleur); if (ambiante) uni.uAmbC.value.copy(ambiante); if (rim) uni.uRimC.value.copy(rim)
      }
    }
    return api
  }

  /* ---------------------------------------------------------------- herbe (lames générées dans le shader de sommets) */
  M.herbe = function (opts) {
    const SEG = opts.segments || 5, N = opts.lames || 0
    const geo = new THREE.InstancedBufferGeometry(), nv = (SEG + 1) * 2
    const v = new Float32Array(nv), idx = []
    for (let i = 0; i < nv; i++) v[i] = i
    for (let s = 0; s < SEG; s++) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    geo.setAttribute('aV', new THREE.BufferAttribute(v, 1)); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); geo.setIndex(idx)
    const root = new Float32Array(N * 3), rr = new Float32Array(N * 4), tint = new Float32Array(N)
    const r = M.alea(opts.graine || 21)
    for (let i = 0; i < N; i++) {
      const p = opts.placer(r); root[i * 3] = p[0]; root[i * 3 + 1] = p[1]; root[i * 3 + 2] = p[2]
      rr[i * 4] = r() * 6.2832; rr[i * 4 + 1] = .6 + r() * .8; rr[i * 4 + 2] = .7 + r() * .6; rr[i * 4 + 3] = (r() - .3) * .5; tint[i] = r()
    }
    geo.setAttribute('aRoot', new THREE.InstancedBufferAttribute(root, 3)); geo.setAttribute('aR', new THREE.InstancedBufferAttribute(rr, 4)); geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 1)); geo.instanceCount = N
    const uni = Object.assign({ uT: { value: 0 }, uHero: { value: new THREE.Vector4(0, -99, 0, 1.6) }, uH: { value: opts.hauteur || .9 }, uW: { value: opts.largeur || .075 },
      uC0: { value: new THREE.Color(opts.couleurs ? opts.couleurs[0] : '#2f6b2a') }, uC1: { value: new THREE.Color(opts.couleurs ? opts.couleurs[1] : '#5fae3c') }, uC2: { value: new THREE.Color(opts.couleurs ? opts.couleurs[2] : '#c4e070') },
      uSun: { value: new THREE.Vector3(.4, .8, .3) }, uSunC: { value: new THREE.Color('#fff2cf') }, uAmb: { value: new THREE.Color('#8894b8') } }, M.FOG)
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, side: THREE.DoubleSide,
      vertexShader: `attribute float aV; attribute vec3 aRoot; attribute vec4 aR; attribute float aTint; uniform float uT; uniform vec4 uHero; uniform float uH; uniform float uW;
        varying float vT; varying float vTint; varying vec3 vN; varying float vDist; varying vec3 vWP;
        ${M.GLSL.bruit}
        void main(){
          float seg = floor(aV / 2.); float side = mod(aV, 2.) * 2. - 1.; float t = seg / ${SEG}.;
          float h = uH * aR.y; float w = uW * aR.z * (1. - t * t * .93);
          vec2 dir = vec2(cos(aR.x), sin(aR.x)); vec2 lat = vec2(-dir.y, dir.x);
          vec3 wd = twVent(aRoot.xz, uT); vec2 wnd = wd.xy;
          float bend = aR.w + .12 + dot(wnd, dir) * .35 + (wd.z - .5) * .5;
          float k = t * t;
          vec3 p = aRoot; p.xz += dir * (k * bend * h * .9) + wnd * k * h * .22 * (.6 + wd.z); p.xz += lat * side * w;
          p.y += h * t * (1. - k * .28);
          vec2 dh = aRoot.xz - uHero.xz; float dd = length(dh); float push = smoothstep(uHero.w, 0., dd) * step(-50., uHero.y);
          p.xz += (dh / max(dd, .05)) * push * k * h * .8; p.y -= push * k * h * .45;
          vT = t; vTint = aTint; vDist = length(p - cameraPosition); vWP = p;
          vN = normalize(vec3(dir * bend * .8 + wnd * .2, 1.));
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uSun; uniform vec3 uSunC; uniform vec3 uAmb; uniform vec3 uFogC; uniform vec2 uFogNF;
        varying float vT; varying float vTint; varying vec3 vN; varying float vDist; varying vec3 vWP;
        void main(){
          vec3 c = mix(uC0, uC1, smoothstep(0., .55, vT)); c = mix(c, uC2, smoothstep(.55, 1., vT) * (.5 + .5 * vTint));
          c *= .82 + vTint * .3;
          float ndl = dot(normalize(vN), normalize(uSun)) * .5 + .5;
          float band = ndl < .38 ? .62 : ndl < .68 ? .84 : 1.;                     /* trois tons d'aplat */
          vec3 lit = c * (uAmb * .55 + uSunC * band * .75) * (.55 + .45 * vT);      /* pied de touffe plus sombre */
          float f = smoothstep(uFogNF.x, uFogNF.y, vDist); gl_FragColor = vec4(mix(lit, uFogC, f), 1.); }`
    })
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false
    return { mesh, mat, uni, maj(T, heros) { uni.uT.value = T; if (heros) uni.uHero.value.set(heros.x, heros.y, heros.z, uni.uHero.value.w) } }
  }
})()

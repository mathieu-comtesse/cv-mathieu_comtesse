/* Route & vigilance — piste de montagne, module pur (navigateur : window.Piste3D ; Node : require).
 * Tout est déterministe : même graine, même route. Conventions : x vers l'est, y vers le haut, cap θ = 0 → on avance vers −z ;
 * devant f(θ) = (sin θ, 0, −cos θ), droite r(θ) = (cos θ, 0, sin θ) ; κ > 0 = virage à droite (le cap augmente).
 * Contenu : générateur pseudo-aléatoire et bruit, tracé (courbure par virages, dénivelé limité, dévers), ligne idéale (corde des virages),
 * profil de vitesse « optimal » (adhérence, accélération et freinage bornés) et tables de temps des fantômes. */
(function (root) {
  'use strict'
  const PI = Math.PI
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }

  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  }
  const hash2 = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
  function noise2(x, y, s) {           // bruit de valeur lissé dans [0,1]
    const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi)
    return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), fx), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), fx), fy)
  }
  function fbm(x, y, s, oct) { let a = .5, f = 1, r = 0, n = 0; for (let i = 0; i < (oct || 4); i++) { r += a * noise2(x * f, y * f, s + i * 31); n += a; a *= .5; f *= 2.03 } return r / n }
  const noise1 = (x, s) => noise2(x, 0.5, s)

  /* ---------------------------------------------------------------------------------------------------------- tracé */
  function genererPiste(opt) {
    opt = opt || {}
    const graine = opt.graine === undefined ? 20261002 : opt.graine, longueur = opt.longueur || 9200, DS = 2
    const rnd = mulberry32(graine), N = Math.ceil(longueur / DS) + 1 + 400      // + 800 m de prolongation après l'arrivée
    // --- virages : des bosses de courbure en cos² (courbure continue). Le signe suit le cap cumulé pour que la route ne se referme pas sur elle-même.
    const virages = []; let s = 150, capPrevu = 0
    while (s < N * DS) {
      const t = rnd(); let L, k
      if (t < .2) { L = 70 + rnd() * 60; k = 1 / (55 + rnd() * 40) }              // épingle : rayon 55–95 m
      else if (t < .58) { L = 150 + rnd() * 130; k = 1 / (150 + rnd() * 130) }    // courbe moyenne : 150–280 m
      else { L = 230 + rnd() * 300; k = 1 / (340 + rnd() * 420) }                 // grande courbe rapide : 340–760 m
      let sg = virages.length && rnd() < .3 ? virages[virages.length - 1].sg : (rnd() < .5 ? -1 : 1)
      if (Math.abs(capPrevu) > 1.05 && rnd() < .92) sg = capPrevu > 0 ? -1 : 1
      virages.push({ s0: s + L / 2, L, k: k * sg, sg }); capPrevu += k * sg * L * .5
      s += L + 30 + rnd() * 280
    }
    const kappa = new Float32Array(N), theta = new Float32Array(N), X = new Float32Array(N), Z = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const si = i * DS; let k = 0
      for (const v of virages) { const u = (si - v.s0) / (v.L / 2); if (u > -1 && u < 1) { const c = Math.cos(u * PI / 2); k += v.k * c * c } }
      kappa[i] = k
    }
    let th = 0, x = 0, z = 0
    for (let i = 0; i < N; i++) {
      theta[i] = th; X[i] = x; Z[i] = z
      const thm = th + kappa[i] * DS * .5
      x += Math.sin(thm) * DS; z -= Math.cos(thm) * DS; th += kappa[i] * DS
    }
    // --- dénivelé : montée lente + vagues, pente limitée à 9 % puis relissée
    const Y = new Float32Array(N), ALT0 = 1400
    for (let i = 0; i < N; i++) { const si = i * DS; Y[i] = 260 * (si / longueur) + 46 * (noise1(si / 1100, graine + 5) - .5) * 2 + 15 * (noise1(si / 330, graine + 9) - .5) * 2 + 3.2 * (noise1(si / 75, graine + 13) - .5) * 2 }
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < N; i++) { const dy = Y[i] - Y[i - 1], m = .085 * DS; if (dy > m) Y[i] = Y[i - 1] + m; else if (dy < -m) Y[i] = Y[i - 1] - m }
      for (let r = 0; r < 4; r++) for (let i = 1; i < N - 1; i++) Y[i] = (Y[i - 1] + 2 * Y[i] + Y[i + 1]) / 4
    }
    const y0 = Y[0]; for (let i = 0; i < N; i++) Y[i] -= y0
    // --- courbure lissée (30 m) pour le dévers, la ligne et la vitesse
    const ks = new Float32Array(N); for (let i = 0; i < N; i++) { let a = 0, n = 0; for (let j = -8; j <= 8; j++) { const q = i + j; if (q >= 0 && q < N) { a += kappa[q]; n++ } } ks[i] = a / n }
    const bank = new Float32Array(N); for (let i = 0; i < N; i++) bank[i] = clamp(ks[i] * 26, -.1, .1)
    // --- ligne idéale : décalage latéral d*(s), extérieur -> corde -> extérieur ; on regarde 18 m plus loin pour braquer tôt
    const ligne = new Float32Array(N)
    for (let i = 0; i < N; i++) { const j = Math.min(N - 1, i + 9), k = ks[j]; ligne[i] = -Math.tanh(k * 210) * 2.7 }
    for (let r = 0; r < 6; r++) for (let i = 1; i < N - 1; i++) ligne[i] = (ligne[i - 1] + 2 * ligne[i] + ligne[i + 1]) / 4

    const P = { graine, longueur, DS, N, kappa, ks, theta, X, Y, Z, bank, ligne, virages, ALT0, LARGEUR: 9, CP: [.25, .5, .75, 1].map((f) => f * longueur) }
    P.hameaux = []
    P.idx = (s) => clamp(s / DS, 0, N - 1.0001)
    P.echant = (s) => {    // échantillon interpolé à l'abscisse s (m) : position, cap, courbure, dévers, ligne
      const f = P.idx(s), i = Math.floor(f), t = f - i, j = i + 1
      const a = (T) => T[i] + (T[j] - T[i]) * t
      const th = a(theta)
      return { x: a(X), y: a(Y), z: a(Z), th, k: a(ks), kr: a(kappa), bank: a(bank), ligne: a(ligne), fx: Math.sin(th), fz: -Math.cos(th), rx: Math.cos(th), rz: Math.sin(th) }
    }
    /* position monde d'un point (s, d) sur la chaussée : d > 0 à droite ; le dévers relève le côté extérieur */
    P.monde = (s, d, hors) => { const e = P.echant(s); return { x: e.x + e.rx * d, y: e.y - (hors ? 0 : d * Math.sin(e.bank)), z: e.z + e.rz * d, e } }
    /* altitude du terrain en (s, d) : plate sur la chaussée et l'accotement, puis talus (en montée ou en vallée selon le côté), collines et cuvette lointaine */
    P.hauteurTerrain = (s, d) => {
      const e = P.echant(s), ad = Math.abs(d), cote = d < 0 ? 0 : 1
      const route = e.y - d * Math.sin(e.bank) * smooth(1 - (ad - 4.6) / 3)
      if (ad <= 4.6) return route
      const w = P.monde(s, d, true)
      const pente = (noise1(s / 380, graine + 41 + cote * 17) - .42) * 1.25          // talus : >0 monte, <0 descend
      const t = ad - 4.6
      const talus = pente >= 0 ? pente * Math.min(t, 60) * (1 + .4 * Math.min(1, t / 60)) : pente * Math.min(t, 34) * 1.1
      const fossé = -1.1 * smooth(1 - Math.abs(ad - 6.2) / 2.6) * (pente >= 0 ? 1 : .3)
      const colline = (fbm(w.x / 150, w.z / 150, graine + 77, 4) - .42) * 70 * smooth((ad - 12) / 60)
      const cuvette = ad > 240 ? Math.pow((ad - 240) / 360, 2) * 260 : 0
      return route + talus + fossé + colline + cuvette
    }
    P.hameaux = genererZones(P, graine)
    P.limite = (s) => limiteA(P, s)
    P.hameau = (s, marge) => hameauA(P, s, marge)
    return P
  }

  /* ---------------------------------------------------------------------------------------------------------- vitesse de référence */
  /* profil de vitesse « optimal » v*(s) en m/s : limité par l'adhérence en courbe (aLat), par l'accélération du moteur et par le freinage */
  function profilVitesse(P, o) {
    o = o || {}
    const aLat = o.aLat || 10.2, vMax = o.vMax || 78, aFrein = o.aFrein || 10.5, N = P.N, DS = P.DS
    const accel = (v) => Math.max(.4, 8.4 * (1 - v / 84) - .35)
    const v = new Float32Array(N)
    for (let i = 0; i < N; i++) { const k = Math.abs(P.ks[i]) + .0004; v[i] = Math.min(vMax, Math.sqrt(aLat / k)) }
    v[0] = Math.min(v[0], 3)
    for (let i = 1; i < N; i++) { const vv = Math.sqrt(v[i - 1] * v[i - 1] + 2 * accel(v[i - 1]) * DS); if (v[i] > vv) v[i] = vv }
    for (let i = N - 2; i >= 0; i--) { const vv = Math.sqrt(v[i + 1] * v[i + 1] + 2 * aFrein * DS); if (v[i] > vv) v[i] = vv }
    return v
  }
  /* table de temps d'un concurrent : t[i] = secondes pour atteindre l'abscisse i·DS (compétence 0..1, bruit lent déterministe) */
  function tableTemps(P, vOpt, competence, graine) {
    const N = P.N, DS = P.DS, t = new Float32Array(N); t[0] = 0
    for (let i = 1; i < N; i++) {
      const j = i * DS, bruit = 1 + .028 * (noise1(j / 240, graine) - .5) * 2 + .014 * (noise1(j / 60, graine + 7) - .5) * 2
      const vm = Math.max(3, .5 * (vOpt[i] + vOpt[i - 1]) * competence * bruit)
      t[i] = t[i - 1] + DS / vm
    }
    return t
  }
  /* inverse : abscisse atteinte à l'instant T (interpolation) */
  function abscisseA(P, table, T) {
    const N = P.N; if (T <= 0) return 0; if (T >= table[N - 1]) return (N - 1) * P.DS
    let a = 0, b = N - 1; while (b - a > 1) { const m = (a + b) >> 1; if (table[m] <= T) a = m; else b = m }
    const f = (T - table[a]) / Math.max(1e-6, table[b] - table[a]); return (a + f) * P.DS
  }
  /* temps auquel la table atteint l'abscisse s */
  function tempsA(P, table, s) { const f = P.idx(s), i = Math.floor(f); return table[i] + (table[Math.min(P.N - 1, i + 1)] - table[i]) * (f - i) }


  /* ---------------------------------------------------------------------------------------------------------- hameaux et limitations de vitesse */
  /* Tout est déterministe : un hameau de 320 m environ tous les 1,6 à 2,3 km (limitation 50 km/h, passage piéton au centre), et une limitation de base à 80 km/h
   * (70 dans les grandes courbes serrées, annoncée par un panneau). limite(s) donne la vitesse autorisée en m/s ; hameau(s) renvoie le hameau le plus proche. */
  function genererZones(P, graine) {
    const rnd = mulberry32(graine * 3 + 11), hameaux = []
    let s = 900 + rnd() * 500
    while (s < P.longueur - 600) {
      const L = 300 + rnd() * 80
      // éviter les épingles : on cherche, autour de s, un tronçon peu courbe
      let c = s, meilleur = 1e9
      for (let q = s - 220; q <= s + 220; q += 20) { let k = 0; for (let m = -170; m <= 170; m += 34) k += Math.abs(P.echant(Math.max(0, q + m)).k); if (k < meilleur) { meilleur = k; c = q } }
      hameaux.push({ s0: c - L / 2, s1: c + L / 2, centre: c, L, limite: 50 / 3.6, passage: c + (rnd() - .5) * 30, nom: ['Les Granges', 'Le Pré-Haut', 'La Combe', 'Saint-Aubin', 'Les Mazets', 'Le Villard', 'La Fontaine', 'Champlong'][hameaux.length % 8] })
      s = c + L / 2 + 1500 + rnd() * 700
    }
    return hameaux
  }
  function limiteA(P, s) {
    for (const h of P.hameaux) if (s >= h.s0 && s <= h.s1) return h.limite
    const k = Math.abs(P.echant(s).k)
    return k > 1 / 160 ? 50 / 3.6 : k > 1 / 260 ? 70 / 3.6 : 80 / 3.6
  }
  function hameauA(P, s, marge) { marge = marge || 0; for (const h of P.hameaux) if (s >= h.s0 - marge && s <= h.s1 + marge) return h; return null }

  const fmt = (t, n) => { const neg = t < 0; t = Math.abs(t); const m = Math.floor(t / 60), s = t - m * 60; return (neg ? '-' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(n === undefined ? 2 : n) }   // toujours m:ss.cc, comme dans les classements

  const api = { mulberry32, hash2, noise2, noise1, fbm, genererPiste, profilVitesse, tableTemps, abscisseA, tempsA, clamp, lerp, smooth, fmt }
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Piste3D = api
})(typeof window !== 'undefined' ? window : globalThis)

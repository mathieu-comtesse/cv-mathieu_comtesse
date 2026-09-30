/* Embarcations et hydravion du quai de Talas, procéduraux. createModel(params, THREE).
 *   params.kind : 'bateau' | 'barque' | 'hydravion'
 *   bateau   : variante 1 = remorqueur (pneus, cheminée), 2 = chalutier (mât-potence, caisses, filet), 3 = vedette (pare-brise, banquette) ;
 *              coque / cabine / bande = couleurs (coque, superstructure, liston)
 *   hydravion: couleur = fuselage, accent = capot, hélice, dérive, bouts d'aile
 * Pièces animables (enfants nommés de la racine) :
 *   bateau : coque, pont, cabine, cheminee, mat (balancement), feux     ·   barque : coque, rames, bancs
 *   hydravion : fuselage, aile, empennage, gouvernail, flotteurs, helice (tourne autour de Z), haubans, feux
 * Mètres, Y vers le haut, avant (étrave, nez) vers +Z ; la quille / le dessous des flotteurs est à y = 0 (ligne de flottaison vers y ≈ 0,6 pour un bateau, 0,33 pour les flotteurs).
 * Règles vibe3d : jamais deux faces visibles coplanaires (couches décollées de 3 à 5 mm), pièces nommées, aucune texture. */
export function createModel(params: any = {}, THREE: any) {
  const kind = params.kind ?? 'bateau'
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
  const std = (hex: string, name: string, o: any = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), name, side: o.double ? THREE.DoubleSide : THREE.FrontSide })
    if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = 1 }
    return m
  }
  const mesh = (g: any, m: any, x = 0, y = 0, z = 0, p?: any) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p?.add(o); return o }
  const box = (w: number, h: number, d: number, m: any, x: number, y: number, z: number, p?: any) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, p)
  const cyl = (rt: number, rb: number, h: number, m: any, x: number, y: number, z: number, p?: any, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, p)
  const root = new THREE.Group(); root.name = kind
  const part = (name: string, p: any = root) => { const g = new THREE.Group(); g.name = name; p.add(g); return g }
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
  const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  /* tube droit entre deux points (haubans, mâts, cordages) */
  const tube = (a: any, b: any, r: number, m: any, p?: any, seg = 6) => {
    const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r, r, L, seg)
    const o = new THREE.Mesh(g, m); o.position.copy(a).addScaledVector(d, .5)
    o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); p?.add(o); return o
  }

  /* ---------------------------------------------------------------------------------------------------------------- balayage (loft)
   * n stations × m points ; fn(s, a) -> [x, y, z] avec s, a dans [0,1] ; closed : anneau fermé (a ∈ [0,1[) ; capA / capB : bouche les extrémités */
  function loft(n: number, m: number, closed: boolean, fn: (s: number, a: number) => number[], capA = false, capB = false, inside?: (p: any) => any) {
    const cols = closed ? m : m + 1, pos: number[] = [], idx: number[] = []
    for (let i = 0; i < n; i++) for (let j = 0; j < cols; j++) { const p = fn(i / (n - 1), j / m); pos.push(p[0], p[1], p[2]) }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) {
      const j2 = closed ? (j + 1) % m : j + 1, a = i * cols + j, b = i * cols + j2, c = (i + 1) * cols + j, d = (i + 1) * cols + j2
      idx.push(a, b, c, b, d, c)
    }
    const cap = (i: number, flip: boolean) => {
      const c = pos.length / 3; let cx = 0, cy = 0, cz = 0
      for (let j = 0; j < cols; j++) { const k = (i * cols + j) * 3; cx += pos[k]; cy += pos[k + 1]; cz += pos[k + 2] }
      pos.push(cx / cols, cy / cols, cz / cols)
      for (let j = 0; j < m; j++) { const j2 = closed ? (j + 1) % m : j + 1, a = i * cols + j, b = i * cols + j2; flip ? idx.push(c, b, a) : idx.push(c, a, b) }
    }
    if (capA) cap(0, false)
    if (capB) cap(n - 1, true)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx)
    orient(g, inside)
    g.computeVertexNormals()
    return g
  }
  /* oriente les triangles vers l'extérieur : volume signé pour un solide fermé, sinon distance à un point « intérieur » donné par inside(centre) */
  function orient(g: any, inside?: (p: any) => any) {
    const P = g.attributes.position, I = g.index, a = V(), b = V(), c = V(), n = V(), ct = V()
    if (!inside) {
      let vol = 0
      for (let t = 0; t < I.count; t += 3) { a.fromBufferAttribute(P, I.getX(t)); b.fromBufferAttribute(P, I.getX(t + 1)); c.fromBufferAttribute(P, I.getX(t + 2)); vol += a.dot(b.clone().cross(c)) }
      if (vol < 0) for (let t = 0; t < I.count; t += 3) { const k = I.getX(t + 1); I.setX(t + 1, I.getX(t + 2)); I.setX(t + 2, k) }
      return
    }
    for (let t = 0; t < I.count; t += 3) {
      a.fromBufferAttribute(P, I.getX(t)); b.fromBufferAttribute(P, I.getX(t + 1)); c.fromBufferAttribute(P, I.getX(t + 2))
      n.copy(b).sub(a).cross(c.clone().sub(a)); ct.copy(a).add(b).add(c).multiplyScalar(1 / 3)
      if (n.dot(ct.sub(inside(ct))) < 0) { const k = I.getX(t + 1); I.setX(t + 1, I.getX(t + 2)); I.setX(t + 2, k) }
    }
  }
  /* ruban plat entre deux courbes (pont, bandes) : fn(s, side) -> [x,y,z] ; side 0/1 */
  function ruban(n: number, fn: (s: number, side: number) => number[], up = 1) {
    const pos: number[] = [], idx: number[] = []
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) { const p = fn(i / (n - 1), k); pos.push(p[0], p[1], p[2]) }
    for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; up > 0 ? idx.push(a, c, b, b, c, d) : idx.push(a, b, c, b, d, c) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
  }
  /* aile / dérive : profil NACA symétrique épaissi, balayé ; fn(s) -> { o: origine du bord d'attaque, c: corde, e: épaisseur relative, dir: axe de la corde, up: axe de l'épaisseur } */
  const naca = (x: number, t: number) => 5 * t * (.2969 * Math.sqrt(x) - .126 * x - .3516 * x * x + .2843 * x ** 3 - .1015 * x ** 4)
  function surface(n: number, m: number, fn: (s: number) => any, capA = true, capB = true) {
    return loft(n, m, true, (s, a) => {
      const f = fn(s), ph = a * Math.PI * 2, x = (1 + Math.cos(ph)) / 2, y = (ph < Math.PI ? 1 : -1) * naca(x, f.e)
      // le bord d'attaque est à x = 0 (ph = π) : la corde part de l'origine vers le bord de fuite
      const back = 1 - x
      return [f.o.x + f.dir.x * back * f.c + f.up.x * y * f.c, f.o.y + f.dir.y * back * f.c + f.up.y * y * f.c, f.o.z + f.dir.z * back * f.c + f.up.z * y * f.c]
    }, capA, capB)
  }

  /* ================================================================================================================= COQUE DE BATEAU */
  /* profil commun : u de 0 (tableau arrière) à 1 (étrave) ; section en U devant, en V à l'étrave */
  function coqueBateau(L: number, B: number, H: number, rise: number, WL: number) {
    const halfB = (u: number) => {
      const stern = lerp(.8, 1, smooth(u / .22)), u0 = .52
      const bow = u < u0 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((u - u0) / (1 - u0), 1.85)))
      return B / 2 * stern * bow
    }
    const yK = (u: number) => (u < .15 ? .1 * Math.pow(1 - u / .15, 2) : 0) + (u > .58 ? rise * Math.pow((u - .58) / .42, 2.3) : 0)
    const ySh = (u: number) => H + .34 * u ** 3 + .07 * (1 - u) ** 3
    const q = (u: number) => lerp(2.05, 1.12, smooth((u - .42) / .58)) * (u < .15 ? lerp(.88, 1, u / .15) : 1)
    const fl = .1  // évasement des œuvres mortes
    const zz = (u: number) => -L / 2 + u * L
    /* point de la section : t ∈ [-1,1] par le dessous */
    const sect = (u: number, t: number, dy = 0, dout = 0) => {
      const at = Math.abs(t), hb = halfB(u), k = yK(u), s = ySh(u)
      const x = t * hb * (1 + fl * at ** 2) + Math.sign(t) * dout, y = k + (s - k) * Math.pow(at, q(u)) + dy
      return [x, y, zz(u)]
    }
    const tAt = (u: number, y: number) => { const k = yK(u), s = ySh(u); return Math.pow(clamp((y - k) / (s - k), 0, 1), 1 / q(u)) }
    const axe = (p: any) => V(0, H * .5, p.z)   // point intérieur pour orienter vers l'extérieur
    const N = 34, M = 22
    const uu = (s: number) => clamp(s * .997 + .0015, 0, 1)
    const ySplit = (u: number) => clamp(WL, yK(u), ySh(u) - .02)
    const out: any = { halfB, yK, ySh, q, zz, sect, tAt, axe, N, M, uu }
    // fond (peinture sous-marine) : t ∈ [-tS, tS] ; flanc : deux bandes de tS à 1
    out.fond = loft(N, M, false, (s, a) => { const u = uu(s), tS = tAt(u, ySplit(u)); return sect(u, lerp(-tS, tS, a)) }, false, false, axe)
    out.flancs = [-1, 1].map((sg) => loft(N, 10, false, (s, a) => { const u = uu(s), tS = tAt(u, ySplit(u)); return sect(u, sg * lerp(tS, 1, a)) }, false, false, axe))
    // bande de flottaison (peinture de ligne d'eau) et liston : bandes en saillie de 4 mm
    const ub = (s: number) => lerp(.03, .9, s)
    const bande = (y0: number, y1: number, dout: number) => [-1, 1].map((sg) => loft(N, 3, false, (s, a) => {
      const u = ub(s), k = yK(u), sH = ySh(u), ya = Math.max(y0, k + .03), yb = Math.max(y1, ya + .02)
      return sect(u, sg * lerp(tAt(u, Math.min(ya, sH)), tAt(u, Math.min(yb, sH)), a), 0, sg * dout)
    }, false, false, axe))
    out.ligne = bande(WL, WL + .1, .004)
    out.liston = (() => [-1, 1].map((sg) => loft(N, 3, false, (s, a) => {
      const u = ub(s), sH = ySh(u), ya = sH - .2, yb = sH - .1
      return sect(u, sg * lerp(tAt(u, ya), tAt(u, yb), a), 0, sg * .005)
    }, false, false, axe)))()
    // pont : ruban entre les deux flancs à y = ySh - 0,3 ; largeur donnée par la section à cette hauteur
    const yD = (u: number) => ySh(u) - .32
    out.yD = yD
    out.deck = ruban(N, (s, side) => { const u = uu(s), t = tAt(u, yD(u)), p = sect(u, (side ? 1 : -1) * t); return [p[0] * .998, yD(u), p[2]] }, 1)
    // tableau arrière : bouche la poupe (polygone convexe en éventail)
    {
      const pos: number[] = [], idx: number[] = []; const u = 0.0015, m = 18
      for (let j = 0; j <= m; j++) { const p = sect(u, -1 + 2 * j / m); pos.push(p[0], p[1], p[2]) }
      const c = sect(u, 0); pos.push(0, ySh(u), c[2])
      const ci = m + 1; for (let j = 0; j < m; j++) idx.push(ci, j, j + 1)
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx)
      const P = g.attributes.position, a = V().fromBufferAttribute(P, idx[0]), b = V().fromBufferAttribute(P, idx[1]), d = V().fromBufferAttribute(P, idx[2])
      if (b.clone().sub(a).cross(d.clone().sub(a)).z > 0) { for (let t = 0; t < idx.length; t += 3) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k } g.setIndex(idx) }
      g.computeVertexNormals(); out.miroir = g
    }
    // plat-bord : profilé 7 × 5 cm posé sur la ligne de livet
    out.platBord = [-1, 1].map((sg) => loft(N, 4, true, (s, a) => {
      const u = uu(s), p = sect(u, sg, 0, 0), w = .075, h = .055, ang = a * 4
      const dx = ang < 1 ? -w / 2 : ang < 2 ? w / 2 : ang < 3 ? w / 2 : -w / 2, dy = ang < 1 ? 0 : ang < 2 ? 0 : ang < 3 ? h : h
      return [p[0] + dx * (u > .97 ? .3 : 1), p[1] + dy - .004, p[2]]
    }, true, true))
    return out
  }

  /* ================================================================================================================= BATEAU */
  if (kind === 'bateau') {
    const variante = params.variante ?? 1
    const C = {
      coque: std(params.coque ?? '#c8352a', 'coque', { double: true }), fond: std('#2d2233', 'fond', { double: true }), ligne: std('#f4efe2', 'ligne'),
      liston: std(params.bande ?? '#efe7d4', 'liston', { double: true }), bois: std('#b07a45', 'bois'), boisFonce: std('#6a4528', 'bois_fonce'),
      cabine: std(params.cabine ?? '#efe7d4', 'cabine'), toit: std(params.toit ?? '#d9d2c2', 'toit'), vitre: std('#7fb3cf', 'vitre'), cadre: std('#3a3542', 'cadre'),
      metal: std('#5c6470', 'metal'), noir: std('#221a24', 'noir'), corde: std('#d8c39a', 'corde'), rouge: std('#c8352a', 'rouge'), jaune: std('#e9b63a', 'jaune'),
      feuR: std('#ff3b3b', 'lum_feu_rouge', { emissive: '#ff2020' }), feuV: std('#3bff7a', 'lum_feu_vert', { emissive: '#20ff60' }), feuB: std('#fff2c0', 'lum_feu_blanc', { emissive: '#ffe9a0' }),
    }
    const L = variante === 2 ? 7.2 : variante === 3 ? 6.3 : 6.6, B = variante === 2 ? 2.5 : variante === 3 ? 2.25 : 2.6, H = variante === 3 ? .82 : .95
    const hull = coqueBateau(L, B, H, variante === 3 ? .42 : .55, .58)
    const coque = part('coque')
    mesh(hull.fond, C.fond, 0, 0, 0, coque)
    hull.flancs.forEach((g: any) => mesh(g, C.coque, 0, 0, 0, coque))
    hull.ligne.forEach((g: any) => mesh(g, C.ligne, 0, 0, 0, coque))
    hull.liston.forEach((g: any) => mesh(g, C.liston, 0, 0, 0, coque))
    mesh(hull.miroir, C.coque, 0, 0, 0, coque)
    hull.platBord.forEach((g: any) => mesh(g, C.boisFonce, 0, 0, 0, coque))
    // pont en lattes : fond clair + joints sombres
    const pont = part('pont')
    mesh(hull.deck, C.bois, 0, 0, 0, pont)
    const nL = 8
    for (let k = 1; k < nL; k++) {
      const f = k / nL, g = ruban(hull.N, (s, side) => {
        const u = hull.uu(s), p = hull.sect(u, (side ? 1 : -1) * hull.tAt(u, hull.yD(u))), xx = lerp(-Math.abs(p[0]), Math.abs(p[0]), f) * .998, w = .012
        return [xx + (side ? w : -w), hull.yD(u) + .004, p[2]]
      }, 1)
      mesh(g, C.boisFonce, 0, 0, 0, pont)
    }
    const yPont = (z: number) => hull.yD((z + L / 2) / L)
    const pz = (z: number) => yPont(z)                       // hauteur du pont à l'abscisse z
    const dk = (z: number) => { const u = (z + L / 2) / L, p = hull.sect(u, hull.tAt(u, hull.yD(u))); return Math.abs(p[0]) }   // demi-largeur du pont en z

    // ------------------------------------------------ superstructure
    const cab = part('cabine')
    const zc = variante === 2 ? .7 : variante === 3 ? .55 : .2, cw = variante === 3 ? 1.7 : 1.75, cl = variante === 2 ? 1.75 : variante === 3 ? 2.1 : 1.9, ch = variante === 3 ? 1.05 : 1.25
    const y0 = pz(zc) + .02
    box(cw, ch, cl, C.cabine, 0, y0 + ch / 2, zc, cab)
    box(cw + .34, .07, cl + .38, C.cadre, 0, y0 + ch + .035, zc, cab)            // rebord sombre qui déborde
    box(cw + .2, .06, cl + .24, C.toit, 0, y0 + ch + .1, zc, cab)               // dalle de toit claire
    // fenêtres : face avant en 3 vitres, côtés en 2 ; encadrements sombres en retrait de 4 mm
    const vit = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const f = part('vitre', cab), fr = box(w + .09, h + .09, .04, C.cadre, 0, 0, 0, f), v = box(w, h, .02, C.vitre, 0, 0, .025, f)
      f.position.set(x, y, z); f.rotation.y = ry; return f
    }
    const zf = zc + cl / 2 + .004, zb = zc - cl / 2 - .004, xs = cw / 2 + .004, yv = y0 + ch * .58, hv = ch * .42
    ;[-.55, 0, .55].forEach((x) => vit(.44, hv, x * cw / 1.75, yv, zf, 0))
    ;[-.42, .42].forEach((dz) => { vit(.48, hv, xs, yv, zc + dz * cl / 1.9, Math.PI / 2); vit(.48, hv, -xs, yv, zc + dz * cl / 1.9, -Math.PI / 2) })
    vit(.6, hv, 0, yv, zb, Math.PI)
    // porte latérale bâbord et poignée
    box(.03, ch * .8, .52, C.boisFonce, -xs - .004, y0 + ch * .4, zc - cl * .32, cab)
    box(.04, .04, .1, C.metal, -xs - .03, y0 + ch * .42, zc - cl * .32 + .18, cab)
    // bouée de sauvetage sur la paroi arrière de la cabine
    { const b = mesh(new THREE.TorusGeometry(.2, .065, 8, 18), C.rouge, 0, y0 + ch * .5, zb - .04, cab); b.rotation.x = 0
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; box(.12, .14, .02, C.ligne, Math.cos(a) * .2, y0 + ch * .5 + Math.sin(a) * .2, zb - .04, cab).rotation.z = a } }
    // feux de navigation : rouge bâbord / vert tribord sur le toit, blanc en tête de mât
    const feux = part('feux')
    ;[[-1, C.feuR], [1, C.feuV]].forEach(([sg, m]: any) => { cyl(.03, .035, .16, C.metal, sg * (cw / 2 + .02), y0 + ch + .22, zc + cl * .2, feux, 6); mesh(new THREE.SphereGeometry(.065, 8, 6), m, sg * (cw / 2 + .02), y0 + ch + .34, zc + cl * .2, feux) })
    // cheminée / mât selon la variante
    const yT = y0 + ch + .1
    if (variante === 1) {                      // remorqueur : cheminée rouge à bande, pneus de défense, bitte de remorquage, treuil
      const ch1 = part('cheminee')
      cyl(.27, .3, .95, C.rouge, 0, yT + .5, zc - .42, ch1, 14)
      cyl(.282, .282, .18, C.noir, 0, yT + 1.0, zc - .42, ch1, 14)
      cyl(.31, .31, .05, C.ligne, 0, yT + .68, zc - .42, ch1, 14)
      cyl(.22, .22, .06, C.metal, 0, yT + 1.1, zc - .42, ch1, 14)
      cyl(.04, .04, 1.1, C.metal, 0, yT + .6, zc + .75, feux, 6)
      mesh(new THREE.SphereGeometry(.07, 8, 6), C.feuB, 0, yT + 1.17, zc + .75, feux)
      for (let i = 0; i < 6; i++) { const z = -1.9 + i * .75, u = (z + L / 2) / L, p = hull.sect(u, 1), y = hull.ySh(u) - .22
        ;[-1, 1].forEach((sg) => { const tx = mesh(new THREE.TorusGeometry(.17, .085, 8, 14), C.noir, sg * (Math.abs(p[0]) + .1), y, z, coque); tx.rotation.y = Math.PI / 2 }) }
      ;[-.45, .45].forEach((x) => { cyl(.11, .13, .36, C.metal, x, pz(-L / 2 + .7) + .18, -L / 2 + .7, pont, 10); cyl(.17, .14, .06, C.metal, x, pz(-L / 2 + .7) + .38, -L / 2 + .7, pont, 10) })
      box(1.1, .1, .08, C.metal, 0, pz(-L / 2 + .7) + .3, -L / 2 + .7, pont)
      { const dr = part('treuil', pont); cyl(.2, .2, .8, C.metal, 0, pz(zc + cl / 2 + .9) + .28, zc + cl / 2 + .9, dr, 10).rotation.z = Math.PI / 2; box(.1, .5, .5, C.noir, -.45, pz(zc + cl / 2 + .9) + .25, zc + cl / 2 + .9, dr); box(.1, .5, .5, C.noir, .45, pz(zc + cl / 2 + .9) + .25, zc + cl / 2 + .9, dr)
        const cor = mesh(new THREE.TorusGeometry(.27, .09, 8, 16), C.corde, 0, pz(zc + cl / 2 + .9) + .3, zc + cl / 2 + .9, dr); cor.rotation.y = Math.PI / 2 }
    } else if (variante === 2) {               // chalutier : mât avec flèche de chargement, caisses de poisson, filet, treuil
      const mat = part('mat'), zm = -1.05, ym = pz(zm)
      tube(V(0, ym, zm), V(0, ym + 3.3, zm), .055, C.metal, mat, 8)
      tube(V(0, ym + 2.9, zm), V(.0, ym + 1.75, zm + 1.75), .04, C.metal, mat, 6)
      tube(V(0, ym + 3.2, zm), V(0, ym + 1.75, zm + 1.75), .012, C.corde, mat, 4)
      tube(V(0, ym + 3.25, zm), V(0, ym + 1.0, zm - 1.35), .012, C.corde, mat, 4)
      mesh(new THREE.SphereGeometry(.07, 8, 6), C.feuB, 0, ym + 3.35, zm, mat)
      box(.3, .3, .3, C.boisFonce, 0, ym + 1.55, zm + 1.78, mat)
      const cf = part('cheminee'); cyl(.16, .2, .8, C.noir, 0, yT + .42, zc - .55, cf, 12); cyl(.17, .17, .1, C.jaune, 0, yT + .6, zc - .55, cf, 12)
      // caisses de poisson empilées et filet roulé
      const cai = (x: number, z: number, n: number) => { for (let i = 0; i < n; i++) { box(.56, .28, .42, C.jaune, x, pz(z) + .15 + i * .3, z, pont); box(.58, .04, .44, C.boisFonce, x, pz(z) + .3 + i * .3, z, pont) } }
      cai(.6, -2.05, 3); cai(-.65, -2.25, 2); cai(.62, -2.65, 1)
      { const fil = mesh(new THREE.CylinderGeometry(.3, .3, 1.3, 14), C.corde, 0, pz(1.9) + .42, 1.9, pont); fil.rotation.z = Math.PI / 2; const fil2 = mesh(new THREE.CylinderGeometry(.24, .24, 1.34, 14), C.vitre, 0, pz(1.9) + .42, 1.9, pont); fil2.rotation.z = Math.PI / 2; fil2.scale.set(.9, 1, .9) }
      ;[-.5, .5].forEach((x) => { box(.12, .5, .12, C.boisFonce, x, pz(1.0) + .25, 1.0, pont); box(.12, .5, .12, C.boisFonce, x, pz(-.5) + .25, -.5 - 1.7, pont) })
    } else {                                   // vedette : pare-brise incliné, banquette arrière, moteur hors-bord, rambarde avant
      // petit auvent au-dessus des vitres de face (pas de pare-brise incliné : la cabine est fermée)
      box(cw - .1, .05, .34, C.cadre, 0, y0 + ch * .58 + hv / 2 + .06, zc + cl / 2 + .16, cab)
      box(1.5, .14, .5, C.cabine, 0, pz(-L / 2 + .8) + .22, -L / 2 + .8, pont); box(1.5, .4, .1, C.cabine, 0, pz(-L / 2 + .8) + .52, -L / 2 + .5, pont)
      box(1.52, .06, .54, C.noir, 0, pz(-L / 2 + .8) + .3, -L / 2 + .8, pont)
      const mo = part('moteur'); box(.4, .55, .3, C.noir, 0, pz(-L / 2 + .15) + .3, -L / 2 - .12, mo); box(.32, .5, .05, C.metal, 0, pz(-L / 2 + .15) - .05, -L / 2 - .3, mo); cyl(.04, .04, .7, C.metal, 0, pz(-L / 2 + .15) - .05, -L / 2 - .32, mo, 6)
      cyl(.03, .03, 1.4, C.metal, 0, y0 + ch + .75, zc - .35, feux, 6); mesh(new THREE.SphereGeometry(.06, 8, 6), C.feuB, 0, y0 + ch + 1.47, zc - .35, feux)
      // garde-corps avant
      ;[-1, 1].forEach((sg) => { for (let k = 0; k < 3; k++) { const z = zc + cl / 2 + .55 + k * .55, d = dk(z) - .05; cyl(.022, .022, .5, C.metal, sg * d, pz(z) + .27, z, pont, 6) }
        tube(V(sg * (dk(zc + cl / 2 + .55) - .05), pz(zc + cl / 2 + .55) + .5, zc + cl / 2 + .55), V(sg * (dk(zc + cl / 2 + 1.65) - .05), pz(zc + cl / 2 + 1.65) + .5, zc + cl / 2 + 1.65), .018, C.metal, pont, 5) })
    }
    // détails communs : taquets, échelle de quai, petite lanterne à l'étrave, cordage lové
    ;[-1, 1].forEach((sg) => { const z = L / 2 - 1.1, d = dk(z) - .14; box(.3, .07, .09, C.metal, sg * d, pz(z) + .05, z, pont); box(.07, .13, .09, C.metal, sg * d - .1 * sg, pz(z) + .1, z, pont); box(.07, .13, .09, C.metal, sg * d + .1 * sg, pz(z) + .1, z, pont) })
    { const zl = L / 2 - .38; cyl(.03, .03, .55, C.metal, 0, pz(zl) + .3, zl, pont, 6); mesh(new THREE.SphereGeometry(.07, 8, 6), C.feuB, 0, pz(zl) + .6, zl, feux) }
    { const zc2 = variante === 3 ? .4 : 2.1 + (variante === 2 ? .4 : 0); const c2 = mesh(new THREE.TorusGeometry(.2, .07, 8, 16), C.corde, .55, pz(zc2) + .08, zc2, pont); c2.rotation.x = Math.PI / 2 }
  }

  /* ================================================================================================================= BARQUE */
  else if (kind === 'barque') {
    const C = { coque: std(params.coque ?? '#7a523a', 'coque', { double: true }), ligne: std(params.bande ?? '#efe7d4', 'liston'), bois: std('#b07a45', 'bois'), boisFonce: std('#5a3a26', 'bois_fonce'),
      interieur: std('#c9a26b', 'interieur', { double: true }), metal: std('#5c6470', 'metal'), corde: std('#d8c39a', 'corde'), pale: std('#efe7d4', 'pale') }
    const L = 3.4, B = 1.3, H = .52
    const hull = coqueBateau(L, B, H, .24, .18)
    const coque = part('coque')
    // bordé à clins : trois virures de teintes alternées
    hull.flancs.forEach((g: any) => mesh(g, C.coque, 0, 0, 0, coque))
    mesh(hull.fond, C.boisFonce, 0, 0, 0, coque)
    hull.liston.forEach((g: any) => mesh(g, C.ligne, 0, 0, 0, coque))
    mesh(hull.miroir, C.coque, 0, 0, 0, coque)
    hull.platBord.forEach((g: any) => mesh(g, C.bois, 0, 0, 0, coque))
    const fondI = ruban(hull.N, (s, side) => { const u = hull.uu(s), t = hull.tAt(u, hull.yK(u) + .12), p = hull.sect(u, (side ? 1 : -1) * t); return [p[0] * .97, hull.yK(u) + .12, p[2]] }, 1)
    mesh(fondI, C.interieur, 0, 0, 0, coque)
    // bancs, tolets, rames, corde d'amarrage
    const bancs = part('bancs')
    ;[-.55, .45].forEach((z) => { const d = Math.abs(hull.sect((z + L / 2) / L, hull.tAt((z + L / 2) / L, .36))[0]); box(d * 2 + .02, .05, .3, C.bois, 0, .37, z, bancs) })
    const rames = part('rames')
    ;[-1, 1].forEach((sg) => {
      const z = -.1, u = (z + L / 2) / L, x = Math.abs(hull.sect(u, 1)[0]) + .02, y = hull.ySh(u) + .03
      box(.05, .09, .05, C.metal, sg * x, y - .02, z, rames)
      const r = part('rame', rames); r.position.set(sg * (x + .01), y + .03, z); r.rotation.y = sg * .35; r.rotation.z = -sg * .18
      cyl(.022, .022, 1.75, C.bois, 0, 0, .5, r, 6).rotation.x = Math.PI / 2
      box(.14, .03, .5, C.pale, 0, 0, 1.45, r)
    })
    { const c = mesh(new THREE.TorusGeometry(.14, .045, 6, 14), C.corde, 0, hull.yK(.05) + .2, -L / 2 + .55, coque); c.rotation.x = Math.PI / 2; tube(V(0, .42, L / 2 - .15), V(.2, .18, L / 2 + .35), .02, C.corde, coque, 5) }
  }

  /* ================================================================================================================= HYDRAVION */
  else if (kind === 'hydravion') {
    const C = {
      corps: std(params.couleur ?? '#efe7d4', 'corps'), accent: std(params.accent ?? '#c8352a', 'accent'), orange: std(params.orange ?? '#f08c00', 'orange'),
      flotteur: std(params.flotteur ?? '#e6dfcf', 'flotteur'), ventre: std('#2d3c58', 'ventre'), metal: std('#4c5562', 'metal'), noir: std('#221a24', 'noir'),
      vitre: std('#8fc5df', 'vitre'), cadre: std('#3a3542', 'cadre'), feuR: std('#ff3b3b', 'lum_feu_rouge', { emissive: '#ff2020' }), feuV: std('#3bff7a', 'lum_feu_vert', { emissive: '#20ff60' }),
      feuB: std('#fff2c0', 'lum_feu_blanc', { emissive: '#ffe9a0' }),
    }
    const YF = 1.72            // axe du fuselage au-dessus de la base des flotteurs
    const sgn = (v: number) => (v < 0 ? -1 : 1)
    /* --- fuselage : profil analytique (demi-largeur, demi-hauteur, axe, exposant de la super-ellipse) de l'empennage au capot --- */
    const ZT = -3.55, ZN = 2.15, LF = ZN - ZT
    const env = (z: number) => { const s = (z - ZT) / LF, a = Math.sin(Math.PI / 2 * clamp(s / .58, 0, 1)); return Math.max(.05, Math.pow(a, 1.2)) * (1 - .2 * smooth((s - .86) / .14)) }
    const fw = (z: number) => .58 * env(z), fh = (z: number) => .86 * env(z)
    const fyc = (z: number) => YF - .05 + .6 * Math.pow(1 - clamp((z - ZT) / (LF * .62), 0, 1), 2.2)
    const fe = (z: number) => lerp(2, 2.7, smooth((z - ZT) / (LF * .35)))
    const fp = (z: number, ph: number, g = 0) => {
      const c = Math.cos(ph), sn = Math.sin(ph), e = fe(z)
      const x = sgn(c) * Math.pow(Math.abs(c), 2 / e) * (fw(z) + g), y = sgn(sn) * Math.pow(Math.abs(sn), 2 / e) * (fh(z) + g) * (sn > 0 ? 1 : .88)
      return [x, fyc(z) + y - (sn < 0 ? .05 : 0), z]
    }
    const sideX = (z: number, dy: number) => fw(z) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(dy) / fh(z), fe(z))), 1 / fe(z)) + .004   // abscisse de la paroi à la hauteur dy au-dessus de l'axe
    const fus = part('fuselage')
    mesh(loft(46, 32, true, (s, a) => fp(lerp(ZT, ZN, s), a * Math.PI * 2), true, true), C.corps, 0, 0, 0, fus)
    // ventre bleu sombre (décollé de 4 mm) et liseré rouge à mi-hauteur de chaque côté
    mesh(loft(30, 14, false, (s, a) => fp(lerp(-3.0, 2.0, s), Math.PI * (1.14 + .72 * a), .004)), C.ventre, 0, 0, 0, fus)
    ;[0, Math.PI].forEach((p0) => mesh(loft(30, 3, false, (s, a) => fp(lerp(-2.7, 1.95, s), p0 + lerp(-.12, .12, a) * (p0 ? -1 : 1), .004)), C.accent, 0, 0, 0, fus))
    // capot moteur rouge + anneau d'entrée d'air + échappements, hélice
    const capot = part('capot'), zc = ZN - .03
    mesh(loft(16, 30, true, (s, a) => { const ph = a * Math.PI * 2, r = lerp(.5, .37, smooth(s)); return [Math.cos(ph) * r, YF - .05 + Math.sin(ph) * r * .93, lerp(zc, zc + .5, s)] }, false, true), C.accent, 0, 0, 0, capot)
    mesh(new THREE.TorusGeometry(.34, .035, 8, 24), C.noir, 0, YF - .05, zc + .5, capot)
    ;[-1, 1].forEach((sg) => { const t = cyl(.05, .05, .42, C.metal, sg * .25, YF - .2, zc + .12, capot, 8); t.rotation.x = Math.PI / 2 })
    const helice = part('helice'); helice.position.set(0, YF - .05, zc + .6)
    mesh(new THREE.ConeGeometry(.17, .4, 16), C.accent, 0, 0, .2, helice).rotation.x = Math.PI / 2
    cyl(.19, .19, .07, C.metal, 0, 0, -.02, helice, 16).rotation.x = Math.PI / 2
    ;[0, Math.PI].forEach((r) => {
      const b = part('pale', helice); b.rotation.z = r
      const blade = new THREE.Shape(); blade.moveTo(-.07, .12); blade.lineTo(.07, .12); blade.lineTo(.05, .94); blade.quadraticCurveTo(0, 1.0, -.05, .94); blade.closePath()
      mesh(new THREE.ExtrudeGeometry(blade, { depth: .024, bevelEnabled: false }), C.noir, 0, 0, .04, b)
      const tip = new THREE.Shape(); tip.moveTo(-.052, .72); tip.lineTo(.052, .72); tip.lineTo(.05, .94); tip.quadraticCurveTo(0, 1.0, -.05, .94); tip.closePath()
      mesh(new THREE.ExtrudeGeometry(tip, { depth: .024, bevelEnabled: false }), C.orange, 0, 0, .044, b)
    })
    // pare-brise, vitres latérales, porte bâbord, poignée, marchepied
    const cab = part('cabine', fus)
    const vit = (w: number, h: number, x: number, y: number, z: number, ry: number) => { const f = part('vitre', cab); f.position.set(x, y, z); f.rotation.set(0, ry, 0); box(w + .07, h + .07, .025, C.cadre, 0, 0, 0, f); box(w, h, .02, C.vitre, 0, 0, .018, f) }
    const wind = box(.98, .44, .03, C.vitre, 0, YF + .66, 1.36, cab); wind.rotation.x = -.62
    box(1.04, .05, .05, C.cadre, 0, YF + .5, 1.56, cab)
    ;[-1, 1].forEach((sg) => {
      const dy = .42
      vit(.5, .36, sg * sideX(.75, dy), YF + dy, .75, sg * Math.PI / 2); vit(.5, .36, sg * sideX(.05, dy), YF + dy, .05, sg * Math.PI / 2); vit(.44, .3, sg * sideX(-.62, dy - .04), YF + dy - .04, -.62, sg * Math.PI / 2)
    })
    box(.03, .72, .5, C.cadre, -sideX(.4, .0) - .004, YF - .03, .42, cab); box(.03, .05, .1, C.metal, -sideX(.4, .0) - .02, YF - .03, .6, cab)
    box(.22, .03, .28, C.metal, -sideX(.4, -.42) - .1, YF - .45, .42, cab)
    // empennage : dérive, gouvernail (rouge), stabilisateurs avec gouvernes
    const emp = part('empennage')
    const tailY = fyc(-3.0) + .06
    mesh(surface(10, 18, (s) => ({ o: V(0, tailY + s * 1.25, -3.05 - s * .5), c: lerp(1.0, .55, s), e: .09, dir: V(0, 0, -1), up: V(1, 0, 0) })), C.corps, 0, 0, 0, emp)
    const gouv = part('gouvernail')
    mesh(surface(8, 14, (s) => ({ o: V(0, tailY + .15 + s * 1.05, -3.05 - .52 - s * .5 - 0), c: lerp(.42, .3, s), e: .075, dir: V(0, 0, -1), up: V(1, 0, 0) })), C.accent, 0, 0, 0, gouv)
    ;[-1, 1].forEach((sg) => {
      mesh(surface(10, 18, (s) => ({ o: V(sg * s * 1.6, tailY + .02, -2.85 - s * .15), c: lerp(.85, .5, s), e: .08, dir: V(0, 0, -1), up: V(0, 1, 0) })), C.corps, 0, 0, 0, emp)
      mesh(surface(6, 14, (s) => ({ o: V(sg * (.85 + s * .75), tailY + .02, -3.68 - s * .1 + .03), c: lerp(.3, .22, s), e: .075, dir: V(0, 0, -1), up: V(0, 1, 0) })), C.accent, 0, 0, 0, emp)
    })
    // aile haute : profil NACA 12 %, corde 1,7 m à l'emplanture, 1,1 m au bout, bouts rouges, volets et ailerons orange
    const aile = part('aile'), yA = YF + .96, zLE = 1.42, demi = 5.0
    const chord = (s: number) => lerp(1.72, 1.08, Math.pow(s, 1.2)), leZ = (s: number) => zLE - s * .2, yAt = (s: number) => yA + s * s * .13
    ;[-1, 1].forEach((sg) => {
      mesh(surface(20, 26, (s) => ({ o: V(sg * s * demi, yAt(s), leZ(s)), c: chord(s), e: .12, dir: V(0, 0, -1), up: V(0, 1, 0) })), C.corps, 0, 0, 0, aile)
      mesh(surface(6, 26, (s) => { const ss = lerp(.86, 1, s); return { o: V(sg * ss * demi, yAt(ss), leZ(ss)), c: chord(ss) + .006, e: .121, dir: V(0, 0, -1), up: V(0, 1, 0) } }), C.accent, 0, 0, 0, aile)
      const bord = (a: number, b: number) => {   // bande orange sur le bord de fuite, dessus et dessous (à 4 mm)
        ;[1, -1].forEach((k) => mesh(ruban(8, (s, side) => { const ss = lerp(a, b, s), ch = chord(ss), zt = leZ(ss) - ch, yy = yAt(ss) + k * .0042
          return [sg * ss * demi, yy, zt + (side ? 0 : .26 * ch)] }, sg * k), C.orange, 0, 0, 0, aile))
      }
      bord(.12, .44); bord(.52, .82)
      mesh(new THREE.SphereGeometry(.07, 8, 6), sg < 0 ? C.feuR : C.feuV, sg * (demi + .015), yAt(1) + .02, leZ(1) - chord(1) * .42, part('feux'))
    })
    // haubans : deux en V par côté (paroi du ventre -> aile), plus deux pieds de cabine
    const hau = part('haubans')
    ;[-1, 1].forEach((sg) => {
      tube(V(sg * .5, YF - .42, .9), V(sg * 2.8, yAt(.56) - .06, leZ(.56) - chord(.56) * .35), .03, C.metal, hau, 8)
      tube(V(sg * .5, YF - .42, -.05), V(sg * 2.8, yAt(.56) - .06, leZ(.56) - chord(.56) * .35 - .02), .024, C.metal, hau, 8)
    })
    mesh(new THREE.SphereGeometry(.05, 8, 6), C.feuB, 0, tailY + 1.32, -3.05 - .5 - .35, part('feux'))
    cyl(.012, .012, .5, C.noir, .95, yA + .32, leZ(.2) - 1, aile, 4).rotation.z = .1

    // flotteurs : coque effilée, redan à 62 %, étrave relevée ; dessous bleu sombre, liséré rouge
    const flot = part('flotteurs')
    const FL = 5.0, FB = .62, FH = .62, XF = 1.22, zf0 = -2.45
    const fsec = (u: number, a: number, g = 0) => {
      const bow = u < .55 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((u - .55) / .45, 2))), st = lerp(.74, 1, smooth(u / .25))
      const hb = FB / 2 * st * bow + g, hz = FH / 2 * (1 - .14 * smooth((u - .7) / .3))
      const yKl = (u > .62 ? .3 * Math.pow((u - .62) / .38, 1.8) : 0) + (u < .14 ? .14 * Math.pow(1 - u / .14, 2) : 0) + (u > .58 && u < .64 ? .05 * Math.sin((u - .58) / .06 * Math.PI) : 0)
      const th = a * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), e = 2.4
      return [sgn(c) * Math.pow(Math.abs(c), 2 / e) * hb, hz + yKl + sgn(sn) * Math.pow(Math.abs(sn), 2 / e) * (hz + g) * (sn > 0 ? .92 : 1), lerp(zf0, zf0 + FL, u)]
    }
    const uf = (s: number) => clamp(s * .996 + .002, 0, 1)
    ;[-1, 1].forEach((sg) => {
      const x0 = sg * XF, f = part('flotteur', flot)
      mesh(loft(36, 26, true, (s, a) => { const p = fsec(uf(s), a); return [p[0] + x0, p[1], p[2]] }, true, true), C.flotteur, 0, 0, 0, f)
      mesh(loft(36, 10, false, (s, a) => { const p = fsec(uf(s), .75 + .5 * 0 + lerp(-.17, .17, a), .004); return [p[0] + x0, p[1], p[2]] }), C.ventre, 0, 0, 0, f)
      ;[0, .5].forEach((p0) => mesh(loft(36, 3, false, (s, a) => { const p = fsec(uf(s), p0 + lerp(-.035, .035, a), .004); return [p[0] + x0, p[1], p[2]] }), C.accent, 0, 0, 0, f))
      box(FB * .5, .012, 2.2, C.noir, x0, FH + .008, -.1, f)
      ;[-.9, .5].forEach((z) => cyl(.05, .05, .02, C.metal, x0, FH + .03, z, f, 8))
    })
    // mâts des flotteurs : un avant, un arrière ; entretoises
    const hf = part('mats-flotteurs', flot)
    ;[1.15, -.4].forEach((z) => {
      ;[-1, 1].forEach((sg) => {
        tube(V(sg * 1.22, FH, z - .16), V(sg * .44, YF - .44, z - .05), .04, C.metal, hf, 8)
        tube(V(sg * 1.22, FH, z + .2), V(sg * .44, YF - .44, z + .05), .04, C.metal, hf, 8)
      })
      tube(V(-1.22, FH + .02, z + .02), V(1.22, FH + .02, z + .02), .03, C.metal, hf, 8)
    })
  }
  return { root, dispose() {} }
}

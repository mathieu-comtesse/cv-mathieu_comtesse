/* LE GRENIER HANTÉ DE TALAS (§4, « Le fantôme en pantoufles »), d'après l'illustration validée : charpente, planches violettes, bougies et lustres,
 * fenêtre en ogive sur la nuit, portrait, caisses, bocal-piège, brume au ras du sol. La lumière vient d'une lune directionnelle forte (talas-rendu.js :
 * pleine puissance sur le fantôme, ~20 % à 6 m, modulée par des nuages Perlin-Worley) ; les bougies, la porte verte et le fantôme éclairent le reste.
 *
 *   TALAS_GRENIER.monde()  -> monde de salle compatible avec buildRoom() (scene, stage, dylan, boulon, fx, clear, update) + caméra derrière Dylan
 *   ?grenier=non           -> ancienne salle
 * Dépend de : talas-monde.js, talas-rendu.js, talas-fantome.js (le fantôme en tissu). Tout est procédural. */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE, RD = window.TALAS_RENDU
  if (!THREE || !M || !RD || !RD.on) return
  const Pq = new URLSearchParams(location.search)
  const G = window.TALAS_GRENIER = { on: Pq.get('grenier') !== 'non' }
  if (!G.on) return
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a + (b - a) * t
  RD.profils.grenier = { exp: .94, contraste: 1.16, sat: 1.22, ombre: [.8, .86, 1.24], lumiere: [1.12, 1, .88], split: .72, ao: .85, ct: .38, encre: .8, encreCouleur: [.05, .02, .1], bloom: .6, seuil: .84, vignette: .44, grain: .032, dof: .42, rim: .5, rimCouleur: '#7fffd4' }

  /* ------------------------------------------------------------------------------------------------ textures peintes propres au grenier */
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')] }
  const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]) } return t }
  function texFenetre() { // nuit bleue, lune, étoiles, sapins en trois plans
    const [c, g] = cv(256, 512), al = M.alea(3)
    const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#24216f'); gr.addColorStop(.5, '#4b41ba'); gr.addColorStop(1, '#7d6fe8'); g.fillStyle = gr; g.fillRect(0, 0, 256, 512)
    const hl = g.createRadialGradient(170, 130, 4, 170, 130, 160); hl.addColorStop(0, 'rgba(235,240,255,.9)'); hl.addColorStop(.25, 'rgba(160,170,255,.35)'); hl.addColorStop(1, 'rgba(120,120,255,0)'); g.fillStyle = hl; g.fillRect(0, 0, 256, 512)
    g.fillStyle = '#f6f3ff'; g.beginPath(); g.arc(170, 130, 24, 0, 7); g.fill()
    for (let i = 0; i < 46; i++) { g.fillStyle = 'rgba(255,255,255,' + (.3 + al() * .6) + ')'; g.fillRect(al() * 256, al() * 320, 1.5 + al() * 1.6, 1.5 + al() * 1.6) }
    const sapin = (x, y, h, col) => { g.fillStyle = col; for (let k = 0; k < 4; k++) { const w = h * .3 * (1 - k * .17); g.beginPath(); g.moveTo(x, y - h * (.36 + k * .17)); g.lineTo(x - w, y - h * (k * .17)); g.lineTo(x + w, y - h * (k * .17)); g.fill() } g.fillRect(x - 3, y, 6, h * .1) }
    const cols = ['#2c2a8f', '#201d70', '#15124f']
    for (let plan = 0; plan < 3; plan++) for (let i = 0; i < 6; i++) sapin(i * 50 - 6 + al() * 22 + plan * 12, 420 + plan * 36, 96 + al() * 60 - plan * 14, cols[plan])
    g.fillStyle = '#100c3c'; g.fillRect(0, 468, 256, 44)
    return tex(c)
  }
  function texPortrait() { // vieil homme effaré, tons sépia et vert-de-gris
    const [c, g] = cv(256, 352)
    g.fillStyle = '#3b343a'; g.fillRect(0, 0, 256, 352)
    const f = g.createRadialGradient(128, 140, 10, 128, 150, 190); f.addColorStop(0, '#5d5460'); f.addColorStop(1, '#221c26'); g.fillStyle = f; g.fillRect(0, 0, 256, 352)
    g.fillStyle = '#2b2429'; g.beginPath(); g.moveTo(30, 352); g.quadraticCurveTo(40, 250, 128, 240); g.quadraticCurveTo(216, 250, 226, 352); g.fill()
    g.fillStyle = '#d9d2bd'; g.fillRect(100, 234, 56, 30)
    g.fillStyle = '#c4b89b'; g.beginPath(); g.ellipse(128, 150, 54, 72, 0, 0, 7); g.fill()
    g.strokeStyle = '#3a2f30'; g.lineWidth = 5; for (let i = 0; i < 26; i++) { const a = -PI + i / 25 * PI; g.beginPath(); g.moveTo(128 + Math.cos(a) * 54, 150 + Math.sin(a) * 60); g.lineTo(128 + Math.cos(a) * (80 + (i % 3) * 12), 150 + Math.sin(a) * (92 + (i % 4) * 8)); g.stroke() }
    ;[-1, 1].forEach((q) => { g.fillStyle = '#f2eee0'; g.beginPath(); g.ellipse(128 + q * 24, 138, 14, 17, 0, 0, 7); g.fill(); g.fillStyle = '#231a1f'; g.beginPath(); g.arc(128 + q * 24, 140, 6, 0, 7); g.fill(); g.strokeStyle = '#3a2f30'; g.lineWidth = 4; g.beginPath(); g.moveTo(128 + q * 40, 118 + q * 6); g.lineTo(128 + q * 8, 110); g.stroke() })
    g.strokeStyle = '#3a2f30'; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 145); g.lineTo(122, 168); g.lineTo(134, 168); g.stroke()
    g.fillStyle = '#4b2a30'; g.beginPath(); g.ellipse(128, 192, 16, 10, 0, 0, 7); g.fill(); g.fillStyle = '#e9e2cf'; g.fillRect(118, 186, 20, 5)
    return tex(c)
  }
  function texTapis() { // tapis rouge sombre, liseré doré, losanges
    const [c, g] = cv(256, 160)
    g.fillStyle = '#6d1a2a'; g.fillRect(0, 0, 256, 160); g.strokeStyle = '#d6a444'; g.lineWidth = 9; g.strokeRect(6, 6, 244, 148); g.strokeStyle = '#3a0c16'; g.lineWidth = 4; g.strokeRect(20, 20, 216, 120)
    g.fillStyle = '#a02b3c'; for (let i = 0; i < 6; i++) { const x = 36 + i * 36; g.beginPath(); g.moveTo(x, 80); g.lineTo(x + 18, 50); g.lineTo(x + 36, 80); g.lineTo(x + 18, 110); g.fill() }
    g.strokeStyle = '#d6a444'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { const x = 36 + i * 36; g.beginPath(); g.moveTo(x, 80); g.lineTo(x + 18, 50); g.lineTo(x + 36, 80); g.lineTo(x + 18, 110); g.closePath(); g.stroke() }
    return tex(c)
  }
  function texToile() { // toile d'araignée (alpha)
    const [c, g] = cv(128, 128), al = M.alea(8)
    g.strokeStyle = 'rgba(235,235,255,.75)'; g.lineWidth = 1.2
    for (let i = 0; i < 9; i++) { const a = i / 9 * PI * .5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 170, Math.sin(a) * 170); g.stroke() }
    for (let r = 14; r < 140; r += 15 + al() * 6) { g.beginPath(); for (let i = 0; i <= 9; i++) { const a = i / 9 * PI * .5, rr = r * (.88 + .12 * (i % 2)); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) } g.stroke() }
    return tex(c)
  }
  function texMini() { // petit fantôme pour le bocal
    const [c, g] = cv(128, 128)
    g.fillStyle = '#7dffd6'; g.beginPath(); g.moveTo(24, 112); g.bezierCurveTo(14, 20, 114, 20, 104, 112); g.quadraticCurveTo(90, 96, 78, 112); g.quadraticCurveTo(64, 96, 52, 112); g.quadraticCurveTo(38, 96, 24, 112); g.fill()
    g.fillStyle = '#ffe23f'; ;[-1, 1].forEach((q) => { g.beginPath(); g.ellipse(64 + q * 20, 56, 11, 13, q * .3, 0, 7); g.fill(); g.fillStyle = '#160822'; g.beginPath(); g.ellipse(64 + q * 20, 58, 3, 9, 0, 0, 7); g.fill(); g.fillStyle = '#ffe23f' })
    g.fillStyle = '#340a52'; g.beginPath(); g.ellipse(64, 84, 18, 9, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(52, 76, 5, 7); g.fillRect(71, 76, 5, 7)
    return tex(c)
  }

  G.monde = function () {
    // le monde précédent (visite antérieure) n'est plus utilisé : on rend ses tampons au GPU (les textures partagées, elles, restent)
    if (G._prec) { G._prec.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()) }); G._prec = null }
    const s = new THREE.Scene(), r = M.alea(9)
    s.background = new THREE.Color('#150c26'); s.fog = new THREE.Fog('#2a1440', 22, 64)
    const T = M.peintre
    const toon = (c, o) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad }, o || {}))
    const toonT = (map, o) => new THREE.MeshToonMaterial(Object.assign({ map, color: '#ffffff', gradientMap: grad }, o || {}))
    const base = (c) => new THREE.MeshBasicMaterial({ color: c })
    const ombre = (m) => { m.castShadow = true; m.receiveShadow = true; return m }
    const boite = (w, h, d, mat, x, y, z, par) => { const m = ombre(new THREE.Mesh(new THREE.BoxBufferGeometry(w, h, d), mat)); m.position.set(x, y, z); (par || s).add(m); return m }
    const cyl = (rt, rb, h, mat, x, y, z, par, seg) => { const m = ombre(new THREE.Mesh(new THREE.CylinderBufferGeometry(rt, rb, h, seg || 12), mat)); m.position.set(x, y, z); (par || s).add(m); return m }
    function uvMonde(g, k) { // UV en mètres du monde
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
      for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v; if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i) } else if (ay >= az) { u = p.getX(i); v = p.getZ(i) } else { u = p.getX(i); v = p.getY(i) } uv.setXY(i, u * k, v * k) }
      uv.needsUpdate = true; return g
    }
    const boiteT = (w, h, d, mat, x, y, z, k, par) => { const g = new THREE.BoxBufferGeometry(w, h, d); uvMonde(g, k); const m = ombre(new THREE.Mesh(g, mat)); m.position.set(x, y, z); (par || s).add(m); return m }

    /* ---- matériaux ---- */
    const tSol = T.planches({ taille: 512, planches: 6, vertical: true, pal: ['#7a5138', '#684330', '#865a40', '#573a29'], graine: 41, noeuds: .5, repeat: [8, 8.7] })
    const mMur = toonT(T.planches({ taille: 512, planches: 8, vertical: true, pal: ['#6a3f92', '#5b3480', '#7a4aa0', '#4e2c76'], graine: 44, noeuds: .35 }))
    const mToit = toonT(T.planches({ taille: 512, planches: 6, pal: ['#3b2b42', '#30233a', '#46334d', '#2a1f33'], graine: 47, noeuds: .3 }), { side: THREE.DoubleSide })
    const mPoutre = toonT(T.planches({ taille: 256, planches: 2, pal: ['#4a3230', '#3f2a2c', '#553a36'], graine: 50, noeuds: .25 }))
    const mBois = toonT(T.planches({ taille: 256, planches: 4, pal: ['#6a4a34', '#5a3d2a', '#7a5638'], graine: 31, noeuds: .3 }))
    const mFer = toon('#241a26'), mCire = toon('#efe2c0'), mDoré = toon('#b78a34')

    /* ---- lumières : lune directionnelle (traverse la fenêtre), ciel violet, bougies chaudes, porte verte, fantôme ---- */
    const hemi = new THREE.HemisphereLight('#9a68cc', '#2f1a48', .72); s.add(hemi)
    const lune = new THREE.DirectionalLight('#93aaff', 1.3); lune.position.set(16, 12, -18); lune.target.position.set(-1, 0, -4); lune.castShadow = true; lune.shadow.mapSize.set(2048, 2048)
    Object.assign(lune.shadow.camera, { left: -17, right: 17, top: 15, bottom: -15, near: 1, far: 70 }); lune.shadow.bias = -.0006; lune.shadow.normalBias = .04; s.add(lune); s.add(lune.target)
    const pl = (col, I, d, x, y, z) => { const l = new THREE.PointLight(col, I, d, 2); l.position.set(x, y, z); s.add(l); return l }
    const lumLustre = pl('#ff9c45', 3.2, 19, -2.2, 5.4, -1.5), lumCommode = pl('#ff9c45', 2.8, 12, -10.0, 3.4, -2.4), lumTable = pl('#ff9c45', 2.4, 12, 9.6, 2.5, -6.8), lumPorte = pl('#39ff9a', 2.4, 12, -8.2, 1.9, -13.4)
    const lumFantome = pl('#40ffc0', 0, 16, 0, 2.3, -5)

    /* ---- charpente : sol, murs, pignon, toit, poutres ---- */
    const X0 = -12, X1 = 12, Z0 = -15, Z1 = 11, EAVE = 4, FAITE = 9.8
    /* ---- sol : UN SEUL PLAN. Quatre matériaux (planches claires, planches sombres, poussière, bois usé) sont rangés dans un tableau de textures
     * (couleur en RGB, hauteur en alpha) ; une carte RGBA en coordonnées monde dose leur mélange (éclaboussures) ; la profondeur des joints vient d'un POM. ---- */
    const TS = 512
    function couche(graine, type) { // renvoie l'image RGBA (alpha = hauteur) d'un matériau, tuile de 3 m : six planches de 50 cm dans le sens de la profondeur
      const al = M.alea(graine), [c, g] = cv(TS, TS), [ch, gh] = cv(TS, TS)
      const pal = [['#8a5b3e', '#7a4f36', '#96684a', '#6c4530'], ['#4e3428', '#43301f', '#5a3d2c', '#3a2a20'], ['#5d504a', '#4d423d', '#685850'], ['#b0794f', '#bd8659', '#a3704a']][type]
      const n = 6, pw = TS / n
      g.fillStyle = '#1c100a'; g.fillRect(0, 0, TS, TS); gh.fillStyle = '#000'; gh.fillRect(0, 0, TS, TS)
      for (let i = 0; i < n; i++) {
        const x0 = i * pw, base = M.clair(pal[(al() * pal.length) | 0], (al() - .5) * .16)
        let y = -al() * 220
        while (y < TS) {
          const L = 150 + al() * 250, y1 = Math.min(TS, y + L), ya = Math.max(0, y), col = M.clair(base, (al() - .5) * .1)
          g.fillStyle = col; g.fillRect(x0 + 3, ya + 2, pw - 6, y1 - ya - 4)
          for (let k = 0; k < 24; k++) { const xx = x0 + 6 + al() * (pw - 12); g.strokeStyle = al() < .5 ? M.rgba(M.clair(col, -.38), .3) : M.rgba(M.clair(col, .25), .2); g.lineWidth = .8 + al() * 1.6; g.beginPath(); g.moveTo(xx, ya + 3); g.lineTo(xx + (al() - .5) * 6, y1 - 3); g.stroke() }
          if (type !== 2 && al() < .3) { const kx = x0 + pw * (.3 + al() * .4), ky = ya + (y1 - ya) * (.25 + al() * .5); g.fillStyle = M.rgba(M.clair(col, -.45), .8); g.beginPath(); g.ellipse(kx, ky, 6 + al() * 4, 9 + al() * 5, 0, 0, 7); g.fill() }
          ;[.1, .9].forEach((u) => { const ny = ya + (y1 - ya) * u; if (ny > 3 && ny < TS - 3) { g.fillStyle = '#20140e'; g.beginPath(); g.arc(x0 + 12, ny, 2.2, 0, 7); g.arc(x0 + pw - 12, ny, 2.2, 0, 7); g.fill() } })
          // relief : dessus bombé, joints en creux (les bouts de planches aussi)
          const gr = gh.createLinearGradient(x0 + 3, 0, x0 + pw - 3, 0); gr.addColorStop(0, '#585858'); gr.addColorStop(.1, type === 2 ? '#b0b0b0' : '#e6e6e6'); gr.addColorStop(.9, type === 2 ? '#b0b0b0' : '#e6e6e6'); gr.addColorStop(1, '#585858')
          gh.fillStyle = gr; gh.fillRect(x0 + 3, ya + 2, pw - 6, y1 - ya - 4)
          for (let k = 0; k < 16; k++) { const xx = x0 + 6 + al() * (pw - 12); gh.strokeStyle = 'rgba(0,0,0,.18)'; gh.lineWidth = 1 + al() * 1.2; gh.beginPath(); gh.moveTo(xx, ya + 3); gh.lineTo(xx, y1 - 3); gh.stroke() }
          y = y1
        }
      }
      for (let k = 0; k < TS * TS / 70; k++) { g.fillStyle = al() < .5 ? 'rgba(255,235,205,.05)' : 'rgba(15,6,20,.07)'; g.fillRect(al() * TS, al() * TS, 1 + al() * 3, 1 + al() * 3) }
      if (type === 2) { g.globalAlpha = .55; g.fillStyle = '#4a4038'; g.fillRect(0, 0, TS, TS); g.globalAlpha = 1 }
      if (type === 3) for (let k = 0; k < 60; k++) { const x = al() * TS, y = al() * TS; g.strokeStyle = 'rgba(255,225,190,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (al() - .5) * 60, y + (al() - .5) * 40); g.stroke() }
      const cd = g.getImageData(0, 0, TS, TS), hd = gh.getImageData(0, 0, TS, TS)
      for (let i = 0; i < TS * TS; i++) cd.data[i * 4 + 3] = hd.data[i * 4]
      return cd.data
    }
    const arr = new Uint8Array(TS * TS * 4 * 4); for (let k = 0; k < 4; k++) arr.set(couche(70 + k * 13, k), k * TS * TS * 4)
    const TLAY = new THREE.DataTexture2DArray(arr, TS, TS, 4); TLAY.format = THREE.RGBAFormat; TLAY.type = THREE.UnsignedByteType; TLAY.wrapS = TLAY.wrapT = THREE.RepeatWrapping
    TLAY.minFilter = THREE.LinearMipmapLinearFilter; TLAY.magFilter = THREE.LinearFilter; TLAY.generateMipmaps = true; TLAY.needsUpdate = true
    const SP = 256, spl = new Uint8Array(SP * SP * 4), FW = X1 - X0 + .4, FD = Z1 - Z0, fx0 = X0 - .2
    for (let j = 0; j < SP; j++) for (let i = 0; i < SP; i++) {
      const x = fx0 + (i + .5) / SP * FW, z = Z0 + (j + .5) / SP * FD, pl = Math.floor(x / .5), seg = Math.floor(z / 2.6 + pl * .37)
      const hs = M.bruit2(pl * 3.1 + 7, seg * 1.7 + 2), sombre = hs > .62 ? 1 : 0
      const mur = Math.min(x - fx0, fx0 + FW - x, z - Z0, Z1 - z), bord = Math.max(0, 1 - mur / 2.2), fb = M.fbm2(x * .5 + 3, z * .5 - 4)
      const poussiere = Math.min(1, bord * bord * 1.4 * fb * 1.6 + Math.max(0, fb - .68) * 3)
      const chemin = Math.exp(-((x + .5) * (x + .5) / 14 + (z + 2) * (z + 2) / 90)), use = Math.max(0, M.fbm2(x * .9 - 8, z * .35 + 2) - .35) * 2.4 * chemin
      const k = (j * SP + i) * 4
      spl[k] = sombre * 255 * (1 - poussiere); spl[k + 1] = Math.min(255, poussiere * 255); spl[k + 2] = Math.min(255, use * 255); spl[k + 3] = 255
    }
    const TSPL = new THREE.DataTexture(spl, SP, SP, THREE.RGBAFormat); TSPL.magFilter = THREE.LinearFilter; TSPL.minFilter = THREE.LinearFilter; TSPL.generateMipmaps = false; TSPL.needsUpdate = true
    const PU = { tLay: { value: TLAY }, tSplat: { value: TSPL }, uFloor: { value: new THREE.Vector4(fx0, Z0, FW, FD) } }
    const POM_FUNCS = `uniform highp sampler2DArray tLay; uniform sampler2D tSplat; uniform vec4 uFloor;
      vec4 pmLay(vec4 w, vec2 uv, float lod){ return textureLod(tLay, vec3(uv, 0.), lod) * w.x + textureLod(tLay, vec3(uv, 1.), lod) * w.y + textureLod(tLay, vec3(uv, 2.), lod) * w.z + textureLod(tLay, vec3(uv, 3.), lod) * w.w; }\n`
    const POM_MAP = `{ vec4 pmS = texture2D(tSplat, (vGW.xz - uFloor.xy) / uFloor.zw);
        vec4 pmW = vec4(max(0., 1. - pmS.r - pmS.g - pmS.b), pmS.rgb); pmW /= max(dot(pmW, vec4(1.)), 1e-3);
        vec3 pmV = normalize(cameraPosition - vGW); vec2 pmUv0 = vGW.xz / 3.;
        vec2 pmDx = dFdx(pmUv0) * 512., pmDy = dFdy(pmUv0) * 512.; float pmLod = clamp(.5 * log2(max(max(dot(pmDx, pmDx), dot(pmDy, pmDy)), 1.)), 0., 6.);
        vec2 pmD = pmV.xz / max(pmV.y, .14) * (.055 / 3.); float pmLd = 1. / 14.;
        float pmCur = 0.; vec2 pmUv = pmUv0; float pmDm = 1. - pmLay(pmW, pmUv, pmLod).a;
        for (int i = 0; i < 14; i++) { if (pmCur >= pmDm) break; pmUv -= pmD * pmLd; pmDm = 1. - pmLay(pmW, pmUv, pmLod).a; pmCur += pmLd; }
        vec2 pmPrev = pmUv + pmD * pmLd; float pmAft = pmDm - pmCur, pmBef = (1. - pmLay(pmW, pmPrev, pmLod).a) - pmCur + pmLd;
        pmUv = mix(pmUv, pmPrev, clamp(pmAft / (pmAft - pmBef + 1e-4), 0., 1.));
        vec4 pmC = pmLay(pmW, pmUv, pmLod);
        diffuseColor.rgb *= pmC.rgb * mix(.5, 1.08, pmC.a); }`
    const sol = new THREE.Mesh(new THREE.PlaneBufferGeometry(X1 - X0 + .4, Z1 - Z0), toonT(tSol)); sol.rotation.x = -PI / 2; sol.position.set(0, 0, (Z0 + Z1) / 2); sol.receiveShadow = true; s.add(sol)
    { // reflet du fantôme sur le parquet ciré : un éclat étiré vers la caméra, calculé dans le fragment
      const gU = { uGP: { value: V3(0, 3, -5) }, uGC: { value: new THREE.Color('#40ffc0') }, uGI: { value: 0 } }; G._gU = gU
      const m0 = THREE.Material.prototype.onBeforeCompile
      sol.material.onBeforeCompile = function (sh, rdr) {
        if (m0) m0.call(this, sh, rdr)
        Object.assign(sh.uniforms, gU, PU)
        sh.vertexShader = 'varying vec3 vGW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vGW = (modelMatrix * vec4(transformed, 1.)).xyz;')
        sh.fragmentShader = 'varying vec3 vGW; uniform vec3 uGP; uniform vec3 uGC; uniform float uGI;\n' + sh.fragmentShader.replace('#include <map_fragment>', POM_MAP).replace('void main() {', POM_FUNCS + 'void main() {').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { vec3 V = normalize(cameraPosition - vGW); vec3 Rr = reflect(-V, vec3(0., 1., 0.)); vec3 gm = vec3(uGP.x, -uGP.y, uGP.z) - vGW;
            float al = max(dot(normalize(gm), Rr), 0.); float lum = dot(diffuseColor.rgb, vec3(.33));
            totalEmissiveRadiance += uGC * pow(al, 26.) * uGI * (.25 + lum * 2.2) * (1. / (1. + length(gm.xz) * .05)); }`)
      }
    }
    const tapis = new THREE.Mesh(new THREE.PlaneBufferGeometry(9.6, 6), toonT(texTapis())); tapis.rotation.x = -PI / 2; tapis.rotation.z = .05; tapis.position.set(-.6, .015, -2.4); tapis.receiveShadow = true; s.add(tapis)
    { // pignon du fond (polygone extrudé) et murs latéraux
      const sh = new THREE.Shape(); sh.moveTo(X0, 0); sh.lineTo(X1, 0); sh.lineTo(X1, EAVE); sh.lineTo(0, FAITE); sh.lineTo(X0, EAVE); sh.closePath()
      const g = new THREE.ExtrudeBufferGeometry(sh, { depth: .5, bevelEnabled: false }); g.translate(0, 0, Z0 - .5); g.computeVertexNormals(); uvMonde(g, 1 / 4)
      const m = ombre(new THREE.Mesh(g, mMur)); s.add(m)
      ;[-1, 1].forEach((q) => { boiteT(.5, EAVE, Z1 - Z0, mMur, q * (X1 + .25), EAVE / 2, (Z0 + Z1) / 2, 1 / 4) })
      boiteT(X1 - X0, EAVE, .5, mMur, 0, EAVE / 2, Z1 + .25, 1 / 4)
      const al = Math.atan2(FAITE - EAVE, X1), L = Math.hypot(X1, FAITE - EAVE)
      ;[-1, 1].forEach((q) => { const g2 = new THREE.PlaneBufferGeometry(L + .6, Z1 - Z0 + .6); g2.rotateX(-PI / 2); const t = new THREE.Mesh(g2, mToit); t.material.map.repeat.set(3, 4); t.rotation.z = -q * al; t.position.set(q * X1 / 2, (EAVE + FAITE) / 2 + .02, (Z0 + Z1) / 2); t.receiveShadow = true; s.add(t) })
      // soubassement en lambris foncé sur le pourtour
      boiteT(X1 - X0, 1.1, .2, mPoutre, 0, .55, Z0 + .1, 1 / 3); ;[-1, 1].forEach((q) => boiteT(.2, 1.1, Z1 - Z0, mPoutre, q * (X1 - .1), .55, (Z0 + Z1) / 2, 1 / 3))
    }
    { // poutres : faîtière, chevrons, entraits, poteaux et jambes de force
      const al = Math.atan2(FAITE - EAVE, X1), L = Math.hypot(X1, FAITE - EAVE)
      boite(.5, .5, Z1 - Z0, mPoutre, 0, FAITE - .3, (Z0 + Z1) / 2)
      ;[-13, -9, -5, -1, 3, 7, 10.5].forEach((z, i) => {
        ;[-1, 1].forEach((q) => { const b = boite(L, .32, .34, mPoutre, q * X1 / 2, (EAVE + FAITE) / 2 - .2, z); b.rotation.z = -q * al })
        if (i % 2 === 0) { boite(X1 * .9, .36, .36, mPoutre, 0, 7.3, z); boite(.3, 2.6, .3, mPoutre, 0, 8.6, z) }
      })
      ;[-9, -1, 6].forEach((z) => [-1, 1].forEach((q) => { boite(.42, EAVE + .2, .42, mPoutre, q * 7.4, EAVE / 2, z); const br = boite(.24, 2.6, .24, mPoutre, q * 6.5, 5.1, z); br.rotation.z = q * .8 }))
    }

    /* ---- fenêtre en ogive (fond droit) : nuit bleue, meneaux, appui ; la lune en vient ---- */
    { const fx = 6.8, W = 3.4, H = 5.2, RA = W / 2, g = new THREE.Group(); g.position.set(fx, 1.5, Z0 + .02); s.add(g)
      const sh = new THREE.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, H - RA); sh.absarc(0, H - RA, RA, 0, PI, false); sh.lineTo(-W / 2, 0)
      const geo = new THREE.ShapeBufferGeometry(sh, 16), p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, p.getY(i) / H)
      const vitre = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texFenetre(), fog: false })); vitre.position.z = .05; g.add(vitre)
      const cad = toon('#3c2a3a'); boite(.24, H - RA + .1, .3, cad, -W / 2 - .1, (H - RA) / 2, .1, g); boite(.24, H - RA + .1, .3, cad, W / 2 + .1, (H - RA) / 2, .1, g)
      const arc = new THREE.Mesh(new THREE.TorusBufferGeometry(RA + .1, .12, 8, 28, PI), cad); arc.position.set(0, H - RA, .1); g.add(arc)
      boite(W + .7, .22, .5, cad, 0, -.05, .2, g); boite(.1, H - .1, .16, cad, 0, (H - RA) / 2 + .2, .12, g); boite(W, .1, .16, cad, 0, 2.2, .12, g); boite(W, .1, .16, cad, 0, 3.6, .12, g)
      // faisceau de lune (additif, très discret) qui descend en diagonale
      const [c, gg] = cv(64, 256), gr = gg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(150,170,255,.55)'); gr.addColorStop(1, 'rgba(150,170,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 256)
      const fais = new THREE.Mesh(new THREE.PlaneBufferGeometry(3.6, 15), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }))
      fais.position.set(fx - 5, 4.4, Z0 + 5); fais.rotation.set(-.35, .35, .55); fais.geometry.translate(0, -7.5, 0); s.add(fais); G._fais = fais
    }
    /* ---- porte du fond à gauche : lueur verte de la salle du piège ---- */
    { const px = -8.2, g = new THREE.Group(); g.position.set(px, 0, Z0 + .02); s.add(g)
      const cad = toon('#33222f'); boite(.3, 3.9, .34, cad, -1.25, 1.95, .12, g); boite(.3, 3.9, .34, cad, 1.25, 1.95, .12, g); boite(2.8, .32, .34, cad, 0, 3.9, .12, g); boite(2.8, .16, .5, cad, 0, 0, .2, g)
      const [c, gg] = cv(64, 128), gr = gg.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#0c6a48'); gr.addColorStop(1, '#5dffb0'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 128)
      const v = new THREE.Mesh(new THREE.PlaneBufferGeometry(2.2, 3.7), new THREE.MeshBasicMaterial({ map: tex(c), fog: false })); v.position.set(0, 1.85, .05); g.add(v)
      const flaque = new THREE.Mesh(new THREE.PlaneBufferGeometry(7, 4), new THREE.MeshBasicMaterial({ map: T.halo(), color: '#39ff9a', transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); flaque.rotation.x = -PI / 2; flaque.position.set(0, .03, 1.9); g.add(flaque)
    }

    /* ---- décor : portrait, lustres, bougies, meubles, caisses, bocal-piège ---- */
    const flammes = [], HALO = T.halo()
    function barre(a, b, rr, mat, par) { const d = b.clone().sub(a), L = d.length(), m = new THREE.Mesh(new THREE.CylinderBufferGeometry(rr, rr, L, 5), mat); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); (par || s).add(m); return m }
    function bougie(x, y, z, h, par, gros) {
      const g = new THREE.Group(); g.position.set(x, y, z); (par || s).add(g)
      cyl(.055 * (gros || 1), .065 * (gros || 1), h, mCire, 0, h / 2, 0, g, 8)
      const goutte = cyl(.075 * (gros || 1), .07 * (gros || 1), h * .12, mCire, 0, h * .96, 0, g, 8); goutte.scale.set(1, 1, 1)
      const fl = new THREE.Mesh(new THREE.ConeBufferGeometry(.045, .14, 6), base('#ffd27a')); fl.position.y = h + .08; g.add(fl)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO, color: '#ffab52', transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.scale.setScalar(.75); sp.position.y = h + .1; g.add(sp)
      flammes.push({ fl, sp, ph: r() * 6 }); return g
    }
    function lustre(x, y, z, R, n) {
      const g = new THREE.Group(); g.position.set(x, y, z); s.add(g)
      const ring = new THREE.Mesh(new THREE.TorusBufferGeometry(R, .06, 8, 32), mFer); ring.rotation.x = PI / 2; g.add(ring); const r2 = new THREE.Mesh(new THREE.TorusBufferGeometry(R * .55, .04, 6, 24), mFer); r2.rotation.x = PI / 2; r2.position.y = .25; g.add(r2)
      const H = FAITE - .3 - y
      cyl(.03, .03, H, mFer, 0, H / 2 + .4, 0, g, 6); cyl(.12, .06, .3, mFer, 0, .3, 0, g, 8); const ball = new THREE.Mesh(new THREE.SphereBufferGeometry(.1, 8, 6), mFer); ball.position.y = -.3; g.add(ball)
      for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; barre(V3(Math.cos(a) * R, 0, Math.sin(a) * R), V3(0, 1.4, 0), .014, mFer, g) }
      for (let i = 0; i < n; i++) { const a = i / n * PI * 2; bougie(Math.cos(a) * R, .04, Math.sin(a) * R, .34, g, 1.1) }
      g.userData.ph = r() * 6; return g
    }
    const lustres = [lustre(-2.2, 6.3, -1.5, 1.5, 7), lustre(4.2, 6.7, -9, 1.1, 6)]
    { // portrait à cadre doré sur le mur de gauche
      const g = new THREE.Group(); g.position.set(X0 + .02, 5.4, -5); g.rotation.y = PI / 2; s.add(g)
      boite(2.9, 3.9, .22, mDoré, 0, 0, .05, g); const toile = new THREE.Mesh(new THREE.PlaneBufferGeometry(2.4, 3.4), new THREE.MeshBasicMaterial({ map: texPortrait(), color: '#9a90a6' })); toile.position.z = .18; g.add(toile)
      boite(3.1, .12, .34, mDoré, 0, 2.02, .1, g); boite(3.1, .12, .34, mDoré, 0, -2.02, .1, g)
    }
    { // commode à tiroirs et bougies (gauche)
      const g = new THREE.Group(); g.position.set(X0 + 1.05, 0, -2.4); g.rotation.y = PI / 2; s.add(g)
      boiteT(3.4, 2.5, 1.7, mBois, 0, 1.25, 0, 1 / 2, g); boite(3.6, .16, 1.9, mPoutre, 0, 2.55, 0, g)
      for (let i = 0; i < 3; i++) { boite(1.5, .62, .06, toon('#4a3126'), -.85, .45 + i * .75, .87, g); boite(1.5, .62, .06, toon('#4a3126'), .85, .45 + i * .75, .87, g); cyl(.05, .05, .1, mDoré, -.85, .45 + i * .75, .93, g, 8).rotation.x = PI / 2; cyl(.05, .05, .1, mDoré, .85, .45 + i * .75, .93, g, 8).rotation.x = PI / 2 }
      bougie(-.7, 2.63, .1, .5, g, 1.4); bougie(-.25, 2.63, -.25, .3, g); bougie(.9, 2.63, .2, .42, g, 1.2)
    }
    const caisse = (x, y, z, w, h, d, ry) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; s.add(g); boiteT(w, h, d, mBois, 0, h / 2, 0, 1 / 2, g); ;[-1, 1].forEach((q) => { boite(w + .06, .1, d + .06, mFer, 0, h / 2 + q * h * .4, 0, g); boite(.1, h + .06, d + .06, mFer, q * w * .42, h / 2, 0, g) }); return g }
    caisse(X0 + 1.4, 0, -6.6, 2.4, 2.4, 2.4, .15); caisse(X0 + 1.5, 2.4, -6.4, 1.6, 1.5, 1.6, -.25); caisse(X1 - 1.5, 0, -11, 2.6, 2.6, 2.4, -.1); caisse(X1 - 1.4, 2.6, -10.8, 1.8, 1.3, 1.8, .2); caisse(-3.5, 0, -12.9, 2, 1.6, 1.5, .1)
    caisse(X0 + 1.8, 0, 6.2, 3.2, 3.2, 3.2, .1); caisse(X0 + 1.7, 3.2, 6.6, 2, 1.6, 2, -.3); caisse(X1 - 1.6, 0, 5.6, 2.8, 2.8, 2.8, -.12)
    { // table de droite, chaise, bocal-piège, livres, bougies
      const g = new THREE.Group(); g.position.set(X1 - 1.8, 0, -6.4); g.rotation.y = -PI / 2; s.add(g)
      boite(3.6, .18, 1.9, mPoutre, 0, 1.62, 0, g); ;[[-1.6, -.8], [1.6, -.8], [-1.6, .8], [1.6, .8]].forEach(([x, z]) => boite(.2, 1.6, .2, mPoutre, x, .8, z, g))
      boite(3.2, .12, 1.5, mBois, 0, .85, 0, g)
      const ch = new THREE.Group(); ch.position.set(X1 - 3.4, 0, -3.6); ch.rotation.y = -.5; s.add(ch); boite(.9, .1, .9, mBois, 0, .9, 0, ch); boite(.9, 1.1, .1, mBois, 0, 1.5, -.42, ch); ;[[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]].forEach(([x, z]) => boite(.09, .9, .09, mPoutre, x, .45, z, ch))
      // le piège : un bocal de verre, couvercle rouge, capuchon de laiton (comme sur l'illustration)
      const j = new THREE.Group(); j.position.set(.2, 1.71, .1); g.add(j)
      const verre = new THREE.Mesh(new THREE.CylinderBufferGeometry(.42, .42, 1.1, 20), new THREE.MeshToonMaterial({ color: '#c9f1ea', transparent: true, opacity: .32, depthWrite: false, gradientMap: grad })); verre.position.y = .55; j.add(verre)
      const contenu = new THREE.Mesh(new THREE.CylinderBufferGeometry(.34, .34, .9, 16), new THREE.MeshBasicMaterial({ color: '#0b7a5a', transparent: true, opacity: .8 })); contenu.position.y = .5; j.add(contenu)
      const mini = new THREE.Sprite(new THREE.SpriteMaterial({ map: texMini(), transparent: true, opacity: 0, depthWrite: false, depthTest: false })); mini.scale.set(1.05, 1.05, 1); mini.position.y = .6; mini.renderOrder = 30; j.add(mini)
      cyl(.46, .46, .12, toon('#d43a2f'), 0, 1.15, 0, j, 20); cyl(.16, .2, .26, mDoré, 0, 1.36, 0, j, 12); cyl(.05, .05, .42, mDoré, 0, 1.66, 0, j, 8)
      const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO, color: '#39ff9a', transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); hl.scale.setScalar(2.4); hl.position.y = .6; j.add(hl)
      j.updateMatrixWorld(true); G._piege = { j, contenu, mini, hl, bouche: null }
      boite(.9, .16, .6, toon('#7a2a3a'), -1.1, 1.79, .3, g); boite(.8, .14, .55, toon('#2e5a8a'), -1.05, 1.94, .28, g).rotation.y = .3; bougie(-1.3, 1.71, -.4, .5, g, 1.3); bougie(1.2, 1.71, .55, .32, g)
    }
    { // meuble sous un drap au fond gauche
      const g = new THREE.Group(); g.position.set(-5.2, 0, -12.6); s.add(g)
      const geo = new THREE.BoxBufferGeometry(2.6, 2.4, 1.6, 10, 10, 6), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = M.fbm2(x * 2 + 5, z * 2 + y) - .5; if (y > -1.15) { p.setX(i, x * (1 + k * .1) * (1 + Math.max(0, y) * .04)); p.setZ(i, z * (1 + k * .1)); p.setY(i, y + Math.abs(x) * -.12 * (y > 0 ? 1 : 0)) } }
      geo.computeVertexNormals(); const dr = ombre(new THREE.Mesh(geo, toon('#cfc8e2'))); dr.position.y = 1.2; g.add(dr)
    }
    ;[[X0 + .3, 8.2, Z0 + .3, 0, 1.6], [X1 - .3, 4.1, Z0 + .3, PI / 2, 1.4], [-2, 9.3, Z0 + .3, -PI / 2, 1.2]].forEach(([x, y, z, rz, sz]) => { const t = new THREE.Mesh(new THREE.PlaneBufferGeometry(sz * 2.4, sz * 2.4), new THREE.MeshBasicMaterial({ map: texToile(), transparent: true, depthWrite: false, fog: false, opacity: .8 })); t.position.set(x, y, z); t.rotation.z = rz; t.geometry.translate(sz * 1.2, sz * 1.2, 0); s.add(t) })
    // bocaux, bouteilles et livres pour habiller les surfaces
    ;[[-9.6, 2.7, -3.9, .22, .55], [-9.5, 2.7, -.8, .16, .4]].forEach(([x, y, z, rr, h]) => { const j = new THREE.Mesh(new THREE.CylinderBufferGeometry(rr, rr, h, 12), new THREE.MeshToonMaterial({ color: '#8ee6b8', transparent: true, opacity: .55, depthWrite: false, gradientMap: grad })); j.position.set(x, y + h / 2, z); s.add(j) })

    ;[[-2.2, -1.5, 5.6, .2], [4.2, -9, 4, .16], [-9.2, -2.4, 4.2, .2], [9.2, -6.6, 4.2, .18]].forEach(([x, z, rr, op]) => { const m = new THREE.Mesh(new THREE.PlaneBufferGeometry(rr * 2, rr * 2), new THREE.MeshBasicMaterial({ map: HALO, color: '#ff9a44', transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.rotation.x = -PI / 2; m.position.set(x, .03, z); s.add(m) })
    /* ---- personnages : Dylan (le vrai modèle), Boulon ---- */
    const PAL = { skin: '#dca070', nose: '#c98a5c', shirt: '#efe4c8', sleeve: '#e8681c', vest: '#e8681c', stripe: '#f2e6c4', pants: '#5fa4d0', belt: '#3a2210', shoe: '#28284c', sole: '#efe0b8', hair: '#2e1c12', hat: '#dba02a', white: '#ffffff', pupil: '#1c1a2a', mouth: '#6a2418', stubble: '#c99472' }
    let dy = null; try { dy = typeof toonFromGLB === 'function' ? toonFromGLB('dylan', PAL, .74) : null } catch (e) { dy = null }
    if (!dy) dy = makeDylan(); else if (window.TALAS_DA && TALAS_DA.on && TALAS_DA.cartoon) dy = TALAS_DA.cartoon(dy, 'dylan')
    dy.position.set(0, 0, 2.2); dy.rotation.y = PI; s.add(dy); dy.traverse((o) => { if (o.isMesh && !o.userData.ink) o.castShadow = true })
    const bo = makeBoulon(); bo.scale.setScalar(.62); bo.position.set(-5.4, 2.6, 0.4); bo.rotation.y = .4; s.add(bo)
    const stage = new THREE.Group(); s.add(stage)
    const fx = makeFX(s)

    /* ---- brume au ras du sol, étincelles ---- */
    const K = { fant: 1, refl: 1, brume: 1, warm: 1, lune: 1, hemi: 1 }
    const brume = M.particules({ max: 260, scene: s }), etin = M.particules({ max: 110, scene: s })
    let brT = 0, spT = 0, fumT = 0
    const fantomes = [], camP = V3(0, 3.2, 9.6), camL = V3(0, 2.3, -3), tmpP = V3(0, 0, 0), tmpQ = V3(0, 0, 0)
    let camX = 0

    const W = { scene: s, hd: 1, plainui: 1, noOff: 1, grenier: 1, fov: 52, rendu: 'grenier', clickables: [], look: V3(0, 1, -3), baseD: 19, fitW: 18, boulon: bo, dylan: dy, stage, fx, bobY: 0, keys: 0, t: 0,
      ghostZ: -5.6, home: { dylan: [0, 0, 2.2, PI], boulon: [-5.4, 2.6, 0.4] }, focus: 12, luzFantome: lumFantome,
      clear() { while (stage.children.length) stage.remove(stage.children[0]); W.clickables.length = 0; W.onDown = W.onMove = W.onUp = W.extra = null; W.keys = 0; fantomes.length = 0 },
      /* clic / souris : le point de la vue qui tombe dans le plan de Dylan (x seulement) */
      mouseX(e) { const b = cv0().getBoundingClientRect(); ptr.x = (e.clientX - b.left) / b.width * 2 - 1; ptr.y = -(e.clientY - b.top) / b.height * 2 + 1; ray.setFromCamera(ptr, camera); const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.z) < 1e-4) return null; const t = (2.2 - o.z) / d.z; return t > 0 ? o.clone().addScaledVector(d, t) : null } }
    const cv0 = () => document.getElementById('cv')
    // la lune : pleine puissance sur le fantôme, ~20 % à 6 m, nuages Perlin-Worley
    const posFant = V3(0, 2.3, -5.6)
    W.lune = { pos: () => posFant, rayon: 6.4, plancher: .3, nuages: .55 }

    W.cam = function (dt) {
      const x = dy.position.x; camX += (x * .55 - camX) * Math.min(1, (dt || .016) * 3)
      camera.position.set(camX + Math.sin(W.t * .4) * .07, 4.3 + Math.sin(W.t * .55) * .05, 10)
      camera.lookAt(camX * .6, 2.75, -3.6)
      const ck = W.camK || 0
      if (ck > 0) { const a = ck * ck * (3 - 2 * ck), lp = tmpQ.set(9.9, 2.6, -6.2), cp = camera.position.clone().lerp(V3(3.4, 3.1, -1.6), a); const cl = V3(camX * .6, 2.75, -3.6).lerp(W.camLook || lp, a); camera.position.copy(cp); camera.lookAt(cl) }
      W.focus = camera.position.distanceTo(dy.position) + 2.2
    }

    /* ---- objectif (comme sur l'illustration : bocal-piège + consigne) ---- */
    let hudEl = null
    function hud() {
      const st = document.getElementById('ghudCss') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'ghudCss' }))
      st.textContent = `#ghud{position:absolute;right:10px;top:54px;max-width:46%;display:flex;gap:10px;align-items:center;background:linear-gradient(90deg,rgba(24,14,50,0),rgba(24,14,50,.72) 30%);padding:8px 16px 8px 34px;color:#fff;pointer-events:none;z-index:7;-webkit-text-stroke:.5px #1a0d22;text-shadow:2px 2px 0 #1a0d22;font-family:"Luckiest Guy","Trebuchet MS",sans-serif;transition:opacity .3s}
        #ghud svg{flex:none;width:40px;height:56px;filter:drop-shadow(2px 2px 0 #1a0d22)} #ghud b{display:block;font-size:17px;line-height:1.05;color:#ffe9b0} #ghud span{display:block;font:600 13px/1.2 "Trebuchet MS",sans-serif;-webkit-text-stroke:0;margin-top:3px}`
      const d = document.createElement('div'); d.id = 'ghud'; d.style.opacity = 0
      d.innerHTML = `<svg viewBox="0 0 40 56"><rect x="16" y="2" width="8" height="8" rx="2" fill="#c9a347" stroke="#1a0d22" stroke-width="2.5"/><rect x="7" y="9" width="26" height="8" rx="3" fill="#d43a2f" stroke="#1a0d22" stroke-width="2.5"/><path d="M9 17h22l2 30a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5z" fill="#bff2e6" fill-opacity=".55" stroke="#1a0d22" stroke-width="2.5"/><path d="M14 44c0-10 3-17 6-17s6 7 6 17l-2-2-2 3-2-3-2 3z" fill="#5dffb8" stroke="#1a0d22" stroke-width="1.6"/><circle cx="18" cy="35" r="1.4" fill="#1a0d22"/><circle cx="22" cy="35" r="1.4" fill="#1a0d22"/></svg><div><b>Objectif</b><span>Attrape les documents que le fantôme lance, évite ses pantoufles et enferme-le dans le bocal !</span></div>`
      document.getElementById('frame').append(d)
      const iv = setInterval(() => { if (typeof cur === 'undefined' || cur !== W) { d.remove(); clearInterval(iv) } }, 400)
      return d
    }
    hudEl = hud()

    W.update = function (dt, T) {
      W.t += dt
      // la partie (son code de jeu déplace Dylan, le fantôme, les objets lancés)
      if (W.extra) W.extra(dt, T); else { animPerson(dy, 'idle', T); }
      // Boulon : hélice, regard vers la caméra, petit vol stationnaire
      bo.userData.prop.rotation.y += dt * 9
      { const fy = Math.atan2(camera.position.x - bo.position.x, camera.position.z - bo.position.z); bo.userData.face = fy; if (!bo.userData.busy) { bo.position.y = W.home.boulon[1] + Math.abs(Math.sin(T * 2.4)) * .3; bo.rotation.y += (fy - bo.rotation.y) * Math.min(1, dt * 6) } }
      fx.update(dt)
      // les étiquettes des objets lancés (matériaux non éclairés, blancs) sont adoucies une fois pour ne pas éblouir le bloom
      stage.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.material.map && !o.userData.adouci) { o.userData.adouci = 1; o.material.color.setScalar(.68) } })
      // bougies : vacillement
      flammes.forEach((f) => { const k = 1 + Math.sin(T * 11 + f.ph) * .12 + Math.sin(T * 27 + f.ph * 2) * .06; f.sp.scale.setScalar(.75 * k); f.fl.scale.set(1, k, 1) })
      const vac = .93 + Math.sin(T * 9) * .05 + Math.sin(T * 23) * .03
      lumLustre.intensity = 2 * vac * K.warm; lumCommode.intensity = 1.8 * K.warm * (.94 + Math.sin(T * 10 + 1) * .05); lumTable.intensity = 1.6 * K.warm * (.94 + Math.sin(T * 8.5 + 3) * .05); lune.intensity = .95 * K.lune; hemi.intensity = .6 * K.hemi
      lustres.forEach((l, i) => { l.rotation.z = Math.sin(T * .7 + l.userData.ph) * .012; l.rotation.x = Math.sin(T * .55 + l.userData.ph) * .012 })
      lumPorte.intensity = (1.6 + Math.sin(T * 3) * .2) * K.warm
      // fantômes présents : simulation du drap, lumière verte, reflet sur le parquet, fumée
      G._gU.uGI.value = 0; lumFantome.intensity = 0
      for (let i = fantomes.length - 1; i >= 0; i--) {
        const gh = fantomes[i]; if (!gh.parent) { fantomes.splice(i, 1); continue }
        gh.userData.tick(dt, T); gh.getWorldPosition(posFant)
        { const lg = gh.userData.laugh > 0; if (lg && !gh.userData._l && window.TALAS_SON) TALAS_SON.rire(); gh.userData._l = lg }
        if (gh.visible) {
          const k = clamp(gh.scale.x, 0, 1)
          lumFantome.position.copy(posFant); lumFantome.position.z += 1.2; lumFantome.intensity = 1.8 * k * K.fant; G._gU.uGP.value.copy(posFant); G._gU.uGI.value = k * 1.3 * K.refl
          fumT -= dt; if (fumT <= 0 && k > .5) { fumT = .07
            const q = gh.userData.queue()
            etin.emettre({ pos: [q.x + (Math.random() - .5) * .4, q.y + .1, q.z + (Math.random() - .5) * .4], vel: [(Math.random() - .5) * .5, .35 + Math.random() * .3, (Math.random() - .5) * .5], t0: .7, t1: 2.8, c0: '#46f0c0', c1: '#5b3cc8', a0: .32, a1: 0, vie: 2.6, add: .25, grav: .05, vent: 1 })
            brume.emettre({ pos: [posFant.x + (Math.random() - .5) * 2.4, .25 + Math.random() * .4, posFant.z + (Math.random() - .5) * 2.4], vel: [(Math.random() - .5) * .4, .03, (Math.random() - .5) * .4], t0: 3, t1: 6.5, c0: '#57f0d0', c1: '#7a54d8', a0: .3, a1: 0, vie: 6, add: .12, vent: .4 })
            etin.emettre({ pos: [posFant.x + (Math.random() - .5) * 3.4, posFant.y + (Math.random() - .5) * 2.4, posFant.z + (Math.random() - .5) * 2], vel: [0, .25, 0], t0: .12, t1: .05, c0: '#a8fff2', c1: '#5affd0', a0: 1, a1: 0, vie: 1.8, add: 1, vent: .3 })
          }
        }
      }
      // brume générale du grenier
      brT -= dt; if (brT <= 0) { brT = .085; brume.emettre({ pos: [(Math.random() - .5) * 22, .2 + Math.random() * .5, -13 + Math.random() * 19], vel: [(Math.random() - .5) * .3, .02, (Math.random() - .5) * .3], t0: 3.4, t1: 7, c0: '#8a5fe6', c1: '#45c8c0', a0: .3, a1: 0, vie: 10, add: 0, vent: .3 }) }
      // poussières dans le faisceau de lune
      spT -= dt; if (spT <= 0) { spT = .18; etin.emettre({ pos: [3 + Math.random() * 4, 1 + Math.random() * 6, -13 + Math.random() * 6], vel: [-.12, -.08, .12], t0: .09, t1: .05, c0: '#c9d4ff', c1: '#9aa8ff', a0: .7, a1: 0, vie: 4, add: 1, vent: .1 }) }
      const md = lune.position.clone().sub(lune.target.position)
      brume.lumiere(camera, md, new THREE.Color('#7f92e8').multiplyScalar(.55), new THREE.Color('#55429a'), new THREE.Color('#3dffc4')); brume.maj(dt, T, camera)
      etin.lumiere(camera, md, new THREE.Color('#ffffff'), new THREE.Color('#ffffff'), new THREE.Color('#000000')); etin.maj(dt, T, camera)
      // bocal-piège : lueur qui respire
      const pg = G._piege; pg.hl.material.opacity = (.22 + Math.sin(T * 2) * .05) * (pg.mini.material.opacity > 0 ? 2.2 : 1)
      if (hudEl) hudEl.style.opacity = W.extra ? 1 : 0
    }

    W.dbg = { brume, etin, lumFantome, lumLustre, lumCommode, lumTable, lumPorte, hemi, lune, gU: G._gU, k: K }
    /* fantômes créés par le mini-jeu (ghostMesh) : on les enregistre pour la simulation du drap */
    W.adopter = (gh) => { if (fantomes.indexOf(gh) < 0) fantomes.push(gh) }

    /* fin de partie réussie : le fantôme est aspiré dans le bocal ; sinon il s'enfuit par le toit en riant */
    W.capture = async function (gh, ratio, fin) {
      const U = gh.userData, ok = ratio >= .5, pg = G._piege, jar = pg.j.getWorldPosition(V3(0, 0, 0)).add(V3(0, .9, 0))
      W.extra = null
      const p0 = gh.position.clone()
      if (ok) {
        tween(1.2, (k) => { W.camK = k }, E.inOut)
        await tween(.55, (k) => { gh.position.y = p0.y + k * .8; U.b.rotation.z = Math.sin(k * 9) * .2 }, E.inOut)
        const st = gh.position.clone()
        await tween(2.1, (k) => { W.camLook = gh.position.clone().lerp(jar, .3 + .7 * k); const a = k * 8, ra = (1 - k) * 2.6; gh.position.set(mix(st.x, jar.x, k) + Math.cos(a) * ra * (1 - k), mix(st.y, jar.y, k * k) + Math.sin(a * .6) * .5 * (1 - k), mix(st.z, jar.z, k) + Math.sin(a) * ra * (1 - k)); gh.scale.setScalar(Math.max(.06, 1 - k * .94)); U.b.rotation.y = a * .9; if (Math.random() < .5) fx.burst(gh.position.clone(), 1) }, E.inOut)
        gh.visible = false; fx.burst(jar.clone(), 16); beep && beep(660, .25, 'triangle', .05)
        pg.mini.material.opacity = 1; pg.contenu.material.color.set('#20d99a')
        await wait(1300)
        await tween(.8, (k) => { W.camK = 1 - k }, E.inOut); W.camLook = null
      } else {
        U.laugh = 1
        await tween(1.5, (k) => { gh.position.y = p0.y + k * k * 9; gh.position.x = p0.x + Math.sin(k * 6) * 1.2; U.b.rotation.z = Math.sin(k * 12) * .3 }, E.inOut)
        gh.visible = false
      }
      fin()
    }
    G._prec = W
    return W
  }
})()

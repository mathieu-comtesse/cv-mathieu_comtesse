/* LE QUAI DE TALAS : le nouveau village du jeu, un vrai monde 3D à la troisième personne, d'après les illustrations validées.
 * Un ponton de planches, un village de maisons sur pilotis étagé dans la roche, un phare sur son îlot, une eau peinte, un ciel
 * de tourbillons et un cycle jour / nuit (lanternes, fenêtres, brume). Chaque atelier du jeu est une maison ; le phare est la
 * tour de contrôle du verdict. Le monde respecte le contrat du village d'origine (B[n], HUB_TOWER, clickables, fx, boulon…).
 *   ?monde=classique  ou  ?quai=non   -> ancien village en vue aérienne
 * Dépend de : talas-rendu.js (pipeline), talas-monde.js (boîte à outils), talas-ile-nuit.js (cycle jour / nuit). */
(function () {
  'use strict'
  const THREE = window.THREE, M = window.TALAS_MONDE
  if (!THREE || !M) return
  const P = new URLSearchParams(location.search)
  const Q = window.TALAS_QUAI = { on: P.get('monde') !== 'classique' && P.get('quai') !== 'non' && !!(window.TALAS_RENDU && window.TALAS_RENDU.on) }
  if (!Q.on) return
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
  const DECK = 1.05 // dessus des planches du ponton principal (la mer est à 0)

  /* ============================================================================================== TERRAIN */
  /* la roche est construite à partir des terrasses : chaque terrasse est un plateau à falaise raide, sous le plancher où l'on marche */
  const TERRASSES = [ // x, z, rayon x, rayon z, niveau du sol
    [-15, -21, 9, 8, 4.1], [15, -23, 9, 8, 3.1], [0, -41, 11, 7.5, 7.6], [20, -41, 8.5, 7, 8.0], [0, -61, 13, 9, 13.4], [-22, -46, 9, 8, 9.6],
    [-4, -86, 44, 24, 18], [-28, -32, 10, 9, 3.6], [28, -34, 10, 9, 4.5], [-16, -8, 7, 6, .85], [20, -3, 7, 6, .85], [36, -21, 9, 8, 2.2], [-40, -6, 5, 4, 1.5], [54, -8, 5, 4, 1.8],
    [-50, -24, 9, 8, 5], [64, -30, 10, 9, 6], [-62, -50, 12, 10, 8], [-17, 5, 5.5, 5, 1.5]
  ]
  function hauteur(x, z) {
    let h = -4
    for (let i = 0; i < TERRASSES.length; i++) {
      const [cx, cz, rx, rz, y] = TERRASSES[i]
      const d = Math.hypot((x - cx) / rx, (z - cz) / rz)
      const n = (M.fbm2(x * .11 + i * 7.3, z * .11 - i * 3.1) - .5) * 1.4
      const dd = Math.max(0, d - 1) * Math.max(rx, rz) * .5 // distance au bord, en mètres environ
      const detail = sm(.95, 1.35, d) // le sommet des terrasses reste plat sous le plancher ; les falaises sont rugueuses
      const p = y - .32 + n * (d < 1 ? .18 : 1) * (1 + detail) - dd * 1.75 + (M.fbm2(x * .33 + i, z * .33) - .5) * 1.9 * detail + (M.fbm2(x * .8, z * .8 + i) - .5) * .5 * detail
      if (p > h) h = p
    }
    return creuse(x, z, Math.max(h, -4))
  }
  /* ============================================================================================== ESCALIERS */
  /* Chaque volée part du bord d'un plancher et arrive exactement au bord de l'autre (les planchers sont raccourcis en conséquence, voir talas-quai-village.js) :
   * plus de marches enterrées sous un plancher, donc on peut aussi redescendre. La roche est creusée sous la volée (lit de roche, épaulements adoucis). */
  const PLACEY = DECK + .55
  Q.ESC = [
    { id: 'place-ouest',    a: [-6.9, PLACEY, -17.5],  b: [-11.8, 4.1, -19.0], w: 2.3 },
    { id: 'place-est',      a: [6.5, PLACEY, -19.4],   b: [9.6, 3.1, -19.8],   w: 2.3 },
    { id: 'place-centre',   a: [0, PLACEY, -24.35],    b: [0, 7.6, -35.5],     w: 4.2 },
    { id: 'centre-manoir',  a: [0, 7.6, -46.0],        b: [0, 13.4, -55.6],    w: 3.4 },
    { id: 'est-studio',     a: [18, 3.1, -29.0],       b: [18.6, 8.0, -37.2],  w: 2.4 },
    { id: 'ouest-belvedere', a: [-17, 4.1, -27.0],     b: [-19, 9.6, -40.5],   w: 2.4 }
  ]
  Q.ESC.forEach((e) => { const dx = e.b[0] - e.a[0], dz = e.b[2] - e.a[2], L = Math.hypot(dx, dz); e.L = L; e.ux = dx / L; e.uz = dz / L })
  // Les accès et leurs ouvertures partagent les mêmes extrémités : aucun garde-corps devant une volée.
  Q.PASSAGES = Q.ESC.concat([
    { id: 'ponton-place', a: [0, DECK, -11.3], b: [0, PLACEY, -13.1], w: 3.2 },
    { id: 'centre-studio', a: [9, 7.6, -41.5], b: [12, 8.0, -41.5], w: 3.2, pas: .3 },
    { id: 'place-phare', a: [5.0, PLACEY, -13.7], b: [33.5, 2.6, -16], w: 2.8, pas: .3 }
  ])
  /* distance en plan à l'axe d'une volée (t borné : bouts arrondis) et abscisse t */
  function versEscalier(e, x, z) {
    const dx = e.b[0] - e.a[0], dz = e.b[2] - e.a[2], t = clamp(((x - e.a[0]) * dx + (z - e.a[2]) * dz) / (dx * dx + dz * dz), 0, 1)
    return { t, d: Math.hypot(x - (e.a[0] + dx * t), z - (e.a[2] + dz * t)) }
  }
  Q.dansEscalier = (x, z, marge) => { for (const e of Q.PASSAGES) if (versEscalier(e, x, z).d < e.w / 2 + (marge || 0)) return true; return false }
  /* le terrain est ramené au lit de roche sous les marches : déblai quand la roche dépasse, remblai modéré quand elle est trop basse (au-delà, on laisse le vide : des pilotis y sont plantés) */
  function creuse(x, z, h) {
    for (let i = 0; i < Q.PASSAGES.length; i++) {
      const e = Q.PASSAGES[i], r = versEscalier(e, x, z), reach = e.w / 2 + .45
      if (r.d > reach + 2.4) continue
      const lit = e.a[1] + (e.b[1] - e.a[1]) * r.t - .62
      const m = 1 - sm(reach, reach + 2.4, r.d)
      const k = h > lit ? m : m * (1 - sm(.9, 1.7, lit - h))
      h += (lit - h) * k
    }
    return h
  }
  Q.hauteur = hauteur

  /* ============================================================================================== ZONES PRATICABLES */
  const ZONES = []
  const zoneRect = (x0, z0, x1, z1, y) => ZONES.push({ t: 'r', x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y })
  const zoneDisque = (x, z, r, y, exclusions) => ZONES.push({ t: 'd', x, z, r, y, exclusions })
  const zoneRampe = (ax, ay, az, bx, by, bz, w) => ZONES.push({ t: 's', ax, ay, az, bx, by, bz, w })
  function solEn(x, z, yPref) {
    let best = null, bd = 1e9
    for (const q of ZONES) {
      let y = null
      if (q.t === 'r') { if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) y = q.y }
      else if (q.t === 'd') { if ((x - q.x) ** 2 + (z - q.z) ** 2 <= q.r * q.r && (!q.exclusions || !q.exclusions.some(e => x >= e.x0 && x <= e.x1 && z >= e.z0 && z <= e.z1))) y = q.y }
      else {
        const dx = q.bx - q.ax, dz = q.bz - q.az, L2 = dx * dx + dz * dz, u = ((x - q.ax) * dx + (z - q.az) * dz) / L2
        const px = q.ax + dx * u, pz = q.az + dz * u
        // Empreinte rectangulaire : les paliers ne débordent pas virtuellement sous les marches.
        if (u >= -.000001 && u <= 1.000001 && (x - px) ** 2 + (z - pz) ** 2 <= (q.w / 2) ** 2) y = q.ay + (q.by - q.ay) * clamp(u, 0, 1)
      }
      if (y !== null) { const d = Math.abs(y - yPref); if (d < bd) { bd = d; best = y } }
    }
    return best
  }
  Q.sol = solEn; Q.zones = ZONES; Q.obstacles = []

  /* ============================================================================================== PLANCHES, PILES, GARDE-CORPS (instances) */
  function planche(o) { // texture d'une seule planche : fibres le long de la longueur, clous aux deux bouts
    return M.peintre.planches(Object.assign({ taille: 512, planches: 1, noeuds: .5, graine: 5 }, o))
  }
  function fabriquePlanches(scene, listes) { // listes : {variante: [[cx,cy,cz,lx,lz,ry,teinte], …]}
    const g = new THREE.BoxBufferGeometry(1, 1, 1), meshes = []
    Object.keys(listes).forEach((k, vi) => {
      const L = listes[k]; if (!L.length) return
      const tex = M.peintre.planches({ taille: 512, planches: 1, noeuds: .55, graine: 20 + vi * 7, pal: k === 'sombre' ? ['#6a4a34', '#5a3d2a', '#755338'] : k === 'usee' ? ['#8b6a48', '#7c5c3c', '#96744f'] : ['#93683f', '#855b36', '#a07248'], mousse: k === 'usee' ? 1 : 0, clous: true })
      tex.repeat.set(1, 1)
      const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: grad })
      const im = new THREE.InstancedMesh(g, mat, L.length); im.castShadow = true; im.receiveShadow = true
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color()
      L.forEach((a, i) => { q.setFromEuler(e.set(0, a[5], 0)); p.set(a[0], a[1], a[2]); s.set(a[3], .09, a[4]); m4.compose(p, q, s); im.setMatrixAt(i, m4); const t = 1 + (a[6] || 0); im.setColorAt(i, col.setRGB(t, t * .98, t * .96)) })
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true
      scene.add(im); meshes.push(im)
    })
    return meshes
  }

  Q.build = function () {
    ZONES.length = 0; Q.obstacles.length = 0
    const r = M.alea(42)
    const s = new THREE.Scene()
    const HAB = { planches: { clair: [], usee: [], sombre: [] }, piles: [], ancres: [] }
    const LAN = [] // lanternes : { g, pos, halo, pool }
    const FEN = [] // fenêtres éclairées la nuit
    const PORTES = {} // n -> position d'entrée
    const cliquables = []

    /* ---------- brume, lumières ---------- */
    s.fog = new THREE.Fog('#bfe6f3', 80, 300); s.background = new THREE.Color('#9fd0ee')
    const hemi = new THREE.HemisphereLight('#e8f0ff', '#6b5a7a', .7); s.add(hemi)
    const soleil = new THREE.DirectionalLight('#fff0cc', .8); soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048)
    Object.assign(soleil.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 }); soleil.shadow.bias = -.0006; soleil.shadow.normalBias = .03
    s.add(soleil); s.add(soleil.target)

    /* ---------- ciel ---------- */
    const ciel = window.TALAS_NUIT.creerCiel(); const cielM = new THREE.Mesh(new THREE.SphereBufferGeometry(360, 48, 24), ciel); cielM.renderOrder = -1; cielM.frustumCulled = false; s.add(cielM)

    /* ---------- terrain : maillage + shader de roche / herbe triplanaire ---------- */
    const X0 = -110, X1 = 110, Z0 = -120, Z1 = 50, PAS = .95
    const nx = Math.round((X1 - X0) / PAS), nz = Math.round((Z1 - Z0) / PAS)
    const pos = new Float32Array((nx + 1) * (nz + 1) * 3), idx = []
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = X0 + i * PAS, z = Z0 + j * PAS, k = (j * (nx + 1) + i) * 3; pos[k] = x; pos[k + 1] = hauteur(x, z); pos[k + 2] = z }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d) }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setIndex(idx); tg.computeVertexNormals()
    const tRoche = M.peintre.roche({ graine: 11 }), tHerbe = M.peintre.roche({ graine: 31, pal: ['#4f8a3a', '#5a9a42', '#467a34', '#62a84a'], mousse: 0, taille: 512 })
    const terrM = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: grad })
    const terrU = { tRoche: { value: tRoche }, tHerbe: { value: tHerbe } }
    terrM.onBeforeCompile = function (sh, rdr) {
      Object.assign(sh.uniforms, terrU)
      sh.vertexShader = 'varying vec3 vQW; varying vec3 vQN;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vQW = (modelMatrix * vec4(transformed, 1.)).xyz; vQN = normalize(mat3(modelMatrix) * objectNormal);')
      sh.fragmentShader = 'varying vec3 vQW; varying vec3 vQN; uniform sampler2D tRoche; uniform sampler2D tHerbe;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
        vec3 wn = normalize(vQN); vec3 bw = pow(abs(wn), vec3(5.)); bw /= (bw.x + bw.y + bw.z);
        vec3 rk = texture2D(tRoche, vQW.zy * .085).rgb * bw.x + texture2D(tRoche, vQW.xz * .085).rgb * bw.y + texture2D(tRoche, vQW.xy * .085).rgb * bw.z;
        vec3 gr = texture2D(tHerbe, vQW.xz * .16).rgb;
        float top = smoothstep(.66, .86, wn.y) * smoothstep(.55, 1.3, vQW.y);
        vec3 wet = mix(vec3(1.), vec3(.5, .62, .8), 1. - smoothstep(-.3, 1.1, vQW.y));
        diffuseColor.rgb *= mix(rk * .95, gr * .82, top) * wet * (.85 + .3 * sin(vQW.y * 3.1 + rk.g * 4.));`)
    }
    const terrain = new THREE.Mesh(tg, terrM); terrain.receiveShadow = true; terrain.castShadow = true; s.add(terrain)

    /* ---------- eau ---------- */
    const CARTE = { x0: -110, z0: -120, w: 220, h: 170, res: 4 } // carte de hauteur du terrain (pour la couleur et l'écume) : 4 px par mètre
    const cCarte = document.createElement('canvas'); cCarte.width = CARTE.w * CARTE.res; cCarte.height = CARTE.h * CARTE.res
    const gC = cCarte.getContext('2d'), imC = gC.createImageData(cCarte.width, cCarte.height)
    for (let j = 0; j < cCarte.height; j++) for (let i = 0; i < cCarte.width; i++) { const h = hauteur(CARTE.x0 + i / CARTE.res, CARTE.z0 + j / CARTE.res), v = clamp((h + 4) / 8, 0, 1) * 255, k = (j * cCarte.width + i) * 4; imC.data[k] = v; imC.data[k + 1] = 0; imC.data[k + 2] = 0; imC.data[k + 3] = 255 }
    gC.putImageData(imC, 0, 0)
    const tCarte = new THREE.CanvasTexture(cCarte); tCarte.minFilter = THREE.LinearFilter; tCarte.generateMipmaps = false
    const cLuz = document.createElement('canvas'); cLuz.width = 512; cLuz.height = 512 * CARTE.h / CARTE.w | 0; const tLuz = new THREE.CanvasTexture(cLuz); tLuz.minFilter = THREE.LinearFilter
    const eauU = Object.assign({ uT: { value: 0 }, tCarte: { value: tCarte }, tLuz: { value: tLuz }, uCarte: { value: new THREE.Vector4(CARTE.x0, CARTE.z0, CARTE.w, CARTE.h) }, uSun: { value: V3(0, 1, 0) }, uSunC: { value: new THREE.Color('#fff') }, uSkyT: { value: new THREE.Color('#3d8fe0') }, uSkyH: { value: new THREE.Color('#cfeefa') },
      uDeep: { value: new THREE.Color('#0b5d82') }, uShal: { value: new THREE.Color('#20b8b4') }, uNuit: { value: 0 }, uPiles: { value: [] } }, M.FOG)
    const polaire = (R, ring, sec) => { const p = [0, 0, 0], id = []; for (let i = 1; i <= ring; i++) { const rr = R * Math.pow(i / ring, 2.2) + i * .05; for (let j = 0; j < sec; j++) { const a = j / sec * 6.2832; p.push(Math.cos(a) * rr, 0, Math.sin(a) * rr) } }
      for (let j = 0; j < sec; j++) id.push(0, 1 + (j + 1) % sec, 1 + j); for (let i = 1; i < ring; i++) for (let j = 0; j < sec; j++) { const a = 1 + (i - 1) * sec + j, b = 1 + (i - 1) * sec + (j + 1) % sec, c = 1 + i * sec + j, d = 1 + i * sec + (j + 1) % sec; id.push(a, b, c, b, d, c) }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(id); return g }
    const eauM = new THREE.ShaderMaterial({ uniforms: eauU, transparent: false,
      vertexShader: `uniform float uT; varying vec3 vW;
        void main(){ vec3 p = position + vec3(cameraPosition.x, 0., cameraPosition.z); float w = sin(p.x * .21 + uT * .9) * .05 + sin(p.z * .27 - uT * 1.1) * .04 + sin((p.x + p.z) * .5 + uT * 1.7) * .02;
          p.y = w; vW = p; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform float uT; uniform sampler2D tCarte; uniform sampler2D tLuz; uniform vec4 uCarte; uniform vec3 uSun; uniform vec3 uSunC; uniform vec3 uSkyT; uniform vec3 uSkyH; uniform vec3 uDeep; uniform vec3 uShal; uniform float uNuit;
        uniform vec3 uFogC; uniform vec2 uFogNF; varying vec3 vW;
        ${M.GLSL.bruit}
        float stroke(vec2 g, float seed){ vec2 id = floor(g), f = fract(g); float r = twH(id + seed), o = twH(id + seed + 3.1) * .45, L = .25 + .4 * twH(id + seed + 7.7);
          float sx = smoothstep(o, o + .06, f.x) * (1. - smoothstep(o + L, o + L + .06, f.x)); float sy = 1. - smoothstep(.1, .22, abs(f.y - .5 + .08 * sin(f.x * 6.28 + r * 6.))); return sx * sy * step(.42, r); }
        void main(){
          vec2 q = vW.xz; vec2 muv = (q - uCarte.xy) / uCarte.zw; float inside = step(0., muv.x) * step(muv.x, 1.) * step(0., muv.y) * step(muv.y, 1.);
          float hh = mix(-4., texture2D(tCarte, muv).r * 8. - 4., inside);
          float dep = max(-hh, 0.); float shal = 1. - smoothstep(0., 2.6, dep);
          float dz = length(vW - cameraPosition);
          vec3 base = mix(uDeep, uShal, shal * .85);
          vec3 V = normalize(cameraPosition - vW);
          /* rides fines : normales perturbées, seulement pour le reflet */
          vec2 g = vec2(0.); float th;
          th = dot(q, vec2(.83, .55)) * 3.1 + uT * 2.2; g += vec2(.83, .55) * cos(th) * .05;
          th = dot(q, vec2(-.4, .92)) * 4.9 + uT * 2.7; g += vec2(-.4, .92) * cos(th) * .035;
          vec3 N = normalize(vec3(-g.x, 1., -g.y));
          float nv = max(dot(N, V), 0.); float fr = .04 + .96 * pow(1. - nv, 4.);
          vec3 R = reflect(-V, N); R.y = abs(R.y);
          vec3 refl = mix(uSkyH, uSkyT, pow(clamp(R.y, 0., 1.), .5));
          float sd = max(dot(R, normalize(uSun)), 0.); refl += uSunC * (pow(sd, 260.) * 4. + pow(sd, 12.) * .18) * (1. - uNuit * .5);
          vec3 c = mix(base, refl, fr * .82);
          /* coups de pinceau horizontaux */
          float s1 = stroke(vec2(q.x * .32 + uT * .05, q.y * 1.35), 0.), s2 = stroke(vec2(q.x * .21 - uT * .04, q.y * .95 + 3.), 9.);
          c = mix(c, mix(uShal, vec3(1.), .45), s1 * .4 * (1. - shal * .3)); c = mix(c, uDeep * .6, s2 * .35);
          /* écume : là où la carte de hauteur passe par zéro, avec un liseré qui respire */
          float rive = 1. - smoothstep(0., .55 + .25 * sin(uT * 1.3 + q.x * .4), abs(hh));
          float fn = twN(q * 1.6 + vec2(uT * .25, -uT * .15)); float ecume = rive * smoothstep(.28, .62, fn + .18 * sin(uT * 1.1 + q.y * .7));
          c = mix(c, vec3(.96, .99, 1.), clamp(ecume, 0., 1.) * .92);
          /* reflets orange des lanternes, la nuit */
          if(uNuit > .01){ float lz = texture2D(tLuz, muv).r * inside; float st = stroke(vec2(q.x * .9 + uT * .3, q.y * 4.2), 21.) + stroke(vec2(q.x * 1.7 - uT * .2, q.y * 6.), 37.) * .8;
            c += vec3(1., .58, .22) * lz * (.25 + st * 1.5) * uNuit; }
          float f = smoothstep(uFogNF.x, uFogNF.y, dz); gl_FragColor = vec4(mix(c, uFogC, f), 1.); }` })
    const eau = new THREE.Mesh(polaire(420, 90, 120), eauM); eau.frustumCulled = false; eau.renderOrder = 0; s.add(eau)

    /* ---------- ponton principal, place, quais : planches en instances ---------- */
    const rangee = (x0, z0, x1, z1, y, o) => { // remplit un rectangle de planches (long axe X si sens 'x')
      o = o || {}; const sens = o.sens || (Math.abs(z1 - z0) >= Math.abs(x1 - x0) ? 'z' : 'x')
      const span = sens === 'z' ? Math.abs(z1 - z0) : Math.abs(x1 - x0), n = Math.ceil(span / .3), pas = span / n
      if (sens === 'z') { // rangées empilées le long de z, chaque planche court sur x (longueur x1-x0)
        const L = Math.abs(x1 - x0), cx = (x0 + x1) / 2
        for (let i = 0; i < n; i++) { const z = Math.min(z0, z1) + (i + .5) * pas, k = r(); HAB.planches[k < .16 ? 'sombre' : k < .5 ? 'usee' : 'clair'].push([cx, y - .045 + (r() - .5) * .008, z, L + .02, pas - .014, 0, (r() - .5) * .14]) }
      } else {
        const L = Math.abs(z1 - z0), cz = (z0 + z1) / 2
        for (let i = 0; i < n; i++) { const x = Math.min(x0, x1) + (i + .5) * pas, k = r(); HAB.planches[k < .16 ? 'sombre' : k < .5 ? 'usee' : 'clair'].push([x, y - .045 + (r() - .5) * .008, cz, L + .02, pas - .014, Math.PI / 2, (r() - .5) * .14]) }
      }
    }
    const pilesSous = (x0, z0, x1, z1, y, pas) => { pas = pas || 2.6; for (let x = x0; x <= x1 + .01; x += pas) for (const z of [z0, z1]) HAB.piles.push([x, y, z]); for (let z = z0 + pas; z < z1 - .01; z += pas) for (const x of [x0, x1]) HAB.piles.push([x, y, z]) }

    // 1. le ponton d'arrivée (nord-sud) et ses zones
    rangee(-1.7, -10, 1.7, 19, DECK); pilesSous(-1.7, -10, 1.7, 19, DECK, 2.9); zoneRect(-1.7, -10, 1.7, 19, DECK)
    // 2. la plate-forme de la boutique TALAS (ouest) et le petit quai est
    rangee(-11.5, -3.2, -1.7, 8.5, DECK); pilesSous(-11.5, -3.2, -1.7, 8.5, DECK, 3); zoneRect(-11.5, -3.2, -1.7, 8.5, DECK)
    rangee(1.7, 6, 7.5, 9.5, DECK); pilesSous(1.7, 6, 7.5, 9.5, DECK, 3); zoneRect(1.7, 6, 7.5, 9.5, DECK)
    // 3. la place ronde au bout du ponton (3 marches)
    const PLACE = { x: 0, z: -17.5, r: 7, y: DECK + .55 }
    for (let a = 0; a < 6.28; a += .11) for (let rr = 0.2; rr < PLACE.r - .05; rr += .3) {} // (les planches de la place sont posées en rangées d'un disque, voir plus bas)
    const entreePlace = Q.PASSAGES.find(e => e.id === 'ponton-place'), demiEntree = entreePlace.w / 2
    for (let z = PLACE.z - PLACE.r + .15; z < PLACE.z + PLACE.r; z += .3) {
      const w = Math.sqrt(Math.max(0, PLACE.r ** 2 - (z - PLACE.z) ** 2)); if (w < .8) continue
      const pieces = z + .138 > entreePlace.b[2] ? [[-w, -demiEntree], [demiEntree, w]] : [[-w, w]]
      for (const [x0, x1] of pieces) if (x1 > x0) { const k = r(); HAB.planches[k < .2 ? 'sombre' : k < .55 ? 'usee' : 'clair'].push([(x0 + x1) / 2, PLACE.y - .045, z, x1 - x0, .276, 0, (r() - .5) * .14]) }
    }
    zoneDisque(PLACE.x, PLACE.z, PLACE.r - .3, PLACE.y, [{ x0: -demiEntree, x1: demiEntree, z0: entreePlace.b[2], z1: PLACE.z + PLACE.r }])
    for (let a = 0; a < 6.28; a += 1.0) HAB.piles.push([Math.cos(a) * (PLACE.r - .5), PLACE.y, PLACE.z + Math.sin(a) * (PLACE.r - .5)])

    Q._rangee = rangee; Q._pilesSous = pilesSous; Q._zones = { rect: zoneRect, disque: zoneDisque, rampe: zoneRampe }

    /* ---------- construction des bâtiments, accessoires, vie (fichiers suivants) ---------- */
    const ctx = { THREE, M, s, r, DECK, PLACE, HAB, LAN, FEN, PORTES, cliquables, hauteur, rangee, pilesSous, zoneRect, zoneDisque, zoneRampe, planche, soleil, hemi }
    if (Q.decor) Q.decor(ctx)

    /* ---------- planches et piles en instances ---------- */
    fabriquePlanches(s, HAB.planches)
    {
      const g = new THREE.CylinderBufferGeometry(.17, .21, 1, 8), mat = new THREE.MeshToonMaterial({ map: M.peintre.ecorce({ couleur: '#6a4d39', taille: 256, graine: 3 }), gradientMap: grad })
      const im = new THREE.InstancedMesh(g, mat, HAB.piles.length); im.castShadow = true; im.receiveShadow = true
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3()
      HAB.piles.forEach((a, i) => { const bas = Math.min(-.9, hauteur(a[0], a[2]) - .4), top = a[1] + .32 + r() * .14; p.set(a[0] + (r() - .5) * .04, (bas + top) / 2, a[2] + (r() - .5) * .04); sc.set(1, top - bas, 1); q.setFromAxisAngle(V3(0, 1, 0), r() * 6); m4.compose(p, q, sc); im.setMatrixAt(i, m4) })
      im.instanceMatrix.needsUpdate = true; s.add(im)
      // écume autour de chaque pile : petits points de « terre » dans la carte de hauteur
      HAB.piles.forEach((a) => { const px = (a[0] - CARTE.x0) * CARTE.res, pz = (a[2] - CARTE.z0) * CARTE.res; gC.fillStyle = 'rgb(140,0,0)'; gC.beginPath(); gC.arc(px, pz, 1.6, 0, 7); gC.fill() }); tCarte.needsUpdate = true
    }

    /* ---------- le monde ---------- */
    const W = { scene: s, hub: 1, hd: 1, plainui: 1, keys: 1, clickables: cliquables, look: V3(2, 3, -14), dist: 46, yaw: 0, pitch: .5, baseD: 30, fitW: 40, fov: 46, noOff: 1, rendu: 'jour', quai: true,
      terrain, eau, ciel, eauU, ctx, LAN, FEN, hemi, soleil, PORTES, tCarte, cCarte, gC, cLuz, tLuz, CARTE, heure: .5, cycle: 300 }
    Q.monde = W
    if (Q.animer) Q.animer(W, ctx)
    return W
  }
})()

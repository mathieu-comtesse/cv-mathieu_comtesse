/* Route & vigilance — le jeu : voiture (boîte à 6 rapports, adhérence limitée, hors-piste), fantômes à battre, points de passage, écart avec l'adversaire
 * choisi, compteur circulaire, ligne idéale, pluie et phares, et le volet prévention (alcoolémie de Widmark, réaction retardée, vision double et floue,
 * champ visuel rétréci, paupières lourdes). Dépend de : three.js r128, route-3d-piste.js, route-3d-monde.js.
 * Hooks de test : ?test=1 coupe la boucle d'animation ; window.ROUTE.avancer(dt, n) avance la simulation à la main. */
(function () {
  'use strict'
  const THREE = window.THREE, P3 = window.Piste3D, Monde3D = window.Monde3D
  const { clamp, lerp, smooth } = P3
  const $ = (id) => document.getElementById(id)
  const params = new URLSearchParams(location.search), TEST = params.has('test')
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
  const tactile = matchMedia('(pointer:coarse)').matches || params.has('tactile')
  if (tactile) document.body.classList.add('tactile')
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  const canvas = $('vue')
  let renderer
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !tactile, powerPreference: 'high-performance', preserveDrawingBuffer: TEST }) }
  catch (e) { document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:0;display:grid;place-items:center;color:#fff;font:16px system-ui;text-align:center;padding:2em">WebGL est indisponible sur cet appareil : la course 3D ne peut pas démarrer.<br><a style="color:#8ec5ff" href="route-capteurs.html">Ouvrir l’ancienne simulation vue du dessus</a></p>'); return }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tactile ? 1.4 : 1.75))

  /* ---------------------------------------------------------------------------------------------------------- piste, monde, concurrents */
  const piste = P3.genererPiste({ graine: 20261002, longueur: 9200 })
  const M = Monde3D.creer({ piste, renderer, mobile: tactile, reduit })
  const scene = M.scene, camera = M.camera
  const vOpt = P3.profilVitesse(piste, { aLat: 11.0, vMax: 82 })
  const NOMS = [['Élise', .978, '#c4392f', '#f3f5fa'], ['Karim', .956, '#ecdde6', '#3b4b7a'], ['Noa', .93, '#e6992b', '#20242f']]
  const joueurVoiture = M.voiture({ corps: '#6f9bd6', bande: '#f3f5fa', plaque: 'TO-045-IT' }); scene.add(joueurVoiture)
  const fantomes = NOMS.map(([nom, comp, coul, bande], i) => { const car = M.voiture({ corps: coul, bande, plaque: ['EL-218-SE', 'KA-071-RM', 'NO-330-AH'][i] }); scene.add(car); return { nom, comp, table: P3.tableTemps(piste, vOpt, comp, 100 + i * 17), car, d0: [1.2, -3.4, 3.4][i], rs: [-3.4, -7, -10.5][i] } })
  const selOpp = { i: 0 }
  const conditions = { bac: 0, drogue: 'none', niveau: 0, nuit: false, delai: 0 }
  const E = { phase: 'menu', t: -3, s: 0, d: -1.2, psi: 0, v: 0, gear: 1, rpm: 1300, shiftT: 0, steer: 0, yaw: 0, y: 0, pitch: 0, roll: 0, hors: false, cp: 0, tCP: [], choc: 0, nbChocs: 0, temps: 0, finiT: 0, slide: 0, frein: 0, gaz: 0, cam: { yaw: 0, x: 0, y: 3, z: 0, lookY: 1.3 }, meilleur: 0, auto: false, pause: false, sonT: 0 }
  const bestKey = 'route3d-meilleur-sobre'

  /* ---------------------------------------------------------------------------------------------------------- entrées */
  const K = { gaz: 0, frein: 0, g: 0, d: 0, main: 0 }, touche = {}
  const HIST = []                                        // historique des commandes : sert au retard de réaction
  const map = { KeyW: 'gaz', KeyZ: 'gaz', ArrowUp: 'gaz', ShiftLeft: 'gaz', KeyS: 'frein', ArrowDown: 'frein', ControlLeft: 'frein', KeyA: 'g', KeyQ: 'g', ArrowLeft: 'g', KeyD: 'd', ArrowRight: 'd', Space: 'main' }
  function clavier(e, bas) {
    const k = map[e.code]
    if (k) { touche[k] = bas; if (e.target === document.body || e.target === canvas || true) e.preventDefault() }
    if (!bas) return
    if (e.code === 'Tab' || e.code === 'KeyE') { e.preventDefault(); changerAdversaire() }
    else if (e.code === 'KeyR') repartir()
    else if (e.code === 'KeyM') basculerSon()
    else if (e.code === 'KeyN') { conditions.nuit = !conditions.nuit; $('moment').value = conditions.nuit ? 'nuit' : 'crepuscule'; ambiance() }
    else if (e.code === 'Escape' || e.code === 'KeyP') ouvrirMenu()
  }
  addEventListener('keydown', (e) => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.code !== 'Escape') return; clavier(e, true) })
  addEventListener('keyup', (e) => clavier(e, false))
  addEventListener('blur', () => { for (const k in touche) touche[k] = 0 })
  ;[['tg', 'g'], ['td', 'd'], ['tf', 'frein'], ['ta', 'gaz']].forEach(([id, k]) => { const el = $(id); const on = (v) => (ev) => { ev.preventDefault(); touche[k] = v; el.classList.toggle('on', !!v) }; el.addEventListener('pointerdown', on(1)); ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, on(0))) })
  canvas.addEventListener('pointerdown', () => canvas.focus())

  /* ---------------------------------------------------------------------------------------------------------- volet prévention : alcoolémie, effets */
  const VERRES = [[25, 5], [12.5, 12], [3, 40]], nVerres = [0, 0, 0]
  const LEGAL = [[.8, 'delit', 'Au-dessus de 0,8 g/L : délit. Jusqu’à 2 ans de prison, 4 500 € d’amende, 6 points retirés, suspension ou annulation du permis.'], [.5, 'interdit', 'Au-dessus de 0,5 g/L : conduite interdite. 135 € d’amende, 6 points retirés, immobilisation possible du véhicule.'], [.2, 'alerte', 'Au-dessus de 0,2 g/L : interdit en permis probatoire et pour les conducteurs de bus et d’autocar.'], [.001, 'faible', 'Sous 0,2 g/L, les réflexes baissent déjà : le risque commence au premier verre.'], [0, 'aucun', '0,0 g/L : aucune consommation simulée.']]
  const fr = (v, n = 2) => v.toFixed(n).replace('.', ',')
  function calcAlcool() {
    let verres = 0, g = 0; VERRES.forEach(([cl, deg], i) => { verres += nVerres[i]; g += nVerres[i] * cl * 10 * deg / 100 * .8 })
    const poids = +$('poids').value, r = $('sexe').value === 'f' ? .55 : .68, bac = poids > 0 ? g / (poids * r) : 0, [, niv, verdict] = LEGAL.find(([v]) => bac >= v) || LEGAL[4]
    conditions.bac = bac; $('bacLu').textContent = `${verres} verre${verres > 1 ? 's' : ''} · ${Math.round(g)} g d’alcool pur · ${fr(bac)} g/L`
    $('bacBarre').style.width = Math.min(100, bac / 2 * 100) + '%'; $('bac').dataset.niveau = niv
    $('bacVerdict').textContent = verdict + (bac > 0 ? ` Retour à 0 g/L : ${Math.max(1, Math.round(bac / .15))} à ${Math.max(1, Math.round(bac / .1))} h environ ; ni café ni douche n’accélèrent l’élimination.` : '')
    $('poidsV').textContent = poids + ' kg'
    conditions.drogue = $('drogue').value; conditions.niveau = conditions.drogue === 'none' ? 0 : +$('drogueN').value / 100; $('drogueV').textContent = $('drogueN').value + ' / 100'
    conditions.delai = bac * .16 + conditions.niveau * (conditions.drogue === 'sedating' ? .5 : .2)   // secondes de retard de réaction
  }
  document.querySelectorAll('#verres button').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.v; nVerres[i] = clamp(nVerres[i] + +b.dataset.s, 0, 20); document.querySelectorAll('#verres output')[i].textContent = nVerres[i]; calcAlcool() }))
  ;['poids', 'sexe', 'drogue', 'drogueN'].forEach((id) => { $(id).addEventListener('input', calcAlcool); $(id).addEventListener('change', calcAlcool) })
  $('moment').addEventListener('change', () => { conditions.nuit = $('moment').value === 'nuit'; ambiance() })
  $('adv').innerHTML = fantomes.map((f, i) => `<option value="${i}">${f.nom} (${P3.fmt(P3.tempsA(piste, f.table, piste.longueur), 1)})</option>`).join(''); $('adv').addEventListener('change', () => { selOpp.i = +$('adv').value; majOpp() })
  calcAlcool()

  /* ---------------------------------------------------------------------------------------------------------- ambiance jour / nuit */
  const COUL = { crep: { fond: '#6f84ad', hem: .95, lune: .55, phare: 2.6, ciel: 1 }, nuit: { fond: '#1b2540', hem: .42, lune: .28, phare: 3.6, ciel: .3 } }
  function ambiance() {
    const c = conditions.nuit ? COUL.nuit : COUL.crep
    scene.background.set(c.fond); scene.fog.color.set(c.fond); M.ciel.material.color.setScalar(c.ciel)
    scene.children.forEach((o) => { if (o.isHemisphereLight) o.intensity = c.hem })
    M.lune.intensity = c.lune; M.phare.intensity = c.phare
  }

  /* ---------------------------------------------------------------------------------------------------------- post-traitement : grade, vignette, flou, vision double, paupières */
  const cible = new THREE.WebGLRenderTarget(16, 16, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat })
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const postMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: cible.texture }, px: { value: new THREE.Vector2(1 / 1280, 1 / 720) }, uDouble: { value: 0 }, uBlur: { value: 0 }, uTunnel: { value: 0 }, uLid: { value: 0 }, uFlash: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: 'uniform sampler2D t; uniform vec2 px; uniform float uDouble,uBlur,uTunnel,uLid,uFlash; varying vec2 vUv;' +
      'void main(){ vec2 uv=vUv, c=uv-.5; vec3 col=texture2D(t,uv).rgb;' +
      ' if(uDouble>0.){ vec3 a=texture2D(t,uv+vec2(uDouble,uDouble*.25)).rgb, b=texture2D(t,uv-vec2(uDouble,uDouble*.25)).rgb; col=mix(col,(a+b)*.5,.55); }' +
      ' if(uBlur>0.){ vec2 o=px*uBlur; col=(col*2.+texture2D(t,uv+vec2(o.x,0.)).rgb+texture2D(t,uv-vec2(o.x,0.)).rgb+texture2D(t,uv+vec2(0.,o.y)).rgb+texture2D(t,uv-vec2(0.,o.y)).rgb+texture2D(t,uv+o).rgb*.5+texture2D(t,uv-o).rgb*.5)/7.; }' +
      ' float l=dot(col,vec3(.299,.587,.114)); col=mix(vec3(l),col,.9); col=(col-.5)*1.07+.5; col*=vec3(.97,1.,1.05);' +
      ' float r=length(c*vec2(1.,.92)); float vig=smoothstep(.98,.34-uTunnel*.3,r*1.12); col*=mix(1.,vig,.5+uTunnel*.9);' +
      ' col*=1.-uLid*smoothstep(.12,.5,abs(c.y)); col+=vec3(.9,.25,.2)*uFlash*smoothstep(.3,.7,r);' +
      ' gl_FragColor=vec4(col,1.); }'
  })
  postScene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), postMat))
  let L = 1280, H = 720
  function redim() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; if (w === L && h === H && cible.width > 16) return
    L = w; H = h; renderer.setSize(w, h, false); const pr = renderer.getPixelRatio(); cible.setSize(Math.max(2, Math.floor(w * pr)), Math.max(2, Math.floor(h * pr)))
    camera.aspect = w / h; camera.updateProjectionMatrix(); postMat.uniforms.px.value.set(1 / (w * pr), 1 / (h * pr))
  }
  addEventListener('resize', redim)

  /* ---------------------------------------------------------------------------------------------------------- audio : moteur, vent, pluie, bips */
  let ac = null, son = true, nEng = null
  function initAudio() {
    if (ac || !son) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return
    try {
      ac = new C(); const master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination)
      const moteur = ac.createOscillator(), moteur2 = ac.createOscillator(), fm = ac.createBiquadFilter(), gm = ac.createGain()
      moteur.type = 'sawtooth'; moteur2.type = 'square'; fm.type = 'lowpass'; fm.frequency.value = 900; gm.gain.value = 0; moteur.connect(fm); moteur2.connect(fm); fm.connect(gm); gm.connect(master); moteur.start(); moteur2.start()
      const bruit = (sec, brun) => { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), a = b.getChannelData(0); let q = 0; for (let i = 0; i < a.length; i++) { const w = Math.random() * 2 - 1; if (brun) { q = (q + w * .05) / 1.02; a[i] = q * 3.2 } else a[i] = w } return b }
      const chaine = (buf, type, f, Q, g) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = buf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = Q; gn.gain.value = g; s.connect(fl).connect(gn).connect(master); s.start(); return { fl, gn } }
      const pluie = chaine(bruit(3, false), 'highpass', 2600, .4, .05), vent = chaine(bruit(3, true), 'lowpass', 500, .7, 0), route = chaine(bruit(3, true), 'bandpass', 220, .9, 0)
      nEng = { moteur, moteur2, fm, gm, pluie, vent, route, master }
    } catch (e) { ac = null }
  }
  function bip(f, d, type) { if (!ac || !son) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.setValueAtTime(.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(.18, ac.currentTime + .01); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.connect(g).connect(nEng ? nEng.master : ac.destination); o.start(); o.stop(ac.currentTime + d + .02) }
  function majAudio(dt) {
    if (!ac || !nEng) return; const k = 1 - Math.exp(-dt * 12), n = nEng, t = ac.currentTime
    const f = 38 + (E.rpm - 1000) * .033, vit = Math.abs(E.v)
    n.moteur.frequency.setTargetAtTime(f, t, .03); n.moteur2.frequency.setTargetAtTime(f * .5, t, .03)
    n.fm.frequency.setTargetAtTime(500 + E.rpm * .22 + E.gaz * 700, t, .05)
    n.gm.gain.setTargetAtTime(son && E.phase !== 'menu' ? .07 + .09 * E.gaz : 0, t, .06)
    n.vent.gn.gain.setTargetAtTime(son ? Math.min(.22, vit / 80 * .22) : 0, t, .1); n.vent.fl.frequency.setTargetAtTime(300 + vit * 14, t, .1)
    n.route.gn.gain.setTargetAtTime(son ? (E.hors ? .22 : Math.min(.12, vit / 70 * .12 + E.slide * .3)) : 0, t, .08)
    n.pluie.gn.gain.setTargetAtTime(son ? .045 : 0, t, .3)
  }
  function basculerSon() { son = !son; $('bson').textContent = 'Son : ' + (son ? 'oui' : 'non'); $('bson').setAttribute('aria-pressed', son); if (son) initAudio(); if (nEng && ac) nEng.master.gain.setTargetAtTime(son ? .55 : 0, ac.currentTime, .05) }
  $('bson').addEventListener('click', basculerSon)

  /* ---------------------------------------------------------------------------------------------------------- simulation */
  const VTOP = [20, 33, 46, 59, 72, 85], GACC = [10.2, 8.6, 7.4, 6.5, 5.9, 5.5], A_LAT = 11.3, RPM0 = 1300, RPM1 = 8000
  const banniere = (html, ms) => { const b = $('bandeau'); b.innerHTML = html; b.classList.add('on'); clearTimeout(banniere.t); banniere.t = setTimeout(() => b.classList.remove('on'), ms || 1800) }
  function commandes(dt) {
    // entrées physiques -> commandes lissées ; le retard de réaction (alcool, psychoactifs) lit l'historique
    const maintenant = { t: E.temps, gaz: touche.gaz ? 1 : 0, frein: touche.frein ? 1 : 0, g: touche.g ? 1 : 0, d: touche.d ? 1 : 0, main: touche.main ? 1 : 0 }
    if (E.auto) Object.assign(maintenant, pilote(dt))
    HIST.push(maintenant); while (HIST.length > 2 && HIST[1].t < E.temps - 1.5) HIST.shift()
    let c = maintenant
    if (conditions.delai > .005) { const cible = E.temps - conditions.delai; c = HIST[0]; for (const h of HIST) if (h.t <= cible) c = h; else break }
    return c
  }
  function pilote(dt) {      // pilote automatique (démonstration et tests) : suit la ligne idéale et le profil de vitesse
    const v = Math.max(E.v, 1), sL = E.s + 8 + v * .55, e = piste.echant(sL), dT = e.ligne, ed = dT - E.d
    const psiDes = clamp(ed / Math.max(22, v * 1.1), -.3, .3), ek = piste.echant(E.s + v * .3).kr
    const rCible = ek * v + 2.4 * (psiDes - E.psi), R = 5.2 + .028 * v * v, steer = clamp(rCible * R / v, -1, 1)
    let vt = 99; for (let m = 0; m <= 10; m++) { const sm = E.s + m * 14, i = Math.min(piste.N - 1, Math.floor(sm / piste.DS)); vt = Math.min(vt, vOpt[i] * .985 + m * 2.4) }
    const gaz = v < vt ? clamp((vt - v) / 3, .25, 1) : 0, frein = v > vt * 1.02 ? clamp((v - vt) / 7, .1, 1) : 0
    return { gaz: E.phase === 'course' || E.phase === 'fin' ? gaz : 0, frein, g: steer < -.02 ? -steer : 0, d: steer > .02 ? steer : 0, main: 0 }
  }
  function pas(dt) {
    E.temps += dt
    const c = commandes(dt), v = E.v
    const braq = (c.d - c.g) * (conditions.niveau > 0 && conditions.drogue === 'stimulating' ? 1.25 : 1)
    const erreur = conditions.bac > 0 ? Math.sin(E.temps * 1.3 + Math.sin(E.temps * .37) * 2) * .05 * Math.min(1.5, conditions.bac) * clamp(v / 25, 0, 1) : 0
    const cib = clamp(braq + erreur, -1, 1)
    E.steer += clamp(cib - E.steer, -(Math.abs(cib) > Math.abs(E.steer) ? 4.6 : 7.2) * dt, (Math.abs(cib) > Math.abs(E.steer) ? 4.6 : 7.2) * dt)
    let gaz = c.gaz, frein = c.frein
    if (E.phase === 'decompte' || E.phase === 'menu') { gaz = 0; frein = 1 }
    if (E.phase === 'fin') { gaz = 0; frein = .55 }
    E.gaz += (gaz - E.gaz) * Math.min(1, dt * 10); E.frein = frein
    const hors = Math.abs(E.d) > 5.05, mu = (hors ? .55 : 1) * (c.main ? .72 : 1) * .94
    E.hors = hors
    // --- longitudinal
    let rpm = RPM0 + (RPM1 - RPM0) * clamp(Math.abs(v) / VTOP[E.gear - 1], 0, 1.04)
    if (E.shiftT > 0) { E.shiftT -= dt } else if (v > 0) {
      if (E.gear < 6 && rpm > 7500) { E.gear++; E.shiftT = .2 } else if (E.gear > 1 && rpm < 3500) { E.gear--; E.shiftT = .14 }
    }
    const x = clamp((rpm - RPM0) / (RPM1 - RPM0), 0, 1), tq = .78 + .22 * Math.sin(Math.PI * Math.pow(x, .8))
    let a = (E.shiftT > 0 ? 0 : E.gaz * Math.min(GACC[E.gear - 1] * tq, mu * 10.2)) - .00062 * v * Math.abs(v) - (v > 0 ? .1 : -.1) - (hors ? 4.2 * clamp(v / 12, 0, 1) : 0)
    if (E.gaz < .05 && v > 0) a -= 1.1
    let reculer = false
    if (frein > .02) { if (v > .6) a -= frein * 10.8 * mu; else if (c.frein && E.gaz < .05 && E.phase === 'course') { reculer = true; a = -2.6 } else if (v > 0) { v_stop() } }
    function v_stop() { E.v = Math.max(0, E.v - 12 * dt) }
    E.v += a * dt; if (E.v < 0 && !reculer) E.v = Math.max(E.v, -0.0); if (reculer) E.v = Math.max(E.v, -7)
    if (E.phase === 'decompte' || E.phase === 'menu') E.v = 0
    E.rpm += (rpm + (E.gaz * 300) - E.rpm) * Math.min(1, dt * 14)
    // --- latéral
    const vv = Math.abs(E.v), R = 5.2 + .028 * vv * vv, rDes = E.steer * E.v / R, aDem = E.v * rDes, aMax = A_LAT * mu
    let r = rDes
    if (Math.abs(aDem) > aMax) { r = Math.sign(rDes) * aMax / Math.max(vv, 1); E.v -= .22 * (Math.abs(aDem) - aMax) * dt * Math.sign(E.v || 1) }
    if (c.main && vv > 8) r *= 1.35
    E.slide = clamp((Math.abs(aDem) - aMax * .8) / (aMax * .5), 0, 1)
    E.yaw += (r - E.yaw) * Math.min(1, dt * 9)
    const e = piste.echant(E.s), sp = E.v * Math.cos(E.psi) / Math.max(.3, 1 - e.kr * E.d)
    E.psi += (E.yaw - e.kr * sp) * dt; E.psi = clamp(E.psi, -1.45, 1.45)
    E.s += sp * dt; E.d += E.v * Math.sin(E.psi) * dt
    if (E.s < 0) { E.s = 0; E.v *= .5 }
    // --- chocs contre les arbres et les rochers ; retour sur la route si on s'égare trop loin
    if (E.phase === 'course') {
      for (const t of M.arbresProches(E.s)) {
        const dx = t.s - E.s, dy = t.d - E.d, dist = Math.hypot(dx, dy), lim = t.r + 1.25
        if (dist < lim) {
          const n = dist > .01 ? [dx / dist, dy / dist] : [0, 1]
          E.s -= n[0] * (lim - dist) * .6; E.d -= n[1] * (lim - dist) * .6
          if (E.v > 7 && E.choc <= 0) { E.v *= .28; E.choc = .8; E.nbChocs++; $('choc').classList.add('on'); setTimeout(() => $('choc').classList.remove('on'), 60); banniere('CHOC !<small>Un obstacle au bord de la route : ralentis et reste sur la chaussée</small>', 1600); bip(90, .3, 'sawtooth') }
          else E.v *= .96
        }
      }
      if (Math.abs(E.d) > 55) { E.d = 0; E.psi = 0; E.v *= .3; banniere('Retour sur la route', 1400) }
    }
    E.choc = Math.max(0, E.choc - dt)
    // --- assiette : tangage et roulis selon le terrain et les accélérations
    const H0 = (s, d) => piste.hauteurTerrain(s, d), hF = H0(E.s + 1.6, E.d), hB = H0(E.s - 1.6, E.d), hL = H0(E.s, E.d - .85), hR = H0(E.s, E.d + .85)
    const yCible = H0(E.s, E.d), pitchT = -Math.atan((hF - hB) / 3.2) - (a - 0) * .004, rollT = Math.atan((hL - hR) / 1.7) - E.steer * clamp(E.v / 40, 0, 1.4) * .05 - aDem * .004
    E.y += (yCible - E.y) * Math.min(1, dt * 30); E.pitch += (pitchT - E.pitch) * Math.min(1, dt * 7); E.roll += (rollT - E.roll) * Math.min(1, dt * 7)
    // --- points de passage, classement, arrivée
    if (E.phase === 'course') {
      E.t += dt
      while (E.cp < piste.CP.length && E.s >= piste.CP[E.cp]) passageCP(E.cp++)
      if (E.s >= piste.longueur && E.phase === 'course') arrivee()
    } else if (E.phase === 'decompte') {
      E.t += dt; const n = Math.ceil(-E.t)
      if (n !== E.dernierN && n >= 1 && n <= 3) { E.dernierN = n; const d = $('decompte'); d.textContent = n; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); bip(440, .18) }
      if (E.t >= 0) { E.phase = 'course'; E.t = 0; const d = $('decompte'); d.textContent = 'GO'; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); bip(880, .4); banniere('', 1) }
    } else if (E.phase === 'fin') { E.finiT += dt; if (E.finiT > 2.2 && !$('fin').classList.contains('on') && E.finiT < 50) montrerFin() }
  }

  /* ---------------------------------------------------------------------------------------------------------- points de passage, arrivée, résultats */
  const fmt = P3.fmt
  function tEntre(s) { return E.t - ((E.s - s) / Math.max(1, E.v)) }      // instant exact du passage
  function ecartOpp(s, tJoueur) { const f = fantomes[selOpp.i]; return P3.tempsA(piste, f.table, s) - tJoueur }   // > 0 : le joueur est devant
  function passageCP(i) {
    const s = piste.CP[i], tj = tEntre(s); E.tCP[i] = tj
    const f = fantomes[selOpp.i], to = P3.tempsA(piste, f.table, s), ec = to - tj, el = $('cp' + (i + 1)), rows = el.querySelectorAll('div')
    const devant = ec >= 0
    rows[0].innerHTML = `<b>${fmt(devant ? tj : to)}</b><i>${devant ? 'Toi' : f.nom}</i>`; rows[1].innerHTML = `<b>+${Math.abs(ec).toFixed(2)}</b><i>${devant ? f.nom : 'Toi'}</i>`
    el.classList.remove('vide'); el.classList.remove('neuf'); void el.offsetWidth; el.classList.add('neuf')
    if (i < piste.CP.length - 1) { banniere(`Point de passage ${i + 1}<small>${fmt(tj)} · ${ec >= 0 ? 'avance' : 'retard'} ${Math.abs(ec).toFixed(2)} s sur ${f.nom}</small>`, 2200); bip(1040, .12, 'triangle'); setTimeout(() => bip(1380, .14, 'triangle'), 110) }
    M.balise(Math.min(i + 1, piste.CP.length - 1), i + 1 < piste.CP.length)
    const cps = $('cps').children; if (cps[i]) cps[i].classList.add('ok'); $('cps').style.setProperty('--p', ((i + 1) / piste.CP.length * 100) + '%')
  }
  function arrivee() {
    E.phase = 'fin'; E.finiT = 0; E.temps4 = tEntre(piste.longueur); E.tFin = E.temps4
    if (!E.tCP[3]) E.tCP[3] = E.tFin
    const sobre = conditions.bac < .001 && conditions.drogue === 'none'
    try { if (sobre) { const m = +localStorage.getItem(bestKey) || 0; if (!m || E.tFin < m) localStorage.setItem(bestKey, E.tFin.toFixed(3)) } } catch (e) {}
    banniere(`ARRIVÉE<small>${fmt(E.tFin)}</small>`, 3000); bip(660, .5, 'triangle')
  }
  function montrerFin() {
    const liste = [{ nom: 'Toi', t: E.tFin, moi: 1 }].concat(fantomes.map((f) => ({ nom: f.nom, t: P3.tempsA(piste, f.table, piste.longueur) }))).sort((a, b) => a.t - b.t)
    const rang = liste.findIndex((x) => x.moi) + 1, tete = liste[0].t
    let msg = ''
    const v = 36, d = conditions.delai * v
    if (conditions.delai > .005) msg += `<div class="bilan"><b>Ce que l’alcool a changé.</b> Tu conduisais à ${fr(conditions.bac)} g/L${conditions.drogue !== 'none' ? ' avec un psychoactif simulé' : ''} : réaction retardée de <b>${Math.round(conditions.delai * 1000)} ms</b>. À 130 km/h, c’est <b>${Math.round(d)} m</b> parcourus avant même de commencer à réagir — la longueur de ${Math.round(d / 4.5)} voitures. ${E.nbChocs ? `Tu as heurté ${E.nbChocs} obstacle${E.nbChocs > 1 ? 's' : ''}. ` : ''}Compare maintenant avec un tour à jeun.</div>`
    else { let m = 0; try { m = +localStorage.getItem(bestKey) || 0 } catch (e) {}; msg += `<div class="bilan"><b>Référence à jeun.</b> ${m ? `Ton meilleur temps à jeun : ${fmt(m)}. ` : ''}Relance une course avec quelques verres simulés (menu « Conditions du trajet ») : le même parcours, le même véhicule, et un temps qui se dégrade — sans parler des chocs.</div>` }
    if (conditions.delai > .005) { let m = 0; try { m = +localStorage.getItem(bestKey) || 0 } catch (e) {}; if (m) msg += `<div class="bilan"><b>Écart avec ton meilleur temps à jeun :</b> ${E.tFin - m >= 0 ? '+' : '−'}${Math.abs(E.tFin - m).toFixed(2)} s (${fmt(m)}).</div>` }
    $('finTitre').textContent = rang === 1 ? 'Victoire' : `${rang}${rang === 2 ? 'e' : 'e'} place`
    $('finCorps').innerHTML = `<table class="res"><tr><th>#</th><th>Pilote</th><th>Temps</th><th>Écart</th></tr>${liste.map((x, i) => `<tr class="${x.moi ? 'moi' : ''}"><td>${i + 1}</td><td>${x.nom}</td><td>${fmt(x.t)}</td><td>${i ? '+' + (x.t - tete).toFixed(2) : '—'}</td></tr>`).join('')}</table>${msg}<p class="note">Points de passage : ${E.tCP.map((t, i) => `CP${i + 1} ${fmt(t, 2)}`).join(' · ')}. Chocs : ${E.nbChocs}.</p>`
    $('fin').classList.add('on')
  }

  /* ---------------------------------------------------------------------------------------------------------- démarrage, menu */
  function repartir(avecDecompte) {
    E.phase = avecDecompte === false ? 'course' : 'decompte'; E.t = avecDecompte === false ? 0 : -3.2; E.s = 0; E.d = -1.2; E.psi = 0; E.v = 0; E.gear = 1; E.rpm = RPM0; E.shiftT = 0; E.steer = 0; E.yaw = 0; E.cp = 0; E.tCP = []; E.nbChocs = 0; E.choc = 0; E.finiT = 0; E.dernierN = 0; E.gaz = 0; HIST.length = 0
    E.y = piste.hauteurTerrain(0, -1.2); E.cam.yaw = piste.echant(0).th; E.snapCam = true
    for (let i = 1; i <= 4; i++) { const el = $('cp' + i); el.classList.add('vide'); el.classList.remove('neuf') }
    Array.from($('cps').children).forEach((c) => c.classList.remove('ok')); $('cps').style.setProperty('--p', '0%')
    $('fin').classList.remove('on'); $('menu').classList.remove('on'); $('bandeau').classList.remove('on')
    M.balise(0, true); M.actualiser(0, true); E.pause = false
    initAudio(); if (ac && ac.state === 'suspended') ac.resume(); canvas.focus()
  }
  function ouvrirMenu() { if (E.phase === 'menu') return; E.pause = true; $('menu').classList.add('on'); $('fin').classList.remove('on') }
  $('go').addEventListener('click', () => { if (E.phase === 'menu' || E.pause || true) repartir() })
  $('goSobre').addEventListener('click', () => { nVerres.fill(0); document.querySelectorAll('#verres output').forEach((o) => (o.textContent = 0)); $('drogue').value = 'none'; $('drogueN').value = 0; calcAlcool(); repartir() })
  $('rejouer').addEventListener('click', () => repartir())
  $('retourMenu').addEventListener('click', () => { $('fin').classList.remove('on'); $('menu').classList.add('on'); E.pause = true })
  $('bpause').addEventListener('click', ouvrirMenu)
  function changerAdversaire() { selOpp.i = (selOpp.i + 1) % fantomes.length; $('adv').value = selOpp.i; majOpp() }
  function majOpp() { $('enom').textContent = fantomes[selOpp.i].nom; $('lnom').textContent = fantomes[selOpp.i].nom }
  { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); $('dfin').textContent = d.getDate() + ' ' + ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][d.getMonth()] }
  majOpp()

  /* ---------------------------------------------------------------------------------------------------------- compteur circulaire */
  const CX = 100, CY = 100, RAD = 80, A0 = 135, A1 = 405          // arc de 270° : du bas-gauche au bas-droit, par le haut
  const pt = (a, r) => [CX + Math.cos(a * Math.PI / 180) * r, CY + Math.sin(a * Math.PI / 180) * r]
  const arc = (f0, f1, r) => { const a = A0 + (A1 - A0) * f0, b = A0 + (A1 - A0) * f1, p = pt(a, r), q = pt(b, r); return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${q[0].toFixed(1)} ${q[1].toFixed(1)}` }
  $('arc0').setAttribute('d', arc(0, 1, 90)); $('arcz').setAttribute('d', arc(.86, 1, 76))
  { let g = ''; for (let i = 0; i <= 20; i++) { const a = A0 + (A1 - A0) * i / 20, p = pt(a, i % 5 ? 70 : 66), q = pt(a, 74); g += `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"/>` } $('graduations').innerHTML = g }
  let derniereVit = -1, dernierRapport = ''
  function majHud() {
    const kmh = Math.round(Math.abs(E.v) * 3.6)
    if (kmh !== derniereVit) { derniereVit = kmh; $('vit').textContent = String(kmh).padStart(3, '0') }
    const r = E.phase === 'menu' ? 'N' : E.v < -.5 ? 'R' : (E.shiftT > 0 || Math.abs(E.v) < .3) ? 'N' : String(E.gear)
    if (r !== dernierRapport) { dernierRapport = r; $('rapport').textContent = r }
    $('arc1').setAttribute('d', arc(0, clamp((E.rpm - RPM0) / (RPM1 - RPM0), .002, 1), 76))
    const tt = Math.max(0, E.t), f = fantomes[selOpp.i]
    $('ltemps').textContent = fmt(tt); $('ljoueur').textContent = 'Toi'; $('pnom').textContent = 'Toi'
    const ec = E.phase === 'course' || E.phase === 'fin' ? P3.tempsA(piste, f.table, E.s) - (E.phase === 'fin' ? E.tFin : E.t) : 0
    const a = Math.abs(ec), txt = (ec >= 0 ? '+' : '−') + String(Math.floor(a)).padStart(2, '0') + '.' + Math.floor((a % 1) * 10)
    $('eval').textContent = txt; $('lgap').innerHTML = '<span class="pt"></span>' + (ec >= 0 ? '+' : '−') + a.toFixed(1)
    $('ecart').className = ec >= 0 ? 'avance' : 'retard'
    $('eico').innerHTML = ec >= 0.05 ? '<path d="M2 11l10-8 10 8" fill="none" stroke="#58d68d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : ec <= -0.05 ? '<path d="M2 3l10 8 10-8" fill="none" stroke="#ff8a84" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M3 7h18" fill="none" stroke="#f0b429" stroke-width="3" stroke-linecap="round"/>'
    $('alt').textContent = 'alt. ' + Math.round(piste.ALT0 + piste.echant(E.s).y) + ' m'; $('km').textContent = 'km ' + (E.s / 1000).toFixed(1)
  }

  /* ---------------------------------------------------------------------------------------------------------- mise en scène : voitures, caméra, lumières */
  const Y = V3(0, 1, 0)
  function poser(obj, s, d, psi, y, pitch, roll, vit, braquage, freine) {
    const w = piste.monde(s, d, true), e = piste.echant(s), cap = e.th + psi
    obj.position.set(w.x, y, w.z); obj.rotation.set(pitch, Math.PI - cap, roll, 'YXZ')
    const ud = obj.userData
    ud.roues.forEach((r, i) => { r.children.forEach((c) => (c.rotation.x += vit * .016 / .34)); if (i < 2) r.rotation.y = braquage * .42 })
    ud.feuxAR.forEach((f) => f.material.color.set(freine ? '#ff3a3a' : '#a01218'))
    ud.ombre.rotation.set(-Math.PI / 2 + pitch * .0, 0, 0)
  }
  const camPos = V3(0, 0, 0), camLook = V3(0, 0, 0), forward = V3(0, 0, 0), tmp = V3(0, 0, 0)
  function miseEnScene(dt) {
    const e = piste.echant(E.s), capVoiture = e.th + E.psi
    poser(joueurVoiture, E.s, E.d, E.psi, E.y + .02, E.pitch, E.roll, E.v, E.steer, E.frein > .3 && E.v > 1)
    // fantômes : ils suivent leur table de temps ; sur la grille de départ ils se placent à côté et derrière la ligne
    for (const f of fantomes) {
      const sf = E.phase === 'menu' || E.phase === 'decompte' ? 0 : P3.abscisseA(piste, f.table, Math.max(0, E.t)), lat = (x) => lerp(f.d0, piste.echant(x).ligne * .92, smooth(x / 160)) + Math.sin(x / 37 + f.comp * 9) * .5 * smooth(x / 400)
      const lane = lat(sf), psi = Math.atan((lat(sf + 4) - lane) / 4), sPlace = sf + (sf < 1 ? f.rs * (1 - smooth(sf)) * 0 : 0)
      const y = piste.hauteurTerrain(sPlace, lane), hF = piste.hauteurTerrain(sPlace + 1.6, lane), hB = piste.hauteurTerrain(sPlace - 1.6, lane)
      poser(f.car, sPlace, lane, psi, y + .02, -Math.atan((hF - hB) / 3.2), 0, sf > 1 ? 30 : 0, 0, false)
      f.s = sPlace; f.d = lane
    }
    // caméra de poursuite : retard de cap, recul et champ de vision qui grandissent avec la vitesse
    const cibleYaw = capVoiture * .62 + piste.echant(E.s + 26).th * .38
    if (E.snapCam) E.cam.yaw = cibleYaw
    let dy = cibleYaw - E.cam.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
    E.cam.yaw += dy * (1 - Math.exp(-dt * 4.4))
    forward.set(Math.sin(E.cam.yaw), 0, -Math.cos(E.cam.yaw))
    const vit = Math.abs(E.v), wv = piste.monde(E.s, E.d, true), base = V3(wv.x, E.y, wv.z)
    const recul = 7.3 + vit * .013, haut = 2.35 + vit * .003
    camPos.copy(base).addScaledVector(forward, -recul); camPos.y += haut
    const sol = piste.hauteurTerrain(E.s - recul * Math.cos(E.psi), E.d + 0) + 1.0; if (camPos.y < sol) camPos.y = sol
    const shake = (E.hors ? .05 : 0) + (E.choc > 0 ? .15 * E.choc : 0) + vit / 85 * .012, tt = E.temps * 37
    camPos.x += Math.sin(tt) * shake; camPos.y += Math.sin(tt * 1.3 + 1) * shake
    const kx = E.snapCam ? 1 : 1 - Math.exp(-dt * 22), ky = E.snapCam ? 1 : 1 - Math.exp(-dt * 16); E.snapCam = false
    E.cam.x += (camPos.x - E.cam.x) * kx; E.cam.y += (camPos.y - E.cam.y) * ky; E.cam.z += (camPos.z - E.cam.z) * kx
    if (!(E.cam.x === E.cam.x)) { E.cam.x = camPos.x; E.cam.y = camPos.y; E.cam.z = camPos.z }
    camera.position.set(E.cam.x, E.cam.y, E.cam.z)
    camLook.copy(base).addScaledVector(forward, 17 + vit * .1); camLook.y += 1.15 + (piste.echant(E.s + 26).y - e.y) * .22
    camera.lookAt(camLook)
    camera.rotateZ(-E.yaw * .035 - E.steer * .012)
    const fov = 64 + clamp(vit / 85, 0, 1) * 13 + (E.choc > 0 ? 2 : 0); if (Math.abs(camera.fov - fov) > .05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix() }
    // phares
    const fv = V3(Math.sin(capVoiture), 0, -Math.cos(capVoiture))
    M.phare.position.set(base.x + fv.x * 1.6, E.y + .85, base.z + fv.z * 1.6); M.phare.target.position.set(base.x + fv.x * 38, E.y - .2 + Math.tan(-E.pitch) * 14, base.z + fv.z * 38)
    M.cone.position.set(base.x + fv.x * 1.8, E.y + .8, base.z + fv.z * 1.8); M.cone.rotation.set(.03, Math.PI - capVoiture, 0, 'YXZ')
    M.suivre(base.x, base.z)
    // effets de prévention
    const u = postMat.uniforms, alc = Math.min(1.6, conditions.bac), dro = conditions.niveau, per = conditions.drogue === 'perception' ? dro : 0, sed = conditions.drogue === 'sedating' ? dro : 0
    u.uDouble.value = (alc * .0085 + per * .012) * (1 + .3 * Math.sin(E.temps * .8)); u.uBlur.value = alc * 1.5 + per * 1.6 + sed * .8
    u.uTunnel.value = clamp(alc * .32 + per * .28 + sed * .15, 0, .9); u.uLid.value = clamp(sed * (.35 + .35 * Math.max(0, Math.sin(E.temps * .55))) + alc * .12 * Math.max(0, Math.sin(E.temps * .5)), 0, .85)
    u.uFlash.value = E.choc > 0 ? E.choc : 0
  }

  /* ---------------------------------------------------------------------------------------------------------- boucle */
  function dessiner() {
    redim()
    renderer.setRenderTarget(cible); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam)
  }
  function avancer(dt, n) {
    n = n || 1
    for (let i = 0; i < n; i++) {
      if (!E.pause && E.phase !== 'menu') { const sub = Math.max(1, Math.ceil(dt / .011)); for (let k = 0; k < sub; k++) pas(dt / sub) }
      else E.temps += dt
      M.actualiser(E.s); M.ligneIdeale(E.s, E.phase === 'course' && E.v > vOpt[Math.min(piste.N - 1, Math.floor((E.s + 60) / piste.DS))] * 1.04 ? 1 : 0)
      miseEnScene(dt); M.majPluie(dt, Math.abs(E.v) * .9, E.temps); majAudio(dt)
    }
    majHud()
  }
  let dernier = 0
  function boucle(t) {
    const dt = Math.min(.05, (t - dernier) / 1000 || .016); dernier = t
    avancer(dt, 1); dessiner(); requestAnimationFrame(boucle)
  }
  ambiance(); redim()
  E.y = piste.hauteurTerrain(0, -1.2); E.cam.yaw = piste.echant(0).th; M.actualiser(0, true); M.balise(0, true)
  { const b = piste.monde(0, -1.2, true), f = V3(Math.sin(E.cam.yaw), 0, -Math.cos(E.cam.yaw)); E.cam.x = b.x - f.x * 6; E.cam.y = E.y + 2; E.cam.z = b.z - f.z * 6 }
  window.ROUTE = { E, piste, M, fantomes, conditions, touche, avancer, dessiner, repartir, pilote: (on) => (E.auto = on !== false), teleporter(s, d, v, psi) { E.snapCam = true; E.s = s; E.d = d === undefined ? 0 : d; E.v = v || 0; E.psi = psi || 0; E.y = piste.hauteurTerrain(E.s, E.d); M.actualiser(E.s); if (E.phase === 'decompte') { E.phase = 'course'; E.t = 0 } E.gear = Math.max(1, Math.min(6, VTOP.findIndex((t) => E.v < t) + 1 || 6)); M.actualiser(E.s, true) }, vOpt, nVerres, calcAlcool, ambiance }
  if (!TEST) requestAnimationFrame(boucle)
  else { $('menu').classList.remove('on'); if (params.has('menu')) $('menu').classList.add('on'); redim(); dessiner() }
})()

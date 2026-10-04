/* Route & vigilance — conduire dans la circulation (three.js r128) : voiture à boîte six rapports, adhérence limitée, hors-piste ; circulation (voitures, camions,
 * fourgons, cyclistes, piétons, animaux), hameaux à 50 km/h, événements imprévus avec mesure du temps de réaction, collisions et effets d'accident ; volet prévention
 * (alcoolémie de Widmark, réaction retardée, vision double et floue, champ rétréci, paupières lourdes). Dépend de : three.js r128, route-3d-piste.js, route-3d-trafic.js,
 * route-3d-modeles.js, route-3d-accident.js, route-3d-monde.js. Hooks de test : ?test=1 coupe la boucle ; window.ROUTE.avancer(dt, n) avance la simulation à la main. */
(function () {
  'use strict'
  const THREE = window.THREE, P3 = window.Piste3D, Monde3D = window.Monde3D, T3 = window.Trafic3D, Mod = window.Modeles3D
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
  catch (e) { document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:0;display:grid;place-items:center;color:#fff;font:16px system-ui;text-align:center;padding:2em">WebGL est indisponible sur cet appareil : la conduite 3D ne peut pas démarrer.<br><a style="color:#8ec5ff" href="route-capteurs.html">Ouvrir l’ancienne simulation vue du dessus</a></p>'); return }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tactile ? 1.4 : 1.75))

  /* ---------------------------------------------------------------------------------------------------------- piste, monde, circulation */
  const piste = P3.genererPiste({ graine: 20261002, longueur: 9200 })
  const M = Monde3D.creer({ piste, renderer, mobile: tactile, reduit })
  const scene = M.scene, camera = M.camera
  const Acc = Accident3D.creer({ scene, piste })
  const ENVS = Mod.creerEnvs()
  const conditions = { bac: 0, drogue: 'none', niveau: 0, nuit: false, moment: 'crepuscule', delai: 0 }
  const trafic = T3.creer(piste, { graine: +params.get('graine') || 7, densite: 1 })
  const JOUEUR = { L: 4.15, W: 1.78, m: 1250 }
  const DEPART = 45
  const E = { phase: 'menu', t: -3, s: 0, d: 2.25, psi: 0, v: 0, gear: 1, rpm: 1300, shiftT: 0, steer: 0, yaw: 0, y: 0, pitch: 0, roll: 0, hors: false, choc: 0, temps: 0, finiT: 0, slide: 0, frein: 0, gaz: 0, cam: { yaw: 0, x: 0, y: 3, z: 0, lookY: 1.3 }, auto: false, pause: false, sonT: 0, ralenti: 1, secousse: 0, accidentT: 0, impact: null, detresse: false }
  const BILAN = () => ({ dist: 0, duree: 0, vMax: 0, tExces: 0, excesMax: 0, tDistance: 0, collisions: [], quasi: 0, doublements: 0, evenements: [], vSomme: 0, vN: 0, fin: null })
  let B = BILAN()
  const refKey = 'route3d-reference-sobre'

  /* ---------------------------------------------------------------------------------------------------------- entrées */
  const touche = {}, HIST = []
  const map = { KeyW: 'gaz', KeyZ: 'gaz', ArrowUp: 'gaz', ShiftLeft: 'gaz', KeyS: 'frein', ArrowDown: 'frein', ControlLeft: 'frein', KeyA: 'g', KeyQ: 'g', ArrowLeft: 'g', KeyD: 'd', ArrowRight: 'd', Space: 'main' }
  function clavier(e, bas) {
    const k = map[e.code]
    if (k) { touche[k] = bas; e.preventDefault() }
    if (!bas) return
    if (e.code === 'KeyR') repartir()
    else if (e.code === 'KeyM') basculerSon()
    else if (e.code === 'KeyN') { const o = ['jour', 'crepuscule', 'nuit']; conditions.moment = o[(o.indexOf(conditions.moment) + 1) % 3]; $('moment').value = conditions.moment; ambiance() }
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
  $('moment').addEventListener('change', () => { conditions.moment = $('moment').value; ambiance() })
  $('trafic').addEventListener('change', () => { trafic.densite = +$('trafic').value })
  calcAlcool()

  /* ---------------------------------------------------------------------------------------------------------- ambiance : jour, crépuscule pluvieux, nuit */
  const COUL = {
    jour: { fond: '#a9c4e6', hem: 1.05, lune: .95, phare: 0, ciel: 'jour', env: 'jour', pluie: false, brouillard: .0006, cone: 0 },
    crepuscule: { fond: '#6f84ad', hem: .95, lune: .55, phare: 2.6, ciel: 'crep', env: 'crep', pluie: true, brouillard: .00085, cone: .075 },
    nuit: { fond: '#1b2540', hem: .42, lune: .28, phare: 3.6, ciel: 'crep', env: 'nuit', pluie: true, brouillard: .0011, cone: .075 }
  }
  function ambiance() {
    const c = COUL[conditions.moment] || COUL.crepuscule; conditions.nuit = conditions.moment === 'nuit'
    scene.background.set(c.fond); scene.fog.color.set(c.fond); scene.fog.density = c.brouillard
    M.ciel.material.map = M.cieux[c.ciel]; M.ciel.material.color.setScalar(conditions.nuit ? .3 : 1); M.ciel.material.needsUpdate = true
    scene.children.forEach((o) => { if (o.isHemisphereLight) o.intensity = c.hem })
    M.lune.intensity = c.lune; M.phare.intensity = c.phare; M.cone.material.opacity = c.cone; M.pluie.visible = c.pluie
    scene.environment = ENVS[c.env]
    $('meteo').textContent = conditions.moment === 'jour' ? 'Jour · sec' : conditions.moment === 'nuit' ? 'Nuit · pluie' : 'Crépuscule · pluie'
  }

  /* ---------------------------------------------------------------------------------------------------------- post-traitement : grade, vignette, flou, vision double, paupières */
  const cible = new THREE.WebGLRenderTarget(16, 16, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat })
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const postMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: cible.texture }, px: { value: new THREE.Vector2(1 / 1280, 1 / 720) }, uDouble: { value: 0 }, uBlur: { value: 0 }, uTunnel: { value: 0 }, uLid: { value: 0 }, uFlash: { value: 0 }, uBlanc: { value: 0 }, uDesat: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: 'uniform sampler2D t; uniform vec2 px; uniform float uDouble,uBlur,uTunnel,uLid,uFlash,uBlanc,uDesat; varying vec2 vUv;' +
      'void main(){ vec2 uv=vUv, c=uv-.5; vec3 col=texture2D(t,uv).rgb;' +
      ' if(uDouble>0.){ vec3 a=texture2D(t,uv+vec2(uDouble,uDouble*.25)).rgb, b=texture2D(t,uv-vec2(uDouble,uDouble*.25)).rgb; col=mix(col,(a+b)*.5,.55); }' +
      ' if(uBlur>0.){ vec2 o=px*uBlur; col=(col*2.+texture2D(t,uv+vec2(o.x,0.)).rgb+texture2D(t,uv-vec2(o.x,0.)).rgb+texture2D(t,uv+vec2(0.,o.y)).rgb+texture2D(t,uv-vec2(0.,o.y)).rgb+texture2D(t,uv+o).rgb*.5+texture2D(t,uv-o).rgb*.5)/7.; }' +
      ' float l=dot(col,vec3(.299,.587,.114)); col=mix(vec3(l),col,.9-uDesat); col=(col-.5)*1.07+.5; col*=vec3(.97,1.,1.05);' +
      ' float r=length(c*vec2(1.,.92)); float vig=smoothstep(.98,.34-uTunnel*.3,r*1.12); col*=mix(1.,vig,.5+uTunnel*.9);' +
      ' col*=1.-uLid*smoothstep(.12,.5,abs(c.y)); col+=vec3(.9,.25,.2)*uFlash*smoothstep(.3,.7,r); col=mix(col,vec3(1.),uBlanc);' +
      ' gl_FragColor=vec4(col,1.); }'
  })
  postScene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), postMat))
  let L = 1280, H = 720
  function redim() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; if (w === L && h === H && cible.width > 16) return
    L = w; H = h; renderer.setSize(w, h, false); const pr = renderer.getPixelRatio(); cible.setSize(Math.max(2, Math.floor(w * pr)), Math.max(2, Math.floor(h * pr)))
    camera.aspect = w / h; camera.updateProjectionMatrix(); postMat.uniforms.px.value.set(1 / (w * pr), 1 / (h * pr)); Acc.regler(h * pr, camera.fov)
  }
  addEventListener('resize', redim)

  /* ---------------------------------------------------------------------------------------------------------- audio : moteur, vent, pluie, klaxons, chocs */
  let ac = null, son = true, nEng = null
  function bruitBuf(sec, brun) { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), a = b.getChannelData(0); let q = 0; for (let i = 0; i < a.length; i++) { const w = Math.random() * 2 - 1; if (brun) { q = (q + w * .05) / 1.02; a[i] = q * 3.2 } else a[i] = w } return b }
  function initAudio() {
    if (ac || !son) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return
    try {
      ac = new C(); const master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination)
      const moteur = ac.createOscillator(), moteur2 = ac.createOscillator(), fm = ac.createBiquadFilter(), gm = ac.createGain()
      moteur.type = 'sawtooth'; moteur2.type = 'square'; fm.type = 'lowpass'; fm.frequency.value = 900; gm.gain.value = 0; moteur.connect(fm); moteur2.connect(fm); fm.connect(gm); gm.connect(master); moteur.start(); moteur2.start()
      const chaine = (buf, type, f, Q, g) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = buf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = Q; gn.gain.value = g; s.connect(fl).connect(gn).connect(master); s.start(); return { fl, gn } }
      const pluie = chaine(bruitBuf(3, false), 'highpass', 2600, .4, .05), vent = chaine(bruitBuf(3, true), 'lowpass', 500, .7, 0), route = chaine(bruitBuf(3, true), 'bandpass', 220, .9, 0)
      nEng = { moteur, moteur2, fm, gm, pluie, vent, route, master }
    } catch (e) { ac = null }
  }
  function bip(f, d, type, g) { if (!ac || !son) return; const o = ac.createOscillator(), gn = ac.createGain(); o.type = type || 'square'; o.frequency.value = f; gn.gain.setValueAtTime(.0001, ac.currentTime); gn.gain.exponentialRampToValueAtTime(g || .18, ac.currentTime + .01); gn.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.connect(gn).connect(nEng ? nEng.master : ac.destination); o.start(); o.stop(ac.currentTime + d + .02) }
  function klaxon(dur) { bip(415, dur || .5, 'square', .12); bip(520, dur || .5, 'square', .1) }
  function sonChoc(vrel, vuln) {
    if (!ac || !son) return; const t = ac.currentTime, force = clamp(vrel / 22, .15, 1), out = nEng ? nEng.master : ac.destination
    const tir = (buf, type, f, Q, g, d) => { const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain(); s.buffer = buf; fl.type = type; fl.frequency.value = f; fl.Q.value = Q; gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.0008, t + d); s.connect(fl).connect(gn).connect(out); s.start(t); s.stop(t + d + .05) }
    tir(bruitBuf(1.6, false), 'lowpass', 1400, .6, .9 * force, .5 + force * .5)                 // tôle
    tir(bruitBuf(1.6, true), 'lowpass', 260, .7, 1.4 * force, .9 + force * .9)                  // grondement
    if (vrel > 7) for (let i = 0; i < 6; i++) setTimeout(() => bip(1800 + Math.random() * 3200, .08 + Math.random() * .12, 'triangle', .05 + .05 * force), 30 + i * 70 + Math.random() * 120)   // verre
    if (vuln) { const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + .35); gn.gain.setValueAtTime(.9 * force, t); gn.gain.exponentialRampToValueAtTime(.001, t + .4); o.connect(gn).connect(out); o.start(t); o.stop(t + .45) }
    else for (let i = 0; i < 3; i++) setTimeout(() => bip(180 + Math.random() * 300, .12, 'square', .1 * force), 90 + i * 110)   // tôles qui se tordent
  }
  function sirene() { if (!ac || !son || sirene.on) return; sirene.on = true; let k = 0; const iv = setInterval(() => { bip(k++ % 2 ? 960 : 760, .38, 'sine', .05); if (k > 16) { clearInterval(iv); sirene.on = false } }, 420) }
  function majAudio(dt) {
    if (!ac || !nEng) return; const n = nEng, t = ac.currentTime
    const f = 38 + (E.rpm - 1000) * .033, vit = Math.abs(E.v), mort = E.phase === 'accident' || E.phase === 'fin'
    n.moteur.frequency.setTargetAtTime(f, t, .03); n.moteur2.frequency.setTargetAtTime(f * .5, t, .03)
    n.fm.frequency.setTargetAtTime(500 + E.rpm * .22 + E.gaz * 700, t, .05)
    n.gm.gain.setTargetAtTime(son && E.phase !== 'menu' && !mort ? .07 + .09 * E.gaz : (son && E.phase === 'accident' && E.accidentT < 1.2 ? .05 : 0), t, .06)
    n.vent.gn.gain.setTargetAtTime(son ? Math.min(.22, vit / 80 * .22) : 0, t, .1); n.vent.fl.frequency.setTargetAtTime(300 + vit * 14, t, .1)
    n.route.gn.gain.setTargetAtTime(son ? (E.hors ? .22 : Math.min(.12, vit / 70 * .12 + E.slide * .3)) : 0, t, .08)
    n.pluie.gn.gain.setTargetAtTime(son && COUL[conditions.moment].pluie ? .045 : 0, t, .3)
  }
  function basculerSon() { son = !son; $('bson').textContent = 'Son : ' + (son ? 'oui' : 'non'); $('bson').setAttribute('aria-pressed', son); if (son) initAudio(); if (nEng && ac) nEng.master.gain.setTargetAtTime(son ? .55 : 0, ac.currentTime, .05) }
  $('bson').addEventListener('click', basculerSon)

  /* ---------------------------------------------------------------------------------------------------------- simulation */
  const VTOP = [20, 33, 46, 59, 72, 85], GACC = [10.2, 8.6, 7.4, 6.5, 5.9, 5.5], A_LAT = 11.3, RPM0 = 1300, RPM1 = 8000
  const banniere = (html, ms) => { const b = $('bandeau'); b.innerHTML = html; b.classList.add('on'); clearTimeout(banniere.t); banniere.t = setTimeout(() => b.classList.remove('on'), ms || 1800) }
  const alerte = (html, ms) => { const b = $('alerte'); b.innerHTML = html; b.classList.add('on'); clearTimeout(alerte.t); alerte.t = setTimeout(() => b.classList.remove('on'), ms || 1600) }
  let rawFrein = 0, rawVolant = 0
  function commandes(dt) {
    const maintenant = { t: E.temps, gaz: touche.gaz ? 1 : 0, frein: touche.frein ? 1 : 0, g: touche.g ? 1 : 0, d: touche.d ? 1 : 0, main: touche.main ? 1 : 0 }
    if (E.auto) Object.assign(maintenant, pilote(dt))
    rawFrein = maintenant.frein; rawVolant = maintenant.d - maintenant.g
    HIST.push(maintenant); while (HIST.length > 2 && HIST[1].t < E.temps - 1.5) HIST.shift()
    let c = maintenant
    if (conditions.delai > .005) { const cb = E.temps - conditions.delai; c = HIST[0]; for (const h of HIST) if (h.t <= cb) c = h; else break }
    return c
  }
  /* pilote automatique (démonstration et tests) : reste dans sa voie, respecte la limite et s'arrête devant un obstacle */
  function pilote(dt) {
    const v = Math.max(E.v, 1), e = piste.echant(E.s + 8 + v * .5), ed = 2.25 - E.d
    const psiDes = clamp(ed / Math.max(18, v * 1.1), -.3, .3), ek = piste.echant(E.s + v * .3).kr
    const rCible = ek * v + 2.4 * (psiDes - E.psi), R = 5.2 + .028 * v * v, steer = clamp(rCible * R / v, -1, 1)
    let vt = piste.limite(E.s) * 1.0
    for (const e of trafic.entites) { const dx = e.s - E.s, dy = Math.abs(e.d - E.d); if (dx > 0 && dx < 90 && dy < 2.4 && e.etat !== 'sol') { const gap = dx - (e.L + 4.2) / 2, ve = Math.max(0, e.vs * (e.sens || 1)); vt = Math.min(vt, gap < 10 ? 0 : Math.max(0, ve + (gap - 10) / 2.4)) } }
    const kr = Math.abs(piste.echant(E.s + 30).k); vt = Math.min(vt, Math.sqrt(8 / Math.max(kr, .0008)))
    const gaz = v < vt ? clamp((vt - v) / 3, .2, 1) : 0, frein = v > vt * 1.04 ? clamp((v - vt) / 5, .15, 1) : 0
    return { gaz: E.phase === 'course' ? gaz : 0, frein, g: steer < -.02 ? -steer : 0, d: steer > .02 ? steer : 0, main: 0 }
  }
  const joueurTrafic = () => ({ s: E.s, d: E.d, psi: E.psi, v: E.v, L: JOUEUR.L, W: JOUEUR.W, m: JOUEUR.m, t: E.temps })

  function pas(dt) {
    E.temps += dt
    const c = commandes(dt), v = E.v, vivant = E.phase === 'course' || E.phase === 'decompte' || E.phase === 'accident'
    const braq = (c.d - c.g) * (conditions.niveau > 0 && conditions.drogue === 'stimulating' ? 1.25 : 1)
    const erreur = conditions.bac > 0 ? Math.sin(E.temps * 1.3 + Math.sin(E.temps * .37) * 2) * .05 * Math.min(1.5, conditions.bac) * clamp(v / 25, 0, 1) : 0
    const cib = clamp(braq + erreur, -1, 1)
    E.steer += clamp(cib - E.steer, -(Math.abs(cib) > Math.abs(E.steer) ? 4.6 : 7.2) * dt, (Math.abs(cib) > Math.abs(E.steer) ? 4.6 : 7.2) * dt)
    let gaz = c.gaz, frein = c.frein
    if (E.phase === 'decompte' || E.phase === 'menu') { gaz = 0; frein = 1 }
    if (E.phase === 'accident' || E.phase === 'fin') { gaz = 0; frein = E.phase === 'fin' ? .7 : .35; E.steer *= .9 }
    E.gaz += (gaz - E.gaz) * Math.min(1, dt * 10); E.frein = frein
    const hors = Math.abs(E.d) > 5.05, mu = (hors ? .55 : 1) * (c.main ? .72 : 1) * .94 * (COUL[conditions.moment].pluie ? .9 : 1)
    E.hors = hors
    // --- longitudinal
    let rpm = RPM0 + (RPM1 - RPM0) * clamp(Math.abs(v) / VTOP[E.gear - 1], 0, 1.04)
    if (E.shiftT > 0) { E.shiftT -= dt } else if (v > 0) {
      if (E.gear < 6 && rpm > 7500) { E.gear++; E.shiftT = .2 } else if (E.gear > 1 && rpm < 3500) { E.gear--; E.shiftT = .14 }
    }
    const x = clamp((rpm - RPM0) / (RPM1 - RPM0), 0, 1), tq = .78 + .22 * Math.sin(Math.PI * Math.pow(x, .8))
    const degats = E.avarie || 0
    let a = (E.shiftT > 0 ? 0 : E.gaz * Math.min(GACC[E.gear - 1] * tq, mu * 10.2) * (1 - .35 * degats)) - .00062 * v * Math.abs(v) - (v > 0 ? .1 : -.1) - (hors ? 4.2 * clamp(v / 12, 0, 1) : 0)
    if (E.gaz < .05 && v > 0) a -= 1.1
    let reculer = false
    if (frein > .02) { if (v > .6) a -= frein * 10.8 * mu; else if (c.frein && E.gaz < .05 && E.phase === 'course') { reculer = true; a = -2.6 } else if (v > 0) { E.v = Math.max(0, E.v - 12 * dt) } }
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
    if (vivant && E.phase !== 'menu') interactions(dt)
    if (E.phase === 'course') {
      for (const t of M.arbresProches(E.s)) {                         // chocs contre les arbres, rochers et maisons
        const dx = t.s - E.s, dy = t.d - E.d, dist = Math.hypot(dx, dy), lim = t.r + 1.25
        if (dist < lim) {
          const n = dist > .01 ? [dx / dist, dy / dist] : [0, 1]
          E.s -= n[0] * (lim - dist) * .6; E.d -= n[1] * (lim - dist) * .6
          if (E.v > 5 && E.choc <= 0) obstacleFixe(t, n)
          else E.v *= .96
        }
      }
      if (Math.abs(E.d) > 55) { E.d = 2.25; E.psi = 0; E.v *= .3; banniere('Retour sur la route', 1400) }
    }
    E.choc = Math.max(0, E.choc - dt); E.secousse = Math.max(0, E.secousse - dt * 1.4)
    // --- assiette : tangage et roulis selon le terrain et les accélérations
    const H0 = (s, d) => piste.hauteurTerrain(s, d), hF = H0(E.s + 1.6, E.d), hB = H0(E.s - 1.6, E.d), hL = H0(E.s, E.d - .85), hR = H0(E.s, E.d + .85)
    const yCible = H0(E.s, E.d), pitchT = -Math.atan((hF - hB) / 3.2) - (a - 0) * .004, rollT = Math.atan((hL - hR) / 1.7) - E.steer * clamp(E.v / 40, 0, 1.4) * .05 - aDem * .004
    E.y += (yCible - E.y) * Math.min(1, dt * 30); E.pitch += (pitchT - E.pitch) * Math.min(1, dt * 7); E.roll += (rollT - E.roll) * Math.min(1, dt * 7)
    // --- déroulement du trajet
    if (E.phase === 'course') {
      E.t += dt; suivi(dt)
      if (E.s >= piste.longueur) arrivee()
    } else if (E.phase === 'decompte') {
      E.t += dt; const n = Math.ceil(-E.t)
      if (n !== E.dernierN && n >= 1 && n <= 3) { E.dernierN = n; const d = $('decompte'); d.textContent = n; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); bip(440, .18) }
      if (E.t >= 0) { E.phase = 'course'; E.t = 0; const d = $('decompte'); d.textContent = 'EN ROUTE'; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); bip(880, .4); banniere('', 1) }
    } else if (E.phase === 'accident') {
      E.accidentT += dt / Math.max(.05, E.ralenti)
      if (E.accidentT > 4.8 && !$('fin').classList.contains('on')) terminer('accident')
    } else if (E.phase === 'fin') { E.finiT += dt; if (E.finiT > 2.2 && !$('fin').classList.contains('on') && E.finiT < 50) montrerFin() }
  }

  /* ---------------------------------------------------------------------------------------------------------- interactions : circulation, collisions, mesures */
  function interactions(dt) {
    const j = joueurTrafic()
    if (E.phase !== 'accident' || E.accidentT < 2) trafic.maj(dt, j)
    // klaxons des usagers qui se sentent menacés
    for (const e of trafic.entites) if (e.klaxon > 0 && !e.klaxonne && Math.abs(e.s - E.s) < 120) { e.klaxonne = true; klaxon(.6) }
    // collisions
    if (E.phase === 'course' || E.phase === 'accident') {
      for (const ct of trafic.testerJoueur(j)) {
        const e = ct.ent; if (e.tChoc && E.temps - e.tChoc < .6) continue
        e.tChoc = E.temps
        const copie = { s: E.s, d: E.d, psi: E.psi, v: E.v, L: JOUEUR.L, W: JOUEUR.W, m: JOUEUR.m }
        const res = trafic.reponse(copie, ct); E.s = copie.s; E.d = copie.d; E.v = copie.v
        if (res.dOmega) E.yaw += res.dOmega * 1.4
        collision(ct, res)
      }
    }
  }
  function collision(ct, res) {
    const e = ct.ent, vrel = res.vrel, kmh = vrel * 3.6, grav = T3.gravite(vrel, e)
    if (vrel < 1.2) return
    E.choc = .9; E.secousse = clamp(vrel / 18, .25, 1.4); E.nbChocs = (E.nbChocs || 0) + 1
    E.avarie = clamp((E.avarie || 0) + vrel / 30, 0, 1)
    $('choc').classList.add('on'); setTimeout(() => $('choc').classList.remove('on'), 80)
    // effets : pièces, éclats, fumée, déformation du véhicule heurté et du nôtre
    const w = piste.monde(ct.point.s, ct.point.d, true), pt = V3(w.x, E.y + .6, w.z), cap = piste.echant(ct.point.s).th
    const nm = V3(Math.sin(cap) * ct.n.s + Math.cos(cap) * ct.n.d, 0, -Math.cos(cap) * ct.n.s + Math.sin(cap) * ct.n.d)      // normale monde (du joueur vers l'usager)
    Acc.choc(joueurV, pt, nm.clone().multiplyScalar(-1), vrel)
    const vis = visuels.get(e.id)
    if (vis && !e.vulnerable) { Acc.choc(vis, pt, nm, vrel * (JOUEUR.m / (JOUEUR.m + e.m)) * 1.3) }
    else if (vis) { Acc.etincelles(pt, nm, 4, 3); Acc.poussiere(pt, 6, 2) }
    sonChoc(vrel, e.vulnerable)
    if (e.vulnerable) klaxon(.9)
    const info = { type: e.modele, classe: e.classe, vrel, kmh, grav, vJoueur: res.vJoueur, t: E.temps, s: E.s, evenement: !!e.evenement, chute: T3.chute(vrel), risque: e.classe === 'pieton' ? T3.risquePieton(kmh) : null }
    B.collisions.push(info)
    if (T3 && trafic.evenement && trafic.evenement.ent === e) { trafic.evenement.issue = 'collision'; trafic.evenement.finie = true }
    const libelle = { pieton: 'un piéton', cycliste: 'un cycliste', cerf: 'un cerf', chien: 'un chien', vache: 'une vache', camion: 'un camion', fourgon: 'un fourgon' }[e.modele] || 'un véhicule'
    banniere(`CHOC<small>avec ${libelle} · ${Math.round(kmh)} km/h de rapprochement</small>`, 2200)
    if (e.vulnerable || grav !== 'legere') {
      if (E.phase !== 'accident') { E.phase = 'accident'; E.accidentT = 0; E.ralenti = grav === 'legere' ? .6 : .22; E.impact = info; E.detresse = true; $('gyro').classList.add('on'); setTimeout(sirene, 1500) }
    }
  }
  function obstacleFixe(t, n) {
    const vrel = Math.abs(E.v), kmh = vrel * 3.6
    E.choc = .9; E.secousse = clamp(vrel / 18, .25, 1.4); E.avarie = clamp((E.avarie || 0) + vrel / 30, 0, 1); E.nbChocs = (E.nbChocs || 0) + 1
    const w = piste.monde(E.s, E.d, true), pt = V3(w.x, E.y + .6, w.z), cap = piste.echant(E.s).th + E.psi
    Acc.choc(joueurV, pt, V3(-Math.sin(cap), 0, Math.cos(cap)), vrel); sonChoc(vrel, false)
    $('choc').classList.add('on'); setTimeout(() => $('choc').classList.remove('on'), 80)
    const info = { type: 'obstacle', classe: 'fixe', vrel, kmh, grav: kmh < 25 ? 'legere' : kmh < 60 ? 'grave' : 'critique', vJoueur: vrel, t: E.temps, s: E.s, chute: T3.chute(vrel) }
    B.collisions.push(info); E.v *= .25
    banniere(`CHOC<small>obstacle au bord de la route · ${Math.round(kmh)} km/h</small>`, 2000)
    if (info.grav !== 'legere' && E.phase !== 'accident') { E.phase = 'accident'; E.accidentT = 0; E.ralenti = .25; E.impact = info; E.detresse = true; $('gyro').classList.add('on'); setTimeout(sirene, 1500) }
  }

  /* mesures du trajet : vitesse, excès, distance de sécurité, quasi-accidents, temps de réaction */
  function suivi(dt) {
    const kmh = Math.abs(E.v) * 3.6, lim = piste.limite(E.s) * 3.6
    B.duree += dt; B.dist += Math.abs(E.v) * dt; B.vMax = Math.max(B.vMax, kmh); B.vSomme += kmh * dt; B.vN += dt
    if (kmh > lim + 4) { B.tExces += dt; B.excesMax = Math.max(B.excesMax, kmh - lim) }
    // distance de sécurité : intervalle de temps avec le véhicule qui précède dans la même voie
    let intervalle = 99
    for (const e of trafic.entites) { if (e.sens < 0 || e.etat === 'sol') continue; const dx = e.s - E.s - (e.L + JOUEUR.L) / 2; if (dx > 0 && dx < 60 && Math.abs(e.d - E.d) < 1.6 && E.v > 8) intervalle = Math.min(intervalle, dx / E.v) }
    E.intervalle = intervalle; if (intervalle < 1.0) B.tDistance += dt
    // quasi-accidents (usagers vulnérables frôlés) et dépassements risqués
    for (const e of trafic.entites) {
      const ds = e.s - E.s
      if (e.vulnerable && e.etat !== 'frappe' && e.etat !== 'sol') {
        if (Math.abs(ds) < 9) { const ecart = Math.abs(e.d - E.d) - (JOUEUR.W + e.W) / 2; e.minEcart = Math.min(e.minEcart === undefined ? 99 : e.minEcart, ecart); e.vitPass = Math.max(e.vitPass || 0, Math.abs(E.v - Math.max(0, e.vs))) }
        else if (ds < -9 && e.minEcart !== undefined && !e.compte) { e.compte = true; if (e.minEcart < 1.1 && e.vitPass > 4) { B.quasi++; alerte(`Quasi-accident<small>${e.classe === 'pieton' ? 'piéton' : e.classe === 'velo' ? 'cycliste' : 'animal'} frôlé à ${Math.max(0, e.minEcart).toFixed(1).replace('.', ',')} m · ${Math.round(e.vitPass * 3.6)} km/h</small>`, 2200) } }
      }
      if (e.sens < 0 && e.classe !== 'animal' && E.d < .3 && Math.abs(e.d - E.d) < 2.3 && ds > 0 && ds < 130) { const clos = E.v - e.vs, ttc = (ds - (e.L + JOUEUR.L) / 2) / Math.max(1, clos); if (ttc < 3 && !e.risque) { e.risque = true; B.doublements++; alerte('Dépassement dangereux<small>un véhicule arrive en face</small>', 2000) } }
    }
    // événement imprévu en cours : temps de réaction
    const ev = trafic.evenement
    if (ev && !ev.suivi) { ev.suivi = true; ev.vu = E.t; ev.reactionBrute = null; ev.freinEffet = null; alerteEvenement(ev) }
    if (ev && ev.suivi && !ev.reactionFaite) {
      const dt0 = E.t - ev.vu
      if (ev.reactionBrute === null && (rawFrein > 0 || Math.abs(rawVolant) > .35)) ev.reactionBrute = dt0
      if (ev.freinEffet === null && E.frein > .25) ev.freinEffet = dt0
      if (ev.reactionBrute !== null && ev.freinEffet !== null) { ev.reactionFaite = true; noterReaction(ev) }
      else if (dt0 > 4.5 && ev.finie) ev.reactionFaite = true
    }
    if (ev && ev.finie && ev.suivi && !ev.compte) {
      ev.compte = true
      if (!ev.issue) ev.issue = 'evite'
      B.evenements.push({ type: ev.type, reaction: ev.reactionBrute, effet: ev.freinEffet, vitesse: ev.v0, distance: ev.dist, issue: ev.issue })
    }
  }
  function alerteEvenement(ev) {
    const t = { pieton: 'Piéton sur la chaussée', cerf: 'Cerf !', chien: 'Chien !', cycliste: 'Cycliste qui se rabat', freinage: 'Le véhicule devant freine' }[ev.type] || 'Danger'
    alerte(`${t}<small>freine ou évite</small>`, 1700); bip(660, .1, 'triangle', .12)
  }
  function noterReaction(ev) {
    const ms = Math.round((ev.freinEffet || ev.reactionBrute || 0) * 1000), el = $('nrea'); el.textContent = ms + ' ms'; el.className = ms > 900 ? 'mal' : ms < 700 ? 'ok' : ''
  }

  /* ---------------------------------------------------------------------------------------------------------- arrivée, bilan */
  const fmtT = (s) => { const m = Math.floor(s / 60); return m + ' min ' + String(Math.round(s - m * 60)).padStart(2, '0') + ' s' }
  function arrivee() {
    E.phase = 'fin'; E.finiT = 0; B.fin = 'arrivee'
    banniere(`DESTINATION<small>${(B.dist / 1000).toFixed(1).replace('.', ',')} km parcourus</small>`, 3200); bip(660, .5, 'triangle')
    sauverReference()
  }
  function terminer(motif) { E.phase = 'fin'; E.finiT = 3; B.fin = motif; montrerFin() }
  function sauverReference() {
    const sobre = conditions.bac < .001 && conditions.drogue === 'none'; if (!sobre) return
    const reacs = B.evenements.map((x) => x.reaction).filter((x) => x != null)
    try { localStorage.setItem(refKey, JSON.stringify({ reaction: reacs.length ? reacs.reduce((a, b) => a + b, 0) / reacs.length : null, collisions: B.collisions.length, quasi: B.quasi, exces: B.tExces })) } catch (e) {}
  }
  function reference() { try { return JSON.parse(localStorage.getItem(refKey)) } catch (e) { return null } }
  function montrerFin() {
    const acc = B.fin === 'accident' || B.fin === 'accident-fixe', imp = E.impact
    const reacs = B.evenements.map((x) => x.reaction).filter((x) => x != null), moy = reacs.length ? reacs.reduce((a, b) => a + b, 0) / reacs.length : null
    const vmoy = B.vN ? B.vSomme / B.vN : 0
    $('finTitre').textContent = acc ? 'Accident' : (B.fin === 'arrivee' ? 'Arrivée à destination' : 'Trajet interrompu')
    const lignes = [['Distance', (B.dist / 1000).toFixed(1).replace('.', ',') + ' km'], ['Durée', fmtT(B.duree)], ['Vitesse moyenne / maximale', Math.round(vmoy) + ' / ' + Math.round(B.vMax) + ' km/h'], ['Collisions', B.collisions.length], ['Quasi-accidents', B.quasi], ['Excès de vitesse', B.tExces < .5 ? 'aucun' : Math.round(B.tExces) + ' s (jusqu’à +' + Math.round(B.excesMax) + ' km/h)'], ['Distance de sécurité insuffisante', B.tDistance < .5 ? 'aucune' : Math.round(B.tDistance) + ' s'], ['Dépassements dangereux', B.doublements], ['Événements imprévus', B.evenements.length ? B.evenements.length + ' (' + B.evenements.filter((x) => x.issue === 'collision').length + ' avec choc)' : 'aucun'], ['Temps de réaction moyen', moy === null ? '—' : Math.round(moy * 1000) + ' ms']]
    let msg = ''
    if (acc && imp) {
      const k = Math.round(imp.kmh), h = imp.chute
      msg += `<div class="bilan"><b>L’accident.</b> Choc avec ${{ pieton: 'un piéton', velo: 'un cycliste', animal: 'un animal', voiture: 'un véhicule', camion: 'un camion', fourgon: 'un fourgon', fixe: 'un obstacle' }[imp.classe] || 'un usager'} à <b>${k} km/h</b> de vitesse de rapprochement : l’énergie équivaut à une chute de <b>${h.toFixed(0)} m</b> (${Math.round(h / 3)} étage${h / 3 >= 2 ? 's' : ''}).${imp.risque !== null && imp.risque !== undefined ? ` Pour un piéton heurté à cette vitesse, le risque de décès est de l’ordre de <b>${Math.round(imp.risque * 100)} %</b> (environ 10 % à 30 km/h, 50 % à 50 km/h, 90 % à 70 km/h).` : ''}</div>`
      if (imp.vJoueur * 3.6 > (piste.limite(imp.s) * 3.6) + 4) msg += `<div class="bilan"><b>Vitesse.</b> Tu roulais à ${Math.round(imp.vJoueur * 3.6)} km/h pour une limite de ${Math.round(piste.limite(imp.s) * 3.6)}. À 30 km/h de moins, la distance d’arrêt aurait été de ${Math.round(arret(imp.vJoueur - 8.3))} m au lieu de ${Math.round(arret(imp.vJoueur))} m.</div>`
    }
    const evs = B.evenements.filter((x) => x.reaction != null)
    if (evs.length) { const e0 = evs[0]; const dReac = Math.round(e0.vitesse * (e0.reaction || 0)); msg += `<div class="bilan"><b>Ton temps de réaction.</b> ${evs.map((x) => `${{ pieton: 'piéton', cerf: 'cerf', chien: 'chien', cycliste: 'cycliste', freinage: 'freinage devant' }[x.type] || x.type} : ${Math.round(x.reaction * 1000)} ms${x.issue === 'collision' ? ' (choc)' : ''}`).join(' · ')}. À ${Math.round(e0.vitesse * 3.6)} km/h, ${Math.round((e0.reaction || 0) * 1000)} ms, ce sont <b>${dReac} m</b> parcourus avant même de lever le pied, puis ${Math.round(e0.vitesse * e0.vitesse / (2 * 8))} m de freinage sur route sèche.</div>` }
    if (conditions.delai > .005) {
      const d = conditions.delai * 36
      msg += `<div class="bilan"><b>Ce que l’alcool a changé.</b> Tu conduisais à ${fr(conditions.bac)} g/L${conditions.drogue !== 'none' ? ' avec un psychoactif simulé' : ''} : réaction retardée de <b>${Math.round(conditions.delai * 1000)} ms</b>. À 130 km/h, c’est <b>${Math.round(d)} m</b> parcourus avant de commencer à réagir, la longueur de ${Math.round(d / 4.5)} voitures.</div>`
      const ref = reference(); if (ref) msg += `<div class="bilan"><b>Comparé à ton trajet à jeun :</b> ${ref.reaction ? `réaction ${Math.round(ref.reaction * 1000)} ms à jeun` : 'pas de mesure de réaction à jeun'} · ${ref.collisions} collision(s) · ${ref.quasi} quasi-accident(s).</div>`
    } else if (B.fin === 'arrivee') msg += `<div class="bilan"><b>Référence à jeun enregistrée.</b> Relance un trajet avec quelques verres simulés (« Conditions du trajet ») : même route, même circulation, mêmes événements, et des réflexes qui se dégradent.</div>`
    if (!acc && !B.collisions.length && B.quasi === 0) msg += `<div class="bilan"><b>Aucun accident.</b> Ce n’est pas un record de vitesse : arriver, c’est le seul objectif.</div>`
    $('finCorps').innerHTML = `<table class="res">${lignes.map(([a, b]) => `<tr><td>${a}</td><td style="text-align:right">${b}</td></tr>`).join('')}</table>${msg}<p class="note">Estimations pédagogiques : les distances et risques sont des ordres de grandeur sur route sèche, pas des prédictions.</p>`
    $('fin').classList.add('on'); $('gyro').classList.toggle('on', acc)
  }
  const arret = (v) => v * Math.max(.7, 0) + v * v / (2 * 7.5)

  /* ---------------------------------------------------------------------------------------------------------- démarrage, menu */
  function repartir(avecDecompte) {
    E.phase = avecDecompte === false ? 'course' : 'decompte'; E.t = avecDecompte === false ? 0 : -3.2; E.s = DEPART; E.d = 2.25; E.psi = 0; E.v = 0; E.gear = 1; E.rpm = RPM0; E.shiftT = 0; E.steer = 0; E.yaw = 0; E.nbChocs = 0; E.choc = 0; E.finiT = 0; E.dernierN = 0; E.gaz = 0; E.avarie = 0; E.ralenti = 1; E.accidentT = 0; E.impact = null; E.detresse = false; E.secousse = 0; HIST.length = 0
    E.y = piste.hauteurTerrain(DEPART, 2.25); E.cam.yaw = piste.echant(DEPART).th; E.snapCam = true
    B = BILAN(); trafic.entites.length = 0; trafic.evenement = null; trafic.tEvt = 24; trafic.densite = +$('trafic').value; trafic.stats.evenements = 0
    for (const [id, v] of visuels) { scene.remove(v.groupe) } visuels.clear(); Acc.vider(); Acc.reparer(joueurV); joueurV.fume = false; if (joueurV.mats && joueurV.mats.verre) { joueurV.mats.verre.opacity = .55; joueurV.mats.verre.color.set('#0d1620') }
    $('fin').classList.remove('on'); $('menu').classList.remove('on'); $('bandeau').classList.remove('on'); $('gyro').classList.remove('on'); $('alerte').classList.remove('on')
    $('ncol').textContent = '0'; $('nqua').textContent = '0'; $('nexc').textContent = '0 s'; $('ndis').textContent = '0 s'; $('nrea').textContent = '—'; $('nrea').className = ''
    amorcer(); M.actualiser(DEPART, true); E.pause = false
    initAudio(); if (ac && ac.state === 'suspended') ac.resume(); canvas.focus()
  }
  /* quelques usagers déjà en place au départ, pour que la route ne soit pas vide */
  function amorcer() {
    const lim = piste.limite(500)
    trafic.creerVehicule(130, 1, lim * .7); trafic.creerVehicule(320, 1, lim * .78); trafic.creerVehicule(180, -1, lim * .85); trafic.creerVehicule(420, -1, lim * .8); trafic.creerVehicule(700, -1, lim * .9)
    const c = trafic.creerCycliste(260); c.s = 260
  }
  function ouvrirMenu() { if (E.phase === 'menu') return; E.pause = true; $('menu').classList.add('on'); $('fin').classList.remove('on') }
  $('go').addEventListener('click', () => { if (!modelesPrets) return; repartir() })
  $('goSobre').addEventListener('click', () => { if (!modelesPrets) return; nVerres.fill(0); document.querySelectorAll('#verres output').forEach((o) => (o.textContent = 0)); $('drogue').value = 'none'; $('drogueN').value = 0; calcAlcool(); repartir() })
  $('rejouer').addEventListener('click', () => repartir())
  $('retourMenu').addEventListener('click', () => { $('fin').classList.remove('on'); $('menu').classList.add('on'); E.pause = true })
  $('bpause').addEventListener('click', ouvrirMenu)
  $('couleurV').addEventListener('change', () => { if (joueurV && joueurV.mats.peinture) joueurV.mats.peinture.color.set($('couleurV').value) })

  /* ---------------------------------------------------------------------------------------------------------- compteur circulaire */
  const CX = 100, CY = 100, A0 = 135, A1 = 405
  const pt = (a, r) => [CX + Math.cos(a * Math.PI / 180) * r, CY + Math.sin(a * Math.PI / 180) * r]
  const arc = (f0, f1, r) => { const a = A0 + (A1 - A0) * f0, b = A0 + (A1 - A0) * f1, p = pt(a, r), q = pt(b, r); return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${q[0].toFixed(1)} ${q[1].toFixed(1)}` }
  $('arc0').setAttribute('d', arc(0, 1, 90)); $('arcz').setAttribute('d', arc(.86, 1, 76))
  { let g = ''; for (let i = 0; i <= 20; i++) { const a = A0 + (A1 - A0) * i / 20, p = pt(a, i % 5 ? 70 : 66), q = pt(a, 74); g += `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"/>` } $('graduations').innerHTML = g }
  let derniereVit = -1, dernierRapport = '', derLim = -1, derZone = ''
  function majHud() {
    const kmh = Math.round(Math.abs(E.v) * 3.6)
    if (kmh !== derniereVit) { derniereVit = kmh; $('vit').textContent = String(kmh).padStart(3, '0') }
    const r = E.phase === 'menu' ? 'N' : E.v < -.5 ? 'R' : (E.shiftT > 0 || Math.abs(E.v) < .3) ? 'N' : String(E.gear)
    if (r !== dernierRapport) { dernierRapport = r; $('rapport').textContent = r }
    $('arc1').setAttribute('d', arc(0, clamp((E.rpm - RPM0) / (RPM1 - RPM0), .002, 1), 76))
    const lim = Math.round(piste.limite(E.s) * 3.6); if (lim !== derLim) { derLim = lim; $('limv').textContent = lim }
    $('lim').classList.toggle('exces', kmh > lim + 4 && E.phase === 'course')
    const h = piste.hameau(E.s, 0), zone = h ? h.nom + ' · hameau' : 'Route de montagne'; if (zone !== derZone) { derZone = zone; $('zone').textContent = zone }
    $('kmrest').textContent = Math.max(0, (piste.longueur - E.s) / 1000).toFixed(1).replace('.', ',') + ' km à parcourir · alt. ' + Math.round(piste.ALT0 + piste.echant(E.s).y) + ' m'
    $('ncol').textContent = B.collisions.length; $('ncol').className = B.collisions.length ? 'mal' : ''
    $('nqua').textContent = B.quasi; $('nqua').className = B.quasi ? 'mal' : ''
    $('nexc').textContent = Math.round(B.tExces) + ' s'; $('nexc').className = B.tExces > 3 ? 'mal' : ''
    $('ndis').textContent = Math.round(B.tDistance) + ' s'; $('ndis').className = B.tDistance > 3 ? 'mal' : ''
  }

  /* ---------------------------------------------------------------------------------------------------------- mise en scène : véhicules, usagers, caméra, lumières */
  let joueurV = null, modelesPrets = false, modelesErreur = null
  const visuels = new Map()
  const COULEURS_PIETONS = null
  function visuelPour(e) {
    let v = visuels.get(e.id); if (v) return v
    const nom = e.modele
    v = Mod.creer(nom, { couleur: e.couleur, couleur2: e.couleur2 })
    if (e.enfant) v.groupe.scale.setScalar(.78)
    v.e = e; scene.add(v.groupe); visuels.set(e.id, v); return v
  }
  function majUsagers(dt) {
    const vus = new Set()
    for (const e of trafic.entites) {
      if (e.s - E.s > 520 || E.s - e.s > 130) continue
      const v = visuelPour(e); vus.add(e.id)
      let opts = { z: e.z || 0 }
      if (e.etat === 'frappe' && e.vulnerable) { const tomb = (E.temps * 9 + e.id) % 6.28; opts.tangage = Math.sin(tomb) * 1.4; opts.roulis = Math.cos(tomb * .8) * 1.1 }
      if (e.etat === 'sol' && e.vulnerable) { opts.z = e.classe === 'animal' ? .25 : .12; opts.roulis = e.classe === 'velo' ? 1.5 : 0; opts.tangage = e.classe === 'pieton' ? -1.5 : 0 }
      if (e.classe === 'animal' && e.etat === 'sol') opts.roulis = 1.45
      Mod.placer(piste, v, e.s, e.d, e.ang, opts)
      const ang = e.ang
      v.maj(dt, { vitesse: Math.hypot(e.vs, e.vd), freine: e.freine, nuit: conditions.moment !== 'jour', detresse: e.etat === 'sol' && !e.vulnerable, t: E.temps, allure: e.stoppe || e.etat === 'sol' || e.etat === 'frappe' || e.etat === 'attend' ? 0 : undefined })
      // orientation des modèles : face avant = +Z du modèle ; l'angle de route est relatif à +s
    }
    for (const [id, v] of visuels) if (!vus.has(id)) { scene.remove(v.groupe); visuels.delete(id) }
  }
  const Y = V3(0, 1, 0)
  function poserJoueur(dt) {
    const w = piste.monde(E.s, E.d, true), e = piste.echant(E.s), cap = e.th + E.psi
    joueurV.groupe.position.set(w.x, E.y + .02, w.z); joueurV.groupe.rotation.set(E.pitch, Math.PI - cap, E.roll, 'YXZ')
    joueurV.maj(dt, { vitesse: E.v, braquage: E.steer, freine: E.frein > .3 && E.v > 1, nuit: conditions.moment !== 'jour', recul: E.v < -.3, detresse: E.detresse, t: E.temps })
    // traces de freinage et de glissade
    if ((E.frein > .85 && E.v > 12) || E.slide > .6) for (const dx of [-.75, .75]) { const wl = piste.monde(E.s - 1.2, E.d + dx, true); Acc.trace('j' + dx, V3(wl.x, E.y, wl.z), cap, .22, .5) }
  }
  const camPos = V3(0, 0, 0), camLook = V3(0, 0, 0), forward = V3(0, 0, 0)
  function miseEnScene(dt) {
    const e = piste.echant(E.s), capVoiture = e.th + E.psi
    poserJoueur(dt); majUsagers(dt)
    const cibleYaw = capVoiture * .62 + piste.echant(E.s + 26).th * .38
    if (E.snapCam) E.cam.yaw = cibleYaw
    let dy = cibleYaw - E.cam.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
    E.cam.yaw += dy * (1 - Math.exp(-dt * 4.4))
    forward.set(Math.sin(E.cam.yaw), 0, -Math.cos(E.cam.yaw))
    const vit = Math.abs(E.v), wv = piste.monde(E.s, E.d, true), base = V3(wv.x, E.y, wv.z)
    const recul = 7.3 + vit * .013, haut = 2.35 + vit * .003
    camPos.copy(base).addScaledVector(forward, -recul); camPos.y += haut
    const sol = piste.hauteurTerrain(E.s - recul * Math.cos(E.psi), E.d + 0) + 1.0; if (camPos.y < sol) camPos.y = sol
    const shake = (E.hors ? .05 : 0) + E.secousse * .42 * (reduit ? .3 : 1) + vit / 85 * .012, tt = E.temps * 37
    camPos.x += Math.sin(tt) * shake; camPos.y += Math.sin(tt * 1.3 + 1) * shake; camPos.z += Math.cos(tt * 1.1) * shake * .6
    const kx = E.snapCam ? 1 : 1 - Math.exp(-dt * 22), ky = E.snapCam ? 1 : 1 - Math.exp(-dt * 16); E.snapCam = false
    E.cam.x += (camPos.x - E.cam.x) * kx; E.cam.y += (camPos.y - E.cam.y) * ky; E.cam.z += (camPos.z - E.cam.z) * kx
    if (!(E.cam.x === E.cam.x)) { E.cam.x = camPos.x; E.cam.y = camPos.y; E.cam.z = camPos.z }
    camera.position.set(E.cam.x, E.cam.y, E.cam.z)
    camLook.copy(base).addScaledVector(forward, 17 + vit * .1); camLook.y += 1.15 + (piste.echant(E.s + 26).y - e.y) * .22
    camera.lookAt(camLook)
    camera.rotateZ(-E.yaw * .035 - E.steer * .012 + (E.phase === 'accident' ? Math.sin(E.temps * 31) * E.secousse * .02 : 0))
    const fov = 64 + clamp(vit / 85, 0, 1) * 13 + (E.choc > 0 ? 2 : 0); if (Math.abs(camera.fov - fov) > .05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix() }
    // phares
    const fv = V3(Math.sin(capVoiture), 0, -Math.cos(capVoiture))
    M.phare.position.set(base.x + fv.x * 1.6, E.y + .85, base.z + fv.z * 1.6); M.phare.target.position.set(base.x + fv.x * 38, E.y - .2 + Math.tan(-E.pitch) * 14, base.z + fv.z * 38)
    M.cone.position.set(base.x + fv.x * 1.8, E.y + .8, base.z + fv.z * 1.8); M.cone.rotation.set(.03, Math.PI - capVoiture, 0, 'YXZ')
    M.suivre(base.x, base.z)
    // effets de prévention + effets d'accident
    const u = postMat.uniforms, alc = Math.min(1.6, conditions.bac), dro = conditions.niveau, per = conditions.drogue === 'perception' ? dro : 0, sed = conditions.drogue === 'sedating' ? dro : 0
    const accid = E.phase === 'accident' || (E.phase === 'fin' && B.fin === 'accident') ? clamp(E.accidentT / 2, 0, 1) : 0
    u.uDouble.value = (alc * .0085 + per * .012) * (1 + .3 * Math.sin(E.temps * .8)) + accid * .004; u.uBlur.value = alc * 1.5 + per * 1.6 + sed * .8 + E.secousse * 2.4 + accid * 1.2
    u.uTunnel.value = clamp(alc * .32 + per * .28 + sed * .15 + accid * .45, 0, .95); u.uLid.value = clamp(sed * (.35 + .35 * Math.max(0, Math.sin(E.temps * .55))) + alc * .12 * Math.max(0, Math.sin(E.temps * .5)) + accid * .18 * (.5 + .5 * Math.sin(E.temps * 2.2)), 0, .85)
    u.uFlash.value = E.choc > 0 ? E.choc : 0; u.uDesat.value = accid * .5; u.uBlanc.value = E.choc > .8 ? (E.choc - .8) * 3 : 0
  }

  /* ---------------------------------------------------------------------------------------------------------- boucle */
  function dessiner() {
    redim()
    renderer.setRenderTarget(cible); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam)
  }
  function avancer(dt, n) {
    n = n || 1
    for (let i = 0; i < n; i++) {
      // ralenti dramatique pendant l'accident, retour progressif à la vitesse normale
      if (E.phase === 'accident') E.ralenti = Math.min(1, E.ralenti + dt * (E.accidentT > 1.3 ? .9 : .15))
      const ts = E.phase === 'accident' ? E.ralenti : 1, d = dt * ts
      if (!E.pause && E.phase !== 'menu' && modelesPrets) { const sub = Math.max(1, Math.ceil(d / .011)); for (let k = 0; k < sub; k++) pas(d / sub) }
      else E.temps += dt
      M.actualiser(E.s)
      if (modelesPrets) miseEnScene(d)
      Acc.maj(d, () => E.y); M.majPluie(d, Math.abs(E.v) * .9, E.temps); majAudio(dt)
    }
    majHud()
  }
  let dernier = 0
  function boucle(t) {
    const dt = Math.min(.05, (t - dernier) / 1000 || .016); dernier = t
    avancer(dt, 1); dessiner(); requestAnimationFrame(boucle)
  }

  /* ---------------------------------------------------------------------------------------------------------- chargement des modèles puis démarrage */
  ambiance(); redim()
  E.s = DEPART; E.y = piste.hauteurTerrain(DEPART, 2.25); E.cam.yaw = piste.echant(DEPART).th; M.actualiser(DEPART, true)
  { const b = piste.monde(DEPART, 2.25, true), f = V3(Math.sin(E.cam.yaw), 0, -Math.cos(E.cam.yaw)); E.cam.x = b.x - f.x * 6; E.cam.y = E.y + 2; E.cam.z = b.z - f.z * 6 }
  const bouton = $('go'), texteBouton = bouton.textContent; bouton.disabled = true; $('goSobre').disabled = true
  Mod.charger(THREE, (p) => { bouton.textContent = 'Chargement des modèles ' + Math.round(p * 100) + ' %' }).then(() => {
    joueurV = Mod.creer('joueur', { couleur: $('couleurV').value }); scene.add(joueurV.groupe); modelesPrets = true
    bouton.disabled = false; $('goSobre').disabled = false; bouton.textContent = texteBouton
    amorcer(); miseEnScene(0); if (TEST) dessiner()
    window.ROUTE_PRET = true
  }).catch((e) => { modelesErreur = e; bouton.textContent = 'Modèles 3D indisponibles'; console.error(e); window.ROUTE_ERREUR = String(e) })
  window.ROUTE = { E, piste, M, B: () => B, trafic, Acc, conditions, touche, avancer, dessiner, repartir, visuels, T3,
    pilote: (on) => (E.auto = on !== false),
    teleporter(s, d, v, psi) { E.snapCam = true; E.s = s; E.d = d === undefined ? 2.25 : d; E.v = v || 0; E.psi = psi || 0; E.y = piste.hauteurTerrain(E.s, E.d); M.actualiser(E.s); if (E.phase === 'decompte') { E.phase = 'course'; E.t = 0 } E.gear = Math.max(1, Math.min(6, VTOP.findIndex((t) => E.v < t) + 1 || 6)); M.actualiser(E.s, true) },
    evenement(type, delaiS) { return trafic.declencherEvenement(joueurTrafic(), type) },
    scene: () => scene, calcAlcool, ambiance, joueurV: () => joueurV, nVerres }
  if (!TEST) requestAnimationFrame(boucle)
  else { $('menu').classList.remove('on'); if (params.has('menu')) $('menu').classList.add('on'); redim(); dessiner() }
})()

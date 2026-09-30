/* LE CIEL DE NUIT DU VILLAGE TALAS : HDRI « Moonlit Golf » (Poly Haven, CC0, Greg Zaal), traité par tools/forge/hdri/traite_hdri.py.
 *   - une sonde de lumière (harmoniques sphériques d'ordre 2, sans la lune) donne aux matières l'éclairage ambiant d'une vraie nuit de pleine lune :
 *     bleu-gris venant du ciel, rebond vert-jaune de l'herbe venant du sol, au lieu d'un hémisphère à deux couleurs ;
 *   - le ciel équirectangulaire (étoiles, halo de lune) sert de fond de scène et d'environnement pour les matières brillantes ;
 *   - la direction de la lune du HDRI est celle de la lumière dirigée des scènes qui l'adoptent (TALAS_HDRI.lune).
 *
 *   TALAS_HDRI.charger()                          -> promesse (JSON + ciel)
 *   TALAS_HDRI.applique(scene, {intensite, teinte, fond, env, hemi})  ajoute la sonde (et, au choix, le fond et l'environnement)
 *   scene.userData.hdri = false                    exclut une scène ; = {intensite:…} la règle avant son premier rendu
 * Les scènes sont équipées automatiquement au premier rendu (THREE.WebGLRenderer enveloppé). ?hdri=non désactive. */
(function () {
  'use strict'
  const THREE = window.THREE
  if (!THREE) return
  const H = window.TALAS_HDRI = { on: !/[?&]hdri=non/.test(location.search), pret: false, info: null, ciel: null, dossier: 'assets/talas/hdri/', defaut: { intensite: 5.5, teinte: '#ffffff', hemi: .62 } }
  if (!H.on) return
  const V3 = THREE.Vector3

  H.charger = function () {
    if (H._p) return H._p
    return (H._p = fetch(H.dossier + 'moonlit_golf_sh.json?v=1').then((r) => r.json()).then((info) => {
      H.info = info; H.lune = new V3().fromArray(info.lune.direction)
      return new Promise((ok) => {
        new THREE.TextureLoader().load(H.dossier + 'moonlit_golf_sky.jpg?v=1', (t) => {
          t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false
          H.ciel = t; H.pret = true; ok(true)
        }, undefined, () => { H.pret = true; ok(false) })
      })
    }).catch((e) => { console.warn('[hdri] indisponible :', e.message); return false }))
  }

  /* sonde : les coefficients SH (rayonnance) du HDRI sans la lune, multipliés par l'intensité de la scène */
  H.sonde = function (intensite, teinte) {
    const p = new THREE.LightProbe(), t = new THREE.Color(teinte || '#ffffff')
    H.info.shAmbiance.forEach((c, i) => p.sh.coefficients[i].set(c[0] * t.r, c[1] * t.g, c[2] * t.b))
    p.intensity = intensite === undefined ? H.defaut.intensite : intensite
    p.userData.hdri = 1
    return p
  }

  H.applique = function (scene, o) {
    if (!H.info || !scene || scene.userData.hdriFait) return null
    scene.userData.hdriFait = 1
    if (scene.userData.hdri === false) return null
    let eclaire = false; scene.traverse((x) => { if (x.isLight) eclaire = true })     // une scène sans lumière (quad de post-traitement…) n'a rien à recevoir
    if (!eclaire) return null
    o = Object.assign({}, H.defaut, o || {}, scene.userData.hdri || {})
    const p = H.sonde(o.intensite, o.teinte); scene.add(p)
    // l'hémisphère existant cède une partie de sa lumière à la sonde, pour ne pas surexposer
    if (o.hemi !== undefined && o.hemi !== 1) scene.traverse((x) => { if (x.isHemisphereLight && !x.userData.hdriAtt) { x.userData.hdriAtt = 1; x.intensity *= o.hemi } })
    if (o.fond && H.ciel) scene.background = H.ciel
    if (o.env && H.ciel) scene.environment = H.ciel
    scene.userData.sondeHdri = p
    return p
  }

  /* équipement automatique au premier rendu de chaque scène */
  const WR = THREE.WebGLRenderer
  THREE.WebGLRenderer = function (o) {
    const r = new WR(o), r0 = r.render
    r.render = function (scene, camera) { if (H.info && scene && scene.isScene && !scene.userData.hdriFait) H.applique(scene); return r0.apply(this, arguments) }
    return r
  }
  THREE.WebGLRenderer.prototype = WR.prototype
  H.charger()
})()

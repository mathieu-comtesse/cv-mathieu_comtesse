/* LES PERSONNAGES DU VILLAGE TALAS, version « squelette » : des maillages lisses skinnés sur le squelette de la Universal Animation Library
 * (Quaternius, CC0), fabriqués par tools/forge/persos (champs de distance, poids analytiques). Les animations de la bibliothèque (marche, course,
 * assis, coups, chute, mort…) s'appliquent telles quelles à n'importe quel personnage : assets/talas/persos/anims.glb.
 *
 *   TALAS_PERSO.precharger(['dylan', …])      -> promesse : charge le paquet d'animations et les modèles
 *   TALAS_PERSO.creer('dylan', {pal, echelle}) -> Group prêt à poser (userData.perso = état d'animation) ou null si le modèle manque
 *   TALAS_PERSO.jouer(p, 'Walk_Loop', {vitesse, fondu, une})   ·  TALAS_PERSO.fige(p, 'Death01', 1)  (dernière image)
 *   TALAS_PERSO.modeMouvement(p, 'walk'|'run'|'idle'|…)         (les noms de mode de l'ancien animPerson)
 *   TALAS_PERSO.porter(p, 'casque', true|false)   EPI amovibles : casque · gilet · lunettes · auditive · harnais · chaussures · gants (ISO 45001)
 *   TALAS_PERSO.epi(p)                             -> { casque:true, gilet:true, … } : ce que le personnage porte en ce moment
 *   TALAS_PERSO.bouche(p, 'sourire'|'cri')  ·  TALAS_PERSO.cligner(p)  ·  TALAS_PERSO.os(p, 'hand_r') pour accrocher un accessoire
 * Les mixers avancent tout seuls à chaque rendu (THREE.WebGLRenderer.render est enveloppé), à l'horloge du jeu.
 * ?perso=non désactive (le jeu garde alors les anciens personnages). Dépend de : three.js r128. */
(function () {
  'use strict'
  const THREE = window.THREE
  if (!THREE) return
  const Pz = window.TALAS_PERSO = { on: !/[?&]perso=non/.test(location.search), modeles: {}, anims: null, actifs: new Set(), dossier: 'assets/talas/persos/' }
  if (!Pz.on) return

  /* ---------------------------------------------------------------------------------------------- lecture d'un GLB */
  function lire(buf) {
    const dv = new DataView(buf)
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('GLB invalide')
    const lj = dv.getUint32(12, true)
    const j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, lj)))
    const off = 20 + lj + 8, lb = dv.getUint32(20 + lj, true)
    return { j, bin: buf.slice(off, off + lb) }
  }
  const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }
  const NT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
  function acc(g, i) {
    const a = g.j.accessors[i], v = g.j.bufferViews[a.bufferView], T = CT[a.componentType], n = NT[a.type]
    const off = (v.byteOffset || 0) + (a.byteOffset || 0)
    return { data: new T(g.bin.slice(off, off + a.count * n * T.BYTES_PER_ELEMENT)), n, count: a.count }
  }

  /* ---------------------------------------------------------------------------------------------- palettes */
  const nuance = (hex, k) => { const c = new THREE.Color(hex); c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k); return '#' + c.getHexString() }
  const DERIVE = { shirt2: ['shirt', .78], cuff: ['shirt', .78], pants2: ['pants', .74], vest2: ['vest', .8], hat2: ['hat', .82], brow: ['hair', .72], lip: ['skin', .72], freckle: ['skin', .86], blush: ['skin', 1.06] }
  Pz.pal = {
    dylan: { skin: '#e6ad86', nose: '#d89c78', shirt: '#6cb0e8', vest: '#ff8420', stripe: '#e8ecef', pants: '#3a58b8', belt: '#3a2210', shoe: '#6e4220', sole: '#3a2210', hair: '#5a3214', hat: '#ffd02a', white: '#ffffff', pupil: '#1f4f9a', mouth: '#6a2418', stubble: '#c99472' },
    aurelien: { skin: '#eab39a', nose: '#e07a6a', jacket: '#2c3470', pants: '#262d62', shoe: '#121216', sole: '#050505', hair: '#b8bfc8', collar: '#f4f6fa', tie: '#c81e1e', gold: '#e8b923', cigar: '#6a3e1e', ember: '#ff5010', white: '#ffffff', pupil: '#56687a', mouth: '#7a3028' },
    bernard: { skin: '#f0b489', nose: '#e0806a', shirt: '#e03131', pants: '#3b3f55', shoe: '#2b2b2b', sole: '#111', hair: '#555555', hat: '#f8f9fa', white: '#ffffff', pupil: '#3a2a1a', mouth: '#6a2418', stubble: '#b9876a' },
    georges: { skin: '#e8b48a', nose: '#d8966e', shirt: '#343a70', pants: '#212529', shoe: '#1a1a1a', sole: '#050505', hair: '#3b2414', hat: '#212529', white: '#ffffff', pupil: '#2a1a0a', mouth: '#6a2418' },
    worker: { skin: '#f2ad7e', nose: '#e0906a', shirt: '#e8590c', pants: '#495057', shoe: '#3a2a1a', sole: '#1a1a1a', hair: '#3b2414', hat: '#ffd43b', vest: '#ff922b', stripe: '#e9ecef', white: '#ffffff', pupil: '#2a1a0a', mouth: '#6a2418' }
  }
  /* la distribution : un kit (dylan · homme · femme · costaud · aurelien · bernard) + palette + pièces montrées (coiffure, barbe, lunettes, casque, gilet…) */
  Pz.cast = {
    dylan: { kit: 'dylan' },
    aurelien: { kit: 'aurelien', echelle: 1.06, ancho: 1.12 },   // le PDG est gros : le corps est déjà rond, on l'élargit encore un peu
    bernard: { kit: 'bernard' },
    georges: { kit: 'homme', pal: { skin: '#e8b48a', nose: '#d8966e', shirt: '#343a70', pants: '#212529', shoe: '#1a1a1a', sole: '#050505', hair: '#2a1a0e', mouth: '#6a2418' }, montre: ['cheveux:courts', 'barbe:moustache', 'lunettes_vue'] },
    ouvrier: { kit: 'homme', pal: { skin: '#f2ad7e', nose: '#e0906a', shirt: '#e8590c', pants: '#495057', shoe: '#3a2a1a', hair: '#3b2414', hat: '#ffd43b', vest: '#ff922b', stripe: '#e9ecef' }, montre: ['casque', 'gilet', 'cheveux:ras', 'barbe:moustache', 'lunettes_vue'] },
    lorette: { kit: 'femme', pal: { skin: '#f4bd9c', nose: '#e89a80', shirt: '#ff8787', pants: '#495057', shoe: '#3a2a1a', hair: '#d9480f' }, montre: ['cheveux:carre', 'lunettes_vue'], echelle: .92 },
    neila: { kit: 'femme', pal: { skin: '#8d5524', nose: '#7a4520', shirt: '#f783ac', pants: '#364fc7', shoe: '#2b2b2b', hair: '#2b1a10' }, montre: ['cheveux:longs'] },
    mathilde: { kit: 'femme', pal: { skin: '#e8b48a', nose: '#d8966e', shirt: '#69db7c', pants: '#2b3a67', shoe: '#3a2a1a', hair: '#7a4a22', hat: '#69db7c' }, montre: ['cheveux:chignon'] },
    mathieu: { kit: 'homme', pal: { skin: '#c68642', nose: '#b0723a', shirt: '#ffa94d', pants: '#495057', shoe: '#3a2a1a', hair: '#1e1208', hat: '#1c7ed6', vest: '#ff922b', stripe: '#e9ecef' }, montre: ['casque', 'gilet', 'cheveux:ras', 'barbe:chaume'] },
    eliott: { kit: 'homme', pal: { skin: '#f0b489', nose: '#e0806a', shirt: '#b197fc', pants: '#343a40', shoe: '#2b2b2b', hair: '#6b4423', hat: '#2f9e44', vest: '#ff922b', stripe: '#e9ecef' }, montre: ['casque', 'gilet', 'cheveux:courts'] }
  }
  function couleurRole(role, pal, defaut) {
    if (pal && pal[role]) return pal[role]
    const d = DERIVE[role]
    if (d && pal && pal[d[0]]) return nuance(pal[d[0]], d[1])
    return defaut
  }

  /* ---------------------------------------------------------------------------------------------- matériaux par rôle */
  const MAT = {}
  function materiau(role, couleur, skinne) { // deux matériaux distincts pour une même couleur : un pour les pièces skinnées, un pour les pièces rigides (r128 ne recompile pas proprement quand un matériau alterne)
    const k = role + couleur + (skinne ? '#s' : '')
    if (MAT[k]) return MAT[k]
    const unlit = role === 'pupil' || role === 'ember' || role === 'lens'
    const m = unlit ? new THREE.MeshBasicMaterial({ color: couleur }) : new THREE.MeshToonMaterial({ color: couleur, gradientMap: window.grad || null })
    if (skinne) m.skinning = true // r128 : nécessaire sur certaines versions ; sans effet sur les autres
    if (role === 'glass' || role === 'lens') { m.transparent = true; m.opacity = .45; m.depthWrite = false }
    return (MAT[k] = m)
  }

  /* les petits détails (monture, sourcils, yeux, sangles, boutons…) ne projettent pas d'ombre : à cette échelle la carte d'ombres ne donne que des rayures sur le visage */
  const NOCAST = { frame: 1, lens: 1, strap: 1, brow: 1, white: 1, pupil: 1, mouth: 1, stubble: 1, lace: 1, badge: 1, stripe: 1, metal: 1, gold: 1, tie: 1, cigar: 1, ember: 1, nose: 1, blush: 1, freckle: 1, lip: 1 }

  /* ---------------------------------------------------------------------------------------------- construction */
  function construire(g, pal) {
    const j = g.j, N = j.nodes, joint = {}
    ;(j.skins || []).forEach((s) => s.joints.forEach((i) => (joint[i] = 1)))
    const geoCache = {}
    const objs = N.map((n, i) => {
      let o
      if (joint[i]) o = new THREE.Bone()
      else if (n.mesh !== undefined) {
        const prim = j.meshes[n.mesh].primitives[0], A = prim.attributes, key = n.mesh
        let geo = geoCache[key]
        if (!geo) {
          geo = geoCache[key] = new THREE.BufferGeometry()
          geo.setAttribute('position', new THREE.BufferAttribute(acc(g, A.POSITION).data, 3))
          geo.setAttribute('normal', new THREE.BufferAttribute(acc(g, A.NORMAL).data, 3))
          if (A.JOINTS_0 !== undefined) { geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(acc(g, A.JOINTS_0).data), 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(acc(g, A.WEIGHTS_0).data, 4)) }
          geo.setIndex(new THREE.BufferAttribute(acc(g, prim.indices).data, 1))
          geo.computeBoundingSphere()
        }
        const role = j.materials[prim.material].name, def = '#' + new THREE.Color().fromArray(j.materials[prim.material].pbrMetallicRoughness.baseColorFactor).getHexString(), col = couleurRole(role, pal, def)
        o = n.skin !== undefined ? new THREE.SkinnedMesh(geo, materiau(role, col, true)) : new THREE.Mesh(geo, materiau(role, col, false))
        o.frustumCulled = false; o.castShadow = !NOCAST[role] && !/moustache|cils|barbe|jugulaire/.test(n.name || ''); o.receiveShadow = true
        o.userData.role = role; o.userData.def = def
      } else o = new THREE.Group()
      o.name = n.name || ''
      if (n.translation) o.position.fromArray(n.translation)
      if (n.rotation) o.quaternion.fromArray(n.rotation)
      if (n.scale) o.scale.fromArray(n.scale)
      return o
    })
    N.forEach((n, i) => (n.children || []).forEach((c) => objs[i].add(objs[c])))
    const scene = new THREE.Group()
    ;(j.scenes[j.scene || 0].nodes).forEach((i) => scene.add(objs[i]))
    scene.updateMatrixWorld(true)
    const skels = (j.skins || []).map((s) => {
      const bones = s.joints.map((i) => objs[i]), ib = acc(g, s.inverseBindMatrices).data
      return new THREE.Skeleton(bones, bones.map((b, k) => new THREE.Matrix4().fromArray(ib, k * 16)))
    })
    N.forEach((n, i) => { if (n.skin !== undefined && objs[i].isSkinnedMesh) objs[i].bind(skels[n.skin], new THREE.Matrix4()) })
    return { scene, extras: j.extras || {} }
  }

  /* clone d'un personnage skinné : les os du clone remplacent ceux de l'original dans le squelette */
  function cloner(src) {
    const c = src.clone(true), os = {}
    c.traverse((o) => { if (o.isBone) os[o.name] = o })
    c.traverse((o) => {
      if (!o.isSkinnedMesh) return
      const bones = o.skeleton.bones.map((b) => os[b.name])
      const sk = new THREE.Skeleton(bones, o.skeleton.boneInverses.map((m) => m.clone()))
      o.bind(sk, o.bindMatrix)
    })
    return { c, os }
  }

  /* ---------------------------------------------------------------------------------------------- chargement */
  async function tampon(url) {
    const r = await fetch(url)
    if (!r.ok) throw new Error(url + ' : ' + r.status)
    return r.arrayBuffer()
  }
  Pz.chargerAnims = async function (url) {
    if (Pz.anims) return Pz.anims
    const g = lire(await tampon(url || Pz.dossier + 'anims.glb?v=1')), j = g.j, clips = {}
    j.animations.forEach((a) => {
      const tracks = []
      a.channels.forEach((ch) => {
        const s = a.samplers[ch.sampler], t = acc(g, s.input).data, v = acc(g, s.output).data, nom = j.nodes[ch.target.node].name
        tracks.push(ch.target.path === 'rotation' ? new THREE.QuaternionKeyframeTrack(nom + '.quaternion', t, v) : new THREE.VectorKeyframeTrack(nom + '.position', t, v))
      })
      clips[a.name] = new THREE.AnimationClip(a.name, -1, tracks)
    })
    return (Pz.anims = { clips, meta: j.extras || {} })
  }
  Pz.charger = async function (nom) {
    if (Pz.modeles[nom]) return Pz.modeles[nom]
    const g = lire(await tampon(Pz.dossier + nom + '.glb?v=' + (nom === 'aurelien' ? 3 : 1)))   // aurelien : modèle rond régénéré (v3)
    return (Pz.modeles[nom] = { g, base: construire(g, null) })
  }
  Pz.kitDe = (nom) => (Pz.cast[nom] && Pz.cast[nom].kit) || nom
  Pz.precharger = async function (noms) {
    try { await Pz.chargerAnims(); await Promise.all(Array.from(new Set((noms || ['dylan']).map(Pz.kitDe))).map((n) => Pz.charger(n))) } catch (e) { console.warn('[perso] préchargement impossible :', e.message); return false }
    return true
  }

  /* ---------------------------------------------------------------------------------------------- personnage */
  Pz.creer = function (nom, o) {
    o = o || {}
    const def = Pz.cast[nom] || {}, kit = def.kit || nom, m = Pz.modeles[kit]
    if (!m || !Pz.anims) return null
    const { c, os } = cloner(m.base.scene), ex = m.base.extras
    const pal = Object.assign({}, Pz.pal[nom] || Pz.pal[kit] || {}, def.pal || {}, o.pal || {})
    c.traverse((x) => { if (x.userData && x.userData.role) x.material = materiau(x.userData.role, couleurRole(x.userData.role, pal, x.userData.def), !!x.isSkinnedMesh) })
    const outer = new THREE.Group(); outer.add(c)
    outer.scale.setScalar(o.echelle || def.echelle || 1)
    if (o.ancho || def.ancho) c.scale.set(o.ancho || def.ancho, 1, o.ancho || def.ancho)   // élargissement du modèle seul (le parent garde une échelle uniforme)
    const d = { racine: c, os, outer, mixer: new THREE.AnimationMixer(c), actions: {}, courant: null, nom: null, ps: (ex.pelvisEchelle || 1.2), t: performance.now(), clips: {}, epi: {}, blink: 1 + Math.random() * 3, pal }
    const nomme = (n) => c.getObjectByName(n)
    Object.keys(ex.epi || {}).forEach((k) => { d.epi[k] = { pieces: ex.epi[k].map(nomme).filter(Boolean), on: false } })
    outer.userData.perso = d; outer.userData.kind = nom
    const porte = new Set(o.montre || o.epi || def.montre || ex.visibles || [])
    ;(o.plus || []).forEach((k) => porte.add(k)); (o.moins || []).forEach((k) => porte.delete(k))
    Object.keys(d.epi).forEach((k) => Pz.porter(outer, k, porte.has(k), { sans: true }))
    d.yeux = ['eye_L__white', 'pupil_L__pupil', 'reflet_L__white', 'eye_R__white', 'pupil_R__pupil', 'reflet_R__white'].map(nomme).filter(Boolean)
    d.bouche = { S: nomme('mouthS__mouth'), O: nomme('mouthO__mouth') }
    if (d.bouche.O) d.bouche.O.visible = false
    Pz.actifs.add(d)
    return outer
  }

  /* EPI amovibles : une pièce rigide (casque, lunettes, casque antibruit) « pop » à l'enfilage ; les pièces skinnées (gilet, harnais, gants, coques) apparaissent d'un coup */
  Pz.porter = function (p, epi, on, o) {
    const d = p.userData.perso, e = d && d.epi[epi]; if (!e) return false
    on = on !== false; e.on = on
    e.pieces.forEach((m) => {
      m.visible = on
      if (on && !(o && o.sans) && !m.isSkinnedMesh) { m.scale.setScalar(.01); e.pop = e.pop || []; e.pop.push([m, 0]) }
    })
    return true
  }
  Pz.epi = function (p) { const d = p.userData.perso, r = {}; if (d) Object.keys(d.epi).forEach((k) => (r[k] = d.epi[k].on)); return r }
  /* coiffure : montre celle-là seule (et la recolore au besoin) */
  Pz.coiffure = function (p, style, couleur) {
    const d = p.userData.perso; if (!d) return false
    Object.keys(d.epi).forEach((k) => { if (k.indexOf('cheveux:') === 0) Pz.porter(p, k, k === 'cheveux:' + style, { sans: true }) })
    const g = d.epi['cheveux:' + style]
    if (couleur && g) g.pieces.forEach((m) => (m.material = materiau('hair', couleur, !!m.isSkinnedMesh)))
    return !!g
  }
  Pz.bouche = function (p, forme) { const d = p.userData.perso; if (!d || !d.bouche.S) return; d.bouche.S.visible = forme !== 'cri'; if (d.bouche.O) d.bouche.O.visible = forme === 'cri' }
  Pz.cligner = function (p) { const d = p.userData.perso; if (d) d.clin = .13 }
  Pz.os = function (p, nom) { const d = p.userData.perso; return d && d.os[nom] }

  function clipPour(d, nom) {
    if (d.clips[nom]) return d.clips[nom]
    const base = Pz.anims.clips[nom]
    if (!base) return null
    const c = base.clone(), rest = d.os.pelvis.position, r0 = Pz.anims.meta.pelvisRepos
    c.tracks.forEach((t) => { if (t.name === 'pelvis.position') { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = rest.x + (v[i] - r0[0]) * d.ps; v[i + 1] = rest.y + (v[i + 1] - r0[1]) * d.ps; v[i + 2] = rest.z + (v[i + 2] - r0[2]) * d.ps } } })
    return (d.clips[nom] = c)
  }

  Pz.jouer = function (p, nom, o) {
    o = o || {}
    const d = p.userData.perso; if (!d) return false
    Pz.actifs.add(d)
    const clip = clipPour(d, nom); if (!clip) return false
    let a = d.actions[nom]
    if (!a) { a = d.actions[nom] = d.mixer.clipAction(clip) }
    a.setLoop(o.une ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!o.une
    a.timeScale = o.vitesse === undefined ? 1 : o.vitesse
    if (d.courant === a) return true
    a.enabled = true; a.reset(); a.setEffectiveWeight(1); a.play()
    if (d.courant && (o.fondu === undefined ? .2 : o.fondu) > 0) d.courant.crossFadeTo(a, o.fondu === undefined ? .2 : o.fondu, false)
    else if (d.courant) d.courant.stop()
    d.courant = a; d.nom = nom
    d.mixer.update(0)
    return true
  }
  /* pose figée sur une image du clip (t : 0..1 de la durée) */
  Pz.fige = function (p, nom, t) {
    if (!Pz.jouer(p, nom, { fondu: 0, vitesse: 0 })) return
    const d = p.userData.perso; d.courant.time = d.courant.getClip().duration * (t === undefined ? 1 : t); d.mixer.update(0)
  }
  Pz.duree = (nom) => (Pz.anims && Pz.anims.clips[nom] ? Pz.anims.clips[nom].duration : 0)

  /* correspondance avec les modes de l'ancien animPerson */
  const MODES = { idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', sprint: 'Sprint_Loop', sneak: 'Crouch_Fwd_Loop', crouch: 'Crouch_Idle_Loop', jump: 'Jump_Loop', fall: 'Jump_Loop', carry: 'Walk_Loop', talk: 'Idle_Talking_Loop', lie: 'Death01', stun: 'Hit_Head', push: 'Push_Loop', sit: 'Sitting_Idle_Loop' }
  Pz.modeMouvement = function (p, mode, o) {
    const nom = MODES[mode]; if (!nom) return false
    o = o || {}
    return Pz.jouer(p, nom, { vitesse: o.vitesse, fondu: o.fondu, une: mode === 'lie' })
  }

  /* ---------------------------------------------------------------------------------------------- avancement des mixers */
  Pz.avancer = function (scene) {
    const now = performance.now()
    Pz.actifs.forEach((d) => {
      let o = d.outer; while (o.parent) o = o.parent
      if (o !== scene) {   // hors de la scène rendue : s'il est détaché de toute scène depuis plus d'une minute, on l'oublie (jouer() le réinscrit s'il revient)
        if (o === d.outer) { if (!d.detacheDepuis) d.detacheDepuis = now; else if (now - d.detacheDepuis > 60000) Pz.actifs.delete(d) } else d.detacheDepuis = 0
        return
      }
      d.detacheDepuis = 0
      if (d.pause) { d.mixer.update(0); if (d.post) d.post(); return }   // pose déterministe (sprites) : on ré-évalue la pose figée puis on applique les proxys, sans cumul
      const dt = Math.min(0.1, (now - d.t) / 1000)
      if (dt <= 0) return
      d.t = now
      d.mixer.update(dt)
      Pz.vie(d, dt)
      if (d.post) d.post()   // le pont de compatibilité applique ici les proxys (bras levé, buste penché…) aux os
    })
  }
  /* petites vies : pop des EPI enfilés, clignement des yeux */
  Pz.vie = function (d, dt) {
    for (const k in d.epi) {
      const e = d.epi[k]; if (!e.pop || !e.pop.length) continue
      e.pop = e.pop.filter((q) => { q[1] += dt; const t = Math.min(1, q[1] / .35), s = t < .7 ? t / .7 * 1.25 : 1.25 - (t - .7) / .3 * .25; q[0].scale.setScalar(Math.max(.01, s)); if (t >= 1) { q[0].scale.setScalar(1); return false } return true })
    }
    if (d.yeux.length) {
      d.blink -= dt; if (d.blink <= 0 && !d.clin) { d.clin = .13; d.blink = 2 + Math.random() * 3.5 }
      let k = 1
      if (d.clin > 0) { d.clin -= dt; k = Math.max(.08, Math.abs(d.clin - .065) / .065); if (d.clin <= 0) { d.clin = 0; k = 1 } }
      d.yeux.forEach((m) => (m.scale.y = k))
    }
    secondaire(d, dt)
  }
  /* VIE SECONDAIRE : ce que la pose du clip ne dit pas — le poids et l'inertie (principes de « follow-through » et de « overlapping action », comme ce que cherche à apprendre UniMate).
   * Respiration du buste ; la tête et les bras prennent du retard sur le corps : freinage, démarrage, virage. Ressorts amortis, appliqués aux os APRÈS le mixer (qui réécrit chaque image).
   * ?vie=non désactive. Les proxys du pont de compatibilité (d.post) s'appliquent ensuite par-dessus. */
  const VIE_ON = !/[?&]vie=non/.test(location.search)
  const V_ = new THREE.Vector3(), Q_ = new THREE.Quaternion(), QE = new THREE.Quaternion(), EU_ = new THREE.Euler(), AXY = new THREE.Vector3(0, 1, 0)
  const ressort = (r, cible, dt, k, c) => { const a = k * (cible - r.x) - c * r.v; r.v += a * dt; r.x += r.v * dt; if (!isFinite(r.x)) { r.x = 0; r.v = 0 } return r.x }
  function secondaire(d, dt) {
    if (!VIE_ON || !d.os || !d.os.Head || dt <= 0) return
    const o = d.outer, os = d.os
    let S = d.sec
    o.updateWorldMatrix(true, false); o.getWorldPosition(V_); o.getWorldQuaternion(Q_)
    const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(Q_), yaw = Math.atan2(fw.x, fw.z)
    if (!S) { S = d.sec = { p: V_.clone(), yaw, v: new THREE.Vector3(), t: Math.random() * 20, tete: { x: 0, v: 0 }, roll: { x: 0, v: 0 }, cap: { x: 0, v: 0 }, bras: { x: 0, v: 0 }, lisse: new THREE.Vector3() }; return }
    S.t += dt
    // vitesse et accélération monde, lissées ; un saut de position (téléportation) est ignoré
    const v = V_.clone().sub(S.p).multiplyScalar(1 / dt), saut = V_.distanceTo(S.p) > 3 * Math.max(dt, .016) * 9
    let dy = yaw - S.yaw; if (dy > Math.PI) dy -= 2 * Math.PI; if (dy < -Math.PI) dy += 2 * Math.PI
    const w = saut ? 0 : dy / dt
    const acc = saut ? new THREE.Vector3() : v.clone().sub(S.v).multiplyScalar(1 / dt)
    S.p.copy(V_); S.yaw = yaw; S.v.copy(saut ? new THREE.Vector3() : v)
    S.lisse.lerp(acc, Math.min(1, dt * 9))
    const loc = S.lisse.clone().applyQuaternion(QE.copy(Q_).invert())   // accélération dans le repère du personnage (+z = devant)
    const ax = Math.max(-18, Math.min(18, loc.x)), az = Math.max(-18, Math.min(18, loc.z)), wr = Math.max(-8, Math.min(8, w))
    // têtes : recul au démarrage / piqué au freinage (tangage), inclinaison dans les virages (roulis), retard de cap
    const tangage = ressort(S.tete, Math.max(-.22, Math.min(.22, -az * .014)), dt, 70, 9)
    const roulis = ressort(S.roll, Math.max(-.2, Math.min(.2, ax * .012 - wr * .02)), dt, 60, 8)
    const cap = ressort(S.cap, Math.max(-.3, Math.min(.3, -wr * .07)), dt, 55, 8)
    EU_.set(tangage, cap, roulis, 'YXZ'); QE.setFromEuler(EU_)
    os.Head.quaternion.multiply(QE)
    if (os.neck_01) { EU_.set(tangage * .4, cap * .3, roulis * .4, 'YXZ'); os.neck_01.quaternion.multiply(QE.setFromEuler(EU_)) }
    // bras : ils se décollent du corps quand on tourne vite et balancent avec l'inertie
    const bras = ressort(S.bras, Math.max(-.22, Math.min(.22, Math.abs(wr) * .028 + Math.abs(ax) * .006)), dt, 40, 6)
    if (os.upperarm_l) { EU_.set(0, 0, bras, 'XYZ'); os.upperarm_l.quaternion.multiply(QE.setFromEuler(EU_)) }
    if (os.upperarm_r) { EU_.set(0, 0, -bras, 'XYZ'); os.upperarm_r.quaternion.multiply(QE.setFromEuler(EU_)) }
    // respiration : le buste se gonfle et se dégonfle, un peu plus vite quand le personnage court
    const vit = Math.min(1, Math.hypot(S.v.x, S.v.z) / 4), b = Math.sin(S.t * (1.5 + vit * 2.6)), k = .011 + vit * .008
    if (os.spine_03) os.spine_03.scale.set(1 + k * b, 1 + k * .35 * b, 1 + k * 1.3 * b)
    if (os.spine_02) os.spine_02.scale.set(1 + k * .5 * b, 1, 1 + k * .7 * b)
  }
  /* r128 définit render() dans le constructeur (propriété de l'instance, pas du prototype) : on enveloppe donc le constructeur */
  const WR = THREE.WebGLRenderer
  THREE.WebGLRenderer = function (o) {
    const r = new WR(o), r0 = r.render
    r.render = function (scene, camera) { if (scene && scene.isScene && !scene.userData.talasPostProcess && !scene.overrideMaterial && Pz.actifs.size) Pz.avancer(scene); return r0.apply(this, arguments) }
    return r
  }
  THREE.WebGLRenderer.prototype = WR.prototype
})()


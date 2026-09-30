/* PONT ENTRE LES ANCIENS PERSONNAGES ET LES NOUVEAUX
 * Les mini-jeux construisent leurs personnages avec makePerson / addHair / makeToon / toonFromGLB et les animent avec animPerson / animToon
 * en manipulant directement le rig (pose, hips, up, shs…). Ce pont garde exactement ces appels, mais retourne des personnages skinnés
 * (TALAS_PERSO) animés par la bibliothèque Quaternius :
 *   - rig.pose  : groupe parent du corps (sauts, glissades, inclinaisons, rotation « toupie » fonctionnent comme avant) ;
 *   - rig.up    : groupe fixe à la taille pour accrocher des objets aux coordonnées de l'ancien rig ;
 *   - rig.shs[i], rig.hips[i], rig.up.rotation… : proxys. Ce que le jeu y écrit (bras levé, buste penché, bras tendu vers une cible) est
 *     appliqué aux os APRÈS le mixer, à chaque image (les jeux réinitialisent ces valeurs dans animPerson, puis écrivent leurs surcharges) ;
 *   - rig.shs[i].children[0] : point d'accroche à la main (massue, presse-papiers, brassard…).
 * Installation : TALAS_COMPAT.installe() est appelé par start() une fois les modèles chargés. ?perso=non ou ?compat=non désactive. */
(function () {
  'use strict'
  const THREE = window.THREE, Pz = window.TALAS_PERSO
  if (!THREE || !Pz || !Pz.on) return
  const C = window.TALAS_COMPAT = { on: !/[?&]compat=non/.test(location.search), pret: false, kits: ['dylan', 'homme', 'femme', 'costaud', 'aurelien', 'bernard'] }
  if (!C.on) return
  const V3 = THREE.Vector3, Q4 = THREE.Quaternion, M4 = THREE.Matrix4
  const KH_PERSON = 1.24, KH_TOON = 1.16   // hauteur de l'ancien rig / hauteur du nouveau modèle (un peu de plus : les anciens étaient plus trapus)
  const TETE = 1.18                        // les mini-jeux montrent les personnages petits : une tête plus grosse se lit mieux (Dylan du quai garde sa tête)
  let L = null                             // fonctions d'origine (copiées à l'installation)

  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
  const sombre = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString() }
  const COIFFURES = ['courts', 'ras', 'coiffe', 'cotes', 'courts', 'courts'], CHEVEUX = ['#5a3214', '#2a1a0e', '#8a5a2e', '#3b2414', '#b0894a', '#6b4423', '#1c1410']

  /* ------------------------------------------------------------------------------------- description -> personnage */
  function specDePerson(o) {
    const h = hash(String(o.shirt) + String(o.pants) + String(o.skin) + String(o.hat))
    const skin = o.skin || '#ffd8b1'
    // « makeDylan » de l'ancien code : Dylan est toujours le vrai Dylan (casque jaune, gilet, chemise bleue)
    if (o.hat === '#ffd43b' && o.vest && o.shirt === '#4dabf7') return { nom: 'dylan', kh: KH_PERSON, pal: {}, montre: undefined }
    if (o.face === 'ceo' || o.grumpy) {
      return { nom: 'aurelien', kh: KH_PERSON, pal: { skin, nose: sombre(skin, .95), jacket: o.shirt || '#343a70', pants: o.pants || '#2b2f55' }, montre: ['cheveux:coiffe', 'barbe:moustache', 'cravate'] }
    }
    const montre = ['cheveux:' + COIFFURES[h % COIFFURES.length]]
    if (o.hat) montre.push('casque'); if (o.vest) montre.push('gilet'); if (o.tie) montre.push('cravate')
    if (h % 5 === 0) montre.push('barbe:chaume'); if (h % 7 === 3) montre.push('lunettes_vue')
    return { nom: 'homme', kh: KH_PERSON, pal: { skin, nose: sombre(skin, .93), shirt: o.shirt, pants: o.pants, hat: o.hat || undefined, hair: CHEVEUX[(h >> 3) % CHEVEUX.length], shoe: '#3a2a1a' }, montre }
  }
  const nettoie = (pal) => { const r = {}; for (const k in pal) if (pal[k]) r[k] = pal[k]; return r }

  /* ------------------------------------------------------------------------------------- fabrication du rig de compatibilité */
  function batir(g) {
    const S = g.userData.spec, R = g.userData.rig
    if (R.model) { R.pose.remove(R.model); Pz.actifs.delete(R.model.userData.perso) }
    const model = Pz.creer(S.nom, { pal: nettoie(S.pal), montre: S.montre, echelle: S.kh })
    if (!model) return false
    R.pose.add(model); R.model = model
    const d = model.userData.perso; R.perso = d
    const os = d.os
    os.Head.scale.setScalar(S.tete || TETE)
    // accroches à la main : l'axe -y du point d'accroche suit le bras (de l'épaule vers la main), à l'échelle de l'ancien rig
    ;[['upperarm_r', 'hand_r'], ['upperarm_l', 'hand_l']].forEach(([ua, ha], i) => {
      const sh = R.shs[i]; if (sh.children[0]) sh.children[0].parent = null
      const a = new THREE.Group(), hb = os[ha], dir = new V3()
      const wa = new V3(), wh = new V3(); model.updateMatrixWorld(true); os[ua].getWorldPosition(wa); hb.getWorldPosition(wh)
      // direction du bras dans le repère local de la main (pose de repos du nœud)
      const invH = new M4().copy(hb.matrixWorld).invert(); dir.copy(wa).applyMatrix4(invH).normalize()   // de la main vers l'épaule, en local main
      a.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir)
      a.scale.setScalar(1 / model.scale.x); a.position.copy(dir).multiplyScalar(.88 / model.scale.x)
      hb.add(a); sh.children = [a]                                                                           // sh n'est pas dans la scène : a n'est rendu qu'une fois
      R['main' + i] = a
    })
    R.hat = d.epi.casque ? d.epi.casque.pieces : []
    R.eyes = d.yeux.filter((m) => /^eye_/.test(m.name)); R.pupils = d.yeux.filter((m) => /^pupil_/.test(m.name))
    R.mouthS = d.bouche.S; R.mouthO = d.bouche.O; R.head = R.head || new THREE.Group()
    R.head.parent && R.head.parent.remove(R.head); os.Head.add(R.head); R.head.position.set(0, .3, .03); R.head.scale.setScalar(1 / model.scale.x)
    d.post = () => proxys(R)
    d.pause = !!R.fixe   // sprites : le jeu règle chaque image lui-même (animPerson avec une phase), le mixer n'avance pas seul
    Pz.jouer(model, 'Idle_Loop', { fondu: 0 })   // sans appel à animPerson (personnage décoratif), il respire au lieu de rester en T
    return true
  }

  function creerPerson(spec, scale) {
    const g = new THREE.Group(), pose = new THREE.Group(); g.add(pose)
    const up = new THREE.Group(); up.position.y = .8; pose.add(up)
    const mk = () => { const s = new THREE.Group(); return s }
    const R = { nouveau: 1, fixe: !!C.fixe, glb: 1, pose, up, hips: [mk(), mk()], shs: [mk(), mk()], knees: null, elbows: null, shout: 0, model: null, eyes: [], pupils: [], hat: [], shoes: [], attach: {}, eyeS: [1, 1] }
    g.userData.rig = R; g.userData.spec = spec
    if (!batir(g)) return null
    g.scale.setScalar(scale || 1)
    return g
  }

  /* ------------------------------------------------------------------------------------- proxys -> os (après le mixer) */
  const tm = new M4(), tm2 = new M4(), tq = new Q4(), tq2 = new Q4(), tp = new V3(), ts = new V3(), da = new V3(), db = new V3(), dc = new V3()
  const IDQ = new Q4()
  const actif = (q) => Math.abs(q.w) < .99999
  function poseInv(R) { R.pose.updateWorldMatrix(true, false); return tm.copy(R.pose.matrixWorld).invert() }
  function quatParent(R, bone, inv) {                                     // rotation du parent de l'os, dans le repère de pose
    const p = bone.parent; p.updateWorldMatrix(true, false)
    tm2.multiplyMatrices(inv, p.matrixWorld).decompose(tp, tq2, ts); return tq2
  }
  /* rotation delta (repère de pose) appliquée à un os : q_local' = conj(Qp) · delta · Qp · q_local */
  function tourne(R, bone, delta) {
    const inv = poseInv(R), qp = quatParent(R, bone, inv).clone()
    bone.quaternion.premultiply(qp).premultiply(delta).premultiply(qp.clone().conjugate())
  }
  /* oriente l'os pour que l'axe os->enfant pointe dans la direction dir (repère de pose) */
  function vise(R, bone, enfant, dir) {
    const inv = poseInv(R)
    bone.updateWorldMatrix(true, false); enfant.updateWorldMatrix(true, false)
    da.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(inv); db.setFromMatrixPosition(enfant.matrixWorld).applyMatrix4(inv); dc.subVectors(db, da).normalize()
    tq.setFromUnitVectors(dc, dir)
    tourne(R, bone, tq.clone())
  }
  function proxys(R) {
    const os = R.perso.os
    if (actif(R.up.quaternion)) tourne(R, os.spine_01, R.up.quaternion)
    R.hips.forEach((h, i) => { if (actif(h.quaternion)) tourne(R, os[i ? 'thigh_l' : 'thigh_r'], h.quaternion) })
    R.shs.forEach((s, i) => {
      if (!actif(s.quaternion)) return
      const dir = new V3(0, -1, 0).applyQuaternion(s.quaternion).normalize()
      vise(R, os[i ? 'upperarm_l' : 'upperarm_r'], os[i ? 'lowerarm_l' : 'lowerarm_r'], dir)
    })
  }

  /* ------------------------------------------------------------------------------------- animations : modes de l'ancien animPerson -> clips */
  const MODES = {
    idle: ['Idle_Loop', 1], talk: ['Idle_Talking_Loop', 1], walk: ['Walk_Loop', 1.35], carry: ['Walk_Loop', 1.35], run: ['Jog_Fwd_Loop', 1.5], sprint: ['Sprint_Loop', 1.25],
    sneak: ['Crouch_Fwd_Loop', 1.2], crouch: ['Crouch_Idle_Loop', 1], jump: ['Jump_Loop', 1], fall: ['Jump_Loop', .7], climb: ['Idle_Loop', 1], spin: ['Idle_Loop', 1],
    lie: ['Death01', 1], drive: ['Driving_Loop', 1], stun: ['Hit_Head', .55], sit: ['Sitting_Idle_Loop', 1], dance: ['Dance_Loop', 1], push: ['Push_Loop', 1], punch: ['Punch_Cross', 1.4], hit: ['Hit_Chest', 1], interact: ['Interact', 1]
  }
  function animNouveau(p, mode, t) {
    const R = p.userData.rig, d = R.perso
    R.pose.position.set(0, 0, 0); R.pose.rotation.set(0, 0, 0); R.pose.scale.set(1, 1, 1)
    R.up.rotation.set(0, 0, 0); R.up.scale.set(1, 1, 1); R.hips.forEach((h) => h.rotation.set(0, 0, 0)); R.shs.forEach((s) => { s.rotation.set(0, 0, 0); s.scale.set(1, 1, 1) })
    const m = MODES[mode] || MODES.idle
    if (R.fixe) {   // pose déterministe : t est une phase (période 2π/8 en marche, 2π/14 en course), le clip est figé à l'image correspondante
      Pz.jouer(R.model, m[0], { vitesse: 0, fondu: 0 })
      const c = d.courant, per = mode === 'run' ? 2 * Math.PI / 14 : 2 * Math.PI / 8, fr = (mode === 'walk' || mode === 'run') ? ((t / per) % 1 + 1) % 1 : 0
      c.time = c.getClip().duration * fr; d.mixer.update(0)
      R.perso.post && R.perso.post()
      return
    }
    Pz.jouer(R.model, m[0], { vitesse: m[1], fondu: mode === 'lie' ? .12 : .18, une: mode === 'lie' })
    if (mode === 'carry') R.shs.forEach((s) => (s.rotation.x = -1.5))
    else if (mode === 'climb') { const k = Math.sin(t * 9) * .9; R.shs[0].rotation.x = -2.6 + k; R.shs[1].rotation.x = -2.6 - k }
    else if (mode === 'spin') { R.pose.rotation.y = t * 28; R.shs.forEach((s, i) => (s.rotation.z = (i ? -1 : 1) * 1.5)) }
    else if (mode === 'lie') { R.pose.position.set(0, 0, 0) }
    // le cri : bouche ouverte quand le jeu le demande
    Pz.bouche(R.model, R.shout > 0 ? 'cri' : 'sourire'); if (R.shout > 0) R.shout = Math.max(0, R.shout - .03)
  }

  /* ------------------------------------------------------------------------------------- installation des remplaçants */
  C.installe = function () {
    if (C.pret) return true
    if (!Pz.anims || !C.kits.every((k) => Pz.modeles[k])) return false
    L = { makePerson: window.makePerson, addHair: window.addHair, animPerson: window.animPerson, makeToon: window.makeToon, animToon: window.animToon, toonFromGLB: window.toonFromGLB, wearPPE: window.wearPPE }

    window.makePerson = function (o) {
      o = o || {}
      const g = creerPerson(specDePerson(o), o.scale || 1)
      return g || L.makePerson(o)
    }
    /* Lorette et Neila : même corps, autre coiffure. On reconstruit avec le kit « femme ». */
    window.addHair = function (p, H, long, glasses) {
      const R = p && p.userData && p.userData.rig
      if (!R || !R.nouveau) return L.addHair(p, H, long, glasses)
      const S = p.userData.spec
      S.nom = 'femme'; S.pal = Object.assign({}, S.pal, { hair: H, brow: undefined }); S.montre = ['cheveux:' + (long ? 'longs' : 'carre')].concat(glasses ? ['lunettes_vue'] : [])
      if (S.pal.hat) S.montre.push('casque')
      batir(p)
      return p
    }
    window.animPerson = function (p, mode, t) {
      const R = p && p.userData && p.userData.rig
      if (R && R.nouveau) return animNouveau(p, mode, t)
      return L.animPerson.apply(this, arguments)
    }
    window.animToon = function (p, mode, t) {
      const R = p && p.userData && p.userData.rig
      if (R && R.nouveau) return animNouveau(p, mode, t)
      return L.animToon.apply(this, arguments)
    }
    /* personnages « Blender » de l'ancienne version (Dylan, Aurélien, Bernard, Georges, ouvrier) */
    const DISTRIB = { dylan: 'dylan', aurelien: 'aurelien', bernard: 'bernard', georges: 'georges', worker: 'ouvrier' }
    window.toonFromGLB = function (kind, pal, scale) {
      const nom = DISTRIB[kind]; if (!nom) return L.toonFromGLB(kind, pal, scale)
      const def = Pz.cast[nom] || {}
      const spec = { nom, kh: KH_TOON * (def.echelle || 1), pal: nettoie(pal || {}), montre: undefined }
      const g = creerPerson(spec, scale || .62)
      return g || L.toonFromGLB(kind, pal, scale)
    }
    window.makeToon = function (o) {
      o = o || {}
      let nom = 'homme'
      if (o.cigar && o.tie) nom = 'aurelien'; else if (o.belly) nom = 'costaud'
      const h = hash(String(o.shirt) + String(o.pants) + String(o.hat))
      const montre = ['cheveux:' + (nom === 'costaud' ? 'cotes' : COIFFURES[h % COIFFURES.length])]
      if (o.hat) montre.push('casque'); if (o.vest) montre.push('gilet'); if (o.tie) montre.push('cravate'); if (o.mustache) montre.push('barbe:moustache'); if (nom === 'aurelien') montre.push('cravate', 'barbe:moustache')
      const skin = o.skin || '#f2ad7e'
      const spec = { nom: nom, kh: KH_TOON, pal: { skin, nose: o.nose || sombre(skin, .93), shirt: o.shirt, jacket: o.shirt, pants: o.pants, hair: o.hair, hat: o.hat, shoe: o.shoe }, montre }
      const g = creerPerson(spec, o.scale || .62)
      return g || L.makeToon(o)
    }
    /* EPI : le nouveau personnage porte vraiment l'objet (casque, gilet, lunettes, casque antibruit, harnais, coques) */
    window.wearPPE = function (rig, k) {
      if (!rig || !rig.nouveau) return L.wearPPE(rig, k)
      Pz.porter(rig.model, k, true)
    }
    C.pret = true
    return true
  }

  /* les mini-jeux ne doivent pas recouvrir les nouveaux personnages de coques d'encre (talas-panthere.js) */
  C.coiffure = (p, style, couleur) => { const R = p.userData.rig; if (R && R.nouveau) Pz.coiffure(R.model, style, couleur); return p }
  C.montre = (p, ...groupes) => { const R = p.userData.rig; if (R && R.nouveau) groupes.forEach((g) => Pz.porter(R.model, g, true, { sans: true })); return p }
  C.langue = (p) => {   // langue pendante (centre de doc)
    const R = p.userData.rig; if (!R || !R.nouveau) return p
    const g = new THREE.Group(), m = new THREE.MeshToonMaterial({ color: '#e8506a', gradientMap: window.grad || null })
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.045, .04, .3, 8), m); t.position.y = -.15; g.add(t)
    const b = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), m); b.position.y = -.3; g.add(b)
    g.position.set(0, .13, .36); R.perso.os.Head.add(g); return p
  }
  C.tete = (p, k) => { const R = p.userData.rig; if (R && R.nouveau) R.perso.os.Head.scale.setScalar(k); return p }
  const SK = {}
  C.sk = (m) => SK[m.uuid] || (SK[m.uuid] = Object.assign(m.clone(), { skinning: true }))   // matériau à poser sur une pièce skinnée (r128 exige material.skinning)
  C.estNouveau = (o) => !!(o && o.userData && o.userData.rig && o.userData.rig.nouveau)
})()

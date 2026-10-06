/* Route & vigilance — modèles 3D : lecteur GLB (three.js r128, sans GLTFLoader), bibliothèque de véhicules / usagers produits sous Blender (tools/route/*.py → assets/route/*.glb),
 * instanciation avec peinture personnalisée, animations (roues, braquage, feux de freinage, marche, pédalage, quadrupèdes) et ombre portée.
 *   await Modeles3D.charger(THREE, onProgres)  ·  const v = Modeles3D.creer('berline', { couleur:'#c8321f' })  ·  v.maj(dt, { vitesse, braquage, freine, nuit }) */
(function (root) {
  'use strict'
  const THREE = root.THREE
  const FICHIERS = {
    joueur: 'assets/route/voiture-hatch.glb', hatch: 'assets/route/voiture-hatch-trafic.glb', citadine: 'assets/route/voiture-citadine-trafic.glb', berline: 'assets/route/voiture-berline-trafic.glb', suv: 'assets/route/voiture-suv-trafic.glb',
    fourgon: 'assets/route/voiture-fourgon-trafic.glb', camion: 'assets/route/camion.glb', cycliste: 'assets/route/cycliste.glb', pieton: 'assets/route/pieton.glb', cerf: 'assets/route/cerf.glb', chien: 'assets/route/chien.glb', vache: 'assets/route/vache.glb'
  }
  const RAYON_ROUE = { joueur: .315, hatch: .315, citadine: .29, berline: .335, suv: .375, fourgon: .34, camion: .52, cycliste: .34 }
  const lib = {}

  /* ------------------------------------------------------------------------------------------------------------- lecteur GLB */
  const TAILLE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }, TYPEA = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }
  function lireAccesseur(json, bin, idx) {
    const a = json.accessors[idx], bv = json.bufferViews[a.bufferView], T = TYPEA[a.componentType], n = TAILLE[a.type], off = (bv.byteOffset || 0) + (a.byteOffset || 0)
    const stride = bv.byteStride || n * T.BYTES_PER_ELEMENT
    if (stride === n * T.BYTES_PER_ELEMENT) return new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * T.BYTES_PER_ELEMENT))
    const out = new T(a.count * n), dv = new DataView(bin.buffer, bin.byteOffset + off - 0)
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) { const p = i * stride + k * T.BYTES_PER_ELEMENT; out[i * n + k] = T === Float32Array ? dv.getFloat32(p, true) : T === Uint16Array ? dv.getUint16(p, true) : dv.getUint32(p, true) }
    return out
  }
  function analyser(buf) {
    const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('GLB invalide')
    let p = 12, json = null, bin = null
    while (p < buf.byteLength) { const len = dv.getUint32(p, true), type = dv.getUint32(p + 4, true); const data = new Uint8Array(buf, p + 8, len); if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(data)); else if (type === 0x004E4942) bin = data; p += 8 + len }
    const mats = (json.materials || []).map((m) => {
      const pb = m.pbrMetallicRoughness || {}, c = pb.baseColorFactor || [1, 1, 1, 1], e = m.emissiveFactor || [0, 0, 0]
      let force = 1; const ext = m.extensions && m.extensions.KHR_materials_emissive_strength; if (ext) force = ext.emissiveStrength
      const mat = new THREE.MeshStandardMaterial({ name: m.name || '', color: new THREE.Color(c[0], c[1], c[2]).convertLinearToSRGB(), metalness: pb.metallicFactor === undefined ? 1 : pb.metallicFactor, roughness: pb.roughnessFactor === undefined ? 1 : pb.roughnessFactor,
        emissive: new THREE.Color(e[0], e[1], e[2]).convertLinearToSRGB(), emissiveIntensity: force, side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide })
      mat.envMapIntensity = /^(chrome|jante|frein)/.test(m.name || '') ? 1.0 : /^(verre)/.test(m.name || '') ? 1.3 : /^peinture/.test(m.name || '') ? 1.0 : .5
      if (m.alphaMode === 'BLEND' || c[3] < .99) { mat.transparent = true; mat.opacity = c[3]; mat.depthWrite = false }
      return mat
    })
    const geos = (json.meshes || []).map((m) => m.primitives.map((pr) => {
      const g = new THREE.BufferGeometry(), at = pr.attributes
      g.setAttribute('position', new THREE.BufferAttribute(lireAccesseur(json, bin, at.POSITION), 3))
      if (at.NORMAL !== undefined) g.setAttribute('normal', new THREE.BufferAttribute(lireAccesseur(json, bin, at.NORMAL), 3)); else g.computeVertexNormals()
      if (at.TEXCOORD_0 !== undefined) g.setAttribute('uv', new THREE.BufferAttribute(lireAccesseur(json, bin, at.TEXCOORD_0), 2))
      if (pr.indices !== undefined) g.setIndex(new THREE.BufferAttribute(lireAccesseur(json, bin, pr.indices), 1))
      g.computeBoundingSphere(); g.computeBoundingBox(); return { g, mat: pr.material }
    }))
    const noeuds = json.nodes.map((n) => {
      let o
      if (n.mesh !== undefined) {
        const prims = geos[n.mesh]
        if (prims.length === 1) o = new THREE.Mesh(prims[0].g, mats[prims[0].mat]); else { o = new THREE.Group(); prims.forEach((q) => o.add(new THREE.Mesh(q.g, mats[q.mat]))) }
      } else o = new THREE.Group()
      o.name = (n.name || '').replace(/\.\d+$/, '')
      if (n.matrix) { const m = new THREE.Matrix4().fromArray(n.matrix); m.decompose(o.position, o.quaternion, o.scale) }
      else { if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale) }
      o.traverse((c) => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false } })
      return o
    })
    json.nodes.forEach((n, i) => { (n.children || []).forEach((c) => noeuds[i].add(noeuds[c])) })
    const racine = new THREE.Group(); const sc = json.scenes[json.scene || 0]; sc.nodes.forEach((i) => racine.add(noeuds[i]))
    return racine
  }

  async function charger(three, onProgres) {
    const noms = Object.keys(FICHIERS); let fait = 0
    await Promise.all(noms.map(async (nom) => {
      const r = await fetch(FICHIERS[nom]); if (!r.ok) throw new Error(FICHIERS[nom] + ' : ' + r.status)
      lib[nom] = analyser(await r.arrayBuffer()); fait++; if (onProgres) onProgres(fait / noms.length, nom)
    }))
    return lib
  }


  /* ------------------------------------------------------------------------------------------------------------- environnement (reflets des carrosseries) */
  /* cubes peints à la main (ciel, horizon, sol, deux panneaux lumineux) : pas de PMREM, donc des reflets doux et sans excès de lumière diffuse */
  function creerEnvs() {
    const palettes = {
      jour: { zen: '#7fa3d8', hor: '#d9e4f2', sol: '#4e5560', panneau: 'rgba(255,255,255,.95)', k: 1 },
      crep: { zen: '#3a4c78', hor: '#8e9cbc', sol: '#262c38', panneau: 'rgba(210,222,250,.7)', k: 1 },
      nuit: { zen: '#10162a', hor: '#2a3550', sol: '#0b0d12', panneau: 'rgba(160,185,235,.35)', k: 1 }
    }, out = {}
    for (const nom in palettes) {
      const p = palettes[nom], faces = []
      for (let f = 0; f < 6; f++) {
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')
        if (f === 2) { const r = g.createRadialGradient(64, 64, 4, 64, 64, 90); r.addColorStop(0, p.panneau); r.addColorStop(.35, p.zen); r.addColorStop(1, p.zen); g.fillStyle = r; g.fillRect(0, 0, 128, 128) }
        else if (f === 3) { g.fillStyle = p.sol; g.fillRect(0, 0, 128, 128) }
        else {
          const v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, p.zen); v.addColorStop(.46, p.hor); v.addColorStop(.52, p.sol); v.addColorStop(1, p.sol); g.fillStyle = v; g.fillRect(0, 0, 128, 128)
          if (f === 0 || f === 5) { g.fillStyle = p.panneau; g.fillRect(22, 20, 84, 14) }       // longue lumière reflétée sur les flancs
        }
        faces.push(c)
      }
      const t = new THREE.CubeTexture(faces); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; out[nom] = t
    }
    return out
  }

  /* ------------------------------------------------------------------------------------------------------------- instanciation */
  let texOmbre = null
  function ombreTexture() {
    if (texOmbre) return texOmbre
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(32, 64, 4, 32, 64, 60)
    r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(.55, 'rgba(0,0,0,.24)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 128)
    texOmbre = new THREE.CanvasTexture(c); return texOmbre
  }
  const RECOLOR = new Set(['peinture', 'remorque', 'vetement1', 'vetement2'])
  function trouver(o, test, out) { out = out || []; o.traverse((c) => { if (test(c)) out.push(c) }); return out }

  /* creer(nom, { couleur, couleur2 }) : retourne un Vehicule { groupe, maj(dt, etat), pieces, materiaux } */
  function creer(nom, opt) {
    opt = opt || {}
    const modele = lib[nom === 'joueur' ? 'joueur' : nom]; if (!modele) throw new Error('modèle absent : ' + nom)
    const groupe = modele.clone(true), mats = {}
    // matériaux propres à l'instance (peinture, feux) ; la géométrie reste partagée
    groupe.traverse((c) => {
      if (!c.isMesh) return
      const m = c.material
      if (RECOLOR.has(m.name) || /^(feu_ar|phare|recul|clignotant|verre)/.test(m.name)) {
        const k = m.name + (opt.cle || ''); if (!mats[m.name]) mats[m.name] = m.clone(); c.material = mats[m.name]
      }
    })
    if (opt.couleur && mats.peinture) { mats.peinture.color.set(opt.couleur); mats.peinture.metalness = .55; mats.peinture.roughness = .3 }
    if (opt.couleur && mats.remorque && nom === 'camion') mats.remorque.color.set(opt.couleur)
    if (opt.couleur && mats.vetement1) mats.vetement1.color.set(opt.couleur)
    if (opt.couleur2 && mats.vetement2) mats.vetement2.color.set(opt.couleur2)
    const V = { nom, groupe, mats, pieces: {}, rayon: RAYON_ROUE[nom] || .34, spin: 0, marche: Math.random() * 6.28, cassee: false }
    const p = V.pieces
    p.roues = trouver(groupe, (c) => /^roue_/.test(c.name) && !c.isMesh && c.children.length && !/^roue_m|_m$/.test(c.name))
    p.braq = trouver(groupe, (c) => /^braq_/.test(c.name))
    p.bras = trouver(groupe, (c) => /^bras_[gd]$/.test(c.name)); p.jambes = trouver(groupe, (c) => /^jambe_[gd]$/.test(c.name))
    p.pattes = trouver(groupe, (c) => /^patte_/.test(c.name)); p.tete = trouver(groupe, (c) => c.name === 'tete')[0]; p.queue = trouver(groupe, (c) => c.name === 'queue')[0]
    p.pedalier = trouver(groupe, (c) => c.name === 'pedalier')[0]
    p.corps = trouver(groupe, (c) => c.isMesh && (c.name === 'carrosserie' || c.name === 'cabine' || c.name === 'remorque'))
    p.pieces = trouver(groupe, (c) => c.isMesh && /^(retro|phare|drl|clignotant|plaque|feu_ar|antibrouillard|calandre|poignee|pare_chocs|pare_soleil|deflecteur|gyro)/.test(c.name))
    // ombre portée
    const ombre = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ombreTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
    ombre.rotation.x = -Math.PI / 2; ombre.position.y = .04; ombre.renderOrder = 2; V.ombre = ombre
    const conteneur = new THREE.Group(); conteneur.add(groupe); conteneur.add(ombre); V.groupe = conteneur; V.corpsGroupe = groupe
    const bb = new THREE.Box3().setFromObject(groupe), taille = bb.getSize(new THREE.Vector3()); V.taille = taille; ombre.scale.set(taille.x * 1.18, taille.z * 1.1, 1)
    V.maj = (dt, e) => majVehicule(V, dt, e || {})
    return V
  }

  function majVehicule(V, dt, e) {
    const p = V.pieces, vit = e.vitesse || 0
    if (p.roues.length) { V.spin += vit * dt / V.rayon; for (const r of p.roues) r.rotation.x = V.spin }
    if (p.braq.length && e.braquage !== undefined) for (const b of p.braq) b.rotation.y = e.braquage * .42
    if (p.pedalier) p.pedalier.rotation.x = V.spin * .9
    const m = V.mats
    if (m.feu_ar) { m.feu_ar.emissiveIntensity = e.freine ? 3.2 : (e.nuit ? 1.0 : .35); m.feu_ar.color.set(e.freine ? '#ff4036' : '#8a0a0e') }
    if (m.phare) m.phare.emissiveIntensity = e.nuit ? 3.0 : .5
    if (m.recul) m.recul.emissiveIntensity = e.recul ? 2 : 0
    if (m.clignotant) m.clignotant.emissiveIntensity = e.detresse && (Math.floor((e.t || 0) * 2.4) % 2) ? 4 : .2
    // marche / quadrupèdes
    if (p.jambes.length || p.pattes.length) {
      const f = e.allure === undefined ? Math.min(2.2, Math.abs(vit) / 1.3) : e.allure; V.marche += dt * (2.5 + 5.5 * f) * (p.pattes.length ? 1.3 : 1)
      const amp = Math.min(.8, .25 + .22 * f) * (f < .05 ? 0 : 1)
      if (p.jambes.length) { p.jambes[0].rotation.x = Math.sin(V.marche) * amp; p.jambes[1].rotation.x = -Math.sin(V.marche) * amp; if (p.bras[0]) { p.bras[0].rotation.x = -Math.sin(V.marche) * amp * .8; p.bras[1].rotation.x = Math.sin(V.marche) * amp * .8 } }
      if (p.pattes.length) { const ph = [0, Math.PI, Math.PI, 0]; p.pattes.forEach((pt, i) => { pt.rotation.x = Math.sin(V.marche + ph[i % 4]) * amp * (f > 1.4 ? 1.5 : 1) }) ; if (p.queue) p.queue.rotation.x = Math.sin(V.marche * .7) * .15; if (p.tete) p.tete.rotation.x = Math.sin(V.marche * .5) * .05 }
    }
  }

  /* envoi de l'objet sur la route : position monde, cap, tangage et roulis suivant la pente */
  const _e = new THREE.Euler()
  function placer(piste, V, s, d, ang, opts) {
    opts = opts || {}
    const route = Math.abs(d) < 4.7, w = piste.monde(s, d, !route), e = w.e
    const y = (route ? w.y : piste.hauteurTerrain(s, d)) + (opts.z || 0)
    const pente = (piste.echant(s + 1.5).y - piste.echant(s - 1.5).y) / 3
    const cap = e.th + ang
    V.groupe.position.set(w.x, y, w.z)
    const c = Math.cos(ang), pit = -Math.atan(pente) * c, rol = (route ? e.bank : 0) * c
    V.groupe.rotation.set(pit + (opts.tangage || 0), Math.PI - cap, rol + (opts.roulis || 0), 'YXZ')
    return V
  }

  root.Modeles3D = { charger, creer, placer, lib, FICHIERS, creerEnvs }
})(typeof window !== 'undefined' ? window : globalThis)

/* LES HABITANTS DU QUAI : des personnages skinnés qui vivent sur le ponton, chacun avec un geste de la bibliothèque Quaternius —
 * le garde et sa lampe torche (Idle_Torch), deux ouvriers qui discutent (Idle_Talking), un pêcheur assis sur une caisse (Sitting_Idle),
 * une réparatrice à genoux (Fixing_Kneeling), une auditrice qui patrouille (Walk). Ils se tournent vers Dylan quand il approche et
 * bloquent le passage comme n'importe quel obstacle.
 * ISO 45001 : deux d'entre eux ont oublié un EPI (le collègue de Mathieu n'a plus son casque, Mathilde travaille sans gants ni lunettes).
 * E près d'eux : Dylan le leur rappelle, ils l'enfilent (le casque « pop », les gants et lunettes apparaissent) et Boulon rattache
 * la scène à la norme. Aucun score : c'est de la sensibilisation (§7.3), pas une épreuve.
 * Dépend de : talas-perso.js, talas-quai.js / talas-quai-vie.js (Q.pnj est appelé par Q.animer). ?pnj=non les retire. */
(function () {
  'use strict'
  const THREE = window.THREE, Pz = window.TALAS_PERSO, Q = window.TALAS_QUAI
  if (!THREE || !Pz || !Pz.on || !Q || !Q.on) return
  if (/[?&]pnj=non/.test(location.search)) return
  const angleVers = (dx, dz) => Math.atan2(dx, dz)
  const diff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d }

  Q.pnj = function (W, ctx, J) {
    const s = W.scene, DECK = ctx.DECK, gens = []
    const solide = (x, z, r, y) => Q.obstacles.push({ t: 'c', x, z, r, y })

    /* une caisse pour s'asseoir, aux couleurs du ponton */
    function caisse(x, z, ry) {
      const g = new THREE.Group(); g.position.set(x, DECK, z); g.rotation.y = ry || 0; s.add(g)
      const m = ctx.MT ? ctx.MT.bois : new THREE.MeshToonMaterial({ color: '#8a5a30' })
      const b = new THREE.Mesh(new THREE.BoxGeometry(.9, .48, .9), m); b.position.y = .24; b.castShadow = b.receiveShadow = true; g.add(b)
      const c = new THREE.Mesh(new THREE.BoxGeometry(.94, .06, .94), ctx.MT ? ctx.MT.boisSombre : m); c.position.y = .5; c.castShadow = true; g.add(c)
      Q.obstacles.push({ t: 'b', x, z, hw: .5, hd: .5, ry: ry || 0, y: DECK, h: .6 })
      return g
    }

    function ajoute(o) {
      const p = Pz.creer(o.cast, { echelle: o.echelle || .8, montre: o.montre, moins: o.moins })
      if (!p) return null
      const y = o.y === undefined ? DECK : o.y
      p.position.set(o.x, y + (o.dy || 0), o.z); p.rotation.y = o.ry || 0
      s.add(p); p.traverse((m) => { if (m.isMesh) m.castShadow = !m.userData.role || !/^(frame|lens|strap|brow|white|pupil|mouth|stubble)$/.test(m.userData.role) })
      Pz.jouer(p, o.clip, { fondu: 0, vitesse: o.vitesse || 1 })
      const n = Object.assign({ p, y, ry0: o.ry || 0, t: Math.random() * 6, mode: 'geste', fait: 0 }, o)
      if (o.rayon) solide(o.x, o.z, o.rayon, y)
      gens.push(n); return n
    }

    /* ---- le garde du portique, sa lampe torche à la main ---- */
    const garde = ajoute({ cast: 'georges', x: 1.0, z: 11.6, ry: 2.6, clip: 'Idle_Torch_Loop', rayon: .4, regard: 4.5, echelle: .82,
      parle: { invite: 'Parler au gardien', qui: 'boulon',
        texte: '<b>Georges, gardien du portique</b> : « Badge, casque, gilet, chaussures : je vérifie tout le monde à l’entrée, de nuit comme de jour. Avec ma lampe, je vois aussi les planches qui bâillent. » <i>Contrôler avant d’entrer plutôt qu’enquêter après l’accident : c’est la maîtrise opérationnelle du §8.1.</i>' } })
    if (garde) {   // la lampe : un cône de lumière chaude qui balaie doucement les planches
      const main = Pz.os(garde.p, 'hand_r'), torche = new THREE.Group(); const corps = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, .32, 8), new THREE.MeshToonMaterial({ color: '#3a3a44' })); corps.rotation.x = Math.PI / 2; torche.add(corps)
      const tete = new THREE.Mesh(new THREE.CylinderGeometry(.09, .06, .1, 10), new THREE.MeshToonMaterial({ color: '#c8c8d2' })); tete.rotation.x = Math.PI / 2; tete.position.z = .2; torche.add(tete)
      const lentille = new THREE.Mesh(new THREE.CircleGeometry(.075, 12), new THREE.MeshBasicMaterial({ color: '#fff4c8' })); lentille.position.z = .255; torche.add(lentille)
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }))
      cone.rotation.x = -Math.PI / 2; cone.position.z = 2.7; torche.add(cone)
      const l = new THREE.SpotLight('#ffe6a0', 0, 12, .5, .6, 1.2); l.position.set(0, 0, .25); l.target.position.set(0, 0, 3); torche.add(l); torche.add(l.target)
      torche.scale.setScalar(1 / (garde.p.scale.x || 1)); torche.position.set(0, -.1, .1); torche.rotation.set(-.2, 0, 0)
      if (main) main.add(torche); garde.torche = torche; garde.spot = l; garde.cone = cone
    }

    /* ---- deux ouvriers qui discutent au nord du ponton, côté ouest (la boutique occupe la plate-forme : on la laisse libre) ---- */
    const b = ajoute({ cast: 'ouvrier', x: 0.0, z: -5.2, ry: -2.1, clip: 'Idle_Talking_Loop', rayon: .4, regard: 3.2, vitesse: 1.05, montre: ['gilet', 'cheveux:ras', 'barbe:moustache', 'lunettes_vue'] })   // sans casque
    const a = ajoute({ cast: 'mathieu', x: -0.95, z: -5.9, ry: 1.0, clip: 'Idle_Talking_Loop', rayon: .4, regard: 3.2, vitesse: .95,
      parle: { invite: 'Parler à Mathieu', qui: 'karim',
        texte: '« Tu tombes bien, Dylan : Dimitri avait enlevé son casque pour me parler, et il l’a oublié sur la tête… enfin, non, justement, il ne l’a plus. Dis-lui, à toi il t’écoute. »',
        deja: '« Merci Dylan, Dimitri a remis son casque. Les bons réflexes, ça se transmet. »',
        apres: () => { if (b && !a.parle.fait) { a.parle.fait = 1; Pz.porter(b.p, 'casque', true); if (window.beep) try { beep(660, .1, 'triangle', .05) } catch (e) {} } },
        suite: { qui: 'boulon', texte: '<b>Casque remis !</b> Le rappel entre collègues est un vrai outil de prévention : l’ISO 45001 demande de consulter et de faire participer les travailleurs (§5.4) et de les sensibiliser (§7.3). Le chef d’atelier donne l’exemple, tout le monde relaie.' } } })
    if (a && b) { a.ry0 = angleVers(b.x - a.x, b.z - a.z); b.ry0 = angleVers(a.x - b.x, a.z - b.z); a.p.rotation.y = a.ry0; b.p.rotation.y = b.ry0; b.parleAvec = a }
    if (b && a) b.parle = a.parle

    /* ---- le pêcheur, assis sur une caisse au petit quai est ---- */
    caisse(4.3, 8.2, .3)
    ajoute({ cast: 'bernard', x: 4.3, z: 8.2, dy: .5, ry: 1.2, clip: 'Sitting_Idle_Loop', regard: 3.0, echelle: .8,
      parle: { invite: 'Parler à Bernard', qui: 'boulon',
        texte: '<b>Bernard</b> pêche en attendant son quart : « Mon burger est à l’abri, ne t’en fais pas ! » <i>Au bord de l’eau aussi, on pense au risque de noyade : gilet de sauvetage AVANT de tomber, jamais après. Chaque poste, même de pause, a ses dangers à identifier (§6.1.2).</i>' } })

    /* ---- la réparatrice à genoux au petit quai est : ni gants ni lunettes pour meuler une ferrure ---- */
    const rep = ajoute({ cast: 'mathilde', x: 2.7, z: 8.9, ry: 1.5, clip: 'Fixing_Kneeling', rayon: .5, regard: 0, echelle: .8,
      parle: { invite: 'Parler à Mathilde', qui: 'lea',
        texte: '« Je meule cette ferrure du ponton, deux minutes de travail… Ah, tu as raison Dylan : les gants et les lunettes, sur le tabouret, à deux pas ! »',
        deja: '« Gants, lunettes, ferrure : tout est en règle. Et demain je passe à une meuleuse à carter, promis. »',
        apres: () => { if (rep && !rep.parle.fait) { rep.parle.fait = 1; Pz.porter(rep.p, 'gants', true); Pz.porter(rep.p, 'lunettes', true); if (window.beep) try { beep(720, .1, 'triangle', .05) } catch (e) {} } },
        suite: { qui: 'boulon', texte: '<b>Gants et lunettes en place.</b> §8.1.2 : on commence par éliminer le danger (une ferrure neuve, une meuleuse à carter), puis on protège collectivement, et les EPI restent le <i>dernier recours</i>… mais quand ils sont nécessaires, on les porte, tout le temps.' } } })

    /* ---- l'auditrice qui patrouille le long du ponton avec sa tablette ---- */
    const pat = ajoute({ cast: 'lorette', x: 0.95, z: 3, ry: 0, clip: 'Walk_Loop', vitesse: 1.05, echelle: .78, regard: 0,
      parle: { invite: 'Parler à Lorette', qui: 'audit',
        texte: '« Audit interne du soir. Je note : casque, gilet, chaussures… zéro écart pour toi, Dylan. Mais je ne suis pas là pour la note : je vérifie que le système fonctionne, pas seulement que les gens sont gentils. » <i>(§9.2 : l’audit interne)</i>' } })
    if (pat) { pat.mode = 'patrouille'; pat.a = -3.2; pat.b = 9.4; pat.dir = 1; pat.vit = 1.25; pat.xline = 0.95 }

    /* ---------------------------------------------------------------- parole : E près d'un habitant */
    const proche = () => {
      let best = null, bd = 2.3
      gens.forEach((n) => { if (!n.parle || Math.abs(n.y - J.y) > 1.6) return; const d = Math.hypot(n.p.position.x - J.x, n.p.position.z - J.z); if (d < bd) { bd = d; best = n } })
      return best
    }
    W.pnjInvite = () => { const n = proche(); return n ? n.parle.invite : null }
    W.pnjParle = () => {
      const n = proche(); if (!n || typeof say !== 'function') return false
      const P = n.parle, deja = !!P.fait
      n.tourne = 2.5
      const texte = deja && P.deja ? P.deja : P.texte, tok = (W._pnjTok = (W._pnjTok || 0) + 1)    // un jeton : les répliques différées s'annulent si Dylan parle à quelqu'un d'autre entre-temps
      say(P.qui, texte, { btns: [] })
      if (P.apres) setTimeout(() => { if (tok === W._pnjTok) P.apres() }, 900)
      if (P.suite && !deja) setTimeout(() => { if (tok === W._pnjTok && typeof say === 'function') say(P.suite.qui, P.suite.texte, { btns: [] }) }, 3600)
      return true
    }

    /* ---------------------------------------------------------------- vie : regards, patrouille, torche */
    W.pnjMaj = function (dt, T) {
      const nuit = W.etat ? W.etat.x.night : 0
      gens.forEach((n) => {
        const p = n.p, dx = J.x - p.position.x, dz = J.z - p.position.z, d = Math.hypot(dx, dz)
        if (n.tourne > 0) n.tourne -= dt
        if (n.mode === 'patrouille') {
          const arret = d < 2.2 || n.tourne > 0
          if (!arret) { p.position.z += n.dir * n.vit * dt; p.position.x = n.xline }
          if (p.position.z > n.b) { n.dir = -1 } else if (p.position.z < n.a) { n.dir = 1 }
          const cible = n.dir > 0 ? 0 : Math.PI
          if (arret) { p.rotation.y += diff(angleVers(dx, dz), p.rotation.y) * Math.min(1, dt * 5); Pz.jouer(p, 'Idle_Loop', { fondu: .25 }) }
          else { p.rotation.y += diff(cible, p.rotation.y) * Math.min(1, dt * 6); Pz.jouer(p, 'Walk_Loop', { fondu: .25, vitesse: 1.05 }) }
          return
        }
        if ((n.regard && d < n.regard) || n.tourne > 0) { p.rotation.y += diff(angleVers(dx, dz), p.rotation.y) * Math.min(1, dt * 3.5) }
        else p.rotation.y += diff(n.ry0, p.rotation.y) * Math.min(1, dt * 2)
        if (n.spot) { const k = Math.min(1, nuit * 2.2); n.spot.intensity = 1.6 * k; n.cone.material.opacity = .13 * k }
      })
    }
    /* ce que les autres ne doivent pas traverser : position courante de chaque habitant (l'auditrice bouge, les autres sont aussi dans Q.obstacles) */
    W.pnjSolides = () => gens.map((n) => ({ x: n.p.position.x, z: n.p.position.z, y: n.y, r: n.mode === 'patrouille' ? .4 : .32, mobile: n.mode === 'patrouille' }))
    W.pnj = gens
    return gens
  }
})()

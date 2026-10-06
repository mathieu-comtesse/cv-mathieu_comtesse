/* Route & vigilance — la circulation : module pur (navigateur : window.Trafic3D ; Node : require), sans three.js.
 * Les usagers vivent dans le repère de la route (s : abscisse, d : écart latéral, d > 0 à droite). On roule à droite : voie du joueur d ≈ +2,25, voie inverse d ≈ −2,25.
 * Usagers : voitures, fourgons, camions (dans les deux sens), cyclistes (en bord de chaussée, en montée), piétons (hameaux, bas-côtés, traversées), animaux (cerf, chien, vache).
 * Contenu : apparition déterministe autour du joueur, conduite (suivi, freinage, évitement), événements imprévus (traversée) pour mesurer le temps de réaction,
 * collisions par rectangles orientés (SAT) et réponse en impulsion (masses, restitution), état des usagers heurtés (projetés, glissent, restent au sol). */
(function (root) {
  'use strict'
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), PI = Math.PI
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

  /* dimensions (longueur, largeur en m), masse (kg) et classe de chaque usager */
  const MODELES = {
    hatch: { L: 4.15, W: 1.78, m: 1250, classe: 'voiture' }, citadine: { L: 3.72, W: 1.72, m: 1000, classe: 'voiture' }, berline: { L: 4.68, W: 1.82, m: 1500, classe: 'voiture' }, suv: { L: 4.45, W: 1.87, m: 1850, classe: 'voiture' },
    fourgon: { L: 5.35, W: 1.86, m: 2600, classe: 'fourgon' }, camion: { L: 16.4, W: 2.55, m: 19000, classe: 'camion' },
    cycliste: { L: 1.8, W: .62, m: 95, classe: 'velo', vulnerable: true }, pieton: { L: .55, W: .55, m: 75, classe: 'pieton', vulnerable: true },
    cerf: { L: 1.9, W: .55, m: 120, classe: 'animal', vulnerable: true }, chien: { L: 1.0, W: .4, m: 25, classe: 'animal', vulnerable: true }, vache: { L: 2.4, W: .85, m: 650, classe: 'animal', vulnerable: true }
  }
  const COULEURS = ['#c8321f', '#f0f1f4', '#2a5ca8', '#1d1f26', '#7c8392', '#e8b53c', '#2e7d4f', '#b8bcc6', '#6a2c70', '#d9dde3']
  const COULEURS_CAMION = ['#f3f4f6', '#2a5ca8', '#c8321f', '#e8b53c', '#2e7d4f']

  function creer(piste, opts) {
    opts = opts || {}
    const rnd = mulberry32((opts.graine || 7) * 977 + 13), U = (a, b) => a + (b - a) * rnd(), pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length]
    const T = { piste, entites: [], nextId: 1, evenement: null, tEvt: 25, densite: opts.densite === undefined ? 1 : opts.densite, nuit: false, derniereCreation: 0, stats: { evenements: 0 } }

    function nouvelle(type, p) {
      const dim = MODELES[p.modele || type] || MODELES[type]
      const e = Object.assign({ id: T.nextId++, type, modele: p.modele || type, s: 0, d: 0, ang: 0, vs: 0, vd: 0, vang: 0, L: dim.L, W: dim.W, m: dim.m, classe: dim.classe, vulnerable: !!dim.vulnerable,
        sens: 1, vCible: 15, a: 0, freine: false, etat: 'roule', couleur: '#ccc', t: 0, hauteurSaut: 0, vz: 0, z: 0, tapis: 0, phase: rnd() * 6.28, clignote: 0, klaxon: 0 }, p)
      T.entites.push(e); return e
    }

    /* --------------------------------------------------------------------------------------------------- apparition */
    function creerVehicule(s, sens, vitesse, modele) {
      const camion = !modele && rnd() < .17, fourg = !modele && !camion && rnd() < .1
      const m = modele || (camion ? 'camion' : fourg ? 'fourgon' : pick(['hatch', 'citadine', 'berline', 'suv', 'hatch', 'berline']))
      const voie = sens > 0 ? 2.25 : -2.25
      return nouvelle(m === 'camion' ? 'camion' : m === 'fourgon' ? 'fourgon' : 'voiture', { modele: m, s, d: voie + U(-.25, .25), ang: sens > 0 ? 0 : PI, sens, vs: sens * vitesse, vCible: vitesse, couleur: m === 'camion' ? pick(COULEURS_CAMION) : pick(COULEURS), voie })
    }
    function creerCycliste(s) { return nouvelle('cycliste', { s, d: U(3.55, 3.95), ang: 0, sens: 1, vs: U(3.8, 5.6), vCible: U(3.8, 5.6), couleur: pick(['#2a5ca8', '#c8321f', '#e8b53c', '#2e7d4f', '#d9dde3']), voie: 3.75 }) }
    function creerPieton(s, d, sens, vite) { return nouvelle('pieton', { s, d, ang: sens > 0 ? 0 : PI, sens, vs: sens * (vite || U(1.1, 1.5)), vCible: vite || U(1.1, 1.5), etat: 'marche', couleur: pick(['#2a5ca8', '#c8321f', '#e8b53c', '#2e7d4f', '#6a2c70', '#d9dde3', '#1d1f26']), couleur2: pick(['#1d1f26', '#34425a', '#5a4632', '#7c8392']), enfant: rnd() < .12 }) }
    function animalAuBord(modele, s, cote) { const d = cote * U(6.4, 8.5); return nouvelle(modele, { s, d, ang: cote > 0 ? -PI / 2 : PI / 2, vs: 0, vd: 0, etat: 'attend', couleur: '#fff' }) }

    /* --------------------------------------------------------------------------------------------------- événements imprévus */
    /* Un usager surgit du bord quand le joueur est à environ `delai` secondes du point de traversée : on mesure ensuite son temps de réaction. */
    function declencherEvenement(joueur, type) {
      const v = Math.max(8, joueur.v), dist = clamp(v * U(2.6, 3.5), 38, 120), s = joueur.s + dist
      if (s > piste.longueur - 60) return null
      const cote = rnd() < .5 ? -1 : 1, dir = -cote    // il va du bord vers la chaussée
      let e
      if (type === 'pieton') { e = creerPieton(s, cote * 5.8, 1, 1.5); e.etat = 'traverse'; e.vd = dir * U(1.5, 2.0); e.vs = 0; e.ang = dir > 0 ? PI / 2 : -PI / 2; e.imprudent = true }
      else if (type === 'cerf') { e = animalAuBord('cerf', s, cote); e.etat = 'traverse'; e.vd = dir * U(3.2, 5.2); e.ang = dir > 0 ? PI / 2 : -PI / 2; e.fige = rnd() < .45 ? U(.9, 1.6) : 0; e.imprudent = true }
      else if (type === 'chien') { e = animalAuBord('chien', s, cote); e.etat = 'traverse'; e.vd = dir * U(3.4, 5.0); e.ang = dir > 0 ? PI / 2 : -PI / 2; e.imprudent = true }
      else if (type === 'cycliste') { e = creerCycliste(s); e.etat = 'roule'; e.d = 3.9; e.vs = U(3.5, 4.5); e.vd = -U(.5, .7); e.devie = true }   // le cycliste se rabat soudain dans la voie
      else if (type === 'freinage') { // un véhicule devant freine fort
        const cand = T.entites.filter((x) => x.classe !== 'velo' && !x.vulnerable && x.sens > 0 && x.s > joueur.s + 40 && x.s < joueur.s + 160 && Math.abs(x.d - 2.25) < 1.2).sort((a, b) => a.s - b.s)[0]
        if (!cand) return null; cand.freineFort = U(1.8, 3.0); e = cand
      } else return null
      e.evenement = true; T.stats.evenements++
      return (T.evenement = { id: e.id, type, tCree: joueur.t, s0: joueur.s, v0: joueur.v, dist: e.s - joueur.s, ent: e, reac: null, finie: false })
    }

    /* --------------------------------------------------------------------------------------------------- mise à jour */
    function devant(e, liste, joueur) {
      // l'obstacle le plus proche DEVANT e dans sa voie et dans son sens
      let best = null, gap = 1e9
      for (const o of liste) {
        if (o === e || o.etat === 'frappe' || o.etat === 'sol') continue
        if (Math.abs(o.d - e.d) > (o.W + e.W) / 2 + .35) continue
        const g = (o.s - e.s) * e.sens - (o.L + e.L) / 2
        if (g > -1 && g < gap) { gap = g; best = o }
      }
      if (joueur) { const dj = joueur.d, g = (joueur.s - e.s) * e.sens - (4.2 + e.L) / 2; if (Math.abs(dj - e.d) < (1.8 + e.W) / 2 + .35 && g > -1 && g < gap) { gap = g; best = { v: joueur.v * Math.sign(1), vs: joueur.v * Math.cos(joueur.psi), L: 4.2 } } }
      return { o: best, gap }
    }
    function maj(dt, joueur) {
      T.t = (T.t || 0) + dt
      const L = T.entites
      for (const e of L) {
        e.t += dt
        if (e.etat === 'frappe') { majFrappe(e, dt); continue }
        if (e.etat === 'sol') { e.vs *= Math.max(0, 1 - 4 * dt); e.vd *= Math.max(0, 1 - 4 * dt); e.s += e.vs * dt; e.d += e.vd * dt; continue }
        if (e.classe === 'voiture' || e.classe === 'fourgon' || e.classe === 'camion') conduire(e, dt, joueur)
        else if (e.classe === 'velo') pedaler(e, dt, joueur)
        else if (e.classe === 'pieton') marcher(e, dt)
        else animal(e, dt)
        e.s += e.vs * dt; e.d += e.vd * dt
        e.ang = Math.atan2(e.vd, e.vs || 1e-6) * 0 + (e.etat === 'traverse' || Math.abs(e.vd) > .2 ? Math.atan2(e.vd, e.vs || (e.sens > 0 ? 1e-3 : -1e-3)) : (e.sens > 0 ? 0 : PI))
      }
      // gestion des apparitions / disparitions
      if (T.densite > 0) peupler(dt, joueur)
      for (let i = L.length - 1; i >= 0; i--) { const e = L[i], dsj = e.s - joueur.s; if (dsj < -170 || dsj > 1100 || Math.abs(e.d) > 40) { if (T.evenement && T.evenement.ent === e) T.evenement.finie = true; L.splice(i, 1) } }
      // évènement : le premier réflexe du joueur (frein ou volant) est enregistré dans jeu.js ; ici on referme l'événement après le passage
      const ev = T.evenement
      if (ev && !ev.finie && ev.ent && (ev.ent.s < joueur.s - 25 || ev.ent.etat === 'frappe' || ev.ent.etat === 'sol')) ev.finie = true
      T.tEvt -= dt
      if (T.tEvt <= 0 && joueur.v > 9 && joueur.s > 300 && (!ev || ev.finie)) {
        const hameau = piste.hameau(joueur.s + 70, 40)
        const type = hameau ? pick(['pieton', 'pieton', 'chien', 'cycliste', 'freinage']) : pick(['cerf', 'cerf', 'chien', 'pieton', 'freinage', 'cycliste'])
        declencherEvenement(joueur, type); T.tEvt = U(26, 42)
      }
    }
    function conduire(e, dt, joueur) {
      const lim = piste.limite(e.s) * (e.classe === 'camion' ? .93 : 1), vCible = e.freineFort ? 0 : Math.min(e.vCible, lim * (e.sens > 0 ? 1.05 : 1.05))
      const v = Math.abs(e.vs), { o, gap } = devant(e, L_(), e.sens > 0 ? joueur : null)
      let a = 1.4 * (1 - Math.pow(v / Math.max(2, vCible), 4))
      if (o) { const vo = Math.abs(o.vs === undefined ? (o.v || 0) : o.vs) * (o.sens === undefined ? 1 : o.sens * e.sens > 0 ? 1 : -1); const sStar = 4 + v * 1.4 + v * (v - vo) / (2 * Math.sqrt(1.4 * 3.2)); a -= 1.4 * Math.pow(Math.max(0, sStar) / Math.max(.5, gap), 2) }
      if (e.freineFort) { a = -6.5; e.freineFort -= dt; if (e.freineFort <= 0) { e.freineFort = 0; e.vCible = Math.max(8, e.vCible * .8) } }
      // un véhicule qui voit le joueur arriver de face dans sa voie freine et se range à droite
      if (e.sens < 0 && joueur && Math.abs(joueur.d - e.d) < 2.2 && joueur.s > e.s - 90 && joueur.s < e.s + 2) { a = Math.min(a, -4.5); e.voie += (-3.9 - e.voie) * Math.min(1, dt * 1.4); e.klaxon = .5 }
      e.freine = a < -1.1
      const nv = clamp(v + a * dt, 0, 40); e.vs = nv * e.sens
      const dTarget = e.voie, dd = dTarget - e.d; e.vd = clamp(dd * 1.5, -1.6, 1.6) * Math.min(1, nv / 5)
      e.clignote = Math.max(0, e.clignote - dt); e.klaxon = Math.max(0, e.klaxon - dt)
    }
    const L_ = () => T.entites
    function pedaler(e, dt, joueur) {
      e.vs += (e.vCible - e.vs) * Math.min(1, dt)
      e.vd = e.devie ? (e.d > 3.0 ? -.65 : 0) : (e.voie + Math.sin(e.t * 1.7 + e.phase) * .12 - e.d) * 1.2
      if (e.devie && e.d <= 3.0) e.devie = false
    }
    function marcher(e, dt) {
      if (e.etat === 'traverse') {
        e.vs = 0; const dest = e.vd > 0 ? 7.5 : -7.5
        if ((e.vd > 0 && e.d > dest) || (e.vd < 0 && e.d < dest)) { e.etat = 'marche'; e.vd = 0; e.sens = 1; e.vs = e.vCible; e.d = dest }
      } else {
        e.vs = e.sens * e.vCible; e.vd = 0
        // marche le long du bord de chaussée, face à la circulation
      }
    }
    function animal(e, dt) {
      if (e.etat === 'attend') { e.vs = 0; e.vd = 0; if (e.t > 3 && e.classe === 'animal' && e.modele !== 'vache') { e.etat = 'traverse'; e.vd = (e.d > 0 ? -1 : 1) * (e.modele === 'cerf' ? 4 : 3.5) } return }
      if (e.etat === 'traverse') {
        if (e.fige > 0 && Math.abs(e.d) < 2.4) { e.fige -= dt; e.vd = 0; e.stoppe = true } else { e.stoppe = false; if (!e.vd) e.vd = (e.d > 0 ? -1 : 1) * 4 }
        const sortie = Math.abs(e.d) > 9
        if (sortie) { e.etat = 'attend'; e.vd = 0; e.vs = 0; e.t = -999 }
      }
    }
    function majFrappe(e, dt) {
      // projeté : vol balistique puis glissade
      e.vz -= 9.81 * dt; e.z += e.vz * dt; e.s += e.vs * dt; e.d += e.vd * dt; e.ang += e.vang * dt
      if (e.z <= 0) { e.z = 0; if (Math.abs(e.vz) > 2.2) { e.vz = -e.vz * .3; e.vs *= .6; e.vd *= .6; e.vang *= .7 } else { e.vz = 0; e.vs *= 1 - 2.2 * dt; e.vd *= 1 - 2.2 * dt; e.vang *= 1 - 3 * dt; if (Math.hypot(e.vs, e.vd) < .4) { e.etat = 'sol'; e.vs = e.vd = 0 } } }
      if (e.classe !== 'velo' && !e.vulnerable) { e.vs *= 1 - .35 * dt; e.vd *= 1 - .35 * dt; if (Math.hypot(e.vs, e.vd) < .6 && e.z === 0) { e.etat = 'sol'; e.freine = true } }
    }
    function peupler(dt, joueur) {
      const L = T.entites, s0 = joueur.s, d = T.densite
      const compte = (f) => L.reduce((n, e) => n + (f(e) ? 1 : 0), 0)
      const loin = (e) => e.s - s0
      const hameau = piste.hameau(s0 + 260, 160)
      // véhicules dans le sens du joueur (plus lents que lui : à dépasser) et en face
      if (compte((e) => (e.classe === 'voiture' || e.classe === 'fourgon' || e.classe === 'camion') && e.sens > 0 && loin(e) > 40) < 3 * d && rnd() < dt * .6) {
        const lim = piste.limite(s0 + 400) * 3.6, v = U(.62, .9) * lim / 3.6; creerVehicule(s0 + U(380, 650), 1, v)
      }
      if (compte((e) => (e.classe === 'voiture' || e.classe === 'fourgon' || e.classe === 'camion') && e.sens < 0 && loin(e) > 50) < 5 * d && rnd() < dt * .9) {
        const lim = piste.limite(s0 + 600); creerVehicule(s0 + U(520, 880), -1, U(.7, .98) * lim)
      }
      // quelques véhicules derrière (peuvent arriver derrière le joueur et le talonner)
      if (compte((e) => e.sens > 0 && loin(e) < -20 && e.classe !== 'velo' && !e.vulnerable) < 1 * d && rnd() < dt * .15 && joueur.v < 20) creerVehicule(s0 - U(110, 150), 1, Math.max(joueur.v + 3, 18))
      // cyclistes (montée : ils sont lents)
      if (compte((e) => e.classe === 'velo' && loin(e) > 20) < 1 * d && rnd() < dt * .08) creerCycliste(s0 + U(260, 520))
      // piétons dans les hameaux : bas-côtés et passage piéton
      if (hameau) {
        const dansHameau = (e) => e.classe === 'pieton' && e.s > hameau.s0 - 30 && e.s < hameau.s1 + 30
        if (compte(dansHameau) < 5 * d && rnd() < dt * .7) {
          const cote = rnd() < .5 ? -1 : 1, s = U(Math.max(hameau.s0, s0 + 90), hameau.s1), p = creerPieton(s, cote * 5.7, cote > 0 ? -1 : 1)
          if (rnd() < .3) { p.etat = 'traverse'; p.vd = -cote * 1.3; p.vs = 0; p.d = cote * 5.4; p.s = hameau.passage + U(-3, 3) }
        }
      } else if (compte((e) => e.classe === 'pieton' && loin(e) > 0) < 1 && rnd() < dt * .04 * d) creerPieton(s0 + U(300, 600), (rnd() < .5 ? -1 : 1) * 5.7, rnd() < .5 ? 1 : -1)
      // animaux au bord de la route (vaches à l'écart, cerfs et chiens qui attendent ou rôdent)
      if (compte((e) => e.classe === 'animal' && loin(e) > 60) < 2 * d && rnd() < dt * .05) animalAuBord(pick(['vache', 'vache', 'cerf', 'chien']), s0 + U(260, 600), rnd() < .5 ? -1 : 1)
    }

    /* --------------------------------------------------------------------------------------------------- collisions */
    /* rectangle orienté dans le repère (s, d) : centre, axes, demi-dimensions */
    function rect(s, d, ang, L, W) { const c = Math.cos(ang), n = Math.sin(ang); return { s, d, fs: c, fd: n, ls: -n, ld: c, hL: L / 2, hW: W / 2 } }
    function sat(A, B) {
      // retourne { prof, n:{s,d} (de A vers B) } ou null
      const axes = [[A.fs, A.fd], [A.ls, A.ld], [B.fs, B.fd], [B.ls, B.ld]]
      let minP = 1e9, mn = null
      const ds = B.s - A.s, dd = B.d - A.d
      for (const [as, ad] of axes) {
        const pA = A.hL * Math.abs(as * A.fs + ad * A.fd) + A.hW * Math.abs(as * A.ls + ad * A.ld)
        const pB = B.hL * Math.abs(as * B.fs + ad * B.fd) + B.hW * Math.abs(as * B.ls + ad * B.ld)
        const dist = Math.abs(ds * as + dd * ad), p = pA + pB - dist
        if (p <= 0) return null
        if (p < minP) { minP = p; mn = (ds * as + dd * ad) >= 0 ? [as, ad] : [-as, -ad] }
      }
      return { prof: minP, n: { s: mn[0], d: mn[1] } }
    }
    function pointContact(A, B, n) {
      // point du rectangle A le plus avancé vers B selon n (coin ou milieu de côté), ramené au bord de B
      const pts = []; for (const sa of [-1, 1]) for (const sb of [-1, 1]) pts.push({ s: A.s + sa * A.hL * A.fs + sb * A.hW * A.ls, d: A.d + sa * A.hL * A.fd + sb * A.hW * A.ld })
      pts.sort((p, q) => (q.s * n.s + q.d * n.d) - (p.s * n.s + p.d * n.d))
      return { s: (pts[0].s + pts[1].s) / 2, d: (pts[0].d + pts[1].d) / 2 }
    }
    /* joueur : { s, d, psi, v, L, W, m }. Retourne les contacts avec les usagers (non encore « frappés »). */
    function testerJoueur(joueur) {
      const A = rect(joueur.s, joueur.d, joueur.psi, joueur.L, joueur.W), out = []
      for (const e of T.entites) {
        if (e.etat === 'sol' && e.vulnerable) continue
        if (Math.abs(e.s - joueur.s) > (e.L + joueur.L) / 2 + 3) continue
        if (e.etat === 'frappe' && e.z > .6) continue
        const B = rect(e.s, e.d, e.ang, e.L, e.W), r = sat(A, B)
        if (r) out.push({ ent: e, prof: r.prof, n: r.n, point: pointContact(A, B, r.n) })
      }
      return out
    }
    /* réponse : met à jour la vitesse du joueur (en place) et celle de l'usager. Retourne { vrel (m/s, vitesse de rapprochement), gravite, impact } */
    function reponse(joueur, c) {
      const e = c.ent, n = c.n, mA = joueur.m, mB = e.m
      const vA = [joueur.v * Math.cos(joueur.psi), joueur.v * Math.sin(joueur.psi)], vB = [e.vs, e.vd]
      const rel = [vA[0] - vB[0], vA[1] - vB[1]], vn = rel[0] * n.s + rel[1] * n.d         // > 0 : le joueur fonce vers e
      const res = { vrel: Math.max(0, vn), vJoueur: joueur.v, eVitesse: Math.hypot(e.vs, e.vd), applique: false }
      // séparation
      joueur.s -= n.s * c.prof * (mB / (mA + mB)) * 1.05; joueur.d -= n.d * c.prof * (mB / (mA + mB)) * 1.05
      e.s += n.s * c.prof * (mA / (mA + mB)) * 1.05; e.d += n.d * c.prof * (mA / (mA + mB)) * 1.05
      if (vn <= 0.05) return res
      const rest = e.vulnerable ? .12 : .18
      const J = (1 + rest) * vn / (1 / mA + 1 / mB)
      const nvA = [vA[0] - J / mA * n.s, vA[1] - J / mA * n.d], nvB = [vB[0] + J / mB * n.s, vB[1] + J / mB * n.d]
      // moment sur le joueur : bras de levier entre le point de contact et le centre
      const rs = c.point.s - joueur.s, rd = c.point.d - joueur.d, couple = rs * (-J * n.d) - rd * (-J * n.s), I = mA * (joueur.L * joueur.L + joueur.W * joueur.W) / 12
      res.dOmega = clamp(couple / I, -2.2, 2.2)
      // la vitesse du joueur est reportée sur son cap
      const cap = [Math.cos(joueur.psi), Math.sin(joueur.psi)]
      joueur.v = Math.max(0, nvA[0] * cap[0] + nvA[1] * cap[1])
      res.vApres = joueur.v
      // usager : projeté
      e.vs = nvB[0]; e.vd = nvB[1]
      if (e.vulnerable || e.classe === 'velo') { e.etat = 'frappe'; e.vz = clamp(res.vrel * (e.classe === 'pieton' ? .38 : e.classe === 'velo' ? .3 : .22), 1.2, 9); e.vang = (rnd() - .5) * 8 + n.d * 4 * (res.vrel / 12) }
      else { e.etat = 'frappe'; e.vz = 0; e.vang = clamp(-couple / (mB * (e.L * e.L + e.W * e.W) / 12) * .5, -1.6, 1.6) + (rnd() - .5) * .2; e.freine = true }
      res.applique = true; res.e = e; return res
    }
    Object.assign(T, { maj, creerVehicule, creerCycliste, creerPieton, animalAuBord, declencherEvenement, testerJoueur, reponse, rect, sat })
    return T
  }
  const api = { creer, MODELES, gravite: null, chute: null, risquePieton: null, mulberry32 }
  api.gravite = (vrel, ent) => { const k = vrel * 3.6; if (ent && (ent.classe === 'pieton' || ent.classe === 'velo')) return k < 15 ? 'legere' : k < 40 ? 'grave' : 'critique'; if (ent && ent.classe === 'animal' && ent.m < 60) return k < 40 ? 'legere' : 'grave'; return k < 25 ? 'legere' : k < 60 ? 'grave' : 'critique' }
  api.chute = (vms) => vms * vms / (2 * 9.81)
  api.risquePieton = (kmh) => clamp(1 / (1 + Math.exp(-(kmh - 52) / 9)), .02, .98)
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Trafic3D = api
})(typeof window !== 'undefined' ? window : globalThis)

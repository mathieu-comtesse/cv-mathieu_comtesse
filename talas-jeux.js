/* Mini-jeux du Village Talas, remplaçants des tuyaux (§6) et du polygraphe (§9).
 * Script classique chargé avant le jeu ; il utilise à l'exécution les briques globales du jeu
 * (cur, say, pts, cdi, tsAdd, mk, outline, labelPlane, tween, boulonJump, boulonShake, rand, V, toonFromGLB, TalasProps, grad).
 *
 *   budget3D(n, cfg) : « Le budget de l'atelier » — défense d'atelier. Cinq postes produisent des dangers qui marchent
 *                      vers l'équipe ; chaque trimestre on finance des mesures, et chaque niveau de la hiérarchie
 *                      (§6.1.4, §8.1.2) agit différemment. Le budget fait comprendre pourquoi supprimer le danger
 *                      coûte plus cher mais rapporte à chaque trimestre. Objectif (§6.2) : santé de l'équipe > 50 %.
 *   revue3D(n, cfg)  : « Revue de direction, le jeu télé » — trois manches sur un plateau : buzzer des entrées (§9.3),
 *                      vrai ou faux de l'audit (§9.2, constats liés aux choix des autres ateliers), la grande question
 *                      (sorties de la revue, §9.3). Aurelien, le PDG, est le candidat.
 * Les deux résolvent un ratio de réussite (0 à 1), comme les autres mini-jeux. */
(function () {
  const ETAT = {} // état lisible de l'extérieur (pilote automatique des comptes rendus, tests)
  /* cadrage propre à chaque jeu (la salle cadre tout l'atelier) ; même calcul que le jeu, restauré à la fin */
  function frame(R, look, baseD, fitW) {
    const prev = { look: R.look.clone(), baseD: R.baseD, fitW: R.fitW }
    R.look.copy(look); R.baseD = baseD; R.fitW = fitW
    const vf = camera.fov * Math.PI / 180; R.dist = Math.max(R.baseD, (R.fitW / 2) / (Math.tan(vf / 2) * camera.aspect) * 1.05)
    return () => { R.look.copy(prev.look); R.baseD = prev.baseD; R.fitW = prev.fitW; const v = camera.fov * Math.PI / 180; R.dist = Math.max(R.baseD, (R.fitW / 2) / (Math.tan(v / 2) * camera.aspect) * 1.05) }
  }
  const LV = ['Élimination', 'Substitution', 'Protection collective', 'Organisation', 'EPI']
  const COST = [5, 4, 3, 2, 1]
  const LVCOL = ['#2f9e44', '#1c7ed6', '#7048e8', '#f08c00', '#e64980']
  /* ce que fait chaque niveau, en clair (mêmes règles que le moteur plus bas) */
  const EFFET = ['plus aucun danger ne sort du poste, pour toute l’année', 'moitié moins de dangers, et des dangers plus petits', 'une barrière arrête 85 % des dangers à la sortie du poste', 'balisage : les dangers ralentissent et la moitié est arrêtée', 'n’arrête rien : évite la blessure une fois sur deux']
  /* probabilité qu'un danger prévu au poste blesse quelqu'un, avec les mesures achetées */
  const passe = (p) => p.bought.has(0) ? 0 : (p.bought.has(1) ? .5 : 1) * (p.bought.has(2) ? .15 : 1) * (p.bought.has(3) ? .5 : 1) * (p.bought.has(4) ? .5 : 1)
  const vague = (q) => (q <= 2 ? 1 : 2) // dangers par poste et par trimestre : l'activité monte en cours d'année

  /* =============================== §6 : LE BUDGET DE L'ATELIER =============================== */
  function budget3D(n, cfg) {
    return new Promise(async (res) => {
      const R = cur; R.clear(); const unframe = frame(R, V(0, 1.1, -1.2), 12.5, 17.6) // cadré assez haut pour voir les mesures empilées au-dessus des postes
      const st = R.stage, SP = typeof SPD !== 'undefined' ? SPD : 1
      const P = window.TalasProps, props = cfg.postes.map((p) => p.prop).filter(Boolean)
      try { await Promise.race([Promise.all([P ? P.preload(props) : 0, typeof preloadToons === 'function' ? preloadToons() : 0]), new Promise((r) => setTimeout(r, 5000))]) } catch (e) {}

      /* ---- plateau ---- */
      mk(new THREE.BoxGeometry(18, .1, 9.4), '#e9eef5', 0, .05, -.4, st).receiveShadow = true
      const TEAM = V(0, 0, 3.3)
      const postes = cfg.postes.map((p, i) => {
        const x = -7.2 + i * 3.6, z = -3.4, g = new THREE.Group(); g.position.set(x, 0, z); st.add(g)
        outline(mk(new THREE.BoxGeometry(2.6, .22, 1.9), p.col, 0, .21, 0, g), 1.03)
        let model = null
        if (P && p.prop && P.loaded(p.prop)) { model = P.make(p.prop, {}, { gradientMap: grad, outline: 1.035 }); model.scale.setScalar(p.sc || 1); model.position.y = .32; model.rotation.y = p.ry || 0; g.add(model) }
        else model = outline(mk(new THREE.BoxGeometry(1, 1, 1), p.col, 0, .82, 0, g), 1.04)
        const lab = labelPlane(p.t, 2.8, .6, { bg: '#fffaf0', border: p.col, size: 60 }); lab.position.set(0, 2.55, 0); g.add(lab)
        const hz = labelPlane('⚠ ' + p.h, 2.8, .5, { bg: p.col, border: p.col, fg: '#fff', size: 56 }); hz.position.set(0, 2.05, 0); g.add(hz)
        // voie peinte du poste vers l'équipe
        const d = V(TEAM.x - x, 0, TEAM.z - z), L = d.length()
        for (let k = .12; k < .9; k += .09) { const s = mk(new THREE.BoxGeometry(.18, .02, .36), '#ffd43b', x + d.x * k, .11, z + d.z * k, st); s.rotation.y = Math.atan2(d.x, d.z); s.castShadow = false }
        g.userData = { hover: 1, onClick: () => pickRes && pickRes(i) }; R.clickables.push(g)
        return { ...p, i, g, model, x, z, bought: new Set(), marks: [] }
      })
      const team = new THREE.Group(); team.position.copy(TEAM); st.add(team)
      ;[-1, 0, 1].forEach((q) => {
        const w = typeof toonFromGLB === 'function' ? toonFromGLB('worker', { shirt: ['#1c7ed6', '#e8590c', '#2f9e44'][q + 1], sleeve: ['#1c7ed6', '#e8590c', '#2f9e44'][q + 1] }, .5) : null
        if (w) { w.position.set(q * 1.1, 0, 0); w.rotation.y = Math.PI; team.add(w) } else outline(mk(new THREE.CylinderGeometry(.3, .3, 1.4, 12), '#e8590c', q * 1.1, .7, 0, team), 1.05)
      })
      let hpLab = null
      const HPMAX = cfg.hp || 20; let hp = HPMAX, budget = cfg.budget || 8
      const showHp = () => { if (hpLab) team.remove(hpLab); const c = hp > HPMAX * .6 ? '#2f9e44' : hp > HPMAX * .3 ? '#f08c00' : '#e03131'; hpLab = labelPlane(`Équipe : ${hp} / ${HPMAX}`, 3, .6, { bg: '#fffaf0', border: c, fg: c, size: 70 }); hpLab.position.set(0, 2.3, 0); team.add(hpLab) }
      showHp()

      /* ---- mesures : effets et visuels ---- */
      function place(p, l) {
        p.bought.add(l); budget -= COST[l]; tsAdd('mesures')
        const tag = labelPlane(`${LV[l]} : ${p.lv[l]}`, 2.9, .46, { bg: LVCOL[l], border: LVCOL[l], fg: '#fff', size: 48 })
        tag.position.set(0, 3.05 + p.marks.length * .5, 0); p.g.add(tag); p.marks.push(tag)
        if (l === 0) { if (p.model) p.model.visible = false; const ck = outline(mk(new THREE.CylinderGeometry(.7, .7, .12, 24), '#51cf66', 0, .4, 0, p.g), 1.05); ck.rotation.x = 0; R.fx.burst(V(p.x, 1.2, p.z), 20) }
        if (l === 2) { const ring = mk(new THREE.TorusGeometry(1.25, .07, 8, 36), new THREE.MeshBasicMaterial({ color: '#74c0fc' }), 0, .35, .9, p.g); ring.rotation.x = Math.PI / 2; p.ring = ring }
        if (l === 3) { if (P && P.loaded('cone')) [-.8, .8].forEach((dx) => { const c = P.make('cone', {}, { gradientMap: grad, outline: 1.04 }); c.position.set(dx, .32, 1.1); c.scale.setScalar(1.1); p.g.add(c) }) }
        if (l === 4) { const hel = outline(mk(new THREE.SphereGeometry(.22, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#ffd43b', -1.6 + p.i * .8, 1.9, 0, team), 1.08); hel.userData.epi = 1 }
        if (l === 1) { if (p.model) p.model.traverse((o) => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color('#74c0fc'), .35) } }) }
      }

      /* ---- dangers en marche ---- */
      let hz = [], waveHits = 0, stopped = 0, B = {}
      const note = (k) => { B[k] = (B[k] || 0) + 1 }
      function spawn(p) {
        if (p.bought.has(0)) { note('elim'); return }
        const weak = p.bought.has(1)
        if (weak && Math.random() < .5) { note('subst'); return } // la substitution rend le danger rare…
        const g = new THREE.Group(); g.position.set(p.x, .6, p.z + .9); st.add(g)
        const b = outline(mk(new THREE.IcosahedronGeometry(weak ? .24 : .34, 1), p.col, 0, 0, 0, g), 1.08)
        const l = labelPlane('!', .42, .42, { bg: '#fffaf0', border: p.col, fg: p.col, size: 150 }); l.position.y = .62; g.add(l)
        const d = V(TEAM.x - p.x, 0, TEAM.z - (p.z + .9)), len = d.length(); d.normalize()
        hz.push({ g, p, d, len, s: 0, spd: 1.25 * (p.spd || 1), dmg: 1, ringDone: false, orgaDone: false, ph: rand(0, 6) })
      }
      R.extra = (dt, T) => {
        for (const h of hz) {
          if (h.dead) continue
          const slow = h.p.bought.has(3) && h.s > len3(h) * .35 && h.s < len3(h) * .7
          h.s += dt * h.spd * (slow ? .5 : 1)
          h.g.position.set(h.p.x + h.d.x * h.s, .6 + Math.abs(Math.sin(T * 6 + h.ph)) * .18, h.p.z + .9 + h.d.z * h.s)
          h.g.rotation.y += dt * 2
          if (!h.ringDone && h.s > .9) { h.ringDone = true; if (h.p.bought.has(2) && Math.random() < .85) kill(h, 'coll') }
          if (!h.dead && !h.orgaDone && h.s > h.len * .5) { h.orgaDone = true; if (h.p.bought.has(3) && Math.random() < .5) kill(h, 'orga') }
          if (!h.dead && h.s >= h.len - .4) hit(h)
        }
        postes.forEach((p) => { if (p.ring) p.ring.scale.setScalar(1 + Math.sin(T * 4) * .04) })
      }
      const len3 = (h) => h.len
      function kill(h, why) { h.dead = true; stopped++; note(why); tsAdd('parades'); R.fx.burst(h.g.position.clone(), 12); st.remove(h.g) }
      function hit(h) {
        h.dead = true; st.remove(h.g)
        const dmg = h.p.bought.has(4) && Math.random() < .5 ? 0 : h.dmg // l'EPI n'arrête pas le danger : il évite parfois la blessure
        if (!dmg) { note('epi'); R.fx.burst(TEAM.clone().add(V(0, 1.5, 0)), 6); return }
        hp = Math.max(0, hp - dmg); waveHits += dmg; showHp(); boulonShake()
        team.children.forEach((w) => { if (!w.userData.epi) { const y0 = w.position.y; tween(.3, (k) => { w.position.y = y0 + Math.sin(k * Math.PI) * .25 }) } })
      }

      /* ---- repères de clic : une flèche qui sautille au-dessus de chaque poste pendant la préparation ---- */
      const clics = postes.map((p) => { const l = labelPlane(TOUCH ? '▼ TOUCHE' : '▼ CLIQUE', 1.5, .42, { bg: '#ffd43b', border: '#212529', fg: '#212529', size: 80 }); l.position.set(p.x, 0, p.z + 1.1); l.visible = false; st.add(l); return l })
      let clicOn = false
      const extra0 = R.extra
      R.extra = (dt, T) => { extra0(dt, T); clics.forEach((l, i) => { l.visible = clicOn && !postes[i].bought.has(0) && budget > 0; l.position.y = 1.75 + Math.abs(Math.sin(T * 4 + i)) * .18 }) }

      /* ---- déroulé : préparation, trimestre, bilan ---- */
      let pickRes = null
      await say('boulon', cfg.hint + howto('budget'), { btns: [{ t: 'Comment réussir ?', go: 1 }] })
      const Q = cfg.waves || 4, TOT = Array.from({ length: Q }, (_, k) => vague(k + 1)).reduce((a, b) => a + b, 0) * postes.length, BUD = (cfg.budget || 8) + (Q - 1) * (cfg.gain || 5)
      const tr = (l) => `<tr><td style="color:${LVCOL[l]};font-weight:700;padding:1px 6px 1px 0">${LV[l]}</td><td style="text-align:right;padding-right:8px;white-space:nowrap">${COST[l]} pt${COST[l] > 1 ? 's' : ''}</td><td>${EFFET[l]}</td></tr>`
      await say('boulon', `<b>Comment réussir l’année</b><br>
        🎯 <b>Objectif :</b> finir le 4<sup>e</sup> trimestre avec <b>au moins ${Math.ceil(HPMAX / 2)} points de santé sur ${HPMAX}</b>. Chaque danger qui atteint l’équipe lui retire 1 point.<br>
        ⚠ <b>La menace :</b> chaque poste envoie 1 danger aux trimestres 1 et 2, puis 2 aux trimestres 3 et 4, soit <b>${TOT} dangers</b> si tu ne fais rien : l’équipe n’y survit pas.<br>
        💰 <b>Ton budget :</b> ${cfg.budget || 8} pts maintenant, +${cfg.gain || 5} pts à chaque trimestre (${BUD} pts sur l’année). Une mesure achetée reste en place toute l’année.
        <table style="margin:6px 0;font-size:.92em;border-collapse:collapse">${[0, 1, 2, 3, 4].map(tr).join('')}</table>
        🖱 <b>À chaque trimestre :</b> ① ${TOUCH ? 'touche' : 'clique sur'} un poste (flèche jaune), ② choisis une mesure, ③ recommence tant qu’il te reste des points, ④ appuie sur « Lancer le trimestre » et regarde.<br>
        💡 <b>Astuce :</b> supprimer un danger dès le 1<sup>er</sup> trimestre coûte cher, mais ce poste ne te coûtera plus rien ensuite. Les EPI seuls ne suffisent jamais. La prévision t’indique en direct si tu es sur la bonne voie.`, { btns: [{ t: 'C’est parti !', go: 1 }] })
      for (let q = 1; q <= Q; q++) {
        // préparation : on clique les postes pour financer, puis on lance le trimestre
        for (;;) {
          const pick = new Promise((r) => (pickRes = r))
          /* prévision : blessures attendues ce trimestre, et santé en fin d'année si l'on ne change plus rien */
          const risque = postes.reduce((a, p) => a + passe(p), 0), ceT = risque * vague(q)
          let fin = hp; for (let k = q; k <= Q; k++) fin -= risque * vague(k)
          const obj = Math.ceil(HPMAX / 2), bon = fin >= obj, col = bon ? '#2b8a3e' : fin >= obj - 3 ? '#e8590c' : '#c92a2a'
          const prev = `<div style="margin-top:4px;padding:4px 8px;border-left:4px solid ${col};background:#fff9db">📊 <b>Prévision</b> : ${vague(q) * postes.filter((p) => !p.bought.has(0)).length} danger(s) sortiront ce trimestre, environ <b>${ceT.toFixed(1).replace('.', ',')} blessure(s)</b>. Sans nouvelle mesure, l’équipe finira l’année vers <b style="color:${col}">${Math.max(0, Math.round(fin))} / ${HPMAX}</b> (objectif : ${obj}). ${bon ? 'Tu es sur la bonne voie.' : budget > 0 ? 'Investis encore : commence par les postes sans mesure.' : 'Plus de budget : lance le trimestre, tu gagneras +' + (cfg.gain || 5) + ' pts.'}</div>`
          clicOn = true
          const r = await Promise.race([say('boulon', `<b>Trimestre ${q} / ${Q}</b> · Budget : <b>${budget} pts</b> · Équipe : ${hp} / ${HPMAX}<br>${budget > 0 ? `${TOUCH ? 'Touche' : 'Clique sur'} un poste marqué d’une flèche jaune pour y financer une mesure, ou lance le trimestre.` : 'Budget épuisé pour ce trimestre.'}${prev}`, { btns: [{ t: `Lancer le trimestre ${q} ▶`, go: 1, v: 'go' }] }), pick])
          pickRes = null; clicOn = false
          if (r === 'go') break
          const p = postes[r]
          const opts = [0, 1, 2, 3, 4].filter((l) => p.lv[l] && !p.bought.has(l)).map((l) => ({ t: `<b>${LV[l]}</b> · ${p.lv[l]} <small>(${COST[l]} pt${COST[l] > 1 ? 's' : ''})</small><br><small>${EFFET[l]}</small>`, v: l }))
          if (!opts.length || p.bought.has(0)) { await say('boulon', `<b>${p.t}</b> : ${p.bought.has(0) ? 'le danger est supprimé, rien à ajouter.' : 'toutes les mesures possibles sont déjà financées.'}`); continue }
          const deja = [...p.bought].map((l) => LV[l]).join(', ')
          const choice = await say('boulon', `<b>${p.t}</b> · danger : ${p.h}<br>${deja ? `Déjà en place : ${deja} (${Math.round(passe(p) * 100)} % des dangers blessent encore). ` : 'Aucune mesure : chaque danger de ce poste blesse l’équipe. '}Budget : <b>${budget} pts</b>. Que finances-tu ?`, { btns: [...opts.map((o) => ({ ...o, t: COST[o.v] > budget ? `<s>${o.t}</s>` : o.t })), { t: 'Annuler', v: -1 }], grid: true })
          if (choice < 0 || choice === undefined) continue
          if (COST[choice] > budget) { await say('boulon', 'Pas assez de budget ce trimestre. Garde des points pour le prochain, ou choisis une mesure moins chère.'); continue }
          place(p, choice)
          if (choice === 4 && ![0, 1, 2].some((l) => p.bought.has(l))) await say('boulon', 'Des EPI seuls ? C’est le dernier recours (§8.1.2) : ils n’arrêtent pas le danger, ils limitent seulement les dégâts.', { cls: 'bad' })
        }
        // le trimestre : chaque poste envoie q dangers, espacés
        waveHits = 0; B = {}; say('boulon', `<b>Trimestre ${q} en cours…</b> Les boules « ! » sont les dangers : regarde tes mesures les arrêter avant l’équipe.`, { btns: [] })
        const n0 = q <= 2 ? 1 : 2 // l'activité monte en cours d'année
        for (let k = 0; k < n0; k++) { postes.forEach((p, i) => setTimeout(() => spawn(p), (k * 1500 + i * 260) / SP)) }
        await new Promise((r) => setTimeout(r, ((n0 - 1) * 1500 + 5 * 260) / SP + 400))
        await new Promise((r) => { const iv = setInterval(() => { if (hz.every((h) => h.dead)) { clearInterval(iv); r() } }, 150) })
        hz = []
        const ok = waveHits <= 2; pts(n, ok)
        budget += cfg.gain || 5
        const eliminated = postes.filter((p) => p.bought.has(0)).length
        const bil = [['elim', 'supprimés à la source (élimination)'], ['subst', 'évités par la substitution'], ['coll', 'arrêtés par la protection collective'], ['orga', 'arrêtés par l’organisation'], ['epi', 'blessures évitées par les EPI']].filter(([k]) => B[k]).map(([k, t]) => `<b>${B[k]}</b> ${t}`)
        await say('boulon', `<b>Fin du trimestre ${q}</b> · ${waveHits ? `${waveHits} point${waveHits > 1 ? 's' : ''} de santé perdu${waveHits > 1 ? 's' : ''}` : 'aucun blessé'} · Équipe : ${hp} / ${HPMAX} (objectif en fin d’année : ${Math.ceil(HPMAX / 2)})<br>${bil.length ? 'Tes mesures : ' + bil.join(' · ') + '.<br>' : 'Aucune mesure n’a joué : tous les dangers sont arrivés jusqu’à l’équipe.<br>'}${eliminated ? `${eliminated} source${eliminated > 1 ? 's' : ''} de danger supprimée${eliminated > 1 ? 's' : ''} : elle${eliminated > 1 ? 's' : ''} ne coûte${eliminated > 1 ? 'nt' : ''} plus rien, trimestre après trimestre.` : 'Aucune source supprimée : les mêmes dangers reviendront au trimestre suivant.'} Budget du trimestre suivant : +${cfg.gain || 5} pts.`,
          { btns: [{ t: q < Q ? 'Préparer le trimestre suivant' : 'Voir le bilan', go: 1 }], cls: ok ? 'good' : 'bad' })
      }
      // bilan pédagogique : répartition des mesures dans la hiérarchie
      const all = postes.flatMap((p) => [...p.bought]), high = all.filter((l) => l <= 2).length
      const ratio = hp / HPMAX
      await say('boulon', `<b>Bilan de l’année</b> · santé de l’équipe ${Math.round(ratio * 100)} % · ${stopped} danger${stopped > 1 ? 's' : ''} arrêté${stopped > 1 ? 's' : ''}.<br>${all.length ? `${high} mesure${high > 1 ? 's' : ''} sur ${all.length} en haut de la hiérarchie (élimination, substitution, protection collective). ` : ''}${cfg.after || ''}`, { cls: ratio >= .5 ? 'good' : 'bad' })
      R.extra = null; R.clear(); unframe(); cdi(ratio >= .85 ? 8 : ratio >= .6 ? 2 : -6); res(ratio)
    })
  }

  /* ============================ §9 : REVUE DE DIRECTION, LE JEU TÉLÉ ============================ */
  function revue3D(n, cfg) {
    return new Promise(async (res) => {
      const R = cur; R.clear(); const unframe = frame(R, V(0, 2.2, -2.2), 12.5, 15.5)
      const st = R.stage, SP = typeof SPD !== 'undefined' ? SPD : 1
      try { await Promise.race([typeof preloadToons === 'function' ? preloadToons() : 0, new Promise((r) => setTimeout(r, 5000))]) } catch (e) {}

      /* ---- plateau télé ---- */
      outline(mk(new THREE.CylinderGeometry(6.4, 6.6, .24, 48), '#3b2f8f', 0, .12, -.6, st), 1.01)
      mk(new THREE.CylinderGeometry(5.6, 5.6, .02, 48), '#5f3dc4', 0, .25, -.6, st).castShadow = false
      const bulbs = []
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, b = mk(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd43b' }), Math.cos(a) * 6.2, .3, -.6 + Math.sin(a) * 6.2, st); bulbs.push(b) }
      // écran géant
      outline(mk(new THREE.BoxGeometry(7.4, 3.6, .3), '#1b1e2b', 0, 3.6, -4.9, st), 1.02)
      for (let i = 0; i < 16; i++) { const b = mk(new THREE.SphereGeometry(.07, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff8787' }), -3.7 + i * .49, 5.5, -4.72, st); bulbs.push(b) }
      const title = labelPlane('REVUE DE DIRECTION · LE JEU', 6, .7, { bg: '#ffd43b', border: '#e03131', fg: '#c92a2a', size: 80 }); title.position.set(0, 6.05, -4.7); st.add(title)
      let screen = null, bar = null
      const show = (text, sub, col = '#fffaf0') => {
        if (screen) st.remove(screen)
        screen = labelPlane(text, 6.8, 2.1, { bg: col, border: '#1b1e2b', size: text.length > 60 ? 54 : text.length > 32 ? 66 : 84 }); screen.position.set(0, 3.8, -4.72); st.add(screen)
        if (sub) { const s2 = labelPlane(sub, 6.8, .5, { bg: '#1b1e2b', border: '#1b1e2b', fg: '#ffd43b', size: 52 }); s2.position.set(0, 2.25, -.001); screen.add(s2) }
      }
      bar = mk(new THREE.BoxGeometry(6.8, .14, .05), new THREE.MeshBasicMaterial({ color: '#ffd43b' }), 0, 1.95, -4.7, st)
      // pupitres : Aurelien (candidat) à gauche, toi et le buzzer à droite
      const pod = (x, col, name) => { const g = new THREE.Group(); g.position.set(x, .25, -1.4); st.add(g); outline(mk(new THREE.CylinderGeometry(.75, .9, 1.1, 6), col, 0, .55, 0, g), 1.03); const l = labelPlane(name, 1.8, .45, { bg: '#fffaf0', border: col, size: 60 }); l.position.set(0, .7, .8); g.add(l); return g }
      const podA = pod(-3.6, '#e03131', 'AURELIEN · PDG'), podD = pod(3.6, '#1c7ed6', 'TOI · HSE')
      const ceo = typeof toonFromGLB === 'function' ? toonFromGLB('aurelien', null, .6) : null
      if (ceo) { ceo.position.set(0, 1.05, -.2); podA.add(ceo) }
      const buzz = new THREE.Group(); buzz.position.set(0, 1.12, .35); podD.add(buzz)
      outline(mk(new THREE.CylinderGeometry(.42, .48, .18, 24), '#343a40', 0, 0, 0, buzz), 1.05)
      const cap = outline(mk(new THREE.SphereGeometry(.36, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#e03131', 0, .08, 0, buzz), 1.05)
      let scoreLab = null, good = 0, total = 0
      const score = () => { if (scoreLab) st.remove(scoreLab); scoreLab = labelPlane(`${good} / ${total}`, 1.8, .7, { bg: '#1b1e2b', border: '#ffd43b', fg: '#ffd43b', size: 110 }); scoreLab.position.set(3.6, 2.9, -1.4); st.add(scoreLab) }
      score()
      let cheer = 0
      R.extra = (dt, T) => {
        bulbs.forEach((b, i) => b.material.color.set(((i + Math.floor(T * 6)) % 3) ? '#ffd43b' : '#ff6b6b'))
        if (ceo) { ceo.position.y = 1.05 + Math.abs(Math.sin(T * (cheer > 0 ? 12 : 2))) * (cheer > 0 ? .18 : .04); ceo.rotation.y = Math.sin(T * .8) * .25 }
        cheer = Math.max(0, cheer - dt)
      }
      const mark = (ok) => { total++; if (ok) { good++; R.fx.burst(V(3.6, 3, -1.4), 18); boulonJump() } else { boulonShake(); cheer = .8 } pts(n, ok); score() }

      await say('boulon', cfg.hint + howto('revue'), { btns: [{ t: 'Que le jeu commence !', go: 1 }] })

      /* ---- manche 1 : le buzzer des entrées (§9.3) ---- */
      let buzzRes = null
      const press = () => { if (!buzzRes) return; tsAdd('buzz'); const y0 = cap.position.y; tween(.12, (k) => { cap.position.y = y0 - Math.sin(k * Math.PI) * .08 }); const r = buzzRes; buzzRes = null; r(true) }
      buzz.userData = { hover: 1, onClick: press }; R.clickables.push(buzz)
      const onKey = (e) => { if (e.code === 'Space' || e.key === 'b' || e.key === 'B') { e.preventDefault(); press() } }
      addEventListener('keydown', onKey)
      await say('boulon', '<b>Manche 1 : le buzzer des entrées.</b><br>Des sujets défilent sur l’écran. <b>Buzze</b> (clic sur le buzzer ou ESPACE) quand c’est une entrée <b>obligatoire</b> de la revue de direction (§9.3). Laisse passer le reste.', { btns: [{ t: 'Prêt !', go: 1 }] })
      let last = ''
      for (const [i, c] of cfg.entrees.entries()) {
        show(c.t, `Sujet ${i + 1} / ${cfg.entrees.length} · entrée obligatoire ? BUZZE !`); ETAT.carte = c; ETAT.manche = 1
        say('boulon', `${last}<b>Sujet ${i + 1} / ${cfg.entrees.length}.</b> Entrée obligatoire de la revue ? Buzze vite !`, { btns: [] })
        const dur = (cfg.tCard || 4200) / SP, t0 = performance.now()
        const tick = setInterval(() => { bar.scale.x = Math.max(.001, 1 - (performance.now() - t0) / dur) }, 50)
        const buzzed = await Promise.race([new Promise((r) => (buzzRes = r)), new Promise((r) => setTimeout(() => r(false), dur))])
        buzzRes = null; clearInterval(tick); bar.scale.x = 1
        const ok = buzzed === !!c.ok; mark(ok)
        last = `<span style="color:${ok ? '#2b8a3e' : '#c92a2a'}"><b>${ok ? 'Bien vu' : buzzed ? 'Hors sujet' : 'Raté'} :</b> ${c.fb}</span><br>`
        show(c.t, ok ? 'BONNE RÉPONSE' : c.ok ? 'IL FALLAIT BUZZER' : 'HORS SUJET', ok ? '#d3f9d8' : '#ffe3e3')
        await new Promise((r) => setTimeout(r, 900 / SP))
      }
      removeEventListener('keydown', onKey)

      /* ---- manche 2 : vrai ou faux de l'audit (§9.2) ---- */
      await say('ceo', `${last}<b>Manche 2 : vrai ou faux de l’audit.</b> Mes chefs d’équipe jurent que tout est conforme. À toi de dire si c’est vrai.`, { btns: [{ t: 'Envoyez les constats', go: 1 }] })
      for (const [i, c] of cfg.constats.entries()) {
        show(`« ${c.t} »`, `Constat ${i + 1} / ${cfg.constats.length} · conforme ou écart ?`); ETAT.carte = c; ETAT.manche = 2
        const ans = await Promise.race([say('ceo', `<b>Constat ${i + 1} / ${cfg.constats.length}</b> · « ${c.t} »`, { btns: [{ t: '✔ Conforme', v: 0 }, { t: '✘ Écart', v: 1 }], row: true }), new Promise((r) => setTimeout(() => r(-1), (cfg.tAudit || 9000) / SP))])
        const ok = ans === (c.lie ? 1 : 0); mark(ok); if (c.lie && ans === 1) tsAdd('ecarts')
        show(`« ${c.t} »`, ok ? (c.lie ? 'ÉCART CONFIRMÉ' : 'CONFORME') : ans < 0 ? 'TEMPS ÉCOULÉ' : 'MAUVAISE RÉPONSE', ok ? '#d3f9d8' : '#ffe3e3')
        await say('audit', `${ok ? '✔' : '✘'} ${c.lie ? c.fb || 'C’était un écart : il ouvre une action corrective (§10.2).' : 'C’était conforme : preuve vérifiée sur le terrain.'}`, { cls: ok ? 'good' : 'bad' })
      }

      /* ---- manche 3 : la grande question (§9.3) ---- */
      await say('boulon', '<b>Manche 3 : la grande question.</b> Trois questions pour conclure la revue. Aurelien a le droit de souffler… mais il souffle faux.', { btns: [{ t: 'Envoyez !', go: 1 }] })
      for (const q of cfg.questions) {
        show(q.q, 'LA GRANDE QUESTION'); ETAT.carte = q; ETAT.manche = 3
        const ans = await say('ceo', `<b>${q.q}</b>${q.souffle ? `<br><i>Aurelien souffle : « ${q.souffle} »</i>` : ''}`, { btns: q.opts.map((o, k) => ({ t: o.t, v: k })), grid: q.opts.length > 2 })
        const ok = !!q.opts[ans].ok; mark(ok)
        show(q.q, ok ? 'BONNE RÉPONSE' : 'PERDU', ok ? '#d3f9d8' : '#ffe3e3')
        await say('boulon', `${ok ? '✔' : '✘'} ${q.fb}`, { cls: ok ? 'good' : 'bad' })
      }
      const ratio = total ? good / total : 0
      show(`${good} / ${total}`, ratio >= .5 ? 'LA REVUE EST VALIDÉE' : 'LA REVUE EST À REFAIRE', ratio >= .5 ? '#d3f9d8' : '#ffe3e3')
      if (ratio >= .5) { cheer = 2; R.fx.burst(V(0, 4, -3), 40) }
      await say('ceo', `${ratio >= .5 ? 'Bon. Je signe les décisions et je libère les moyens.' : 'On refera cette revue. Avec des preuves, cette fois.'} ${cfg.after || ''}`, { cls: ratio >= .5 ? 'good' : 'bad' })
      R.extra = null; R.clear(); unframe(); cdi(ratio >= .85 ? 8 : ratio >= .6 ? 2 : -6); res(ratio)
    })
  }

  /* aides de jeu (panneau « Le but / Commandes » du jeu) */
  const addHowto = () => {
    try {
      HOWTO.budget = { but: 'Garder l’équipe au-dessus de la moitié de sa santé après quatre trimestres. Chaque trimestre, les cinq postes envoient des dangers vers l’équipe (1 par poste, puis 2 à partir du 3<sup>e</sup> trimestre). Avant chaque trimestre, dépense ton budget en mesures : elles restent en place toute l’année, et plus elles sont hautes dans la hiérarchie, plus elles coûtent et plus elles protègent.', kb: ['Clic sur un poste (flèche jaune) : choisir une mesure à financer', 'Recommence tant qu’il te reste des points', 'Bouton « Lancer le trimestre » : les dangers arrivent, tes mesures jouent', 'La prévision indique si tu es sur la bonne voie'], tc: ['Touche un poste (flèche jaune) : choisir une mesure à financer', 'Recommence tant qu’il te reste des points', 'Bouton « Lancer le trimestre » : les dangers arrivent, tes mesures jouent', 'La prévision indique si tu es sur la bonne voie'] }
      HOWTO.revue = { but: 'Trois manches sur le plateau de la revue de direction : buzze les entrées obligatoires, démasque les écarts de l’audit, réponds à la grande question.', kb: ['Clic sur le buzzer ou ESPACE : buzzer', 'Boutons : répondre'], tc: ['Touche le buzzer : buzzer', 'Boutons : répondre'] }
    } catch (e) { setTimeout(addHowto, 50) }
  }
  addEventListener('DOMContentLoaded', addHowto)

  window.TALAS_JEUX = { budget3D, revue3D, etat: ETAT, LV }
})()

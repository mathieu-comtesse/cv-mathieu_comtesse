/* Compagnons du quai : promenades sur le sol praticable et squelette rigide du robot. */
(function () {
  'use strict'
  const C = window.TALAS_COMPAGNONS = {}, THREE = window.THREE
  const angle = a => Math.atan2(Math.sin(a), Math.cos(a))
  C.promeneur = function (o) {
    const p = o.position, random = o.random || Math.random, cell = .7, maxNodes = 480
    let mode = 'pause', timer = .8, retour = 8 + random() * 10, goal = null, path = [], blocked = 0, retry = 0, speed = 0, heading = Math.PI
    const safe = (x, z, y) => o.libre(x, z, y)
    function line(a, b) {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .16)); let y = a.y
      for (let i = 1; i <= n; i++) { const v = safe(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, y); if (v === null) return false; y = v }
      return Math.abs(y - b.y) < .7
    }
    function route(target) {
      const start = { x: p.x, y: p.y, z: p.z, i: 0, j: 0, g: 0, parent: null }, open = [start], seen = new Map(), closed = new Set()
      const heuristic = n => Math.hypot(n.x - target.x, n.z - target.z) + Math.abs(n.y - target.y) * 1.8
      const key = n => n.i + ',' + n.j + ',' + Math.round(n.y * 5)
      start.f = heuristic(start); let best = start
      if (line(start, target)) return [target]
      for (let expanded = 0; open.length && expanded < maxNodes; expanded++) {
        let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i
        const n = open.splice(bi, 1)[0], k = key(n); if (closed.has(k)) continue; closed.add(k)
        if (heuristic(n) < heuristic(best)) best = n
        if (heuristic(n) < cell * 1.3 && line(n, target)) { best = { ...target, parent: n }; break }
        for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
          const x = start.x + (n.i + di) * cell, z = start.z + (n.j + dj) * cell, y = safe(x, z, n.y)
          if (y === null) continue
          const child = { x, y, z, i: n.i + di, j: n.j + dj, parent: n, g: n.g + Math.hypot(di, dj) * cell + Math.abs(y - n.y) * 1.2 }, ck = key(child)
          if (closed.has(ck) || (seen.has(ck) && seen.get(ck) <= child.g) || !line(n, child)) continue
          seen.set(ck, child.g); child.f = child.g + heuristic(child); open.push(child)
        }
      }
      const points = []; while (best.parent) { points.push({ x: best.x, y: best.y, z: best.z }); best = best.parent }
      return points.reverse()
    }
    function near(joueur) {
      for (let i = 0; i < 20; i++) { const a = random() * Math.PI * 2, r = 1.1 + random() * 1.2, x = joueur.x + Math.sin(a) * r, z = joueur.z + Math.cos(a) * r, y = safe(x, z, joueur.y); if (y !== null) return { x, y, z } }
      return null
    }
    function destination(joueur, returning) {
      let target = returning ? near(joueur) : null
      if (!returning) for (let i = 0; i < 24; i++) {
        const a = random() * Math.PI * 2, r = 1.6 + random() * 4.8, x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r
        if (Math.hypot(x - joueur.x, z - joueur.z) > 18) continue
        const y = safe(x, z, p.y); if (y !== null) { target = { x, y, z }; break }
      }
      goal = target; path = target ? route(target) : []; blocked = 0; retry = 1.2
      if (!path.length) { mode = 'pause'; timer = .7 + random() * 1.5; return }
      mode = returning ? 'retour' : 'balade'; timer = 5 + random() * 7
    }
    const api = {
      update(dt, joueur) {
        dt = Math.max(0, Math.min(.1, dt)); timer -= dt; retour -= dt; retry -= dt
        const distance = Math.hypot(p.x - joueur.x, p.z - joueur.z)
        // Récupération seulement après une téléportation du joueur ou une position devenue invalide.
        if (distance > 40 || o.sol(p.x, p.z, p.y) === null) { const q = near(joueur); if (q) { p.x = q.x; p.y = q.y; p.z = q.z; path = []; mode = 'pause'; timer = 1; speed = 0 } }
        if (mode !== 'retour' && retry <= 0 && (retour <= 0 || distance > 18)) { retour = 10 + random() * 12; destination(joueur, true) }
        else if (mode === 'pause' && timer <= 0) destination(joueur, false)
        else if (mode === 'retour' && distance < 2.5) { mode = 'pause'; path = []; timer = 1.4 + random() * 2.2 }
        else if (mode === 'retour' && retry <= 0 && goal && Math.hypot(goal.x - joueur.x, goal.z - joueur.z) > 3) destination(joueur, true)
        else if (mode === 'balade' && timer <= 0) { mode = 'pause'; path = []; timer = .7 + random() * 2.4 }
        while (path.length && Math.hypot(path[0].x - p.x, path[0].z - p.z) < .16) path.shift()
        if (!path.length && mode !== 'pause') { mode = 'pause'; timer = .8 + random() * 2 }
        const wanted = path.length ? (mode === 'retour' ? 3.9 : 1.25 + .65 * Math.sin(timer * .4) ** 2) : 0
        speed += (wanted - speed) * (1 - Math.exp(-dt * 6))
        let moved = 0
        if (path.length && speed > .02) {
          const q = path[0], d = Math.hypot(q.x - p.x, q.z - p.z), step = Math.min(d, speed * dt), a = Math.atan2(q.x - p.x, q.z - p.z)
          const n = { x: p.x + Math.sin(a) * step, z: p.z + Math.cos(a) * step, y: p.y }, y = safe(n.x, n.z, p.y)
          if (y !== null) { n.y = y; if (line(p, n)) { p.x = n.x; p.y = n.y; p.z = n.z; moved = step; heading += angle(a - heading) * (1 - Math.exp(-dt * 8)); blocked = 0 } }
          if (!moved) { blocked += dt; speed *= .5; if (blocked > .6 && retry <= 0) { if (mode === 'retour') destination(joueur, true); else destination(joueur, false) } }
        }
        api.mode = mode; api.angle = heading; api.speed = dt > 0 ? moved / dt : 0
        return api
      },
      caresse() { mode = 'pause'; path = []; timer = 2; retour = 10 + random() * 12 },
      rappeler() { retour = 0 },
      mode, angle: heading, speed: 0
    }
    return api
  }

  C.articulerBoulon = function (g) {
    if (!THREE || g.userData.skeleton) return g
    const U = g.userData, bones = [], bone = (name, parent, x, y, z) => { const b = new THREE.Bone(); b.name = 'boulon_' + name; b.position.set(x, y, z); parent.add(b); bones.push(b); return b }
    g.updateMatrixWorld(true)
    const parts = []; g.traverse(o => { if (o.isMesh && !o.userData.ink && !o.parent.isMesh && !isRotor(o)) parts.push(o) })
    function isRotor(o) { for (let p = o; p && p !== g; p = p.parent) if (p === U.prop) return true; return false }
    const spine = bone('buste', g, 0, 1.45, 0), head = bone('tete', spine, 0, 0, 0), antenna = bone('antenne', head, 0, .8, 0), arms = [], legs = []
    for (const side of [-1, 1]) {
      const shoulder = bone('epaule_' + side, spine, side * .9, -.04, .02), elbow = bone('coude_' + side, shoulder, side * .18, -.37, .1), wrist = bone('poignet_' + side, elbow, side * .12, -.22, .06)
      arms.push({ shoulder, elbow, wrist, side })
      const hip = bone('hanche_' + side, spine, side * .35, -.7, 0), knee = bone('genou_' + side, hip, 0, -.27, 0), ankle = bone('cheville_' + side, knee, 0, -.3, .08)
      legs.push({ hip, knee, ankle, side })
    }
    g.updateMatrixWorld(true)
    const box = new THREE.Box3(), centre = new THREE.Vector3()
    for (const o of parts) {
      const name = o.name.toLowerCase(); box.setFromObject(o); box.getCenter(centre); g.worldToLocal(centre); const i = centre.x < 0 ? 0 : 1
      let parent = head
      if (/pince|hand/.test(name)) parent = arms[i].wrist
      else if (/bras|arm|epaule|boulon__|tete__dark/.test(name)) parent = arms[i].shoulder
      else if (/pied|foot/.test(name)) parent = legs[i].ankle
      else if (/jambe|leg/.test(name)) parent = legs[i].hip
      else if (/cou__|antenne/.test(name)) parent = antenna
      parent.attach(o) // pièces mécaniques rigides ; les pivots conservent exactement la pose du modèle.
    }
    if (U.prop) head.attach(U.prop)
    U.skeleton = new THREE.Skeleton(bones); U.rig = { spine, head, antenna, arms, legs }
    let velocity = 0, gesture = 0, nextGesture = 4 + Math.random() * 6, blink = 0, nextBlink = 2 + Math.random() * 3
    const eyes = parts.filter(o => o.name.startsWith('visage_eye'))
    U.animer = function (dt, T, o) {
      o = o || {}; dt = Math.min(.1, Math.max(0, dt)); const sp = Math.min(1, (o.speed || 0) / 5)
      velocity += (sp - velocity) * (1 - Math.exp(-dt * 5)); nextGesture -= dt; nextBlink -= dt
      if (nextGesture <= 0) { gesture = 1; nextGesture = 7 + Math.random() * 10 } gesture = Math.max(0, gesture - dt * .8)
      if (nextBlink <= 0) { blink = .16; nextBlink = 2 + Math.random() * 4 } blink = Math.max(0, blink - dt)
      const talk = o.talk ? 1 : 0, salute = Math.sin(gesture * Math.PI), phase = T * (2.4 + velocity * 3)
      spine.rotation.x = -.10 * velocity + Math.sin(T * 1.8) * .025; spine.rotation.z = Math.sin(T * 1.35) * .035
      head.rotation.y = Math.sin(T * .65) * .13 + Math.sin(T * 2.8) * .045 * talk
      head.rotation.x = Math.sin(T * 3.4) * .055 * talk; antenna.rotation.z = Math.sin(T * 3.3) * .05
      arms.forEach((a, i) => { a.shoulder.rotation.x = Math.sin(phase + i * Math.PI) * (.08 + velocity * .23) - talk * (.15 + .2 * Math.sin(T * 3 + i)); a.shoulder.rotation.z = a.side * (.09 + (i === 1 ? salute * .6 : .06 * Math.sin(T * 1.9))); a.elbow.rotation.x = -.08 + Math.sin(phase + i * Math.PI) * .09 - talk * .14; a.wrist.rotation.y = Math.sin(T * 2.2 + i) * (.1 + salute * .25) })
      legs.forEach((a, i) => { a.hip.rotation.x = Math.sin(phase + i * Math.PI) * (.045 + velocity * .25); a.knee.rotation.x = Math.max(0, Math.sin(phase + i * Math.PI)) * (.04 + velocity * .14); a.ankle.rotation.x = Math.sin(phase + i * Math.PI) * .05 })
      eyes.forEach(e => { e.scale.y = blink > 0 ? .15 : 1 })
      if (U.prop) U.prop.rotation.y += dt * (9 + velocity * 7)
      g.updateMatrixWorld(true)
      U.skeleton.update()
    }
    return g
  }
})()

/* Banc de capture de la préversion (jamais chargé par le vrai site) : enregistre des séquences scriptées du jeu
 * en vidéo WebM et les dépose dans le stockage de l'artifact, pour les comptes rendus visuels.
 *
 * - force preserveDrawingBuffer : la toile WebGL du jeu (640 × 480, pixels nets) se relit à tout moment ;
 * - compose chaque image dans une toile 1280 × 720 : jeu agrandi sans lissage + calques HTML de l'ouverture
 *   (logo du studio, signature, titre, bandes cinéma, flash) redessinés + légende du compte rendu ;
 * - séquences : intro, île (avant/après, même trajet de caméra), parcours (avant/après, même course automatique).
 * API console : await TalasCapture.run('ile', {apres:true}) -> {id, url, seconds, bytes}. */
(function () {
  /* 0. les artifacts ne servent pas .glb : la préversion les publie en .glb.wasm (binaire servi) ; on réécrit les requêtes */
  const f0 = window.fetch.bind(window), LOCAL = location.protocol === 'file:'
  // enregistrement local (Chrome sans interface, fichiers du dépôt) : fetch() ne lit pas file://, XMLHttpRequest oui
  const xhr = (u) => new Promise((ok, ko) => {
    const r = new XMLHttpRequest(); r.open('GET', new URL(u.split('?')[0], document.baseURI).href); r.responseType = 'arraybuffer'
    r.onload = () => { const b = r.response; ok({ ok: !!b && b.byteLength > 0, status: b ? 200 : 404, arrayBuffer: async () => b, text: async () => new TextDecoder().decode(b), json: async () => JSON.parse(new TextDecoder().decode(b)) }) }
    r.onerror = () => ko(new Error('lecture impossible : ' + u)); r.send()
  })
  window.fetch = (u, o) => typeof u !== 'string' ? f0(u, o) : LOCAL && !/^https?:/.test(u) ? xhr(u) : f0(LOCAL ? u : u.replace(/\.glb(\?|$)/, '.glb.wasm$1'), o)

  /* horloge virtuelle (window.__VIRTUAL_TIME, posé par tools/forge/preview/record.mjs) : une fois activée, le temps
     n'avance que par step(ms) — minuteries, requestAnimationFrame, performance.now, Date.now et animations CSS —
     d'où des vidéos parfaitement régulières à 30 i/s même si le rendu logiciel est lent */
  const VT = (() => {
    const rNow = performance.now.bind(performance), rDate = Date.now, rRAF = window.requestAnimationFrame.bind(window)
    const rST = window.setTimeout.bind(window), rCT = window.clearTimeout.bind(window), rSI = window.setInterval.bind(window), rCI = window.clearInterval.bind(window)
    let on = false, now = 0, t0 = 0, d0 = 0, id = 1e6, rafs = [], timers = new Map(), anims = new Map()
    if (!window.__VIRTUAL_TIME) return { enabled: false }
    performance.now = () => (on ? now : rNow()); Date.now = () => (on ? d0 + (now - t0) : rDate())
    window.requestAnimationFrame = (f) => { if (!on) return rRAF(f); const k = ++id; rafs.push([k, f]); return k }
    window.cancelAnimationFrame = (k) => { rafs = rafs.filter((r) => r[0] !== k) }
    window.setTimeout = (f, ms = 0, ...a) => { if (!on) return rST(f, ms, ...a); const k = ++id; timers.set(k, { at: now + Math.max(0, ms), f, a }); return k }
    window.setInterval = (f, ms = 0, ...a) => { if (!on) return rSI(f, ms, ...a); const k = ++id; timers.set(k, { at: now + Math.max(1, ms), f, a, every: Math.max(1, ms) }); return k }
    window.clearTimeout = (k) => (timers.has(k) ? timers.delete(k) : rCT(k)); window.clearInterval = (k) => (timers.has(k) ? timers.delete(k) : rCI(k))
    const syncAnims = () => document.getAnimations().forEach((a) => {
      if (!anims.has(a)) { anims.set(a, now - (a.currentTime || 0)); a.pause() }
      a.currentTime = now - anims.get(a)
    })
    return {
      enabled: true,
      enable() { if (on) return; t0 = now = rNow(); d0 = rDate(); on = true; syncAnims() },
      async step(ms) {
        const end = now + ms
        for (;;) { // minuteries échues, dans l'ordre, y compris celles créées pendant le pas
          let best = null; for (const [k, t] of timers) if (t.at <= end && (!best || t.at < best[1].at)) best = [k, t]
          if (!best) break
          const [k, t] = best; now = Math.max(now, t.at)
          if (t.every) t.at += t.every; else timers.delete(k)
          try { t.f(...t.a) } catch (e) { console.error(e) }
        }
        now = end
        const list = rafs; rafs = []; for (const [, f] of list) { try { f(now) } catch (e) { console.error(e) } }
        syncAnims()
        await new Promise((r) => rRAF(() => rRAF(r))) // laisse le navigateur peindre avant la capture
      },
    }
  })()

  /* 1. toile WebGL relisible (doit passer avant la création du renderer par le jeu) */
  const R0 = THREE.WebGLRenderer
  THREE.WebGLRenderer = function (o) { return new R0(Object.assign({}, o, { preserveDrawingBuffer: true })) }
  THREE.WebGLRenderer.prototype = R0.prototype

  const OUT_W = 1280, OUT_H = 720
  const comp = document.createElement('canvas'); comp.width = OUT_W; comp.height = OUT_H
  const cx = comp.getContext('2d')
  let caption = '', drawing = false, svgImg = null, svgSrc = ''

  /* 2. calques HTML redessinés */
  function opacityOf(el) { let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity || 1); return o }
  function drawDom(cvRect) {
    const intro = document.querySelector('.pintro'); if (!intro) return
    const sx = OUT_W / cvRect.width, sy = OUT_H / cvRect.height
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - cvRect.left) * sx, y: (r.top - cvRect.top) * sy, w: r.width * sx, h: r.height * sy, r } }
    const rect = (sel) => { const el = intro.querySelector(sel); if (!el) return; const b = box(el), cs = getComputedStyle(el); cx.globalAlpha = opacityOf(el); cx.fillStyle = cs.backgroundColor; cx.fillRect(b.x, b.y, b.w, b.h) }
    const text = (el, fill, shadow) => {
      if (!el) return; const b = box(el), cs = getComputedStyle(el), k = b.r.width / (el.offsetWidth || b.r.width) * sx
      cx.globalAlpha = opacityOf(el); cx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * k}px ${cs.fontFamily}`
      try { cx.letterSpacing = `${parseFloat(cs.letterSpacing || 0) * k || 0}px` } catch (e) {}
      cx.textAlign = 'center'; cx.textBaseline = 'middle'
      const t = cs.textTransform === 'uppercase' ? el.textContent.toUpperCase() : el.textContent, X = b.x + b.w / 2, Y = b.y + b.h / 2
      if (shadow) { cx.fillStyle = shadow[0]; cx.fillText(t, X + shadow[1] * k, Y + shadow[2] * k) }
      cx.fillStyle = fill(b, cs); cx.fillText(t, X, Y)
    }
    rect('.pblack'); rect('.ptop'); rect('.pbot')
    const logo = intro.querySelector('.plogo svg')
    if (logo) {
      if (svgSrc !== logo.outerHTML) { svgSrc = logo.outerHTML; svgImg = new Image(); const x = svgSrc.includes('xmlns') ? svgSrc : svgSrc.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'); svgImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(x) }
      if (svgImg.complete && svgImg.naturalWidth) { const b = box(logo); cx.globalAlpha = opacityOf(logo); cx.drawImage(svgImg, b.x, b.y, b.w, b.h) }
    }
    // mot du studio : dégradé gris avec reflet blanc qui balaie (background-position animée)
    text(intro.querySelector('.pword'), (b, cs) => {
      const p = parseFloat((cs.backgroundPositionX || cs.backgroundPosition || '100%').split(' ')[0]) / 100 || 0
      const x0 = b.x + (b.w - 3 * b.w) * p, g = cx.createLinearGradient(x0, 0, x0 + 3 * b.w, 0)
      g.addColorStop(0, '#8a93a6'); g.addColorStop(.4, '#8a93a6'); g.addColorStop(.5, '#ffffff'); g.addColorStop(.6, '#8a93a6'); g.addColorStop(1, '#8a93a6'); return g
    })
    text(intro.querySelector('.psub'), (b, cs) => cs.color)
    text(intro.querySelector('.ptitle b'), (b, cs) => cs.color, ['#b35900', 0, 4])
    text(intro.querySelector('.ptitle i'), (b, cs) => cs.color, ['rgba(0,0,0,.8)', 0, 2])
    rect('.pflash')
    cx.globalAlpha = 1
  }

  function frame() {
    if (!drawing) return
    requestAnimationFrame(frame)
    const cv = document.getElementById('cv'), r = cv.getBoundingClientRect()
    cx.imageSmoothingEnabled = false; cx.globalAlpha = 1; cx.fillStyle = '#000'; cx.fillRect(0, 0, OUT_W, OUT_H)
    // la toile du jeu est en 4:3 ou élargie : on la cadre en 16:9 sans déformer
    const a = cv.width / cv.height, t = OUT_W / OUT_H
    let sw = cv.width, sh = cv.height, sx = 0, sy = 0
    if (a > t) { sw = cv.height * t; sx = (cv.width - sw) / 2 } else { sh = cv.width / t; sy = (cv.height - sh) / 2 }
    cx.drawImage(cv, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H)
    drawDom({ left: r.left + sx / cv.width * r.width, top: r.top + sy / cv.height * r.height, width: sw / cv.width * r.width, height: sh / cv.height * r.height })
    if (caption) { // légende du compte rendu
      cx.font = '600 22px "Trebuchet MS", sans-serif'; const w = cx.measureText(caption).width + 36
      cx.globalAlpha = .82; cx.fillStyle = '#10131c'; cx.fillRect(24, OUT_H - 64, w, 40); cx.globalAlpha = 1
      cx.fillStyle = '#ffd43b'; cx.fillRect(24, OUT_H - 64, 6, 40); cx.fillStyle = '#fff'; cx.textAlign = 'left'; cx.textBaseline = 'middle'; cx.fillText(caption, 42, OUT_H - 44)
    }
  }

  async function record(seconds, script, label) {
    caption = label || ''; drawing = true; frame()
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m))
    const rec = new MediaRecorder(comp.captureStream(30), { mimeType: mime, videoBitsPerSecond: 3500000 })
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start(1000)
    const t0 = performance.now()
    await Promise.race([script(), new Promise((r) => setTimeout(r, seconds * 1000))])
    const left = seconds * 1000 - (performance.now() - t0); if (left > 0) await new Promise((r) => setTimeout(r, left))
    rec.stop(); await done; drawing = false
    return new Blob(chunks, { type: 'video/webm' })
  }

  /* 3. utilitaires de mise en scène */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const hideUi = () => {
    document.querySelectorAll('.mbody').forEach((m) => { let p = m; while (p.parentElement && p.parentElement.id !== 'frame') p = p.parentElement; p.style.visibility = 'hidden' })
    ;['#hud', '#keys', '#pad', '#phud', '#pmsg', '#panel'].forEach((q) => { const e = document.querySelector(q); if (e) e.style.visibility = 'hidden' })
  }
  const smooth = (u) => u * u * (3 - 2 * u)
  function path(keys) { // keys : [t, [px,py,pz], [lx,ly,lz]] ; Catmull-Rom sur positions et cibles
    const at = (t) => {
      let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++
      const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)]
      const u = smooth(Math.min(1, Math.max(0, (t - k1[0]) / (k2[0] - k1[0]))))
      const cr = (a, b, c, d) => [0, 1, 2].map((j) => .5 * (2 * b[j] + (-a[j] + c[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u * u + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * u * u * u))
      return [cr(k0[1], k1[1], k2[1], k3[1]), cr(k0[2], k1[2], k2[2], k3[2])]
    }
    return at
  }
  const ILE_TOUR = path([
    [0, [0, 58, 72], [0, 0, 0]],
    [5, [34, 26, 40], [0, 1, 4]],
    [9, [7, 5.5, 9], [0, 1.6, 0]],          // fontaine, bancs
    [14, [-11, 4.2, 3], [-5, 1.2, -6]],     // ouvriers, lampadaires
    [18, [1, 5.5, -3.5], [0, 2, -13]],      // ateliers : extincteurs et panneaux
    [23, [18, 11, 3], [11, 8.5, 10.5]],     // tour : radar et feu
    [27, [4, 2.6, 22.5], [12, 1, 15]],      // piste : balisage, manche à air, coin logistique
    [32, [-2, 4, 40], [0, 0, 26]],          // plage, parasols
    [36, [30, 7, 50], [40, 0, 18]],         // voiliers et poissons
    [41, [-55, 46, 62], [0, 0, 0]],
  ])

  /* pilote automatique des mini-jeux d'atelier : clique les dialogues comme un joueur, achète les mesures prévues,
     buzze et répond d'après la carte affichée (avec une erreur de temps en temps, comme un vrai joueur) */
  function autopilot(plan) {
    let q = 0, pending = null, tick = 0, want = null
    const iv = setInterval(() => {
      tick++
      const P = document.getElementById('pact'), panel = document.getElementById('panel'), txt = (document.getElementById('ptext') || {}).textContent || ''
      if (!P || !panel || panel.hidden) return
      const btns = [...P.querySelectorAll('button')], E = window.TALAS_JEUX.etat
      if (!btns.length) { // manche du buzzer : pas de bouton, on buzze si la carte est une entrée obligatoire
        if (E.manche === 1 && E.carte && E.carte !== pending && tick % 3 === 0) { pending = E.carte; const hit = !!E.carte.ok !== (Math.random() < .1); if (hit) setTimeout(() => dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })), 900 + Math.random() * 900) }
        return
      }
      if (/Clique un poste/.test(txt)) { // préparation d'un trimestre du budget
        const m = /Trimestre (\d)/.exec(txt); q = m ? +m[1] : q
        if (tick % 3) return
        const todo = (plan[q] || []).shift()
        if (todo) { const g = cur.clickables[todo[0]]; if (g && g.userData.onClick) { want = todo[1]; g.userData.onClick() } return }
        btns[0].click(); return
      }
      if (/Que finances-tu/.test(txt)) { // menu d'achat d'un poste : on prend exactement la mesure prévue
        if (tick % 3) return
        const b = btns.find((x) => want !== null && x.textContent.startsWith(window.TALAS_JEUX.LV[want])) || btns[btns.length - 1]
        want = null; b.click(); return
      }
      if (E.manche === 2 && btns.length === 2 && /Constat/.test(txt)) { const wrong = Math.random() < .12; btns[(E.carte.lie ? 1 : 0) ^ (wrong ? 1 : 0)].click(); return }
      if (E.manche === 3 && E.carte && E.carte.opts && btns.length === E.carte.opts.length) { btns[Math.max(0, E.carte.opts.findIndex((o) => o.ok))].click(); return }
      if (tick % 4 === 0) (P.querySelector('.btn.go') || btns[0]).click() // dialogues : on avance
    }, 400)
    return () => clearInterval(iv)
  }
  const SEQ = {
    /* un atelier joué par le pilote automatique : on entre comme le jeu (buildRoom) et on lance le vrai chapitre */
    async atelier({ n, jeu, plan, label }) {
      document.querySelectorAll('.mbody').forEach((m) => { let p = m; while (p.parentElement && p.parentElement.id !== 'frame') p = p.parentElement; p.style.visibility = 'hidden' })
      const R = buildRoom(n); setWorld(R); S.ch = n; S.res[n] = { o: 0, t: 0 }; S.done[n] = false
      let finished = false; const orig = window.TALAS_JEUX[jeu]
      window.TALAS_JEUX[jeu] = (...a) => orig(...a).then((r) => { finished = true; window.__atelierRatio = r; return r })
      const stop = autopilot(JSON.parse(JSON.stringify(plan || {})))
      RUN[n]().catch((e) => console.error(e))
      window.__isDone = () => finished
      return { seconds: 150, label, script: () => new Promise((r) => { const iv = setInterval(() => { if (finished) { clearInterval(iv); r() } }, 500) }), after: () => { stop(); window.TALAS_JEUX[jeu] = orig } }
    },
    /* parcours en vue fixe : Dylan posé à (x, y), la caméra du jeu le suit ; avant ou après la direction Panthère */
    async pvue({ apres, x, y, zoom }) {
      hideUi()
      if (!window.__pw || window.__pwApres !== !!apres) {
        window.TALAS_DA.set(!!apres); PT.base = {}; PT.mat = {}
        try { await Promise.race([preloadToons(), sleep(6000)]) } catch (e) {}
        window.__pw = buildPlatformer(); setWorld(window.__pw); window.__pwApres = !!apres
      }
      Object.keys(KEYS).forEach((k) => (KEYS[k] = 0))
      const st = window.__pw.st; st.pos.x = x; st.pos.y = y; if (st.vel) st.vel.set(0, 0, 0)
      // le parcours a sa propre caméra (cam) : on la garde et on ne la remplace que le temps d'un gros plan
      const W = window.__pw; if (!('_cam0' in W)) W._cam0 = W.cam
      if (zoom) W.cam = () => { camera.position.set(st.pos.x + zoom * .35, st.pos.y + 1.5, zoom); camera.lookAt(st.pos.x + zoom * .2, st.pos.y + .9, 0) }
      else if (W._cam0) W.cam = W._cam0; else delete W.cam
      return { seconds: 1, label: '', script: () => sleep(1000) }
    },
    /* vue fixe pour les photos : île avant ou après, caméra posée (record.mjs --photos) */
    async vue({ apres, pos, look, rebuild }) { // eslint-disable-line
      hideUi()
      if (rebuild || !window.__vueBuilt || window.__vueApres !== !!apres) {
        window.TALAS_ILE.on = !!apres; if (apres) await window.TALAS_ILE.preload()
        HUB = buildHub(); setWorld(HUB); if (typeof refreshSigns === 'function') refreshSigns(); window.__vueBuilt = true; window.__vueApres = !!apres
      }
      if (typeof pos === 'string' && pos.startsWith('rocher')) { // « rocher:N » : cadrage calculé sur le N-ième rocher en mer
        const rs = window.TALAS_ILE.rocks || [], r = rs[+pos.split(':')[1] % Math.max(1, rs.length)]
        if (r) { const d = Math.hypot(r.x, r.z), ux = r.x / d, uz = r.z / d, k = r.R0 * 2.6 + 4; pos = [r.x - ux * k + uz * k * .5, r.top - .5, r.z - uz * k - ux * k * .5]; look = [r.x, r.top - 1.6, r.z] }
      }
      HUB.cam = () => { camera.position.set(...pos); camera.lookAt(...look) }
      return { seconds: 1, label: '', script: () => sleep(1000) }
    },
    /* ouverture : logo du studio (5,6 s), survol de l'île, titre */
    async intro() {
      hideUi(); if (typeof HUB !== 'undefined' && cur !== HUB) setWorld(HUB)
      return { seconds: 14.5, label: 'Ouverture · logo du studio affiché 5,6 s', script: () => proIntro() }
    },
    async ile({ apres }) {
      hideUi(); window.TALAS_ILE.on = !!apres
      if (apres) await window.TALAS_ILE.preload()
      HUB = buildHub(); setWorld(HUB); if (typeof refreshSigns === 'function') refreshSigns()
      const t0 = performance.now()
      HUB.cam = () => { const [p, l] = ILE_TOUR((performance.now() - t0) / 1000); camera.position.set(...p); camera.lookAt(...l) }
      return { seconds: 41.5, label: apres ? 'Île · refonte' : 'Île · avant', script: () => sleep(41500) }
    },
    async parcours({ apres }) {
      hideUi(); window.TALAS_DA.set(!!apres); PT.base = {}; PT.mat = {}
      try { await Promise.race([preloadToons(), sleep(6000)]) } catch (e) {}
      const PW = buildPlatformer(); setWorld(PW); window.PWcap = PW
      const st = PW.st; let last = st.pos.x, still = 0, jt = 0
      const drive = setInterval(() => { // course automatique : droite + sauts réguliers ; si bloqué, on enjambe
        KEYS.R = 1; jt += .1; if (jt > .9) { jt = 0; KEYS.J = 1; KEYP.J = 1; setTimeout(() => (KEYS.J = 0), 180) }
        if (st.pos.x - last < .05) still += .1; else still = 0
        last = st.pos.x; if (still > .8) { st.pos.x += 3.2; st.pos.y += 2.5; still = 0 }
      }, 100)
      return { seconds: 34, label: apres ? 'Parcours · direction Panthère' : 'Parcours · avant', script: () => sleep(34000), after: () => { clearInterval(drive); Object.keys(KEYS).forEach((k) => (KEYS[k] = 0)) } }
    },
  }

  async function run(name, opts = {}) {
    const s = await SEQ[name](opts)
    const blob = await record(s.seconds, s.script, s.label)
    s.after && s.after()
    const res = { name, opts, seconds: s.seconds, bytes: blob.size }
    try {
      const assets = await window.claude?.use?.('assets')
      if (!assets) throw new Error('stockage indisponible')
      const up = await assets.upload(new File([blob], `${name}${opts.apres ? '-apres' : opts.apres === false ? '-avant' : ''}.webm`, { type: 'video/webm' }))
      Object.assign(res, { id: up.id, url: up.url })
    } catch (e) { res.error = String(e && (e.code || e.message) || e); window.__lastBlob = blob }
    ;(window.__captures = window.__captures || []).push(res)
    return res
  }

  /* 4. panneau de commande (les pages d'artifact sont dans un cadre : on les pilote au clic, ou avec le lien #capture) */
  const PLAN = [['intro', {}], ['ile', { apres: false }], ['ile', { apres: true }], ['parcours', { apres: false }], ['parcours', { apres: true }]]
  const label = ([n, o]) => n + (o.apres === true ? ' · après' : o.apres === false ? ' · avant' : '')
  function panel() {
    const d = document.createElement('div'); d.id = 'capPanel'
    d.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;background:#10131c;color:#fff;font:12px/1.4 "Trebuchet MS",sans-serif;padding:8px 10px;border-left:4px solid #ffd43b;max-width:min(360px,calc(100vw - 32px));display:grid;gap:6px'
    d.innerHTML = '<b>Comptes rendus vidéo</b><div id="capBtns" style="display:flex;flex-wrap:wrap;gap:4px"></div><div id="capLog" style="white-space:pre-wrap;color:#c9cfdb"></div>'
    const btns = d.querySelector('#capBtns'), log = d.querySelector('#capLog')
    const mkBtn = (t, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.style.cssText = 'font:inherit;padding:3px 8px;background:#ffd43b;border:0;cursor:pointer'; b.onclick = fn; btns.append(b) }
    let busy = false
    const go = async (list) => {
      if (busy) return; busy = true; d.style.opacity = .35
      for (const step of list) {
        log.textContent += `▶ ${label(step)}…\n`
        const r = await run(step[0], step[1])
        log.textContent += r.id ? `  ✓ ${r.seconds} s, ${(r.bytes / 1048576).toFixed(1)} Mo, ${r.id}\n` : `  ✗ ${r.error}\n`
      }
      log.textContent += 'Terminé.\n'; busy = false; d.style.opacity = 1; window.__captureDone = true
    }
    mkBtn('Tout', () => go(PLAN)); PLAN.forEach((st) => mkBtn(label(st), () => go([st])))
    document.body.append(d)
    if (location.hash === '#capture') setTimeout(() => go(PLAN), 4000)
  }
  const ready = () => (typeof HUB !== 'undefined' && HUB && cur ? panel() : setTimeout(ready, 500))
  if (!window.__VIRTUAL_TIME) addEventListener('load', ready)

  /* 5. pilotage par record.mjs (Chrome sans interface) : mise en scène, puis pas de 1/30 s et une capture par pas */
  let staged = null
  function captionEl(text) {
    let el = document.getElementById('capCaption')
    if (!el) { el = document.createElement('div'); el.id = 'capCaption'; el.style.cssText = 'position:fixed;left:24px;bottom:22px;z-index:120;background:rgba(16,19,28,.84);color:#fff;font:600 20px "Trebuchet MS",sans-serif;padding:8px 16px 8px 14px;border-left:6px solid #ffd43b;pointer-events:none'; document.body.append(el) }
    el.textContent = text; el.hidden = !text
  }
  async function stage(name, opts = {}) {
    const s = await SEQ[name](opts)
    captionEl(s.label); VT.enable(); staged = s
    s.script() // tourne sur l'horloge virtuelle
    return { seconds: s.seconds }
  }
  function unstage() { if (staged && staged.after) staged.after(); staged = null; captionEl('') }
  const isReady = () => typeof HUB !== 'undefined' && !!HUB && !!cur && !!document.querySelector('.mbody')

  /* planche des textures peintes de la direction artistique (pour les comptes rendus) */
  function plancheDA(cols = 4, cell = 300) {
    const P = window.TALAS_DA.painters, keys = Object.keys(P), rows = Math.ceil(keys.length / cols), c = document.createElement('canvas')
    c.width = cols * cell; c.height = rows * (cell + 28); const x = c.getContext('2d'); x.fillStyle = '#10131c'; x.fillRect(0, 0, c.width, c.height)
    let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    keys.forEach((k, i) => {
      const [w, h, f] = P[k], t = document.createElement('canvas'); t.width = w; t.height = h; f(t.getContext('2d'), w, h, R)
      const X = (i % cols) * cell, Y = Math.floor(i / cols) * (cell + 28), sc = Math.min((cell - 12) / w, (cell - 12) / h)
      x.drawImage(t, X + (cell - w * sc) / 2, Y + 6 + (cell - 12 - h * sc) / 2, w * sc, h * sc)
      x.fillStyle = '#ffd43b'; x.font = '600 16px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.fillText(k, X + cell / 2, Y + cell + 18)
    })
    return c.toDataURL('image/png')
  }

  window.TalasCapture = { isDone: () => !!(window.__isDone && window.__isDone()), plancheDA, run, SEQ, record, stage, unstage, step: (ms) => VT.step(ms), isReady, VT }
})()

/* Passe graphique commune des mini-jeux du Village Talas. Script classique chargé avant le jeu ; il enveloppe les
 * fonctions de mini-jeux une fois le jeu chargé et, tant qu'une partie dure, soigne la scène en cours :
 *   - matériaux éclairés : liseré de lumière sur les contours (détache les personnages du fond), grain peint
 *     en coordonnées monde, léger assombrissement au pied des objets (occlusion peinte) ;
 *   - une lumière de décrochage froide venue de l'arrière et une poussière lumineuse qui flotte dans la salle ;
 *   - à l'écran : vignettage et grain de papier (CSS, sans coût de rendu).
 * Habillages propres à certains jeux : voir DECORS plus bas. ?salles=classique -> désactive tout (comparaison). */
(function () {
  const q = location.search.match(/[?&]salles=([a-z]+)/)
  const SAL = { on: !(q && q[1] === 'classique'), actif: null }
  window.TALAS_SALLES = SAL
  const JEUX = ['catch3D', 'run3D', 'feast3D', 'karaoke3D', 'docs2D', 'surgery3D', 'budget3D', 'revue3D']

  /* ---------------- matériaux : liseré, grain peint, occlusion au sol ---------------- */
  const VTX = '#include <project_vertex>\nvSalW=(modelMatrix*vec4(transformed,1.)).xyz;'
  const FRAG_HEAD = `varying vec3 vSalW;
float salH(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float salN(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(salH(i),salH(i+vec3(1,0,0)),f.x),mix(salH(i+vec3(0,1,0)),salH(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(salH(i+vec3(0,0,1)),salH(i+vec3(1,0,1)),f.x),mix(salH(i+vec3(0,1,1)),salH(i+vec3(1,1,1)),f.x),f.y),f.z);}
`
  const FRAG = `{vec3 c=gl_FragColor.rgb;
  float g=salN(vSalW*2.3)*.6+salN(vSalW*7.1)*.4; c*=.93+.14*g;
  c*=mix(.8,1.,smoothstep(0.,.55,vSalW.y+.02));
  #ifdef SAL_RIM
  vec3 sv=normalize(vViewPosition);float fr=1.-max(dot(normalize(normal),sv),0.);c+=vec3(.55,.62,.8)*pow(fr,3.)*.32;
  #endif
  gl_FragColor.rgb=c;}
#include <fog_fragment>`
  function passe(m) {
    if (m.userData.salle) return m
    const prev = m.onBeforeCompile, key = m.customProgramCacheKey ? m.customProgramCacheKey() : ''
    m.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r)
      sh.vertexShader = 'varying vec3 vSalW;\n' + sh.vertexShader.replace('#include <project_vertex>', VTX)
      const rim = /vViewPosition/.test(sh.fragmentShader) && /normal_fragment_begin/.test(sh.fragmentShader)
      sh.fragmentShader = (rim ? '#define SAL_RIM\n' : '') + FRAG_HEAD + sh.fragmentShader.replace('#include <fog_fragment>', FRAG)
    }
    m.customProgramCacheKey = () => key + '|salle'
    m.userData.salle = 1; m.needsUpdate = true; return m
  }
  const lit = (m) => m && !m.isShaderMaterial && (m.isMeshToonMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial)

  /* ---------------- écran : vignettage et grain de papier ---------------- */
  let voile = null
  function ecran(on) {
    if (!voile) {
      voile = document.createElement('div'); voile.id = 'salVoile'
      const grain = `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .35 0 0 0 0 .3 0 0 0 0 .25 0 0 0 .55 0"/></filter><rect width="160" height="160" filter="url(#n)"/></svg>')}")`
      voile.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:3;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 55%,rgba(24,12,40,.34) 100%),${grain};background-size:100% 100%,160px 160px;mix-blend-mode:multiply;opacity:.9;transition:opacity .6s`
      const f = document.getElementById('frame'); if (f) f.append(voile)
    }
    voile.style.opacity = on ? .9 : 0
  }

  /* ---------------- scène : décrochage, poussière ---------------- */
  function ambiance(THREE, scene) {
    const g = new THREE.Group(); g.name = 'salAmbiance'
    const rim = new THREE.DirectionalLight('#a9c8ff', .38); rim.position.set(-6, 9, -14); g.add(rim)
    const N = 140, pos = new Float32Array(N * 3), ph = []
    for (let i = 0; i < N; i++) { pos.set([(Math.random() - .5) * 26, Math.random() * 7 + .3, Math.random() * 14 - 6], i * 3); ph.push([Math.random() * 6, .15 + Math.random() * .3]) }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32)
    const dust = new THREE.Points(geo, new THREE.PointsMaterial({ size: .09, map: new THREE.CanvasTexture(cv), color: '#fff3d6', transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }))
    g.add(dust); scene.add(g)
    g.userData.up = (t) => { const P = geo.attributes.position; for (let i = 0; i < N; i++) { const [p0, sp] = ph[i]; let y = P.getY(i) + sp * .004; if (y > 7.5) y = .3; P.setY(i, y); P.setX(i, P.getX(i) + Math.sin(t * .3 + p0) * .002) } P.needsUpdate = true }
    return g
  }

  /* ---------------- boucle : tant qu'un mini-jeu tourne ---------------- */
  let timer = 0, raf = 0
  function debut(nom) {
    const THREE = window.THREE; if (!THREE || typeof cur === 'undefined') return
    SAL.actif = { nom, scene: null, amb: null, copies: new Map(), t0: performance.now() }
    ecran(true)
    const tick = () => {
      const A = SAL.actif; if (!A) return
      const W = typeof cur !== 'undefined' ? cur : null, sc = W && (W.scene || W.s)
      if (sc && sc !== A.scene) { // nouvelle scène (certains jeux ont leur propre monde) : on y pose l'ambiance
        if (A.amb && A.amb.parent) A.amb.parent.remove(A.amb)
        A.scene = sc; A.amb = ambiance(THREE, sc); A.decoFait = false
      }
      /* l'habillage attend que le jeu ait posé son décor (certains chargent leurs modèles d'abord) */
      if (sc && !A.decoFait && performance.now() - A.t0 > 1500) { A.decoFait = true; try { decor(nom, sc, W) } catch (e) { console.warn('salles', e) } }
      if (sc) sc.traverse((o) => { // matériaux nouveaux (les jeux en ajoutent en cours de partie) : copies locales
        if (!o.isMesh || !o.material || o.userData.salSkip) return
        const one = (m) => { if (!lit(m)) return m; if (m.userData.salle) return m
          if (m.onBeforeCompile && m.onBeforeCompile.toString().length > 20) return passe(m)
          if (!A.copies.has(m)) A.copies.set(m, passe(m.clone())); return A.copies.get(m) }
        o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material)
      })
    }
    tick(); clearInterval(timer); timer = setInterval(tick, 700)
    const anim = () => { const A = SAL.actif; if (!A) return; if (A.amb) A.amb.userData.up((performance.now() - A.t0) / 1000); if (A.deco) A.deco((performance.now() - A.t0) / 1000); raf = requestAnimationFrame(anim) }
    cancelAnimationFrame(raf); raf = requestAnimationFrame(anim)
  }
  function fin() {
    const A = SAL.actif; SAL.actif = null; clearInterval(timer); cancelAnimationFrame(raf); ecran(false)
    if (A && A.amb && A.amb.parent) A.amb.parent.remove(A.amb)
    if (A && A.decoObjs) A.decoObjs.forEach((o) => o.parent && o.parent.remove(o))
  }

  /* ---------------- habillages propres à certains jeux ---------------- */
  function tex(w, h, draw, rep) { const T = window.THREE, c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]) } return t }
  function decor(nom, sc, W) {
    const T = window.THREE, A = SAL.actif, objs = (A.decoObjs = A.decoObjs || []), add = (o, p) => { (p || sc).add(o); objs.push(o); return o }
    const R = W && W.stage ? W : null
    if (nom === 'budget3D' && R) {
      /* plateau du budget : béton de hangar peint, joints, taches d'huile, bord à chevrons jaune et noir */
      const t = tex(512, 256, (g, w, h) => {
        g.fillStyle = '#98a3b0'; g.fillRect(0, 0, w, h)
        for (let i = 0; i < 3000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(90,100,115,.10)' : 'rgba(255,255,255,.12)'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4) }
        for (let i = 0; i < 9; i++) { const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(40,40,50,.28)'); gr.addColorStop(1, 'rgba(40,40,50,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2) }
        g.strokeStyle = 'rgba(70,80,95,.5)'; g.lineWidth = 2; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() } for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
        for (let x = -h; x < w + h; x += 22) { g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 11, 0); g.lineTo(x + 11 - 12, 12); g.lineTo(x - 12, 12); g.fill(); g.beginPath(); g.moveTo(x, h - 12); g.lineTo(x + 11, h - 12); g.lineTo(x + 11 - 12, h); g.lineTo(x - 12, h); g.fill() }
        g.fillStyle = '#1b1b22'; g.fillRect(0, 12, w, 2); g.fillRect(0, h - 14, w, 2)
      })
      R.stage.traverse((o) => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 18 && o.geometry.parameters.depth === 9.4) o.material = new T.MeshToonMaterial({ map: t, gradientMap: typeof grad !== 'undefined' ? grad : null }) })
      /* rampe de projecteurs au plafond et halos au sol */
      for (let i = 0; i < 5; i++) { const L = add(new T.SpotLight('#fff1d6', .25, 18, .45, .7, 1.5)); L.position.set(-7.2 + i * 3.6, 9, -1); L.target.position.set(-7.2 + i * 3.6, 0, -2.4); add(L.target) }
    }
    if (nom === 'feast3D' && R) {
      /* l'open space : fenêtres sur le hangar au soleil, suspensions chaudes, moquette à motifs */
      const win = tex(256, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6fb6ea'); gr.addColorStop(1, '#d7eefa'); g.fillStyle = gr; g.fillRect(0, 0, w, h)
        g.fillStyle = 'rgba(255,255,255,.85)'; [[40, 40, 26], [150, 26, 20], [200, 60, 16]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y + 4, r * .8, 0, 7); g.arc(x - r * .9, y + 6, r * .7, 0, 7); g.fill() })
        g.fillStyle = '#8fa3b8'; g.fillRect(0, h - 40, w, 40); g.fillStyle = '#e9ecef'; g.beginPath(); g.ellipse(w * .6, h - 44, 70, 16, 0, 0, 7); g.fill(); g.fillRect(w * .6 - 80, h - 46, 30, 4)
        g.strokeStyle = '#495057'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke() })
      ;[-5.4, 5.4].forEach((x) => { const m = add(new T.Mesh(new T.PlaneGeometry(2.8, 1.7), new T.MeshBasicMaterial({ map: win }))); m.position.set(x, 4.1, -3.18); m.userData.salSkip = 1 })
      ;[-3.1, 3.1].forEach((x) => { const L = add(new T.PointLight('#ffcf8a', .55, 10, 2)); L.position.set(x, 4.8, 1.2) }) // lumière chaude des suspensions
      sc.traverse((o) => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width === 22 && o.geometry.parameters.depth === 10) {
        o.material = new T.MeshToonMaterial({ map: tex(64, 64, (g, w, h) => { g.fillStyle = '#4c6ef5'; g.fillRect(0, 0, w, h); g.fillStyle = '#4263eb'; for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) g.fillRect(x, y, 4, 4); g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 90; i++) g.fillRect(Math.random() * w, Math.random() * h, 1, 1) }, [10, 5]), gradientMap: typeof grad !== 'undefined' ? grad : null }) } })
    }
    if (nom === 'surgery3D' && R) {
      /* bloc opératoire : scialytique au-dessus de la table, carrelage vert d'eau, rideau */
      const g = add(new T.Group()); g.position.set(0, 6.4, .2)
      const arm = new T.Mesh(new T.CylinderGeometry(.08, .08, 2, 8), new T.MeshToonMaterial({ color: '#ced4da' })); arm.position.y = 1; g.add(arm)
      const head = new T.Mesh(new T.CylinderGeometry(1.5, 1.8, .45, 28), new T.MeshToonMaterial({ color: '#e9ecef' })); g.add(head)
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = i ? 1 : 0, l = new T.Mesh(new T.CircleGeometry(.36, 16), new T.MeshBasicMaterial({ color: '#fffbe6' })); l.rotation.x = Math.PI / 2; l.position.set(Math.cos(a) * r, -.24, Math.sin(a) * r); l.userData.salSkip = 1; g.add(l) }
      const cone = new T.Mesh(new T.ConeGeometry(4.2, 6.2, 32, 1, true), new T.MeshBasicMaterial({ color: '#fffbe6', transparent: true, opacity: .06, depthWrite: false, side: T.DoubleSide })); cone.position.y = -3.3; cone.userData.salSkip = 1; g.add(cone)
      const L = new T.SpotLight('#fffaf0', .3, 16, .6, .5, 1.2); L.position.set(0, 0, 0); L.target.position.set(0, -6.4, 0); g.add(L); g.add(L.target)
      const tile = tex(64, 64, (x, w, h) => { x.fillStyle = '#c3fae8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#96f2d7'; x.lineWidth = 2; x.strokeRect(1, 1, 30, 30); x.strokeRect(33, 1, 30, 30); x.strokeRect(1, 33, 30, 30); x.strokeRect(33, 33, 30, 30); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(4, 4, 8, 3); x.fillRect(36, 36, 8, 3) }, [18, 6])
      const wall = add(new T.Mesh(new T.PlaneGeometry(33, 11), new T.MeshToonMaterial({ map: tile }))); wall.position.set(0, 5.6, -6.15)
      const rideau = tex(128, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? '#2b8a3e' : '#37b24d'); x.fillStyle = gr; x.fillRect(0, 0, w, h) }, [4, 1])
      ;[-12.5, 12.5].forEach((xx) => { const c = add(new T.Mesh(new T.PlaneGeometry(6, 8.5), new T.MeshToonMaterial({ map: rideau, side: T.DoubleSide }))); c.position.set(xx, 4.3, -5.9) })
    }
    if (nom === 'catch3D' && R) {
      /* bureau hanté : rais de lune par la fenêtre, brume au ras du sol */
      ;[-5, 0, 5].forEach((x, i) => { const c = add(new T.Mesh(new T.CylinderGeometry(.9, 2.2, 11, 16, 1, true), new T.MeshBasicMaterial({ color: '#b9f5d6', transparent: true, opacity: .06, depthWrite: false, side: T.DoubleSide }))); c.position.set(x, 5, -2); c.rotation.z = .35; c.userData.salSkip = 1 })
      const fog = tex(256, 64, (g, w, h) => { for (let i = 0; i < 40; i++) { const x = Math.random() * w, y = h * .6 + Math.random() * h * .3, r = 20 + Math.random() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(210,235,255,.35)'); gr.addColorStop(1, 'rgba(210,235,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2) } }, [2, 1])
      const brume = []; for (let i = 0; i < 2; i++) { const m = add(new T.Mesh(new T.PlaneGeometry(40, 3), new T.MeshBasicMaterial({ map: fog, transparent: true, depthWrite: false, opacity: .3 }))); m.rotation.x = -Math.PI / 2; m.position.set(0, .25 + i * .15, -1 + i * 2); m.userData.salSkip = 1; brume.push(m) }
      A.deco = (t) => brume.forEach((m, i) => { m.material.map.offset.x = t * .02 * (i % 2 ? 1 : -1); m.material.opacity = .3 + Math.sin(t * .8 + i) * .1 })
    }
  }

  /* ---------------- branchement : on enveloppe les mini-jeux une fois le jeu chargé ---------------- */
  function brancher() {
    if (!SAL.on) return
    JEUX.forEach((k) => {
      const host = window.TALAS_JEUX && window.TALAS_JEUX[k] ? window.TALAS_JEUX : window, orig = host[k]
      if (typeof orig !== 'function' || orig.__sal) return
      const w = function (...a) { debut(k); const p = orig.apply(this, a); Promise.resolve(p).finally(fin); return p }
      w.__sal = 1; host[k] = w
    })
  }
  addEventListener('DOMContentLoaded', brancher)
  SAL.brancher = brancher
})()

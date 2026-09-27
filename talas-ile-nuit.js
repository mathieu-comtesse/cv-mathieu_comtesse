/* L'île aux tourbillons : proposition de direction artistique pour l'île du Village Talas, avec un cycle jour / nuit.
 * Le ciel garde ses grands nuages en tourbillons peints (trois tons, contour d'encre) et change de couleurs au fil
 * de la journée : aube, plein jour, coucher de soleil, nuit verte étoilée. Le soleil (puis la lune) traverse le ciel,
 * la lumière et les ombres de l'île le suivent, la mer peinte à coups de pinceau renvoie ses reflets, les montagnes de
 * jungle en silhouettes se teintent, les fanaux et les lucioles s'allument la nuit. Tout est procédural, sans image.
 *   Active par défaut. ?ile=fixe -> île d'avant, en plein jour sans cycle ; ?ile=classique -> île d'origine.
 *   ?cycle=240 -> durée d'une journée complète en secondes (240 par défaut) ; TALAS_NUIT.fixe = 0..1 fige l'heure.
 * Branché dans buildHub() après talas-ile.js : W.nuit = TALAS_NUIT.apply({...}), puis W.nuit.update(dt, T). */
(function () {
  const q = location.search.match(/[?&]ile=([a-z]+)/), qc = location.search.match(/[?&]cycle=(\d+)/)
  const NUIT = { on: !(q && (q[1] === 'fixe' || q[1] === 'classique')), apply, duree: qc ? +qc[1] : 240, fixe: null, heure: 0 }
  window.TALAS_NUIT = NUIT

  /* ---------------- palettes des quatre moments de la journée ----------------
     ciel (zénith, horizon), nuages (4 tons + encre), brouillard, mer (proche, loin, reflets, creux),
     lumières (ciel, sol, intensité ; soleil ou lune, intensité), étalonnage (multiplicateur, saturation),
     teinte des montagnes, couleur du soleil, part de nuit (étoiles, fanaux, lucioles) */
  const PAL = {
    nuit: { zen: '#07231e', hor: '#1b5a49', n: ['#1f6a55', '#3a967a', '#79cba4', '#b6ecd0'], ink: '#0a2c26', fog: '#15463b',
      mer: ['#1d3868', '#132a52', '#3d64a3', '#0d1d3f'], hemi: ['#5fc2a2', '#0f2530', .62], dir: ['#a4ecd4', .42], gm: [.6, .9, .82], gs: .5,
      mont: '#45858a', sun: '#dcfff0', night: 1 },
    aube: { zen: '#2c3a6e', hor: '#f4a36c', n: ['#6d5a8e', '#c07a8e', '#f0a98a', '#ffe0b8'], ink: '#3a2b52', fog: '#b98f8f',
      mer: ['#2d4f86', '#5a5f8e', '#f0a07a', '#1c2f5c'], hemi: ['#ffc9a8', '#3a3050', .62], dir: ['#ffb27a', .55], gm: [1, .88, .9], gs: .8,
      mont: '#9a8aa8', sun: '#ffd08a', night: .25 },
    jour: { zen: '#2f7fd6', hor: '#bfe8f7', n: ['#8fc3ea', '#cfe8f8', '#ffffff', '#ffffff'], ink: '#3a6fa8', fog: '#a6d4f2',
      mer: ['#1e9fb8', '#2a7fb8', '#8ff0ea', '#12708e'], hemi: ['#e8f0ff', '#6b5a3a', .62], dir: ['#fff1d0', .7], gm: [1, 1, 1], gs: 1,
      mont: '#ffffff', sun: '#fff3b0', night: 0 },
    couchant: { zen: '#3b2a6b', hor: '#ff7a3d', n: ['#8a3f6e', '#d8566a', '#ff9a55', '#ffd27a'], ink: '#3a1640', fog: '#c07060',
      mer: ['#3a3f7a', '#6a3f6e', '#ff9a55', '#1f1f4a'], hemi: ['#ffae7a', '#402040', .55], dir: ['#ff8a4a', .6], gm: [1.05, .84, .84], gs: .78,
      mont: '#a86a7a', sun: '#ffb347', night: .35 }
  }
  /* la journée : u de 0 à 1 ; le soleil se lève à 0,05 et se couche à 0,57 */
  const KEYS = [[0, 'nuit'], [.03, 'aube'], [.1, 'jour'], [.47, 'jour'], [.55, 'couchant'], [.63, 'nuit'], [1, 'nuit']]
  const LEVE = .05, COUCHE = .57
  const MOMENT = (u) => u < .02 || u >= .61 ? 'nuit' : u < .09 ? 'aube' : u < .49 ? 'jour' : 'couchant'

  /* ---------------- ciel : tourbillons à plat, trois tons, contour d'encre, soleil, lune, étoiles ---------------- */
  const SKY_U = () => ({ uT: { value: 0 }, uZen: { value: null }, uHor: { value: null }, uN0: { value: null }, uN1: { value: null }, uN2: { value: null }, uN3: { value: null },
    uInk: { value: null }, uSun: { value: null }, uSunC: { value: null }, uNight: { value: 1 } })
  function skyMat(THREE) {
    const u = SKY_U(); Object.keys(u).forEach((k) => { if (u[k].value === null) u[k].value = k === 'uSun' ? new THREE.Vector3(0, 1, 0) : new THREE.Color() })
    return new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, extensions: { derivatives: true }, uniforms: u,
      vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uT,uNight;uniform vec3 uZen,uHor,uN0,uN1,uN2,uN3,uInk,uSun,uSunC;varying vec3 vDir;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.07+vec2(3.1,1.7);a*=.5;}return s;}
vec2 rot(vec2 p,vec2 c,float r,float k){vec2 d=p-c;float l=length(d);float a=k*exp(-l*l/(r*r));float cs=cos(a),sn=sin(a);return c+vec2(cs*d.x-sn*d.y,sn*d.x+cs*d.y);}
void main(){
  vec3 d=normalize(vDir);float el=d.y;
  vec3 c=mix(uHor,uZen,smoothstep(0.,.7,el));
  /* soleil peint : halo, disque cerné d'encre ; la lune à l'opposé, la nuit */
  float ds=dot(d,uSun);
  c+=uSunC*(pow(max(ds,0.),24.)*.55+pow(max(ds,0.),4.)*.18)*(1.-uNight*.8);
  float fwd=fwidth(ds)*1.5+1e-5;
  float disc=smoothstep(.9985-fwd,.9985+fwd,ds);
  c=mix(c,uInk,smoothstep(.9978-fwd,.9978+fwd,ds)*(1.-disc)*.9*step(0.,uSun.y+.02));
  c=mix(c,mix(uSunC,vec3(1.),.35),disc*step(0.,uSun.y+.02));
  float dm=dot(d,-uSun),moon=smoothstep(.9991-fwd,.9991+fwd,dm)*uNight;
  c=mix(c,uInk,smoothstep(.9986-fwd,.9986+fwd,dm)*(1.-moon/max(uNight,.01))*.8*uNight);
  c=mix(c,vec3(.9,1.,.94),moon);
  /* les nuages vivent sur un plafond plat : ils s'écrasent naturellement vers l'horizon */
  vec2 p=d.xz/(max(el,0.)+.22)*2.1+vec2(uT*.012,0.);
  for(int i=0;i<14;i++){float fi=float(i),ga=fi*2.39996,gr=.6+sqrt(fi)*1.55;
    vec2 cc=vec2(cos(ga),sin(ga))*gr+vec2(sin(uT*.03+fi),cos(uT*.025+fi))*.2;
    p=rot(p,cc,.8+.3*sin(fi*3.7),(mod(fi,2.)<1.?1.:-1.)*(4.+sin(fi)));}
  float b=sin(p.y*2.4+fbm(p*.8)*3.4)*.5+.5;
  float m=smoothstep(.22,.48,fbm(p*.42+7.));
  float dn=b*m*smoothstep(0.,.07,el);
  float fw=fwidth(dn)*1.4+.003;
  float l1=smoothstep(.28-fw,.28+fw,dn),l2=smoothstep(.5-fw,.5+fw,dn),l3=smoothstep(.72-fw,.72+fw,dn);
  float lit=pow(max(ds,0.),6.)*.35*(1.-uNight);
  vec3 o=mix(c,uN0+uSunC*lit*.4,l1);o=mix(o,uN1+uSunC*lit*.6,l2);o=mix(o,uN2+uSunC*lit,l3);
  o=mix(o,uN3,(1.-smoothstep(0.,fw*1.2,abs(dn-.86)))*.8*l3);
  o=mix(o,uInk,(1.-smoothstep(0.,fw*1.3,abs(dn-.28)))*.85);
  o=mix(o,uInk,(1.-smoothstep(0.,fw,abs(dn-.5)))*.35);
  vec3 sc=d*170.;float r=h3(floor(sc));
  if(r>.962&&uNight>.01){vec3 f=fract(sc)-.5;float s=1.-smoothstep(.04,.14+.12*fract(r*37.),length(f));
    o+=vec3(.86,1.,.94)*s*(.55+.45*sin(uT*2.3+r*90.))*(1.-l1*.75)*smoothstep(.03,.25,el)*uNight;}
  o+=uHor*.12*(1.-smoothstep(0.,.25,el));
  gl_FragColor=vec4(o,1.);
}`
    })
  }

  /* ---------------- mer : coups de pinceau horizontaux qui dérivent, reflets du soleil ---------------- */
  function seaMat(THREE, fog) {
    return new THREE.ShaderMaterial({
      fog: false,
      uniforms: { uT: { value: 0 }, uFog: { value: new THREE.Color() }, uFN: { value: fog.near }, uFF: { value: fog.far }, uM0: { value: new THREE.Color() }, uM1: { value: new THREE.Color() },
        uM2: { value: new THREE.Color() }, uM3: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `uniform float uT,uFN,uFF;uniform vec3 uFog,uM0,uM1,uM2,uM3,uSun,uSunC;varying vec3 vW;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float stroke(vec2 g,float seed){vec2 id=floor(g),f=fract(g);float r=h2(id+seed),o=h2(id+seed+3.1)*.45,L=.25+.4*h2(id+seed+7.7);
  float sx=smoothstep(o,o+.06,f.x)*(1.-smoothstep(o+L,o+L+.06,f.x));float sy=1.-smoothstep(.1,.2,abs(f.y-.5+.08*sin(f.x*6.28+r*6.)));return sx*sy*step(.4,r);}
void main(){
  vec2 p=vW.xz;float d=length(p);
  vec3 c=mix(uM0,uM1,smoothstep(30.,140.,d));
  float w=sin(p.x*.08+uT*.4)*.3;
  float s1=stroke(vec2(p.x*.16+uT*.06,p.y*.9+w),0.),s3=stroke(vec2(p.x*.3+uT*.1,p.y*1.8),23.);
  c=mix(c,uM2,s1*.75);
  c=mix(c,uM3,stroke(vec2(p.x*.12-uT*.04,p.y*.7+w+.5),11.)*.6);
  c=mix(c,uM2*1.15,s3*.35*(1.-smoothstep(20.,60.,d)));
  /* chemin de lumière du soleil (ou de la lune) : seulement sur les coups de pinceau */
  vec3 v=normalize(vW-cameraPosition),rf=reflect(v,vec3(0.,1.,0.));
  vec3 sd=uSun.y>-.02?uSun:-uSun;
  float sp=pow(max(dot(rf,sd),0.),40.)*smoothstep(-.05,.1,sd.y);
  c+=uSunC*sp*(s1*1.6+s3*1.2+.12);
  float z=length(vW-cameraPosition);c=mix(c,uFog,smoothstep(uFN,uFF,z));
  gl_FragColor=vec4(c,1.);
}`
    })
  }

  /* ---------------- silhouettes de jungle : deux anneaux peints (couleurs de jour, teintés selon l'heure) ---------------- */
  function mountains(THREE, s, SEA, rand) {
    const mats = []
    ;[[165, 62, 0, 1.0, ['#5f9f7f', '#8fcfaa']], [118, 34, 1, .72, ['#3f7f5a', '#6fae82']]].forEach(([R, H, k, amp, [fill, rim]]) => {
      const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 256; const g = cv.getContext('2d')
      const N = 64, pts = []
      let seed = 17 + k * 91; const rr = () => (seed = (seed * 16807) % 2147483647) / 2147483647
      for (let i = 0; i <= N; i++) { // ligne de crête périodique : quelques pitons, beaucoup de collines boisées
        const x = i / N * cv.width, spire = rr() < .12, base = .35 + .35 * Math.sin(i / N * Math.PI * 6 + k) * .5 + rr() * .25
        pts.push([x, cv.height * (1 - Math.min(.97, (spire ? base + .45 : base) * amp))])
      }
      pts[N][1] = pts[0][1]
      g.fillStyle = fill; g.beginPath(); g.moveTo(0, cv.height)
      pts.forEach(([x, y], i) => { if (!i) g.lineTo(x, y); else { const [px, py] = pts[i - 1]; g.quadraticCurveTo(px + (x - px) * .5, Math.min(py, y) - 10 * rr(), x, y) } })
      g.lineTo(cv.width, cv.height); g.closePath(); g.fill()
      g.save(); g.clip() // canopée : petites bosses arrondies sous la crête
      for (let i = 0; i < 900; i++) { const x = rr() * cv.width, j = Math.min(N - 1, Math.floor(x / cv.width * N)), y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * (x / cv.width * N - j) + rr() * 60
        g.fillStyle = rr() < .5 ? rim : fill; g.globalAlpha = .35 + rr() * .4; g.beginPath(); g.arc(x, y + 6, 4 + rr() * 9, Math.PI, 0); g.fill() }
      g.globalAlpha = 1; g.restore()
      g.strokeStyle = '#123a2e'; g.lineWidth = 3; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
      const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(k ? 3 : 2, 1)
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: .4, side: THREE.BackSide, fog: true })
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true), mat); m.position.y = SEA + H / 2 - 3; m.rotation.y = rand(0, 6); s.add(m); mats.push(mat)
      if (k === 1) { // villages au pied des collines : fenêtres allumées la nuit (anneau à part, additif)
        const cv2 = document.createElement('canvas'); cv2.width = 2048; cv2.height = 256; const g2 = cv2.getContext('2d')
        for (let i = 0; i < 26; i++) { const x = rr() * 2048, y = 256 - 12 - rr() * 30, gr = g2.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, 'rgba(255,190,90,.95)'); gr.addColorStop(1, 'rgba(255,150,40,0)'); g2.fillStyle = gr; g2.fillRect(x - 14, y - 14, 28, 28) }
        const t2 = new THREE.CanvasTexture(cv2); t2.wrapS = THREE.RepeatWrapping; t2.repeat.set(3, 1)
        const lm = new THREE.MeshBasicMaterial({ map: t2, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
        const l = new THREE.Mesh(new THREE.CylinderGeometry(R - .5, R - .5, H, 96, 1, true), lm); l.position.copy(m.position); l.rotation.y = m.rotation.y; s.add(l); mats.push(lm); lm.userData.feux = 1
      }
    })
    return mats
  }

  /* halo additif (fanaux, fenêtres, lucioles) */
  let GLOWT = null
  function glow(THREE, size, color) {
    if (!GLOWT) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); GLOWT = new THREE.CanvasTexture(cv) }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOWT, color: color || '#ffb14a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))
    s.scale.setScalar(size); return s
  }

  /* étalonnage des matériaux éclairés selon l'heure (uniformes partagés), avant le brouillard */
  let GU = null
  const GRADE = '{vec3 c=gl_FragColor.rgb;float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,uNS)*uNG;c=mix(c,c*c*.35+c*.72,uNN);gl_FragColor.rgb=c;}\n#include <fog_fragment>'
  function grade(m) {
    if (m.userData.nuit) return m
    const prev = m.onBeforeCompile, key = m.customProgramCacheKey ? m.customProgramCacheKey() : ''
    m.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r)
      Object.assign(sh.uniforms, GU)
      sh.fragmentShader = 'uniform vec3 uNG;uniform float uNS,uNN;\n' + sh.fragmentShader.replace('#include <fog_fragment>', GRADE)
    }
    m.customProgramCacheKey = () => key + '|nuit'
    m.userData.nuit = 1; m.needsUpdate = true; return m
  }

  function apply(c) {
    if (!NUIT.on) return null
    const { s, THREE, SEA, B, tower, rand } = c
    const V = (x, y, z) => new THREE.Vector3(x, y, z)
    GU = GU || { uNG: { value: new THREE.Vector3(1, 1, 1) }, uNS: { value: 1 }, uNN: { value: 0 } }
    /* palettes converties une fois */
    const P = {}
    Object.keys(PAL).forEach((k) => { const p = PAL[k]; P[k] = { zen: new THREE.Color(p.zen), hor: new THREE.Color(p.hor), n: p.n.map((h) => new THREE.Color(h)), ink: new THREE.Color(p.ink), fog: new THREE.Color(p.fog),
      mer: p.mer.map((h) => new THREE.Color(h)), hemiC: new THREE.Color(p.hemi[0]), hemiG: new THREE.Color(p.hemi[1]), hemiI: p.hemi[2], dirC: new THREE.Color(p.dir[0]), dirI: p.dir[1],
      gm: new THREE.Vector3(...p.gm), gs: p.gs, mont: new THREE.Color(p.mont), sun: new THREE.Color(p.sun), night: p.night } })

    s.fog = new THREE.Fog('#a6d4f2', 60, 245)
    let hemi = null, dir = null
    s.traverse((o) => { if (o.isHemisphereLight) hemi = o; else if (o.isDirectionalLight && !dir) dir = o; else if (o.isAmbientLight) o.intensity *= .5 })

    /* ciel, soleil d'origine masqué, mer */
    const sky = skyMat(THREE), sea = seaMat(THREE, s.fog)
    let skyMesh = null
    const repl = []
    s.traverse((o) => {
      if (!o.isMesh) return
      const p = o.geometry && o.geometry.parameters
      if (p && p.radius === 400 && o.material.side === THREE.BackSide) { o.material = sky; skyMesh = o }
      else if (p && p.radius === 5 && o.material.color && o.material.color.getHexString() === 'ffe066') o.visible = false
      else if (o.geometry && o.geometry.type === 'CircleGeometry' && p.radius >= 150) repl.push(o)
    })
    repl.forEach((o) => { if (o.material.blending === THREE.AdditiveBlending) o.visible = false; else { o.material = sea; o.renderOrder = 0 } })
    if (!skyMesh) { skyMesh = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), sky); s.add(skyMesh) }
    skyMesh.renderOrder = -1; skyMesh.frustumCulled = false

    /* matériaux éclairés : copies locales à l'île (le cache de couleurs est partagé avec les ateliers) */
    const copies = new Map(), lit = (m) => m && (m.isMeshToonMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial)
    s.traverse((o) => {
      if (!o.isMesh || !o.material) return
      const one = (m) => { if (!lit(m)) return m; if (m.onBeforeCompile && m.onBeforeCompile.toString().length > 20 && !m.userData.nuit) return grade(m)
        if (!copies.has(m)) copies.set(m, grade(m.clone())); return copies.get(m) }
      o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material)
    })

    const mont = mountains(THREE, s, SEA, rand)

    /* fanaux chauds : portes des ateliers, tour ; quelques vraies lumières (allumées la nuit) */
    const halos = [], lamps = []
    ;(B || []).forEach((b, n) => { if (!b) return; b.updateMatrixWorld(true); const p = b.localToWorld(V(0, 1.7, 2.4)), h = glow(THREE, 2.6); h.position.copy(p); s.add(h); halos.push(h)
      if (n % 2 === 0) { const L = new THREE.PointLight('#ffb14a', 0, 9, 2); L.position.copy(p).add(V(0, .6, 0)); s.add(L); lamps.push(L) } })
    if (tower) { const p = tower.getWorldPosition(V(0, 0, 0)); const h = glow(THREE, 3.2, '#ffd98a'); h.position.set(p.x, p.y + 6.6, p.z); s.add(h); halos.push(h) }

    /* lucioles vertes au-dessus de l'île (la nuit) */
    const NF = 160, fp = new Float32Array(NF * 3), fc = new Float32Array(NF * 3), ph = []
    for (let i = 0; i < NF; i++) { const a = rand(0, Math.PI * 2), r = rand(4, 27); fp.set([Math.sin(a) * r, rand(1, 6.5), -Math.cos(a) * r], i * 3); ph.push([rand(0, 6), rand(.4, 1.2), fp[i * 3], fp[i * 3 + 1], fp[i * 3 + 2]]) }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fc, 3))
    glow(THREE, 1)
    const ff = new THREE.Points(fg, new THREE.PointsMaterial({ size: .5, map: GLOWT, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.add(ff)
    const lc = new THREE.Color('#c9ffb4')

    /* mélange de deux palettes (tout est interpolé : couleurs, intensités, étalonnage) */
    const X = { zen: new THREE.Color(), hor: new THREE.Color(), n: [0, 1, 2, 3].map(() => new THREE.Color()), ink: new THREE.Color(), fog: new THREE.Color(), mer: [0, 1, 2, 3].map(() => new THREE.Color()),
      hemiC: new THREE.Color(), hemiG: new THREE.Color(), dirC: new THREE.Color(), gm: new THREE.Vector3(), mont: new THREE.Color(), sun: new THREE.Color() }
    function mix(a, b, k) {
      ;['zen', 'hor', 'ink', 'fog', 'hemiC', 'hemiG', 'dirC', 'mont', 'sun'].forEach((f) => X[f].copy(a[f]).lerp(b[f], k))
      for (let i = 0; i < 4; i++) { X.n[i].copy(a.n[i]).lerp(b.n[i], k); X.mer[i].copy(a.mer[i]).lerp(b.mer[i], k) }
      X.gm.copy(a.gm).lerp(b.gm, k); X.gs = a.gs + (b.gs - a.gs) * k; X.hemiI = a.hemiI + (b.hemiI - a.hemiI) * k; X.dirI = a.dirI + (b.dirI - a.dirI) * k; X.night = a.night + (b.night - a.night) * k
      return X
    }
    const sunV = V(0, 1, 0)
    const DEP = .12 // la partie commence au milieu de la matinée

    return {
      update(dt, t) {
        const u = NUIT.fixe !== null ? NUIT.fixe : ((t / NUIT.duree + DEP) % 1)
        NUIT.heure = u; NUIT.moment = MOMENT(u)
        let i = 0; while (i < KEYS.length - 2 && u > KEYS[i + 1][0]) i++
        const [u0, a] = KEYS[i], [u1, b] = KEYS[i + 1], k0 = (u - u0) / Math.max(1e-6, u1 - u0), k = k0 * k0 * (3 - 2 * k0)
        const x = mix(P[a], P[b], k)
        /* course du soleil : lever à l'est (+x), coucher à l'ouest, légèrement au sud ; la nuit il passe sous l'horizon */
        const ang = (u - LEVE) / (COUCHE - LEVE) * Math.PI, dayUp = u >= LEVE && u <= COUCHE
        if (dayUp) sunV.set(Math.cos(ang), Math.sin(ang) * .95, .32).normalize()
        else { const un = ((u - COUCHE + 1) % 1) / (1 - (COUCHE - LEVE)); const an = un * Math.PI; sunV.set(-Math.cos(an), -Math.sin(an) * .9, -.25).normalize() }
        const U = sky.uniforms
        U.uT.value = t; U.uZen.value.copy(x.zen); U.uHor.value.copy(x.hor); U.uN0.value.copy(x.n[0]); U.uN1.value.copy(x.n[1]); U.uN2.value.copy(x.n[2]); U.uN3.value.copy(x.n[3])
        U.uInk.value.copy(x.ink); U.uSun.value.copy(sunV); U.uSunC.value.copy(x.sun); U.uNight.value = x.night
        const S = sea.uniforms; S.uT.value = t; S.uFog.value.copy(x.fog); x.mer.forEach((cc, j) => S['uM' + j].value.copy(cc)); S.uSun.value.copy(sunV); S.uSunC.value.copy(x.sun).multiplyScalar(dayUp ? 1 : .45)
        s.fog.color.copy(x.fog); s.background = null
        if (hemi) { hemi.color.copy(x.hemiC); hemi.groundColor.copy(x.hemiG); hemi.intensity = x.hemiI }
        if (dir) { dir.color.copy(x.dirC); dir.intensity = x.dirI; const L = dayUp ? sunV : V(-sunV.x, -sunV.y, -sunV.z); dir.position.set(L.x * 40, Math.max(6, L.y * 40), L.z * 40); if (dir.target) dir.target.position.set(0, 0, 0) }
        GU.uNG.value.copy(x.gm); GU.uNS.value = x.gs; GU.uNN.value = x.night
        mont.forEach((m) => { if (m.userData.feux) m.opacity = x.night; else m.color.copy(x.mont) })
        /* le dôme suit la caméra et reste en deçà du plan lointain (sinon un disque vide apparaît au zénith) */
        const cam = typeof camera !== 'undefined' ? camera : null; if (cam) { skyMesh.position.copy(cam.position); skyMesh.scale.setScalar(Math.min(1, cam.far * .85 / 400)) }
        halos.forEach((h, j) => { h.visible = x.night > .05; h.material.opacity = x.night * (.75 + Math.sin(t * 5.3 + j * 1.7) * .15 + Math.sin(t * 13 + j) * .06) })
        lamps.forEach((L) => (L.intensity = x.night * .9))
        ff.visible = x.night > .2
        if (ff.visible) { const Pp = fg.attributes.position, Cc = fg.attributes.color
          for (let j = 0; j < NF; j++) { const [p0, sp, px, py, pz] = ph[j]; Pp.setXYZ(j, px + Math.sin(t * sp * .7 + p0) * .8, py + Math.sin(t * sp + p0 * 2) * .5, pz + Math.cos(t * sp * .6 + p0) * .8)
            const kk = Math.max(0, Math.sin(t * sp * 2.2 + p0 * 5)) ** 3 * x.night; Cc.setXYZ(j, lc.r * kk, lc.g * kk, lc.b * kk) }
          Pp.needsUpdate = true; Cc.needsUpdate = true }
      }
    }
  }
})()

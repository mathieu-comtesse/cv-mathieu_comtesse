// Planche de contrôle des personnages skinnés, rendue par le vrai pipeline du jeu.
//   node tools/forge/preview/evalue.mjs --fichier tools/forge/persos/vue.js --sortie planche.png --url "?pr=1&fx=2&perso=dylan&poses=Idle_Loop:0.6,Walk_Loop:0.3,Jog_Fwd_Loop:0.2&cam=0,1.5,11,0,1.2,0&w=1600&h=800"
// paramètres : perso (noms séparés par des virgules ; un par pose, le dernier se répète), poses (Clip:t[:yaw[:groupes+séparés+par+des+plus]]), cam (x,y,z,cibleX,cibleY,cibleZ), w, h, fond, yaw (degrés), ecart, epi (liste ou « tout »)
var Q = new URLSearchParams(location.search)
var LST = (Q.get('perso') || 'dylan').split(','), POSES = (Q.get('poses') || 'Idle_Loop:0.6').split(',').map(function (p) { var a = p.split(':'); return [a[0], +(a[1] || 0), a[2] === undefined || a[2] === '' ? null : +a[2] * Math.PI / 180, a[3] ? a[3].replace(/\./g, ':').split(/[+ ]/) : null] })
var CAM = (Q.get('cam') || '0,1.5,11,0,1.25,0').split(',').map(Number), W = +(Q.get('w') || 1600), H = +(Q.get('h') || 800), YAW = (+(Q.get('yaw') || -25)) * Math.PI / 180, ECART = +(Q.get('ecart') || 1.9)
var OK = await TALAS_PERSO.precharger(Array.from(new Set(LST)))
if (!OK) { throw new Error('préchargement des personnages impossible') }
var sc = new THREE.Scene(); sc.background = new THREE.Color(Q.get('fond') || '#6d7fb5'); sc.fog = new THREE.Fog(Q.get('fond') || '#6d7fb5', 30, 90)
sc.add(new THREE.HemisphereLight('#e8f0ff', '#8a7a6a', .78))
var sun = new THREE.DirectionalLight('#fff2d8', .95); sun.position.set(-6, 12, 9); sun.castShadow = Q.get('ombre') !== '0'; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 8, bottom: -6, near: 1, far: 50 }); sc.add(sun)
var sol = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshToonMaterial({ color: '#9aa8cc', gradientMap: grad })); sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; sc.add(sol)
var n = POSES.length, x0 = -(n - 1) * ECART / 2
POSES.forEach(function (p, i) {
  var nom = LST[Math.min(i, LST.length - 1)], EPI = Q.get('epi'), o = TALAS_PERSO.creer(nom, { echelle: .9, montre: p[3] || undefined, plus: Q.get('plus') ? Q.get('plus').split(',') : undefined, moins: Q.get('moins') ? Q.get('moins').split(',') : undefined, epi: EPI === 'tout' ? ['casque', 'gilet', 'lunettes', 'auditive', 'harnais', 'chaussures', 'gants', 'cheveux:courts', 'barbe:chaume'] : EPI ? EPI.split(',') : undefined })
  if (!o) { console.error('personnage introuvable', nom); return }
  o.position.set(x0 + i * ECART, 0, 0); o.rotation.y = p[2] === null ? YAW : p[2]; sc.add(o)
  TALAS_PERSO.jouer(o, p[0], { fondu: 0 })
  var d = o.userData.perso; d.courant.time = p[1]; d.mixer.update(0)
})
var cam = new THREE.PerspectiveCamera(+(Q.get('fov') || 30), W / H, .1, 200); cam.position.set(CAM[0], CAM[1], CAM[2]); cam.lookAt(CAM[3], CAM[4], CAM[5])
renderer.setPixelRatio(1); renderer.setSize(W, H, false)
var wd = { hd: 1, scene: sc, rendu: { ao: .45, encre: .9, bloom: .12, dof: 0, vignette: .12 }, focus: CAM[2] }
TALAS_RENDU.rendre(renderer, sc, cam, wd, 1)
renderer.domElement.toDataURL('image/png')

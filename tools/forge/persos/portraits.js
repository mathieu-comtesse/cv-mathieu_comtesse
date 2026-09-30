// Planche de portraits (médaillons de dialogue) : chaque personnage est rendu par le vrai pipeline du jeu, en buste, sur un fond à sa couleur.
//   node tools/forge/preview/evalue.mjs --fichier tools/forge/persos/portraits.js --sortie tools/forge/out/portraits-planche.png --url "?pr=1&fx=2"
//   python tools/forge/persos/decouper_portraits.py      -> assets/talas/por-<nom>.png (256 px, médaillon rond)
// La planche : 4 colonnes de 512 px, dans l'ordre de LISTE. Les modèles sont ceux de TALAS_PERSO.cast (Mathilde = femme, chignon, chemise verte…).
var LISTE = [
  ['dylan', 'dylan', '#3f86cf', -22], ['aurelien', 'aurelien', '#7a55d8', -22], ['mathieu', 'mathieu', '#e58d33', -22], ['mathilde', 'mathilde', '#3cb25a', -22],
  ['neila', 'neila', '#e0588f', -22], ['lorette', 'lorette', '#e85f5f', -22], ['eliott', 'eliott', '#8468d9', -22], ['georges', 'georges', '#4c6ad4', -22],
  ['bernard', 'bernard', '#d85252', -22], ['boulon', '@boulon', '#2f7fd0', -16]
]
// (le chien de sûreté du mini-jeu de plateforme est un chien de dessin animé en primitives : son médaillon por-rivet.png reste celui d'origine ; '@chien' = chien spectral du quai, si besoin)
var COLS = 4, PX = 512, ROWS = Math.ceil(LISTE.length / COLS)
var OK = await TALAS_PERSO.precharger(Array.from(new Set(LISTE.filter(function (l) { return l[1][0] !== '@' }).map(function (l) { return l[1] }))))
if (!OK) { throw new Error('préchargement des personnages impossible') }
var atlas = document.createElement('canvas'); atlas.width = COLS * PX; atlas.height = ROWS * PX
var ag = atlas.getContext('2d')
var box = new THREE.Box3(), cen = new THREE.Vector3(), siz = new THREE.Vector3(), hp = new THREE.Vector3()
for (var i = 0; i < LISTE.length; i++) {
  var L = LISTE[i], fond = L[2], yaw = L[3] * Math.PI / 180
  var sc = new THREE.Scene(); sc.background = new THREE.Color(fond)
  sc.add(new THREE.HemisphereLight('#e8f0ff', '#8a7a6a', .62))
  var sun = new THREE.DirectionalLight('#fff2d8', .8); sun.position.set(-4, 7, 9); sc.add(sun)
  var rim = new THREE.DirectionalLight('#bcd4ff', .22); rim.position.set(6, 3, -5); sc.add(rim)
  var cam = new THREE.PerspectiveCamera(24, 1, .05, 60), tgt = new THREE.Vector3(), dist = 2
  var o
  if (L[1] === '@boulon') {
    o = makeBoulon(); o.rotation.y = yaw; sc.add(o); o.updateMatrixWorld(true)
    box.setFromObject(o); box.getCenter(cen); box.getSize(siz)
    tgt.set(cen.x, box.min.y + siz.y * .58, cen.z); dist = Math.max(siz.x, siz.y * .8) * 1.12 / (2 * Math.tan(12 * Math.PI / 180))
  } else if (L[1] === '@chien') {
    o = TALAS_CHIEN.creer({ pas: 34 }); o.rotation.y = yaw; sc.add(o)
    o.updateMatrixWorld(true); box.setFromObject(o); box.getCenter(cen); box.getSize(siz)
    tgt.set(cen.x, .88, cen.z); dist = 4.5 / (2 * Math.tan(12 * Math.PI / 180)) * .42
  } else {
    o = TALAS_PERSO.creer(L[1], { echelle: 1 }); o.rotation.y = yaw; sc.add(o)
    TALAS_PERSO.jouer(o, 'Idle_Loop', { fondu: 0 }); var d = o.userData.perso; d.courant.time = .6; d.mixer.update(0); o.updateMatrixWorld(true)
    d.os.Head.getWorldPosition(hp); tgt.set(hp.x, hp.y + .28, hp.z); dist = 1.22 / (2 * Math.tan(12 * Math.PI / 180))   // tête de dessin animé : ~0,8 m de haut, os « Head » vers le menton
    if (L[1] === 'aurelien') dist *= 1.12
  }
  cam.position.set(tgt.x + Math.sin(-yaw * .35) * dist * .2, tgt.y + dist * .05, tgt.z + dist); cam.lookAt(tgt); cam.updateMatrixWorld(true)
  if (L[1] === '@chien') o.userData.tick(.05, 0, 0, cam, new THREE.Vector3(.3, 1, .5), new THREE.Color('#ffffff'), new THREE.Color('#8f86ff').multiplyScalar(.55))
  renderer.setPixelRatio(1); renderer.setSize(PX, PX, false)
  var wd = { hd: 1, scene: sc, rendu: { ao: .45, encre: .9, bloom: .1, dof: 0, vignette: 0 }, focus: dist }
  try { TALAS_RENDU.rendre(renderer, sc, cam, wd, 1) } catch (e) { console.error('portrait ' + L[0] + ' : ' + e.message) }
  ag.drawImage(renderer.domElement, (i % COLS) * PX, Math.floor(i / COLS) * PX, PX, PX)
  sc.remove(o)
}
atlas.toDataURL('image/png')

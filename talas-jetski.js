/* « La régate de l'amélioration continue » : course de jet-ski autour de l'île Talas (§10). Script classique chargé
 * avant le jeu ; il utilise à l'exécution les briques globales du jeu (THREE, camera, cur, setWorld, fade, say,
 * hidePanel, pts, cdi, tsAdd, beep, KEYS, KEYP, TOUCH, toonFromGLB, preloadToons, makeDylan, makePerson, ILE).
 *
 * La mer : six houles de Gerstner (crêtes pincées) ; le shader et la physique utilisent EXACTEMENT la même fonction
 * (le code GLSL est généré depuis le tableau HOULE), donc le jet-ski flotte sur la vague qu'on voit.
 * Le jet-ski : quatre flotteurs (proue, poupe, bâbord, tribord) montés en ressorts amortis : il s'enfonce dans l'eau à
 * l'atterrissage (pénétration) puis rebondit, tangue et roule dans la houle, déjauge à grande vitesse, dérive en virage.
 * S = plonger : la proue passe sous la vague au lieu de décoller.
 * La course : trois tours, bouées à passer du bon côté (◀ jaune : passe à gauche, ▶ rouge : passe à droite) ; une
 * bouée manquée est un écart qui fait perdre de la puissance ; à chaque fin de tour, une action corrective (§10.2),
 * puis un nouveau tour pour s'améliorer (§10.3).
 *   TALAS_JETSKI.course(n, cfg) -> Promise<ratio de réussite>      TALAS_JETSKI.auto = true -> pilote automatique */
(function () {
  const J = { course, auto: false, etat: {} }
  window.TALAS_JETSKI = J
  const G = 9.81

  /* ---------------- chapitre 10 : une étape par bouée, des signalements à ramasser, une banque de questions ---------------- */
  const ETAPES = [
    ['§10.1', 'OPPORTUNITÉS', 'Déterminer les opportunités d’amélioration et mettre en œuvre les actions pour atteindre les résultats du système SST.'],
    ['§10.2', 'SIGNALER', 'Tout incident, presque-accident ou non-conformité est remonté, sans chercher de coupable : on ne corrige que ce qu’on connaît.'],
    ['§10.2 a', 'RÉAGIR', 'Réagir en temps utile : maîtriser la situation et corriger (mise en sécurité, premiers secours, arrêt de l’activité).'],
    ['§10.2 a', 'CONSÉQUENCES', 'Faire face aux conséquences : prise en charge du blessé, information des proches, déclaration, remise en état.'],
    ['§10.2 b', 'AVEC LES TRAVAILLEURS', 'Évaluer, avec la participation des travailleurs et des autres parties intéressées, s’il faut agir sur les causes.'],
    ['§10.2 b', 'ENQUÊTER', 'Enquêter sur l’incident ou examiner la non-conformité : faits, témoins, lieux, conditions de travail.'],
    ['§10.2 b', 'CAUSES', 'Déterminer les causes, y compris organisationnelles : arbre des causes, 5 pourquoi, Ishikawa.'],
    ['§10.2 b', 'CAS SIMILAIRES', 'Vérifier si des incidents similaires se sont produits ou pourraient se produire ailleurs (autres postes, autres sites).'],
    ['§10.2 c', 'REVOIR LES RISQUES', 'Revoir les évaluations existantes des risques SST et des autres risques (§6.1).'],
    ['§10.2 d', 'AGIR', 'Mettre en œuvre les actions nécessaires, dans l’ordre de la hiérarchie des mesures (§8.1.2) et en gérant le changement (§8.1.3).'],
    ['§10.2 e', 'NOUVEAUX DANGERS', 'Avant d’agir, évaluer les risques liés aux dangers nouveaux ou modifiés par l’action elle-même.'],
    ['§10.2 f', 'EFFICACITÉ', 'Examiner l’efficacité des actions, y compris correctives : l’écart a-t-il vraiment disparu ?'],
    ['§10.2 g', 'SYSTÈME & PREUVES', 'Modifier le système si nécessaire, conserver les informations documentées (nature de l’événement, actions, résultats) et les communiquer aux travailleurs.'],
    ['§10.3', 'AMÉLIORER SANS FIN', 'Amélioration continue : meilleure performance SST, culture de prévention, participation des travailleurs, résultats communiqués.']
  ]
  const SIGNALEMENTS = [
    ['Presque-accident', 'Un presque-accident signalé, c’est un accident évité demain (§10.2).'],
    ['Non-conformité d’audit', 'Un écart d’audit interne se traite comme un incident : causes, action, efficacité (§9.2, §10.2).'],
    ['Situation dangereuse', 'Une situation dangereuse repérée par un opérateur : on la remonte avant qu’elle ne blesse (§10.2).'],
    ['Accident du travail', 'Accident : réagir, soigner, déclarer, puis analyser les causes (§10.2 a et b).'],
    ['Remontée terrain', 'Une remarque d’un travailleur est une opportunité d’amélioration (§10.1, §5.4).'],
    ['Maladie professionnelle', 'Une atteinte à la santé est aussi un incident au sens de la norme (§3.35, §10.2).']
  ]
  const BANQUE = {
    cause: [
      { q: 'Que fais-tu avant le tour suivant ?', opts: [['Je cherche la cause : j’arrive trop vite et trop large sur les bouées, je ralentis avant et je prends la corde', 1], ['C’est la faute du jet-ski, je n’y peux rien', 0], ['Je fais pareil, ça passera bien', 0]], fb: '§10.2 : on analyse la cause de l’écart et on met en œuvre l’action qui l’élimine.' },
      { q: 'Avec qui analyses-tu tes écarts ?', opts: [['Avec l’équipe : ceux qui étaient sur l’eau ont vu ce que je n’ai pas vu', 1], ['Seul, c’est plus rapide', 0], ['Avec le directeur, lui seul décide', 0]], fb: '§10.2 b : l’évaluation se fait avec la participation des travailleurs (§5.4).' },
      { q: 'Quelle action corrective choisis-tu ?', opts: [['Supprimer la cause (repérer la bouée plus tôt) avant d’ajouter des consignes', 1], ['Mettre un casque plus solide', 0], ['Écrire une note de service « faites attention »', 0]], fb: '§10.2 d : l’action suit la hiérarchie des mesures (§8.1.2) ; l’EPI et la consigne viennent en dernier.' },
      { q: 'Une bouée ratée au même virage que Neila. Et alors ?', opts: [['Je vérifie si le même écart peut arriver ailleurs ou à d’autres', 1], ['Ce n’est pas mon problème', 0], ['Je supprime la bouée du parcours', 0]], fb: '§10.2 b : on regarde si des incidents similaires existent ou pourraient se produire.' }],
    efficacite: [
      { q: 'Ton action corrective a-t-elle marché ?', opts: [['Je compare au tour précédent : je vérifie l’efficacité, puis je vise encore mieux', 1], ['Je ne mesure rien, l’important c’est d’avoir fait une action', 0], ['J’ai fini un tour, j’arrête de chercher à progresser', 0]], fb: '§10.2 f et §10.3 : on vérifie l’efficacité, et l’amélioration continue ne s’arrête jamais.' },
      { q: 'Que gardes-tu comme trace de ce tour ?', opts: [['Les écarts, leurs causes, les actions et leurs résultats', 1], ['Rien, tout le monde s’en souvient', 0], ['Seulement le temps du tour, s’il est bon', 0]], fb: '§10.2 g : informations documentées sur la nature des événements, les actions et leurs résultats.' },
      { q: 'Ton action a créé un nouveau risque (virage plus serré). Tu fais quoi ?', opts: [['J’évalue ce nouveau danger avant de généraliser l’action', 1], ['Tant pis, on verra bien', 0], ['J’annule toute action corrective', 0]], fb: '§10.2 e : on évalue les risques des dangers nouveaux ou modifiés avant d’agir.' },
      { q: 'Plus aucun écart. Et maintenant ?', opts: [['Je partage ce qui a marché avec l’équipe et je fixe un objectif plus ambitieux', 1], ['On peut arrêter la démarche', 0], ['Je garde ma méthode pour moi', 0]], fb: '§10.3 : communiquer les résultats et promouvoir une culture qui soutient l’amélioration continue.' }]
  }

  /* ---------------- la houle ---------------- */
  const HOULE = [ // amplitude (m), longueur d'onde (m), direction (rad), raideur (0..1), phase
    [.9, 46, .35, .55, 0], [.55, 27, 1.25, .6, 1.7], [.28, 15, 2.4, .65, 4.1], [.15, 9.5, -.6, .7, 2.3], [.07, 5.8, .95, .75, 5.2], [.04, 3.4, 2.0, .75, .9]
  ].map(([a, l, d, s, ph]) => { const k = 2 * Math.PI / l; return { a, k, w: Math.sqrt(G * k), dx: Math.cos(d), dz: Math.sin(d), H: s / (k * 6), sn: s / 6, ph } })
  const f = (x) => x.toFixed(5)
  const GLSL_HOULE = HOULE.map((h) => `th=${f(h.k)}*dot(vec2(${f(h.dx)},${f(h.dz)}),x0)-${f(h.w)}*uT+${f(h.ph)};c=cos(th);s=sin(th);
    d.x+=${f(h.dx * h.H)}*c*fa;d.z+=${f(h.dz * h.H)}*c*fa;d.y+=${f(h.a)}*s*fa;
    n.x-=${f(h.dx * h.k * h.a)}*c*fa;n.z-=${f(h.dz * h.k * h.a)}*c*fa;n.y-=${f(h.sn)}*s*fa;`).join('\n')
  let TT = 0, CX = 0, CZ = 0 // temps de la mer, caméra (atténuation au loin)
  const fade = (x, z) => { const dd = Math.hypot(x - CX, z - CZ); return 1 - Math.min(1, Math.max(0, (dd - 220) / 380)) }
  function disp(x, z, o) { // déplacement de Gerstner au point de repos (x, z)
    const fa = fade(x, z); let dx = 0, dy = 0, dz = 0, nx = 0, ny = 1, nz = 0
    for (const h of HOULE) { const th = h.k * (h.dx * x + h.dz * z) - h.w * TT + h.ph, c = Math.cos(th), s = Math.sin(th)
      dx += h.dx * h.H * c * fa; dz += h.dz * h.H * c * fa; dy += h.a * s * fa; nx -= h.dx * h.k * h.a * c * fa; nz -= h.dz * h.k * h.a * c * fa; ny -= h.sn * s * fa }
    o.dx = dx; o.dy = dy; o.dz = dz; o.nx = nx; o.ny = ny; o.nz = nz; return o }
  const TMP = {}
  function eau(x, z, it) { // hauteur (et normale) de la mer au point monde (x, z) : on remonte le déplacement horizontal
    let px = x, pz = z
    for (let i = 0; i < (it || 3); i++) { disp(px, pz, TMP); px = x - TMP.dx; pz = z - TMP.dz }
    disp(px, pz, TMP); const l = Math.hypot(TMP.nx, TMP.ny, TMP.nz)
    return { y: TMP.dy, nx: TMP.nx / l, ny: TMP.ny / l, nz: TMP.nz / l, crete: TMP.ny }
  }
  J.eau = eau

  /* ---------------- matériaux : mer, ciel ---------------- */
  const NOISE = `float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}`
  const SKYF = `vec3 ciel(vec3 r){float e=max(r.y,0.);vec3 c=mix(uSkyH,uSkyT,pow(e,.55));float sd=max(dot(r,uSun),0.);c+=uSunC*(pow(sd,300.)*3.+pow(sd,10.)*.22);return c;}`
  function merMat(THREE, P) {
    return new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uSun: { value: P.sun }, uSunC: { value: new THREE.Color(P.sunC) }, uSkyT: { value: new THREE.Color(P.skyT) }, uSkyH: { value: new THREE.Color(P.skyH) },
        uDeep: { value: new THREE.Color(P.deep) }, uShal: { value: new THREE.Color(P.shal) }, uSSS: { value: new THREE.Color(P.sss) }, uFog: { value: new THREE.Color(P.fog) }, uFN: { value: 140 }, uFF: { value: 390 },
        uIsl: { value: new THREE.Vector2(0, 0) }, uIslR: { value: 40 } },
      vertexShader: `uniform float uT;uniform vec3 uC;varying vec3 vW;varying vec3 vN;varying float vFoam;varying float vH;
void main(){vec2 x0=position.xz+uC.xz;float fa=1.-clamp((length(x0-cameraPosition.xz)-220.)/380.,0.,1.);
  vec3 d=vec3(0.),n=vec3(0.,1.,0.);float th,c,s;
  ${GLSL_HOULE}
  vec3 wp=vec3(x0.x+d.x,d.y,x0.y+d.z);vW=wp;vN=n;vH=d.y;vFoam=n.y;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,
      fragmentShader: `uniform float uT,uFN,uFF,uIslR;uniform vec3 uSun,uSunC,uSkyT,uSkyH,uDeep,uShal,uSSS,uFog;uniform vec2 uIsl;varying vec3 vW;varying vec3 vN;varying float vFoam;varying float vH;
${NOISE}
${SKYF}
void main(){
  vec3 N=normalize(vN);vec2 q=vW.xz;float t=uT,z=length(vW-cameraPosition),near=1.-smoothstep(25.,120.,z);
  /* rides fines : quatre petites vagues, seulement pour la normale (scintillement) */
  vec2 g=vec2(0.);float th;
  th=dot(q,vec2(.83,.55))*5.2+t*7.1;g+=vec2(.83,.55)*cos(th)*.05;
  th=dot(q,vec2(-.4,.92))*7.9+t*8.8;g+=vec2(-.4,.92)*cos(th)*.035;
  th=dot(q,vec2(.2,-.98))*11.3+t*10.5;g+=vec2(.2,-.98)*cos(th)*.025;
  th=dot(q,vec2(-.95,-.3))*15.7+t*12.4;g+=vec2(-.95,-.3)*cos(th)*.018;
  N=normalize(N+vec3(-g.x,0.,-g.y)*(.35+.65*near));
  vec3 V=normalize(cameraPosition-vW);float nv=max(dot(N,V),0.);
  float fr=.02+.98*pow(1.-nv,5.);
  vec3 R=reflect(-V,N);R.y=abs(R.y);vec3 refl=ciel(R);
  vec3 body=mix(uDeep,uShal,.3+.6*nv);
  float di=length(q-uIsl)-uIslR,lag=1.-smoothstep(0.,28.,di);
  body=mix(body,vec3(.42,.9,.8),lag*.55);
  float sss=pow(clamp(dot(V,-uSun)*.6+.55,0.,1.),2.)*clamp(vH*1.3+.45,0.,1.2);
  body+=uSSS*sss*.5;
  vec3 c=mix(body,refl,fr*.85);
  vec3 Hh=normalize(uSun+V);float nh=max(dot(N,Hh),0.);c+=uSunC*(pow(nh,1100.)*7.+pow(nh,120.)*.3);
  float fn=fbm(q*1.25+vec2(t*.35,-t*.22));
  float crest=smoothstep(.6,.34,vFoam)*smoothstep(.4,.75,fn+.1);
  float shore=(1.-smoothstep(0.,3.5,di))*smoothstep(.45,.8,fbm(q*2.1+t*.4)*.85+.2*sin(di*2.6-t*2.2));
  vec2 wd=vec2(.94,.34);float sk=vn(vec2(dot(q,wd)*.07+t*.04,dot(q,vec2(-wd.y,wd.x))*.9));float streak=smoothstep(.8,.95,sk)*smoothstep(.45,.75,fn)*.28*(1.-smoothstep(40.,160.,z));
  float foam=clamp(crest+shore*.9+streak,0.,1.);
  c=mix(c,vec3(.95,.99,1.),foam*.88);
  c=mix(c,uFog,smoothstep(uFN,uFF,z));
  gl_FragColor=vec4(c,1.);}`
    })
  }
  function cielMat(THREE, P) {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uT: { value: 0 }, uSun: { value: P.sun }, uSunC: { value: new THREE.Color(P.sunC) }, uSkyT: { value: new THREE.Color(P.skyT) }, uSkyH: { value: new THREE.Color(P.skyH) } },
      vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uT;uniform vec3 uSun,uSunC,uSkyT,uSkyH;varying vec3 vD;
${NOISE}
${SKYF}
void main(){vec3 d=normalize(vD);vec3 c=ciel(d);
  vec2 p=d.xz/(max(d.y,0.)+.1)*.9+vec2(uT*.004,0.);
  float cl=smoothstep(.52,.78,fbm(p*.9))*smoothstep(0.,.18,d.y);
  float sh=fbm(p*.9+vec2(.08,.05));
  vec3 cc=mix(vec3(1.),vec3(.78,.84,.92),smoothstep(.45,.8,sh))+uSunC*pow(max(dot(d,uSun),0.),6.)*.25;
  c=mix(c,cc,cl*.92);
  c=mix(c,uSkyH*1.05,(1.-smoothstep(0.,.08,d.y))*.6);
  gl_FragColor=vec4(c,1.);}`
    })
  }
  function merGeo(THREE) { // grille polaire : dense près de la caméra, jusqu'à 900 m
    const NR = 150, NS = 192, pos = [], idx = []
    pos.push(0, 0, 0)
    for (let i = 1; i <= NR; i++) { const r = .45 * i + Math.pow(i / NR, 3) * 900; for (let j = 0; j < NS; j++) { const a = j / NS * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r) } }
    for (let j = 0; j < NS; j++) idx.push(0, 1 + (j + 1) % NS, 1 + j)
    for (let i = 1; i < NR; i++) for (let j = 0; j < NS; j++) { const a = 1 + (i - 1) * NS + j, b = 1 + (i - 1) * NS + (j + 1) % NS, c = 1 + i * NS + j, d = 1 + i * NS + (j + 1) % NS; idx.push(a, b, c, b, d, c) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g
  }

  /* ---------------- textures peintes ---------------- */
  function ctx(THREE, w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); return t }
  function ecumeTex(THREE) { // écume du sillage : bulles, plus dense sur les bords (le V)
    return ctx(THREE, 128, 256, (g, w, h) => { g.clearRect(0, 0, w, h)
      for (let i = 0; i < 1400; i++) { const x = Math.random() * w, y = Math.random() * h, e = Math.abs(x / w - .5) * 2, p = .25 + .75 * Math.pow(e, 1.5)
        if (Math.random() > p) continue; g.fillStyle = `rgba(255,255,255,${.35 + Math.random() * .5})`; g.beginPath(); g.arc(x, y, 1 + Math.random() * 3.5, 0, 7); g.fill() }
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.18, 'rgba(255,255,255,.15)'); gr.addColorStop(.5, 'rgba(255,255,255,.3)'); gr.addColorStop(.82, 'rgba(255,255,255,.15)'); gr.addColorStop(1, 'rgba(255,255,255,.55)'); g.fillStyle = gr; g.fillRect(0, 0, w, h) })
  }
  function bandeTex(THREE, a, b, n) { return ctx(THREE, 64, 64, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, i * h / n, w, h / n) } }) }

  /* ---------------- décor : île, collines lointaines, palmiers, hangar, arche, tribune ---------------- */
  function ile(THREE, s) {
    const NR = 44, NS = 120, pos = [], col = [], idx = [], c = new THREE.Color()
    const hn = (x, z) => { let v = 0, a = 1, fq = .045; for (let o = 0; o < 4; o++) { v += a * (Math.sin(x * fq + o * 1.7) * Math.cos(z * fq * 1.13 + o * .9)); a *= .5; fq *= 2.1 } return v }
    const H = (x, z) => { const r = Math.hypot(x, z), coast = 37 + 3 * Math.sin(Math.atan2(z, x) * 3 + 1) + 2 * Math.sin(Math.atan2(z, x) * 7)
      const beach = Math.max(-2.5, 1.3 - Math.max(0, r - coast + 5) * .42), hills = (16 * Math.exp(-Math.pow(r / 19, 2)) + 7 * Math.exp(-(Math.pow(x + 12, 2) + Math.pow(z - 9, 2)) / 90) + 2.2 * hn(x, z)) * (1 - Math.min(1, Math.max(0, (r - (coast - 14)) / 10)))
      return beach + Math.max(0, hills) }
    for (let i = 0; i <= NR; i++) { const r = i / NR * 50; for (let j = 0; j < NS; j++) { const a = j / NS * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, y = H(x, z); pos.push(x, y, z)
      const g = hn(x * 2.3, z * 2.3)
      if (y < 1.6) c.set('#efdca6').lerp(new THREE.Color('#d9c48c'), .5 + g * .25); else if (y > 13) c.set('#5b7d3c'); else c.set(g > .1 ? '#4f9d36' : '#3f8a2f').lerp(new THREE.Color('#2f6f2a'), Math.min(1, y / 16))
      col.push(c.r, c.g, c.b) } }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const a = i * NS + j, b = i * NS + (j + 1) % NS, cc = (i + 1) * NS + j, d = (i + 1) * NS + (j + 1) % NS; idx.push(a, cc, b, b, cc, d) }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals()
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })); s.add(m)
    return H
  }
  function palmier(THREE) {
    const g = new THREE.Group(), trunk = new THREE.MeshLambertMaterial({ color: '#8a6a45' }), leaf = new THREE.MeshLambertMaterial({ color: '#3f9a35', side: THREE.DoubleSide })
    let y = 0, x = 0; const bend = .08 + Math.random() * .1
    for (let i = 0; i < 7; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(.16 - i * .012, .19 - i * .012, 1.05, 7), trunk); seg.position.set(x, y + .5, 0); seg.rotation.z = -bend * i * .6; g.add(seg); y += 1; x += bend * i * .6 }
    for (let k = 0; k < 8; k++) { const fr = new THREE.Mesh(new THREE.PlaneGeometry(.7, 3.4, 1, 4), leaf), p = fr.geometry.attributes.position
      for (let v = 0; v < p.count; v++) { const yy = p.getY(v); p.setZ(v, -Math.pow((yy + 1.7) / 3.4, 2) * 1.3) }
      fr.geometry.translate(0, 1.7, 0); fr.position.set(x, y, 0); fr.rotation.set(1.15, k / 8 * Math.PI * 2, 0, 'YXZ'); g.add(fr) }
    return g
  }
  function decor(THREE, s, course, H) {
    // palmiers : sur la plage et les collines
    for (let i = 0; i < 46; i++) { const a = Math.random() * Math.PI * 2, r = 8 + Math.pow(Math.random(), .6) * 27, x = Math.cos(a) * r, z = Math.sin(a) * r, y = H(x, z); if (y < .9) continue
      const p = (typeof ILE !== 'undefined' && ILE.palmier2) ? ILE.palmier2.clone() : palmier(THREE); if (ILE && ILE.palmier2) p.scale.setScalar(1.3 + Math.random() * .6); else p.scale.setScalar(.9 + Math.random() * .5)
      p.position.set(x, y - .1, z); p.rotation.y = Math.random() * 6; s.add(p) }
    // le hangar Talas sur la côte
    const hg = new THREE.Group(); hg.position.set(-14, H(-14, -18) + .1, -18); hg.rotation.y = .6; s.add(hg)
    const wh = new THREE.MeshLambertMaterial({ color: '#f1f3f5' }), bl = new THREE.MeshLambertMaterial({ color: '#1c5fd8' })
    const box = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 12), wh); box.position.y = 3; hg.add(box)
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 18, 24, 1, false, 0, Math.PI), wh); roof.rotation.z = Math.PI / 2; roof.position.y = 6; hg.add(roof)
    const band = new THREE.Mesh(new THREE.BoxGeometry(18.1, 1, 12.1), bl); band.position.y = 4.6; hg.add(band)
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.6), new THREE.MeshBasicMaterial({ map: ctx(THREE, 512, 100, (g, w, h) => { g.fillStyle = '#1c5fd8'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 64px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TALAS AÉRO', w / 2, h / 2 + 4) }) }))
    logo.position.set(0, 4.6, 6.08); hg.add(logo)
    // collines lointaines, voilées par la brume
    const hillM = new THREE.MeshLambertMaterial({ color: '#2e6b43' })
    ;[[260, -120, 60, 40], [-180, -260, 80, 55], [-300, 140, 70, 35], [150, 300, 55, 30]].forEach(([x, z, r, h]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillM); m.scale.y = h / r; m.position.set(x, -2, z); s.add(m) })
    // arche de départ, tribune flottante, banderoles
    const P0 = course.at(0), T0 = course.tan(0), N0 = { x: -T0.z, z: T0.x }
    const arch = new THREE.Group(); arch.position.set(P0.x, 0, P0.z); arch.rotation.y = Math.atan2(T0.x, T0.z); s.add(arch)
    const truss = new THREE.MeshLambertMaterial({ color: '#dee2e6' }), red = new THREE.MeshLambertMaterial({ color: '#e03131' })
    ;[-11, 11].forEach((x) => { const t = new THREE.Mesh(new THREE.BoxGeometry(.8, 9, .8), truss); t.position.set(x, 4, 0); arch.add(t); const b = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 1, 12), red); b.position.set(x, 0, 0); arch.add(b) })
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(22.8, 2.4), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: ctx(THREE, 1024, 108, (g, w, h) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) { g.fillStyle = '#111'; g.fillRect(i * 12, j * 36, 12, 36); g.fillRect(w - 192 + i * 12, j * 36, 12, 36) }
      g.fillStyle = '#e03131'; g.font = 'italic 900 78px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DÉPART · TALAS 45001', w / 2, h / 2 + 4) }) }))
    ban.position.set(0, 8, 0); arch.add(ban)
    const st = new THREE.Group(); st.position.set(P0.x + N0.x * 26, 0, P0.z + N0.z * 26); st.rotation.y = Math.atan2(-N0.x, -N0.z); s.add(st)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 10), new THREE.MeshLambertMaterial({ color: '#a47148' })); deck.position.y = .2; st.add(deck)
    for (let r = 0; r < 4; r++) { const step = new THREE.Mesh(new THREE.BoxGeometry(28, .6, 1.6), new THREE.MeshLambertMaterial({ color: '#dee2e6' })); step.position.set(0, 1 + r * .8, 2.6 - r * 1.6); st.add(step)
      for (let k = 0; k < 22; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.5, .9, .4), new THREE.MeshLambertMaterial({ color: ['#e03131', '#1c7ed6', '#fab005', '#2f9e44', '#f783ac', '#ffffff'][(k * 7 + r * 3) % 6] })); p.position.set(-13 + k * 1.24, 1.7 + r * .8, 2.6 - r * 1.6); p.userData.fan = Math.random() * 6; st.add(p) } }
    const pub = new THREE.Mesh(new THREE.PlaneGeometry(28, 2), new THREE.MeshBasicMaterial({ map: ctx(THREE, 1024, 74, (g, w, h) => { g.fillStyle = '#1c3faa'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'italic 900 50px Arial Black, Arial'; g.textBaseline = 'middle'; ['ISO 45001', 'TALAS', 'AMÉLIORATION CONTINUE', 'TALAS'].forEach((t, i) => g.fillText(t, 20 + i * 250, h / 2 + 3)) }) }))
    pub.position.set(0, 1.3, 5.02); st.add(pub)
    return { arch, stand: st }
  }

  /* ---------------- jet-ski et pilote ---------------- */
  function jetski(THREE, coul, pilote) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body)
    const sh = new THREE.Shape(); const O = [[0, 1.55], [.42, 1.0], [.56, .15], [.54, -1.05], [.4, -1.3], [-.4, -1.3], [-.54, -1.05], [-.56, .15], [-.42, 1.0]]
    O.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z))); sh.closePath()
    const hg = new THREE.ExtrudeGeometry(sh, { depth: .5, bevelEnabled: true, bevelThickness: .1, bevelSize: .08, bevelSegments: 2, curveSegments: 6 }); hg.rotateX(-Math.PI / 2)
    const p = hg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < .12) { p.setX(i, p.getX(i) * .5); p.setY(i, y - .12 * (1 - Math.abs(p.getX(i)) * 2)) } } hg.computeVertexNormals()
    const hull = new THREE.Mesh(hg, new THREE.MeshPhongMaterial({ color: coul[0], shininess: 90, specular: '#ffffff' })); hull.position.y = -.2; body.add(hull)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.14, .12, 2.5), new THREE.MeshLambertMaterial({ color: '#ffffff' })); strip.position.set(0, .12, .05); body.add(strip)
    const top = new THREE.Mesh(new THREE.BoxGeometry(.9, .25, 1.2), new THREE.MeshPhongMaterial({ color: coul[1], shininess: 70, specular: '#ffffff' })); top.position.set(0, .42, .65); top.rotation.x = -.18; body.add(top)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(.5, .22, 1.2), new THREE.MeshLambertMaterial({ color: '#212529' })); seat.position.set(0, .42, -.45); body.add(seat)
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .9, 6), new THREE.MeshLambertMaterial({ color: '#343a40' })); bar.rotation.z = Math.PI / 2; bar.position.set(0, .82, .38); body.add(bar)
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, .45, 6), bar.material); col.position.set(0, .62, .45); col.rotation.x = -.5; body.add(col)
    const rider = pilote && pilote(); if (rider) { body.add(rider); g.userData.rider = rider }
    g.userData.body = body; return g
  }
  function asseoir(r) { // pose assise, mains sur le guidon (squelette des personnages cartoon ou simples)
    const rig = r.userData.rig; if (!rig) return
    if (rig.nouveau) { animPerson(r, 'drive', 0); return }   // le clip « conduite » de la bibliothèque : assis, mains en avant
    const H = rig.hips || [], K = rig.knees || [], S = rig.shs || [], E = rig.elbows || []
    H.forEach((h, i) => { h.rotation.x = -1.35; h.rotation.z = (i ? -1 : 1) * .28 }); K.forEach((k) => (k.rotation.x = 1.55))
    if (rig.up) rig.up.rotation.x = .38
    S.forEach((s, i) => { s.rotation.x = -1.25; s.rotation.z = (i ? 1 : -1) * .15 }); E.forEach((e) => (e.rotation.x = -.5))
  }
  function pilote(kind, pal) {
    return () => {
      let r = typeof toonFromGLB === 'function' ? toonFromGLB(kind, pal, .5) : null
      if (!r) r = kind === 'dylan' && typeof makeDylan === 'function' ? makeDylan() : typeof makePerson === 'function' ? makePerson({ shirt: (pal && pal.shirt) || '#e03131', pants: '#212529', hat: '#ffd43b', scale: .5 }) : null
      if (!r) return null
      asseoir(r); r.position.set(0, .3, -.35); r.rotation.y = 0; r.userData.kind = kind; return r
    }
  }

  /* ---------------- embruns : particules (gerbes, panache, éclaboussures) ---------------- */
  function embruns(THREE, s, opa, grand) {
    const N = 1400, pos = new Float32Array(N * 3), sz = new Float32Array(N), al = new Float32Array(N), P = []
    for (let i = 0; i < N; i++) { P.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, t: 0, L: 0, s: 0 }); pos[i * 3 + 1] = -99 }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aS', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(al, 1))
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uH: { value: 600 } },
      vertexShader: 'attribute float aS;attribute float aA;varying float vA;uniform float uH;void main(){vA=aA;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aS*uH/-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying float vA;void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;float a=smoothstep(.5,.15,d)*vA;gl_FragColor=vec4(mix(vec3(.82,.95,.97),vec3(1.),smoothstep(.4,0.,d)),a);}' })
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; s.add(pts)
    let cur = 0
    const emit = (x, y, z, vx, vy, vz, L, size) => { const p = P[cur]; cur = (cur + 1) % N; Object.assign(p, { x, y, z, vx, vy, vz, t: 0, L, s: size }) }
    const update = (dt) => {
      for (let i = 0; i < N; i++) { const p = P[i]; if (p.y < -50) continue; p.t += dt; if (p.t > p.L) { p.y = -99; pos[i * 3 + 1] = -99; al[i] = 0; continue }
        p.vy -= G * dt; p.vx *= 1 - .6 * dt; p.vz *= 1 - .6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
        if (p.vy < 0 && (i & 3) === (Math.floor(p.t * 60) & 3)) { const w = eau(p.x, p.z, 1); if (p.y < w.y) { p.t = Math.max(p.t, p.L - .12); p.vy *= -.1 } }
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; const k = p.t / p.L; sz[i] = p.s * (1 + k * (grand ? 3 : 1.3)); al[i] = (1 - k) * (opa || .6) }
      geo.attributes.position.needsUpdate = true; geo.attributes.aS.needsUpdate = true; geo.attributes.aA.needsUpdate = true }
    return { emit, update, mat }
  }
  /* sillage : ruban d'écume qui suit la houle, s'élargit en V et s'efface */
  function sillage(THREE, s, tex, n) {
    const M = n || 70, pos = new Float32Array(M * 2 * 3), uv = new Float32Array(M * 2 * 2), al = new Float32Array(M * 2), idx = []
    for (let i = 0; i < M - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('aA', new THREE.BufferAttribute(al, 1)); geo.setIndex(idx)
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: tex } },
      vertexShader: 'attribute float aA;varying float vA;varying vec2 vU;void main(){vA=aA;vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform sampler2D map;varying float vA;varying vec2 vU;void main(){vec4 t=texture2D(map,vU);gl_FragColor=vec4(1.,1.,1.,t.a*vA);}' })
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 2; s.add(m)
    const T = []; let acc = 0, len = 0
    return {
      push(x, z, rx, rz, v, dt) { acc += dt; if (acc < .055) return; acc = 0; len += v * .055; T.unshift({ x, z, rx, rz, v, age: 0, u: len }); if (T.length > M) T.pop() },
      update(dt) {
        T.forEach((p) => (p.age += dt))
        for (let i = 0; i < M; i++) { const p = T[i] || T[T.length - 1]; if (!p) { al[i * 2] = al[i * 2 + 1] = 0; continue }
          const w = .5 + p.age * 1.6, a = T[i] ? Math.max(0, 1 - p.age / 3.4) * Math.min(1, p.v / 9) * .62 : 0
          for (let sd = 0; sd < 2; sd++) { const q = sd ? 1 : -1, x = p.x + p.rx * w * q, z = p.z + p.rz * w * q, y = eau(x, z, 1).y + .05, k = (i * 2 + sd) * 3
            pos[k] = x; pos[k + 1] = y; pos[k + 2] = z; uv[(i * 2 + sd) * 2] = sd; uv[(i * 2 + sd) * 2 + 1] = p.u * .08; al[i * 2 + sd] = a * (i ? 1 : 0) } }
        geo.attributes.position.needsUpdate = true; geo.attributes.uv.needsUpdate = true; geo.attributes.aA.needsUpdate = true }
    }
  }

  /* ---------------- le parcours ---------------- */
  function parcours(THREE) {
    const pts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 82 + 16 * Math.sin(a * 3 + 1.1) + 6 * Math.cos(a * 5); pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r * .86)) }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal'), LUT = curve.getSpacedPoints(600), L = curve.getLength()
    return {
      L, LUT,
      at: (u) => curve.getPointAt(((u % 1) + 1) % 1),
      tan: (u) => curve.getTangentAt(((u % 1) + 1) % 1),
      proche(x, z, u0) { // paramètre le plus proche, recherché autour du précédent
        let best = u0, bd = 1e9; const i0 = Math.round(u0 * 600)
        for (let k = -40; k <= 40; k++) { const i = (i0 + k + 600) % 600, p = LUT[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i / 600 } }
        return { u: best, d: Math.sqrt(bd) } }
    }
  }
  function bouee(THREE, cote, etape) { // cote -1 : passer à gauche (jaune ◀) ; +1 : passer à droite (rouge ▶)
    const g = new THREE.Group(), c = cote < 0 ? '#fab005' : '#e03131'
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.1, 1, 14), new THREE.MeshLambertMaterial({ color: c })); base.position.y = .3; g.add(base)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.8, 3, 14), new THREE.MeshLambertMaterial({ map: bandeTex(THREE, c, '#212529', 6) })); cone.position.y = 2.1; g.add(cone)
    const sign = new THREE.Mesh(new THREE.CircleGeometry(.95, 24), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: ctx(THREE, 128, 128, (x, w, h) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '900 80px Arial Black, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(cote < 0 ? '◀' : '▶', 64, 70) }) }))
    sign.position.y = 4.4; g.add(sign); g.userData.sign = sign
    if (etape) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .95), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: ctx(THREE, 360, 100, (x, w, h) => {
      x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.fillStyle = c; x.fillRect(0, 0, w, 8); x.fillRect(0, h - 8, w, 8)
      x.fillStyle = '#495057'; x.font = '700 24px Arial'; x.textAlign = 'center'; x.fillText(etape[0], w / 2, 36); x.fillStyle = '#212529'; x.font = '900 30px Arial Black, Arial'
      let t = etape[1], fs = 30; while (x.measureText(t).width > w - 16 && fs > 16) { fs -= 2; x.font = `900 ${fs}px Arial Black, Arial` } x.fillText(t, w / 2, 76) }) }))
      pl.position.y = 5.8; g.add(pl); g.userData.panneau = pl }
    return g
  }

  /* ---------------- HUD ---------------- */
  function hud() {
    const d = document.createElement('div'); d.id = 'jsHud'
    d.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;font-family:"Luckiest Guy","Arial Black",sans-serif;color:#ffd43b;-webkit-text-stroke:2px #3a1e00;text-shadow:3px 3px 0 #3a1e00'
    d.innerHTML = `<div id="jsTour" style="position:absolute;left:14px;top:48px;font-size:44px;font-style:italic"></div><div id="jsTemps" style="position:absolute;left:16px;top:98px;font:600 13px monospace;color:#fff;-webkit-text-stroke:0;text-shadow:1px 1px 0 #000;line-height:1.3"></div>
      <div id="jsPlace" style="position:absolute;right:16px;top:48px;font-size:52px;font-style:italic"></div>
      <canvas id="jsCompteur" width="220" height="130" style="position:absolute;right:10px;bottom:${TOUCH ? 150 : 12}px;width:190px"></canvas>
      <div id="jsMsg" style="position:absolute;left:0;right:0;top:34%;text-align:center;font-size:54px;opacity:0;transition:opacity .2s,transform .2s"></div>
      <div id="jsGouttes" style="position:absolute;inset:0"></div>
      <canvas id="jsFx" style="position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen"></canvas>
      <div id="jsSig" style="position:absolute;left:16px;top:152px;font:700 14px Arial;color:#fff;-webkit-text-stroke:0;text-shadow:1px 1px 0 #000"></div>
      <div id="jsFiche" style="position:absolute;left:16px;bottom:64px;max-width:min(520px,60%);background:rgba(255,250,240,.95);color:#212529;-webkit-text-stroke:0;text-shadow:none;font:600 14px/1.35 Arial;padding:8px 12px;border-left:6px solid #2f9e44;border-radius:6px;box-shadow:0 3px 10px rgba(0,0,0,.25);opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s"></div>`
    const f = document.getElementById('frame'); f.append(d)
    const cv = d.querySelector('#jsCompteur'), g = cv.getContext('2d'), msg = d.querySelector('#jsMsg')
    let mT = 0, fT = 0; const fiche = d.querySelector('#jsFiche'), fx = d.querySelector('#jsFx'), fg = fx.getContext('2d')
    return {
      d,
      fiche(h, ok) { fiche.innerHTML = h; fiche.style.borderLeftColor = ok ? '#2f9e44' : '#e03131'; fiche.style.opacity = 1; fiche.style.transform = 'translateY(0)'; fT = 3.2 },
      sig(n, t) { d.querySelector('#jsSig').innerHTML = `📣 Signalements : <b>${n} / ${t}</b>` },
      effets(sol, v) { // reflets du soleil dans l'objectif, lignes de vitesse
        const w = fx.clientWidth, h = fx.clientHeight; if (fx.width !== w) { fx.width = w; fx.height = h } fg.clearRect(0, 0, w, h)
        if (sol) { const sx = (sol.x * .5 + .5) * w, sy = (-sol.y * .5 + .5) * h, cx = w / 2, cy = h / 2
          const gr = fg.createRadialGradient(sx, sy, 0, sx, sy, h * .35); gr.addColorStop(0, 'rgba(255,245,210,.55)'); gr.addColorStop(1, 'rgba(255,245,210,0)'); fg.fillStyle = gr; fg.fillRect(0, 0, w, h)
          ;[[.35, .05, '255,214,165'], [.7, .03, '165,216,255'], [1.25, .07, '178,242,187'], [1.6, .02, '255,255,255'], [1.9, .045, '255,190,120']].forEach(([k, r, c]) => { const x = sx + (cx - sx) * k, y = sy + (cy - sy) * k, rr = h * r
            const g2 = fg.createRadialGradient(x, y, 0, x, y, rr); g2.addColorStop(0, `rgba(${c},.28)`); g2.addColorStop(.7, `rgba(${c},.12)`); g2.addColorStop(1, `rgba(${c},0)`); fg.fillStyle = g2; fg.beginPath(); fg.arc(x, y, rr, 0, 7); fg.fill() }) }
        if (v > 13) { const a = Math.min(.3, (v - 13) / 20), cx = w / 2, cy = h * .45; fg.strokeStyle = `rgba(255,255,255,${a})`; fg.lineWidth = 2
          for (let i = 0; i < 26; i++) { const an = Math.random() * Math.PI * 2, r0 = h * (.42 + Math.random() * .2), r1 = r0 + h * (.12 + Math.random() * .2); fg.beginPath(); fg.moveTo(cx + Math.cos(an) * r0 * 1.6, cy + Math.sin(an) * r0); fg.lineTo(cx + Math.cos(an) * r1 * 1.6, cy + Math.sin(an) * r1); fg.stroke() } } },
      tour(t, n) { d.querySelector('#jsTour').innerHTML = `${t}<span style="font-size:.6em">/${n}</span>` },
      place(p, n) { d.querySelector('#jsPlace').innerHTML = `${p}<span style="font-size:.55em">/${n}</span>` },
      temps(h) { d.querySelector('#jsTemps').innerHTML = h },
      msg(t, c, dur) { msg.textContent = t; msg.style.color = c || '#ffd43b'; msg.style.opacity = 1; msg.style.transform = 'scale(1.15)'; setTimeout(() => (msg.style.transform = 'scale(1)'), 90); mT = dur || 1.2 },
      tick(dt) { if (mT > 0) { mT -= dt; if (mT <= 0) msg.style.opacity = 0 } if (fT > 0) { fT -= dt; if (fT <= 0) { fiche.style.opacity = 0; fiche.style.transform = 'translateY(8px)' } } },
      compteur(kmh, pw) { g.clearRect(0, 0, 220, 130); const cx = 110, cy = 112, R = 88
        g.lineWidth = 16; g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(cx, cy, R, Math.PI, 2 * Math.PI); g.stroke()
        const k = Math.min(1, kmh / 90), gr = g.createLinearGradient(20, 0, 200, 0); gr.addColorStop(0, '#40c057'); gr.addColorStop(.55, '#fab005'); gr.addColorStop(1, '#e03131')
        g.strokeStyle = gr; g.beginPath(); g.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * k); g.stroke()
        g.font = 'italic 34px "Luckiest Guy","Arial Black"'; g.textAlign = 'right'; g.lineWidth = 5; g.strokeStyle = '#3a1e00'; g.fillStyle = '#ffd43b'; const t = `${Math.round(kmh)} KM/H`; g.strokeText(t, 200, 118); g.fillText(t, 200, 118)
        for (let i = 0; i < 5; i++) { g.fillStyle = i < pw ? '#ffd43b' : 'rgba(0,0,0,.35)'; g.strokeStyle = '#3a1e00'; g.lineWidth = 3; g.beginPath(); g.rect(40 + i * 22, 62, 16, 16); g.fill(); g.stroke() } },
      gouttes(n) { const G2 = d.querySelector('#jsGouttes'); for (let i = 0; i < n; i++) { const e = document.createElement('div'), s = 14 + Math.random() * 46
        e.style.cssText = `position:absolute;left:${Math.random() * 96}%;top:${Math.random() * 90}%;width:${s}px;height:${s * 1.15}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.75),rgba(200,240,255,.18) 45%,rgba(255,255,255,.05) 70%);box-shadow:inset -2px -3px 5px rgba(0,60,80,.25);transition:opacity 1.6s,transform 1.6s;opacity:.95`
        G2.append(e); requestAnimationFrame(() => { e.style.opacity = 0; e.style.transform = `translateY(${20 + Math.random() * 40}px)` }); setTimeout(() => e.remove(), 1700) } },
      remove() { d.remove() }
    }
  }

  /* ================================= la course ================================= */
  function course(n, cfg) {
    cfg = cfg || {}
    return new Promise(async (res) => {
      const THREE = window.THREE, room = cur, V = (x, y, z) => new THREE.Vector3(x, y, z)
      try { await Promise.race([typeof preloadToons === 'function' ? preloadToons() : 0, new Promise((r) => setTimeout(r, 5000))]) } catch (e) {}
      const PAL = { sun: V(.55, .52, -.65).normalize(), sunC: '#fff4d6', skyT: '#3d8fe0', skyH: '#cfeefa', deep: '#0b5d82', shal: '#20b8b4', sss: '#3fe6c8', fog: '#bfe6f3' }
      const s = new THREE.Scene(); s.fog = new THREE.Fog(PAL.fog, 140, 390); s.background = new THREE.Color(PAL.skyH)
      s.add(new THREE.HemisphereLight('#dff3ff', '#2f6f5a', .85)); const sun = new THREE.DirectionalLight('#fff1d6', .75); sun.position.copy(PAL.sun).multiplyScalar(100); s.add(sun)
      const sky = new THREE.Mesh(new THREE.SphereGeometry(360, 32, 16), cielMat(THREE, PAL)); sky.renderOrder = -1; sky.frustumCulled = false; s.add(sky)
      const mer = new THREE.Mesh(merGeo(THREE), merMat(THREE, PAL)); mer.frustumCulled = false; s.add(mer)
      const H = ile(THREE, s), C = parcours(THREE), D = decor(THREE, s, C, H)
      const SP = embruns(THREE, s), BR = embruns(THREE, s, .22, true), foamT = ecumeTex(THREE); foamT.wrapS = foamT.wrapT = THREE.RepeatWrapping
      const NBq = cfg.bouees || 14
      /* tremplins flottants : de vrais sauts, pour la pénétration et le rebond à l'arrivée */
      const RAMPES = [(3 + .1) / NBq, (10 + .1) / NBq].map((u) => { const p = C.at(u), t = C.tan(u), L = 7, Wd = 4.6, Hm = 1.7
        const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = Math.atan2(-t.z, t.x); s.add(g)
        const sh = new THREE.Shape(); sh.moveTo(0, -.3); sh.lineTo(L, Hm - .3); sh.lineTo(L, -.3); sh.closePath()
        const geo = new THREE.ExtrudeGeometry(sh, { depth: Wd, bevelEnabled: false }); geo.translate(-L / 2, 0, -Wd / 2)
        const tx = ctx(THREE, 256, 128, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#ff7a1a'; x.fillRect(i * w / 8, 0, w / 8, h) } x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, h - 10, w, 10) })
        const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: tx, shininess: 40 })); g.add(m)
        ;[-1, 1].forEach((q) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, L + .6, 12), new THREE.MeshPhongMaterial({ color: '#1c7ed6', shininess: 60 })); f.rotation.z = Math.PI / 2; f.position.set(0, -.25, q * (Wd / 2 + .1)); g.add(f) })
        const lbl = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .7), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: ctx(THREE, 256, 50, (x, w, h) => { x.fillStyle = '#1c3faa'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = 'italic 900 30px Arial Black, Arial'; x.textAlign = 'center'; x.fillText('TALAS · §10', w / 2, 36) }) }))
        lbl.position.set(L / 2 + .02, Hm * .45, 0); lbl.rotation.y = Math.PI / 2; g.add(lbl)
        return { x0: p.x - t.x * L / 2, z0: p.z - t.z * L / 2, dx: t.x, dz: t.z, L, Wd, Hm, pente: Hm / L } })
      const rampe = (x, z) => { for (const r of RAMPES) { const sx = (x - r.x0) * r.dx + (z - r.z0) * r.dz, lx = (x - r.x0) * -r.dz + (z - r.z0) * r.dx; if (sx >= 0 && sx <= r.L && Math.abs(lx) <= r.Wd / 2) return { y: -.3 + r.Hm * sx / r.L, r } } return null }
      /* ombres portées sur l'eau (on voit la hauteur des sauts) et anneaux d'écume à l'atterrissage */
      const ombreT = ctx(THREE, 64, 64, (x, w, h) => { const g2 = x.createRadialGradient(32, 32, 0, 32, 32, 32); g2.addColorStop(0, 'rgba(0,30,45,.55)'); g2.addColorStop(1, 'rgba(0,30,45,0)'); x.fillStyle = g2; x.fillRect(0, 0, w, h) })
      const ombre = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.6), new THREE.MeshBasicMaterial({ map: ombreT, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; s.add(m); return m }
      const ANN = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1.35, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; s.add(m); return { m, t: 9 } })
      let annI = 0; const anneau = (x, z, k) => { const a = ANN[annI++ % ANN.length]; a.t = 0; a.k = k; a.x = x; a.z = z }
      /* mouettes au-dessus de l'île */
      const MOU = [0, 1, 2, 3, 4, 5].map((i) => { const g = new THREE.Group(), wm = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })
        const ail = [-1, 1].map((q) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(.9, .28), wm); w.geometry.translate(q * .45, 0, 0); g.add(w); return w })
        const b = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), wm); b.scale.set(1, .8, 2.2); g.add(b); s.add(g); return { g, ail, r: 30 + i * 6, h: 18 + (i % 3) * 4, ph: i * 1.3, sp: .25 + (i % 2) * .08 } })
      /* signalements à ramasser (§10.2 : tout remonter) */
      const SIG = SIGNALEMENTS.map(([t, fb], i) => { const u = (i * 2 + 1.35) / (NBq), p = C.at(u), tn = C.tan(u), lat = (i % 2 ? 2.5 : -2.5), g = new THREE.Group()
        const fut = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.2, 16), new THREE.MeshPhongMaterial({ color: '#ff922b', shininess: 60 })); fut.position.y = .3; g.add(fut)
        ;[.05, .55].forEach((y) => { const c2 = new THREE.Mesh(new THREE.CylinderGeometry(.57, .57, .1, 16), new THREE.MeshPhongMaterial({ color: '#ffffff' })); c2.position.y = y; g.add(c2) })
        const lb = new THREE.Mesh(new THREE.PlaneGeometry(3, .7), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, map: ctx(THREE, 300, 70, (x, w, h) => { x.fillStyle = 'rgba(255,146,43,.95)'; x.beginPath(); x.roundRect ? x.roundRect(0, 0, w, h, 14) : x.rect(0, 0, w, h); x.fill(); x.fillStyle = '#fff'; x.font = '900 26px Arial Black, Arial'; x.textAlign = 'center'; let fs = 26; while (x.measureText('📣 ' + t).width > w - 12 && fs > 14) { fs -= 2; x.font = `900 ${fs}px Arial Black, Arial` } x.fillText('📣 ' + t, w / 2, 45) }) }))
        lb.position.y = 1.9; g.add(lb); s.add(g); return { g, lb, t, fb, x: p.x + -tn.z * lat, z: p.z + tn.x * lat, pris: false } })
      let nSig = 0

      /* bouées : alternées, du côté extérieur ou intérieur de la trajectoire */
      const NB = NBq, B = []
      for (let i = 0; i < NB; i++) { const u = (i + .6) / NB, p = C.at(u), t = C.tan(u), nx = -t.z, nz = t.x, side = (i * 7 + 3) % 5 < 2 ? 1 : -1, off = 6.5
        const bx = p.x + nx * off * side, bz = p.z + nz * off * side, cote = side > 0 ? 1 : -1 // bouée à gauche de la trajectoire (côté +n) -> on passe à sa droite (▶)
        const et = ETAPES[i % ETAPES.length], m = bouee(THREE, cote, et); m.position.set(bx, 0, bz); s.add(m); B.push({ u, x: bx, z: bz, cote, m, lat: off * side, et, vu: 0 }) }
      const fleche = new THREE.Mesh(new THREE.ConeGeometry(.9, 1.8, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); fleche.rotation.z = Math.PI; s.add(fleche)

      /* concurrents et joueur */
      const coureurs = [
        { nom: 'Dylan', joueur: true, jet: jetski(THREE, ['#1c7ed6', '#ffd43b'], pilote('dylan')) },
        { nom: 'Neila', jet: jetski(THREE, ['#e64980', '#ffffff'], pilote('worker', { shirt: '#f783ac', sleeve: '#f783ac' })), skill: 1.02, lane: 1.4 },
        { nom: 'Eliott', jet: jetski(THREE, ['#2f9e44', '#ffffff'], pilote('worker', { shirt: '#9775fa', sleeve: '#9775fa' })), skill: .97, lane: -1.8 },
        { nom: 'Mathieu', jet: jetski(THREE, ['#e8590c', '#ffffff'], pilote('worker', { shirt: '#ffa94d', sleeve: '#ffa94d' })), skill: .93, lane: .3 }
      ]
      const P0 = C.at(0), T0 = C.tan(0)
      coureurs.forEach((c, i) => { s.add(c.jet); c.ombre = ombre(); c.wake = sillage(THREE, s, foamT); c.lap = 0; c.u = 0; c.prog = 0; c.fini = false; c.half = false
        const lat = (i - 1.5) * 3.2, back = 4 + (i % 2) * 3; c.x = P0.x - T0.x * back + (-T0.z) * lat; c.z = P0.z - T0.z * back + T0.x * lat; c.yaw = Math.atan2(T0.x, T0.z); c.v = 0; c.bu = 0; c.miss = 0; c.ok = 0 })
      const me = coureurs[0]; me.y = -.1
      /* état physique du joueur */
      const S = { y: -.1, vy: 0, vx: 0, vz: 0, pitch: 0, roll: 0, wp: 0, wr: 0, yaw: me.yaw, wet: true, air: 0, power: 1, steer: 0, dive: 0, boost: 0 }
      J.etat = { S, me, coureurs, B }
      const FLOT = [[0, -.18, 1.25, .9], [0, -.22, -1.15, 1.25], [-.5, -.22, -.05, .95], [.5, -.22, -.05, .95]] // x, y, z locaux, poids
      const LAPS = cfg.tours || 3
      const H2 = hud(); H2.tour(1, LAPS); H2.place(1, 4); H2.sig(0, SIGNALEMENTS.length)

      /* monde du jeu */
      let T = 0, go = false, pause = false, fin = false, chrono = 0, tours = [], shake = 0, lastLand = 0
      const camP = V(me.x - Math.sin(me.yaw) * 8, 3.5, me.z - Math.cos(me.yaw) * 8), camL = V(me.x, 1, me.z)
      const W = { scene: s, hd: 1, plainui: 1, keys: 1, noOff: 1, look: V(0, 0, 0), baseD: 1, fitW: 1, fov: 62 }
      W.cam = (dt) => {
        const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), v = Math.hypot(S.vx, S.vz)
        const want = V(me.x - fx * (5.2 + v * .04), me.y + 2.3 + Math.min(1.2, Math.max(0, S.vy) * .1), me.z - fz * (5.2 + v * .04))
        const w = eau(want.x, want.z, 1); want.y = Math.max(want.y, w.y + 1.1)
        camP.lerp(want, 1 - Math.pow(.02, dt || .016)); camL.lerp(V(me.x + fx * 5, me.y + .7, me.z + fz * 5), 1 - Math.pow(.001, dt || .016))
        camera.position.copy(camP); if (shake > 0) camera.position.add(V((Math.random() - .5) * shake, (Math.random() - .5) * shake, 0)); camera.lookAt(camL)
        camera.fov = 60 + Math.min(10, v * .4); camera.updateProjectionMatrix()
        sky.position.copy(camera.position); CX = camera.position.x; CZ = camera.position.z
        mer.material.uniforms.uC.value.set(Math.round(camera.position.x / 2) * 2, 0, Math.round(camera.position.z / 2) * 2)
      }
      const place = () => { const r = [...coureurs].sort((a, b) => (b.lap + b.prog) - (a.lap + a.prog)); return r.indexOf(me) + 1 }

      /* le joueur : flotteurs, poussée, dérive, pénétration et rebond */
      function physique(dt, emet) {
        const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), rx = fz, rz = -fx // (rx, rz) = flanc gauche (+x local) : la caméra regarde vers +f
        const v = Math.hypot(S.vx, S.vz), vf = S.vx * fx + S.vz * fz
        const cp = Math.cos(S.pitch), sp = Math.sin(S.pitch), cr = Math.cos(S.roll), sr = Math.sin(S.roll)
        let fy = 0, tp = 0, tr = 0, wet = 0, stern = 0, nx = 0, nz = 0, maxDepth = 0
        FLOT.forEach(([lx, ly, lz, wgt], i) => {
          const dly = i === 0 ? ly - S.dive * .55 : ly
          const y1 = dly * cr + lx * sr, x1 = lx * cr - dly * sr // roulis
          const y2 = y1 * cp + lz * sp, z2 = lz * cp - y1 * sp // tangage (proue qui monte : pitch > 0)
          const wx = me.x + rx * x1 + fx * z2, wz = me.z + rz * x1 + fz * z2, wy = me.y + y2
          const w = eau(wx, wz), depth = w.y - wy
          if (depth > 0) {
            const vPt = S.vy + S.wp * lz - S.wr * lx // vitesse verticale du flotteur
            const lift = 1 + Math.min(1.2, Math.max(0, vf) / 14) * (i === 1 ? 1.3 : .6) // déjaugeage : la coque monte avec la vitesse
            const F = wgt * (13.5 * Math.min(depth, 1.4) * lift - 2.6 * vPt * Math.min(1, depth * 3))
            fy += F; tp += F * lz; tr += F * lx; wet++; if (i === 1) stern = 1; nx += w.nx; nz += w.nz; maxDepth = Math.max(maxDepth, depth) }
        })
        /* tremplin : la coque suit la pente puis s'envole au bout */
        const rp = rampe(me.x, me.z)
        if (rp && me.y < rp.y + .45) { me.y = rp.y + .45; S.vy = Math.max(S.vy, Math.max(0, vf) * rp.r.pente); S.wp += (Math.atan(rp.r.pente) - S.pitch) * 12 * dt; wet = 0; S.air = Math.max(S.air, .3); S.surRampe = 1 } else S.surRampe = 0
        const wasAir = !S.wet; S.wet = wet > 0
        // atterrissage : la coque s'enfonce (pénétration), gerbe proportionnelle à la vitesse d'impact
        if (wasAir && S.wet && S.air > .25) {
          const imp = -S.vy; lastLand = T
          tsAdd('jet_vol', +S.air.toFixed(2)); tsAdd('jet_eau', +(imp * .6).toFixed(1)) // secondes de vol, litres d'eau avalés à l'impact
          const nose = -S.pitch
          const n = Math.min(260, 40 + imp * 26)
          for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, r = Math.random(); SP.emit(me.x + Math.cos(a) * r * 1.4, me.y, me.z + Math.sin(a) * r * 1.4, Math.cos(a) * (2 + imp * .6) * Math.random() + S.vx * .3, 2 + imp * .9 * Math.random(), Math.sin(a) * (2 + imp * .6) * Math.random() + S.vz * .3, .7 + Math.random() * .6, .12 + Math.random() * .18) }
          shake = Math.min(.5, imp * .05); try { beep(110 + Math.random() * 30, .18, 'sawtooth', .05) } catch (e) {}
          anneau(me.x, me.z, Math.min(2.5, .8 + imp * .18)); for (let k = 0; k < 14; k++) BR.emit(me.x + (Math.random() - .5) * 2, me.y + .2, me.z + (Math.random() - .5) * 2, (Math.random() - .5) * 3, 1 + Math.random() * 2, (Math.random() - .5) * 3, 1.3, .7)
          if (imp > 6) H2.gouttes(Math.round(imp))
          if (nose > .45 && imp > 5) { S.vx *= .55; S.vz *= .55; H2.msg('PLONGEON !', '#74c0fc', .9); tsAdd('jet_plongeon') } else if (imp > 7) H2.msg('SPLASH !', '#ffffff', .6)
          S.air = 0 }
        if (!S.wet) S.air += dt
        fy -= G; S.vy += fy * dt
        S.wp += (tp * 1.9 - S.wp * (S.wet ? 2.2 : .35)) * dt; S.wr += (tr * 3.2 - S.wr * (S.wet ? 3 : .5)) * dt
        if (!S.wet) S.wp += (-.18 - S.pitch) * 1.2 * dt // en l'air, la proue redescend doucement
        // commandes
        const au = J.auto, st = au ? autoSteer() : (KEYS.R ? 1 : 0) - (KEYS.L ? 1 : 0)
        S.steer += (st - S.steer) * Math.min(1, dt * 7)
        S.dive = Math.max(0, Math.min(1, S.dive + ((KEYS.D && !au) ? 1 : -1) * dt * 4))
        const vmax = 15.5 + S.power * 1.1 + S.boost
        if (S.wet && stern && go) { const a = 13 * (1 - Math.max(0, vf) / vmax) * (1 - S.dive * .3); S.vx += fx * a * dt; S.vz += fz * a * dt }
        if (S.wet) {
          const lat = S.vx * rx + S.vz * rz, grip = 3.4 - Math.abs(S.steer) * 1.2
          S.vx -= rx * lat * Math.min(1, grip * dt); S.vz -= rz * lat * Math.min(1, grip * dt) // la dérive
          const drag = .3 + maxDepth * 1.2 + S.dive * .5; S.vx *= 1 - drag * dt * .2; S.vz *= 1 - drag * dt * .2
          S.vx += nx / wet * G * .35 * dt; S.vz += nz / wet * G * .35 * dt // on glisse dans la pente de la vague
          S.yaw -= S.steer * 1.55 * (.35 + .65 * Math.min(1, v / 9)) * dt // steer > 0 : virage à droite (yaw décroît)
          S.wr += ((S.steer * .5 * Math.min(1, v / 10)) - S.roll) * 5 * dt // on se penche dans le virage (roulis > 0 : flanc gauche levé)
          if (emet && Math.abs(S.steer) > .5 && v > 8) for (let k = 0; k < 2; k++) { const q = S.steer > 0 ? 1 : -1; // gerbe du côté extérieur du virage
 SP.emit(me.x - fx * .8 + rx * q * .6, me.y, me.z - fz * .8 + rz * q * .6, rx * q * (3 + v * .25) + S.vx * .4, 2.5 + Math.random() * 3, rz * q * (3 + v * .25) + S.vz * .4, .6, .12 + Math.random() * .12) }
        } else S.yaw -= S.steer * .3 * dt
        me.x += S.vx * dt; me.z += S.vz * dt; me.y += S.vy * dt; S.pitch += S.wp * dt; S.roll += S.wr * dt
        S.pitch = Math.max(-.9, Math.min(.9, S.pitch)); S.roll = Math.max(-.8, Math.min(.8, S.roll))
        // l'île : on ne monte pas sur la plage
        const r = Math.hypot(me.x, me.z), hi = H(me.x, me.z); if (hi > -.2 && !S.plage && go) { S.plage = 1; tsAdd('jet_plage'); H2.msg('ÉCHOUAGE !', '#ffe066', .8) } if (hi < -.8) S.plage = 0; if (hi > -.2) { const k = (r + .01), ox = me.x / k, oz = me.z / k; me.x += ox * .8; me.z += oz * .8; const vn = S.vx * ox + S.vz * oz; if (vn < 0) { S.vx -= ox * vn * 1.6; S.vz -= oz * vn * 1.6 } S.vx *= .96; S.vz *= .96 }
        me.v = v; me.yaw = S.yaw
        // panache arrière et gerbes de proue
        if (emet && S.wet && v > 3) { const n2 = Math.round(v * .22)
          for (let k = 0; k < n2; k++) SP.emit(me.x - fx * 1.4 + (Math.random() - .5) * .3, me.y - .1, me.z - fz * 1.4 + (Math.random() - .5) * .3, -fx * v * .22 + (Math.random() - .5) * 1.4, 2 + v * .22 * Math.random() + 1, -fz * v * .22 + (Math.random() - .5) * 1.4, .45 + Math.random() * .4, .1 + Math.random() * .14)
          if (Math.random() < v * .03) BR.emit(me.x - fx * 1.8, me.y + .4, me.z - fz * 1.8, -fx * v * .12, 1.5 + Math.random(), -fz * v * .12, 1.1, .55)
          if (v > 7) for (let k = 0; k < 2; k++) { const q = k ? 1 : -1; SP.emit(me.x + fx * 1.1 + rx * q * .5, me.y, me.z + fz * 1.1 + rz * q * .5, rx * q * (1.5 + v * .12) + S.vx * .7, 1.2 + Math.random() * 1.8, rz * q * (1.5 + v * .12) + S.vz * .7, .45, .08 + Math.random() * .08) }
          if (S.dive > .5) for (let k = 0; k < 6; k++) SP.emit(me.x + fx * 1.4, me.y + .3, me.z + fz * 1.4, S.vx * .6 + (Math.random() - .5) * 3, 3 + Math.random() * 4, S.vz * .6 + (Math.random() - .5) * 3, .6, .4) }
      }
      function autoSteer() { // pilote automatique (comptes rendus) : vise le bon côté de la prochaine bouée
        const b = B[me.bu % NB], t = C.tan(b.u), nx = -t.z, nz = t.x
        let tx = b.x + nx * -b.cote * 3.4 + t.x * 2, tz = b.z + nz * -b.cote * 3.4 + t.z * 2
        for (const r of RAMPES) { const sx = (me.x - r.x0) * r.dx + (me.z - r.z0) * r.dz, lx = (me.x - r.x0) * -r.dz + (me.z - r.z0) * r.dx; if (sx > -40 && sx < r.L && Math.abs(lx) < 14) { tx = r.x0 + r.dx * (r.L + 4); tz = r.z0 + r.dz * (r.L + 4) } } // un tremplin devant : on le prend
        const want = Math.atan2(tx - me.x, tz - me.z); let d = want - S.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
        return Math.max(-1, Math.min(1, -d * 2.2))
      }
      /* bouées : on vérifie le côté au moment où l'on franchit la ligne de la bouée */
      function bouees(c, joueur) {
        const b = B[c.bu % NB], t = C.tan(b.u), rel = (c.x - b.x) * t.x + (c.z - b.z) * t.z
        if (rel > 0 && rel < 12) {
          const lat = (c.x - b.x) * -t.z + (c.z - b.z) * t.x // > 0 : on est à gauche de la bouée (sens de la course)
          const ok = Math.abs(lat) < 28 && (b.cote < 0 ? lat > 0 : lat < 0)
          c.bu++; if (ok) c.ok++; else c.miss++
          if (joueur) { b.vu = ok ? 1 : -1; H2.fiche(`${ok ? '✔' : '✘ Étape sautée :'} <b>${b.et[0]} · ${b.et[1]}</b><br>${b.et[2]}`, ok); if (ok) { const av = S.power; S.power = Math.min(5, S.power + 1); tsAdd('bouees'); H2.msg(S.power >= 5 && av < 5 ? 'PUISSANCE MAX !' : 'BOUÉE !', '#ffd43b', .8); try { beep(880, .08, 'square', .05) } catch (e) {} }
            else { S.power = 0; tsAdd('jet_ecarts'); H2.msg('ÉCART !', '#ff6b6b', 1); try { beep(160, .25, 'sawtooth', .06) } catch (e) {}; ecartsTour++ } }
        }
      }
      let ecartsTour = 0, bonnes = 0

      /* concurrents : suivent le parcours, flottent sur la houle, ratent parfois une bouée */
      function ia(c, dt) {
        if (!go || c.fini) return
        const cu = C.proche(c.x, c.z, c.u).u
        const lead = (c.lap + c.prog) - (me.lap + me.prog), rubber = lead > .03 ? .88 : lead < -.08 ? 1.08 : 1
        const vt = (12.6 + 1.4 * Math.sin(T * .3 + c.lane)) * c.skill * rubber
        c.v += (vt - c.v) * dt * .8
        const b = B[c.bu % NB], bt = C.tan(b.u), side = b.cote < 0 ? 1 : -1, near = Math.abs(C.proche(b.x, b.z, cu).u - cu) < .03
        const la = C.at(cu + 12 / C.L), latT = near ? b.lat + side * 3.5 + (c.miss < 1 && Math.sin(c.lane * 9 + c.bu) > .85 ? -side * 8 : 0) : c.lane
        const tx = la.x + -bt.z * latT * .6, tz = la.z + bt.x * latT * .6
        let d = Math.atan2(tx - c.x, tz - c.z) - c.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
        c.yaw += Math.max(-1.4, Math.min(1.4, d * 2)) * dt; c.x += Math.sin(c.yaw) * c.v * dt; c.z += Math.cos(c.yaw) * c.v * dt
        const w = eau(c.x, c.z), rp = rampe(c.x, c.z); c.nx = w.nx; c.nz = w.nz
        if (c.y === undefined) c.y = w.y
        if (rp && c.y < rp.y + .45) { c.y = rp.y + .45; c.vy = c.v * rp.r.pente; c.air = 1 }
        else if (c.air) { c.vy -= G * dt; c.y += c.vy * dt; if (c.y < w.y - .12) { c.air = 0; anneau(c.x, c.z, 1.2); for (let k = 0; k < 40; k++) { const a = Math.random() * 6.3; SP.emit(c.x, w.y, c.z, Math.cos(a) * 3 * Math.random(), 2 + Math.random() * 4, Math.sin(a) * 3 * Math.random(), .8, .15) } } }
        else c.y = c.y + (w.y - .12 - c.y) * Math.min(1, dt * 6)
        c.steer = Math.max(-1, Math.min(1, d * 2))
        if (Math.random() < c.v * dt * .9) { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); SP.emit(c.x - fx * 1.4, c.y, c.z - fz * 1.4, -fx * c.v * .18, 3 + Math.random() * 3, -fz * c.v * .18, .5, .14) }
      }
      function progres(c) {
        const r = C.proche(c.x, c.z, c.u), du = r.u - c.u
        if (du < -.5 && c.half) { c.lap++; c.half = false; if (c === me) finTour() } else if (du > .5) {} // demi-tour : on ignore
        if (r.u > .45 && r.u < .55) c.half = true
        c.u = r.u; c.prog = r.u
        if (c.lap >= LAPS && !c.fini) { c.fini = true; c.rang = coureurs.filter((o) => o.fini).length }
      }
      /* fin de tour : écarts, action corrective (§10.2), nouveau tour pour s'améliorer (§10.3) */
      const tire = (l) => l[Math.floor(Math.random() * l.length)]
      const ecartsParTour = []
      const QUESTIONS = cfg.questions || [Object.assign({}, tire(BANQUE.cause)), Object.assign({}, tire(BANQUE.efficacite))].map((Q, i) => { const txt = Q.q; return Object.assign(Q, { q: (e) => `Tour ${i + 1} terminé : <b>${e} écart${e > 1 ? 's' : ''}</b> (bouées manquées)${i ? ` contre ${ecartsParTour[0]} au tour 1` : ''}. ${txt}` }) })
      const _ANCIENNES = [
        { q: e => `Tour 1 terminé : <b>${e} écart${e > 1 ? 's' : ''}</b> (bouées manquées). Que fais-tu avant le tour 2 ?`, opts: [['Je cherche la cause : j’arrive trop vite et trop large sur les bouées, je ralentis avant et je prends la corde', 1], ['C’est la faute du jet-ski, je n’y peux rien', 0], ['Je fais pareil, ça passera bien', 0]], fb: '§10.2 : on réagit à l’écart, on en analyse la cause et on met en œuvre l’action qui l’élimine.' },
        { q: e => `Tour 2 terminé : <b>${e} écart${e > 1 ? 's' : ''}</b>. Ton action corrective a-t-elle marché ?`, opts: [['Je compare au tour 1 : je vérifie l’efficacité de l’action, puis je vise encore mieux', 1], ['Je ne mesure rien, l’important c’est d’avoir fait une action', 0], ['J’ai fini un tour, j’arrête de chercher à progresser', 0]], fb: '§10.2 et §10.3 : on vérifie l’efficacité des actions, et l’amélioration continue ne s’arrête jamais.' }
      ]
      async function finTour() {
        const tt = chrono - tours.reduce((a, b) => a + b, 0); tours.push(tt)
        if (me.lap >= LAPS) { ecartsParTour.push(ecartsTour); return }
        const Q = QUESTIONS[me.lap - 1]; if (!Q) return
        pause = true; const e = ecartsTour; ecartsTour = 0; ecartsParTour.push(e)
        const opts = Q.opts.map(([t, ok], i) => ({ t, v: i, ok })).sort(() => Math.random() - .5)
        const ch = await say('boulon', Q.q(e), { btns: opts.map((o) => ({ t: o.t, v: o.v })), grid: false })
        const good = Q.opts[ch] && Q.opts[ch][1]; pts(n, !!good); if (good) { bonnes++; S.power = Math.min(5, S.power + 2); S.boost = 1.2 }
        await say('boulon', `${good ? '✔ Bien vu. Puissance +2 pour le tour suivant.' : '✘ Pas vraiment.'} ${Q.fb}`, { cls: good ? 'good' : 'bad' })
        hidePanel(); pause = false; H2.tour(me.lap + 1, LAPS); H2.msg(`TOUR ${me.lap + 1}`, '#ffd43b', 1.2)
      }
      const fmt = (t) => `${Math.floor(t / 60)}'${(t % 60).toFixed(2).padStart(5, '0')}"`

      W.update = (dt) => {
        H2.tick(dt); shake = Math.max(0, shake - dt * 1.2)
        if (pause) return
        T += dt; TT = T; mer.material.uniforms.uT.value = T; sky.material.uniforms.uT.value = T
        if (go && !fin) chrono += dt
        const sub = 4, h = dt / sub
        for (let k = 0; k < sub; k++) { if (fin) { S.vx *= 1 - h; S.vz *= 1 - h } physique(h, k === 0) }
        coureurs.forEach((c) => { if (!c.joueur) ia(c, dt); if (go) { progres(c); bouees(c, c.joueur) } })
        SP.update(dt); BR.update(dt)
        coureurs.forEach((c) => { const x = c.joueur ? me.x : c.x, z = c.joueur ? me.z : c.z, y = c.joueur ? me.y : c.y, w = eau(x, z, 1), alt = Math.max(0, y - w.y)
          c.ombre.position.set(x, w.y + .06, z); c.ombre.rotation.z = -(c.joueur ? S.yaw : c.yaw); c.ombre.scale.setScalar(1 + alt * .25); c.ombre.material.opacity = Math.max(0, 1 - alt / 7) })
        ANN.forEach((a) => { a.t += dt; const k = a.t / 1.4; if (k >= 1) { a.m.visible = false; return } a.m.visible = true; const w = eau(a.x, a.z, 1); a.m.position.set(a.x, w.y + .07, a.z); a.m.scale.setScalar(a.k * (1 + k * 3.2)); a.m.material.opacity = (1 - k) * .75 })
        MOU.forEach((m) => { const a = T * m.sp + m.ph; m.g.position.set(Math.cos(a) * m.r, m.h + Math.sin(T * .7 + m.ph) * 1.5, Math.sin(a) * m.r); m.g.rotation.set(0, -a, .35); const f = Math.sin(T * 9 + m.ph) * .6; m.ail[0].rotation.z = f; m.ail[1].rotation.z = -f })
        SIG.forEach((g) => { if (g.pris) return; const w = eau(g.x, g.z); g.g.position.set(g.x, w.y - .2, g.z); g.g.rotation.x = w.nz * .5; g.g.rotation.z = -w.nx * .5; g.lb.lookAt(camera.position)
          if (Math.hypot(me.x - g.x, me.z - g.z) < 2.6 && go) { g.pris = true; s.remove(g.g); nSig++; tsAdd('signalements'); H2.sig(nSig, SIG.length); H2.msg('SIGNALÉ !', '#ff922b', .9); H2.fiche(`📣 <b>${g.t}</b><br>${g.fb}`, true); S.boost = Math.min(2.5, S.boost + .8)
            for (let k = 0; k < 30; k++) SP.emit(g.x, w.y + .5, g.z, (Math.random() - .5) * 5, 2 + Math.random() * 4, (Math.random() - .5) * 5, .7, .16); try { beep(1175, .1, 'triangle', .05) } catch (e) {} } })
        if (Math.random() < dt * 6) { const a = S.yaw + (Math.random() - .5) * 1.6, d = 10 + Math.random() * 30, x = me.x + Math.sin(a) * d, z = me.z + Math.cos(a) * d, w = eau(x, z, 1) // moutons : les crêtes éclatent
          if (w.crete < .5) for (let k = 0; k < 10; k++) SP.emit(x, w.y, z, (Math.random() - .5) * 1.5 + .9, 1 + Math.random() * 2, (Math.random() - .5) * 1.5 + .3, .6, .12) }
        { const sv = camera.position.clone().add(PAL.sun.clone().multiplyScalar(300)).project(camera); H2.effets(sv.z < 1 && Math.abs(sv.x) < 1.3 && Math.abs(sv.y) < 1.3 ? sv : null, me.v) }
        // poses et sillages
        coureurs.forEach((c) => {
          const j = c.jet, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw)
          if (c.joueur) { j.position.set(me.x, me.y, me.z); j.rotation.set(-S.pitch, S.yaw, S.roll, 'YXZ') }
          else { j.position.set(c.x, c.y + Math.sin(T * 7 + c.lane) * .03, c.z); const px = c.nx * fx + c.nz * fz, rl = c.nx * fz - c.nz * fx; j.rotation.set(Math.asin(Math.max(-.6, Math.min(.6, px))) * -1 + .05, c.yaw, Math.asin(Math.max(-.6, Math.min(.6, rl))) - (c.steer || 0) * .3, 'YXZ') }
          const r = j.userData.rider; if (r && r.userData.rig && r.userData.rig.up) r.userData.rig.up.rotation.z = c.joueur ? S.steer * .35 : -(c.steer || 0) * .35
          if ((c.joueur ? S.wet : true)) c.wake.push(c.joueur ? me.x - fx * 1.2 : c.x - fx * 1.2, c.joueur ? me.z - fz * 1.2 : c.z - fz * 1.2, fz, -fx, c.joueur ? me.v : c.v, dt)
          c.wake.update(dt) })
        // bouées : elles dansent sur la houle ; flèche au-dessus de la prochaine
        B.forEach((b, i) => { const w = eau(b.x, b.z); b.m.position.y = w.y - .15; b.m.rotation.x = w.nz * .6; b.m.rotation.z = -w.nx * .6; b.m.userData.sign.lookAt(camera.position) })
        const nb = B[me.bu % NB]; fleche.position.set(nb.x, nb.m.position.y + 7 + Math.sin(T * 5) * .4, nb.z); fleche.rotation.y = T * 2
        fleche.material.color.set(nb.cote < 0 ? '#ffd43b' : '#ff6b6b')
        D.stand.children.forEach((p) => { if (p.userData.fan !== undefined) p.position.y += Math.sin(T * 9 + p.userData.fan) * .01 })
        // HUD
        H2.compteur(me.v * 3.6 * 1.25, S.power); if (!fin) H2.place(place(), 4)
        H2.temps(tours.map((t, i) => `${i + 1}. ${fmt(t)}`).join('<br>') + (fin ? '' : `<br>${tours.length + 1}. ${fmt(chrono - tours.reduce((a, b) => a + b, 0))}`))
        S.boost = Math.max(0, S.boost - dt * .08)
        if (me.lap >= LAPS && !fin) { fin = true; arrivee() }
      }

      async function arrivee() {
        const rang = me.rang || place()
        H2.msg(rang === 1 ? 'VICTOIRE !' : `ARRIVÉE : ${rang}e`, rang === 1 ? '#ffd43b' : '#ffffff', 3)
        try { beep(660, .2, 'square', .05); setTimeout(() => beep(990, .3, 'square', .05), 200) } catch (e) {}
        await new Promise((r) => setTimeout(r, 2600))
        const tot = me.ok + me.miss, taux = tot ? me.ok / tot : 0
        const r = Math.max(0, Math.min(1, [1, .72, .45, .25][rang - 1] * .3 + taux * .4 + bonnes / QUESTIONS.length * .2 + nSig / SIG.length * .1))
        pts(n, rang <= 2); pts(n, taux >= .7)
        H2.remove(); await fade(1); setWorld(room); await fade(0)
        if (typeof tsAdd === 'function') tsAdd('etapes10', B.filter((b) => b.vu === 1).length)
        cdi(r >= .85 ? 8 : r >= .6 ? 2 : -6)
        const vues = B.filter((b) => b.vu === 1).length, sautees = B.filter((b) => b.vu === -1).map((b) => b.et[1].toLowerCase())
        await say('boulon', `<b>${rang === 1 ? 'Victoire' : rang + 'e place'} en ${fmt(chrono)}.</b> Tours : ${tours.map(fmt).join(' · ')}.<br>
          📉 <b>Écarts par tour :</b> ${ecartsParTour.join(' → ')} ${ecartsParTour.length > 1 && ecartsParTour[ecartsParTour.length - 1] < ecartsParTour[0] ? '(ça baisse : l’amélioration continue se mesure !)' : ''}<br>
          🧭 <b>Étapes du §10 validées au dernier passage :</b> ${vues} sur ${B.length}${sautees.length ? ` (sautées : ${[...new Set(sautees)].join(', ')})` : ''}<br>
          📣 <b>Signalements remontés :</b> ${nSig} sur ${SIG.length}<br>${cfg.after || 'Chaque tour, tu as corrigé tes écarts et tu as fait mieux : c’est ça, l’amélioration continue (§10.3).'}`, { btns: [{ t: 'Continuer', go: 1 }], cls: r >= .6 ? 'good' : 'bad' })
        res(r)
      }

      /* départ : fondu, consignes, compte à rebours */
      hidePanel(); await fade(1); setWorld(W); W.cam(1); if (typeof keyHelp === 'function') keyHelp('jetski'); await fade(0)
      if (!J.auto) await say('boulon', (cfg.hint || '') + (typeof howto === 'function' ? howto('jetski') : ''), { btns: [{ t: 'Moteur !', go: 1 }] })
      hidePanel(); if (typeof $ === 'function' && TOUCH) $('#pad').hidden = false
      for (const t of ['3', '2', '1']) { H2.msg(t, '#ffffff', .9); try { beep(440, .12, 'square', .05) } catch (e) {} await new Promise((r) => setTimeout(r, 900)) }
      H2.msg('PARTEZ !', '#ffd43b', 1.2); try { beep(880, .3, 'square', .06) } catch (e) {}; go = true; S.boost = 1
    })
  }

  /* aides : panneau « Le but / Commandes » et bandeau des touches */
  addEventListener('DOMContentLoaded', () => {
    try {
      HOWTO.jetski = { but: 'Trois tours autour de l’île Talas. Passe chaque bouée du bon côté (◀ jaune : à gauche, ▶ rouge : à droite) : chaque bouée réussie ajoute de la puissance, chaque bouée manquée est un écart qui te la fait perdre. Chaque bouée porte une étape du §10 (de « signaler » à « améliorer sans fin ») ; fonce aussi sur les fûts orange 📣 pour remonter les signalements. À la fin de chaque tour, choisis l’action corrective, puis fais mieux au tour suivant. Les tremplins TALAS font décoller !',
        kb: ['Q / D ou flèches : tourner', 'S ou flèche bas : plonger sous la vague', 'Le moteur accélère tout seul'], tc: ['◀ ▶ : tourner', '▼ : plonger sous la vague', 'Le moteur accélère tout seul'] }
      KEYHELP.jetski = `<span>${K('Q')}${K('D')} tourner</span><span>${K('S')} plonger sous la vague</span><span>◀ jaune : passe à gauche · ▶ rouge : passe à droite</span>`
    } catch (e) {}
  })
})()

// Plan blueprint de la page d'arrivée : grand plan bleu vu en perspective, grille, cercles de repérage, axes en tiret-point,
// règle graduée, annotations, vide noir autour. Tracé et shader écrits pour ce site (aucun fichier de la page de référence).
// La pièce 3D du site est posée par-dessus (son canvas est transparent) ; la caméra reprend son angle (az 36°, él 26°).
import * as THREE from 'three';

const DEG = Math.PI / 180;
const SIZE = 30;                     // côté du plan, en unités de la pièce (≈ 1 u = 1 m)
const DRAW = 110;                    // le tracé de la table est dessiné sur 110 unités puis ramené à la taille du plan
const TEX = 2048;

/* ---------------------------------------------------------------- tracé de la table à dessin (texture) */
function drawMat() {
  const c = document.createElement('canvas'); c.width = c.height = TEX;
  const g = c.getContext('2d');
  const U = (v) => (v + DRAW / 2) / DRAW * TEX;        // unités du tracé → pixels
  const R = (v) => v / DRAW * TEX;
  const line = 'rgba(214,226,255,.62)', faint = 'rgba(214,226,255,.3)';
  g.lineCap = 'round'; g.lineJoin = 'round';
  const circle = (x, y, r, a = 1, w = 2.2) => { g.globalAlpha = a; g.lineWidth = w; g.strokeStyle = line; g.beginPath(); g.arc(U(x), U(y), R(r), 0, 6.2832); g.stroke(); g.globalAlpha = 1; };
  const dot = (x, y, r = .28) => { g.fillStyle = 'rgba(230,238,255,.92)'; g.beginPath(); g.arc(U(x), U(y), R(r), 0, 6.2832); g.fill(); };
  const dashed = (x1, y1, x2, y2, pat) => { g.save(); g.setLineDash(pat.map(R)); g.strokeStyle = faint; g.lineWidth = 2; g.beginPath(); g.moveTo(U(x1), U(y1)); g.lineTo(U(x2), U(y2)); g.stroke(); g.restore(); };
  const seg = (x1, y1, x2, y2, a = .7) => { g.globalAlpha = a; g.strokeStyle = line; g.lineWidth = 2.2; g.beginPath(); g.moveTo(U(x1), U(y1)); g.lineTo(U(x2), U(y2)); g.stroke(); g.globalAlpha = 1; };

  // cercles concentriques autour de l'origine (là où se pose la pièce) et de deux points satellites
  [4.5, 8, 12.5, 18, 25].forEach((r, i) => circle(0, 0, r, i === 4 ? .5 : .9));
  [5, 9, 14].forEach((r) => circle(26, -6, r, .8));
  [3.5, 7, 11].forEach((r) => circle(-30, 14, r, .8));
  circle(-14, -26, 6, .7); circle(-14, -26, 2.4, .7);
  // axes en tiret-point
  const dp = [2.4, .7, .35, .7];
  dashed(-52, 0, 52, 0, dp); dashed(0, -52, 0, 52, dp);
  dashed(-30, -20, -30, 44, dp); dashed(26, -30, 26, 24, dp);
  // points reliés (triangle de mesure)
  const A = [0, -25], B = [26, -6], C = [0, 11.5];
  seg(...A, ...B); seg(...B, ...C); seg(...A, 0, 0, .35);
  [A, B, C, [0, 0], [-30, 14], [-14, -26]].forEach((p) => dot(...p));

  // équerre + règle graduée horizontale (bas du plan), comme une table de découpe
  g.strokeStyle = line; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(U(-40), U(-40)); g.lineTo(U(-40), U(40)); g.lineTo(U(46), U(40)); g.stroke();
  g.globalAlpha = .4; g.beginPath(); g.moveTo(U(-38.4), U(-40)); g.lineTo(U(-38.4), U(38.4)); g.lineTo(U(46), U(38.4)); g.stroke(); g.globalAlpha = 1;
  g.fillStyle = 'rgba(214,226,255,.62)'; g.font = `500 ${R(1.05)}px "JetBrains Mono",ui-monospace,monospace`; g.textAlign = 'center';
  for (let i = 0; i <= 86; i++) {
    const x = -38 + i, major = i % 10 === 0, mid = i % 5 === 0;
    g.globalAlpha = major ? .95 : mid ? .8 : .5; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(U(x), U(40)); g.lineTo(U(x), U(40 - (major ? 2.6 : mid ? 1.7 : .9))); g.stroke();
    if (major) { g.globalAlpha = .7; g.fillText(String(i).padStart(2, '0'), U(x), U(36.2)); }
  }
  g.globalAlpha = 1;

  // annotations (texte mono), alignées sur les axes du plan
  g.textAlign = 'left'; g.fillStyle = 'rgba(236,242,255,.9)';
  const block = (x, y, lines) => { g.font = `500 ${R(.86)}px "JetBrains Mono",ui-monospace,monospace`; lines.forEach((l, i) => g.fillText(l, U(x), U(y) + i * R(1.3))); };
  block(-36, -12, ['x: 2.58993', 'y: 0.33000', 'z: 0.99998']);
  block(-36, -7, ['x: 2.58993', 'y: 0.33000', 'z: 0.99998']);
  block(12, -32, ['commit: a3f9c1e', 'iso: 9001 · 45001 · 14001 · 27001']);
  block(-36, 16, ['plan: comtesse.me', 'échelle: 1 u = 1 cm', 'rév.: 2026.10']);
  block(30, -20, ['écart: 0', 'statut: conforme']);
  g.font = `500 ${R(.74)}px "JetBrains Mono",ui-monospace,monospace`; g.fillStyle = 'rgba(214,226,255,.55)';
  g.fillText('/studio/extracteurs/cerfa_v3.json', U(-8), U(-31));
  // croix de repérage
  g.strokeStyle = line; g.lineWidth = 2;
  [[-20, 30], [34, 12], [-34, -30], [40, -24]].forEach(([x, y]) => { g.beginPath(); g.moveTo(U(x - .7), U(y)); g.lineTo(U(x + .7), U(y)); g.moveTo(U(x), U(y - .7)); g.lineTo(U(x), U(y + .7)); g.stroke(); });
  return c;
}

export function initBlueprint(canvas, host) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 1, 600);
  let linked = null;               // caméra de la pièce : quand elle est liée, le plan est rendu exactement avec elle

  const tex = new THREE.CanvasTexture(drawMat());
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uSize: { value: SIZE }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `
      varying vec2 vUv;varying vec3 vW;uniform sampler2D uTex;uniform float uSize;uniform vec2 uRes;uniform float uTime;
      float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float lines(vec2 p,float s){vec2 q=p/s;vec2 d=fwidth(q);vec2 l=abs(fract(q-.5)-.5)/max(d,vec2(1e-5));return 1.-min(min(l.x,l.y),1.);}
      void main(){
        const float K=3.6667;                      // 110 / 30 : retour aux unités du plan d'origine
        vec2 p=vW.xz*K;
        float dist=length(vW-cameraPosition)*K;
        vec3 col=mix(vec3(.04,.255,.93),vec3(.07,.33,.98),smoothstep(150.,40.,dist));
        float fade=exp(-dist*.004);
        col+=vec3(.5,.66,1.)*lines(p,2.)*.07*fade+vec3(.78,.88,1.)*lines(p,10.)*.17*fade;
        vec4 t=texture2D(uTex,vUv);
        col=mix(col,t.rgb,t.a);
        // lueur : version floue du tracé, ajoutée (bloom léger)
        vec4 tb=texture2D(uTex,vUv,3.5);col+=tb.rgb*tb.a*.55;
        // liseré du plan
        vec2 e=abs(vUv-.5)*2.;float edge=max(e.x,e.y);
        col+=vec3(.6,.75,1.)*smoothstep(.994,.999,edge)*.35;
        // vignettage + grain de film (change à chaque image)
        vec2 sp=gl_FragCoord.xy/uRes-.5;
        col*=1.-smoothstep(.25,.95,length(sp*vec2(1.25,1.)))*.42;
        col+=(hash(gl_FragCoord.xy+fract(uTime)*91.7)-.5)*.07;
        gl_FragColor=vec4(col,1.);
      }`
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), mat);
  plane.rotation.x = -Math.PI / 2; scene.add(plane);

  // la table à dessin ne porte que du trait : on y fait ressortir le texte par un voile blanc au bord
  let w = 1, h = 1, visible = true, raf = 0;
  const state = { yaw: 36 * DEG, pitch: 26 * DEG, dist: 120, px: 0, py: 0, scroll: 0, panX: 0, panY: 0 };
  const aim = new THREE.Vector3();

  function resize() {
    const r = host.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false); camera.aspect = w / h; mat.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    // plus l'écran est étroit, plus on recule pour garder le plan lisible
    state.dist = w / h >= 1.1 ? 110 : 150;
    if (!linked) camera.updateProjectionMatrix();
    draw();
  }
  function draw() {
    if (linked) {
      camera.position.copy(linked.position); camera.quaternion.copy(linked.quaternion);
      camera.projectionMatrix.copy(linked.projectionMatrix); camera.projectionMatrixInverse.copy(linked.projectionMatrixInverse);
      camera.near = linked.near; camera.far = linked.far;
      camera.updateMatrixWorld(true);
      mat.uniforms.uTime.value = performance.now() / 1000;
      renderer.render(scene, camera);
      return;
    }
    const yaw = state.yaw + state.px * 3 * DEG, pitch = clamp(state.pitch + state.py * 2.2 * DEG + state.scroll * 14 * DEG, 12 * DEG, 70 * DEG);
    const cp = Math.cos(pitch);
    // déplacement du plan : mêmes axes que la caméra de la pièce (droite et « loin » sur le sol)
    const a0 = state.yaw;
    aim.set(Math.cos(a0) * state.panX - Math.sin(a0) * state.panY, 0, -Math.sin(a0) * state.panX - Math.cos(a0) * state.panY);
    camera.position.set(aim.x + Math.sin(yaw) * cp * state.dist, Math.sin(pitch) * state.dist, aim.z + Math.cos(yaw) * cp * state.dist);
    camera.lookAt(aim);
    mat.uniforms.uTime.value = performance.now() / 1000;
    renderer.render(scene, camera);
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const goal = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { goal.x = (e.clientX / innerWidth - .5) * 2; goal.y = (e.clientY / innerHeight - .5) * 2; });
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden || host.style.opacity === '0.000') return;
    state.px += (goal.x - state.px) * .06; state.py += (goal.y - state.py) * .06;
    draw();
  }
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(host);
  new ResizeObserver(resize).observe(host);
  resize();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) loop();
  if (document.fonts) document.fonts.ready.then(() => { const t = drawMat(); tex.image = t; tex.needsUpdate = true; draw(); });
  return { plane, link(cam) { linked = cam; cancelAnimationFrame(raf); (function again() { raf = requestAnimationFrame(again); if (visible && !document.hidden && host.style.opacity !== '0.000') draw(); })(); }, setScroll(p) { state.scroll = p; draw(); }, setPan(x, y) { state.panX = x; state.panY = y; draw(); }, setYaw(a) { state.yaw = a; draw(); }, camera, render: draw };
}

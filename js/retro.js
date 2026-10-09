import { THREE, mat, mesh, box, cyl, sph, group, rbox, tube, canvasTexture, rng, inkify } from './kit.js?v=cv-scene-v25';

/* ───────────── Télé cathodique, PS1, manette et câbles ─────────────
 * Repère local : la télé est à l'origine, face vers +z ; la console est à sa droite (+x), la manette devant. y = 0 au sol (surface du tapis). */

export function createRetroSet() {
  const g = group();
  const plastic = new THREE.MeshStandardMaterial({ color: '#202225', roughness: 0.55 });
  const plasticL = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.5 });
  const W = 0.66, H = 0.54, D = 0.5, Y0 = 0.035;

  /* ── télé : caisse avant, dos en tronc de pyramide, cadre d'écran, boutons, haut-parleur, pieds ── */
  const tv = group();
  tv.add(rbox(W, H, D * 0.5, 0.035, plastic, 0, Y0 + H / 2, D * 0.25 - 0.1));
  const back = new THREE.BoxGeometry(1, 1, 1); const bp = back.attributes.position;
  for (let i = 0; i < bp.count; i++) { if (bp.getZ(i) < 0) { bp.setX(i, bp.getX(i) * 0.62); bp.setY(i, bp.getY(i) * 0.62); } }
  back.computeVertexNormals(); back.scale(W * 0.92, H * 0.92, D * 0.5);
  const bm = mesh(back, plastic); bm.position.set(0, Y0 + H / 2, -D * 0.25 - 0.1 + 0.0); tv.add(bm);
  const frontZ = D * 0.5 - 0.1;
  tv.add(rbox(W * 0.97, H * 0.95, 0.025, 0.02, plasticL, 0, Y0 + H / 2, frontZ));                    // cadre
  // panneau de commandes à droite
  const cx = W / 2 - 0.075;
  tv.add(rbox(0.1, H * 0.78, 0.02, 0.012, mat('#17181a', { roughness: 0.6 }), cx, Y0 + H / 2, frontZ + 0.012));
  for (const y of [0.74, 0.58]) { const k = cyl(0.026, 0.026, 0.025, mat('#3a3c40', { roughness: 0.4, metalness: 0.4 }), cx, Y0 + H * y, frontZ + 0.03, 20); k.rotation.x = Math.PI / 2; tv.add(k); tv.add(box(0.004, 0.02, 0.004, mat('#d8d8d0'), cx, Y0 + H * y + 0.012, frontZ + 0.044)); }
  for (let i = 0; i < 8; i++) tv.add(box(0.07, 0.004, 0.006, mat('#0a0a0b'), cx, Y0 + H * 0.38 - i * 0.017, frontZ + 0.023));    // haut-parleur
  tv.add(box(0.02, 0.01, 0.006, mat('#cc2a2a'), cx - 0.02, Y0 + H * 0.12, frontZ + 0.023));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tv.add(rbox(0.07, 0.035, 0.07, 0.01, mat('#111214'), x * (W / 2 - 0.07), 0.0175, z * (D / 2 - 0.15) - 0.1 + 0.05));
  // écran bombé
  const SW = W * 0.72, SH = H * 0.74;
  const sg = new THREE.PlaneGeometry(SW, SH, 16, 12); const sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const nx = sp.getX(i) / (SW / 2), ny = sp.getY(i) / (SH / 2); sp.setZ(i, 0.03 * (1 - nx * nx * 0.9) * (1 - ny * ny * 0.9)); }
  sg.computeVertexNormals();
  const tex = new THREE.CanvasTexture(Object.assign(document.createElement('canvas'), { width: 320, height: 240 }));
  tex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); screenMat.userData.unique = true;
  const screen = new THREE.Mesh(sg, screenMat); screen.position.set(-0.04, Y0 + H * 0.52, frontZ + 0.015); screen.userData.noInk = true; tv.add(screen);
  const bezel = new THREE.Mesh(new THREE.RingGeometry(0.001, 0.001, 4), screenMat); bezel.visible = false; tv.add(bezel);
  for (const [w, h, x, y] of [[SW + 0.05, 0.02, 0, SH / 2 + 0.012], [SW + 0.05, 0.02, 0, -SH / 2 - 0.012], [0.02, SH, -SW / 2 - 0.012, 0], [0.02, SH, SW / 2 + 0.012, 0]])
    tv.add(box(w, h, 0.02, mat('#0e0f10', { roughness: 0.8 }), -0.04 + x, Y0 + H * 0.52 + y, frontZ + 0.012));
  g.add(tv);

  /* ── PlayStation (SCPH-1002) ── */
  const ps = group(); ps.name="PlayStation1"; ps.userData.dynamic=true;
  const grey = new THREE.MeshStandardMaterial({ color: '#b3b3ae', roughness: 0.6 });
  const greyD = new THREE.MeshStandardMaterial({ color: '#9b9b97', roughness: 0.65 });
  const PW = 0.32, PH = 0.065, PD = 0.22;
  ps.add(rbox(PW, PH, PD, 0.012, grey, 0, 0.005 + PH / 2, 0));
  ps.add(rbox(PW * 0.98, 0.012, PD * 0.98, 0.006, greyD, 0, 0.005 + PH - 0.004, 0));
  const lid = cyl(0.083, 0.088, 0.018, greyD, -0.01, 0.005 + PH + 0.005, -0.005, 40); ps.add(lid);
  ps.add(cyl(0.06, 0.06, 0.008, mat('#c7c7c2', { roughness: 0.5 }), -0.01, 0.005 + PH + 0.016, -0.005, 36));
  ps.add(cyl(0.012, 0.012, 0.008, mat('#8e8e8a'), -0.01, 0.005 + PH + 0.022, -0.005, 16));
  for (const x of [-0.125, 0.125]) { ps.add(cyl(0.022, 0.024, 0.014, greyD, x, 0.005 + PH + 0.005, 0.01, 24)); ps.add(cyl(0.015, 0.015, 0.006, mat('#d0d0cb'), x, 0.005 + PH + 0.013, 0.01, 18)); }
  ps.add(rbox(0.05, 0.012, 0.02, 0.004, mat('#9a9a96'), 0.1, 0.005 + PH + 0.002, -0.07));
  // façade : prises manettes et cartes mémoire
  const fz = PD / 2;
  for (const x of [-0.105, -0.055]) ps.add(rbox(0.04, 0.026, 0.006, 0.003, mat('#202124'), x, 0.005 + 0.024, fz + 0.001));
  for (const x of [0.03, 0.095]) ps.add(rbox(0.05, 0.024, 0.006, 0.003, mat('#7b7b78'), x, 0.005 + 0.024, fz + 0.001));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ps.add(cyl(0.011, 0.012, 0.01, mat('#3b3b3b'), x * 0.135, 0.005, z * 0.085, 12));
  ps.position.set(0.58, 0, 0.0); ps.rotation.y = -0.08; g.add(ps);

  /* ── manette ── */
  const pad = group();
  pad.userData.dynamic = true;
  const padM = new THREE.MeshStandardMaterial({ color: '#b6b6b1', roughness: 0.55 });
  pad.add(rbox(0.14, 0.024, 0.07, 0.01, padM, 0, 0.012, 0));
  for (const s of [-1, 1]) { const grip = rbox(0.038, 0.03, 0.075, 0.014, padM, s * 0.068, 0.015, 0.05); grip.rotation.y = s * -0.28; pad.add(grip); }
  pad.add(box(0.038, 0.006, 0.011, mat('#3a3a3c'), -0.04, 0.026, -0.002)); pad.add(box(0.011, 0.006, 0.038, mat('#3a3a3c'), -0.04, 0.026, -0.002));
  for (const [dx, dz, c] of [[0, -0.014, '#3fae6a'], [0.014, 0, '#d04c4c'], [0, 0.014, '#4f78d0'], [-0.014, 0, '#d86fa3']]) pad.add(cyl(0.0075, 0.0075, 0.007, mat(c, { roughness: 0.4 }), 0.045 + dx, 0.026, -0.002 + dz, 14));
  for (const x of [-0.012, 0.012]) pad.add(rbox(0.014, 0.005, 0.008, 0.002, mat('#7c7c79'), x, 0.025, 0.012));
  for (const s of [-1, 1]) pad.add(rbox(0.03, 0.01, 0.014, 0.004, padM, s * 0.045, 0.026, -0.036));
  pad.scale.setScalar(1.65); pad.position.set(0.28, 0, 0.78); pad.rotation.y = 0.55; g.add(pad);

  const padHome = {
    position: pad.position.clone(),
    quaternion: pad.quaternion.clone(),
    scale: pad.scale.clone(),
  };
  let padHeld = false;
  const padTargetPos = new THREE.Vector3();
  const padTargetQuat = new THREE.Quaternion();
  const padRight = new THREE.Vector3();
  const padUp = new THREE.Vector3(0, 1, 0);
  const padForward = new THREE.Vector3();
  const padWorld = new THREE.Matrix4();
  const padParentInv = new THREE.Matrix4();
  const padLocal = new THREE.Matrix4();
  const padTmpScale = new THREE.Vector3(1, 1, 1);

  /* ── câbles posés au sol ── */
  const FLOOR = 0.006;
  const cable = (pts, color, r = 0.0042) => { r *= 1.7; return mk(pts, color, r); };
  const mk = (pts, color, r) => { const t = tube(pts, r, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), { segs: 120, radial: 6 }); g.add(t); return t; };
  const plug = (x, y, z, c = '#d9c24a') => g.add(box(0.016, 0.014, 0.022, mat(c, { roughness: 0.4, metalness: 0.4 }), x, y, z));
  // vidéo (jaune) + audio (blanc, rouge) de la console vers l'arrière de la télé
  [['#e6c61e', 0], ['#f2f2ee', 0.012], ['#cc2b2b', 0.024]].forEach(([c, o]) => {
    cable([[0.60 + o, 0.03, -0.12], [0.62 + o, FLOOR, -0.2], [0.55 + o, FLOOR, -0.42], [0.3 + o * 0.6, FLOOR, -0.5], [0.1 + o * 0.6, FLOOR + 0.02, -0.46], [0.02 + o * 0.5, 0.1, -0.4], [0.0 + o * 0.5, 0.2, -0.33]], c, 0.0034);
  });
  // multiprise derrière le set : les deux alimentations y sont branchées, son cordon part vers la droite (raccordé au sol par room.js)
  const SX = 0.3, SZ = -0.8, SL = 0.34;
  const strip = group(); strip.userData.id = 'strip';
  strip.add(rbox(SL, 0.032, 0.062, 0.008, mat('#e9e7e1', { roughness: 0.45 }), SX, 0.016 + FLOOR, SZ));
  const rocker = rbox(0.03, 0.012, 0.04, 0.004, new THREE.MeshStandardMaterial({ color: '#ff5a2a', emissive: '#ff4a1a', emissiveIntensity: 1.6, roughness: 0.4 }), SX - SL / 2 + 0.03, 0.036 + FLOOR, SZ);
  strip.add(rocker);
  for (const x of [-0.07, -0.01, 0.05, 0.11]) { strip.add(box(0.03, 0.004, 0.022, mat('#2a2b2e'), SX + x, 0.033 + FLOOR, SZ)); strip.add(box(0.004, 0.0045, 0.004, mat('#0a0a0b'), SX + x - 0.007, 0.034 + FLOOR, SZ)); strip.add(box(0.004, 0.0045, 0.004, mat('#0a0a0b'), SX + x + 0.007, 0.034 + FLOOR, SZ)); }
  g.add(strip);
  const sockY = 0.036 + FLOOR;
  const pw = (pts, r = 0.0055) => { mk(pts, '#141416', r * 1.0); const e = pts[pts.length - 1]; plug(e[0], e[1], e[2], '#1a1a1c'); };
  // alimentation télé : sort par l'arrière de la caisse et rejoint la multiprise
  pw([[-0.1, 0.18, -0.35], [-0.13, 0.04, -0.46], [-0.12, FLOOR, -0.62], [-0.02, FLOOR, -0.7], [SX - 0.07, sockY + 0.02, SZ + 0.01], [SX - 0.07, sockY + 0.005, SZ]]);
  // alimentation console
  pw([[0.7, 0.03, -0.12], [0.84, FLOOR, -0.26], [0.78, FLOOR, -0.58], [SX + 0.1, FLOOR + 0.01, SZ + 0.1], [SX + 0.05, sockY + 0.02, SZ + 0.02], [SX + 0.05, sockY + 0.005, SZ]]);
  // cordon de la multiprise : part du bout droit
  const cordStart = new THREE.Vector3(SX + SL / 2, 0.02 + FLOOR, SZ);
  // câble manette : de la prise de façade jusqu'à la manette, avec du mou
  cable([[0.475, 0.03, 0.12], [0.46, FLOOR, 0.25], [0.52, FLOOR, 0.45], [0.38, FLOOR, 0.6], [0.28, FLOOR, 0.62], [0.2, FLOOR, 0.72], [0.27, 0.014, 0.74], [0.3, 0.02, 0.76]], '#8c8c88', 0.0045);
  plug(0.475, 0.03, 0.125, '#8c8c88');

  inkify(g, { skip: (o) => o.userData.noInk || (o.material && o.material.isMeshBasicMaterial) || (o.geometry && o.geometry.type === 'TubeGeometry') });

  /* ── écran : état et animation d'allumage ── */
  const cv = tex.image, c = cv.getContext('2d');
  const rd = rng(99);
  const st = { state: 'off', t: 0, last: -1, strip: true };
  const scan = () => { c.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < 240; y += 3) c.fillRect(0, y, 320, 1); };
  const vignette = () => { const gr = c.createRadialGradient(160, 120, 60, 160, 120, 210); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = gr; c.fillRect(0, 0, 320, 240); };
  function noise(a = 1) { const id = c.createImageData(320, 240), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = (rd() * 255 * a) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } c.putImageData(id, 0, 0); }
  function drawOff() { const gr = c.createLinearGradient(0, 0, 320, 240); gr.addColorStop(0, '#16191b'); gr.addColorStop(0.5, '#0a0c0d'); gr.addColorStop(1, '#101315'); c.fillStyle = gr; c.fillRect(0, 0, 320, 240); c.fillStyle = 'rgba(255,255,255,0.05)'; c.beginPath(); c.ellipse(90, 50, 80, 30, -0.4, 0, 6.3); c.fill(); }
  function drawReady(t) {
    const gr = c.createLinearGradient(0, 0, 0, 240); gr.addColorStop(0, '#1b2b9a'); gr.addColorStop(1, '#07104a'); c.fillStyle = gr; c.fillRect(0, 0, 320, 240);
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 18; i++) c.fillRect(0, (i * 14 + t * 40) % 240, 320, 4);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 56px "Courier New", monospace'; c.fillStyle = '#0a0f3a'; c.fillText('PLAY ?', 164, 108); 
    const blink = Math.sin(t * 5) > -0.4; c.fillStyle = blink ? '#ffffff' : '#9aa6ff'; c.fillText('PLAY ?', 160, 104);
    c.font = '15px "Courier New", monospace'; c.fillStyle = '#c9d2ff'; c.fillText('CLIQUEZ SUR LA TELE', 160, 168);
    c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(60, 98); c.lineTo(60, 122); c.lineTo(80, 110); c.closePath(); c.fill();
    scan(); vignette();
  }
  function frame(dt) {
    st.t += dt;
    const t = st.t;
    if (st.state === 'off') { if (st.last !== 0) { drawOff(); tex.needsUpdate = true; st.last = 0; } return; }
    if (t - st.last < 0.05 && st.state !== 'warm') return;
    st.last = t;
    if (st.state === 'warm') {
      if (t < 0.18) { c.fillStyle = '#000'; c.fillRect(0, 0, 320, 240); const w = 320 * (t / 0.18); c.fillStyle = '#fff'; c.fillRect(160 - w / 2, 118, w, 4); }
      else if (t < 0.5) { const k = (t - 0.18) / 0.32; c.fillStyle = '#000'; c.fillRect(0, 0, 320, 240); const h = 4 + 236 * k * k; c.fillStyle = `rgba(255,255,255,${1 - k * 0.2})`; c.fillRect(0, 120 - h / 2, 320, h); }
      else if (t < 1.4) { const k = (t - 0.5) / 0.9; noise(1 - k * 0.5); c.fillStyle = `rgba(255,255,255,${Math.max(0, 0.5 - k)})`; c.fillRect(0, 0, 320, 240); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, ((t * 260) % 260) - 20, 320, 18); scan(); vignette(); }
      else if (t < 1.75) { const k = (t - 1.4) / 0.35; drawReady(t); c.fillStyle = `rgba(255,255,255,${1 - k})`; c.fillRect(0, 0, 320, 240); noise(0.25 * (1 - k)); }
      else { st.state = 'ready'; drawReady(t); }
    } else if (st.state === 'ready') drawReady(t);
    else if (st.state === 'closing') {
      if (t < 0.25) { const k = t / 0.25; c.fillStyle = '#000'; c.fillRect(0, 0, 320, 240); const h = Math.max(3, 240 * (1 - k * k)); c.fillStyle = '#fff'; c.fillRect(0, 120 - h / 2, 320, h); }
      else if (t < 0.55) { c.fillStyle = '#000'; c.fillRect(0, 0, 320, 240); const w = 320 * (1 - (t - 0.25) / 0.3); c.fillStyle = '#fff'; c.fillRect(160 - w / 2, 118, Math.max(2, w), 4); }
      else { st.state = 'off'; st.last = -1; }
    }
    tex.needsUpdate = true;
  }
  const litMat = rocker.material; litMat.userData.unique = true;
  const api = {
    pad, console: ps,
    get padHeld() { return padHeld; },
    setPadHeld(v) { padHeld = !!v; },
    updatePad(dt, handL, handR) {
      const k = 1 - Math.exp(-dt * (padHeld ? 16 : 9));

      if (padHeld && handL && handR) {
        g.updateMatrixWorld(true);
        handL.updateWorldMatrix(true, false);
        handR.updateWorldMatrix(true, false);

        const L = handL.getWorldPosition(new THREE.Vector3());
        const R = handR.getWorldPosition(new THREE.Vector3());
        padTargetPos.copy(L).add(R).multiplyScalar(0.5);
        padTargetPos.y -= 0.012;

        padRight.copy(R).sub(L).normalize();
        padForward.crossVectors(padRight, padUp).normalize();
        if (padForward.lengthSq() < 1e-5) padForward.set(0, 0, 1);

        padWorld.makeBasis(padRight, padUp, padForward).setPosition(padTargetPos);
        padParentInv.copy(g.matrixWorld).invert();
        padLocal.copy(padParentInv).multiply(padWorld);
        padLocal.decompose(padTargetPos, padTargetQuat, padTmpScale);

        pad.position.lerp(padTargetPos, k);
        pad.quaternion.slerp(padTargetQuat, k);
        pad.scale.lerp(padHome.scale, k);
      } else {
        pad.position.lerp(padHome.position, k);
        pad.quaternion.slerp(padHome.quaternion, k);
        pad.scale.lerp(padHome.scale, k);
      }
    },
    strip, cordStart, get stripOn() { return st.strip; },
    setStrip(v) { st.strip = v; litMat.emissiveIntensity = v ? 1.6 : 0; litMat.color.set(v ? '#ff5a2a' : '#6b2a18'); if (!v) this.powerOff(); },
    group: g, tvCenter: new THREE.Vector3(-0.04, Y0 + H * 0.52, frontZ + 0.02),
    get state() { return st.state; },
    powerOn() { if (st.strip && st.state === 'off') { st.state = 'warm'; st.t = 0; st.last = -1; } },
    powerOff() { if (st.state !== 'off') { st.state = 'closing'; st.t = 0; st.last = -1; } },
    update(dt) { frame(dt); },
  };
  frame(0.01);
  return api;
}

// THALEOLITHIC papier : s'orienter. Un ruban de papier ocre posé au sol, des chevrons qui avancent, mène par les chemins
// du village à la prochaine quête (ou au lieu choisi sur la carte) ; une balise lumineuse dorée se dresse sur ce lieu,
// de petites balises rouges sur les dangers à examiner ; la mini-carte est une vraie vue de dessus du village (rendue de
// la scène elle-même), avec Dylan, les habitants, le ruban et les balises ; un clic l'ouvre en grand, zoomable.
// Quand Dylan parle à quelqu'un, la caméra s'approche doucement du couple, puis recule quand la conversation finit.

export function createNav({ world, campaign, ui, cinema }) {
  const { H } = world, THREE = H.THREE;
  const ease = (u) => u * u * (3 - 2 * u);

  // ---- the GPS ribbon ------------------------------------------------------------------------------------------------
  const chevrons = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#e0a24a'; g.fillRect(0, 6, 128, 52); g.fillStyle = '#c27a2c'; g.fillRect(0, 6, 128, 6); g.fillRect(0, 52, 128, 6);
    g.fillStyle = '#7a2e18'; for (const x0 of [10, 74]) { g.beginPath(); g.moveTo(x0, 16); g.lineTo(x0 + 22, 32); g.lineTo(x0, 48); g.lineTo(x0 + 12, 48); g.lineTo(x0 + 34, 32); g.lineTo(x0 + 12, 16); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(255,244,220,.35)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 128, 8 + Math.random() * 48, 2, 1);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
  const ribbonMat = new THREE.MeshStandardMaterial({ map: chevrons, transparent: true, alphaTest: 0.2, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, side: THREE.DoubleSide });
  const ribbon = new THREE.Mesh(new THREE.BufferGeometry(), ribbonMat); ribbon.receiveShadow = true; ribbon.frustumCulled = false; H.scene.add(ribbon);
  let path = [], lastFrom = null, lastGoal = null, rebuildIn = 0;
  function build(pts) {
    // resample every 0.25, skip the first stretch under Dylan's feet and the last one under the beacon
    const R = []; for (let i = 0; i < pts.length - 1; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25)); for (let k = 0; k < n; k++) R.push([x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n]); }
    R.push(pts[pts.length - 1]);
    let s = 0; const L = [0]; for (let i = 1; i < R.length; i++) L.push(s += Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
    const keep = R.map((p, i) => [p, L[i]]).filter(([, l]) => l > 1.1 && l < s - 1.4);
    const pos = [], uv = [], idx = [], w = 0.28;
    keep.forEach(([[x, z], l], i) => { const a = keep[Math.max(0, i - 1)][0], b = keep[Math.min(keep.length - 1, i + 1)][0], tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      pos.push(x + nx * w, 0.07, z + nz * w, x - nx * w, 0.07, z - nz * w); uv.push(l / 1.4, 0, l / 1.4, 1); if (i) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    ribbon.geometry.dispose(); ribbon.geometry = g;
  }

  // ---- the beacons: a column of light, a glowing paper star that bobs, a warm light on the ground ---------------------
  const glowTex = (inner, outer) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const columnTex = (rgb) => { const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.6, `rgba(${rgb},.35)`); gr.addColorStop(1, `rgba(${rgb},.75)`); g.fillStyle = gr; g.fillRect(0, 0, 32, 128); const gx = g.createLinearGradient(0, 0, 32, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 32, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  function beacon({ rgb, inner, outer, h, size, light }) {
    const g = new THREE.Group();
    const colMat = new THREE.MeshBasicMaterial({ map: columnTex(rgb), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    for (const r of [0, Math.PI / 2]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, h), colMat); m.position.y = h / 2; m.rotation.y = r; g.add(m); }
    const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(inner, outer), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); orb.scale.setScalar(size * 2.2); orb.position.y = h * 0.62; g.add(orb);
    const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.7, size * 0.95, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(`rgb(${rgb})`), transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; g.add(ring);
    let lamp = null; if (light) { lamp = new THREE.PointLight(new THREE.Color(`rgb(${rgb})`), light, 9, 1.6); lamp.position.y = 2; g.add(lamp); }
    g.visible = false; H.scene.add(g); return { g, orb, ring, lamp, light, h };
  }
  const main = beacon({ rgb: '255,206,96', inner: 'rgba(255,250,220,1)', outer: 'rgba(255,190,70,.75)', h: 9, size: 1.1, light: 6 });
  const dangers = Array.from({ length: 8 }, () => beacon({ rgb: '232,72,52', inner: 'rgba(255,220,200,1)', outer: 'rgba(226,60,40,.7)', h: 4.2, size: 0.6, light: 0 }));

  // ---- the conversation camera ----------------------------------------------------------------------------------------
  const cam = { k: 0, d0: null, who: null, held: null };
  const speakerId = (name) => { const n = String(name || '').toLowerCase(); return campaign.data.characters.find((c) => n.includes(String(c.name).toLowerCase()))?.id || null; };

  // ---- the minimap: the village seen from straight above, rendered from the scene itself -------------------------------
  const A = H.walkArea || { x0: -46, x1: 46, z0: -48, z1: 26 }, MW = A.x1 - A.x0, MH = A.z1 - A.z0, PXW = 720, PXH = Math.round(PXW * MH / MW);
  const ortho = new THREE.OrthographicCamera(A.x0, A.x1, -A.z0, -A.z1, 1, 200); ortho.position.set(0, 120, 0); ortho.up.set(0, 0, -1); ortho.lookAt(0, 0, 0);
  ortho.left = A.x0; ortho.right = A.x1; ortho.top = -A.z0; ortho.bottom = -A.z1; ortho.updateProjectionMatrix();
  const rt = new THREE.WebGLRenderTarget(PXW, PXH, { colorSpace: THREE.SRGBColorSpace }), pix = new Uint8Array(PXW * PXH * 4);
  const plate = document.createElement('canvas'); plate.width = PXW; plate.height = PXH;
  const map = { image: null, bounds: A, w: PXW, h: PXH, version: 0 };
  function shoot() {
    const R = H.renderer, prev = R.getRenderTarget(), vis = [ribbon.visible, main.g.visible, ...dangers.map((b) => b.g.visible)];
    ribbon.visible = main.g.visible = false; dangers.forEach((b) => { b.g.visible = false; });
    R.setRenderTarget(rt); R.clear(); R.render(H.scene, ortho); R.readRenderTargetPixels(rt, 0, 0, PXW, PXH, pix); R.setRenderTarget(prev);
    [ribbon.visible, main.g.visible] = vis; dangers.forEach((b, i) => { b.g.visible = vis[2 + i]; });
    const g = plate.getContext('2d'), im = g.createImageData(PXW, PXH);
    for (let y = 0; y < PXH; y++) im.data.set(pix.subarray((PXH - 1 - y) * PXW * 4, (PXH - y) * PXW * 4), y * PXW * 4);   // GL rows bottom-up
    g.putImageData(im, 0, 0);
    // printed like a paper plate: warmed, a little faded
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(244,226,190,.55)'; g.fillRect(0, 0, PXW, PXH); g.globalCompositeOperation = 'source-over';
    map.image = plate.toDataURL('image/jpeg', 0.86); map.version++;
  }
  const mini = document.getElementById('minimap'), mctx = mini?.getContext('2d');
  const toPx = (x, z, W, Hh, view) => [((x - view.x0) / (view.x1 - view.x0)) * W, ((z - view.z0) / (view.z1 - view.z0)) * Hh];
  function drawMini() {
    if (!mctx || !map.image) return;
    const W = mini.width, Hh = mini.height, hp = H.hero.group.position, span = 46, view = { x0: hp.x - span / 2, x1: hp.x + span / 2, z0: hp.z - span * Hh / W / 2, z1: hp.z + span * Hh / W / 2 };
    mctx.clearRect(0, 0, W, Hh);
    const sx = (view.x0 - A.x0) / MW * PXW, sz = (view.z0 - A.z0) / MH * PXH, sw = span / MW * PXW, shh = (view.z1 - view.z0) / MH * PXH;
    mctx.drawImage(plate, sx, sz, sw, shh, 0, 0, W, Hh);
    if (path.length > 1) { mctx.strokeStyle = '#e0a24a'; mctx.lineWidth = 4; mctx.lineCap = mctx.lineJoin = 'round'; mctx.setLineDash([7, 5]); mctx.beginPath(); path.forEach(([x, z], i) => { const [px, pz] = toPx(x, z, W, Hh, view); i ? mctx.lineTo(px, pz) : mctx.moveTo(px, pz); }); mctx.stroke(); mctx.setLineDash([]); }
    for (const p of Object.values(world.people)) { if (p.dying || p.h.held) continue; const [px, pz] = toPx(p.x, p.z, W, Hh, view); mctx.fillStyle = '#f4e6c6'; mctx.beginPath(); mctx.arc(px, pz, 2.6, 0, 7); mctx.fill(); }
    for (const b of dangers) if (b.g.visible) { const [px, pz] = toPx(b.g.position.x, b.g.position.z, W, Hh, view); mctx.fillStyle = '#e84834'; mctx.beginPath(); mctx.arc(px, pz, 4, 0, 7); mctx.fill(); }
    if (main.g.visible) { const [px, pz] = toPx(main.g.position.x, main.g.position.z, W, Hh, view), r = 6 + 2 * Math.sin(performance.now() / 260); mctx.fillStyle = '#ffce60'; mctx.strokeStyle = '#7a2e18'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(Math.max(8, Math.min(W - 8, px)), Math.max(8, Math.min(Hh - 8, pz)), r, 0, 7); mctx.fill(); mctx.stroke(); }
    const yaw = H.hero.group.rotation.y; mctx.save(); mctx.translate(W / 2, Hh / 2); mctx.rotate(-yaw + Math.PI); mctx.fillStyle = '#a83a2a'; mctx.strokeStyle = '#fbf1de'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.moveTo(0, -8); mctx.lineTo(6, 6); mctx.lineTo(0, 3); mctx.lineTo(-6, 6); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
  }
  mini?.addEventListener('click', () => ui.open('map'));
  let shotIn = 2.5, dirty = false; campaign.on(() => { dirty = true; });

  function step(t, dt) {
    const hp = H.hero.group.position, cine = cinema.playing || document.body.classList.contains('cine-on');
    // the goal: the place picked on the map, else the next quest's place
    const site = world.guide || campaign.nextSite(), s = site && world.SITES[site];
    rebuildIn -= dt;
    if (s && !cine) {
      const goal = [s.x, s.z];
      if (rebuildIn <= 0 && (!lastFrom || Math.hypot(hp.x - lastFrom[0], hp.z - lastFrom[1]) > 0.5 || !lastGoal || lastGoal[0] !== goal[0] || lastGoal[1] !== goal[1])) { rebuildIn = 0.3; lastFrom = [hp.x, hp.z]; lastGoal = goal; path = world.route([hp.x, hp.z], goal); build(path); }
      ribbon.visible = Math.hypot(hp.x - s.x, hp.z - s.z) > 2.6; chevrons.offset.x -= dt * 0.9;
      main.g.visible = true; main.g.position.set(s.x, 0, s.z);
    } else { ribbon.visible = false; main.g.visible = false; path = []; }
    world.navRoute = path;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
    main.orb.position.y = main.h * 0.62 + 0.35 * Math.sin(t * 1.7); main.orb.scale.setScalar(2.4 * (0.9 + 0.15 * pulse)); main.ring.scale.setScalar(1 + 0.25 * pulse); if (main.lamp) main.lamp.intensity = main.light * (0.7 + 0.5 * pulse);
    // the dangers that may be examined (the accidents' exposure points)
    const ex = cine ? [] : campaign.exposures();
    dangers.forEach((b, i) => { const x = ex[i], sp = x && world.SITES[x.site]; b.g.visible = !!sp; if (!sp) return; b.g.position.set(sp.x + 1.6, 0, sp.z - 1.2); b.orb.position.y = b.h * 0.62 + 0.2 * Math.sin(t * 2.3 + i); b.ring.scale.setScalar(1 + 0.3 * (0.5 + 0.5 * Math.sin(t * 4 + i))); });
    // the conversation camera
    const dl = !cine && ui.mode === 'dialogue' ? campaign.dialogue() : null, who = dl ? speakerId(dl.speaker) : null, p = who && world.people[who];
    if (dl && cam.k === 0 && !cam.d0) { cam.d0 = H.view.dist; cam.from = [H.target.x, H.target.z]; }
    cam.k = Math.max(0, Math.min(1, cam.k + (dl ? dt / 1.1 : -dt / 0.9)));
    if (p && dl) { if (cam.held !== who) { if (cam.held && world.people[cam.held]) world.people[cam.held].busy = false; cam.held = who; p.busy = true; p.target = null; } p.face = Math.sign(hp.x - p.x) || p.face; }
    if (!dl && cam.held) { if (world.people[cam.held]) world.people[cam.held].busy = false; cam.held = null; }
    if (cam.d0 && !cine) {
      const e = ease(cam.k), mx = p ? (hp.x + p.x) / 2 : hp.x, mz = p ? (hp.z + p.z) / 2 : hp.z, d = cam.d0 * (1 - 0.48 * e);
      const fx = cam.from[0] + (mx - cam.from[0]) * e - d * 0.2 * e, fz = cam.from[1] + (mz - cam.from[1]) * e;   // the pair framed right of the sheet
      if (cam.k > 0) H.look(fx, fz, d, 1.7); else { H.unlook(); cam.d0 = null; }
    }
    // the minimap: a fresh view of the village now and then (and after a change), the live marks every frame
    shotIn -= dt; if (shotIn <= 0 && !cine) { shoot(); shotIn = dirty ? 3 : 12; dirty = false; }
    drawMini();
  }
  return { step, map, get route() { return path; }, shoot };
}

// papercraft / templates / popup-2d / harness-2d.js
// The FIXED harness of a pop-up world in Canvas 2D (no WebGL): a camera pitched down into the world with a mild
// perspective, the printed ground past every edge, printed cards on hinges at their bases, raised surfaces (decks,
// ramps, roofs) drawn through the projection, cast shadows, a tilt-shift lens baked into the prints, walking over the
// walk field, and the capture hook. Keep it as it is; write your world in your own scene.js against the API below (the
// bundled scene.js is the countryside worked example). URL switches: ?capture (no hint), ?walk / ?still (walking on /
// off; walking is the default here: createHarness2D({ play: false }) turns it off), ?view=x,z,zoom (a review camera).
// In your own project: copy assets/lib/ and this file, keep it as it is, and map "papercraft/" in your page's import map to
// the folder that holds lib/ (the template's index.html maps it to ../../).
//
// The projection: world (x, y, z) -> screen (CX + S k x, CY + S k (z sin p - y cos p)), k = D / (D - z cos p), z toward
// the viewer. A card point (u, v) on a card folded forward by phi lands at base - S k v cos(phi + p): a fold is a
// vertical scale of the print by cos(phi + p) (< 0: we see its kraft back). Cards fold TOWARD the viewer in 2D (the rise
// sweeps through edge-on and reads as a rotation); the farthest card lies on top of the flat stack, so it rises first.
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { FlapSpring, windSway, WalkField } from 'papercraft/lib/paper-motion.js';
import { PaperSound } from 'papercraft/lib/paper-sound.js';

/**
 * createHarness2D(options) -> H. Options (all optional): view { pitch, dist, across, focus, band, ramp, maxBlur }
 * (across: world units across the frame; tie it to the hero's share of the frame height: across ~ hero x cos(pitch) x
 * 16 / (9 x share), ~54 for a 3.2-unit hero at 8 %), light [x, y, z] toward the key, grade (a canvas filter baked into
 * prints and ground), ground (your world's plain ground colour: set it), shadow (cast-shadow colour: your world's
 * shadow hue; the default is a warm ground's umber), kraft (card backs), walk { step,
 * radius }, play (walking without ?walk).
 * H: P2, g (the 2D context), proj(x, y, z) -> [sx, sy, k], view, L (unit light), flags, bounds of the visible ground
 * (zTop, zBot, halfAt(z)), rnd (reseed it per section: H.reseed(n)), sheet (paper), Q (print px per unit), mk(w, h),
 * printGround(draw), piece(pts, paint, opts), decks (raised surfaces), walk (WalkField), setHero(piece, { parts }),
 * start().
 */
export function createHarness2D({ view = {}, light = [-0.7, 1.1, 0.4], grade = 'saturate(1.3) contrast(1.08)', ground = '#d9d2c2',
  shadow = '#6e3010', kraft = '#c9a77c', walk: walkOpts = { step: 0.6, radius: 0.45 }, play = true } = {}) {
  const T0 = performance.now();
  const Q_ = new URLSearchParams(location.search);
  const flags = { WALK: Q_.has('walk') || (play && !Q_.has('still')) };
  if (Q_.has('capture')) document.getElementById('hint')?.remove();
  const VIEW = { pitch: 40, dist: 70, across: 54, focus: 0.55, band: 0.28, ramp: 0.3, maxBlur: 9, ...view };   // maxBlur: px at 1080p
  // a review camera (?view=x,z,zoom or __papercraft.look(x, z, zoom)) moves the projection only: the world is built for a
  // fixed reference frame, so every camera sees the same world (prints keep the blur baked for the main view)
  const CAM = (() => { const v = (Q_.get('view') || '').split(',').map(Number); return { x: v[0] || 0, z: v[1] || 0, zoom: v[2] || 1 }; })();
  const sinP = Math.sin(VIEW.pitch * Math.PI / 180), cosP = Math.cos(VIEW.pitch * Math.PI / 180);
  const L = (() => { const n = Math.hypot(...light); return light.map((v) => v / n); })();

  // ---- canvas, projection ----------------------------------------------------------------------------------------
  let cv = document.getElementById('c');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'c'; document.body.prepend(cv); }
  const g = cv.getContext('2d');
  let S = 1, CX = 0, CY = 0;                               // px per world unit at z = 0; screen position of the origin
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    S = cv.width / VIEW.across; CX = cv.width / 2; CY = cv.height / 2;
  }
  resize();
  const depthK = (z) => VIEW.dist / (VIEW.dist - z * cosP);                            // perspective scale at depth z
  const proj = (x, y, z) => { const k = depthK(z - CAM.z) * CAM.zoom; return [CX + (x - CAM.x) * S * k, CY + ((z - CAM.z) * sinP - y * cosP) * S * k, k]; };
  const S0 = S, H0 = cv.height;            // prints and blurs are made once for this size; resizes just rescale them
  const Q = Math.min(48, Math.max(16, S0 * 1.25)); // print px per unit: near the on-screen size (a big downscale rings into halos)
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const blurAt = (fy) => { const d = Math.max(0, Math.abs(fy - VIEW.focus) - VIEW.band / 2); return VIEW.maxBlur * (H0 / 1080) * Math.min(1, d / VIEW.ramp); };
  const sheet = P2.paperSheet({ size: 512, color: '#fbf4e8', seed: 9 });
  // the visible ground of the REFERENCE frame (16:9, the main view): fixed, so the world never depends on the window
  const REF_H = 9 / 16 * VIEW.across;      // frame height in world units at z = 0
  const zAt = (fy) => { const v = (fy - 0.5) * REF_H; return v * VIEW.dist / (sinP * VIEW.dist + v * cosP); };
  const zTop = zAt(0), zBot = zAt(1), halfAt = (z) => (VIEW.across / 2) / depthK(z);

  // ---- the printed ground: one continuous sheet, larger than the frame --------------------------------------------
  const GX0 = -Math.ceil(halfAt(zTop) + 8), GX1 = -GX0, GZ0 = Math.floor(zTop - 8), GZ1 = Math.ceil(zBot + 6), GQ = Math.min(20, Q);
  let groundSheet = null, groundLayer = null;
  /**
   * printGround(draw): draw(t) paints the ground sheet with t = { x (2D context, sheet px), W, H, GQ (px per unit), X(wx),
   * Z(wz) (world -> sheet px), GX0, GX1, GZ0, GZ1 (its bounds), ribbon(fx, w, colour, wobble) (a band along x = fx(z)),
   * line(pts, w, colour) (a band along any polyline [[x, z], ...], e.g. P2.pathLine(ctrl).pts: paths that run across
   * the view), washes(colours), drifts(fn) (marks gathered in drifts) }. Then the paper is multiplied in.
   */
  function printGround(draw, { seed = 31 } = {}) {
    const rnd = P2.rng(seed);
    const c = mk((GX1 - GX0) * GQ, (GZ1 - GZ0) * GQ), x = c.getContext('2d'), W = c.width, H = c.height;
    const X = (wx) => (wx - GX0) * GQ, Z = (wz) => (wz - GZ0) * GQ;
    x.fillStyle = ground; x.fillRect(0, 0, W, H);
    const washes = (cols) => {
      for (const [n, r0, r1, a] of [[50, 8, 20, 0.3], [180, 2.5, 7, 0.2], [600, 0.5, 1.6, 0.12]]) for (let i = 0; i < n; i++) {
        const px = rnd() * W, py = rnd() * H, r = (r0 + rnd() * (r1 - r0)) * GQ, col = cols[Math.floor(rnd() * cols.length)];
        const gr = x.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, P2.rgba(col, a * 0.6)); gr.addColorStop(0.78, P2.rgba(col, a)); gr.addColorStop(0.9, P2.rgba(P2.shade(col, -0.15), a * 1.2)); gr.addColorStop(1, P2.rgba(col, 0));
        x.fillStyle = gr; x.fillRect(px - r, py - r, 2 * r, 2 * r);
      }
    };
    const ribbon = (fx, w, col, wob = 0) => { x.strokeStyle = col; x.lineWidth = w * GQ; x.lineCap = x.lineJoin = 'round'; x.beginPath(); for (let z = GZ0; z <= GZ1; z += 0.5) (z === GZ0 ? x.moveTo : x.lineTo).call(x, X(fx(z) + wob * Math.sin(z * 1.1 + w)), Z(z)); x.stroke(); };
    const line = (pts, w, col) => { x.strokeStyle = col; x.lineWidth = w * GQ; x.lineCap = x.lineJoin = 'round'; x.beginPath(); pts.forEach(([wx, wz], i) => (i ? x.lineTo(X(wx), Z(wz)) : x.moveTo(X(wx), Z(wz)))); x.stroke(); };
    const drifts = (fn, { n = 14000, inside = 0.55, outside = 0.02, threshold = 0.6 } = {}) => {   // sparse and clustered: an even sprinkle reads as a stamp
      const mask = P2.tileNoise(128, 7, rnd), at = (px, py) => mask[(Math.floor(py / H * 128) & 127) * 128 + (Math.floor(px / W * 128) & 127)];
      for (let k = 0; k < n; k++) { const px = rnd() * W, py = rnd() * H; if (rnd() > (at(px, py) > threshold ? inside : outside)) continue; fn(px, py); }
    };
    draw({ x, W, H, GQ, X, Z, GX0, GX1, GZ0, GZ1, rnd, washes, ribbon, line, drifts });
    x.globalCompositeOperation = 'multiply'; x.fillStyle = x.createPattern(sheet, 'repeat'); x.fillRect(0, 0, W, H);
    groundSheet = c; groundLayer = null;
  }
  function buildGroundLayer() {              // the ground projected to the screen once per size (in depth strips), tilt-shift blur by row
    const c = mk(cv.width, cv.height), x = c.getContext('2d');
    x.fillStyle = ground; x.fillRect(0, 0, c.width, c.height);
    if (groundSheet) {
      x.imageSmoothingQuality = 'medium'; x.filter = grade;
      const N = 160, dz = (GZ1 - GZ0) / N;
      for (let i = 0; i < N; i++) {           // each strip of depth gets its own scale: perspective out of affine draws
        const z0 = GZ0 + i * dz, z1 = z0 + dz, [, y0] = proj(0, 0, z0), [, , k] = proj(0, 0, (z0 + z1) / 2), [, y2] = proj(0, 0, z1);
        x.drawImage(groundSheet, 0, (z0 - GZ0) * GQ, groundSheet.width, dz * GQ, CX + (GX0 - CAM.x) * S * k, y0, (GX1 - GX0) * S * k, y2 - y0 + 0.75);
      }
      x.filter = 'none';
    }
    const b = mk(cv.width, cv.height), bx = b.getContext('2d');
    bx.filter = `blur(${VIEW.maxBlur * (cv.height / 1080)}px)`; bx.drawImage(c, 0, 0); bx.filter = 'none';
    bx.globalCompositeOperation = 'destination-in';
    const gr = bx.createLinearGradient(0, 0, 0, cv.height);
    for (let i = 0; i <= 24; i++) gr.addColorStop(i / 24, `rgba(0,0,0,${blurAt(i / 24) / (VIEW.maxBlur * (H0 / 1080))})`);
    bx.fillStyle = gr; bx.fillRect(0, 0, cv.width, cv.height);
    x.drawImage(b, 0, 0);
    groundLayer = c;
  }

  // ---- pieces: printed card + sprites (blurred print, shade mask, kraft back, soft shadow) ------------------------
  let rnd = P2.rng(31);
  const pieces = [];
  // raised surfaces drawn through the projection (decks, ramps, landings, roofs, walls): each { z, draw(), shadow() }.
  // z: its key in the depth order (a deck's FAR edge, its NEAR edge if it stands higher than what is beside it); draw()
  // draws it (P2.drawDeck2D / P2.drawSurface2D with H.g and H.proj), shadow() casts its shadow on the page (optional).
  // render() inserts every one among the depth-sorted cards: add as many as your world has.
  const decks = [];
  /**
   * piece(pts, paint, opts) prints a card and stands it on a hinge at its base. opts: x, z, y (a raised base: a deck's
   * height), yaw (a small turn about the hinge), sway (wind, 0-1), seed, slotted (a slotted tree: a narrow crossed spine;
   * keep the spine plain, a busy crown squeezed reads as a striped pole), sharp (no baked blur: cards that MOVE), holes
   * (outlines cut through the card, rimmed like its outline), float (never touches the ground: no shadow, no contact
   * pool), bob (world units: a floating piece bobs on the water), reflect (a faint dark mirrored silhouette under a floating piece; prefer printed reflection marks on the water).
   */
  function piece(pts, paint, { x = 0, z = 0, y = 0, seed = pieces.length * 7 + 3, sway = 0, yaw = 0, slotted = false, sharp = false, holes = null, float = false, bob = 0, reflect = false } = {}) {
    const pr = P2.printCard(pts, { pxPerUnit: Q, sheet, seed, holes, paint: (P) => {
      paint(P);
      P.draw((gg) => { const gr = gg.createLinearGradient(0, P.box.y0, 0, P.box.y0 + 0.4); gr.addColorStop(0, 'rgba(60,34,14,0.14)'); gr.addColorStop(1, 'rgba(60,34,14,0)'); gg.fillStyle = gr; gg.fillRect(P.box.x0 - 1, P.box.y0 - 1, P.box.w + 2, 1.4); });
      P.rim({ width: 0.08, skip: (x0, y0, x1, y1) => Math.abs(y0 - P.box.y0) < 1e-6 && Math.abs(y1 - P.box.y0) < 1e-6 }); // the base is a fold: no edge
    } });
    const q = pr.pxPerUnit, box = pr.box, [, by0, k0] = proj(x, 0, z);
    const fy = (by0 - box.h * 0.5 * cosP * S0 * k0) / H0;                        // the card's middle, as a fraction of the frame
    const blur = sharp ? 0 : blurAt(fy) * q / (S0 * k0), pad = Math.ceil(blur * 2 + 4);
    const img = mk(pr.canvas.width + 2 * pad, pr.canvas.height + 2 * pad);
    { const c = img.getContext('2d'); c.filter = (blur > 0.4 ? `blur(${blur}px) ` : '') + grade; c.drawImage(pr.canvas, pad, pad); }
    const tint = (src, col) => { const c = mk(src.width, src.height), xx = c.getContext('2d'); xx.drawImage(src, 0, 0); xx.globalCompositeOperation = 'source-in'; xx.fillStyle = col; xx.fillRect(0, 0, c.width, c.height); return c; };
    const dark = tint(img, '#2a1608');
    const back = tint(img, P2.mix(pr.mean || kraft, kraft, 0.6));
    { const xx = back.getContext('2d'); xx.globalCompositeOperation = 'multiply'; xx.fillStyle = xx.createPattern(sheet, 'repeat'); xx.fillRect(0, 0, back.width, back.height); xx.globalCompositeOperation = 'destination-in'; xx.drawImage(img, 0, 0); }
    const sb = Math.max(1.5, 0.05 * box.h * q / 2) + blur / 2, sp = Math.ceil(sb * 2 + 3);
    const shadowImg = mk(pr.canvas.width / 2 + 2 * sp, pr.canvas.height / 2 + 2 * sp);
    { const xx = shadowImg.getContext('2d'); xx.filter = `blur(${sb}px)`; xx.drawImage(pr.canvas, sp, sp, pr.canvas.width / 2, pr.canvas.height / 2); xx.filter = 'none'; xx.globalCompositeOperation = 'source-in'; xx.fillStyle = shadow; xx.fillRect(0, 0, shadowImg.width, shadowImg.height); }
    const p = { id: pieces.length, x, z, y, box, q, pad, img, dark, back, shadow: shadowImg, sp, sway, slotted, yaw, float, bob, reflect, cy: Math.cos(yaw), jit: rnd() * 0.04,
      spring: new FlapSpring({ p: 0, size: Math.min(1, box.h / 12) }), wait: 0, pending: false };
    pieces.push(p);
    return p;
  }

  // ---- walking: the hero piece (and its doll parts) over the walk field ---------------------------------------------
  const walk = new WalkField(walkOpts);
  let hero = null, HERO0 = [0, 0];
  /** setHero(piece, { parts, step }): parts = [{ p: piece, dx, dy, dz, leg }]: puppet cards that follow the body card
   *  (x offsets mirror when he turns) and rise with its spring; leg: 0 | 1 marks a leg card that steps (step = the step
   *  length in world units: short doll legs take short steps). */
  function setHero(h, { parts = [], step = 0.9 } = {}) {
    hero = h; hero.parts = parts; hero.step = step; hero.flip = 1; hero.face = 1; hero.walked = 0; hero.gait = 0; hero.y = hero.y || 0;
    for (const d of parts) d.p.rider = hero;
    HERO0 = [hero.x, hero.z];
  }
  const keys = new Set();
  function walkHero(dt) {
    let ix = 0, iz = 0;
    if (keys.has('arrowleft') || keys.has('a')) ix -= 1; if (keys.has('arrowright') || keys.has('d')) ix += 1;
    if (keys.has('arrowup') || keys.has('w')) iz -= 1; if (keys.has('arrowdown') || keys.has('s')) iz += 1;
    const x0 = hero.x, z0 = hero.z;
    if (ix || iz) { const k = 7 * dt / Math.hypot(ix, iz); walk.move(hero, ix * k, iz * k); if (ix) hero.face = Math.sign(ix); }
    const d = Math.hypot(hero.x - x0, hero.z - z0); hero.walked += d; hero.gait += ((d > 1e-4 ? 1 : 0) - hero.gait) * (1 - Math.exp(-dt * 10));
  }
  // turning flips the cards with a cut at the midpoint (never edge-on: |scale| jumps from 0.3 to -0.3)
  function turnHero(dt) {
    hero.flip += (hero.face - hero.flip) * (1 - Math.exp(-dt * 16));
    if (Math.abs(hero.flip) < 0.3 && Math.sign(hero.flip) !== hero.face) hero.flip = 0.3 * hero.face;
  }

  // ---- drawing ------------------------------------------------------------------------------------------------------
  let t = 0;
  const wrap = (d) => Math.max(0, (d + 0.3) / 1.3);
  const pool = (() => { const c = mk(64, 64), x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, P2.rgba(shadow, 0.9)); gr.addColorStop(0.55, P2.rgba(shadow, 0.45)); gr.addColorStop(1, P2.rgba(shadow, 0)); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; })();
  function drawShadow(s) {               // a card's silhouette projected along the light onto the surface it stands on
    const { p, phi, bx, by } = s, open01 = Math.min(1, Math.max(0, p.spring.p)); if (open01 < 0.02) return;
    const a = -Math.cos(phi) * L[0] / L[1], bz = Math.sin(phi) - Math.cos(phi) * L[2] / L[1], qs = p.q / 2, sp = p.sp, { box } = p, Sk = s.s, f = p.flip ?? 1;
    const A = Sk * p.cy * f / qs, Cc = -Sk * a / qs, Dd = -Sk * sinP * bz / qs;
    g.globalAlpha = 0.5 * open01;
    g.setTransform(A, 0, Cc, Dd, bx + Sk * p.cy * f * box.x0 + Sk * a * box.y1 - sp * A - sp * Cc, by + Sk * sinP * bz * box.y1 - sp * Dd);
    g.drawImage(p.shadow, 0, 0);
  }
  function drawContact(s) {              // every standing piece visibly touches what it stands on
    const o = Math.min(1, Math.max(0, s.p.spring.p)); if (o < 0.05) return;
    const w = s.p.box.w * s.s * s.p.cy * 0.52, h = Math.max(2, 0.4 * s.s * sinP), cx = s.bx + s.s * s.p.cy * (s.p.box.x0 + s.p.box.x1) / 2 + w * 0.1;
    g.setTransform(w, 0, 0, h, cx, s.by); g.globalAlpha = 0.68 * o; g.drawImage(pool, -1, -1, 2, 2);
  }
  function drawReflection(s) {           // a darker mirrored copy below the base, on the water
    const { p, k, bx, by } = s, o = Math.min(1, Math.max(0, p.spring.p)); if (o < 0.05 || k <= 0) return;
    const { box, q, pad } = p, Sk = s.s, sx = Sk * p.cy * (p.flip ?? 1);
    g.globalAlpha = 0.22 * o;
    g.setTransform(sx / q, 0, 0, -k * Sk * 0.7 / q, bx + sx * box.x0 - pad * sx / q, by + k * Sk * 0.7 * box.y1 + k * pad * Sk * 0.7 / q);
    g.drawImage(p.dark, 0, 0);
  }
  function render() {
    if (!groundLayer || groundLayer.width !== cv.width || groundLayer.height !== cv.height) buildGroundLayer();
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingQuality = 'medium'; // 'high' rings into pale halos on cut edges
    g.drawImage(groundLayer, 0, 0);
    const st = pieces.map((p) => {
      const sway = p.sway ? windSway(t, p.x, p.z, { amp: 1.4 * p.sway, heroHeight: 3.2 }) : 0;
      const phi = (1 - p.spring.p) * Math.PI / 2 + sway * Math.min(1, p.spring.p); // 0 standing, PI/2 lying forward face down
      const y = (p.y || 0) + (p.bob ? Math.sin(t * 1.3 + p.jit * 150) * p.bob : 0);
      const [bx, by, k] = proj(p.x, y, p.z);
      return { p, phi, k: Math.cos(phi + VIEW.pitch * Math.PI / 180), bx, by, s: S * k };
    });
    // shadows first, for everything standing on the page: each card's silhouette projected along the light (an affine
    // map of the print), then a contact pool. Pieces standing on a raised deck cast theirs right before they are drawn.
    for (const s of st) if (s.p.reflect) drawReflection(s);
    for (const s of st) if (!(s.p.y > 0.01) && !s.p.float) drawShadow(s);
    for (const s of st) if (!(s.p.y > 0.01) && !s.p.float) drawContact(s);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    for (const d of decks) if (d.shadow) { g.save(); d.shadow(); g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; }
    // flat-stack order: cards still lying forward (k <= 0) first, nearest at the bottom; then standing cards far to
    // near; every raised surface is a draw item at its key: after the cards behind it, before the cards standing on it
    const flat = st.filter((s) => s.k <= 0).sort((a, b) => b.p.z - a.p.z), up = st.filter((s) => s.k > 0).sort((a, b) => a.p.z - b.p.z);
    const order = [...flat, ...up];
    for (const d of decks) { const at = order.findIndex((s) => !s.deck && s.k > 0 && s.p.z > d.z + 1e-3); order.splice(at < 0 ? order.length : at, 0, { deck: d }); }
    for (const s of order) {
      if (s.deck) { g.save(); s.deck.draw(); g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; continue; }
      if (s.p.y > 0.01 && !s.p.float) { drawShadow(s); drawContact(s); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; }
      const { p, phi, k, bx, by } = s, { box, q, pad } = p, Sk = s.s, sx = Sk * p.cy * (p.flip ?? 1);
      if (Math.abs(k) < 0.004) continue;                                                 // exactly edge-on: nothing to see
      const front = k > 0, nL = front ? -Math.sin(phi) * L[1] + Math.cos(phi) * L[2] * p.cy - Math.sin(p.yaw) * L[0] : Math.sin(phi) * L[1] - Math.cos(phi) * L[2];
      const lit = Math.min(1, 0.62 + 0.3 * wrap(nL) + 0.12 * Math.max(0, k));             // key + a fill from the camera side
      const draw = (scaleX, darkK) => {
        g.setTransform(sx * scaleX / q, 0, 0, k * Sk / q, bx + sx * scaleX * box.x0 - pad * sx * scaleX / q, by - k * Sk * box.y1 - k * pad * Sk / q);
        g.drawImage(front ? p.img : p.back, 0, 0);
        const a = Math.min(0.9, (1 - lit) * 0.9 + darkK); if (a > 0.005) { g.globalAlpha = a; g.drawImage(p.dark, 0, 0); g.globalAlpha = 1; }
      };
      draw(1, 0);
      if (p.slotted && front && k > 0.2) draw(0.16, 0.22);                               // the crossed half of a slotted tree
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    const vg = g.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.45, cv.width / 2, cv.height / 2, cv.height);
    vg.addColorStop(0, 'rgba(42,23,11,0)'); vg.addColorStop(1, 'rgba(42,23,11,0.08)'); g.fillStyle = vg; g.fillRect(0, 0, cv.width, cv.height);
  }

  // ---- motion, input, loop, capture hook -------------------------------------------------------------------------------
  const H = { P2, g, proj, view: VIEW, L, flags, zTop, zBot, zAt, halfAt, sheet, Q, mk, grade, printGround, piece, decks, walk, setHero, start,
    get rnd() { return rnd; }, reseed: (n) => { rnd = P2.rng(n); return rnd; }, get hero() { return hero; } };

  function start() {
    if (!hero) throw new Error('papercraft harness-2d: call H.setHero(piece, { parts }) before H.start()');
    const sound = new PaperSound();
    let open = false;
    const zMin = Math.min(...pieces.map((p) => p.z)), zMax = Math.max(...pieces.map((p) => p.z));
    function setOpen(o) {
      open = o;
      for (const p of pieces) { // forward folds: the farthest card lies on top of the flat stack, so it rises first
        if (p.rider) continue;
        const k = (p.z - zMin) / Math.max(1e-6, zMax - zMin);
        p.wait = 0.15 + (o ? k * 1.1 : (1 - k) * 0.6) + p.jit; p.pending = true;
      }
    }
    if (flags.WALK) {
      addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); if (e.key.startsWith('Arrow')) e.preventDefault(); });
      addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    }
    function update(dt) {
      t += dt;
      if (flags.WALK) walkHero(dt);
      turnHero(dt);
      // the stride (motion.md section 8), as x offsets of the leg cards: in the stance the offset runs back LINEARLY with
      // the distance walked, so the planted foot stays put; in the swing it eases forward with a smoothstep
      const ph = hero.walked / hero.step, phase = (u) => (u >= 1 ? 3 - 2 * u : 2 * (u * u * (3 - 2 * u)) - 1);
      const legX = [0, 1].map((i) => phase((ph + i) % 2) * hero.step / 2 * hero.gait);
      for (const d of hero.parts) { d.p.x = hero.x + (d.dx + (d.leg !== undefined ? legX[d.leg] : 0)) * hero.flip; d.p.z = hero.z + d.dz; d.p.y = hero.y + d.dy; d.p.flip = hero.flip; }
      for (const p of pieces) {
        if (p.rider) { p.spring.p = p.rider.spring.p; continue; }          // a doll part rises with the body's card
        if (p.pending) { p.wait -= dt; if (p.wait <= 0) { p.pending = false; p.spring.set(open ? 1 : 0); sound.flap({ size: Math.min(1, p.box.h / 12), up: open, key: p.id }); } }   // a number per piece: the engine groups by key
        p.spring.step(dt);
      }
    }
    addEventListener('resize', () => { resize(); groundLayer = null; });
    cv.addEventListener('pointerdown', () => sound.unlock());
    addEventListener('keydown', () => sound.unlock());     // a player on the keys alone hears it too
    cv.addEventListener('pointerup', () => setOpen(!open));
    setOpen(true);
    let last = performance.now(), auto = true, frames = 0;
    function loop(now) { if (!auto) return; update(Math.min(0.05, Math.max(0, (now - last) / 1000))); last = now; render(); frames++; requestAnimationFrame(loop); } // dt in [0, 50 ms]
    requestAnimationFrame(loop);
    function restart() { t = 0; for (const p of pieces) { p.spring.reset(0); p.pending = false; } [hero.x, hero.z] = HERO0; hero.y = 0; hero.face = hero.flip = 1; hero.walked = hero.gait = 0; CAM.x = 0; CAM.z = 0; CAM.zoom = 1; groundLayer = null; setOpen(true); }
    window.__papercraft = { step(sec, fps = 60) { auto = false; for (let i = 0; i < Math.round(sec * fps); i++) update(1 / fps); render(); return t; }, restart,
      resume() { last = performance.now(); auto = true; requestAnimationFrame(loop); }, toggle: () => setOpen(!open), pieces: pieces.length, walk, hero,
      // scripted checks: place() puts the hero on whatever surface is at (x, z); walkPath() walks him there through the
      // walk field (blockers and the step limit apply) and leaves him turned that way; key events stepped through
      // step() test the live controls deterministically
      place(x, z) { const sf = walk.surface(x, z); if (!sf) return null; hero.x = x; hero.z = z; hero.y = sf.y; return sf.y; },
      walkPath(points, o) { const r = walk.route(hero, points, o); if (points.length) hero.face = Math.sign(points[points.length - 1][0] - r.trace[0][0]) || hero.face; hero.flip = hero.face; return { reached: r.reached, of: r.of, stuck: r.stuck || null, blockedBy: r.blockedBy || null, y: +hero.y.toFixed(2), on: r.on ? 'deck' : 'page' }; },
      look(x, z, zoom = 1.8) { CAM.x = x; CAM.z = z; CAM.zoom = zoom; groundLayer = null; },   // a close review frame (same world)
      /** measured frames per second of the live loop over ms (resume() first; headless machines without a GPU read low) */
      fps(ms = 2000) { const f0 = frames, t0 = performance.now(); return new Promise((res) => setTimeout(() => res(+((frames - f0) / ((performance.now() - t0) / 1000)).toFixed(1)), ms)); },
      buildMs: Math.round(performance.now() - T0), ready: true }; // ready: the build is synchronous: wait for __papercraft?.ready
  }
  return H;
}

// Feu, fumée, ombres et lumière de flamme : deux canvas recalés sur la projection du SVG.
//  · « arrière » : dans le SVG (foreignObject), derrière la fusée : traces au sol, ombre portée, fumée située derrière l'axe du véhicule
//  · « avant » : posé sur le dessin : flammes, étincelles, lueur sur la fusée, fumée située devant l'axe
// Tout est une fonction pure du temps (émetteurs indexés par un entier, hasard par hash) : at(t) rend toujours la même image.
// Inliné dans le script vivant des figures « fusée » (pas de backtick ici : le fichier est inséré tel quel).
function makeBurn(stage, svg, VBW, VBH, pr) {
  const front = document.createElement("canvas");
  front.setAttribute("aria-hidden", "true");
  front.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none";
  if (getComputedStyle(stage).position === "static") stage.style.position = "relative";
  stage.appendChild(front);
  const backEl = svg.querySelector("#burn-back canvas");
  const layers = [
    { cv: front, g: front.getContext("2d"), k: 1, ox: 0, oy: 0 },
    { cv: backEl || front, g: (backEl || front).getContext("2d"), k: 1, ox: 0, oy: 0 },
  ];
  let ctx = layers[0].g, Lc = layers[0];
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, u) => a + (b - a) * u;
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hh = (n) => { let h = Math.imul((n | 0) + 7, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (Math.imul(h, 3266489917) >>> 0) / 4294967296; };
  const vn1 = (x, sd) => { const i = Math.floor(x), f = sm(x - i); return mix(hh(i * 131 + sd * 977), hh((i + 1) * 131 + sd * 977), f); };

  // ---- repère : unités d'écran par unité monde, direction de la lumière (ombres vers le bas-droite de l'écran)
  const o3 = pr(0, 0, 0), ex = [pr(1, 0, 0)[0] - o3[0], pr(1, 0, 0)[1] - o3[1]], ey = [pr(0, 1, 0)[0] - o3[0], pr(0, 1, 0)[1] - o3[1]];
  const UZ = Math.abs(pr(0, 0, 1)[1] - o3[1]), UN = (Math.hypot(ex[0], ex[1]) + Math.hypot(ey[0], ey[1])) / 4 + UZ / 2;
  const det = ex[0] * ey[1] - ex[1] * ey[0], SUN = (() => { const tx = 1, ty = 0.28, wx = (tx * ey[1] - ey[0] * ty) / det, wy = (ex[0] * ty - ex[1] * tx) / det, n = Math.hypot(wx, wy) || 1; return [wx / n, wy / n]; })();
  let dark = false, themeAt = -1e9;

  function fit() {
    const r = svg.getBoundingClientRect(), rs = stage.getBoundingClientRect(), dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(rs.width * dpr)), H = Math.max(1, Math.round(rs.height * dpr));
    if (front.width !== W || front.height !== H) { front.width = W; front.height = H; }
    layers[0].k = r.width / VBW * dpr; layers[0].ox = (r.left - rs.left) * dpr; layers[0].oy = (r.top - rs.top) * dpr;
    if (backEl) {
      const bw = Math.max(1, Math.round(r.width * dpr)), bh = Math.max(1, Math.round(r.height * dpr));
      if (backEl.width !== bw || backEl.height !== bh) { backEl.width = bw; backEl.height = bh; }
      layers[1].k = r.width / VBW * dpr; layers[1].ox = 0; layers[1].oy = 0;
    } else { layers[1].k = layers[0].k; layers[1].ox = layers[0].ox; layers[1].oy = layers[0].oy; }
  }
  function theme(now) {
    if (now - themeAt < 400) return; themeAt = now;
    const c = (getComputedStyle(stage).getPropertyValue("--anatomy-paper") || "#fff").trim();
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c);
    dark = m ? (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) < 110 : false;
  }

  // ---- bruit pour fabriquer les nuages
  const H2 = (x, y, sd) => { let h = Math.imul(x * 374761393 + y * 668265263 + sd * 1442695041, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y, sd) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi); const a = H2(xi, yi, sd), b = H2(xi + 1, yi, sd), c = H2(xi, yi + 1, sd), d = H2(xi + 1, yi + 1, sd); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  const fbm = (x, y, sd) => (0.58 * vn(x, y, sd) + 0.29 * vn(x * 2.03, y * 2.03, sd + 1) + 0.13 * vn(x * 4.1, y * 4.1, sd + 2));

  // forme de bouffée : lobes arrondis, relief bosselé, lumière de haut-gauche ; renvoie opacité et ton (0 ombre, 1 lumière), flous
  const SH = 128;
  function shape(seed) {
    const S = SH, al = new Float32Array(S * S), tn = new Float32Array(S * S);
    const nl = 7, lobes = Array.from({ length: nl }, (_, i) => { const a = hh(seed * 13 + i) * TAU, r = 0.12 + 0.36 * hh(seed * 17 + i + 3); return [Math.cos(a) * r, Math.sin(a) * r * 0.9, 0.3 + 0.22 * hh(seed * 19 + i + 6)]; });
    const field = (nx, ny) => { let m = 0; for (const [lx, ly, lr] of lobes) { const q = Math.hypot(nx - lx, ny - ly) / lr; if (q < 1) m = Math.max(m, Math.sqrt(1 - q * q) * (0.78 + 0.22 * lr)); } return m; };
    const hgt = (nx, ny) => field(nx, ny) * (0.8 + 0.45 * fbm(nx * 1.8 + 4, ny * 1.8 + 4, seed + 5));
    const L = [-0.5, -0.62, 0.6], e = 0.04;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - S / 2) / (S / 2), ny = (y + 0.5 - S / 2) / (S / 2), hv = hgt(nx, ny), i = y * S + x;
      if (hv <= 0.001) continue;
      const gx = (hgt(nx + e, ny) - hgt(nx - e, ny)) / (2 * e), gy = (hgt(nx, ny + e) - hgt(nx, ny - e)) / (2 * e);
      const nn = Math.hypot(gx * 0.9, gy * 0.9, 1), lam = clamp((-gx * 0.9 * L[0] - gy * 0.9 * L[1] + L[2]) / nn, 0, 1);
      al[i] = sm(hv / 0.5) * 0.84; tn[i] = clamp(0.32 + 0.72 * Math.pow(lam, 0.9) + 0.3 * (hv - 0.4), 0, 1) * al[i];
    }
    const tmp = new Float32Array(S * S), R = 2;
    const blur = (f) => { for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let acc = 0; for (let q = -R; q <= R; q++) acc += f[y * S + clamp(x + q, 0, S - 1)]; tmp[y * S + x] = acc / (2 * R + 1); }
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let acc = 0; for (let q = -R; q <= R; q++) acc += tmp[clamp(y + q, 0, S - 1) * S + x]; f[y * S + x] = acc / (2 * R + 1); }
    } };
    blur(al); blur(tn);
    for (let i = 0; i < S * S; i++) tn[i] = al[i] > 0.003 ? tn[i] / al[i] : 0;
    return { al, tn };
  }
  function tint(sh, lit, shade, gain, off, amul) {
    const S = SH, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data;
    for (let i = 0; i < S * S; i++) { const a = sh.al[i]; if (a <= 0.003) continue; const t = clamp(sh.tn[i] * gain + off, 0, 1); d[i * 4] = mix(shade[0], lit[0], t); d[i * 4 + 1] = mix(shade[1], lit[1], t); d[i * 4 + 2] = mix(shade[2], lit[2], t); d[i * 4 + 3] = 255 * a * amul; }
    g.putImageData(im, 0, 0); return c;
  }
  const radial = (S, stops) => { const c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"), r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); stops.forEach(([o, col]) => r.addColorStop(o, col)); g.fillStyle = r; g.fillRect(0, 0, S, S); return c; };
  const shapes = []; let shapesDone = false;
  const sets = {};
  function sprites() {
    const key = dark ? "d" : "l"; if (sets[key]) return sets[key];
    if (!shapesDone) { for (let i = 0; i < 8; i++) shapes.push(shape(i * 7 + 3)); shapesDone = true; }
    const pal = dark
      ? { n: [[222, 226, 234], [48, 52, 62]], w: [[255, 214, 150], [118, 50, 22]], k: [[120, 114, 110], [24, 22, 22]] }
      : { n: [[255, 255, 255], [128, 136, 152]], w: [[255, 232, 190], [190, 100, 52]], k: [[168, 160, 154], [58, 54, 54]] };
    const V = [[1.0, 0.16], [1.0, -0.06], [0.9, -0.3]];       // clair, moyen, ombré
    sets[key] = {
      n: shapes.map((sh) => V.map(([gn, of]) => tint(sh, pal.n[0], pal.n[1], gn, of, 1))),
      w: shapes.map((sh) => [tint(sh, pal.w[0], pal.w[1], 1.0, 0.1, 1), tint(sh, pal.w[0], pal.w[1], 0.9, -0.15, 1)]),
      k: shapes.map((sh) => tint(sh, pal.k[0], pal.k[1], 1, 0, 0.9)),
      outer: radial(96, [[0, "rgba(255,92,24,.5)"], [0.45, "rgba(228,66,18,.28)"], [1, "rgba(200,40,10,0)"]]),
      mid: radial(96, [[0, "rgba(255,226,110,.95)"], [0.4, "rgba(255,160,44,.6)"], [1, "rgba(255,100,20,0)"]]),
      core: radial(96, [[0, "rgba(255,255,248,1)"], [0.38, "rgba(255,240,176,.8)"], [1, "rgba(255,224,130,0)"]]),
      bloom: radial(128, [[0, "rgba(255,228,170,.55)"], [0.5, "rgba(255,170,80,.2)"], [1, "rgba(255,140,60,0)"]]),
      glow: radial(128, [[0, "rgba(255,170,90,.62)"], [0.55, "rgba(255,130,50,.24)"], [1, "rgba(255,110,40,0)"]]),
      spark: radial(24, [[0, "rgba(255,250,220,1)"], [0.35, "rgba(255,196,96,.9)"], [1, "rgba(255,120,30,0)"]]),
      scorch: radial(128, [[0, "rgba(20,18,18,.85)"], [0.55, "rgba(30,26,26,.55)"], [0.85, "rgba(40,36,36,.18)"], [1, "rgba(40,36,36,0)"]]),
      mist: radial(128, [[0, "rgba(255,255,255,0)"], [0.4, "rgba(255,255,255,0)"], [0.7, "rgba(255,255,255,.5)"], [0.88, "rgba(235,240,250,.22)"], [1, "rgba(235,240,250,0)"]]),
    };
    return sets[key];
  }

  // ---- primitives de tracé (coordonnées de la boîte du dessin), sur le canvas courant
  const blob = (img, x, y, w, h, ang, a, comp) => {
    if (a <= 0.004 || w < 0.3) return;
    ctx.globalAlpha = Math.min(1, a); if (comp) ctx.globalCompositeOperation = comp;
    const c = Math.cos(ang), s = Math.sin(ang), k = Lc.k;
    ctx.setTransform(c * w * k, s * w * k, -s * h * k, c * h * k, Lc.ox + x * k, Lc.oy + y * k);
    ctx.drawImage(img, -0.5, -0.5, 1, 1);
    if (comp) ctx.globalCompositeOperation = "source-over";
  };
  const onGround = (img, x, y, gz, R, a, comp, rot) => {   // disque posé sur le plan z = gz, en perspective
    if (a <= 0.004) return;
    const c = pr(x, y, gz), cs = Math.cos(rot || 0), sn = Math.sin(rot || 0), k = Lc.k;
    const ax = ex[0] * cs + ey[0] * sn, ay = ex[1] * cs + ey[1] * sn, bx = -ex[0] * sn + ey[0] * cs, by = -ex[1] * sn + ey[1] * cs;
    ctx.globalAlpha = Math.min(1, a); if (comp) ctx.globalCompositeOperation = comp;
    ctx.setTransform(ax * 2 * R * k, ay * 2 * R * k, bx * 2 * R * k, by * 2 * R * k, Lc.ox + c[0] * k, Lc.oy + c[1] * k);
    ctx.drawImage(img, -0.5, -0.5, 1, 1);
    if (comp) ctx.globalCompositeOperation = "source-over";
  };

  // ---- lumière de flamme en un point du monde : somme des flammes actives, décroissance quadratique
  let LIGHTS = [];
  const lightAt = (x, y, z) => { let v = 0; for (const F of LIGHTS) { const d = Math.hypot(x - F.x, y - F.y, (z - F.z) * 0.6) / (F.light || 80); if (d < 1) v += F.p * (1 - d) * (1 - d); } return Math.min(1, v); };

  // ---- fumée : émetteurs à débit constant, particule j née à j / rate, position analytique
  // E : { t0, t1, rate, life, seed, kind: blast|trail|column|ball, o:[x,y,z] | path(te), ref:[x,y], v:[min,max], r:[r0,r1], rise:[min,max], a, warm, warmT, soot, wind, zspan }
  function smokeItems(E, s, out, S) {
    if (s < E.t0) return;
    const j0 = Math.max(Math.ceil(E.t0 * E.rate), Math.ceil((s - E.life) * E.rate)), j1 = Math.min(Math.floor(E.t1 * E.rate), Math.floor(s * E.rate));
    const ref = E.ref || E.o || E.path(E.t0), refY = pr(ref[0], ref[1], 0)[1], zb = E.zb != null ? E.zb : (E.o ? E.o[2] : 0), zspan = E.zspan || 60;
    for (let j = j0; j <= j1; j++) {
      const te = j / E.rate, a = s - te; if (a < 0 || a > E.life) continue;
      const q = j * 7 + E.seed * 101, h1 = hh(q + 1), h2 = hh(q + 2), h3 = hh(q + 3), h4 = hh(q + 4), h5 = hh(q + 5), h6 = hh(q + 6), u = a / E.life;
      const grow = 1 - Math.exp(-a * (E.grow || 1.2)), R = mix(E.r[0], E.r[1], grow) * (0.7 + 0.6 * h3);
      let x, y, z;
      if (E.kind === "blast") {                       // nuage radial qui roule au sol, le bord se retourne vers le haut (tore)
        const th = h1 * TAU + (E.skew || 0), jet = 0.6 + 0.8 * Math.pow(Math.abs(Math.cos(th - (E.axis || 0))), 2), vv = mix(E.v[0], E.v[1], h2), v = vv * jet, kd = E.drag || 0.85;
        const rr = v * (1 - Math.exp(-kd * a)) / kd + (E.r0 || 4), edge = Math.pow(vv / E.v[1], 1.6);
        x = E.o[0] + Math.cos(th) * rr + (E.wind ? E.wind[0] * a * a * 0.14 : 0); y = E.o[1] + Math.sin(th) * rr + (E.wind ? E.wind[1] * a * a * 0.14 : 0);
        z = E.o[2] + R * 0.3 + mix(E.rise[0], E.rise[1], h4) * (0.25 + 0.75 * edge) * (1 - Math.exp(-a * 0.75));
      } else if (E.kind === "trail") {                // traînée : naît sur la trajectoire, dérive au vent, s'étale en se tordant
        const p = E.path(te), sp = mix(1.5, 8, h2) * (1 - Math.exp(-a * 1.2)), th = h1 * TAU, dr = 1 - Math.exp(-a * 0.5);
        x = p[0] + Math.cos(th) * sp + E.wind[0] * dr * 2.4; y = p[1] + Math.sin(th) * sp + E.wind[1] * dr * 2.4;
        z = p[2] + mix(E.rise[0], E.rise[1], h4) * a * 0.5;
      } else if (E.kind === "ball") {                 // gaz éjectés dans toutes les directions
        const th = h1 * TAU, ph = Math.acos(2 * h2 - 1), rr = mix(E.v[0], E.v[1], h4) * (1 - Math.exp(-1.6 * a)) / 1.6;
        x = E.o[0] + Math.sin(ph) * Math.cos(th) * rr; y = E.o[1] + Math.sin(ph) * Math.sin(th) * rr; z = E.o[2] + Math.cos(ph) * rr * 1.1 + (E.rise ? E.rise[0] * a : 0);
      } else {                                        // fût : colonne qui monte, légère dérive
        const th = h1 * TAU, rr = mix(E.v[0], E.v[1], h2) * (1 - Math.exp(-a * 1.1));
        x = E.o[0] + Math.cos(th) * rr + (E.wind ? E.wind[0] * a * 0.9 : 0); y = E.o[1] + Math.sin(th) * rr + (E.wind ? E.wind[1] * a * 0.9 : 0);
        z = E.o[2] + mix(E.rise[0], E.rise[1], h4) * (1 - Math.exp(-a * 0.6)) * 1.3;
      }
      const sw = R * 0.32 * grow, ph = a * 0.9 + h5 * TAU;     // tourbillon : les bouffées tournent autour de leur centre moyen
      x += Math.cos(ph) * sw; y += Math.sin(ph * 1.13 + h6 * 6) * sw; z += Math.sin(ph * 0.8 + h1 * 6) * sw * 0.55;
      const env = sm(a / 0.16) * Math.pow(1 - u, 1.3), al = E.a * env * (0.72 + 0.28 * h5) * (dark ? 0.8 : 1); if (al < 0.01) continue;
      const p = pr(x, y, z), size = R * UN * 2.5, wrm = clamp(Math.max((E.warm || 0) * Math.max(0, 1 - a / (E.warmT || 1.1)), lightAt(x, y, z) * 0.95), 0, 1);
      const sootK = E.soot ? Math.max(0, 1 - a / E.soot) : 0, layer = pr(x, y, 0)[1] < refY ? 1 : 0;
      const shade = clamp(0.1 + (1 - clamp((z - zb) / zspan, 0, 1)) * 1.7 + (h6 - 0.5) * 0.9, 0, 2.99), vi = shade | 0, si = (j + E.seed * 3) & 7, rot = h5 * TAU + a * (h1 - 0.5) * 0.5;
      out[layer].push({ d: pr(x, y, 0)[1] + z * 0.04, f: () => {
        if (sootK > 0.02) blob(S.k[si], p[0], p[1], size, size, rot, al * sootK * 0.5);
        if (wrm > 0.02) blob(S.w[si][vi > 1 ? 1 : 0], p[0], p[1], size, size, rot, al * wrm);
        blob(S.n[si][vi], p[0], p[1], size, size, rot, al * (1 - wrm * 0.7) * (1 - sootK * 0.3));
      } });
    }
  }

  // ---- flamme : tranches le long de l'axe (halo rouge, corps orange, cœur blanc), langues, diamants de choc, suie, étincelles, lueur sur le véhicule
  // F : { x, y, z, dir:[dx,dy,dz], len, w, p, seed, ground, sheet, light }
  function flameItem(F, s, out, S) {
    if (F.p < 0.02) return;
    const dir = F.dir || [0, 0, -1], N = 34, p0 = pr(F.x, F.y, F.z), seed = F.seed || 0;
    let len = F.len; if (F.ground != null && dir[2] < 0) len = Math.min(len, (F.z - F.ground) / -dir[2] + 3);
    const fl = 0.9 + 0.07 * Math.sin(s * 37 + seed) + 0.04 * Math.sin(s * 61 + seed * 3);
    const pt = (u) => pr(F.x + dir[0] * len * u * fl, F.y + dir[1] * len * u * fl, F.z + dir[2] * len * u * fl);
    const add = dark ? "lighter" : null, ground = F.ground != null && dir[2] < 0 && (F.z - F.ground) < F.len * 0.9;
    out[0].push({ d: 1e6, f: () => {
      if (ground) {                                   // la flamme s'écrase sur le sol et s'étale en nappe
        const R = (F.sheet || 20) * (0.6 + 0.4 * F.p), pulse = 1 + 0.06 * Math.sin(s * 23 + seed);
        onGround(S.glow, F.x, F.y, F.ground, R * 2.7 * pulse, 0.85 * F.p, dark ? "lighter" : "multiply");
        onGround(S.outer, F.x, F.y, F.ground, R * 1.3 * pulse, 0.75 * F.p, null, s * 0.3);
        for (let j = 0; j < 16; j++) { const th = hh(j + seed * 31) * TAU, r = R * (0.3 + 0.9 * ((s * 1.5 + hh(j + 40)) % 1)), a = 1 - r / (R * 1.3); onGround(S.mid, F.x + Math.cos(th) * r, F.y + Math.sin(th) * r, F.ground, R * 0.3, 0.55 * a * F.p, add); }
        onGround(S.mid, F.x, F.y, F.ground, R * 0.8 * pulse, 0.95 * F.p, add, s * 0.5);
        onGround(S.core, F.x, F.y, F.ground, R * 0.36 * pulse, 0.95 * F.p, add);
        // étincelles : jets balistiques qui rebondissent sur la dalle
        for (let j = 0; j < 22; j++) {
          const T = 0.9 + 0.8 * hh(j + 120), ph = ((s / T) + hh(j + 130)) % 1, th = hh(j + 140) * TAU, v = R * (0.9 + 1.4 * hh(j + 150)), tt = ph * T;
          const rr = v * tt * 0.9, zz = 14 * hh(j + 160) * (4 * ph * (1 - ph)) * (0.6 + F.p), sp = pr(F.x + Math.cos(th) * rr, F.y + Math.sin(th) * rr, F.ground + zz);
          blob(S.spark, sp[0], sp[1], 3.2 * (1 - ph * 0.5), 3.2 * (1 - ph * 0.5), 0, (1 - ph) * 0.95 * F.p, add);
        }
      }
      // halo de lumière et lueur chaude sur le véhicule et la structure
      blob(S.bloom, p0[0], p0[1] + len * UZ * 0.25, F.w * 7, F.w * 7 + len * UZ * 0.7, 0, 0.6 * F.p, dark ? "lighter" : "multiply");
      blob(S.glow, p0[0], p0[1] - F.w * 3.2, F.w * 6.5, F.w * 9.5, 0, 0.5 * F.p, dark ? "lighter" : "multiply");
      const sway = (u) => (vn1(u * 3.4 - s * 7.5, seed) - 0.5) * 1.5 + (vn1(u * 9 - s * 15, seed + 5) - 0.5) * 0.5;
      for (let pass = 0; pass < 3; pass++) {
        const img = pass === 0 ? S.outer : pass === 1 ? S.mid : S.core, wscale = pass === 0 ? 1.6 : pass === 1 ? 1 : 0.5, lim = pass === 2 ? 0.6 : 1, comp = pass === 0 ? (dark ? "lighter" : null) : add;
        for (let i = 0; i < N; i++) {
          const u = (i + 0.5) / N; if (u > lim) break;
          const c = pt(u), c2 = pt(Math.min(1, u + 0.04)), ang = Math.atan2(c2[1] - c[1], c2[0] - c[0]) + Math.PI / 2;
          const rad = F.w * (1 + 0.5 * sm(u / 0.28)) * (1 - 0.8 * sm((u - 0.3) / 0.7)) * wscale, step = Math.hypot(pt(u + 0.02)[0] - pt(u - 0.02)[0], pt(u + 0.02)[1] - pt(u - 0.02)[1]) || 4;
          const al = F.p * (1 - sm(Math.pow(u, 1.25))) * (pass === 0 ? 0.5 : pass === 1 ? 0.78 : 0.95) * (0.55 + 0.45 * sm(u / 0.05)) * (dark ? 0.72 : 1);
          blob(img, c[0] + sway(u) * F.w * u * 0.9, c[1], rad * 2.4, Math.max(rad * 1.6, step * 3.2), ang - Math.PI / 2, al, comp);
        }
      }
      // suie : volutes sombres qui s'échappent de la queue de flamme
      if (!ground) for (let j = 0; j < 8; j++) { const ph = ((s * 0.9 + hh(j + 170) + seed * 0.1) % 1), u = 0.55 + ph * 0.5, c = pt(Math.min(1, u)), off = (hh(j + 180) - 0.5) * F.w * 2.4 * (0.5 + u) + sway(u) * F.w * 0.7, rr = F.w * mix(0.8, 1.6, ph); blob(S.k[(j + seed) & 7], c[0] + off, c[1] + ph * 14, rr * 2.2, rr * 2.2, hh(j + 190) * TAU, 0.3 * (1 - ph) * F.p * (dark ? 0.6 : 1)); }
      // langues arrachées
      for (let j = 0; j < 20; j++) {
        const ph = ((s * (1.5 + hh(j + 70) * 0.9) + hh(j + seed * 17)) % 1), u = 0.12 + ph * 0.95, c = pt(Math.min(1, u)), off = (hh(j + 90) - 0.5) * F.w * 2.2 * (0.4 + u) + sway(u) * F.w * 0.6;
        const rr = F.w * mix(0.55, 0.15, ph), al = F.p * (1 - ph) * 0.7;
        blob(S.mid, c[0] + off, c[1] + u * len * UZ * 0.05, rr * 2.2, rr * 3.2, 0, al, add); if (ph < 0.5) blob(S.core, c[0] + off, c[1], rr * 1.1, rr * 1.6, 0, al * 0.7, add);
      }
      // diamants de choc
      if (F.p > 0.5) for (let i = 0; i < 4; i++) { const u = 0.17 + i * 0.14 + 0.012 * Math.sin(s * 26 + i), c = pt(u), rr = F.w * (0.55 - i * 0.07) * (0.9 + 0.1 * Math.sin(s * 44 + i * 2)); blob(S.core, c[0], c[1], rr * 2.2, rr * 3, 0, (0.8 - i * 0.13) * F.p, add); }
      // éclat à la tuyère
      blob(S.core, p0[0], p0[1] + 2, F.w * 2.4, F.w * 1.6, 0, (dark ? 0.6 : 0.9) * F.p, add);
    } });
  }

  // anneau de choc au sol
  function ringItem(R, s, out, S) {
    const u = (s - R.t) / (R.dur || 1.4); if (u < 0 || u > 1) return;
    out[0].push({ d: pr(R.x, R.y, 0)[1] - 1, f: () => {
      const r = mix(R.r0 || 6, R.r1 || 70, 1 - Math.pow(1 - u, 2.2)), a = Math.pow(1 - u, 1.6) * (R.a || 0.5), c = pr(R.x, R.y, R.z || 1), k = Lc.k;
      ctx.globalAlpha = a; ctx.strokeStyle = dark ? "rgba(235,238,245,1)" : "rgba(120,126,140,1)";
      ctx.setTransform(ex[0] * k, ex[1] * k, ey[0] * k, ey[1] * k, Lc.ox + c[0] * k, Lc.oy + c[1] * k); ctx.lineWidth = Math.max(0.6, 2.4 * (1 - u)) / UN; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    } });
  }

  // brume de condensation autour du véhicule (anneau horizontal)
  function mistItem(M, s, out, S) {
    if (M.a < 0.01) return;
    out[0].push({ d: pr(M.x, M.y, 0)[1] + 2, f: () => { onGround(S.mist, M.x, M.y, M.z, M.r, M.a, null, s * 0.2); onGround(S.mist, M.x, M.y, M.z - 3, M.r * 1.35, M.a * 0.5, null, -s * 0.15); } });
  }

  // ---- traces et ombres sur le canvas arrière : D = [{ k:'scorch', x, y, gz, R, a } | { k:'shadow', x, y, z0, z1, r, a }]
  function decals(D, S) {
    const g = ctx, k = Lc.k;
    for (const d of D) {
      if (d.a < 0.01) continue;
      if (d.k === "scorch") onGround(S.scorch, d.x, d.y, d.gz, d.R, d.a * (dark ? 0.9 : 0.7), null, d.rot || 0);
      else if (d.k === "shadow") {
        const T = 0.3, gzz = d.gz || 0.8, c = pr(0, 0, gzz), x0 = d.x + SUN[0] * d.z0 * T, y0 = d.y + SUN[1] * d.z0 * T, x1 = d.x + SUN[0] * d.z1 * T, y1 = d.y + SUN[1] * d.z1 * T;
        g.setTransform(ex[0] * k, ex[1] * k, ey[0] * k, ey[1] * k, Lc.ox + c[0] * k, Lc.oy + c[1] * k); g.lineCap = "round"; g.strokeStyle = dark ? "rgb(0,0,0)" : "rgb(40,44,56)";
        for (const [wm, am] of [[2.4, 0.18], [1.8, 0.28], [1.2, 0.4], [0.7, 0.5]]) { g.globalAlpha = d.a * am * (dark ? 1.2 : 0.4); g.lineWidth = 2 * d.r * wm * (0.9 + 0.1 * wm); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
      }
    }
  }

  // ---- image : tout ce qui brûle, fume, jette une ombre ou éclaire à l'instant s
  let wasActive = true;
  const alive = (s, emitters, flames, ex2) => flames.some((F) => F.p > 0.02) || emitters.some((E) => s >= E.t0 && s <= E.t1 + E.life) || (ex2.decals || []).some((d) => d.a > 0.01) || (ex2.mists || []).some((m) => m.a > 0.01) || (ex2.flash || 0) > 0.01;
  function frame(s, emitters, flames, rings, extras) {
    const act = alive(s, emitters, flames, extras || {});
    if (!act && !wasActive) return;                    // rien à tracer : on ne touche plus aux canvas
    wasActive = act;
    fit(); theme(performance.now());
    const S = sprites(), items = [[], []], ex2 = extras || {};
    LIGHTS = flames.filter((F) => F.p > 0.05);
    for (const l of layers) { const g = l.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, l.cv.width, l.cv.height); }
    if (backEl) { ctx = layers[1].g; Lc = layers[1]; decals(ex2.decals || [], S); }
    for (const E of emitters) smokeItems(E, s, items, S);
    for (const F of flames) flameItem(F, s, items, S);
    for (const R of rings || []) ringItem(R, s, items, S);
    for (const M of ex2.mists || []) mistItem(M, s, items, S);
    for (let li = 0; li < 2; li++) {
      const arr = items[li].sort((a, b) => a.d - b.d); ctx = layers[backEl ? li : 0].g; Lc = layers[backEl ? li : 0];
      for (const it of arr) it.f();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    if ((ex2.flash || 0) > 0.01) { ctx = layers[0].g; Lc = layers[0]; const fg = ctx; fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = dark ? "lighter" : "multiply"; fg.globalAlpha = (dark ? 0.1 : 0.12) * ex2.flash; fg.fillStyle = "rgb(255,176,96)"; fg.fillRect(0, 0, layers[0].cv.width, layers[0].cv.height); fg.globalCompositeOperation = "source-over"; fg.globalAlpha = 1; }
  }
  return { frame, SUN };
}

// Feu et fumée réalistes : un canvas posé sur le dessin, recalé sur la projection du SVG.
// Tout est une fonction pure du temps (émetteurs indexés par un entier, hasard par hash) : at(t) rend la même image.
// Inliné dans le script vivant des figures « fusée » (pas de backtick ici : le fichier est inséré tel quel).
function makeBurn(stage, svg, VBW, VBH, pr) {
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none";
  if (getComputedStyle(stage).position === "static") stage.style.position = "relative";
  stage.appendChild(cv);
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, u) => a + (b - a) * u;
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hh = (n) => { let h = Math.imul((n | 0) + 7, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (Math.imul(h, 3266489917) >>> 0) / 4294967296; };
  const vn1 = (x, sd) => { const i = Math.floor(x), f = sm(x - i); return mix(hh(i * 131 + sd * 977), hh((i + 1) * 131 + sd * 977), f); };

  // ---- repère : unités d'écran par unité monde
  const o3 = pr(0, 0, 0), ex = [pr(1, 0, 0)[0] - o3[0], pr(1, 0, 0)[1] - o3[1]], ey = [pr(0, 1, 0)[0] - o3[0], pr(0, 1, 0)[1] - o3[1]];
  const UZ = Math.abs(pr(0, 0, 1)[1] - o3[1]), UN = (Math.hypot(ex[0], ex[1]) + Math.hypot(ey[0], ey[1])) / 4 + UZ / 2;
  let k = 1, ox = 0, oy = 0, dpr = 1, dark = false, themeAt = -1e9;

  function fit() {
    const r = svg.getBoundingClientRect(), rs = stage.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(rs.width * dpr)), H = Math.max(1, Math.round(rs.height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    k = r.width / VBW * dpr; ox = (r.left - rs.left) * dpr; oy = (r.top - rs.top) * dpr;
  }
  function theme(now) {
    if (now - themeAt < 400) return; themeAt = now;
    const c = (getComputedStyle(stage).getPropertyValue("--anatomy-paper") || "#fff").trim();
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c); const nd = m ? (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) < 110 : false;
    if (nd !== dark) { dark = nd; }
  }

  // ---- bruit pour fabriquer les nuages
  const H2 = (x, y, sd) => { let h = Math.imul(x * 374761393 + y * 668265263 + sd * 1442695041, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y, sd) => { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi); const a = H2(xi, yi, sd), b = H2(xi + 1, yi, sd), c = H2(xi, yi + 1, sd), d = H2(xi + 1, yi + 1, sd); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  const fbm = (x, y, sd) => (0.58 * vn(x, y, sd) + 0.29 * vn(x * 2.03, y * 2.03, sd + 1) + 0.13 * vn(x * 4.1, y * 4.1, sd + 2));

  // nuage éclairé de haut-gauche : relief déduit du bruit, ombre propre côté bas-droit, bords qui s'effilent
  function cloud(seed, lit, shade, S) {
    const c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"), im = g.createImageData(S, S), d = im.data;
    // quelques lobes arrondis : le contour est un cercle déformé par un bruit lent, le relief une calotte bosselée
    const lobes = Array.from({ length: 6 }, (_, i) => { const a = hh(seed * 13 + i) * TAU, r = 0.18 + 0.34 * hh(seed * 17 + i + 3); return [Math.cos(a) * r, Math.sin(a) * r, 0.34 + 0.2 * hh(seed * 19 + i + 6)]; });
    const field = (nx, ny) => { let m = 0; for (const [lx, ly, lr] of lobes) { const q = Math.hypot(nx - lx, ny - ly) / lr; if (q < 1) m = Math.max(m, Math.sqrt(1 - q * q) * (0.75 + 0.25 * lr)); } return m; };
    const hgt = (nx, ny) => field(nx, ny) * (0.8 + 0.4 * fbm(nx * 1.6 + 4, ny * 1.6 + 4, seed + 5));
    const L = [-0.5, -0.6, 0.62], e = 0.035;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - S / 2) / (S / 2), ny = (y + 0.5 - S / 2) / (S / 2), hv = hgt(nx, ny);
      if (hv <= 0.001) continue;
      const dens = sm(hv / 0.5);
      const gx = (hgt(nx + e, ny) - hgt(nx - e, ny)) / (2 * e), gy = (hgt(nx, ny + e) - hgt(nx, ny - e)) / (2 * e);
      const nl = Math.hypot(gx * 0.9, gy * 0.9, 1), lam = clamp((-gx * 0.9 * L[0] - gy * 0.9 * L[1] + L[2]) / nl, 0, 1), tone = clamp(0.34 + 0.7 * Math.pow(lam, 0.9) + 0.25 * (hv - 0.4), 0, 1);
      const i = (y * S + x) * 4; d[i] = mix(shade[0], lit[0], tone); d[i + 1] = mix(shade[1], lit[1], tone); d[i + 2] = mix(shade[2], lit[2], tone); d[i + 3] = 255 * dens * 0.8;
    }
    // flou léger (alpha prémultiplié) : les bords des bouffées fondent les uns dans les autres
    const f = new Float32Array(S * S * 4);
    for (let i = 0; i < S * S; i++) { const al = d[i * 4 + 3] / 255; f[i * 4] = d[i * 4] * al; f[i * 4 + 1] = d[i * 4 + 1] * al; f[i * 4 + 2] = d[i * 4 + 2] * al; f[i * 4 + 3] = al; }
    const tmp = new Float32Array(f.length), R = 3;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) for (let ch = 0; ch < 4; ch++) { let acc = 0; for (let q = -R; q <= R; q++) acc += f[(y * S + clamp(x + q, 0, S - 1)) * 4 + ch]; tmp[(y * S + x) * 4 + ch] = acc / (2 * R + 1); }
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) for (let ch = 0; ch < 4; ch++) { let acc = 0; for (let q = -R; q <= R; q++) acc += tmp[(clamp(y + q, 0, S - 1) * S + x) * 4 + ch]; f[(y * S + x) * 4 + ch] = acc / (2 * R + 1); }
    }
    for (let i = 0; i < S * S; i++) { const al = f[i * 4 + 3]; d[i * 4 + 3] = al * 255; d[i * 4] = al > 0.002 ? f[i * 4] / al : 0; d[i * 4 + 1] = al > 0.002 ? f[i * 4 + 1] / al : 0; d[i * 4 + 2] = al > 0.002 ? f[i * 4 + 2] / al : 0; }
    g.putImageData(im, 0, 0); return c;
  }
  const radial = (S, stops) => { const c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"), r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); stops.forEach(([o, col]) => r.addColorStop(o, col)); g.fillStyle = r; g.fillRect(0, 0, S, S); return c; };
  const sets = {};
  function sprites() {
    const key = dark ? "d" : "l"; if (sets[key]) return sets[key];
    const pal = dark
      ? { n: [[214, 218, 226], [46, 50, 60]], w: [[255, 206, 140], [120, 52, 24]] }
      : { n: [[253, 253, 255], [142, 150, 166]], w: [[255, 228, 182], [188, 104, 56]] };
    const mk = (p, off) => [0, 1, 2, 3, 4].map((i) => cloud(i * 7 + off, p[0], p[1], 150));
    sets[key] = {
      smoke: mk(pal.n, 0), warm: mk(pal.w, 0),
      outer: radial(96, [[0, "rgba(255,92,24,.5)"], [0.45, "rgba(228,66,18,.28)"], [1, "rgba(200,40,10,0)"]]),
      mid: radial(96, [[0, "rgba(255,226,110,.95)"], [0.4, "rgba(255,160,44,.6)"], [1, "rgba(255,100,20,0)"]]),
      core: radial(96, [[0, "rgba(255,255,248,1)"], [0.38, "rgba(255,240,176,.8)"], [1, "rgba(255,224,130,0)"]]),
      bloom: radial(128, [[0, "rgba(255,228,170,.55)"], [0.5, "rgba(255,170,80,.2)"], [1, "rgba(255,140,60,0)"]]),
      glow: radial(128, [[0, "rgba(255,170,90,.62)"], [0.55, "rgba(255,130,50,.24)"], [1, "rgba(255,110,40,0)"]]),
      ring: null,
    };
    return sets[key];
  }

  // ---- primitives de tracé (coordonnées de la boîte du dessin)
  const blob = (img, x, y, w, h, ang, a, comp) => {
    if (a <= 0.004 || w < 0.3) return;
    ctx.globalAlpha = Math.min(1, a); if (comp) ctx.globalCompositeOperation = comp;
    const c = Math.cos(ang), s = Math.sin(ang);
    ctx.setTransform(c * w * k, s * w * k, -s * h * k, c * h * k, ox + x * k, oy + y * k);
    ctx.drawImage(img, -0.5, -0.5, 1, 1);
    if (comp) ctx.globalCompositeOperation = "source-over";
  };
  const onGround = (img, x, y, gz, R, a, comp, rot) => {   // disque posé sur le plan z = gz, en perspective
    if (a <= 0.004) return;
    const c = pr(x, y, gz), cs = Math.cos(rot || 0), sn = Math.sin(rot || 0);
    const ax = ex[0] * cs + ey[0] * sn, ay = ex[1] * cs + ey[1] * sn, bx = -ex[0] * sn + ey[0] * cs, by = -ex[1] * sn + ey[1] * cs;
    ctx.globalAlpha = Math.min(1, a); if (comp) ctx.globalCompositeOperation = comp;
    ctx.setTransform(ax * 2 * R * k, ay * 2 * R * k, bx * 2 * R * k, by * 2 * R * k, ox + c[0] * k, oy + c[1] * k);
    ctx.drawImage(img, -0.5, -0.5, 1, 1);
    if (comp) ctx.globalCompositeOperation = "source-over";
  };

  // ---- fumée : émetteurs à débit constant, particule j née à j / rate, position analytique
  // E : { t0, t1, rate, life, seed, kind, o:[x,y,z] | path(te), v:[min,max], r:[r0,r1], rise:[min,max], a, warm, wind:[wx,wy], white }
  function smokeItems(E, s, out, S) {
    if (s < E.t0) return;
    const j0 = Math.max(Math.ceil(E.t0 * E.rate), Math.ceil((s - E.life) * E.rate)), j1 = Math.min(Math.floor(E.t1 * E.rate), Math.floor(s * E.rate));
    for (let j = j0; j <= j1; j++) {
      const te = j / E.rate, a = s - te; if (a < 0 || a > E.life) continue;
      const q = j * 5 + E.seed * 101, h1 = hh(q + 1), h2 = hh(q + 2), h3 = hh(q + 3), h4 = hh(q + 4), h5 = hh(q + 5), u = a / E.life;
      let x, y, z;
      const grow = 1 - Math.exp(-a * (E.grow || 1.3));
      const R = mix(E.r[0], E.r[1], grow) * (0.75 + 0.5 * h3);
      if (E.kind === "blast") {                       // nuage radial qui roule au sol puis monte
        const th = h1 * TAU + (E.skew || 0), jet = 0.55 + 0.9 * Math.pow(Math.abs(Math.cos(th - (E.axis || 0))), 2), v = mix(E.v[0], E.v[1], h2) * jet, kd = E.drag || 0.85;
        const rr = v * (1 - Math.exp(-kd * a)) / kd + (E.r0 || 4);
        x = E.o[0] + Math.cos(th) * rr + (E.wind ? E.wind[0] * a * a * 0.12 : 0); y = E.o[1] + Math.sin(th) * rr + (E.wind ? E.wind[1] * a * a * 0.12 : 0);
        z = E.o[2] + R * 0.35 + mix(E.rise[0], E.rise[1], h4) * (1 - Math.exp(-a * 0.7));
      } else if (E.kind === "trail") {                // traînée : naît sur la trajectoire, dérive au vent, s'étale
        const p = E.path(te), sp = mix(1.5, 7, h2) * (1 - Math.exp(-a * 1.2)), th = h1 * TAU;
        x = p[0] + Math.cos(th) * sp + E.wind[0] * (1 - Math.exp(-a * 0.5)) * 2.4; y = p[1] + Math.sin(th) * sp + E.wind[1] * (1 - Math.exp(-a * 0.5)) * 2.4;
        z = p[2] + mix(E.rise[0], E.rise[1], h4) * a * 0.5;
      } else {                                        // fût : colonne qui monte, légère dérive
        const th = h1 * TAU, rr = mix(E.v[0], E.v[1], h2) * (1 - Math.exp(-a * 1.1));
        x = E.o[0] + Math.cos(th) * rr + (E.wind ? E.wind[0] * a * 0.9 : 0); y = E.o[1] + Math.sin(th) * rr + (E.wind ? E.wind[1] * a * 0.9 : 0);
        z = E.o[2] + mix(E.rise[0], E.rise[1], h4) * (1 - Math.exp(-a * 0.6)) * 1.3;
      }
      const env = sm(a / 0.16) * Math.pow(1 - u, 1.35), al = E.a * env * (0.75 + 0.25 * h5) * (dark ? 0.78 : 1); if (al < 0.01) continue;
      const p = pr(x, y, z), size = R * UN * 2.5, wrm = (E.warm || 0) * Math.max(0, 1 - a / (E.warmT || 1.1));
      out.push({ d: pr(x, y, 0)[1] + z * 0.04, f: () => {
        const sp = S.smoke[(j + E.seed) % 5];
        if (wrm > 0.02) { blob(S.warm[(j + E.seed) % 5], p[0], p[1], size, size, h5 * TAU, al * wrm); blob(sp, p[0], p[1], size, size, h5 * TAU, al * (1 - wrm)); }
        else blob(sp, p[0], p[1], size, size, h5 * TAU + a * (h1 - 0.5) * 0.5, al);
      } });
    }
  }

  // ---- flamme : tranches le long de l'axe (halo rouge, corps orange, cœur blanc), langues, diamants de choc, éclat à la tuyère
  // F : { x, y, z, dir:[dx,dy,dz], len, w, p, seed, ground }
  function flameItem(F, s, out, S) {
    if (F.p < 0.02) return;
    const dir = F.dir || [0, 0, -1], N = 30, p0 = pr(F.x, F.y, F.z), seed = F.seed || 0;
    let len = F.len; if (F.ground != null && dir[2] < 0) len = Math.min(len, (F.z - F.ground) / -dir[2] + 3);
    const fl = 0.9 + 0.07 * Math.sin(s * 37 + seed) + 0.04 * Math.sin(s * 61 + seed * 3);
    const pt = (u) => pr(F.x + dir[0] * len * u * fl, F.y + dir[1] * len * u * fl, F.z + dir[2] * len * u * fl);
    const key = 1e6, add = dark ? "lighter" : null;
    out.push({ d: key, f: () => {
      const ground = F.ground != null && dir[2] < 0 && (F.z - F.ground) < F.len * 0.9;
      if (ground) {                                   // la flamme s'écrase sur le sol et s'étale en nappe
        const R = (F.sheet || 20) * (0.6 + 0.4 * F.p), pulse = 1 + 0.06 * Math.sin(s * 23 + seed);
        onGround(S.glow, F.x, F.y, F.ground, R * 2.5 * pulse, 0.85 * F.p, dark ? "lighter" : "multiply");
        onGround(S.outer, F.x, F.y, F.ground, R * 1.25 * pulse, 0.75 * F.p, null, s * 0.3);
        for (let j = 0; j < 14; j++) { const th = hh(j + seed * 31) * TAU, r = R * (0.35 + 0.85 * ((s * 1.5 + hh(j + 40)) % 1)), a = 1 - r / (R * 1.3); onGround(S.mid, F.x + Math.cos(th) * r, F.y + Math.sin(th) * r, F.ground, R * 0.3, 0.55 * a * F.p, add); }
        onGround(S.mid, F.x, F.y, F.ground, R * 0.8 * pulse, 0.95 * F.p, add, s * 0.5);
        onGround(S.core, F.x, F.y, F.ground, R * 0.36 * pulse, 0.95 * F.p, add);
      }
      // halo de lumière
      blob(S.bloom, p0[0], p0[1] + len * UZ * 0.2, F.w * 6.5, F.w * 6.5 + len * UZ * 0.6, 0, 0.55 * F.p, dark ? "lighter" : "multiply");
      const sway = (u) => (vn1(u * 3.4 - s * 7.5, seed) - 0.5) * 1.5 + (vn1(u * 9 - s * 15, seed + 5) - 0.5) * 0.5;
      for (let pass = 0; pass < 3; pass++) {
        const img = pass === 0 ? S.outer : pass === 1 ? S.mid : S.core, wscale = pass === 0 ? 1.55 : pass === 1 ? 1 : 0.5, lim = pass === 2 ? 0.58 : 1, comp = pass === 0 ? (dark ? "lighter" : null) : add;
        for (let i = 0; i < N; i++) {
          const u = (i + 0.5) / N; if (u > lim) break;
          const c = pt(u), c2 = pt(Math.min(1, u + 0.04)), ang = Math.atan2(c2[1] - c[1], c2[0] - c[0]) + Math.PI / 2;
          const rad = F.w * (1 + 0.5 * sm(u / 0.28)) * (1 - 0.82 * sm((u - 0.3) / 0.7)) * wscale, step = Math.hypot(pt(u + 0.02)[0] - pt(u - 0.02)[0], pt(u + 0.02)[1] - pt(u - 0.02)[1]) || 4;
          const al = F.p * (1 - sm(Math.pow(u, 1.25))) * (pass === 0 ? 0.5 : pass === 1 ? 0.78 : 0.95) * (0.55 + 0.45 * sm(u / 0.05)) * (dark ? 0.72 : 1);
          blob(img, c[0] + Math.cos(ang) * 0 + sway(u) * F.w * u * 0.9, c[1], rad * 2.4, Math.max(rad * 1.6, step * 3.2), ang - Math.PI / 2 + Math.PI / 2 * 0, al, comp);
        }
      }
      // langues arrachées
      for (let j = 0; j < 18; j++) {
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

  // anneau de choc au sol : onde qui part de la flamme
  function ringItem(R, s, out, S) {
    const u = (s - R.t) / (R.dur || 1.4); if (u < 0 || u > 1) return;
    out.push({ d: pr(R.x, R.y, 0)[1] - 1, f: () => {
      const r = mix(R.r0 || 6, R.r1 || 70, 1 - Math.pow(1 - u, 2.2)), a = Math.pow(1 - u, 1.6) * (R.a || 0.5), c = pr(R.x, R.y, R.z || 1);
      ctx.globalAlpha = a; ctx.lineWidth = Math.max(0.8, 5 * (1 - u)) * k;
      ctx.strokeStyle = dark ? "rgba(235,238,245,1)" : "rgba(120,126,140,1)";
      ctx.setTransform(ex[0] * k, ex[1] * k, ey[0] * k, ey[1] * k, ox + c[0] * k, oy + c[1] * k); ctx.lineWidth = Math.max(0.6, 2.4 * (1 - u)) * (1 / (UN || 1)); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    } });
  }

  // ---- image : tout ce qui brûle ou fume à l'instant s
  function frame(s, emitters, flames, rings) {
    fit(); theme(performance.now());
    const S = sprites(), items = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, cv.width, cv.height);
    for (const E of emitters) smokeItems(E, s, items, S);
    for (const F of flames) flameItem(F, s, items, S);
    for (const R of rings || []) ringItem(R, s, items, S);
    items.sort((a, b) => a.d - b.d);
    for (const it of items) it.f();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  }
  return { frame, cv };
}

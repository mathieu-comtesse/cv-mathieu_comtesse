// Feu, fumée, ombres et lumière de flamme, en SVG : deux calques dans le dessin.
//  · #burn-back  : derrière la fusée : traces au sol, ombre portée, fumée située derrière l'axe du véhicule
//  · #burn-front : devant : flammes, étincelles, lueur sur la fusée, fumée située devant l'axe
// Les bouffées, flammes et halos sont des <use> de motifs à dégradés radiaux définis une fois dans #burn-defs.
// Tout est une fonction pure du temps (émetteurs indexés par un entier, hasard par hash) : at(t) rend toujours la même image.
// Inliné dans le script vivant des figures « fusée » (pas de backtick ici : le fichier est inséré tel quel).
function makeBurn(stage, svg, VBW, VBH, pr) {
  const gB = svg.querySelector("#burn-back"), gF = svg.querySelector("#burn-front"), defs = svg.querySelector("#burn-defs");
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, u) => a + (b - a) * u;
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hh = (n) => { let h = Math.imul((n | 0) + 7, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (Math.imul(h, 3266489917) >>> 0) / 4294967296; };
  const vn1 = (x, sd) => { const i = Math.floor(x), f = sm(x - i); return mix(hh(i * 131 + sd * 977), hh((i + 1) * 131 + sd * 977), f); };
  const f2 = (v) => v.toFixed(2), f1 = (v) => v.toFixed(1);

  // ---- repère : unités d'écran par unité monde, direction de la lumière (ombres vers le bas-droite de l'écran)
  const o3 = pr(0, 0, 0), ex = [pr(1, 0, 0)[0] - o3[0], pr(1, 0, 0)[1] - o3[1]], ey = [pr(0, 1, 0)[0] - o3[0], pr(0, 1, 0)[1] - o3[1]];
  const UZ = Math.abs(pr(0, 0, 1)[1] - o3[1]), UN = (Math.hypot(ex[0], ex[1]) + Math.hypot(ey[0], ey[1])) / 4 + UZ / 2;
  const det = ex[0] * ey[1] - ex[1] * ey[0], SUN = (() => { const tx = 1, ty = 0.28, wx = (tx * ey[1] - ey[0] * ty) / det, wy = (ex[0] * ty - ex[1] * tx) / det, n = Math.hypot(wx, wy) || 1; return [wx / n, wy / n]; })();
  let dark = false, themeAt = -1e9, defsDark = null;

  // ---- motifs : bouffées de fumée (lobes à dégradé radial éclairé de haut-gauche), disques de feu, halos
  const rgb = (c) => "rgb(" + c.map(Math.round).join(",") + ")", mixc = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
  const NSH = 8;
  const lobesOf = (seed) => Array.from({ length: 6 }, (_, i) => { const a = hh(seed * 13 + i) * TAU, r = 6 + 30 * hh(seed * 17 + i + 3); return [Math.cos(a) * r, Math.sin(a) * r * 0.85, 24 + 14 * hh(seed * 19 + i + 6)]; });
  function buildDefs() {
    const pal = dark
      ? { n: [[226, 230, 238], [46, 50, 60]], w: [[255, 216, 154], [116, 48, 22]], k: [[128, 122, 118], [26, 24, 24]] }
      : { n: [[255, 255, 255], [124, 132, 148]], w: [[255, 234, 192], [188, 98, 50]], k: [[170, 162, 156], [56, 52, 52]] };
    const grad = (id, lit, shade, gain, off, op) => {
      const c = (t) => rgb(mixc(shade, lit, clamp(t * gain + off, 0, 1)));
      return '<radialGradient id="' + id + '" cx=".5" cy=".5" r=".5" fx=".36" fy=".3"><stop offset="0" stop-color="' + c(0.95) + '" stop-opacity="' + f2(0.95 * op) + '"/><stop offset=".5" stop-color="' + c(0.62) + '" stop-opacity="' + f2(0.82 * op) + '"/><stop offset=".82" stop-color="' + c(0.3) + '" stop-opacity="' + f2(0.4 * op) + '"/><stop offset="1" stop-color="' + c(0.2) + '" stop-opacity="0"/></radialGradient>';
    };
    let s = "";
    const GV = [["n0", pal.n, 1.0, 0.16], ["n1", pal.n, 1.0, -0.06], ["n2", pal.n, 0.9, -0.3], ["w0", pal.w, 1.0, 0.1], ["w1", pal.w, 0.9, -0.15], ["k0", pal.k, 1, 0]];
    for (const [id, p, g, o] of GV) s += grad("pg-" + id, p[0], p[1], g, o, 1);
    const rg = (id, stops) => '<radialGradient id="' + id + '">' + stops.map(([o, c, a]) => '<stop offset="' + o + '" stop-color="' + c + '" stop-opacity="' + a + '"/>').join("") + "</radialGradient>";
    s += rg("g-outer", [[0, "#ff5c18", 0.5], [0.45, "#e44212", 0.28], [1, "#c8280a", 0]]) + rg("g-mid", [[0, "#ffe26e", 0.95], [0.4, "#ffa02c", 0.6], [1, "#ff6414", 0]]) + rg("g-core", [[0, "#fffff8", 1], [0.38, "#fff0b0", 0.8], [1, "#ffe082", 0]]);
    s += rg("g-bloom", [[0, "#ffe4aa", 0.55], [0.5, "#ffaa50", 0.2], [1, "#ff8c3c", 0]]) + rg("g-glow", [[0, "#ffaa5a", 0.62], [0.55, "#ff8232", 0.24], [1, "#ff6e28", 0]]) + rg("g-spark", [[0, "#fffadc", 1], [0.35, "#ffc460", 0.9], [1, "#ff781e", 0]]);
    s += rg("g-scorch", [[0, "#141212", 0.85], [0.55, "#1e1a1a", 0.55], [0.85, "#282424", 0.18], [1, "#282424", 0]]) + rg("g-mist", [[0, "#fff", 0], [0.4, "#fff", 0], [0.7, "#fff", 0.5], [0.88, "#ebf0fa", 0.22], [1, "#ebf0fa", 0]]);
    defs.innerHTML = s; defsDark = dark;
  }
  function theme(now) {
    if (now - themeAt < 400 && defsDark !== null) return; themeAt = now;
    const c = (getComputedStyle(stage).getPropertyValue("--anatomy-paper") || "#fff").trim();
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c);
    dark = m ? (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) < 110 : false;
    if (defsDark !== dark) buildDefs();
  }

  // ---- primitives de tracé : chaînes SVG
  const use = (id, tr, a) => (a > 0.004 ? '<circle r=".5" transform="' + tr + '" fill="url(#g-' + id.slice(2) + ')" opacity="' + f2(Math.min(1, a)) + '"/>' : "");
  const circ = (g, x, y, r, a) => (a > 0.004 ? '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="url(#pg-' + g + ')" opacity="' + f2(Math.min(1, a)) + '"/>' : "");
  // bouffée : trois lobes (corps, lobe éclairé en haut-gauche, lobe d'ombre en bas-droite) ; les formes varient avec si
  const puff = (g, si, x, y, r, a) => { const h = hh(si * 31 + 5), h2 = hh(si * 37 + 9); return circ(g, x, y, r, a) + circ(g, x - r * (0.3 + 0.2 * h), y - r * (0.26 + 0.2 * h2), r * (0.5 + 0.12 * h2), a * 0.7); };
  const blob = (id, x, y, w, h, ang, a) => { if (a <= 0.004 || w < 0.3) return ""; const c = Math.cos(ang), s = Math.sin(ang); return use(id, "matrix(" + f2(c * w) + " " + f2(s * w) + " " + f2(-s * h) + " " + f2(c * h) + " " + f1(x) + " " + f1(y) + ")", a); };
  const onGround = (id, x, y, gz, R, a, rot) => {          // disque posé sur le plan z = gz, en perspective
    if (a <= 0.004) return "";
    const c = pr(x, y, gz), cs = Math.cos(rot || 0), sn = Math.sin(rot || 0);
    const ax = ex[0] * cs + ey[0] * sn, ay = ex[1] * cs + ey[1] * sn, bx = -ex[0] * sn + ey[0] * cs, by = -ex[1] * sn + ey[1] * cs;
    return use(id, "matrix(" + f2(ax * 2 * R) + " " + f2(ay * 2 * R) + " " + f2(bx * 2 * R) + " " + f2(by * 2 * R) + " " + f1(c[0]) + " " + f1(c[1]) + ")", a);
  };

  // ---- lumière de flamme en un point du monde : somme des flammes actives, décroissance quadratique
  let LIGHTS = [];
  const lightAt = (x, y, z) => { let v = 0; for (const F of LIGHTS) { const d = Math.hypot(x - F.x, y - F.y, (z - F.z) * 0.6) / (F.light || 80); if (d < 1) v += F.p * (1 - d) * (1 - d); } return Math.min(1, v); };

  // ---- fumée : émetteurs à débit constant, particule j née à j / rate, position analytique
  // E : { t0, t1, rate, life, seed, kind: blast|trail|column|ball, o:[x,y,z] | path(te), ref:[x,y], v:[min,max], r:[r0,r1], rise:[min,max], a, warm, warmT, soot, wind, zspan }
  function smokeItems(E, s, out) {
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
      const env = sm(a / 0.16) * Math.pow(1 - u, 1.3), al = E.a * env * (0.72 + 0.28 * h5) * (dark ? 0.8 : 1); if (al < 0.025) continue;
      const p = pr(x, y, z), rp = R * UN * 0.95, wrm = clamp(Math.max((E.warm || 0) * Math.max(0, 1 - a / (E.warmT || 1.1)), lightAt(x, y, z) * 0.95), 0, 1);
      const sootK = E.soot ? Math.max(0, 1 - a / E.soot) : 0, layer = pr(x, y, 0)[1] < refY ? 1 : 0;
      const shade = clamp(0.1 + (1 - clamp((z - zb) / zspan, 0, 1)) * 1.7 + (h6 - 0.5) * 0.9, 0, 2.99), vi = shade | 0, si = (j + E.seed * 3) & 7;
      let str = "";
      if (sootK > 0.02) str += puff("k0", si, p[0], p[1], rp, al * sootK * 0.5);
      if (wrm > 0.02) str += puff("w" + (vi > 1 ? 1 : 0), si, p[0], p[1], rp, al * wrm);
      str += puff("n" + vi, si, p[0], p[1], rp, al * (1 - wrm * 0.7) * (1 - sootK * 0.3));
      out[layer].push({ d: pr(x, y, 0)[1] + z * 0.04, s: str });
    }
  }

  // ---- flamme : tranches le long de l'axe (halo rouge, corps orange, cœur blanc), langues, diamants de choc, suie, étincelles, lueur sur le véhicule
  // F : { x, y, z, dir:[dx,dy,dz], len, w, p, seed, ground, sheet, light }
  function flameItem(F, s, out) {
    if (F.p < 0.02) return;
    const dir = F.dir || [0, 0, -1], N = 24, p0 = pr(F.x, F.y, F.z), seed = F.seed || 0;
    let len = F.len; if (F.ground != null && dir[2] < 0) len = Math.min(len, (F.z - F.ground) / -dir[2] + 3);
    const fl = 0.9 + 0.07 * Math.sin(s * 37 + seed) + 0.04 * Math.sin(s * 61 + seed * 3);
    const pt = (u) => pr(F.x + dir[0] * len * u * fl, F.y + dir[1] * len * u * fl, F.z + dir[2] * len * u * fl);
    const ground = F.ground != null && dir[2] < 0 && (F.z - F.ground) < F.len * 0.9;
    let mul = "", main = "", soot = "";
    if (ground) {                                     // la flamme s'écrase sur le sol et s'étale en nappe
      const R = (F.sheet || 20) * (0.6 + 0.4 * F.p), pulse = 1 + 0.06 * Math.sin(s * 23 + seed);
      mul += onGround("u-glow", F.x, F.y, F.ground, R * 2.7 * pulse, 0.85 * F.p);
      main += onGround("u-outer", F.x, F.y, F.ground, R * 1.3 * pulse, 0.75 * F.p, s * 0.3);
      for (let j = 0; j < 10; j++) { const th = hh(j + seed * 31) * TAU, r = R * (0.3 + 0.9 * ((s * 1.5 + hh(j + 40)) % 1)), a = 1 - r / (R * 1.3); main += onGround("u-mid", F.x + Math.cos(th) * r, F.y + Math.sin(th) * r, F.ground, R * 0.3, 0.55 * a * F.p); }
      main += onGround("u-mid", F.x, F.y, F.ground, R * 0.8 * pulse, 0.95 * F.p, s * 0.5) + onGround("u-core", F.x, F.y, F.ground, R * 0.36 * pulse, 0.95 * F.p);
      for (let j = 0; j < 14; j++) {                  // étincelles : jets balistiques qui rebondissent sur la dalle
        const T = 0.9 + 0.8 * hh(j + 120), ph = ((s / T) + hh(j + 130)) % 1, th = hh(j + 140) * TAU, v = R * (0.9 + 1.4 * hh(j + 150)), tt = ph * T;
        const rr = v * tt * 0.9, zz = 14 * hh(j + 160) * (4 * ph * (1 - ph)) * (0.6 + F.p), sp = pr(F.x + Math.cos(th) * rr, F.y + Math.sin(th) * rr, F.ground + zz), sz = 3.2 * (1 - ph * 0.5);
        main += blob("u-spark", sp[0], sp[1], sz, sz, 0, (1 - ph) * 0.95 * F.p);
      }
    }
    // halo de lumière et lueur chaude sur le véhicule et la structure
    mul += blob("u-bloom", p0[0], p0[1] + len * UZ * 0.25, F.w * 7, F.w * 7 + len * UZ * 0.7, 0, 0.6 * F.p) + blob("u-glow", p0[0], p0[1] - F.w * 3.2, F.w * 6.5, F.w * 9.5, 0, 0.5 * F.p);
    const sway = (u) => (vn1(u * 3.4 - s * 7.5, seed) - 0.5) * 1.5 + (vn1(u * 9 - s * 15, seed + 5) - 0.5) * 0.5;
    for (let pass = 0; pass < 3; pass++) {
      const img = pass === 0 ? "u-outer" : pass === 1 ? "u-mid" : "u-core", wscale = pass === 0 ? 1.6 : pass === 1 ? 1 : 0.5, lim = pass === 2 ? 0.6 : 1;
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N; if (u > lim) break;
        const c = pt(u), c2 = pt(Math.min(1, u + 0.04)), ang = Math.atan2(c2[1] - c[1], c2[0] - c[0]) + Math.PI / 2;
        const rad = F.w * (1 + 0.5 * sm(u / 0.28)) * (1 - 0.8 * sm((u - 0.3) / 0.7)) * wscale, step = Math.hypot(pt(u + 0.02)[0] - pt(u - 0.02)[0], pt(u + 0.02)[1] - pt(u - 0.02)[1]) || 4;
        const al = F.p * (1 - sm(Math.pow(u, 1.25))) * (pass === 0 ? 0.5 : pass === 1 ? 0.78 : 0.95) * (0.55 + 0.45 * sm(u / 0.05)) * (dark ? 0.72 : 1);
        main += blob(img, c[0] + sway(u) * F.w * u * 0.9, c[1], rad * 2.4, Math.max(rad * 1.6, step * 3.2), ang - Math.PI / 2, al);
      }
    }
    if (!ground) for (let j = 0; j < 5; j++) {         // suie : volutes sombres qui s'échappent de la queue de flamme
      const ph = ((s * 0.9 + hh(j + 170) + seed * 0.1) % 1), u = 0.55 + ph * 0.5, c = pt(Math.min(1, u)), off = (hh(j + 180) - 0.5) * F.w * 2.4 * (0.5 + u) + sway(u) * F.w * 0.7, rr = F.w * mix(0.8, 1.6, ph);
      soot += puff("k0", (j + seed) & 7, c[0] + off, c[1] + ph * 14, rr * 0.9, 0.3 * (1 - ph) * F.p * (dark ? 0.6 : 1));
    }
    for (let j = 0; j < 12; j++) {                    // langues arrachées
      const ph = ((s * (1.5 + hh(j + 70) * 0.9) + hh(j + seed * 17)) % 1), u = 0.12 + ph * 0.95, c = pt(Math.min(1, u)), off = (hh(j + 90) - 0.5) * F.w * 2.2 * (0.4 + u) + sway(u) * F.w * 0.6;
      const rr = F.w * mix(0.55, 0.15, ph), al = F.p * (1 - ph) * 0.7;
      main += blob("u-mid", c[0] + off, c[1] + u * len * UZ * 0.05, rr * 2.2, rr * 3.2, 0, al); if (ph < 0.5) main += blob("u-core", c[0] + off, c[1], rr * 1.1, rr * 1.6, 0, al * 0.7);
    }
    if (F.p > 0.5) for (let i = 0; i < 4; i++) { const u = 0.17 + i * 0.14 + 0.012 * Math.sin(s * 26 + i), c = pt(u), rr = F.w * (0.55 - i * 0.07) * (0.9 + 0.1 * Math.sin(s * 44 + i * 2)); main += blob("u-core", c[0], c[1], rr * 2.2, rr * 3, 0, (0.8 - i * 0.13) * F.p); }   // diamants de choc
    main += blob("u-core", p0[0], p0[1] + 2, F.w * 2.4, F.w * 1.6, 0, (dark ? 0.6 : 0.9) * F.p);   // éclat à la tuyère
    const bm = dark ? "screen" : "multiply";
    out[0].push({ d: 1e6, s: '<g style="mix-blend-mode:' + bm + '">' + mul + "</g>" + soot + (dark ? '<g style="mix-blend-mode:screen">' + main + "</g>" : main) });
  }

  // anneau de choc au sol
  function ringItem(R, s, out) {
    const u = (s - R.t) / (R.dur || 1.4); if (u < 0 || u > 1) return;
    const r = mix(R.r0 || 6, R.r1 || 70, 1 - Math.pow(1 - u, 2.2)), a = Math.pow(1 - u, 1.6) * (R.a || 0.5), c = pr(R.x, R.y, R.z || 1);
    out[0].push({ d: pr(R.x, R.y, 0)[1] - 1, s: '<circle r="' + f1(r) + '" transform="matrix(' + f2(ex[0]) + " " + f2(ex[1]) + " " + f2(ey[0]) + " " + f2(ey[1]) + " " + f1(c[0]) + " " + f1(c[1]) + ')" fill="none" stroke="' + (dark ? "#ebeef5" : "#787e8c") + '" stroke-width="' + f2(Math.max(0.6, 2.4 * (1 - u)) / UN) + '" opacity="' + f2(a) + '"/>' });
  }

  // brume de condensation autour du véhicule (anneau horizontal)
  function mistItem(M, s, out) {
    if (M.a < 0.01) return;
    out[0].push({ d: pr(M.x, M.y, 0)[1] + 2, s: onGround("u-mist", M.x, M.y, M.z, M.r, M.a, s * 0.2) + onGround("u-mist", M.x, M.y, M.z - 3, M.r * 1.35, M.a * 0.5, -s * 0.15) });
  }

  // ---- traces et ombres : D = [{ k:'scorch', x, y, gz, R, a } | { k:'shadow', x, y, z0, z1, r, a }]
  function decals(D) {
    let str = "";
    for (const d of D) {
      if (d.a < 0.01) continue;
      if (d.k === "scorch") str += onGround("u-scorch", d.x, d.y, d.gz, d.R, d.a * (dark ? 0.9 : 0.7), d.rot || 0);
      else if (d.k === "shadow") {
        const T = 0.3, gzz = d.gz || 0.8, c = pr(0, 0, gzz), x0 = d.x + SUN[0] * d.z0 * T, y0 = d.y + SUN[1] * d.z0 * T, x1 = d.x + SUN[0] * d.z1 * T, y1 = d.y + SUN[1] * d.z1 * T;
        let g = '<g transform="matrix(' + f2(ex[0]) + " " + f2(ex[1]) + " " + f2(ey[0]) + " " + f2(ey[1]) + " " + f1(c[0]) + " " + f1(c[1]) + ')" stroke-linecap="round" fill="none" stroke="' + (dark ? "#000" : "#282c38") + '">';
        for (const [wm, am] of [[2.4, 0.18], [1.8, 0.28], [1.2, 0.4], [0.7, 0.5]]) g += '<path d="M' + f1(x0) + " " + f1(y0) + "L" + f1(x1) + " " + f1(y1) + '" stroke-width="' + f2(2 * d.r * wm * (0.9 + 0.1 * wm)) + '" opacity="' + f2(d.a * am * (dark ? 1.2 : 0.4)) + '"/>';
        str += g + "</g>";
      }
    }
    return str;
  }

  // ---- image : tout ce qui brûle, fume, jette une ombre ou éclaire à l'instant s
  let wasActive = true;
  const alive = (s, emitters, flames, ex2) => flames.some((F) => F.p > 0.02) || emitters.some((E) => s >= E.t0 && s <= E.t1 + E.life) || (ex2.decals || []).some((d) => d.a > 0.01) || (ex2.mists || []).some((m) => m.a > 0.01) || (ex2.flash || 0) > 0.01;
  function frame(s, emitters, flames, rings, extras) {
    const ex2 = extras || {}, act = alive(s, emitters, flames, ex2);
    if (!act && !wasActive) return;                    // rien à tracer : le DOM ne bouge plus
    wasActive = act; theme(performance.now());
    const items = [[], []]; LIGHTS = flames.filter((F) => F.p > 0.05);
    for (const E of emitters) smokeItems(E, s, items);
    for (const F of flames) flameItem(F, s, items);
    for (const R of rings || []) ringItem(R, s, items);
    for (const M of ex2.mists || []) mistItem(M, s, items);
    const join = (a) => a.sort((x, y) => x.d - y.d).map((i) => i.s).join("");
    let front = join(items[0]);
    if ((ex2.flash || 0) > 0.01) front = '<rect x="-40" y="-40" width="' + (VBW + 80) + '" height="' + (VBH + 80) + '" fill="rgb(255,176,96)" opacity="' + f2((dark ? 0.1 : 0.12) * ex2.flash) + '" style="mix-blend-mode:' + (dark ? "screen" : "multiply") + '"/>' + front;
    gB.innerHTML = decals(ex2.decals || []) + join(items[1]); gF.innerHTML = front;
  }
  return { frame, SUN };
}

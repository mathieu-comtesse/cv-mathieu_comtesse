/* Navigation du personnage : grille d'obstacles au sol (rectangles en repère monde) et plus court chemin A* lissé par lignes de vue. */
export function createNav({ x0, x1, z0, z1, cell = 0.1, radius = 0.16 }) {
  const nx = Math.ceil((x1 - x0) / cell), nz = Math.ceil((z1 - z0) / cell);
  const blocked = new Uint8Array(nx * nz);
  const ix = (x) => Math.floor((x - x0) / cell), iz = (z) => Math.floor((z - z0) / cell);
  const id = (i, j) => j * nx + i;
  const inb = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz;
  const block = (r) => {                                        // r : { x0, x1, z0, z1 } en mètres, agrandi du rayon du personnage
    for (let j = iz(r.z0 - radius); j <= iz(r.z1 + radius); j++) for (let i = ix(r.x0 - radius); i <= ix(r.x1 + radius); i++) if (inb(i, j)) blocked[id(i, j)] = 1;
  };
  const free = (x, z) => { const i = ix(x), j = iz(z); return inb(i, j) && !blocked[id(i, j)]; };
  const center = (i, j) => [x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell];
  const line = (a, b) => {                                       // ligne de vue libre ?
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cell * 0.5));
    for (let k = 0; k <= n; k++) { const t = n ? k / n : 0; if (!free(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
    return true;
  };
  function nearest(x, z) {                                       // case libre la plus proche
    if (free(x, z)) return [x, z];
    const i0 = Math.max(0, Math.min(nx-1, ix(x))), j0 = Math.max(0, Math.min(nz-1, iz(z)));
    for (let r = 1; r < Math.max(nx, nz); r++) {
      let best = null, bd = 1e9;
      for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
        if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r || !inb(i, j) || blocked[id(i, j)]) continue;
        const c = center(i, j), d = Math.hypot(c[0] - x, c[1] - z); if (d < bd) { bd = d; best = c; }
      }
      if (best) return best;
    }
    return [x, z];
  }
  function path(from, to) {                                      // from, to : [x, z] ; renvoie une liste de points [x, z] (sans le départ)
    const s = nearest(from[0], from[1]), g = nearest(to[0], to[1]);
    if (!free(...s) || !free(...g)) return [];
    const si = ix(s[0]), sj = iz(s[1]), gi = ix(g[0]), gj = iz(g[1]);
    const dist = new Float32Array(nx * nz).fill(1e9), prev = new Int32Array(nx * nz).fill(-1), done = new Uint8Array(nx * nz);
    const open = [[0, id(si, sj)]]; dist[id(si, sj)] = 0;
    const h = (i, j) => Math.hypot(i - gi, j - gj);
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [, cur] = open.splice(bi, 1)[0];
      if (done[cur]) continue; done[cur] = 1;
      const ci = cur % nx, cj = (cur / nx) | 0;
      if (ci === gi && cj === gj) break;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj;
        if (!inb(i, j) || blocked[id(i, j)]) continue;
        if (di && dj && (blocked[id(ci + di, cj)] || blocked[id(ci, cj + dj)])) continue;
        const nd = dist[cur] + (di && dj ? 1.414 : 1);
        if (nd < dist[id(i, j)]) { dist[id(i, j)] = nd; prev[id(i, j)] = cur; open.push([nd + h(i, j), id(i, j)]); }
      }
    }
    const pts = [];
    for (let c = id(gi, gj); c !== -1 && c !== id(si, sj); c = prev[c]) { const k = center(c % nx, (c / nx) | 0); pts.push(k); }
    pts.reverse();
    if (gi === si && gj === sj) return line(s, g) ? [g] : [];
    if (prev[id(gi, gj)] === -1) return [];
    // lissage : on saute les points intermédiaires dès que la ligne de vue est libre
    const out = []; let a = s, k = 0;
    while (k < pts.length) {
      let m = k; for (let q = pts.length - 1; q >= k; q--) if (line(a, pts[q])) { m = q; break; }
      out.push(pts[m]); a = pts[m]; k = m + 1;
    }
    out[out.length - 1] = [g[0], g[1]];
    return out;
  }
  return { block, free, nearest, path, line, grid: { nx, nz, x0, z0, cell, blocked } };
}

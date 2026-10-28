import * as THREE from 'three';

/**
 * Île flottante : un dessus en champ de hauteur sur un plan organique (superellipse déformée par un bruit lent),
 * une berge de terre sous le gazon, puis des strates de roche déchiquetées qui se resserrent vers le bas,
 * des racines et des pierres qui pendent. Aucun bord droit.
 *
 * o: { cx, cz, hx, hz, ne, seed, hAt(x,z), paint(x,z,n) -> '#hex', K (px/m), turf, earth, rock: [hex...], root }
 */
const rng = (s) => () => ((s = Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5 | 0, ((s ^ (s >>> 7)) >>> 0) / 4294967296));

export function island(scene, mat, o) {
  const { cx = 0, cz = 0, hx, hz, ne = 4, seed = 3 } = o;
  const wob = (th) => 1 + 0.045 * Math.sin(3 * th + seed) + 0.03 * Math.sin(5 * th + seed * 2.1) + 0.018 * Math.sin(11 * th + seed * 0.7) + 0.01 * Math.sin(23 * th + seed);
  const edge = (th) => Math.pow(Math.pow(Math.abs(Math.cos(th) / hx), ne) + Math.pow(Math.abs(Math.sin(th) / hz), ne), -1 / ne) * wob(th);
  const mapUV = (u, v) => { const r = Math.max(Math.abs(u), Math.abs(v)); if (r < 1e-6) return [cx, cz]; const th = Math.atan2(v * hz, u * hx); const s = edge(th) * r; return [cx + Math.cos(th) * s, cz + Math.sin(th) * s]; };
  const inside = (x, z, m = 0) => { const th = Math.atan2(z - cz, x - cx); return Math.hypot(x - cx, z - cz) < edge(th) - m; };
  const hAt = o.hAt || (() => 0);

  // dessus : grille déformée sur le plan, peinte sur une toile (pixels francs)
  const NX = 140, NZ = 100, pos = [], uv = [], idx = [];
  const X0 = cx - hx * 1.12, X1 = cx + hx * 1.12, Z0 = cz - hz * 1.12, Z1 = cz + hz * 1.12;
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const [x, z] = mapUV(-1 + 2 * i / NX, -1 + 2 * j / NZ); pos.push(x, hAt(x, z), z); uv.push((x - X0) / (X1 - X0), 1 - (z - Z0) / (Z1 - Z0)); }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const K = o.K ?? 8, TW = Math.round((X1 - X0) * K), TH = Math.round((Z1 - Z0) * K);
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; const c2 = cv.getContext('2d'); const R = rng(seed * 97 + 1);
  for (let jj = 0; jj < TH; jj++) for (let ii = 0; ii < TW; ii++) { const x = X0 + (ii + 0.5) / K, z = Z0 + (jj + 0.5) / K; c2.fillStyle = o.paint(x, z, R()); c2.fillRect(ii, jj, 1, 1); }
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false;
  const top = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex })); top.receiveShadow = true; scene.add(top);

  // berge : gazon puis terre, du bord du dessus jusqu'à la première strate
  const ring = []; const NR = 2 * (NX + NZ);
  for (let i = 0; i < NX; i++) ring.push(mapUV(-1 + 2 * i / NX, -1));
  for (let j = 0; j < NZ; j++) ring.push(mapUV(1, -1 + 2 * j / NZ));
  for (let i = NX; i > 0; i--) ring.push(mapUV(-1 + 2 * i / NX, 1));
  for (let j = NZ; j > 0; j--) ring.push(mapUV(-1, -1 + 2 * j / NZ));
  void NR;
  const band = (y0f, y1f, hex) => {
    const arr = [];
    for (let k = 0; k < ring.length; k++) {
      const a = ring[k], b = ring[(k + 1) % ring.length], ha = hAt(a[0], a[1]), hb = hAt(b[0], b[1]);
      const A0 = y0f(ha, k), A1 = y1f(ha, k), B0 = y0f(hb, k + 1), B1 = y1f(hb, k + 1);
      arr.push(a[0], A0, a[1], b[0], B0, b[1], b[0], B1, b[1], a[0], A0, a[1], b[0], B1, b[1], a[0], A1, a[1]);
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ color: hex, side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  };
  const jag = (k) => 0.12 * Math.sin(k * 0.9) + 0.08 * Math.sin(k * 2.3 + 1);
  band((h) => h - 0.22, (h) => h, o.turf);
  band((h, k) => -1.0 + jag(k), (h) => h - 0.22, o.earth);

  // strates de roche : contours bruités, de plus en plus petits et décalés, vers le bas
  const R2 = rng(seed * 31 + 7);
  let yTop = -0.95;
  o.rock.forEach((hex, i) => {
    const k = 1 - (i + 1) * (0.78 / (o.rock.length + 0.4)), sx = (R2() - 0.5) * hx * 0.2 * i / o.rock.length, sz = (R2() - 0.5) * hz * 0.2 * i / o.rock.length;
    const pts = []; for (let n = 0; n < 72; n++) { const th = n / 72 * Math.PI * 2, r = edge(th) * k * (0.94 + 0.12 * R2()); pts.push(new THREE.Vector2(cx + sx + Math.cos(th) * r, -(cz + sz + Math.sin(th) * r))); }
    const depth = 1.1 + i * 0.45, geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); geo.translate(0, yTop - depth + 0.15, 0); yTop -= depth * 0.85;
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: hex, flatShading: true })); m.castShadow = true; scene.add(m);
  });
  // pierres pendantes et racines
  const R3 = rng(seed * 13 + 5), rockM = new THREE.MeshLambertMaterial({ color: o.rock[1] ?? o.rock[0], flatShading: true }), rootM = new THREE.MeshLambertMaterial({ color: o.root ?? o.earth });
  for (let n = 0; n < 26; n++) {
    const th = R3() * Math.PI * 2, r = edge(th) * (0.3 + 0.55 * R3()), x = cx + Math.cos(th) * r, z = cz + Math.sin(th) * r, len = 0.8 + R3() * 2.6;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.25 + R3() * 0.5, len, 5), rockM); m.rotation.x = Math.PI; m.position.set(x, -2.2 - (1 - r / edge(th)) * 3.2 - len / 2, z); scene.add(m);
  }
  for (let n = 0; n < 34; n++) {
    const k = Math.floor(R3() * ring.length), [x, z] = ring[k], len = 0.4 + R3() * 1.4;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.012, len, 4), rootM); m.position.set(x * 0.998, -1.0 - len / 2, z * 0.998); m.rotation.z = (R3() - 0.5) * 0.4; scene.add(m);
  }
  return { top, edge, inside, mapUV, hAt, ring };
}

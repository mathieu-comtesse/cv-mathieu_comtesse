/* ATLAS · PLAGE. Les petits objets du diorama : deux torches qui crépitent, un parasol rayé, des étoiles de mer, deux bouées, des rochers couverts d'algues
 * qui affleurent. Tout est posé sur la plage réelle, d'après la lèvre de l'île (carte.meta.bord) et la hauteur du terrain.
 *
 *   const p = creerPlage({ scene, carte, bats, niveau })   ->  p.tick(dt, t)                                                                                  */
import * as THREE from './three.module.js';
import { aleatoire } from './atlas-flore.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function spriteFlamme() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 38, 2, 32, 32, 30);
  r.addColorStop(0, 'rgba(255,248,200,1)'); r.addColorStop(.25, 'rgba(255,190,80,.95)'); r.addColorStop(.6, 'rgba(255,110,30,.45)'); r.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function creerPlage({ scene, carte, bats, niveau }) {
  const rng = aleatoire(4242), groupe = new THREE.Group(), meta = carte.meta, bord = meta.bord;
  /* sites de plage : points de la lèvre, ramenés vers l'intérieur, loin des bâtiments, du ponton et du pont */
  const loin = (x, z, m) => { const a=meta.refonte.atelier;if(Math.hypot((x-a.c[0])/5.6,(z-a.c[1])/4)<1)return false; for (const k in bats) { const b = bats[k]; if (Math.hypot(x - b.x, z - b.z) < b.rayon + m) return false; }
    const pa = meta.ponton.a, pb = meta.ponton.b; if (Math.hypot(x - pa[0], z - pa[1]) < 2.2 || Math.hypot(x - pb[0], z - pb[1]) < 2.2) return false;
    return true; };
  const sites = [];
  for (let k = 0; k < bord.length; k++) {
    const [bx, by, bz, dx, dz] = bord[k], x = bx - dx * 1.0, z = bz - dz * 1.0, h = carte.hauteur(x, z);
    if (h < -0.05 || h > 0.9 || !loin(x, z, 1.2)) continue;
    sites.push({ x, z, h, dx, dz, k });
  }
  /* choix étalé : on prend le site le plus proche de chaque azimut voulu */
  const choisir = (az, interdits = []) => { let best = null, bd = 1e9; for (const s of sites) { const a = Math.atan2(s.dz, s.dx); let da = Math.abs(a - az); da = Math.min(da, Math.PI * 2 - da); if (da < bd && interdits.every((q) => Math.hypot(q.x - s.x, q.z - s.z) > 2.2)) { bd = da; best = s; } } return best; };
  const pris = [];
  const prendre = (az) => { const s = choisir(az, pris); if (s) pris.push(s); return s; };

  const bois = new THREE.MeshStandardMaterial({ color: '#5b3d26', roughness: 0.9 });
  const sprite = new THREE.SpriteMaterial({ map: spriteFlamme(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: '#ffb25c' });
  const torches = [];
  for (const az of [1.15, 2.15]) {
    const s = prendre(az); if (!s) continue;
    const g = new THREE.Group(), y = carte.hauteur(s.x, s.z);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.25, 6), bois); mat.position.y = 0.62; mat.castShadow = true; g.add(mat);
    const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.14, 8), new THREE.MeshStandardMaterial({ color: '#2c1d14', roughness: 0.8 })); bol.position.y = 1.28; g.add(bol);
    const fl = new THREE.Sprite(sprite.clone()); fl.scale.set(0.42, 0.62, 1); fl.position.y = 1.5; g.add(fl);
    const halo = new THREE.Sprite(sprite.clone()); halo.material.opacity = 0.35; halo.scale.set(1.5, 1.5, 1); halo.position.y = 1.5; g.add(halo);
    const lum = new THREE.PointLight('#ff9a4a', 3.2, 6.5, 1.6); lum.position.y = 1.55; g.add(lum);
    g.position.set(s.x, y - 0.05, s.z); groupe.add(g); torches.push({ g, fl, halo, lum, ph: rng() * 6 });
  }
  /* parasol rayé bleu et blanc */
  { const s = prendre(1.7); if (s) { const g = new THREE.Group(), y = carte.hauteur(s.x, s.z);
      const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.7, 6), new THREE.MeshStandardMaterial({ color: '#d9d4cc', roughness: 0.6 })); mat.position.y = 0.85; g.add(mat);
      const cone = new THREE.ConeGeometry(0.95, 0.34, 12, 1, true).toNonIndexed(), pos = cone.attributes.position, cols = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i += 3) { const seg = Math.floor(i / 3 / 1); const bleu = (Math.floor(Math.atan2(pos.getZ(i + 1), pos.getX(i + 1)) / (Math.PI * 2) * 12 + 12) % 2) === 0; for (let k = 0; k < 3; k++) { const c = bleu ? [0.06, 0.2, 0.62] : [0.92, 0.92, 0.9]; cols.set(c, (i + k) * 3); } }
      cone.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const toit = new THREE.Mesh(cone, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide })); toit.position.y = 1.72; toit.castShadow = true; g.add(toit);
      g.rotation.z = 0.12; g.position.set(s.x, y - 0.03, s.z); groupe.add(g); } }
  /* étoiles de mer */
  const etoile = (() => { const sh = new THREE.Shape(), R = 0.16, r = 0.065; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; i ? sh.lineTo(Math.cos(a) * q, Math.sin(a) * q) : sh.moveTo(Math.cos(a) * q, Math.sin(a) * q); } sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false }); })();
  const matEtoile = new THREE.MeshStandardMaterial({ color: '#e6532c', roughness: 0.7 });
  for (let i = 0; i < 7 && sites.length; i++) {
    const s = sites[Math.floor(rng() * sites.length)], t = 0.35 + rng() * 0.9, x = s.x + s.dx * t, z = s.z + s.dz * t, y = carte.hauteur(x, z); if (y < niveau + 0.04) continue;
    const m = new THREE.Mesh(etoile, matEtoile); m.rotation.x = -Math.PI / 2; m.rotation.z = rng() * 6.3; m.position.set(x, y + 0.012, z); m.castShadow = true; groupe.add(m);
  }
  /* bouées */
  const bouees = [];
  for (const az of [2.55, 0.35]) { const s = choisir(az); if (!s) continue; const g = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: '#d9352b', roughness: 0.5 })); corps.scale.y = 1.15; g.add(corps);
    const bande = new THREE.Mesh(new THREE.CylinderGeometry(0.202, 0.202, 0.07, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#f2eee6', roughness: 0.5 })); g.add(bande);
    g.position.set(s.x + s.dx * 6.5, niveau + 0.08, s.z + s.dz * 6.5); g.castShadow = true; groupe.add(g); bouees.push({ g, ph: rng() * 6, y: niveau + 0.08 }); }
  /* rochers à algues qui affleurent */
  const rocGeo = new THREE.IcosahedronGeometry(1, 1), matRoc = new THREE.MeshStandardMaterial({ color: '#7a6a5e', roughness: 1, flatShading: true });
  const matMousse = new THREE.MeshStandardMaterial({ color: '#4d6a3a', roughness: 1, flatShading: true });
  for (let i = 0; i < 11; i++) {
    const s = sites.length ? sites[Math.floor(rng() * sites.length)] : null; if (!s) break; const t = 2.5 + rng() * 11, x = s.x + s.dx * t + (rng() - 0.5) * 3, z = s.z + s.dz * t + (rng() - 0.5) * 3;
    if (carte.hauteur(x, z) > -20 || Math.abs(x) > 30 || Math.abs(z - 0.6) > 23) continue;
    const e = 0.22 + rng() * 0.55, g = new THREE.Group(), r = new THREE.Mesh(rocGeo, matRoc); r.scale.set(e * 1.3, e * 0.55, e); r.rotation.y = rng() * 6; r.castShadow = true; g.add(r);
    const m = new THREE.Mesh(rocGeo, matMousse); m.scale.set(e * 1.0, e * 0.16, e * 0.85); m.position.y = e * 0.3; m.rotation.y = r.rotation.y; g.add(m);
    g.position.set(x, niveau + e * 0.1, z); groupe.add(g);
  }

  /* ---------------------------------------------------------------------------------------- végétation de plage, comme sur la maquette de référence */
  const feuille = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
  const vertes = ['#4f7f3f', '#6c9a4c', '#86ad5c', '#3d6a39', '#9bb26a'].map((h) => new THREE.Color(h));
  const mat4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler();
  const bosquet = (cx, cz, ech) => {
    const y0 = carte.hauteur(cx, cz); if (y0 < niveau + 0.02) return;
    const g = new THREE.Group(); const n = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const geo = new THREE.IcosahedronGeometry(1, 1), pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), cb = vertes[Math.floor(rng() * vertes.length)];
      for (let k = 0; k < pos.count; k++) { const j = 0.78 + rng() * 0.44; pos.setXYZ(k, pos.getX(k) * j, pos.getY(k) * j * 0.8, pos.getZ(k) * j); const l = 0.82 + (pos.getY(k) + 1) * 0.16; cols.set([cb.r * l, cb.g * l, cb.b * l], k * 3); }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, feuille), s = ech * (0.16 + rng() * 0.2), a = rng() * 6.3, r = rng() * ech * 0.28;
      m.scale.set(s, s * (0.8 + rng() * 0.4), s); m.position.set(Math.cos(a) * r, s * 0.5 + rng() * ech * 0.1, Math.sin(a) * r); m.castShadow = true; g.add(m);
      if (rng() < 0.7) { for (let f = 0; f < 3; f++) { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 * ech, 0), new THREE.MeshStandardMaterial({ color: rng() < 0.7 ? '#e0348c' : '#ff6fae', roughness: 0.6, emissive: '#5a0830', emissiveIntensity: 0.35 }));
        const b = rng() * 6.3; fl.position.set(m.position.x + Math.cos(b) * s * 0.9, m.position.y + s * (0.2 + rng() * 0.5), m.position.z + Math.sin(b) * s * 0.9); g.add(fl); } }
    }
    g.position.set(cx, y0 - 0.02, cz); groupe.add(g);
  };
  for (let i = 0; i < 16 && sites.length; i++) { const s = sites[Math.floor(rng() * sites.length)], t = 0.6 + rng() * 2.6; bosquet(s.x - s.dx * t + (rng() - 0.5) * 1.2, s.z - s.dz * t + (rng() - 0.5) * 1.2, 0.8 + rng() * 0.7); }
  /* muret de galets gris-lilas */
  { const s = sites[Math.floor(sites.length * 0.35)]; if (s) { const geo = new THREE.IcosahedronGeometry(1, 1); const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#b0a2b2', roughness: 0.95, flatShading: true }), 26), cs = new THREE.Color();
      const tang = V3(-s.dz, 0, s.dx);
      for (let i = 0; i < 26; i++) { const u = (i % 13 - 6) * 0.26, row = Math.floor(i / 13), x = s.x - s.dx * (1.3 + row * 0.12) + tang.x * u, z = s.z - s.dz * (1.3 + row * 0.12) + tang.z * u, y = carte.hauteur(x, z), r = 0.12 + rng() * 0.1;
        e4.set(rng() * 3, rng() * 3, rng() * 3); q4.setFromEuler(e4); mat4.compose(V3(x, y + r * 0.45 + row * 0.12, z), q4, V3(r * 1.25, r * 0.85, r)); im.setMatrixAt(i, mat4); im.setColorAt(i, cs.set(['#b3a6b6', '#9c8fa0', '#c2b4c4'][i % 3])); }
      im.castShadow = true; groupe.add(im); } }
  /* clôture de piquets de bois */
  { const s = sites[Math.floor(sites.length * 0.72)]; if (s) { const geo = new THREE.BoxGeometry(0.05, 0.42, 0.05), im = new THREE.InstancedMesh(geo, bois, 12), tang = V3(-s.dz, 0, s.dx);
      for (let i = 0; i < 12; i++) { const u = (i - 5.5) * 0.17, x = s.x - s.dx * 1.0 + tang.x * u, z = s.z - s.dz * 1.0 + tang.z * u, y = carte.hauteur(x, z); e4.set((rng() - 0.5) * 0.12, 0, (rng() - 0.5) * 0.12); q4.setFromEuler(e4); mat4.compose(V3(x, y + 0.17, z), q4, V3(1, 0.85 + rng() * 0.3, 1)); im.setMatrixAt(i, mat4); }
      im.castShadow = true; groupe.add(im); } }
  /* galets colorés posés sur le sable */
  { const cols = ['#4fb3b5', '#3e7fb4', '#86be82', '#5aa6c8'], geo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 12 && sites.length; i++) { const s = sites[Math.floor(rng() * sites.length)], t = 0.5 + rng() * 1.8, x = s.x - s.dx * t + (rng() - 0.5) * 1.5, z = s.z - s.dz * t + (rng() - 0.5) * 1.5, y = carte.hauteur(x, z); if (y < niveau + 0.05) continue;
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.45 })); const r = 0.07 + rng() * 0.06; m.scale.set(r * 1.5, r * 0.5, r); m.rotation.y = rng() * 6.3; m.position.set(x, y + r * 0.1, z); m.castShadow = true; groupe.add(m); } }

  /* étincelles qui montent des torches */
  const NS = 24 * torches.length, ptsPos = new Float32Array(NS * 3), ptsVie = new Float32Array(NS).map(() => rng()), ptsOrg = [];
  torches.forEach((q) => { ptsOrg.push(q.g.position.clone().add(V3(0, 1.5, 0))); });
  const etincelles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(ptsPos, 3)), new THREE.PointsMaterial({ color: '#ffb35a', size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  etincelles.frustumCulled = false; groupe.add(etincelles);
  scene.add(groupe);
  return { groupe, tick(dt, t) {
    torches.forEach((q, i) => { const f = 1 + Math.sin(t * 11 + q.ph) * 0.12 + Math.sin(t * 17.3 + q.ph * 2) * 0.08; q.fl.scale.set(0.42 * f, 0.62 * (1.1 - (f - 1)), 1); q.lum.intensity = 3.2 * f; q.halo.material.opacity = 0.32 * f; });
    bouees.forEach((b) => { b.g.position.y = b.y + Math.sin(t * 1.4 + b.ph) * 0.04; b.g.rotation.z = Math.sin(t * 1.1 + b.ph) * 0.08; });
    for (let i = 0; i < NS; i++) { const o = ptsOrg[Math.floor(i / 24)]; if (!o) continue; let v = ptsVie[i] + dt * (0.35 + (i % 5) * 0.06); if (v > 1) v -= 1; ptsVie[i] = v; ptsPos[i * 3] = o.x + Math.sin(t * 2 + i * 1.7) * 0.12 * v; ptsPos[i * 3 + 1] = o.y + v * 1.3; ptsPos[i * 3 + 2] = o.z + Math.cos(t * 1.6 + i * 2.3) * 0.12 * v; }
    etincelles.geometry.attributes.position.needsUpdate = true; etincelles.material.opacity = 0.85;
  } };
}

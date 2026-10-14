/* NĀCRE · liaisons : un même profil sert au dessin et à la marche. Les
 * appuis descendent réellement dans le relief ; le chenal sud reste ouvert. */
import * as THREE from './three.module.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
function proj(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  const t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2;
  return { t, d: Math.abs((x - a[0]) * dz - (z - a[1]) * dx) / Math.sqrt(l2) };
}

export function creerLiaisons(M) {
  const { carte, scene, bats, objets } = M;
  const groupe = new THREE.Group(); groupe.name = 'nacre-liaisons'; scene.add(groupe);
  const mat = {
    bois: new THREE.MeshStandardMaterial({ color: '#a77c4d', roughness: .82 }),
    chant: new THREE.MeshStandardMaterial({ color: '#715333', roughness: .86 }),
    rouge: new THREE.MeshStandardMaterial({ color: '#b34c38', roughness: .65 }),
    fer: new THREE.MeshStandardMaterial({ color: '#474e4d', roughness: .44, metalness: .65 }),
    pierre: new THREE.MeshStandardMaterial({ color: '#c9bdaa', roughness: .95 }),
    chemin: new THREE.MeshStandardMaterial({ color: '#cfbe96', roughness: .98, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    bord: new THREE.MeshStandardMaterial({ color: '#d9c8a7', roughness: .96 }),
  };
  const poutreGeo = new THREE.BoxGeometry(1, 1, 1), pieuGeo = new THREE.CylinderGeometry(1, 1.1, 1, 10);
  const appuis = [], profils = [], chemins = [], acces = {};
  function mesh(geo, material, parent = groupe, nom = '') {
    const o = new THREE.Mesh(geo, material); o.name = nom; o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  function poutre(a, b, largeur, hauteur, material, parent = groupe, nom = 'entretoise') {
    const m = mesh(poutreGeo, material, parent, nom), d = b.clone().sub(a), milieu = a.clone().add(b).multiplyScalar(.5);
    m.position.copy(milieu); m.scale.set(largeur, hauteur, d.length()); m.quaternion.setFromUnitVectors(V(0, 0, 1), d.normalize()); return m;
  }
  function appui(x, z, haut, rayon, parent, type = 'pieu') {
    const terrain = carte.hauteur(x, z), bas = Math.max(-6, terrain) - .18;
    const m = mesh(pieuGeo, type === 'culee' ? mat.pierre : mat.chant, parent, type);
    m.position.set(x, (haut + bas) / 2, z); m.scale.set(rayon, haut - bas, rayon);
    appuis.push({ x, z, terrain, bas, haut, type }); return m;
  }
  // Les coordonnées sont mondiales : conserver les groupes accessibles au jeu,
  // mais remplacer leurs enfants évite deux tabliers et deux jeux d'appuis.
  function remplacer(g, nom) {
    g.clear(); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1); g.name = nom;
  }
  function tablier(parent, a, b, largeur, y, nom, pas = .135) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    const lat = V(uz, 0, -ux), dir = V(ux, 0, uz), point = (t, s = 0, dy = 0) => V(a[0] + ux * L * t + lat.x * s, y(t) + dy, a[1] + uz * L * t + lat.z * s);
    const n = Math.ceil(L / pas), matrices = [];
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, p = point(t), h0 = y(Math.max(0, t - .001)), h1 = y(Math.min(1, t + .001));
      const longitudinal = V(ux, (h1 - h0) / (.002 * L), uz).normalize(), up = V().crossVectors(longitudinal, lat).normalize();
      const basis = new THREE.Matrix4().makeBasis(lat, up, longitudinal);
      matrices.push(new THREE.Matrix4().compose(p.addScaledVector(up, -.027), new THREE.Quaternion().setFromRotationMatrix(basis), V(largeur, .054, L / n - .011)));
    }
    const planches = new THREE.InstancedMesh(poutreGeo, mat.bois, n); matrices.forEach((m, i) => planches.setMatrixAt(i, m)); planches.castShadow = planches.receiveShadow = true; planches.userData.accessoire = nom; parent.add(planches);
    for (const s of [-1, 1]) for (let i = 0; i < 20; i++) poutre(point(i / 20, s * largeur * .36, -.11), point((i + 1) / 20, s * largeur * .36, -.11), .072, .10, mat.chant, parent, 'longeron');
    profils.push({ a, b, largeur, y, nom }); return { L, point, lat, dir, y, a, b, largeur };
  }

  // Portée complète jusqu'à la rive de l'îlot, avec départ au sol et montée douce.
  const pa = [.77, -.55], pb = [.70, 3.65], ya = Math.max(.17, carte.hauteur(...pa) + .10), yb = carte.hauteur(...pb) + .105;
  const yPont = t => ya + (yb - ya) * t + .245 * Math.sin(Math.PI * t);
  remplacer(objets.pont, 'pont-nacre');
  const pont = tablier(objets.pont, pa, pb, .72, yPont, 'pont');
  // Six appuis latéraux ancrés, dont deux culées minérales sur chaque rive.
  for (const t of [0, .35, .68, 1]) {
    const ends = [-1, 1].map(s => pont.point(t, s * .31, -.10));
    ends.forEach(p => appui(p.x, p.z, p.y, t === 0 || t === 1 ? .15 : .065, objets.pont, t === 0 || t === 1 ? 'culee' : 'pieu'));
    poutre(ends[0], ends[1], .11, .115, mat.chant, objets.pont, 'traverse-pont');
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 9; i++) { const p = pont.point(i / 9, side * .34); poutre(p, p.clone().add(V(0, .45, 0)), .045, .045, mat.rouge, objets.pont, 'montant-pont'); }
    for (const h of [.21, .45]) for (let i = 0; i < 32; i++) poutre(pont.point(i / 32, side * .34, h), pont.point((i + 1) / 32, side * .34, h), .039, .043, mat.rouge, objets.pont, 'lisse-pont');
  }
  tablier(objets.pont, [.77, -1.05], pa, .78, t => carte.hauteur(.77, -1.05) + .035 + (ya - carte.hauteur(.77, -1.05) - .035) * t, 'pont');
  tablier(objets.pont, pb, [.70, 3.90], .78, t => yb + (carte.hauteur(.70, 3.90) + .035 - yb) * t, 'pont');
  objets.pont.traverse(o => { if (o.isMesh) o.userData.accessoire = 'pont'; });

  // Jetée fixée au terrain : l'entrée s'allonge sur la rive, les amarrages restent
  // aux mêmes coordonnées pour conserver voilier, yacht et pêche.
  const qa = M.meta.ponton.a, qb = M.meta.ponton.b, lon = Math.hypot(qb[0] - qa[0], qb[1] - qa[1]);
  const ux = (qb[0] - qa[0]) / lon, uz = (qb[1] - qa[1]) / lon;
  const entree = [qa[0] - ux * .84, qa[1] - uz * .84], fin = [qa[0] + ux * 3.92, qa[1] + uz * 3.92];
  remplacer(objets.ponton, 'ponton-nacre');
  const jetee = tablier(objets.ponton, qa, fin, .64, () => .24, 'ponton');
  tablier(objets.ponton, entree, qa, .76, t => Math.max(.04, carte.hauteur(...entree) + .035) * (1 - t) + .24 * t, 'ponton');
  for (const t of [0, .25, .50, .75, 1]) {
    const ends = [-1, 1].map(s => jetee.point(t, s * .265, -.075));
    ends.forEach(p => appui(p.x, p.z, p.y + .135, .055, objets.ponton));
    poutre(ends[0], ends[1], .11, .10, mat.chant, objets.ponton, 'traverse-quai');
    if (t > 0) for (const side of [-1, 1]) {
      const a = jetee.point(t - .25, side * .265, -.11), b = jetee.point(t, side * .265, -.11);
      const ab = a.clone().setY(Math.max(carte.hauteur(a.x, a.z) + .10, -.95)), bb = b.clone().setY(Math.max(carte.hauteur(b.x, b.z) + .10, -.95));
      poutre(a, bb, .036, .046, mat.chant, objets.ponton, 'contreventement'); poutre(ab, b, .036, .046, mat.chant, objets.ponton, 'contreventement');
    }
  }
  for (const t of [.3, .85]) for (const s of [-1, 1]) {
    const p = jetee.point(t, s * .22, .04); const bol = mesh(new THREE.CylinderGeometry(.03, .04, .09, 8), mat.fer, objets.ponton, 'borne-amarrage'); bol.position.copy(p);
    poutre(p.clone().add(V(-.045, .04, 0)), p.clone().add(V(.045, .04, 0)), .022, .022, mat.fer, objets.ponton, 'taquet');
  }
  objets.ponton.traverse(o => { if (o.isMesh) o.userData.accessoire = 'ponton'; });

  // A* sur le relief : aucun ruban dessiné en ligne droite au travers du lagon.
  const step = .32, x0 = -15.7, z0 = -11.3, nx = 98, nz = 76, terrain = new Float32Array(nx * nz);
  const index = (i, j) => i * nz + j, point = k => [x0 + Math.floor(k / nz) * step, z0 + k % nz * step];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) terrain[index(i, j)] = carte.hauteur(x0 + i * step, z0 + j * step);
  const blocked = (x, z) => Object.values(bats).some(b => x > b.box.min.x - .15 && x < b.box.max.x + .15 && z > b.box.min.z - .15 && z < b.box.max.z + .15 && Math.hypot(x - b.x, z - b.z) < b.rayon * .84);
  const good = k => k >= 0 && k < terrain.length && terrain[k] >= -.055 && terrain[k] < 8 && !blocked(...point(k));
  function proche(p) {
    let best = -1, score = Infinity;
    for (let k = 0; k < terrain.length; k++) if (good(k)) { const q = point(k), d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < score) { best = k; score = d; } }
    return best;
  }
  const voisinages = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  function trouver(a, b) {
    const start = proche(a), end = proche(b), queue = [{ k: start, f: 0 }], g = new Float32Array(terrain.length).fill(Infinity), prev = new Int32Array(terrain.length).fill(-1), ferme = new Uint8Array(terrain.length);
    g[start] = 0;
    const target = point(end), heuristic = k => { const p = point(k); return Math.hypot(p[0] - target[0], p[1] - target[1]); };
    while (queue.length) {
      let bi = 0; for (let i = 1; i < queue.length; i++) if (queue[i].f < queue[bi].f) bi = i;
      const k = queue.splice(bi, 1)[0].k; if (ferme[k]) continue; if (k === end) {
        const route = []; for (let u = k; u !== -1; u = prev[u]) route.push(point(u)); route.reverse();
        if (!blocked(...a) && carte.hauteur(...a) >= -.055) route.unshift(a);
        if (!blocked(...b) && carte.hauteur(...b) >= -.055) route.push(b);
        return route.filter((p,i)=>!i||Math.hypot(p[0]-route[i-1][0],p[1]-route[i-1][1])>.002);
      } ferme[k] = 1;
      const i = Math.floor(k / nz), j = k % nz;
      for (const [di, dj] of voisinages) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue; const n = index(ni, nj); if (!good(n) || ferme[n]) continue;
        if (di && dj && (!good(index(i + di, j)) || !good(index(i, j + dj)))) continue;
        const dh = Math.abs(terrain[n] - terrain[k]); if (dh > .3) continue;
        const cost = g[k] + step * Math.hypot(di, dj) + dh * 2.4;
        if (cost < g[n]) { g[n] = cost; prev[n] = k; queue.push({ k: n, f: cost + heuristic(n) }); }
      }
    }
    return [];
  }
  for (const [id, b] of Object.entries(bats)) {
    const vers = b.etape.vers, dx = vers[0] - b.x, dz = vers[1] - b.z, L = Math.hypot(dx, dz), r = b.rayon * .83;
    const wanted = [b.x + dx / L * r, b.z + dz / L * r], p = point(proche(wanted));
    acces[id] = { x: p[0], z: p[1], y: carte.hauteur(...p) + .04 };
  }
  const links = [['lean','studio'],['lean','avignon'],['avignon','usp'],['studio','bi'],['bi','sncf'],['sncf','reseau']];
  function ribbon(pts, width, nom) {
    if (pts.length < 2) return;
    const positions = [], indices = [], samples = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[1] - a[1]) / L, uz = -(b[0] - a[0]) / L;
      for (const side of [-1, 0, 1]) { const x = pts[i][0] + ux * width / 2 * side, z = pts[i][1] + uz * width / 2 * side; positions.push(x, Math.max(.002, carte.hauteur(x, z)) + .029, z); }
      samples.push({ x: pts[i][0], z: pts[i][1], y: Math.max(.002, carte.hauteur(...pts[i])) + .029 });
      if (i) { const k = (i - 1) * 3; for (let j=0;j<2;j++) indices.push(k+j,k+j+1,k+j+3,k+j+1,k+j+4,k+j+3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const m = mesh(geo, mat.chemin, groupe, nom); m.castShadow = false; chemins.push({ nom, largeur: width, points: pts, samples, positions, indices });
    // Des dalles discrètes soulignent l'accès plutôt qu'une bordure continue épaisse.
    for (let i = 2; i < pts.length; i += 12) { const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], yaw = Math.atan2(q[0] - p[0], q[1] - p[1]);
      for (const s of [-1,1]) { const x = p[0] + Math.cos(yaw) * (width / 2 + .035) * s, z = p[1] - Math.sin(yaw) * (width / 2 + .035) * s;
        const c = mesh(poutreGeo, mat.bord, groupe, 'borne-chemin'); c.scale.set(.105,.08,.23); c.rotation.y = yaw; c.position.set(x, Math.max(.002, carte.hauteur(x,z)) + .02,z); }
    }
  }
  for (const [a, b] of links) ribbon(trouver([acces[a].x, acces[a].z], [acces[b].x, acces[b].z]), .64, `${a}-${b}`);
  ribbon(trouver([acces.studio.x, acces.studio.z], [.77, -1.05]), .64, 'studio-pont');
  ribbon(trouver([acces.reseau.x, acces.reseau.z], entree), .64, 'reseau-ponton');
  // L'îlot du stade est relié par le pont, sans fermer le passage maritime sud.
  ribbon(trouver([.70, 3.90], [acces.perso.x, acces.perso.z]), .64, 'pont-perso');

  function surfaceMarche(x, z) {
    for (const p of profils) { const q = proj(x, z, p.a, p.b); if (q.t >= 0 && q.t <= 1 && q.d <= p.largeur / 2 - .035) return p.y(q.t); }
    // Interpolation barycentrique sur le même ruban que celui affiché.
    for (const ch of chemins) for (let i = 1; i < ch.points.length; i++) {
      const q = proj(x,z,ch.points[i-1],ch.points[i]); if(q.t<0 || q.t>1 || q.d>ch.largeur*.6)continue;
      for(let j=(i-1)*12;j<i*12;j+=3){
        const P=ch.positions,a=ch.indices[j]*3,b=ch.indices[j+1]*3,c=ch.indices[j+2]*3;
        const dx1=P[b]-P[a],dz1=P[b+2]-P[a+2],dx2=P[c]-P[a],dz2=P[c+2]-P[a+2],det=dx1*dz2-dx2*dz1;
        if(Math.abs(det)<1e-9)continue;const u=((x-P[a])*dz2-(z-P[a+2])*dx2)/det,v=(dx1*(z-P[a+2])-dz1*(x-P[a]))/det;
        if(u>=-.0001&&v>=-.0001&&u+v<=1.0001)return P[a+1]+u*(P[b+1]-P[a+1])+v*(P[c+1]-P[a+1]);
      }
    }
    return null;
  }
  function distChemin(x, z) {
    let d = Infinity; for (const ch of chemins) for (let i = 1; i < ch.points.length; i++) { const q = proj(x,z,ch.points[i-1],ch.points[i]); if(q.t>=0&&q.t<=1)d=Math.min(d,q.d); }
    return d;
  }
  // Libérer les passages des arbres et des touffes qui avaient été semés avant
  // la création du réseau ; toutes les parties d'un arbre ont le même placement.
  let vegetationRetiree = 0;
  const imat = new THREE.Matrix4(), p = V();
  M.decor.groupe.traverse(o => { if (!o.isInstancedMesh) return; let dirty = false;
    for (let i=0;i<o.count;i++) { o.getMatrixAt(i,imat); p.setFromMatrixPosition(imat); if(distChemin(p.x,p.z)<.53) { imat.scale(V(0,0,0));o.setMatrixAt(i,imat);dirty=true;vegetationRetiree++; } }
    if(dirty)o.instanceMatrix.needsUpdate=true;
  });
  // Grouper les poutres/pieux répétés évite une commande de dessin par pièce.
  for (const parent of [groupe, objets.pont, objets.ponton]) {
    const lots = new Map();
    for (const o of [...parent.children]) if (o.isMesh && !o.isInstancedMesh) {
      const key = o.geometry.uuid + ':' + o.material.uuid;
      if (!lots.has(key)) lots.set(key, []); lots.get(key).push(o);
    }
    for (const lot of lots.values()) if (lot.length > 1) {
      const first = lot[0], im = new THREE.InstancedMesh(first.geometry, first.material, lot.length);
      im.name = first.name + '-lot'; im.userData = { ...first.userData }; im.castShadow = first.castShadow; im.receiveShadow = true;
      lot.forEach((o, i) => { o.updateMatrix(); im.setMatrixAt(i, o.matrix); parent.remove(o); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); parent.add(im);
    }
  }
  const diagnostic = {
    appuis: appuis.length, appuisFlottants: appuis.filter(a => a.bas > a.terrain).length,
    chemins: chemins.map(ch => ({ nom: ch.nom, longueur: ch.points.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-ch.points[i][0],p[1]-ch.points[i][1]),0), points: ch.points.length })),
    acces: Object.keys(acces), vegetationRetiree, pont: { a: pa, b: pb, largeur: .72 }, ponton: { entree, fin, largeur: .64 },
  };
  return { groupe, pont, jetee, chemins, acces, appuis, profils, diagnostic, surfaceMarche, distChemin, tick() {} };
}

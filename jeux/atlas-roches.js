/* ATLAS · ROCHES, RACINES ET FRAGMENTS FLOTTANTS. Les rochers (assets/atlas/rochers.bin, tools/atlas-ile/ile_petits.py) bordent le lagon, parsèment les rives et
 * s'accrochent aux falaises pour casser la silhouette du socle ; des racines et des lianes pendent sous la lèvre de terre ; de petits fragments d'île flottent autour
 * de la grande (herbe dessus, roche conique dessous, un palmier ou un buisson) et tanguent doucement.
 *
 *   const roches = await creerRoches({ M, decor, flore })   ->  roches.groupe, roches.tick(dt, t)                                                         */
import * as THREE from './three.module.js';
import { chargerMailles } from './atlas-maille.js';
import { eclairer } from './atlas-ile.js';
import { aleatoire } from './atlas-flore.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const PROFONDEUR = 13.4;
/* mêmes formules que tools/atlas-ile/ile.py : rayon relatif de l'emprise et dérive du centre à l'altitude y */
const sProfil = (y) => { const t = Math.min(1, Math.max(0, (-y - 0.4) / (PROFONDEUR - 0.4))); return Math.max(Math.pow(1 - Math.pow(t, 1.55), 0.9) * (1 - 0.05 * t), 0.045); };
const deriveCentre = (y) => { const t = Math.min(1, Math.max(0, (-y - 0.4) / (PROFONDEUR - 0.4))); return [0.9 * Math.pow(t, 1.3), -1.0 * Math.pow(t, 1.2)]; };

export async function creerRoches({ M, decor, flore }) {
  const { carte, ciel, scene } = M, meta = carte.meta, rng = aleatoire(777), groupe = new THREE.Group();
  const mailles = await chargerMailles(new URL('assets/atlas/rochers.bin', import.meta.url).href);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.3 });
  eclairer(mat, ciel, carte, { bump: 0.45 });
  const C0 = [0, 0.3];
  const lots = Array.from({ length: 10 }, () => []);
  const poser = (k, x, y, z, s, enfoncement = 0.2) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rng() - 0.5) * 0.5, rng() * 6.3, (rng() - 0.5) * 0.5));
    lots[k].push(new THREE.Matrix4().compose(V3(x, y - enfoncement * s, z), q, V3(s * (0.85 + rng() * 0.3), s * (0.7 + rng() * 0.4), s * (0.85 + rng() * 0.3))));
  };
  const tailleDe = [0.6, 0.8, 1.0, 1.3, 0.7, 0.9, 1.1, 1.6, 0.5, 1.0];                // largeur propre de chaque variante (voir ile_petits.py)
  // 1. rives du lagon : galets et rochers à moitié enterrés, posés plutôt côté sable
  let n1 = 0;
  for (let i = 0; i < 4000 && n1 < 75; i++) {
    const x = carte.x0 + 2 + rng() * (carte.nx * carte.res - 4), z = carte.z0 + 2 + rng() * (carte.nz * carte.res - 4), h = carte.hauteur(x, z), de = decor.distEau(x, z);
    if (h < -0.7 || h > 0.8 || de > 0.9 || !decor.libre(x, z, 0.3) || decor.distChemin(x, z) < 0.4) continue;
    poser(Math.floor(rng() * 10), x, h, z, (0.12 + Math.pow(rng(), 2.2) * 0.34) / 0.62 * 0.62, 0.18); n1++;
  }
  // 2. autour de la plate-forme de la tour et de la colline du dojo : rochers plus gros qui racontent le socle
  const pl = meta.plateau, col = meta.colline; let n2 = 0;
  for (let i = 0; i < 600 && n2 < 26; i++) {
    const a = rng() * 6.3, r = pl.r + 0.2 + rng() * 0.9, x = pl.c[0] + Math.cos(a) * r, z = pl.c[1] + Math.sin(a) * r, h = carte.hauteur(x, z);
    if (h < 0.2 || !decor.libre(x, z, 0.2)) continue; poser(Math.floor(rng() * 10), x, h, z, 0.28 + rng() * 0.5, 0.25); n2++;
  }
  for (let i = 0; i < 400 && n2 < 40; i++) { const a = rng() * 6.3, r = 1.5 + rng() * 2.2, x = col.c[0] + Math.cos(a) * r, z = col.c[1] + Math.sin(a) * r, h = carte.hauteur(x, z);
    if (h < 0.3 || !decor.libre(x, z, 0.4) || decor.distChemin(x, z) < 0.6) continue; poser(Math.floor(rng() * 10), x, h, z, 0.3 + rng() * 0.5, 0.25); n2++; }
  // 3. bord de l'île : rochers posés sur la lèvre (un sur trois) et blocs accrochés à la falaise, entre -1 et -9 m
  const bord = meta.bord; let n3 = 0, n4 = 0;
  for (let k = 0; k < 120; k++) {
    const [bx, by, bz, dx, dz] = bord[k]; if (rng() < 0.66) { const s = 0.2 + rng() * 0.45; poser(Math.floor(rng() * 10), bx - dx * (0.3 + rng() * 0.5), by, bz - dz * (0.3 + rng() * 0.5), s, 0.3); n3++; }
  }
  for (let i = 0; i < 80; i++) {
    const a = rng() * Math.PI * 2, y = -(1.4 + Math.pow(rng(), 1.3) * 8.5), s = sProfil(y), [cx, cz] = deriveCentre(y);
    // point de la falaise à l'azimut a : on prend le point du bord d'azimut voisin comme rayon de l'emprise
    const kb = bord[Math.round(a / (Math.PI * 2) * 120) % 120], ox = kb[0] - C0[0], oz = kb[2] - C0[1];
    const x = C0[0] + cx + ox * s * 0.99, z = C0[1] + cz + oz * s * 0.99, taille = 0.45 + Math.pow(rng(), 1.5) * 1.1 * (1 - (-y) / 16);
    poser(Math.floor(rng() * 10), x, y + taille * 0.2, z, taille, 0.45); n4++;
  }
  // matérialisation en instances
  const meshes = [];
  lots.forEach((liste, k) => { if (!liste.length) return; const m = mailles['r' + k], im = new THREE.InstancedMesh(m.geo, mat, liste.length); liste.forEach((q, i) => im.setMatrixAt(i, q)); im.instanceMatrix.needsUpdate = true; im.castShadow = im.receiveShadow = true; im.frustumCulled = false; groupe.add(im); meshes.push(im); });

  // 4. lianes et racines posées sur la roche (tools/atlas-ile/ile_lianes.py : chaque brin épouse la surface réelle de la falaise)
  const racines = await (async () => {
    let brins = []; try { brins = await (await fetch(new URL('assets/atlas/ile-lianes.json', import.meta.url).href)).json(); } catch (e) { console.warn('lianes indisponibles', e); }
    const g = new flore.Geo(), gf = new flore.Geo(), gp = new flore.Geo(), rr = aleatoire(31);
    const bruns = [[0.2, 0.11, 0.06], [0.26, 0.15, 0.08], [0.16, 0.09, 0.05], [0.3, 0.19, 0.1]], verts = [[0.18, 0.4, 0.13], [0.24, 0.48, 0.16], [0.14, 0.34, 0.14]];
    for (const b of brins) {
      const pts = []; for (let i = 0; i < b.p.length; i += 3) pts.push(V3(b.p[i], b.p[i + 1], b.p[i + 2]));
      if (pts.length < 3) continue;
      const lisse = new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints((pts.length - 1) * 3);      // courbe douce : les brins ne forment plus de coudes
      if (b.t === 'liane') {
        const col = verts[(rr() * verts.length) | 0];
        g.tube(lisse, b.r[0], b.r[1], 5, col, 0, 0, 1.0, 0, 0.1);
        for (let i = 1; i < pts.length; i++) { const p = pts[i], k = i / pts.length;
          for (let c = 0; c < 2; c++) { const a = rr() * 6.3, s = (0.22 + rr() * 0.2) * (1 - k * 0.45); gf.carte([p.x, p.y, p.z], [Math.cos(a), 0, Math.sin(a)], [0, 1, 0], s, s, [0, 0.4, 1], [0.45 + rr() * 0.3, 0.85, 0.5], 0.4 + k * 0.6); }
          if (rr() < 0.07) { const a = rr() * 6.3; gp.carte([p.x, p.y - 0.04, p.z], [Math.cos(a), 0, Math.sin(a)], [0, 1, 0], 0.15, 0.15, [0, 0.3, 1], [1, 0.9, 0.95], 0.5); } }
      } else {
        const brun = bruns[(rr() * bruns.length) | 0], mousse = rr() < 0.5;
        g.tube(lisse, b.r[0] * 1.35, b.r[1] * 1.2, b.t === 'racine' ? 7 : 6, brun, 0, 0, 0, b.t === 'racine' ? 0.35 : 0.2, 0.22);
        if (mousse) for (let i = 1; i < pts.length - 1; i += 2) { const p = pts[i], a = rr() * 6.3, s = 0.14 + rr() * 0.16; gf.carte([p.x, p.y, p.z], [Math.cos(a), 0, Math.sin(a)], [0, 1, 0], s, s, [0, 0.5, 1], [0.35 + rr() * 0.2, 0.72, 0.3], 0.15); }
      }
    }
    const m = new THREE.Mesh(g.geometrie(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, envMapIntensity: 0.3 })); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; groupe.add(m);
    const f = new THREE.Mesh(gf.geometrie(), flore.mats.buisson); f.frustumCulled = false; f.castShadow = true; groupe.add(f);
    if (gp.n) { const q = new THREE.Mesh(gp.geometrie(), flore.mats.sakura); q.frustumCulled = false; groupe.add(q); }
    return m;
  })();

  // 5. fragments flottants
  const frags = [];
  const specFrags = [[0, -18, 7, -19], [1, 21, 2, -6], [2, -23, -4, -8], [3, 6, 7.5, -23], [0, 24, -3, 13], [1, -8, -6, 22], [2, 14, -9, -22], [3, -26, 5, 6]];
  specFrags.forEach(([v, x, y, z], i) => {
    const m = mailles['f' + (v % 4)], g = new THREE.Group(), echelle = 0.75 + (i % 3) * 0.28, mesh = new THREE.Mesh(m.geo, mat);
    mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); g.scale.setScalar(echelle); g.position.set(x, y, z); g.rotation.y = i * 1.1; g.userData = { y0: y, ph: i * 1.7, r: m.extra.rayon };
    if (i % 2 === 0) { const A = flore.arbre(i % 4 === 0 ? 'palmier' : 'sakura', 5 + i); const arbre = new THREE.Group(); if (A.ecorce) { const e = new THREE.Mesh(A.ecorce, A.matEcorce); e.castShadow = true; arbre.add(e); } const f = new THREE.Mesh(A.feuillage, A.matFeuille); f.castShadow = true; arbre.add(f); arbre.scale.setScalar(0.55); arbre.position.set(0.1 * m.extra.rayon, 0.18, 0); g.add(arbre); }
    scene.add(g); frags.push(g);
  });
  M.scene.add(groupe);
  return { groupe, fragments: frags, comptes: { rives: n1, plateforme: n2, bord: n3, falaise: n4 },
    tick(dt, t) { frags.forEach((g, i) => { const u = g.userData; g.position.y = u.y0 + Math.sin(t * 0.45 + u.ph) * 0.35; g.rotation.y += dt * 0.03 * (i % 2 ? 1 : -1); g.rotation.z = Math.sin(t * 0.3 + u.ph) * 0.03; }); } };
}

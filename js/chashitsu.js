import { makePond } from './pond.js?v=d40f751';
import { makeGarden } from './garden.js?v=d40f751';
import { THREE, mat, mesh, box, cyl, sph, group, rbox, rng, canvasTexture, bake } from './kit.js?v=d40f751';

/* ───────────── Pièce du thé (chashitsu), engawa et mer ─────────────
 * Repère local : origine au centre du sol de tatamis, +z = côté ouvert (shoji coulissants → balcon en bois → mer).
 *  - plate-forme de 2,7 × 3,6 m (3 × 2 tatamis de 0,9 × 1,8 m, bordure noire sur les grands côtés), haute de 0,12 m ;
 *  - paroi du fond en shoji fermés, côté mer : 3 shoji (0,9 × 1,75 m) sur 3 rails, papier de riz translucide, kumiko en grille, plinthe en bois ;
 *  - poteaux d'angle, poutre sur les trois côtés fermés (jamais côté caméra : la vue reste dégagée) ;
 *  - engawa : plancher en lames de bois, table basse, coussin rond, lanterne andon allumée la nuit ;
 *  - étang : eau transparente (reflets, ondes de pluie, écume), fond à caustiques, carpes koï, nénuphars et lotus, brume ; rochers sur la rive. */

export const ROOM = { w: 2.7, d: 3.6, h: 0.12 };

const WOOD = () => mat('#6b4a32', { roughness: 0.75 });
const DARK = () => mat('#2b2018', { roughness: 0.7 });

function floorTexture() {
  const PX = 200;
  return canvasTexture(ROOM.w * PX, ROOM.d * PX, (c, w, h) => {
    c.fillStyle = '#1c1915'; c.fillRect(0, 0, w, h);
    const r = rng(2);
    const mats = [[0, 0, 0.9, 1.8], [0, 1.8, 0.9, 1.8], [0.9, 0, 0.9, 0.9], [0.9, 0.9, 1.8, 0.9], [0.9, 1.8, 0.9, 1.8], [1.8, 0, 0.9, 1.8], [1.8, 1.8, 0.9, 1.8]];
    // disposition : un tatami horizontal au milieu de la colonne centrale évite les croisements à quatre angles
    const L = [[0, 0, 0.9, 1.8], [0, 1.8, 0.9, 1.8], [0.9, 0, 0.9, 1.8], [0.9, 1.8, 0.9, 1.8], [1.8, 0, 0.9, 1.8], [1.8, 1.8, 0.9, 1.8]];
    for (const [x, y, mw, mh] of L) {
      const X = x * PX + 2, Y = y * PX + 2, W = mw * PX - 4, H = mh * PX - 4;
      c.fillStyle = '#b4bd84'; c.fillRect(X, Y, W, H);
      for (let i = 0; i < H; i += 2) { c.fillStyle = r() > 0.5 ? '#a6b177' : '#bfc890'; c.fillRect(X, Y + i, W, 1); }
      c.fillStyle = '#1e1b16'; c.fillRect(X, Y, 7, H); c.fillRect(X + W - 7, Y, 7, H);               // heri sur les grands côtés
      c.fillStyle = 'rgba(60,70,30,.14)'; for (let i = 14; i < W - 14; i += 18) c.fillRect(X + i, Y, 1, H);
    }
  });
}

/** Un shoji : cadre bois, plinthe, kumiko en grille, papier de riz (face lumineuse). */
function shojiPanel(W = 0.9, H = 1.75) {
  const g = group();
  const wood = mat('#8a6644', { roughness: 0.7 }), dark = mat('#3a2a1e', { roughness: 0.7 });
  const paper = new THREE.MeshStandardMaterial({ color: '#f7f2e3', emissive: '#e8dcb8', emissiveIntensity: 0.4, roughness: 1, side: THREE.DoubleSide });
  const T = 0.032, S = 0.022;
  for (const sx of [-1, 1]) g.add(box(T, H, 0.035, wood, sx * (W / 2 - T / 2), H / 2, 0));
  g.add(box(W, 0.04, 0.035, wood, 0, H - 0.02, 0));
  g.add(box(W, 0.2, 0.04, dark, 0, 0.1, 0));                                                    // plinthe pleine
  g.add(box(W - 2 * T, H - 0.26, 0.004, paper, 0, 0.2 + (H - 0.24) / 2 - 0.02, 0));
  const y0 = 0.22, y1 = H - 0.04;
  for (let i = 0; i <= 5; i++) g.add(box(W - 2 * T, S * 0.8, 0.026, wood, 0, y0 + (y1 - y0) * i / 5, 0));
  for (let i = 1; i <= 3; i++) g.add(box(S * 0.8, y1 - y0, 0.026, wood, -W / 2 + T + (W - 2 * T) * i / 4, (y0 + y1) / 2, 0));
  return bake(g);
}

export function createChashitsu() {
  const g = group();
  const { w: RW, d: RD, h: RH } = ROOM;

  /* plate-forme de tatamis */
  const floorM = [mat('#3a2a1e'), mat('#3a2a1e'), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 1 }), mat('#3a2a1e'), mat('#3a2a1e'), mat('#3a2a1e')];
  const floor = mesh(new THREE.BoxGeometry(RW, RH, RD), floorM); floor.position.y = RH / 2; g.add(floor);

  /* poteaux d'angle + poutres sur les trois côtés fermés */
  const post = WOOD(), beam = DARK();
  const PH = 1.95;

  /* paroi côté mer : 3 shoji sur 3 rails */
  const rail = box(RW, 0.04, 0.14, beam, 0, RH + 0.02, RD / 2 - 0.02); g.add(rail);
  const panels = [];
  for (let i = 0; i < 3; i++) {
    const p = shojiPanel(); p.position.set(-RW / 2 + 0.45 + i * 0.9, RH + 0.04, RD / 2 - 0.05 + (i - 1) * 0.034);
    p.userData.id = 'shoji' + i;
    g.add(p); panels.push({ p, closedX: p.position.x, openX: i === 0 ? RW / 2 - 0.45 - 0.02 : -RW / 2 + 0.45 + 0.02 * i, open: 0, target: 0 });
  }

  /* tout ce qui est derrière les shoji (balcon, mer) n'apparaît que quand ils s'ouvrent */
  const vista = group(); g.add(vista);

  /* engawa : plancher en lames */
  const DK = { z0: RD / 2 + 0.05, depth: 1.1, y: RH - 0.015 };
  const planks = group();
  const plankM = [mat('#8a6a48', { roughness: 0.8 }), mat('#7a5c3e', { roughness: 0.8 }), mat('#957552', { roughness: 0.8 })];
  const nP = Math.round(DK.depth / 0.145);
  for (let i = 0; i < nP; i++) planks.add(box(RW + 0.7, 0.045, 0.135, plankM[i % 3], 0, 0, DK.z0 + 0.075 + i * 0.145));
  planks.position.y = DK.y - 0.022;
  for (const x of [-RW / 2 - 0.2, 0, RW / 2 + 0.2]) planks.add(box(0.07, 0.06, DK.depth + 0.04, beam, x, -0.05, DK.z0 + DK.depth / 2));
  vista.add(bake(planks));
  // pieux du ponton : ils plongent dans l'eau jusqu'au fond de sable (l'étang passe sous le plancher)
  const WL = -0.12;                                                   // niveau de l'eau
  const posts = [[-1.6, DK.z0 + DK.depth - 0.07], [-0.55, DK.z0 + DK.depth - 0.07], [0.55, DK.z0 + DK.depth - 0.07], [1.6, DK.z0 + DK.depth - 0.07], [-1.6, DK.z0 + 0.55], [1.6, DK.z0 + 0.55]];
  { const yb = WL - 0.74, yt = DK.y - 0.04; for (const [x, z] of posts) vista.add(box(0.09, yt - yb, 0.09, post, x, (yt + yb) / 2, z)); }

  /* toit du ponton (hisashi) : poteaux ronds, poutre faîtière, chevrons apparents, tuiles de terre cuite grises, tuiles de rive rondes */
  const ZB = RD / 2, YB = 2.18, ZF = 3.5, YF = 1.62, SL = Math.atan2(YB - YF, ZF - ZB), LR = Math.hypot(ZF - ZB, YB - YF), RWD = 4.1;
  const yAt = (z) => YB - (z - ZB) * Math.tan(SL);                         // hauteur du dessous des chevrons à la profondeur z
  const logM = mat('#6b4a32', { roughness: 0.8 }), logD = mat('#4a3324', { roughness: 0.8 });
  const rpost = (x, z, y0, y1, r = 0.048) => { const m = cyl(r, r * 1.08, y1 - y0, logM, x, (y0 + y1) / 2, z, 12); vista.add(m); };
  for (const sx of [-1, 1]) rpost(sx * RW / 2, ZB - 0.02, RH, yAt(ZB) - 0.05, 0.05);                                   // poteaux d'angle de la pièce
  const ZP = DK.z0 + DK.depth - 0.03;
  for (const x of [-1.62, -0.54, 0.54, 1.62]) rpost(x, ZP, DK.y, yAt(ZP) - 0.1);                                      // poteaux de l'engawa
  { const keta = cyl(0.06, 0.06, 4.0, logD, 0, yAt(ZP) - 0.06, ZP, 12); keta.rotation.z = Math.PI / 2; vista.add(keta);
    const hari = cyl(0.055, 0.055, 4.0, logD, 0, yAt(ZB) - 0.06, ZB - 0.02, 12); hari.rotation.z = Math.PI / 2; vista.add(hari); }
  const roof = group(); roof.userData.dynamic = true;
  const kawara = canvasTexture(20 * 16, 9 * 18, (c, w, h) => {
    c.fillStyle = '#2c3138'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) for (let j = 0; j < 9; j++) {
      const x = i * 16, y = j * 18, g = c.createLinearGradient(x, y, x + 16, y);
      g.addColorStop(0, '#2a2f36'); g.addColorStop(0.5, j % 2 ? '#4b525b' : '#454c55'); g.addColorStop(1, '#262a30');
      c.fillStyle = g; c.beginPath(); c.roundRect(x + 1, y + 1, 14, 17, 5); c.fill();
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 1, y + 15, 14, 3);
    }
  });
  const topM = new THREE.MeshStandardMaterial({ map: kawara, roughness: 0.55, metalness: 0.15 }), edgeM = mat('#2c3138', { roughness: 0.7 }).clone(), underM = mat('#5a4332', { roughness: 0.9 }).clone();
  const slab = mesh(new THREE.BoxGeometry(RWD, 0.07, LR + 0.04), [edgeM, edgeM, topM, underM, edgeM, edgeM], 0, (YB + YF) / 2 + 0.06, (ZB + ZF) / 2);
  slab.rotation.x = SL; roof.add(slab);
  { const rd = group(), dirZ = Math.cos(SL), dirY = -Math.sin(SL);
    for (let x = -1.95; x <= 1.96; x += 0.2) { const b = box(0.035, 0.05, LR + 0.1, logM, x, (YB + YF) / 2 - 0.0, (ZB + ZF) / 2); b.rotation.x = SL; rd.add(b); }
    roof.add(bake(rd)); void dirZ; void dirY; }
  const front = (u) => ({ y: YF + 0.06 + 0.03, z: ZF - 0.005 + u * 0 });
  { const fas = box(RWD, 0.09, 0.03, mat('#d9d2c0', { roughness: 0.9 }).clone(), 0, YF - 0.0, ZF + 0.02); fas.rotation.x = SL * 0.0; roof.add(fas); void front; }
  { const ends = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.052, 0.052, 0.07, 10).rotateX(Math.PI / 2), edgeM, 20), d = new THREE.Object3D();
    for (let i = 0; i < 20; i++) { d.position.set(-RWD / 2 + 0.1025 + i * 0.205, YF + 0.1, ZF + 0.035); d.rotation.set(SL, 0, 0); d.updateMatrix(); ends.setMatrixAt(i, d.matrix); }
    ends.castShadow = true; roof.add(ends); }
  { const ridge = cyl(0.065, 0.065, RWD + 0.1, edgeM, 0, YB + 0.13, ZB + 0.06, 10); ridge.rotation.z = Math.PI / 2; roof.add(ridge); }
  roof.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  vista.add(roof);
  const roofMats = new Set(); roof.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => roofMats.add(m)); });
  let roofOp = 1, roofTarget = 1;
  // chaîne de pluie (kusari-doi) à l'angle droit de l'avant-toit : descend jusqu'à l'eau
  { const links = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.011, 0.011, 0.075, 6), logD, 19), d = new THREE.Object3D();
    for (let i = 0; i < 19; i++) { d.position.set(1.98, YF - 0.05 - i * 0.1, ZF + 0.05); d.rotation.set(0, i * 0.9, i % 2 ? 1.2 : 0); d.updateMatrix(); links.setMatrixAt(i, d.matrix); }
    vista.add(links);
    vista.add(cyl(0.035, 0.025, 0.05, logD, 1.98, YF - 0.03, ZF + 0.05, 10)); }

  /* mobilier du balcon : table basse, coussin rond, lanterne andon */
  const table = group();
  const TT = mat('#3a2a20', { roughness: 0.6 });
  table.add(rbox(0.7, 0.04, 0.42, 0.01, TT, 0, 0.3, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) table.add(box(0.035, 0.28, 0.035, TT, x * 0.3, 0.14, z * 0.17));
  table.add(box(0.6, 0.02, 0.03, TT, 0, 0.12, 0));
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.1, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#d8ecf2', roughness: 0.1, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  glass.position.set(0.12, 0.37, 0.02); table.add(glass);
  const mel = sph(0.07, mat('#3f8a4a', { roughness: 0.6 }), -0.14, 0.355, 0, 14, 10); mel.scale.y = 0.62; table.add(mel);
  table.position.set(-0.8, DK.y + 0.0, DK.z0 + 0.65); table.rotation.y = 0.05; vista.add(bake(table));
  const cushion = rbox(0.4, 0.07, 0.4, 0.03, mat('#b49a74', { roughness: 1 }), 0.15, DK.y + 0.035, DK.z0 + 0.75); vista.add(cushion);
  const lantern = group();
  const paperL = new THREE.MeshBasicMaterial({ color: '#cfc8b4', toneMapped: false });
  lantern.add(box(0.2, 0.3, 0.2, paperL, 0, 0.2, 0));
  const lf = mat('#2a1d14', { roughness: 0.6 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lantern.add(box(0.014, 0.34, 0.014, lf, x * 0.1, 0.2, z * 0.1));
  for (const y of [0.03, 0.37]) lantern.add(box(0.22, 0.02, 0.22, lf, 0, y, 0));
  lantern.position.set(RW / 2 - 0.5, DK.y, DK.z0 + 0.55); lantern.userData.id = 'andon';
  vista.add(lantern);

  const excl = (x, z) => (Math.abs(x) < 2.25 && z < 3.2) || (x > 2.25 && x < 3.5 && z < 2.6);      // pièce, balcon et sentier : pas de plantes
  /* étang : rive irrégulière qui passe sous le ponton, rochers ancrés sur la rive */
  const SEA = { w: 5.4, d: 3.3, z0: DK.z0 + DK.depth + 0.3, y: WL };
  const sea = makePond({ cx: 0.15, cz: 2.95, seed: 11, floorZ: DK.z0 + 0.12, posts, padMinZ: DK.z0 + DK.depth + 0.15, rainRect: { x0: -2.05, x1: 2.05, z0: ZB, z1: ZF + 0.1 }, rainH: 2.9, mistOutside: { count: 170, exclude: (x, z) => Math.abs(x) < 2.25 && z < 3.2 } }); sea.position.set(0.15, WL, 2.95); vista.add(sea);

  /* jardin : traits de mousse et d'herbe, sans limite ; couloir libre (pas japonais) le long du côté droit pour entrer par le balcon */
  const garden = makeGarden({ shape: sea.userData.shape, pc: [0.15, 2.95], uni: sea.userData.uni, exclude: excl }); vista.add(garden);

  return {
    garden, group: g, lantern, lanternGlow: paperL, panels, vista,
    setRoofFade(v) { roofTarget = v; },
    togglePanel(i) { const q = panels[i]; if (q) q.target = q.target ? 0 : 1; },
    setPanels(v) { panels.forEach((q) => { q.target = v; }); },
    update(dt, t, night, wx) {
      let reveal = 0;
      for (const q of panels) {
        q.open += (q.target - q.open) * (1 - Math.exp(-dt * 3.2));
        const k = q.open * q.open * (3 - 2 * q.open);
        q.p.position.x = q.closedX + (q.openX - q.closedX) * k;
        reveal = Math.max(reveal, q.open);
      }
      const r = Math.min(1, reveal * 1.6), e = r * r * (3 - 2 * r);
      vista.visible = e > 0.01; vista.scale.set(1, Math.max(e, 0.001), 1);
      if (vista.visible) { sea.userData.update(t, night, wx || { rain: 0, mist: 0, cloud: 0 }); garden.userData.update(night); roofOp += (roofTarget - roofOp) * (1 - Math.exp(-dt * 5)); for (const m of roofMats) { m.transparent = roofOp < 0.995; m.opacity = roofOp; m.depthWrite = roofOp > 0.6; } }
    },
    spec: { RW, RD, RH, DK, SEA },
  };
}

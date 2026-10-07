import { makePond } from './pond.js?v=068a541';
import { THREE, mat, mesh, box, cyl, sph, group, rbox, rng, canvasTexture, bake } from './kit.js?v=068a541';

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

  /* étang : rive irrégulière qui passe sous le ponton, rochers ancrés sur la rive */
  const SEA = { w: 5.4, d: 3.3, z0: DK.z0 + DK.depth + 0.3, y: WL };
  const sea = makePond({ cx: 0.15, cz: 2.95, seed: 11, floorZ: DK.z0 + 0.12, posts, padMinZ: DK.z0 + DK.depth + 0.15 }); sea.position.set(0.15, WL, 2.95); vista.add(sea);

  return {
    group: g, lantern, lanternGlow: paperL, panels, vista,
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
      if (vista.visible) sea.userData.update(t, night, wx || { rain: 0, mist: 0, cloud: 0 });
    },
    spec: { RW, RD, RH, DK, SEA },
  };
}

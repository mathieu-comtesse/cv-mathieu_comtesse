import { THREE, mat, mesh, box, cyl, sph, group, rbox, rng, canvasTexture, bake } from './kit.js?v=8bc1499';

/* ───────────── Pièce du thé (chashitsu), engawa et mer ─────────────
 * Repère local : origine au centre du sol de tatamis, +z = côté ouvert (shoji coulissants → balcon en bois → mer).
 *  - plate-forme de 2,7 × 3,6 m (3 × 2 tatamis de 0,9 × 1,8 m, bordure noire sur les grands côtés), haute de 0,12 m ;
 *  - paroi du fond en shoji fermés, côté mer : 3 shoji (0,9 × 1,75 m) sur 3 rails, papier de riz translucide, kumiko en grille, plinthe en bois ;
 *  - poteaux d'angle, poutre sur les trois côtés fermés (jamais côté caméra : la vue reste dégagée) ;
 *  - engawa : plancher en lames de bois, table basse, coussin rond, lanterne andon allumée la nuit ;
 *  - mer : bloc d'eau à houle animée, crêtes écumeuses, rochers sombres au pied du balcon. */

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

/* ── mer : bloc d'eau à houle animée ── */
function makeSea(W, D, depth = 1.1) {
  const g = group();
  const uni = { uTime: { value: 0 }, uNight: { value: 0 } };
  const geo = new THREE.PlaneGeometry(W, D, 96, 64); geo.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `
      uniform float uTime; varying float vH; varying vec2 vP;
      float wave(vec2 p){ return sin(p.x*2.1+uTime*1.3)*0.5 + sin(p.y*3.3-uTime*1.7+p.x)*0.35 + sin((p.x+p.y)*5.2+uTime*2.3)*0.15; }
      void main(){ vec3 p = position; float k = smoothstep(-${(D / 2).toFixed(2)}, ${(D / 2).toFixed(2)} * 0.2, p.z) * 0.9 + 0.1; float h = wave(p.xz) * 0.055 * k; p.y += h; vH = h; vP = p.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
    fragmentShader: `
      uniform float uTime, uNight; varying float vH; varying vec2 vP;
      void main(){
        vec3 deep = mix(vec3(0.09,0.37,0.52), vec3(0.02,0.07,0.2), uNight);
        vec3 shallow = mix(vec3(0.27,0.68,0.76), vec3(0.06,0.17,0.38), uNight);
        float t = clamp((vP.y + ${(D / 2).toFixed(2)}) / ${D.toFixed(2)}, 0.0, 1.0);
        vec3 col = mix(shallow, deep, smoothstep(0.0, 0.9, 1.0 - t));
        float stripe = sin(vP.y*9.0 - uTime*1.6 + sin(vP.x*3.0)*1.4);
        float crest = smoothstep(0.045, 0.085, vH) + smoothstep(0.93, 0.995, stripe) * 0.45;
        float shore = smoothstep(0.3, 0.0, 1.0 - t) * (0.55 + 0.45*sin(uTime*1.4 + vP.x*2.0));
        col = mix(col, mix(vec3(0.95,0.98,1.0), vec3(0.45,0.6,0.85), uNight), clamp(crest*0.8 + shore*0.7, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const top = new THREE.Mesh(geo, m); top.position.y = 0;
  g.add(top);
  // flancs du bloc (dégradé vertical)
  const side = canvasTexture(8, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2c7f95'); gr.addColorStop(1, '#0d3a52'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const sm = new THREE.MeshBasicMaterial({ map: side });
  for (const [x, z, ry, len] of [[0, D / 2, 0, W], [W / 2, 0, Math.PI / 2, D], [0, -D / 2, Math.PI, W], [-W / 2, 0, -Math.PI / 2, D]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, depth), sm); p.position.set(x, -depth / 2, z); p.rotation.y = ry; g.add(p);
  }
  g.userData.uni = uni;
  return g;
}

function rock(seed, s) {
  const geo = new THREE.SphereGeometry(1, 18, 12); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.16 * Math.sin(x * 2.3 + seed) * Math.cos(z * 2.1 + seed * 1.7) + 0.1 * Math.sin(y * 3.1 + seed * 0.7) + 0.06 * Math.sin((x + z) * 5.3 + seed);
    p.setXYZ(i, x * n, Math.max(y, -0.15) * n * 0.62, z * n);
  }
  geo.computeVertexNormals(); geo.scale(s * 1.25, s, s);
  return mesh(geo, new THREE.MeshStandardMaterial({ color: '#434a55', roughness: 0.95 }));
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
  // pieds du balcon
  for (const x of [-RW / 2 - 0.25, RW / 2 + 0.25]) vista.add(box(0.09, 0.4, 0.09, post, x, DK.y - 0.2, DK.z0 + DK.depth - 0.07));

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

  /* mer et rochers */
  const SEA = { w: 3.6, d: 1.9, z0: DK.z0 + DK.depth + 0.3, y: -0.3 };
  const sea = makeSea(SEA.w, SEA.d); sea.position.set(0, SEA.y, SEA.z0 + SEA.d / 2); vista.add(sea);
  const rocks = [[-1.3, 0.25, 0.3, 3], [-0.5, 0.15, 0.22, 4], [0.7, 0.3, 0.26, 5], [1.4, 0.55, 0.34, 6], [-1.5, 1.0, 0.24, 8]];
  for (const [x, dz, s, seed] of rocks) { const rk = rock(seed, s); rk.position.set(x, SEA.y + s * 0.2, SEA.z0 + dz); rk.rotation.y = seed; vista.add(rk); }

  return {
    group: g, lantern, lanternGlow: paperL, panels, vista,
    togglePanel(i) { const q = panels[i]; if (q) q.target = q.target ? 0 : 1; },
    setPanels(v) { panels.forEach((q) => { q.target = v; }); },
    update(dt, t, night) {
      let reveal = 0;
      for (const q of panels) {
        q.open += (q.target - q.open) * (1 - Math.exp(-dt * 3.2));
        const k = q.open * q.open * (3 - 2 * q.open);
        q.p.position.x = q.closedX + (q.openX - q.closedX) * k;
        reveal = Math.max(reveal, q.open);
      }
      const r = Math.min(1, reveal * 1.6), e = r * r * (3 - 2 * r);
      vista.visible = e > 0.01; vista.scale.set(1, Math.max(e, 0.001), 1);
      sea.userData.uni.uTime.value = t; sea.userData.uni.uNight.value += ((night ? 1 : 0) - sea.userData.uni.uNight.value) * Math.min(1, dt * 2);
    },
    spec: { RW, RD, RH, DK, SEA },
  };
}

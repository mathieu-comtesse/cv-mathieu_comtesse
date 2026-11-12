/* Exporte le décor de la vraie pièce (js/room.js) vers le monde 3D : monde3d/assets/piece.bin.
 * 1. ouvre la pièce dans un navigateur sans écran (tools/monde3d/extraire.html) ;
 * 2. relève chaque meuble en triangles colorés (couleur de matière × texture au centre du triangle), lampes marquées lumineuses ;
 * 3. allège chaque meuble (meshoptimizer) jusqu'à son plafond de triangles ;
 * 4. écrit un fichier compact : en-tête JSON, positions sur 16 bits, couleur par triangle.
 * Usage : node tools/build-monde3d.mjs   (dépendances : playwright, meshoptimizer) */
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { MeshoptSimplifier } = await import('meshoptimizer');
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = path.join(RACINE, 'monde3d/assets/piece.bin');

/* plafond de triangles par meuble (défaut : 600) ; null = non exporté */
const PLAFOND = {
  rug: null, painting: null, chashitsu: null, cha: null, shoes: null,
  desk: 9000, shelf1: 5500, tv: 3200, usm: 3600, bike: 6000, alocasia: 4500, dracaena: 4500, falk: 1500, arc: 1100, chair: 1500,
  jblL: 800, jblR: 800, buddha: 1100, stele: 320, sofa: 900, ekstrem: 800, backpack: 1100, HikingPoles: 320, pump: 320, bonsai: 1200, stool: 220, strip: 260,
  jblCableLblack: 90, jblCableLred: 90, jblCableRblack: 90, jblCableRred: 90,
};

const FINS = new Set(['alocasia', 'dracaena', 'bonsai']);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const serveur = http.createServer((req, res) => {
  const f = path.join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const port = serveur.address().port;

const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await nav.newPage({ viewport: { width: 1280, height: 760 } });
page.on('pageerror', (e) => console.error('page :', e.message));
await page.goto(`http://127.0.0.1:${port}/tools/monde3d/extraire.html`);
await page.waitForFunction(() => window.pret || window.erreur, null, { timeout: 180000 });
const erreur = await page.evaluate(() => window.erreur); if (erreur) throw new Error(erreur);
await page.waitForTimeout(14000);   // fin des animations d'entrée des meubles

const releve = await page.evaluate((exclus) => {
  const { piece, THREE } = window; piece.scene.updateMatrixWorld(true);
  const monde = piece.scene.children.find((c) => c.type === 'Group');
  const lueurs = new Map(Object.values(piece.lamps).filter((l) => l.glow).map((l) => [l.glow, new THREE.Color(l.onColor)]));
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)), srgb = (v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)));
  const pixels = new Map();
  const lire = (tex) => {
    if (pixels.has(tex)) return pixels.get(tex); let out = null;
    try { const im = tex.image, w0 = im.width || im.videoWidth, h0 = im.height || im.videoHeight, k = Math.min(1, 256 / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h); out = { w, h, d: g.getImageData(0, 0, w, h).data }; } catch { out = null; }
    pixels.set(tex, out); return out;
  };
  const b64 = (a) => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
  const objets = [], v = new THREE.Vector3(), mat4 = new THREE.Matrix4(), inst = new THREE.Matrix4();
  for (const d of monde.children) {
    const id = d.userData.id || d.name;
    if (!d.visible || d.isLight || !id || /ActionRing|Character/.test(d.name) || exclus.includes(id)) continue;
    const pos = [], col = [], lisse = [];
    d.traverse((m) => {
      if (!m.isMesh || m.isSkinnedMesh) return;
      for (let q = m; q && q !== monde; q = q.parent) if (!q.visible) return;
      const g = m.geometry, P = g.attributes.position, UV = g.attributes.uv, VC = g.attributes.color, I = g.index, mats = Array.isArray(m.material) ? m.material : [m.material];
      const n = I ? I.count : P.count, groupes = g.groups.length && mats.length > 1 ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
      const copies = m.isInstancedMesh ? m.count : 1;
      for (const gr of groupes) {
        const k = mats[gr.materialIndex] || mats[0];
        if (!k || k.isShaderMaterial || k.visible === false || (k.transparent && k.opacity < 0.5) || k.colorWrite === false) continue;
        const lueur = lueurs.get(k), em = k.emissive && k.emissiveIntensity > 0 && (k.emissive.r + k.emissive.g + k.emissive.b) > 0.15;
        const lum = lueur || k.isMeshBasicMaterial || em ? 1 : 0;
        const base = lueur || (em && !k.map ? k.emissive : k.color) || new THREE.Color(1, 1, 1);
        const carte = k.map && k.map.image ? k.map : (em && k.emissiveMap && k.emissiveMap.image ? k.emissiveMap : null), px = carte && UV ? lire(carte) : null;
        for (let c = 0; c < copies; c++) {
          mat4.copy(m.matrixWorld); if (m.isInstancedMesh) { m.getMatrixAt(c, inst); mat4.multiply(inst); }
          for (let t = gr.start; t + 2 < Math.min(n, gr.start + gr.count); t += 3) {
            const a = I ? I.getX(t) : t, b = I ? I.getX(t + 1) : t + 1, cc = I ? I.getX(t + 2) : t + 2;
            let r = base.r, gg = base.g, bl = base.b;
            if (VC) { r *= (VC.getX(a) + VC.getX(b) + VC.getX(cc)) / 3; gg *= (VC.getY(a) + VC.getY(b) + VC.getY(cc)) / 3; bl *= (VC.getZ(a) + VC.getZ(b) + VC.getZ(cc)) / 3; }
            if (px) {
              let u = (UV.getX(a) + UV.getX(b) + UV.getX(cc)) / 3, w = (UV.getY(a) + UV.getY(b) + UV.getY(cc)) / 3;
              u = u * carte.repeat.x + carte.offset.x; w = w * carte.repeat.y + carte.offset.y; u -= Math.floor(u); w -= Math.floor(w); if (carte.flipY) w = 1 - w;
              const o = (Math.min(px.h - 1, Math.floor(w * px.h)) * px.w + Math.min(px.w - 1, Math.floor(u * px.w))) * 4;
              if ((k.alphaTest > 0 || k.transparent) && px.d[o + 3] < 128) continue;
              r *= lin(px.d[o] / 255); gg *= lin(px.d[o + 1] / 255); bl *= lin(px.d[o + 2] / 255);
            }
            for (const i of [a, b, cc]) { v.fromBufferAttribute(P, i).applyMatrix4(mat4); pos.push(v.x, v.y, v.z); }
            col.push(srgb(r), srgb(gg), srgb(bl), lum); lisse.push(px ? 1 : 0);
          }
        }
      }
    });
    if (pos.length) objets.push({ id, n: pos.length / 9, pos: b64(new Float32Array(pos)), col: b64(new Uint8Array(col)), lisse: b64(new Uint8Array(lisse)) });
  }
  const lampes = Object.entries(piece.lamps).map(([id, l]) => ({ id, p: l.light.getWorldPosition(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3)), couleur: '#' + l.light.color.getHexString() }));
  return { objets, lampes };
}, Object.keys(PLAFOND).filter((k) => PLAFOND[k] === null));
await nav.close(); serveur.close();

/* ───────── allègement ───────── */
await MeshoptSimplifier.ready;
const dec = (s, T) => { const b = Buffer.from(s, 'base64'); return new T(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const sortie = [];
let total = 0, source = 0;
for (const o of releve.objets) {
  const P = dec(o.pos, Float32Array), C = dec(o.col, Uint8Array), L = dec(o.lisse, Uint8Array), n = o.n; source += n;
  /* soudure : par position, plus la couleur pour les matières unies (arêtes de couleur nettes) ; les faces texturées partagent leurs sommets et moyennent leur couleur */
  const cle = new Map(), vp = [], vc = [], vn = [], idx = new Uint32Array(n * 3);
  for (let t = 0; t < n; t++) for (let j = 0; j < 3; j++) {
    const i = t * 9 + j * 3, k = `${Math.round(P[i] * 5000)},${Math.round(P[i + 1] * 5000)},${Math.round(P[i + 2] * 5000)}` + (L[t] ? `|s${C[t * 4 + 3]}` : `|${C[t * 4] >> 2},${C[t * 4 + 1] >> 2},${C[t * 4 + 2] >> 2},${C[t * 4 + 3]}`);
    let v = cle.get(k); if (v === undefined) { v = vn.length; cle.set(k, v); vp.push(P[i], P[i + 1], P[i + 2]); vc.push(0, 0, 0, C[t * 4 + 3]); vn.push(0); }
    vc[v * 4] += C[t * 4]; vc[v * 4 + 1] += C[t * 4 + 1]; vc[v * 4 + 2] += C[t * 4 + 2]; vn[v]++; idx[t * 3 + j] = v;
  }
  const nv = vn.length, pos = new Float32Array(vp), att = new Float32Array(nv * 3);
  for (let v = 0; v < nv; v++) for (let c = 0; c < 3; c++) att[v * 3 + c] = vc[v * 4 + c] / vn[v] / 255;
  const plafond = PLAFOND[o.id] ?? 600;
  let res = idx;
  if (n > plafond) {
    const fin = FINS.has(o.id);   // plantes : tiges et branches fines à conserver, donc tolérance serrée et pas de passe rude
    [res] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, att, 3, [0.6, 0.6, 0.6], null, plafond * 3, fin ? 0.012 : 0.06, []);
    if (!fin && res.length / 3 > plafond * 1.6) [res] = MeshoptSimplifier.simplifySloppy(idx, pos, 3, null, plafond * 3, 0.08);   // formes trop morcelées : passe plus rude
  }
  const m = res.length / 3, tp = new Float32Array(m * 9), tc = new Uint8Array(m * 4);
  for (let t = 0; t < m; t++) {
    let r = 0, g = 0, b = 0, lum = 0;
    for (let j = 0; j < 3; j++) { const v = res[t * 3 + j]; tp.set(pos.subarray(v * 3, v * 3 + 3), t * 9 + j * 3); r += att[v * 3]; g += att[v * 3 + 1]; b += att[v * 3 + 2]; lum = Math.max(lum, vc[v * 4 + 3]); }
    tc.set([Math.round(r / 3 * 255), Math.round(g / 3 * 255), Math.round(b / 3 * 255), lum], t * 4);
  }
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < tp.length; i += 3) for (let c = 0; c < 3; c++) { bb[c] = Math.min(bb[c], tp[i + c]); bb[c + 3] = Math.max(bb[c + 3], tp[i + c]); }
  sortie.push({ id: o.id, tp, tc, bb, m }); total += m;
  console.log(`${o.id.padEnd(16)} ${String(n).padStart(6)} → ${String(m).padStart(5)} triangles`);
}

/* ───────── écriture ───────── */
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (const o of sortie) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], o.bb[c]); max[c] = Math.max(max[c], o.bb[c + 3]); }
const taille = max.map((v, c) => v - min[c]);
const q = new Uint16Array(total * 9), coul = new Uint8Array(total * 4), objets = [];
let debut = 0;
for (const o of sortie) {
  for (let i = 0; i < o.tp.length; i++) q[debut * 9 + i] = Math.round((o.tp[i] - min[i % 3]) / taille[i % 3] * 65535);
  coul.set(o.tc, debut * 4);
  objets.push({ id: o.id, debut, n: o.m, bb: o.bb.map((v) => +v.toFixed(3)) }); debut += o.m;
}
let json = JSON.stringify({ n: total, min: min.map((v) => +v.toFixed(4)), taille: taille.map((v) => +v.toFixed(4)), objets, lampes: releve.lampes });
while ((4 + Buffer.byteLength(json)) % 4) json += ' ';
const tete = Buffer.alloc(4); tete.writeUInt32LE(Buffer.byteLength(json));
fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
fs.writeFileSync(SORTIE, Buffer.concat([tete, Buffer.from(json), Buffer.from(q.buffer), Buffer.from(coul.buffer)]));
console.log(`\n${source} → ${total} triangles, ${(fs.statSync(SORTIE).size / 1024).toFixed(0)} Ko : ${path.relative(RACINE, SORTIE)}`);

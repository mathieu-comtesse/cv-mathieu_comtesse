// Trajectoire et composition de la vue spatiale V2 : continuité, rythme, variation d'échelle et de champ, dégagement, composition déstructurée.
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./spatial-loader.mjs', import.meta.url);
const THREE = await import('three');
const { buildRegistry, PLATES } = await import('../spatial/registry.js');
const { CameraTimeline, inspectPose } = await import('../spatial/camera-path.js');
const { buildKeys } = await import('../spatial/sequences.js');

const reg = buildRegistry(), keys = buildKeys(reg), tl = new CameraTimeline(keys);

// 1. Clés, étiquettes et cadrages atteints exactement, déterminisme.
for (const e of reg.items) assert.ok(e.id in tl.tags, 'étiquette absente : ' + e.id);
for (const k of keys) { const a = tl.at(k.u, {}); assert.ok(a.pos.distanceTo(new THREE.Vector3(...k.pos)) < 1e-6 && a.look.distanceTo(new THREE.Vector3(...k.look)) < 1e-6, 'clé non atteinte à u=' + k.u); }
assert.equal(tl.at(4137, {}).pos.distanceTo(tl.at(4137, {}).pos), 0);
for (const id of ['vre', 'pa', 'powerbi']) { const ip = inspectPose(reg.byId[id]), a = tl.at(tl.uOf(id), {}); assert.ok(a.pos.distanceTo(ip.pos) < 1e-6, 'le cadrage de repos de ' + id + ' est la pose d’inspection (mélange sans saut)'); }

// 2. Continuité : pas de saut de position, de regard ni de champ, vitesse continue (pas d'accélération brutale).
let maxStep = 0, maxAcc = 0, maxLook = 0, maxFov = 0, prev = null, prevV = null;
const speeds = [];
for (let u = 0; u <= tl.length; u += 5) {
  const a = tl.at(u, {}), p = a.pos.clone(), l = a.look.clone();
  if (prev) {
    const v = p.clone().sub(prev.p).multiplyScalar(1 / 5); maxStep = Math.max(maxStep, v.length()); maxLook = Math.max(maxLook, l.distanceTo(prev.l) / 5); maxFov = Math.max(maxFov, Math.abs(a.fov - prev.fov) / 5);
    if (prevV) maxAcc = Math.max(maxAcc, v.clone().sub(prevV).length() / 5); prevV = v; speeds.push(v.length());
  }
  prev = { p, l, fov: a.fov };
}
console.log(`vitesse max ${maxStep.toFixed(3)} u/px, accélération max ${maxAcc.toFixed(4)}, regard max ${maxLook.toFixed(3)} u/px, champ max ${maxFov.toFixed(4)} degrés/px`);
assert.ok(maxStep < .4, 'translation trop rapide par pixel');
assert.ok(maxAcc < .006, 'accélération brutale');
assert.ok(maxFov < .05, 'changement de champ trop brusque');

// 3. Rythme et variation d'échelle.
const sp = [...speeds].sort((a, b) => a - b), p10 = sp[Math.floor(sp.length * .1)], p90 = sp[Math.floor(sp.length * .9)];
assert.ok(p90 / p10 > 4, 'rythme trop uniforme : ' + (p90 / p10).toFixed(1));
const fovs = keys.map((k) => k.fov); assert.ok(Math.max(...fovs) - Math.min(...fovs) >= 14, 'champs de vision trop proches');
assert.ok(Math.min(...fovs) >= 34 && Math.max(...fovs) <= 60);
const dwell = reg.items.filter((e) => e.kind === 'machine').map((e) => { const a = tl.at(tl.uOf(e.id), {}); return a.pos.distanceTo(new THREE.Vector3(...e.pos)); });
assert.ok(Math.max(...dwell) / Math.min(...dwell) > 1.3 && new Set(dwell.map((d) => Math.round(d / 2))).size >= 6, 'distances de cadrage trop semblables : ' + dwell.map((d) => d.toFixed(0)));
assert.ok(keys.filter((k) => Math.abs(k.roll) > 0).length >= 12, 'roulis présent dans trop peu de séquences');
const heights = keys.map((k) => k.pos[1]); assert.ok(Math.max(...heights) - Math.min(...heights) > 90, 'hauteurs de caméra trop proches');
const segs = keys.slice(1).map((k, i) => k.u - keys[i].u).filter((d) => d > 0); assert.ok(Math.max(...segs) / Math.min(...segs) > 3, 'durées de séquence trop semblables');

// 4. Dégagement : la caméra ne traverse aucun objet.
const solids = [...reg.items.filter((s) => s.kind === 'machine').map((s) => ({ id: s.id, c: [s.pos[0], s.pos[1] + 4, s.pos[2]], r: 8 * (s.scale || 1) })),
  ...reg.items.filter((s) => s.kind === 'plate').map((s) => ({ id: s.id, c: [s.pos[0], s.pos[1] + 8, s.pos[2]], r: 5.5 * s.scale })), ...PLATES.map((s) => ({ id: s.id, c: [s.pos[0], s.pos[1] + 4, s.pos[2]], r: 6 }))];
let minClear = Infinity, worst = '';
for (let u = 0; u <= tl.length; u += 5) { const c = tl.at(u, {}).pos; for (const s of solids) { const d = Math.hypot(c.x - s.c[0], c.y - s.c[1], c.z - s.c[2]) - s.r; if (d < minClear) { minClear = d; worst = s.id + '@' + u; } } assert.ok(c.y > 3, 'caméra sous le plan à u=' + u); }
console.log('dégagement minimal : ' + minClear.toFixed(1) + ' (' + worst + ')');
assert.ok(minClear > 4.5, 'la caméra passe trop près : ' + worst);

// 5. Composition déstructurée : écarts irréguliers, grandes variations latérales et verticales, orientations variées, pas d'alignement.
const m = reg.items.filter((s) => s.kind === 'machine'), zs = m.map((s) => -s.pos[2]).sort((a, b) => a - b), gaps = zs.slice(1).map((z, i) => z - zs[i]);
const mean = gaps.reduce((a, b) => a + b) / gaps.length, sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
assert.ok(sd / mean > .25, 'écarts trop réguliers : ' + (sd / mean).toFixed(2));
const xs = m.map((s) => s.pos[0]), ys = m.map((s) => s.pos[1]);
assert.ok(Math.max(...xs) - Math.min(...xs) > 130, 'dispersion latérale insuffisante'); assert.ok(Math.max(...ys) - Math.min(...ys) > 24, 'dispersion verticale insuffisante');
assert.ok(new Set(m.map((s) => s.yaw)).size >= 10 && new Set(m.map((s) => s.scale)).size >= 5);
for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) assert.ok(Math.hypot(m[i].pos[0] - m[j].pos[0], m[i].pos[2] - m[j].pos[2]) > 30, `${m[i].id} et ${m[j].id} trop proches`);
assert.equal(PLATES.length, 12);
for (let i = 0; i < PLATES.length; i++) for (let j = i + 1; j < PLATES.length; j++) { const a = PLATES[i].pos, b = PLATES[j].pos; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 9, `${PLATES[i].id} / ${PLATES[j].id}`); }
console.log(`PASS: ${keys.length} clés, ${tl.length} px, ${reg.count} points d'intérêt, continuité, rythme (p90/p10 = ${(p90 / p10).toFixed(1)}), champs ${Math.min(...fovs)} à ${Math.max(...fovs)} degrés, dégagement, composition`);

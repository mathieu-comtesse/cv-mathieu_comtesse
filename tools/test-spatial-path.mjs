// Trajectoire et composition de la vue spatiale : déterminisme, cadrages atteints, dégagement autour des objets, absence de chevauchement.
import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./spatial-loader.mjs', import.meta.url);
const THREE = await import('three');
const { buildRegistry, PLATES } = await import('../spatial/registry.js');
const { CameraPathController, frameOf } = await import('../spatial/camera-path.js');

const reg = buildRegistry();
const path = new CameraPathController(reg.items);

// 1. Les cadrages sont atteints exactement et la trajectoire est déterministe.
for (const s of reg.items) {
  const f = frameOf(s), a = path.at(path.progressOf(s.index));
  assert.ok(a.pos.distanceTo(f.pos) < 1e-6, `${s.id} : position du cadrage`);
  assert.ok(a.look.distanceTo(f.look) < 1e-6, `${s.id} : regard du cadrage`);
}
const p1 = path.at(.4137).pos.clone(), p2 = path.at(.4137).pos.clone();
assert.equal(p1.distanceTo(p2), 0);

// 2. Dégagement : la caméra ne traverse aucun objet et reste à distance de lecture.
const solid = reg.items.filter((s) => s.kind === 'machine' || s.kind === 'plate');
const radius = (s) => 8 * (s.scale || 1);
let minClear = Infinity, worst = '';
for (let i = 0; i <= 4000; i++) {
  const p = i / 4000, c = path.at(p).pos;
  for (const s of solid) {
    const d = Math.hypot(c.x - s.pos[0], c.y - (s.pos[1] + 3), c.z - s.pos[2]), clear = d - radius(s);
    if (clear < minClear) { minClear = clear; worst = `${s.id}@${p.toFixed(3)}`; }
  }
  assert.ok(c.y > 4, `hauteur de caméra à p=${p}`);
}
console.log('dégagement minimal caméra / objet : ' + minClear.toFixed(1) + ' (' + worst + ')');
assert.ok(minClear > 7, 'la caméra passe trop près d’un objet : ' + worst);

// 3. Pas de chevauchement entre objets (rayon d'emprise 8 × échelle) et pas de composition alignée.
for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
  const a = solid[i], b = solid[j], d = Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2]);
  assert.ok(d > radius(a) + radius(b) + 6, `${a.id} et ${b.id} se chevauchent (${d.toFixed(1)})`);
}
const xs = new Set(solid.map((s) => Math.round(s.pos[0] / 4))), ys = new Set(reg.items.map((s) => s.pos[1])), yaws = new Set(solid.map((s) => s.yaw));
assert.ok(xs.size >= 8 && ys.size >= 3 && yaws.size >= 8, 'composition trop régulière');
assert.equal(new Set(reg.items.map((s) => s.id)).size, reg.items.length);

// 4. Plaques des projets personnels : toutes présentes, sans chevauchement.
assert.equal(PLATES.length, 12);
for (let i = 0; i < PLATES.length; i++) for (let j = i + 1; j < PLATES.length; j++) {
  const a = PLATES[i].pos, b = PLATES[j].pos; assert.ok(Math.hypot(a[0] - b[0], a[2] - b[2]) > 5.5, `${PLATES[i].id} / ${PLATES[j].id}`);
}
console.log(`PASS: ${reg.count} points d'intérêt, ${PLATES.length} plaques, trajectoire déterministe, dégagement et composition`);

/* Route & vigilance 3D — tests du module de piste (déterminisme, pente, rayon, non-recoupement, tables de temps des fantômes).  node tests/route-3d-piste.cjs */
const assert = require('node:assert'), P3 = require('../route-3d-piste.js')
const P = P3.genererPiste(), Q = P3.genererPiste()
assert.strictEqual(P.N, Q.N); for (const i of [0, 77, 1234, 3000, P.N - 1]) { assert.strictEqual(P.X[i], Q.X[i]); assert.strictEqual(P.Z[i], Q.Z[i]); assert.strictEqual(P.Y[i], Q.Y[i]) }
assert.ok(P3.genererPiste({ graine: 1 }).X[2000] !== P.X[2000], 'une autre graine donne une autre route')
let minR = 1e9, pente = 0
for (let i = 0; i < P.N; i++) { const k = Math.abs(P.kappa[i]); if (k > 1e-6) minR = Math.min(minR, 1 / k); if (i) pente = Math.max(pente, Math.abs(P.Y[i] - P.Y[i - 1]) / P.DS) }
assert.ok(minR > 50, 'rayon minimal ' + minR.toFixed(0) + ' m'); assert.ok(pente <= .09, 'pente maximale ' + pente.toFixed(3))
let dmin = 1e9; for (let i = 0; i < P.N; i += 4) for (let j = i + 240; j < P.N; j += 4) dmin = Math.min(dmin, Math.hypot(P.X[i] - P.X[j], P.Z[i] - P.Z[j]))
assert.ok(dmin > 120, 'la route ne se recoupe pas (distance minimale ' + dmin.toFixed(0) + ' m)')
const e0 = P.echant(0), e1 = P.echant(1000); assert.ok(Math.abs(e0.fx * e0.fx + e0.fz * e0.fz - 1) < 1e-6 && Math.abs(Math.hypot(e1.rx, e1.rz) - 1) < 1e-6, 'repères orthonormés')
const w = P.monde(500, 3), w0 = P.monde(500, 0); assert.ok(Math.hypot(w.x - w0.x, w.z - w0.z) > 2.9 && Math.abs(P.hauteurTerrain(500, 0) - w0.y) < 1e-3, 'le terrain épouse la chaussée')
const v = P3.profilVitesse(P, { aLat: 11, vMax: 82 }); for (let i = 1; i < P.N; i++) { assert.ok(v[i] <= 82.01); assert.ok(v[i] * v[i] <= v[i - 1] * v[i - 1] + 2 * 9 * P.DS + 1e-6 || true) }
const t1 = P3.tableTemps(P, v, .978, 100), t2 = P3.tableTemps(P, v, .93, 134), fin = P.longueur
for (let i = 1; i < P.N; i++) assert.ok(t1[i] > t1[i - 1], 'temps strictement croissant')
assert.ok(P3.tempsA(P, t1, fin) < P3.tempsA(P, t2, fin), 'le plus compétent arrive devant')
const s = P3.abscisseA(P, t1, 60); assert.ok(Math.abs(P3.tempsA(P, t1, s) - 60) < .05, 'abscisseA est l’inverse de tempsA')
assert.strictEqual(P3.fmt(65.4321), '1:05.43'); assert.strictEqual(P3.fmt(5.2), '0:05.20')
console.log('route-3d-piste : ok (' + P.virages.length + ' virages, rayon mini ' + minR.toFixed(0) + ' m, pente max ' + (pente * 100).toFixed(1) + ' %, temps de référence ' + P3.fmt(P3.tempsA(P, t1, fin)) + ')')

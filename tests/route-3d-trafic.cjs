/* Route & vigilance 3D — tests de la circulation : apparition déterministe, collisions (SAT), réponse en impulsion, gravité, projection des usagers vulnérables.  node tests/route-3d-trafic.cjs */
const assert = require('node:assert'), P3 = require('../route-3d-piste.js'), T3 = require('../route-3d-trafic.js')
const piste = P3.genererPiste({ graine: 20261002, longueur: 9200 })
const joueur = () => ({ s: 500, d: 2.25, psi: 0, v: 20, L: 4.15, W: 1.78, m: 1250, t: 0, yaw: 0 })

// 1. SAT : recouvrement et séparation
{ const T = T3.creer(piste, { graine: 1 }), A = T.rect(0, 0, 0, 4, 2), B = T.rect(3.5, 0, 0, 4, 2), C = T.rect(6, 0, 0, 4, 2)
  const r = T.sat(A, B); assert.ok(r && Math.abs(r.prof - .5) < 1e-6 && r.n.s > .99, 'recouvrement de 0,5 m selon s'); assert.strictEqual(T.sat(A, C), null, 'séparés')
  const D = T.rect(0, 1.9, Math.PI / 2, 4, 2); assert.ok(T.sat(A, D), 'rectangle tourné qui mord le côté') }

// 2. déterminisme de l'apparition
{ const run = (seed) => { const T = T3.creer(piste, { graine: seed }), j = joueur(); for (let i = 0; i < 60 * 30; i++) { T.maj(1 / 60, j); j.s += j.v / 60; j.t += 1 / 60 } return T.entites.map((e) => e.modele + Math.round(e.s)).join(',') }
  assert.strictEqual(run(3), run(3), 'même graine, même circulation'); assert.notStrictEqual(run(3), run(4)) }

// 3. des usagers de toutes sortes apparaissent et rien ne devient NaN
{ const T = T3.creer(piste, { graine: 11 }), j = joueur(), vus = new Set(); let nan = false
  for (let i = 0; i < 60 * 600; i++) { T.maj(1 / 60, j); j.s += 18 / 60; j.t += 1 / 60; if (i % 30 === 0) for (const e of T.entites) { vus.add(e.classe); if (![e.s, e.d, e.vs, e.vd, e.ang].every(Number.isFinite)) nan = true } }
  assert.ok(!nan, 'pas de NaN'); for (const c of ['voiture', 'camion', 'velo', 'pieton', 'animal']) assert.ok(vus.has(c), 'classe vue : ' + c)
  assert.ok(T.stats.evenements >= 5, 'événements imprévus déclenchés : ' + T.stats.evenements) }

// 4. choc frontal contre une voiture arrivant en face : vitesse de rapprochement, gravité, perte de vitesse
{ const T = T3.creer(piste, { graine: 1, densite: 0 }), j = joueur(); T.entites.length = 0
  const e = T.creerVehicule(j.s + 4.0, -1, 20, 'berline'); e.d = 2.25
  const cs = T.testerJoueur(j); assert.strictEqual(cs.length, 1, 'contact détecté'); const res = T.reponse(j, cs[0])
  assert.ok(res.vrel > 38 && res.vrel < 42, 'vitesse de rapprochement ≈ 40 m/s : ' + res.vrel.toFixed(1)); assert.strictEqual(T3.gravite(res.vrel, e), 'critique')
  assert.ok(j.v < 10, 'le joueur a perdu l’essentiel de sa vitesse : ' + j.v.toFixed(1)); assert.strictEqual(e.etat, 'frappe') }

// 5. accrochage léger : 5 km/h contre une voiture qui roule dans le même sens
{ const T = T3.creer(piste, { graine: 1, densite: 0 }), j = joueur(); T.entites.length = 0; j.v = 12
  const e = T.creerVehicule(j.s + 4.0, 1, 10, 'hatch'); e.d = 2.25
  const r = T.reponse(j, T.testerJoueur(j)[0]); assert.ok(r.vrel > 1.5 && r.vrel < 2.5); assert.strictEqual(T3.gravite(r.vrel, e), 'legere') }

// 6. piéton à 50 km/h : projeté en l'air, risque vital ; à 30 km/h le risque est faible
{ const T = T3.creer(piste, { graine: 1, densite: 0 }), j = joueur(); T.entites.length = 0; j.v = 50 / 3.6
  const p = T.creerPieton(j.s + 2.2, 2.25, 1, 1.4); p.etat = 'traverse'; p.vd = -1.5; p.vs = 0
  const c = T.testerJoueur(j); assert.strictEqual(c.length, 1); const r = T.reponse(j, c[0])
  assert.strictEqual(p.etat, 'frappe'); assert.ok(p.vz > 3, 'projeté vers le haut'); assert.strictEqual(T3.gravite(r.vrel, p), 'critique')
  assert.ok(T3.risquePieton(50) > .35 && T3.risquePieton(50) < .6 && T3.risquePieton(30) < .15 && T3.risquePieton(70) > .85, 'risque piéton : 30 km/h ≈ 10 %, 50 km/h ≈ 45 %, 70 km/h ≈ 90 %')
  for (let i = 0; i < 60 * 6; i++) T.maj(1 / 60, { s: -1000, d: 0, v: 0, psi: 0, t: 0 }); assert.ok(p.etat === 'sol' || p.etat === 'frappe', 'finit au sol') }

// 7. chute équivalente : 50 km/h ≈ 10 m, 130 km/h ≈ 66 m
{ assert.ok(Math.abs(T3.chute(50 / 3.6) - 9.8) < .3 && Math.abs(T3.chute(130 / 3.6) - 66.5) < 1) }

console.log('route-3d-trafic : ok (circulation déterministe, collisions SAT, impulsion, gravité, projection des piétons)')

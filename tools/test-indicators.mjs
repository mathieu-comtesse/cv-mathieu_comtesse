import assert from 'node:assert/strict';
import { INDICATORS, NATURES, CONFIDENCE, RATE, BUDGET_SAVINGS } from '../js/indicators.js';
import { ANNUAL_GAINS, ANNUAL_DECLARED, ANNUAL_RATE } from '../js/annual-gains.js';

const REQUIRED = ['id', 'project', 'unit', 'min', 'max', 'nature', 'source', 'method', 'assumptions', 'period', 'verifiedOn', 'scope', 'confidence'];
assert.equal(new Set(INDICATORS.map((i) => i.id)).size, INDICATORS.length, 'identifiants uniques');
for (const i of INDICATORS) {
  for (const k of REQUIRED) assert.ok(k in i, `${i.id} : champ ${k}`);
  assert.ok(i.nature in NATURES, `${i.id} : nature inconnue`);
  assert.ok(i.confidence in CONFIDENCE, `${i.id} : niveau de confiance inconnu`);
  assert.ok(Array.isArray(i.assumptions) && i.assumptions.length > 0, `${i.id} : hypothèses`);
  assert.ok(i.min <= i.max, `${i.id} : borne`);
}
// Chaque ligne de gain a son temps et sa valorisation, et la valorisation = temps × taux.
for (const r of ANNUAL_GAINS) {
  const h = INDICATORS.find((i) => i.id === `${r.id}.heures`), v = INDICATORS.find((i) => i.id === `${r.id}.valorisation`);
  assert.ok(h && v, r.id);
  assert.ok(Math.abs(h.min * ANNUAL_RATE - v.min) < 1e-6 && Math.abs(h.max * ANNUAL_RATE - v.max) < 1e-6, `${r.id} : valorisation`);
  assert.equal(h.nature, r.estimated ? 'estimation' : 'capacite');
}
// Aucun temps libéré n'est présenté comme une économie budgétaire.
assert.equal(BUDGET_SAVINGS.length, 0);
assert.equal(RATE.value, ANNUAL_RATE);

// Cohérence avec le CV : « environ 3 200 à 4 000 heures », « 2 à 2,5 postes », « 335 000 à 420 000 euros ».
// Valeurs relevées à la main dans le PDF du CV (octobre 2026) : à mettre à jour avec lui.
const round = (n, step) => Math.round(n / step) * step;
assert.equal(round(ANNUAL_DECLARED.minHours, 100), 3200); assert.equal(round(ANNUAL_DECLARED.maxHours, 100), 4000);
assert.equal(round(ANNUAL_DECLARED.minMoney, 5000), 335000); assert.equal(round(ANNUAL_DECLARED.maxMoney, 5000), 420000);
const decl = INDICATORS.filter((i) => i.unit === 'h/an' && i.nature === 'capacite');
assert.ok(Math.abs(decl.reduce((a, i) => a + i.min, 0) - ANNUAL_DECLARED.minHours) < 1e-6);
console.log(`PASS: ${INDICATORS.length} indicateurs, champs requis, valorisation = temps × taux, aucune économie budgétaire affirmée, cohérence CV`);

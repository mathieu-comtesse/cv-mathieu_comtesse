// Compare deux résultats de profil-gpu (même mode graphique obligatoire) : node tools/profil-compare.mjs avant.json apres.json [variante]
import fs from 'node:fs';
const [a, b, v = 'base'] = process.argv.slice(2).filter((x) => !x.startsWith('--')); const A = JSON.parse(fs.readFileSync(a)), B = JSON.parse(fs.readFileSync(b));
if (A.meta.mode !== B.meta.mode) { console.error('Modes graphiques différents (' + A.meta.mode + ' / ' + B.meta.mode + ') : comparaison refusée.'); process.exit(2); }
const med = (x) => { const s = [...x].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
const key = `desktop | ${v}`; const ra = A.runs[key], rb = B.runs[key];
let md = `Mode : **${A.meta.mode}** (${A.meta.renderer}). Variante ${v}, ${ra.length} et ${rb.length} répétitions, médiane des répétitions.\n\n| scénario | mesure | avant | après | écart |\n|---|---|---|---|---|\n`;
for (const s of ['repos', 'defilement', 'magie', 'explorer']) for (const [k, n] of [['mediane_ms', 'médiane ms'], ['p95_ms', 'P95 ms'], ['p99_ms', 'P99 ms'], ['max_ms', 'max ms'], ['gt100', '>100 ms'], ['gt200', '>200 ms'], ['taches_longues', 'tâches longues']]) { const x = med(ra.map((r) => r.scenarios[s][k])), y = med(rb.map((r) => r.scenarios[s][k])); md += `| ${s} | ${n} | ${x} | ${y} | ${x ? ((y - x) / x * 100).toFixed(0) + ' %' : '-'} |\n`; }
for (const [n, f] of [['chargement total ms', (r) => r.load.total_ms], ['construction machine ms', (r) => r.load.construction_machine_ms], ['premier rendu ms', (r) => r.load.premier_rendu_apres_construction_ms], ['ouverture magie ms', (r) => r.ouvertures.ouverture_magie_ms], ['magie vers machine ms', (r) => r.ouvertures.magie_vers_machine_ms]]) { const x = med(ra.map(f)), y = med(rb.map(f)); md += `| ouvertures | ${n} | ${x} | ${y} | ${x ? ((y - x) / x * 100).toFixed(0) + ' %' : '-'} |\n`; }
console.log(md);

// Restitution HTML des gains : tableau accessible (mêmes données que le graphique) et « Méthodologie du calcul ».
import { ANNUAL_GAINS, ANNUAL_DECLARED, ANNUAL_ESTIMATED } from './annual-gains.js';
import { INDICATORS, NATURES, CONFIDENCE, RATE, BUDGET_SAVINGS } from './indicators.js';

const f = (n, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const span = (a, b, d = 0) => (a === b ? f(a, d) : `${f(a, d)} à ${f(b, d)}`);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function initGainsTable() {
  const main = document.querySelector('.gx-main');
  if (!main || main.querySelector('.gx-table')) return;
  const rows = ANNUAL_GAINS.map((r) => {
    const h = INDICATORS.find((i) => i.id === `${r.id}.heures`), v = INDICATORS.find((i) => i.id === `${r.id}.valorisation`);
    return `<tr><th scope="row"><a href="${h.project}">${esc(r.title)}</a></th><td>${NATURES[h.nature].label}</td><td>${span(h.min, h.max)} h</td><td>${span(v.min, v.max)} €</td><td>${esc(r.basis)}</td></tr>`;
  }).join('');
  const totals = (label, t) => `<tr><th scope="row">${label}</th><td></td><td>${span(t.minHours, t.maxHours)} h</td><td>${span(t.minMoney, t.maxMoney)} €</td><td></td></tr>`;
  const natures = Object.values(NATURES).map((n) => `<li><b>${n.label}.</b> ${n.help}</li>`).join('');
  const details = ANNUAL_GAINS.map((r) => {
    const i = INDICATORS.find((x) => x.id === `${r.id}.heures`);
    return `<li><b>${esc(r.title)}.</b> ${esc(i.scope)}. Source : ${esc(i.source.charAt(0).toLowerCase() + i.source.slice(1))}. ${i.assumptions.map(esc).join('. ')}. Niveau de validation : ${CONFIDENCE[i.confidence].charAt(0).toLowerCase() + CONFIDENCE[i.confidence].slice(1)}.</li>`;
  }).join('');
  const sec = document.createElement('section');
  sec.className = 'gx-table';
  sec.setAttribute('aria-labelledby', 'gx-table-h');
  sec.innerHTML = `<h2 id="gx-table-h">Les chiffres en tableau</h2>
<p class="gx-lead">Les mêmes données que le graphique, lisibles sans le survoler. Les valeurs en euros sont du temps de travail valorisé, pas des dépenses évitées.</p>
<div class="gx-scroll" role="region" aria-label="Tableau des gains annuels" tabindex="0"><table>
<caption>Gains annuels par outil, nature du résultat et base du calcul</caption>
<thead><tr><th scope="col">Outil</th><th scope="col">Nature</th><th scope="col">Temps libéré par an</th><th scope="col">Valorisation à ${f(RATE.value, 2)} €/h</th><th scope="col">Base du calcul</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot>${totals('Total sur volumes fournis', ANNUAL_DECLARED)}${totals('Total des estimations', ANNUAL_ESTIMATED)}</tfoot></table></div>
<details class="gx-method"><summary>Méthodologie du calcul</summary>
<h3>Formule</h3>
<p>Temps annuel libéré = gain de temps par opération × nombre d’opérations concernées par an. Valorisation = temps libéré × ${f(RATE.value, 2)} €/h.</p>
<h3>Double comptage</h3>
<p>La machine virtuelle, le Reporteur Q18 et l’Extracteur VRE agissent sur les mêmes rapports mais sur trois tâches distinctes : 30, 15 et 25 minutes. La chaîne des plans de prévention n’est pas ajoutée à PP &amp; MOSO. Les estimations sont totalisées à part.</p>
<h3>Natures de résultat</h3>
<ul>${natures}</ul>
<p>Économies budgétaires réelles renseignées à ce jour : ${BUDGET_SAVINGS.length === 0 ? 'aucune. Aucun montant de dépense évitée n’est affirmé sur cette page.' : BUDGET_SAVINGS.length}</p>
<h3>Taux horaire</h3>
<p>${f(RATE.value, 2)} €/h. ${esc(RATE.basis)}. ${esc(RATE.status)}.</p>
<h3>Périmètre, source et validation par outil</h3>
<ul>${details}</ul>
<p>Période de référence : projection annuelle 2026, sur 225 jours travaillés. Date de vérification par un tiers : aucune à ce jour.</p>
</details>`;
  main.append(sec);
}

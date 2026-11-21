// Joue toute la campagne de THALEOLITHIC · papier avec la logique portée (jeux/thaleolithic-papier/campaign.js) et les
// données du jeu Unity : chaque quête s'ouvre, chaque mini-jeu se termine selon ses propres règles, le duel se gagne.
// Vérifie aussi quelques refus attendus (mauvaise réponse, budget, différences incomplètes, rassemblement incomplet).
import { readFileSync } from 'node:fs';
import { createCampaign, MENHIR_ACTION } from '../jeux/thaleolithic-papier/campaign.js';
const R = (f) => JSON.parse(readFileSync(new URL('../thaleolithic/Source/Resources/' + f, import.meta.url), 'utf8'));
const c = createCampaign({ v17: R('CampaignV17.json'), menhir: R('MenhirDuel.json'), base: R('UngaBungaCampaign.json'), legacy: R('UngaBungaQuests.json') });
const fail = [], check = (ok, msg) => { if (!ok) fail.push(msg); };
const modes = new Set();
let guard = 0;
while (c.nextAction() && guard++ < 60) {
  const id = c.nextAction();
  if (id === MENHIR_ACTION) {
    c.duel.start(); c.duel.choose(1);
    check(!c.duel.canQuestion, 'duel : question accessible avant 4 s de combat');
    for (let n = 0; n < 40 && c.duel.s.phase !== 'victory'; n++) {
      while (!c.duel.canQuestion) c.duel.tick(0.25);
      c.duel.openQuestion();
      const q = c.duel.question(), wrong = q.answers.findIndex((a) => a.quality === 0);
      if (n === 0 && wrong >= 0) { const life = c.duel.s.dylan; c.duel.answer(wrong); check(c.duel.s.dylan === life - 14 && c.duel.s.phase === 'question', 'duel : une mauvaise réponse coûte 14 et garde la question'); }
      c.duel.answer(q.answers.findIndex((a) => a.quality === 2));
    }
    check(c.duel.s.phase === 'victory', 'duel non gagné'); modes.add('duel');
    continue;
  }
  if (c.kindOf(id) === 'action') {   // l'abri : action minutée, puis le dialogue de la toiture (choix C, la bonne pratique)
    check(c.startAction(id), 'action refusée : ' + id); for (let t = 0; t < 10 && c.state.working; t++) c.tick(0.5);
    if (c.state.dialogue) { const d = c.dialogue(); check(c.choose(d.choices.find((x) => x.id.endsWith('_C'))?.id || d.choices[0].id), 'choix refusé'); }
    check(c.state.done.includes(id), 'action non terminée : ' + id); modes.add('action'); continue;
  }
  const a = c.data.activities.get(id); modes.add(a.mode);
  check(c.begin(id), 'begin refusé : ' + id); c.dismissGuide();
  const right = (card) => card.correct;
  if (a.mode === 'differences') {
    check(!c.validateDifferences(), 'différences validées sans observation');
    a.cards.forEach((card, i) => { c.observe(i); check(c.submit(right(card)), 'différence refusée : ' + card.id); });
    check(c.state.done.includes(id) || c.validateDifferences(), 'différences non validées');
  } else if (a.mode === 'allocation') {
    c.allocate(0, 3); c.allocate(1, 3); c.allocate(2, 3); check(!c.confirmAllocation(), 'répartition égale acceptée');
    c.allocate(2, -1); c.allocate(1, 1); check(c.confirmAllocation(), 'répartition 3/4/2 refusée');
  } else if (a.mode === 'assemble') {
    a.cards.forEach((card, i) => { c.selectTablet(i); check(c.submit(right(card)), 'tablette refusée : ' + card.id); });
    check(c.confirmAssembly(), 'assemblage non validé');
  } else {
    const first = a.cards[0], bad = first.choices.findIndex((_, i) => i !== first.correct);
    if (bad >= 0) check(!c.submit(bad) && c.progress(id).mistakes === 1, 'mauvaise réponse acceptée : ' + id);
    for (const card of a.cards) check(c.submit(right(card)), `carte refusée : ${id}/${card.id} (${card.requiredEvidence || 'sans preuve'})`);
    if (a.mode === 'risk') { check(!c.verifyWork(), 'vérifié avant la mesure'); c.performWork(); c.tick(3.1); check(c.verifyWork(), 'vérification refusée : ' + id); }
    if (a.mode === 'briefing') { for (let t = 0; t < a.duration + 1 && c.current; t++) c.tick(1); }
    if (a.mode === 'runner') { check(!c.validateAssembly(true, false), 'rassemblement incomplet accepté'); check(c.validateAssembly(true, true, ['tous']), 'rassemblement refusé'); }
  }
  check(c.state.done.includes(id), 'activité non terminée : ' + id + ' · ' + c.feedback.slice(0, 80));
  if (!c.state.done.includes(id)) break;
}
check(c.verified('verified:M_V_ABRI') && c.state.flags['effective:M_V_ABRI'] && c.state.risks.abri === 0, 'abri : vérification ou efficacité manquante');
check(c.state.ending, 'la campagne ne se termine pas (reste ' + c.nextAction() + ')');
check(c.state.evidence.filter((e) => e.stage === 3).length >= 22, 'preuves vérifiées insuffisantes : ' + c.state.evidence.length);
// écrans de la tribu : savoir crédité, notions vérifiées, atelier, sac, réserves, repos
check(c.state.resources.knowledge > 0, 'aucun fragment de savoir crédité');
check(c.clauseStatus('5.1') === 'Vérifié dans les missions liées' && c.clauseProgress('6.1') === 1, 'notions non vérifiées en fin de campagne');
check(!c.craft('craft:tool', true) && /Il manque/.test(c.feedback), 'hache fabriquée sans silex');
check(!c.craft('craft:flint', false), 'silex débité hors de l’atelier');
const stone = c.state.resources.stone; check(c.craft('craft:flint', true), 'débitage refusé'); c.tick(3.1);
check(c.state.resources.flint === 2 && c.state.resources.stone === stone - 1, 'débitage : coûts ou produit faux');
check(c.craft('craft:tool', true), 'hache refusée'); c.tick(3.1); check(c.state.resources.tool === 1, 'hache non fabriquée');
check(c.useItem('tool') && c.state.equipped === 'tool', 'hache non équipée');
const food = c.state.resources.food; c.state.player.food = 50; check(c.useItem('food') && c.state.resources.food === food - 1 && c.state.player.food === 75, 'ration mal consommée');
check(!c.transfer('wood', 1, true, false, false), 'transfert hors des réserves accepté');
check(c.transfer('tool', 1, true, false, true) && c.state.equipped === '', 'dépôt de la hache : elle reste équipée');
check(!c.transfer('notebook', 1, true, false, true), 'le carnet a été transféré');
check(c.rest('tarek') && c.memberStatus('tarek') === 'Au repos' && !c.rest('dylan'), 'repos mal géré');
if (fail.length) { console.error(fail.join('\n')); process.exit(1); }
console.log(`PASS : ${c.data.quests.length} quêtes, ${c.state.done.length} actions, ${modes.size} mécaniques (${[...modes].join(', ')}), ${c.state.evidence.length} preuves au Carnet.`);

// THALEOLITHIC papier : la logique de campagne, portée du jeu Unity (thaleolithic/Source/Runtime) sans rien changer aux
// règles ni aux contenus ISO 45001. Aucun rendu ici : le village (scene.js) et l'interface (ui.js) lisent cet état.
// Sources C# reprises : CampaignActivitiesV17.cs (chaîne V17, progression, Submit, Allocate, PerformWork, VerifyWork,
// ObserveDifference, ValidateDifferences, ValidateAssembly, ConfirmSstAssembly, minuteurs, preuves), CampaignMenhir.cs
// et MenhirDuel.cs (Duel des menhirs : modes, vies, énergie, qualité des réponses, défaite et reprise).
// Données chargées telles quelles : CampaignV17.json, MenhirDuel.json, UngaBungaCampaign.json, UngaBungaQuests.json.

export const STAGES = ['Découverte', 'Décidée', 'Réalisée', 'Vérifiée'];
// les objets du sac (InventoryController.items) et les recettes de l'atelier de silex (craft:flint, craft:tool)
export const ITEMS = [
  ['wood', 'Bois', 'Matériau des structures et des supports.'], ['stone', 'Pierre', 'Pierre brute pour les aménagements et le débitage.'],
  ['flint', 'Silex', 'Éclats débités à l’atelier pour fabriquer un outil.'], ['fiber', 'Fibres', 'Liens et attaches pour le montage.'],
  ['food', 'Nourriture', 'Consommer une unité : nourriture +25, énergie +10.'], ['tool', 'Hache de pierre', 'Outil équipé dans la main. Les travaux restent soumis à leurs prérequis.'],
  ['notebook', 'Carnet des risques', 'Objectifs, risques et traces des décisions.'], ['evidence', 'Preuves', 'Consulter les références et preuves enregistrées.'],
  ['clay', 'Argile', 'Prélevée sur la berge. Nécessaire au torchis.'], ['straw', 'Paille', 'Tiges préparées pour les couvertures de chaume.'],
].map(([id, name, description]) => ({ id, name, description }));
export const RECIPES = [
  { id: 'craft:flint', title: 'Débiter deux éclats de silex', site: 'atelier_silex', durationSeconds: 3, minimumCompetence: 15, costs: [{ id: 'stone', amount: 1 }], effects: [{ kind: 'resource', target: 'flint', value: 2 }, { kind: 'stat', target: 'fatigue', value: 2 }] },
  { id: 'craft:tool', title: 'Fabriquer une hache de pierre', site: 'atelier_silex', durationSeconds: 3, minimumCompetence: 15, costs: [{ id: 'flint', amount: 2 }, { id: 'wood', amount: 1 }, { id: 'fiber', amount: 1 }], effects: [{ kind: 'resource', target: 'tool', value: 1 }, { kind: 'stat', target: 'fatigue', value: 3 }] },
];
const TRANSFERABLE = ['wood', 'stone', 'flint', 'fiber', 'food', 'tool'];
// les travaux qu'on confie aux habitants (CampaignTribal.PrepareTribalActions) et les comportements (TribalPeopleView.RoutineName)
export const PRODUCTIONS = [
  { id: 'work:wood', title: 'Collecter du bois', site: 'bois_construction', resource: 'wood', durationSeconds: 12, minimumCompetence: 15 },
  { id: 'work:stone', title: 'Extraire de la pierre', site: 'pierre_carriere', resource: 'stone', durationSeconds: 14, minimumCompetence: 25 },
  { id: 'work:fiber', title: 'Collecter des fibres', site: 'stockage', resource: 'fiber', durationSeconds: 10, minimumCompetence: 10 },
  { id: 'work:food', title: 'Préparer des provisions', site: 'foyer', resource: 'food', durationSeconds: 12, minimumCompetence: 15 },
];
export const BEHAVIOUR = { MOVE_TO_TASK: 'Se rend au poste de travail', WORK: 'Travaille sur place', REST: 'Se repose', EAT: 'Prend un repas', EVACUATE: 'Évacue la zone', DEAD: 'Décédé', IDLE: 'Présent dans le village', STROLL: 'En promenade', CHAT: 'Bavarde chez un voisin' };
// titres et budgets des actes, comme PrepareCampaignV17
const ACT_TITLES = ['LE GRAND RÉVEIL : LE CONTEXTE', 'LE CHEF CONTRE-ATTAQUE', 'LA CHASSE AUX RISQUES', 'LA TRIBU A DES MOYENS', 'LES 15 DIFFÉRENCES', 'AU FEU !!!', 'LES ANCIENS VIENNENT AUDITER', 'LE PROCHAIN CYCLE'];
export const MENHIR_QUEST = 'M_II_ROLES', MENHIR_ACTION = 'MENHIR_DUEL';
// la chaîne obligatoire de la V17 (PrepareCampaignV17), l'abri compris : sa vérification (verified:M_V_ABRI) est exigée par
// une des 15 différences. Seul le tutoriel de déplacement (M_I_TUTORIEL) est remplacé par l'accueil de cette version.
const CHAIN = ['V17_CONTEXT', MENHIR_QUEST, 'V17_RISKS', 'V17_SUPPORT', 'M_V_ABRI', 'V17_OPERATIONS', 'V17_EMERGENCY', 'V17_EVALUATION', 'V17_IMPROVEMENT'];
// modes qui ne se terminent pas d'eux-mêmes à la dernière carte (Submit)
const HOLD = new Set(['risk', 'briefing', 'runner', 'allocation', 'assemble']);
// drapeaux posés à la validation de certaines activités (FinishCore)
const FINISH_FLAGS = { V17_SKILLS: 'competence_verified', V17_OBJECTIVES: 'workers_consulted', V17_AUDIT: 'audit_performed', V17_CORRECTIVE: 'events_analyzed' };

export function createCampaign({ v17, menhir, base, legacy, storage = null, key = 'thaleolithic-papier' }) {
  // ---- données : personnages (Nork devient Ouways, le graveur et peintre du village), quêtes, activités -------------
  const characters = base.characters.map((c) => (c.id === 'nork' ? { ...c, name: 'Ouways', role: 'Graveur et peintre du village' } : { ...c }));
  if (!characters.some((c) => c.id === 'alban')) characters.push({ id: 'alban', name: 'Alban', role: 'Ancien du conseil' });
  // the team's feedback (Google Sheets, « Remontées jeu ») : the game of answers to the director needs a timer long enough
  // to read everything : 30 s per proposal of the chief (6 proposals), the progress kept if it runs out
  const TIMERS = { V17_SCOPE: 180 };
  const activities = new Map(v17.activities.map((a) => [a.id, { ...a, actor: a.actor === 'ouways' ? 'nork' : a.actor, site: a.site === 'ouways' ? 'nork' : a.site, ...(TIMERS[a.id] ? { duration: TIMERS[a.id] } : {}) }]));
  const menhirQuest = legacy.quests.find((q) => q.id === MENHIR_QUEST);
  // actions et dialogues génériques du jeu (l'abri) : leurs effets s'appliquent comme dans CampaignRuntime
  const actions = new Map(base.actions.map((a) => [a.id, a])), dialogues = new Map(base.dialogues.map((d) => [d.id, d]));
  const quests = CHAIN.map((id) => {
    if (id === MENHIR_QUEST) return { ...menhirQuest, actionIds: [MENHIR_ACTION], giverId: 'aurelien', site: 'grand_menhir' };
    if (id === 'M_V_ABRI') return { ...legacy.quests.find((q) => q.id === id), site: 'habitations' };
    const q = v17.quests.find((x) => x.id === id);
    return { ...q, giverId: q.giverId === 'ouways' ? 'nork' : q.giverId };
  });
  const acts = base.acts.map((a, i) => ({ ...a, title: ACT_TITLES[i] || a.title }));
  // ---- les 16 accidents du jeu Unity (AccidentDirector) : 8 pour Dylan (D01 à D08), 8 pour des habitants (NPC_*) ------
  // un point d'exposition par lieu dangereux s'ouvre quand le jeu du chapitre a étudié ce risque ; Mathieu avertit
  // (WARN_D0x) : suspendre, maintenir (Dylan meurt, on reprend avant la décision) ou envoyer un habitant à sa place
  // (lui meurt pour de bon) ; les alertes des chapitres (D_*_A_ALERTE, « maintenir ») tuent aussi leur habitant
  const nameOf = (id) => characters.find((c) => c.id === id)?.name || String(id).split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const ACCIDENTS = legacy.accidents.map((a) => ({ ...a }));
  // the deaths outside the stakes: Dylan alone among the beasts of the Cenozoic (wild.js), in the same grammar as the
  // Unity game's accidents (danger, exposure, causes, corrective action, ISO 45001, the chief's punchline and the reply)
  const W = (kind, how, title, danger, immediate, punchline, reply) => ({ id: 'W_' + kind, kind: how, beast: kind, site: null, riskId: 'exterieur', title, victimId: 'dylan', danger,
    exposure: 'Dylan sort seul au-delà de la palissade, sans repérage du territoire ni moyen de repli.', warning: 'Territoire non évalué ; sortie déconseillée sans préparation.', immediateCause: immediate,
    organizationalCause: 'Aucune évaluation des risques au-delà de la palissade, aucune règle de sortie ni itinéraire balisé.', correctiveAction: 'Évaluer le territoire extérieur, sortir à plusieurs, baliser les itinéraires et tenir les distances avec la faune.',
    iso: ['6.1.2', '8.1.2', '8.2'], punchline, reply, speaker: 'Aurélien', requiredFlags: [] });
  const WILD_ACC = [
    W('smilodon', 'beast', 'PRÉDATEUR NON RECENSÉ AU REGISTRE.', 'Attaque d’un smilodon hors de l’enceinte.', 'Morsure par un félin à dents de sabre.', 'Il a trouvé des dents plus longues que les nôtres.', 'Les dangers du dehors n’étaient dans aucun registre.'),
    W('wolf', 'beast', 'TRAVAIL EN ÉQUIPE. CÔTÉ LOUPS.', 'Attaque d’une meute de loups.', 'Encerclement et morsures par la meute.', 'Eux, au moins, se coordonnent.', 'Une meute, c’est un risque connu de tous, sauf de lui.'),
    W('lion', 'beast', 'SIESTE DU LION. FIN DE SIESTE.', 'Réveil d’un lion des cavernes.', 'Bond et morsure du lion.', 'Il voulait juste lui dire bonjour.', 'On ne réveille pas un risque qui dort.'),
    W('bear', 'beast', 'ÉTREINTE NON CONSENTIE.', 'Rencontre avec un ours des cavernes.', 'Coups de patte et morsure de l’ours.', 'Il cherchait de la chaleur humaine.', 'La distance de sécurité se mesure en lances, pas en sourires.'),
    W('harpagornis', 'beast', 'ÉVALUATION DES RISQUES : VUE DU CIEL.', 'Piqué d’un harpagornis.', 'Serres d’un aigle géant.', 'Il a enfin pris de la hauteur sur le sujet.', 'Le danger venait d’en haut. Personne n’avait levé les yeux.'),
    W('sarcosuchus', 'beast', 'BAIGNADE NON AUTORISÉE.', 'Embuscade d’un sarcosuchus au bord de l’eau.', 'Mâchoires d’un crocodile géant.', 'L’eau avait l’air calme.', 'Une berge, ça se balise. Surtout quand elle a des dents.'),
    W('mammoth', 'trample', 'LA MÈRE N’A PAS VALIDÉ LA VISITE.', 'Charge d’une mère mammouth qui protège son petit.', 'Piétinement par un mammouth.', 'Il voulait caresser le petit.', 'Un animal effrayé se défend. Toujours.'),
    W('rhino', 'trample', 'CORNE D’ABONDANCE. DE CORNE.', 'Charge d’un rhinocéros laineux effrayé.', 'Coup de corne et piétinement.', 'Il a sous-estimé la vue du rhinocéros. Pas son odorat.', 'Approcher un animal de deux tonnes n’est pas une observation.'),
    W('aurochs', 'trample', 'LE TROUPEAU A VOTÉ CONTRE.', 'Charge d’un aurochs qui défend le troupeau.', 'Encornement par un aurochs.', 'Au moins, la décision était collective.', 'Un troupeau inquiet est un troupeau dangereux.'),
    W('megatherium', 'trample', 'ÉTREINTE DE PARESSEUX GÉANT.', 'Défense d’un mégathérium dérangé.', 'Griffes d’un paresseux géant.', 'Le paresseux le plus rapide de l’histoire.', 'Lent ne veut pas dire inoffensif.'),
    W('diprotodon', 'trample', 'GROS NOUNOURS. GROS ÉCART.', 'Charge d’un diprotodon effrayé.', 'Écrasement par un diprotodon.', 'Il avait l’air si placide.', 'Sa mère était juste derrière.'),
    W('glyptotherium', 'trample', 'COUP DE QUEUE BLINDÉE.', 'Défense d’un glyptothérium.', 'Coup de queue en massue.', 'L’armure, c’était pour se défendre. On le sait maintenant.', 'Un animal qui porte une massue s’en sert.'),
    W('gastornis', 'trample', 'L’OISEAU ÉTAIT VÉGÉTARIEN. PAS PATIENT.', 'Attaque d’un gastornis dérangé au nid.', 'Coups de bec d’un oiseau géant.', 'Il comptait faire une omelette.', 'Un nid se contourne, il ne se visite pas.'),
  ];
  ACCIDENTS.push(...WILD_ACC);
  const accident = (id) => ACCIDENTS.find((a) => a.id === id) || null;
  const UNLOCK = { D01: 'V17_RESOURCES', D02: 'V17_RISK_QUARRY', D03: 'V17_RISK_HUNT', D04: 'M_V_ABRI_1', D05: 'V17_RISK_FIRE', D06: 'V17_RISK_STORAGE', D07: 'V17_PARTIES', D08: 'V17_RISK_SILEX' };
  const EXPOSURES = legacy.actions.filter((a) => /^EXPOSURE_D0\d$/.test(a.id)).map((a) => ({ id: a.id, acc: a.id.slice(9), site: a.targetBindingId, title: a.title, dialogueId: a.dialogueId, unlock: UNLOCK[a.id.slice(9)] }));
  for (const d of legacy.dialogues.filter((x) => /^WARN_D0\d$/.test(x.id))) {
    const acc = accident(d.id.slice(5)), others = ACCIDENTS.filter((a) => a.id.startsWith('NPC_') && a.site === acc?.site);
    dialogues.set(d.id, { ...d, choices: [...d.choices, ...others.map((o) => ({ id: d.id + '_SEND_' + o.victimId, victim: o.victimId, text: `Envoyer ${nameOf(o.victimId)} à ma place, malgré le danger.`, effects: [{ kind: 'character', target: o.victimId + '.alive', value: 0 }] }))] });
  }

  // ---- état sauvegardé --------------------------------------------------------------------------------------------
  const fresh = () => ({ version: 1, flags: {}, done: [], evidence: [], progress: {}, menhir: null, ending: false, wallSeconds: 0, risks: {}, dead: [], buildings: {}, dialogue: null, working: null, accident: null, deathLog: [], dylanDeaths: 0,
    resources: { ...Object.fromEntries(base.resources.map((r) => [r.id, r.value])), flint: 0, tool: 0, clay: 0, straw: 0, knowledge: 0 }, equipped: '', reserve: {}, tasks: [],
    player: Object.fromEntries(base.stats.map((x) => [x.id, x.value])),
    // l'état de chaque habitant (CharacterState) : compétence 15 pour Dylan, 10 pour le Petit Os, 70 pour les autres
    people: Object.fromEntries(characters.map((c) => [c.id, { life: 100, energy: 100, fatigue: 0, competence: c.id === 'dylan' ? 15 : c.id === 'petit_os' ? 10 : 70, hunger: 20, morale: 60, trust: 25, assignment: '' }])) });
  let state = fresh();
  if (storage) try { const s = JSON.parse(storage.getItem(key) || 'null'); if (s && s.version === 1) state = { ...fresh(), ...s }; } catch { /* sauvegarde illisible : nouvelle partie */ }
  const listeners = new Set(), emit = () => { for (const f of listeners) f(); };
  const save = () => { if (storage) try { storage.setItem(key, JSON.stringify(state)); } catch { /* stockage indisponible */ } };
  const flag = (k) => !!state.flags[k];
  const setFlag = (k, v = true) => { if (v) state.flags[k] = true; else delete state.flags[k]; };
  const progress = (id) => (state.progress[id] ??= { card: 0, mistakes: 0, lane: 1, seconds: 0, workSeconds: 0, completed: false, observed: false, worked: false, verified: false, guideSeen: false, allocation: [0, 0, 0], answers: [], people: [] });

  // ---- quêtes : la frontière est la première quête obligatoire non terminée --------------------------------------
  const questDone = (q) => q.actionIds.every((id) => state.done.includes(id));
  const frontier = () => quests.find((q) => !questDone(q)) || null;
  // une action est ouverte quand l'action précédente de sa quête est faite (requiredFlags "done:<précédente>")
  function canExecute(id) {
    const q = frontier(); if (!q || state.done.includes(id)) return false;
    const i = q.actionIds.indexOf(id); if (i < 0) return false;
    return i === 0 || state.done.includes(q.actionIds[i - 1]);
  }
  const nextAction = () => { const q = frontier(); return q ? q.actionIds.find((id) => canExecute(id)) || null : null; };
  // le lieu où se joue l'action ouverte (le site de l'activité ou le Grand Menhir pour le duel)
  const nextSite = () => { const id = nextAction(); return !id ? null : id === MENHIR_ACTION ? 'grand_menhir' : activities.has(id) ? activities.get(id).site : actions.get(id)?.targetBindingId; };
  const kindOf = (id) => (id === MENHIR_ACTION ? 'duel' : activities.has(id) ? 'activity' : 'action');

  // ---- preuves du Carnet des Crânes -------------------------------------------------------------------------------
  function setEvidence(a, stage, result, proof = '') {
    let e = state.evidence.find((x) => x.id === a.evidence);
    if (!e) { e = { id: a.evidence, name: a.evidence, clause: a.clause, activity: a.id }; state.evidence.push(e); }
    Object.assign(e, { source: a.source || 'V17, documents de conception', stage, result, verification: proof, at: Math.round(state.wallSeconds) });
  }
  const verified = (id) => flag(id) || state.evidence.some((e) => e.id === id && e.stage === 3);

  // ---- activités (CampaignActivitiesV17) ----------------------------------------------------------------------------
  let current = null, feedback = '', timedOut = false;
  const cur = () => current && progress(current.id);
  function begin(id) {
    if (current || !canExecute(id)) return false;
    const a = activities.get(id); if (!a) return false;
    const p = progress(id); if (p.completed) return false;
    if (a.mode === 'assemble') { p.answers = a.cards.filter((c) => p.answers.includes(c.id)).map((c) => c.id); p.card = a.cards.findIndex((c) => !p.answers.includes(c.id)); if (p.card < 0) p.card = a.cards.length; }
    current = a; timedOut = false;
    feedback = a.mode === 'assemble' && p.answers.length ? `Assemblage repris : ${p.answers.length} tablettes sur ${a.cards.length} déjà reliées.` : a.intro || '';
    setEvidence(a, p.worked ? 2 : p.answers.length ? 1 : 0, p.worked ? a.measure : 'Activité observée, décisions et acquis conservés.');
    save(); emit(); return true;
  }
  const guideOpen = () => !!current && current.mode !== 'assemble' && !cur().guideSeen && cur().answers.length === 0 && cur().card === 0;
  function dismissGuide() { if (!guideOpen()) return; cur().guideSeen = true; save(); emit(); }
  function suspend() { if (!current) return; current = null; feedback = ''; save(); emit(); }
  function submit(answer) {
    if (!current || timedOut) return false;
    const a = current, p = cur();
    if (a.mode === 'differences' && !p.observed) return false;
    if (p.card < 0 || p.card >= a.cards.length) return false;
    const card = a.cards[p.card]; if (answer < 0 || answer >= card.choices.length) return false;
    const proof = !card.requiredEvidence || verified(card.requiredEvidence);
    if (answer !== card.correct || !proof) { p.mistakes++; feedback = proof ? 'Réessaie : ' + card.explanation : 'La preuve correspondante n’est pas encore vérifiée. Reprends le contrôle sur le terrain.'; save(); emit(); return false; }
    if (!p.answers.includes(card.id)) p.answers.push(card.id);
    p.guideSeen = true; p.card++;
    if (a.mode === 'assemble') while (p.card < a.cards.length && p.answers.includes(a.cards[p.card].id)) p.card++;
    feedback = a.mode === 'assemble' ? 'Tablette reliée. ' + card.explanation : card.explanation;
    setEvidence(a, 1, p.answers.join(', '));
    if (a.mode === 'differences') {
      p.observed = false; const k = 'difference:' + card.id;
      if (!state.evidence.some((e) => e.id === k)) state.evidence.push({ id: k, name: card.question, clause: card.clause, source: card.source, activity: a.id, stage: 3, result: `${card.before}\n→ ${card.after}\n\n${card.dialogue || ''}\n\n${card.explanation}`, verification: 'Localisation et explication contrôlées' });
    }
    // Finish → ValidateDifferencesInternal : les différences ne se valident que si le minimum, les critiques et les notions y sont
    const ready = a.mode !== 'differences' || (() => { const st = differencesStatus(); return st.found >= st.minimum && st.critical && st.concepts; })();
    if (p.card >= a.cards.length && !HOLD.has(a.mode) && ready) finish(); else { save(); emit(); }
    return true;
  }
  // l'assemblage peut se faire dans n'importe quel ordre : on choisit la tablette, puis sa fonction
  function selectTablet(index) { if (current?.mode !== 'assemble' || current.cards[index] == null || cur().answers.includes(current.cards[index].id)) return false; cur().card = index; emit(); return true; }
  function confirmAssembly() { if (current?.mode !== 'assemble' || cur().answers.length < current.cards.length) return false; finish(); return true; }
  function allocate(i, delta) {
    if (current?.mode !== 'allocation' || i < 0 || i > 2) return false;
    const p = cur(), v = Math.max(0, Math.min(current.budget, p.allocation[i] + delta)), sum = p.allocation.reduce((s, x) => s + x, 0) - p.allocation[i] + v;
    if (sum > current.budget) return false; p.allocation[i] = v; emit(); return true;
  }
  function confirmAllocation() {
    if (current?.mode !== 'allocation') return false; const p = cur();
    if ([0, 1, 2].some((i) => p.allocation[i] < current.needs[i])) { feedback = 'Les objectifs ont des besoins différents : formation 3, stockage 4, foyer 2. Ajuste les moyens.'; emit(); return false; }
    p.card = current.cards.length; finish(); return true;
  }
  const workReady = () => current?.mode === 'risk' && cur().card >= current.cards.length;
  function performWork() {
    if (!workReady() || cur().worked) return false;
    cur().worked = true; setFlag('risk:' + current.risk); setFlag('measure:' + current.id); setEvidence(current, 2, current.measure); save(); emit(); return true;
  }
  function verifyWork() {
    if (!workReady() || !cur().worked || cur().workSeconds < 3) return false;
    cur().verified = true; setFlag('risk:' + current.risk, false); finish(); return true;
  }
  function moveLane(d) { if (current) { cur().lane = Math.max(0, Math.min(2, cur().lane + d)); emit(); } }
  function projectileHit() { if (current?.mode !== 'briefing') return; cur().mistakes++; feedback = 'Dylan est brièvement étourdi. Les messages déjà transmis restent acquis.'; emit(); }
  function observe(index) {
    if (current?.mode !== 'differences' || index < 0 || index >= current.cards.length) return false;
    const p = cur(), card = current.cards[index]; if (p.answers.includes(card.id)) return false;
    p.card = index; p.observed = true; feedback = card.before + '\n→ ' + card.after; emit(); return true;
  }
  function differencesStatus() {
    const a = current, p = cur();
    return { found: p.answers.length, minimum: a.minimum, critical: a.cards.filter((x) => x.critical).every((x) => p.answers.includes(x.id)),
      concepts: (a.requiredConcepts || []).every((c) => a.cards.some((card) => card.concept === c && p.answers.includes(card.id))) };
  }
  function validateDifferences() {
    if (current?.mode !== 'differences') return false; const s = differencesStatus();
    if (s.found < s.minimum || !s.critical || !s.concepts) { feedback = 'Complète les observations critiques et les notions : élimination, changements, interventions, achats et externalisation.'; emit(); return false; }
    finish(); return true;
  }
  // la course : toutes les cartes répondues, puis Dylan au point de rassemblement avec toutes les personnes attendues
  function validateAssembly(nearAssembly, everyoneThere, people = []) {
    if (current?.mode !== 'runner' || cur().card < current.cards.length || !nearAssembly) return false;
    if (!everyoneThere) { feedback = 'Le rassemblement reste incomplet. Signale les absences et attends les personnes sur l’itinéraire sûr.'; emit(); return false; }
    cur().people = people; finish(); return true;
  }
  function retryTimer() { if (!timedOut) return; cur().seconds = 0; timedOut = false; feedback = 'Les observations et preuves acquises sont conservées.'; emit(); }
  function finish() {
    const a = current, p = cur();
    p.completed = p.verified = true;
    setEvidence(a, 3, a.outro || 'Résultat conservé.', 'Choix et preuves contrôlés à l’étape de jeu ' + Math.round(state.wallSeconds));
    if (a.id === 'V17_DEBRIEF_FIRE') setFlag('v17:alarm', false);
    if (FINISH_FLAGS[a.id]) setFlag(FINISH_FLAGS[a.id]);
    current = null; completeAction(a.id);
    feedback = a.outro || 'Preuve enregistrée dans le Carnet des Crânes.';
    save(); emit();
  }
  function completeAction(id) {
    if (state.done.includes(id)) return;
    const before = quests.filter(questDone).length;
    state.done.push(id); setFlag('done:' + id);
    // une quête validée crédite ses récompenses de savoir (CampaignQuests : reward knowledge → ressource knowledge)
    for (const q of quests) if (questDone(q) && !state.flags['claimed:' + q.id] && quests.filter(questDone).length > before) { setFlag('claimed:' + q.id); for (const r of q.rewards || []) if (r.kind === 'knowledge') state.resources.knowledge += r.amount; }
    if (id === 'V17_EVACUATION') setFlag('v17:alarm');
    if (!frontier()) state.ending = true;
  }
  // le minuteur (Update) : avance pendant l'activité ; temps écoulé = acquis conservés, essai à reprendre
  function tick(dt) {
    if (!state.ending) state.wallSeconds += dt;
    if (state.working && (state.working.left -= dt) <= 0) { const w = state.working; state.working = null; if (w.recipe) finishRecipe(w.id); else finishAction(w.id); }
    if (!current || guideOpen() || timedOut) return;
    const p = cur(); p.seconds += dt; if (workReady() && p.worked) p.workSeconds += dt;
    if (current.duration > 0 && p.seconds >= current.duration && !(current.mode === 'assemble' && p.card >= current.cards.length)) {
      if (current.mode === 'briefing' && p.card >= current.cards.length) { finish(); return; }
      if (current.mode !== 'runner') { timedOut = true; feedback = 'Temps écoulé. Les acquis sont conservés ; reprends l’essai pour compléter la maîtrise.'; emit(); }
    }
  }

  // ---- actions et dialogues génériques (CampaignRuntime : ApplyActionOutcome, effets, coûts, dialogues à choix) -----
  function apply(e) {
    if (e.kind === 'flag') setFlag(e.target, !!e.value);
    else if (e.kind === 'evidence') { if (!state.evidence.some((x) => x.id === e.target)) state.evidence.push({ id: e.target, name: e.text || e.target, clause: '', activity: '', stage: 3, result: e.text || '', verification: 'Conséquence enregistrée' }); }
    else if (e.kind === 'risk') state.risks[e.target] = e.value;
    else if (e.kind === 'building' && (e.requiredFlags || []).every(flag)) state.buildings[e.target] = e.value;
    else if (e.kind === 'accident') { const a = accident(e.target); if (a) { state.accident = { id: a.id, victim: 'dylan', played: false }; state.dylanDeaths++; logDeath(a, 'dylan'); } }
    else if (e.kind === 'character' && e.target.endsWith('.alive') && !e.value) {
      const who = e.target.split('.')[0]; if (state.dead.includes(who)) return;
      if (who === 'dylan') { const a = accident('D01'); state.accident = { id: a.id, victim: 'dylan', played: false }; state.dylanDeaths++; logDeath(a, 'dylan'); return; }   // Dylan never stays dead: the scene is replayed from before the decision
      state.dead.push(who); const a = accident('NPC_' + who); if (a) { state.accident = { id: a.id, victim: who, played: false }; logDeath(a, who); }
    }
  }
  // a beast reached Dylan outside the stakes: its cinematic, the analysis, then the game takes up again before the outing
  function wildDeath(kind, at, beast) { const a = accident('W_' + kind); if (!a || state.accident) return false; state.accident = { id: a.id, victim: 'dylan', played: false, at, beast }; state.dylanDeaths++; logDeath(a, 'dylan'); save(); emit(); return true; }
  function logDeath(a, who) { state.deathLog.push({ id: a.id, kind: a.kind, victim: who, site: a.site, quest: frontier()?.id || null, at: Math.round(state.wallSeconds) }); }
  // the exposure points open (their chapter's game done), and those standing where Dylan is
  const exposures = () => EXPOSURES.filter((x) => state.done.includes(x.unlock) && !state.accident);
  function examine(id) { const x = EXPOSURES.find((e) => e.id === id); if (!x || state.dialogue || state.working) return false; setFlag('done:' + x.id); state.dialogue = x.dialogueId; save(); emit(); return true; }
  // after the death cinematic: Dylan takes up the game again from before the decision; a villager stays in the cemetery
  function closeAccident() { const a = state.accident; if (!a) return; if (a.victim === 'dylan') setFlag('warning:' + a.id, false); state.accident = null; save(); emit(); }
  const markPlayed = () => { if (state.accident) { state.accident.played = true; save(); emit(); } };
  // une action prend son temps (durationSeconds), puis applique ses effets ; son dialogue s'ouvre ensuite
  function startAction(id) {
    const a = actions.get(id); if (!a || !canExecute(id) || state.working || state.dialogue) return false;
    if ((a.costs || []).some((c) => (state.resources[c.id] ?? 0) < c.amount)) { feedback = 'Ressources insuffisantes : ' + a.costs.map((c) => c.amount + ' ' + c.id).join(', ') + '.'; emit(); return false; }
    state.working = { id, left: a.durationSeconds || 2, total: a.durationSeconds || 2 }; emit(); return true;
  }
  // ---- la tribu, le sac, les réserves et l'atelier (TribalInterface, InventoryController, CampaignTribal) -----------
  const quantity = (id) => (id === 'notebook' ? 1 : id === 'evidence' ? state.evidence.length : state.resources[id] ?? 0);
  function craftCheck(r, near) {
    if (!near) return 'Rejoins l’atelier de silex.';
    if (state.people.dylan.competence < r.minimumCompetence) return 'Compétence insuffisante.';
    const miss = r.costs.find((c) => quantity(c.id) < c.amount); if (miss) return 'Il manque ' + (miss.amount - quantity(miss.id)) + ' ' + ITEMS.find((i) => i.id === miss.id).name.toLowerCase() + '.';
    return state.working ? 'Une action est déjà en cours.' : '';
  }
  function craft(id, near) { const r = RECIPES.find((x) => x.id === id), why = r && craftCheck(r, near); if (!r || why) { feedback = why || ''; emit(); return false; } state.working = { id, left: r.durationSeconds, total: r.durationSeconds, recipe: true }; emit(); return true; }
  function finishRecipe(id) {
    const r = RECIPES.find((x) => x.id === id); for (const c of r.costs) state.resources[c.id] -= c.amount;
    for (const e of r.effects) { if (e.kind === 'resource') state.resources[e.target] = (state.resources[e.target] ?? 0) + e.value; if (e.kind === 'stat') state.player[e.target] = Math.min(100, (state.player[e.target] ?? 0) + e.value); }
    feedback = r.title + ' : fait.'; save(); emit();
  }
  function useItem(id) {
    if (id === 'food' && state.resources.food > 0) { state.resources.food--; state.player.food = Math.min(100, state.player.food + 25); state.player.energy = Math.min(100, state.player.energy + 10); }
    else if (id === 'tool' && state.resources.tool > 0) state.equipped = state.equipped === 'tool' ? '' : 'tool';
    else return false; save(); emit(); return true;
  }
  // transferts avec les réserves de Neila : sur place seulement, objets transférables, quantité bornée par ce qui existe
  function transfer(item, requested, deposit, all, near) {
    if (!near) { feedback = 'Rejoins les réserves pour transférer des objets.'; emit(); return false; }
    if (!all && !TRANSFERABLE.includes(item)) { feedback = 'Cet objet ne peut pas être transféré.'; emit(); return false; }
    let changed = false;
    for (const id of all ? TRANSFERABLE : [item]) {
      const available = deposit ? state.resources[id] ?? 0 : state.reserve[id] ?? 0, amount = all ? available : Math.min(available, requested); if (amount <= 0) continue;
      state.reserve[id] = (state.reserve[id] ?? 0) + (deposit ? amount : -amount); state.resources[id] += deposit ? -amount : amount; changed = true;
    }
    if (deposit && state.resources.tool <= 0) state.equipped = '';
    feedback = changed ? (deposit ? 'Objets déposés aux réserves.' : 'Objets récupérés aux réserves.') : 'Aucun objet disponible pour ce transfert.'; save(); emit(); return changed;
  }
  // ---- la file de tâches des habitants (CanAssignTask, QueueTask, CancelTask, TribalTaskRuntime.Handle) -------------
  const terminal = (t) => t.status === 'done' || t.status === 'cancelled' || t.status === 'failed';
  function canAssignTask(worker, actionId) {
    const m = state.people[worker], a = PRODUCTIONS.find((x) => x.id === actionId);
    if (!m || state.dead.includes(worker) || worker === 'dylan') return 'Ce membre ne peut pas recevoir cette tâche.';
    if (m.life < 50) return 'Ce membre doit d’abord recevoir des soins.';
    if (!a) return 'Cette activité ne possède pas de poste de travail accessible.';
    if (m.competence < a.minimumCompetence) return 'Compétence nécessaire : ' + a.minimumCompetence;
    return '';
  }
  function queueTask(worker, actionId) {
    const why = canAssignTask(worker, actionId); if (why) { feedback = why; emit(); return false; }
    if (state.tasks.filter((t) => t.workerId === worker && !terminal(t)).length >= 3) { feedback = 'Ce membre possède déjà trois tâches en attente.'; emit(); return false; }
    const a = PRODUCTIONS.find((x) => x.id === actionId);
    state.tasks.push({ id: Math.random().toString(36).slice(2, 10), workerId: worker, actionId, status: 'queued', reason: '', workedSeconds: 0, duration: a.durationSeconds }); save(); emit(); return true;
  }
  function cancelTask(id) { const t = state.tasks.find((x) => x.id === id); if (!t || terminal(t)) return false; t.status = 'cancelled'; t.reason = 'Annulée avant attribution du résultat.'; save(); emit(); return true; }
  const tasksOf = (worker) => state.tasks.filter((t) => t.workerId === worker && t.status !== 'cancelled');
  // ---- les besoins des habitants (VillagerBrain) : usure, repos (l'abri vérifié aide), repas au foyer, tâches, routine -
  // at(id, place) dit si la carte de l'habitant est arrivée ; moving(id) s'il marche. Le village déplace les cartes vers goal.
  const brain = {};
  // where each one likes to go in free time (their trade's places)
  const HANG = { georges: ['atelier_silex', 'pierre_carriere', 'foyer'], tarek: ['bois_construction', 'foyer'], neila: ['stockage', 'foyer'], orok: ['foyer'], eliott: ['chasse_clairiere', 'foyer'], brok: ['atelier_silex', 'foyer'],
    uma: ['habitations', 'foyer'], kora: ['chasse_clairiere', 'foyer'], sila: ['foyer', 'repos'], varg: ['rassemblement', 'foyer'], grumb: ['grand_menhir', 'alban'], mathilde: ['repos', 'foyer'], lorette: ['foyer', 'aurelien'],
    mathieu: ['foyer', 'stockage'], nork: ['grand_menhir', 'foyer'], alban: ['grand_menhir'], aurelien: ['foyer'], milena: ['berge_observation'] };
  function villageStep(dt, at, moving) {
    let changed = false;
    for (const c of characters) {
      const id = c.id; if (id === 'dylan') continue;
      const m = state.people[id], b = (brain[id] ??= { behaviour: 'IDLE', goal: 'home', resting: false, timer: 0 });
      if (state.dead.includes(id)) { b.behaviour = 'DEAD'; b.goal = null; for (const t of state.tasks) if (t.workerId === id && !terminal(t)) { t.status = 'failed'; t.reason = 'Le membre n’est plus disponible.'; changed = true; } continue; }
      const mv = moving(id);
      m.energy = Math.max(0, m.energy - (mv ? 0.14 : 0.055) * dt); m.fatigue = Math.min(100, m.fatigue + (mv ? 0.13 : 0.055) * dt); m.hunger = Math.min(100, m.hunger + 0.065 * dt);
      if (m.assignment === 'repos' || m.fatigue > 68 || m.energy < 25 || b.resting) {
        b.behaviour = 'REST'; b.resting = true; b.goal = 'home';
        if (at(id, 'home')) { const k = (state.buildings.habitations ?? 0) >= 2 ? 1.8 : 1; m.energy = Math.min(100, m.energy + dt * 1.4 * k); m.fatigue = Math.max(0, m.fatigue - dt * 1.3 * k); if (m.energy > 80 && m.fatigue < 24 && m.assignment !== 'repos') b.resting = false; }
        continue;
      }
      if (m.hunger > 72) { b.behaviour = 'EAT'; b.goal = 'foyer'; if (at(id, 'foyer') && (b.timer += dt) > 5) { m.hunger = Math.max(0, m.hunger - 45); b.timer = 0; } continue; }
      const t = state.tasks.find((x) => x.workerId === id && !terminal(x));
      if (t) {
        const why = canAssignTask(id, t.actionId); if (why) { t.status = 'blocked'; t.reason = why; b.goal = 'home'; changed = true; continue; }
        const a = PRODUCTIONS.find((x) => x.id === t.actionId); b.goal = a.site;
        if (!at(id, a.site)) { t.status = 'moving'; b.behaviour = 'MOVE_TO_TASK'; continue; }
        t.status = 'working'; t.reason = ''; b.behaviour = 'WORK'; t.workedSeconds = Math.min(t.duration, t.workedSeconds + dt);
        if (t.workedSeconds >= t.duration) { t.status = 'done'; state.resources[a.resource] = (state.resources[a.resource] ?? 0) + 1; changed = true; }
        continue;
      }
      // free time: now and then an outing, picked at random but kept in order: to the places of their trade, or a visit
      // to a neighbour's door for a chat; never more than four out at once, one visitor per door, then home again
      if (b.out) {
        const there = at(id, b.out);
        b.behaviour = there ? (b.out.startsWith('visit:') ? 'CHAT' : 'STROLL') : 'STROLL';
        if (there && (b.stay -= dt) <= 0) { b.out = null; b.next = 25 + Math.random() * 40; }
        b.goal = b.out || 'home'; continue;
      }
      b.next = (b.next ?? 6 + Math.random() * 30) - dt;
      if (b.next <= 0) {
        b.next = 10 + Math.random() * 20;
        const out = Object.values(brain).filter((x) => x.out).length;
        if (out < 4) {
          const visit = Math.random() < 0.35, hosts = characters.filter((c) => c.id !== id && c.id !== 'dylan' && !state.dead.includes(c.id) && brain[c.id]?.goal === 'home' && !brain[c.id]?.out && !Object.values(brain).some((x) => x.out === 'visit:' + c.id));
          const spots = HANG[id] || ['foyer'];
          b.out = visit && hosts.length ? 'visit:' + hosts[Math.floor(Math.random() * hosts.length)].id : spots[Math.floor(Math.random() * spots.length)];
          b.stay = 8 + Math.random() * 10;
        }
      }
      b.behaviour = 'IDLE'; b.goal = b.out || 'home';
    }
    if (changed) { save(); emit(); }
  }
  // ---- la survie de Dylan (PlayerSurvival) : marcher use, s'arrêter repose, l'infirmerie soigne, la faim avance -------
  function survive(dt, moving, atRest) {
    const p = state.player, busy = !!state.working;
    let energy = moving ? -0.25 : 2.5, fatigue = busy ? 0.45 : moving ? 0.07 : -0.12;
    if (!moving && !busy && atRest) { fatigue = -1; energy = 4; }
    p.energy = Math.max(0, Math.min(100, p.energy + energy * dt)); p.fatigue = Math.max(0, Math.min(100, p.fatigue + fatigue * dt)); p.food = Math.max(0, Math.min(100, p.food - 0.015 * dt));
  }
  const warnings = () => [state.player.life < 50 && '+ Blessure', state.player.fatigue >= 70 && '! Fatigue critique', state.player.food < 20 && '! Faim'].filter(Boolean);
  function rest(id) { const m = state.people[id]; if (!m || id === 'dylan' || state.dead.includes(id)) return false; m.assignment = m.assignment === 'repos' ? '' : 'repos'; save(); emit(); return true; }
  const memberStatus = (id) => { const m = state.people[id]; return state.dead.includes(id) ? 'Décédé' : m.life < 50 ? 'Blessé' : m.assignment === 'repos' ? 'Au repos' : 'Disponible'; };
  // l'arbre Technologie (TribalKnowledgeView) : missions liées à une notion, vérification (le duel par critère 5.1 à 5.4)
  const clauseQuests = (id) => quests.filter((q) => (q.iso || []).some((i) => i === id || i.startsWith(id + '.')));
  const menhirCriterion = (clause) => { const s = state.menhir; if (!s) return false; if (clause === '5') return s.cleared.every(Boolean); const i = ['5.1', '5.2', '5.3', '5.4'].indexOf(clause); return i < 0 || s.cleared[i]; };
  const clauseVerified = (q, clause) => questDone(q) && (q.id !== MENHIR_QUEST || menhirCriterion(clause));
  const clauseProgress = (id) => { const qs = clauseQuests(id); return qs.length ? qs.filter((q) => clauseVerified(q, id)).length / qs.length : 0; };
  function clauseStatus(id) {
    const qs = clauseQuests(id); if (!qs.length) return 'À découvrir';
    if (qs.every((q) => clauseVerified(q, id))) return 'Vérifié dans les missions liées';
    if (qs.includes(frontier())) return 'En cours d’application';
    return qs.some((q) => quests.indexOf(q) <= quests.indexOf(frontier())) ? 'Accessible' : 'Prérequis à compléter';
  }
  function finishAction(id) {
    const a = actions.get(id); for (const c of a.costs || []) state.resources[c.id] -= c.amount;
    for (const e of a.effects || []) apply(e);
    completeAction(id); feedback = a.title + ' : fait.';
    if (a.dialogueId && dialogues.has(a.dialogueId)) state.dialogue = a.dialogueId;
    save(); emit();
  }
  function choose(choiceId) {
    const d = dialogues.get(state.dialogue), ch = d?.choices.find((x) => x.id === choiceId); if (!ch) return false;
    for (const e of ch.effects || []) apply(e);
    state.dialogue = ch.nextDialogueId && dialogues.has(ch.nextDialogueId) ? ch.nextDialogueId : null; save(); emit(); return true;
  }

  // ---- Duel des menhirs (MenhirDuel.cs) -----------------------------------------------------------------------------
  const Q = menhir.questions;
  const duelFresh = () => ({ phase: 'choose', mode: 0, question: 0, cleared: Q.map(() => false), mistakes: Q.map(() => 0), dylan: 100, chief: 100, energy: 100, combat: 0, cooldown: 0, bossAt: 5, guardUntil: 0, jumpUntil: 0, t: 0, keys: '', banner: '', caption: '', feedback: '' });
  const duel = {
    get s() { return state.menhir; },
    start() { state.menhir = state.menhir && state.menhir.phase !== 'victory' ? { ...state.menhir, phase: 'choose' } : duelFresh(); emit(); },
    choose(mode) { const s = state.menhir; if (s?.phase !== 'choose') return; s.mode = mode; this.round(); },
    round() { const s = state.menhir; s.phase = 'combat'; s.combat = 0; s.cooldown = 0; s.bossAt = s.t + 5; s.question = s.cleared.findIndex((c) => !c); s.banner = `ÉPREUVE ${s.question + 1} : ${Q[s.question].title}`; s.caption = 'Mathieu : « Cinq décisions. Les coups seuls ne valident aucune épreuve. »'; emit(); },
    get canQuestion() { const s = state.menhir; return s?.phase === 'combat' && s.combat >= 4; },
    get stage() { const c = state.menhir?.chief ?? 100; return c < 30 ? 3 : c < 65 ? 2 : 1; },
    openQuestion() { if (this.canQuestion) { state.menhir.phase = 'question'; emit(); } },
    attack(heavy) {
      const s = state.menhir; if (s?.phase !== 'combat' || s.cooldown > 0 || s.energy < (heavy ? 12 : 5)) return false;
      s.energy -= heavy ? 12 : 5; s.cooldown = heavy ? 0.65 : 0.32; s.keys = (s.keys + (heavy ? 'K' : 'J')).slice(-3);
      const damage = s.keys === 'JJK' ? 5 : heavy ? 2 : 1, floor = 100 - s.cleared.filter(Boolean).length * 20 - 7;
      s.chief = Math.max(Math.max(5, floor), s.chief - damage); s.lastHit = s.t; emit(); return true;
    },
    guard() { const s = state.menhir; if (s?.phase === 'combat') { s.guardUntil = s.t + 0.6; emit(); } },
    jump() { const s = state.menhir; if (s?.phase === 'combat' && s.t >= s.jumpUntil) { s.jumpUntil = s.t + 0.7; emit(); } },
    answer(i) {
      const s = state.menhir; if (s?.phase !== 'question') return;
      const q = Q[s.question], a = q.answers[i]; s.caption = a.reply;
      s.banner = a.quality === 2 ? 'DÉCISION VÉRIFIÉE' : a.quality === 1 ? 'PARTIEL, LA PRÉVENTION RESTE À ORGANISER' : 'CONTRE DU CHEF, CORRIGE TA DÉCISION';
      if (a.quality === 2) {
        s.cleared[s.question] = true; s.chief = Math.min(s.chief, 100 - s.cleared.filter(Boolean).length * 20);
        s.dylan = Math.min(100, s.dylan + 12); s.energy = Math.min(100, s.energy + 30); s.feedback = q.correction;
        if (s.cleared.every(Boolean)) { s.phase = 'victory'; s.banner = 'LA POLITIQUE DU MENHIR EST GRAVÉE'; completeAction(MENHIR_ACTION); save(); emit(); return; }
        this.round(); save(); return;
      }
      s.mistakes[s.question]++; s.dylan = Math.max(0, s.dylan - (a.quality === 1 ? 5 : 14)); if (a.quality === 1) s.chief = Math.max(5, s.chief - 3);
      s.feedback = s.mode === 2 ? q.hint : q.correction;
      if (s.dylan <= 0) this.defeat(); save(); emit();
    },
    defeat() { const s = state.menhir; s.phase = 'defeat'; s.banner = 'DYLAN À TERRE, LES ACQUIS RESTENT'; s.caption = 'Reprends l’épreuve en cours avec ta vie et ton énergie restaurées. Les réponses déjà comprises sont conservées.'; },
    retry() { const s = state.menhir; if (s?.phase !== 'defeat') return; s.dylan = s.energy = 100; this.round(); },
    close() { const s = state.menhir; if (s && s.phase !== 'victory') s.phase = 'paused'; save(); emit(); },
    tick(dt) {
      const s = state.menhir; if (!s || s.phase !== 'combat') return;
      s.t += dt; s.combat += dt; s.cooldown = Math.max(0, s.cooldown - dt);
      if (s.mode === 0 && s.t >= s.bossAt) {   // Arcade : le chef attaque toutes les 5 s ; sauter évite, la garde réduit
        s.bossAt = s.t + 5; const avoided = s.t < s.jumpUntil, guarded = s.t < s.guardUntil, damage = avoided ? 0 : guarded ? 2 : 8;
        s.dylan = Math.max(0, s.dylan - damage); s.lastBoss = s.t;
        s.caption = this.stage === 1 ? 'Aurélien prépare un slogan massue !' : this.stage === 2 ? 'Aurélien délègue le problème... avec une tablette !' : 'Aurélien lance son plan décoratif !';
        if (s.dylan <= 0) this.defeat(); emit();
      }
    },
    question: () => Q[state.menhir?.question ?? 0],
    questions: Q,
  };

  // ---- vue d'ensemble -----------------------------------------------------------------------------------------------
  function reset() { state = fresh(); current = null; feedback = ''; timedOut = false; save(); emit(); }
  return {
    data: { characters, activities, quests, acts, chain: CHAIN },
    get state() { return state; }, get current() { return current; }, get feedback() { return feedback; }, get timedOut() { return timedOut; },
    canAssignTask, queueTask, cancelTask, tasksOf, villageStep, survive, warnings, brain: (id) => brain[id],
    quantity, craft, craftCheck, useItem, transfer, rest, memberStatus, clauseQuests, clauseVerified, clauseProgress, clauseStatus,
    progress, frontier, nextAction, nextSite, kindOf, canExecute, startAction, choose, dialogue: () => { const d = dialogues.get(state.dialogue); return d ? { ...d, choices: d.choices.filter((c) => !c.victim || !state.dead.includes(c.victim)) } : null; }, action: (id) => actions.get(id), questDone, guideOpen, workReady, differencesStatus, verified,
    begin, dismissGuide, suspend, submit, selectTablet, confirmAssembly, allocate, confirmAllocation, performWork, verifyWork, moveLane, projectileHit,
    observe, validateDifferences, validateAssembly, retryTimer, tick, duel, reset, save,
    on: (f) => { listeners.add(f); return () => listeners.delete(f); },
    act: (q) => acts.find((a) => a.id === q?.actId),
    character: (id) => characters.find((c) => c.id === id),
    accidents: ACCIDENTS, accident, nameOf, wildDeath, exposures, examine, closeAccident, markPlayed,
  };
}

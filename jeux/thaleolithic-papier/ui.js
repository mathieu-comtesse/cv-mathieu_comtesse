// THALEOLITHIC papier : l'interface en papier découpé. Elle affiche l'état de campaign.js et lui transmet les gestes ;
// aucune règle n'est décidée ici. Un rendu par mécanique : cartes à choix (tri, paires, périmètre, vote, glissement,
// préparation, retour d'expérience, tableau, audit, revue, correction, amélioration), analyse de risque (mesure puis
// vérification), répartition, assemblage des tablettes, 15 différences, point sécurité sous les projectiles, course au
// rassemblement, Duel des menhirs, dialogues à choix, Quêtes et Carnet des Crânes.
import { STAGES, ITEMS, RECIPES, PRODUCTIONS, BEHAVIOUR } from './campaign.js';
import { CLAUSES } from './knowledge.js';
import { cutLetters } from './paper-ui.js';
import { voiceOf } from './talk.js';

const MODE_LABEL = { sort: 'Classer', pair: 'Associer', scope: 'Délimiter', assemble: 'Assembler', risk: 'Analyser le risque', vote: 'Voter', allocation: 'Répartir', briefing: 'Point sécurité',
  swipe: 'Trier les tablettes', differences: '15 différences', prepare: 'Préparer', runner: 'Évacuer', debrief: 'Retour d’expérience', dashboard: 'Mesurer', audit: 'Auditer', review: 'Revue', corrective: 'Corriger', improvement: 'Améliorer' };
// the game's texts keep no middle dot and no dash: '·' becomes ':', a dash a comma, '5.1–5.4' reads '5.1 à 5.4'
export const clean = (s) => String(s ?? '').replace(/(\d)\s*[–—]\s*(\d)/g, '$1 à $2').replace(/\s*[—–]\s*/g, ', ').replace(/\s*·\s*/g, ' : ');
const esc = (s) => clean(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/\n/g, '<br>');
const $ = (id) => document.getElementById(id);
const ico = (n, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;   // the cut-paper icons of index.html
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createUI(campaign, world) {
  const root = $('panel'), body = $('panel-body');
  const meter = (v, cls = '') => `<span class="meter ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
  let mode = null;          // 'activity' | 'duel' | 'dialogue' | 'quest' | 'journal' | null
  // the sheet slides up from below with a small rising flap, and slides away with the closing one; the open screen's
  // button stays marked
  const TOOL = { people: 'btn-people', map: 'btn-map', inventory: 'btn-inventory', tech: 'btn-tech', quest: 'btn-quests', journal: 'btn-journal' };
  const flap = (up) => world.H.sound?.flap({ size: 0.3, up, key: 'sheet' });
  const mark = () => { for (const [m, id] of Object.entries(TOOL)) $(id).classList.toggle('sel', m === mode); };
  const open = (m) => {
    const fresh = root.hidden || root.classList.contains('out');
    mode = m; root.classList.remove('out'); root.hidden = false;
    if (fresh) { root.classList.remove('in'); void root.offsetWidth; root.classList.add('in'); flap(true); body.scrollTop = 0; }
    render(); mark();
  };
  const close = () => {
    if (!mode) return; mode = null; mark(); flap(false);
    root.classList.remove('in');
    if (still()) root.hidden = true; else root.classList.add('out');
  };
  root.addEventListener('animationend', (e) => { if (e.target === root && root.classList.contains('out')) { root.hidden = true; root.classList.remove('out'); } });
  const modal = () => mode && !(mode === 'activity' && campaign.current?.mode === 'runner' && campaign.progress(campaign.current.id).card >= campaign.current.cards.length);
  campaign.on(() => { if (mode) render(); hud(); });

  // ---- HUD: act, quest, where to go, the prompt when Dylan stands at the place --------------------------------------
  function hud() {
    const q = campaign.frontier(), act = campaign.act(q);
    $('act').textContent = q ? clean(act ? act.title : '') : 'Le cycle continue';
    const qtitle = q ? clean(q.title) : 'Campagne terminée', qel = $('quest');
    if (qel.dataset.text !== qtitle) { qel.dataset.text = qtitle; qel.textContent = qtitle; delete qel.dataset.cut; cutLetters(qel); }
    const id = campaign.nextAction(), kind = id && campaign.kindOf(id);
    const title = !id ? '' : kind === 'duel' ? 'Le Duel des menhirs' : kind === 'activity' ? campaign.data.activities.get(id).title : campaign.action(id).title;
    $('next').textContent = clean(title);
    const st = campaign.state.player, warn = campaign.warnings();
    $('vitals').innerHTML = [['Vie', st.life], ['Énergie', st.energy], ['Nourriture', st.food], ['Fatigue', st.fatigue]].map(([l, v]) => `<span>${l} ${meter(v, l === 'Fatigue' ? 'cold' : '')}</span>`).join('') + (warn.length ? `<b>${warn.join('  ')}</b>` : '');
    const done = campaign.data.quests.filter((x) => campaign.questDone(x)).length;
    $('progress').style.width = (done / campaign.data.quests.length * 100) + '%';
    root.style.setProperty('--top', Math.round($('hud').getBoundingClientRect().bottom + 40) + 'px');   // the sheet sits just under the HUD, whatever its height
  }
  function prompt() {
    const el = $('prompt'), id = campaign.nextAction(), site = campaign.nextSite();
    if (mode || !id || !site || campaign.state.working || !world.near(site)) { el.hidden = true; return; }
    const kind = campaign.kindOf(id);
    el.hidden = false;
    el.querySelector('span').textContent = clean(kind === 'duel' ? 'Défier Aurélien au Grand Menhir' : kind === 'activity' ? campaign.data.activities.get(id).title : campaign.action(id).title);
  }
  function act() {
    const id = campaign.nextAction(), site = campaign.nextSite(); if (mode || !id || !world.near(site)) return;
    const kind = campaign.kindOf(id);
    if (kind === 'duel') { campaign.duel.start(); open('duel'); }
    else if (kind === 'activity') { if (campaign.begin(id)) open('activity'); }
    else campaign.startAction(id);
  }

  // ---- the activity card -----------------------------------------------------------------------------------------------
  // a spoken line on a slab of stone: the speaker's bone tag, the words painted in ochre as they are said (talk.js);
  // kept across re-renders (the panel is redrawn often) so the line is not restarted
  const speeches = new Map();
  const speech = (key, who, text) => {
    let sp = speeches.get(key);
    if (!sp) {
      sp = document.createElement('div'); sp.className = 'speech';
      sp.innerHTML = `<span class="who">${esc(who)}</span><p class="line"></p>`;
      speeches.clear(); speeches.set(key, sp);
      const run = world.talk?.say(sp.querySelector('.line'), clean(text), { voice: voiceOf(who, campaign.data.characters) });
      if (run) { sp.classList.add('busy'); run.cb = () => { sp.classList.remove('busy'); body.querySelectorAll('.wait').forEach((b) => b.classList.remove('wait')); }; }
      else sp.querySelector('.line').textContent = clean(text);
    }
    return sp;
  };
  const btn = (label, onclick, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.innerHTML = label; b.onclick = onclick; return b; };
  function header(a) {
    const actor = campaign.character(a.actor);
    return `<p class="kicker">ISO 45001 ${esc(a.clause)}, ${esc(MODE_LABEL[a.mode] || a.mode)}${actor ? ' avec ' + esc(actor.name) : ''}</p><h2>${esc(a.title)}</h2>`;
  }
  function renderActivity() {
    const a = campaign.current;
    if (!a) {   // finished: the outro and what the Carnet now holds
      body.innerHTML = `<p class="kicker">Preuve vérifiée</p><h2>Carnet des Crânes</h2><p class="said">${esc(campaign.feedback)}</p>`;
      body.append(btn('Continuer', close, 'go')); return;
    }
    const p = campaign.progress(a.id), timer = a.duration ? `<p class="timer">${Math.max(0, Math.ceil(a.duration - p.seconds))} s</p>` : '';
    body.innerHTML = header(a) + timer;
    if (campaign.guideOpen()) { body.append(speech('in:' + a.id, campaign.character(a.actor)?.name || 'Mathieu', a.intro || 'Observe, décide, puis vérifie sur le terrain. Les acquis restent conservés si tu t’interromps.')); body.append(btn('Commencer', () => campaign.dismissGuide(), 'go'), btn('Plus tard', suspend)); return; }
    if (campaign.timedOut) { body.insertAdjacentHTML('beforeend', `<p class="fb bad">${ico('cross', 's')}${esc(campaign.feedback)}</p>`); body.append(btn('Reprendre l’essai', () => campaign.retryTimer(), 'go')); return; }
    const fb = campaign.feedback ? `<p class="fb">${esc(campaign.feedback)}</p>` : '';
    if (a.mode === 'allocation') return allocation(a, p, fb);
    if (a.mode === 'assemble') return assemble(a, p, fb);
    if (a.mode === 'differences') return differences(a, p, fb);
    if (p.card >= a.cards.length) {   // modes that hold after the last card
      if (a.mode === 'risk') {
        body.insertAdjacentHTML('beforeend', `<p class="said"><b>Mesure</b> : ${esc(a.measure)}<br><b>Responsable</b> : ${esc(a.responsible || '')}</p>${fb}`);
        if (!p.worked) body.append(btn('Appliquer la mesure sur le terrain', () => campaign.performWork(), 'go'));
        else if (p.workSeconds < 3) body.insertAdjacentHTML('beforeend', `<p class="timer">Mesure en place, contrôle possible dans ${Math.ceil(3 - p.workSeconds)} s</p>`);
        else body.append(btn('Vérifier l’efficacité', () => campaign.verifyWork(), 'go'));
        return;
      }
      if (a.mode === 'briefing') { body.insertAdjacentHTML('beforeend', `<p class="said">Messages transmis. Tiens le point jusqu’à la fin : esquive avec ← →.</p>${fb}`); body.append(lanes(a, p)); return; }
      if (a.mode === 'runner') { body.insertAdjacentHTML('beforeend', `<p class="said">Rejoins le point de rassemblement et attends tout le monde.</p>${fb}`); return; }
    }
    const card = a.cards[p.card];
    const extra = [card.object && `<b>Objet</b> : ${esc(card.object)}`, card.before && `<b>Avant</b> : ${esc(card.before)}<br><b>Après</b> : ${esc(card.after)}`].filter(Boolean).join('<br>');
    body.insertAdjacentHTML('beforeend', `<p class="count">Carte ${p.card + 1} / ${a.cards.length}</p><div class="card"><p>${esc(card.question)}</p>${extra ? `<p class="small">${extra}</p>` : ''}</div>`);
    const row = document.createElement('div'); row.className = 'choices ' + a.mode;
    card.choices.forEach((c, i) => row.append(btn((a.mode === 'swipe' ? ico('arrow', 's' + (i === 0 ? ' left' : '')) : '') + esc(c), () => campaign.submit(i))));
    body.append(row); body.insertAdjacentHTML('beforeend', fb);
    if (a.mode === 'briefing') body.append(lanes(a, p));
    body.append(btn('Interrompre', suspend, 'quiet'));
  }
  function allocation(a, p, fb) {
    const names = a.cards[0].choices, left = a.budget - p.allocation.reduce((s, x) => s + x, 0);
    body.insertAdjacentHTML('beforeend', `<div class="card"><p>${esc(a.cards[0].question)}</p></div><p class="count">Moyens restants : ${left} / ${a.budget}</p>`);
    const row = document.createElement('div'); row.className = 'chests';
    names.forEach((n, i) => { const d = document.createElement('div'); d.className = 'chest'; d.innerHTML = `<b>${esc(n)}</b><span>${p.allocation[i]}</span>`; d.append(btn('−', () => campaign.allocate(i, -1)), btn('+', () => campaign.allocate(i, 1))); row.append(d); });
    body.append(row); body.insertAdjacentHTML('beforeend', fb); body.append(btn('Valider la répartition', () => campaign.confirmAllocation(), 'go'), btn('Interrompre', suspend, 'quiet'));
  }
  function assemble(a, p, fb) {
    const row = document.createElement('div'); row.className = 'tablets';
    a.cards.forEach((c, i) => { const done = p.answers.includes(c.id); const b = btn(`${done ? ico('check', 's') : ''}${esc(c.question)}`, () => campaign.selectTablet(i), done ? 'done' : i === p.card ? 'sel' : ''); b.disabled = done; row.append(b); });
    body.insertAdjacentHTML('beforeend', `<p class="count">Tablettes reliées : ${p.answers.length} / ${a.cards.length}</p>`); body.append(row);
    const card = a.cards[p.card];
    if (card && !p.answers.includes(card.id)) { const ch = document.createElement('div'); ch.className = 'choices'; card.choices.forEach((c, i) => ch.append(btn(esc(c), () => campaign.submit(i)))); body.insertAdjacentHTML('beforeend', `<p class="small">Fonction de la tablette choisie :</p>`); body.append(ch); }
    body.insertAdjacentHTML('beforeend', fb);
    if (p.answers.length >= a.cards.length) body.append(btn('Vérifier l’ensemble du système', () => campaign.confirmAssembly(), 'go'));
    body.append(btn('Interrompre', suspend, 'quiet'));
  }
  function differences(a, p, fb) {
    const st = campaign.differencesStatus();
    body.insertAdjacentHTML('beforeend', `<p class="count">Différences expliquées : ${st.found} / ${a.cards.length}, minimum ${st.minimum}, critiques ${st.critical ? ico('check', 's') : 'à trouver'}, notions ${st.concepts ? ico('check', 's') : 'à trouver'}</p>`);
    const grid = document.createElement('div'); grid.className = 'diffs';
    a.cards.forEach((c, i) => { const done = p.answers.includes(c.id); const b = btn(`${done ? ico('check', 's') : i + 1 + '. '}${esc(c.question)}`, () => campaign.observe(i), done ? 'done' : p.observed && p.card === i ? 'sel' : ''); b.disabled = done; grid.append(b); });
    body.append(grid);
    if (p.observed) { const c = a.cards[p.card], ch = document.createElement('div'); ch.className = 'choices'; c.choices.forEach((x, i) => ch.append(btn(esc(x), () => campaign.submit(i)))); body.insertAdjacentHTML('beforeend', `<div class="card"><p><b>${esc(c.question)}</b></p><p class="small">Avant : ${esc(c.before)}<br>Après : ${esc(c.after)}</p></div>`); body.append(ch); }
    body.insertAdjacentHTML('beforeend', fb);
    body.append(btn('Présenter le registre à Ouways', () => campaign.validateDifferences(), 'go'), btn('Interrompre', suspend, 'quiet'));
  }
  // the safety briefing under projectiles: three lanes, stones falling; ← → moves Dylan; a hit stuns him for a moment
  let laneEl = null, falling = [], nextDrop = 1.2;
  function lanes(a, p) {
    laneEl = document.createElement('div'); laneEl.className = 'lanes';
    laneEl.innerHTML = '<i></i><i></i><i></i><b class="dylan"></b>';
    laneEl.querySelector('.dylan').style.left = (p.lane * 33.3 + 16.6) + '%';
    for (const f of falling) { const s = document.createElement('em'); s.style.left = (f.lane * 33.3 + 16.6) + '%'; s.style.top = (f.y * 100) + '%'; laneEl.append(s); }
    return laneEl;
  }
  function stepLanes(dt) {
    const a = campaign.current; if (mode !== 'activity' || a?.mode !== 'briefing' || campaign.guideOpen() || campaign.timedOut) { falling = []; return; }
    const p = campaign.progress(a.id);
    if ((nextDrop -= dt) <= 0) { nextDrop = 1.1 + Math.random() * 0.8; falling.push({ lane: Math.floor(Math.random() * 3), y: 0 }); }
    for (const f of falling) f.y += dt * 0.7;
    for (const f of falling.filter((f) => f.y >= 0.86 && !f.hit)) { f.hit = true; if (f.lane === p.lane) campaign.projectileHit(); }
    falling = falling.filter((f) => f.y < 1.05);
    if (laneEl?.isConnected) { const fresh = lanes(a, p); laneEl.replaceWith(fresh); laneEl = fresh; }
  }
  function suspend() { campaign.suspend(); close(); }

  // ---- the Duel des menhirs --------------------------------------------------------------------------------------------
  function renderDuel() {
    const d = campaign.duel, s = d.s; if (!s) return close();
    const bar = (label, v, cls) => `<div class="bar ${cls}"><span>${label}</span><i style="width:${Math.max(0, v)}%"></i></div>`;
    body.innerHTML = `<p class="kicker">ISO 45001 5.1 à 5.4, Leadership</p><h2>LA POLITIQUE DU MENHIR</h2>`;
    if (s.phase === 'choose') {
      body.insertAdjacentHTML('beforeend', '<p class="said">Mathieu : « Cinq décisions. Les coups seuls ne valident aucune épreuve. »</p>');
      ['Arcade : esquive, garde et décisions', 'Pédagogique : sans attaques automatiques', 'Avec indices : aide visible pour chaque décision'].forEach((l, i) => body.append(btn(l, () => d.choose(i), i === 0 ? 'go' : '')));
      body.append(btn('Plus tard', () => { d.close(); close(); }, 'quiet')); return;
    }
    const pips = s.cleared.map((c) => `<i class="${c ? 'on' : ''}"></i>`).join('');
    body.insertAdjacentHTML('beforeend', `${bar('Dylan', s.dylan, 'life')}${bar('Énergie', s.energy, 'energy')}${bar('Aurélien', s.chief, 'chief')}<p class="pips">${pips}</p>
      <p class="banner">${esc(s.banner)}</p><p class="said">${esc(s.caption)}</p>${s.feedback ? `<p class="fb">${esc(s.feedback)}</p>` : ''}`);
    if (s.phase === 'combat') {
      const row = document.createElement('div'); row.className = 'choices duelpad';
      row.append(btn('Frapper <kbd>J</kbd>', () => d.attack(false)), btn('Coup de pied <kbd>K</kbd>', () => d.attack(true)), btn('Garde <kbd>L</kbd>', () => d.guard()), btn('Sauter <kbd>Espace</kbd>', () => d.jump()));
      body.append(row);
      const q = btn(d.canQuestion ? 'Répondre à l’épreuve <kbd>E</kbd>' : 'Épreuve dans un instant…', () => d.openQuestion(), 'go'); q.disabled = !d.canQuestion; body.append(q);
    } else if (s.phase === 'question') {
      const q = d.question();
      body.insertAdjacentHTML('beforeend', `<div class="card"><p class="small">${esc(q.clause)} : ${esc(q.title)}</p><p>${esc(q.question)}</p>${s.mode === 2 ? `<p class="small">Indice : ${esc(q.hint)}</p>` : ''}</div>`);
      const row = document.createElement('div'); row.className = 'choices'; q.answers.forEach((a, i) => row.append(btn(esc(a.text), () => d.answer(i)))); body.append(row);
    } else if (s.phase === 'defeat') body.append(btn('Reprendre l’épreuve', () => d.retry(), 'go'));
    else if (s.phase === 'victory') body.append(btn('Continuer', close, 'go'));
    if (s.phase !== 'victory') body.append(btn('Quitter le duel', () => { d.close(); close(); }, 'quiet'));
  }

  // ---- dialogues with choices (the shelter's roof) and the action in progress ----------------------------------------
  function renderDialogue() {
    const dl = campaign.dialogue(); if (!dl) { close(); return; }
    const sp = speech('dl:' + dl.id, dl.speaker, dl.text); body.innerHTML = ''; body.append(sp);
    for (const c of dl.choices) body.append(btn(esc(c.text), () => campaign.choose(c.id), sp.classList.contains('busy') ? 'wait' : ''));
  }

  // ---- screens: the quests and the Carnet des Crânes -----------------------------------------------------------------
  function renderQuests() {
    const f = campaign.frontier();
    body.innerHTML = '<p class="kicker">Écran Quêtes</p><h2>La campagne ISO 45001</h2>';
    for (const q of campaign.data.quests) {
      const done = campaign.questDone(q), now = q === f;
      body.insertAdjacentHTML('beforeend', `<div class="quest ${done ? 'done' : now ? 'now' : 'later'}"><b>${done ? ico('check', 's') : ''}${esc(q.title)}</b><span>${esc(campaign.act(q)?.title || '')} (${esc((q.iso || []).join(', '))})</span>${now ? `<p>${esc(q.description)}</p><p class="small">${esc(q.tip || '')}</p>` : ''}</div>`);
    }
    body.append(btn('Fermer', close, 'go'));
  }
  function renderJournal() {
    const ev = campaign.state.evidence;
    body.innerHTML = `<p class="kicker">Écran Codex</p><h2>Le Carnet des Crânes</h2><p class="count">${ev.length} preuves, ${ev.filter((e) => e.stage === 3).length} vérifiées</p>`;
    if (!ev.length) body.insertAdjacentHTML('beforeend', '<p class="said">Les preuves apparaîtront ici au fil des activités : découvertes, décidées, réalisées puis vérifiées.</p>');
    for (const e of ev.slice().reverse()) body.insertAdjacentHTML('beforeend', `<details class="ev"><summary><b>${esc(e.name)}</b> <span>${esc(e.clause || '')}, ${STAGES[e.stage] || ''}</span></summary><p class="small">${esc(e.result)}</p></details>`);
    body.append(btn('Fermer', close, 'go'));
  }

  // ---- Peuple (TribalPeopleView) : membres, état réel, fiche, responsabilités, repos, activités liées -----------------
  let picker = false, person = 'mathieu', peopleTab = 'TÂCHES', item = 'wood', invTab = 'Objet', clause = '4.1';
  const memberRole = (id, role) => id === 'dylan' ? 'Apprenti, joueur' : id === 'mathieu' ? 'Mentor en prévention' : id === 'aurelien' ? 'Chef de la tribu' : (role || '').split('·')[0].trim();
  function renderPeople() {
    const chars = campaign.data.characters, alive = chars.filter((c) => !campaign.state.dead.includes(c.id)).length;
    body.innerHTML = `<p class="kicker">Écran Peuple</p><h2>La tribu des Crânes Fendus</h2><p class="count">${alive} / ${chars.length} membres</p>`;
    const list = document.createElement('div'); list.className = 'people';
    for (const c of chars) {
      const m = campaign.state.people[c.id], dead = campaign.state.dead.includes(c.id);
      const doing = c.id === 'dylan' ? 'Joueur' : BEHAVIOUR[campaign.brain(c.id)?.behaviour || (dead ? 'DEAD' : 'IDLE')];
      const b = btn(`<b>${esc(c.name)}</b><small>${campaign.memberStatus(c.id)}, ${esc(doing).toLowerCase()}</small><small>${meter(m.competence)}${meter(m.fatigue, 'cold')}</small>`, () => { person = c.id; picker = false; render(); }, (c.id === person ? 'sel ' : '') + (dead ? 'done' : ''));
      list.append(b);
    }
    const c = campaign.character(person), m = campaign.state.people[person], dead = campaign.state.dead.includes(person);
    const tabs = document.createElement('div'); tabs.className = 'tabs';
    for (const t of ['TÂCHES', 'INFORMATIONS', 'RESPONSABILITÉS']) tabs.append(btn(t, () => { peopleTab = t; picker = false; render(); }, t === peopleTab ? 'sel' : ''));
    body.insertAdjacentHTML('beforeend', `<h3>${esc(c.name.toUpperCase())} <small>${esc(memberRole(person, c.role))}</small></h3>`); body.append(tabs);
    if (peopleTab === 'TÂCHES') {
      if (picker) {   // the work that can be given, with the reason it cannot when it cannot
        for (const a of PRODUCTIONS) { const why = campaign.canAssignTask(person, a.id); const b = btn(`<b>${esc(a.title)}</b><small>${why ? esc(why) : `${esc(world.SITES[a.site].label)}, ${a.durationSeconds} s, compétence ${a.minimumCompetence}`}</small>`, () => { if (campaign.queueTask(person, a.id)) picker = false; render(); }, why ? 'done' : ''); body.append(b); }
        body.append(btn('Retour', () => { picker = false; render(); }, 'quiet'));
      } else {
        const all = campaign.tasksOf(person), open_ = all.filter((t) => !['done', 'failed'].includes(t.status)), shown = open_.concat(all.filter((t) => t.status === 'done').slice(-3).reverse());
        const label = { done: 'FAIT', blocked: 'BLOQUÉ', moving: 'EN ROUTE', working: 'EN COURS', queued: 'EN ATTENTE', failed: 'ÉCHOUÉE' };
        for (const t of shown) {
          const a = PRODUCTIONS.find((x) => x.id === t.actionId), pc = t.status === 'done' ? 100 : Math.round(100 * t.workedSeconds / Math.max(1, t.duration));
          body.insertAdjacentHTML('beforeend', `<div class="quest ${t.status === 'done' ? 'done' : 'now'}"><b>${t.status === 'done' ? ico('check', 's') : ''}${esc(a.title)}</b><span>${esc(world.SITES[a.site].label)}, ${pc} % ${meter(pc)} ${label[t.status]}</span>${t.status === 'blocked' ? `<p class="small">${esc(t.reason)}</p>` : ''}</div>`);
          if (!['done', 'failed'].includes(t.status)) body.append(btn(ico('cross', 's') + 'Annuler', () => campaign.cancelTask(t.id), 'quiet'));
        }
        if (!shown.length) body.insertAdjacentHTML('beforeend', `<div class="quest"><b>${person === 'dylan' ? 'DYLAN, CONTRÔLÉ PAR LE JOUEUR' : 'ACTIVITÉ RÉGULIÈRE'}</b><span>${esc(person === 'dylan' ? '' : BEHAVIOUR[campaign.brain(person)?.behaviour || 'IDLE'])}</span></div>`);
        const add = btn('+ Ajouter une tâche', () => { picker = true; render(); }, 'go'); add.disabled = dead || person === 'dylan' || open_.length >= 3; body.append(add);
        if (campaign.feedback && peopleTab === 'TÂCHES') body.insertAdjacentHTML('beforeend', `<p class="fb">${esc(campaign.feedback)}</p>`);
      }
    } else {
      const resp = person === 'aurelien' ? 'Responsabilité : chef de la tribu.' : person === 'mathieu' ? 'Responsabilité : mentor de Dylan et prévention.' : 'Fonction : ' + c.role;
      body.insertAdjacentHTML('beforeend', `<div class="card"><p>${esc(peopleTab === 'RESPONSABILITÉS' ? resp : c.role)}</p><p class="small">${dead ? 'Décédé, aucune affectation possible' : `Vie ${m.life}/100, Énergie ${m.energy}/100, Fatigue ${m.fatigue}/100, Faim ${m.hunger}/100, Moral ${m.morale}/100, Compétence ${m.competence}`}</p><p class="small">État : ${campaign.memberStatus(person)}</p></div>`);
      if (!dead && person !== 'dylan') body.append(btn(m.assignment === 'repos' ? 'Reprendre l’activité' : 'Ordonner un repos', () => campaign.rest(person), 'go'));
    }
    body.insertAdjacentHTML('beforeend', '<p class="count">La tribu : savoir et fatigue</p>'); body.append(list);
    body.append(btn('Fermer', close, 'quiet'));
  }
  // ---- Carte (TribalMapView) : le village vu de haut, Dylan, l'objectif ; choisir un lieu pose le repère dessus ------
  function renderMap() {
    const S = world.SITES, X = (x) => (x + 30) * 8, Z = (z) => (z + 34) * 8, hero = world.H.hero.group.position, target = world.guide || campaign.nextSite();
    const river = world.RIVER.pts.map(([x, z], i) => (i ? 'L' : 'M') + X(x).toFixed(0) + ' ' + Z(z).toFixed(0)).join(' ');
    // printed like an atlas plate: graticule, neatline, the river in ink and wash, the target as an inked ring with a
    // cross, Dylan as the one red pin, a compass
    let svg = `<svg class="map" viewBox="0 0 496 368" role="img" aria-label="Carte du village"><defs><pattern id="grat" width="31" height="23" patternUnits="userSpaceOnUse"><path d="M31 0V23H0" fill="none" stroke="#2a1a1e" stroke-opacity=".08"/></pattern></defs>
      <rect width="496" height="368" fill="url(#grat)"/>
      <rect x="6" y="6" width="484" height="356" fill="none" stroke="#2a1a1e" stroke-opacity=".7" stroke-width="1.2"/><rect x="10" y="10" width="476" height="348" fill="none" stroke="#2a1a1e" stroke-opacity=".35" stroke-width=".6"/>
      <path d="${river}" stroke="#6f7fb0" stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".42"/><path d="${river}" stroke="#2a1a1e" stroke-opacity=".5" stroke-width="1.1" stroke-dasharray="7 5" fill="none"/>`;
    for (const [id, s] of Object.entries(S)) {
      const x = X(s.x), y = Z(s.z), goal = id === target;
      svg += `<g class="site" data-site="${id}"><circle cx="${x}" cy="${y}" r="16" fill="transparent" stroke="none"/>${goal ? `<circle class="goal" cx="${x}" cy="${y}" r="11"/><path class="x" d="M${x - 3.4} ${y - 3.4}l6.8 6.8M${x + 3.4} ${y - 3.4}l-6.8 6.8"/>` : `<circle cx="${x}" cy="${y}" r="4.6"/>`}<text x="${x}" y="${y - 15}">${esc(s.label)}</text></g>`;
    }
    const hx = X(hero.x), hz = Z(hero.z);
    svg += `<ellipse cx="${hx + 2}" cy="${hz + 1}" rx="5" ry="2" fill="#2a1828" opacity=".3"/><path d="M${hx} ${hz}v-13" stroke="#2a1a1e" stroke-width="1.6"/><circle cx="${hx}" cy="${hz - 16}" r="6" fill="#a83a2a" stroke="#4a2c24"/><circle cx="${hx - 2}" cy="${hz - 18}" r="1.8" fill="#fbf6ea" opacity=".8"/>
      <g transform="translate(456 326)" stroke="#2a1a1e" stroke-width=".8"><path d="M0-18L3.4 0 0 18-3.4 0z" fill="#efe0c2"/><path d="M0-18L3.4 0H-3.4z" fill="#a83a2a"/><path d="M-14 0H14" stroke-opacity=".6"/></g><text x="456" y="300">N</text></svg>`;
    body.innerHTML = `<p class="kicker">Écran Carte</p><h2>Le village des Crânes Fendus</h2>${svg}<p class="small">L’épingle rouge est Dylan, le cercle à croix la prochaine étape. Choisis un lieu pour y poser le repère.</p>`;
    body.querySelectorAll('.site').forEach((g) => { g.onclick = () => { world.guide = g.dataset.site; render(); }; });
    if (world.guide) body.append(btn('Revenir à l’objectif de la quête', () => { world.guide = null; render(); }));
    body.append(btn('Fermer', close, 'quiet'));
  }
  // ---- Inventaire (TribalInventoryView) : le sac, l'objet choisi, l'atelier et les réserves de Neila -------------------
  function renderInventory() {
    const st = campaign.state, nearShop = world.near('atelier_silex'), nearStore = world.near('stockage');
    body.innerHTML = `<p class="kicker">Écran Inventaire</p><h2>Mes objets</h2>`;
    const grid = document.createElement('div'); grid.className = 'bag';
    for (const it of ITEMS) grid.append(btn(`<b>${esc(it.name)}</b><span>${campaign.quantity(it.id)}</span>`, () => { item = it.id; render(); }, (it.id === item ? 'sel ' : '') + (campaign.quantity(it.id) ? '' : 'done')));
    body.append(grid);
    const tabs = document.createElement('div'); tabs.className = 'tabs';
    for (const t of ['Objet', 'Atelier', 'Réserve']) tabs.append(btn(t.toUpperCase(), () => { invTab = t; render(); }, t === invTab ? 'sel' : ''));
    body.append(tabs);
    if (invTab === 'Objet') {
      const it = ITEMS.find((x) => x.id === item), extra = item === 'tool' ? `<br><br>État : ${st.equipped === 'tool' && st.resources.tool > 0 ? 'équipée dans la main' : 'non équipée'}.<br>L’outil ne valide pas à lui seul une mesure de prévention.` : '';
      body.insertAdjacentHTML('beforeend', `<div class="card"><p><b>${esc(it.name.toUpperCase())}</b> (disponible : ${campaign.quantity(item)})</p><p class="small">${esc(it.description)}${extra}</p></div>`);
      if (item === 'food') body.append(btn('Utiliser', () => campaign.useItem('food'), 'go'));
      else if (item === 'tool') body.append(btn(st.equipped === 'tool' ? 'Ranger l’outil' : 'Équiper', () => campaign.useItem('tool'), 'go'));
      else if (item === 'notebook' || item === 'evidence') body.append(btn('Consulter', () => open('journal'), 'go'));
      else body.append(btn('Voir les recettes', () => { invTab = 'Atelier'; render(); }));
      body.insertAdjacentHTML('beforeend', `<p class="small">Dylan : nourriture ${Math.round(st.player.food)}, énergie ${Math.round(st.player.energy)}, fatigue ${Math.round(st.player.fatigue)}</p>`);
    } else if (invTab === 'Atelier') {
      for (const r of RECIPES) {
        const why = campaign.craftCheck(r, nearShop);
        body.insertAdjacentHTML('beforeend', `<div class="card"><p><b>${esc(r.title)}</b></p><p class="small">${r.costs.map((x) => x.amount + ' ' + ITEMS.find((i) => i.id === x.id).name.toLowerCase()).join(', ')}, ${r.durationSeconds} s, compétence ${r.minimumCompetence}<br>${why ? esc(why) : 'Conditions réunies.'}</p></div>`);
        const b = btn(nearShop ? 'Fabriquer' : 'Rejoindre l’atelier', () => { if (nearShop) campaign.craft(r.id, true); else { world.guide = 'atelier_silex'; close(); } }, why && nearShop ? '' : 'go'); b.disabled = !!why && nearShop; body.append(b);
      }
    } else {
      body.insertAdjacentHTML('beforeend', `<div class="card"><p><b>RÉSERVES DE NEILA</b></p><p class="small">Stockage du village, transfert sur place${nearStore ? '' : ', rejoins le stockage pour transférer'}</p><p class="small">${ITEMS.filter((i) => ['wood', 'stone', 'flint', 'fiber', 'food', 'tool'].includes(i.id)).map((i) => `${i.name} : ${st.reserve[i.id] || 0}`).join(', ')}</p></div>`);
      const row = document.createElement('div'); row.className = 'choices sort';
      row.append(btn('Prendre 1 ' + esc(ITEMS.find((i) => i.id === item).name.toLowerCase()), () => campaign.transfer(item, 1, false, false, nearStore)), btn('Déposer 1', () => campaign.transfer(item, 1, true, false, nearStore)),
        btn('Toute la réserve', () => campaign.transfer(item, 0, false, true, nearStore)), btn('Tout le sac', () => campaign.transfer(item, 0, true, true, nearStore)));
      body.append(row);
    }
    if (campaign.feedback && invTab !== 'Objet') body.insertAdjacentHTML('beforeend', `<p class="fb">${esc(campaign.feedback)}</p>`);
    body.append(btn('Fermer', close, 'quiet'));
  }
  // ---- Technologie (TribalKnowledgeView) : l'arbre des notions par phase, missions liées, prérequis, savoir -----------
  function renderTech() {
    body.innerHTML = `<p class="kicker">Écran Technologie</p><h2>Les savoirs de la tribu</h2><p class="count">Fragments de savoir : ${campaign.state.resources.knowledge}</p>`;
    const tree = document.createElement('div'); tree.className = 'tree';
    for (const phase of ['Planifier', 'Agir', 'Vérifier', 'Améliorer']) {
      const col = document.createElement('div'); col.innerHTML = `<p class="kicker">${phase.toUpperCase()}</p>`;
      for (const k of CLAUSES.filter((x) => x.phase === phase)) { const pr = campaign.clauseProgress(k.id); col.append(btn(`${esc(k.id)} ${esc(k.title)}${meter(pr * 100)}`, () => { clause = k.id; render(); }, (k.id === clause ? 'sel ' : '') + (pr >= 1 ? 'ok' : ''))); }
      tree.append(col);
    }
    body.append(tree);
    const k = CLAUSES.find((x) => x.id === clause), qs = campaign.clauseQuests(clause), chain = campaign.data.quests;
    const prereq = [...new Set(qs.map((q) => chain[chain.indexOf(q) - 1]).filter(Boolean))].map((q) => q.title);
    body.insertAdjacentHTML('beforeend', `<div class="card"><p><b>${esc(k.id)} ${esc(k.title)}</b></p><p class="small">${esc(campaign.clauseStatus(clause))}</p>
      <p class="small"><b>MISSIONS LIÉES</b><br>${qs.length ? qs.map((q) => (campaign.clauseVerified(q, clause) ? 'Vérifiée : ' : 'À vérifier : ') + esc(q.title)).join('<br>') : 'Aucune mission dans cette campagne.'}</p>
      <p class="small"><b>PRÉREQUIS</b><br>${prereq.length ? prereq.map(esc).join('<br>') : 'Aucun'}</p>
      ${clause === '4.1' || clause === '4.2' ? '<p class="small">Amd 1:2024, examine la pertinence du changement climatique et les attentes associées pour les activités de la tribu.</p>' : ''}
      <p class="small">Une mesure construite doit encore être contrôlée. Les titres sont des repères pédagogiques ; ils ne constituent pas une certification.</p></div>`);
    if (qs.length) body.append(btn('Voir la mission liée', () => open('quest'), 'go'));
    body.append(btn('Fermer', close, 'quiet'));
  }

  function render() {
    root.classList.toggle('runner', mode === 'activity' && !modal());
    root.classList.toggle('duel', mode === 'duel');   // docked low: the fight itself is played in the village
    if (mode === 'activity') renderActivity(); else if (mode === 'duel') renderDuel(); else if (mode === 'dialogue') renderDialogue();
    else if (mode === 'quest') renderQuests(); else if (mode === 'journal') renderJournal();
    else if (mode === 'people') renderPeople(); else if (mode === 'map') renderMap(); else if (mode === 'inventory') renderInventory(); else if (mode === 'tech') renderTech();
    for (const h of body.querySelectorAll('h2')) cutLetters(h);   // titles cut out letter by letter
  }

  // ---- keys: E acts, arrows during the briefing move the lanes, J K L Espace in the duel; WASD blocked behind a modal -
  addEventListener('keydown', (e) => {
    if ($('intro') && !$('intro').hidden) return;
    const k = e.code;
    if (mode === 'duel' && campaign.duel.s?.phase === 'combat') {
      const d = campaign.duel;
      if (k === 'KeyJ') d.attack(false); else if (k === 'KeyK') d.attack(true); else if (k === 'KeyL') d.guard(); else if (k === 'Space') d.jump(); else if (k === 'KeyE') d.openQuestion();
      e.stopImmediatePropagation(); e.preventDefault(); return;
    }
    if (mode === 'activity' && campaign.current?.mode === 'briefing' && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'KeyA' || k === 'KeyD')) { campaign.moveLane(k === 'ArrowLeft' || k === 'KeyA' ? -1 : 1); e.stopImmediatePropagation(); e.preventDefault(); return; }
    if ((k === 'KeyE' || k === 'Enter') && !mode) { act(); e.preventDefault(); return; }
    if (!mode && (k === 'KeyI' || k === 'KeyM')) { open(k === 'KeyI' ? 'inventory' : 'map'); return; }
    if (k === 'Escape' && mode && mode !== 'dialogue') { if (mode === 'activity') suspend(); else if (mode === 'duel') { campaign.duel.close(); close(); } else close(); return; }
    if (modal() && /^(Key[WASD]|Arrow)/.test(k)) e.stopImmediatePropagation();
  }, true);
  $('prompt').onclick = act;
  for (const [id, m] of [['btn-people', 'people'], ['btn-map', 'map'], ['btn-inventory', 'inventory'], ['btn-tech', 'tech'], ['btn-quests', 'quest'], ['btn-journal', 'journal']]) $(id).onclick = () => open(m);

  let refresh = 0;
  hud();
  return {
    step(dt) {
      campaign.tick(dt); campaign.duel.tick(dt); stepLanes(dt);
      if (campaign.state.dialogue && mode !== 'dialogue') open('dialogue');
      const w = campaign.state.working; $('work').hidden = !w; if (w) $('work').querySelector('i').style.width = ((1 - w.left / w.total) * 100) + '%';
      // the evacuation: once the cards are answered, everybody walks to the gathering point and Dylan joins them
      const a = campaign.current;
      if (a?.mode === 'runner' && campaign.progress(a.id).card >= a.cards.length) {
        if (!world.evacuating) { world.evacuating = true; world.sendToAssembly(); render(); }
        campaign.validateAssembly(world.near('rassemblement', 3.6), world.everyoneAtAssembly(), Object.keys(world.people));
      } else if (world.evacuating && !a) { world.evacuating = false; world.sendHome(); }
      // timers and the duel's bars: redrawn ~3 times a second (rebuilding buttons every frame would swallow clicks)
      if ((refresh += dt) > 0.3) { refresh = 0; hud(); if ((mode === 'activity' && (a?.mode === 'risk' || a?.duration)) || (mode === 'duel' && campaign.duel.s?.phase === 'combat') || (mode === 'people' && !picker)) render(); }
      prompt();
    },
    open, close, act, get mode() { return mode; },
  };
}

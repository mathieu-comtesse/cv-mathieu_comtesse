// THALEOLITHIC · papier : l'interface en papier découpé. Elle affiche l'état de campaign.js et lui transmet les gestes ;
// aucune règle n'est décidée ici. Un rendu par mécanique : cartes à choix (tri, paires, périmètre, vote, glissement,
// préparation, retour d'expérience, tableau, audit, revue, correction, amélioration), analyse de risque (mesure puis
// vérification), répartition, assemblage des tablettes, 15 différences, point sécurité sous les projectiles, course au
// rassemblement, Duel des menhirs, dialogues à choix, Quêtes et Carnet des Crânes.
import { STAGES } from './campaign.js';

const MODE_LABEL = { sort: 'Classer', pair: 'Associer', scope: 'Délimiter', assemble: 'Assembler', risk: 'Analyser le risque', vote: 'Voter', allocation: 'Répartir', briefing: 'Point sécurité',
  swipe: 'Trier les tablettes', differences: '15 différences', prepare: 'Préparer', runner: 'Évacuer', debrief: 'Retour d’expérience', dashboard: 'Mesurer', audit: 'Auditer', review: 'Revue', corrective: 'Corriger', improvement: 'Améliorer' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/\n/g, '<br>');
const $ = (id) => document.getElementById(id);

export function createUI(campaign, world) {
  const root = $('panel'), body = $('panel-body');
  let mode = null;          // 'activity' | 'duel' | 'dialogue' | 'quest' | 'journal' | null
  const open = (m) => { mode = m; root.hidden = false; render(); };
  const close = () => { mode = null; root.hidden = true; };
  const modal = () => mode && !(mode === 'activity' && campaign.current?.mode === 'runner' && campaign.progress(campaign.current.id).card >= campaign.current.cards.length);
  campaign.on(() => { if (mode) render(); hud(); });

  // ---- HUD: act, quest, where to go, the prompt when Dylan stands at the place --------------------------------------
  function hud() {
    const q = campaign.frontier(), act = campaign.act(q);
    $('act').textContent = q ? (act ? act.title : '') : 'Le cycle continue';
    $('quest').textContent = q ? q.title : 'Campagne terminée';
    const id = campaign.nextAction(), kind = id && campaign.kindOf(id);
    const title = !id ? '' : kind === 'duel' ? 'Le Duel des menhirs' : kind === 'activity' ? campaign.data.activities.get(id).title : campaign.action(id).title;
    $('next').textContent = title;
    const done = campaign.data.quests.filter((x) => campaign.questDone(x)).length;
    $('progress').style.width = (done / campaign.data.quests.length * 100) + '%';
  }
  function prompt() {
    const el = $('prompt'), id = campaign.nextAction(), site = campaign.nextSite();
    if (mode || !id || !site || campaign.state.working || !world.near(site)) { el.hidden = true; return; }
    const kind = campaign.kindOf(id);
    el.hidden = false;
    el.querySelector('span').textContent = kind === 'duel' ? 'Défier Aurélien au Grand Menhir' : kind === 'activity' ? campaign.data.activities.get(id).title : campaign.action(id).title;
  }
  function act() {
    const id = campaign.nextAction(), site = campaign.nextSite(); if (mode || !id || !world.near(site)) return;
    const kind = campaign.kindOf(id);
    if (kind === 'duel') { campaign.duel.start(); open('duel'); }
    else if (kind === 'activity') { if (campaign.begin(id)) open('activity'); }
    else campaign.startAction(id);
  }

  // ---- the activity card -----------------------------------------------------------------------------------------------
  const btn = (label, onclick, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + cls; b.innerHTML = label; b.onclick = onclick; return b; };
  function header(a) {
    const actor = campaign.character(a.actor);
    return `<p class="kicker">ISO 45001 · ${esc(a.clause)} · ${esc(MODE_LABEL[a.mode] || a.mode)}${actor ? ' · avec ' + esc(actor.name) : ''}</p><h2>${esc(a.title)}</h2>`;
  }
  function renderActivity() {
    const a = campaign.current;
    if (!a) {   // finished: the outro and what the Carnet now holds
      body.innerHTML = `<p class="kicker">Preuve vérifiée</p><h2>Carnet des Crânes</h2><p class="said">${esc(campaign.feedback)}</p>`;
      body.append(btn('Continuer', close, 'go')); return;
    }
    const p = campaign.progress(a.id), timer = a.duration ? `<p class="timer">${Math.max(0, Math.ceil(a.duration - p.seconds))} s</p>` : '';
    body.innerHTML = header(a) + timer;
    if (campaign.guideOpen()) { body.insertAdjacentHTML('beforeend', `<p class="said">${esc(a.intro || 'Observe, décide, puis vérifie sur le terrain. Les acquis restent conservés si tu t’interromps.')}</p>`); body.append(btn('Commencer', () => campaign.dismissGuide(), 'go'), btn('Plus tard', suspend)); return; }
    if (campaign.timedOut) { body.insertAdjacentHTML('beforeend', `<p class="fb bad">${esc(campaign.feedback)}</p>`); body.append(btn('Reprendre l’essai', () => campaign.retryTimer(), 'go')); return; }
    const fb = campaign.feedback ? `<p class="fb">${esc(campaign.feedback)}</p>` : '';
    if (a.mode === 'allocation') return allocation(a, p, fb);
    if (a.mode === 'assemble') return assemble(a, p, fb);
    if (a.mode === 'differences') return differences(a, p, fb);
    if (p.card >= a.cards.length) {   // modes that hold after the last card
      if (a.mode === 'risk') {
        body.insertAdjacentHTML('beforeend', `<p class="said"><b>Mesure</b> : ${esc(a.measure)}<br><b>Responsable</b> : ${esc(a.responsible || '')}</p>${fb}`);
        if (!p.worked) body.append(btn('Appliquer la mesure sur le terrain', () => campaign.performWork(), 'go'));
        else if (p.workSeconds < 3) body.insertAdjacentHTML('beforeend', `<p class="timer">Mesure en place · contrôle possible dans ${Math.ceil(3 - p.workSeconds)} s</p>`);
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
    card.choices.forEach((c, i) => row.append(btn((a.mode === 'swipe' ? (i === 0 ? '← ' : '→ ') : '') + esc(c), () => campaign.submit(i))));
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
    a.cards.forEach((c, i) => { const done = p.answers.includes(c.id); const b = btn(`${done ? '✓ ' : ''}${esc(c.question)}`, () => campaign.selectTablet(i), done ? 'done' : i === p.card ? 'sel' : ''); b.disabled = done; row.append(b); });
    body.insertAdjacentHTML('beforeend', `<p class="count">Tablettes reliées : ${p.answers.length} / ${a.cards.length}</p>`); body.append(row);
    const card = a.cards[p.card];
    if (card && !p.answers.includes(card.id)) { const ch = document.createElement('div'); ch.className = 'choices'; card.choices.forEach((c, i) => ch.append(btn(esc(c), () => campaign.submit(i)))); body.insertAdjacentHTML('beforeend', `<p class="small">Fonction de la tablette choisie :</p>`); body.append(ch); }
    body.insertAdjacentHTML('beforeend', fb);
    if (p.answers.length >= a.cards.length) body.append(btn('Vérifier l’ensemble du système', () => campaign.confirmAssembly(), 'go'));
    body.append(btn('Interrompre', suspend, 'quiet'));
  }
  function differences(a, p, fb) {
    const st = campaign.differencesStatus();
    body.insertAdjacentHTML('beforeend', `<p class="count">Différences expliquées : ${st.found} / ${a.cards.length} · minimum ${st.minimum} · critiques ${st.critical ? '✓' : '…'} · notions ${st.concepts ? '✓' : '…'}</p>`);
    const grid = document.createElement('div'); grid.className = 'diffs';
    a.cards.forEach((c, i) => { const done = p.answers.includes(c.id); const b = btn(`${done ? '✓' : i + 1} · ${esc(c.question)}`, () => campaign.observe(i), done ? 'done' : p.observed && p.card === i ? 'sel' : ''); b.disabled = done; grid.append(b); });
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
    body.innerHTML = `<p class="kicker">ISO 45001 · 5.1 à 5.4 · Leadership</p><h2>LA POLITIQUE DU MENHIR</h2>`;
    if (s.phase === 'choose') {
      body.insertAdjacentHTML('beforeend', '<p class="said">Mathieu : « Cinq décisions. Les coups seuls ne valident aucune épreuve. »</p>');
      ['Arcade · esquive, garde et décisions', 'Pédagogique · sans attaques automatiques', 'Avec indices · aide visible pour chaque décision'].forEach((l, i) => body.append(btn(l, () => d.choose(i), i === 0 ? 'go' : '')));
      body.append(btn('Plus tard', () => { d.close(); close(); }, 'quiet')); return;
    }
    const pips = s.cleared.map((c) => `<i class="${c ? 'on' : ''}"></i>`).join('');
    body.insertAdjacentHTML('beforeend', `<div class="arena ${s.t - (s.lastBoss ?? -9) < 0.4 ? 'boss' : ''} ${s.t - (s.lastHit ?? -9) < 0.25 ? 'hit' : ''} ${s.t < s.jumpUntil ? 'jump' : ''} ${s.t < s.guardUntil ? 'guard' : ''}">
      <b class="f dylan">Dylan</b><b class="f chief">Aurélien</b></div>
      ${bar('Dylan', s.dylan, 'life')}${bar('Énergie', s.energy, 'energy')}${bar('Aurélien', s.chief, 'chief')}<p class="pips">${pips}</p>
      <p class="banner">${esc(s.banner)}</p><p class="said">${esc(s.caption)}</p>${s.feedback ? `<p class="fb">${esc(s.feedback)}</p>` : ''}`);
    if (s.phase === 'combat') {
      const row = document.createElement('div'); row.className = 'choices';
      row.append(btn('Frapper <kbd>J</kbd>', () => d.attack(false)), btn('Coup de pied <kbd>K</kbd>', () => d.attack(true)), btn('Garde <kbd>L</kbd>', () => d.guard()), btn('Sauter <kbd>Espace</kbd>', () => d.jump()));
      body.append(row);
      const q = btn(d.canQuestion ? 'Répondre à l’épreuve <kbd>E</kbd>' : 'Épreuve dans un instant…', () => d.openQuestion(), 'go'); q.disabled = !d.canQuestion; body.append(q);
    } else if (s.phase === 'question') {
      const q = d.question();
      body.insertAdjacentHTML('beforeend', `<div class="card"><p class="small">${esc(q.clause)} · ${esc(q.title)}</p><p>${esc(q.question)}</p>${s.mode === 2 ? `<p class="small">Indice : ${esc(q.hint)}</p>` : ''}</div>`);
      const row = document.createElement('div'); row.className = 'choices'; q.answers.forEach((a, i) => row.append(btn(esc(a.text), () => d.answer(i)))); body.append(row);
    } else if (s.phase === 'defeat') body.append(btn('Reprendre l’épreuve', () => d.retry(), 'go'));
    else if (s.phase === 'victory') body.append(btn('Continuer', close, 'go'));
    if (s.phase !== 'victory') body.append(btn('Quitter le duel', () => { d.close(); close(); }, 'quiet'));
  }

  // ---- dialogues with choices (the shelter's roof) and the action in progress ----------------------------------------
  function renderDialogue() {
    const dl = campaign.dialogue(); if (!dl) { close(); return; }
    body.innerHTML = `<p class="kicker">${esc(dl.speaker)}</p><h2>${esc(dl.text.split('\n')[0])}</h2>${dl.text.includes('\n') ? `<p class="said">${esc(dl.text.split('\n').slice(1).join('\n'))}</p>` : ''}`;
    for (const c of dl.choices) body.append(btn(esc(c.text), () => campaign.choose(c.id)));
  }

  // ---- screens: the quests and the Carnet des Crânes -----------------------------------------------------------------
  function renderQuests() {
    const f = campaign.frontier();
    body.innerHTML = '<p class="kicker">Écran Quêtes</p><h2>La campagne ISO 45001</h2>';
    for (const q of campaign.data.quests) {
      const done = campaign.questDone(q), now = q === f;
      body.insertAdjacentHTML('beforeend', `<div class="quest ${done ? 'done' : now ? 'now' : 'later'}"><b>${done ? '✓ ' : ''}${esc(q.title)}</b><span>${esc(campaign.act(q)?.title || '')} · ${esc((q.iso || []).join(', '))}</span>${now ? `<p>${esc(q.description)}</p><p class="small">${esc(q.tip || '')}</p>` : ''}</div>`);
    }
    body.append(btn('Fermer', close, 'go'));
  }
  function renderJournal() {
    const ev = campaign.state.evidence;
    body.innerHTML = `<p class="kicker">Écran Codex</p><h2>Le Carnet des Crânes</h2><p class="count">${ev.length} preuves · ${ev.filter((e) => e.stage === 3).length} vérifiées</p>`;
    if (!ev.length) body.insertAdjacentHTML('beforeend', '<p class="said">Les preuves apparaîtront ici au fil des activités : découvertes, décidées, réalisées puis vérifiées.</p>');
    for (const e of ev.slice().reverse()) body.insertAdjacentHTML('beforeend', `<details class="ev"><summary><b>${esc(e.name)}</b> <span>${esc(e.clause || '')} · ${STAGES[e.stage] || ''}</span></summary><p class="small">${esc(e.result)}</p></details>`);
    body.append(btn('Fermer', close, 'go'));
  }

  function render() {
    root.classList.toggle('runner', mode === 'activity' && !modal());
    if (mode === 'activity') renderActivity(); else if (mode === 'duel') renderDuel(); else if (mode === 'dialogue') renderDialogue();
    else if (mode === 'quest') renderQuests(); else if (mode === 'journal') renderJournal();
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
    if (k === 'Escape' && mode && mode !== 'dialogue') { if (mode === 'activity') suspend(); else if (mode === 'duel') { campaign.duel.close(); close(); } else close(); return; }
    if (modal() && /^(Key[WASD]|Arrow)/.test(k)) e.stopImmediatePropagation();
  }, true);
  $('prompt').onclick = act;
  $('btn-quests').onclick = () => open('quest');
  $('btn-journal').onclick = () => open('journal');

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
      if ((refresh += dt) > 0.3) { refresh = 0; if ((mode === 'activity' && (a?.mode === 'risk' || a?.duration)) || (mode === 'duel' && campaign.duel.s?.phase === 'combat')) render(); }
      prompt();
    },
    open, close, act, get mode() { return mode; },
  };
}

// THALEOLITHIC papier : les cinématiques du jeu Unity (UngaBungaCampaign.json, C01, C02, C03, C06), rejouées dans le
// village de papier. Les répliques sont celles du jeu, lues telles quelles ; la mise en scène suit leurs résumés : des
// plans où la caméra glisse, des bandes de papier en haut et en bas, le titre en lettres découpées, une feuille de
// sous-titres, des acteurs qui jouent (un porteur qui tombe, Brok qui reprend son poste), la pluie de la métamorphose,
// la roue qui roule. Chaque cinématique se joue une fois (mémorisée avec la partie) ; Échap ou « Passer » l'abrège.
import { clean } from './ui.js';
import { cutLetters } from './paper-ui.js';
import { voiceOf } from './talk.js';

// where the cameras look: [x, z, distance] from, to; how long; who speaks (the line index in the shots of the data)
const SCRIPTS = {
  C01: [
    { from: [-4, -44, 52], to: [0, -24, 46], dur: 7.5, line: 0, at: (c) => c.sfx?.play('stinger') },
    { from: [-2, -12, 26], to: [-4, -10, 18], dur: 5.5, line: 1, act: (c) => c.face('aurelien') },
    { from: [-14, -1, 18], to: [-15.5, -0.5, 14], dur: 6, line: 2, act: (c) => c.stumble('brok') },
  ],
  C02: [
    { from: [-17, 2, 22], to: [-15, -2.5, 15], dur: 5, line: 0, at: (c) => c.sfx?.play('quest') },
    { from: [-15, -2.5, 15], to: [-16, -3.5, 13], dur: 5, line: null, act: (c) => c.walk('brok', [-15.2, -3.8]) },
  ],
  C03: [
    { from: [0, -8, 64], to: [1, -9, 56], dur: 9, line: null, at: (c) => { c.rain(40); c.sfx?.play('thunder'); } },
    { from: [-6, -10, 20], to: [-5.8, -11.4, 14], dur: 6, line: 0, act: (c) => c.face('aurelien') },
    { from: [-5.8, -11.4, 14], to: [-5.4, -12, 12], dur: 6, line: 1, act: (c) => c.face('lorette') },
  ],
  C06: [
    { from: [-6, 7, 22], to: [-7, 9, 15], dur: 6, line: 0, at: (c) => c.sfx?.play('rumble', { dur: 4 }) },
    { from: [-7, 9, 15], to: [-6, 8, 15], dur: 6, line: 1 },
    { from: [-6, 8, 15], to: [-6.5, 8.5, 13], dur: 5, line: 2 },
    { from: [-4, 2, 30], to: [0, -8, 84], dur: 9, line: 3, at: (c) => c.sfx?.play('ending') },
  ],
};
const ease = (u) => u * u * (3 - 2 * u);

export function createCinema({ campaign, world, ui, sfx, data, menhir = { questions: [] } }) {
  const $ = (id) => document.getElementById(id), root = $('cine'), who = $('cine-who'), line = $('cine-line'), title = $('cine-title');
  const shots = Object.fromEntries((data.cinematics || []).map((c) => [c.id, c]));
  let run = null; const queue = [];   // a cinematic asked while another plays waits its turn
  // two of our own, in the same grammar: the dwellings that change (built from the swaps the village schedules, same
  // order and times) and the Grand Menhir engraved with the duel's five decisions (their lines from MenhirDuel.json)
  const KIND = { hut: 'la hutte de peau', wattle: 'la charpente de clayonnage', torchis: 'la maison de torchis' };
  const up = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const custom = {}; let waitDuel = false;   // the engraving waits for the duel's victory sheet to be closed
  function tour(swaps) {
    if (!swaps.length) return;
    const lines = swaps.map((w) => ({ speaker: w.chief ? 'La maison du chef' : '', subtitle: w.from ? `${up(KIND[w.from])} se rabat, ${KIND[w.to] || 'rien'} se lève à sa place.` : `${up(KIND[w.to])} se lève.` }));
    const spec = [{ from: [0, -8, 52], to: [swaps[0].x, swaps[0].z - 0.5, 16], dur: Math.max(0.6, swaps[0].at - 0.2), line: null, at: (c) => c.sfx?.play('stinger') }];
    swaps.forEach((w, k) => { const nx = swaps[k + 1]; spec.push({ from: [w.x, w.z - 0.5, 16], to: [w.x + 0.4, w.z - 0.8, 14], dur: nx ? nx.at - w.at : 3.2, line: k }); });
    custom.TOUR = { title: 'Le village se transforme', shots: lines, spec: [...spec, { from: [swaps.at(-1).x, swaps.at(-1).z, 14], to: [0, -8, 56], dur: 3.5, line: null }] };
    start('TOUR');
  }
  const Q = menhir.questions || [];
  custom.GRAVURE = { title: 'Le menhir est gravé', shots: [...Q.map((q) => ({ speaker: `${q.clause} ${q.title}`, subtitle: (q.answers.find((a) => a.quality === 2) || {}).text || '' })), { speaker: '', subtitle: 'La politique de la tribu est gravée dans la pierre, à la vue de tous.' }],
    spec: [{ from: [0, -15, 26, 3], to: [0, -21.5, 14, 4], dur: 2.6, line: null, at: () => { world.engraving.cine = true; world.engraving.hideAll(); sfx?.play('stinger'); const o = world.people.nork; if (o && !o.dying) { o.busy = true; o.target = [-1.6, -21.2]; } } },
      ...Q.map((_, k) => ({ pin: k, from: [-0.7, 0, 8.6], to: [-0.45, 0, 7.6], dur: 3.4, line: k, at: () => world.engraving.show(k, true, 2.9) })),   // on the stone where it is cut, Ouways at work on his ladder
      { from: [0, -22, 13, 4.5], to: [0, -20, 22, 4.5], dur: 3.5, line: Q.length, at: () => sfx?.play('chant', { dur: 1.6 }) }] };
  // an accident of the Unity game (AccidentDirector), in five shots: the warning, the walk in and what goes wrong, the
  // chief's punchline, the reply; a villager is then laid in the cemetery; Dylan gets the death screen
  function accident(acc) {
    const spec = campaign.accident(acc.id); if (!spec) return;
    const name = campaign.nameOf(acc.victim), [x, z] = world.accident.spotOf(spec), C = world.SITES.cimetiere;
    const lines = [{ speaker: 'Mathieu', subtitle: spec.warning }, { speaker: '', subtitle: `${spec.danger} ${name} y va quand même.` }, { speaker: spec.speaker || 'Aurélien', subtitle: spec.punchline }, { speaker: 'Mathieu', subtitle: spec.reply }];
    const sp = [
      { from: [x - 3, z + 9, 26], to: [x - 1.4, z + 3, 17], dur: 3.4, line: 0, at: () => { world.accident.begin(spec, acc.victim); sfx?.play('stinger'); } },
      { from: [x - 1.4, z + 2.4, spec.kind === 'mammoth' ? 18 : 14], to: [x - 0.6, z + 1.6, spec.kind === 'mammoth' ? 16 : 12], dur: spec.kind === 'river' ? 4.2 : spec.kind === 'fire' ? 3.6 : 3.2, line: 1, at: () => world.accident.strike() },
      { from: [x + 0.6, z + 1.2, 11], to: [x + 0.8, z + 2.4, 15], dur: 3.8, line: 2 },
      { from: [x + 0.8, z + 2.4, 15], to: [x, z + 4, 20], dur: 3.4, line: 3 },
    ];
    if (acc.victim !== 'dylan') { lines.push({ speaker: '', subtitle: `${name} repose désormais au cimetière du village. Une enquête est ouverte auprès de Mathieu.` }); sp.push({ from: [C.x - 2, C.z + 4, 16], to: [C.x, C.z + 1, 12], dur: 4.2, line: 4, at: () => { campaign.markPlayed(); sfx?.play('chant', { dur: 1.8, root: 'A2' }); } }); }
    custom.ACC = { title: spec.title, shots: lines, spec: sp };
    start('ACC');
  }
  const ctl = {
    sfx,
    face(id) { const p = world.people[id]; if (p) { p.h.group.rotation.z = 0.12; setTimeout(() => { p.h.group.rotation.z = 0; }, 260); } },
    walk(id, to) { const p = world.people[id]; if (p) { p.busy = true; p.target = to; } },
    // the porter falls into the... : he trips, falls flat on his face, gets up again
    stumble(id) { const p = world.people[id]; if (!p) return; p.busy = true; p.target = [p.x + 2.2, p.z + 0.4]; setTimeout(() => { p.target = null; p.h.set(0, 0); sfx?.play('log'); sfx?.play('crumple', { v: 0.25 }); }, 700); setTimeout(() => { p.h.set(1, 0); }, 3200); },
    rain(sec) { world.weather.forced = 1; world.weather.metamorph = sec; setTimeout(() => { world.weather.forced = null; }, sec * 1000); },
  };
  // a close shot on the stone wants it sharp from top to bottom: the lens's band widens for the cinematic
  let lens0 = null;
  const sharpen = (on) => { const P = world.H.post; if (!P) return; if (on && !lens0) { lens0 = { focusBand: P.o.focusBand, maxBlur: P.o.maxBlur }; Object.assign(P.o, { focusBand: 0.85, maxBlur: 5 }); P.apply(); } else if (!on && lens0) { Object.assign(P.o, lens0); lens0 = null; P.apply(); } };
  function start(id) {
    const cu = custom[id], spec = cu ? cu.spec : SCRIPTS[id], c = cu || shots[id]; if (!spec || !c) return false;
    if (run) { if (run.id !== id && !queue.includes(id)) queue.push(id); return true; }
    if (id !== 'ACC') campaign.state.flags['cine:' + id] = true;
    ui.close(); document.body.classList.add('cine-on'); root.hidden = false; root.classList.remove('out'); void root.offsetWidth; root.classList.add('in');
    title.textContent = clean(c.title); const n = title.textContent.length; title.style.fontSize = n > 44 ? 'clamp(15px, 2.1vw, 25px)' : n > 30 ? 'clamp(17px, 2.6vw, 30px)' : ''; delete title.dataset.cut; cutLetters(title, { chips: true });   // a long title (the accidents') stays on one band
    if (id === 'GRAVURE') sharpen(true);
    run = { id, spec, c, k: -1, t: 0 }; next(); return true;
  }
  function next() {
    run.k++; run.t = 0; const sh = run.spec[run.k];
    if (!sh) return stop();
    const L = sh.line != null ? run.c.shots[sh.line] : null;
    who.textContent = L ? clean(L.speaker || 'Le narrateur') : '';
    if (L) world.talk?.say(line, clean(L.subtitle), { voice: voiceOf(L.speaker || 'narrateur', campaign.data.characters), fit: Math.max(1.2, sh.dur - 0.7) }); else { world.talk?.stop(line); line.textContent = ''; }
    root.classList.toggle('narrator', !!L && !L.speaker); root.querySelector('.sub').hidden = !L;
    sh.at?.(ctl); sh.act?.(ctl);
  }
  function stop() {
    if (!run) return; if (run.id === 'ACC') { campaign.markPlayed(); setTimeout(() => ui.open('death'), 0); }
    if (run.id === 'GRAVURE') { world.engraving.cine = false; world.engraving.release(); world.engraving.showAll(false); } sharpen(false); run = null; root.classList.remove('in'); root.classList.add('out');
    setTimeout(() => { if (run) return; root.hidden = true; root.classList.remove('out'); document.body.classList.remove('cine-on'); }, 450);   // unless another began
    for (const p of Object.values(world.people)) if (p.busy && !p.dying) { p.busy = false; p.target = p.home.slice(); }
    world.H.unlook();
    if (queue.length) start(queue.shift());
  }
  addEventListener('keydown', (e) => { if (!run) return; if (e.code === 'Escape') stop(); else if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat && !world.talk?.skip()) stop(); e.stopImmediatePropagation(); e.preventDefault(); }, true);   // Enter finishes the line, then skips
  $('cine-skip').onclick = stop;
  return {
    start, stop, tour, accident, get playing() { return !!run; },
    step(dt) {
      if (waitDuel && ui.mode !== 'duel') { waitDuel = false; start('GRAVURE'); }
      if (!run) return; const sh = run.spec[run.k]; run.t += dt;
      const u = ease(Math.min(1, run.t / sh.dur)), at = sh.from.map((v, i) => v + (sh.to[i] - v) * u);
      if (sh.pin != null) { const c = world.engraving.cards[sh.pin], w = c.getWorldPosition(c.userData.wp ??= c.position.clone()); world.H.look(w.x + at[0], w.z + at[1], at[2], w.y); }
      else world.H.look(at[0], at[1], at[2], at[3]);
      if (run.t >= sh.dur) next();
    },
    // which cinematic a change of the campaign calls for: the opening on a new game, then after these quests
    after(questId) { const id = { M_II_ROLES: 'GRAVURE', V17_RISKS: 'C02', V17_OPERATIONS: 'C03', V17_IMPROVEMENT: 'C06' }[questId]; if (!id || campaign.state.flags['cine:' + id]) return; if (id === 'GRAVURE' && ui.mode === 'duel') { waitDuel = true; world.engraving.cine = true; return; } start(id); },
  };
}

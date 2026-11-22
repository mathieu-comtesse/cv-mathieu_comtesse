// THALEOLITHIC papier : les cinématiques du jeu Unity (UngaBungaCampaign.json, C01, C02, C03, C06), rejouées dans le
// village de papier. Les répliques sont celles du jeu, lues telles quelles ; la mise en scène suit leurs résumés : des
// plans où la caméra glisse, des bandes de papier en haut et en bas, le titre en lettres découpées, une feuille de
// sous-titres, des acteurs qui jouent (un porteur qui tombe, Brok qui reprend son poste), la pluie de la métamorphose,
// la roue qui roule. Chaque cinématique se joue une fois (mémorisée avec la partie) ; Échap ou « Passer » l'abrège.
import { clean } from './ui.js';
import { cutLetters } from './paper-ui.js';

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

export function createCinema({ campaign, world, ui, sfx, data }) {
  const $ = (id) => document.getElementById(id), root = $('cine'), who = $('cine-who'), line = $('cine-line'), title = $('cine-title');
  const shots = Object.fromEntries((data.cinematics || []).map((c) => [c.id, c]));
  let run = null; const queue = [];   // a cinematic asked while another plays waits its turn
  const ctl = {
    sfx,
    face(id) { const p = world.people[id]; if (p) { p.h.group.rotation.z = 0.12; setTimeout(() => { p.h.group.rotation.z = 0; }, 260); } },
    walk(id, to) { const p = world.people[id]; if (p) { p.busy = true; p.target = to; } },
    // the porter falls into the... : he trips, falls flat on his face, gets up again
    stumble(id) { const p = world.people[id]; if (!p) return; p.busy = true; p.target = [p.x + 2.2, p.z + 0.4]; setTimeout(() => { p.target = null; p.h.set(0, 0); sfx?.play('log'); sfx?.play('crumple', { v: 0.25 }); }, 700); setTimeout(() => { p.h.set(1, 0); }, 3200); },
    rain(sec) { world.weather.forced = 1; world.weather.metamorph = sec; setTimeout(() => { world.weather.forced = null; }, sec * 1000); },
  };
  function start(id) {
    const spec = SCRIPTS[id], c = shots[id]; if (!spec || !c) return false;
    if (run) { if (run.id !== id && !queue.includes(id)) queue.push(id); return true; }
    campaign.state.flags['cine:' + id] = true;
    ui.close(); document.body.classList.add('cine-on'); root.hidden = false; root.classList.remove('out'); void root.offsetWidth; root.classList.add('in');
    title.textContent = clean(c.title); delete title.dataset.cut; cutLetters(title, { chips: true });
    run = { id, spec, c, k: -1, t: 0 }; next(); return true;
  }
  function next() {
    run.k++; run.t = 0; const sh = run.spec[run.k];
    if (!sh) return stop();
    const L = sh.line != null ? run.c.shots[sh.line] : null;
    who.textContent = L ? clean(L.speaker || 'Le narrateur') : ''; line.textContent = L ? clean(L.subtitle) : '';
    root.classList.toggle('narrator', !!L && !L.speaker); root.querySelector('.sub').hidden = !L;
    sh.at?.(ctl); sh.act?.(ctl);
  }
  function stop() {
    if (!run) return; run = null; root.classList.remove('in'); root.classList.add('out');
    setTimeout(() => { if (run) return; root.hidden = true; root.classList.remove('out'); document.body.classList.remove('cine-on'); }, 450);   // unless another began
    for (const p of Object.values(world.people)) if (p.busy && !p.dying) { p.busy = false; p.target = p.home.slice(); }
    world.H.unlook();
    if (queue.length) start(queue.shift());
  }
  addEventListener('keydown', (e) => { if (!run) return; if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') stop(); e.stopImmediatePropagation(); e.preventDefault(); }, true);
  $('cine-skip').onclick = stop;
  return {
    start, stop, get playing() { return !!run; },
    step(dt) {
      if (!run) return; const sh = run.spec[run.k]; run.t += dt;
      const u = ease(Math.min(1, run.t / sh.dur)), at = sh.from.map((v, i) => v + (sh.to[i] - v) * u);
      world.H.look(at[0], at[1], at[2]);
      if (run.t >= sh.dur) next();
    },
    // which cinematic a change of the campaign calls for: the opening on a new game, then after these quests
    after(questId) { const id = { V17_RISKS: 'C02', V17_OPERATIONS: 'C03', V17_IMPROVEMENT: 'C06' }[questId]; if (id && !campaign.state.flags['cine:' + id]) start(id); },
  };
}

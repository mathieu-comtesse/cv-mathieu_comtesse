// THALEOLITHIC papier : la faune hors du camp. Dylan peut franchir la palissade ; dehors vivent les bêtes du cénozoïque,
// chacune avec son rôle : les prédateurs (smilodons, loups, lion, ours) le repèrent, le traquent puis le chassent, et
// lâchent prise s'il s'éloigne assez ; les grands herbivores (mammouths, rhinocéros laineux, aurochs, mégathérium,
// diprotodon, glyptothérium, gastornis) l'avertissent puis chargent par peur, plus vite s'il approche de leurs petits ;
// l'harpagornis tourne dans le ciel et pique ; le sarcosuchus guette sous l'eau de la rivière ; les autres fuient.
// Aucune bête n'entre dans le camp. Une attaque qui touche Dylan devient un accident du jeu (cinématique, analyse, reprise).

const ROLE = {
  smilodon: { role: 'predator', speed: 1.5, run: 6.4, detect: 19, leash: 34 }, wolf: { role: 'predator', speed: 1.6, run: 6.2, detect: 18, leash: 32 },
  lion: { role: 'predator', speed: 1.3, run: 6.6, detect: 16, leash: 28 }, bear: { role: 'predator', speed: 1.1, run: 5.4, detect: 13, leash: 22 },
  harpagornis: { role: 'flyer', speed: 2.2, run: 9, detect: 17, leash: 34 }, sarcosuchus: { role: 'lurker', speed: 0.4, run: 7, detect: 4.6, leash: 3 },
  mammoth: { role: 'defender', speed: 0.6, run: 6.6, warn: 5, young: 8, leash: 12 }, rhino: { role: 'defender', speed: 0.6, run: 6.8, warn: 4.5, young: 7, leash: 10 },
  aurochs: { role: 'defender', speed: 0.7, run: 6.8, warn: 4.2, young: 7, leash: 12 }, megatherium: { role: 'defender', speed: 0.35, run: 4.4, warn: 3.4, young: 5, leash: 8 },
  diprotodon: { role: 'defender', speed: 0.5, run: 5.5, warn: 3.8, young: 6, leash: 10 }, glyptotherium: { role: 'defender', speed: 0.35, run: 4.0, warn: 3.0, young: 5, leash: 8 },
  gastornis: { role: 'predator', speed: 1.2, run: 6.8, detect: 16, leash: 26 },   // the terror bird hunts
  megaloceros: { role: 'shy', speed: 0.8, run: 7.5, flee: 9, leash: 14 }, horse: { role: 'shy', speed: 0.9, run: 8, flee: 10, leash: 14 }, archaeoindris: { role: 'shy', speed: 0.5, run: 4, flee: 6, leash: 8 },
  canariomys: { role: 'shy', speed: 0.7, run: 4, flee: 4, leash: 6 }, castoroides: { role: 'shy', speed: 0.4, run: 3, flee: 4, leash: 5 }, hare: { role: 'shy', speed: 1.0, run: 7, flee: 6, leash: 9 },
  tortoise: { role: 'shy', speed: 0.15, run: 0.25, flee: 2, leash: 3 }, hyracotherium: { role: 'shy', speed: 0.8, run: 6, flee: 7, leash: 10 },
};
// who lives where (outside the stakes, to the mountains' feet, and beyond the river for whoever wades it), with their young
export const WILD = [
  ['smilodon', [[-38, -30], [-31, -41], [-52, -12], [46, -40]]], ['wolf', [[-37, 4], [-39.5, 6.5], [-35.5, 8], [-48, -46], [-45, -49], [50, 20], [53, 23]]], ['lion', [[-11, -38], [-50, 26], [44, -6]]], ['bear', [[29, -36], [-30, -50], [52, -28]]],
  ['harpagornis', [[-20, -40], [12, -42], [-46, 16], [46, 6]]], ['sarcosuchus', [[33.2, -18], [31.4, 1], [35.5, -38], [29.5, 24]]],
  ['mammoth', [[-20, -37], [-14, -39], [6, -44], [-2, -50]], 1], ['rhino', [[-28, -33], [48, -48]], 1], ['aurochs', [[-36, -19], [-38.5, -15.5], [-34, -23]], 1], ['megatherium', [[-42, -6], [-54, 4]]],
  ['diprotodon', [[16, -44], [50, -16]], 1], ['glyptotherium', [[-24, 21], [-46, 30]], 1], ['gastornis', [[-42, 13], [-31, 19], [-14, 29], [16, 30], [44, 30]]],
  ['megaloceros', [[39, -26], [41, -21]], 1], ['horse', [[37, 4], [39.5, 7], [36.5, 9.5]], 1], ['archaeoindris', [[-44, -21]]],
  ['canariomys', [[-26, 14], [10, 22], [-6, -41], [24, -42]]], ['castoroides', [[28.6, -24], [27.8, 13]]], ['hare', [[-12, 20], [8, 18], [-44, -34], [20, -45], [-55, -40], [55, 0]]],
  ['tortoise', [[-16, 23], [14, 24]]], ['hyracotherium', [[-6, 23], [-3, 24.5], [-8.5, 24.5]], 1],
];
export const ROLE_OF = (kind) => ROLE[kind]?.role;

export function createWild({ H, world, campaign, cinema, popup, beast, ovalE, riverDist, onAttack }) {
  const agents = [];
  for (const [kind, homes, young] of WILD) homes.forEach(([x, z], k) => {
    const R = ROLE[kind], h = popup(...beast(kind, k), { x, z, scale: kind === 'canariomys' || kind === 'hare' ? 0.8 : 1 });
    const a = { kind, ...R, h, x, z, home: [x, z], tx: x, tz: z, face: 1, ph: Math.random() * 6, t: Math.random() * 4, state: 'roam', y: 0, seed: agents.length };
    if (R.role === 'flyer') { a.ang = Math.random() * 6.283; a.y = 9; }
    agents.push(a);
    if (young && k === 0) { const yh = popup(...beast(kind, k + 1), { x: x + 1.5, z: z + 0.8, scale: 0.5 }); agents.push({ kind, role: 'young', parent: a, h: yh, x: x + 1.5, z: z + 0.8, face: 1, ph: 0, off: [1.6, 0.9], speed: R.speed, run: R.run }); a.child = agents[agents.length - 1]; }
  });
  const outside = (x, z) => ovalE(x, z) > 1.14;
  const pick = (a) => { for (let i = 0; i < 8; i++) { const an = Math.random() * 6.283, r = Math.random() * a.leash * 0.5, x = a.home[0] + Math.cos(an) * r, z = a.home[1] + Math.sin(an) * r; if (outside(x, z) && (a.role === 'lurker' ? riverDist(x, z) < 1.2 : riverDist(x, z) > 3.4)) return [x, z]; } return a.home.slice(); };
  const sx = () => H.sfx;
  let freeze = 0;
  function moveTo(a, x, z, sp, dt) {
    const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz); if (d < 0.05) return d;
    const st = Math.min(d, sp * dt), nx = a.x + dx / d * st, nz = a.z + dz / d * st;
    if (!outside(nx, nz) && a.role !== 'flyer') return d;   // the stakes are a line no beast crosses
    if (a.role !== 'flyer' && a.role !== 'lurker' && riverDist(nx, nz) < 2.8) return d;
    if (a.role === 'lurker' && a.state === 'hunt' && riverDist(nx, nz) > 2.4) return d;   // it hunts in the water only
    a.x = nx; a.z = nz; a.ph += st * 2.2; if (Math.abs(dx) > 0.05) a.face = Math.sign(dx); return d;
  }
  function step(t, dt) {
    const hp = H.hero.group.position, out = ovalE(hp.x, hp.z) > 1.03, busy = cinema.playing || !!campaign.state.accident;
    if (busy) freeze = 1.5; else freeze = Math.max(0, freeze - dt);
    for (const a of agents) {
      if (a.held) continue;
      const dh = Math.hypot(hp.x - a.x, hp.z - a.z), live = !busy && freeze <= 0 && out;
      a.t -= dt; let sp = a.speed;
      if (a.role === 'young') { const p = a.parent, gx = p.x + a.off[0] * -p.face, gz = p.z + a.off[1]; moveTo(a, gx, gz, Math.max(a.speed, Math.hypot(gx - a.x, gz - a.z) * 1.6), dt); }
      else if (a.role === 'predator') {
        const fromHome = Math.hypot(a.x - a.home[0], a.z - a.home[1]);
        if (a.state === 'roam' && live && dh < a.detect) { a.state = 'stalk'; sx()?.play('grunt', { f0: 70, dur: 0.6, vowel: 'o', rough: 0.9, v: 0.25, bend: -0.2 }); }
        if (a.state === 'stalk' || a.state === 'chase') {
          if (!live || dh > a.detect * 1.7 || fromHome > a.leash) a.state = 'back';
          else { if (a.state === 'stalk' && dh < a.detect * 0.6) { a.state = 'chase'; sx()?.play('grunt', { f0: 95, dur: 0.5, vowel: 'a', rough: 1, v: 0.3, bend: 0.3 }); } sp = a.state === 'chase' ? a.run : a.run * 0.45; moveTo(a, hp.x, hp.z, sp, dt); if (dh < 1.3) { onAttack(a, 'beast'); a.state = 'back'; } }
        }
        if (a.state === 'back') { if (moveTo(a, a.home[0], a.home[1], a.run * 0.5, dt) < 0.5) a.state = 'roam'; }
      } else if (a.role === 'defender') {
        const near = a.child ? Math.hypot(hp.x - a.child.x, hp.z - a.child.z) : 99, R = Math.min(a.warn + (near < a.young ? 2 : 0), 9);
        if (a.state === 'roam' && live && (dh < R || near < a.young * 0.6)) { a.state = 'warn'; a.t = 1.2; sx()?.play(a.kind === 'mammoth' ? 'trumpet' : 'horn', { f: 70, dur: 0.6, v: 0.25 }); }
        if (a.state === 'warn') { a.face = Math.sign(hp.x - a.x) || a.face; if (!live || dh > R * 1.8) a.state = 'roam'; else if (a.t <= 0) { a.state = 'charge'; a.cx = hp.x; a.cz = hp.z; sx()?.play('rumble', { dur: 1.2 }); } }
        if (a.state === 'charge') { const d = moveTo(a, a.cx + (a.cx - a.x) * 0.2, a.cz + (a.cz - a.z) * 0.2, a.run, dt); if (live && dh < 1.7) { onAttack(a, 'trample'); a.state = 'back'; } else if (d < 0.6 || !live) { a.state = 'back'; } }
        if (a.state === 'back') { if (moveTo(a, a.home[0], a.home[1], a.speed * 2, dt) < 0.6) a.state = 'roam'; }
      } else if (a.role === 'shy') {
        if (dh < a.flee) { const ax = a.x - hp.x, az = a.z - hp.z, l = Math.hypot(ax, az) || 1; moveTo(a, a.x + ax / l * 3, a.z + az / l * 3, a.run, dt); a.state = 'flee'; }
        else if (a.state === 'flee') { a.state = 'roam'; a.t = 2; }
      } else if (a.role === 'flyer') {
        if (a.state === 'roam') { a.ang += dt * 0.35; const cx = a.home[0] + Math.cos(a.ang) * 7, cz = a.home[1] + Math.sin(a.ang) * 5; a.face = Math.sign(-Math.sin(a.ang)) || 1; a.x = cx; a.z = cz; a.y = 9 + Math.sin(t * 0.7 + a.seed) * 0.8; if (live && dh < a.detect) { a.state = 'dive'; a.t = 3; sx()?.play('whoosh', { from: 1600, to: 300, dur: 1.2, v: 0.35 }); } }
        else if (a.state === 'dive') { moveTo(a, hp.x, hp.z, a.run, dt); a.y = Math.max(1.4, a.y - dt * 6); if (dh < 1.4 && a.y < 2.2 && live) { onAttack(a, 'beast'); a.state = 'climb'; } else if (a.t <= 0 || !live) a.state = 'climb'; }
        else { a.y = Math.min(9, a.y + dt * 4); moveTo(a, a.home[0], a.home[1], a.speed * 2, dt); if (a.y >= 9) a.state = 'roam'; }
      } else if (a.role === 'lurker') {
        // on the bank it waits for a careless step; Dylan in the water is heard from far off: it glides to him, eyes
        // just above the surface, and lunges once close
        const wet = riverDist(hp.x, hp.z) < 2.8;
        if (a.state !== 'lunge' && live && dh < a.detect) { a.state = 'lunge'; a.t = 0.9; sx()?.play('whoosh', { from: 200, to: 900, dur: 0.4, v: 0.4 }); }
        else if (a.state !== 'lunge' && a.state !== 'hunt' && live && wet && dh < 20) { a.state = 'hunt'; sx()?.play('grunt', { f0: 70, dur: 0.6, vowel: 'o', rough: 1, v: 0.25, bend: -0.2 }); }
        if (a.state === 'hunt') { moveTo(a, hp.x, hp.z, 2.6, dt); a.y = -0.22 + 0.04 * Math.sin(t * 3 + a.seed); if (!wet || !live) a.state = 'sink'; }
        else if (a.state === 'lunge') { moveTo(a, hp.x, hp.z, a.run, dt); a.y = Math.min(0.2, a.y + dt * 2); if (dh < 1.6 && live) { onAttack(a, 'beast'); a.state = 'sink'; } else if (a.t <= 0) a.state = 'sink'; }
        else { a.y = -0.45 + 0.06 * Math.sin(t * 0.8 + a.seed); if (a.state === 'sink' && moveTo(a, a.home[0], a.home[1], 1.2, dt) < 0.3) a.state = 'roam'; }
      }
      if (a.state === 'roam' && a.role !== 'young' && a.role !== 'flyer') { if (a.t <= 0) { a.t = 3 + Math.random() * 6; [a.tx, a.tz] = pick(a); } moveTo(a, a.tx, a.tz, a.speed, dt); }
      // the card: it hops and rocks as it goes, turns (never edge-on), flies or lurks at its height
      const g = a.h.group, moving = a.state !== 'roam' || Math.hypot(a.tx - a.x, a.tz - a.z) > 0.1;
      g.position.set(a.x, (a.y || 0) + (moving && a.role !== 'flyer' && a.role !== 'lurker' ? 0.08 * Math.abs(Math.sin(a.ph)) : 0), a.z);
      g.rotation.z = a.role === 'flyer' ? 0.15 * Math.sin(t * 2 + a.seed) : moving ? 0.05 * Math.sin(a.ph) : 0;
      if (a.h.pivot) a.h.pivot.scale.x += ((a.face || 1) - a.h.pivot.scale.x) * Math.min(1, dt * 10), Math.abs(a.h.pivot.scale.x) < 0.3 && (a.h.pivot.scale.x = (a.face || 1) * 0.3);
    }
  }
  return { agents, step };
}

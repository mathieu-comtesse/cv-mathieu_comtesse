/* Mise en scène du personnage : il marche (Walk_Loop) en contournant les meubles, entre dans l'activité (assis, debout, à genoux),
 * peut être saisi à la souris et reposé n'importe où, et pense à ce qu'il va faire. Tout passe par une file d'étapes simples :
 *   walk (suivre des points) · face (se tourner) · glide (se déplacer en douceur, avec une animation) · fn (appeler) · wait. */
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

export function createDirector({ hero, ritual, nav, floorY, ui, speed = 0.9 }) {
  const g = hero.group, pos = g.position;
  let steps = [], step = null, cur = null, mode = 'idle', carryTo = null;
  const api = {
    get mode() { return mode; }, get current() { return cur; },
    walk: (pts) => ({ k: 'walk', pts: pts.map((p) => [p[0], p[1]]) }),
    face: (yaw) => ({ k: 'face', yaw }),
    glide: (x, z, y, yaw, dur = 0.5, clip = null) => ({ k: 'glide', x, z, y, yaw, dur, clip }),
    fn: (fn) => ({ k: 'fn', fn }),
    wait: (t) => ({ k: 'wait', wait: t }),
  };

  function idle() { hero.stop(); hero.play('Idle_Loop', { fade: 0.2 }); hero.setBase('neutral'); hero.talk(false); hero.setOverride(null); hero.setShujaatPose?.(null); hero.can.visible = false; }
  function clearActivity() {
    if (!cur) return;
    const rit = cur.ritual; ritual.stop(); hero.setPost(null); hero.setShoes(!rit); hero.can.visible = false; hero.setOverride(null); hero.setShujaatPose?.(null); hero.talk(false);
    ui.rain(false); ui.music(false, cur);
    cur = null;
  }
  function start(s) {
    s.t = 0;
    if (s.k === 'walk') { hero.play('Walk_Loop', { fade: 0.2, speed: speed / 0.55 }); mode = 'walk'; }
    else if (s.k === 'glide') { s.from = { x: pos.x, y: pos.y, z: pos.z, yaw: g.rotation.y }; if (s.clip) hero.play(s.clip, { fade: 0.2 }); }
    else if (s.k === 'face' && !s.walkAnim) { if (mode === 'walk') { hero.play('Idle_Loop', { fade: 0.15 }); mode = 'turn'; } }
    if (s.k === 'fn') s.fn();
  }
  function tick(s, dt) {
    if (s.k === 'fn') return true;
    if (s.k === 'wait') { s.t += dt; return s.t >= s.wait; }
    if (s.k === 'face') {
      const d = angDiff(g.rotation.y, s.yaw);
      if (Math.abs(d) < 0.04) { g.rotation.y = s.yaw; return true; }
      g.rotation.y += Math.sign(d) * Math.min(Math.abs(d), dt * 7); return false;
    }
    if (s.k === 'glide') {
      s.t += dt; const u = Math.min(1, s.t / s.dur), e = u * u * (3 - 2 * u);
      pos.x = s.from.x + (s.x - s.from.x) * e; pos.z = s.from.z + (s.z - s.from.z) * e; pos.y = s.from.y + (s.y - s.from.y) * e;
      g.rotation.y = s.from.yaw + angDiff(s.from.yaw, s.yaw) * e;
      return u >= 1;
    }
    if (s.k === 'walk') {
      let left = speed * dt;
      while (left > 0 && s.pts.length) {
        const p = s.pts[0], dx = p[0] - pos.x, dz = p[1] - pos.z, d = Math.hypot(dx, dz);
        if (d < 1e-4) { s.pts.shift(); continue; }
        const m = Math.min(left, d); pos.x += dx / d * m; pos.z += dz / d * m; left -= m;
        const want = Math.atan2(dx, dz), da = angDiff(g.rotation.y, want);
        g.rotation.y += Math.sign(da) * Math.min(Math.abs(da), dt * 9);
        if (m >= d - 1e-6) s.pts.shift();
      }
      pos.y += (floorY(pos.x, pos.z) - pos.y) * (1 - Math.exp(-dt * 14));
      return !s.pts.length;
    }
    return true;
  }

  api.update = (dt) => {
    if (mode === 'carried') {
      if (carryTo) { pos.x += (carryTo.x - pos.x) * (1 - Math.exp(-dt * 16)); pos.z += (carryTo.z - pos.z) * (1 - Math.exp(-dt * 16)); pos.y += (0.34 - pos.y) * (1 - Math.exp(-dt * 12)); }
      return;
    }
    for (let n = 0; n < 8; n++) {
      if (!step) { step = steps.shift(); if (!step) break; start(step); }
      if (!tick(step, dt)) return;
      step = null; dt = 0;
    }
    if (!step && !steps.length && mode !== 'activity' && mode !== 'idle') { mode = cur ? 'activity' : 'idle'; if (!cur) idle(); }
  };

  /** Va à une activité. st = { approach:[x,z], yaw, pos:[x,y,z], y, enter(), exit?() , route?(from) }. */
  api.go = (st) => {
    if (mode === 'carried') return;
    if (cur === st && mode === 'activity') { api.stand(); return; }
    steps = []; step = null;
    let from = [pos.x, pos.z];
    const q = [];
    if (cur) { const ex = cur.exit ? cur.exit() : { from: cur.approach, steps: [api.glide(cur.approach[0], cur.approach[1], floorY(cur.approach[0], cur.approach[1]), g.rotation.y, 0.45, 'Idle_Loop')] }; q.push(api.fn(clearActivity), ...ex.steps); from = ex.from; }
    q.push(api.fn(() => { ui.say(st); mode = 'walk'; }));
    q.push(...(st.route ? st.route(from) : [api.walk(nav.path(from, st.approach))]));
    q.push(...(st.noFace ? [] : [api.face(st.yaw)]), ...enterSteps(st));
    steps = q; mode = 'walk'; if (!cur) { /* départ immédiat */ }
  };
  function enterSteps(st) {
    return [api.glide(st.pos[0], st.pos[2], st.y || 0, st.yaw, st.ritual ? 0.5 : (st.noFace ? 0.9 : 0.6), st.clip || 'Idle_Loop'),
      api.fn(() => { cur = st; mode = 'activity'; st.enter && st.enter(); ui.say(st); })];
  }
  /** Pose directement le personnage dans l'activité (glisser-déposer). */
  api.placeInto = (st) => {
    steps = []; step = null; clearActivity();
    ui.poof(pos);
    const a = st.approach; pos.set(a[0], floorY(a[0], a[1]), a[1]); g.rotation.y = st.yaw;
    ui.poof(pos);
    steps = [...(st.route ? st.route([pos.x, pos.z], true) : []), ...(st.noFace ? [] : [api.face(st.yaw)]), ...enterSteps(st)]; mode = 'walk'; ui.say(st);
  };
  api.stand = () => {
    if (!cur) return;
    const st = cur; steps = []; step = null;
    const ex = st.exit ? st.exit() : { from: st.approach, steps: [api.glide(st.approach[0], st.approach[1], floorY(st.approach[0], st.approach[1]), g.rotation.y, 0.45, 'Idle_Loop')] };
    steps = [api.fn(clearActivity), api.fn(() => ui.say(null)), ...ex.steps, api.fn(() => { mode = 'idle'; idle(); })]; mode = 'walk';
  };
  api.lift = () => {
    steps = []; step = null; clearActivity(); ui.say(null);
    mode = 'carried'; carryTo = { x: pos.x, z: pos.z }; hero.stop(); hero.play('Jump_Loop', { fade: 0.15 }); hero.setBase('amazed');
  };
  api.carry = (x, z) => { carryTo = { x, z }; };
  api.drop = (x, z) => {
    const f = nav.nearest(x, z); steps = [api.glide(f[0], f[1], floorY(f[0], f[1]), g.rotation.y, 0.3, 'Idle_Loop'), api.fn(() => { mode = 'idle'; idle(); })]; step = null; mode = 'walk'; carryTo = null; hero.setBase('neutral');
  };
  api.spawn = (x, z, yaw = 0) => { pos.set(x, floorY(x, z), z); g.rotation.y = yaw; mode = 'idle'; idle(); };
  return api;
}

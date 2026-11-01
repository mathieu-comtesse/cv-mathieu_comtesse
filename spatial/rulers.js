// RotationRulerController : les deux règles d'origine (refonte/rf.css : .rf-ruler, .rf-tick) pilotent la machine sélectionnée.
// Horizontale « Tourner » : rotation autour de l'axe vertical. Verticale « Incliner » : inclinaison autour de l'axe horizontal de l'écran.
// Souris, toucher et clavier (flèches, Origine). Double clic ou touche Origine : retour à l'orientation d'origine.
import { ROT } from './machine.js';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class RotationRulerController {
  constructor(onChange) {
    this.onChange = onChange; this.rot = 0; this.tilt = 0;
    this.v = document.getElementById('rf-ruler'); this.h = document.getElementById('rf-ruler-h');
    this.tv = document.getElementById('rf-track'); this.th = document.getElementById('rf-track-h');
    this.build(this.tv, false); this.build(this.th, true);
    this.bind(this.h, true); this.bind(this.v, false);
    this.paint();
  }
  build(track, horizontal) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i <= 100; i++) {
      const t = document.createElement('div'); t.className = 'rf-tick' + (i % 10 === 0 ? ' rf-maj' : '');
      t.style[horizontal ? 'left' : 'top'] = i * 5 + 'px';
      if (i % 10 === 0) t.innerHTML = `<span>${(i / 100).toFixed(2)}</span>`;
      frag.append(t);
    }
    track.append(frag);
  }
  bind(el, horizontal) {
    let d = null;
    const get = () => (horizontal ? this.rot : this.tilt);
    const set = (v) => { v = clamp(v, -ROT.LIM, ROT.LIM); if (horizontal) this.rot = v; else this.tilt = v; this.paint(); this.onChange(this.rot, this.tilt); };
    el.addEventListener('pointerdown', (e) => { d = { x: e.clientX, y: e.clientY, v: get() }; el.setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation(); });
    el.addEventListener('pointermove', (e) => { if (d) set(d.v + (horizontal ? e.clientX - d.x : e.clientY - d.y)); });
    const end = () => { d = null; }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => set(0));
    el.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    el.addEventListener('keydown', (e) => {
      const dir = horizontal ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
      if (e.key in dir) { set(get() + dir[e.key] * 20); e.preventDefault(); e.stopPropagation(); } else if (e.key === 'Home') { set(0); e.preventDefault(); }
    });
  }
  /** Replace les règles sur l'orientation mémorisée d'une machine, sans déclencher de rotation. */
  set(rot, tilt) { this.rot = rot; this.tilt = tilt; this.paint(); }
  reset() { this.rot = 0; this.tilt = 0; this.paint(); this.onChange(0, 0); }
  show(on) { this.v.hidden = this.h.hidden = !on; }
  paint() {
    this.tv.style.transform = `translateY(${this.tilt}px)`; this.th.style.transform = `translateX(${this.rot}px)`;
    for (const [el, val, label] of [[this.v, this.tilt, 'Inclinaison'], [this.h, this.rot, 'Rotation']]) {
      el.setAttribute('aria-valuemin', String(-ROT.LIM)); el.setAttribute('aria-valuemax', String(ROT.LIM));
      el.setAttribute('aria-valuenow', String(Math.round(val))); el.setAttribute('aria-valuetext', `${label} ${Math.round(val * (el === this.h ? ROT.YAW_PER_PX : (val >= 0 ? ROT.TILT_UP : ROT.TILT_DOWN) / ROT.LIM))} degrés`);
    }
  }
}

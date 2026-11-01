// FloatingAnnotationManager : les textes appartiennent au blueprint. Trois dispositions (A, B, C) varient d'un projet à l'autre, des lignes
// de rappel relient chaque texte à son objet, et un placement par essais évite les chevauchements entre textes, règles, menu et panneau.
// Les textes sont du DOM réel (sélectionnable, focalisable) projeté sur la scène : c'est le repli universel et la couche accessible.
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const NS = 'http://www.w3.org/2000/svg';

/** Décalages (en unités de largeur d'écran, côté libre = +1) des deux blocs de chaque disposition. */
const LAYOUTS = {
  A: { title: [.2, -.17], stat: [.1, .15] },
  B: { title: [-.02, .17], stat: [.22, -.12] },
  C: { title: [.24, .03], stat: [.04, -.2] }
};

export class FloatingAnnotationManager {
  constructor(root, world, registry, { onSelect, onDeepen, domains }) {
    this.root = root; this.world = world; this.registry = registry; this.onSelect = onSelect; this.onDeepen = onDeepen;
    this.svg = document.createElementNS(NS, 'svg'); this.svg.setAttribute('class', 'sp-leaders'); this.svg.setAttribute('aria-hidden', 'true'); root.append(this.svg);
    this.notes = new Map(); this.avoid = []; this.frame = 0; this.v3 = { x: 0, y: 0, z: 0, on: false };
    for (const e of registry.items) if (e.kind !== 'hub') this.add(e, domains);      // les zones sans objet ont leur propre carte (main.js)
  }
  add(e, domains) {
    const el = document.createElement('div'); el.className = 'sp-note'; el.dataset.id = e.id; el.hidden = true;
    const ord = String(e.index).padStart(2, '0');
    el.innerHTML = `<div class="sp-blk sp-b1"><p class="sp-dom rf-mono">${ord} · ${domains[e.domain]}</p><button type="button" class="sp-title"></button><p class="sp-fn"></p></div>
      ${e.stat ? '<div class="sp-blk sp-b2"><p class="sp-stat"></p></div>' : ''}
      <div class="sp-blk sp-b3" hidden><p class="sp-ctx"></p><p class="sp-tech"></p><p class="sp-acts"><button type="button" class="sp-go">Approfondir</button><a class="sp-full" href="">Page complète</a></p></div>`;
    el.querySelector('.sp-title').textContent = e.title; el.querySelector('.sp-title').setAttribute('aria-label', 'Inspecter : ' + e.title);
    el.querySelector('.sp-fn').textContent = e.sub || '';
    if (e.stat) el.querySelector('.sp-stat').textContent = e.stat.value;
    el.querySelector('.sp-ctx').textContent = e.stat?.context || e.sub || '';
    el.querySelector('.sp-tech').textContent = e.tech?.length ? 'Technologies : ' + e.tech.join(', ') : '';
    el.querySelector('.sp-full').href = (e.study || e.slug) + '.html';
    el.querySelector('.sp-title').addEventListener('click', () => this.onSelect(e.id));
    el.querySelector('.sp-go').addEventListener('click', (ev) => this.onDeepen(e.id, ev.currentTarget));
    const lines = [document.createElementNS(NS, 'line'), document.createElementNS(NS, 'line')]; lines.forEach((l) => this.svg.append(l));
    this.root.append(el);
    this.notes.set(e.id, { e, el, lines, b: [el.querySelector('.sp-b1'), el.querySelector('.sp-b2'), el.querySelector('.sp-b3')], size: null, shown: false, offs: [0, 0, 0] });
  }
  measure(n) { n.size = n.b.map((b) => (b ? [b.offsetWidth, b.offsetHeight] : [0, 0])); }
  refreshAvoid() { this.avoid = [...document.querySelectorAll('[data-sp-avoid]')].filter((x) => !x.hidden && x.offsetParent !== null).map((x) => { const r = x.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }); }

  /** Placement d'une image : écran, distance, sélection. */
  update(camPos, selectedId, lecture) {
    if (this.frame++ % 20 === 0) this.refreshAvoid();
    const W = innerWidth, H = innerHeight, S = Math.min(W, 1500), placed = [], small = W < 760, maxNotes = small ? 3 : 6;
    const cand = [];
    for (const n of this.notes.values()) {
      const e = n.e, d = Math.hypot(camPos.x - e.pos[0], camPos.z - e.pos[2]);
      const sel = e.id === selectedId, vis = (sel || d < (e.kind === 'hub' ? 95 : 78)) && !(lecture && !sel);
      n.d = d; n.sel = sel; n.vis = vis;
      if (vis) cand.push(n); else if (n.shown) { n.el.hidden = true; n.shown = false; n.lines.forEach((l) => l.setAttribute('visibility', 'hidden')); }
    }
    cand.sort((a, b) => (b.sel - a.sel) || (a.d - b.d));
    let count = 0;
    for (const n of cand) {
      const e = n.e, lead = e.kind === 'hub' ? [0, 6, 0] : [0, (this.world.machines.get(e.id)?.size.y || 8) * .6 + (e.pos[1] || 0) * 0, 0];
      this.tmpV ??= new (this.world.cam.constructor)();
      this.tmpV.set(e.pos[0] + lead[0], e.pos[1] + lead[1] + (e.kind === 'plate' ? 8 : 4), e.pos[2] + lead[2]);
      const a = this.world.project(this.tmpV, this.v3);
      if (!a.on || a.x < -40 || a.x > W + 40 || a.y < -40 || a.y > H + 40) { if (n.shown) { n.el.hidden = true; n.shown = false; } continue; }
      if (count >= maxNotes && !n.sel) { if (n.shown) { n.el.hidden = true; n.shown = false; } continue; }
      count++;
      if (!n.shown) { n.el.hidden = false; n.shown = true; this.measure(n); }
      if (!n.size || n.sel !== n.wasSel) { n.b[2].hidden = !n.sel; this.measure(n); n.wasSel = n.sel; }
      const shift = e.cam?.shift ?? 0, side = shift >= 0 ? 1 : -1, L = LAYOUTS[e.layout || 'A'];
      const fade = n.sel ? 1 : smooth(78, 46, n.d);
      n.el.style.opacity = fade.toFixed(3); n.el.style.pointerEvents = fade < .35 ? 'none' : '';
      const blocks = [[L.title, 0], [L.stat, 1], [[.27, 0], 2]];
      blocks.forEach(([off, bi]) => {
        const blk = n.b[bi]; if (!blk || blk.hidden) { return; }
        const [w, h] = n.size[bi] || [200, 40];
        const sc = bi === 2 ? 1 : 1;
        const want = bi === 2 ? [a.x + side * (S * .22) - (side < 0 ? w : 0), a.y - h - 36] : [a.x + side * off[0] * S - (side < 0 ? w : 0), a.y + off[1] * Math.min(H, 900) - h / 2];
        let [x, y] = want;
        // essais de placement : décalages successifs jusqu'à ne plus rien recouvrir
        const tries = [[0, 0], [0, -1], [0, 1], [side * 1, 0], [0, -2], [0, 2], [-side * 1, 0], [side * 1, -1], [side * 1, 1]];
        let ok = false;
        for (const [tx, ty] of tries) {
          const bx = x + tx * (w * .6), by = y + ty * (h + 10);
          const bxc = Math.max(14, Math.min(W - w - 14, bx)), byc = Math.max(64, Math.min(H - h - 14, by));
          const box = [bxc, byc, bxc + w, byc + h];
          if (![...this.avoid, ...placed].some((r) => box[0] < r[2] + 8 && box[2] > r[0] - 8 && box[1] < r[3] + 6 && box[3] > r[1] - 6)) { x = bxc; y = byc; ok = true; break; }
        }
        if (!ok) { x = Math.max(14, Math.min(W - w - 14, x)); y = Math.max(64, Math.min(H - h - 14, y)); }
        placed.push([x, y, x + w, y + h]);
        blk.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        if (bi < 2) {
          const l = n.lines[bi]; l.setAttribute('visibility', fade > .1 ? 'visible' : 'hidden'); l.setAttribute('opacity', (fade * .8).toFixed(2));
          const ex = a.x < x + w / 2 ? x : x + w, ey = y + h / 2;
          l.setAttribute('x1', a.x.toFixed(1)); l.setAttribute('y1', a.y.toFixed(1)); l.setAttribute('x2', ex.toFixed(1)); l.setAttribute('y2', ey.toFixed(1));
        }
      });
    }
  }
}

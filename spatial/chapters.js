// ChapterNav : menu vertical fixe de la vue spatiale, dans l'esprit du sommaire de la vidéo de référence : titres de chapitres, repères circulaires,
// courbe de liaison animée qui se déforme vers le chapitre actif, sous-rubriques du chapitre actif, navigation directe, synchronisation avec la
// progression du défilement. Style blueprint : traits fins blancs, typographie et couleurs du site.
const NS = 'http://www.w3.org/2000/svg';
const smooth = (t) => t * t * (3 - 2 * t);

export class ChapterNav {
  /** handlers : { onChapter(ch), onProject(id), onHover(ids|null) } */
  constructor(root, registry, timeline, handlers) {
    this.root = root; this.registry = registry; this.timeline = timeline; this.h = handlers; this.active = -1; this.af = 0;
    this.chapters = registry.chapters.map((c) => {
      const first = c.members.length ? Math.min(...c.members.map((id) => registry.byId[id].u)) : registry.byId[c.hub].u;
      return { ...c, u: c.id === 'accueil' ? 0 : Math.max(0, first - 900) };
    });
    this.chapters.forEach((c, i) => { c.end = i + 1 < this.chapters.length ? this.chapters[i + 1].u : timeline.length + 1; });
    this.render(); this.curves = new Map(); this.ty = 0;
  }
  render() {
    const R = this.registry, items = this.chapters.map((c, i) => {
      const subs = c.members.map((id) => `<li><button type="button" class="sp-sub-b" data-id="${id}"><i class="sp-sub-dot" aria-hidden="true"></i><span>${R.byId[id].title}</span></button></li>`);
      if (c.id === 'experimentation') subs.push(`<li><button type="button" class="sp-sub-b" data-id="experiences"><i class="sp-sub-dot" aria-hidden="true"></i><span>Projets personnels</span></button></li>`);
      const url = '#/' + c.id;
      return `<li class="sp-ch" data-ch="${c.id}"><button type="button" class="sp-ch-b" data-ch="${c.id}"><span class="sp-ch-n rf-mono">${String(i).padStart(2, '0')}</span><i class="sp-ch-dot" aria-hidden="true"></i><span class="sp-ch-t">${c.label}</span></button>${subs.length ? `<div class="sp-ch-wrap"><ul class="sp-ch-sub">${subs.join('')}</ul></div>` : ''}</li>`;
    });
    this.root.innerHTML = `<svg class="sp-ch-svg" aria-hidden="true"><path class="sp-ch-rail"/><path class="sp-ch-fill"/><g class="sp-ch-fan"></g><circle class="sp-ch-you" r="5"/></svg><ol>${items.join('')}</ol>`;
    this.svg = this.root.querySelector('svg'); this.rail = this.svg.querySelector('.sp-ch-rail'); this.fill = this.svg.querySelector('.sp-ch-fill'); this.fan = this.svg.querySelector('.sp-ch-fan'); this.you = this.svg.querySelector('.sp-ch-you');
    this.rows = [...this.root.querySelectorAll('.sp-ch')];
    this.rows.forEach((row, i) => {
      const c = this.chapters[i];
      row.querySelector('.sp-ch-b').addEventListener('click', () => this.h.onChapter(c));
      row.addEventListener('mouseenter', () => this.h.onHover?.(c)); row.addEventListener('mouseleave', () => this.h.onHover?.(null));
      row.addEventListener('focusin', () => this.h.onHover?.(c)); row.addEventListener('focusout', () => this.h.onHover?.(null));
      row.querySelectorAll('.sp-sub-b').forEach((b) => b.addEventListener('click', () => this.h.onProject(b.dataset.id)));
    });
  }
  /** Chapitre contenant la position de défilement u. */
  indexAt(u) { let k = 0; this.chapters.forEach((c, i) => { if (u >= c.u - 1) k = i; }); return k; }
  /** Position fractionnaire dans la liste (chapitre + avancement dans le chapitre), pour le repère de progression. */
  floatAt(u) { const k = this.indexAt(u), c = this.chapters[k], t = Math.min(1, Math.max(0, (u - c.u) / Math.max(1, c.end - c.u))); return k + t; }
  setSelected(id) {
    this.root.querySelectorAll('.sp-sub-b').forEach((b) => { const on = b.dataset.id === id; b.classList.toggle('sp-on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  /** À appeler à chaque image : met à jour le chapitre actif, déploie ses sous-rubriques, anime la courbe. */
  update(u, dt, selectedId) {
    const k = this.indexAt(u);
    if (k !== this.active) {
      this.active = k;
      this.rows.forEach((r, i) => { const on = i === k; r.classList.toggle('sp-active', on); const b = r.querySelector('.sp-ch-b'); if (on) b.setAttribute('aria-current', 'location'); else b.removeAttribute('aria-current'); });
    }
    // sous-rubrique : le projet sélectionné, sinon celui dont le cadrage est le plus proche de la position
    let near = selectedId; if (!near) { let bd = 520; for (const id of this.chapters[k].members) { const d = Math.abs(this.registry.byId[id].u - u); if (d < bd) { bd = d; near = id; } } }
    this.setSelected(near);
    const target = this.floatAt(u); this.af += (target - this.af) * (1 - Math.exp(-dt * 9));
    const box = this.svg.getBoundingClientRect(); if (box.width === 0) return;
    this.svg.setAttribute('width', box.width); this.svg.setAttribute('height', box.height);
    const dots = this.rows.map((r) => { const d = r.querySelector('.sp-ch-dot').getBoundingClientRect(); return [d.left + d.width / 2 - box.left, d.top + d.height / 2 - box.top]; });
    // rail : passe par les repères, se creuse vers le chapitre actif (la courbe se déforme quand on change de chapitre)
    const pts = dots.map(([x, y], i) => [x + 15 * Math.exp(-((i - this.af) ** 2) / 1.2), y]);
    const path = (arr) => arr.reduce((d, p, i) => d + (i === 0 ? `M${p[0].toFixed(1)} ${p[1].toFixed(1)}` : (() => { const q = arr[i - 1], my = (q[1] + p[1]) / 2; return ` C${q[0].toFixed(1)} ${my.toFixed(1)} ${p[0].toFixed(1)} ${my.toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`; })()), '');
    this.rail.setAttribute('d', path(pts));
    const f = Math.min(pts.length - 1, Math.max(0, this.af)), i0 = Math.floor(f), t = f - i0, i1 = Math.min(pts.length - 1, i0 + 1);
    const cur = [pts[i0][0] + (pts[i1][0] - pts[i0][0]) * t, pts[i0][1] + (pts[i1][1] - pts[i0][1]) * t];
    this.fill.setAttribute('d', path([...pts.slice(0, i0 + 1), cur])); this.you.setAttribute('cx', cur[0].toFixed(1)); this.you.setAttribute('cy', cur[1].toFixed(1));
    // éventail : du repère actif vers chacune de ses sous-rubriques (courbes fines, lissées par ressort)
    const act = this.rows[k], subs = [...act.querySelectorAll('.sp-sub-dot')], [ax, ay] = pts[k];
    while (this.fan.childNodes.length > subs.length) this.fan.lastChild.remove();
    while (this.fan.childNodes.length < subs.length) this.fan.append(document.createElementNS(NS, 'path'));
    subs.forEach((d, j) => {
      const r = d.getBoundingClientRect(), sx = r.left + r.width / 2 - box.left, sy = r.top + r.height / 2 - box.top, el = this.fan.childNodes[j];
      const key = k + ':' + j, cv = this.curves.get(key) || { y: ay }; cv.y += (sy - cv.y) * (1 - Math.exp(-dt * 11)); this.curves.set(key, cv);
      el.setAttribute('d', `M${ax.toFixed(1)} ${(ay + 6).toFixed(1)} C${(ax + 6).toFixed(1)} ${(ay + 30).toFixed(1)} ${(sx - 26).toFixed(1)} ${cv.y.toFixed(1)} ${(sx - 6).toFixed(1)} ${cv.y.toFixed(1)}`);
    });
  }
}

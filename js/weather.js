/* ───────────── Météo : clair, nuageux, brume, pluie ─────────────
 * Un cycle automatique fait varier le temps ; la pastille permet de passer au suivant.
 * `k = { rain, mist, cloud }` (0 à 1, lissés) pilote la lumière, l'étang, la brume et la pluie.
 * La pluie et la brume sont des calques 2D au-dessus de la scène : aucun coût 3D. */

const TYPES = [
  { id: 'clair', label: 'Ciel dégagé', k: { rain: 0, mist: 0, cloud: 0 }, icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  { id: 'nuageux', label: 'Nuageux', k: { rain: 0, mist: 0.12, cloud: 0.7 }, icon: '<path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5 4.25 4.25 0 0 1 17 18H7z"/>' },
  { id: 'brume', label: 'Brume', k: { rain: 0, mist: 0.9, cloud: 0.4 }, icon: '<path d="M4 8h13M7 12h13M4 16h13M9 20h9"/>' },
  { id: 'pluie', label: 'Pluie', k: { rain: 1, mist: 0.4, cloud: 0.9 }, icon: '<path d="M7 15a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 6.5 4.25 4.25 0 0 1 17 15H7z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>' },
];
const NEXT = { clair: ['nuageux', 'brume'], nuageux: ['pluie', 'clair', 'brume'], brume: ['clair', 'nuageux'], pluie: ['nuageux', 'brume'] };
const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

export function createWeather(host, { button = null } = {}) {
  const el = document.createElement('div'); el.className = 'wx'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="wx-mist wx-m1"></i><i class="wx-mist wx-m2"></i><canvas class="wx-rain"></canvas>';
  host.append(el);
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
  const k = { rain: 0, mist: 0, cloud: 0 };
  let type = TYPES[0], holdUntil = 0, changeAt = performance.now() + 22000 + Math.random() * 10000, w = 0, h = 0, night = false;
  const drops = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 0.6 }));

  const label = button && button.querySelector('.dbtn__text'), icon = button && button.querySelector('.dbtn__icon');
  const paint = () => { if (label) label.textContent = type.label; if (icon) icon.innerHTML = svg(type.icon); if (button) button.setAttribute('aria-label', 'Météo : ' + type.label + '. Changer le temps'); el.dataset.w = type.id; };
  const set = (id, hold = 0) => { type = TYPES.find((t) => t.id === id) || TYPES[0]; holdUntil = performance.now() + hold; changeAt = performance.now() + 28000 + Math.random() * 22000; paint(); };
  const next = () => { const o = NEXT[type.id]; set(o[(Math.random() * o.length) | 0], 45000); };
  if (button) button.addEventListener('click', () => { const i = TYPES.indexOf(type); set(TYPES[(i + 1) % TYPES.length].id, 60000); });
  paint();

  const size = () => { const r = host.getBoundingClientRect(); w = Math.max(2, Math.round(r.width / 2)); h = Math.max(2, Math.round(r.height / 2)); if (cv.width !== w) { cv.width = w; cv.height = h; } };
  new ResizeObserver(size).observe(host); size();

  const update = (dt, isNight) => {
    night = isNight;
    const now = performance.now();
    if (now > changeAt && now > holdUntil) next();
    const a = 1 - Math.exp(-dt * 0.5);                                 // transition en ~4 s
    for (const n in k) k[n] += (type.k[n] - k[n]) * a;
    el.style.setProperty('--wx-mist', k.mist.toFixed(3)); el.style.setProperty('--wx-cloud', k.cloud.toFixed(3));
    // pluie : traits obliques, dessinés seulement quand elle tombe
    const on = k.rain > 0.02;
    if (!on) { if (cv.dataset.on) { ctx.clearRect(0, 0, w, h); cv.dataset.on = ''; } return; }
    cv.dataset.on = '1';
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = night ? 'rgba(170,195,235,.55)' : 'rgba(95,125,165,.55)'; ctx.lineWidth = 1; ctx.beginPath();
    const n = Math.round(drops.length * k.rain), sp = dt * 1.5, len = 9, sl = 0.22;
    for (let i = 0; i < n; i++) {
      const d = drops[i]; d.y += sp * d.z * 1.0; d.x -= sp * d.z * 0.22 * (h / w);
      if (d.y > 1) { d.y -= 1.05; d.x = Math.random() * 1.2; } if (d.x < -0.05) d.x += 1.2;
      const x = d.x * w, y = d.y * h, l = len * d.z;
      ctx.moveTo(x, y); ctx.lineTo(x + l * sl, y - l);
    }
    ctx.stroke();
  };
  return { k, update, set, next, get type() { return type.id; }, TYPES };
}

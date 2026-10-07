/* ───────────── Météo : clair, nuageux, brume, pluie ─────────────
 * Un cycle automatique fait varier le temps ; la pastille permet de passer au suivant.
 * `k = { rain, mist, cloud }` (0 à 1, lissés) pilote la lumière, l'étang, la brume et la pluie.
 * La pluie et la brume n'existent que au-dessus de l'eau (voir pond.js). */

const TYPES = [
  { id: 'clair', label: 'Ciel dégagé', k: { rain: 0, mist: 0, cloud: 0 }, icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  { id: 'nuageux', label: 'Nuageux', k: { rain: 0, mist: 0.12, cloud: 0.7 }, icon: '<path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5 4.25 4.25 0 0 1 17 18H7z"/>' },
  { id: 'brume', label: 'Brume', k: { rain: 0, mist: 0.9, cloud: 0.4 }, icon: '<path d="M4 8h13M7 12h13M4 16h13M9 20h9"/>' },
  { id: 'pluie', label: 'Pluie', k: { rain: 1, mist: 0.4, cloud: 0.9 }, icon: '<path d="M7 15a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 6.5 4.25 4.25 0 0 1 17 15H7z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>' },
];
const NEXT = { clair: ['nuageux', 'brume'], nuageux: ['pluie', 'clair', 'brume'], brume: ['clair', 'nuageux'], pluie: ['nuageux', 'brume'] };
const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

export function createWeather({ button = null } = {}) {
  const k = { rain: 0, mist: 0, cloud: 0 };
  let type = TYPES[0], holdUntil = 0, changeAt = performance.now() + 22000 + Math.random() * 10000;

  const label = button && button.querySelector('.dbtn__text'), icon = button && button.querySelector('.dbtn__icon');
  const paint = () => { if (label) label.textContent = type.label; if (icon) icon.innerHTML = svg(type.icon); if (button) button.setAttribute('aria-label', 'Météo : ' + type.label + '. Changer le temps'); };
  const set = (id, hold = 0) => { type = TYPES.find((t) => t.id === id) || TYPES[0]; holdUntil = performance.now() + hold; changeAt = performance.now() + 28000 + Math.random() * 22000; paint(); };
  const next = () => { const o = NEXT[type.id]; set(o[(Math.random() * o.length) | 0], 45000); };
  if (button) button.addEventListener('click', () => { const i = TYPES.indexOf(type); set(TYPES[(i + 1) % TYPES.length].id, 60000); });
  paint();

  const update = (dt) => {
    const now = performance.now();
    if (now > changeAt && now > holdUntil) next();
    const a = 1 - Math.exp(-dt * 0.5);                                 // transition en ~4 s
    for (const n in k) k[n] += (type.k[n] - k[n]) * a;
  };
  return { k, update, set, next, get type() { return type.id; }, TYPES };
}

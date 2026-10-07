/* Discover Button (ObsidianUI) : gabarit HTML partagé. Le CSS est dans style.css (.dbtn). */
export const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
export function dbtn(label, { tag = 'span', href = '', sm = false, on = false, icon = ARROW, cls = '' } = {}) {
  const c = `dbtn${sm ? ' dbtn--sm' : ''}${on ? ' dbtn--on' : ''}${cls ? ' ' + cls : ''}`;
  const face = `<span class="dbtn__fill" aria-hidden="true"></span><span class="dbtn__icon" aria-hidden="true">${icon}</span><span class="dbtn__text">${label}</span>`;
  return tag === 'a' ? `<a class="${c}" href="${href}" target="_blank" rel="noopener">${face}</a>` : `<${tag} class="${c}">${face}</${tag}>`;
}

/* Flip Text (ObsidianUI) en JavaScript pur : chaque lettre fait un tour sur elle-même et se soulève de 8 px au survol (0,4 s, easeOut). */
export function initFlipText(root = document) {
  root.querySelectorAll('.ft').forEach((el) => {
    const text = el.textContent; el.setAttribute('aria-label', text); el.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span'); s.className = 'ftc'; s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? ' ' : ch;
      s.addEventListener('pointerenter', () => s.classList.add('on')); s.addEventListener('pointerleave', () => s.classList.remove('on'));
      el.append(s);
    }
  });
}

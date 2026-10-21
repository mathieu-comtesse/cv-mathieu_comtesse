/* Bouddha aux quatre visages : un clic sur la statue ouvre le portrait 3D de Mathieu (shupi/), la tête qui suit le curseur et qu'on peut
 * attraper et déformer dans tous les sens, avec une courte phrase sur le lien avec son côté zen. Même fenêtre que le livre photo et la stèle. */
const SRC = 'shupi/index.html?portrait&v=cv-scene-v51';
const KICKER = 'Quatre visages · un seul calme';
const LINE = 'Le Bouddha regarde dans les quatre directions sans perdre sa sérénité. Ma tête se laisse déformer dans tous les sens, et pourtant le regard revient toujours au calme : c’est ma façon d’être zen.';
const HINT = 'Maintenez la tête pour la déformer, lâchez pour la voir reprendre sa forme.';

export function createBuddha(onChange = () => {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'film-album buddha-dialog';
  dialog.setAttribute('aria-label', 'Bouddha aux quatre visages : le portrait déformable de Mathieu');
  dialog.innerHTML = `<header><button class="film-close" type="button" aria-label="Quitter le portrait"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
<div class="buddha-wrap"><div class="buddha-view"><iframe title="Portrait 3D interactif de Mathieu : maintenir la tête pour la déformer" allowtransparency="true"></iframe></div>
<div class="buddha-text"><p class="buddha-kicker">${KICKER}</p><p class="buddha-line">${LINE}</p><p class="buddha-hint">${HINT}</p></div></div>`;
  document.body.append(dialog);
  const frame = dialog.querySelector('iframe'), view = dialog.querySelector('.buddha-view');

  // la tête suit le curseur sur toute la fenêtre, pas seulement dans le cadre
  dialog.addEventListener('pointermove', (e) => {
    const r = frame.getBoundingClientRect();
    try { frame.contentWindow?.shupiPortrait?.lookAtPointer((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1); } catch {}
  }, { passive: true });
  dialog.addEventListener('pointerleave', () => { try { frame.contentWindow?.shupiPortrait?.lookAtPointer(0, 0); } catch {} });

  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelector('.film-close').onclick = close;
  dialog.addEventListener('click', (e) => { if (e.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); });
  let returnFocus = null;
  dialog.addEventListener('close', () => {
    onChange(false); document.dispatchEvent(new CustomEvent('film-album-change', { detail: { open: false } })); returnFocus?.focus?.({ preventScroll: true });
    frame.removeAttribute('src');                                                       // le portrait s'éteint à la fermeture (aucun rendu en arrière-plan)
  });
  return {
    open() {
      if (dialog.open) return;
      returnFocus = document.activeElement;
      frame.src = SRC;
      dialog.showModal(); onChange(true); document.dispatchEvent(new CustomEvent('film-album-change', { detail: { open: true } }));
      dialog.querySelector('.film-close').focus({ preventScroll: true });
    },
    close,
    get isOpen() { return dialog.open; }
  };
}

/* Lance un jeu en plein écran : calque fixe + iframe, demande le plein écran du navigateur, se ferme avec la croix ou Échap. */
export function playFullscreen(url, title = 'Jeu') {
  const ov = document.createElement('div'); ov.className = 'play-ov';
  ov.innerHTML = `<iframe title="${title.replace(/"/g, '&quot;')}" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe><button type="button" class="play-x" aria-label="Fermer">×</button>`;
  const fr = ov.querySelector('iframe');
  document.body.append(ov); document.body.classList.add('lock');
  const close = () => { removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ov.remove(); document.body.classList.remove('lock'); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', key);
  ov.querySelector('.play-x').addEventListener('click', close);
  document.addEventListener('fullscreenchange', function f() { if (!document.fullscreenElement) { document.removeEventListener('fullscreenchange', f); } });
  fr.src = url;
  (ov.requestFullscreen ? ov.requestFullscreen({ navigationUI: 'hide' }) : Promise.resolve()).catch(() => {});
  return close;
}

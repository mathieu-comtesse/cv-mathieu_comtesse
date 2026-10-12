/* Télé JVC Videosphere (orange, sur l'étagère blanche) : un clic ouvre les bandes-annonces officielles de deux films, lues depuis YouTube (rien n'est hébergé ici).
   Le lecteur n'existe que fenêtre ouverte : la fermer coupe le son. */
const FILMS = [
  { id: '7xwWSOaoLUI', title: 'Requiem pour un massacre', meta: 'Elem Klimov · 1985', note: 'Bande-annonce de la reprise 2019, version originale sous-titrée' },
  { id: '11sMDQIgggA', title: 'Il est difficile d’être un dieu', meta: 'Aleksei German · 2013 · Hard to Be a God', note: 'Bande-annonce officielle, Kino Lorber' },
];

export function createTvFilms({ onChange = () => {} } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'film-album tv-films';
  dialog.setAttribute('aria-label', 'Télé : extraits de films');
  dialog.innerHTML = `<header><div><h2 class="tv-title"></h2><p class="tv-meta"></p></div><button class="film-close" type="button" aria-label="Éteindre la télé"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
<div class="tv-set"><div class="tv-screen"></div></div>
<footer>${FILMS.map((f, i) => `<button type="button" data-film="${i}">${f.title}</button>`).join('')}</footer>
<p class="tv-note"></p>`;
  document.body.append(dialog);
  const screen = dialog.querySelector('.tv-screen'), tabs = [...dialog.querySelectorAll('button[data-film]')];
  let current = 0;

  function play(i) {
    current = i; const f = FILMS[i];
    dialog.querySelector('.tv-title').textContent = f.title;
    dialog.querySelector('.tv-meta').textContent = f.meta;
    dialog.querySelector('.tv-note').textContent = f.note + ' · lecture assurée par YouTube';
    tabs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${f.id}?rel=0&playsinline=1`;
    frame.title = `${f.title}, bande-annonce`;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';
    screen.replaceChildren(frame);
  }
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.addEventListener('close', () => { screen.replaceChildren(); onChange(false); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.querySelector('.film-close').onclick = close;
  dialog.querySelector('footer').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    play(Number(b.dataset.film));
  });
  return { open(i = current) { if (!dialog.open) { dialog.showModal(); onChange(true); } play(i); }, close, get isOpen() { return dialog.open; } };
}

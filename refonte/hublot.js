// Mécanisme du ZIP Sakthi : course H − 30 px, seuil 40 % / 700 px/s,
// glissière 450 ms cubic-bezier(.32,.72,0,1), son original à mi-volume.
const glass = document.querySelector('.rf-win-glass');
const shutter = document.getElementById('rf-shutter');
const grip = document.getElementById('rf-grip');
const video = document.getElementById('rf-win-video');

if (glass && shutter && grip) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sound = new Audio(new URL('../assets/hublot/shutter-sound.m4a', import.meta.url));
  sound.preload = 'none';
  sound.volume = .5;
  let travel = 0, y = 0, open = false, drag = null;

  // Le paysage démarre à l'ouverture ; fermé, masqué ou en mouvement réduit,
  // une image fixe évite de décoder une vidéo invisible.
  const syncVideo = () => {
    if (!video) return;
    if (open && !reduced.matches && !document.hidden) {
      video.muted = true;
      video.play().catch(() => {});
    } else video.pause();
  };
  reduced.addEventListener('change', syncVideo);
  document.addEventListener('visibilitychange', syncVideo);

  const place = (position, animate = false) => {
    y = Math.max(-travel, Math.min(0, position));
    shutter.style.transition = animate && !reduced.matches
      ? 'transform 450ms cubic-bezier(.32,.72,0,1)' : 'none';
    shutter.style.transform = `translate3d(0,${y}px,0)`;
    const percent = travel ? Math.round(-y / travel * 100) : 0;
    grip.setAttribute('aria-valuenow', String(percent));
    grip.setAttribute('aria-valuetext', percent === 0 ? 'Fermé' : percent === 100 ? 'Ouvert' : `Ouvert à ${percent} %`);
  };
  const action = (state, audible = true) => {
    open = state;
    place(open ? -travel : 0, true);
    syncVideo();
    if (audible) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };
  const release = () => {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    if (shutter.hasPointerCapture(id)) shutter.releasePointerCapture(id);
  };
  const cancel = () => {
    if (!drag) return;
    release();
    action(open, false);
  };

  shutter.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary || drag) return;
    // Reprend la position affichée si on attrape un volet encore en mouvement.
    const transform = getComputedStyle(shutter).transform;
    const position = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
    place(position);
    drag = { id: event.pointerId, start: event.clientY, from: y, last: event.clientY, time: performance.now(), velocity: 0, distance: 0 };
    shutter.setPointerCapture(event.pointerId);
    grip.focus({ preventScroll: true });
    event.preventDefault();
  });
  shutter.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const now = performance.now(), dt = now - drag.time;
    if (dt > 0) drag.velocity = (event.clientY - drag.last) / dt * 1000;
    drag.last = event.clientY;
    drag.time = now;
    drag.distance = Math.max(drag.distance, Math.abs(event.clientY - drag.start));
    place(drag.from + event.clientY - drag.start);
  });
  shutter.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const velocity = performance.now() - drag.time > 100 ? 0 : drag.velocity;
    const threshold = .4 * travel;
    const next = drag.distance < 5 ? !open : open
      ? !(y + travel >= threshold || velocity > 700)
      : Math.abs(y) >= threshold || velocity < -700;
    release();
    action(next);
  });
  shutter.addEventListener('pointercancel', cancel);
  shutter.addEventListener('lostpointercapture', cancel);
  grip.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowUp' || event.key === 'End') next = true;
    else if (event.key === 'ArrowDown' || event.key === 'Home') next = false;
    else if (event.key === 'Enter' || event.key === ' ') next = !open;
    else return;
    event.preventDefault();
    release();
    action(next);
  });
  const measure = () => {
    release();
    travel = Math.max(0, glass.clientHeight - 30);
    place(open ? -travel : 0);
  };
  new ResizeObserver(measure).observe(glass);
  measure();
}

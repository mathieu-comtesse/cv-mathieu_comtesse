import { initTheme, initReveal } from './theme.js?v=56ab04d';

initTheme();
initReveal();

/* titre : les lettres montent une à une, comme sur la page Info de la référence */
{
  const h = document.querySelector('.info-heading');
  if (h && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const w of n.textContent.split(/(\s+)/)) {
            if (/^\s+$/.test(w) || !w) { frag.append(w); continue; }
            const word = document.createElement('span'); word.className = 'w'; word.setAttribute('aria-hidden', 'true');
            for (const c of w) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++); word.append(s); }
            frag.append(word);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(h);
  }
}

// Portrait Shujaat strict 1:1 : le rendu est exécuté par le runtime original local.
const portraitFrame = document.getElementById('shujaatPortraitFrame');
const portraitHost = document.getElementById('portrait');

if (portraitFrame && portraitHost) {
  const lookAt = (event) => {
    const api = portraitFrame.contentWindow?.shupiPortrait;
    if (!api) return;
    const rect = portraitFrame.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 2 - 1;
    const y = (event.clientY - rect.top) / rect.height * 2 - 1;
    try { api.lookAtPointer(x, y); } catch {}
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    lookAt(event);
  }, { passive: true });

  const forward = (event) => {
    if (event.pointerType === 'touch') return;
    const api = portraitFrame.contentWindow?.shupiPortrait;
    const canvas = api?.scene?.domElement;
    if (!canvas) return;
    const rect = portraitFrame.getBoundingClientRect();
    if (
      event.type === 'pointerdown' &&
      (
        event.target.closest?.('a,button,input') ||
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
    ) return;

    const wasHeld = api.isHeld;
    canvas.dispatchEvent(new portraitFrame.contentWindow.PointerEvent(event.type, {
      clientX: event.clientX - rect.left,
      clientY: event.clientY - rect.top,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      button: event.button,
      buttons: event.buttons,
      bubbles: true,
      cancelable: true,
    }));

    if (api.isHeld && event.type === 'pointerdown') {
      try { portraitHost.setPointerCapture(event.pointerId); } catch {}
    }

    if (wasHeld || api.isHeld) event.preventDefault();
  };

  for (const type of ['pointerdown','pointerup','pointercancel']) {
    document.addEventListener(type, forward, { passive: false });
  }
}

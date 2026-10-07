import { initTheme, initReveal } from './theme.js?v=bf01a16';

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

// Portrait Native strict 1:1 — parent interaction logic reproduced from the local portrait runtime.
const portraitHost = document.querySelector('.shupi-portrait');
const portraitFrame = portraitHost?.querySelector('iframe');
const portraitApi = () => portraitFrame?.contentWindow?.shupiPortrait;

if (portraitFrame) {
  document.addEventListener('pointermove', event => {
    const rect = portraitFrame.getBoundingClientRect();
    try {
      portraitFrame.contentWindow?.shupiPortrait?.lookAtPointer(
        (event.clientX - rect.left) / rect.width * 2 - 1,
        (event.clientY - rect.top) / rect.height * 2 - 1
      );
    } catch {}
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    try { portraitFrame.contentWindow?.shupiPortrait?.lookAtPointer(0, 0); } catch {}
  });

  // Forward mouse gestures through the transparent portrait overflow.
  const host = portraitFrame.parentElement;
  function forward(event) {
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
      try { host.setPointerCapture(event.pointerId); } catch {}
    }

    if (wasHeld || api.isHeld) event.preventDefault();
  }

  for (const name of ['pointerdown','pointermove','pointerup','pointercancel']) {
    document.addEventListener(name, forward, { passive: false });
  }

  // Keep the exact portrait API defaults after the iframe is ready.
  portraitFrame.addEventListener('load', () => {
    const ready = () => {
      const api = portraitApi();
      if (!api) return requestAnimationFrame(ready);
      try {
        api.setHeadOnly(true);
        api.setHeadScale(1.2);
        api.setModify(true);
      } catch {}
    };
    ready();
  }, { once: true });
}

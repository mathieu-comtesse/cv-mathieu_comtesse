const galleries = document.querySelectorAll('[data-finance-capture]');

if (galleries.length) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = document.createElement('dialog');
  dialog.className = 'cv-finance-lightbox';
  dialog.setAttribute('aria-labelledby', 'cv-finance-capture-title');
  dialog.innerHTML = '<div><h2 id="cv-finance-capture-title"></h2><button type="button" autofocus>Fermer</button></div><img alt="">';
  document.body.append(dialog);
  const close = dialog.querySelector('button'), title = dialog.querySelector('h2'), large = dialog.querySelector('img');
  let opener, animation, closing = false;

  function sourceTransform() {
    const start = opener.getBoundingClientRect(), end = dialog.getBoundingClientRect();
    const scale = Math.max(.18, Math.min(.82, start.width/end.width, start.height/end.height));
    return {
      transform: `translate(${start.left+start.width/2-end.left-end.width/2}px,${start.top+start.height/2-end.top-end.height/2}px) scale(${scale})`,
      opacity: .3
    };
  }

  function dismiss() {
    if (closing) return;
    if (reduced.matches) { dialog.close(); return; }
    closing = true;
    animation?.cancel();
    dialog.dataset.closing = '';
    animation = dialog.animate([{transform: 'none', opacity: 1}, sourceTransform()],
      {duration: 245, easing: 'cubic-bezier(.42,0,.65,1)', fill: 'both'});
    animation.onfinish = () => dialog.close();
  }

  close.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom) dismiss();
  });
  dialog.addEventListener('close', () => {
    animation?.cancel();
    closing = false;
    delete dialog.dataset.closing;
    opener?.focus({preventScroll: true});
  });

  for (const gallery of galleries) {
    const select = gallery.querySelector('select'), preview = gallery.querySelector('button'), image = gallery.querySelector('img');
    const caption = gallery.querySelector('[data-finance-caption]');
    function update() {
      const option = select.selectedOptions[0];
      image.src = option.value;
      image.alt = option.dataset.alt;
      caption.textContent = option.dataset.caption;
      preview.setAttribute('aria-label', 'Agrandir · ' + option.textContent);
    }
    select.addEventListener('change', update);
    preview.addEventListener('click', () => {
      const option = select.selectedOptions[0];
      opener = preview;
      title.textContent = option.textContent;
      large.src = image.src;
      large.alt = image.alt;
      if (image.naturalWidth) {
        large.width = image.naturalWidth;
        large.height = image.naturalHeight;
      } else {
        large.removeAttribute('width');
        large.removeAttribute('height');
      }
      dialog.showModal();
      if (!reduced.matches) {
        animation = dialog.animate([sourceTransform(), {transform:'none', opacity:1}],
          {duration: 400, easing: 'cubic-bezier(.16,.82,.22,1)'});
      }
    });
  }
}

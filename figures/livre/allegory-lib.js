/* Couche « allégorie » : réécrit les libellés, lectures et légendes d'une figure du livre pour décrire le projet qu'elle illustre.
 * La figure (SVG et animations) n'est pas modifiée ; les lectures dynamiques sont réécrites à chaque mise à jour grâce à un MutationObserver. */
(function () {
  const NB = /[   ]/g;
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const nums = (s) => (String(s).replace(/−/g, '-').replace(NB, '').replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const fr = (v, d = 0) => v.toFixed(d).replace('.', ',').replace('-', '−');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const warn = (what) => console.warn('allégorie : élément absent', what);
  function setText(el, t) {
    const nodes = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (nodes.length) { nodes[nodes.length - 1].textContent = t; for (let i = 0; i < nodes.length - 1; i++) nodes[i].textContent = ''; }
    else el.appendChild(document.createTextNode(t));
  }
  const api = {
    $, $$, nums, fr, clamp,
    /** remplace des textes exacts (libellés, boutons, cases à cocher) */
    rep(pairs) {
      const map = new Map(pairs);
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement && !n.parentElement.closest('svg,script,style') ? 1 : 2 });
      const todo = []; while (w.nextNode()) todo.push(w.currentNode);
      const seen = new Set();
      for (const n of todo) { const k = n.textContent.trim(); if (map.has(k)) { n.textContent = n.textContent.replace(k, map.get(k)); seen.add(k); } }
      for (const k of map.keys()) if (!seen.has(k)) warn('texte « ' + k + ' »');
    },
    text(sel, t) { const el = $(sel); if (el) el.textContent = t; else warn(sel); },
    plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); },
    set(sel, t) { const el = $(sel); if (el) setText(el, t); else warn(sel); },
    key(i, t) { api.set('.iso-keys .iso-key:nth-child(' + i + ')', t); },
    caption(t) { const el = $('.iso-caption'); if (el) el.textContent = t; else warn('.iso-caption'); },
    title(t) { api.set('[data-corner="title"]', t); },
    options(sel, byValue) { for (const o of $$(sel + ' option')) if (byValue[o.value]) o.textContent = byValue[o.value]; },
    /** lecture dynamique : fn(texte d'origine, élément) renvoie le texte du projet */
    dyn(sel, fn) {
      const el = $(sel); if (!el) return warn(sel);
      let mine = null;
      const run = () => { const cur = el.textContent; if (cur === mine) return; const out = fn(cur, el); mine = out; el.textContent = out; };
      new MutationObserver(run).observe(el, { childList: true, characterData: true, subtree: true });
      run();
    },
  };
  window.ALLEGORY = api;
})();

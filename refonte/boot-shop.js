/* Redirige vers des modules originaux (refonte/shop/) les petits modules qui venaient du CDN Shopify.
   Table d'import ajoutée avant les autres : ses entrées priment. `?shop=cdn` désactive la redirection (comparaison avec les originaux). */
(() => {
  if (/[?&]shop=cdn\b/.test(location.search)) return;
  const cdn = 'https://cdn.shopify.com/oxygen-v2/58886/167724/342939/4935485/assets/', local = new URL('shop/', document.currentScript.src).href;
  const map = {
    'clamp-co6UzHBn': 'clamp', 'easing-BhDfN7yX': 'easing', 'random-CYrl7Amx': 'random', 'frame-uyhWmNSJ': 'frame', 'frameLoop-CeLX9Qef': 'frameLoop', 'sectionDot-BkMs301a': 'sectionDot',
    'rootMirror-C_uDdAx6': 'rootMirror', 'htmlInCanvasTilt-BU1xBiHq': 'htmlInCanvasTilt', 'cardWire-CPLlDeJq': 'cardWire', 'sectionHub-D4Y0MOvJ': 'sectionHub', 'wire-BRlyKbjJ': 'wire',
    'residentSections-BEssGc_p': 'residentSections', 'highlight-BjwrNyM6': 'highlight', 'colorPalette-VQpnhwit': 'colorPalette',
    'smoothScroll-DNrjGF3X': 'smoothScroll', 'HtmlInCanvasEntry-DeumE3Cj': 'htmlInCanvasEntry', 'style-i6E2ipwK': 'style', 'pack-D8z7b37W': 'pack', 'preload-helper-Bh25YT2p': 'preload-helper'
  };
  /* Modules purement WebGPU (surface, shader) : réécrits mais non exécutables dans le banc de test (périphérique WebGPU détruit), donc seulement avec ?shop=all. */
  if (/[?&]shop=all\b/.test(location.search)) { map['shader-7sCtY4bJ'] = 'shader'; map['surface-myOAtwnz'] = 'surface'; }
  const imports = {};
  for (const [hashed, name] of Object.entries(map)) imports[`${cdn}${hashed}.js`] = `${local}${name}.js`;
  document.write('<script type="importmap">' + JSON.stringify({ imports }) + '<' + '/script>');
})();

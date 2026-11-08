/* Chargement différé : précharge les dépendances d'un module (feuilles et scripts) puis exécute l'import. */
const BASE = 'https://cdn.shopify.com/oxygen-v2/58886/167724/342939/4935485/';
const seen = {};
export function preloadThen(load, dependencies) {
  let ready = Promise.resolve();
  if (dependencies && dependencies.length > 0) {
    const settle = (list) => Promise.all(list.map((p) => Promise.resolve(p).then((value) => ({ status: 'fulfilled', value }), (reason) => ({ status: 'rejected', reason }))));
    const nonce = document.querySelector('meta[property=csp-nonce]'), nonceValue = nonce?.nonce || nonce?.getAttribute('nonce');
    ready = settle(dependencies.map((path) => {
      const href = BASE + path;
      if (href in seen) return;
      seen[href] = true;
      const isCss = href.endsWith('.css');
      if (document.querySelector(`link[href="${href}"]${isCss ? '[rel="stylesheet"]' : ''}`)) return;
      const link = document.createElement('link');
      link.rel = isCss ? 'stylesheet' : 'modulepreload';
      if (!isCss) link.as = 'script';
      link.crossOrigin = ''; link.href = href;
      if (nonceValue) link.setAttribute('nonce', nonceValue);
      document.head.appendChild(link);
      if (isCss) return new Promise((resolve, reject) => { link.addEventListener('load', resolve); link.addEventListener('error', () => reject(new Error(`Unable to preload CSS for ${href}`))); });
    }));
  }
  const fail = (error) => { const event = new Event('vite:preloadError', { cancelable: true }); event.payload = error; window.dispatchEvent(event); if (!event.defaultPrevented) throw error; };
  return ready.then((results) => { for (const r of results || []) if (r.status === 'rejected') fail(r.reason); return load().catch(fail); });
}
export { preloadThen as _ };

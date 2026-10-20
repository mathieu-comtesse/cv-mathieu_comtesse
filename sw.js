// Cache des modèles 3D et des images du décor : première visite normale, ensuite la pièce s'affiche sans attente.
// Les fichiers du décor portent leur version dans l'adresse (?v=… ou dans le nom) : une nouvelle version est une nouvelle entrée.
const CACHE = 'rf-decor-v1';
const WANTED = (p) => /\/assets\/.+\.(glb|webp|jpg|png|json|mp3)$/.test(p) && !/\/assets\/logos\//.test(p);
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !WANTED(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(r);
    if (hit) return hit;
    const res = await fetch(r);
    if (res.ok && res.status === 200) c.put(r, res.clone());
    return res;
  }));
});

// Utilitaires communs : serveur de fichiers local (comtesse.me -> dépôt), feuille de référence externe (analyse seulement, jamais copiée dans le dépôt).
const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const REF = 'tailwind-yGPyQBNf.css';
/** mode : 'ref' (feuille Shopify de référence, depuis /tmp/ref.css), 'local' (refonte/site.css), 'none' (aucune feuille) */
async function setup(ctx, mode) {
  await ctx.route(/^https?:\/\//, async (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith(REF)) { if (mode === 'ref') return r.fulfill({ body: fs.readFileSync('/tmp/ref.css'), contentType: 'text/css' }); if (mode === 'local') return r.fulfill({ body: fs.readFileSync(path.join(root, 'refonte/site.css')), contentType: 'text/css' }); return r.abort(); }
    if (/^(comtesse\.me|localhost:\d+)$/.test(u.host)) { let f = path.join(root, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; try { return await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { return r.fulfill({ status: 404, body: '' }); } }
    r.abort();
  });
}
module.exports = { setup, root };

import { stat } from 'node:fs/promises';
import path from 'node:path';

// Serve the files via Playwright so the tests also run where loopback is unavailable.
export async function routeCheckout(context, root, origin, { fallback = false } = {}) {
  await context.route(origin + '/**', async route => {
    const url = new URL(route.request().url());
    const resource = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + resource);
    const relative = path.relative(root, file);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)
      || relative.split(path.sep).some(segment => segment.startsWith('.'))) {
      return route.fulfill({ status: 403 });
    }
    const info = await stat(file).catch(error => {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
      return null;
    });
    if (info?.isFile()) return route.fulfill({ path: file });
    if (fallback) return route.fallback();
    return route.fulfill({ status: 404 });
  });
}

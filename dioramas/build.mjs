// Construit un diorama : node dioramas/build.mjs scriptorium  ->  dioramas/scriptorium/index.html (autonome, three inclus)
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
const meta = { scriptorium: 'Le scriptorium clos · VRE Studio', forteresse: 'La forteresse assiégée · VRE Studio' }[name];
if (!meta) throw new Error('scène inconnue : ' + name);
const out = join(HERE, name, 'app.js');
await build({
  entryPoints: [join(HERE, name, 'main.js')], bundle: true, format: 'iife', target: ['es2020'], outfile: out, minify: true,
  legalComments: 'none', logLevel: 'warning', nodePaths: [process.env.DIO_NODE_MODULES || '/tmp/dio-deps/node_modules'],
});
const js = (await readFile(out, 'utf8')).replace(/<\/script/gi, '<\\/script');
const css = `:root{color-scheme:light}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:#fff}
#frame{position:fixed;left:50%;top:50%;width:92vw;height:92vh;transform:translate(-50%,-50%);background:#fff}
#stage{display:block;width:100%;height:100%;background:#fff;image-rendering:pixelated;image-rendering:crisp-edges;outline:none}
#fallback{position:fixed;inset:0;display:grid;place-items:center;background:#fff;color:#333a3d;font:14px/1.5 ui-monospace,monospace;text-align:center;padding:2rem}#fallback[hidden]{display:none}`;
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${meta}</title><style>${css}</style></head><body><div id="frame"><canvas id="stage" aria-label="${meta}, diorama animé" tabindex="-1"></canvas></div><div id="fallback" hidden>Ce diorama demande un navigateur avec WebGL2.</div><script>${js}</script></body></html>`;
await writeFile(join(HERE, name, 'index.html'), html);
console.log('wrote dioramas/' + name + '/index.html', (html.length / 1024).toFixed(0), 'KB');

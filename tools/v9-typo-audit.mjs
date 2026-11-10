// V9.1 : relevé typographique comparé (Shopify Editions Fall 2026 / comtesse.me), mêmes fenêtres, mêmes défilements.
//   node tools/v9-typo-audit.mjs [shopify|local] [largeur ...]       sortie : docs/v9/typo/{site}-{largeur}.json, {site}-{largeur}-{y}.jpg, resume.md
// Pour chaque élément textuel visible : taille calculée, hauteur de ligne, graisse, interlettrage, largeur maximale, nombre de lignes, position, texte (40 car.).
// Les captures Shopify sont des observations de la page publique : rien n'est copié dans le dépôt hors mesures et captures de référence.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), OUT = path.join(root, 'docs/v9/typo'); fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2), sites = ['shopify', 'local'].filter((s) => !args.some((a) => ['shopify', 'local'].includes(a)) || args.includes(s));
const VIEWS = (args.filter((a) => /^\d+$/.test(a)).map(Number)).map((w) => [w, w === 1920 ? 1080 : w === 1440 ? 900 : w === 768 ? 1024 : 844]); const VP = VIEWS.length ? VIEWS : [[1440, 900], [1920, 1080], [768, 1024], [390, 844]];
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const collect = () => {
  const out = [], vh = innerHeight, walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seen = new Set();
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t.length < 2) continue; const el = n.parentElement; if (!el || seen.has(el) || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0 || r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > vh * 1.05 || r.right < 0 || r.left > innerWidth) continue; seen.add(el);
    const fs2 = parseFloat(cs.fontSize), lh = cs.lineHeight === 'normal' ? fs2 * 1.2 : parseFloat(cs.lineHeight);
    out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className?.baseVal ?? el.className).slice(0, 60), size: +fs2.toFixed(1), lh: +lh.toFixed(1), lhRatio: +(lh / fs2).toFixed(2), weight: cs.fontWeight, ls: cs.letterSpacing, family: cs.fontFamily.split(',')[0].replace(/['"]/g, ''), maxW: cs.maxWidth, lines: Math.max(1, Math.round(r.height / lh)), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), text: t.slice(0, 40) });
  }
  return out.sort((a, c) => c.size - a.size);
};
const rows = [];
for (const site of sites) for (const [w, h] of VP) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 }), p = await ctx.newPage(); p.setDefaultTimeout(90000);
  const url = site === 'shopify' ? 'https://www.shopify.com/editions/fall2026' : `http://localhost:${srv.address().port}/index.html?uxtest`;
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(site === 'shopify' ? 12000 : 9000);
    const res = { site, w, h, shots: [] };
    for (const y of [0, Math.round(h * 0.45), Math.round(h * 1.1)]) { await p.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await p.waitForTimeout(2500); const els = await p.evaluate(collect); (res.states ||= {})[y] = els; await p.screenshot({ path: path.join(OUT, `${site}-${w}-${y}.jpg`), type: 'jpeg', quality: 78, timeout: 120000 }).catch(() => {}); res.shots.push(`${site}-${w}-${y}.jpg`); }
    fs.writeFileSync(path.join(OUT, `${site}-${w}.json`), JSON.stringify(res, null, 1)); rows.push(res); console.log('ok', site, w, Object.values(res.states).map((a) => a.length));
  } catch (e) { console.log('ECHEC', site, w, String(e.message).split('\n')[0]); }
  await ctx.close();
}
await b.close(); srv.close();
/* résumé : par site et fenêtre, les six plus grandes tailles distinctes (défilement 0) avec un exemple */
const md = ['| site | fenêtre | taille (px) | ligne | graisse | interlettrage | police | lignes | largeur | exemple |', '|---|---|---|---|---|---|---|---|---|---|'];
for (const r of rows) { const seen = new Set(); for (const e of r.states[0] || []) { const k = `${e.size}|${e.weight}`; if (seen.has(k)) continue; seen.add(k); if (seen.size > 6) break; md.push(`| ${r.site} | ${r.w} | ${e.size} | ${e.lhRatio} | ${e.weight} | ${e.ls} | ${e.family} | ${e.lines} | ${e.w} | ${e.text.replace(/\|/g, '/')} |`); } }
fs.writeFileSync(path.join(OUT, 'resume.md'), md.join('\n') + '\n'); console.log(md.join('\n'));

// Extrait le contenu des 23 études et fiches du blog dans refonte/articles.json : le parcours 3D les affiche en panneaux 3D (sans iframe).
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url), read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
const blog = [...read('blog.html').matchAll(/<a class="rf-art" href="([^"]+)"/g)].map((m) => m[1]);
const fiches = [...read('parcours.html').matchAll(/class="pc-more" href="([^".]+)\.html"/g)].map((m) => m[1]); // « Lire la fiche » des projets professionnels
const hrefs = [...new Set([...blog, ...fiches])];
const clean = (h) => h
  .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<video[\s\S]*?<\/video>/g, '').replace(/<button[\s\S]*?<\/button>/g, '')
  .replace(/<div class="rf-flow[\s\S]*?<\/ol><\/div>|<div class="rf-marche"[\s\S]*?<\/div>/g, '').replace(/ loading="lazy"| decoding="async"|<!--[\s\S]*?-->/g, '').replace(/ rf-tl-rv| rf-rv/g, '')
  .replace(/ (href|src|srcset)="(?!https?:|data:|#)([^"?]+)(\?[^"]*)?"/g, (m, a, u) => ` ${a}="${u}"`);
const out = {};
for (const h of hrefs) {
  const src = read(h + '.html'), m = /<article class="rf-post[^"]*">([\s\S]*?)<\/article>/.exec(src);
  if (!m) { console.warn('pas de <article> :', h); continue; }
  out[h] = { title: (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(m[1]) || ['', h])[1].replace(/<[^>]+>/g, '').trim(), html: clean(m[1]) };
}
writeFileSync(new URL('refonte/articles.json', ROOT), JSON.stringify(out));
console.log(Object.keys(out).length + ' pages, ' + (JSON.stringify(out).length / 1024).toFixed(0) + ' ko');

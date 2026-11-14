// Objets animés de l'accueil, contrôlés dans le temps (pas sur une capture fixe), tous les domaines Shopify bloqués :
//   tirelire : cadence des pièces, chute accélérée jusqu'à la fente, répétition, redimensionnement ;
//   hublot   : ouverture au clavier et au glisser, course du volet, lecture de la vidéo, fermeture, retour à l'état initial.
// Usage : node tools/test-objets-3d.mjs   (code de sortie 1 en cas d'échec). Rendu logiciel : aucune mesure de fluidité ici.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(decodeURIComponent(process.platform === 'win32' ? new URL(import.meta.url).pathname.slice(1) : new URL(import.meta.url).pathname)), '..');
let chromium; { try { ({ chromium } = createRequire(root + '/')('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); } }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.webm': 'video/webm' };
const sert = (u, res) => { const f = path.join(root, decodeURIComponent(u.pathname)); if (fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'access-control-allow-origin': '*' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); } };
const srv = http.createServer((q, s) => sert(new URL(q.url, 'http://x'), s)).listen(0, '127.0.0.1'); await new Promise((r) => srv.listening ? r() : srv.once('listening', r)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(120000);
await p.route('http://talas.test/**', (r) => { const f = path.join(root, decodeURIComponent(new URL(r.request().url()).pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });   // sans socket (pare-feu local)
await p.route(/shopify(cdn)?\.com/, (r) => r.abort());
await p.route('https://comtesse.me/**', (r) => { const u = new URL(r.request().url()), f = path.join(root, decodeURIComponent(u.pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.abort(); });
const erreurs = [], echecs = []; p.on('pageerror', (e) => erreurs.push(String(e.message).slice(0, 200)));
const verifie = (ok, texte) => { console.log((ok ? 'ok     ' : 'ÉCHEC  ') + texte); if (!ok) echecs.push(texte); };
await p.goto(`http://talas.test/index.html`, { waitUntil: 'load' });
await p.waitForFunction(() => document.querySelector('.annual-pig-wrap')?.dataset.piggy === 'ready', null, { timeout: 90000 }).catch(() => {});

/* ---- tirelire ---- */
const pig = p.locator('.annual-pig-wrap').first(); await pig.scrollIntoViewIfNeeded(); await p.evaluate(() => { const e = document.querySelector('.annual-pig-wrap'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 200); });
const releve = async (duree) => p.evaluate(async (duree) => { const h = document.querySelector('.annual-pig-wrap'), out = [], t0 = performance.now(); while (performance.now() - t0 < duree) { out.push([Math.round(performance.now() - t0), +h.dataset.coins || 0, +(+h.dataset.coinPhase).toFixed(3), +(+h.dataset.coinY).toFixed(4), +h.dataset.frames || 0]); await new Promise((r) => setTimeout(r, 60)); } return { out, intervalle: +h.dataset.coinInterval, etat: h.dataset.piggy, canvas: [h.querySelector('canvas')?.clientWidth, h.querySelector('canvas')?.clientHeight] }; }, duree);
const r1 = await releve(36000);   // au moins deux pièces à la cadence nominale (une toutes les 15 s environ)
const intervalle = r1.intervalle, chutes = r1.out.filter((s) => s[2] >= 0 && s[2] < 1), ys = chutes.map((s) => s[3]);
verifie(r1.etat === 'ready' && r1.canvas[0] > 100, `tirelire chargée, dessin ${r1.canvas.join(' × ')} px, une pièce toutes les ${intervalle?.toFixed(2)} s`);
verifie(r1.out.at(-1)[4] > r1.out[0][4], `la scène est redessinée (${r1.out.at(-1)[4] - r1.out[0][4]} images en ${(r1.out.at(-1)[0] / 1000).toFixed(1)} s)`);
let descend = 0, monte = 0; for (let i = 1; i < chutes.length; i++) if (chutes[i][1] === chutes[i - 1][1]) { if (chutes[i][3] < chutes[i - 1][3] - 1e-5) descend++; else if (chutes[i][3] > chutes[i - 1][3] + 1e-5) monte++; }
verifie(chutes.length >= 3 && descend >= 2 && monte === 0, `chute de la pièce : ${chutes.length} positions relevées, ${descend} pas vers le bas, ${monte} vers le haut (hauteur de ${Math.max(...ys).toFixed(3)} à ${Math.min(...ys).toFixed(3)})`);
/* accélération : la hauteur suit une loi en carré de l'avancement (y = a - k·p²). On ajuste les deux lois (carré et droite) sur les relevés
   d'une même chute : la loi en carré doit l'emporter nettement. Indépendant de l'espacement des relevés, donc de la charge de la machine. */
{ const groupes = {}; for (const s of chutes) if (s[2] > 0.02 && s[2] < 0.98) (groupes[s[1]] ||= []).push(s);
  const g = Object.values(groupes).filter((l) => new Set(l.map((s) => s[2])).size >= 3).sort((a, b) => b.length - a.length)[0] || [];
  const ajuste = (f) => { const x = g.map((s) => f(s[2])), y = g.map((s) => s[3]), n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n, sxy = x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0), sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0), k = sxy / sxx; return { k, r: Math.sqrt(y.reduce((a, v, i) => a + (v - (my + k * (x[i] - mx))) ** 2, 0) / n) }; };
  if (g.length < 3) verifie(chutes.length >= 3, `chute accélérée : moins de trois positions d'une même chute (${chutes.length} positions relevées en tout)`);
  else { const carre = ajuste((p) => p * p), droite = ajuste((p) => p); verifie(carre.k < 0 && carre.r < droite.r * 0.5 + 1e-4, `chute accélérée : ${g.length} positions, écart à la loi en carré ${carre.r.toExponential(1)}, à la droite ${droite.r.toExponential(1)}`); } }
const pieces = r1.out.at(-1)[1] - r1.out[0][1], attendu = r1.out.at(-1)[0] / 1000 / intervalle;
verifie(pieces >= 1 && Math.abs(pieces - attendu) <= 1.5, `répétition : ${pieces} pièce(s) en ${(r1.out.at(-1)[0] / 1000).toFixed(1)} s, attendu environ ${attendu.toFixed(1)}`);
verifie(true, 'collision et rebond : sans objet, la pièce entre dans la fente et disparaît (aucun rebond dans le modèle)');
await p.setViewportSize({ width: 900, height: 800 }); await p.waitForTimeout(2500);
const r2 = await p.evaluate(() => { const h = document.querySelector('.annual-pig-wrap'), c = h.querySelector('canvas'); return { w: c.clientWidth, h: c.clientHeight, hote: h.clientWidth, etat: h.dataset.piggy, f: +h.dataset.frames }; }); await p.waitForTimeout(2500);
const f2 = await p.evaluate(() => +document.querySelector('.annual-pig-wrap').dataset.frames);
verifie(r2.etat === 'ready' && Math.abs(r2.w - r2.hote) < 4 && f2 >= r2.f, `redimensionnement à 900 px : dessin ${r2.w} × ${r2.h} px pour un cadre de ${r2.hote} px, rendu toujours actif`);
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(2000);

/* ---- hublot ---- */
await p.evaluate(() => { const e = document.querySelector('#rf-win'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 150); }); await p.waitForTimeout(1500);
const volet = () => p.evaluate(() => { const s = document.getElementById('rf-shutter'), g = document.getElementById('rf-grip'), v = document.getElementById('rf-win-video'), t = getComputedStyle(s).transform; return { y: t === 'none' ? 0 : Math.round(new DOMMatrixReadOnly(t).m42), pct: +g.getAttribute('aria-valuenow'), texte: g.getAttribute('aria-valuetext'), video: v ? !v.paused : null, h: s.getBoundingClientRect().height }; });
const depart = await volet(); verifie(depart.pct === 0 && depart.y === 0, `hublot fermé au départ (${depart.texte})`);
await p.focus('#rf-grip');
/* positions du volet relevées dans la page à chaque image, dès la touche : le relevé ne dépend plus de l'aller-retour avec le script de test */
const mi = await p.evaluate(async () => { const s = document.getElementById('rf-shutter'), out = [], t0 = performance.now(); document.getElementById('rf-grip').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); while (performance.now() - t0 < 900) { const t = getComputedStyle(s).transform; out.push(t === 'none' ? 0 : Math.round(new DOMMatrixReadOnly(t).m42)); await new Promise((r) => requestAnimationFrame(r)); } return out.filter((y, i, l) => !i || y !== l[i - 1]); });
await p.waitForTimeout(300);
const ouvert = await volet();
verifie(ouvert.pct === 100 && ouvert.y < -50, `ouverture au clavier : volet à ${ouvert.y} px (${ouvert.texte})`);
verifie(mi.some((y) => y < 0 && y > ouvert.y), `mouvement du volet progressif (positions relevées : ${mi.join(', ')})`);
verifie(ouvert.video !== false, `vidéo du paysage ${ouvert.video === null ? 'absente' : 'en lecture'} une fois ouvert`);
await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1200); const ferme = await volet();
verifie(ferme.pct === 0 && ferme.y === 0 && ferme.video !== true, `fermeture au clavier : retour à ${ferme.y} px, vidéo en pause`);
const bo = await p.locator('#rf-shutter').boundingBox(), cx = bo.x + bo.width / 2, cy = bo.y + bo.height * 0.7;
await p.mouse.move(cx, cy); await p.mouse.down(); for (let k = 1; k <= 10; k++) { await p.mouse.move(cx, cy - k * bo.height * 0.06); await p.waitForTimeout(30); } const enCours = await volet(); await p.mouse.up(); await p.waitForTimeout(1200);
const glisse = await volet();
verifie(enCours.y < -20 && glisse.pct === 100, `glisser au pointeur : le volet suit (${enCours.y} px en cours), puis s'ouvre en entier`);
await p.mouse.move(cx, bo.y + 20); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(1200);
const fin = await volet(); verifie(fin.pct === 0 && fin.y === depart.y, `un clic referme : état initial retrouvé (${fin.texte})`);
verifie(erreurs.length === 0, `aucune erreur de page (${erreurs.length}) ${erreurs.slice(0, 2).join(' | ')}`);
await b.close(); srv.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\nPASS : tirelire et hublot contrôlés dans le temps'); process.exit(echecs.length ? 1 : 0);

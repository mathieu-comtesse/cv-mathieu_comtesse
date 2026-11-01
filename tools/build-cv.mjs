// Génère assets/cv-ats-mathieu-comtesse.pdf depuis cv/cv.html (Chromium via Playwright).
// Un seul flux de texte dans l'ordre de lecture, liens cliquables, PDF balisé : lisible par les ATS.
// Usage : node tools/build-cv.mjs   (nécessite le paquet « playwright » et son Chromium)
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(import.meta.dirname, '..');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(root, 'cv/cv.html')).href);
await page.pdf({ path: path.join(root, 'assets/cv-ats-mathieu-comtesse.pdf'), format: 'A4', printBackground: false, preferCSSPageSize: true, tagged: true, outline: false });
await browser.close();
console.log('CV généré');

// Génère refonte/site.css : base et utilitaires Tailwind CSS v4 (MIT, thème par défaut) + composants du site (refonte/css/components.css).
// Prérequis : dans un dossier TW (défaut /tmp/twgen) : npm i tailwindcss @tailwindcss/cli
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const TW = process.env.TW || '/tmp/twgen', root = resolve(new URL('../..', import.meta.url).pathname);
writeFileSync(`${TW}/in.css`, `@import "tailwindcss";\n@source "${root}/index.html";\n@source "${root}/tools/css/classes.txt";\n@import "${root}/refonte/css/components.css";\n`);
execFileSync(`${TW}/node_modules/.bin/tailwindcss`, ['-i', `${TW}/in.css`, '-o', `${root}/refonte/site.css`, '--minify'], { stdio: 'inherit' });
console.log('refonte/site.css généré');

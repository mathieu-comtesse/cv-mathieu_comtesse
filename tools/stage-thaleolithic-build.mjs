import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [buildDir, targetDir, version = 'V24.1'] = process.argv.slice(2);
if (!buildDir || !targetDir || !/^V\d+\.\d+$/.test(version))
  throw new Error('Usage: node tools/stage-thaleolithic-build.mjs <build Unity> <site> [V24.1]');
const config = {version, productVersion: '0.' + version.slice(1), streamingAssetsUrl: 'StreamingAssets'};
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
fs.mkdirSync(path.join(targetDir, 'Build'), {recursive: true});
for (const [key, extension] of Object.entries({loaderUrl: 'loader.js', dataUrl: 'data.unityweb',
  frameworkUrl: 'framework.js.unityweb', codeUrl: 'wasm.unityweb'})) {
  const name = 'Web-' + version + '.' + extension;
  const source = path.join(buildDir, 'Build', name);
  if (fs.statSync(source).size >= 100 * 1024 * 1024) throw new Error('Fichier GitHub trop grand : ' + name);
  fs.copyFileSync(source, path.join(targetDir, 'Build', name));
  config[key] = 'Build/' + name + '?v=' + hash(source);
}
const streaming = path.join(buildDir, 'StreamingAssets');
config.chapterBundles = fs.readdirSync(streaming).filter(name => /^iso-\d{2}-[a-f0-9]{12}\.bundle$/.test(name)).sort();
if (!config.chapterBundles.length) throw new Error('Aucun lot ISO compilé');
fs.mkdirSync(path.join(targetDir, 'StreamingAssets'), {recursive: true});
for (const name of config.chapterBundles) {
  const source = path.join(streaming, name);
  if (!name.endsWith('-' + hash(source) + '.bundle')) throw new Error('Empreinte de lot invalide : ' + name);
  fs.copyFileSync(source, path.join(targetDir, 'StreamingAssets', name));
}
fs.writeFileSync(path.join(targetDir, 'game-config.json'), JSON.stringify(config, null, 2) + '\n');
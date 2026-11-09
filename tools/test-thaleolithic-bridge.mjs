import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../thaleolithic/index.html');
const js = read('../thaleolithic/browser-bridge.js');
const bridge = read('../thaleolithic/Source/Runtime/MobileBrowserBridge.cs');
const transport = read('../thaleolithic/Source/Plugins/WebGL/UngaBrowser.jslib');

const methods = [...js.matchAll(/\bsend\(([^,]+),/g)]
  .flatMap(([, expression]) => [...expression.matchAll(/'([A-Za-z]+)'/g)].map(match => match[1]));
assert.deepEqual([...new Set(methods)].sort(),
  ['BeginGame', 'BrowserFocus', 'BrowserPointerGesture', 'BrowserViewport', 'Configure']);
for (const method of methods)
  assert.match(bridge, new RegExp('\\[Preserve\\]\\s*public void ' + method + '\\(string \\w+\\)'));
for (const event of ['ready', 'GAME_STARTING', 'GAME_STARTED', 'GAME_START_FAILED', 'BROWSER_ACK']) {
  assert.ok(js.includes("'" + event + "'"), event + ' manquant dans le navigateur');
  assert.ok(bridge.includes('"' + event + '"'), event + ' manquant dans Unity');
}
assert.match(html, /<script src="browser-bridge\.js\?v=/);
assert.match(transport, /CustomEvent\('unga-game'/);
assert.doesNotMatch(js, /location\.reload\(/);
console.log('Contrat navigateur–Unity : cinq méthodes préservées, cinq événements et reprise sans rechargement.');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {setTimeout: delay} = require('node:timers/promises');

async function browserSave(page, campaign, fixture = null) {
  return page.evaluate(async ({fixture, campaign}) => {
    const result = request => new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    for (const {name} of await indexedDB.databases()) {
      if (!name?.startsWith('/idbfs')) continue;
      const db = await result(indexedDB.open(name));
      try {
        if (!db.objectStoreNames.contains('FILE_DATA')) continue;
        const keys = await result(db.transaction('FILE_DATA').objectStore('FILE_DATA').getAllKeys());
        const key = keys.find(value => String(value).endsWith('/thaleolithic/' + campaign + '.json'));
        if (!key) continue;
        if (fixture === null) {
          const stored = await result(db.transaction('FILE_DATA').objectStore('FILE_DATA').get(key));
          return JSON.parse(new TextDecoder().decode(stored.contents));
        }
        await new Promise((resolve, reject) => {
          const transaction = db.transaction('FILE_DATA', 'readwrite');
          const store = transaction.objectStore('FILE_DATA');
          const current = store.get(key);
          current.onsuccess = () => store.put({...current.result, timestamp: new Date(),
            contents: new TextEncoder().encode(fixture)}, key);
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
        return key;
      } finally { db.close(); }
    }
    return null;
  }, {fixture, campaign});
}

async function installSave(page, origin, filename) {
  await page.goto(origin + 'fixture.html');
  const fixture = fs.readFileSync(filename, 'utf8');
  const {campaignId} = JSON.parse(fixture);
  const save = await browserSave(page, campaignId, fixture);
  assert.ok(save, 'Le jeu doit avoir créé une sauvegarde Web native');
  return campaignId;
}

const scenes = [
  {name: 'Combat Dylan contre Aurélien', id: 'MENHIR_DUEL', ready: 'duel'},
  {name: 'Assemblage SST', id: 'V17_SYSTEM', ready: 'activity'},
  {name: 'Chasse aux risques', id: 'V17_RISK_HUNT', ready: 'activity'},
  {name: 'Cinématique C08 de reconstruction', id: 'WORK_M_V_ABRI', ready: 'film', film: 'F15_C08'},
  {name: 'Village évolué', id: 'V17_DIFFERENCES', ready: 'village'},
  {name: 'Comparaison des 15 différences', id: 'V17_DIFFERENCES', ready: 'activity', pack: '08', actor: 'nork'},
  {name: 'Course d’urgence', id: 'V17_EVACUATION', ready: 'activity'},
  {name: 'Audit des esprits', id: 'V17_AUDIT', ready: 'activity', pack: '08', actor: 'alban'},
  {name: 'Revue de direction', id: 'V17_REVIEW', ready: 'activity'},
  {name: 'Séquence finale', id: 'V17_IMPROVEMENT', ready: 'film', film: 'F15_C14_GOOD', ending: 'FIN_3', actor: 'mathieu'}
];

async function waitForFixture(filename, validation) {
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    let journey;
    try { journey = JSON.parse(fs.readFileSync(validation, 'utf8')); }
    catch (error) {
      if (!(error instanceof SyntaxError) && !['ENOENT', 'EBUSY'].includes(error.code)) throw error;
      await delay(3000);
      continue;
    }
    if (fs.existsSync(filename) && journey.receiver) return journey.receiver;
    if (journey.status !== 'running') break;
    await delay(3000);
  }
  throw new Error('Sauvegarde du parcours Unity indisponible : ' + path.basename(filename));
}

async function verifyFilmSave(page, campaign, scene) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const save = await browserSave(page, campaign);
    const finished = Boolean(save?.viewedCinematics?.includes(scene.film));
    if (finished || (!scene.ending && save?.activeCinematicId === scene.film)) {
      if (scene.ending) {
        assert.equal(save.endingId, scene.ending);
        assert.equal(save.rewardReceipts.filter(id => id === 'reward:v5:' + scene.id).length, 1);
      }
      return {film: scene.film, ending: save.endingId, finished};
    }
    await delay(1000);
  }
  throw new Error('Cinématique attendue absente de la sauvegarde : ' + scene.film);
}

async function approachActor(page, receiver, campaign, actor) {
  await page.locator('#unity-canvas').focus();
  let distance;
  for (let attempt = 0; attempt < 24; attempt++) {
    await page.evaluate(receiver => instance.SendMessage(receiver, 'Save'), receiver);
    await delay(250);
    const save = await browserSave(page, campaign);
    const target = save?.characters.find(character => character.id === actor)?.position;
    assert.ok(target && save.playerPosition, 'Position du référent indisponible : ' + actor);
    const player = save.playerPosition;
    const dx = target.x - player.x, dz = target.z - player.z;
    distance = Math.hypot(dx, dz, target.y - player.y);
    if (distance < 2.8) return distance;
    const cameraYaw = await page.evaluate(() => thaleolithicDiagnostic().metrics?.yaw);
    assert.ok(Number.isFinite(cameraYaw), 'Orientation de la caméra indisponible');
    const yaw = cameraYaw * Math.PI / 180;
    const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const keys = [];
    if (distance > 6) keys.push('Shift');
    if (Math.abs(forward) >= .45 * Math.abs(right)) keys.push(forward > 0 ? 'w' : 's');
    if (Math.abs(right) >= .45 * Math.abs(forward)) keys.push(right > 0 ? 'd' : 'a');
    try {
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(distance > 6 ? 850 : 500);
    } finally {
      for (const key of keys.reverse()) await page.keyboard.up(key);
    }
  }
  throw new Error('Référent hors de portée : ' + actor + ' (' + distance.toFixed(1) + ' m)');
}

async function runScenes({page, origin, directory, report, record, waitState, gameplay, reportFile}) {
  const validation = path.join(directory, '..', 'validation.json');
  const filter = process.env.THALEOLITHIC_SCENE_FILTER?.split(',');
  report.sceneProfiles = [];
  report.sceneFailures = [];
  for (const [index, scene] of scenes.entries()) {
    if (filter && !filter.includes(scene.id)) continue;
    try {
      const fixture = path.join(directory, (scene.ending ? 'claim-' : 'action-') + scene.id + '.json');
      const receiver = await waitForFixture(fixture, validation);
      const campaign = await installSave(page, origin, fixture);
      const start = Date.now();
      await page.goto(origin + '?diagnostic=1', {waitUntil: 'domcontentloaded'});
      await page.waitForFunction(() => !document.getElementById('continue').disabled, null, {timeout: 180000});
      await page.locator('#continue').click();
      await waitState(gameplay);
      await page.waitForFunction(pack => {
        const state = window.ungaRuntime;
        return state?.player === 'dylan' && !state.film &&
          (!pack || state.chapterPacks?.split(',').includes(pack + ':ready'));
      }, scene.pack, {timeout: 30000});
      const resumedMs = Date.now() - start;
      const actorDistance = scene.actor ? await approachActor(page, receiver, campaign, scene.actor) : null;
      const trigger = Date.now();
      if (scene.ready !== 'village') {
        await page.evaluate(({receiver, action}) => instance.SendMessage(receiver, 'Execute', action),
          {receiver, action: scene.ending ? 'quest:details:' + scene.id : scene.id});
        if (scene.ending) {
          await waitState({window: 'Quête'});
          // Centre du bouton « Réclamer les récompenses » dans le Canvas 1920 × 1080 à 1280 × 720.
          await page.waitForTimeout(300);
          await page.mouse.click(637, 592);
        }
        await page.waitForFunction(({ready, id}) => {
          if (ready === 'activity') return thaleolithicDiagnostic().input?.activity === id;
          return Boolean(window.ungaRuntime?.[ready]);
        }, scene, {timeout: 45000});
        if (scene.ready === 'duel') {
          await page.evaluate(receiver => instance.SendMessage(receiver, 'ChooseMode', 0), receiver);
          await page.waitForFunction(() => window.ungaRuntime?.duel === 'Combat', null, {timeout: 45000});
        }
      }
      const entryMs = Date.now() - trigger;
      const profile = await page.evaluate(async ({ready, id}) => {
        const frames = [], memory = [];
        let activity = thaleolithicDiagnostic().input?.activity;
        const readInput = ({detail}) => { if (detail.type === 'input') activity = detail.activity; };
        addEventListener('unga-game', readInput);
        let previous = performance.now(), ended = false;
        const until = previous + 6000;
        let nextSample = previous;
        await new Promise(resolve => {
          function tick(now) {
            const state = window.ungaRuntime;
            if (now > nextSample) {
              const d = thaleolithicDiagnostic();
              memory.push({seconds: (now - (until - 6000)) / 1000, wasmMiB: d.wasmHeapMiB,
                jsMiB: d.jsHeapMiB, unity: d.metrics?.performance});
              nextSample += 1000;
            }
            if (ready === 'film' && !state?.film || ready === 'activity' && activity !== id) ended = true;
            frames.push(now - previous);
            previous = now;
            if (now >= until || ended) resolve();
            else requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
        removeEventListener('unga-game', readInput);
        const sorted = frames.sort((a, b) => a - b);
        const p = value => sorted[Math.ceil(sorted.length * value) - 1];
        return {frames: sorted.length, medianMs: p(.5), p95Ms: p(.95), p99Ms: p(.99),
          framesOver50ms: sorted.filter(ms => ms >= 50).length, ended, memory, state: window.ungaRuntime};
      }, scene);
      assert.ok(profile.frames > 2, 'Échantillon insuffisant');
      if (reportFile)
        await page.screenshot({path: path.join(path.dirname(reportFile), 'scene-' + (index + 1) + '.png')});
      if (scene.ending)
        await page.waitForFunction(() => window.ungaRuntime?.film === false, null, {timeout: 120000});
      const saved = scene.film ? await verifyFilmSave(page, campaign, scene) : null;
      report.sceneProfiles.push({name: scene.name, fixture: path.basename(fixture), resumedMs, entryMs, ...profile, saved, actorDistance});
      record(scene.name, {resumedMs, entryMs, p95Ms: profile.p95Ms});
    } catch (error) {
      const message = String(error);
      const state = await page.evaluate(() => ({runtime: window.ungaRuntime, diagnostic: window.thaleolithicDiagnostic?.()})).catch(() => null);
      report.sceneFailures.push({name: scene.name, error: message, state});
      record(scene.name + ' — mesure indisponible', message);
    }
    if (reportFile) fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  }
  assert.ok(report.sceneProfiles.length || report.sceneFailures.length, 'Aucune scène sélectionnée');
  assert.equal(report.sceneFailures.length, 0, 'Scènes sans mesure');
}

module.exports = {installSave, runScenes};

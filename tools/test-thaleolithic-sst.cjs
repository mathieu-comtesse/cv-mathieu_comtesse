const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {installSave, approachActor, browserSave} = require('./thaleolithic-scene-bench.cjs');

const objective = 'grand_menhir';
const assembly = 'V17_SYSTEM';
const contextQuest = 'V17_CONTEXT';
const hasRibbon = version => ['V24.3', 'V24.4'].includes(version);

async function runSst({page, origin, filename, mobile, record, waitState, gameplay, reportFile, buildVersion}) {
  const receiver = JSON.parse(fs.readFileSync(path.resolve(path.dirname(filename), '../validation.json'), 'utf8')).receiver;
  const metric = () => page.evaluate(() => thaleolithicDiagnostic().metrics);
  const shot = async name => {
    if (reportFile) await page.screenshot({path: reportFile.replace(/\.json$/, '') + '-' + name + '.png'});
  };
  const wait = (source, value, timeout = 20000) =>
    page.waitForFunction(source, value, {timeout, polling: 125});
  const boot = async expected => {
    await page.goto(origin + '?diagnostic=1', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !document.querySelector('#continue').disabled, null, {timeout: 180000});
    await page.locator('#continue').click();
    await waitState(expected ?? gameplay);
  };
  const execute = action => page.evaluate(({receiver, action}) => instance.SendMessage(receiver, 'Execute', action),
    {receiver, action});
  const tap = (x, y) => mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
  const input = async () => {
    if (mobile) {
      const {width, height} = page.viewportSize();
      await tap(width - 83, height - 46);
    } else {
      await page.locator('#unity-canvas').focus();
      await page.keyboard.press('e');
    }
  };
  const panel = async () => {
    const {width, height} = page.viewportSize();
    const native = await page.locator('#unity-canvas').evaluate(canvas => ({width: canvas.width, height: canvas.height}));
    const nativeMobile = mobile && native.width < 1000;
    const scale = nativeMobile ? width / native.width : Math.min(width / 1920, height / 1080);
    const rootWidth = nativeMobile ? Math.max(280, native.width - 24) : 1420;
    const rootHeight = nativeMobile ? Math.min(native.height - 24, 920) : 920;
    const innerWidth = rootWidth - 44;
    return {x: width / 2 - innerWidth * scale / 2, y: height / 2 - (rootHeight / 2 - 12) * scale,
      scale, innerWidth, nativeMobile};
  };
  const answer = async (i, drag = false) => {
    const p = await panel();
    const usable = p.innerWidth - 28;
    const narrow = p.innerWidth < 590;
    const width = narrow ? usable : (usable - 20) / 3;
    const y = (p.nativeMobile ? 245 : 336) + (narrow ? i * 57 + 25 : p.nativeMobile ? 30 : 42);
    const x = p.x + (14 + (narrow ? 0 : i * (width + 10)) + width / 2) * p.scale;
    if (drag && !mobile) {
      await page.mouse.move(page.viewportSize().width / 2, p.y + 260 * p.scale);
      await page.mouse.down();
      await page.mouse.move(x, p.y + y * p.scale, {steps: 12});
      await page.mouse.up();
    } else await tap(x, p.y + y * p.scale);
    await page.waitForTimeout(500); // Unity keeps the answer locked while its feedback is displayed.
  };
  const linked = number => wait(value => thaleolithicDiagnostic().metrics?.sst?.linked === value, number);

  await page.waitForTimeout(6500);
  const campaign = await installSave(page, origin, filename);
  await boot();
  if (mobile) {
    const viewport = await page.evaluate(() => ({width: innerWidth, height: innerHeight, touches: navigator.maxTouchPoints}));
    assert.equal(viewport.width, 852);
    assert.equal(viewport.height, 393);
    assert.ok(viewport.touches > 0);
    record('Fenêtre tactile réellement appliquée', viewport);
  }
  if (process.env.THALEOLITHIC_GPS_TRAVEL) {
    await runRibbon({page, receiver, metric, shot, record, buildVersion, mobile});
    return;
  }
  if (process.env.THALEOLITHIC_SCOPE_GUIDE === '1') {
    const activity = 'V17_SCOPE';
    const readProgress = async () => (await browserSave(page, campaign)).campaignV17.activities.find(a => a.id === activity);
    await wait(id => thaleolithicDiagnostic().metrics?.objective?.action === id, activity);
    const distance = await approachActor(page, receiver, campaign, 'aurelien');
    record('Aurélien à portée pour lancer le périmètre SST', distance);
    await execute(activity);
    await waitState({window: 'Activité', activity});
    await wait(() => thaleolithicDiagnostic().metrics?.objective?.guide === true);
    await shot('premiere-consigne');
    const p = await panel();
    const buttonY = p.nativeMobile ? 291 : 409;
    await tap(p.x + (16 + (p.innerWidth - 44) * .27) * p.scale, p.y + buttonY * p.scale);
    await wait(() => thaleolithicDiagnostic().metrics?.objective?.guide === false);
    await page.locator('#unity-canvas').focus();
    await page.keyboard.press('1', {delay: 150});
    await page.waitForTimeout(2300);
    assert.equal((await readProgress()).answers.length, 1);
    const saved = await browserSave(page, campaign);
    const actor = saved.characters.find(entry => entry.id === 'aurelien').position;
    const d = saved.playerPosition;
    record('Première réponse enregistrée avant rechargement', {distance: Math.hypot(actor.x - d.x, actor.y - d.y, actor.z - d.z)});
    await boot({window: 'Activité', activity});
    await wait(() => thaleolithicDiagnostic().metrics?.objective?.guide === false);
    const progress = await readProgress();
    assert.equal(progress.guideSeen, true);
    assert.equal(progress.card, 1);
    await shot('reprise-sans-tutoriel');
    record('Périmètre SST : tutoriel de première utilisation, réponse conservée et reprise directe', progress);
    return;
  }
  if (!hasRibbon(buildVersion)) {
    await page.waitForTimeout(1600);
    await shot('gps');
    await execute(assembly);
    await waitState({window: 'Activité'});
    await shot('sst');
    record('Référence du parcours et de l’assemblage');
    return;
  }

  await wait(id => thaleolithicDiagnostic().metrics?.gps?.objective === id, objective);
  if (buildVersion === 'V24.4') {
    const step = (await metric()).objective;
    assert.equal(step.action, assembly);
    assert.equal(step.target, objective);
    assert.equal(step.helper, 'mathieu');
    assert.equal(step.giver, 'aurelien');
    assert.equal(step.finished, 3);
    await page.waitForTimeout(3000);
    const after = (await metric()).objective.resolved;
    assert.ok(after - step.resolved < 8, 'Le résolveur doit réutiliser son cache quand le joueur reste au même objectif');
    record('Résolution mise en cache à objectif constant', {before: step.resolved, after});
  }
  await shot('gps');
  if (mobile && process.env.THALEOLITHIC_HUD_LAYOUT === '1') {
    await page.setViewportSize({width: 667, height: 375});
    await wait(() => innerWidth === 667 && innerHeight === 375);
    await page.waitForTimeout(1000);
    await shot('gps-667');
    await page.setViewportSize({width: 852, height: 393});
    await wait(() => innerWidth === 852 && innerHeight === 393);
    await waitState(gameplay);
  }
  record('Grand Menhir comme objectif du SST', (await metric()).gps);
  await input();
  await waitState({window: 'Activité', activity: assembly});
  await wait(() => thaleolithicDiagnostic().metrics?.sst?.intro === true);
  await shot('intro');
  await wait(() => thaleolithicDiagnostic().metrics?.sst?.intro === false);
  await linked(0);
  await shot('sst');
  record('Introduction courte suivie du mini-jeu');

  await answer(1);
  await wait(() => thaleolithicDiagnostic().metrics?.sst?.phase === 'Error');
  assert.equal((await metric()).sst.linked, 0);
  await shot('erreur');
  await answer(0);
  await linked(1);
  await answer(1);
  await linked(2);
  await shot('deux-tablettes');
  await page.waitForTimeout(2200);
  assert.equal((await browserSave(page, campaign)).campaignV17.activities.find(a => a.id === assembly).answers.length, 2);
  const automatic = buildVersion === 'V24.4';
  await boot(automatic ? {window: 'Activité', activity: assembly} : undefined);
  await linked(2);
  if (!automatic) {
    await input();
    await waitState({window: 'Activité', activity: assembly});
  }
  await wait(() => thaleolithicDiagnostic().metrics?.sst?.feedback?.includes('Assemblage repris'));
  assert.equal((await metric()).sst.intro, false);
  await shot('reprise');
  record('Erreur récupérable et reprise à la troisième tablette', (await metric()).sst);

  await answer(2, buildVersion === 'V24.4');
  await linked(3);
  await answer(0);
  await linked(4);
  await shot('valider');
  const p = await panel();
  await tap(page.viewportSize().width / 2, p.y + (p.nativeMobile ? 210 : 286) * p.scale);
  await waitState(gameplay);
  await wait(() => {
    const sample = thaleolithicDiagnostic().metrics;
    return sample?.gps?.objective === 'aurelien' && sample.sst.completed;
  });
  await shot('retour-aurelien');
  record('Validation SST, retour des commandes et nouvelle destination', await metric());

  if (!mobile) {
    await approachActor(page, receiver, campaign, 'aurelien');
    await execute('quest:details:' + contextQuest);
    await waitState({window: 'Quête'});
    await page.waitForTimeout(350);
    await tap(637, 592);
    await page.waitForTimeout(1000);
    const save = await browserSave(page, campaign);
    assert.equal(save.quests.find(quest => quest.id === contextQuest).validated, true);
    await shot('mission-validee');
    record('Vérification de la mission auprès d’Aurélien');
  }
}

async function runRibbon({page, receiver, metric, shot, record, buildVersion, mobile}) {
  const follow = binding => page.evaluate(({receiver, binding}) =>
    instance.SendMessage(receiver, 'Follow', 'travel:' + binding), {receiver, binding});
  const target = process.env.THALEOLITHIC_GPS_TRAVEL;
  await follow(target);
  const candidate = hasRibbon(buildVersion);
  if (candidate) {
    await page.waitForFunction(id => {
      const gps = thaleolithicDiagnostic().metrics?.gps;
      return gps?.objective === id && gps.visible && gps.visibleLength > 3 && gps.mapRouteVisible;
    }, target, {timeout: 20000});
  } else await page.waitForTimeout(2700);
  const resumeCamera = page.locator('#resume-pointer');
  if (await resumeCamera.isVisible()) await resumeCamera.click();
  await shot('trajet');
  const atStart = await metric();
  if (atStart.objective?.command) {
    assert.equal(atStart.objective.phase, 'Travel');
    if (mobile) assert.equal(atStart.objective.command, 'Joystick');
    else assert.match(atStart.objective.command, /W A S D/);
  }
  record('Trajet de comparaison vers le même lieu', atStart);
  if (candidate && mobile) {
    const client = await page.context().newCDPSession(page);
    const touch = (type, touchPoints) => client.send('Input.dispatchTouchEvent', {type, touchPoints});
    const before = await page.evaluate(() => ({position: ungaRuntime.position, ...thaleolithicDiagnostic().metrics}));
    await touch('touchStart', [{x: 76, y: 315, id: 1}, {x: 470, y: 180, id: 2}]);
    try {
      await touch('touchMove', [{x: 76, y: 350, id: 1}, {x: 710, y: 180, id: 2}]);
      await page.waitForFunction(start => {
        const position = ungaRuntime.position;
        const value = thaleolithicDiagnostic().metrics;
        return value.touches === 2 && Math.abs(value.yaw - start.yaw) > 5 &&
          Math.hypot(position.x - start.position.x, position.z - start.position.z) > .3;
      }, before, {timeout: 12000});
    } finally { await touch('touchEnd', []); }
    const after = await metric();
    assert.ok(after.gps.visible && after.gps.mapRouteVisible, 'Le ruban et la carte doivent rester visibles sous joystick et caméra');
    assert.equal(after.gps.hiddenCount, before.gps.hiddenCount);
    await shot('joystick-camera');
    record('Ruban et carte visibles pendant le déplacement et la rotation tactiles', after);
    return;
  }
  const seconds = Number(process.env.THALEOLITHIC_GPS_WALK_SECONDS || 0);
  if (!candidate || !seconds) {
    if (process.env.THALEOLITHIC_RECORD_DIR) await page.waitForTimeout(6000);
    return;
  }

  await page.locator('#unity-canvas').focus();
  const started = Date.now(), end = started + seconds * 1000;
  const samples = [];
  let binding = target, last, walked = 0;
  while (Date.now() < end) {
    const sample = await page.evaluate(() => ({
      gps: thaleolithicDiagnostic().metrics.gps, yaw: thaleolithicDiagnostic().metrics.yaw,
      player: window.ungaRuntime.position
    }));
    const {gps, player, yaw} = sample;
    if (last) walked += Math.hypot(player.x - last.x, player.z - last.z);
    last = player;
    samples.push({at: (Date.now() - started) / 1000, ...sample});
    if (gps.objective !== binding || gps.state === 'OBJECTIVE_REACHED') {
      binding = binding === target ? 'grand_menhir' : target;
      await follow(binding);
      await page.waitForTimeout(1100);
      continue;
    }
    if (!gps.visible) {
      await page.waitForTimeout(300);
      continue;
    }
    const x = gps.nextPoint.x - player.x, z = gps.nextPoint.z - player.z;
    const bearing = yaw * Math.PI / 180;
    const forward = x * Math.sin(bearing) + z * Math.cos(bearing);
    const right = x * Math.cos(bearing) - z * Math.sin(bearing);
    const keys = [];
    if (Math.abs(forward) >= .42 * Math.abs(right)) keys.push(forward > 0 ? 'w' : 's');
    if (Math.abs(right) >= .42 * Math.abs(forward)) keys.push(right > 0 ? 'd' : 'a');
    try {
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(500);
    } finally {
      for (const key of keys.reverse()) await page.keyboard.up(key);
    }
  }
  record('Marche instrumentée', {seconds: (Date.now() - started) / 1000, walked, samples});
  assert.ok(walked > 15, 'Déplacement insuffisant pour évaluer la continuité du ruban');
}

module.exports = {runSst};

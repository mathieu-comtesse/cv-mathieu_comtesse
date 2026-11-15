'use strict';

const select = id => document.getElementById(id);
let canvas = select('unity-canvas');
const welcome = select('welcome'), label = select('loading-label');
const failure = select('error'), resumePointer = select('resume-pointer'), resumeGame = select('resume-game');
const diagnosticMode = new URLSearchParams(location.search).get('diagnostic') === '1';
const inputLog = [], performanceSamples = [];
let instance, bootTask, ready = false, saved = false, customOptions = false;
let phase = 'NOT_STARTED', step = 'WEBGL', build = 'inconnu', request = 0, sequence = 0;
let startDeadline, inputState, lastFocus, lastError, engineFault, metrics, retrying = false;
let lastAck = 0, lastEngineError = '', lastUnityEvent = null;
const journalKey = 'thaleolithic.boot.' + location.pathname;
let previousBoot = null;
try { previousBoot = JSON.parse(sessionStorage.getItem(journalKey)); } catch {}

function rememberBoot(source) {
  try {
    sessionStorage.setItem(journalKey, JSON.stringify({
      build, phase, step, source, atMs: Math.round(performance.now()),
      visible: !document.hidden, lastUnityEvent, error: lastError, engineError: lastEngineError
    }));
  } catch {}
}

function setStep(value) {
  step = value;
  rememberBoot('step');
}

function log(source) {
  inputLog.push({source, at: Math.round(performance.now()), phase, step, ...inputState});
  if (inputLog.length > 100) inputLog.shift();
}

function diagnostic() {
  const agent = navigator.userAgent;
  const browser = /(?:EdgA?|EdgiOS|CriOS|Chrome|Firefox|FxiOS|Version)\/\d+/i.exec(agent)?.[0] ?? 'inconnu';
  const resources = performance.getEntriesByType('resource').filter(entry => {
    const path = new URL(entry.name, location.href).pathname;
    return /\/(?:game-config\.json|Web-[^/]+|iso-\d{2}-[a-f0-9]+\.bundle)$/.test(path);
  }).slice(-16).map(entry => ({file: new URL(entry.name).pathname.split('/').at(-1),
    ms: Math.round(entry.duration), bytes: entry.transferSize, status: entry.responseStatus || null}));
  return {build, browser, phase, step, error: lastError, engineError: lastEngineError,
    boot: {previous: previousBoot, lastUnityEvent, resources, navigation: performance.getEntriesByType('navigation')[0]?.type},
    chapters: window.ungaRuntime?.chapterPacks ?? null,
    viewport: {width: canvas.clientWidth, height: canvas.clientHeight, pixelRatio: renderRatio()},
    focus: document.hasFocus(), visible: !document.hidden, pointer: document.pointerLockElement === canvas,
    touchPoints: navigator.maxTouchPoints, jsHeapMiB: performance.memory?.usedJSHeapSize / 1048576 || null,
    wasmHeapMiB: (instance?.Module?.HEAPU8 ?? instance?.Module?.HEAP8)?.buffer.byteLength / 1048576 || null,
    lastAck, input: inputState, metrics, transitions: inputLog.slice(), samples: performanceSamples.slice()};
}

function failureText(value) {
  return String(value ?? '').replace(/https?:\/\/[^\s"'<>]+/gi, '[URL]').slice(0, 600);
}

function setPhase(value, source) {
  phase = value;
  welcome.dataset.phase = phase;
  log(source);
  rememberBoot(source);
}

function fail(code, message, recoverEngine = false) {
  if (phase === 'FAILED') return;
  clearTimeout(startDeadline);
  if (recoverEngine) engineFault = true;
  lastError = {code, step, message: failureText(message)};
  setPhase('FAILED', code);
  select('error-message').textContent = `${code} · ${step} · ${build} — ${lastError.message}`;
  select('error-environment').textContent = `${diagnostic().browser} · ${canvas.clientWidth} × ${canvas.clientHeight}`;
  failure.hidden = false;
  syncFocus('error');
  refresh();
}

function send(method, value) {
  instance?.SendMessage('UNGA_WEB_BRIDGE', method, JSON.stringify(value));
}

function renderRatio() {
  const box = canvas.getBoundingClientRect();
  return ThaleolithicRenderBudget.pixelRatio(box.width, box.height, devicePixelRatio, Number(select('quality').value));
}

function viewport() {
  const box = canvas.getBoundingClientRect();
  if (!instance || !ready) return;
  if (instance.Module) instance.Module.devicePixelRatio = renderRatio();
  send('BrowserViewport', {width: box.width, height: box.height,
    touch: matchMedia('(pointer:coarse)').matches && navigator.maxTouchPoints > 0});
}

function canFocus() {
  return document.hasFocus() && !document.hidden && failure.hidden && !document.querySelector('dialog[open]');
}

function syncFocus(source, forceHidden = false, resume = false, gesture = false, forceBlur = false) {
  if (!instance || !ready) return;
  const state = {focused: !forceHidden && !forceBlur && document.hasFocus(), visible: !forceHidden && !document.hidden,
    menu: !failure.hidden || !!document.querySelector('dialog[open]'), pointer: document.pointerLockElement === canvas,
    resume, diagnostic: diagnosticMode};
  const key = JSON.stringify(state);
  if (key === lastFocus && !resume && !gesture) return;
  lastFocus = key;
  send(gesture ? 'BrowserPointerGesture' : 'BrowserFocus', {...state, sequence: ++sequence});
  log(source);
}

function refresh() {
  const running = phase === 'RUNNING';
  const canStart = ready && !!instance && phase === 'NOT_STARTED';
  welcome.hidden = running;
  welcome.dataset.ready = String(canStart);
  select('play').disabled = !canStart;
  select('continue').disabled = !canStart || !saved;
  select('continue').title = saved ? 'Reprendre ta sauvegarde' : 'Aucune sauvegarde dans ce navigateur';
  select('tools').style.display = running && inputState?.controls ? 'block' : 'none';
  resumePointer.hidden = !(running && canFocus() && inputState?.controls && !inputState.touch &&
    !document.pointerLockElement && !!canvas.requestPointerLock);
  resumeGame.hidden = !(running && canFocus() && inputState?.resumeRequired);
  select('retry').disabled = !!bootTask || retrying;
  if (diagnosticMode && select('dev-diagnostic').open) select('diagnostic-data').textContent = JSON.stringify(diagnostic(), null, 2);
}

function engineReady() {
  if (!ready || !instance || phase !== 'NOT_STARTED') return;
  label.textContent = saved ? 'Ta sauvegarde est disponible.' : 'Le village est prêt.';
  viewport();
  syncFocus('ready');
  refresh();
}

function finishStart(event) {
  if (event.request !== request || !['START_REQUESTED', 'INITIALIZING'].includes(phase)) return;
  clearTimeout(startDeadline);
  saved = event.saved;
  setPhase('READY_TO_PLAY', event.type);
  setStep('GAMEPLAY');
  setPhase('RUNNING', 'confirmed');
  canvas.tabIndex = 0;
  if (canFocus()) canvas.focus({preventScroll: true});
  syncFocus('begin');
  refresh();
}

window.addEventListener('unga-game', ({detail: event}) => {
  if (['ready', 'GAME_STARTING', 'GAME_STARTED', 'GAME_START_FAILED'].includes(event.type)) {
    lastUnityEvent = {type: event.type, atMs: Math.round(performance.now()), code: event.code || null};
    rememberBoot('unity');
  }
  switch (event.type) {
    case 'ready':
      ready = true;
      saved = event.saved;
      if (!customOptions) {
        select('input-mode').value = String(event.inputMode ?? 0);
        select('quality').value = String(event.graphicsProfile ?? 3);
      }
      queueMicrotask(engineReady);
      break;
    case 'GAME_STARTING':
      if (phase === 'START_REQUESTED' && event.request === request) setPhase('INITIALIZING', event.type);
      break;
    case 'GAME_STARTED':
      queueMicrotask(() => finishStart(event));
      break;
    case 'GAME_START_FAILED':
      if (!event.request || event.request === request) {
        queueMicrotask(() => {
          setStep(event.phase);
          fail(event.code, event.message, !event.request);
        });
      }
      break;
    case 'BROWSER_ACK':
      lastAck = event.sequence;
      break;
    case 'state':
      window.ungaRuntime = Object.freeze(event);
      break;
    case 'input':
      inputState = event;
      if (!event.controls && document.pointerLockElement === canvas) document.exitPointerLock();
      log('unity');
      refresh();
      break;
    case 'diagnostic':
      metrics = event;
      if (event.performance?.frames) {
        performanceSamples.push({atMs: Math.round(performance.now()), act: window.ungaRuntime?.act ?? '',
          phase: inputState?.phase ?? '', ...event.performance});
        if (performanceSamples.length > 180) performanceSamples.shift();
      }
      refresh();
      break;
  }
});

function begin(mode) {
  if (phase !== 'NOT_STARTED' || !ready || !instance) return;
  const current = ++request;
  setStep('CAMPAIGN');
  setPhase('START_REQUESTED', mode);
  label.textContent = 'Initialisation de la partie…';
  refresh();
  startDeadline = setTimeout(() => fail('START_TIMEOUT', 'Unity n’a pas confirmé le démarrage de la campagne.'), 45000);
  try {
    viewport();
    syncFocus('start-request');
    send('Configure', {inputMode: Number(select('input-mode').value), graphicsProfile: Number(select('quality').value)});
    send('BeginGame', {mode, request: current});
  } catch (error) {
    fail('BRIDGE_SEND', error.message);
  }
}

function pointerGesture(event) {
  if (!event.isTrusted || phase !== 'RUNNING' || !canFocus()) return;
  canvas.focus({preventScroll: true});
  if (!inputState?.controls || inputState.touch || document.pointerLockElement || !canvas.requestPointerLock) return;
  try {
    const result = canvas.requestPointerLock();
    result?.catch(error => { lastEngineError = failureText(error.message); log('pointer-error'); refresh(); });
    syncFocus('pointer-gesture', false, false, true);
  } catch (error) {
    lastEngineError = failureText(error.message);
    log('pointer-error');
    refresh();
  }
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', event => {
    if (event.button === 0 && event.pointerType !== 'touch') pointerGesture(event);
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fail('WEBGL_CONTEXT_LOST', 'Le navigateur a interrompu le rendu 3D.', true);
  });
}
bindCanvas();
resumePointer.addEventListener('pointerdown', event => { if (event.button === 0) pointerGesture(event); });
resumePointer.addEventListener('keydown', event => {
  if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) pointerGesture(event);
});
resumeGame.addEventListener('click', () => {
  canvas.focus({preventScroll: true});
  syncFocus('resume', false, true);
});
document.addEventListener('pointerlockchange', () => {
  syncFocus('pointerlock');
  refresh();
});
document.addEventListener('pointerlockerror', () => { log('pointer-error'); refresh(); });
for (const type of ['keydown', 'keypress', 'keyup']) window.addEventListener(type, event => {
  if (phase !== 'RUNNING' || !canFocus()) event.stopImmediatePropagation();
}, true);

select('play').onclick = () => {
  if (!saved) { begin('new'); return; }
  select('new-dialog').showModal();
  syncFocus('dialog-open');
};
select('new-dialog').addEventListener('close', () => syncFocus('dialog-close'));
select('continue').onclick = () => begin('continue');
select('cancel-new').onclick = () => select('new-dialog').close();
select('confirm-new').onclick = () => { select('new-dialog').close(); begin('new'); };
for (const [button, dialog] of [['commands', 'command-dialog'], ['settings', 'settings-dialog'], ['credits', 'credits-dialog']]) {
  const panel = select(dialog);
  select(button).onclick = () => { panel.showModal(); syncFocus('dialog-open'); };
  panel.querySelector('button').onclick = () => panel.close();
  panel.addEventListener('close', () => syncFocus('dialog-close'));
}
for (const id of ['input-mode', 'quality']) select(id).addEventListener('change', () => { customOptions = true; viewport(); });
select('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else instance.SetFullscreen(1);
  } finally { canvas.focus({preventScroll: true}); }
};

function browserChange(source, hidden = false, blurred = false) {
  if (phase === 'RUNNING' && !hidden && !blurred && canFocus() && resumeGame.hidden) canvas.focus({preventScroll: true});
  syncFocus(source, hidden, false, false, blurred);
  refresh();
}
addEventListener('resize', viewport);
window.visualViewport?.addEventListener('resize', viewport);
document.addEventListener('visibilitychange', () => browserChange('visibility'));
addEventListener('blur', () => browserChange('blur', false, true));
addEventListener('focus', () => browserChange('focus'));
addEventListener('pagehide', () => {
  rememberBoot('pagehide');
  browserChange('pagehide', true);
});
addEventListener('pageshow', () => browserChange('pageshow'));
addEventListener('error', event => {
  lastEngineError = failureText(event.message);
  rememberBoot('error');
});
addEventListener('unhandledrejection', event => { lastEngineError = failureText(event.reason?.message ?? event.reason); });
addEventListener('unga-save-error', () => {
  select('save-warning').textContent = 'La sauvegarde locale a échoué. Vérifie le stockage de ce navigateur.';
  log('save-error');
});

function download(contents, type, filename) {
  const url = URL.createObjectURL(new Blob([contents], {type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadDiagnostic() {
  download(JSON.stringify(diagnostic(), null, 2), 'application/json', 'thaleolithic-diagnostic.json');
}
function downloadMetrics() {
  const fields = ['atMs', 'act', 'phase', 'frames', 'fps', 'medianMs', 'p95Ms', 'p99Ms', 'cpuMs', 'gpuMs',
    'allocatedMiB', 'peakMiB', 'reservedMiB', 'gcBytes', 'drawCalls', 'setPassCalls', 'triangles', 'profile', 'renderScale', 'animatedActors'];
  const escape = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const csv = [fields.join(','), ...performanceSamples.map(row => fields.map(field => escape(row[field])).join(','))].join('\n');
  download(csv, 'text/csv;charset=utf-8', 'thaleolithic-performances.csv');
}
select('copy-diagnostic').onclick = async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(diagnostic(), null, 2)); }
  catch { downloadDiagnostic(); }
};
select('download-diagnostic').onclick = downloadDiagnostic;
select('download-metrics').onclick = downloadMetrics;
select('dev-diagnostic').addEventListener('toggle', refresh);
select('dev-diagnostic').hidden = !diagnosticMode;
if (diagnosticMode) {
  window.thaleolithicInputLog = () => inputLog.map(entry => ({...entry}));
  window.thaleolithicDiagnostic = diagnostic;
}

async function boot() {
  if (bootTask || instance) return;
  bootTask = Promise.resolve().then(async () => {
    let timeout;
    try {
      setStep('WEBGL');
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) throw new Error('WebGL 2 est requis.');
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      setStep('CONFIG');
      const controller = new AbortController();
      const configTimer = setTimeout(() => controller.abort(), 20000);
      const config = await fetch('game-config.json', {cache: 'no-cache', signal: controller.signal}).then(response => {
        if (!response.ok) throw new Error(`Configuration indisponible (HTTP ${response.status}).`);
        return response.json();
      }).finally(() => clearTimeout(configTimer));
      build = config.version ?? /Web-([^./]+(?:\.[^./]+)?)\.loader/.exec(config.loaderUrl)?.[1] ?? 'inconnu';
      setStep('LOADER');
      if (typeof createUnityInstance !== 'function') await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = config.loaderUrl;
        const timer = setTimeout(() => { script.remove(); reject(new Error('Délai du chargeur Unity dépassé.')); }, 30000);
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Chargeur Unity indisponible.')); };
        document.body.append(script);
      });
      setStep('ENGINE');
      timeout = setTimeout(() => fail('ENGINE_TIMEOUT', 'Le moteur Unity n’a pas fini de charger.'), 120000);
      instance = await createUnityInstance(canvas, {...config, companyName: 'Talas', productName: 'THALEOLITHIC',
        productVersion: config.productVersion ?? '0.24.1', autoSyncPersistentDataPath: true, devicePixelRatio: renderRatio(),
        showBanner: (message, type) => { if (type === 'error') lastEngineError = failureText(message); }
      }, progress => {
        select('progress').value = progress;
        if (phase !== 'FAILED') label.textContent = progress < 1
          ? `Chargement du village · ${Math.round(progress * 100)} %`
          : 'Préparation des personnages et des chemins…';
      });
      setStep('SCENE');
      if (!ready && phase !== 'FAILED') startDeadline = setTimeout(() => {
        if (!ready) fail('SCENE_TIMEOUT', 'Le pont Unity n’a pas confirmé la préparation de la scène.', true);
      }, 25000);
      engineReady();
    } catch (error) {
      fail(`${step}_FAILED`, error.message, step === 'ENGINE');
    } finally {
      clearTimeout(timeout);
      bootTask = null;
      refresh();
    }
  });
  refresh();
  await bootTask;
}

select('retry').onclick = async () => {
  if (bootTask || retrying) return;
  if (engineFault && instance) {
    retrying = true;
    refresh();
    try { await instance.Quit(); }
    catch (error) {
      lastEngineError = failureText(error.message);
      select('error-environment').textContent = 'La fermeture du moteur a échoué. Le diagnostic est disponible.';
      return;
    } finally {
      retrying = false;
      refresh();
    }
    instance = null;
  }
  if (engineFault) {
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    canvas = replacement;
    bindCanvas();
    ready = false;
    inputState = null;
    engineFault = false;
  }
  failure.hidden = true;
  setPhase('NOT_STARTED', 'retry');
  refresh();
  if (!instance) await boot();
  else {
    syncFocus('retry');
    engineReady();
  }
};

refresh();
void boot();
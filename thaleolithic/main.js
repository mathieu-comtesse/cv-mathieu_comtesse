// THALEOLITHIC papier : charge les données du jeu Unity telles quelles, puis relie la campagne, le village et l'interface.
import { createCampaign } from './campaign.js';
import { buildVillage } from './scene.js';
import { createUI } from './ui.js';
import { installTiles, paperize, cutLetters } from './paper-ui.js';
import { createSound } from './sound.js';
import { createCinema } from './cine.js';
import { createTalk } from './talk.js';
import { createStats } from './stats.js';
import { createNav } from './nav.js';

// the windows are printed on the village's own paper: tiles for the small pieces, a printed card behind each sheet
installTiles();
paperize(document.getElementById('hud'), { seed: 3, style: 'hud' });
paperize(document.getElementById('panel'), { seed: 5, style: 'sheet', quantize: 36, watch: document.getElementById('panel-body') });
paperize(document.querySelector('#intro .paper'), { seed: 7, style: 'sheet' });
paperize(document.getElementById('prompt'), { seed: 9, style: 'slip' });
paperize(document.getElementById('pin'), { seed: 13, style: 'pin' });
paperize(document.getElementById('work'), { seed: 17, style: 'slip' });
const PLATES = ['#f4e6c6', '#f3c878', '#dfe3b4', '#d8d2e6', '#f4e6c6', '#f3c878'];
document.querySelectorAll('#tools .btn').forEach((b, i) => paperize(b, { seed: 20 + i, style: 'tag', color: PLATES[i] }));
cutLetters(document.querySelector('#intro h1'), { chips: true });

const RES = 'Source/Resources/';
const load = (f) => fetch(RES + f).then((r) => { if (!r.ok) throw new Error(f + ' : ' + r.status); return r.json(); });
const [v17, menhir, base, legacy] = await Promise.all(['CampaignV17.json', 'MenhirDuel.json', 'UngaBungaCampaign.json', 'UngaBungaQuests.json'].map(load));
let storage = null; try { storage = localStorage; localStorage.getItem('x'); } catch { storage = null; }
const Q = new URLSearchParams(location.search);
const campaign = createCampaign({ v17, menhir, base, legacy, storage: Q.has('capture') ? null : storage });
const world = buildVillage(campaign);
const ui = createUI(campaign, world);
const { H } = world;

// sound: unlocked by the first gesture (browsers ask it), N mutes; the beds follow the weather and the nearest fire
const sfx = createSound(); H.sfx = sfx;
// speech: the lines write themselves letter by letter and the speaker grunts each syllable as it lands (talk.js)
const talk = createTalk({ sfx, onSyllable: (id, d) => world.talkPulse(id, d) }); world.talk = talk;
addEventListener('pointerdown', (e) => { if (e.target.closest('.speech, #cine .sub')) talk.skip(); });
const cinema = createCinema({ campaign, world, ui, sfx, data: base, menhir });
addEventListener('pointerdown', () => sfx.unlock(), { capture: true }); addEventListener('keydown', (e) => { sfx.unlock(); if (e.code === 'KeyN' && !e.repeat) sfx.mute(); }, { capture: true });
document.addEventListener('click', (e) => { if (e.target.closest('.btn')) sfx.play('bone', { f: 1500 + Math.random() * 700, v: 0.2 }); });
// the story's sounds: an action done, a proof verified, a mistake, a quest completed, the fire alarm, the end
const tally = () => { const st = campaign.state; return { done: st.done.length, quests: campaign.data.quests.filter((q) => campaign.questDone(q)).length, proofs: st.evidence.filter((e) => e.stage === 3).length,
  mistakes: Object.values(st.progress).reduce((n, p) => n + (p.mistakes || 0), 0), frontier: campaign.frontier()?.id, ending: !!st.ending, done_q: campaign.data.quests.filter((q) => campaign.questDone(q)).map((q) => q.id) }; };
let was = tally(), accShown = null;
campaign.on(() => {
  const now = tally();
  if (now.ending && !was.ending) sfx.play('ending'); else if (now.quests > was.quests) sfx.play('quest'); else if (now.proofs > was.proofs) sfx.play('evidence'); else if (now.done > was.done) sfx.play('action');
  if (now.mistakes > was.mistakes) sfx.play('log');
  if (now.frontier === 'V17_EMERGENCY' && was.frontier !== 'V17_EMERGENCY') sfx.play('alarm');
  const acc = campaign.state.accident; if (acc && !acc.played && acc !== accShown) { accShown = acc; ui.close(); cinema.accident(acc); }   // a death: its cinematic
  cinema.tour(world.takeSwaps());   // the dwellings that change, one after the other, before the chapter's own cinematic
  for (const q of now.done_q) if (!was.done_q.includes(q)) cinema.after(q);   // C02, C03, C06 when their chapter ends
  was = now;
});
let stride = 0, foot = 0;

// the marker over the place where the next action happens (or the place chosen on the map)
const pin = document.getElementById('pin'), v = new H.THREE.Vector3();
let last = H.hero.group.position.clone();
H.onStep((t, dt) => {
  cinema.step(dt);
  ui.step(dt);
  talk.step(dt);
  // the village lives: the tribe's needs and tasks (not during the evacuation, which leads everyone itself), Dylan's survival
  if (!world.evacuating && dt > 0) { campaign.villageStep(dt, world.arrivedAt, world.moving); world.lead(campaign, dt); }
  const p = H.hero.group.position, dist = p.distanceTo(last), moved = dist > 1e-4; last.copy(p);
  if (dt > 0) campaign.survive(dt, moved, world.near('repos', 4));
  world.duelStep(dt, campaign.duel.s, ui.mode === 'duel');   // the duel is fought in the village, before the Grand Menhir
  sfx.step(dt, { gust: world.weather.gust, rain: world.weather.rain, fire: world.fireNear(p.x, p.z), river: world.riverNear(p.x, p.z) });
  // Dylan's paper footsteps, one per step of his stride (1.15 units), on the beaten earth or the grass
  if (moved && dist < 2) { stride += dist; if (stride > 1.15) { stride -= 1.15; foot ^= 1; H.sound?.step({ surface: world.onPath?.(p.x, p.z) ? 'path' : 'grass', foot }); } }
  if (world.guide && world.near(world.guide)) world.guide = null;   // a place chosen on the map: the marker goes there until Dylan arrives
  const site = world.guide || campaign.nextSite(), s = site && world.SITES[site];
  if (!s || ui.mode) { pin.hidden = true; return; }
  v.set(s.x, 5.2, s.z).project(H.camera);
  const off = Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95;
  pin.hidden = false; pin.classList.toggle('edge', off);
  const x = Math.max(-0.92, Math.min(0.92, v.x)), y = Math.max(-0.88, Math.min(0.88, v.y));
  pin.style.transform = `translate(${(x + 1) / 2 * innerWidth}px, ${(1 - y) / 2 * innerHeight}px) translate(-50%, calc(-100% - 19px))`;
  pin.querySelector('span').textContent = s.label;
});

// the welcome sheet: continue or begin anew
const intro = document.getElementById('intro');
const started = campaign.state.done.length > 0;
document.getElementById('continue').hidden = !started;
// the title buttons are cut stone: hovered, the letters hop one after the other and an ember glows; clicked, the
// slab is struck, paper chips fly, then the game goes on
const struck = (b, go) => {
  b.innerHTML = [...b.textContent].map((c, i) => `<span class="pl" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  b.onclick = () => {
    if (b.classList.contains('hit')) return; sfx.unlock(); sfx.play('hit'); b.classList.add('hit');
    for (let k = 0; k < 14; k++) { const c = document.createElement('i'), a = Math.random() * 6.283, d = 40 + Math.random() * 70; c.className = 'chip'; c.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d * 0.7 - 20}px;--r:${(Math.random() - 0.5) * 540}deg;--c:${['#e0a24a', '#fbf1de', '#9a3328', '#a9a2bc'][k % 4]}`; b.append(c); }
    setTimeout(() => { b.classList.remove('hit'); b.querySelectorAll('.chip').forEach((c) => c.remove()); go(); }, 520);
  };
};
struck(document.getElementById('continue'), () => { intro.hidden = true; });
document.getElementById('play').classList.toggle('go', !started);
struck(document.getElementById('play'), () => { if (started) campaign.reset(); intro.hidden = true; cinema.start('C01'); });   // a new game opens on « Le village catastrophe »
addEventListener('keydown', (e) => { if (!intro.hidden) e.stopImmediatePropagation(); }, true);
if (Q.has('capture')) { intro.hidden = true; for (const id of ['hud', 'tools']) document.getElementById(id).hidden = true; }
// touch: the stone joystick sends the walking keys (8 ways, a dead zone), the red blob acts (E); it lights up when an
// action is at hand
const stick = document.getElementById('stick'), knob = stick.querySelector('.knob'), actBtn = document.getElementById('act-btn');
const keyState = {}, sendKey = (code, down) => { if (!!keyState[code] === down) return; keyState[code] = down; dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true })); };
let stickId = null;
const stickMove = (e) => {
  const r = stick.getBoundingClientRect(), R = r.width * 0.36, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
  knob.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.atan2(dy, dx)}rad)`;
  const ux = dx / R, uy = dy / R, live = Math.hypot(ux, uy) > 0.25;
  sendKey('KeyW', live && uy < -0.38); sendKey('KeyS', live && uy > 0.38); sendKey('KeyA', live && ux < -0.38); sendKey('KeyD', live && ux > 0.38);
};
const stickEnd = () => { stickId = null; stick.classList.remove('on'); knob.style.transform = ''; for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) sendKey(k, false); };
stick.addEventListener('pointerdown', (e) => { e.preventDefault(); stickId = e.pointerId; try { stick.setPointerCapture(e.pointerId); } catch {} stick.classList.add('on'); stickMove(e); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(ev, (e) => { if (e.pointerId === stickId) stickEnd(); });
actBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); actBtn.classList.add('on'); dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true })); });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) actBtn.addEventListener(ev, () => { actBtn.classList.remove('on'); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true })); });
H.onStep(() => { actBtn.classList.toggle('off', document.getElementById('prompt').hidden); });
// finding the way: the GPS ribbon, the beacons, the minimap, the conversation camera (nav.js)
const nav = createNav({ world, campaign, ui, cinema }); world.navMap = nav.map; H.onStep((t, dt) => nav.step(t, dt));
const mini = document.getElementById('mini'), tools = document.getElementById('tools');
paperize(mini, { seed: 31, style: 'slip' });
// the minimap hangs under the screen buttons, however many rows they wrap to (on a phone it sits at the bottom)
const placeMini = () => { mini.style.top = matchMedia('(max-width: 640px)').matches ? '' : Math.ceil(tools.getBoundingClientRect().bottom + 22) + 'px'; };
addEventListener('resize', placeMini); document.fonts.ready.then(placeMini); placeMini();
// the game's statistics, sent to Supabase like the Village Talas (stats.js; read back on stats.html)
const stats = createStats(campaign, { touch: matchMedia('(pointer: coarse)').matches, off: Q.has('capture') });
window.__thaleo = { campaign, world, ui, cinema, sfx, talk, stats, nav };
// a death waits for its answer: its screen stays (or comes back, after a reload) until Dylan respawns from it
H.onStep(() => { if (campaign.state.accident?.played && ui.mode !== 'death' && !cinema.playing) ui.open('death'); });
H.start();

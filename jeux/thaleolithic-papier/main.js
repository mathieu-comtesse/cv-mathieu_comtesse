// THALEOLITHIC · papier : charge les données du jeu Unity telles quelles, puis relie la campagne, le village et l'interface.
import { createCampaign } from './campaign.js';
import { buildVillage } from './scene.js';
import { createUI } from './ui.js';
import { installTiles, paperize, cutLetters } from './paper-ui.js';

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

const RES = '../../thaleolithic/Source/Resources/';
const load = (f) => fetch(RES + f).then((r) => { if (!r.ok) throw new Error(f + ' : ' + r.status); return r.json(); });
const [v17, menhir, base, legacy] = await Promise.all(['CampaignV17.json', 'MenhirDuel.json', 'UngaBungaCampaign.json', 'UngaBungaQuests.json'].map(load));
let storage = null; try { storage = localStorage; localStorage.getItem('x'); } catch { storage = null; }
const Q = new URLSearchParams(location.search);
const campaign = createCampaign({ v17, menhir, base, legacy, storage: Q.has('capture') ? null : storage });
const world = buildVillage(campaign);
const ui = createUI(campaign, world);
const { H } = world;

// the marker over the place where the next action happens (or the place chosen on the map)
const pin = document.getElementById('pin'), v = new H.THREE.Vector3();
let last = H.hero.group.position.clone();
H.onStep((t, dt) => {
  ui.step(dt);
  // the village lives: the tribe's needs and tasks (not during the evacuation, which leads everyone itself), Dylan's survival
  if (!world.evacuating && dt > 0) { campaign.villageStep(dt, world.arrivedAt, world.moving); world.lead(campaign); }
  const p = H.hero.group.position, moved = p.distanceTo(last) > 1e-4; last.copy(p);
  if (dt > 0) campaign.survive(dt, moved, world.near('repos', 4));
  world.duelStep(dt, campaign.duel.s, ui.mode === 'duel');   // the duel is fought in the village, before the Grand Menhir
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
document.getElementById('continue').onclick = () => { intro.hidden = true; };
document.getElementById('play').onclick = () => { if (started) campaign.reset(); intro.hidden = true; };
addEventListener('keydown', (e) => { if (!intro.hidden) e.stopImmediatePropagation(); }, true);
if (Q.has('capture')) { intro.hidden = true; for (const id of ['hud', 'tools']) document.getElementById(id).hidden = true; }
for (const b of document.querySelectorAll('#pad button')) {
  const code = b.dataset.k, send = (type) => dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on'); send('keydown'); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { if (!b.classList.contains('on')) return; b.classList.remove('on'); send('keyup'); });
}
window.__thaleo = { campaign, world, ui };
H.start();

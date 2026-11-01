// Fig 04 · Reporteur Q18 : un registre à rouleau motorisé, en 3D (cotes de figures/build-moteur.mjs).
// La bande de papier (le registre Excel) passe d'une bobine à l'autre devant la fenêtre ; le moteur la déroule jusqu'à la ligne de l'OT,
// le tampon y reporte les données, un cavalier Q18 se clipse sur le bord.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, cylY, display, bench, paper, ease } from './core.js';

export const WIDTH = 256;
const PLATE = { x: -128, y: -46, w: 256, d: 100, r: 8 };
const BASE = { x: -54, y: -14, w: 108, d: 30 }, BASE_H = 16, POSTS = [-47, 41], POST_Z = 128, SW = 32;
const TOP_Z = 108, BOT_Z = 34, READ_Z = (TOP_Z + BOT_Z) / 2, ROWS_N = 36, NV = 10, ROW_H = (TOP_Z - BOT_Z) / NV;
const CONS = { x: -112, y: 8, w: 52, d: 36 }, CONS_H = 18, DIAL = { x: -96, y: 26, r: 11 }, MOTOR = { x0: 46, x1: 70, r: 9 }, STAMP = { x: 12, rest: 46, hit: 20 };
const SAVED_MIN = 15, EUR = 15 / 60 * 104.74;
const hash = (i) => { let h = Math.imul(i + 5, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const ROWS = Array.from({ length: ROWS_N }, (_, r) => ({ ot: String(4102000 + r * 24117 + Math.floor(hash(r) * 900)), q18: hash(r + 300) < .18 }));
const START_Q18 = ROWS.map((r) => r.q18);
const QUEUE = Array.from({ length: 8 }, (_, i) => ({ row: Math.floor(hash(i + 900) * ROWS_N), q18: hash(i + 700) < .45 }));
const T = { arrive: .8, digit: .5, spin: 1.8, open: .5, stamp: .8, tab: .6, rest: 1.4 };
const DIALED = .8, SPUN = DIALED + 7 * T.digit, OPENED = SPUN + T.spin, STAMPED = OPENED + T.open, TABBED = STAMPED + T.stamp, CLOSED = TABBED + T.tab, END = CLOSED + T.open + T.rest;

function rowsTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 512);
  for (let i = 0; i < NV; i++) { const y = i * 512 / NV; x.strokeStyle = '#b4c0d6'; x.lineWidth = 2; x.beginPath(); x.moveTo(4, y); x.lineTo(124, y); x.stroke(); x.strokeStyle = '#8da2cf'; x.lineWidth = 4; x.beginPath(); x.moveTo(12, y + 26); x.lineTo(46, y + 26); x.stroke(); x.beginPath(); x.moveTo(60, y + 26); x.lineTo(104, y + 26); x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -118, y: PLATE.y + PLATE.d - 13, w: 120, d: 7 }, label: { x: 60, y: PLATE.y + PLATE.d - 17, w: 46, d: 11 } }));
  g.add(slab(BASE.x, BASE.y, BASE.w, BASE.d, 0, BASE_H, COL.mid, 3), slab(CONS.x, CONS.y, CONS.w, CONS.d, 0, CONS_H, COL.mid, 3));
  for (const x of POSTS) g.add(slab(x, -9, 6, 18, BASE_H, POST_Z - BASE_H, COL.mid, 1), slab(x - 1, -10, 8, 20, POST_Z, 3, COL.mid, 1));
  const spools = [TOP_Z, BOT_Z].map((z) => { const w = cylX(-40, 40, 0, z, 1, COL.hi, 32); g.add(w, cylX(-46, -40, 0, z, 11, COL.lo, 32), cylX(40, 46, 0, z, 11, COL.lo, 32)); return w; });
  g.add(cylX(MOTOR.x0, MOTOR.x1 - 6, 0, BOT_Z, MOTOR.r, COL.mid, 28), cylX(MOTOR.x1 - 6, MOTOR.x1, 0, BOT_Z, MOTOR.r - 1.6, COL.mid, 28));
  const tex = rowsTexture(), strip = paper(2 * SW, TOP_Z - BOT_Z, '#ffffff', 16); strip.material.map = tex; strip.position.set(0, READ_Z, 10); g.add(strip);
  // fenêtre de lecture
  const y = 17; for (const sx of [-SW - 3, SW + 1]) g.add(slab(sx, y, 2, 3, READ_Z - 13, 26, COL.mid, .4));
  g.add(slab(-SW - 3, y, 2 * SW + 6, 3, READ_Z + 9, 3.4, COL.mid, .4), slab(-SW - 3, y, 2 * SW + 6, 3, READ_Z - 12.4, 3.4, COL.mid, .4));
  const lamp = cyl(0, y + 1.5, 2.2, READ_Z + 12.4, 1.4, COL.mid, 18); g.add(lamp);
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .8 }), lampOff = lamp.material;
  const hl = box(0, 14.2, READ_Z, 2 * SW, .4, ROW_H, COL.accent, 0); hl.material = new THREE.MeshBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: .0 }); g.add(hl);
  // tampon
  g.add(slab(STAMP.x - 6, 44, 12, 12, 0, 6, COL.lo, 1), slab(STAMP.x - 3, 47, 6, 6, 6, READ_Z + 4, COL.mid, .8), slab(STAMP.x - 8, 43, 16, 14, READ_Z + 4, 14, COL.mid, 1.4));
  const stamp = new THREE.Group(); stamp.add(cylY(43, STAMP.rest, STAMP.x, READ_Z + 11, 2.2, COL.hi, 16), box(STAMP.x, STAMP.rest - 10, READ_Z, 18, 4, 12.8, COL.accent)); g.add(stamp);
  // console
  const ot = display(40, 7); ot.mesh.position.set(CONS.x + 26, 9.5, CONS.y + CONS.d + .05); g.add(ot.mesh);
  const dialG = new THREE.Group(); dialG.position.set(DIAL.x, CONS_H + 1.4, DIAL.y); dialG.add(cyl(0, 0, DIAL.r, 0, .8, COL.mid, 40)); for (let i = 0; i < 10; i++) { const a = (60 + 30 + i * 28) * Math.PI / 180; dialG.add(cyl(Math.cos(a) * (DIAL.r - 3), Math.sin(a) * (DIAL.r - 3), 1.6, .8, .3, COL.lo, 14)); } g.add(dialG);
  const clips = Array.from({ length: 8 }, () => { const c = box(0, 0, 0, 8, 4, 4.8, COL.accent); c.visible = false; g.add(c); return c; });
  const report = paper(26, 20, '#ffffff', 8); report.rotation.x = -Math.PI / 2; g.add(report);
  let job = 0, t = 0, offset = 0, from = 0, last = null, manual = null;
  const next = (step) => { from = offset; job = (job + step + QUEUE.length) % QUEUE.length; t = 0; if (job === 0) ROWS.forEach((r, i) => { r.q18 = START_Q18[i]; r.printed = false; }); };
  function update(time) {
    const dt = last === null ? 0 : Math.max(0, Math.min(.05, time - last)); last = time;
    if (manual === null) { t += dt; if (t >= END) next(1); } else { offset = manual; }
    const q = QUEUE[job], row = q.row; let speed = 0;
    if (manual === null) { const u = ease((t - SPUN) / T.spin), prev = offset; offset = t < SPUN ? from : from + (row - from) * u; speed = Math.min(1, Math.abs(offset - prev) * 40); }
    const open = manual === null ? ease((t - OPENED) / T.open) * (1 - ease((t - CLOSED) / T.open)) : 0;
    const sel = manual === null ? row : Math.round(offset);
    if (manual === null && t > STAMPED + T.stamp * .5) ROWS[row].printed = true;
    const tabbing = manual === null && q.q18 && t > TABBED && t < CLOSED + .05 ? ease((t - TABBED) / T.tab) : null;
    if (manual === null && q.q18 && t >= CLOSED) ROWS[row].q18 = true;
    const p = Math.max(0, Math.min(1, offset / ROWS_N)), rt = 6 + 6 * (1 - p), rb = 6 + 6 * p;
    spools[0].scale.set(1, rt - .4, rt - .4); spools[1].scale.set(1, rb - .4, rb - .4);
    strip.userData.flex(-.0038, Math.max(speed, .1) * 1.6, speed * .9, 0, time); strip.position.z = 6 + 4 * (1 - p) * 0 + 3;
    tex.offset.y = (offset / NV) % 1;
    hl.material.opacity = open > 0 ? .35 * open : 0;
    let n = 0;
    for (let r = Math.floor(offset - NV / 2) - 1; r <= Math.ceil(offset + NV / 2) + 1; r++) {
      if (r < 0 || r >= ROWS_N) continue; const vc = .5 + (r - offset) / NV; if (vc < .06 || vc > .94) continue;
      const drop = r === sel && tabbing !== null ? (1 - tabbing) * 12 : 0;
      if (!ROWS[r].q18 && !(r === sel && tabbing !== null)) continue;
      const c = clips[n++]; if (!c) break; c.visible = true; c.position.set(SW - 4, READ_Z - (r - offset) * ROW_H + drop, 10 + 2);
    }
    for (; n < clips.length; n++) clips[n].visible = false;
    const press = manual === null ? Math.sin(Math.PI * Math.max(0, Math.min(1, (t - STAMPED) / T.stamp))) : 0; stamp.position.z = -(STAMP.rest - STAMP.hit) * press;
    const digits = ROWS[q.row].ot; let rot = 0, shown = '_______';
    if (manual === null) { const kk = Math.floor((t - DIALED) / T.digit), u = (t - DIALED) / T.digit - kk; if (t >= DIALED && kk < 7) { const nn = +digits[kk] || 10; rot = (u < .45 ? ease(u / .45) : 1 - ease((u - .45) / .55)) * nn * 28; } const typed = Math.max(0, Math.min(7, t < DIALED ? 0 : kk + (u > .45 ? 1 : 0))); shown = digits.slice(0, typed).padEnd(7, '_'); } else shown = ROWS[sel].ot;
    dialG.rotation.y = rot * Math.PI / 180; ot.set(shown);
    lamp.material = manual === null && t >= SPUN && t < OPENED ? lampOn : lampOff;
    const rise = manual === null ? (1 - ease(t / T.arrive)) * 30 + ease((t - END + .6) / .6) * 30 : 60;
    report.visible = rise < 29.9; report.position.set(-84, 40 + rise, 42); report.userData.flex(.05, .9, .5, job, time);
  }
  update(0);
  return { group: g, update, controls: { label: 'Rapport', min: 1, max: QUEUE.length, step: 1, fmt: (v) => 'rapport ' + v + ' / ' + QUEUE.length, get: () => job + 1, set: (v) => { manual = null; job = v - 1; t = 0; from = offset; } } };
}

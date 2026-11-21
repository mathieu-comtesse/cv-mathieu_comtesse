// papercraft / templates / popup-3d / structures.js: the STRUCTURE TYPES sampler (references/structures.md). One
// specimen of every type and subtype, in plain placeholder outlines and prints, each named on the page. It shows how
// each builder is called and what it makes; it is not content: your world uses these types with ITS OWN outlines and
// prints. Serve assets/ over http and open /templates/popup-3d/structures.html (?walk to walk the stand-in hero).
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { fanCard, prismFold, boxFold, platform } from 'papercraft/lib/paperkit-3d.js';
import { createHarness } from './harness.js';

// a sampler lens: a wide sharp band so every specimen reads (a world keeps the style's narrow band, SKILL.md law 6)
const H = createHarness({ ground: '#d8d1bb', view: { pitch: 47, dist: 90, target: [0, 1.5, -9] }, focus: [0, 2, -9], play: false, lens: { focusBand: 0.75, ramp: 0.4, maxBlur: 6 } });
const { popup } = H, rnd = P2.rng(5), D = P2.draw2;
const plain = (c) => (P) => { P.gradient(P2.shade(c, 0.12), P2.shade(c, -0.14), 0.5); P.felt(0.5); P.innerShade(P2.shade(c, -0.5), { alpha: 0.25, blurPx: 8 }); };
const COL = { card: '#8e9a6a', layered: '#5f8f86', slotted: '#c58f43', folded: '#c4744d', built: '#9a6a44', roof: '#7f5a42' };
const XS = [-26, -13, 0, 13, 26], ROW = [7, -5, -17, -29], LABELS = [];
const at = (c, r, label) => { LABELS.push([XS[c], ROW[r] + 3.6, label]); return [XS[c], ROW[r]]; };

// placeholder outlines (yours come from your subject)
const tree = (s = 1) => P2.fromDrawing((g) => { D.rect(g, -0.28 * s, 0, 0.56 * s, 3 * s); D.ell(g, 0, 4.1 * s, 2.2 * s, 2.0 * s); }, { w: 5 * s, h: 6.4 * s });
const mound = (w, h, lobes = 5) => P2.shape.mound(rnd, { w, h, lobes, depth: 0.12 });
const hill = (w, h) => P2.shape.hill(rnd, { w, h, bumps: 2 });
const halfEllipse = (rx, ry) => { const p = []; for (let s = 0; s <= 20; s++) { const a = Math.PI * s / 20; p.push([-Math.cos(a) * rx, Math.sin(a) * ry]); } return p; };
const postArm = () => P2.fromDrawing((g) => { D.rect(g, -0.3, 0, 0.6, 5.4); D.rect(g, -1.5, 4.2, 3.0, 0.6); }, { w: 3.2, h: 5.6 });
const ruin = () => [[-2.6, 0], [2.6, 0], [2.6, 2.4], [1.9, 3.1], [1.2, 2.6], [0.4, 3.4], [-0.5, 2.9], [-1.4, 3.3], [-2.6, 2.7]];
const ngon = (n, r) => Array.from({ length: n }, (_, k) => [r * Math.cos(2 * Math.PI * k / n), r * Math.sin(2 * Math.PI * k / n)]);
const node = (n, x, z, height, o = {}) => popup(null, null, { node: n, x, z, height, ...o });

// ---- the printed page: washes, water bodies and the names
const POND = ngon(14, 3.6).map(([x, z], i) => [XS[1] + x * (1 + 0.12 * Math.sin(i * 2.1)), ROW[3] + z * 0.7 * (1 + 0.1 * Math.cos(i * 1.7))]);
const RIVER = [[XS[2] - 5, ROW[3] - 4], [XS[2] - 1.5, ROW[3] - 1], [XS[2] + 1, ROW[3] + 1.2], [XS[2] + 5, ROW[3] + 4]];
const CANAL = [[XS[3] - 4, ROW[3] - 1.2], [XS[3] + 4, ROW[3] - 1.2], [XS[3] + 4, ROW[3] + 1.2], [XS[3] - 4, ROW[3] + 1.2]];
const ICE = ngon(12, 3.2).map(([x, z], i) => [XS[4] + x * (1 + 0.1 * Math.sin(i * 1.3)), ROW[3] + z * 0.72]);
const inWater = [];

// row 0: cards and layered types
{ const [x, z] = at(0, 0, 'card (faces the camera)'); popup(mound(4.2, 2.8), plain(COL.card), { x, z }); }
{ const [x, z] = at(1, 0, 'fan pair'); node(fanCard(mound(4.4, 3.2, 6), { paper: H.paper, paint: plain(COL.layered), ...H.cardOpts(x, z) }), x, z, 3.4); }
{ const [x, z] = at(2, 0, 'stack: nested sails'); H.stack(x, z, [{ pts: hill(7, 3.8), paint: plain(P2.shade(COL.layered, -0.12)), d: -1.3 }, { pts: hill(6, 2.7), paint: plain(COL.layered), d: 0 }, { pts: hill(5, 1.6), paint: plain(P2.shade(COL.layered, 0.12)), d: 1.3 }]); }
{ const [x, z] = at(3, 0, 'dome: parallel slices'); H.dome(x, z, { r: 3.2, h: 3.0, n: 5, paint: plain(COL.layered) }); }
{ const [x, z] = at(4, 0, 'quarter cross opened: V-fold'); popup(halfEllipse(3.2, 2.8), plain(COL.slotted), { x, z, cross: 'quarter', angle: 120 }); }
// row 1: the cross family
{ const [x, z] = at(0, 1, 'full cross +'); popup(tree(), plain(COL.slotted), { x, z, cross: true, solid: 0.5 }); }
{ const [x, z] = at(1, 1, 'half cross T (depth behind)'); popup(mound(4.6, 3.4, 4), plain(COL.slotted), { x, z, cross: 'half' }); }
{ const [x, z] = at(2, 1, 'half cross, low buttress'); popup(postArm(), plain(COL.slotted), { x, z, cross: 'half-front', second: { pts: [[-1.6, 0], [1.6, 0], [0.3, 2.2], [-0.3, 2.2]], ymax: 2.2 } }); }   // its own side outline: a buttress
{ const [x, z] = at(3, 1, 'quarter cross L'); popup(ruin(), plain(COL.slotted), { x, z, cross: 'quarter' }); }
{ const [x, z] = at(4, 1, 'double cross (4 planes)'); const y = H.THREE.MathUtils.degToRad(20); popup(tree(0.95), plain(COL.slotted), { x, z, cross: true, yaw: y }); popup(tree(0.95), plain(P2.shade(COL.slotted, -0.06)), { x, z, cross: true, yaw: y + Math.PI / 4 }); }
// row 2: folded volumes (closed shapes)
const fold = { paper: H.paper };
{ const [x, z] = at(0, 2, 'box fold (gable)'); node(boxFold({ ...fold, w: 4.6, d: 3.6, wallH: 3, roofH: 1.8, paints: { front: plain(COL.folded), gable: plain(P2.shade(COL.folded, -0.06)), roof: plain(COL.roof) }, print: H.cardOpts(x, z) }), x, z, 4.8, { solid: 2.4 }); }
{ const [x, z] = at(1, 2, 'prism + cross on lid');   // two types on one: the lamp rides the lid (userData.top)
  const pr = prismFold([[-2, 0], [2, 0], [2, -4], [-2, -4]], { ...fold, h: 3.4, paints: { wall: plain(COL.folded), roof: plain(COL.roof) }, print: H.cardOpts(x, z) });
  const h = node(pr, x, z, 3.4, { solid: 2.2 });
  const lamp = P2.fromDrawing((g) => { D.rect(g, -0.16, 0, 0.32, 2.2); D.ell(g, 0, 2.55, 0.55, 0.5); }, { w: 1.3, h: 3.1 });
  popup(lamp, plain(COL.slotted), { parent: pr.userData.top, x: 0, z: 0, cross: true, yaw: 0.42, order: h.order + 0.6 }); }   // on a frame: pass the yaw and the order
{ const [x, z] = at(2, 2, 'prism: hexagon, pyramid'); node(prismFold(ngon(6, 2.4), { ...fold, h: 3, roof: 'pyramid', roofH: 2.2, paints: { wall: [plain(COL.folded), plain(P2.shade(COL.folded, -0.07))], roof: plain(COL.roof) }, print: H.cardOpts(x, z) }), x, z, 5.2, { solid: 2.2 }); }
{ const [x, z] = at(3, 2, 'prism: 10 sides, cone (tower)'); node(prismFold(ngon(10, 1.8), { ...fold, h: 5, roof: 'pyramid', roofH: 2.6, paints: { wall: [plain(COL.folded), plain(P2.shade(COL.folded, -0.05))], roof: plain(COL.roof) }, print: H.cardOpts(x, z) }), x, z, 7.6, { solid: 1.8 }); }
{ const [x, z] = at(4, 2, 'prism: L-shape, flat lid'); node(prismFold([[-3, 0], [3, 0], [3, -2.4], [0.2, -2.4], [0.2, -5], [-3, -5]], { ...fold, h: 2.8, paints: { wall: plain(COL.folded), roof: plain(COL.roof) }, print: H.cardOpts(x, z) }), x, z, 2.8); }
// row 3: built ground (walked on) and water bodies (printed: pond, river, canal, frozen pond)
{ const [x, z] = at(0, 3, 'platform: deck on posts'); const p = platform({ ...fold, w: 4.4, d: 3.2, h: 1.6, paints: { face: plain(COL.built), deck: plain('#b08a5a'), support: plain(COL.built) }, print: H.cardOpts(x, z) }); node(p, x, z, 1.6); H.walk.add(p); }
at(1, 3, 'water: pond'); at(2, 3, 'water: river (bandOf)'); at(3, 3, "water: canal (edge 'cut')"); at(4, 3, "water: frozen (marks 'cracks')");
// the page is printed last here only so the names of all specimens are known (a world prints it first)
H.printGround(({ g, ppu, X, Z, washes, water, bandOf }) => {
  washes(['#d8d1bb', '#d2cab2', '#ddd6c2']);
  inWater.push(water(POND, { colors: ['#5ea7a0', '#2f7f7a'] }));                                       // pond: torn bank
  inWater.push(water(bandOf(RIVER, 1.6), { colors: ['#5ea7a0', '#2f7f7a'], rimPts: bandOf(RIVER, 2.0), deepPts: bandOf(RIVER, 0.7), flow: Math.atan2(8, 10) }));   // river
  inWater.push(water(CANAL, { colors: ['#6aa3b0', '#3a7686'], edge: 'cut', rim: '#b9b2a2', inset: 0.5, flow: 0 }));   // canal: a cut stone lip
  inWater.push(water(ICE, { colors: ['#dbe9ef', '#c1d6df'], rim: '#f0f3f4', marks: 'cracks', markColor: 'rgba(255,255,255,0.9)' }));   // frozen pond
  g.fillStyle = 'rgba(58,41,28,0.85)'; g.textAlign = 'center'; g.font = `italic ${0.95 * ppu}px Georgia, serif`;
  for (const [x, z, t] of LABELS) g.fillText(t, X(x), Z(z));
});
H.walk.block((x, z) => inWater.some((f) => f(x, z)));

// a stand-in hero (the harness needs one): a plain card that flips to turn
H.setHero(popup(P2.fromDrawing((g) => { D.rect(g, -0.5, 0, 1, 2.2, 0.3); D.ell(g, 0, 2.7, 0.55, 0.55); }, { w: 1.4, h: 3.3 }), plain('#6d5a8a'), { x: 0, z: 13 }), { turn: 'flip' });
H.start();

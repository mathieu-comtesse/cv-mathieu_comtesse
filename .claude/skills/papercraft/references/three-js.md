# three.js recipe

How to build the paper look in three.js with `assets/lib/paperkit-3d.js` (and why each part is built the way it is),
plus performance and the traps that cost the source project time.

Read this when: building a 3D paper scene or game for the browser, or porting the kit's techniques into an existing
three.js project. Read `look.md` first if you have not.

Contents: 1 Setup; 2 Paper material; 3 Cards; 4 Hinges and springs; 5 Light and shadows; 6 Lens (PaperPost);
7 The printed ground; 8 Clock and capture hook; 9 Performance; 10 Pitfalls

## 1. Setup

The template `assets/templates/popup-3d/` is the reference wiring (serve over http: the modules import each other
relatively), split in two: `harness.js` is the fixed harness, kept as it is, and `scene.js` is your world (the bundled
one is the countryside worked example). A scene does `const H = createHarness({ bounds, ground, stock, view, testView,
heroHeight, light, lens, walk, play, mood, moods, focus, walkArea, camBox })`, prints ITS OWN ground with `H.printGround(t => ...)` (the
tools are techniques, not a recipe: the example's sage washes, river and path are its world's; tools: `washes`,
`torn`, `band`, `ribbon`, `bandOf`, `line`, `drifts`, `water`), places its pieces with `H.popup(outline, print, { x,
z, yaw, cross, node, self, parent, solid, level, holes, res, materials, ... })` (print quality follows the lens: rows
it blurs print flat and coarse; `res` scales a piece's print resolution; `materials: H.printed(pts, paint)` stamps one
print on many cards: section 9), registers `H.lamp(x, y, z)` practicals and `H.glowing(group)` lit panes for the moods, adds every
walkable construction with `H.walk.add(node)`, names places in `H.spots`, sets `H.setHero(handle, { stride, turn })`,
adds its world's life (`lib/paper-life.js`: `H.onStep((t, dt) => life.update(dt, H.target))` and
`H.onRestart(() => life.reset(H.target))`, so `restart(); step(T)` captures repeat; `motion.md` section 12) and calls
`H.start()`.

- **In your own folder.** Copy `assets/lib/` (and `assets/examples/` only if you import one) and `harness.js`, keep
  the harness as it is, and in your page's import map point `"papercraft/"` at the folder that holds `lib/` (the
  template maps it to `../../`) and `"three"` at three r187 (the template's `index.html` uses the jsDelivr build);
  your scene imports `papercraft/lib/paperkit-3d.js` and `./harness.js`.
- **`?test`** (workflow step 2): the harness sets `H.flags.TEST`, pulls the camera in to `testView` (38 units, target
  [3, 1.5, -6]) and turns walking off. Your scene branches on the flag and builds only the hero, the printed ground and
  2-4 test cards near that target (the example scene's section 4); without that branch `?test` shows the whole world.
- **Structure types** (`structures.md`): `H.popup(pts, paint, { cross })` builds the cross family (`true`, `'half'`,
  `'half-front'`, `'quarter'`; `angle` opens a quarter into a V-fold; `second: { pts, paint, ymax, scale }`) and,
  without a `yaw`, turns every card and cross as the source game does; `H.stack(x, z, layers)` (parallel cards, each
  on its own hinge) and `H.dome(x, z, { r, h, n })`; the kit's `fanCard`, `boxFold`, `prismFold` (any footprint, a
  flat lid, a pyramid or a cone) and `platform` go on the page with `H.popup(null, null, { node, height })`;
  `printGround`'s `water(pts, opts)` prints any water body and returns `inside(x, z)` (only when the brief has water;
  pass your world's colours). The sampler page `structures.html` shows them all.
- **The hero** is a page-level popup: a 3D paper model facing +z (`mechanisms.md` section 12). `H.setHero(hero,
  { stride: (walked, gait) => ..., turn })`: while walking is on, the harness moves him as the source game moves its
  player (constant-rate acceleration, the heading turning smoothly toward the way he goes so the whole model yaws, a
  forward lean on a springy settle, a roll into turns: `motion.md` section 8) and calls `stride` every step with the
  distance walked and how much he is walking (0 standing .. 1 striding), so the model swings its limbs (the example
  `heroDoll().userData.stride`). `turn: 'flip'` instead mirrors a flat card left / right (critters, extras). Wherever he
  starts, on the page or on a deck, he rides what is under him as the world rises, and walks from there; the camera
  and lens follow him once he has moved.
- **Walking.** `play: true` walks the hero with WASD / arrows without `?walk` (`?still` gives the fixed overview; the
  3D default is `false`, the 2D harness's is `true`); walking prints every piece in full, because the camera can go
  anywhere (~1.5x the build). The walking camera frames him as the source game does: a still zone round him (short
  moves and stops leave the frame dead still), a soft zone that picks up his speed, a hard edge he never crosses, and
  after ~0.35-1.1 s of steady walking (`motion.md` section 10) a lead so he has room in front; keys are read by
  physical key (`e.code`: any layout) and released when the page loses focus. Lay routes and choose `view.follow` so
  the walking frame shows the world: on a coast or a lake keep the water at an edge of it (a tester's walk frame was
  45 % sea). `view.follow: [dx, dz]` is where the walking camera looks relative to him (default [-9.3, -9]: he stays
  in the lower right, so lay routes out going up and left). `focus: [x, y, z]` keeps the lens on a landmark until the
  hero first moves (by default it focuses on the hero, so a landmark behind his start sits in the blur); on his first
  step it eases to him, and the camera starts from the frame as it is (it moves only once he leaves the still zone).
- **Where he may walk, and what to fill.** Without limits he walks off the dressed page and the camera shows bare
  paper past the overview (a tester's walk found it, then built a forest ring by hand for +3-7 s of build).
  `walkArea: { x0, x1, z0, z1 }` keeps him inside and holds the walking camera to the framings of him there;
  `camBox: { x0, x1, z0, z1 }` holds its target in a box of your own instead (a single diorama: a few units round
  the overview target, him walking anywhere the overview shows: the template). Fill with `H.inReach(x, z, m, y)`
  (true where ANY of those framings can show the point), not `H.inFrame` (the overview only): the template fills
  the overview first and then the ring `inReach && !inFrame`, at `res: 0.75`, so the overview's own draws never
  change. A level he crosses (a village, a valley) needs its whole reach dressed: print the ring as stamps
  (section 9).
- **Light and moods.** `mood: 'dusk'` (or `'night'`, `'golden'`, a key of your `moods`) is the world's own light
  (`?mood=` still overrides it). The built-in sets' haze, vignette and shadow-tint colours are the example world's
  distance: give your world its own (`moods: { ...MOODS, dusk: { ...MOODS.dusk, post: { ...MOODS.dusk.post, haze:
  '<your far colour>' } } }`; the example's pink dusk haze tinted a tester's black-sand beach). A world with its own
  light (snow, under water, a lamp-lit station) gets its own record: start its key, fill, leak and haze from the
  matching preset in `assets/lights.json` (`palettes.md` section 4), then set the intensities and `post` (the haze
  goes in `post.haze`): `createHarness({ moods: { ...MOODS, snow: { key, ki, dir, fill, fi, sky, skyG, si, leak,
  wrap, glow, lamp, post } }, mood: 'snow' })`, with `MOODS` imported from `harness.js`: `key` / `fill` / `sky`
  colours and `ki` / `fi` / `si` their intensities, `skyG` the hemisphere's ground colour, `dir` the key direction
  (optional; placed at `light.distance`), `leak` the shadow tint, `wrap`, `glow` (lit panes) and `lamp`
  (practicals' power) optional, `post` the PaperPost options it overrides. A day world can also just pass
  `light: { leak }` (section 5).
- **Animation on the clock.** `H.onStep((time, dt) => ...)` animates anything on the harness's fixed clock
  (fireflies, a flickering lamp, a turning wheel), so captures repeat.
- **Constructions you build yourself** (`boxFold`, `platform`, the example constructions) take `paper: H.paper` and
  their own `seed` as options, and `print: H.cardOpts(x, z)` only for the print quality (they read its `pxPerUnit` and
  `effects`: far, blurred ones print coarse and flat, much faster). Without `paper` they throw; without a `seed` every
  one prints alike: `boxFold({ w, d, paper: H.paper, seed: 71, paints, print: H.cardOpts(x, z) })`. A `layeredCard`
  takes `H.cardOpts(x, z, scale)` as its options directly (paper and seed included).
- **`popup` on a deck** (`parent: deck`): x and z are in the deck's frame, yaw is relative to the deck (subtract the
  deck's yaw to face the camera), pass `order` yourself (the default comes from z), and give a solid its world
  position (`wx`, `wz`) and height (`base`). `solid` is in card units and is multiplied by `scale` (~0.3-0.45 for a
  prop). Name a construction (`group.name = 'pier'`) and `walkPath` reports it in `on`.
- **Debugging a route.** `__papercraft.walkMap(x0, z0, x1, z1, cell)` prints the walk field as text (`#` blocked,
  `.` page, 1-9 a deck's height, `^` a wall, `H` the hero): an invisible solid on the route shows at once; a stuck
  `walkPath` says what stopped it (`blockedBy`: a block, a solid or wall and where, a step too high, a foot off the
  edge).
- **Review frames.** `look(x, z, dist, y)` moves the camera at once and holds it (the walking camera pauses) until
  `restart()`, which also restores the overview's distance (`y`: the height looked at, default 1.5 above the surface
  there; raise it to frame a crater or a tower top); capture right after `look()` + `step(1 / 60)`.
- **Frame edges and density.** `H.groundAt(sx, sy)` is the page point under a screen position (-1..1; `(0, 0.95)` the
  far edge, where backdrop flats stand just inside); `__papercraft.cards()` counts the standing cards in frame (the
  source game's gameplay frames hold ~270-320).
- **Paper stock.** `createHarness({ stock })` sets the paper colour multiplied under every print and the ground (warm
  cream by default; a cold world takes a cooler one, `look.md` section 8b).
- **Paths that run any direction.** `printGround`'s `bandOf(pts, half)` and `line(pts, w, colour)` take any polyline,
  e.g. `P2.pathLine(ctrl).pts` (a Catmull-Rom route through control points, whose `dist(x, z)` keeps pieces off it):
  a road across the view to a bridge, a river that turns back.

Underneath, the minimal order is:

```js
import * as THREE from 'three';                                    // r187 tested; import map or bundler
import * as P2 from 'papercraft/lib/paperkit-2d.js';
import { paperTextures, paperMaterial, makeCard, hinge, paperLights, enableSoftShadows, PaperPost, PAPER_LIGHT } from 'papercraft/lib/paperkit-3d.js';

const renderer = new THREE.WebGLRenderer({ antialias: false });   // MSAA happens in the post target
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;                    // the PCSS patch replaces the BASIC path
const camera = new THREE.PerspectiveCamera(26, aspect, 5, 600);    // 47 deg down from 66 units: looking INTO the world
const paper = paperTextures(renderer, { color: '#f7f0e2', unitsPerTile: 6 });
const lights = paperLights(scene, { target, keyDir, fillDir, shadowExtent, distance, mapSize: 4096 });  // section 5
enableSoftShadows(lights.key, { softness: 0.26, maxPenumbra: 1.4 }); // before the first render
const post = new PaperPost(renderer, scene, camera, { /* the template's overrides: section 6 */ });
// per frame: post.focus.copy(subjectPoint); post.render(time);  on resize: post.setSize(w, h)
```

URL switches of the template (the one list): `?test` (above); `?mood=golden|dusk|night` (section 5); `?walk` (WASD /
arrows; the camera follows and refits the shadow map); `?still` (the fixed overview, no walking); `?roam` (full-quality
prints everywhere, for a moving camera); `?diag=key` (the key light alone: the cast-shadow check, `look.md` section
8b); `?capture` hides the hint; `?ss=2` supersamples (pixel ratio x2, up to 3: review captures, as a DPR-2 screen shows
the cut edges). The capture hook `window.__papercraft` has `restart()` (a full reset: hinges, hero, camera),
`step(seconds)`, `resume()`, `toggle()` (fold flat / open), `walkPath(points)` (reached < of = blocked; it reports
`blockedBy`, the height and the surface it ends on), `walkMap(...)`, `place(x, z)`, `heroPos`, `look(x, z, dist, y)`
(a close review frame, the lens focused there; `look(heroPos.x, heroPos.z, 13)` frames the hero), `cards()` (the
standing cards in frame: the density check), `printStats(n)` (what the build spent printing, by the scene line that
asked: section 9), `sight()` (the rays to the hero a construction blocks, and the sight assist's offsets: `motion.md`
section 10), `spots`, `buildMs`, `ready`, and `post`, `scene`, `camera`, `walk`, `view`, `target`, `pieces` for
inspection. `scripts/capture.py <project> [shots]` drives all of it headless (overview, midrise, test, key,
mood=, look=, spot=, walk=, at=, hold=) and prints the build, the slowest prints and every page error.

Units: the defaults assume 1 unit = 1 cm with a ~4 cm hero (the template's is 3.6). If your world uses other units,
scale `thickness`, `edgeWidth`, `contact.height` (makeCard), `softness`-related `maxPenumbra` (enableSoftShadows),
`aoRadius`, `aoBias`, `hazeStart`, `hazeEnd` (PaperPost) by your hero height / 4.

## 2. Paper material

`paperMaterial()` is a `MeshLambertMaterial` patched in `onBeforeCompile`:

- `lights_lambert_pars_fragment` is replaced: wrap lighting, shadow leak (`mix(leak, 1, shadow)` on the key), back-lit
  translucency gated by a "thick" shadow test.
- `lights_fragment_begin` is patched so the directional shadow factor is stored in a global instead of multiplying
  the light colour, which is what lets the paper BRDF tint shadows warm instead of black.
- Shared uniforms live in `PAPER_LIGHT` (`wrap`, `leak`, `trans`, `transTint`): change them at runtime for night or
  moods (`PAPER_LIGHT.leak.value.set('#16286a')`).

Use it for EVERY lit surface (ground, cards, props, characters). A stray `MeshStandardMaterial` sits next to
the cards like plastic: GGX sheen at grazing angles, black shadows. Emissive paper (windows, lanterns): pass
`emissive` + `emissiveIntensity` (values > 1 bloom into bokeh discs through the lens).

The patches anchor on code structure, not comments (the built three strips GLSL comments), and fail safe with a
console warning if a future three version changes the chunk. If you upgrade three, check the console and a test card.

## 3. Cards

`makeCard(outline, { paint, paper, thickness, edgeWidth, edgeColor, contact, folds, rimLight, back, backRes,
materials, glow, glowColor, tone, pxPerUnit, seed })` extrudes a closed outline (from `P2.shape.*`, `P2.roughen`) to
card thickness and prints it:

- face: your `paint(P)` (see `procedural-art.md`), contact darkening toward the fold line, then the cut edge printed
  by `P.rim()`: a thin dark-brown line at the silhouette and a pale highlight just inside it only on the edges facing
  the light, colours derived from the print; all multiplied by the paper sheet;
- `rimLight`: the direction toward the key in the print (x right, y up), which picks the highlighted edges; default
  upper left `[-0.55, 0.83]`, a key from the right `[0.55, 0.83]`. `boxFold` and `platform` pass it on;
- `folds` (default `['bottom']`, the hinge base; also `'top'`, `'left'`, `'right'` or a predicate): fold edges get no
  rim, since one sheet bending has no cut edge;
- sides: a darker copy of the print's average colour (one rim, not two);
- back: `'kraft'` (55 % front + 45 % kraft, default), `'mirror'` (the front print, flipped: die-cut style, no second
  print, and `crossCard`'s default; exact for symmetric outlines, asymmetric ones show the bleed colour at the edge,
  pass a paint fn instead), a paint fn, or `false` (no back print); kraft and paint-fn backs print at `backRes` 0.5
  (seen only in passing); `materials` reuses another card's print (a `crossCard`'s halves share one);
- `effects: 0` prints the layers flat (no lip, shadow, shade or cut edge): for the rows the lens blurs (the template
  uses it beyond the sharp band, with 28 instead of 40 px per unit, which halves the build);
- `glow`: emissiveIntensity of the panes marked with `P.glow` (kit default 2.2, `glowColor` `#ffc45a`). Pass EVERY
  piece with lit panes (a crater, a lantern, a screen, not only houses) to `H.glowing(group)` so the moods scale it;
  otherwise it stays at 2.2 in every mood and can clip;
  `mesh.userData.setGlow(v)` changes it: ~0.35 by day, ~1.1 at dusk, ~1.4 at night (the template's moods);
- per-sheet tone +-4 % so neighbours of "the same" colour differ like real sheets.

The card stands in the XY plane facing +Z, its fold line on the X axis (y = 0). Print at 40-48 px per unit at the hero
framing (the template: 40 / the card's scale).

**Built ground** (`mechanisms.md` section 14): walkable height is built open (a plank deck on posts, treads on two
stringers, a deck between side cards); give every walkable construction `userData.walk.heightAt(x, z)` in its own
frame (or a level `frame`) and, if it moves its own parts, `userData.follow(p)`. `platform()` comes with its deck as a
walk surface and keeps the deck level through its parallel fold (`userData.deck` is the frame for pieces standing on
it); a construction that animates itself goes on `hinge(group, { flat: 0, rest: 0 })` (the template's
`popup({ self: true })`). The worked examples in `assets/examples/built-ground.js` show how: `bridge`, `stairs` (thin
treads on two stringers), `ramp`, and `terrace` (a solid box: built masonry the brief names, never natural terrain).
`WalkField` (`paper-motion.js`) collects them (`add`), plus water (`block`), round footprints (`solid`) and long ones
(`wall`), and moves the hero (`move`, `route`); the template's switches and scripted checks are in section 1.

Outlines must be simple polygons (no self-intersection). Holes (a door to walk through, windows, an arch, the gaps of
a fence or a ladder): `makeCard(pts, { holes: [outline, ...] })` and `popup(pts, paint, { holes })` cut them in the
geometry, give their walls the side colour, and `P.rim` rims them like the outline; `boxFold({ holes: { front, left,
right } })` and `platform({ holes: { face, support } })` take them per panel. Print dark panes instead only where
nothing needs to show through.

## 4. Hinges and springs

`hinge(card, { at, yaw, open, size, rest, delay })` puts a card on a fold line: `p = 1` standing, `p = 0` lying flat
face-up. It uses `FlapSpring` by default: a soft rise spring that latches at upright into a stiff quiver (air drag +
crease friction), a softer fall with an unlatch twitch and one small slap. `size` (0 = a tab, 1 = a page-sized flap)
makes big cards slower with more whip. Use `h.set(open, delay)` to choreograph, `h.onStart` to trigger the flap
sound exactly when a piece starts moving, and `h.reset(p)` to jump to p at rest (section 8).

- Rise in flat-stack order: the card lying on top when folded rises first (cards fold back, away from the camera, so
  the nearest first), staggered ~0.3 s inside a piece and ~0.02 s per unit of distance across the template's scene;
  fold down in reverse. Give each card's fold line a hair of height by its stack position (~0.7 % of hero height per
  layer) so flat cards never z-fight. The template's order runs from `Z_NEAR` (25), the nearest z its fill reaches:
  `order = (Z_NEAR - z) / 5`. Extend the world toward the camera and raise it, or nearer pieces get negative delays
  and start together.
- Parts that ride on another card (the second plane of a slotted tree, a box wall, a roof) should follow the parent's
  progress, not run their own spring, or sibling planes scissor: drive the child angle from the parent's `p`.
- Idle sway: set `h.sway` every frame from `windSway()`, a pure function of time and place (`motion.md` section 7).
- `Spring` is a plain damped spring for anything else (camera, UI sheets).
- `rest` sets the standing angle (radians): give every piece a seeded lean of +-0.02-0.04 (nothing stands plumb);
  -0.35 for rails and ramps that lean out. Box-fold buildings: `boxFold({ paints })` with your prints (chimneys,
  crests and signs ride its `userData.ridge` frame); raised decks: `platform()` (a parallel fold, the deck stays
  level); domes: `H.dome` (parallel slices); lit panes: `P.glow` + `mesh.userData.setGlow(v)`.
- Small floating pieces (bubbles, sparks, flakes, fireflies) must not cast shadows (`castShadow = false`): through the
  soft-shadow filter they print as speckled dirt on the ground. Let them carry a faint self-glow instead.

Motion language, keyframes, choreography: `motion.md`. Structure types: `structures.md`; construction details:
`mechanisms.md`.

## 5. Light and shadows

`paperLights(scene, opts)` adds a shadow-casting warm key, a fill (no shadow) and a warm hemisphere. Pass the
template's values (the kit's defaults are the same directions on a smaller rig: fill 0.95, `shadowExtent` 30, map
2048, `distance` 60); directions point from the scene to the light:

| Part | Template | Why |
|---|---|---|
| Key | `#ffdcb2` 3.0, `keyDir` [-0.8, 0.95, 0.55] | 45-65 deg off the camera axis, 45-55 deg up, a little toward the camera: shadows fall sideways and behind, in view (a key from behind the camera hides them) |
| Fill | `#f2dcc2` 0.8, `fillDir` [0.45, 0.5, 1.0] | frontal, from the camera side: upright cards facing the camera do not go grey |
| Sky | `#fff0da` over `#b39a78`, 0.42 | |
| Shadow leak | `PAPER_LIGHT.leak` `#a0602c` | the world's shadow colour (here a warm ground's day amber), more saturated than the ground, never grey |
| Shadows | `softness` 0.26, `maxPenumbra` 1.4; map 4096 over `shadowExtent` 50, `distance` 100 | see the frustum note below |

Moods live in the template's `MOODS` table (`?mood=golden|dusk|night`): key, fill, sky, leak, wrap, pane glow, lamp
pools and lens options, all written from that one place before the first render; the prints never change. Values and
why: `look.md` section 8; another light condition starts from its preset in `assets/lights.json` as its own record
(section 1; `palettes.md` section 4). A low key (golden hour, dusk: 20-35 deg up) needs a deeper shadow box: the
shadow camera spans 0.4-1.6 x `distance` along the light, so raise it (`createHarness({ light: { distance } })`; a
mood's `dir` places the key at that distance too) until near and far cover the scene, before `enableSoftShadows`
bakes the range; check the far corners with `?diag=key`.

`enableSoftShadows(key, { softness, maxPenumbra, minPenumbra, sheet })` patches three's BASIC shadow path into PCSS
(Vogel blocker search, penumbra = softness x gap, Vogel PCF, per-pixel interleaved-gradient rotation) and records a
second lit fraction that ignores blockers within one sheet thickness (`sheet`) for the back-lit glow. The constants
are baked in at patch time: call it after the key's shadow camera is final and before the first render; re-patching
needs a reload.

Shadow frustum: keep it just larger than what the camera sees. For a moving camera, fit it to the visible ground,
quantise its size in steps and snap its centre to shadow texels, or shadows shimmer as the camera follows: a camera
that follows a hero calls `fitShadow(lights, lookAtPoint)` whenever it moves (it re-centres the key's box and the
fill on that point, snapped to whole shadow texels). Shadow bias slightly above the gap between folded-flat layers so
flat paper casts nothing.

## 6. Lens: PaperPost

`new PaperPost(renderer, scene, camera, opts)` renders the scene into a half-float MSAA target with a depth texture,
then: DOF gather pass -> grade pass (sharpen in focus, world-space light falloff, contact occlusion, silhouette depth
line, ACES grade, hue-masked green pull, shadow lift, display-space haze, vignette, grain). Options, with what the
day template passes (rows it does not pass are kit defaults). `LENS_DEFAULTS` differs slightly (band 0.26, ramp
0.34, blur 14, exposure 0.8, contrast 1.1, tint (1.02, 0.99, 0.97), saturation 0.95, green pull 0.25, vignette
0.05): pass the template's values. The template's `focusBand` 0.3 plus its ramp gives the visibly sharp band of
~36-45 % of the frame height that law 6 asks for (`measure.py` focusHeight, the half-peak band, reads wider:
~0.55-0.75, the source game's gameplay frames 0.67-0.72; the gate is >= 0.35).

| Option | Template | Meaning |
|---|---|---|
| `focusBand` / `ramp` | 0.3 / 0.3 | fully sharp share of frame height / frame heights from sharp to max blur |
| `maxBlur` / `nearGain` / `farGain` | 18 / 1.6 / 1.0 | blur radius px at 1080p; near blur reaches max sooner |
| `depthWeight` | 0.8 | 0 = pure screen tilt-shift, 1 = pure depth; 0.8 keeps tall cards consistently sharp |
| `falloff` / `falloffTint` | 0.12 / 0.07 | brighter/warmer toward the key side, across the frame |
| `ao`, `aoRadius`, `aoBias`, `aoTint` | 1.2, 1.6, 0.08, `#5a3214` | contact occlusion (world units) in the world's shadow colour (the template's: a warm ground's umber; match `aoTint` to the leak) |
| `edgeLine`, `edgeLineColor`, `edgeLinePx` | 0.3, `#c2aa94`, 1.1 | darker line where a card stands before something far |
| `exposure`, `tint`, `saturation`, `contrast` | 0.82, (1.03, 0.985, 0.98), 0.96, 1.18 | ACES grade |
| `greenDesat` | 0.3 | a hue-masked pull of saturated yellow-green toward a muted paper green (`look.md` section 7); lower it (`lens: { greenDesat }`) when the brief's greens are fresh, <= 0.1 for teal-led worlds |
| `shadowTint`, `shadowLift` | `#3a200c`, 0.03 | a floor in the world's shadow colour under the darkest tones (umber on a warm ground, navy at night), never black |
| `haze`, `hazeStart`, `hazeEnd`, `hazeAmount` | `#d8bf8e`, 34 -> 95, 0.3 | display-space haze by ground distance from `post.focus`: subtle and far, never a colour fog |
| `vignette`, `vignetteColor`, `grain`, `chroma`, `sharpen` | 0.03, `#2a170b`, 0.012, 0.55, 0.3 | |

Moods overwrite some of these (`Object.assign(post.o, M.post); post.apply()`).

Set `post.focus` every frame to the point that must be sharp (the hero's chest, the centre of the reveal). Call
`post.apply()` after changing `post.o` at runtime. `post.view = 1` shows the circle of confusion (red far, green near).

Everything that must look like part of the world has to go through `post.render`: HTML or canvas overlays are not
graded or blurred; that is fine for a fading hint, wrong for anything that should sit in the scene.

## 7. The printed ground

The camera looks down into the world and the printed ground runs past every frame edge: no book, page block, gutter,
board, table, horizon or sky in frame unless the brief is literally a physical book. The template:

- One large printed ground plane, far bigger than the frame (128 x 100 units at 22 px per unit), one canvas, never
  tiles: watercolour washes with wet edges (pigment pooling at the rim, never an outline), the leading line and the
  region patches as torn paper with a pale unpainted border, small marks gathered in drifts from a noise mask; the
  paper sheet multiplied over it, the paper normal map tiled separately. What is printed is your world's (sand
  ripples and shell marks on a reef floor, regolith and tracks on Mars); the countryside example prints a river, a
  ragged path (three passes with different wobble), field patches, and grass and flowers in drifts.
- Beyond it, a big plain paper plane in the ground colour a hair lower (800 x 800 units), so no view finds an edge;
  the subtle far haze takes the distance (it starts beyond the focus, so the near foreground stays clean).
- Streaming worlds: print a flat twin of each pop-up where it lies folded, so nothing pops in (`worlds.md` section 3).
- A physical book, only when the brief is one: a page block of slightly uneven cream sheets, board covers, a soft
  gutter dip shaded asymmetrically to the key, an unprinted margin, and a camera pulled back far enough to show them.

## 8. Clock and capture hook

Deterministic stepping makes stills and videos repeat exactly. In outline (the template's `harness.js` has the full
hook of section 1, whose `restart()` also resets the hero and the camera):

```js
renderer.setAnimationLoop((now) => { if (!auto) return; step(Math.min(0.05, Math.max(0, (now - last) / 1000))); last = now; render(); });
function restart() { time = 0; for (const h of hinges) h.reset(0); setOpen(true); }   // all flat, t = 0, opening again
window.__papercraft = { step(sec, fps = 60) { auto = false; for (let i = 0; i < Math.round(sec * fps); i++) step(1 / fps); render(); return time; }, restart,
  resume() { last = performance.now(); auto = true; }, toggle: () => setOpen(!up), post, scene, camera, pieces: hinges.length, ready: true };
```

`step()` stops the real-time loop; `resume()` restarts it and resets `last`, so the first live step does not jump.

- Clamp the real-time step to [0, 0.05] s: a slow build (seconds of card printing) can make the first animation-frame
  timestamp older than the `performance.now()` read before it, and a negative step runs every spring backwards, so
  the world never opens (two test agents hit this).
- Every review frame is `restart(); step(T)`, never a grab of the free-running loop (`step(0.8)` after `restart()` is
  a true mid-rise frame). `h.reset(p)`, `FlapSpring.reset(p)` and `Spring.reset(x)` jump to a value at rest.
- The hook is `window.__papercraft`. Seed every random choice (`P2.rng(seed)`), drive all motion from the simulated
  clock, seed grain from the frame index; then a headless browser can call `step()` and screenshot at exact times
  (`process.md`).

## 9. Performance

- **Build time** is the first thing a player waits through: the page shows only its ground colour until the build
  ends. Aim under ~5 s on a desktop (the template: ~400 pieces, ~1,000 prints, ~4.5 s). A print costs pixels times
  layers: most take 2-8 ms, a big many-layered one 50-100 ms; walking (`play`) prints every piece in full. Over 6 s
  the harness names the slowest scene lines in the console, and `__papercraft.printStats()` lists them (prints, ms,
  ms each, Mpx, by the line that asked; `scripts/capture.py` prints it too). The levers, biggest first: ONE print
  stamped on many cards (`const m = H.printed(pts, paint)`, then `popup(pts, null, { materials: m, ... })`; a forest
  of 60 from 6 prints, varied in scale and turn, ~3 identical in view: a tester's 63 bamboo clumps printed one by one
  took 18.6 s); resolution (`popup({ res: 0.6-0.75 })`, `H.cardOpts(x, z, scale, parent, res)`; time goes with res
  squared) for big pieces seen only at the follow distance and for far rings; `effects: 0` (layers printed flat) for
  what the lens always blurs; fewer layers (one `P.layer` per batch of non-overlapping parts: every part still gets
  its own lip and shadow). A cross prints once (its second plane is the first's print, tinted, unless you give it
  its own `second: { pts, paint }`); `'mirror'` backs reuse the front.
- **Frame rate:** measure fps in the live loop, never by timing `step()` (the browser defers GPU work past your code);
  under 20 fps the [0, 0.05] s clamp turns play into slow motion, not dropped frames.
- **Draw calls:** the template keeps one material set per card, and every card draws three groups (face, side,
  back) in the main pass and again in the shadow pass: ~3,000 calls for ~600 cards (60 fps on a desktop). When draw calls bind (a game, mobile), paint all
  prints into one atlas canvas, give each card UVs into its cell, and share one material; merge static cards
  (`BatchedMesh` or `mergeGeometries`); the shipped game went from 400-660 draw calls to ~40 by sharing one material.
- **Post cost:** the DOF pass is the expensive part (`taps` 40 at full resolution). For mobile pass `lens: { taps:
  24 }` (a shader define: set it at construction, `post.apply()` does not change it), or render DOF at half resolution
  (a change to PaperPost, which has no option for it); drop `ao` to 0 and `sharpen` to 0 on low tiers.
- **Shadows:** a 4096 map over the visible area (2048 on the med tier); PCSS taps 16/24 (high) down to 6/8 (low):
  `enableSoftShadows(key, { blockerSamples, filterSamples })` (the 3D harness keeps 16 / 24).
- **Textures:** `pxPerUnit` drives memory; keep a card's texture near its largest on-screen size, not above.
- **Quality tiers** that held: high (DPR 2, 4096 shadows, MSAA 4, full post) / med (DPR 1.25, 2048, MSAA 2, fewer
  taps) / low (DPR 1, 1024, no AO, no chroma, fewest taps).

## 10. Pitfalls

- Sharing one material between a `Mesh` and an `InstancedMesh`/`BatchedMesh`, or toggling `receiveShadow` on shared
  materials, makes three recompute programs every switch (garbage every frame): give each variant its own instance.
- Changing the number of lights recompiles every program; toggle intensity instead. Compile every shader variant you
  will need at start-up (`renderer.compile`) or the first lamp hitches.
- Alpha-cut cards cast filled shadows unless the shadow pass uses the same alpha test (`customDepthMaterial`).
- `Color.set('#hex')` parses a string every call; cache colours in hot loops.
- A depth texture on an MSAA target is supported in r187; if your three version complains, render depth separately.
- Night/day or mood changes: write every look value from one place per frame; scattered writers fight each other.
- Do not use `scene.fog` with PaperPost: haze is applied in post from ground distance, fog would double it.

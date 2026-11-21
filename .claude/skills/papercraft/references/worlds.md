# Paper worlds

How a scene or an endless procedural world reads as one printed page: the flat print already shows what will rise,
the world unfolds just ahead of the reader and closes behind, generation is seeded and order-independent, density
reads as paper, and a single diorama is composed in layers.

Read this when: building a level, a streaming or endless world, a reveal that follows a character or cursor, a world
generator, or composing one diorama scene or hero shot.

Contents: 1 Principles; 2 The page is the world; 3 Never pop: printed twin and ink-in; 4 Reveal and fold-back;
5 Derive the radii from your frame; 6 Seeded chunked generation; 7 Biomes as soft regions; 8 Density and scale;
9 Composing one diorama; 10 Checks

Units: **H** = hero height, **M** = module (one generator tile; ~3.3 H in the source), **R** = reveal radius
(derived in section 5), **F** = frame height. Seconds stay seconds. *(opt)* marks a flourish; the rest is required.

## 1. Principles

1. **The world is a page.** Everything rises out of a print and folds back into it; nothing appears or vanishes.
2. **The flat print already shows what will rise.** Rising is a change of state, never an arrival.
3. **The world unfolds around the reader**, slightly ahead, as an outward ripple; it never flickers with small moves;
   the page closes behind, where it can be seen.
4. **Same seed, same world**, in any visiting order: content is a function of (seed, chunk), never of history.
5. **Dense, chunky, grouped**: a full model world of big pieces in groups with clearings between them; the open
   ground is designed, not left over.
6. **Every frame is a composed diorama**: layers, tone steps away from the light, a readable hero, a framing
   foreground.
7. **The ground stays flat; what the hero walks on is built open**: bridges, jetties, boardwalks, stairs and lookout
   decks are constructions (a deck on posts, planks between side cards, treads on stringers) and the walk field reads
   them (`mechanisms.md` section 14); height on the land comes only from nested cards, V-folds and rock outcrops
   (`mechanisms.md` sections 6 and 8), and a slope the brief names is built as terraces and steps (`mechanisms.md`
   section 14; a masonry terrace with a printed face is allowed there). The generator places the constructions as
   landmarks first and keeps the dressing off them.

## 2. The page is the world

- **Ground past every edge.** The camera looks down into the world (pitch 40-55 deg) and the printed ground runs past
  every frame edge: no book, page block, gutter, board, table, horizon or sky in frame. Make the printed sheet much
  larger than the view, with a plain paper plane in the ground colour beyond it (`three-js.md` section 7); the owner
  asked to remove the visible page border. The world reads as paper through the cards, the print, the creases and
  the fibre, not through a book's edges.
- **A window with slack** (streaming): the printed sheet follows the reader with a small dead zone (~0.3 H sideways,
  ~0.8 H in depth), but everything printed on it is fixed in the world, so the print scrolls under it.
- **Quiet seams.** Hinge score lines are a pop-up cue; a tile grid is a game cue. Module seams: at most a 1-2 px
  crease at ~4 % darkness, better none (critics flagged "visible tiling grid lines").
- **The one exception: a brief that is literally a physical book** (or a page inside a UI) shows the page's edge
  (`look.md` section 1): a page block, covers, an unprinted margin (~1.2 H) where nothing rises; the look inside stays
  this one. Its world-side rules, if it has gutters (world-fixed folds every ~7 M): each is a real valley (half width
  ~0.35 M, ~7 % H deep, ~27 % H toward the head and tail edges) with every shading tilt eased to zero AT the fold, and
  the hero's height follows the dip; a hard dark gutter read as a rule through the frame. Nothing else here changes.
- **Unrevealed land as a pencil plan** *(opt, strong)*: full colour within ~1.3 R of the subject; beyond ~2.25 R a
  pale wash with pencil outlines (the luma gradient of the print itself) and light hatching in dark areas; a
  noise-warped boundary (+-0.27 R). Prints of pieces not yet risen stay ~30 % paler and greyer (25 % colour beyond
  ~1.6 R), so the page sits behind the standing pieces. It sells "the book is being made as you read".

## 3. Never pop: printed twin and ink-in

- **Bake the flat state from the real pieces.** Render every piece top-down, orthographic and unlit (ambient only:
  pure albedo) with its real materials, twice: the base print, and the twin with every card folded flat. The page
  shows that bake. Never draw a separate base mesh: the page already shows the identical print, so a piece can
  appear and disappear without a pop.
- **Fade the twin as the cards lift** and bring it back as they land (p = the piece's mean progress):
  ```js
  const twin = (p) => { const t = Math.min(1, Math.max(0, (p - 0.04) / 0.5)); return 1 - t * t * (3 - 2 * t); };
  ```
- **Ink lifecycle per cell**: `ink += dt / 0.45` while the cell is marked, `ink -= dt / 1.3` otherwise, eased with a
  smoothstep, with a soft halo into the neighbours (no hard steps). Mark cells ~1 M (~0.33 R) before the ring reaches
  them; a cell's rise timer only counts once it is fully inked, and a piece rises only when it lies wholly on inked
  page.
- **Whatever the runtime hides, the bake hides.** Thinning filler cards, biome-hidden props and culled pieces are
  decided per model and card name, never per cell, and left out of the twin too. Otherwise "a printed tree vanishes
  when its tile rises", or prints have nothing rising.
- Whatever the material does unlit (baked contact darkening, tints) lands in the bake: classify and repaint the
  ground in one continuous tone if stains show (`look.md`).
- **Acceptance**: colour difference between the last frame before and the first frame after a spawn <= 3 dE00
  (shipped: mean 1.56, worst 3.23).
- 2D: the twin is the same art drawn at p = 0 (height `h * sin(pitch)`, `mechanisms.md` section 2) in the page tone;
  cross-fade with the same curve.

## 4. Reveal and fold-back

Three distances drive it: dT to the hero, dF to a point ahead of him, and `back`, the distance behind him along his
smoothed heading.

```js
// 1. the anchor trails the hero on a rope (the grace area): small moves and turning on the spot change nothing
const gx = hero.x - anchor.x, gz = hero.z - anchor.z, gl = Math.hypot(gx, gz);
if (gl > ROPE) {
  const k = 1 - Math.exp(-dt / 0.3);                                     // heading low-passed over 0.3 s
  head.x += (gx / gl - head.x) * k; head.z += (gz / gl - head.z) * k;
  anchor.x = hero.x - (gx / gl) * ROPE; anchor.z = hero.z - (gz / gl) * ROPE;
}
const hl = Math.hypot(head.x, head.z) || 1, hx = head.x / hl, hz = head.z / hl;
const ax = anchor.x + hx * BIAS, az = anchor.z + hz * BIAS;               // ring centre, ahead of the anchor
// 2. per cell: separate rise and fold rules (hysteresis), a flip interval, a ripple delay
for (const c of cellsAround(hero)) {
  const dT = Math.hypot(c.x - hero.x, c.z - hero.z), dF = Math.hypot(c.x - ax, c.z - az);
  const back = -((c.x - hero.x) * hx + (c.z - hero.z) * hz);
  let want = c.target;
  if ((dF < R || dT < NEAR) && back < BEHIND - 0.5 * M && c.onPage) want = 1;
  else if (!c.onPageWithSlack || back > BEHIND || (dT > OUT && dF >= R + 0.12 * R)) want = 0;
  if (want === c.target || (t - c.flipT < 2 && !(want === 1 && dT < REFLIP) && c.onPageWithSlack)) continue;
  c.target = want; c.flipT = t;
  c.timer = want === 1
    ? (firstFrame || dT > R - 0.25 * R ? (dT / M) * 0.055 + c.jit * 0.035 : 0)   // edge cells ripple by distance
    : (Math.abs(sideOffset(c)) / M) * 0.07 + c.jit * 0.035;                    // close rows from the track outward
}
// 3. a rise starts when its timer runs out AND its print is fully inked; at most 6 starts per frame
```
`c.jit` is a seeded value in [-1, 1] per cell. On the first frame and after a teleport every cell ripples by
distance, so the world opens as a ring spreading outward.

| Key | Relative value | Shipped |
|---|---|---|
| Reveal radius R | derived from the frame (section 5) | 3 M = 10 H |
| Ring centre ahead of the anchor (BIAS) | 0.45 R | 1.35 M |
| Always reveal around the hero (NEAR) | max(1.07 R, frame half-width + lead) | "nothing next to you stays flat" |
| Rope (grace area) | ~1.7 H (half a module) | 7 s of jitter in place: 61 rises before the rope, 7 after |
| Ripple | 0.055 s per M (~0.017 s per H; band 0.04-0.07 per M) + seeded +-0.035 s | measured slope 0.054-0.058 s per M |
| Start budget | <= 6 rise starts and <= 4 new pieces per frame; the rest wait a frame | world update ~0.1 ms |
| Not through the hero | a flat cell under the walking hero waits up to 0.8 s before rising | opening ripple and teleports exempt |
| Fold behind (BEHIND) | derived (section 5); close outward at +0.07 s per M from the track | 2.6 M |
| Hysteresis | rise and fold rules 0.12 R apart; page slack ~0.8 H | |
| Flip interval | >= 2 s per cell, except re-rising within REFLIP ~0.58 R of the hero, and at the page edge | page-edge churn: 52 flips in 60 s before |
| Fold out / forget | OUT 1.42 R; despawn and pool beyond 2 R | 4.25 M / 6 M |
| Wider views | grow R by the view's extra reach, eased ~0.28 R/s | modules ripple up as the lens pulls back |

**Timeline for one cell** at a calm walk (~1.9 H/s): pencil print -> inks in over 0.45 s about 1 M before the ring ->
ripple delay 0-0.2 s -> its cards start over 0.34 s -> each rises in ~0.25 s and quivers until ~1 s. About 2 s in
all, roughly one module of walking: this is why the ring's far rim must lead the hero by several modules.

- **Pool, never destroy**: a folded, settled piece goes back to a per-model pool and is snapped flat on reuse. A flat
  piece is not an object at all: flat terrain is just print.
- Measured after tuning: 81-90 % of rises start inside the frame; no flat module within ~0.67 R of the hero.
- History, each a fix worth copying: tiny back-and-forth moves made the world twitch (fix: the rope); a circular
  fold-back happened outside the frame so nobody saw the page close (fix: the row rule inside the frame, closing
  outward from the track); walking toward the camera, the rising rows were off-frame (fix: more camera lead that
  way, `motion.md` section 10).
- 2D side-scroller: the same rules on one axis. Rise columns entering a band just inside the leading frame edge
  (with the camera lead), ripple by distance from the hero, fold columns once they are half a module past the
  trailing edge, same rope and flip interval.

## 5. Derive the radii from your frame

Do not copy module counts; they belong to one camera. Compute what your frame shows on the page, then place the
ring so pieces start rising as they enter the top of the frame and close just inside the trailing edge.

```js
// lens height above the page, pitch down and vertical FOV in radians; aimAhead = ground distance from the hero to
// the aim point while walking (aim offset + look-ahead, motion.md section 10)
function frame({ height, pitch, fovY, aspect, aimAhead }) {
  const far = height / Math.tan(pitch - fovY / 2);      // Infinity if the top edge sees the horizon: use the haze start
  const near = height / Math.tan(pitch + fovY / 2), aim = height / Math.tan(pitch);
  return { aheadTop: far - aim + aimAhead, behindBottom: aim - near - aimAhead,
           halfW: Math.hypot(height, aim) * Math.tan(fovY / 2) * aspect };
}
const R = (f.aheadTop + ROPE) / 1.45;                   // far rim of the ring (anchor - rope + 0.45 R + R) at the top edge
const NEAR = Math.max(1.07 * R, f.halfW + lead);        // full frame width revealed at the hero's row
const BEHIND = f.halfW + lead - 0.5 * M;                 // walking sideways, rows close just inside the trailing edge
const OUT = 1.42 * R, FORGET = 2 * R, WIND = 1.8 * R;   // safety nets beyond every frame edge; idle sway radius
```
Walking up-screen, the bottom edge is only `behindBottom` behind the hero (~2.7 H below), so rows close out of view in
that direction; walking sideways is the case that must show the page closing, hence BEHIND from the half-width.
Budget check: the rim's lead over the hero (`1.45 R - ROPE`) must exceed `2 s x walking speed + 2 M`, so everything
he reaches has settled. Re-derive whenever FOV, pitch, distance or walking speed change (the shipped radii shrank
from 4.5 / 6.5 / 8.5 M to 3 / 4.25 / 6 M when the camera moved in).

Worked example with the shipped camera (27 deg FOV, 42 deg pitch, lens ~12.6 H above the page, 16:9, aim 1 H ahead
of the hero plus a 1.7 H lead, rope 1.7 H, M = 3.3 H):

| | Derived | Shipped |
|---|---|---|
| Frame: ahead to top edge / half-width | 11.9 H / 8.1 H | |
| R | 9.4 H (2.8 M) | 10 H (3 M) |
| NEAR | 10.0 H | 10.7 H |
| BEHIND | 8.1 H (2.4 M) | 8.7 H (2.6 M) |
| OUT / forget | 13.3 H / 18.7 H | 14.2 H / 20 H |
| Budget: rim lead vs needed | 11.9 H vs 10.5 H | passes |

Then verify by counting, not by eye: at least 80 % of rise starts inside the frame, no flat module next to the hero,
no flips while the hero jiggles in place, and the page visibly closing behind him when he walks sideways.

## 6. Seeded chunked generation

The structure below is the shipped countryside's (rivers, roads, villages, ponds). Keep the method (stateless fields
at the chunk borders, sockets, a WFC with weights) and swap in your subject's leading lines and landmarks: reef
channels and coral heads, station corridors and modules, ski runs and chalets.

- **Chunks from (seed, chunk) only**: e.g. 8 x 8 modules; cache them, evict the oldest beyond a budget (~2k chunks)
  and regenerate identically on demand. No unseeded random anywhere; every choice is a hash of (seed, cell, salt).
- **Global structure first, from stateless fields at the chunk borders**, so neighbours agree without talking:
  ```js
  function label(kx, kz) {                                  // 0/1 per chunk CORNER from a warped stripe field
    const f = ((kx - 0.5) * na + (kz - 0.5) * nb + WARP * (warp(kx, kz) - warp0)) / SPACING;
    return Math.floor(f) & 1;
  }
  const riverCrossesEdgeX = (kx, kz) => label(kx, kz) !== label(kx + 1, kz);   // an edge between two corners
  ```
  Any corner labelling gives every chunk an even number of river crossings, so a river never dead-ends at a seam.
  River spacing ~2.7 chunks, tilt <= 0.75 rad, warp ~1.4 chunks at a period of ~4.5. Roads: every chunk owns one
  road to its north or east neighbour (by hash), which makes one connected network, plus ~18 % extra edges for loops.
- **Plan inside the chunk**: route the river and a trunk road between the border crossings as noise-cost shortest
  paths (a road turn costs ~1.8, straight runs <= 4 cells, no hairpins, roads cross rivers only at right angles as
  bridges, never two bridges side by side). These become fixed sockets. The first network was too dense and
  right-angled: loops came down from 50 to 18 % and the turn cost went up from 0.7.
- **Then a real WFC fills the rest**: bitmask domains, lowest entropy first, weighted pick, propagate to a fixpoint,
  ban and backtrack on contradiction, restart with a new plan, and a guaranteed stub fill as the last resort (never
  needed in practice). Sockets are edge labels (grass / path / river); rotations with the same socket signature are
  one option, and the visible rotation is picked by a per-cell hash among the rotations that read
  (`mechanisms.md` section 13).
- **Weights that make it look composed** (starting values from the countryside world):

| Rule | Starting values |
|---|---|
| Masses and clearings | value-noise fields: forest period ~10 cells, hills ~12, flowers ~5, settlements ~9 |
| Keep the camera side of a road low | cells just in front of a road: forest x0.4, hills x0.45, groves x0.7, tall landmarks x0.3 |
| Landmarks | one of a kind per chunk, never touching (x0.12 within 3 cells), a clearing beside them (trees x0.03) |
| Anti-wallpaper | one-layout fillers damped next to themselves; never a solid 2 x 2 of one scenic tile (x0.01-0.03) |
| Villages | weight x2.2; short streets (2-3 in a run), lamps spaced out, junctions never stacked |
| Lanes | every side lane has one socket pointing "home" toward the trunk road; no orphan paths |
| Straight runs | <= 4 cells on a border, <= 6 inside, so runs stay short across seams |

- **A hand-laid start**: compose cell (0, 0) by hand (the countryside: a lamp post on a road, a house and a bridge
  nearby), override its borders inside the stateless fields so neighbours agree, and boost the landmarks the first
  minute must show within ~4 cells (there: hamlets x3 and ponds x2, so it shows a village and water).
- Measured: 0 socket mismatches in 400,000 edges, identical in 4 visiting orders, ~0.7 ms per chunk.
- Pitfalls: adjacency rules do not see across chunk seams (two windmills 5 cells apart across a seam): put
  one-of-a-kind rules into the stateless fields. Grid paths become staircases: author winding lanes inside the
  modules (centre-line splines with width noise that is zero at the sockets) and print the road as a hand-cut ribbon.

## 7. Biomes as soft regions

- Jittered Voronoi sites every ~11 M (jitter +-0.35 of the spacing), domain-warped by value noise (period ~5.5 M,
  amplitude +-1.6 M) for wobbly borders. Fix the start site to the home biome and its 4 neighbours, so every biome
  lies within ~12 M of the start.
- Continuous things (light, grade, weather, wind) blend with `w_i = exp(-(d_i - d_min) / 1.6 M)`, normalised. Tile
  choice uses the hard nearest site times per-model biome multipliers; universal connector tiles are never banned,
  so sockets always connect across a border.
- Ambient life uses sharpened weights (smoothstep 0.2-0.8): a 20 % share of a neighbour brings none of its life.
- Per biome: one albedo transform (hue, saturation, tint, gain, lift; home = identity) plus wind strength, weather
  and grade (`look.md` section 8). Very dark pieces (posts, trunks, ink) keep their own colour, so a pale tint never
  washes them into ghosts.

## 8. Density and scale that read as paper

- **Dense, chunky, grouped.** At the hero framing: 100-250 pieces of ~20 kinds in frame (a crossed tree or a stacked
  bush counts as one piece; the source game's gameplay frames hold ~270-320 standing cards, and `__papercraft.cards()`
  in the 3D harness counts yours) in groups of 4-8, 6-10 groups in the frame, the sharp band packed (measure.py
  barePct, the share of the band's tiles with no edge at all, <= ~55; the shipped frames 44-56), the open ground mostly
  outside it (the leading line, any water, a few clearings); round 8 builds with wide empty stretches inside the band
  read as "not enough stuff". A scatter of tiny slivers reads as confetti. Streaming: at most ~5 soft filler cards per
  module, ~6-30 cards per module in all.
- **Sizes against the hero** (hero 6-10 % of the frame height), by role, the countryside's kinds as the example: the
  tallest common kind 2-2.5 H (trees here: they had to grow 1.42x in height and 1.72x in canopy after "a flat green
  field with small scattered pieces"; coral heads on a reef, masts and tanks on a station), buildings ~1.7 H, low
  dressing 0.5-0.9 H tall and about twice as wide (bushes and rocks: `P2.shape.mound`, a flat base that stands on its
  fold), creatures 1/3-1/2 H, props 1.6-2x "realistic". Big pieces carry printed structure (two-tone leaves over a
  branch fan on a crown, framed lit windows on a wall: `procedural-art.md` section 3), so size reads as illustration,
  not as a larger blob of fill.
- **Clusters are the dressing unit** (`mechanisms.md` section 9; `clusterLayout()` in `paperkit-3d.js` with your
  world's small pieces): 4-8 DIFFERENT pieces (a door scene may be 2-3), each group anchored to something (a house
  corner, a post, a tree foot, a pond rim, a path bend), never the same group stamped twice; every second small rock
  in a cluster was cut as clutter.
- **Small scenes, not scatter.** Each group tells a small thing (in the countryside: a bench and flowers by a door, a
  barrel, a crate and a cat at a shop, hens and hay at a barn, a boat and reeds at a bank). 15-20 kinds of prop across
  a world; at most ~3 identical props or creatures in view, each varied ~+-15 % in scale, hue and turn (cap them in
  the fill); low fillers (tufts, stones, flowers, mushrooms) may repeat, varied, between groups, so the open ground is
  quiet, not empty. A world dressed with clones of 3-4 kinds read as a tech demo at once (round 5 builds, round 6
  critic).
- **Design the negative space**: open ground between groups, clumped (never even) spacing, the camera side of the
  leading line low. Composition was the weakest score of the shipped countryside (3.5 -> 4.5 of 10): too busy and
  wooded, its cottages small against the trees, even spacing.
- **Lead lines**: ONE leading line by default, taken from the subject (a lane, a current, a corridor, a trail; section
  9), runs as a diagonal or a curve that bends at least twice in frame, never a staircase, a ruler line or a band
  across the whole width (`P2.pathLine(ctrl)` runs one in any direction; its `dist()` keeps pieces off it). A second
  line only where the subject has two routes; where two lines both wind, check they cross only where a built crossing
  is.

## 9. Composing one diorama

A scene, a hero shot or a single level vignette: a pop-up world the camera looks down into (pitch 40-55 deg), the
printed ground past every frame edge. Build it in two passes, as the 3D template does:

1. **Landmarks by hand.** A curving leading line diagonal through the frame, taken from the subject (a lane, a
   corridor, a current, a ski run, a conveyor, a lava channel; a river only if the world has water: the example's
   river and path are its own, not the style's). ONE leading line is enough: add a second line and a built crossing
   (a bridge, a gantry) only where the subject has two routes. Water the brief does not ask for is the example
   leaking (a blind test put a teal "irrigation channel" with the example's torn rim, foam ripples and near-identical
   hexes into a space station); water the brief does ask for takes its world's form (a station trough: straight
   panel sides, pipes, a tiled lip; a reef: no banks at all), never the example's torn river by default. Then the
   subject's landmark cluster (a coral head, a docking ring; a hamlet only if the brief has one); the hero off-centre
   (the template: on the path, lower right third); human-scale props and creatures where the landmark and the leading
   line meet. Give each landmark a keep-out radius.
2. **Then a fill from a slow noise** (a few summed sines, features several groups wide): the densest masses where it
   is high, groups of 4-8 different pieces in the middle, clearings where it is low. Candidates sit on a jittered
   grid, off the leading line, any water and the keep-outs, and only where the camera can see: the template projects
   each candidate with the camera (`inFrame`, tested ~1 H above the ground with a small margin), so nothing is built
   off screen. Draw each group's kinds without repeats; never stamp a group twice.

**A camera that follows the hero** (a level he walks through, not one fixed frame): decide where he may walk
(`createHarness({ walkArea })`, or `camBox` for one diorama the camera barely leaves) and fill with `H.inReach(x, z)`,
which is true wherever any framing of that walk can show the point; `inFrame` alone dresses only the overview, and
the walk finds bare page past it. Fill the overview first, then the ring `inReach && !inFrame` (the overview's own
draws never change), and keep the ring cheap: stamps of a few prints (`H.printed`) at `res` 0.6-0.75 (`three-js.md`
sections 1 and 9). The 3D harness refits the shadow map as the camera moves; your own wiring calls
`fitShadow(lights, lookAt)` (`three-js.md` section 5).

At the hero framing: density and sizes as in section 8; the hero 6-10 % of the frame height, off-centre, inside the
sharp band.

The frame then reads in three depths:

| Layer | What stands there | Treatment |
|---|---|---|
| Back (top of the frame) | the far reach of the leading line, backdrop flats of the world's far land; tall landmarks (mountains, towers) as layered flats just inside the top edge (`H.groundAt(0, 0.95)` finds it), so the frame cuts them; a landmark whose top is the point (a smoking crater, a spire, a lighthouse lamp) comes nearer and toy-scale, its top inside the frame | lowest contrast, a little far haze (never a colour fog); a hill = 3-5 nested cards stepped ~10-15 % in value, the back one tallest |
| Middle | the subject's ground: the hero, the landmark, the tallest common kinds | full contrast and saturation, inside the sharp band, the strongest shadows |
| Front (bottom edge) | 1-3 framing props from the world's own dressing | darker, partly cropped by the bottom edge or a corner, heavily blurred by the near depth of field |

- Layer spacing, tone steps and cut edges: `mechanisms.md` section 8.
- **Hero readable**: against a simpler, contrasting layer; nothing taller than the hero crosses him from the front.
- **Framing foreground**: blurred props overlapping the bottom edge sell the miniature scale more than stronger blur;
  they never cover the hero or the centre.
- Light reads through the layers: the key from the upper side throws each layer's shadow onto the next; keep the
  area where things rise or matter in the top half of the frame.
- Life: the world's own weather, flyers, smoke and creatures, 3-5 kinds chosen from its environment and time of day
  (`motion.md` section 12; the gallery's five worlds each have their own, `gallery.md`).
- Order of building and rising: `mechanisms.md` sections 4 and 8, `motion.md` section 5. The 3D template's
  `scene.js` is a worked example (river and path crossing at a bridge, a hamlet of box-fold houses with a small scene
  at each door, a pond with a jetty on posts, a rock outcrop, nested hills, a field with haystacks, the hero puppet on
  the path, ~390 hinged pieces of ~25 kinds); write your own scene against the harness, do not ship it.
- 2D: the same three layers as parallax planes, with tone, haze and blur by depth.

## 10. Checks

- [ ] A still of the flat page shows every piece that will rise; nothing pops at spawn (<= 3 dE00 across the frame).
- [ ] At least 80 % of rise starts happen inside the frame; no flat module next to the hero.
- [ ] Jiggling the hero in place for 10 s flips nothing; the page visibly closes behind, from the track outward.
- [ ] Same seed gives identical chunks in any visiting order (hash the chunk contents from two orders).
- [ ] The ground runs past every frame edge (no book edge, table, horizon or sky); density and sizes as in section 8
      (barePct <= ~55, groups of 4-8 different pieces, no confetti, no group stamped twice); the hero readable and
      off-centre.
- [ ] The ground stays flat: height only from nested cards, V-folds and rock outcrops, and a slope the brief names
      from terraces and steps (`mechanisms.md` section 14); everything walked on, under or into is a construction the
      walk field reads (open, or masonry the brief names), and a scripted walk crosses each (`mechanisms.md`
      section 14 Checks).
- [ ] The radii were derived from this camera (section 5), not copied.
- [ ] A following camera: fill built along the route and for the widest camera; the wide review frame shows no fill
      edge; the shadow box follows the camera (`fitShadow`).

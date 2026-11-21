# Paper mechanisms

Pop-up engineering for code: how every standing or moving thing on the printed page is constructed (flaps, flat
stacks, slotted crosses, V-folds, boxes, raised platforms, layered flats, clusters, lean-outs, spinners, characters,
and the built ground the hero walks on: bridges, jetties, stairs, ramps, docks), built in 3D and in 2D, and the rules
that keep every card readable. Any subject (a reef, a city, a spaceship) is built from these.

Read this when: deciding how a tree, house, hill, creature, vehicle or character is built from hinged card; building
anything the hero walks on, under or into (section 14); making something fold flat without passing through itself;
fixing cards that read as slivers from some views.

Which type builds which thing: `structures.md` section 0 (the structure types and their constructors); this file is
how each mechanism is built.

Contents: 1 Ground rules; 2 The hinge in 3D and 2D; 3 Score-line flap; 4 Flat stacking; 5 Slot-together cross;
6 V-fold; 7 Box fold (raised platforms, domes, lit windows); 8 Layered flats; 9 Fans, clumps, clusters,
zig-zags; 10 Lean-outs and low flaps; 11 Spinners and simple movables; 12 Characters from cards; 13 Never edge-on;
14 Built ground: walk on it, under it, into it

Units: **H** = hero height, **T** = card thickness, **module** = one generator tile (~3.3 H in the source). Motion of
every mechanism follows `motion.md`; materials and edges follow `look.md`; outlines and prints `procedural-art.md`.
*(opt)* marks a flourish; the rest is required for the look.

| Mechanism | Reads as | Use for |
|---|---|---|
| Score-line flap | a card standing on a crease | everything; the default |
| Slot-together cross | two cards slotted at 90 deg | anything upright and round that is walked around: trees of every kind (palms and tiered conifers too), cacti, giant mushrooms, tents, posts, lamp posts, signposts, lanterns; the half, quarter and V-fold variants (`structures.md` section 3), a half-front cross for a sign or a tall flat landmark that needs a foot; not for low things (single cards, fans) |
| V-fold | two half silhouettes meeting at an apex | ridges, dunes, drifts, outcrops: a quarter cross opened wider (section 6) |
| Box fold | a folded net with volume | houses, barns, sheds, chests, landmarks; round towers, tanks, kiosks, flat-roofed blocks and other plans: `prismFold` (section 7) |
| Raised platform (parallel fold) | a level deck held up off the page | stages, quays, station platforms; docks, piers, balconies on an open posts face |
| Layered flats | flats with air between them | hills, dunes, skylines, the depth behind the subject |
| Fan / clump / cluster | a few overlapping pieces as one mass | vegetation, rocks, dressing |
| Lean-out / low flap | a card resting at a shallow angle | ramps, the deck ramps inside a bridge (14), water slivers |
| Spinner | a layer turning on a hub | windmill sails, pinwheels, wheels |

The hero is a small 3D model whose parts are Ts (a frontal card with a profile card behind it, section 12); other
creatures are single cards that flip to turn, and all life (weather, flyers, flocks, smoke, creatures) takes
paper-life's kinds (`motion.md` section 12). A fish school or a flock may also be ONE card whose members overlap or
sit on a printed ribbon (one connected cut: loose members are dropped, section 1).

## 1. Ground rules

- Every standing thing is something you could build with a knife, a bone folder and glue: cut, scored, folded,
  slotted or glued. If it ever folds, it folds flat without passing through anything.
- Every card is a slab (T = 1.5-3 % of H) with a hand-cut outline: `roughen` in `paperkit-2d.js` (default 0.8 % of
  the smaller side; the source wandered 0.3-1 % of the piece size), points on the fold line never move (moving them
  opens gaps at the hinge).
- One card is ONE connected cut. `fromDrawing` traces the outer boundary of the part holding the topmost pixel and
  drops parts that do not touch it (it warns with the dropped share): overlap the parts, or make separate cards.
  `drawnPiece(draw, { w, h })` cuts and prints one drawing (`procedural-art.md` section 4).
- Every card is printed, never a flat fill: a layered print you write for your subject with `printCard` and its
  parts (`P.layer`, `P.parts`, `drawnPiece`); the method and the recipes per class are in `procedural-art.md`, and the
  countryside world's prints in `assets/examples/countryside.js` show them in code.
- **Folds are not cuts.** A cut edge gets the rim: a thin dark-brown line at the silhouette (~1.5-2.5 px on screen)
  and a pale highlight just inside it only on the edges that face the light (`P.rim()` derives both from the print;
  `look.md` section 3). Hinge bases and panel joins are folds and get no edge: `makeCard({ folds })` names them
  ('bottom' by default; 'top', 'left', 'right', or a predicate `(x0, y0, x1, y1) => bool` on outline segments;
  `foldSkip(folds, box)` turns that into `P.rim({ skip })` for your own prints). `boxFold` and `platform` mark theirs.
- Show how it is made: a score line where it hinges, glue tabs, the printed twin where it lies flat, a 2-3 deg lean
  (nothing plumb), a contact shadow at the foot.
- Every card reads from every view you allow (section 13).
- A few big mechanisms beat many small cards: chunky silhouettes, nothing thin or spiky, nothing thinner than a
  pencil (posts, rails and stems are fat). Bushes and rocks stand on a flat base along the fold (`shape.mound`),
  never balanced on a point.

## 2. The hinge in 3D and 2D

**3D contract.** A card's node has its origin ON the hinge line; local X is the hinge axis, the paper extends along
+Y when upright, +Z is the face normal. The authored transform is the upright rest pose (it may include a yaw);
`pose(p) = rest * RotX(foldAngle * (1 - p))`, foldAngle = +-90 deg minus the lean (the sign picks the fall side).
Everything that moves with a card is its descendant; nested cards hinge on the parent's face. Per card keep:
foldAngle, delay (stagger order), layer (flat stack), size, wobble. Kit: `makeCard(pts, ...)` builds a card standing
in XY facing +Z with its fold line on y = 0; `hinge(card, { at, yaw, size, flat })` puts it on a page hinge (`flat`
= -PI/2 + lean: it falls back, face up); `h.reset(p)` jumps to p at rest with nothing pending (replays: `reset(0)`
every hinge, then `set(1, delay)` again). For a vertical hinge (box return, cross half) wrap the pivot in a group whose
local X runs up the parent's edge (`rotation.z = PI/2`) and author that card's outline with the shared edge as its
base.

**2D, exact and cheap.** In a view pitched `pitch` down (0 = side view, 90 deg = top-down; use 40-55; the 2D template
adds a mild perspective, each card scaled by k at its base, see `web-2d.md`), a point (u, v) of a card (v up the card
from its fold line) folded FORWARD by phi (0 upright, 90 deg lying face down toward the viewer) lands at screen
x = baseX + u, y = baseY - v cos(phi + pitch): a fold is a vertical scale of the print by k = cos(phi + pitch), and
k < 0 shows the back. Lying flat, a card is h sin(pitch) tall on screen whichever way it folds. The projection of a
rotation is affine, so Canvas 2D draws it exactly:
```js
const phi = (1 - p) * Math.PI / 2, k = Math.cos(phi + pitch);    // p from the flap model (+ wind sway x p)
ctx.setTransform(1, 0, 0, -k, baseX, baseY);                       // local units, +y up the card
drawPrint(k > 0 ? frontArt : backArt);
const f = Math.sign(k), n = [0, -f * Math.sin(phi), f * Math.cos(phi)];   // normal of the face we see
const lit = 0.6 + 0.4 * Math.max(0, n[1] * L[1] + n[2] * L[2]);   // L toward the key (x right, y up, z to viewer)
```
- **Fold toward the viewer in a pitched 2D view.** The rise sweeps through edge-on (k = 0 at phi = 90 deg - pitch)
  and reads as a rotation. A card folded back (face up) only grows taller on screen (k runs sin(pitch), 1,
  cos(pitch)) and reads as a scale-pop (found by a test agent); a pure side view (pitch 0) squashes any rise. The
  kit's 3D `hinge()` falls back by default.
- **Draw order.** "The flat stack is the draw order" (section 4) holds only for cards that fold back. Folded forward,
  the farthest card lies on top, so it rises first; draw in two passes: cards still lying forward (k <= 0) first,
  nearest at the bottom, then standing cards far to near (`assets/templates/popup-2d/`).
- Shadow: the silhouette projected onto the ground along the light is also affine. With a = -cos(phi) Lx/Ly and
  b = sin(phi) - cos(phi) Lz/Ly, a card point (u, v) on a base at screen (x, y) lands at x' = x + u + a v,
  y' = y + sin(pitch) b v.
  Draw the outline through that matrix, multiplied, in the world's shadow colour (amber on warm ground by day,
  lilac-blue on snow, teal under water, navy at night; never grey), tight at the foot and softer with height (2-3
  copies with growing blur, or a blurred copy masked by a gradient from the foot), plus a soft contact pool under the
  base. Key from the side and a little front: under a pure side key, cards that face the viewer cast only slivers.
- Perspective and arbitrary hinge directions: CSS 3D (`perspective` on the stage, `transform-style: preserve-3d`,
  `transform-origin` on the fold line, `rotateX`, two faces with `backface-visibility: hidden`) or WebGL. Details:
  `web-2d.md`.

## 3. Score-line flap (the default)

| Part | Build | Value |
|---|---|---|
| Card | outline with a straight base on y = 0 (the fold), extruded to T | T 1.5-3 % H |
| Lean | random per card, folded into foldAngle so flat stays flat | +-2.5 deg (0-4) |
| Feet | if the hinge sits on a raised stack layer, extend the card below the hinge down to the page | else every stand-up floats by its layer height |
| Contact | darken toward the fold (baked or `makeCard({ contact })`) | 10-14 % over the lowest ~1/3 H |
| Back | the same art mirrored (die-cut) or half kraft | `look.md` section 3 |
| Score line | pale strip printed across the hinge, half-way from ground colour to the paper stock | ~3 % H wide, ~2 % H past each end |
| Glue tabs | kraft trapezoids at both ends, only on cards wider than ~0.5 H | ~18 % H wide at the hinge, 15 % at the tip, ~12 % H deep, ~0.17 H in from each end |
| Twin | the piece's own print folded flat, baked onto the page (`worlds.md` section 3) | the same albedo as the flat card, so a spawn never pops; it fades as the card lifts |

2D: the score line, tabs and twin are page print; the card is the projected card of section 2.

## 4. Flat stacking: folds flat without interpenetration

Every piece folds flat inside its own footprint and stacks; a closed piece is a clean print, and opening it reveals
the print it came from.

```js
// cards in build order (bottom of the stack first); Hf = height field of the stack's visible top (~96^2 per module)
for (const c of cards) {
  c.side = bestFallSide(c);                         // try both; prefer the flat footprint that stays inside the piece
  if (overhang(c) > 0.03 * H && c.nudgeable) nudgeInward(c);
  const cells = rasterFlat(c), under = Math.max(...cells.map((k) => Hf[k]));
  c.layer = Math.max(0, Math.ceil((under + CLEAR - c.lowestUpFaceWhenFlat) / GAP - 1));
  c.hingeY = GAP * (c.layer + 1);
  c.foldAngle = c.side * Math.PI / 2 - c.lean;      // flat is exactly flat
  for (const k of cells) Hf[k] = Math.max(Hf[k], c.hingeY + T / 2);
}
cards.forEach((c, i) => (c.delay = cards.length > 1 ? 1 - i / (cards.length - 1) : 0));   // top of the stack rises first
```
- GAP ~0.7 % H (a quarter of T); CLEAR ~0.27 % H. Cards are thicker than the gap; that is fine: a folded card may
  sink into the one below where nobody sees it, as long as every VISIBLE top face clears what lies under it.
- Keep the stack under ~15 layers and ~13-20 % H high (a forest stacked 33 % H high and had to be relaid); flat
  overhang <= 3 % H.
- Groups that must stay together (fan, clump, cluster, box) shift by ONE common offset. Nudging members one by one
  pulls a group apart.
- Shadow bias just above GAP: flat layers cast no shadow and the shadow grows as a card rises.
- Static dioramas that never fold can skip the solver, but keep gaps between coplanar cards (z-fighting).
- 2D: for cards that fold back, the flat stack is the draw order; each folded layer gets a 1 px offset and a faint
  contact line. Forward folds (the pitched 2D default) use the two-pass order of section 2.

## 5. Slot-together cross: volume from two printed planes

The papercraft way to give a thing volume without sculpting it: cut two cards of it, slot one halfway into the other
at 90 deg, and print both. From any side the camera sees one plane nearly face-on (its print reads in full) and the
other in perspective (its edge and its own print show the depth), and the slot line down the middle says "this was
made". One flat card is edge-on from two of every four views; two slotted cards read from everywhere. It is the
source game's main way to show volume: every tree, pine, palm, cactus and tent in the gallery is one (the
`assets/gallery/*-close.jpg` frames show the two planes and the slot). Use it for anything of your own that should
stand in the round, not only for those.

**Build and turn**
- 3D: the main card on the page hinge, plus two HALF cards (the outline clipped at its centre line) on vertical hinges
  on its front and back faces, nested, folding flat against the parent (+-90 deg), ~40 % of T thick, ~8 % darker
  than the front (reads as depth).
- Turn it as the source game does: the main plane ~24 deg off facing the camera (the other ~66 deg off), with a few
  degrees of seeded jitter and either sign, so the front print reads in full, the cross shows its depth and neither
  plane is ever edge-on (a plane near edge-on reads as a blade or a propeller). Measure against the line from the
  camera to the piece (perspective turns the view by up to ~20 deg toward the frame edges). The 3D harness does all
  of this when `popup(..., { cross: true })` gets no `yaw`; vary the turns, so a wood of crosses reads deep, never as
  a row of scenery flats.
- The family: keep only part of the cross where the thing needs it: a HALF cross (the main card and one half: hidden
  depth behind a face, or a buttress in front), a QUARTER cross (one half of each: a corner), opened wider into a
  V-fold (a ridge: dunes, drifts, outcrops). Top views, uses and the `cross` / `angle` / `second` options:
  `structures.md` section 3.
- Give it a `solid` footprint (about the width of the crossed planes) so the hero walks round it, not through it.
- Motion: drive the halves from the parent (`motion.md` section 2). A half hinged on a leaning parent dips below the
  page by `halfWidth * cos(theta) * sin(q)` while it unfolds; keep the base narrow (a trunk) or unfold the halves
  once the parent stands.
- Kit: `crossCard(pts, opts)` returns a crossed pair whose second plane follows the parent hinge through
  `userData.follow(p)` (`opts.second = { pts, paint }`: the second plane's own outline and print; in the 3D harness
  `popup(pts, paint, { cross: true, second })`); put it on a `hinge()` and turn it ~24 deg off the view (`popup`
  does); print both planes with your crown or tier print (the countryside example: `paintTree`, `paintPine`). Check
  in slow motion that the second plane never sweeps through the first while opening; the two-half build above never
  crosses it.
- 2D: the main card face-on; the fin as a narrower card of width `w * abs(sin(angle to the view))`, darker, with a
  thin shadow on the main card.

**Designing the two planes.** Ask what the thing looks like from the front and from the side:
- **The same all round** (a round tree, a bottle, a lamp post, a mushroom, a balloon): the same outline on both
  planes, the print varied (another seed: other leaf positions, another tier pattern, spots moved).
- **Different from the side** (a rocket with fins, a cactus with arms, a fingerpost, a windmill, a lantern with a
  handle, a fish, a chair, an animal standing still): cut the main plane as the front view and the second as the side
  view (`second.pts`), each printed for what it shows.
- **Print BOTH planes fully** (structure, motifs, a contrasting accent): a thin or bare second plane reads as a blade.
  The backs are printed too (`back: 'mirror'`, the kit's default for crosses): the walking camera sees them.
- **Slot on the object's own axis** (the trunk, the post, the stem), and keep the base narrow where it meets the page
  (motion bullet above).

**Common objects** (each a cross; the main plane the front view, the second the side view or a variant):

| Object | Main plane | Second plane | Notes |
|---|---|---|---|
| Round-crowned tree, blossom tree | crown lobes and trunk | the same outline, another leaf or flower print | the gallery's trees |
| Conifer, pine, fir, juniper | stacked tiers | tiers offset by half a tier | snow caps on each tier on both planes |
| Palm | curved trunk and frond crown | fronds reaching the other ways | trunk bands on both |
| Cactus (saguaro) | trunk with arms one way | arms at other heights | flowers on both |
| Giant mushroom, toadstool | cap and stem | the same, spots moved | or a crossed stem under a level cap disc |
| Tent, tipi, yurt | the front with the door | the side profile | stripes or panels on both |
| Signpost, fingerpost | post with arms pointing two ways | post with arms pointing the other two | each arm printed with a name |
| Lamp post, lantern on a pole, totem | post and lamp or carving | the same | lit panes on both planes (`H.glowing`) |
| Windmill | tower front with the door, the sails | tower side | sails turn on the main plane |
| Rocket, satellite, robot, spaceship | front silhouette with its fins or arms | side silhouette with the others | |
| Bottle, vase, jar, urn, chess piece (anything turned on a lathe) | the profile | the same profile | prints differ |
| Snowman, scarecrow, statue | front view | side view | a figure with a face is a T, below |
| Big flower, cattail, crystal cluster | head or shards one way | the other way | |
| Coral, kelp, sea fan, branching plant | branches | branches the other way | a reef's trees |
| Campfire, brazier, torch flame | flame tongues | other tongues | glowing panes; the cross keeps a fire round |
| Floating things: balloon, paper lantern, cloud, planet | the round silhouette | the same | the cross stays round as the camera moves |
| Fountain | basin front | side | plus a level disc for the water; a well or a round kiosk is a prism (section 7) |

**Variants**
- **T, not X, for figures with a face** (the hero, creatures that turn to the camera): the frontal card with a profile
  card standing BEHIND it, not through it, so no edge line crosses the face (section 12).
- **Cross plus level discs:** a cap, a tabletop, a round roof, a water surface or a tiered cake is a level disc on a
  crossed stem or body.
- **Stacked crosses:** a crossed trunk carrying a crossed crown turned another way (a great tree, a palm cluster), or
  tiers that alternate their turn.
- **Double cross** (two crosses 45 deg apart: four planes) for one big round showpiece seen from everywhere (the
  great tree of a plaza, a fountain, a carousel); sparingly, four planes busy the silhouette.
- **Fanned pair** (section 9): a front card and a darker mirrored rear copy, for things seen from one side only (a
  hedge run, a far tree line, a backdrop); cheaper than a cross, flat from the side.

**Where crossing gives a scene its volume**
- Everything the hero walks around or the walking camera passes: the camera moves, so a flat card would turn
  edge-on as he goes by; a cross never does.
- The tall pieces in the sharp band (trees, posts, tents, landmarks): two planes throw a fuller, more readable shadow
  and make the middle of the frame read as a space, not a stage set.
- A wood, a grove, an orchard, a reef: crosses at varied turns read deep; all turned alike they read as flats.
- Things in the air (balloons, lanterns, clouds, a bird on a perch): the cross keeps them round from every angle.
- Not for low things (grass tufts, bushes, flowers, rocks, crates, critters): single cards facing the camera (+-14 deg;
  the harness does it when `yaw` is omitted) or fans and clumps (section 9); from a high camera a low X reads as a
  blade. Not for buildings and long walls: box folds (section 7), fences (section 9).

## 6. V-fold

A long ridge as one plane is edge-on from the side and a flat wall from the front. Two half silhouettes meeting at
an apex read from every side and from above. The source game's dunes, drifts and ridges are V-folds; nested ridge
flats (section 8, `H.stack`) are the other way to build hills and banks.

- Each wing is HALF the form: highest at the apex end and cut square there, so the pair reads as one dune or ridge
  folded down the middle. Second wing ~0.92 of the first's height.
- Wings 24-30 deg off the long axis, ~4 % H gap at the apex. The long axis runs ACROSS the view, the apex AWAY from
  the camera and the opening toward it (a V with its apex toward the camera is a prow).
- Close the mouth *(strongly advised)*: a third, lower card (0.4-0.6 of the height, 0.84 of the width) just inside
  the open end, on the camera side, turned ~5 deg. Without it the V reads as two free shells or a row of arches and
  tents.
- Build (3D harness): `popup(pts, paint, { cross: 'quarter', angle })`, angle 120-130, from an outline highest at the
  fold (a symmetric hill, a half-ellipse: `structures.md` section 3); with `yaw` omitted the harness turns the opening
  toward the camera.
- Crest: a sunlit strip glued along the top edge, thinning toward the low end. A lighter inner copy of the silhouette
  read as the mouth of an arch.
- 2D: two wings in two tones 10-15 % apart (lit side, shade side), widths by the cosine of their turn, the crest strip
  on top, the apex hidden behind the nearer wing.

## 7. Box fold

A volume that folds flat like the net of a paper model: reads as a solid house, closes into a flat print. Any other
plan (a flat-roofed block, a round tower, a silo, a tank, a kiosk, an L-shaped hall) is a prism:
`prismFold(footprint, { h, roof })` in `paperkit-3d.js`, which flattens like a paper tube (`structures.md` section 4).

| Panel | Hinge and fold |
|---|---|
| Front wall | on the page hinge |
| Side (gable) walls | box returns on the front wall's vertical edges, nested, fold +-90 deg |
| Front roof | on the wall top: rest `RotX(-(90 deg - pitch))`, fold `90 deg - pitch` (folds into the wall plane) |
| Rear roof | on the ridge, child of the front roof: rest `RotX(-2 pitch)`, fold `-(180 deg - 2 pitch)` (folds onto it) |
| Back wall | its own flap, or the last panel of the wall strip |
| Chimney | 3 nested cards (block on the roof slope, fin, lid) folding down the slope |
| Windows, doors | holes cut in the wall (`makeCard` / `popup` `holes`, `boxFold({ holes })`: outlines inside the cut, rimmed like it), a warm emissive pane just behind; panes glow faintly by day too (the example `paintHouse` prints framed panes and an arched door on a facade card) |

- Proportions that read next to trees: wall ~0.9 H tall, ridge ~1.5-1.7 H, footprint about 1.7 x 1 H (built at
  1.33 x 0.73 x 0.7 H, then everything scaled 1.3x because cottages read small); pitch 42-60 deg (52 default);
  roof overhang ~11 % of the width across the gables, ~7 % at the eaves.
- Folded flat a box needs W + 2D of free width along its long axis: a yawed box must be small or near the middle of
  its module, and it moves as ONE unit (never wall by wall).
- Turn it 26-40 deg to the camera so the lit long wall and the door gable both show.
- Every panel must move: a house where only the front face rose looked broken. Drive returns and roof from the front
  wall (with the kit: one `userData.follow(p)` on the wall's group poses every panel from the wall's p). Returns on a
  leaning wall dip below the page (`depth * cos(theta) * sin(q)`), hidden behind the wall from a front camera;
  otherwise unfold them after the wall stands, a two-stage rise that also reads as a mechanism.
- 2D: a facade card (a house silhouette with its print, as in the 2D template's example), or a front face plus one
  darker side face (three-quarter) with the roof as two planes in two tones.
- **Core:** `boxFold({ w, d, wallH, roofH, overhang, paper, paints: { front, gable, roof }, holes, print, rimLight })`
  in `paperkit-3d.js` is the mechanism: it builds the net and folds it in the safe order (gables swing out first,
  p 0.1-0.6; the roof closes over them after, p 0.45-0.95), so no slab passes through a wall. Folded, the roof lies
  flat beyond the wall's top edge. The prints are yours (a temple front, a shop, a habitat module); the cottage of the
  countryside example (`assets/examples/built-ground.js` `boxHouse`) is one set. Put it on a `hinge()` like any card;
  lit panes come from `P.glow` (see below). `holes: { front, left, right }` cuts outlines through those walls (a door
  to walk through, windows, a portal): the front in its own frame (x from -w/2 to w/2, y up from the base), a gable
  from 0 at its front edge to d (the left one mirrored, 0 to -d). `print`: card options for every panel
  (`H.cardOpts(x, z)`, so print quality follows the lens).
- Show that it is paper: every cut keeps its core line (the card's thickness as a thin band at the cut,
  `thickness` / `edgeWidth`), the folds are soft creases with no edge line, the roof overhangs as a sheet. A box whose
  cuts show no thickness reads as a CG solid.
- `group.userData.parts` = `{ front, right, left, roofFront, roofBack, ridge }` for work on one panel;
  `userData.ridge` is a frame on the ridge line that stays upright in the house's frame: add cog crests, chimneys,
  weathervanes and signs to it (hinged or not); they ride the roof and fold flat with it.
- `overhang` (one value for gables and eaves) overhangs the EAVES too: the front slope's card starts `overhang` below
  its hinge on the wall top, and the back slope runs past the back wall. The eaves and the roof's ends are cuts with
  the rim; the ridge, the wall corners and the bases are marked folds. `paints: { front, gable, roof }` are your
  prints (unprinted card without them: shutters, shop fronts, clocks, snow on the roof). `boxFold` has no chimney:
  stand one as a card on the `ridge` frame (the example `boxHouse` adds a brick chimney there; its `paints.chimney`
  reprints it).

### Raised platforms (parallel fold)

Stages, quays, station platforms, docks, piers, balconies, lookouts: a deck held level off the page, the classic
floating-layer pop-up. A front face stands on the page hinge, the deck is hinged on its top edge and stays LEVEL the
whole way up, an optional back support hangs from the deck's back edge, always parallel to the face; folded, face,
deck and support lie flat in one stack. Walkable height is built OPEN: a posts face (a beam on posts, the gaps cut
down to the base, `facePts`) and a posts support, like the 3D template's jetty. A solid printed face only for masonry
the brief names (a quay wall, a stage front); never for natural ground (section 8) and never for stalls, wells or
carts (open assemblies, section 8).

- **Kit:** `platform({ w, d, h, paper, paints: { face, deck, support }, support, facePts, deckPts, supportPts, holes,
  print, rimLight })` in `paperkit-3d.js`. Put the group directly on a `hinge()`: its `userData.follow` reads the
  pivot's angle a and sets the deck to -PI/2 - a (level) and the support parallel to the face. It comes with a walk
  surface (`userData.walk`: the deck rectangle in the deck's level frame, reaching 0.12 past its edges); replace it
  for a custom deck.
- Custom outlines (a posts face, a domed tortoise shell carrying a village on its deck, a stage apron): `facePts`,
  `deckPts`, `supportPts`; `holes: { face, support }` cuts outlines through those cards (windows, an arch or a tunnel
  mouth in a masonry face). Keep the fold edges straight: the face's base on y = 0 and its top fold on y = h, the
  deck's front fold on y = 0 (its back edge on y = d with a support), the support's top on y = 0 hanging to y = -h.
  `rimLight` as in `makeCard` (`three-js.md` section 3).
- Pieces standing ON the deck go into `group.userData.deck`, a frame on the deck's top surface (y up, z toward the
  camera, origin at the deck's front edge; the deck spans z 0..-d), each on its own `hinge()`: they ride up level
  with the deck.
- The face's top and bottom edges, the deck's hinged edges and the support's ends are marked folds; the deck's free
  edges are cuts.

### Domes, vaults, capsules: parallel slices

A dome or round hall built from one crossed pair reads as a star or a tent from a near-fixed camera. Build it from
5-9 PARALLEL half-disc (or arch) cards stacked front to back, EACH ON ITS OWN HINGE on the page (one hinge for all
sweeps the back slices through the page), the biggest in the middle, falling off toward the front and the back (scale
~0.8 / 0.93 / 1 / 0.95 / 0.85 front to back), spaced ~13 % of the radius apart; with no falloff the front slice hides
the rest and it reads as one card. It reads as a solid dome from the side and from the default 40-55 deg camera (the
3D harness's `H.dome(x, z, { r, h, n, paint })`), folds flat as a stack, and the gaps between slices carry soft
shadows. Print the ribs and panes on each slice; make the panes glow from inside with `P.glow`. A ring of 2-3 slices
plus a front facade card is enough for a capsule; towers and tanks are prisms (above).

**Only for a camera near straight above**, where slices read as a stack of plates: a dome or a mushroom cap is a
faceted net (a star of 8-12 gores that folds down into the dome as it rises), a round stem a ring of 6-8 panels that
rise like petals.

### Lit windows, lamps, screens

Print the pane in the lit colour with a dark frame, and mark it with `P.glow(g => g.fillRect(...))` (white = full
glow) in the paint function; `makeCard` turns that into an emissive map (`glowColor`, `glow` intensity > 1 so the lens
turns it into soft bokeh) and the mesh gets `userData.setGlow(v)` to switch lights on one by one, flicker a lamp, or
turn a house dark. The example `paintHouse` and `paintWall` mark their panes this way. Every printed pane glows from
the first frame: for lights that switch on one by one, call `mesh.userData.setGlow(0)` right after building and raise
it later; by day ~0.35, so panes read as print, not lamps (the 3D template's `H.glowing(group)` runs
`group.traverse((o) => o.userData.setGlow?.(0.35))` over each house).

## 8. Layered flats

Pop-up scenery is layered flats with air between them; parallel layers give depth and never become an X.

- Layers 5-15 % of the object height apart; each layer 10-15 % darker going away from the light (or paler into haze
  with distance); every front layer shows its own thin cut edge (equal-tone layers vanish).
- **Hills and nested landforms, in the middle ground too, not only at the far edge.** Hills, hillocks, banks (and
  dunes, though the source game's are V-folds, section 6): 3-5 parallel curved cards ("sails", `H.stack` in the 3D
  harness), the back one tallest, each nearer one lower and ~10-15 % lighter (or darker away from the light; stepped,
  never alternating), ~0.14 H apart so the gaps read as shadow bands, plain silhouettes with a lighter glued crest
  band (`shape.hill` + the example `paintHill`; the example scene's `hillock`). Fan the rows +-5 and +-13 deg about a
  common yaw instead of exactly parallel so they read under rotation; a small strut on a back face *(opt)*. Rock
  outcrops as 3-5 tall slanted cards in a tight cluster, each a lit face and a darker facet turned from the key
  (`rockOutcrop`); reed beds of 3+ blade layers, conifers as crosses of stacked tiers (section 5). Without them all
  the volume comes from boxes and single cards, the commonest remaining gap in round 7.
- Sky things (sun, moon, clouds) only when the brief is literally a physical book (the one exception, `look.md`
  section 1): on paper stalks hinged to the page, so they rise and fold like everything else. The default camera
  looks down into the world and sees no sky.
- Under the side key every layer casts a soft shadow on the one behind, and the gaps read as shadow bands.
- **The ground stays flat.** In this style the page is the ground: height comes from nested parallel cards (hills,
  banks, dunes), V-folds (section 6) and clusters of slanted cards (outcrops), never from a raised block of terrain;
  a block with strata on its face read as "a cake" or "a block of terrain" to a blind critic (round 8), with or
  without relief flats. Where the brief has the hero walk up somewhere, build it open, as card construction: a deck
  on posts (a posts face with the gaps cut down to the base), stairs of thin treads on stringers, a plank deck between
  side cards (section 14). This holds for every subject: a cliff, a mesa, a crater rim, a reef wall or a snow bank is
  nested cards and outcrops standing on flat print.
- **Built masonry only, and in relief.** A raised block with a printed face is allowed only for masonry the brief
  names (a quay wall, a stage front, a plinth). Its face reads as paper when 2-3 stepped flats stand in front of it,
  each lower (~0.8, then ~0.55 of the face height), ~0.06-0.08 H nearer and ~10 % darker, with torn or scalloped tops;
  one extruded block with a print on it reads as CG (round 6 critic). Relief in front of a walkable face is a wall to
  the walk except where stairs or a ramp come down (`built-ground.js` `terrace({ relief, gap })`).
- **Open assemblies.** Stalls, wells, gazebos, carts, docks, scaffolds, swings: a box or prism body where the thing
  has one (section 7: a counter, a well's drum, a cart bed), with the posts, the awning and the roof as separate
  cards with air between them (a roof V, wheel discs), each on its own hinge or riding one frame, so the camera sees
  through and under them. A closed box with the posts, awning and roof only printed on it reads as a crate.
- 2D: rows of cards at different depths in the pitched view (section 2), each casting onto the ground and the row
  behind. Only in a parallax side-scroller the brief asks for: per layer a depth, a parallax factor, a tone step, a
  haze step and a drop shadow whose offset and blur grow with the gap to the layer behind.

## 9. Fans, clumps, clusters, zig-zags

| Group | Build | Values |
|---|---|---|
| Fan | the piece plus a rear copy | rear 1.14x taller, tone x0.88, mirrored, ~0.1 H behind, shifted 16-24 % of the width, +-3 deg |
| Clump | 2-3 DIFFERENT pieces (bush, flowers, tuft, reeds, rock) | rear piece; front piece ~0.17 H ahead and shifted sideways; an L-return square to them off one end (none next to water) |
| Cluster | 4-8 DIFFERENT pieces anchored to something: a house corner, a post, a tree foot, a pond rim, a path bend (a door scene may be 2-3) | biggest at the back; each next 9 % smaller, ~0.12 H nearer the camera, alternating sides by ~0.23 H + 0.08 H per pair; each piece faces the camera +-14 deg; back pieces 5 % darker per step |
| Zig-zag fence | sections end to end on the diagonals | inner joints pushed sideways by 0.2 x the section length (~11 deg, alternating) so no two sections share a plane; paddocks as diamonds |

- From any allowed view a group shows a layered pair plus a return, never a single flat slash, and reads as one mass
  with depth. Between groups, low fillers (tufts, stones, flowers), varied, keep the sharp band packed (measure.py
  barePct <= ~55); the open ground is designed and mostly outside the band: the leading line, any water, a few
  clearings (`worlds.md` section 8).
- Kit: `clusterLayout(x, z, { n, size, seed, spread })` in `paperkit-3d.js` returns the cluster positions, scales and
  yaws above (+-14 deg about yaw 0, which faces the template's camera); feed it 4-8 different pieces of your world (a
  bush, a rock, a tuft, flowers: whatever your subject's are).
- Layer counts that read: tuft 2, flower clump 3, bush 3, tree 2 crossed cards + print, pine 4-5 tiers, animal 2-3,
  cottage box + 4-6, prop 2-4. At most ~5 filler cards per module.
- Rejected: small props as a card plus a 0.72x crossed copy (an X blade from above), thin-stemmed reeds and flowers
  (slivers), scatters of tiny slivers ("confetti").

## 10. Lean-outs and low flaps

- A rest pose need not be vertical: a bridge ramp rising ~26 deg from the bank with a nested crown panel bent back
  ~18 deg (so the crown runs at ~8 deg), water ripple slivers that lift only ~20 deg. A walkable deck that is not a
  ramp stays level (a jetty is a level deck on posts, section 14).
- Bridge rails: a side card on the bridge axis is edge-on when looking along the bridge; the sides lean out, with post
  returns and a second, lower, darker card outside (section 14, the bridge row).
- Same flap model with the smaller fold angle (p keeps the timing, degrees scale); wobble 0.6 for decks and ramps,
  1.6 for water slivers.
- 2D: a card's base is a horizontal screen line, so bridges and rails run along x and a river crosses under them
  roughly along z (plan the print that way, `web-2d.md` section 3). A rail with closed openings fills in: only the
  outer boundary is traced (`fromDrawing`, section 1), so cut it as an open-bottom comb, the gaps reaching down to the
  base between the posts.

## 11. Spinners and simple movables

- **Spinner**: a separate layer standing proud of its card (~2 % H) on a hub spacer, turning about the card normal;
  keep it in front of every fin (a cross fin in front of the wheel ate a blade). Speed: `motion.md` section 7.
- **Pull or turn** *(opt, keep it simple)*: a tab sliding in a slot or a disc turning on a brad is still paper motion
  (translation along a slot, rotation about a pin). Follow the pointer with a critically damped follower while
  dragged, land with the flap model (small overshoot, short quiver); draw the brad as a small cream disc with a
  darker rim and the slot as a thin cut line.

## 12. Characters from cards

**The player is a small 3D paper model, not a card.** The baseline for any game (unless the brief asks otherwise) is a
figure of ~10-20 cards that reads from the front, the side and the back and turns to face the way it walks, like the
source game's player (a glTF model of folded and cut paper: a torso with real depth, a head, two legs and two arms
cut as profile cards on hip and shoulder pivots). A single card reads as a sticker beside built pieces (round 6
critic), and a stack of frontal cards that mirrors to turn still reads flat (round 8). Design the character for your
subject (a diver, a courier, a robot, a fox); the construction is the style:
- **Every part is a T of two cards:** a frontal card and a profile card standing right behind it (a cross puts an
  edge line through the face; behind, the front hides it while the side view shows depth), in slightly different
  tones so the build reads as construction. Keep each profile card's top below its frontal card's top: a bare head's
  side card that rises past the face pokes up as an "ear" from a high camera (a hat or hair hides it). Volumes may
  also be box folds or level discs.
- **The model faces +z and yaws** (the harness turns its group toward the way it goes: `three-js.md` section 1); its
  back is printed too (hair, a plain coat back).
- **Legs (or wheels, flippers, tracks) on hip pivots** that swing forward and back about the hip's x axis with the
  distance walked; arms on shoulder pivots swinging opposite; if the design carries something, that arm swings less
  (x0.2-0.4) and the item hangs from the hand (`motion.md` section 8).
- **A body** with costume or surface detail and soft painted shading; **a head** ~1.3x natural size with a face that
  reads at play distance and in every mood: a skin or face tone a step lighter than you would paint it by day, dark
  features on a pale surround, and at dusk and night a practical near him (`H.lamp` pools along his route, or a light
  he carries if his design has one; a tester's dusk fisher lost his face); **headgear and carried things** only if
  the character's own design has them (never a default pack, bedroll or lantern; a robot needs no straw hat: blind
  tests copied the example's brim onto one), each as its own T or disc; a load on the back pokes out beside and above
  the shoulders.
- **Colours that contrast** with the ground and the dressing (hue and value); chunky toy-like proportions; it stands
  in the sharpest rows, where a nearer card may overlap it a little. Size it ~0.4-0.5 of the world's tallest common
  kind.
- Flat cards that mirror to turn (`setHero(h, { turn: 'flip' })`) are for critters, extras and 2D only. In 2D the
  puppet is the same cards drawn at small offsets from the body card: they follow it (x offsets mirror when he turns),
  rise with its spring, step with the distance walked (`setHero(body, { parts, step })`), and parts that never touch
  the ground cast no shadow or contact pool of their own.
The example scene's `heroDoll` (a gardener, 17 cards) is one worked model; write your own.

## 13. Never edge-on

A flat card seen edge-on is a knife-thin sliver, the most common "this is CG" tell.

- Small single cards face the camera +-14 deg (`structures.md` section 1; the harness does it when `yaw` is omitted,
  `clusterLayout`'s yaws do the same). The source's diagonal rule served a camera that turned in 90 deg steps; no
  camera here does.
- Crosses turn their main plane ~24 deg off facing the camera, either sign (section 5; the harness does it when `yaw`
  is omitted); V-fold wings 24-30 deg off the long axis, the opening toward the camera (section 6); fence runs
  zig-zag.
- Target: the minimum silhouette ratio over all allowed views >= 0.6 (most pieces reached >= 0.77). Measure it.
- A piece that cannot read from every side (hill rows with dark struts, a boathouse that would stand between camera
  and water) gets its allowed rotations restricted in the generator.
- Print both faces (or half-kraft backs); unprinted backs from a yawed camera read as pale slivers.
- Above ~60 deg camera pitch every upright card reads thin; stay at 40-55.
- A standing card lower than ~0.35 of its width reads as a plank or a blade at a 40-55 deg pitch even when it faces
  the camera (its face is foreshortened): make it a V-fold, a box or layered flats.
- Bridges and long walls: keep the axis within ~20 deg of across the view or along it; at 30-60 deg diagonals the
  near parapet shows as two thin lines (turn it, or let posts and the far parapet carry it).

**Camera-facing turn that keeps the hinge** (fixed camera yaw only). Once a small card is upright, turn it about the
VERTICAL through its hinge origin toward the view; it is still a card rising from its own print, never a sliver:
```js
const wrap = (a, m) => a - m * Math.round(a / m);
const axis = Math.atan2(hingeDirZ, hingeDirX), right = Math.atan2(camRightZ, camRightX);   // angles on the page
const turn = crossed ? wrap(axis - right + 24 * Math.PI / 180 + jitter, Math.PI / 2)  // nearer plane 24 deg off the view
                     : wrap(axis - right + jitter, Math.PI);                // the nearer of the two printed faces
let k = Math.min(1, Math.max(0, (upY - 0.3) / 0.65)); k = k * k * (3 - 2 * k);   // upY: world-up part of the card's +Y
card.matrix = T(hinge) * RotY(turn * k) * T(-hinge) * card.matrix;   // RotY(+a) lowers atan2(z, x) by a (three.js)
```
- Jitter +-14 deg seeded per card; re-pose when the camera's right vector changes by more than ~0.015.
- Collision, placement and anchors must use the same drawn transform ("the walk field is what is drawn").
- Free-orbit cameras cannot use it; rely on authored crosses and V-folds.
- The source also scaled small turned cards 1.15-1.3x with the same fade; author them at the right size instead.
- Rejected: tilting an upright card toward the camera instead of turning it (its face went into shade and backs
  showed; the 2D forward fold of section 2 is about how a card rises, not its rest pose); tipping cards aside for
  the hero ("nothing bends aside").

## 14. Built ground: walk on it, under it, into it

A single standing card is for things seen from the front and walked AROUND. Anything the hero walks ON, UNDER,
ACROSS or INTO is a real fold-flat construction in 3D, and the walk logic reads that same construction; the ground
itself stays flat (section 8), so the hero climbs only on these. Testers who skipped this built a bridge as one arch
card standing on the river, a rope bridge as a card, and terraces as upright hill cards: the hero walked through them
or floated, and every one read as a flat sprite.

The last column points at code to READ (the construction, the fold-flat order, the walk surface), never parts to
assemble: write your subject's own.

| Thing | Built as | Read in |
|---|---|---|
| Bridge, footbridge, causeway, viaduct | DECK: two ramps hinged on the banks rising ~26 deg over ~55 % of each half span, each with a crown panel bent back to ~8 deg, planks printed across. SIDES: a card along each deck edge, foot on the page, an arch cut under the deck, top = deck line + a parapet ~0.3 H, leaning ~18 deg OUTWARD (a trough: from along the bridge both printed faces show), square post returns at the ends, a second lower darker card ~0.08 H outside for thickness. Folded: the deck lies flat over the water, the sides flat outward | built-ground.js `bridge` |
| A change of level | stairs: thin plank treads on two stepped stringers (side boards), thin risers or open, a little nosing, rise <= ~1/8 H, railings ~1/2 H; never stacked blocks (they read as terrain) and never a flat strip with printed steps; ramp: a lean-out deck with wedge cheeks | built-ground.js `stairs`, `ramp` |
| Jetty, dock, pier, boardwalk, gangway, lookout | a platform low over the water or the page: a posts face (a beam on posts, the gaps cut down to the base), a plank deck (planks across), a posts support; mooring posts, a boat; a long pier also needs post-row cheeks along both sides (posts only at its ends read as a floating raft from the side) | the 3D template's jetty (`platform` with posts `facePts` and `supportPts`) |
| Raised built masonry the brief names: quay wall, stage, plinth, rooftop | a box fold: a printed face (quay stones, a stage apron) on the page hinge, a LEVEL printed deck on top (parallel fold), two cheeks hinged on the face's sides that swing out with it, a back support, stepped relief flats in front of the face (section 8). Pieces on the deck stand on their own hinges in the deck frame (`userData.deck`). Never natural terrain: plateaus, mesas, ledges, crater rims, islands and hills stay flat ground (section 8); where the hero climbs, build it open (the stairs and jetty rows) | built-ground.js `terrace`; `platform` in `paperkit-3d.js` |
| Arch, gate, tunnel mouth, cave entrance | a platform (parallel fold) whose face and back support are U-shaped cards (`facePts`, `supportPts`), the opening cut down to the base, the deck as the vault (it reads as a short tunnel); or two side cards + a curved top strip; the walk path continues through (Under and into, below) | no worked arch: `platform` in `paperkit-3d.js`; the jetty's posts face shows a cut down to the base |
| Houses, huts, domes, tents you enter | box folds with a door opening cut through the front (`boxFold({ holes: { front } })`), or a cut to an interior scene; never a flat facade the hero walks through; walk walls as in Under and into | `boxFold` (section 7); built-ground.js `boxHouse` is a closed cottage (its door is printed) |
| Gorge, chasm, ravine, canyon | the page cannot be cut and the ground stays flat: print the gully (its floor, the stream, the walls going down) on the page, line both rims with rock outcrops and nested sails (section 8) and cross it on an open bridge; `walk.block` the gully except where a deck crosses it | built-ground.js `bridge` |
| Rope bridge, suspension bridge | it sags: a half-deck hinged at each bank's edge (an outer panel dipping ~10 deg, an inner one bent back to ~3 deg, ~0.1 H of sag), rope side cards (a hand rope and hangers, cut as a comb) leaning out ~14 deg, lashed posts at both ends; folded, each half lies on its own bank and swings over as the world opens; `heightAt` follows the sag | your own, on `makeCard` + `hinge` |
| Market stalls, wells, carts, gazebos | open assemblies (section 8): a box or prism body with the posts, an awning and a roof as separate cards; a part that tips into place after its stall stands (an awning) is a second, later flap on the same frame, which reads as a mechanism | your own |
| Fences, walls, hedges that enclose | zig-zag runs of cards with posts (section 9); the walk field blocks them | `walk.wall(x0, z0, x1, z1, { r })` per run |
| Water, paths, roads, fields, plazas | printed into the page, never standing cards; water blocks walking except where a deck crosses it | `walk.block(fn)` |
| Backdrop hills, mountains, skylines | layered flats along the far edge (the 3D harness's `H.groundAt(0, 0.95)` is where the frame's top meets the page), never walked on; a hill the brief walks over stays flat ground between nested hill cards, any climb built open (a boardwalk on posts, stairs on stringers, a lookout deck) | `layeredCard` |
| A slope the brief names (steps climbing to a temple, a terraced hillside) | built, never sculpted: stepped terraces of masonry (`terrace`) or decks on posts, with steps between them; the page stays flat, backdrop flats show the mountain beyond | `terrace`, `stairs`, `platform` |

**The walk-surface contract** (every construction the hero walks on): `group.userData.walk = { frame, heightAt(x, z) }`.
`heightAt` takes a point in the coordinates of `frame` (optional: without it, the group's own frame, 0 = its base on
the page, as `bridge`, `stairs` and `ramp` do; the deck frame of a `platform` is LEVEL: y up, z toward its front, the
deck spanning z 0 to -d, 0 = the deck top) and returns `null` where the construction is not, the floor's height, or a
big number (>= 10 above any floor: a wall that is never stepped on: parapets, house fronts, relief in front of a
face). Reach ~0.03 H past the edges (0.12 in the templates) so neighbouring surfaces join. The walk field takes the
HIGHEST surface at a point (a deck over water beats the water's block), so leave a gap in a wall where stairs or a
ramp arrive. Long blockers are `walk.wall(x0, z0, x1, z1, { r, base, top, name })` segments, round ones
`walk.solid(x, z, r, { base, top })`; either blocks only where the surface there lies between base - step and top.
`platform()` comes with the deck rectangle as its surface; name the group (`g.name = 'pier'`) and `walkPath` reports
it.

**Under and into.** The field keeps one floor per point, so one construction is never walked both on and under at the
same (x, z): a hero below a walkable deck meets it as a wall. For a passage he walks UNDER (an arch, a tunnel, a gate,
beneath a pier), do not `walk.add` the deck over it (or return null inside the opening) and add its sides or posts as
`walk.wall` / `walk.solid` at base 0. For a house he walks INTO, cut the door (`holes`) and give the walk its walls as
`walk.wall` segments with a gap at the door, never one `solid` over the whole footprint.

- **Roofed walk-throughs** (covered bridges, arcades, tunnels, a hollow log): from a camera 40-55 deg up the roof hides
  the hero inside. Keep the camera-side wall a low rail or an open gallery of posts and its roof slope short or high
  at the eave, and cut windows through the near side (`holes`). The 3D harness's sight assist lowers the lens toward
  40 deg when a roof hides him (`motion.md` section 10), which shows him at the open ends, not deep inside: a tester's
  closed covered bridge hid its hero for a fifth of the crossing (`__papercraft.sight()` finds it). Never a cutaway, a
  fade or a roof that moves aside for him (scenery never bends for gameplay: `look.md` section 12).
- **Stairs along a deck's side** (an outside staircase): yaw = the deck's yaw + 90 deg, positioned through the deck
  frame (`deck.localToWorld`), and the deck's wall band left open where the stair arrives.
- **Spiral stairs** (around a stem, a tower or a tree): thin plank treads fanned around the stem, each on its own
  bracket or post card, rise <= ~1/8 H, each tread's walk height its own; a stem or tower is a prism (section 7).

The worked examples are in `assets/examples/built-ground.js` (three.js): read them for the construction, the
fold-flat order and the walk surface, then build your subject's own (a boardwalk, a pier, a temple stair, a gantry).
What reads as paper in them, and what the critics marked down:
- Stairs are thin plank treads on two stepped stringers (thin risers or open, a little nosing), railings have posts,
  every edge shows its card thickness; a strip with printed steps, stacked blocks (they read as terrain), blank side
  panels or bare sticks read as flat cut-outs.
- Joining decks: a second deck at a bend (a pier's dog-leg, a boardwalk turn) overlaps the first by >= ~0.4 H, its
  deck ~0.01 H lower (tucked under, no z-fight); walk surfaces reach ~0.03 H past their edges so abutting stairs,
  ramps and decks connect without a gap.
- A walkable deck never leans with its hinge: measure the walk height on the level deck frame (`walk.frame`), and stand
  walkable boxes with no hand-placed lean.
- Fit the hero: a deck at least ~1.5x as wide as the hero's body (shoulders and swinging arms), or he visibly
  crosses the parapets; the walk `radius` is half his FEET span (~0.15 H; 0.6 in the 3D template for its 3.6-unit
  hero), not half his body; treads about 2x that radius deep (`stairs()`: a 1.1 run plus its nosing), rise <= `step`.
- A structure of several cards (bridge + landings, stairs + span) rises as ONE: every part reads the same p (or one
  spring with staggered sub-ranges), never separate springs that leave a span lying flat under a raised landing.

**The walk field.** One function answers "how high is the ground here, and may the hero step there?" from the same
construction the camera sees (`assets/lib/paper-motion.js`, engine-free: 2D and 3D): `const walk = new WalkField({
step: 0.2 * H, radius: 0.15 * H })` (the 3D template: 0.75 and 0.6 for its 3.6-unit hero); `walk.add(...)` every
walkable surface (a three.js group carrying `userData.walk.heightAt(x, z)` in its own frame, optionally `frame`, or a
plain `{ heightAt(x, z) }` in world space for 2D), `walk.block((x, z) => inWater)`, `walk.solid(x, z, r, { base })`
for houses, trees, rocks and wells (base = the height they stand at, so a temple ON a raised deck blocks and a rock
UNDER a bridge does not); each frame `walk.move(pos, dx, dz)` slides along blockers and steps up or down at most
`step`; `radius` keeps every foot around the centre (eight points) on a surface within one step, so the hero never
pokes over a parapet or a deck edge. Put his feet at `pos.y` and let the camera focus follow his height.
`walk.route(pos, points)` walks a list of waypoints through the same rules (never a teleport): the scripted check.
When he sticks it reports `blockedBy`, and `walk.why(x, z, y)` names what stops him at a point (a wall by its name, a
solid, a block, a step too high, a foot on one of these). The templates' `?walk` and `__papercraft.walkPath(points)`
do all of this; the 3D one adds `walkMap(x0, z0, x1, z1)`, the field printed as text, to find an invisible blocker.

**2D.** The same constructions in a pitched 2D view, read by the same WalkField. The footbridge (the 2D template's,
`web-2d.md` section 3): the side cards run along x (the far one with the full parapet, the near one lower so the deck
shows over it), the deck is drawn between them as a projected surface of plank strips lit by their slope and
depth-sorted with the cards (`P2.drawDeck2D`, one of the harness's `decks`), its height function goes in as a
world-space surface (`walk.add({ heightAt: deckAt })`) and blocked strips beside the deck stand for the side cards.
Stairs: the parts that face the camera are cards along x (the near stringer of a stair that climbs sideways, the
risers of one that climbs away), the treads projected plank strips at their heights, each tread's height in one
`heightAt`. A deck on posts: the posts comb card in front (gaps cut to the base, section 10), the deck as a
projected surface above it, a lower posts card behind. Never a flat card the hero walks across.

Checks:
- Walk the hero across every built thing (scripted) and capture it: feet on the deck, never inside a rail or floating;
  blocked at the water and at deck edges; stairs climbable step by step.
- From every allowed view the deck shows and no side is knife-thin (outward lean, post returns, cheeks, doubled rails).
- Folded (p = 0) everything lies flat on the page without passing through anything; rising, decks stay level or
  rotate about their bank hinges, nothing slides or scales.

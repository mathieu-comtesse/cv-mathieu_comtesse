# Procedural art: paper, cut silhouettes and printed illustration in code

How to make every paper surface, cut silhouette and printed illustration of a papercraft piece from code alone, with
the values that held up in a shipped pop-up game.

Read this when: you need paper textures, cut-out shapes or illustrated cards (props, buildings, creatures, machines,
scenery) and have no image generation, or want seeded art that stays consistent; or when cards read as flat vector
stickers, felt, leather or clip-art.

Contents: 0 The finding; 1 Paper surface; 2 Silhouettes; 3 Printing illustration; 4 With paperkit-2d (helpers,
worked example, atlas); 5 SVG, CSS and video; 6 Acceptance checks

## 0. The finding to build around

The same world was built twice: flat-colour cut cards, then cards carrying an illustrated print inside chunky cut
silhouettes. The printed cards won 6 of 6 blind comparisons (wow ~6.3 vs ~4.7), the largest single jump of the
project: that 33-minute art pass beat a 7.7-hour critic loop of lighting, lens and grade fixes. Those prints came from
image generation. This file rebuilds what they added, which is procedural in nature. Every piece needs all five:

| | Ingredient | Flat build |
|---|---|---|
| a | 2-6 stacked layers, each with a pale lip on its lit side and a 1-2 px soft shadow on the layer below (`P.layer`, `P.parts`, `drawnPiece`) | had it, as layered cards; the prints inside were flat |
| b | a print inside every surface: bold two-tone motifs that say what the thing is (leaves, shingles, windows, rivets), in 1-2 accents that contrast with the base | **missing: the decisive gap** |
| c | one quiet fibre and a two-tone speckle on every surface (amounts: the fibre bullet below) | had it |
| d | the cut edge: a thin dark-brown line at the silhouette, a pale highlight inside it on the lit edges only, none on folds | weak |
| e | chunky rounded silhouettes, nothing thin or spiky | had it |

Generic pattern cells (hairline shingles, brick outlines, wood grain over a whole card) were also built and did not
close the gap: flat cards plus procedural prints read as "confetti" and "texture borders". Few, filled, two-tone motifs
with meaning do.

Every print is a paper collage: each part (a leaf, a limb, a tier, a shingle row, a window frame, a wing, a band) is
its own cut layer with a lip on its lit side and a short soft shadow under it, on a quietly mottled base sheet. Beside
the reference frames, kit prints drawn as flat fills with thin ink strokes read as clip-art at once; the same drawings
re-made as layers (fat tapered limbs, big fat leaves spread over the crown, tiers with pale cut edges) read as the
same family. Print with layers: `P.layer(shape, colour, opts)` for a part or a batch of non-overlapping parts,
`P.parts(fn)` / `drawnPiece` when every fill of a drawing should be its own layer.

**Count the print.** In round 6 a blind critic set test builds beside the reference frames; the prints fell short in
the same countable ways every time. Check each kind of piece:
- 3-5 inks per piece: a two-tone base, 1-2 layer tones, 1-2 accents. One base plus one motif colour reads as a sticker.
- No flat run of one tone over ~1/4 of the card: a big piece carries more parts, not bigger ones.
- Motifs at least ~20 L* (CIELAB lightness) from the base they sit on, or a contrasting hue: closer ones vanish at
  the frame's scale.
- Motifs are big, bold and few: each ~1/6-1/8 of the card's width, counted in tens, with the piece's structure
  reaching its rim. Dashes of 1/12-1/15 read as small marks, and a thin stem with a few short branches under a big
  empty field was the commonest miss. The countryside example's tree: motif table, section 3.
- Big pieces read best as a darker outer band or card round a lighter inner panel that carries the motifs (the
  countryside example's bushes: a scalloped outer band with flowers, sprigs and berries inside).
- Dark accents (inks, trunks, shadowed facets) make up ~8-16 % of the sharp band by day: a frame without them reads
  as clean vector fills.
- Props carry their material as a print (grain on wood, courses on stone, weave on a basket, rivets on metal), never
  a flat fill inside an outline.
- 3+ value steps and one ornament per card (a vein, a sprig, a stamen, a folk-pattern band, a face): one or two flat
  tones plus noise is not a print, however good the fibre.
- Variants: write each kind as a function of a seed and draw 4-6 visibly different variants (outline lobes, size
  +-15 %, motif placement, accent swap), and keep at most ~3 identical props in view; stamping one card 10-40 times
  was the first thing a blind critic named in every round-7 build.
- ONE low-amplitude fibre over everything: `P.felt()` (default 0.6; the countryside painters use 0.8-1, its maximum),
  a fibre luma swing of ~1-1.5 L* (plain card fine detail 0.010-0.022 RMS, section 1). Plush felt, linen or burlap
  weaves read as cloth, not paper. Per-sheet tone (section 1) is a separate, constant offset per piece.
- Smooth cut outlines: trace masks at 2-4 px per unit or more and simplify; stair-stepped edges read as pixel art.
  Judge edges on a supersampled capture (`look.md` section 3).

## 1. Paper surface

**Model.**
- Paper = palette colour x a grey detail map (linear, mean 0.5): `albedo = colour * 2 * detail`. One map serves every
  colour and the palette stays exact on average.
- Fix it to the surface (object or world space). Screen-space grain never reads as fibre; keep any grain under 1 %.
- Layers: a fine tooth (about 2-4 % of the hero's height), a soft cloud (about 1/3 of the hero's height), a sparse
  layer of crisp distinct strands, a few dark shives. Relief comes from tooth and fibres only (high-pass the height),
  so sheets stay rigid card.
- Crumple lives in the normal only: broad creases change the light, never the print.
- Per-sheet tone: each piece +-4-6 % in value (`makeCard` `tone` 0.04) from a hash of the piece (brighter sheets
  warmer: R +35 %, B -50 % of the drift). Key it to the piece, never to the frame (`look.md` section 2).
- Dead matte: normal strength calibrated to a mean tilt of 4-7 degrees (card 5.5), roughness about 0.93, no specular.
- Periodic by construction: FFT band noise, strokes redrawn across the wrap, wrap-mode blurs. Never cross-fade a seam.

**Size features for the texels per screen pixel.** `texel_px = screen px per world unit / texels per world unit`,
with `screen px per unit = frame height px / (2 * distance * tan(fov_y / 2))` at the focus distance. Design widths in
screen pixels, then divide by `texel_px`: a strand that must be 1.2 px wide on screen is `1.2 / texel_px` texels wide.
The source game saw its fibre at 0.19-0.6 screen px per texel, so 0.8-1.8 texel fibres vanished at every camera and
only the 16-72 texel blotches survived: felt. Either pick the repeat so a texel is 0.5-1 screen px at the main camera,
or scale features up (`scripts/paper_textures.py --texel-px`). Add a second sample at x3.73 with an offset for
close-ups and a blurred one at about x0.27 for mottle and crumple, so the repeat never lines up.

**Starting values** (cardstock, at `texel_px` = 1; multiply lengths by `1 / texel_px`, counts are per 1024^2 texels):

| Layer | Size in texels | Albedo | Height | Watch |
|---|---|---|---|---|
| tooth (band noise) | wavelength 3.5-9 | main | main | finer and stronger beats blotchy |
| felt (anisotropic 1.8, both ways) | 3-14 | ~15 % of tooth | weak | more reads as felt |
| mid mottle | 16-72 | weak | weak | dominant = felt, polka dots |
| cloud | 60-170 | weak | none | big sheets need it or they read as flat fill |
| long strands | 60-200 long, 2-3.2 wide, ~300 | light, crisp | ~0.12 | draw per strand at 0.55-1 brightness and combine with max, not sum |
| short strands | 30-90 long, 1.2-1.9 wide, ~1500 | light | | taper the ends or they read as scratches |
| dark strands | 20-60 long, 1.3-2 wide, ~130 | dark | | short and few |
| shives, specks | radius 0.6-1.7, ~260 | dark | | kraft ~3x more |
| crumple | ridged noise, 1/4-1/2 of the tile | none | normal only | +3-4 degrees of mean tilt at most |

Measured target: fine detail (luma, Gaussian sigma 1 minus sigma 4) of 0.010-0.022 RMS on plain card in the final
frame (real card 0.005-0.012, concept frames 0.012-0.016). Dark colours measure lower for the same modulation: give
them at most about 1.4-1.6x the gain, beyond that light strands turn into scratches.

**Stocks** (presets of `scripts/paper_textures.py`). The style is rigid card with a clean die cut: `cardstock` for every
card, `kraft` for backs and rustic props. The others are surface textures a brief may name for one material (a
newspaper kite, a cardboard crate, a paper lantern); their sheet-edge masks (deckle, torn) and translucency never go
on a card's silhouette, which is always a clean cut (section 3):

| Stock | Reads as | Change from cardstock |
|---|---|---|
| cardstock | rigid cut card, the default | as above |
| kraft | brown unbleached card | ~3x specks, ~5x dark fibres, tan light fibres, slight grain direction |
| watercolour | cold-press sheet | embossed pebbles (Worley cells ~10 texels) in the height, quiet colour, tilt ~7 degrees |
| construction | coarse coloured paper | softer, coarser tooth (4-12), light flecks of the same dye, roughness 0.97 |
| newsprint | thin grey-cream sheet | short fine fibres, grey specks, little relief |
| washi | Japanese mulberry paper | long wavy light fibres, visible cloud formation, bark flecks; deckle-edge mask |
| tissue | thin crinkled sheet (a lantern shade, a kite) | calm cloud, crinkle (crumple 0.6), opacity 0.45-0.8 |
| corrugated | box board | kraft plus soft flute ridges every ~34 texels in the height |

**What read wrong:**

| Read as | Cause | Fix |
|---|---|---|
| felt, "uniform mottled noise" | mid band dominant, fibres sub-pixel | sparse crisp strands, finer stronger tooth, mottle x0.4 |
| cracked leather, veins | long curly dark strands (130-430 texels) at full strength | shorter, straighter, mostly light strands at ~0.6 |
| scratchy web | strands at 0.85 seen close up | 0.6 or less, fewer |
| leather on dark pieces | normal strength tuned on cream | 0.9-1.0x of the cream value on dark colours |
| sand | per-pixel random noise | band-limited tooth only |
| popcorn, styrofoam | pebble relief too big or too steep | cells of 10 texels or less, tilt 7 degrees or less |
| stains, polka dots | accent patches mixed 70 %+ toward another hue | 30-42 % mixes with soft edges |
| everything ~21 % dark | detail map loaded as sRGB without the x2 | linear data, `colour * 2 * detail` |
| plastic | specular, sheen, roughness under 0.85 | diffuse only (`look.md` section 2) |

**Implementations.** `scripts/paper_textures.py` is the reference (band noise, wrapped strands, pebbles, crumple, mean
tilt and fine-detail calibration, cut / deckle / torn sheet masks) and writes files for any engine. In JS the kit's
`paperSheet()` and `normalMap()` give a tileable sheet. Its fibres are 0.35-1.15 px wide, so view it at one texel per
screen px or more, or scale it up. `printCard` multiplies the sheet over the print, so build it near-white (`#FAF6EE`)
or it shifts your palette.

## 2. Silhouettes

**Rules.**
- Chunky: convex lobes and scallops, corner radius at least 3 screen px. Points become rounded teeth (a pinked edge:
  tooth depth at most 16 % of the tier height). Nothing thin or spiky; spines, rigging and needles are printed.
- Minimum part width: the cut edge (dark line, plus the highlight on the lit side) takes about 2-2.5 px from each side,
  so any part under ~6-7 screen px wide is all edge. Posts, rails, stems, legs and masts are fat: blades at least 1/5
  of their length wide, "nothing thinner than a pencil".
- Hand-cut wobble: a low-frequency wander across the outline of 0.3-1 % of the piece size (2-4 plus 5-9 cycles per
  outline, ~35 % jitter). Fine jitter reads torn, not cut. `roughen(pts, r)` defaults to 0.8 % of the smaller side and
  keeps the base line straight (`keepBase`, on by default; pass `false` for free pieces and torn panels), but corners on
  slanted sides can drift, so snap the hinge foot: `.map(([x, y]) => [x, y < eps ? 0 : y])`.
- Hinged pieces stand on a flat straight base. Bushes, rocks, hedges and drifts too: `shape.mound(r, { w, h, lobes,
  depth })`; a radial shape with `cy = ry` balances on one point. Free pieces (clouds, birds) do not need one.
- Proportions stay chunky and are set against the hero: write every kind's ratio into the spec by its role. The
  countryside example: trees 2-2.5x the hero, bushes and boulders 0.5-0.9x tall and ~2x as wide, houses ~1.7x;
  whatever plays the same role in your world (a canopy, a ground cover, a dwelling) takes about the same scale.
- Cut real holes only when they are big (arches, gates, more than ~10 px); small openings are printed.
- The bare silhouette should name the object at 32 px. Build complex objects from several cards (structure types:
  `structures.md`; construction details: `mechanisms.md`), not from one intricate outline. For a crossed piece design
  both planes: the front view and the side view (or a print variant), each printed in full (`mechanisms.md` section 5).

**Vocabulary** (kit shapes in `assets/lib/paperkit-2d.js`; "custom" = a union of chunky primitives traced into one
cut by `fromDrawing(draw, { w, h })` with the `draw2` helpers, or a few arcs and lines, see section 4; the parts must
touch or overlap, and only the outer boundary is traced, so a closed opening fills in):

| Subject | Outline recipe | Core outline | Avoid |
|---|---|---|---|
| broadleaf tree | crown of 5-7 lobes (depth 0.15-0.2) on a short, fat tapered trunk as wide as the printed one | `shape.radial` with `stalk` | stick trunks |
| conifer | 4-5 stacked tiers, each narrower, scalloped or pinked lower edge, stub trunk | custom | needle spikes |
| palm, cactus | 5-7 fat drooping frond lobes on a curved trunk; capsule arms with round tips | `shape.radial` | thin fronds |
| bush, hedge, flowers | wide lobed dome, flat base | `shape.mound`, `shape.hill` | single blades, round balls |
| boulder, crystal | dome with two low harmonics cut in 6-10 straight snips; crystals as chamfered prisms | `shape.mound`, custom | sharp spires |
| rock outcrop, crag | 3-5 tall slanted cards in a tight cluster, heights varied, each a lit face and a darker facet | custom | one dome; a block of terrain |
| hill, bank, dune, mountain | 3-5 nested tall curved cards ("sails"), the back one tallest, each nearer one lower and ~10-15 % lighter; each a ridge with a flat-topped shoulder, 2-3 bumps and a lighter crest band (`mechanisms.md` section 8) | `shape.hill` | one triangle; a raised block of terrain with strata on its face |
| house, shop, temple | facade pentagon with roof overhang and a chimney block; roof as its own card | custom | a facade alone |
| tower, castle | tapered block with rounded crenellations (radius 15 %+) or a cone cap with a lip | custom | spires, flagpoles |
| space module, dome | rounded block (corner radius 10-20 % of the short side) + dome bump + docking collar | custom (4.2) | trusses, antennas |
| machine, robot | stacked rounded blocks; gears as 8-12 rounded square teeth; pipes as fat capsules | `shape.radial` | wires |
| vehicle, cart, train | rounded trapezoid body, cabin bump, wheels as separate discs over the base line | custom | spokes |
| boat, ship | hull crescent + cabin block; sails as fat curved triangles with rounded corners | custom | rigging lines |
| rocket, plane, balloon | ogive body, fins as rounded triangles; balloon = teardrop + basket block | custom | thin wings |
| animal | ellipse body + circle head + paired stub legs (1/4+ of body height) + one raised layer | custom (`drawnPiece`) | fur fringe, line tails |
| small props | bench, signpost, barrel, mushroom: fat planks, posts and stems, one connected cut | custom (`fromDrawing`) | thin legs |
| fish, sea creature | almond body with a forked tail notch; octopus = dome + 4-6 fat curls | custom | thin fins |
| hero | never one card: a small 3D paper model of ~10-20 cards (in 2D a puppet of cards that mirrors), a front outline and a side outline behind it per part (a body, a head with a face, arms and legs on shoulder and hip pivots; headgear and carried items only if the character's design has them), the back printed; `mechanisms.md` section 12 | custom, one per card | one flat card, a mirrored stack of frontal cards, a profile card rising past the face, merged legs |
| person in a crowd | hat or hair cap, head disc, trapezoid body, two fat legs on one base | custom | stick limbs |
| water | scalloped wave strip on a flat base; ripples are printed, not cut | `shape.waves` | thin wave lines |
| cloud, smoke | 4-6 lobes, flatter bottom; smoke as stacked discs or a spiral | `shape.radial` | wisps |
| fire, magic | 3-5 rounded teardrop tongues | custom | spikes |
| coral, kelp, shell | branching fat lobes or a brain-coral dome; kelp ribbon 8 %+ of its length wide; shell fan | `shape.mound`, `shape.radial` | thin branches |
| fence, rail, parapet | strip with fat pickets (width at least the gap); rails doubled and leaning | custom | single thin rails |
| bridge, stairs, deck, pier | not one outline: a built construction the walk field reads (a plank deck between side cards, thin treads on two stepped stringers, a posts face with gaps cut to the base), `mechanisms.md` section 14; its side cards use this table | - | one standing card |

## 3. Printing illustration

**Ink.** A print is ink coverage on paper, never paint:
- Dark ink multiplies (`c *= mix(1, ink, a)`); light ink lays toward cream (`c = mix(c, cream, a)`).
- Never opaque: max alpha 0.66-0.92 for bold motifs, ~0.5 for stipple, ~0.55 for halftone.
- Imperfect: a ragged edge (threshold of 0.7 px-blurred coverage displaced by 2-7 px band noise, +-0.16); an uneven
  film (alpha x `1 - 0.16 * (0.6 + 0.7 * grain)`, grain bands 2-5 and 6-30 px, floor 0.35); pin-hole dropouts (~10 %
  of the area, 1.5-3.5 px, alpha x 0.4).
- Paper goes on last: fibre multiplies the finished print, so it shows through the ink.
- Misregistration was never used in the shipped game; a 0.5-1 px offset of one ink is an option, not a requirement.

**Base, layers, shade.**
- Base: two tones (a +-8-12 % gradient from the lit side, or soft patches mixed 12-45 % toward a neighbour hue), then
  speckle in two tones (x0.65-0.75 and x1.2) of 1-3 px dots.
- Each glued layer: a soft shadow on the layer below (1-2 px away from the light, blur ~1.5 px, warm umber 25-35 %),
  then its fill 10-13 % lighter or shifted toward a neighbour hue, then a pale lip just inside its cut on the lit side
  only, at 60-80 % of the edge highlight's width. Equal-tone layers vanish.
- A soft printed shade inside the silhouette on the side away from the light (`P.innerShade`).
- Accents: every piece carries 1-2 that contrast with its base, never tone-on-tone (red + olive leaves on an orange
  tree, cream flowers and red berries on a green bush, cream + amber on teal). Pick yours per piece (the countryside
  examples take `colors.accents: [a, b]`); `accentsFor(base)` is only a fallback pair: deep red + dark olive on orange
  or green, terracotta + green on ochre, cream + amber on teal and blue, cream + gold on violet. The brief's lead
  family on a muted ground carries the colour; frame mean saturation (HSV S) is as rich as the world: ~0.55-0.75 in a
  colourful brief, far lower for snow, mist or fog (`palettes.md` rule 3).
- Red leaves on green read as autumn or Christmas: unless the brief is autumn, carry the contrast with flowers and
  fruit (`palettes.md` rule 10): `accentsFor` gives a green tree red + dark olive leaves, so pass `colors.accents`
  without the red and print blossoms or fruit over the crown.

**Motif library** (sizes relative to the surface they sit on; draw each mark from seeded randoms):

| Motif | Build | Size | Use on |
|---|---|---|---|
| shingles, scales | rows of filled half-discs offset half a unit per row; per row a pale lip line and a soft shadow under the row above; 3 tones mixed, 30 % split, 45 % 5-16 % darker | 5-6 rows | roofs, fish, dragons, armour, cones |
| bricks, stone blocks | rounded rects (corner ~15 % of block height), pale mortar ~10 % of block height, 3 tones, 0-2 chisel ticks | 3-6 courses | walls, bridges, wells |
| planks, wood | bands with 1-2 grain lines flowing round a knot, darker gaps, broken strokes | plank 10-20 % of width | doors, crates, hulls |
| leaves | fat almond with a pale vein, alternate angles, mostly in two accents that contrast with the crown, a few in a darker crown tone; one at every limb and twig tip, the rest spread to the rim | ~1/6-1/8 of the crown's width, counted in tens (the countryside example: 15-25 per crown, ~1/7 wide, tones 60 / 30 / 10 %) | trees, bushes, vines |
| branch tree | a fat trunk splitting low in the crown into tapered limbs with twigs, reaching ~3/4 of the way to the rim (the countryside example: trunk 12-16 % of the crown's width at its foot, ~6 limbs from ~6 % down to 2 %, two twigs each) | | under the leaves |
| berries, flowers | clusters of 3-6 dots; 5 dots round a centre | 3-7 % | bushes, meadows |
| grass tufts | fans of 2-4 fat tapered blades (width 1/5 of length) | | ground, bases |
| ripples | light-ink lens slivers in staggered rows | 15-30 % of the strip | water |
| windows | dark frame 12 % of the width, 2 x 2 panes in the world's window colour (the countryside's `#F7D77E`) with a brighter centre, a sill strip; lit by day too; printed (`P.glow`), never cut as a hole | | buildings with windows |
| doors | arched plank door, 2 plank lines, a knob dot | | buildings |
| portholes | trim-colour ring + lit glass disc with a brighter centre | | ships, sci-fi |
| rivets | rows of dots along panel edges, a pale dot offset toward the light optional | 1.5-3 px radius on screen | machines, hulls |
| panel lines | rounded-rect insets: dark groove + pale lip offset toward the light | | sci-fi, machines |
| circuitry | Manhattan traces with 45-degree chamfers ending in ring pads, pale ink on dark | trace 1.5 px+ | sci-fi panels |
| stripes, chevrons | diagonal bands clipped to a strip | 8-15 % of the strip | collars, tents, sails |
| coral | polyp rings with a dot; brain-coral meanders as offset wavy lines | | reefs |
| fabric | stitch dashes along an inset line, checks, dots | | clothes, flags |
| plaster flecks | irregular rounded blobs in 2 tones | 2-5 % of the wall | walls |
| stars, sparkles | dots and rounded 4-point crosses (tips 1 px+ radius) | | night, magic |
| halftone, stipple | 45-degree dot screen whose dot size follows tone | strength 0.12-0.35 | broad flat fills only |

**Placement.**
- Jittered grids or Poisson discs, clustered by low-frequency noise; randomise position, size (0.7-1.3), angle and ink
  per mark. A regular grid shows: the game cut its ground ticks by 70 % and freed each one's position, size, lean
  and ink.
- Counts in tens, not hundreds; leave 30-50 % of the base visible.
- Smallest ink feature at least 1.5 screen px; prefer filled shapes to hairlines.
- Say per category what may be printed: animals carry natural markings only; clouds and smoke two tones, a soft inner
  shade and sparse pale marks, no busy pattern. An ornate motif set leaks onto everything otherwise.

**The cut-edge rule** (`look.md` section 3 has the why):
- Two parts, both printed INSIDE the art: a thin dark-brown line right at the silhouette (the card's thickness and
  printed outline, 1.5-2.5 px on screen), and a pale highlight just inside it only on the edges that face the light
  (upper left by default), widest where an edge faces the key, nothing on the shaded side. Never an even pale, cream or
  white band all round the silhouette (a sticker halo), never glowing, never torn. (The even pale edge of a big inner
  layer, a pine tier or a shingle row, sits inside the card and is fine.)
- Constant WORLD width: the highlight at its widest about 1.5 % of the hero's height (4-6 % of a small piece's height,
  ~2 % of a bush, under 1 % of a house), clamped to 1-2.2 px on screen: about 1.1 px at the templates' framing, where
  the hero is ~72 px tall at 1080p. In texels: `rim = clamp(0.015 * heroPx, 1, 2.2) / texel_px`. Width +-25 % along
  the outline, crisp inner step, anti-aliased outer edge.
- Colours from the print, never white, black or cool: `P.rim({ color: 'auto', dark: 'auto' })` mixes the print's mean
  colour toward warm cream for the highlight and toward dark warm brown for the line, so one call holds in every mood.
- Folds are not cuts: hinge bases and panel joins get no edge (`P.rim({ skip: (x0, y0, x1, y1) => bool })`; in 3D
  `makeCard({ folds: ['bottom', 'left', ...] })`).
- One rim, not two: if the art carries the edge, add no second shader or post rim on top and no pale card sides. Card
  sides are a darkened copy of the face (x0.5-0.55, 6-10 % toward cream).
- Inner glued layers get their own lit-side lip (60-80 % of the highlight width) and shadow.

**Recipes per subject class** (bottom to top; L = a cut layer with lip and short shadow, `P.layer`; the rim and the
paper always come last):

| Class | Layer order |
|---|---|
| broadleaf tree | crown sheet 2-tone + `P.felt()` -> L: the branch tree (motif table) -> L: big fat leaves (~1/6-1/8 of the crown) at the tips and spread to the rim, mostly in two contrasting accents, faint midribs printed -> L: a few berries or fruit -> inner shade |
| conifer | 4-5 tiers, each L with an even pale cut edge, laid from the BOTTOM up so each tier's scalloped lower edge overlaps the one below -> pale and dark needle dashes printed inside each tier -> L: bark stub |
| bush, hedge | body sheet 2-tone + `P.felt()` -> L: an inner band (a smaller mound, paler and warmer, pale cut edge) -> L: the subject's motifs -> L: something at the foot that anchors it; or two stacked cards: a darker body card + a lighter inner card carrying the motifs (the countryside example, `paintBush`: sprigs fanned from the foot with berries at their tips, a fan of fat grass blades at the foot) |
| coral head, sea fan | body 2-tone + `P.felt()` -> L: branching fat lobes or brain-coral meander bands in a second tone -> polyp rings printed -> L: a few anemone or sea-fan tufts at the foot; no grass, sprigs or berries |
| building | wall 2-tone + `P.felt()` -> L: the material's units near the corners and the base (stones, plates, planks, blocks) -> L: a plinth or base band -> L per opening: a frame plus one trim of the subject's own (a cottage: shutters and a flower box; a module: a hood and vents; a temple: a lintel and a carved band), panes printed and glowing -> L: door with a pale cut edge -> L: one story detail (a climber, a sign, a banner) -> roof in its material's rows (shingles, tiles, plates), each an L with a pale lower edge, 3 tones per row (countryside example: `paintHouse`) |
| rock card (boulder, outcrop) | 2-tone + `P.felt()` -> L: the darker facet band (a fold turned from the light) -> L: a paler lit facet -> speckle -> L: a cap (moss, snow, sand) |
| creature | `drawnPiece` back to front: tail -> body -> haunch / wing (raised) -> legs -> head -> ears -> pale chest and cheek -> eye, nose, stripes printed (`ink(c, 'print')`; countryside examples: `critter.*`) |
| hero (one print per card) | a frontal print and a profile print per part (`mechanisms.md` section 12): the body with costume detail (trim, a belt, buttons), arms and legs, a head ~1.3x natural size whose printed face sits a step lighter than you would paint it, so it reads in every mood; headgear and carried items only if the character's design has them; the back printed too (hair, a coat back, a pack); chunky, toy-like proportions in colours that contrast with the ground; he stands in the sharp band |
| person in a crowd | one `drawnPiece`: legs -> carried item -> body -> head -> headgear -> arm and prop; eyes and costume trim printed; extras only, never the hero |
| machine, sci-fi | hull 2-tone + `P.felt()` -> L: panels (each plate a part, lips show the seams) -> L: band -> rivets printed -> L: portholes / lit windows -> stripes, decals printed |
| landform (hill, bank, dune, reef shelf) | each of the 3-5 nested cards: 2-tone + `P.felt()` -> L: a lighter crest band along the top edge -> L: a darker lower band -> sparse marks; nearer cards lower and ~10-15 % lighter (`mechanisms.md` section 8); never a raised block of terrain with strata on its face |
| built masonry (a quay wall, a stage, a plinth the brief names) | block courses (the bricks motif) in 3 tones -> L: a coping band along the top with a pale cut edge -> sparse stains or moss printed at the foot; the only solid printed face: other walkable height is built open (`mechanisms.md` section 14) |
| deck, treads, posts | planks across the walking direction, each an L with a darker gap, grain and nail dots printed; posts and stringers as fat planks; the side cards carry the parapet or rail print |
| water | the world's water colour (teal in the countryside) -> a lighter, warmer band toward the bank -> light-ink ripple rows -> a pale rim (sand, foam, ice) |
| cloud, smoke | cream 2-tone -> soft inner shade -> a few sparse pale marks; no pattern |
| ground | this world's floor (deck plates, tiles, sand ripples, snow drifts, moss, a printed map: never the example's sage washes + river + path by default) in one muted tone (the pieces carry the colour) + three-scale mottle; its regions (paths, fields, water, plates, beds) as torn-edge paper pieces (a jittered polygon with a pale fibre fringe, the 3D template's `torn()`), never airbrushed bands; marks sparse and clustered in drifts (an even sprinkle reads as a stamp); no rim |
| path, track, channel (the leading line) | a clear value step from the ground (the countryside lane: lighter and pinker, ~1.25x its luma), 1.2-1.5 hero heights wide, always curving (2+ bends in frame: two sines of ~8 and ~12 hero heights, ~30 and ~45 units at the templates' scale; one gentle sine reads as a ruler-straight road); a soft feathered edge with a slightly darker fringe just outside it (greener on grass) and fine grit speckle inside (a bare pale strip reads as an unprinted gap in the sheet); forks to each destination |
| region borders | every border of a printed region (path, river, field, sand, snow) is torn with a 2-4 px pale fibrous fringe; no straight ground edge longer than ~15 % of the frame width (a quay or a terrace wall included: break it with steps, bollards, relief, a bend) |

## 4. With paperkit-2d

**The core kit** (`assets/lib/paperkit-2d.js`, import it as is): `paperSheet`, `normalMap`, `tileNoise` (tileable value
noise); generic outlines (`shape.rect`, `shape.mound` (flat-based), `shape.radial`, `shape.hill`, `shape.waves`) and
`roughen` (keeps the base line straight unless `keepBase: false`); `fromDrawing(draw, { w, h })`, which traces
whatever the canvas calls fill (units, y up, base on y = 0; `draw2.ell`, `.rect`, `.poly`) into one cut outline;
`drawnPiece(draw, { w, h, finish })`, the same drawing cut AND printed, every fill its own layer (below);
`printCard(pts, { pxPerUnit, sheet, seed, paint, bleed })`, whose `paint(P)` draws in shape
units (y up) clipped to the cut and gets `P.fill`, `P.gradient`, `P.innerShade`, `P.marks(kind, { size, units })`
(size = fraction of `P.U`, the card's smaller side, or with `units: true` an absolute size in shape units for big
cards, where relative speckle grew huge on a 17 x 9 rock face; organic kinds `leaf dab dot tick scallop scale wave
hatch`, built kinds `brick panel rivet stripe window`; each style is batched into one path), `P.rim({ width, color:
'auto', dark: 'auto', light, skip })` (the cut edge: the dark line at the silhouette plus pale discs inside it sized
by how much each edge faces `light`, upper left by default; `width` = the highlight at its widest in shape units,
default 1.6 % of the card's own height, which suits only a card about the hero's height: in 2D pass
`width: 0.015 * heroHeight` on every card; both colours derived from the print's mean), `P.draw`, `P.glow`,
`P.outline` (an optional faint key line, off in the shipped style) and `P.paper`, plus `P.px` (one print pixel in
shape units) and `P.r` (seeded rng); it returns `{ canvas, box, pxPerUnit, mean }` (`mean` = average print colour;
`bleed` fills outside the cut with a colour for geometry-cut cards so mipmaps never fringe dark; `holes` cuts
openings, below). Also the layer pass `P.layer(shape, colour, { shadow, lip, shade, rim, felt, depth })` and
`P.parts(fn)` (section 0), `P.felt()`, the drawing primitives `fillLeaf` (a fat almond: leaf, blade, petal, flame,
feather) and `fillLimb` (a tapered limb: trunk, branch, stem, tentacle, pipe), `spanAt` / `tierTips` (outline
geometry), `accentsFor(base)` (a fallback accent pair), one world's folk motifs as an example set (`motif.sprig`,
`motif.berries`, `motif.flower` with a dotted centre: write your subject's own), `scallopTiles(P, region, { color,
rows })` (scalloped rows, each overlapping the one below: roofs, scales, feathers, awnings), `pathLine`, and
`drawDeck2D` / `deckShadow2D` for raised surfaces in a pitched 2D view (`drawSurface2D` for roofs and walls).

The print API on one screen (shape units, y up; `P.U` = the card's smaller side):

| Call | What it does |
|---|---|
| `P.fill(c)`, `P.gradient(c0, c1, angle)` | the base tone, or a two-tone base |
| `P.layer(shape, c, { shadow, lip, shade, rim, felt, depth, light })` | one cut-paper layer: a Path2D, a point list, or `(g, P) => { ... }` that fills several parts at once (each gets its own lip and shadow); `depth` 1 = 0.1 shape unit, sized for the templates' world units (hero 3.6): draw in those units or scale `depth` by heroHeight / 3.6 |
| `P.parts((g, ink) => { ... }, opts)` | every fill inside is its own layer, coloured `ink(c)`; `ink(c, 'print')` is a flat printed detail that never changes the cut |
| `P.marks(kind, { color, alpha, size, units, density, angle, region, width })` | pattern marks; `size` is a fraction of `P.U` (with `units: true`, shape units); rows are `size x 1.6 / density` apart |
| `P.felt(amount = 0.6)` | the quiet mottle over everything printed so far |
| `P.innerShade(c, { dx, dy, blurPx, alpha })` | a soft printed shade inside the cut on the side away from the light |
| `P.rim({ width, light, skip })` | the cut edge on the outline and every hole (`makeCard` calls it for you) |
| `P.draw((g, P) => { ... })`, `P.glow((g) => { ... })` | any flat drawing; lit parts (white = glow) into the emissive map |
| `P.box`, `P.U`, `P.px`, `P.r`, `P.g` | bounding box, smaller side, one print pixel, the seeded rng, the 2D context |

**Worked examples, not parts** (`assets/examples/countryside.js`): the pieces of the one world the style was
distilled from, built with these recipes. Read one painter (`paintTree` is the clearest: a trunk ~16 % of the crown, 6 limbs with two twigs each, ~20
leaves ~1/7 of the crown at the tips and out to the rim) to see how a recipe becomes code: the order of the layers,
the proportions, where the accents go. Then write your subject's own; never import, retune or recolour them for a new
subject. A Mars dome, a coral head or a temple is a new design with the same method, never a recoloured cottage or
bush. The 3D `makeCard` (paperkit-3d) calls `P.rim` itself (`edgeWidth` in world units, default 0.06; edges listed in
`folds`, default `['bottom']`, get none) and colours the sides as a darkened print; `layeredCard` stacks 2-3 prints on
one hinge (bushes: back darker and taller, front lighter and ~0.4 nearer). A layered print costs ~10-30 ms: print
near on-screen size (40-48 px per unit at a hero framing in 3D).

**One connected cut.** `fromDrawing` keeps the LARGEST connected part and DROPS every part that does not touch it (a
loose pennant is lost, the tent kept), with a console warning that names the drawing and gives the dropped share of
the filled area. Overlap the parts (a sail on its mast, a head on its body), or make them separate cards. A drawing
that runs off its `w x h` box is cut there (it warns): size the box to the drawing. `drawnPiece` calls `draw(g, ink)`
TWICE (once for the cut, once for the print): create any randomness inside it (`const r = P2.rng(7)` as its first
line), or the print stops matching the cut.
**Openings** the hero walks through or the camera must see through (a door he enters, an arch, a gate, the gaps of a
ladder or a cart wheel; anything over ~10 px) are holes, never painted dark; windows are printed lit panes (`P.glow`),
never holes. `printCard(pts, { holes })`, `makeCard(pts, { holes })`, `popup(..., { holes })` and the 2D template's
`piece(..., { holes })` take outlines inside the cut and rim each one like the outline (its lit side is the hole's
lower and right edge with the key at the upper left). A gap that runs down to the base (between posts) is part of
the outline instead. **Multi-part props** (parrots, monkeys, tents, vehicles) are one
`drawnPiece`: `draw(g, ink)` fills each part with `ink('#hex')`, which is black for the cut and the real colour for
the print, so one drawing drives both; `finish: false` skips its speckle and inner shade.

```js
const D = P2.draw2;
const [pts, paint] = P2.drawnPiece((g, ink) => {          // every part overlaps the last: one cut
  g.fillStyle = ink('#d9a03a'); D.poly(g, [[-1.1, 0], [1.1, 0], [0.15, 1.45], [-0.15, 1.45]]);   // canvas, base on y = 0
  g.fillStyle = ink('#9c5636'); D.poly(g, [[-0.35, 0], [0.35, 0], [0, 0.95]]);                   // door: inside, print only
  g.fillStyle = ink('#74452a'); D.rect(g, -0.13, 1.3, 0.26, 0.55, 0.06);                        // fat pole overlaps the apex
  g.fillStyle = ink('#c8452d'); D.ell(g, 0.36, 1.72, 0.28, 0.14);                               // pennant overlaps the pole
}, { w: 2.4, h: 2.0 });
const tent = makeCard(pts, { paint, paper });             // 2D: P2.printCard(pts, { paint, sheet, pxPerUnit })
```

In the kit: glued layers (`P.layer`, `P.parts`). Supplied below: ink finishing and an atlas.

**4.1 Helpers** (canvas 2D; copy next to the kit):

```js
import { rng, shade, roughen, printCard, paperSheet, tracePath, tileNoise } from 'papercraft/lib/paperkit-2d.js';

// Glued layers are in the kit: P.layer(shape, colour, { shadow, lip, shade, rim, felt, depth }) inside any paint(P).
// shape = an outline, a Path2D, or a function (g) that fills the part(s) itself; every separate part in one call gets
// its own lip and shadow (they come from the layer's alpha), so batch non-overlapping parts:
//   P.layer((g) => { for (const q of leaves) { g.fillStyle = q.tone; P2.fillLeaf(g, q.x, q.y, q.L, q.a); } }, '#c8452d');
// Overlapping parts (pine tiers, shingle rows, a wing over a body) need one call each, back to front.

/** Marks as printed ink: draw coverage in shape units, then uneven film, dropouts and a max opacity; multiply
 *  onto the card (light: true lays pale ink over it instead). Ragged edges: draw marks through roughen(). */
export function ink(P, draw, { color = '#3A2E28', max = 0.85, light = false, seed = 7 } = {}) {
  const { g } = P, W = g.canvas.width, H = g.canvas.height;
  const L = new OffscreenCanvas(W, H), q = L.getContext('2d');
  q.setTransform(g.getTransform());
  q.fillStyle = q.strokeStyle = color; q.lineCap = q.lineJoin = 'round';
  draw(q, P);
  const img = q.getImageData(0, 0, W, H), d = img.data, r = rng(seed);
  const film = tileNoise(128, 9, r), grain = tileNoise(128, 40, r);
  for (let i = 3, p = 0; i < d.length; i += 4, p++) {
    if (!d[i]) continue;
    const k = ((Math.floor(p / W) & 127) << 7) | ((p % W) & 127);
    d[i] *= max * (0.7 + 0.3 * film[k]) * (grain[k] > 0.8 ? 0.45 : 1);
  }
  q.putImageData(img, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = light ? 'source-over' : 'multiply';
  g.drawImage(L, 0, 0); g.restore();
}
```

**4.2 Worked example: a space-station habitat module.** Not countryside on purpose: the recipe is the same for any
subject. Chunky rounded body, an observation dome, a docking collar as the hinge foot; inside, a two-tone hull,
panel grooves with lips, rivets, a glued service belt with lit portholes, a lit dome and hazard stripes.

```js
const C = { hull: '#CFC6B4', belt: '#5E9C9A', trim: '#D9A441', glass: '#F7D77E', stripe: '#B9603F' };
const PI = Math.PI;
const arc = (cx, cy, rx, ry, a0, a1, n = 10) => Array.from({ length: n + 1 }, (_, i) =>
  [cx + Math.cos(a0 + (a1 - a0) * i / n) * rx, cy + Math.sin(a0 + (a1 - a0) * i / n) * ry]);
const rrect = (x, y, w, h, k) => [...arc(x + w - k, y + k, k, k, -PI / 2, 0, 6),
  ...arc(x + w - k, y + h - k, k, k, 0, PI / 2, 6), ...arc(x + k, y + h - k, k, k, PI / 2, PI, 6),
  ...arc(x + k, y + k, k, k, PI, 1.5 * PI, 6)];

// silhouette in the templates' world units (hero 3.6 tall: the module is ~1.8x the hero, like a house); corner
// radius 20 % of the width; flat foot on y = 0
function moduleOutline(r) {
  const p = [[-1, 0], [1, 0], [1, 0.45],
    ...arc(1.2, 1.25, 0.8, 0.8, -PI / 2, 0), ...arc(1.2, 4.65, 0.8, 0.8, 0, PI / 2),       // right corners
    ...arc(0, 5.45, 1, 0.95, 0, PI, 24),                                                    // dome
    ...arc(-1.2, 4.65, 0.8, 0.8, PI / 2, PI), ...arc(-1.2, 1.25, 0.8, 0.8, PI, 1.5 * PI),  // left corners
    [-1, 0.45]];
  return roughen(p, r, { amp: 0.012, step: 0.05 }).map(([x, y]) => [x, y < 0.03 ? 0 : y]);
}

function paintModule(P) {
  const { px, r } = P;
  P.gradient(shade(C.hull, 0.1), shade(C.hull, -0.12), 0.6);                         // two tones, lit upper left
  for (const [tone, light, n] of [[shade(C.hull, -0.35), false, 500], ['#FFF8EA', true, 250]])   // speckle
    ink(P, (q) => { for (let i = 0; i < n; i++) { q.globalAlpha = 0.3 + 0.5 * r(); q.beginPath();
      q.arc(-2 + 4 * r(), 6.4 * r(), (0.6 + 0.8 * r()) * px, 0, 7); q.fill(); } }, { color: tone, light, max: 0.55 });
  for (const [x, y, w, h] of [[-1.75, 0.75, 1.6, 1.75], [0.15, 0.75, 1.6, 1.75], [-1.75, 3.55, 3.5, 1.3]]) {
    const pr = rrect(x, y, w, h, 0.22);
    ink(P, (q) => { tracePath(q, pr); q.lineWidth = 2.5 * px; q.stroke(); }, { max: 0.5 });               // groove
    ink(P, (q) => { q.translate(-1.5 * px, 1.5 * px); tracePath(q, pr); q.lineWidth = 2 * px; q.stroke(); },
      { color: '#FFF6E2', light: true, max: 0.6 });                                                        // lip
    ink(P, (q) => { for (let t = 0.12; t < 1; t += 0.19) for (const v of [y + 0.14, y + h - 0.14]) {
      q.beginPath(); q.arc(x + w * t, v, 2.2 * px, 0, 7); q.fill(); } }, { max: 0.75 });                     // rivets
  }
  P.layer(roughen(rrect(-2.2, 2.65, 4.4, 0.75, 0.1), r, { amp: 0.01 }), C.belt, { rim: 0.8 });          // glued belt
  for (const x of [-1.2, 0, 1.2]) {
    P.layer(rrect(x - 0.3, 2.73, 0.6, 0.6, 0.3), C.trim, { lip: 0.8, shadow: 0.8 });                    // port ring
    const glow = P.g.createRadialGradient(x, 3.05, 0.02, x, 3.03, 0.24);
    glow.addColorStop(0, '#FFF2B8'); glow.addColorStop(1, C.glass);
    P.layer(rrect(x - 0.2, 2.83, 0.4, 0.4, 0.2), glow, { lip: 0, shadow: 0.6 });                        // lit glass
  }
  P.layer(arc(0, 5.45, 0.82, 0.78, 0, PI, 24), C.glass);                                                // lit dome
  ink(P, (q) => { q.lineWidth = 3 * px; for (const a of [0.55, PI / 2, 2.6]) {                       // dome ribs
    q.beginPath(); q.moveTo(0, 5.45); q.lineTo(Math.cos(a) * 0.8, 5.45 + Math.sin(a) * 0.76); q.stroke(); }
  }, { max: 0.7 });
  P.draw((g) => { g.beginPath(); g.rect(-1.1, 0, 2.2, 0.45); g.clip();                    // collar stripes
    ink(P, (q) => { q.lineWidth = 0.13; for (let x = -1.6; x < 1.6; x += 0.32) {
      q.beginPath(); q.moveTo(x, -0.1); q.lineTo(x + 0.45, 0.6); q.stroke(); } }, { color: C.stripe, max: 0.8 }); });
}

// 3D: makeCard prints the cut edge itself (world units, none on its folds)
const habitat = makeCard(moduleOutline(rng(11)), { paint: paintModule, paper, pxPerUnit: 48 });
// 2D: add the edge in the print, last, at the 3D edgeWidth (0.06: ~1.5 % of the hero); the foot is a fold: no edge
const sheet = paperSheet({ size: 256, color: '#FAF6EE', seed: 3 });   // near-white: fibre without a colour shift
const card = printCard(moduleOutline(rng(11)), { pxPerUnit: 48, sheet, seed: 5,
  paint: (P) => { paintModule(P); P.rim({ width: 0.06, skip: (x0, y0, x1, y1) => y0 < 1e-6 && y1 < 1e-6 }); } });
```

`card.canvas` is ~190 x 310 px, transparent outside the cut; in 2D `drawImage` it (template: `popup-2d`). Never a
second rim on top of the one the card already has.
Side by side with the same outline in a flat fill, the printed card is the one that won.

The same recipe makes an underwater coral house: outline = a lobed dome (`shape.mound`, 5-6 lobes) with two rounded
turret bumps and a flat foot; base sand-pink in two tones; glued scalloped coral bands, each an L with its lip and
shadow, in coral and teal; scale rows on the roof; polyp rings and brain-coral meanders as ink; two portholes with lit
glass; cardstock like every card.

**4.3 Runtime atlas.** Bake every piece at boot into one atlas: one texture, one draw source, deterministic.

```js
/** items: [{ name, pts, paint, pxPerUnit, seed, kind }]. Returns color (opaque; colour bled under the cut so mips
 *  and loose cuts never show a fringe), mask (coverage, white on black) and map (rect px, outline 0..1 v up,
 *  aspect = cut width / height, tone = mean print colour). */
export function buildAtlas(items, sheet, { size = 2048, pad = 8, bleed = 4, page = '#EFE0C2' } = {}) {
  const cards = items.map((it) => ({ ...it, ...printCard(it.pts, { pxPerUnit: it.pxPerUnit, sheet, seed: it.seed,
    paint: it.paint }) })).sort((a, b) => b.canvas.height - a.canvas.height);   // shelf pack, tallest first
  const color = new OffscreenCanvas(size, size), mask = new OffscreenCanvas(size, size);
  const cg = color.getContext('2d'), mg = mask.getContext('2d'), map = {};
  let x = pad, y = pad, rowH = 0;
  for (const c of cards) {
    const { width: w, height: h } = c.canvas;
    if (x + w + pad > size) { x = pad; y += rowH + pad; rowH = 0; }
    if (y + h + pad > size) throw new Error('atlas full: raise size or lower pxPerUnit');
    const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];       // colour bleed ring
    for (let d = bleed; d >= 1; d--) for (const [dx, dy] of ring) cg.drawImage(c.canvas, x + dx * d, y + dy * d);
    cg.drawImage(c.canvas, x, y); mg.drawImage(c.canvas, x, y);
    const b = c.box;
    map[c.name] = { rect: [x, y, w, h], kind: c.kind, pxPerUnit: c.pxPerUnit, aspect: b.w / b.h, tone: c.mean,
      outline: c.pts.map(([u, v]) => [(u - b.x0) / b.w, (v - b.y0) / b.h]) };
    x += w + pad; rowH = Math.max(rowH, h);
  }
  cg.globalCompositeOperation = 'destination-over'; cg.fillStyle = page; cg.fillRect(0, 0, size, size);
  mg.globalCompositeOperation = 'source-in'; mg.fillStyle = '#fff'; mg.fillRect(0, 0, size, size);
  mg.globalCompositeOperation = 'destination-over'; mg.fillStyle = '#000'; mg.fillRect(0, 0, size, size);
  return { color, mask, map };
}
```

- 2D canvas: draw straight from the card canvases (or an un-bled atlas); canvas filtering handles alpha correctly.
- WebGL / three.js: `map` = color, `alphaMap` = mask, `alphaTest` ~0.4-0.5 (alpha-to-coverage with MSAA for smooth
  cuts), or cut geometry along `outline` simplified to 20-60 points. A canvas cannot keep colour under zero alpha,
  hence the separate mask.
- One fixed print density for all sprites of a kind (px per world unit), sized so the sprite lands at 1-2 texels per
  screen pixel; the rim in px follows from it. Bake 4-6 seeds per kind (section 0), never repeat one inside a
  cluster, and keep at most ~3 identical props in view.
- The same contract (`rect`, `outline`, `kind`, `pxPerUnit`, `aspect`, `tone`) is what an image-generated atlas writes
  (`image-gen.md` section 6), so either source drops in.

## 5. SVG, CSS and video

Layer shadows, card CSS and the SVG fibre and cut filters are in `web-2d.md`. For the print itself:

```html
<filter id="ink" x="-2%" y="-2%" width="104%" height="104%">   <!-- ragged edge + uneven film, never opaque -->
  <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" seed="4" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="rag"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="f"/>
  <feColorMatrix in="f" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.2" result="film"/>
  <feComposite in="rag" in2="film" operator="in"/>
</filter>
```

- Put the card's fill, motifs, edge and paper inside `<g clip-path="url(#cut)">`, in that order. Dark motifs get
  `filter="url(#ink)"` and `style="mix-blend-mode:multiply"`; pale motifs take the same filter and blend normally.
- Edge: a pale `<rect>` over the card through a mask of white minus the cut path moved away from the light (`<use
  href="#cutpath" transform="translate(3 3)"/>` in black), a sliver on the upper-left edges only; then the cut path
  again, `fill="none" stroke-width="4"` (the outer half is clipped: a 2 px line). Colours as `P.rim`'s 'auto':
  highlight = the piece's mean colour mixed 78 % toward `#fff3d6`; line = the mean mixed 55 % toward umber `#2b1a0e`,
  then 50 % toward `#4a2812`. Never an even pale stroke, never a stroke outside the cut; leave folds out of the stroke.
- Paper: a baked tile (`paper_textures.py` albedo, or `paperSheet().toDataURL()`) as `<image>` or `<pattern>` fill with
  `mix-blend-mode:multiply`, last in the group.
- Use `<pattern>` only for small regular motifs (stripes, rivet rows, halftone). Generate leaves, stones and scales as
  individual seeded paths, or the repeat shows.
- CSS boxes: corner radius 3 px or more, edge as `box-shadow: inset 0 0 0 1.5px <dark>, inset 3px 3px 0 <pale>` (the
  line all round, the highlight on the top and left only), print and paper as background layers with
  `background-blend-mode: multiply`; other outlines via `clip-path: path(...)` or `mask-image`.
- Filters are resolution dependent (set scales in output px) and slow on big areas: rasterise each card once and
  animate the raster.
- Video: bake each piece at output scale (2x if the camera pushes in), keep print and fibre attached to the piece as it
  moves and rotates, never re-seed per frame (the paper would boil), and render frames deterministically
  (`web-2d.md` section 7, `motion.md`).

## 6. Acceptance checks

Check at final resolution and at the main camera, then on 6x crops:

| Check | Pass | How |
|---|---|---|
| Fibre visible, not dominant | one quiet fibre: plain card fine detail 0.010-0.022 RMS (luma swing ~1-1.5 L*); no felt, weave, leather or sand | luma Gaussian sigma 1 minus sigma 4, flat areas; `paper_textures.py` prints it |
| Seamless | seam ratio 1.5 or less; nothing shows on a 3 x 3 tiling at x4 contrast | wrap step / mean neighbour step (`--preview`) |
| Cut edge | every piece, small and large alike: a dark-brown line 1.5-2.5 px at the silhouette, a pale highlight inside it on the lit edges only; no even pale band; no edge on folds; one rim; no stair steps | profile across the silhouette on 6x crops, lit and shaded side |
| Nothing too thin | no ink feature under 1 screen px (aim 1.5+); no silhouette part under ~6 px; convex corners 3 px+ radius | measure the thinnest stem, rail, line |
| Stands and scales | hinged pieces (bushes and rocks too) on a flat base; every kind at the ratio to the hero the spec gives it by role (section 2) | wide frame, against the hero |
| Print present | every piece: 3-5 inks (a two-tone base, 1-2 layer tones, 1-2 contrasting accents), 3+ value steps, one ornament, motifs >= ~20 L* from their base, speckle; interior luma std 0.12-0.24 (a fibre-only card ~0.08) | per-sprite stats; shipped printed sprites measured 0.12-0.24 |
| Counts | motifs big, bold and few (~1/6-1/8 of the card's width, counted in tens), the structure reaching the rim; big pieces as a darker outer band or card round a lighter inner motif panel; no flat run of one tone over ~1/4 of a card | per kind, against section 0 |
| Frame | dark accents ~8-16 % of the sharp band by day; 4-6 variants per kind; at most ~3 identical props in view | wide frame, by eye |
| Layers read | pieces over ~60 px show 2+ layers, each with a lit-side lip and a shadow | 3x crop |
| Palette within N colours | k-means (k = 8, Lab) per piece: every cluster over 5 % within dE00 5 of a palette role; one hue family + at most 2 accents per area, plus edge line and highlight, the world's window colour and ink; frame mean HSV S as rich as the world (`palettes.md` rule 3) | `palettes.md`, `scripts/measure.py` |
| Deterministic | same seed, same pixels | hash two runs |
| Beats flat | blind side-by-side against the same scene in flat fills: the printed version wins clearly | `process.md` |

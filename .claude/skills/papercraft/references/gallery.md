# Gallery: five briefs, five worlds, one style

Read this when: starting any world (after reading the brief, before writing the paper spec), when the user gives you
references, or when your world starts to look like the template's example.

`assets/gallery/` holds stills from the shipped game this skill was distilled from: its five biomes, each from the
gameplay camera and close up, and one at night. Under each one here: a prompt that would ask for that world, and how
the method turned it into the scene. Look at the one or two closest to your brief and one far from it. They show two
things:

- **The quality bar.** Dense, printed, lit, lensed paper at full strength: what "done" looks like.
- **The range.** The same style makes five worlds that share no palette, no ground, no buildings and no weather. Only
  the way things are built, printed, lit, framed and moved stays the same (section 8).

They are not a menu. Never move a gallery world's colours, kinds or layout into a different brief. The small figure in
a straw hat is that game's player: design your own (`mechanisms.md` section 12). The palettes below were measured on
the frames with `scripts/measure.py`, so they show how authored colours land under the light and grade. Your own come
from your brief (`palettes.md` section 3).

## 1. From a prompt (and references) to a world

1. **Read the prompt** for the place and its culture or era; the season, weather and time of day; the scale (a room,
   a street, a valley); the mood words; what must appear, and what must not.
2. **Read the references**, if the user gave any: images, a moodboard, a game, a film still, a photo of a real place,
   a brand guide. From each, write down what it gives:
   - its palette (`scripts/measure.py ref.png` lists its colours; `--target ref.png` compares your frame later);
   - its materials and print motifs (stripes, scallops, rivets, petals, tiles);
   - its silhouettes and proportions, and its density;
   - its light and shadow colour;
   - how things move.

   The prompt decides WHAT is in the world. References decide HOW it looks wherever they speak. This skill decides
   how it is BUILT (paper construction, print, lens, light quality) and fills in what neither says.
3. **Choose the ground** from the place:
   - what the floor is (sand, snow, moss, deck plates, tiles, a map);
   - its regions and features (drifts, ripples, beds, plates);
   - its leading line (a caravan track, a ski run, a lane between beds).

   Add water only if the brief has it, in the form its world gives it.
4. **Choose the structures** from the culture and climate (tents and a stepped ruin in a desert, a log cabin and an
   igloo in snow, greenhouses and arches in a garden). Build each the paper way (`structures.md`); anything walked on
   is built (SKILL.md law 9).
5. **Choose the kinds of pieces (15-25) and their prints** from the place. Prints are where a world's character lives:
   chevron palm trunks, geometric saddle blankets, icicle scallops, rows of tulips.
6. **Choose the life** (weather, flyers, creatures, smoke) from the environment and the time of day (`motion.md`
   section 12).
7. **Derive the palette** from all of that (`palettes.md` section 3), then write the paper spec (SKILL.md section 2).

## 2. Pine forest: `pine-forest.jpg`, `pine-forest-close.jpg`

> A misty pine forest in the hills: tall dark conifers, a glade of giant red toadstools, mossy fallen logs and stumps,
> ferns, a few yellow birches; foxes, deer and squirrels; drizzle and low fog, fireflies after dark.

- **Palette.**
  - Measured: moss ground `#7E8859` / `#585F32`, deep pine `#343A16` and near-black `#161705`, mustard birch `#A18437`,
    mist grey-green `#99A193`, bark `#502B0E`, toadstool red `#A64918` with cream spots.
  - One family (the greens) is carried by the trees; red and mustard are the accents.
  - Shadows are near-black olive, never grey. The frame is the darkest of the five day frames.
- **Ground.** One sage-moss sheet with a sprinkle of tiny white flowers. No river and no path: clearings and a fenced
  glade carry the composition.
- **Pieces.**
  - Conifers: crossed cards of stacked tiers (lighter tier edges, a red-brown trunk).
  - Birches with printed leaf crowns.
  - Toadstools as cap-and-stem cards, the giant ones as the landmark.
  - Logs as box folds with mossy tops; stumps with ring tops.
  - Fern fans, flowering bushes, a split-rail fence round a hay clearing, a bench.
- **Light.** Diffuse and low in contrast; the far side fades into pale mist.
- **Life.**
  - Weather: rain streaks, low mist, fireflies after dark.
  - Creatures: foxes, deer and squirrels that bound away; a cat on the bench.
  - Wind: almost none (sway ~1/3 of default).

## 3. Desert oasis: `desert-oasis.jpg`, `desert-oasis-close.jpg`

> A desert oasis on a caravan route: rolling dunes, a palm-ringed turquoise pool, a camp of striped tents with pots
> and crates, camels in patterned saddle blankets, a stepped sandstone ruin, cacti in flower, grey boulders; hot noon
> sun, dust and gusts.

- **Palette.**
  - Measured: sand `#E4C46A` (43 % of the frame), tan `#C29B4F`, ochre `#C0791F`, gold `#D6A237`, pale sand
    `#D8C993`, burnt orange `#A24B0C`.
  - Accents: the turquoise pool, red-and-cream tent stripes, green fronds.
  - Shadows are warm brown `#8A4E13`. The brightest frame of the five.
- **Ground.** One warm sand sheet with paler drift washes and faint wind-ripple dashes. The small pools are the only
  water, because the brief has an oasis. Dunes rise as nested folded cards; the camp and the pool are the focal
  points.
- **Pieces.**
  - Dunes: V-folded half-disc wings (two half silhouettes meeting at the apex, the mouth toward the camera:
    `structures.md` section 3), stepped in value.
  - Palms: crossed cards with a chevron-banded trunk and layered frond crowns with coconut clusters.
  - Striped tents (crossed triangle cards printed with bands) and a stepped ruin of box folds.
  - Boulders: layered flats with strata lines.
  - Agave tufts, flowering cacti, a bare dead tree, pots, crates and shells.
- **Light.** A hard, high, warm sun; crisp, short shadows.
- **Life.**
  - Weather: dust motes and sand gusts (short pale streaks low over the ground).
  - Creatures: camels grazing by the palms, lizards that dart off, a fox at night.
  - Wind: the strongest of the five, so palms and cloth sway the most.

## 4. Snow hamlet: `snow-hamlet.jpg`, `snow-hamlet-close.jpg`, `snow-hamlet-night.jpg`

> A snowy hamlet in a pine valley: a log cabin with a lit window and a smoking chimney, an igloo, a snowman, a sled
> and a woodpile, snow-laden pines and bare birches, a fenced paddock; deer, foxes, a dog and a cat; soft snowfall,
> cold blue light, warm windows.

- **Palette.**
  - Measured: snow `#CDD0D8` (46 %), periwinkle drift shadow `#A4AFC4`, stone grey `#928F8E`, warm grey `#BDB4A6`,
    deep pine `#29311E`, timber `#B1793B`, roof red-brown `#622515`.
  - Accents: amber windows, the snowman's red scarf, red berries.
  - Shadows on the snow are periwinkle-lilac (`#A4AFC4`), never black; the darkest 20 % (pines, timber) `#665F56`.
    Mean saturation ~0.15: right for snow.
- **Ground.** Blue-white snow with lilac-grey drift shapes printed in. Drifts rise as nested white-blue folded cards;
  a frozen pond lies as pale ice.
- **Pieces.**
  - Log cabin: a box fold with printed log ends, a thick white roof with a scalloped blue icicle trim, a brick chimney.
  - Igloo: a dome card printed with ice blocks and an arched door, a half cross (depth hidden behind it).
  - Trees: tiered pines with white tops on every tier; bare white birches with dark marks.
  - Snowman (layered discs, a scarf, a hat), sled, woodpile, signpost.
  - Rail fences, snowy bushes with berries.
- **Light.** A soft warm-white key and a cold blue fill (the `snow-bright` light); the windows carry the warmth.
- **Life.**
  - Weather: paper star flakes falling, chimney smoke curls, a little mist.
  - Creatures: deer, arctic foxes and hares that bound away; a dog and a cat by the cabin.
  - Wind: gentle.
- **Night** (`snow-hamlet-night.jpg`): the same world re-lit, with nothing repainted: an indigo moon fill, amber
  windows and lamp pools (`palettes.md` section 5).

## 5. Spring gardens: `spring-gardens.jpg`, `spring-gardens-close.jpg`

> Spring gardens in bloom: pink and white blossom trees, wisteria arches, tulip beds in planters, little glass
> greenhouses, stone lanterns, a beehive; lambs, songbirds and butterflies; petals drifting on a light breeze.

- **Palette.**
  - Measured: a fresh yellow-green ground `#B3B15E` (muted, not video-game green), bark `#8C6123`, olive `#868146`,
    buff wood `#CAA56A`, gold `#BF8922`, blossom pink, wisteria purple.
  - Accents: red, yellow and white tulips.
  - Shadows are warm brown `#804618`.
- **Ground.** One fresh-green sheet; the beds and planters stand on it. No water needed.
- **Pieces.**
  - Blossom trees: crossed cards with crowns densely printed with five-petal flowers in two pinks or cream.
  - Wisteria arches: two side cards and an arched top card hung with purple clusters and leaves.
  - Planters: low boxes printed with rows of tulips.
  - Greenhouses: box folds with printed panes and frames.
  - Stone lanterns (stacked cards), a skep beehive under a frame, fences, flowering bushes.
- **Composition.** A loosened garden grid: arches and planters in staggered rows, trees in clumps.
- **Light.** A soft warm spring sun.
- **Life.**
  - Weather: drifting petals.
  - Flyers: butterflies at the flowers, songbirds, fireflies at dusk.
  - Creatures: lambs grazing.

## 6. Autumn farmland: `autumn-farmland.jpg`, `autumn-farmland-close.jpg`

> An autumn village in farmland: cottages with red scalloped roofs and lit windows, orange and red trees, a beehive,
> benches, signposts and toadstools; sheep, cats and a fox; leaves falling, smoke from the chimneys.

- **Palette.**
  - Measured: ochre-olive ground `#C8A55D`, olive-tan `#AE8946`, rust `#8E581F`, leaf red `#B13812`, amber `#C68235`,
    orange `#C86122`.
  - Accents: cream window light, teal bushes for contrast.
  - Shadows are warm rust `#762D0B`.
- **Ground.** One olive-khaki sheet; a pale cream lane between the cottages.
- **Pieces.**
  - Cottages: box folds with scalloped shingle roofs, cream walls, lit windows and chimneys.
  - Trees: crossed cards printed with leaf crowns in three warm inks; layered bush stacks in teal and orange.
  - A skep beehive, benches, signposts, rocks, toadstools, flowers.
- **Life.**
  - Weather: leaves drifting down and resting on the page; chimney smoke curls.
  - Flyers: butterflies, birds crossing.
  - Creatures: sheep grazing, cats by the doors, hens, a fox.

The 3D template's example scene is built after this world. It is one world among many, never the default.

## 7. A brief none of these answer

> A night market on stilts over a mangrove: lantern-lit food stalls on plank walkways, boats tied below, roots in dark
> water; steam from the pots, fireflies, fish jumping.

Taken the same way:

- **Palette.** From night water and lantern light: an indigo-green water floor printed with root shadows, weathered
  teal and red stall cloths, amber lanterns as the warm note, timber decks. Nothing from the gallery's warm days.
- **Ground.** The water is the floor (printed, ripple marks, root silhouettes). The walked surface is plank walkways
  on posts (`platform`), the leading line from stall to stall.
- **Structures.** Stalls as box folds with awnings; tied boats as layered flats; mangrove trees as crossed cards with
  stilt roots.
- **Life.** Steam puffs from the pots (`puffs`), fireflies over the water (`flyers` with glow), fish that jump and
  float (`critter` float plus a short arc), bats crossing (`flock` at night).
- **Light.** The night set (`look.md` section 8), with lantern pools as practicals.

None of it is in the gallery. Only the method is.

## 8. What the five share, and what changes

**Shared (the style):**
- printed, layered cards with thin cut edges on fibrous stock;
- forms from cutting, folding and layering (crosses, box folds, nested cards);
- a long lens looking down with a tilt-shift band;
- a soft key with shadows coloured by the world;
- dense groups of different chunky pieces, toy proportions;
- quiet paper motion, and a world that is alive with its own weather and creatures.

**Changes (the brief):** everything else, including:
- the palette and the ground;
- the leading line, the structures and the prints;
- the light's colour, and which life lives there.

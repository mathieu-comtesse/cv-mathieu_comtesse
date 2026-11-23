# Structure types: build anything from a few paper primitives

Read this when: you design the pieces of any world (after the paper spec, before you write a piece), when a piece
reads flat or wrong, or when you meet a thing you do not know how to build.

Think of these as the data types of the style. Every piece in a world is one structure type, or a composition of
several, the way any value in a program is built from a few types. Like a programming language's types they are a
starting vocabulary, not a closed list: extend them, combine them, and define your project's own types when its
creative needs call for one (section 11). Each type has subtypes, one constructor in the
kit or the 3D harness, and the things it suits. The constructors take YOUR outline and YOUR print and return the
construction; none of them draws a subject. Choose the type from the thing's shape and from how the camera sees it;
the silhouette, print and colour come from your brief.

The sampler page `assets/templates/popup-3d/structures.html` shows every type below in plain placeholder outlines,
each named on the page (click to fold the page flat and watch each one rise). Read its `structures.js` for the calls.

## 0. Choosing a type

| The thing ... | Type: subtype | Section |
|---|---|---|
| is low and small, seen from the front: a tuft, flowers, a rock, a crate, a sign, a critter | card: facing card | 1 |
| is small but needs a little depth from one side: a bush, a hedge, reeds, a crowd | layered: fan pair | 2 |
| is long and low with depth: hills, dunes, banks, a skyline, a relief | layered: stack of sails | 2 |
| is round on top: a dome, a yurt, a mound, a cap | layered: dome slices | 2 |
| stands upright and round and is walked around: a tree, a palm, a cactus, a post, a tent, a lantern, a rocket | slotted: full cross | 3 |
| has a front and needs depth behind it: a boulder, an igloo, a shrine, a gravestone, a statue | slotted: half cross | 3 |
| needs a foot or a strut toward the viewer: a sign, a tall flat landmark, a porch, a prow | slotted: half cross, low buttress | 3 |
| turns a corner: a ruin's corner, a wall end, a cliff or rock corner, a book standing open | slotted: quarter cross | 3 |
| is a ridge: a dune, a drift, a bank, a rock outcrop, a roof ridge seen end-on | slotted: V-fold | 3 |
| is a building with a rectangular plan and a pitched roof | folded: box fold | 4 |
| is a building or volume on any other plan: a flat-roofed block, an L-shaped hall, a kiosk, a round tower, a silo, a well | folded: prism | 4 |
| is walked on, under or into: a deck, a pier, a bridge, stairs, a ramp, a terrace | built ground | 5 |
| lies in the ground: water, a path, a field, a plaza, a rug | printed | 6 |
| has a face and turns to look: the hero, a creature that faces you | figure | 7 |
| moves by itself: sails, wheels, a swinging sign, a bobbing boat | mover | 8 |
| is weather, a flyer, smoke, a wandering creature | life | 9 |

## 1. Card: one printed card on a hinge

`popup(pts, paint, { x, z })` in the 3D harness (`makeCard` + `hinge` in the kit). The default type.

- **Facing card:** omit `yaw` and it faces the camera within +-14 deg (the source game turns its small cards the
  same way). Tufts, flowers, rocks, crates, barrels, signs, critters, far props.
- **Low flap, lean-out** (`mechanisms.md` section 10): things that lie low or lean out from a wall.
- **Backdrop flat** (`mechanisms.md` section 8): far hills, mountains, skylines along the far edge, where the frame's
  top meets the page (`H.groundAt(0, 0.95)`).
- Rules: a chunky silhouette that names the thing at 32 px, a layered print (`procedural-art.md`), never edge-on.

## 2. Layered: parallel cards, depth from one side

| Subtype | Good for | Constructor |
|---|---|---|
| fan pair | bushes, hedges, reeds, a far tree line, a crowd | `fanCard(pts, { paint, rear })`: the piece and a darker mirrored copy just behind, one hinge |
| layered card | bushes, coral heads, flower beds (2-3 layers close together) | `layeredCard([{ pts, paint, z }])`: one hinge |
| clump, cluster | 2-8 DIFFERENT pieces anchored to a corner, a post, a tree foot | separate cards (`mechanisms.md` section 9) |
| stack of sails | hills, dunes, banks, drifts, a skyline, reliefs, crowds in rows | `H.stack(x, z, [{ pts, paint, d }])`: each card on its own hinge, `d` toward the camera |
| dome slices | domes, yurts, mounds, round bushes and caps seen from the side | `H.dome(x, z, { r, h, n, paint })` |

Rules: layers 5-15 % of the height apart (sails ~0.14 H); the back one tallest; each nearer one lower and ~10-15 %
lighter (or darker away from the light), stepped, never alternating; every layer shows its own cut edge. A dome seen
from straight above is a net of gores instead (`mechanisms.md` section 7).

## 3. Slotted: the cross family

Two printed planes slotted together give volume (`mechanisms.md` section 5: why, how to design both planes, common
objects). The family is named by how much of the cross is kept. Top views, the camera below each sketch:

```text
 full (+)       half (T)        half, front      quarter (L)       V-fold
    |              |                               |                 /\
 ---+---        ---+---          ---+---           +----            /  \
    |                               |
 4 arms         3 arms:          3 arms:           2 arms:          2 arms opened
                depth behind     a buttress        a corner         wider: a ridge
```

| Subtype | Good for | Build (3D harness) |
|---|---|---|
| full cross | trees of every kind, palms, cacti, giant mushrooms, tents, posts, lanterns, rockets, coral, flames, balloons | `popup(pts, paint, { cross: true })` |
| half cross | boulders, igloos, shrines, gravestones, statues, a kiosk front: a face with hidden depth behind it | `{ cross: 'half' }` (the half at 0.8 scale, inside the face) |
| half cross, front | signs and crosses on a strut, a tall flat landmark that needs a foot, a porch, a prow | `{ cross: 'half-front', second: { pts, ymax } }` (its own side outline, cut low: a buttress) |
| quarter cross | corners: a ruin's corner, a wall end, a cliff or rock corner, an open book | `{ cross: 'quarter' }` |
| V-fold | ridges: dunes, drifts, banks, rock outcrops (the source game's dunes) | `{ cross: 'quarter', angle: 110-130 }` from an outline highest at the fold (a symmetric hill, a half-ellipse): each wing is then half the ridge, cut square at the fold |
| double cross | one round showpiece seen from everywhere: the great tree of a plaza, a fountain, a carousel | two full crosses 45 deg apart at one spot |
| stacked crosses | a great tree (a crossed trunk carrying a crossed crown turned another way), palm clusters | crosses on crosses |

- Turning: omit `yaw`. A full or half cross turns its main plane ~24 deg off facing the camera, so no plane is ever
  edge-on; a hidden half pointing straight away reads as a spike. A quarter cross turns its opening toward the camera,
  the apex away, as the source game's dune folds do.
- `second: { pts, paint, ymax, scale }` gives the second plane its own side view and print; `ymax` cuts it low, and
  `scale` below 1 keeps a hidden half inside the face.
- Kit: `crossCard(pts, { halves: 'both' | 'front' | 'back', main: 'full' | 'left' | 'right', angle, second })`.
- Not for low things (single cards or fans: from a high camera a low X reads as a blade), not for buildings (section 4).

## 4. Folded volumes: closed shapes

| Subtype | Good for | Constructor |
|---|---|---|
| box fold with a gable | houses, barns, shops, chapels, sheds, stalls | `boxFold({ w, d, wallH, roofH, paints, holes })` |
| prism, flat lid | flat-roofed blocks (desert and city houses), crates and containers, plinths, station modules | `prismFold(footprint, { h, roof: 'flat', paints })` |
| prism, pyramid | kiosks, pavilions, gazebos, hexagonal towers, polygonal tents | `prismFold(ngon, { h, roof: 'pyramid', roofH })` |
| prism, 8-12 sides | round towers, silos, lighthouses, drums, tanks, chimneys, wells (`roof: 'none'`, low) | `prismFold(ngon(10, r), { h, roof: 'pyramid' })`: a cone (`ngon` as in `structures.js`) |
| prism, L or any plan | halls, wings, courtyards; or compose several boxes | `prismFold([[x, z], ...])` (flat lid; pyramids need a convex plan) |
| a dome on a drum | domed halls, observatories, stupas | a low prism and `H.dome` on its lid, or the parallel slices alone |
| arch, gateway | gates, bridges' arches, portals | a card or wall with an arch cut (`holes`), or two prism piers and a curved card |

- Folded, a box lies as a net and a prism flattens like a paper tube (half its perimeter wide); both rise with the
  page and close their roofs last. Put them on the page with `popup(null, null, { node, height, solid })`.
- Doors and windows are `holes` cut through a wall (an entered building needs a real opening and a walk through it,
  `mechanisms.md` section 14); lit panes glow (`H.glowing`).
- Print every wall and the lid: a lid seen from above needs its own print (tiles, gravel, panels, a roof garden).
- Compose for complex buildings: a gable box with a lower prism wing, a prism tower with a crossed lamp on its lid,
  stacked prisms stepping back (a ziggurat, a pagoda), a box on a platform (a stilt house).

## 5. Built ground: walked on, under or into

`platform({ w, d, h, paints, facePts })` (a deck on posts: piers, jetties, stages, balconies, lookouts, catwalks, stilt
floors) and the worked `examples/built-ground.js`: `bridge`, `stairs`, `ramp`, `terrace` (masonry the brief names),
read through `WalkField` (`walk.add`, `walk.block`, `walk.solid`, `walk.wall`). Build it open; the walk reads the
same construction (`mechanisms.md` section 14). `examples/built-ground.js` imports `countryside.js` for its cottage's
prints: copy both files if you import it.

## 6. Printed into the page: regions and water

`H.printGround(({ washes, torn, band, bandOf, ribbon, line, drifts, water }) => ...)` paints the ground sheet:
washes, torn-edged regions, bands along any polyline, marks gathered in drifts. Paths, fields, plazas, rugs and
shadows are printed regions with a pale fibrous fringe (`torn`), never standing cards; leading lines bend twice in
frame.

**Water bodies, any kind:** `water(pts, opts)` prints the rim (a pale torn bank, or a crisp built lip with
`edge: 'cut'`), the water, a deeper middle, marks (`'ripples'` along `flow`, `'cracks'`, `'none'`) and an optional
`foam` line, and returns `inside(x, z)` for `walk.block`. Pass your world's colours (`colors: [water, deep]`, `rim`):
the defaults are a plain grey-blue placeholder.

| Water | Build |
|---|---|
| pond, lake, oasis pool | `water(outline)` |
| river, stream, creek | `water(bandOf(line, half), { rimPts: bandOf(line, half * 1.25), deepPts: bandOf(line, half * 0.45), flow })` |
| sea, coast, bay | a big outline running past the frame, `foam` along the shore; islands stand in it |
| canal, pool, moat, fountain basin | `{ edge: 'cut', rim: <stone> }` |
| frozen pond, ice | pale colours, `marks: 'cracks'` |
| marsh, puddles | several small patches among reeds |
| lava, tar, a magic spring | the same tool in the world's colours, slow ripples, a glowing piece at its edge |

Design ideas for water: it is printed, never a standing card. Its edge tells what it is: a torn pale bank (natural)
or a cut lip (built). Give it a deeper middle tone, ripple marks that are sparse, long and running with the flow, and
foam where waves break. Things ON it float (paper-life `float`: ducks, boats, lily pads printed). Things OVER it are
built (decks on posts, bridges). Things AT its edge make it read (reeds, rocks, a jetty, a creature on the bank).
Reflections are printed marks (the dashes of a lit window), never a mirror render. It blocks the walk. Add water only
when the brief has it (`gallery.md` section 1).

## 7. Figures: things with a face

The hero is a small 3D model of T-crossed parts (a frontal card with a profile card BEHIND it: no line through the
face) that yaws to face the way it walks (`mechanisms.md` section 12, `motion.md` section 8). Creatures are single
cards that flip to turn (`paper-life` `critter`), or small T models when they matter.

## 8. Movers

Rotation about a crease or an axle only, never a scale: spinners (sails, wheels, fans, a water wheel), swingers (a
hanging sign, a lantern: a pendulum), bobbers (a boat: a small roll), flaps that open (a door on its hinge). Drive the
part every step: `H.onStep((t, dt) => sails.rotation.z = t * 0.6)` (`mechanisms.md` section 11, `motion.md` section 7).

## 9. Life

Weather, motes, flyers, flocks, smoke, mist, cloud shadows and creatures with behaviours: `lib/paper-life.js`,
chosen from the environment (`motion.md` section 12).

## 10. Composing types

Worlds are compositions. These show how the types combine; your world composes its own:

- **A lighthouse on a rock:** a 10-sided prism (a flat lid) on a V-folded rock outcrop, a crossed lamp on the lid
  with lit panes, a platform gallery round it, the sea printed with foam.
- **A desert market:** flat-lid prisms (houses), box folds (stalls with awnings as half-front buttresses), crossed
  palms, fan-pair crowds, V-fold dunes beyond, a printed plaza.
- **A reef:** crossed coral and kelp, stacked rock shelves, half-cross boulders, the water as the printed floor, life
  (bubbles rising, fish as flocks).
- **A ruin in a forest:** quarter-cross wall corners, half-cross broken columns, crossed trees, cards of rubble,
  nested sails of moss banks.
- **A space station deck:** prism modules and tanks, platforms as catwalks, crossed antennas and lamp posts, printed
  deck plates, steam puffs.

## 11. Extending, combining and defining your own types

The types above are the ones the source game needed. Your project may need more: extend a type, combine types into a
bigger one, or invent a new type, as long as it keeps the contract below.

**Extend a type** with its parameters and subtypes before writing anything new:
- the cross family: another outline for the second plane (`second.pts`), a low or scaled half (`ymax`, `scale`), a
  wider or narrower V (`angle`), a third plane at another height (a second cross on the first, turned 45 deg);
- prisms: any footprint (a star, a crescent, a stepped plan), any wall prints (a list cycled round the walls), holes
  for doors and windows, a stack of prisms stepping back (a ziggurat, a pagoda, a wedding cake);
- stacks: per-layer turns (`yaw`) for a fanned ridge, layers of different outlines (a skyline), spacing that grows
  toward the back (deep reliefs);
- water: the same tool for any liquid, in the world's colours and edges.

**Combine types** in two ways:
- **Riding another part**, when a piece belongs to it: put it in that part's frame and it rides the part up and folds
  flat with it: `boxFold`'s `userData.ridge` (a chimney, a weathervane, a sign), `platform`'s `userData.deck`
  (anything standing on the deck), `prismFold`'s `userData.top` (a lamp, a dome, a garden on a flat roof), or a frame
  on any part of your own. `popup(pts, paint, { parent: frame, x, z, yaw, order })` gives it its own hinge in that
  frame: pass the yaw (a cross ~0.4 rad) and an order after its parent's, so it rises once its base has (the sampler's
  lamp on a prism's lid).
- **Side by side**, when the parts rise in turn: place them as neighbours with their own `order` (the tower first,
  then its gallery, then the flag), so the build reads as a little choreography.

When a combination recurs in your world, wrap it in a function of your own (`lighthouse(x, z, opts)` composing a
prism, a cross and a platform): it is now one of your project's types.

**Define a new type** when nothing above fits the thing your brief needs (a pleated fan, a spiral stair of card, a
hinged drawbridge, a paper chain, a book that opens into a room). A structure type is a constructor that returns a
`THREE.Group` of cards and keeps this contract:

1. **Made of cards only:** printed cards with thickness, cut, folded, layered or slotted (law 1). No sculpted volume.
2. **Folds flat:** at progress `p = 0` every part lies flat on the page (or flat against its parent) and no part
   passes through another while opening (`mechanisms.md` section 4).
3. **Rises with the page:** it animates its parts in `group.userData.follow(p)` from the page hinge's progress
   (0 folded, 1 open), in phases (walls first, roof last), never on a spring of its own (the planes scissor).
4. **Reads from the camera:** no part edge-on to the camera (turn it, or add a plane), every visible face printed,
   its silhouette chunky.
5. **In hero heights,** seeded, with 4-6 variants per kind.
6. **Walkable if walked:** a walked construction carries the walk-surface contract (`userData.walk`,
   `mechanisms.md` section 14).

```js
// the shape of a new type (the parts and angles are yours): parts on pivots at their creases, opened in follow(p)
function myType(pts, { paint, paper, seed = 1, open = Math.PI / 2, print = {} } = {}) {
  const g = new THREE.Group(), base = { paper, paint, ...print };
  const front = makeCard(pts, { ...base, seed });                      // a part: a printed card with thickness
  const crease = new THREE.Group(); crease.position.x = 1;             // a pivot on the crease it folds about
  crease.add(makeCard(pts, { ...base, seed: seed + 1 }));
  g.add(front, crease);
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  g.userData.follow = (p) => { crease.rotation.y = -open * sm(0.2, 0.8, p); };   // flat at p = 0, open at 1
  g.userData.follow(1);
  return g;
}
H.popup(null, null, { node: myType(outline, { paint, paper: H.paper, print: H.cardOpts(x, z) }), x, z, height: 4 });
```

Prove a new type on the test card (folded, mid-rise, settled, from two or three views) before the world uses it, and
write it into the paper spec's TYPES line with its top view, what it is for, and its constructor, so the rest of
the world (and anyone who edits it later) uses it the same way.

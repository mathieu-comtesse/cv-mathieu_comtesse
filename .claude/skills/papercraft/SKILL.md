---
name: papercraft
description: >-
  Builds games, interactive scenes, web pages, animations and videos in a handcrafted pop-up book papercraft style,
  for any subject (a Mars base, a reef city, a village): printed cardstock pieces with thin cut edges that fold up on
  hinges from a printed ground, soft layered shadows coloured by the world, a tilt-shift macro lens, calm hinge motion and soft paper
  sounds, built in the browser with three.js or Canvas/SVG/CSS and no image generation needed. Use when something
  should look, move or sound like paper or card (pop-up, papercraft, paper diorama, cut-out, made of paper,
  handmade, storybook). Not for real folding instructions, printable craft patterns, or paper as in documents.
license: MIT
compatibility: Templates and kit run in any modern browser (three.js r187 via CDN). Scripts need Python 3 with numpy and Pillow. Image generation is optional.
metadata:
  author: xikhar
  version: "0.5.0"
---

# Papercraft

One style, any subject: a pop-up diorama seen from inside. Illustrated cards, printed with ink on fibrous cardstock
and cut out, stand up from a printed ground on hinges; they rise with a springy overshoot and settle, cast soft
shadows, coloured by the world, on the ground and on each other, and are seen through a long macro lens looking down into the world, with a
shallow tilt-shift focus band, as if a real paper model were photographed. Everything here comes from a shipped
browser game in this style and was paid for in critic rounds and user feedback; the numbers are starting points that
held up, not decoration. The brief always wins over these defaults.

This skill teaches a method: what makes the style read, how to construct and print any piece, how to light, frame,
move, animate and check it. The prompt and the user's references decide the world: its palette, ground, buildings,
creatures and weather. You write its pieces yourself. `references/gallery.md` (images in `assets/gallery/`) shows five
briefs the source game turned into five worlds that share nothing but the style: look at it for the quality bar and
the range, never for content. The code in `assets/` is plumbing you may import (paper, cards, the layered print,
hinges, light, lens, the walk field, life) plus worked examples from one countryside world to read, never a catalogue
of parts.

## 1. The material model (what makes it read as paper)

Get these right on every run; each line says why. Details and more numbers live in `references/look.md`.

1. **Everything is a flat sheet with thickness.** Form comes only from cutting, folding, layering and slotting, never
   from sculpted volume. Card thickness 1.5-3 % of the hero's height. A zero-thickness plane reads as a sticker, a
   thick one as foam board. Every piece is one of a few STRUCTURE TYPES, or a composition of them
   (`structures.md`): a card, layered cards, the cross family (full, half, quarter, V-fold), a folded volume (a box
   or a prism on any plan), built ground, the printed page. Extend them, combine them, or define your own when the
   project needs one (`structures.md` section 11). Volume comes from crossing: anything upright and round
   the hero walks around (trees, palms, cacti, posts, tents) is two printed planes slotted at 90 deg; low things
   (grass, bushes, rocks) are single or layered cards facing the camera.
2. **Dead matte.** Diffuse light only, soft terminator (wrap ~0.3), no specular, no reflections, no gloss. Clipped
   pixels under ~1 % (only small lit panes may clip). Any sheen at grazing angles reads as plastic or wet.
3. **One warm low key, soft coloured shadows.** Key from the side, 45-65 degrees off the camera axis, 45-55 degrees
   up (20-35 only at golden hour and dusk) and a little toward the camera, so shadows fall sideways and behind, where
   the camera sees them. A frontal fill at ~1/4-1/3 of the key keeps
   camera-facing cards from going grey. Shadows are crisp where a card meets the ground and widen with the gap
   (penumbra ~0.2-0.3 x gap). Their hue comes from the world: a warm amber on warm ground by day, lilac-blue on snow,
   a deep teal under water, navy at night. Never grey or black shadows,
   never a coloured fog or filter over the frame. Every standing piece visibly touches the ground (contact
   darkening); check the shadows with the key alone (`look.md` section 8b).
4. **Every print is a small layered paper collage.** Inside each chunky silhouette: 3-5 inks in 3+ value steps plus
   one ornament, laid as cut layers back to front on a base sheet with one quiet fibre (never plush felt or a weave):
   structure first (limbs, tiers, shingle rows, frames, panels, a band), then bold motifs that CONTRAST with the base
   (leaves and petals, rivets and panel lines, scales, scallops, stripes, windows). Every layer drops a short soft
   warm shadow on what lies under it and shows a thin pale lip on its lit edges; big layers also an even pale cut
   edge. That pair is what reads as layered paper instead of a vector fill. Nothing bare, thin or spiky: no line
   under ~2-3 % of the piece, motifs big and countable (a tree crown: 15-25 leaves, each ~1/7 of its width). Printed
   illustration was the source project's biggest quality jump. Kit: `P.layer`, `P.parts`, `drawnPiece`, `P.marks`,
   `P.rim`.
5. **The cut edge.** A thin dark-brown line right at the silhouette (the card's thickness and printed outline, ~1.5-2.5
   px on screen), and a pale highlight just inside it only on the edges that face the light. Never an even pale or
   white band all round (a sticker halo), never glowing, never torn. A fold is not a cut: hinge bases and panel joins
   get no edge. No card is ever seen edge-on as a knife-thin sliver.
6. **A macro lens looking down into the world.** Long lens (24-32 degree vertical FOV), camera 40-55 degrees down, and
   the printed ground runs past every edge of the frame: no horizon, sky, backdrop, book edge or table in view (unless
   the brief is literally a book or a page inside a UI). One sharp band across the hero's scene (~36-45 % of the
   frame looks crisp; `measure.py` focusHeight reads ~0.55-0.75, the source game's frames 0.67-0.72), blur growing
   above and below to 12-18 px radius at 1080p, driven by depth as well as screen height. Big
   blurred pieces overlapping the bottom edge sell the miniature scale.
7. **The brief's own palette, built the paper way.** Derive the colours from your subject, mood and time of day
   (`palettes.md` section 3): never the example scene's or the gallery's hexes as they are (blind tests copied
   the example's roofs and greens into a space station). What stays: one lead family the pieces carry, on a pale,
   muted ground (~0.16-0.22 brighter and ~0.16-0.25 less saturated than the cards; a dark floor the brief names,
   black sand or night water, is darker instead, with the pieces lighter than it), so the pieces carry the
   colour; every piece has one or two accents that contrast with its base (cream rivets on a rust dome, red leaves on
   an orange tree), never tone-on-tone. Muted paper greens (the gallery's spring ground is a fresh yellow-green, its
   forest a deep moss), never saturated video-game green; cream instead of white, a dark ink instead of black.
   Saturation follows the world: ~0.55-0.75 in a colourful brief, far lower for snow, mist or fog (the gallery's
   snow measures ~0.15). The grade warms written colours: author grounds and water a step bluer and greyer and check
   the frame (`measure.py --palette`).
8. **Dense, chunky, readable.** A full model world, not props on a plain: 100-250 pieces of ~20 kinds in frame (a
   crossed tree or a stacked bush is one piece; the source game's gameplay frames hold ~270-320 standing CARDS:
   `__papercraft.cards()` counts yours in 3D) in tight groups of 4-8 DIFFERENT pieces (a reef: a coral head, sponges, kelp, a fish; a station:
   crates, a pipe run, a lamp, a robot), at most ~3 identical props in view, the sharp band packed (`measure.py` barePct <= ~55) and the open ground
   mostly outside it (its leading line and a few clearings; water only if the brief has it). The ground stays flat: height comes from nested parallel cards
   (3-5 curved sails stepped ~10-15 % in value: hills, dunes, banks, drifts) and outcrops, never a raised block of
   terrain (`mechanisms.md` section 8). The hero is the scale figure (3.6 units in 3D, ~3.2 in 2D; a place-only brief
   keeps a few figures), 6-10 % of the frame height: a small 3D paper MODEL (~10-20 cards) that reads from every side
   and turns to face the way it walks, limbs swinging with the distance walked, never one flat card; a readable face,
   costume detail, toy proportions, colours that contrast with the ground, in the sharp band (`mechanisms.md`
   section 12, `motion.md` section 8; in 2D a puppet of cards that mirrors to turn). Pieces are chunky against him (`worlds.md` sections 8-9); tall landmarks are
   layered flats cut by the top edge, unless their top is the point (a crater, a spire): then nearer and toy-scale,
   top in frame. The dressing comes from what the place would hold; counts the brief gives hold ("a few" = 2-4).
9. **What is walked on, under or into is BUILT in 3D, never a standing flat.** A standing card is only for things
   seen from the front and walked around (bushes, props, critters, far backdrop hills; trees are crosses, law 1). Walkable height is an
   OPEN construction: a deck on posts, ramps with a crown panel between leaning sides, thin treads on stepped
   stringers (rise <= ~1/8 of the hero), never a solid block for natural terrain. Anything entered is a box fold with
   an opening; floors, water and regions are printed into the page. The walk logic reads the same construction: feet
   on the deck; rails, walls and water stop the hero (`WalkField`, `mechanisms.md` section 14).
10. **Paper moves by rotating about creases.** Rise fast with 8-15 % overshoot and a 2-3 cycle quiver, still by ~1 s;
   fall softer with one small slap on the ground; stagger parts 0.05-0.1 s; nothing scales, stretches or fades in.
   Continuous motion (idle sway, walk bob) stays subtle: users cut critic-requested bob by 2-3x.
11. **Sound, if any, is soft, low, dull and sparse.** Noise-based flaps, one per gesture, at least ~0.5 s apart.
12. **The world is alive, with the brief's own life.** Choose 3-5 kinds from the environment and the time of day:
   its weather (leaves, snow, petals, rain and mist, dust and gusts, bubbles), its flyers (birds crossing above the
   trees, butterflies at flowers, fireflies over water at night), smoke curling from chimneys, cloud shadows, and
   creatures with a behaviour (they graze, peck and scatter, bound away from the hero, float, perch). All of it paper,
   small and slow, moving while the hero stands still (`motion.md` section 12, `lib/paper-life.js`).

## 2. Before code: write the paper spec

Write this block into your plan (or a comment at the top of the main file) and fill every line with numbers. Then
audit it: "would I write this exact spec for any similar prompt?" If yes, push the palette, printed motifs and
silhouettes toward the subject's own world (a Mars dome: rust and oxide cards with printed rivets; a reef: coral and
kelp with scalloped edges). Everything changes with the subject (silhouettes, prints, palette, light, structure
types, what the hero walks on, layout, life, sounds) except laws 1-12. `gallery.md` takes five briefs through it.

```text
BRIEF      the prompt's place, culture, season, weather, time, scale and mood words; must-haves and must-nots; each
           user reference and what it gives (palette, materials, motifs, light, density, motion)
SUBJECT    the world and its twist (what only this project has), and what the reader looks at first
STOCK      paper per layer (cardstock / kraft / watercolour / construction / tissue / corrugated), fibre amount
PALETTE    4-7 hex DERIVED from this brief (palettes.md section 3), with roles: ground light/dark, lead family,
           2 contrasting accents, ink, shadow tint, haze; none copied from the example
LIGHT      key colour + direction (azimuth / elevation deg), frontal fill ratio, shadow tint, night / practical lights
LENS       fov, pitch (40-55), sharp band % of frame, max blur px@1080, what overlaps the bottom edge
GROUND     what this world's floor is made of and its own features (deck plates, sand ripples, snow drifts, moss,
           tiles); water only if the brief has it
LAYOUT     the subject's own leading line (a lane, a corridor, a current, a ski run, a channel), landmarks, hero
           position, groups and clearings, kinds of pieces (15-25)
MOTION     mechanisms used, rise / fall timing, stagger, idle sway amplitude, camera behaviour
LIFE       3-5 kinds from the environment (weather, flyers, smoke, creatures and their behaviours), day / night
TYPES      the structure types this world uses for each kind of piece, and any it extends, combines or defines
SOUND      none | flaps + steps (+ music); levels
BANNED     the tells (`look.md` section 12) + anything this piece must not become
QA         the frames / sizes you will capture and what each must show
```

## 3. Pick the build path

Read only what the task needs, when it needs it (all files in `references/`). The minimum before the first frame:

- **3D scene or game:** start from `assets/templates/popup-3d/` (`harness.js` as is + your own `scene.js`); read
  `gallery.md` 1, `structures.md` 0-4 (they point into `mechanisms.md` for details), `three-js.md` 1, 3, 8,
  `procedural-art.md` 3, `look.md` 8b, 11, `palettes.md` 3, and for a walking hero `mechanisms.md` 12, 14.
- **2D scene, illustration, side-scroller:** start from `assets/templates/popup-2d/` (`harness-2d.js` as is + your
  own `scene.js`); the same reading with `web-2d.md` sections 2-3 instead of `three-js.md`.
- **Web page or app UI, HUD, menus:** `paper-ui.md`, `web-2d.md` sections 4-5 (CSS and SVG), `palettes.md` 3.
- **Video:** `motion.md` section 11, then the 2D or 3D path and its `step()` capture.
- **A non-browser engine** (Godot, Unity, Unreal, Blender): `engines.md` (porting notes, untested) and
  `scripts/paper_textures.py` for texture files.

Then, as questions come up:

| Question | Read | Kit |
|---|---|---|
| Your pieces: props, characters, buildings, creatures, machines, plants | `procedural-art.md` | `printCard` + `P.layer` / `P.parts` or `drawnPiece` |
| Which structure type builds a thing (trees, rocks, buildings, water, ridges, domes...) | `structures.md` | `structures.html` sampler; `crossCard`, `fanCard`, `prismFold`, `H.stack`, `H.dome`, `water` |
| Your constructions in detail: crosses, box folds, platforms, layered flats, bridges, piers, stairs | `mechanisms.md` (14: built ground) | `hinge`, `crossCard`, `layeredCard`, `boxFold`, `platform`, `WalkField` |
| Timing, springs, puppets, camera | `motion.md` | `FlapSpring`, `windSway`, `FixedClock` (`lib/paper-motion.js`) |
| Endless worlds, a camera that follows the hero, composition | `worlds.md` | the fill in the example `scene.js` |
| Seeing the range; turning a prompt and references into a world | `gallery.md` | `assets/gallery/*.jpg` |
| Weather, flyers, smoke, creatures that move | `motion.md` (12: a living world) | `lib/paper-life.js` |
| Colour; sound and music | `palettes.md`; `sound.md` | `assets/lights.json`; `lib/paper-sound.js` |
| Planning, measuring, critiquing, finishing | `process.md` | `scripts/measure.py`, `scripts/ab_sheet.py` |

**Write your own pieces.** `assets/lib/` is plumbing to import (copying it: `three-js.md` section 1, `web-2d.md`
section 3): the structure types' constructors take YOUR outlines and prints. Every THING in your world you design for
your subject. `assets/examples/` and the templates' scenes are one countryside world: read them to see how a recipe
becomes code, never assemble a new subject from those parts; replace the scene, keep the harness.

## 4. Workflow

1. **Brief, references, spec.** Read the prompt and every reference the user gave the way `gallery.md` section 1
   does, look at the gallery world closest to it and one far from it, then fill the paper spec. If you have one
   target image (user-supplied or generated), measure it with `scripts/measure.py`; otherwise the spec is the target.
2. **Prove the material on one test card** before building content: one printed card standing on a printed ground,
   under the final light and lens (3D: `?test`, once your scene branches on `H.flags.TEST`: `three-js.md` section 1).
   Check: matte, a contact shadow in the world's colour, the cut edge (dark line + lit-side highlight), fibre visible but quiet, sharp
   band and blur where expected. Fix here; every later asset inherits it.
3. **Design and build your pieces, then the world.** List the 15-25 kinds of piece your subject needs and design each:
   silhouette (chunky, convex lobes, flat base), structure type (`structures.md` section 0) and print (law 4,
   `procedural-art.md` section 3); the hero as in law 8. Prove two or three kinds on the test card, then landmarks and the leading line by
   hand, then the fill of groups and clearings (law 8). Build what the hero walks on, under or into first (law 9) and
   wire its walk surface (`WalkField`) before dressing around it.
4. **Motion.** Hinges and springs from `motion.md`. Rise in flat-stack order: the card lying on top when folded rises
   first (3D cards fold back, so the nearest first; 2D cards fold forward, so the farthest first), staggered; closing
   is the exact reverse.
5. **Sound** (optional) from `sound.md`; keep it quieter and sparser than feels necessary.
6. **Capture deterministically.** Seed every random choice and drive motion from a fixed-step clock, never wall time.
   Both harnesses expose `restart()` (everything flat, t = 0), `step(seconds)` and `resume()`; every review frame is
   `restart(); step(T)`, never a grab of the free-running loop. Capture the settled hero frame, a mid-rise frame and
   a wide frame.
7. **Measure, then critique.** `python scripts/measure.py frame.png [--target target.png]` is a gate, not proof
   (profiles `storybook` by day, `dusk` for golden hour and dusk, `night`, `flat`; `process.md` section 6). Then
   compare blind against the target (`scripts/ab_sheet.py`), fix the top three problems, and repeat at most three
   rounds (no target: judge by section 7 and `look.md` sections 11-12). Refine rather than add. With a time box, reach the
   first full frame by half of it and spend the rest on these rounds (stopping at the first frame left stamped
   clones, straight ground edges and an empty middle).
8. **Report honestly** what was verified (with the frames) and what was not.

## 5. Fake-paper tells (ban list)

The tells that make a frame read as CG instead of paper, each with the fix that worked, are in one list:
`references/look.md` section 12. Read it before the first review round and again before you report.

## 6. Starting values

Every number that held up (thickness, print layers, step sizes, light, shadow tint, lens, grade, flap timing, sway,
sound) is in one table: `references/look.md` section 11; density and sizes against the hero are in
`references/worlds.md` sections 8-9.

## 7. Check the render

After every visual change, capture the same frames and look at them at 100 % and at 3x crops (3D:
`python scripts/capture.py <project> overview midrise key walk=...` serves, captures, walks and reports the build and
every page error):

- [ ] Ground past every edge; no sky, horizon, table or book edge; the camera 40-55 degrees down.
- [ ] A full model world: groups of different chunky pieces, the sharp band packed (barePct <= ~55), open ground
      mostly outside it, a leading line, the hero off-centre, big blurred pieces at the bottom edge.
- [ ] Upright round things are slotted crosses, both planes printed, none edge-on; low things are single cards facing
      the camera.
- [ ] No stamped repeats: 4-6 seeded variants per kind (outline, size +-15 %, print), twins 3+ piece-widths apart,
      no open patch over ~1/6 of the frame without a group.
- [ ] Palette, ground and leading lines are this brief's (and its references'): no colour from the example or the
      gallery, no river or wash formula unless the subject has them (a renamed river is the same leak), one leading
      line unless it has two routes; muted paper greens, cream whites, dark inks, no colour fog.
- [ ] No straight ground edge over ~15 % of the frame width: leading lines bend twice in frame, region borders are
      torn with a pale fibrous fringe; the middle gets volume from nested landforms (3-5 cards stepped in value).
- [ ] The hero is a 3D paper model that reads from every side and turns to face the way it walks: striding limbs, a
      readable face, costume detail, toy proportions, colours that contrast with the ground.
- [ ] Nothing glossy; under ~1 % clipped pixels; the darkest 20 % take the world's shadow colour, never neutral grey.
- [ ] A contact shadow under every standing piece; cast shadows where the camera sees them; camera-facing cards not
      grey.
- [ ] Cut edges: a thin dark line and a pale highlight on the lit side only; no halo, no edge-on slivers, no
      stair-stepped edges, nothing along folds.
- [ ] Every print a layered collage (3+ values, lip + short shadow, an ornament, a contrasting accent) designed for
      this subject; never a flat fill, a thin ink drawing or a fill with noise, never a countryside example.
- [ ] Everything walked on, under or into is built open and walked by the hero: feet on the surface, never inside a
      rail or floating; water and walls stop him.
- [ ] One sharp band across the subject (~36-45 % of the frame looks crisp; focusHeight ~0.55-0.75), top and bottom
      blurred; nothing important blurred,
      the hero always inside it.
- [ ] Motion: hinge rotation only; one overshoot, settled by ~1 s; nothing pops in. Sound (if any) quieter than the
      music, never constant.
- [ ] The world is alive with its own life: 3-5 kinds from this environment (weather, flyers, smoke, creatures with
      a behaviour), small and slow, never filling the air; a still frame shows a few of them.

## 8. Gotchas

- **Clock, fps, build cost:** clamp the real-time step to [0, 0.05] s (a negative step runs every spring
  backwards); measure fps in the live loop, never by timing `step()`; a layered print costs ~10-30 ms
  (`three-js.md` sections 8-10, `web-2d.md` section 3).
- **Image generation is optional** (`image-gen.md`, when available and allowed). Never block on it; everything in
  this skill is reachable procedurally.
- **Taste comes from a human.** Metrics and critics push toward more (more bob, more sound, more detail); the owner
  of the source project kept asking for calmer, quieter, subtler. When in doubt, take something away.

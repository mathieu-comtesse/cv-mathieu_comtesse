# Process: from brief to a convincing paper piece

The working method behind a shipped, well-received pop-up game, generalised for any brief and medium (game,
animation, interactive scene, web UI, video) and sized for one agent working alone or a small team.

Read this when: you start a new piece in this style (before writing content code), and again whenever you capture,
measure, critique, fix, or decide whether to stop.

Contents
0. The loop at a glance (solo or small team)
1. Write the style card first
2. Pick ONE target and measure it
3. Build the paper kit on a test card
4. Content: printed illustration inside chunky silhouettes, early
5. Deterministic capture
6. Measure: a gate, not proof
7. Critique and fix: blind A/B, one round per pass, one fixer
8. The owner's taste beats critics (rules, anti-patterns and fixes)
9. Prompt templates
10. Final self-review checklist

Paths are relative to the skill folder. Precedence when sources disagree: the owner's explicit word > style card >
target > other references > critics > metrics.

---------------------------------------------------------------------------------------------------------------------

## 0. The loop at a glance

| Step | Output | Time box (solo) | Gate before moving on |
|---|---|---|---|
| 1 Style card | one page, owner decisions marked LOCKED | 10-15 min | the owner could approve it in one read |
| 2 Target | one image (or a written target) + its numbers | 15 min | `measure.py` run on it, conflicts with the brief resolved |
| 3 Paper kit | material + cut edge + shadow on one test card | 30-60 min | looks like card at 1:1, at play distance and at 6x zoom |
| 4 Content | every hero asset, printed, in its final framing | the bulk | no bare flat colour, nothing edge-on |
| 5 Capture | review-set stills, motion sheets, video | 15 min to set up | two runs give identical stills |
| 6 Measure | PASS/WARN table per shot | minutes | all PASS, or each WARN explained |
| 7 Critique + fix | ranked defects, one fixer pass | 30-90 min per pass | old-vs-new judge prefers new (or "same") |
| 8 Owner review | images / short clip shown, decisions logged | - | the owner's eyes and ears, never a critic's |

Sizing:
- **Solo:** do the steps in order. For step 7, spawn fresh critics if you can (they must not share your context). If
  you cannot, make the blind sheet, write your verdict before opening the key, and say so in the log.
- **Small team (3-6 agents):** scaffold first: every module exists as a running stub with its final API. Freeze shared
  conventions (units, axes, hinge convention, palette roles) in one contract file. One owner per file; tunables in
  per-owner config sections. Owners never edit each other's files; they write "Request to <owner>" in the log. One
  integrator re-runs everything together, alone, after each pass (self-reports go stale: "not measured", "looked fine
  in the editor").
- **Always:** keep an append-only log (owner inputs, decisions, numbers, status) and re-read it after any context reset.
  Every entry has the same shape: built / assumptions / measured (target, value, status) / known weaknesses / requests.
  Tag a snapshot after every pass that improves, so anything can be reverted. Every feature gets an on/off switch.
  Status replies say elapsed time, what is done, what is left, and show an image.

### The one-hour version

When the budget is about an hour, keep the order and shrink each step: spec (5 min) -> test card under final light and
lens (10; `?test` in the 3D template) -> content with printed art and clusters (25) -> hero + mid capture, each
`restart(); step(T)` on a `?capture` page (5) -> `measure.py` and one honest look at 3x crops against the checklist in
SKILL.md (10) -> fix the top three (5). Skip the blind A/B round; say in your report that it was skipped.

## 1. Write the style card first

First read the prompt and every reference the user gave the way `references/gallery.md` section 1 does, and look at
the gallery world closest to the brief and one far from it: the quality bar and the range, never content.

One page, written before any content code. Every agent prompt and every critic gets it. The style card is the paper
spec of `SKILL.md` (section 2), filled in with numbers, plus three lines: the medium, the owner's locked decisions and
the review set (the spec's GROUND line names this world's floor; the flat page and open built ground are
`SKILL.md` laws 8-9). Keep one card, not two:

```
MEDIUM      <game | animation | interactive scene | web UI | video>, <aspect, frame size, length>
LOCKED      <owner decisions, verbatim, dated>
REVIEW SET  <named shots: hero, close-up, wide, mid-motion, night ...> at <seed>, <camera>, <size>
```

Starting values for the spec, for any subject (it changes the palette, light preset, silhouettes, motifs and layout):
- Light: from the brief's preset in `assets/lights.json` (`references/palettes.md` section 4): key 45-65 deg off the
  camera axis and 45-55 deg up (20-35 at golden hour and dusk), a frontal fill from the camera side at ~0.3 of the
  key in the preset's colour; soft, short shadows coloured by the world (warm amber on warm ground by day,
  lilac-blue on snow, teal under water, navy at night), never grey or black; lit panes and warm lamp pools at dusk
  and night.
- Lens: long lens (fov 24-32) looking down 40-55 deg, the printed ground past every edge (no sky, horizon, table or
  book edge), the sharp band ~36-45 % of the frame height on the hero's scene, big heavily blurred cards along the
  bottom edge, the hero 6-10 % of the frame height and off-centre. UI and print: flat, no lens.
- Palette: 4-7 hexes with roles and an area budget; a lead family with 1-2 contrasting accents on every piece; the
  ground ~0.16-0.22 brighter and ~0.16-0.25 less saturated than the cards; saturation as rich as the world (~0.55-0.75
  in a colourful brief, far lower for snow, mist or fog); a constant or two that keep it one world (the
  countryside's: red-brown wood, warm windows). `references/palettes.md`.
- Layout: the world's own leading line, landmarks, groups and clearings, water only if the brief has it; density and
  grouping as in section 4 (Composition). `references/worlds.md`.
- Motion: hinges only (rotate, overshoot 8-15 %, settle 0.6-1.1 s, a small quiver); a calm camera.
  `references/motion.md`. Sound: quiet, sparse, low-passed, one sound per gesture; soft low music or none.
  `references/sound.md`.
- Out of scope (the spec's BANNED line): gloss, neon, black outlines, UI chrome, text and logos, a horizon, sky, table
  or book edge in frame, anything a real paper object could not do.

Rules: name the mechanisms so the construction stays explainable (critics flag anything whose construction
they cannot read: "nothing explains how they stand"); describe light and lens in words AND numbers; list what is out
of scope, because critics will ask for it.

## 2. Pick ONE target and measure it

One concrete target beats a mood board; the gallery (`references/gallery.md`) is the quality bar, never a content
target. In order of preference:
1. An image the owner picks or supplies.
2. An image generated from the build's own screenshots ("this world, in this exact visual language, but better").
   It stays reachable. Idealised targets generated from words alone could not be matched: blind critics picked the
   build as the imitation in 25 of 26 trials, and the "fool the critic" loop could not end on its own.
3. Real photos of paper objects, for material truth only (edge width, penumbra, fibre). They are trivially identified
   as "the original" by context (hands, sleeves, printed titles), so never use them as the blind A/B reference.
4. No images allowed or available: a **written target**. The style card, the reference numbers in step 6, and a palette
   list. Measure your renders against it with `--palette`, and judge them against the card.

Then:
- Resolve conflicts between target and brief in a small table (paper type, mechanism, camera angle, depth of field,
  any third-party content), and log the resolution. A target is for look, never for content: no copied subjects,
  text or logos.
- Measure it: `python scripts/measure.py target.png --json target_metrics.json`. A written palette:
  `--palette "#hex,#hex,..."`.
- Run a **gaps pass**, the most actionable measurement of the project. Shoot your build at the target's pose. Make
  equal-height target|build crops per object class (your subject's classes; in the countryside: house, tree, ground,
  path, water, hero, edges). Take box medians and ratios: hero height / frame height, shadow / lit luma, ground / card
  luma and saturation, leading line / ground luma, corner / centre luma, pieces counted in the sharp band. Rank the
  gaps by visibility, give each ONE owner and a measured "Do:" line, and end with "what already matches (do not break)".
  Typical first gaps (countryside): cast shadow 0.35-0.59 of lit vs 0.7-0.87; corner/centre 0.39 vs 0.61; path/ground
  1.02 vs 1.25; an even pale rim round every piece vs a dark cut line lit only on its key side.

## 3. Build the paper kit on a test card before any content

One card (better: three layered cards and one fold) on a ground or page, under the final light and lens, and nothing
else. The 3D template's `?test` shows your scene's test cards this way (the bundled scene puts its hero, a tree, a
bush, a rock and a box house there). When the brief has anything walked on, under or into, put a construction or
two of it in the test as well (a deck on posts, stairs, a bridge) and walk them (`?test&walk`). Start from
`assets/lib/paperkit-3d.js` or `assets/lib/paperkit-2d.js`, or from a template: `assets/templates/popup-3d/` (in-world
framing, ~390 hinged pieces from a noise fill) or `assets/templates/popup-2d/` (Canvas 2D, pitched orthographic in-world
view). Engine specifics: `references/three-js.md`, `references/web-2d.md`, `references/engines.md`.

| Part | Get this right on the test card |
|---|---|
| Material | diffuse only (no specular, no sheen); soft terminator (wrap ~0.3); shadow side tinted with the world's leak colour, never black |
| Fibre | fixed to the surface (it moves with a folding flap); two octaves (broad mottle + fine tooth) plus a sparse layer of crisp strands; per-sheet tone variation +-4-6 % (`makeCard` `tone` 0.04; `references/look.md` section 2); screen grain, if any, under 0.01 |
| Cut edge | a thin dark-brown line at the silhouette (~1.5-2.5 px on screen) + a pale highlight just inside it only on the edges facing the light (up to ~1.5 % of hero height, constant WORLD width), both from `P.rim()`; anti-aliased, no stair steps; no edge on folds (`makeCard({ folds })`); never an even pale band all round, never glowing or torn, never a second shader / post rim |
| Thickness | a 1-2 px side face on standing card; inner layers get their own cut edge and a 1-2 px shadow |
| Backs | printed on crosses and the hero (`crossCard`'s default back is `'mirror'`); kraft with slight show-through on cards seen only from the front |
| Shadows | tight darker contact line at every hinge / foot (0.6-0.7 of lit luma), then a soft cast shadow falling sideways and behind (0.7-0.87 of lit), tinted with the world's colour and more saturated than the ground: warm amber on warm ground by day (leak `#a0602c`), lilac-blue on snow, teal under water, navy at night; never grey or black |
| Light | key 45-65 deg off the camera axis, 45-55 deg up; a frontal fill from the camera side at ~0.3 of the key, so a card facing the camera is not grey |
| Pipeline | author albedo only; do light falloff, haze, AO, edge line, depth of field and grade in ONE post pass so every asset inherits them |

Check at 1:1, at play distance, and as a 6x crop (stair steps, halos). Then run `measure.py` on the test shot and read
only the material rows (a lone card on a page will fail the density rows, `flatPct`, `barePct` and `printDetail`,
and maybe the lens rows): `toothRms` 0.010-0.025, `shadowWarmth` >= 0.06 on warm ground (snow and water shadows: by eye),
`highlightWarmth` >= -0.03, `clipPct` under 1 %.

## 4. Content: printed illustration inside chunky silhouettes, early

This was the single biggest quality jump: one 33-minute pass that put illustrated print inside every cut silhouette
won a blind old-vs-new comparison 6 of 6 (wow 4.7 -> 6.3), after 7.7 hours of critic loops on flat-colour cut-outs had
barely moved the score. Do it in the first content pass, not as polish.

The rule for every piece: a chunky, simple, rounded silhouette cut from thick fibrous card, the cut edge (a thin dark
line, a pale highlight on its lit side, nothing on folds), a layered print inside with 1-2 contrasting accents, a
soft short shadow under it. Nothing is a bare flat colour, nothing is thin or spiky, nothing has an even pale halo or
a heavy outline. The classes below are the countryside build's: map each to your subject's nearest
analogue (a tall landmark piece = a tree, a coral fan, a mast; a low mound = a bush, a sponge, a crate stack; a box
fold = a house, a hab module, a market hall).

- **Print:** every print is a small layered paper collage (`P.layer`: each part with a lit-side lip and a short soft
  shadow), 3-5 inks in 3+ value steps plus one ornament, motifs that contrast with the base, dark accents ~8-16 % of
  the sharp band by day, one quiet fibre (no plush felt or weaves). The countryside's vocabulary: scalloped shingle
  rows with a pale lip; 4-pane windows lit warm (by day too); plank doors; tree crowns of 15-25 fat leaves ~1/7 of the
  crown's width plus berries or flowers in contrasting accents (`accentsFor(base)`); bush cards with a darker
  scalloped outer band around an inner panel of motifs; stone blocks with pale mortar; wood grain. Find your
  subject's own motifs the same way (rivets and panel lines, scales and pores, frost ferns). Without image
  generation: `references/procedural-art.md` (it counts these against the shipped prints). With it:
  `references/image-gen.md` (generate sheets in the target's style, curate, budget one regeneration, always look).
- **Design for the camera:** pick each kind's structure type from `references/structures.md` section 0, and let
  nothing be seen edge-on: single cards face the camera (+-14 deg when yaw is omitted); low things (grass, bushes,
  flowers, rocks) are single or layered cards facing the camera, never crosses; anything upright and round that is
  walked around is a full cross, its main plane ~24 deg off facing the camera; buildings are box folds or prisms,
  never a single facade card; ridges are V-folds, the apex away from the camera and the mouth closed by a low card;
  fanned pairs only for things seen from one side.
- **Layers per piece:** tuft 2, bush 3, tree 2 crossed cards + print, house a box + 4-6 parts, animal 2-3, prop 2-4.
  The hero is a small 3D paper model (~10-20 cards: every part a frontal card with a profile card BEHIND it, legs
  and arms on hip and shoulder pivots, the back printed) that yaws to face the way it walks; in 2D a puppet of cards
  that mirrors. Its face reads in every mood; costume detail and colours that contrast with the ground; headgear and
  carried items only if the character's design has them; it stands in the sharpest rows, never one flat card. Design
  the character for your subject (`references/mechanisms.md` section 12).
- **Scale relations matter more than absolute size:** hero 6-10 % of frame height; every kind at its ratio to the
  hero by role (`references/worlds.md` section 8); human-scale props and small creatures inside the groups.
- **Ground and height:** the ground stays flat. Hills are nested hill cards, rock outcrops are clusters of tall
  slanted two-tone cards, and everything the hero walks on, under or into is an open construction (`SKILL.md`
  laws 8-9; `references/mechanisms.md`): build it and wire its walk surface before dressing around it.
- **Composition:** 100-250 pieces of ~20 kinds (15-25) in frame (a crossed tree or a stacked bush counts as one
  piece; the source game's gameplay frames hold ~270-320 standing cards, which the 3D template's
  `__papercraft.cards()` counts) in groups of 4-8 different pieces around an anchor, repeats varied in size, hue and
  turn, at most ~3 identical props in view; the sharp band packed (measure.py barePct <= ~55), the open ground mostly
  outside it (clearings of at least 2 hero heights, the leading line, water only if the brief has it); one curving
  leading line of the subject's own by default (a lane, a corridor, a current, a ski run); the hero off-centre; no
  group stamped twice; fences enclose something; paths connect doors; every frame holds one small story; 2-4 big,
  heavily blurred pieces along the bottom edge for depth. More in `references/worlds.md`.
- **Motion:** rotation about visible hinges only, plus a small flex; no scaling, stretching or fading in, except the
  pop, flip and shrink-away verbs for small things (`references/motion.md`, the allowed exceptions to "nothing
  scales"). `references/mechanisms.md`.

Gates: `barePct` (the share of 32 px blocks in the sharp band with almost no edge) at most ~55; it WARNs above 58,
and the shipped frames sit at 44-56. `flatPct` (bare flat area inside the sharp band) at most 70: the shipped frames sit at 35-60 %,
an early template scene with large empty page areas at 84 %.

## 5. Deterministic capture

Nothing can be compared, measured or reverted if two runs differ.
- **Clock:** simulation reads a seeded RNG and its own time; never `Math.random`, `Date.now` or wall-clock time in
  simulation code. Seed each piece from its identity (id, or position and kind), not from a grid cell or a call
  order, so a baked print and the collision follow what is drawn. Clamp the real-time step to [0, 0.05] s: a slow
  build can make the first animation-frame timestamp older than the clock, and a negative step runs every spring
  backwards.
- **Hook:** expose `restart()` (everything flat, t = 0), `step(seconds)` that stops the real-time loop, advances in
  fixed 1/60 s steps and renders, and `resume()` that hands back to the live loop; both templates put them on
  `window.__papercraft`, with `ready: true` once the (synchronous) build has finished. Every review frame is
  `restart(); step(T)`, never a grab of the free-running loop. Add URL switches for seed, named shot, mute, and every
  feature (for cheap on/off A/B). The templates have `?capture` (removes the on-screen hint, which does not fade on
  its own there: load every review page with it) and `?walk` / `?still`; the 3D one also `?test`, `?mood=`, `?roam`,
  `?diag=key` and `?ss=2`, the 2D one `?view=x,z,zoom`.
- **Review set:** the named shots from the style card, at fixed seed, camera and size (e.g. 1600x900). Every metric,
  critic and before/after uses the same set. Show critics supersampled frames (`?ss=2` in the 3D template) so they
  judge the cut edges a real screen shows; measure the gates on the same captures every time. The storybook gates
  are written for the wide hero frame (the hero 6-10 % of the frame height): on a close frame (`look()`) judge
  edges, prints, shadows and colour by eye and ignore printDetail, barePct, localContrast, flatPct and the focus
  gates.
- **Stills:** load the page with `?capture`, wait for `ready`, `restart(); step(T)`, then grab right after the render
  (fresh drawing buffer): `canvas.toDataURL()` in the same task as `step()`, or a headless browser screenshot. Fail
  the capture on a console error or a black frame; run it after every change. For the 3D harness,
  `scripts/capture.py <project> [shots]` does all of it (serves the folder, headless Chrome with the GPU, named shots:
  overview, midrise, test, key, mood=, look=, spot=, walk=, at=, hold=) and prints the build time, the slowest prints
  and every page error; it exits non-zero on a page error or a walk that does not arrive (a hand-rolled capture of one
  tester hid a page error and cost it a round).
- **Motion:** trigger-aligned contact sheets (e.g. 48 frames at 30 fps from the first fold event) let critics judge
  motion from a still.
- **Video:** frame-stepped at exactly the output rate (frame i at t = i / fps), never screen-recorded. Render audio
  offline from a recorded event timeline and mux it. Check with a 1-frame-per-second contact sheet (60 = the fps)
  (`ffmpeg -i out.mp4 -vf "select='not(mod(n\,60))',scale=640:-1,tile=3x2" -frames:v 1 sheet.png`) and loudness
  around -16 LUFS (`ffmpeg -i out.mp4 -af loudnorm=print_format=json -f null -`). One frame-by-frame check caught an
  autopilot that stood still after 8 s.
- **Gotchas:** capture from a production build (hot reload kills long captures); run heavy captures one at a time;
  measure fps alone and last (background windows get throttled and the numbers are invalid).

## 6. Measure: a gate, not proof

```
python scripts/measure.py shots/*.png --target target.png --compact     # one row per shot
python scripts/measure.py shots/hero.png --target target.png             # full table with hints
python scripts/measure.py clip.mp4 --at 2,6,10 --strict                  # video frames; exit 1 on any WARN
python scripts/measure.py ui.png --profile flat                          # UI / print / flat 2D: no lens, no density
python scripts/measure.py page.png --crop 320,180,1280,720               # a scene embedded in a page: that region only
```

Profiles: `storybook` (default: the open-air in-world look by day, and a pitched 2D world such as the popup-2d
template), `dusk` (golden hour and dusk: low light empties print detail and contrast, shadows go violet; a dark floor
the brief names, black sand or slate, also measures here), `night` (night), `flat` (UI pages, print and flat 2D art with no lens: the lens, corner, flat-area
and print-density gates are off). The storybook gates admit every day frame of the gallery's five environments
(`assets/gallery/`, measured as 1600 px PNG captures; a downscaled or JPEG frame reads lower in print detail and
contrast): `satMean` from 0.12 (snow and fog measure ~0.15-0.20, colourful worlds 0.55-0.75), `lumaP95` from 0.55 (a
dark forest ~0.60), `warmthLR` from -0.10 (a desert); the night gates admit its night frames. A WARN therefore means
"further off than any shipped biome", never "not autumn". Expected WARNs, judged by eye: lilac-blue shadows on snow
or teal ones under water may trip `shadowWarmth`; a bright surround (snow, a cloud sea) trips
`cornerCentre`; on a snowy night the night gate flags blue-white highlights when snow dominates the frame. The sharp
band is `focusHeight` (its height at half the peak sharpness, as a share of the frame height): it WARNs under 0.35,
or with `--target` when it is more than 0.10 from the target's; aim for ~0.55-0.75 on the hero frame (the gallery's
gameplay frames 0.67-0.72; the part that LOOKS crisp is narrower, ~36-45 % of the height). The gates are
starting points; re-tune them for your own look: `python scripts/measure.py --dump-ranges > my.json`, edit, then pass
`--ranges my.json`. With `--target`, metrics that have a tolerance also WARN when they drift from the target's own
value, and the table lists target colours missing from your frame. `--compact` gives one row per shot, including
`focusHeight`, `printDetail`, `localContrast` and `barePct`.

Reference numbers (measured with `measure.py`, 1600 px wide):

| Metric | Shipped day frames (15) | Gold target | Night frames (6) | Early template render |
|---|---|---|---|---|
| lumaP50 / lumaP95 | 0.35-0.72 / 0.60-0.85 (dark forest ~0.60) | 0.42 / 0.74 | 0.10-0.25 / 0.36-0.66 | 0.43 / 0.64 |
| satMean | 0.55-0.78 (snow 0.15-0.20) | 0.69 | 0.40-0.63 | 0.51 |
| chromaP95 | 47-73 (snow 28-41) | 73 | 20-44 | 32 |
| shadowWarmth (darkest 20 %) | 0.39-0.65 (snow 0.10-0.23) | 0.50 | -0.59 to -0.09 (indigo) | 0.30 |
| cornerCentre | 0.71-1.13 | 0.62 | 0.14-0.37 | 0.75 |
| tiltShift / dofSpread | 2.5-4.4 (close-up 1.4) / 1.9-4.0 | 5.2 / 4.3 | 2.4-4.0 / 2.4-3.3 | 3.9 / 3.9 |
| toothRms | 0.012-0.019 | 0.019 | 0.012-0.015 | **0.009** |
| flatPct | 35-60 | 45 | 54-72 | **84** |
| printDetail / localContrast | 0.065-0.080 / 0.075-0.087 | - | - | - |
| barePct | 44-56 | - | - | - |
| paletteDE / worst vs gold | 3.7-7.9 / 7-15 (same biome) | - | - | 7.9 / **16.6** |

What separated an early template render from the shipped frames: almost no paper tooth, large bare flat areas, and,
against the target, far lower chroma (no hot accent family), greyer shadows, dimmer whites and two missing target
colours. Its lens numbers were already fine.

How to read the numbers:
- A PASS means "not obviously off". An early build scored 19/20 on a look gate while blind critics gave it wow 3.5
  against 7.5-8. Metrics see grading, light balance and lens; they do not see shapes, construction, density or
  composition, and those decided every verdict.
- Prove a metric responds to its knob before tuning against it. A shadow-depth metric never moved while fill and
  ambient light changed, and lighting time went into chasing it. Two gates assumed a dark table and went stale when
  the look changed.
- Use the gaps-pass ratios (step 2) and 6x crops for anything shape-related.
- After every content change, re-run the behaviour probes too (stuck, popping, collision); content changes broke them
  more than once.

## 7. Critique and fix: blind A/B, one round per pass, one fixer

A pass is one critic round plus one fixer, inside its time box; run at most three passes (as `SKILL.md` says).

1. **Sheets:** `python scripts/ab_sheet.py --ref target.png shots/hero.png --out ab/sheet_01.png` (seeded random
   order, labels A/B only, equal height, key in `ab/keys/`). Add `--crop X,Y,W,H --nearest` for edge and fibre detail.
   For regressions: `python scripts/ab_sheet.py old/hero.png new/hero.png --out ab/sheet_02.png`. Name sheets
   neutrally and keep keys out of the critics' reach.
2. **Critics:** 2-3 in parallel, fresh context, each with one focus area: (a) shapes, cut edges and printed detail;
   (b) composition, density, life; (c) light, shadow, ground, water, blur. Plus a cheap blind old-vs-new regression
   judge every round (it caught a real close-up regression). Critics open only their sheet, may crop it, and get at
   most about 25 tool calls. They judge pictures only, never sound. The most useful field is "tells": what gave the
   imitation away.
3. **One fixer** (or one per owner, on disjoint files): most severe first; skip anything that needs new art or
   contradicts a LOCKED decision; about 12 focused edits and at most 3 capture runs; re-shoot only the affected shots,
   look at them, re-measure; revert anything not clearly better.
4. **Show the owner** the before/after (images or a short clip) and log their reaction as standing decisions.

Stopping rules (whichever comes first):
- Gates PASS (or each WARN is explained) AND the regression judge prefers the new build or says "same" on the review
  set AND no remaining defect of severity >= 7 has a cheap fix.
- The pass time box is used (30-90 min wall clock; a team pass ran 33-94 min with 7-15 agents), or three passes
  are done.
- Never "until critics cannot tell the difference". Against an idealised target that never happens: the final
  shipped build still scored closeness 5.5/10 against its gold image and was well received. Critics are a direction
  finder, not a ship gate.

Do not run unattended critic loops. A loop of 46 agents ran 7.7 hours before it was killed, because a cap on rounds is
not a cap on time, fixers ignored their time boxes, and eight heavy captures ran at once. The 33-minute content pass
after it improved the look more. Put budgets (tool calls, edits, captures, minutes) into every prompt.

Scoring: with 1-3 trials per item, "fooled %" and "preferred %" are noise; read the wow gap and the tells. Fooled =
the critic named your render as the original; preferred = it called your render better.

## 8. The owner's taste beats critics

Treat these as defaults until the current owner says otherwise. They came from the owner of the shipped game, and
critics argued against several of them.

| Rule | What it meant in practice |
|---|---|
| Calm | walk speed halved on request; camera with a still zone and soft zone instead of always chasing; lead only after ~0.35-1.1 s of steady movement; no followers; nothing bends aside; the rise-from-flat reveal is special, use it once |
| Tactile | chunky cut card, thin dark cut edges lit on the light side, a layered print with contrasting accents, short soft shadows (warm on its warm ground), living water; the owner chose the final target for its shapes, edges and texture on every piece, its composition and its living water |
| Hero always readable | bloom, if any, low and above a high threshold (the shipped game cut it 1.4 -> 0.5; the kit has none), the hero's lamp dimmed by day (3.6 -> 1.1); when the hero is hidden, ease the camera (up to ~10 deg pitch / 14 deg yaw), never cut a see-through hole |
| Subtle motion | hop 12 -> 3.3 % of the hero's height, waddle roll 5 -> 1.6 deg, lean 6 -> 3.5 deg (`references/motion.md`, the puppet table); triggers need a grace radius (rises in a 7 s jitter test 61 -> 7) |
| Quiet, low sound | one paper sound per gesture, about 0.55 s apart, gain 0.76 -> 0.13, pitch down (0.5-0.82), band limit 11.5 -> 2.6 kHz (`references/sound.md` section 1); footsteps ~16 dB under a flap; soft low piano, low-passed under ~1.9 kHz, no bells. The owner's ears overruled spectral targets five times: get them listening early, start quiet |
| No game-y UI | collectable stamps with confetti were removed; cursor hidden; no on-screen UI beyond a fading hint; diegetic paper UI (a map page sliding up) is fine; ask before adding "game" features to a calm piece (a disc under the figure went too); `references/paper-ui.md` |
| Only what paper can do | hinges, folds, layers, light through card; no scaling or fading in (except the pop, flip and shrink-away verbs of `references/motion.md` for small things), no dithered see-through, no glow haze, no plastic sheen |
| Endless means seamless | no page border, seams or tile grid in an infinite scene (the critics' "show the book edge" was vetoed) |
| References steer style, not content | owner style images guide light, material, depth of field and density, never subjects |

Paste a "STANDING DECISIONS - do not undo" block (section 9) into every agent prompt; critics kept asking for
rejected things (book edges, a dark table, more glow, more sound).

Anti-patterns and the fixes that worked, grouped:

| Lesson | Symptom (as critics or the owner saw it) | Fix (numbers relative where possible) |
|---|---|---|
| Camera | "a flat map with tiny scattered pieces"; hero reads as a hat disc | long lens (fov 24-32) looking down 40-55 deg, ground past every edge; chunky pieces (hero 6-10 % of frame height, every kind at its ratio to the hero by role: `references/worlds.md` section 8) in dense groups; slivers dropped |
| Lens | bottom third "mush"; a hard line where blur switches | blur ~80 % from depth, smooth ramp, max radius 12-18 px at 1080p (a Canvas `blur()` sigma is about half that), near side a bit stronger; never a step |
| Miniature | scene reads full-size | tilt-shift plus big blurred pieces at the bottom edge; haze, if any, subtle and only in the far distance (by distance from the subject), never a colour fog over the frame |
| Material | "uniform same-scale noise", "felt" | two-octave fibre + sparse crisp strands, mottle x0.4; long curly dark strands read as leather; screen grain is not fibre |
| Material | faces turned from the key go near-black | wrap ~0.3, key:fill ~3.5:1, kraft backs with ~45 % show-through on cards seen only from the front |
| Light | upright cards facing the camera go grey | a frontal fill from the camera side at ~0.3 of the key (without it they get ~60 % of the ground's light) |
| Edges | thin, aliased, cold edge; then a "white sticker halo" | the edge printed in the art by `P.rim()`: a thin dark-brown line at the silhouette + a pale highlight only on the lit edges, colours from the print itself, anti-aliased; no edge on folds; never a second shader / post rim on top |
| Art | flat-colour cut-outs read as confetti, stickers, texture borders | printed illustration inside every silhouette (step 4) |
| Shapes | "front face only" buildings; X-shaped blades; edge-on rails | box folds and prisms; low things as camera-facing cards with jitter or fanned parallel cards, never crosses; full crosses for upright round things walked around, palms included, the main plane ~24 deg off facing the camera (the type for each kind: `references/structures.md` section 0); V-folds closed by a low card; rails leaning outward |
| Light | hard, long, dark CG shadows | key 45-55 deg up and 45-65 deg off the camera axis, soft penumbra, cast 0.7-0.87 of lit, contact 0.6-0.7, tinted with the world's colour and more saturated than the ground (warm amber on warm ground) |
| Light | literal 3000 K key: saturation 0.70-0.85, sage turned lime | mild warm key plus white balance ("warm in look, not in the light colour") |
| Light | the brief's cool fill gave grey-blue CG shadows by day | the fill from the brief's light preset, the leak in the world's shadow colour, so shadows never go grey |
| Palette | "one saturated olive green" (the countryside's ground) | a ground ~0.16-0.22 brighter and ~0.16-0.25 less saturated than the cards, hue-masked desaturation; one lead family from the brief on the pieces, each with contrasting accents |
| Palette | new art under the grade clipped to pure orange | re-check saturation (the frame mean as rich as the world: `references/palettes.md` rule 3) after every art change (grade 1.04 -> 0.92) |
| Frame | dark rim, corner/centre luma 0.39 | printed ground past every edge instead of a dark surround; vignette 0.03 by day, ~0.12 at dusk and night (`references/look.md` section 7), corners >= ~0.58 of the centre's luma, in the world's colour, never near black |
| Ground | "stains and a tile grid"; "ruler-band" paths | one ground tone with multi-scale mottle, invisible seams; paths lighter than the ground (the countryside's: luma x1.25, pinker), winding, width +-20 %, feathered edge |
| Water | a flat print | depth steps, pale rim + darker waterline, drifting dashes, mirrored reflections of what stands at the bank (the strongest "alive" cue) |
| Layout | even scatter, house grid; a few props on an empty plain | dense groups of different pieces round anchors, the sharp band packed, clearings mostly outside it, one leading line of the world's own, no group stamped twice, one small story per frame (the numbers: section 4, Composition) |
| Glow | bloom hides the hero | low bloom above a high threshold; light pools on the paper instead of glow (the kit has no bloom: lit panes are emissive and the lens turns them into bokeh) |
| Motion | flaps move like rigid boards; nested parts scissor | spring: overshoot 8-15 %, latch, 2-3 quiver cycles at 4-7 Hz, slight twist; children follow the parent's progress; stagger 0.2-0.35 s |
| Night | flat, magenta night; warm-printed boats gone black under a cool fill | a dim near-neutral moon over a navy ambient; the pieces re-lit, not repainted: warm windows and lamp pools carry the warmth, navy only far away and in deep shadows; warm prints turned toward the key or given a practical; back-light translucency cool and weak; no neutral greys |
| Play | stuck "where there is room"; walking through houses | one card spec drives rendering AND collision; probe stalls numerically (stalls 12 -> 1) |

## 9. Prompt templates

Blind critic (one per focus area):
```
You are a harsh art director and paper engineer. You know nothing about how these images were made.
Open exactly one file: <SHEET>. Open no other file, folder, key or log.
It shows images labelled <A, B, ...>. One is the reference for this look: <ONE-LINE LOOK>. The others imitate it.
Focus on: <FOCUS AREA>.
Reply with JSON only: {"original": "<label>", "confidence": 0-1, "better": "<label>",
"wow": {"<label>": 0-10, ...}, "tells": ["what gives the imitations away, most visible first"],
"fixes": ["at most 6, concrete and cheap first: a value, a shader tweak, a small code change"]}
Wow: 10 = would share it, 5 = competent. Be stingy.
```

Regression judge (every round):
```
Two renders, A and B, of the same shot from two versions of one project; you do not know which is newer.
Target look: <ONE-LINE LOOK>. Open only <SHEET>.
Which is closer to the target and more convincing as a real paper object? Say "same" only if you cannot tell.
JSON only: {"better": "A" | "B" | "same", "reason": "<one sentence>"}
```

Lens critic, before/after against the target (not blind; use when the target is idealised):
```
Judge a paper-style <piece> against its target. Target: <T>. Before: <files>. After: <files> (same shots).
You may crop and zoom. At most 25 tool calls. Edit nothing. Focus on: <FOCUS AREA>.
Owner decisions that override you: <STANDING DECISIONS>.
JSON only: {"scores": {"closeness": 0-10, "<axis>": 0-10}, "betterThanBefore": true | false (false if about equal),
"defects": [{"what": "", "where": "<image + region>", "severity": 1-10, "fix": "<cheap, concrete; no new art>"}]}
At most 6 defects. Same scale as last round (<previous scores>); do not inflate.
```

Fixer (one per pass):
```
You own only: <FILES>. Do not edit other files; write a request in the log instead. Do not commit.
Fix, most severe first: <DEFECTS + measure.py WARNs>.
Skip anything that needs new art or contradicts the standing decisions; they override critics: <STANDING DECISIONS>.
Time box: one focused pass, about 12 edits, at most 3 capture runs, about 30 minutes.
Re-shoot only the affected shots, look at them, run scripts/measure.py. Revert every change that is not clearly better.
Append to the log: changed / reverted / numbers before -> after / still open. Reply in 5-10 lines.
```

Standing decisions block:
```
STANDING DECISIONS (owner; do not undo; they override critics, references and metrics):
- <decision, in the owner's terms> (<date>)
```

## 10. Final self-review checklist

- [ ] The style card exists, fits on one page, and lists LOCKED owner decisions and what is out of scope.
- [ ] One target (image or written) is measured; conflicts with the brief are resolved in the log.
- [ ] Paper kit: diffuse only, two-octave fibre fixed to the surface, the cut edge (dark line + lit-side highlight,
      none on folds), printed backs on crosses and the hero (kraft show-through on cards seen only from the front),
      contact and cast shadows tinted by the world (never grey or black), a frontal fill; checked at 1:1, at play
      distance and at 6x.
- [ ] Every piece: chunky silhouette, a layered print (3-5 inks, 3+ value steps, one ornament) with contrasting
      accents, the cut edge, short soft shadow. No bare flat colour, even pale halo, edge-on blade or single facade
      card anywhere in the review set.
- [ ] The ground is flat; height comes from hill cards and outcrops; everything walked on, under or into is an open
      construction read by the walk logic (deck + sides, treads + stringers, posts), walked end to end.
- [ ] The camera looks down 40-55 deg and the ground runs past every edge; the sharp band ~36-45 % of the frame
      height; density, groups and clearings as in section 4 (Composition); the hero is 6-10 % of frame height,
      off-centre and readable in every shot (bloom, occlusion, contrast).
- [ ] Motion rotates about hinges only (plus small flex and the pop, flip and shrink-away verbs for small things);
      triggers have hysteresis; the camera rests when nothing moves.
- [ ] Sound is quiet, sparse and low-passed, and the owner has listened to it.
- [ ] No game-y UI, no text or logos, no border, seam or grid in an endless scene; nothing a paper object could not do.
- [ ] Capture is deterministic: every review frame is `restart(); step(T)` on a `?capture` page; two runs give
      identical stills; video is frame-stepped with offline audio.
- [ ] `measure.py`: every gate PASSes on the review set, or each WARN is explained in the log.
- [ ] `ab_sheet.py`: the blind old-vs-new judge prefers the new build or says "same"; nothing regressed.
- [ ] Critique ran in bounded passes (one critic round plus one fixer each, at most three), each within its time box;
      a snapshot is tagged; the log is current.
- [ ] Deliverables: build plus run instructions, review-set stills, video if asked, and a labelled side-by-side against
      the target (`ab_sheet.py --reveal`) for the owner.

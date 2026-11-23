# The paper look

What makes a rendered frame read as a real paper model photographed through a macro lens: material, edges, depth cues,
light, lens, grade and night, with the numbers that held up in a shipped pop-up game. Engine-agnostic; three.js code
is in `three-js.md`.

Read this when: setting up materials, lights, shadows or post-processing in any medium, or when a frame looks "CG",
"plastic", "flat" or "like stickers" and you need to know why.

Contents: 1 The look; 2 Material; 3 Thickness and edges; 4 Depth cues; 5 Light; 6 Lens; 7 Grade and haze;
8 Night, weather, moods; 9 Water; 10 Units and scaling; 11 Starting values; 12 Fake-paper tells

## 1. The look: an open-air world seen from inside

One look: the camera looks down into the world and the printed ground runs past every frame edge, with no horizon,
sky, backdrop, book edge or table in view (section 6). Measure against the source project's open-air frames:

| Metric | Value |
|---|---|
| Surround / corners | printed ground to every edge, a mild vignette (warm by day, the mood's dark at dusk and night); corner/centre >= 0.58 |
| Sharp band | ~36-45 % of the frame height looks crisp on the hero's scene (`measure.py` focusHeight, the half-peak band, reads wider: ~0.55-0.75, the source game's gameplay frames 0.67-0.72); big, heavily blurred cards along the bottom edge (section 6) |
| Ground vs cards | the ground ~0.16-0.22 brighter and ~0.16-0.25 less saturated than the cards standing on it |
| Shadow depth (1 - shadow/lit luma) | broad cast 0.13-0.3, contact 0.3-0.4 in clear light, shallower in fog, dawn or a sandstorm (how to measure: section 8b) |
| Penumbra | 25-30 % of caster height |
| Mean saturation (HSV S) | ~0.55-0.75 in a colourful brief (the shipped colourful frames 0.58-0.73); snow, mist and fog far lower (the gallery's snow ~0.15) |
| Luma | mean ~0.64 in the colourful day frames; a forest darker, snow and desert brighter, a dark floor the brief names lower |
| Darkest 20 % of pixels | the world's shadow colour, never neutral grey (`#291b07` warm brown in the warm source frames; olive-black in the forest, lilac-grey on snow, navy at night) |
| Warm/cool | the pieces keep their own printed colours; shadows take the world's colour: a warm amber on warm ground by day (more saturated than the ground), lilac-blue on snow, teal under water, navy at night (section 8b); never grey |

**Ground against cards.** A pale, low-saturation ground (in every source biome, sand, snow, moss or fresh green, paler
and greyer than the pieces on it) keeps the warm grade from turning it orange: author ground washes pale and low in
saturation and let the pieces carry the colour (round 8: a ground within 0.04-0.06 of the cards' saturation "dissolved
into orange"). How far apart to author them: `palettes.md` rule 9.

A brief that is literally a book or a page inside a UI may show the page's edge; inside it the look stays this one
(no lamp-lit room, no dark table).

## 2. Material

**Diffuse only.** Card has no specular, clearcoat or sheen. Use a Lambert-style diffuse term (or PBR with roughness 1
and specular 0, which is still worse than owning the diffuse term). No environment reflections. Target: under ~1 %
clipped pixels, and only small lit panes may clip (`measure.py` `clipPct`).

**Soft terminator (wrap light).** Thin paper lit by bounce from more paper never has a hard Lambert terminator:

```glsl
float nl = dot(N, L);
float front = clamp((nl + wrap) / (1.0 + wrap), 0.0, 1.0);   // wrap 0.30 day, 0.38-0.42 night (one global value)
```

**Shadows leak the world's light.** A shadow does not multiply the key to zero; it lerps the key toward a leak colour,
so the shadow side reads as lit by bounce off the paper around it:

```glsl
vec3 irradiance = front * keyColor * mix(leakColor, vec3(1.0), shadowLit);   // leak #a0602c by day (moods: below)
```

On a warm ground by day the leak is a warm amber (`#a0602c`), so shadows come out more saturated than the ground they
fall on, never grey; every other light's leak is in `assets/lights.json` (golden hour, dusk and night: the template's
measured sets, section 8). A leak that is too light (hemisphere 0.3 + light leak) reads "floaty, washed": pick it per
light.

**Back-lit translucency.** Thin card lit from behind glows warm; thick stacks and other cards in front do not. Gate the
glow with a second shadow test that ignores blockers within one sheet thickness (so a card never shadows its own back):

```glsl
float back = clamp((-nl + 0.1) / 1.1, 0.0, 1.0);
irradiance += back * 0.3 * vec3(1.0, 0.69, 0.44) * keyColor * shadowLitIgnoringOwnSheet;   // night: cool and weak (0.12)
```

A warm translucency under a blue moon turns green cards magenta: make it cool at night.

**Fibre fixed to the surface.** The strongest "it is paper" cue at normal viewing distance is a two-scale tooth fixed
to the surface: a soft cloud (features ~1/3 of the hero's height) and a fine tooth (~2-4 % of the hero's height),
plus a few short straight-ish strands. Screen-space grain does not read as fibre. Size features for the texels per
screen pixel at which they are seen: sub-pixel fibres vanish and only blotches survive ("felt"); long curly strands
read as cracked leather or veins. Sample one tileable texture at two non-integer scales (x1 and x3.73 with an offset)
so the repeat never lines up. Keep it quiet: one fibre, never plush felt or a weave (amounts in `procedural-art.md`
section 0).

**Crumple in the normal only.** Broad low-relief creases change the light, not the print: put them in the normal map
at ~4x the fibre scale and keep their albedo effect near zero.

**Per-sheet tone.** Real pop-ups use several sheets of "the same" colour. Vary each sheet's value by +-4-6 % from a
seeded hash of the piece (brighter sheets slightly warmer). Never flicker: key it to the piece, not the frame.

**Author albedo only.** Light falloff, haze, contact occlusion, edge lines, vignette and grade are applied to the final
image for every material, so nobody bakes light into textures. Anything drawn outside that pipeline (an unlit sprite, a
UI overlay rendered in the scene) will look wrong next to the paper.

## 3. Thickness and edges

**Every card is a slab.** Extrude the cut outline to a thickness of 1.5-3 % of the hero's height (1-2 mm on a 15 cm
page). Front cap, back cap and side strip are separate surfaces.

**The cut edge (the most important edge lesson).** A cut card shows its thickness at the silhouette, the strongest
single paper cue. Print it into the card's art, once per silhouette:

1. A thin dark-brown line right at the silhouette (the card's thickness and printed outline, ~1.5-2.5 px on screen),
   plus a pale highlight just inside it ONLY on the edges that face the light: up to ~1.5 % of the hero's height where
   it faces the key, fading to nothing on the shaded side (constant in world units, clamped 1-2.2 px when far or
   near: ~1.1 px at the templates' framing, `edgeWidth` 0.08 in the 3D template's popups, kit default 0.06). Never an even pale, cream or white band all round,
   never glowing, never torn. The kit's `P.rim()` derives both colours from the print's own mean colour (a warm light
   tone of it, a dark warm brown, never black), in every mood: do not set edge colours per mood. Folds are not cuts:
   hinge bases and panel joins get no edge (`makeCard({ folds: ['bottom', ...] })`, `P.rim({ skip })`).
2. Colour the card's side faces as a darkened copy of the print (~0.5-0.55 x value, 6-10 % toward the cream core).
   Dark pieces (pines, timber) get a dark kraft edge, so an edge-on card never shows as a white line through a dark tree.
3. The kit's post pass may darken a thin depth line where a card stands in front of something further away (multiply
   ~`#c2aa94`, ~1 px at 1080p, suppressed inside the blur). Never add a second shader or post rim on top of the
   printed one.

What failed: pale side faces plus a cream shader rim plus a cream post line read as "a white sticker halo round every
piece". A pale band that does not scale with local brightness glows in shadow.

**Backs.** Plain backs = 55 % front colour + 45 % kraft `#e8d3ac` (pure kraft backs read as "blank tan cards").
Illustrated cards print the same art mirrored on the back, like a real die-cut. Unprinted pale backs seen from a
yawed camera read as slivers.

**Hand-cut irregularity.** Cut lines wander 0.5-1 % of their length (two low-frequency sines + a little noise); points
on the fold line never move. Stand-ups lean +-2-3 degrees; nothing is plumb. Silhouettes are chunky: convex lobes and
scallops, corner radius at least ~3 px at final size, nothing thin or spiky.

**Smooth die cut.** Stair-stepped or dithered cut edges read as pixels: use MSAA (and alpha-to-coverage for alpha-cut
cards). If you cut cards from alpha, give shadow casters the same alpha test or holes cast filled shadows. Judge
edges on a supersampled capture (the 3D template's `?ss=2`, what a DPR-2 screen shows): a 1x headless capture aliases
every cut into stairs the player never sees, and critics then chase a fault that is not there.

**Never edge-on.** A flat card seen edge-on is a knife-thin sliver, the most common "this is CG" tell. Omit `yaw` and
the 3D harness turns each piece: a single card faces the camera within +-14 deg; a slotted cross (trees, palms,
cacti, tents, posts) turns its main plane ~24 deg off facing the camera; a quarter cross or V-fold opens toward the
camera (`structures.md` sections 1 and 3).

## 4. Depth cues

**Contact-hardening soft shadows (PCSS).** Between paper layers a shadow is tight and dark where the card meets the
page and widens with the gap. Fixed-radius filtering reads as hard CG or mush. Per pixel: blocker search on a Vogel
disc, average blocker distance, penumbra = softness x distance (clamped), Vogel PCF over that radius, disc rotated
per pixel by interleaved gradient noise. Values: softness 0.26 per unit of gap (open air) to 0.40 (misty), max
penumbra ~0.4 x hero height (`maxPenumbra` 1.4 units in the 3D template, 1.2 in the kit), min ~2.4 shadow texels, a
4-tap fallback so thin contact slivers stay solid.

**Flat paper casts nothing.** Folded-flat layers sit a hair apart (0.7 % of hero height); set the shadow bias just
above that gap, so a flat flap looks printed and its shadow grows as it rises.

**Contact occlusion in the world's shadow colour.** Every stand-up piece must visibly touch the page: a tight dark
contact line at the hinge, then the cast shadow ("props without it look pasted on"). Screen-space AO with radius ~0.4
x hero height, strength ~1.2, tinted (`aoTint`: warm brown `#5a3214` on a warm ground by day; grey AO reads as dirt). Normals from the smaller-difference depth neighbours (no
smear across silhouettes). Fade it out inside the blur. Cheap alternative: bake 10-14 % darkening into the bottom
~0.4 units (~11 % of the hero's height) of each card (`makeCard`'s `contact`, amount 0.12 over 0.4 units by default;
`contact.color` the world's shadow colour).

**Layer separation.** Stacked flats sit 5-15 % of the object height apart; each layer 10-15 % darker going away from
the light.

## 5. Light

| | Value | Notes |
|---|---|---|
| Key | warm `#ffdcb2` on the template's clear day (other light: `assets/lights.json`; template intensity 3.0), elevation 45-55 deg, azimuth 45-65 deg off the camera axis toward screen-left, a little toward the camera | shadows fall sideways and behind where they are seen (a key from behind the camera hides every shadow); 67 deg elevation flattened everything, below ~45 deg shadows get long and theatrical |
| Fill | frontal: warm `#f2dcc2` from the camera side, ~1/4-1/3 of the key (template 0.8 against 3.0) | without it, upright cards that face the camera get only ~60 % of the ground's light and go grey; a cool blue fill made daylight shadows blue |
| Sky / hemisphere | `#fff0da` over `#b39a78`, ~0.14 of the key (template 0.42) | |
| Key:fill brightness | ~3:1 | |
| Lamp pools (dusk, night) | three.js `PointLight` (the 3D harness's `H.lamp(x, y, z, k)`), warm `#ffb070`, decay 1, distance ~2.5-3 hero heights, intensity ~6 at dusk and ~4.5 at night, at doors and lamp posts | inverse square (decay 2) makes a hot spot on flat paper; the paper wrap is one global uniform, so lamps get no wrap of their own (section 8) |

- **A mild key + white balance**, not a literal 3000 K light (which turned greens to lime). Do the warmth in the grade
  tint.
- **Light falloff across the frame ("gobo").** A lit paper model is brighter and warmer on the key side: in post,
  from reconstructed world position, `col *= (1 - k*t) * vec3(1 - tint*0.5*t, 1, 1 + tint*t)`, t = ground offset
  along the camera's right vector / radius (just beyond the frame's half width), k 0.12-0.18, tint 0.07.
- **Keep the light count constant.** Many engines recompile shaders when lights are added or removed: add every lamp
  before the first render and toggle intensity.
- **Close-ups need relief:** when the camera comes within ~1.5 hero heights of the focus, drop exposure ~15 % and
  remove most of the falloff, or the key side blows out.

## 6. Lens

**Framing.** The camera looks down into the world: long lens 24-32 degree vertical FOV, pitch 40-55 degrees down, and
the printed ground runs past every frame edge, with no horizon, sky, backdrop, book edge or table in frame (unless the
brief is literally a physical book or a page inside a UI). Lower than ~40 lets the far edge in; far steeper flattens
cut-outs and turns a character into a hat disc. Hero 6-10 % of frame height, off-centre and a little below the
middle, the rising/important area in the top half.

**Tilt-shift DOF.** On a ground plane a screen-height gradient and a depth-based blur agree; on upright cards only the
depth version is right (a tree does not get sharper where it crosses the band). Mix them:

```glsl
float sY = uv.y - focusY;                          // frame heights from the focus line
float sD = (z - focusZ) / focusZ * kD;             // relative depth, converted to frame heights
float c  = mix(sY, sD, depthWeight);               // depthWeight ~0.8
float a  = clamp((abs(c) - band * 0.5) / ramp, 0.0, 1.0);
a = a * a * (3.0 - 2.0 * a) * 0.35 + a * 0.65;
float cocPx = min(a * (c < 0.0 ? nearGain : 1.0), 1.0) * maxBlurPx;
// kD = 1 / (fovY_radians * cot(pitch)): on the ground, a step dy in frame heights changes distance by dr/r = fovY*cot(pitch)*dy
```

Values: the visibly sharp band covers ~36-45 % of the frame height, centred on the hero's scene (the shipped frames;
`measure.py` focusHeight, the half-peak band, reads wider: ~0.55-0.75, the source game's gameplay frames 0.67-0.72).
The band parameter is not that number: the blur grows slowly past the band's edge, so the 3D template reaches it
with `focusBand` 0.3 and `ramp` 0.3: tune the parameter until the measured band lands in range; too wide and the
tilt-shift is gone. Max blur 12-18 px radius at 1080p (3D template 18; a Canvas `blur()`
takes a sigma, about half the radius: 2D template 9), near gain 1.5-1.6 (the foreground reaches full blur sooner).
Gather with a centre-dense golden-angle disc (radius ((i+0.5)/n)^0.75, weights r^(2/3)), scatter-as-gather (a tap only
counts if its own blur reaches the centre) so sharp foreground edges never smear into the background, and give
bright taps more weight (the kit's `highlightBoost`) so lit panes open into soft bokeh discs. Re-tune band, blur and
exposure together whenever the framing changes.

**Miniature cues beyond blur.** Big, heavily blurred foreground cards overlapping the bottom edge sell scale more than
stronger blur. Fliers and smoke above the focal plane blur into white holes: keep them near the band height.

**Debug view.** Build a signed-CoC view (red far, green near) early; it makes every DOF problem diagnosable from a still.

## 7. Grade and haze

Order that shipped (linear scene in, display out):

1. Chromatic softness at the frame edges: R/B offset (uv-0.5)|uv-0.5|^2 x 4 x ~0.55 px.
2. Light unsharp mask inside the focus band only (amount ~0.3, clamp +-0.25): MSAA resolve is soft.
3. World-space falloff (section 5), contact occlusion, silhouette line (section 3).
4. Depth of field.
5. Exposure x white-balance tint (1.03, 0.985, 0.98), ACES fit, exposure ~0.82. A mild white balance, never a sepia
   or colour filter over the frame.
6. Saturation about luma ~0.96 (lower for already-saturated art; up to ~1.05 for muted art); the frame mean as rich as
   the world (`palettes.md` rule 3).
7. sRGB encode, then contrast ~1.18 about a 0.42 pivot.
8. Pull saturated yellow-green toward a muted paper green, hue-masked, display space (under a warm key, grass has
   r > g, so accept g down to r-0.2):
   `gm = smoothstep(0.1,0.3,g-b) * smoothstep(-0.2,-0.05,g-r) * amount; col = mix(col, mix(luma, col, 0.45)*(0.97,1,1.03), gm)`
   with amount ~0.3 by default (the template; the source game ran 0.5-0.7); lower it when the brief's greens must stay
   fresh, <= 0.1 for teal leads.
9. Shadow lift toward the mood's shadow tint (umber `#3a200c` by day, navy at night):
   `col += tint * 0.03 * (1 - smoothstep(0, 0.45, luma))` (stops the darkest tones crushing to black).
10. Haze (below), vignette toward warm umber by day (0.03) and the mood's dark at dusk and night (~0.12, the table in
    section 8); corners >= ~0.58 of the centre, never black; grain 0.8-1.2 % shaped by luma, seeded per frame so stills
    repeat.

The numbers are the 3D template's (`harness.js`); `PaperPost` on its own defaults a little softer (exposure 0.8, tint
(1.02, 0.99, 0.97), saturation 0.95, contrast 1.1, green pull 0.25).

**Haze, not fog, and only far away.** Never a colour fog over the frame; if there is haze at all, it is subtle and
only in the far distance. Measure distance on the ground from the focus point, not from the camera, so the haze ring
travels with the subject and never eats the foreground. Start just beyond the area that must read (the 3D template by
day: 34 units from the focus, ~9 hero heights), end ~3x that (95), amount ~0.3 (moods in section 8). Haze colours are
mid tones, never near white, or the far ground glares against the vignette: open air `#d8bf8e`, mist `#788e84`, night
`#0e1a44`.

**Exact on-screen colours.** Some colours are art-directed as final pixels (haze, background, a UI paper white).
Either apply them after the grade in display space, or mirror your tone curve on the CPU and solve for the scene
value that lands on the target hex (damped multiplicative fixed-point iteration, ~60 steps).

**What did not move critics:** grade tweaks alone. What did: printed art on every card, one target image to copy,
killing edge-on slivers, lighter warm shadows, tighter framing.

## 8. Night, weather and moods

- **Dusk on snow**: the template's dusk set has a pink haze that turns blue-grey snow peach and mauve; on snow keep
  the haze lilac-blue (`#a9a6c8`), the tint neutral, and let the warm windows and lamps carry the warmth.
- **The palette gate under a mood** compares written colours with lit, graded ones: at dusk and night expect paletteDE
  ~12-18 and judge the colours by eye; the gate is meaningful by day.
- **Mist** (a misty morning, a foggy harbour) is paper, never a fog filter: cream cloud flats lying low across the
  water and the fields (the cloud recipe, `procedural-art.md` section 3), a far haze in the mist's mid-tone (the `mist`
  preset's `#788e84`, ~22-80 units at ~0.5; never near white, check the far ground does not glare against the
  vignette), a slightly softer key (~2.8) and contrast (~1.12). Expect frame saturation well below a colourful day
  (~0.48 in that test build): that is the brief.
- **Moods by light, not new art.** The prints never change: only light, leak, haze and grade. Keep two constants so
  it stays one world: the structure colour (red-brown wood in the countryside) and the warm window and lamp colour.
  Cut edges need no per-mood colour: `P.rim()` derives them from each print in every mood. If the mood changes at
  run time, one writer owns every look value and blends the tables (colours in linear), eased.
- **What the kit has.** No bloom and no screen-space spill. Lit panes (`P.glow`, `#ffc45a`) are emissive: `setGlow(v)`
  sets their emissiveIntensity, ~0.35 by day (a few warm windows say "someone lives here"), ~1.1 at dusk, ~1.4 at
  night, at exposure ~1; the lens's highlight boost turns them into soft bokeh. Unlit panes are dim amber paper, never
  near-black (reads as a hole). Lamp pools: section 5 (`H.lamp`), at doors and lamp posts, added before the first
  render (the light count is fixed). The paper wrap is ONE global uniform: no per-lamp wrap.
- **Night keeps the pieces readable and coloured.** The 3D template lights night with a dim pale-blue moon (about half
  the day key), a blue fill and a blue sky (the Night row below), so every card stays readable and coloured; the warm
  windows and lamp pools carry the warmth, and navy lives in the far haze and the deep shadows (in the shipped night
  frame about half the pixels stay warm). Pieces stay readable by their cut edges. If warm-printed pieces go black
  under the cool light (a test agent's boats did), turn them toward the key or give them a practical light. A dark
  night ground needs more ambient than the day template. Snowy night: keep the snow a step darker than the lamp
  highlights; the night gate flags blue-white highlights, an expected WARN when snow dominates the frame.
- **Haze is one colour by ground distance** (section 7), never a screen gradient, and always far; at night it is the
  navy of the distance. For dusk falling into night, animate it (colour, start, amount) over time.
- **The low key.** Every mood keeps the key 45-65 deg off the camera axis and 45-55 deg up, with the frontal fill at
  ~0.3 of it (dusk and night ~0.4); golden hour and dusk are the only exception, 20-35 deg up for long shadows. A low
  key needs a deeper shadow box: raise paperLights' `distance` and check the far corners still get shadows.
- **Measure** day with the default `storybook` profile (3D and pitched 2D alike), golden hour and dusk with
  `--profile dusk` (low light empties print detail and turns shadows violet), night with `--profile night`.

The 3D template's measured sets (`?mood=golden|dusk|night`; day is the default), copied from its `MOODS` table.
Intensities in three.js units at the template's scale (hero 3.6 units); haze = colour, start-end in ground units from
the focus, amount. Lamp = the door pools' intensity (distance 11, ~3 hero heights); lamp posts get 0.66 of it
(distance 9, 2.5 hero heights).

| Set | Key | Fill (frontal) | Sky / ground | Leak, wrap | Glow / lamp | Grade and haze |
|---|---|---|---|---|---|---|
| Day | `#ffdcb2` 3.0, ~45 deg up | warm `#f2dcc2` 0.8 | `#fff0da` / `#b39a78` 0.42 | `#a0602c`, 0.3 | 0.35 / - | exposure 0.82, contrast 1.18, tint (1.03, 0.985, 0.98), saturation 0.96, vignette 0.03; haze `#d8bf8e` 34-95, 0.3 |
| Golden | `#ffc890` 3.4, ~28 deg up | COOL `#b9bcd8` 0.8 | `#ffe6c8` / `#8a7a70` 0.4 | `#8f5034`, 0.3 | 0.35 / - | exposure 0.86, tint (1.02, 0.99, 0.98), saturation 1.0; haze `#e6c08a`, rest as day. The gold comes from a low warm key against a cool fill, never a brown cast over everything (a blind critic: "a global sepia cast") |
| Dusk | `#ffb38a` 3.2, ~24 deg up | violet `#6f63a8` 1.3 | `#a898d0` / `#5a4a78` 1.0 | `#6a4a8a`, 0.3 | 1.1 / 6 | exposure 1.0, tint (1.02, 0.97, 1.0), saturation 0.95, vignette 0.12 `#1a1430`, shadow tint `#1e2050`; haze `#c98fa0` 24-80, 0.4 (the example's: give your world its own) |
| Night | moon `#c8d6ff` 1.6, ~45 deg up | `#7890d0` 0.7 | `#3a56b0` / `#22243a` 0.85 | `#26368a`, 0.4 | 1.4 / 4.5 | exposure 0.95, tint (0.98, 0.98, 1.03), saturation 1.12, vignette 0.12 `#0a0c24`, shadow tint `#141c48`, shadow lift 0.04; haze `#0e1a44` 14-55, 0.9. An even, saturated blue moonlight keeps every card readable and coloured; lamps are small local glows (a blind critic: one warm spotlight in murk reads wrong) |

Other light conditions (hard noon, snow, soft spring, mist, aquatic, overcast): starting values in
`assets/lights.json`, not measured in a template; same rules: set key, fill, haze and leak.

## 8b. Checking the shadows

Cast shadows are the first thing a pale ground, a strong frontal fill or a bright sky light washes out, and the frame
metrics cannot tell (the darkest pixels may be a printed river or a fissure, not a shadow). Render the key light alone
(fill 0, sky 0, black leak: the 3D template's `?diag=key`): every standing piece must throw a clear shadow sideways
and behind where the camera sees it. Then, in the normal light, compare the open ground next to a card's shadow with
the shadow: broad cast shadows ~0.7-0.87 of the lit ground's luma, tight contact shadows ~0.6-0.7 (the shipped
frames). Too weak on a pale ground: drop the frontal fill toward ~0.2 of the key and the sky light toward ~0.3
before darkening the leak. The hero's slim parts cast the thinnest shadows: give him, and every standing piece, a
soft dark smear at the foot, and check his shadow on the key-only frame at his usual headings.

Shadow hue follows the world, the pieces keep their own printed colours: warm amber on warm ground by day (`#a0602c` leak), lilac-blue
on snow (the gallery's snow: drift shadows `#A4AFC4` on `#CDD0D8`), a deep teal under water, navy at night.
Amber on teal-lit sand turns olive: pick the leak from the world's ambient, then check the hue on the key-only frame.
Under water (a starting set, not measured): key `#eef6ff` ~2.6 from high above, fill `#5fa8b8` ~1.0, sky `#9fd4dc`
over `#1e4a5a`, leak `#1e5560`, haze `#2f7f8f` far only; corals, sand and the pieces keep their own prints, the
water's colour lives in the ground print and the far haze, never as a filter.
Golden hour on a warm ground (sand, ochre fields): a warm low key plus a warm ground saturates the whole frame
(satMean 0.8+, the sand vanishes): use a paler key (`#ffd9a8`), raise the cool fill, or author the ground paler.
Tall pieces under a low sun throw long shadows that the penumbra cap blurs away (a palm's shadow dissolves): lower
`maxPenumbra` to ~0.6-0.8 so long shadows keep their shape.

Cool light (a mountain morning, snow, mist) still runs through the warm grade: the warm tint and ACES push an
authored grey-green toward khaki on screen, so author the cool ground a step bluer and greyer than you want it, keep the key warm-white
on the pieces, and expect low frame saturation (the gallery's snow ~0.15): that is the brief, not a fault. The 3D
harness multiplies a warm cream paper stock over every print and the ground: a cold world passes a cooler stock
(`createHarness({ stock: '#eef1f6' })`), or its snow lands beige (a tester's whitewashed monastery did). The
gallery's snow lands at `#CDD0D8` in frame, its drift shadows `#A4AFC4`.
The default grade also pulls teal and green toward a khaki green (`greenDesat`) and cream toward ochre: for teal-led accents
set `greenDesat` <= 0.1 and author the teal a little bluer, then check the accents survive in `measure.py`'s palette
list.

## 9. Water

Only when the brief has water (`structures.md` section 6 builds it, and holds the design ideas). Water is printed
paper, not glass: a print in the world's water colour with fibre showing, a pale hand-cut rim and a thin darker
waterline, 2-3 stepped depth tones with wobbly edges, cream cut-paper ripple dashes that drift (never distort the
surface), rings round anything standing in it; reflections are printed marks, never a mirror render. Flow uses two
cross-fading phases (classic flow-map trick) so the pattern never shears. The default grade pulls a grey teal toward a
khaki green (`#7aa9a0` written, `#89a677` measured in a test build): author water a step bluer and check it in the
frame; for a sea or a lagoon lead set `greenDesat` <= 0.1.

## 10. Units and scaling

Physical things (edge width, penumbra, AO radius, haze distance, card thickness) are in world units relative to the
hero; lens things (focus band, blur ramp) are fractions of frame height; pixel clamps on both keep details from
vanishing when far or bloating when close. When you change the scale of your world, scale the first group, keep the
second, and re-check the third.

## 11. Starting values (one table)

The numbers that held up, in one place; the 3D template's `harness.js` uses them as defaults.

| Thing | Value | Relative to |
|---|---|---|
| Card thickness | 1.5-3 % | hero height |
| Print layers | `P.layer` at depth 1 (0.1 unit, ~2 px at the template framing): shadow ~0.11 unit away from the light, lip ~0.09, a big layer's even pale edge (`rim`) ~0.12; the silhouette's cut edge is `P.rim` / `edgeWidth` 0.08 in the 3D template's popups (kit default 0.06; ~1.5 % of the hero) | hero 3.6 units |
| Bridge (`bridge()` in `built-ground.js`) | a plank deck between two side cards: ramps 26 deg over ~55 % of each half span, crown 8 deg, parapet ~0.3 x hero over the deck, sides leaning out 18 deg | hero 3.6 units |
| Walkable step | the walk field climbs at most ~0.2 x hero between surfaces (`WalkField` `step` 0.75); stairs are thin plank treads on two stepped stringers, rise <= ~1/8 x hero (0.45), run ~0.3 x hero (1.1) (`mechanisms.md` section 14) | hero 3.6 units |
| Layer gap (stacked flats) | 5-15 % | object height |
| Key / fill / sky | key 1, frontal fill ~0.27, sky ~0.14 (template 3.0 / 0.8 / 0.42; colours per light: `assets/lights.json`) | intensity |
| Shadow leak colour | the world's shadow colour: `#a0602c` on a warm ground by day, lilac-blue on snow, deep teal under water, navy at night (per light: `assets/lights.json`) | multiplies the key in shadow |
| Penumbra | 0.2-0.3 x caster-receiver gap | world units |
| Contact occlusion radius | ~0.4 x hero height, tinted with the world's shadow colour (`aoTint`; `#5a3214` on a warm ground) | |
| Tilt-shift | visibly sharp band ~36-45 %, focusHeight ~0.55-0.75 (3D template: `focusBand` 0.3, `ramp` 0.3), max blur 12-18 px radius (3D template 18), near gain 1.5-1.6 | frame height, 1080p |
| Grade | ACES, exposure ~0.82, contrast ~1.18, tint (1.03, 0.985, 0.98), saturation ~0.96, green pull 0.3 (<= 0.1 for teal accents), no colour haze | template |
| Grain / vignette | ~1 %, less inside the blur / 0.03 by day to ~0.12 at dusk and night, warm | |
| Flap rise | 0.2-0.3 s to upright, overshoot 8-15 %, quiver 4.5 Hz, still by 0.6-1.1 s | |
| Flap fall | still by 0.5-0.8 s, one bounce under 3 % | |
| Stagger | 0.3-0.35 s across one piece; ~0.02 s per unit of distance across a scene | |
| Idle sway | 0.5-2.5 degrees about the piece's own hinge, 0.4-0.8 Hz, rigid things 0 | |
| Flap sound | one per gesture, >= 0.5 s apart, band-limited around 2.6 kHz | |

## 12. Fake-paper tells (ban list)

| Tell | Do instead |
|---|---|
| Glossy or specular highlights, environment reflections, PBR defaults | diffuse-only paper material with wrap light |
| Grey or black shadows; one identical drop shadow on every layer; a colour fog or sepia filter over the frame | shadows coloured by the world (warm amber on warm ground by day, lilac-blue on snow, teal under water, navy at night) that follow the light and grow with the gap; mood in the light, leak, haze and grade, never in a filter |
| Zero-thickness planes; cards seen edge-on | real thickness; cards facing the camera (+-14 deg), slotted crosses ~24 deg off the view (`structures.md`) |
| An even pale or white band round every silhouette; glowing or torn edges | dark silhouette line + pale highlight only on the lit edges; no edge on folds |
| Flat vector fills, clip-art shapes, tone-on-tone prints, thin ink drawings on one colour; plush felt or woven textures | layered collage prints: parts with a lit-side lip and a short soft shadow, 3-5 inks, 3+ value steps, an ornament, fat motifs in contrasting accents, one quiet fibre (`P.layer`, `drawnPiece`) |
| A hero that is one flat card | a small 3D paper model (~10-20 cards, a frontal + profile T per part, limbs on hip and shoulder pivots) that yaws to face the way it walks: a readable face, costume detail, chunky toy proportions, colours that contrast with the ground, in the sharp band (`mechanisms.md` section 12); flat mirrored cards only in 2D or for critters |
| A bridge, stair, dock or deck made of one standing card; the hero walking through a rail or floating over a deck | build it open: a plank deck between two side cards, a deck on posts (a posts face with gaps cut to the base), stairs of thin treads on two stepped stringers (rise <= ~1/8 of the hero); the walk field reads it (`mechanisms.md` section 14) |
| Raised natural terrain: a block, plateau or island with strata on its face | a flat ground; height from 3-5 nested curved hill cards stepped ~10-15 % in value and clusters of tall slanted two-tone rock cards; a solid printed face only for built masonry the brief names (a quay wall, a stage) |
| A full-screen noise overlay pretending to be paper | fibre fixed to the surfaces; screen grain ~1 % at most |
| Everything sharp, or everything blurred | one sharp band (~36-45 % of the frame) on the subject, blur above and below driven by depth, big blurred cards along the bottom edge |
| Neon, saturated video-game green, pure white, pure black; a ground as dark or saturated as the cards | the brief's own palette with muted paper greens, cream and a dark ink; the ground ~0.16-0.22 brighter and ~0.16-0.25 less saturated than the cards (a dark floor the brief names, black sand or slate, is darker instead, with the pieces lighter than it) |
| Scale-pop, squash-and-stretch, fade-ins, sliding cut-outs | rotation about a crease with overshoot and quiver |
| Constant busy motion, bouncy idle loops | stillness with small wind sway; bold motion only for one-off events |
| A few small props on an empty plain; confetti; a stamped repeat; a visible tile grid | a packed sharp band (`measure.py` barePct <= ~55): groups of 4-8 different pieces from ~20 kinds, at most ~3 identical props in view, open ground mostly outside the band; one continuous printed ground |
| A horizon, sky, backdrop, table or book edge in frame; a flat side view | the camera looks 40-55 deg down into the world and the ground runs past every edge |
| HUD panels, glossy buttons, x-ray outlines, scenery that bends or turns see-through for gameplay | diegetic paper, ink and light; move the camera instead (`paper-ui.md`) |

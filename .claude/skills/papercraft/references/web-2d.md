# The pop-up style in 2D: Canvas, SVG and CSS

How to carry the same pop-up book style into 2D (Canvas 2D, SVG, CSS): printed cards standing on hinges on a printed
ground that runs past every edge of the frame, seen through a camera looking down into the world with a mild
perspective; shadows cast along the light onto the ground, a tilt-shift band, hinge motion.

Read this when: making a 2D scene, side-scroller, parallax piece, animated illustration, banner, or any web page whose
artwork should be layered paper. For interface components (panels, buttons, HUD) also read `paper-ui.md`.

Contents: 1 Which 2D tech; 2 The 2D paper recipe; 3 Canvas 2D; 4 SVG; 5 CSS; 6 Motion in 2D; 7 Video from 2D

## 1. Which 2D tech

| Need | Use |
|---|---|
| Animated scene or game: a pop-up world of many printed pieces | Canvas 2D (`assets/templates/popup-2d/`) |
| Static or lightly animated illustration, crisp at any size, editable | SVG with filters |
| Page sections, cards, panels, transitions on a website | HTML + CSS (+ an SVG filter for fibre) |
| Thousands of sprites, shader effects | WebGL: the 3D template and `paperkit-3d.js` with their perspective camera (the 26 deg lens is already near-orthographic; `PaperPost` needs a `PerspectiveCamera`, and an orthographic view read as "a 2D map", section 3) |

## 2. The 2D paper recipe

A 2D scene in this style is the 3D pop-up world drawn through a camera that looks DOWN INTO it (pitch 40-55 deg, 40
in the template, with a mild perspective): the printed ground runs past every edge of the frame and every piece is a
printed card standing on a hinge at its base. No horizon, sky, backdrop, book edge or table in frame unless the brief
is literally a book or a page inside a UI: a flat side view with a sky backdrop is a fake-paper tell (a blind critic
scored such a 2D city 2/10).

1. **Ground.** One continuous printed sheet larger than the frame, of this world's own floor (deck plates, sand,
   snow, tiles, meadow): two-tone washes, regions torn with a pale fibrous fringe, the subject's own leading line (a
   corridor, a current, a road, a track; a river only if the world has water; section 3), small marks in drifts (tufts
   and flowers in the countryside example, rivets or shells elsewhere), the paper sheet multiplied over it. Landmarks
   by hand, then groups and clearings from a slow noise (`worlds.md`).
2. **Cut outline + print.** Build the outline (`P2.shape.*`; mounds on a flat base, such as bushes, rocks, coral
   heads or drifts, with `shape.mound`; hand-cut with `P2.roughen`) and print it with `P2.printCard(outline, { paint,
   sheet })` as a layered collage (law 4: 3-5 inks in 3+ value steps, an ornament, contrasting motifs), inner shade
   on the side away from the key, contact darkening toward the base, paper fibre multiplied in.
3. **The cut edge** with `P.rim()`, which derives both tones from the print: a thin dark-brown line at the silhouette
   (~1.5-2.5 px on screen) and a pale highlight just inside it only on the edges that face the light; never an even
   pale band. Folds get no edge: `skip` the hinge base and panel joins (`look.md` section 3).
4. **Shadows on the ground** in the world's shadow colour, never neutral grey (the harness's `shadow` option, from the
   leak of the brief's light preset in `assets/lights.json`: warm umber on a warm ground by day, lilac-blue on snow,
   navy at night): the silhouette projected along the light (section 3), plus a soft contact pool under each base so
   every standing piece touches the ground.
5. **Light.** One key ~54 deg up (template `[-0.7, 1.1, 0.4]`), from the side and a little from the front, so
   shadows fall sideways and behind, where the camera sees them: at ~65 deg they hid behind the cards, lower they
   rake into long streaks, and under a pure side key cards that face the viewer cast only thin slivers. 2D has no
   lights and no tone mapper: bake a mild grade (saturation and contrast) into the prints and the ground once; at
   most a faint warm vignette, never a colour fog or a sepia multiply.
6. **Tilt-shift.** One sharp band through the subject (~36-45 % of the frame height looks crisp; `measure.py`
   focusHeight reads ~0.55-0.75, gate >= 0.35; the template's `band` 0.28 plus its ramp), blur growing above and below; big blurred pieces
   overlapping the bottom edge sell the miniature scale.

## 3. Canvas 2D

`assets/templates/popup-2d/` wires all of this in two files: the fixed harness `harness-2d.js` (projection, sprites,
shadows, lens, raised surfaces, walking, clock, capture hook) and your `scene.js` (the bundled one is the countryside
worked example). In your own folder copy `assets/lib/` and `harness-2d.js`, keep the harness as it is, and point
`"papercraft/"` in the page's import map at the folder that holds `lib/` (the template maps it to `../../`). The
important implementation points:

- **Projection.** Pitched 40 deg (`VIEW.pitch`) with a mild perspective: a world point (x, y, z), z toward the viewer,
  lands at (CX + S k x, CY + S k (z sin(pitch) - y cos(pitch))) with k = D / (D - z cos(pitch)) (`VIEW.dist` D = 70
  units): near things bigger, far things smaller, the cue that separates a photographed model from a map (a blind
  critic read the orthographic version as "a 2D map", 3/10). Each card scales uniformly by k at its base. A card point
  (u, v), v up the card from its fold line, on a card folded forward by phi lands at screen y = base - S k v cos(phi +
  pitch): a fold is a vertical scale of the print by cos(phi + pitch), one exact `setTransform` per card; negative
  shows the kraft back.
- **Ground in depth strips.** `drawImage` is affine, perspective is not: draw the printed ground in ~160 thin strips
  of depth, each scaled by its own k (`buildGroundLayer()`); once per size, so it costs nothing per frame.
- **Slotted crosses and turned cards.** For a slotted piece (a tree, a lamp post, a coral fan: `slotted: true`) draw
  a narrow (0.16 wide), darker copy of its print over its middle: the crossed half seen nearly edge-on, the spine
  every slotted cross shows. Turn small cards a little about their hinge (horizontal scale cos(yaw), yaw +-0.35) so
  not everything faces the camera flat. A layered piece is two stacked cards, the back one darker and taller, the
  front one lighter and ~0.45 nearer (the countryside example's bushes).
- **Fold toward the viewer** (face down): phi = (1 - p) x 90 deg from a `FlapSpring`. The rise sweeps through
  edge-on (k = 0 at phi = 90 deg - pitch) and reads as a rotation; overshoot (p > 1) tips the card a little past
  upright. A card folded back in a pitched view only grows taller on screen (k runs sin(pitch), 1, cos(pitch)) and
  reads as a scale-pop (found by a test agent).
- **Draw order.** Folded forward, the farthest card lies on top of the flat stack, so it rises first (template: far to
  near over ~1.1 s; closing near to far over ~0.6 s). Each frame draw the cards still lying forward (k <= 0) first,
  nearest at the bottom, then the standing ones far to near.
- **Cast shadows** are the silhouette projected along the light onto the ground, an exact affine map of the print.
  With L toward the key (x right, y up, z toward the viewer; template `[-0.7, 1.1, 0.4]`, normalised),
  a = -cos(phi) Lx/Ly and b = sin(phi) - cos(phi) Lz/Ly, a card point (u, v) on a base at screen (x, y) lands at
  `x' = x + S*u + S*a*v`, `y' = y + S*sinP*b*v` (sinP = sin(pitch)). Draw a pre-blurred, half-resolution silhouette
  in the `shadow` colour through that matrix (alpha 0.5 x p; S becomes S k for the piece's depth), then a soft radial
  contact pool under each base (alpha ~0.65 x p), then the cards. A 2D frame's lumaP5 sits near 0.29-0.32, at the top
  of the day gate: if `measure.py` flags "no darks", deepen the contact pools.
- **Shading.** Over each card draw a dark copy of its silhouette at alpha (1 - lit) x 0.9, with lit = 0.62 + 0.3 x
  wrap(n.L) + 0.12 x max(0, k), wrap(d) = max(0, (d + 0.3) / 1.3), n the normal of the face you see; the k term is a
  fill from the camera side, so cards facing the viewer never go grey.
- **Grade.** Bake the harness's `grade` into each print sprite and the ground layer when you build them (`ctx.filter`;
  the template's `saturate(1.3) contrast(1.08)` is tuned on its colourful example: lower the saturate for snow, mist
  or pale briefs and check satMean); multiplying a key colour over the finished frame went muddy and sepia (a blind
  critic: "17 % vivid pixels against 34-59 %"). Then a faint warm vignette (alpha <= 0.08).
- **Tilt-shift.** Pre-blur each print once for where its middle stands in the frame (`ctx.filter = 'blur(Npx)'`, N in
  print px). Project the ground to a screen-size canvas once per size and draw a copy blurred by the max blur over it
  through a vertical gradient whose alpha follows the blur at each row (`buildGroundLayer()`). Template: band 0.28 of
  the frame height centred at 0.55, ramp 0.3, max blur 9 px at 1080p (a CSS `blur()` length is the Gaussian's
  standard deviation, about half the radius of a disc blur).
- **Cache everything.** Print each card once; keep its sprites (blurred print, dark copy, kraft back, half-resolution
  shadow) in offscreen canvases. Per frame you only `drawImage`. Never `getImageData` or apply filters per frame.
- **Print near on-screen size, smooth at 'medium'.** A card printed at 2x and drawn down with
  `imageSmoothingQuality = 'high'` rings into a pale halo round every shape (the banned sticker halo). Print at ~1-1.25
  print px per screen px (template: 1.25, clamped to 16-48 px per unit) and use `'medium'`.
- **The 2D template** is a fixed harness (`harness-2d.js`: projection, ground sheet, pieces, raised surfaces, lens,
  walking, capture hook) + your `scene.js`: `const H = createHarness2D({ view, light, grade, ground, shadow, kraft,
  walk, play })`, `H.printGround(t => ...)` (your world's own ground; tools `washes`, `ribbon(fx, w, colour, wobble)`,
  `line` along any polyline, `drifts`), `H.piece(pts, paint, { x, z, y, yaw, sway, seed, slotted, sharp, holes,
  float, bob, reflect })` (`float`: never touches the ground, so no shadow and no contact pool; `bob`: a floating
  piece bobs; `reflect`: a faint dark mirrored silhouette under a floating piece, alpha 0.22; prefer printed
  reflection marks on the water, `structures.md` section 6), `H.decks.push({ z, draw, shadow })` for every raised
  surface, `H.walk` (add its surfaces, blocks, walls and solids), `H.setHero(body, { parts, step })` (a puppet's
  cards: `{ p, dx, dy, dz, leg }`, `leg: 0 | 1` on the two leg cards; `step`: the step length, default 0.9),
  `H.start()`. Prints of your own (a deck, a roof) use `H.Q` (print px per unit), `H.sheet` and `H.mk(w, h)`, and you
  bake `H.grade` into them (`ctx.filter = H.grade` when you copy the print, as the example's deck does): the harness
  grades only its own pieces and the ground. The capture hook: `restart()`, `step(seconds)`, `resume()`, `toggle()`,
  `place(x, z)`, `walkPath(points)`, `look(x, z, zoom)` (default zoom 1.8; or `?view=x,z,zoom`: a review camera that
  moves the projection only, while the prints keep the blur baked for the main view, so judge the lens there),
  `fps(ms)` (live-loop frames per second; machines without a GPU read low: compare with the template's own number
  there), `walk`, `hero`, `pieces`, `buildMs`, `ready`. There is no `?test` or `?diag=key` in 2D: prove the material
  on the first frame's 3x crops, and see where the shadows fall by passing `shadow: '#000000'` once (they draw at
  alpha 0.5 x p).
- **Measuring a 2D world**: use the profile of its light: `storybook` by day, `dusk` for golden hour and dusk, `night`
  at night (`flat` is only for UI pages and print and switches the lens and density gates off). barePct counts a
  canal, a river or a path through the sharp band as bare: dress their banks, do not fill them.
- **Units.** Fix the world width across the frame and scale by `devicePixelRatio` (capped at 2). Tie the width to the
  hero's share of the frame height (law 8): `across ~ hero x cos(pitch) x 16 / (9 x share)`; a 3.2-unit hero at 40 deg
  and 8 % gives ~54, the template's value (64 put him at ~7 %; a test build at 52 read much denser). `printCard` caps
  a card at 2048 px and returns the scale it actually used (`pxPerUnit`): draw with that, not with your requested
  value.
- **Canvas shadows ignore the transform.** `shadowBlur` and `shadowOffsetX/Y` are in device pixels; if you use them
  (instead of shadow sprites), multiply by your scale.
- **Wind and bob.** Add `windSway(t, x, z, { amp, heroHeight })` to phi of standing pieces, times p so it fades as
  they fold (amp 0.5-2.5 deg for foliage, 0 for buildings); never an in-plane rotation that lifts a foot. Bob floating
  pieces (boats) a little with a slow sine.
- **Lit windows and lamps in 2D.** Print panes in the lit colour (`#ffc45a`-ish) with a dark frame; at dusk / night
  draw each lit pane again after its card with `globalCompositeOperation = 'lighter'` and a soft radial glow (radius
  2-4x the pane, alpha 0.2-0.45), and let panes switch on one by one after their card stands. Off panes are dim amber
  paper, never black. The harness has no glow option: push a `decks` item keyed just in front of the card (`z: card.z
  + 0.0005`, so `render()` draws it right after the card) whose `draw()` works inside `H.g.save()` / `restore()` (it
  inherits the card's transform and must not leave 'lighter' on), resets the transform and adds the glow at
  `H.proj(card.x + u, v, card.z)` for a pane at (u, v) on the standing card, times `card.spring.p`. A 2D mood (golden
  hour, dusk, night) keeps the world's prints and re-lights them through the `grade` filter, the `shadow` colour (the
  preset's leak in `assets/lights.json`) and the `ground`, plus lit panes: there are no lights to retune.
- **Life** (weather, flyers, creatures: `motion.md` section 12; `lib/paper-life.js` is the 3D plumbing): in 2D draw the
  same kinds as small cut shapes in the air and on the page, with the same numbers. Fallers are creased and rock
  face-up, then rest on the page and shrink away; flyers fly side-on and flap by one crease angle, never a scale;
  creatures are cards that flip to turn, with a behaviour. Only something that must fold with the page (a kite, a
  hanging sign) hangs on a paper stalk or a wire from a card, and folds flat with it.
- **Performance.** Per frame the template draws one pre-projected ground image and ~4 `drawImage` per card (shadow,
  pool, print, dark copy). Measure fps in the live loop: timing `step()` misses the canvas work the browser defers
  past your code. The [0, 0.05] s clamp turns a frame rate under 20 fps into slow motion, not dropped frames. Very
  wide worlds: split the ground into segments or print it at a lower `pxPerUnit` (the template's ground prints at
  <= 20 px per unit).
- **Interactive 2D** (a game, a walking hero). The template bakes the projected ground and each print's tilt-shift
  blur for ONE camera: keep the camera fixed and frame the whole play area, or pan by translating the projected
  ground layer and rebuild it (and the blur) only when the camera rests. Cards that move print with `sharp: true`
  (no baked blur), or bake 2-3 blur levels and pick one by screen y. Keep a low-dress corridor in front of the
  subject (tall near pieces hid the bridge and the hero in a test) and check every group member for space, not only
  the group's anchor: the example scene's `corridor()` and `free()` show one way, write your own for your layout. The
  walk cycle: `motion.md` section 8.
- **Leading lines in any direction** (one by default; water only if the brief has it). `P2.pathLine([[x, z], ...])`
  returns `{ pts, dist }`: print a band through `pts` as torn paper with a pale fibrous border, both edges jittered,
  never a smooth stroke, bending twice in frame (`structures.md` section 6); keep pieces off it with `dist(x, z)`, so
  one spec drives the print and the placement (the template's `x = f(z)` helpers cannot turn back).
- **Built structures in 2D** (bridges, boardwalks, piers, platforms, stairs: `mechanisms.md` section 14). Never one
  bridge card standing on the water. Build them open, from the same parts as in 3D, drawn through your projection
  (a solid printed face only for built masonry the brief names, never for natural terrain):
  - **Sides and faces** are ordinary standing cards along x: a bridge's two sides at the deck's far and near edges
    (foot on the banks, an arch over the water, a parapet over the deck line; the NEAR one lower so the deck shows
    over it), a platform's face card at its front edge (posts with the gaps cut down to the base).
  - **The deck** is a surface, not a card: its own print (planks across it, the top row = the far edge) mapped through
    `proj` in narrow strips along x, each strip shaded by its slope against the key, so an arched deck bends
    (`drawDeck2D(g, proj, { print, x0, x1, z0, z1, heightAt, rise })` in the core kit), plus a fascia band on its near
    edge when no rail covers it, and its soft shadow on the page or water (`deckShadow2D`).
  - **Draw order.** A deck is one item in the depth-sorted list keyed at its FAR edge (z0): after the cards behind it
    and its far side card, before everything standing on it and its near side card. Pieces standing ON a raised
    surface draw their cast shadow and contact pool immediately before themselves (onto the deck), not in the
    ground-shadow pass that runs before all cards. The template keeps every raised surface in its `decks` list
    (`{ z, draw(), shadow() }`, z = the key): push yours there and `render()` sorts each one in.
  - **Rise.** A deck rises with the card it hangs on: a parallel fold whose face card folds forward by phi puts the
    deck at height h cos(phi), shifted toward the viewer by h sin(phi), level the whole way; pieces on the deck start
    after their face card (~0.1 s later). `drawDeck2D` / `deckShadow2D` take `rise = cos(phi)` and `shift =
    sin(phi)` for a deck or a roof that hangs on a card tipping forward, so it stays on that card mid-rise (scaling
    the heights alone floats a roof off its gable). A bridge whose sides stand up scales its heights by their p.
  - **Roofs, side walls, awnings, sign boards** (a box fold in 2D: a facade card, its darker side wall, two roof
    planes): `drawSurface2D(g, proj, { print, o, u, v, light3 })` maps any flat printed parallelogram through `proj`
    in strips (a roof slope that rises across x while it runs back in z, a wall along z), shaded by how far it turns
    from the key. A surface long in z sorts with ONE key: keep standing pieces out of its depth band or split it into
    keyed parts. A wall along z is nearly edge-on to a centred camera (~10-15 px): show it where the camera sees it.
  - **A deck must differ from its side faces** in unit size and value (small round cobbles or narrow planks on a
    darker bed, against big stones on the sides), or in the pitched view it reads as a third wall, not a floor.
  - **Walls stop the hero**: off the deck, a block strip or a `walk.wall` segment along each side card (where the deck
    is low near the banks he would step straight through them); keep it off the paths that arrive at the ends.
  - **Openings**: `piece(pts, paint, { holes })` cuts a door, windows or the gaps of a ladder or a wheel through a
    card and rims each like the outline; what shows through is whatever is drawn behind (a loft's back card).
  - **Decks into the depth** (a bridge over a canal or tracks that run along x, a pier, a gangway): `drawDeck2D({
    along: 'z' })` (strips from far to near, heights along z). If it stands higher than what is beside it, key it at
    its NEAR edge (it must cover the face and whatever runs under it), split its landings off as their own items, and
    draw a hero on it right after it. Its sides run along z and are nearly edge-on to this camera: draw them as
    projected quads (`drawSurface2D`, or the wall's top and foot through `proj` in strips) leaning ~15-20 deg outward,
    so their faces show, as lattice or planks with posts.
  - **Stairs in 2D**: thin plank treads on two stepped stringers, as in 3D: one narrow deck strip per tread at rising
    heights (rise <= ~1/8 of the hero's height), open between the treads or with a thin dark riser, and the two
    stepped side cards along the flight; never stacked blocks. The walk height steps with the treads.
  - **Walking.** `WalkField` (`paper-motion.js`, engine-free) with world-space surfaces `{ heightAt(x, z) }` (null off
    the deck), the water as a block, houses and trees as solids, a `radius` for the hero's feet; draw the hero at
    `proj(x, y, z)` with y from the field. The hero is a doll (`mechanisms.md` section 12), never one card (a 2D stage
    cannot yaw a model as the 3D harness does, so here it mirrors): the body card slides along the field and turns by
    flipping its x scale with a cut at the midpoint (|scale| jumps from 0.3 to -0.3, never edge-on);
    `setHero(body, { parts, step })` makes the parts follow it (x offsets mirror when he turns), rise with its spring,
    and step the two leg cards (`leg: 0 | 1`) with the distance walked (`step`: the step length); pass `float: true`
    on the parts that never touch the ground (no shadow or contact pool of their own). The 2D harness walks by default
    (`play: true`; `?still` turns it off); `__papercraft.place(x, z)` and `__papercraft.walkPath(points)` script it.
- **Side-scrollers and parallax** keep this camera: the world stays pitched (40 deg in the template) with the ground
  past every edge, and the view scrolls along x by translating the projected ground layer (Interactive 2D above).
  Parallax lives only between the big blurred near cards and the world, never in layers before a sky or a printed
  backdrop: that flat side view is the fake-paper tell of section 2.

## 4. SVG

An SVG scene uses the Canvas framing and projection (sections 2-3): the printed ground runs past every edge of the
viewBox; each card is a `<g transform="matrix(1 0 0 k x y)">` round art drawn with its base on y = 0 and its top
toward -y (the back art when k < 0); its cast shadow is the same silhouette through `matrix(1 0 -a -sinP*b x y)`,
filled with the world's shadow colour (section 2), blurred, at ~0.5 opacity. Flats lying on a page (a page inside a
UI, a book brief) take the two drop shadows below.

```html
<svg viewBox="0 0 1600 900">
  <defs>
    <!-- fibre: fine turbulence, used as a multiply over fills (keep it subtle: 3-6 % value swing) -->
    <filter id="fibre" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9 0.6" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.94  0 0 0 0 0.91  0 0 0 0 0.86  0 0 0 0.12 0" result="tint"/>
      <feComposite in="tint" in2="SourceGraphic" operator="in" result="t"/>
      <feBlend in="SourceGraphic" in2="t" mode="multiply"/>
    </filter>
    <!-- hand-cut edge: displace the silhouette a little -->
    <filter id="cut"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/>
      <feDisplacementMap in="SourceGraphic" scale="4"/></filter>
    <!-- lit-side highlight: a pale strip just inside the edges that face the key (upper left), none elsewhere -->
    <filter id="lit-edge" x="-5%" y="-5%" width="110%" height="110%">
      <feMorphology in="SourceAlpha" operator="erode" radius="1" result="in"/>   <!-- stay inside the dark line -->
      <feOffset in="in" dx="1.5" dy="2" result="away"/>                           <!-- moved away from the key -->
      <feComposite in="in" in2="away" operator="out" result="strip"/>
      <feFlood style="flood-color: var(--piece-lit)"/>   <!-- the piece's fill mixed ~60 % toward cream -->
      <feComposite in2="strip" operator="in" result="lit"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="lit"/></feMerge>
    </filter>
    <!-- flats on a page only: tight contact + soft cast toward the lower right, in the world's shadow colour -->
    <filter id="paper-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="2" dy="2" stdDeviation="1.2" flood-color="#4a2c22" flood-opacity="0.5"/>
      <feDropShadow dx="9" dy="7" stdDeviation="7" flood-color="#4a2c22" flood-opacity="0.3"/>
    </filter>
    <path id="hill" d="..."/>
  </defs>
  <g filter="url(#paper-shadow)"><g filter="url(#cut)">
    <use href="#hill" style="fill: var(--piece)" filter="url(#lit-edge)"/>   <!-- the piece's own colour -->
    <use href="#hill" fill="none" stroke="#3a2412" stroke-width="2"/>  <!-- the cut: a thin dark-brown line -->
  </g></g>
</svg>
```

- Set `--piece` and `--piece-lit` on the `<svg>` or above: the `lit-edge` filter reads them there, not on the `<use>`.
- Flats on a page: one `<g>` per layer; apply the shadow filter per layer with offsets scaled by that layer's gap.
- Print detail as extra paths clipped to the card (`clip-path`), inks at 0.5-0.9 opacity, offset 0.5-1 px for
  misregistration.
- The cut edge is the dark stroke at the silhouette plus the `lit-edge` strip, never a cream stroke or a larger cream
  copy all round (the sticker halo). Folds (a card's hinge base) get no edge: stroke the outline as an open path that
  leaves them out.
- `feTurbulence` over large areas is expensive to repaint: rasterise heavy layers once (render to canvas or an image)
  if they animate.

## 5. CSS

For HTML elements that should be cards (sections, panels, buttons):

```css
.card {
  background: var(--page) url(paper.png);       /* your world's page colour; or an SVG data-URI feTurbulence tile */
  border-radius: 3px 5px 4px 6px;               /* slightly uneven, never pill-shaped */
  box-shadow: inset 1px 1px 0 rgba(251,246,234,.75), /* pale highlight inside the lit (upper-left) edges only */
              0 0 0 1px rgba(74,44,34,.8),      /* the cut: a thin dark-brown line at the silhouette... */
              1px 1px 0 1px rgba(74,44,34,.8),  /* ...a hair wider on the shaded side: the stock's thickness */
              2px 3px 2px rgba(74,44,34,.45),   /* contact */
              10px 14px 22px rgba(74,44,34,.22);/* cast, toward the light's far side */
  clip-path: polygon(...);                      /* optional deckle / cut outline; it clips the shadows too: put them
                                                   on a wrapper as filter: drop-shadow() (see paper-ui.md) */
}
```

- The cut edge: a 1 px dark-brown line round the silhouette, 2 px on the shaded side (the stock's thickness), and a
  pale highlight just inside only on the lit edges. Never a pale border all round (a sticker), never `#fff`.
- Layer depth in a page: increase the cast offset and blur with the element's height above the page.
- Fold-in: `transform-origin: bottom; transform: perspective(900px) rotateX(90deg)` to `rotateX(0)`, with the paper
  spring as the easing (below). Use `backface-visibility: hidden` and a kraft-coloured back if the back can show.
- Respect `prefers-reduced-motion`: show the final state with a short cross-fade instead of folds.

## 6. Motion in 2D

The same laws as 3D (`motion.md`): hinge rotation only, 8-15 % overshoot, short quiver, softer fall, stagger (in a
pitched view cards fold toward the viewer and rise far to near, section 3).
`FlapSpring` and `windSway` in `assets/lib/paper-motion.js` work in any 2D code. For CSS-only motion, the latched paper
spring sampled into `linear()` easings (size 0.3; scale the duration with size: 0.9-1.2 s up, 0.7-0.9 s down):

```css
/* rise: 1 s, 12.4 % overshoot at ~0.28 s, quiver, within 0.5 % by ~0.87 s (FlapSpring size 0.3, every 25 ms) */
--paper-up: linear(0, 0.024, 0.087, 0.18, 0.297, 0.431, 0.574, 0.72, 0.861, 0.993, 1.091, 1.124, 1.095, 1.032, 0.971,
  0.936, 0.936, 0.964, 1.003, 1.033, 1.043, 1.032, 1.009, 0.986, 0.974, 0.975, 0.987, 1.002, 1.013, 1.016, 1.011,
  1.003, 0.995, 0.992, 0.993, 0.996, 1, 1.002, 1.003, 1.002, 1);
/* fall: 0.8 s, a 2 % unlatch twitch, then down to the page at ~0.57 s, one 1.4 % slap, still by ~0.7 s
   (progress 0 = standing, 1 = flat) */
--paper-down: linear(0, -0.02, -0.017, 0.003, 0.031, 0.065, 0.105, 0.15, 0.199, 0.251, 0.306, 0.362, 0.419, 0.477,
  0.536, 0.594, 0.652, 0.708, 0.764, 0.818, 0.871, 0.922, 0.971, 0.997, 0.989, 0.986, 0.987, 0.991, 0.998, 1, 1, 1, 1);
.flap { transition: transform 1s var(--paper-up); }
.flap.closed { transform: perspective(900px) rotateX(90deg); transition: transform .8s var(--paper-down); }
```

## 7. Video from 2D

- Drive time from a frame counter (`t = frame / fps`), seed every random choice, and expose `step(seconds)`; capture
  each frame with `canvas.toBlob` (or a headless browser screenshot) and assemble with ffmpeg. Avoid MediaRecorder
  for final output (variable frame timing). The 2D template exposes `window.__papercraft.restart()`,
  `window.__papercraft.step(seconds)` (fixed 1/60 s steps, then one render) and `resume()` (back to the live loop);
  `?capture` hides the hint.
- Stop-motion only when the brief asks for it (the style moves smoothly): `motion.md` section 11 (in 2D apply its
  per-pose hinge turn and slide to each card's phi and x).
- Sound: render the paper foley offline from the same event list (`renderOffline` in `assets/lib/paper-sound.js`),
  keep music as a separate stem (`sound.md`).

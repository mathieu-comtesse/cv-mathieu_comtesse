# Paper UI: feedback, screens and web interfaces made of paper

How to give feedback and show interface in a papercraft world: diegetic paper, ink and light first; a sheet of paper
when a screen is unavoidable; text-free cut-paper icons; type and colour rules; and HTML/CSS/SVG recipes for web pages
and app UIs in the same style.

Read this when: a paper game or scene needs a HUD, menu, map, inventory, counter, hint or icon set; building a web page
or app UI in the papercraft style; or when you are about to add an outline, overlay or indicator to make something
readable.

Contents: 1 The rules; 2 Diegetic feedback first; 3 A screen is a sheet of paper; 4 Cut-paper icons; 5 Type and
colour; 6 Web pages and app UIs; 7 Anti-patterns; 8 Checks before you ship

## 1. The rules

1. **No chrome.** Start a paper game with zero chrome: no HUD, panels or buttons. Feedback is paper, ink
   and light inside the scene. Toggles are keys, listed once in a fading hint. Hide the cursor.
2. **When a screen is unavoidable, make it a sheet of paper:** procedural cardstock, a neatline frame, serif small caps
   and ink linework. It slides in like a sheet and throws a shadow ahead of its leading edge.
3. **Ink, not black; cream, not white.** A dark ink from the world's palette at 0.55-0.86 alpha, a cream page and a
   lighter cream core (small highlights, edge highlights, text on dark; never a large fill, section 5); the countryside
   build used `#5a3a28` / `#efe0c2` / `#fbf6ea`.
4. **Ink every line by hand:** jittered ends, slight bulges, uneven widths, a little bleed. Printed areas end in torn
   edges, not rectangles.
5. **Make every icon a cut-paper piece:** 2-3 layers, the cut edge of `SKILL.md` (a thin dark line, pale only on the
   lit side), no black outline or glow, no text.
6. **Get readability from design and camera, never from indicators.** If something must be seen, redesign the piece or
   move the camera.
7. **The only glow is light on paper:** lamps, a sheen, light through thin paper, a warm vignette. Chrome never glows.

## 2. Diegetic feedback first

The recipes below are written with one example world's pieces (collectibles as paper leaves, shells, flowers and
stars; goals as lamps). Keep the verbs and put your subject's own pieces in them: a porthole that lights, an anemone
that opens.

| Need | Paper answer | Not this |
|---|---|---|
| Show where the player clicked | a hand-inked dashed ring with a small cross, printed flat on the ground | a cursor, a 3D marker, a glowing ring |
| Make a collectible findable | a small leaning card on a strut, glued down by a pale round tab | an outline, a bobbing arrow, sparkles |
| Confirm a pickup | the piece hops, flies to the player and shrinks away; one quiet chord-tone note (`sound.md`) | a "+1" popup, a counter flash |
| Mark a milestone | every 10th pickup bursts into a ring of 8 small copies that flutter | a progress bar, a badge |
| Confirm a goal | a paper lamp catches: the pane glows up with an overshoot and a dying flicker; paper-bit sparks rise | a checkmark, a fanfare |
| Keep a hidden player readable | after ~0.4 s hidden behind a big piece, the camera eases up or around | an x-ray outline, a see-through circle |
| Explain the controls | one line of serif text that fades out at the first input | a tutorial panel |
| Show totals, a map, an inventory | the sheet of section 3 | a HUD counter |

**Ink mark for a click target.**
- Ring: 9 dashes on a ring of radius r.
  - Each dash covers 50-66 % of its ninth of the circle; start angle +-0.06 rad; radius 0.96-1.04 r.
  - Draw each dash as 3 sub-segments with +-1.5 % radius wobble; stroke width 0.75-1.25 x a base of 0.085 r.
- Cross: half-size 0.2 r, two strokes of unequal width.
- Ink at 0.5 opacity, lying flat on the ground (a hair above it, with polygon offset in 3D), rotated by a hash of its
  position.
- Fade in over 0.1 s; fade out over 0.9 s after arrival or cancel.

**Paper pieces that pop** (collectibles, small rewards):
- **Build:** a card leaning back ~0.6 rad on a strut, glued to the page by a round pale tab (an 8-gon of radius ~1.7 x
  the card's size). The tab makes the piece readable from the play camera on a busy page; without it, a terracotta
  leaf vanished on an autumn page.
- **Place:** pieces go on open ground, outside every prop's footprint, and out of the strip a tall prop hides from the
  camera. At about 15 px tall at 720p they are easy to miss beside trees.
- **Idle:**
  - rock +-0.13 rad at 1.7 rad/s, turn +-0.42 rad at 0.8 rad/s, bob ~6 % of its size;
  - a light band crosses the card every 3.4 s (strength 0.4, halved at night);
  - self-light 6 % by day and 30 % at night (paper, not lamps).
- **Appear** with the "pop" verb, ~0.4 s after the ground under it starts rising.
- **Collect** over 0.7 s:
  - a hop in place for the first 30 %, then a smoothstep flight to just above the player's head;
  - spinning `u^2 * 2.5` turns and shrinking away at the end (no size pulse: only the pop, flip and shrink-away
    verbs may scale a piece);
  - it glows 0.4 in flight (thin paper lets light through).

  The pop, flip and shrink-away verbs are in `motion.md` section 9.
- **Flourish** (every 10th of a kind): 8 copies at 0.62 scale burst from a ring of ~0.4 to ~3.3 x the piece's size over
  0.95 s, arcing up ~2 x its size and fluttering.
- No pickups while a sheet is open.

**Goals that catch light** (lamps in the example; any goal that lights up works the same way). Light the lamp when the
player comes within ~1.5 player heights, using the "catch" curve in `motion.md` section 9 (an eased rise with
overshoot over 0.6 s, then a dying flicker).
- **Unlit pane:** dim amber paper `#8a6f4a`. Never near-black: that read as a black blob on the print. At night, add a
  faint cold glint (`#6f9cff` at 0.42, shimmering `0.82 + 0.18 sin(1.7 t)`).
- **Sparks:** ~7 warm paper bits (`#ffc45a`), life ~1 s (x 0.7-1.2), rising ~1 player height per second. They flutter
  by scaling one axis by `0.55 + 0.45 |sin|`. Warm paper by day, glowing at night.

**Light and timing.**
- Light behaves like light on paper: a day vignette toward warm corners, a lamp pool at night, a soft shadow under
  anything that slides over the scene, a sheen band crossing a card, a glow through thin paper.
- Arm rewards only after the player has really acted (the first input, or moving about one player height from the
  start). A reward that fires while the scene is still opening is neither felt nor earned.
- **The hint:**
  - one centred line near the bottom: 13 px serif, weight 500, letter-spacing 0.14 em;
  - warm cream `rgba(255,240,214,.78)` over the scene, with a soft dark text shadow;
  - no panel, and `pointer-events: none`;
  - it fades out over 1.4 s at the first input, and never appears in captures or screenshots. The templates' hint is
    a plainer italic line that does not fade; their `?capture` switch removes it, so load every capture with it.

## 3. A screen is a sheet of paper

A map, inventory, journal or pause screen is a physical sheet sliding over the scene, not a window. Draw it with
Canvas 2D into textures (or build it in HTML, section 6), and composite it after the post chain (`three-js.md`). It
costs nothing while closed.

**Cardstock.** Use `paperSheet({ color: <your page colour>, seed })` from `assets/lib/paperkit-2d.js` (the countryside
build's page: `#efe0c2`), or draw it yourself
(u = min(W, H) / 100, seeded from the world seed):

| Layer | Count | Size | Colour |
|---|---|---|---|
| base | | | your page colour (`#efe0c2` in the countryside build) |
| soft radial blotches | 60 | radius 8-30 u | light `rgba(251,246,234,.16)` or dark `rgba(205,180,134,.13)` |
| fibres (quadratic, bend +-30 %) | W x H / 520 | length 0.5-2.2 u, width 0.05-0.14 u | 55 % light `rgba(253,249,240,.2-.5)`, else `rgba(176,146,100,.1-.26)` |
| specks | fibres / 3 | 0.1 u | `rgba(120,88,56,.05-.17)` |

**Frame it like an atlas plate**, the way a printed map is framed:
- an outer neatline inset 0.55 u (ink alpha 0.8, width 0.2 u);
- an inner rule (alpha 0.55, width 0.08 u);
- tick marks along the frame every 1/12 of its height (alpha 0.5), like degree marks.

**Print in the paper, not on it:**
1. Multiply the print over the sheet, so the fibres show through the ink.
   - Lay a 16 % veil of the page colour over it (matte, a little faded).
   - Add a per-pixel tooth of +-1.5 %, and feather the frame edge by 1.5 px.
2. Tear the edges of printed areas.
   - Make a low-res mask (about 4 px per map cell) and nibble each open side by a hash.
   - Upscale it with smoothing, and apply it with `destination-in`.
3. Ink borders and coastlines with `inkPath` (below).
   - Dashed paths: `setLineDash([0.11, 0.09])` in cell units, at alpha 0.62.
   - Blank paper gets a faint graticule: ink at alpha 0.075.
4. Marks:
   - a lamp is a radial glow from `rgba(255,196,90,.75)` to 0 at 3 r, plus an ink-rimmed amber dot;
   - the player is a pin in the accent colour with a cream highlight, an ink stem and a soft ground shadow;
   - a compass is 8 ink points, with the north one in the accent colour and a single small "N".
5. Light the sheet.
   - By day: a vignette toward warm corners (edges x (0.78, 0.70, 0.60)).
   - At night the page is read by a lamp pool: `col * ((0.2, 0.22, 0.34) + (1.0, 0.76, 0.46) * 0.92 * exp(-3.2 r^2))`.

**Margin legend.**
- Separate groups with thin printed rules (alpha 0.22); give each group an icon with an italic count.
- Draw things not yet found at alpha 0.32 (a "blind print") instead of hiding them.
- Flow the legend into 1-3 rows, and pick the layout with the largest icons.

```js
// Hand-inked polyline: jittered shared corners, a small bulge per segment, three strokes for ink bleed.
function inkPath(g, pts, w, rng, ink = '#5a3a28') {     // pts ~20-60 px apart; vary w +-25 % between lines
  const P = pts.map(([x, y]) => [x + (rng() - 0.5) * 4 * w, y + (rng() - 0.5) * 4 * w]);
  const path = new Path2D();
  path.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) {
    const [ax, ay] = P[i - 1], [bx, by] = P[i], b = (rng() - 0.5) * 0.22;    // bulge +-11 % of the segment
    path.quadraticCurveTo((ax + bx) / 2 - (by - ay) * b, (ay + by) / 2 + (bx - ax) * b, bx, by);
  }
  g.save(); g.strokeStyle = ink; g.lineCap = g.lineJoin = 'round';
  for (const [a, k] of [[0.1, 8.5], [0.1, 3.7], [0.78, 1]]) { g.globalAlpha = a; g.lineWidth = w * k; g.stroke(path); }
  g.restore();                                            // thin UI lines: skip the 8.5x bleed pass
}
```

**Motion and input:**
- **Open:** slide the sheet up from below over 0.7 s, cubic in-out, starting turned by -0.07 rad. The scene behind
  pulls back (the camera backs off and tips down). **Close:** the reverse.
- **Shadow:** the sheet throws a shadow ahead of its leading edge onto what it covers: colour `rgb(18,10,5)`, alpha
  `0.5 * (1 - d)^2`, over a band a quarter of the sheet's height.
- **Input while open:** capture it.
  - A drag pans 1:1 (the paper follows the hand).
  - The wheel zooms by `exp(dy * 0.0016)`.
  - A plain click (under 6 px of movement) or Esc closes the sheet.
  - Ignore game input.
- **Redraw** the canvases only when the sheet opens, when the content changes, or when the view leaves the drawn area.

Pitfalls:
- Legend text at 720p is easily too small; keep it at 9 px or more.
- Marks sized for one zoom level collide at another; size them per zoom.
- Load icon sheets at start-up. A first open that swaps fallback icons for real ones looks broken.

## 4. Cut-paper icons

- Build each icon as a cut-paper piece of 2-3 layers:
  1. the coloured piece;
  2. its cut edge, printed inside the cut: a pale core highlight on the lit (upper-left) edges only and a thin dark
     warm-brown line at the silhouette (`look.md` section 3);
  3. ink or ochre detail lines.
- Flat front view and even light, with no cast shadow inside the icon, no black outline, and no text, letters or
  numbers. Use palette colours only.
- **One rim, not two.** The printed cut edge is the only rim; never add a white outline or glow on top. On a small
  icon the line is 1-2 px (6 % of the half-size). An even pale band all round reads as a sticker halo at any size.
- **Pale on pale** (a snowflake on snow) does not read. Mount the piece on a darker backing sheet cut a little larger
  (slate blue `#5f86b4` on snow).
- Icons need no image generation. If you generate some anyway, see `image-gen.md`.

```js
// A cut-paper icon in a [-1, 1] box (y down, light upper left): the coloured sheet, then its cut edge inside the cut:
// a pale core highlight on the lit edges only and a thin dark warm line. Optional backing for pale-on-pale.
// lit / line are in box units, tuned for 24-64 px icons; for bigger pieces keep the line ~1.5-2.5 px and the
// highlight under ~3 px on screen (pass lit = 2.5 / scale, line = 2 / scale), or it turns into a sticker border.
function cutPiece(g, path, fill, { core = '#fbf6ea', dark = '#5a3a28', lit = 0.1, line = 0.06, backing = null } = {}) {
  g.save(); g.lineJoin = 'round';
  if (backing) { g.fillStyle = g.strokeStyle = backing; g.lineWidth = 0.3; g.stroke(path); g.fill(path); }
  g.fillStyle = fill; g.fill(path);
  g.clip(path);
  const band = new Path2D(); band.rect(-2, -2, 4, 4);             // everything minus the piece moved away from the
  band.addPath(path, new DOMMatrix().translate(lit, lit));         // light = a sliver on the upper-left edges only
  g.fillStyle = core; g.fill(band, 'evenodd');
  g.strokeStyle = dark; g.lineWidth = 2 * line; g.stroke(path);   // half is clipped away: a line `line` wide
  g.restore();                                                     // then ink / ochre details
}
```

For outlines, `shape.radial()` in `assets/lib/paperkit-2d.js` gives lobed or spiky shapes (flowers, suns, stars,
bushes), and `roughen()` adds hand-cut irregularity. Scale the points into the [-1, 1] box and build a `Path2D`.

Example icons, as worked examples of the layering (draw your subject's own the same way):

| Icon | Layers |
|---|---|
| leaf | a 17-point jagged polygon in terracotta; a core-coloured stem with a brown inner stem; ochre veins (width 0.06, round caps) |
| shell | kraft disc 0.82 with its cut edge, paper disc 0.68; a brown spiral `r = 0.05 + 0.048 a` with terracotta ribs |
| snowflake | 6 arms with two pairs of side branches, drawn three times (teal width 0.3, ice `#cfe1ee` 0.2, core 0.1), plus a 6-point star; on a slate-blue backing |
| flower | 5 ellipses in 2 sizes (pink with its cut edge, pale pink) around a rust and ochre centre |
| feather | a brown vane with its cut edge, paper chevrons clipped inside it, an ochre shaft |
| folded star | every second facet a tone darker (ochre at 0.55 over lamp yellow) |

Pitfalls for an icon atlas:
- Bleed colour under transparent texels and through empty cells; otherwise mipmaps darken the rim.
- Inset the UVs by half a texel.
- Keep a drawn fallback for every icon name, so a missing sheet degrades gracefully.

## 5. Type and colour

The roles below carry the countryside build's values as an example: derive your world's from its brief (`palettes.md`
section 3) and keep the roles.

| Role | Value | Use |
|---|---|---|
| Ink | `#5a3a28` | all text and linework; never `#000` |
| Page | `#efe0c2` | sheets, panels, cards (at most a step lighter, `#f4ead6`) |
| Core | `#fbf6ea` | lit-side edge highlights, small highlights, text on dark cards; never `#fff`, never a large fill |
| Accent | terracotta `#b9603f`; `#a4512f` behind text | the one thing to find: the player pin, north, the primary action |
| Light | `#ffc45a` | lamps, sparks, glow |
| Cool note | teal `#5e9c9a` | the one cool colour (the countryside's water) |
| Supporting | ochre `#d9a441`, dusty rose `#c98374`, sage `#8e9a5b` | icon pieces |
| Surround | umber `#1c130d` / `#2a1a12` | behind a page or a sheet in a web UI; never around an in-world scene, whose ground runs past every edge |

These are the countryside build's values. For other subjects and moods see `palettes.md`; when you swap colours, keep
the roles: one ink, one page, one core, one accent, one light. The core measures ~0.97 luma, above the 0.95
near-white gate of `scripts/measure.py --profile flat` (95th percentile), so a large panel in it fails ("paper white
is cream"). Keep panels and cards a step under it (`#f4ead6`, ~0.92, or darker) and let the sheet's light fibres add
the brightness on top.

| Use | Setting |
|---|---|
| Font | `Georgia, 'Times New Roman', serif` everywhere; no web font needed |
| Labels | weight 600, uppercase, letter-spacing 0.14-0.16 em (hand-made small caps); ink alpha 0.72 at large sizes |
| Numbers | italic, ink alpha 0.86 |
| Body text (web) | weight 400, 16-18 px, line-height 1.5, ink alpha 0.8 or more |
| Smallest label | 9 px at 720p (7 px was unreadable) |

WCAG 2 contrast of ink on the page:

| Ink alpha | Contrast | Use it for |
|---|---|---|
| solid | 7.8:1 | anything |
| 0.86 | 5.5:1 | body text |
| 0.8 | 4.75:1 | body text (the minimum) |
| 0.72 | 3.9:1 | large labels only (24 px, or 18.7 px bold) |
| 0.55 | 2.7:1 | lines and ornaments only |

Other pairs:
- Core cream on terracotta `#b9603f` is 4.05:1 (large text only); on `#a4512f` it is 5.1:1; on ink, 9.4:1.
- Ink on ochre is 4.5:1.
- Ink on sage or teal is about 3.3:1, so use those colours for icons, not behind text.

## 6. Web pages and app UIs

The same rules hold in HTML:
- cards are layered paper with a thickness edge and two shadows;
- surfaces carry fibre;
- edges are deckled or torn;
- panels fold or slide like paper;
- buttons press like card.

The base card recipe is in `web-2d.md` section 5, and the paper-spring easings (`--paper-up`, `--paper-down`, which
`.fold` below needs) are in its section 6; this section adds the interface parts. Keep text as real DOM text
(selectable, accessible), never baked into a canvas.

```css
:root {
  --ink: #5a3a28; --page: #efe0c2; --core: #fbf6ea; --accent: #a4512f; --surround: #2a1a12;   /* the countryside build's: set your world's */
  --edge: #d9c49c;                                   /* card thickness: a darker copy of the face, never white */
  --cut: inset 1px 1px 0 rgb(251 246 234 / .75), 0 0 0 1px rgb(74 44 34 / .8), 1px 1px 0 1px rgb(74 44 34 / .8);
                                                     /* the cut edge (web-2d.md section 5): lit-side highlight inside,
                                                        a 1 px dark-brown line, a hair wider on the shaded side */
  --contact: 2px 3px 2px rgb(74 44 34 / .45);        /* tight shadow where the card meets the layer below */
  --cast: 10px 14px 22px rgb(74 44 34 / .22);        /* wide shadow toward the light's far side (light upper left) */
}
body { margin: 0; background: var(--surround); color: var(--ink); font: 17px/1.5 Georgia, 'Times New Roman', serif; }
.panel { position: relative; background: var(--paper, none), var(--page); border-radius: 3px 5px 4px 6px;
         box-shadow: var(--cut), 1px 2px 0 var(--edge), var(--contact), var(--cast); padding: 1.5rem 1.75rem; }
.panel .panel { --cast: 3px 5px 8px rgb(74 44 34 / .2); }   /* a card on a card: a smaller gap, a smaller shadow */
.label { font-weight: 600; text-transform: uppercase; letter-spacing: .16em; font-size: .78rem; }
```

**Fibre.** In a page, generate the kit's sheet once and use it as a seamless tile:
`document.documentElement.style.setProperty('--paper', `url(${paperSheet({ size: 384, color: '#efe0c2' }).toDataURL()})`)`.
Without JS, set `--paper` to an SVG noise tile. It can only darken the page, so keep the swing at 3-6 % behind body
text:

```css
:root { --paper: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9 .6' numOctaves='2' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .24 0 0 0 0 .15 .4 0 0 0 -.16'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E"); }
```

**Deckled and torn edges.** Clip the panel with a roughened outline from the kit:

```js
import { shape, roughen, rng } from './paperkit-2d.js';    // copied from assets/lib/
// amp in panel heights: 0.01 = a scissor cut, 0.02-0.04 = torn. The same seed keeps the tear stable on resize.
// keepBase: false, or the kit keeps the y = 0 edge straight (a hinge foot on cards): one perfectly straight bottom.
function deckle(el, seed = 1, amp = 0.02) {
  const a = el.offsetWidth / el.offsetHeight, i = 1.5 * amp;              // inset, so the tooth stays inside the box
  const pts = roughen(shape.rect(a - 2 * i, 1 - 2 * i), rng(seed), { amp, step: 0.02, tear: amp * 0.4, keepBase: false });
  el.style.clipPath = 'polygon(' + pts.map(([x, y]) =>
    `${(50 + (x / a) * 100).toFixed(2)}% ${(100 - (y + i) * 100).toFixed(2)}%`).join(',') + ')';
}
```

- `clip-path` also clips the element's own `box-shadow`. Put the shadows on a wrapper instead:
  `filter: drop-shadow(2px 3px 1.5px rgb(74 44 34 / .45)) drop-shadow(10px 14px 14px rgb(74 44 34 / .22))`.
  `drop-shadow` follows the torn outline; match its blur to a box-shadowed card by eye.
- Re-run `deckle` from a `ResizeObserver`.
- For a soft torn edge, use `mask-image` instead: draw the nibbled, upscaled mask of section 3 into a canvas and pass
  its `toDataURL()`.

**Fold, slide, pop.**

```css
.fold { transform-origin: 50% 0; transition: transform .9s var(--paper-up); }     /* hinged on its top crease */
.fold.closed { transform: perspective(900px) rotateX(-90deg); transition: transform .7s var(--paper-down); }
.sheet-modal { position: fixed; inset: 6vh 8vw; animation: sheet-in .7s cubic-bezier(.65, 0, .35, 1) both; }
@keyframes sheet-in { from { transform: translateY(105vh) rotate(-4deg); } to { transform: none; } }
.sheet-modal::after { content: ''; position: absolute; left: 0; right: 0; bottom: 100%; height: 25%; pointer-events: none;
  background: linear-gradient(to top, rgb(18 10 5 / .5), rgb(18 10 5 / .28) 25%, rgb(18 10 5 / .13) 50%, rgb(18 10 5 / .03) 75%, transparent); }
.pop { animation: pop .22s linear(0, .384, .667, .863, .986, 1.05, 1.07, 1.061, 1.037, 1.012, 1) both; } /* badge, icon */
@keyframes pop { from { transform: scale(0); } }
@media (prefers-reduced-motion: reduce) { .fold, .fold.closed, .sheet-modal, .pop { transition: none; animation: none; } }
```

- `.fold` suits accordions, dropdowns and cards that unfold from a crease.
- `.sheet-modal` is the tested sheet: 0.7 s cubic in-out from below, starting turned by -4 degrees, with the
  leading-edge shadow band `0.5 (1 - d)^2`.
- `.pop` samples the pop curve of `motion.md` (7 % overshoot). Keep it for small pieces appearing, never for panels.

**Buttons that press like card.**

```css
.btn { font: 600 .8rem/1 Georgia, 'Times New Roman', serif; letter-spacing: .14em; text-transform: uppercase;
       color: var(--ink); background: var(--paper, none), var(--page); border: 0; border-radius: 3px 4px 3px 5px;
       padding: .75em 1.25em; box-shadow: var(--cut), 1px 2px 0 var(--edge), var(--contact), var(--cast);
       transition: transform .08s, box-shadow .08s; }
.btn:hover { transform: translateY(-1px); }                          /* lifted a hair: no glow, no colour change */
.btn:active { transform: translate(1px, 2px); box-shadow: var(--cut), 0 0 0 var(--edge), 1px 1px 1px rgb(74 44 34 / .45); } /* pressed flat */
.btn:focus-visible { outline: 2px dashed var(--ink); outline-offset: 3px; }  /* an inked focus ring, always visible */
.btn.primary { background: var(--accent); color: var(--core); }     /* 5.1:1 */
.btn:disabled { opacity: .45; box-shadow: none; transform: none; }  /* a blind print: flat, no shadow */
```

- When pressed, the card moves onto the page by its own thickness. The edge and the cast shadow vanish, and only a
  tight contact shadow remains.
- Avoid gradients, gloss, bevels and pill shapes.

**Sound** (an untested start, `sound.md` section 11). Opening a panel plays a small rising flap; closing it plays a
closing flap with the same seed. Never sonify hover or scroll:
`details.addEventListener('toggle', () => sfx.flap({ size: 0.3, up: details.open, seed: hashSeed(details.id) }))`.

**Accessibility.**
- Keep focus visible (the inked ring).
- Honour `prefers-reduced-motion`: folds become instant.
- Keep the fibre faint behind text.
- Never encode state by colour alone; change the icon's shape or add a printed mark.
- Leave the cursor alone on web pages; `cursor: none` is for games only.

## 7. Anti-patterns (tried, then rejected)

| Idea | What happened | Do instead |
|---|---|---|
| A dotted see-through cut-out circle around a character hidden by props (x-ray) | read as an odd circle following the character | after ~0.4 s hidden, ease the camera up or around |
| A white base disc under a standing character | read as a strange white circle | nothing; ground contact comes from the shadow |
| Props bending aside as the character passes | rejected outright | props stay put |
| Ink stamps that drop with a squash, wet ink drying, dust rings, confetti, turning "invitation" stars over undiscovered places, stamp rows on the map | the whole feature was removed | a quiet chord-tone note and a small paper flourish |
| A visible mouse cursor in the game | hidden on request | `cursor: none`; the ink mark shows the target |
| A near-black unlit lamp pane | read as a black blob on the print | dim amber paper |
| A "size increase" pulse on a card in a video | slow and bad-looking | physical motion: slide, fold, hop |

The rule behind all of them: **no overlay shapes, x-ray effects or objects reacting to the player that a real paper
diorama could not do.** If something must be readable, move the camera or design the piece (a pale glue tab, a backing
sheet). Never draw an indicator.

The same rule rules out generic chrome:
- HUD bars and meters, floating "+1" numbers, tooltips hovering in space;
- glossy or gradient buttons, pure white panels, black text or outlines;
- halos and glows around pieces, sans-serif system type;
- blurred drop shadows with no contact shadow.

## 8. Checks before you ship

- Screenshot at the smallest target (720p, a phone):
  - every label is at least 9 px;
  - icons are recognisable at about 32 px with no text;
  - map marks do not collide at the zoom limits.
- Search the CSS and canvas code for `#000`, `#fff`, `black` and `white`. Replace them with ink and core (masks
  excepted).
- Body text meets 4.5:1 (ink alpha 0.8 or more on the page).
- Timing:
  - the hint vanishes at the first input and never appears in captures;
  - no reward fires before the first input;
  - no pickup fires while a sheet is open.
- Pale-on-pale pieces have backing sheets. Every cut piece shows a thin dark line with a pale highlight on its lit
  side only: no even pale band, no second rim.
- No large panel or card lighter than `#f4ead6`; `measure.py --profile flat` (UI pages: no lens or density gates)
  passes, its 0.95 luma gate included.
- With reduced motion on, folds and slides become instant.
- Sounds play only on open and close, never on hover or scroll (`sound.md`).

# Palettes for paper

How to derive colour for paper work from the brief and its references: roles, the rules that keep it reading as
printed card, and light presets by mood in `assets/lights.json`. There are no stock palettes: every world gets its
own (`gallery.md` shows five, measured on frames of the source game).

Read this when: choosing colours for a new piece, restyling a template for a new subject, or when a frame looks
garish, muddy, "video-game" or flat.

## 1. Roles, not swatches

A paper palette is a set of roles. Fill every role before you pick any other colour:

| Role | What it is | Rules |
|---|---|---|
| page | bare paper stock (paths, light patches) | cream; never pure white (a cold world passes a cooler stock: `createHarness({ stock })`, `look.md` section 8b) |
| ground light / dark | the printed ground, two tones | the world's floor (sand, snow, moss, deck plates, tiles), muted and paler and greyer than the cards (rule 9), so the pieces carry the colour; 15-25 % apart in value |
| subject (3-6) | the colours of the main pieces | one lead family from the subject's own materials and the references |
| accents | 1-2 per piece, plus one small warm note of light and life | contrast with the piece's base, never tone-on-tone (`accentsFor(base)`); the warm note under ~5 % of the frame |
| ink | linework, outlines, printed marks | the darkest subject hue pushed toward umber; never `#000` |
| edge | dark cut line + lit-side highlight | not a palette colour: `P.rim()` derives it from each print, in every mood |
| leak | the colour shadows let through | the world's shadow colour: warm amber on a warm ground by day, lilac-blue on snow, teal under water, deep navy at night (`look.md`) |
| haze | distance colour, applied in display space | a mid tone, never near white; subtle, far only |
| key / fill | light colours | mild by day (key `#ffdcb2`, frontal fill `#f2dcc2`), or a preset from `assets/lights.json` for the brief's light: warmth goes in the grade, not in a 3000 K key |

## 2. Rules that keep it paper

1. **One lead family on a muted ground, both from the brief.** The subject chooses the hues (a reef: coral and
   kelp on pale sand; a station: teal panels and amber lights on pale deck plates; autumn countryside: orange, rust
   and ochre on olive-khaki); the style fixes only the structure: one family the pieces carry, on a ground paler and
   less saturated than they are. The shipped game's biomes each kept one family; five competing hues read
   as a toy box.
2. **Every surface has two tones, marks and contrasting accents.** Base, a shade (mix 25-35 % toward warm umber
   `#2b1a0e`), a light (mix 15-20 % toward cream `#fff7e8`), speckle, and 1-2 accents that contrast with the base
   (red + olive leaves on an orange tree, cream flowers and red berries on a green bush; `accentsFor(base)` gives a
   fallback pair), never tone-on-tone. `shade()` in `assets/lib/paperkit-2d.js` darkens toward umber, never grey.
3. **Rich, not neon, as rich as the world.** A colourful brief lands at mean HSV saturation ~0.55-0.75 (the shipped
   colourful frames measure 0.58-0.73); snow, mist, fog and pale briefs sit far lower (the gallery's snow ~0.15),
   which is right. Print colour can be rich if the grade pulls it back a little (~0.96). No colour fog or sepia
   filter over the frame; haze, if any, subtle and only in the far distance.
4. **No pure white, no pure black.** Cream and a dark ink. The darkest 20 % of pixels take the world's shadow colour:
   warm umber on a warm ground, olive-black in a forest, lilac-grey on snow, navy at night.
5. **Paper greens.** Muted and printed, never a saturated, uniform "video-game" green. A fresh spring ground can be a
   soft yellow-green (the gallery's `#B3B15E` in frame), a forest a deep moss (`#585F32`); author greens a step greyer
   than you want and keep the hue-masked desaturation in the grade (`look.md` section 7).
6. **Layer value steps.** Stacked layers step 10-15 % darker going away from the light; far layers drift toward the
   haze colour.
7. **Readable pieces.** A pale piece on a pale ground disappears: mount it on a darker backing sheet cut ~8 % larger,
   or give it a pale glue tab on a dark ground. White on white (whitewashed walls or a white stupa on snow): separate
   by the trim and roof colour, a white a step warmer than the snow, the shaded side and the cast shadow, and a dark
   ink outline. Dark pieces (pines, iron, night) need a value floor (luma >= ~40/255)
   and dark kraft side faces, never a white edge.
8. **Keep constants across moods.** If one project has several moods (day/night, biomes), keep two things fixed so it
   stays one world: the wood/structure colour and the warm window/lamp colour (cut edges follow each print).
9. **Author grounds paler than you want them on screen** (unless the brief names a dark floor: black sand, slate,
   night water; then the pieces go lighter than it, with the same separation, and the frame measures darker: judge by
   eye, `measure.py --profile dusk` at dusk). In the frame the ground sits ~0.16-0.22 brighter and
   ~0.16-0.25 less saturated than the cards standing on it (`look.md` section 1). The warm key, ACES and the tint push
   albedo warmer and more saturated (a test agent's `#dcc196` sand rendered `#C88C42`), so author it further apart
   still: the ground's light tone ~0.2-0.3 above the cards' mean luma (snow more) and ~0.15-0.45 below their mean
   saturation. Check it with `measure.py --palette` on the test card.
10. **Foliage outside autumn.** In non-autumn biomes carry the contrast with flowers and fruit (red, cream, gold), not
    red leaves on green, which reads as Christmas or autumn. Choose the accents for your prints yourself
    (`accentsFor` is only a fallback rule; the countryside examples take `colors.accents`).

## 3. Deriving a palette for any subject

Derive it; never reuse one. The example scene's palette and the gallery's measured palettes show how roles, ratios
and contrast work, not colours to copy: blind tests that started from the example reproduced its roofs, greens and
river in a space station and a lantern festival.

0. Start from the brief and the user's references (`gallery.md` section 1). A reference's measured colours
   (`scripts/measure.py ref.png`) beat anything here; the steps below fill what the references leave open.

1. Name the subject's materials (a Mars dome: rust dust, oxidised steel, glass panes, greenhouse plants; a reef:
   coral, kelp, sand, deep water; a city: brick, slate, signal lights). Paper versions of those materials are the
   subject colours: pick the matte, slightly faded version of each.
2. Pick the ground, muted and authored pale (rule 9): the colour the world's floor is (sand for a desert, blue-white
   for snow, moss for a forest, fresh green for a spring garden, pale stone for a city, deck plates for a station,
   sea-foam for water; at night the day ground re-lit, section 5).
3. Give every piece contrasting accents (`accentsFor(base)` is a starting pair) and choose ONE small warm note of
   life or light (lamps, windows, a creature, a flag).
4. Make the ink from the darkest subject hue pushed toward umber; it stays the same at night (section 5).
5. Light: pick the `assets/lights.json` preset whose light matches the brief (section 4); the leak is the world's
   shadow colour (warm amber on a warm ground by day, olive in a forest, lilac-blue on snow, teal under water, navy at
   night); the haze a subtle mid-tone of the far scenery.
6. Check against the rules above (the ground against the cards first: rule 9), render the test card, and run
   `scripts/measure.py` for saturation, darkest-20 % colour and palette spread.

## 4. Light presets (`assets/lights.json`)

Light, not content: each preset sets the key, the frontal fill, the leak (shadow colour) and the haze for a light
condition. The first four are the 3D template's measured day, golden, dusk and night sets (`look.md` section 8); the
rest are starting values. Pick the one whose LIGHT matches the brief and keep your own palette under it.

| Preset | Use |
|---|---|
| day | a clear day (the template's day) |
| golden-hour | low warm key against a cool fill, long shadows |
| dusk | violet fill, lit windows |
| night | pale-blue moon, warm lamp pools |
| hard-noon | white-hot high sun, dusty rose-violet fill (salt flats, white stone, beaches; warm sand keeps warm umber shadows) |
| snow-bright | warm-white key, cold blue fill and shadows (snow, ice, high mountains) |
| soft-spring | peach key, lilac fill (pastel mornings) |
| mist | soft key, teal fill, a far haze (misty forests, marsh, rain) |
| aquatic | cool clear light, teal fill and shadows (coasts, shallow seas) |
| overcast | neutral key, cool grey-blue fill (cities, machines, cloudy days) |

The colours (key, fill, leak, haze) are in `assets/lights.json`, the one place they live.

## 5. Night and coloured light

At dusk, at night and in every other mood the palette is re-lit, not repainted: keep the day albedo and swap the light
rows (key, fill, leak, haze), as the 3D template's `?mood=dusk|night` re-light its example world (the `dusk` and
`night` presets). How the night set looks and what to check (warm windows and lamps, navy only far away and in the
deep shadows, warm prints that go black) is in `look.md` section 8. The cut edges still come from each print
(`P.rim()`). If a piece must change colour at night (a lamp pane), use a dim amber paper for "off", never near-black.

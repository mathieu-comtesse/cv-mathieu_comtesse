# Image generation (optional)

How to use an image model, when one is available and allowed, for look targets and illustrated sprite sheets, and how
to cut, pack and check what it makes. Nothing in this skill depends on it.

Read this when: an image model is available and you want concept frames, one "gold" target to measure against, or
illustrated card art faster than painting it in code. Without one, read `procedural-art.md` instead; you lose nothing
essential.

Contents: 1 Rules; 2 Concept frames and the gold target; 3 Sprite sheets on a key colour; 4 Restyle passes;
5 Consistency; 6 Cutting pipeline; 7 Paper photos; 8 Checks that caught failures

## 1. Rules

- **Optional, never load-bearing.** Generated art and procedural art write the same atlas contract (section 6), so the
  pipeline is built and tested with procedural or dummy sprites first, and a missing or rejected sprite falls back to a
  procedural card. Never block on generation.
- **What it is for:** look targets (concept frames, one gold frame), illustrated sprites (the printed art inside cut
  cards), and optionally a photo source for paper detail. In the shipped game everything else stayed code: geometry,
  hinges, thickness, ground prints, normals, outlines, packing (the cut edge came with the art, section 3).
- **Budget:** one call per sheet or frame, at most 1-2 regenerations per set, and look at every output. The first pass
  in the source project was 8 sheets with 0 regenerations, all usable. Keep a log: prompt, image inputs, seed, verdict.
- **Never ship third-party images** (references, screenshots, photos). Use the user's references, if at all, as image
  inputs for what they give (palette, light, materials, motifs, silhouettes, density: `gallery.md` section 1), never
  to copy their composition, characters or logos, and say so in the prompt.

## 2. Concept frames and the gold target

**Frame prompt = one shared style block + one subject sentence.** Fill the slots once and reuse the block for every
frame, so light, palette and lens match across the set:

```text
[MEDIUM]    real macro photograph looking down into a handmade pop-up papercraft world
[LENS]      macro tilt-shift lens, high three-quarter view about <40-55> degrees down, a sharp band across the middle
            (~40 % of the height), strong blur top and bottom, big blurred cards across the bottom edge
[SUBJECT]   <one sentence: the place, the hero, the moment, the twist>
[MATERIAL]  everything made of matte uncoated rigid cardstock with crisp die-cut edges, in a limited palette: <5-8
            colour words or hexes from the brief and its references>; <the lead family> pieces on a paler, muted
            <the world's floor: sand, snow, moss, deck plates...> ground, each printed as a layered paper collage with
            1-2 accent colours that contrast with it
[CRAFT]     thin dark cut outlines with a pale highlight on the lit side, visible fibre and tooth, slightly imperfect
            hand-cut shapes, layered cut-paper silhouettes with small gaps and soft contact shadows, <mechanism cues:
            hinges, folds, tabs>
[LIGHT]     <the brief's light (a preset in assets/lights.json), e.g. a mild warm key from the left>, <frontal fill>,
            <practical lights>; shadows tinted by the world, never grey
[SURROUND]  the printed paper ground fills the frame and runs past every edge
[AVOID]     no sky, horizon, backdrop, table, room, page edge or border; no text, letters, logos or UI; no plastic, no
            glossy CG render, no vector-cartoon look
```

- Make 4-6 frames: hero, a mid-motion moment (a fold), a material close-up, a busy area, a special feature of the
  brief's own (a landmark, a bridge; water only if it has some), a wide frame at the same 40-55 deg pitch. 15 of 19
  generated style frames were kept; the rejects showed a bordered page on a table, flat illustration without depth of
  field, pink overload, "smooth CG" and felt-like snow.
- **Frames are targets to measure, not content to copy:** palette clusters, cut-edge width, fibre RMS, focus band,
  shadow/lit ratio, relative sizes, counts per area (`process.md`, `scripts/measure.py`). Generated frames are
  idealised: blind critics always picked them, so never use "the critic cannot tell" as a pass rule against them.
- **The gold target.** The best target in the source project was generated with three of the build's own screenshots
  as image inputs, named as the main reference for world, camera and light, with the request to make a new coherent
  scene in exactly that visual language; the user picked it. It stayed in the build's language, so its gaps were
  reachable. From it:
  write a style bible (sizes relative to the hero, edge rules, layers per piece, print vocabulary, light ratios), then
  a ranked gap list with one measured "do" per gap (`process.md`).
- Generated paper drifts toward soft mulberry sheets with deckled edges: keep "rigid smooth cardstock, crisp die-cut
  edges" in every prompt.

## 3. Sprite sheets on a key colour

Generate sheets, not single images: one category per sheet, a fixed grid, a known count in reading order, so the
cutter can name pieces by position. Write the brief as labelled sections (the image tool expanded short prompts into
this form, and it worked well):

```text
USE         printed art for hinged cut-paper cards in a pop-up <game | animation>
ASSET       one sprite sheet of <category>
BACKDROP    solid, perfectly uniform pure <magenta #FF00FF> edge to edge; no <magenta or pink> anywhere inside a piece
REQUEST     EXACTLY <N> pieces
LAYOUT      invisible <R> x <C> grid, wide gaps between pieces, <which cell stays empty>.
            Row 1: <pieces>. Row 2: <pieces>. ...
PIECES      one line per piece type with its silhouette rule ("rectangular outer silhouette", "no attached roof")
CRAFT       flat frontal scan of hand-cut paper collage pieces; each piece a collage of 2-6 layered parts of matte
            uncoated cardstock, each part with a pale lip on its lit side and a short soft shadow, visible fibre and
            printed gouache detail; every piece has a thin dark-brown cut outline (about <2-3> % of the piece height)
            right at its outer silhouette, with a pale highlight just inside it on the upper-left (lit) edges only;
            nothing thinner than a pencil
PRINT       <what each of this world's categories may carry, from the brief (the countryside example: leaves and
            berries on trees; shingles, lit 4-pane windows, plank doors on houses; natural markings only on animals;
            two tones, a soft inner shade and a few pale dabs on clouds and smoke)>; every piece 3-5 inks, 3+ value
            steps and one ornament, with 1-2 accent colours that contrast with its base, never tone-on-tone; motifs
            big, bold and few (~1/6-1/8 of the piece's width)
PALETTE     <6-9 hex colours with roles>
BASE        each piece has a flat straight bottom edge (it is hinged to a page; bushes and rocks are mounds on a flat
            base, never balanced on a point) | free-floating, no base
AVOID       perspective, isometric, bevelled 3D, cast or drop shadows, glows or soft halos, an even cream or white
            border round a piece (sticker look), blur, glossy highlights, airbrushing, lighting gradients, text, logos,
            people or creatures the LAYOUT does not list, frames
```

- **Key colour:** pure magenta by default, with "no magenta or pink inside any piece" in the prompt: the cutter cannot
  tell a magenta flower from the background. For pink subjects (blossom, flamingos, coral) key on pure green
  `#00FF00` instead (`key='green'` below). The key colour must never appear in the palette.
- **Sizes:** about 1254 x 1254 for prop sheets, 1536 x 1024 for rows of poses; 6-17 pieces per sheet; gaps of at least
  40 px at source (pieces closer than ~10 px merge in the cutter).
- **Counts drift** unless you write "EXACTLY N ... Row 1: ..." and name empty cells; some tools even accept explicit
  pixel layout ("column centres at x = ...; row baselines at y = ...").
- **The cut edge in the art is the rim** (dark line + lit-side highlight, `look.md` section 3). Never add a
  second shader or post rim on top. Small pieces need a proportionally fatter edge than big ones, so ask per sheet, or
  fix the width after cutting. A sheet that comes back with an even cream rim all round is a reject (section 8).

## 4. Restyle passes

To lift a whole set to a new style without losing layout, give two images two roles:

```text
Image 1 is the STYLE reference: copy its <chunky cut-card shapes, thin dark cut outline with a pale highlight on the
lit side, printed detail with contrasting accents, matte fibre>, but NOT its <perspective, depth of field, lighting,
shadows, scene>.
Image 2 is the LAYOUT reference: keep the same pieces in the same grid cells, same order, same count, similar size and
silhouette role, and redraw every piece in the style of image 1. Do not add, remove or merge any piece.
```

- A third input can carry palette and mood (a concept frame of this world's own biome, or the user's reference; never a
  gallery still) while the gold frame carries the craft.
- In the source project all 18 restyled sheets were swapped in and none reverted. Restyling added 2-4 layers with
  pale lips, stone-fleck walls, framed lit windows, arched plank doors, shingle rows with lips, and crowns with a
  branch tree and 20-30 two-tone leaves (keep motifs big and few: ~1/6-1/8 of the piece's width, counted in tens). It
  also added even cream rims all round, which later read as a sticker halo:
  reject a sheet that comes back with them and ask again for the dark outline with a lit-side highlight.
- An ornate style reference leaks its ornaments onto everything: folk-art leaves appeared on animals, smoke and
  clouds. State per category what may be printed, then regenerate once.
- The added edge makes pieces 2-5 % bigger in pixels: size sprites by world height, never by pixel size.

## 5. Consistency

- One hex palette per sheet, one shared style block per set, the same key and grid rules on every sheet.
- The hero is never a pose sheet. In 3D he is a small paper model of T-crossed parts (a frontal card with a profile
  card behind it, the back printed; `mechanisms.md` section 12): generate each part's front, side and back as separate
  pieces on one sheet (the body with its costume detail, the head with a face, each leg, each arm; headgear and a
  carried item only if his design has them), cut each as its own card and build the model. In 2D he is a puppet of
  front cards that mirrors to turn (`web-2d.md` section 3). The pose rows below are for small background critters only.
- Grow characters in steps: an in-world concept from your screenshots, then a design sheet (rows = individuals,
  columns = poses), then a production sheet on the key with the design sheets as inputs, then more variants with the
  first production sheet as input ("two MORE coats of exactly the same cat").
- Multi-pose rows: one individual per row at one scale on one common baseline, all facing the same way (mirror at
  runtime), no ground, no cast shadow, no stand tabs.
- Keep generated art and procedural art in one world only if both follow the same five ingredients
  (`procedural-art.md` section 0); otherwise the procedural cards look unfinished next to the generated ones.

## 6. Cutting pipeline

Key, keep the colour under and around the alpha, soft alpha, then outline and pack:

```python
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

def cut_sheet(path, key='magenta', thresh=60, min_area=0.001, erode=2, bleed=12):
    """Generated sheet -> list of (rgba piece, bbox) with colour bled `bleed` px beyond the cut."""
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    keyness = np.minimum(r, b) - g if key == 'magenta' else g - np.maximum(r, b)
    fg = ndi.binary_opening(keyness < thresh)
    lab, _ = ndi.label(ndi.binary_dilation(fg, iterations=5))        # join the parts of one piece
    lab = lab * fg
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None or (lab[sl] == i).sum() < min_area * fg.size:
            continue
        y0, y1 = max(0, sl[0].start - bleed), min(lab.shape[0], sl[0].stop + bleed)
        x0, x1 = max(0, sl[1].start - bleed), min(lab.shape[1], sl[1].stop + bleed)
        mask = ndi.binary_erosion(lab[y0:y1, x0:x1] == i, iterations=erode)   # drop the key fringe
        c = rgb[y0:y1, x0:x1].copy()
        spill = np.clip(keyness[y0:y1, x0:x1] - 20, 0, None)[..., None]      # despill what is left inside
        c -= spill * (np.array([1, 0, 1]) if key == 'magenta' else np.array([0, 1, 0]))
        idx = ndi.distance_transform_edt(~mask, return_distances=False, return_indices=True)
        c = c[idx[0], idx[1]]                                                 # bleed: nearest inside colour
        a = np.clip(ndi.gaussian_filter(mask.astype(np.float32), 0.6), 0, 1)
        out.append((np.dstack([np.clip(c, 0, 255), a * 255]).astype(np.uint8), (x0, y0, x1, y1)))
    return out
```

- **Values:** key threshold 60; label dilation 5 px; minimum piece area 0.06-0.3 % of the sheet; erode 2 px (1 px, no
  opening and despill offset 14 for animals, so legs and whiskers survive); despill offset 20; alpha blur sigma 0.6;
  bleed 12 px. The erode also trims the printed dark outline: ask for it wide enough to survive, check it after the cut.
- **Reading order:** sort by centre y; start a new row when a centre lies more than 0.45 x the mean piece height below
  the row's mean; then left to right. Map names from a list in that order; `-` drops a piece.
- **Flat base** (hinged pieces only): base span = extent of the lowest 6 % of rows; cut at the lowest row filled at
  least 60 % of that span, never more than 8 % of the height. Measure against the base span, not the full width, or
  trunks get cut off.
- **Outline polygon:** fill holes, erode 2 px, trace the contour, simplify (Douglas-Peucker from 0.6 px, x1.25 until
  60 points or fewer), then reduce to 20 points for small cards, ~36 for trees, ~14 for rocks; CCW, 0..1, v up,
  baseline v = 0. Outlines ignore holes (gates, arches, sails), so the material also needs an alpha test (~0.4).
- **Pack:** shelf packer sorted by height, 8 px padding, one fixed source-to-atlas scale for all sheets (equal texel
  density), background in page cream. Save PNG plus WebP (`exact=True` keeps colour under zero alpha; a 16 MB PNG
  became a 2.9 MB WebP).
- **Contract** (shared with the procedural atlas in `procedural-art.md` section 4.3): `atlas.json = { size: [W, H],
  sprites: { name: { rect: [x, y, w, h], outline: [[u, v], ...], kind, pxPerUnit, aspect, tone } } }` (`aspect` =
  cut width / height, `tone` = the sprite's mean colour). Build and test the card
  pipeline against a dummy atlas in this format (striped fills, a pale dot top-left and a dark dot bottom-right so
  flips show) before any art exists.
- **Multi-pose frames** (critters only; the hero is built from part cards, section 5): store per frame the foot row
  and an anchor column at the alpha-weighted centre, so frame swaps do not slide; cut every frame at its own lowest
  row; give small creatures proportionally more texels.

## 7. Paper photos

For material detail, ask for an "extreme macro top-down photograph of a single flat sheet of <stock> filling the
frame edge to edge, even diffuse light, no shadows, vignette, folds, edges, text or objects, square". Treat it as raw
data: linear luminance, divide by a wide blur to remove the lighting, make it periodic (periodic plus smooth
decomposition), clip the outer 0.05 %, then mix it into the procedural mid scales.
`python -I scripts/paper_textures.py --photo macro.png --photo-mix 0.5` does exactly this. A photo is a bonus: the
procedural maps alone are enough, and the shipped game kept them as its fallback.

## 8. Checks that caught failures

Re-cut every new or regenerated sheet with the production cutter and compare before swapping anything in. Mistakes
show only after the cut.

| Check | Pass | Caught |
|---|---|---|
| Count and order vs the names list | equal | pieces merged by the cutter (14 of 17 on one sheet: spread pieces apart by moving components sideways, no pixel edits) |
| Aspect vs the previous sprite of the same name | abs(log(new / old)) < 0.35, aim ~5 % | wrong piece in a cell, cropped trunks |
| Key colour left inside the cut | 0 pixels with keyness over 60 under alpha over 128 | a magenta flower read as background |
| Thin parts after erosion | legs, tails, posts still present | lost legs on animals |
| Old / new thumbnails per name | same role and silhouette | style drift, rounder and cuter animals |
| Verify sheet: atlas on dark grey with every outline drawn and labelled | outline hugs the art | wrong flips, loose outlines |
| Ornaments per category | none where not allowed | leaf prints on animals, smoke and clouds |
| Cut edge on 3x crops | thin dark outline at every silhouette, pale highlight on the lit edges only, no even cream or white rim, nothing on the flat base | even cream rims from restyle passes (a sticker halo) |
| Under the final grade | no clipped channels | gold sprites clipping to orange; re-check saturation after every art change |
| Next to procedural cards | same five ingredients | mixed sources that do not belong together |

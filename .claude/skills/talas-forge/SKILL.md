---
name: talas-forge
description: Generate, convert, validate and integrate 3D props for the Village Talas game (village-talas-scene.html) with the forge in tools/forge — vibe3d procedural models or in-house procedural models turned into toon GLBs that the game's own loadGLB reads. Use when adding, regenerating, recolouring or checking a 3D asset, prop or sign for Talas, or when writing a new procedural model for it. Not for the other mini-games (they use their own Blender scripts in tools/).
---

# Talas forge

Read `tools/forge/README.md` first: it holds the asset contract, the architecture and the known pitfalls.

## Loop

1. **Declare** the asset in `tools/forge/catalogue.json`: `id`, `source`
   (`vibe3d:<path to model.ts inside vibe3d>` or `local:<file in tools/forge/models>`), real `height` in metres,
   `maxTris`, optional `params`, `yaw`/`pitch`, `tags`.
   Look up vibe3d candidates with `ls ../vibe3d/assets/prototypes ../vibe3d/assets/f1-prototypes`.
2. **Build**: `node tools/forge/forge.mjs build <id...>`. It runs export → Blender → validation → copy to `assets/talas/props/`.
   Read `tools/forge/out/rapport.json` for triangles, size, parts, roles and warnings.
3. **Look** at `tools/forge/out/apercu/<id>.png` with the Read tool before calling it done. Check silhouette, readable colours,
   the outline not swallowing thin parts, and no floating or spiky geometry.
4. **Test**: `node tools/forge/test-props.mjs` (game loader + `talas-props.js`, roles, recolouring).
5. **Report** the preview image, the size, the parts that can be animated and anything approximated.

## Art directions

An art direction (e.g. `panthere`, see `tools/forge/DA-panthere.md`) has two halves. The level textures are painted by code in
`talas-panthere.js` under the same `PTD` keys (gameplay untouched, `?da=classique` reverts). The props get a role palette
`tools/forge/palettes/<da>.json`, previewed with `forge.mjs build --da <da>` and applied in game with
`TalasProps.themePalette(id, pal)`. Never recolour assets flagged `"theme": false` (ISO 7010 colours are regulatory).
To check the result in the real game, open the published page in the built-in browser, inject the module and call
`TALAS_DA.patch(PTD, PT_NOPAINT); PT.base = {}; PT.mat = {}` before `buildPlatformer()` (the page's globals are reachable).

## Visual reports without a local server

`node tools/forge/preview/record.mjs [intro ile-avant ile-apres parcours-avant parcours-apres] [--court]` renders MP4s with
headless Chrome over a pipe and a virtual clock (no port, no window). `--photos <json>` shoots named viewpoints as PNG
(`[[name, "avant"|"apres", [px,py,pz], [lx,ly,lz]], ...]`). Read the PNGs before reporting. Page errors land in
`tools/forge/out/videos/journal.txt`: check it after every run. The island module is `talas-ile.js` (see `tools/forge/ILE-refonte.md`).

## Writing an in-house model

`tools/forge/models/<name>.mts` exports `createModel(params, THREE)` and returns `{ root }`. `THREE` is injected, so import nothing.
Each named child of `root` becomes an animatable part. Name the materials, but colours are what matters:
each distinct colour becomes a role. Metres, Y up, front facing +Z. Keep every visible layer 3–5 mm off its support
(coplanar faces z‑fight). Use params for variants rather than copying files. Reference: `models/panneau-securite.mts`.
For reference-driven hard-surface work, follow the `vibe-model` skill loop (preview → independent critique → fix, stop at 85).

## Contract checks the validator enforces

TRS nodes only (the game's `loadGLB` ignores `matrix`), no skin, every mesh named `piece__role`, every role present in
`<id>.roles.json`, no empty `piece__role` node, finite values, triangle budget. Never hand-edit a GLB in `assets/talas/props/`:
change the source or the catalogue and rebuild.

## Environment

- vibe3d must sit next to the repo (`../vibe3d`, or set `VIBE3D_DIR`) with `bun install` done.
- Blender is auto-detected (or set `BLENDER`).
- On Windows the forge needs real network/process access for Blender: run it outside the sandbox if a call hangs.

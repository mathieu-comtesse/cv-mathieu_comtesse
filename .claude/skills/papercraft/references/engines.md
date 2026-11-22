# Porting the paper look to engines

How to rebuild the paper material, soft shadows, macro lens and hinge motion outside the browser: Godot, Unity,
Unreal, Blender, and offline video pipelines.

Status: porting notes only, not tested; the skill is browser-first (the kit and templates are the tested path).

Read this when: the target is a game engine, a DCC tool or a non-web video pipeline. Read `look.md` first for the
what; this file is the where.

## 1. The same five pieces everywhere

1. **Paper diffuse** you own: wrap lighting, a shadow leak in the world's shadow colour (shadow lerps the key toward
   it instead of zero; the light preset's leak in `assets/lights.json`), optional back-lit glow, no specular, no
   reflections.
2. **Surface-fixed fibre + print**: albedo = print x paper sheet; normal = fibre + crumple (normal only). Textures from
   `scripts/paper_textures.py` (tileable albedo, height, normal, roughness, deckle mask) if the engine cannot run the
   JS kit.
3. **Cards with thickness**: extrude cut outlines to 1.5-3 % of the hero height; separate front, back and side
   materials; side colour darker than the face; the cut edge printed in the face texture: a thin dark-brown line at
   the silhouette, a pale highlight just inside it only on the light-facing edges, nothing along folds.
4. **One post pass** for everything: world-space light falloff, contact AO tinted with the world's shadow colour
   (never grey), silhouette line, tilt-shift DOF (screen height + depth), ACES-style grade, a hue-masked pull on
   video-game yellow-greens, a shadow lift toward the mood's shadow tint, haze by ground distance from the focus,
   vignette, grain. Keep the scene in HDR until this pass.
5. **Hinge motion**: one scalar per fold driven by the latched paper spring (`assets/lib/paper-motion.js` is plain JS
   and ports line by line), or keyframes sampled from it (the 30 fps tables in `motion.md`).

Built-in DOF with a fixed focus distance is not tilt-shift: add the screen-height term and a near gain, and suppress
the silhouette line inside the blur.

## 2. Godot 4

- **Material:** a `spatial` shader with `render_mode diffuse_lambert, specular_disabled;` and a custom `light()`:
  ```glsl
  uniform float wrap = 0.3;
  uniform vec3 leak : source_color = vec3(0.63, 0.38, 0.17);   // the day leak #a0602c: set it per world and mood
  void light() {
      float nl = dot(NORMAL, LIGHT);
      float front = clamp((nl + wrap) / (1.0 + wrap), 0.0, 1.0);
      vec3 shadowed = mix(leak, vec3(1.0), ATTENUATION);          // ATTENUATION carries the shadow
      DIFFUSE_LIGHT += front * LIGHT_COLOR * shadowed * ALBEDO / PI;
  }
  ```
  Fibre: sample the paper normal and albedo in `fragment()` (triplanar or object-space UVs so it sticks to folding
  cards).
- **Shadows:** `DirectionalLight3D` with soft shadows (`light_angular_distance` of a few degrees, `shadow_blur`; the
  `light_size` property is for omni and spot lights) and the soft-shadow filter quality set high in the project
  settings; keep the shadow distance tight around the diorama.
- **Post:** a full-screen `MeshInstance3D` quad with a `spatial` shader in `render_mode unshaded` reading
  `hint_screen_texture` and `hint_depth_texture` (reconstruct view position with `INV_PROJECTION_MATRIX`), or a
  `CompositorEffect` for the multi-pass DOF.
- **Motion:** `_physics_process` with a fixed step running `FlapSpring`, writing `rotation.x` of a pivot `Node3D`
  placed on the fold line.

## 3. Unity (URP)

- **Material:** Shader Graph with a Custom Function node for the main light (`GetMainLight(shadowCoord)` gives
  `shadowAttenuation`): `front * light.color * lerp(leak, 1, shadowAttenuation)`; set the graph to Unlit and add
  ambient yourself, so URP's specular never appears. Additional lights through the same function.
- **Shadows:** soft shadows on, shadow resolution high, cascades tight; for contact-hardening, a custom shadow filter
  is a larger job: start with soft shadows plus tinted SSAO.
- **Post:** a Renderer Feature with a full-screen pass (Full Screen Pass Renderer Feature + a Shader Graph Fullscreen
  shader) reading `_CameraDepthTexture`; Volume DOF (Bokeh) can stand in only if you drive the focus band from screen
  height yourself.
- **Motion:** `FixedUpdate` with the spring; a pivot `Transform` on the fold line; `Quaternion.AngleAxis`.

## 4. Unreal

- **Material:** Unlit or Default Lit with Specular 0, Roughness 1; for wrap and leak, use the Subsurface Profile /
  Two-Sided Foliage shading model (cheap back-lit glow) or a custom lighting function in a Material Function with
  light vectors from Blueprint. Fibre from texture or a noise material function.
- **Post:** a Post Process Material (Blendable Location: Before Tonemapping for falloff/AO/line, After Tonemapping for
  grade/haze/vignette/grain) reading SceneTexture:SceneDepth and PostProcessInput0; drive a tilt-shift blur from
  screen V and depth (Gaussian DOF with a custom focal region, or your own gather).
- **Motion:** Timeline curves exported from the spring (keyframe tables) or a Tick with a fixed sub-step.

## 5. Blender (stills, animation, asset authoring)

- **Cards:** curves or meshes from outlines, Solidify modifier (thickness 1.5-3 % of hero height), separate material
  slots for faces and rim (Solidify can assign the rim its own material index). Pivot (origin) on the fold line.
- **Material:** Principled BSDF with Roughness 1, Specular IOR Level 0, Sheen 0; Subsurface or Translucent mix
  (~0.1-0.3, warm by day, cool and weak at night) for back-lit glow; image textures from `scripts/paper_textures.py`,
  or the print painted in code and saved as PNG.
- **Light:** an Area light (size ~1/4 of the scene) as the key gives true contact-hardening shadows in Cycles; EEVEE
  needs soft shadows on and light radius up. Key, fill and world colours from the brief's light preset
  (`assets/lights.json`): by day a mild warm key with a warm frontal fill at ~1/4-1/3 of it; golden hour, dusk, night
  and snow follow their presets.
- **Lens:** 24-32 deg vertical FOV (~35-48 mm on the default 36 mm sensor at 16:9), 40-55 deg down, the printed
  ground past every frame edge; Depth of Field on with a low f-stop focused on the subject; for an exaggerated
  tilt-shift band add a compositor Defocus node driven by a gradient mask mixed with Z.
- **Motion:** keyframe each pivot's X rotation from the spring tables (`motion.md`), F-curve modifiers for wind sway,
  or a Python driver running the spring.
- **Grade:** Filmic/AgX "Medium Low Contrast" look, then the compositor for the mood's white-balance tint, vignette
  and grain.

## 6. Video pipelines (Remotion, ffmpeg, frame sequences)

- Time = frame / fps; no wall clock; seeded randomness; deterministic `step()` so any frame can be re-rendered.
- Render frames headless (browser screenshot per frame, or engine offline render), assemble with ffmpeg:
  `ffmpeg -framerate 60 -i f_%05d.png -c:v libx264 -crf 16 -pix_fmt yuv420p out.mp4`.
- Sound: render paper foley offline from the event list (`renderOffline` in `assets/lib/paper-sound.js` runs in a
  browser's OfflineAudioContext), keep music as a separate stem, mix with one shared SFX gain, loudness-normalise
  (levels: `sound.md` section 9).
- Stop-motion only when the brief asks for it (the style moves smoothly): `motion.md` section 11.

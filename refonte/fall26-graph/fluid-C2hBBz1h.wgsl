// A small stable-fluids grid, one texel per glyph cell, that the pointer
// stirs over the page: velocity in CSS px a second in xy, dye in z.
// Each frame advects and stirs it, makes it divergence-free, then draws the
// dye as glyphs in the tone the page gives it: the halftone's inside, and
// running formulas, a shade lighter, along its edges. The flow runs in eight
// directions, is shoved about in blocks and tears now and then, and the
// glyphs glitch and tumble, so it reads less like a textbook fluid. A sparse
// flicker of glyphs covers the bare page meanwhile, so the background is never
// flat, and the fluid grows out of it rather than appearing on a move.

struct Fluid {
  cells: vec2f,
  cellSize: vec2f,
  tone: vec4f,
  dt: f32,
  splatCount: f32,
  pixelRatio: f32,
  rampStart: f32,
  rampLength: f32,
  atlasColumns: f32,
  atlasRows: f32,
  time: f32,
  glyphCount: f32,
  // FluidSettings, in its order.
  radius: f32,
  force: f32,
  dye: f32,
  fade: f32,
  turbulence: f32,
  toneLift: f32,
  edgeLift: f32,
  glitch: f32,
  tumble: f32,
  // How many glyphs the background ambient shows at a time.
  ambient: f32,
  // 0 to 1: the trail fading in with the zoom into the first section, and
  // to its reading intensity as the graph gathers into the decorator.
  intensity: f32,
  air: f32,
  mask: f32,
  // 1 draws the dye as plain colour, rather than glyphs.
  flat: f32,
  // 1 draws only the graph's own marks, rather than maths among them.
  marksOnly: f32,
  // The share of glyphs lit past white, how bright, and how much that varies.
  hdrShare: f32,
  hdrIntensity: f32,
  hdrVariance: f32,
  // How strongly the trail draws, 0 to 1.
  opacity: f32,
  // The bare page's flicker, its own grid and settings (fluid-ambient.wgsl):
  // as FluidSettings' fluidAmbient*, the cell in CSS px; how far through
  // its turn the first glyph is, 0 to 1.
  ambientOpacity: f32,
  ambientPhase: f32,
  ambientCellSize: vec2f,
  ambientSizeVariety: f32,
  ambientMarksOnly: f32,
  ambientTumble: f32,
  ambientHdrShare: f32,
  ambientHdrIntensity: f32,
  ambientHdrVariance: f32,
  // How softly glyphs come and go, 0 popping in and out, 1 the softest:
  // the trail's, and the background ambient's.
  glyphFade: f32,
  ambientFade: f32,
  // How far the background ambient lifts the tone towards white.
  ambientToneLift: f32,
  // The mask's patch size and speed, as multiples of its own; the share of
  // per-cell grain breaking its edges; 1 to show it over the page.
  maskScale: f32,
  maskSpeed: f32,
  maskGrain: f32,
  maskView: f32,
  // As intensity, for the background ambient.
  ambientIntensity: f32,
  // The background ambient's grid, in cells across and down; the first
  // glyph's beat, and that beat times the glyph count, wrapped to the grid's
  // cells (fluid-ambient.wgsl).
  ambientCells: vec2f,
  ambientBeat: f32,
  ambientBase: f32,
  padding0: f32,
  padding1: f32,
}

// Whether the target shows colours above SDR white (surface.ts).
override hdr: bool = false;

@group(0) @binding(0) var<uniform> fluid: Fluid;
// x, y in CSS px, velocity in CSS px a second.
@group(0) @binding(1) var<storage, read> splats: array<vec4f>;
@group(0) @binding(2) var state: texture_2d<f32>;
@group(0) @binding(3) var linearSampler: sampler;
@group(0) @binding(4) var pressure: texture_2d<f32>;
@group(0) @binding(5) var divergence: texture_2d<f32>;
@group(0) @binding(6) var<storage, read> text: array<u32>;
@group(0) @binding(7) var atlas: texture_2d<f32>;
// Per glyph cell, from cellMain: glyph, tone (1) or edge (2) plus 0.9 of how
// far it has faded in, quarter turns, and its lit gain.
@group(0) @binding(8) var cells: texture_2d<f32>;
// The atlas again, drawn at the background ambient's cells' size.
@group(0) @binding(9) var ambientAtlas: texture_2d<f32>;

// How fast a stir must move, in CSS px a second, to leave its fullest dye.
const DYE_SPEED = 400.0;
const MAX_SPEED = 2500.0;
const VELOCITY_FADE = 1.2;
// The size of the swirls the noise stirs in.
const TURBULENCE_SCALE = 0.004;
// How sharp a change in dye counts as an edge, for the formulas.
const EDGE_START = 0.06;
const EDGE_END = 0.22;
// The dye a flat fill starts at, and is solid by.
const FLAT_START = 0.015;
const FLAT_END = 0.04;

fn texel(cell: vec2f, offset: vec2i) -> vec2i {
  return clamp(vec2i(cell) + offset, vec2i(0), vec2i(fluid.cells) - 1);
}

// Two octaves drifting apart over time, as a stream function.
fn stream(pixel: vec2f) -> f32 {
  let drift = vec2f(fluid.time * 0.07, -fluid.time * 0.05);
  return noise(pixel * TURBULENCE_SCALE + drift) + 0.5 * noise(pixel * TURBULENCE_SCALE * 2.3 - drift);
}

// The stream function's curl, which swirls without compressing.
fn curl(pixel: vec2f) -> vec2f {
  let spacing = 8.0;
  let dx = stream(pixel + vec2f(spacing, 0.0)) - stream(pixel - vec2f(spacing, 0.0));
  let dy = stream(pixel + vec2f(0.0, spacing)) - stream(pixel - vec2f(0.0, spacing));
  let flow = vec2f(dy, -dx) / (2.0 * spacing * TURBULENCE_SCALE);
  // Snapped to the eight directions a grid of glyphs has, so it runs in
  // lanes and turns at corners rather than in round eddies.
  let speed = length(flow);
  if (speed < 1e-4) { return vec2f(0.0); }
  let angle = round(atan2(flow.y, flow.x) / 0.7853982) * 0.7853982;
  return vec2f(cos(angle), sin(angle)) * speed;
}

// Now and then a block of the screen is shoved along a grid axis, briefly.
fn shove(pixel: vec2f) -> vec2f {
  let moment = floor(fluid.time * 3.0);
  let block = floor(pixel / vec2f(220.0, 90.0));
  let chance = hash(block + moment * 0.371);
  if (chance < 0.97) { return vec2f(0.0); }
  let direction = floor(hash(block * 1.7 + moment) * 4.0);
  let axis = select(vec2f(1.0, 0.0), vec2f(0.0, 1.0), direction >= 2.0);
  return axis * select(1.0, -1.0, direction % 2.0 >= 1.0) * 500.0;
}

// Velocity is kept in CSS px a second and every difference is taken over the
// cell's own width and height, so the fluid moves the same way in both axes
// though a glyph cell is taller than it is wide.
@fragment
fn advectMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let current = textureLoad(state, texel(position.xy, vec2i(0)), 0);
  var origin = position.xy - current.xy * fluid.dt / fluid.cellSize;
  // A rare frame tears a band of rows a few cells sideways, for good.
  let band = floor(position.y / 4.0);
  let frame = floor(fluid.time * 60.0);
  if (hash(vec2f(band, frame)) > 1.0 - 0.003 * fluid.glitch) {
    origin.x += floor((hash(vec2f(frame, band)) - 0.5) * 8.0);
  }
  var next = textureSampleLevel(state, linearSampler, origin / fluid.cells, 0.0);
  next.x *= exp(-fluid.dt * VELOCITY_FADE);
  next.y *= exp(-fluid.dt * VELOCITY_FADE);
  next.z *= exp(-fluid.dt * fluid.fade);
  let pixel = position.xy * fluid.cellSize;
  // Only where there is dye, so clear page never gathers a current that
  // would sweep a later stir across the screen.
  let swirl = (curl(pixel) * fluid.turbulence + shove(pixel) * fluid.glitch) * fluid.dt * next.z;
  next.x += swirl.x;
  next.y += swirl.y;
  let radius = max(fluid.radius, 0.5) * fluid.cellSize.y;
  let count = u32(fluid.splatCount);
  for (var index = 0u; index < count; index++) {
    let splat = splats[index];
    let offset = pixel - splat.xy;
    let reach = exp(-dot(offset, offset) / (radius * radius));
    next.x += splat.z * reach * fluid.force;
    next.y += splat.w * reach * fluid.force;
    next.z += reach * fluid.dye * clamp(length(splat.zw) / DYE_SPEED, 0.0, 1.0);
  }
  let speed = length(next.xy);
  if (speed > MAX_SPEED) {
    next.x *= MAX_SPEED / speed;
    next.y *= MAX_SPEED / speed;
  }
  return vec4f(next.xy, min(next.z, 1.0), 1.0);
}

@fragment
fn divergenceMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let left = textureLoad(state, texel(position.xy, vec2i(-1, 0)), 0).x;
  let right = textureLoad(state, texel(position.xy, vec2i(1, 0)), 0).x;
  let up = textureLoad(state, texel(position.xy, vec2i(0, -1)), 0).y;
  let down = textureLoad(state, texel(position.xy, vec2i(0, 1)), 0).y;
  let spread = (right - left) / (2.0 * fluid.cellSize.x) + (down - up) / (2.0 * fluid.cellSize.y);
  return vec4f(spread, 0.0, 0.0, 1.0);
}

// One Jacobi step of the Poisson solve on the cells' own spacing.
@fragment
fn pressureMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let left = textureLoad(pressure, texel(position.xy, vec2i(-1, 0)), 0).x;
  let right = textureLoad(pressure, texel(position.xy, vec2i(1, 0)), 0).x;
  let up = textureLoad(pressure, texel(position.xy, vec2i(0, -1)), 0).x;
  let down = textureLoad(pressure, texel(position.xy, vec2i(0, 1)), 0).x;
  let spread = textureLoad(divergence, texel(position.xy, vec2i(0)), 0).x;
  let across = fluid.cellSize.x * fluid.cellSize.x;
  let along = fluid.cellSize.y * fluid.cellSize.y;
  let solved = ((left + right) * along + (up + down) * across - spread * across * along) / (2.0 * (across + along));
  return vec4f(solved, 0.0, 0.0, 1.0);
}

@fragment
fn projectMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let left = textureLoad(pressure, texel(position.xy, vec2i(-1, 0)), 0).x;
  let right = textureLoad(pressure, texel(position.xy, vec2i(1, 0)), 0).x;
  let up = textureLoad(pressure, texel(position.xy, vec2i(0, -1)), 0).x;
  let down = textureLoad(pressure, texel(position.xy, vec2i(0, 1)), 0).x;
  let current = textureLoad(state, texel(position.xy, vec2i(0)), 0);
  let gradient = vec2f(right - left, down - up) / (2.0 * fluid.cellSize);
  return vec4f(current.xy - gradient, current.z, 1.0);
}

fn glyphCoverage(glyph: u32, local: vec2f) -> f32 {
  return glyphAt(atlas, linearSampler, glyph, local, fluid.atlasColumns, fluid.atlasRows);
}

// Each row reads as running formulas, alternate rows drifting either way;
// marks only, a mark for each character, drifting the same way.
fn textGlyph(cell: vec2f) -> u32 {
  let index = textIndex(cell, fluid.time, 3.0, fluid.rampStart);
  if (fluid.marksOnly > 0.5) { return randomGlyph(hash(vec2f(f32(index), cell.y)), GRAPH_MARKS + 1.0); }
  return text[index];
}

// The glyphs a flicker or glitch picks from: any, or only the graph's marks,
// which randomGlyph keeps to when there are no more glyphs than them.
fn glyphChoices() -> f32 {
  return select(fluid.glyphCount, GRAPH_MARKS + 1.0, fluid.marksOnly > 0.5);
}

// The ramp's glyph at `rung`; marks only, the marks from small to large,
// outlined to filled, as they sit on the ramp.
fn rampGlyph(rung: u32, steps: f32) -> u32 {
  if (fluid.marksOnly > 0.5) { return 1u + min(u32(GRAPH_MARKS) - 1u, u32(f32(rung - 1u) / steps * GRAPH_MARKS)); }
  return text[u32(fluid.rampStart) + rung];
}

// Value noise that changes shape in place, not only drifts: two random
// fields a beat apart, crossfaded, each beat a new one.
fn evolving(point: vec2f, time: f32) -> f32 {
  let beat = floor(time);
  let blend = smoothstep(0.0, 1.0, fract(time));
  let now = vec2f(hash(vec2f(beat, 3.1)), hash(vec2f(beat, 8.7))) * 97.0;
  let next = vec2f(hash(vec2f(beat + 1.0, 3.1)), hash(vec2f(beat + 1.0, 8.7))) * 97.0;
  return mix(noise(point + now), noise(point + next), blend);
}

// How open a point is in the mask, 0 to 1, in glyph cells: two octaves of
// evolving, drifting noise at the mask's scale and speed, broken up at their
// edges by its grain, per cell; or, ungrained, by the grain's average, for
// the flat fill's smooth edge.
fn masked(point: vec2f, grained: bool) -> f32 {
  let time = fluid.time * fluid.maskSpeed;
  let drift = vec2f(time * 0.04, -time * 0.03);
  // In cell heights both ways: a cell is narrower than it is tall, so its
  // own units would stretch the patches upright.
  let square = point * vec2f(fluid.cellSize.x / fluid.cellSize.y, 1.0);
  let frequency = 1.0 / max(fluid.maskScale, 0.01);
  let field = (0.55 * evolving(square * 0.06 * frequency + drift, time * 0.25) +
    0.3 * evolving(square * 0.17 * frequency - drift * 1.7, time * 0.4 + 0.5)) / 0.85;
  let grain = select(0.5, hash(floor(point) * 4.13 + 1.9), grained);
  return mix(field, grain, fluid.maskGrain);
}

// Each glyph cell's glyph, decided once per cell rather than per pixel:
// formulas a shade lighter where the dye changes sharply, and the halftone's
// glyphs inside, leaving the rest to the bare page's flicker. Torn rows, flickering
// glyphs, and still ones tumbling a quarter turn now and then. The ramp's
// solid last step is left out, so the dye never fills a cell. Written as the
// glyph's index (0 for none), its tone, and its quarter turns.
@fragment
fn cellMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let cell = tearCell(floor(position.xy), fluid.time, fluid.glitch);
  let current = textureLoad(state, texel(cell, vec2i(0)), 0);
  let dye = current.z;
  let left = textureLoad(state, texel(cell, vec2i(-1, 0)), 0).z;
  let right = textureLoad(state, texel(cell, vec2i(1, 0)), 0).z;
  let up = textureLoad(state, texel(cell, vec2i(0, -1)), 0).z;
  let down = textureLoad(state, texel(cell, vec2i(0, 1)), 0).z;
  let grain = noise(cell * 0.35 + vec2f(fluid.time * 0.6, -fluid.time * 0.4));
  let stable = hash(cell * 1.37 + 0.11);
  let still = 1.0 - smoothstep(20.0, 200.0, length(current.xy));
  let quarters = idleQuarters(stable, fluid.time, fluid.tumble * still);
  let share = 0.035 * fluid.glitch;
  // Left out of the fluid's glyphs, for an airier trail; the flicker keeps
  // them. Air spaces the glyphs out evenly, cell by cell; the mask opens
  // patches that drift and reshape as they go.
  let open = masked(cell, true);
  let airy = hash(cell * 2.31 + 4.7) < fluid.air || open < fluid.mask;
  // Faded, a glyph comes in over a stretch past each line it crosses to show,
  // rather than all at once: the mask opening, the edge, and the ink.
  let fade = fluid.glyphFade;
  let opening = fadeIn(open - fluid.mask, fade * 0.15);
  let edge = smoothstep(EDGE_START, EDGE_END, length(vec2f(right - left, down - up)) * (0.6 + 0.8 * grain));
  if (!airy && stable < edge * 0.8) {
    let glyph = glitchGlyph(textGlyph(cell), cell, fluid.time, glyphChoices(), share);
    let shown = opening * fadeIn(edge * 0.8 - stable, fade * 0.3);
    return vec4f(f32(glyph), 2.0 + shown * 0.9, quarters, sparkle(cell, fluid.hdrShare, fluid.hdrIntensity, fluid.hdrVariance));
  }
  // Grain only thins and thickens dye that is there, so clear page stays clear.
  let density = clamp(dye * (0.55 + 0.9 * grain), 0.0, 1.0);
  let steps = fluid.rampLength - 2.0;
  let level = u32(floor(density * steps + 0.5));
  if (level == 0u || airy) { return vec4f(0.0); }
  // Each cell sits a step or two off its ink's on the ramp, and its marks
  // take any of their size, changing on a slow beat of their own, so a
  // fading trail never settles on rows of one glyph.
  let beat = floor(fluid.time * 0.7 + stable * 3.0);
  let wobble = i32(round((hash(cell * 3.7 + beat * 0.41) - 0.5) * 4.0));
  // Reflected at the bottom, so faint ink spreads up the ramp rather than
  // piling on its first step.
  let rung = u32(clamp(1 + abs(i32(level) - 1 + wobble), 1, i32(steps)));
  let varied = varyMark(rampGlyph(rung, steps), hash(cell * 5.3 + beat * 0.67));
  let glyph = glitchGlyph(varied, cell, fluid.time, glyphChoices(), share);
  let shown = opening * fadeIn(density * steps - 0.5, fade * 4.0);
  return vec4f(f32(glyph), 1.0 + shown * 0.9, quarters, sparkle(cell, fluid.hdrShare, fluid.hdrIntensity, fluid.hdrVariance));
}

// 0 to 1 over `width` past a line, `past` being how far past it; all at once
// for no width.
fn fadeIn(past: f32, width: f32) -> f32 {
  return clamp(past / max(width, 1e-4), 0.0, 1.0);
}

// Flat, the dye is filled plainly in its tone, a shade lighter at its rim.
fn flatDye(pixel: vec2f) -> vec4f {
  let dye = textureSampleLevel(state, linearSampler, pixel / fluid.cellSize / fluid.cells, 0.0).z;
  // The mask hides it too, edged softly, as it fades glyphs.
  let open = masked(pixel / fluid.cellSize, false);
  let fill = smoothstep(FLAT_START, FLAT_END, dye) * fadeIn(open - fluid.mask, max(fluid.glyphFade * 0.15, 0.01));
  let rim = fill * (1.0 - smoothstep(FLAT_END, FLAT_END * 2.0, dye));
  let tone = mix(fluid.tone.rgb, vec3f(1.0), fluid.toneLift + fluid.edgeLift * rim);
  return vec4f(tone, 1.0) * fill * fluid.intensity * fluid.opacity;
}

// The glyphs' tone: the page's, lifted towards white by `lift`.
fn glyphTone(lift: f32) -> vec3f {
  return mix(fluid.tone.rgb, vec3f(1.0), lift);
}

// A `share` of glyphs lit, each for a beat of its own, at `intensity` less
// up to its `variance`: the gain `lit` brightens it by.
fn sparkle(cell: vec2f, share: f32, intensity: f32, variance: f32) -> f32 {
  let stable = hash(cell * 7.77 + 3.3);
  let beat = floor(fluid.time * 0.8 + stable * 9.0);
  if (hash(cell * 1.91 + beat * 0.613) >= share) { return 1.0; }
  let spread = 1.0 - variance * hash(cell * 4.07 + beat * 0.29);
  return 1.0 + max(intensity - 1.0, 0.0) * spread;
}

// Canvas values are gamma encoded (extended sRGB curve, shared by Display P3).
fn toLinear(encoded: vec3f) -> vec3f {
  return select(pow((encoded + 0.055) / 1.055, vec3f(2.4)), encoded / 12.92, encoded <= vec3f(0.04045));
}

fn toEncoded(light: vec3f) -> vec3f {
  return select(1.055 * pow(light, vec3f(1.0 / 2.4)) - 0.055, light * 12.92, light <= vec3f(0.0031308));
}

// Brighter by `gain` in linear light, so the hue holds: past SDR white on an
// HDR surface. SDR stops where the brightest channel reaches white, rather
// than turning the rest towards it, so a glyph brightens without washing out.
fn lit(rgb: vec3f, gain: f32) -> vec3f {
  if (gain <= 1.0) { return rgb; }
  let light = toLinear(rgb) * gain;
  if (hdr) { return toEncoded(light); }
  return toEncoded(light / max(max(max(light.r, light.g), light.b), 1.0));
}

// The cells' glyphs, premultiplied, under what the pass already drew, and
// the bare page's flicker wherever the trail has none. The atlas is drawn at
// the trail's cells' size on screen, so one sample each.
@fragment
fn compositeMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let pixel = position.xy / fluid.pixelRatio;
  let drawn = fluidPixel(pixel);
  if (fluid.maskView < 0.5) { return drawn; }
  // The mask, under what is drawn: light where it lets glyphs through, by how
  // open, and dark where it hides them.
  let point = pixel / fluid.cellSize;
  let open = masked(select(floor(point), point, fluid.flat > 0.5), fluid.flat < 0.5);
  let shade = select(0.12, 0.35 + 0.65 * open, open >= fluid.mask);
  return drawn + vec4f(vec3f(shade), 1.0) * 0.6 * (1.0 - drawn.a);
}

fn fluidPixel(pixel: vec2f) -> vec4f {
  if (fluid.flat > 0.5) {
    let filled = flatDye(pixel);
    return select(ambientGlyph(pixel), filled, filled.a > 0.0);
  }
  let cell = floor(pixel / fluid.cellSize);
  let choice = textureLoad(cells, texel(cell, vec2i(0)), 0);
  if (choice.x < 0.5) { return ambientGlyph(pixel); }
  let local = turnLocal(fract(pixel / fluid.cellSize), fluid.cellSize, choice.z);
  let coverage = glyphCoverage(u32(choice.x + 0.5), local);
  let tone = glyphTone(fluid.toneLift);
  // The tone (1) or the edges' formulas (2), and how far shown, in tenths.
  let edge = choice.y >= 2.0;
  let shown = fract(choice.y) / 0.9;
  let colour = select(tone, mix(tone, vec3f(1.0), fluid.edgeLift), edge);
  return vec4f(lit(colour, choice.w), 1.0) * coverage * shown * fluid.intensity * fluid.opacity;
}

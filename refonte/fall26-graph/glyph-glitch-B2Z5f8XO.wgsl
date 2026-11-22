// Shared by the glyph shaders, prepended to each: their full-screen pass,
// noise, running text, and the glitches that keep the glyphs from reading as
// a clean grid.

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let corner = vec2f(f32((vertexIndex << 1u) & 2u), f32(vertexIndex & 2u));
  return vec4f(corner * 2.0 - 1.0, 0.0, 1.0);
}

fn hash(value: vec2f) -> f32 {
  return fract(sin(dot(value, vec2f(127.1, 311.7))) * 43758.5453);
}

fn noise(value: vec2f) -> f32 {
  let cell = floor(value);
  let offset = fract(value);
  let blend = offset * offset * (3.0 - 2.0 * offset);
  return mix(
    mix(hash(cell), hash(cell + vec2f(1.0, 0.0)), blend.x),
    mix(hash(cell + vec2f(0.0, 1.0)), hash(cell + vec2f(1.0, 1.0)), blend.x),
    blend.y,
  );
}

// Where a cell reads in the running text: each row starts somewhere of its
// own, and alternate rows drift either way, `rate` cells a second.
fn textIndex(cell: vec2f, time: f32, rate: f32, textLength: f32) -> u32 {
  let count = i32(textLength);
  let rowOffset = i32(hash(vec2f(cell.y, 7.0)) * textLength);
  let direction = select(-1, 1, (i32(cell.y) & 1) == 0);
  let drift = i32(floor(time * rate)) * direction;
  return u32(((i32(cell.x) + rowOffset + drift) % count + count) % count);
}

// Now and then a band of rows slips sideways for a few frames, by whole
// cells, as a torn signal does; `amount` 1 tears about one band in thirty.
fn tearCell(cell: vec2f, time: f32, amount: f32) -> vec2f {
  let moment = floor(time * 9.0);
  let band = floor(cell.y / 3.0);
  let chance = hash(vec2f(band, moment));
  if (chance < 1.0 - 0.035 * amount) { return cell; }
  let shift = floor((hash(vec2f(moment, band + 17.0)) - 0.5) * 24.0);
  return vec2f(cell.x + shift, cell.y);
}

// The graph's marks, circles and squares, filled and outlined, at two sizes:
// atlas slots 1 to 8, as MARKS in glyph-atlas.ts lays them out.
const GRAPH_MARKS = 8.0;

// A graph mark swapped for another of its size, from a 0 to 1 `seed`: filled
// or outlined, circle or square, half and half. Small marks are slots 1 to
// 4, large ones 5 to 8. Any other glyph stays as it is.
fn varyMark(glyph: u32, seed: f32) -> u32 {
  if (glyph < 1u || glyph > u32(GRAPH_MARKS)) { return glyph; }
  let first = select(5u, 1u, glyph <= 4u);
  return first + u32(seed * 4.0);
}

// Any glyph but the blank, from a 0 to 1 `seed`: a graph mark about one time
// in three, so the graph's own shapes read among the maths.
fn randomGlyph(seed: f32, glyphCount: f32) -> u32 {
  if (fract(seed * 7.13) < 0.35) { return 1u + u32(fract(seed * 13.7) * GRAPH_MARKS); }
  return 1u + u32(seed * (glyphCount - 1.0));
}

// A `share` of cells flicker to a random glyph, and back; the rest keep theirs.
fn glitchGlyph(glyph: u32, cell: vec2f, time: f32, glyphCount: f32, share: f32) -> u32 {
  let moment = floor(time * 12.0);
  if (hash(cell * 0.93 + moment * 0.137) >= share) { return glyph; }
  return randomGlyph(hash(cell + moment * 0.711), glyphCount);
}

// A cell's glyph turned by `quarters` quarter turns about its centre, in px so
// the narrow cell keeps the glyph's shape. Outside the cell reads as empty.
fn turnLocal(local: vec2f, size: vec2f, quarters: f32) -> vec2f {
  let angle = quarters * 1.5707963;
  let point = (local - 0.5) * size;
  let turned = vec2f(
    point.x * cos(angle) - point.y * sin(angle),
    point.x * sin(angle) + point.y * cos(angle),
  );
  return turned / size + 0.5;
}

// Stepped quarter turns for a share of cells, each on its own beat: still
// glyphs tumbling now and then, as a mechanical display does.
fn idleQuarters(stable: f32, time: f32, share: f32) -> f32 {
  if (stable > share) { return 0.0; }
  return floor(fract(time * 0.23 + stable * 7.3) * 4.0);
}

fn glyphAt(atlas: texture_2d<f32>, atlasSampler: sampler, glyph: u32, local: vec2f, columns: f32, rows: f32) -> f32 {
  if (any(local < vec2f(0.0)) || any(local > vec2f(1.0))) { return 0.0; }
  let slot = vec2f(f32(glyph % u32(columns)), f32(glyph / u32(columns)));
  // Kept off the slot's edge, where filtering would reach its neighbour.
  let uv = (slot + clamp(local, vec2f(0.03), vec2f(0.97))) / vec2f(columns, rows);
  return textureSampleLevel(atlas, atlasSampler, uv, 0.0).r;
}

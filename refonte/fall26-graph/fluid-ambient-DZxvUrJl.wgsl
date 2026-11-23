// The bare page's flicker under the pointer's fluid: a set number of glyphs,
// each on a beat of its own, staggered evenly, moving to a random cell of a
// grid of its own each beat. Nothing is stored; each pixel works out which
// glyph, if any, holds its cell.

// The glyph a flickering cell shows, if any, premultiplied.
fn ambientGlyph(pixel: vec2f) -> vec4f {
  if (fluid.ambient < 1.0 || fluid.ambientOpacity <= 0.0) { return vec4f(0.0); }
  let size = fluid.ambientCellSize;
  let cell = floor(pixel / size);
  let held = ambientTurn(cell);
  if (held.y < 0.0) { return vec4f(0.0); }
  let phase = held.x;
  let beat = held.y;
  let stable = hash(cell * 1.37 + 0.11);
  // Faded, it comes in at the start of its turn and goes at the end, over up
  // to half the turn each, rather than popping in and out.
  let shown = min(fadeIn(phase, fluid.ambientFade * 0.5), fadeIn(1.0 - phase, fluid.ambientFade * 0.5));
  let choices = select(fluid.glyphCount, GRAPH_MARKS + 1.0, fluid.ambientMarksOnly > 0.5);
  let glyph = randomGlyph(hash(cell + beat * 0.517), choices);
  let quarters = idleQuarters(stable, fluid.time, fluid.ambientTumble);
  // Each glyph shrinks by up to the variety about its cell's centre.
  let scale = 1.0 - fluid.ambientSizeVariety * hash(cell * 2.9 + beat * 0.37);
  let origin = cell * size;
  // Four samples a pixel, for the glyphs shrunk by the variety: these
  // glyphs are few enough for it to cost nothing.
  let step = 0.125 / fluid.pixelRatio;
  let coverage = 0.25 * (
    ambientTap(glyph, pixel + vec2f(-1.0, -3.0) * step, origin, scale, quarters) +
    ambientTap(glyph, pixel + vec2f(3.0, -1.0) * step, origin, scale, quarters) +
    ambientTap(glyph, pixel + vec2f(1.0, 3.0) * step, origin, scale, quarters) +
    ambientTap(glyph, pixel + vec2f(-3.0, 1.0) * step, origin, scale, quarters)
  );
  if (coverage <= 0.0) { return vec4f(0.0); }
  let gain = sparkle(cell, fluid.ambientHdrShare, fluid.ambientHdrIntensity, fluid.ambientHdrVariance);
  return vec4f(lit(glyphTone(fluid.ambientToneLift), gain), 1.0) * coverage * shown * fluid.ambientIntensity * fluid.ambientOpacity;
}

// How far through its turn the glyph holding this cell is, and its beat; a
// beat of -1 when none holds it. The cells are shuffled into slots once, and
// glyph k, a k-th of a turn ahead of the first, holds slot beat * count - k,
// wrapped: so the glyphs hold a run of count slots, never the same twice,
// and each moves count slots on as its beat comes.
fn ambientTurn(cell: vec2f) -> vec2f {
  let columns = u32(fluid.ambientCells.x);
  let total = columns * u32(fluid.ambientCells.y);
  let count = u32(fluid.ambient);
  let slot = shuffle(u32(cell.y) * columns + u32(cell.x), total);
  // The glyph that holds it on the first glyph's beat, or on the next.
  let current = (u32(fluid.ambientBase) + total - slot) % total;
  let next = (current + count) % total;
  if (current < count) {
    let turn = fluid.ambientPhase + f32(current) / f32(count);
    if (turn < 1.0) { return vec2f(turn, fluid.ambientBeat); }
  }
  if (next < count) {
    let turn = fluid.ambientPhase + f32(next) / f32(count);
    if (turn >= 1.0) { return vec2f(turn - 1.0, fluid.ambientBeat + 1.0); }
  }
  return vec2f(0.0, -1.0);
}

// A random order of 0 to total - 1: a Feistel network over the next even
// power of two up, walked on until it lands back in range.
fn shuffle(index: u32, total: u32) -> u32 {
  if (total <= 1u) { return 0u; }
  let half = (firstLeadingBit(total - 1u) + 2u) / 2u;
  let mask = (1u << half) - 1u;
  var value = index;
  // A walk always comes back in range; the cap only bounds the loop.
  for (var walk = 0u; walk < 64u; walk++) {
    var left = value >> half;
    var right = value & mask;
    for (var stage = 0u; stage < 4u; stage++) {
      let next = left ^ (mixBits(right ^ (stage * 0x85ebca6bu)) & mask);
      left = right;
      right = next;
    }
    value = (left << half) | right;
    if (value < total) { return value; }
  }
  return value % total;
}

// PCG's output hash: every bit of the result depends on every bit of `value`.
fn mixBits(value: u32) -> u32 {
  let state = value * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn ambientTap(glyph: u32, pixel: vec2f, origin: vec2f, scale: f32, quarters: f32) -> f32 {
  let size = fluid.ambientCellSize;
  let local = ((pixel - origin) / size - 0.5) / max(scale, 0.05) + 0.5;
  return glyphAt(ambientAtlas, linearSampler, glyph, turnLocal(local, size, quarters), fluid.atlasColumns, fluid.atlasRows);
}

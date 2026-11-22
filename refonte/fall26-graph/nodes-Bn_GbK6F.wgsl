struct NodeVertexInput {
  @location(0) geometry: vec4f,
  @location(1) color: vec4f,
  @location(2) clip: vec4f,
  @location(3) textureData: vec4f,
}

struct NodeVertexOutput {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat) color: vec4f,
  @location(2) @interpolate(flat) shape: f32,
  @location(3) @interpolate(flat) radius: f32,
  @location(4) @interpolate(flat) clipMin: vec2f,
  @location(5) @interpolate(flat) clipMax: vec2f,
  @location(6) @interpolate(flat) imageSlot: f32,
  @location(7) @interpolate(flat) outline: f32,
  @location(8) @interpolate(flat) outlineTint: f32,
  // Half the mark's width and height: a square's, or a thumbnail's own shape.
  @location(9) @interpolate(flat) halfSize: vec2f,
}

// Mirrors NODE_OUTLINE_GAP in frame.ts.
const OUTLINE_GAP = 1.5;

// Shared with edges.wgsl, which reads only `viewport`.
struct Globals {
  // CSS width and height, then the device scale on each axis.
  viewport: vec4f,
  // The thumbnail outline's Display P3 colour in rgb.
  outline: vec4f,
}

@group(0) @binding(0) var<uniform> globals: Globals;
@group(0) @binding(1) var nodeSampler: sampler;
@group(0) @binding(2) var nodeTextures: texture_2d_array<f32>;

// A loaded thumbnail fits its image's own shape, width over height in
// `aspect`, inside its square, as Canvas2D fits it; any other mark fills it.
fn markHalfSize(shape: f32, radius: f32, aspect: f32) -> vec2f {
  if (shape != 3.0 || aspect <= 0.0) {
    return vec2f(radius);
  }
  return select(
    vec2f(radius * aspect, radius),
    vec2f(radius, radius / aspect),
    aspect >= 1.0,
  );
}

fn quadCorner(vertexIndex: u32) -> vec2f {
  switch vertexIndex {
    case 0u { return vec2f(-1.0, -1.0); }
    case 1u { return vec2f(1.0, -1.0); }
    case 2u { return vec2f(-1.0, 1.0); }
    case 3u { return vec2f(-1.0, 1.0); }
    case 4u { return vec2f(1.0, -1.0); }
    default { return vec2f(1.0, 1.0); }
  }
}

@vertex
fn vertexMain(input: NodeVertexInput, @builtin(vertex_index) vertexIndex: u32) -> NodeVertexOutput {
  let cssSize = globals.viewport.xy;
  let scale = globals.viewport.zw;
  let pixel = 1.0 / max(0.0001, min(scale.x, scale.y));
  // Thumbnails draw a 1px outline centred OUTLINE_GAP px outside their edge.
  let outline = select(0.0, input.textureData.y, input.geometry.w == 3.0);
  let padding = pixel * 1.5 + select(0.0, OUTLINE_GAP + 1.0, outline > 0.0);
  let radius = max(input.geometry.z, 0.0);
  let local = quadCorner(vertexIndex) * (radius + padding);
  let css = input.geometry.xy + local;
  let physicalSize = cssSize * scale;
  let physical = css * scale;
  var output: NodeVertexOutput;
  output.position = vec4f(
    physical.x / physicalSize.x * 2.0 - 1.0,
    1.0 - physical.y / physicalSize.y * 2.0,
    0.0,
    1.0,
  );
  output.local = local;
  output.color = input.color;
  output.shape = input.geometry.w;
  output.radius = radius;
  output.clipMin = input.clip.xy * scale;
  output.clipMax = input.clip.zw * scale;
  output.imageSlot = input.textureData.x;
  output.outline = outline;
  output.outlineTint = input.textureData.z;
  output.halfSize = markHalfSize(input.geometry.w, radius, input.textureData.w);
  return output;
}

fn intervalCoverage(value: f32, halfSize: f32, pixel: f32) -> f32 {
  return clamp((value + halfSize) / pixel + 0.5, 0.0, 1.0)
    - clamp((value - halfSize) / pixel + 0.5, 0.0, 1.0);
}

fn nodeCoverage(shape: f32, local: vec2f, radius: f32, halfSize: vec2f) -> f32 {
  let radial = length(local) - radius;
  let pixel = max(length(vec2f(dpdx(radial), dpdy(radial))), 0.0001);
  let pixelX = max(length(vec2f(dpdx(local.x), dpdy(local.x))), 0.0001);
  let pixelY = max(length(vec2f(dpdx(local.y), dpdy(local.y))), 0.0001);
  // Between circle (0) and square (1), a square rounding off: its corners'
  // radius grows as the shape heads for a circle. Measured before branching,
  // where derivatives are allowed.
  let corner = radius * (1.0 - clamp(shape, 0.0, 1.0));
  let inset = abs(local) - vec2f(radius - corner);
  let rounded = length(max(inset, vec2f(0.0))) + min(max(inset.x, inset.y), 0.0) - corner;
  let roundedPixel = max(length(vec2f(dpdx(rounded), dpdy(rounded))), 0.0001);
  if (shape == 1.0 || shape == 3.0) {
    return intervalCoverage(local.x, halfSize.x, pixelX) * intervalCoverage(local.y, halfSize.y, pixelY);
  }
  if (shape > 0.0 && shape < 1.0) {
    return clamp(0.5 - rounded / roundedPixel, 0.0, 1.0);
  }
  if (shape == 2.0) {
    return intervalCoverage(radial, 0.5, pixel);
  }
  return clamp(0.5 - radial / pixel, 0.0, 1.0);
}

fn outlineCoverage(local: vec2f, halfSize: vec2f) -> f32 {
  let distance = max(abs(local.x) - halfSize.x, abs(local.y) - halfSize.y) - OUTLINE_GAP;
  let pixel = max(length(vec2f(dpdx(distance), dpdy(distance))), 0.0001);
  return intervalCoverage(distance, 0.5, pixel);
}

fn plainNodeColor(input: NodeVertexOutput, coverage: f32) -> vec4f {
  let alpha = input.color.a * coverage;
  return vec4f(input.color.rgb * alpha, alpha);
}

fn imageNodeColor(input: NodeVertexOutput, coverage: f32) -> vec4f {
  let uvInset = 0.5 / f32(textureDimensions(nodeTextures).x);
  let uv = clamp(
    input.local / max(input.halfSize * 2.0, vec2f(0.0001)) + vec2f(0.5),
    vec2f(uvInset),
    vec2f(1.0 - uvInset),
  );
  // Explicit LOD: sampling happens under non-uniform per-instance control flow.
  let sample = textureSampleLevel(
    nodeTextures, nodeSampler, uv, i32(max(input.imageSlot, 0.0)), 0.0,
  );
  let alpha = sample.a * input.color.a * coverage;
  return vec4f(sample.rgb * alpha, alpha);
}

@fragment
fn fragmentMain(input: NodeVertexOutput) -> @location(0) vec4f {
  let coverage = nodeCoverage(input.shape, input.local, input.radius, input.halfSize);
  // Derivatives need uniform control flow, so this runs before any branch.
  let ring = outlineCoverage(input.local, input.halfSize) * input.outline;
  let position = input.position;
  if (
    (coverage <= 0.0 && ring <= 0.0) ||
    input.color.a <= 0.0 ||
    input.radius <= 0.0 ||
    input.clipMax.x <= input.clipMin.x ||
    input.clipMax.y <= input.clipMin.y ||
    position.x < input.clipMin.x ||
    position.y < input.clipMin.y ||
    position.x >= input.clipMax.x ||
    position.y >= input.clipMax.y
  ) {
    discard;
  }
  if (coverage <= 0.0) {
    let alpha = ring;
    // A hover leans the outline from the frame's colour to the mark's own.
    let colour = mix(globals.outline.rgb, input.color.rgb, input.outlineTint);
    return vec4f(colour * alpha, alpha);
  }
  if (input.shape == 3.0 && input.imageSlot >= 0.0) {
    return imageNodeColor(input, coverage);
  }
  return plainNodeColor(input, coverage);
}

struct EdgeVertexInput {
  @location(0) endpoints: vec4f,
  @location(1) widths: vec4f,
  @location(2) startColor: vec4f,
  @location(3) endColor: vec4f,
  @location(4) clip: vec4f,
}

struct EdgeVertexOutput {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat) length: f32,
  @location(2) @interpolate(flat) startHalf: f32,
  @location(3) @interpolate(flat) endHalf: f32,
  @location(4) @interpolate(flat) startColor: vec4f,
  @location(5) @interpolate(flat) endColor: vec4f,
  @location(6) @interpolate(flat) clipMin: vec2f,
  @location(7) @interpolate(flat) clipMax: vec2f,
}

@group(0) @binding(0) var<uniform> viewport: vec4f;

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
fn vertexMain(input: EdgeVertexInput, @builtin(vertex_index) vertexIndex: u32) -> EdgeVertexOutput {
  let cssSize = viewport.xy;
  let scale = viewport.zw;
  let pixel = 1.0 / max(0.0001, min(scale.x, scale.y));
  let padding = pixel * 1.5;
  let startHalf = max(input.widths.x, 0.0) * 0.5;
  let endHalf = max(input.widths.y, 0.0) * 0.5;
  let corner = quadCorner(vertexIndex);
  let delta = input.endpoints.zw - input.endpoints.xy;
  let edgeLength = length(delta);
  let halfMax = max(startHalf, endHalf) + padding;
  var local = vec2f(0.0, 0.0);
  var css = input.endpoints.xy;
  if (edgeLength <= 0.0001) {
    local = corner * vec2f(halfMax, halfMax);
    css += local;
  } else {
    let direction = delta / edgeLength;
    let perpendicular = vec2f(-direction.y, direction.x);
    let halfLength = edgeLength * 0.5 + padding;
    let center = (input.endpoints.xy + input.endpoints.zw) * 0.5;
    local = vec2f(corner.x * halfLength, corner.y * halfMax);
    css = center + direction * local.x + perpendicular * local.y;
  }
  let physicalSize = cssSize * scale;
  let physical = css * scale;
  var output: EdgeVertexOutput;
  output.position = vec4f(
    physical.x / physicalSize.x * 2.0 - 1.0,
    1.0 - physical.y / physicalSize.y * 2.0,
    0.0,
    1.0,
  );
  output.local = local;
  output.length = edgeLength;
  output.startHalf = startHalf;
  output.endHalf = endHalf;
  output.startColor = input.startColor;
  output.endColor = input.endColor;
  output.clipMin = input.clip.xy * scale;
  output.clipMax = input.clip.zw * scale;
  return output;
}

fn intervalCoverage(value: f32, halfSize: f32, pixel: f32) -> f32 {
  return clamp((value + halfSize) / pixel + 0.5, 0.0, 1.0)
    - clamp((value - halfSize) / pixel + 0.5, 0.0, 1.0);
}

fn edgeCoverage(edgeLength: f32, startHalf: f32, endHalf: f32, local: vec2f) -> f32 {
  // Differentiate coordinates before abs; folded distance breaks subpixel lines.
  let pixelX = max(length(vec2f(dpdx(local.x), dpdy(local.x))), 0.0001);
  let pixelY = max(length(vec2f(dpdx(local.y), dpdy(local.y))), 0.0001);
  if (edgeLength <= 0.0001) {
    let halfSize = max(startHalf, endHalf);
    return intervalCoverage(local.x, halfSize, pixelX) * intervalCoverage(local.y, halfSize, pixelY);
  }
  let t = clamp((local.x + edgeLength * 0.5) / edgeLength, 0.0, 1.0);
  let halfWidth = mix(startHalf, endHalf, t);
  return intervalCoverage(local.x, edgeLength * 0.5, pixelX)
    * intervalCoverage(local.y, halfWidth, pixelY);
}

fn gradientT(edgeLength: f32, startHalf: f32, endHalf: f32, local: vec2f) -> f32 {
  if (edgeLength <= 0.0001) {
    let halfSize = max(startHalf, endHalf);
    return clamp((local.x + startHalf) / max(0.0001, halfSize + startHalf), 0.0, 1.0);
  }
  return clamp((local.x + edgeLength * 0.5) / edgeLength, 0.0, 1.0);
}

@fragment
fn fragmentMain(input: EdgeVertexOutput) -> @location(0) vec4f {
  let coverage = edgeCoverage(input.length, input.startHalf, input.endHalf, input.local);
  let t = gradientT(input.length, input.startHalf, input.endHalf, input.local);
  let position = input.position;
  if (
    (input.startHalf <= 0.0 && input.endHalf <= 0.0) ||
    input.clipMax.x <= input.clipMin.x ||
    input.clipMax.y <= input.clipMin.y ||
    position.x < input.clipMin.x ||
    position.y < input.clipMin.y ||
    position.x >= input.clipMax.x ||
    position.y >= input.clipMax.y
  ) {
    discard;
  }
  let color = mix(input.startColor, input.endColor, t);
  let alpha = color.a * coverage;
  return vec4f(color.rgb * alpha, alpha);
}

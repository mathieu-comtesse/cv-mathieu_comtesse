/* Aides WebGPU : états de mélange (alpha prémultiplié), chargement et compilation de shaders, taille de texture en puissance de deux. */
export const BLEND_OVER = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
export const BLEND_UNDER = { color: { srcFactor: 'one-minus-dst-alpha', dstFactor: 'one', operation: 'add' }, alpha: { srcFactor: 'one-minus-dst-alpha', dstFactor: 'one', operation: 'add' } };
export async function fetchShader(url, label, signal) {
  signal.throwIfAborted();
  const response = await fetch(url, { signal });
  signal.throwIfAborted();
  if (!response.ok) throw new Error(`Failed to load ${label} shader: ${response.status} ${response.statusText}`);
  const code = await response.text();
  signal.throwIfAborted();
  return code;
}
export async function compileShader(device, code, label) {
  const module = device.createShaderModule({ code, label });
  const errors = (await module.getCompilationInfo()).messages.filter((m) => m.type === 'error');
  if (errors.length) throw new Error(`${label} shader compilation failed:\n${errors.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n')}`);
  return module;
}
export async function loadShader(device, url, label, signal) {
  const code = await fetchShader(url, label, signal);
  const module = await compileShader(device, code, label);
  signal.throwIfAborted();
  return module;
}
export function nextPowerOfTwo(value, floor = 1) { let size = Math.max(1, value); while (size < floor) size *= 2; return size; }
export { BLEND_OVER as P, BLEND_UNDER as U, compileShader as c, fetchShader as f, loadShader as l, nextPowerOfTwo as n };

/* Surface WebGPU d'un canvas : adaptateur, périphérique, contexte, configuration HDR facultative et nettoyage à l'abandon. */
export class WebGPUUnavailable extends Error {}
export const DEVICE_LOST = 'createWebGPUSurface.deviceLost';
export async function createWebGPUSurface(canvas, signal, onError, wantHdr = false) {
  signal.throwIfAborted();
  if (!navigator.gpu) throw new WebGPUUnavailable('WebGPU is unavailable in this browser.');
  const adapter = await navigator.gpu.requestAdapter();
  signal.throwIfAborted();
  if (!adapter) throw new WebGPUUnavailable('No WebGPU adapter is available.');
  const device = await adapter.requestDevice();
  if (signal.aborted) { device.destroy(); signal.throwIfAborted(); }
  const context = canvas.getContext('webgpu');
  if (!context) { device.destroy(); throw new Error('The canvas cannot create a WebGPU context.'); }
  const tryHdr = wantHdr && matchMedia('(dynamic-range: high)').matches;
  if (tryHdr) context.configure({ device, format: 'rgba16float', toneMapping: { mode: 'extended' } });
  const hdr = tryHdr && context.getConfiguration?.()?.toneMapping?.mode === 'extended';
  if (hdr) canvas.style.borderTopLeftRadius = '1px';
  let closed = false;
  const report = (message, source) => { if (!closed && !signal.aborted) onError(message, source); };
  const onUncaptured = (event) => report(event.error.message, 'createWebGPUSurface.uncapturedError');
  const dispose = () => {
    if (closed) return;
    closed = true;
    if (hdr) canvas.style.borderTopLeftRadius = '';
    signal.removeEventListener('abort', dispose);
    device.removeEventListener('uncapturederror', onUncaptured);
    context.unconfigure(); device.destroy();
  };
  device.addEventListener('uncapturederror', onUncaptured);
  signal.addEventListener('abort', dispose, { once: true });
  device.lost.then((info) => report(info.message || `WebGPU device lost: ${info.reason}`, DEVICE_LOST));
  return { kind: 'webgpu', canvas, device, context, format: hdr ? 'rgba16float' : navigator.gpu.getPreferredCanvasFormat(), hdr, dispose };
}
export { DEVICE_LOST as D, WebGPUUnavailable as W, createWebGPUSurface as c };

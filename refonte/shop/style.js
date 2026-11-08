/* Couleurs et réglages de tracé du graphe : jetons de thème, conversions sRVB / Display P3, styles prêts à envoyer au GPU. */
import { c as palette } from './colorPalette.js';
import { W as WIRE } from './wire.js';

const variable = (c) => `var(${c.customProperty})`, section = (c) => ({ DEFAULT: variable(c), surface: `var(${c.surface.customProperty})`, button: `var(${c.button.customProperty})` });
export const theme = { brand: variable(palette.blue), graph: { background: 'color(display-p3 0.0063 0.0167 0.0937)' },
  section: { blue: section(palette.blue), pink: section(palette.pink), green: section(palette.green), orange: section(palette.orange), purple: section(palette.purple), slate: section(palette.slate) } };

export const P3_PATTERN = /^color\(\s*display-p3\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/i;
export function parseP3(text) {
  const m = P3_PATTERN.exec(text);
  if (!m) throw new Error(`Not a display-p3 colour: ${text}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
export const toLinear = (v) => (v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
const toGamma = (v) => (v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055);
/** sRVB (0..1 par canal) vers Display P3 (0..1 par canal). */
export function srgbToP3(r, g, b) {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b);
  return [toGamma(.8224621 * R + .177538 * G), toGamma(.0331941 * R + .9668058 * G), toGamma(.0170827 * R + .0723974 * G + .9105199 * B)];
}
function rgbOf(text) {
  const p3 = P3_PATTERN.exec(text.trim());
  if (p3) return [Number(p3[1]), Number(p3[2]), Number(p3[3])];
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(text.trim());
  return hex ? srgbToP3(parseInt(hex[1], 16) / 255, parseInt(hex[2], 16) / 255, parseInt(hex[3], 16) / 255) : [0, 0, 0];
}
function alphaOf(text) {
  const m = P3_PATTERN.exec(text.trim());
  if (!m?.[4]) return 1;
  return Math.min(1, Math.max(0, Number(m[4]) / (m[5] ? 100 : 1)));
}

export const settings = {
  inkColor: 'color(display-p3 0.2187 0.2992 0.9102)', hoverColor: 'color(display-p3 0.4975 0.9331 0.5992 / 0.4)', sectionColor: 'color(display-p3 0.4093 0.4751 0.9644)',
  updateColor: 'color(display-p3 0.2578 0.3231 0.8094)', featuredColor: '#00ffdf', imageStrokeColor: 'color(display-p3 1 1 1 / 0.4)', sectionRingColor: 'color(display-p3 1 1 1 / 0.75)',
  tetherStartColor: 'color(display-p3 0.0542 0.0713 0.2424)', tetherEndColor: 'color(display-p3 0.4093 0.4751 0.9644 / 0.4)', relatedColor: 'color(display-p3 0.7596 0.788 1)',
  sectionInk1: 'color(display-p3 0.1078 0.4878 0.8202)', sectionInk2: 'color(display-p3 0.4199 0.9855 0.7027 / 0.4)', sectionInk3: 'color(display-p3 0.4199 0.5707 0.9855 / 0.4)',
  sectionInk1End: 'color(display-p3 0.4093 0.4751 0.9644 / 0.4)', sectionInk2End: 'color(display-p3 0.4093 0.4751 0.9644 / 0.4)', sectionInk3End: 'color(display-p3 0.4093 0.4751 0.9644 / 0.4)',
  tetherWidth: 1, relatedWidth: .75 * .6, relatedHoverWidth: .75, flowWidth: 1, relatedIdleAlpha: .15, relatedHoverAlpha: .5, containsAlpha: .7, contextAlpha: .5, pageMarkAlpha: .55
};
const rootP3 = parseP3(palette.blue.displayP3);
export function buildStyle(o) {
  const inks = [o.sectionInk1, o.sectionInk2, o.sectionInk3], ends = [o.sectionInk1End, o.sectionInk2End, o.sectionInk3End];
  return {
    background: [...rootP3, 0], backdrop: parseP3(theme.graph.background), ink: rgbOf(o.inkColor), hover: rgbOf(o.hoverColor), hoverAlpha: alphaOf(o.hoverColor), root: rootP3,
    section: rgbOf(o.sectionColor), update: rgbOf(o.updateColor), featured: rgbOf(o.featuredColor), imageStroke: rgbOf(o.imageStrokeColor), imageStrokeAlpha: alphaOf(o.imageStrokeColor),
    sectionRing: rgbOf(o.sectionRingColor), sectionRingAlpha: alphaOf(o.sectionRingColor), tetherStart: rgbOf(o.tetherStartColor), tetherEnd: rgbOf(o.tetherEndColor), tetherEndAlpha: alphaOf(o.tetherEndColor),
    rootTetherEnd: rgbOf('#26ff9e'), related: rgbOf(o.relatedColor), sectionInks: inks.map(rgbOf), sectionInkAlphas: inks.map(alphaOf), sectionInkEnds: ends.map(rgbOf), sectionInkEndAlphas: ends.map(alphaOf),
    tetherWidth: o.tetherWidth, relatedWidth: o.relatedWidth, relatedHoverWidth: o.relatedHoverWidth, relatedIdleAlpha: o.relatedIdleAlpha, relatedHoverAlpha: o.relatedHoverAlpha,
    containsAlpha: o.containsAlpha, contextAlpha: o.contextAlpha, pageLineAlpha: WIRE.alpha, pageMarkAlpha: o.pageMarkAlpha, flowWidth: o.flowWidth
  };
}
export const defaultStyle = buildStyle(settings);
export { P3_PATTERN as D, defaultStyle as G, settings as S, theme as a, buildStyle as c, parseP3 as p, srgbToP3 as s, toLinear as t };

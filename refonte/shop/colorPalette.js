/* Palette des sections : une couleur de fond, sa variante de surface et de bouton, en sRVB et en Display P3. */
const row = (name, srgb, p3, surface, button, foreground = 'white') => ({
  customProperty: name === 'blue' ? '--f26-color-brand' : `--f26-color-section-${name}`, srgb, displayP3: `color(display-p3 ${p3})`, secondaryAlpha: .7,
  surface: { customProperty: `--f26-color-section-${name}-surface`, srgb: surface[0], displayP3: `color(display-p3 ${surface[1]})` },
  button: { customProperty: `--f26-color-section-${name}-button`, srgb: button[0], foreground, displayP3: `color(display-p3 ${button[1]})` }
});
export const palette = {
  blue: row('blue', '#051DAA', '0.0444 0.1135 0.638', ['#0822B5', '0.0595 0.1318 0.6805'], ['#071047', '0.0345 0.0619 0.2655']),
  pink: row('pink', '#B2005B', '0.638 0.0444 0.3511', ['#BE0062', '0.6808 0.0592 0.3804'], ['#4B0128', '0.2655 0.0345 0.1539']),
  green: row('green', '#00632E', '0.02 0.38 0.2', ['#007035', '0.0299 0.4301 0.23'], ['#002F17', '0.02 0.18 0.1']),
  orange: row('orange', '#B03400', '0.6358 0.2414 0.0442', ['#C13C00', '0.6992 0.2736 0.0608'], ['#491903', '0.2655 0.1115 0.0345']),
  purple: row('purple', '#7000A9', '0.4005 0.0444 0.638', ['#7900B4', '0.4322 0.0592 0.6808'], ['#310647', '0.1731 0.0345 0.2655']),
  slate: row('slate', '#0F0F0F', '0.0573 0.0573 0.0573', ['#171717', '0.0901 0.0901 0.0901'], ['#CECECE', '0.8071 0.8071 0.8071'], 'black')
};
export const DEFAULT_COLOR = 'blue';
export const SECONDARY_CLASS = { .7: 'text-current/70' };
export const TERTIARY_CLASS = 'text-current/90';
export { DEFAULT_COLOR as D, SECONDARY_CLASS as S, TERTIARY_CLASS as T, palette as c };

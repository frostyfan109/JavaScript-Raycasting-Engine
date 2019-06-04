/**
 * Utility function used to convert an array of [r, g, b] to a CSS hex string
 *
 *
 */
export function rgbToHex(r, g, b) {
  return (
    (1 << 24) // eslint-disable-line no-bitwise
    + (r << 16) // eslint-disable-line no-bitwise
    + (g << 8) // eslint-disable-line no-bitwise
    + b
  ).toString(16).slice(1);
}

/**
 * Native color class used in engine, in the format rgba.
 * Note: Alpha is supported, but, when used in large quantities, may result in significant loss of performance.
 */
export default class Color {
  constructor(r, g, b, a=1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  toHex() {
    return parseInt(rgbToHex(this.r, this.g, this.b), 16);
  }

  toCSSString() {
    return `rgba(${this.r},${this.g},${this.b},${this.a})`;
  }
}

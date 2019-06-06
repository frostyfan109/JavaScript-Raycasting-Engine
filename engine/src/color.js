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

  /**
   * Utility function used to convert values r, g, b to a CSS hex string
   *    NOTE: Ignores the alpha layer.
   *
   */
  toHexString() {
    return "#" + (
      (1 << 24) // eslint-disable-line no-bitwise
      + (this.r << 16) // eslint-disable-line no-bitwise
      + (this.g << 8) // eslint-disable-line no-bitwise
      + this.b
    ).toString(16).slice(1);
  }

  toHexInt() {
    return parseInt(this.toHexString(this.r, this.g, this.b, this.a).slice(1), 16);
  }

  toCSSString() {
    return `rgba(${this.r},${this.g},${this.b},${this.a})`;
  }
}

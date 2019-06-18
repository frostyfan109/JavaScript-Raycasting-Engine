export class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  /**
   * Rotates the point about an anchor
   *
   * @param {number} x - Anchor's x-axis coordinate
   * @param {number} y - Anchor's y-axis coordinate
   * @param {number} angle - Angle in radians
   */
  rotate(x, y, angle) {
    // const length = Math.sqrt(((this.x - x)**2), ((this.y - y)**2));
    this.x -= x;
    this.y -= y;
    let s = Math.sin(angle);
    let c = Math.cos(angle);
    let tx = c * this.x - s * this.y;
    let ty = s * this.x + c * this.y;
    this.x = x + tx;
    this.y = y + ty;
    // this.x = length * Math.sin(angle);
    // this.y = length * Math.cos(angle);
    // console.log(this.x,this.y, angle, length);
    // angle = angle + Math.atan2(this.y - y, this.x - x);
    // this.x = x + (length * Math.cos(angle));
    // this.y = y + (length * Math.sin(angle));
  }
}
export class Line {
  constructor(x1, y1, x2, y2) {
    this.start = new Point(x1, y1);
    this.end = new Point(x2, y2);
    this._updateLength();
    this._updateAngle();
    this._updateMidpoint();
  }
  /**
   * Sets the line to a new line created from length and an angle
   *
   * @param {number} x - Starting x-axis coordinate of the line
   * @param {number} y - Starting y-axis coordinate of the line
   * @param {number} angle - Angle in radians that the line is created from
   * @param {number} length - Length of the line
   */
  fromAngle(x, y, angle, length) {
    let start = new Point(
      x,
      y
    );
    let end = new Point(
      x + (length * Math.cos(angle)),
      y + (length * Math.sin(angle))
    );
    this.start = start;
    this.end = end;
    this._updateLength();
    this._updateAngle();
    this._updateMidpoint();
  }
  /**
   * Sets the new coordinates of the Line
   *
   * @param {number} x1 - Starting x-axis coordinate
   * @param {number} y1 - Starting y-axis coordinate
   * @param {number} x2 - Ending x-axis coordinate
   * @param {number} y2 - Ending y-axis coordinate
   *
   */
  setTo(x1, y1, x2, y2) {
    this.start = new Point(
      x1,
      y1
    );
    this.end = new Point(
      x2,
      y2
    );
    this._updateLength();
    this._updateAngle();
    this._updateMidpoint();
  }
  /**
   * Rotates the line about its midpoint by a given amount
   *
   * @param {number} angle - Angle to rotate the line by
   * @param {boolean} degrees - If true, angle will treated as if it is in degrees (defaults to radians)
   */
  rotate(angle, degrees=false) {
    if (degrees) angle = angle.toRad();
    const midpoint = this.midpoint;
    const cx = midpoint.x;
    const cy = midpoint.y;
    this.start.rotate(cx, cy, angle);
    this.end.rotate(cx, cy, angle);
    this._updateAngle();
    this._updateMidpoint();
  }
  /**
   * Calculating the angle of the line
   */
  _updateAngle() {
    this.angle = Math.atan2((this.end.y-this.start.y),(this.end.x-this.start.x));
  }
  /**
   * Applying the distance formula to the line
   */
  _updateLength() {
    this.length = Math.sqrt(((this.end.x-this.start.x)**2) + ((this.end.y-this.start.y)**2));
  }
  /**
   * Alias of Line::midpoint
   */
  get center() {
    return this.midpoint;
  }
  /**
   * Getter shorthand for calculating the midpoint of the Line
   */
  _updateMidpoint() {
    this.midpoint = new Point(
      (this.end.x + this.start.x) / 2,
      (this.end.y + this.start.y) / 2
    );
  }
  /**
   * Shorthand for the x-axis midpoint coordinate of the Line
   */
  get x() {
    return this.center.x;
  }
  /**
   * Shorthand for the y-axis midpoint coordinate of the Line
   */
  get y() {
    return this.center.y;
  }
}
export class Rect {
  constructor(x,  y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

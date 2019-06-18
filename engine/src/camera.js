import Color from './color';
import { intersect, scale } from './util';
import { Point, Line, Rect } from './geom';
import * as timsort from './external/timsort.min';
/**
 * Ray class used for performing logic
 *
 */
class Ray extends Line {
  constructor(x, y, angle, length) {
    super();
    this.fromAngle(x, y, angle, length);
    this.origin = new Point(this.start.x, this.start.y);
    this.collisions = [];
  }
}

/**
 * Native camera object used to cast rays.
 *
 * @param {PlanarObject} object - Object that the camera is attached to. May be reassigned at any point.
 * @param {number} [fov=100] - Fov in degrees of the camera
 * @param {number} [turnSpeed=3.14159] - Turn speed of the camera in radians per seconds.
 *
 */
export default class Camera {
  constructor(object, game, fov, turnSpeed) {
    this.object = object;
    this.game = game;
    this.fov = typeof fov !== "undefined" ? fov : 100;
    this.turnSpeed = typeof turnSpeed !== "undefined" ? turnSpeed : Math.PI;

    this._rays = [];

    /* Offsets the axis positions of the camera from the owner object. */
    // 2d context
    this.xOffset = 0;
    this.zOffset = 0;
    // 3d context
    // yOffset is at the top of the object
    this.yOffset = this.object.varHeight;

    // May set to render the ground and sky custom colors
    this.groundColor = undefined;
    this.skyColor = undefined;
  }

  calculateRayCollision() {
    let obj = this.object;
    let objects = obj.raycaster.objects.filter(object => object !== obj && object.visible);
    for (let i=0;i<this._rays.length;i++) {
      let ray = this._rays[i];
      for (let n=0;n<objects.length;n++) {
        let colObj = objects[n];
        const intersection = intersect(ray.start.x, ray.start.y, ray.end.x, ray.end.y, colObj.start.x, colObj.start.y, colObj.end.x, colObj.end.y);
        if (intersection) ray.collisions.push({ p: intersection, obj: colObj });
        // console.log(ray.start.x, ray.start.y, ray.end.x, ray.end.y, colObj.start.x, colObj.start.y, colObj.end.x, colObj.end.y);
      }
    }
  }

  castRays() {
    this._rays.length = 0; // empty the ray array

    // distToProjSurface = total_rays/2 / tan(half_of_fov_in_rad)
    const distToProjSurface = (this.object.raycaster.totalRays / 2) / Math.tan((this.fov / 2).toRad());
    for (let x = 0; x < this.object.raycaster.totalRays; x++) {
      let angle = Math.atan((x - (this.object.raycaster.totalRays / 2)) / distToProjSurface);
      angle += (this.object.angle.toDeg()+90).toRad();
      const ray = new Ray(this.object.midpoint.x + this.xOffset, this.object.midpoint.y + this.zOffset, angle, this.object.raycaster.renderDistance);
      this._rays.push(ray);
    }
  }

  render() {
    const ctx = this.game.canvas.getContext('2d');
    ctx.fillRect(0, 0, this.object.raycaster.instanceWidth, this.object.raycaster.instanceHeight);
    this.renderSky(ctx, this.skyColor);
    this.renderGround(ctx, this.groundColor);
    this.renderView(ctx);
  }

  renderSky(ctx, color) {
    // eslint-disable-next-line no-param-reassign
    if (typeof color === 'undefined') color = new Color(99, 185, 255, 1);

    ctx.beginPath();
    ctx.fillStyle = color.toCSSString();
    ctx.fillRect(
      0,
      0,
      this.object.raycaster.instanceWidth,
      this.object.raycaster.instanceHeight * (this.object.verticalAngle/(Math.PI*2))
    );
  }

  renderGround(ctx, color) {
    // eslint-disable-next-line no-param-reassign
    if (typeof color === 'undefined') color = new Color(226, 226, 226, 1);

    ctx.beginPath();
    ctx.fillStyle = color.toCSSString();
    ctx.fillRect(
      0,
      this.object.raycaster.instanceHeight * (this.object.verticalAngle / (Math.PI*2)),
      this.object.raycaster.instanceWidth,
      this.object.raycaster.instanceHeight - (this.object.raycaster.instanceHeight * (this.object.verticalAngle / (Math.PI*2)))
    );
  }

  renderView(ctx) {
    this.castRays();
    this.calculateRayCollision();
    const drawTimes = [];
    const drawColumn = (column, color) => {
      ctx.beginPath();
      ctx.fillStyle = color.toCSSString();
      ctx.fillRect(column.x, column.y, column.width, column.height);
    };
    let prevPixelColumn = null;
    for (let i=0;i<this._rays.length;i++) {
      let ray = this._rays[i];
      // eslint-disable-next-line max-len
      const collisions = ray.collisions;
      collisions.forEach((collision) => {
        const distance = Math.sqrt(((collision.p.x - ray.origin.x) ** 2) + ((collision.p.y - ray.origin.y) ** 2));
        collision.distance = distance;
      });
      timsort.sort(collisions, (c1, c2) => c2.distance - c1.distance);
      if (!this.object.raycaster.variableHeight) {
        for (let m = 0; m < collisions.length; m++) {
          const col = collisions[m];
          col.renderThisFrame = true;
          if (m > 0) {
            const prevCol = collisions[m - 1];
            if (col.obj.color.a === 1) {
              prevCol.renderThisFrame = false;
            }
          }
        }
      }
      for (let n = 0; n < collisions.length; n++) {
        const col = collisions[n];
        if (!this.object.raycaster.variableHeight && col.renderThisFrame === false) {
          continue;
        }
        const collision = col.p;
        const collisionObject = col.obj;

        let texture = col.obj.texture;

        const rayLen = this._rays.length;
        const width = Math.ceil(this.object.raycaster.instanceWidth / rayLen);
        // console.log(width);
        const dx = collision.x - ray.origin.x;
        const dy = collision.y - ray.origin.y;
        // const distance = Math.sqrt((dx * dx) + (dy * dy));
        const distance = col.distance;
        // const ang = (Math.atan2(dy, dx) - (this.object.angle.toDeg()-90).toRad());
        const ang = (ray.angle - (this.object.angle-(Math.PI/2)));
        const projHeight = distance * Math.cos(ang);
        const actualHeight = this.object.raycaster.variableHeight ? collisionObject.varHeight : 1;


        const color = collisionObject.color;

        const x = Math.floor((i) * (this.object.raycaster.instanceWidth / rayLen));

        const projectedHeight = (this.object.raycaster.instanceHeight / (projHeight / this.fov));
        // console.log(this.object.raycaster.instanceHeight);
        // const projectedHeight = this.object.raycaster.instanceHeight/(projHeight/this.fov);
        const height = 2 * actualHeight * (projectedHeight / 2);
        // Change (this.object.raycaster.instanceHeight * 2) to (this.object.raycaster.instanceHeight * verticalAngleInDegrees/360) to look up and down. Maxes at height * 360 and height * 0;
      // Change this.object.varHeight to higher or lower to move on the z-axis.
        // Once at a value > 1, variable height must be enabled for it to render properly.
        const y = (this.object.raycaster.instanceHeight * (this.object.verticalAngle/(Math.PI*2))) - ((projectedHeight) * (this.object.yPos3D + this.yOffset));
        const column = new Rect(
          x, // x
          y, // y
          width, // width
          height, // height
        );

        if (texture !== null) {
          let image = texture.getCurrentFrame();
          if (image === undefined) {
            drawColumn(column, color);
            continue;
          } else {
            let distanceFromStart = Math.sqrt(((collision.x - collisionObject.start.x) ** 2) + ((collision.y - collisionObject.start.y) ** 2));
            let pixelColumn = scale(distanceFromStart, 0, collisionObject.length, 0, image.width);
            const oldPrevPixelColumn = prevPixelColumn; 
            prevPixelColumn = pixelColumn;
            if (pixelColumn < oldPrevPixelColumn) {
              if (this.object.backTexture !== null) {
                texture = this.object.backTexture;
                image = texture.getCurrentFrame();
                if (image === undefined) {
                  drawColumn(column, color);
                  continue;
                }
                pixelColumn = scale(distanceFromStart, 0, collisionObject.length, 0, image.width);
              }
              else {
                drawColumn(column, color);
                prevPixelColumn = pixelColumn;
                continue;
              }
            }
            const imageHeight = image.height;

            ctx.drawImage(
              image, // image
              pixelColumn, // imageX
              0, // imageY
              1, // imageWidth
              imageHeight, // imageHeight
              column.x, // canvasX
              column.y, // canvasY
              column.width, // imageScaleWidth
              column.height, // imageScaleHeight
            );
          }
        } else {
          drawColumn(column, color);
          prevPixelColumn = null;
        }
      }
    }
  }
}

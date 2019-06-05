import Color from './color';
import { intersect, scale } from './util';
/**
 * Ray class used for performing logic
 *
 */
class Ray extends Phaser.Line {
  constructor(x, y, angle, length) {
    super();
    this.fromAngle(x, y, angle, length);
    this.origin = new Phaser.Point(this.start.x, this.start.y);
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
  }

  calculateRayCollision() {
    let obj = this.object;
    this._rays.forEach((ray) => {
      this.object.raycaster.objects.forEach((colObj) => {
        if (colObj === obj || !colObj.visible) return;
        const intersection = intersect(ray.start.x, ray.start.y, ray.end.x, ray.end.y, colObj.start.x, colObj.start.y, colObj.end.x, colObj.end.y);
        if (intersection) ray.collisions.push({ p: intersection, obj: colObj });
      });
    });
  }

  castRays() {
    this._rays.length = 0; // empty the ray array

    // distToProjSurface = total_rays/2 / tan(half_of_fov_in_rad)
    const distToProjSurface = (this.object.raycaster.totalRays / 2) / Math.tan((this.fov / 2).toRad());
    for (let x = 0; x < this.object.raycaster.totalRays; x++) {
      let angle = Math.atan((x - (this.object.raycaster.totalRays / 2)) / distToProjSurface);
      angle += (this.object.angle.toDeg()+90).toRad();
      const ray = new Ray(this.object.midPoint().x, this.object.midPoint().y, angle, this.object.raycaster.renderDistance);
      this._rays.push(ray);
    }
  }

  render() {
    this.renderGround();
    this.renderSky();
    this.renderView();
  }

  renderSky(color) {
    // eslint-disable-next-line no-param-reassign
    if (typeof color === 'undefined') color = new Color(99, 185, 255, 1);

    const ctx = this.game.canvas.getContext('2d');
    ctx.beginPath();
    ctx.fillStyle = color.toCSSString();
    ctx.fillRect(0, 0, this.game.world.width, this.game.world.height / 2);
  }

  renderGround(color) {
    // eslint-disable-next-line no-param-reassign
    if (typeof color === 'undefined') color = new Color(226, 226, 226, 1);

    const ctx = this.game.canvas.getContext('2d');
    ctx.beginPath();
    ctx.fillStyle = color.toCSSString();
    ctx.fillRect(0, this.game.world.height / 2, this.game.world.width, this.game.world.height / 2);
  }

  renderView() {
    this.castRays();
    this.calculateRayCollision();
    const ctx = this.game.canvas.getContext('2d');
    const drawTimes = [];
    const drawColumn = (column, color) => {
      ctx.beginPath();
      ctx.fillStyle = color.toCSSString();
      ctx.fillRect(column.x, column.y, column.width, column.height);
    };
    this._rays.forEach((ray, i) => {
      // eslint-disable-next-line max-len
      const collisions = ray.collisions;
      collisions.forEach((collision) => {
        const distance = Math.sqrt(((collision.p.x - ray.origin.x) ** 2) + ((collision.p.y - ray.origin.y) ** 2));
        collision.distance = distance;
      });
      collisions.sort((c1, c2) => c2.distance - c1.distance);
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

        const texture = col.obj.texture;


        const rayLen = this._rays.length;
        const width = (this.game.world.width / rayLen);
        // console.log(width);
        const dx = collision.x - ray.origin.x;
        const dy = collision.y - ray.origin.y;
        // const distance = Math.sqrt((dx * dx) + (dy * dy));
        const distance = col.distance;
        const projHeight = distance * Math.cos((Math.atan2(dy, dx) - (this.object.angle.toDeg()-90).toRad()));
        const actualHeight = this.object.raycaster.variableHeight ? collisionObject.varHeight : 1;


        const color = collisionObject.color;

        const x = Math.floor((i) * (this.game.world.width / rayLen));

        const projectedHeight = (this.game.world.height / (projHeight / this.fov));
        const height = 2 * actualHeight * (projectedHeight / 2);
        // Change (this.game.world.height * 2) to (this.game.world.height * verticalAngleInDegrees/360) to look up and down. Maxes at height * 360 and height * 0;
        //    NOTE: Skybox/ground won't work with this method and I don't know a fix. Probably some fairly basic math.
      // Change this.object.varHeight to higher or lower to move on the z-axis.
        // Once at a value > 1, variable height must be enabled for it to render properly.
        const y = (this.game.world.height * (this.object.verticalAngle/(Math.PI*2))) - ((projectedHeight) * (this.object.z));
        const column = new Phaser.Rectangle(
          x, // x
          y, // y
          width, // width
          height, // height
        );

        if (texture !== null) {
          const textureData = texture;

          const image = textureData.getCurrentFrame();
          if (image === undefined) {
            drawColumn(column, color);
          } else {
            const distanceFromStart = Math.sqrt(((collision.x - collisionObject.start.x) ** 2) + ((collision.y - collisionObject.start.y) ** 2));
            const pixelColumn = scale(distanceFromStart, 0, collisionObject.length, 0, image.width);
            // console.log(image.width,image.height);
            const imageHeight = image.height;

            const t1 = Date.now();

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
            drawTimes.push(Date.now() - t1);
          }
        } else {
          drawColumn(column, color);
        }
      }
    });
  }
}

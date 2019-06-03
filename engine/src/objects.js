import { BoundsError } from './errors';
import { intersect } from './util';
import { Color, requestPointerLock } from './util';

class Ray extends Phaser.Line {
  constructor(x, y, angle, length) {
    super();
    this.fromAngle(x, y, angle, length);
    this.origin = new Phaser.Point(this.start.x, this.start.y);
    this.collisions = [];
  }
}

export class PlanarObject extends Phaser.Line {
  /*
  Native renderable object (the equivalent of a line in the Euclidean plane)

  @param {number} x - Initial starting x-axis coordinate
  @param {number} y - Initial starting y-axis coordinate
  @param {number} x2 - Initial ending x-axis coordinate
  @param {number} y2 - Initial ending y-axis coordinate
  @param {Object} [options={}] - Additional PlanarObject options
  @param {Boolean} [options.collision=true] - Boolean regarding whether objects of type Entity will have movement blocked by the PlanarObject
  @param {number} [options.height=1] - Initial height of object (relative to the projected height of the object)
  @param {String} [options.texture=null] - Image key referencing the cached texture (must be preloaded into the cache)
  @param {Color} [options.color=new Color(255,255,255,1)] - Color object of the object (given a texture is not present)
    // NOTE: It is not recommended to use colors of very high intensity, such as rgb(255,255,0), nor those of very low intensity, such as rgb(5,5,0)
    // NOTE: but rather shades such as rgb(230,230,0).
    // NOTE: This is because with colors of very high or low intensity, opacity will often not be perceivable as it either brightens or darkens the color.

  @param {Boolean} [options.render=true] - Boolean regarding whether or not the object will be rendered
  */
  constructor(raycaster, x, y, x2, y2, options = {}) {
    super(x, y, x2, y2);
    this.raycaster = raycaster;

    this.preUpdateFrame = null;
    this.updateFrame = null;
    this.renderFrame = null;

    this.options = {
      collision: true,
      height: 1,
      texture: null,
      color: new Color(255, 255, 255, 1),
      render: true,
    };
    Object.keys(options).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(this.options, key)) {
        this.options[key] = options[key];
      }
    });
    // if (typeof this.options.color === "string") this.options.color = new Color(this.options.color); //TODO
    if (this.options.texture instanceof String || typeof this.options.texture === 'string') {
      this.options.texture = raycaster.create.texture(raycaster.getTextureData(this.options.texture));
    }

    const error = new BoundsError(`PlanarObject ${this.toString()} instantiated outside of world bounds`);
    if (
      (raycaster.worldWidth !== null && Math.min(this.start.x, this.end.x) < 0)
      || (raycaster.worldWidth !== null && Math.max(this.start.x, this.end.x) > raycaster.worldWidth)
      || (raycaster.worldHeight !== null && Math.min(this.start.y, this.end.y) < 0)
      || (raycaster.worldHeight !== null && Math.max(this.start.y, this.end.y) > raycaster.worldHeight)
    ) {
      throw error;
    }
  }

  /**
   * Method for moving the PlanarObject
   *
   * @param {number} speed - Object containing the speed in px/s of the PlanarObject
   * @param {number} horiz - Number of value either 1 or -1 to indicate strafing.
   */
  move(speed, horiz) {
    let ang = this.angle;
    ang = Math.PI*2 - ang;
    if (horiz === 1) {
      ang += Math.PI/2;
    }
    else if (horiz === -1) {
      ang -= Math.PI * (3/2);
    }

    let x = speed * (Math.sin(ang)) * (this.game.time.elapsed/1000);
    let y = speed * (Math.cos(ang)) * (this.game.time.elapsed/1000);
    this.setTo(this.start.x+x,this.start.y+y,this.end.x+x,this.end.y+y);
  }

  handleCollision() {
    // ifndef
    if (!this.prevPos) {
      this.prevPos = {
        x: this.midPoint().x,
        y: this.midPoint().y
      };
    }
    let mid = this.midPoint();
    const slope = [mid.y - this.prevPos.y, mid.x - this.prevPos.x];
    let moveAngle = Math.atan2(slope[0],slope[1]).toDeg();
    if (moveAngle < 0) moveAngle = 360 + moveAngle;
    // console.log(moveAngle);
    // console.log(this.sprite.body.velocity.x);

    if (slope[0] !== 0 || slope[1] !== 0) {
      for (let i=0;i<this.raycaster.objects.length;i++) {
        let obj = this.raycaster.objects[i];
        if (obj === this || !obj.options.collision) continue;
        let intersection = intersect(this.prevPos.x,this.prevPos.y,this.prevPos.x,mid.y,obj.start.x,obj.start.y,obj.end.x,obj.end.y);
        let intersected = false;
        if (intersection) {
          intersected = true;
          this.setTo(this.start.x,this.start.y - (mid.y-this.prevPos.y),this.end.x,this.end.y - (mid.y-this.prevPos.y));
          // this.sprite.y = this.prevPos.y;

        }
        intersection = intersect(this.prevPos.x,this.prevPos.y,mid.x,this.prevPos.y,obj.start.x,obj.start.y,obj.end.x,obj.end.y);
        if (intersection) {
          intersected = true;
          this.setTo(this.start.x - (mid.x-this.prevPos.x),this.start.y,this.end.x - (mid.x-this.prevPos.x),this.end.y);
          // this.sprite.x = this.prevPos.x;
        }
        // if (intersected) break;
      }
    }

    this.prevPos = {
      x: this.midPoint().x,
      y: this.midPoint().y
    };
  }

  /*
  handleCollision() {
    // ifndef
    if (!this.prevPos) {
      this.prevPos = {
        start:{x:this.start.x,y:this.start.y},
        end:{x:this.end.x,y:this.end.y}
      };
    }
    console.time('Collision');
    Object.keys(this.prevPos).forEach((type) => {
      let prevPos = this.prevPos[type];
      // Generally bad. But fixed so it won't have any unexpected behavior.
      let mid = this[type];
      const slope = [mid.y - prevPos.y, mid.x - prevPos.x];
      let moveAngle = Math.atan2(slope[0],slope[1]).toDeg();
      if (moveAngle < 0) moveAngle = 360 + moveAngle;
      // console.log(moveAngle);
      // console.log(this.sprite.body.velocity.x);

      if (slope[0] !== 0 || slope[1] !== 0) {
        for (let i=0;i<this.raycaster.objects.length;i++) {
          let obj = this.raycaster.objects[i];
          if (obj === this || !obj.options.collision) continue;
          let intersection = intersect(prevPos.x,prevPos.y,prevPos.x,mid.y,obj.start.x,obj.start.y,obj.end.x,obj.end.y);
          let intersected = false;
          if (intersection) {
            intersected = true;
            this.setTo(this.start.x,this.start.y - (mid.y-prevPos.y),this.end.x,this.end.y - (mid.y-prevPos.y));
            // this.sprite.y = prevPos.y;

          }
          intersection = intersect(prevPos.x,prevPos.y,mid.x,prevPos.y,obj.start.x,obj.start.y,obj.end.x,obj.end.y);
          if (intersection) {
            intersected = true;
            this.setTo(this.start.x - (mid.x-prevPos.x),this.start.y,this.end.x - (mid.x-prevPos.x),this.end.y);
            // this.sprite.x = prevPos.x;
          }
          // if (intersected) break;
        }
      }
    });
    console.timeEnd('Collision');

    this.prevPos = {
      start:{x:this.start.x,y:this.start.y},
      end:{x:this.end.x,y:this.end.y}
    };
  }
  */

  // These methods may be overloaded as long as super method is called or their respective callbacks may be passed

  preUpdate() {
    //Called on PlanarObject every update loop, but before the Raycaster imposes any update logic
    if (typeof this.preUpdateFrame === 'function') this.preUpdateFrame();
  }

  update() {
    // Called on PlanarObject every update loop, but after the Raycaster imposes any update logic
    if (this.options.texture !== null) this.options.texture.update();
    if (typeof this.updateFrame === 'function') this.updateFrame();
  }

  render() {
    // Calls this.renderFrame every every render loop - renderFrame should be overloaded to add any render logic to the PlanarObject
    if (typeof this.renderFrame === 'function') this.renderFrame();
  }

  toString() {
    return `[${this.constructor.name}(${this.start.x},${this.start.y},${this.end.x},${this.end.y})]`;
  }
}

export class Wall extends PlanarObject {
  constructor(raycaster, x, y, x2, y2, options = {}) {
    super(raycaster, x, y, x2, y2, options);
  }
}

/**
 * Helper function that constructs a square of walls
 *
 * @returns Wall[] - Constructed walls in the order "top, right, bottom, left"
 */
export function wallBlock(raycaster, x, y, x2, y2, WallType, options = {}) {
  return [
    // eslint-disable-next-line new-cap
    new WallType(raycaster, x, y, x2, y, options),
    new WallType(raycaster, x, y, x, y2, options),
    new WallType(raycaster, x, y2, x2, y2, options),
    new WallType(raycaster, x2, y, x2, y2, options),
  ];
}

function scale(num, inMin, inMax, outMin, outMax) {
  return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

export class Entity extends PlanarObject {
  /*
  Native renderable object possessing a camera

  @param {number} x - Initial x-axis coordinate
  @param {number} y - Initial y-axis coordinate
  @param {number} width - Width of the Entity
  @param {number} height - Height of the Entity
  @param {Boolean} hasCamera - When false, the Entity will cast out 0 rays
  @param {Object} data - Data regarding the behavior of the Entity
  @param {number} data.fov - Fov in degrees of Entity (<=0 if the Entity does not cast rays)
  @param {number} data.speed - Speed of Entity in pixels per (second squared)
  @param {number} data.strafeSpeed - Speed of Entity strafe in pixels per (second squared)
  @param {number} data.lookSpeed - Speed at which Entity turns in degrees/radians per second squared (varies depending on version of Phaser)
  @param {Phaser.Game} game - Instance of game that the Entity will store for use when rendering and performing other operations
  @param {Object} [options={}] - Additional PLanarObject options
  @param {String} options.color - Color object of the Entity (given a texture is not present)
  @param {Boolean} options.render - Boolean regarding whether or not the Entity will be rendered
  @param {Boolean} [options.useMouse=false] - Boolean regarding whether or not the object will hook into mouse on instantiation
  @param {number} [angle=0] - Initial angle that the Entity faces
  */
  constructor(raycaster, x, y, width, hasCamera, data, game, options = { useMouse: false }, angle = 0) {
    super(raycaster, x, y, x + width, y, options);
    // this.rotate(angle,true);
    this.game = game;
    this.hasCamera = hasCamera;
    this.data = data;
    this.fov = data.fov;
    this.lookSpeed = data.lookSpeed;


    this.drawFov = true;
    this.drawCollision = true;

    this.rays = [];

    this.setupMouse(this.game);
    if (options.useMouse) {
      this.startMouse(this.game);
    } else {
      this.stopMouse(this.game);
    }

    delete options.useMouse;
  }

  castRays() {
    if (!this.hasCamera) return;
    this.rays.length = 0; // empty ray array

    // distToProjSurface = total_rays/2 / tan(half_of_fov_in_rad)
    const distToProjSurface = (this.raycaster.totalRays / 2) / Math.tan((this.fov / 2).toRad());
    for (let x = 0; x < this.raycaster.totalRays; x++) {
      let angle = Math.atan((x - (this.raycaster.totalRays / 2)) / distToProjSurface);
      angle += (this.angle.toDeg()+90).toRad();
      const ray = new Ray(this.midPoint().x, this.midPoint().y, angle, this.raycaster.renderDistance);
      this.rays.push(ray);
    }
  }

  setupMouse() {
    this.game.canvas.addEventListener('mousedown', () => { requestPointerLock(this.game); }, this);
    this.game.input.addMoveCallback((pointer, x, y, click) => { this.mouseMove(this.game, pointer, x, y, click); }, this);
  }

  startMouse() {
    this.game.input.mouse.start();
  }

  stopMouse() {
    this.game.input.mouse.stop();
  }


  // eslint-disable-next-line
  mouseMove(pointer, x, y, click) {
    // Should be overloaded to add functionality to mouse
    // Should only be used in non split screen games
  }

  turn(horiz, mult) {
    const ang = horiz * this.lookSpeed * mult * (this.game.time.elapsed/1000);

    this.rotate(ang.toRad());
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
    const ctx = this.game.canvas.getContext('2d');
    const drawTimes = [];
    const drawColumn = (column, color) => {
      ctx.beginPath();
      ctx.fillStyle = color.toCSSString();
      ctx.fillRect(column.x, column.y, column.width, column.height);
    };
    this.rays.forEach((ray, i) => {
      // eslint-disable-next-line max-len
      const collisions = ray.collisions;
      collisions.forEach((collision) => {
        const distance = Math.sqrt(((collision.p.x - ray.origin.x) ** 2) + ((collision.p.y - ray.origin.y) ** 2));
        collision.distance = distance;
      });
      collisions.sort((c1, c2) => c2.distance - c1.distance);
      if (!this.raycaster.variableHeight) {
        for (let m = 0; m < collisions.length; m++) {
          const col = collisions[m];
          col.renderThisFrame = true;
          if (m > 0) {
            const prevCol = collisions[m - 1];
            if (col.obj.options.color.a === 1) {
              prevCol.renderThisFrame = false;
            }
          }
        }
      }
      for (let n = 0; n < collisions.length; n++) {
        const col = collisions[n];
        if (!this.raycaster.variableHeight && col.renderThisFrame === false) {
          continue;
        }
        const collision = col.p;
        const collisionObject = col.obj;

        const { texture } = col.obj.options;


        const rayLen = this.rays.length;
        const width = (this.game.world.width / rayLen);
        // console.log(width);
        const dx = collision.x - ray.origin.x;
        const dy = collision.y - ray.origin.y;
        // const distance = Math.sqrt((dx * dx) + (dy * dy));
        const distance = col.distance;
        const projHeight = distance * Math.cos((Math.atan2(dy, dx) - (this.angle.toDeg()-90).toRad()));
        const actualHeight = collisionObject.options.height;


        const { color } = collisionObject.options;

        const x = Math.floor((i) * (this.game.world.width / rayLen));

        const projectedHeight = (this.game.world.height / (projHeight / this.fov));
        const height = 2 * actualHeight * (projectedHeight / 2);
        const y = (this.game.world.height / 2) - ((height) - (projectedHeight / 2));

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

Entity.MOUSE_TURN_MULT = 1 / 4;
Entity.KEYBOARD_TURN_MULT = 1.25;

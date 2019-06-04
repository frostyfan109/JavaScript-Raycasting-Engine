import Camera from './camera';
import { BoundsError } from './errors';
import Color from './color';
import { intersect, requestPointerLock } from './util';

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

    this.verticalAngle = Math.PI;

    this.camera = null;

    this.options = {
      collision: true,
      varHeight: 1,
      texture: null,
      color: new Color(255, 255, 255, 1),
      visible: true,
    };

    Object.keys(options).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(this.options, key)) {
        this.options[key] = options[key];
      }
    });
    Object.keys(this.options).forEach((key) => {
      this[key] = this.options[key];
    });
    delete this.options;

    // if (typeof this.options.color === "string") this.options.color = new Color(this.options.color); //TODO
    if (this.texture instanceof String || typeof this.texture === 'string') {
      this.texture = raycaster.create.texture(raycaster.getTextureData(this.texture));
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
   * Instantiate a camera on this object
   *
   */
  addCamera(game, fov, turnSpeed) {
    this.camera = new Camera(this, game, fov, turnSpeed);
  }

  /**
   * Sets up the mouse. Must be called before mouse will work.
   */
  setupMouse(game) {
    game.canvas.addEventListener('mousedown', () => { requestPointerLock(game); }, this);
    game.input.addMoveCallback((pointer, x, y, click) => { this.mouseMove(game, pointer, x, y, click); }, this);
  }

  /**
   * When called the mouse will begin to fire callbacks on mouse move
   *
   */
  enableMouse(game) {
    game.input.mouse.start();
  }

  /**
   * When called the mouse will cease to fire callbacks on mouse move
   *
   */
  disableMouse(game) {
    game.input.mouse.stop();
  }

  // eslint-disable-next-line
  mouseMove(pointer, x, y, click) {
    // Should be overloaded to add functionality to mouse
    // Should only be used in non split screen games
  }

  /**
   * Turn the PlanarObject.
   *
   * @param {number} angle  - Sets the angle relative to the current angle in radians.
   */
  turn(angle) {
    this.rotate(angle);
  }

  /**
   * Sets the angle (absolute).
   *
   * @param {number} angle - The angle in radians.
   */
   setAngle(angle) {
     this.rotate(angle-this.angle);
   }

  /**
   * Method for moving the PlanarObject
   *
   * @param {number} speed - Object containing the speed in px/s of the PlanarObject
   * @param {number} horiz - Number of value either 1 or -1 to indicate strafing.
   */
  move(speed, horiz, elapsed) {
    let ang = this.angle;
    ang = Math.PI*2 - ang;
    if (horiz === 1) {
      ang += Math.PI/2;
    }
    else if (horiz === -1) {
      ang -= Math.PI * (3/2);
    }

    let x = speed * (Math.sin(ang)) * (elapsed);
    let y = speed * (Math.cos(ang)) * (elapsed);
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
        if (obj === this || !obj.collision) continue;
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
    this.prevPos = {
      start:{x:this.start.x,y:this.start.y},
      end:{x:this.end.x,y:this.end.y}
    };
  }
  */


  // These methods may be overloaded as long as super method is called

  preUpdate() {
    //Called on PlanarObject every update loop, but before the Raycaster imposes any update logic
  }

  update() {
    // Called on PlanarObject every update loop, but after the Raycaster imposes any update logic
    if (this.texture !== null) this.texture.update();
  }

  render() {
    // Called on PLanarObject every every render loop, but after all update logic. Only called half as frequently as update methods.
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

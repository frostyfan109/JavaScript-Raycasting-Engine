import Camera from './camera';
import { BoundsError } from './errors';
import Color from './color';
import { Texture } from './texture';
import { intersect } from './util';
import { Line, Rect } from './geom';
import Mouse from './mouse';

export class PlanarObject extends Line {
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
  @param {String} [options.backTexture=null] - Same as options.texture, but only shown when facing the backside of the object
  @param {Color} [options.color=new Color(255,255,255,1)] - Color object of the object (given a texture is not present)
    // NOTE: It is not recommended to use colors of very high intensity, such as rgb(255,255,0), nor those of very low intensity, such as rgb(5,5,0)
    // NOTE: but rather shades such as rgb(230,230,0).
    // NOTE: This is because with colors of very high or low intensity, opacity will often not be perceivable as it either brightens or darkens the color.

  @param {Boolean} [options.render=true] - Boolean regarding whether or not the object will be rendered
  */
  constructor(raycaster, x, y, x2, y2, options = {}) {
    super(x, y, x2, y2);
    this.raycaster = raycaster;

    this.camera = null;

    this._texture = null;
    this._backTexture = null;

    this.options = {
      collision: true,
      varHeight: 1,
      texture: null,
      backTexture: null,
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

    // Experimental
    this.verticalAngle = Math.PI;

    /* Mass is used in the calculation of acceleration. It is not particularly relevant, but may be changed if desired. */
    this.mass = 1;

    /* Velocity is the rate of change of an object's position. */
    this.velocity = {
      x: 0,
      z: 0,
      y: 0
    };
    /* Terminal velocity is the maximum velocity an object can have. In the real world, it is caused due to resistance applied by a medium such as air. */
    this.terminalVelocity = {
      x: null,
      z: null,
      y: null
    };
    /* Friction is the will slow an object's velocity. It is a constant force applied to the object every physics loop. */
    this.friction = {
      x: 0,
      z: 0,
      y: 0
    };

    // Y-Axis position in the 3d plane.
    this.yPos3D = 0;

    this.mouse = null;

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

  get texture() {
    return this._texture;
  }

  set texture(value) {
    if (value instanceof Texture) {
      this._texture = value;
    } else if (value instanceof String || typeof value === "string") {
      try {
        this._texture = this.raycaster.create.texture(this.raycaster.getTextureData(value));
      }
      catch (e) {
        // Error is thrown if the texture does not exist in the cache. However, this should not halt the program.
        console.warn(e);
        this._texture = null;
      }
    } else if (value === null || value === undefined) {
      this._texture = null;
    } else {
      throw new Error(`Unknown texture value "${value}" when setting texture property`);
    }
  }

  get backTexture() {
    return this._backTexture;
  }

  set backTexture(value) {
    if (value instanceof Texture) {
      this._backTexture = value;
    } else if (value instanceof String || typeof value === "string") {
      try {
        this._backTexture = this.raycaster.create.texture(this.raycaster.getTextureData(value));
      }
      catch (e) {
        // Error is thrown if the texture does not exist in the cache. However, this should not halt the program.
        console.warn(e);
        this._backTexture = null;
      }
    } else if (value === null || value === undefined) {
      this._backTexture = null;
    } else {
      throw new Error(`Unknown texture value "${value}" when setting backTexture property`);
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
   * Creates the mouse object for the PlanarObject.
   *
   * @param {Object} game - Game instance to bind the mouse events to.
   */
  setupMouse(game) {
    this.mouse = new Mouse(game);
  }

  /**
   * Turn the PlanarObject horizontally.
   *
   * @param {number} angle  - Sets the angle relative to the current angle in radians.
   */
  turnHorizontally(angle) {
    this.rotate(angle);
  }

  /**
   * Turn the PlanarObject vertically.
   *
   * @param {number} angle  - Sets the angle relative to the current angle in radians.
   */
  turnVertically(angle) {
    this.verticalAngle += angle;
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
   * Method for moving the PlanarObject within a 2d context (x-axis and z-axis).
   *
   * @param {number} force - Amount of force applied to the PlanarObject.
   * @param {number} horiz - Number of value either 1 or -1 to indicate strafing.
   * @param {number} elapsed - Elapsed time since last frame in milliseconds.
   */
  move(force, horiz, elapsed) {
    let ang = this.angle;
    ang = Math.PI*2 - ang;
    if (horiz === 1) {
      ang += Math.PI/2;
    }
    else if (horiz === -1) {
      ang -= Math.PI * (3/2);
    }

    let acceleration = force / this.mass;

    // Angular velocity
    this.velocity.x += acceleration * Math.sin(ang) * (elapsed/1000);
    this.velocity.z += acceleration * Math.cos(ang) * (elapsed/1000);

    // let x = speed * (Math.sin(ang));
    // let y = speed * (Math.cos(ang));
    // this.setTo(this.start.x+x,this.start.y+y,this.end.x+x,this.end.y+y);
  }

  /**
   * Method for moving the PlanarObject along the y-axis within the 3d plane.
   *    NOTE: The y-axis is relative to the unit height of all PlanarObjects.
   *    NOTE: The camera is positioned at PlanarObject.yPos3D, which on default is the top of the PlanarObject.
   *
   * @param {number} force - Amount of force applied to the PlanarObject.
   * @param {number} elapsed - Elapsed time since last frame in milliseconds.
   */
  moveY(force, elapsed) {
    let acceleration = force / this.mass;
    this.velocity.y += acceleration * (elapsed/1000);
  }

  handleCollision() {
    // ifndef
    if (!this.prevPos) {
      this.prevPos = {
        x: this.midpoint.x,
        y: this.midpoint.y
      };
    }
    let mid = this.midpoint;
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
      x: this.midpoint.x,
      y: this.midpoint.y
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

  /**
   * Shorthand for setting the x-axis coordinate
   *
   */
  setX(x) {
    this.setTo(x,this.start.y,x+(this.end.x-this.start.x),this.end.y);
  }

  /**
   * Shorthand for setting the z-axis coordinate
   *
   */
  setZ(z) {
    this.setTo(this.start.x,z,this.end.x,z+(this.end.y-this.start.y));
  }


  // These methods may be overloaded as long as super method is called

  /**
   * Called on PlanarObject every update loop, but before the Raycaster imposes any update logic.
   *
   * @param {number} elapsed - Time delta in milliseconds spanning the beginning of the last frame's update loop to the beginning of the current frame's update loop
   */
  preUpdate(elapsed) {
    //Called on PlanarObject every update loop, but before the Raycaster imposes any update logic
  }

  /**
   * Called on PlanarObject every update loop, but after the Raycaster imposes any update logic.
   *
   * @param {number} elapsed - Time delta in milliseconds spanning the beginning of the last frame's update loop to the beginning of the current frame's update loop
   */
  update(elapsed) {
    if (this.texture !== null) this.texture.update();

    /* Update position */

    // Apply friction
    let acc = {
      x: this.friction.x / this.mass,
      z: this.friction.z / this.mass,
      y: this.friction.y / this.mass
    };
    for (let axis in this.velocity) {
      let sign = Math.sign(this.velocity[axis]);
      // Polish
      if (axis !== "y") {
        this.velocity[axis] -= sign * acc[axis] * (elapsed/1000);
        if (Math.sign(this.velocity[axis]) !== sign) {
          // If went past 0, set to 0.
          this.velocity[axis] = 0;
        }
      }
      else {
        this.velocity[axis] -= acc[axis] * (elapsed/1000);
      }

      // Clamp the velocity to ensure that it does not exceed terminal velocity
      if (this.terminalVelocity[axis] !== null) {
        this.velocity[axis] = this.velocity[axis].clamp(-this.terminalVelocity[axis], this.terminalVelocity[axis]);
      }
    }

    if (this.velocity.x !== 0 || this.velocity.z !== 0) {
      let x = this.velocity.x * (elapsed/1000);
      let z = this.velocity.z * (elapsed/1000);
      this.setX(this.start.x+x);
      this.setZ(this.start.y+z);
      // this.setTo(this.start.x+x,this.start.y+z,this.end.x+x,this.end.y+z);

      this.handleCollision();
    }

    if (this.velocity.y !== 0) {
      let y = this.velocity.y * (elapsed/1000);
      this.yPos3D += y;
    }

    // const gravitationalForce = 200;
    // let yForce = gravitationalForce + this.yForce;
    // if (this.yForce !== undefined) {
    //   this.yForce *= .9;
    //   this.z -= (yForce) * (elapsed/1000) * (elapsed/1000);
    //   this.z = Math.max(1/2, this.z);
    // }
  }

  /**
   * Called on PLanarObject every every render loop, but after all update logic. Only called half as frequently as update methods.
   *
   * @param {number} elapsed - Time delta in milliseconds spanning the beginning of the last frame's update loop to the beginning of the current frame's update loop.
   *    NOTE: Elapsed remains a constant throughout the frame. It will not differ between each frame-related function.
   */
  render(elapsed) {
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
 * @param {Boolean} surrounding - If true, walls will be constructed such that the primary texture is facing inward rather than outward.
 *
 * @returns {Wall[]} - Constructed walls in the order "top, right, bottom, left"
 */
export function wallBlock(raycaster, x, y, x2, y2, WallType, options = {}, surrounding = false) {
  if (surrounding) {
    return [
      // top
      new WallType(raycaster, x, y, x2, y, options),
      // left
      new WallType(raycaster, x, y2, x, y, options),
      // bottom
      new WallType(raycaster, x2, y2, x, y2, options),
      // right
      new WallType(raycaster, x2, y, x2, y2, options)
    ];
  } else {
    return [
      // top
      new WallType(raycaster, x2, y, x, y, options),
      // left
      new WallType(raycaster, x, y, x, y2, options),
      // bottom
      new WallType(raycaster, x, y2, x2, y2, options),
      // right
      new WallType(raycaster, x2, y2, x2, y, options)
    ];
  }
}

/**
 * Internal utility for facilitating the semantic creation of native objects. May also be easily extended if desired via the Raycaster::create instance.
 * In no way is one required to use it, as it is purely a utility.
 *
 */
export function ObjectFactory(raycaster) {
  return {
    planarObject(...args) {
      return new PlanarObject(raycaster, ...args);
    },

    wall(...args) {
      return new Wall(raycaster, ...args);
    },

    wallBlock(...args) {
      return wallBlock(raycaster, ...args);
    },

    entity(...args) {
      return new Wall(raycaster, ...args);
    },

    texture(...args) {
      return new Texture(...args);
    },

  };
};

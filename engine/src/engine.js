import { Texture, TextureData } from './texture';
import { PlanarObject, Wall, Entity, wallBlock } from './objects';
import Color from './color';

export default class Raycaster {
  /*
  Main class used to perform update logic and handle the game state

  @param {number} width - Width in pixels of game instances
  @param {number} height - Height in pixels of game instances
  @param {string | HTMlElement} parent - Parent element that game instances will be created within
  @param {number} [renderDistance=100000] - Max length in pixels of rays that Entities cast out
    Has infinitesimal effect on performance
  @param {number} [totalRays=null] - Total amount of rays that are cast out by an Entity
    Recommended to be left as null as it uses it will use the width of the game instances
    Can be reduced or increased to increase or reduce fps respectively
  @param {boolean} [debug=false] - Sets if the debugger is shown.
  @param {Object} [options={}] - Additional optional parameters to speed up initialization of object
  @param {number} [options.worldWidth=null] - If not null, the world will have defined width. Required along with options.worldHeight in order to use any map related utilities.
  @param {number} [options.worldHeight=null] - If not null, the world will have defined height. Required along with options.worldWidth in order to use any map related utilities.
  @param {Boolean} [options.variableHeight=false] - Sets if PlanarObjects not of type Entity may have variable height
    Must be set in order for variable height to render properly or else taller objects will not be rendered when behind shorter ones
    // NOTE: Variable height results in some loss of performance
  @param {Phaser.State | null} [options.assetLoadState=null] - Loads all assets synchronously before proceeding to the preload state. If null, loads assets asynchronously.
  */
  constructor(canvasWidth, canvasHeight, parent, renderDistance = 1e7, totalRays = null, debug = false, options = {}) {
    this.options = {
      worldWidth: null,
      worldHeight: null,
      variableHeight: false,
      assetLoadState: null,
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

    this.renderDistance = renderDistance;
    this.debugMode = debug;

    this.totalRays = typeof totalRays === 'undefined' || totalRays === null || totalRays === undefined ? canvasWidth : totalRays;
    if (this.totalRays > canvasWidth) throw new Error("Total rays must not exceed canvas width or it results in translucent walls");


    this.create = new Raycaster.ObjectFactory(this);

    this.renderFPS = debug;
    this.debugObjects = [];
    this.instanceWidth = canvasWidth;
    this.instanceHeight = canvasHeight;
    this.instanceParent = parent;
    this.gameInstances = [];
    this.objects = [];
    this.running = false;

    this._textures = [];
  }

  init() {
    this.debugInstance = new Phaser.Game(this.instanceWidth, this.instanceHeight, this.instanceParent, Phaser.CANVAS);
    if (!this.debugMode) {
      this.debugInstance.canvas.style.display = 'none';
    } else {
      this.debugInstance.time.advancedTiming = true;
    }
    this.debugCamera = new Phaser.Camera(this.debugInstance,0,0,this.instanceWidth,this.instanceHeight);
  }

  loadImage(key, path) {
    this.gameInstances.forEach((g) => {
      g.load.image(key, path);
    });
    return key;
  }

  getTextureData(key) {
    return this._textures[key];
  }

  loadTexture(key, path, options = {}, callback = null) {
    /*
    Loads a texture into the cache.

    @param {String} key - Key stored in cache to fetch TextureData
    @param {String} path - File path or URI that is loaded as a texture
    @param {Object} options - Array of additional arguments
    @param {Boolean} options.alpha - (ONLY SUPPORTS .GIFS WITH FRAMES OF DISPOSAL TYPE 1) If false, the alpha layer of the .gif will be removed
    @param {function(TextureData)} callback - Called when the texture finishes loading

    @returns {TextureData} - Cached reference to texture which can be used to instantiate a texture
      NOTE: When instantiating a texture, it is recommended to use Raycaster::create::texture(String key) as it is more concise, although there is no practical difference.
    */
    const xhr = new XMLHttpRequest();
    xhr.open('GET', path, true);
    xhr.responseType = 'blob';

    const texture = new TextureData(key, path);

    this._textures[key] = texture;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        texture.load(xhr.response, options).then(() => {
          if (typeof callback === 'function') {
            callback(texture);
          }
        });
      }
    };

    xhr.send();

    return texture;

    // return key;
  }

  createGame(g) {
    const { preload } = g;
    g.preload = (...args) => {
      // eslint-disable-next-line no-use-before-define
      instance.time.totalFrames = 0;
      preload(...args);
    };


    const loadState = this.assetLoadState;
    if (loadState !== null) {
      const loadStatePreload = loadState.preload;
      loadState.preload = (...args) => {
        preload();
        loadStatePreload(...args);
        const int = 10;
        const f = () => {
          if (Object.values(this._textures).every(t => t.loaded)) {
            // eslint-disable-next-line no-use-before-define
            instance.state.start('main');
          } else {
            setTimeout(f, int);
          }
        };
        setTimeout(f, int);
      };
      delete g.preload;
    }


    const { create } = g;
    g.create = (...args) => {
      if (this.worldWidth !== null && this.worldHeight !== null) {
        this.addGameObjects(
          this.create.wallBlock(0,0,this.worldWidth,this.worldHeight, Wall,{color:new Color(255,255,255,1)})
        );
      }
      create(...args);
    }


    const { render } = g;
    g.render = (...args) => {
      // eslint-disable-next-line no-use-before-define
      instance.time.totalFrames++;
      render(...args);
      this.renderDebug();
    };

    const state = this.assetLoadState !== null ? loadState : g;
    let instance = new Phaser.Game(this.instanceWidth, this.instanceHeight, Phaser.CANVAS, this.instanceParent, state);
    instance.state.add('main', g);
    this.gameInstances.push(instance);
    return instance;
  }

  start() {
    this.debugInstance.physics.startSystem(Phaser.Physics.ARCADE);

    // this.player = new Player(this.game,50,50);
    // this.addGameObject(this.player);
    // this.addGameObject(new Wall(this.game,200,200,400,400));
    this.running = true;
  }

  /**
   * Adds a game object (inherits PlanarObject) to the raycaster instance
   */
  addGameObject(obj) {
    this.objects.push(obj);
  }

  /**
   * Recursively adds all game objects inside of `objs` to the raycaster instance
   */
  addGameObjects(objs) {
    objs.forEach((obj) => {
      if (Array.isArray(obj)) {
        this.addGameObjects(obj);
      } else {
        this.addGameObject(obj);
      }
    });
  }

  removeGameObject(obj) {
    this.objects = this.objects.filter(o => o !== obj);
  }

  update() {
    if (!this.running) return;

    this.objects.forEach((obj) => {
      obj.preUpdate();
      obj.update();
    });
  }



  renderDebug() {
    this.objects.forEach((obj) => {
      obj.render();
      if (obj instanceof PlanarObject) {
        if (this.debugMode) {
          this.debugInstance.debug.geom(obj, obj.color.toCSSString());
          if (obj.camera !== null) {
            obj.rays.forEach((ray) => {
              if (obj.drawFov) {
                this.debugInstance.debug.geom(new Phaser.Line(ray.origin.x, ray.origin.y, ray.end.x, ray.end.y), '#ff0000');
              }
              if (obj.drawCollision) {
                ray.collisions.forEach((collision) => {
                  this.debugInstance.debug.geom(new Phaser.Line(ray.origin.x, ray.origin.y, collision.p.x, collision.p.y), '#00ff00');
                });
              }
            });
          }
        }
        if (this.renderFPS) {
          [...this.gameInstances, this.debugInstance].forEach((instance) => {
            if (instance.time.advancedTiming !== true) {
              instance.time.advancedTiming = true;
              return;
            }
            let ctx = instance.canvas.getContext('2d');
            if (ctx !== null) {
              ctx.font = "20px Arial";
              ctx.fillStyle = "#000000";
              ctx.fillText("FPS: "+instance.time.fps, 20, 35);

              ctx.font = "14px Arial";
              ctx.fillStyle = "#000000";
              this.debugObjects.forEach((obj, i) => {
                const objRepr = `${obj.constructor.name}(${Math.round(obj.x)}, ${Math.round(obj.y)})`;
                ctx.fillText(objRepr, 20, 70+(i*30));
              });
            }
          });
        }
      }
    });
  }
}

Raycaster.ObjectFactory = function ObjectFactory(raycaster) {
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

// eslint-disable-next-line no-extend-native
Number.prototype.toRad = function toRad() {
  return this * (Math.PI / 180);
};

// eslint-disable-next-line no-extend-native
Number.prototype.toDeg = function toDeg() {
  return this * (180 / Math.PI);
};

// eslint-disable-next-line no-extend-native
Number.prototype.clamp = function clamp(min, max) {
  return Math.min(Math.max(this, min), max);
};

import { Texture, TextureData } from './texture';
import { PlanarObject, Wall, Entity, wallBlock } from './objects';
import { CacheError } from './errors';
import Keyboard from './keyboard';
import Color from './color';

export default class Raycaster {
  /*
  Main class used to perform update logic and handle the game state

  @param {number} width - Width in pixels of game instances
  @param {number} height - Height in pixels of game instances
  @param {string | HTMlElement} parent - Parent element that game instances will be created within
  @param {Object | null} state - Takes a state object used to manage game instances.
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
  @param {Object | null} [options.assetLoadState=null] - Takes a state object. Loads all assets synchronously before proceeding to the preload state. If null, loads assets asynchronously.
  @param {Boolean} [options.automaticallyResize] - Maintains the sizes of game instances in proportion to the window's size.
  */
  constructor(canvasWidth, canvasHeight, parent, state=null, renderDistance = 1e7, totalRays = null, debug = false, options = {}) {
    this.options = {
      worldWidth: null,
      worldHeight: null,
      variableHeight: false,
      assetLoadState: null,
      automaticallyResize: false
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


    this.create = new Raycaster.ObjectFactory(this);

    this.renderFPS = debug;
    this.debugObjects = [];
    this.instanceWidth = canvasWidth;
    this.instanceHeight = canvasHeight;
    this.instanceParent = parent;
    this.gameInstances = [];
    this.objects = [];
    this.running = false;

    this.prevTime = performance.now();

    this._textures = [];

    this.keyboard = new Keyboard();

    this.mainGame = state;

    if (this.automaticallyResize) {
      this.aspectRatio = {
        x: this.instanceWidth / document.body.clientWidth,
        y: this.instanceHeight / document.body.clientHeight
      }
    }

    this.boundWalls = null; // On Raycaster::init, this is set to the boundary walls if the game has set width and height.

    window.addEventListener('resize', (e) => {
      if (this.automaticallyResize) {
        this.gameInstances.forEach(game => {
          game.scale.setGameSize(this.aspectRatio.x * document.body.clientWidth, this.aspectRatio.y * document.body.clientHeight);
        });
      }
    });
  }

  init() {
    this.running = true;


    if (this.worldWidth !== null && this.worldHeight !== null) {
      this.addGameObjects(
        this.boundWalls = this.create.wallBlock(0,0,this.worldWidth,this.worldHeight, Wall,{color:new Color(255,255,255,0)})
      );
    }

    if (this.mainGame !== null) {
      // Main state is passed the raycaster instance if needed
      let mainState = new this.mainGame(this);
      mainState.preload()
      this.gameInstances.forEach((game) => {
        let parentElement = this.instanceParent === '' ? null : document.getElementById(this.instanceParent);
          if (parentElement === null) parentElement = document.body;
          parentElement.appendChild(game.canvas);
          game.state = new game.State(game);
          game.state.preload();
      });
      mainState.create();
      this.gameInstances.forEach((game) => {
          game.state.create();
      });
      const update = () => {
          const delta = this._update();
          mainState.update(delta);
          this.gameInstances.forEach((game) => {
              game.time.totalElapsed += delta;
              game.time.prevDelta = game.time.delta;
              game.time.delta = delta;
              game.state.update(delta);
          });
          mainState.render();
          this.gameInstances.forEach((game) => {
              game.state.render(delta);
              game.time.totalFrames++;
              this.renderDebugMode();
          });
          window.requestAnimationFrame(update);
      }
      window.requestAnimationFrame(update);
      return mainState;
    }
    else {
      // Only one game instance (hopefully)
      const game = this.gameInstances[0];
      let parentElement = this.instanceParent === '' ? null : document.getElementById(this.instanceParent);
      // If parent is empty or element doesn't exist append to body
      if (parentElement === null) parentElement = document.body;
      parentElement.appendChild(game.canvas);

      let state = new game.State(game);
      state.preload();
      state.create();

      const update = () => {
        const delta = this._update();
        game.time.totalElapsed += delta;
        game.time.prevDelta = game.time.delta;
        game.time.delta = delta;
        state.update(delta);
        state.render(delta);
        this.renderDebugMode();
        game.time.totalFrames++;
        window.requestAnimationFrame(update);
      }
      window.requestAnimationFrame(update);
      return state;
    }
  }

  getTextureData(key) {
    const data = this._textures[key];
    if (data === undefined) {
      throw new CacheError(`Texture "${key}" does not exist in the cache.`);
      return false;
    }
    else {
      return data;
    }
  }

  async loadTexture(key, path, options = {}) {
    /*
    Loads a texture into the cache.

    @param {String} key - Key stored in cache to fetch TextureData
    @param {String} path - File path or URI that is loaded as a texture
    @param {Object} options - Array of additional arguments
    @param {Boolean} options.alpha - (ONLY SUPPORTS .GIFS WITH FRAMES OF DISPOSAL TYPE 1) If false, the alpha layer of the .gif will be removed

    @returns {Promise.<String>} key - Key used to instantiate the texture from the cache.
    */

    const texture = new TextureData(key);

    this._textures.hasOwnProperty(key) && console.warn(new CacheError(`Texture ${key} was overwritten`));

    this._textures[key] = texture;

    await texture.load(path, options);

    return texture;

    // return key;
  }

  /**
   * Create a raycaster game instance (rendering and logical space).
   *
   * @param {Object} state - A state constructor returning or containing methods `preload`, `create`, `update`, and `render.`
   */
  createGame(state) {
    let canvas = document.createElement('canvas');
    canvas.width = this.instanceWidth;
    canvas.height = this.instanceHeight;
    let game = this._createGameObject(state, canvas);
    this.gameInstances.push(game);
    return game;
  }

  _createGameObject(state, canvas) {
    return {
      canvas: canvas,
      time: {
        totalFrames: 0,
        totalElapsed: 0,
        delta: 0,
        prevDelta: 0,
        _fpsCounter: 0,
        _smoothing: 0.1,
        _weightRatio: 0.1,
        _prevFps: 0,
        get fps() {
          let delta = this.delta * (1 - this._weightRatio) + this.prevDelta * this._weightRatio;
          delta = (this.prevDelta * this._smoothing) + (delta * (1 - this._smoothing));
          const fps = 1000 / delta;
          this._prevFps = fps;
          return fps;
        }
      },
      State: state
    };
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

  _update() {
    const newTime = performance.now();
    const delta = newTime - this.prevTime;
    this.prevTime = newTime;

    // Runs time logic still to prevent something like tabbing out from resulting in huge time delta when tabbing back in.

    if (!this.running) return;

    this.objects.forEach((obj) => {
      obj.preUpdate();
      obj.update(delta);
    });

    return delta;

  }



  renderDebugMode() {
    if (this.renderFPS) {
      this.gameInstances.forEach((instance) => {
        let ctx = instance.canvas.getContext('2d');
          ctx.font = "20px Arial";
          ctx.fillStyle = "#000000";

          let fps;
          instance.time._fpsCounter += instance.time.delta;
          if (instance.time._fpsCounter >= 250) {
            fps = instance.time.fps.toFixed(0);
            instance.time._fpsCounter = 0;
          }
          else {
            fps = instance.time._prevFps.toFixed(0);
          }
          ctx.fillText("FPS: "+fps, 20, 35);

          ctx.font = "14px Arial";
          ctx.fillStyle = "#000000";
          this.debugObjects.forEach((obj, i) => {
            const objRepr = `${obj.constructor.name}(x: ${Math.round(obj.x)}, z: ${Math.round(obj.y)}, y: ${Math.round(obj.yPos3D)})`;
            ctx.fillText(objRepr, 20, 70+(i*30));
          });
      });
    }
    // this.objects.forEach((obj) => {
    // });

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

class RotatingWall extends Raycaster.Wall {
  constructor(raycaster,x,y,x2,y2,options={}) {
    super(raycaster,x,y,x2,y2,options);
  }
  update() {
    super.update();

  }
}

class Player extends Raycaster.PlanarObject {
  constructor(raycaster,game,x,y) {
    let width = 100;
    let height = .5;
    super(raycaster, x, y, x+width, y, {
      varHeight: height,
      texture: 'player'
    });
    this.game = game;

    this.addCamera(game, 100);

    const [w, h] = [125, 125];
    const padding = 10;
    this.minimap = new Raycaster.Minimap(this, raycaster.instanceWidth-w-padding, padding, w, h, undefined, undefined, {
      borderWidth: 3
    });

    this.keys = Player.KEYS.shift();

    this._TERMINAL_VELOCITY = {
      x: 300,
      z: 300,
      y: 10000
    };

    this.jumpForce = 375;

    this.ARCADE_PHYSICS = true;

    this.friction.y = GRAVITATIONAL_FORCE;

    if (this.ARCADE_PHYSICS) {
      // Adjust force for fixed speed
      this.force = 17500;
    }
    else {
      this.force = 2500;

      this.friction.x = 750;
      this.friction.z = 750;
    }
  }
  render(elapsed) {
    super.render(elapsed);
    let ctx = this.game.canvas.getContext('2d');
    this.camera.render();
    this.minimap.render();
  }
  setupMouse() {
    super.setupMouse(this.game);
    this.mouse.setMoveCallback(this.mouseMove,this);
  }
  /**
   * Applies a negative force to the player's y-velocity
   *
   * @param {number} elapsed - Elapsed time in milliseconds since the previous frame. Used to calculate time-based movement.
   */
  jump(elapsed) {
    // Requires varHeight to work properly when the y-axis exceeds 1
    // If the player is not grounded, do not jump
    if (this.yPos3D === 0) {
      this.moveY(this.jumpForce, elapsed);
    }
  }
  /**
   * Moves the Player in the 2d plane.
   *
   * @param {number} horiz - Within {-1, 0, 1}. Indicates direction of strafe.
   * @param {number} vert - Within {-1, 0, 1}. Indicates direction of movement.
   * @param {number} mult - Multiplier applied to vertical and horizontal speed (e.g. when shift is down a multiplier is applied to increase speed).
   * @param {number} elapsed - Elapsed time in milliseconds since the previous frame. Used to calculate time-based movement.
   *
   */
  move(horiz, vert, mult, elapsed) {
    const force = this.force * (vert + horiz) * mult;
    super.move(force, horiz, elapsed);
  }
  /**
   * Rotates the Player in the 2d plane.
   *
   * @param {number} horiz - Within {-1, 1}. Indicates direction.
   * @param {number} elapsed - Elapsed time in milliseconds since the previous frame. Used to calculate time-based movement.
   *
   */
  turnHorizontally(horiz, elapsed) {
    let angle = horiz * this.camera.turnSpeed * KEYBOARD_TURN_HORIZ_MULT * (elapsed/1000);
    super.turnHorizontally(angle);
  }
  /**
   * Rotates the Player's vertical angle about the y-axis of a sphere (in a 3d context).
   *
   * @param {number} vert - Within {-1, 1}. Indicates direction.
   * @param {number} elapsed - Elapsed time in milliseconds since the previous frame. Used to calculate time-based movement.
   *
   */
  turnVertically(vert, elapsed) {
    let angle = vert * this.camera.turnSpeed * KEYBOARD_TURN_VERT_MULT * (elapsed/1000);
    super.turnVertically(angle);
    // NOTE: works properly but does not look correct due to the skybox and ground not being true.
  }
  handleInput(elapsed) {
    let mult = 1;
    if (this.keys.shift.isDown) mult += SHIFT_MULT;

    if (this._TERMINAL_VELOCITY.x !== null) this.terminalVelocity.x = this._TERMINAL_VELOCITY.x * mult;
    if (this._TERMINAL_VELOCITY.z !== null) this.terminalVelocity.z = this._TERMINAL_VELOCITY.z * mult;

    if (this.keys.w.isDown) {
      this.move(0,1,mult,elapsed);
    }
    if (this.keys.a.isDown) {
      this.move(1,0,mult,elapsed);
    }
    if (this.keys.s.isDown) {
      this.move(0,-1,mult,elapsed);
    }
    if (this.keys.d.isDown) {
      this.move(-1,0,mult,elapsed);
    }
    if (this.keys.q.isDown) {
      this.turnHorizontally(-1, elapsed);
    }
    if (this.keys.e.isDown) {
      this.turnHorizontally(1, elapsed);
    }
    if (this.keys.up.isDown) {
      // this.turnVertically(1, elapsed);
    }
    if (this.keys.down.isDown) {
      // this.turnVertically(-1, elapsed);
    }
    if (this.keys.space.isDown) {
      this.jump(elapsed);
    }
  }

  update(elapsed) {
    super.update(elapsed);
    /* Traditional arcade-esque physics */
    if (this.ARCADE_PHYSICS) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      // Leave y-axis.
    }
    if (this.yPos3D < 0) {
      this.yPos3D = 0;
      this.velocity.y = 0;
    }
    this.handleInput(elapsed);
  }

  mouseMove(e) {
    let moveX = e.movementX;
    let moveY = e.movementY;
    this.turnHorizontally(moveX, MOUSE_TURN_MULT);
    this.turnVertically(-moveY, MOUSE_TURN_MULT);
  }
}

const MOUSE_TURN_MULT = 2 / 3;
const KEYBOARD_TURN_HORIZ_MULT = 1.25;
const KEYBOARD_TURN_VERT_MULT = 3;
const SHIFT_MULT = 1;

const GRAVITATIONAL_FORCE = 40;

function GameObj(g) {
  return {
    preload: function() {
    },
    create: function() {
    },
    update: function() {
    },
    render: function() {
    }
  };
};

let mainState = function(raycaster) {
  let game1;
  let game2;
  let players = [];
  let map;
  function preload() {
    game1 = raycaster.createGame(GameObj);
    // game2 = raycaster.createGame(GameObj);

    let texture = raycaster.loadTexture('foo','images/test.gif',{alpha:true});
    // let texture = raycaster.loadTexture('foo','images/test.mp4',{ videoProps: {muted: true, loop: true }});
    raycaster.loadTexture('foo2','images/penguin.png');
    // raycaster.loadTexture('foo2','https://media.giphy.com/media/srAVfKgmxMLqE/giphy.gif');
    raycaster.loadTexture('cementBlock', 'images/block.png');
    raycaster.loadTexture('player','images/player.png');
    raycaster.loadTexture('wall','images/wall.jpg');

    Player.KEYS = [
      {
        w:raycaster.keyboard.addKey(Raycaster.Key.W),
        a:raycaster.keyboard.addKey(Raycaster.Key.A),
        s:raycaster.keyboard.addKey(Raycaster.Key.S),
        d:raycaster.keyboard.addKey(Raycaster.Key.D),
        q:raycaster.keyboard.addKey(Raycaster.Key.Q),
        e:raycaster.keyboard.addKey(Raycaster.Key.E),
        shift:{},
        space:{},
        up:{},
        down:{}
        // shift:raycaster.keyboard.addKey(Raycaster.Key.SHIFT),
        // space:raycaster.keyboard.addKey(Raycaster.Key.SPACE)
      },
      {
        w:raycaster.keyboard.addKey(Raycaster.Key.UP_ARROW),
        a:raycaster.keyboard.addKey(Raycaster.Key.LEFT_ARROW),
        s:raycaster.keyboard.addKey(Raycaster.Key.DOWN_ARROW),
        d:raycaster.keyboard.addKey(Raycaster.Key.RIGHT_ARROW),
        q:raycaster.keyboard.addKey(Raycaster.Key.COMMA),
        e:raycaster.keyboard.addKey(Raycaster.Key.PERIOD),
        shift:{},
        space:{},
        up:{},
        down:{}
        // shift:raycaster.keyboard.addKey(Raycaster.Key.SHIFT),
        // space:raycaster.keyboard.addKey(Raycaster.Key.SPACE)
      }
    ];
  }
  function create() {
    map = Raycaster.MapBuilder.build(
      raycaster,
      [
        [
        [0, 0, 0, 0, 0, 0],
        [0, 1, 2, 3, 1, 0],
        [0, 2, 0, 0, 2, 0],
        [0, 2, 0, 0, 3, 0],
        [0, 1, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0]
        ],
        {
          0: null,
          1: {
            helper: function(raycaster,x1,y1,x2,y2) {
              return Raycaster.constructWallBlock(raycaster,x1,y1,x2,y2,Raycaster.Wall,{color:new Raycaster.Color(255,255,0,1),texture:'foo'});
            }
          },
          2: {
            helper: function(raycaster,x1,y1,x2,y2) {
              return Raycaster.constructWallBlock(raycaster,x1,y1,x2,y2,Raycaster.Wall,{color:new Raycaster.Color(0,255,0,1),texture:'foo2'});
            }
          },
          3: {
            helper: function(raycaster,x1,y1,x2,y2) {
              return Raycaster.constructWallBlock(raycaster,x1,y1,x2,y2,Raycaster.Wall,{color:new Raycaster.Color(0,255,255,1),texture:'wall'});
            }
          },
          4: {
            helper: function(raycaster,x1,y1,x2,y2) {
              return new RotatingWall(
                raycaster,
                x1,
                y1,
                x2,
                y2,
                {color:new Raycaster.Color(0,255,255,1)}
              );
            }
          }
        }
      ],
      6,
      6
    );
    raycaster.boundWalls.forEach((wall) => {
      wall.texture = 'wall';
    });
    raycaster.addGameObjects(map);
    raycaster.addGameObject(new Raycaster.Wall(
      raycaster,
      300,
      0,
      200,
      175,
      {color:Raycaster.Color.fromCSSString("blue"), texture: 'cementBlock'}
    ));

    player1 = new Player(raycaster,game1,50,50);
    player1.setupMouse();
    player1.mouse.start();
    // player2 = new Player(raycaster,game2,50,1);
    raycaster.addGameObjects([player1]);

    raycaster.debugObjects.push(...[player1]);

    players.push(...[player1]);

  }
  function update() {

  }
  function render() {
    players.forEach(player => {
      player.render();
    });
  }
  // Any public mutable variables within the state must be exposed via getter/setter methods due to closure.
  // Players is an array, and as it is never reassigned, does not require these.
  return {
    get map() { return map },
    players: players,
    preload: preload,
    create: create,
    update: update,
    render: render
  };
}

let loadState = {
  preload: function() {
  },
  create: function() {
    this.elapsed = 0;
    this.dots = '';
    this.text = this.add.text(0,0,"Loading",{fill:"#ff0000",boundsAlignH:"center",boundsAlignV:"middle"});
    this.text.setTextBounds(0,0,this.world.width,this.world.height);
  },
  update: function() {
    if (Math.floor(this.elapsed/500) > 0) {
      this.elapsed = 0;
      this.dots += '.'
      if (this.dots.length > 3) {
        this.dots = '';
      }
    }
    this.text.setText('Loading'+this.dots);
    this.elapsed += this.time.elapsed;
  }
}
let raycaster = new Raycaster.Engine(
  1000,
  600,
  '',
  mainState,
  undefined,
  1000,
  false,
  {
    variableHeight:false,
    assetLoadState:null,
    worldWidth: 1000,
    worldHeight: 1000,
    automaticallyResize: false,
  }
);
raycaster.renderFPS = true;

let state = raycaster.init();

// TODO (important): change to step based - would be far more optimized for everything
// TODO: look into image compression via an OffscreenCanvas
// TODO: add minimap viewWidth and viewHeight functionality
// TODO (bug): elapsed should probably on a per instance basis.
// TODO: Map builder and extend the abilities of a map. Chunked map?
// TODO: Map builder load from file
// TODO: could add sprite sheet parsing to image textures for ease of use.
    // TODO: could also make it a utility, so one could load multiple textures into a single texture for easier management.
// TODO: try to fix looking up and down with the skybox and ground
// TODO: add shading (how?)
// TODO: implement split screen
//    also add more game instance mangement functions. currently there is no supported method for resizing game instances for example
// TODO: could add bounding walls the size of the map builder and make map builder do the bounding walls instead of the engine

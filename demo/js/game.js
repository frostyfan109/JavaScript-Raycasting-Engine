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

    this.keys = {
      w:game.input.keyboard.addKey(87),
      a:game.input.keyboard.addKey(65),
      s:game.input.keyboard.addKey(83),
      d:game.input.keyboard.addKey(68),
      left:game.input.keyboard.addKey(37),
      right:game.input.keyboard.addKey(39),
      up:game.input.keyboard.addKey(38),
      down:game.input.keyboard.addKey(40),
      shift:game.input.keyboard.addKey(16),
      space:game.input.keyboard.addKey(32)
    };

    this._TERMINAL_VELOCITY = {
      x: 300,
      z: 300,
      y: 10006
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
    // let angle = vert * this.camera.turnSpeed * KEYBOARD_TURN_VERT_MULT * (elapsed/1000);
    // super.turnVertically(angle);
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
    if (this.keys.left.isDown) {
      this.turnHorizontally(-1, elapsed);
    }
    if (this.keys.right.isDown) {
      this.turnHorizontally(1, elapsed);
    }
    if (this.keys.up.isDown) {
      this.turnVertically(1, elapsed);
    }
    if (this.keys.down.isDown) {
      this.turnVertically(-1, elapsed);
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

  mouseMove() {
    let moveX = this.game.input.mouse.event.movementX;
    let moveY = this.game.input.mouse.event.movementY;
    this.turn(moveX,MOUSE_TURN_MULT);
  }
}

const MOUSE_TURN_MULT = 1 / 4;
const KEYBOARD_TURN_HORIZ_MULT = 1.25;
const KEYBOARD_TURN_VERT_MULT = 3;
const SHIFT_MULT = 1;

const GRAVITATIONAL_FORCE = 40;

function GameObj() {
  let player = null;
  let map = null;
  let minimap = null;
  function preload() {

    let texture = raycaster.loadTexture('foo','images/test.gif',{alpha:true});
    // let texture = raycaster.loadTexture('foo','images/test.mp4',{ videoProps: {muted: true, loop: true }});
    // raycaster.loadTexture('foo2','https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif');
    raycaster.loadTexture('foo2','https://media.giphy.com/media/srAVfKgmxMLqE/giphy.gif');
    raycaster.loadTexture('player','images/player.png');
    raycaster.loadTexture('wall','https://res.cloudinary.com/rebelwalls/image/upload/b_black,c_fill,fl_progressive,h_533,q_auto,w_800/v1479371023/article/R10961_image1');

    // TODO: Map builder and extend the abilities of a map. Chunked map?
    // TODO: could add sprite sheet parsing to image textures for ease of use.
        // TODO: could also make it a utility, so one could load multiple textures into a single texture for easier management.
    // TODO: try to fix looking up and down with the skybox and ground
    // TODO: add shading (how?)
    // TODO: implement split screen
    //    also add more game instance mangement functions. currently there is no supported method for resizing game instances for example
    // TODO: change to step based - would be far more optimized for variable height and others
    // TODO: fix debug by adding camera

  }
  function init() {
    raycaster.init();
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


    player = new Player(raycaster,g,50,50);
    player.drawCollision = true;
    player.drawFov = true;
    // player.setupMouse(game);
    // player.enableMouse(game);

    const [width, height] = [125, 125];
    const padding = 10;
    minimap = new Raycaster.Minimap(player, raycaster.instanceWidth-width-padding, padding, width, height, undefined, undefined, {
      borderWidth: 3
    });

    raycaster.addGameObject(player);
    raycaster.addGameObjects(map);
    raycaster.addGameObject(new RotatingWall(
      raycaster,
      300,
      0,
      200,
      175,
      {color:new Raycaster.Color(0,255,255,1)}
    ));

    raycaster.debugObjects.push(player);

    raycaster.start();
  }
  function update() {
    raycaster.update();
  }
  function render() {
    minimap.render();
  }
  // Due to the way that Phaser handles states, the function must expose public members as getters
  return {
    player: () => player,
    map: () => map,
    minimap: () => minimap,
    preload: preload,
    init: init,
    create: create,
    update: update,
    render: render
  };
};

let mainState = {
  update: function() {
    console.log(0);
  }
};

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
  750,
  600,
  '',
  mainState,
  undefined,
  500,
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
const g = raycaster.createGame(GameObj());
const g2 = raycaster.createGame(GameObj());

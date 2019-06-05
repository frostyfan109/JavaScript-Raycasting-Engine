class Player extends Raycaster.PlanarObject {
  constructor(raycaster,game,x,y) {
    let width = 100;
    let height = .5;
    super(raycaster, x, y, x+width, y, {
      varHeight: height
    });
    this.game = game;

    this.addCamera(game);

    this.keys = {
      w:game.input.keyboard.addKey(Phaser.Keyboard.W),
      a:game.input.keyboard.addKey(Phaser.Keyboard.A),
      s:game.input.keyboard.addKey(Phaser.Keyboard.S),
      d:game.input.keyboard.addKey(Phaser.Keyboard.D),
      left:game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
      right:game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
      up:game.input.keyboard.addKey(Phaser.Keyboard.UP),
      down:game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
      shift:game.input.keyboard.addKey(Phaser.Keyboard.SHIFT)
    };


    this._TERMINAL_VELOCITY = {
      x: 300,
      y: 300
    };

    this.ARCADE_PHYSICS = true;

    if (this.ARCADE_PHYSICS) {
      // Adjust force for fixed speed
      this.forwardForce = 10000;
      this.strafeForce = 10000;
    }
    else {
      this.forwardForce = 1250;
      this.strafeForce = 1250;

      this.friction = {
        x:  750,
        y:  750
      };
    }
  }
  render(elapsed) {
    super.render(elapsed);
    let ctx = this.game.canvas.getContext('2d');
    this.camera.render();
    minimap.render();
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
    const forwardForce = this.forwardForce * vert * mult;
    const strafeForce = this.strafeForce * horiz * mult;
    const force = (forwardForce + strafeForce);
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
   * Rotates the Player's vertical angle about the z-axis of a sphere (in a 3d context).
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



    this.terminalVelocity.x = this._TERMINAL_VELOCITY.x * mult;
    this.terminalVelocity.y = this._TERMINAL_VELOCITY.y * mult;

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
  }

  update(elapsed) {
    super.update(elapsed);
    /* Traditional arcade-esque physics */
    if (this.ARCADE_PHYSICS) {
      this.velocity = {
        x: 0,
        y: 0
      };
    }
    this.handleInput(elapsed);
  }

  mouseMove() {
    let moveX = this.game.input.mouse.event.movementX;
    let moveY = this.game.input.mouse.event.movementY;
    this.turn(moveX,MOUSE_TURN_MULT);
  }
}

MOUSE_TURN_MULT = 1 / 4;
KEYBOARD_TURN_HORIZ_MULT = 1.25;
KEYBOARD_TURN_VERT_MULT = 3;
SHIFT_MULT = 1;

class RotatingWall extends Raycaster.Wall {
  constructor(raycaster,x,y,x2,y2,options={}) {
    super(raycaster,x,y,x2,y2,options);
  }
}

let GameObj = {
  preload: function() {
    let texture = raycaster.loadTexture('foo','images/test.gif',{alpha:true},function(texture) {
      console.log(texture);
    });
    raycaster.loadTexture('foo2','https://media.giphy.com/media/srAVfKgmxMLqE/giphy.gif');

    // TODO: add and test jumping to see if it's any good with the skybox and ground.
    // TODO: implement split screen
    // TODO: add shading (how?)
    // TODO: try to optimize gif loading (when async it still stalls phaser)
    // TODO: change to step based - would be far more optimized for variable height and others

  },
  init: function() {
    raycaster.init();
  },
  create: function() {
    map = Raycaster.MapBuilder.build(
      raycaster,
      [
        [
        [0, 0, 0, 0, 0, 0],
        [0, 1, 2, 3, 1, 0],
        [0, 2, 0, 0, 2, 0],
        [0, 3, 0, 0, 3, 0],
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
              return Raycaster.constructWallBlock(raycaster,x1,y1,x2,y2,Raycaster.Wall,{color:new Raycaster.Color(0,255,255,1)});
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


    player = new Player(raycaster,game,50,50);
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





    // game.add.image(0,0,'foo');
  },
  update: function() {
    raycaster.update();
  },
  render: function() {
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

let raycaster = new Raycaster.Engine(1000,600,'',undefined,500,false,{
  variableHeight:false,
  assetLoadState:null,
  worldWidth: 1000,
  worldHeight: 1000
});
raycaster.renderFPS = true;
let player;
let map;
let minimap;
const game = raycaster.createGame(GameObj);

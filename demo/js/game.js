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

    this.speed = 200;
    this.strafeSpeed = 200;

  }
  render() {
    super.render();
    this.camera.render();
    minimap.render();
  }
  move(horiz, vert, mult) {
    const normalSpeed = this.speed * vert * mult;
    const strafeSpeed = this.strafeSpeed * horiz * mult;
    const speed = normalSpeed + strafeSpeed;
    super.move(speed, horiz, this.game.time.elapsed/1000);
  }
  turn(horiz, mult) {
    let angle = horiz * this.camera.turnSpeed * mult * (this.game.time.elapsed/1000);
    super.turn(angle);
  }
  handleInput() {
    let mult = 1;
    if (this.keys.shift.isDown) mult += SHIFT_MULT;
    if (this.keys.w.isDown) {
      this.move(0,1,mult);
    }
    if (this.keys.a.isDown) {
      this.move(1,0,mult);
    }
    if (this.keys.s.isDown) {
      this.move(0,-1,mult);
    }
    if (this.keys.d.isDown) {
      this.move(-1,0,mult);
    }
    if (this.keys.left.isDown) {
      this.turn(-1,KEYBOARD_TURN_MULT);
    }
    if (this.keys.right.isDown) {
      this.turn(1,KEYBOARD_TURN_MULT);
    }
    if (this.keys.up.isDown) {
      this.turn(0,KEYBOARD_TURN_MULT);
    }
    if (this.keys.down.isDown) {
      this.turn(0,KEYBOARD_TURN_MULT);
    }
    this.handleCollision();
  }

  preUpdate() {
    super.preUpdate();
    this.handleInput();
  }

  mouseMove() {
    let moveX = this.game.input.mouse.event.movementX;
    let moveY = this.game.input.mouse.event.movementY;
    this.turn(moveX,MOUSE_TURN_MULT);
  }
}

MOUSE_TURN_MULT = 1 / 4;
KEYBOARD_TURN_MULT = 1.25;
SHIFT_MULT = 1/2;

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
  worldHeight: 1000,
  variableHeight: true
});
raycaster.renderFPS = true;
let player;
let map;
let minimap;
const game = raycaster.createGame(GameObj);

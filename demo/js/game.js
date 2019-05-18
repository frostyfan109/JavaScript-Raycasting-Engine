class Player extends Entity {
  constructor(g,x,y) {
    let [width,height] = [25,25];
    let angle = 90;
    super(
      x,
      y,
      width,
      height,
      true,
      {
        fov:100,
        speed:200,
        lookSpeed:200,
      },
      g,
      {useMouse:true},
      angle
    );
    this.keys = {
      w:game.input.keyboard.addKey(Phaser.Keyboard.W),
      a:game.input.keyboard.addKey(Phaser.Keyboard.A),
      s:game.input.keyboard.addKey(Phaser.Keyboard.S),
      d:game.input.keyboard.addKey(Phaser.Keyboard.D),
      left:game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
      right:game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
    };
  }
  handleInput() {
    if (this.keys.w.isDown) {
      this.move(0,1);
    }
    if (this.keys.a.isDown) {
      this.move(1,0);
    }
    if (this.keys.s.isDown) {
      this.move(0,-1);
    }
    if (this.keys.d.isDown) {
      this.move(-1,0);
    }
    if (this.keys.left.isDown) {
      this.turn(-1,Entity.KEYBOARD_TURN_MULT);
    }
    if (this.keys.right.isDown) {
      this.turn(1,Entity.KEYBOARD_TURN_MULT);
    }
  }

  mouseMove(game) {
    let moveX = game.input.mouse.event.movementX;
    let moveY = game.input.mouse.event.movementY;
    this.turn(Math.sign(moveX)*Math.sqrt(moveX**2+moveY**2),Entity.MOUSE_TURN_MULT);
  }

  update() {
  }
  render() {
    this.renderGround(this.game);
    this.renderSky(this.game);
    this.renderView(this.game);
  }
}

class RotatingWall extends Wall {
  constructor(x,y,x2,y2,height,options={}) {
    super(x,y,x2,y2,height,options);
  }
  update() {
    // this.rotate((3).toRad());
  }
}

function generateMap() {
  let map = [
    new Wall(300,200,40,200,100,{texture:'foo',color:new Color(50,50,50,1)}),
    new Wall(200,400,40,200,100,{texture:'foo',color:new Color(0,255,0,.5)}),

    new RotatingWall(200,5,225,185,100,{color:new Color(255,255,0,.5)}),
    new RotatingWall(400,5,225,185,100,{color:new Color(255,255,0,1)}),
    new RotatingWall(500,50,400,185,100,{color:new Color(255,255,0,.8)}),
    new RotatingWall(200,5,600,185,100,{color:new Color(255,255,0,1)})



  ]
  return map;
}

let GameObj = {
  preload: function() {
    raycaster.loadImage('foo','images/foo625.png');

    map = generateMap();

    player = new Player(game,50,50);
    raycaster.addGameObject(player);
    raycaster.addGameObjects(map);

    // TODO: add textures to walls
    // TODO: add multidimensional planarobject helper class
    // TODO: add collision support
    // TODO: add entity support

    // game.load.image('foo','images/foo625.png');

  },
  init: function() {
    raycaster.init();
  },
  create: function() {
    raycaster.start();
    // game.add.image(0,0,'foo');
  },
  update: function() {
    raycaster.update();
    player.handleInput();
  },
  render: function() {
  }
};

let raycaster = new Raycaster(1000,600,'',undefined,4000/2,false);
raycaster.renderFPS = true;
let player;
let map;
const game = raycaster.createGame(GameObj);

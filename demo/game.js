class Player extends Entity {
  constructor(x,y) {
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
        lookSpeed:200
      },
      undefined,
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
      this.turn(-1);
    }
    if (this.keys.right.isDown) {
      this.turn(1);
    }
  }
}

let GameObj = {
  preload: function() {
    player = new Player(50,50);
    raycaster.addGameObject(player);
    raycaster.addGameObject(new Wall(300,200,40,200,100,{color:"rgba(50,50,50,1)"}));
    raycaster.addGameObject(new Wall(200,400,40,200,100,{color:"rgba(0,255,0,.5)"}));

  },
  init: function() {
    raycaster.init();
  },
  create: function() {
    raycaster.start();
  },
  update: function() {
    player.handleInput();
    raycaster.update();
  },
  render: function() {
    player.renderGround();
    player.renderSky();
    player.renderPerspective(game);
  }
};

let raycaster = new Raycaster(600,500,'',undefined,true);
let player;
const game = raycaster.createGame(GameObj);

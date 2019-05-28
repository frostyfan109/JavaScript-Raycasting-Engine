class Player extends Raycaster.Entity {
  constructor(raycaster,g,x,y) {
    let [width,height] = [25,25];
    let angle = 90;
    super(
      raycaster,
      x,
      y,
      width,
      true,
      {
        fov:100,
        speed:200,
        lookSpeed:200,
      },
      g,
      {height:height, useMouse:false},
      angle
    );
    this.keys = {
      w:game.input.keyboard.addKey(Phaser.Keyboard.W),
      a:game.input.keyboard.addKey(Phaser.Keyboard.A),
      s:game.input.keyboard.addKey(Phaser.Keyboard.S),
      d:game.input.keyboard.addKey(Phaser.Keyboard.D),
      left:game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
      right:game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
      up:game.input.keyboard.addKey(Phaser.Keyboard.UP),
      down:game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
    };

    this.renderFrame = () => {
      this.renderGround();
      this.renderSky();
      this.renderView();
    }
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
      this.turn(-1,Raycaster.Entity.KEYBOARD_TURN_MULT);
    }
    if (this.keys.right.isDown) {
      this.turn(1,Raycaster.Entity.KEYBOARD_TURN_MULT);
    }
    if (this.keys.up.isDown) {
      this.turn(0,Raycaster.Entity.KEYBOARD_TURN_MULT);
    }
    if (this.keys.down.isDown) {
      this.turn(0,Raycaster.Entity.KEYBOARD_TURN_MULT);
    }
  }

  mouseMove() {
    let moveX = this.game.input.mouse.event.movementX;
    let moveY = this.game.input.mouse.event.movementY;
    this.turn(moveX,Raycaster.Entity.MOUSE_TURN_MULT);
  }
}

class RotatingWall extends Raycaster.Wall {
  constructor(raycaster,x,y,x2,y2,options={}) {
    super(raycaster,x,y,x2,y2,options);
    this.updateFrame = () => {
      this.rotate((3).toRad());
    }
  }
}

function generateMap() {
  let map = [
    raycaster.create.wall(300,200,40,200,{texture:'foo',color:new Raycaster.Color(50,50,50,1)}),
    raycaster.create.wall(200,400,40,200,{texture:'foo',color:new Raycaster.Color(0,255,0,.5)}),

    raycaster.create.wall(200,5,225,185,{height:1.25,color:new Raycaster.Color(210,210,0,.5)}),
    raycaster.create.wall(400,5,225,185,{color:new Raycaster.Color(230,230,0,1)}),
    raycaster.create.wall(500,50,400,185,{color:new Raycaster.Color(255,255,0,.8)}),
    new RotatingWall(raycaster,100,5,0,5,{color:new Raycaster.Color(255,255,0,1)}),
    new RotatingWall(raycaster,100,700,400,500,{texture:'foo2',color:new Raycaster.Color(255,255,0,1)})



  ]
  return map;
}

let GameObj = {
  preload: function() {
    let texture = raycaster.loadTexture('foo','images/test.gif',{alpha:true},function(texture) {
      console.log(texture);
    });
    raycaster.loadTexture('foo2','https://media.giphy.com/media/srAVfKgmxMLqE/giphy.gif');



    // TODO: add multidimensional planarobject helper class
    // TODO: add collision support
    // TODO: add entity support
    // TODO: add shading? (may be too demanding)
    // TODO: add actual world dimensions (meaning true skybox and ground)
      // TODO: add gridded map helper
    // TODO: try to optimize gif loading (when async it still stalls phaser)

  },
  init: function() {
    raycaster.init();
  },
  create: function() {
    // map = generateMap();
    let map = Raycaster.MapBuilder.build(
      raycaster,
      [
        [
        [[0, Raycaster.Wall, {color:new Raycaster.Color(255,0,0,.5)}], 0, 0],
        [0, 0, 0],
        [0, 0, 0]
        ],
        {
          0: {
            object: Raycaster.WallBlock,
            arguments: [Raycaster.Wall,{color:new Raycaster.Color(255,255,0,.5)}]
          }
        }
      ],
      3,
      3
    );

    player = new Player(raycaster,game,250,250);
    raycaster.addGameObject(player);
    raycaster.addGameObjects(map);

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
  worldBounds: {
    width:500,
    height:500
  }
});
raycaster.renderFPS = true;
let player;
let map;
const game = raycaster.createGame(GameObj);

Number.prototype.toRad = function() {
  return this * (Math.PI/180);
}
Number.prototype.toDeg = function() {
  return this * (180/Math.PI);
}
Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
}


function rgbToHex(r,g,b) {
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

class Color {
  constructor(r,g,b,a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  toHex() {
    return parseInt(rgbToHex(this.r,this.g,this.b),16);
  }
  toCSSString() {
    return `rgba(${this.r},${this.g},${this.b},${this.a})`;
  }
}

class Ray extends Phaser.Line {
  constructor(x,y,angle,length) {
    super();
    this.fromAngle(x,y,angle,length);
    this.origin = new Phaser.Point(this.start.x,this.start.y);
    this.collisions = [];
  }
}

class PlanarObject extends Phaser.Line {
  //Native renderable object
  constructor(x,y,x2,y2,height,options={}) {
    super(x,y,x2,y2);
    this.h = height;
    this.options = {
      texture:null,
      color:new Color(255,255,255,1),
      render:true
    };
    for (let key in options) {
      if (key in this.options) {
        this.options[key] = options[key];
      }
    }
  }
  update() {
    //Called on PlanarObject every update loop - should be overloaded to add additional functionality to custom objects
  }
  render() {
    //Called on PlanarObject every render loop - should be overloaded to add any render logic that would be contained within the PLanarObject::update method
  }
}

class Wall extends PlanarObject {
  constructor(x,y,x2,y2,height,options={}) {
    super(x,y,x2,y2,height,options);
  }
}

class EntitySprite extends Phaser.Sprite {
  constructor(x,y,key) {
      if (typeof key === "undefined" || key === null) {
        let graphics = new Phaser.Graphics(Raycaster.DEBUG,0,0);
        let rad = 3.5;
        graphics.beginFill(0xff0000);
        graphics.drawCircle(0,0,rad*2);
        graphics.lineStyle(2,0xff00ff,1);
        graphics.moveTo(0,0);
        graphics.lineTo(rad*5,0);
        graphics.lineStyle(1,0xffff00,1);
        graphics.beginFill(0xffff00);
        // graphics.drawTriangle([new Phaser.Point(0,-rad),new Phaser.Point(0,rad-1),new Phaser.Point(rad*4,0)]);
        key = graphics.generateTexture();
      }
      super(Raycaster.DEBUG,x,y,key);
      Raycaster.DEBUG.physics.arcade.enable(this);
      this.anchor.setTo(0.5,0.5);
      Raycaster.DEBUG.add.existing(this);
  }
  move(lookSpeed,speed) {
    // console.log(this.angle);
    let vel = Raycaster.DEBUG.physics.arcade.velocityFromAngle(this.angle,speed);
    this.body.velocity.x += vel.x;
    this.body.velocity.y += vel.y;
  }
}

class Entity extends PlanarObject {
  /*
  Native renderable object with a camera and built-in movement functionality

  @param {int} x - Initial x-axis coordinate
  @param {int} y - Initial y=axis coordinate
  @param {int} width - Width of the Entity
  @param {int} height - Height of the Entity
  @param {Boolean} hasCamera - When false, the Entity will cast out 0 rays
  @param {Object} data - Data regarding the behavior of the Entity
  @param {int} data.fov - Fov in degrees of Entity (<=0 if the Entity does not cast rays)
  @param {int} data.speed - Speed of Entity in pixels per (second squared)
  @param {int} data.lookSpeed - Speed at which Entity turns in degrees/radians per second squared (varies depending on version of Phaser)
  @param {Phaser.Game} [game=null] - Instance of game that the Entity will store for use when rendering and performing other operations
    Entity::setupMouse(Phaser.Game game) must be called before the mouse will function if no game instance is passed to the Entity
  @param {Object} [options={}] - Additional PLanarObject options
  @param {String} options.color - Color object of the Entity, given a texture is not present
  @param {Boolean} options.render - Boolean regarding whether or not the object will be rendered
  @param {Boolean} options.useMouse - Boolean regarding whether or not the object will hook into mouse on instantiation
  @param {int} [angle=0] - Initial angle that the Entity faces
  */
  constructor(x,y,width,height,hasCamera,data,game=null,options={},angle=0) {
    super(x,y,x+width,y,height,options);
    // this.rotate(angle,true);
    this.game = game;
    this.hasCamera = hasCamera;
    this.data = data;
    this.fov = data.fov;
    this.speed = data.speed;
    this.lookSpeed = data.lookSpeed;


    this.drawFov = true;
    this.drawCollision = true;

    this.sprite = new EntitySprite((this.start.x+this.end.x)/2,(this.start.y+this.end.y)/2);
    this.sprite.angle = angle;
    this.rays = [];

    if (this.game instanceof Phaser.Game) {
      this.setupMouse(this.game)
      if ("useMouse" in options && options.useMouse) {
        this.startMouse(this.game);
      }
      else {
        this.stopMouse(this.game);
      }
    }
    delete options.useMouse;
  }

  castRays() {
    if (!this.hasCamera) return;
    this.rays.length = 0; //empty ray array

    //distToProjSurface = total_rays/2 / tan(half_of_fov_in_rad)
    let distToProjSurface = (Raycaster.TOTAL_RAYS/2) / Math.tan((this.fov/2).toRad());
    for (let x=0;x<Raycaster.TOTAL_RAYS;x++) {
      let angle = Math.atan((x-(Raycaster.TOTAL_RAYS/2)) / distToProjSurface);
      angle += (this.sprite.angle).toRad();
      let ray = new Ray(this.sprite.body.center.x,this.sprite.body.center.y,angle,Entity.RENDER_DISTANCE);
      this.rays.push(ray);
    }
  }

  setupMouse(game=this.game) {
    game.canvas.addEventListener('mousedown',() => {Raycaster.requestPointerLock(game);},this);
    game.input.addMoveCallback((pointer,x,y,click) => {this.mouseMove(game,pointer,x,y,click);},this);
  }

  startMouse(game=this.game) {
    game.input.mouse.start();
  }
  stopMouse(game=this.game) {
    game.input.mouse.stop();
  }

  mouseMove(game,pointer,x,y,click) {
    //Should be overloaded to add functionality to mouse
    //Should only be used in non split screen games
  }

  turn(dir,mult) {
    let ang = dir*this.lookSpeed*mult;
    // this.rotate(ang,true);
    // this.sprite.angle = this.angle;
    this.sprite.body.angularVelocity = ang;
    this.center();
  }

  move(horiz,vert) {
    let ang;
    let oldAng;
    ang = oldAng = this.sprite.angle;
    if (horiz > 0) {
      ang = ang + 270;
    }
    else if (horiz < 0) {
      ang = ang - 90;
    }
    let speed = this.speed*(horiz+vert)
    this.sprite.angle = ang;
    this.sprite.move(this.lookSpeed,speed);
    this.sprite.angle = oldAng;
    this.center();
  }

  center() {
    this.centerOn(this.sprite.body.center.x,this.sprite.body.center.y);
  }

  renderSky(game=this.game,color=new Color(99,185,255,1)) {
    game.debug.geom(new Phaser.Rectangle(0,0,game.world.width,game.world.height/2),color.toCSSString());
  }

  renderGround(game=this.game,color=new Color(226,226,226,1)) {
    game.debug.geom(new Phaser.Rectangle(0,game.world.height/2,game.world.width,game.world.height/2),color.toCSSString());
  }

  renderView(game=this.game) {
    let ctx = game.canvas.getContext('2d');
    let points = [];
    let renderedObjects = new Set();
    this.rays.forEach((ray,i) => {
      let collisions = ray.collisions.slice().sort((c1,c2) => Math.sqrt((c2.p.x-ray.origin.x)**2 + (c2.p.y-ray.origin.y)**2) - Math.sqrt((c1.p.x-ray.origin.x)**2 + (c1.p.y-ray.origin.y)**2));
      for (let m=0;m<collisions.length;m++) {
        let col = collisions[m];
        col.renderThisFrame = true;
        if (m > 0) {
          let prevCol = collisions[m-1];
          if (col.obj.options.color.a === 1) {
            prevCol.renderThisFrame = false;
          }
        }
      }
      for (let n=0;n<collisions.length;n++) {
        let col = collisions[n];
        if (col.renderThisFrame === false) {
          continue;
        }
        let collision = col.p;
        let collisionObject = col.obj;
        renderedObjects.add(collisionObject);

        let texture = col.obj.options.texture;


        let rayLen = this.rays.length;
        let width = Math.ceil(game.world.width/rayLen);
        // console.log(width);
        let dx = collision.x-ray.origin.x;
        let dy = collision.y-ray.origin.y;
        let distance = Math.sqrt((dx*dx) + (dy*dy));
        let projHeight = distance * Math.cos((Math.atan2(dy,dx)-this.sprite.angle.toRad()));
        let actualHeight = collisionObject.h;

        let y = (game.world.height/2) - (projHeight/2);

        let color = collisionObject.options.color;
        let column = new Phaser.Rectangle(
          Math.floor((i)*(game.world.width/rayLen)),
          (game.world.height/2)-((game.world.height / (projHeight/this.fov)) / 2),
          width,
          game.world.height/(projHeight/this.fov)
        );


        // game.debug.geom(column,color);
        // console.log(color.toHex());
        if (game.time.totalFrames % 60 === 1 && i / (Raycaster.TOTAL_RAYS/2) === 1) {
          console.log(i);
          console.log(color.toHex());
        }
        ctx.beginPath();
        ctx.fillStyle = color.toCSSString();
        ctx.fillRect(column.x,column.y,column.width,column.height);
        if (texture !== null) {
          let textureData = game.cache.getImage(texture);
          // let textureX = textureData.width - Math.floor(column.x*textureData.width) - 1;
          let textureX = column.x;
          let textureY = column.y;
          let textureWidth = column.width;
          let textureHeight = column.height;

          // let bmd = game.make.bitmapData(textureWidth,textureHeight);
          // bmd.draw(texture,textureX,textureY);
          //
          // for (let y=0;y<bmd.height;y++) {
          //   for (let x=0;x<bmd.width;x++) {
          //     let rgb = bmd.getPixelRGB(x,y);
          //     game.debug.geom(new Phaser.Point(x,y),"#"+rgbToHex(rgb.r,rgb.g,rgb.b));
          //   }
          // }
        }
        else {
        }
        points.push(new Phaser.Line(column.x,column.y,column.x+column.width,column.y+column.height));

        // if (collisionObject.options.color.a === 1) {
          // break;
        // }
      };
      if (Raycaster.DEBUG_MODE) {
        if (points.length > 0) {
          // game.debug.geom(new Phaser.Line(points[0].start.x,points[0].start.y,points[points.length-1].end.x,points[points.length-1].start.y),"#00ff00");
          // game.debug.geom(new Phaser.Line(points[0].start.x,points[0].end.y,points[points.length-1].end.x,points[points.length-1].end.y),"#00ff00");
        }
        points.forEach((point,i) => {
          //   if (i === 0) return;
          //   game.debug.geom(new Phaser.Line(points[i-1].start.x,points[i-1].start.y,point.start.x,point.start.y),"#ffffff");
          //   game.debug.geom(new Phaser.Line(points[i-1].start.x,points[i-1].end.y,point.start.x,point.end.y),"#000000");
        });
      }
    });
    if (Raycaster.DEBUG_MODE) {
      // console.log(renderedObjects.size);
    }
  }
}

Entity.MOUSE_TURN_MULT = 1/4;
Entity.KEYBOARD_TURN_MULT = 1.25;
Entity.RENDER_DISTANCE = null;

class Raycaster {
  /*
  Main class used to perform update logic and handle the game state

  @param {int} width - Width in pixels of game instances
  @param {int} height - Height in pixels of game instances
  @param {string | HTMlElement} parent - Parent element that game instances will be created within
  @param {int} [renderDistance=100000] - Max length in pixels of rays that Entities cast out
    Has infinitesimal effect on performance
  @param {int} [totalRays=null] - Total amount of rays that are cast out by an Entity
    Recommended to be left as null as it uses it will use the width of the game instances
    Can be reduced or increased to increase or reduce fps respectively
  @param {Object} [options={}] - Additional optional parameters to speed up initialization of object
  */
  constructor(width,height,parent,renderDistance=1e7,totalRays=null,debug=false,options={}) {
    Entity.RENDER_DISTANCE = renderDistance;
    Raycaster.DEBUG_MODE = debug;
    Raycaster.TOTAL_RAYS = typeof totalRays === "undefined" || totalRays === null || totalRays === undefined ? width : totalRays;


    this.renderFPS = debug ? true : false;
    this.instanceWidth = width;
    this.instanceHeight = height;
    this.instanceParent = parent;
    this.gameInstances = [];
    this.objects = [];
    this.running = false;
  }

  init() {
    Raycaster.DEBUG = new Phaser.Game(this.instanceWidth, this.instanceHeight, this.instanceParent, Phaser.CANVAS);
    if (!Raycaster.DEBUG_MODE) {
      Raycaster.DEBUG.canvas.style.display = "none";
    }
    else {
      Raycaster.DEBUG.time.advancedTiming = true;
    }
  }

  loadImage(key,path) {
    this.gameInstances.forEach(g => {
      g.load.image(key,path);
    });
    return key;
  }

  createGame(g) {
    let preload = g.preload;
    g.preload = (...args) => {
      instance.time.totalFrames = 0;
      preload(...args);
    }
    let render = g.render;
    g.render = (...args) => {
      instance.time.totalFrames++;
      render(...args);
      this.renderDebug();
    }
    let instance = new Phaser.Game(this.instanceWidth,this.instanceHeight,Phaser.CANVAS,this.instanceParent,g);
    this.gameInstances.push(instance);
    return instance;
  }

  start() {
    Raycaster.DEBUG.physics.startSystem(Phaser.Physics.ARCADE);

    // this.player = new Player(this.game,50,50);
    // this.addGameObject(this.player);
    // this.addGameObject(new Wall(this.game,200,200,400,400));
    this.running = true;
  }


  addGameObject(obj) {
    this.objects.push(obj);
  }

  addGameObjects(objs) {
    objs.forEach(obj => this.addGameObject(obj));
  }

  removeGameObject(obj) {
    this.objects = this.objects.filter(o => o !== obj);
  }

  update() {
    if (!this.running) return;

    this.objects.forEach(obj => {
      if (obj instanceof Entity) {
        obj.sprite.body.velocity.x = 0;
        obj.sprite.body.velocity.y = 0;
        obj.sprite.body.angularVelocity = 0;
        obj.rotate(((90).toRad()+obj.sprite.angle.toRad())-obj.angle);
        obj.center();
        obj.castRays();
      }
    });

    this.handleRays();

    this.objects.forEach(obj => {
      obj.update();
    });
  }

  handleRays() {
    this.objects.forEach(obj => {
      if (obj instanceof Entity) {
        obj.rays.forEach(ray => {
          // Raycaster.DEBUG.debug.geom(ray);
          this.objects.forEach(colObj => {
            if (colObj === obj || !colObj.options.render) return;
            let intersection = intersect(ray.start.x,ray.start.y,ray.end.x,ray.end.y,colObj.start.x,colObj.start.y,colObj.end.x,colObj.end.y);
            if (intersection) ray.collisions.push({p:intersection,obj:colObj});
            // if (intersection) {
              // let distance = Math.sqrt((intersection.x-ray.origin.x)**2,(intersection.y-ray.origin.y)**2);
              // Raycaster.DEBUG.debug.geom(new Phaser.Line(ray.origin.x,ray.origin.y,intersection.x,intersection.y),"#ff0000");
            // }
          });
        });
      }
    });
  }

  renderDebug() {
    this.objects.forEach(obj => {
      obj.render();
      if (obj instanceof PlanarObject) {
        if (Raycaster.DEBUG_MODE) {
          Raycaster.DEBUG.debug.geom(obj,obj.options.color.toCSSString());
          if (obj instanceof Entity) {
            obj.rays.forEach(ray => {
              if (obj.drawFov) {
                Raycaster.DEBUG.debug.geom(new Phaser.Line(ray.origin.x,ray.origin.y,ray.end.x,ray.end.y),"#ff0000");
              }
              if (obj.drawCollision) {
                ray.collisions.forEach(collision => {
                  Raycaster.DEBUG.debug.geom(new Phaser.Line(ray.origin.x,ray.origin.y,collision.p.x,collision.p.y),"#00ff00");
                });
              }
            });
          }
        }
        if (this.renderFPS) {
          [...this.gameInstances,Raycaster.DEBUG].forEach(instance => {
            if (instance.time.advancedTiming !== true) {
              instance.time.advancedTiming = true;
              return;
            }
            instance.debug.text(instance.time.fps,25,25,"#00ff00");
          });
        }
      }
    });
  }
}

Raycaster.requestPointerLock = function(game) {
  game.input.mouse.requestPointerLock();
}

function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {

  // Check if none of the lines are of length 0
	if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
		return false
	}

	denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

  // Lines are parallel
	if (denominator === 0) {
		return false
	}

	let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
	let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

  // is the intersection along the segments
	if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
		return false
	}

  // Return a object with the x and y coordinates of the intersection
	let x = x1 + ua * (x2 - x1)
	let y = y1 + ua * (y2 - y1)

	return {x, y}
}

Raycaster.DEBUG = null;
Raycaster.TOTAL_RAYS = null;
Raycaster.DEBUG_MODE = false;

// module.exports = RayCaster;

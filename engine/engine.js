Number.prototype.toRad = function() {
  return this * (Math.PI/180);
}
Number.prototype.toDeg = function() {
  return this * (180/Math.PI);
}
Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
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
      color:"rgba(255,255,255,1)",
      render:true
    };
    for (let key in options) {
      if (key in this.options) {
        this.options[key] = options[key];
      }
    }
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
    Raycaster.DEBUG.physics.arcade.velocityFromAngle(this.angle,speed,this.body.velocity);
  }
}

class Entity extends PlanarObject {
  /*
  Native renderable object with camera - has the capability to cast rays and move

  @param {int} x - Initial x-axis coordinate
  @param {int} y - Initial y=axis coordinate
  @param {int} width - Width of the Entity
  @param {int} height - Height of the Entity
  @param {Boolean} hasCamera - When false, the Entity will cast out 0 rays
  @param {Object} data - Data regarding the behavior of the Entity
  @param {int} data.fov - Fov in degrees of Entity (<=0 if the Entity does not cast rays)
  @param {int} data.speed - Speed of Entity in pixels per (second squared)
  @param {int} data.lookSpeed - Speed at which Entity turns in degrees/radians per second squared (varies depending on version of Phaser)
  @param {int} [data.angle=0] - Initial angle that the Entity faces
  @param {Object} options - Additional PLanarObject options
  @param {String} options.color - CSS color string of the Entity given a texture is not present
  @param {Boolean} options.render - Boolean governing whether or not the object will be rendered
  */
  constructor(x,y,width,height,hasCamera,data,options={},angle=0) {
    super(x,y,x+width,y,height,options);
    // this.rotate(angle,true);

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
  }

  handleInput() {
    /*
    Should be overloaded in order to handle input of the Entity
    */
  }

  castRays() {
    if (!this.hasCamera) return;
    this.rays.length = 0; //empty ray array
    // for (let i=0;i<Raycaster.TOTAL_RAYS;i++) {
    //   let fovAngle = ((i/Raycaster.TOTAL_RAYS)*this.fov)-(this.fov/2);
    //   let angle = (this.angle.toDeg() - 90) + fovAngle;
    //   let ray = new Ray(this.sprite.body.center.x,this.sprite.body.center.y,angle.toRad(),Entity.RENDER_DISTANCE);
    //   this.rays.push(ray);
    // }

    //distToProjSurface = total_rays/2 / tan(half_of_fov_in_rad)
    let distToProjSurface = (Raycaster.TOTAL_RAYS/2) / Math.tan((this.fov/2).toRad());
    for (let x=0;x<Raycaster.TOTAL_RAYS;x++) {
      let angle = Math.atan((x-(Raycaster.TOTAL_RAYS/2)) / distToProjSurface);
      angle += (this.sprite.angle).toRad();
      // angle += x/this.totalRays;
      let ray = new Ray(this.sprite.body.center.x,this.sprite.body.center.y,angle,Entity.RENDER_DISTANCE);
      this.rays.push(ray);
    }
  }

  turn(dir) {
    let ang = dir*this.lookSpeed;
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

  renderSky(color="#63b9ff") {
    game.debug.geom(new Phaser.Rectangle(0,0,game.world.width,game.world.height/2),color);
  }

  renderGround(color="#e2e2e2") {
    game.debug.geom(new Phaser.Rectangle(0,game.world.height/2,game.world.width,game.world.height/2),color);
  }

  renderPerspective(game) {
    let points = [];
    this.rays.forEach((ray,i) => {
      ray.collisions.slice().sort((c1,c2) => Math.sqrt((c2.p.x-ray.origin.x)**2 + (c2.p.y-ray.origin.y)**2) - Math.sqrt((c1.p.x-ray.origin.x)**2 + (c1.p.y-ray.origin.y)**2)).forEach((col,n) => {
        let collision = col.p;
        let collisionObject = col.obj;


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
        points.push(new Phaser.Line(column.x,column.y,column.x+column.width,column.y+column.height));
        game.debug.geom(column,color);
      });
    });
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
  }
}

Entity.RENDER_DISTANCE = 800;

class Raycaster {
  /*
  Main class used to perform update logic and handle the game state

  @param {int} width - Width in pixels of game instances
  @param {int} height - Height in pixels of game instances
  @param {string | HTMlElement} parent - Parent element that game instances will be created within
  @param {int} [totalRays=null] - Total amount of rays that are cast out by an Entity
    Recommended to be left as null as it uses it will use the width of the game instances
    Can be reduced or increased to increase or reduce fps respectively
  */
  constructor(width,height,parent,totalRays=null,debug=false) {
    Raycaster.DEBUG_MODE = debug;
    Raycaster.TOTAL_RAYS = typeof totalRays === "undefined" || totalRays === null || totalRays === undefined ? width : totalRays;

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

  createGame(g) {
    if (Raycaster.DEBUG_MODE) {
      let preload = g.preload;
      g.preload = (...args) => {
        preload(args);
        g.time.advancedTiming = true;
      }
      let render = g.render;
      g.render = (...args) => {
        render(args);
        this.renderDebug();
      }
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
        // console.log(obj.sprite.angle,obj.angle);
        obj.rotate(((90).toRad()+obj.sprite.angle.toRad())-obj.angle);
        obj.center();
        obj.castRays();
      }
    });

    this.handleRays();
  }

  handleRays() {
    this.objects.forEach(obj => {
      if (obj instanceof Entity) {
        obj.handleInput();
        obj.rays.forEach(ray => {
          // Raycaster.DEBUG.debug.geom(ray);
          this.objects.forEach(colObj => {
            if (colObj === obj || !colObj.options.render) return;
            let intersection = ray.intersects(colObj);
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
    if (Raycaster.DEBUG_MODE) {
      this.objects.forEach(obj => {
        if (obj instanceof PlanarObject) {
          Raycaster.DEBUG.debug.geom(obj,obj.options.color);
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
        [...this.gameInstances,Raycaster.DEBUG].forEach(instance => {
          instance.debug.text(instance.time.fps,25,25,"#00ff00");
        });
      });
    }
  }
}

Raycaster.DEBUG = null;
Raycaster.TOTAL_RAYS = null;
Raycaster.DEBUG_MODE = false;

Phaser.Plugin.Raycaster = Raycaster;
// module.exports = RayCaster;

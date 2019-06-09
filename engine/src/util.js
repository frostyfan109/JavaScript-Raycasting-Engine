import Color from './color';
import { MouseError } from './errors';

export function scale(num, inMin, inMax, outMin, outMax) {
  return (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/*
  Data map is in the format:
[
  [
    [2, 1, 0],
    [1, 1, 0],
    [1, 0, 2]
  ],
  {
    0: {
      object: Wall,
      arguments: [{height:2}]
    },
    1: {
      object: Wall,
      arguments: [{texture:'foo'}]
    },
    2: {
      object: CustomWall,
      arguments: []
    },
  }
]
NOTE: Values in first array may also be arrays in the format of [value, arguments] to override the predefined arguments for said value.
NOTE: This format also inherently supports other data types such as strings instead of numbers to serve as instances. This may be more clear if desired.
NOTE: Arguments passed to each class reference will go:
  "(raycaster instance, x1, y1, x2, y2, ...args)"
  If the class instance's constructor doesn't comply with this format, you may instead pass in a helper function to construct the instance:
  // NOTE: This format also be helpful in the instantiation of new arguments every time (instead of reusing the same preinstantiated object)
    [
      0: {
        helper: function(raycaster, x1, y1, x2, y2) {
          return new CustomWall(raycaster, x1, y1, x2, y2, {texture:'bar'})
        }
      }
    ]
*/
export const MapBuilder = {
  build(raycaster, dataMap, xDimensions, yDimensions) {
    const map = [];
    const height = raycaster.worldHeight / Math.max(yDimensions, dataMap[0].length);
    for (let yInd = 0; yInd < dataMap[0].length; yInd++) {
      const width = raycaster.worldWidth / Math.max(xDimensions, dataMap[0][yInd].length);
      for (let xInd = 0; xInd < dataMap[0][yInd].length; xInd++) {
        let type = dataMap[0][yInd][xInd];
        let object;
        const x1 = width * xInd;
        const x2 = x1 + width;
        const y1 = height * yInd;
        const y2 = y1 + height;


        let args;

        if (typeof type === "undefined" || type === null || type === undefined) {
          continue;
        }

        if (Array.isArray(type)) {
          [type, ...args] = type;
        }

        const data = dataMap[1][type];

        if (typeof data === "undefined" || data === null || data === undefined) {
          continue;
        }

        if (typeof args === 'undefined') args = Object.prototype.hasOwnProperty.call(data, 'arguments') ? data.arguments : [];

        if (Object.prototype.hasOwnProperty.call(data, 'helper')) {
          object = data.helper(raycaster, x1, y1, x2, y2);
        } else {
          // eslint-disable-next-line new-cap
          object = new data.object(raycaster, x1, y1, x2, y2, ...args);
        }
        map.push(object);
        // super(raycaster,x,y,x2,y2,height,options);
      }
    }
    return map;
  },
  loadFromFile(file) {
    // TODO

  },
};

/**
 * Minimap utility class
 *
 * @param {PlanarObject} object - The object that the minimap is rendered relative to. May be reassigned at any point.
 * @param {number} x - X-axis coordinate in which the minimap will be rendered onto the screen;
 * @param {number} y - Y-axis coordinate in which the minimap will be rendered onto the screen;
 * @param {number} width - The width of the minimap in pixels.
 * @param {number} height - The height of the minimap in pixels.
 * @param {number|null} [viewWidth=null] - The amount of in-game width rendered on the minimap. Default shows the entire map.
 * @param {number|null} [viewHeight=null] - The amount of in-game height rendered on the minimap. Default shows the entire map.
 * @param {object} [options={}] - Additional options.
 * @param {Color} [options.backgroundColor=new Color(80,80,80,1)] - Background color of the Minimap.
 * @param {Color} [options.borderColor=new Color(50,50,50,1)] - Border color of the Minimap.
 * @param {number} [options.borderWidth=0] - Width of the Minimap's border.
 *
 */
export class Minimap {
  constructor(object, x, y, width, height, viewWidth=null, viewHeight=null, options={}) {
    this.object = object;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;

    this.options = {
      backgroundColor:new Color(80,80,80,1),
      borderColor:new Color(50,50,50,1),
      borderWidth:0
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
  }
  /**
   * Method for rendering the minimap onto the screen
   */
  render() {
    let ctx = this.object.game.canvas.getContext('2d');
    let gameWidth = this.object.raycaster.worldWidth;
    let gameHeight = this.object.raycaster.worldHeight;
    if (this.borderWidth !== 0) {
      ctx.fillStyle = this.borderColor.toCSSString();
      ctx.fillRect(this.x-this.borderWidth,this.y-this.borderWidth,this.width+(this.borderWidth*2),this.height+(this.borderWidth*2));
    }
    ctx.fillStyle = this.backgroundColor.toCSSString();
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.beginPath();
    this.object.raycaster.objects.forEach((obj,i) => {
      let color = obj.color.toCSSString();
      let startX = this.x + this.width * (obj.start.x / gameWidth);
      let startY = this.y + this.height * (obj.start.y / gameHeight);
      let endX = this.x + this.width * (obj.end.x / gameWidth);
      let endY = this.y + this.height * (obj.end.y / gameHeight);
      ctx.strokeStyle = color;
      ctx.moveTo(startX,startY);
      ctx.lineTo(endX,endY);
    });
    ctx.closePath();
    ctx.stroke();
  }
}

export function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);

  return { x, y };
}

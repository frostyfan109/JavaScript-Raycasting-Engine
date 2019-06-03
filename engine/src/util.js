export function rgbToHex(r, g, b) {
  return (
    (1 << 24) // eslint-disable-line no-bitwise
    + (r << 16) // eslint-disable-line no-bitwise
    + (g << 8) // eslint-disable-line no-bitwise
    + b
  ).toString(16).slice(1);
}


/**
 * Native color class used in engine, in the format rgba.
 * Note: Alpha is supported, but, when used in large quantities, may result in significant loss of performance.
 */
export class Color {
  constructor(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  toHex() {
    return parseInt(rgbToHex(this.r, this.g, this.b), 16);
  }

  toCSSString() {
    return `rgba(${this.r},${this.g},${this.b},${this.a})`;
  }
}

export function requestPointerLock(game) {
  game.input.mouse.requestPointerLock();
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

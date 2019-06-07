export default class Keyboard {
  constructor() {
    this.enabled = true;
    this._keysDown = {};
    window.onkeydown = (e) => {
      // Store relevant properties from the event
      this._keysDown[e.keyCode] = {
        location: e.location,
      };
    }
    window.onkeyup = (e) => {
      this._keysDown[e.keyCode] = false;
    }
  }
  isDown(keyCode) {
    return !this.enabled ? false : this._keysDown[keyCode];
  }
  /**
   * Add a key object
   *
   * @param {int} keyCode - The key code for the key. For ease of use, the Key class contains mappings for all these keys.
   */
  addKey(keyCode) {
    return new Key(this, keyCode);
  }
  addKeys(keyCodes) {
    keyCodes.forEach((keyCode) => this.addKey(keyCode));
  }
}

export class Key {
  constructor(keyboard, keyCode) {
    this.keyboard = keyboard;
    this.keyCode = keyCode;
  }
  get isDown() {
    return this.keyboard.isDown(this.keyCode);
  }
}

Key.ZERO = 48;
Key.ONE = 49;
Key.TWO = 50;
Key.THREE = 51;
Key.FOUR = 52;
Key.FIVE = 53;
Key.SIX = 54;
Key.SEVEN = 55;
Key.EIGHT = 56;
Key.NINE = 57;
Key.A = 65;
Key.ADD = 107;
Key.ALT = 18;
Key.B = 66;
Key.BACKSPACE = 8;
Key.BACK_SLASH = 220;
Key.C = 67;
Key.CAPS_LOCK = 20;
Key.CLOSE_BRAKET = 221;
Key.COMMA = 188;
Key.CTRL = 17;
Key.D = 68;
Key.DASH = 189;
Key.DECIMAL_POINT = 110;
Key.DELETE = 46;
Key.DIVIDE = 111;
Key.DOWN_ARROW = 40;
Key.E = 69;
Key.END = 35;
Key.ENTER = 13;
Key.EQUAL_SIGN = 187;
Key.ESCAPE = 27;
Key.F = 70;
Key.F1 = 112;
Key.F2 = 113;
Key.F3 = 114;
Key.F4 = 115;
Key.F5 = 116;
Key.F6 = 117;
Key.F7 = 118;
Key.F8 = 119;
Key.F9 = 120;
Key.F10 = 121;
Key.F11 = 122;
Key.F12 = 123;
Key.FORWARD_SLASH = 191;
Key.G = 71;
Key.GRAVE_ACCENT = 192;
Key.H = 72;
Key.HOME = 36;
Key.I = 73;
Key.INSERT = 45;
Key.J = 74;
Key.K = 75;
Key.L = 76;
Key.LEFT_ARROW = 37;
Key.LEFT_WINDOW_KEY = 91;
Key.M = 77;
Key.MULTIPLY = 106;
Key.N = 78;
Key.NUMPAD_0 = 96;
Key.NUMPAD_1 = 97;
Key.NUMPAD_2 = 98;
Key.NUMPAD_3 = 99;
Key.NUMPAD_4 = 100;
Key.NUMPAD_5 = 101;
Key.NUMPAD_6 = 102;
Key.NUMPAD_7 = 103;
Key.NUMPAD_8 = 104;
Key.NUMPAD_9 = 105;
Key.NUM_LOCK = 144;
Key.O = 79;
Key.OPEN_BRACKET = 219;
Key.P = 80;
Key.PAGE_DOWN = 34;
Key.PAGE_UP = 33;
Key.PAUSE_BREAK = 19;
Key.PERIOD = 190;
Key.Q = 81;
Key.R = 82;
Key.RIGHT_ARROW = 39;
Key.RIGHT_WINDOW_KEY = 92;
Key.S = 83;
Key.SCROLL_LOCK = 145;
Key.SELECT_KEY = 93;
Key.SEMI_COLON = 186;
Key.SHIFT = 16;
Key.SINGLE_QUOTE = 222;
Key.SPACE = 32;
Key.SUBTRACT = 109;
Key.T = 84;
Key.TAB = 9;
Key.U = 85;
Key.UP_ARROW = 38;
Key.V = 86;
Key.W = 87;
Key.X = 88;
Key.Y = 89;
Key.Z = 90;

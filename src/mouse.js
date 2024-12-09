import { MouseError } from './errors';
export default class Mouse {
  constructor(game) {
    this.game = game;
    this._active = false;
    this._moveCallback = () => {};
    this._downCallback = () => {};
    this._upCallback = () => {};

    this._setup();
  }
  /**
   * Sets the callback to be invoked when the mouse moves
   *
   * @param {function|null} callback - Callback to be invoked
   * @param {object|null} context - Context bound to the callback
   */
  setMoveCallback(callback, context) {
    if (callback === null) {
      callback = () => {};
    }
    this._moveCallback = callback.bind(context);
  }
  /**
   * Sets the callback to be invoked when the mouse is pressed
   *
   * @param {function|null} callback - Callback to be invoked
   * @param {object|null} context - Context bound to the callback
   */
  setDownCallback(callback, context) {
    if (callback === null) {
      callback = () => {};
    }
    this._downCallback = callback.bind(context);
  }
  /**
   * Sets the callback to be invoked when the mouse moves
   *
   * @param {function|null} callback - Callback to be invoked
   * @param {object|null} context - Context bound to the callback
   */
  setUpCallback(callback, context) {
    if (callback === null) {
      callback = () => {};
    }
    this._upCallback = callback.bind(context);
  }
  /**
   * When called, the mouse will begin to invoke callbacks
   */
  start() {
    this._active = true;
  }

  /**
   * When called, the mouse will cease to invoke callbacks
   */
  stop() {
    this._active = false;
  }
  /**
   * Internal method that sets up the mouse.
   */
  _setup() {
    this.game.canvas.addEventListener('mousedown', (e) => {
      this._requestPointerLock();
      if (this._active) this._downCallback(e);
    });
    this.game.canvas.addEventListener('mouseup', (e) => {
      if (this._active) this._upCallback(e);
    });
    this.game.canvas.addEventListener('mousemove', (e) => {
      if (this._active) this._moveCallback(e);
    });
    // game.input.addMoveCallback((pointer, x, y, click) => { this.mouseMove(game, pointer, x, y, click); }, this);
  }
  /**
   * Internal method that ensures that compatible browsers utilize the pointer lock API.
   *
   * @returns {boolean} - If the browser supports the pointer lock API or not.
   */
   _requestPointerLock() {
     this.game.canvas.requestPointerLock = this.game.canvas.requestPointerLock || this.game.canvas.mozRequestPointerLock || this.game.canvas.webkitRequestPointerLock;
     if (this.game.canvas.requestPointerLock) {
       this.game.canvas.requestPointerLock();
       return true;
     }
     else {
       console.warn(new MouseError("Browser does not support mouse"));
       return false;
     }
   }
}

export class BoundsError extends Error {
  constructor(...args) {
    super(...args);
    this.name = this.constructor.name;
  }
}
export class LoadError extends Error {
  constructor(...args) {
    super(...args);
    this.name = this.constructor.name;
  }
}
export class CacheError extends Error {
  constructor(...args) {
    super(...args);
    this.name = this.constructor.name;
  }
}

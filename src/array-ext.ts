declare interface Array<T> {
  first(): T;
  last(): T;
}

/**
 * @external Array
 */

/**
 * Array
 * @class Array
 */

/**
 * Returns first element of array.
 */
Array.prototype.first = function () {
  return this[0];
};

/**
 * Returns last element of array.
 */
Array.prototype.last = function () {
  return this[this.length - 1];
};

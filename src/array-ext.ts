declare interface Array<T> {
  first(): T;
  last(): T;
  toSource(options?: { fixIndent: boolean }): string;
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

/**
 * Get the source code of the array of nodes.
 * @example
 * // source code of node array are
 * // const foo = function () {}
 * // const bar = function () {}
 * array.toSource()
 * @param {Object} options - default is { fixIndent: false }, if to fix indent
 * @returns {string} source code.
 */
Array.prototype.toSource = function (options = { fixIndent: false }) {
  if (options.fixIndent) {
    const indent = this.first().indent();
    return this.toSource()
      .split("\n")
      .map((line, index) => {
        if (index === 0 || line === "") {
          return line;
        } else {
          const index = line.search(/\S|$/);
          return index < indent ? line.slice(index) : line.slice(indent);
        }
      })
      .join("\n");
  } else {
    return this.first()
      .fileContent()
      .slice(this.first().start, this.last().end);
  }
};

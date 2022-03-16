Array.prototype.first = function () {
  return this[0];
};

Array.prototype.last = function () {
  return this[this.length - 1];
};

/**
 * Get the source code of the array of nodes.
 *
 * @param {Object} options - { fixIndent: false } if fix indent
 * @returns {string} source code.
 */
Array.prototype.toSource = function (options = {}) {
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
    return this.first()._fileContent().slice(this.first().start, this.last().end);
  }
};

Array.prototype.fixIndentToSource = function () {
  console.log("fixIndentToSource has been removed, please use toSource({ fixIndent: true }) instead");
}

Array.prototype.first = function () {
  return this[0];
};

Array.prototype.last = function () {
  return this[this.length - 1];
};

Array.prototype.toSource = function () {
  return this.first()._fileContent().slice(this.first().start, this.last().end);
};

Array.prototype.fixIndentToSource = function () {
  const indent = this.first().indent();
  return this.toSource()
    .split("\n")
    .map((line, index) => {
      if (index === 0 || line === '') {
        return line;
      } else {
        const index = line.search(/\S|$/);
        return index < indent ? line.slice(index) : line.slice(indent);
      }
    })
    .join("\n");
};

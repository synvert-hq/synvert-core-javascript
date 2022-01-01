Array.prototype.first = function () {
  return this[0];
};

Array.prototype.last = function () {
  return this[this.length - 1];
};

Array.prototype.toSource = function () {
  return ' '.repeat(this.first().loc.start.column) + this.first()._fileContent().slice(this.first().start, this.last().end);
};

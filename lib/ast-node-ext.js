const fs = require('fs');
const { Node } = require("acorn");
const visitorKeys = require("eslint-visitor-keys");
const { t } = require('typy');

const np = Node.prototype;

np.name = function() {
  if (["ClassDeclaration", "FunctionDeclaration"].includes(this.type)) {
    return this.id.name;
  }
}

np.childNodeRange = function(childName) {
  const childNode = this[childName];
  return [childNode.start, childNode.end];
}

np.recursiveChildren = function(func) {
  visitorKeys.KEYS[this.type].forEach(key => {
    if (Array.isArray(this[key])) {
      this[key].forEach((child) => {
        func(child);
        child.recursiveChildren(func);
      });
    } else {
      const child = this[key];
      if (child) {
        func(child);
        child.recursiveChildren(func);
      }
    }
  });
}

np.toSource = function() {
  return this._fileContent().slice(this.start, this.end)
}

np.rewrittenSource = function(code) {
  const self = this;
  return code.replace(/{{(.*?)}}/mg, function(string, match, offset) {
    if (match && t(self, match).isDefined) {
      const obj = t(self, match).safeObject
      if (Array.isArray(obj)) {
        return self._fileContent().slice(obj[0].start, obj[obj.length - 1].end)
      }
      if (obj.name) {
        return obj.name
      } else {
        obj
      }
    } else {
      return code
    }
  });
}

np._fileContent = function() {
  return fs.readFileSync(this.loc.source, 'utf-8')
}
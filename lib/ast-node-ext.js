const fs = require('fs');
const { Node } = require("acorn");
const visitorKeys = require("eslint-visitor-keys");
const { t } = require('typy');
const flatten = require('flat');

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

np.match = function(rules) {
  const self = this;
  return Object.keys(flatten(rules)).every(multi_key => {
    const actual = t(self, multi_key).safeObject;
    const expected = t(rules, multi_key).safeObject;
    return self._matchValue(actual, expected);
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

np._matchValue = function(actual, expected) {
  return actual === expected;
}

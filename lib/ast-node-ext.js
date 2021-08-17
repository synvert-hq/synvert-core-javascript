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
  const body = fs.readFileSync(this.loc.source, 'utf-8')
  return body.slice(this.start, this.end)
}

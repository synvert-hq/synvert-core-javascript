const { Node } = require("acorn");
const visitorKeys = require("eslint-visitor-keys");

const np = Node.prototype;

np.name = function() {
  if (this.type === "ClassDeclaration") {
    return this.id.name;
  }
}

np.recursive_children = function(func) {
  visitorKeys.KEYS[this.type].forEach(key => {
    if (Array.isArray(this[key])) {
      this[key].forEach((child) => {
        func(child);
        child.recursive_children(func);
      });
    } else {
      const child = this[key];
      if (child) {
	func(child);
	child.recursive_children(func);
      }
    }
  });
}
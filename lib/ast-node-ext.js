const fs = require('fs');
const { Node } = require("acorn");
const visitorKeys = require("eslint-visitor-keys");
const { t } = require('typy');
const flatten = require('flat');

const np = Node.prototype;

/**
 * Get the source range of child node.
 *
 * @param {string} childName - name of child node.
 * @returns {Object} child node range, e.g. { start: 0, end: 10 }
 */
np.childNodeRange = function(childName) {
  const childNode = this[childName];
  return { start: childNode.start, end: childNode.end };
}

/**
 * Recursively iterate all child nodes of current node.
 *
 * @param {Function} func - to be called on the child node.
 */
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

/**
 * Match current node with rules.
 *
 * @param {Object} rules
 * @returns true if matches.
 */
np.match = function(rules) {
  const self = this;
  return Object.keys(flatten(rules)).every(multi_key => {
    const actual = t(self, multi_key).safeObject;
    const expected = t(rules, multi_key).safeObject;
    return self._matchValue(actual, expected);
  });
}

/**
 * Get the source code of current node.
 *
 * @returns {string} source code.
 */
np.toSource = function() {
  return this._fileContent().slice(this.start, this.end)
}

/**
 * Get rewritten source code.
 *
 *   node.rewrittenSource("{{expression.callee.object}}.slice({{expression.arguments}})") #=> "foo.slice(1, 2)"
 *
 * @returns {string} rewritten code.
 */
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

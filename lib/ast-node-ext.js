require("./array-ext");
const fs = require("fs");
const { Node } = require("acorn");
const visitorKeys = require("eslint-visitor-keys");
const { t } = require("typy");
const flatten = require("flat");

const np = Node.prototype;

/**
 * Get the source range of child node.
 *
 * @param {string} childName - name of child node.
 * @returns {Object} child node range, e.g. { start: 0, end: 10 }
 */
np.childNodeRange = function (childName) {
  if (this.type === "MethodDefinition" && childName === "async") {
    return { start: this.start, end: this.key.start };
  } else if (this.type === "MemberExpression" && childName === "dot") {
    return { start: this.property.start - 1, end: this.property.start };
  } else if (["MemberExpression", "CallExpression"].includes(this.type) && childName === "arguments") {
    if (this.arguments && this.arguments.length > 0) {
      return { start: this.arguments[0].start - 1, end: this.arguments[this.arguments.length - 1].end + 1 };
    } else {
      return { start: this.end - 2, end: this.end };
    }
  } else {
    const [directChildName, ...nestedChildName] = childName.split(".");
    if (this[directChildName]) {
      const childNode = this[directChildName];

      if (nestedChildName.length > 0) {
        return childNode.childNodeRange(nestedChildName.join("."));
      }

      if (childNode) {
        return { start: childNode.start, end: childNode.end };
      }
    }

    throw new NotSupportedError(`childNodeRange is not handled for ${this}, child name: ${childName}`);
  }
};

/**
 * Recursively iterate all child nodes of current node.
 *
 * @param {Function} func - to be called on the child node.
 */
np.recursiveChildren = function (func) {
  visitorKeys.KEYS[this.type].forEach((key) => {
    if (Array.isArray(this[key])) {
      this[key].forEach((child) => {
        if (child) {
          func(child);
          child.recursiveChildren(func);
        }
      });
    } else {
      const child = this[key];
      if (child) {
        func(child);
        child.recursiveChildren(func);
      }
    }
  });
};

/**
 * Array body nodes.
 *
 * @returns {Array} array of body nodes
 */
np.arrayBody = function () {
  switch (this.type) {
    case 'ClassDefinition':
      return this.body.body;
    case 'MethodDefinition':
      return this.value.body.body;
    default:
      return this.body;
  }
};

/**
 * Match current node with rules.
 *
 * @param {Object} rules
 * @returns true if matches.
 */
np.match = function (rules) {
  let actual, expected;
  return Object.keys(flatten(rules)).every((multiKey) => {
    const keys = multiKey.split(".");
    const lastKey = keys.last();
    switch (lastKey) {
      case "not":
        actual = this.actualValue(keys.slice(0, -1));
        expected = t(rules, multiKey).safeObject;
        return !this._matchValue(actual, expected);
      default:
        actual = this.actualValue(keys);
        expected = t(rules, multiKey).safeObject;
        return this._matchValue(actual, expected);
    }
  });
};

/**
 * Get the source code of current node.
 *
 * @returns {string} source code.
 */
np.toSource = function () {
  return this._fileContent().slice(this.start, this.end);
};

/**
 * Get the column of current node.
 *
 * @returns {number} column.
 */
np.column = function () {
  return this.loc.start.column;
};

/**
 * Get rewritten source code.
 *
 *   node.rewrittenSource("{{expression.callee.object}}.slice({{expression.arguments}})") #=> "foo.slice(1, 2)"
 *
 * @returns {string} rewritten code.
 */
np.rewrittenSource = function (code) {
  return code.replace(/{{(.*?)}}/gm, (_string, match, _offset) => {
    if (!match) return null;

    const obj = this.actualValue(match.split("."));
    if (obj) {
      if (Array.isArray(obj)) {
        return this._fileContent().slice(obj[0].start, obj[obj.length - 1].end);
      }
      if (obj.hasOwnProperty("name")) {
        return obj.name;
      } else {
        return obj;
      }
    } else {
      return code;
    }
  });
};

/**
 * Get actual value from the node.
 *
 * @param {Array} multiKeys - multi keys to find value.
 * @returns {Object} actual value.
 */
np.actualValue = function (multiKeys) {
  let childNode = this;
  multiKeys.forEach((key) => {
    if (!childNode) return;

    if (childNode.hasOwnProperty(key)) {
      childNode = childNode[key];
    } else if (typeof childNode[key] === "function") {
      childNode = childNode[key].call(childNode);
    } else {
      childNode = null;
    }
  });
  return childNode;
};

np._fileContent = function () {
  return fs.readFileSync(this.loc.source, "utf-8");
};

np._matchValue = function (actual, expected) {
  if (actual === expected) return true;
  if (!actual) return false;
  if (actual.hasOwnProperty("name") && actual.name === expected) return true;
  if (actual.type === "ThisExpression" && expected === "this") return true;
  if (typeof actual === "string" && expected instanceof RegExp) return expected.test(actual);
  return false;
};

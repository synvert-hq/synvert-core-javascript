require("./array-ext");
const fs = require("fs");
const { Node } = require("acorn");
const visitorKeys = require("eslint-visitor-keys");
const { t } = require("typy");
const flatten = require("flat");
const { NotSupportedError } = require("./error");

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
  } else if (this.type === "FunctionExpression" && childName === "params") {
    if (this.params && this.params.length > 0) {
      return { start: this.params[0].start - 1, end: this.params[this.params.length - 1].end + 1 };
    } else {
      return { start: this.end - 2, end: this.end };
    }
  } else if (this.type === "ImportDeclaration" && childName === "specifiers") {
    return { start: this.start + this.toSource().indexOf("{"), end: this.start + this.toSource().indexOf("}") + 1 };
  } else if (this.type === "Property" && childName === "semicolon") {
    return { start: this.key.end, end: this.key.end + 1 };
  } else {
    const [directChildName, ...nestedChildName] = childName.split(".");
    if (this[directChildName]) {
      const childNode = this[directChildName];

      if (Array.isArray(childNode)) {
        const [childDirectChildName, ...childNestedChildName] = nestedChildName;
        if (childNestedChildName.length > 0) {
          return childNode[childDirectChildName].childNodeRange(childNestedChildName.join("."));
        } else if (typeof childNode[childDirectChildName] === "function") {
          return { start: childNode[childDirectChildName]().start, end: childNode[childDirectChildName]().end };
        } else if (childNode[childDirectChildName]) {
          return { start: childNode[childDirectChildName].start, end: childNode[childDirectChildName].end };
        } else {
          throw new NotSupportedError(`childNodeRange is not handled for ${this}, child name: ${childName}`);
        }
      }

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
    case "ClassDefinition":
      return this.body.body;
    case "MethodDefinition":
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
  const KEYWORDS = ["not", "in", "notIn", "gt", "gte", "lt", "lte"];
  return Object.keys(flatten(rules, { safe: true })).every((multiKey) => {
    const keys = multiKey.split(".");
    const lastKey = keys.last();
    const actual = KEYWORDS.includes(lastKey) ? this.actualValue(keys.slice(0, -1)) : this.actualValue(keys);
    const expected = t(rules, multiKey).safeObject;
    switch (lastKey) {
      case "not":
        return !this._matchValue(actual, expected);
      case "in":
        return expected.some((expectedItem) => this._matchValue(actual, expectedItem));
      case "notIn":
        return expected.every((expectedItem) => !this._matchValue(actual, expectedItem));
      case "gt":
        return actual > expected;
      case "gte":
        return actual >= expected;
      case "lt":
        return actual < expected;
      case "lte":
        return actual <= expected;
      default:
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
 * Get the source code of child node.
 *
 * @param {string} childName - name of child node.
 * @returns {string} source code.
 */
np.childNodeSource = function (childName) {
  const { start, end } = this.childNodeRange(childName);
  return this._fileContent().slice(start, end);
};

/**
 * Get the source code of current node and fix indent.
 *
 * @returns {string} source code
 */
np.fixIndentToSource = function () {
  const indent = this.indent();
  return this.toSource()
    .split("\n")
    .map((line, index) => {
      if (index === 0 || line === "") {
        return line;
      } else {
        return line.slice(indent);
      }
    })
    .join("\n");
};

/**
 * Get the indent of current node.
 *
 * @returns {number} indent.
 */
np.indent = function () {
  return this._fileContent().split("\n")[this.loc.start.line - 1].search(/\S|$/);
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
      const result = obj.hasOwnProperty("name") ? obj.name : obj;
      if (result.hasOwnProperty("type")) {
        return result.toSource();
      } else {
        return result;
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
  if (actual.type === "Super" && expected === "super") return true;
  if (typeof actual === "string" && expected instanceof RegExp) return expected.test(actual);
  return false;
};

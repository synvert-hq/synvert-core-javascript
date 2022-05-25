import './array-ext';
import fs from "fs";
import { Node } from "acorn";
import { KEYS } from "eslint-visitor-keys";
import { t } from "typy";
import flatten from "flat";
import { NotSupportedError } from "./error";
import { NodeArrayExt, NodeExt } from "./types/node-ext";

declare module "acorn" {
  interface Node {
    fileSourceCode: string; // private modifier

    childNodeRange: (childNodeName: string) => { start: number, end: number };
    recursiveChildren: (func: (childNode: acorn.Node) => void) => void;
    arrayBody: () => acorn.Node[];
    match: (rules: any) => boolean;
    childNodeSource: (childName: string) => string;
    toSource(options?: { fixIndent: boolean }): string;
    indent: () => number;
    rewrittenSource: (code: string) => string;
    actualValue: (keys: string[]) => any;
    fileContent: () => string;
    matchValue: (actual: any, expected: any) => boolean;
  }
}

/**
 * @external Node
 * @see https://github.com/acornjs/acorn/blob/master/acorn/src/node.js
 */

/**
 * Node
 * @class Node
 */

/**
 * Rules
 *
 * Synvert compares acorns nodes with attributes, e.g. `type`, `property` and `arguments`,
 * it matches only when all of attributes match.
 *
 * // matches .trimleft()
 * { type: "CallExpression", callee: { type: "MemberExpression", property: "trimLeft" }, arguments: { length: 0 } }
 *
 * Source Code to acorn Node
 * @see https://synvert-playground.xinminlabs.com/javascript
 */

/**
 * Get the source range of child node.
 * @param {string} childName - name of child node.
 * @returns {Object} child node range, e.g. { start: 0, end: 10 }
 * @throws {NotSupportedError} if we can't get the range.
 */
Node.prototype.childNodeRange = function (this: any, childName) {
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
  } else if (this.type === "ClassDeclaration" && childName === "class") {
    return { start: this.start, end: this.start + 5 };
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
      const childNode: NodeExt = this[directChildName];

      if (Array.isArray(childNode)) {
        const [childDirectChildName, ...childNestedChildName] = nestedChildName;
        const childChildNode = childNode[childDirectChildName] as NodeExt;

        if (childNestedChildName.length > 0) {
          return childChildNode.childNodeRange(childNestedChildName.join("."));
        } else if (!Number.isNaN(childDirectChildName)) {
          if (childChildNode) {
            return { start: childChildNode.start, end: childChildNode.end };
          } else {
            // arguments.0 for func()
            return { start: this.end - 1, end: this.end - 1 };
          }
        } else {
          throw new NotSupportedError(`childNodeRange is not handled for ${this.toSource()}, child name: ${childName}`);
        }
      }

      if (nestedChildName.length > 0) {
        return childNode.childNodeRange(nestedChildName.join("."));
      }

      if (childNode) {
        return { start: childNode.start, end: childNode.end };
      }
    }

    throw new NotSupportedError(`childNodeRange is not handled for ${this.toSource()}, child name: ${childName}`);
  }
};

/**
 * Recursively iterate all child nodes of current node.
 * @param {Function} func - to be called on the child node.
 */
Node.prototype.recursiveChildren = function (this: any, func) {
  KEYS[this.type].forEach((key) => {
    if (Array.isArray(this[key])) {
      this[key].forEach((child: any) => {
        if (child) {
          func(child);
          child.recursiveChildren(func);
        }
      });
    } else {
      if (this[key]) {
        func(this[key]);
        this[key].recursiveChildren(func);
      }
    }
  });
};

/**
 * Array body nodes.
 * @returns {Node[]} array of body nodes
 */
Node.prototype.arrayBody = function (this: any) {
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
 * It provides some additional keywords to match rules, [not, in, notIn, gt, gte, lt, lte].
 * @example
 * { type: "ImportDeclaration", source: { value: "react" }, specifiers: { length: { not: 1 } } }
 * { type: "ImportDeclaration", source: { value: "react" }, specifiers: { length: { gt: 1 } } }
 * { type: "MemberExpression", object: { in: ["$", "jQuery"] }, property: "ajax" }
 * @param {Object} rules
 * @returns {boolean} true if matches.
 */
Node.prototype.match = function (rules) {
  const KEYWORDS = ["not", "in", "notIn", "gt", "gte", "lt", "lte"];
  return Object.keys(flatten(rules, { safe: true })).every((multiKey) => {
    const keys = multiKey.split(".");
    const lastKey = keys.last();
    const actual = KEYWORDS.includes(lastKey) ? this.actualValue(keys.slice(0, -1)) : this.actualValue(keys);
    const expected = t(rules, multiKey).safeObject;
    switch (lastKey) {
      case "not":
        return !this.matchValue(actual, expected);
      case "in":
        return expected.some((expectedItem: any) => this.matchValue(actual, expectedItem));
      case "notIn":
        return expected.every((expectedItem: any) => !this.matchValue(actual, expectedItem));
      case "gt":
        return actual > expected;
      case "gte":
        return actual >= expected;
      case "lt":
        return actual < expected;
      case "lte":
        return actual <= expected;
      default:
        return this.matchValue(actual, expected);
    }
  });
};

/**
 * Get the source code of child node.
 * @example
 * // source code of node is class FooBar {}
 * // FooBar
 * node.childNodeSource('id')
 * @param {string} childName - name of child node.
 * @returns {string} source code.
 */
Node.prototype.childNodeSource = function (childName) {
  const { start, end } = this.childNodeRange(childName);
  return this.fileContent().slice(start, end);
};

/**
 * Get the source code of current node.
 * @example
 * // source code of node is
 * // class Button {
 * //   constructor(props) {
 * //     super(props)
 * //   }
 * // }
 * node.toSource()
 * @param {Object} options - default is { fixIndent: false }, if to fix indent
 * @returns {string} source code.
 */
Node.prototype.toSource = function (options = { fixIndent: false }) {
  if (options.fixIndent) {
    const indent = this.indent();
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
    return this.fileContent().slice(this.start, this.end);
  }
};

/**
 * Get the indent of current node.
 * @returns {number} indent.
 */
Node.prototype.indent = function () {
  return this.fileContent().split("\n")[this.loc!.start.line - 1].search(/\S|$/);
};

/**
 * Get rewritten source code.
 * @example
 * // foo.slice(1, 2)
 * node.rewrittenSource("{{expression.callee.object}}.slice({{expression.arguments}})") #=>
 * @param {string} code - expression code
 * @returns {string} rewritten code.
 */
Node.prototype.rewrittenSource = function (code) {
  return code.replace(/{{([a-zA-z0-9\.]+?)}}/gm, (_string, match, _offset) => {
    if (!match) return null;

    const obj = this.actualValue(match.split("."));
    if (obj) {
      if (Array.isArray(obj)) {
        return this.fileContent().slice(obj[0].start, obj[obj.length - 1].end);
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
 * @example
 * // source code of node is foo.slice(1, 2)
 * // foo
 * node.actualValue(['expression', 'callee', 'object'])
 * @param {string[]} multiKeys - multiiple keys to find value.
 * @returns {*} actual value.
 */
Node.prototype.actualValue = function (this: any, multiKeys) {
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

/**
 * Get the source code of current file.
 * @returns {string} source code of current file.
 */
Node.prototype.fileContent = function () {
  if (!this.fileSourceCode) {
    this.fileSourceCode = fs.readFileSync(this.loc!.source!, "utf-8");
  }
  return this.fileSourceCode;
};

/**
 * Match the actual and expected value.
 * @param {*} actual
 * @param {*} expected
 * @returns {boolean} true if actual value matches expected value
 */
Node.prototype.matchValue = function (actual, expected) {
  if (actual === expected) return true;
  if (!actual) return false;
  if (actual.hasOwnProperty("name") && actual.name === expected) return true;
  if (actual.type === "ThisExpression" && expected === "this") return true;
  if (actual.type === "Super" && expected === "super") return true;
  if (expected instanceof RegExp) {
    if (typeof actual === "string") return expected.test(actual);
    if (typeof actual === "number") return expected.test(actual.toString());
    return expected.test(actual.toSource());
  }
  return false;
};

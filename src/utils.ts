import flatten from "flat";
import { t } from "typy";
import { Node } from "acorn";
import { getTargetNode } from "@xinminlabs/node-query";

/**
 * Add `count` spaces to `str`.
 * @example
 * //   foo
 * //   bar
 * indent("foo\nbar", 2)
 * @param {string} str
 * @param {number} count
 * @returns indented str
 */
export const indent = (str: string, count: number): string => {
  return str
    .split("\n")
    .map((line) => {
      if (/^\s*$/.test(line)) {
        return line;
      }
      return " ".repeat(count) + line;
    })
    .join("\n");
};

const KEYWORDS = ["not", "in", "notIn", "gt", "gte", "lt", "lte"];

export const matchRules = (node: Node, rules: object): boolean => {
  return Object.keys(flatten(rules, { safe: true })).every((multiKey) => {
    const keys = multiKey.split(".");
    const lastKey = keys.last();
    const actual = KEYWORDS.includes(lastKey)
      ? getTargetNode(node, keys.slice(0, -1).join("."))
      : getTargetNode(node, multiKey);
    const expected = t(rules, multiKey).safeObject;
    switch (lastKey) {
      case "not":
        return !matchValue(actual, expected);
      case "in":
        return expected.some((expectedItem: any) =>
          matchValue(actual, expectedItem)
        );
      case "notIn":
        return expected.every(
          (expectedItem: any) => !matchValue(actual, expectedItem)
        );
      case "gt":
        return (actual as any) > expected;
      case "gte":
        return (actual as any) >= expected;
      case "lt":
        return (actual as any) < expected;
      case "lte":
        return (actual as any) <= expected;
      default:
        return matchValue(actual, expected);
    }
  });
}

export const arrayBody = (node: any): Node[] => {
  switch (node.type) {
    case "ClassDefinition":
      return node.body.body;
    case "MethodDefinition":
      return node.value.body.body;
    default:
      return node.body;
  }
};

const matchValue = (actual: any, expected: any): boolean => {
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

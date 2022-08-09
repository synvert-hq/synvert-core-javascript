import { Node } from "acorn";

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

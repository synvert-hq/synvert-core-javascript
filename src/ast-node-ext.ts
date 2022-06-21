import fs from "fs";
import { Node } from "acorn";

declare module "acorn" {
  interface Node {
    fileSourceCode: string; // private modifier

    toSource(options?: { fixIndent: boolean }): string;
    indent: () => number;
    fileContent: () => string;
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
  return this.fileContent()
    .split("\n")
    [this.loc!.start.line - 1].search(/\S|$/);
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

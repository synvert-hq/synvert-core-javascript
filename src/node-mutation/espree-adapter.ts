import fs from "fs";
import { Adapter } from "@xinminlabs/node-mutation";

import type { NodeArrayExt, NodeExt } from "../types/node-ext";
import { NotSupportedError } from "../error";

/**
 * Implement node-query-typescript adapter
 * @see https://github.com/xinminlabs/node-query-typescript/blob/main/src/adapter.ts
 */
class EspreeAdapter implements Adapter<NodeExt> {
  // get node source
  getSource(node: NodeExt): string {
    const source = fs.readFileSync(node.loc!.source!, "utf-8");
    return source.slice(node.start, node.end);
  }

  /**
   * Get rewritten source code.
   * @example
   * // foo.slice(1, 2)
   * node.rewrittenSource("{{expression.callee.object}}.slice({{expression.arguments}})") #=>
   * @param {string} code - expression code
   * @returns {string} rewritten code.
   */
  rewrittenSource(node: NodeExt, code: string): string {
    return code.replace(
      /{{([a-zA-z0-9\.]+?)}}/gm,
      (_string, match, _offset) => {
        if (!match) return null;

        const obj = this.actualValue(node, match.split("."));
        if (obj) {
          if (Array.isArray(obj)) {
            return this.fileContent(node).slice(
              (obj[0] as NodeExt).start,
              (obj[obj.length - 1] as NodeExt).end
            );
          }
          const result = obj.hasOwnProperty("name") ? (obj as any).name : obj;
          if (result.hasOwnProperty("type")) {
            return this.getSource(result);
          } else {
            return result;
          }
        } else {
          return code;
        }
      }
    );
  }

  /**
   * Get the source code of current file.
   * @returns {string} source code of current file.
   */
  fileContent(node: NodeExt): string {
    return fs.readFileSync(node.loc!.source!, "utf-8");
  }

  /**
   * Get the source range of child node.
   * @param {string} childName - name of child node.
   * @returns {Object} child node range, e.g. { start: 0, end: 10 }
   * @throws {NotSupportedError} if we can't get the range.
   */
  childNodeRange(
    node: NodeExt,
    childName: string
  ): { start: number; end: number } {
    if (node.type === "MethodDefinition" && childName === "async") {
      return { start: node.start, end: (node.key as NodeExt).start };
    } else if (node.type === "MemberExpression" && childName === "dot") {
      return {
        start: (node.property as NodeExt).start - 1,
        end: (node.property as NodeExt).start,
      };
    } else if (
      ["MemberExpression", "CallExpression"].includes(node.type) &&
      childName === "arguments"
    ) {
      if (node.arguments && node.arguments.length > 0) {
        return {
          start: (node.arguments as NodeArrayExt)[0].start - 1,
          end:
            (node.arguments as NodeArrayExt)[
              (node.arguments as NodeArrayExt).length - 1
            ].end + 1,
        };
      } else {
        return { start: node.end - 2, end: node.end };
      }
    } else if (node.type === "ClassDeclaration" && childName === "class") {
      return { start: node.start, end: node.start + 5 };
    } else if (node.type === "FunctionExpression" && childName === "params") {
      if (node.params && node.params.length > 0) {
        return {
          start: (node.params as NodeArrayExt)[0].start - 1,
          end:
            (node.params as NodeArrayExt)[
              (node.params as NodeArrayExt).length - 1
            ].end + 1,
        };
      } else {
        return { start: node.end - 2, end: node.end };
      }
    } else if (
      node.type === "ImportDeclaration" &&
      childName === "specifiers"
    ) {
      return {
        start: node.start + this.getSource(node).indexOf("{"),
        end: node.start + this.getSource(node).indexOf("}") + 1,
      };
    } else if (node.type === "Property" && childName === "semicolon") {
      return {
        start: (node.key as NodeExt).end,
        end: (node.key as NodeExt).end + 1,
      };
    } else {
      const [directChildName, ...nestedChildName] = childName.split(".");
      if (node[directChildName]) {
        const childNode: NodeExt | NodeArrayExt = node[directChildName];

        if (Array.isArray(childNode)) {
          const [childDirectChildName, ...childNestedChildName] =
            nestedChildName;

          if (childNestedChildName.length > 0) {
            return this.childNodeRange(
              childNode[childDirectChildName] as NodeExt,
              childNestedChildName.join(".")
            );
          }

          if (typeof childNode[childDirectChildName] === "function") {
            const childChildNode = (
              childNode[childDirectChildName] as () => {
                start: number;
                end: number;
              }
            ).bind(childNode);
            return { start: childChildNode().start, end: childChildNode().end };
          } else if (!Number.isNaN(childDirectChildName)) {
            const childChildNode = childNode.at(
              Number.parseInt(childDirectChildName)
            ) as NodeExt;
            if (childChildNode) {
              return { start: childChildNode.start, end: childChildNode.end };
            } else {
              // arguments.0 for func()
              return { start: node.end - 1, end: node.end - 1 };
            }
          } else {
            throw new NotSupportedError(
              `childNodeRange is not handled for ${this.getSource(
                node
              )}, child name: ${childName}`
            );
          }
        }

        if (nestedChildName.length > 0) {
          return this.childNodeRange(childNode, nestedChildName.join("."));
        }

        if (childNode) {
          return { start: childNode.start, end: childNode.end };
        }
      }

      throw new NotSupportedError(
        `childNodeRange is not handled for ${this.getSource(
          node
        )}, child name: ${childName}`
      );
    }
  }

  getStart(node: NodeExt): number {
    return node.start;
  }

  getEnd(node: NodeExt): number {
    return node.end;
  }

  getStartLoc(node: NodeExt): { line: number; column: number } {
    const { line, column } = node.loc!.start;
    return { line, column };
  }

  getEndLoc(node: NodeExt): { line: number; column: number } {
    const { line, column } = node.loc!.end;
    return { line, column };
  }

  getIndent(node: NodeExt): number {
    return this.fileContent(node)
      .split("\n")
      [this.getStartLoc(node).line - 1].search(/\S|$/);
  }

  private actualValue(node: NodeExt, multiKeys: string[]): any {
    let childNode: any = node;
    multiKeys.forEach((key) => {
      if (!childNode) return;

      const child: any = childNode;
      if (childNode.hasOwnProperty(key)) {
        childNode = child[key];
      } else if (typeof child[key] === "function") {
        childNode = child[key].call(childNode);
      } else {
        childNode = null;
      }
    });
    return childNode;
  };
}

export default EspreeAdapter;

import fs from "fs";
import { KEYS } from "eslint-visitor-keys";
import { Adapter } from "@xinminlabs/node-query";

import type { NodeExt } from "../types/node-ext";

/**
 * Implement node-query-typescript adapter
 * @see https://github.com/xinminlabs/node-query-typescript/blob/main/src/adapter.ts
 */
class EspreeAdapter implements Adapter<NodeExt> {
  // get node type
  getNodeType(node: NodeExt): string {
    return node.type;
  }

  // get node source
  getSource(node: NodeExt): string {
    const source = fs.readFileSync(node.loc!.source!, "utf-8");
    return source.slice(node.start, node.end);
  }

  // get node children
  getChildren(node: NodeExt): NodeExt[] {
    const children: NodeExt[] = [];
    KEYS[node.type].forEach((key) => {
      const childNode = node[key];
      if (Array.isArray(childNode)) {
        childNode.forEach((child) => {
          if (child) {
            children.push(child);
          }
        });
      } else {
        if (childNode) {
          children.push(childNode);
        }
      }
    });
    return children;
  }

  // Espree doesn't support siblings.
  getSiblings(_node: NodeExt): NodeExt[] {
    return [];
  }
}

export default EspreeAdapter;

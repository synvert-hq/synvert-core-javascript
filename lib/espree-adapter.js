const fs = require("fs");
const visitorKeys = require("eslint-visitor-keys");

/**
 * Implement node-query-typescript adapter
 * @see https://github.com/xinminlabs/node-query-typescript/blob/main/src/adapter.ts
 */
class EspreeAdapter {
  // get node type
  getNodeType(node) {
    return node.type;
  }

  // get node source
  getSource(node) {
    const source = fs.readFileSync(node.loc.source, "utf-8");
    return source.slice(node.start, node.end);
  }

  // get node children
  getChildren(node) {
    const children = [];
    visitorKeys.KEYS[node.type].forEach((key) => {
      if (Array.isArray(node[key])) {
        node[key].forEach((child) => {
          if (child) {
            children.push(child);
          }
        });
      } else {
        const child = node[key];
        if (child) {
          children.push(child);
        }
      }
    });
    return children;
  }

  // Espree doesn't support siblings.
  getSiblings(_node) {
    return [];
  }
}

module.exports = EspreeAdapter;

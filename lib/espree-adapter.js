const visitorKeys = require("eslint-visitor-keys");

class EspreeAdapter {
  getNodeType(node) {
    return node.type;
  }

  getSource(node) {
    return node._fileContent().slice(node.start, node.end);
  }

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

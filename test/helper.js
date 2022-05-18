const espree = require("@xinminlabs/espree");

require("../lib/ast-node-ext");
require("../lib/array-ext");

const parse = (code, { firstStatement } = { firstStatement: true }) => {
  const node = espree.parse(code, { ecmaVersion: "latest", loc: true, sourceType: 'module', sourceFile: "code.js" })
  if (firstStatement) {
    return node.body[0];
  }
  return node
}

module.exports = { parse };
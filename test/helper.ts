const espree = require("@xinminlabs/espree");

require("../src/ast-node-ext");
require("../src/array-ext");

export const parse = (code: string, { firstStatement }: { firstStatement: boolean } = { firstStatement: true }): any => {
  const node = espree.parse(code, { ecmaVersion: "latest", loc: true, sourceType: "module", sourceFile: "code.js" });
  if (firstStatement) {
    return node.body[0];
  }
  return node;
};

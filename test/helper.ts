import NodeQuery from "@xinminlabs/node-query";
import NodeMutation from "@xinminlabs/node-mutation";
import MutationAdapter from "../src/node-mutation/espree-adapter";
import QueryAdapter from "../src/node-query/espree-adapter";
const espree = require("@xinminlabs/espree");

import "../src/array-ext";

export const parse = (
  code: string,
  { firstStatement }: { firstStatement: boolean } = { firstStatement: true }
): any => {
  NodeQuery.configure({ adapter: new QueryAdapter() });
  NodeMutation.configure({ adapter: new MutationAdapter() });

  const node = espree.parse(code, {
    ecmaVersion: "latest",
    loc: true,
    sourceType: "module",
    sourceFile: "code.js",
  });
  if (firstStatement) {
    return node.body[0];
  }
  return node;
};

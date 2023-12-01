import ts from "typescript";

export const parse = (
  code: string,
  { firstStatement }: { firstStatement: boolean } = { firstStatement: true },
): ts.Node => {
  const node = ts.createSourceFile(
    "code.js",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (firstStatement) {
    return node.statements[0];
  }
  return node;
};

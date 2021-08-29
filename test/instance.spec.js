const fs = require("fs");
const mock = require("mock-fs");

const Instance = require("../lib/instance");

describe("Instance", () => {
  describe("process", () => {
    test("writes new code to file", () => {
      const instance = new Instance({}, "*.js", () => {
        withNode({ type: "CallExpression", callee: { type: "MemberExpression", property: "trimLeft" } }, () => {
          replace("callee.property", { with: "trimStart" });
        });
        withNode({ type: "CallExpression", callee: { type: "MemberExpression", property: "trimRight" } }, () => {
          replace("callee.property", { with: "trimEnd" });
        });
      });
      Instance.current = instance;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      const output = `
        const foo1 = bar.trimStart();
        const foo2 = bar.trimEnd();
      `;
      mock({ "code.js": input });
      instance.process();
      expect(fs.readFileSync("code.js", "utf8")).toBe(output);
      mock.restore();
    });
  });
});

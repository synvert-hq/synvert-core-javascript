import fs, { promises as promisesFs } from "fs";
import mock from "mock-fs";

import Rewriter from "../src/rewriter";
import Instance from "../src/instance";

describe("Instance", () => {
  const rewriter = new Rewriter("snippet group", "snippet name", () => {});

  describe("processSync", () => {
    afterEach(() => {
      mock.restore();
    });

    test("writes new code to file", () => {
      const instance = new Instance(rewriter, "*.js", () => {
        findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            replace("callee.property", { with: "trimStart" });
          }
        );
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            replace("callee.property", { with: "trimEnd" });
          }
        );
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
      instance.processSync();
      expect(fs.readFileSync("code.js", "utf8")).toEqual(output);
    });

    test("does not write new code to file if parser is espree and file extension is ts", () => {
      const instance = new Instance(rewriter, "*.ts", () => {
        findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            replace("callee.property", { with: "trimStart" });
          }
        );
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            replace("callee.property", { with: "trimEnd" });
          }
        );
      });
      Instance.current = instance;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      instance.processSync();
      expect(fs.readFileSync("code.ts", "utf8")).toEqual(input);
    });

    test("gets affected files", () => {
      const instance = new Instance(rewriter, "*.js", () => {
        findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            replace("callee.property", { with: "trimStart" });
          }
        );
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            replace("callee.property", { with: "trimEnd" });
          }
        );
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
      instance.processSync();
      instance.processSync();
      expect(rewriter.affectedFiles).toEqual(new Set<string>(["code.js"]));
    });
  });

  describe("process", () => {
    afterEach(() => {
      mock.restore();
    });

    test("writes new code to file", async () => {
      const instance = new Instance(rewriter, "*.js", () => {
        findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            replace("callee.property", { with: "trimStart" });
          }
        );
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            replace("callee.property", { with: "trimEnd" });
          }
        );
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
      await instance.process();
      expect(await promisesFs.readFile("code.js", "utf8")).toEqual(output);
    });

    test("does not write new code to file if parser is espree and file extension is ts", async () => {
      const instance = new Instance(rewriter, "*.ts", () => {
        findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            replace("callee.property", { with: "trimStart" });
          }
        );
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            replace("callee.property", { with: "trimEnd" });
          }
        );
      });
      Instance.current = instance;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      await instance.process();
      expect(fs.readFileSync("code.ts", "utf8")).toEqual(input);
    });

    test("gets affected files", async () => {
      const instance = new Instance(rewriter, "*.js", () => {
        findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            replace("callee.property", { with: "trimStart" });
          }
        );
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            replace("callee.property", { with: "trimEnd" });
          }
        );
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
      await instance.process();
      await instance.process();
      expect(rewriter.affectedFiles).toEqual(new Set<string>(["code.js"]));
    });
  });

  describe("#testSync", () => {
    afterEach(() => {
      mock.restore();
    });

    test("gets actions", () => {
      const instance = new Instance(rewriter, "*.js", () => {
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            noop();
          }
        );
      });
      Instance.current = instance;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.js": input });
      const results = instance.testSync();
      expect(results).toEqual([
        {
          actions: [
            {
              end: 74,
              newCode: undefined,
              start: 59,
            },
          ],
          affected: true,
          conflicted: false,
          filePath: "code.js",
        },
      ]);
    });

    test("gets no actions if parser is espree and file extension is ts", () => {
      const instance = new Instance(rewriter, "*.ts", () => {
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            noop();
          }
        );
      });
      Instance.current = instance;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      const results = instance.testSync();
      expect(results).toEqual([
        {
          actions: [],
          affected: false,
          conflicted: false,
          filePath: "code.ts",
        },
      ]);
    });
  });

  describe("#test", () => {
    afterEach(() => {
      mock.restore();
    });

    test("gets actions", async () => {
      const instance = new Instance(rewriter, "*.js", () => {
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            noop();
          }
        );
      });
      Instance.current = instance;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.js": input });
      const results = await instance.test();
      expect(results).toEqual([
        {
          actions: [
            {
              end: 74,
              newCode: undefined,
              start: 59,
            },
          ],
          affected: true,
          conflicted: false,
          filePath: "code.js",
        },
      ]);
    });

    test("gets no actions if parser is espree and file extension is ts", async () => {
      const instance = new Instance(rewriter, "*.ts", () => {
        withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            noop();
          }
        );
      });
      Instance.current = instance;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      const results = await instance.test();
      expect(results).toEqual([
        {
          actions: [],
          affected: false,
          conflicted: false,
          filePath: "code.ts",
        },
      ]);
    });
  });
});

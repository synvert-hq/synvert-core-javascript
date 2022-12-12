import fs, { promises as promisesFs } from "fs";
import mock from "mock-fs";

import Rewriter from "../src/rewriter";
import Instance from "../src/instance";
import NodeQuery, {
  TypescriptAdapter as TypescriptQueryAdapter,
} from "@xinminlabs/node-query";
import NodeMutation, {
  TypescriptAdapter as TypescriptMutationAdapter,
} from "@xinminlabs/node-mutation";
import { Parser } from "../src/types/options";

describe("Instance", () => {
  const rewriter = new Rewriter("snippet group", "snippet name", () => {});

  describe("processSync", () => {
    afterEach(() => {
      mock.restore();
    });

    test("writes new code to file", () => {
      const instance = new Instance(rewriter, "*.js", function () {
        this.findNodeSync(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            this.replace("callee.property", { with: "trimStart" });
          }
        );
        this.withNodeSync(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.replace("callee.property", { with: "trimEnd" });
          }
        );
      });
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
      const instance = new Instance(rewriter, "*.ts", function () {
        this.findNodeSync(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            this.replace("callee.property", { with: "trimStart" });
          }
        );
        this.withNodeSync(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.replace("callee.property", { with: "trimEnd" });
          }
        );
      });
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      instance.processSync();
      expect(fs.readFileSync("code.ts", "utf8")).toEqual(input);
    });

    test("gets affected files", () => {
      const instance = new Instance(rewriter, "*.js", function () {
        this.findNodeSync(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            this.replace("callee.property", { with: "trimStart" });
          }
        );
        this.withNodeSync(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.replace("callee.property", { with: "trimEnd" });
          }
        );
      });
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
      const instance = new Instance(rewriter, "*.js", async function () {
        await this.findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            this.replace("callee.property", { with: "trimStart" });
          }
        );
        await this.withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.replace("callee.property", { with: "trimEnd" });
          }
        );
      });
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
      const instance = new Instance(rewriter, "*.ts", async function () {
        await this.findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            this.replace("callee.property", { with: "trimStart" });
          }
        );
        await this.withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.replace("callee.property", { with: "trimEnd" });
          }
        );
      });
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      await instance.process();
      expect(fs.readFileSync("code.ts", "utf8")).toEqual(input);
    });

    test("gets affected files", async () => {
      const instance = new Instance(rewriter, "*.js", async function () {
        await this.findNode(
          ".CallExpression[callee=.MemberExpression[property=trimLeft]]",
          () => {
            this.replace("callee.property", { with: "trimStart" });
          }
        );
        await this.withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.replace("callee.property", { with: "trimEnd" });
          }
        );
      });
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
      const instance = new Instance(rewriter, "*.js", function () {
        this.withNodeSync(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.noop();
          }
        );
      });
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
      const instance = new Instance(rewriter, "*.ts", function () {
        this.withNodeSync(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.noop();
          }
        );
      });
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
      const instance = new Instance(rewriter, "*.js", async function () {
        await this.withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.noop();
          }
        );
      });
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
      const instance = new Instance(rewriter, "*.ts", async function () {
        await this.withNode(
          {
            nodeType: "CallExpression",
            callee: { nodeType: "MemberExpression", property: "trimRight" },
          },
          () => {
            this.noop();
          }
        );
      });
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

  describe("#calHelperSync", () => {
    afterEach(() => {
      mock.restore();
    });

    test("calls helper", () => {
      const helper = `
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
      `;
      const instance = new Instance(rewriter, "*.js", function () {
        this.callHelperSync("helpers/helper");
      });
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      const output = `
        const foo1 = bar.trimStart();
        const foo2 = bar.trimEnd();
      `;
      mock({
        "lib/helpers/helper.js": helper,
        "code.js": input,
      });
      process.env.SYNVERT_SNIPPETS_HOME = ".";
      instance.processSync();
      expect(fs.readFileSync("code.js", "utf8")).toEqual(output);
    });
  });

  describe("#calHelper", () => {
    beforeEach(() => {
      NodeQuery.configure({ adapter: new TypescriptQueryAdapter() });
      NodeMutation.configure({ adapter: new TypescriptMutationAdapter() });
    });
    afterEach(() => {
      mock.restore();
    });

    test("calls helper", async () => {
      const helper = `
        findNode(
          ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
          () => {
            replace("expression.name", { with: "trimStart" });
          }
        );
        withNode(
          {
            expression: { nodeType: "PropertyAccessExpression", name: "trimRight" },
          },
          () => {
            replace("expression.name", { with: "trimEnd" });
          }
        );
      `;
      rewriter.options.parser = Parser.TYPESCRIPT;
      const instance = new Instance(rewriter, "*.js", async function () {
        await this.callHelper("helpers/helper");
      });
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      const output = `
        const foo1 = bar.trimStart();
        const foo2 = bar.trimEnd();
      `;
      mock({
        "lib/helpers/helper.js": helper,
        "code.js": input,
      });
      process.env.SYNVERT_SNIPPETS_HOME = ".";
      await instance.process();
      expect(await promisesFs.readFile("code.js", "utf8")).toEqual(output);
    });
  });

  describe("indent", () => {
    const oldCode = `
    class Foo {
      bar() {
        test()
      }
    }
    `;
    const newCode = `
      class Foo {
        bar() {
          test()
        }
      }
    `;
    const instance = new Instance(rewriter, "*.js", function () {});
    expect(instance.indent(oldCode, 2)).toEqual(newCode);
  });
});

import dedent from "dedent";
import fs, { promises as promisesFs } from "fs";
import mock from "mock-fs";
import { Node } from "typescript";

import Rewriter from "../src/rewriter";
import Instance from "../src/instance";
import NodeQuery, {
  TypescriptAdapter as TypescriptQueryAdapter,
} from "@xinminlabs/node-query";
import NodeMutation, {
  TypescriptAdapter as TypescriptMutationAdapter,
} from "@xinminlabs/node-mutation";
import { Parser } from "../src/types/options";
import Configuration from "../src/configuration";

describe("Instance", () => {
  const rewriter = new Rewriter<Node>(
    "snippet group",
    "snippet name",
    () => {}
  );

  describe("#filePath", () => {
    test("get file path", () => {
      const instance = new Instance<Node>(rewriter, "code.ts", function () {});
      expect(instance.filePath).toEqual("code.ts");
    });
  });

  describe("#mutationAdapter", () => {
    test("get mutation adapter", () => {
      const instance = new Instance<Node>(rewriter, "code.ts", function () {});
      expect(instance.mutationAdapter).not.toBeNull();
    });
  });

  describe("processSync", () => {
    let instance: Instance<Node>;

    beforeEach(() => {
      instance = new Instance<Node>(rewriter, "code.ts", function () {
        this.findNodeSync(
          ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
          () => {
            this.replace("expression.name", { with: "trimStart" });
          }
        );
        this.withNodeSync(
          {
            nodeType: "CallExpression",
            expression: {
              nodeType: "PropertyAccessExpression",
              name: "trimRight",
            },
          },
          () => {
            this.replace("expression.name", { with: "trimEnd" });
          }
        );
      });
    });

    afterEach(() => {
      rewriter.configure({ parser: Parser.TYPESCRIPT });
      mock.restore();
    });

    test("writes new code to file", () => {
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      const output = `
        const foo1 = bar.trimStart();
        const foo2 = bar.trimEnd();
      `;
      mock({ "code.ts": input });
      instance.processSync();
      expect(fs.readFileSync("code.ts", "utf8")).toEqual(output);
    });

    test("does not write new code to file if parser is espree and file extension is ts", () => {
      rewriter.options.parser = Parser.ESPREE;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      instance.processSync();
      expect(fs.readFileSync("code.ts", "utf8")).toEqual(input);
    });

    test("gets affected files", () => {
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      const output = `
        const foo1 = bar.trimStart();
        const foo2 = bar.trimEnd();
      `;
      mock({ "code.ts": input });
      instance.processSync();
      instance.processSync();
      expect(rewriter.affectedFiles).toEqual(new Set<string>(["code.ts"]));
    });

    test("writes new code to html file", () => {
      instance = new Instance<Node>(
        new Rewriter<Node>("grup", "name", function () {}),
        "code.html",
        function () {
          this.findNodeSync(
            ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
            () => {
              this.replace("expression.name", { with: "trimStart" });
            }
          );
          this.withNodeSync(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.replace("expression.name", { with: "trimEnd" });
            }
          );
        }
      );
      const input = `
        <html>
          <body>
            <script type="text/javascript">
              const foo1 = bar.trimLeft();
              const foo2 = bar.trimRight();
            </script>
          </body>
        </html>
      `;
      const output = `
        <html>
          <body>
            <script type="text/javascript">
              const foo1 = bar.trimStart();
              const foo2 = bar.trimEnd();
            </script>
          </body>
        </html>
      `;
      mock({ "code.html": input });
      instance.processSync();
      expect(fs.readFileSync("code.html", "utf8")).toEqual(output);
    });

    test("writes new code to erb file", () => {
      instance = new Instance<Node>(
        new Rewriter<Node>("grup", "name", function () {}),
        "code.html.erb",
        function () {
          this.findNodeSync(
            ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
            () => {
              this.replace("expression.name", { with: "trimStart" });
            }
          );
          this.withNodeSync(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.replace("expression.name", { with: "trimEnd" });
            }
          );
        }
      );
      const input = `
        <html>
          <body>
            <%= javascript_tag do %>
              const foo1 = bar.trimLeft();
              const foo2 = bar.trimRight();
            <% end %>
          </body>
        </html>
      `;
      const output = `
        <html>
          <body>
            <%= javascript_tag do %>
              const foo1 = bar.trimStart();
              const foo2 = bar.trimEnd();
            <% end %>
          </body>
        </html>
      `;
      mock({ "code.html.erb": input });
      instance.processSync();
      expect(fs.readFileSync("code.html.erb", "utf8")).toEqual(output);
    });

    test("writes new code to scss file", () => {
      const rewriter = new Rewriter<Node>(
        "scss",
        "convert_to_sass",
        function () {}
      );
      rewriter.configure({ parser: Parser.GONZALES_PE });
      instance = new Instance<Node>(rewriter, "code.scss", function () {
        this.findNodeSync(".declarationDelimiter", () => {
          this.remove();
        });
        this.findNodeSync(".block", () => {
          this.group(() => {
            this.delete("leftCurlyBracket");
            this.delete("rightCurlyBracket", { wholeLine: true });
          });
        });
      });
      const input = dedent`
        @import "../styles/imports";

        $col-primary: #f39900;

        @mixin center_horizontal() {
          display: flex;
          justify-content: center;
        }
        .container {
          @include center_horizontal();
          border: 1px solid darken($col-background, 10);
          .item {
            color: $col-primary;
          }
        }
      `;
      const output = dedent`
        @import "../styles/imports"

        $col-primary: #f39900

        @mixin center_horizontal()
          display: flex
          justify-content: center
        .container
          @include center_horizontal()
          border: 1px solid darken($col-background, 10)
          .item
            color: $col-primary
      `;
      mock({ "code.scss": input });
      instance.processSync();
      const content = fs.readFileSync("code.scss", "utf8");
      expect(fs.readFileSync("code.scss", "utf8")).toEqual(output + "\n");
    });

    test("writes new code to sass file", () => {
      const rewriter = new Rewriter<Node>(
        "sass",
        "convert_to_scss",
        function () {}
      );
      rewriter.configure({ parser: Parser.GONZALES_PE });
      instance = new Instance<Node>(rewriter, "code.sass", function () {
        this.findNodeSync(".atrule .string", () => {
          this.insert(";", { at: "end" });
        });
        this.findNodeSync(".declaration, .include", () => {
          this.insert(";", { at: "end", conflictPosition: 0 });
        });
        this.findNodeSync(".mixin", () => {
          const column = this.currentNode.start.column - 1;
          const conflictPosition = 1 - column;
          this.insert(" {", { at: "end", to: "arguments" });
          this.insert(`}\n${" ".repeat(column)}`, {
            to: "block",
            at: "end",
            conflictPosition,
          });
        });
        this.findNodeSync(".ruleset", () => {
          const column = this.currentNode.start.column - 1;
          const conflictPosition = 1 - column;
          this.insert(" {", { at: "end", to: "selector" });
          this.insert(`\n${" ".repeat(column)}}`, {
            to: "block",
            at: "end",
            conflictPosition,
          });
        });
      });
      const input = dedent`
        @import "../styles/imports"

        $col-primary: #f39900

        @mixin center_horizontal()
          display: flex
          justify-content: center
        .container
          @include center_horizontal()
          border: 1px solid darken($col-background, 10)
          .item
            color: $col-primary
      `;
      const output = dedent`
        @import "../styles/imports";

        $col-primary: #f39900;

        @mixin center_horizontal() {
          display: flex;
          justify-content: center;
        }
        .container {
          @include center_horizontal();
          border: 1px solid darken($col-background, 10);
          .item {
            color: $col-primary;
          }
        }
      `;
      mock({ "code.sass": input });
      instance.processSync();
      expect(fs.readFileSync("code.sass", "utf8")).toEqual(output);
    });
  });

  describe("process", () => {
    let instance: Instance<Node>;

    beforeEach(() => {
      instance = new Instance<Node>(rewriter, "code.ts", async function () {
        await this.findNode(
          ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
          () => {
            this.replace("expression.name", { with: "trimStart" });
          }
        );
        await this.withNode(
          {
            nodeType: "CallExpression",
            expression: {
              nodeType: "PropertyAccessExpression",
              name: "trimRight",
            },
          },
          () => {
            this.replace("expression.name", { with: "trimEnd" });
          }
        );
      });
    });

    afterEach(() => {
      mock.restore();
      rewriter.options.parser = Parser.TYPESCRIPT;
    });

    test("writes new code to file", async () => {
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      const output = `
        const foo1 = bar.trimStart();
        const foo2 = bar.trimEnd();
      `;
      mock({ "code.ts": input });
      await instance.process();
      expect(await promisesFs.readFile("code.ts", "utf8")).toEqual(output);
    });

    test("does not write new code to file if parser is espree and file extension is ts", async () => {
      rewriter.options.parser = Parser.ESPREE;
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      await instance.process();
      expect(fs.readFileSync("code.ts", "utf8")).toEqual(input);
    });

    test("gets affected files", async () => {
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      const output = `
        const foo1 = bar.trimStart();
        const foo2 = bar.trimEnd();
      `;
      mock({ "code.ts": input });
      await instance.process();
      await instance.process();
      expect(rewriter.affectedFiles).toEqual(new Set<string>(["code.ts"]));
    });

    test("writes new code to html file", async () => {
      instance = new Instance<Node>(
        new Rewriter<Node>("group", "name", function () {}),
        "code.html",
        async function () {
          await this.findNode(
            ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
            () => {
              this.replace("expression.name", { with: "trimStart" });
            }
          );
          await this.withNode(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.replace("expression.name", { with: "trimEnd" });
            }
          );
        }
      );
      const input = `
        <html>
          <body>
            <script type="text/javascript">
              const foo1 = bar.trimLeft();
              const foo2 = bar.trimRight();
            </script>
          </body>
        </html>
      `;
      const output = `
        <html>
          <body>
            <script type="text/javascript">
              const foo1 = bar.trimStart();
              const foo2 = bar.trimEnd();
            </script>
          </body>
        </html>
      `;
      mock({ "code.html": input });
      await instance.process();
      expect(await promisesFs.readFile("code.html", "utf8")).toEqual(output);
    });

    test("writes new code to erb file", async () => {
      instance = new Instance<Node>(
        new Rewriter<Node>("group", "name", function () {}),
        "code.html.erb",
        async function () {
          await this.findNode(
            ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
            () => {
              this.replace("expression.name", { with: "trimStart" });
            }
          );
          await this.withNode(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.replace("expression.name", { with: "trimEnd" });
            }
          );
        }
      );
      const input = `
        <html>
          <body>
            <%= javascript_tag do %>
              const foo1 = bar.trimLeft();
              const foo2 = bar.trimRight();
            <% end %>
          </body>
        </html>
      `;
      const output = `
        <html>
          <body>
            <%= javascript_tag do %>
              const foo1 = bar.trimStart();
              const foo2 = bar.trimEnd();
            <% end %>
          </body>
        </html>
      `;
      mock({ "code.html.erb": input });
      await instance.process();
      expect(await promisesFs.readFile("code.html.erb", "utf8")).toEqual(
        output
      );
    });
  });

  describe("#testSync", () => {
    afterEach(() => {
      mock.restore();
      rewriter.options.parser = Parser.TYPESCRIPT;
    });

    test("gets actions", () => {
      const instance = new Instance<Node>(rewriter, "code.ts", function () {
        this.withNodeSync(
          {
            nodeType: "CallExpression",
            expression: {
              nodeType: "PropertyAccessExpression",
              name: "trimRight",
            },
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
      expect(results).toEqual({
        actions: [
          {
            type: "",
            end: 74,
            newCode: undefined,
            start: 59,
          },
        ],
        affected: true,
        conflicted: false,
        filePath: "code.ts",
      });
    });

    test("gets no actions if parser is espree and file extension is ts", () => {
      rewriter.options.parser = Parser.ESPREE;
      const instance = new Instance<Node>(rewriter, "code.ts", function () {
        this.withNodeSync(
          {
            nodeType: "CallExpression",
            expression: {
              nodeType: "PropertyAccessExpression",
              name: "trimRight",
            },
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
      expect(results).toEqual({
        actions: [],
        affected: false,
        conflicted: false,
        filePath: "code.ts",
      });
    });

    test("gets actions for html file", () => {
      const instance = new Instance<Node>(
        new Rewriter<Node>("group", "name", function () {}),
        "code.html",
        function () {
          this.withNodeSync(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.noop();
            }
          );
        }
      );
      const input = `
        <html>
          <body>
            <script type="text/javascript">
              const foo1 = bar.trimLeft();
              const foo2 = bar.trimRight();
            </script>
          </body>
        </html>
      `;
      mock({ "code.html": input });
      const results = instance.testSync();
      expect(results).toEqual({
        actions: [
          {
            type: "",
            end: 162,
            newCode: undefined,
            start: 147,
          },
        ],
        affected: true,
        conflicted: false,
        filePath: "code.html",
      });
    });

    test("gets actions for erb file", () => {
      const instance = new Instance<Node>(
        new Rewriter<Node>("group", "name", function () {}),
        "code.html.erb",
        function () {
          this.withNodeSync(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.noop();
            }
          );
        }
      );
      const input = `
        <html>
          <body>
            <%= javascript_tag do %>
              const foo1 = bar.trimLeft();
              const foo2 = bar.trimRight();
            <% end %>
          </body>
        </html>
      `;
      mock({ "code.html.erb": input });
      const results = instance.testSync();
      expect(results).toEqual({
        actions: [
          {
            type: "",
            end: 155,
            newCode: undefined,
            start: 140,
          },
        ],
        affected: true,
        conflicted: false,
        filePath: "code.html.erb",
      });
    });
  });

  describe("#test", () => {
    afterEach(() => {
      mock.restore();
      rewriter.options.parser = Parser.TYPESCRIPT;
    });

    test("gets actions", async () => {
      const instance = new Instance<Node>(
        rewriter,
        "code.ts",
        async function () {
          await this.withNode(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.noop();
            }
          );
        }
      );
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      const results = await instance.test();
      expect(results).toEqual({
        actions: [
          {
            type: "",
            end: 74,
            newCode: undefined,
            start: 59,
          },
        ],
        affected: true,
        conflicted: false,
        filePath: "code.ts",
      });
    });

    test("gets no actions if parser is espree and file extension is ts", async () => {
      rewriter.options.parser = Parser.ESPREE;
      const instance = new Instance<Node>(
        rewriter,
        "code.ts",
        async function () {
          await this.withNode(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.noop();
            }
          );
        }
      );
      const input = `
        const foo1 = bar.trimLeft();
        const foo2 = bar.trimRight();
      `;
      mock({ "code.ts": input });
      const results = await instance.test();
      expect(results).toEqual({
        actions: [],
        affected: false,
        conflicted: false,
        filePath: "code.ts",
      });
    });

    test("gets actions for html", async () => {
      const instance = new Instance<Node>(
        rewriter,
        "code.html",
        async function () {
          await this.withNode(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.noop();
            }
          );
        }
      );
      const input = `
        <html>
          <body>
            <script type="text/javascript">
              const foo1 = bar.trimLeft();
              const foo2 = bar.trimRight();
            </script>
          </body>
        </html>
      `;
      mock({ "code.html": input });
      const results = await instance.test();
      expect(results).toEqual({
        actions: [
          {
            type: "",
            end: 162,
            newCode: undefined,
            start: 147,
          },
        ],
        affected: true,
        conflicted: false,
        filePath: "code.html",
      });
    });

    test("gets actions for erb", async () => {
      const instance = new Instance<Node>(
        rewriter,
        "code.html.erb",
        async function () {
          await this.withNode(
            {
              nodeType: "CallExpression",
              expression: {
                nodeType: "PropertyAccessExpression",
                name: "trimRight",
              },
            },
            () => {
              this.noop();
            }
          );
        }
      );
      const input = `
        <html>
          <body>
            <%= javascript_tag do %>
              const foo1 = bar.trimLeft();
              const foo2 = bar.trimRight();
            <% end %>
          </body>
        </html>
      `;
      mock({ "code.html.erb": input });
      const results = await instance.test();
      expect(results).toEqual({
        actions: [
          {
            type: "",
            end: 155,
            newCode: undefined,
            start: 140,
          },
        ],
        affected: true,
        conflicted: false,
        filePath: "code.html.erb",
      });
    });
  });

  describe.skip("#calHelperSync", () => {
    afterEach(() => {
      mock.restore();
    });

    test("calls helper", () => {
      const helper = `
        new Synvert.Helper("helpers/helper", function () {
          findNode(
            ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
            () => {
              replace("expression.name", { with: "trimStart" });
            }
          );
          withNode(
            {
              nodeType: "CallExpression",
              expression: { nodeType: "PropertyAccessExpression", name: "trimRight" },
            },
            () => {
              replace("expression.name", { with: "trimEnd" });
            }
          );
        });
      `;
      const instance = new Instance<Node>(rewriter, "code.ts", function () {
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
        "code.ts": input,
      });
      process.env.SYNVERT_SNIPPETS_HOME = ".";
      instance.processSync();
      expect(fs.readFileSync("code.ts", "utf8")).toEqual(output);
    });
  });

  describe.skip("#calHelper", () => {
    beforeEach(() => {
      NodeQuery.configure({ adapter: new TypescriptQueryAdapter() });
      NodeMutation.configure({ adapter: new TypescriptMutationAdapter() });
    });
    afterEach(() => {
      mock.restore();
    });

    test("calls helper", async () => {
      const helper = `
        new Synvert.Helper("helpers/helper", function () {
          findNode(
            ".CallExpression[expression=.PropertyAccessExpression[name=trimLeft]]",
            () => {
              replace("expression.name", { with: "trimStart" });
            }
          );
          withNode(
            {
              nodeType: "CallExpression",
              expression: { nodeType: "PropertyAccessExpression", name: "trimRight" },
            },
            () => {
              replace("expression.name", { with: "trimEnd" });
            }
          );
        });
      `;
      rewriter.options.parser = Parser.TYPESCRIPT;
      const instance = new Instance<Node>(
        rewriter,
        "code.ts",
        async function () {
          await this.callHelper("helpers/helper");
        }
      );
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
        "code.ts": input,
      });
      process.env.SYNVERT_SNIPPETS_HOME = ".";
      await instance.process();
      expect(await promisesFs.readFile("code.ts", "utf8")).toEqual(output);
    });
  });

  describe("wrapWithQuotes", () => {
    const instance = new Instance<Node>(rewriter, "code.ts", function () {});

    describe("Configuration.singleQuote is true", () => {
      beforeEach(() => {
        Configuration.singleQuote = true;
      });

      afterEach(() => {
        Configuration.singleQuote = false;
      });

      test("wraps with single quotes", () => {
        expect(instance.wrapWithQuotes("foobar")).toEqual("'foobar'");
      });

      test("wraps with double quotes if it contains single quote", () => {
        expect(instance.wrapWithQuotes("foo'bar")).toEqual(`"foo'bar"`);
      });

      test("wraps with single quotes and escapes single quote", () => {
        expect(instance.wrapWithQuotes("foo'\"bar")).toEqual(`'foo\\'"bar'`);
      });
    });

    describe("Configuration.singleQuote is false", () => {
      test("wraps with double quotes", () => {
        expect(instance.wrapWithQuotes("foobar")).toEqual('"foobar"');
      });

      test("wraps with single quotes if it contains double quote", () => {
        expect(instance.wrapWithQuotes('foo"bar')).toEqual(`'foo"bar'`);
      });

      test("wraps with double quotes and escapes double quote", () => {
        expect(instance.wrapWithQuotes("foo'\"bar")).toEqual(`"foo'\\"bar"`);
      });
    });
  });

  describe("appendSemicolon", () => {
    const instance = new Instance<Node>(rewriter, "code.ts", function () {});

    describe("Configuration.semi is true", () => {
      test("appends semicolon", () => {
        expect(instance.appendSemicolon("foo")).toEqual("foo;");
      });

      test("do not append semicolon if it already ends with semicolon", () => {
        expect(instance.appendSemicolon("foo;")).toEqual("foo;");
      });
    });

    describe("Configuration.semi is false", () => {
      beforeEach(() => {
        Configuration.semi = false;
      });

      afterEach(() => {
        Configuration.semi = true;
      });

      test("do not append semicolon", () => {
        expect(instance.appendSemicolon("foo")).toEqual("foo");
      });
    });
  });

  describe("addLeadingSpaces", () => {
    const instance = new Instance<Node>(rewriter, "code.ts", function () {});

    test("add leading spaces", () => {
      expect(instance.addLeadingSpaces("foo")).toEqual("  foo");
      expect(instance.addLeadingSpaces("foo", { tabSize: 2 })).toEqual(
        "    foo"
      );
    });
  });

  describe("indent", () => {
    describe("not skipFirstLine", () => {
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
      const instance = new Instance<Node>(rewriter, "code.ts", function () {});
      expect(instance.indent(oldCode, 2)).toEqual(newCode);
    });

    describe("skipFirstLine", () => {
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
      const instance = new Instance<Node>(rewriter, "code.ts", function () {});
      expect(instance.indent(oldCode, 2, { skipFirstLine: true })).toEqual(
        newCode
      );
    });

    describe("negative space count", () => {
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
      const instance = new Instance<Node>(rewriter, "code.ts", function () {});
      expect(instance.indent(oldCode, -2)).toEqual(newCode);
    });
  });
});

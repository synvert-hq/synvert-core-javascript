import dedent from "dedent";
import Configuration from "../src/configuration";
import {
  rewriteSnippetToAsyncVersion,
  rewriteSnippetToSyncVersion,
  wrapWithQuotes,
} from "../src/utils";

describe("rewriteSnippetToAsyncVersion", () => {
  test("rewrites snippet", () => {
    const originalSnippet = dedent`
      const Synvert = require("synvert-core");

      new Synvert.Rewriter("group", "name1", () => {
        description("foobar");

        configure({ parser: Synvert.Parser.TYPESCRIPT });
        addFile("foobar.js", "foobar");
        removeFile("foo.js");
        removeFile("bar.js");
        addSnippet("foo", "bar");
        withinFiles(Synvert.ALL_FILES, () => {
          callHelper("helper/foobar")
          findNode(".CallExpression", () => {
            replace("expresion.name", { with: "foobar" });
            deleteNode("expression.expression");
          });
        });
      });

      new Synvert.Rewriter("group", "name2", function () {
        description("foobar");

        configure({ parser: Synvert.Parser.TYPESCRIPT });
        addFile("foobar.js", "foobar");
        removeFile("foo.js");
        removeFile("bar.js");
        addSnippet("foo", "bar");
        withinFiles(Synvert.ALL_FILES, function () {
          callHelper("helper/foobar")
          findNode(".CallExpression", () => {
            replace("expresion.name", { with: "foobar" });
            deleteNode("expression.expression");
          });
        });
      });
    `;
    const newSnippet = dedent`
      const Synvert = require("synvert-core");

      new Synvert.Rewriter("group", "name1", async function () {
        this.description("foobar");

        this.configure({ parser: Synvert.Parser.TYPESCRIPT });
        await this.addFile("foobar.js", "foobar");
        await this.removeFile("foo.js");
        await this.removeFile("bar.js");
        await this.addSnippet("foo", "bar");
        await this.withinFiles(Synvert.ALL_FILES, async function () {
          await this.callHelper("helper/foobar")
          await this.findNode(".CallExpression", async () => {
            this.replace("expresion.name", { with: "foobar" });
            this.deleteNode("expression.expression");
          });
        });
      });

      new Synvert.Rewriter("group", "name2", async function () {
        this.description("foobar");

        this.configure({ parser: Synvert.Parser.TYPESCRIPT });
        await this.addFile("foobar.js", "foobar");
        await this.removeFile("foo.js");
        await this.removeFile("bar.js");
        await this.addSnippet("foo", "bar");
        await this.withinFiles(Synvert.ALL_FILES, async function () {
          await this.callHelper("helper/foobar")
          await this.findNode(".CallExpression", async () => {
            this.replace("expresion.name", { with: "foobar" });
            this.deleteNode("expression.expression");
          });
        });
      });
    `;
    expect(rewriteSnippetToAsyncVersion(originalSnippet)).toEqual(newSnippet);
    expect(
      rewriteSnippetToAsyncVersion(
        rewriteSnippetToAsyncVersion(originalSnippet)
      )
    ).toEqual(newSnippet);
  });
});

describe("rewriteSnippetToSyncVersion", () => {
  test("rewrites snippet", () => {
    const originalSnippet = dedent`
      new Synvert.Rewriter("group", "name", () => {
        description("foobar");

        configure({ parser: Synvert.Parser.TYPESCRIPT });
        addFile("foobar.js", "foobar");
        removeFile("foo.js");
        removeFile("bar.js");
        addSnippet("foo", "bar");
        withinFiles(Synvert.ALL_FILES, () => {
          callHelper("helper/foobar")
          findNode(".CallExpression", () => {
            replace("expresion.name", { with: "foobar" });
            deleteNode("expression.expression");
          });
        });
      });
    `;
    const newSnippet = dedent`
      const Synvert = require("synvert-core");
      new Synvert.Rewriter("group", "name", function () {
        this.description("foobar");

        this.configure({ parser: Synvert.Parser.TYPESCRIPT });
        this.addFileSync("foobar.js", "foobar");
        this.removeFileSync("foo.js");
        this.removeFileSync("bar.js");
        this.addSnippetSync("foo", "bar");
        this.withinFilesSync(Synvert.ALL_FILES, function () {
          this.callHelperSync("helper/foobar")
          this.findNodeSync(".CallExpression", () => {
            this.replace("expresion.name", { with: "foobar" });
            this.deleteNode("expression.expression");
          });
        });
      });
    `;
    expect(rewriteSnippetToSyncVersion(originalSnippet)).toEqual(newSnippet);
    expect(
      rewriteSnippetToSyncVersion(rewriteSnippetToSyncVersion(originalSnippet))
    ).toEqual(newSnippet);
  });
});

describe("wrapWithQuotes", () => {
  describe("Configuration.singleQuote is true", () => {
    beforeEach(() => {
      Configuration.singleQuote = true;
    });

    afterEach(() => {
      Configuration.singleQuote = false;
    });

    test("wraps with single quotes", () => {
      expect(wrapWithQuotes("foobar")).toEqual("'foobar'");
    });

    test("wraps with double quotes if it contains single quote", () => {
      expect(wrapWithQuotes("foo'bar")).toEqual(`"foo'bar"`);
    });

    test("wraps with single quotes and escapes single quote", () => {
      expect(wrapWithQuotes("foo'\"bar")).toEqual(`'foo\\'"bar'`);
    });
  });

  describe("Configuration.singleQuote is false", () => {
    test("wraps with double quotes", () => {
      expect(wrapWithQuotes("foobar")).toEqual('"foobar"');
    });

    test("wraps with single quotes if it contains double quote", () => {
      expect(wrapWithQuotes('foo"bar')).toEqual(`'foo"bar'`);
    });

    test("wraps with double quotes and escapes double quote", () => {
      expect(wrapWithQuotes("foo'\"bar")).toEqual(`"foo'\\"bar"`);
    });
  });
});

import {
  indent,
  rewriteSnippetToAsyncVersion,
  rewriteSnippetToSyncVersion,
} from "../src/utils";

it("indent", () => {
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
  expect(indent(oldCode, 2)).toEqual(newCode);
});

describe("rewriteSnippetToAsyncVersion", () => {
  test("rewrites snippet", () => {
    const originalSnippet = `
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
          });
        });
      });
    `;
    const newSnippet = `
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
          this.findNode(".CallExpression", () => {
            this.replace("expresion.name", { with: "foobar" });
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
          this.findNode(".CallExpression", () => {
            this.replace("expresion.name", { with: "foobar" });
          });
        });
      });
    `;
    expect(rewriteSnippetToAsyncVersion(originalSnippet)).toEqual(newSnippet);
  });
});

describe("rewriteSnippetToSyncVersion", () => {
  test("rewrites snippet", () => {
    const originalSnippet = `
      const Synvert = require("synvert-core");

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
          });
        });
      });
    `;
    const newSnippet = `
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
          this.findNode(".CallExpression", () => {
            this.replace("expresion.name", { with: "foobar" });
          });
        });
      });
    `;
    expect(rewriteSnippetToSyncVersion(originalSnippet)).toEqual(newSnippet);
  });
});

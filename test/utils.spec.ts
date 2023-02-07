import dedent from "dedent";
import Configuration from "../src/configuration";
import {
  rewriteSnippetToAsyncVersion,
  rewriteSnippetToSyncVersion,
  quote,
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

describe("quote", () => {
  test("gets single quote if Configuration.singleQuote is true", () => {
    Configuration.singleQuote = true;
    expect(quote()).toEqual("'");
  });

  test("gets double quote if Configuration.singleQuote is false", () => {
    Configuration.singleQuote = false;
    expect(quote()).toEqual('"');
  });
});

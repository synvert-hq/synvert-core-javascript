import dedent from "dedent";
import {
  rewriteSnippetToAsyncVersion,
  rewriteSnippetToSyncVersion,
} from "../src/utils";

describe("rewriteSnippetToAsyncVersion", () => {
  test("rewrites snippet", () => {
    const originalSnippet = dedent`
      const Synvert = require("@synvert-hq/synvert-core");

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
            group(() => {
              replace("expression.name", { with: "foobar" });
              delete("expression.expression");
            });
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
            group(() => {
              replace("expression.name", { with: "foobar" });
              delete("expression.expression");
            });
          });
        });
      });

      new Synvert.Helper("name", () => {
      });

      new Synvert.Helper("name", function () {
      });
    `;
    const newSnippet = dedent`
      const Synvert = require("@synvert-hq/synvert-core");

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
            await this.group(async () => {
              this.replace("expression.name", { with: "foobar" });
              this.delete("expression.expression");
            });
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
            await this.group(async () => {
              this.replace("expression.name", { with: "foobar" });
              this.delete("expression.expression");
            });
          });
        });
      });

      new Synvert.Helper("name", async function () {
      });

      new Synvert.Helper("name", async function () {
      });
    `;
    expect(rewriteSnippetToAsyncVersion(originalSnippet)).toEqual(newSnippet);
    expect(
      rewriteSnippetToAsyncVersion(
        rewriteSnippetToAsyncVersion(originalSnippet),
      ),
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
            group(() => {
              replace("expression.name", { with: "foobar" });
              delete("expression.expression");
            });
          });
        });
      });

      new Synvert.Helper("name", () => {
      });
    `;
    const newSnippet = dedent`
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
            this.group(() => {
              this.replace("expression.name", { with: "foobar" });
              this.delete("expression.expression");
            });
          });
        });
      });

      new Synvert.Helper("name", function () {
      });
    `;
    expect(rewriteSnippetToSyncVersion(originalSnippet)).toEqual(newSnippet);
    expect(
      rewriteSnippetToSyncVersion(rewriteSnippetToSyncVersion(originalSnippet)),
    ).toEqual(newSnippet);
  });
});

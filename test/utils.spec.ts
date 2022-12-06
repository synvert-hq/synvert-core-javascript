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

      new Synvert.Rewriter("group", "name1", async () => {
        description("foobar");

        configure({ parser: Synvert.Parser.TYPESCRIPT });
        await addFile("foobar.js", "foobar");
        await removeFile("foo.js");
        await removeFile("bar.js");
        await addSnippet("foo", "bar");
        await withinFiles(Synvert.ALL_FILES, async () => {
          await callHelper("helper/foobar")
          findNode(".CallExpression", () => {
            replace("expresion.name", { with: "foobar" });
          });
        });
      });

      new Synvert.Rewriter("group", "name2", async function () {
        description("foobar");

        configure({ parser: Synvert.Parser.TYPESCRIPT });
        await addFile("foobar.js", "foobar");
        await removeFile("foo.js");
        await removeFile("bar.js");
        await addSnippet("foo", "bar");
        await withinFiles(Synvert.ALL_FILES, async function () {
          await callHelper("helper/foobar")
          findNode(".CallExpression", () => {
            replace("expresion.name", { with: "foobar" });
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

      new Synvert.Rewriter("group", "name", () => {
        description("foobar");

        configure({ parser: Synvert.Parser.TYPESCRIPT });
        addFileSync("foobar.js", "foobar");
        removeFileSync("foo.js");
        removeFileSync("bar.js");
        addSnippetSync("foo", "bar");
        withinFilesSync(Synvert.ALL_FILES, () => {
          callHelperSync("helper/foobar")
          findNode(".CallExpression", () => {
            replace("expresion.name", { with: "foobar" });
          });
        });
      });
    `;
    expect(rewriteSnippetToSyncVersion(originalSnippet)).toEqual(newSnippet);
  });
});

import { Node } from "typescript";
import fs, { promises as promisesFs } from "fs";
import mock from "mock-fs";
import { resolve } from "path";

import Configuration from "../src/configuration";
import Rewriter from "../src/rewriter";
import { SourceType } from "../src/types/options";
import { isValidFile, isValidFileSync } from "../src/utils";

describe("static register", () => {
  it("registers and fetches", () => {
    const rewriter = new Rewriter<Node>("group", "name", function () {});
    expect(Rewriter.fetch("group", "name")).toBe(rewriter);

    expect(Rewriter.fetch("new group", "name")).toBeUndefined();
    expect(Rewriter.fetch("group", "new name")).toBeUndefined();
  });

  it("clears all rewriters", () => {
    const rewriter = new Rewriter<Node>("group", "name", function () {});
    expect(Rewriter.fetch("group", "name")).toBe(rewriter);

    Rewriter.clear();

    expect(Rewriter.fetch("group", "name")).toBeUndefined();
  });
});

describe("configure", () => {
  it("sets sourceType option", () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      function () {
        this.configure({ sourceType: SourceType.SCRIPT });
      },
    );
    expect(rewriter.options.sourceType).toBe(SourceType.MODULE);
    rewriter.processSync();
    expect(rewriter.options.sourceType).toBe(SourceType.SCRIPT);
  });
});

describe("process", () => {
  beforeEach(() => {
    Configuration.respectGitignore = false;
  });

  afterEach(() => {
    Configuration.respectGitignore = true;
    mock.restore();
  });

  test("writes new code to file", () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      function () {
        this.withinFilesSync("*.js", function () {
          this.withNode(
            { nodeType: "ClassDeclaration", name: "FooBar" },
            () => {
              this.replace("name", { with: "Synvert" });
            },
          );
        });
      },
    );
    const input = `class FooBar {}`;
    const output = `class Synvert {}`;
    mock({ "code.js": input });
    rewriter.processSync();
    expect(fs.readFileSync("code.js", "utf8")).toBe(output);
  });

  test("does not write new code to large file", () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      function () {
        this.withinFilesSync("*.js", function () {
          this.withNode(
            { nodeType: "ClassDeclaration", name: "FooBar" },
            () => {
              this.replace("name", { with: "Synvert" });
            },
          );
        });
      },
    );
    const input = `class FooBar {} //` + "a".repeat(10240);
    mock({ "code.js": input });
    rewriter.processSync();
    expect(fs.readFileSync("code.js", "utf8")).toBe(input);
  });

  test("async writes new code to file", async () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      async function () {
        await this.withinFiles("*.js", function () {
          this.withNode(
            { nodeType: "ClassDeclaration", name: "FooBar" },
            () => {
              this.replace("name", { with: "Synvert" });
            },
          );
        });
      },
    );
    const input = `class FooBar {}`;
    const output = `class Synvert {}`;
    mock({ "code.js": input });
    await rewriter.process();
    expect(await promisesFs.readFile("code.js", "utf8")).toBe(output);
  });

  test("does not async write new code to large file", async () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      async function () {
        await this.withinFiles("*.js", function () {
          this.withNode(
            { nodeType: "ClassDeclaration", name: "FooBar" },
            () => {
              this.replace("name", { with: "Synvert" });
            },
          );
        });
      },
    );
    const input = `class FooBar {} //` + "a".repeat(10240);
    mock({ "code.js": input });
    await rewriter.process();
    expect(await promisesFs.readFile("code.js", "utf8")).toBe(input);
  });
});

describe("processWithSandbox", () => {
  afterEach(() => {
    mock.restore();
  });

  test("does not write code to file", () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      function () {
        this.withinFiles("*.js", function () {
          this.withNode(
            { nodeType: "ClassDeclaration", name: "FooBar" },
            () => {
              this.replace("name", { with: "Synvert" });
            },
          );
        });
      },
    );
    const input = `class FooBar {}`;
    mock({ "code.js": input });
    rewriter.processWithSandboxSync();
    expect(fs.readFileSync("code.js", "utf8")).toBe(input);
  });

  test("async does not write code to file", async () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      async function () {
        await this.withinFiles("*.js", function () {
          this.withNode(
            { nodeType: "ClassDeclaration", name: "FooBar" },
            () => {
              this.replace("name", { with: "Synvert" });
            },
          );
        });
      },
    );
    const input = `class FooBar {}`;
    mock({ "code.js": input });
    await rewriter.processWithSandbox();
    expect(await promisesFs.readFile("code.js", "utf8")).toBe(input);
  });
});

describe("test", () => {
  beforeEach(() => {
    Configuration.respectGitignore = false;
  });

  afterEach(() => {
    Configuration.respectGitignore = true;
    mock.restore();
  });

  test("gets test results", () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      function () {
        this.withinFilesSync("*.js", function () {
          this.withNode(
            { nodeType: "ClassDeclaration", name: "FooBar" },
            () => {
              this.replace("name", { with: "Synvert" });
            },
          );
        });
      },
    );
    const input = `class FooBar {}`;
    mock({ "code.js": input });
    Configuration.rootPath = resolve(".");
    const results = rewriter.testSync();
    expect(results.length).toEqual(1);
    expect(results[0].filePath).toEqual("code.js");
    expect(results[0].affected).toBeTruthy();
    expect(results[0].conflicted).toBeFalsy();
    expect(results[0].actions).toEqual([
      { type: "replace", start: 6, end: 12, newCode: "Synvert" },
    ]);
  });

  test("async gets test results", async () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      async function () {
        await this.withinFiles("*.js", function () {
          this.withNode(
            { nodeType: "ClassDeclaration", name: "FooBar" },
            () => {
              this.replace("name", { with: "Synvert" });
            },
          );
        });
      },
    );
    const input = `class FooBar {}`;
    mock({ "code.js": input });
    Configuration.rootPath = resolve(".");
    const results = await rewriter.test();
    expect(results.length).toEqual(1);
    expect(results[0].filePath).toEqual("code.js");
    expect(results[0].affected).toBeTruthy();
    expect(results[0].conflicted).toBeFalsy();
    expect(results[0].actions).toEqual([
      { type: "replace", start: 6, end: 12, newCode: "Synvert" },
    ]);
  });
});

describe("addFile", () => {
  describe("sync", () => {
    test("adds a file", () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        function () {
          this.addFileSync("foobar.js", "foobar");
        },
      );
      rewriter.processSync();
      expect(fs.readFileSync("foobar.js", "utf-8")).toEqual("foobar");
      fs.rmSync("foobar.js");
    });

    test("does nothing if file exists", () => {
      fs.writeFileSync("foobar.js", "old");
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        function () {
          this.addFileSync("foobar.js", "foobar");
        },
      );
      rewriter.processSync();
      expect(fs.readFileSync("foobar.js", "utf-8")).toEqual("old");
      fs.rmSync("foobar.js");
    });

    test("returns test result", () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        function () {
          this.addFileSync("foobar.js", "foobar");
        },
      );
      const results = rewriter.testSync();
      expect(results[0].filePath).toEqual("foobar.js");
      expect(results[0].affected).toBeTruthy();
      expect(results[0].conflicted).toBeFalsy();
      expect(results[0].actions).toEqual([
        { type: "add_file", start: 0, end: 0, newCode: "foobar" },
      ]);
    });
  });

  describe("async", () => {
    test("async adds a file", async () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        async function () {
          await this.addFile("foobar.js", "foobar");
        },
      );
      await rewriter.process();
      expect(await promisesFs.readFile("foobar.js", "utf-8")).toEqual(
        "foobar",
      );
      await promisesFs.rm("foobar.js");
    });

    test("returns test result", async () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        async function () {
          this.addFileSync("foobar.js", "foobar");
        },
      );
      const results = await rewriter.test();
      expect(results[0].filePath).toEqual("foobar.js");
      expect(results[0].affected).toBeTruthy();
      expect(results[0].conflicted).toBeFalsy();
      expect(results[0].actions).toEqual([
        { type: "add_file", start: 0, end: 0, newCode: "foobar" },
      ]);
    });
  });
});

describe("removeFile", () => {
  describe("sync", () => {
    test("removes a file", () => {
      fs.writeFileSync("foobar.js", "foobar");
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        function () {
          this.removeFileSync("foobar.js");
        },
      );
      rewriter.processSync();
      expect(isValidFileSync("foobar.js")).toBeFalsy();
    });

    test("does nothing if file not exist", () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        function () {
          this.removeFileSync("foobar.js");
        },
      );
      rewriter.processSync();
      expect(isValidFileSync("foobar.js")).toBeFalsy();
    });

    test("returns test result", () => {
      fs.writeFileSync("foobar.js", "foobar");
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        function () {
          this.removeFileSync("foobar.js");
        },
      );
      const results = rewriter.testSync();
      expect(results[0].filePath).toEqual("foobar.js");
      expect(results[0].affected).toBeTruthy();
      expect(results[0].conflicted).toBeFalsy();
      expect(results[0].actions).toEqual([
        { type: "remove_file", start: 0, end: -1 },
      ]);
      fs.unlinkSync("foobar.js");
    });
  });

  describe("async", () => {
    test("async removes a file", async () => {
      await promisesFs.writeFile("foobar.js", "foobar");
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        async function () {
          await this.removeFile("foobar.js");
        },
      );
      await rewriter.process();
      expect(await isValidFile("foobar.js")).toBeFalsy();
    });

    test("returns test result", async () => {
      fs.writeFileSync("foobar.js", "foobar");
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        async function () {
          this.removeFileSync("foobar.js");
        },
      );
      const results = await rewriter.test();
      expect(results[0].filePath).toEqual("foobar.js");
      expect(results[0].affected).toBeTruthy();
      expect(results[0].conflicted).toBeFalsy();
      expect(results[0].actions).toEqual([
        { type: "remove_file", start: 0, end: -1 },
      ]);
      await promisesFs.unlink("foobar.js");
    });
  });
});

describe("renameFile", () => {
  beforeEach(() => {
    Configuration.respectGitignore = false;
  });

  afterEach(() => {
    Configuration.respectGitignore = true;
    mock.restore();
  });

  describe("sync", () => {
    test("renames a file", () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        function () {
          this.renameFileSync("foo.js", "bar.js");
        },
      );
      mock({ "foo.js": "foobar" });
      rewriter.processSync();
      expect(fs.readFileSync("bar.js", "utf8")).toEqual("foobar");
    });

    test("renames multiple files", () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        function () {
          this.renameFileSync("*.js", (filename: string) =>
            filename.replace(".js", ".ts"),
          );
        },
      );
      mock({ "foo.js": "foo", "bar.js": "bar" });
      rewriter.processSync();
      expect(fs.readFileSync("foo.ts", "utf8")).toEqual("foo");
      expect(fs.readFileSync("bar.ts", "utf8")).toEqual("bar");
    });
  });

  describe("async", () => {
    test("async renames a file", async () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        async function () {
          await this.renameFile("foo.js", "bar.js");
        },
      );
      mock({ "foo.js": "foobar" });
      await rewriter.process();
      expect(await promisesFs.readFile("bar.js", "utf8")).toEqual("foobar");
    });

    test("async renames multiple files", async () => {
      const rewriter = new Rewriter<Node>(
        "snippet group",
        "snippet name",
        async function () {
          await this.renameFile("*.js", (filename: string) =>
            filename.replace(".js", ".ts"),
          );
        },
      );
      mock({ "foo.js": "foo", "bar.js": "bar" });
      await rewriter.process();
      expect(await promisesFs.readFile("foo.ts", "utf8")).toEqual("foo");
      expect(await promisesFs.readFile("bar.ts", "utf8")).toEqual("bar");
    });
  });
});

describe("group and name", () => {
  test("get group and name", () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      function () {},
    );
    expect(rewriter.group).toBe("snippet group");
    expect(rewriter.name).toBe("snippet name");
  });
});

describe("description", () => {
  test("set and get description", () => {
    const rewriter = new Rewriter<Node>(
      "snippet group",
      "snippet name",
      function () {
        this.description(`
        this is a snippet description.

        foo.bar
        `);
      },
    );
    rewriter.process();
    expect(rewriter.description()).toBe(
      `this is a snippet description.\n\nfoo.bar\n`,
    );
  });
});

describe("addSnippet", () => {
  test("adds and gets sub snippet", () => {
    new Rewriter<Node>("group1", "name1", function () {});
    new Rewriter<Node>("group2", "name2", function () {});
    const rewriter = new Rewriter<Node>("group3", "name3", function () {
      this.addSnippetSync("group1", "name1");
      this.addSnippetSync("group2", "name2");
    });
    rewriter.processSync();
    const subSnippets = rewriter.subSnippets;
    expect(subSnippets.length).toBe(2);
    expect(subSnippets[0].group).toBe("group1");
    expect(subSnippets[0].name).toBe("name1");
    expect(subSnippets[1].group).toBe("group2");
    expect(subSnippets[1].name).toBe("name2");
  });

  test("async adds and gets sub snippet", async () => {
    new Rewriter<Node>("group1", "name1", () => {});
    new Rewriter<Node>("group2", "name2", () => {});
    const rewriter = new Rewriter<Node>("group3", "name3", async function () {
      await this.addSnippet("group1", "name1");
      await this.addSnippet("group2", "name2");
    });
    await rewriter.process();
    const subSnippets = rewriter.subSnippets;
    expect(subSnippets.length).toBe(2);
    expect(subSnippets[0].group).toBe("group1");
    expect(subSnippets[0].name).toBe("name1");
    expect(subSnippets[1].group).toBe("group2");
    expect(subSnippets[1].name).toBe("name2");
  });
});

describe("nodeVersion", () => {
  test("set and get nodeVersion", () => {
    const rewriter = new Rewriter<Node>("group", "name", function () {
      this.ifNode("10.14.0");
    });
    expect(rewriter.nodeVersion).toBe(undefined);
    rewriter.process();
    expect(rewriter.nodeVersion).not.toBe(undefined);
  });
});

describe("npmVersion", () => {
  test("set and get npmVersion", () => {
    const rewriter = new Rewriter<Node>("group", "name", function () {
      this.ifNpm("compare-versions", ">= 1.0.0");
    });
    expect(rewriter.npmVersion).toBe(undefined);
    rewriter.processSync();
    expect(rewriter.npmVersion).not.toBe(undefined);
  });
});

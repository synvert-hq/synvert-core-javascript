import fs, { promises as promisesFs } from "fs";
import mock from "mock-fs";
import { resolve } from "path";

import Configuration from "../src/configuration";
import Rewriter from "../src/rewriter";
import { SourceType } from "../src/types/options";
import { isValidFile, isValidFileSync } from "../src/utils";

describe("static register", () => {
  it("registers and fetches", () => {
    const rewriter = new Rewriter("group", "name", () => {});
    expect(Rewriter.fetch("group", "name")).toBe(rewriter);

    expect(Rewriter.fetch("new group", "name")).toBeUndefined();
    expect(Rewriter.fetch("group", "new name")).toBeUndefined();
  });

  it("clears all rewriters", () => {
    const rewriter = new Rewriter("group", "name", () => {});
    expect(Rewriter.fetch("group", "name")).toBe(rewriter);

    Rewriter.clear();

    expect(Rewriter.fetch("group", "name")).toBeUndefined();
  });

  describe("configure", () => {
    it("sets sourceType option", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        configure({ sourceType: SourceType.SCRIPT });
      });
      expect(rewriter.options.sourceType).toBe(SourceType.MODULE);
      rewriter.processSync();
      expect(rewriter.options.sourceType).toBe(SourceType.SCRIPT);
    });
  });

  describe("process", () => {
    afterEach(() => {
      mock.restore();
    });

    test("writes new code to file", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        withinFilesSync("*.js", function () {
          withNode(
            { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
            () => {
              replace("id", { with: "Synvert" });
            }
          );
        });
      });
      const input = `class FooBar {}`;
      const output = `class Synvert {}`;
      mock({ "code.js": input });
      rewriter.processSync();
      expect(fs.readFileSync("code.js", "utf8")).toBe(output);
    });

    test("async writes new code to file", async () => {
      const rewriter = new Rewriter(
        "snippet group",
        "snippet name",
        async () => {
          await withinFiles("*.js", function () {
            withNode(
              { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
              () => {
                replace("id", { with: "Synvert" });
              }
            );
          });
        }
      );
      const input = `class FooBar {}`;
      const output = `class Synvert {}`;
      mock({ "code.js": input });
      await rewriter.process();
      expect(await promisesFs.readFile("code.js", "utf8")).toBe(output);
    });
  });

  describe("processWithSandbox", () => {
    afterEach(() => {
      mock.restore();
    });

    test("does not write code to file", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        withinFiles("*.js", function () {
          withNode(
            { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
            () => {
              replace("id", { with: "Synvert" });
            }
          );
        });
      });
      const input = `class FooBar {}`;
      mock({ "code.js": input });
      rewriter.processWithSandboxSync();
      expect(fs.readFileSync("code.js", "utf8")).toBe(input);
    });

    test("async does not write code to file", async () => {
      const rewriter = new Rewriter(
        "snippet group",
        "snippet name",
        async () => {
          await withinFiles("*.js", function () {
            withNode(
              { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
              () => {
                replace("id", { with: "Synvert" });
              }
            );
          });
        }
      );
      const input = `class FooBar {}`;
      mock({ "code.js": input });
      await rewriter.processWithSandbox();
      expect(await promisesFs.readFile("code.js", "utf8")).toBe(input);
    });
  });

  describe("test", () => {
    afterEach(() => {
      mock.restore();
    });

    test("gets test results", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        withinFilesSync("*.js", function () {
          withNode(
            { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
            () => {
              replace("id", { with: "Synvert" });
            }
          );
        });
      });
      const input = `class FooBar {}`;
      mock({ "code.js": input });
      Configuration.rootPath = resolve(".");
      const results = rewriter.testSync();
      expect(results.length).toEqual(1);
      expect(results[0].filePath).toEqual("code.js");
      expect(results[0].affected).toBeTruthy();
      expect(results[0].conflicted).toBeFalsy();
      expect(results[0].actions).toEqual([
        { start: 6, end: 12, newCode: "Synvert" },
      ]);
    });

    test("async gets test results", async () => {
      const rewriter = new Rewriter(
        "snippet group",
        "snippet name",
        async () => {
          await withinFiles("*.js", function () {
            withNode(
              { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
              () => {
                replace("id", { with: "Synvert" });
              }
            );
          });
        }
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
        { start: 6, end: 12, newCode: "Synvert" },
      ]);
    });
  });

  describe("addFile", () => {
    test("adds a file", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        addFileSync("foobar.js", "foobar");
      });
      rewriter.processSync();
      expect(fs.readFileSync("foobar.js", "utf-8")).toEqual("foobar");
      fs.rmSync("foobar.js");
    });

    test("does nothing if file exists", () => {
      fs.writeFileSync("foobar.js", "old");
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        addFileSync("foobar.js", "foobar");
      });
      rewriter.processSync();
      expect(fs.readFileSync("foobar.js", "utf-8")).toEqual("old");
      fs.rmSync("foobar.js");
    });

    test("async adds a file", async () => {
      const rewriter = new Rewriter(
        "snippet group",
        "snippet name",
        async () => {
          await addFile("foobar.js", "foobar");
        }
      );
      await rewriter.process();
      expect(await promisesFs.readFile("foobar.js", "utf-8")).toEqual("foobar");
      await promisesFs.rm("foobar.js");
    });
  });

  describe("removeFile", () => {
    it("removes a file", () => {
      fs.writeFileSync("foobar.js", "foobar");
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        removeFileSync("foobar.js");
      });
      rewriter.processSync();
      expect(isValidFileSync("foobar.js")).toBeFalsy();
    });

    test("does nothing if file not exist", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        removeFileSync("foobar.js");
      });
      rewriter.processSync();
      expect(isValidFileSync("foobar.js")).toBeFalsy();
    });

    test("async removes a file", async () => {
      await promisesFs.writeFile("foobar.js", "foobar");
      const rewriter = new Rewriter(
        "snippet group",
        "snippet name",
        async () => {
          await removeFile("foobar.js");
        }
      );
      await rewriter.process();
      expect(await isValidFile("foobar.js")).toBeTruthy();
      await promisesFs.rm("foobar.js");
    });
  });

  describe("group and name", () => {
    test("get group and name", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {});
      expect(rewriter.group).toBe("snippet group");
      expect(rewriter.name).toBe("snippet name");
    });
  });

  describe("description", () => {
    test("set and get description", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        description("this is a snippet description.");
      });
      rewriter.process();
      expect(rewriter.description()).toBe(`this is a snippet description.`);
    });
  });

  describe("addSnippet", () => {
    test("adds and gets sub snippet", () => {
      new Rewriter("group1", "name1", () => {});
      new Rewriter("group2", "name2", () => {});
      const rewriter = new Rewriter("group3", "name3", () => {
        addSnippetSync("group1", "name1");
        addSnippetSync("group2", "name2");
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
      new Rewriter("group1", "name1", () => {});
      new Rewriter("group2", "name2", () => {});
      const rewriter = new Rewriter("group3", "name3", async () => {
        await addSnippet("group1", "name1");
        await addSnippet("group2", "name2");
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
      const rewriter = new Rewriter("group", "name", () => {
        ifNode("10.14.0");
      });
      expect(rewriter.nodeVersion).toBe(undefined);
      rewriter.process();
      expect(rewriter.nodeVersion).not.toBe(undefined);
    });
  });

  describe("npmVersion", () => {
    test("set and get npmVersion", () => {
      const rewriter = new Rewriter("group", "name", () => {
        ifNpm("compare-versions", ">= 1.0.0");
      });
      expect(rewriter.npmVersion).toBe(undefined);
      rewriter.process();
      expect(rewriter.npmVersion).not.toBe(undefined);
    });
  });
});

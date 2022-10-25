import fs from "fs";
import mock from "mock-fs";
import { resolve } from "path";

import Configuration from "../src/configuration";
import Rewriter from "../src/rewriter";
import { SourceType } from "../src/types/options";

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
    const rewriter = new Rewriter("snippet group", "snippet name", () => {
      configure({ sourceType: SourceType.SCRIPT });
    });
    expect(rewriter.options.sourceType).toBe(SourceType.MODULE);
    rewriter.process();
    expect(rewriter.options.sourceType).toBe(SourceType.SCRIPT);
  });

  describe("process", () => {
    afterEach(() => {
      mock.restore();
    });

    test("writes new code to file", () => {
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
      const output = `class Synvert {}`;
      mock({ "code.js": input });
      rewriter.process();
      expect(fs.readFileSync("code.js", "utf8")).toBe(output);
    });
  });

  describe("processWithSandbox", () => {
    afterEach(() => {
      mock.restore();
    });

    test("writes new code to file", () => {
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
      rewriter.processWithSandbox();
      expect(fs.readFileSync("code.js", "utf8")).toBe(input);
    });
  });

  describe("test", () => {
    afterEach(() => {
      mock.restore();
    });

    test("test", () => {
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
      Configuration.rootPath = resolve(".");
      const results = rewriter.test();
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
        addFile("foobar.js", "foobar");
      });
      rewriter.process();
      expect(fs.existsSync("foobar.js")).toBeTruthy();
      fs.rmSync("foobar.js");
    });

    test("does nothing in sandbox mode", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        addFile("foobar.js", "foobar");
      });
      rewriter.processWithSandbox();
      expect(fs.existsSync("foobar.js")).toBeFalsy();
    });
  });

  describe("removeFile", () => {
    it("removes a file", () => {
      fs.writeFileSync("foobar.js", "foobar");
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        removeFile("foobar.js");
      });
      rewriter.process();
      expect(fs.existsSync("foobar.js")).toBeFalsy();
    });

    test("does nothing if file not exist", () => {
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        removeFile("foobar.js");
      });
      rewriter.process();
      expect(fs.existsSync("foobar.js")).toBeFalsy();
    });

    test("does nothing in sandbox mode", () => {
      fs.writeFileSync("foobar.js", "foobar");
      const rewriter = new Rewriter("snippet group", "snippet name", () => {
        removeFile("foobar.js");
      });
      rewriter.processWithSandbox();
      expect(fs.existsSync("foobar.js")).toBeTruthy();
      fs.rmSync("foobar.js");
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

  describe("subSnippets", () => {
    test("add and get sub snippet", () => {
      new Rewriter("group1", "name1", () => {});
      new Rewriter("group2", "name2", () => {});
      const rewriter = new Rewriter("group3", "name3", () => {
        addSnippet("group1", "name1");
        addSnippet("group2", "name2");
      });
      rewriter.process();
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

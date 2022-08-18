import fs from "fs";
import mock from "mock-fs";
import { RewriterNotFoundError } from "../src/error";

import Rewriter from "../src/rewriter";
import { SourceType } from "../src/types/options";

describe("static register", () => {
  it("registers and fetches", () => {
    const rewriter = new Rewriter("group", "name", () => {});
    expect(Rewriter.fetch("group", "name")).toBe(rewriter);

    expect(() => {
      Rewriter.fetch("new group", "name");
    }).toThrowError(
      new RewriterNotFoundError("Rewriter new group name not found")
    );
    expect(() => {
      Rewriter.fetch("group", "new name");
    }).toThrowError(
      new RewriterNotFoundError("Rewriter group new name not found")
    );
  });

  it("calls", () => {
    let run = false;
    const rewriter = new Rewriter("group", "name", () => {
      run = true;
    });
    Rewriter.call("group", "name");
    expect(run).toBe(true);
  });

  it("calls runInstance true", () => {
    let run = false;
    new Rewriter("group", "name", () => {
      withinFiles("**/*.js", () => {
        run = true;
      });
    });
    Rewriter.call("group", "name", { runInstance: true });
    expect(run).toBe(true);
  });

  it("calls runInstance false", () => {
    let run = false;
    new Rewriter("group", "name", () => {
      withinFiles("**/*.js", () => {
        run = true;
      });
    });
    Rewriter.call("group", "name", { runInstance: false });
    expect(run).toBe(false);
  });

  it("executes", () => {
    let run = false;
    Rewriter.execute(() => {
      run = true;
    });
    expect(run).toBe(true);
  });

  describe("configure", () => {
    const rewriter = new Rewriter("snippet group", "snippet name", () => {
      configure({ sourceType: SourceType.Script });
    });
    expect(rewriter.options.sourceType).toBe(SourceType.Module);
    rewriter.process();
    expect(rewriter.options.sourceType).toBe(SourceType.Script);
  });

  describe("process", () => {
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
      mock.restore();
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

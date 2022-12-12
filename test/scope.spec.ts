import Rewriter from "../src/rewriter";
import Instance from "../src/instance";
import { WithinScope, GotoScope } from "../src/scope";
import { parse } from "./helper";

describe("Scope", () => {
  const rewriter = new Rewriter("snippet group", "snippet name", () => {});
  const instance = new Instance(rewriter, "", function () {});

  describe("WithinScope", () => {
    const source = `class FooBar {}`;
    const node = parse(source);

    describe("processSync", () => {
      beforeAll(() => {
        instance.currentNode = node;
      });

      describe("rules", () => {
        test("does not call function if no matching node", () => {
          let run = false;
          new WithinScope(
            instance,
            { nodeType: "ClassDeclaration", id: { name: "Synvert" } },
            {},
            function () {
              run = true;
            }
          ).processSync();
          expect(run).toBe(false);
        });

        test("calls function if there is a matching node", () => {
          let run = false;
          new WithinScope(
            instance,
            { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
            {},
            function () {
              run = true;
            }
          ).processSync();
          expect(run).toBe(true);
        });
      });

      describe("nql", () => {
        test("does not call function if no matching node", () => {
          let run = false;
          new WithinScope(
            instance,
            ".ClassDeclaration[id.name=Synvert]",
            {},
            function () {
              run = true;
            }
          ).processSync();
          expect(run).toBe(false);
        });

        test("calls function if there is a matching node", () => {
          let run = false;
          new WithinScope(
            instance,
            ".ClassDeclaration[id.name=FooBar]",
            {},
            function () {
              run = true;
            }
          ).processSync();
          expect(run).toBe(true);
        });
      });
    });

    describe("process", () => {
      beforeAll(() => {
        instance.currentNode = node;
      });

      describe("rules", () => {
        test("does not call function if no matching node", async () => {
          let run = false;
          const scope = new WithinScope(
            instance,
            { nodeType: "ClassDeclaration", id: { name: "Synvert" } },
            {},
            function () {
              run = true;
            }
          );
          await scope.process();
          expect(run).toBe(false);
        });

        test("calls function if there is a matching node", async () => {
          let run = false;
          const scope = new WithinScope(
            instance,
            { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
            {},
            function () {
              run = true;
            }
          );
          await scope.process();
          expect(run).toBe(true);
        });
      });

      describe("nql", () => {
        test("does not call function if no matching node", async () => {
          let run = false;
          const scope = new WithinScope(
            instance,
            ".ClassDeclaration[id.name=Synvert]",
            {},
            function () {
              run = true;
            }
          );
          await scope.process();
          expect(run).toBe(false);
        });

        test("calls function if there is a matching node", async () => {
          let run = false;
          const scope = new WithinScope(
            instance,
            ".ClassDeclaration[id.name=FooBar]",
            {},
            function () {
              run = true;
            }
          );
          await scope.process();
          expect(run).toBe(true);
        });
      });
    });
  });

  describe("GotoScope", () => {
    const source = `
      class FooBar {
        foo() {}
        bar() {}
      }
    `;
    const node = parse(source);

    describe("processSync", () => {
      beforeAll(() => {
        instance.currentNode = node;
      });

      test("does not call function if no matching node", () => {
        let run = false;
        new GotoScope(instance, "name", function () {
          run = true;
        }).processSync();
        expect(run).toBe(false);
      });

      test("calls function if there is a matching node", () => {
        let run = false;
        new GotoScope(instance, "id", function () {
          run = true;
        }).processSync();
        expect(run).toBe(true);
      });

      test("calls function if there is a matching node with nested keys", () => {
        let run = false;
        new GotoScope(instance, "body.body.0", function () {
          run = true;
        }).processSync();
        expect(run).toBe(true);
      });
    });

    describe("process", () => {
      beforeAll(() => {
        instance.currentNode = node;
      });

      test("does not call function if no matching node", async () => {
        let run = false;
        const scope = new GotoScope(instance, "name", function () {
          run = true;
        });
        await scope.process();
        expect(run).toBe(false);
      });

      test("calls function if there is a matching node", async () => {
        let run = false;
        const scope = new GotoScope(instance, "id", function () {
          run = true;
        });
        await scope.process();
        expect(run).toBe(true);
      });

      test("calls function if there is a matching node with nested keys", async () => {
        let run = false;
        const scope = new GotoScope(instance, "body.body.0", function () {
          run = true;
        });
        await scope.process();
        expect(run).toBe(true);
      });
    });
  });
});

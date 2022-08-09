import Rewriter from "../src/rewriter";
import Instance from "../src/instance";
import { QueryScope, WithinScope, GotoScope } from "../src/scope";
import { parse } from "./helper";

describe("Scope", () => {
  const rewriter = new Rewriter("snippet group", "snippet name", () => {});
  const instance = new Instance(rewriter, "", function () {});

  describe("QueryScope", () => {
    const source = `class FooBar {}`;
    const node = parse(source);

    describe("process", () => {
      beforeAll(() => {
        instance.currentNode = node;
      });

      test("does not call function if no matching node", () => {
        let run = false;
        new QueryScope(
          instance,
          ".ClassDeclaration[id.name=Synvert]",
          function () {
            run = true;
          }
        ).process();
        expect(run).toBe(false);
      });

      test("calls function if there is a matching node", () => {
        let run = false;
        new QueryScope(
          instance,
          ".ClassDeclaration[id.name=FooBar]",
          function () {
            run = true;
          }
        ).process();
        expect(run).toBe(true);
      });
    });
  });

  describe("WithinScope", () => {
    const source = `class FooBar {}`;
    const node = parse(source);

    describe("process", () => {
      beforeAll(() => {
        instance.currentNode = node;
      });

      test("does not call function if no matching node", () => {
        let run = false;
        new WithinScope(
          instance,
          { nodeType: "ClassDeclaration", id: { name: "Synvert" } },
          function () {
            run = true;
          }
        ).process();
        expect(run).toBe(false);
      });

      test("calls function if there is a matching node", () => {
        let run = false;
        new WithinScope(
          instance,
          { nodeType: "ClassDeclaration", id: { name: "FooBar" } },
          function () {
            run = true;
          }
        ).process();
        expect(run).toBe(true);
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

    describe("process", () => {
      beforeAll(() => {
        instance.currentNode = node;
      });

      test("does not call function if no matching node", () => {
        let run = false;
        new GotoScope(instance, "name", function () {
          run = true;
        }).process();
        expect(run).toBe(false);
      });

      test("calls function if there is a matching node", () => {
        let run = false;
        new GotoScope(instance, "id", function () {
          run = true;
        }).process();
        expect(run).toBe(true);
      });

      test("calls function if there is a matching node", () => {
        let run = false;
        new GotoScope(instance, "body.body.last", function () {
          run = true;
        }).process();
        expect(run).toBe(true);
      });
    });
  });
});

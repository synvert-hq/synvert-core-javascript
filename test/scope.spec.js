const espree = require("xinminlabs-espree");

const { QueryScope, WithinScope, GotoScope } = require("../lib/scope");
const Instance = require("../lib/instance");

const parse = (code) => espree.parse(code, { ecmaVersion: "latest", loc: true, sourceFile: "code.js" }).body[0];

describe("QueryScope", () => {
  const source = `class FooBar {}`;
  const node = parse(source);
  const instance = new Instance({}, "", function () {});

  describe("process", () => {
    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new QueryScope(instance, ".ClassDeclaration[id.name=Synvert]", function () {
        run = true;
      }).process();
      expect(run).toBe(false);
    });

    test("calls function if there is a matching node", () => {
      let run = false;
      new QueryScope(instance, ".ClassDeclaration[id.name=FooBar]", function () {
        run = true;
      }).process();
      expect(run).toBe(true);
    });
  });
});

describe("WithinScope", () => {
  const source = `class FooBar {}`;
  const node = parse(source);
  const instance = new Instance({}, "", function () {});

  describe("process", () => {
    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new WithinScope(instance, { type: "ClassDeclaration", id: { name: "Synvert" } }, function () {
        run = true;
      }).process();
      expect(run).toBe(false);
    });

    test("calls function if there is a matching node", () => {
      let run = false;
      new WithinScope(instance, { type: "ClassDeclaration", id: { name: "FooBar" } }, function () {
        run = true;
      }).process();
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
  const instance = new Instance({}, "", function () {});

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

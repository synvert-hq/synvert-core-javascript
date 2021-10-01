const espree = require("espree");

const { IfExistCondition, UnlessExistCondition, IfOnlyExistCondition, IfAllCondition } = require("../lib/condition");
const Instance = require("../lib/instance");

describe("IfExistCondition", () => {
  const source = `
    'use strict'

    this.foobar
  `;
  const node = espree.parse(source, { ecmaVersion: "latest", loc: true, sourceFile: "code.js" });
  const instance = new Instance({}, "", function () {});

  describe("process", () => {
    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new IfExistCondition(
        instance,
        { type: "ExpressionStatement", expression: { type: "Literal", value: "strict" } },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(false);
    });

    test("calls function if there is a matching node", () => {
      let run = false;
      new IfExistCondition(
        instance,
        { type: "ExpressionStatement", expression: { type: "Literal", value: "use strict" } },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(true);
    });
  });
});

describe("UnlessExistCondition", () => {
  const source = `
    'use strict'

    this.foobar
  `;
  const node = espree.parse(source, { ecmaVersion: "latest", loc: true, sourceFile: "code.js" });
  const instance = new Instance({}, "", function () {});

  describe("process", () => {
    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new UnlessExistCondition(
        instance,
        { type: "ExpressionStatement", expression: { type: "Literal", value: "strict" } },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(true);
    });

    test("calls function if there is a matching node", () => {
      let run = false;
      new UnlessExistCondition(
        instance,
        { type: "ExpressionStatement", expression: { type: "Literal", value: "use strict" } },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(false);
    });
  });
});

describe("IfOnlyExistCondition", () => {
  describe("process", () => {
    const source = `
      'use strict'

      this.foobar
    `;
    const node = espree.parse(source, { ecmaVersion: "latest", loc: true, sourceFile: "code.js" });
    const instance = new Instance({}, "", function () {});

    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new IfOnlyExistCondition(
        instance,
        { type: "ExpressionStatement", expression: { type: "Literal", value: "strict" } },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(false);
    });
  });

  describe("process", () => {
    const source = `
      'use strict'
    `;
    const node = espree.parse(source, { ecmaVersion: "latest", loc: true, sourceFile: "code.js" });
    const instance = new Instance({}, "", function () {});

    beforeAll(() => {
      instance.currentNode = node;
    });

    test("calls function if there is a matching node", () => {
      let run = false;
      new IfOnlyExistCondition(
        instance,
        { type: "ExpressionStatement", expression: { type: "Literal", value: "use strict" } },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(true);
    });
  });
});

describe("IfAllCondition", () => {
  const source = `
    import { a, b } from 'x';
  `;
  const node = espree.parse(source, { ecmaVersion: "latest", loc: true, sourceType: 'module', sourceFile: "code.js" });
  const instance = new Instance({}, "", function () {});

  describe("process", () => {
    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new IfAllCondition(
        instance,
        { type: "ImportDefaultSpecifier" },
        { match: { local: { name: { in: ['a', 'b'] } } } },
        function () { run = true },
        function () { run = true }
      ).process();
      expect(run).toBe(false);
    });

    test("calls function if match", () => {
      let run = false;
      new IfAllCondition(
        instance,
        { type: "ImportSpecifier" },
        { match: { local: { name: { in: ['a', 'b'] } } } },
        function () { run = true },
        function () { run = false }
      ).process();
      expect(run).toBe(true);
    });

    test("calls function if not match", () => {
      let run = false;
      new IfAllCondition(
        instance,
        { type: "ImportSpecifier" },
        { match: { local: { name: { in: ['c', 'd'] } } } },
        function () { run = false },
        function () { run = true }
      ).process();
      expect(run).toBe(true);
    });
  });
});

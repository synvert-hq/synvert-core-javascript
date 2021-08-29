const espree = require("espree");

const { IfExistCondition, UnlessExistCondition } = require("../lib/condition");
const Instance = require("../lib/instance");

describe("IfExistsCondition", () => {
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

describe("UnlessExistsCondition", () => {
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

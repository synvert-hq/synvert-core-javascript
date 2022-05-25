import {
  IfExistCondition,
  UnlessExistCondition,
  IfOnlyExistCondition,
  IfAllCondition,
} from "../src/condition";
import Instance from "../src/instance";
import { parse } from "./helper";

describe("IfExistCondition", () => {
  const source = `
    $.ajax({ url, method })
  `;
  const node = parse(source);
  const instance = new Instance("", function () {});

  describe("process", () => {
    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new IfExistCondition(
        instance,
        { type: "MemberExpression", object: "jQuery", property: "ajax" },
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
        { type: "MemberExpression", object: "$", property: "ajax" },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(true);
    });

    test("calls function if there is a matching node in child node", () => {
      let run = false;
      new IfExistCondition(
        instance,
        { type: "MemberExpression", object: "$", property: "ajax" },
        { in: "expression" },
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
    $.ajax({ url, method })
  `;
  const node = parse(source);
  const instance = new Instance("", function () {});

  describe("process", () => {
    beforeAll(() => {
      instance.currentNode = node;
    });

    test("calls function if no matching node", () => {
      let run = false;
      new UnlessExistCondition(
        instance,
        { type: "MemberExpression", object: "jQuery", property: "ajax" },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(true);
    });

    test("does not call function if there is a matching node", () => {
      let run = false;
      new UnlessExistCondition(
        instance,
        { type: "MemberExpression", object: "$", property: "ajax" },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(false);
    });

    test("calls function if no matching node in child node", () => {
      let run = false;
      new UnlessExistCondition(
        instance,
        { type: "MemberExpression", object: "$", property: "ajax" },
        { in: "expression.callee" },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(true);
    });
  });
});

describe("IfOnlyExistCondition", () => {
  describe("process", () => {
    const source = `
      'use strict'

      this.foobar
    `;
    const node = parse(source, { firstStatement: false });
    const instance = new Instance("", function () {});

    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new IfOnlyExistCondition(
        instance,
        {
          type: "ExpressionStatement",
          expression: { type: "Literal", value: "strict" },
        },
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
    const node = parse(source, { firstStatement: false });
    const instance = new Instance("", function () {});

    beforeAll(() => {
      instance.currentNode = node;
    });

    test("calls function if there is a matching node", () => {
      let run = false;
      new IfOnlyExistCondition(
        instance,
        {
          type: "ExpressionStatement",
          expression: { type: "Literal", value: "use strict" },
        },
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
  const node = parse(source);
  const instance = new Instance("", function () {});

  describe("process", () => {
    beforeAll(() => {
      instance.currentNode = node;
    });

    test("does not call function if no matching node", () => {
      let run = false;
      new IfAllCondition(
        instance,
        { type: "ImportDefaultSpecifier" },
        { match: { local: { name: { in: ["a", "b"] } } } },
        function () {
          run = true;
        },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(false);
    });

    test("calls function if match", () => {
      let run = false;
      new IfAllCondition(
        instance,
        { type: "ImportSpecifier" },
        { match: { local: { name: { in: ["a", "b"] } } } },
        function () {
          run = true;
        },
        function () {
          run = false;
        }
      ).process();
      expect(run).toBe(true);
    });

    test("calls function if not match", () => {
      let run = false;
      new IfAllCondition(
        instance,
        { type: "ImportSpecifier" },
        { match: { local: { name: { in: ["c", "d"] } } } },
        function () {
          run = false;
        },
        function () {
          run = true;
        }
      ).process();
      expect(run).toBe(true);
    });
  });
});

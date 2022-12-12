import Rewriter from "../src/rewriter";
import Instance from "../src/instance";
import {
  IfExistCondition,
  UnlessExistCondition,
  IfOnlyExistCondition,
  IfAllCondition,
} from "../src/condition";
import { parse } from "./helper";
import mock from "mock-fs";

describe("Condition", () => {
  const rewriter = new Rewriter("snippet group", "snippet name", () => {});
  const instance = new Instance(rewriter, "", function () {});

  describe("IfExistCondition", () => {
    const source = `
      $.ajax({ url, method })
    `;
    const node = parse(source);

    describe("processSync", () => {
      beforeEach(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });
      afterEach(() => {
        mock.restore();
      });

      test("does not call function if no matching node", () => {
        let run = false;
        new IfExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "jQuery", property: "ajax" },
          {},
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(false);
      });

      test("calls function if there is a matching node", () => {
        let run = false;
        new IfExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          {},
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });

      test("calls function if there is a matching node in child node", () => {
        let run = false;
        new IfExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          { in: "expression" },
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });

      test("calls else function if no matching node", () => {
        let run = false;
        new IfExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "jQuery", property: "ajax" },
          {},
          function () {
            run = false;
          },
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });
    });

    describe("process", () => {
      beforeEach(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("does not call function if no matching node", async () => {
        let run = false;
        const condition = new IfExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "jQuery", property: "ajax" },
          {},
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(false);
      });

      test("calls function if there is a matching node", async () => {
        let run = false;
        const condition = new IfExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          {},
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });

      test("calls function if there is a matching node in child node", async () => {
        let run = false;
        const condition = new IfExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          { in: "expression" },
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });

      test("calls else function if no matching node", async () => {
        let run = false;
        const condition = new IfExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "jQuery", property: "ajax" },
          {},
          function () {
            run = false;
          },
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });
    });
  });

  describe("UnlessExistCondition", () => {
    const source = `
      $.ajax({ url, method })
    `;
    const node = parse(source);

    describe("processSync", () => {
      beforeEach(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("calls function if no matching node", () => {
        let run = false;
        new UnlessExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "jQuery", property: "ajax" },
          {},
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });

      test("does not call function if there is a matching node", () => {
        let run = false;
        new UnlessExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          {},
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(false);
      });

      test("calls function if no matching node in child node", () => {
        let run = false;
        new UnlessExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          { in: "expression.callee" },
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });

      test("calls else function if there is a matching node", () => {
        let run = false;
        new UnlessExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          {},
          function () {
            run = false;
          },
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });
    });

    describe("process", () => {
      beforeEach(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("calls function if no matching node", async () => {
        let run = false;
        const condition = new UnlessExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "jQuery", property: "ajax" },
          {},
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });

      test("does not call function if there is a matching node", async () => {
        let run = false;
        const condition = new UnlessExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          {},
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(false);
      });

      test("calls function if no matching node in child node", async () => {
        let run = false;
        const condition = new UnlessExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          { in: "expression.callee" },
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });

      test("calls else function if there is a matching node", async () => {
        let run = false;
        const condition = new UnlessExistCondition(
          instance,
          { nodeType: "MemberExpression", object: "$", property: "ajax" },
          {},
          function () {
            run = false;
          },
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });
    });
  });

  describe("IfOnlyExistCondition", () => {
    describe("processSync", () => {
      const source = `
        'use strict'

        this.foobar
      `;
      const node = parse(source, { firstStatement: false });

      beforeEach(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("does not call function if no matching node", () => {
        let run = false;
        new IfOnlyExistCondition(
          instance,
          {
            nodeType: "ExpressionStatement",
            expression: { nodeType: "Literal", value: "strict" },
          },
          {},
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(false);
      });
    });

    describe("processSync", () => {
      const source = `
        'use strict'
      `;
      const node = parse(source, { firstStatement: false });

      beforeEach(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("calls function if there is only one matching node", () => {
        let run = false;
        new IfOnlyExistCondition(
          instance,
          {
            nodeType: "ExpressionStatement",
            expression: { nodeType: "Literal", value: "use strict" },
          },
          {},
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });

      test("calls else function if there is more than one matching node", () => {
        let run = false;
        new IfOnlyExistCondition(
          instance,
          {
            nodeType: "Literal",
          },
          {},
          function () {
            run = false;
          },
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });
    });

    describe("process", () => {
      const source = `
        'use strict'

        this.foobar
      `;
      const node = parse(source, { firstStatement: false });

      beforeEach(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("does not call function if no matching node", async () => {
        let run = false;
        const condition = new IfOnlyExistCondition(
          instance,
          {
            nodeType: "ExpressionStatement",
            expression: { nodeType: "Literal", value: "strict" },
          },
          {},
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(false);
      });
    });

    describe("process", () => {
      const source = `
        'use strict'
      `;
      const node = parse(source, { firstStatement: false });

      beforeEach(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("calls function if there is only one matching node", async () => {
        let run = false;
        const condition = new IfOnlyExistCondition(
          instance,
          {
            nodeType: "ExpressionStatement",
            expression: { nodeType: "Literal", value: "use strict" },
          },
          {},
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });

      test("calls else function if there is more than one matching node", async () => {
        let run = false;
        const condition = new IfOnlyExistCondition(
          instance,
          {
            nodeType: "Literal",
          },
          {},
          function () {
            run = false;
          },
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });
    });
  });

  describe("IfAllCondition", () => {
    const source = `
      import { a, b } from 'x';
    `;
    const node = parse(source);

    describe("processSync", () => {
      beforeAll(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("does not call function if no matching node", () => {
        let run = false;
        new IfAllCondition(
          instance,
          { nodeType: "ImportDefaultSpecifier" },
          { match: { local: { name: { in: ["a", "b"] } } } },
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(false);
      });

      test("calls function if match", () => {
        let run = false;
        new IfAllCondition(
          instance,
          { nodeType: "ImportSpecifier" },
          { match: { local: { name: { in: ["a", "b"] } } } },
          function () {
            run = true;
          },
          function () {
            run = false;
          }
        ).processSync();
        expect(run).toBe(true);
      });

      test("calls else function if not match", () => {
        let run = false;
        new IfAllCondition(
          instance,
          { nodeType: "ImportSpecifier" },
          { match: { local: { name: { in: ["c", "d"] } } } },
          function () {
            run = false;
          },
          function () {
            run = true;
          }
        ).processSync();
        expect(run).toBe(true);
      });
    });

    describe("process", () => {
      beforeAll(() => {
        instance.currentNode = node;
        mock({ "code.js": source });
      });

      afterEach(() => {
        mock.restore();
      });

      test("does not call function if no matching node", async () => {
        let run = false;
        const condition = new IfAllCondition(
          instance,
          { nodeType: "ImportDefaultSpecifier" },
          { match: { local: { name: { in: ["a", "b"] } } } },
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(false);
      });

      test("calls function if match", async () => {
        let run = false;
        const condition = new IfAllCondition(
          instance,
          { nodeType: "ImportSpecifier" },
          { match: { local: { name: { in: ["a", "b"] } } } },
          function () {
            run = true;
          },
          function () {
            run = false;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });

      test("calls else function if not match", async () => {
        let run = false;
        const condition = new IfAllCondition(
          instance,
          { nodeType: "ImportSpecifier" },
          { match: { local: { name: { in: ["c", "d"] } } } },
          function () {
            run = false;
          },
          function () {
            run = true;
          }
        );
        await condition.process();
        expect(run).toBe(true);
      });
    });
  });
});

const espree = require("espree");
const mock = require("mock-fs");

require("../lib/ast-node-ext");

const parse = (code) => espree.parse(code, { ecmaVersion: "latest", loc: true, sourceFile: "code.js" }).body[0];

describe("ast node", () => {
  describe("childNodeRange", () => {
    test("class", () => {
      const node = parse("class FooBar {}");
      expect(node.childNodeRange("id")).toEqual({ start: 6, end: 12 });
    });

    test("expression", () => {
      const node = parse("foo.trimLeft()");
      expect(node.childNodeRange("expression.callee.object")).toEqual({ start: 0, end: 3 });
      expect(node.childNodeRange("expression.callee.dot")).toEqual({ start: 3, end: 4 });
      expect(node.childNodeRange("expression.callee.property")).toEqual({ start: 4, end: 12 });
      expect(node.childNodeRange("expression.arguments")).toEqual({ start: 12, end: 14 });
    });

    test("expression with arguments", () => {
      const node = parse("test(foo, bar)");
      expect(node.childNodeRange("expression.arguments")).toEqual({ start: 4, end: 14 });
    });

    test("method definition", () => {
      const node = parse(`
        class Foobar {
          async foobar() {
          }
        }
      `).body.body[0];
      expect(node.childNodeRange("async")).toEqual({ start: 34, end: 40 });
    });
  });

  describe("indent", () => {
    test("gets indent", () => {
      code = `
        class FooBar {
        }
      `;
      mock({ "code.js": code });
      const node = parse(code).id;
      expect(node.indent()).toBe(8);
      mock.restore();
    });
  });

  describe("recursiveChildren", () => {
    test("iterates all children recursively", () => {
      const code = `
        class Rectangle {
          constructor(width, height) {
            this.width = width;
            this.height = height;
          }

          area() {
            return this.width * this.height;
          }
        }

        const obj = new Rectangle(10, 20);
        obj.area();
      `;
      const node = parse(code);
      const children = [];
      node.recursiveChildren((child) => {
        children.push(child);
      });
      expect(children.length).toBe(32);
    });
  });

  describe("match", () => {
    test("matches class id", () => {
      code = `class Synvert {}`;
      node = parse(code);
      expect(node.match({ type: "ClassDeclaration", id: "Synvert" })).toBe(true);
    });

    test("matches class id with name", () => {
      code = `class Synvert {}`;
      node = parse(code);
      expect(node.match({ type: "ClassDeclaration", id: { name: "Synvert" } })).toBe(true);
    });

    test("matches this", () => {
      code = `this.foobar.bind(this)`;
      node = parse(code).expression;
      expect(node.match({ callee: { object: { object: "this" } }, arguments: { 0: "this" } })).toBe(true);
    });

    test("matches regexp", () => {
      code = `"foobar"`;
      node = parse(code).expression;
      expect(node.match({ type: "Literal", value: /foo/ })).toBe(true);
    });

    test("matches not", () => {
      code = `class Synvert {}`;
      node = parse(code);
      expect(node.match({ type: "ClassDeclaration", id: { not: "FooBar" } })).toBe(true);
    });

    test("matches array last", () => {
      code = `var obj = { foo: 'bar' }`;
      node = parse(code);
      expect(node.match({ declarations: { first: { id: "obj" } } })).toBe(true);
    });
  });

  describe("toSource", () => {
    test("gets source code", () => {
      code = "class FooBar {}";
      mock({ "code.js": code });
      const node = parse(code);
      expect(node.toSource()).toBe(code);
      mock.restore();
    });
  });

  describe("childNodeSource", () => {
    test("gets child node source code", () => {
      code = "class FooBar {}";
      mock({ "code.js": code });
      const node = parse(code);
      expect(node.childNodeSource("id")).toBe("FooBar");
      mock.restore();
    });
  });

  describe("fixIndentToSource", () => {
    test("gets source code", () => {
      code = `
        class FooBar {
          constructor(props) {
          }
        }
      `;
      mock({ "code.js": code });
      const node = parse(code).body.body[0];
      expect(node.fixIndentToSource()).toBe("constructor(props) {\n}");
      mock.restore();
    });
  });

  describe("rewrittenSource", () => {
    test("does not rewrite with unknown property", () => {
      code = `class Synvert {}`;
      node = parse(code);
      expect(node.rewrittenSource("{{foobar}}")).toBe("{{foobar}}");
    });

    test("rewrites with known property", () => {
      code = `class Synvert {}`;
      node = parse(code);
      expect(node.rewrittenSource("{{id}}")).toBe("Synvert");
    });

    test("rewrites for arguments", () => {
      code = `synvert('foo', 'bar')`;
      mock({ "code.js": code });
      node = parse(code);
      expect(node.rewrittenSource("{{expression.arguments}}")).toBe("'foo', 'bar'");
      mock.restore();
    });
  });
});

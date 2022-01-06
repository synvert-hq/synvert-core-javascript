const espree = require("espree");
const mock = require("mock-fs");

require("../lib/ast-node-ext");

const parse = (code) =>
  espree.parse(code, { ecmaVersion: "latest", loc: true, sourceType: "module", sourceFile: "code.js" }).body[0];

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
      expect(node.childNodeRange("expression.arguments.0")).toEqual({ start: 5, end: 8 });
    });

    test("method definition", () => {
      const node = parse(`
        class Foobar {
          async foobar(foo, bar) {
          }
        }
      `);
      expect(node.childNodeRange("body.body.0.async")).toEqual({ start: 34, end: 40 });
      expect(node.childNodeRange("body.body.0.value.params")).toEqual({ start: 46, end: 56 });
    });

    test("import declaration", () => {
      const code = `import x, { a, b } from 'y';`;
      const node = parse(code);
      mock({ "code.js": code });
      expect(node.childNodeRange("specifiers")).toEqual({ start: 10, end: 18 });
      mock.restore();
    });

    test("property", () => {
      const code = `const foobar = { foo: 'bar' }`;
      const node = parse(code);
      expect(node.childNodeRange("declarations.0.init.properties.0.semicolon")).toEqual({ start: 20, end: 21 });
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

    test("matches in", () => {
      code = `class Synvert {}`;
      node = parse(code);
      expect(node.match({ type: "ClassDeclaration", id: { in: ["FooBar", "Synvert"] } })).toBe(true);
    });

    test("matches notIn", () => {
      code = `class Synvert {}`;
      node = parse(code);
      expect(node.match({ type: "ClassDeclaration", id: { notIn: ["Foo", "Bar"] } })).toBe(true);
    });

    test("matches array first", () => {
      code = `var obj = { foo: 'bar' }`;
      node = parse(code);
      expect(node.match({ declarations: { first: { id: "obj" } } })).toBe(true);
    });

    test("matches array last", () => {
      code = `var obj = { foo: 'bar' }`;
      node = parse(code);
      expect(node.match({ declarations: { last: { id: "obj" } } })).toBe(true);
    });

    test("matches gt", () => {
      code = `import React, { Component, Fragment } from 'react'`;
      node = parse(code);
      expect(node.match({ specifiers: { length: { gt: 2 } } })).toBe(true);
    });

    test("matches gte", () => {
      code = `import React, { Component, Fragment } from 'react'`;
      node = parse(code);
      expect(node.match({ specifiers: { length: { gte: 3 } } })).toBe(true);
    });

    test("matches lt", () => {
      code = `import React, { Component, Fragment } from 'react'`;
      node = parse(code);
      expect(node.match({ specifiers: { length: { lt: 4 } } })).toBe(true);
    });

    test("matches lte", () => {
      code = `import React, { Component, Fragment } from 'react'`;
      node = parse(code);
      expect(node.match({ specifiers: { length: { lte: 3 } } })).toBe(true);
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

const fs = require('fs');
const espree = require("espree");
require("../lib/ast-node-ext");

const mock = require('mock-fs');

const parse = (code) => espree.parse(code, { ecmaVersion: 'latest', loc: true, sourceFile: 'code.js' }).body[0];

describe("ast node", () => {
  describe("childNodeRange", () => {
    describe("class", () => {
      const node = parse("class FooBar {}");
      expect(node.childNodeRange('id')).toEqual({ start: 6, end: 12 });
    });
  });

  describe("indent", () => {
    test("gets column", () => {
      const node = parse("class FooBar {}").id;
      expect(node.indent()).toEqual(6);
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
      `
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
      code = `class Synvert {}`
      node = parse(code)
      expect(node.match({ type: 'ClassDeclaration', id: { name: 'Synvert' } })).toBe(true);
    });
  });

  describe("toSource", () => {
    test("gets source code", () => {
      code = "class FooBar {}"
      mock({ 'code.js': code });
      const node = parse(code);
      expect(node.toSource()).toBe(code);
      mock.restore();
    });
  });

  describe("rewrittenSource", () => {
    test("does not rewrite with unknown property", () => {
      code = `class Synvert {}`
      node = parse(code);
      expect(node.rewrittenSource('{{foobar}}')).toBe('{{foobar}}');
    });

    test("rewrites with known property", () => {
      code = `class Synvert {}`
      node = parse(code);
      expect(node.rewrittenSource('{{id}}')).toBe('Synvert');
    });

    test("rewrites for arguments", () => {
      code = `synvert('foo', 'bar')`
      mock({ 'code.js': code });
      node = parse(code);
      expect(node.rewrittenSource('{{expression.arguments}}')).toBe("'foo', 'bar'");
      mock.restore();
    });
  });
});
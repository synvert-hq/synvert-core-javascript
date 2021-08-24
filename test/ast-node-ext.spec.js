const fs = require('fs');
const espree = require("espree");
const mock = require('mock-fs');

require("../lib/ast-node-ext");

const parse = (code) => espree.parse(code, { ecmaVersion: 'latest', loc: true, sourceFile: 'code.js' }).body[0];

describe("ast node", () => {
  describe("childNodeRange", () => {
    test("class", () => {
      const node = parse("class FooBar {}");
      expect(node.childNodeRange('id')).toEqual({ start: 6, end: 12 });
    });

    test("expression", () => {
      const node = parse("foo.trimLeft()");
      expect(node.childNodeRange('expression.callee.object')).toEqual({ start: 0, end: 3 });
      expect(node.childNodeRange('expression.callee.dot')).toEqual({ start: 3, end: 4 });
      expect(node.childNodeRange('expression.callee.property')).toEqual({ start: 4, end: 12 });
      expect(node.childNodeRange('expression.arguments')).toEqual({ start: 12, end: 14 });
    });

    test("expression with arguments", () => {
      const node = parse("test(foo, bar)");
      expect(node.childNodeRange('expression.arguments')).toEqual({ start: 4, end: 14 });
    });
  });

  describe("indent", () => {
    test("gets column", () => {
      const node = parse("class FooBar {}").id;
      expect(node.column()).toEqual(6);
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
      expect(node.match({ type: 'ClassDeclaration', id: 'Synvert' })).toBe(true);
    });

    test("matches class id with name", () => {
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
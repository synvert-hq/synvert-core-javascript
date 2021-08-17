const fs = require('fs');
const espree = require("espree");
require("../lib/ast-node-ext");

const parse = (code) => espree.parse(code, { ecmaVersion: 'latest', loc: true, sourceFile: 'code.js' }).body[0];

describe("ast node", () => {
  describe("name", () => {
    describe("class", () => {
      test("gets name", () => {
        const node = parse("class FooBar {}");
        expect(node.name()).toBe("FooBar");
      });
    });

    describe("function", () => {
      test("gets name", () => {
        const node = parse("function foobar() {}");
        expect(node.name()).toBe("foobar");
      });
    });
  });

  describe("childNodeRange", () => {
    describe("class", () => {
      const node = parse("class FooBar {}");
      expect(node.childNodeRange('id')).toEqual([6, 12]);
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

  describe("toSource", () => {
    test("gets source code", () => {
      code = "class FooBar {}"
      fs.writeFileSync("code.js", code);
      const node = parse(code);
      expect(node.toSource()).toBe(code);
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
      fs.writeFileSync("code.js", code);
      node = parse(code);
      expect(node.rewrittenSource('{{expression.arguments}}')).toBe("'foo', 'bar'");
    });
  });
});
const fs = require('fs');
const espree = require("espree");
require("../lib/ast-node-ext");

const parse = (code) => espree.parse(code, { ecmaVersion: 'latest', loc: true, sourceFile: 'test.js' }).body[0];

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

  describe("toSource", () => {
    test("gets source code", () => {
      code = "class FooBar {}"
      fs.writeFileSync("test.js", code);
      const node = parse(code);
      expect(node.toSource()).toBe(code);
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
      const node = espree.parse(code, { ecmaVersion: 'latest', loc: true, sourceFile: 'test.js' });
      const children = [];
      node.recursiveChildren((child) => {
        children.push(child);
      });
      expect(children.length).toBe(45);
    });
  });
});

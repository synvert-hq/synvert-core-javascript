const espree = require("espree");
require("../lib/ast-node-ext");

describe("ast node", () => {
  describe("name", () => {
    describe("class", () => {
      test("gets name", () => {
        const node = espree.parse("class FooBar {}", { ecmaVersion: 'latest' }).body[0];
        expect(node.name()).toBe("FooBar");
      });
    });
  });

  describe("recursive_children", () => {
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
      const node = espree.parse(code, { ecmaVersion: 'latest' });
      const children = [];
      node.recursive_children((child) => {
        children.push(child);
      });
      expect(children.length).toBe(45);
    });
  });
});
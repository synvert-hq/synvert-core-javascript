const espree = require("espree");
require("../lib/ast-node-ext");

describe("ast node", () => {
  describe("class", () => {
    test("gets name", () => {
      const node = espree.parse("class FooBar {}", { ecmaVersion: 'latest' }).body[0];
      expect(node.name()).toBe("FooBar");
    });
  });
});
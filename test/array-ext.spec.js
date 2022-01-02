const espree = require("espree");
const mock = require("mock-fs");

require("../lib/ast-node-ext");
require("../lib/array-ext");

const parse = (code) =>
  espree.parse(code, { ecmaVersion: "latest", loc: true, sourceType: "module", sourceFile: "code.js" }).body[0];

describe("array", () => {
  test("first", () => {
    const array = [0, 1, 2];
    expect(array.first()).toBe(0);
  });

  test("last", () => {
    const array = [0, 1, 2];
    expect(array.last()).toBe(2);
  });

  test("toSource", () => {
    const code = `
      class Foobar {
        async foobar(foo, bar) {
        }
      }
    `;
    mock({ "code.js": code });
    const node = parse(code);
    const array = node.body.body;
    expect(array.toSource()).toBe(`async foobar(foo, bar) {\n        }`);
    mock.restore();
  });
});

const { indent, dedent } = require("../lib/utils");

it("indent", () => {
  const oldCode = `
  class Foo {
    bar() {
      test()
    }
  }
  `;
  const newCode = `
    class Foo {
      bar() {
        test()
      }
    }
  `;
  expect(indent(oldCode, 2)).toEqual(newCode);
});

it("dedent", () => {
  const oldCode = `
    class Foo {
      bar() {
        test()
      }
    }
  `
  const newCode = `
class Foo {
  bar() {
    test()
  }
}
  `.trim();
  expect(dedent(oldCode)).toEqual(newCode);
});
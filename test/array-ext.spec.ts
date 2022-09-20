import mock from "mock-fs";

import "../src/array-ext";
import "../src/ast-node-ext";
import { parse } from "./helper";

describe("array", () => {
  test("first", () => {
    const array = [0, 1, 2];
    expect(array.first()).toBe(0);
  });

  test("last", () => {
    const array = [0, 1, 2];
    expect(array.last()).toBe(2);
  });

  describe("toSource", () => {
    afterEach(() => {
      mock.restore();
    });

    test("gets source code", () => {
      const code = `
        class Foobar {
          async foobar(foo, bar) {
          }
        }
      `;
      mock({ "code.js": code });
      const node = parse(code);
      const array = node.body.body;
      expect(array.toSource()).toBe(`async foobar(foo, bar) {\n          }`);
    });

    test("gets source code with fixIndent", () => {
      const code = `
        class Foobar {
          foo() {}
          bar() {}
        }
      `;
      mock({ "code.js": code });
      const node = parse(code);
      const array = node.body.body;
      expect(array.toSource({ fixIndent: true })).toBe(`foo() {}\nbar() {}`);
    });
  });
});

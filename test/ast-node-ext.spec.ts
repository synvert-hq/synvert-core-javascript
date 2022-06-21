import mock from "mock-fs";

import "../src/ast-node-ext";
import { parse } from "./helper";

describe("ast node", () => {
  describe("toSource", () => {
    test("gets source code", () => {
      const code = "class FooBar {}";
      mock({ "code.js": code });
      const node = parse(code);
      expect(node.toSource()).toBe(code);
      mock.restore();
    });

    test("gets source code with fixIndent", () => {
      const code = `
        class FooBar {
          constructor(props) {
          }
        }
      `;
      mock({ "code.js": code });
      const node = parse(code).body.body[0];
      expect(node.toSource({ fixIndent: true })).toBe(
        "constructor(props) {\n}"
      );
      mock.restore();
    });
  });

  describe("indent", () => {
    test("gets indent", () => {
      const code = `
        class FooBar {
        }
      `;
      mock({ "code.js": code });
      const node = parse(code).id;
      expect(node.indent()).toBe(8);
      mock.restore();
    });
  });
});
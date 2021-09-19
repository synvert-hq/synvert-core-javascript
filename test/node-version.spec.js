const mock = require("mock-fs");

const NodeVersion = require("../lib/node-version");

describe("node version", () => {
  describe(".node-version", () => {
    beforeEach(() => {
      mock({ ".node-version": "10.14.0" });
    });

    afterEach(() => {
      mock.restore();
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("10.0.0");
      expect(nodeVersion.match()).toBe(true);
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(nodeVersion.match()).toBe(false);
    });
  });

  describe(".nvmrc", () => {
    beforeEach(() => {
      mock({ ".nvmrc": "10.14.0" });
    });

    afterEach(() => {
      mock.restore();
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("10.0.0");
      expect(nodeVersion.match()).toBe(true);
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(nodeVersion.match()).toBe(false);
    });
  });
});

import mock from "mock-fs";

import NodeVersion from "../src/node-version";
import Configuration from "../src/configuration";

describe("matchSync", () => {
  describe(".node-version", () => {
    beforeEach(() => {
      mock({ ".node-version": "10.14.0" });
    });

    afterEach(() => {
      mock.restore();
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("10.0.0");
      expect(nodeVersion.matchSync()).toBe(true);
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(nodeVersion.matchSync()).toBe(false);
    });

    test("returns true if Configuration.strict is false", () => {
      Configuration.strict = false;
      const nodeVersion = new NodeVersion("12.0.0");
      expect(nodeVersion.matchSync()).toBe(true);
      Configuration.strict = true;
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
      expect(nodeVersion.matchSync()).toBe(true);
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(nodeVersion.matchSync()).toBe(false);
    });
  });

  describe("engines node in package.json", () => {
    beforeEach(() => {
      mock({
        "package.json": JSON.stringify({ engines: { node: "^10.14.0" } }),
      });
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("10.0.0");
      expect(nodeVersion.matchSync()).toBe(true);
    });

    test("compares versions", () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(nodeVersion.matchSync()).toBe(false);
    });
  });
});

describe("match", () => {
  describe(".node-version", () => {
    beforeEach(() => {
      mock({ ".node-version": "10.14.0" });
    });

    afterEach(() => {
      mock.restore();
    });

    test("matches versions", async () => {
      const nodeVersion = new NodeVersion("10.0.0");
      expect(await nodeVersion.match()).toBe(true);
    });

    test("does not match versions", async () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(await nodeVersion.match()).toBe(false);
    });

    test("return true if Configuration.strict is false", async () => {
      Configuration.strict = false;
      const nodeVersion = new NodeVersion("12.0.0");
      expect(await nodeVersion.match()).toBe(true);
      Configuration.strict = true;
    });
  });

  describe(".nvmrc", () => {
    beforeEach(() => {
      mock({ ".nvmrc": "10.14.0" });
    });

    afterEach(() => {
      mock.restore();
    });

    test("matches versions", async () => {
      const nodeVersion = new NodeVersion("10.0.0");
      expect(await nodeVersion.match()).toBe(true);
    });

    test("does not match versions", async () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(await nodeVersion.match()).toBe(false);
    });
  });

  describe("engines node in packages.json", () => {
    beforeEach(() => {
      mock({
        "package.json": JSON.stringify({ engines: { node: "^10.14.0" } }),
      });
    });

    afterEach(() => {
      mock.restore();
    });

    test("matches versions", async () => {
      const nodeVersion = new NodeVersion("10.0.0");
      expect(await nodeVersion.match()).toBe(true);
    });

    test("does not match versions", async () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(await nodeVersion.match()).toBe(false);
    });
  });
});

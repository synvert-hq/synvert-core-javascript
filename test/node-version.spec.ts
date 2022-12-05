import mock from "mock-fs";

import NodeVersion from "../src/node-version";

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
});

describe("match", () => {
  describe(".node-version", () => {
    beforeEach(() => {
      mock({ ".node-version": "10.14.0" });
    });

    afterEach(() => {
      mock.restore();
    });

    test("compares versions", async () => {
      const nodeVersion = new NodeVersion("10.0.0");
      console.log(nodeVersion.matchSync())
      console.log(await nodeVersion.match())
      expect(await nodeVersion.match()).toBe(true);
    });

    test("compares versions", async () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(await nodeVersion.match()).toBe(false);
    });
  });

  describe(".nvmrc", () => {
    beforeEach(() => {
      mock({ ".nvmrc": "10.14.0" });
    });

    afterEach(() => {
      mock.restore();
    });

    test("compares versions", async () => {
      const nodeVersion = new NodeVersion("10.0.0");
      expect(await nodeVersion.match()).toBe(true);
    });

    test("compares versions", async () => {
      const nodeVersion = new NodeVersion("12.0.0");
      expect(await nodeVersion.match()).toBe(false);
    });
  });
});

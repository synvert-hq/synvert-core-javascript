const NpmVersion = require("../lib/npm-version");

describe("npm version", () => {
  test("compares versions >=", async () => {
    const npmVersion = new NpmVersion("compare-versions", ">= 3.6.0");
    expect(await npmVersion.match()).toBe(true);
  });

  test("compares versions <", async () => {
    const npmVersion = new NpmVersion("compare-versions", "< 3.6.0");
    expect(await npmVersion.match()).toBe(false);
  });
});
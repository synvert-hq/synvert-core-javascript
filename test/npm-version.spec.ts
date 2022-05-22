import NpmVersion from "../src/npm-version";

describe("npm version", () => {
  test("compares versions >=", () => {
    const npmVersion = new NpmVersion("compare-versions", ">= 3.6.0");
    expect(npmVersion.match()).toBe(true);
  });

  test("compares versions <", () => {
    const npmVersion = new NpmVersion("compare-versions", "< 3.6.0");
    expect(npmVersion.match()).toBe(false);
  });
});

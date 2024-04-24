import Configuration from "../src/configuration";
import NpmVersion from "../src/npm-version";

describe("matchSync", () => {
  test("compares versions >=", () => {
    const npmVersion = new NpmVersion("compare-versions", ">= 3.6.0");
    expect(npmVersion.matchSync()).toBe(true);
  });

  test("compares versions <", () => {
    const npmVersion = new NpmVersion("compare-versions", "< 3.6.0");
    expect(npmVersion.matchSync()).toBe(false);
  });

  test("return true if Configuration.strict is false", () => {
    Configuration.strict = false;
    const npmVersion = new NpmVersion("compare-versions", "< 3.6.0");
    expect(npmVersion.matchSync()).toBe(true);
    Configuration.strict = true;
  });
});

describe("match", () => {
  test("compares versions >=", async () => {
    const npmVersion = new NpmVersion("compare-versions", ">= 3.6.0");
    expect(await npmVersion.match()).toBe(true);
  });

  test("compares versions <", async () => {
    const npmVersion = new NpmVersion("compare-versions", "< 3.6.0");
    expect(await npmVersion.match()).toBe(false);
  });

  test("returns true if Configuration.strict is false", async () => {
    Configuration.strict = false;
    const npmVersion = new NpmVersion("compare-versions", "< 3.6.0");
    expect(await npmVersion.match()).toBe(true);
    Configuration.strict = true;
  });
});

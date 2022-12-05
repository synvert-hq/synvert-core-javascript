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
});

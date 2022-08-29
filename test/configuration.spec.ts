import Configuration from "../src/configuration";

describe("Configuration", () => {
  it("path", () => {
    expect(Configuration.path).toBe(".");
    Configuration.path = "test";
    expect(Configuration.path).toBe("test");
  });

  it("onlyPaths", () => {
    expect(Configuration.onlyPaths).toEqual([]);
    Configuration.onlyPaths = ["foo", "bar"];
    expect(Configuration.onlyPaths).toEqual(["foo", "bar"]);
  });

  it("skipPaths", () => {
    expect(Configuration.skipPaths).toEqual(["**/node_modules/**"]);
    Configuration.skipPaths = ["foo", "bar"];
    expect(Configuration.skipPaths).toEqual(["foo", "bar"]);
  });

  it("showRunProcess", () => {
    expect(Configuration.showRunProcess).toEqual(false);
    Configuration.showRunProcess = true;
    expect(Configuration.showRunProcess).toEqual(true);
  });

  it("enableEcmaFeaturesJsx", () => {
    expect(Configuration.enableEcmaFeaturesJsx).toEqual(false);
    Configuration.enableEcmaFeaturesJsx = true;
    expect(Configuration.enableEcmaFeaturesJsx).toEqual(true);
  });
});

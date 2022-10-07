import Configuration from "../src/configuration";

describe("Configuration", () => {
  it("rootPath", () => {
    expect(Configuration.rootPath).toBe(".");
    Configuration.rootPath = "test";
    expect(Configuration.rootPath).toBe("test");
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
});

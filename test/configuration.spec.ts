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

  it("maxFileSize", () => {
    expect(Configuration.maxFileSize).toEqual(10240);
    Configuration.maxFileSize = 1000;
    expect(Configuration.maxFileSize).toEqual(1000);
  });

  it("singleQuote", () => {
    expect(Configuration.singleQuote).toEqual(false);
    Configuration.singleQuote = true;
    expect(Configuration.singleQuote).toEqual(true);
  });

  it("semi", () => {
    expect(Configuration.semi).toEqual(true);
    Configuration.semi = false;
    expect(Configuration.semi).toEqual(false);
  });

  it("tabWidth", () => {
    expect(Configuration.tabWidth).toEqual(2);
    Configuration.tabWidth = 4;
    expect(Configuration.tabWidth).toEqual(4);
  });
});

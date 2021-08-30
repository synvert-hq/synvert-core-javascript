const Configuration = require("../lib/configuration");

describe("Configuration", () => {
  it("path", () => {
    expect(Configuration.path).toBe(".");
    Configuration.path = "test";
    expect(Configuration.path).toBe("test");
  });

  it("skipFiles", () => {
    expect(Configuration.skipFiles).toEqual(["node_modules/**"]);
    Configuration.skipFiles = ["foo", "bar"];
    expect(Configuration.skipFiles).toEqual(["foo", "bar"]);
  });
});

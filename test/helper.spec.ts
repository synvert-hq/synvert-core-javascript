import { Node } from "typescript";
import fs, { promises as promisesFs } from "fs";
import mock from "mock-fs";
import { resolve } from "path";

import Configuration from "../src/configuration";
import Helper from "../src/helper";
import { SourceType } from "../src/types/options";
import { isValidFile, isValidFileSync } from "../src/utils";

describe("static register", () => {
  it("registers and fetches", () => {
    const helper = new Helper("name", function () {});
    expect(Helper.fetch("name")).toBe(helper);

    expect(Helper.fetch("new name")).toBeUndefined();
  });

  it("clears all helpers", () => {
    const helper = new Helper("name", function () {});
    expect(Helper.fetch("name")).toBe(helper);

    Helper.clear();

    expect(Helper.fetch("name")).toBeUndefined();
  });
});

require("../lib/array-ext");

describe("array", () => {
  test("first", () => {
    const array = [0, 1, 2];
    expect(array.first()).toEqual(0);
  });

  test("last", () => {
    const array = [0, 1, 2];
    expect(array.last()).toEqual(2);
  });
});
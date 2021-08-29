require("../lib/array-ext");

describe("array", () => {
  test("first", () => {
    const array = [0, 1, 2];
    expect(array.first()).toBe(0);
  });

  test("last", () => {
    const array = [0, 1, 2];
    expect(array.last()).toBe(2);
  });
});

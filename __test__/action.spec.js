const espree = require("espree");
require("../lib/ast-node-ext");

const { Action, ReplaceAction } = require("../lib/action");

const parse = (code) => espree.parse(code, { ecmaVersion: 'latest', loc: true, sourceFile: 'code.js' }).body[0];

describe("action", () => {
  let action;
  beforeAll(() => {
    const node = parse("class FooBar {}");
    action = new Action({ currentNode: node }, '{{id}}');
  });

  it("gets rewrittenSource", function() {
    expect(action.rewrittenSource()).toBe("FooBar");
  });
});

describe("ReplaceAction", () => {
  let action;
  beforeAll(() => {
    const node = parse("class FooBar {}");
    action = new ReplaceAction({ currentNode: node }, 'id', { with: 'Synvert' });
  });

  it("gets beginPos", function() {
    expect(action.beginPos()).toBe(6);
  });

  it("gets endPos", function() {
    expect(action.endPos()).toBe(12);
  });

  it("gets rewrittenCode", function() {
    expect(action.rewrittenCode()).toBe("Synvert");
  });
});
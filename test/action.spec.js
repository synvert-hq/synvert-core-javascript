const espree = require("espree");
const mock = require("mock-fs");

const Instance = require("../lib/instance");
const {
  Action,
  AppendAction,
  PrependAction,
  InsertAction,
  DeleteAction,
  RemoveAction,
  ReplaceAction,
  ReplaceWithAction,
} = require("../lib/action");

const parse = (code) => espree.parse(code, { ecmaVersion: "latest", loc: true, sourceFile: "code.js" }).body[0];

describe("action", () => {
  const node = parse("class FooBar {}");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  const action = new Action(instance, "{{id}}");

  it("gets rewrittenSource", function () {
    expect(action.rewrittenSource()).toBe("FooBar");
  });
});

describe("AppendAction", () => {
  const code = `class FooBar {\n}`;
  const node = parse(code);
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;

  beforeEach(() => {
    mock({ "code.js": code });
  });

  afterEach(() => {
    mock.restore();
  });

  describe("single line", () => {
    const action = new AppendAction(instance, "foobar() {}");

    it("gets beginPos", function () {
      expect(action.beginPos()).toBe(15);
    });

    it("gets endPos", function () {
      expect(action.endPos()).toBe(15);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode()).toBe(`  foobar() {}\n`);
    });
  });

  describe("multiple lines", () => {
    const action = new AppendAction(instance, "foo() {}\nbar() {}");

    it("gets beginPos", function () {
      expect(action.beginPos()).toBe(15);
    });

    it("gets endPos", function () {
      expect(action.endPos()).toBe(15);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode()).toBe(`  foo() {}\n  bar() {}\n`);
    });
  });
});

describe("PrependAction", () => {
  const code = `class FooBar {\n}`;
  const node = parse(code);
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;

  beforeEach(() => {
    mock({ "code.js": code });
  });

  afterEach(() => {
    mock.restore();
  });

  describe("single line", () => {
    const action = new PrependAction(instance, "foobar() {}");

    it("gets beginPos", function () {
      expect(action.beginPos()).toBe(15);
    });

    it("gets endPos", function () {
      expect(action.endPos()).toBe(15);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode()).toBe(`  foobar() {}\n`);
    });
  });

  describe("multiple lines", () => {
    const action = new PrependAction(instance, "foo() {}\nbar() {}");

    it("gets beginPos", function () {
      expect(action.beginPos()).toBe(15);
    });

    it("gets endPos", function () {
      expect(action.endPos()).toBe(15);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode()).toBe(`  foo() {}\n  bar() {}\n`);
    });
  });
});

describe("InsertAction", () => {
  const node = parse("this.foo");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  const action = new InsertAction(instance, "::", { at: "beginning" });

  it("gets beginPos", function () {
    expect(action.beginPos()).toBe(0);
  });

  it("gets endPos", function () {
    expect(action.endPos()).toBe(0);
  });

  it("gets rewrittenCode", function () {
    expect(action.rewrittenCode()).toBe("::");
  });
});

describe("DeleteAction", () => {
  const node = parse("this.foo.bind(this)");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  const action = new DeleteAction(instance, [
    "expression.callee.dot",
    "expression.callee.property",
    "expression.arguments",
  ]);

  beforeEach(() => {
    mock({ "code.js": code });
  });

  afterEach(() => {
    mock.restore();
  });

  it("gets beginPos", function () {
    expect(action.beginPos()).toBe(8);
  });

  it("gets endPos", function () {
    expect(action.endPos()).toBe(19);
  });

  it("gets rewrittenCode", function () {
    expect(action.rewrittenCode()).toBe("");
  });
});

describe("RemoveAction", () => {
  describe("single line", () => {
    code = "this.foo.bind(this);";
    const node = parse(code);
    const instance = new Instance({}, "", function () {});
    instance.currentNode = node.expression;
    const action = new RemoveAction(instance);

    beforeEach(() => {
      mock({ "code.js": code });
    });

    afterEach(() => {
      mock.restore();
    });

    it("gets beginPos", function () {
      expect(action.beginPos()).toBe(0);
    });

    it("gets endPos", function () {
      expect(action.endPos()).toBe(code.length);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode()).toBe("");
    });
  });

  describe("multiple lines", () => {
    const code = `
      function foo(props) {
        this.bar = this.bar.bind(this);
      }
    `;
    const node = parse(code);
    const instance = new Instance({}, "", function () {});
    instance.currentNode = node.body.body[0];
    const action = new RemoveAction(instance);

    beforeEach(() => {
      mock({ "code.js": code });
    });

    afterEach(() => {
      mock.restore();
    });

    it("gets beginPos", function () {
      expect(action.beginPos()).toBe(code.indexOf("{") + "{\n".length);
    });

    it("gets endPos", function () {
      expect(action.endPos()).toBe(code.indexOf(";") + ";\n".length);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode()).toBe("");
    });
  });
});

describe("ReplaceAction", () => {
  const node = parse("class FooBar {}");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  const action = new ReplaceAction(instance, "id", { with: "Synvert" });

  it("gets beginPos", function () {
    expect(action.beginPos()).toBe(6);
  });

  it("gets endPos", function () {
    expect(action.endPos()).toBe(12);
  });

  it("gets rewrittenCode", function () {
    expect(action.rewrittenCode()).toBe("Synvert");
  });
});

describe("ReplaceWithAction", () => {
  const node = parse("!!foobar");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  const action = new ReplaceWithAction({ currentNode: node }, "Boolean({{expression.argument.argument}})");

  it("gets beginPos", function () {
    expect(action.beginPos()).toBe(0);
  });

  it("gets endPos", function () {
    expect(action.endPos()).toBe(8);
  });

  it("gets rewrittenCode", function () {
    expect(action.rewrittenCode()).toBe("Boolean(foobar)");
  });
});

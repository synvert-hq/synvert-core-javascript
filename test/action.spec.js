const espree = require("xinminlabs-espree");
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
    let action;

    beforeEach(() => {
      action = new AppendAction(instance, "foobar() {}").process();
    });

    it("gets beginPos", function () {
      expect(action.beginPos).toBe(15);
    });

    it("gets endPos", function () {
      expect(action.endPos).toBe(15);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode).toBe(`  foobar() {}\n`);
    });
  });

  describe("multiple lines", () => {
    let action;

    beforeEach(() => {
      action = new AppendAction(instance, "foo() {}\nbar() {}").process();
    });

    it("gets beginPos", function () {
      expect(action.beginPos).toBe(15);
    });

    it("gets endPos", function () {
      expect(action.endPos).toBe(15);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode).toBe(`  foo() {}\n  bar() {}\n`);
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
    let action;

    beforeEach(() => {
      action = new PrependAction(instance, "foobar() {}").process();
    });

    it("gets beginPos", function () {
      expect(action.beginPos).toBe(15);
    });

    it("gets endPos", function () {
      expect(action.endPos).toBe(15);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode).toBe(`  foobar() {}\n`);
    });
  });

  describe("multiple lines", () => {
    let action;

    beforeEach(() => {
      action = new PrependAction(instance, "foo() {}\nbar() {}").process();
    });

    it("gets beginPos", function () {
      expect(action.beginPos).toBe(15);
    });

    it("gets endPos", function () {
      expect(action.endPos).toBe(15);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode).toBe(`  foo() {}\n  bar() {}\n`);
    });
  });
});

describe("InsertAction", () => {
  const node = parse("this.foo");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  let action;

  describe("at beginning", () => {
    beforeEach(() => {
      action = new InsertAction(instance, "::", { at: "beginning" }).process();
    });

    it("gets beginPos", function () {
      expect(action.beginPos).toBe(0);
    });

    it("gets endPos", function () {
      expect(action.endPos).toBe(0);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode).toBe("::");
    });
  });

  describe("at end of object", () => {
    beforeEach(() => {
      action = new InsertAction(instance, ".bar", { to: "expression.object", at: "end" }).process();
    });

    it("gets beginPos", function () {
      expect(action.beginPos).toBe("this".length);
    });

    it("gets endPos", function () {
      expect(action.beginPos).toBe("this".length);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode).toBe(".bar");
    });
  });
});

describe("DeleteAction", () => {
  const node = parse("this.foo.bind(this)");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  let action;

  beforeEach(() => {
    mock({ "code.js": code });
  });

  afterEach(() => {
    mock.restore();
  });

  beforeEach(() => {
    action = new DeleteAction(instance, [
      "expression.callee.dot",
      "expression.callee.property",
      "expression.arguments",
    ]).process();
  });

  it("gets beginPos", function () {
    expect(action.beginPos).toBe(8);
  });

  it("gets endPos", function () {
    expect(action.endPos).toBe(19);
  });

  it("gets rewrittenCode", function () {
    expect(action.rewrittenCode).toBe("");
  });
});

describe("RemoveAction", () => {
  describe("single line", () => {
    code = "this.foo.bind(this);";
    const node = parse(code);
    const instance = new Instance({}, "", function () {});
    instance.currentNode = node.expression;
    let action;

    beforeEach(() => {
      mock({ "code.js": code });
    });

    afterEach(() => {
      mock.restore();
    });

    beforeEach(() => {
      action = new RemoveAction(instance).process();
    });

    it("gets beginPos", function () {
      expect(action.beginPos).toBe(0);
    });

    it("gets endPos", function () {
      expect(action.endPos).toBe(code.length);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode).toBe("");
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
    let action;

    beforeEach(() => {
      mock({ "code.js": code });
    });

    afterEach(() => {
      mock.restore();
    });

    beforeEach(() => {
      action = new RemoveAction(instance).process();
    });

    it("gets beginPos", function () {
      expect(action.beginPos).toBe(code.indexOf("{") + "{\n".length);
    });

    it("gets endPos", function () {
      expect(action.endPos).toBe(code.indexOf(";") + ";\n".length);
    });

    it("gets rewrittenCode", function () {
      expect(action.rewrittenCode).toBe("");
    });
  });
});

describe("ReplaceAction", () => {
  const node = parse("class FooBar {}");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  let action;

  beforeEach(() => {
    action = new ReplaceAction(instance, "id", { with: "Synvert" }).process();
  });

  it("gets beginPos", function () {
    expect(action.beginPos).toBe(6);
  });

  it("gets endPos", function () {
    expect(action.endPos).toBe(12);
  });

  it("gets rewrittenCode", function () {
    expect(action.rewrittenCode).toBe("Synvert");
  });
});

describe("ReplaceWithAction", () => {
  const node = parse("!!foobar");
  const instance = new Instance({}, "", function () {});
  instance.currentNode = node;
  let action;

  beforeEach(() => {
    action = new ReplaceWithAction({ currentNode: node }, "Boolean({{expression.argument.argument}})").process();
  });

  it("gets beginPos", function () {
    expect(action.beginPos).toBe(0);
  });

  it("gets endPos", function () {
    expect(action.endPos).toBe(8);
  });

  it("gets rewrittenCode", function () {
    expect(action.rewrittenCode).toBe("Boolean(foobar)");
  });
});

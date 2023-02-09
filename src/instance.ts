import ts from "typescript";
import fs, { promises as promisesFs } from "fs";
import path from "path";
import debug from "debug";
import { Node } from "acorn";
import Configuration from "./configuration";
import Rewriter from "./rewriter";
import { WithinScope, GotoScope } from "./scope";
import {
  IfExistCondition,
  UnlessExistCondition,
  IfOnlyExistCondition,
  IfAllCondition,
  ConditionOptions,
} from "./condition";
import { loadSnippet, loadSnippetSync } from "./utils";
import { QueryOptions } from "@xinminlabs/node-query";
import NodeMutation, {
  Strategy as NodeMutationStrategy,
  InsertOptions,
  ReplaceWithOptions,
  ReplaceOptions,
  Adapter as MutationAdapter,
} from "@xinminlabs/node-mutation";
import { Parser, Strategy } from "./types/options";
import { TestResultExt } from "./types/result";

const espree = require("@xinminlabs/espree");

/**
 * Instance is an execution unit, it finds specified ast nodes,
 * checks if the nodes match some conditions, then insert, replace or delete code.
 * One instance can contains one or many Scope and Condition.
 * @property {string} filePath - file path to run instance
 * @property {MutationAdapter} mutationAdapter - mutation adapter
 * @borrows Instance#withinNodeSync as Instance#withNodeSync
 * @borrows Instance#findNodeSync as Instance#withNodeSync
 * @borrows Instance#withinNode as Instance#withNode
 * @borrows Instance#findNode as Instance#withNode
 */
class Instance {
  public mutationAdapter: MutationAdapter<any>;
  public currentNode!: Node;
  private currentMutation!: NodeMutation<Node>;
  public options: any;

  /**
   * Current instance.
   * @static
   */
  static current: Instance;

  /**
   * Create an Instance
   * @param {string} filePath - file path
   * @param {Function} func - a function to find nodes, match conditions and rewrite code.
   */
  constructor(
    private rewriter: Rewriter,
    public filePath: string,
    private func: (instance: Instance) => void
  ) {
    this.mutationAdapter = NodeMutation.getAdapter();
    let strategy = NodeMutationStrategy.KEEP_RUNNING;
    if (rewriter.options.strategy === Strategy.ALLOW_INSERT_AT_SAME_POSITION) {
      strategy = strategy | NodeMutationStrategy.ALLOW_INSERT_AT_SAME_POSITION;
    }
    NodeMutation.configure({ strategy, tabWidth: Configuration.tabWidth });
  }

  /**
   * Process one file.
   */
  processSync(): void {
    if (
      this.rewriter.options.parser === Parser.ESPREE &&
      [".ts", ".tsx"].includes(path.extname(this.filePath))
    ) {
      return;
    }
    const currentFilePath = path.join(Configuration.rootPath, this.filePath);
    if (Configuration.showRunProcess) {
      console.log(this.filePath);
    }
    while (true) {
      const source = fs.readFileSync(currentFilePath, "utf-8");
      this.currentMutation = new NodeMutation<Node>(source);
      this.mutationAdapter = NodeMutation.getAdapter();
      try {
        const node = this.parseCode(this.filePath, source);

        this.processWithNodeSync(node, this.func);

        const result = this.currentMutation.process();
        debug("synvert-core:process")(result);
        if (result.affected) {
          this.rewriter.addAffectedFile(this.filePath);
          fs.writeFileSync(currentFilePath, result.newSource!);
        }
        if (!result.conflicted) {
          break;
        }
      } catch (e) {
        console.log(e);
        if (e instanceof SyntaxError) {
          console.log(`May not parse source code: ${source}`);
        }
        break;
      }
    }
  }

  /**
   * Process one file.
   * @async
   */
  async process(): Promise<void> {
    if (
      this.rewriter.options.parser === Parser.ESPREE &&
      [".ts", ".tsx"].includes(path.extname(this.filePath))
    ) {
      return;
    }
    const currentFilePath = path.join(Configuration.rootPath, this.filePath);
    if (Configuration.showRunProcess) {
      console.log(this.filePath);
    }
    while (true) {
      const source = await promisesFs.readFile(currentFilePath, "utf-8");
      this.currentMutation = new NodeMutation<Node>(source);
      this.mutationAdapter = NodeMutation.getAdapter();
      try {
        const node = this.parseCode(currentFilePath, source);

        await this.processWithNode(node, this.func);

        const result = this.currentMutation.process();
        debug("synvert-core:process")(result);
        if (result.affected) {
          this.rewriter.addAffectedFile(this.filePath);
          await promisesFs.writeFile(currentFilePath, result.newSource!);
        }
        if (!result.conflicted) {
          break;
        }
      } catch (e) {
        console.log(e);
        if (e instanceof SyntaxError) {
          console.log(`May not parse source code: ${source}`);
        }
        break;
      }
    }
  }

  /**
   * Test one file.
   * @returns {TestResultExt}
   */
  testSync(): TestResultExt {
    if (
      this.rewriter.options.parser === Parser.ESPREE &&
      [".ts", ".tsx"].includes(path.extname(this.filePath))
    ) {
      return {
        conflicted: false,
        affected: false,
        actions: [],
        filePath: this.filePath,
      };
    }
    const currentFilePath = path.join(Configuration.rootPath, this.filePath);
    const source = fs.readFileSync(currentFilePath, "utf-8");
    this.currentMutation = new NodeMutation<Node>(source);
    this.mutationAdapter = NodeMutation.getAdapter();
    const node = this.parseCode(currentFilePath, source);

    this.processWithNodeSync(node, this.func);

    const result = this.currentMutation.test() as TestResultExt;
    result.filePath = this.filePath;
    debug("synvert-core:test")(result);
    return result;
  }

  /**
   * Test one file.
   * @async
   * @returns {Promise<TestResultExt>}
   */
  async test(): Promise<TestResultExt> {
    if (
      this.rewriter.options.parser === Parser.ESPREE &&
      [".ts", ".tsx"].includes(path.extname(this.filePath))
    ) {
      return {
        conflicted: false,
        affected: false,
        actions: [],
        filePath: this.filePath,
      };
    }
    const currentFilePath = path.join(Configuration.rootPath, this.filePath);
    const source = await promisesFs.readFile(currentFilePath, "utf-8");
    this.currentMutation = new NodeMutation<Node>(source);
    this.mutationAdapter = NodeMutation.getAdapter();
    const node = this.parseCode(currentFilePath, source);

    await this.processWithNode(node, this.func);

    const result = this.currentMutation.test() as TestResultExt;
    result.filePath = this.filePath;
    debug("synvert-core:test")(result);
    return result;
  }

  /**
   * Set currentNode to node and process.
   * @param {Node} node - set to current node
   * @param {Function} func
   */
  processWithNodeSync(node: Node, func: (instance: Instance) => void) {
    this.currentNode = node;
    func.call(this, this);
    this.currentNode = node;
  }

  /**
   * Set currentNode to node and process.
   * @async
   * @param {Node} node - set to current node
   * @param {Function} func
   */
  async processWithNode(node: Node, func: (instance: Instance) => void) {
    this.currentNode = node;
    await func.call(this, this);
    this.currentNode = node;
  }

  /**
   * Set currentNode properly, process and set currentNode back to original currentNode.
   * @param {Node} node - set to other node
   * @param {Function} func
   */
  processWithOtherNodeSync(node: Node, func: (instance: Instance) => void) {
    const originalNode = this.currentNode;
    this.currentNode = node;
    func.call(this, this);
    this.currentNode = originalNode;
  }

  /**
   * Set currentNode properly, process and set currentNode back to original currentNode.
   * @async
   * @param {Node} node - set to other node
   * @param {Function} func
   */
  async processWithOtherNode(node: Node, func: (instance: Instance) => void) {
    const originalNode = this.currentNode;
    this.currentNode = node;
    await func.call(this, this);
    this.currentNode = originalNode;
  }

  /**
   * Query options
   * @typedef {Object} QueryOptions
   * @property {boolean} [includingSelf = true] - whether to include self node
   * @property {boolean} [stopAtFirstMatch = false] - whether to stop at first match
   * @property {boolean} [recursive = true] - whether to recursively find matching nodes
   */

  /**
   * Condition options
   * @typedef {Object} ConditionOptions
   * @property {string} [in] - to do find in specific child node, e.g. `{ in: 'callee' }`
   * @property {Function|string|Object} [match] - It can a function, nql or rules to be matched.
   */

  /*******
   * DSL *
   *******/

  withinNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): void;
  withinNodeSync(
    nqlOrRules: string | object,
    options: QueryOptions,
    func: (instance: Instance) => void
  ): void;
  /**
   * Create a {@link WithinScope} to recursively find matching ast nodes,
   * then continue operating on each matching ast node.
   * @example
   * // `$.ajax({ ... })` matches and call `foobar`
   * withinNodeSync({ nodeType: "CallExpression", callee: { nodeType: "MemberExpression", object: "$", property: "ajax" } }, () => { foobar })
   * withinNodeSync(".CallExpression[callee=.MemberExpression[object=$][property=ajax]]", () => { foobar });
   * @param nqlOrRules {string|Object} - to find mathing ast nodes.
   * @param options {QueryOptions|Function} - query options.
   * @param func {Function} - to be called on the matching nodes.
   */
  withinNodeSync(
    nqlOrRules: string | object,
    options: QueryOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      new WithinScope(this, nqlOrRules, {}, options).processSync();
    } else {
      new WithinScope(this, nqlOrRules, options, func!).processSync();
    }
  }

  withNodeSync = this.withinNodeSync.bind(this);
  findNodeSync = this.withinNodeSync.bind(this);

  async withinNode(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): Promise<void>;
  async withinNode(
    nqlOrRules: string | object,
    options: QueryOptions,
    func: (instance: Instance) => void
  ): Promise<void>;
  /**
   * Create a {@link WithinScope} to recursively find matching ast nodes,
   * then continue operating on each matching ast node.
   * @async
   * @example
   * // `$.ajax({ ... })` matches and call `foobar`
   * await withinNode({ nodeType: "CallExpression", callee: { nodeType: "MemberExpression", object: "$", property: "ajax" } }, async () => { foobar })
   * await withinNode(".CallExpression[callee=.MemberExpression[object=$][property=ajax]]", async () => { foobar });
   * @param nqlOrRules {string|Object} - to find mathing ast nodes.
   * @param options {QueryOptions|Function} - query options.
   * @param func {Function} - to be called on the matching nodes.
   */
  async withinNode(
    nqlOrRules: string | object,
    options: QueryOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      await new WithinScope(this, nqlOrRules, {}, options).process();
    } else {
      await new WithinScope(this, nqlOrRules, options, func!).process();
    }
  }

  withNode = this.withinNode.bind(this);
  findNode = this.withinNode.bind(this);

  /**
   * Create a {@link GotoScope} to go to a child node,
   * then continue operating on the child node.
   * @example
   * // `$.ajax({ ... })` goes to `$.ajax`
   * gotoNodeSync('callee', () => { })
   * @param {string} child_node_name - the name of the child nodes.
   * @param {Function} func - to continue operating on the matching nodes.
   */
  gotoNodeSync(childNodeName: string, func: (instance: Instance) => void) {
    new GotoScope(this, childNodeName, func).processSync();
  }

  /**
   * Create a {@link GotoScope} to go to a child node,
   * then continue operating on the child node.
   * @async
   * @example
   * // `$.ajax({ ... })` goes to `$.ajax`
   * await gotoNode('callee', async () => {})
   * @param {string} child_node_name - the name of the child nodes.
   * @param {Function} func - to continue operating on the matching nodes.
   */
  async gotoNode(childNodeName: string, func: (instance: Instance) => void) {
    await new GotoScope(this, childNodeName, func).process();
  }

  ifExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): void;
  ifExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): void;
  ifExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ): void;
  ifExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): void;
  /**
   * Create a {@link IfExistCondition} to check if matching nodes exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends React.Component` matches and call `foobar`.
   * ifExistNodeSync({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, () => { foobar })
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {ConditionOptions|Function} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
  ifExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      return new IfExistCondition(
        this,
        nqlOrRules,
        {},
        options,
        func
      ).processSync();
    }
    return new IfExistCondition(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc
    ).processSync();
  }

  async ifExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): Promise<void>;
  async ifExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): Promise<void>;
  async ifExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ): Promise<void>;
  async ifExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): Promise<void>;
  /**
   * Create a {@link IfExistCondition} to check if matching nodes exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @async
   * @example
   * // `class Foobar extends React.Component` matches and call `foobar`.
   * await ifExistNode({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, async () => { foobar })
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {ConditionOptions|Function} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
  async ifExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      return await new IfExistCondition(
        this,
        nqlOrRules,
        {},
        options,
        func
      ).process();
    }
    await new IfExistCondition(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc
    ).process();
  }

  unlessExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): void;
  unlessExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): void;
  unlessExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ): void;
  unlessExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): void;
  /**
   * Create a {@link UnlessExistCondition} to check if matching nodes does not exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends Component` matches and call `foobar`.
   * unlessExistNodeSync({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, () => {})
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {ConditionOptions} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if no matching node exists in the child nodes.
   * @param {Function} elseFunc - call the else function if the matching nodes exists in the child nodes.
   */
  unlessExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      return new UnlessExistCondition(
        this,
        nqlOrRules,
        {},
        options,
        func
      ).processSync();
    }
    return new UnlessExistCondition(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc
    ).processSync();
  }

  async unlessExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): Promise<void>;
  async unlessExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): Promise<void>;
  async unlessExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ): Promise<void>;
  async unlessExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): Promise<void>;
  /**
   * Create a {@link UnlessExistCondition} to check if matching nodes does not exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @async
   * @example
   * // `class Foobar extends Component` matches and call `foobar`.
   * await unlessExistNode({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, async () => {})
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {ConditionOptions} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if no matching node exists in the child nodes.
   * @param {Function} elseFunc - call the else function if the matching nodes exists in the child nodes.
   */
  async unlessExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      return await new UnlessExistCondition(
        this,
        nqlOrRules,
        {},
        options,
        func
      ).process();
    }
    await new UnlessExistCondition(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc
    ).process();
  }

  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): void;
  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): void;
  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ): void;
  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): void;
  /**
   * Create a {@link IfOnlyExistCondition} to check if current node has only one child node and the child node matches rules,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar { foo() {} }` matches and call foobar, `class Foobar { foo() {}; bar() {}; }` does not match
   * ifOnlyExistNodeSync({ nodeType: "MethodDefinition", key: "foo" }, () => { foobar })
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {ConditionOptions|Function} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      return new IfOnlyExistCondition(
        this,
        nqlOrRules,
        {},
        options,
        func
      ).processSync();
    }
    return new IfOnlyExistCondition(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc
    ).processSync();
  }

  async ifOnlyExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): Promise<void>;
  async ifOnlyExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): Promise<void>;
  async ifOnlyExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ): Promise<void>;
  async ifOnlyExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): Promise<void>;
  /**
   * Create a {@link IfOnlyExistCondition} to check if current node has only one child node and the child node matches rules,
   * if so, then continue operating on each matching ast node.
   * @async
   * @example
   * // `class Foobar { foo() {} }` matches and call foobar, `class Foobar { foo() {}; bar() {}; }` does not match
   * await ifOnlyExistNode({ nodeType: "MethodDefinition", key: "foo" }, async () => { foobar })
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {ConditionOption|Function} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
  async ifOnlyExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      return await new IfOnlyExistCondition(
        this,
        nqlOrRules,
        {},
        options,
        func
      ).process();
    }
    await new IfOnlyExistCondition(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc
    ).process();
  }

  ifAllNodesSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): void;
  ifAllNodesSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): void;
  ifAllNodesSync(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ): void;
  ifAllNodesSync(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): void;
  /**
   * Create a {@link IfAllCondition} to check if all matching nodes match options.match,
   * if so, then call the func, else call the elseFunc.
   * @example
   * // `class Foobar { foo() {}; bar() {}; }` matches and call foobar
   * ifAllNodesSync({ nodeType: "MethodDefinition" }, { match: { key: { in: ["foo", "bar"] } } }, () => { foo }, () => { bar });
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {ConditionOptions|Function} options - { match: nqlOrRules, in: 'callee' }
   * @param {Function} func - call the function if the matching nodes match options.match.
   * @param {Function} elseFunc - call the else function if no matching node matches options.match.
   */
  ifAllNodesSync(
    nqlOrRules: string | object,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      return new IfAllCondition(
        this,
        nqlOrRules,
        {},
        options,
        func
      ).processSync();
    }
    return new IfAllCondition(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc
    ).processSync();
  }

  async ifAllNodes(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): Promise<void>;
  async ifAllNodes(
    nqlOrRules: string | object,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): Promise<void>;
  async ifAllNodes(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ): Promise<void>;
  async ifAllNodes(
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ): Promise<void>;
  /**
   * Create a {@link IfAllCondition} to check if all matching nodes match options.match,
   * if so, then call the func, else call the elseFunc.
   * @async
   * @example
   * // `class Foobar { foo() {}; bar() {}; }` matches and call foobar
   * await ifAllNodes({ nodeType: "MethodDefinition" }, { match: { key: { in: ["foo", "bar"] } } }, () => { foo }, async () => { bar });
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {ConditionOptions|Function} options - { match: nqlOrRules, in: 'callee' }
   * @param {Function} func - call the function if the matching nodes match options.match.
   * @param {Function} elseFunc - call the else function if no matching node matches options.match.
   */
  async ifAllNodes(
    nqlOrRules: string | object,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    if (typeof options === "function") {
      return await new IfAllCondition(
        this,
        nqlOrRules,
        {},
        options,
        func
      ).process();
    }
    await new IfAllCondition(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc
    ).process();
  }

  /**
   * Append the code to the bottom of current node body.
   * @example
   * // foo() => {}
   * // will be converted to
   * // foo() => {}
   * // bar() => {}
   * // after executing
   * withNode({ nodeType: "MethodDefinition", key: "foo" }, () => {
   *   append("bar() => {}")
   * })
   * @param {string} code - need to be appended.
   */
  append(code: string): void {
    this.currentMutation.append(this.currentNode, code);
  }

  /**
   * Prepend the code to the top of current node body.
   * @example
   * // const foo = bar
   * // will be converted to
   * // 'use strict'
   * // const foo = bar
   * // after executing
   * prepend("'use strict'");
   * @param {string} code - need to be prepended.
   */
  prepend(code: string): void {
    this.currentMutation.prepend(this.currentNode, code);
  }

  /**
   * Insert code to the beginning or end of the current node.
   * @example
   * // import React, { Component } from 'react'
   * // will be converted to
   * // import React, { Component, useState } from 'react'
   * // after executing
   * withNode({ nodeType: "ImportSpecifier", name: "Component" }, () => {
   *   insert(", useState", { at: "end" });
   * });
   * @param {string} code - code need to be inserted
   * @param {Object} options
   * @param {string} [options.at = "end"] - insert position, beginning or end
   * @param {string} [option.to] - selector to find the child ast node
   */
  insert(code: string, options: InsertOptions): void {
    this.currentMutation.insert(this.currentNode, code, options);
  }

  /**
   * Insert the code next to the current node.
   * @example
   * // import React from 'react'
   * // will be converted to
   * // import React from 'react'
   * // import PropTypes from 'prop-types'
   * // after executing
   * withNode({ nodeType: "ImportClause", name: "React" }, () => {
   *   insertAfter("import PropTypes from 'prop-types'");
   * });
   * @param {string} code - code need to be inserted
   * @param {Object} options
   * @param {string} [options.to] - selector to find the child ast node
   */
  insertAfter(code: string, options: InsertOptions): void {
    const column = " ".repeat(
      NodeMutation.getAdapter().getStartLoc(this.currentNode).column
    );
    this.currentMutation.insert(this.currentNode, `\n${column}${code}`, {
      ...options,
      ...{ at: "end" },
    });
  }

  /**
   * Insert the code previous to the current node.
   * @example
   * // import React from 'react'
   * // will be converted to
   * // import PropTypes from 'prop-types'
   * // import React from 'react'
   * // after executing
   * withNode({ nodeType: "ImportClause", name: "React" }, () => {
   *   insertBefore("import PropTypes from 'prop-types'");
   * });
   * @param {string} code - code need to be inserted
   * @param {Object} options
   * @param {string} [options.to] - selector to find the child ast node
   */
  insertBefore(code: string, options: InsertOptions): void {
    const column = " ".repeat(
      NodeMutation.getAdapter().getStartLoc(this.currentNode).column
    );
    this.currentMutation.insert(this.currentNode, `${code}\n${column}`, {
      ...options,
      ...{ at: "beginning" },
    });
  }

  /**
   * Delete child nodes.
   * @example
   * // const someObject = { cat: cat, dog: dog, bird: bird }
   * // will be converted to
   * // const someObject = { cat, dog, bird }
   * // after executing
   * withNode({ nodeType: "Property", key: { nodeType: "Identifier" }, value: { nodeType: "Identifier" } }, () => {
   *   delete(["semicolon", "value"]);
   * });
   * @param {string|string[]} selectors - name of child nodes
   */
  delete(selectors: string | string[]): void {
    this.currentMutation.delete(this.currentNode, selectors);
  }

  /**
   * Remove current node.
   * @example
   * // class A {
   * //   constructor(props) {
   * //     super(props)
   * //   }
   * // }
   * // will be converted to
   * // class A {
   * // }
   * // after executing
   * withNode({ nodeType: "MethodDefinition", kind: "constructor" }, () => {
   *   remove();
   * });
   */
  remove(): void {
    this.currentMutation.remove(this.currentNode);
  }

  /**
   * Replace child nodes with code.
   * @example
   * // $form.submit();
   * // will be converted to
   * // $form.trigger('submit');
   * // after executing
   * withNode({ nodeType: "CallExpression", callee: { nodeType: "MemberExpression", object: /^\$/, property: 'submit' }, arguments: { length: 0 } }, () => {
   *   replace(["callee.property", "arguments"], { with: "trigger('submit')" });
   * });
   * @param {string|string[]} selectors - name of child nodes.
   * @param {Object} options
   * @param {string} options.with - new code to replace with
   */
  replace(selectors: string | string[], options: ReplaceOptions): void {
    this.currentMutation.replace(this.currentNode, selectors, options);
  }

  /**
   * Replace current node with code.
   * @example
   * // module.exports = Rewriter
   * // will be converted to
   * // export default Rewriter
   * // after executing
   * withNode({ nodeType: "ExpressionStatement", expression: { nodeType: "AssignmentExpression", left: { nodeType: "MemberExpression", object: "module", property: "exports" }, right: { nodeType: "Identifier" } } }, () => {
   *   replaceWith("export default {{expression.right}}");
   * });
   * @param {string} code - code need to be replaced.
   * @param {Object} options
   * @param {boolean} [options.autoIndent = true] - if true, auto indent the new code
   */
  replaceWith(code: string, options: ReplaceWithOptions): void {
    this.currentMutation.replaceWith(this.currentNode, code, options);
  }

  /**
   * No operation.
   */
  noop(): void {
    this.currentMutation.noop(this.currentNode);
  }

  /**
   * Sync to call a helper to run shared code.
   * @param {string} helperName - snippet helper name, it can be a http url, file path or a short name
   * @param options - options can be anything it needs to be passed to the helper
   */
  callHelperSync(helperName: string, options: any): void {
    const helperContent = loadSnippetSync(helperName, false);
    this.options = options;
    Function(helperContent).call(this, this);
    this.options = undefined;
  }

  /**
   * Async to call a helper to run shared code.
   * @async
   * @param {string} helperName - snippet helper name, it can be a http url, file path or a short name
   * @param options - options can be anything it needs to be passed to the helper
   */
  async callHelper(helperName: string, options: any): Promise<void> {
    const helperContent = await loadSnippet(helperName, false);
    this.options = options;
    // await Function(`(async () => { ${helperContent} })()`).call(this, this);
    // is not working
    await eval(`(async () => { ${helperContent} }).call(this, this)`);
    this.options = undefined;
  }

  /**
   * Wrap str string with single or double quotes based on Configuration.singleQuote.
   * @param {string} str string
   * @returns {string} quoted string
   */
  wrapWithQuotes(str: string): string {
    const quote = Configuration.singleQuote ? "'" : '"';
    const anotherQuote = Configuration.singleQuote ? '"' : "'";
    if (str.indexOf(quote) !== -1 && str.indexOf(anotherQuote) === -1) {
      return `${anotherQuote}${str}${anotherQuote}`;
    }
    const escapedStr = str.replace(new RegExp(quote, "g"), `\\${quote}`);
    return `${quote}${escapedStr}${quote}`;
  }

  /**
   * Append semicolon to str if Configuration.semi is true.
   * @param {string} str string
   * @returns {string}
   */
  appendSemicolon(str: string): string {
    if (Configuration.semi && !str.endsWith(";")) {
      return `${str};`;
    }
    return str;
  }

  /**
   * Add leading spaces to the str according to Configuration.tabWidth.
   * @param {string} str string
   * @param {object} options
   * @param {number} options.tabSize tab size, default is 1
   * @returns {string}
   */
  addLeadingSpaces(
    str: string,
    { tabSize }: { tabSize: number } = { tabSize: 1 }
  ): string {
    return " ".repeat(Configuration.tabWidth * tabSize) + str;
  }

  /**
   * Indent each line in a string.
   * @example
   * //   foo
   * //   bar
   * indent("foo\nbar", 2)
   * @param {string} str
   * @param {number} spaceCount
   * @returns {string} indented str
   */
  indent(str: string, spaceCount: number): string {
    return str
      .split("\n")
      .map((line) => {
        if (/^\s*$/.test(line)) {
          return line;
        }
        return " ".repeat(spaceCount) + line;
      })
      .join("\n");
  }

  /**
   * Parse code ast node.
   * @private
   * @param filePath {string} file path
   * @param source {string} file source
   * @returns {Node} ast node
   */
  private parseCode(filePath: string, source: string) {
    if (this.rewriter.options.parser === Parser.ESPREE) {
      return this.parseByEspree(filePath, source);
    }

    return this.parseByTypescript(filePath, source);
  }

  /**
   * Parse by typescript.
   * @private
   * @param filePath {string} file path
   * @param source {string} file source
   * @returns {Node} ast node
   */
  private parseByTypescript(filePath: string, source: string) {
    const scriptKind = ["js", "jsx"].includes(path.extname(filePath))
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TSX;
    return ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );
  }

  /**
   * Parse by espree.
   * @private
   * @param filePath {string} file path
   * @param source {string} file source
   * @returns {Node} ast node
   */
  private parseByEspree(filePath: string, source: string) {
    return espree.parse(source, {
      ecmaVersion: "latest",
      loc: true,
      sourceType: this.rewriter.options.sourceType,
      sourceFile: filePath,
      ecmaFeatures: { jsx: true },
    });
  }
}

export default Instance;

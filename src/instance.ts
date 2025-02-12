import ts from "typescript";
import * as espree from "@synvert-hq/espree";
import gonzales from "@synvert-hq/gonzales-pe";
import fs, { promises as promisesFs } from "fs";
import path from "path";
import debug from "debug";
import Configuration from "./configuration";
import Rewriter from "./rewriter";
import Helper from "./helper";
import { WithinScope, GotoScope } from "./scope";
import {
  IfExistCondition,
  UnlessExistCondition,
  IfOnlyExistCondition,
  IfAllCondition,
  ConditionOptions,
} from "./condition";
import { evalHelperSync, evalHelper } from "./utils";
import { QueryOptions } from "@synvert-hq/node-query";
import NodeMutation, {
  Strategy,
  InsertOptions,
  ReplaceOptions,
  DeleteOptions,
  RemoveOptions,
  Adapter as MutationAdapter,
} from "@synvert-hq/node-mutation";
import { Parser, NewLineInsertOptions } from "./types/options";
import { TestResultExt } from "./types/result";
import * as HtmlEngine from "./engines/html";
import * as RailsErbEngine from "./engines/rails_erb";

interface Engine {
  encode: (code: string) => string;
}

const DEFAULT_ENGINES: { [extname: string]: Engine } = {
  ".html": HtmlEngine,
  ".erb": RailsErbEngine,
};

/**
 * Instance is an execution unit, it finds specified ast nodes,
 * checks if the nodes match some conditions, then insert, replace or delete code.
 * One instance can contains one or many Scope and Condition.
 * @property {string} filePath - file path to run instance
 * @borrows Instance#withinNodeSync as Instance#withNodeSync
 * @borrows Instance#findNodeSync as Instance#withNodeSync
 * @borrows Instance#withinNode as Instance#withNode
 * @borrows Instance#findNode as Instance#withNode
 */
class Instance<T> {
  public currentNode!: T;
  private currentMutation!: NodeMutation<T>;
  public options: any;

  /**
   * Current instance.
   * @static
   */
  static current: Instance<any>;

  /**
   * Create an Instance
   * @param {string} filePath - file path
   * @param {Function} func - a function to find nodes, match conditions and rewrite code.
   */
  constructor(
    private rewriter: Rewriter<T>,
    public filePath: string,
    private func: (instance: Instance<T>) => void,
  ) {
    let strategy = Strategy.KEEP_RUNNING;
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
    // It keeps running until no conflict.
    while (true) {
      const source = fs.readFileSync(currentFilePath, "utf-8");
      this.currentMutation = new NodeMutation<T>(source, {
        adapter: this.rewriter.parser,
      });
      try {
        const node = this.parseCode(currentFilePath, source);

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
    // It keeps running until no conflict.
    while (true) {
      const source = await promisesFs.readFile(currentFilePath, "utf-8");
      this.currentMutation = new NodeMutation<T>(source, {
        adapter: this.rewriter.parser,
      });
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
    this.currentMutation = new NodeMutation<T>(source, {
      adapter: this.rewriter.parser,
    });
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
    this.currentMutation = new NodeMutation<T>(source, {
      adapter: this.rewriter.parser,
    });
    const node = this.parseCode(currentFilePath, source);

    await this.processWithNode(node, this.func);

    const result = this.currentMutation.test() as TestResultExt;
    result.filePath = this.filePath;
    debug("synvert-core:test")(result);
    return result;
  }

  /**
   * Set currentNode to node and process.
   * @param {T} node - set to current node
   * @param {Function} func
   */
  processWithNodeSync(node: T, func: (instance: Instance<T>) => void) {
    this.currentNode = node;
    func.call(this, this);
    this.currentNode = node;
  }

  /**
   * Set currentNode to node and process.
   * @async
   * @param {T} node - set to current node
   * @param {Function} func
   */
  async processWithNode(node: T, func: (instance: Instance<T>) => void) {
    this.currentNode = node;
    await func.call(this, this);
    this.currentNode = node;
  }

  /**
   * Set currentNode properly, process and set currentNode back to original currentNode.
   * @param {T} node - set to other node
   * @param {Function} func
   */
  processWithOtherNodeSync(node: T, func: (instance: Instance<T>) => void) {
    const originalNode = this.currentNode;
    this.currentNode = node;
    func.call(this, this);
    this.currentNode = originalNode;
  }

  /**
   * Set currentNode properly, process and set currentNode back to original currentNode.
   * @async
   * @param {T} node - set to other node
   * @param {Function} func
   */
  async processWithOtherNode(node: T, func: (instance: Instance<T>) => void) {
    const originalNode = this.currentNode;
    this.currentNode = node;
    await func.call(this, this);
    this.currentNode = originalNode;
  }

  /**
   * Get rewriter's parser.
   *
   * @returns {string} parser
   */
  get parser(): string {
    return this.rewriter.parser;
  }

  /**
   * Get currentMutation's adapter.
   *
   * @returns {MutationAdapter<T>}
   */
  get mutationAdapter(): MutationAdapter<T> {
    return this.currentMutation.adapter;
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
   * @typedef {Object} ConditionOptions<T>
   * @property {string} [in] - to do find in specific child node, e.g. `{ in: 'callee' }`
   * @property {Function|string|Object} [match] - It can a function, nql or rules to be matched.
   */

  /*******
   * DSL *
   *******/

  withinNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): void;
  withinNodeSync(
    nqlOrRules: string | object,
    options: QueryOptions,
    func: (instance: Instance<T>) => void,
  ): void;
  /**
   * Create a {@link WithinScope} to recursively find matching ast nodes,
   * then continue operating on each matching ast node.
   * @example
   * // `$.ajax({ ... })` matches and call `foobar`
   * withinNodeSync({ nodeType: "CallExpression", callee: { nodeType: "MemberExpression", object: "$", property: "ajax" } }, () => { foobar })
   * withinNodeSync(".CallExpression[callee=.MemberExpression[object=$][property=ajax]]", () => { foobar });
   * @param nqlOrRules {string|Object} - to find matching ast nodes.
   * @param options {QueryOptions|Function} - query options.
   * @param func {Function} - to be called on the matching nodes.
   */
  withinNodeSync(
    nqlOrRules: string | object,
    options: QueryOptions | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      new WithinScope<T>(this, nqlOrRules, {}, options).processSync();
    } else {
      new WithinScope<T>(this, nqlOrRules, options, func!).processSync();
    }
  }

  withNodeSync = this.withinNodeSync.bind(this);
  findNodeSync = this.withinNodeSync.bind(this);

  async withinNode(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async withinNode(
    nqlOrRules: string | object,
    options: QueryOptions,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  /**
   * Create a {@link WithinScope} to recursively find matching ast nodes,
   * then continue operating on each matching ast node.
   * @async
   * @example
   * // `$.ajax({ ... })` matches and call `foobar`
   * await withinNode({ nodeType: "CallExpression", callee: { nodeType: "MemberExpression", object: "$", property: "ajax" } }, async () => { foobar })
   * await withinNode(".CallExpression[callee=.MemberExpression[object=$][property=ajax]]", async () => { foobar });
   * @param nqlOrRules {string|Object} - to find matching ast nodes.
   * @param options {QueryOptions|Function} - query options.
   * @param func {Function} - to be called on the matching nodes.
   */
  async withinNode(
    nqlOrRules: string | object,
    options: QueryOptions | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      await new WithinScope<T>(this, nqlOrRules, {}, options).process();
    } else {
      await new WithinScope<T>(this, nqlOrRules, options, func!).process();
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
  gotoNodeSync(childNodeName: string, func: (instance: Instance<T>) => void) {
    new GotoScope<T>(this, childNodeName, func).processSync();
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
  async gotoNode(childNodeName: string, func: (instance: Instance<T>) => void) {
    await new GotoScope<T>(this, childNodeName, func).process();
  }

  ifExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): void;
  ifExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): void;
  ifExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
  ): void;
  ifExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): void;
  /**
   * Create a {@link IfExistCondition} to check if matching nodes exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends React.Component` matches and call `foobar`.
   * ifExistNodeSync({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, () => { foobar })
   * @param {string|Object} nqlOrRules - to check matching ast nodes.
   * @param {ConditionOptions<T>|Function} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
  ifExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T> | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
    elseFunc?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      return new IfExistCondition<T>(
        this,
        nqlOrRules,
        {},
        options,
        func,
      ).processSync();
    }
    return new IfExistCondition<T>(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc,
    ).processSync();
  }

  async ifExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): Promise<void>;
  /**
   * Create a {@link IfExistCondition} to check if matching nodes exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @async
   * @example
   * // `class Foobar extends React.Component` matches and call `foobar`.
   * await ifExistNode({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, async () => { foobar })
   * @param {string|Object} nqlOrRules - to check matching ast nodes.
   * @param {ConditionOptions<T>|Function} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
  async ifExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T> | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
    elseFunc?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      return await new IfExistCondition<T>(
        this,
        nqlOrRules,
        {},
        options,
        func,
      ).process();
    }
    await new IfExistCondition<T>(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc,
    ).process();
  }

  unlessExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): void;
  unlessExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): void;
  unlessExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
  ): void;
  unlessExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): void;
  /**
   * Create a {@link UnlessExistCondition} to check if matching nodes does not exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends Component` matches and call `foobar`.
   * unlessExistNodeSync({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, () => {})
   * @param {string|Object} nqlOrRules - to check matching ast nodes.
   * @param {ConditionOptions<T>} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if no matching node exists in the child nodes.
   * @param {Function} elseFunc - call the else function if the matching nodes exists in the child nodes.
   */
  unlessExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T> | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
    elseFunc?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      return new UnlessExistCondition<T>(
        this,
        nqlOrRules,
        {},
        options,
        func,
      ).processSync();
    }
    return new UnlessExistCondition<T>(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc,
    ).processSync();
  }

  async unlessExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async unlessExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): Promise<void>;
  async unlessExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async unlessExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): Promise<void>;
  /**
   * Create a {@link UnlessExistCondition} to check if matching nodes does not exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @async
   * @example
   * // `class Foobar extends Component` matches and call `foobar`.
   * await unlessExistNode({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, async () => {})
   * @param {string|Object} nqlOrRules - to check matching ast nodes.
   * @param {ConditionOptions<T>} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if no matching node exists in the child nodes.
   * @param {Function} elseFunc - call the else function if the matching nodes exists in the child nodes.
   */
  async unlessExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T> | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
    elseFunc?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      return await new UnlessExistCondition<T>(
        this,
        nqlOrRules,
        {},
        options,
        func,
      ).process();
    }
    await new UnlessExistCondition<T>(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc,
    ).process();
  }

  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): void;
  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): void;
  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
  ): void;
  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): void;
  /**
   * Create a {@link IfOnlyExistCondition} to check if current node has only one child node and the child node matches rules,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar { foo() {} }` matches and call foobar, `class Foobar { foo() {}; bar() {}; }` does not match
   * ifOnlyExistNodeSync({ nodeType: "MethodDefinition", key: "foo" }, () => { foobar })
   * @param {string|Object} nqlOrRules - to check matching ast nodes.
   * @param {ConditionOptions<T>|Function} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
  ifOnlyExistNodeSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T> | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
    elseFunc?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      return new IfOnlyExistCondition<T>(
        this,
        nqlOrRules,
        {},
        options,
        func,
      ).processSync();
    }
    return new IfOnlyExistCondition<T>(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc,
    ).processSync();
  }

  async ifOnlyExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifOnlyExistNode(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifOnlyExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifOnlyExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): Promise<void>;
  /**
   * Create a {@link IfOnlyExistCondition} to check if current node has only one child node and the child node matches rules,
   * if so, then continue operating on each matching ast node.
   * @async
   * @example
   * // `class Foobar { foo() {} }` matches and call foobar, `class Foobar { foo() {}; bar() {}; }` does not match
   * await ifOnlyExistNode({ nodeType: "MethodDefinition", key: "foo" }, async () => { foobar })
   * @param {string|Object} nqlOrRules - to check matching ast nodes.
   * @param {ConditionOption|Function} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
  async ifOnlyExistNode(
    nqlOrRules: string | object,
    options: ConditionOptions<T> | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
    elseFunc?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      return await new IfOnlyExistCondition<T>(
        this,
        nqlOrRules,
        {},
        options,
        func,
      ).process();
    }
    await new IfOnlyExistCondition<T>(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc,
    ).process();
  }

  ifAllNodesSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): void;
  ifAllNodesSync(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): void;
  ifAllNodesSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
  ): void;
  ifAllNodesSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): void;
  /**
   * Create a {@link IfAllCondition} to check if all matching nodes match options.match,
   * if so, then call the func, else call the elseFunc.
   * @example
   * // `class Foobar { foo() {}; bar() {}; }` matches and call foobar
   * ifAllNodesSync({ nodeType: "MethodDefinition" }, { match: { key: { in: ["foo", "bar"] } } }, () => { foo }, () => { bar });
   * @param {string|Object} nqlOrRules - to check matching ast nodes.
   * @param {ConditionOptions<T>|Function} options - { match: nqlOrRules, in: 'callee' }
   * @param {Function} func - call the function if the matching nodes match options.match.
   * @param {Function} elseFunc - call the else function if no matching node matches options.match.
   */
  ifAllNodesSync(
    nqlOrRules: string | object,
    options: ConditionOptions<T> | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
    elseFunc?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      return new IfAllCondition<T>(
        this,
        nqlOrRules,
        {},
        options,
        func,
      ).processSync();
    }
    return new IfAllCondition<T>(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc,
    ).processSync();
  }

  async ifAllNodes(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifAllNodes(
    nqlOrRules: string | object,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifAllNodes(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
  ): Promise<void>;
  async ifAllNodes(
    nqlOrRules: string | object,
    options: ConditionOptions<T>,
    func: (instance: Instance<T>) => void,
    elseFunc: (instance: Instance<T>) => void,
  ): Promise<void>;
  /**
   * Create a {@link IfAllCondition} to check if all matching nodes match options.match,
   * if so, then call the func, else call the elseFunc.
   * @async
   * @example
   * // `class Foobar { foo() {}; bar() {}; }` matches and call foobar
   * await ifAllNodes({ nodeType: "MethodDefinition" }, { match: { key: { in: ["foo", "bar"] } } }, () => { foo }, async () => { bar });
   * @param {string|Object} nqlOrRules - to check matching ast nodes.
   * @param {ConditionOptions<T>|Function} options - { match: nqlOrRules, in: 'callee' }
   * @param {Function} func - call the function if the matching nodes match options.match.
   * @param {Function} elseFunc - call the else function if no matching node matches options.match.
   */
  async ifAllNodes(
    nqlOrRules: string | object,
    options: ConditionOptions<T> | ((instance: Instance<T>) => void),
    func?: (instance: Instance<T>) => void,
    elseFunc?: (instance: Instance<T>) => void,
  ) {
    if (typeof options === "function") {
      return await new IfAllCondition<T>(
        this,
        nqlOrRules,
        {},
        options,
        func,
      ).process();
    }
    await new IfAllCondition<T>(
      this,
      nqlOrRules,
      options,
      func!,
      elseFunc,
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
   * @param {boolean} [option.andComma] - insert additional comma
   * @param {boolean} [option.andSpace] - insert additional space
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
   * @param {boolean} [option.andComma] - insert additional comma
   * @param {boolean} [option.andSpace] - insert additional space
   */
  insertAfter(code: string, options: NewLineInsertOptions = {}): void {
    const column = " ".repeat(
      this.currentMutation.adapter.getStartLoc(this.currentNode, options.to)
        .column,
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
   * @param {boolean} [option.andComma] - insert additional comma
   * @param {boolean} [option.andSpace] - insert additional space
   */
  insertBefore(code: string, options: InsertOptions = {}): void {
    const column = " ".repeat(
      this.currentMutation.adapter.getStartLoc(this.currentNode, options.to)
        .column,
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
   * @param {Object} options
   * @param {boolean} [options.wholeLine = false] - remove the whole line
   * @param {boolean} [option.andComma] - delete additional comma
   */
  delete(selectors: string | string[], options: DeleteOptions): void {
    this.currentMutation.delete(this.currentNode, selectors, options);
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
   * @param {Object} options
   * @param {boolean} [option.andComma] - remove additional comma
   */
  remove(options: RemoveOptions): void {
    this.currentMutation.remove(this.currentNode, options);
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
   */
  replaceWith(code: string): void {
    this.currentMutation.replaceWith(this.currentNode, code);
  }

  /**
   * No operation.
   */
  noop(): void {
    this.currentMutation.noop(this.currentNode);
  }

  /**
   * Group actions.
   * @async
   * @example
   * group(() => {
   *   delete("leftCurlyBracket");
   *   delete("rightCurlyBracket", { wholeLine: true });
   * });
   * @param {Function} func
   */
  async group(func: () => void | Promise<void>) {
    const result = this.currentMutation.group(func);
    if (result instanceof Promise) {
      await result;
    }
  }

  /**
   * Sync to call a helper to run shared code.
   * @param {string} helperName - snippet helper name, it can be a http url, file path or a helper name
   * @param options - options can be anything it needs to be passed to the helper
   */
  callHelperSync(helperName: string, options: any): void {
    const helper = Helper.fetch(helperName) || evalHelperSync(helperName);
    if (!helper) {
      return;
    }
    helper.func.call(this, options);
  }

  /**
   * Async to call a helper to run shared code.
   * @async
   * @param {string} helperName - snippet helper name, it can be a http url, file path or a helper name
   * @param options - options can be anything it needs to be passed to the helper
   */
  async callHelper(helperName: string, options: any): Promise<void> {
    const helper = Helper.fetch(helperName) || (await evalHelper(helperName));
    if (!helper) {
      return;
    }
    await helper.func.call(this, options);
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
    { tabSize }: { tabSize: number } = { tabSize: 1 },
  ): string {
    return " ".repeat(Configuration.tabWidth * tabSize) + str;
  }

  /**
   * Indent each line in a string.
   * @example
   * //   foo
   * //   bar
   * indentCode("foo\nbar", 2)
   * @param {string} str
   * @param {number} tabSize
   * @param {object} options
   * @param {number} options.skipFirstLine skip first line, default is false
   * @returns {string} indented str
   */
  indentCode(
    str: string,
    tabSize: number,
    { skipFirstLine }: { skipFirstLine: boolean } = { skipFirstLine: false },
  ): string {
    let firstLine = true;
    return str
      .split("\n")
      .map((line, index) => {
        if (/^\s*$/.test(line)) {
          return line;
        }
        if (firstLine && skipFirstLine) {
          firstLine = !firstLine;
          return line;
        }
        if (tabSize > 0) {
          return " ".repeat(tabSize * Configuration.tabWidth) + line;
        } else {
          return line.slice(-tabSize * Configuration.tabWidth);
        }
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
    if (this.rewriter.options.parser === Parser.GONZALES_PE) {
      return this.parseByGonzalesPe(filePath, source);
    }
    if (this.rewriter.options.parser === Parser.ESPREE) {
      return this.parseByEspree(filePath, source);
    }

    return this.parseByTypescript(filePath, source);
  }

  private parseByGonzalesPe(filePath: string, source: string) {
    const syntax = path.extname(filePath).split(".").pop();
    return gonzales.parse(source, { syntax, sourceFile: filePath });
  }

  /**
   * Parse by typescript.
   * @private
   * @param filePath {string} file path
   * @param source {string} file source
   * @returns {Node} ast node
   */
  private parseByTypescript(filePath: string, source: string) {
    const scriptKind = [".js", ".jsx", ".html"].includes(path.extname(filePath))
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TSX;
    return ts.createSourceFile(
      filePath,
      this.sourceToParse(filePath, source),
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
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
    return espree.parse(this.sourceToParse(filePath, source), {
      ecmaVersion: "latest",
      loc: true,
      sourceType: this.rewriter.options.sourceType,
      sourceFile: filePath,
      ecmaFeatures: { jsx: true },
    });
  }

  private sourceToParse(filePath: string, source: string) {
    const engine = DEFAULT_ENGINES[path.extname(filePath)];
    return engine ? engine.encode(source) : source;
  }
}

export default Instance;

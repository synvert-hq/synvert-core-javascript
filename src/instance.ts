import ts from "typescript";
import fs, { promises as promisesFs } from "fs";
import path from "path";
import fg from "fast-glob";
import minimatch from "minimatch";
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
import {
  isValidFile,
  isValidFileSync,
  loadSnippet,
  loadSnippetSync,
} from "./utils";
import NodeQuery, {
  QueryOptions,
  TypescriptAdapter as TypescriptQueryAdapter,
  Adapter as QueryAdapter,
} from "@xinminlabs/node-query";
import NodeMutation, {
  Strategy as NodeMutationStrategy,
  TypescriptAdapter as TypescriptMutationAdapter,
  InsertOptions,
  ReplaceWithOptions,
  ReplaceOptions,
  Adapter as MutationAdapter,
} from "@xinminlabs/node-mutation";
import EspreeMutationAdapter from "./node-mutation/espree-adapter";
import EspreeQueryAdapter from "./node-query/espree-adapter";
import { Parser, Strategy } from "./types/options";
import { TestResultExt } from "./types/result";

const espree = require("@xinminlabs/espree");

/**
 * Instance is an execution unit, it finds specified ast nodes,
 * checks if the nodes match some conditions, then insert, replace or delete code.
 * One instance can contains one or many Scope and Condition.
 * @borrows Instance#withinNode as Instance#withNode
 */
class Instance {
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
   * @param {string} filePattern - pattern to find files, e.g. `lib/*.js`
   * @param {Function} func - a function to find nodes, match conditions and rewrite code.
   */
  constructor(
    private rewriter: Rewriter,
    private filePattern: string,
    private func: (instance: Instance) => void
  ) {
    let strategy = NodeMutationStrategy.KEEP_RUNNING;
    if (rewriter.options.strategy === Strategy.ALLOW_INSERT_AT_SAME_POSITION) {
      strategy = strategy | NodeMutationStrategy.ALLOW_INSERT_AT_SAME_POSITION;
    }
    NodeMutation.configure({ strategy });
  }

  /**
   * Process the instance.
   * It finds all files, for each file, it runs the func, rewrites the original code,
   * then write the code back to the original file.
   */
  processSync(): void {
    if (
      isValidFileSync(Configuration.rootPath) &&
      minimatch(Configuration.rootPath, this.filePattern)
    ) {
      return this.processFileSync(Configuration.rootPath);
    }

    this.matchFilesInPathsSync().forEach((filePath) =>
      this.processFileSync(filePath)
    );
  }

  async process(): Promise<void> {
    if (
      (await isValidFile(Configuration.rootPath)) &&
      minimatch(Configuration.rootPath, this.filePattern)
    ) {
      return this.processFile(Configuration.rootPath);
    }

    const filePaths = await this.matchFilesInPaths();
    await Promise.all(filePaths.map((filePath) => this.processFile(filePath)));
  }

  /**
   * Test the instance.
   * It finds all files, for each file, it runs the func, and gets the process results.
   * @returns {TestResultExt[]} test results
   */
  testSync(): TestResultExt[] {
    if (
      isValidFileSync(Configuration.rootPath) &&
      minimatch(Configuration.rootPath, this.filePattern)
    ) {
      return [this.testFileSync(Configuration.rootPath)];
    }

    return this.matchFilesInPathsSync().map((filePath) =>
      this.testFileSync(filePath)
    );
  }

  async test(): Promise<TestResultExt[]> {
    if (
      (await isValidFile(Configuration.rootPath)) &&
      minimatch(Configuration.rootPath, this.filePattern)
    ) {
      return [await this.testFile(Configuration.rootPath)];
    }

    const filePaths = await this.matchFilesInPaths();
    return await Promise.all(
      filePaths.map((filePath) => this.testFile(filePath))
    );
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

  async processWithOtherNode(node: Node, func: (instance: Instance) => void) {
    const originalNode = this.currentNode;
    this.currentNode = node;
    await func.call(this, this);
    this.currentNode = originalNode;
  }

  /*******
   * DSL *
   *******/

  /**
   * Create a {@link WithinScope} to recursively find matching ast nodes,
   * then continue operating on each matching ast node.
   * @example
   * // `$.ajax({ ... })` matches and call `foobar`
   * withinNode({ nodeType: "CallExpression", callee: { nodeType: "MemberExpression", object: "$", property: "ajax" } }, () => { foobar })
   * withinNode(".CallExpression[callee=.MemberExpression[object=$][property=ajax]]", () => { foobar });
   * @param {string|Object} nqlOrRules - to find mathing ast nodes.
   * @param {Function} func - to be called on the matching nodes.
   */
  withinNodeSync(
    nqlOrRules: string | object,
    func: (instance: Instance) => void
  ): void;
  withinNodeSync(
    nqlOrRules: string | object,
    options: QueryOptions,
    func: (instance: Instance) => void
  ): void;
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
   * gotoNode('callee')
   * @param {string} child_node_name - the name of the child nodes.
   * @param {Function} func - to continue operating on the matching nodes.
   */
  gotoNodeSync(childNodeName: string, func: (instance: Instance) => void) {
    new GotoScope(this, childNodeName, func).processSync();
  }

  async gotoNode(childNodeName: string, func: (instance: Instance) => void) {
    await new GotoScope(this, childNodeName, func).process();
  }

  /**
   * Create a {@link IfExistCondition} to check if matching nodes exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends React.Component` matches and call `foobar`.
   * ifExistNode({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, () => { foobar })
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
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

  /**
   * Create a {@link UnlessExistCondition} to check if matching nodes does not exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends Component` matches and call `foobar`.
   * unlessExistNode({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, () => {})
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if no matching node exists in the child nodes.
   * @param {Function} elseFunc - call the else function if the matching nodes exists in the child nodes.
   */
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

  /**
   * Create a {@link IfOnlyExistCondition} to check if current node has only one child node and the child node matches rules,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar { foo() {} }` matches and call foobar, `class Foobar { foo() {}; bar() {}; }` does not match
   * ifOnlyExistNode({ nodeType: "MethodDefinition", key: "foo" }, () => { foobar })
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - call the function if the matching nodes exist in the child nodes.
   * @param {Function} elseFunc - call the else function if no matching node exists in the child nodes.
   */
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

  /**
   * Create a {@link IfAllCondition} to check if all matching nodes match options.match,
   * if so, then call the func, else call the elseFunc.
   * @example
   * // `class Foobar { foo() {}; bar() {}; }` matches and call foobar
   * IfAllNode({ nodeType: "MethodDefinition" }, { match: { key: { in: ["foo", "bar"] } } }, () => { foo }, () => { bar });
   * @param {string|Object} nqlOrRules - to check mathing ast nodes.
   * @param {Object} options - { match: nqlOrRules, in: 'callee' }
   * @param {Function} func - call the function if the matching nodes match options.match.
   * @param {Function} elseFunc - call the else function if no matching node matches options.match.
   */
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
   * @param {Object} options - insert position, beginning or end, end is the default
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
   * @param {Object} options - insert options, default is `{ at: "end" }`
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
   * @param {Object} options - insert options, default is `{ at: "beginning" }`
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
   *   deleteNode(["semicolon", "value"]);
   * });
   * @param {string} selectors - name of child nodes
   */
  deleteNode(selectors: string | string[]): void {
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
   * @param {string|array} selectors - name of child nodes.
   * @param {Object} options - code need to be replaced with.
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
   * @param {Object} options - { autoIndent: true } if auto fix indent
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
    const helperContent = loadSnippetSync(helperName);
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
    const helperContent = await loadSnippet(helperName);
    this.options = options;
    // await Function(`(async () => { ${helperContent} })()`).call(this, this);
    // is not working
    await eval(`(async () => { ${helperContent} })()`);
    this.options = undefined;
  }

  /**
   * Add `count` spaces to `str`.
   * @example
   * //   foo
   * //   bar
   * indent("foo\nbar", 2)
   * @param {string} str
   * @param {number} count
   * @returns {string} indented str
   */
  indent(str: string, count: number): string {
    return str
      .split("\n")
      .map((line) => {
        if (/^\s*$/.test(line)) {
          return line;
        }
        return " ".repeat(count) + line;
      })
      .join("\n");
  }

  /**
   * Get a node-mutation adapter
   * @returns {MutationAdapter}
   */
  mutationAdapter(): MutationAdapter<any> {
    return NodeMutation.getAdapter();
  }

  /**
   * Get a node-query adapter
   * @returns {QueryAdapter}
   */
  queryAdapter(): QueryAdapter<any> {
    return NodeQuery.getAdapter();
  }

  /**
   * Process one file.
   * @private
   * @param {string} filePath - file path
   */
  private processFileSync(filePath: string): void {
    if (
      this.rewriter.options.parser === Parser.ESPREE &&
      [".ts", ".tsx"].includes(path.extname(filePath))
    ) {
      return;
    }
    const currentFilePath = path.join(Configuration.rootPath, filePath);
    if (Configuration.showRunProcess) {
      console.log(filePath);
    }
    while (true) {
      const source = fs.readFileSync(currentFilePath, "utf-8");
      this.currentMutation = new NodeMutation<Node>(source);
      try {
        const node = this.parseCode(currentFilePath, source);

        this.processWithNodeSync(node, this.func);

        const result = this.currentMutation.process();
        debug("synvert-core:process")(result);
        if (result.affected) {
          this.rewriter.addAffectedFile(filePath);
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

  private async processFile(filePath: string): Promise<void> {
    if (
      this.rewriter.options.parser === Parser.ESPREE &&
      [".ts", ".tsx"].includes(path.extname(filePath))
    ) {
      return;
    }
    const currentFilePath = path.join(Configuration.rootPath, filePath);
    if (Configuration.showRunProcess) {
      console.log(filePath);
    }
    while (true) {
      const source = await promisesFs.readFile(currentFilePath, "utf-8");
      this.currentMutation = new NodeMutation<Node>(source);
      try {
        const node = this.parseCode(currentFilePath, source);

        await this.processWithNode(node, this.func);

        const result = this.currentMutation.process();
        debug("synvert-core:process")(result);
        if (result.affected) {
          this.rewriter.addAffectedFile(filePath);
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
   * @private
   * @param {string} filePath - file path
   * @returns {TestResultExt}
   */
  private testFileSync(filePath: string): TestResultExt {
    if (
      this.rewriter.options.parser === Parser.ESPREE &&
      [".ts", ".tsx"].includes(path.extname(filePath))
    ) {
      return { conflicted: false, affected: false, actions: [], filePath };
    }
    const currentFilePath = path.join(Configuration.rootPath, filePath);
    const source = fs.readFileSync(currentFilePath, "utf-8");
    this.currentMutation = new NodeMutation<Node>(source);
    const node = this.parseCode(currentFilePath, source);

    this.processWithNodeSync(node, this.func);

    const result = this.currentMutation.test() as TestResultExt;
    result.filePath = filePath;
    debug("synvert-core:test")(result);
    return result;
  }

  private async testFile(filePath: string): Promise<TestResultExt> {
    if (
      this.rewriter.options.parser === Parser.ESPREE &&
      [".ts", ".tsx"].includes(path.extname(filePath))
    ) {
      return { conflicted: false, affected: false, actions: [], filePath };
    }
    const currentFilePath = path.join(Configuration.rootPath, filePath);
    const source = await promisesFs.readFile(currentFilePath, "utf-8");
    this.currentMutation = new NodeMutation<Node>(source);
    const node = this.parseCode(currentFilePath, source);

    await this.processWithNode(node, this.func);

    const result = this.currentMutation.test() as TestResultExt;
    result.filePath = filePath;
    debug("synvert-core:test")(result);
    return result;
  }

  /**
   * Return matching files.
   * @returns {string[]} matching files
   */
  private matchFilesInPathsSync(): string[] {
    const onlyPaths =
      Configuration.onlyPaths.length > 0 ? Configuration.onlyPaths : [""];
    return fg.sync(
      onlyPaths.map((onlyPath) => path.join(onlyPath, this.filePattern)),
      {
        ignore: Configuration.skipPaths,
        cwd: Configuration.rootPath,
        onlyFiles: true,
        unique: true,
      }
    );
  }

  private async matchFilesInPaths(): Promise<string[]> {
    const onlyPaths =
      Configuration.onlyPaths.length > 0 ? Configuration.onlyPaths : [""];
    return fg(
      onlyPaths.map((onlyPath) => path.join(onlyPath, this.filePattern)),
      {
        ignore: Configuration.skipPaths,
        cwd: Configuration.rootPath,
        onlyFiles: true,
        unique: true,
      }
    );
  }

  /**
   * Parse code ast node.
   * @private
   * @param filePath {string} file path
   * @param source {string} file source
   * @returns {Node} ast node
   */
  private parseCode(filePath: string, source: string) {
    if (this.rewriter.options.parser === Parser.TYPESCRIPT) {
      return this.parseByTypescript(filePath, source);
    }

    return this.parseByEspree(filePath, source);
  }

  /**
   * Parse by typescript.
   * @private
   * @param filePath {string} file path
   * @param source {string} file source
   * @returns {Node} ast node
   */
  private parseByTypescript(filePath: string, source: string) {
    NodeQuery.configure({ adapter: new TypescriptQueryAdapter() });
    NodeMutation.configure({ adapter: new TypescriptMutationAdapter() });
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
    NodeQuery.configure({ adapter: new EspreeQueryAdapter() });
    NodeMutation.configure({ adapter: new EspreeMutationAdapter() });
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

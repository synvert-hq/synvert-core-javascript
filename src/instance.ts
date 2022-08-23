import ts from "typescript";
import fs from "fs";
import path from "path";
import glob from "glob";
import minimatch from "minimatch";
import debug from "debug";
import { Node } from "acorn";
import Configuration from "./configuration";
import Rewriter from "./rewriter";
import { QueryScope, WithinScope, GotoScope } from "./scope";
import {
  IfExistCondition,
  UnlessExistCondition,
  IfOnlyExistCondition,
  IfAllCondition,
  ConditionOptions,
} from "./condition";
import { indent } from "./utils";
import NodeQuery, {
  TypescriptAdapter as TypescriptQueryAdapter,
} from "@xinminlabs/node-query";
import NodeMutation, {
  STRATEGY,
  TypescriptAdapter as TypescriptMutationAdapter,
  InsertOptions,
  ReplaceWithOptions,
  ReplaceOptions,
  NotSupportedError,
  ConflictActionError,
  ProcessResult,
} from "@xinminlabs/node-mutation";
import EspreeMutationAdapter from "./node-mutation/espree-adapter";
import EspreeQueryAdapter from "./node-query/espree-adapter";
import { Parser } from "./types/options";
import { TestResult } from "./types/result";

const espree = require("@xinminlabs/espree");

NodeMutation.configure({ strategy: STRATEGY.KEEP_RUNNING });

/**
 * Instance is an execution unit, it finds specified ast nodes,
 * checks if the nodes match some conditions, then insert, replace or delete code.
 * One instance can contains one or many Scope and Condition.
 * @borrows Instance#withinNode as Instance#withNode
 */
class Instance {
  public currentNode!: Node;
  public currentFileSource!: string;
  public currentFilePath!: string;
  private currentMutation!: NodeMutation<Node>;

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
  ) {}

  /**
   * Process the instance.
   * It finds all files, for each file, it runs the func, rewrites the original code,
   * then write the code back to the original file.
   */
  process(): void {
    if (
      fs.existsSync(Configuration.path) &&
      minimatch(Configuration.path, this.filePattern)
    ) {
      return this.processFile(Configuration.path);
    }

    glob
      .sync(this.filePattern, {
        ignore: Configuration.skipFiles,
        cwd: Configuration.path,
        nodir: true,
        realpath: true,
        absolute: true,
      })
      .forEach((filePath) => this.processFile(filePath));
  }

  /**
   * Test the instance.
   * It finds all files, for each file, it runs the func, and gets the process results.
   * @returns {TestResult[]} test results
   */
  test(): TestResult[] {
    if (
      fs.existsSync(Configuration.path) &&
      minimatch(Configuration.path, this.filePattern)
    ) {
      return [
        { filePath: Configuration.path, ...this.testFile(Configuration.path) },
      ];
    }

    return glob
      .sync(this.filePattern, {
        ignore: Configuration.skipFiles,
        cwd: Configuration.path,
        nodir: true,
        realpath: true,
        absolute: true,
      })
      .map((filePath) => ({ filePath, ...this.testFile(filePath) }));
  }

  /**
   * Set currentNode to node and process.
   * @param {Node} node - set to current node
   * @param {Function} func
   */
  processWithNode(node: Node, func: (instance: Instance) => void) {
    this.currentNode = node;
    func.call(this, this);
    this.currentNode = node;
  }

  /**
   * Set currentNode properly, process and set currentNode back to original currentNode.
   * @param {Node} node - set to other node
   * @param {Function} func
   */
  processWithOtherNode(node: Node, func: (instance: Instance) => void) {
    const originalNode = this.currentNode;
    this.currentNode = node;
    func.call(this, this);
    this.currentNode = originalNode;
  }

  /*******
   * DSL *
   *******/

  /**
   * Parse findNode dsl.
   * It creates a {@link QueryScope} to recursively find matching ast nodes,
   * then continue oeprating on each matching ast node.
   * @example
   * // `$.ajax({ ... })` matches and call `foobar`
   * findNode(".CallExpression[callee=.MemberExpression[object=$][property=ajax]]", () => { foobar });
   * @param {string} queryString - query string to find matching ast nodes.
   * @param {Function} func - to be called on the matching nodes.
   */
  findNode(queryString: string, func: (instance: Instance) => void) {
    new QueryScope(Instance.current, queryString, func).process();
  }

  /**
   * Parse withinNode dsl.
   * It creates a {@link WithinScope} to recursively find matching ast nodes,
   * then continue operating on each matching ast node.
   * @example
   * // `$.ajax({ ... })` matches and call `foobar`
   * withinNode({ nodeType: "CallExpression", callee: { nodeType: "MemberExpression", object: "$", property: "ajax" } }, () => { foobar })
   * @param {Object} rules - to find mathing ast nodes.
   * @param {Function} func - to be called on the matching nodes.
   */
  withinNode(rules: any, func: (instance: Instance) => void) {
    new WithinScope(Instance.current, rules, func).process();
  }

  /**
   * Parse gotoNode dsl.
   * It creates a {@link GotoScope} to go to a child node,
   * then continue operating on the child node.
   * @example
   * // `$.ajax({ ... })` goes to `$.ajax`
   * gotoNode('callee')
   * @param {string} child_node_name - the name of the child nodes.
   * @param {Function} func - to continue operating on the matching nodes.
   */
  gotoNode(childNodeName: string, func: (instance: Instance) => void) {
    new GotoScope(Instance.current, childNodeName, func).process();
  }

  /**
   * Parse ifExistNode dsl
   * It creates a {@link IfExistCondition} to check if matching nodes exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends React.Component` matches and call `foobar`.
   * ifExistNode({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, () => { foobar })
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - to continue operating on the matching nodes.
   */
  ifExistNode(
    rules: any,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ) {
    new IfExistCondition(Instance.current, rules, options, func).process();
  }

  /**
   * Parse unlessExistNode dsl
   * It creates a {@link UnlessExistCondition} to check if matching nodes does not exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends Component` matches and call `foobar`.
   * unlessExistNode({ nodeType: "ClassDeclaration", superClass: { nodeType: "MemberExpression", object: "React", property: "Component" } }, () => {})
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - to continue operating on the matching nodes.
   */
  unlessExistNode(
    rules: any,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ) {
    new UnlessExistCondition(Instance.current, rules, options, func).process();
  }

  /**
   * Parse ifOnlyExistNode dsl
   * It creates a {@link IfOnlyExistCondition} to check if current node has only one child node and the child node matches rules,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar { foo() {} }` matches and call foobar, `class Foobar { foo() {}; bar() {}; }` does not match
   * ifOnlyExistNode({ nodeType: "MethodDefinition", key: "foo" }, () => { foobar })
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - to continue operating on the matching nodes.
   */
  ifOnlyExistNode(
    rules: any,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ) {
    new IfOnlyExistCondition(Instance.current, rules, options, func).process();
  }

  /**
   * Parse ifAllNodes dsl
   * It creates a {@link IfAllCondition} to check if all matching nodes match options.match,
   * if so, then call the func, else call the elseFunc.
   * @example
   * // `class Foobar { foo() {}; bar() {}; }` matches and call foobar
   * IfAllNode({ nodeType: "MethodDefinition" }, { match: { key: { in: ["foo", "bar"] } } }, () => { foo }, () => { bar });
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - { match: rules, in: 'callee' }
   * @param {Function} func - to continue if all the matching nodes match options.match.
   * @param {Function} elseFunc - to continue if not all the matching nodes match options.match.
   */
  ifAllNodes(
    rules: any,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ) {
    new IfAllCondition(
      Instance.current,
      rules,
      options,
      func,
      elseFunc
    ).process();
  }

  /**
   * Parse append dsl.
   * It creates a {@link AppendAction} to append the code to the bottom of current node body.
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
    Instance.current.currentMutation.append(Instance.current.currentNode, code);
  }

  /**
   * Parse prepend dsl.
   * It creates a {@link PrependAction} to prepend the code to the top of current node body.
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
    Instance.current.currentMutation.prepend(
      Instance.current.currentNode,
      code
    );
  }

  /**
   * Parse insert dsl.
   * It creates a {@link InsertAction} to replace child nodes with code.
   * @example
   * // import React, { Component } from 'react'
   * // will be converted to
   * // import React, { Component, useState } from 'react'
   * // after executing
   * withNode({ nodeType: "ImportSpecifier", local: "Component" }, () => {
   *   insert(", useState", { at: "end" });
   * });
   * @param {string} code - code need to be inserted
   * @param {Object} options - insert position, beginning or end, end is the default
   */
  insert(code: string, options: InsertOptions): void {
    Instance.current.currentMutation.insert(
      Instance.current.currentNode,
      code,
      options
    );
  }

  /**
   * Parse delete dsl.
   * It creates a {@link DeleteAction} to delete child nodes.
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
  delete(selectors: string | string[]): void {
    Instance.current.currentMutation.delete(
      Instance.current.currentNode,
      selectors
    );
  }

  /**
   * Parse remove dsl.
   * It creates a {@link RemoveAction} to remove current node.
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
    Instance.current.currentMutation.remove(Instance.current.currentNode);
  }

  /**
   * Parse replace dsl.
   * It creates a {@link ReplaceAction} to replace child nodes with code.
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
    Instance.current.currentMutation.replace(
      Instance.current.currentNode,
      selectors,
      options
    );
  }

  /**
   * Parse replaceWith dsl.
   * It creates a {@link ReplaceWithAction} to replace current node with code.
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
    Instance.current.currentMutation.replaceWith(
      Instance.current.currentNode,
      code,
      options
    );
  }

  /**
   * Process one file.
   * @private
   * @param {string} filePath - file path
   */
  private processFile(filePath: string): void {
    this.currentFilePath = filePath;
    if (Configuration.showRunProcess) {
      console.log(filePath);
    }
    while (true) {
      let source = fs.readFileSync(filePath, "utf-8");
      this.currentFileSource = source;
      this.currentMutation = new NodeMutation<Node>(source);
      try {
        const node = this.parseCode(filePath, source);

        this.processWithNode(node, this.func);

        const result = this.currentMutation.process();
        debug("synvert-core:process")(result)
        if (result.affected) {
          fs.writeFileSync(filePath, result.newSource!);
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
   * @returns {ProcessResult}
   */
  private testFile(filePath: string): ProcessResult {
    this.currentFilePath = filePath;
    let source = fs.readFileSync(filePath, "utf-8");
    this.currentFileSource = source;
    this.currentMutation = new NodeMutation<Node>(source);
    const node = this.parseCode(filePath, source);

    this.processWithNode(node, this.func);

    const result = this.currentMutation.process();
    debug("synvert-core:test")(result)
    return result;
  }

  /**
   * Parse code ast node.
   * @private
   * @param filePath {string} file path
   * @param source {string} file source
   * @returns {Node} ast node
   */
  private parseCode(filePath: string, source: string) {
    if (this.rewriter.options.parser === Parser.Typescript) {
      NodeQuery.configure({ adapter: new TypescriptQueryAdapter() });
      NodeMutation.configure({ adapter: new TypescriptMutationAdapter() });
      return ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true
      );
    }

    NodeQuery.configure({ adapter: new EspreeQueryAdapter() });
    NodeMutation.configure({ adapter: new EspreeMutationAdapter() });
    return espree.parse(source, this.espreeParserOptions(filePath));
  }

  /**
   * Get espree parser options.
   * @private
   * @param {string} filePath
   * @returns {Object} parser options
   */
  private espreeParserOptions(filePath: string) {
    const options = {
      ecmaVersion: "latest",
      loc: true,
      sourceType: this.rewriter.options.sourceType,
      sourceFile: filePath,
      ecmaFeatures: {},
    };
    if (
      Configuration.enableEcmaFeaturesJsx ||
      path.extname(filePath) === ".jsx"
    ) {
      options["ecmaFeatures"] = { jsx: true };
    }
    return options;
  }
}

export default Instance;

declare global {
  var findNode: (
    queryString: string,
    func: (instance: Instance) => void
  ) => void;
  var withinNode: (rules: any, func: (instance: Instance) => void) => void;
  var withNode: (rules: any, func: (instance: Instance) => void) => void;
  var gotoNode: (
    childNodeName: string,
    func: (instance: Instance) => void
  ) => void;
  var ifExistNode: (
    rules: any,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ) => void;
  var unlessExistNode: (
    rules: any,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ) => void;
  var ifOnlyExistNode: (
    rules: any,
    options: ConditionOptions,
    func: (instance: Instance) => void
  ) => void;
  var ifAllNodes: (
    rules: any,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc: (instance: Instance) => void
  ) => void;
  var append: (code: string) => void;
  var prepend: (code: string) => void;
  var insert: (code: string, options: InsertOptions) => void;
  var deleteNode: (selectors: string | string[]) => void;
  var remove: () => void;
  var replace: (selectors: string | string[], options: ReplaceOptions) => void;
  var replaceWith: (code: string, options: ReplaceWithOptions) => void;
  var indent: (str: string, count: number) => string;
}

global.findNode = Instance.prototype.findNode;
global.withinNode = Instance.prototype.withinNode;
global.withNode = Instance.prototype.withinNode;
global.gotoNode = Instance.prototype.gotoNode;
global.ifExistNode = Instance.prototype.ifExistNode;
global.unlessExistNode = Instance.prototype.unlessExistNode;
global.ifOnlyExistNode = Instance.prototype.ifOnlyExistNode;
global.ifAllNodes = Instance.prototype.ifAllNodes;
global.append = Instance.prototype.append;
global.prepend = Instance.prototype.prepend;
global.insert = Instance.prototype.insert;
global.deleteNode = Instance.prototype.delete;
global.remove = Instance.prototype.remove;
global.replace = Instance.prototype.replace;
global.replaceWith = Instance.prototype.replaceWith;
global.indent = indent;

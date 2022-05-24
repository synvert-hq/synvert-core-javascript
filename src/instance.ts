import fs from "fs";
import path from "path";
import glob from "glob";
import minimatch from "minimatch";
import { Node } from "acorn";
import Configuration from "./configuration";
import { QueryScope, WithinScope, GotoScope } from "./scope";
import { IfExistCondition, UnlessExistCondition, IfOnlyExistCondition, IfAllCondition, ConditionOptions } from "./condition";
import {
  Action,
  InsertActionOptions,
  ReplaceActionOptions,
  ReplaceWithActionOptions,
  AppendAction,
  PrependAction,
  InsertAction,
  DeleteAction,
  RemoveAction,
  ReplaceAction,
  ReplaceWithAction,
  CommentOutAction,
} from "./action";
import { indent } from "./utils";

const espree = require("@xinminlabs/espree");

/**
 * Instance is an execution unit, it finds specified ast nodes,
 * checks if the nodes match some conditions, then insert, replace or delete code.
 * One instance can contains one or many Scope and Condition.
 * @borrows Instance#withinNode as Instance#withNode
 */
class Instance {
  private actions: Action[];
  private _currentNode!: Node;
  private _currentFileSource!: string;
  private _currentFilePath!: string;

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
  constructor(private filePattern: string, private func: (instance: Instance) => void) {
    this.actions = [];
  }

  /**
   * Get current node.
   * @returns {Node} current node
   */
  get currentNode(): Node {
    return this._currentNode;
  }

  /**
   * Set current node.
   * @param {Node} node
   */
  set currentNode(node: Node) {
    this._currentNode = node;
  }

  /**
   * Get current file source.
   * @returns {string} current file source
   */
  get currentFileSource(): string {
    return this._currentFileSource;
  }

  /**
   * Set current file source.
   * @param {string} fileSource
   */
  set currentFileSource(fileSource: string) {
    this._currentFileSource = fileSource;
  }

  /**
   * Get current relative file path.
   * @returns {string} current relative file path
   */
  get currentFilePath(): string {
    return this._currentFilePath;
  }

  /**
   * Process the instance.
   * It finds all files, for each file, it runs the func, rewrites the original code,
   * then write the code back to the original file.
   */
  process(): void {
    if (fs.existsSync(Configuration.path) && minimatch(Configuration.path, this.filePattern)) {
      return this._processFile(Configuration.path);
    }

    glob
      .sync(this.filePattern, {
        ignore: Configuration.skipFiles,
        cwd: Configuration.path,
        nodir: true,
        realpath: true,
        absolute: true,
      })
      .forEach((filePath) => this._processFile(filePath));
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
   * withinNode({ type: "CallExpression", callee: { type: "MemberExpression", object: "$", property: "ajax" } }, () => { foobar })
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
   * ifExistNode({ type: "ClassDeclaration", superClass: { type: "MemberExpression", object: "React", property: "Component" } }, () => { foobar })
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - to continue operating on the matching nodes.
   */
  ifExistNode(rules: any, options: ConditionOptions, func: (instance: Instance) => void) {
    new IfExistCondition(Instance.current, rules, options, func).process();
  }

  /**
   * Parse unlessExistNode dsl
   * It creates a {@link UnlessExistCondition} to check if matching nodes does not exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar extends Component` matches and call `foobar`.
   * unlessExistNode({ type: "ClassDeclaration", superClass: { type: "MemberExpression", object: "React", property: "Component" } }, () => {})
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - to continue operating on the matching nodes.
   */
  unlessExistNode(rules: any, options: ConditionOptions, func: (instance: Instance) => void) {
    new UnlessExistCondition(Instance.current, rules, options, func).process();
  }

  /**
   * Parse ifOnlyExistNode dsl
   * It creates a {@link IfOnlyExistCondition} to check if current node has only one child node and the child node matches rules,
   * if so, then continue operating on each matching ast node.
   * @example
   * // `class Foobar { foo() {} }` matches and call foobar, `class Foobar { foo() {}; bar() {}; }` does not match
   * ifOnlyExistNode({ type: "MethodDefinition", key: "foo" }, () => { foobar })
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - to do find in specific child node, e.g. { in: 'callee' }
   * @param {Function} func - to continue operating on the matching nodes.
   */
  ifOnlyExistNode(rules: any, options: ConditionOptions, func: (instance: Instance) => void) {
    new IfOnlyExistCondition(Instance.current, rules, options, func).process();
  }

  /**
   * Parse ifAllNodes dsl
   * It creates a {@link IfAllCondition} to check if all matching nodes match options.match,
   * if so, then call the func, else call the elseFunc.
   * @example
   * // `class Foobar { foo() {}; bar() {}; }` matches and call foobar
   * IfAllNode({ type: "MethodDefinition" }, { match: { key: { in: ["foo", "bar"] } } }, () => { foo }, () => { bar });
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - { match: rules, in: 'callee' }
   * @param {Function} func - to continue if all the matching nodes match options.match.
   * @param {Function} elseFunc - to continue if not all the matching nodes match options.match.
   */
  ifAllNodes(rules: any, options: ConditionOptions, func: (instance: Instance) => void, elseFunc: (instance: Instance) => void) {
    new IfAllCondition(Instance.current, rules, options, func, elseFunc).process();
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
   * withNode({ type: "MethodDefinition", key: "foo" }, () => {
   *   append("bar() => {}")
   * })
   * @param {string} code - need to be appended.
   */
  append(code: string): void {
    Instance.current.actions.push(new AppendAction(Instance.current, code).process());
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
    Instance.current.actions.push(new PrependAction(Instance.current, code).process());
  }

  /**
   * Parse insert dsl.
   * It creates a {@link InsertAction} to replace child nodes with code.
   * @example
   * // import React, { Component } from 'react'
   * // will be converted to
   * // import React, { Component, useState } from 'react'
   * // after executing
   * withNode({ type: "ImportSpecifier", local: "Component" }, () => {
   *   insert(", useState", { at: "end" });
   * });
   * @param {string} code - code need to be inserted
   * @param {Object} options - insert position, beginning or end, end is the default
   */
  insert(code: string, options: InsertActionOptions): void {
    Instance.current.actions.push(new InsertAction(Instance.current, code, options).process());
  }

  /**
   * Parse delete dsl.
   * It creates a {@link DeleteAction} to delete child nodes.
   * @example
   * // const someObject = { cat: cat, dog: dog, bird: bird }
   * // will be converted to
   * // const someObject = { cat, dog, bird }
   * // after executing
   * withNode({ type: "Property", key: { type: "Identifier" }, value: { type: "Identifier" } }, () => {
   *   deleteNode(["semicolon", "value"]);
   * });
   * @param {string} selectors - name of child nodes
   */
  delete(selectors: string | string[]): void {
    Instance.current.actions.push(new DeleteAction(Instance.current, selectors).process());
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
   * withNode({ type: "MethodDefinition", kind: "constructor" }, () => {
   *   remove();
   * });
   */
  remove(): void {
    Instance.current.actions.push(new RemoveAction(Instance.current).process());
  }

  /**
   * Parse replace dsl.
   * It creates a {@link ReplaceAction} to replace child nodes with code.
   * @example
   * // $form.submit();
   * // will be converted to
   * // $form.trigger('submit');
   * // after executing
   * withNode({ type: "CallExpression", callee: { type: "MemberExpression", object: /^\$/, property: 'submit' }, arguments: { length: 0 } }, () => {
   *   replace(["callee.property", "arguments"], { with: "trigger('submit')" });
   * });
   * @param {string|array} selectors - name of child nodes.
   * @param {Object} options - code need to be replaced with.
   */
  replace(selectors: string | string[], options: ReplaceActionOptions): void {
    Instance.current.actions.push(new ReplaceAction(Instance.current, selectors, options).process());
  }

  /**
   * Parse replaceWith dsl.
   * It creates a {@link ReplaceWithAction} to replace current node with code.
   * @example
   * // module.exports = Rewriter
   * // will be converted to
   * // export default Rewriter
   * // after executing
   * withNode({ type: "ExpressionStatement", expression: { type: "AssignmentExpression", left: { type: "MemberExpression", object: "module", property: "exports" }, right: { type: "Identifier" } } }, () => {
   *   replaceWith("export default {{expression.right}}");
   * });
   * @param {string} code - code need to be replaced.
   * @param {Object} options - { autoIndent: true } if auto fix indent
   */
  replaceWith(code: string, options: ReplaceWithActionOptions): void {
    Instance.current.actions.push(new ReplaceWithAction(Instance.current, code, options).process());
  }

  /**
   * Parse commnetOut dsl.
   * It creates a {@link CommentOutAction} to comment out current node.
   */
  commentOut(): void {
    Instance.current.actions.push(new CommentOutAction(Instance.current).process());
  }

  /**
   * Process one file.
   * @private
   * @param {string} filePath - file path
   */
  _processFile(filePath: string): void {
    this._currentFilePath = filePath;
    if (Configuration.showRunProcess) {
      console.log(filePath);
    }
    while (true) {
      let conflictActions = [];
      let source = fs.readFileSync(filePath, "utf-8");
      this.currentFileSource = source;
      try {
        const node = espree.parse(source, this._parseOptions(filePath));

        this.processWithNode(node, this.func);

        if (this.actions.length > 0) {
          this.actions.sort(this._compareActions);
          conflictActions = this._getConflictActions();
          this.actions.reverse().forEach((action) => {
            source = source.slice(0, action.beginPos) + action.rewrittenCode + source.slice(action.endPos);
          });
          this.actions = [];

          fs.writeFileSync(filePath, source);
        }
        if (conflictActions.length === 0) {
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
   * Get parser options.
   * @private
   * @param {string} filePath
   * @returns {Object} parser options
   */
  _parseOptions(filePath: string) {
    const options = {
      ecmaVersion: "latest",
      loc: true,
      sourceType: "module",
      sourceFile: filePath,
      ecmaFeatures: {},
    };
    if (Configuration.enableEcmaFeaturesJsx || path.extname(filePath) === ".jsx") {
      options["ecmaFeatures"] = { jsx: true };
    }
    return options;
  }

  /**
   * Node sort function.
   * @private
   * @param {Node} nodeA
   * @param {Node} nodeB
   * @returns {number} returns 1 if nodeA goes before nodeB, -1 if nodeA goes after nodeB
   */
  _compareActions(nodeA: Action, nodeB: Action): 0 | 1 | -1 {
    if (nodeA.beginPos > nodeB.beginPos) return 1;
    if (nodeA.beginPos < nodeB.beginPos) return -1;
    if (nodeA.endPos > nodeB.endPos) return 1;
    if (nodeA.endPos < nodeB.endPos) return -1;
    return 0;
  }

  /**
   * Get conflict actions.
   * @private
   * @returns {Action[]} conflict actions
   */
  _getConflictActions(): Action[] {
    let i = this.actions.length - 1;
    let j = i - 1;
    const conflictActions: Action[] = [];
    if (i < 0) return [];

    let beginPos = this.actions[i].beginPos;
    while (j > -1) {
      if (beginPos < this.actions[j].endPos) {
        conflictActions.push(this.actions[j]);
      } else {
        i = j;
        beginPos = this.actions[i].beginPos;
      }
      j--;
    }
    return conflictActions;
  }
}

export default Instance;

declare global {
  var findNode: (queryString: string, func: (instance: Instance) => void) => void;
  var withinNode: (rules: any, func: (instance: Instance) => void) => void;
  var withNode: (rules: any, func: (instance: Instance) => void) => void;
  var gotoNode: (childNodeName: string, func: (instance: Instance) => void) => void;
  var ifExistNode: (rules: any, options: ConditionOptions, func: (instance: Instance) => void) => void;
  var unlessExistNode: (rules: any, options: ConditionOptions, func: (instance: Instance) => void) => void;
  var ifOnlyExistNode: (rules: any, options: ConditionOptions, func: (instance: Instance) => void) => void;
  var ifAllNodes: (rules: any, options: ConditionOptions, func: (instance: Instance) => void, elseFunc: (instance: Instance) => void) => void;
  var append: (code: string) => void;
  var prepend: (code: string) => void;
  var insert: (code: string, options: InsertActionOptions) => void;
  var deleteNode: (selectors: string | string[]) => void;
  var remove: () => void;
  var replace: (selectors: string | string[], options: ReplaceActionOptions) => void;
  var replaceWith: (code: string, options: ReplaceWithActionOptions) => void;
  var commentOut: () => void;
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
global.commentOut = Instance.prototype.commentOut;
global.indent = indent;

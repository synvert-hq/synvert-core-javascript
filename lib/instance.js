const fs = require("fs");
const path = require("path");
const glob = require("glob");
const espree = require("espree");
const dedent = require("dedent");
const Configuration = require("./configuration");
const { WithinScope, GotoScope } = require("./scope");
const { IfExistCondition, UnlessExistCondition, IfOnlyExistCondition, IfAllCondition } = require("./condition");
const {
  AppendAction,
  PrependAction,
  InsertAction,
  DeleteAction,
  RemoveAction,
  ReplaceAction,
  ReplaceWithAction,
} = require("./action");
require("./ast-node-ext");

/**
 * Instance is an execution unit, it finds specified ast nodes,
 # checks if the nodes match some conditions, then add, replace or remove code.
 #
 # One instance can contains one or many Scope and Condition.
 */
class Instance {
  static current;

  /**
   * @constructor Instance
   * @param {Rewriter} rewriter
   * @param {string} filePattern - pattern to find files, e.g. lib/*.js
   * @param {Function} func - a function to find nodes, match conditions and rewrite code.
   */
  constructor(rewriter, filePattern, func) {
    this.rewriter = rewriter;
    this.filePattern = filePattern;
    this.func = func;
    this.actions = [];
  }

  /**
   * Get current node.
   *
   * @returns {Node} current node
   */
  get currentNode() {
    return this._currentNode;
  }

  /**
   * Set current node.
   *
   * @param {Node} node
   */
  set currentNode(node) {
    this._currentNode = node;
  }

  /**
   * Get current file source.
   *
   * @returns {string} current file source
   */
  get currentFileSource() {
    return this._currentFileSource;
  }

  /**
   * Set current file source.
   *
   * @param {string} source
   */
  set currentFileSource(fileSource) {
    this._currentFileSource = fileSource;
  }

  /**
   * Process the instance.
   * It finds all files, for each file, it runs the func, gets all rewrite actions,
   * and rewrite source code back to original file.
   */
  process() {
    glob
      .sync(this.filePattern, {
        ignore: Configuration.skipFiles,
        cwd: Configuration.path,
        nodir: true,
        realpath: true,
        absolute: true,
      })
      .forEach((filePath) => {
        if (Configuration.showRunProcess) {
          console.log(filePath);
        }
        const options = {
          ecmaVersion: "latest",
          loc: true,
          sourceType: "module",
          sourceFile: filePath,
        };
        if (Configuration.enableEcmaFeaturesJsx || path.extname(filePath) === ".jsx") {
          options["ecmaFeatures"] = { jsx: true };
        }
        while (true) {
          let conflictActions = [];
          let source = fs.readFileSync(filePath, "utf-8");
          this.currentFileSource = source;
          try {
            const node = espree.parse(source, options);

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
          } catch (SyntaxError) {
            console.log(`Can not parse source code: ${source}`);
            break;
          }
        }
      });
  }

  /**
   * Set currentNode to node and process.
   *
   * @param {Node} node - set to current node
   * @param {Function} func
   */
  processWithNode(node, func) {
    this.currentNode = node;
    func.call(this);
    this.currentNode = node;
  }

  /**
   * Set currentNode properly, process and set currentNode back to original currentNode.
   *
   * @param {Node} node - set to other node
   * @param {Function} func
   */
  processWithOtherNode(node, func) {
    const originalNode = this.currentNode;
    this.currentNode = node;
    func.call(this);
    this.currentNode = originalNode;
  }

  /*******
   * DSL *
   *******/

  /**
   * Parse withinNode dsl.
   * It creates a {WithinScope} to find recursive matching ast nodes,
   * then continue operating on each matching ast node.
   *
   * @param {Object} rules - find mathing ast nodes.
   * @param {Function} func - to be called on the matching nodes.
   */
  withinNode(rules, func) {
    new WithinScope(Instance.current, rules, func).process();
  }

  /**
   * Parse gotoNode dsl.
   * It creates a {GotoScope} to go to a child node,
   * then continue operating on the child node.
   *
   * @param {string} child_node_name - the name of the child nodes.
   * @param [Function] func - to continue operating on the matching nodes.
   */
  gotoNode(childNodeName, func) {
    new GotoScope(Instance.current, childNodeName, func).process();
  }

  /**
   * Parse unlessExistNode dsl
   * It creates a {UnlessExistCondition} to check if matching nodes exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   *
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Function} func - to continue operating on the matching nodes.
   */
  ifExistNode(rules, func) {
    new IfExistCondition(Instance.current, rules, func).process();
  }

  /**
   * Parse ifExistNode dsl
   * It creates a {IfExistCondition} to check if matching nodes does not exist in the child nodes,
   * if so, then continue operating on each matching ast node.
   *
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Function} func - to continue operating on the matching nodes.
   */
  unlessExistNode(rules, func) {
    new UnlessExistCondition(Instance.current, rules, func).process();
  }

  /**
   * Parse ifOnlyExistNode dsl
   * It creates a {IfOnlyExistCondition} to check if current node has only one child node and the child node matches rules,
   * if so, then continue operating on each matching ast node.
   *
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Function} func - to continue operating on the matching nodes.
   */
  ifOnlyExistNode(rules, func) {
    new IfOnlyExistCondition(Instance.current, rules, func).process();
  }

  /**
   * Parse ifAllNodes dsl
   * It creates a {IfAllCondition} to check if all matching nodes match options.match,
   * if so, then call the func, else call the elseFunc.
   *
   * @param {Object} rules - to check mathing ast nodes.
   * @param {Object} options - { match: rules }
   * @param {Function} func - to continue if all the matching nodes match options.match.
   * @param {Function} elseFunc - to continue if not all the matching nodes match options.match.
   */
  ifAllNodes(rules, options, func, elseFunc) {
    new IfAllCondition(Instance.current, rules, options, func, elseFunc).process();
  }

  /**
   * Parse append dsl.
   * It creates a {AppendAction} to append the code to the bottom of current node body.
   *
   * @param {string} code - need to be appended.
   */
  append(code) {
    Instance.current.actions.push(new AppendAction(Instance.current, code).process());
  }

  /**
   * Parse prepend dsl.
   * It creates a {PrependAction} to prepend the code to the top of current node body.
   *
   * @param {string} code - need to be prepended.
   */
  prepend(code) {
    Instance.current.actions.push(new PrependAction(Instance.current, code).process());
  }

  /**
   * Parse insert dsl.
   * It creates a {InsertAction} to replace child nodes with code.
   *
   * @param {string} code - code need to be inserted
   * @param {Object} options - insert position, beginning or end, end is the default
   */
  insert(code, options) {
    Instance.current.actions.push(new InsertAction(Instance.current, code, options).process());
  }

  /**
   * Parse delete dsl.
   * It creates a {DeleteAction} to delete child nodes.
   *
   * @param {string} selectors - name of child nodes
   */
  delete(selectors) {
    Instance.current.actions.push(new DeleteAction(Instance.current, selectors).process());
  }

  /**
   * Parse remove dsl.
   * It creates a {RemoveAction} to remove current node.
   */
  remove() {
    Instance.current.actions.push(new RemoveAction(Instance.current).process());
  }

  /**
   * Parse replace dsl.
   * It creates a {ReplaceAction} to replace child nodes with code.
   *
   * @param {string|array} selectors - name of child nodes.
   * @param {Object} options - code need to be replaced with.
   */
  replace(selectors, options) {
    Instance.current.actions.push(new ReplaceAction(Instance.current, selectors, options).process());
  }

  /**
   * Parse replaceWith dsl.
   * It creates a {ReplaceWithAction} to replace current node with code.
   *
   * @param {string} code - code need to be replaced.
   */
  replaceWith(code, options) {
    Instance.current.actions.push(new ReplaceWithAction(Instance.current, dedent(code)).process());
  }

  _compareActions(nodeA, nodeB) {
    if (nodeA.beginPos > nodeB.beginPos) return 1;
    if (nodeA.beginPos < nodeB.beginPos) return -1;
    if (nodeA.endPos > nodeB.endPos) return 1;
    if (nodeA.endPos < nodeB.endPos) return -1;
    return 0;
  }

  _getConflictActions() {
    let i = this.actions.length - 1;
    let j = i - 1;
    const conflictActions = [];
    if (i < 0) return;

    let beginPos = this.actions[i].beginPos;
    while (j > -1) {
      if (beginPos < this.actions[j].endPos) {
        conflictActions.push(this.actions.splice(j, 1));
      } else {
        i = j;
        beginPos = this.actions[i].beginPos;
      }
      j--;
    }
    return conflictActions;
  }
}

module.exports = Instance;

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

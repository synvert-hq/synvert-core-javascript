const glob = require("glob");
const fs = require("fs");
const espree = require("espree");
const { WithinScope } = require("./scope");
const { InsertAction, DeleteAction, ReplaceAction, ReplaceWithAction } = require("./action");
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
   * @constructors Instance
   * @param {Rewriter} rewriter
   * @param {string} filePattern - pattern to find files, e.g. lib/*.js
   * @param {Function} func - a function to find nodes, match conditions and rewrite code.
   */
  constructor(rewriter, filePattern, func) {
    this.rewriter = rewriter
    this.filePattern = filePattern
    this.func = func
    this.actions = []
  }

  /**
   * Get current node.
   *
   * @returns {Node} current node
   */
  get currentNode() {
    return this.current;
  }

  /**
   * Set current node.
   *
   * @param {Node} node
   */
  set currentNode(node) {
    this.current = node;
  }

  /**
   * Process the instance.
   * It finds all files, for each file, it executes the block code, gets all rewrite actions,
   * and rewrite source code back to original file.
   */
  process() {
    const self = this
    glob.sync(this.filePattern, { cwd: '.' }).forEach(filePath => {
      while (true) {
        let conflictActions = []
        let source = fs.readFileSync(filePath, 'utf-8');
        const node = espree.parse(source, { ecmaVersion: 'latest', loc: true, sourceFile: filePath });

        this.processWithNode(node, self.func)

        if (this.actions.length > 0) {
          this.actions.sort(this._compareActions)
          conflictActions = this._getConflictActions()
          this.actions.reverse().forEach(action => {
            source = source.slice(0, action.beginPos()) + action.rewrittenCode() + source.slice(action.endPos())
          });
          this.actions = []

          fs.writeFileSync(filePath, source);
        }
        if (conflictActions.length === 0) {
          break;
        }
      }
    });
  }

  /**
   * Set current_node to node and process.
   *
   * @param {Node} node - set to current node
   * @param {Function} func
   */
  processWithNode(node, func) {
    this.currentNode = node;
    func.call(this);
    this.currentNode = node;
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
   * Parse insert dsl.
   * It creates a {InsertAction} to replace child nodes with code.
   *
   * @param {string} code - code need to be inserted
   * @param {Object} options - insert position, beginning or end, end is the default
   */
  insert(code, options) {
    Instance.current.actions.push(new InsertAction(Instance.current, code, options));
  }

  /**
   * Parse delete dsl.
   * It creates a {DeleteAction} to delete child nodes.
   *
   * @param {string} selectors - name of child nodes
   */
  delete(selectors) {
    Instance.current.actions.push(new DeleteAction(Instance.current, selectors));
  }

  /**
   * Parse replace dsl.
   * It creates a {ReplaceAction} to replace child nodes with code.
   *
   * @param {string|array} selectors - name of child nodes.
   * @param {Object} options - code need to be replaced with.
   */
  replace(selectors, options) {
    Instance.current.actions.push(new ReplaceAction(Instance.current, selectors, options));
  }

  /**
   * Parse replaceWith dsl.
   * It creates a {ReplaceWithAction} to replace current node with code.
   *
   * @param {string} code - code need to be replaced.
   */
  replaceWith(code) {
    Instance.current.actions.push(new ReplaceWithAction(Instance.current, code));
  }

  _compareActions(nodeA, nodeB) {
    if (nodeA.beginPos > nodeB.beginPos) return 1;
    if (nodeA.beginPos < nodeB.beginPos) return -1;
    if (nodeA.endPos > nodeB.endPos) return 1;
    if (nodeA.endPos < nodeB.endPos) return -1;
    return 0
  }

  _getConflictActions() {
    let i = this.actions.length - 1
    let j = i - 1
    const conflictActions = []
    if (i < 0) return;

    let beginPos = this.actions[i].beginPos
    while (j > -1) {
      if (beginPos < this.actions[j].endPos) {
        conflictActions.push(this.actions.splice(j, 1))
      } else {
        i = j
        beginPos = this.actions[i].beginPos
      }
      j--
    }
    return conflictActions
  }
}

module.exports = Instance;

global.withinNode = Instance.prototype.withinNode
global.withNode = Instance.prototype.withinNode
global.insert = Instance.prototype.insert
global.delete = Instance.prototype.delete
global.replace = Instance.prototype.replace
global.replaceWith = Instance.prototype.replaceWith

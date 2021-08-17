const glob = require("glob");
const fs = require("fs");
const espree = require("espree");
const { WithinScope } = require("./scope");
const { ReplaceAction } = require("./action");

class Instance {
  constructor(rewriter, filePattern, func) {
    this.rewriter = rewriter
    this.filePattern = filePattern
    this.func = func
    this.actions = []
  }

  get currentNode() {
    return this.current;
  }

  set currentNode(node) {
    this.current = node;
  }

  process() {
    const self = this
    glob.sync(this.filePattern, { cwd: '.' }).forEach(filePath => {
      let conflictActions = []
      let source = fs.readFileSync(filePath, 'utf-8');
      const node = espree.parse(source, { ecmaVersion: 'latest', loc: true, sourceFile: filePath });

      this.processWithNode(node, self.func)

      while (true) {
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

  processWithNode(node, func) {
    this.currentNode = node;
    func.call(this);
    this.currentNode = node;
  }

  withinNode(rules, func) {
    new WithinScope(this, rules, func).process();
  }

  replace(selector, options) {
    this.actions.push(new ReplaceAction(this, selector, options));
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

Instance.prototype.withNode = Instance.prototype.withinNode;

module.exports = Instance;
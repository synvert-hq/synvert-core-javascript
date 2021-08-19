const { Node } = require("acorn");

/**
 * Scope finds out nodes which match rules.
 */
class Scope {
  /**
   * @constructors Action
   * @param {Instance} instance
   */
  constructor(instance) {
    this.instance = instance;
  }
}

/**
 * WithinScope finds out nodes which match rules, then changes its scope to matching node.
 */
class WithinScope extends Scope {
  /**
   * @constructors WithinScope
   * @param {Instance} instance
   * @param {Object} rules
   * @param {Function} func - a function to be called if rules are matched.
   */
  constructor(instance, rules, func) {
    super(instance);
    this.rules = rules;
    this.func = func;
  }

  /**
   * Find out the matching nodes.
   * It checks the current node and iterates all child nodes,
   * then run the function code on each matching node.
   */
  process() {
    const self = this;
    const instance = this.instance;
    const currentNode = instance.currentNode;
    if (!currentNode) {
      return;
    }

    const matchingNodes = this._findMatchingNodes(currentNode);
    instance.processWithNode(currentNode, function() {
      matchingNodes.forEach(matchingNode => {
        instance.processWithNode(matchingNode, function() {
          self.func.call(self.instance);
        });
      });
    })
  }

  _findMatchingNodes(currentNode) {
    const matchingNodes = [];
    if (currentNode.match(this.rules)) {
      matchingNodes.push(currentNode)
    }
    currentNode.recursiveChildren(childNode => {
      if (childNode.match(this.rules)) {
        matchingNodes.push(childNode)
      }
    });
    return matchingNodes;
  }
}

module.exports = { WithinScope }

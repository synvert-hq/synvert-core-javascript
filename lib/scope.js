const { Node } = require("acorn");

/**
 * Scope just likes its name, different scope points to different current node.
 * One scope defines some rules, it finds nodes and changes current node to the matching node.
 */
class Scope {
  /**
   * Create a Scope
   * @param {Instance} instance
   */
  constructor(instance) {
    this.instance = instance;
  }
}

/**
 * WithinScope finds out nodes which match rules, then changes its scope to matching node.
 * @extends Scope
 */
class WithinScope extends Scope {
  /**
   * Create a WithinScope
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
    const instance = this.instance;
    const currentNode = instance.currentNode;
    if (!currentNode) {
      return;
    }

    const matchingNodes = this._findMatchingNodes(currentNode);
    instance.processWithNode(currentNode, () => {
      matchingNodes.forEach((matchingNode) => {
        instance.processWithNode(matchingNode, () => {
          this.func.call(this.instance);
        });
      });
    });
  }

  /**
   * Find matching nodes from current node and its child nodes.
   * @private
   * @param {Node} currentNode
   * @returns {Node[]} matching nodes
   */
  _findMatchingNodes(currentNode) {
    const matchingNodes = [];
    if (currentNode.match(this.rules)) {
      matchingNodes.push(currentNode);
    }
    currentNode.recursiveChildren((childNode) => {
      if (childNode.match(this.rules)) {
        matchingNodes.push(childNode);
      }
    });
    return matchingNodes;
  }
}

/**
 * Go to and change its scope to a child node.
 * @extends Scope
 */
class GotoScope extends Scope {
  /**
   * Create a GotoScope
   * @param {Instance} instance
   * @param {string} childNodeName
   * @param {Function} func
   */
  constructor(instance, childNodeName, func) {
    super(instance);
    this.childNodeName = childNodeName;
    this.func = func;
  }

  /**
   * Go to a child now, then run the func with the the child node.
   */
  process() {
    const currentNode = this.instance.currentNode;
    if (!currentNode) return;

    const childNode = currentNode.actualValue(this.childNodeName.split("."));
    if (!childNode) return;

    this.instance.processWithOtherNode(childNode, () => {
      this.func.call(this);
    });
  }
}

module.exports = { WithinScope, GotoScope };

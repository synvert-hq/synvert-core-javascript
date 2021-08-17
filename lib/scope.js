const { Node } = require("acorn");

class Scope {
  constructor(instance) {
    this.instance = instance;
  }
}

class WithinScope extends Scope {
  constructor(instance, rules, func) {
    super(instance);
    this.rules = rules;
    this.func = func;
  }

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
          self.func.call();
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

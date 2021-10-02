/**
 * Condition checks if rules matches.
 */
class Condition {
  /**
   * @constructors Condition
   * @param {Instance} instance
   * @param {Object} rules
   * @param {Function} func - a function to be called if rules are matched.
   */
  constructor(instance, rules, func) {
    this.instance = instance;
    this.rules = rules;
    this.func = func;
  }

  /**
   * If condition matches, run the func.
   */
  process() {
    if (this.match()) {
      this.func.call(this.instance);
    }
  }
}

/**
 * IfExistCondition checks if matching node exists in the node children.
 */
class IfExistCondition extends Condition {
  /**
   * check if any child node matches the rules.
   */
  match() {
    let match = false;
    this.instance.currentNode.recursiveChildren((childNode) => {
      if (!match) {
        match = childNode.match(this.rules);
      }
    });
    return match;
  }
}

/**
 * UnlessExistCondition checks if matching node doesn't exist in the node children.
 */
class UnlessExistCondition extends Condition {
  /**
   * check if none of child node matches the rules.
   */
  match() {
    let match = false;
    this.instance.currentNode.recursiveChildren((childNode) => {
      if (!match) {
        match = childNode.match(this.rules);
      }
    });
    return !match;
  }
}

/**
 * IfOnlyExistCondition checks if node has only one child node and the child node matches rules.
 */
class IfOnlyExistCondition extends Condition {
  /**
   * check if only have one child node and the child node matches rules.
   */
  match() {
    return (
      this.instance.currentNode.arrayBody().length === 1 && this.instance.currentNode.arrayBody()[0].match(this.rules)
    );
  }
}

/**
 * IfAllCondition checks if all matching nodes match options.match.
 */
class IfAllCondition extends Condition {
  /**
   * @constructors IfAllCondition
   * @param {Instance} instance
   * @param {Object} rules
   * @param {Object} options - { match: rules }
   * @param {Function} func - a function to be called if all matching nodes match options.match.
   * @param {Function} elseFunc - a function to be called if not all matching nodes match options.match.
   */
  constructor(instance, rules, options, func, elseFunc) {
    super(instance, rules, func);
    this.options = options;
    this.elseFunc = elseFunc;
  }

  /**
   * Find all matching nodes, if all match options.match rules, run the func, else run the elseFunc.
   */
  process() {
    const nodes = this._matchingNodes();
    if (nodes.length === 0) {
      return;
    }
    if (nodes.every(this._matchFunc.bind(this))) {
      this.func.call(this.instance);
    } else {
      this.elseFunc.call(this.instance);
    }
  }

  _matchFunc(node) {
    if (typeof this.options.match === "function") {
      return this.options.match(node);
    } else {
      return node.match(this.options.match);
    }
  }

  _matchingNodes() {
    const nodes = [];
    this.instance.currentNode.recursiveChildren((childNode) => {
      if (childNode.match(this.rules)) {
        nodes.push(childNode);
      }
    });
    return nodes;
  }
}

module.exports = { IfExistCondition, UnlessExistCondition, IfOnlyExistCondition, IfAllCondition };

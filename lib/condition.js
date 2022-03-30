const { t } = require("typy");

/**
 * Condition is used to check if the node matches the rules, condition won’t change the node scope.
 */
class Condition {
  /**
   * Create a Condition
   * @param {Instance} instance
   * @param {Object} rules - rules to find nodes, e.g. `{ type: "MemberExpression", object: { in: ["$", "jQuery"] }, property: "ajax" }`
   * @param {Object} options - to do find in specific child node, e.g. `{ in: 'callee' }`
   * @param {Function} func - a function to be called if rules are matched.
   */
  constructor(instance, rules, options, func) {
    this.instance = instance;
    this.rules = rules;
    if (typeof options === "function") {
      this.options = {};
      this.func = options;
    } else {
      this.options = options;
      this.func = func;
    }
  }

  /**
   * If condition matches, run the func.
   */
  process() {
    if (this.match()) {
      this.func.call(this.instance);
    }
  }

  /**
   * Get the target node to process.
   * If `option.in` exists, the target node depends on `options.in`,
   * otherwise the target node is the current node.
   * e.g. source code of the node is `$.ajax({})` and `options` is `{ in: 'callee' }`
   * the target node is `$.ajax`.
   * @private
   * @returns {Node}
   */
  _targetNode() {
    if (this.options.in) {
      return t(this.instance.currentNode, this.options.in).safeObject;
    }
    return this.instance.currentNode;
  }
}

/**
 * IfExistCondition checks if matching node exists in the node children.
 * @extends Condition
 */
class IfExistCondition extends Condition {
  /**
   * Check if any child node matches the rules.
   */
  match() {
    let match = false;
    this._targetNode().recursiveChildren((childNode) => {
      if (!match) {
        match = childNode.match(this.rules);
      }
    });
    return match;
  }
}

/**
 * UnlessExistCondition checks if matching node doesn't exist in the node children.
 * @extends Condition
 */
class UnlessExistCondition extends Condition {
  /**
   * Check if none of child node matches the rules.
   */
  match() {
    let match = false;
    this._targetNode().recursiveChildren((childNode) => {
      if (!match) {
        match = childNode.match(this.rules);
      }
    });
    return !match;
  }
}

/**
 * IfOnlyExistCondition checks if node has only one child node and the child node matches rules.
 * @extends Condition
 */
class IfOnlyExistCondition extends Condition {
  /**
   * Check if only have one child node and the child node matches rules.
   */
  match() {
    return this._targetNode().arrayBody().length === 1 && this._targetNode().arrayBody()[0].match(this.rules);
  }
}

/**
 * IfAllCondition checks if all matching nodes match options.match.
 * @extends Condition
 */
class IfAllCondition extends Condition {
  /**
   * Create an IfAllCondition
   * @param {Instance} instance
   * @param {Object} rules - rules to find nodes, e.g. `{ type: "MemberExpression", object: { in: ["$", "jQuery"] }, property: "ajax" }`
   * @param {Object} options - { match: rules|function }
   * @param {Function} func - a function to be called if all matching nodes match options.match.
   * @param {Function} elseFunc - a function to be called if not all matching nodes match options.match.
   */
  constructor(instance, rules, options, func, elseFunc) {
    super(instance, rules, options, func);
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

  /**
   * Function to match node.
   * @private
   * @param {Node} node
   * @returns {boolean} true if node matches
   */
  _matchFunc(node) {
    if (typeof this.options.match === "function") {
      return this.options.match(node);
    } else {
      return node.match(this.options.match);
    }
  }

  /**
   * Get the matching nodes.
   * @private
   * @returns {Node[]} matching nodes
   */
  _matchingNodes() {
    const nodes = [];
    this._targetNode().recursiveChildren((childNode) => {
      if (childNode.match(this.rules)) {
        nodes.push(childNode);
      }
    });
    return nodes;
  }
}

module.exports = { IfExistCondition, UnlessExistCondition, IfOnlyExistCondition, IfAllCondition };

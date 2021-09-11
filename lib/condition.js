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
  constructor(instance, rules, function_) {
    this.instance = instance;
    this.rules = rules;
    this.func = function_;
  }

  /**
   * If condition matches, run the block code.
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
    return this.instance.currentNode.arrayBody().length === 1 && this.instance.currentNode.arrayBody()[0].match(this.rules);
  }
}

module.exports = { IfExistCondition, UnlessExistCondition, IfOnlyExistCondition };

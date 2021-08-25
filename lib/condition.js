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
    this.instance = instance
    this.rules = rules
    this.func = func
  }

  /**
   * If condition matches, run the block code.
   */
  process() {
    if (this.match()) {
      this.func.call(this.instance)
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
    const self = this
    let match = false
    this.instance.currentNode.recursiveChildren(childNode => {
      if (!match) {
        match = childNode.match(self.rules)
      }
    })
    return match
  }
}

module.exports = { IfExistCondition }

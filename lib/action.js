/**
 * Action defines rewriter action, add, replace or remove code.
 */
class Action {
  /**
   * @constructors Action
   * @param {Instance} instance
   * @param {string} code - new code to add, replace or remove
   */
  constructor(instance, code) {
    this.instance = instance
    this.code = code
    this.node = this.instance.currentNode
  }

  /**
   *  The rewritten source code.
   *
   * @returns {string} rewritten source code.
   */
  rewrittenSource() {
    return this.node.rewrittenSource(this.code)
  }
}

/**
 * ReplaceAction to replace child node with code.
 */
class ReplaceAction extends Action {
  constructor(instance, selector, options) {
    super(instance, options.with)
    this.selector = selector
  }

  /**
   * Begin position of code to replace.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    return this.node.childNodeRange(this.selector).start
  }

  /**
   * End position of code to replace.
   *
   * @returns {number} end position.
   */
  endPos() {
    return this.node.childNodeRange(this.selector).end
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  rewrittenCode() {
    return this.rewrittenSource()
  }
}

module.exports = { Action, ReplaceAction }
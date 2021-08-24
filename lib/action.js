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
 * InsertAction to add code to the node.
 */
class InsertAction extends Action {
  constructor(instance, code, options) {
    super(instance, code)
    this.at = options.at
  }

  /**
   * Begin position to insert code.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    if (this.at === 'beginning') {
      return this.node.start
    } else {
      return this.node.end
    }
  }

  /**
   * End position, always same to begin position.
   *
   * @returns {number} end position.
   */
  endPos() {
    return this.beginPos()
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

/**
 * ReplaceAction to replace child node with code.
 */
class ReplaceAction extends Action {
  /**
   * @constructors ReplaceAction
   * @param {Instance} instance
   * @param {string} selector - name of child ode
   * @param {string} code - new code to be replaced
   */
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

/**
 * ReplaceWithAction to replace code.
 */
class ReplaceWithAction extends Action {
  /**
   * Begin position of code to replace.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    return this.node.start
  }

  /**
   * End position of code to replace.
   *
   * @returns {number} end position.
   */
  endPos() {
    return this.node.end
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  rewrittenCode() {
    if (this.rewrittenSource().includes("\n")) {
      const newCode = []
      this.rewrittenSource().split("\n").forEach((line, index) => {
        if (index === 0) {
          newCode.push(line)
        } else {
          newCode.push(' ' * this.node.column() + line)
        }
      })
      return newCode.join("\n")
    } else {
      return this.rewrittenSource()
    }
  }
}

module.exports = { Action, InsertAction, ReplaceAction, ReplaceWithAction }
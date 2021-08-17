class Action {
  constructor(instance, code) {
    this.instance = instance
    this.code = code
    this.node = this.instance.currentNode
  }

  rewrittenSource() {
    return this.node.rewrittenSource(this.code)
  }
}

class ReplaceAction extends Action {
  constructor(instance, selector, options) {
    super(instance, options.with)
    this.selector = selector
  }

  beginPos() {
    return this.node.childNodeRange(this.selector).start
  }

  endPos() {
    return this.node.childNodeRange(this.selector).end
  }

  rewrittenCode() {
    return this.rewrittenSource()
  }
}

module.exports = { Action, ReplaceAction }
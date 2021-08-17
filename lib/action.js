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
  constructor(instance, ...selectors) {
    const options = selectors.pop()
    super(instance, options.with)
    this.selectors = selectors
  }

  beginPos() {
    return Math.min(this.selectors.map((selector) => this.instance.currentNode.childNodeRange(selector)[0]))
  }

  endPos() {
    return Math.max(this.selectors.map((selector) => this.instance.currentNode.childNodeRange(selector)[1]))
  }

  rewrittenCode() {
    return this.rewrittenSource()
  }
}

module.exports = { Action, ReplaceAction }
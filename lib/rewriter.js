class Rewriter {
  static rewriters = [];

  static register(group, name, rewriter) {
    this.rewriters[group] = this.rewriters[group] || {}
    this.rewriters[group][name] = rewriter
  }

  static fetch(group, name) {
    return this.rewriters[group][name]
  }

  constructor(group, name, func) {
    this.group = group
    this.name = name
    this.func = func
    this.constructor.register(group, name, this)
  }
}

module.exports = Rewriter

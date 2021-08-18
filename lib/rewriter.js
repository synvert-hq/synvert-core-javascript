const Instance = require("./instance");

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

  process() {
    this.func.call(this)
  }

  withinFiles(filePattern, func) {
    const instance = new Instance(this, filePattern, func)
    global.currentInstance = instance
    instance.process()
  }
}

module.exports = Rewriter

global.withinFiles = Rewriter.prototype.withinFiles
global.withFiles = Rewriter.prototype.withinFiles

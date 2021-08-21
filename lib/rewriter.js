const Instance = require("./instance");

/**
 * Rewriter is the top level namespace in a snippet.
 *
 * One Rewriter can contain one or many Instances,
 * which define the behavior what files and what codes to detect and rewrite to what code.
 *
 *   Synvert.Rewriter.new('snippet group', 'snippet name', function() {
 *     description('this is a snippet description')
 *     withFiles('*.js', function() {
 *       withNode({ type: 'ClassDeclaration', id: 'FooBar' }, function() {
 *         replace('id', 'Synvert')
 *       })
 *     })
 *   })
 */
class Rewriter {
  static rewriters = [];
  static current;

  static register(group, name, rewriter) {
    this.rewriters[group] = this.rewriters[group] || {}
    this.rewriters[group][name] = rewriter
  }

  static fetch(group, name) {
    return this.rewriters[group][name]
  }

  /**
   * @constructors Rewriter
   * @param {string} group - group name
   * @param {string} name - snippet name
   * @param {Function} func - a function defines the behaviors of the rewriter
   */
  constructor(group, name, func) {
    this.group = group
    this.name = name
    this.func = func
    this.constructor.register(group, name, this)
  }

  /**
   * Process the rewriter.
   */
  process() {
    Rewriter.current = this
    this.func.call(this)
  }

  /*******
   * DSL *
   *******/

  /**
   * Parse description dsl, it sets description of the rewrite.
   * Or get description.
   *
   * @param {string} description - rewriter description.
   * @returns {string} description
   */
  description(description = null) {
    if (description) {
      Rewriter.current.desc = description
    } else {
      return this.desc
    }
  }

  /**
   * Parse withinFiles dsl, it finds specified files.
   * It creates an Instance to rewrite code.
   *
   * @param {string} filePattern - pattern to find files, e.g. lib/*.js
   * @param {Functioin} func - a function rewrites code in the matching files.
   */
  withinFiles(filePattern, func) {
    const instance = new Instance(this, filePattern, func)
    Instance.current= instance
    instance.process()
  }
}

module.exports = Rewriter

global.description = Rewriter.prototype.description
global.withinFiles = Rewriter.prototype.withinFiles
global.withFiles = Rewriter.prototype.withinFiles

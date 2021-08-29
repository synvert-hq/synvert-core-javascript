const { RewriterNotFoundError } = require("./error");
const Instance = require("./instance");

/**
 * Rewriter is the top level namespace in a snippet.
 *
 * One Rewriter can contain one or many Instances,
 * which define the behavior what files and what codes to detect and rewrite to what code.
 *
 *   Synvert.Rewriter.new('snippet group', 'snippet name', () => {
 *     description('this is a snippet description')
 *
 *     withFiles('*.js', () => {
 *       withNode({ type: 'ClassDeclaration', id: 'FooBar' }, () => {
 *         replace('id', 'Synvert')
 *       })
 *     })
 *   })
 */
class Rewriter {
  static rewriters = [];
  static current;

  /**
   * @static Register a rewriter with its group and name.
   *
   * @param {string} group - the rewriter group.
   * @param {string} name - the unique rewriter name.
   * @param {Rewirter} rewriter - the rewriter to register.
   */
  static register(group, name, rewriter) {
    this.rewriters[group] = this.rewriters[group] || {}
    this.rewriters[group][name] = rewriter
  }

  /**
   * @static Fetch a rewriter by group and name.
   *
   * @param {string} group rewrtier group.
   * @param {string} name rewrtier name.
   * @returns {Rewriter} the matching rewriter.
   * @throws {RewriterNotFoundError} if rewriter not found.
   */
  static fetch(group, name) {
    if (this.rewriters[group] && this.rewriters[group][name]) {
      return this.rewriters[group][name]
    } else {
      throw new RewriterNotFoundError(`Rewriter ${group} ${name} not found`)
    }
  }

  /**
   * Get a registered rewriter by group and name, then process that rewriter.
   *
   * @param {string} group - the rewriter group.
   * @param {string} name - the rewriter name.
   * @returns {Rewriter} the registered rewriter.
   */
  static call(group, name) {
    const rewriter = this.fetch(group, name)
    if (!rewriter) return

    rewriter.process()
    return rewriter
  }

  /**
   * @constructors Rewriter
   *
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

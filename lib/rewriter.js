const { RewriterNotFoundError } = require("./error");
const Instance = require("./instance");
const NodeVersion = require("./node-version");
const NpmVersion = require("./npm-version");

/**
 * Rewriter is the top level namespace in a synvert snippet.
 *
 * One rewriter checks if the dependency version matche, and it can contain one or many Instances,
 * which define the behavior what files need to find and what codes need to rewrite.
 * @borrows Rewriter#withinFiles as Rewriter#withinFile
 */
class Rewriter {
  /**
   * Store all rewriters grouped by group name, e.g.  `{ jquery: { 'deprecate-event-shorthand': <Rewriter> } }`
   * @static
   */
  static rewriters = {};

  /**
   * Current rewriters
   * @static
   */
  static current;

  /**
   * Register a rewriter with its group and name.
   * @static
   * @param {string} group - the rewriter group.
   * @param {string} name - the unique rewriter name.
   * @param {Rewirter} rewriter - the rewriter to register.
   */
  static register(group, name, rewriter) {
    this.rewriters[group] = this.rewriters[group] || {};
    this.rewriters[group][name] = rewriter;
  }

  /**
   * Fetch a rewriter by group and name.
   * @static
   * @param {string} group rewrtier group.
   * @param {string} name rewrtier name.
   * @returns {Rewriter} the matching rewriter.
   * @throws {RewriterNotFoundError} if rewriter not found.
   */
  static fetch(group, name) {
    if (this.rewriters[group] && this.rewriters[group][name]) {
      return this.rewriters[group][name];
    } else {
      throw new RewriterNotFoundError(`Rewriter ${group} ${name} not found`);
    }
  }

  /**
   * Get a registered rewriter by group and name, then process that rewriter.
   * @static
   * @param {string} group - the rewriter group.
   * @param {string} name - the rewriter name.
   * @param {boolean} sandbox - if run in sandbox mode, default is false.
   * @param {Object} options - the rewriter options.
   * @returns {Rewriter} the registered rewriter.
   */
  static call(group, name, sandbox, options = {}) {
    const rewriter = this.fetch(group, name);
    if (!rewriter) return;

    rewriter.options = options;
    if (sandbox) {
      rewriter.processWithSandbox();
    } else {
      rewriter.process();
    }
    return rewriter;
  }

  /**
   * Create a Rewriter
   * @param {string} group - group name
   * @param {string} name - snippet name
   * @param {Function} func - a function defines the behaviors of the rewriter
   */
  constructor(group, name, func) {
    this.group = group;
    this.name = name;
    this.subSnippets = [];
    this.func = func;
    this.constructor.register(group, name, this);
  }

  /**
   * Rewriter options.
   * @returns {Object} options.
   */
  get options() {
    return this._options || {};
  }

  /**
   * Set options.
   * @param {Object} options.
   */
  set options(options) {
    this._options = options;
  }

  /**
   * Process the rewriter.
   */
  process() {
    const originalRewriter = Rewriter.current;
    try {
      Rewriter.current = this;
      this.func.call(this);
    } finally {
      Rewriter.current = originalRewriter;
    }
  }

  /**
   * Process rewriter with sandbox mode.
   * It will call the function but doesn't change any file.
   */
  processWithSandbox() {
    this.sandbox = true;
    this.process();
  }

  /*******
   * DSL *
   *******/

  /**
   * Parse `description` dsl, it sets description of the rewriter.
   * Or get description.
   * @example
   * new Synvert.Rewriter("react", "transform-class-components-to-functions", () => {
   *   description("transform react class components to functions")
   * })
   * @param {string} description - rewriter description.
   * @returns {string} description
   */
  description(description = null) {
    if (description) {
      Rewriter.current._description = description;
    } else {
      return this._description;
    }
  }

  /**
   * Parse `ifNode` dsl, it checks if node version is greater than or equal to the specified node version.
   * @example
   * ifNode("10.14.0");
   * @param {string} version - specified node version.
   */
  ifNode(version) {
    Rewriter.current.nodeVersion = new NodeVersion(version);
  }

  /**
   * Parse `ifNpm` dsl, it compares version of the specified npm.
   * @example
   * ifNpm("react", ">= 18.0");
   * @param {string} name - npm name.
   * @param {string} version - equal, less than or greater than specified version, e.g. '>= 2.0.0',
   */
  ifNpm(name, version) {
    Rewriter.current.npmVersion = new NpmVersion(name, version);
  }

  /**
   * Parse `addSnippet` dsl, it calls anther rewriter.
   * @example
   * new Synvert.Rewriter("jquery", "migrate", () => {
   *   addSnippet("jquery", "deprecate-event-shorthand");
   *   addSnippet("jquery", "deprecate-ready-event");
   * });
   * @param {string} group - group of another rewriter.
   * @param {string} name - name of another rewriter.
   * @param {Object} options - options of another rewriter.
   */
  addSnippet(group, name, options = {}) {
    const currentRewriter = Rewriter.current;
    currentRewriter.subSnippets.push(Rewriter.call(group, name, currentRewriter.sandbox, options));
  }

  /**
   * Parse `withinFiles` dsl, it finds specified files.
   * It creates an Instance to rewrite code.
   * @example
   * new Synvert.Rewriter("javascript", "no-unused-imports", () => {
   *   withinFiles('**\/*.js', function () {
   *   })
   * })
   * @param {string} filePattern - pattern to find files, e.g. lib/*.js
   * @param {Functioin} func - a function rewrites code in the matching files.
   */
  withinFiles(filePattern, func) {
    if (Rewriter.current.sandbox) return;

    if (
      (!Rewriter.current.nodeVersion || Rewriter.current.nodeVersion.match()) &&
      (!Rewriter.current.npmVersion || Rewriter.current.npmVersion.match())
    ) {
      const instance = new Instance(Rewriter.current, filePattern, func);
      Instance.current = instance;
      instance.process();
    }
  }
}

module.exports = Rewriter;

global.description = Rewriter.prototype.description;
global.ifNode = Rewriter.prototype.ifNode;
global.ifNpm = Rewriter.prototype.ifNpm;
global.addSnippet = Rewriter.prototype.addSnippet;
global.withinFiles = Rewriter.prototype.withinFiles;
global.withinFile = Rewriter.prototype.withinFiles;

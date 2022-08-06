import { RewriterOptions, Parser, SourceType } from "./types/options";
import { RewriterNotFoundError } from "./error";
import Instance from "./instance";
import NodeVersion from "./node-version";
import NpmVersion from "./npm-version";

/**
 * Rewriter is the top level namespace in a synvert snippet.
 *
 * One rewriter checks if the dependency version matche, and it can contain one or many Instances,
 * which define the behavior what files need to find and what codes need to rewrite.
 * @borrows Rewriter#withinFiles as Rewriter#withinFile
 */
class Rewriter {
  public subSnippets: Rewriter[] = [];
  public nodeVersion?: NodeVersion;
  public npmVersion?: NpmVersion;
  public sourceType: SourceType = SourceType.Module;
  public parser: Parser = Parser.Espree;
  public options: object = {};
  private sandbox: boolean = false;
  private desc?: string;

  /**
   * Store all rewriters grouped by group name, e.g.  `{ jquery: { 'deprecate-event-shorthand': <Rewriter> } }`
   * @static
   */
  static rewriters: { [group: string]: { [name: string]: Rewriter } } = {};

  /**
   * Current rewriters
   * @static
   */
  static current: Rewriter;

  /**
   * Register a rewriter with its group and name.
   * @static
   * @param {string} group - the rewriter group.
   * @param {string} name - the unique rewriter name.
   * @param {Rewirter} rewriter - the rewriter to register.
   */
  static register(group: string, name: string, rewriter: Rewriter) {
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
  static fetch(group: string, name: string): Rewriter {
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
  static call(
    group: string,
    name: string,
    sandbox?: boolean,
    options = {}
  ): Rewriter | undefined {
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
   * Execute the temorary rewriter without group and name.
   * @static
   * @param {Function} func - a function defines the behaviors of the rewriter
   * @returns {Rewriter} the registered rewriter.
   */
  static execute(func: (rewriter: Rewriter) => void): Rewriter {
    const rewriter = new Rewriter("", "", func);
    rewriter.process();
    return rewriter;
  }

  /**
   * Create a Rewriter
   * @param {string} group - group name
   * @param {string} name - snippet name
   * @param {Function} func - a function defines the behaviors of the rewriter
   */
  constructor(
    public group: string,
    public name: string,
    private func: (rewriter: Rewriter) => void
  ) {
    Rewriter.register(group, name, this);
  }

  /**
   * Process the rewriter.
   */
  process(): void {
    const originalRewriter = Rewriter.current;
    try {
      Rewriter.current = this;
      this.func.call(this, this);
    } finally {
      Rewriter.current = originalRewriter;
    }
  }

  /**
   * Process rewriter with sandbox mode.
   * It will call the function but doesn't change any file.
   */
  processWithSandbox(): void {
    this.sandbox = true;
    this.process();
  }

  /*******
   * DSL *
   *******/

  configure(options: RewriterOptions) {
    if (options.sourceType) {
      Rewriter.current.sourceType = options.sourceType;
    }
    if (options.parser) {
      Rewriter.current.parser = options.parser;
    }
  }

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
  description(): string;
  description(description: string): void;
  description(description?: string): void | string {
    if (description) {
      Rewriter.current.desc = description;
    } else {
      return this.desc;
    }
  }

  /**
   * Parse `ifNode` dsl, it checks if node version is greater than or equal to the specified node version.
   * @example
   * ifNode("10.14.0");
   * @param {string} version - specified node version.
   */
  ifNode(version: string): void {
    Rewriter.current.nodeVersion = new NodeVersion(version);
  }

  /**
   * Parse `ifNpm` dsl, it compares version of the specified npm.
   * @example
   * ifNpm("react", ">= 18.0");
   * @param {string} name - npm name.
   * @param {string} version - equal, less than or greater than specified version, e.g. '>= 2.0.0',
   */
  ifNpm(name: string, version: string): void {
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
  addSnippet(group: string, name: string, options: object = {}): void {
    const currentRewriter = Rewriter.current;
    const rewriter = Rewriter.call(
      group,
      name,
      currentRewriter.sandbox,
      options
    );
    if (rewriter) {
      currentRewriter.subSnippets.push(rewriter);
    }
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
  withinFiles(filePattern: string, func: (instance: Instance) => void): void {
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

export default Rewriter;

declare global {
  var configure: (options: RewriterOptions) => void;
  var description: (description: string | null) => void | string;
  var ifNode: (version: string) => void;
  var ifNpm: (name: string, version: string) => void;
  var addSnippet: (group: string, name: string, options?: object) => void;
  var withinFiles: (
    filePattern: string,
    func: (instance: Instance) => void
  ) => void;
  var withinFile: (
    filePattern: string,
    func: (instance: Instance) => void
  ) => void;
}

global.configure = Rewriter.prototype.configure;
global.description = Rewriter.prototype.description;
global.ifNode = Rewriter.prototype.ifNode;
global.ifNpm = Rewriter.prototype.ifNpm;
global.addSnippet = Rewriter.prototype.addSnippet;
global.withinFiles = Rewriter.prototype.withinFiles;
global.withinFile = Rewriter.prototype.withinFiles;

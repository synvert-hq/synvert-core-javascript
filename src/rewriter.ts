import fs, { promises as promisesFs } from "fs";
import path from "path";
import { RewriterOptions, Parser, SourceType } from "./types/options";
import Instance from "./instance";
import NodeVersion from "./node-version";
import NpmVersion from "./npm-version";
import { TestResultExt } from "./types/result";
import {
  evalSnippet,
  evalSnippetSync,
  isValidFile,
  isValidFileSync,
} from "./utils";
import Configuration from "./configuration";

/**
 * Rewriter is the top level namespace in a synvert snippet.
 *
 * One rewriter checks if the dependency version matche, and it can contain one or many Instances,
 * which define the behavior what files need to find and what codes need to rewrite.
 * @borrows Rewriter#withinFiles as Rewriter#withinFile
 */
class Rewriter {
  public subSnippets: Rewriter[] = [];
  public affectedFiles: Set<string> = new Set<string>();
  public nodeVersion?: NodeVersion;
  public npmVersion?: NpmVersion;
  public options: RewriterOptions = {
    sourceType: SourceType.MODULE,
    parser: Parser.ESPREE,
    runInstance: true,
    writeToFile: true,
  };
  private desc?: string;
  private testResults: TestResultExt[] = [];

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
   */
  static fetch(group: string, name: string): Rewriter | undefined {
    if (this.rewriters[group] && this.rewriters[group][name]) {
      return this.rewriters[group][name];
    }
  }

  /**
   * Clear all registered rewriters.
   */
  static clear(): void {
    this.rewriters = {};
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
  processSync(): void {
    const originalRewriter = Rewriter.current;
    this.affectedFiles = new Set<string>();
    try {
      Rewriter.current = this;
      this.func.call(this, this);
    } finally {
      Rewriter.current = originalRewriter;
    }
  }

  async process(): Promise<void> {
    const originalRewriter = Rewriter.current;
    this.affectedFiles = new Set<string>();
    try {
      Rewriter.current = this;
      await this.func.call(this, this);
    } finally {
      Rewriter.current = originalRewriter;
    }
  }

  /**
   * Process rwriter with sandbox mode.
   * It will run the func but doesn't change any file.
   */
  processWithSandboxSync(): void {
    const originalRewriter = Rewriter.current;
    try {
      Rewriter.current = this;
      Rewriter.current.options.runInstance = false;
      this.func.call(this, this);
    } finally {
      Rewriter.current = originalRewriter;
    }
  }

  async processWithSandbox(): Promise<void> {
    const originalRewriter = Rewriter.current;
    try {
      Rewriter.current = this;
      Rewriter.current.options.runInstance = false;
      await this.func.call(this, this);
    } finally {
      Rewriter.current = originalRewriter;
    }
  }

  /**
   * Test the rewriter.
   * @returns {TestResultExt[]} test results
   */
  testSync(): TestResultExt[] {
    const originalRewriter = Rewriter.current;
    try {
      Rewriter.current = this;
      Rewriter.current.options.writeToFile = false;
      this.func.call(this, this);
      return Rewriter.current.testResults;
    } finally {
      Rewriter.current = originalRewriter;
    }
  }

  async test(): Promise<TestResultExt[]> {
    const originalRewriter = Rewriter.current;
    try {
      Rewriter.current = this;
      Rewriter.current.options.writeToFile = false;
      await this.func.call(this, this);
      return Promise.resolve(Rewriter.current.testResults);
    } finally {
      Rewriter.current = originalRewriter;
    }
  }

  /**
   * Add an affected file.
   * @param {string} filePath - file path
   */
  addAffectedFile(filePath: string): void {
    this.affectedFiles.add(filePath);
  }

  /*******
   * DSL *
   *******/

  /**
   * Configure the rewriter.
   * @example
   * configure({ parser: "typescript" })
   * @param {RewriterOptions} options
   * @param {string} options.sourceType - script or module
   * @param {string} options.parser - typescript or espree
   * @param {string} options.strategy - allow_insert_at_same_position
   */
  configure(options: RewriterOptions) {
    if (options.sourceType) {
      Rewriter.current.options.sourceType = options.sourceType;
    }
    if (options.parser) {
      Rewriter.current.options.parser = options.parser;
    }
    if (options.strategy) {
      Rewriter.current.options.strategy = options.strategy;
    }
  }

  /**
   * Set description of the rewriter or get description.
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
   * Check if node version is greater than or equal to the specified node version.
   * @example
   * ifNode("10.14.0");
   * @param {string} version - specified node version.
   */
  ifNode(version: string): void {
    Rewriter.current.nodeVersion = new NodeVersion(version);
  }

  /**
   * Compare version of the specified npm.
   * @example
   * ifNpm("react", ">= 18.0");
   * @param {string} name - npm name.
   * @param {string} version - equal, less than or greater than specified version, e.g. '>= 2.0.0',
   */
  ifNpm(name: string, version: string): void {
    Rewriter.current.npmVersion = new NpmVersion(name, version);
  }

  /**
   * Call anther rewriter.
   * @example
   * new Synvert.Rewriter("jquery", "migrate", () => {
   *   addSnippet("jquery", "deprecate-event-shorthand");
   *   addSnippet("jquery", "deprecate-ready-event");
   *   addSnippet("https://github.com/xinminlabs/synvert-snippets-javascript/blob/main/lib/javascript/no-useless-constructor.js")
   *   addSnippet("/Users/flyerhzm/.synvert-javascript/lib/javascript/no-useless-constructor.js")
   *   addSnippet("javascript/no-useless-constructor")
   * });
   * @param {string} group - group of another rewriter, if there's no name parameter, the group can be http url, file path or snippet name.
   * @param {string} name - name of another rewriter.
   */
  addSnippetSync(group: string, name?: string): void {
    const currentRewriter = Rewriter.current;
    let rewriter = null;
    if (typeof name === "string") {
      rewriter =
        Rewriter.fetch(group, name) || evalSnippetSync([group, name].join("/"));
    } else {
      rewriter = evalSnippetSync(group);
    }
    if (!rewriter || !(rewriter instanceof Rewriter)) return;

    rewriter.options = currentRewriter.options;
    if (!rewriter.options.writeToFile) {
      const results = rewriter.testSync();
      currentRewriter.mergeTestResults(results);
    } else if (rewriter.options.runInstance) {
      rewriter.processSync();
    } else {
      rewriter.processWithSandboxSync();
    }
    currentRewriter.subSnippets.push(rewriter);
  }

  async addSnippet(group: string, name?: string): Promise<void> {
    const currentRewriter = Rewriter.current;
    let rewriter = null;
    if (typeof name === "string") {
      rewriter =
        Rewriter.fetch(group, name) ||
        (await evalSnippet([group, name].join("/")));
    } else {
      rewriter = await evalSnippet(group);
    }
    if (!rewriter || !(rewriter instanceof Rewriter)) return;

    rewriter.options = currentRewriter.options;
    if (!rewriter.options.writeToFile) {
      const results = await rewriter.test();
      currentRewriter.mergeTestResults(results);
    } else if (rewriter.options.runInstance) {
      rewriter.process();
    } else {
      rewriter.processWithSandbox();
    }
    currentRewriter.subSnippets.push(rewriter);
  }

  /**
   * Find specified files.
   * It creates an Instance to rewrite code.
   * @example
   * new Synvert.Rewriter("javascript", "no-unused-imports", () => {
   *   withinFiles('**\/*.js', function () {
   *   })
   * })
   * @param {string} filePattern - pattern to find files, e.g. lib/*.js
   * @param {Functioin} func - a function rewrites code in the matching files.
   */
  withinFilesSync(
    filePattern: string,
    func: (instance: Instance) => void
  ): void {
    if (!Rewriter.current.options.runInstance) return;

    if (
      (!Rewriter.current.nodeVersion || Rewriter.current.nodeVersion.match()) &&
      (!Rewriter.current.npmVersion || Rewriter.current.npmVersion.match())
    ) {
      const instance = new Instance(Rewriter.current, filePattern, func);
      Instance.current = instance;
      if (Rewriter.current.options.writeToFile) {
        instance.processSync();
      } else {
        const results = instance.testSync();
        Rewriter.current.mergeTestResults(results);
      }
    }
  }

  async withinFiles(
    filePattern: string,
    func: (instance: Instance) => void
  ): Promise<void> {
    if (!Rewriter.current.options.runInstance) return;

    if (
      (!Rewriter.current.nodeVersion ||
        (await Rewriter.current.nodeVersion.match())) &&
      (!Rewriter.current.npmVersion ||
        (await Rewriter.current.npmVersion.match()))
    ) {
      const instance = new Instance(Rewriter.current, filePattern, func);
      Instance.current = instance;
      if (Rewriter.current.options.writeToFile) {
        await instance.process();
      } else {
        const results = await instance.test();
        Rewriter.current.mergeTestResults(results);
      }
    }
  }

  /**
   * Add a new file.
   * @param {string} fileName - file name
   * @param {string} content - file body
   */
  addFileSync(fileName: string, content: string): void {
    if (!Rewriter.current.options.runInstance) return;

    const filePath = path.join(Configuration.rootPath, fileName);
    if (isValidFileSync(filePath)) {
      console.log(`File ${filePath} already exists.`);
      return;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  async addFile(fileName: string, content: string): Promise<void> {
    if (!Rewriter.current.options.runInstance) return;

    const filePath = path.join(Configuration.rootPath, fileName);
    if (await isValidFile(filePath)) {
      console.log(`File ${filePath} already exists.`);
      return;
    }
    await promisesFs.mkdir(path.dirname(filePath), { recursive: true });
    await promisesFs.writeFile(filePath, content);
  }

  /**
   * Remove a file.
   * @param {string} fileName - file name
   */
  removeFileSync(fileName: string): void {
    if (!Rewriter.current.options.runInstance) return;

    const filePath = path.join(Configuration.rootPath, fileName);
    if (isValidFileSync(filePath)) {
      fs.rmSync(filePath);
    }
  }

  async removeFile(fileName: string): Promise<void> {
    if (!Rewriter.current.options.runInstance) return;

    const filePath = path.join(Configuration.rootPath, fileName);
    if (await isValidFile(filePath)) {
      await promisesFs.rm(filePath);
    }
  }

  private mergeTestResults(results: TestResultExt[]): void {
    Rewriter.current.testResults = [
      ...Rewriter.current.testResults,
      ...results.filter((result) => result.affected),
    ];
  }
}

export default Rewriter;

declare global {
  var configure: (options: RewriterOptions) => void;
  var description: (description: string | null) => void | string;
  var ifNode: (version: string) => void;
  var ifNpm: (name: string, version: string) => void;
  var addSnippetSync: (group: string, name?: string) => void;
  var addSnippet: (group: string, name?: string) => void;
  var withinFilesSync: (
    filePattern: string,
    func: (instance: Instance) => void
  ) => void;
  var withinFiles: (
    filePattern: string,
    func: (instance: Instance) => void
  ) => void;
  var withinFileSync: (
    filePattern: string,
    func: (instance: Instance) => void
  ) => void;
  var withinFile: (
    filePattern: string,
    func: (instance: Instance) => void
  ) => void;
  var addFileSync: (fileName: string, content: string) => void;
  var addFile: (fileName: string, content: string) => void;
  var removeFileSync: (fileName: string) => void;
  var removeFile: (fileName: string) => void;
}

global.configure = Rewriter.prototype.configure;
global.description = Rewriter.prototype.description;
global.ifNode = Rewriter.prototype.ifNode;
global.ifNpm = Rewriter.prototype.ifNpm;
global.addSnippetSync = Rewriter.prototype.addSnippetSync;
global.addSnippet = Rewriter.prototype.addSnippet;
global.withinFilesSync = Rewriter.prototype.withinFilesSync;
global.withinFiles = Rewriter.prototype.withinFiles;
global.withinFileSync = Rewriter.prototype.withinFilesSync;
global.withinFile = Rewriter.prototype.withinFiles;
global.addFileSync = Rewriter.prototype.addFileSync;
global.addFile = Rewriter.prototype.addFile;
global.removeFileSync = Rewriter.prototype.removeFileSync;
global.removeFile = Rewriter.prototype.removeFile;

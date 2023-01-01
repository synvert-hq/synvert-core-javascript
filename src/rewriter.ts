import fs, { promises as promisesFs } from "fs";
import path from "path";
import fg from "fast-glob";
import minimatch from "minimatch";
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
import NodeQuery, {
  TypescriptAdapter as TypescriptQueryAdapter,
} from "@xinminlabs/node-query";
import NodeMutation, {
  TypescriptAdapter as TypescriptMutationAdapter,
} from "@xinminlabs/node-mutation";
import EspreeMutationAdapter from "./node-mutation/espree-adapter";
import EspreeQueryAdapter from "./node-query/espree-adapter";

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
    parser: Parser.TYPESCRIPT,
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
   * Sync to process the rewriter.
   */
  processSync(): void {
    this.affectedFiles = new Set<string>();
    this.func.call(this, this);
  }

  /**
   * Async to process the rewriter.
   * @async
   */
  async process(): Promise<void> {
    this.prepare();
    this.affectedFiles = new Set<string>();
    await this.func.call(this, this);
  }

  /**
   * Sync to process rwriter with sandbox mode.
   * It will run the func but doesn't change any file.
   */
  processWithSandboxSync(): void {
    this.prepare();
    this.options.runInstance = false;
    this.func.call(this, this);
  }

  /**
   * Async to process rwriter with sandbox mode.
   * It will run the func but doesn't change any file.
   * @async
   */
  async processWithSandbox(): Promise<void> {
    this.prepare();
    this.options.runInstance = false;
    await this.func.call(this, this);
  }

  /**
   * Sync to test the rewriter.
   * @returns {TestResultExt[]} test results
   */
  testSync(): TestResultExt[] {
    this.prepare();
    this.options.writeToFile = false;
    this.func.call(this, this);
    return this.testResults;
  }

  /**
   * Async to test the rewriter.
   * @async
   * @returns {TestResultExt[]} test results
   */
  async test(): Promise<TestResultExt[]> {
    this.prepare();
    this.options.writeToFile = false;
    await this.func.call(this, this);
    return this.testResults;
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
      this.options.sourceType = options.sourceType;
    }
    if (options.parser) {
      this.options.parser = options.parser;
      if (this.options.parser === Parser.ESPREE) {
        NodeQuery.configure({ adapter: new EspreeQueryAdapter() });
        NodeMutation.configure({ adapter: new EspreeMutationAdapter() });
      } else {
        NodeQuery.configure({ adapter: new TypescriptQueryAdapter() });
        NodeMutation.configure({ adapter: new TypescriptMutationAdapter() });
      }
    }
    if (options.strategy) {
      this.options.strategy = options.strategy;
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
      this.desc = this.heredoc(description);
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
    this.nodeVersion = new NodeVersion(version);
  }

  /**
   * Compare version of the specified npm.
   * @example
   * ifNpm("react", ">= 18.0");
   * @param {string} name - npm name.
   * @param {string} version - equal, less than or greater than specified version, e.g. '>= 2.0.0',
   */
  ifNpm(name: string, version: string): void {
    this.npmVersion = new NpmVersion(name, version);
  }

  /**
   * Sync to call anther snippet.
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
    let rewriter = null;
    if (typeof name === "string") {
      rewriter =
        Rewriter.fetch(group, name) || evalSnippetSync([group, name].join("/"));
    } else {
      rewriter = evalSnippetSync(group);
    }
    if (!rewriter || !(rewriter instanceof Rewriter)) return;

    rewriter.options = this.options;
    if (!rewriter.options.writeToFile) {
      const results = rewriter.testSync();
      this.mergeTestResults(results);
    } else if (rewriter.options.runInstance) {
      rewriter.processSync();
    } else {
      rewriter.processWithSandboxSync();
    }
    this.subSnippets.push(rewriter);
  }

  /**
   * Async to call anther snippet.
   * @async
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
  async addSnippet(group: string, name?: string): Promise<void> {
    let rewriter = null;
    if (typeof name === "string") {
      rewriter =
        Rewriter.fetch(group, name) ||
        (await evalSnippet([group, name].join("/")));
    } else {
      rewriter = await evalSnippet(group);
    }
    if (!rewriter || !(rewriter instanceof Rewriter)) return;

    rewriter.options = this.options;
    if (!rewriter.options.writeToFile) {
      const results = await rewriter.test();
      this.mergeTestResults(results);
    } else if (rewriter.options.runInstance) {
      await rewriter.process();
    } else {
      await rewriter.processWithSandbox();
    }
    this.subSnippets.push(rewriter);
  }

  /**
   * Sync to find specified files.
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
    if (!this.options.runInstance) return;
    if (this.nodeVersion && !this.nodeVersion.match()) return;
    if (this.npmVersion && !this.npmVersion.match()) return;

    if (this.options.writeToFile) {
      if (
        isValidFileSync(Configuration.rootPath) &&
        minimatch(Configuration.rootPath, filePattern)
      ) {
        const instance = new Instance(this, filePattern, func);
        return instance.processSync();
      }
      this.matchFilesInPathsSync(filePattern).forEach((filePath) => {
        const instance = new Instance(this, filePath, func);
        instance.processSync();
      });
    } else {
      if (
        isValidFileSync(Configuration.rootPath) &&
        minimatch(Configuration.rootPath, filePattern)
      ) {
        const instance = new Instance(this, filePattern, func);
        const result = instance.testSync();
        this.mergeTestResults([result]);
        return;
      }
      const filePaths = this.matchFilesInPathsSync(filePattern);
      const results = filePaths.map((filePath) => {
        const instance = new Instance(this, filePath, func);
        return instance.testSync();
      });
      this.mergeTestResults(results);
    }
  }

  withinFileSync = this.withinFilesSync.bind(this);

  /**
   * Async to find specified files.
   * It creates an Instance to rewrite code.
   * @async
   * @example
   * new Synvert.Rewriter("javascript", "no-unused-imports", () => {
   *   withinFiles('**\/*.js', function () {
   *   })
   * })
   * @param {string} filePattern - pattern to find files, e.g. lib/*.js
   * @param {Functioin} func - a function rewrites code in the matching files.
   */
  async withinFiles(
    filePattern: string,
    func: (instance: Instance) => void
  ): Promise<void> {
    if (!this.options.runInstance) return;
    if (this.nodeVersion && !(await this.nodeVersion.match())) return;
    if (this.npmVersion && !(await this.npmVersion.match())) return;

    if (this.options.writeToFile) {
      if (
        (await isValidFile(Configuration.rootPath)) &&
        minimatch(Configuration.rootPath, filePattern)
      ) {
        const instance = new Instance(this, filePattern, func);
        return await instance.process();
      }
      const filePaths = await this.matchFilesInPaths(filePattern);
      await Promise.all(
        filePaths.map((filePath) => {
          const instance = new Instance(this, filePath, func);
          return instance.process();
        })
      );
    } else {
      if (
        (await isValidFile(Configuration.rootPath)) &&
        minimatch(Configuration.rootPath, filePattern)
      ) {
        const instance = new Instance(this, filePattern, func);
        const result = await instance.test();
        this.mergeTestResults([result]);
        return;
      }
      const filePaths = await this.matchFilesInPaths(filePattern);
      const results = await Promise.all(
        filePaths.map((filePath) => {
          const instance = new Instance(this, filePath, func);
          return instance.test();
        })
      );
      this.mergeTestResults(results);
    }
  }

  withinFile = this.withinFiles.bind(this);

  /**
   * Sync to add a new file.
   * @param {string} fileName - file name
   * @param {string} content - file body
   */
  addFileSync(fileName: string, content: string): void {
    if (!this.options.runInstance) return;

    const filePath = path.join(Configuration.rootPath, fileName);
    if (isValidFileSync(filePath)) {
      return;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  /**
   * Async to add a new file.
   * @async
   * @param {string} fileName - file name
   * @param {string} content - file body
   */
  async addFile(fileName: string, content: string): Promise<void> {
    if (!this.options.runInstance) return;

    const filePath = path.join(Configuration.rootPath, fileName);
    if (await isValidFile(filePath)) {
      return;
    }
    await promisesFs.mkdir(path.dirname(filePath), { recursive: true });
    await promisesFs.writeFile(filePath, content);
  }

  /**
   * Sync to remove a file.
   * @param {string} fileName - file name
   */
  removeFileSync(fileName: string): void {
    if (!this.options.runInstance) return;

    const filePath = path.join(Configuration.rootPath, fileName);
    if (isValidFileSync(filePath)) {
      fs.rmSync(filePath);
    }
  }

  /**
   * Async to remove a file.
   * @async
   * @param {string} fileName - file name
   */
  async removeFile(fileName: string): Promise<void> {
    if (!this.options.runInstance) return;

    const filePath = path.join(Configuration.rootPath, fileName);
    if (await isValidFile(filePath)) {
      await promisesFs.rm(filePath);
    }
  }

  /**
   * Prepare to run or test a rewriter.
   */
  private prepare() {
    NodeQuery.configure({ adapter: new TypescriptQueryAdapter() });
    NodeMutation.configure({ adapter: new TypescriptMutationAdapter() });
  }

  /**
   * Merge test results.
   * @param {TestResultExt[]} results test results to be mreged
   */
  private mergeTestResults(results: TestResultExt[]): void {
    this.testResults = [
      ...this.testResults,
      ...results.filter((result) => result.affected),
    ];
  }

  /**
   * Return matching files.
   * @returns {string[]} matching files
   */
  private matchFilesInPathsSync(filePattern: string): string[] {
    const onlyPaths =
      Configuration.onlyPaths.length > 0 ? Configuration.onlyPaths : [""];
    const fsStats = fg.sync(
      onlyPaths.map((onlyPath) => path.join(onlyPath, filePattern)),
      {
        ignore: Configuration.skipPaths,
        cwd: Configuration.rootPath,
        onlyFiles: true,
        unique: true,
        stats: true,
      }
    );
    return fsStats
      .filter((fsStat) => fsStat.stats!.size < Configuration.maxFileSize)
      .map((fsStat) => fsStat.path);
  }

  private async matchFilesInPaths(filePattern: string): Promise<string[]> {
    const onlyPaths =
      Configuration.onlyPaths.length > 0 ? Configuration.onlyPaths : [""];
    const fsStats = await fg(
      onlyPaths.map((onlyPath) => path.join(onlyPath, filePattern)),
      {
        ignore: Configuration.skipPaths,
        cwd: Configuration.rootPath,
        onlyFiles: true,
        unique: true,
        stats: true,
      }
    );
    return fsStats
      .filter((fsStat) => fsStat.stats!.size < Configuration.maxFileSize)
      .map((fsStat) => fsStat.path);
  }

  private heredoc(text: string): string {
    let addNewLine = false;
    const lines = text.split("\n");
    if (lines.length > 0 && lines[0] === '') {
      lines.shift();
    }
    if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
      addNewLine = true;
    }
    const indent = lines[0].search(/[^ ]/);
    return lines.map((line) => line.slice(indent)).join('\n') + (addNewLine ? '\n' : '');
  }
}

export default Rewriter;

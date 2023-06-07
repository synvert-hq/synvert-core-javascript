import fs, { promises as promisesFs } from "fs";
import path from "path";
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
  glob,
  globSync,
} from "./utils";
import Configuration from "./configuration";
import NodeQuery, {
  EspreeAdapter as EspreeQueryAdapter,
  TypescriptAdapter as TypescriptQueryAdapter,
  GonzalesPeAdapter as GonzalesPeQueryAdapter,
} from "@xinminlabs/node-query";
import NodeMutation, {
  EspreeAdapter as EspreeMutationAdapter,
  TypescriptAdapter as TypescriptMutationAdapter,
  GonzalesPeAdapter as GonzalesPeMutationAdapter,
} from "@xinminlabs/node-mutation";

/**
 * Rewriter is the top level namespace in a synvert snippet.
 *
 * One rewriter checks if the dependency version matche, and it can contain one or many Instances,
 * which define the behavior what files need to find and what codes need to rewrite.
 * @borrows Rewriter#withinFiles as Rewriter#withinFile
 */
class Rewriter<T> {
  public subSnippets: Rewriter<T>[] = [];
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
  static rewriters: { [group: string]: { [name: string]: Rewriter<any> } } = {};

  /**
   * Current rewriters
   * @static
   */
  static current: Rewriter<any>;

  /**
   * Register a rewriter with its group and name.
   * @static
   * @param {string} group - the rewriter group.
   * @param {string} name - the unique rewriter name.
   * @param {Rewirter} rewriter - the rewriter to register.
   */
  static register(group: string, name: string, rewriter: Rewriter<any>) {
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
  static fetch(group: string, name: string): Rewriter<any> | undefined {
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
    private func: (rewriter: Rewriter<T>) => void
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
   * @param {string} [options.sourceType] - script or module
   * @param {string} [options.parser] - typescript or espree
   */
  configure(options: RewriterOptions) {
    if (options.sourceType) {
      this.options.sourceType = options.sourceType;
    }
    if (options.parser) {
      this.options.parser = options.parser;
      switch (this.options.parser) {
        case Parser.ESPREE:
          NodeQuery.configure({ adapter: new EspreeQueryAdapter() });
          NodeMutation.configure({ adapter: new EspreeMutationAdapter() });
          break;
        case Parser.GONZALES_PE:
          NodeQuery.configure({ adapter: new GonzalesPeQueryAdapter() });
          NodeMutation.configure({ adapter: new GonzalesPeMutationAdapter() });
          break;
        default:
          NodeQuery.configure({ adapter: new TypescriptQueryAdapter() });
          NodeMutation.configure({ adapter: new TypescriptMutationAdapter() });
          break;
      }
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
   *   this.addSnippetSync("jquery", "deprecate-event-shorthand");
   *   this.addSnippetSync("jquery", "deprecate-ready-event");
   *   this.addSnippetSync("https://github.com/xinminlabs/synvert-snippets-javascript/blob/main/lib/javascript/no-useless-constructor.js")
   *   this.addSnippetSync("/Users/flyerhzm/.synvert-javascript/lib/javascript/no-useless-constructor.js")
   *   this.addSnippetSync("javascript/no-useless-constructor")
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
   * new Synvert.Rewriter("jquery", "migrate", async () => {
   *   await this.addSnippet("jquery", "deprecate-event-shorthand");
   *   await this.addSnippet("jquery", "deprecate-ready-event");
   *   await this.addSnippet("https://github.com/xinminlabs/synvert-snippets-javascript/blob/main/lib/javascript/no-useless-constructor.js")
   *   await this.addSnippet("/Users/flyerhzm/.synvert-javascript/lib/javascript/no-useless-constructor.js")
   *   await this.addSnippet("javascript/no-useless-constructor")
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
   *   this.withinFilesSync('**\/*.js', function () {
   *   })
   * })
   * @param {string} filePattern - pattern to find files, e.g. lib/*.js
   * @param {Functioin} func - a function rewrites code in the matching files.
   */
  withinFilesSync(
    filePattern: string,
    func: (instance: Instance<T>) => void
  ): void {
    if (!this.options.runInstance) return;
    if (this.nodeVersion && !this.nodeVersion.match()) return;
    if (this.npmVersion && !this.npmVersion.match()) return;

    if (this.options.writeToFile) {
      if (
        isValidFileSync(Configuration.rootPath) &&
        minimatch(Configuration.rootPath, filePattern)
      ) {
        const instance = new Instance<T>(this, filePattern, func);
        return instance.processSync();
      }
      globSync(filePattern).forEach((filePath) => {
        const instance = new Instance<T>(this, filePath, func);
        instance.processSync();
      });
    } else {
      if (
        isValidFileSync(Configuration.rootPath) &&
        minimatch(Configuration.rootPath, filePattern)
      ) {
        const instance = new Instance<T>(this, filePattern, func);
        const result = instance.testSync();
        this.mergeTestResults([result]);
        return;
      }
      const filePaths = globSync(filePattern);
      const results = filePaths.map((filePath) => {
        const instance = new Instance<T>(this, filePath, func);
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
   * new Synvert.Rewriter("javascript", "no-unused-imports", async () => {
   *   await this.withinFiles('**\/*.js', async function () {
   *   })
   * })
   * @param {string} filePattern - pattern to find files, e.g. lib/*.js
   * @param {Functioin} func - a function rewrites code in the matching files.
   */
  async withinFiles(
    filePattern: string,
    func: (instance: Instance<T>) => void
  ): Promise<void> {
    if (!this.options.runInstance) return;
    if (this.nodeVersion && !(await this.nodeVersion.match())) return;
    if (this.npmVersion && !(await this.npmVersion.match())) return;

    if (this.options.writeToFile) {
      if (
        (await isValidFile(Configuration.rootPath)) &&
        minimatch(Configuration.rootPath, filePattern)
      ) {
        const instance = new Instance<T>(this, filePattern, func);
        return await instance.process();
      }
      const filePaths = await glob(filePattern);
      await Promise.all(
        filePaths.map((filePath) => {
          const instance = new Instance<T>(this, filePath, func);
          return instance.process();
        })
      );
    } else {
      if (
        (await isValidFile(Configuration.rootPath)) &&
        minimatch(Configuration.rootPath, filePattern)
      ) {
        const instance = new Instance<T>(this, filePattern, func);
        const result = await instance.test();
        this.mergeTestResults([result]);
        return;
      }
      const filePaths = await glob(filePattern);
      const results = await Promise.all(
        filePaths.map((filePath) => {
          const instance = new Instance<T>(this, filePath, func);
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

    if (!this.options.writeToFile) {
      const result = {
        affected: true,
        conflicted: false,
        filePath: fileName,
        actions: [{ type: "add_file", start: 0, end: 0, newCode: content }],
      };
      this.testResults.push(result);
      return;
    }

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

    if (!this.options.writeToFile) {
      const result = {
        affected: true,
        conflicted: false,
        filePath: fileName,
        actions: [{ type: "add_file", start: 0, end: 0, newCode: content }],
      };
      this.testResults.push(result);
      return;
    }

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

    if (!this.options.writeToFile) {
      const result = {
        affected: true,
        conflicted: false,
        filePath: fileName,
        actions: [{ type: "remove_file", start: 0, end: -1 }],
      };
      this.testResults.push(result);
      return;
    }

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

    if (!this.options.writeToFile) {
      const result = {
        affected: true,
        conflicted: false,
        filePath: fileName,
        actions: [{ type: "remove_file", start: 0, end: -1 }],
      };
      this.testResults.push(result);
      return;
    }

    const filePath = path.join(Configuration.rootPath, fileName);
    if (await isValidFile(filePath)) {
      await promisesFs.rm(filePath);
    }
  }

  /**
   * Sync to rename filepath to new filepath.
   * @param {string} filePattern - pattern to find files, e.g. *.scss
   * @param {string | (string) => string} convertFunc - new file path string or function to convert file path to new file path.
   */
  renameFileSync(
    filePattern: string,
    convertFunc: string | ((filePath: string) => string)
  ): void {
    globSync(filePattern).forEach((filePath: string) => {
      const newFilePath =
        typeof convertFunc === "string" ? convertFunc : convertFunc(filePath);
      fs.renameSync(
        path.join(Configuration.rootPath, filePath),
        path.join(Configuration.rootPath, newFilePath)
      );
    });
  }

  /**
   * Rename filepath to new filepath.
   * @param {string} filePattern - pattern to find files, e.g. *.scss
   * @param {string | (string) => string} convertFunc - new file path string or function to convert file path to new file path.
   */
  async renameFile(
    filePattern: string,
    convertFunc: string | ((filePath: string) => string)
  ): Promise<void> {
    const filePaths = await glob(filePattern);
    filePaths.map(async (filePath: string) => {
      const newFilePath =
        typeof convertFunc === "string" ? convertFunc : convertFunc(filePath);
      await promisesFs.rename(
        path.join(Configuration.rootPath, filePath),
        path.join(Configuration.rootPath, newFilePath)
      );
    });
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

  private heredoc(text: string): string {
    let addNewLine = false;
    const lines = text.split("\n");
    if (lines.length > 0 && lines[0] === "") {
      lines.shift();
    }
    if (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
      addNewLine = true;
    }
    const indent = lines[0].search(/[^ ]/);
    return (
      lines.map((line) => line.slice(indent)).join("\n") +
      (addNewLine ? "\n" : "")
    );
  }
}

export default Rewriter;

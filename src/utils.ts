import ts from "typescript";
import { Node } from "acorn";
import fs, { promises as promisesFs } from "fs";
import path from "path";
import fg from "fast-glob";
import fetchSync from "sync-fetch";
import { URL } from "url";
import NodeQuery, {
  TypescriptAdapter as TypescriptQueryAdapter,
} from "@xinminlabs/node-query";
import NodeMutation, {
  TypescriptAdapter as TypescriptMutationAdapter,
} from "@xinminlabs/node-mutation";

import { SnippetNotFoundError } from "./errors";
import Rewriter from "./rewriter";
import Configuration from "./configuration";

const REWRITER_METHODS = "addFile removeFile withinFiles withinFile addSnippet";
const SCOPE_METHODS = "withinNode withNode findNode gotoNode";
const CONDITION_METHODS =
  "ifExistNode unlessExistNode ifOnlyExistNode ifAllNodes";
const ACTION_METHODS =
  "append prepend insert insertAfter insertBefore deleteNode remove replace replaceWith noop";
const ALL_METHODS = `configure description ifNode ifNpm ${REWRITER_METHODS} ${SCOPE_METHODS} ${CONDITION_METHODS} ${ACTION_METHODS} callHelper indent`;

export const arrayBody = (node: any): Node[] => {
  switch (node.type) {
    case "ClassDefinition":
      return node.body.body;
    case "MethodDefinition":
      return node.value.body.body;
    default:
      return node.body;
  }
};

const NEW_REWRITER_WITH_FUNCTION_QUERY = new NodeQuery<ts.Node>(
  `.NewExpression[expression=Synvert.Rewriter][arguments.length=3][arguments.2=.FunctionExpression[modifiers=undefined]]`
);

const NEW_INSTANCE_WITH_FUNCTION_QUERY = new NodeQuery<ts.Node>(
  `.CallExpression[expression=.PropertyAccessExpression[expression=.ThisKeyword]
    [name IN (withinFiles withinFile)]][arguments.length=2][arguments.1=.FunctionExpression[modifiers=undefined]]`
);

const SCOPES_AND_CONDITIONS_QUERY = new NodeQuery<ts.Node>(
  `.CallExpression[expression=.PropertyAccessExpression[expression=.ThisKeyword]
    [name IN (${SCOPE_METHODS} ${CONDITION_METHODS})]]
    [arguments.-1.nodeType IN (FunctionExpression ArrowFunction)][arguments.-1.modifiers=undefined]`
);

const ASYNC_METHODS_QUERY = new NodeQuery<ts.Node>(
  `.CallExpression[expression=.PropertyAccessExpression[expression=.ThisKeyword]
    [name IN (${REWRITER_METHODS} callHelper ${SCOPE_METHODS} ${CONDITION_METHODS})]]`
);

/**
 * Rewrite javascript snippet to async version.
 */
export const rewriteSnippetToAsyncVersion = (
  snippet: string,
  insertRequire: boolean = true
): string => {
  return makeSureTypescriptAdapter(() => {
    let newSnippet = addProperScopeToSnippet(snippet);
    if (insertRequire) {
      newSnippet = insertRequireSynvertCoreToSnippet(newSnippet);
    }
    const node = parseCode(newSnippet);
    const mutation = new NodeMutation<ts.Node>(newSnippet);
    NEW_REWRITER_WITH_FUNCTION_QUERY.queryNodes(node).forEach((node) =>
      mutation.insert(node, "async ", { at: "beginning", to: "arguments.-1" })
    );
    NEW_INSTANCE_WITH_FUNCTION_QUERY.queryNodes(node).forEach((node) =>
      mutation.insert(node, "async ", { at: "beginning", to: "arguments.-1" })
    );
    SCOPES_AND_CONDITIONS_QUERY.queryNodes(node).forEach((node) =>
      mutation.insert(node, "async ", { at: "beginning", to: "arguments.-1" })
    );
    ASYNC_METHODS_QUERY.queryNodes(node).forEach((node) => {
      if (
        NodeQuery.getAdapter().getNodeType(node.parent) !== "AwaitExpression"
      ) {
        mutation.insert(node, "await ", { at: "beginning" });
      }
    });
    const { affected, newSource } = mutation.process();
    return affected ? newSource! : newSnippet;
  });
};

const SYNC_METHODS_QUERY = new NodeQuery<ts.Node>(
  `.CallExpression[expression=.PropertyAccessExpression[expression=.ThisKeyword]
    [name IN (${REWRITER_METHODS} callHelper ${SCOPE_METHODS} ${CONDITION_METHODS})]]`
);

/**
 * Rewrite javascript snippet to sync version.
 */
export const rewriteSnippetToSyncVersion = (
  snippet: string,
  insertRequire: boolean = true
): string => {
  return makeSureTypescriptAdapter(() => {
    let newSnippet = addProperScopeToSnippet(snippet);
    if (insertRequire) {
      newSnippet = insertRequireSynvertCoreToSnippet(newSnippet);
    }
    const node = parseCode(newSnippet);
    const mutation = new NodeMutation<ts.Node>(newSnippet);
    SYNC_METHODS_QUERY.queryNodes(node).forEach((node) =>
      mutation.insert(node, "Sync", { at: "end", to: "expression" })
    );
    const { affected, newSource } = mutation.process();
    return affected ? newSource! : newSnippet;
  });
};

const NOT_HAS_REQUIRE_SYNVERT_CORE_QUERY = new NodeQuery<ts.Node>(
  `:not_has(.FirstStatement[declarationList=.VariableDeclarationList[declarations.length=1][declarations.0=.VariableDeclaration[name=Synvert][initializer=.CallExpression[expression=require][arguments.length=1][arguments.0=.StringLiteral[text="synvert-core"]]]]])`
);

const insertRequireSynvertCoreToSnippet = (snippet: string): string => {
  const node = parseCode(snippet);
  const mutation = new NodeMutation<ts.Node>(snippet);
  NOT_HAS_REQUIRE_SYNVERT_CORE_QUERY.queryNodes(node).forEach((node) => {
    mutation.insert(node, `const Synvert = require("synvert-core");\n`, {
      at: "beginning",
    });
  });
  const { affected, newSource } = mutation.process();
  return affected ? newSource! : snippet;
};

const NEW_REWRITER_WITH_ARROW_FUNCTION_QUERY = new NodeQuery<ts.Node>(
  `.NewExpression[expression=Synvert.Rewriter][arguments.length=3][arguments.2=.ArrowFunction]`
);
const NEW_INSTANCE_WITH_ARROW_FUNCTION_QUERY = new NodeQuery<ts.Node>(
  `.CallExpression[expression IN (withinFiles withinFile)][arguments.length=2][arguments.1=.ArrowFunction]`
);
const GLOBAL_DSL_QUERY = new NodeQuery<ts.Node>(
  `.CallExpression[expression IN (${ALL_METHODS})]`
);

const addProperScopeToSnippet = (snippet: string): string => {
  const node = parseCode(snippet);
  const mutation = new NodeMutation<ts.Node>(snippet);
  NEW_REWRITER_WITH_ARROW_FUNCTION_QUERY.queryNodes(node).forEach((node) => {
    mutation.delete(node, "arguments.2.equalsGreaterThanToken");
    mutation.insert(node, "function ", { at: "beginning", to: "arguments.2" });
  });
  NEW_INSTANCE_WITH_ARROW_FUNCTION_QUERY.queryNodes(node).forEach((node) => {
    mutation.delete(node, "arguments.1.equalsGreaterThanToken");
    mutation.insert(node, "function ", { at: "beginning", to: "arguments.1" });
  });
  GLOBAL_DSL_QUERY.queryNodes(node).forEach((node) => {
    mutation.insert(node, "this.", { at: "beginning" });
  });
  const { affected, newSource } = mutation.process();
  return affected ? newSource! : snippet;
};

const parseCode = (snippet: string): ts.Node => {
  return ts.createSourceFile(
    "test.js",
    snippet,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
};

const makeSureTypescriptAdapter = (func: () => string): string => {
  const originalQueryAdapter = NodeQuery.getAdapter();
  const originalMutationAdapter = NodeMutation.getAdapter();
  try {
    NodeQuery.configure({ adapter: new TypescriptQueryAdapter() });
    NodeMutation.configure({ adapter: new TypescriptMutationAdapter() });
    return func();
  } finally {
    NodeQuery.configure({ adapter: originalQueryAdapter });
    NodeMutation.configure({ adapter: originalMutationAdapter });
  }
};

/**
 * Wrap str string with single or double quotes based on Configuration.singleQuote.
 * @param {string} str string
 * @returns {string} quoted string
 */
export const wrapWithQuotes = (str: string): string => {
  const quote = Configuration.singleQuote ? "'" : '"';
  const anotherQuote = Configuration.singleQuote ? '"' : "'";
  if (str.indexOf(quote) !== -1 && str.indexOf(anotherQuote) === -1) {
    return `${anotherQuote}${str}${anotherQuote}`;
  }
  const escapedStr = str.replace(new RegExp(quote, "g"), `\\${quote}`);
  return `${quote}${escapedStr}${quote}`;
};

/**
 * Sync to glob matching files.
 * @param {string} filePattern file pattern
 * @returns {string[]} matching files
 */
export const globSync = (filePattern: string): string[] => {
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
};

/**
 * Async to glob matching files.
 * @async
 * @param {string} filePattern file pattern
 * @returns {Promise<string[]>} matching files
 */
export const glob = async (filePattern: string): Promise<string[]> => {
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
};

/**
 * Sync to eval the snippet by name.
 * @param {string} snippetName - snippet name, it can be a http url, file path or short snippet name.
 * @returns {Rewriter} a Rewriter object
 */
export const evalSnippetSync = (snippetName: string): Rewriter => {
  return eval(loadSnippetSync(snippetName));
};

/**
 * Async to eval the snippet by name.
 * @async
 * @param {string} snippetName - snippet name, it can be a http url, file path or short snippet name.
 * @returns {Promise<Rewriter>} a Rewriter object
 */
export const evalSnippet = async (snippetName: string): Promise<Rewriter> => {
  return eval(await loadSnippet(snippetName));
};

/**
 * Sync to load snippet by snippet name.
 * @param {string} snippetName - snippet name, it can be a http url, file path or short snippet name.
 * @param {boolean} insertRequire - insert require statement or not
 * @returns {string} snippet helper content
 * @throws {SnippetNotFoundError} snippet not found
 */
export const loadSnippetSync = (
  snippetName: string,
  insertRequire: boolean = true
): string => {
  const snippetContent = loadSnippetContentSync(snippetName);
  return rewriteSnippetToSyncVersion(snippetContent, insertRequire);
};

/**
 * Sync to load snippet by snippet name.
 * @async
 * @param {string} snippetName - snippet name, it can be a http url, file path or short snippet name.
 * @param {boolean} insertRequire - insert require statement or not
 * @returns {Promise<string>} snippet helper content
 * @throws {SnippetNotFoundError} snippet not found
 */
export const loadSnippet = async (
  snippetName: string,
  insertRequire: boolean = true
): Promise<string> => {
  const snippetContent = await loadSnippetContent(snippetName);
  return rewriteSnippetToAsyncVersion(snippetContent, insertRequire);
};

/**
 * Sync to check if it is a valid file path.
 * @param {string} path - file path
 * @returns {boolean} gets true it is a valid file
 */
export const isValidFileSync = (path: string): boolean => {
  try {
    const stats = fs.statSync(path);
    return stats.isFile();
  } catch {
    return false;
  }
};

/**
 * Async to check if it is a valid file path.
 * @async
 * @param {string} path - file path
 * @returns {Promise<boolean>} gets true it is a valid file
 */
export const isValidFile = async (path: string): Promise<boolean> => {
  try {
    const stats = await promisesFs.stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
};

const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const formatUrl = (url: string): string => convertToGithubRawUrl(url);

const snippetExpandPath = (snippetName: string): string =>
  path.join(snippetsHome(), "lib", `${snippetName}.js`);

const remoteSnippetExistsSync = (snippetPath: string): boolean =>
  fetchSync(snippetPath).status === 200;

const remoteSnippetExists = async (snippetPath: string): Promise<boolean> => {
  const response = await fetch(snippetPath);
  return response.status === 200;
};

const remoteSnippetUrl = (snippetName: string) =>
  `https://github.com/xinminlabs/synvert-snippets-javascript/blob/main/lib/${snippetName}.js`;

const snippetsHome = (): string => {
  return (
    process.env.SYNVERT_SNIPPETS_HOME ||
    path.join(process.env.HOME!, ".synvert-javascript")
  );
};

const convertToGithubRawUrl = (url: string): string => {
  if (!url.includes("//github.com/")) {
    return url;
  }
  return url
    .replace("//github.com/", "//raw.githubusercontent.com/")
    .replace("/blob/", "/");
};

const loadSnippetContent = async (snippetName: string): Promise<string> => {
  if (isValidUrl(snippetName)) {
    const snippetUrl = formatUrl(snippetName);
    if (await remoteSnippetExists(snippetUrl)) {
      const response = await fetch(snippetUrl);
      return await response.text();
    }
    throw new SnippetNotFoundError(`${snippetName} not found`);
  } else if (await isValidFile(snippetName)) {
    return await promisesFs.readFile(snippetName, "utf-8");
  } else {
    const snippetPath = snippetExpandPath(snippetName);
    if (await isValidFile(snippetPath)) {
      return await promisesFs.readFile(snippetPath, "utf-8");
    }
    const snippetUrl = formatUrl(remoteSnippetUrl(snippetName));
    if (await remoteSnippetExists(snippetUrl)) {
      const response = await fetch(snippetUrl);
      return await response.text();
    }
    throw new SnippetNotFoundError(`${snippetName} not found`);
  }
};

const loadSnippetContentSync = (snippetName: string): string => {
  if (isValidUrl(snippetName)) {
    const snippetUrl = formatUrl(snippetName);
    if (remoteSnippetExistsSync(snippetUrl)) {
      return fetchSync(snippetUrl).text();
    }
    throw new SnippetNotFoundError(`${snippetName} not found`);
  } else if (isValidFileSync(snippetName)) {
    return fs.readFileSync(snippetName, "utf-8");
  } else {
    const snippetPath = snippetExpandPath(snippetName);
    if (isValidFileSync(snippetPath)) {
      return fs.readFileSync(snippetPath, "utf-8");
    }
    const snippetUrl = formatUrl(remoteSnippetUrl(snippetName));
    if (remoteSnippetExistsSync(snippetUrl)) {
      return fetchSync(snippetUrl).text();
    }
    throw new SnippetNotFoundError(`${snippetName} not found`);
  }
};

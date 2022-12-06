import { Node } from "acorn";
import fs, { promises as promisesFs } from "fs";
import path from "path";
import fetchSync from "sync-fetch";
import { URL } from "url";
import { SnippetNotFoundError } from "./errors";
import Rewriter from "./rewriter";

/**
 * Add `count` spaces to `str`.
 * @example
 * //   foo
 * //   bar
 * indent("foo\nbar", 2)
 * @param {string} str
 * @param {number} count
 * @returns indented str
 */
export const indent = (str: string, count: number): string => {
  return str
    .split("\n")
    .map((line) => {
      if (/^\s*$/.test(line)) {
        return line;
      }
      return " ".repeat(count) + line;
    })
    .join("\n");
};

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

/**
 * Eval the snippet by name.
 * @param {string} snippetName - snippet name, it can be a http url, file path or short snippet name.
 * @returns {Rewriter} a Rewriter object
 */
export const evalSnippetSync = (snippetName: string): Rewriter => {
  return eval(loadSnippetSync(snippetName));
};

export const evalSnippet = async (snippetName: string): Promise<Rewriter> => {
  return eval(await loadSnippet(snippetName));
};

/**
 * Load snippet by snippet name.
 * @param {string} snippetName - snippet name, it can be a http url, file path or short snippet name.
 * @returns {string} snippet helper content
 */
export const loadSnippetSync = (snippetName: string): string => {
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

export const loadSnippet = async (snippetName: string): Promise<string> => {
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

const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const isValidFileSync = (path: string): boolean => {
  try {
    const stats = fs.statSync(path);
    return stats.isFile();
  } catch {
    return false;
  }
};

export const isValidFile = async (path: string): Promise<boolean> => {
  try {
    const stats = await promisesFs.stat(path);
    return stats.isFile();
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

import { Node } from "acorn";
import fs from "fs";
import path from "path";
import fetch from "sync-fetch";
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
export const evalSnippet = (snippetName: string): Rewriter => {
  return eval(loadSnippet(snippetName));
};

/**
 * Load snippet by snippet name.
 * @param {string} snippetName - snippet name, it can be a http url, file path or short snippet name.
 * @returns {string} snippet helper content
 */
export const loadSnippet = (snippetName: string): string => {
  if (isValidUrl(snippetName)) {
    const remoteSnippetUrl = formatUrl(snippetName);
    if (remoteSnippetExists(remoteSnippetUrl)) {
      return fetch(remoteSnippetUrl).text();
    }
    throw new SnippetNotFoundError(`${snippetName} not found`);
  } else if (isValidFile(snippetName)) {
    const snippetPath = snippetExpandPath(snippetName);
    if (localSnippetExists(snippetPath)) {
      return fs.readFileSync(snippetPath, "utf-8");
    }
    throw new SnippetNotFoundError(`${snippetName} not found`);
  } else {
    const snippetPath = snippetExpandPath(snippetName);
    if (localSnippetExists(snippetPath)) {
      return fs.readFileSync(snippetPath, "utf-8");
    }
    const snippetUrl = remoteSnippetUrl(snippetName);
    if (remoteSnippetExists(snippetUrl)) {
      return fetch(snippetUrl).text();
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

const isValidFile = (path: string): boolean => {
  try {
    const stats = fs.statSync(path);
    return stats.isFile();
  } catch {
    return false;
  }
};

const formatUrl = (url: string): string => convertToGithubRawUrl(url);

const localSnippetExists = (snippetPath: string) => fs.existsSync(snippetPath);

const snippetExpandPath = (snippetName: string) => path.join(snippetsHome(), "lib", `${snippetName}.js`);

const remoteSnippetExists = (snippetPath: string) => fetch(snippetPath).status === 200;

const remoteSnippetUrl = (snippetName: string) => `https://github.com/xinminlabs/synvert-snippets-javascript/blob/main/lib/${snippetName}.js`

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

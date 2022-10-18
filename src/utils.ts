import { Node } from "acorn";
import fs from "fs";
import path from "path";
import fetch from "sync-fetch";
import { URL } from "url";
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
  if (isValidUrl(snippetName)) {
    return eval(fetch(formatUrl(snippetName)).text());
  } else if (isValidFile(snippetName)) {
    return eval(fs.readFileSync(snippetName, "utf-8"));
  } else {
    return eval(
      fs.readFileSync(
        path.join(snippetsHome(), "lib", `${snippetName}.js`),
        "utf-8"
      )
    );
  }
};

/**
 * Load snippet by helper name.
 * @param {string} snippetHelper - snippet helper name, it can be a http url, file path or short snippet name.
 * @returns {string} snippet helper content
 */
export const loadHelper = (snippetHelper: string): string => {
  if (isValidUrl(snippetHelper)) {
    return fetch(formatUrl(snippetHelper)).text();
  } else if (isValidFile(snippetHelper)) {
    return fs.readFileSync(snippetHelper, "utf-8");
  } else {
    return fs.readFileSync(
      path.join(snippetsHome(), "lib", `${snippetHelper}.js`),
      "utf-8"
    );
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

const formatUrl = (url: string): string => {
  return convertToGithubRawUrl(url);
};

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

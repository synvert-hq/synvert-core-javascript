import Rewriter from "./rewriter";
import Configuration from "./configuration";
import { evalSnippet } from "./utils";
import { SnippetNotFoundError } from "./errors";
import { Parser, Strategy } from "./types/options";
import type { TestResultExt } from "./types/result";

const ALL_FILES = "**/*.{js,jsx,ts,tsx}";
const ALL_JS_FILES = "**/*.{js,jsx}";
const ALL_TS_FILES = "**/*.{ts,tsx}";

const pjson = require("../package.json");
const version = pjson.version;

export {
  Rewriter,
  Configuration,
  ALL_FILES,
  ALL_JS_FILES,
  ALL_TS_FILES,
  version,
  evalSnippet,
  SnippetNotFoundError,
  Parser,
  Strategy,
  TestResultExt,
};

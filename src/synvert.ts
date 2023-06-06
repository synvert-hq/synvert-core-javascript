import Rewriter from "./rewriter";
import Helper from "./helper";
import Configuration from "./configuration";
import {
  evalSnippet,
  evalSnippetSync,
  rewriteSnippetToAsyncVersion,
  rewriteSnippetToSyncVersion,
} from "./utils";
import { SnippetNotFoundError } from "./errors";
import { Parser } from "./types/options";
import type { TestResultExt } from "./types/result";

const ALL_FILES = "**/*.{js,jsx,ts,tsx,html,html.erb}";
const ALL_JS_FILES = "**/*.{js,jsx}";
const ALL_TS_FILES = "**/*.{ts,tsx}";
const ALL_HTML_FILES = "**/*.html";
const ALL_RAILS_ERB_FILES = "**/*.html.erb";
const ALL_CSS_FILES = "**/*.css";
const ALL_LESS_FILES = "**/*.less";
const ALL_SASS_FILES = "**/*.sass";
const ALL_SCSS_FILES = "**/*.scss";

const pjson = require("../package.json");
const version = pjson.version;

export {
  Rewriter,
  Helper,
  Configuration,
  ALL_FILES,
  ALL_JS_FILES,
  ALL_TS_FILES,
  ALL_HTML_FILES,
  ALL_RAILS_ERB_FILES,
  ALL_CSS_FILES,
  ALL_LESS_FILES,
  ALL_SASS_FILES,
  ALL_SCSS_FILES,
  version,
  evalSnippet,
  evalSnippetSync,
  rewriteSnippetToAsyncVersion,
  rewriteSnippetToSyncVersion,
  SnippetNotFoundError,
  Parser,
  TestResultExt,
};

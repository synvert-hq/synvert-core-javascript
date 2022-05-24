import Rewriter from "./rewriter";
import Configuration from "./configuration";

const ALL_FILES = "**/*.{js,jsx}";

const pjson = require("../package.json");
const version = pjson.version;

export { Rewriter, Configuration, ALL_FILES, version };

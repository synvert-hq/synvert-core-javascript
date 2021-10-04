const Rewriter = require("./rewriter");
const Configuration = require("./configuration");

const ALL_FILES = "**/*.{js,jsx}";

const pjson = require("../package.json");
const version = pjson.version;

module.exports = { Rewriter, Configuration, ALL_FILES, version };

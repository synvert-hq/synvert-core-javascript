const Rewriter = require("./rewriter");
const Configuration = require("./configuration");

const pjson = require("../package.json");

const version = pjson.version;

module.exports = { Rewriter, Configuration, version };

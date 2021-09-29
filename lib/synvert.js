const pjson = require("../package.json");
const Rewriter = require("./rewriter");
const Configuration = require("./configuration");

const version = pjson.version;

module.exports = { Rewriter, Configuration, version };

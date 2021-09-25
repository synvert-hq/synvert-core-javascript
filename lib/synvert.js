const Rewriter = require("./rewriter");
const Configuration = require("./configuration");

const package = require('../package.json');
const version = package.version;

module.exports = { Rewriter, Configuration, version };

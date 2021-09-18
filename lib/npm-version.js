const fs = require("fs");
const path = require("path");
const { buildDepTreeFromFiles } = require("snyk-nodejs-lockfile-parser");
const compareVersions = require('compare-versions');

const Configuration = require("./configuration");

/**
 * NpmVersion checks and compares npm version.
 */
class NpmVersion {
  /**
   * @constructor NpmVersion
   *
   * @param {string} name - npm name
   * @param {string} version - npm version, e.g. ">= 1.0.0"
   */
  constructor(name, version) {
    this.name = name;
    this.version = version;
  }

  /**
   * Check if the specified npm version in package-lock.json or yarn.lock matches npm version comparator.
   *
   * @returns {boolean} true if matches, otherwise false.
   */
  async match() {
    let lockFile;
    if (fs.existsSync(path.join(Configuration.path, "package-lock.json"))) {
      lockFile = "package-lock.json";
    }
    if (fs.existsSync(path.join(Configuration.path, "yarn.lock"))) {
      lockFile = "yarn.lock";
    }
    if (!lockFile) {
      return true;
    }
    const result = await buildDepTreeFromFiles(Configuration.path, "package.json", lockFile);
    const [operator, version] = this.version.split(" ");
    return compareVersions.compare(result.dependencies[this.name].version, version, operator);
  }
}

module.exports = NpmVersion;
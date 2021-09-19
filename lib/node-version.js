const fs = require("fs");
const path = require("path");
const compareVersions = require("compare-versions");

const Configuration = require("./configuration");

/**
 * NodeVersion checks and compares node version.
 */
class NodeVersion {
  /**
   * @constructor NodeVersion
   *
   * @param {string} version  - node version
   */
  constructor(version) {
    this.version = version;
  }

  /**
   * Check if the specified node version matches current node version.
   * @returns
   */
  match() {
    let versionFile;
    if (fs.existsSync(path.join(Configuration.path, ".node-version"))) {
      versionFile = ".node-version";
    } else if (fs.existsSync(path.join(Configuration.path, ".nvmrc"))) {
      versionFile = ".nvmrc";
    }
    if (!versionFile) {
      return true;
    }
    const version = fs.readFileSync(path.join(Configuration.path, versionFile), "utf-8");
    return compareVersions.compare(version, this.version, ">=");
  }
}

module.exports = NodeVersion;

const fs = require("fs");
const path = require("path");
const { buildDepTreeFromFiles } = require("snyk-nodejs-lockfile-parser");
const compareVersions = require('compare-versions');

const Configuration = require("./configuration");

class NpmVersion {
  constructor(name, version) {
    this.name = name;
    this.version = version;
  }

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
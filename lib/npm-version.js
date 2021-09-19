const fs = require("fs");
const path = require("path");
const lockfile = require("@yarnpkg/lockfile");
const compareVersions = require("compare-versions");

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
  match() {
    if (!this._packageExist()) {
      return true;
    }
    const [operator, version] = this.version.split(" ");
    if (this._packageLockExist()) {
      const packageLockTree = this._packageLockTree();
      const packageVersion = (packageLockTree.packages || packageLockTree.dependencies)[`node_modules/${this.name}`]
        .version;
      return compareVersions.compare(packageVersion, version, operator);
    }
    if (this._yarnLockExist()) {
      const packageTree = this._packageTree();
      const yarnLockTree = this._yarnLockTree();
      const packageVersion = yarnLockTree[`${this.name}@${packageTree.dependencies[this.name]}`];
      return compareVersions.compare(packageVersion, version, operator);
    }

    return true;
  }

  _packageTree() {
    return JSON.parse(fs.readFileSync(this._packagePath()));
  }

  _packageExist() {
    return fs.existsSync(this._packagePath());
  }

  _packagePath() {
    return path.join(Configuration.path, "package.json");
  }

  _packageLockTree() {
    return JSON.parse(fs.readFileSync(this._packageLockPath(), "utf-8"));
  }

  _packageLockExist() {
    return fs.existsSync(this._packageLockPath());
  }

  _packageLockPath() {
    return path.join(Configuration.path, "package-lock.json");
  }

  _yarnLockTree() {
    return lockfile.parse(fs.readFileSync(this._yarnLockPath(), "utf-8"));
  }

  _yarnLockExist() {
    return fs.existsSync(this._yarnLockPath());
  }

  _yarnLockPath() {
    return path.join(Configuration.path, "yarn.lock");
  }
}

module.exports = NpmVersion;

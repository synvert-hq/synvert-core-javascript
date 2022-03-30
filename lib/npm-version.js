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
   * Create a NpmVersion
   * @param {string} name - npm name
   * @param {string} version - npm version, e.g. ">= 1.0.0"
   */
  constructor(name, version) {
    this.name = name;
    this.version = version;
  }

  /**
   * Check if the specified npm version in package-lock.json or yarn.lock matches npm version comparator.
   * @returns {boolean} true if matches, otherwise false.
   */
  match() {
    if (!this._packageExist()) {
      return true;
    }
    const [operator, version] = this.version.split(" ");
    if (this._packageLockExist()) {
      const packageVersion = this._npmPackageVersion();
      return compareVersions.compare(packageVersion, version, operator);
    }
    if (this._yarnLockExist()) {
      const packageVersion = this._yarnPackageVersion();
      return compareVersions.compare(packageVersion, version, operator);
    }

    return true;
  }

  /**
   * Get npm package version.
   * @private
   * @returns {string}
   */
  _npmPackageVersion() {
    const packageLockTree = this._packageLockTree();
    if (packageLockTree.packages) {
      return packageLockTree.packages[`node_modules/${this.name}`].version;
    } else {
      return packageLockTree.dependencies[this.name].version;
    }
  }

  /**
   * Get yarn package version.
   * @private
   * @returns {string}
   */
  _yarnPackageVersion() {
    const packageTree = this._packageTree();
    const yarnLockTree = this._yarnLockTree();
    return yarnLockTree[`${this.name}@${packageTree.dependencies[this.name]}`];
  }

  /**
   * Get parse result of package.json.
   * @private
   */
  _packageTree() {
    return JSON.parse(fs.readFileSync(this._packagePath()));
  }

  /**
   * Check if package.json exists
   * @private
   * @returns {boolean}
   */
  _packageExist() {
    return fs.existsSync(this._packagePath());
  }

  /**
   * Get package.json path.
   * @private
   * @returns {string}
   */
  _packagePath() {
    return path.join(Configuration.path, "package.json");
  }

  /**
   * Get parse result of package-lock.json.
   * @private
   */
  _packageLockTree() {
    return JSON.parse(fs.readFileSync(this._packageLockPath(), "utf-8"));
  }

  /**
   * Check if package-lock.json exists.
   * @private
   * @returns {boolean}
   */
  _packageLockExist() {
    return fs.existsSync(this._packageLockPath());
  }

  /**
   * Get package-lock.json path.
   * @private
   * @returns {string}
   */
  _packageLockPath() {
    return path.join(Configuration.path, "package-lock.json");
  }

  /**
   * Get parse result of yarn.lock.
   * @private
   */
  _yarnLockTree() {
    return lockfile.parse(fs.readFileSync(this._yarnLockPath(), "utf-8"));
  }

  /**
   * Check if yarn.lock exists.
   * @private
   * @returns {boolean}
   */
  _yarnLockExist() {
    return fs.existsSync(this._yarnLockPath());
  }

  /**
   * Get yarn.lock path.
   * @private
   * @returns {string}
   */
  _yarnLockPath() {
    return path.join(Configuration.path, "yarn.lock");
  }
}

module.exports = NpmVersion;

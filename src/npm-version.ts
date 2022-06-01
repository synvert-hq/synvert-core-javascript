import fs from "fs";
import path from "path";
import lockfile from "@yarnpkg/lockfile";
import compareVersions from "compare-versions";

import Configuration from "./configuration";

/**
 * NpmVersion checks and compares npm version.
 */
class NpmVersion {
  /**
   * Create a NpmVersion
   * @param {string} name - npm name
   * @param {string} version - npm version, e.g. ">= 1.0.0"
   */
  constructor(public name: string, public version: string) {}

  /**
   * Check if the specified npm version in package-lock.json or yarn.lock matches npm version comparator.
   * @returns {boolean} true if matches, otherwise false.
   */
  match(): boolean {
    if (!this.packageExist()) {
      return true;
    }
    const [operator, version] = this.version.split(" ");
    if (this.packageLockExist()) {
      const packageVersion = this.npmPackageVersion();
      return compareVersions.compare(
        packageVersion,
        version,
        operator as compareVersions.CompareOperator
      );
    }
    if (this.yarnLockExist()) {
      const packageVersion = this.yarnPackageVersion();
      return compareVersions.compare(
        packageVersion,
        version,
        operator as compareVersions.CompareOperator
      );
    }

    return true;
  }

  /**
   * Get npm package version.
   * @private
   * @returns {string}
   */
  private npmPackageVersion(): string {
    const packageLockTree = this.packageLockTree();
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
  private yarnPackageVersion(): string {
    const packageTree = this.packageTree();
    const yarnLockTree = this.yarnLockTree();
    return yarnLockTree[`${this.name}@${packageTree.dependencies[this.name]}`];
  }

  /**
   * Get parse result of package.json.
   * @private
   */
  private packageTree(): any {
    return JSON.parse(fs.readFileSync(this.packagePath(), "utf-8"));
  }

  /**
   * Check if package.json exists
   * @private
   * @returns {boolean}
   */
  private packageExist(): boolean {
    return fs.existsSync(this.packagePath());
  }

  /**
   * Get package.json path.
   * @private
   * @returns {string}
   */
  private packagePath(): string {
    return path.join(Configuration.path, "package.json");
  }

  /**
   * Get parse result of package-lock.json.
   * @private
   */
  private packageLockTree(): any {
    return JSON.parse(fs.readFileSync(this.packageLockPath(), "utf-8"));
  }

  /**
   * Check if package-lock.json exists.
   * @private
   * @returns {boolean}
   */
  private packageLockExist(): boolean {
    return fs.existsSync(this.packageLockPath());
  }

  /**
   * Get package-lock.json path.
   * @private
   * @returns {string}
   */
  private packageLockPath(): string {
    return path.join(Configuration.path, "package-lock.json");
  }

  /**
   * Get parse result of yarn.lock.
   * @private
   */
  private yarnLockTree(): any {
    return lockfile.parse(fs.readFileSync(this.yarnLockPath(), "utf-8"));
  }

  /**
   * Check if yarn.lock exists.
   * @private
   * @returns {boolean}
   */
  private yarnLockExist(): boolean {
    return fs.existsSync(this.yarnLockPath());
  }

  /**
   * Get yarn.lock path.
   * @private
   * @returns {string}
   */
  private yarnLockPath(): string {
    return path.join(Configuration.path, "yarn.lock");
  }
}

export default NpmVersion;

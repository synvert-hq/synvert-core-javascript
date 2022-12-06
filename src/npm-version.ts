import fs, { promises as promisesFs } from "fs";
import path from "path";
import lockfile from "@yarnpkg/lockfile";
import compareVersions from "compare-versions";

import Configuration from "./configuration";
import { isValidFile, isValidFileSync } from "./utils";

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
   * Sync to check if the specified npm version in package-lock.json or
   * yarn.lock matches npm version comparator.
   * @returns {boolean} true if matches, otherwise false.
   */
  matchSync(): boolean {
    if (!this.packageExistSync()) {
      return true;
    }
    const [operator, version] = this.version.split(" ");
    if (this.packageLockExistSync()) {
      const packageVersion = this.npmPackageVersionSync();
      return compareVersions.compare(
        packageVersion,
        version,
        operator as compareVersions.CompareOperator
      );
    }
    if (this.yarnLockExistSync()) {
      const packageVersion = this.yarnPackageVersionSync();
      return compareVersions.compare(
        packageVersion,
        version,
        operator as compareVersions.CompareOperator
      );
    }

    return true;
  }

  /**
   * Async to check if the specified npm version in package-lock.json or
   * yarn.lock matches npm version comparator.
   * @async
   * @returns {Promise<boolean>} true if matches, otherwise false.
   */
  async match(): Promise<boolean> {
    if (!(await this.packageExist())) {
      return true;
    }
    const [operator, version] = this.version.split(" ");
    if (await this.packageLockExist()) {
      const packageVersion = await this.npmPackageVersion();
      return compareVersions.compare(
        packageVersion,
        version,
        operator as compareVersions.CompareOperator
      );
    }
    if (await this.yarnLockExist()) {
      const packageVersion = await this.yarnPackageVersion();
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
  private npmPackageVersionSync(): string {
    const packageLockTree = this.packageLockTreeSync();
    if (packageLockTree.packages) {
      return packageLockTree.packages[`node_modules/${this.name}`].version;
    } else {
      return packageLockTree.dependencies[this.name].version;
    }
  }

  private async npmPackageVersion(): Promise<string> {
    const packageLockTree = await this.packageLockTree();
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
  private yarnPackageVersionSync(): string {
    const packageTree = this.packageTreeSync();
    const yarnLockTree = this.yarnLockTreeSync();
    return yarnLockTree[`${this.name}@${packageTree.dependencies[this.name]}`];
  }

  private async yarnPackageVersion(): Promise<string> {
    const packageTree = await this.packageTree();
    const yarnLockTree = await this.yarnLockTree();
    return yarnLockTree[`${this.name}@${packageTree.dependencies[this.name]}`];
  }

  /**
   * Get parse result of package.json.
   * @private
   */
  private packageTreeSync(): any {
    return JSON.parse(fs.readFileSync(this.packagePath(), "utf-8"));
  }

  private async packageTree(): Promise<any> {
    const content = await fs.readFileSync(this.packagePath(), "utf-8");
    return JSON.parse(content);
  }

  /**
   * Check if package.json exists
   * @private
   * @returns {boolean}
   */
  private packageExistSync(): boolean {
    return isValidFileSync(this.packagePath());
  }

  private async packageExist(): Promise<boolean> {
    return isValidFile(this.packagePath());
  }

  /**
   * Get package.json path.
   * @private
   * @returns {string}
   */
  private packagePath(): string {
    return path.join(Configuration.rootPath, "package.json");
  }

  /**
   * Get parse result of package-lock.json.
   * @private
   */
  private packageLockTreeSync(): any {
    return JSON.parse(fs.readFileSync(this.packageLockPath(), "utf-8"));
  }

  private async packageLockTree(): Promise<any> {
    const content = await promisesFs.readFile(this.packageLockPath(), "utf-8");
    return JSON.parse(content);
  }

  /**
   * Check if package-lock.json exists.
   * @private
   * @returns {boolean}
   */
  private packageLockExistSync(): boolean {
    return isValidFileSync(this.packageLockPath());
  }

  private async packageLockExist(): Promise<boolean> {
    return await isValidFile(this.packageLockPath());
  }

  /**
   * Get package-lock.json path.
   * @private
   * @returns {string}
   */
  private packageLockPath(): string {
    return path.join(Configuration.rootPath, "package-lock.json");
  }

  /**
   * Get parse result of yarn.lock.
   * @private
   */
  private yarnLockTreeSync(): any {
    return lockfile.parse(fs.readFileSync(this.yarnLockPath(), "utf-8"));
  }

  private async yarnLockTree(): Promise<any> {
    const content = await promisesFs.readFile(this.yarnLockPath(), "utf-8");
    return lockfile.parse(content);
  }

  /**
   * Check if yarn.lock exists.
   * @private
   * @returns {boolean}
   */
  private yarnLockExistSync(): boolean {
    return isValidFileSync(this.yarnLockPath());
  }

  private async yarnLockExist(): Promise<boolean> {
    return await isValidFile(this.yarnLockPath());
  }

  /**
   * Get yarn.lock path.
   * @private
   * @returns {string}
   */
  private yarnLockPath(): string {
    return path.join(Configuration.rootPath, "yarn.lock");
  }
}

export default NpmVersion;

import fs, { promises as promisesFs } from "fs";
import path from "path";
import compareVersions from "compare-versions";

import Configuration from "./configuration";
import { isValidFile, isValidFileSync } from "./utils";

/**
 * NodeVersion checks and compares node version.
 */
class NodeVersion {
  /**
   * Create a NodeVersion
   * @param {string} version  - node version, e.g. '14.0'
   */
  constructor(public version: string) {}

  /**
   * Sync to check if the specified node version matches current node version.
   * @returns {boolean} true if matches
   */
  matchSync(): boolean {
    if (!Configuration.strict) {
      return true;
    }
    let version;
    if (isValidFileSync(path.join(Configuration.rootPath, ".node-version"))) {
      version = fs.readFileSync(
        path.join(Configuration.rootPath, ".node-version"),
        "utf-8",
      );
    } else if (isValidFileSync(path.join(Configuration.rootPath, ".nvmrc"))) {
      version = fs.readFileSync(
        path.join(Configuration.rootPath, ".nvmrc"),
        "utf-8",
      );
    } else if (isValidFileSync(path.join(Configuration.rootPath, "package.json"))) {
      const packageFileContent = fs.readFileSync(
        path.join(Configuration.rootPath, "package.json"),
        "utf-8",
      );
      const packageJson = JSON.parse(packageFileContent)
      if (packageJson.engines && packageJson.engines.node) {
        version = packageJson.engines.node.replace(/[^0-9.]/g, '');
      }
    }
    if (!version) {
      return true;
    }
    return compareVersions.compare(version, this.version, ">=");
  }

  /**
   * Async to check if the specified node version matches current node version.
   * @async
   * @returns {boolean} true if matches
   */
  async match(): Promise<boolean> {
    if (!Configuration.strict) {
      return true;
    }
    let version;
    if (await isValidFile(path.join(Configuration.rootPath, ".node-version"))) {
      version = await promisesFs.readFile(
        path.join(Configuration.rootPath, ".node-version"),
        "utf-8",
      );
    } else if (await isValidFile(path.join(Configuration.rootPath, ".nvmrc"))) {
      version = await promisesFs.readFile(
        path.join(Configuration.rootPath, ".nvmrc"),
        "utf-8",
      );
    } else if (await isValidFile(path.join(Configuration.rootPath, "package.json"))) {
      const packageFileContent = await promisesFs.readFile(
        path.join(Configuration.rootPath, "package.json"),
        "utf-8",
      );
      const packageJson = JSON.parse(packageFileContent)
      if (packageJson.engines && packageJson.engines.node) {
        version = packageJson.engines.node.replace(/[^0-9.]/g, '');
      }
    }
    if (!version) {
      return true;
    }
    return compareVersions.compare(version, this.version, ">=");
  }
}

export default NodeVersion;

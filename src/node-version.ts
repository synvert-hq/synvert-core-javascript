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
    let versionFile;
    if (isValidFileSync(path.join(Configuration.rootPath, ".node-version"))) {
      versionFile = ".node-version";
    } else if (isValidFileSync(path.join(Configuration.rootPath, ".nvmrc"))) {
      versionFile = ".nvmrc";
    }
    if (!versionFile) {
      return true;
    }
    const version = fs.readFileSync(
      path.join(Configuration.rootPath, versionFile),
      "utf-8",
    );
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
    let versionFile;
    if (await isValidFile(path.join(Configuration.rootPath, ".node-version"))) {
      versionFile = ".node-version";
    } else if (await isValidFile(path.join(Configuration.rootPath, ".nvmrc"))) {
      versionFile = ".nvmrc";
    }
    if (!versionFile) {
      return true;
    }
    const version = await promisesFs.readFile(
      path.join(Configuration.rootPath, versionFile),
      "utf-8",
    );
    return compareVersions.compare(version, this.version, ">=");
  }
}

export default NodeVersion;

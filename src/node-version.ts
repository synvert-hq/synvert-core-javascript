import fs from "fs";
import path from "path";
import compareVersions from "compare-versions";

import Configuration from "./configuration";

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
   * Check if the specified node version matches current node version.
   * @returns {boolean} true if matches
   */
  match(): boolean {
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

export default NodeVersion;

/**
 * Synvert global configuration.
 */
class Configuration {
  /**
   * Set skip files.
   * @static
   * @example
   * Configuration.skipFiles = ["node_modules/**"]
   * @param {string[]} files - files to be skipped
   */
  static set skipFiles(files) {
    this._skipFiles = files;
  }

  /**
   * Get skip files.
   * @static
   * @returns {string[]}
   */
  static get skipFiles() {
    return this._skipFiles || ["node_modules/**"];
  }

  /**
   * Set path.
   * @static
   * @example
   * Configuration.path = "/Users/flyerhzm/Downloads"
   * @param {string} path
   */
  static set path(path) {
    this._path = path;
  }

  /**
   * Get path.
   * @static
   * @returns {string}
   */
  static get path() {
    return this._path || ".";
  }

  /**
   * Set showRunProcess.
   * @static
   * @example
   * Configuration.showRunProcess = true
   * @param {boolean} show
   */
  static set showRunProcess(show) {
    this._showRunProcess = show;
  }

  /**
   * Get showRunProcess.
   * @static
   * @returns {boolean}
   */
  static get showRunProcess() {
    return this._showRunProcess || false;
  }

  /**
   * Set enableEcmaFeaturesJsx
   * @static
   * @example
   * Configuration.enableEcmaFeaturesJsx = true
   * @param {boolean} jsx
   */
  static set enableEcmaFeaturesJsx(jsx) {
    this._enableEcmaFeaturesJsx = jsx;
  }

  /**
   * Get enableEcmaFeaturesJsx
   * @static
   * @returns {boolean}
   */
  static get enableEcmaFeaturesJsx() {
    return this._enableEcmaFeaturesJsx || false;
  }
}

module.exports = Configuration;

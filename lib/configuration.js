/**
 * Synvert global configuration.
 */
class Configuration {
  static set skipFiles(files) {
    this._skipFiles = files;
  }

  static get skipFiles() {
    return this._skipFiles || ["node_modules/**"];
  }

  static set path(path) {
    this._path = path;
  }

  static get path() {
    return this._path || ".";
  }

  static set showRunProcess(show) {
    this._showRunProcess = show;
  }

  static get showRunProcess() {
    return this._showRunProcess || false;
  }
}

module.exports = Configuration;

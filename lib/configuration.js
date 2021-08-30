/**
 * Synvert global configuration.
 */
class Configuration {
  static set skipFiles(files) {
    this._skipFiles = files
  }

  static get skipFiles() {
    return this._skipFiles || []
  }

  static set path(path) {
    this._path = path
  }

  static get path() {
    return this._path || '.'
  }
}

module.exports = Configuration

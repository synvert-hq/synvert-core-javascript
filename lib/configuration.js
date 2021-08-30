/**
 * Synvert global configuration.
 */
const Configuration = {
  set skipFiles(files) {
    this._skipFiles = files;
  },

  get skipFiles() {
    return this._skipFiles || ["node_modules/**"];
  },

  set path(path) {
    this._path = path;
  },

  get path() {
    return this._path || ".";
  },
};

module.exports = Configuration;

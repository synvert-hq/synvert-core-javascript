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

  set showRunProcess(show) {
    this._showRunProcess = show;
  },

  get showRunProcess() {
    return this._showRunProcess || false;
  },

  set enableEcmaFeaturesJsx(jsx) {
    this._enableEcmaFeaturesJsx = jsx;
  },

  get enableEcmaFeaturesJsx() {
    return this._enableEcmaFeaturesJsx || false;
  },
};

module.exports = Configuration;

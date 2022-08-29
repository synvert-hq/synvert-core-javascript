/**
 * Synvert global configuration.
 */
class Configuration {
  static onlyFiles: string[] = [];
  static skipFiles: string[] = ["**/node_modules/**"];
  static path: string = ".";
  static showRunProcess: boolean = false;
  static enableEcmaFeaturesJsx: boolean = false;
}

export default Configuration;

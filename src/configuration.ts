/**
 * Synvert global configuration.
 */
class Configuration {
  static onlyPaths: string[] = [];
  static skipPaths: string[] = ["**/node_modules/**"];
  static rootPath: string = ".";
  static showRunProcess: boolean = false;
  static enableEcmaFeaturesJsx: boolean = false;
}

export default Configuration;
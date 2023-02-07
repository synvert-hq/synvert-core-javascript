/**
 * Synvert global configuration.
 */
class Configuration {
  static onlyPaths: string[] = [];
  static skipPaths: string[] = ["**/node_modules/**"];
  static rootPath: string = ".";
  static showRunProcess: boolean = false;
  static maxFileSize: number = 10 * 1024; // 10K
  static singleQuote = false;
  static semi = true;
}

export default Configuration;

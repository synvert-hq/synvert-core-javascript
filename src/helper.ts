import Instance from "./instance";

/**
 * Helper is used to defined shared snippet.
 */
class Helper<T> {
  /**
   * Store all helpers grouped by name.
   * @static
   */
  static helpers: { [name: string]: Helper<any> } = {};

  /**
   * Register a helper with its name.
   * @static
   * @param {string} name - the unique helper name.
   * @param {Helper} helper - the helper to register.
   */
  static register(name: string, helper: Helper<any>) {
    this.helpers[name] = helper;
  }

  /**
   * Fetch a helper by name.
   * @static
   * @param {string} name helper name.
   * @returns {Helper} the matching helper.
   */
  static fetch(name: string): Helper<any> | undefined {
    if (this.helpers[name]) {
      return this.helpers[name];
    }
  }

  /**
   * Clear all registered helpers.
   */
  static clear(): void {
    this.helpers = {};
  }

  /**
   * Create a Helper
   * @param {string} name - helper name
   * @param {Object} options - options can be anything it needs to be passed to the helper
   * @param {Function} func - a function defines the behaviors of the helper
   */
  constructor(
    public name: string,
    public func: (options: any, func?: (instance: Instance<T>) => void) => void,
  ) {
    Helper.register(name, this);
  }
}

export default Helper;

/**
 * Helper is used to defined shared snippet.
 */
class Helper {
  /**
   * Store all helpers grouped by name.
   * @static
   */
  static helpers: { [name: string]: Helper } = {};

  /**
   * Register a helper with its name.
   * @static
   * @param {string} name - the unique helper name.
   * @param {Helper} helper - the helper to register.
   */
  static register(name: string, helper: Helper) {
    this.helpers[name] = helper;
  }

  /**
   * Fetch a helper by name.
   * @static
   * @param {string} name helper name.
   * @returns {Helper} the matching helper.
   */
  static fetch(name: string): Helper | undefined {
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
   * @param {Function} func - a function defines the behaviors of the helper
   */
  constructor(
    public name: string,
    public func: (options: any) => void
  ) {
    Helper.register(name, this);
  }
}

export default Helper;

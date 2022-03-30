/**
 * RewriterNotFoundError is thrown when trying to fetch a non existent Rewriter.
 * @extends Error
 */
class RewriterNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "RewriterNotFoundError";
  }
}

/**
 * NotSupportedError is thrown when calling a not supported method on AST node.
 * @extends Error
 */
class NotSupportedError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotSupportedError";
  }
}

module.exports = { RewriterNotFoundError, NotSupportedError };

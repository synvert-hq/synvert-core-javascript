class RewriterNotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = "RewriterNotFoundError"
  }
}

class NotSupportedError extends Error {
  constructor(message) {
    super(message)
    this.name = "NotSupportedError"
  }
}

module.exports = { RewriterNotFoundError, NotSupportedError }

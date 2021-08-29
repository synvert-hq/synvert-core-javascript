class RewriterNotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = "RewriterNotFoundError"
  }
}

module.exports = { RewriterNotFoundError }

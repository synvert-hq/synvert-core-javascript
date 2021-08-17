class Instance {
  constructor(rewriter, file_pattern, func) {

  }

  get currentNode() {
    return this.current;
  }

  set currentNode(node) {
    this.current = node;
  }

  processWithNode(node, func) {
    this.currentNode = node;
    func.call();
    this.currentNode = node;
  }
}

module.exports = Instance;
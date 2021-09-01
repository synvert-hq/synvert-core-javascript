/**
 * Action defines rewriter action, add, replace or remove code.
 */
class Action {
  /**
   * @constructors Action
   * @param {Instance} instance
   * @param {string} code - new code to add, replace or remove
   */
  constructor(instance, code) {
    this.instance = instance;
    this.code = code;
    this.node = this.instance.currentNode;
  }

  /**
   *  The rewritten source code.
   *
   * @returns {string} rewritten source code.
   */
  rewrittenSource() {
    return this.node.rewrittenSource(this.code);
  }
}

/**
 * AppendAction to append code to the bottom of node body.
 */
class AppendAction extends Action {
  /**
   * Begin position to append code.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    return this.node.end - this.node.column() - '}'.length;
  }

  /**
   * End position, always same to begin position.
   *
   * @returns {number} end position.
   */
  endPos() {
    return this.beginPos();
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  rewrittenCode() {
    const source = this.rewrittenSource();
    const indent = " ".repeat(this.node.column() + 2);
    if (source.split("\n").length > 1) {
      return source.split("\n").map(line => indent + line).join("\n") + "\n";
    } else {
      return indent + source + "\n";
    }
  }
}

/**
 * InsertAction to add code to the node.
 */
class InsertAction extends Action {
  /**
   * @constructors InsertAction
   * @param {Instance} instance
   * @param {string} code - new code to be inserted
   * @param {Object} options - position to insert code
   */
  constructor(instance, code, options) {
    super(instance, code);
    this.at = options.at;
  }

  /**
   * Begin position to insert code.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    if (this.at === "beginning") {
      return this.node.start;
    } else {
      return this.node.end;
    }
  }

  /**
   * End position, always same to begin position.
   *
   * @returns {number} end position.
   */
  endPos() {
    return this.beginPos();
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  rewrittenCode() {
    return this.rewrittenSource();
  }
}

/**
 * DeleteAction to delete code.
 */
class DeleteAction extends Action {
  /**
   * @constructors DeleteAction
   * @param {Instance} instance
   * @param {string|array} selectors - name of child nodes
   */
  constructor(instance, selectors) {
    super(instance, null);
    this.selectors = Array.isArray(selectors) ? selectors : Array(selectors);
  }

  /**
   * Begin position of code to delete.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    return Math.min(...this.selectors.map((selector) => this.node.childNodeRange(selector).start));
  }

  /**
   * End position of code to delete.
   *
   * @returns {number} end position.
   */
  endPos() {
    return Math.max(...this.selectors.map((selector) => this.node.childNodeRange(selector).end));
  }

  /**
   * The rewritten code, always empty string.
   */
  rewrittenCode() {
    return "";
  }
}

/**
 * ReplaceAction to replace child node with code.
 */
class ReplaceAction extends Action {
  /**
   * @constructors ReplaceAction
   * @param {Instance} instance
   * @param {string|array} selectors- name of child nodes
   * @param {string} code - new code to be replaced
   */
  constructor(instance, selectors, options) {
    super(instance, options.with);
    this.selectors = Array.isArray(selectors) ? selectors : Array(selectors);
  }

  /**
   * Begin position of code to replace.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    return Math.min(...this.selectors.map((selector) => this.node.childNodeRange(selector).start));
  }

  /**
   * End position of code to replace.
   *
   * @returns {number} end position.
   */
  endPos() {
    return Math.max(...this.selectors.map((selector) => this.node.childNodeRange(selector).end));
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  rewrittenCode() {
    return this.rewrittenSource();
  }
}

/**
 * ReplaceWithAction to replace code.
 */
class ReplaceWithAction extends Action {
  /**
   * Begin position of code to replace.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    return this.node.start;
  }

  /**
   * End position of code to replace.
   *
   * @returns {number} end position.
   */
  endPos() {
    return this.node.end;
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  rewrittenCode() {
    if (this.rewrittenSource().includes("\n")) {
      const newCode = [];
      this.rewrittenSource()
        .split("\n")
        .forEach((line, index) => {
          if (index === 0) {
            newCode.push(line);
          } else {
            newCode.push(" ".repeat(this.node.column()) + line);
          }
        });
      return newCode.join("\n");
    } else {
      return this.rewrittenSource();
    }
  }
}

module.exports = { Action, AppendAction, InsertAction, DeleteAction, ReplaceAction, ReplaceWithAction };

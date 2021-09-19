const fs = require("fs");

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

  _source() {
    if (this._sourceCode) return this._sourceCode;
    this._sourceCode = fs.readFileSync(this.node.loc.source, "utf-8");
    return this._sourceCode;
  }

  _squeezeSpaces(beginPos, endPos) {
    const beforeCharIsSpace = this._source()[beginPos - 1] === " "
    const afterCharIsSpace = this._source()[endPos] == " "
    if (beforeCharIsSpace && afterCharIsSpace) {
      return beginPos - 1;
    } else {
      return beginPos;
    }
  }

  _squeezeLines(endPos, beginLine, endLine) {
    const lines = this._source().split("\n");
    const beforeLineIsBlank = endLine === 1 || lines[beginLine - 2] === "";
    const afterLineIsBlank = lines[endLine] === "";
    if (beforeLineIsBlank && afterLineIsBlank) {
      return endPos + "\n".length;
    }
    return endPos;
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
    return this.node.end - this.node.indent() - "}".length;
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
    const indent = this.node.type == "Program" ? "" : " ".repeat(this.node.indent() + 2);
    if (source.split("\n").length > 1) {
      return (
        source
          .split("\n")
          .map((line) => indent + line)
          .join("\n") + "\n"
      );
    } else {
      return indent + source + "\n";
    }
  }
}

/**
 * PrependAction to prepend code to the top of node body.
 */
class PrependAction extends Action {
  /**
   * Begin position to prepend code.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    return this.node.body.start + "{\n".length;
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
    const indent = this.node.type == "Program" ? "" : " ".repeat(this.node.indent() + 2);
    if (source.split("\n").length > 1) {
      return (
        source
          .split("\n")
          .map((line) => indent + line)
          .join("\n") + "\n"
      );
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
 * DeleteAction to delete child node.
 */
class DeleteAction extends Action {
  /**
   * @constructors DeleteAction
   * @param {Instance} instance
   * @param {string|array} selectors - name of child nodes
   */
  constructor(instance, selectors) {
    super(instance, null);
    this.selectors = Array.isArray(selectors) ? selectors : new Array(selectors);
  }

  /**
   * Begin position of code to delete.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    const pos = Math.min(...this.selectors.map((selector) => this.node.childNodeRange(selector).start));
    return this._squeezeSpaces(pos, this.endPos());
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
 * RemoveAction to remove current node.
 */
class RemoveAction extends Action {
  /**
   * @constructors RemoveAction
   * @param {Instance} instance
   */
  constructor(instance) {
    super(instance, null);
  }

  /**
   * Begin position of code to remove.
   *
   * @returns {number} begin position.
   */
  beginPos() {
    if (this._takeWholeLine()) {
      return (
        this._source()
          .split("\n")
          .slice(0, this.node.loc.start.line - 1)
          .join("\n").length + (this.node.loc.start.line === 1 ? 0 : "\n".length)
      );
    } else {
      const pos = this.node.start;
      return this._squeezeSpaces(pos, this.endPos());
    }
  }

  /**
   * End position of code to remove.
   *
   * @returns {number} end position.
   */
  endPos() {
    if (this._takeWholeLine()) {
      const lines = this._source().split("\n");
      const beginLine = this.node.loc.start.line;
      const endLine = this.node.loc.end.line;
      let pos = lines.slice(0, endLine).join("\n").length;
      if (endLine > 1) {
        pos = pos + "\n".length;
      }
      return this._squeezeLines(pos, beginLine, endLine);
    } else {
      return this.node.end;
    }
  }

  /**
   * The rewritten code, always empty string.
   */
  rewrittenCode() {
    return "";
  }

  _takeWholeLine() {
    const sourceFromFile = this._source()
      .split("\n")
      .slice(this.node.loc.start.line - 1, this.node.loc.end.line)
      .join("\n")
      .trim();
    return this.node.toSource() === sourceFromFile || this.node.toSource() + ";" === sourceFromFile;
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
    this.selectors = Array.isArray(selectors) ? selectors : new Array(selectors);
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
            newCode.push(" ".repeat(this.node.indent()) + line);
          }
        });
      return newCode.join("\n");
    } else {
      return this.rewrittenSource();
    }
  }
}

module.exports = {
  Action,
  AppendAction,
  PrependAction,
  InsertAction,
  DeleteAction,
  RemoveAction,
  ReplaceAction,
  ReplaceWithAction,
};

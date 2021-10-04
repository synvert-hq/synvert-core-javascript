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
   * Calculate begin pos and end pos.
   *
   * @returns {Action} this
   */
  process() {
    this._calculatePositions();
    return this;
  }

  /**
   * Begin position.
   *
   * @returns {number} begin position.
   */
  get beginPos() {
    return this._beginPos;
  }

  /**
   * End position.
   *
   * @returns {number} end position.
   */
  get endPos() {
    return this._endPos;
  }

  /**
   *  The rewritten source code.
   *
   * @returns {string} rewritten source code.
   */
  _rewrittenSource() {
    return this.node.rewrittenSource(this.code);
  }

  _source() {
    if (this._sourceCode) return this._sourceCode;
    this._sourceCode = fs.readFileSync(this.node.loc.source, "utf-8");
    return this._sourceCode;
  }

  _squeezeSpaces() {
    const beforeCharIsSpace = this._source()[this._beginPos - 1] === " ";
    const afterCharIsSpace = this._source()[this._endPos] == " ";
    if (beforeCharIsSpace && afterCharIsSpace) {
      return this._beginPos = this._beginPos - 1;
    }
  }

  _squeezeLines() {
    const lines = this._source().split("\n");
    const beginLine = this.node.loc.start.line;
    const endLine = this.node.loc.end.line;
    const beforeLineIsBlank = endLine === 1 || lines[beginLine - 2] === "";
    const afterLineIsBlank = lines[endLine] === "";
    if (lines.length > 1 && beforeLineIsBlank && afterLineIsBlank) {
      this._endPos = this._endPos + "\n".length;
    }
  }

  _removeComma() {
    if (this._prevTokenIs(",")) {
      this._beginPos = this._beginPos - 1;
    } else if (this._prevTokenIs(", ")) {
      this._beginPos = this._beginPos - 2;
    } else if (this._nextTokenIs(", ") && !this._startWith(":")) {
      this._endPos = this._endPos + 2;
    } else if (this._nextTokenIs(",") && !this._startWith(":")) {
      this._endPos = this._endPos + 1;
    }
  }

  _nextTokenIs(substr) {
    return this._source().slice(this._endPos, this._endPos + substr.length) === substr;
  }

  _prevTokenIs(substr) {
    return this._source().slice(this._beginPos - substr.length, this._beginPos) === substr;
  }

  _startWith(substr) {
    return this._source().slice(this._beginPos, this._beginPos + substr.length) === substr;
  }
}

/**
 * AppendAction to append code to the bottom of node body.
 */
class AppendAction extends Action {
  _calculatePositions() {
    this._beginPos = this.node.end - this.node.indent() - "}".length;
    this._endPos = this._beginPos;
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    const source = this._rewrittenSource();
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
  _calculatePositions() {
    this._beginPos = this.node.body.start + "{\n".length;
    this._endPos = this._beginPos;
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    const source = this._rewrittenSource();
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

  _calculatePositions() {
    this._beginPos = this.at === "beginning" ? this.node.start : this.node.end;
    this._endPos = this._beginPos;
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    return this._rewrittenSource();
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

  _calculatePositions() {
    this._beginPos = Math.min(...this.selectors.map((selector) => this.node.childNodeRange(selector).start));
    this._endPos = Math.max(...this.selectors.map((selector) => this.node.childNodeRange(selector).end));
    this._squeezeSpaces();
    this._removeComma();
  }

  /**
   * The rewritten code, always empty string.
   */
  get rewrittenCode() {
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

  _calculatePositions() {
    if (this._takeWholeLine()) {
      const lines = this._source().split("\n");
      const beginLine = this.node.loc.start.line;
      const endLine = this.node.loc.end.line;
      this._beginPos = lines.slice(0, beginLine - 1).join("\n").length + (beginLine === 1 ? 0 : "\n".length)
      this._endPos = lines.slice(0, endLine).join("\n").length;
      if (lines.length > endLine) {
        this._endPos = this.endPos + "\n".length;
      }
      this._squeezeLines();
    } else {
      this._beginPos= this.node.start;
      this._endPos = this.node.end;
      this._squeezeSpaces();
      this._removeComma();
    }
  }

  /**
   * The rewritten code, always empty string.
   */
  get rewrittenCode() {
    return "";
  }

  _takeWholeLine() {
    const sourceFromFile = this._source()
      .split("\n")
      .slice(this.node.loc.start.line - 1, this.node.loc.end.line)
      .join("\n")
      .trim();
    return this.node.toSource() === sourceFromFile || this.node.toSource() + ";" === sourceFromFile || this.node.toSource() + "," === sourceFromFile;
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

  _calculatePositions() {
    this._beginPos = Math.min(...this.selectors.map((selector) => this.node.childNodeRange(selector).start));
    this._endPos = Math.max(...this.selectors.map((selector) => this.node.childNodeRange(selector).end));
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    return this._rewrittenSource();
  }
}

/**
 * ReplaceWithAction to replace code.
 */
class ReplaceWithAction extends Action {
  _calculatePositions() {
    this._beginPos = this.node.start;
    this._endPos = this.node.end;
  }

  /**
   * The rewritten source code.
   *
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    if (this._rewrittenSource().includes("\n")) {
      const newCode = [];
      this._rewrittenSource()
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
      return this._rewrittenSource();
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

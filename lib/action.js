const fs = require("fs");

/**
 * Action does some real actions, e.g. insert / replace / delete code.
 */
class Action {
  /**
   * Create an Action.
   * @param {Instance} instance
   * @param {string} code - new code to insert, replace or delete
   */
  constructor(instance, code) {
    this.instance = instance;
    this.code = code;
    this.node = this.instance.currentNode;
  }

  /**
   * Calculate start and begin positions.
   * @abstract
   * @protected
   */
  _calculatePositions() {
    throw new Error("must be implemented by subclass!");
  }

  /**
   * Calculate begin and end positions, and return this.
   * @returns {Action} this
   */
  process() {
    this._calculatePositions();
    return this;
  }

  /**
   * Get begin position.
   */
  get beginPos() {
    return this._beginPos;
  }

  /**
   * Get end position.
   */
  get endPos() {
    return this._endPos;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    throw new Error("must be implemented by subclass!");
  }

  /**
   * The rewritten source code.
   * @protected
   * @returns {string} rewritten source code.
   */
  _rewrittenSource() {
    return this.node.rewrittenSource(this.code);
  }

  /**
   * Get the source code of this node.
   * @protected
   * @returns source code of this node.
   */
  _source() {
    if (this._sourceCode) return this._sourceCode;
    this._sourceCode = fs.readFileSync(this.node.loc.source, "utf-8");
    return this._sourceCode;
  }

  /**
   * Squeeze spaces from source code.
   * @protected
   */
  _squeezeSpaces() {
    const beforeCharIsSpace = this._source()[this._beginPos - 1] === " ";
    const afterCharIsSpace = this._source()[this._endPos] == " ";
    if (beforeCharIsSpace && afterCharIsSpace) {
      this._beginPos = this._beginPos - 1;
    }
  }

  /**
   * Squeeze empty lines from source code.
   * @protected
   */
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

  /**
   * Remove unused braces.
   * e.g. `foobar({ foo: bar })`, if we remove `foo: bar`, braces should also be removed.
   * @protected
   */
  _removeBraces() {
    if (this._prevTokenIs("{") && this._nextTokenIs("}")) {
      this._beginPos = this._beginPos - 1;
      this._endPos = this._endPos + 1;
    } else if (this._prevTokenIs("{ ") && this._nextTokenIs(" }")) {
      this._beginPos = this._beginPos - 2;
      this._endPos = this._endPos + 2;
    } else if (this._prevTokenIs("{") && this._nextTokenIs(" }")) {
      this._beginPos = this._beginPos - 1;
      this._endPos = this._endPos + 2;
    } else if (this._prevTokenIs("{ ") && this._nextTokenIs("}")) {
      this._beginPos = this._beginPos - 2;
      this._endPos = this._endPos + 1;
    }
  }

  /**
   * Rmove unused comma.
   * e.g. `foobar(foo, bar)`, if we remove `foo`, the comma should also be removed,
   * the code should be changed to `foobar(bar)`.
   * @protected
   */
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

  /**
   * Remove unused space.
   * e.g. `<div foo='bar'>foobar</div>`, if we remove `foo='bar`, the space should also be removed,
   * the code shoulde be changed to `<div>foobar</div>`.
   * @protected
   */
  _removeSpace() {
    // this happens when removing a property in jsx element.
    const beforeCharIsSpace = this._source()[this._beginPos - 1] === " ";
    const afterCharIsGreatThan = this._source()[this._endPos] == ">";
    if (beforeCharIsSpace && afterCharIsGreatThan) {
      this._beginPos = this._beginPos - 1;
    }
  }

  /**
   * Check if next token is substr.
   * @private
   * @param {string} substr
   * @returns {boolean} true if next token is equal to substr
   */
  _nextTokenIs(substr) {
    return this._source().slice(this._endPos, this._endPos + substr.length) === substr;
  }

  /**
   * Check if previous token is substr.
   * @private
   * @param {string} substr
   * @returns {boolean} true if previous token is equal to substr
   */
  _prevTokenIs(substr) {
    return this._source().slice(this._beginPos - substr.length, this._beginPos) === substr;
  }

  /**
   * Check if the node source starts with semicolon.
   * @private
   * @param {string} substr
   * @returns {boolean} true if the node source starts with semicolon
   */
  _startWith(substr) {
    return this._source().slice(this._beginPos, this._beginPos + substr.length) === substr;
  }
}

/**
 * AppendAction to append code to the bottom of node body.
 * @extends Action
 */
class AppendAction extends Action {
  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions() {
    this._beginPos = this.node.end - this.node.indent() - "}".length;
    this._endPos = this._beginPos;
  }

  /**
   * The rewritten source code.
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
 * @extends Action
 */
class PrependAction extends Action {
  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions() {
    this._beginPos = this.node.body.start + "{\n".length;
    this._endPos = this._beginPos;
  }

  /**
   * The rewritten source code.
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
 * @extends Action
 */
class InsertAction extends Action {
  /**
   * Create an InsertAction
   * @param {Instance} instance
   * @param {string} code - new code to be inserted
   * @param {Object} options - position to insert code
   */
  constructor(instance, code, options) {
    super(instance, code);
    this.at = options.at;
    this.selector = options.to;
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions() {
    const range = this.selector ? this.node.childNodeRange(this.selector) : this.node;
    this._beginPos = this.at === "beginning" ? range.start : range.end;
    this._endPos = this._beginPos;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    return this._rewrittenSource();
  }
}

/**
 * DeleteAction to delete child node.
 * @extends Action
 */
class DeleteAction extends Action {
  /**
   * Create a DeleteAction
   * @param {Instance} instance
   * @param {string|string[]} selectors - name of child nodes
   */
  constructor(instance, selectors) {
    super(instance, null);
    this.selectors = Array.isArray(selectors) ? selectors : Array(selectors);
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions() {
    this._beginPos = Math.min(...this.selectors.map((selector) => this.node.childNodeRange(selector).start));
    this._endPos = Math.max(...this.selectors.map((selector) => this.node.childNodeRange(selector).end));
    this._squeezeSpaces();
    this._removeBraces();
    this._removeComma();
    this._removeSpace();
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
 * @extends Action
 */
class RemoveAction extends Action {
  /**
   * Create a RemoveAction
   * @param {Instance} instance
   */
  constructor(instance) {
    super(instance, null);
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions() {
    if (this._takeWholeLine()) {
      const lines = this._source().split("\n");
      const beginLine = this.node.loc.start.line;
      const endLine = this.node.loc.end.line;
      this._beginPos = lines.slice(0, beginLine - 1).join("\n").length + (beginLine === 1 ? 0 : "\n".length);
      this._endPos = lines.slice(0, endLine).join("\n").length;
      if (lines.length > endLine) {
        this._endPos = this.endPos + "\n".length;
      }
      this._squeezeLines();
    } else {
      this._beginPos = this.node.start;
      this._endPos = this.node.end;
      this._squeezeSpaces();
      this._removeBraces();
      this._removeComma();
      this._removeSpace();
    }
  }

  /**
   * The rewritten code, always empty string.
   */
  get rewrittenCode() {
    return "";
  }

  /**
   * Check if the source code of this node takes the whole line.
   * @private
   * @returns {boolean}
   */
  _takeWholeLine() {
    const sourceFromFile = this._source()
      .split("\n")
      .slice(this.node.loc.start.line - 1, this.node.loc.end.line)
      .join("\n")
      .trim();
    return (
      this.node.toSource() === sourceFromFile ||
      this.node.toSource() + ";" === sourceFromFile ||
      this.node.toSource() + "," === sourceFromFile
    );
  }
}

/**
 * ReplaceAction to replace child node with code.
 * @extends Action
 */
class ReplaceAction extends Action {
  /**
   * Create a ReplaceAction
   * @param {Instance} instance
   * @param {string|string[]} selectors - name of child nodes
   * @param {Object} options - { with } new code to be replaced
   */
  constructor(instance, selectors, options) {
    super(instance, options.with);
    this.selectors = Array.isArray(selectors) ? selectors : Array(selectors);
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions() {
    this._beginPos = Math.min(...this.selectors.map((selector) => this.node.childNodeRange(selector).start));
    this._endPos = Math.max(...this.selectors.map((selector) => this.node.childNodeRange(selector).end));
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    return this._rewrittenSource();
  }
}

/**
 * ReplaceWithAction to replace code.
 * @extends Action
 */
class ReplaceWithAction extends Action {
  /**
   * Create a ReplaceWithAction
   * @param {Instance} instance
   * @param {string} code - new code to be replaced
   * @param {Object} options - default is { autoIndent: true } if auto fix indent
   */
  constructor(instance, code, options = { autoIndent: true }) {
    super(instance, code);
    this.autoIndent = options.autoIndent;
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions() {
    if (this.autoIndent) {
      this._beginPos = this.node.start;
    } else {
      this._beginPos = this.node.start - this.node.loc.start.column;
    }
    this._endPos = this.node.end;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    if (this.autoIndent && this._rewrittenSource().includes("\n")) {
      const newCode = [];
      this._rewrittenSource()
        .split("\n")
        .forEach((line, index) => {
          if (index === 0 || line === "") {
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

/**
 * CommentOutAction comments out a block of code.
 * @extends Action
 */
class CommentOutAction extends Action {
  /**
   * Create a CommentOutAction
   * @param {Instance} instance
   */
  constructor(instance) {
    super(instance, null);
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions() {
    this._beginPos = this.node.start;
    this._endPos = this.node.end;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode() {
    const lines = (" ".repeat(this.node.loc.end.column - 1) + this.node.toSource()).split("\n");
    const column = Math.min(...lines.map((line) => line.search(/\S/)));
    return lines.map((line) => (column > -1 ? line.slice(0, column) + "// " + line.slice(column) : line)).join("\n");
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
  CommentOutAction,
};

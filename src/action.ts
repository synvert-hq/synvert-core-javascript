import { Node } from "acorn";
import Instance from "./instance";

/**
 * Action does some real actions, e.g. insert / replace / delete code.
 */
abstract class Action {
  protected node: Node;
  protected _beginPos: number;
  protected _endPos: number;
  protected _sourceCode?: string;

  /**
   * Create an Action.
   * @param {Instance} instance
   * @param {string} code - new code to insert, replace or delete
   */
  constructor(protected instance: Instance, protected code: string) {
    this._beginPos = -1;
    this._endPos = -1;
    this.node = this.instance.currentNode;
  }

  /**
   * Calculate start and begin positions.
   * @abstract
   * @protected
   */
  abstract _calculatePositions(): void;

  /**
   * Calculate begin and end positions, and return this.
   * @returns {Action} this
   */
  process(): this {
    this._calculatePositions();
    return this;
  }

  /**
   * Get begin position.
   */
  get beginPos(): number {
    return this._beginPos;
  }

  /**
   * Get end position.
   */
  get endPos(): number {
    return this._endPos;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  abstract get rewrittenCode(): string;

  /**
   * The rewritten source code.
   * @protected
   * @returns {string} rewritten source code.
   */
  _rewrittenSource(): string {
    return this.node.rewrittenSource(this.code);
  }

  /**
   * Get the source code of this node.
   * @protected
   * @returns source code of this node.
   */
  _source(): string {
    return this.node._fileContent();
  }

  /**
   * Squeeze spaces from source code.
   * @protected
   */
  _squeezeSpaces(): void {
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
  _squeezeLines(): void {
    const lines = this._source().split("\n");
    const beginLine = this.node.loc!.start.line;
    const endLine = this.node.loc!.end.line;
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
  _removeBraces(): void {
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
  _removeComma(): void {
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
  _removeSpace(): void {
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
  _nextTokenIs(substr: string): boolean {
    return this._source().slice(this._endPos, this._endPos + substr.length) === substr;
  }

  /**
   * Check if previous token is substr.
   * @private
   * @param {string} substr
   * @returns {boolean} true if previous token is equal to substr
   */
  _prevTokenIs(substr: string): boolean {
    return this._source().slice(this._beginPos - substr.length, this._beginPos) === substr;
  }

  /**
   * Check if the node source starts with semicolon.
   * @private
   * @param {string} substr
   * @returns {boolean} true if the node source starts with semicolon
   */
  _startWith(substr: string): boolean {
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
  _calculatePositions(): void {
    this._beginPos = (this.node as any).body.start + "{\n".length;
    this._endPos = this._beginPos;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode(): string {
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

interface InsertActionOptions {
  at: string;
  to?: string;
}

/**
 * InsertAction to add code to the node.
 * @extends Action
 */
class InsertAction extends Action {
  private at: string;
  private selector?: string;

  /**
   * Create an InsertAction
   * @param {Instance} instance
   * @param {string} code - new code to be inserted
   * @param {Object} options - position to insert code
   */
  constructor(instance: Instance, code: string, options: InsertActionOptions) {
    super(instance, code);
    this.at = options.at;
    this.selector = options.to;
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions(): void {
    const range = this.selector ? this.node.childNodeRange(this.selector) : this.node;
    this._beginPos = this.at === "beginning" ? range.start : range.end;
    this._endPos = this._beginPos;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode(): string {
    return this._rewrittenSource();
  }
}

/**
 * DeleteAction to delete child node.
 * @extends Action
 */
class DeleteAction extends Action {
  private selectors: string[];

  /**
   * Create a DeleteAction
   * @param {Instance} instance
   * @param {string|string[]} selectors - name of child nodes
   */
  constructor(instance: Instance, selectors: string | string[]) {
    super(instance, "");
    this.selectors = Array.isArray(selectors) ? selectors : Array(selectors);
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions(): void {
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
  get rewrittenCode(): string {
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
  constructor(instance: Instance) {
    super(instance, "");
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions(): void {
    if (this._takeWholeLine()) {
      const lines = this._source().split("\n");
      const beginLine = this.node.loc!.start.line;
      const endLine = this.node.loc!.end.line;
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
  get rewrittenCode(): string {
    return "";
  }

  /**
   * Check if the source code of this node takes the whole line.
   * @private
   * @returns {boolean}
   */
  _takeWholeLine(): boolean {
    const sourceFromFile = this._source()
      .split("\n")
      .slice(this.node.loc!.start.line - 1, this.node.loc!.end.line)
      .join("\n")
      .trim();
    return (
      this.node.toSource() === sourceFromFile ||
      this.node.toSource() + ";" === sourceFromFile ||
      this.node.toSource() + "," === sourceFromFile
    );
  }
}

interface ReplaceActionOptions {
  with: string;
}

/**
 * ReplaceAction to replace child node with code.
 * @extends Action
 */
class ReplaceAction extends Action {
  private selectors: string[];

  /**
   * Create a ReplaceAction
   * @param {Instance} instance
   * @param {string|string[]} selectors - name of child nodes
   * @param {Object} options - { with } new code to be replaced
   */
  constructor(instance: Instance, selectors: string | string[], options: ReplaceActionOptions) {
    super(instance, options.with);
    this.selectors = Array.isArray(selectors) ? selectors : Array(selectors);
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions(): void {
    this._beginPos = Math.min(...this.selectors.map((selector) => this.node.childNodeRange(selector).start));
    this._endPos = Math.max(...this.selectors.map((selector) => this.node.childNodeRange(selector).end));
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode(): string {
    return this._rewrittenSource();
  }
}

interface ReplaceWithActionOptions {
  autoIndent: boolean;
}

/**
 * ReplaceWithAction to replace code.
 * @extends Action
 */
class ReplaceWithAction extends Action {
  private autoIndent: boolean;

  /**
   * Create a ReplaceWithAction
   * @param {Instance} instance
   * @param {string} code - new code to be replaced
   * @param {Object} options - default is { autoIndent: true } if auto fix indent
   */
  constructor(instance: Instance, code: string, options: ReplaceWithActionOptions = { autoIndent: true }) {
    super(instance, code);
    this.autoIndent = options.autoIndent;
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions(): void {
    if (this.autoIndent) {
      this._beginPos = this.node.start;
    } else {
      this._beginPos = this.node.start - this.node.loc!.start.column;
    }
    this._endPos = this.node.end;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode(): string {
    if (this.autoIndent && this._rewrittenSource().includes("\n")) {
      const newCode: string[] = [];
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
  constructor(instance: Instance) {
    super(instance, "");
  }

  /**
   * Calculate the begin and end positions.
   * @protected
   */
  _calculatePositions(): void {
    this._beginPos = this.node.start;
    this._endPos = this.node.end;
  }

  /**
   * The rewritten source code.
   * @returns {string} rewritten code.
   */
  get rewrittenCode(): string {
    const lines = (" ".repeat(this.node.loc!.end.column - 1) + this.node.toSource()).split("\n");
    const column = Math.min(...lines.map((line) => line.search(/\S/)));
    return lines.map((line) => (column > -1 ? line.slice(0, column) + "// " + line.slice(column) : line)).join("\n");
  }
}

export {
  InsertActionOptions,
  ReplaceActionOptions,
  ReplaceWithActionOptions,
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
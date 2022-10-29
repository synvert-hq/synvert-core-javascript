import { t } from "typy";
import { Node } from "acorn";
import NodeQuery from "@xinminlabs/node-query";

import Instance from "./instance";
import { arrayBody } from "./utils";

interface ConditionOptions {
  in?: string;
  match?: ((node: Node) => boolean) | string | object;
}

/**
 * Condition is used to check if the node matches, condition won’t change the node scope.
 */
abstract class Condition {
  protected nodeQuery: NodeQuery<Node>;
  protected options: ConditionOptions;
  protected func: (instance: Instance) => void;
  protected elseFunc?: (instance: Instance) => void;

  /**
   * Create a Condition
   * @param {Instance} instance
   * @param {string|Object} nqlOrRules - nql or rules to find nodes
   * @param {Object} options - to do find in specific child node, e.g. `{ in: 'callee' }`
   * @param {Function} func - a function to be called if nql or rules are matched.
   * @param {Function} elseFunc - a fucntion to be called if nql or rules are not matched.
   */
  constructor(
    protected instance: Instance,
    nqlOrRules: string | object,
    options: ConditionOptions,
    func: (instance: Instance) => void,
    elseFunc?: (instance: Instance) => void
  ) {
    this.nodeQuery = new NodeQuery(nqlOrRules);
    this.options = options;
    this.func = func;
    this.elseFunc = elseFunc;
  }

  /**
   * If condition matches, run the func.
   */
  process(): void {
    if (this.match()) {
      this.func.call(this.instance, this.instance);
    } else if (this.elseFunc) {
      this.elseFunc.call(this.instance, this.instance);
    }
  }

  protected abstract match(): boolean;

  /**
   * Get the target node to process.
   * If `option.in` exists, the target node depends on `options.in`,
   * otherwise the target node is the current node.
   * e.g. source code of the node is `$.ajax({})` and `options` is `{ in: 'callee' }`
   * the target node is `$.ajax`.
   * @private
   * @returns {Node}
   */
  protected targetNode(): Node {
    if (this.options.in) {
      return t(this.instance.currentNode, this.options.in).safeObject;
    }
    return this.instance.currentNode;
  }
}

/**
 * IfExistCondition checks if matching node exists in the node children.
 * @extends Condition
 */
class IfExistCondition extends Condition {
  /**
   * Check if any child node matches.
   */
  protected match(): boolean {
    const matchingNodes = this.nodeQuery.queryNodes(this.targetNode(), {
      includingSelf: false,
      stopAtFirstMatch: true,
    });
    return matchingNodes.length > 0;
  }
}

/**
 * UnlessExistCondition checks if matching node doesn't exist in the node children.
 * @extends Condition
 */
class UnlessExistCondition extends Condition {
  /**
   * Check if none of child node matches.
   */
  protected match(): boolean {
    const matchingNodes = this.nodeQuery.queryNodes(this.targetNode(), {
      includingSelf: false,
      stopAtFirstMatch: true,
    });
    return matchingNodes.length === 0;
  }
}

/**
 * IfOnlyExistCondition checks if node has only one child node and the child node matches.
 * @extends Condition
 */
class IfOnlyExistCondition extends Condition {
  /**
   * Check if only have one child node and the child node matches.
   */
  protected match(): boolean {
    const body = arrayBody(this.targetNode());
    return body.length === 1 && this.nodeQuery.matchNode(body[0]);
  }
}

/**
 * IfAllCondition checks if all matching nodes match options.match.
 * @extends Condition
 */
class IfAllCondition extends Condition {
  /**
   * Find all matching nodes, if all match options.match, run the func, else run the elseFunc.
   */
  protected match(): boolean {
    const nodes = this.nodeQuery.queryNodes(this.targetNode(), {
      includingSelf: false,
    });
    if (nodes.length === 0) {
      return false;
    }
    return nodes.every(this._matchFunc.bind(this));
  }

  /**
   * Function to match node.
   * @private
   * @param {Node} node
   * @returns {boolean} true if node matches
   */
  _matchFunc(node: Node): boolean {
    if (typeof this.options.match === "function") {
      return this.options.match(node);
    } else {
      return new NodeQuery(this.options.match!).matchNode(node);
    }
  }
}

export {
  ConditionOptions,
  IfExistCondition,
  UnlessExistCondition,
  IfOnlyExistCondition,
  IfAllCondition,
};

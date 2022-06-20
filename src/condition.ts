import { t } from "typy";
import { Node } from "acorn";
import { handleRecursiveChild } from "@xinminlabs/node-query";

import Instance from "./instance";
import { matchRules, arrayBody } from "./utils";

interface ConditionOptions {
  in?: string;
  match?: ((node: Node) => boolean) | any;
}

/**
 * Condition is used to check if the node matches the rules, condition won’t change the node scope.
 */
abstract class Condition {
  protected options: ConditionOptions;
  protected func: (instance: Instance) => void;

  /**
   * Create a Condition
   * @param {Instance} instance
   * @param {Object} rules - rules to find nodes, e.g. `{ type: "MemberExpression", object: { in: ["$", "jQuery"] }, property: "ajax" }`
   * @param {Object} options - to do find in specific child node, e.g. `{ in: 'callee' }`
   * @param {Function} func - a function to be called if rules are matched.
   */
  constructor(
    protected instance: Instance,
    protected rules: any,
    options: ConditionOptions | ((instance: Instance) => void),
    func?: (instance: Instance) => void
  ) {
    if (typeof options === "object") {
      this.options = options;
      this.func = func!;
    } else {
      this.options = {};
      this.func = options;
    }
  }

  /**
   * If condition matches, run the func.
   */
  process(): void {
    if (this.match()) {
      this.func.call(this.instance, this.instance);
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
   * Check if any child node matches the rules.
   */
  protected match(): boolean {
    let match = false;
    handleRecursiveChild(this.targetNode(), (childNode) => {
      if (!match) {
        match = matchRules(childNode, this.rules);
      }
    });
    return match;
  }
}

/**
 * UnlessExistCondition checks if matching node doesn't exist in the node children.
 * @extends Condition
 */
class UnlessExistCondition extends Condition {
  /**
   * Check if none of child node matches the rules.
   */
  protected match(): boolean {
    let match = false;
    handleRecursiveChild(this.targetNode(), (childNode) => {
      if (!match) {
        match = matchRules(childNode, this.rules);
      }
    });
    return !match;
  }
}

/**
 * IfOnlyExistCondition checks if node has only one child node and the child node matches rules.
 * @extends Condition
 */
class IfOnlyExistCondition extends Condition {
  /**
   * Check if only have one child node and the child node matches rules.
   */
  protected match(): boolean {
    const body = arrayBody(this.targetNode());
    return body.length === 1 && matchRules(body[0], this.rules);
  }
}

/**
 * IfAllCondition checks if all matching nodes match options.match.
 * @extends Condition
 */
class IfAllCondition extends Condition {
  /**
   * Create an IfAllCondition
   * @param {Instance} instance
   * @param {Object} rules - rules to find nodes, e.g. `{ type: "MemberExpression", object: { in: ["$", "jQuery"] }, property: "ajax" }`
   * @param {Object} options - { match: rules|function }
   * @param {Function} func - a function to be called if all matching nodes match options.match.
   * @param {Function} elseFunc - a function to be called if not all matching nodes match options.match.
   */
  constructor(
    instance: Instance,
    rules: any,
    options: ConditionOptions | ((instance: Instance) => void),
    func: (instance: Instance) => void,
    private elseFunc: (instance: Instance) => void
  ) {
    super(instance, rules, options, func);
  }

  /**
   * Find all matching nodes, if all match options.match rules, run the func, else run the elseFunc.
   */
  process() {
    const nodes = this._matchingNodes();
    if (nodes.length === 0) {
      return;
    }
    if (nodes.every(this._matchFunc.bind(this))) {
      this.func.call(this.instance, this.instance);
    } else {
      this.elseFunc.call(this.instance, this.instance);
    }
  }

  protected match(): boolean {
    return true;
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
      return matchRules(node, this.options.match!);
    }
  }

  /**
   * Get the matching nodes.
   * @private
   * @returns {Node[]} matching nodes
   */
  _matchingNodes(): Node[] {
    const nodes: Node[] = [];
    handleRecursiveChild(this.targetNode(), (childNode) => {
      if (matchRules(childNode, this.rules)) {
        nodes.push(childNode);
      }
    });
    return nodes;
  }
}

export {
  ConditionOptions,
  IfExistCondition,
  UnlessExistCondition,
  IfOnlyExistCondition,
  IfAllCondition,
};

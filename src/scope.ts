import NodeQuery, { handleRecursiveChild, getTargetNode } from "@xinminlabs/node-query";
import { Node } from "acorn";

import type { NodeExt } from "./types/node-ext";
import Instance from "./instance";
import { matchRules } from "./utils";
import "./array-ext";

/**
 * Scope just likes its name, different scope points to different current node.
 * One scope defines some rules, it finds nodes and changes current node to the matching node.
 */
abstract class Scope {
  /**
   * Create a Scope
   * @param {Instance} instance
   */
  constructor(protected instance: Instance) {}
}

/**
 * QueryScope finds out nodes by using node query language, then changes its scope to matching node.
 * @extends Scope
 *
 * @see {@link https://github.com/xinminlabs/node-query-javascript} for node query language
 */
class QueryScope extends Scope {
  private nodeQuery: NodeQuery<NodeExt>;

  /**
   * Create a QueryScope
   * @param {Instance} instance
   * @param {String} queryString
   * @param {Function} func - a function to be called on all matching nodes.
   */
  constructor(
    instance: Instance,
    queryString: string,
    private func: (instance: Instance) => void
  ) {
    super(instance);
    this.nodeQuery = new NodeQuery(queryString);
  }

  /**
   * Find out the matching nodes.
   * It checks the current node and iterates all child nodes,
   * then run the function code on each matching node.
   */
  process(): void {
    const instance = this.instance;
    const currentNode = instance.currentNode;
    if (!currentNode) {
      return;
    }

    instance.processWithNode(currentNode, () => {
      this.nodeQuery.parse(currentNode as NodeExt).forEach((matchingNode) => {
        instance.processWithNode(matchingNode, () => {
          this.func.call(this.instance, this.instance);
        });
      });
    });
  }
}

/**
 * WithinScope finds out nodes which match rules, then changes its scope to matching node.
 * @extends Scope
 */
class WithinScope extends Scope {
  /**
   * Create a WithinScope
   * @param {Instance} instance
   * @param {Object} rules
   * @param {Function} func - a function to be called if rules are matched.
   */
  constructor(
    instance: Instance,
    private rules: any,
    private func: (instance: Instance) => void
  ) {
    super(instance);
  }

  /**
   * Find out the matching nodes.
   * It checks the current node and iterates all child nodes,
   * then run the function code on each matching node.
   */
  process(): void {
    const instance = this.instance;
    const currentNode = instance.currentNode;
    if (!currentNode) {
      return;
    }

    const matchingNodes = this._findMatchingNodes(currentNode);
    instance.processWithNode(currentNode, () => {
      matchingNodes.forEach((matchingNode) => {
        instance.processWithNode(matchingNode, () => {
          this.func.call(this.instance, this.instance);
        });
      });
    });
  }

  /**
   * Find matching nodes from current node and its child nodes.
   * @private
   * @param {Node} currentNode
   * @returns {Node[]} matching nodes
   */
  _findMatchingNodes(currentNode: Node): Node[] {
    const matchingNodes = [];
    if (matchRules(currentNode, this.rules)) {
      matchingNodes.push(currentNode);
    }
    handleRecursiveChild(currentNode, (childNode) => {
      if (matchRules(childNode, this.rules)) {
        matchingNodes.push(childNode);
      }
    });
    return matchingNodes;
  }
}

/**
 * Go to and change its scope to a child node.
 * @extends Scope
 */
class GotoScope extends Scope {
  /**
   * Create a GotoScope
   * @param {Instance} instance
   * @param {string} childNodeName
   * @param {Function} func
   */
  constructor(
    instance: Instance,
    private childNodeName: string,
    private func: (instance: Instance) => void
  ) {
    super(instance);
  }

  /**
   * Go to a child now, then run the func with the the child node.
   */
  process(): void {
    const currentNode = this.instance.currentNode;
    if (!currentNode) return;

    const childNode = getTargetNode(currentNode, this.childNodeName) as Node;
    if (!childNode) return;

    this.instance.processWithOtherNode(childNode, () => {
      this.func.call(this.instance, this.instance);
    });
  }
}

export { QueryScope, WithinScope, GotoScope };

import { Node } from "acorn";
import NodeQuery from "@xinminlabs/node-query";
import { getTargetNode } from "@xinminlabs/node-query/lib/compiler/helpers";

import type { NodeExt } from "./types/node-ext";
import Instance from "./instance";
import "./array-ext";
import "./ast-node-ext";

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
      this.nodeQuery.queryNodes(currentNode as NodeExt).forEach((matchingNode) => {
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
  private nodeQuery: NodeQuery<NodeExt>;

  /**
   * Create a WithinScope
   * @param {Instance} instance
   * @param {Object} rules
   * @param {Function} func - a function to be called if rules are matched.
   */
  constructor(
    instance: Instance,
    rules: any,
    private func: (instance: Instance) => void
  ) {
    super(instance);
    this.nodeQuery = new NodeQuery(rules);
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
      this.nodeQuery.queryNodes(currentNode as NodeExt).forEach((matchingNode) => {
        instance.processWithNode(matchingNode, () => {
          this.func.call(this.instance, this.instance);
        });
      });
    });
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

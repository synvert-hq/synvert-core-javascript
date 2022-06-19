import { Node } from "acorn";

export type NodeExt = Node & { [index: string]: NodeExt | NodeArrayExt };

export type NodeArrayExt = NodeExt[] & {
  [index: string]: NodeExt | (() => { start: number; end: number });
};

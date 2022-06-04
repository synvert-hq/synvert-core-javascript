import { Node } from "acorn";

export type NodeExt = Node & { [index: string]: NodeExt | NodeExt[] };

export type NodeArrayExt = NodeExt[] & {
  [index: string]: NodeExt | (() => { start: number; end: number });
};

import { Node } from "acorn";

export type NodeExt = Node & { [index: string]: NodeExt | NodeExt[] };
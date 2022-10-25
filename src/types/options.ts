import { STRATEGY } from "@xinminlabs/node-mutation";

export enum SourceType {
  Module = "module",
  Script = "script",
}

export enum Parser {
  Typescript = "typescript",
  Espree = "espree",
}

export enum Strategy {
  AllowInsertAtSamePosition = "allow_insert_at_same_position",
}

export type RewriterOptions = {
  sourceType?: SourceType;
  parser?: Parser;
  strategy?: Strategy;
  runInstance?: boolean;
  writeToFile?: boolean;
};

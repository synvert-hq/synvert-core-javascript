import { InsertOptions } from "@synvert-hq/node-mutation";

// This is for espree
export enum SourceType {
  MODULE = "module",
  SCRIPT = "script",
}

export enum Parser {
  TYPESCRIPT = "typescript",
  ESPREE = "espree",
  GONZALES_PE = "gonzales-pe",
}

export type RewriterOptions = {
  sourceType?: SourceType;
  parser: Parser;
  runInstance?: boolean;
  writeToFile?: boolean;
};

export interface NewLineInsertOptions extends InsertOptions {
  newLinePosition?: "before" | "after";
}

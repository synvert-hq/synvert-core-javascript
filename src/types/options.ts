export enum SourceType {
  MODULE = "module",
  SCRIPT = "script",
}

export enum Parser {
  TYPESCRIPT = "typescript",
  ESPREE = "espree",
}

export enum Strategy {
  ALLOW_INSERT_AT_SAME_POSITION = "allow_insert_at_same_position",
}

export type RewriterOptions = {
  sourceType?: SourceType;
  parser?: Parser;
  strategy?: Strategy;
  runInstance?: boolean;
  writeToFile?: boolean;
};

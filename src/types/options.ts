export enum SourceType {
  Module = "module",
  Script = "script",
}

export enum Parser {
  Typescript = "typescript",
  Espree = "espree",
}

export type RewriterOptions = {
  sourceType?: SourceType;
  parser?: Parser;
  runInstance?: boolean;
  writeToFile?: boolean;
};

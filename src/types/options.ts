export enum SourceType {
  Module = "module",
  Script = "script",
}

export enum Parser {
  Typescript = "typescript",
  Espree = "espree",
}

export enum ExecuteCommand {
  Process = "process",
  Test = "test",
}

export type RewriterOptions = {
  sourceType?: SourceType;
  parser?: Parser;
  executeCommand?: ExecuteCommand;
  runInstance?: boolean;
  writeToFile?: boolean;
};

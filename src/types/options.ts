// This is for espree
export enum SourceType {
  MODULE = "module",
  SCRIPT = "script",
}

export enum Parser {
  TYPESCRIPT = "typescript",
  ESPREE = "espree",
}
}

export type RewriterOptions = {
  sourceType?: SourceType;
  parser?: Parser;
  runInstance?: boolean;
  writeToFile?: boolean;
};

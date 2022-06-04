export enum SourceType {
  Module = "module",
  Script = "script",
}

export type RewriterOptions = {
  sourceType?: SourceType;
};

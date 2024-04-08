import { TestResult } from "@synvert-hq/node-mutation";

export type TestResultExt = TestResult & {
  filePath: string;
  newFilePath?: string;
};

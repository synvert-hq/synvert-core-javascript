import { ProcessResult, TestResult } from "@xinminlabs/node-mutation";

export type TestResultExt = TestResult & { filePath: string };

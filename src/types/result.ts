import { ProcessResult } from "@xinminlabs/node-mutation";

export type TestResult = ProcessResult & { filePath: string };

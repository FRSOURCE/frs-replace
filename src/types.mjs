/**
 * @typedef {'join' | 'flatten' | 'preserve-structure'} Strategy
 * @typedef {{
 *  strategy?: Strategy;
 *  needle: string | RegExp;
 *  replacement: string
 * }} CommonArgs
 * @typedef {{
 *    input: Parameters<typeof import('fast-glob').sync>[0];
 *    inputReadOptions?: Parameters<typeof import('fs').readFileSync>[1];
 *    inputGlobOptions?: Parameters<typeof import('fast-glob').sync>[1];
 *  }
 *  | { content: string }
 * } InputArgs
 * @typedef {{
 *    output?: string;
 *    outputWriteOptions?: Parameters<typeof import('fs').writeFileSync>[2];
 *    outputJoinString?: string;
 *  }
 *  | object
 * } OutputArgs
 * @typedef {CommonArgs & InputArgs & OutputArgs} Args
 * @typedef {[string, string]} FileResult
 * @typedef {(
 *   results: FileResult[],
 *   outputJoinString: string,
 *  ) => [FileResult[]] | [FileResult[], string]
 * } InputStrategyFnSync
 * @typedef {(
 *   results: FileResult[],
 *   output: string,
 *   outputWriteOptions: Parameters<typeof import('fs').writeFileSync>[2],
 *  ) => FileResult[]
 * } OutputStrategyFnSync
 * @typedef {(
 *   results: Promise<Promise<FileResult>[]> | FileResult[],
 *   outputJoinString: string,
 *  ) => Promise<FileResult[]> | FileResult[]
 * } InputStrategyFn
 * @typedef {(
 *   results: Promise<FileResult[]> | FileResult[],
 *   output: string,
 *   outputWriteOptions: Parameters<typeof import('fs').writeFileSync>[2],
 *  ) => Promise<FileResult[]>
 * } OutputStrategyFn
 */

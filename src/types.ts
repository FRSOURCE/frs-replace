import type { readFileSync, writeFileSync } from 'fs';
import type { sync as globSync } from 'fast-glob';

export type Strategy = 'join' | 'flatten' | 'preserve-structure';
export type CommonArgs = {
  strategy?: Strategy;
  needle: string | RegExp;
  replacement: string;
};
export type InputArgs =
  | {
      input: Parameters<typeof globSync>[0];
      inputReadOptions?: Parameters<typeof readFileSync>[1];
      inputGlobOptions?: Parameters<typeof globSync>[1];
    }
  | { content: string };
export type OutputArgs =
  | {
      output?: string;
      outputWriteOptions?: Parameters<typeof writeFileSync>[2];
      outputJoinString?: string;
    }
  | object;
export type Args = CommonArgs & InputArgs & OutputArgs;
export type FileResult = [string, string];
export type InputStrategyFnSync = (
  results: FileResult[],
  outputJoinString: string,
) => [FileResult[]] | [FileResult[], string];
export type OutputStrategyFnSync = (
  results: FileResult[],
  output: string,
  outputWriteOptions: Parameters<typeof writeFileSync>[2],
) => FileResult[];
export type InputStrategyFn = (
  results: Promise<Promise<FileResult>[]> | FileResult[],
  outputJoinString: string,
) => Promise<FileResult[]> | FileResult[];
export type OutputStrategyFn = (
  results: Promise<FileResult[]> | FileResult[],
  output: string,
  outputWriteOptions: Parameters<typeof writeFileSync>[2],
) => Promise<FileResult[]>;

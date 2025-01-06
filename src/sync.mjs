import { sep, join, normalize, dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import fastGlob from 'fast-glob';
import { writeError, getReplaceFn } from './utils.mjs';

/**
 * @typedef {import("./types.mjs").Strategy} Strategy
 * @typedef {import("./types.mjs").InputStrategyFnSync} InputStrategyFnSync
 * @typedef {import("./types.mjs").OutputStrategyFnSync} OutputStrategyFnSync
 * @typedef {import("./types.mjs").Args} Args
 * @typedef {import("./types.mjs").FileResult} FileResult
 */

/**
 * @param {string} path
 * @param {string} data
 * @param {Parameters<typeof import('fs').writeFileSync>[2]} options
 */
const writeSync = (path, data, options) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data, options);
};

/** @satisfies {Record<Strategy, InputStrategyFnSync>} */
const inputStrategyMap = {
  join: (results, outputJoinString) => {
    let result = results[0]?.[1] || '';
    for (let i = 1; i < results.length; ++i) {
      result += outputJoinString + results[i][1];
    }
    return [[['', result]]];
  },
  flatten: (results) => {
    for (let i = 0; i < results.length; ++i) {
      const result = results[i][0];
      results[i][0] = result.substring(result.lastIndexOf(sep));
    }
    return [results];
  },
  'preserve-structure': (...args) => args,
};

/** @type {OutputStrategyFnSync} */
const multipleFilesOutputStrategy = (results, output, outputWriteOptions) => {
  for (let i = 0; i < results.length; ++i) {
    const result = results[i];
    result[0] = join(output, result[0]);
    writeSync(result[0], result[1], outputWriteOptions);
  }
  return results;
};

/** @satisfies {Record<Strategy, OutputStrategyFnSync>} */
const outputStrategyMap = {
  join: (results, output, outputWriteOptions) => {
    writeSync(output, results[0][1], outputWriteOptions);
    results[0][0] = output;
    return results;
  },
  flatten: multipleFilesOutputStrategy,
  'preserve-structure': multipleFilesOutputStrategy,
};

/** @param {Args} args */
export default ({ strategy = 'join', needle, replacement, ...args }) => {
  /** @type {FileResult[]} */
  let results;
  const replaceFn = getReplaceFn(needle, replacement);

  if ('content' in args && args.content !== undefined) {
    results = [['', replaceFn(args.content)]];
  } else if ('input' in args && args.input !== undefined) {
    args.inputReadOptions ??= 'utf8';
    results = [];

    const files = fastGlob.sync(args.input, args.inputGlobOptions);
    const len = files.length;
    for (let i = 0; i < len; ++i) {
      const filePath = files[i];
      results.push([
        filePath,
        replaceFn(readFileSync(filePath, args.inputReadOptions).toString()),
      ]);
    }
  } else {
    writeError(
      "at least one input source must be defined! Use either 'content' or 'input' param.",
    );
  }

  if (!inputStrategyMap[strategy])
    writeError(
      'unsupported strategy used! Possible values are: "join", "preserve-structure" or "flatten"',
    );

  const outputJoinString =
    ('outputJoinString' in args ? args.outputJoinString : undefined) ?? '\n';

  [results] = inputStrategyMap[strategy](
    // @ts-expect-error: False positive from TS - this variable is assigned already
    results,
    outputJoinString,
  );

  if ('output' in args && args.output !== undefined) {
    args.outputWriteOptions ??= 'utf8';

    results = outputStrategyMap[strategy](
      results,
      normalize(args.output),
      args.outputWriteOptions,
    );
  }

  return results;
};

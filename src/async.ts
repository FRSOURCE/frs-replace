import { sep, join, normalize, dirname } from 'path';
import { readFile, promises as fs } from 'fs';
import fastGlob from 'fast-glob';
import { writeError, getReplaceFn } from './utils.js';
import type {
  Strategy,
  InputStrategyFn,
  OutputStrategyFn,
  Args,
  FileResult,
} from './types.js';

const write = async (
  path: string,
  data: string,
  options: Parameters<(typeof fs)['writeFile']>[2],
) => {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, data, options);
};

const inputStrategyMap = {
  join: async (results, outputJoinString) => [
    await Promise.all(await results).then((results) => {
      const len = results.length;
      let result = (results[0] && results[0][1]) || '';
      for (let i = 1; i < len; ++i) {
        result += outputJoinString + results[i][1];
      }
      return ['', result];
    }),
  ],
  flatten: async (results) =>
    await Promise.all(
      (await results).map(async (result) => {
        result = await result;
        result[0] = result[0].substring(result[0].lastIndexOf(sep));
        return result;
      }),
    ),
  'preserve-structure': async (results) => await Promise.all(await results),
} satisfies Record<Strategy, InputStrategyFn>;

const multipleFilesOutputStrategy: OutputStrategyFn = async (
  results,
  output,
  outputWriteOptions,
) =>
  Promise.all(
    (await results).map(async (result) => {
      result[0] = join(output, result[0]);
      await write(result[0], result[1], outputWriteOptions);
      return result;
    }),
  );

const outputStrategyMap = {
  join: async (results, output, outputWriteOptions) => {
    const result = (await results)[0];
    await write(output, result[1], outputWriteOptions);
    result[0] = output;
    return [result];
  },
  flatten: multipleFilesOutputStrategy,
  'preserve-structure': multipleFilesOutputStrategy,
} satisfies Record<Strategy, OutputStrategyFn>;

export default async ({
  strategy = 'join',
  needle,
  replacement,
  ...args
}: Args) => {
  let inputData: Parameters<InputStrategyFn>[0];
  const replaceFn = getReplaceFn(needle, replacement);

  if ('content' in args && args.content !== undefined) {
    inputData = [['', replaceFn(args.content)]];
  } else if ('input' in args && args.input !== undefined) {
    args.inputReadOptions ??= 'utf8';
    const replacePromises: Promise<FileResult>[] = [];

    const fileStream = fastGlob.stream(args.input, args.inputGlobOptions);
    fileStream.on('error', writeError);
    fileStream.on('data', (path) =>
      replacePromises.push(
        new Promise((resolve, reject) =>
          readFile(path, args.inputReadOptions, (error, data) => {
            /* c8 ignore next */
            if (error) return reject(error);

            resolve([path, replaceFn(data.toString())]);
          }),
        ),
      ),
    );
    inputData = new Promise<typeof replacePromises>((resolve) =>
      fileStream.once('end', () => resolve(replacePromises)),
    ).catch(writeError);
  } else {
    writeError('at least one input source must be defined!');
  }

  if (!inputStrategyMap[strategy])
    writeError(
      'unsupported strategy used! Possible values are: "join", "preserve-structure" or "flatten"',
    );

  const outputJoinString =
    ('outputJoinString' in args ? args.outputJoinString : undefined) ?? '\n';

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let results = await inputStrategyMap[strategy](inputData!, outputJoinString);

  if ('output' in args && args.output !== undefined) {
    args.outputWriteOptions ??= 'utf8';

    results = await outputStrategyMap[strategy](
      results,
      normalize(args.output),
      args.outputWriteOptions,
    );
  }

  return results;
};

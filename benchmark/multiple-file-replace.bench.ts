import { join } from 'path';
import { FileResult, dirSync, file } from 'tmp-promise';
import { afterAll, beforeAll, bench, describe } from 'vitest';
import { sync } from 'fast-glob';
import { unlinkSync } from 'fs';
import { appendFile } from 'fs/promises';

const regex = /'^[adjox]/gm;
const replacement = 'ą|';
const content = `aąbcćdeęfg%hi
jklmn
oópqr,stuvwxyZ`;
const tmpPrefixes = {
  input: 'frs-replace-replace-in',
  output: 'frs-replace-replace-out',
};
const defaults = {
  inputReadOptions: 'utf8',
  outputWriteOptions: 'utf8',
  outputJoinString: '\n',
} as const;
const inputFilesNo = 40;
const maxTestTime = 2000;

let dir: string;
let inputs: FileResult[] = [];

beforeAll(async () => {
  const dirObj = dirSync(); // removing all files similar our tmp
  dir = dirObj.name;

  sync(
    [join(dir, tmpPrefixes.input), join(dir, tmpPrefixes.output)].map(
      (v) => v + '*',
    ),
  ).forEach(unlinkSync);

  for (let i = 0; i < inputFilesNo; ++i) {
    const input = await file({
      prefix: tmpPrefixes.input + i + '-',
      keep: true,
      dir,
    });
    inputs.push(input);
    await appendFile(input.path, content, {
      encoding: defaults.inputReadOptions,
    });
  }
});

afterAll(async () => {
  inputs.forEach((input) => input.cleanup);
  inputs = [];
});

describe(`input as glob pattern [${inputFilesNo} files]`, () => {
  bench(
    '@frsource/frs-replace (async)',
    async () => {
      const { async } = await import('../src/index.js');
      await async({
        needle: regex,
        replacement,
        input: `${dir}/${tmpPrefixes.input}*`,
      });
    },
    { time: maxTestTime, iterations: 1 },
  );

  bench(
    '@frsource/frs-replace (sync)',
    async () => {
      const { sync } = await import('../src/index.js');
      sync({
        needle: regex,
        replacement,
        input: `${dir}/${tmpPrefixes.input}*`,
      });
    },
    { time: maxTestTime, iterations: 1 },
  );

  bench(
    'replace-in-file (sync)',
    async () => {
      const { replaceInFile } = await import('replace-in-file');
      await replaceInFile({
        from: regex,
        to: replacement,
        files: `${dir}/${tmpPrefixes.input}*`,
      });
    },
    { time: maxTestTime, iterations: 1 },
  );

  bench(
    'replace-in-file (async)',
    async () => {
      const { replaceInFileSync } = await import('replace-in-file');
      await replaceInFileSync({
        from: regex,
        to: replacement,
        files: `${dir}/${tmpPrefixes.input}*`,
      });
    },
    { time: maxTestTime, iterations: 1 },
  );
});

describe('input & replacement as strings', () => {
  bench(
    '@frsource/frs-replace (async)',
    async () => {
      const { async } = await import('../src/index.js');
      await async({
        needle: regex.source,
        replacement,
        content,
      });
    },
    { time: maxTestTime, iterations: 1 },
  );

  bench(
    '@frsource/frs-replace (sync)',
    async () => {
      const { sync } = await import('../src/index.js');
      sync({
        needle: regex.source,
        replacement,
        content,
      });
    },
    { time: maxTestTime, iterations: 1 },
  );

  bench(
    'replaceString',
    async () => {
      const { default: replace } = await import('replace-string');
      replace(content, regex.source, replacement);
    },
    { time: maxTestTime, iterations: 1 },
  );
});

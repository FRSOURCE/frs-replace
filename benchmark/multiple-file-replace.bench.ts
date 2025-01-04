import { join } from 'path';
import { FileResult, dirSync, file } from 'tmp-promise';
import { afterAll, beforeAll, bench, describe } from 'vitest';
import { sync } from 'fast-glob';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
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

  const { default: benchResults } = await import('./results.json');

  let benchResultsContent = '';
  for (const testGroup of benchResults.files[0].groups) {
    const groupName = testGroup.fullName.split(' > ').slice(1).join(' > ');
    benchResultsContent +=
      '\n### ' +
      groupName +
      '\n\n' +
      '| Rank | Library | Average latency [ms] | Difference percentage (comparing&nbsp;to&nbsp;best&nbsp;average&nbsp;latency) |\n' +
      '| --- | --- | --- | --- |\n' +
      testGroup.benchmarks
        .sort((a, b) => a.rank - b.rank)
        .reduce(
          (p, v) =>
            p +
            '| ' +
            v.rank +
            ' | ' +
            v.name +
            ' | ' +
            `${v.mean.toFixed(2)} \xb1 ${v.rme.toFixed(2)}%` +
            ' | ' +
            `+${((v.mean / testGroup.benchmarks[0].mean - 1) * 100).toFixed(2)}%` +
            ' |\n',
          '',
        );
  }

  const readmeContent = readFileSync('./README.md')
    .toString()
    .replace(
      /(##\s:chart_with_upwards_trend:\sBenchmarks)[\s\S]*?(?:$|(?:\s##\s))/,
      `$1\n\n> Tested on Node ${process.version}.\n${benchResultsContent}`,
    );

  writeFileSync('./README.md', readmeContent);
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
    'replace-in-file (async)',
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

import { afterAll, expect, test } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import results from './results.json';

afterAll(updateReadmeBenchmarkContent);

results.files[0].groups.forEach(({ fullName, benchmarks }) => {
  const testName = fullName.split(' > ').slice(1).join(' > ');
  test(`${testName} > frs-replace should be the fastest framework`, () => {
    const sortedResults = benchmarks.sort((a, b) => a.rank - b.rank);
    expect(sortedResults[0].name).toContain('frs-replace');
  });
});

function updateReadmeBenchmarkContent() {
  let benchResultsContent = '';
  for (const testGroup of results.files[0].groups) {
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
}

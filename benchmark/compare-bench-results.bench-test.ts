import { expect, test } from 'vitest';
import results from './results.json';

results.files[0].groups.forEach(({ fullName, benchmarks }) => {
  const testName = fullName.split(' > ').slice(1).join(' > ');
  test(`${testName} > frs-replace should be the fastest framework`, () => {
    const sortedResults = benchmarks.sort((a, b) => a.rank - b.rank);
    expect(sortedResults[0].name).toContain('frs-replace');
  });
});

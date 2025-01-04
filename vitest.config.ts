import {
  defineConfig,
  configDefaults,
  coverageConfigDefaults,
} from 'vitest/config';

const isBenchTest = process.env.TEST_TYPE === 'bench';

export default defineConfig({
  test: {
    include: isBenchTest
      ? ['benchmark/*.bench-test.ts']
      : configDefaults.include,
    coverage: {
      provider: 'v8',
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/release.config.js',
        'benchmark/**',
        'bin/**',
      ],
    },
    benchmark: {
      outputJson: 'benchmark/results.json',
    },
  },
});

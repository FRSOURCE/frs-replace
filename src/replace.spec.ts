import { assert, expect, describe, it, afterEach, beforeEach } from 'vitest';
import * as tmp from 'tmp-promise';
import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';

import * as replace from './index.js';
import type { Args } from './types.js';

const tmpPrefixes = {
  input: 'frs-replace-replace-in',
  output: 'frs-replace-replace-out',
};
const content = `aąbcćdeęfg%hi
jklmn
oópqr,stuvwxyZ`;
const needle = /^[adjox]/gm;
const replacement = 'ą|';
const replaceFn = () => replacement;
const defaults: {
  inputReadOptions: BufferEncoding;
  outputWriteOptions: BufferEncoding;
  outputJoinString: string;
} = {
  inputReadOptions: 'utf8',
  outputWriteOptions: 'utf8',
  outputJoinString: '\n',
};
let output: string, dir: string;

let input: tmp.FileResult | undefined, input2: tmp.FileResult | undefined;

const cleanInputs = () => {
  input2 && input2.cleanup();
  input2 = undefined;
  input && input.cleanup();
  input = undefined;
};

const createDemoInputs = async () => {
  await tmp
    .file({ prefix: tmpPrefixes.input, keep: true, dir })
    .then(async (f) => {
      input = f;
      return new Promise((resolve) =>
        fs.appendFile(
          f.path,
          content,
          { encoding: defaults.inputReadOptions },
          resolve,
        ),
      );
    });
  await tmp
    .file({ prefix: tmpPrefixes.input, keep: true, dir })
    .then(async (f) => {
      input2 = f;
      return new Promise((resolve) =>
        fs.appendFile(
          f.path,
          content,
          { encoding: defaults.inputReadOptions },
          resolve,
        ),
      );
    });
};

{
  // removing all files similar to our tmp files
  const dirObj = tmp.dirSync();
  dir = dirObj.name;

  glob
    .sync(
      [
        path.join(dir, tmpPrefixes.input),
        path.join(dir, tmpPrefixes.output),
      ].map((v) => v + '*'),
    )
    .forEach(fs.unlinkSync);
}

afterEach(() => {
  fs.existsSync(output) &&
    (fs.lstatSync(output).isDirectory()
      ? fs.rmdirSync(output)
      : fs.unlinkSync(output));
});

describe('argument validation', () => {
  const getExpectedOutput = () => [
    ['', content.replace(needle, replacement)] as replace.FileResult,
  ];
  const prepareInput = <Config extends replace.InputArgs & replace.OutputArgs>(
    config: Config,
  ): Args => ({
    needle,
    replacement,
    ...config,
  });

  it('requires any argument', async () => {
    await throwsMessageObj(
      {},
      '@frsource/frs-replace :: at least one input source must be defined!',
      'if both stdin & input arguments missing',
    );
  });

  describe('content', () => {
    it('default strategy', async () =>
      testSyncAsync(
        prepareInput({ content }),
        getExpectedOutput(),
        'replaced correctly',
      ));

    it('content with strategy = "flatten"', async () =>
      testSyncAsync(
        prepareInput({ content, strategy: 'flatten' }),
        getExpectedOutput(),
        'replaced correctly',
      ));

    it('content with strategy = "flatten"', async () =>
      testSyncAsync(
        prepareInput({ content, strategy: 'preserve-structure' }),
        getExpectedOutput(),
        'replaced correctly',
      ));
  });

  describe('input', () => {
    beforeEach(async () => {
      cleanInputs();
      await createDemoInputs();
    });

    afterEach(cleanInputs);

    it('as single file path', async () =>
      testSyncAsync(
        prepareInput({ input: input!.path }),
        getExpectedOutput(),
        'replaced correctly',
      ));

    it('as single file path with inputReadOptions as object', async () =>
      testSyncAsync(
        prepareInput({
          input: input!.path,
          inputReadOptions: { encoding: defaults.inputReadOptions },
        }),
        getExpectedOutput(),
        'replaced correctly',
      ));

    it('array of file paths', async () => {
      const expectedOutput = getExpectedOutput();
      await testSyncAsync(
        prepareInput({ input: [input!.path, input2!.path] }),
        [
          [
            '',
            expectedOutput[0][1] +
              defaults.outputJoinString +
              expectedOutput[0][1],
          ],
        ],
        'replaced correctly',
      );
    });

    it('as array of file paths with outputJoinString changed', async () => {
      const expectedOutput = getExpectedOutput();
      const outputJoinString = 'someCustomString\n\t';
      await testSyncAsync(
        prepareInput({ input: [input!.path, input2!.path], outputJoinString }),
        [['', expectedOutput[0][1] + outputJoinString + expectedOutput[0][1]]],
        'replaced correctly',
      );
    });

    it('as array of file paths with strategy = "flatten"', async () => {
      const expectedOutput = getExpectedOutput();
      await testSyncAsync(
        prepareInput({
          input: [input!.path, input2!.path],
          strategy: 'flatten',
        }),
        [
          [
            input!.path.substring(input!.path.lastIndexOf('/')),
            expectedOutput[0][1],
          ],
          [
            input2!.path.substring(input!.path.lastIndexOf('/')),
            expectedOutput[0][1],
          ],
        ],
        'replaced correctly with proper filepaths',
      );
    });

    it('as array of file paths with strategy = "preserve-structure"', async () => {
      const expectedOutput = getExpectedOutput();
      await testSyncAsync(
        prepareInput({
          input: [input!.path, input2!.path],
          strategy: 'preserve-structure',
        }),
        [
          [input!.path, expectedOutput[0][1]],
          [input2!.path, expectedOutput[0][1]],
        ],
        'replaced correctly with proper filepaths',
      );
    });

    it('as glob pattern', async () => {
      const expectedOutput = getExpectedOutput();
      await testSyncAsync(
        prepareInput({ input: `${dir}/${tmpPrefixes.input}*` }),
        [
          [
            '',
            expectedOutput[0][1] +
              defaults.outputJoinString +
              expectedOutput[0][1],
          ],
        ],
        'replaced correctly',
      );
    });

    it('as glob pattern with inputGlobOptions', async () => {
      await testSyncAsync(
        prepareInput({
          input: `${dir}/${tmpPrefixes.input}*`,
          inputGlobOptions: { onlyDirectories: true },
        }),
        [['', '']],
        'replaced correctly',
      );
    });

    it('as glob pattern with strategy = "flatten"', async () => {
      const testInput = prepareInput({
        input: `${dir}/${tmpPrefixes.input}*`,
        strategy: 'flatten',
      });
      const expectedOutput = getExpectedOutput();
      await testSyncAsync(
        testInput,
        [
          input!.path.substring(input!.path.lastIndexOf(path.sep)),
          expectedOutput[0][1],
        ],
        'replaced correctly with proper filepaths',
        'toContainEqual',
      );
      await testSyncAsync(
        testInput,
        [
          input2!.path.substring(input!.path.lastIndexOf(path.sep)),
          expectedOutput[0][1],
        ],
        'replaced correctly with proper filepaths',
        'toContainEqual',
      );
    });

    it('as glob pattern with strategy = "preserve-structure"', async () => {
      const expectedOutput = getExpectedOutput();
      const testInput = prepareInput({
        input: `${dir}/${tmpPrefixes.input}*`,
        strategy: 'preserve-structure',
      });
      await testSyncAsync(
        testInput,
        [input!.path, expectedOutput[0][1]],
        'replaced correctly with proper filepaths',
        'toContainEqual',
      );
      await testSyncAsync(
        testInput,
        [input2!.path, expectedOutput[0][1]],
        'replaced correctly with proper filepaths',
        'toContainEqual',
      );
    });
  });

  describe('strategy', () => {
    it('throws on unsupported strategy', () =>
      throwsMessageObj(
        { content: 'qwe', strategy: 'whatever' },
        '@frsource/frs-replace :: unsupported strategy used! Possible values are: "join", "preserve-structure" or "flatten"',
        'does not throw with error',
      ));
  });

  describe('output', () => {
    beforeEach(async () => {
      cleanInputs();

      await createDemoInputs();
    });

    afterEach(cleanInputs);

    it('with output dir set', async () => {
      const output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir });
      const expectedOutput = [
        [output, getExpectedOutput()[0][1]],
      ] as replace.FileResult[];
      await testSyncAsync(
        prepareInput({ content, output }),
        expectedOutput,
        'replaced correctly',
      );

      assert(fs.existsSync(output), 'output file exists');

      const outputFileContent = fs.readFileSync(output).toString();
      expect(outputFileContent).toEqual(expectedOutput[0][1]);
    });

    it('with output dir set and with strategy = "flatten"', async () => {
      const output = path.join(dir, tmpPrefixes.output, 'flatten');
      const expectedOutput = [
        [
          path.join(dir, tmpPrefixes.output, 'flatten') +
            input!.path.substring(input!.path.lastIndexOf('/')),
          getExpectedOutput()[0][1],
        ],
        [
          path.join(dir, tmpPrefixes.output, 'flatten') +
            input2!.path.substring(input!.path.lastIndexOf('/')),
          getExpectedOutput()[0][1],
        ],
      ] as replace.FileResult[];
      await testSyncAsync(
        prepareInput({
          input: [input!.path, input2!.path],
          output,
          strategy: 'flatten',
        }),
        expectedOutput,
        'replaced correctly with proper filepaths',
      );

      assert(fs.existsSync(expectedOutput[0][0]), 'output file exists');
      assert(fs.existsSync(expectedOutput[1][0]), 'output file 2 exists');

      fs.unlinkSync(expectedOutput[0][0]);
      fs.unlinkSync(expectedOutput[1][0]);

      deleteFolderRecursive(output);
    });

    it('with output dir set and with strategy = "preserve-structure"', async () => {
      const output = path.join(dir, tmpPrefixes.output, 'preserve-structure');
      const expectedOutput = [
        [
          path.join(dir, tmpPrefixes.output, 'preserve-structure', input!.path),
          getExpectedOutput()[0][1],
        ],
        [
          path.join(
            dir,
            tmpPrefixes.output,
            'preserve-structure',
            input2!.path,
          ),
          getExpectedOutput()[0][1],
        ],
      ] as replace.FileResult[];
      await testSyncAsync(
        prepareInput({
          input: [input!.path, input2!.path],
          output,
          strategy: 'preserve-structure',
        }),
        expectedOutput,
        'replaced correctly with proper filepaths',
      );

      assert(fs.existsSync(expectedOutput[0][0]), 'output file exists');
      assert(fs.existsSync(expectedOutput[1][0]), 'output file 2 exists');

      fs.unlinkSync(expectedOutput[0][0]);
      fs.unlinkSync(expectedOutput[1][0]);

      deleteFolderRecursive(output);
    });

    it('with output dir set and outputWriteOptions as object', async () => {
      const output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir });
      const expectedOutput = getExpectedOutput();
      expectedOutput[0][0] = output;
      await testSyncAsync(
        prepareInput({
          content,
          output,
          outputWriteOptions: { encoding: defaults.outputWriteOptions },
        }),
        expectedOutput,
        'replaced correctly',
      );

      assert(fs.existsSync(output), 'output file exists');

      const outputFileContent = fs.readFileSync(output).toString();
      expect(outputFileContent).toEqual(expectedOutput[0][1]);
    });
  });

  it('replacement as function', async () => {
    const output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir });
    const expectedOutput = getExpectedOutput();
    expectedOutput[0] = [output, content.replace(needle, replaceFn)];
    await testSyncAsync(
      prepareInput({ content, output, replacement: replaceFn }),
      expectedOutput,
      'replaced correctly',
    );

    assert(fs.existsSync(output), 'output file exists');

    const outputFileContent = fs.readFileSync(output).toString();
    expect(outputFileContent).toEqual(expectedOutput[0][1]);
  });

  it('needle as string', async () => {
    const needle = 'a';
    const expectedOutput = getExpectedOutput();
    expectedOutput[0][1] = content.replace(needle, replacement);
    await testSyncAsync(
      prepareInput({ content, needle }),
      expectedOutput,
      'replaced correctly',
    );
  });
});

function throwsMessageObj(args: object, errorMessage: string, message: string) {
  expect(
    () => replace.sync(args as Args),
    'sync :: should throw ' + message,
  ).toThrow(errorMessage);
  return expect(
    () => replace.async(args as Args),
    'async :: should reject promise ' + message,
  ).rejects.toThrow(errorMessage);
}

function testSyncAsync<
  Matcher extends 'toEqual' | 'toContainEqual' = 'toEqual',
>(
  testInput: Args,
  expectedOutput: Matcher extends 'toContainEqual'
    ? replace.FileResult
    : replace.FileResult[],
  message: string,
  matcher?: Matcher,
) {
  expect(replace.sync(testInput), `sync :: ${message}`)[matcher ?? 'toEqual'](
    expectedOutput,
  );
  return expect(
    replace.async(testInput).then(async (promises) => Promise.all(promises)),
    `async :: ${message}`,
  ).resolves[(matcher ?? 'toEqual') as 'toEqual'](expectedOutput);
}

function deleteFolderRecursive(path: string) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file) {
      const curPath = path + '/' + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

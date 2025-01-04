import childProcess from 'child_process';
import fs from 'fs';
import tmp from 'tmp-promise';
import glob from 'fast-glob';
import path from 'path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';

const tmpPrefixes = {
  input: 'frs-replace-cli-in',
  output: 'frs-replace-cli-out',
};
const defaultOptions = {
  timeout: 2000,
  encoding: 'utf-8',
} as const;
const content = `aąbcćdeęfg%hi
jklmn
oópqr,stuvwxyZ`;
const needle = '^[adjox]';
const defaultFlags = 'g';
const replacement = 'ą|';
const replaceFn = () => replacement;
const expectedOutput = content.replace(
  new RegExp(needle, defaultFlags),
  replacement,
);
const defaults = {
  inputReadOptions: 'utf8',
  outputWriteOptions: 'utf8',
  outputJoinString: '\n',
} as const;
let output: string, dir: string;

{
  const dirObj = tmp.dirSync(); // removing all files similar our tmp
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

test('no arguments', () => {
  const result = runCli();
  expect(result.status, 'process should send error status (1)').toEqual(1);
  expect(result.parsedOutput, 'stdout should be empty').toEqual('');
  expect(
    result.parsedError,
    'stderr should complain about missing arguments',
  ).toEqual('Not enough non-option arguments: got 0, need at least 2');
});

test('one argument', () => {
  const result = runCli('sth');
  expect(result.status, 'process should send error status (1)').toEqual(1);
  expect(result.parsedOutput, 'stdout should be empty').toEqual('');
  expect(
    result.parsedError,
    'stderr should complain about missing arguments',
  ).toEqual('Not enough non-option arguments: got 1, need at least 2');
});

test('two arguments', () => {
  const result = runCli(['sth', 'sth']);
  expect(result.status, 'process should send error status (1)').toEqual(1);
  expect(result.parsedOutput, 'stdout should be empty').toEqual('');
  expect(result.parsedError).toEqual('Missing required argument: i');
});

describe('content argument', () => {
  checkEachArgCombination(
    [needle, replacement, '--stdout', '--no-stdin'],
    ['-c', '--content'],
    content,
    (result) => {
      expect(result.status, 'process should send success status (0)').toEqual(
        0,
      );
      expect(
        result.parsedOutput,
        'stdout should contain replaced string',
      ).toEqual(expectedOutput);
      expect(result.parsedError, 'stderr should be empty').toEqual('');
    },
  );
});

test('no stdout argument', () => {
  const result = runCli([needle, replacement, '--content', content]);
  expect(result.status, 'process should send success status (0)').toEqual(0);
  expect(result.parsedOutput, 'stdout should be empty').toEqual('');
  expect(result.parsedError, 'stderr should be empty').toEqual('');
});

test('stdout argument', () => {
  const result = runCli([
    needle,
    replacement,
    '--content',
    content,
    '--stdout',
  ]);
  expect(result.status, 'process should send success status (0)').toEqual(0);
  expect(result.parsedOutput, 'stdout should contain replaced string').toEqual(
    expectedOutput,
  );
  expect(result.parsedError, 'stderr should be empty').toEqual('');
});

describe('input argument', async () => {
  let input: tmp.FileResult | undefined, input2: tmp.FileResult | undefined;
  const cleanInputs = () => {
    input && input.cleanup();
    input = undefined;
    input2 && input2.cleanup();
    input2 = undefined;
  };

  beforeEach(async () => {
    cleanInputs();
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
  });

  afterEach(cleanInputs);

  describe('as single file path', () => {
    checkEachArgCombination(
      [needle, replacement, '--stdout'],
      ['-i', '--input'],
      () => input!.path,
      (result) => {
        expect(result.status, 'process should send success status (0)').toEqual(
          0,
        );
        expect(
          result.parsedOutput,
          'stdout should contain replaced string',
        ).toEqual(expectedOutput);
        expect(result.parsedError, 'stderr should be empty').toEqual('');
      },
    );
  });

  describe('as array of file paths with strategy="flatten"', () => {
    const outputPath = (output = tmp.tmpNameSync({
      prefix: tmpPrefixes.output,
    }));
    checkEachArgCombination(
      [
        needle,
        replacement,
        '--stdout',
        '--strategy',
        'flatten',
        '--output',
        outputPath,
      ],
      ['-i', '--input'],
      () => [input!.path, input2!.path],
      (result) => {
        expect(result.status, 'process should send success status (0)').toEqual(
          0,
        );
        expect(
          result.parsedOutput,
          'stdout should contain replaced string',
        ).toEqual(expectedOutput);
        expect(result.parsedError, 'stderr should be empty').toEqual('');

        const outputFilePath = path.join(
          outputPath,
          input!.path.substring(input!.path.lastIndexOf(path.sep)),
        );
        const outputFileContent = fs.readFileSync(outputFilePath).toString();
        expect(outputFileContent, 'expected output saved to file').toEqual(
          expectedOutput,
        );

        const outputFilePath2 = path.join(
          outputPath,
          input2!.path.substring(input2!.path.lastIndexOf(path.sep)),
        );
        const outputFileContent2 = fs.readFileSync(outputFilePath2).toString();
        expect(outputFileContent2, 'expected output saved to file').toEqual(
          expectedOutput,
        );

        fs.unlinkSync(outputFilePath);
        fs.unlinkSync(outputFilePath2);
      },
    );
  });

  describe('as array of file paths with strategy="preserve-structure"', () => {
    const outputPath = (output = tmp.tmpNameSync({
      prefix: tmpPrefixes.output,
    }));
    checkEachArgCombination(
      [
        needle,
        replacement,
        '--stdout',
        '--strategy',
        'preserve-structure',
        '--output',
        outputPath,
      ],
      ['-i', '--input'],
      () => [input!.path, input2!.path],
      (result) => {
        expect(result.status, 'process should send success status (0)').toEqual(
          0,
        );
        expect(
          result.parsedOutput,
          'stdout should contain replaced string',
        ).toEqual(expectedOutput);
        expect(result.parsedError, 'stderr should be empty').toEqual('');

        const outputFilePath = path.join(outputPath, input!.path);
        const outputFileContent = fs.readFileSync(outputFilePath).toString();
        expect(outputFileContent, 'expected output saved to file').toEqual(
          expectedOutput,
        );

        const outputFilePath2 = path.join(outputPath, input2!.path);
        const outputFileContent2 = fs.readFileSync(outputFilePath2).toString();
        expect(outputFileContent2, 'expected output saved to file').toEqual(
          expectedOutput,
        );

        fs.unlinkSync(outputFilePath);
        fs.unlinkSync(outputFilePath2);

        const splittedPath = input!.path.split(path.sep);
        splittedPath.pop();
        while (splittedPath.length) {
          const outputDir = splittedPath.join(path.sep);
          fs.rmdirSync(path.join(outputPath, outputDir));
          splittedPath.pop();
        }
      },
    );
  });

  describe('as glob pattern', async () => {
    checkEachArgCombination(
      [needle, replacement, '--stdout'],
      ['-i', '--input'],
      `${dir}/${tmpPrefixes.input}*`,
      (result) => {
        expect(result.status, 'process should send success status (0)').toEqual(
          0,
        );
        expect(
          result.parsedOutput,
          'stdout should contain replaced string',
        ).toEqual(expectedOutput + defaults.outputJoinString + expectedOutput);
        expect(result.parsedError, 'stderr should be empty').toEqual('');
      },
    );
  });
});

describe('i-read-opts argument', async () => {
  let input: tmp.FileResult | undefined;

  beforeEach(async () =>
    tmp.file({ prefix: tmpPrefixes.input, keep: true, dir }).then(async (f) => {
      input = f;
      return new Promise((resolve) =>
        fs.appendFile(
          f.path,
          content,
          { encoding: defaults.inputReadOptions },
          () => resolve(),
        ),
      );
    }),
  );

  afterEach(() => {
    input?.cleanup();
    input = undefined;
  });

  test('without input argument', async () => {
    const result = runCli(
      [
        needle,
        replacement,
        '--i-read-opts.encoding',
        defaults.inputReadOptions,
        '--stdout',
      ],
      { input: content },
    );

    expect(result.status, 'process should send error status (1)').toEqual(1);
    expect(result.parsedOutput, 'stdout should be empty').toEqual('');
    expect(
      result.parsedError,
      'stderr contain error about missing i-read-opts dependency: i argument',
    ).toEqual('Missing required argument: i');
  });

  test('wrong with input argument', () => {
    const result = runCli([
      needle,
      replacement,
      '-i',
      input!.path,
      '--i-read-opts.encoding',
      'incorrect-encoding',
      '--stdout',
    ]);

    expect(result.status, 'process should send error status (1)').toEqual(1);
    expect(result.parsedOutput, 'stdout should be empty').toEqual('');

    if (process.version.includes('v16')) {
      expect(
        result.parsedError,
        'stderr should complain wrong encoding argument',
      ).toContain(
        "TypeError [ERR_INVALID_ARG_VALUE]: The argument 'incorrect-encoding' is invalid encoding. Received 'encoding'",
      );
    } else if (process.version.includes('v20')) {
      expect(
        result.parsedError,
        'stderr should complain wrong encoding argument',
      ).toContain(
        "TypeError [ERR_INVALID_ARG_VALUE]: The argument 'incorrect-encoding' is invalid encoding. Received 'encoding'",
      );
    } else {
      expect(
        result.parsedError,
        'stderr should complain wrong encoding argument',
      ).toContain(
        'TypeError [ERR_INVALID_OPT_VALUE_ENCODING]: The value "incorrect-encoding" is invalid for option "encoding"',
      );
    }
  });

  test('correct with input argument', () => {
    const result = runCli([
      needle,
      replacement,
      '-i',
      input!.path,
      '--i-read-opts.encoding',
      defaults.inputReadOptions,
      '--stdout',
    ]);

    expect(result.status, 'process should send success status (0)').toEqual(0);
    expect(
      result.parsedOutput,
      'stdout should contain replaced string',
    ).toEqual(expectedOutput);
    expect(result.parsedError, 'stderr should be empty').toEqual('');
  });
});

describe('i-glob-opts argument', async () => {
  let input: tmp.FileResult | undefined, input2: tmp.FileResult | undefined;

  beforeEach(async () => {
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
  });

  afterEach(() => {
    input?.cleanup();
    input = undefined;
    input2?.cleanup();
    input2 = undefined;
  });

  test('set without input argument', () => {
    const result = runCli(
      [
        needle,
        replacement,
        '--i-glob-opts.onlyDirectories',
        'true',
        '--stdout',
      ],
      { input: content },
    );

    expect(result.status, 'process should send error status (1)').toEqual(1);
    expect(result.parsedOutput, 'stdout should be empty').toEqual('');
    expect(
      result.parsedError,
      'stderr contain error about missing i-glob-opts dependency: i argument',
    ).toEqual('Missing required argument: i');
  });

  test('set with input argument', () => {
    const result = runCli([
      needle,
      replacement,
      '-i',
      input!.path,
      '--i-glob-opts.onlyDirectories',
      'true',
      '--stdout',
    ]);

    expect(result.status, 'process should send success status (0)').toEqual(0);
    expect(result.parsedOutput, 'stdout should be empty').toEqual('');
    expect(result.parsedError, 'stderr should be empty').toEqual('');
  });
});

describe('o-join-str argument', () => {
  let input: tmp.FileResult | undefined, input2: tmp.FileResult | undefined;

  beforeEach(async () => {
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
  });

  afterEach(() => {
    input!.cleanup();
    input = undefined;
    input2!.cleanup();
    input2 = undefined;
  });

  test('set with input argument', () => {
    const outputJoinString = 'someCustomString\n\t';
    const result = runCli([
      needle,
      replacement,
      '-i',
      input!.path,
      input2!.path,
      '--o-join-str',
      outputJoinString,
      '--stdout',
    ]);

    expect(result.status, 'process should send success status (0)').toEqual(0);
    expect(
      result.parsedOutput,
      'stdout should contain replaced string',
    ).toEqual(expectedOutput + outputJoinString + expectedOutput);
    expect(result.parsedError, 'stderr should be empty').toEqual('');
  });
});

describe('output argument', async () => {
  const outputPath = (output = tmp.tmpNameSync({ prefix: tmpPrefixes.output }));
  checkEachArgCombination(
    [needle, replacement, '--content', content],
    ['-o', '--output'],
    outputPath,
    (result) => {
      expect(result.status, 'process should send success status (0)').toEqual(
        0,
      );
      expect(result.parsedOutput, 'stdout should be empty').toEqual('');
      expect(result.parsedError, 'stderr should be empty').toEqual('');

      const outputFileContent = fs.readFileSync(outputPath).toString();
      expect(outputFileContent, 'expected output saved to file').toEqual(
        expectedOutput,
      );
    },
  );
});

describe('input options argument', async () => {
  const outputPath = (output = tmp.tmpNameSync({ prefix: tmpPrefixes.output }));

  test('without output argument', async () => {
    const result = runCli(
      [
        needle,
        replacement,
        '--o-write-opts.encoding',
        defaults.outputWriteOptions,
        '--stdout',
      ],
      { input: content },
    );

    expect(result.status, 'process should send error status (1)').toEqual(1);
    expect(result.parsedOutput, 'stdout should be empty').toEqual('');
    expect(
      result.parsedError,
      'stderr contain error about missing i-read-opts dependency: i argument',
    ).toEqual('Missing required argument: i');
  });

  test('correct with input argument', () => {
    const result = runCli(
      [
        needle,
        replacement,
        '-o',
        outputPath,
        '--o-write-opts.encoding',
        defaults.outputWriteOptions,
        '--no-stdout',
      ],
      { input: content },
    );

    console.log('zxczxc', result);

    expect(result.status, 'process should send success status (0)').toEqual(0);
    expect(result.parsedOutput, 'stdout should be empty').toEqual('');
    expect(result.parsedError, 'stderr should be empty').toEqual('');

    const outputFileContent = fs.readFileSync(outputPath).toString();
    expect(outputFileContent, 'expected output saved to file').toEqual(
      expectedOutput,
    );
  });
});

describe('stdin && output argument', () => {
  const outputPath = (output = tmp.tmpNameSync({ prefix: tmpPrefixes.output }));

  checkEachArgCombination(
    [needle, replacement, '--content', content, '--stdout'],
    ['-o', '--output'],
    outputPath,
    (result) => {
      expect(result.status, 'process should send success status (0)').toEqual(
        0,
      );
      expect(
        result.parsedOutput,
        'stdout should contain replaced string',
      ).toEqual(expectedOutput);
      expect(result.parsedError, 'stderr should be empty').toEqual('');

      const outputFileContent = fs.readFileSync(outputPath).toString();
      expect(outputFileContent, 'expected output saved to file').toEqual(
        expectedOutput,
      );
    },
  );
});

describe('flags argument', async () => {
  const flags = 'gm';
  const expectedOutput = content.replace(
    new RegExp(needle, flags),
    replacement,
  );
  const outputPath = (output = tmp.tmpNameSync({ prefix: tmpPrefixes.output }));

  checkEachArgCombination(
    [needle, replacement, '--content', content, '-o', outputPath, '--stdout'],
    ['-f', '--flags'],
    flags,
    (result) => {
      expect(result.status, 'process should send success status (0)').toEqual(
        0,
      );
      expect(
        result.parsedOutput,
        'stdout should contain replaced string',
      ).toEqual(expectedOutput);
      expect(result.parsedError, 'stderr should be empty').toEqual('');

      const outputFileContent = fs.readFileSync(outputPath).toString();
      expect(outputFileContent, 'expected output saved to file').toEqual(
        expectedOutput,
      );
    },
  );
});

describe('replace-fn argument', async () => {
  const expectedOutput = content.replace(
    new RegExp(needle, defaultFlags),
    replaceFn,
  );
  const outputPath = (output = tmp.tmpNameSync({ prefix: tmpPrefixes.output }));
  let replaceFnTmp: tmp.FileResult | undefined;
  const args = [needle, '', '--content', content, '-o', outputPath, '--stdout'];

  beforeAll(async () => {
    await tmp
      .file({ prefix: tmpPrefixes.input, keep: true, dir, postfix: '.js' })
      .then(async (f) => {
        replaceFnTmp = f;
        return new Promise((resolve) =>
          fs.appendFile(
            f.path,
            `module.exports=${replaceFn.toString().replace('replacement', `"${replacement}"`)}`,
            { encoding: defaults.inputReadOptions },
            resolve,
          ),
        );
      });
    args[1] = replaceFnTmp!.path;
  });

  afterAll(() => {
    replaceFnTmp!.cleanup();
    replaceFnTmp = undefined;
  });

  checkEachArgCombination(args, ['-r', '--replace-fn'], undefined, (result) => {
    expect(result.status, 'process should send success status (0)').toEqual(0);
    expect(
      result.parsedOutput,
      'stdout should contain replaced string',
    ).toEqual(expectedOutput);
    expect(result.parsedError, 'stderr should be empty').toEqual('');

    const outputFileContent = fs.readFileSync(outputPath).toString();
    expect(outputFileContent, 'expected output saved to file').toEqual(
      expectedOutput,
    );
  });
});

test('stdin stream as input argument (like piped stream)', async () => {
  const result = runCli([needle, replacement, '--stdout'], { input: content });

  expect(result.status, 'process should send success status (0)').toEqual(0);
  expect(result.parsedOutput, 'stdout should contain replaced string').toEqual(
    expectedOutput,
  );
  expect(result.parsedError, 'stderr should be empty').toEqual('');
});

function checkEachArgCombination(
  args: string[],
  argCombinations: string[],
  argValue: undefined | string | string[] | (() => string | string[]),
  testFn: (result: ReturnType<typeof runCli>) => void | Promise<void>,
) {
  for (const combination of argCombinations) {
    test(combination, () =>
      testFn(
        runCli(
          [...args, combination].concat(
            (typeof argValue === 'function' ? argValue() : argValue) || [],
          ),
        ),
      ),
    );
  }
}

function runCli(
  _args?: string | string[],
  _options?: Omit<childProcess.SpawnSyncOptionsWithStringEncoding, 'encoding'>,
) {
  _options = Object.assign({}, defaultOptions, _options);
  const result = childProcess.spawnSync(
    'node',
    ['./bin/cli.mjs'].concat(_args || []),
    _options,
  );

  return {
    ...result,
    parsedOutput: result.stdout.toString().trim(),
    parsedError:
      result.stderr.toString().trim().split('\n').pop()?.trim() ?? '',
  };
}

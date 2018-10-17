const tap = require('tap')
const childProcess = require('child_process')
const fs = require('fs')
const tmp = require('tmp-promise')

const tmpPrefix = 'FRS-replace-cli'
const defaultOptions = {
  timeout: 2000
}
const content = `aąbcć
deęfg%hi
jklmn
oópqr,stuvw
xyZ`
const regex = '^[adjox]'
const defaultFlags = 'g'
const replacement = 'ą|'
const replaceFn = () => replacement
const expectedOutput = content.replace(new RegExp(regex, defaultFlags), replacement)
const defaultEncoding = 'utf8'
let output

tap.afterEach((done) => {
  fs.existsSync(output) && fs.unlinkSync(output)
  done()
})

tap.test('no arguments', (t) => {
  const result = runCli()
  t.is(result.status, 1, 'process should send error status (1)')
  t.is(result.parsedOutput, '', 'stdout should be empty')
  t.is(result.parsedError, 'Not enough non-option arguments: got 0, need at least 2', 'stderr should complain about missing arguments')

  t.end()
})

tap.test('one argument', (t) => {
  const result = runCli('sth')
  t.is(result.status, 1, 'process should send error status (1)')
  t.is(result.parsedOutput, '', 'stdout should be empty')
  t.is(result.parsedError, 'Not enough non-option arguments: got 1, need at least 2', 'stderr should complain about missing arguments')

  t.end()
})

tap.test('two arguments', (t) => {
  const result = runCli(['sth', 'sth'])
  t.is(result.status, 1, 'process should send error status (1)')
  t.is(result.parsedOutput, '', 'stdout should be empty')
  t.is(result.parsedError, 'Missing required argument: i')

  t.end()
})

tap.test('content argument', async (t) => {
  await checkEachArgCombinations(
    t,
    [regex, replacement, '--stdout'],
    ['-c', '--content'],
    content,
    (ct, result) => {
      ct.is(result.status, 0, 'process should send success status (0)')
      ct.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.is(result.parsedError, '', 'stderr should be empty')

      ct.end()
    }
  )

  t.end()
})

tap.test('no stdout argument', (t) => {
  const result = runCli([regex, replacement, '--content', content])
  t.is(result.status, 0, 'process should send success status (0)')
  t.is(result.parsedOutput, '', 'stdout should be empty')
  t.is(result.parsedError, '', 'stderr should be empty')

  t.end()
})

tap.test('stdout argument', (t) => {
  const result = runCli([regex, replacement, '--content', content, '--stdout'])
  t.is(result.status, 0, 'process should send success status (0)')
  t.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
  t.is(result.parsedError, '', 'stderr should be empty')

  t.end()
})

tap.test('input argument', async (t) => {
  let input

  t.beforeEach(
    async () => tmp.file({ prefix: tmpPrefix, keep: true }).then(
      async f => {
        input = f
        return new Promise(
          (resolve) => fs.appendFile(f.path, content, { encoding: defaultEncoding }, resolve)
        )
      })
  )

  t.afterEach(done => {
    input.cleanup()
    input = void 0
    done()
  })

  await checkEachArgCombinations(
    t,
    [regex, replacement, '--stdout'],
    ['-i', '--input'],
    () => input.path,
    (ct, result) => {
      ct.is(result.status, 0, 'process should send success status (0)')
      ct.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.is(result.parsedError, '', 'stderr should be empty')

      ct.end()
    }
  )

  t.end()
})

tap.test('input options argument', async (t) => {
  let input

  t.beforeEach(
    async () => tmp.file({ prefix: tmpPrefix, keep: true }).then(
      async f => {
        input = f
        return new Promise(
          (resolve) => fs.appendFile(f.path, content, { encoding: defaultEncoding }, resolve)
        )
      })
  )

  t.afterEach(done => {
    input.cleanup()
    input = void 0
    done()
  })

  t.test('without input argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '--in-opts.encoding', defaultEncoding, '--stdout'],
      { input: content }
    )

    ct.is(result.status, 1, 'process should send error status (1)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.is(result.parsedError, 'in-opts -> i', 'stderr contain error about missing in-opts dependency: i argument')

    ct.end()
  })

  t.test('wrong with input argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '-i', input.path, '--in-opts.encoding', 'incorrect-encoding', '--stdout']
    )

    ct.is(result.status, 1, 'process should send error status (1)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.contains(result.parsedError, 'incorrect-encoding', 'stderr should complain wrong encoding argument')

    ct.end()
  })

  t.test('correct with input argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '-i', input.path, '--in-opts.encoding', defaultEncoding, '--stdout']
    )

    ct.is(result.status, 0, 'process should send success status (0)')
    ct.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
    ct.is(result.parsedError, '', 'stderr should be empty')

    ct.end()
  })

  t.end()
})

tap.test('output argument', async (t) => {
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefix })
  await checkEachArgCombinations(
    t,
    [regex, replacement, '--content', content],
    ['-o', '--output'],
    outputPath,
    (ct, result) => {
      ct.is(result.status, 0, 'process should send success status (0)')
      ct.is(result.parsedOutput, '', 'stdout should be empty')
      ct.is(result.parsedError, '', 'stderr should be empty')

      const outputFileContent = fs.readFileSync(outputPath).toString()
      ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

      ct.end()
    }
  )

  t.end()
})

tap.test('input options argument', async (t) => {
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefix })

  t.test('without output argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '--out-opts.encoding', defaultEncoding, '--stdout'],
      { input: content }
    )

    ct.is(result.status, 1, 'process should send error status (1)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.is(result.parsedError, 'out-opts -> o', 'stderr contain error about missing in-opts dependency: i argument')

    ct.end()
  })

  t.test('correct with input argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '-o', outputPath, '--out-opts.encoding', defaultEncoding, '--no-stdout'],
      { input: content }
    )

    ct.is(result.status, 0, 'process should send success status (0)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.is(result.parsedError, '', 'stderr should be empty')

    const outputFileContent = fs.readFileSync(outputPath).toString()
    ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

    ct.end()
  })

  t.end()
})

tap.test('stdin && output argument', async (t) => {
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefix })

  await checkEachArgCombinations(
    t,
    [regex, replacement, '--content', content, '--stdout'],
    ['-o', '--output'],
    outputPath,
    (ct, result) => {
      ct.is(result.status, 0, 'process should send success status (0)')
      ct.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.is(result.parsedError, '', 'stderr should be empty')

      const outputFileContent = fs.readFileSync(outputPath).toString()
      ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

      ct.end()
    }
  )

  t.end()
})

tap.test('flags argument', async (t) => {
  const flags = 'gm'
  const expectedOutput = content.replace(new RegExp(regex, flags), replacement)
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefix })

  await checkEachArgCombinations(
    t,
    [regex, replacement, '--content', content, '-o', outputPath, '--stdout'],
    ['-f', '--flags'],
    flags,
    (ct, result) => {
      ct.is(result.status, 0, 'process should send success status (0)')
      ct.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.is(result.parsedError, '', 'stderr should be empty')

      const outputFileContent = fs.readFileSync(outputPath).toString()
      ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

      ct.end()
    }
  )

  t.end()
})

tap.test('replace-fn argument', async (t) => {
  const expectedOutput = content.replace(new RegExp(regex, defaultFlags), replaceFn)
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefix })
  let replaceFnTmp = void 0

  await tmp.file({ prefix: tmpPrefix, keep: true, postfix: '.js' })
    .then(
      async f => {
        replaceFnTmp = f
        return new Promise(
          (resolve) =>
            fs.appendFile(
              f.path,
              `module.exports=${replaceFn.toString().replace('replacement', `"${replacement}"`)}`,
              { encoding: defaultEncoding },
              resolve
            )
        )
      })

  await checkEachArgCombinations(
    t,
    [regex, replaceFnTmp.path, '--content', content, '-o', outputPath, '--stdout'],
    ['-r', '--replace-fn'],
    void 0,
    (ct, result) => {
      ct.is(result.status, 0, 'process should send success status (0)')
      ct.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.is(result.parsedError, '', 'stderr should be empty')

      const outputFileContent = fs.readFileSync(outputPath).toString()
      ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

      ct.end()
    }
  )

  replaceFnTmp.cleanup()
  replaceFnTmp = void 0

  t.end()
})

tap.test('stdin stream as input argument (like piped stream)', async (t) => {
  const result = runCli(
    [regex, replacement, '--stdout'],
    { input: content }
  )

  t.is(result.status, 0, 'process should send success status (0)')
  t.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
  t.is(result.parsedError, '', 'stderr should be empty')

  t.end()
})

async function checkEachArgCombinations (t, args, argCombinations, argValue, testFn) {
  for (const combination of argCombinations) {
    await t.test(combination, ct =>
      testFn(
        ct,
        runCli(
          [...args, combination]
            .concat(
              (
                typeof argValue === 'function'
                  ? argValue()
                  : argValue
              ) || []
            )
        )
      )
    )
  }
}

function runCli (_args, _options) {
  _options = Object.assign({}, defaultOptions, _options)
  const result = childProcess.spawnSync('node', ['./bin/cli'].concat(_args || []), _options)

  result.parsedOutput = result.stdout.toString().trim()
  result.parsedError = result.stderr.toString().trim().split('\n').pop().trim()

  return result
}

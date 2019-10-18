const tap = require('tap')
const childProcess = require('child_process')
const fs = require('fs')
const tmp = require('tmp-promise')
const glob = require('fast-glob')
const path = require('path')

const tmpPrefixes = {
  input: 'FRS-replace-cli-in',
  output: 'FRS-replace-cli-out'
}
const defaultOptions = {
  timeout: 2000
}
const content = `aąbcćdeęfg%hi
jklmn
oópqr,stuvwxyZ`
const regex = '^[adjox]'
const defaultFlags = 'g'
const replacement = 'ą|'
const replaceFn = () => replacement
const expectedOutput = content.replace(new RegExp(regex, defaultFlags), replacement)
const defaults = {
  inputReadOptions: 'utf8',
  outputWriteOptions: 'utf8',
  inputJoinString: '\n'
}
let output, dir

{
  const dirObj = tmp.dirSync() // removing all files similar our tmp
  dir = dirObj.name

  glob.sync(
    [
      path.join(dir, tmpPrefixes.input),
      path.join(dir, tmpPrefixes.output)
    ].map(v => v + '*')
  )
    .forEach(fs.unlinkSync)
}

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
  let input, input2
  const cleanInputs = done => {
    input && input.cleanup()
    input = undefined
    input2 && input2.cleanup()
    input2 = undefined
    done && done()
  }

  t.beforeEach(
    async () => {
      cleanInputs()
      await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir }).then(
        async f => {
          input = f
          return new Promise(
            (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
          )
        })
      await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir }).then(
        async f => {
          input2 = f
          return new Promise(
            (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
          )
        })
    }
  )

  t.afterEach(cleanInputs)

  await t.test('as single file path', async ct => {
    await checkEachArgCombinations(
      ct,
      [regex, replacement, '--stdout'],
      ['-i', '--input'],
      () => input.path,
      (cct, result) => {
        cct.is(result.status, 0, 'process should send success status (0)')
        cct.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
        cct.is(result.parsedError, '', 'stderr should be empty')

        cct.end()
      }
    )

    ct.end()
  })

  await t.test('as array of file paths', async ct => {
    await checkEachArgCombinations(
      ct,
      [regex, replacement, '--stdout'],
      ['-i', '--input'],
      () => [input.path, input2.path],
      (cct, result) => {
        cct.is(result.status, 0, 'process should send success status (0)')
        cct.is(result.parsedOutput, expectedOutput + defaults.inputJoinString + expectedOutput, 'stdout should contain replaced string')
        cct.is(result.parsedError, '', 'stderr should be empty')

        cct.end()
      }
    )

    ct.end()
  })

  await t.test('as glob pattern', async ct => {
    await checkEachArgCombinations(
      ct,
      [regex, replacement, '--stdout'],
      ['-i', '--input'],
      `${dir}/${tmpPrefixes.input}*`,
      (cct, result) => {
        cct.is(result.status, 0, 'process should send success status (0)')
        cct.is(result.parsedOutput, expectedOutput + defaults.inputJoinString + expectedOutput, 'stdout should contain replaced string')
        cct.is(result.parsedError, '', 'stderr should be empty')

        cct.end()
      }
    )

    ct.end()
  })

  t.end()
})

tap.test('i-read-opts argument', async (t) => {
  let input

  t.beforeEach(
    async () => tmp.file({ prefix: tmpPrefixes.input, keep: true, dir }).then(
      async f => {
        input = f
        return new Promise(
          (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
        )
      })
  )

  t.afterEach(done => {
    input.cleanup()
    input = undefined
    done()
  })

  await t.test('without input argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '--i-read-opts.encoding', defaults.inputReadOptions, '--stdout'],
      { input: content }
    )

    ct.is(result.status, 1, 'process should send error status (1)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.is(result.parsedError, 'i-read-opts -> i', 'stderr contain error about missing i-read-opts dependency: i argument')

    ct.end()
  })

  await t.test('wrong with input argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '-i', input.path, '--i-read-opts.encoding', 'incorrect-encoding', '--stdout']
    )

    ct.is(result.status, 1, 'process should send error status (1)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.contains(result.parsedError, 'incorrect-encoding', 'stderr should complain wrong encoding argument')

    ct.end()
  })

  await t.test('correct with input argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '-i', input.path, '--i-read-opts.encoding', defaults.inputReadOptions, '--stdout']
    )

    ct.is(result.status, 0, 'process should send success status (0)')
    ct.is(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
    ct.is(result.parsedError, '', 'stderr should be empty')

    ct.end()
  })

  t.end()
})

tap.test('i-glob-opts argument', async (t) => {
  let input, input2

  t.beforeEach(
    async () => {
      await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir }).then(
        async f => {
          input = f
          return new Promise(
            (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
          )
        })
      await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir }).then(
        async f => {
          input2 = f
          return new Promise(
            (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
          )
        })
    }
  )

  t.afterEach(done => {
    input.cleanup()
    input = undefined
    input2.cleanup()
    input2 = undefined
    done()
  })

  await t.test('set without input argument', (ct) => {
    const result = runCli(
      [regex, replacement, '--i-glob-opts.onlyDirectories', true, '--stdout'],
      { input: content }
    )

    ct.is(result.status, 1, 'process should send error status (1)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.is(result.parsedError, 'i-glob-opts -> i', 'stderr contain error about missing i-glob-opts dependency: i argument')

    ct.end()
  })

  await t.test('set with input argument', (ct) => {
    const result = runCli(
      [regex, replacement, '-i', input.path, '--i-glob-opts.onlyDirectories', true, '--stdout']
    )

    ct.is(result.status, 0, 'process should send success status (0)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.is(result.parsedError, '', 'stderr should be empty')

    ct.end()
  })

  t.end()
})

tap.test('i-join-str argument', async (t) => {
  let input, input2

  t.beforeEach(
    async () => {
      await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir }).then(
        async f => {
          input = f
          return new Promise(
            (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
          )
        })
      await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir }).then(
        async f => {
          input2 = f
          return new Promise(
            (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
          )
        })
    }
  )

  t.afterEach(done => {
    input.cleanup()
    input = undefined
    input2.cleanup()
    input2 = undefined
    done()
  })

  await t.test('set without input argument', (ct) => {
    const result = runCli(
      [regex, replacement, '--i-join-str', 'sth', '--stdout'],
      { input: content }
    )

    ct.is(result.status, 1, 'process should send error status (1)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.is(result.parsedError, 'i-join-str -> i', 'stderr contain error about missing i-join-str dependency: i argument')

    ct.end()
  })

  await t.test('set with input argument', (ct) => {
    const inputJoinString = 'someCustomString\n\t'
    const result = runCli(
      [regex, replacement, '-i', input.path, input2.path, '--i-join-str', inputJoinString, '--stdout']
    )

    ct.is(result.status, 0, 'process should send success status (0)')
    ct.is(result.parsedOutput, expectedOutput + inputJoinString + expectedOutput, 'stdout should contain replaced string')
    ct.is(result.parsedError, '', 'stderr should be empty')

    ct.end()
  })

  t.end()
})

tap.test('output argument', async (t) => {
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })
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
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })

  t.test('without output argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '--o-write-opts.encoding', defaults.outputWriteOptions, '--stdout'],
      { input: content }
    )

    ct.is(result.status, 1, 'process should send error status (1)')
    ct.is(result.parsedOutput, '', 'stdout should be empty')
    ct.is(result.parsedError, 'o-write-opts -> o', 'stderr contain error about missing i-read-opts dependency: i argument')

    ct.end()
  })

  t.test('correct with input argument', async (ct) => {
    const result = runCli(
      [regex, replacement, '-o', outputPath, '--o-write-opts.encoding', defaults.outputWriteOptions, '--no-stdout'],
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
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })

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
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })

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
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })
  let replaceFnTmp

  await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir, postfix: '.js' })
    .then(
      async f => {
        replaceFnTmp = f
        return new Promise(
          (resolve) =>
            fs.appendFile(
              f.path,
              `module.exports=${replaceFn.toString().replace('replacement', `"${replacement}"`)}`,
              { encoding: defaults.inputReadOptions },
              resolve
            )
        )
      })

  await checkEachArgCombinations(
    t,
    [regex, replaceFnTmp.path, '--content', content, '-o', outputPath, '--stdout'],
    ['-r', '--replace-fn'],
    undefined,
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
  replaceFnTmp = undefined

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

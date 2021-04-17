const tap = require('tap')
const childProcess = require('child_process')
const fs = require('fs')
const tmp = require('tmp-promise')
const glob = require('fast-glob')
const path = require('path')

const tmpPrefixes = {
  input: 'frs-replace-cli-in',
  output: 'frs-replace-cli-out'
}
const defaultOptions = {
  timeout: 2000
}
const content = `aąbcćdeęfg%hi
jklmn
oópqr,stuvwxyZ`
const needle = '^[adjox]'
const defaultFlags = 'g'
const replacement = 'ą|'
const replaceFn = () => replacement
const expectedOutput = content.replace(new RegExp(needle, defaultFlags), replacement)
const defaults = {
  inputReadOptions: 'utf8',
  outputWriteOptions: 'utf8',
  outputJoinString: '\n'
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

tap.afterEach(() => {
  fs.existsSync(output) && (fs.lstatSync(output).isDirectory()
    ? fs.rmdirSync(output)
    : fs.unlinkSync(output))
})

tap.test('no arguments', (t) => {
  const result = runCli()
  t.equal(result.status, 1, 'process should send error status (1)')
  t.equal(result.parsedOutput, '', 'stdout should be empty')
  t.equal(result.parsedError, 'Not enough non-option arguments: got 0, need at least 2', 'stderr should complain about missing arguments')

  t.end()
})

tap.test('one argument', (t) => {
  const result = runCli('sth')
  t.equal(result.status, 1, 'process should send error status (1)')
  t.equal(result.parsedOutput, '', 'stdout should be empty')
  t.equal(result.parsedError, 'Not enough non-option arguments: got 1, need at least 2', 'stderr should complain about missing arguments')

  t.end()
})

tap.test('two arguments', (t) => {
  const result = runCli(['sth', 'sth'])
  t.equal(result.status, 1, 'process should send error status (1)')
  t.equal(result.parsedOutput, '', 'stdout should be empty')
  t.equal(result.parsedError, 'Missing required argument: i')

  t.end()
})

tap.test('content argument', async (t) => {
  await checkEachArgCombination(
    t,
    [needle, replacement, '--stdout'],
    ['-c', '--content'],
    content,
    (ct, result) => {
      ct.equal(result.status, 0, 'process should send success status (0)')
      ct.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.equal(result.parsedError, '', 'stderr should be empty')

      ct.end()
    }
  )

  t.end()
})

tap.test('no stdout argument', (t) => {
  const result = runCli([needle, replacement, '--content', content])
  t.equal(result.status, 0, 'process should send success status (0)')
  t.equal(result.parsedOutput, '', 'stdout should be empty')
  t.equal(result.parsedError, '', 'stderr should be empty')

  t.end()
})

tap.test('stdout argument', (t) => {
  const result = runCli([needle, replacement, '--content', content, '--stdout'])
  t.equal(result.status, 0, 'process should send success status (0)')
  t.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
  t.equal(result.parsedError, '', 'stderr should be empty')

  t.end()
})

tap.test('input argument', async (t) => {
  let input, input2
  const cleanInputs = () => {
    input && input.cleanup()
    input = undefined
    input2 && input2.cleanup()
    input2 = undefined
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
    await checkEachArgCombination(
      ct,
      [needle, replacement, '--stdout'],
      ['-i', '--input'],
      () => input.path,
      (cct, result) => {
        cct.equal(result.status, 0, 'process should send success status (0)')
        cct.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
        cct.equal(result.parsedError, '', 'stderr should be empty')

        cct.end()
      }
    )

    ct.end()
  })

  await t.test('as array of file paths with strategy="flatten"', async ct => {
    const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })
    await checkEachArgCombination(
      ct,
      [needle, replacement, '--stdout', '--strategy', 'flatten', '--output', outputPath],
      ['-i', '--input'],
      () => [input.path, input2.path],
      (cct, result) => {
        cct.equal(result.status, 0, 'process should send success status (0)')
        cct.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
        cct.equal(result.parsedError, '', 'stderr should be empty')

        const outputFilePath = path.join(outputPath, input.path.substring(input.path.lastIndexOf(path.sep)))
        const outputFileContent = fs.readFileSync(outputFilePath).toString()
        ct.equal(outputFileContent, expectedOutput, 'expected output saved to file')

        const outputFilePath2 = path.join(outputPath, input2.path.substring(input2.path.lastIndexOf(path.sep)))
        const outputFileContent2 = fs.readFileSync(outputFilePath2).toString()
        ct.equal(outputFileContent2, expectedOutput, 'expected output saved to file')

        fs.unlinkSync(outputFilePath)
        fs.unlinkSync(outputFilePath2)

        cct.end()
      }
    )

    ct.end()
  })

  await t.test('as array of file paths with strategy="preserve-structure"', async ct => {
    const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })
    await checkEachArgCombination(
      ct,
      [needle, replacement, '--stdout', '--strategy', 'preserve-structure', '--output', outputPath],
      ['-i', '--input'],
      () => [input.path, input2.path],
      (cct, result) => {
        cct.equal(result.status, 0, 'process should send success status (0)')
        cct.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
        cct.equal(result.parsedError, '', 'stderr should be empty')

        const outputFilePath = path.join(outputPath, input.path)
        const outputFileContent = fs.readFileSync(outputFilePath).toString()
        ct.equal(outputFileContent, expectedOutput, 'expected output saved to file')

        const outputFilePath2 = path.join(outputPath, input2.path)
        const outputFileContent2 = fs.readFileSync(outputFilePath2).toString()
        ct.equal(outputFileContent2, expectedOutput, 'expected output saved to file')

        fs.unlinkSync(outputFilePath)
        fs.unlinkSync(outputFilePath2)

        const splittedPath = input.path.split(path.sep)
        splittedPath.pop()
        while (splittedPath.length) {
          const outputDir = splittedPath.join(path.sep)
          fs.rmdirSync(path.join(outputPath, outputDir))
          splittedPath.pop()
        }

        cct.end()
      }
    )

    ct.end()
  })

  await t.test('as glob pattern', async ct => {
    await checkEachArgCombination(
      ct,
      [needle, replacement, '--stdout'],
      ['-i', '--input'],
      `${dir}/${tmpPrefixes.input}*`,
      (cct, result) => {
        cct.equal(result.status, 0, 'process should send success status (0)')
        cct.equal(result.parsedOutput, expectedOutput + defaults.outputJoinString + expectedOutput, 'stdout should contain replaced string')
        cct.equal(result.parsedError, '', 'stderr should be empty')

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

  t.afterEach(() => {
    input.cleanup()
    input = undefined
  })

  await t.test('without input argument', async (ct) => {
    const result = runCli(
      [needle, replacement, '--i-read-opts.encoding', defaults.inputReadOptions, '--stdout'],
      { input: content }
    )

    ct.equal(result.status, 1, 'process should send error status (1)')
    ct.equal(result.parsedOutput, '', 'stdout should be empty')
    ct.equal(result.parsedError, 'i-read-opts -> i', 'stderr contain error about missing i-read-opts dependency: i argument')

    ct.end()
  })

  await t.test('wrong with input argument', async (ct) => {
    const result = runCli(
      [needle, replacement, '-i', input.path, '--i-read-opts.encoding', 'incorrect-encoding', '--stdout']
    )

    ct.equal(result.status, 1, 'process should send error status (1)')
    ct.equal(result.parsedOutput, '', 'stdout should be empty')
    ct.has(result.parsedError, 'TypeError [ERR_INVALID_ARG_VALUE]: The argument \'incorrect-encoding\' is invalid encoding. Received \'encoding\'', 'stderr should complain wrong encoding argument')

    ct.end()
  })

  await t.test('correct with input argument', async (ct) => {
    const result = runCli(
      [needle, replacement, '-i', input.path, '--i-read-opts.encoding', defaults.inputReadOptions, '--stdout']
    )

    ct.equal(result.status, 0, 'process should send success status (0)')
    ct.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
    ct.equal(result.parsedError, '', 'stderr should be empty')

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

  t.afterEach(() => {
    input.cleanup()
    input = undefined
    input2.cleanup()
    input2 = undefined
  })

  await t.test('set without input argument', (ct) => {
    const result = runCli(
      [needle, replacement, '--i-glob-opts.onlyDirectories', true, '--stdout'],
      { input: content }
    )

    ct.equal(result.status, 1, 'process should send error status (1)')
    ct.equal(result.parsedOutput, '', 'stdout should be empty')
    ct.equal(result.parsedError, 'i-glob-opts -> i', 'stderr contain error about missing i-glob-opts dependency: i argument')

    ct.end()
  })

  await t.test('set with input argument', (ct) => {
    const result = runCli(
      [needle, replacement, '-i', input.path, '--i-glob-opts.onlyDirectories', true, '--stdout']
    )

    ct.equal(result.status, 0, 'process should send success status (0)')
    ct.equal(result.parsedOutput, '', 'stdout should be empty')
    ct.equal(result.parsedError, '', 'stderr should be empty')

    ct.end()
  })

  t.end()
})

tap.test('o-join-str argument', async (t) => {
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

  t.afterEach(() => {
    input.cleanup()
    input = undefined
    input2.cleanup()
    input2 = undefined
  })

  await t.test('set with input argument', (ct) => {
    const outputJoinString = 'someCustomString\n\t'
    const result = runCli(
      [needle, replacement, '-i', input.path, input2.path, '--o-join-str', outputJoinString, '--stdout']
    )

    ct.equal(result.status, 0, 'process should send success status (0)')
    ct.equal(result.parsedOutput, expectedOutput + outputJoinString + expectedOutput, 'stdout should contain replaced string')
    ct.equal(result.parsedError, '', 'stderr should be empty')

    ct.end()
  })

  t.end()
})

tap.test('output argument', async (t) => {
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })
  await checkEachArgCombination(
    t,
    [needle, replacement, '--content', content],
    ['-o', '--output'],
    outputPath,
    (ct, result) => {
      ct.equal(result.status, 0, 'process should send success status (0)')
      ct.equal(result.parsedOutput, '', 'stdout should be empty')
      ct.equal(result.parsedError, '', 'stderr should be empty')

      const outputFileContent = fs.readFileSync(outputPath).toString()
      ct.equal(outputFileContent, expectedOutput, 'expected output saved to file')

      ct.end()
    }
  )

  t.end()
})

tap.test('input options argument', async (t) => {
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })

  t.test('without output argument', async (ct) => {
    const result = runCli(
      [needle, replacement, '--o-write-opts.encoding', defaults.outputWriteOptions, '--stdout'],
      { input: content }
    )

    ct.equal(result.status, 1, 'process should send error status (1)')
    ct.equal(result.parsedOutput, '', 'stdout should be empty')
    ct.equal(result.parsedError, 'o-write-opts -> o', 'stderr contain error about missing i-read-opts dependency: i argument')

    ct.end()
  })

  t.test('correct with input argument', async (ct) => {
    const result = runCli(
      [needle, replacement, '-o', outputPath, '--o-write-opts.encoding', defaults.outputWriteOptions, '--no-stdout'],
      { input: content }
    )

    ct.equal(result.status, 0, 'process should send success status (0)')
    ct.equal(result.parsedOutput, '', 'stdout should be empty')
    ct.equal(result.parsedError, '', 'stderr should be empty')

    const outputFileContent = fs.readFileSync(outputPath).toString()
    ct.equal(outputFileContent, expectedOutput, 'expected output saved to file')

    ct.end()
  })

  t.end()
})

tap.test('stdin && output argument', async (t) => {
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })

  await checkEachArgCombination(
    t,
    [needle, replacement, '--content', content, '--stdout'],
    ['-o', '--output'],
    outputPath,
    (ct, result) => {
      ct.equal(result.status, 0, 'process should send success status (0)')
      ct.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.equal(result.parsedError, '', 'stderr should be empty')

      const outputFileContent = fs.readFileSync(outputPath).toString()
      ct.equal(outputFileContent, expectedOutput, 'expected output saved to file')

      ct.end()
    }
  )

  t.end()
})

tap.test('flags argument', async (t) => {
  const flags = 'gm'
  const expectedOutput = content.replace(new RegExp(needle, flags), replacement)
  const outputPath = output = tmp.tmpNameSync({ prefix: tmpPrefixes.output })

  await checkEachArgCombination(
    t,
    [needle, replacement, '--content', content, '-o', outputPath, '--stdout'],
    ['-f', '--flags'],
    flags,
    (ct, result) => {
      ct.equal(result.status, 0, 'process should send success status (0)')
      ct.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.equal(result.parsedError, '', 'stderr should be empty')

      const outputFileContent = fs.readFileSync(outputPath).toString()
      ct.equal(outputFileContent, expectedOutput, 'expected output saved to file')

      ct.end()
    }
  )

  t.end()
})

tap.test('replace-fn argument', async (t) => {
  const expectedOutput = content.replace(new RegExp(needle, defaultFlags), replaceFn)
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

  await checkEachArgCombination(
    t,
    [needle, replaceFnTmp.path, '--content', content, '-o', outputPath, '--stdout'],
    ['-r', '--replace-fn'],
    undefined,
    (ct, result) => {
      ct.equal(result.status, 0, 'process should send success status (0)')
      ct.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
      ct.equal(result.parsedError, '', 'stderr should be empty')

      const outputFileContent = fs.readFileSync(outputPath).toString()
      ct.equal(outputFileContent, expectedOutput, 'expected output saved to file')

      ct.end()
    }
  )

  replaceFnTmp.cleanup()
  replaceFnTmp = undefined

  t.end()
})

tap.test('stdin stream as input argument (like piped stream)', async (t) => {
  const result = runCli(
    [needle, replacement, '--stdout'],
    { input: content }
  )

  t.equal(result.status, 0, 'process should send success status (0)')
  t.equal(result.parsedOutput, expectedOutput, 'stdout should contain replaced string')
  t.equal(result.parsedError, '', 'stderr should be empty')

  t.end()
})

async function checkEachArgCombination (t, args, argCombinations, argValue, testFn) {
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

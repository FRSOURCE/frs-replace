const tap = require('tap')
const tmp = require('tmp-promise')
const fs = require('fs')
const path = require('path')
const glob = require('fast-glob')

const replace = require('../index.js')

const tmpPrefixes = {
  input: 'frs-replace-replace-in',
  output: 'frs-replace-replace-out'
}
const content = `aąbcćdeęfg%hi
jklmn
oópqr,stuvwxyZ`
const needle = /^[adjox]/gm
const replacement = 'ą|'
const replaceFn = () => replacement
const defaults = {
  inputReadOptions: 'utf8',
  outputWriteOptions: 'utf8',
  outputJoinString: '\n'
}
let output, dir

let input, input2

const cleanInputs = (done) => {
  input2 && input2.cleanup()
  input2 = undefined
  input && input.cleanup()
  input = undefined
  done && done() // to be runned either by node-tap or manually
}

const createInputs = async () => {
  await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir })
    .then(
      async f => {
        input = f
        return new Promise(
          (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
        )
      })
  await tmp.file({ prefix: tmpPrefixes.input, keep: true, dir })
    .then(
      async f => {
        input2 = f
        return new Promise(
          (resolve) => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
        )
      })
}

{ // removing all files similar our tmp
  const dirObj = tmp.dirSync()
  dir = dirObj.name

  glob.sync(
    [
      path.join(dir, tmpPrefixes.input),
      path.join(dir, tmpPrefixes.output)
    ].map(v => v + '*')
  )
    .forEach(fs.unlinkSync)
}

tap.Test.prototype.addAssert('arrayContaining', 2, arrayContainingAssert)
tap.Test.prototype.addAssert('throwsMessageObj', 2, throwsMessageObjAssert)
tap.afterEach((done) => {
  fs.existsSync(output) && (fs.lstatSync(output).isDirectory()
    ? fs.rmdirSync(output)
    : fs.unlinkSync(output))
  done()
})

tap.test('check required fields', async t => {
  await t.throwsMessageObj({}, 'frs-replace :: at least one input source must be defined!', 'if both stdin & input arguments missing')

  t.end()
})

tap.test('check api', async t => {
  let expectedOutput
  let testInput

  t.beforeEach(async () => {
    testInput = {
      needle,
      replacement
    }

    expectedOutput = [['', content.replace(needle, replacement)]]
  })

  await t.test('content', async t => {
    testInput.content = content
    await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

    await t.test('with strategy = "flatten"', async t => {
      testInput.content = content
      testInput.strategy = 'flatten'
      await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

      t.end()
    })

    await t.test('strategy = "preserve-structure"', async t => {
      testInput.content = content
      testInput.strategy = 'flatten'
      await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

      t.end()
    })

    t.end()
  })

  await t.test('input', async t => {
    t.beforeEach(async () => {
      cleanInputs()

      await createInputs()
    })

    t.afterEach(cleanInputs)

    await t.test('as single file path', async t => {
      testInput.input = input.path
      await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

      await t.test('with inputReadOptions as object', async t => {
        testInput.input = input.path
        testInput.inputReadOptions = { encoding: defaults.inputReadOptions }

        await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

        t.end()
      })

      t.end()
    })

    await t.test('as array of file paths', async t => {
      testInput.input = [input.path, input2.path]
      await checkSyncAsync(t, 'looseEqual', [testInput, [[
        '',
        expectedOutput[0][1] + defaults.outputJoinString + expectedOutput[0][1]
      ]], 'replaced correctly'])

      await t.test('with outputJoinString changed', async t => {
        testInput.input = [input.path, input2.path]
        testInput.outputJoinString = 'someCustomString\n\t'

        await checkSyncAsync(t, 'looseEqual', [testInput, [[
          '',
          expectedOutput[0][1] + testInput.outputJoinString + expectedOutput[0][1]
        ]], 'replaced correctly'])

        t.end()
      })

      await t.test('with strategy = "flatten"', async t => {
        testInput.input = [input.path, input2.path]
        testInput.strategy = 'flatten'
        await checkSyncAsync(t, 'looseEqual', [testInput, [
          [input.path.substring(input.path.lastIndexOf('/')), expectedOutput[0][1]],
          [input2.path.substring(input.path.lastIndexOf('/')), expectedOutput[0][1]]
        ], 'replaced correctly with proper filepaths'])

        t.end()
      })

      await t.test('with strategy = "preserve-structure"', async t => {
        testInput.input = [input.path, input2.path]
        testInput.strategy = 'preserve-structure'
        await checkSyncAsync(t, 'looseEqual', [testInput, [
          [input.path, expectedOutput[0][1]],
          [input2.path, expectedOutput[0][1]]
        ], 'replaced correctly with proper filepaths'])

        t.end()
      })

      t.end()
    })

    await t.test('as glob pattern', async t => {
      testInput.input = `${dir}/${tmpPrefixes.input}*`

      await checkSyncAsync(t, 'looseEqual', [testInput, [[
        '',
        expectedOutput[0][1] + defaults.outputJoinString + expectedOutput[0][1]
      ]], 'replaced correctly'])

      await t.test('with inputGlobOptions', async t => {
        testInput.input = `${dir}/${tmpPrefixes.input}*`
        testInput.inputGlobOptions = { onlyDirectories: true }

        await checkSyncAsync(t, 'looseEqual', [testInput, [['', '']], 'replaced correctly'])

        t.end()
      })

      await t.test('with strategy = "flatten"', async t => {
        const message = 'replaced correctly with proper filepaths'
        testInput.input = `${dir}/${tmpPrefixes.input}*`
        testInput.strategy = 'flatten'
        expectedOutput = [
          [input.path.substring(input.path.lastIndexOf(path.sep)), expectedOutput[0][1]],
          [input2.path.substring(input.path.lastIndexOf(path.sep)), expectedOutput[0][1]]
        ]
        t.arrayContaining(await Promise.all(await replace.async(testInput)), expectedOutput, `async :: ${message}`)
        t.arrayContaining(replace.sync(testInput), expectedOutput, `sync :: ${message}`)

        t.end()
      })

      await t.test('with strategy = "preserve-structure"', async t => {
        const message = 'replaced correctly with proper filepaths'
        testInput.input = `${dir}/${tmpPrefixes.input}*`
        testInput.strategy = 'preserve-structure'
        expectedOutput = [
          [input.path, expectedOutput[0][1]],
          [input2.path, expectedOutput[0][1]]
        ]
        t.arrayContaining(await Promise.all(await replace.async(testInput)), expectedOutput, `async :: ${message}`)
        t.arrayContaining(replace.sync(testInput), expectedOutput, `sync :: ${message}`)

        t.end()
      })

      t.end()
    })

    t.end()
  })

  await t.test('strategy', async t => {
    await t.test('if unsupported strategy used', async t => {
      await t.throwsMessageObj({ content: 'qwe', strategy: 'whatever' }, 'frs-replace :: unsupported strategy used! Possible values are: "join", "preserve-structure" or "flatten"')

      t.end()
    })

    t.end()
  })

  await t.test('output', async t => {
    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir })
    expectedOutput = [[
      output,
      expectedOutput[0][1]
    ]]

    await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

    t.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    t.is(outputFileContent, expectedOutput[0][1], 'expected output saved to file')

    t.beforeEach(async () => {
      cleanInputs()

      await createInputs()
    })

    t.afterEach(cleanInputs)

    await t.test('with strategy = "flatten"', async t => {
      testInput.input = [input.path, input2.path]
      output = testInput.output = path.join(dir, tmpPrefixes.output, 'flatten')
      testInput.strategy = 'flatten'
      expectedOutput = [
        [
          path.join(dir, tmpPrefixes.output, 'flatten') + input.path.substring(input.path.lastIndexOf('/')),
          expectedOutput[0][1]
        ],
        [
          path.join(dir, tmpPrefixes.output, 'flatten') + input2.path.substring(input.path.lastIndexOf('/')),
          expectedOutput[0][1]
        ]
      ]
      await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly with proper filepaths'])

      t.ok(fs.existsSync(expectedOutput[0][0]), 'output file exists')
      t.ok(fs.existsSync(expectedOutput[1][0]), 'output file 2 exists')

      fs.unlinkSync(expectedOutput[0][0])
      fs.unlinkSync(expectedOutput[1][0])

      t.end()
    })

    await t.test('with strategy = "preserve-structure"', async t => {
      testInput.input = [input.path, input2.path]
      output = testInput.output = path.join(dir, tmpPrefixes.output, 'preserve-structure')
      testInput.strategy = 'preserve-structure'
      expectedOutput = [
        [
          path.join(dir, tmpPrefixes.output, 'preserve-structure', input.path),
          expectedOutput[0][1]
        ],
        [
          path.join(dir, tmpPrefixes.output, 'preserve-structure', input2.path),
          expectedOutput[0][1]
        ]
      ]
      await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly with proper filepaths'])

      t.ok(fs.existsSync(expectedOutput[0][0]), 'output file exists')
      t.ok(fs.existsSync(expectedOutput[1][0]), 'output file 2 exists')

      fs.unlinkSync(expectedOutput[0][0])
      fs.unlinkSync(expectedOutput[1][0])

      deleteFolderRecursive(output)

      t.end()
    })

    t.end()
  })

  await t.test('outputWriteOptions as object', async t => {
    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir })
    testInput.outputWriteOptions = { encoding: defaults.outputWriteOptions }
    expectedOutput[0][0] = output

    await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

    t.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    t.is(outputFileContent, expectedOutput[0][1], 'expected output saved to file')

    t.end()
  })

  await t.test('replacement as function', async t => {
    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir })
    testInput.replacement = replaceFn

    expectedOutput[0] = [output, content.replace(needle, replaceFn)]

    await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

    t.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    t.is(outputFileContent, expectedOutput[0][1], 'expected output saved to file')

    t.end()
  })

  await t.test('needle as string', async t => {
    testInput.needle = 'a'
    testInput.content = content

    expectedOutput[0][1] = content.replace(testInput.needle, replacement)

    await checkSyncAsync(t, 'looseEqual', [testInput, expectedOutput, 'replaced correctly'])

    t.end()
  })

  t.end()
})

async function checkSyncAsync (t, method, argsSync, isFirstArgFn = false) {
  if (!(argsSync[0] instanceof Array)) { argsSync[0] = [argsSync[0]] }

  let messageIndex = argsSync.length - 1
  while (typeof argsSync[messageIndex] !== 'string') { --messageIndex }

  const argsAsync = [...argsSync]
  argsAsync[0] = bindArray(replace.async, argsAsync[0])
  argsSync[0] = bindArray(replace.sync, argsSync[0])

  if (!isFirstArgFn) {
    argsAsync[0] = await Promise.all(await argsAsync[0]())
    argsSync[0] = argsSync[0]()
  }
  argsAsync[messageIndex] = `async :: ${argsAsync[messageIndex]}`
  argsSync[messageIndex] = `sync :: ${argsSync[messageIndex]}`

  await t[method].apply(t, argsAsync)
  t[method].apply(t, argsSync)
}

function bindArray (fn, args) {
  return () => fn.apply(fn, args)
}

function handleRejection (promise) {
  promise.catch(() => {}) // to silent Node "PromiseRejectionHandledWarning:" error
  return promise
}

function throwsMessageObjAssert (args, errorMessage, message) {
  const error = { message: errorMessage }
  this.throws(() => replace.sync(args), error, 'sync :: should throw ' + message)
  return this.rejects(handleRejection(replace.async(args)), error, 'async :: should reject promise ' + message)
}

function arrayContainingAssert (array, equalArray, message, extra) {
  message = message || 'should contain items'

  let type;
  [type, message] = arrayContaining(array, equalArray, message)
  return this[type ? 'pass' : 'fail'](message, extra)
}

function arrayContaining (array, equalArray, message) {
  if (!Array.isArray(array) || !Array.isArray(equalArray) || array.length < equalArray.length) {
    return [false, message]
  }

  for (let i = 0; i < equalArray.length; ++i) {
    const item = equalArray[i]
    if (typeof item === 'string') {
      if (!array.includes(item)) {
        return [false,
          `${message}
  Expected:
  ${JSON.stringify(item)}
  
  To be contained within:
  ${JSON.stringify(array)}
          `
        ]
      }
    } else if (Array.isArray(item)) {
      for (let j = 0; j < array.length; ++j) {
        const arrayItem = array[j]
        const [checkResult] = arrayContaining(arrayItem, item)
        if (checkResult !== false) break
        else if (j === array.length - 1) {
          return [false,
            `${message} 
Expected:
${JSON.stringify(item)}

To be contained within:
${JSON.stringify(array)}
            `
          ]
        }
      }
    } else {
      return [false, `${message} "arrayContainingAssert" unsupported type`]
    }
  }

  return [true, message]
}

function deleteFolderRecursive (path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file) {
      const curPath = path + '/' + file
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath)
      } else { // delete file
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
};

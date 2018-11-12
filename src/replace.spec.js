const tap = require('tap')
const tmp = require('tmp-promise')
const fs = require('fs')
const path = require('path')
const glob = require('fast-glob')

const replace = require('./replace')

const tmpPrefixes = {
  input: 'FRS-replace-replace-in',
  output: 'FRS-replace-replace-out'
}
const content = `aąbcćdeęfg%hi
jklmn
oópqr,stuvwxyZ`
const regex = new RegExp('^[adjox]', 'gm')
const replacement = 'ą|'
const replaceFn = () => replacement
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

tap.test('check required fields', async t => {
  t.throws(() => replace.sync({}), { message: 'FRS-replace :: at least one input source must be defined!' }, 'sync :: should throw if both stdin & input arguments missing')
  const asyncResult = replace.async({})
  asyncResult.catch(() => {}) // to silent Node "PromiseRejectionHandledWarning:" error
  await t.rejects(asyncResult, { message: 'FRS-replace :: at least one input source must be defined!' }, 'async :: should reject promise if both stdin & input arguments missing')

  t.end()
})

tap.test('check api', async t => {
  let expectedOutput
  let testInput

  t.beforeEach(async () => {
    testInput = {
      regex,
      replacement
    }

    expectedOutput = content.replace(regex, replacement)
  })

  await t.test('content', async ct => {
    testInput.content = content
    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.end()
  })

  await t.test('input', async ct => {
    let input, input2

    const cleanInputs = (done) => {
      input2 && input2.cleanup()
      input2 = void 0
      input && input.cleanup()
      input = void 0
      done && done() // to be runned either by node-tap or manually
    }

    ct.beforeEach(async () => {
      cleanInputs()

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
    })

    ct.afterEach(cleanInputs)

    await ct.test('as single file path', async cct => {
      testInput.input = input.path
      await checkSyncAsync(cct, 'is', [testInput, expectedOutput, 'replaced correctly'])

      await cct.test('with inputReadOptions as object', async ccct => {
        testInput.input = input.path
        testInput.inputReadOptions = { encoding: defaults.inputReadOptions }

        await checkSyncAsync(ccct, 'is', [testInput, expectedOutput, 'replaced correctly'])

        ccct.end()
      })

      cct.end()
    })

    await ct.test('as array of file paths', async cct => {
      testInput.input = [input.path, input2.path]
      await checkSyncAsync(cct, 'is', [testInput, expectedOutput + defaults.inputJoinString + expectedOutput, 'replaced correctly'])

      await cct.test('with inputJoinString changed', async ccct => {
        testInput.input = `${dir}\\${tmpPrefixes.input}*`
        testInput.inputJoinString = 'someCustomString\n\t'

        await checkSyncAsync(ccct, 'is', [testInput, expectedOutput + testInput.inputJoinString + expectedOutput, 'replaced correctly'])

        ccct.end()
      })

      cct.end()
    })

    await ct.test('as glob pattern', async cct => {
      testInput.input = `${dir}\\${tmpPrefixes.input}*`

      await checkSyncAsync(cct, 'is', [testInput, expectedOutput + defaults.inputJoinString + expectedOutput, 'replaced correctly'])

      await cct.test('with inputGlobOptions', async ccct => {
        testInput.input = `${dir}\\${tmpPrefixes.input}*`
        testInput.inputGlobOptions = { onlyDirectories: true }

        await checkSyncAsync(ccct, 'is', [testInput, '', 'replaced correctly'])

        ccct.end()
      })

      cct.end()
    })

    ct.end()
  })

  await t.test('output', async ct => {
    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir })

    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

    ct.end()
  })

  await t.test('outputOptions as object', async ct => {
    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir })
    testInput.outputOptions = { encoding: defaults.outputWriteOptions }

    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

    ct.end()
  })

  await t.test('replacement as function', async ct => {
    expectedOutput = content.replace(regex, replaceFn)

    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefixes.output, dir })
    testInput.replacement = replaceFn

    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

    ct.end()
  })

  await t.test('regex as string', async ct => {
    testInput.regex = 'a'
    testInput.content = content

    expectedOutput = content.replace(testInput.regex, replacement)

    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.end()
  })

  t.end()
})

async function checkSyncAsync (t, method, argsSync, isFirstArgFn = false) {
  if (!(argsSync[0] instanceof Array)) { argsSync[0] = [argsSync[0]] }

  let messageIndex = argsSync.length - 1
  while (typeof argsSync[messageIndex] !== 'string') { --messageIndex }

  const argsAsync = Object.assign({}, argsSync)
  argsAsync[0] = bindArray(replace.async, argsAsync[0])
  argsSync[0] = bindArray(replace.sync, argsSync[0])

  if (!isFirstArgFn) {
    argsAsync[0] = await argsAsync[0]()
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

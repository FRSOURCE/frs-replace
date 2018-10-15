const tap = require('tap')
const tmp = require('tmp-promise')
const fs = require('fs')
const replace = require('./replace')

const tmpPrefix = 'FRS-replace-replace'
const content = `aąbcć
deęfg%hi
jklmn
oópqr,stuvw
xyZ`
const regex = new RegExp('^[adjox]', 'gm')
const replacement = 'ą|'
const replaceFn = () => replacement
const defaultEncoding = 'utf8'
let input, output

tap.afterEach((done) => {
  input && input.cleanup()
  input = void 0
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

  await tmp.file({ prefix: tmpPrefix, keep: true }).then(
    async f => {
      input = f
      return new Promise(
        (resolve) => fs.appendFile(f.path, content, { encoding: defaultEncoding }, resolve)
      )
    })

  await t.test('input', async ct => {
    testInput.input = input.path
    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.end()
  })

  await t.test('output', async ct => {
    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefix })

    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

    ct.end()
  })

  await t.test('outputOptions as object', async ct => {
    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefix })
    testInput.outputOptions = { encoding: defaultEncoding }

    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

    ct.end()
  })

  await t.test('replacement as function', async ct => {
    expectedOutput = content.replace(regex, replaceFn)

    testInput.content = content
    output = testInput.output = tmp.tmpNameSync({ prefix: tmpPrefix })
    testInput.replacement = replaceFn

    await checkSyncAsync(ct, 'is', [testInput, expectedOutput, 'replaced correctly'])

    ct.ok(fs.existsSync(testInput.output), 'output file exists')

    const outputFileContent = fs.readFileSync(testInput.output).toString()
    ct.is(outputFileContent, expectedOutput, 'expected output saved to file')

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

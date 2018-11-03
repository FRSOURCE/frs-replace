const tap = require('tap')
const tmp = require('tmp-promise')
const path = require('path')
const fs = require('fs')
const perfy = require('perfy')
const glob = require('fast-glob')

const FRSreplace = require('../src/replace')
const replace = require('replace')
const replaceInFile = require('replace-in-file')
const replaceString = require('replace-string')

const regex = new RegExp('^[adjox]', 'gm')
const replacement = 'ą|'
const content = `aąbcćdeęfg%hi
jklmn
oópqr,stuvwxyZ`
const tmpPrefixes = {
  input: 'FRS-replace-replace-in',
  output: 'FRS-replace-replace-out'
}
const defaults = {
  inputReadOptions: 'utf8',
  outputWriteOptions: 'utf8',
  inputJoinString: '\n'
}
const repetitionsNo = 100000
const iterationsNo = 1000
const testInput = {}
const testedLibraries = [
  'FRS-replace async',
  'FRS-replace sync',
  'replace-in-file',
  'replace async',
  'replace sync',
  'replace-string'
]

let dir, output, input, input2

const readmeContent = fs.readFileSync('./README.md').toString()

let perfyResults = ''

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

tap.beforeEach(async () => {
  testInput.FRSReplace = {
    regex,
    replacement
  }

  testInput.replace = {
    regex,
    replacement
  }

  testInput.replaceAsync = {
    regex,
    replacement,
    async: true
  }

  testInput.replaceInFile = {
    from: regex,
    to: replacement
  }

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

const cleanInputs = (done) => {
  input2 && input2.cleanup()
  input2 = void 0
  input && input.cleanup()
  input = void 0
  done && done() // to be runned either by node-tap or manually
}

tap.afterEach((done) => {
  fs.existsSync(output) && fs.unlinkSync(output)
  cleanInputs()
  done()
})

tap.test(`input as glob pattern [${iterationsNo} iterations x ${repetitionsNo / iterationsNo} repetitions]`, async ct => {
  testInput.FRSReplace.input = `${dir}\\${tmpPrefixes.input}*`
  testInput.replaceInFile.files = `${dir}\\${tmpPrefixes.input}*`
  testInput.replace.paths = testInput.replaceAsync.paths = [dir.replace(/\\/g, '/')]

  const results = await multipleTests([
    () => FRSreplace.async(testInput.FRSReplace),
    () => FRSreplace.sync(testInput.FRSReplace),
    () => replaceInFile(testInput.replaceInFile),
    () => replace(testInput.replaceAsync),
    () => replace(testInput.replace),
    void 0
  ])
  const sortedResults = results.slice().sort(sortByNanoseconds)

  ct.not(sortedResults[0].name.indexOf('FRS-replace'), -1, 'FRS-replace should be the fastest')

  outputPerfy(ct, results, sortedResults[0])

  ct.end()
})

tap.test(`input & replacement as strings [${iterationsNo} iterations x ${repetitionsNo / iterationsNo} repetitions]`, async ct => {
  testInput.FRSReplace.content = content
  testInput.regex = regex.source

  const results = await multipleTests([
    () => FRSreplace.async(testInput.FRSReplace),
    () => FRSreplace.sync(testInput.FRSReplace),
    void 0,
    void 0,
    void 0,
    () => replaceString(content, testInput.regex, replacement)
  ])
  const sortedResults = results.slice().sort(sortByNanoseconds)

  ct.not(sortedResults[0].name.indexOf('FRS-replace'), -1, 'FRS-replace should be the fastest')

  outputPerfy(ct, results, sortedResults[0])

  ct.end()
})

tap.teardown(() => {
  fs.writeFileSync('./README.md', readmeContent.replace(/(##\sBenchmarks\s\s)[\s\S]*?(?:$|(?:\s##\s))/, '$1' + perfyResults))
})

function outputPerfy (t, testResults, best) {
  best = best.fullNanoseconds

  const result = {
    name: t.name,
    results: testResults.reduce(
      (p, v) => p.push({
        name: v.name,
        avgTime:
          (
            v.fullNanoseconds === void 0
              ? null
              : (v.fullNanoseconds / 1000000000)
          ),
        avgPercentageDifference:
          (
            v.fullNanoseconds === void 0
              ? null
              : ((v.fullNanoseconds / best - 1) * 100)
          )
      }) && p,
      []
    )
  }

  t.parser.write(
    '  ---\n' +
    '  name: \'' + result.name + '\'\n' +
    '  results: \n' + result.results.reduce(
      (p, v) => p +
      '    - name: \'' + v.name + '\'\n' +
      '      avgTime: ' + v.avgTime + '\n' +
      '      avgPercentageDifference: ' + v.avgPercentageDifference + '\n'
      ,
      ''
    ) +
    '  ...\n\n'
  )

  perfyResults +=
    '#### ' + result.name + '\n' +
    '| Library (best&nbsp;bolded) | Execution time [s] | Difference percentage (comparing&nbsp;to&nbsp;best&nbsp;time) |\n' +
    '| --- | --- | --- |\n' +
    result.results.reduce(
      (p, v) => p +
        '| ' + (v.avgTime * 1000000000 === best ? ('**' + v.name + '**') : v.name) +
        ' | ' + (v.avgTime === null ? '*N/A*' : (v.avgTime.toFixed(8))) +
        ' | ' + (v.avgPercentageDifference == null ? '*N/A*' : (v.avgPercentageDifference.toFixed(4) + '%')) + ' |\n'
      ,
      ''
    )
}

async function multipleTests (testFns, n, iterations) {
  const results = []

  n = (n || repetitionsNo) / iterationsNo
  iterations = iterations || iterationsNo

  testFns = testFns.reduce((p, v, i) => {
    if (v === void 0) {
      results[i] = { name: testedLibraries[i] }
      return p
    }

    return p.concat({ i, v })
  }, [])

  const testFnsLen = testFns.length

  for (let i = 0; i < n; ++i) {
    for (let k = 0; k < testFnsLen; ++k) {
      const { v: testFn, i: index } = testFns[k]
      const prevResult = results[index]
      const result = await singleTest(testedLibraries[index], testFn, iterations)

      if (!prevResult) {
        results[index] = result
        continue
      }

      for (let prop in result) {
        if (result.hasOwnProperty(prop) && typeof result[prop] === 'number') {
          prevResult[prop] += result[prop]
        }
      }
    }
  }

  testFns.forEach(({ i: index }) => {
    const result = results[index]

    for (let prop in result) {
      if (result.hasOwnProperty(prop) && typeof result[prop] === 'number') {
        result[prop] /= n
      }
    }
  })

  return results
}

async function singleTest (name, test, n) {
  n = n || repetitionsNo

  perfy.start(name)

  do {
    await test()
  } while (--n)

  return perfy.end(name)
}

function sortByNanoseconds (a, b) {
  if (a.fullNanoseconds === void 0) {
    return b.fullNanoseconds === void 0 ? 0 : 1
  }

  if (b.fullNanoseconds === void 0) {
    return -1
  }

  return a.fullNanoseconds - b.fullNanoseconds
}

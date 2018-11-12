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

let dir, output, input

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
          resolve => fs.appendFile(f.path, content, { encoding: defaults.inputReadOptions }, resolve)
        )
      })
})

const cleanInputs = (done) => {
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
  const results = await multipleTests(ct, [
    {
      fn: () => FRSreplace.async(testInput.FRSReplace),
      before: () => (testInput.FRSReplace.input = `${dir}\\${tmpPrefixes.input}*`)
    },
    {
      fn: () => FRSreplace.sync(testInput.FRSReplace),
      before: () => (testInput.FRSReplace.input = `${dir}\\${tmpPrefixes.input}*`)
    },
    {
      fn: () => replaceInFile(testInput.replaceInFile),
      before: () => (testInput.replaceInFile.files = dir + require('path').sep + tmpPrefixes.input + '*')
    },
    // {
    //   fn: () => replace(testInput.replaceAsync), before: () => {
    //     testInput.replaceAsync.paths = [dir.replace(/\\/g, '/')]
    //     testInput.replaceAsync.include = `${tmpPrefixes.input}*`
    //   }
    // }, // COMMENTED OUT - waits for better FRS-replace async methods
    void 0,
    {
      fn: () => replace(testInput.replace),
      before: () => {
        testInput.replace.paths = [dir.replace(/\\/g, '/')]
        testInput.replace.include = `${tmpPrefixes.input}*`
      }
    },
    void 0
  ])
  const sortedResults = results.slice().sort(sortByNanoseconds)

  ct.not(sortedResults[0].name.indexOf('FRS-replace'), -1, 'FRS-replace should be the fastest')
  // results.map((result) => result.testCfg && ct.is(result.result, results[0].result, `${result.name} are results the same`))

  outputPerfy(ct, results, sortedResults[0])

  ct.end()
})

tap.test(`input & replacement as strings [${iterationsNo} iterations x ${repetitionsNo / iterationsNo} repetitions]`, async ct => {
  const results = await multipleTests(ct, [
    {
      fn: () => FRSreplace.async(testInput.FRSReplace),
      before: () => {
        testInput.FRSReplace.regex = regex.source
        testInput.FRSReplace.content = content
      }
    },
    {
      fn: () => FRSreplace.sync(testInput.FRSReplace),
      before: () => {
        testInput.FRSReplace.regex = regex.source
        testInput.FRSReplace.content = content
      }
    },
    void 0,
    void 0,
    void 0,
    { fn: () => replaceString(content, regex.source, replacement) }
  ])

  const result = outputPerfy(ct, results, results.slice().sort(sortByNanoseconds)[0])

  const sortedResults = result.results.slice().sort(sortByNanoseconds)

  ct.is((sortedResults[0].name.indexOf('FRS-replace') !== -1 || (sortedResults[1].name.indexOf('FRS-replace') !== -1 && sortedResults[1].avgPercentageDifference < 10)), true, 'FRS-replace should be the fastest or second, but at most with 10% difference to best')

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

  return result
}

async function multipleTests (t, testCfgs, n, iterations) {
  const results = []

  n = (n || repetitionsNo) / iterationsNo
  iterations = iterations || iterationsNo

  testCfgs = testCfgs.reduce((p, v, i) => {
    if (v === void 0) {
      results[i] = { name: testedLibraries[i] }
      return p
    }

    return p.concat({ i, v })
  }, [])

  const testCfgLen = testCfgs.length

  for (let i = 0; i < n; ++i) {
    for (let k = testCfgLen - 1; k >= 0; --k) {
      const { v: testCfg, i: index } = testCfgs[k]
      const prevResult = results[index]
      const libName = testedLibraries[index]

      await t.test(`${t.name} - ${libName} #${i}`, async ct => {
        testCfg.before && testCfg.before()
        const result = await singleTest(libName, testCfg.fn, iterations)

        if (!prevResult) {
          results[index] = result
          result.testCfg = testCfg
        } else {
          for (let prop in result) {
            if (result.hasOwnProperty(prop) && typeof result[prop] === 'number') {
              prevResult[prop] += result[prop]
            }
          }
        }

        ct.end()
      })
    }
  }

  testCfgs.forEach(({ i: index }) => {
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

  while (--n) {
    await test()
  }

  const testResult = await test()
  const result = perfy.end(name)

  result.result = testResult
  return result
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

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
  input: 'frs-replace-replace-in',
  output: 'frs-replace-replace-out'
}
const defaults = {
  inputReadOptions: 'utf8',
  outputWriteOptions: 'utf8',
  inputJoinString: '\n'
}
const repetitionsNo = 100000
const iterationsNo = 1000
const inputFilesNo = 40
const testInput = {
  FRSReplace: {
    regex,
    replacement
  },

  replace: {
    regex,
    replacement,
    recursive: true,
    silent: true
  },

  replaceAsync: {
    regex,
    replacement,
    async: true,
    recursive: true,
    silent: true
  },

  replaceInFile: {
    from: regex,
    to: replacement
  }
}
const testedLibraries = [
  'frs-replace async',
  'frs-replace sync',
  'replace-in-file',
  'replace async',
  'replace sync',
  'replace-string'
]

let dir; let output; let inputs = []
let perfyResults = ''
let tmpFilesPromise

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

  const promises = []

  for (let i = 0; i < inputFilesNo; ++i) {
    promises.push(
      tmp.file({ prefix: tmpPrefixes.input + i + '-', keep: true, dir })
        .then(input => {
          inputs.push(input)
          return new Promise(resolve => {
            fs.appendFile(input.path, content, { encoding: defaults.inputReadOptions }, resolve)
          })
        })
    )
  }

  tmpFilesPromise = Promise.all(promises)
}
tap.autoend(false)
tap.beforeEach(() => tmpFilesPromise)
tap.afterEach(done => {
  fs.existsSync(output) && fs.unlinkSync(output)
  done()
})

tap.teardown(() => {
  inputs.forEach(input => input.cleanup)
  inputs = []
  const readmeContent = fs.readFileSync('./README.md').toString()

  fs.writeFileSync('./README.md', readmeContent.replace(/(##\sBenchmarks \(Node )(?:.*?)(\)\s)[\s\S]*?(?:$|(?:\s##\s))/, `$1${process.version}$2${perfyResults}`))
})

tap.test(`input as glob pattern [${inputFilesNo} files x ${iterationsNo} iterations x ${repetitionsNo / iterationsNo} repetitions]`, async ct => {
  const results = await multipleTests(ct, [
    {
      fn: () => FRSreplace.async(testInput.FRSReplace),
      before: () => (testInput.FRSReplace.input = `${dir}/${tmpPrefixes.input}*`)
    },
    {
      fn: () => FRSreplace.sync(testInput.FRSReplace),
      before: () => (testInput.FRSReplace.input = `${dir}/${tmpPrefixes.input}*`)
    },
    {
      fn: () => replaceInFile(testInput.replaceInFile),
      before: () => (testInput.replaceInFile.files = `${dir}/${tmpPrefixes.input}*`)
    },
    undefined, // IMPORTANT: test doesn't checks replace async, because it doesn't returns when (and if) file got replaced(https://github.com/harthur/replace/issues/25)
    {
      fn: () => replace(testInput.replace),
      before: () => {
        testInput.replace.paths = [dir.replace(/\\/g, '/')]
      }
    },
    undefined
  ])

  const result = outputPerfy(ct, results, results.slice().sort(sortByNumberVariable('fullNanoseconds'))[0])
  const sortedResults = result.results.slice().sort(sortByNumberVariable('avgTime'))

  ct.is((sortedResults[0].name.indexOf('frs-replace sync') !== -1 || (sortedResults[1].name.indexOf('frs-replace sync') !== -1 && sortedResults[1].avgPercentageDifference < 5)), true, 'frs-replace sync should be the fastest or second, but at most with 5% difference to best')
  ct.is(sortedResults[0].name.indexOf('frs-replace async') !== -1 || sortedResults[1].name.indexOf('frs-replace async') !== -1, true, 'frs-replace async should be the fastest or second')

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
    undefined,
    undefined,
    undefined,
    { fn: () => replaceString(content, regex.source, replacement) }
  ])

  const result = outputPerfy(ct, results, results.slice().sort(sortByNumberVariable('fullNanoseconds'))[0])
  const sortedResults = result.results.slice().sort(sortByNumberVariable('avgTime'))

  ct.is((sortedResults[0].name.indexOf('frs-replace') !== -1 || (sortedResults[1].name.indexOf('frs-replace') !== -1 && sortedResults[1].avgPercentageDifference < 10)), true, 'frs-replace should be the fastest or second, but at most with 10% difference to best')

  ct.end()
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
            v.fullNanoseconds === undefined
              ? null
              : (v.fullNanoseconds / 1000000000)
          ),
        avgPercentageDifference:
          (
            v.fullNanoseconds === undefined
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
    '\n### ' + result.name + '\n\n' +
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
    if (v === undefined) {
      results[i] = { name: testedLibraries[i] }
      return p
    }

    return p.concat({ i, v })
  }, [])

  const testCfgLen = testCfgs.length

  for (let k = testCfgLen - 1; k >= 0; --k) {
    const { v: testCfg, i: index } = testCfgs[k]
    const prevResult = results[index]
    const libName = testedLibraries[index]
    await t.test(`${t.name} - ${libName}`, async ct => {
      for (let i = 0; i < n; ++i) {
        testCfg.before && testCfg.before()
        const result = await singleTest(libName, testCfg.fn, iterations)

        if (!prevResult) {
          results[index] = result
          result.testCfg = testCfg
        } else {
          for (const prop in result) {
            if (Object.prototype.hasOwnProperty.call(result, prop) && typeof result[prop] === 'number') {
              prevResult[prop] += result[prop]
            }
          }
        }
      }
      ct.end()
    })
  }

  testCfgs.forEach(({ i: index }) => {
    const result = results[index]

    for (const prop in result) {
      if (Object.prototype.hasOwnProperty.call(result, prop) && typeof result[prop] === 'number') {
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

function sortByNumberVariable (varName) {
  return (a, b) => {
    a = a[varName]
    b = b[varName]

    if (a === undefined || a === null) {
      return b === undefined || b === null ? 0 : 1
    }

    if (b === undefined || b === null) {
      return -1
    }

    return a - b
  }
}

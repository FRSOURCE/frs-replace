const write = require('write')
const path = require('path')
const fs = require('fs')
const fastGlob = require('fast-glob')

const { writeError, getReplaceFn } = require('./utils')

const inputStrategyMap = {
  join: (results, len, outputJoinString) => {
    let result = (results[0] && results[0][1]) || ''
    for (let i = 1; i < len; ++i) {
      result += outputJoinString + results[i][1]
    }
    return [[['', result]], 1]
  },
  flatten: (results, len) => {
    for (let i = 0; i < len; ++i) {
      const result = results[i]
      result[0] = result[0].substring(result[0].lastIndexOf(path.sep))
    }
    return [results, len]
  },
  'preserve-structure': (...args) => args
}

const multipleFilesOutputStrategy = (results, len, output, outputWriteOptions) => {
  for (let i = 0; i < len; ++i) {
    const result = results[i]
    result[0] = path.join(output, result[0])
    write.sync(result[0], result[1], outputWriteOptions)
  }
  return results
}

const outputStrategyMap = {
  join: (results, len, output, outputWriteOptions) => {
    write.sync(output, results[0][1], outputWriteOptions)
    results[0][0] = output
    return results
  },
  flatten: multipleFilesOutputStrategy,
  'preserve-structure': multipleFilesOutputStrategy
}

module.exports = ({
  input,
  inputReadOptions = 'utf8',
  inputGlobOptions,
  content,
  strategy = 'join',
  output,
  outputWriteOptions = 'utf8',
  outputJoinString = '\n',
  needle,
  replacement
}) => {
  let results
  const replaceFn = getReplaceFn(needle, replacement)

  if (content !== undefined) {
    results = [['', replaceFn(content)]]
  } else if (input !== undefined) {
    results = []
    const files = fastGlob.sync(input, inputGlobOptions)
    const len = files.length
    for (let i = 0; i < len; ++i) {
      const filePath = files[i]
      results.push([filePath, replaceFn(fs.readFileSync(filePath, inputReadOptions))])
    }
  } else {
    writeError('at least one input source must be defined!')
  }

  let len
  if (!inputStrategyMap[strategy]) writeError('unsupported strategy used! Possible values are: "join", "preserve-structure" or "flatten"');
  [results, len] = inputStrategyMap[strategy](results, results.length, outputJoinString)

  if (output !== undefined) {
    output = path.normalize(output)
    if (typeof outputWriteOptions === 'string') {
      outputWriteOptions = { encoding: outputWriteOptions }
    }

    results = outputStrategyMap[strategy](results, len, output, outputWriteOptions)
  }

  return results
}

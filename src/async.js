const write = require('write')
const path = require('path')
const fs = require('fs')
const fastGlob = require('fast-glob')
const { writeError, getReplaceFn } = require('./utils')

const inputStrategyMap = {
  join: (results, outputJoinString) =>
    results.then(results => [
      Promise.all(results).then(results => {
        const len = results.length
        let result = (results[0] && results[0][1]) || ''
        for (let i = 1; i < len; ++i) {
          result += outputJoinString + results[i][1]
        }
        return ['', result]
      })
    ]),
  flatten: results =>
    results.then(results => results.map(async result => {
      result = await result
      result[0] = result[0].substring(result[0].lastIndexOf(path.sep))
      return result
    })),
  'preserve-structure': results => results
}

const multipleFilesOutput = (results, output, outputWriteOptions) => {
  return results.then(results => results.map(
    async result => {
      result = await result
      result[0] = path.join(output, result[0])
      await write(result[0], result[1], outputWriteOptions)
      return result
    }
  ))
}

const outputStrategyMap = {
  join: (results, output, outputWriteOptions) =>
    results.then(results => [
      results[0].then(async result => {
        await write(output, result[1], outputWriteOptions)
        result[0] = output
        return result
      })
    ]),
  flatten: multipleFilesOutput,
  'preserve-structure': multipleFilesOutput
}

module.exports = async ({
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
    results = Promise.resolve([['', replaceFn(content)]])
  } else if (input !== undefined) {
    const fileStream = fastGlob.stream(input, inputGlobOptions)
    const replacePromises = []

    fileStream.on('error', writeError)
    fileStream.on('data', path => replacePromises.push(new Promise((resolve, reject) =>
      fs.readFile(path, inputReadOptions, (error, data) => {
        /* c8 ignore next */
        if (error) return reject(error)

        resolve([path, replaceFn(data)])
      })
    )))
    results = new Promise(resolve =>
      fileStream.once('end', () =>
        resolve(replacePromises)
      )
    ).catch(writeError)
  } else {
    writeError('at least one input source must be defined!')
  }

  if (!inputStrategyMap[strategy]) writeError('unsupported strategy used! Possible values are: "join", "preserve-structure" or "flatten"')
  results = inputStrategyMap[strategy](results, outputJoinString)

  if (output !== undefined) {
    output = path.normalize(output)
    if (typeof outputWriteOptions === 'string') {
      outputWriteOptions = { encoding: outputWriteOptions }
    }

    results = outputStrategyMap[strategy](results, output, outputWriteOptions)
  }

  return results
}

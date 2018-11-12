module.exports = {
  sync: replaceSync,
  async: replaceAsync
}

function replaceSync ({
  input,
  inputReadOptions = 'utf8',
  inputGlobOptions,
  inputJoinString = '\n',
  content,
  output,
  outputWriteOptions = 'utf8',
  regex,
  replacement
}) {
  let result = ''
  const replaceFn = typeof regex === 'string' ? replaceString : replaceRegex

  if (content !== undefined) {
    result = replaceFn(content, regex, replacement)
  } else if (input !== undefined) {
    const files = require('fast-glob').sync(input, inputGlobOptions)

    if (files.length !== 0) {
      const fs = require('fs')
      result = replaceFn(fs.readFileSync(files[0], inputReadOptions), regex, replacement)

      for (let i = 1, len = files.length; i < len; ++i) {
        result += inputJoinString + replaceFn(fs.readFileSync(files[i], inputReadOptions), regex, replacement)
      }
    }
  } else {
    writeError('at least one input source must be defined!')
  }

  if (output !== undefined) {
    if (typeof outputWriteOptions === 'string') {
      outputWriteOptions = { encoding: outputWriteOptions }
    }

    require('write').sync(require('path').normalize(output), result, outputWriteOptions)
  }

  return result
}

async function replaceAsync ({
  input,
  inputReadOptions = 'utf8',
  inputGlobOptions,
  inputJoinString = '\n',
  content,
  output,
  outputWriteOptions = 'utf8',
  regex,
  replacement
}) {
  let result
  const replaceFn = typeof regex === 'string' ? replaceString : replaceRegex

  if (content !== undefined) {
    result = replaceFn(content, regex, replacement)
  } else if (input !== undefined) {
    const fileStream = require('fast-glob').stream(input, inputGlobOptions)
    const fs = require('fs')
    const replacePromises = []
    const createReplacePromise = path => {
      return new Promise((resolve, reject) =>
        fs.readFile(path, inputReadOptions, (error, data) => {
          /* istanbul ignore next */
          error && reject(error)

          resolve(replaceFn(data, regex, replacement))
        })
      )
    }

    fileStream.on('error', writeError)
    fileStream.on('data', path => replacePromises.push(
      createReplacePromise(path)
    ))

    await new Promise(resolve =>
      fileStream.once('end', () =>
        resolve(Promise.all(replacePromises))
      )
    ).then(
      (strings) => (result = strings.join(inputJoinString)),
      writeError
    )
  } else {
    writeError('at least one input source must be defined!')
  }

  if (output !== undefined) {
    if (typeof outputWriteOptions === 'string') {
      outputWriteOptions = { encoding: outputWriteOptions }
    }

    await require('write')(require('path').normalize(output), result, outputWriteOptions)
  }

  return result
}

function writeError (msg) {
  throw new Error(`FRS-replace :: ${msg}`)
}

function replaceRegex (content, needle, replacement) {
  return content.replace(needle, replacement)
}

function replaceString (content, needle, replacement) {
  const needleLen = needle.length
  let result = ''
  let i
  let endIndex = 0

  while ((i = content.indexOf(needle, endIndex)) !== -1) {
    result += content.slice(endIndex, i) + replacement
    endIndex = i + needleLen
  }

  result += content.slice(endIndex, content.length)

  return result
}

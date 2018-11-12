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
  let result
  const replaceFn = typeof regex === 'string' ? replaceString : replaceRegex

  if (content !== undefined) {
    result = replaceFn(content, regex, replacement)
  } else if (input !== undefined) {
    const files = require('fast-glob')
      .sync(input, inputGlobOptions)

    if (files.length !== 0) {
      const fs = require('fs')
      result = replaceFn(fs.readFileSync(files[0], inputReadOptions), regex, replacement)

      for (let i = 1, len = files.length; i < len; ++i) {
        result += inputJoinString + replaceFn(fs.readFileSync(files[i], inputReadOptions), regex, replacement)
      }
    } else {
      result = ''
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

  if (content !== void 0) {
    result = replaceFn(content, regex, replacement)
  } else if (input !== void 0) {
    const fileStream = await require('fast-glob').stream(input, inputGlobOptions)
    let filesFound = false

    result = ''

    const fileReaderPromise = multiFileReaderBuilder(require('fs'), inputReadOptions, fileReader => {
      fileStream.on('data', entry => {
        filesFound = true
        return fileReader(
          entry,
          content => (result += replaceFn(content, regex, replacement))
        )
      })
      fileStream.once('error', writeError)
    })

    await new Promise((resolve) => fileStream.once('end', () => {
      return resolve(filesFound ? fileReaderPromise : void 0)
    }))
  } else {
    writeError('at least one input source must be defined!')
  }

  if (output !== void 0) {
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

function multiFileReaderBuilder (fs, inputReadOptions, setup) {
  let i = 0
  return new Promise((resolve, reject) => {
    setup((path, callback) => {
      if (++i < 1) return

      fs.readFile(path, inputReadOptions, (error, data) => {
        if (error) {
          i = -1
          return reject(error)
        }

        callback(data)

        if (--i === 0) {
          resolve()
        }
      })
    })
  })
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

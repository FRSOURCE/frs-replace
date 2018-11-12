module.exports = {
  sync: replace,
  async: (...args) => new Promise((resolve, reject) => {
    let result

    try {
      result = replace.apply(this, args)
    } catch (e) {
      return reject(e)
    }

    resolve(result)
  })
}

function replace ({
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

  if (output !== void 0) {
    if (typeof outputWriteOptions === 'string') {
      outputWriteOptions = { encoding: outputWriteOptions }
    }

    require('write').sync(require('path').normalize(output), result, outputWriteOptions)
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

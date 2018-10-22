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
  input = void 0,
  inputReadOptions = 'utf8',
  inputGlobOptions = void 0,
  inputJoinString = '\n',
  content = void 0,
  regex,
  replacement,
  output = void 0,
  outputWriteOptions = 'utf8'
}) {
  if (!input && !content) {
    writeError('at least one input source must be defined!')
  }

  let result

  if (content) {
    result = content.replace(regex, replacement)
  } else {
    const fs = require('fs')
    result = require('fast-glob')
      .sync(input, inputGlobOptions)
      .map((path) => fs.readFileSync(path, inputReadOptions).replace(regex, replacement))
      .join(inputJoinString)
  }

  if (output) {
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

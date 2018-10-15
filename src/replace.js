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
  inputOptions = 'utf8',
  content = void 0,
  regex,
  replacement,
  output = void 0,
  outputOptions = 'utf8'
}) {
  if (!input && !content) {
    writeError('at least one input source must be defined!')
  }

  let path

  if (!content) {
    content = require('fs').readFileSync((path = require('path')).normalize(input), inputOptions)
  }

  const result = content.replace(regex, replacement)

  if (output) {
    if (typeof outputOptions === 'string') {
      outputOptions = { encoding: outputOptions }
    }

    require('write').sync((path || require('path')).normalize(output), result, outputOptions)
  }

  return result
}

function writeError (msg) {
  throw new Error(`FRS-replace :: ${msg}`)
}

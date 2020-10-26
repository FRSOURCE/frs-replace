const writeError = msg => { throw new Error(`@frsource/frs-replace :: ${msg}`) }

const getReplaceFn = (needle, replacement) =>
  typeof needle === 'string'
    ? content => {
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
    : content => content.replace(needle, replacement)

module.exports = { writeError, getReplaceFn }

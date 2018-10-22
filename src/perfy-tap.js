const perfy = require('perfy')

module.exports = function (_tap) {
  _tap.sub = subWrapper.bind(_tap, _tap.sub)
  _tap.Test.prototype.sub = subWrapper.bind(_tap, _tap.Test.prototype.sub)

  //

  function subWrapper (originalSub, Class, extra) {
    var args = Array.prototype.slice.call(arguments, 1)
    const name = extra.name
    perfy.start(name)

    const promise = originalSub.apply(this, args)

    promise.then(() => perfy.end(extra.name))

    return promise
  }
}

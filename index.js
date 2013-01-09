const fs = require('fs')

var cleanupFd    = function (path) {
      // clear the use counter & close if pending
      if (this._pendingClose[path]) {
        fs.close(this._pendingClose[path], function () {})
        module.exports._totalOpenFds--
        delete this._pendingClose[path]
      }
    }

  , close       = function (path) {
      // dispose of this fd when possible
      var fdr = this._fds[path]
      if (!fdr) return

      this._pendingClose[path] = fdr.fd
      // nextTick needed to match the nextTick in an async-cache otherwise we may
      // close it in the tick prior to it being actually needed
      process.nextTick(function () {
        if (fdr.co === 0)
          cleanupFd.call(this, path)
      }.bind(this))
    }

  , open        = function (path, cb) {
      // open a new fd

      // if the file is already open and in use but not with a close pending
      // then just use that.
      if (this._fds[path] && !this._pendingClose[path])
        return cb(null, this._fds[path].fd)

      fs.open(path, 'r', function (er, fd) {
        if (!er) {
          module.exports._totalOpenFds++
          this._fds[path] = {
              fd : fd
            , co : 0
          }
        }

        cb(er, fd)
      }.bind(this))
    }

  , checkout     = function (path) {
      // call whenever you *may* be about to use the fd, to ensure it's not cleaned up

      var fdr = this._fds[path]
      if (!fdr) throw new Error('no fd for path: ' + path)

      fdr.co++
      return fdr.fd
    }

  , checkin     = function (path) {
      // call sometime after checkout() when you know you're not using it

      var fdr = this._fds[path]
      if (!fdr) throw new Error('no fd for path: ' + path)

      if ((fdr.co = Math.max(fdr.co - 1, 0)) === 0)
        cleanupFd.call(this, path)
    }

  , FDManager   = {
        open     : open
      , close    : close
      , checkout : checkout
      , checkin  : checkin
    }

  , create      = function () {
      return Object.create(FDManager, {
          _fds      : { value: Object.create(null) }
        , _pendingClose : { value: Object.create(null) }
      })
    }

module.exports               = create
module.exports._totalOpenFds = 0
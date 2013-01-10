const fs = require('fs')

var totalOpenFds = 0 // across all instances

    // the reason we use a combination of path+fd to store references
    // in this._usingfd is that it is possible to have multiple fds
    // for the same file simultaneously. Particularly in the situation
    // where an fd is pending for a close but hasn't been checked back
    // in by all clients
  , key          = function (path, fd) {
      return fd + ':' + path
    }

  , cleanupFd    = function (path, fd) {
      // clear the use counter & close if pending

      delete this._usingfd[key(path, fd)]
      delete this._usingfd[path]

      if (this._pendingClose[key(path, fd)]) {
        console.log('close', path, fd)
        fs.close(fd, function () {})
        totalOpenFds--
        delete this._pendingClose[key(path, fd)]
      }
    }

  , close       = function (path, fd) {
      // dispose of this fd when possible

      this._pendingClose[key(path, fd)] = fd
      // nextTick needed to match the nextTick in an async-cache otherwise we may
      // close it in the tick prior to it being actually needed
      process.nextTick(function () {
        if (!this._usingfd[key(path, fd)])
          cleanupFd.call(this, path, fd)
      }.bind(this))
    }

  , open        = function (path, cb) {
      // open a new fd

      // if the file is already open and in use but not with a close pending
      // then just use that.
      if (this._usingfd[path] && !this._pendingClose[key(path, this._usingfd[path])])
        return cb(null, this._usingfd[path])

      fs.open(path, 'r', function (er, fd) {
        if (!er) {
        console.log('open', path, fd)
          totalOpenFds++
          this._usingfd[path] = fd
          this._usingfd[fd + path] = 0
        }

        cb(er, fd)
      }.bind(this))
    }

  , checkout     = function (path, fd) {
      // call whenever you *may* be about to use the fd, to ensure it's not cleaned up

      this._usingfd[path] = fd
      this._usingfd[key(path, fd)] = (this._usingfd[key(path, fd)] || 0) + 1
    }

  , checkin     = function (path, fd) {
      // call sometime after checkout() when you know you're not using it

      if (this._usingfd[path] && --this._usingfd[key(path, fd)] === 0)
        cleanupFd.call(this, path, fd)
    }

  , checkinfn   = function (path, fd) {
      // make a checkin function that can be safely called multiple times

      var called = false
      return function () {
        if (!called) {
          this.checkin(path, fd)
          called = true
        }
      }.bind(this)
    }

  , FDManager   = {
        open      : open
      , close     : close
      , checkout  : checkout
      , checkin   : checkin
      , checkinfn : checkinfn
    }

  , create      = function () {
      return Object.create(FDManager, {
          _usingfd      : { value: Object.create(null) }
        , _pendingClose : { value: Object.create(null) }
      })
    }

module.exports               = create
module.exports._totalOpenFds = totalOpenFds
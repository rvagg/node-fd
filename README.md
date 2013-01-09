# fd [![Build Status](https://secure.travis-ci.org/rvagg/node-fd.png)](http://travis-ci.org/rvagg/node-fd)

File descriptor manager for Node.js. *Available in npm as <strong>fd</strong>*.

## Example

*(this example is a bit contrived, something more realistic coming soon)*

```js
var fdman = require('fd')()

fdman.open('/foo/bar/baz.txt', function (err, fd) {
  fdman.checkout('/foo/bar/baz.txt')
  // do something with `fd`
  fdman.checkin('/foo/bar/baz.txt')
  fdman.close('/foo/bar/baz.txt')
})
```

## API

## Licence

fd is Copyright (c) 2012 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.
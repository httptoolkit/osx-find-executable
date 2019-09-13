# osx-find-executable

> _Part of [HTTP Toolkit](https://httptoolkit.tech): powerful tools for building, testing & debugging HTTP(S)_

Find an app's executable by its bundle id.

This is a fork of https://github.com/juliangruber/osx-find-executable, which appears unmaintained.

The key difference: this version includes a fallback (manually searching the apps in /Applications) if Spotlight is disabled, instead of just claiming that all apps can't be found.

## Usage

```js
const find = require('osx-find-executable')

find('com.google.Chrome', (err, exec) => {
  // => /Applications/Google Chrome.app/Contents/MacOS/Google Chrome 
})
```

## Installation

```bash
$ npm install @httptoolkit/osx-find-executable
```

## API

### find(id, cb(err, exec))

## License

MIT

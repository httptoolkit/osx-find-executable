# osx-find-executable

> _Part of [HTTP Toolkit](https://httptoolkit.tech): powerful tools for building, testing & debugging HTTP(S)_

Find an app's executable on Mac.

This is a fork of https://github.com/juliangruber/osx-find-executable, which appears to now be unmaintained.

Key differences:
* This fork includes a fallback (manually searching the apps in /Applications) if Spotlight is disabled, instead of just claiming that all apps can't be found.
* This fork can also find an executable given a path to an app folder, not only using bundle id.
* This fork returns promises throughout, and doesn't use callbacks.

## Usage

```js
const { findOsxExecutable } = require('osx-find-executable')

findOsxExecutable('com.google.Chrome').then((exec) => {
  // => /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
});
```

## Installation

```bash
$ npm install @httptoolkit/osx-find-executable
```

## API

### findExecutableById(id)

Takes a bundle id (like com.google.Chrome), finds the corresponding bundle on disk, and returns a promise for the path to the executable within.

### findExecutableInApp(appPath)

Takes a path to an app bundle (a .app directory, like /Applications/Google Chrome.app), and returns a promise for the path to the executable within.

## License

MIT

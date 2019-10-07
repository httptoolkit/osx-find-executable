const exec = require('child_process').exec;
const join = require('path').join;
const rawParsePlist = require('plist').parse;
const { promisify } = require('util');
const fs = require('fs');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const parsePlist = (plistData) => {
  // Wrap plist warning to silence all non-fatal xmldom errors:
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = () => {};
  console.error = function (msg) {
    if (msg && msg.startsWith('[xmldom error]')) return;
    else return originalError.apply(this, arguments);
  };

  try {
    return rawParsePlist(plistData);
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
};

let isSpotlightAvailable = null; // null | Promise | true | false
let spotlightAppIndex = null; // null | Promise | index

function checkSpotlightAvailable() {
  if (typeof isSpotlightAvailable === 'boolean') {
    return Promise.resolve(); // We've already checked
  }

  if (isSpotlightAvailable === null) {
    isSpotlightAvailable = new Promise((resolve, reject) => {
      exec('mdutil -s /', (err, stdout) => {
        if (err) reject(err);
        else {
          isSpotlightAvailable = !stdout.includes('Indexing disabled');
          resolve();
        }
      });
    });
  }

  return isSpotlightAvailable;
}

async function buildAppIndex() {
  const appDirs = await getApplicationFolders('/Applications');

  const apps = await Promise.all(appDirs.map(async (appDir) => ({
    plist: await getPlistData(appDir).catch(() => undefined),
    appPath: appDir
  })));

  const index = {};
  apps.forEach((app) => {
    if (app.plist && app.plist.CFBundleIdentifier && app.plist.CFBundleExecutable) {
      index[app.plist.CFBundleIdentifier] = app; // If we do get a conflict, just use the last result
    }
  });

  return index;
}

async function findExecutableManually(bundleId) {
  spotlightAppIndex = spotlightAppIndex || buildAppIndex();

  const matchingApp = (await spotlightAppIndex)[bundleId];
  if (!matchingApp) return;

  const { plist, appPath } = matchingApp;
  return getExecutablePath(appPath, plist);
}

async function getApplicationFolders(root) {
  try {
    const fileEntries = await readdir(root, { withFileTypes: true });
    const dirs = fileEntries.filter(e => e.isDirectory());

    const [appDirs, nonAppDirs] = dirs.reduce((acc, entry) => {
      const path = join(root, entry.name);
      if (entry.name.endsWith('.app')) {
        acc[0].push(path);
      } else {
        acc[1].push(path);
      }
      return acc;
    }, [[], []]);

    return appDirs.concat(...await Promise.all(
      // Recurse into any non-.app folders
      nonAppDirs.map((dir) => getApplicationFolders(dir))
    ));
  } catch (e) {
    console.log(e);
    return [];
  }
}

async function getPlistData(appDir) {
  const data = await readFile(join(appDir, 'Contents', 'Info.plist'));
  return parsePlist(data.toString());
}

function getExecutablePath(appDir, plist) {
  return join(appDir, 'Contents', 'MacOS', plist.CFBundleExecutable)
}

module.exports = (id, cb) => {
  if (isSpotlightAvailable === false) {
    // If we know spotlight isn't running:
    findExecutableManually(id)
    .then((executablePath) => {
      if (executablePath) cb(null, executablePath);
      else cb(new Error(`Not installed: ${id}`));
    })
    .catch((err) => cb(err));
  } else {
    // If spotlight is running, or we just haven't checked yet:

    exec(`mdfind "kMDItemCFBundleIdentifier=="${id}""`, (err, stdout) => {
      if (err) {
        if (err.code === 127) {
          // We can't call mdfind: we can't use spotlight
          isSpotlightAvailable = false;
          // Retry: this will now search manually instead
          return module.exports(id, cb);
        } else {
          // Otherwise, continue as 'not found' (probably still throws, might successfully
          // fall back to a manual search if spotlight is clearly disabled).
          stdout = '';
        }
      }

      const path = stdout
        .trim()
        .split('\n')[0]; // If there are multiple results, use the first

      if (!path) {
        return checkSpotlightAvailable().then(() => {
          if (!isSpotlightAvailable) {
            module.exports(id, cb);
          } else {
            return cb(new Error(`Not installed: ${id}`))
          }
        }).catch(cb);
      }

      readFile(join(path, 'Contents', 'Info.plist')).then((raw) => {
        const plist = parsePlist(raw.toString());
        cb(null, getExecutablePath(path, plist));
      })
      .catch((err) => cb(err));
    })
  }
}

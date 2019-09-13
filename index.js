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
    if (msg.startsWith('[xmldom error]')) return;
    else return originalError.apply(this, arguments);
  };

  const result = rawParsePlist(plistData);

  console.warn = originalWarn;
  console.error = originalError;
  return result;
};

let isSpotlightRunning = null; // null | Promise | true | false
let spotlightAppIndex = null; // null | Promise | index

function checkSpotlightRunning() {
  if (typeof isSpotlightRunning === 'boolean') {
    return Promise.resolve(); // We've already checked
  }

  if (isSpotlightRunning === null) {
    isSpotlightRunning = new Promise((resolve, reject) => {
      exec('mdutil -s /', (err, stdout) => {
        if (err) reject(err);
        else {
          isSpotlightRunning = !stdout.includes('Indexing disabled');
          resolve();
        }
      });
    });
  }

  return isSpotlightRunning;
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
  if (isSpotlightRunning === false) {
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
      if (err) return cb(err);
      const path = stdout.trim();

      if (!path) {
        return checkSpotlightRunning().then(() => {
          if (!isSpotlightRunning) {
            module.exports(id, cb);
          } else {
            return cb(new Error(`Not installed: ${id}`))
          }
        });
      }

      readFile(join(path, 'Contents', 'Info.plist')).then((raw) => {
        const plist = parsePlist(raw.toString());
        cb(null, getExecutablePath(path, plist));
      })
      .catch((err) => cb(err));
    })
  }
}

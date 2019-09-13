const find = require('.')
const test = require('tap').test

test('find chrome', t => {
  find('com.google.Chrome', (err, path) => {
    t.error(err);
    t.equal(path, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    t.end();
  });
});


test('find chrome & FF in parallel', t => {
  let waitingFor = 2;
  const done = () => {
    waitingFor = waitingFor - 1;
    if (waitingFor === 0) t.end();
  };

  find('com.google.Chrome', (err, path) => {
    t.error(err);
    t.equal(path, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    done();
  });

  find('org.mozilla.firefox', (err, path) => {
    t.error(err);
    t.equal(path, '/Applications/Firefox.app/Contents/MacOS/firefox');
    done();
  });
});

test('find non-existent app', t => {
  find('tech.httptoolkit.NonExistentApp', (err, path) => {
    t.equal(err.message, 'Not installed: tech.httptoolkit.NonExistentApp');
    t.equal(path, undefined)
    t.end()
  })
});
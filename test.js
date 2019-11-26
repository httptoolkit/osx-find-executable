const { findExecutableById, findExecutableInApp } = require('.');
const test = require('tap').test;

test('find by id', async () => {
    test('find chrome', async (t) => {
        const path = await findExecutableById('com.google.Chrome');
        t.equal(path, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    });


    test('find chrome & FF in parallel', async (t) => {
        await Promise.all([
            findExecutableById('com.google.Chrome').then((path) => {
                t.equal(path, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
            }),
            findExecutableById('org.mozilla.firefox').then((path) => {
                t.equal(path, '/Applications/Firefox.app/Contents/MacOS/firefox');
            })
        ]);
    });

    test('find non-existent app', async (t) => {
        try {
            await findExecutableById('tech.httptoolkit.NonExistentApp');
            t.fail('Should not find non-existent app');
        } catch (err) {
            t.equal(err.message, 'Not installed: tech.httptoolkit.NonExistentApp');
        }
    });
});

test('find by path', async () => {
    test('find chrome', async (t) => {
        const path = await findExecutableInApp('/Applications/Google Chrome.app');
        t.equal(path, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    });


    test('find chrome & FF in parallel', async (t) => {
        await Promise.all([
            findExecutableInApp('/Applications/Google Chrome.app').then((path) => {
                t.equal(path, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
            }),
            findExecutableInApp('/Applications/Firefox.app').then((path) => {
                t.equal(path, '/Applications/Firefox.app/Contents/MacOS/firefox');
            })
        ]);
    });

    test('find non-existent app', async (t) => {
        try {
            await findExecutableInApp('/Applications/NonExistent.app');
            t.fail('Should not find non-existent app');
        } catch (err) {
            t.includes(err.message, 'ENOENT: no such file or directory');
        }
    });
});
'use strict';

const expectedSizes = {
    'sherlock': 5,
    'sherlock-proxy': 2,
    'sherlock-rxjs': 1,
    'sherlock-utils': 2,
}

console.log('Minifying bundles...');

const fs = require('fs');
const terser = require('terser');

Object.keys(expectedSizes).forEach(lib => {
    ['esm', 'cjs', 'umd'].forEach(suf => {
        const file = fs.readFileSync(`dist/${lib}/${lib}.${suf}.js`, 'utf8');
        const fileSM = fs.readFileSync(`dist/${lib}/${lib}.${suf}.js.map`, 'utf8');
        const result = terser.minify(file, {
            module: suf !== 'umd',
            sourceMap: {
                content: fileSM,
                filename: `${lib}.${suf}.min.js`,
                url: `${lib}.${suf}.min.js.map`,
            },
            compress: { unsafe: true, passes: 2, warnings: true, pure_funcs: ['Object.freeze'] },
            mangle: { properties: { regex: /^_(?!_)(?!internal)/ } }
        });
        const target = `dist/${lib}/${lib}.${suf}.min.js`;
        const targetSM = `dist/${lib}/${lib}.${suf}.min.js.map`;
        fs.writeFileSync(target, result.code, 'utf8');
        fs.writeFileSync(targetSM, result.map, 'utf8');
        console.log('-', target);
    });
});

console.log('Checking sizes...');

const gzipSize = require('gzip-size');
const assert = require('assert');

const results = {};
Object.keys(expectedSizes).forEach(lib => {
    const filename = `dist/${lib}/${lib}.esm.min.js`;
    const minified = fs.readFileSync(filename, 'utf8');
    const size = gzipSize.sync(minified);

    const expectedSize = expectedSizes[lib];
    assert(size < expectedSize * 1024, `Unexpected minified bundle size for ${lib}, expected ${expectedSize}KB but it was ${Math.ceil(size / 1024)}KB`)
    assert(size >= (expectedSize - 1) * 1024, `Unexpected minified bundle size for ${lib}, expected ${expectedSize}KB but it was ${Math.ceil(size / 1024)}KB`)

    results[lib] = {
        filename: filename,
        minified: minified.length,
        gzipped: size,
    };
});
(console.table || console.log)(results);

console.log('Testing bundles...');

// Patch Node's module loading to be able to load sherlock as @politie/sherlock
const Module = require('module');
const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
    if (request.startsWith('@politie/')) {
        const lib = request.substr(9);
        return origResolveFilename.call(this, `${__dirname}/../dist/${lib}/${lib}.cjs.min`, ...rest);
    }
    return origResolveFilename.apply(this, arguments);
};

const sherlock = require('@politie/sherlock');
const utils = require('@politie/sherlock-utils');
const rxjs = require('@politie/sherlock-rxjs');

const a$ = sherlock.atom({ nested: { property: 'value' } });

let receivedValue
a$.react(v => receivedValue = v, { skipFirst: true });

assert.strictEqual(receivedValue, undefined);

const value$ = a$.pluck('nested').pluck('property');
assert.strictEqual(value$.get(), 'value');
value$.set('another value');

assert.deepStrictEqual(receivedValue, { nested: { property: 'another value' } });
assert.deepStrictEqual(utils.getStateObject(value$), { value: 'another value', resolved: true, errored: false });

assert.ok(rxjs.toObservable(a$));

console.log('Bundles ok.');

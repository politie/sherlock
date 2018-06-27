'use strict';

console.log('Testing bundle...');

const sherlock = require('./dist/sherlock/sherlock.cjs');
const assert = require('assert');
const terser = require('terser');

const a$ = sherlock.atom({ nested: { property: 'value' } });

let receivedValue
a$.react(v => receivedValue = v, { skipFirst: true });

assert.strictEqual(receivedValue, undefined);

const value$ = a$.pluck('nested').pluck('property');
assert.strictEqual(value$.get(), 'value');
value$.set('another value');

assert.deepStrictEqual(receivedValue, { nested: { property: 'another value' } });

const fs = require('fs');
const gzipSize = require('gzip-size');

(console.table || console.log)({
    'sherlock': assertBundleSize('sherlock', 14),
    'sherlock-proxy': assertBundleSize('sherlock-proxy', 5),
    'sherlock-rxjs': assertBundleSize('sherlock-rxjs', 1),
    'sherlock-utils': assertBundleSize('sherlock-utils', 3),
});

console.log('Bundle ok.');

function assertBundleSize(name, expectedSize) {
    const filename = `./dist/${name}/${name}.esm.js`;
    const file = fs.readFileSync(filename, 'utf8');
    const minified = terser.minify(file, { module: true }).code;
    const size = minified.length;

    assert(size < expectedSize * 1024, `Unexpected minified bundle size for ${name}, expected ${expectedSize}KB but it was ${Math.ceil(size / 1024)}KB`)
    assert(size >= (expectedSize - 1) * 1024, `Unexpected minified bundle size for ${name}, expected ${expectedSize}KB but it was ${Math.ceil(size / 1024)}KB`)

    return {
        filename: filename,
        filesize: file.length,
        minified: size,
        gzipped: gzipSize.sync(minified),
    };
}

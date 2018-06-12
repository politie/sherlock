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

const { readFileSync } = require('fs');

assertBundleSize('sherlock-rxjs', 1);
assertBundleSize('sherlock-proxy', 5);
assertBundleSize('sherlock', 15);

console.log('Bundle ok.');

function assertBundleSize(name, expectedSize) {
    const file = readFileSync(`./dist/${name}/${name}.cjs.js`, 'utf8');
    const minified = terser.minify(file, { module: true }).code;
    const size = minified.length;
    console.log(`${name}.cjs.js:\t${file.length}B\t(${size}B minified).`);
    assert(size < expectedSize * 1024, `Unexpected minified bundle size for ${name}, expected ${expectedSize}KB but it was ${Math.ceil(size / 1024)}KB`)
}

'use strict';

console.log('Testing bundle...');

const sherlock = require('./dist/sherlock/sherlock.cjs');
const assert = require('assert');

const a$ = sherlock.atom({ nested: { property: 'value' } });

let receivedValue
a$.react(v => receivedValue = v, { skipFirst: true });

assert.strictEqual(receivedValue, undefined);

const value$ = a$.pluck('nested').pluck('property');
assert.strictEqual(value$.get(), 'value');
value$.set('another value');

assert.deepStrictEqual(receivedValue, { nested: { property: 'another value' } });

const { statSync } = require('fs');

assertBundleSize('sherlock-rxjs', 1000);
assertBundleSize('sherlock-proxy', 15000);
assertBundleSize('sherlock', 57000);

console.log('Bundle ok.');

function toKB(size) {
    return Math.floor(size / 1024);
}
function assertBundleSize(name, expectedSize) {
    const size = statSync(`./dist/${name}/${name}.cjs.js`).size;
    assert(size < expectedSize, `Unexpected bundle size for ${name}, expected ${toKB(expectedSize)}KB but it was ${toKB(size)}KB`)
}

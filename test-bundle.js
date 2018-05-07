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

assert(statSync('./dist/sherlock-rxjs/sherlock-rxjs.cjs.js').size < 1000, 'Unexpected bundle size for sherlock-rxjs');
assert(statSync('./dist/sherlock-proxy/sherlock-proxy.cjs.js').size < 15000, 'Unexpected bundle size for sherlock-proxy');
assert(statSync('./dist/sherlock/sherlock.cjs.js').size < 50000, 'Unexpected bundle size for sherlock');

console.log('Bundle ok.');

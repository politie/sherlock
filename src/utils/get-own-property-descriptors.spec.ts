import { expect } from 'chai';
import { getOwnPropertyDescriptorsShim, ownKeysShim } from './get-own-property-descriptors';

describe('util/getOwnPropertyDescriptors', () => {
    Object.getOwnPropertyDescriptors && it('should use a correct Object.getOwnPropertyDescriptors shim', () => {
        const obj = { a: 'b', c: 123, get d() { return false; } };
        expect(getOwnPropertyDescriptorsShim(obj)).to.deep.equal(Object.getOwnPropertyDescriptors(obj));
    });

    typeof Reflect !== 'undefined' && it('should use a correct Reflect.ownKeys shim', () => {
        const obj = { a: 'b', c: 123, get d() { return false; }, [Symbol()]: {} };
        expect(ownKeysShim(obj)).to.deep.equal(Reflect.ownKeys(obj));
    });
});

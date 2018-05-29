import { Derivable, derivation } from '../derivable';
import { isPlainObject } from '../utils';
import { isDerivable } from './types';

/**
 * Converts a map or array of Derivables or any nested structure containing maps, arrays and Derivables into a single
 * Derivable with all nested Derivables unpacked into it.
 *
 *     const obj = { key1: atom(123), key2: atom(456) };
 *     const obj$ = struct<typeof obj, number>(obj);
 *     expect(obj$.get()).to.deep.equal({ key1: 123, key2: 456 });
 *
 * It only touches Arrays, plain Objects and Derivables, the rest is simply returned inside the Derivable as-is.
 *
 * @param obj the object to deepunpack into a derivable
 */
export function struct<V>(obj: Derivable<V>): Derivable<V>;
export function struct<I extends { [key: string]: Derivable<V> }, V>(obj: I): Derivable<{ [P in keyof I]: V }>;
export function struct<I extends Array<Derivable<V>>, V>(obj: I): Derivable<V[]>;
export function struct<I extends any[]>(obj: I): Derivable<any[]>;
export function struct<I extends object | any[]>(obj: I): Derivable<{ [P in keyof I]: any }>;

export function struct(obj: any) {
    if (isDerivable(obj)) {
        return obj;
    }
    if (!Array.isArray(obj) && !isPlainObject(obj)) {
        throw new Error('"struct" only accepts Derivables, plain Objects and Arrays');
    }
    return derivation(deepUnpack, obj);
}

function deepUnpack(obj: any): any {
    if (isDerivable(obj)) {
        return obj.get();
    }
    if (Array.isArray(obj)) {
        return obj.map(deepUnpack);
    }
    if (isPlainObject(obj)) {
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = deepUnpack(obj[key]);
        }
        return result;
    }
    return obj;
}

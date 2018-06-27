import { Derivable, derive, isDerivable, utils } from '@politie/sherlock';

/**
 * Converts a map or array of Derivables or any nested structure containing maps, arrays and Derivables into a single
 * Derivable with all nested Derivables unwrapped into it.
 *
 *     const obj = { key1: atom(123), key2: atom(456) };
 *     const obj$ = struct<typeof obj, number>(obj);
 *     expect(obj$.get()).to.deep.equal({ key1: 123, key2: 456 });
 *
 * It only touches Arrays, plain Objects and Derivables, the rest is simply returned inside the Derivable as-is.
 *
 * @param obj the object to deepunwrap into a derivable
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
    if (!Array.isArray(obj) && !utils.isPlainObject(obj)) {
        throw new Error('"struct" only accepts Derivables, plain Objects and Arrays');
    }
    return derive(deepUnwrap, obj);
}

function deepUnwrap(obj: any): any {
    if (isDerivable(obj)) {
        return obj.get();
    }
    if (Array.isArray(obj)) {
        return obj.map(deepUnwrap);
    }
    if (utils.isPlainObject(obj)) {
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = deepUnwrap(obj[key]);
        }
        return result;
    }
    return obj;
}

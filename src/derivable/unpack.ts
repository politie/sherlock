import { Derivable } from './derivable';

/**
 * Unpacks a derivable or does nothing if `v` is not a derivable.
 *
 * @param v a value or derivable
 */
export function unpack<T>(v: T | Derivable<T>): T;
export function unpack<T>(v: T | Derivable<T> | undefined): T | undefined;
export function unpack<T>(v?: T | Derivable<T>): T | undefined {
    return v instanceof Derivable ? v.get() : v;
}

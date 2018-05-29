import { Derivable } from '../derivable/interfaces';
import { isDerivable } from '../extras';

/**
 * Unpacks a derivable or does nothing if `v` is not a derivable.
 *
 * @param v a value or derivable
 */
export function unpack<T>(v: T | Derivable<T>): T;
export function unpack<T>(v: T | Derivable<T> | undefined): T | undefined;
export function unpack<T>(v?: T | Derivable<T>): T | undefined {
    return isDerivable(v) ? v.get() : v;
}

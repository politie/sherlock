import { Unwrappable } from '../interfaces';
import { isDerivable } from './typeguards';

/**
 * Unwraps a derivable or does nothing if `v` is not a derivable.
 *
 * @param v a value or derivable
 */
export function unwrap<T>(v: Unwrappable<T>): T;
export function unwrap<T>(v: Unwrappable<T> | undefined): T | undefined;
export function unwrap<T>(v?: Unwrappable<T>): T | undefined {
    return isDerivable(v) ? v.get() : v;
}

export function safeUnwrap<T>(v?: Unwrappable<T>): T | undefined {
    return isDerivable(v) ? v.value : v;
}

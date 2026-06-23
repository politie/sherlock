import { Derivable, Unwrappable } from '../interfaces';
import { BaseDerivable } from './base-derivable';

/**
 * Determines whether an Unwrappable `v` is a Derivable.
 *
 * @param v a value or derivable
 * @returns whether v is a Derivable
 */
function isDerivable<T>(v: Unwrappable<T>): v is Derivable<T> {
    return v instanceof BaseDerivable;
}

/**
 * Unwraps a derivable or does nothing if `v` is not a derivable.
 *
 * @param v a value or derivable
 */
export function unwrap<T>(v: Unwrappable<T>): T {
    return isDerivable(v) ? v.get() : v;
}

export function safeUnwrap<T>(v: Unwrappable<T>): T | undefined {
    return isDerivable(v) ? v.value : v;
}

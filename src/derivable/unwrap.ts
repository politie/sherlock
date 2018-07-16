import { Unwrappable } from '../interfaces';
import { BaseDerivable } from './base-derivable';

/**
 * Unwraps a derivable or does nothing if `v` is not a derivable.
 *
 * @param v a value or derivable
 */
export function unwrap<T>(v: Unwrappable<T>): T {
    return v instanceof BaseDerivable ? v.get() : v;
}

export function safeUnwrap<T>(v: Unwrappable<T>): T | undefined {
    return v instanceof BaseDerivable ? v.value : v;
}

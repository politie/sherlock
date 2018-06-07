import { equals, unpack } from '../../utils';
import { Derivable } from '../derivable.interface';

/**
 * The `and` method, to add to a Derivable Prototype.
 *
 * Combine this derivable with another derivable or value using the `&&` operator on the values. Returns another Derivable.
 */
export function and<V, W>(this: Derivable<V>, other: Derivable<W> | W): Derivable<W | V> {
    // Need to cast because of https://github.com/Microsoft/TypeScript/issues/24443
    return this.derive(v => (v && unpack(other)) as W | V);
}

/**
 * The `or` method, to add to a Derivable Prototype.
 *
 * Combine this derivable with another derivable or value using the `||` operator on the values. Returns another Derivable.
 */
export function or<V, W>(this: Derivable<V>, other: Derivable<W> | W): Derivable<W | V> {
    // Need to cast because of https://github.com/Microsoft/TypeScript/issues/24443
    return this.derive(v => (v || unpack(other)) as W | V);
}

/**
 * The `not` method, to add to a Derivable Prototype.
 *
 * Create a derivation of this Derivable using the `!` operator on the value.
 */
export function not(this: Derivable<any>): Derivable<boolean> {
    return this.derive(v => !v);
}

/**
 * The `is` method, to add to a Derivable Prototype.
 *
 * Compares the value of this derivable to the given value or the value of the given derivable using the same `equals` rules
 * that are used for determining state changes.
 */
export function is(this: Derivable<any>, other: any): Derivable<boolean> {
    return this.derive(equals, other);
}

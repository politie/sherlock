import { equals } from '../utils';
import { Derivable } from './derivable';
import { unpack } from './unpack';

// Augments the Derivable interface with the following methods:
declare module './derivable' {
    // tslint:disable-next-line:no-shadowed-variable
    export interface Derivable<V> {
        /**
         * Combine this derivable with another derivable or value using the `&&` operator on the values. Returns another Derivable.
         */
        and<W>(other: Derivable<W> | W): Derivable<V | W>;

        /**
         * Combine this derivable with another derivable or value using the `||` operator on the values. Returns another Derivable.
         */
        or<W>(other: Derivable<W> | W): Derivable<V | W>;

        /**
         * Create a derivation of this Derivable using the `!` operator on the value.
         */
        not(): Derivable<boolean>;

        /**
         * Compares the value of this derivable to the given value or the value of the given derivable using the same `equals` rules
         * that are used for determining state changes.
         */
        is(other: Derivable<any> | any): Derivable<boolean>;
    }
}

// Implementations:

Derivable.prototype.and = function and<V, W>(this: Derivable<V>, other: Derivable<W> | W) {
    return this.derive(v => v && unpack(other));
};

Derivable.prototype.or = function or<V, W>(this: Derivable<V>, other: Derivable<W> | W) {
    return this.derive(v => v || unpack(other));
};

Derivable.prototype.not = function not(this: Derivable<any>) {
    return this.derive(v => !v);
};

Derivable.prototype.is = function is(this: Derivable<any>, other: any) {
    return this.derive(equals, other);
};

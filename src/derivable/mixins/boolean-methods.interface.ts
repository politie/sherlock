import { Derivable } from '../derivable.interface';

export interface AndMethod<V> {
    /**
     * Combine this derivable with another Derivable or value using the `&&` operator on the values. Returns another Derivable.
     */
    <W>(other: Derivable<W> | W): Derivable<V | W>;
}

export interface OrMethod<V> {
    /**
     * Combine this derivable with another Derivable or value using the `||` operator on the values. Returns another Derivable.
     */
    <W>(other: Derivable<W> | W): Derivable<V | W>;
}

export interface NotMethod {
    /**
     * Create a Derivation of this Derivable using the `!` operator on the value.
     */
    (): Derivable<boolean>;
}

export interface IsMethod {
    /**
     * Compares the value of this Derivable to the given value or the value of the given derivable using the same `equals` rules
     * that are used for determining state changes.
     */
    (other: Derivable<any> | any): Derivable<boolean>;
}

/**
 * The Derivable implements convenience methods for creating derivations based on basic JavaScript boolean functions.
 */
export interface HasBooleanMethods<V> {
    /**
     * Combine this derivable with another Derivable or value using the `&&` operator on the values. Returns another Derivable.
     */
    and: AndMethod<V>;

    /**
     * Combine this derivable with another Derivable or value using the `||` operator on the values. Returns another Derivable.
     */
    or: OrMethod<V>;

    /**
     * Create a Derivation of this Derivable using the `!` operator on the value.
     */
    not: NotMethod;

    /**
     * Compares the value of this Derivable to the given value or the value of the given derivable using the same `equals` rules
     * that are used for determining state changes.
     */
    is: IsMethod;
}

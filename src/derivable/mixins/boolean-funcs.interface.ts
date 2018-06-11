import { Derivable } from '../derivable.interface';

export type BooleanAnd<V> = <W>(other: Derivable<W> | W) => Derivable<V | W>;
export type BooleanOr<V> = <W>(other: Derivable<W> | W) => Derivable<V | W>;
export type BooleanNot = () => Derivable<boolean>;
export type BooleanIs = (other: Derivable<any> | any) => Derivable<boolean>;

/**
 * The Derivable implements convenience methods for creating derivations based on basic JavaScript boolean functions.
 */
export interface BooleanDerivable<V> {
    /**
     * Combine this derivable with another Derivable or value using the `&&` operator on the values. Returns another Derivable.
     */
    and: BooleanAnd<V>;

    /**
     * Combine this derivable with another Derivable or value using the `||` operator on the values. Returns another Derivable.
     */
    or: BooleanOr<V>;

    /**
     * Create a Derivation of this Derivable using the `!` operator on the value.
     */
    not: BooleanNot;

    /**
     * Compares the value of this Derivable to the given value or the value of the given derivable using the same `equals` rules
     * that are used for determining state changes.
     */
    is: BooleanIs;
}
